import { Router } from "express";
import { getInterviewReport, getDashboardReports, reEvaluateSession, exportReportPdf } from "../controllers/report.controller";
import { verifyToken } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/rbac.middleware";

const router = Router();

router.use(verifyToken);
router.use(authorizeRoles("HR", "ADMIN"));


/*
  #swagger.tags = ['Report']
  #swagger.parameters['startDate'] = {
      in: 'query',
      type: 'string',
      description: 'Lọc từ ngày (VD: 2024-01-01)'
  }
  #swagger.parameters['endDate'] = {
      in: 'query',
      type: 'string',
      description: 'Lọc đến ngày (VD: 2024-12-31)'
  }
*/
router.get("/", getDashboardReports);


// #swagger.tags = ['Report']
router.get("/:sessionId", getInterviewReport);

// #swagger.tags = ['Report']
router.post("/:sessionId/re-evaluate", reEvaluateSession);

// #swagger.tags = ['Report']
router.get("/:sessionId/export-pdf", exportReportPdf);

export default router;