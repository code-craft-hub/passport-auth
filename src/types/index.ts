import { Request, Response, NextFunction } from "express";

// Auth Types
export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  referredBy?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}


export type RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => any;

// User Types
export interface User {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  referralCode: string;
  referredBy?: string;
  referralCount: number;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  admin?: boolean;
}

export interface UserDocument {
  email: string;
  firstName: string;
  lastName: string;
  referralCode: string;
  referredBy?: string;
  referralCount: number;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  isActive: boolean;
}

// Referral Types
export interface ReferralJobData {
  userId: string;
  firstName: string;
  lastName: string;
  referredBy?: string;
}

export interface ReferralStats {
  referralCode: string;
  referralCount: number;
}

// Queue Types
export enum QueueNames {
  REFERRAL = "referral",
}

export enum JobNames {
  GENERATE_REFERRAL_CODE = "generate-referral-code",
  UPDATE_REFERRER = "update-referrer",
}

// Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  statusCode: number;
}
