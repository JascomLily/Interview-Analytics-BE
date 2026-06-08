import mongoose, { Schema, Document } from "mongoose";

export interface ICandidateResponse extends Document {
    session_id: mongoose.Types.ObjectId;
    session_question_id: mongoose.Types.ObjectId;
    candidate_id: mongoose.Types.ObjectId;
    transcribed_text: string;
    audio_url?: string; // Lưu đường dẫn file audio trên Cloud nếu cần
}

const CandidateResponseSchema = new Schema({
    session_id: { type: Schema.Types.ObjectId, ref: "InterviewSession", required: true },
    session_question_id: { type: Schema.Types.ObjectId, ref: "SessionQuestion", required: true },
    candidate_id: { type: mongoose.Types.ObjectId, ref: "CandidateProfile", required: true },
    transcribed_text: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model<ICandidateResponse>("CandidateResponse", CandidateResponseSchema);