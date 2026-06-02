import { Request, Response } from "express";
import Session from "../models/session.model";
import crypto from "crypto";

// 1. Lấy danh sách các phiên phỏng vấn
export const getSessions = async (req: Request, res: Response) => {
    try {
        // Populate để lấy luôn thông tin tên của HR thay vì chỉ lấy cái ID
        const sessions = await Session.find()
            .populate("hr_id", "name email")
            .sort({ createdAt: -1 });

        res.json({ data: sessions });
    } catch (error) {
        res.status(500).json({ message: "Lỗi khi lấy danh sách phỏng vấn" });
    }
};

// 2. Tạo phiên phỏng vấn mới
export const createSession = async (req: Request, res: Response) => {
    try {
        const { title, hr_id, candidate_name, candidate_email, questions } = req.body;

        // Sinh mã phòng ngẫu nhiên (VD: 8 ký tự hex)
        const room_code = crypto.randomBytes(4).toString("hex").toUpperCase();

        const newSession = await Session.create({
            title,
            hr_id,
            candidate_name,
            candidate_email,
            questions: questions || [],
            room_code,
        });

        res.status(201).json({ data: newSession });
    } catch (error) {
        res.status(500).json({ message: "Lỗi khi tạo phiên phỏng vấn", error });
    }
};

// 3. Ứng viên nhập mã phòng để lấy thông tin vào phỏng vấn
export const getSessionByRoomCode = async (req: Request, res: Response) => {
    try {
        const { room_code } = req.params;

        // Khi vào phòng, FE cần biết luôn nội dung câu hỏi để hiển thị
        const session = await Session.findOne({ room_code }).populate("questions");

        if (!session) {
            return res.status(404).json({ message: "Không tìm thấy phòng phỏng vấn" });
        }

        res.json({ data: session });
    } catch (error) {
        res.status(500).json({ message: "Lỗi khi vào phòng" });
    }
};

// 4. Cập nhật trạng thái (Bắt đầu / Kết thúc phỏng vấn)
export const updateSessionStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const updatedSession = await Session.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );

        res.json({ data: updatedSession });
    } catch (error) {
        res.status(500).json({ message: "Lỗi cập nhật trạng thái" });
    }
};