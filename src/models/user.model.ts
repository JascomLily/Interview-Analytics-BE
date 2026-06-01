import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
    name: string;
    email: string;
    password_hash: string;
    role: string;
    avatarUrl: string | null;
    isActive: boolean;
}

const UserSchema = new Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        password_hash: { type: String, required: true },
        role: { type: String, enum: ["ADMIN", "USER", "MODERATOR"], default: "USER" },
        avatarUrl: { type: String, default: null },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

// Tự động map dữ liệu cho khớp với interface User bên FE
UserSchema.set("toJSON", {
    virtuals: true,
    transform: (doc, ret) => {
        ret.id = ret._id; // Đổi _id thành id
        delete ret._id;
        delete ret.__v;
        delete ret.password_hash; // Tuyệt đối không gửi mật khẩu đã hash về FE
    },
});

export default mongoose.model<IUser>("User", UserSchema);