import { Request, Response } from "express";
import InterviewSession from "../models/interview-session.model";
import Recording from "../models/recording.model";
import EvaluationResult from "../models/evaluation-result.model";
import SessionQuestion from "../models/session-question.model";
import { evaluationQueue } from "../workers/evaluation.queue";

export const getInterviewReport = async (req: Request, res: Response): Promise<void> => {
    try {
        const { sessionId } = req.params;

        // 1. Lấy thông tin phiên phỏng vấn & Thông tin ứng viên
        const session = await InterviewSession.findById(sessionId).populate("candidate_profile_id");

        if (!session) {
            res.status(404).json({ message: "Không tìm thấy phiên phỏng vấn này" });
            return;
        }

        // 2. Lấy tất cả câu hỏi của phiên
        const sessionQuestions = await SessionQuestion.find({ session_id: sessionId }).populate("question_bank_id");

        // 3. Quét qua từng câu hỏi để lấy kết quả
        const reportDetails = await Promise.all(sessionQuestions.map(async (sq) => {
            // Lấy Audio của ứng viên cho câu hỏi này
            const candidateRecording = await Recording.findOne({ 
                session_id: sessionId, 
                question_id: sq._id,
                user_role: "CANDIDATE" 
            }).sort({ createdAt: -1 });

            // Lấy kết quả chấm điểm mới nhất (version cao nhất)
            const evaluation = await EvaluationResult.findOne({ 
                session_id: sessionId, 
                question_id: sq._id 
            }).sort({ version: -1 });

            const questionData: any = sq.question_bank_id || {};

            return {
                question_id: sq._id,
                question_content: sq.content || questionData.content || "Nội dung câu hỏi bị thiếu",
                expected_answer: sq.expected_answer || questionData.expected_answer || "",
                candidate_transcript: candidateRecording ? candidateRecording.transcript : "",
                audio_url: candidateRecording ? candidateRecording.audio_url : null,
                evaluation: evaluation ? {
                    score: evaluation.score,
                    feedback: evaluation.feedback,
                    strengths: evaluation.strengths,
                    weaknesses: evaluation.weaknesses,
                    version: evaluation.version
                } : null
            };
        }));

        // 4. Tính toán điểm trung bình
        const evaluatedAnswers = reportDetails.filter(detail => detail.evaluation !== null);
        const totalScore = evaluatedAnswers.reduce((sum, item) => sum + (item.evaluation?.score || 0), 0);
        const averageScore = evaluatedAnswers.length > 0 ? Math.round(totalScore / evaluatedAnswers.length) : 0;

        res.status(200).json({
            message: "Lấy báo cáo phỏng vấn thành công",
            data: {
                session_info: session,
                metrics: {
                    total_questions: sessionQuestions.length,
                    evaluated_questions: evaluatedAnswers.length,
                    average_score: averageScore
                },
                detailed_results: reportDetails
            }
        });

    } catch (error) {
        console.error("[Report Controller] Lỗi khi lấy báo cáo phỏng vấn:", error);
        res.status(500).json({ message: "Lỗi máy chủ khi truy xuất báo cáo phỏng vấn" });
    }
};

export const getDashboardReports = async (req: Request, res: Response): Promise<void> => {
    try {
        const filter: any = {};
        const { startDate, endDate } = req.query;
        if (startDate || endDate) {
            filter.scheduled_at = {};
            if (startDate) {
                filter.scheduled_at.$gte = new Date(startDate as string);
            }
            if (endDate) {
                const end = new Date(endDate as string);
                end.setHours(23, 59, 59, 999);
                filter.scheduled_at.$lte = end;
            }
        }

        const sessions = await InterviewSession.find(filter)
            .populate("candidate_profile_id", "full_name email phone")
            .sort({ createdAt: -1 });

        const dashboardData = await Promise.all(sessions.map(async (session) => {
            const sessionQuestions = await SessionQuestion.find({ session_id: session._id });
            
            let totalScore = 0;
            let evaluatedCount = 0;

            for (const sq of sessionQuestions) {
                const evaluation = await EvaluationResult.findOne({ 
                    session_id: session._id, 
                    question_id: sq._id 
                }).sort({ version: -1 });

                if (evaluation) {
                    totalScore += evaluation.score;
                    evaluatedCount++;
                }
            }

            const averageScore = evaluatedCount > 0 ? Math.round(totalScore / evaluatedCount) : 0;

            return {
                session_id: session._id,
                room_code: session.room_code,
                status: session.status,
                scheduled_at: session.scheduled_at,
                candidate: session.candidate_profile_id,
                metrics: {
                    total_questions: sessionQuestions.length,
                    evaluated_questions: evaluatedCount,
                    average_score: averageScore
                }
            };
        }));

        res.status(200).json({
            message: "Lấy dữ liệu Dashboard thành công",
            data: dashboardData
        });

    } catch (error) {
        console.error("[Report Controller] Lỗi khi lấy Dashboard:", error);
        res.status(500).json({ message: "Lỗi máy chủ khi truy xuất dữ liệu thống kê" });
    }
};

