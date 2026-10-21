import { NextRequest, NextResponse } from 'next/server';
import { prisma, ensureSubscriptionTable } from '@/lib/prisma';

// GET /api/platform/clients
// Retorna todos os Tenants, Users e SubscriptionRequests da base de dados PostgreSQL
export async function GET() {
    try {
        await ensureSubscriptionTable();

        const [tenants, dbUsers, requests] = await Promise.all([
            prisma.tenant.findMany({
                include: { users: true },
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
            // Encontrar o utilizador principal associado
            const primaryUser = t.users?.[0];
            const matchingReq = requests.find(r => r.email === primaryUser?.email || r.companyName === t.name);

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
