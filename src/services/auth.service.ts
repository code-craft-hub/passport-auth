import { firebaseService } from "./third-party/firebase.service";
import { userService } from "./user.service";
import { referralQueue } from "../queues/referral.queue";
import { RegisterRequest } from "../types";
import { logger } from "../utils/logger";
import { UnauthorizedError, ConflictError } from "../utils/errors";
import { envConfig } from "../config";
import axios from "axios";

class AuthService {
  async loginWithFirebaseRest(email: string, password: string) {
    try {
      const apiKey = envConfig.FIREBASE_API_KEY;
      const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;

      // Call Firebase REST API directly
      const response = await axios.post(url, {
        email,
        password,
        returnSecureToken: true,
      });

      const { idToken, refreshToken, localId } = response.data;

      // console.log("Firebase REST login response =========:", response.data);
      if (!idToken) {
        throw new UnauthorizedError("Failed to sign in with Firebase");
      }

      // Create a secure Firebase Session Cookie valid for 14 days
      const sessionCookie = await firebaseService
        .getAuth()
        .createSessionCookie(idToken, { expiresIn: 14 * 24 * 60 * 60 * 1000 });

      return {
        uid: localId,
        idToken,
        refreshToken,
        sessionCookie,
      };
    } catch (error: any) {
      throw new UnauthorizedError(
        error?.response?.data?.error?.message || "Invalid credentials"
      );
    }
  }

  async register(data: RegisterRequest) {
    const { email, password, firstName, lastName, referredBy } = data;

    try {
      // Check if user already exists
      const existingUser = await firebaseService.getUserByEmail(email);
      if (existingUser) {
        throw new ConflictError("User with this email already exists");
      }

      // Create Firebase Auth user
      const userRecord = await firebaseService.createUser(
        email,
        password,
        `${firstName} ${lastName}`
      );

      // Create user document in Firestore
      await userService.createUser(
        userRecord.uid,
        email,
        firstName,
        lastName,
        referredBy
      );

      // Add background job for referral code generation
      await referralQueue.addReferralJob({
        userId: userRecord.uid,
        firstName,
        lastName,
        referredBy,
      });

      logger.info(`User registered successfully: ${userRecord.uid}`);

      return {
        uid: userRecord.uid,
        email: userRecord.email,
        message:
          "Registration successful. Your referral code is being generated.",
      };
    } catch (error) {
      logger.error("Registration failed", error);
      throw error;
    }
  }

  async verifyToken(token: string) {
    try {
      const decodedToken = await firebaseService.verifyIdToken(token);

      // Check if user is active
      const user = await userService.getUser(decodedToken.uid);
      if (!user || !(user as any).isActive) {
        throw new UnauthorizedError("User account is inactive");
      }

      return decodedToken;
    } catch (error) {
      logger.error("Token verification failed", error);
      throw new UnauthorizedError("Invalid or expired token");
    }
  }

  async revokeUserSessions(uid: string): Promise<void> {
    try {
      // Revoke all refresh tokens for the user
      await firebaseService.revokeRefreshTokens(uid);

      // Set custom claim to force re-authentication
      await firebaseService.setCustomClaims(uid, {
        sessionRevoked: Date.now(),
      });

      logger.info(`Revoked all sessions for user: ${uid}`);
    } catch (error) {
      logger.error("Failed to revoke user sessions", error);
      throw error;
    }
  }

  async validateUserSession(decodedToken: any): Promise<boolean> {
    try {
      const user = await firebaseService.getUserById(decodedToken.uid);

      // Check if token was issued before session revocation
      if (user.customClaims?.sessionRevoked) {
        const tokenIssuedAt = decodedToken.auth_time * 1000; // Convert to milliseconds
        const sessionRevokedAt = user.customClaims.sessionRevoked;

        if (tokenIssuedAt < sessionRevokedAt) {
          return false;
        }
      }

      return true;
    } catch (error) {
      logger.error("Session validation failed", error);
      return false;
    }
  }
}

export const authService = new AuthService();
