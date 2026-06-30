// Tắt log quảng cáo của dotenv phiên bản mới
process.env.DOTENV_QUIET = "true";

import dotenv from "dotenv";
dotenv.config();
export const env = {
  PORT: parseInt(process.env.PORT || "5000", 10),
  MONGODB_URI: process.env.MONGODB_URI || "",
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || "",
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "",
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:3000",
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || "",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  OPENROUTER_EVALUATION_MODEL: process.env.OPENROUTER_EVALUATION_MODEL || "google/gemini-2.5-flash",
  OPENROUTER_PDF_MODEL: process.env.OPENROUTER_PDF_MODEL || "google/gemini-2.5-flash",
  OPENROUTER_STT_MODEL: process.env.OPENROUTER_STT_MODEL || "google/gemini-2.5-flash",
  GROQ_API_KEY: process.env.GROQ_API_KEY || "",
  PYTHON_STT_URL: process.env.PYTHON_STT_URL || "http://localhost:8001",
  SMTP_HOST: process.env.SMTP_HOST || "smtp.gmail.com",
  SMTP_PORT: process.env.SMTP_PORT || "587",
  SMTP_USER: process.env.SMTP_USER || "",
  SMTP_PASS: process.env.SMTP_PASS || "",
  REDIS_URL: process.env.REDIS_URL || "redis://127.0.0.1:6379",
};

const requiredVars = ["MONGODB_URI", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"] as const;

for (const key of requiredVars) {
  if (!env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}
