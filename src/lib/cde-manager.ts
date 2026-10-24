import { CDEConfig } from '@/types';

export const STANDARD_FOLDERS = [
    '01-Empresas',
    '02-Trabalhadores',
    '03-Equipamentos',
    '04-Controlo de Acessos',
    '05-Sinistralidade',
    '06-Formação',
    '07-Formulários',
    '08-Auditorias'
];

export const SPECIAL_SUBFOLDERS: Record<string, string[]> = {
    '01-Empresas': ['00-Reports']
};

export const COMPANY_STANDARD_FOLDERS = [
    '01-Empresa',
    '02-Trabalhadores',
    '03-Equipamentos',
    '04-Formação e Qualificações',
    '05-Segurança e Saúde (SST)',
    '06-Modelos e Minutas'
];

export const COMPANY_SPECIAL_SUBFOLDERS: Record<string, string[]> = {
    '01-Empresa': [
        '01-Certidão Comercial',
        '02-Seguros',
        '03-Certidões Não Dívida (AT e SS)',
        '04-Alvará e Título Registo',
        '05-Medicina no Trabalho',
        '06-Folhas de Remunerações',
        'Arquivo'
    ],
    '04-Formação e Qualificações': [
        'Planos de Formação',
        'Manuais de Acolhimento',
        'Certificados',
        'Arquivo'
    ],
    '05-Segurança e Saúde (SST)': [
        'Avaliações de Risco',
        'Procedimentos de Trabalho Seguro',
        'Registos de Acidentes',
        'Arquivo'
    ]
};

interface CreateFolderResult {
    id: string; // ID or Path depending on provider
    name: string;
    exists: boolean;
}

// Helper: Create Folder in Google Drive
// We need to use the Frontend helper functions/logic, 
// OR we reimplement the API calls here if this runs on client.
// Since this is a lib file, it effectively runs on client if imported in client component.
// We'll rely on the existing server actions/API routes via fetch.

async function createGoogleDriveFolder(accessToken: string, parentId: string, name: string): Promise<CreateFolderResult> {
    // 1. Check if exists (Listing)
    // Use URLSearchParams for safe encoding
    const q = `'${parentId}' in parents and name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const params = new URLSearchParams({
        q: q,
        fields: 'files(id,name)',
        access_token: accessToken
    });

    try {
        const listRes = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`);
        if (!listRes.ok) {
            console.error('GDrive List Failed', await listRes.text());
            // If list fails, we might assume it doesn't exist? Or throw?
            // Safer to throw or return null, but let's try to proceed to create if it's a 404? 
            // GDrive search usually returns 200 with empty list.
        } else {
            const listData = await listRes.json();
            if (listData.files && listData.files.length > 0) {
                return { id: listData.files[0].id, name, exists: true };
            }
        }
    } catch (e) {
        console.error('GDrive List Error', e);
    }

    // 2. Create
    try {
        const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [parentId]
            })
        });

        if (!createRes.ok) {
            const errText = await createRes.text();
            throw new Error('GDrive Create Failed: ' + errText);
        }

        const createData = await createRes.json();
        return { id: createData.id, name, exists: false };
    } catch (e) {
        throw e;
    }
}

