import { Router } from "express";
import { uploadAudio } from "../controllers/recording.controller";
import { upload } from "../middlewares/upload.middleware";
import { verifyToken } from "../middlewares/auth.middleware";
import { verifyMagicLink } from "../middlewares/magic-link.middleware"; 
import jwt from "jsonwebtoken";

const router = Router();


const authOrMagicLink = (req: any, res: any, next: any) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.startsWith("Bearer ")
            ? authHeader.split(" ")[1]
            : req.cookies?.token || req.query.token || req.headers["x-magic-token"];

        if (token) {
            // Giải mã không xác minh chữ ký để check xem có phải là magic link của CANDIDATE không
            const decoded = jwt.decode(token) as any;
            
            if (decoded && (decoded.candidate_id || decoded.session_id || decoded.role === "CANDIDATE")) {
                if (typeof verifyMagicLink === "function") {
                    return verifyMagicLink(req, res, next);
                }
            }
        }
    } catch (e) {
        // Bỏ qua lỗi decode, rơi xuống verifyToken xử lý chính thức
    }

    return verifyToken(req, res, next);
};

router.post("/upload", authOrMagicLink, upload.single("audio"), uploadAudio);

export default router;