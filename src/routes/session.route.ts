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


// #swagger.tags = ['Session']
router.get("/", getSessions);
router.post("/", authorizeRoles("HR"), createSession);

// #swagger.tags = ['Session']
router.get("/room/:room_code", getSessionByRoomCode);
router.put("/:id/status", validateObjectId, authorizeRoles("HR"), updateSessionStatus);
router.post("/:id/send-invitation", validateObjectId, authorizeRoles("HR"), sendInvitation);
router.post("/:id/follow-up-question", validateObjectId, authorizeRoles("HR"), createFollowUpQuestion);

export default router;