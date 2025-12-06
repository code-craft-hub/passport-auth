import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

const userRouter = Router();

// All user routes require authentication
userRouter.use(authenticate);

userRouter.get("/me/audit-logs", UserController.getAuditLogs);
userRouter.delete("/me", UserController.deactivateAccount);

// Admin only routes
userRouter.get("/:id", authorize("admin"), UserController.getUser);

export { userRouter };
