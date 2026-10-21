import { NextRequest, NextResponse } from 'next/server';
import { prisma, ensureSubscriptionTable, ensureUserColumns } from '@/lib/prisma';

// GET /api/platform/clients
// Retorna todos os Tenants, Users e SubscriptionRequests da base de dados PostgreSQL
export async function GET() {
    try {
        await ensureSubscriptionTable();
        await ensureUserColumns();

        const [tenants, dbUsers, requests] = await Promise.all([
            prisma.tenant.findMany({
                include: { 
                    users: true,
                    projects: true,
                },
                orderBy: { createdAt: 'desc' },
            }).catch(() => []),
            prisma.user.findMany({
                orderBy: { createdAt: 'desc' },
            }).catch(() => []),
            prisma.subscriptionRequest.findMany({
                orderBy: { createdAt: 'desc' },
            }).catch(() => []),
        ]);

        const accounts = tenants.map(t => {
            // Filtrar utilizadores que não estejam eliminados
            const activeUsersInTenant = (t.users || []).filter(u => u.status !== 'deleted');
            const primaryUser = activeUsersInTenant[0] || t.users?.[0];
            const matchingReq = requests.find(r => r.email === primaryUser?.email || r.companyName === t.name);
            const activeProjectsCount = (t.projects || []).filter(p => p.status === 'active').length;
            const isOrphan = activeUsersInTenant.length === 0;

            return {
                id: t.id,
                name: t.name,
                vatNumber: matchingReq?.nif || '999999990',
                contactEmail: primaryUser?.email || matchingReq?.email || '',
                contactPhone: matchingReq?.phone || undefined,
                plan: (t.plan || 'free') as any,
                status: (t.subscriptionStatus || 'active') as any,
                subscriptionStatus: (t.subscriptionStatus || 'active') as any,
                maxProjects: t.maxProjects ?? (t.plan === 'enterprise' ? -1 : t.plan === 'premium' ? 3 : t.plan === 'basic' ? 1 : 0),
                accessControlLimit: t.accessControlLimit ?? 600,
                maxCompanyUsers: t.plan === 'enterprise' ? 50 : t.plan === 'premium' ? 10 : t.plan === 'basic' ? 5 : 1,
                modules: t.modules && t.modules.length > 0 ? t.modules : ['companies', 'workers', 'equipment', 'access-control'],
                registeredUserName: primaryUser?.name || matchingReq?.contactName || undefined,
                activeUsersCount: activeUsersInTenant.length,
                projectsCount: activeProjectsCount,
                isOrphan,
                createdAt: t.createdAt.toISOString(),
            };
        });

        const users = dbUsers.map(u => ({
            id: u.id,
            accountId: u.tenantId || undefined,
            name: u.name || 'Utilizador',
            email: u.email,
            password: u.password || undefined,
            role: (u.role || 'client_admin') as any,
            avatar: u.avatarUrl || u.image || undefined,
            status: (u.status || 'active') as any,
            lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : undefined,
            suspendedAt: u.suspendedAt ? u.suspendedAt.toISOString() : undefined,
            suspensionReason: u.suspensionReason || undefined,
            deletedAt: u.deletedAt ? u.deletedAt.toISOString() : undefined,
            emailVerified: u.emailVerified ? u.emailVerified.toISOString() : undefined,
            createdAt: u.createdAt.toISOString(),
            projectAccess: [],
        }));

        const subscriptionRequests = requests.map(r => ({
            id: r.id,
            companyName: r.companyName,
            nif: r.nif,
            contactName: r.contactName,
            email: r.email,
            phone: r.phone || undefined,
            plan: r.plan as any,
            status: r.status as any,
            verificationToken: r.verificationToken,
            emailVerifiedAt: r.emailVerifiedAt ? r.emailVerifiedAt.toISOString() : undefined,
            reviewedBy: r.reviewedBy || undefined,
            reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : undefined,
            rejectionReason: r.rejectionReason || undefined,
            createdAt: r.createdAt.toISOString(),
            updatedAt: r.updatedAt.toISOString(),
        }));

        return NextResponse.json({
            success: true,
            accounts,
            users,
            subscriptionRequests,
        });
    } catch (error: any) {
        console.error('[API Platform Clients GET] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Erro ao carregar clientes.', accounts: [], users: [], subscriptionRequests: [] },
            { status: 500 }
        );
    }
}

