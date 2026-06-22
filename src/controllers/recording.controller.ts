import { Request, Response } from "express";
import mongoose from "mongoose";
import Recording from "../models/recording.model";
import InterviewSession from "../models/interview-session.model";
import SessionQuestion from "../models/session-question.model";

export const uploadAudio = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.file) {
            res.status(400).json({ message: "Không tìm thấy file upload" });
            return;
        }

        const { session_id, question_id, user_role, started_at, ended_at } = req.body;

        if (!session_id || !question_id || !user_role) {
            res.status(400).json({ message: "Thiếu session_id, question_id hoặc user_role" });
            return;
        }

        if (!mongoose.Types.ObjectId.isValid(session_id) || !mongoose.Types.ObjectId.isValid(question_id)) {
            res.status(400).json({ message: "session_id hoặc question_id không hợp lệ" });
            return;
        }

        if (user_role !== "HR" && user_role !== "CANDIDATE") {
            res.status(400).json({ message: "user_role không hợp lệ. Phải là HR hoặc CANDIDATE" });
            return;
        }

        // Kiểm tra ObjectId hợp lệ
        const mongoose = require("mongoose");
        if (!mongoose.Types.ObjectId.isValid(session_id) || !mongoose.Types.ObjectId.isValid(question_id)) {
            res.status(400).json({ message: "Định dạng session_id hoặc question_id không hợp lệ" });
            return;
        }

        // Kiểm tra Session tồn tại
        const session = await InterviewSession.findById(session_id);
        if (!session) {
            res.status(404).json({ message: "Không tìm thấy phiên phỏng vấn" });
            return;
        }

        // Kiểm tra Câu hỏi tồn tại
        const sessionQuestion = await SessionQuestion.findById(question_id);
        if (!sessionQuestion) {
            res.status(404).json({ message: "Không tìm thấy câu hỏi (SessionQuestion)" });
            return;
        }

        // Đường dẫn file (tương đối theo server)
        const fileUrl = `${req.protocol}://${req.get("host")}/uploads/recordings/${req.file.filename}`;

        // FEA-3.4: Dual-Track Audio Capture. Lưu vào Recording Schema, status = PENDING để dành cho Queue xử lý (Phase 4)
        const newRecording = await Recording.create({
            session_id,
            question_id,
            user_role,
            audio_url: fileUrl, // Bổ sung audio_url tương thích
            file_url: fileUrl,
            file_name: req.file.filename,
            status: "PENDING",
            timestamp_metadata: {
                started_at: (started_at && started_at !== "null" && started_at !== "undefined" && !isNaN(Date.parse(started_at))) 
                    ? new Date(started_at) 
                    : new Date(),
                ended_at: (ended_at && ended_at !== "null" && ended_at !== "undefined" && !isNaN(Date.parse(ended_at))) 
                    ? new Date(ended_at) 
                    : new Date()
            }
        });

        console.log(`[UploadAudio] Đã lưu file âm thanh cho ${user_role}. Chờ AI Pipeline xử lý sau.`);

        res.status(201).json({
            message: "Upload âm thanh thành công",
            data: newRecording
        });

    } catch (error) {
        console.error("[UploadAudio] Lỗi server:", error);
        res.status(500).json({ message: "Lỗi máy chủ khi lưu file ghi âm" });
    }
};