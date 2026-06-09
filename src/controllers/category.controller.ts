import { Request, Response } from "express";
import QuestionCategory from "../models/question-category.model";

export const getCategories = async (req: Request, res: Response): Promise<void> => {
    try {
        const categories = await QuestionCategory.find().sort({ name: 1 });
        res.json({ data: categories });
    } catch (error) {
        res.status(500).json({ message: "Lỗi lấy danh sách category" });
    }
};

export const createCategory = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name } = req.body;
        
        if (!name) {
            res.status(400).json({ message: "Thiếu trường name" });
            return;
        }

        const existingCategory = await QuestionCategory.findOne({ name });
        if (existingCategory) {
            res.status(400).json({ message: "Category đã tồn tại" });
            return;
        }

        const newCategory = await QuestionCategory.create({ name });
        res.status(201).json({ data: newCategory, message: "Tạo category thành công" });
    } catch (error) {
        res.status(500).json({ message: "Lỗi tạo category" });
    }
};

export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const deletedCategory = await QuestionCategory.findByIdAndDelete(id);
        
        if (!deletedCategory) {
            res.status(404).json({ message: "Không tìm thấy category" });
            return;
        }
        res.json({ data: null, message: "Đã xoá category" });
    } catch (error) {
        res.status(500).json({ message: "Lỗi xoá category" });
    }
};
