import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { corsOptions } from './config/cors.js';
import { apiRateLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import { prisma, initSqlitePragmas } from './config/prisma.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { requestLogger } from './middleware/requestLogger.js';

import authRoutes from './routes/authRoutes.js';
import standupRoutes from './routes/standupRoutes.js';
import managerRoutes from './routes/managerRoutes.js';
import teamRoutes from './routes/teamRoutes.js';
import departmentRoutes from './routes/departmentRoutes.js';
import hierarchyRoutes from './routes/hierarchyRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

const app = express();
const PORT = env.PORT;

// Trust reverse proxy (X-Forwarded-For) for rate limiting & IP extraction
app.set('trust proxy', 1);

// Request Tracing & Structured Logging
app.use(requestIdMiddleware);
app.use(requestLogger);

// Security Middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));

// Liveness Probe (Lightweight process check, returns 200 without DB query)
app.get('/api/health/live', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'Intelligent Daily Standup API',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Readiness Probe (Deep database connectivity check)
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRawUnsafe('SELECT 1');
    res.json({
      status: 'ok',
      service: 'Intelligent Daily Standup API',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'degraded',
      service: 'Intelligent Daily Standup API',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
    });
  }
});

// Apply rate limiting to all /api routes
app.use('/api', apiRateLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/hierarchy', hierarchyRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/standups', standupRoutes);
app.use('/api/manager', managerRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/notifications', notificationRoutes);

// Centralized Production Error Handler
app.use(errorHandler);

export { app };

if (process.env.NODE_ENV !== 'test') {
  // Initialize SQLite Pragmas on startup (WAL mode, busy_timeout, foreign_keys, synchronous)
  initSqlitePragmas()
    .then((pragmas) => {
      console.log('✅ SQLite PRAGMAs initialized successfully:', JSON.stringify(pragmas));
    })
    .catch((err) => {
      console.error('⚠️ SQLite PRAGMA initialization warning:', err.message);
    });

  const server = app.listen(PORT, () => {
    console.log(`🚀 Intelligent Standup Server running on http://localhost:${PORT}`);
  });

  // Keep-alive & header timeouts configured for reverse proxy alignment (65s / 66s / 30s)
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
  server.requestTimeout = 30000;

  // Graceful Shutdown Handler
  const gracefulShutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

    // Set a force exit timeout in case connections stall
    const forceExitTimer = setTimeout(() => {
      console.error('⚠️ Graceful shutdown timed out (10s). Forcing termination.');
      process.exit(1);
    }, 10000);
    forceExitTimer.unref();

    try {
      if (server) {
        await new Promise<void>((resolve, reject) => {
          server.close((err?: Error) => {
            if (err) return reject(err);
            console.log('✅ HTTP server closed. No longer accepting new connections.');
            resolve();
          });
        });
      }

      await prisma.$disconnect();
      console.log('✅ Database connections disconnected cleanly.');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during graceful shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Process-level uncaught error prevention
  process.on('uncaughtException', (error: Error) => {
    console.error('💥 FATAL: Uncaught Exception:', error.message, error.stack);
    gracefulShutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason: any) => {
    console.error('💥 FATAL: Unhandled Promise Rejection:', reason);
    gracefulShutdown('unhandledRejection');
  });
}
