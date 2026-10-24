import { NextRequest, NextResponse } from 'next/server';
import { decryptSecret } from '@/lib/server-crypto';
import { getProjectCdeConfig } from '@/lib/server-cde';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        let { 
            clientId, 
            clientSecret, 
            tenantId, 
            siteUrl, 
            action = 'list', 
            folderId, 
            parentId, 
            folderName, 
            name, 
            fileName, 
            fileBase64, 
            mimeType, 
            fileId, 
            projectId, 
            companyId,
            folderPath,
            folderUrl
        } = body;

        // If credentials are incomplete or masked on client, resolve them from the server-side encrypted store
        const lookupId = projectId || companyId;
        let storedConfig: any = null;
        if (lookupId) {
            storedConfig = await getProjectCdeConfig(lookupId);
            if (storedConfig) {
                clientId = clientId || storedConfig.clientId;
                clientSecret = storedConfig.clientSecret || clientSecret;
                tenantId = tenantId || storedConfig.tenantId;
                siteUrl = siteUrl || storedConfig.siteUrl;
                folderId = folderId || (parentId ? undefined : storedConfig.folderId);
                folderPath = folderPath || storedConfig.folderPath;
                folderUrl = folderUrl || storedConfig.folderUrl;
            }
        }

        console.log('[SharePoint API] Request:', { action, siteUrl, hasSecret: !!clientSecret, folderId, folderPath });

        if (!clientId || !clientSecret || !tenantId || !siteUrl) {
            return NextResponse.json({ error: 'Missing credentials for SharePoint' }, { status: 400 });
        }

        const effectiveClientSecret = decryptSecret(clientSecret);

        // 1. Get Access Token (Client Credentials)
        const tokenParams = new URLSearchParams();
        tokenParams.append('grant_type', 'client_credentials');
        tokenParams.append('client_id', clientId);
        tokenParams.append('client_secret', effectiveClientSecret);
        tokenParams.append('scope', 'https://graph.microsoft.com/.default');

        const tokenRes = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: tokenParams
        });

        if (!tokenRes.ok) {
            const err = await tokenRes.text();
            console.error('[SharePoint API] Token Error:', err);
            return NextResponse.json({ error: 'Failed to authenticate with Microsoft', details: err }, { status: 401 });
        }

        const tokenData = await tokenRes.json();
        const accessToken = tokenData.access_token;

        // 2. Resolve Site ID
        let parsedUrl: URL;
        try {
            parsedUrl = new URL(siteUrl);
        } catch {
            return NextResponse.json({ error: 'URL do SharePoint inválido' }, { status: 400 });
        }
        const host = parsedUrl.hostname;
        const queryFolder = parsedUrl.searchParams.get('id') || parsedUrl.searchParams.get('RootFolder') || parsedUrl.searchParams.get('rootfolder');
        let rawPath = queryFolder ? decodeURIComponent(queryFolder) : decodeURIComponent(parsedUrl.pathname);

        let smartPath = rawPath === '/' ? '' : rawPath.replace(/\/$/, '');
        const commonJunk = ['/shared documents', '/documentos partilhados', '/documentos', '/forms', '/lists', '/_layouts', '/sitepages'];
        const lowerPath = smartPath.toLowerCase();
        for (const junk of commonJunk) {
            const idx = lowerPath.indexOf(junk);
            if (idx !== -1) smartPath = smartPath.substring(0, idx);
        }
        smartPath = smartPath.replace(/\/$/, '');

        const graphSiteUrl = !smartPath 
            ? `https://graph.microsoft.com/v1.0/sites/${host}`
            : `https://graph.microsoft.com/v1.0/sites/${host}:${smartPath}`;

        console.log('[SharePoint API] Looking up site:', graphSiteUrl);

        const siteRes = await fetch(graphSiteUrl, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!siteRes.ok) {
            const errText = await siteRes.text();
            console.error('[SharePoint API] Site LookUp Error:', errText);
            return NextResponse.json({
                error: `SharePoint Connection Failed. Checked URL: ${graphSiteUrl}. Graph Response: ${errText}`
            }, { status: 404 });
        }

        const siteData = await siteRes.json();
        const siteId = siteData.id;

        // Helper: Ensure/Create folder in SharePoint
        const ensureSharePointFolder = async (pId: string, fName: string) => {
            const isR = !pId || pId === 'root';
            const childrenUrl = isR
                ? `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root/children`
                : `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${pId}/children`;

            try {
                const listRes = await fetch(childrenUrl, {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });
                if (listRes.ok) {
                    const listData = await listRes.json();
                    const existing = (listData.value || []).find((item: any) =>
                        item.folder && item.name.toLowerCase() === fName.toLowerCase()
                    );
                    if (existing) {
                        return { id: existing.id, name: existing.name, exists: true, webViewLink: existing.webUrl };
                    }
                }
            } catch (e) {
                console.warn('SharePoint List pre-check warning:', e);
            }

            const createRes = await fetch(childrenUrl, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: fName,
                    folder: {},
                    '@microsoft.graph.conflictBehavior': 'rename'
                })
            });

            if (createRes.ok) {
                const item = await createRes.json();
                return { id: item.id, name: item.name, exists: false, webViewLink: item.webUrl };
            }

            if (createRes.status === 409) {
                const listRes = await fetch(childrenUrl, {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });
                if (listRes.ok) {
                    const listData = await listRes.json();
                    const existing = (listData.value || []).find((item: any) =>
                        item.folder && item.name.toLowerCase() === fName.toLowerCase()
                    );
                    if (existing) {
                        return { id: existing.id, name: existing.name, exists: true, webViewLink: existing.webUrl };
                    }
                }
            }

            const errText = await createRes.text();
            throw new Error(`Falha ao criar pasta "${fName}" no SharePoint: ${errText}`);
        };

        // Helper: Resolves base folder ID (e.g. from folderId, storedConfig, or folderPath segments)
        const resolveBaseFolderId = async (): Promise<string> => {
            const explicitId = folderId || storedConfig?.folderId;
            if (explicitId && explicitId !== 'root') {
                try {
                    const checkRes = await fetch(`https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${explicitId}`, {
                        headers: { Authorization: `Bearer ${accessToken}` }
                    });
                    if (checkRes.ok) return explicitId;
                } catch (e) { }
            }

            const rawPath = (folderPath || folderUrl || storedConfig?.folderPath || storedConfig?.folderUrl || '').trim();
            if (!rawPath || rawPath === '/' || rawPath.toLowerCase() === 'root') {
                return 'root';
            }

            const segments = rawPath.replace(/^[/\\]+|[/\\]+$/g, '').split(/[/\\]+/).filter(Boolean);
            if (segments.length === 0) return 'root';

            let currentParentId = 'root';
            for (const segment of segments) {
                const res = await ensureSharePointFolder(currentParentId, segment);
                currentParentId = res.id;
            }
            return currentParentId;
        };

        // 3. Handle Actions
        if (action === 'list_folders') {
            const targetParent = parentId || folderId || 'root';
            const queryUrl = (!targetParent || targetParent === 'root')
                ? `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root/children`
                : `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${targetParent}/children`;

            const driveRes = await fetch(queryUrl, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });

            if (!driveRes.ok) {
                const err = await driveRes.text();
                return NextResponse.json({ error: 'Falha ao listar pastas do SharePoint', details: err }, { status: 500 });
            }

            const driveData = await driveRes.json();
            const folders = (driveData.value || [])
                .filter((item: any) => Boolean(item.folder))
                .map((item: any) => ({
                    id: item.id,
                    name: item.name,
                    childCount: item.folder?.childCount || 0,
                    webViewLink: item.webUrl
                }));

            return NextResponse.json({ 
                success: true, 
                folders, 
                siteId, 
                siteName: siteData.displayName, 
                parentId: targetParent 
            });
        }

        if (action === 'list') {
            const baseFolderId = await resolveBaseFolderId();
            const targetFolderId = (!folderId || folderId === 'root') ? baseFolderId : folderId;

            const queryUrl = (!targetFolderId || targetFolderId === 'root')
                ? `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root/children`
                : `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${targetFolderId}/children`;

            const driveRes = await fetch(queryUrl, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });

            if (!driveRes.ok) {
                const err = await driveRes.text();
                return NextResponse.json({ error: 'Failed to list drive items', details: err }, { status: 500 });
            }

            const driveData = await driveRes.json();
            const files = (driveData.value || []).map((item: any) => ({
                id: item.id,
                name: item.name,
                mimeType: item.folder ? 'application/vnd.google-apps.folder' : item.file?.mimeType,
                webViewLink: item.webUrl,
                iconLink: null,
                size: item.size
            }));

            return NextResponse.json({ files, siteId, baseFolderId });
        }

        if (action === 'create_folder') {
            const effectiveName = folderName || name;
            if (!effectiveName) {
                return NextResponse.json({ error: 'Nome da pasta obrigatório' }, { status: 400 });
            }
            const baseFolderId = await resolveBaseFolderId();
            const effectiveParent = (!parentId || parentId === 'root') ? baseFolderId : parentId;
            const isRoot = effectiveParent === 'root' || !effectiveParent;
            const childrenUrl = isRoot
                ? `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root/children`
                : `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${effectiveParent}/children`;

            // Check if folder exists
            try {
                const listRes = await fetch(childrenUrl, {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });
                if (listRes.ok) {
                    const listData = await listRes.json();
                    const existing = (listData.value || []).find((item: any) =>
                        item.folder && item.name.toLowerCase() === effectiveName.toLowerCase()
                    );
                    if (existing) {
                        return NextResponse.json({ 
                            folder: { id: existing.id, name: existing.name, exists: true, webViewLink: existing.webUrl } 
                        });
                    }
                }
            } catch (e) { }

            const createRes = await fetch(childrenUrl, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: effectiveName,
                    folder: {},
                    '@microsoft.graph.conflictBehavior': 'rename'
                })
            });

            if (!createRes.ok) {
                const errText = await createRes.text();
                return NextResponse.json({ error: `Falha ao criar pasta: ${errText}` }, { status: 500 });
            }

            const createdItem = await createRes.json();
            return NextResponse.json({
                folder: {
                    id: createdItem.id,
                    name: createdItem.name,
                    exists: false,
                    webViewLink: createdItem.webUrl
                }
            });
        }

        if (action === 'upload') {
            if (!fileName || !fileBase64) {
                return NextResponse.json({ error: 'fileName e fileBase64 são obrigatórios' }, { status: 400 });
            }
            const baseFolderId = await resolveBaseFolderId();
            const targetFolder = (!folderId || folderId === 'root') ? baseFolderId : (parentId || folderId);
            const isRoot = targetFolder === 'root' || !targetFolder;
            const uploadUrl = isRoot
                ? `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:/${encodeURIComponent(fileName)}:/content`
                : `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${targetFolder}:/${encodeURIComponent(fileName)}:/content`;

            const fileBuffer = Buffer.from(fileBase64, 'base64');
            const uploadRes = await fetch(uploadUrl, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': mimeType || 'application/octet-stream'
                },
                body: fileBuffer
            });

            if (!uploadRes.ok) {
                const err = await uploadRes.text();
                return NextResponse.json({ error: `Falha ao carregar ficheiro: ${err}` }, { status: 500 });
            }

            const item = await uploadRes.json();
            return NextResponse.json({
                file: {
                    id: item.id,
                    name: item.name,
                    webViewLink: item.webUrl,
                    size: item.size
                }
            });
        }

        if (action === 'delete') {
            if (!fileId) {
                return NextResponse.json({ error: 'fileId é obrigatório' }, { status: 400 });
            }
            const delRes = await fetch(`https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${fileId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            if (!delRes.ok && delRes.status !== 404) {
                const err = await delRes.text();
                return NextResponse.json({ error: `Falha ao eliminar ficheiro: ${err}` }, { status: 500 });
            }
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Invalid Action' }, { status: 400 });

    } catch (error: any) {
        console.error('[SharePoint API] Critical Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