async function createDropboxFolder(accessToken: string, parentPath: string, name: string): Promise<CreateFolderResult> {
    // Dropbox parentPath: "" (root) or "/Folder"
    // New Path: "/Folder/Name" or "/Name"

    const cleanParent = parentPath === 'root' || !parentPath || parentPath === '/' ? '' : parentPath;
    const newPath = `${cleanParent}/${name}`;

    try {
        // PREMATURE CREATE REMOVED


        // The API route handles "path/conflict" internally? 
        // Actually our route throws error on conflict usually, unless we check.
        // Wait, our route returns the folder metadata if successful.
        // If it fails (e.g. exists), we might get error.
        // Ideally we should LIST first or catch the specific "conflict" error.

        // Let's rely on the route's behavior. If it fails, we check why.
        // But for automation, "ensure" is better.
        // Let's List first to be safe and consistent.

        // Debug Dropbox List
        console.log(`Dropbox: Listing '${cleanParent}' looking for '${name}'...`);
        const listRes = await fetch('/api/integration/dropbox', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'list', accessToken, path: cleanParent })
        });

        if (!listRes.ok) {
            const errText = await listRes.text();
            // Check for expired token in list operation first to avoid spamming console
            if (errText.includes('expired_access_token')) {
                throw new Error(JSON.stringify({ error: 'expired_access_token', details: errText }));
            }
            console.error('Dropbox List Failed', errText);
            // For other errors, we might still want to try creating
        }

        const listData = await listRes.json();

        console.log(`Dropbox: List Result for '${cleanParent}':`, listData.files?.map((f: any) => f.name));

        // Route returns { files: [...] } mapped from entries
        const existing = listData.files?.find((f: any) => f.name.toLowerCase() === name.toLowerCase());

        if (existing) {
            console.log(`Dropbox: Found existing folder '${name}' -> ${existing.id}`);
            return { id: existing.webViewLink || existing.id, name, exists: true }; // route maps id=path_display, webViewLink=path_display
        }

        console.log(`Dropbox: Folder '${name}' NOT found. Creating...`);
        // alert(`DEBUG: Creating Folder '${name}' in '${cleanParent}'`); // Commented out to avoid spam, but useful if desperate.

        // Create
        // Use autorename: false (in API route) to prevent duplication. If it exists, we catch the error.
        const createRes = await fetch('/api/integration/dropbox', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'create_folder',
                accessToken,
                path: cleanParent,
                name: name,
                autorename: false // Added this param to route
            })
        });

        if (!createRes.ok) {
            const errText = await createRes.text();

            // Check for expired token in create operation
            if (errText.includes('expired_access_token')) {
                throw new Error(JSON.stringify({ error: 'expired_access_token', details: errText }));
            }

            console.error('Dropbox Create Failed', errText);

            // Check for conflict (folder already exists)
            if (errText.includes('conflict') || errText.includes('path/conflict')) {
                console.log(`Dropbox: Conflict detected for '${name}'. Assuming it exists.`);
                const conflictPath = `${cleanParent === '/' ? '' : cleanParent}/${name}`;
                return { id: conflictPath, name, exists: true };
            }

            throw new Error('Dropbox Create Failed: ' + errText);
        }

        const createData = await createRes.json();
        // Dropbox API returns { metadata: { ... } }
        // Route returns exactly what API returns
        const metadata = createData.metadata || createData;
        const newPath = metadata.path_display || metadata.id;

        if (!newPath) {
            console.error('Dropbox Create missing path', createData);
            throw new Error('Dropbox Create returned no path');
        }

        console.log(`Dropbox: Created successfully '${newPath}'`);
        return { id: newPath, name, exists: false };
    } catch (e) {
        throw e;
    }
}

export async function createOneDriveFolder(config: CDEConfig, parentId: string, name: string): Promise<CreateFolderResult> {
    const compOrProjId = (config as any).projectId || (config as any).id || (config as any).companyId || 'comp_master';

    // 1. Tentar via endpoint de ação CDE no servidor (que tem credenciais desencriptadas)
    try {
        const res = await fetch(`/api/projects/${compOrProjId}/cde/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'create_folder',
                payload: { parentId, folderName: name }
            })
        });
        if (res.ok) {
            const data = await res.json();
            if (data.result) return data.result;
        }
    } catch (err) {
        console.warn('Fallback para /api/integration/sharepoint:', err);
    }

    // 2. Fallback via /api/integration/sharepoint
    const res2 = await fetch('/api/integration/sharepoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'create_folder',
            clientId: config.clientId,
            clientSecret: (config as any).clientSecret,
            tenantId: config.tenantId,
            siteUrl: config.siteUrl,
            parentId,
            folderName: name,
            projectId: compOrProjId,
            folderPath: config.folderPath,
            folderId: config.folderId
        })
    });

    if (!res2.ok) {
        const errData = await res2.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(errData.error || 'Falha ao criar pasta no SharePoint');
    }

    const data2 = await res2.json();
    return data2.folder || data2;
}

export async function refreshDropboxToken(config: CDEConfig): Promise<{ accessToken: string, expiresAt: number }> {
    if (!config.refreshToken || !config.appKey || !config.appSecret) {
        throw new Error('Missing Refresh Token or App Credentials');
    }

    const res = await fetch('/api/integration/dropbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'refresh',
            refreshToken: config.refreshToken,
            appKey: config.appKey,
            appSecret: config.appSecret
        })
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error);

    return {
        accessToken: data.access_token,
        expiresAt: Date.now() + (data.expires_in * 1000)
    };
}


export async function initializeProjectStructure(
    config: CDEConfig,
    onTokenRefresh?: (token: string, expiresAt: number) => void
): Promise<string[]> {
    if (!config.connected) throw new Error('CDE not connected');

    const compOrProjId = (config as any).projectId || (config as any).id || (config as any).companyId || 'comp_master';

    // Execução ultra-rápida no servidor para SharePoint
    if (config.provider === 'onedrive' || (config.provider as string) === 'sharepoint') {
        try {
            const srvRes = await fetch(`/api/projects/${compOrProjId}/cde/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'initialize_project_structure',
                    payload: {}
                })
            });
            if (srvRes.ok) {
                const srvData = await srvRes.json();
                if (srvData.result?.logs) return srvData.result.logs;
            }
        } catch (srvErr) {
            console.warn('Server initialize_project_structure fallback:', srvErr);
        }
    }

    const rootId = (config.provider === 'gdrive' ? (config.folderId || 'root') :
        config.provider === 'dropbox' ? (config.folderPath || '') :
            (config.folderId || 'root'));

    if (!rootId && rootId !== '') throw new Error('Root folder not defined');

    const logs: string[] = [];

    try {
        // 1. Create Standard Folders
        for (const folderName of STANDARD_FOLDERS) {
            let result: CreateFolderResult | null = null;

            try {
                if (config.provider === 'gdrive') {
                    result = await createGoogleDriveFolder(config.accessToken!, rootId, folderName);
                } else if (config.provider === 'dropbox') {
                    result = await createDropboxFolder(config.accessToken!, rootId, folderName);
                } else if (config.provider === 'onedrive' || (config.provider as string) === 'sharepoint') {
                    result = await createOneDriveFolder(config, rootId, folderName);
                }

                if (result) {
                    if (result.exists) logs.push(`Found existing: ${folderName}`);
                    else logs.push(`Created: ${folderName}`);

                    // 2. Create Special Subfolders (e.g. 00-Reports in 01-Empresas)
                    if (SPECIAL_SUBFOLDERS[folderName]) {
                        for (const sub of SPECIAL_SUBFOLDERS[folderName]) {
                            if (config.provider === 'gdrive') {
                                await createGoogleDriveFolder(config.accessToken!, result.id, sub);
                            } else if (config.provider === 'dropbox') {
                                await createDropboxFolder(config.accessToken!, result.id, sub);
                            } else if (config.provider === 'onedrive' || (config.provider as string) === 'sharepoint') {
                                await createOneDriveFolder(config, result.id, sub);
                            }
                        }
                    }
                }
            } catch (e: any) {
                const errJson = JSON.stringify(e.message || e);
                if (config.provider === 'dropbox' && (errJson.includes('expired_access_token') || (e.message && e.message.includes('expired_access_token')))) {
                    throw e; // Pass to outer catch for token refresh
                }
                logs.push(`Error creating ${folderName}: ${e.message}`);
            }
        }

        return logs;
    } catch (e: any) {
        const errJson = JSON.stringify(e.message || e);
        const isDropboxExpired = config.provider === 'dropbox' &&
            (errJson.includes('expired_access_token') || (e.message && e.message.includes('expired_access_token')));

        if (isDropboxExpired) {
            if (!config.refreshToken) {
                console.error('Dropbox Token Expired and No Refresh Token available.');
                throw new Error('Dropbox Session Expired. Please go to Settings and Reconnect Dropbox.');
            }

            console.log('Dropbox Token Expired during initialization. Refreshing...');
            try {
                const refreshed = await refreshDropboxToken(config);
                if (onTokenRefresh) {
                    onTokenRefresh(refreshed.accessToken, refreshed.expiresAt);
                }
                const newConfig = { ...config, accessToken: refreshed.accessToken };
                // Retry with new token
                return await initializeProjectStructure(newConfig, onTokenRefresh);
            } catch (refreshErr) {
                console.error('Failed to refresh token during initialization', refreshErr);
                throw new Error('Failed to refresh Dropbox session. Please Reconnect.');
            }
        }

        throw e;
    }
}

