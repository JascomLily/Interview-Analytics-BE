import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";

export const validateObjectId = (req: Request, res: Response, next: NextFunction): void => {
    const id = req.params.id as string;
    if (id && !mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ message: "ID không hợp lệ (Invalid ObjectId format)" });
        return;
    }
    next();
};
