import { NextRequest, NextResponse } from 'next/server';
import { prisma, ensureUserColumns } from '@/lib/prisma';

// GET /api/platform/users
// Devolve todos os utilizadores da plataforma com detalhes de estado e RGPD
export async function GET() {
    try {
        await ensureUserColumns();

        const dbUsers = await prisma.user.findMany({
            include: {
                tenant: { select: { id: true, name: true, plan: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        const users = dbUsers.map(u => ({
            id: u.id,
            accountId: u.tenantId || undefined,
            accountName: u.tenant?.name || 'Sem empresa',
            accountPlan: u.tenant?.plan || 'free',
            name: u.name || 'Utilizador',
            email: u.email,
            role: (u.role || 'client_admin') as any,
            status: (u.status || 'active') as any,
            lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : undefined,
            suspendedAt: u.suspendedAt ? u.suspendedAt.toISOString() : undefined,
            suspensionReason: u.suspensionReason || undefined,
            deletedAt: u.deletedAt ? u.deletedAt.toISOString() : undefined,
            createdAt: u.createdAt.toISOString(),
        }));

        return NextResponse.json({ success: true, users });
    } catch (error: any) {
        console.error('[API Platform Users GET] Error:', error);
        return NextResponse.json({ success: false, error: 'Erro ao carregar utilizadores.' }, { status: 500 });
    }
}

// PATCH /api/platform/users
// Gestão de estado do utilizador (suspensão temporária, reativação, ou limpeza em lote por inatividade)
export async function PATCH(req: NextRequest) {
    try {
        await ensureUserColumns();
        const body = await req.json();
        const { action, userId, reason, thresholdDays, cleanupMode } = body;

        // 1. Ação: Suspender Utilizador Individualmente
        if (action === 'suspend') {
            if (!userId) {
                return NextResponse.json({ error: 'ID do utilizador é obrigatório.' }, { status: 400 });
            }

            const target = await prisma.user.findUnique({ where: { id: userId } });
            if (!target) {
                return NextResponse.json({ error: 'Utilizador não encontrado.' }, { status: 404 });
            }
            if (target.role === 'superadmin') {
                return NextResponse.json({ error: 'Não é possível suspender uma conta Super Administrador.' }, { status: 403 });
            }

            const now = new Date();
            const updated = await prisma.user.update({
                where: { id: userId },
                data: {
                    status: 'suspended',
                    suspendedAt: now,
                    suspensionReason: reason || 'Suspensão temporária por decisão administrativa.',
                },
            });

            return NextResponse.json({
                success: true,
                message: `Utilizador ${updated.name || updated.email} suspenso com sucesso.`,
                user: {
                    id: updated.id,
                    status: 'suspended',
                    suspendedAt: now.toISOString(),
                    suspensionReason: updated.suspensionReason,
                },
            });
        }

        // 2. Ação: Reativar Utilizador Suspenso
        if (action === 'reactivate') {
            if (!userId) {
                return NextResponse.json({ error: 'ID do utilizador é obrigatório.' }, { status: 400 });
            }

            const updated = await prisma.user.update({
                where: { id: userId },
                data: {
                    status: 'active',
                    suspendedAt: null,
                    suspensionReason: null,
                },
            });

            return NextResponse.json({
                success: true,
                message: `Acesso do utilizador ${updated.name || updated.email} reativado com sucesso.`,
                user: {
                    id: updated.id,
                    status: 'active',
                    suspendedAt: null,
                    suspensionReason: null,
                },
            });
        }

        // 3. Ação: Auditoria e Limpeza por Inatividade Prolongada (RGPD)
        // Princípio da Limitação da Conservação (Artigo 5.º, n.º 1, al. e) do RGPD)
        if (action === 'cleanup_inactive') {
            const days = Number(thresholdDays) || 180;
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);

            // Procurar utilizadores sem login há mais de X dias (ou criados há mais de X dias sem nunca terem feito login)
            // Ignorando SuperAdmins e contas já eliminadas
            const candidateUsers = await prisma.user.findMany({
                where: {
                    role: { not: 'superadmin' },
                    status: { not: 'deleted' },
                    OR: [
                        { lastLoginAt: { lt: cutoffDate } },
                        { lastLoginAt: null, createdAt: { lt: cutoffDate } },
                    ],
                },
            });

            if (candidateUsers.length === 0) {
                return NextResponse.json({
                    success: true,
                    count: 0,
                    message: `Não foram encontrados utilizadores inativos há mais de ${days} dias.`,
                    affectedUsers: [],
                });
            }

            const now = new Date();
            const affectedIds: string[] = [];

            if (cleanupMode === 'anonymize') {
                // Anonimizar em conformidade com o RGPD
                for (const u of candidateUsers) {
                    const anonEmail = `anonimizado_${u.id.substring(0, 8)}@rgpd.safe`;
                    await prisma.user.update({
                        where: { id: u.id },
                        data: {
                            name: 'Utilizador Removido (Inatividade RGPD)',
                            email: anonEmail,
                            password: null,
                            status: 'deleted',
                            deletedAt: now,
                            avatarUrl: null,
                            image: null,
                        },
                    }).catch(() => {});
                    affectedIds.push(u.id);
                }
            } else {
                // Modo default: Suspender temporariamente por inatividade prolongada
                for (const u of candidateUsers) {
                    await prisma.user.update({
                        where: { id: u.id },
                        data: {
                            status: 'suspended',
                            suspendedAt: now,
                            suspensionReason: `Suspensão preventiva automática: Inatividade superior a ${days} dias (Conformidade RGPD).`,
                        },
                    }).catch(() => {});
                    affectedIds.push(u.id);
                }
            }

            return NextResponse.json({
                success: true,
                count: affectedIds.length,
                mode: cleanupMode || 'suspend',
                message: `${affectedIds.length} utilizador(es) inativo(s) há mais de ${days} dias foram ${cleanupMode === 'anonymize' ? 'anonimizados' : 'suspensos'} com sucesso.`,
                affectedIds,
            });
        }

        return NextResponse.json({ error: 'Ação não reconhecida.' }, { status: 400 });
    } catch (error: any) {
        console.error('[API Platform Users PATCH] Error:', error);
        return NextResponse.json({ error: 'Erro ao processar gestão do utilizador.' }, { status: 500 });
    }
}

// DELETE /api/platform/users
// Apagamento Manual / Direito ao Apagamento (Artigo 17.º RGPD)
export async function DELETE(req: NextRequest) {
    try {
        await ensureUserColumns();
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');
        const mode = searchParams.get('mode') || 'anonymize'; // anonymize | purge
        const reason = searchParams.get('reason') || 'Exercício do Direito ao Esquecimento / Apagamento RGPD';

        if (!userId) {
            return NextResponse.json({ error: 'ID do utilizador é obrigatório.' }, { status: 400 });
        }

        const target = await prisma.user.findUnique({ where: { id: userId } });
        if (!target) {
            return NextResponse.json({ error: 'Utilizador não encontrado.' }, { status: 404 });
        }
        if (target.role === 'superadmin') {
            return NextResponse.json({ error: 'Não é permitido eliminar contas Super Administrador.' }, { status: 403 });
        }

        if (mode === 'purge') {
            // Eliminação definitiva se o utilizador não tiver impedimentos legais
            try {
                // Remover sessões e contas associadas
                await prisma.session.deleteMany({ where: { userId } }).catch(() => {});
                await prisma.account.deleteMany({ where: { userId } }).catch(() => {});
                await prisma.projectMember.deleteMany({ where: { userId } }).catch(() => {});
                await prisma.user.delete({ where: { id: userId } });

                return NextResponse.json({
                    success: true,
                    mode: 'purge',
                    message: `Utilizador ${target.name || target.email} foi permanentemente eliminado da base de dados.`,
                    userId,
                });
            } catch (delErr: any) {
                // Se falhar devido a chaves estrangeiras (ex: relatórios técnicos assinados), recorrer à anonimização segura RGPD
                console.warn('[DELETE user] Falha na purga direta devido a dependências legais; aplicando anonimização RGPD:', delErr?.message);
            }
        }

        // Modo 'anonymize' (Salvaguarda da integridade legal de SST / Art. 17.º, n.º 3, al. b) RGPD)
        const now = new Date();
        const anonEmail = `anonimizado_${userId.substring(0, 8)}@rgpd.safe`;

        await prisma.session.deleteMany({ where: { userId } }).catch(() => {});
        await prisma.account.deleteMany({ where: { userId } }).catch(() => {});
        await prisma.projectMember.deleteMany({ where: { userId } }).catch(() => {});

        const updated = await prisma.user.update({
            where: { id: userId },
            data: {
                name: 'Utilizador Removido (RGPD)',
                email: anonEmail,
                password: null,
                status: 'deleted',
                deletedAt: now,
                suspensionReason: reason,
                avatarUrl: null,
                image: null,
            },
        });

        return NextResponse.json({
            success: true,
            mode: 'anonymize',
            message: `Dados pessoais do utilizador foram anonimizados com sucesso em cumprimento do RGPD.`,
            user: {
                id: updated.id,
                name: updated.name,
                email: updated.email,
                status: 'deleted',
                deletedAt: now.toISOString(),
            },
        });
    } catch (error: any) {
        console.error('[API Platform Users DELETE] Error:', error);
        return NextResponse.json({ error: 'Erro ao eliminar utilizador.' }, { status: 500 });
    }
}
