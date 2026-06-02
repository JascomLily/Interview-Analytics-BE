import mongoose, { Schema, Document } from "mongoose";

export interface IRecording extends Document {
    session_id: mongoose.Types.ObjectId; // Thuộc buổi phỏng vấn nào
    user_role: string;                   // 'HR' hoặc 'CANDIDATE' (Phục vụ Dual-track)
    file_url: string;                    // Đường dẫn để nghe lại file
    file_name: string;                   // Tên file gốc
    transcript?: string;                 // Văn bản bóc băng
    status: string;                      // Trạng thái bóc băng: PENDING, COMPLETED, FAILED
    duration?: number;                   // Thời lượng file (giây)
}

const RecordingSchema = new Schema(
    {
        session_id: { type: Schema.Types.ObjectId, ref: "Session", required: true },
        user_role: { type: String, enum: ["HR", "CANDIDATE"], required: true },
        file_url: { type: String, required: true },
        file_name: { type: String, required: true },
        transcript: { type: String, default: "" },
        status: { type: String, enum: ["PENDING", "COMPLETED", "FAILED"], default: "PENDING" },
        duration: { type: Number, default: 0 },
    },
    { timestamps: true }
);

RecordingSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret: Record<string, unknown>) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  },
});

export default mongoose.model<IRecording>("Recording", RecordingSchema);