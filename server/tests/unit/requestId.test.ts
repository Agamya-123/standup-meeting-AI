import { describe, it, expect, vi } from 'vitest';
import { requestIdMiddleware } from '../../src/middleware/requestId.js';
import { Request, Response, NextFunction } from 'express';

describe('requestIdMiddleware', () => {
  it('assigns a new UUID when no X-Request-Id header is provided', () => {
    const req = { headers: {} } as Request;
    const res = { setHeader: vi.fn() } as unknown as Response;
    const next = vi.fn() as NextFunction;

    requestIdMiddleware(req, res, next);

    expect(req.id).toBeDefined();
    expect(req.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', req.id);
    expect(next).toHaveBeenCalled();
  });

  it('preserves and sanitizes a valid incoming X-Request-Id header', () => {
    const incomingId = 'client-custom-trace-id-12345';
    const req = { headers: { 'x-request-id': incomingId } } as unknown as Request;
    const res = { setHeader: vi.fn() } as unknown as Response;
    const next = vi.fn() as NextFunction;

    requestIdMiddleware(req, res, next);

    expect(req.id).toBe(incomingId);
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', incomingId);
    expect(next).toHaveBeenCalled();
  });

  it('rejects an invalid incoming X-Request-Id (e.g. special characters/XSS attempts) and generates a fresh UUID', () => {
    const maliciousId = '<script>alert(1)</script>';
    const req = { headers: { 'x-request-id': maliciousId } } as unknown as Request;
    const res = { setHeader: vi.fn() } as unknown as Response;
    const next = vi.fn() as NextFunction;

    requestIdMiddleware(req, res, next);

    expect(req.id).not.toBe(maliciousId);
    expect(req.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', req.id);
    expect(next).toHaveBeenCalled();
  });
});
