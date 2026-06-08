import mongoose, { Schema, Document } from "mongoose";

export interface IQuestionBank extends Document {
    category_id: mongoose.Types.ObjectId;
    assessed_skills: mongoose.Types.ObjectId[];
    content: string;
    expected_answer: string;
    embedding?: number[];
}

const QuestionBankSchema = new Schema({
    category_id: { type: Schema.Types.ObjectId, ref: "QuestionCategory", required: true },
    assessed_skills: [{ type: Schema.Types.ObjectId, ref: "Skill" }],
    content: { type: String, required: true },
    expected_answer: { type: String, required: true },
    embedding: { type: [Number], default: [] }
}, { timestamps: true });

QuestionBankSchema.set("toJSON", {
    virtuals: true,
    transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
    },
});

export default mongoose.model<IQuestionBank>("QuestionBank", QuestionBankSchema);