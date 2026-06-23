import OpenAI from "openai";
import { env } from "../config/env";

export const processAudioChunk = async (audioBuffer: Buffer): Promise<string> => {
    try {
        const modelName = env.OPENROUTER_STT_MODEL || "openai/whisper-large-v3";
        const base64Data = audioBuffer.toString("base64");
        const format = "webm"; // Giao diện ghi âm qua socket gửi file định dạng webm

        const isWhisper = modelName.toLowerCase().includes("whisper") || modelName.toLowerCase().includes("transcribe");

        if (isWhisper) {
            console.log(`[Realtime STT] Sử dụng endpoint audio/transcriptions của Groq cho model: whisper-large-v3-turbo`);

            const openai = new OpenAI({
                baseURL: "https://openrouter.ai/api/v1",
                apiKey: env.OPENROUTER_API_KEY || "dummy-key-to-prevent-crash",
            });

            // Sử dụng SDK openai và toFile chuẩn để gửi multipart/form-data
            const { toFile } = require("openai");
            const file = await toFile(audioBuffer, `audio.${format}`, { type: `audio/${format}` });

            const response = await openai.audio.transcriptions.create({
                file: file,
                model: modelName,
            });

            return response.text || "";
        } else {
            console.log(`[Realtime STT] Sử dụng chat/completions input_audio cho model: ${modelName}`);

            const openai = new OpenAI({
                baseURL: "https://openrouter.ai/api/v1",
                apiKey: env.OPENROUTER_API_KEY || "dummy-key-to-prevent-crash",
            });

            const response = await openai.chat.completions.create({
                model: modelName,
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: "Hãy chuyển đoạn âm thanh tiếng Việt này thành văn bản."
                            },
                            {
                                type: "input_audio",
                                input_audio: {
                                    data: base64Data,
                                    format: format
                                }
                            }
                        ]
                    }
                ] as any
            });

            return response.choices[0]?.message?.content || "";
        }
    } catch (error: any) {
        console.error("[Realtime STT] Lỗi bóc băng chunk âm thanh:", error.message);
        return "";
    }
};