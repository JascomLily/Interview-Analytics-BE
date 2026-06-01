import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  email: string;
  password_hash: string;
  full_name: string;
  role: string;
}

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    password_hash: { type: String, required: true },
    full_name: { type: String, required: true },
    role: { type: String, enum: ["ADMIN", "INTERVIEWER", "INTERVIEWEE"], default: "INTERVIEWEE" },
  },
  { timestamps: true } // Tự động tạo createdAt, updatedAt
);

export default mongoose.model<IUser>("User", UserSchema);