import multer from "multer";
import path from "path";
import fs from "fs";


const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const DOCS_DIR = path.join(UPLOADS_DIR, "documents"); 
const RECORDINGS_DIR = path.join(UPLOADS_DIR, "recordings");


[DOCS_DIR, RECORDINGS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const docTypes = [
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "text/plain"
        ];
        if (docTypes.includes(file.mimetype)) {
            cb(null, DOCS_DIR);
        } else {
            cb(null, RECORDINGS_DIR);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, `${uniqueSuffix}-${file.originalname}`);
    },
});


export const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } 
});

export default upload;