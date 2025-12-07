import { DecodedIdToken } from "firebase-admin/auth";

declare global {
  namespace Express {
    interface Request {
      user?: {
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
      } | DecodedIdToken;
    }
  }
}

export {};
