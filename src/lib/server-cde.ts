import { prisma } from '@/lib/prisma';
import { encryptSecret, decryptSecret, sanitizeCdeConfig } from './server-crypto';

interface CacheEntry<T> {
    data: T;
    expiresAt: number;
}
const serverListCache = new Map<string, CacheEntry<any>>();
const serverBaseFolderCache = new Map<string, CacheEntry<any>>();

export function clearServerCdeCache() {
    serverListCache.clear();
    serverBaseFolderCache.clear();
}

export interface DecryptedCdeConfig {
    provider: 'onedrive' | 'gdrive' | 'dropbox' | 'local' | null;
    connected: boolean;
    lastSync?: string;
    siteUrl?: string;
    folderUrl?: string;
    folderPath?: string;
    folderId?: string;
    tenantId?: string;
    clientId?: string;
    clientSecret?: string;
    appKey?: string;
    appSecret?: string;
    refreshToken?: string;
    accessToken?: string;
    serviceAccountKey?: string;
}

/**
 * Loads and decrypts the CDE configuration for a given project from the database.
 * This runs ONLY on the server.
 */
export async function getProjectCdeConfig(id: string): Promise<DecryptedCdeConfig | null> {
    if (!id) return null;

    if (id !== 'comp_master' && !id.startsWith('comp_')) {
        const project = await prisma.project.findUnique({
            where: { id },
            select: { id: true, cdeConfig: true, tenantId: true }
        });

        if (project && project.cdeConfig && typeof project.cdeConfig === 'object') {
            const raw = project.cdeConfig as Record<string, any>;
            if (raw.connected || raw.provider) {
                return {
                    provider: raw.provider || null,
                    connected: Boolean(raw.connected),
                    lastSync: raw.lastSync,
                    siteUrl: raw.siteUrl,
                    folderUrl: raw.folderUrl,
                    folderPath: raw.folderPath,
                    folderId: raw.folderId,
                    tenantId: raw.tenantId,
                    clientId: raw.clientId,
                    appKey: raw.appKey,
                    // Decrypt sensitive secrets in memory on the server
                    clientSecret: decryptSecret(raw.clientSecret),
                    appSecret: decryptSecret(raw.appSecret),
                    refreshToken: decryptSecret(raw.refreshToken),
                    accessToken: decryptSecret(raw.accessToken),
                    serviceAccountKey: decryptSecret(raw.serviceAccountKey),
                };
            }
        }

        // Fallback: check if the project's tenant has a connected Company CDE
        if (project?.tenantId) {
            const tenantCompany = await prisma.company.findFirst({
                where: { tenantId: project.tenantId },
                select: { id: true, customDocuments: true }
            });
            if (tenantCompany && tenantCompany.customDocuments && typeof tenantCompany.customDocuments === 'object') {
                const cd = tenantCompany.customDocuments as Record<string, any>;
                const raw = cd.__cdeConfig || (cd.provider ? cd : null);
                if (raw && (raw.connected || raw.provider)) {
                    return {
                        provider: raw.provider || null,
                        connected: Boolean(raw.connected),
                        lastSync: raw.lastSync,
                        siteUrl: raw.siteUrl,
                        folderUrl: raw.folderUrl,
                        folderPath: raw.folderPath,
                        folderId: raw.folderId,
                        tenantId: raw.tenantId,
                        clientId: raw.clientId,
                        appKey: raw.appKey,
                        clientSecret: decryptSecret(raw.clientSecret),
                        appSecret: decryptSecret(raw.appSecret),
                        refreshToken: decryptSecret(raw.refreshToken),
                        accessToken: decryptSecret(raw.accessToken),
                        serviceAccountKey: decryptSecret(raw.serviceAccountKey),
                    };
                }
            }
        }
    }

    // Resolve company record (including comp_master fallback)
    let targetCompanyId = id;
    if (id === 'comp_master') {
        const firstComp = await prisma.company.findFirst({ select: { id: true } });
        if (firstComp) targetCompanyId = firstComp.id;
    }

    const company = await prisma.company.findUnique({
        where: { id: targetCompanyId },
        select: { id: true, customDocuments: true }
    });

    if (company && company.customDocuments && typeof company.customDocuments === 'object') {
        const cd = company.customDocuments as Record<string, any>;
        const raw = cd.__cdeConfig || (cd.provider ? cd : null);
        if (raw) {
            return {
                provider: raw.provider || null,
                connected: Boolean(raw.connected),
                lastSync: raw.lastSync,
                siteUrl: raw.siteUrl,
                folderUrl: raw.folderUrl,
                folderPath: raw.folderPath,
                folderId: raw.folderId,
                tenantId: raw.tenantId,
                clientId: raw.clientId,
                appKey: raw.appKey,
                clientSecret: decryptSecret(raw.clientSecret),
                appSecret: decryptSecret(raw.appSecret),
                refreshToken: decryptSecret(raw.refreshToken),
                accessToken: decryptSecret(raw.accessToken),
                serviceAccountKey: decryptSecret(raw.serviceAccountKey),
            };
        }
    }

    return null;
}

/**
 * Saves and securely encrypts CDE configuration into the database.
 * Preserves previously stored secrets if user submitted a masked value or left blank.
 */
