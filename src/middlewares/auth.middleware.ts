import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt.utils";
import { JwtPayload } from "../types";

export const verifyToken = (req: Request, res: Response, next: NextFunction): void => {
    try {
        // Ưu tiên lấy token từ header Bearer, nếu không có thì lấy từ cookie
        const authHeader = req.headers.authorization;
        const token = authHeader?.startsWith("Bearer ")
            ? authHeader.split(" ")[1]
            : req.cookies?.token;

        if (!token) {
            res.status(401).json({ message: "Truy cập bị từ chối: Không có token" });
            return;
        }

        // Giải mã và ép kiểu về đúng JwtPayload (chứa id và role)
        const decoded = verifyAccessToken(token) as JwtPayload;

        // Gán vào req.user
        req.user = decoded;

        next();
    } catch (error) {
        res.status(401).json({ message: "Token không hợp lệ hoặc đã hết hạn" });
    }
};