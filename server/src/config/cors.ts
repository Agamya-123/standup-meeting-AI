import { CorsOptions } from 'cors';
import { env, parseAllowedOrigins } from './env.js';

const allowedOrigins = parseAllowedOrigins();

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. mobile apps, curl, server-to-server health checks) with no origin
    if (!origin) {
      return callback(null, true);
    }

    if (env.NODE_ENV !== 'production') {
      // In development, allow localhost origins
      if (
        allowedOrigins.includes(origin) ||
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      ) {
        return callback(null, true);
      }
    } else {
      // In production, strictly match configured allowlist
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
    }

    // Reject unknown origins
    const error = new Error(`CORS Error: Origin '${origin}' is not permitted by CORS policy.`);
    return callback(error, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400, // 24 hours preflight cache
};
