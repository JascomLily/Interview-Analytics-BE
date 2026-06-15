import { Request, Response } from "express";
import Skill from "../models/skill.model";

export const getSkills = async (req: Request, res: Response): Promise<void> => {
    try {
        const skills = await Skill.find().sort({ name: 1 });
        res.json({ data: skills });
    } catch (error) {
        res.status(500).json({ message: "Lỗi lấy danh sách skill" });
    }
};

export const createSkill = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name } = req.body;
        
        if (!name) {
            res.status(400).json({ message: "Thiếu trường name" });
            return;
        }

        const existingSkill = await Skill.findOne({ name });
        if (existingSkill) {
            res.status(400).json({ message: "Skill đã tồn tại" });
            return;
        }

        const newSkill = await Skill.create({ name });
        res.status(201).json({ data: newSkill, message: "Tạo skill thành công" });
    } catch (error) {
        res.status(500).json({ message: "Lỗi tạo skill" });
    }
};

export const deleteSkill = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const deletedSkill = await Skill.findByIdAndDelete(id);
        if (!deletedSkill) {
            res.status(404).json({ message: "Không tìm thấy skill" });
            return;
        }
        res.json({ data: null, message: "Xoá skill thành công" });
    } catch (error) {
        res.status(500).json({ message: "Lỗi xoá skill" });
    }
};