// PATCH /api/platform/clients
// Atualização ágil de plano de cliente no PostgreSQL
export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { accountId, plan } = body;

        if (!accountId || !plan) {
            return NextResponse.json(
                { error: 'ID da conta e plano são obrigatórios.' },
                { status: 400 }
            );
        }

        let maxProjects = 0;
        let accessLimit = 600;
        let maxUsers = 1;

        if (plan === 'basic') {
            maxProjects = 1;
            accessLimit = 1200;
            maxUsers = 5;
        } else if (plan === 'premium') {
            maxProjects = 3;
            accessLimit = 3600;
            maxUsers = 10;
        } else if (plan === 'enterprise') {
            maxProjects = -1;
            accessLimit = -1;
            maxUsers = 50;
        }

        // 1. Atualizar Tenant se existir no Prisma
        const tenant = await prisma.tenant.findUnique({ where: { id: accountId } }).catch(() => null);
        if (tenant) {
            await prisma.tenant.update({
                where: { id: accountId },
                data: {
                    plan,
                    maxProjects,
                    accessControlLimit: accessLimit,
                },
            });
        }

        return NextResponse.json({
            success: true,
            message: `Plano atualizado para ${plan.toUpperCase()} com sucesso.`,
            plan,
            maxProjects,
            accessControlLimit: accessLimit,
            maxCompanyUsers: maxUsers,
        });
    } catch (error: any) {
        console.error('[API Platform Clients PATCH] Error:', error);
        return NextResponse.json(
            { error: 'Erro ao atualizar plano do cliente.' },
            { status: 500 }
        );
    }
}

// DELETE /api/platform/clients
// Eliminação de contas de clientes (com validação estrita de subscrição paga e projetos ativos)
export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const accountId = searchParams.get('accountId');
        const action = searchParams.get('action'); // 'delete_single' | 'cleanup_orphans'

        // Ação em Lote: Limpar todas as contas órfãs do plano Free sem projetos
        if (action === 'cleanup_orphans') {
            const allTenants = await prisma.tenant.findMany({
                where: { plan: 'free' },
                include: {
                    users: { where: { status: { not: 'deleted' } } },
                    projects: { where: { status: 'active' } },
                },
            });

            const orphanTenants = allTenants.filter(t => t.users.length === 0 && t.projects.length === 0);
            const orphanIds = orphanTenants.map(t => t.id);

            if (orphanIds.length > 0) {
                await prisma.company.deleteMany({ where: { tenantId: { in: orphanIds } } }).catch(() => {});
                await prisma.worker.deleteMany({ where: { tenantId: { in: orphanIds } } }).catch(() => {});
                await prisma.equipment.deleteMany({ where: { tenantId: { in: orphanIds } } }).catch(() => {});
                await prisma.user.deleteMany({ where: { tenantId: { in: orphanIds } } }).catch(() => {});
                await prisma.tenant.deleteMany({ where: { id: { in: orphanIds } } });
            }

            return NextResponse.json({
                success: true,
                message: `${orphanIds.length} conta(s) órfã(s) removida(s) com sucesso.`,
                deletedAccountIds: orphanIds,
            });
        }

        if (!accountId) {
            return NextResponse.json({ error: 'ID da conta é obrigatório.' }, { status: 400 });
        }

        const tenant = await prisma.tenant.findUnique({
            where: { id: accountId },
            include: {
                projects: { where: { status: 'active' } },
                users: true,
            },
        });

        if (!tenant) {
            return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 404 });
        }

        // 1. Regra de Proteção: Contas com subscrição paga ativa não podem ser apagadas
        if (tenant.plan !== 'free') {
            return NextResponse.json({
                error: `Esta conta possui uma subscrição PAGA ativa (${tenant.plan.toUpperCase()}). Contas com subscrição contratada estão protegidas. Altere primeiro o plano para Gratuito se pretender cancelar o serviço.`,
                protectionReason: 'paid_subscription',
            }, { status: 400 });
        }

        // 2. Regra de Proteção: Contas com obras ativas não podem ser apagadas
        if (tenant.projects.length > 0) {
            const projectNames = tenant.projects.map(p => `"${p.name}"`).join(', ');
            return NextResponse.json({
                error: `Esta conta é responsável por ${tenant.projects.length} obra(s) ativa(s): ${projectNames}. O encerramento ou transferência da obra é obrigatório antes de eliminar a conta.`,
                protectionReason: 'active_projects',
                activeProjects: tenant.projects.map(p => ({ id: p.id, name: p.name })),
            }, { status: 400 });
        }

        // 3. Eliminar dados associados e o Tenant
        await prisma.company.deleteMany({ where: { tenantId: accountId } }).catch(() => {});
        await prisma.worker.deleteMany({ where: { tenantId: accountId } }).catch(() => {});
        await prisma.equipment.deleteMany({ where: { tenantId: accountId } }).catch(() => {});
        await prisma.user.deleteMany({ where: { tenantId: accountId } }).catch(() => {});
        await prisma.tenant.delete({ where: { id: accountId } });

        return NextResponse.json({
            success: true,
            message: `Conta "${tenant.name}" eliminada com sucesso.`,
            deletedAccountId: accountId,
        });
    } catch (error: any) {
        console.error('[API Platform Clients DELETE] Error:', error);
        return NextResponse.json({ error: 'Erro ao eliminar conta de cliente.' }, { status: 500 });
    }
}
