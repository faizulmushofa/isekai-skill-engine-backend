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
    // Tidak ada data dummy yang di-seed (Dikosongkan sesuai permintaan)
    console.log('✅ Seed bypassed: No dummy data inserted.');


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
