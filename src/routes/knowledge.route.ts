import { Router } from "express";
import { processKnowledgeDocument, getKnowledgeDocuments } from "../controllers/knowledge.controller";
import { verifyToken } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/rbac.middleware";
import upload from "../middlewares/upload.middleware"; 

const router = Router();

router.get("/", verifyToken, authorizeRoles("HR", "ADMIN"), getKnowledgeDocuments);
router.post("/upload", verifyToken, authorizeRoles("HR", "ADMIN"), upload.single("file"), processKnowledgeDocument);

export default router;