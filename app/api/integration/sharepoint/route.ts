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
                clientSecret = (!clientSecret || clientSecret.includes('•')) 
                    ? (storedConfig.clientSecret || '') 
                    : (clientSecret || storedConfig.clientSecret || '');
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
        rawPath = rawPath.replace(/^\/:(?:[a-z]):\/[a-z]\//i, '/');

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

        // Helper: Base64Url encode for Graph shares API
        const encodeSharePointUrlForGraph = (url: string): string => {
            const b64 = Buffer.from(url.trim()).toString('base64');
            return 'u!' + b64.replace(/=/g, '').replace(/\//g, '_').replace(/\+/g, '-');
        };

        // Helper: Get all Document Libraries (drives) for this site
        let siteDrivesCache: any[] | null = null;
        const getSiteDrives = async (): Promise<any[]> => {
            if (siteDrivesCache) return siteDrivesCache;
            try {
                const res = await fetch(`https://graph.microsoft.com/v1.0/sites/${siteId}/drives`, {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    siteDrivesCache = data.value || [];
                    return siteDrivesCache || [];
                }
            } catch (e) {
                console.warn('[SharePoint] getSiteDrives error:', e);
            }
            return [];
        };

        // Helper: Ensure/Create folder in SharePoint
        const ensureSharePointFolder = async (pId: string, fName: string, driveId?: string) => {
            const isR = !pId || pId === 'root';
            let effectiveDriveId = driveId;

            // If not root and driveId is not specified, discover which drive contains pId
            if (!isR && !effectiveDriveId) {
                const drives = await getSiteDrives();
                for (const d of drives) {
                    try {
                        const check = await fetch(`https://graph.microsoft.com/v1.0/drives/${d.id}/items/${pId}`, {
                            headers: { Authorization: `Bearer ${accessToken}` }
                        });
                        if (check.ok) {
                            effectiveDriveId = d.id;
                            break;
                        }
                    } catch (_) { }
                }
            }

            const childrenUrl = isR
                ? (effectiveDriveId ? `https://graph.microsoft.com/v1.0/drives/${effectiveDriveId}/root/children` : `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root/children`)
                : (effectiveDriveId ? `https://graph.microsoft.com/v1.0/drives/${effectiveDriveId}/items/${pId}/children` : `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${pId}/children`);

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
                        return { id: existing.id, name: existing.name, exists: true, webViewLink: existing.webUrl, driveId: effectiveDriveId };
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
                return { id: item.id, name: item.name, exists: false, webViewLink: item.webUrl, driveId: effectiveDriveId };
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
                        return { id: existing.id, name: existing.name, exists: true, webViewLink: existing.webUrl, driveId: effectiveDriveId };
                    }
                }
            }

            const errText = await createRes.text();
            throw new Error(`Falha ao criar pasta "${fName}" no SharePoint: ${errText}`);
        };

        // Helper: Resolves base folder (immutable ID, driveId, name, webUrl)
        const resolveBaseFolder = async (): Promise<{ id: string; name?: string; driveId?: string; webUrl?: string }> => {
            // When action is resolve_folder or user passed folderPath/folderUrl, do NOT reuse storedConfig.folderId
            const explicitId = folderId || (action !== 'resolve_folder' && !folderPath && !folderUrl ? storedConfig?.folderId : undefined);
            if (explicitId && explicitId !== 'root') {
                try {
                    const checkRes = await fetch(`https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${explicitId}`, {
                        headers: { Authorization: `Bearer ${accessToken}` }
                    });
                    if (checkRes.ok) {
                        const data = await checkRes.json();
                        return { id: data.id, name: data.name, webUrl: data.webUrl };
                    }
                } catch (e) { }

                const drives = await getSiteDrives();
                for (const d of drives) {
                    try {
                        const dRes = await fetch(`https://graph.microsoft.com/v1.0/drives/${d.id}/items/${explicitId}`, {
                            headers: { Authorization: `Bearer ${accessToken}` }
                        });
                        if (dRes.ok) {
                            const data = await dRes.json();
                            return { id: data.id, name: data.name, driveId: d.id, webUrl: data.webUrl };
                        }
                    } catch (e) { }
                }
            }

            const candidateUrl = (folderUrl || folderPath || (action !== 'resolve_folder' ? (storedConfig?.folderUrl || storedConfig?.folderPath) : '') || '').trim();
            if (candidateUrl.startsWith('http://') || candidateUrl.startsWith('https://')) {
                try {
                    const shareToken = encodeSharePointUrlForGraph(candidateUrl);
                    const shareRes = await fetch(`https://graph.microsoft.com/v1.0/shares/${shareToken}/driveItem`, {
                        headers: { Authorization: `Bearer ${accessToken}` }
                    });
                    if (shareRes.ok) {
                        const item = await shareRes.json();
                        return {
                            id: item.id,
                            name: item.name,
                            driveId: item.parentReference?.driveId,
                            webUrl: item.webUrl
                        };
                    }
                } catch (e) {
                    console.warn('[SharePoint] Graph Sharing API resolve warning:', e);
                }
            }

            let raw = candidateUrl;
            if (raw.startsWith('http://') || raw.startsWith('https://')) {
                try {
                    const u = new URL(raw);
                    const qId = u.searchParams.get('id') || u.searchParams.get('RootFolder') || u.searchParams.get('rootfolder');
                    raw = qId ? decodeURIComponent(qId) : decodeURIComponent(u.pathname);
                    raw = raw.replace(/^\/:(?:[a-z]):\/[a-z]\//i, '/');
                    const sMatch = raw.match(/^(\/(?:sites|teams)\/[^/]+)/i);
                    if (sMatch) raw = raw.substring(sMatch[1].length);
                    raw = raw.replace(/\/Forms\/[a-zA-Z0-9_\.]+/i, '').replace(/\/[a-zA-Z0-9_]+\.aspx$/i, '');
                } catch (e) { }
            }

            raw = raw.trim();
            if (!raw || raw === '/' || raw.toLowerCase() === 'root') {
                return { id: 'root' };
            }

            const segments = raw.replace(/^[/\\]+|[/\\]+$/g, '').split(/[/\\]+/).filter(Boolean);
            if (segments.length === 0) return { id: 'root' };

            const drives = await getSiteDrives();
            let targetDriveId: string | undefined = undefined;
            let pathSegments = segments;

            const matchedDrive = drives.find((d: any) => {
                const dName = (d.name || '').toLowerCase();
                const dUrlEnd = decodeURIComponent((d.webUrl || '').split('/').pop() || '').toLowerCase();
                const seg = segments[0].toLowerCase();
                return dName === seg || dUrlEnd === seg ||
                       (seg.includes('document') && (dName.includes('document') || dUrlEnd.includes('document')));
            });

            if (matchedDrive) {
                targetDriveId = matchedDrive.id;
                pathSegments = segments.slice(1);
            }

            if (pathSegments.length === 0) {
                return { id: 'root', driveId: targetDriveId, name: matchedDrive?.name };
            }

            // Encode path segments individually so forward slashes '/' are preserved
            const relPathEncoded = pathSegments.map((s: string) => encodeURIComponent(s)).join('/');
            const drivesToTry = targetDriveId 
                ? drives.filter((d: any) => d.id === targetDriveId)
                : (drives.length > 0 ? drives : [{ id: 'default' }]);

            for (const drv of drivesToTry) {
                try {
                    const directPathUrl = drv.id !== 'default'
                        ? `https://graph.microsoft.com/v1.0/drives/${drv.id}/root:/${relPathEncoded}`
                        : `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:/${relPathEncoded}`;
                    const directRes = await fetch(directPathUrl, {
                        headers: { Authorization: `Bearer ${accessToken}` }
                    });
                    if (directRes.ok) {
                        const item = await directRes.json();
                        return { id: item.id, name: item.name, driveId: drv.id !== 'default' ? drv.id : undefined, webUrl: item.webUrl };
                    }
                } catch (e) { }
            }

            let currentParentId = 'root';
            let lastRes: any = null;
            for (const segment of pathSegments) {
                lastRes = await ensureSharePointFolder(currentParentId, segment, targetDriveId);
                currentParentId = lastRes.id;
            }

            return { id: lastRes ? lastRes.id : 'root', name: lastRes?.name, driveId: targetDriveId, webUrl: lastRes?.webViewLink };
        };

        // 3. Handle Actions
        if (action === 'list_folders') {
            const targetParent = parentId || folderId || 'root';
            const drives = await getSiteDrives();

            if (targetParent === 'root') {
                const folders: any[] = [];
                try {
                    const defRes = await fetch(`https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root/children`, {
                        headers: { Authorization: `Bearer ${accessToken}` }
                    });
                    if (defRes.ok) {
                        const data = await defRes.json();
                        (data.value || []).filter((i: any) => Boolean(i.folder)).forEach((i: any) => {
                            folders.push({
                                id: i.id,
                                name: i.name,
                                childCount: i.folder?.childCount || 0,
                                webViewLink: i.webUrl
                            });
                        });
                    }
                } catch (e) { }

                for (const d of drives) {
                    if (!folders.some(f => f.name.toLowerCase() === d.name.toLowerCase())) {
                        folders.unshift({
                            id: d.id,
                            name: `📚 [Biblioteca] ${d.name}`,
                            childCount: 0,
                            webViewLink: d.webUrl,
                            isDrive: true
                        });
                    }
                }

                return NextResponse.json({ 
                    success: true, 
                    folders, 
                    siteId, 
                    siteName: siteData.displayName, 
                    parentId: targetParent 
                });
            } else {
                const isDrive = drives.some((d: any) => d.id === targetParent);
                const queryUrl = isDrive
                    ? `https://graph.microsoft.com/v1.0/drives/${targetParent}/root/children`
                    : `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${targetParent}/children`;

                let driveRes = await fetch(queryUrl, {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });
                if (!driveRes.ok && !isDrive) {
                    for (const d of drives) {
                        const dRes = await fetch(`https://graph.microsoft.com/v1.0/drives/${d.id}/items/${targetParent}/children`, {
                            headers: { Authorization: `Bearer ${accessToken}` }
                        });
                        if (dRes.ok) {
                            driveRes = dRes;
                            break;
                        }
                    }
                }

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
        }

        if (action === 'resolve_folder') {
            const baseFolder = await resolveBaseFolder();
            return NextResponse.json({
                success: true,
                folder: {
                    id: baseFolder.id,
                    name: baseFolder.name,
                    driveId: baseFolder.driveId,
                    webUrl: baseFolder.webUrl
                }
            });
        }

        if (action === 'list') {
            const baseFolder = await resolveBaseFolder();
            const targetFolderId = (!folderId || folderId === 'root') ? baseFolder.id : folderId;
            const driveId = baseFolder.driveId;

            const isRoot = !targetFolderId || targetFolderId === 'root';
            let effectiveDriveId = driveId;

            // If not root and effectiveDriveId is not known, discover which drive contains targetFolderId
            if (!isRoot && !effectiveDriveId) {
                const drives = await getSiteDrives();
                for (const d of drives) {
                    try {
                        const check = await fetch(`https://graph.microsoft.com/v1.0/drives/${d.id}/items/${targetFolderId}`, {
                            headers: { Authorization: `Bearer ${accessToken}` }
                        });
                        if (check.ok) {
                            effectiveDriveId = d.id;
                            break;
                        }
                    } catch (_) { }
                }
            }

            const queryUrl = isRoot
                ? (effectiveDriveId ? `https://graph.microsoft.com/v1.0/drives/${effectiveDriveId}/root/children` : `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root/children`)
                : (effectiveDriveId ? `https://graph.microsoft.com/v1.0/drives/${effectiveDriveId}/items/${targetFolderId}/children` : `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${targetFolderId}/children`);

            let driveRes = await fetch(queryUrl, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });

            if (!driveRes.ok && !isRoot) {
                const drives = await getSiteDrives();
                for (const d of drives) {
                    if (d.id === effectiveDriveId) continue;
                    try {
                        const altUrl = `https://graph.microsoft.com/v1.0/drives/${d.id}/items/${targetFolderId}/children`;
                        const altRes = await fetch(altUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
                        if (altRes.ok) {
                            driveRes = altRes;
                            break;
                        }
                    } catch (_) { }
                }
            }

            if (!driveRes.ok) {
                const err = await driveRes.text();
                return NextResponse.json({ error: 'Failed to list drive items', details: err }, { status: 500 });
            }

            const driveData = await driveRes.json();
            const files = (driveData.value || []).map((item: any) => ({
                id: item.id,
                name: item.name,
                mimeType: item.folder ? 'application/vnd.google-apps.folder' : (item.file?.mimeType || 'application/octet-stream'),
                webViewLink: item.webUrl,
                iconLink: null,
                size: item.size
            }));

            return NextResponse.json({ 
                files, 
                siteId, 
                baseFolderId: baseFolder.id, 
                baseFolderName: baseFolder.name, 
                driveId: baseFolder.driveId 
            });
        }

        if (action === 'create_folder') {
            const effectiveName = folderName || name;
            if (!effectiveName) {
                return NextResponse.json({ error: 'Nome da pasta obrigatório' }, { status: 400 });
            }
            const baseFolder = await resolveBaseFolder();
            const effectiveParent = (!parentId || parentId === 'root') ? baseFolder.id : parentId;
            const driveId = baseFolder.driveId;

            const resFolder = await ensureSharePointFolder(effectiveParent, effectiveName, driveId);
            return NextResponse.json({ folder: resFolder });
        }

        if (action === 'upload') {
            if (!fileName || !fileBase64) {
                return NextResponse.json({ error: 'fileName e fileBase64 são obrigatórios' }, { status: 400 });
            }
            const baseFolder = await resolveBaseFolder();
            const targetFolder = (!folderId || folderId === 'root') ? baseFolder.id : (parentId || folderId);
            const driveId = baseFolder.driveId;
            const isRoot = targetFolder === 'root' || !targetFolder;

            const uploadUrl = isRoot
                ? (driveId ? `https://graph.microsoft.com/v1.0/drives/${driveId}/root:/${encodeURIComponent(fileName)}:/content` : `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:/${encodeURIComponent(fileName)}:/content`)
                : (driveId ? `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${targetFolder}:/${encodeURIComponent(fileName)}:/content` : `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${targetFolder}:/${encodeURIComponent(fileName)}:/content`);

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
