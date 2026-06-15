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


// #swagger.tags = ['Job Position']
router.get("/", getJobPositions);

// #swagger.tags = ['Job Position']
router.get("/:id", validateObjectId, getJobPositionById);

// #swagger.tags = ['Job Position']
router.post("/", createJobPosition);

// #swagger.tags = ['Job Position']
router.put("/:id", validateObjectId, updateJobPosition);

// #swagger.tags = ['Job Position']
router.delete("/:id", validateObjectId, deleteJobPosition);

export default router;
