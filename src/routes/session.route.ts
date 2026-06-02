import { Router } from "express";
import {
    getSessions,
    createSession,
    getSessionByRoomCode,
    updateSessionStatus,
} from "../controllers/session.controller";

const router = Router();

router.get("/", getSessions);
router.post("/", createSession);
router.get("/room/:room_code", getSessionByRoomCode); 
router.put("/:id/status", updateSessionStatus);      

export default router;