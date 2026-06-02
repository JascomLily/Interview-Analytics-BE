import { Router } from "express";
import { uploadAudio } from "../controllers/recording.controller";
import { upload } from "../middlewares/upload.middleware";

const router = Router();

// Endpoint upload file, hứng biến có tên là 'audio' từ form-data
router.post("/upload", upload.single("audio"), uploadAudio);

export default router;