import { NextRequest, NextResponse } from 'next/server';
import { prisma, ensureSubscriptionTable, ensureUserColumns } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import {
    acquireUserSession,
    heartbeatUserSession,
    validateUserSession,
    releaseUserSession,
    getServerOperationalData,
} from '@/lib/server-state';

export const dynamic = 'force-dynamic';

const MOCK_USERS_SEED = [
    { email: 'admin@safesite.com', password: 'Password123!', role: 'admin', name: 'Administrador Demo', accountId: 'acc_1' },
    { email: 'super@safesite.com', password: 'SuperAdmin2026!', role: 'superadmin', name: 'Super Administrador', accountId: 'platform_admin' },
    { email: 'super@safesite.pt', password: 'SuperAdmin2026!', role: 'superadmin', name: 'Super Administrador', accountId: 'platform_admin' },
    { email: 'paulo.ferreira@xispoli.eu', password: 'Pferreira.Xispoli@1914', role: 'superadmin', name: 'Paulo Ferreira', accountId: 'platform_admin' },
    { email: 'manager@safesite.com', password: 'Password123!', role: 'manager', name: 'Eng. Manuel Gestor', accountId: 'acc_1' },
    { email: 'data@safesite.com', password: 'Password123!', role: 'data_user', name: 'Técnico Inserção Dados', accountId: 'acc_1' },
    { email: 'approver@safesite.com', password: 'Password123!', role: 'approver', name: 'Diretor de Aprovação', accountId: 'acc_1' },
    { email: 'fiscal@safesite.com', password: 'Password123!', role: 'fiscal', name: 'Fiscal de Obra', accountId: 'acc_1' },
];

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { action, email, password, sessionId, forceTakeover } = body;

        const cleanEmail = (email || '').trim().toLowerCase();
        if (!cleanEmail) {
            return NextResponse.json({ success: false, error: 'Email é obrigatório.' }, { status: 400 });
        }

        const userAgent = req.headers.get('user-agent') || undefined;
        const ip = req.headers.get('x-forwarded-for') || undefined;

        // 1. ACTION: HEARTBEAT
        if (action === 'heartbeat') {
            if (!sessionId) {
                return NextResponse.json({ valid: false, reason: 'missing_session_id' });
            }
            const res = heartbeatUserSession({ email: cleanEmail, sessionId });
            return NextResponse.json(res);
        }

        // 2. ACTION: VALIDATE (Called on app load / window focus)
        if (action === 'validate') {
            if (!sessionId) {
                return NextResponse.json({ valid: false, reason: 'missing_session_id' });
            }
            const res = validateUserSession({ email: cleanEmail, sessionId });
            return NextResponse.json(res);
        }

        // 3. ACTION: LOGOUT
        if (action === 'logout') {
            releaseUserSession({ email: cleanEmail, sessionId });
            return NextResponse.json({ success: true });
        }

        // 4. ACTION: ACQUIRE (Login attempt)
        if (action === 'acquire' || action === 'login') {
            if (!sessionId) {
                return NextResponse.json({ success: false, error: 'Session ID é obrigatório.' }, { status: 400 });
            }

            // A. Check PostgreSQL first if available
            let dbUser: any = null;
            let isValidPassword = false;

            try {
                await ensureSubscriptionTable();
                await ensureUserColumns();

                dbUser = await prisma.user.findUnique({
                    where: { email: cleanEmail },
                    include: {
                        tenant: true,
                        projectMembers: true,
                    },
                });

                if (dbUser && password) {
                    if (dbUser.password?.startsWith('$2a$') || dbUser.password?.startsWith('$2b$')) {
                        isValidPassword = await bcrypt.compare(password, dbUser.password);
                    } else {
                        isValidPassword = dbUser.password === password;
                    }
                }
            } catch (pgErr) {
                // If PostgreSQL is offline/dev, fallback to mock users
                console.warn('[Session API] PostgreSQL check fallback:', pgErr);
            }

            // B. Fallback to mock users if not found in PostgreSQL or PG is offline
            if (!dbUser) {
                const mockMatch = MOCK_USERS_SEED.find((u) => u.email.toLowerCase() === cleanEmail);
                if (mockMatch) {
                    if (!password || mockMatch.password === password) {
                        isValidPassword = true;
                        dbUser = {
                            id: `usr_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`,
                            name: mockMatch.name,
                            email: mockMatch.email,
                            role: mockMatch.role,
                            status: 'active',
                            tenantId: mockMatch.accountId,
                            tenant: {
                                id: mockMatch.accountId,
                                name: 'Empresa Principal',
                                plan: 'enterprise',
                                subscriptionStatus: 'active',
                            },
                            projectMembers: [
                                {
                                    projectId: 'proj_1',
                                    role: mockMatch.role === 'manager' ? 'manager' : mockMatch.role === 'approver' ? 'approver' : 'editor',
                                    allowedModules: ['general', 'safety', 'access', 'training', 'quality', 'environment', 'cde'],
                                },
                            ],
                        };
                    }
                }

                if (!dbUser) {
                    const serverData = getServerOperationalData();
                    const stateUser = (serverData.users || []).find((u: any) => u.email?.toLowerCase() === cleanEmail);
                    if (stateUser && (!stateUser.password || !password || stateUser.password === password)) {
                        isValidPassword = true;
                        dbUser = {
                            id: stateUser.id,
                            name: stateUser.name,
                            email: stateUser.email,
                            role: stateUser.role || 'user',
                            status: stateUser.status || 'active',
                            tenantId: stateUser.accountId || 'acc_1',
                            tenant: {
                                id: stateUser.accountId || 'acc_1',
                                name: 'Empresa Principal',
                                plan: 'enterprise',
                                subscriptionStatus: 'active',
                            },
                            projectMembers: stateUser.projectAccess || [
                                {
                                    projectId: 'proj_1',
                                    role: stateUser.role === 'manager' ? 'manager' : 'editor',
                                    allowedModules: ['general', 'safety', 'access', 'training', 'quality', 'environment', 'cde'],
                                },
                            ],
                        };
                    }
                }
            }

            if (!dbUser || !isValidPassword) {
                return NextResponse.json(
                    { success: false, error: 'invalid_credentials', message: 'E-mail ou palavra-passe incorretos.' },
                    { status: 401 }
                );
            }

            // Check if user account is suspended or deleted
            if (dbUser.status === 'suspended') {
                return NextResponse.json(
                    { success: false, error: 'account_suspended', message: dbUser.suspensionReason || 'Conta suspensa.' },
                    { status: 403 }
                );
            }
            if (dbUser.status === 'deleted') {
                return NextResponse.json(
                    { success: false, error: 'account_deleted', message: 'Conta eliminada ao abrigo do RGPD.' },
                    { status: 403 }
                );
            }

            // C. Enforce Single Active Session
            const sessionAcquisition = acquireUserSession({
                email: cleanEmail,
                sessionId,
                userAgent,
                ip,
                forceTakeover: Boolean(forceTakeover),
            });

            if (!sessionAcquisition.success) {
                return NextResponse.json(
                    {
                        success: false,
                        error: sessionAcquisition.error,
                        message: sessionAcquisition.message,
                        canTakeover: sessionAcquisition.canTakeover,
                        activeSession: sessionAcquisition.activeSession,
                    },
                    { status: 409 } // 409 Conflict: active session exists
                );
            }

            // Update lastLoginAt in PostgreSQL asynchronously
            prisma.user.update({
                where: { email: cleanEmail },
                data: { lastLoginAt: new Date() },
            }).catch(() => {});

            // Construct user payload
            const userPayload = {
                id: dbUser.id,
                name: dbUser.name || 'Utilizador',
                email: dbUser.email,
                role: dbUser.role || 'user',
                accountId: dbUser.tenantId || 'acc_1',
                status: dbUser.status || 'active',
                projectAccess: (dbUser.projectMembers || []).map((pm: any) => ({
                    projectId: pm.projectId,
                    role: pm.role || 'viewer',
                    allowedModules: pm.allowedModules || ['general', 'safety', 'access', 'training', 'quality', 'environment', 'cde'],
                    companyIds: pm.companyIds,
                })),
            };

            const accountPayload = dbUser.tenant ? {
                id: dbUser.tenant.id,
                name: dbUser.tenant.name,
                plan: dbUser.tenant.plan || 'enterprise',
                status: dbUser.tenant.subscriptionStatus || 'active',
            } : null;

            return NextResponse.json({
                success: true,
                user: userPayload,
                account: accountPayload,
                sessionId,
            });
        }

        return NextResponse.json({ success: false, error: 'Ação desconhecida.' }, { status: 400 });
    } catch (error: any) {
        console.error('[API Session Error]:', error);
        return NextResponse.json(
            { success: false, error: 'server_error', message: 'Erro ao processar sessão.' },
            { status: 500 }
        );
    }
}
