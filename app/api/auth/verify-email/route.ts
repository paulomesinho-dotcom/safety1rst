import { NextRequest, NextResponse } from 'next/server';
import { prisma, ensureSubscriptionTable } from '@/lib/prisma';
import { sendAdminNewRequestNotification } from '@/lib/email';

// GET ou POST /api/auth/verify-email?token=...
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
        return NextResponse.json({ error: 'Token de verificação em falta.' }, { status: 400 });
    }

    try {
        let requestData: any = null;

        try {
            await ensureSubscriptionTable();
            const subRequest = await prisma.subscriptionRequest.findUnique({
                where: { verificationToken: token },
            });

            if (subRequest) {
                if (subRequest.status === 'pending_email') {
                    requestData = await prisma.subscriptionRequest.update({
                        where: { id: subRequest.id },
                        data: {
                            status: 'pending_approval',
                            emailVerifiedAt: new Date(),
                        },
                    });

                    // Notificar o Superadmin por email
                    await sendAdminNewRequestNotification({
                        companyName: subRequest.companyName,
                        nif: subRequest.nif,
                        contactName: subRequest.contactName,
                        email: subRequest.email,
                        plan: subRequest.plan,
                    });
                } else {
                    requestData = subRequest;
                }
            }
        } catch (dbErr: any) {
            console.warn('[Verify Email DB Warning]:', dbErr.message);
        }

        return NextResponse.json({
            success: true,
            status: requestData?.status || 'pending_approval',
            companyName: requestData?.companyName || '',
            plan: requestData?.plan || 'basic',
        });
    } catch (error: any) {
        console.error('[Verify Email Error]:', error);
        return NextResponse.json(
            { error: 'Erro ao verificar email. O link pode ter expirado.' },
            { status: 500 }
        );
    }
}
