import { Request, Response } from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

import InterviewSession from "../models/interview-session.model";
import QuestionBank from "../models/question-bank.model";
import SessionQuestion from "../models/session-question.model";
import InterviewInvitation from "../models/interview-invitation.model";
import Recording from "../models/recording.model";

// 1. Lấy danh sách phiên phỏng vấn
export const getSessions = async (req: Request, res: Response): Promise<void> => {
    try {
        const filter: any = req.user?.role === "HR" ? { conductor_id: req.user.id } : {};
        
        // Lọc theo ngày tháng (startDate, endDate)
        const { startDate, endDate } = req.query;
        if (startDate || endDate) {
            filter.scheduled_at = {};
            if (startDate) {
                filter.scheduled_at.$gte = new Date(startDate as string);
            }
            if (endDate) {
                // Tạo date đến hết ngày hôm đó
                const end = new Date(endDate as string);
                end.setHours(23, 59, 59, 999);
                filter.scheduled_at.$lte = end;
            }
        }
        
        const sessions = await InterviewSession.find(filter)
            .populate("conductor_id", "name email")
            .populate("job_position_id", "title")
            .populate("candidate_profile_id", "full_name email")
            .sort({ createdAt: -1 });

        res.json({ data: sessions });
    } catch (error) {
        console.error("[Session] Lỗi lấy danh sách:", error);
        res.status(500).json({ message: "Lỗi khi lấy danh sách buổi phỏng vấn" });
    }
};

import KnowledgeDocument from "../models/knowledge-document.model";

// 2. Tạo phiên phỏng vấn mới 
export const createSession = async (req: Request, res: Response): Promise<void> => {
    try {
        const { job_position_id, candidate_profile_id, question_bank_ids, scheduled_at } = req.body;

        if (!job_position_id || !candidate_profile_id) {
            res.status(400).json({ message: "Thiếu thông tin job_position_id hoặc candidate_profile_id" });
            return;
        }

        // BR-05: RAG Prerequisite Gatekeeper
        const unprocessedDocsCount = await KnowledgeDocument.countDocuments({
            job_position_id,
            is_processed: false
        });

        if (unprocessedDocsCount > 0) {
            res.status(403).json({ message: "Không thể tạo buổi phỏng vấn. Các tài liệu RAG của Job này đang được xử lý." });
            return;
        }

        // Tạo room_code ngẫu nhiên
        const room_code = crypto.randomBytes(4).toString("hex").toUpperCase();

        // 2.1 Khởi tạo Session
        const newSession = await InterviewSession.create({
            conductor_id: req.user!.id,
            job_position_id,
            candidate_profile_id,
            room_code,
            scheduled_at,
        });

        // 2.2 Clone câu hỏi từ QuestionBank sang SessionQuestion
        if (question_bank_ids && Array.isArray(question_bank_ids) && question_bank_ids.length > 0) {
            const originalQuestions = await QuestionBank.find({ _id: { $in: question_bank_ids } });

            const sessionQuestionsToInsert = originalQuestions.map((q, index) => ({
                session_id: newSession._id,
                question_bank_id: q._id,
                content: q.content,
                expected_answer: q.expected_answer,
                order_index: index + 1
            }));

            await SessionQuestion.insertMany(sessionQuestionsToInsert);
        }

        // 2.3 Tạo Magic Link Token
        // Sửa lỗi: Phải gắn id và role để middleware verifyAccessToken trong Socket có thể parse ra được JwtPayload
        const magicLinkPayload = {
            id: candidate_profile_id,
            role: "CANDIDATE",
            session_id: newSession._id,
            candidate_id: candidate_profile_id,
            room_code: room_code
        };

        const magicLinkToken = jwt.sign(magicLinkPayload, env.JWT_ACCESS_SECRET, {
            expiresIn: "7d"
        });

        // 2.4 Tạo InterviewInvitation (Bảng riêng chứa thư mời theo ERD)
        const expires_at = new Date();
        expires_at.setDate(expires_at.getDate() + 7);

        await InterviewInvitation.create({
            session_id: newSession._id,
            magic_link_token: magicLinkToken,
            expires_at
        });

        // Trả về magic_url để test nhanh trên Postman
        const magicUrl = `${env.CLIENT_URL}/interview/join?token=${magicLinkToken}`;

        res.status(201).json({
            message: "Tạo buổi phỏng vấn thành công",
            data: newSession,
            magic_url: magicUrl
        });
    } catch (error: any) {
        console.error("[Session] Lỗi tạo session:", error);
        res.status(500).json({ message: "Lỗi server khi tạo buổi phỏng vấn" });
    }
};

