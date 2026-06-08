import mongoose, { Schema, Document } from "mongoose";

export interface ISkill extends Document {
    name: string;
}

const SkillSchema = new Schema({
    name: { type: String, required: true, unique: true }
}, { timestamps: true });

export default mongoose.model<ISkill>("Skill", SkillSchema);