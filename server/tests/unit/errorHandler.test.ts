import { describe, it, expect, vi, afterEach } from 'vitest';
import { z, ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { errorHandler } from '../../src/middleware/errorHandler.js';
import { AppError } from '../../src/utils/AppError.js';
import { Request, Response, NextFunction } from 'express';

const createResponse = () => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn(),
}) as unknown as Response;

const request = {
  originalUrl: '/api/test',
  method: 'POST',
  ip: '127.0.0.1',
} as Request;
const next = vi.fn() as NextFunction;

describe('centralized error handler', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('serializes AppError status and message', () => {
    const res = createResponse();

    errorHandler(new AppError('Not permitted', 403), request, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      statusCode: 403,
      message: 'Not permitted',
    });
  });

  it('formats Zod validation errors with field details', () => {
    const result = z.object({ email: z.string().email() }).safeParse({ email: 'bad' });
    if (result.success) throw new Error('Expected invalid schema result');
    const res = createResponse();

    errorHandler(result.error, request, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        errors: [expect.objectContaining({ field: 'email' })],
      })
    );
  });

  it.each([
    ['P2002', 409, 'already exists'],
    ['P2025', 404, 'not found'],
    ['P2003', 400, 'Invalid related entity reference'],
  ])('maps Prisma %s to the intended response', (code, status, message) => {
    const error = new Prisma.PrismaClientKnownRequestError('Database error', {
      code,
      clientVersion: '5.22.0',
      meta: { target: ['email'] },
    });
    const res = createResponse();

    errorHandler(error, request, res, next);

    expect(res.status).toHaveBeenCalledWith(status);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining(message) }));
  });

  it('maps JWT verification errors to an authentication response', () => {
    const res = createResponse();
    const err = Object.assign(new Error('bad token'), { name: 'JsonWebTokenError' });

    errorHandler(err, request, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Invalid authentication token.' }));
  });

  it('maps CORS rejection errors to 403', () => {
    const res = createResponse();

    errorHandler(new Error('CORS Error: rejected'), request, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it('does not expose the original error message when NODE_ENV is production', async () => {
    vi.resetModules();
    process.env.NODE_ENV = 'production';
    const productionModule = await import('../../src/middleware/errorHandler.js');
    const res = createResponse();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    productionModule.errorHandler(
      new Error('Prisma query leaked at C:\\server\\internal.ts'),
      request,
      res,
      next
    );

    expect(res.status).toHaveBeenCalledWith(500);
    const payload = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(payload.message).not.toContain('Prisma');
    expect(payload.stack).toBeUndefined();

    process.env.NODE_ENV = 'test';
  });
});
