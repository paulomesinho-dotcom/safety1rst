import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { executeServerCdeAction } from '@/lib/server-cde';

// POST /api/projects/[id]/cde/action
// Executa ações de ficheiros/pastas no CDE 100% no servidor com credenciais encriptadas
export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: projectId } = await context.params;
        const session = await auth();

        // Verificação de autenticação: utilizador tem de ter acesso ao projeto
        if (session?.user) {
            const role = (session.user as any).role;
            if (role !== 'superadmin' && role !== 'admin') {
                const member = await prisma.projectMember.findUnique({
                    where: { projectId_userId: { projectId, userId: session.user.id! } }
                });
                if (!member) {
                    return NextResponse.json({ error: 'Acesso negado: utilizador não pertence a esta obra.' }, { status: 403 });
                }
            }
        }

        const body = await req.json();
        const { action, payload } = body;

        if (!action) {
            return NextResponse.json({ error: 'Ação CDE obrigatória.' }, { status: 400 });
        }

        const result = await executeServerCdeAction(projectId, action, payload || {});
        return NextResponse.json({ success: true, result });
    } catch (err: any) {
        console.error('[API CDE ACTION] Error:', err);
        return NextResponse.json({ error: err.message || 'Erro ao executar operação no CDE.' }, { status: 500 });
    }
}
