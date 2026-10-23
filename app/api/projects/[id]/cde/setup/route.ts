import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { saveProjectCdeConfig } from '@/lib/server-cde';

// POST /api/projects/[id]/cde/setup
// Recebe as credenciais do Manager, valida, encripta no servidor com AES-256 e guarda na BD
export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: projectId } = await context.params;
        const session = await auth();

        // Verificação RBAC: Apenas Manager ou Admin podem configurar o CDE
        if (session?.user) {
            const role = (session.user as any).role;
            if (role !== 'superadmin' && role !== 'admin') {
                const member = await prisma.projectMember.findUnique({
                    where: { projectId_userId: { projectId, userId: session.user.id! } }
                });
                if (!member || member.role !== 'manager') {
                    return NextResponse.json({ 
                        error: 'Permissão negada. Apenas o Gestor (Manager) da obra pode configurar as integrações CDE.' 
                    }, { status: 403 });
                }
            }
        }

        const body = await req.json();
        const { provider } = body;

        if (!provider || !['onedrive', 'dropbox', 'gdrive', 'local'].includes(provider)) {
            return NextResponse.json({ error: 'Fornecedor de CDE inválido.' }, { status: 400 });
        }

        // Validação básica por fornecedor
        if (provider === 'onedrive') {
            if (!body.tenantId || !body.clientId || !body.siteUrl) {
                return NextResponse.json({ error: 'SharePoint requer Tenant ID, Client ID e Site URL.' }, { status: 400 });
            }
        } else if (provider === 'dropbox') {
            if (!body.appKey) {
                return NextResponse.json({ error: 'Dropbox requer a App Key.' }, { status: 400 });
            }
        }

        // Guarda com encriptação AES-256 no PostgreSQL
        const sanitized = await saveProjectCdeConfig(projectId, {
            ...body,
            connected: true,
            lastSync: new Date().toISOString()
        });

        return NextResponse.json({
            success: true,
            message: 'Configuração de CDE gravada e encriptada com sucesso no servidor!',
            config: sanitized
        });
    } catch (err: any) {
        console.error('[API CDE SETUP] Error:', err);
        return NextResponse.json({ error: err.message || 'Erro ao configurar CDE no servidor.' }, { status: 500 });
    }
}
