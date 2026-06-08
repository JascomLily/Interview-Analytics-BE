import { Request, Response } from "express";
import CandidateResponse from "../models/candidate-response.model";
import InterviewSession from "../models/interview-session.model";
import { SttService } from "../services/stt.service"; // File service gọi Gemini/Whisper 
import SessionQuestion from "../models/session-question.model";
import EvaluationResult from "../models/evaluation-result.model";
import { evaluateCandidateAnswer } from "../services/evaluation.service";

export const uploadAudio = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.file) {
            res.status(400).json({ message: "Không tìm thấy file upload" });
            return;
        }

        // Bắt buộc phải có session_question_id để biết ứng viên đang trả lời câu nào
        const { session_id, session_question_id } = req.body;

        if (!session_id || !session_question_id) {
            res.status(400).json({ message: "Thiếu session_id hoặc session_question_id" });
            return;
        }

        // Tìm session để lấy candidate_id
        const session = await InterviewSession.findById(session_id);
        if (!session) {
            res.status(404).json({ message: "Không tìm thấy phiên phỏng vấn" });
            return;
        }

        // Đường dẫn để Frontend nghe lại
        // Lưu ý: Khớp với cấu hình upload.middleware.ts chia folder "recordings" lúc nãy
        const fileUrl = `${req.protocol}://${req.get("host")}/uploads/recordings/${req.file.filename}`;

        // 1. Tạo bản ghi câu trả lời với trạng thái "Đang xử lý"
        const newResponse = await CandidateResponse.create({
            session_id,
            session_question_id,
            candidate_id: session.candidate_profile_id,
            transcribed_text: "[Hệ thống đang bóc băng âm thanh...]", 
            audio_url: fileUrl,
        });

        console.log(`[UploadAudio] Đã lưu file: ${req.file.filename}. Bắt đầu bóc băng STT ngầm...`);

        // 2. Chạy ngầm để gọi AI
        (async () => {
            try {
                const file_path = req.file!.path;
                const mime_type = req.file!.mimetype;

                // --- BƯỚC A: BÓC BĂNG STT ---
                const transcript = await SttService.transcribe(file_path, mime_type);
                newResponse.transcribed_text = transcript;
                await newResponse.save();
                console.log(`[UploadAudio] STT hoàn tất cho câu hỏi ${session_question_id}`);

                // --- BƯỚC B: AI CHẤM ĐIỂM (EVALUATION) ---
                console.log(`[Evaluation] Đang phân tích và chấm điểm...`);

                // 1. Tìm thông tin câu hỏi và đáp án chuẩn
                // Giả sử SessionQuestion có populate("question_id") trỏ tới ngân hàng câu hỏi
                const sessionQuestion = await SessionQuestion.findById(session_question_id).populate("question_id");

                if (sessionQuestion && sessionQuestion.question_bank_id) {
                    const questionContent = (sessionQuestion.question_bank_id as any).content;
                    const expectedAnswer = (sessionQuestion.question_bank_id as any).expected_answer;

                    // 2. Gọi AI Service để chấm điểm
                    const evalResult = await evaluateCandidateAnswer(
                        questionContent,
                        expectedAnswer,
                        transcript
                    );

                    if (evalResult) {
                        // 3. Lưu kết quả vào bảng EvaluationResult
                        await EvaluationResult.create({
                            response_id: newResponse._id,
                            score: evalResult.score,
                            feedback: evalResult.feedback,
                            strengths: evalResult.strengths,
                            weaknesses: evalResult.weaknesses
                        });
                        console.log(`[Evaluation] Thành công! Điểm: ${evalResult.score}/100 cho câu hỏi ${session_question_id}`);
                    } else {
                        console.warn(`[Evaluation] Cảnh báo: AI trả về null, không thể chấm điểm.`);
                    }
                } else {
                    console.warn(`[Evaluation] Không tìm thấy nội dung câu hỏi chuẩn để chấm điểm.`);
                }

            } catch (backgroundError: any) {
                console.error(`[Background Task] Lỗi trong quá trình xử lý ngầm:`, backgroundError.message);
                newResponse.transcribed_text = "[Lỗi: Hệ thống gặp sự cố khi xử lý âm thanh/chấm điểm]";
                await newResponse.save();
            }
        })();

        // 3. Trả về kết quả ngay lập tức
        res.status(201).json({
            message: "Upload âm thanh thành công, đang xử lý bóc băng ngầm",
            data: newResponse
        });

    } catch (error) {
        console.error("[UploadAudio] Lỗi server:", error);
        res.status(500).json({ message: "Lỗi máy chủ khi lưu file ghi âm" });
    }
};