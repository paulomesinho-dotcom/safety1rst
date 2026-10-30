import { NextRequest, NextResponse } from 'next/server';
import { getServerOperationalData } from '@/lib/server-state';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const data = getServerOperationalData();
        return NextResponse.json({
            success: true,
            version: data.version,
            lastModified: data.lastModified,
            data,
        });
    } catch (error: any) {
        console.error('[API Data Sync GET Error]:', error);
        return NextResponse.json(
            { success: false, error: error?.message || 'Falha ao sincronizar dados com o servidor.' },
            { status: 500 }
        );
    }
}