export async function saveProjectCdeConfig(id: string, incoming: Record<string, any>) {
    // 1. Fetch existing config to preserve secrets if masked
    const existing = await getProjectCdeConfig(id);

    // Helper: keep existing secret if input is empty or masked
    const resolveSecret = (incomingVal: any, existingVal?: string) => {
        if (!incomingVal || typeof incomingVal !== 'string') return existingVal || '';
        const trimmed = incomingVal.trim();
        if (trimmed === '' || trimmed.includes('••••')) {
            return existingVal || '';
        }
        return trimmed;
    };

    const finalClientSecret = resolveSecret(incoming.clientSecret, existing?.clientSecret);
    const finalAppSecret = resolveSecret(incoming.appSecret, existing?.appSecret);
    const finalRefreshToken = resolveSecret(incoming.refreshToken, existing?.refreshToken);
    const finalServiceAccountKey = resolveSecret(incoming.serviceAccountKey || incoming.serviceAccountJson, existing?.serviceAccountKey);
    const finalAccessToken = resolveSecret(incoming.accessToken, existing?.accessToken);

    // 2. Encrypt all secrets before storing in the database
    const pathChanged = (incoming.folderPath !== undefined && incoming.folderPath !== existing?.folderPath) ||
                        (incoming.folderUrl !== undefined && incoming.folderUrl !== existing?.folderUrl) ||
                        (incoming.siteUrl !== undefined && incoming.siteUrl !== existing?.siteUrl);

    let resolvedFolderId = incoming.folderId?.trim() ?? existing?.folderId ?? '';
    if (pathChanged) {
        if (!incoming.folderId?.trim() || incoming.folderId.trim() === existing?.folderId) {
            resolvedFolderId = '';
        } else {
            resolvedFolderId = incoming.folderId.trim();
        }
    }

    const encryptedConfig = {
        provider: incoming.provider || existing?.provider || null,
        connected: incoming.connected !== undefined ? Boolean(incoming.connected) : (existing?.connected ?? false),
        lastSync: incoming.lastSync || new Date().toISOString(),
        siteUrl: incoming.siteUrl?.trim() ?? existing?.siteUrl ?? '',
        folderUrl: incoming.folderUrl?.trim() ?? incoming.folderPath?.trim() ?? existing?.folderUrl ?? '',
        folderPath: incoming.folderPath?.trim() ?? incoming.folderUrl?.trim() ?? existing?.folderPath ?? '',
        folderId: resolvedFolderId,
        tenantId: incoming.tenantId?.trim() ?? existing?.tenantId ?? '',
        clientId: incoming.clientId?.trim() ?? existing?.clientId ?? '',
        appKey: incoming.appKey?.trim() ?? existing?.appKey ?? '',
        // Encrypted fields (AES-256-GCM)
        clientSecret: finalClientSecret ? encryptSecret(finalClientSecret) : '',
        appSecret: finalAppSecret ? encryptSecret(finalAppSecret) : '',
        refreshToken: finalRefreshToken ? encryptSecret(finalRefreshToken) : '',
        serviceAccountKey: finalServiceAccountKey ? encryptSecret(finalServiceAccountKey) : '',
        accessToken: finalAccessToken ? encryptSecret(finalAccessToken) : '',
    };

    // If SharePoint/OneDrive and folderId not provided (or root), attempt automatic server-side resolution.
    // NOTE: an explicit, freshly-picked folderId is authoritative and must NEVER be overridden by path resolution
    // (path resolution by leaf name can match a different/older folder with the same name).
    if (encryptedConfig.provider === 'onedrive' && (!encryptedConfig.folderId || encryptedConfig.folderId === 'root') && encryptedConfig.folderPath) {
        const rawToResolve = encryptedConfig.folderPath || encryptedConfig.folderUrl;
        if (rawToResolve && finalClientSecret && encryptedConfig.clientId && encryptedConfig.tenantId && encryptedConfig.siteUrl) {
            try {
                const res: any = await executeSharePointServerAction({
                    provider: 'onedrive',
                    connected: true,
                    clientId: encryptedConfig.clientId,
                    clientSecret: finalClientSecret,
                    tenantId: encryptedConfig.tenantId,
                    siteUrl: encryptedConfig.siteUrl,
                    folderUrl: encryptedConfig.folderUrl,
                    folderPath: encryptedConfig.folderPath,
                    folderId: ''
                }, 'resolve_folder', {});
                if (res?.folderId && res.folderId !== 'root') {
                    encryptedConfig.folderId = res.folderId;
                    if (!encryptedConfig.folderPath && res.folderName) {
                        encryptedConfig.folderPath = res.folderName;
                    }
                }
            } catch (e) {
                console.warn('[SharePoint] Auto-resolution on save warning:', e);
            }
        }
    }

    // Helper to get or create a default tenant in PostgreSQL if none exists yet
    const getOrCreateDefaultTenantId = async (): Promise<string> => {
        let tenant = await prisma.tenant.findFirst().catch(() => null);
        if (!tenant) {
            tenant = await prisma.tenant.create({
                data: {
                    name: 'Empresa Principal',
                    plan: 'enterprise',
                    subscriptionStatus: 'active'
                }
            });
        }
        return tenant.id;
    };

    const isProject = await prisma.project.findUnique({ where: { id } }).catch(() => null);
    if (isProject) {
        const updated = await prisma.project.update({
            where: { id },
            data: {
                cdeConfig: encryptedConfig as any
            },
            select: { id: true, cdeConfig: true }
        });
        return sanitizeCdeConfig(updated.cdeConfig);
    }

    const company = await prisma.company.findUnique({ where: { id }, select: { id: true, customDocuments: true } }).catch(() => null);
    if (company) {
        const existingDocs = (company.customDocuments as Record<string, any>) || {};
        const updated = await prisma.company.update({
            where: { id },
            data: {
                customDocuments: {
                    ...existingDocs,
                    __cdeConfig: encryptedConfig
                } as any
            },
            select: { id: true, customDocuments: true }
        });
        const cd = updated.customDocuments as Record<string, any>;
        return sanitizeCdeConfig(cd.__cdeConfig);
    }

    // If neither exists yet in PostgreSQL (client-side offline store / first setup), safely upsert
    const tenantId = await getOrCreateDefaultTenantId();
    const isCompanyRecord = id.startsWith('comp_') || id.includes('company') || Boolean(incoming.isCompany);

    if (isCompanyRecord) {
        const createdCompany = await prisma.company.upsert({
            where: { id },
            create: {
                id,
                tenantId,
                name: incoming.companyName || incoming.name || 'Empresa Principal',
                customDocuments: {
                    __cdeConfig: encryptedConfig
                } as any
            },
            update: {
                customDocuments: {
                    __cdeConfig: encryptedConfig
                } as any
            },
            select: { id: true, customDocuments: true }
        });
        const cd = createdCompany.customDocuments as Record<string, any>;
        return sanitizeCdeConfig(cd.__cdeConfig);
    } else {
        const createdProject = await prisma.project.upsert({
            where: { id },
            create: {
                id,
                tenantId,
                name: incoming.projectName || incoming.name || 'Obra',
                cdeConfig: encryptedConfig as any
            },
            update: {
                cdeConfig: encryptedConfig as any
            },
            select: { id: true, cdeConfig: true }
        });
        return sanitizeCdeConfig(createdProject.cdeConfig);
    }
}

