import { Request, Response, NextFunction } from "express";

export const authorizeRoles = (...allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        // Kiểm tra xem đã có thông tin user từ auth.middleware truyền sang chưa
        if (!req.user || !req.user.role) {
            res.status(403).json({ message: "Không thể xác thực quyền hạn người dùng" });
            return;
        }

        // Kiểm tra xem role của user có nằm trong danh sách được phép không
        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({
                message: `Hành động bị từ chối. Quyền hiện tại: ${req.user.role}`
            });
            return;
        }

        next();
    };
};