import { Router } from "express";
import {
    getJobPositions,
    getJobPositionById,
    createJobPosition,
    updateJobPosition,
    deleteJobPosition
} from "../controllers/job-position.controller";
import { verifyToken } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/rbac.middleware";
import { validateObjectId } from "../middlewares/validate-id.middleware";

const router = Router();

router.use(verifyToken);
router.use(authorizeRoles("HR", "ADMIN"));

router.get("/", getJobPositions);
router.get("/:id", validateObjectId, getJobPositionById);
router.post("/", createJobPosition);
router.put("/:id", validateObjectId, updateJobPosition);
router.delete("/:id", validateObjectId, deleteJobPosition);

export default router;
