import { Router } from "express";
import {
  register,
  login,
  refreshToken,
  logout,
  getMe,
} from "../controllers/auth.controller";
import { verifyToken } from "../middlewares/auth.middleware";

const router = Router();


// #swagger.tags = ['Auth']
router.post("/register", register);

// #swagger.tags = ['Auth']
router.post("/login", login);

// #swagger.tags = ['Auth']
router.post("/refresh", refreshToken);

// #swagger.tags = ['Auth']
router.post("/logout", verifyToken, logout);

// #swagger.tags = ['Auth']
router.get("/me", verifyToken, getMe);

export default router;
