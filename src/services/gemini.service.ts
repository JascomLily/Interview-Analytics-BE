import { env } from "../config/env";

export class GeminiService {
  private static getApiKey(): string {
    if (!env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured in environment variables.");
    }
    return env.GEMINI_API_KEY;
  }

  /**
   * Tạo vector embedding 768 chiều cho một đoạn văn bản sử dụng text-embedding-004.
   */
  public static async generateEmbedding(text: string): Promise<number[]> {
    try {
      const apiKey = this.getApiKey();
      const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "models/text-embedding-004",
          content: {
            parts: [{ text }],
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini embedding API error: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json() as any;
      if (!result.embedding || !result.embedding.values) {
        throw new Error("Invalid embedding response structure from Gemini API");
      }

      return result.embedding.values;
    } catch (error: any) {
      console.error("Error in generateEmbedding:", error.message);
      throw error;
    }
  }

  /**
   * Gửi file PDF cho Gemini 1.5 Flash để trích xuất/thiết kế bộ câu hỏi.
   */
  public static async parseQuestionPDF(fileBuffer: Buffer): Promise<any[]> {
    try {
      const apiKey = this.getApiKey();
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;

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

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: "application/pdf",
                    data: fileBuffer.toString("base64"),
                  },
                },
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini PDF parse API error: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json() as any;
      const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!responseText) {
        throw new Error("Empty response from Gemini PDF parser");
      }

      const parsedJSON = JSON.parse(responseText.trim());
      if (!parsedJSON.questions || !Array.isArray(parsedJSON.questions)) {
        throw new Error("Invalid response format, missing 'questions' array");
      }

      return parsedJSON.questions;
    } catch (error: any) {
      console.error("Error in parseQuestionPDF:", error.message);
      throw error;
    }
  }

  /**
   * Bóc băng âm thanh (STT) dự phòng sử dụng Gemini 1.5 Flash.
   */
  public static async transcribeAudio(fileBuffer: Buffer, mimeType: string): Promise<string> {
    try {
      const apiKey = this.getApiKey();
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;

      const prompt = "Hãy bóc băng (Speech-to-Text) đoạn ghi âm này bằng tiếng Việt. Chỉ trả về kết quả transcription dạng chữ viết thuần túy (văn bản trơn), không giải thích hay thêm bớt bất kỳ bình luận nào.";

      // Hỗ trợ map một số mime-type nếu cần thiết để đảm bảo Gemini nhận diện đúng định dạng âm thanh
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

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: normalizedMimeType,
                    data: fileBuffer.toString("base64"),
                  },
                },
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini audio transcribe API error: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json() as any;
      const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!responseText) {
        return "";
      }

      return responseText.trim();
    } catch (error: any) {
      console.error("Error in transcribeAudio fallback:", error.message);
      throw error;
    }
  }
}
