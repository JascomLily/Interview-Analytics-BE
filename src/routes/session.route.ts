import { Router } from "express";
import {
  getSessions,
  createSession,
  getSessionByRoomCode,
  updateSessionStatus,
  sendInvitation,
  createFollowUpQuestion
} from "../controllers/session.controller";
import { verifyToken } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/rbac.middleware";
import { validateObjectId } from "../middlewares/validate-id.middleware";

const router = Router();

router.use(verifyToken);


/*
  #swagger.tags = ['Session']
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
router.get("/", getSessions);
router.post("/", authorizeRoles("HR"), createSession);

// #swagger.tags = ['Session']
router.get("/room/:room_code", getSessionByRoomCode);
router.put("/:id/status", validateObjectId, authorizeRoles("HR"), updateSessionStatus);
router.post("/:id/send-invitation", validateObjectId, authorizeRoles("HR"), sendInvitation);
router.post("/:id/follow-up-question", validateObjectId, authorizeRoles("HR"), createFollowUpQuestion);

export default router;