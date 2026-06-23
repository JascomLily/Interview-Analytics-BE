import OpenAI from "openai";
import { env } from "../config/env";

export const processAudioChunk = async (audioBuffer: Buffer): Promise<string> => {
    try {
        const modelName = env.OPENROUTER_STT_MODEL || "openai/whisper-large-v3";
        const base64Data = audioBuffer.toString("base64");
        const format = "webm"; // Giao diện ghi âm qua socket gửi file định dạng webm

        console.log(`[Realtime STT] Sử dụng endpoint audio/transcriptions của Groq cho model: whisper-large-v3-turbo`);

        const openai = new OpenAI({
            baseURL: "https://api.groq.com/openai/v1",
            apiKey: env.GROQ_API_KEY || "dummy-key-to-prevent-crash",
        });

        // Sử dụng SDK openai và toFile chuẩn để gửi multipart/form-data
        const { toFile } = require("openai");
        const file = await toFile(audioBuffer, `audio.${format}`, { type: `audio/${format}` });

        const response = await openai.audio.transcriptions.create({
            file: file,
            model: "whisper-large-v3-turbo", // Khóa cứng model của Groq
        });

        return response.text || "";
    } catch (error: any) {
        console.error("[Realtime STT] Lỗi bóc băng chunk âm thanh:", error.message);
        return "";
    }
};