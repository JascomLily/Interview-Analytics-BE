import { Router } from "express";
import {
  getQuestions,
  createQuestion,
  deleteQuestion,
  importQuestionsFromPDF,
  vectorSearch,
} from "../controllers/question.controller";
import { authenticate, authorize } from "../middlewares/auth.middleware";
import { upload } from "../middlewares/upload.middleware";

const router = Router();

router.use(authenticate);

router.get("/", getQuestions);
router.post("/", authorize("HR"), createQuestion);
router.delete("/:id", authorize("HR"), deleteQuestion);

// Import câu hỏi từ PDF (Chỉ HR được phép)
router.post("/import-pdf", authorize("HR"), upload.single("file"), importQuestionsFromPDF);

// Tìm kiếm câu hỏi bằng Vector Search
router.post("/vector-search", vectorSearch);

export default router;