import mongoose, { Schema, Document } from "mongoose";

export interface IInterviewInvitation extends Document {
    session_id: mongoose.Types.ObjectId;
    magic_link_token: string;
    expires_at: Date; // Thời hạn của link (ví dụ: 7 ngày)
}

const InterviewInvitationSchema = new Schema({
    session_id: { type: Schema.Types.ObjectId, ref: "InterviewSession", required: true, unique: true },
    magic_link_token: { type: String, required: true },
    expires_at: { type: Date, required: true }
}, { timestamps: true });

InterviewInvitationSchema.set("toJSON", {
    virtuals: true,
    transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
    },
});

export default mongoose.model<IInterviewInvitation>("InterviewInvitation", InterviewInvitationSchema);