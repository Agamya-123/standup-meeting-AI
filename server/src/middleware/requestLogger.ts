import { Request, Response, NextFunction } from 'express';

interface StructuredLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  requestId: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  ip: string;
}

/**
 * Lightweight structured JSON HTTP access logging middleware.
 * Captures request metadata and timing upon completion while strictly
 * excluding credentials, tokens, and sensitive body payloads.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  // Skip excessive noise on automated liveness health checks if healthy
  if (req.path === '/api/health/live' && process.env.NODE_ENV === 'production') {
    return next();
  }

  const startTime = process.hrtime.bigint();

  res.on('finish', () => {
    // Suppress logs in unit/integration test environment unless explicitly debugged
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    const endTime = process.hrtime.bigint();
    const durationMs = Number((endTime - startTime) / 1000000n);

    let level: 'info' | 'warn' | 'error' = 'info';
    if (res.statusCode >= 500) {
      level = 'error';
    } else if (res.statusCode >= 400) {
      level = 'warn';
    }

    const logEntry: StructuredLog = {
      timestamp: new Date().toISOString(),
      level,
      requestId: req.id || 'unknown',
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      durationMs,
      ip: req.ip || req.socket.remoteAddress || 'unknown',
    };

    if (level === 'error') {
      console.error(JSON.stringify(logEntry));
    } else if (level === 'warn') {
      console.warn(JSON.stringify(logEntry));
    } else {
      console.log(JSON.stringify(logEntry));
    }
  });

  next();
}
