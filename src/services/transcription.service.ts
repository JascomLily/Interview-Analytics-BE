import OpenAI from "openai";
import { env } from "../config/env";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: env.OPENROUTER_API_KEY,
});

export const processAudioChunk = async (audioBuffer: Buffer): Promise<string> => {
    const base64Data = audioBuffer.toString("base64");
    const mimeType = "audio/webm";

    const response = await openai.chat.completions.create({
        model: env.OPENROUTER_MULTIMODAL_MODEL,
        messages: [
            {
                role: "user",
                content: [
                    {
                        type: "image_url",
                        image_url: {
                            url: `data:${mimeType};base64,${base64Data}`
                        }
                    },
                    {
                        type: "text",
                        text: "Hãy chuyển đoạn âm thanh tiếng Việt này thành văn bản."
                    }
                ]
            }
        ]
    });

    return response.choices[0]?.message?.content || "";
};