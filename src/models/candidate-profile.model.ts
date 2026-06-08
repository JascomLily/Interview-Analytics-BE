import mongoose, { Schema, Document } from "mongoose";

export interface ICandidateProfile extends Document {
    owner_id: mongoose.Types.ObjectId; // User (HR) tạo ra profile này
    full_name: string;
    email: string;
    resume_url?: string;
}

const CandidateProfileSchema = new Schema({
    owner_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    full_name: { type: String, required: true },
    email: { type: String, required: true },
    resume_url: { type: String }
}, { timestamps: true });

export default mongoose.model<ICandidateProfile>("CandidateProfile", CandidateProfileSchema);