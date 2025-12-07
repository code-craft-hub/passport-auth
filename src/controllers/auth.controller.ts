import { Request, Response, NextFunction } from "express";
import { authService } from "../services/auth.service";
import { RegisterRequest, LoginRequest, ApiResponse } from "../types";

/**
 * Auth Controller
 * Handles user registration, login, and logout
 * methods POST /register
 * @param email: string;
 * @param password: string;
 * @param firstName: string;
 * @param lastName: string;
 * @param referredBy?: string;
 * @returns ApiResponse
 *
 */
export class AuthController {
  async register(
    req: Request<{}, {}, RegisterRequest>,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await authService.register(req.body);

      res.status(201).json({
        success: true,
        data: result,
        message: "User registered successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  async login(
    req: Request<{}, {}, LoginRequest>,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const { email, password } = req.body;

      const { uid, sessionCookie } = await authService.loginWithFirebaseRest(
        email,
        password
      );

      // Set session cookie
      res.cookie("session", sessionCookie, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
        path: "/",
      });

      res.status(200).json({
        success: true,
        message: "Login successful",
        data: { uid, email },
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(
    _req: Request,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      // Client should delete the token
      res.status(200).json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
