import mongoose, { Schema, Document } from "mongoose";

export interface ISessionQuestion extends Document {
    session_id: mongoose.Types.ObjectId;
    question_bank_id?: mongoose.Types.ObjectId; 
    content: string;
    expected_answer: string;
    order_index: number;
    is_ad_hoc: boolean;      
}

const SessionQuestionSchema = new Schema({
    
    session_id: { type: Schema.Types.ObjectId, ref: "InterviewSession", required: true },
    question_bank_id: { type: Schema.Types.ObjectId, ref: "QuestionBank" },
    content: { type: String, required: true },
    expected_answer: { type: String, required: true },
    order_index: { type: Number, required: true },
    is_ad_hoc: { type: Boolean, default: false }
}, { timestamps: true });


SessionQuestionSchema.set("toJSON", {
    virtuals: true,
    transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
    },
});

export default mongoose.model<ISessionQuestion>("SessionQuestion", SessionQuestionSchema);