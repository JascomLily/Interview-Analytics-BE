import mongoose, { Schema, Document } from "mongoose";

export interface IJobPosition extends Document {
	title: string;
	department: string;
	required_skills: mongoose.Types.ObjectId[]; 
	is_active: boolean;
}

const JobPositionSchema = new Schema({
	title: { type: String, required: true },
	department: { type: String, default: "Engineering" },
	required_skills: [{ type: Schema.Types.ObjectId, ref: "Skill" }], 
	is_active: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model<IJobPosition>("JobPosition", JobPositionSchema);