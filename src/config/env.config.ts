import dotenv from "dotenv";
import path from "path";

dotenv.config();

interface EnvConfig {
  NODE_ENV: string;
  PORT: number;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_CREDENTIALS_PATH: string;
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD: string;
  CORS_ORIGIN: string;
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  FIREBASE_DATABASE_URL: string;
  FIREBASE_API_KEY: string;
}

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Environment variable ${key} is required`);
  }
  return value;
};

export const envConfig: EnvConfig = {
  NODE_ENV: getEnvVar("NODE_ENV", "production"),
  PORT: parseInt(getEnvVar("PORT", "8080"), 10),
  FIREBASE_PROJECT_ID: getEnvVar("FIREBASE_PROJECT_ID"),
  FIREBASE_DATABASE_URL: getEnvVar("FIREBASE_DATABASE_URL"),
  FIREBASE_API_KEY: getEnvVar("FIREBASE_API_KEY"),
  FIREBASE_CREDENTIALS_PATH: path.resolve(
    process.cwd(),
    getEnvVar("FIREBASE_CREDENTIALS_PATH", "./serviceAccountKey.json")
  ),
  REDIS_HOST: getEnvVar("REDIS_HOST", "localhost"),
  REDIS_PORT: parseInt(getEnvVar("REDIS_PORT", "6379"), 10),
  REDIS_PASSWORD: getEnvVar("REDIS_PASSWORD", ""),
  CORS_ORIGIN: getEnvVar("CORS_ORIGIN", "http://localhost:5173"),
  RATE_LIMIT_WINDOW_MS: parseInt(
    getEnvVar("RATE_LIMIT_WINDOW_MS", "900000"),
    10
  ), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: parseInt(
    getEnvVar("RATE_LIMIT_MAX_REQUESTS", "100"),
    10
  ),
};

export const isDevelopment = envConfig.NODE_ENV === "development";
export const isProduction = envConfig.NODE_ENV === "production";
export const isTest = envConfig.NODE_ENV === "test";
