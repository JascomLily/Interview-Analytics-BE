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
import { validateObjectId } from "../middlewares/validate-id.middleware";

const router = Router();

router.use(verifyToken);

router.get("/", getQuestions);
router.post("/", authorizeRoles("HR"), createQuestion);
router.put("/:id", validateObjectId, authorizeRoles("HR"), updateQuestion);
router.delete("/:id", validateObjectId, authorizeRoles("HR"), deleteQuestion);

// Import câu hỏi từ PDF (Chỉ HR được phép)
/*
  #swagger.tags = ['Question']
  #swagger.consumes = ['multipart/form-data']
  #swagger.parameters['category_id'] = {
      in: 'formData',
      type: 'string',
      required: true,
      description: 'ID của danh mục câu hỏi'
  }
  #swagger.parameters['file'] = {
      in: 'formData',
      type: 'file',
      required: true,
      description: 'File PDF chứa danh sách câu hỏi'
  }
*/
router.post("/import-pdf", authorizeRoles("HR"), upload.single("file"), importQuestionsFromPDF);

// Tìm kiếm câu hỏi bằng Vector Search
router.post("/vector-search", vectorSearch);

export default router;