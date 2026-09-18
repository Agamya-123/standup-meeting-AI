import rateLimit, { Options } from 'express-rate-limit';
import { env } from '../config/env.js';

/**
 * Factory for strict auth rate limiter
 */
export const createAuthRateLimiter = (options: Partial<Options> = {}) =>
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30, // 30 requests per 15 minutes per IP
    standardHeaders: true, // Return standard RateLimit-* headers
    legacyHeaders: false, // Disable X-RateLimit-* legacy headers
    message: {
      status: 429,
      message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
    },
    ...options,
  });

/**
 * Strict rate limiter for authentication, registration, and identifier lookup routes.
 * Mitigates brute-force credential stuffing and identifier enumeration.
 */
export const authRateLimiter = createAuthRateLimiter({
  max:
    env.NODE_ENV === 'test' ||
    env.NODE_ENV === 'e2e' ||
    process.env.E2E_DISABLE_RATE_LIMIT === 'true'
      ? 10000
      : 30,
  skip: () =>
    env.NODE_ENV === 'test' ||
    env.NODE_ENV === 'e2e' ||
    process.env.E2E_DISABLE_RATE_LIMIT === 'true',
});

/**
 * Factory for general API rate limiter
 */
export const createGeneralApiRateLimiter = (options: Partial<Options> = {}) =>
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // 500 requests per 15 minutes per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      status: 429,
      message: 'Too many API requests. Please slow down and try again later.',
    },
    ...options,
  });

/**
 * General API rate limiter for standard authenticated application endpoints.
 * Protects against denial-of-service and abusive traffic.
 */
export const generalApiRateLimiter = createGeneralApiRateLimiter({
  max:
    env.NODE_ENV === 'test' ||
    env.NODE_ENV === 'e2e' ||
    process.env.E2E_DISABLE_RATE_LIMIT === 'true'
      ? 50000
      : 500,
  skip: () =>
    env.NODE_ENV === 'test' ||
    env.NODE_ENV === 'e2e' ||
    process.env.E2E_DISABLE_RATE_LIMIT === 'true',
});

export const apiRateLimiter = generalApiRateLimiter;
