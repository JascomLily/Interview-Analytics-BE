import { Router } from "express";
import {
  getSessions,
  createSession,
  getSessionByRoomCode,
  updateSessionStatus,
} from "../controllers/session.controller";
import { verifyToken } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/rbac.middleware";

const router = Router();

router.use(verifyToken);

router.get("/", getSessions);
router.post("/", authorizeRoles("HR"), createSession);
router.get("/room/:room_code", getSessionByRoomCode);
router.put("/:id/status", authorizeRoles("HR"), updateSessionStatus);

export default router;