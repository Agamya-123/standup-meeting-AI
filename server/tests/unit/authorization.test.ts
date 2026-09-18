import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  normalizeRole,
  requireRoles,
  requireDepartmentScope,
  requireTeamScope,
  requireUserScope,
} from '../../src/middleware/authorization.js';
import { seedTestCompany } from '../helpers/testDb.js';
import { AuthRequest } from '../../src/middleware/auth.js';
import { Response, NextFunction } from 'express';

const makeResponse = () => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn(),
}) as unknown as Response;

describe('Authorization middleware', () => {
  let seeded: Awaited<ReturnType<typeof seedTestCompany>>;

  beforeEach(async () => {
    seeded = await seedTestCompany();
  });

  it.each([
    [undefined, 'TEAM_MEMBER'],
    ['member', 'TEAM_MEMBER'],
    ['TEAM_MEMBER', 'TEAM_MEMBER'],
    ['manager', 'MANAGER'],
    ['ADMIN', 'ADMIN'],
  ])('normalizes %s to %s', (role, expected) => {
    expect(normalizeRole(role)).toBe(expected);
  });

  it('allows roles supplied to requireRoles', () => {
    const req = { user: { role: 'MANAGER' } } as AuthRequest;
    const res = makeResponse();
    const next = vi.fn() as NextFunction;

    requireRoles('ADMIN', 'MANAGER')(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it('rejects unauthenticated role checks with 401', () => {
    const res = makeResponse();
    const next = vi.fn() as NextFunction;

    requireRoles('ADMIN')({} as AuthRequest, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('prevents a manager from accessing another department', async () => {
    const req = {
      user: seeded.users.managerEng,
      params: { id: seeded.departments.mktDept.id },
      body: {},
      query: {},
    } as unknown as AuthRequest;
    const res = makeResponse();
    const next = vi.fn() as NextFunction;

    await requireDepartmentScope()(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows a manager to access their own department', async () => {
    const req = {
      user: seeded.users.managerEng,
      params: { id: seeded.departments.engDept.id },
      body: {},
      query: {},
    } as unknown as AuthRequest;
    const res = makeResponse();
    const next = vi.fn() as NextFunction;

    await requireDepartmentScope()(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.targetDepartment?.id).toBe(seeded.departments.engDept.id);
  });

  it('prevents a manager from accessing a team outside their department', async () => {
    const req = {
      user: seeded.users.managerEng,
      params: { id: seeded.teams.growthTeam.id },
      body: {},
      query: {},
    } as unknown as AuthRequest;
    const res = makeResponse();
    const next = vi.fn() as NextFunction;

    await requireTeamScope()(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows a team lead to access their own team only', async () => {
    const req = {
      user: seeded.users.teamLead,
      params: { id: seeded.teams.backendTeam.id },
      body: {},
      query: {},
    } as unknown as AuthRequest;
    const res = makeResponse();
    const next = vi.fn() as NextFunction;

    await requireTeamScope()(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.targetTeam?.id).toBe(seeded.teams.backendTeam.id);
  });

  it('prevents managers from managing peers and administrators', async () => {
    const req = {
      user: seeded.users.managerEng,
      params: { id: seeded.users.managerMkt.id },
      body: {},
      query: {},
    } as unknown as AuthRequest;
    const res = makeResponse();
    const next = vi.fn() as NextFunction;

    await requireUserScope()(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows managers to manage a team member within their department', async () => {
    const req = {
      user: seeded.users.managerEng,
      params: { id: seeded.users.member1.id },
      body: {},
      query: {},
    } as unknown as AuthRequest;
    const res = makeResponse();
    const next = vi.fn() as NextFunction;

    await requireUserScope()(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.targetUser?.id).toBe(seeded.users.member1.id);
  });
});