// 3. Lấy thông tin phòng phỏng vấn bằng room_code
export const getSessionByRoomCode = async (req: Request, res: Response): Promise<void> => {
    try {
        const { room_code } = req.params;

        const session = await InterviewSession.findOne({ room_code })
            .populate("job_position_id", "title")
            .populate("candidate_profile_id", "full_name email");

        if (!session) {
            res.status(404).json({ message: "Không tìm thấy phòng phỏng vấn" });
            return;
        }

        // Query các câu hỏi đã được clone riêng cho Session này
        const sessionQuestions = await SessionQuestion.find({ session_id: session._id }).sort({ order_index: 1 });

        res.json({
            data: {
                ...session.toJSON(),
                questions: sessionQuestions
            }
        });
    } catch (error) {
        res.status(500).json({ message: "Lỗi khi truy cập phòng phỏng vấn" });
    }
};

// 3.5 Cập nhật thông tin cơ bản của Session (như scheduled_at)
export const updateSession = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { scheduled_at } = req.body;

        const updatedSession = await InterviewSession.findByIdAndUpdate(
            id,
            { scheduled_at },
            { new: true }
        );

        if (!updatedSession) {
            res.status(404).json({ message: "Không tìm thấy phiên phỏng vấn" });
            return;
        }

        res.json({ message: "Cập nhật thành công", data: updatedSession });
    } catch (error) {
        console.error("[Session] Lỗi cập nhật:", error);
        res.status(500).json({ message: "Lỗi hệ thống khi cập nhật phiên phỏng vấn" });
    }
};

import { evaluationQueue } from "../workers/evaluation.queue";

// 4. Cập nhật trạng thái buổi PV
export const updateSessionStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Lấy thông tin session hiện tại từ DB trước khi cập nhật
        const currentSession = await InterviewSession.findById(id);
        if (!currentSession) {
            res.status(404).json({ message: "Không tìm thấy phiên phỏng vấn" });
            return;
        }

        // NGĂN CHẶN: Nếu session đã bị CANCELLED, không cho phép đổi ngược lại thành các trạng thái khác (trừ khi có logic đặc biệt)
        if (currentSession.status === "cancelled" && status !== "cancelled") {
            res.status(400).json({
                message: "Không thể thay đổi trạng thái vì buổi phỏng vấn này đã bị hủy trước đó."
            });
            return;
        }

        // Tiến hành cập nhật trạng thái mới
        currentSession.status = status;
        const updatedSession = await currentSession.save();

        // Kích hoạt AI Pipeline khi kết thúc phỏng vấn
        if (status === "COMPLETED") {
            try {
                await evaluationQueue.add(
                    "evaluate-session",
                    { session_id: id, is_reevaluation: false },
                    {
                        attempts: 3,
                        backoff: { type: "exponential", delay: 5000 }
                    }
                );
                console.log(`[Queue] Đã đưa Session ${id} vào Hàng đợi chấm điểm AI.`);
            } catch (queueErr) {
                console.warn("[Queue] Không thể đưa Job vào hàng đợi. Có thể do Redis chưa bật:", queueErr);
            }
        }

        // TÙY CHỌN: Nếu trạng thái gửi lên là CANCELLED (hoặc trạng thái hủy của bạn), 
        // bạn có thể chủ động tìm job trong BullMQ để xóa/hủy, giảm tải cho worker nếu muốn.

        res.json({ data: updatedSession });
    } catch (error) {
        console.error("[Session] Lỗi khi cập nhật trạng thái:", error);
        res.status(500).json({ message: "Lỗi khi cập nhật trạng thái phỏng vấn" });
    }
};

