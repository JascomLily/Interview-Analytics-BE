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

const app = express();
const server = http.createServer(app);

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

server.listen(env.PORT, () => {
    console.log(`Server running at http://localhost:${env.PORT}`);
});