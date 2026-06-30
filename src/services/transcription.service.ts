import OpenAI from "openai";
import { env } from "../config/env";

export const processAudioChunk = async (audioBuffer: Buffer): Promise<string> => {
    try {
        const modelName = env.OPENROUTER_STT_MODEL || "openai/whisper-large-v3";
        const base64Data = audioBuffer.toString("base64");
        const format = "webm"; // Giao diện ghi âm qua socket gửi file định dạng webm

        if (!env.GEMINI_API_KEY) {
            console.error("[Realtime STT] Lỗi: Chưa cấu hình GEMINI_API_KEY");
            return "";
        }

        console.log(`[Realtime STT] Sử dụng endpoint Native của Google Gemini 1.5 Flash 8B`);

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-8b:generateContent?key=${env.GEMINI_API_KEY}`;
        const prompt = "Hãy bóc băng (Speech-to-Text) đoạn âm thanh này bằng tiếng Việt. Chỉ trả về chính xác văn bản ứng viên đã nói, không bình luận, không giải thích. Nếu im lặng hoặc không nghe rõ, hãy trả về chuỗi rỗng.";

        const requestBody = {
            contents: [{
                parts: [
                    { text: prompt },
                    {
                        inlineData: {
                            mimeType: `audio/${format}`,
                            data: base64Data
                        }
                    }
                ]
            }],
            generationConfig: {
                temperature: 0.0
            }
        };

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const err = await response.text();
            console.error("[Realtime STT] Google API Error:", err);
            return "";
        }

        const responseData = await response.json();
        const responseText = responseData.candidates?.[0]?.content?.parts?.[0]?.text || "";

        return responseText.trim();
    } catch (error: any) {
        console.error("[Realtime STT] Lỗi bóc băng chunk âm thanh:", error.message);
        return "";
    }
};