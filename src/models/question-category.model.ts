import mongoose, { Schema, Document } from "mongoose";

export interface IQuestionCategory extends Document {
  name: string; // VD: Frontend, Backend, Soft Skill
}

const QuestionCategorySchema = new Schema({
  name: { type: String, required: true, unique: true }
}, { timestamps: true });

export default mongoose.model<IQuestionCategory>("QuestionCategory", QuestionCategorySchema);