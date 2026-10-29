import { NextRequest, NextResponse } from 'next/server';
import { prisma, ensureCompanyInvitationTable } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), '.data');
const INVITATIONS_FILE = path.join(DATA_DIR, 'company_invitations.json');

function getStoredFileInvitations(): any[] {
    try {
        if (fs.existsSync(INVITATIONS_FILE)) {
            const raw = fs.readFileSync(INVITATIONS_FILE, 'utf-8');
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
        }
    } catch (e) {
        console.error('[API Company Invitations] Error reading file:', e);
    }
    return [];
}

function saveStoredFileInvitations(invs: any[]) {
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        fs.writeFileSync(INVITATIONS_FILE, JSON.stringify(invs, null, 2), 'utf-8');
    } catch (e) {
        console.error('[API Company Invitations] Error saving file:', e);
    }
}

// GET /api/platform/company-invitations
// Lista todos os convites de associação a empresas (com persistência híbrida ficheiro + DB)
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const email = searchParams.get('email');
        const accountId = searchParams.get('accountId');

        const fileInvitations = getStoredFileInvitations();
        let dbInvitations: any[] = [];

        try {
            await ensureCompanyInvitationTable();
            const rows: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "company_invitations" ORDER BY "createdAt" DESC`);
            if (Array.isArray(rows)) {
                dbInvitations = rows.map(r => ({
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
            }
        } catch {
            // Se DB estiver inacessível, usamos fileInvitations
        }

        // Combinar convites dando prioridade aos mais atualizados
        const map = new Map<string, any>();
        for (const inv of fileInvitations) {
            map.set(inv.id, inv);
        }
        for (const inv of dbInvitations) {
            map.set(inv.id, inv);
        }

        let combined = Array.from(map.values());

        if (email) {
            const clean = email.toLowerCase().trim();
            combined = combined.filter(i => (i.invitedEmail || '').toLowerCase().trim() === clean);
        } else if (accountId) {
            combined = combined.filter(i => i.accountId === accountId);
        }

        return NextResponse.json({ success: true, invitations: combined });
    } catch (error: any) {
        console.error('[API Company Invitations GET] Error:', error);
        const fallback = getStoredFileInvitations();
        return NextResponse.json({ success: true, invitations: fallback });
    }
}

// POST /api/platform/company-invitations
// Regista um novo convite de associação
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, accountId, accountName, invitedEmail, invitedName, invitedByUserId, invitedByUserName } = body;

        if (!accountId || !accountName || !invitedEmail) {
            return NextResponse.json({ error: 'accountId, accountName e invitedEmail são obrigatórios.' }, { status: 400 });
        }

        const invId = id || `inv_${Date.now()}`;
        const cleanEmail = invitedEmail.toLowerCase().trim();
        const now = new Date();

        const newInv = {
            id: invId,
            accountId,
            accountName,
            invitedEmail: cleanEmail,
            invitedName: invitedName || cleanEmail.split('@')[0],
            invitedByUserId: invitedByUserId || null,
            invitedByUserName: invitedByUserName || null,
            status: 'pending',
            createdAt: now.toISOString(),
        };

        // 1. Guardar em ficheiro permanente (.data)
        const fileInvs = getStoredFileInvitations();
        const existingIdx = fileInvs.findIndex(i => i.id === invId);
        if (existingIdx !== -1) {
            fileInvs[existingIdx] = newInv;
        } else {
            fileInvs.unshift(newInv);
        }
        saveStoredFileInvitations(fileInvs);

        // 2. Tentar guardar na DB PostgreSQL se disponível
        try {
            await ensureCompanyInvitationTable();
            await prisma.$executeRawUnsafe(
                `INSERT INTO "company_invitations"
                ("id", "accountId", "accountName", "invitedEmail", "invitedName", "invitedByUserId", "invitedByUserName", "status", "createdAt")
                VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8)
                ON CONFLICT ("id") DO UPDATE SET "status" = 'pending'`,
                invId, accountId, accountName, cleanEmail, invitedName || null, invitedByUserId || null, invitedByUserName || null, now
            );
        } catch (dbErr) {
            console.warn('[API Company Invitations POST] DB persistence warning (file storage used):', (dbErr as any)?.message);
        }

        return NextResponse.json({
            success: true,
            invitation: newInv
        });
    } catch (error: any) {
        console.error('[API Company Invitations POST] Error:', error);
        return NextResponse.json({ error: 'Erro ao criar convite de empresa.' }, { status: 500 });
    }
}

// PATCH /api/platform/company-invitations
// Atualiza o estado do convite (accepted, rejected, canceled)
export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { invitationId, status } = body;

        if (!invitationId || !['accepted', 'rejected', 'canceled'].includes(status)) {
            return NextResponse.json({ error: 'invitationId e status válido (accepted/rejected/canceled) são obrigatórios.' }, { status: 400 });
        }

        const now = new Date().toISOString();

        // 1. Atualizar em ficheiro permanente (.data)
        const fileInvs = getStoredFileInvitations();
        const target = fileInvs.find(i => i.id === invitationId);
        if (target) {
            target.status = status;
            target.resolvedAt = now;
            saveStoredFileInvitations(fileInvs);
        }

        // 2. Atualizar no PostgreSQL se disponível
        try {
            await ensureCompanyInvitationTable();
            await prisma.$executeRawUnsafe(
                `UPDATE "company_invitations" SET "status" = $1, "resolvedAt" = $2 WHERE "id" = $3`,
                status, new Date(now), invitationId
            );

            if (status === 'accepted' && target) {
                // Não alterar o tenantId primário do utilizador no PostgreSQL para preservar a sua conta pessoal/plano.
                // A associação é estabelecida através do registo na tabela company_invitations.
            }
        } catch (dbErr) {
            console.warn('[API Company Invitations PATCH] DB update warning (file storage used):', (dbErr as any)?.message);
        }

        return NextResponse.json({ success: true, invitationId, status });
    } catch (error: any) {
        console.error('[API Company Invitations PATCH] Error:', error);
        return NextResponse.json({ error: 'Erro ao atualizar estado do convite.' }, { status: 500 });
    }
}
