import { Request, Response } from "express";
import fs from "fs";
import QuestionBank from "../models/question-bank.model"; // Đã đổi sang QuestionBank
import { GeminiService } from "../services/gemini.service";
import { cosineSimilarity } from "../utils/vector.utils";

// 1. Lấy danh sách câu hỏi (Populate thêm category và skills)
export const getQuestions = async (req: Request, res: Response): Promise<void> => {
    try {
        const category_id = req.query.category_id as string | undefined;
        const filter = category_id ? { category_id } : {};

        const questions = await QuestionBank.find(filter)
            .populate("category_id", "name")
            .populate("assessed_skills", "name")
            .sort({ createdAt: -1 });

        res.json({
            data: questions,
            total: questions.length
        });
    } catch (error) {
        console.error("[QuestionBank] Lỗi lấy danh sách:", error);
        res.status(500).json({ message: "Lỗi máy chủ khi lấy danh sách câu hỏi" });
    }
};

// 2. Tạo câu hỏi mới
export const createQuestion = async (req: Request, res: Response): Promise<void> => {
    try {
        const { category_id, assessed_skills, content, expected_answer } = req.body;

        if (!category_id || !content || !expected_answer) {
            res.status(400).json({ message: "Vui lòng cung cấp đủ category_id, content và expected_answer" });
            return;
        }

        // Tự động sinh embedding cho câu trả lời chuẩn
        let embedding: number[] = [];
        try {
            embedding = await GeminiService.generateEmbedding(expected_answer);
        } catch (err: any) {
            console.warn("[QuestionBank] Không thể tạo embedding cho câu trả lời chuẩn:", err.message);
        }

        const newQuestion = await QuestionBank.create({
            category_id,
            assessed_skills: assessed_skills || [],
            content,
            expected_answer,
            embedding,
        });

        res.status(201).json({ data: newQuestion });
    } catch (error) {
        res.status(500).json({ message: "Lỗi khi tạo câu hỏi" });
    }
};

// 3. Cập nhật câu hỏi
export const updateQuestion = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Nếu có cập nhật expected_answer thì phải gen lại vector
        if (updateData.expected_answer) {
            try {
                updateData.embedding = await GeminiService.generateEmbedding(updateData.expected_answer);
            } catch (err: any) {
                console.warn("[QuestionBank] Không thể cập nhật embedding:", err.message);
            }
        }

        const updatedQuestion = await QuestionBank.findByIdAndUpdate(id, updateData, { new: true })
            .populate("category_id", "name")
            .populate("assessed_skills", "name");

        if (!updatedQuestion) {
            res.status(404).json({ message: "Không tìm thấy câu hỏi để cập nhật" });
            return;
        }

        res.json({ message: "Cập nhật thành công", data: updatedQuestion });
    } catch (error) {
        res.status(500).json({ message: "Lỗi máy chủ khi cập nhật câu hỏi" });
    }
};

// 4. Xóa câu hỏi
export const deleteQuestion = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const deletedQuestion = await QuestionBank.findByIdAndDelete(id);

        if (!deletedQuestion) {
            res.status(404).json({ message: "Không tìm thấy câu hỏi để xóa" });
            return;
        }

        res.json({ data: null, message: "Xóa câu hỏi thành công" });
    } catch (error) {
        res.status(500).json({ message: "Lỗi khi xóa câu hỏi" });
    }
};

