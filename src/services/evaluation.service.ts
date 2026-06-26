import { env } from "../config/env";

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
    if (!env.GEMINI_API_KEY) {
      console.error("[Evaluation Service] Lỗi: Chưa cấu hình GEMINI_API_KEY");
      return null;
    }

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

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;
    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2
      }
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[Evaluation Service] Lỗi Google API:", err);
      return null;
    }

    const responseData = await response.json();
    const responseText = responseData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    
    // Parse chuỗi JSON do AI trả về thành Object
    const evaluationObj: EvaluationResponse = JSON.parse(responseText.trim());
    
    return evaluationObj;
  } catch (error) {
    console.error("[Evaluation Service] Lỗi khi gọi Gemini AI:", error);
    return null;
  }
};