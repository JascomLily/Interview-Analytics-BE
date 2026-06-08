import mongoose, { Schema, Document } from "mongoose";

export interface IInterviewSession extends Document {
  conductor_id: mongoose.Types.ObjectId; // User (HR)
  job_position_id: mongoose.Types.ObjectId;
  candidate_profile_id: mongoose.Types.ObjectId;
  room_code: string;
  status: string;
  scheduled_at?: Date;
}

const InterviewSessionSchema = new Schema({
  conductor_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  job_position_id: { type: Schema.Types.ObjectId, ref: "JobPosition", required: true },
  candidate_profile_id: { type: Schema.Types.ObjectId, ref: "CandidateProfile", required: true },
  room_code: { type: String, required: true, unique: true },
  status: { type: String, enum: ["SCHEDULED", "ONGOING", "COMPLETED", "CANCELLED"], default: "SCHEDULED" },
  scheduled_at: { type: Date }
}, { timestamps: true });

InterviewSessionSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret: Record<string, unknown>) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  },
});

export default mongoose.model<IInterviewSession>("InterviewSession", InterviewSessionSchema);