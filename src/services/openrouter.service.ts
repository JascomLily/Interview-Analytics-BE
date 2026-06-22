import OpenAI from "openai";
import { env } from "../config/env";

export class OpenRouterService {
  private static getClient(): OpenAI {
    if (!env.OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is not configured in environment variables.");
    }
    return new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: env.OPENROUTER_API_KEY,
    });
  }

  /**
   * Tạo vector embedding 768 chiều.
   * Sử dụng openai/text-embedding-3-small và ép kích thước về 768 để tương thích DB hiện tại.
   */
  public static async generateEmbedding(text: string): Promise<number[]> {
    try {
      const openai = this.getClient();
      // Note: OpenRouter currently passes embeddings requests to OpenAI models
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
        dimensions: 768, // Ép về 768 chiều cho khớp với DB
      });

      if (!response.data || !response.data[0] || !response.data[0].embedding) {
        throw new Error("Invalid embedding response structure from OpenRouter");
      }

      return response.data[0].embedding;
    } catch (error: any) {
      console.error("Error in generateEmbedding (OpenRouter):", error.message);
      throw error;
    }
  }

  /**
   * Trích xuất câu hỏi phỏng vấn từ PDF bằng Google Gemini 1.5 Flash (thông qua OpenRouter)
   */
  public static async parseQuestionPDF(fileBuffer: Buffer): Promise<any[]> {
    try {
      const openai = this.getClient();
      const base64Data = fileBuffer.toString("base64");
      const mimeType = "application/pdf";

      const prompt = `Hãy đọc tài liệu đính kèm (có thể là JD tuyển dụng, bài kiểm tra hoặc tài liệu Q&A) và trích xuất hoặc tự thiết kế các câu hỏi phỏng vấn kèm câu trả lời chuẩn (expected answer) tương ứng, phân loại lĩnh vực (domain) và các từ khoá (keywords) bắt buộc ứng viên cần nhắc đến để được điểm tối đa. 
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

      const response = await openai.chat.completions.create({
        model: env.OPENROUTER_PDF_MODEL,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Data}`,
                },
              },
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
      });

      const responseText = response.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error("Empty response from OpenRouter PDF parser");
      }

      const parsedJSON = JSON.parse(responseText.trim());
      if (!parsedJSON.questions || !Array.isArray(parsedJSON.questions)) {
        throw new Error("Invalid response format, missing 'questions' array");
      }

      return parsedJSON.questions;
    } catch (error: any) {
      console.error("Error in parseQuestionPDF (OpenRouter):", error.message);
      throw error;
    }
  }

  /**
   * Bóc băng âm thanh (STT) sử dụng Google Gemini 1.5 Flash (thông qua OpenRouter).
   */
  public static async transcribeAudio(fileBuffer: Buffer, mimeType: string): Promise<string> {
    try {
      const openai = this.getClient();
      const base64Data = fileBuffer.toString("base64");

      // Chuẩn hóa mimeType
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

      const prompt = "Hãy bóc băng (Speech-to-Text) đoạn ghi âm này bằng tiếng Việt. Chỉ trả về kết quả transcription dạng chữ viết thuần túy (văn bản trơn), không giải thích hay thêm bớt bất kỳ bình luận nào.";

      const response = await openai.chat.completions.create({
        model: env.OPENROUTER_STT_MODEL,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${normalizedMimeType};base64,${base64Data}`,
                },
              },
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
      });

      const responseText = response.choices[0]?.message?.content;
      if (!responseText) {
        return "";
      }

      return responseText.trim();
    } catch (error: any) {
      console.error("Error in transcribeAudio fallback (OpenRouter):", error.message);
      throw error;
    }
  }
}
