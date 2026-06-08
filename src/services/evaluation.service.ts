import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../config/env";

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY!);

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
  // ragContext: string = "" // móc nối Module 2 vào thì truyền text từ DocumentChunk vào đây
): Promise<EvaluationResponse | null> => {
  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      // Ép Gemini trả về JSON chuẩn xác
      generationConfig: { responseMimeType: "application/json" } 
    });

    const prompt = `
      Bạn là một chuyên gia nhân sự và kỹ sư phần mềm đang phỏng vấn ứng viên.
      Nhiệm vụ của bạn là chấm điểm câu trả lời của ứng viên dựa trên câu hỏi và đáp án chuẩn.
      
      [THÔNG TIN]
      - Câu hỏi: ${questionContent}
      - Đáp án chuẩn (Expected Answer): ${expectedAnswer}
      - Câu trả lời của ứng viên (được bóc băng từ giọng nói, có thể có sai sót nhỏ về chính tả): ${candidateAnswer}

      [YÊU CẦU]
      Hãy đánh giá câu trả lời trên và trả về kết quả định dạng JSON chuẩn với các trường sau:
      1. "score": Điểm số từ 0 đến 100 dựa trên mức độ khớp với đáp án chuẩn.
      2. "feedback": Nhận xét chi tiết (tiếng Việt), giải thích lý do tại sao cho điểm đó.
      3. "strengths": Mảng (array) chứa các ý đúng mà ứng viên đã nêu được.
      4. "weaknesses": Mảng (array) chứa các ý ứng viên nói sai, hiểu nhầm, hoặc còn thiếu.
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Parse chuỗi JSON do AI trả về thành Object
    const evaluationObj: EvaluationResponse = JSON.parse(responseText);
    
    return evaluationObj;
  } catch (error) {
    console.error("[Evaluation Service] Lỗi khi gọi Gemini AI:", error);
    return null;
  }
};