import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../../src/index.js';
import { cleanTestDb, seedTestCompany, prisma } from '../helpers/testDb.js';

describe('Standup API integration', () => {
  beforeEach(async () => {
    await cleanTestDb();
  });

  const validPayload = {
    yesterdayUpdates: ['Implemented test coverage'],
    todayPlans: ['Review pull request'],
    blockers: ['None'],
    blockerLevel: 'NONE',
  };

  it('submits a valid standup for an authenticated team member', async () => {
    const seeded = await seedTestCompany();

    const response = await request(app)
      .post('/api/standups')
      .set('Authorization', `Bearer ${seeded.tokens.member1}`)
      .send(validPayload);

    expect(response.status).toBe(201);
    expect(response.body.standup).toEqual(
      expect.objectContaining({
        userId: seeded.users.member1.id,
        teamId: seeded.teams.backendTeam.id,
        blockerLevel: 'NONE',
      })
    );
  });

  it('rejects empty standup updates with a structured validation response', async () => {
    const seeded = await seedTestCompany();

    const response = await request(app)
      .post('/api/standups')
      .set('Authorization', `Bearer ${seeded.tokens.member1}`)
      .send({ yesterdayUpdates: '', todayPlans: '' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(expect.objectContaining({ status: 'error', errors: expect.any(Array) }));
  });

  it('prevents duplicate standups for the same user and date', async () => {
    const seeded = await seedTestCompany();

    const first = await request(app)
      .post('/api/standups')
      .set('Authorization', `Bearer ${seeded.tokens.member1}`)
      .send(validPayload);
    const duplicate = await request(app)
      .post('/api/standups')
      .set('Authorization', `Bearer ${seeded.tokens.member1}`)
      .send(validPayload);

    expect(first.status).toBe(201);
    expect(duplicate.status).toBe(400);
    expect(duplicate.body.message).toMatch(/already submitted/i);
  });

  it('handles simultaneous concurrent standup submission HTTP requests with strict database uniqueness and conflict resolution', async () => {
    const seeded = await seedTestCompany();

    // Fire 4 simultaneous HTTP requests for the same user and date
    const requests = Array.from({ length: 4 }, () =>
      request(app)
        .post('/api/standups')
        .set('Authorization', `Bearer ${seeded.tokens.member1}`)
        .send(validPayload)
    );

    const responses = await Promise.all(requests);

    // Exactly one request must succeed with 201 Created
    const createdResponses = responses.filter((r) => r.status === 201);
    expect(createdResponses).toHaveLength(1);

    // All other concurrent requests must fail with 400 (application duplicate check) or 409 (database unique constraint)
    const conflictResponses = responses.filter((r) => r.status === 400 || r.status === 409);
    expect(conflictResponses).toHaveLength(3);

    // Verify in database that exactly 1 standup record exists
    const dbCount = await prisma.dailyStandup.count({
      where: { userId: seeded.users.member1.id },
    });
    expect(dbCount).toBe(1);
  });

  it('reports whether the authenticated user has submitted today', async () => {
    const seeded = await seedTestCompany();

    const beforeSubmission = await request(app)
      .get('/api/standups/today')
      .set('Authorization', `Bearer ${seeded.tokens.member1}`);
    expect(beforeSubmission.status).toBe(200);
    expect(beforeSubmission.body).toMatchObject({ submitted: false, standup: null });

    await request(app)
      .post('/api/standups')
      .set('Authorization', `Bearer ${seeded.tokens.member1}`)
      .send(validPayload);

    const afterSubmission = await request(app)
      .get('/api/standups/today')
      .set('Authorization', `Bearer ${seeded.tokens.member1}`);
    expect(afterSubmission.status).toBe(200);
    expect(afterSubmission.body).toMatchObject({ submitted: true });
  });

  it('allows users to update their own standup only', async () => {
    const seeded = await seedTestCompany();
    const created = await request(app)
      .post('/api/standups')
      .set('Authorization', `Bearer ${seeded.tokens.member1}`)
      .send(validPayload);

    const response = await request(app)
      .put(`/api/standups/${created.body.standup.id}`)
      .set('Authorization', `Bearer ${seeded.tokens.member1}`)
      .send({ todayPlans: ['Write a release note'] });

    expect(response.status).toBe(200);
    const dbValue = await prisma.dailyStandup.findUniqueOrThrow({ where: { id: created.body.standup.id } });
    expect(dbValue.todayPlans).toContain('Write a release note');
  });

  it('rejects updating a peer’s standup', async () => {
    const seeded = await seedTestCompany();
    const created = await request(app)
      .post('/api/standups')
      .set('Authorization', `Bearer ${seeded.tokens.member1}`)
      .send(validPayload);

    const response = await request(app)
      .put(`/api/standups/${created.body.standup.id}`)
      .set('Authorization', `Bearer ${seeded.tokens.member2}`)
      .send({ todayPlans: ['Unauthorized change'] });

    expect(response.status).toBe(403);
  });
});
