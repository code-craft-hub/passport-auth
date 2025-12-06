
import { Strategy as GoogleStrategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { logger } from '../utils/logger';
import passport from 'passport';
import { env } from './env';

const googleOptions = {
  clientID: env.GOOGLE_CLIENT_ID,
  clientSecret: env.GOOGLE_CLIENT_SECRET,
  callbackURL: env.GOOGLE_CALLBACK_URL,
  scope: ['profile', 'email'],
};

passport.use(
  'google',
  new GoogleStrategy(
    googleOptions,
    async (
      accessToken: string,
      refreshToken: string,
      profile: Profile,
      done: VerifyCallback
    ) => {
      try {
        // Extract user info from Google profile
        const email = profile.emails?.[0]?.value;
        const firstName = profile.name?.givenName;
        const lastName = profile.name?.familyName;

        if (!email) {
          return done(new Error('No email found in Google profile'), undefined);
        }

        // Return profile data (will be handled in controller)
        return done(null, {
          provider: "google" as const,
          providerId: profile.id,
          email,
          firstName,
          lastName,
          accessToken,
          refreshToken,
        });
      } catch (error) {
        logger.error('Google OAuth error', { error });
        return done(error as Error, undefined);
      }
    }
  )
);

// Serialize/deserialize user (required by Passport)
passport.serializeUser((user: any, done) => {
  done(null, user);
});

passport.deserializeUser((user: any, done) => {
  done(null, user);
});

export default passport;
