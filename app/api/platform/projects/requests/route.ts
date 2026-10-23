import { NextRequest, NextResponse } from 'next/server';
import { prisma, ensureProjectRequestTable } from '@/lib/prisma';

// GET /api/platform/projects/requests
// Lista todos os pedidos de adesão a projetos
export async function GET(req: NextRequest) {
    try {
        await ensureProjectRequestTable();
        const { searchParams } = new URL(req.url);
        const projectId = searchParams.get('projectId');
        const userId = searchParams.get('userId');

        let rows: any[] = [];
        try {
            if (projectId) {
                rows = await prisma.$queryRawUnsafe(
                    `SELECT * FROM "project_access_requests" WHERE "projectId" = $1 ORDER BY "createdAt" DESC`,
                    projectId
                );
            } else if (userId) {
                rows = await prisma.$queryRawUnsafe(
                    `SELECT * FROM "project_access_requests" WHERE "userId" = $1 ORDER BY "createdAt" DESC`,
                    userId
                );
            } else {
                rows = await prisma.$queryRawUnsafe(
                    `SELECT * FROM "project_access_requests" ORDER BY "createdAt" DESC`
                );
            }
        } catch {
            rows = [];
        }

        const requests = rows.map(r => ({
            id: r.id,
            userId: r.userId,
            userName: r.userName || undefined,
            userEmail: r.userEmail || undefined,
            projectId: r.projectId,
            projectName: r.projectName || undefined,
            companyId: r.companyId || undefined,
            companyName: r.companyName || undefined,
            nif: r.nif || undefined,
            purpose: r.purpose || undefined,
            accessType: r.accessType || undefined,
            contractWithCompanyId: r.contractWithCompanyId || undefined,
            contractWithCompanyName: r.contractWithCompanyName || undefined,
            isNewCompanyDraft: r.isNewCompanyDraft || undefined,
            status: r.status,
            createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
        }));

        return NextResponse.json({ success: true, requests });
    } catch (error: any) {
        console.error('[API Project Requests GET] Error:', error);
        return NextResponse.json({ success: false, error: 'Erro ao listar pedidos de projetos.' }, { status: 500 });
    }
}

// POST /api/platform/projects/requests
// Cria um novo pedido de adesão a uma obra no PostgreSQL
export async function POST(req: NextRequest) {
    try {
        await ensureProjectRequestTable();
        const body = await req.json();
        const { id, userId, userName, userEmail, projectId, projectName, companyId, companyName, nif, purpose, accessType, contractWithCompanyId, contractWithCompanyName, isNewCompanyDraft } = body;

        if (!userId || !projectId) {
            return NextResponse.json({ error: 'userId e projectId são obrigatórios.' }, { status: 400 });
        }

        const reqId = id || `pr_${Date.now()}`;
        const now = new Date();

        await prisma.$executeRawUnsafe(
            `INSERT INTO "project_access_requests" 
            ("id", "userId", "userName", "userEmail", "projectId", "projectName", "companyId", "companyName", "nif", "purpose", "accessType", "contractWithCompanyId", "contractWithCompanyName", "isNewCompanyDraft", "status", "createdAt", "updatedAt")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'pending', $15, $15)
            ON CONFLICT ("id") DO UPDATE SET "status" = 'pending', "updatedAt" = $15`,
            reqId, userId, userName || null, userEmail || null, projectId, projectName || null, companyId || null, companyName || null, nif || null, purpose || null, accessType || null, contractWithCompanyId || null, contractWithCompanyName || null, !!isNewCompanyDraft, now
        );

        return NextResponse.json({
            success: true,
            request: {
                id: reqId,
                userId,
                userName,
                userEmail,
                projectId,
                projectName,
                companyId,
                companyName,
                nif,
                purpose,
                accessType,
                contractWithCompanyId,
                contractWithCompanyName,
                isNewCompanyDraft: !!isNewCompanyDraft,
                status: 'pending',
                createdAt: now.toISOString(),
            }
        });
    } catch (error: any) {
        console.error('[API Project Requests POST] Error:', error);
        return NextResponse.json({ error: 'Erro ao criar pedido de adesão.' }, { status: 500 });
    }
}

// PATCH /api/platform/projects/requests
// Aprova ou rejeita um pedido de adesão a projeto
export async function PATCH(req: NextRequest) {
    try {
        await ensureProjectRequestTable();
        const body = await req.json();
        const { requestId, status, role = 'none' } = body;

        if (!requestId || !['approved', 'rejected'].includes(status)) {
            return NextResponse.json({ error: 'requestId e status (approved/rejected) válidos são obrigatórios.' }, { status: 400 });
        }

        const now = new Date();
        await prisma.$executeRawUnsafe(
            `UPDATE "project_access_requests" SET "status" = $1, "updatedAt" = $2 WHERE "id" = $3`,
            status, now, requestId
        );

        // Se aprovado, vincular o membro na base de dados PostgreSQL
        if (status === 'approved') {
            try {
                const reqRows: any[] = await prisma.$queryRawUnsafe(
                    `SELECT * FROM "project_access_requests" WHERE "id" = $1 LIMIT 1`,
                    requestId
                );
                if (reqRows && reqRows.length > 0) {
                    const r = reqRows[0];
                    const existingMember = await prisma.projectMember.findFirst({
                        where: { projectId: r.projectId, userId: r.userId }
                    });
                    if (!existingMember) {
                        const assignedRole = role || 'none';
                        await prisma.projectMember.create({
                            data: {
                                projectId: r.projectId,
                                userId: r.userId,
                                role: assignedRole,
                                allowedModules: assignedRole === 'none' ? [] : ['general', 'safety', 'access', 'training', 'quality', 'environment', 'cde'],
                                companyIds: r.companyId ? [r.companyId] : []
                            }
                        });
                    }
                }
            } catch (memberErr) {
                console.warn('[API Project Requests PATCH] Could not link project member in PostgreSQL:', memberErr);
            }
        }

        return NextResponse.json({ success: true, requestId, status });
    } catch (error: any) {
        console.error('[API Project Requests PATCH] Error:', error);
        return NextResponse.json({ error: 'Erro ao atualizar pedido de adesão.' }, { status: 500 });
    }
}
