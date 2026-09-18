import path from 'path';
import dotenv from 'dotenv';
import { execSync } from 'child_process';

// Configure environment for E2E
process.env.NODE_ENV = 'e2e';
process.env.DATABASE_URL = 'file:./e2e.db';
dotenv.config({ path: path.resolve(__dirname, '../../server/.env') });

import { PrismaClient } from '../../server/node_modules/@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${path.resolve(__dirname, '../../server/prisma/e2e.db')}`,
    },
  },
});

let e2eDbSchemaEnsured = false;

export async function ensureE2EDbSchema() {
  if (e2eDbSchemaEnsured) return;
  try {
    await prisma.user.findFirst();
    e2eDbSchemaEnsured = true;
  } catch (err: any) {
    if (err?.code === 'P2021' || err?.message?.includes('does not exist')) {
      const serverDir = path.resolve(__dirname, '../../server');
      execSync('npx prisma db push --skip-generate --accept-data-loss', {
        cwd: serverDir,
        env: { ...process.env, DATABASE_URL: 'file:./e2e.db' },
        stdio: 'pipe',
      });
      e2eDbSchemaEnsured = true;
    } else {
      throw err;
    }
  }
}

export const E2E_PASSWORD = 'Password123!';

export const COMPANY_A = {
  name: 'Alpha Corp',
  slug: 'alpha-corp',
  domain: 'alphacorp.io',
  deptName: 'Engineering',
  teamName: 'Backend Core',
  admin: {
    name: 'Alice Admin',
    email: 'admin@alphacorp.io',
    employeeId: 'ALP-ADM01',
    password: E2E_PASSWORD,
    role: 'ADMIN',
  },
  manager: {
    name: 'Mark Manager',
    email: 'manager@alphacorp.io',
    employeeId: 'ALP-MGR01',
    password: E2E_PASSWORD,
    role: 'MANAGER',
  },
  lead: {
    name: 'Lucas Lead',
    email: 'lead@alphacorp.io',
    employeeId: 'ALP-TL01',
    password: E2E_PASSWORD,
    role: 'TEAM_LEAD',
  },
  member: {
    name: 'Maya Member',
    email: 'member@alphacorp.io',
    employeeId: 'ALP-MEM01',
    password: E2E_PASSWORD,
    role: 'TEAM_MEMBER',
  },
};

export const COMPANY_B = {
  name: 'Beta Global',
  slug: 'beta-global',
  domain: 'betaglobal.com',
  deptName: 'Product Operations',
  teamName: 'Analytics Squad',
  admin: {
    name: 'Bob BetaAdmin',
    email: 'admin@betaglobal.com',
    employeeId: 'BET-ADM01',
    password: E2E_PASSWORD,
    role: 'ADMIN',
  },
  manager: {
    name: 'Brian BetaMgr',
    email: 'manager@betaglobal.com',
    employeeId: 'BET-MGR01',
    password: E2E_PASSWORD,
    role: 'MANAGER',
  },
  lead: {
    name: 'Beth BetaLead',
    email: 'lead@betaglobal.com',
    employeeId: 'BET-TL01',
    password: E2E_PASSWORD,
    role: 'TEAM_LEAD',
  },
  member: {
    name: 'Ben BetaMember',
    email: 'member@betaglobal.com',
    employeeId: 'BET-MEM01',
    password: E2E_PASSWORD,
    role: 'TEAM_MEMBER',
  },
};

export async function cleanE2EDb() {
  await ensureE2EDbSchema();
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
}

