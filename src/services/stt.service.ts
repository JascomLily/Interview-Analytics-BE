import fs from "fs";
import { GeminiService } from "./gemini.service";

export class SttService {
  /**
   * Thực hiện bóc băng âm thanh từ file vật lý trên đĩa.
   * Sử dụng Gemini 1.5 Flash để bóc băng (hỗ trợ tốt tiếng Việt, miễn phí ở Free tier).
   * 
   * @param filePath Đường dẫn tuyệt đối đến file âm thanh
   * @param mimeType Mime-type của file âm thanh (vd: audio/webm, audio/wav, audio/mpeg)
   */
  public static async transcribe(filePath: string, mimeType: string): Promise<string> {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`Không tìm thấy file ghi âm tại đường dẫn: ${filePath}`);
      }

      const fileBuffer = fs.readFileSync(filePath);

      console.log(`[STT] Đang gửi yêu cầu bóc băng ghi âm sang Gemini API (mimeType: ${mimeType})...`);
      const transcript = await GeminiService.transcribeAudio(fileBuffer, mimeType);
      
      console.log(`[STT] Bóc băng thành công. Chiều dài ký tự: ${transcript.length}`);
      return transcript;
    } catch (error: any) {
      console.error(`[STT] Lỗi trong quá trình bóc băng âm thanh: ${error.message}`);
      throw error;
    }
  }
}
