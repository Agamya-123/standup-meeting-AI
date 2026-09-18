import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../src/index.js';
import { prisma, initSqlitePragmas } from '../../src/config/prisma.js';

describe('health and observability endpoints', () => {
  it('GET /api/health/live returns HTTP 200 with process status and uptime', async () => {
    const response = await request(app).get('/api/health/live');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        status: 'ok',
        service: 'Intelligent Daily Standup API',
      })
    );
    expect(typeof response.body.uptime).toBe('number');
    expect(response.body.timestamp).toBeDefined();
    expect(response.headers['x-request-id']).toBeDefined();
  });

  it('GET /api/health returns HTTP 200 and database: connected when database is ready', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        status: 'ok',
        service: 'Intelligent Daily Standup API',
        database: 'connected',
      })
    );
    expect(response.headers['x-request-id']).toBeDefined();
  });

  it('GET /api/health returns HTTP 503 and database: disconnected when database query fails', async () => {
    const originalQueryRaw = prisma.$queryRawUnsafe;
    // Mock queryRawUnsafe to simulate database downtime
    (prisma as any).$queryRawUnsafe = vi.fn().mockRejectedValue(new Error('Connection terminated'));

    try {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(503);
      expect(response.body).toEqual(
        expect.objectContaining({
          status: 'degraded',
          service: 'Intelligent Daily Standup API',
          database: 'disconnected',
        })
      );
    } finally {
      (prisma as any).$queryRawUnsafe = originalQueryRaw;
    }
  });

  it('initSqlitePragmas returns correct SQLite WAL mode and configuration', async () => {
    const pragmas = await initSqlitePragmas(prisma);

    expect(pragmas.journal_mode.toLowerCase()).toBe('wal');
    expect(pragmas.busy_timeout).toBe(5000);
    expect(pragmas.synchronous).toBe(1); // NORMAL
    expect(pragmas.foreign_keys).toBe(1); // ON
  });
});
