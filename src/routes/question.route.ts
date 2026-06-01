import { Router } from "express";
import { getQuestions, createQuestion, deleteQuestion } from "../controllers/question.controller";

const router = Router();

router.get("/", getQuestions);
router.post("/", createQuestion);
router.delete("/:id", deleteQuestion);

export default router;