import { Request, Response } from "express";
import JobPosition from "../models/job-position.model";

export const getJobPositions = async (req: Request, res: Response): Promise<void> => {
    try {
        const jobs = await JobPosition.find({ is_active: true })
            .populate("required_skills", "name")
            .sort({ createdAt: -1 });
        res.json({ data: jobs });
    } catch (error) {
        res.status(500).json({ message: "Lỗi lấy danh sách job position" });
    }
};

export const getJobPositionById = async (req: Request, res: Response): Promise<void> => {
    try {
        const job = await JobPosition.findById(req.params.id).populate("required_skills", "name");
        if (!job) {
            res.status(404).json({ message: "Không tìm thấy job position" });
            return;
        }
        res.json({ data: job });
    } catch (error) {
        res.status(500).json({ message: "Lỗi lấy job position" });
    }
};

export const createJobPosition = async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, department, required_skills } = req.body;
        
        if (!title) {
            res.status(400).json({ message: "Thiếu trường title" });
            return;
        }

        const newJob = await JobPosition.create({
            title,
            department: department || "Engineering",
            required_skills: required_skills || []
        });

        res.status(201).json({ data: newJob, message: "Tạo job position thành công" });
    } catch (error) {
        res.status(500).json({ message: "Lỗi tạo job position" });
    }
};

export const updateJobPosition = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const updatedJob = await JobPosition.findByIdAndUpdate(id, updates, { new: true }).populate("required_skills", "name");
        if (!updatedJob) {
            res.status(404).json({ message: "Không tìm thấy job position" });
            return;
        }

        res.json({ data: updatedJob, message: "Cập nhật thành công" });
    } catch (error) {
        res.status(500).json({ message: "Lỗi cập nhật job position" });
    }
};

export const deleteJobPosition = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        // Soft delete
        const deletedJob = await JobPosition.findByIdAndUpdate(id, { is_active: false }, { new: true });
        if (!deletedJob) {
            res.status(404).json({ message: "Không tìm thấy job position" });
            return;
        }

        res.json({ data: null, message: "Đã xoá (soft-delete) job position" });
    } catch (error) {
        res.status(500).json({ message: "Lỗi xoá job position" });
    }
};
