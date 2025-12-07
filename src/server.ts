import express, { Application } from "express";
import { env } from "./config/env";
import { logger } from "./utils/logger";
import passport from "./config/passport-google";
import "./config/passport-jwt";
import { Queue } from "bullmq";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";
import { securityHeaders, corsOptions } from "./middleware/security.middleware";
import { apiLimiter } from "./middleware/rate-limit.middleware";
import { v4 as uuidv4 } from "uuid";
import apiRouter from "./routes";

const app: Application = express();

export const redisConnection = { host: "localhost", port: 6379 };

const queue = new Queue("imageProcessingQueue", {
  connection: redisConnection,
});

app.use(securityHeaders);
app.use(corsOptions);
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

app.post("/queue", async (req, res) => {
  try {
    await queue.add(
      "processing",
      {
        task: req.body.taskName,
        userId: req.body.userId,
        fileName: `${uuidv4()}.mp4`,
      },
      { priority: req.body.priority || 1 }
    );
    res.status(200).json({ message: "Task added to the queue" });
  } catch (error) {
    console.error("Error adding task to the queue:", error);
    res.status(500).json({ message: "Failed to add task to the queue" });
  }
});

app.use("/api", apiLimiter);
app.use(passport.initialize());

app.use("/api", apiRouter);

app.get("/", (_req, res) => {
  res.json({
    message: "Enterprise Authentication API",
    version: "1.0.0",
    docs: "/api/docs",
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = parseInt(env.PORT) || 3000;

const server = app.listen(PORT, () => {
  logger.info(`Server running in ${env.NODE_ENV} mode on port ${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/api/health`);
});

process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  server.close(() => {
    logger.info("Process terminated");
    process.exit(0);
  });
});

process.on("unhandledRejection", (err: Error) => {
  logger.error("Unhandled Rejection", { error: err.message, stack: err.stack });
  server.close(() => {
    process.exit(1);
  });
});

export default app;

// 1. Register:
//    POST /api/auth/register
//    Body: { "email": "user@example.com", "password": "SecurePass123!" }

// 2. Login:
//    POST /api/auth/login
//    Body: { "email": "user@example.com", "password": "SecurePass123!" }

// 3. Refresh Token:
//    POST /api/auth/refresh
//    Body: { "refreshToken": "your-refresh-token" }

// 4. Get Current User:
//    GET /api/auth/me
//    Headers: { "Authorization": "Bearer your-access-token" }

// 5. Google OAuth:
//    GET /api/auth/google (redirects to Google)
//    GET /api/auth/google/callback (callback handler)

// 6. Logout:
//    POST /api/auth/logout
//    Body: { "refreshToken": "your-refresh-token" }
//    Headers: { "Authorization": "Bearer your-access-token" }
// */
