import { Request, Response } from "express";
import fs from "fs";
import pdfParse = require("pdf-parse");
import KnowledgeDocument from "../models/knowledge-document.model";
import DocumentChunk from "../models/document-chunk.model";
import { GeminiService } from "../services/gemini.service";


const splitTextIntoChunks = (text: string, maxChunkSize = 1000, overlap = 100): string[] => {
    const chunks: string[] = [];
    let i = 0;

    const cleanText = text.replace(/\s+/g, ' ').trim();

    while (i < cleanText.length) {
        chunks.push(cleanText.slice(i, i + maxChunkSize));
        i += maxChunkSize - overlap;
    }
    return chunks;
};

export const processKnowledgeDocument = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.file) {
            res.status(400).json({ message: "Không tìm thấy file PDF được upload" });
            return;
        }

        const title = req.body.title || req.file.originalname;

       
        const documentRecord = await KnowledgeDocument.create({
            title: title,
            file_url: req.file.path, 
            mime_type: req.file.mimetype,
            uploaded_by: req.user!.id,
            is_processed: false
        });

        console.log(`[RAG] Đang đọc nội dung file PDF: ${req.file.path}`);
        const fileBuffer = fs.readFileSync(req.file.path);
        const pdfData = await pdfParse(fileBuffer);

        if (!pdfData.text || pdfData.text.trim().length === 0) {
            res.status(400).json({ message: "Không thể trích xuất văn bản từ file PDF này" });
            return;
        }

        
        console.log("[RAG] Đang băm nhỏ tài liệu thành các Chunk...");
        const textChunks = splitTextIntoChunks(pdfData.text);
        console.log(`[RAG] Đã tạo ra ${textChunks.length} chunks.`);

        
        console.log("[RAG] Đang gọi Gemini API để tạo Vector Embeddings...");
        const chunksToSave = [];

       
        for (let i = 0; i < textChunks.length; i++) {
            try {
                const embedding = await GeminiService.generateEmbedding(textChunks[i]);
                chunksToSave.push({
                    document_id: documentRecord._id,
                    content: textChunks[i],
                    embedding: embedding,
                    chunk_index: i + 1
                });
            } catch (embErr: any) {
                console.warn(`[RAG] Lỗi tạo vector cho chunk ${i + 1}:`, embErr.message);
            }
        }

        
        await DocumentChunk.insertMany(chunksToSave);


        documentRecord.is_processed = true;
        await documentRecord.save();

        fs.unlink(req.file.path, (err) => {
            if (err) console.error("[RAG] Lỗi xóa file tạm:", err.message);
        });

        res.status(201).json({
            message: "Xử lý RAG tài liệu thành công",
            data: {
                document: documentRecord,
                total_chunks: chunksToSave.length
            }
        });

    } catch (error: any) {
        console.error("[RAG] Lỗi pipeline:", error);
        res.status(500).json({ message: "Lỗi hệ thống khi xử lý tài liệu tri thức" });
    }
};

export const getKnowledgeDocuments = async (req: Request, res: Response): Promise<void> => {
    try {
        const documents = await KnowledgeDocument.find()
            .populate("uploaded_by", "name email")
            .sort({ createdAt: -1 });

        res.json({ data: documents });
    } catch (error) {
        res.status(500).json({ message: "Lỗi lấy danh sách tài liệu" });
    }
};