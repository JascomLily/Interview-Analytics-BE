import mongoose, { Schema, Document } from "mongoose";

export interface IRole extends Document {
    name: string; // VD: "ADMIN", "HR", "CANDIDATE"
    permissions?: string[];
}

const RoleSchema = new Schema({
    name: { type: String, required: true, unique: true },
    permissions: [{ type: String }]
}, { timestamps: true });

export default mongoose.model<IRole>("Role", RoleSchema);