/**
 * Inicializa a estrutura documental tipo para o ambiente corporativo da empresa.
 * Cria pastas normalizadas para a Empresa, Trabalhadores e Equipamentos.
 */
export async function initializeCompanyStructure(
    config: CDEConfig,
    company: { name: string; nif?: string },
    workers: Array<{ id: string; name: string; nif?: string; idNumber?: string }> = [],
    equipment: Array<{ id: string; name: string; licensePlate?: string; serialNumber?: string }> = [],
    onTokenRefresh?: (token: string, expiresAt: number) => void
): Promise<string[]> {
    if (!config.connected) throw new Error('CDE não está conectado. Ligue o CDE para criar a estrutura na Cloud.');

    const compOrProjId = (config as any).projectId || (config as any).companyId || 'comp_master';

    // Execução direta e segura no servidor para Microsoft SharePoint / Entra ID
    if (config.provider === 'onedrive' || (config.provider as string) === 'sharepoint') {
        try {
            const srvRes = await fetch(`/api/projects/${compOrProjId}/cde/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'initialize_company_structure',
                    payload: { company, workers, equipment }
                })
            });

            if (srvRes.ok) {
                const srvData = await srvRes.json();
                if (srvData.result?.logs) return srvData.result.logs;
            } else {
                const err = await srvRes.json().catch(() => ({ error: 'Falha ao contactar servidor CDE' }));
                throw new Error(err.error || 'Falha ao criar pastas no SharePoint.');
            }
        } catch (srvErr: any) {
            console.warn('Server initialize_company_structure error, trying step-by-step:', srvErr);
            throw srvErr;
        }
    }

    const rootId = (config.provider === 'gdrive' ? config.folderId :
        config.provider === 'dropbox' ? (config.folderPath || '') :
            'root');

    if (!rootId && rootId !== '') throw new Error('Pasta raiz do CDE não definida.');

    const logs: string[] = [];

    const createFolder = async (parentId: string, folderName: string): Promise<CreateFolderResult | null> => {
        if (config.provider === 'gdrive') {
            return await createGoogleDriveFolder(config.accessToken!, parentId, folderName);
        } else if (config.provider === 'dropbox') {
            return await createDropboxFolder(config.accessToken!, parentId, folderName);
        } else if (config.provider === 'onedrive' || (config.provider as string) === 'sharepoint') {
            return await createOneDriveFolder(config, parentId, folderName);
        }
        return { id: `${parentId}/${folderName}`, name: folderName, exists: false };
    };

    try {
        const createdFolders: Record<string, string> = {};

        // 1. Criar Pastas Principais da Empresa
        for (const folderName of COMPANY_STANDARD_FOLDERS) {
            try {
                const result = await createFolder(rootId, folderName);
                if (result) {
                    createdFolders[folderName] = result.id;
                    if (result.exists) logs.push(`Existente: ${folderName}`);
                    else logs.push(`Criada: ${folderName}`);

                    // 2. Criar Subpastas de Gestão Documental
                    if (COMPANY_SPECIAL_SUBFOLDERS[folderName]) {
                        for (const sub of COMPANY_SPECIAL_SUBFOLDERS[folderName]) {
                            await createFolder(result.id, sub);
                        }
                    }
                }
            } catch (err: any) {
                logs.push(`Erro em ${folderName}: ${err.message}`);
            }
        }

        // 3. Criar Pastas Individuais dos Trabalhadores da Empresa
        const workersParentId = createdFolders['02-Trabalhadores'];
        if (workersParentId && workers.length > 0) {
            for (const worker of workers) {
                try {
                    const idTag = worker.idNumber || worker.nif || worker.id.slice(0, 8);
                    const workerFolderName = `${idTag}-${worker.name.trim()}`;
                    const res = await createFolder(workersParentId, workerFolderName);
                    if (res) {
                        await createFolder(res.id, 'Arquivo');
                        logs.push(`Criada pasta colaborador: ${worker.name}`);
                    }
                } catch (e: any) {
                    console.error('Erro ao criar pasta do trabalhador:', e);
                }
            }
        }

        // 4. Criar Pastas Individuais dos Equipamentos da Empresa
        const equipParentId = createdFolders['03-Equipamentos'];
        if (equipParentId && equipment.length > 0) {
            for (const eq of equipment) {
                try {
                    const idTag = eq.licensePlate || eq.serialNumber || eq.id.slice(0, 8);
                    const equipFolderName = `${idTag}-${eq.name.trim()}`;
                    const res = await createFolder(equipParentId, equipFolderName);
                    if (res) {
                        await createFolder(res.id, 'Arquivo');
                        logs.push(`Criada pasta equipamento: ${eq.name}`);
                    }
                } catch (e: any) {
                    console.error('Erro ao criar pasta do equipamento:', e);
                }
            }
        }

        return logs;
    } catch (e: any) {
        throw e;
    }
}

/**
 * Upload de ficheiro para uma pasta específica do CDE (GDrive ou Dropbox).
 */
export async function uploadToCDEFolder(
    config: CDEConfig,
    targetFolderIdOrPath: string,
    file: File
): Promise<{ id: string; webViewLink?: string; size: number; name: string }> {
    if (!config.connected || !config.accessToken) {
        throw new Error('CDE não conectado');
    }

    if (config.provider === 'gdrive') {
        const uploaded = await uploadToGoogleDrive(config.accessToken!, targetFolderIdOrPath, file);
        return {
            id: uploaded.id,
            webViewLink: uploaded.webViewLink,
            size: file.size,
            name: file.name
        };
    } else if (config.provider === 'dropbox') {
        const uploaded = await uploadToDropbox(config.accessToken!, targetFolderIdOrPath, file);
        return {
            id: uploaded.id,
            webViewLink: uploaded.webViewLink,
            size: file.size,
            name: file.name
        };
    } else if (config.provider === 'onedrive' || (config.provider as string) === 'sharepoint') {
        const compOrProjId = (config as any).projectId || (config as any).companyId || 'comp_master';
        const arrayBuffer = await file.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const srvRes = await fetch(`/api/projects/${compOrProjId}/cde/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'upload_file',
                payload: {
                    folderId: targetFolderIdOrPath,
                    fileName: file.name,
                    fileBase64: base64,
                    mimeType: file.type || 'application/octet-stream'
                }
            })
        });
        if (!srvRes.ok) {
            const err = await srvRes.json().catch(() => ({ error: 'Falha no upload para SharePoint' }));
            throw new Error(err.error || 'Falha no upload para SharePoint');
        }
        const srvData = await srvRes.json();
        const item = srvData.result;
        return {
            id: item.id,
            webViewLink: item.webViewLink,
            size: item.size || file.size,
            name: item.name
        };
    }

    throw new Error(`Upload para fornecedor ${config.provider} não suportado diretamente.`);
}

