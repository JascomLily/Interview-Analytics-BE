import { Queue, Worker, Job } from "bullmq";
import Redis from "ioredis";
import { env } from "../config/env";
import Recording from "../models/recording.model";
import SessionQuestion from "../models/session-question.model";
import EvaluationResult from "../models/evaluation-result.model";
import { SttService } from "../services/stt.service";
import { evaluateCandidateAnswer } from "../services/evaluation.service";
import { GeminiService } from "../services/gemini.service";
import DocumentChunk from "../models/document-chunk.model";
import InterviewSession from "../models/interview-session.model";
import mongoose from "mongoose";
import path from "path";

// 1. Cấu hình Redis connection
const connection = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    retryStrategy(times) {
        // Nếu không có Redis (như trên máy local chưa cài), thì không crash app mà chỉ log
        if (times > 3) {
            console.warn("[Redis] Không thể kết nối Redis. Hàng đợi BullMQ tạm thời vô hiệu hoá.");
            return null; // Dừng retry
        }
        return Math.min(times * 50, 2000);
    }
});

connection.on("error", (err) => {
    // Ngăn chặn việc Redis error làm crash luôn ứng dụng
    console.error("[Redis] Lỗi kết nối:", err.message);
});

// 2. Khởi tạo Queue
export const evaluationQueue = new Queue("EvaluationQueue", { connection: connection as any });

evaluationQueue.on("error", (err) => {
    if (err.message.includes('ECONNREFUSED')) return;
    console.error(`[BullMQ Queue] Lỗi: ${err.message}`);
});

// 3. Khởi tạo Worker xử lý Job
export const evaluationWorker = new Worker(
    "EvaluationQueue",
    async (job: Job) => {
        const { session_id, is_reevaluation } = job.data;
        console.log(`[Worker] Bắt đầu xử lý Job cho Session ${session_id}...`);

        try {
            // Lấy toàn bộ các bản ghi âm PENDING của phiên này
            // Nếu là re-evaluation thì lấy toàn bộ (bỏ qua điều kiện PENDING)
            const query = is_reevaluation ? { session_id } : { session_id, status: "PENDING" };
            const recordings = await Recording.find(query);

            if (recordings.length === 0) {
                console.log(`[Worker] Không có file âm thanh nào cần xử lý.`);
                return;
            }

            // Nhóm ghi âm theo từng Câu hỏi
            const recordingsByQuestion: Record<string, any[]> = {};
            for (const rec of recordings) {
                // 1. Dịch STT cho từng đoạn
                if (!rec.transcript) {
                    const localPath = path.join(process.cwd(), 'uploads', 'recordings', rec.file_name);
                    const transcript = await SttService.transcribe(localPath, "audio/webm"); // mock mime
                    rec.transcript = transcript || "[Bóc băng thất bại]";
                    rec.status = "COMPLETED";
                    await rec.save();
                }

                // Nhóm lại
                const qId = rec.question_id.toString();
                if (!recordingsByQuestion[qId]) recordingsByQuestion[qId] = [];
                recordingsByQuestion[qId].push(rec);
            }

            // Tiến hành Evaluation cho từng câu hỏi
            // Lấy session để có job_position_id cho RAG filter
            const session = await InterviewSession.findById(session_id);
            const jobPositionId = session?.job_position_id;

            for (const [qId, recs] of Object.entries(recordingsByQuestion)) {
                // Chỉ lấy câu trả lời của CANDIDATE để chấm điểm
                const candidateRecs = recs.filter(r => r.user_role === "CANDIDATE");
                if (candidateRecs.length === 0) continue;

                const candidateAnswer = candidateRecs.map(r => r.transcript).join(" ");
                
                const sessionQuestion = await SessionQuestion.findById(qId).populate("question_bank_id");
                if (!sessionQuestion) continue;

                const expectedAnswer = sessionQuestion.expected_answer;
                const questionContent = sessionQuestion.content;

                // --- BƯỚC RAG (Retrieval-Augmented Generation) ---
                // Tìm Document Chunks liên quan đến câu hỏi này
                let ragContext = "";
                try {
                    const questionEmbedding = await GeminiService.generateEmbedding(questionContent);
                    const pipeline: any[] = [
                        {
                            $vectorSearch: {
                                index: "vector_index", // Tên index trên MongoDB Atlas
                                path: "embedding",
                                queryVector: questionEmbedding,
                                numCandidates: 50,
                                limit: 3
                            }
                        }
                    ];

                    // FEA-3.5 RAG Isolation: Chỉ lấy DocumentChunks thuộc về Job Position hiện tại
                    if (jobPositionId) {
                        pipeline[0].$vectorSearch.filter = { 
                            job_position_id: new mongoose.Types.ObjectId(jobPositionId.toString()) 
                        };
                    }

                    const relevantChunks = await DocumentChunk.aggregate(pipeline);
                    ragContext = relevantChunks.map(chunk => chunk.content).join("\n\n");
                } catch (ragError: any) {
                    console.warn(`[Worker] Cảnh báo: Vector Search RAG thất bại hoặc chưa config Atlas. Bỏ qua RAG Context.`);
                }

                // Gọi Gemini để chấm điểm (có Retry 3 lần nằm sẵn trong Job của BullMQ)
                console.log(`[Worker] Đang gọi Gemini chấm điểm câu: ${questionContent}`);
                const evalResult = await evaluateCandidateAnswer(questionContent, expectedAnswer, candidateAnswer, ragContext);

                if (evalResult) {
                    await EvaluationResult.create({
                        session_id, // Gắn thêm session_id
                        question_id: qId,
                        score: evalResult.score,
                        feedback: evalResult.feedback,
                        strengths: evalResult.strengths,
                        weaknesses: evalResult.weaknesses,
                        version: is_reevaluation ? 2 : 1 // Logic versioning cơ bản
                    });
                    console.log(`[Worker] Chấm điểm thành công cho câu hỏi ${qId}: ${evalResult.score}/100`);
                }
            }

            console.log(`[Worker] Hoàn tất toàn bộ chuỗi AI Pipeline cho Session ${session_id}.`);
        } catch (error: any) {
            console.error(`[Worker] Lỗi nghiêm trọng khi xử lý AI Pipeline:`, error.message);
            throw error; // Quăng lỗi để BullMQ tự động Retry
        }
    },
    { 
        connection: connection as any,
        concurrency: 5 // Cho phép xử lý 5 jobs đồng thời
    }
);

evaluationWorker.on("completed", (job) => {
    console.log(`[BullMQ] Job ${job.id} đã hoàn thành xuất sắc.`);
});

evaluationWorker.on("failed", (job, err) => {
    console.error(`[BullMQ] Job ${job?.id} bị lỗi: ${err.message}`);
});

// Chặn BullMQ in ra hàng đống log kết nối dơ bẩn khi Redis sập
evaluationWorker.on("error", (err) => {
    // Chỉ im lặng bỏ qua nếu là lỗi kết nối mạng (ECONNREFUSED)
    if (err.message.includes('ECONNREFUSED')) return;
    console.error(`[BullMQ] Lỗi nội bộ Worker: ${err.message}`);
});
