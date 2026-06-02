import { Request, Response } from "express";
import Recording from "../models/recording.model";

export const uploadAudio = async (req: Request, res: Response) => {
  try {
    // req.file chứa file đã được multer lưu xuống ổ cứng
    if (!req.file) {
      return res.status(400).json({ message: "Không tìm thấy file upload" });
    }

    const { session_id, user_role } = req.body;

    // Đường dẫn để Frontend có thể truy cập nghe lại file
    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

    const newRecording = await Recording.create({
      session_id,
      user_role,
      file_name: req.file.originalname,
      file_url: fileUrl,
    });

    res.status(201).json({ 
      message: "Upload thành công", 
      data: newRecording 
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lưu file ghi âm" });
  }
};