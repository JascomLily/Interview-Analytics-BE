import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectDB } from "./config/db";
import User from "./models/user.model";

// Load biến môi trường
dotenv.config();

const app = express();

// Rất quan trọng: Mở CORS để FE (Next.js port 3000) gọi API không bị lỗi
app.use(cors());
app.use(express.json());

// Gọi hàm kết nối DB
connectDB();

// API Test: Lấy danh sách Users
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find({});
    res.json({ data: users, pagination: { total: users.length, page: 1, totalPages: 1 } });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Chạy Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server Backend đang chạy tại http://localhost:${PORT}`);
});