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
import swaggerDocument from "./config/swagger_output.json";

const app = express();
const server = http.createServer(app);

// Cấu hình trust proxy để Render/Heroku nhận diện đúng HTTPS thay vì HTTP
app.set("trust proxy", 1);

app.use(cors({ 
    origin: true, 
    credentials: true,
    exposedHeaders: ["Content-Range", "Accept-Ranges", "Content-Length", "Content-Type"]
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Kích hoạt Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    customSiteTitle: "Interview Analytics API Docs"
}));

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

connectDB();
initializeSocket(server);

// Mounting các router vào tiền tố /api/v1
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/job-positions", jobPositionRoutes);
app.use("/api/v1/candidates", candidateRoutes);
app.use("/api/v1/skills", skillRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/sessions", sessionRoutes);
app.use("/api/v1/questions", questionRoutes);
app.use("/api/v1/knowledge", knowledgeRoutes);
app.use("/api/v1/recordings", recordingRoutes);
app.use("/api/v1/reports", reportRoutes);

// Route mặc định khi truy cập vào link gốc
app.get("/", (req: express.Request, res: express.Response) => {
    res.status(200).send(`
        <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
            <h1 style="color: #4CAF50;">✅ Interview Analytics API is running!</h1>
            <p>Phiên bản: 1.0.0 | Môi trường: ${process.env.NODE_ENV || 'development'}</p>
            <a href="/api-docs" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background-color: #008CBA; color: white; text-decoration: none; border-radius: 5px;">
                📚 Xem Tài liệu API (Swagger)
            </a>
        </div>
    `);
});

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

server.timeout = 2700000; // 45 minutes request timeout
server.listen(env.PORT, () => {
    console.log(`[🚀] Server is running on port ${env.PORT}`);
    console.log(`[🌍] Environment: ${process.env.NODE_ENV || 'development'}`);
});