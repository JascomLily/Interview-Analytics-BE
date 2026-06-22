import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../config/env";

export class GeminiService {
    // 1. Khởi tạo đối tượng GoogleGenAI dùng chung
    private static ai: GoogleGenerativeAI | null = null;

    private static getAIInstance(): GoogleGenerativeAI {
        if (!env.GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY is not configured in environment variables.");
        }
        if (!this.ai) {
            this.ai = new GoogleGenerativeAI(env.GEMINI_API_KEY);
        }
        return this.ai;
    }

    /**
     * Tự động thử lại khi API của Google gặp lỗi quá tải 503 hoặc 429
     */
    private static async callWithRetry(modelInstance: any, payload: any, retries = 3, delay = 2000): Promise<any> {
        while (retries > 0) {
            try {
                return await modelInstance.generateContent(payload);
            } catch (error: any) {
                retries--;
                const errorStr = error.message || "";
                // Nếu dính lỗi 503 (Service Unavailable) hoặc 429 (Too Many Requests), tiến hành đợi rồi thử lại
                if (retries > 0 && (errorStr.includes("503") || errorStr.includes("429") || errorStr.includes("demand"))) {
                    console.warn(`[Gemini] Server đang nghẽn hoặc quá tải. Đang thử lại sau ${delay}ms... (Còn ${retries} lần thử)`);
                    await new Promise(res => setTimeout(res, delay));
                    delay *= 2; // Tăng gấp đôi thời gian chờ cho lần sau
                } else {
                    throw error;
                }
            }
        }
    }

    /**
     * Tạo vector embedding 768 chiều cho một đoạn văn bản sử dụng gemini-embedding-2.
     */
    public static async generateEmbedding(text: string): Promise<number[]> {
        try {
            const ai = this.getAIInstance();
            const model = ai.getGenerativeModel({
                model: "gemini-embedding-2"
            });

            // Sử dụng outputDimensionality để giữ chiều dài vector là 768 tương thích với MongoDB Atlas index
            const result = await model.embedContent({
                content: { role: "user", parts: [{ text }] },
                outputDimensionality: 768
            } as any);

            if (!result.embedding || !result.embedding.values) {
                throw new Error("Invalid embedding response structure from Gemini SDK");
            }

            return result.embedding.values;
        } catch (error: any) {
            console.error("Error in generateEmbedding:", error.message);
            throw error;
        }
    }

    /**
     * Gửi file PDF cho Gemini Flash để trích xuất/thiết kế bộ câu hỏi.
     */
    public static async parseQuestionPDF(fileBuffer: Buffer): Promise<any[]> {
        try {
            const ai = this.getAIInstance();
            const model = ai.getGenerativeModel({ model: "gemini-3.5-flash" });

            const prompt = `Hãy đọc tài liệu PDF đính kèm (có thể là JD tuyển dụng, bài kiểm tra hoặc tài liệu Q&A) và trích xuất hoặc tự thiết kế các câu hỏi phỏng vấn kèm câu trả lời chuẩn (expected answer) tương ứng, phân loại lĩnh vực (domain) và các từ khoá (keywords) bắt buộc ứng viên cần nhắc đến để được điểm tối đa. 
Hãy trả về một JSON object chứa mảng các câu hỏi phỏng vấn theo đúng định dạng cấu trúc sau:
{
  "questions": [
    {
      "content": "Nội dung câu hỏi phỏng vấn cụ thể",
      "expected_answer": "Nội dung câu trả lời chuẩn mẫu chi tiết",
      "domain": "Lĩnh vực chuyên môn (Frontend, Backend, DevOps, Mobile, Soft Skills, v.v.)",
      "keywords": ["từ khóa 1", "từ khóa 2", "từ khóa 3"]
    }
  ]
}`;

            const pdfPart = {
                inlineData: {
                    data: fileBuffer.toString("base64"),
                    mimeType: "application/pdf"
                }
            };

            // Gọi API thông qua hàm bọc Retry an toàn
            const result = await this.callWithRetry(model, {
                contents: [{ role: "user", parts: [pdfPart, { text: prompt }] }],
                generationConfig: {
                    responseMimeType: "application/json",
                }
            });

            const responseText = result.response.text();
            if (!responseText) {
                throw new Error("Empty response from Gemini PDF parser");
            }

            const parsedJSON = JSON.parse(responseText.trim());

            if (!parsedJSON.questions || !Array.isArray(parsedJSON.questions)) {
                if (Array.isArray(parsedJSON)) return parsedJSON;
                throw new Error("Invalid response format, missing 'questions' array");
            }

            return parsedJSON.questions;
        } catch (error: any) {
            console.error("Error in parseQuestionPDF:", error.message);
            throw error;
        }
    }

    /**
     * Bóc băng âm thanh (STT) dự phòng sử dụng Gemini Flash.
     */
    public static async transcribeAudio(fileBuffer: Buffer, mimeType: string): Promise<string> {
        try {
            const ai = this.getAIInstance();
            const model = ai.getGenerativeModel({ model: "gemini-3.5-flash" });

            const prompt = "Hãy bóc băng (Speech-to-Text) đoạn ghi âm này bằng tiếng Việt. Chỉ trả về kết quả transcription dạng chữ viết thuần tùy (văn bản trơn), không giải thích hay thêm bớt bất kỳ bình luận nào.";

            let normalizedMimeType = mimeType;
            if (mimeType === "audio/webm" || mimeType.includes("webm")) {
                normalizedMimeType = "audio/webm";
            } else if (mimeType === "audio/wav" || mimeType.includes("wav")) {
                normalizedMimeType = "audio/wav";
            } else if (mimeType === "audio/mpeg" || mimeType.includes("mp3")) {
                normalizedMimeType = "audio/mp3";
            } else if (mimeType === "audio/ogg" || mimeType.includes("ogg")) {
                normalizedMimeType = "audio/ogg";
            }

            const audioPart = {
                inlineData: {
                    data: fileBuffer.toString("base64"),
                    mimeType: normalizedMimeType
                }
            };

            // Gọi API thông qua hàm bọc Retry an toàn
            const result = await this.callWithRetry(model, {
                contents: [{ role: "user", parts: [audioPart, { text: prompt }] }]
            });

            const responseText = result.response.text();
            return responseText ? responseText.trim() : "";
        } catch (error: any) {
            console.error("Error in transcribeAudio fallback:", error.message);
            throw error;
        }
    }
}