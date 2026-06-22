import fs from "fs";
import { OpenRouterService } from "./openrouter.service";

export class SttService {
  /**
   * Thực hiện bóc băng âm thanh từ file vật lý trên đĩa.
   * Sử dụng OpenRouter (Gemini 1.5 Flash).
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

      console.log(`[STT] Đang gửi yêu cầu bóc băng ghi âm sang OpenRouter API (mimeType: ${mimeType})...`);
      const transcript = await OpenRouterService.transcribeAudio(fileBuffer, mimeType);
      
      console.log(`[STT] Bóc băng thành công. Chiều dài ký tự: ${transcript.length}`);
      return transcript;
    } catch (error: any) {
      console.error(`[STT] Lỗi trong quá trình bóc băng âm thanh: ${error.message}`);
      throw error;
    }
  }
}
