import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

// Regex to validate client-provided request IDs (alphanumeric, hyphens, underscores; max 64 chars)
const SAFE_REQUEST_ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;

/**
 * Middleware that assigns or validates a unique Request ID (Correlation ID)
 * for end-to-end request tracing and structured logging.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incomingId = req.headers['x-request-id'];

  let id: string;
  if (typeof incomingId === 'string' && SAFE_REQUEST_ID_REGEX.test(incomingId)) {
    id = incomingId;
  } else {
    id = randomUUID();
  }

  req.id = id;
  res.setHeader('X-Request-Id', id);
  next();
}
