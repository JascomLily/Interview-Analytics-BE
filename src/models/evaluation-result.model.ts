import mongoose, { Schema, Document } from "mongoose";

export interface IEvaluationResult extends Document {
  response_id: mongoose.Types.ObjectId; // Trỏ tới CandidateResponse
  score: number;                        // Điểm số (thang 1-10 hoặc 1-100)
  feedback: string;                     // Nhận xét chung
  strengths: string[];                  // Mảng các điểm mạnh
  weaknesses: string[];                 // Mảng các điểm thiếu sót
  evaluated_by: string;                 // 'AI' hoặc ObjectId của HR nếu HR tự chấm
}

const EvaluationResultSchema = new Schema({
  response_id: { type: Schema.Types.ObjectId, ref: "CandidateResponse", required: true },
  score: { type: Number, required: true },
  feedback: { type: String, required: true },
  strengths: [{ type: String }],
  weaknesses: [{ type: String }],
  evaluated_by: { type: String, default: "AI" } 
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