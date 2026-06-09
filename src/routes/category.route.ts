import { Router } from "express";
import { getCategories, createCategory, deleteCategory } from "../controllers/category.controller";
import { verifyToken } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/rbac.middleware";
import { validateObjectId } from "../middlewares/validate-id.middleware";

const router = Router();

router.use(verifyToken);
router.use(authorizeRoles("HR", "ADMIN"));


// #swagger.tags = ['Category']
router.get("/", getCategories);

// #swagger.tags = ['Category']
router.post("/", createCategory);

// #swagger.tags = ['Category']
router.delete("/:id", validateObjectId, deleteCategory);

export default router;
