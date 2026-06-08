import { Router } from "express";
import { getInterviewReport, getDashboardReports } from "../controllers/report.controller";
import { verifyToken } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/rbac.middleware";

const router = Router();

router.use(verifyToken);
router.use(authorizeRoles("HR", "ADMIN"));

router.get("/", getDashboardReports);

router.get("/:sessionId", getInterviewReport);

export default router;