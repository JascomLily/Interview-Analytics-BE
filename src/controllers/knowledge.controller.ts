import { Request, Response } from "express";
import fs from "fs";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import mongoose from "mongoose";
import KnowledgeDocument from "../models/knowledge-document.model";
import DocumentChunk from "../models/document-chunk.model";
import JobPosition from "../models/job-position.model";
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
    // #swagger.consumes = ['multipart/form-data']
    /*  #swagger.parameters['file'] = {
            in: 'formData',
            type: 'file',
            required: true,
            description: 'Tải lên tài liệu tri thức (PDF, DOCX, TXT)'
        }
        #swagger.parameters['job_position_id'] = {
            in: 'formData',
            type: 'string',
            required: true,
            description: 'ID của Job Position'
        }
        #swagger.parameters['title'] = {
            in: 'formData',
            type: 'string',
            required: false,
            description: 'Tiêu đề tài liệu'
        }
    */
    try {
        if (!req.file) {
            res.status(400).json({ message: "Không tìm thấy file được upload" });
            return;
        }

        const { title: bodyTitle, job_position_id } = req.body;
        if (!job_position_id || !mongoose.Types.ObjectId.isValid(job_position_id)) {
            res.status(400).json({ message: "Thiếu hoặc sai định dạng job_position_id" });
            return;
        }

        const jobExists = await JobPosition.exists({ _id: job_position_id });
        if (!jobExists) {
            res.status(404).json({ message: "Không tìm thấy Job Position" });
            return;
        }

        const title = bodyTitle || req.file.originalname;

       
        const documentRecord = await KnowledgeDocument.create({
            title: title,
            file_url: req.file.path, 
            mime_type: req.file.mimetype,
            uploaded_by: req.user!.id,
            job_position_id,
            is_processed: false
        });

        console.log(`[RAG] Đang đọc nội dung file: ${req.file.path} (${req.file.mimetype})`);
        const fileBuffer = fs.readFileSync(req.file.path);
        let extractedText = "";

        if (req.file.mimetype === "application/pdf") {
            const parser = new PDFParse({ data: fileBuffer });
            const pdfData = await parser.getText();
            extractedText = pdfData.text;
            await parser.destroy();
} else if (req.file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
            const result = await mammoth.extractRawText({ buffer: fileBuffer });
            extractedText = result.value;
        } else if (req.file.mimetype === "text/plain") {
            extractedText = fileBuffer.toString("utf-8");
        } else {
            res.status(400).json({ message: "Định dạng file không được hỗ trợ (Chỉ chấp nhận PDF, DOCX, TXT)" });
            return;
        }

        if (!extractedText || extractedText.trim().length === 0) {
            res.status(400).json({ message: "Không thể trích xuất văn bản từ file này" });
            return;
        }

        
        console.log("[RAG] Đang băm nhỏ tài liệu thành các Chunk...");
        const textChunks = splitTextIntoChunks(extractedText);
        console.log(`[RAG] Đã tạo ra ${textChunks.length} chunks.`);

        
        console.log("[RAG] Đang gọi Gemini API để tạo Vector Embeddings...");
        const chunksToSave = [];

       
        for (let i = 0; i < textChunks.length; i++) {
            try {
                const embedding = await GeminiService.generateEmbedding(textChunks[i]);
                chunksToSave.push({
                    document_id: documentRecord._id,
                    job_position_id: job_position_id, // Gắn ID để cô lập
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
    } finally {
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error("[RAG] Lỗi xóa file tạm:", err.message);
            });
        }
    }
};

export const getKnowledgeDocuments = async (req: Request, res: Response): Promise<void> => {
    try {
        const filter: any = {};
        if (req.query.job_position_id) {
            filter.job_position_id = req.query.job_position_id;
        }

        const documents = await KnowledgeDocument.find(filter)
            .populate("uploaded_by", "name email")
            .sort({ createdAt: -1 });

        res.json({ data: documents });
    } catch (error) {
        res.status(500).json({ message: "Lỗi lấy danh sách tài liệu" });
    }
};

export const deleteKnowledgeDocument = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id as string;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: "ID không hợp lệ" });
            return;
        }

        const doc = await KnowledgeDocument.findById(id);
        if (!doc) {
            res.status(404).json({ message: "Không tìm thấy tài liệu" });
            return;
        }

        // Xóa file vật lý nếu tồn tại
        if (doc.file_url && fs.existsSync(doc.file_url)) {
            try {
                fs.unlinkSync(doc.file_url);
            } catch (fsErr: any) {
                console.error("[RAG] Lỗi xóa file vật lý:", fsErr.message);
            }
        }

        // Xóa các chunk vector embeddings liên quan
        await DocumentChunk.deleteMany({ document_id: doc._id });

        // Xóa bản ghi tài liệu
        await KnowledgeDocument.findByIdAndDelete(doc._id);

        res.json({ message: "Xóa tài liệu và dữ liệu vector RAG thành công" });
    } catch (error: any) {
        console.error("[RAG] Lỗi khi xóa tài liệu:", error);
        res.status(500).json({ message: "Lỗi hệ thống khi xóa tài liệu tri thức" });
    }
};