// 5. Import câu hỏi từ file PDF (Sử dụng model QuestionBank mới và tối ưu Error Handling)
export const importQuestionsFromPDF = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.file) {
            res.status(400).json({ message: "Không tìm thấy file PDF được upload" });
            return;
        }

        const { category_id } = req.body;
        if (!category_id) {
            res.status(400).json({ message: "Vui lòng cung cấp category_id cho bộ câu hỏi này" });
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            return;
        }

        console.log(`[QuestionBank] Bắt đầu đọc file PDF từ: ${req.file.path}`);
        const fileBuffer = fs.readFileSync(req.file.path);

        console.log("[QuestionBank] Đang gửi PDF sang Gemini API để phân tích bộ câu hỏi...");
        const parsedQuestions = await GeminiService.parseQuestionPDF(fileBuffer);

        if (!parsedQuestions || !Array.isArray(parsedQuestions)) {
            res.status(400).json({ message: "Gemini trả về dữ liệu không đúng cấu trúc mảng câu hỏi" });
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            return;
        }

        console.log(`[QuestionBank] Trích xuất thành công ${parsedQuestions.length} câu hỏi từ AI.`);

        // Tối ưu hóa: Sinh embedding song song để giảm thời gian xử lý, tránh Render bị timeout 30s
        const questionsToSave = await Promise.all(
            parsedQuestions.map(async (q) => {
                let embedding: number[] = [];
                try {
                    // Thử tạo vector embedding song song
                    embedding = await GeminiService.generateEmbedding(q.expected_answer || q.content);
                } catch (err: any) {
                    console.warn(`[QuestionBank] Bỏ qua lỗi sinh embedding: ${err.message}`);
                    embedding = []; // Gán mảng rỗng làm fallback để lưu được câu hỏi vào DB
                }

                return {
                    category_id,
                    assessed_skills: [], // Mặc định để rỗng để tránh lệch định dạng model DB
                    content: q.content,
                    expected_answer: q.expected_answer,
                    embedding: embedding,
                };
            })
        );

        // Thực hiện lưu an toàn vào DB
        const savedQuestions = await QuestionBank.insertMany(questionsToSave);

        if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(201).json({
            message: "Import câu hỏi từ PDF thành công",
            data: savedQuestions
        });
    } catch (error: any) {
        console.error("[QuestionBank] Lỗi hệ thống khi xử lý PDF:", error);
        if (req.file && fs.existsSync(req.file.path)) {
            try { fs.unlinkSync(req.file.path); } catch { }
        }
        res.status(500).json({
            message: "Lỗi hệ thống khi phân tích PDF",
            error: error.message || error
        });
    }
};

// 6. Tìm kiếm Vector 
export const vectorSearch = async (req: Request, res: Response): Promise<void> => {
    try {
        const { query, limit } = req.body;
        if (!query) {
            res.status(400).json({ message: "Thiếu trường query tìm kiếm" });
            return;
        }

        const maxResults = limit ? parseInt(limit, 10) : 5;

        console.log(`[Vector Search] Đang tạo embedding cho truy vấn: "${query}"`);
        const queryEmbedding = await GeminiService.generateEmbedding(query);

        try {
            const results = await QuestionBank.aggregate([
                {
                    $vectorSearch: {
                        index: "vector_index",
                        path: "embedding",
                        queryVector: queryEmbedding,
                        numCandidates: 100,
                        limit: maxResults,
                    },
                },
            ]);

            if (results && results.length > 0) {
                console.log("[Vector Search] Trả về kết quả từ MongoDB Atlas Vector Search");
                res.json({ data: results });
                return;
            }
        } catch (dbErr: any) {
            console.warn("[Vector Search] MongoDB Atlas Vector Search không khả dụng hoặc chưa tạo Index. Sử dụng In-Memory Fallback.");
        }

        // Fallback: Tìm kiếm tương đồng Cosine trên RAM
        const allQuestions = await QuestionBank.find({ embedding: { $exists: true, $ne: [] } });

        const scoredQuestions = allQuestions.map((q) => {
            const score = cosineSimilarity(queryEmbedding, q.embedding || []);
            const questionObj = q.toJSON();
            return {
                ...questionObj,
                score: parseFloat(score.toFixed(4)),
            };
        });

        const sortedResults = scoredQuestions
            .sort((a, b) => b.score - a.score)
            .slice(0, maxResults);

        console.log(`[Vector Search] In-Memory similarity hoàn tất. Trả về ${sortedResults.length} kết quả.`);
        res.json({ data: sortedResults });
    } catch (error: any) {
        console.error("[Vector Search] Lỗi tìm kiếm vector:", error.message);
        res.status(500).json({ message: "Lỗi trong quá trình tìm kiếm vector" });
    }
};