import { Router } from "express";
import { getInterviewReport, getDashboardReports, reEvaluateSession } from "../controllers/report.controller";
import { verifyToken } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/rbac.middleware";

const router = Router();

router.use(verifyToken);
router.use(authorizeRoles("HR", "ADMIN"));

router.get("/", getDashboardReports);

router.get("/:sessionId", getInterviewReport);
router.post("/:sessionId/re-evaluate", reEvaluateSession);

export default router;