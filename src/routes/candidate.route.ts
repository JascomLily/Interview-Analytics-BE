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


// #swagger.tags = ['Candidate']
router.get("/", getCandidates);

// #swagger.tags = ['Candidate']
router.get("/:id", validateObjectId, getCandidateById);

// #swagger.tags = ['Candidate']
router.post("/", createCandidate);

// #swagger.tags = ['Candidate']
router.put("/:id", validateObjectId, updateCandidate);

// #swagger.tags = ['Candidate']
router.delete("/:id", validateObjectId, deleteCandidate);

export default router;
