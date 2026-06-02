import { Router } from "express";
import { uploadAudio } from "../controllers/recording.controller";
import { upload } from "../middlewares/upload.middleware";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

// Endpoint upload file, hứng biến có tên là 'audio' từ form-data
router.post("/upload", upload.single("audio"), uploadAudio);

export default router;