export async function createEntityFolder(
    config: CDEConfig,
    type: 'company' | 'worker' | 'equipment',
    name: string,
    identifier?: string, // NIF or ID
    onTokenRefresh?: (token: string, expiresAt: number) => void
): Promise<string> {
    if (!config.connected) return 'CDE Disconnected';

    const rootId = (config.provider === 'gdrive' ? (config.folderId || 'root') :
        config.provider === 'dropbox' ? (config.folderPath || '') :
            'root');

    // DEBUG: Check Config
    console.log('createEntityFolder: Config Provider:', config.provider);
    console.log('createEntityFolder: Has Refresh Token?', !!config.refreshToken);
    console.log('createEntityFolder: Access Token (last 4):', config.accessToken?.slice(-4));

    // 1. Determine Parent Folder Name
    const parentMap: Record<string, string> = {
        'company': '01-Empresas',
        'worker': '02-Trabalhadores',
        'equipment': '03-Equipamentos'
    };
    const parentName = parentMap[type];
    if (!parentName) return 'Unknown Entity Type';

    try {
        let parentIdOrPath = rootId;

        // 2. Find Parent Folder (01-Empresas, etc.)
        if (config.provider === 'gdrive') {
            const res = await createGoogleDriveFolder(config.accessToken!, rootId, parentName);
            parentIdOrPath = res.id;
        } else if (config.provider === 'dropbox') {
            const res = await createDropboxFolder(config.accessToken!, rootId, parentName);
            parentIdOrPath = res.id; // Correct path
        } else if (config.provider === 'onedrive' || (config.provider as string) === 'sharepoint') {
            const res = await createOneDriveFolder(config, rootId, parentName);
            parentIdOrPath = res.id;
        }

        // 3. Create Entity Folder (Number-Name)
        const folderName = identifier ? `${identifier}-${name}` : name;

        let entityFolderId = '';
        if (config.provider === 'gdrive') {
            const res = await createGoogleDriveFolder(config.accessToken!, parentIdOrPath!, folderName);
            entityFolderId = res.id;
        } else if (config.provider === 'dropbox') {
            const res = await createDropboxFolder(config.accessToken!, parentIdOrPath!, folderName);
            entityFolderId = res.id;
        } else if (config.provider === 'onedrive' || (config.provider as string) === 'sharepoint') {
            const res = await createOneDriveFolder(config, parentIdOrPath!, folderName);
            entityFolderId = res.id;
        }

        // 4. Create "Arquivo" subfolder
        if (config.provider === 'gdrive') {
            await createGoogleDriveFolder(config.accessToken!, entityFolderId, 'Arquivo');
        } else if (config.provider === 'dropbox') {
            await createDropboxFolder(config.accessToken!, entityFolderId, 'Arquivo');
        } else if (config.provider === 'onedrive' || (config.provider as string) === 'sharepoint') {
            await createOneDriveFolder(config, entityFolderId, 'Arquivo');
        }


        return `Created Folder: ${parentName}/${folderName}`;
    } catch (e: any) {
        const errJson = JSON.stringify(e.message || e);
        const isDropboxExpired = config.provider === 'dropbox' &&
            (errJson.includes('expired_access_token') || (e.message && e.message.includes('expired_access_token')));

        if (isDropboxExpired) {
            if (!config.refreshToken) {
                console.error('Dropbox Token Expired and No Refresh Token available.');
                return 'Error: Dropbox Session Expired. Please go to Settings and Reconnect Dropbox.';
            }

            console.log('Dropbox Token Expired. Refreshing...');
            try {
                const refreshed = await refreshDropboxToken(config);
                if (onTokenRefresh) {
                    onTokenRefresh(refreshed.accessToken, refreshed.expiresAt);
                }
                const newConfig = { ...config, accessToken: refreshed.accessToken };
                // Retry with new token
                return await createEntityFolder(newConfig, type, name, identifier, onTokenRefresh);
            } catch (refreshErr) {
                console.error('Failed to refresh token during creation', refreshErr);
                return 'Error: Failed to refresh Dropbox session. Please Reconnect.';
            }
        }

        console.error('CDE Create Error', e);
        return 'Error creating folder: ' + (e.message || 'Unknown Error');
    }
}

