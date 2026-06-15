import mongoose, { Schema, Document } from "mongoose";

export interface IEvaluationResult extends Document {
  session_id: mongoose.Types.ObjectId; 
  question_id: mongoose.Types.ObjectId;
  score: number;                        
  feedback: string;                     
  strengths: string[];                  
  weaknesses: string[];                 
  evaluated_by: string;                 
  version: number;
}

const EvaluationResultSchema = new Schema({
  session_id: { type: Schema.Types.ObjectId, ref: "InterviewSession", required: true },
  question_id: { type: Schema.Types.ObjectId, ref: "SessionQuestion", required: true },
  score: { type: Number, required: true },
  feedback: { type: String, required: true },
  strengths: [{ type: String }],
  weaknesses: [{ type: String }],
  evaluated_by: { type: String, default: "AI" },
  version: { type: Number, default: 1 }
}, { timestamps: true });

EvaluationResultSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret: Record<string, unknown>) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  },
});

export default mongoose.model<IEvaluationResult>("EvaluationResult", EvaluationResultSchema);