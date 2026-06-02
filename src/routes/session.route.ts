import { Router } from "express";
import {
  getSessions,
  createSession,
  getSessionByRoomCode,
  updateSessionStatus,
} from "../controllers/session.controller";
import { authenticate, authorize } from "../middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/", getSessions);
router.post("/", authorize("HR"), createSession);
router.get("/room/:room_code", getSessionByRoomCode);
router.put("/:id/status", authorize("HR"), updateSessionStatus);

export default router;