export async function archiveCDEFile(
    config: CDEConfig,
    fileId: string,
    parentId: string, // For GDrive: ID of parent; For Dropbox: Path of parent
    versionTag?: string // e.g. "v1", "v2"
): Promise<{ success: boolean; message: string; newId?: string; newName?: string }> {
    if (!config.connected || !config.accessToken) return { success: false, message: 'Disconnected' };

    try {
        let archiveFolderId = '';
        const now = new Date();
        const pad = (n: number) => n.toString().padStart(2, '0');
        // Short Timestamp: YYMMDD_HHmm (Requested by user: "curto")
        const shortYear = now.getFullYear().toString().slice(-2);
        const timestamp = `${shortYear}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;

        const suffix = versionTag ? `_${versionTag}_${timestamp}` : `_${timestamp}`;

        if (config.provider === 'gdrive') {
            // 1. Find or Create "Arquivo" in parentId
            const res = await createGoogleDriveFolder(config.accessToken, parentId, 'Arquivo');
            archiveFolderId = res.id;

            // 2. Rename File (Append Timestamp)
            // Fetch file to get name
            const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,parents&access_token=${config.accessToken}`);
            const fileData = await fileRes.json();
            const originalName = fileData.name || 'Untitled';
            const nameParts = originalName.split('.');
            const ext = nameParts.length > 1 ? nameParts.pop() : '';
            const base = nameParts.join('.');
            const newName = `${base}${suffix}.${ext}`;

            // 3. Move AND Rename
            const previousParents = fileData.parents ? fileData.parents.join(',') : '';

            const moveRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${archiveFolderId}&removeParents=${previousParents}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${config.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: newName })
            });


            console.log('archiveCDEFile: Renaming (GDrive) to:', newName);

            if (!moveRes.ok) throw new Error('GDrive Move Failed');

            return { success: true, message: 'File Archived', newId: fileId, newName: newName }; // ID doesn't change

        } else if (config.provider === 'dropbox') {
            // 1. Find or Create "Arquivo"
            const res = await createDropboxFolder(config.accessToken, parentId, 'Arquivo');
            const archivePath = res.id;

            // 2. Move File
            // Fetch metadata to get name
            const metaRes = await fetch('https://api.dropboxapi.com/2/files/get_metadata', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ path: fileId })
            });
            const metaData = await metaRes.json();
            if (!metaData.name) throw new Error('Dropbox File Not Found');

            const nameParts = metaData.name.split('.');
            const ext = nameParts.length > 1 ? nameParts.pop() : '';
            const base = nameParts.join('.');
            const newName = `${base}${suffix}.${ext}`;

            const toPath = `${archivePath}/${newName}`;

            const moveRes = await fetch('https://api.dropboxapi.com/2/files/move_v2', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from_path: fileId,
                    to_path: toPath,
                    autorename: true
                })
            });

            if (!moveRes.ok) throw new Error('Dropbox Move Failed');

            return { success: true, message: 'File Archived', newId: toPath, newName: newName };
        }

        return { success: false, message: 'Unknown Provider' };
    } catch (e: any) {
        console.error('Archive Error', e);
        return { success: false, message: e.message };
    }
}

