import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma, ensureSubscriptionTable } from '@/lib/prisma';

// POST /api/auth/login-verify
// Validação de credenciais contra a base de dados central PostgreSQL
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email, password } = body;

        const cleanEmail = (email || '').trim().toLowerCase();
        if (!cleanEmail || !password) {
            return NextResponse.json(
                { error: 'Email e palavra-passe são obrigatórios.' },
                { status: 400 }
            );
        }

        await ensureSubscriptionTable();

        // 1. Verificar se existe utilizador no PostgreSQL
        const dbUser = await prisma.user.findUnique({
            where: { email: cleanEmail },
            include: { tenant: true },
        });

        // Se não encontrar utilizador, verificar se há pedido pendente
        if (!dbUser) {
            const pendingReq = await prisma.subscriptionRequest.findFirst({
                where: { email: cleanEmail },
            });

            if (pendingReq) {
                if (pendingReq.status === 'pending_email') {
                    return NextResponse.json(
                        { error: 'pending_email', message: 'O seu e-mail ainda não foi verificado. Por favor aceda à sua caixa de correio e valide a sua conta.' },
                        { status: 403 }
                    );
                }
                if (pendingReq.status === 'pending_approval') {
                    return NextResponse.json(
                        { error: 'pending_approval', message: 'O seu pedido de subscrição encontra-se em análise pela administração.' },
                        { status: 403 }
                    );
                }
            }

            return NextResponse.json(
                { error: 'invalid_credentials', message: 'E-mail ou palavra-passe incorretos.' },
                { status: 401 }
            );
        }

        // 2. Verificar password com bcrypt
        let isPasswordValid = false;
        if (dbUser.password) {
            if (dbUser.password.startsWith('$2a$') || dbUser.password.startsWith('$2b$')) {
                isPasswordValid = await bcrypt.compare(password, dbUser.password);
            } else {
                isPasswordValid = dbUser.password === password;
            }
        }

        if (!isPasswordValid) {
            return NextResponse.json(
                { error: 'invalid_credentials', message: 'E-mail ou palavra-passe incorretos.' },
                { status: 401 }
            );
        }

        // 3. Montar dados do utilizador e da conta/tenant
        const tenant = dbUser.tenant;
        const account = tenant ? {
            id: tenant.id,
            name: tenant.name,
            vatNumber: '999999990',
            contactEmail: dbUser.email,
            plan: (tenant.plan || 'free'),
            status: tenant.subscriptionStatus || 'active',
            subscriptionStatus: tenant.subscriptionStatus || 'active',
            maxProjects: tenant.maxProjects ?? (tenant.plan === 'enterprise' ? -1 : tenant.plan === 'premium' ? 3 : tenant.plan === 'basic' ? 1 : 0),
            accessControlLimit: tenant.accessControlLimit ?? 600,
            maxCompanyUsers: tenant.plan === 'enterprise' ? 50 : tenant.plan === 'premium' ? 10 : tenant.plan === 'basic' ? 5 : 1,
            modules: tenant.modules && tenant.modules.length > 0 ? tenant.modules : ['companies', 'workers', 'equipment', 'access-control'],
        } : null;

        const user = {
            id: dbUser.id,
            accountId: dbUser.tenantId || undefined,
            name: dbUser.name || 'Utilizador',
            email: dbUser.email,
            password: password,
            role: (dbUser.role || 'client_admin') as any,
            avatar: dbUser.avatarUrl || dbUser.image || undefined,
            projectAccess: [],
        };

        return NextResponse.json({
            success: true,
            user,
            account,
        });
    } catch (error: any) {
        console.error('[API Login Verify Error]:', error);
        return NextResponse.json(
            { error: 'server_error', message: 'Erro ao validar sessão. Tente novamente.' },
            { status: 500 }
        );
    }
}
