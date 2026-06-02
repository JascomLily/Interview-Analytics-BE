import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password_hash: string;
  role: "HR" | "CANDIDATE";
  avatarUrl: string | null;
  isActive: boolean;
  refreshToken: string | null;
}

const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password_hash: { type: String, required: true },
    role: { type: String, enum: ["HR", "CANDIDATE"], default: "CANDIDATE" },
    avatarUrl: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    refreshToken: { type: String, default: null },
  },
  { timestamps: true }
);

UserSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret: Record<string, unknown>) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.password_hash;
    delete ret.refreshToken;
  },
});

export default mongoose.model<IUser>("User", UserSchema);