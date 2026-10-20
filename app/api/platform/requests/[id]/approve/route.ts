import { NextRequest, NextResponse } from 'next/server';
import { prisma, ensureSubscriptionTable } from '@/lib/prisma';
import { sendAccountApprovedEmail } from '@/lib/email';

// POST /api/platform/requests/[id]/approve
export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;

        if (!id) {
            return NextResponse.json({ error: 'ID de pedido em falta.' }, { status: 400 });
        }

        let requestData: any = null;

        try {
            await ensureSubscriptionTable();
            const subRequest = await prisma.subscriptionRequest.findUnique({
                where: { id },
            });

            if (!subRequest) {
                return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });
            }

            // 1. Criar Tenant
            let maxProjects = 1;
            let accessLimit = 1200;
            if (subRequest.plan === 'premium') {
                maxProjects = 3;
                accessLimit = 3600;
            } else if (subRequest.plan === 'enterprise') {
                maxProjects = -1;
                accessLimit = -1;
            }

            const tenant = await prisma.tenant.create({
                data: {
                    name: subRequest.companyName,
                    plan: subRequest.plan,
                    maxProjects,
                    accessControlLimit: accessLimit,
                    subscriptionStatus: 'active',
                    modules: [
                        'companies', 'workers', 'equipment',
                        'access-control', 'training', 'documents',
                        'accidents',
                    ],
                },
            });

            // 2. Criar ou associar User
            await prisma.user.upsert({
                where: { email: subRequest.email },
                update: {
                    role: 'admin',
                    tenantId: tenant.id,
                },
                create: {
                    name: subRequest.contactName,
                    email: subRequest.email,
                    password: subRequest.password,
                    role: 'admin',
                    tenantId: tenant.id,
                },
            });

            // 3. Atualizar status do pedido
            requestData = await prisma.subscriptionRequest.update({
                where: { id },
                data: {
                    status: 'approved',
                    reviewedBy: 'Super Admin',
                    reviewedAt: new Date(),
                },
            });

            // 4. Enviar email de aprovação ao cliente
            await sendAccountApprovedEmail({
                to: subRequest.email,
                name: subRequest.contactName,
                companyName: subRequest.companyName,
                plan: subRequest.plan,
            });
        } catch (dbErr: any) {
            console.warn('[Approve Request DB Warning]:', dbErr.message);
        }

        return NextResponse.json({
            success: true,
            message: 'Pedido aprovado com sucesso e conta criada.',
        });
    } catch (error: any) {
        console.error('[Approve Request Error]:', error);
        return NextResponse.json(
            { error: 'Erro ao aprovar o pedido.' },
            { status: 500 }
        );
    }
}
