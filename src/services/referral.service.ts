import { firebaseService } from './third-party/firebase.service';
import { logger } from '../utils/logger';
import { ConflictError, NotFoundError } from '../utils/errors';

class ReferralService {
  private readonly COLLECTION = 'users';
  private readonly MAX_RETRIES = 5;

  // Generate referral code strategy
  private generateRandomChars(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private normalizeString(str: string): string {
    return str.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
  }

  async generateReferralCode(
    userId: string,
    firstName: string,
    lastName: string
  ): Promise<string> {
    const db = firebaseService.getFirestore();
    const usersRef = db.collection(this.COLLECTION);

    // Strategy 1: firstName (first 4 letters) + 4 random chars
    const firstNamePrefix = this.normalizeString(firstName);
    if (firstNamePrefix.length >= 4) {
      const code = firstNamePrefix + this.generateRandomChars(4);
      if (await this.isReferralCodeUnique(code)) {
        await this.saveReferralCode(userId, code);
        return code;
      }
    }

    // Strategy 2: lastName (first 4 letters) + 4 random chars
    const lastNamePrefix = this.normalizeString(lastName);
    if (lastNamePrefix.length >= 4) {
      const code = lastNamePrefix + this.generateRandomChars(4);
      if (await this.isReferralCodeUnique(code)) {
        await this.saveReferralCode(userId, code);
        return code;
      }
    }

    // Strategy 3: Generate random 8 characters until unique
    for (let i = 0; i < this.MAX_RETRIES; i++) {
      const code = this.generateRandomChars(8);
      if (await this.isReferralCodeUnique(code)) {
        await this.saveReferralCode(userId, code);
        return code;
      }
    }

    throw new ConflictError('Failed to generate unique referral code');
  }

  private async isReferralCodeUnique(code: string): Promise<boolean> {
    const db = firebaseService.getFirestore();
    const snapshot = await db
      .collection(this.COLLECTION)
      .where('referralCode', '==', code)
      .limit(1)
      .get();

    return snapshot.empty;
  }

  private async saveReferralCode(userId: string, code: string): Promise<void> {
    const db = firebaseService.getFirestore();
    await db.collection(this.COLLECTION).doc(userId).update({
      referralCode: code,
      updatedAt: new Date(),
    });
    logger.info(`Referral code ${code} saved for user: ${userId}`);
  }

  async getUserByReferralCode(referralCode: string) {
    const db = firebaseService.getFirestore();
    const snapshot = await db
      .collection(this.COLLECTION)
      .where('referralCode', '==', referralCode)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return { uid: doc.id, ...doc.data() };
  }

  async incrementReferralCount(userId: string): Promise<void> {
    const db = firebaseService.getFirestore();
    const userRef = db.collection(this.COLLECTION).doc(userId);

    try {
      await db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) {
          throw new NotFoundError('Referrer user not found');
        }

        const currentCount = userDoc.data()?.referralCount || 0;
        transaction.update(userRef, {
          referralCount: currentCount + 1,
          updatedAt: new Date(),
        });
      });

      logger.info(`Incremented referral count for user: ${userId}`);
    } catch (error) {
      logger.error('Failed to increment referral count', error);
      throw error;
    }
  }

  async getReferralStats(userId: string) {
    const db = firebaseService.getFirestore();
    const userDoc = await db.collection(this.COLLECTION).doc(userId).get();

    if (!userDoc.exists) {
      throw new NotFoundError('User not found');
    }

    const userData = userDoc.data();
    return {
      referralCode: userData?.referralCode || '',
      referralCount: userData?.referralCount || 0,
    };
  }
}

export const referralService = new ReferralService();