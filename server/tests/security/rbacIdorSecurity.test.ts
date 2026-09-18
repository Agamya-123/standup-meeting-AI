import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../../src/index.js';
import { cleanTestDb, createAuthToken, prisma, seedTestCompany } from '../helpers/testDb.js';

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

  it('keeps an administrator visible after changing them to a team lead', async () => {
    const seeded = await seedTestCompany();

    const updateResponse = await request(app)
      .patch(`/api/auth/employees/${seeded.users.admin.id}`)
      .set('Authorization', `Bearer ${seeded.tokens.admin}`)
      .send({
        role: 'TEAM_LEAD',
        departmentId: seeded.departments.engDept.id,
        teamId: seeded.teams.backendTeam.id,
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.employee).toEqual(expect.objectContaining({
      role: 'TEAM_LEAD',
      departmentId: seeded.departments.engDept.id,
      teamId: seeded.teams.backendTeam.id,
    }));

    const freshLeadToken = createAuthToken({
      ...seeded.users.admin,
      role: 'TEAM_LEAD',
      departmentId: seeded.departments.engDept.id,
      teamId: seeded.teams.backendTeam.id,
    });
    const rosterResponse = await request(app)
      .get('/api/auth/employees')
      .set('Authorization', `Bearer ${freshLeadToken}`);
    const teamsResponse = await request(app)
      .get('/api/teams')
      .set('Authorization', `Bearer ${freshLeadToken}`);

    expect(rosterResponse.status).toBe(200);
    expect(rosterResponse.body.employees.map((employee: any) => employee.id)).toContain(seeded.users.admin.id);
    expect(teamsResponse.status).toBe(200);
    expect(teamsResponse.body.teams.map((team: any) => team.id)).toContain(seeded.teams.backendTeam.id);
  });

  it('does not transfer designated lead ownership during a name-only edit', async () => {
    const seeded = await seedTestCompany();

    const response = await request(app)
      .patch(`/api/auth/employees/${seeded.users.teamLead.id}`)
      .set('Authorization', `Bearer ${seeded.tokens.admin}`)
      .send({ name: 'Updated Lead Name' });

    expect(response.status).toBe(200);
    const team = await prisma.team.findUniqueOrThrow({
      where: { id: seeded.teams.backendTeam.id },
      select: { teamLeadId: true }
    });
    expect(team.teamLeadId).toBe(seeded.users.teamLead.id);
  });
});