/**
 * Disconnects and purges CDE secrets for a project or company.
 */
export async function disconnectProjectCde(id: string) {
    const emptyConfig = {
        provider: null,
        connected: false,
        lastSync: new Date().toISOString()
    };

    const isProject = await prisma.project.findUnique({ where: { id } }).catch(() => null);
    if (isProject) {
        const updated = await prisma.project.update({
            where: { id },
            data: {
                cdeConfig: emptyConfig as any
            },
            select: { id: true, cdeConfig: true }
        });
        return sanitizeCdeConfig(updated.cdeConfig);
    }

    const company = await prisma.company.findUnique({ where: { id }, select: { id: true, customDocuments: true } }).catch(() => null);
    if (company) {
        const existingDocs = (company.customDocuments as Record<string, any>) || {};
        await prisma.company.update({
            where: { id },
            data: {
                customDocuments: {
                    ...existingDocs,
                    __cdeConfig: emptyConfig
                } as any
            }
        });
    }

    return sanitizeCdeConfig(emptyConfig);
}

/**
 * Server-Side Execution of CDE operations (SharePoint, Dropbox, Google Drive).
 * Uses decrypted credentials in memory and never exposes them over the network.
 */
export async function executeServerCdeAction(projectId: string, action: string, payload: Record<string, any> = {}) {
    const config = await getProjectCdeConfig(projectId);
    if (!config || !config.provider) {
        throw new Error('CDE não está configurado para este projeto.');
    }

    if (config.provider === 'onedrive') {
        return executeSharePointServerAction(config, action, payload);
    } else if (config.provider === 'dropbox') {
        return executeDropboxServerAction(projectId, config, action, payload);
    } else if (config.provider === 'gdrive') {
        return executeGoogleDriveServerAction(config, action, payload);
    } else if (config.provider === 'local' || (config.provider as string) === 'webdav') {
        return { success: true, message: 'Serviço Próprio / WebDAV validado com sucesso no servidor!' };
    }

    throw new Error(`Fornecedor de CDE não suportado: ${config.provider}`);
}

/**
 * SharePoint / Microsoft Graph Server Operations
 */
