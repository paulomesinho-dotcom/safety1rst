import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma, ensureUserColumns } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET /api/platform/users
// Devolve todos os utilizadores da plataforma com detalhes de estado, projetos ativos e proteções RGPD
export async function GET() {
    try {
        await ensureUserColumns();

        const dbUsers = await prisma.user.findMany({
            include: {
                tenant: { 
                    select: { 
                        id: true, 
                        name: true, 
                        plan: true,
                        projects: { where: { status: 'active' } }
                    } 
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        const users = dbUsers.map(u => {
            const activeProjectsCount = u.tenant?.projects?.length || 0;
            const isPaidPlan = u.tenant?.plan && u.tenant.plan !== 'free';

            return {
                id: u.id,
                accountId: u.tenantId || undefined,
                accountName: u.tenant?.name || 'Sem empresa',
                accountPlan: u.tenant?.plan || 'free',
                isPaidPlan: !!isPaidPlan,
                activeProjectsCount,
                hasActiveProjects: activeProjectsCount > 0,
                name: u.name || 'Utilizador',
                email: u.email,
                role: (u.role || 'client_admin') as any,
                status: (u.status || 'active') as any,
                lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : undefined,
                suspendedAt: u.suspendedAt ? u.suspendedAt.toISOString() : undefined,
                suspensionReason: u.suspensionReason || undefined,
                deletedAt: u.deletedAt ? u.deletedAt.toISOString() : undefined,
                createdAt: u.createdAt.toISOString(),
            };
        });

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
            if (target.role === 'admin') {
                const session = await auth();
                const requesterRole = (session?.user as any)?.role;
                if (requesterRole !== 'superadmin') {
                    return NextResponse.json({ error: 'Permissão negada. Apenas o Super Administrador pode suspender Administradores da plataforma.' }, { status: 403 });
                }
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
        // Regra Estrita: Aplica-se APENAS a utilizadores FREE.
        // Utilizadores de contas pagas e criadores de obras ativas NUNCA são apagados.
        if (action === 'cleanup_inactive') {
            const days = Number(thresholdDays) || 180;
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);

            // Procurar utilizadores inativos APENAS de contas 'free' (ou sem conta)
            const candidateUsers = await prisma.user.findMany({
                where: {
                    role: { not: 'superadmin' },
                    status: { not: 'deleted' },
                    OR: [
                        { tenant: { plan: 'free' } },
                        { tenantId: null },
                    ],
                    AND: [
                        {
                            OR: [
                                { lastLoginAt: { lt: cutoffDate } },
                                { lastLoginAt: null, createdAt: { lt: cutoffDate } },
                            ],
                        },
                    ],
                },
                include: {
                    tenant: {
                        include: {
                            projects: { where: { status: 'active' } },
                            users: { where: { status: { not: 'deleted' } } },
                        },
                    },
                },
            });

            // Proteção contra exclusão de criadores de obras ativas
            const safeToCleanupUsers = candidateUsers.filter(u => {
                const activeProjects = u.tenant?.projects || [];
                return activeProjects.length === 0;
            });

            if (safeToCleanupUsers.length === 0) {
                return NextResponse.json({
                    success: true,
                    count: 0,
                    message: `Nenhum utilizador gratuito inativo elegível (utilizadores de contas pagas e criadores de obras ativas estão salvaguardados).`,
                    affectedUsers: [],
                });
            }

            const now = new Date();
            const affectedIds: string[] = [];
            const deletedTenantIds: string[] = [];

            if (cleanupMode === 'anonymize') {
                // Anonimizar em conformidade com o RGPD
                for (const u of safeToCleanupUsers) {
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

                    // Verificar se a conta do cliente ficou sem utilizadores ativos
                    if (u.tenantId && u.tenant) {
                        const remaining = (u.tenant.users || []).filter(usr => usr.id !== u.id && usr.status !== 'deleted');
                        if (remaining.length === 0 && u.tenant.plan === 'free') {
                            await prisma.tenant.delete({ where: { id: u.tenantId } }).catch(() => {});
                            deletedTenantIds.push(u.tenantId);
                        }
                    }
                }
            } else {
                // Modo default: Suspender temporariamente por inatividade prolongada
                for (const u of safeToCleanupUsers) {
                    await prisma.user.update({
                        where: { id: u.id },
                        data: {
                            status: 'suspended',
                            suspendedAt: now,
                            suspensionReason: `Suspensão preventiva: Inatividade superior a ${days} dias (Conformidade RGPD).`,
                        },
                    }).catch(() => {});
                    affectedIds.push(u.id);
                }
            }

            return NextResponse.json({
                success: true,
                count: affectedIds.length,
                mode: cleanupMode || 'suspend',
                message: `${affectedIds.length} utilizador(es) gratuito(s) inativo(s) há mais de ${days} dias foram ${cleanupMode === 'anonymize' ? 'anonimizados' : 'suspensos'} com sucesso. Contas pagas e obras ativas foram preservadas.`,
                affectedIds,
                deletedTenantIds,
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
// Com proteção de contas pagas, salvaguarda de obras ativas e sincronização de contas órfãs
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

        const target = await prisma.user.findUnique({ 
            where: { id: userId },
            include: {
                tenant: {
                    include: {
                        projects: { where: { status: 'active' } },
                        users: { where: { status: { not: 'deleted' } } },
                    },
                },
            },
        });

        if (!target) {
            return NextResponse.json({ error: 'Utilizador não encontrado.' }, { status: 404 });
        }
        if (target.role === 'superadmin') {
            return NextResponse.json({ error: 'Não é permitido eliminar contas Super Administrador.' }, { status: 403 });
        }
        if (target.role === 'admin') {
            const session = await auth();
            const requesterRole = (session?.user as any)?.role;
            if (requesterRole !== 'superadmin') {
                return NextResponse.json({ error: 'Permissão negada. Administradores da plataforma não podem eliminar outros administradores. Apenas o Super Administrador tem essa permissão.' }, { status: 403 });
            }
        }

        // 1. Regra do Algoritmo: Contas pagas NUNCA podem ser apagadas via inatividade/RGPD direto
        if (target.tenant && target.tenant.plan !== 'free') {
            return NextResponse.json({
                error: `Esta conta possui uma subscrição PAGA ativa (${target.tenant.plan.toUpperCase()}). Contas com subscrição contratada estão protegidas. Altere primeiro o plano para Gratuito se pretender cancelar o serviço antes de apagar o utilizador.`,
                protectionReason: 'paid_subscription',
            }, { status: 400 });
        }

        // 2. Regra do Algoritmo: Utilizadores proprietários/criadores de obras ativas NÃO podem ser apagados
        const activeProjects = target.tenant?.projects || [];
        if (activeProjects.length > 0) {
            const projectNames = activeProjects.map(p => `"${p.name}"`).join(', ');
            return NextResponse.json({
                error: `Impossível apagar este utilizador: A sua empresa é criadora/proprietária de ${activeProjects.length} obra(s) ativa(s): ${projectNames}. O encerramento ou transferência da obra é obrigatório antes de apagar, caso contrário o projeto seria destruído.`,
                protectionReason: 'active_projects',
                activeProjects: activeProjects.map(p => ({ id: p.id, name: p.name })),
            }, { status: 400 });
        }

        let deletedAccountId: string | null = null;
        const tenantId = target.tenantId;

        // 3. Execução da remoção
        if (mode === 'purge') {
            try {
                await prisma.session.deleteMany({ where: { userId } }).catch(() => {});
                await prisma.account.deleteMany({ where: { userId } }).catch(() => {});
                await prisma.projectMember.deleteMany({ where: { userId } }).catch(() => {});
                await prisma.user.delete({ where: { id: userId } });

                // Se o utilizador era o único membro da conta Free, apagar a conta da empresa para não ficar órfã
                if (tenantId && target.tenant) {
                    const remainingUsers = target.tenant.users.filter(u => u.id !== userId);
                    if (remainingUsers.length === 0 && target.tenant.plan === 'free') {
                        await prisma.company.deleteMany({ where: { tenantId } }).catch(() => {});
                        await prisma.worker.deleteMany({ where: { tenantId } }).catch(() => {});
                        await prisma.equipment.deleteMany({ where: { tenantId } }).catch(() => {});
                        await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => {});
                        deletedAccountId = tenantId;
                    }
                }

                return NextResponse.json({
                    success: true,
                    mode: 'purge',
                    message: `Utilizador ${target.name || target.email} foi permanentemente eliminado.${deletedAccountId ? ' A respetiva conta de cliente órfã foi também removida.' : ''}`,
                    userId,
                    deletedAccountId,
                });
            } catch (delErr: any) {
                console.warn('[DELETE user] Recorrendo à anonimização segura RGPD:', delErr?.message);
            }
        }

        // Modo 'anonymize'
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

        // Se o utilizador era o único da conta Free, eliminar ou anonimizar o tenant
        if (tenantId && target.tenant) {
            const remainingUsers = target.tenant.users.filter(u => u.id !== userId);
            if (remainingUsers.length === 0 && target.tenant.plan === 'free') {
                await prisma.company.deleteMany({ where: { tenantId } }).catch(() => {});
                await prisma.worker.deleteMany({ where: { tenantId } }).catch(() => {});
                await prisma.equipment.deleteMany({ where: { tenantId } }).catch(() => {});
                await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => {});
                deletedAccountId = tenantId;
            }
        }

        return NextResponse.json({
            success: true,
            mode: 'anonymize',
            message: `Dados pessoais do utilizador anonimizados com sucesso.${deletedAccountId ? ' A respetiva conta de cliente órfã foi também removida.' : ''}`,
            user: {
                id: updated.id,
                name: updated.name,
                email: updated.email,
                status: 'deleted',
                deletedAt: now.toISOString(),
            },
            deletedAccountId,
        });
    } catch (error: any) {
        console.error('[API Platform Users DELETE] Error:', error);
        return NextResponse.json({ error: 'Erro ao eliminar utilizador.' }, { status: 500 });
    }
}

// POST /api/platform/users
// Cria ou sincroniza um utilizador na base de dados central PostgreSQL
export async function POST(req: NextRequest) {
    try {
        await ensureUserColumns();
        const body = await req.json();
        const { id, name, email, password, role, accountId, status } = body;

        const cleanEmail = (email || '').trim().toLowerCase();
        if (!cleanEmail) {
            return NextResponse.json({ error: 'O email é obrigatório.' }, { status: 400 });
        }

        // Restrição de hierarquia: Apenas o Super Administrador pode criar Administradores da plataforma
        if (role === 'admin' || role === 'superadmin') {
            const session = await auth();
            const requesterRole = (session?.user as any)?.role;
            if (requesterRole !== 'superadmin') {
                return NextResponse.json({ error: 'Permissão negada. Apenas o Super Administrador pode criar ou nomear Administradores da aplicação.' }, { status: 403 });
            }
        }

        let tenantId = accountId;
        if (tenantId) {
            const tenantExists = await prisma.tenant.findUnique({ where: { id: tenantId } }).catch(() => null);
            if (!tenantExists) {
                tenantId = undefined;
            }
        }

        let hashedPassword: string | undefined = undefined;
        if (password) {
            if (password.startsWith('$2a$') || password.startsWith('$2b$')) {
                hashedPassword = password;
            } else {
                hashedPassword = await bcrypt.hash(password, 10);
            }
        }

        const userId = id || `usr_${Date.now()}`;
        const dbUser = await prisma.user.upsert({
            where: { email: cleanEmail },
            update: {
                name: name || undefined,
                role: role || undefined,
                tenantId: tenantId || undefined,
                password: hashedPassword || undefined,
                status: status || 'active',
                emailVerified: new Date(),
            },
            create: {
                id: userId,
                name: name || 'Utilizador',
                email: cleanEmail,
                password: hashedPassword,
                role: role || 'client_admin',
                tenantId: tenantId,
                status: status || 'active',
                emailVerified: new Date(),
            },
        });

        return NextResponse.json({
            success: true,
            user: {
                id: dbUser.id,
                accountId: dbUser.tenantId || undefined,
                name: dbUser.name || 'Utilizador',
                email: dbUser.email,
                role: dbUser.role as any,
                status: dbUser.status as any,
                createdAt: dbUser.createdAt.toISOString(),
            }
        });
    } catch (error: any) {
        console.error('[API Platform Users POST] Error:', error);
        return NextResponse.json({ error: 'Erro ao criar utilizador no servidor.' }, { status: 500 });
    }
}