// Yêu cầu chấm điểm lại toàn bộ (Re-evaluate Versioning & Re-transcribe)
export const reEvaluateSession = async (req: Request, res: Response): Promise<void> => {
    try {
        const { sessionId } = req.params;

        const session = await InterviewSession.findById(sessionId);
        if (!session) {
            res.status(404).json({ message: "Không tìm thấy phiên phỏng vấn" });
            return;
        }

        // Kiểm tra xem phiên phỏng vấn này có ghi âm câu trả lời nào của CANDIDATE hay không
        const candidateRecordingsCount = await Recording.countDocuments({
            session_id: sessionId,
            user_role: "CANDIDATE"
        });

        if (candidateRecordingsCount === 0) {
            res.status(400).json({
                message: "Không thể chấm điểm lại vì phiên phỏng vấn này không có bất kỳ ghi âm câu trả lời nào từ ứng viên."
            });
            return;
        }

        // 1. Reset trạng thái ghi âm của phiên phỏng vấn về PENDING và xóa transcript cũ để buộc bóc băng (STT) lại từ đầu
        await Recording.updateMany(
            { session_id: sessionId },
            { $set: { status: "PENDING", transcript: null } }
        );

        // 2. Xóa các kết quả chấm điểm cũ để ghi nhận kết quả mới sạch sẽ
        await EvaluationResult.deleteMany({ session_id: sessionId });

        // 3. Đổi trạng thái phiên phỏng vấn về ONGOING để hiển thị tiến độ trên giao diện và tránh lỗi enum Schema Mongoose
        session.status = "ONGOING";
        await session.save();

        // 4. Đẩy lại vào Hàng đợi xử lý
        await evaluationQueue.add(
            "evaluate-session",
            { session_id: sessionId, is_reevaluation: true },
            {
                attempts: 3,
                backoff: { type: "exponential", delay: 5000 }
            }
        );

        res.status(200).json({
            message: "Đã gửi yêu cầu bóc băng và chấm điểm lại cho toàn bộ phiên này. Vui lòng đợi trong giây lát."
        });
    } catch (error) {
        console.error("[Report Controller] Lỗi khi yêu cầu chấm điểm lại:", error);
        res.status(500).json({ message: "Lỗi máy chủ" });
    }
};

import { generatePdfBuffer } from "../services/pdf.service";

// Xuất báo cáo PDF cho Dashboard
export const exportReportPdf = async (req: Request, res: Response): Promise<void> => {
    try {
        const { sessionId } = req.params;

        // Tái sử dụng logic lấy Data của API getInterviewReport
        const session = await InterviewSession.findById(sessionId).populate("candidate_profile_id");
        if (!session) {
            res.status(404).json({ message: "Không tìm thấy phiên phỏng vấn này" });
            return;
        }

        const sessionQuestions = await SessionQuestion.find({ session_id: sessionId }).populate("question_bank_id");

        const reportDetails = await Promise.all(sessionQuestions.map(async (sq) => {
            const candidateRecording = await Recording.findOne({ 
                session_id: sessionId, 
                question_id: sq._id,
                user_role: "CANDIDATE" 
            }).sort({ createdAt: -1 });

            const evaluation = await EvaluationResult.findOne({ 
                session_id: sessionId, 
                question_id: sq._id 
            }).sort({ version: -1 });

            const questionData: any = sq.question_bank_id || {};

            return {
                question_id: sq._id,
                question_content: sq.content || questionData.content || "Nội dung câu hỏi bị thiếu",
                expected_answer: sq.expected_answer || questionData.expected_answer || "",
                candidate_transcript: candidateRecording ? candidateRecording.transcript : "",
                evaluation: evaluation ? {
                    score: evaluation.score,
                    feedback: evaluation.feedback,
                    strengths: evaluation.strengths,
                    weaknesses: evaluation.weaknesses
                } : null
            };
        }));

        const evaluatedAnswers = reportDetails.filter(detail => detail.evaluation !== null);
        const totalScore = evaluatedAnswers.reduce((sum, item) => sum + (item.evaluation?.score || 0), 0);
        const averageScore = evaluatedAnswers.length > 0 ? Math.round(totalScore / evaluatedAnswers.length) : 0;

        const reportData = {
            session_info: session,
            metrics: {
                total_questions: sessionQuestions.length,
                evaluated_questions: evaluatedAnswers.length,
                average_score: averageScore
            },
            detailed_results: reportDetails
        };

        // Gọi hàm Render PDF
        const pdfBuffer = await generatePdfBuffer(reportData);

        // Thiết lập Headers trả về File PDF
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=Interview_Report_${session.room_code}.pdf`);
        res.send(pdfBuffer);

    } catch (error: any) {
        console.error("[Report Controller] Lỗi khi xuất PDF:", error.message);
        res.status(500).json({ message: "Lỗi máy chủ khi tạo báo cáo PDF" });
    }
};