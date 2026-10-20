import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/platform/requests/[id]/reject
export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const body = await req.json().catch(() => ({}));
        const { reason } = body;

        try {
            await prisma.subscriptionRequest.update({
                where: { id },
                data: {
                    status: 'rejected',
                    rejectionReason: reason || 'Pedido rejeitado pelo administrador.',
                    reviewedAt: new Date(),
                },
            });
        } catch (dbErr: any) {
            console.warn('[Reject Request DB Warning]:', dbErr.message);
        }

        return NextResponse.json({
            success: true,
            message: 'Pedido rejeitado com sucesso.',
        });
    } catch (error: any) {
        console.error('[Reject Request Error]:', error);
        return NextResponse.json(
            { error: 'Erro ao rejeitar o pedido.' },
            { status: 500 }
        );
    }
}
