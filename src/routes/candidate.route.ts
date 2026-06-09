import { Router } from "express";
import {
    getCandidates,
    getCandidateById,
    createCandidate,
    updateCandidate,
    deleteCandidate
} from "../controllers/candidate.controller";
import { verifyToken } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/rbac.middleware";
import { validateObjectId } from "../middlewares/validate-id.middleware";

const router = Router();

router.use(verifyToken);
router.use(authorizeRoles("HR", "ADMIN"));

router.get("/", getCandidates);
router.get("/:id", validateObjectId, getCandidateById);
router.post("/", createCandidate);
router.put("/:id", validateObjectId, updateCandidate);
router.delete("/:id", validateObjectId, deleteCandidate);

export default router;
