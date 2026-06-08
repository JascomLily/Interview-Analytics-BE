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

// 5. Import câu hỏi từ file PDF (Sử dụng model QuestionBank mới)
export const importQuestionsFromPDF = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.file) {
            res.status(400).json({ message: "Không tìm thấy file PDF được upload" });
            return;
        }

        // Yêu cầu FE phải truyền category_id khi upload file để biết các câu hỏi này thuộc danh mục nào
        const { category_id } = req.body;
        if (!category_id) {
            res.status(400).json({ message: "Vui lòng cung cấp category_id cho bộ câu hỏi này" });
            // Xóa file tạm ngay nếu lỗi
            fs.unlinkSync(req.file.path);
            return;
        }

        console.log(`[QuestionBank] Bắt đầu đọc file PDF từ: ${req.file.path}`);
        const fileBuffer = fs.readFileSync(req.file.path);

        console.log("[QuestionBank] Đang gửi PDF sang Gemini API để phân tích bộ câu hỏi...");
        const parsedQuestions = await GeminiService.parseQuestionPDF(fileBuffer);
        console.log(`[QuestionBank] Trích xuất thành công ${parsedQuestions.length} câu hỏi.`);

        const questionsToSave = [];
        for (const q of parsedQuestions) {
            let embedding: number[] = [];
            try {
                embedding = await GeminiService.generateEmbedding(q.expected_answer);
            } catch (err: any) {
                console.warn(`[QuestionBank] Không tạo được embedding cho câu hỏi: "${q.content.substring(0, 30)}...": ${err.message}`);
            }

            questionsToSave.push({
                category_id, 
                assessed_skills: [], 
                content: q.content,
                expected_answer: q.expected_answer,
                embedding,
            });
        }

        const savedQuestions = await QuestionBank.insertMany(questionsToSave);

        fs.unlink(req.file.path, (err) => {
            if (err) console.error("[QuestionBank] Lỗi khi xoá file PDF tạm:", err.message);
        });

        res.status(201).json({
            message: `Import thành công ${savedQuestions.length} câu hỏi từ PDF`,
            data: savedQuestions,
        });
    } catch (error: any) {
        console.error("[QuestionBank] Lỗi khi import PDF:", error.message);
        res.status(500).json({ message: "Lỗi khi xử lý file PDF và import câu hỏi" });
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