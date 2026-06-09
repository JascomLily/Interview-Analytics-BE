import { Router } from "express";
import { getSkills, createSkill, deleteSkill } from "../controllers/skill.controller";
import { verifyToken } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/rbac.middleware";
import { validateObjectId } from "../middlewares/validate-id.middleware";

const router = Router();

router.use(verifyToken);

router.get("/", authorizeRoles("HR", "ADMIN"), getSkills);
router.post("/", authorizeRoles("HR", "ADMIN"), createSkill);
router.delete("/:id", validateObjectId, authorizeRoles("HR", "ADMIN"), deleteSkill);

export default router;
