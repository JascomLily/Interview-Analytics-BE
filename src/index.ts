import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectDB } from "./config/db";
import userRoutes from "./routes/user.route"; 
import questionRoutes from "./routes/question.route";
import sessionRoutes from "./routes/session.route";
dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

connectDB();


app.use("/api/users", userRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/sessions", sessionRoutes);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
	console.log(`🚀 Server Backend đang chạy tại http://localhost:${PORT}`);
});