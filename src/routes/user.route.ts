import { Router } from "express";
import { getUsers, deleteUser } from "../controllers/user.controller";
import { verifyToken,} from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/rbac.middleware";
const router = Router();

router.use(verifyToken);

router.get("/", authorizeRoles("HR"), getUsers);
router.delete("/:id", authorizeRoles("HR"), deleteUser);

export default router;