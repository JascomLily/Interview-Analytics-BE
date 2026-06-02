import mongoose, { Schema, Document } from "mongoose";

export interface ISession extends Document {
    title: string;             // Tên buổi phỏng vấn (VD: Phỏng vấn Frontend Dev)
    hr_id: mongoose.Types.ObjectId; // Người tạo (HR)
    candidate_name: string;    // Tên ứng viên
    candidate_email: string;   // Email ứng viên
    questions: mongoose.Types.ObjectId[]; // Danh sách các câu hỏi sẽ hỏi
    status: string;            // Trạng thái buổi phỏng vấn
    room_code: string;         // Mã phòng (để ứng viên nhập vào tham gia)
}

const SessionSchema = new Schema(
    {
        title: { type: String, required: true },
        hr_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
        candidate_name: { type: String, required: true },
        candidate_email: { type: String, required: true },
        questions: [{ type: Schema.Types.ObjectId, ref: "Question" }],
        status: {
            type: String,
            enum: ["SCHEDULED", "ONGOING", "COMPLETED", "CANCELLED"],
            default: "SCHEDULED",
        },
        room_code: { type: String, required: true, unique: true },
    },
    { timestamps: true }
);

SessionSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret: Record<string, unknown>) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  },
});

export default mongoose.model<ISession>("Session", SessionSchema);