// Helper: Upload to Google Drive
async function uploadToGoogleDrive(accessToken: string, folderId: string, file: File): Promise<{ id: string, webViewLink: string }> {
    const metadata = {
        name: file.name,
        parents: [folderId]
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`
        },
        body: form
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Upload failed');
    }

    return await res.json();
}

/**
 * Delete a file from CDE (for Rollback)
 */
export async function deleteCDEFile(config: CDEConfig, fileId: string): Promise<void> {
    if (!config.connected) return;

    try {
        if (config.provider === 'gdrive' && config.accessToken) {
            await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?access_token=${config.accessToken}`, {
                method: 'DELETE'
            });
        } else if (config.provider === 'dropbox' && config.accessToken) {
            await fetch('https://api.dropboxapi.com/2/files/delete_v2', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ path: fileId })
            });
        } else if (config.provider === 'onedrive' || (config.provider as string) === 'sharepoint') {
            const compOrProjId = (config as any).projectId || (config as any).companyId || 'comp_master';
            await fetch(`/api/projects/${compOrProjId}/cde/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'delete_file',
                    payload: { fileId }
                })
            });
        }
    } catch (e) {
        console.error('Delete CDE File Failed', e);
    }
}

/**
 * Move a file in CDE (for Rollback of Archive)
 */
export async function moveCDEFile(config: CDEConfig, fileId: string, targetParentIdOrPath: string): Promise<void> {
    if (!config.connected || !config.accessToken) return;

    try {
        if (config.provider === 'gdrive') {
            // Get current parents
            const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=parents&access_token=${config.accessToken}`);
            const fileData = await fileRes.json();
            const previousParents = fileData.parents ? fileData.parents.join(',') : '';

            await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${targetParentIdOrPath}&removeParents=${previousParents}&access_token=${config.accessToken}`, {
                method: 'PATCH'
            });

        } else if (config.provider === 'dropbox') {
            // Need to get filename to construct TO path
            const metaRes = await fetch('https://api.dropboxapi.com/2/files/get_metadata', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ path: fileId })
            });
            const metaData = await metaRes.json();
            const fileName = metaData.name;
            const toPath = `${targetParentIdOrPath}/${fileName}`;

            await fetch('https://api.dropboxapi.com/2/files/move_v2', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from_path: fileId,
                    to_path: toPath,
                    autorename: true
                })
            });
        }
    } catch (e) {
        console.error('Move CDE File Failed', e);
    }
}

// Helper: Upload to Dropbox
async function uploadToDropbox(accessToken: string, folderPath: string, file: File): Promise<{ id: string, webViewLink: string }> {
    // Dropbox API requires file binary in body
    // 150MB limit for /upload. For larger, use session (skipped for now).

    // Path must include filename
    const path = `${folderPath === '/' ? '' : folderPath}/${file.name}`;

    const args = {
        path: path,
        mode: 'add',
        autorename: true,
        mute: false
    };

    const res = await fetch('https://content.dropboxapi.com/2/files/upload', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Dropbox-API-Arg': JSON.stringify(args),
            'Content-Type': 'application/octet-stream' // Generic binary
        },
        body: file // Direct file object (browser handles it)
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error('Dropbox Upload Failed: ' + errText);
    }

    const data = await res.json();


    const filePath = data.path_display;

    // Get Shared Link for WebView
    let webViewLink = filePath;
    try {
        const shareRes = await fetch('https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ path: filePath })
        });
        const shareData = await shareRes.json();

        if (shareData.url) {
            webViewLink = shareData.url;
        } else if (shareData.error && shareData.error['.tag'] === 'shared_link_already_exists') {
            // Fetch existing shared link
            const listRes = await fetch('https://api.dropboxapi.com/2/sharing/list_shared_links', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ path: filePath, direct_only: true })
            });
            const listData = await listRes.json();
            if (listData.links && listData.links.length > 0) {
                webViewLink = listData.links[0].url;
            }
        } else if (shareData.error) {
            console.error('Dropbox Share Error Details:', shareData.error);
        }
    } catch (e) {
        console.error('Dropbox Share Link Generaton Failed', e);
        // Fallback to path matches current behavior, though not viewable
    }

    return { id: data.path_display, webViewLink: webViewLink };
}

export async function uploadToEntityFolder(
    config: CDEConfig,
    entityType: 'company' | 'worker' | 'equipment',
    entityName: string,
    entityIdentifier: string | undefined,
    file: File,
    versionTag?: string, // Optional version to tag the *archived* file with
    onTokenRefresh?: (token: string, expiresAt: number) => void
): Promise<{ id: string, webViewLink: string, archivedId?: string, archivedParentId?: string, archivedNewId?: string, archivedNewName?: string }> {
    if (!config.connected || !config.accessToken) throw new Error('CDE Not Connected');

    let archivedNewName: string | undefined;

    // 1. Determine Target Folder Name
    const parentMap: Record<string, string> = {
        'company': '01-Empresas',
        'worker': '02-Trabalhadores',
        'equipment': '03-Equipamentos'
    };
    const parentName = parentMap[entityType];
    if (!parentName) throw new Error('Unknown Entity Type');

    // 2. Determine Entity Folder Name
    const folderName = entityIdentifier ? `${entityIdentifier}-${entityName}` : entityName;

    let targetFolderId = '';
    let targetFolderPath = ''; // For Dropbox

    // Transaction Metadata
    let archivedId: string | undefined;
    let archivedParentId: string | undefined;

    try {
        if (config.provider === 'gdrive') {
            // Find Root -> Parent -> Entity
            const rootId = config.folderId || 'root';

            // Resolve Parent (01-Empresas)
            const parentRes = await createGoogleDriveFolder(config.accessToken, rootId, parentName);

            // Resolve Entity Folder
            const entityRes = await createGoogleDriveFolder(config.accessToken, parentRes.id, folderName);
            targetFolderId = entityRes.id;
            archivedParentId = targetFolderId; // Parent of file before overwrite was THIS folder

            // 3. Collision Logic (Google Drive)
            // List ALL files in target folder to check for Base Name Match (ignoring extension)
            const listRes = await fetch(`https://www.googleapis.com/drive/v3/files?q='${targetFolderId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType)&access_token=${config.accessToken}`);
            const listData = await listRes.json();

            const getBaseName = (name: string) => name.includes('.') ? name.substring(0, name.lastIndexOf('.')) : name;
            const uploadBaseName = getBaseName(file.name).toLowerCase();

            // Find ANY valid file that shares the same base name (e.g. "Report.pdf" collides with "Report.docx")
            const existing = listData.files?.find((f: any) =>
                f.mimeType !== 'application/vnd.google-apps.folder' &&
                getBaseName(f.name).toLowerCase() === uploadBaseName
            );

            if (existing) {
                // Collision! Archive collision.
                const existingId = existing.id;
                console.log(`Archives: Auto-archiving collision (Cross-Ext) ${file.name} -> Replaces ${existing.name} (${existingId})`);
                const arcRes = await archiveCDEFile(config, existingId, targetFolderId, versionTag);
                archivedId = existingId;
                if (arcRes.newId) archivedId = arcRes.newId;
                if (arcRes.newName) archivedNewName = arcRes.newName;
            }

            // 4. Upload
            const upRes = await uploadToGoogleDrive(config.accessToken, targetFolderId, file);
            return { ...upRes, archivedId, archivedParentId, archivedNewName };

        } else if (config.provider === 'dropbox') {
            const rootPath = config.folderPath || '';

            // Resolve Parent
            const parentRes = await createDropboxFolder(config.accessToken, rootPath, parentName);

            // Resolve Entity Folder
            const entityRes = await createDropboxFolder(config.accessToken, parentRes.id, folderName);
            targetFolderPath = entityRes.id; // path_display
            archivedParentId = targetFolderPath;

            // 3. Collision Logic (Dropbox)
            // List files in targetFolderPath
            const listRes = await fetch('/api/integration/dropbox', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'list', accessToken: config.accessToken, path: targetFolderPath })
            });
            const listData = await listRes.json();

            const getBaseName = (name: string) => name.includes('.') ? name.substring(0, name.lastIndexOf('.')) : name;
            const uploadBaseName = getBaseName(file.name).toLowerCase();

            // Find ANY valid file sharing base name
            const existing = listData.files?.find((f: any) => {
                // Check if it's a file by ensuring it's NOT a folder (API normalizes this)
                const isFile = f.mimeType !== 'application/vnd.google-apps.folder';
                const fBase = getBaseName(f.name).toLowerCase();
                return isFile && fBase === uploadBaseName;
            });

            if (existing) {
                // Collision! Archive collision.
                console.log(`Archives: Auto-archiving collision (Cross-Ext) ${file.name} -> Replaces ${existing.name}`);
                const arcRes = await archiveCDEFile(config, existing.id, targetFolderPath, versionTag);
                archivedId = existing.id;
                // For Dropbox, use the NEW path
                if (config.provider === 'dropbox' && arcRes.newId) {
                    console.log(`Archives: Dropbox Path Update ${existing.id} -> ${arcRes.newId}`);
                }
                if (arcRes.newId) return {
                    ...await uploadToDropbox(config.accessToken, targetFolderPath, file),
                    archivedId: existing.id,
                    archivedNewId: arcRes.newId,
                    archivedNewName: arcRes.newName, // Return the new name!
                    archivedParentId: targetFolderPath
                };
            }

            // 4. Upload
            const upRes = await uploadToDropbox(config.accessToken, targetFolderPath, file);
            return { ...upRes, archivedId, archivedParentId }; // archivedNewId undefined if no collision
        } else if (config.provider === 'onedrive' || (config.provider as string) === 'sharepoint') {
            const compOrProjId = (config as any).projectId || (config as any).companyId || 'comp_master';

            // 1. Ensure Parent Folder (01-Empresas, 02-Trabalhadores, 03-Equipamentos)
            const parentRes = await createOneDriveFolder(config, 'root', parentName);

            // 2. Ensure Entity Folder (Identifier-Name)
            const entityRes = await createOneDriveFolder(config, parentRes.id, folderName);
            targetFolderId = entityRes.id;
            archivedParentId = targetFolderId;

            // 3. Ensure Arquivo subfolder
            await createOneDriveFolder(config, entityRes.id, 'Arquivo').catch(() => {});

            // 4. Convert File to Base64
            const arrayBuffer = await file.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString('base64');

            // 5. Upload via Server CDE Action
            const uploadRes = await fetch(`/api/projects/${compOrProjId}/cde/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'upload_file',
                    payload: {
                        folderId: targetFolderId,
                        fileName: file.name,
                        fileBase64: base64,
                        mimeType: file.type || 'application/octet-stream'
                    }
                })
            });

            if (!uploadRes.ok) {
                const errData = await uploadRes.json().catch(() => ({ error: 'Falha no upload para SharePoint' }));
                throw new Error(errData.error || 'Falha no upload para SharePoint');
            }

            const uploadData = await uploadRes.json();
            const fileItem = uploadData.result;

            return {
                id: fileItem.id,
                webViewLink: fileItem.webViewLink,
                archivedId,
                archivedParentId
            };
        }
    } catch (e: any) {
        const errJson = JSON.stringify(e.message || e);
        const isDropboxExpired = config.provider === 'dropbox' &&
            (errJson.includes('expired_access_token') || (e.message && e.message.includes('expired_access_token')));

        if (isDropboxExpired) {
            if (!config.refreshToken) {
                console.error('Dropbox Token Expired and No Refresh Token available.');
                throw new Error('Dropbox Session Expired. Please go to Settings and Reconnect Dropbox.');
            }

            console.log('Dropbox Token Expired during upload. Refreshing...');
            try {
                const refreshed = await refreshDropboxToken(config);
                if (onTokenRefresh) {
                    onTokenRefresh(refreshed.accessToken, refreshed.expiresAt);
                }
                const newConfig = { ...config, accessToken: refreshed.accessToken };
                // Retry with new token
                return await uploadToEntityFolder(newConfig, entityType, entityName, entityIdentifier, file, versionTag, onTokenRefresh);
            } catch (refreshErr) {
                console.error('Failed to refresh token during upload', refreshErr);
                throw new Error('Failed to refresh Dropbox session. Please Reconnect.');
            }
        }

        console.error('Upload Auto-Archive flow failed', e);
        throw e;
    }

    throw new Error('Provider not supported for upload');
}
