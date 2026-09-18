import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authenticateJWT, requireRole, AuthRequest } from '../../src/middleware/auth.js';
import { seedTestCompany, createAuthToken, prisma } from '../helpers/testDb.js';
import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../src/config/env.js';

describe('Auth Middleware Unit Tests', () => {
  let seeded: Awaited<ReturnType<typeof seedTestCompany>>;

  beforeEach(async () => {
    seeded = await seedTestCompany();
  });

  describe('authenticateJWT', () => {
    it('should return 401 if Authorization header is missing', async () => {
      const req = { headers: {} } as AuthRequest;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn() as NextFunction;

      await authenticateJWT(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('missing') })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if Authorization header does not start with Bearer', async () => {
      const req = {
        headers: { authorization: 'Basic 12345' },
      } as unknown as AuthRequest;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn() as NextFunction;

      await authenticateJWT(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 if token is invalid or corrupted', async () => {
      const req = {
        headers: { authorization: 'Bearer invalid.token.signature' },
      } as unknown as AuthRequest;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn() as NextFunction;

      await authenticateJWT(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('Invalid or expired') })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 if token is expired', async () => {
      const expiredToken = jwt.sign(
        { id: seeded.users.member1.id, email: seeded.users.member1.email },
        env.JWT_SECRET,
        { expiresIn: '-1s' }
      );
      const req = {
        headers: { authorization: `Bearer ${expiredToken}` },
      } as unknown as AuthRequest;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn() as NextFunction;

      await authenticateJWT(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if user from token does not exist in DB', async () => {
      const nonExistentToken = jwt.sign(
        { id: 'non-existent-user-uuid', email: 'ghost@acme.com' },
        env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      const req = {
        headers: { authorization: `Bearer ${nonExistentToken}` },
      } as unknown as AuthRequest;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn() as NextFunction;

      await authenticateJWT(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('no longer exists') })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 if user account is deactivated (isActive: false)', async () => {
      await prisma.user.update({
        where: { id: seeded.users.member1.id },
        data: { isActive: false },
      });

      const token = createAuthToken(seeded.users.member1);
      const req = {
        headers: { authorization: `Bearer ${token}` },
      } as unknown as AuthRequest;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn() as NextFunction;

      await authenticateJWT(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('deactivated') })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should attach user to req and call next() for valid active user token', async () => {
      const token = createAuthToken(seeded.users.member1);
      const req = {
        headers: { authorization: `Bearer ${token}` },
      } as unknown as AuthRequest;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn() as NextFunction;

      await authenticateJWT(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user?.id).toBe(seeded.users.member1.id);
      expect(req.user?.email).toBe(seeded.users.member1.email);
    });
  });

  describe('requireRole', () => {
    it('should return 401 if req.user is missing', () => {
      const req = {} as AuthRequest;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn() as NextFunction;

      const middleware = requireRole(['ADMIN']);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 if user role is not in allowed roles', () => {
      const req = {
        user: { role: 'TEAM_MEMBER' },
      } as unknown as AuthRequest;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn() as NextFunction;

      const middleware = requireRole(['ADMIN', 'MANAGER']);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('Access denied') })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next() if user role matches allowed roles', () => {
      const req = {
        user: { role: 'ADMIN' },
      } as unknown as AuthRequest;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn() as NextFunction;

      const middleware = requireRole(['ADMIN', 'MANAGER']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should normalize MEMBER to TEAM_MEMBER and permit access', () => {
      const req = {
        user: { role: 'MEMBER' },
      } as unknown as AuthRequest;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn() as NextFunction;

      const middleware = requireRole(['TEAM_MEMBER']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
