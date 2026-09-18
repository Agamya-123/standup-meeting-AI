import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../../src/index.js';
import { cleanTestDb, seedTestCompany } from '../helpers/testDb.js';

describe('RBAC and IDOR security regressions', () => {
  beforeEach(async () => {
    await cleanTestDb();
  });

  it('blocks a team member from creating a department (vertical privilege escalation)', async () => {
    const seeded = await seedTestCompany();

    const response = await request(app)
      .post('/api/departments')
      .set('Authorization', `Bearer ${seeded.tokens.member1}`)
      .send({ name: 'Unauthorized Department' });

    expect(response.status).toBe(403);
  });

  it('blocks a team member from creating employees', async () => {
    const seeded = await seedTestCompany();

    const response = await request(app)
      .post('/api/auth/employees')
      .set('Authorization', `Bearer ${seeded.tokens.member1}`)
      .send({
        name: 'Unauthorized New User',
        email: 'unauthorized@acme.com',
        password: 'strong-test-password',
      });

    expect(response.status).toBe(403);
  });

  it('blocks a manager from updating an employee outside their department (horizontal IDOR)', async () => {
    const seeded = await seedTestCompany();

    const response = await request(app)
      .patch(`/api/auth/employees/${seeded.users.member2.id}`)
      .set('Authorization', `Bearer ${seeded.tokens.managerEng}`)
      .send({ name: 'Attempted Unauthorized Update' });

    expect(response.status).toBe(403);
  });

  it('blocks a manager from moving their member into another department', async () => {
    const seeded = await seedTestCompany();

    const response = await request(app)
      .patch(`/api/auth/employees/${seeded.users.member1.id}`)
      .set('Authorization', `Bearer ${seeded.tokens.managerEng}`)
      .send({ departmentId: seeded.departments.mktDept.id });

    expect(response.status).toBe(403);
  });

  it('blocks a team lead from mutating a different team', async () => {
    const seeded = await seedTestCompany();

    const response = await request(app)
      .delete(`/api/teams/${seeded.teams.growthTeam.id}/members/${seeded.users.member2.id}`)
      .set('Authorization', `Bearer ${seeded.tokens.teamLead}`);

    expect(response.status).toBe(403);
  });

  it('does not permit a malformed target identifier to bypass authorization', async () => {
    const seeded = await seedTestCompany();

    const response = await request(app)
      .patch('/api/auth/employees/not-a-uuid')
      .set('Authorization', `Bearer ${seeded.tokens.managerEng}`)
      .send({ name: 'Malformed Id' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(expect.objectContaining({ status: 'error' }));
  });
});
