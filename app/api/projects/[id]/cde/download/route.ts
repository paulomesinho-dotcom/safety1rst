import { NextRequest, NextResponse } from 'next/server';
import { executeServerCdeAction } from '@/lib/server-cde';

// GET /api/projects/[id]/cde/download?fileId=...&fileName=...
// Descarrega o ficheiro binário diretamente do CDE Cloud (SharePoint, Dropbox, Google Drive)
export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: projectId } = await context.params;
        const searchParams = req.nextUrl.searchParams;
        const fileId = searchParams.get('fileId') || searchParams.get('id');
        const fileName = searchParams.get('fileName') || searchParams.get('name') || 'model.ifc';

        if (!fileId) {
            return NextResponse.json({ error: 'fileId é obrigatório' }, { status: 400 });
        }

        const result: any = await executeServerCdeAction(projectId, 'download_file', {
            fileId,
            fileName
        });

        if (!result?.base64) {
            return NextResponse.json({ error: 'Ficheiro não encontrado no CDE' }, { status: 404 });
        }

        const buffer = Buffer.from(result.base64, 'base64');
        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': result.mimeType || 'application/x-step',
                'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
                'Content-Length': buffer.byteLength.toString()
            }
        });
    } catch (err: any) {
        console.error('[API CDE DOWNLOAD] Error:', err);
        return NextResponse.json({ error: err.message || 'Erro ao descarregar ficheiro do CDE.' }, { status: 500 });
    }
}
