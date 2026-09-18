import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/index.js';
import { cleanTestDb, seedTestCompany } from '../helpers/testDb.js';
import { env } from '../../src/config/env.js';

describe('security regression coverage', () => {
  beforeEach(async () => {
    await cleanTestDb();
  });

  it('rejects expired JWTs', async () => {
    const seeded = await seedTestCompany();
    const token = jwt.sign({ id: seeded.users.member1.id }, env.JWT_SECRET, { expiresIn: '-1s' });

    const response = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
  });

  it('rejects a token signed with another secret', async () => {
    const seeded = await seedTestCompany();
    const token = jwt.sign({ id: seeded.users.member1.id }, 'wrong-secret-that-is-not-valid', { expiresIn: '1h' });

    const response = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
  });

  it('emits CORS headers for an allowed frontend origin', async () => {
    const response = await request(app).get('/api/health').set('Origin', 'http://localhost:5173');

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('rejects a disallowed browser origin', async () => {
    const response = await request(app).get('/api/health').set('Origin', 'https://malicious.example');

    expect(response.status).toBe(403);
    expect(response.body).toEqual(
      expect.objectContaining({ message: 'Access denied: origin not allowed by CORS policy.' })
    );
  });

  it('adds Helmet security headers', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
  });

  it('does not include rate limit headers in test mode because test requests are exempt', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.headers['ratelimit-limit']).toBeUndefined();
  });
});
