import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { validateBody } from "../middleware/validation.middleware";
import { authLimiter } from "../middleware/rate-limit.middleware";
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
} from "../types/auth.types";
import passport from "../config/passport-google";
import { authenticate } from "../middleware/auth.middleware";

const router: Router = Router();

// Local authentication
router.post(
  "/register",
  authLimiter,
  validateBody(registerSchema),
  AuthController.register
);

router.post(
  "/login",
  authLimiter,
  validateBody(loginSchema),
  AuthController.login
);

router.post(
  "/refresh",
  validateBody(refreshTokenSchema),
  AuthController.refresh
);

router.post(
  "/logout",
  authenticate,
  validateBody(refreshTokenSchema),
  AuthController.logout
);

router.post("/logout-all", authenticate, AuthController.logoutAll);

router.get("/me", authenticate, AuthController.getCurrentUser);

// Google OAuth
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/login",
  }),
  AuthController.googleCallback
);

export default router;
