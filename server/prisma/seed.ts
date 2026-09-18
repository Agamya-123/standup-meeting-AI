import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const getTodayDateString = (): string => {
  return new Date().toISOString().split('T')[0];
};

const getYesterdayDateString = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
};

async function main() {
  console.log('🌱 Starting multi-tenant database seeding...');

  // Clean existing tables in reverse dependency order
  await prisma.notification.deleteMany();
  await prisma.standupReaction.deleteMany();
  await prisma.dailyStandup.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();

  const commonPassword = await bcrypt.hash('password123', 10);

  // ==========================================
  // 1. COMPANY 1: NEXUS TECHNOLOGIES
  // ==========================================
  const nexusCompany = await prisma.company.create({
    data: {
      name: 'Nexus Technologies',
      slug: 'nexus-tech',
      domain: 'nexustech.io',
      logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=NexusTech'
    }
  });

  // Nexus Admin
  const nexusAdmin = await prisma.user.create({
    data: {
      companyId: nexusCompany.id,
      employeeId: 'EMP-001',
      name: 'Alex Mercer (Admin)',
      email: 'alex@nexustech.io',
      passwordHash: commonPassword,
      role: 'ADMIN',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AlexMercer'
    }
  });

  // Nexus Manager
  const nexusManager = await prisma.user.create({
    data: {
      companyId: nexusCompany.id,
      employeeId: 'EMP-101',
      name: 'Sarah Jenkins',
      email: 'sarah@nexustech.io',
      passwordHash: commonPassword,
      role: 'MANAGER',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SarahJenkins'
    }
  });

  // Nexus Members
  const nexusMembersData = [
    {
      name: 'Rahul Sharma',
      email: 'rahul@nexustech.io',
      employeeId: 'EMP-102',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=RahulSharma'
    },
    {
      name: 'Priya Singh',
      email: 'priya@nexustech.io',
      employeeId: 'EMP-103',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=PriyaSingh'
    },
    {
      name: 'Amit Kumar',
      email: 'amit@nexustech.io',
      employeeId: 'EMP-104',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AmitKumar'
    },
    {
      name: 'Sneha Reddy',
      email: 'sneha@nexustech.io',
      employeeId: 'EMP-105',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SnehaReddy'
    },
    {
      name: 'Vikram Patel',
      email: 'vikram@nexustech.io',
      employeeId: 'EMP-106',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=VikramPatel'
    },
    {
      name: 'Ananya Verma',
      email: 'ananya@nexustech.io',
      employeeId: 'EMP-107',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AnanyaVerma'
    }
  ];

  const nexusMembers = [];
  for (const m of nexusMembersData) {
    const user = await prisma.user.create({
      data: {
        companyId: nexusCompany.id,
        employeeId: m.employeeId,
        name: m.name,
        email: m.email,
        passwordHash: commonPassword,
        role: 'MEMBER',
        avatar: m.avatar
      }
    });
    nexusMembers.push(user);
  }

  // Nexus Teams
  const nexusTeam1 = await prisma.team.create({
    data: {
      companyId: nexusCompany.id,
      name: 'Nexus Core Platform',
      description: 'Primary product development team working on high-performance cloud services.',
      managerId: nexusManager.id
    }
  });

  const nexusTeam2 = await prisma.team.create({
    data: {
      companyId: nexusCompany.id,
      name: 'Nexus AI & Machine Learning',
      description: 'Research and deployment of intelligent summary models and data analysis pipelines.',
      managerId: nexusManager.id
    }
  });

  // Assign to Team 1
  await prisma.teamMember.create({ data: { teamId: nexusTeam1.id, userId: nexusManager.id } });
  for (let i = 0; i < 4; i++) {
    await prisma.teamMember.create({ data: { teamId: nexusTeam1.id, userId: nexusMembers[i].id } });
  }

  // Assign to Team 2
  for (let i = 4; i < nexusMembers.length; i++) {
    await prisma.teamMember.create({ data: { teamId: nexusTeam2.id, userId: nexusMembers[i].id } });
  }

  const today = getTodayDateString();
  const yesterday = getYesterdayDateString();

  const rahul = nexusMembers.find(m => m.email === 'rahul@nexustech.io')!;
  const priya = nexusMembers.find(m => m.email === 'priya@nexustech.io')!;
  const amit = nexusMembers.find(m => m.email === 'amit@nexustech.io')!;
  const sneha = nexusMembers.find(m => m.email === 'sneha@nexustech.io')!;
  const vikram = nexusMembers.find(m => m.email === 'vikram@nexustech.io')!;

  // Standups for Nexus Tech
  const sRahul = await prisma.dailyStandup.create({
    data: {
      userId: rahul.id,
      teamId: nexusTeam1.id,
      date: today,
      yesterdayUpdates: JSON.stringify(['Completed multi-tenant auth architecture', 'Implemented company workspace provisioning flow']),
      todayPlans: JSON.stringify(['Build 2-step smart identifier auto-detection', 'Integrate company branding header card']),
      blockers: JSON.stringify(['Need cloud DNS staging credentials from DevOps lead']),
      blockerLevel: 'CRITICAL',
      blockerStatus: 'OPEN'
    }
  });

  const sPriya = await prisma.dailyStandup.create({
    data: {
      userId: priya.id,
      teamId: nexusTeam1.id,
      date: today,
      yesterdayUpdates: JSON.stringify(['Designed modern enterprise UI tokens', 'Created crisp employee identity badge components']),
      todayPlans: JSON.stringify(['Update team management view with add employee modal', 'Audit color contrast ratios']),
      blockers: JSON.stringify(['Waiting for UX lead approval on modal animations']),
      blockerLevel: 'MINOR',
      blockerStatus: 'OPEN'
    }
  });

  const sAmit = await prisma.dailyStandup.create({
    data: {
      userId: amit.id,
      teamId: nexusTeam1.id,
      date: today,
      yesterdayUpdates: JSON.stringify(['Migrated schema to enforce companyId tenant keys', 'Tested JWT tenant isolation']),
      todayPlans: JSON.stringify(['Add automated rate-limiter for identifier lookups', 'Optimize query indices']),
      blockers: JSON.stringify([]),
      blockerLevel: 'NONE',
      blockerStatus: 'RESOLVED'
    }
  });

  const sSneha = await prisma.dailyStandup.create({
    data: {
      userId: sneha.id,
      teamId: nexusTeam1.id,
      date: today,
      yesterdayUpdates: JSON.stringify(['Built company-isolated AI summary heuristics', 'Refactored manager dashboard metrics aggregation']),
      todayPlans: JSON.stringify(['Integrate live blocker notifications', 'Write end-to-end multi-tenant tests']),
      blockers: JSON.stringify([]),
      blockerLevel: 'NONE',
      blockerStatus: 'RESOLVED'
    }
  });

  // Reactions
  await prisma.standupReaction.create({ data: { standupId: sRahul.id, userId: amit.id, emoji: '🚀' } });
  await prisma.standupReaction.create({ data: { standupId: sRahul.id, userId: priya.id, emoji: '🔥' } });
  await prisma.standupReaction.create({ data: { standupId: sRahul.id, userId: nexusManager.id, emoji: '👏' } });
  await prisma.standupReaction.create({ data: { standupId: sSneha.id, userId: rahul.id, emoji: '🚀' } });

  // Notifications
  await prisma.notification.create({
    data: {
      userId: rahul.id,
      senderId: priya.id,
      type: 'REACTION',
      title: '👏 Cheer from Priya Singh',
      message: 'Priya Singh reacted 🔥 to your daily update.',
      link: '/dashboard',
      read: false
    }
  });

  // ==========================================
  // 2. COMPANY 2: ACME CLOUD CORP
  // ==========================================
  const acmeCompany = await prisma.company.create({
    data: {
      name: 'Acme Cloud Corp',
      slug: 'acme-cloud',
      domain: 'acmecloud.com',
      logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=AcmeCloud'
    }
  });

  const acmeAdmin = await prisma.user.create({
    data: {
      companyId: acmeCompany.id,
      employeeId: 'ACM-001',
      name: 'Elena Vance (Admin)',
      email: 'elena@acmecloud.com',
      passwordHash: commonPassword,
      role: 'ADMIN',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ElenaVance'
    }
  });

  const acmeManager = await prisma.user.create({
    data: {
      companyId: acmeCompany.id,
      employeeId: 'ACM-101',
      name: 'David Sterling',
      email: 'david@acmecloud.com',
      passwordHash: commonPassword,
      role: 'MANAGER',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DavidSterling'
    }
  });

  const acmeMember = await prisma.user.create({
    data: {
      companyId: acmeCompany.id,
      employeeId: 'ACM-102',
      name: 'Marcus Brody',
      email: 'marcus@acmecloud.com',
      passwordHash: commonPassword,
      role: 'MEMBER',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=MarcusBrody'
    }
  });

  const acmeTeam = await prisma.team.create({
    data: {
      companyId: acmeCompany.id,
      name: 'Acme Cloud DevOps',
      description: 'Infrastructure and Kubernetes orchestration for Acme Cloud.',
      managerId: acmeManager.id
    }
  });

  await prisma.teamMember.create({ data: { teamId: acmeTeam.id, userId: acmeManager.id } });
  await prisma.teamMember.create({ data: { teamId: acmeTeam.id, userId: acmeMember.id } });

  await prisma.dailyStandup.create({
    data: {
      userId: acmeMember.id,
      teamId: acmeTeam.id,
      date: today,
      yesterdayUpdates: JSON.stringify(['Provisioned Kubernetes clusters in us-east-1', 'Configured ingress routing policies']),
      todayPlans: JSON.stringify(['Setup Prometheus & Grafana telemetry', 'Run failover resilience test']),
      blockers: JSON.stringify([]),
      blockerLevel: 'NONE',
      blockerStatus: 'RESOLVED'
    }
  });

  console.log('✅ Multi-Tenant Database successfully seeded with Company Workspaces & Employees!');
  console.log('--------------------------------------------------');
  console.log('🏢 [Company 1] Nexus Technologies (nexustech.io)');
  console.log('   - Admin:    alex@nexustech.io (or EMP-001) / password123');
  console.log('   - Manager:  sarah@nexustech.io (or EMP-101) / password123');
  console.log('   - Employee: rahul@nexustech.io (or EMP-102) / password123');
  console.log('   - Employee: priya@nexustech.io (or EMP-103) / password123');
  console.log('--------------------------------------------------');
  console.log('🏢 [Company 2] Acme Cloud Corp (acmecloud.com)');
  console.log('   - Admin:    elena@acmecloud.com (or ACM-001) / password123');
  console.log('   - Manager:  david@acmecloud.com (or ACM-101) / password123');
  console.log('   - Employee: marcus@acmecloud.com (or ACM-102) / password123');
  console.log('--------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
