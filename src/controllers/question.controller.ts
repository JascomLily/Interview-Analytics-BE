import { Request, Response } from "express";
import Question from "../models/question.model";

// 1. Lấy danh sách câu hỏi (có lọc theo domain nếu cần)
export const getQuestions = async (req: Request, res: Response) => {
    try {
        const { domain } = req.query;
        // Nếu có truyền domain thì lọc, không thì lấy hết
        const filter = domain ? { domain } : {};

        const questions = await Question.find(filter).sort({ createdAt: -1 });

        res.json({
            data: questions,
            total: questions.length
        });
    } catch (error) {
        res.status(500).json({ message: "Lỗi khi lấy danh sách câu hỏi" });
    }
};

// 2. Tạo câu hỏi mới
export const createQuestion = async (req: Request, res: Response) => {
    try {
        const { content, expected_answer, domain, keywords } = req.body;

        const newQuestion = await Question.create({
            content,
            expected_answer,
            domain: domain || "General",
            keywords: keywords || [],
        });

        res.status(201).json({ data: newQuestion });
    } catch (error) {
        res.status(500).json({ message: "Lỗi khi tạo câu hỏi" });
    }
};

// 3. Xoá câu hỏi
export const deleteQuestion = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await Question.findByIdAndDelete(id);
        res.json({ data: null, message: "Xóa câu hỏi thành công" });
    } catch (error) {
        res.status(500).json({ message: "Lỗi khi xóa câu hỏi" });
    }
};