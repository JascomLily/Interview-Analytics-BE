import { Router } from "express";
import { getUsers, deleteUser } from "../controllers/user.controller";
import { authenticate, authorize } from "../middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/", authorize("HR"), getUsers);
router.delete("/:id", authorize("HR"), deleteUser);

export default router;