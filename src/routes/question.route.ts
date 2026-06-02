import { Router } from "express";
import { getQuestions, createQuestion, deleteQuestion } from "../controllers/question.controller";
import { authenticate, authorize } from "../middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/", getQuestions);
router.post("/", authorize("HR"), createQuestion);
router.delete("/:id", authorize("HR"), deleteQuestion);

export default router;