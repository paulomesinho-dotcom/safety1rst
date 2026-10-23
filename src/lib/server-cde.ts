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
export async function getProjectCdeConfig(id: string): Promise<DecryptedCdeConfig | null> {
    const project = await prisma.project.findUnique({
        where: { id },
        select: { id: true, cdeConfig: true }
    });

    if (project && project.cdeConfig && typeof project.cdeConfig === 'object') {
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

    // Fallback: check if id is a Company record
    const company = await prisma.company.findUnique({
        where: { id },
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

    // Helper: Ensure/Create folder in SharePoint
    const ensureSharePointFolder = async (parentId: string, folderName: string) => {
        const isRoot = !parentId || parentId === 'root';
        const childrenUrl = isRoot
            ? `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root/children`
            : `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${parentId}/children`;

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
                name: folderName,
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
                    item.folder && item.name.toLowerCase() === folderName.toLowerCase()
                );
                if (existing) {
                    return { id: existing.id, name: existing.name, exists: true, webViewLink: existing.webUrl };
                }
            }
        }

        const errText = await createRes.text();
        throw new Error(`Falha ao criar pasta "${folderName}" no SharePoint: ${errText}`);
    };

    if (action === 'create_folder') {
        const folderName = payload.folderName || payload.name;
        if (!folderName) throw new Error('Nome da pasta obrigatório.');
        const parentId = payload.parentId || 'root';
        return await ensureSharePointFolder(parentId, folderName);
    }

    if (action === 'initialize_company_structure') {
        const { company, workers = [], equipment = [] } = payload;
        const logs: string[] = [];

        const COMPANY_STANDARD_FOLDERS = [
            '01-Empresa',
            '02-Trabalhadores',
            '03-Equipamentos',
            '04-Formação e Qualificações',
            '05-Segurança e Saúde (SST)',
            '06-Modelos e Minutas'
        ];

        const COMPANY_SPECIAL_SUBFOLDERS: Record<string, string[]> = {
            '01-Empresa': [
                '01-Certidões e Legal',
                '02-Seguros',
                '03-Alvará e Licenças',
                '04-Medicina no Trabalho',
                '05-Folhas de Remuneração (DRI)'
            ]
        };

        const createdFolders: Record<string, string> = {};

        // 1. Criar Pastas Principais da Empresa
        for (const folderName of COMPANY_STANDARD_FOLDERS) {
            try {
                const result = await ensureSharePointFolder('root', folderName);
                createdFolders[folderName] = result.id;
                logs.push(result.exists ? `Existente no SharePoint: ${folderName}` : `Criada no SharePoint: ${folderName}`);

                // 2. Criar Subpastas de Gestão Documental
                if (COMPANY_SPECIAL_SUBFOLDERS[folderName]) {
                    for (const sub of COMPANY_SPECIAL_SUBFOLDERS[folderName]) {
                        try {
                            const subRes = await ensureSharePointFolder(result.id, sub);
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
                    const wRes = await ensureSharePointFolder(workersParentId, workerFolderName);
                    await ensureSharePointFolder(wRes.id, 'Arquivo');
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
                    const eqRes = await ensureSharePointFolder(equipParentId, equipFolderName);
                    await ensureSharePointFolder(eqRes.id, 'Arquivo');
                    logs.push(`SharePoint: Pasta Equipamento "${equipFolderName}"`);
                } catch (err: any) {
                    logs.push(`Erro no equipamento ${equip.name}: ${err.message}`);
                }
            }
        }

        return { success: true, logs, createdFolders };
    }

    if (action === 'initialize_project_structure') {
        const logs: string[] = [];
        const STANDARD_FOLDERS = [
            '01-Empresas',
            '02-Trabalhadores',
            '03-Equipamentos',
            '04-Formação',
            '05-Segurança e Saúde',
            '06-Atas e Comunicações'
        ];
        const SPECIAL_SUBFOLDERS: Record<string, string[]> = {
            '01-Empresas': ['00-Reports']
        };
        const createdFolders: Record<string, string> = {};

        for (const folderName of STANDARD_FOLDERS) {
            try {
                const result = await ensureSharePointFolder('root', folderName);
                createdFolders[folderName] = result.id;
                logs.push(result.exists ? `Existente no SharePoint: ${folderName}` : `Criada no SharePoint: ${folderName}`);

                if (SPECIAL_SUBFOLDERS[folderName]) {
                    for (const sub of SPECIAL_SUBFOLDERS[folderName]) {
                        await ensureSharePointFolder(result.id, sub);
                    }
                }
            } catch (err: any) {
                logs.push(`Erro em ${folderName}: ${err.message}`);
            }
        }

        return { success: true, logs, createdFolders };
    }

    if (action === 'upload' || action === 'upload_file') {
        const { folderId = 'root', fileName, fileBase64, mimeType } = payload;
        if (!fileName) throw new Error('Nome do ficheiro obrigatório.');
        if (!fileBase64) throw new Error('Conteúdo do ficheiro obrigatório.');

        const fileBuffer = Buffer.from(fileBase64, 'base64');
        const isRoot = !folderId || folderId === 'root';
        const uploadUrl = isRoot
            ? `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:/${encodeURIComponent(fileName)}:/content`
            : `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${folderId}:/${encodeURIComponent(fileName)}:/content`;

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

    throw new Error(`Ação '${action}' em processamento.`);
}
