import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt.utils";
import { JwtPayload } from "../types";

export const verifyToken = (req: Request, res: Response, next: NextFunction): void => {
    try {
        
        const authHeader = req.headers.authorization;
        const token = authHeader?.startsWith("Bearer ")
            ? authHeader.split(" ")[1]
            : req.cookies?.token;

        if (!token) {
            res.status(401).json({ message: "Truy cập bị từ chối: Không có token" });
            return;
        }

       
        const decoded = verifyAccessToken(token) as JwtPayload;

        
        req.user = decoded;

        next();
    } catch (error) {
        res.status(401).json({ message: "Token không hợp lệ hoặc đã hết hạn" });
    }
};