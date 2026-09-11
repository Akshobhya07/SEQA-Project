import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

export async function connectDb() {
  try {
    await prisma.$connect();
    console.log('[Database] Connected to PostgreSQL successfully.');
  } catch (err) {
    console.error('[Database] Connection failed:', err);
  }
}
