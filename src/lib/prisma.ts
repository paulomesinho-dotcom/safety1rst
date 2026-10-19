/**
 * Prisma client singleton para Next.js
 * Prisma 7 — usa driver adapter (@prisma/adapter-pg) em vez do engine binary
 *
 * Previne múltiplas instâncias em desenvolvimento (hot reload)
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        // Durante o build estático, DATABASE_URL pode não estar disponível
        // Retornar instância sem conexão activa
        const pool = new Pool({ connectionString: 'postgresql://localhost:5432/placeholder' });
        const adapter = new PrismaPg(pool);
        return new PrismaClient({
            adapter,
            log: ['error'],
        });
    }

    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);

    return new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
}

export const prisma: PrismaClient =
    globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