import { EmailService } from "../services/email.service";

// 5. Gửi Email chứa Magic Link
export const sendInvitation = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        
        const session = await InterviewSession.findById(id).populate("candidate_profile_id");
        if (!session) {
            res.status(404).json({ message: "Không tìm thấy phiên phỏng vấn" });
            return;
        }

        const candidate: any = session.candidate_profile_id;
        if (!candidate || !candidate.email) {
            res.status(400).json({ message: "Ứng viên không hợp lệ hoặc thiếu email" });
            return;
        }

        // Lấy Magic Link từ bảng Invitation
        const invitation = await InterviewInvitation.findOne({ session_id: session._id });
        if (!invitation) {
            res.status(404).json({ message: "Không tìm thấy thư mời cho phiên này" });
            return;
        }

        const magicUrl = `${env.CLIENT_URL}/interview/join?token=${invitation.magic_link_token}`;
        
        // Gửi qua Email Service
        await EmailService.sendMagicLink(
            candidate.email, 
            candidate.full_name, 
            magicUrl, 
            session.scheduled_at || new Date()
        );

        res.json({ message: "Đã gửi email lời mời thành công" });
    } catch (error: any) {
        console.error("[Session] Lỗi gửi email:", error);
        if (error.message && (error.message.includes("SMTP") || error.message.includes("credential"))) {
            res.status(400).json({ message: "Gửi email thất bại: Chưa cấu hình thông tin SMTP Email trong file .env." });
            return;
        }
        res.status(500).json({ message: "Lỗi hệ thống khi gửi email" });
    }
};

// 6. Thêm câu hỏi Ad-hoc (Dynamic Follow-up)
export const createFollowUpQuestion = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { content, expected_answer } = req.body;

        if (!content || !expected_answer) {
            res.status(400).json({ message: "Thiếu nội dung câu hỏi hoặc đáp án kỳ vọng" });
            return;
        }

        const session = await InterviewSession.findById(id);
        if (!session) {
            res.status(404).json({ message: "Không tìm thấy phiên phỏng vấn" });
            return;
        }

        // Lấy thứ tự lớn nhất hiện tại
        const lastQuestion = await SessionQuestion.findOne({ session_id: session._id }).sort({ order_index: -1 });
        const nextOrderIndex = lastQuestion ? lastQuestion.order_index + 1 : 1;

        const newAdHocQuestion = await SessionQuestion.create({
            session_id: session._id,
            content,
            expected_answer,
            order_index: nextOrderIndex,
            is_ad_hoc: true
        });

        res.status(201).json({
            message: "Tạo câu hỏi Follow-up thành công",
            data: newAdHocQuestion
        });
    } catch (error) {
        console.error("[Session] Lỗi tạo câu hỏi Follow-up:", error);
        res.status(500).json({ message: "Lỗi hệ thống khi thêm câu hỏi" });
    }
};

// 3.6 Xóa phiên phỏng vấn (bao gồm cả câu hỏi và ghi âm liên quan)
export const deleteSession = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const session = await InterviewSession.findById(id);
        if (!session) {
            res.status(404).json({ message: "Không tìm thấy phiên phỏng vấn" });
            return;
        }

        // Thực hiện xóa phiên phỏng vấn
        await InterviewSession.findByIdAndDelete(id);

        // Xóa các câu hỏi của session này
        await SessionQuestion.deleteMany({ session_id: id });

        // Xóa các file ghi âm của session này
        await Recording.deleteMany({ session_id: id });

        res.json({ message: "Xóa phiên phỏng vấn thành công", data: null });
    } catch (error) {
        console.error("[Session] Lỗi xóa phiên:", error);
        res.status(500).json({ message: "Lỗi hệ thống khi xóa phiên phỏng vấn" });
    }
};