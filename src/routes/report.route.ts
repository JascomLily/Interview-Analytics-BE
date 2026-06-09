import { Router } from "express";
import { getInterviewReport, getDashboardReports, reEvaluateSession, exportReportPdf } from "../controllers/report.controller";
import { verifyToken } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/rbac.middleware";

const router = Router();

router.use(verifyToken);
router.use(authorizeRoles("HR", "ADMIN"));


// #swagger.tags = ['Report']
router.get("/", getDashboardReports);


// #swagger.tags = ['Report']
router.get("/:sessionId", getInterviewReport);

// #swagger.tags = ['Report']
router.post("/:sessionId/re-evaluate", reEvaluateSession);

// #swagger.tags = ['Report']
router.get("/:sessionId/export-pdf", exportReportPdf);

export default router;