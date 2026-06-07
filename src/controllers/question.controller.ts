import { Request, Response } from "express";
import fs from "fs";
import Question from "../models/question.model";
import { GeminiService } from "../services/gemini.service";
import { cosineSimilarity } from "../utils/vector.utils";

// 1. Lấy danh sách câu hỏi (có lọc theo domain nếu cần)
export const getQuestions = async (req: Request, res: Response) => {
    try {
        const domain = req.query.domain as string | undefined;
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

        // Tự động sinh embedding cho câu trả lời chuẩn nếu được tạo thủ công
        let embedding: number[] = [];
        try {
            embedding = await GeminiService.generateEmbedding(expected_answer);
        } catch (err: any) {
            console.warn("[Question] Không thể tạo embedding cho câu trả lời chuẩn:", err.message);
        }

        const newQuestion = await Question.create({
            content,
            expected_answer,
            domain: domain || "General",
            keywords: keywords || [],
            embedding,
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

// 4. Import câu hỏi từ file PDF
export const importQuestionsFromPDF = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Không tìm thấy file PDF được upload" });
        }

        console.log(`[Question] Bắt đầu đọc file PDF từ: ${req.file.path}`);
        const fileBuffer = fs.readFileSync(req.file.path);

        console.log("[Question] Đang gửi PDF sang Gemini API để phân tích bộ câu hỏi...");
        const parsedQuestions = await GeminiService.parseQuestionPDF(fileBuffer);
        console.log(`[Question] Trích xuất thành công ${parsedQuestions.length} câu hỏi.`);

        // Tạo embedding tuần tự cho tất cả các câu trả lời mẫu để tránh lỗi Rate Limit của Gemini
        const questionsToSave = [];
        for (const q of parsedQuestions) {
            let embedding: number[] = [];
            try {
                // Tạo embedding tuần tự, giảm thiểu rủi ro bị block
                embedding = await GeminiService.generateEmbedding(q.expected_answer);
            } catch (err: any) {
                console.warn(`[Question] Không tạo được embedding cho câu hỏi: "${q.content.substring(0, 30)}...": ${err.message}`);
            }
            questionsToSave.push({
                content: q.content,
                expected_answer: q.expected_answer,
                domain: q.domain || "General",
                keywords: q.keywords || [],
                embedding,
            });
        }

        const savedQuestions = await Question.insertMany(questionsToSave);

        // Xoá file PDF tạm sau khi import xong để tránh rác đĩa
        fs.unlink(req.file.path, (err) => {
            if (err) console.error("[Question] Lỗi khi xoá file PDF tạm:", err.message);
        });

        res.status(201).json({
            message: `Import thành công ${savedQuestions.length} câu hỏi từ PDF`,
            data: savedQuestions,
        });
    } catch (error: any) {
        console.error("[Question] Lỗi khi import PDF:", error.message);
        res.status(500).json({ message: "Lỗi khi xử lý file PDF và import câu hỏi" });
    }
};

// 5. Tìm kiếm Vector (MongoDB Vector Search & In-Memory Fallback)
export const vectorSearch = async (req: Request, res: Response) => {
    try {
        const { query, limit } = req.body;
        if (!query) {
            return res.status(400).json({ message: "Thiếu trường query tìm kiếm" });
        }

        const maxResults = limit ? parseInt(limit, 10) : 5;

        console.log(`[Vector Search] Đang tạo embedding cho truy vấn: "${query}"`);
        const queryEmbedding = await GeminiService.generateEmbedding(query);

        // Thử tìm kiếm bằng MongoDB Atlas Vector Search
        try {
            const results = await Question.aggregate([
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
                return res.json({ data: results });
            }
        } catch (dbErr: any) {
            console.warn("[Vector Search] MongoDB Atlas Vector Search không khả dụng hoặc chưa tạo Index. Sử dụng In-Memory Fallback.");
        }

        // Fallback: Tìm kiếm tương đồng Cosine trên RAM (In-Memory Cosine Similarity)
        const allQuestions = await Question.find({ embedding: { $exists: true, $ne: [] } });
        
        const scoredQuestions = allQuestions.map((q) => {
            const score = cosineSimilarity(queryEmbedding, q.embedding || []);
            const questionObj = q.toJSON();
            return {
                ...questionObj,
                score: parseFloat(score.toFixed(4)),
            };
        });

        // Sắp xếp giảm dần theo điểm tương đồng và lấy số lượng giới hạn
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