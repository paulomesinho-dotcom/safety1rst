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
            select: { id: true, cdeConfig: true }
        });

        if (!project) {
            return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 });
        }

        const sanitized = sanitizeCdeConfig(project.cdeConfig);
        return NextResponse.json({ success: true, config: sanitized });
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
                const member = await prisma.projectMember.findUnique({
                    where: { projectId_userId: { projectId, userId: session.user.id! } }
                });
                if (!member || member.role !== 'manager') {
                    return NextResponse.json({ error: 'Apenas o Manager da obra pode desligar o CDE.' }, { status: 403 });
                }
            }
        }

        const sanitized = await disconnectProjectCde(projectId);
        return NextResponse.json({ success: true, message: 'CDE desligado com sucesso.', config: sanitized });
    } catch (err: any) {
        console.error('[API CDE DELETE] Error:', err);
        return NextResponse.json({ error: err.message || 'Erro ao desligar CDE' }, { status: 500 });
    }
}
