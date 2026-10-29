import { NextRequest, NextResponse } from 'next/server';
import { prisma, ensureCompanyInvitationTable } from '@/lib/prisma';

// GET /api/platform/company-invitations
// Lista todos os convites de associação a empresas
export async function GET(req: NextRequest) {
    try {
        await ensureCompanyInvitationTable();
        const { searchParams } = new URL(req.url);
        const email = searchParams.get('email');
        const accountId = searchParams.get('accountId');

        let rows: any[] = [];
        try {
            if (email) {
                const cleanEmail = email.toLowerCase().trim();
                rows = await prisma.$queryRawUnsafe(
                    `SELECT * FROM "company_invitations" WHERE LOWER(TRIM("invitedEmail")) = $1 ORDER BY "createdAt" DESC`,
                    cleanEmail
                );
            } else if (accountId) {
                rows = await prisma.$queryRawUnsafe(
                    `SELECT * FROM "company_invitations" WHERE "accountId" = $1 ORDER BY "createdAt" DESC`,
                    accountId
                );
            } else {
                rows = await prisma.$queryRawUnsafe(
                    `SELECT * FROM "company_invitations" ORDER BY "createdAt" DESC`
                );
            }
        } catch {
            rows = [];
        }

        const invitations = rows.map(r => ({
            id: r.id,
            accountId: r.accountId,
            accountName: r.accountName,
            invitedEmail: r.invitedEmail,
            invitedName: r.invitedName || undefined,
            invitedByUserId: r.invitedByUserId || undefined,
            invitedByUserName: r.invitedByUserName || undefined,
            status: r.status,
            createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
            resolvedAt: r.resolvedAt ? new Date(r.resolvedAt).toISOString() : undefined,
        }));

        return NextResponse.json({ success: true, invitations });
    } catch (error: any) {
        console.error('[API Company Invitations GET] Error:', error);
        return NextResponse.json({ success: false, error: 'Erro ao listar convites de empresa.' }, { status: 500 });
    }
}

// POST /api/platform/company-invitations
// Regista um novo convite de associação na base de dados central
export async function POST(req: NextRequest) {
    try {
        await ensureCompanyInvitationTable();
        const body = await req.json();
        const { id, accountId, accountName, invitedEmail, invitedName, invitedByUserId, invitedByUserName } = body;

        if (!accountId || !accountName || !invitedEmail) {
            return NextResponse.json({ error: 'accountId, accountName e invitedEmail são obrigatórios.' }, { status: 400 });
        }

        const invId = id || `inv_${Date.now()}`;
        const cleanEmail = invitedEmail.toLowerCase().trim();
        const now = new Date();

        await prisma.$executeRawUnsafe(
            `INSERT INTO "company_invitations"
            ("id", "accountId", "accountName", "invitedEmail", "invitedName", "invitedByUserId", "invitedByUserName", "status", "createdAt")
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8)
            ON CONFLICT ("id") DO UPDATE SET "status" = 'pending'`,
            invId, accountId, accountName, cleanEmail, invitedName || null, invitedByUserId || null, invitedByUserName || null, now
        );

        return NextResponse.json({
            success: true,
            invitation: {
                id: invId,
                accountId,
                accountName,
                invitedEmail: cleanEmail,
                invitedName,
                invitedByUserId,
                invitedByUserName,
                status: 'pending',
                createdAt: now.toISOString(),
            }
        });
    } catch (error: any) {
        console.error('[API Company Invitations POST] Error:', error);
        return NextResponse.json({ error: 'Erro ao criar convite de empresa.' }, { status: 500 });
    }
}

// PATCH /api/platform/company-invitations
// Atualiza o estado do convite (accepted, rejected, canceled) e associa o utilizador ao tenant se accepted
export async function PATCH(req: NextRequest) {
    try {
        await ensureCompanyInvitationTable();
        const body = await req.json();
        const { invitationId, status } = body;

        if (!invitationId || !['accepted', 'rejected', 'canceled'].includes(status)) {
            return NextResponse.json({ error: 'invitationId e status válido (accepted/rejected/canceled) são obrigatórios.' }, { status: 400 });
        }

        const now = new Date();
        await prisma.$executeRawUnsafe(
            `UPDATE "company_invitations" SET "status" = $1, "resolvedAt" = $2 WHERE "id" = $3`,
            status, now, invitationId
        );

        // Se aceite, associar o utilizador à empresa (tenantId) no PostgreSQL
        if (status === 'accepted') {
            try {
                const rows: any[] = await prisma.$queryRawUnsafe(
                    `SELECT * FROM "company_invitations" WHERE "id" = $1 LIMIT 1`,
                    invitationId
                );
                if (rows && rows.length > 0) {
                    const inv = rows[0];
                    const cleanEmail = String(inv.invitedEmail).toLowerCase().trim();
                    await prisma.$executeRawUnsafe(
                        `UPDATE "User" SET "tenantId" = $1 WHERE LOWER(TRIM("email")) = $2`,
                        inv.accountId, cleanEmail
                    );
                }
            } catch (userErr) {
                console.warn('[API Company Invitations PATCH] Could not update user tenantId in PostgreSQL:', userErr);
            }
        }

        return NextResponse.json({ success: true, invitationId, status });
    } catch (error: any) {
        console.error('[API Company Invitations PATCH] Error:', error);
        return NextResponse.json({ error: 'Erro ao atualizar estado do convite.' }, { status: 500 });
    }
}
