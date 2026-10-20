import { NextRequest, NextResponse } from 'next/server';
import { prisma, ensureSubscriptionTable } from '@/lib/prisma';

// GET /api/platform/requests - Listar todos os pedidos de subscrição
export async function GET(req: NextRequest) {
    try {
        await ensureSubscriptionTable();
        const requests = await prisma.subscriptionRequest.findMany({
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({
            success: true,
            requests: requests.map(r => ({
                id: r.id,
                companyName: r.companyName,
                nif: r.nif,
                contactName: r.contactName,
                email: r.email,
                phone: r.phone || undefined,
                plan: r.plan,
                status: r.status,
                verificationToken: r.verificationToken,
                emailVerifiedAt: r.emailVerifiedAt ? r.emailVerifiedAt.toISOString() : undefined,
                reviewedBy: r.reviewedBy || undefined,
                reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : undefined,
                rejectionReason: r.rejectionReason || undefined,
                createdAt: r.createdAt.toISOString(),
                updatedAt: r.updatedAt.toISOString(),
            })),
        });
    } catch (error: any) {
        console.error('[API Platform Requests GET] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Erro ao carregar pedidos de subscrição.', requests: [] },
            { status: 500 }
        );
    }
}
