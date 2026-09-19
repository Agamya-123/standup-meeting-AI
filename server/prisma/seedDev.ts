import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seed() {
  await prisma.notification.deleteMany();
  await prisma.standupReaction.deleteMany();
  await prisma.dailyStandup.deleteMany();
  await prisma.departmentAccess.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.team.deleteMany();
  await prisma.department.deleteMany();
  await prisma.company.deleteMany();

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // ================= COMPANY A: ALPHA CORP =================
  const compA = await prisma.company.create({
    data: {
      name: 'Alpha Corp',
      slug: 'alpha-corp',
      domain: 'alphacorp.io',
      logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=AlphaCorp',
    },
  });

  const deptA = await prisma.department.create({
    data: {
      companyId: compA.id,
      name: 'Engineering',
      description: 'Core Engineering Department',
    },
  });

  const teamA = await prisma.team.create({
    data: {
      companyId: compA.id,
      departmentId: deptA.id,
      name: 'Backend Core',
      department: 'Engineering',
      description: 'Backend infrastructure and APIs',
    },
  });

  const adminA = await prisma.user.create({
    data: {
      companyId: compA.id,
      name: 'Alice Admin',
      email: 'admin@alphacorp.io',
      employeeId: 'ALP-ADM01',
      passwordHash,
      role: 'ADMIN',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AliceAdmin',
    },
  });

  const managerA = await prisma.user.create({
    data: {
      companyId: compA.id,
      departmentId: deptA.id,
      name: 'Mark Manager',
      email: 'manager@alphacorp.io',
      employeeId: 'ALP-MGR01',
      passwordHash,
      role: 'MANAGER',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=MarkManager',
    },
  });

  const leadA = await prisma.user.create({
    data: {
      companyId: compA.id,
      departmentId: deptA.id,
      teamId: teamA.id,
      name: 'Lucas Lead',
      email: 'lead@alphacorp.io',
      employeeId: 'ALP-TL01',
      passwordHash,
      role: 'TEAM_LEAD',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=LucasLead',
    },
  });

  const memberA = await prisma.user.create({
    data: {
      companyId: compA.id,
      departmentId: deptA.id,
      teamId: teamA.id,
      name: 'Maya Member',
      email: 'member@alphacorp.io',
      employeeId: 'ALP-MEM01',
      passwordHash,
      role: 'TEAM_MEMBER',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=MayaMember',
    },
  });

  await prisma.team.update({
    where: { id: teamA.id },
    data: { managerId: managerA.id, teamLeadId: leadA.id },
  });

  await prisma.teamMember.create({ data: { teamId: teamA.id, userId: memberA.id } });
  await prisma.teamMember.create({ data: { teamId: teamA.id, userId: leadA.id } });
  await prisma.teamMember.create({ data: { teamId: teamA.id, userId: managerA.id } });

  const standupA = await prisma.dailyStandup.create({
    data: {
      userId: memberA.id,
      teamId: teamA.id,
      date: '2026-09-18',
      yesterdayUpdates: JSON.stringify(['Configured database indexes', 'Reviewed PR #12']),
      todayPlans: JSON.stringify(['Implement Playwright E2E suites', 'Sync with Team Lead']),
      blockers: JSON.stringify(['Need API specification for Webhooks']),
      blockerLevel: 'MINOR',
      blockerStatus: 'OPEN',
    },
  });

  await prisma.standupReaction.create({
    data: { standupId: standupA.id, userId: leadA.id, emoji: '🚀' },
  });

  // ================= COMPANY B: BETA GLOBAL =================
  const compB = await prisma.company.create({
    data: {
      name: 'Beta Global',
      slug: 'beta-global',
      domain: 'betaglobal.com',
      logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=BetaGlobal',
    },
  });

  const deptB = await prisma.department.create({
    data: {
      companyId: compB.id,
      name: 'Product Operations',
      description: 'Product Operations & Analytics',
    },
  });

  const teamB = await prisma.team.create({
    data: {
      companyId: compB.id,
      departmentId: deptB.id,
      name: 'Analytics Squad',
      department: 'Product Operations',
      description: 'Analytics, data pipelines & telemetry',
    },
  });

  const adminB = await prisma.user.create({
    data: {
      companyId: compB.id,
      name: 'Bob BetaAdmin',
      email: 'admin@betaglobal.com',
      employeeId: 'BET-ADM01',
      passwordHash,
      role: 'ADMIN',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=BobBetaAdmin',
    },
  });

  const managerB = await prisma.user.create({
    data: {
      companyId: compB.id,
      departmentId: deptB.id,
      name: 'Brian BetaMgr',
      email: 'manager@betaglobal.com',
      employeeId: 'BET-MGR01',
      passwordHash,
      role: 'MANAGER',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=BrianBetaMgr',
    },
  });

  const leadB = await prisma.user.create({
    data: {
      companyId: compB.id,
      departmentId: deptB.id,
      teamId: teamB.id,
      name: 'Beth BetaLead',
      email: 'lead@betaglobal.com',
      employeeId: 'BET-TL01',
      passwordHash,
      role: 'TEAM_LEAD',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=BethBetaLead',
    },
  });

  const memberB = await prisma.user.create({
    data: {
      companyId: compB.id,
      departmentId: deptB.id,
      teamId: teamB.id,
      name: 'Ben BetaMember',
      email: 'member@betaglobal.com',
      employeeId: 'BET-MEM01',
      passwordHash,
      role: 'TEAM_MEMBER',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=BenBetaMember',
    },
  });

  await prisma.team.update({
    where: { id: teamB.id },
    data: { managerId: managerB.id, teamLeadId: leadB.id },
  });

  await prisma.teamMember.create({ data: { teamId: teamB.id, userId: memberB.id } });
  await prisma.teamMember.create({ data: { teamId: teamB.id, userId: leadB.id } });
  await prisma.teamMember.create({ data: { teamId: teamB.id, userId: managerB.id } });

  const standupB = await prisma.dailyStandup.create({
    data: {
      userId: memberB.id,
      teamId: teamB.id,
      date: '2026-09-18',
      yesterdayUpdates: JSON.stringify(['Exported monthly cohort churn metrics']),
      todayPlans: JSON.stringify(['Build automated customer lifetime dashboard']),
      blockers: JSON.stringify([]),
      blockerLevel: 'NONE',
      blockerStatus: 'OPEN',
    },
  });

  console.log('✅ Successfully seeded Alpha Corp and Beta Global in dev.db!');
}

seed()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
