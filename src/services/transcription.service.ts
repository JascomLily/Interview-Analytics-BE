import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../config/env";

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY!);

export const processAudioChunk = async (audioBuffer: Buffer): Promise<string> => {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent([
        {
            inlineData: {
                data: audioBuffer.toString("base64"),
                mimeType: "audio/webm" 
            }
        },
        "Hãy chuyển đoạn âm thanh tiếng Việt này thành văn bản."
    ]);

    return result.response.text();
};