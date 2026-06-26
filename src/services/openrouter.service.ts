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
      if (!env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not configured in environment variables. Please add it to your .env file.");
      }

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

      // Gọi trực tiếp API Native của Google (Bypass OpenRouter)
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;
      
      const requestBody = {
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data
                }
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      };

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Google Gemini API Error: ${response.status} - ${errorData}`);
      }

      const responseData = await response.json();
      const responseText = responseData.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!responseText) {
        throw new Error("Empty response from Google Gemini PDF parser");
      }

      const parsedJSON = JSON.parse(responseText.trim());
      if (!parsedJSON.questions || !Array.isArray(parsedJSON.questions)) {
        throw new Error("Invalid response format, missing 'questions' array");
      }

      return parsedJSON.questions;
    } catch (error: any) {
      console.error("Error in parseQuestionPDF (Native Gemini):", error.message);
      throw error;
    }
  }

  public static async transcribeAudio(fileBuffer: Buffer, mimeType: string): Promise<string> {
    try {
      const modelName = env.OPENROUTER_STT_MODEL || "openai/whisper-large-v3";
      const base64Data = fileBuffer.toString("base64");

      // Chuẩn hóa format
      let format = "webm";
      if (mimeType === "audio/webm" || mimeType.includes("webm")) {
        format = "webm";
      } else if (mimeType === "audio/wav" || mimeType.includes("wav")) {
        format = "wav";
      } else if (mimeType === "audio/mpeg" || mimeType.includes("mp3")) {
        format = "mp3";
      } else if (mimeType === "audio/ogg" || mimeType.includes("ogg")) {
        format = "ogg";
      }

      if (!env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not configured.");
      }

      console.log(`[Native STT] Sử dụng endpoint Native của Google Gemini 1.5 Flash cho bóc băng`);

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;
      const prompt = "Hãy bóc băng (Speech-to-Text) đoạn âm thanh này bằng tiếng Việt. Chỉ trả về chính xác văn bản ứng viên đã nói, không bình luận, không giải thích. Nếu im lặng hoặc không nghe rõ, hãy trả về chuỗi rỗng.";
      
      const requestBody = {
          contents: [{
              parts: [
                  { text: prompt },
                  {
                      inlineData: {
                          mimeType: `audio/${format}`,
                          data: base64Data
                      }
                  }
              ]
          }],
          generationConfig: {
              temperature: 0.0
          }
      };

      const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
          const err = await response.text();
          throw new Error(`Google API Error: ${err}`);
      }

      const responseData = await response.json();
      const responseText = responseData.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      return responseText.trim();
    } catch (error: any) {
      console.error("Error in transcribeAudio (OpenRouter):", error.message);
      throw error;
    }
  }
}