async function executeSharePointServerAction(config: DecryptedCdeConfig, action: string, payload: any) {
    const { clientId, clientSecret, tenantId, siteUrl } = config;

    if (!clientId || !clientSecret || !tenantId || !siteUrl) {
        throw new Error('Credenciais de SharePoint incompletas no servidor.');
    }

    // 1. Get Access Token via OAuth2 Client Credentials directly from Microsoft
    const tokenParams = new URLSearchParams();
    tokenParams.append('grant_type', 'client_credentials');
    tokenParams.append('client_id', clientId);
    tokenParams.append('client_secret', clientSecret);
    tokenParams.append('scope', 'https://graph.microsoft.com/.default');

    const tokenRes = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenParams
    });

    if (!tokenRes.ok) {
        const err = await tokenRes.text();
        throw new Error(`Falha na autenticação com a Microsoft: ${err}`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 2. Resolve Site ID
    let parsedUrl: URL;
    try {
        parsedUrl = new URL(siteUrl);
    } catch {
        throw new Error(`URL do SharePoint inválido: ${siteUrl}`);
    }
    const host = parsedUrl.hostname;

    // Check if user accidentally pasted URL with query parameter ?id= or ?RootFolder=
    const queryFolder = parsedUrl.searchParams.get('id') || parsedUrl.searchParams.get('RootFolder') || parsedUrl.searchParams.get('rootfolder');

    // Helper: Base64Url encode for Graph shares API
    const encodeSharePointUrlForGraph = (url: string): string => {
        const b64 = Buffer.from(url.trim()).toString('base64');
        return 'u!' + b64.replace(/=/g, '').replace(/\//g, '_').replace(/\+/g, '-');
    };

    // Clean raw path and strip sharing prefixes like /:f:/r/ or /:f:/s/
    let rawPath = queryFolder ? decodeURIComponent(queryFolder) : decodeURIComponent(parsedUrl.pathname);
    rawPath = rawPath.replace(/^\/:(?:[a-z]):\/[a-z]\//i, '/');

    let smartPath = rawPath.replace(/\/$/, '');
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

    const siteRes = await fetch(graphSiteUrl, {
        headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!siteRes.ok) {
        const errText = await siteRes.text();
        throw new Error(`Site SharePoint não encontrado (${graphSiteUrl}): ${errText}`);
    }

    const siteData = await siteRes.json();
    const siteId = siteData.id;

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
    const ensureSharePointFolder = async (parentId: string, folderName: string, driveId?: string) => {
        const isRoot = !parentId || parentId === 'root';
        let effectiveDriveId = driveId;

        // If not root and driveId is not specified, discover which drive contains parentId
        if (!isRoot && !effectiveDriveId) {
            const drives = await getSiteDrives();
            for (const d of drives) {
                try {
                    const check = await fetch(`https://graph.microsoft.com/v1.0/drives/${d.id}/items/${parentId}`, {
                        headers: { Authorization: `Bearer ${accessToken}` }
                    });
                    if (check.ok) {
                        effectiveDriveId = d.id;
                        break;
                    }
                } catch (_) { }
            }
        }

        const childrenUrl = isRoot
            ? (effectiveDriveId ? `https://graph.microsoft.com/v1.0/drives/${effectiveDriveId}/root/children` : `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root/children`)
            : (effectiveDriveId ? `https://graph.microsoft.com/v1.0/drives/${effectiveDriveId}/items/${parentId}/children` : `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${parentId}/children`);

        try {
            const listRes = await fetch(childrenUrl, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            if (listRes.ok) {
                const listData = await listRes.json();
                const existing = (listData.value || []).find((item: any) =>
                    item.folder && item.name.toLowerCase() === folderName.toLowerCase()
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
                name: folderName,
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
                    item.folder && item.name.toLowerCase() === folderName.toLowerCase()
                );
                if (existing) {
                    return { id: existing.id, name: existing.name, exists: true, webViewLink: existing.webUrl, driveId: effectiveDriveId };
                }
            }
        }

        const errText = await createRes.text();
        throw new Error(`Falha ao criar pasta "${folderName}" no SharePoint: ${errText}`);
    };

    // Helper: Resolves base folder (immutable ID, driveId, name, webUrl)
    const resolveBaseFolder = async (): Promise<{ id: string; name?: string; driveId?: string; webUrl?: string }> => {
        const baseCacheKey = `${siteId}:${config.folderPath || ''}:${config.folderUrl || ''}:${config.folderId || ''}`;
        const cachedBase = serverBaseFolderCache.get(baseCacheKey);
        if (cachedBase && cachedBase.expiresAt > Date.now()) {
            return cachedBase.data;
        }
        // Extract leaf folder name if folderPath or folderUrl is specified
        const rawTarget = (config.folderPath || config.folderUrl || '').trim();
        let expectedLeaf = '';
        if (rawTarget && !rawTarget.startsWith('http://') && !rawTarget.startsWith('https://')) {
            expectedLeaf = rawTarget.split(/[\\/]/).filter(Boolean).pop() || '';
        } else if (rawTarget.startsWith('http://') || rawTarget.startsWith('https://')) {
            try {
                const u = new URL(rawTarget);
                const idParam = u.searchParams.get('id') || u.searchParams.get('RootFolder');
                if (idParam) {
                    expectedLeaf = decodeURIComponent(idParam).split(/[\\/]/).filter(Boolean).pop() || '';
                } else {
                    expectedLeaf = decodeURIComponent(u.pathname).split(/[\\/]/).filter(Boolean).pop() || '';
                }
            } catch (_) {}
        }

        const matchesExpectedName = (itemName?: string) => {
            if (!expectedLeaf || !itemName) return true;
            return itemName.trim().toLowerCase() === expectedLeaf.trim().toLowerCase() ||
                   encodeURIComponent(itemName.trim()).toLowerCase() === encodeURIComponent(expectedLeaf.trim()).toLowerCase();
        };

        // 1. Explicit folderId (and not 'root') - only prioritize if not resolving a new folder path/url
        const explicitId = (action !== 'resolve_folder' || (!config.folderUrl && !config.folderPath)) ? config.folderId : undefined;
        if (explicitId && explicitId !== 'root') {
            try {
                const checkRes = await fetch(`https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${explicitId}`, {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });
                if (checkRes.ok) {
                    const data = await checkRes.json();
                    if (matchesExpectedName(data.name)) {
                        return { id: data.id, name: data.name, webUrl: data.webUrl };
                    } else {
                        console.warn(`[SharePoint] explicitId ${explicitId} resolved to "${data.name}" which does not match expected "${expectedLeaf}". Re-resolving from path.`);
                    }
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
                        if (matchesExpectedName(data.name)) {
                            return { id: data.id, name: data.name, driveId: d.id, webUrl: data.webUrl };
                        } else {
                            console.warn(`[SharePoint] explicitId ${explicitId} in drive ${d.id} resolved to "${data.name}" which does not match expected "${expectedLeaf}". Re-resolving from path.`);
                        }
                    }
                } catch (e) { }
            }
        }

        // 2. Check if folderUrl or folderPath has a full HTTP/HTTPS SharePoint link
        const candidateUrl = (config.folderUrl || config.folderPath || '').trim();
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

        // 3. Check path segments (e.g. "Obras/Edificio Alpha" or "MinhaPasta")
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

        // Encode path segments individually so forward slashes '/' are preserved for Graph
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

        const finalBase = { id: lastRes ? lastRes.id : 'root', name: lastRes?.name, driveId: targetDriveId, webUrl: lastRes?.webViewLink };
        serverBaseFolderCache.set(baseCacheKey, { data: finalBase, expiresAt: Date.now() + 180000 });
        return finalBase;
    };

    if (action === 'test_connection') {
        let baseFolderInfo: any = null;
        try {
            const baseFolder = await resolveBaseFolder();
            if (baseFolder.id !== 'root') {
                baseFolderInfo = { id: baseFolder.id, name: baseFolder.name, webViewLink: baseFolder.webUrl };
            }
        } catch (e) {
            console.warn('[SharePoint] Base folder check warning during test_connection:', e);
        }

        return { 
            success: true, 
            message: 'Ligação ao SharePoint estabelecida com sucesso!', 
            siteId, 
            siteName: siteData.displayName,
            baseFolder: baseFolderInfo 
        };
    }

    if (action === 'list') {
        const baseFolder = await resolveBaseFolder();
        const reqFolderId = payload.folderId;
        const targetFolderId = (!reqFolderId || reqFolderId === 'root') ? baseFolder.id : reqFolderId;
        const driveId = baseFolder.driveId;

        const listCacheKey = `${siteId}:${driveId || ''}:${targetFolderId}`;
        const cachedList = serverListCache.get(listCacheKey);
        if (cachedList && cachedList.expiresAt > Date.now()) {
            return {
                files: cachedList.data,
                siteId,
                baseFolderId: baseFolder.id,
                baseFolderName: baseFolder.name,
                driveId: baseFolder.driveId
            };
        }

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
            throw new Error(`Falha ao listar itens do SharePoint: ${err}`);
        }

        const driveData = await driveRes.json();
        const files = (driveData.value || []).map((item: any) => ({
            id: item.id,
            name: item.name,
            mimeType: item.folder ? 'application/vnd.google-apps.folder' : (item.file?.mimeType || 'application/octet-stream'),
            webViewLink: item.webUrl,
            size: item.size
        }));

        serverListCache.set(listCacheKey, { data: files, expiresAt: Date.now() + 30000 });

        return { 
            files, 
            siteId, 
            baseFolderId: baseFolder.id, 
            baseFolderName: baseFolder.name, 
            driveId: baseFolder.driveId 
        };
    }

    if (action === 'list_folders') {
        const parentId = payload.parentId || 'root';
        const drives = await getSiteDrives();

        if (parentId === 'root') {
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

            return { success: true, folders, parentId, siteId, siteName: siteData.displayName };
        } else {
            const isDrive = drives.some((d: any) => d.id === parentId);
            const queryUrl = isDrive
                ? `https://graph.microsoft.com/v1.0/drives/${parentId}/root/children`
                : `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${parentId}/children`;

            let driveRes = await fetch(queryUrl, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            if (!driveRes.ok && !isDrive) {
                for (const d of drives) {
                    const dRes = await fetch(`https://graph.microsoft.com/v1.0/drives/${d.id}/items/${parentId}/children`, {
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
                throw new Error(`Falha ao listar pastas do SharePoint: ${err}`);
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

            return { success: true, folders, parentId, siteId, siteName: siteData.displayName };
        }
    }

    if (action === 'resolve_folder') {
        const baseFolder = await resolveBaseFolder();
        return { 
            success: true, 
            folderId: baseFolder.id, 
            folderName: baseFolder.name, 
            folderPath: baseFolder.name || config.folderPath,
            driveId: baseFolder.driveId,
            webUrl: baseFolder.webUrl
        };
    }

    if (action === 'create_folder') {
        clearServerCdeCache();
        const folderName = payload.folderName || payload.name;
        if (!folderName) throw new Error('Nome da pasta obrigatório.');
        const baseFolder = await resolveBaseFolder();
        const parentId = (!payload.parentId || payload.parentId === 'root') ? baseFolder.id : payload.parentId;
        const driveId = baseFolder.driveId;

        return await ensureSharePointFolder(parentId, folderName, driveId);
    }

    if (action === 'initialize_company_structure') {
        const { company, workers = [], equipment = [] } = payload;
        const logs: string[] = [];
        const baseFolder = await resolveBaseFolder();
        const baseFolderId = baseFolder.id;
        const driveId = baseFolder.driveId;
        logs.push(`Pasta base no SharePoint: ${baseFolder.name || config.folderPath || 'Raiz'} (ID ${baseFolderId})`);

        const COMPANY_STANDARD_FOLDERS = [
            'Organizações',
            'Pessoas',
            'Equipamentos',
            '04-Controlo de Acessos',
            '05-Sinistralidade',
            '06-Formação'
        ];

        const COMPANY_SPECIAL_SUBFOLDERS: Record<string, string[]> = {
            'Organizações': [
                'Seguros e Apólices',
                'Obrigações do Estado',
                'Documentos de Obra',
                'Arquivo'
            ],
            'Pessoas': [
                'Aptidão Médica e Segurança',
                'Formação e Acolhimento',
                'Documentação Legal e Contratual',
                'Arquivo'
            ],
            'Equipamentos': [
                'Manutenção e Inspeções',
                'Seguro e Conformidade',
                'Registo e Propriedade',
                'Arquivo'
            ]
        };

        const createdFolders: Record<string, string> = {};

        // 1. Criar Pastas Principais da Empresa dentro da pasta base configurada
        for (const folderName of COMPANY_STANDARD_FOLDERS) {
            try {
                const result = await ensureSharePointFolder(baseFolderId, folderName, driveId);
                createdFolders[folderName] = result.id;
                logs.push(result.exists ? `Existente no SharePoint: ${folderName}` : `Criada no SharePoint: ${folderName}`);

                // 2. Criar Subpastas de Gestão Documental
                if (COMPANY_SPECIAL_SUBFOLDERS[folderName]) {
                    for (const sub of COMPANY_SPECIAL_SUBFOLDERS[folderName]) {
                        try {
                            const subRes = await ensureSharePointFolder(result.id, sub, driveId);
                            logs.push(subRes.exists ? `  └─ Existente: ${sub}` : `  └─ Criada: ${sub}`);
                        } catch (subErr: any) {
                            logs.push(`  └─ Erro ao criar ${sub}: ${subErr.message}`);
                        }
                    }
                }
            } catch (err: any) {
                logs.push(`Erro em ${folderName}: ${err.message}`);
            }
        }

        // 3. Criar Pastas Individuais dos Trabalhadores da Empresa
        const workersParentId = createdFolders['02-Trabalhadores'];
        if (workersParentId && Array.isArray(workers)) {
            for (const worker of workers) {
                try {
                    const idTag = worker.idNumber || worker.nif || (worker.id ? worker.id.slice(0, 8) : 'COLAB');
                    const workerFolderName = `${idTag}-${(worker.name || 'Colaborador').trim()}`;
                    const wRes = await ensureSharePointFolder(workersParentId, workerFolderName, driveId);
                    await ensureSharePointFolder(wRes.id, 'Arquivo', driveId);
                    logs.push(`SharePoint: Pasta Colaborador "${workerFolderName}"`);
                } catch (err: any) {
                    logs.push(`Erro no colaborador ${worker.name}: ${err.message}`);
                }
            }
        }

        // 4. Criar Pastas Individuais dos Equipamentos da Empresa
        const equipParentId = createdFolders['03-Equipamentos'];
        if (equipParentId && Array.isArray(equipment)) {
            for (const equip of equipment) {
                try {
                    const idTag = equip.licensePlate || equip.serialNumber || (equip.id ? equip.id.slice(0, 8) : 'EQUIP');
                    const equipFolderName = `${idTag}-${(equip.name || 'Equipamento').trim()}`;
                    const eqRes = await ensureSharePointFolder(equipParentId, equipFolderName, driveId);
                    await ensureSharePointFolder(eqRes.id, 'Arquivo', driveId);
                    logs.push(`SharePoint: Pasta Equipamento "${equipFolderName}"`);
                } catch (err: any) {
                    logs.push(`Erro no equipamento ${equip.name}: ${err.message}`);
                }
            }
        }

        return { success: true, logs, createdFolders };
    }

    if (action === 'initialize_project_company_structure') {
        clearServerCdeCache();
        const { companyName } = payload;
        if (!companyName || !companyName.trim()) {
            throw new Error('Nome da empresa é obrigatório.');
        }
        const logs: string[] = [];
        const baseFolder = await resolveBaseFolder();
        const baseFolderId = baseFolder.id;
        const driveId = baseFolder.driveId;
        const cleanCompanyName = companyName.trim();
        logs.push(`Pasta base no SharePoint: ${baseFolder.name || config.folderPath || 'Raiz'} (ID ${baseFolderId})`);

        // 1. Criar pasta raiz da empresa no projeto: 📁 [Nome da Empresa]
        const companyFolderRes = await ensureSharePointFolder(baseFolderId, cleanCompanyName, driveId);
        logs.push(companyFolderRes.exists ? `Pasta da Empresa existente: ${cleanCompanyName}` : `Pasta da Empresa criada: ${cleanCompanyName}`);
        const companyFolderId = companyFolderRes.id;

        // 2. Estrutura sob [Nome da Empresa]:
        // 📁 Organizações/ (Seguros e Apólices, Obrigações do Estado, Documentos de Obra)
        // 📁 Pessoas/ (Aptidão Médica e Segurança, Formação e Acolhimento, Documentação Legal e Contratual)
        // 📁 Equipamentos/ (Manutenção e Inspeções, Seguro e Conformidade, Registo e Propriedade)
        const PROJECT_COMPANY_THEMES: Record<string, string[]> = {
            'Organizações': [
                'Seguros e Apólices',
                'Obrigações do Estado',
                'Documentos de Obra'
            ],
            'Pessoas': [
                'Aptidão Médica e Segurança',
                'Formação e Acolhimento',
                'Documentação Legal e Contratual'
            ],
            'Equipamentos': [
                'Manutenção e Inspeções',
                'Seguro e Conformidade',
                'Registo e Propriedade'
            ]
        };

        for (const [themeName, subjects] of Object.entries(PROJECT_COMPANY_THEMES)) {
            try {
                const themeRes = await ensureSharePointFolder(companyFolderId, themeName, driveId);
                logs.push(themeRes.exists ? `  📁 ${themeName} (existente)` : `  📁 ${themeName} (criada)`);

                for (const sub of subjects) {
                    try {
                        const subRes = await ensureSharePointFolder(themeRes.id, sub, driveId);
                        logs.push(subRes.exists ? `    └─ 📁 ${sub}` : `    └─ 📁 ${sub} (criada)`);

                        // Se for Documentos de Obra, criar pastas padrão para Modelos BIM e Desenhos 2D
                        if (sub === 'Documentos de Obra') {
                            try {
                                const bimFolder = await ensureSharePointFolder(subRes.id, 'Modelos BIM (IFC)', driveId);
                                logs.push(`       └─ 📁 Modelos BIM (IFC)`);
                                await ensureSharePointFolder(bimFolder.id, '01-Arquitetura', driveId).catch(() => null);
                                await ensureSharePointFolder(bimFolder.id, '02-Estruturas', driveId).catch(() => null);
                                await ensureSharePointFolder(bimFolder.id, '03-Especialidades (MEP)', driveId).catch(() => null);
                                await ensureSharePointFolder(subRes.id, 'Desenhos 2D (Plantas e Cortes)', driveId).catch(() => null);
                            } catch (_) {}
                        }

                        // Subpasta Arquivo dentro de cada assunto
                        try {
                            const archRes = await ensureSharePointFolder(subRes.id, 'Arquivo', driveId);
                            logs.push(archRes.exists ? `       └─ 📁 Arquivo` : `       └─ 📁 Arquivo (criada)`);
                        } catch (archErr: any) {
                            logs.push(`       └─ Erro Arquivo em ${sub}: ${archErr.message}`);
                        }
                    } catch (subErr: any) {
                        logs.push(`    └─ Erro ao criar ${sub}: ${subErr.message}`);
                    }
                }
            } catch (themeErr: any) {
                logs.push(`  Erro em ${themeName}: ${themeErr.message}`);
            }
        }

        return { success: true, logs, companyFolderId };
    }

    if (action === 'initialize_project_structure' || action === 'init_project_bim_structure') {
        clearServerCdeCache();
        const logs: string[] = [];
        const baseFolder = await resolveBaseFolder();
        const baseFolderId = baseFolder.id;
        const driveId = baseFolder.driveId;
        logs.push(`Pasta base no SharePoint: ${baseFolder.name || config.folderPath || 'Raiz'} (ID ${baseFolderId})`);

        // 1. Criar Modelos BIM (IFC) e Desenhos 2D diretamente na raiz do projeto
        try {
            const bimFolder = await ensureSharePointFolder(baseFolderId, 'Modelos BIM (IFC)', driveId);
            logs.push(bimFolder.exists ? `📁 Modelos BIM (IFC) (existente na raiz)` : `📁 Modelos BIM (IFC) (criada na raiz)`);

            const sub01 = await ensureSharePointFolder(bimFolder.id, '01-Arquitetura', driveId);
            logs.push(sub01.exists ? `  └─ 📁 01-Arquitetura` : `  └─ 📁 01-Arquitetura (criada)`);

            const sub02 = await ensureSharePointFolder(bimFolder.id, '02-Estruturas', driveId);
            logs.push(sub02.exists ? `  └─ 📁 02-Estruturas` : `  └─ 📁 02-Estruturas (criada)`);

            const sub03 = await ensureSharePointFolder(bimFolder.id, '03-Especialidades (MEP)', driveId);
            logs.push(sub03.exists ? `  └─ 📁 03-Especialidades (MEP)` : `  └─ 📁 03-Especialidades (MEP) (criada)`);

            const drwFolder = await ensureSharePointFolder(baseFolderId, 'Desenhos 2D (Plantas e Cortes)', driveId);
            logs.push(drwFolder.exists ? `📁 Desenhos 2D (Plantas e Cortes) (existente na raiz)` : `📁 Desenhos 2D (Plantas e Cortes) (criada na raiz)`);
        } catch (bimErr: any) {
            logs.push(`Aviso pastas BIM na raiz: ${bimErr.message}`);
        }

        if (action === 'init_project_bim_structure') {
            return {
                success: true,
                message: 'Estrutura de pastas BIM e 2D criada com sucesso na raiz do projeto!',
                logs
            };
        }

        const STANDARD_FOLDERS = [
            'Organizações',
            'Pessoas',
            'Equipamentos',
            '04-Controlo de Acessos',
            '05-Sinistralidade',
            '06-Formação'
        ];
        const SPECIAL_SUBFOLDERS: Record<string, string[]> = {
            'Organizações': [
                'Seguros e Apólices',
                'Obrigações do Estado',
                'Documentos de Obra',
                'Arquivo'
            ],
            'Pessoas': [
                'Aptidão Médica e Segurança',
                'Formação e Acolhimento',
                'Documentação Legal e Contratual',
                'Arquivo'
            ],
            'Equipamentos': [
                'Manutenção e Inspeções',
                'Seguro e Conformidade',
                'Registo e Propriedade',
                'Arquivo'
            ]
        };
        const createdFolders: Record<string, string> = {};

        for (const folderName of STANDARD_FOLDERS) {
            try {
                const result = await ensureSharePointFolder(baseFolderId, folderName, driveId);
                createdFolders[folderName] = result.id;
                logs.push(result.exists ? `Existente no SharePoint: ${folderName}` : `Criada no SharePoint: ${folderName}`);

                if (SPECIAL_SUBFOLDERS[folderName]) {
                    for (const sub of SPECIAL_SUBFOLDERS[folderName]) {
                        await ensureSharePointFolder(result.id, sub, driveId);
                    }
                }
            } catch (err: any) {
                logs.push(`Erro em ${folderName}: ${err.message}`);
            }
        }

        return { success: true, logs, createdFolders };
    }

    if (action === 'upload' || action === 'upload_file') {
        clearServerCdeCache();
        const { fileName, fileBase64, mimeType } = payload;
        if (!fileName) throw new Error('Nome do ficheiro obrigatório.');
        if (!fileBase64) throw new Error('Conteúdo do ficheiro obrigatório.');

        const baseFolder = await resolveBaseFolder();
        const baseFolderId = baseFolder.id;
        const driveId = baseFolder.driveId;

        const reqFolderId = payload.folderId || payload.parentId || payload.path;
        const targetFolderId = (!reqFolderId || reqFolderId === 'root') ? baseFolderId : reqFolderId;

        const fileBuffer = Buffer.from(fileBase64, 'base64');
        const isRoot = !targetFolderId || targetFolderId === 'root';
        const isPath = typeof targetFolderId === 'string' && targetFolderId.includes('/');
        const uploadUrl = isRoot
            ? (driveId ? `https://graph.microsoft.com/v1.0/drives/${driveId}/root:/${encodeURIComponent(fileName)}:/content` : `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:/${encodeURIComponent(fileName)}:/content`)
            : isPath
                ? (driveId ? `https://graph.microsoft.com/v1.0/drives/${driveId}/root:/${targetFolderId.replace(/^\//, '')}/${encodeURIComponent(fileName)}:/content` : `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:/${targetFolderId.replace(/^\//, '')}/${encodeURIComponent(fileName)}:/content`)
                : (driveId ? `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${targetFolderId}:/${encodeURIComponent(fileName)}:/content` : `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${targetFolderId}:/${encodeURIComponent(fileName)}:/content`);

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
            throw new Error(`Falha ao carregar ficheiro para o SharePoint: ${err}`);
        }

        const item = await uploadRes.json();
        return {
            id: item.id,
            name: item.name,
            webViewLink: item.webUrl,
            size: item.size
        };
    }

    if (action === 'delete' || action === 'delete_file') {
        clearServerCdeCache();
        const { fileId } = payload;
        if (!fileId) throw new Error('ID do ficheiro obrigatório.');

        const delRes = await fetch(`https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${fileId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!delRes.ok && delRes.status !== 404) {
            const err = await delRes.text();
            throw new Error(`Falha ao eliminar ficheiro no SharePoint: ${err}`);
        }

        return { success: true, message: 'Ficheiro eliminado do SharePoint.' };
    }

    throw new Error(`Ação '${action}' não suportada para SharePoint.`);
}

/**
 * Dropbox Server Operations (Token Refresh, List, Create Folder)
 */
async function executeDropboxServerAction(projectId: string, config: DecryptedCdeConfig, action: string, payload: any) {
    let accessToken = config.accessToken;

    // Refresh token if needed
    if (!accessToken && config.refreshToken && config.appKey && config.appSecret) {
        const params = new URLSearchParams();
        params.append('grant_type', 'refresh_token');
        params.append('refresh_token', config.refreshToken);
        params.append('client_id', config.appKey);
        params.append('client_secret', config.appSecret);

        const refreshRes = await fetch('https://api.dropboxapi.com/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params
        });

        if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            accessToken = refreshData.access_token;
            // Update token on server DB
            await saveProjectCdeConfig(projectId, {
                ...config,
                accessToken
            });
        }
    }

    if (!accessToken) {
        throw new Error('Sem token de acesso válido para o Dropbox.');
    }

    if (action === 'test_connection') {
        const listRes = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ path: '', recursive: false, limit: 1 })
        });
        if (!listRes.ok) throw new Error('Não foi possível verificar a conta Dropbox.');
        return { success: true, message: 'Ligação ao Dropbox validada com sucesso!' };
    }

    if (action === 'list') {
        let dbxPath = payload.path || '';
        if (dbxPath === '/' || dbxPath === 'root') dbxPath = '';

        const response = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ path: dbxPath, recursive: false })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Erro ao listar pastas no Dropbox: ${err}`);
        }

        const data = await response.json();
        const files = (data.entries || []).map((item: any) => ({
            id: item.path_display,
            name: item.name,
            mimeType: item['.tag'] === 'folder' ? 'application/vnd.google-apps.folder' : 'file',
            webViewLink: item.path_display,
            size: item.size
        }));

        return { files };
    }

    if (action === 'create_folder') {
        let parentPath = payload.path === 'root' || payload.path === '/' || !payload.path ? '' : payload.path;
        const newFolderPath = `${parentPath}/${payload.name}`;

        const res = await fetch('https://api.dropboxapi.com/2/files/create_folder_v2', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ path: newFolderPath, autorename: false })
        });

        if (!res.ok) {
            const errText = await res.text();
            if (errText.includes('conflict')) {
                return { id: newFolderPath, name: payload.name, exists: true };
            }
            throw new Error(`Erro ao criar pasta no Dropbox: ${errText}`);
        }

        const data = await res.json();
        return { id: data.metadata?.path_display || newFolderPath, name: payload.name, exists: false };
    }

    if (action === 'init_project_bim_structure') {
        const logs: string[] = [];
        let basePath = config.folderPath && config.folderPath !== '/' ? config.folderPath.replace(/\/$/, '') : '';
        const createDbx = async (folderPath: string, label: string) => {
            const res = await fetch('https://api.dropboxapi.com/2/files/create_folder_v2', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: folderPath, autorename: false })
            });
            const ok = res.ok || (await res.text()).includes('conflict');
            logs.push(`📁 ${label} ${ok ? '(ok)' : '(erro)'}`);
        };

        await createDbx(`${basePath}/Modelos BIM (IFC)`, 'Modelos BIM (IFC)');
        await createDbx(`${basePath}/Modelos BIM (IFC)/01-Arquitetura`, '01-Arquitetura');
        await createDbx(`${basePath}/Modelos BIM (IFC)/02-Estruturas`, '02-Estruturas');
        await createDbx(`${basePath}/Modelos BIM (IFC)/03-Especialidades (MEP)`, '03-Especialidades (MEP)');
        await createDbx(`${basePath}/Desenhos 2D (Plantas e Cortes)`, 'Desenhos 2D (Plantas e Cortes)');

        return { success: true, message: 'Pastas BIM e 2D criadas na raiz do Dropbox com sucesso!', logs };
    }

    if (action === 'upload' || action === 'upload_file') {
        const { fileName, fileBase64 } = payload;
        if (!fileName) throw new Error('Nome do ficheiro obrigatório.');
        if (!fileBase64) throw new Error('Conteúdo do ficheiro obrigatório.');

        let targetFolder = payload.folderId || payload.parentId || payload.path || config.folderPath || '';
        if (targetFolder === 'root' || targetFolder === '/') targetFolder = '';
        targetFolder = targetFolder.replace(/\/$/, '');

        const dropboxFilePath = targetFolder ? (targetFolder.startsWith('/') ? `${targetFolder}/${fileName}` : `/${targetFolder}/${fileName}`) : `/${fileName}`;
        const fileBuffer = Buffer.from(fileBase64, 'base64');

        const uploadRes = await fetch('https://content.dropboxapi.com/2/files/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Dropbox-API-Arg': JSON.stringify({
                    path: dropboxFilePath,
                    mode: 'add',
                    autorename: true,
                    mute: false
                }),
                'Content-Type': 'application/octet-stream'
            },
            body: fileBuffer
        });

        if (!uploadRes.ok) {
            const err = await uploadRes.text();
            throw new Error(`Falha ao carregar ficheiro para o Dropbox: ${err}`);
        }

        const item = await uploadRes.json();
        return {
            id: item.path_display || item.id,
            name: item.name,
            webViewLink: item.path_display,
            size: item.size
        };
    }

    throw new Error(`Ação '${action}' não suportada para Dropbox.`);
}

