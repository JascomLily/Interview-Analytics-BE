import { Router } from "express";
import { getUsers, createUser, deleteUser } from "../controllers/user.controller";

const router = Router();

// Định nghĩa các endpoint
router.get("/", getUsers);
router.post("/", createUser);
router.delete("/:id", deleteUser);
// (Phần update và getById nhóm mình sẽ thêm sau nếu cần)

export default router;