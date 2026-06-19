import { GoogleGenAI } from "@google/generative-ai";
import { env } from "../config/env";

export class GeminiService {
    // 1. Khởi tạo đối tượng GoogleGenAI dùng chung
    private static ai: GoogleGenAI | null = null;

    private static getAIInstance(): GoogleGenAI {
        if (!env.GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY is not configured in environment variables.");
        }
        if (!this.ai) {
            this.ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
        }
        return this.ai;
    }

    /**
     * Tạo vector embedding 768 chiều cho một đoạn văn bản sử dụng text-embedding-004.
     */
    public static async generateEmbedding(text: string): Promise<number[]> {
        try {
            const ai = this.getAIInstance();
            const model = ai.getGenerativeModel({
                model: "text-embedding-004" // Cấu hình model sinh embedding chuẩn 768 chiều
            });

            const result = await model.embedContent({
                content: { parts: [{ text }] },
                outputDimensionality: 768
            });

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
            // Sử dụng gemini-2.5-flash hoặc gemini-1.5-flash đều chuẩn cú pháp qua SDK
            const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });

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

            // Chuyển file buffer sang part format của SDK
            const pdfPart = {
                inlineData: {
                    data: fileBuffer.toString("base64"),
                    mimeType: "application/pdf"
                }
            };

            // Gọi API thông qua SDK cực kỳ an toàn
            const result = await model.generateContent({
                contents: [{ role: "user", parts: [pdfPart, { text: prompt }] }],
                generationConfig: {
                    responseMimeType: "application/json", // Ép AI trả ra JSON thuần túy
                }
            });

            const responseText = result.response.text();
            if (!responseText) {
                throw new Error("Empty response from Gemini PDF parser");
            }

            // Parse JSON kết quả nhận về
            const parsedJSON = JSON.parse(responseText.trim());

            if (!parsedJSON.questions || !Array.isArray(parsedJSON.questions)) {
                if (Array.isArray(parsedJSON)) return parsedJSON; // Fallback nếu AI trả thẳng mảng []
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
            const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });

            const prompt = "Hãy bóc băng (Speech-to-Text) đoạn ghi âm này bằng tiếng Việt. Chỉ trả về kết quả transcription dạng chữ viết thuần tùy (văn bản trơn), không giải thích hay thêm bớt bất kỳ bình luận nào.";

            // Đồng bộ chuẩn hóa mimeType
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

            const result = await model.generateContent({
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