import mongoose, { Schema, Document } from "mongoose";

export interface IDocumentChunk extends Document {
    document_id: mongoose.Types.ObjectId;
    job_position_id: mongoose.Types.ObjectId; // Bổ sung để isolate RAG
    content: string;         // Đoạn văn bản đã được cắt nhỏ
    embedding: number[];     // Vector 768 chiều từ Gemini
    chunk_index: number;     // Thứ tự của đoạn này trong tài liệu gốc
}

const DocumentChunkSchema = new Schema({
    document_id: { type: Schema.Types.ObjectId, ref: "KnowledgeDocument", required: true },
    job_position_id: { type: Schema.Types.ObjectId, ref: "JobPosition", required: true },
    content: { type: String, required: true },
    embedding: { type: [Number], required: true },
    chunk_index: { type: Number, required: true }
}, { timestamps: true });

DocumentChunkSchema.set("toJSON", {
    virtuals: true,
    transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
    },
});

export default mongoose.model<IDocumentChunk>("DocumentChunk", DocumentChunkSchema);