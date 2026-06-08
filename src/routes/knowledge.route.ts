import { Router } from "express";
import { processKnowledgeDocument, getKnowledgeDocuments } from "../controllers/knowledge.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/rbac.middleware";
import upload from "../middlewares/upload.middleware"; 

const router = Router();

router.get("/", authenticate, authorizeRoles("HR", "ADMIN"), getKnowledgeDocuments);
router.post("/upload", authenticate, authorizeRoles("HR", "ADMIN"), upload.single("file"), processKnowledgeDocument);

export default router;