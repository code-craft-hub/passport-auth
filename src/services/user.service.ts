import { db } from '../db/connection';
import { users, oauthAccounts } from '../db/schema';
import { eq } from 'drizzle-orm';
import { PasswordService } from './password.service';
import { ConflictError, NotFoundError } from '../utils/errors';
import { RegisterDTO, UserResponse } from '../types/auth.types';

export class UserService {
  /**
   * Create new user with local authentication
   */
  static async createUser(data: RegisterDTO): Promise<UserResponse> {
    // Check if user exists
    const existingUser = await this.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Hash password
    const passwordHash = await PasswordService.hashPassword(data.password);

    // Create user
    const [user] = await db
      .insert(users)
      .values({
        email: data.email.toLowerCase(),
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        emailVerified: false, // Require email verification in production
      })
      .returning();

    return this.toUserResponse(user);
  }

  /**
   * Find user by email
   */
  static async findByEmail(email: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    return user;
  }

  /**
   * Find user by ID
   */
  static async findById(id: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return user;
  }

  /**
   * Update last login timestamp
   */
  static async updateLastLogin(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, userId));
  }

  /**
   * Find or create user from OAuth provider
   */
  static async findOrCreateOAuthUser(profile: {
    provider: 'google';
    providerId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    accessToken: string;
    refreshToken?: string;
  }): Promise<UserResponse> {
    // Check if OAuth account exists
    const [existingAccount] = await db
      .select()
      .from(oauthAccounts)
      .where(eq(oauthAccounts.providerId, profile.providerId))
      .limit(1);

    if (existingAccount) {
      // Update tokens
      await db
        .update(oauthAccounts)
        .set({
          accessToken: profile.accessToken,
          refreshToken: profile.refreshToken,
          updatedAt: new Date(),
        })
        .where(eq(oauthAccounts.id, existingAccount.id));

      const user = await this.findById(existingAccount.userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      return this.toUserResponse(user);
    }

    // Check if user exists with this email (link accounts)
    let user = await this.findByEmail(profile.email);

    if (!user) {
      // Create new user
      [user] = await db
        .insert(users)
        .values({
          email: profile.email.toLowerCase(),
          firstName: profile.firstName,
          lastName: profile.lastName,
          emailVerified: true, // OAuth emails are pre-verified
        })
        .returning();
    }

    // Create OAuth account
    await db.insert(oauthAccounts).values({
      userId: user.id,
      provider: profile.provider,
      providerId: profile.providerId,
      providerEmail: profile.email,
      accessToken: profile.accessToken,
      refreshToken: profile.refreshToken,
    });

    return this.toUserResponse(user);
  }

  /**
   * Verify user credentials
   */
  static async verifyCredentials(
    email: string,
    password: string
  ): Promise<UserResponse> {
    const user = await this.findByEmail(email);

    if (!user || !user.passwordHash) {
      throw new NotFoundError('Invalid credentials');
    }

    if (!user.isActive) {
      throw new ConflictError('Account is deactivated');
    }

    const isValidPassword = await PasswordService.comparePassword(
      password,
      user.passwordHash
    );

    if (!isValidPassword) {
      throw new NotFoundError('Invalid credentials');
    }

    return this.toUserResponse(user);
  }

  /**
   * Convert database user to response DTO (remove sensitive data)
   */
  static toUserResponse(user: typeof users.$inferSelect): UserResponse {
    return {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  /**
   * Deactivate user account
   */
  static async deactivateUser(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ isActive: false })
      .where(eq(users.id, userId));
  }
}
