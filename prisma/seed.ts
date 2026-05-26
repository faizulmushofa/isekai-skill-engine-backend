import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  console.log('🌱 Starting database seed...');

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set in environment variables');
  }

  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash('password', saltRounds);

    const testUsers = [
      {
        email: 'agus@example.com',
        username: 'agus',
        passwordHash,
      },
      {
        email: 'rani@example.com',
        username: 'rani',
        passwordHash,
      },
      {
        email: 'dodi@example.com',
        username: 'dodi',
        passwordHash,
      },
    ];

    for (const u of testUsers) {
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: u.email },
            { username: u.username },
          ],
        },
      });

      if (existingUser) {
        console.log(`⚠️ User with email ${u.email} or username ${u.username} already exists, skipping...`);
      } else {
        const created = await prisma.user.create({
          data: {
            email: u.email,
            username: u.username,
            passwordHash: u.passwordHash,
          },
        });
        console.log(`✅ Created user: ${created.username} (${created.email})`);
      }
    }

    console.log('🌿 Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
