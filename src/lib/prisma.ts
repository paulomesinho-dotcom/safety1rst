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

let tableEnsured = false;
export async function ensureSubscriptionTable() {
    if (tableEnsured) return;
    if (!process.env.DATABASE_URL) return;
    try {
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "subscription_requests" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "companyName" TEXT NOT NULL,
                "nif" TEXT NOT NULL,
                "contactName" TEXT NOT NULL,
                "email" TEXT NOT NULL,
                "phone" TEXT,
                "password" TEXT,
                "plan" TEXT NOT NULL DEFAULT 'basic',
                "status" TEXT NOT NULL DEFAULT 'pending_email',
                "verificationToken" TEXT NOT NULL,
                "emailVerifiedAt" TIMESTAMP(3),
                "reviewedBy" TEXT,
                "reviewedAt" TIMESTAMP(3),
                "rejectionReason" TEXT,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `);
        await prisma.$executeRawUnsafe(`
            CREATE UNIQUE INDEX IF NOT EXISTS "subscription_requests_verificationToken_key" 
            ON "subscription_requests"("verificationToken");
        `);
        tableEnsured = true;
    } catch (e: any) {
        console.warn('[Prisma] ensureSubscriptionTable warning:', e?.message || e);
    }
}

let tokenTableEnsured = false;
export async function ensureVerificationTokenTable() {
    if (tokenTableEnsured) return;
    if (!process.env.DATABASE_URL) return;
    try {
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "verification_tokens" (
                "identifier" TEXT NOT NULL,
                "token" TEXT NOT NULL,
                "expires" TIMESTAMP(3) NOT NULL
            );
        `);
        await prisma.$executeRawUnsafe(`
            CREATE UNIQUE INDEX IF NOT EXISTS "verification_tokens_token_key" 
            ON "verification_tokens"("token");
        `);
        await prisma.$executeRawUnsafe(`
            CREATE UNIQUE INDEX IF NOT EXISTS "verification_tokens_identifier_token_key" 
            ON "verification_tokens"("identifier", "token");
        `);
        tokenTableEnsured = true;
    } catch (e: any) {
        console.warn('[Prisma] ensureVerificationTokenTable warning:', e?.message || e);
    }
}

let userColumnsEnsured = false;
export async function ensureUserColumns() {
    if (userColumnsEnsured) return;
    if (!process.env.DATABASE_URL) return;
    try {
        await prisma.$executeRawUnsafe(`
            ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'active';
            ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);
            ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMP(3);
            ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "suspensionReason" TEXT;
            ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
        `);
        userColumnsEnsured = true;
    } catch (e: any) {
        console.warn('[Prisma] ensureUserColumns warning:', e?.message || e);
    }
}

let projectRequestTableEnsured = false;
export async function ensureProjectRequestTable() {
    if (projectRequestTableEnsured) return;
    if (!process.env.DATABASE_URL) return;
    try {
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "project_access_requests" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "userId" TEXT NOT NULL,
                "userName" TEXT,
                "userEmail" TEXT,
                "projectId" TEXT NOT NULL,
                "projectName" TEXT,
                "companyId" TEXT,
                "companyName" TEXT,
                "nif" TEXT,
                "status" TEXT NOT NULL DEFAULT 'pending',
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            ALTER TABLE "project_access_requests" ADD COLUMN IF NOT EXISTS "purpose" TEXT;
            ALTER TABLE "project_access_requests" ADD COLUMN IF NOT EXISTS "accessType" TEXT;
            ALTER TABLE "project_access_requests" ADD COLUMN IF NOT EXISTS "contractWithCompanyId" TEXT;
            ALTER TABLE "project_access_requests" ADD COLUMN IF NOT EXISTS "contractWithCompanyName" TEXT;
            ALTER TABLE "project_access_requests" ADD COLUMN IF NOT EXISTS "isNewCompanyDraft" BOOLEAN;
        `);
        projectRequestTableEnsured = true;
    } catch (e: any) {
        console.warn('[Prisma] ensureProjectRequestTable warning:', e?.message || e);
    }
}

let companyInvitationTableEnsured = false;
export async function ensureCompanyInvitationTable() {
    if (companyInvitationTableEnsured) return;
    if (!process.env.DATABASE_URL) return;
    try {
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "company_invitations" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "accountId" TEXT NOT NULL,
                "accountName" TEXT NOT NULL,
                "invitedEmail" TEXT NOT NULL,
                "invitedName" TEXT,
                "invitedByUserId" TEXT,
                "invitedByUserName" TEXT,
                "status" TEXT NOT NULL DEFAULT 'pending',
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "resolvedAt" TIMESTAMP(3)
            );
            CREATE INDEX IF NOT EXISTS "idx_company_invitations_email" ON "company_invitations" ("invitedEmail");
            CREATE INDEX IF NOT EXISTS "idx_company_invitations_account" ON "company_invitations" ("accountId");
        `);
        companyInvitationTableEnsured = true;
    } catch (e: any) {
        console.warn('[Prisma] ensureCompanyInvitationTable warning:', e?.message || e);
    }
}

export default prisma;


