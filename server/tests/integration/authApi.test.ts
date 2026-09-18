import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../../src/index.js';
import { cleanTestDb, seedTestCompany, prisma } from '../helpers/testDb.js';

describe('Authentication API integration', () => {
  beforeEach(async () => {
    await cleanTestDb();
  });

  it('registers a company workspace and its administrator', async () => {
    const response = await request(app).post('/api/auth/register-company').send({
      companyName: 'New Test Company',
      companySlug: 'new-test-company',
      adminName: 'New Administrator',
      adminEmail: 'new-admin@example.com',
      password: 'a-strong-test-password',
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(expect.objectContaining({ token: expect.any(String) }));
    expect(response.body.user).toEqual(expect.objectContaining({ role: 'ADMIN' }));
    await expect(prisma.company.findUniqueOrThrow({ where: { slug: 'new-test-company' } })).resolves.toBeDefined();
  });

  it('returns structured 400 validation errors for incomplete registration', async () => {
    const response = await request(app).post('/api/auth/register-company').send({ companyName: 'x' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(expect.objectContaining({ status: 'error', errors: expect.any(Array) }));
  });

  it('logs in an existing active user and returns a token', async () => {
    const seeded = await seedTestCompany();

    const response = await request(app).post('/api/auth/login').send({
      identifier: seeded.users.member1.email,
      password: 'password123',
      companyId: seeded.company.id,
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({ token: expect.any(String) }));
    expect(response.body.user).toEqual(expect.objectContaining({ id: seeded.users.member1.id }));
  });

  it('does not log in when the password is invalid', async () => {
    const seeded = await seedTestCompany();

    const response = await request(app).post('/api/auth/login').send({
      identifier: seeded.users.member1.email,
      password: 'wrong-password',
      companyId: seeded.company.id,
    });

    expect(response.status).toBe(401);
    expect(response.body.message).toMatch(/invalid/i);
  });

  it('returns the authenticated profile from /me', async () => {
    const seeded = await seedTestCompany();

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${seeded.tokens.member1}`);

    expect(response.status).toBe(200);
    expect(response.body.user).toEqual(expect.objectContaining({ id: seeded.users.member1.id }));
  });

  it('rejects unauthenticated access to /me', async () => {
    const response = await request(app).get('/api/auth/me');

    expect(response.status).toBe(401);
  });

  it('allows an admin to create an employee in its company hierarchy', async () => {
    const seeded = await seedTestCompany();

    const response = await request(app)
      .post('/api/auth/employees')
      .set('Authorization', `Bearer ${seeded.tokens.admin}`)
      .send({
        name: 'New Engineering Member',
        email: 'new.member@acme.com',
        password: 'another-strong-password',
        role: 'TEAM_MEMBER',
        departmentId: seeded.departments.engDept.id,
        teamId: seeded.teams.backendTeam.id,
      });

    expect(response.status).toBe(201);
    expect(response.body.employee).toEqual(
      expect.objectContaining({ email: 'new.member@acme.com', role: 'TEAM_MEMBER' })
    );
  });

  it('prevents a manager from creating staff in another department', async () => {
    const seeded = await seedTestCompany();

    const response = await request(app)
      .post('/api/auth/employees')
      .set('Authorization', `Bearer ${seeded.tokens.managerEng}`)
      .send({
        name: 'Cross Department Member',
        email: 'cross.dept@acme.com',
        password: 'another-strong-password',
        role: 'TEAM_MEMBER',
        departmentId: seeded.departments.mktDept.id,
      });

    expect(response.status).toBe(403);
  });

  it('updates a staff member assignment when invoked by the admin', async () => {
    const seeded = await seedTestCompany();

    const response = await request(app)
      .patch(`/api/auth/employees/${seeded.users.member1.id}`)
      .set('Authorization', `Bearer ${seeded.tokens.admin}`)
      .send({
        departmentId: seeded.departments.mktDept.id,
        teamId: seeded.teams.growthTeam.id,
      });

    expect(response.status).toBe(200);
    expect(response.body.employee).toEqual(
      expect.objectContaining({
        id: seeded.users.member1.id,
        departmentId: seeded.departments.mktDept.id,
        teamId: seeded.teams.growthTeam.id,
      })
    );
  });
});
