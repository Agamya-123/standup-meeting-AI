import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../../src/index.js';
import { cleanTestDb, seedTwoCompanies, prisma } from '../helpers/testDb.js';

describe('Two-Company Multi-Tenant Isolation Security Suite', () => {
  beforeEach(async () => {
    await cleanTestDb();
  });

  it('strictly isolates department listings between Company A and Company B', async () => {
    const { companyA, companyB } = await seedTwoCompanies();

    // Company A Admin list departments
    const resA = await request(app)
      .get('/api/departments')
      .set('Authorization', `Bearer ${companyA.tokens.admin}`);

    expect(resA.status).toBe(200);
    const deptIdsA = resA.body.departments.map((d: any) => d.id);
    expect(deptIdsA).toContain(companyA.department.id);
    expect(deptIdsA).not.toContain(companyB.department.id);

    // Company B Admin list departments
    const resB = await request(app)
      .get('/api/departments')
      .set('Authorization', `Bearer ${companyB.tokens.admin}`);

    expect(resB.status).toBe(200);
    const deptIdsB = resB.body.departments.map((d: any) => d.id);
    expect(deptIdsB).toContain(companyB.department.id);
    expect(deptIdsB).not.toContain(companyA.department.id);
  });

  it('blocks cross-tenant department access and mutation (IDOR)', async () => {
    const { companyA, companyB } = await seedTwoCompanies();

    // Admin A attempts to read Department B
    const readRes = await request(app)
      .get(`/api/departments/${companyB.department.id}`)
      .set('Authorization', `Bearer ${companyA.tokens.admin}`);
    expect(readRes.status).toBe(404);

    // Admin A attempts to read Department B hierarchy
    const hierRes = await request(app)
      .get(`/api/departments/${companyB.department.id}/hierarchy`)
      .set('Authorization', `Bearer ${companyA.tokens.admin}`);
    expect(hierRes.status).toBe(404);

    // Admin A attempts to update Department B
    const updateRes = await request(app)
      .put(`/api/departments/${companyB.department.id}`)
      .set('Authorization', `Bearer ${companyA.tokens.admin}`)
      .send({ name: 'Hacked Department Name' });
    expect(updateRes.status).toBe(404);

    // Admin A attempts to delete Department B
    const deleteRes = await request(app)
      .delete(`/api/departments/${companyB.department.id}`)
      .set('Authorization', `Bearer ${companyA.tokens.admin}`);
    expect(deleteRes.status).toBe(404);

    // Verify Department B was not modified in the database
    const freshDeptB = await prisma.department.findUniqueOrThrow({
      where: { id: companyB.department.id },
    });
    expect(freshDeptB.name).toBe('Product B');
    expect(freshDeptB.isActive).toBe(true);
  });

  it('strictly isolates team listings and blocks cross-tenant team mutations', async () => {
    const { companyA, companyB } = await seedTwoCompanies();

    // Company A Admin list teams
    const teamsResA = await request(app)
      .get('/api/teams')
      .set('Authorization', `Bearer ${companyA.tokens.admin}`);
    expect(teamsResA.status).toBe(200);
    const teamIdsA = teamsResA.body.teams.map((t: any) => t.id);
    expect(teamIdsA).toContain(companyA.team.id);
    expect(teamIdsA).not.toContain(companyB.team.id);

    // Admin A attempts to update Team B
    const updateTeamRes = await request(app)
      .put(`/api/teams/${companyB.team.id}`)
      .set('Authorization', `Bearer ${companyA.tokens.admin}`)
      .send({ name: 'Compromised Team Name' });
    expect(updateTeamRes.status).toBe(404);

    // Admin A attempts to delete Team B
    const deleteTeamRes = await request(app)
      .delete(`/api/teams/${companyB.team.id}`)
      .set('Authorization', `Bearer ${companyA.tokens.admin}`);
    expect(deleteTeamRes.status).toBe(404);

    // Admin A attempts to add Member A into Team B
    const addMemberRes = await request(app)
      .post(`/api/teams/${companyB.team.id}/members`)
      .set('Authorization', `Bearer ${companyA.tokens.admin}`)
      .send({ userId: companyA.member.id });
    expect(addMemberRes.status).toBe(404);

    // Admin A attempts to create a team in Department B
    const createTeamRes = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${companyA.tokens.admin}`)
      .send({
        name: 'Injected Cross-Tenant Team',
        departmentId: companyB.department.id,
      });
    expect(createTeamRes.status).toBe(404);
  });

  it('strictly isolates employee records and prevents cross-tenant user assignment', async () => {
    const { companyA, companyB } = await seedTwoCompanies();

    // Admin A gets employee list
    const empResA = await request(app)
      .get('/api/auth/employees')
      .set('Authorization', `Bearer ${companyA.tokens.admin}`);
    expect(empResA.status).toBe(200);
    const empIdsA = empResA.body.employees.map((e: any) => e.id);
    expect(empIdsA).toContain(companyA.member.id);
    expect(empIdsA).not.toContain(companyB.member.id);

    // Admin A attempts to update Member B details
    const updateEmpRes = await request(app)
      .patch(`/api/auth/employees/${companyB.member.id}`)
      .set('Authorization', `Bearer ${companyA.tokens.admin}`)
      .send({ name: 'Cross-Tenant Hijack' });
    expect(updateEmpRes.status).toBe(404);

    // Admin A attempts to assign Member A to Department B
    const assignDeptRes = await request(app)
      .patch(`/api/auth/employees/${companyA.member.id}`)
      .set('Authorization', `Bearer ${companyA.tokens.admin}`)
      .send({ departmentId: companyB.department.id });
    expect(assignDeptRes.status).toBe(404);

    // Admin A attempts to assign Member A to Team B
    const assignTeamRes = await request(app)
      .patch(`/api/auth/employees/${companyA.member.id}`)
      .set('Authorization', `Bearer ${companyA.tokens.admin}`)
      .send({ teamId: companyB.team.id });
    expect(assignTeamRes.status).toBe(404);
  });

  it('blocks cross-tenant standup updates and reactions', async () => {
    const { companyA, companyB } = await seedTwoCompanies();

    // Member A submits a standup in Company A
    const standupRes = await request(app)
      .post('/api/standups')
      .set('Authorization', `Bearer ${companyA.tokens.member}`)
      .send({
        yesterdayUpdates: ['Finished Alpha sprint goals'],
        todayPlans: ['Review Alpha architecture'],
        blockers: ['None'],
        blockerLevel: 'NONE',
      });
    expect(standupRes.status).toBe(201);
    const standupId = standupRes.body.standup.id;

    // Member B in Company B attempts to edit Member A's standup -> 404
    const editRes = await request(app)
      .put(`/api/standups/${standupId}`)
      .set('Authorization', `Bearer ${companyB.tokens.member}`)
      .send({ todayPlans: ['Hijacked Plan'] });
    expect(editRes.status).toBe(404);

    // Admin B in Company B attempts to edit Member A's standup -> 404
    const adminEditRes = await request(app)
      .put(`/api/standups/${standupId}`)
      .set('Authorization', `Bearer ${companyB.tokens.admin}`)
      .send({ todayPlans: ['Admin Hijacked Plan'] });
    expect(adminEditRes.status).toBe(404);

    // Member B in Company B attempts to react to Member A's standup -> 404
    const reactRes = await request(app)
      .post(`/api/standups/${standupId}/react`)
      .set('Authorization', `Bearer ${companyB.tokens.member}`)
      .send({ emoji: '🔥' });
    expect(reactRes.status).toBe(404);

    // Member B in Company B attempts to get reactions for Member A's standup -> 404
    const getReactRes = await request(app)
      .get(`/api/standups/${standupId}/reactions`)
      .set('Authorization', `Bearer ${companyB.tokens.member}`);
    expect(getReactRes.status).toBe(404);
  });

  it('strictly isolates standup read queries (today and my-history)', async () => {
    const { companyA, companyB } = await seedTwoCompanies();

    // Member A submits a standup
    await request(app)
      .post('/api/standups')
      .set('Authorization', `Bearer ${companyA.tokens.member}`)
      .send({
        yesterdayUpdates: ['Company A progress'],
        todayPlans: ['Company A tasks'],
        blockers: ['None'],
        blockerLevel: 'NONE',
      });

    // Member B gets today's standup -> submitted: false
    const todayResB = await request(app)
      .get('/api/standups/today')
      .set('Authorization', `Bearer ${companyB.tokens.member}`);
    expect(todayResB.status).toBe(200);
    expect(todayResB.body.submitted).toBe(false);
    expect(todayResB.body.standup).toBeNull();

    // Member B gets standup history -> empty list
    const historyResB = await request(app)
      .get('/api/standups/my-history')
      .set('Authorization', `Bearer ${companyB.tokens.member}`);
    expect(historyResB.status).toBe(200);
    expect(historyResB.body.history).toEqual([]);

    // Member A gets history -> contains only Company A standup
    const historyResA = await request(app)
      .get('/api/standups/my-history')
      .set('Authorization', `Bearer ${companyA.tokens.member}`);
    expect(historyResA.status).toBe(200);
    expect(historyResA.body.history).toHaveLength(1);
    expect(historyResA.body.history[0].userId).toBe(companyA.member.id);
  });

  it('blocks cross-tenant blocker resolution mutation (IDOR)', async () => {
    const { companyA, companyB } = await seedTwoCompanies();

    // Member A submits a standup with critical blocker
    const standupRes = await request(app)
      .post('/api/standups')
      .set('Authorization', `Bearer ${companyA.tokens.member}`)
      .send({
        yesterdayUpdates: ['Database work'],
        todayPlans: ['API work'],
        blockers: ['Access token expired'],
        blockerLevel: 'CRITICAL',
      });
    expect(standupRes.status).toBe(201);
    const standupId = standupRes.body.standup.id;

    // Manager B in Company B attempts to resolve Company A blocker -> 404
    const resolveResB = await request(app)
      .post(`/api/notifications/resolve-blocker/${standupId}`)
      .set('Authorization', `Bearer ${companyB.tokens.manager}`)
      .send({
        status: 'RESOLVED',
        resolutionNote: 'Cross tenant resolution attempt',
      });
    expect(resolveResB.status).toBe(404);

    // Verify standup in DB was not resolved by Manager B
    const freshStandup = await prisma.dailyStandup.findUniqueOrThrow({
      where: { id: standupId },
    });
    expect(freshStandup.blockerStatus).toBe('OPEN');
    expect(freshStandup.blockerResolvedById).toBeNull();
  });

  it('strictly isolates manager dashboard and AI summary data across tenants', async () => {
    const { companyA, companyB } = await seedTwoCompanies();

    // Member A submits standup in Company A
    await request(app)
      .post('/api/standups')
      .set('Authorization', `Bearer ${companyA.tokens.member}`)
      .send({
        yesterdayUpdates: ['Company A Alpha feature'],
        todayPlans: ['Company A testing'],
        blockers: ['None'],
        blockerLevel: 'NONE',
      });

    // Manager B queries Manager Dashboard for Company B
    const dashResB = await request(app)
      .get('/api/manager/dashboard')
      .set('Authorization', `Bearer ${companyB.tokens.manager}`);
    expect(dashResB.status).toBe(200);
    expect(dashResB.body.stats.submittedCount).toBe(0);
    expect(dashResB.body.teamMembersFeed.every((f: any) => f.user.companyId === companyB.company.id || f.user.id === companyB.member.id)).toBe(true);

    // Member B queries Manager Dashboard with Company A team ID -> does not leak team metadata
    const filteredDashResB = await request(app)
      .get(`/api/manager/dashboard?teamId=${companyA.team.id}`)
      .set('Authorization', `Bearer ${companyB.tokens.member}`);
    expect(filteredDashResB.status).toBe(200);
    expect(filteredDashResB.body.restricted).toBe(true);
    expect(filteredDashResB.body.team).toBeNull();

    // Admin B queries AI summary -> should not include Company A standup text
    const aiResB = await request(app)
      .get('/api/ai/summary')
      .set('Authorization', `Bearer ${companyB.tokens.admin}`);
    expect(aiResB.status).toBe(200);
    expect(aiResB.body.submittedCount).toBe(0);
    expect(aiResB.body.executiveSummary).toContain('No team members have submitted standup updates for today yet.');
  });
});
