import { Request, Response } from "express";
import mongoose from "mongoose";
import CandidateProfile from "../models/candidate-profile.model";
import InterviewSession from "../models/interview-session.model";

export const getCandidates = async (req: Request, res: Response): Promise<void> => {
    try {
        // HR chỉ xem được ứng viên của mình, ADMIN xem được hết
        const filter = req.user?.role === "HR" ? { owner_id: req.user.id } : {};
        
        const candidates = await CandidateProfile.find(filter)
            .populate("owner_id", "name email")
            .sort({ createdAt: -1 });

        res.json({ data: candidates });
    } catch (error) {
        res.status(500).json({ message: "Lỗi lấy danh sách ứng viên" });
    }
};

export const getCandidateById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const candidate = await CandidateProfile.findById(id).populate("owner_id", "name email");
        
        if (!candidate) {
            res.status(404).json({ message: "Không tìm thấy ứng viên" });
            return;
        }

        // HR chỉ xem được ứng viên của mình
        if (req.user?.role === "HR" && candidate.owner_id._id.toString() !== req.user.id) {
            res.status(403).json({ message: "Từ chối truy cập" });
            return;
        }

        res.json({ data: candidate });
    } catch (error) {
        res.status(500).json({ message: "Lỗi lấy thông tin ứng viên" });
    }
};

export const createCandidate = async (req: Request, res: Response): Promise<void> => {
    try {
        const { full_name, email, resume_url } = req.body;

        if (!full_name || !email) {
            res.status(400).json({ message: "Thiếu thông tin full_name hoặc email" });
            return;
        }

        const newCandidate = await CandidateProfile.create({
            owner_id: req.user!.id,
            full_name,
            email,
            resume_url
        });

        res.status(201).json({ data: newCandidate, message: "Tạo ứng viên thành công" });
    } catch (error) {
        res.status(500).json({ message: "Lỗi tạo ứng viên" });
    }
};

export const updateCandidate = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const updates = { ...req.body };
        delete updates.owner_id; // Prevent hijacking ownership

        const candidate = await CandidateProfile.findById(id);
        if (!candidate) {
            res.status(404).json({ message: "Không tìm thấy ứng viên" });
            return;
        }

        if (req.user?.role === "HR" && candidate.owner_id.toString() !== req.user.id) {
            res.status(403).json({ message: "Từ chối truy cập" });
            return;
        }

        // BR-01: Candidate Profile Integrity (Không cho cập nhật nếu đã gán vào Session)
        const sessionExists = await InterviewSession.exists({ candidate_profile_id: id });
        if (sessionExists) {
            res.status(403).json({ message: "Không thể cập nhật hồ sơ vì ứng viên đã được gán vào một buổi phỏng vấn" });
            return;
        }

        const updatedCandidate = await CandidateProfile.findByIdAndUpdate(id, updates, { new: true });
        res.json({ data: updatedCandidate, message: "Cập nhật ứng viên thành công" });
    } catch (error) {
        res.status(500).json({ message: "Lỗi cập nhật ứng viên" });
    }
};

export const deleteCandidate = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const candidate = await CandidateProfile.findById(id);
        if (!candidate) {
            res.status(404).json({ message: "Không tìm thấy ứng viên" });
            return;
        }

        if (req.user?.role === "HR" && candidate.owner_id.toString() !== req.user.id) {
            res.status(403).json({ message: "Từ chối truy cập" });
            return;
        }

        // BR-01: Candidate Profile Integrity (Không cho xoá nếu đã gán vào Session)
        const sessionExists = await InterviewSession.exists({ candidate_profile_id: id });
        if (sessionExists) {
            res.status(403).json({ message: "Không thể xoá ứng viên vì đã được gán vào một buổi phỏng vấn" });
            return;
        }

        await CandidateProfile.findByIdAndDelete(id);
        res.json({ data: null, message: "Đã xoá ứng viên" });
    } catch (error) {
        res.status(500).json({ message: "Lỗi xoá ứng viên" });
    }
};
