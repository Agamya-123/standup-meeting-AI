// Set environment variables before any application imports
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'file:./test.db';
process.env.JWT_SECRET = 'test-super-secret-jwt-key-min-32-chars-long-for-tests';
process.env.ALLOWED_ORIGINS = 'http://localhost:5173,http://localhost:3000';

import { prisma } from '../../src/config/prisma.js';
import { env } from '../../src/config/env.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export { prisma };

let testDbSchemaEnsured = false;

export async function ensureTestDbSchema() {
  if (testDbSchemaEnsured) return;
  try {
    await prisma.user.findFirst();
    testDbSchemaEnsured = true;
  } catch (err: any) {
    if (err?.code === 'P2021' || err?.message?.includes('does not exist')) {
      const serverDir = path.resolve(__dirname, '../../');
      execSync('npx prisma db push --skip-generate --accept-data-loss', {
        cwd: serverDir,
        env: { ...process.env, DATABASE_URL: 'file:./test.db' },
        stdio: 'pipe',
      });
      testDbSchemaEnsured = true;
    } else {
      throw err;
    }
  }
}

export async function cleanTestDb() {
  await ensureTestDbSchema();
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

export function createAuthToken(
  user: { id: string; email: string; role: string; companyId: string; name?: string; departmentId?: string | null; teamId?: string | null },
  expiresIn = '1h'
): string {
  return jwt.sign(
    {
      id: user.id,
      userId: user.id,
      email: user.email,
      name: user.name || 'Test User',
      role: user.role,
      companyId: user.companyId,
      departmentId: user.departmentId,
      teamId: user.teamId,
    },
    env.JWT_SECRET,
    { expiresIn } as jwt.SignOptions
  );
}

export async function seedTestCompany() {
  await cleanTestDb();

  const passwordHash = await bcrypt.hash('password123', 6);

  // 1. Create Company
  const company = await prisma.company.create({
    data: {
      name: 'Acme Test Corp',
      slug: 'acme-test',
      domain: 'acme.com',
    },
  });

  // 2. Create Departments
  const engDept = await prisma.department.create({
    data: {
      companyId: company.id,
      name: 'Engineering',
      description: 'Core Engineering Department',
    },
  });

  const mktDept = await prisma.department.create({
    data: {
      companyId: company.id,
      name: 'Marketing',
      description: 'Growth and Marketing Department',
    },
  });

  // 3. Create Teams
  const backendTeam = await prisma.team.create({
    data: {
      companyId: company.id,
      departmentId: engDept.id,
      name: 'Backend Team',
      department: 'Engineering',
      description: 'API and Database team',
    },
  });

  const growthTeam = await prisma.team.create({
    data: {
      companyId: company.id,
      departmentId: mktDept.id,
      name: 'Growth Team',
      department: 'Marketing',
      description: 'Growth initiatives team',
    },
  });

  // 4. Create Users
  const admin = await prisma.user.create({
    data: {
      companyId: company.id,
      name: 'Alice Admin',
      email: 'admin@acme.com',
      passwordHash,
      role: 'ADMIN',
    },
  });

  const managerEng = await prisma.user.create({
    data: {
      companyId: company.id,
      departmentId: engDept.id,
      name: 'Bob Eng Manager',
      email: 'manager.eng@acme.com',
      passwordHash,
      role: 'MANAGER',
    },
  });

  const managerMkt = await prisma.user.create({
    data: {
      companyId: company.id,
      departmentId: mktDept.id,
      name: 'Carol Mkt Manager',
      email: 'manager.mkt@acme.com',
      passwordHash,
      role: 'MANAGER',
    },
  });

  const teamLead = await prisma.user.create({
    data: {
      companyId: company.id,
      departmentId: engDept.id,
      teamId: backendTeam.id,
      name: 'David Team Lead',
      email: 'lead.be@acme.com',
      passwordHash,
      role: 'TEAM_LEAD',
    },
  });

  const member1 = await prisma.user.create({
    data: {
      companyId: company.id,
      departmentId: engDept.id,
      teamId: backendTeam.id,
      name: 'Emma Member 1',
      email: 'member1@acme.com',
      passwordHash,
      role: 'TEAM_MEMBER',
    },
  });

  const member2 = await prisma.user.create({
    data: {
      companyId: company.id,
      departmentId: mktDept.id,
      teamId: growthTeam.id,
      name: 'Frank Member 2',
      email: 'member2@acme.com',
      passwordHash,
      role: 'TEAM_MEMBER',
    },
  });

  // Update Team with lead & manager
  await prisma.team.update({
    where: { id: backendTeam.id },
    data: {
      managerId: managerEng.id,
      teamLeadId: teamLead.id,
    },
  });

  await prisma.team.update({
    where: { id: growthTeam.id },
    data: {
      managerId: managerMkt.id,
    },
  });

  // Team memberships
  await prisma.teamMember.create({
    data: { teamId: backendTeam.id, userId: member1.id },
  });
  await prisma.teamMember.create({
    data: { teamId: backendTeam.id, userId: teamLead.id },
  });
  await prisma.teamMember.create({
    data: { teamId: growthTeam.id, userId: member2.id },
  });

  return {
    company,
    departments: { engDept, mktDept },
    teams: { backendTeam, growthTeam },
    users: { admin, managerEng, managerMkt, teamLead, member1, member2 },
    tokens: {
      admin: createAuthToken(admin),
      managerEng: createAuthToken(managerEng),
      managerMkt: createAuthToken(managerMkt),
      teamLead: createAuthToken(teamLead),
      member1: createAuthToken(member1),
      member2: createAuthToken(member2),
    },
  };
}

export async function seedTwoCompanies() {
  await cleanTestDb();

  const passwordHash = await bcrypt.hash('password123', 6);

  // ---------------- COMPANY A ----------------
  const companyA = await prisma.company.create({
    data: {
      name: 'Alpha Corp',
      slug: 'alpha-corp',
      domain: 'alpha.com',
    },
  });

  const deptA = await prisma.department.create({
    data: {
      companyId: companyA.id,
      name: 'Engineering A',
      description: 'Alpha Engineering',
    },
  });

  const teamA = await prisma.team.create({
    data: {
      companyId: companyA.id,
      departmentId: deptA.id,
      name: 'Team Alpha 1',
      department: 'Engineering A',
      description: 'Alpha Core Team',
    },
  });

  const adminA = await prisma.user.create({
    data: {
      companyId: companyA.id,
      name: 'Admin Alpha',
      email: 'admin@alpha.com',
      passwordHash,
      role: 'ADMIN',
    },
  });

  const managerA = await prisma.user.create({
    data: {
      companyId: companyA.id,
      departmentId: deptA.id,
      name: 'Manager Alpha',
      email: 'manager@alpha.com',
      passwordHash,
      role: 'MANAGER',
    },
  });

  const memberA = await prisma.user.create({
    data: {
      companyId: companyA.id,
      departmentId: deptA.id,
      teamId: teamA.id,
      name: 'Member Alpha',
      email: 'member@alpha.com',
      passwordHash,
      role: 'TEAM_MEMBER',
    },
  });

  await prisma.team.update({
    where: { id: teamA.id },
    data: { managerId: managerA.id },
  });

  await prisma.teamMember.create({
    data: { teamId: teamA.id, userId: memberA.id },
  });

  // ---------------- COMPANY B ----------------
  const companyB = await prisma.company.create({
    data: {
      name: 'Beta Global',
      slug: 'beta-global',
      domain: 'beta.com',
    },
  });

  const deptB = await prisma.department.create({
    data: {
      companyId: companyB.id,
      name: 'Product B',
      description: 'Beta Product',
    },
  });

  const teamB = await prisma.team.create({
    data: {
      companyId: companyB.id,
      departmentId: deptB.id,
      name: 'Team Beta 1',
      department: 'Product B',
      description: 'Beta Core Team',
    },
  });

  const adminB = await prisma.user.create({
    data: {
      companyId: companyB.id,
      name: 'Admin Beta',
      email: 'admin@beta.com',
      passwordHash,
      role: 'ADMIN',
    },
  });

  const managerB = await prisma.user.create({
    data: {
      companyId: companyB.id,
      departmentId: deptB.id,
      name: 'Manager Beta',
      email: 'manager@beta.com',
      passwordHash,
      role: 'MANAGER',
    },
  });

  const memberB = await prisma.user.create({
    data: {
      companyId: companyB.id,
      departmentId: deptB.id,
      teamId: teamB.id,
      name: 'Member Beta',
      email: 'member@beta.com',
      passwordHash,
      role: 'TEAM_MEMBER',
    },
  });

  await prisma.team.update({
    where: { id: teamB.id },
    data: { managerId: managerB.id },
  });

  await prisma.teamMember.create({
    data: { teamId: teamB.id, userId: memberB.id },
  });

  return {
    companyA: {
      company: companyA,
      department: deptA,
      team: teamA,
      admin: adminA,
      manager: managerA,
      member: memberA,
      tokens: {
        admin: createAuthToken(adminA),
        manager: createAuthToken(managerA),
        member: createAuthToken(memberA),
      },
    },
    companyB: {
      company: companyB,
      department: deptB,
      team: teamB,
      admin: adminB,
      manager: managerB,
      member: memberB,
      tokens: {
        admin: createAuthToken(adminB),
        manager: createAuthToken(managerB),
        member: createAuthToken(memberB),
      },
    },
  };
}
