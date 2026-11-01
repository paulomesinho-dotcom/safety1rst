import { NextRequest, NextResponse } from 'next/server';
import { calculateEngineOptimization, FragmentMetadata } from '@/lib/that-open-fragments';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: projectId } = await context.params;
        const url = new URL(request.url);
        const modelName = url.searchParams.get('modelName') || 'Modelo_Estrutural.ifc';
        const fileSizeBytes = Number(url.searchParams.get('fileSizeBytes')) || 120 * 1024 * 1024; // 120MB default

        const optimization = calculateEngineOptimization(fileSizeBytes);

        const metadata: FragmentMetadata = {
            modelId: `frag-${projectId}-${encodeURIComponent(modelName)}`,
            modelName,
            originalSizeBytes: fileSizeBytes,
            fragmentSizeBytes: optimization.fragSizeMB * 1024 * 1024,
            compressionRatio: 9.5,
            totalExpressIDs: Math.round(fileSizeBytes / 1200),
            totalTriangles: Math.round(fileSizeBytes / 450),
            boundingSphere: {
                center: [0, 4.5, 0],
                radius: 35.0
            },
            chunksCount: Math.max(1, Math.ceil(optimization.fragSizeMB / 4)),
            version: '2.1.0-obc',
            createdAt: new Date().toISOString()
        };

        return NextResponse.json({
            success: true,
            optimization,
            metadata,
            engine: 'That Open Engine (Fragments / OBC)',
            streamUrl: `/api/projects/${projectId}/cde/fragments/stream?modelName=${encodeURIComponent(modelName)}`,
            message: `Modelo preparado para streaming progressivo com That Open Engine (${optimization.estimatedMemorySavingsPercent}% de poupança de memória).`
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || 'Falha ao processar metadata de Fragments' },
            { status: 500 }
        );
    }
}
