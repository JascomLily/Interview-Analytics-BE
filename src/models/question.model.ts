import mongoose, { Schema, Document } from "mongoose";

export interface IQuestion extends Document {
    content: string;          // Nội dung câu hỏi phỏng vấn
    expected_answer: string;  // Câu trả lời chuẩn (dùng để AI so sánh Vector)
    domain: string;           // Lĩnh vực (VD: Frontend, Backend, Soft Skills)
    keywords: string[];       // Các từ khóa bắt buộc ứng viên phải nhắc đến
}

const QuestionSchema = new Schema(
    {
        content: { type: String, required: true },
        expected_answer: { type: String, required: true },
        domain: { type: String, default: "General" },
        keywords: [{ type: String }], // Mảng các chuỗi (strings)
    },
    { timestamps: true }
);

// Tự động map _id thành id khi trả về FE
QuestionSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret: Record<string, unknown>) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  },
});

export default mongoose.model<IQuestion>("Question", QuestionSchema);