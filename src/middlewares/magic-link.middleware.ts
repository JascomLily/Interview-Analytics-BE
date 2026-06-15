import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import InterviewInvitation from "../models/interview-invitation.model";

export const verifyMagicLink = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const token = req.query.token as string || req.headers["x-magic-token"] as string;

        if (!token) {
            res.status(401).json({ message: "Không tìm thấy Magic Link Token" });
            return;
        }

        // 1. Validate JWT signature and expiration
        const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as any;

        // 2. Check if the token exists in the InterviewInvitation collection
        // This ensures the link hasn't been revoked and is a valid generated link
        const invitation = await InterviewInvitation.findOne({ magic_link_token: token });
        if (!invitation) {
            res.status(401).json({ message: "Magic Link không hợp lệ hoặc đã bị thu hồi" });
            return;
        }

        // Check explicit expiration in DB (even though JWT handles it, BR says strict check)
        if (new Date() > invitation.expires_at) {
            res.status(401).json({ message: "Magic Link đã hết hạn" });
            return;
        }

        // 3. Attach session_id and candidate_id to request
        req.candidate = {
            id: decoded.candidate_id,
            session_id: decoded.session_id,
            room_code: decoded.room_code
        };

        next();
    } catch (error) {
        res.status(401).json({ message: "Magic Link không hợp lệ hoặc đã hết hạn" });
    }
};
