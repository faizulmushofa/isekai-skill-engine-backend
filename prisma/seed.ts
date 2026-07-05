import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SEED_AI_TASK_CONFIGS = [
  {
    taskType: 'LEARNING_EVIDENCE',
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    temperature: 0.2,
    fallbackProvider: 'gemini',
    fallbackModel: 'gemini-1.5-flash',
    maxDailyTokens: 100000,
    maxMonthlyTokens: 3000000,
  },
  {
    taskType: 'ASSESSMENT_GENERATOR',
    provider: 'gemini',
    model: 'gemini-1.5-pro',
    temperature: 0.7,
    fallbackProvider: 'groq',
    fallbackModel: 'mixtral-8x7b-32768',
    maxDailyTokens: 100000,
    maxMonthlyTokens: 3000000,
  },
  {
    taskType: 'PROJECT_EVIDENCE',
    provider: 'groq',
    model: 'deepseek-r1-distill-llama-70b',
    temperature: 0.2,
    fallbackProvider: 'gemini',
    fallbackModel: 'gemini-1.5-flash-8b',
    maxDailyTokens: 100000,
    maxMonthlyTokens: 3000000,
  },
  {
    taskType: 'BEHAVIORAL_CAREER_ALIGNMENT',
    provider: 'groq',
    model: 'gemma2-9b-it',
    temperature: 0.5,
    fallbackProvider: 'gemini',
    fallbackModel: 'gemini-2.0-flash',
    maxDailyTokens: 100000,
    maxMonthlyTokens: 3000000,
  },
  {
    taskType: 'SKILL_INIT_CLASSIFICATION',
    provider: 'gemini',
    model: 'gemini-1.5-pro',
    temperature: 0.1,
    fallbackProvider: 'groq',
    fallbackModel: 'mixtral-8x7b-32768',
    maxDailyTokens: 100000,
    maxMonthlyTokens: 3000000,
  },
  {
    taskType: 'SKILL_INIT_ADAPTIVE_QUESTION',
    provider: 'groq',
    model: 'llama-3.1-8b-instant',
    temperature: 0.5,
    fallbackProvider: 'gemini',
    fallbackModel: 'gemini-1.5-pro',
    maxDailyTokens: 100000,
    maxMonthlyTokens: 3000000,
  },
  {
    taskType: 'SKILL_INIT_SKILLS_EXPLANATOR',
    provider: 'gemini',
    model: 'gemini-1.5-flash-8b',
    temperature: 0.3,
    fallbackProvider: 'groq',
    fallbackModel: 'llama-3.3-70b-versatile',
    maxDailyTokens: 100000,
    maxMonthlyTokens: 3000000,
  },
  {
    taskType: 'SKILL_TAXONOMY_RESOLVER',
    provider: 'gemini',
    model: 'gemini-2.0-flash',
    temperature: 0.1,
    fallbackProvider: 'groq',
    fallbackModel: 'gemma2-9b-it',
    maxDailyTokens: 100000,
    maxMonthlyTokens: 3000000,
  },
  {
    taskType: 'QUIZ_BATCH_EVALUATION',
    provider: 'groq',
    model: 'mixtral-8x7b-32768',
    temperature: 0.3,
    fallbackProvider: 'gemini',
    fallbackModel: 'gemini-2.0-pro-exp-02-05',
    maxDailyTokens: 100000,
    maxMonthlyTokens: 3000000,
  },
];

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
    console.log('Inserting/upserting AI task configurations...');
    for (const config of SEED_AI_TASK_CONFIGS) {
      await prisma.aiTaskConfig.upsert({
        where: { taskType: config.taskType },
        update: config,
        create: config,
      });
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

