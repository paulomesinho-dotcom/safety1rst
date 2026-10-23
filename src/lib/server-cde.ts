import { prisma } from '@/lib/prisma';
import { encryptSecret, decryptSecret, sanitizeCdeConfig } from './server-crypto';

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
export async function getProjectCdeConfig(projectId: string): Promise<DecryptedCdeConfig | null> {
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true, cdeConfig: true }
    });

    if (!project || !project.cdeConfig || typeof project.cdeConfig !== 'object') {
        return null;
    }

    const raw = project.cdeConfig as Record<string, any>;

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

/**
 * Saves and securely encrypts CDE configuration into the database.
 * Preserves previously stored secrets if user submitted a masked value or left blank.
 */
export async function saveProjectCdeConfig(projectId: string, incoming: Record<string, any>) {
    // 1. Fetch existing config to preserve secrets if masked
    const existing = await getProjectCdeConfig(projectId);

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
    const encryptedConfig = {
        provider: incoming.provider || existing?.provider || null,
        connected: incoming.connected !== undefined ? Boolean(incoming.connected) : (existing?.connected ?? false),
        lastSync: incoming.lastSync || new Date().toISOString(),
        siteUrl: incoming.siteUrl?.trim() ?? existing?.siteUrl ?? '',
        folderUrl: incoming.folderUrl?.trim() ?? incoming.folderPath?.trim() ?? existing?.folderUrl ?? '',
        folderPath: incoming.folderPath?.trim() ?? incoming.folderUrl?.trim() ?? existing?.folderPath ?? '',
        folderId: incoming.folderId?.trim() ?? existing?.folderId ?? '',
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

    const updated = await prisma.project.update({
        where: { id: projectId },
        data: {
            cdeConfig: encryptedConfig as any
        },
        select: { id: true, cdeConfig: true }
    });

    return sanitizeCdeConfig(updated.cdeConfig);
}

/**
 * Disconnects and purges CDE secrets for a project.
 */
export async function disconnectProjectCde(projectId: string) {
    const updated = await prisma.project.update({
        where: { id: projectId },
        data: {
            cdeConfig: {
                provider: null,
                connected: false,
                lastSync: new Date().toISOString()
            } as any
        },
        select: { id: true, cdeConfig: true }
    });

    return sanitizeCdeConfig(updated.cdeConfig);
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
    const url = new URL(siteUrl);
    const host = url.hostname;
    let smartPath = url.pathname.replace(/\/$/, '');
    const commonJunk = ['/shared documents', '/forms', '/lists', '/_layouts', '/sitepages'];
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

    if (action === 'test_connection') {
        return { success: true, message: 'Ligação ao SharePoint estabelecida com sucesso!', siteId, siteName: siteData.displayName };
    }

    if (action === 'list') {
        const folderId = payload.folderId;
        const queryUrl = (!folderId || folderId === 'root')
            ? `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root/children`
            : `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${folderId}/children`;

        const driveRes = await fetch(queryUrl, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!driveRes.ok) {
            const err = await driveRes.text();
            throw new Error(`Falha ao listar itens do SharePoint: ${err}`);
        }

        const driveData = await driveRes.json();
        const files = (driveData.value || []).map((item: any) => ({
            id: item.id,
            name: item.name,
            mimeType: item.folder ? 'application/vnd.google-apps.folder' : item.file?.mimeType,
            webViewLink: item.webUrl,
            size: item.size
        }));

        return { files, siteId };
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
        return { success: true, message: 'Google Drive configurado no servidor.' };
    }

    throw new Error(`Ação '${action}' em processamento.`);
}
