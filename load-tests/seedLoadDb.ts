import path from 'path';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

// Configure environment for E2E/Load testing
process.env.NODE_ENV = 'e2e';
process.env.DATABASE_URL = 'file:./e2e.db';
dotenv.config({ path: path.resolve(__dirname, '../server/.env') });

import { PrismaClient } from '../server/node_modules/@prisma/client';
import { seedE2EDatabase, COMPANY_A, E2E_PASSWORD } from '../e2e/helpers/seedE2E';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${path.resolve(__dirname, '../server/prisma/e2e.db')}`,
    },
  },
});

export async function seedLoadTestDatabase(userCount: number = 250) {
  console.log('Seeding base E2E database...');
  const baseData = await seedE2EDatabase();
  const passwordHash = await bcrypt.hash(E2E_PASSWORD, 6);

  console.log(`Generating ${userCount} load test users for Alpha Corp...`);
  const companyId = baseData.compA.id;
  const departmentId = baseData.deptA.id;
  const teamId = baseData.teamA.id;

  const usersData: any[] = [];
  for (let i = 1; i <= userCount; i++) {
    usersData.push({
      companyId,
      departmentId,
      teamId,
      name: `Load Test User ${i}`,
      email: `loaduser${i}@alphacorp.io`,
      employeeId: `LOAD-${String(i).padStart(4, '0')}`,
      passwordHash,
      role: 'TEAM_MEMBER',
      isActive: true,
    });
  }

  // Insert in chunks
  const chunkSize = 50;
  for (let i = 0; i < usersData.length; i += chunkSize) {
    const chunk = usersData.slice(i, i + chunkSize);
    await prisma.user.createMany({
      data: chunk,
    });
  }

  // Add them to teamMember
  const allLoadUsers = await prisma.user.findMany({
    where: {
      email: {
        startsWith: 'loaduser',
      },
    },
    select: { id: true },
  });

  const memberRecords = allLoadUsers.map((u) => ({
    teamId,
    userId: u.id,
  }));

  for (let i = 0; i < memberRecords.length; i += chunkSize) {
    const chunk = memberRecords.slice(i, i + chunkSize);
    await prisma.teamMember.createMany({
      data: chunk,
    });
  }

  console.log(`✅ Seeded ${userCount} load test users into e2e.db successfully.`);
}

if (require.main === module) {
  seedLoadTestDatabase(250)
    .then(() => {
      prisma.$disconnect();
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Failed to seed load database:', err);
      prisma.$disconnect();
      process.exit(1);
    });
}
