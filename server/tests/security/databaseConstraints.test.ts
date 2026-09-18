import { beforeEach, describe, expect, it } from 'vitest';
import { Prisma } from '@prisma/client';
import { cleanTestDb, seedTestCompany, prisma } from '../helpers/testDb.js';

describe('database integrity constraints', () => {
  beforeEach(async () => {
    await cleanTestDb();
  });

  const makeStandupData = (seeded: Awaited<ReturnType<typeof seedTestCompany>>) => ({
    userId: seeded.users.member1.id,
    teamId: seeded.teams.backendTeam.id,
    date: '2026-09-18',
    yesterdayUpdates: '["Completed tests"]',
    todayPlans: '["Review tests"]',
  });

  it('enforces one DailyStandup per user per date', async () => {
    const seeded = await seedTestCompany();
    const data = makeStandupData(seeded);
    await prisma.dailyStandup.create({ data });

    await expect(prisma.dailyStandup.create({ data })).rejects.toMatchObject({ code: 'P2002' });
  });

  it('rejects concurrent duplicate DailyStandup writes', async () => {
    const seeded = await seedTestCompany();
    const data = makeStandupData(seeded);

    const results = await Promise.allSettled([
      prisma.dailyStandup.create({ data }),
      prisma.dailyStandup.create({ data }),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((result) => result.status === 'rejected');
    expect(rejected).toMatchObject({ reason: expect.objectContaining({ code: 'P2002' }) });
  });

  it('cascades company deletion through dependent data', async () => {
    const seeded = await seedTestCompany();
    await prisma.dailyStandup.create({ data: makeStandupData(seeded) });

    await prisma.company.delete({ where: { id: seeded.company.id } });

    await expect(prisma.user.count({ where: { companyId: seeded.company.id } })).resolves.toBe(0);
    await expect(prisma.dailyStandup.count()).resolves.toBe(0);
  });

  it('sets user department and team assignments to null when related records are removed', async () => {
    const seeded = await seedTestCompany();

    await prisma.team.delete({ where: { id: seeded.teams.backendTeam.id } });
    const afterTeamDelete = await prisma.user.findUniqueOrThrow({ where: { id: seeded.users.member1.id } });
    expect(afterTeamDelete.teamId).toBeNull();

    await prisma.department.delete({ where: { id: seeded.departments.engDept.id } });
    const afterDepartmentDelete = await prisma.user.findUniqueOrThrow({ where: { id: seeded.users.member1.id } });
    expect(afterDepartmentDelete.departmentId).toBeNull();
  });
});
