import { Request, Response } from "express";
import User from "../models/user.model";

// 1. Lấy danh sách có phân trang (GET /api/users)
export const getUsers = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const users = await User.find().skip(skip).limit(limit);
    const total = await User.countDocuments();

    res.json({
      data: users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy danh sách user" });
  }
};

// 2. Tạo User mới (POST /api/users)
export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;
    
    // Kiểm tra trùng email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email đã tồn tại" });
    }

    const newUser = await User.create({
      name,
      email,
      password_hash: password, // Làm đồ án nên mình lưu thẳng, sau này đi làm sẽ cần băm pass bằng bcrypt
      role: role || "USER",
    });

    res.status(201).json({ data: newUser });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi tạo user" });
  }
};

// 3. Xoá User (DELETE /api/users/:id)
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await User.findByIdAndDelete(id);
    res.json({ data: null, message: "Xóa thành công" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi xóa user" });
  }
};