export async function seedE2EDatabase() {
  await cleanE2EDb();

  const passwordHash = await bcrypt.hash(E2E_PASSWORD, 6);

  // ================= COMPANY A =================
  const compA = await prisma.company.create({
    data: {
      name: COMPANY_A.name,
      slug: COMPANY_A.slug,
      domain: COMPANY_A.domain,
    },
  });

  const deptA = await prisma.department.create({
    data: {
      companyId: compA.id,
      name: COMPANY_A.deptName,
      description: 'Core Engineering Department',
    },
  });

  const teamA = await prisma.team.create({
    data: {
      companyId: compA.id,
      departmentId: deptA.id,
      name: COMPANY_A.teamName,
      department: COMPANY_A.deptName,
      description: 'Backend infrastructure and APIs',
    },
  });

  const adminA = await prisma.user.create({
    data: {
      companyId: compA.id,
      name: COMPANY_A.admin.name,
      email: COMPANY_A.admin.email,
      employeeId: COMPANY_A.admin.employeeId,
      passwordHash,
      role: 'ADMIN',
    },
  });

  const managerA = await prisma.user.create({
    data: {
      companyId: compA.id,
      departmentId: deptA.id,
      name: COMPANY_A.manager.name,
      email: COMPANY_A.manager.email,
      employeeId: COMPANY_A.manager.employeeId,
      passwordHash,
      role: 'MANAGER',
    },
  });

  const leadA = await prisma.user.create({
    data: {
      companyId: compA.id,
      departmentId: deptA.id,
      teamId: teamA.id,
      name: COMPANY_A.lead.name,
      email: COMPANY_A.lead.email,
      employeeId: COMPANY_A.lead.employeeId,
      passwordHash,
      role: 'TEAM_LEAD',
    },
  });

  const memberA = await prisma.user.create({
    data: {
      companyId: compA.id,
      departmentId: deptA.id,
      teamId: teamA.id,
      name: COMPANY_A.member.name,
      email: COMPANY_A.member.email,
      employeeId: COMPANY_A.member.employeeId,
      passwordHash,
      role: 'TEAM_MEMBER',
    },
  });

  // Link Team Lead & Manager to Team
  await prisma.team.update({
    where: { id: teamA.id },
    data: {
      managerId: managerA.id,
      teamLeadId: leadA.id,
    },
  });

  // Add memberships
  await prisma.teamMember.create({
    data: { teamId: teamA.id, userId: memberA.id },
  });
  await prisma.teamMember.create({
    data: { teamId: teamA.id, userId: leadA.id },
  });

  // Create Standup for Company A member on a past date (so today is fresh for live test)
  const standupA = await prisma.dailyStandup.create({
    data: {
      userId: memberA.id,
      teamId: teamA.id,
      date: '2026-09-17',
      yesterdayUpdates: JSON.stringify(['Configured database indexes', 'Reviewed PR #12']),
      todayPlans: JSON.stringify(['Implement Playwright E2E suites', 'Sync with Team Lead']),
      blockers: JSON.stringify(['Need API specification for Webhooks']),
      blockerLevel: 'MINOR',
      blockerStatus: 'OPEN',
    },
  });

  // Create reaction
  await prisma.standupReaction.create({
    data: {
      standupId: standupA.id,
      userId: leadA.id,
      emoji: '🚀',
    },
  });

  // ================= COMPANY B =================
  const compB = await prisma.company.create({
    data: {
      name: COMPANY_B.name,
      slug: COMPANY_B.slug,
      domain: COMPANY_B.domain,
    },
  });

  const deptB = await prisma.department.create({
    data: {
      companyId: compB.id,
      name: COMPANY_B.deptName,
      description: 'Product Operations & Analytics',
    },
  });

  const teamB = await prisma.team.create({
    data: {
      companyId: compB.id,
      departmentId: deptB.id,
      name: COMPANY_B.teamName,
      department: COMPANY_B.deptName,
      description: 'Analytics, data pipelines & telemetry',
    },
  });

  const adminB = await prisma.user.create({
    data: {
      companyId: compB.id,
      name: COMPANY_B.admin.name,
      email: COMPANY_B.admin.email,
      employeeId: COMPANY_B.admin.employeeId,
      passwordHash,
      role: 'ADMIN',
    },
  });

  const managerB = await prisma.user.create({
    data: {
      companyId: compB.id,
      departmentId: deptB.id,
      name: COMPANY_B.manager.name,
      email: COMPANY_B.manager.email,
      employeeId: COMPANY_B.manager.employeeId,
      passwordHash,
      role: 'MANAGER',
    },
  });

  const leadB = await prisma.user.create({
    data: {
      companyId: compB.id,
      departmentId: deptB.id,
      teamId: teamB.id,
      name: COMPANY_B.lead.name,
      email: COMPANY_B.lead.email,
      employeeId: COMPANY_B.lead.employeeId,
      passwordHash,
      role: 'TEAM_LEAD',
    },
  });

  const memberB = await prisma.user.create({
    data: {
      companyId: compB.id,
      departmentId: deptB.id,
      teamId: teamB.id,
      name: COMPANY_B.member.name,
      email: COMPANY_B.member.email,
      employeeId: COMPANY_B.member.employeeId,
      passwordHash,
      role: 'TEAM_MEMBER',
    },
  });

  // Link Team Lead & Manager to Team
  await prisma.team.update({
    where: { id: teamB.id },
    data: {
      managerId: managerB.id,
      teamLeadId: leadB.id,
    },
  });

  // Add memberships
  await prisma.teamMember.create({
    data: { teamId: teamB.id, userId: memberB.id },
  });
  await prisma.teamMember.create({
    data: { teamId: teamB.id, userId: leadB.id },
  });

  // Create Standup for Company B
  const standupB = await prisma.dailyStandup.create({
    data: {
      userId: memberB.id,
      teamId: teamB.id,
      date: '2026-09-17',
      yesterdayUpdates: JSON.stringify(['Exported monthly cohort churn metrics']),
      todayPlans: JSON.stringify(['Build automated customer lifetime dashboard']),
      blockers: JSON.stringify([]),
      blockerLevel: 'NONE',
      blockerStatus: 'OPEN',
    },
  });

  await prisma.standupReaction.create({
    data: {
      standupId: standupB.id,
      userId: managerB.id,
      emoji: '👍',
    },
  });

  return {
    compA,
    deptA,
    teamA,
    adminA,
    managerA,
    leadA,
    memberA,
    standupA,
    compB,
    deptB,
    teamB,
    adminB,
    managerB,
    leadB,
    memberB,
    standupB,
  };
}

// Allow direct CLI invocation via `npx tsx e2e/helpers/seedE2E.ts`
if (require.main === module) {
  seedE2EDatabase()
    .then(() => {
      console.log('✅ Successfully seeded isolated E2E database (e2e.db).');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Failed to seed E2E database:', err);
      process.exit(1);
    });
}
