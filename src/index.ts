import express from "express";
import cors from "cors";
import http from "http";
import path from "path";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { connectDB } from "./config/db";
import { initializeSocket } from "./config/socket";
import authRoutes from "./routes/auth.route";
import userRoutes from "./routes/user.route";
import questionRoutes from "./routes/question.route";
import sessionRoutes from "./routes/session.route";
import recordingRoutes from "./routes/recording.route";
import reportRoutes from "./routes/report.route";
import jobPositionRoutes from "./routes/job-position.route";
import skillRoutes from "./routes/skill.route";
import candidateRoutes from "./routes/candidate.route";
import categoryRoutes from "./routes/category.route";
import knowledgeRoutes from "./routes/knowledge.route";
import "./workers/evaluation.queue"; // Khởi chạy Queue và Worker AI Pipeline
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";

const app = express();
const server = http.createServer(app);

// Kích hoạt Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: "Interview Analytics API Docs"
}));

// Cấu hình trust proxy để Render/Heroku nhận diện đúng HTTPS thay vì HTTP
app.set("trust proxy", 1);

app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

connectDB();
initializeSocket(server);

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/recordings", recordingRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/job-positions", jobPositionRoutes);
app.use("/api/skills", skillRoutes);
app.use("/api/candidates", candidateRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/knowledge", knowledgeRoutes);

// Health check endpoint for deployment (Render, AWS, etc.)
app.get("/health", (req: express.Request, res: express.Response) => {
    res.status(200).json({ status: "OK", timestamp: new Date() });
});

// 404 Not Found Middleware
app.use((req: express.Request, res: express.Response) => {
    res.status(404).json({ message: "Đường dẫn không tồn tại (API Not Found)" });
});

// Global Error Handler (Ngăn chặn leak stack trace trên Production)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("[Global Error]:", err);
    res.status(500).json({ 
        message: "Lỗi máy chủ nội bộ (Internal Server Error)",
        error: process.env.NODE_ENV === "production" ? undefined : err.message
    });
});

server.listen(env.PORT, () => {
    console.log(`[🚀] Server running at http://localhost:${env.PORT}`);
    console.log(`[🌍] Environment: ${process.env.NODE_ENV || 'development'}`);
});