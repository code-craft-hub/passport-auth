import { initializeApp, cert, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { envConfig } from "../../config";
import { logger } from "../../utils/logger";
import { serviceAccount } from "../../firebase.service-account.config";

class FirebaseService {
  private app: App | null = null;
  private auth: Auth | null = null;
  private firestore: Firestore | null = null;

  initialize(): void {
    try {
      this.app = initializeApp({
        credential: cert(serviceAccount),
        // projectId: firebaseConfig.projectId,
        databaseURL: envConfig.FIREBASE_DATABASE_URL,
      });

      this.auth = getAuth(this.app);
      this.firestore = getFirestore(this.app);
      this.firestore.settings({
        ignoreUndefinedProperties: true,
      });

      logger.info("Firebase Admin SDK initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize Firebase Admin SDK", error);
      throw error;
    }
  }

  getAuth(): Auth {
    if (!this.auth) {
      throw new Error("Firebase Auth not initialized");
    }
    return this.auth;
  }

  getFirestore(): Firestore {
    if (!this.firestore) {
      throw new Error("Firestore not initialized");
    }
    return this.firestore;
  }

  async verifyIdToken(token: string) {
    try {
      return await this.getAuth().verifyIdToken(token);
    } catch (error) {
      logger.error("Token verification failed", error);
      throw error;
    }
  }

  async createUser(email: string, password: string, displayName?: string) {
    try {
      return await this.getAuth().createUser({
        email,
        password,
        displayName,
        emailVerified: false,
      });
    } catch (error) {
      logger.error("User creation failed", error);
      throw error;
    }
  }

  async getUserByEmail(email: string) {
    try {
      return await this.getAuth().getUserByEmail(email);
    } catch (error) {
      if ((error as any).code === "auth/user-not-found") {
        return null;
      }
      throw error;
    }
  }

  async getUserById(uid: string) {
    try {
      return await this.getAuth().getUser(uid);
    } catch (error) {
      logger.error("Get user failed", error);
      throw error;
    }
  }

  async setCustomClaims(uid: string, claims: Record<string, any>) {
    try {
      await this.getAuth().setCustomUserClaims(uid, claims);
    } catch (error) {
      logger.error("Set custom claims failed", error);
      throw error;
    }
  }

  async revokeRefreshTokens(uid: string) {
    try {
      await this.getAuth().revokeRefreshTokens(uid);
      logger.info(`Revoked refresh tokens for user: ${uid}`);
    } catch (error) {
      logger.error("Revoke tokens failed", error);
      throw error;
    }
  }
}

export const firebaseService = new FirebaseService();
