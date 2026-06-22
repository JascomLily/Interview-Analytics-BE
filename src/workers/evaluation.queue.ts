import { Queue, Worker, Job } from "bullmq";
import Redis from "ioredis";
import { env } from "../config/env";
import Recording from "../models/recording.model";
import SessionQuestion from "../models/session-question.model";
import EvaluationResult from "../models/evaluation-result.model";
import { SttService } from "../services/stt.service";
import { evaluateCandidateAnswer } from "../services/evaluation.service";
import { OpenRouterService } from "../services/openrouter.service";
import DocumentChunk from "../models/document-chunk.model";
import InterviewSession from "../models/interview-session.model";
import mongoose from "mongoose";
import path from "path";

// 1. Cấu hình Redis connection
const connection = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    tls: env.REDIS_URL.startsWith("rediss://") ? { rejectUnauthorized: false } : undefined,
    retryStrategy(times) {
        // Thử lại vô hạn mỗi 3 giây để tự động kết nối lại khi Redis sẵn sàng
        return 3000;
    }
});

connection.on("error", (err) => {
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
            // CRITICAL CHECK 1: Kiểm tra trạng thái session ngay khi bắt đầu vào worker
            let session = await InterviewSession.findById(session_id);
            if (!session || session.status === "cancelled") {
                console.log(`[Worker] Session ${session_id} đã bị hủy bỏ hoặc không tồn tại. Dừng xử lý ngay lập tức.`);
                return { status: "skipped_cancelled" };
            }

            // Lấy toàn bộ các bản ghi âm PENDING của phiên này
            const query = is_reevaluation ? { session_id } : { session_id, status: "PENDING" };
            const recordings = await Recording.find(query);

            if (recordings.length === 0) {
                console.log(`[Worker] Không có file âm thanh nào cần xử lý.`);
                return { status: "no_recordings" };
            }

            // Nhóm ghi âm theo từng Câu hỏi
            const recordingsByQuestion: Record<string, any[]> = {};
            for (const rec of recordings) {
                // Thêm kiểm tra nhanh trong vòng lặp tốn thời gian
                session = await InterviewSession.findById(session_id);
                if (session?.status === "cancelled") {
                    console.log(`[Worker] Phát hiện session ${session_id} bị hủy trong quá trình STT. Dừng lại.`);
                    return { status: "skipped_cancelled" };
                }

                // 1. Dịch STT cho từng đoạn
                if (!rec.transcript) {
                    try {
                        const localPath = path.join(process.cwd(), 'uploads', 'recordings', rec.file_name);
                        const transcript = await SttService.transcribe(localPath, "audio/webm");
                        rec.transcript = transcript || "[Bóc băng thất bại]";
                        rec.status = "COMPLETED";
                    } catch (sttErr: any) {
                        console.error(`[Worker] Lỗi bóc băng cho recording ${rec._id}:`, sttErr.message);
                        rec.transcript = "[Bóc băng thất bại]";
                        rec.status = "FAILED";
                    }
                    await rec.save();
                }

                const qId = rec.question_id.toString();
                if (!recordingsByQuestion[qId]) recordingsByQuestion[qId] = [];
                recordingsByQuestion[qId].push(rec);
            }

            const jobPositionId = session?.job_position_id;

            for (const [qId, recs] of Object.entries(recordingsByQuestion)) {
                try {
                    // CRITICAL CHECK 2: Kiểm tra lại DB trước mỗi lượt gọi AI chấm điểm (tác vụ tốn tiền/thời gian nhất)
                    session = await InterviewSession.findById(session_id);
                    if (session?.status === "cancelled") {
                        console.log(`[Worker] Phát hiện session ${session_id} bị hủy trước khi gọi AI chấm điểm. Dừng lại.`);
                        return { status: "skipped_cancelled" };
                    }

                    // Chỉ lấy câu trả lời của CANDIDATE để chấm điểm
                    const candidateRecs = recs.filter(r => r.user_role === "CANDIDATE");
                    if (candidateRecs.length === 0) continue;

                    const candidateAnswer = candidateRecs.map(r => r.transcript).join(" ");

                    const sessionQuestion = await SessionQuestion.findById(qId).populate("question_bank_id");
                    if (!sessionQuestion) continue;

                    const expectedAnswer = sessionQuestion.expected_answer;
                    const questionContent = sessionQuestion.content;

                    // --- BƯỚC RAG (Retrieval-Augmented Generation) ---
                    let ragContext = "";
                    try {
                        const questionEmbedding = await OpenRouterService.generateEmbedding(questionContent);
                        const pipeline: any[] = [
                            {
                                $vectorSearch: {
                                    index: "vector_index",
                                    path: "embedding",
                                    queryVector: questionEmbedding,
                                    numCandidates: 50,
                                    limit: 3
                                }
                            }
                        ];

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

                    console.log(`[Worker] Đang gọi Gemini chấm điểm câu: ${questionContent}`);
                    const evalResult = await evaluateCandidateAnswer(questionContent, expectedAnswer, candidateAnswer, ragContext);

                    if (evalResult) {
                        await EvaluationResult.create({
                            session_id,
                            question_id: qId,
                            score: evalResult.score,
                            feedback: evalResult.feedback,
                            strengths: evalResult.strengths,
                            weaknesses: evalResult.weaknesses,
                            version: is_reevaluation ? 2 : 1
                        });
                        console.log(`[Worker] Chấm điểm thành công cho câu hỏi ${qId}: ${evalResult.score}/100`);
                    }
                } catch (evalErr: any) {
                    console.error(`[Worker] Lỗi chấm điểm câu hỏi ${qId}:`, evalErr.message);
                }
            }

            // CRITICAL CHECK 3: Chỉ cho phép đổi trạng thái thành COMPLETED nếu trạng thái hiện tại KHÔNG PHẢI là cancelled
            // (Bạn nên kiểm tra cả nơi đang lắng nghe event "completed" của worker này xem có đang tự ý đổi status bừa bãi không nhé)
            const finalSession = await InterviewSession.findById(session_id);
            if (finalSession && finalSession.status !== "cancelled") {
                finalSession.status = "COMPLETED";
                await finalSession.save();
                console.log(`[Worker] Đã cập nhật trạng thái session ${session_id} sang 'COMPLETED'.`);
            } else {
                console.log(`[Worker] Session ${session_id} đã bị cancel trước đó. Giữ nguyên trạng thái cancelled.`);
            }

            console.log(`[Worker] Hoàn tất toàn bộ chuỗi AI Pipeline cho Session ${session_id}.`);
            return { status: "success" };
        } catch (error: any) {
            console.error(`[Worker] Lỗi nghiêm trọng khi xử lý AI Pipeline:`, error.message);
            throw error;
        }
    },
    {
        connection: connection as any,
        concurrency: 5
    }
);

evaluationWorker.on("completed", (job) => {
    console.log(`[BullMQ] Job ${job.id} đã hoàn thành xuất sắc.`);
});

evaluationWorker.on("failed", (job, err) => {
    console.error(`[BullMQ] Job ${job?.id} bị lỗi: ${err.message}`);
});

evaluationWorker.on("error", (err) => {
    if (err.message.includes('ECONNREFUSED')) return;
    console.error(`[BullMQ] Lỗi nội bộ Worker: ${err.message}`);
});