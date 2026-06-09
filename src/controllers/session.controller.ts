import { Request, Response } from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

import InterviewSession from "../models/interview-session.model";
import QuestionBank from "../models/question-bank.model";
import SessionQuestion from "../models/session-question.model";
import InterviewInvitation from "../models/interview-invitation.model";

// 1. Lấy danh sách phiên phỏng vấn
export const getSessions = async (req: Request, res: Response): Promise<void> => {
    try {
        const filter = req.user?.role === "HR" ? { conductor_id: req.user.id } : {};
        
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
        const magicLinkPayload = {
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

// 4. Cập nhật trạng thái buổi PV
export const updateSessionStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const updatedSession = await InterviewSession.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );

        if (!updatedSession) {
            res.status(404).json({ message: "Không tìm thấy phiên phỏng vấn" });
            return;
        }

        res.json({ data: updatedSession });
    } catch (error) {
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
        res.status(500).json({ message: "Lỗi hệ thống khi gửi email" });
    }
};