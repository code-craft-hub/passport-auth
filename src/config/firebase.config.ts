import { envConfig } from './env.config';

export const firebaseConfig = {
  projectId: envConfig.FIREBASE_PROJECT_ID,
  credentialsPath: envConfig.FIREBASE_CREDENTIALS_PATH,
};