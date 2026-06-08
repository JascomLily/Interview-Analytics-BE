import mongoose, { Schema, Document } from "mongoose";

export interface IKnowledgeDocument extends Document {
    title: string;
    file_url: string;        // Đường dẫn file (Local hoặc S3)
    mime_type: string;       // Định dạng file (application/pdf, text/plain...)
    uploaded_by: mongoose.Types.ObjectId; // HR nào tải lên
    is_processed: boolean;   // Đã được băm nhỏ thành Chunk chưa?
}

const KnowledgeDocumentSchema = new Schema({
    title: { type: String, required: true },
    file_url: { type: String, required: true },
    mime_type: { type: String, required: true },
    uploaded_by: { type: Schema.Types.ObjectId, ref: "User", required: true },
    is_processed: { type: Boolean, default: false }
}, { timestamps: true });

KnowledgeDocumentSchema.set("toJSON", {
    virtuals: true,
    transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
    },
});

export default mongoose.model<IKnowledgeDocument>("KnowledgeDocument", KnowledgeDocumentSchema);