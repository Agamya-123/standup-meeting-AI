import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { validateBody, validateParams, validateQuery } from '../../src/middleware/validate.js';
import { Request, Response, NextFunction } from 'express';

const response = {} as Response;

describe('Zod validation middleware', () => {
  it('validates and replaces request body with parsed data', async () => {
    const req = { body: { title: '  Standup  ' } } as Request;
    const next = vi.fn() as NextFunction;
    const schema = z.object({ title: z.string().trim().min(1) });

    await validateBody(schema)(req, response, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ title: 'Standup' });
  });

  it('forwards missing required body fields as a Zod error', async () => {
    const req = { body: {} } as Request;
    const next = vi.fn() as NextFunction;
    const schema = z.object({ title: z.string().min(1) });

    await validateBody(schema)(req, response, next);

    expect(next).toHaveBeenCalledWith(expect.any(z.ZodError));
  });

  it('forwards an invalid identifier in URL params', async () => {
    const req = { params: { id: 'not-a-uuid' } } as unknown as Request;
    const next = vi.fn() as NextFunction;
    const schema = z.object({ id: z.string().uuid() });

    await validateParams(schema)(req, response, next);

    expect(next).toHaveBeenCalledWith(expect.any(z.ZodError));
  });

  it('validates and transforms query parameters', async () => {
    const req = { query: { page: '2' } } as unknown as Request;
    const next = vi.fn() as NextFunction;
    const schema = z.object({ page: z.coerce.number().int().positive() });

    await validateQuery(schema)(req, response, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.query).toEqual({ page: 2 });
  });

  it('rejects oversized input fields', async () => {
    const req = { body: { update: 'a'.repeat(501) } } as Request;
    const next = vi.fn() as NextFunction;
    const schema = z.object({ update: z.string().max(500) });

    await validateBody(schema)(req, response, next);

    expect(next).toHaveBeenCalledWith(expect.any(z.ZodError));
  });

  it('rejects invalid enum values', async () => {
    const req = { body: { level: 'EMERGENCY' } } as Request;
    const next = vi.fn() as NextFunction;
    const schema = z.object({ level: z.enum(['NONE', 'MINOR', 'CRITICAL']) });

    await validateBody(schema)(req, response, next);

    expect(next).toHaveBeenCalledWith(expect.any(z.ZodError));
  });
});
