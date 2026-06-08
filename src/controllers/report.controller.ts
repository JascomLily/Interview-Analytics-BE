import { Request, Response } from "express";
import InterviewSession from "../models/interview-session.model";
import CandidateResponse from "../models/candidate-response.model";
import EvaluationResult from "../models/evaluation-result.model";

export const getInterviewReport = async (req: Request, res: Response): Promise<void> => {
    try {
        const { sessionId } = req.params;

        // 1. Lấy thông tin phiên phỏng vấn & Thông tin ứng viên
        const session = await InterviewSession.findById(sessionId).populate("candidate_profile_id");

        if (!session) {
            res.status(404).json({ message: "Không tìm thấy phiên phỏng vấn này" });
            return;
        }

        // 2. Lấy tất cả câu trả lời trong phiên này, kèm theo nội dung câu hỏi gốc
        const responses = await CandidateResponse.find({ session_id: sessionId })
            .populate({
                path: "session_question_id",
                populate: { path: "question_id" } // Rút nội dung câu hỏi từ QuestionBank
            });

        // 3. Quét qua từng câu trả lời để lôi điểm số tương ứng ra
        const reportDetails = await Promise.all(responses.map(async (resp) => {
            const evaluation = await EvaluationResult.findOne({ response_id: resp._id });

            // Móc dữ liệu an toàn để tránh lỗi undefined
            const sessionQuestion: any = resp.session_question_id;
            const questionData = sessionQuestion?.question_id || {};

            return {
                response_id: resp._id,
                question_content: questionData.content || "Nội dung câu hỏi bị thiếu",
                expected_answer: questionData.expected_answer || "",
                candidate_transcript: resp.transcribed_text,
                audio_url: resp.audio_url,
                evaluation: evaluation ? {
                    score: evaluation.score,
                    feedback: evaluation.feedback,
                    strengths: evaluation.strengths,
                    weaknesses: evaluation.weaknesses
                } : null
            };
        }));

        // 4. Tính toán điểm trung bình tổng thể của cả buổi phỏng vấn
        const evaluatedAnswers = reportDetails.filter(detail => detail.evaluation !== null);
        const totalScore = evaluatedAnswers.reduce((sum, item) => sum + (item.evaluation?.score || 0), 0);
        const averageScore = evaluatedAnswers.length > 0 ? Math.round(totalScore / evaluatedAnswers.length) : 0;

        // 5. Trả về format chuẩn để Frontend dễ dàng vẽ UI
        res.status(200).json({
            message: "Lấy báo cáo phỏng vấn thành công",
            data: {
                session_info: session,
                metrics: {
                    total_questions: responses.length,
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

// Hàm lấy dữ liệu cho Dashboard
export const getDashboardReports = async (req: Request, res: Response): Promise<void> => {
    try {
        // 1. Lấy danh sách tất cả các phiên phỏng vấn, sắp xếp mới nhất lên đầu
        const sessions = await InterviewSession.find()
            .populate("candidate_profile_id", "full_name email phone") // Chỉ lấy các trường cần thiết của ứng viên
            .sort({ createdAt: -1 });

        // 2. Tính toán nhanh điểm trung bình cho từng phiên
        const dashboardData = await Promise.all(sessions.map(async (session) => {
            // Tìm tất cả câu trả lời của phiên này
            const responses = await CandidateResponse.find({ session_id: session._id });

            let totalScore = 0;
            let evaluatedCount = 0;

            // Lấy điểm từ EvaluationResult
            for (const resp of responses) {
                const evaluation = await EvaluationResult.findOne({ response_id: resp._id });
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
                    total_questions_answered: responses.length,
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