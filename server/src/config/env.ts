import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables before validation
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test', 'e2e']).default('development'),
  PORT: z
    .string()
    .default('5000')
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val > 0 && val <= 65535, {
      message: 'PORT must be a valid port number between 1 and 65535',
    }),
  DATABASE_URL: z.string().min(1, { message: 'DATABASE_URL is required.' }),
  JWT_SECRET: z.string().min(1, { message: 'JWT_SECRET is required and cannot be empty.' }),
  ALLOWED_ORIGINS: z.string().optional(),
  CORS_ORIGIN: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.NODE_ENV === 'production') {
    if (data.JWT_SECRET.length < 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_SECRET'],
        message: 'JWT_SECRET must be at least 32 characters in production for cryptographic safety.',
      });
    }

    const origins = data.ALLOWED_ORIGINS || data.CORS_ORIGIN;
    if (origins && origins.trim() === '*') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ALLOWED_ORIGINS'],
        message: 'Wildcard CORS (ALLOWED_ORIGINS=*) is forbidden in production with credentials.',
      });
    }
  }
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ FATAL: Invalid environment configuration:');
  parsed.error.issues.forEach((issue) => {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1);
}

export const env = parsed.data;

export const parseAllowedOrigins = (): string[] => {
  const custom = env.ALLOWED_ORIGINS || env.CORS_ORIGIN;
  if (custom) {
    return custom
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  if (env.NODE_ENV === 'production') {
    return [];
  }

  // Sensible development defaults
  return [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:4173',
    'http://127.0.0.1:4173',
  ];
};
