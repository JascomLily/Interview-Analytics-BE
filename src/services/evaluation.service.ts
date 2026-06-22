import OpenAI from "openai";
import { env } from "../config/env";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: env.OPENROUTER_API_KEY,
});

interface EvaluationResponse {
  score: number;
  feedback: string;
  strengths: string[];
  weaknesses: string[];
}

export const evaluateCandidateAnswer = async (
  questionContent: string,
  expectedAnswer: string,
  candidateAnswer: string,
  ragContext: string = "" 
): Promise<EvaluationResponse | null> => {
  try {

    const prompt = `
      Bạn là một chuyên gia nhân sự và kỹ sư phần mềm đang phỏng vấn ứng viên.
      Nhiệm vụ của bạn là chấm điểm câu trả lời của ứng viên dựa trên câu hỏi, đáp án chuẩn, và thông tin ngữ cảnh.
      
      [THÔNG TIN NGỮ CẢNH (RAG)]
      ${ragContext ? ragContext : "Không có thông tin ngữ cảnh cụ thể."}

      [THÔNG TIN PHỎNG VẤN]
      - Câu hỏi: ${questionContent}
      - Đáp án chuẩn (Expected Answer): ${expectedAnswer}
      - Câu trả lời của ứng viên (được bóc băng từ giọng nói): ${candidateAnswer}

      [YÊU CẦU]
      Hãy đánh giá câu trả lời trên và trả về kết quả định dạng JSON chuẩn với các trường sau:
      1. "score": Điểm số từ 0 đến 100 dựa trên mức độ khớp với đáp án chuẩn và ngữ cảnh.
      2. "feedback": Nhận xét chi tiết (tiếng Việt), giải thích lý do tại sao cho điểm đó.
      3. "strengths": Mảng (array) chứa các ý đúng mà ứng viên đã nêu được.
      4. "weaknesses": Mảng (array) chứa các ý ứng viên nói sai, hiểu nhầm, hoặc còn thiếu.
    `;

    const result = await openai.chat.completions.create({
      model: env.OPENROUTER_EVALUATION_MODEL, // Lấy model từ biến môi trường
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }]
    });

    const responseText = result.choices[0]?.message?.content || "{}";
    
    // Parse chuỗi JSON do AI trả về thành Object
    const evaluationObj: EvaluationResponse = JSON.parse(responseText);
    
    return evaluationObj;
  } catch (error) {
    console.error("[Evaluation Service] Lỗi khi gọi Gemini AI:", error);
    return null;
  }
};