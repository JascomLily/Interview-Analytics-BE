import { Router } from "express";
import { uploadAudio } from "../controllers/recording.controller";
import { upload } from "../middlewares/upload.middleware";
import { verifyToken } from "../middlewares/auth.middleware";
import { verifyMagicLink } from "../middlewares/magic-link.middleware"; 

const router = Router();


const authOrMagicLink = (req: any, res: any, next: any) => {
   
    verifyToken(req, res, (err: any) => {
        if (!err) {
            return next(); 
        }

       
        if (typeof verifyMagicLink === "function") {
            return verifyMagicLink(req, res, next);
        }

        return res.status(401).json({ message: "Xác thực không hợp lệ. Quyền truy cập bị từ chối." });
    });
};

router.post("/upload", authOrMagicLink, upload.single("audio"), uploadAudio);

export default router;