import { describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createAuthRateLimiter, createGeneralApiRateLimiter } from '../../src/middleware/rateLimiter.js';

describe('Rate Limiting Security Enforcement', () => {
  it('enforces 30-request threshold and returns HTTP 429 on the 31st request', async () => {
    const app = express();
    app.use(express.json());
    // Create an instance of the auth rate limiter without skipping in test mode
    app.use(
      '/api/auth/test-limit',
      createAuthRateLimiter({
        max: 30,
        skip: () => false,
      }),
      (_req, res) => {
        res.status(200).json({ ok: true });
      }
    );

    // Send 30 successful requests
    for (let i = 1; i <= 30; i++) {
      const res = await request(app).post('/api/auth/test-limit').send({ test: i });
      expect(res.status).toBe(200);
      expect(res.headers['ratelimit-limit']).toBe('30');
      expect(Number(res.headers['ratelimit-remaining'])).toBe(30 - i);
    }

    // 31st request must trigger HTTP 429
    const blockedRes = await request(app).post('/api/auth/test-limit').send({ test: 31 });
    expect(blockedRes.status).toBe(429);
    expect(blockedRes.body).toEqual({
      status: 429,
      message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
    });
    expect(blockedRes.headers['ratelimit-remaining']).toBe('0');
  });

  it('provides standard RateLimit headers and blocks after general API limit is reached', async () => {
    const app = express();
    app.use(express.json());
    // General API rate limiter with smaller limit for testing standard behavior
    app.use(
      '/api/general-test',
      createGeneralApiRateLimiter({
        max: 5,
        skip: () => false,
      }),
      (_req, res) => {
        res.status(200).json({ ok: true });
      }
    );

    for (let i = 1; i <= 5; i++) {
      const res = await request(app).get('/api/general-test');
      expect(res.status).toBe(200);
      expect(res.headers['ratelimit-limit']).toBe('5');
    }

    const blockedRes = await request(app).get('/api/general-test');
    expect(blockedRes.status).toBe(429);
    expect(blockedRes.body).toEqual({
      status: 429,
      message: 'Too many API requests. Please slow down and try again later.',
    });
  });
});
