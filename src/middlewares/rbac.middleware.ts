import { Request, Response, NextFunction } from "express";
import Role from "../models/role.model";

export const authorizeRoles = (...allowedRoles: string[]) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            
            const user = req.user;

            if (!user || !user.role_id) {
                res.status(403).json({ message: "Forbidden: Không tìm thấy thông tin quyền truy cập." });
                return;
            }

            
            const userRole = await Role.findById(user.role_id);

            if (!userRole || !allowedRoles.includes(userRole.name)) {
                res.status(403).json({ message: "Forbidden: Bạn không có quyền thực hiện hành động này." });
                return;
            }

            
            user.roleName = userRole.name;
            next();
        } catch (error) {
            console.error("[RBAC Error]", error);
            res.status(500).json({ message: "Lỗi máy chủ khi kiểm tra phân quyền" });
        }
    };
};