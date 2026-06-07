import { Request, Response } from "express";
import Recording from "../models/recording.model";
import { SttService } from "../services/stt.service";

export const uploadAudio = async (req: Request, res: Response) => {
  try {
    // req.file chứa file đã được multer lưu xuống ổ cứng
    if (!req.file) {
      return res.status(400).json({ message: "Không tìm thấy file upload" });
    }

    const { session_id, user_role } = req.body;

    // Đường dẫn để Frontend có thể truy cập nghe lại file
    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

    // Khởi tạo bản ghi với trạng thái PENDING
    const newRecording = await Recording.create({
      session_id,
      user_role,
      file_name: req.file.originalname,
      file_url: fileUrl,
      status: "PENDING",
      transcript: "",
    });

    console.log(`[UploadAudio] Đã lưu file ghi âm thành công: ${req.file.filename}. Bắt đầu bóc băng STT ngầm...`);

    // Thực hiện Speech-to-Text chạy ngầm (Asynchronous) để không block HTTP request
    (async () => {
      try {
        const file_path = req.file?.path as string;
        const mime_type = req.file?.mimetype as string;
        const file_name = req.file?.filename as string;
        
        const transcript = await SttService.transcribe(file_path, mime_type);
        
        newRecording.transcript = transcript;
        newRecording.status = "COMPLETED";
        await newRecording.save();
        
        console.log(`[UploadAudio] Bóc băng STT hoàn tất cho file: ${file_name}`);
      } catch (sttError: any) {
        console.error(`[UploadAudio] Lỗi bóc băng STT: ${sttError.message}`);
        newRecording.status = "FAILED";
        await newRecording.save();
      }
    })();

    // Trả về response ngay lập tức để không bị Timeout
    res.status(201).json({ 
      message: "Upload âm thanh thành công, đang xử lý bóc băng ngầm", 
      data: newRecording 
    });
  } catch (error) {
    console.error("[UploadAudio] Lỗi server khi upload:", error);
    res.status(500).json({ message: "Lỗi khi lưu file ghi âm" });
  }
};