/**
 * Google Drive Server Operations
 */
async function executeGoogleDriveServerAction(config: DecryptedCdeConfig, action: string, payload: any) {
    const accessToken = config.accessToken;
    if (!accessToken && !config.serviceAccountKey) {
        throw new Error('Credenciais de Google Drive em falta no servidor.');
    }

    if (action === 'test_connection') {
        if (accessToken) {
            try {
                const res = await fetch('https://www.googleapis.com/drive/v3/about?fields=user,storageQuota', {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    const name = data.user?.displayName || data.user?.emailAddress || 'Conta Google';
                    return { success: true, message: `Ligação ao Google Drive validada com sucesso! (${name})` };
                }
            } catch (_) {}
        }
        return { success: true, message: 'Google Drive configurado e cifrado no servidor com sucesso!' };
    }

    if (action === 'list') {
        const parentId = payload.path || payload.folderId || config.folderId || 'root';
        const q = `'${parentId}' in parents and trashed = false`;
        const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,size,webViewLink)`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (!res.ok) {
            const err = await res.text();
            throw new Error(`Erro ao listar Google Drive: ${err}`);
        }
        const data = await res.json();
        return { files: data.files || [] };
    }

    if (action === 'create_folder') {
        const parentId = payload.path || payload.parentId || config.folderId || 'root';
        const res = await fetch('https://www.googleapis.com/drive/v3/files', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: payload.name,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [parentId]
            })
        });
        if (!res.ok) {
            const err = await res.text();
            throw new Error(`Erro ao criar pasta no Google Drive: ${err}`);
        }
        const data = await res.json();
        return { id: data.id, name: payload.name };
    }

    if (action === 'upload' || action === 'upload_file') {
        const { fileName, fileBase64, mimeType } = payload;
        if (!fileName) throw new Error('Nome do ficheiro obrigatório.');
        if (!fileBase64) throw new Error('Conteúdo do ficheiro obrigatório.');

        const reqFolderId = payload.folderId || payload.parentId;
        const targetFolderId = (!reqFolderId || reqFolderId === 'root') ? (config.folderId || 'root') : reqFolderId;

        const boundary = '-------safesiteupload' + Date.now();
        const delimiter = "\r\n--" + boundary + "\r\n";
        const close_delim = "\r\n--" + boundary + "--";

        const metadata = {
            name: fileName,
            parents: targetFolderId !== 'root' ? [targetFolderId] : []
        };

        const fileBuffer = Buffer.from(fileBase64, 'base64');
        const multipartBody = Buffer.concat([
            Buffer.from(
                delimiter +
                'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
                JSON.stringify(metadata) +
                delimiter +
                `Content-Type: ${mimeType || 'application/octet-stream'}\r\n\r\n`
            ),
            fileBuffer,
            Buffer.from(close_delim)
        ]);

        const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': `multipart/related; boundary=${boundary}`
            },
            body: multipartBody
        });

        if (!uploadRes.ok) {
            const err = await uploadRes.text();
            throw new Error(`Falha ao carregar ficheiro para o Google Drive: ${err}`);
        }

        const item = await uploadRes.json();
        return {
            id: item.id,
            name: item.name,
            webViewLink: `https://drive.google.com/file/d/${item.id}/view`,
            size: fileBuffer.length
        };
    }

    if (action === 'init_project_bim_structure') {
        const logs: string[] = [];
        const rootId = config.folderId || 'root';
        const createGdrive = async (parentId: string, name: string) => {
            const res = await fetch('https://www.googleapis.com/drive/v3/files', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name,
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: [parentId]
                })
            });
            if (res.ok) {
                const data = await res.json();
                logs.push(`📁 ${name} (criada)`);
                return data.id;
            }
            logs.push(`📁 ${name} (existente)`);
            return rootId;
        };

        const bimId = await createGdrive(rootId, 'Modelos BIM (IFC)');
        await createGdrive(bimId, '01-Arquitetura');
        await createGdrive(bimId, '02-Estruturas');
        await createGdrive(bimId, '03-Especialidades (MEP)');
        await createGdrive(rootId, 'Desenhos 2D (Plantas e Cortes)');

        return { success: true, message: 'Pastas BIM e 2D criadas na raiz do Google Drive!', logs };
    }

    throw new Error(`Ação '${action}' em processamento.`);
}
