import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path"; 
import { connectDB } from "./config/db";
import userRoutes from "./routes/user.route";
import questionRoutes from "./routes/question.route";
import sessionRoutes from "./routes/session.route";
import recordingRoutes from "./routes/recording.route"; 

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());


app.use("/uploads", express.static(path.join(process.cwd(), "uploads"))); 

connectDB();


app.use("/api/users", userRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/recordings", recordingRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server Backend đang chạy tại http://localhost:${PORT}`);
});