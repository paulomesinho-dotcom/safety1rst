import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getProjectCdeConfig, disconnectProjectCde } from '@/lib/server-cde';
import { sanitizeCdeConfig } from '@/lib/server-crypto';

// GET /api/projects/[id]/cde
// Devolve o estado seguro do CDE sem NUNCA expor segredos ou tokens
export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: projectId } = await context.params;
        if (!projectId) {
            return NextResponse.json({ error: 'ID do projeto obrigatório' }, { status: 400 });
        }

        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: { id: true, cdeConfig: true, tenantId: true }
        });

        if (project) {
            const raw = project.cdeConfig as Record<string, any> | null;
            if (raw && (raw.connected || raw.provider)) {
                const sanitized = sanitizeCdeConfig(project.cdeConfig);
                return NextResponse.json({ success: true, config: sanitized, cdeConfig: sanitized });
            }

            if (project.tenantId) {
                const tenantCompany = await prisma.company.findFirst({
                    where: { tenantId: project.tenantId },
                    select: { id: true, customDocuments: true }
                });
                if (tenantCompany && tenantCompany.customDocuments) {
                    const cd = (tenantCompany.customDocuments as Record<string, any>) || {};
                    const rawComp = cd.__cdeConfig || (cd.provider ? cd : null);
                    if (rawComp && (rawComp.connected || rawComp.provider)) {
                        const sanitized = sanitizeCdeConfig(rawComp);
                        return NextResponse.json({ success: true, config: sanitized, cdeConfig: sanitized });
                    }
                }
            }

            const sanitized = sanitizeCdeConfig(project.cdeConfig);
            return NextResponse.json({ success: true, config: sanitized, cdeConfig: sanitized });
        }

        const company = await prisma.company.findUnique({
            where: { id: projectId },
            select: { id: true, customDocuments: true }
        });

        if (company) {
            const cd = (company.customDocuments as Record<string, any>) || {};
            const sanitized = sanitizeCdeConfig(cd.__cdeConfig || (cd.provider ? cd : {}));
            return NextResponse.json({ success: true, config: sanitized, cdeConfig: sanitized });
        }

        return NextResponse.json({
            success: true,
            config: { provider: null, connected: false },
            cdeConfig: { provider: null, connected: false }
        });
    } catch (err: any) {
        console.error('[API CDE GET] Error:', err);
        return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
    }
}

// DELETE /api/projects/[id]/cde
// Desliga o CDE e apaga permanentemente as chaves secretas do projeto
export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: projectId } = await context.params;
        const session = await auth();

        // Se houver sessão ativa, validar permissões de Manager
        if (session?.user) {
            const role = (session.user as any).role;
            if (role !== 'superadmin' && role !== 'admin') {
                const project = await prisma.project.findUnique({ where: { id: projectId } });
                if (project) {
                    const member = await prisma.projectMember.findUnique({
                        where: { projectId_userId: { projectId, userId: session.user.id! } }
                    });
                    if (!member || member.role !== 'manager') {
                        return NextResponse.json({ error: 'Apenas o Manager da obra pode desligar o CDE.' }, { status: 403 });
                    }
                } else {
                    const company = await prisma.company.findUnique({ where: { id: projectId } });
                    if (company) {
                        const user = await prisma.user.findUnique({ where: { id: session.user.id! } });
                        if (user?.tenantId !== company.tenantId && (session.user as any).accountId !== company.tenantId) {
                            return NextResponse.json({ error: 'Permissão negada para esta empresa.' }, { status: 403 });
                        }
                    }
                }
            }
        }

        const sanitized = await disconnectProjectCde(projectId);
        return NextResponse.json({ success: true, message: 'CDE desligado com sucesso.', config: sanitized, cdeConfig: sanitized });
    } catch (err: any) {
        console.error('[API CDE DELETE] Error:', err);
        return NextResponse.json({ error: err.message || 'Erro ao desligar CDE' }, { status: 500 });
    }
}
