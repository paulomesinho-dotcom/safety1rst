import { NextRequest, NextResponse } from 'next/server';
import { applyServerMutation } from '@/lib/server-state';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { action, table, id, data } = body;

        if (!action || !table) {
            return NextResponse.json(
                { success: false, error: 'Ação e tabela são obrigatórios.' },
                { status: 400 }
            );
        }

        const res = applyServerMutation({ action, table, id, data });
        return NextResponse.json(res);
    } catch (error: any) {
        console.error('[API Data Mutation POST Error]:', error);
        return NextResponse.json(
            { success: false, error: error?.message || 'Falha ao aplicar mutação no servidor.' },
            { status: 500 }
        );
    }
}
