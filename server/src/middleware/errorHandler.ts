import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/AppError.js';
import { env } from '../config/env.js';

export const errorHandler: ErrorRequestHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // 1. Operational AppError instances
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: 'error',
      statusCode: err.statusCode,
      message: err.message,
    });
    return;
  }

  // 2. Body Parser / JSON Syntax Errors
  if (err instanceof SyntaxError && 'status' in err && (err as any).status === 400 && 'body' in err) {
    res.status(400).json({
      status: 'error',
      statusCode: 400,
      message: 'Invalid JSON payload in request body.',
    });
    return;
  }

  // 3. Zod Schema Validation Errors
  if (err instanceof ZodError) {
    const formattedErrors = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));

    res.status(400).json({
      status: 'error',
      statusCode: 400,
      message: 'Validation failed. Please check your input fields.',
      errors: formattedErrors,
    });
    return;
  }

  // 3. Prisma Database Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint violation (e.g. @@unique([userId, date]), email, slug)
    if (err.code === 'P2002') {
      const target = Array.isArray(err.meta?.target)
        ? err.meta.target.join(', ')
        : (err.meta?.target as string) || 'field';

      res.status(409).json({
        status: 'error',
        statusCode: 409,
        message: `A record with this ${target} already exists.`,
      });
      return;
    }

    // Record not found
    if (err.code === 'P2025') {
      res.status(404).json({
        status: 'error',
        statusCode: 404,
        message: 'The requested resource was not found.',
      });
      return;
    }

    // Foreign key violation
    if (err.code === 'P2003') {
      res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Invalid related entity reference.',
      });
      return;
    }
  }

  // 4. JWT Verification Errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      status: 'error',
      statusCode: 401,
      message: 'Invalid authentication token.',
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      status: 'error',
      statusCode: 401,
      message: 'Authentication token has expired. Please sign in again.',
    });
    return;
  }

  // 5. CORS Rejection
  if (err.message && err.message.startsWith('CORS Error')) {
    res.status(403).json({
      status: 'error',
      statusCode: 403,
      message: 'Access denied: origin not allowed by CORS policy.',
    });
    return;
  }

  // 6. Generic Unhandled Server Errors
  // Always log full error details internally on the server for debugging
  console.error('[UNHANDLED ERROR]', {
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
    errorName: err.name,
    errorMessage: err.message,
    stack: err.stack,
  });

  // In production, never expose internal error messages, stack traces, paths, or prisma queries
  const isProd = env.NODE_ENV === 'production';
  res.status(500).json({
    status: 'error',
    statusCode: 500,
    message: isProd
      ? 'An unexpected internal error occurred. Please try again later.'
      : err.message || 'Internal Server Error',
    ...(isProd ? {} : { stack: err.stack }),
  });
};
