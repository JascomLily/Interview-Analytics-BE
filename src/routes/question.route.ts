import { Router } from "express";
import {
  getQuestions,
  createQuestion,
  deleteQuestion,
  importQuestionsFromPDF,
  vectorSearch,
  updateQuestion,
} from "../controllers/question.controller";
import { verifyToken} from "../middlewares/auth.middleware";
import { upload } from "../middlewares/upload.middleware";
import { authorizeRoles } from "../middlewares/rbac.middleware";

const router = Router();

router.use(verifyToken);

router.get("/", getQuestions);
router.post("/", authorizeRoles("HR"), createQuestion);
router.put("/:id", authorizeRoles("HR"), updateQuestion);
router.delete("/:id", authorizeRoles("HR"), deleteQuestion);

// Import câu hỏi từ PDF (Chỉ HR được phép)
router.post("/import-pdf", authorizeRoles("HR"), upload.single("file"), importQuestionsFromPDF);

// Tìm kiếm câu hỏi bằng Vector Search
router.post("/vector-search", vectorSearch);

export default router;