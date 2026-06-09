import { Router } from "express";
import {
  getQuestions,
  createQuestion,
  deleteQuestion,
  importQuestionsFromPDF,
  vectorSearch,
} from "../controllers/question.controller";
import { verifyToken} from "../middlewares/auth.middleware";
import { upload } from "../middlewares/upload.middleware";
import { authorizeRoles } from "../middlewares/rbac.middleware";
import { validateObjectId } from "../middlewares/validate-id.middleware";

const router = Router();

router.use(verifyToken);


// #swagger.tags = ['Question']
router.get("/", getQuestions);
router.post("/", authorizeRoles("HR"), createQuestion);
router.delete("/:id", validateObjectId, authorizeRoles("HR"), deleteQuestion);

// Import câu hỏi từ PDF (Chỉ HR được phép)
router.post("/import-pdf", authorizeRoles("HR"), upload.single("file"), importQuestionsFromPDF);

// Tìm kiếm câu hỏi bằng Vector Search

// #swagger.tags = ['Question']
router.post("/vector-search", vectorSearch);

export default router;