import express, { Application } from 'express';
import { env } from './config/env';
import { logger } from './utils/logger';
import passport from './config/passport-google';
import './config/passport-jwt'; // Initialize JWT strategy
import {
  errorHandler,
  notFoundHandler,
} from './middleware/error.middleware';
import {
  securityHeaders,
  corsOptions,
  sanitizeXSS,
} from './middleware/security.middleware';
import { apiLimiter } from './middleware/rate-limit.middleware';
import apiRouter from './routes';

const app: Application = express();

// ============================================================================
// SECURITY MIDDLEWARE (Applied first)
// ============================================================================

// Set security HTTP headers
app.use(securityHeaders);

// Enable CORS
app.use(corsOptions);

// Body parser
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));


// Rate limiting
app.use('/api', apiLimiter);

// Initialize Passport
app.use(passport.initialize());

// ============================================================================
// ROUTES
// ============================================================================

// API routes
app.use('/api', apiRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Enterprise Authentication API',
    version: '1.0.0',
    docs: '/api/docs',
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ============================================================================
// SERVER STARTUP
// ============================================================================

const PORT = parseInt(env.PORT) || 3000;

const server = app.listen(PORT, () => {
  logger.info(`Server running in ${env.NODE_ENV} mode on port ${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('unhandledRejection', (err: Error) => {
  logger.error('Unhandled Rejection', { error: err.message, stack: err.stack });
  server.close(() => {
    process.exit(1);
  });
});

export default app;
// ============================================================================
// 7. PROJECT STRUCTURE
// ============================================================================

/*
project-root/
├── src/
│   ├── config/
│   │   ├── env.ts                    # Environment configuration
│   │   ├── passport-jwt.ts           # JWT Passport strategy
│   │   └── passport-google.ts        # Google OAuth strategy
│   ├── db/
│   │   ├── schema.ts                 # Drizzle schema definitions
│   │   └── connection.ts             # Database connection
│   ├── types/
│   │   └── auth.types.ts             # TypeScript types & DTOs
│   ├── utils/
│   │   ├── logger.ts                 # Winston logger
│   │   └── errors.ts                 # Custom error classes
│   ├── services/
│   │   ├── auth.service.ts           # Authentication logic
│   │   ├── user.service.ts           # User management
│   │   ├── token.service.ts          # JWT operations
│   │   ├── password.service.ts       # Password hashing
│   │   └── audit.service.ts          # Audit logging
│   ├── middleware/
│   │   ├── auth.middleware.ts        # Authentication/authorization
│   │   ├── validation.middleware.ts  # Request validation
│   │   ├── error.middleware.ts       # Error handling
│   │   ├── rate-limit.middleware.ts  # Rate limiting
│   │   └── security.middleware.ts    # Security headers
│   ├── controllers/
│   │   ├── auth.controller.ts        # Auth endpoints
│   │   ├── user.controller.ts        # User endpoints
│   │   └── health.controller.ts      # Health check
│   ├── routes/
│   │   ├── auth.routes.ts            # Auth routes
│   │   ├── user.routes.ts            # User routes
│   │   ├── health.routes.ts          # Health routes
│   │   └── index.ts                  # Route aggregator
│   └── server.ts                     # Application entry
├── scripts/
│   └── migrate.ts                    # Migration runner
├── drizzle/
│   └── migrations/                   # Generated migrations
├── logs/                             # Application logs
├── .env                              # Environment variables
├── .env.example                      # Environment template
├── drizzle.config.ts                 # Drizzle configuration
├── tsconfig.json                     # TypeScript config
└── package.json                      # Dependencies
*/

// ============================================================================
// 8. SETUP INSTRUCTIONS
// ============================================================================

/*
SETUP GUIDE:

1. Install Dependencies:
   npm install

2. Database Setup:
   - Create PostgreSQL database
   - Update DATABASE_URL in .env

3. Generate Secrets:
   openssl rand -base64 32  # Run twice for access & refresh secrets

4. Google OAuth Setup:
   - Go to Google Cloud Console
   - Create OAuth 2.0 credentials
   - Add callback URL: http://localhost:3000/api/auth/google/callback
   - Copy Client ID and Secret to .env

5. Generate Database Schema:
   npm run migrate:generate

6. Run Migrations:
   npm run migrate:run

7. Start Development Server:
   npm run dev

8. Production Build:
   npm run build
   npm start

SECURITY CHECKLIST:
✅ JWT tokens with secure secrets
✅ Password hashing with bcrypt
✅ Refresh token rotation
✅ Rate limiting on auth endpoints
✅ XSS protection
✅ NoSQL injection protection
✅ CORS configuration
✅ Security headers (Helmet)
✅ Audit logging
✅ Input validation (Zod)
✅ Role-based access control
✅ Secure session management
✅ OAuth 2.0 integration
✅ Error handling without leaking info
✅ HTTPS enforcement (production)

TESTING ENDPOINTS:

1. Register:
   POST /api/auth/register
   Body: { "email": "user@example.com", "password": "SecurePass123!" }

2. Login:
   POST /api/auth/login
   Body: { "email": "user@example.com", "password": "SecurePass123!" }

3. Refresh Token:
   POST /api/auth/refresh
   Body: { "refreshToken": "your-refresh-token" }

4. Get Current User:
   GET /api/auth/me
   Headers: { "Authorization": "Bearer your-access-token" }

5. Google OAuth:
   GET /api/auth/google (redirects to Google)
   GET /api/auth/google/callback (callback handler)

6. Logout:
   POST /api/auth/logout
   Body: { "refreshToken": "your-refresh-token" }
   Headers: { "Authorization": "Bearer your-access-token" }
*/