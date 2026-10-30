import { CDEConfig } from '@/types';

export const CDE_THEMES = {
    company: 'Organizações',
    worker: 'Pessoas',
    equipment: 'Equipamentos'
} as const;

export type CDEThemeType = keyof typeof CDE_THEMES;

export const DEFAULT_SUBJECT_FOLDERS: Record<string, string> = {
    // Organizações (Empresas)
    insurance_policies: 'Seguros e Apólices',
    state_obligations: 'Obrigações do Estado',
    site_documents: 'Documentos de Obra',
    // Pessoas (Trabalhadores)
    worker_health: 'Aptidão Médica e Segurança',
    worker_training: 'Formação e Acolhimento',
    worker_contract: 'Documentação Legal e Contratual',
    // Equipamentos
    equip_maintenance: 'Manutenção e Inspeções',
    equip_insurance: 'Seguro e Conformidade',
    equip_property: 'Registo e Propriedade'
};

export const REQUIREMENT_TO_SUBJECT_MAP: Record<string, { theme: 'company' | 'worker' | 'equipment'; subjectId: string }> = {
    // Empresa / Organizações
    insurance_at: { theme: 'company', subjectId: 'insurance_policies' },
    insurance_at_receipt: { theme: 'company', subjectId: 'insurance_policies' },
    insurance_work_acc_policy: { theme: 'company', subjectId: 'insurance_policies' },
    insurance_work_acc_receipt: { theme: 'company', subjectId: 'insurance_policies' },
    insurance_rc: { theme: 'company', subjectId: 'insurance_policies' },
    insurance_rc_receipt: { theme: 'company', subjectId: 'insurance_policies' },
    insurance_civil_policy: { theme: 'company', subjectId: 'insurance_policies' },
    insurance_civil_receipt: { theme: 'company', subjectId: 'insurance_policies' },
    finance_ss: { theme: 'company', subjectId: 'state_obligations' },
    finance_fin: { theme: 'company', subjectId: 'state_obligations' },
    ss_discount: { theme: 'company', subjectId: 'state_obligations' },
    pss_acceptance: { theme: 'company', subjectId: 'site_documents' },
    work_schedule: { theme: 'company', subjectId: 'site_documents' },
    // Trabalhador / Pessoas
    medical_fitness: { theme: 'worker', subjectId: 'worker_health' },
    epi: { theme: 'worker', subjectId: 'worker_health' },
    epi_list: { theme: 'worker', subjectId: 'worker_health' },
    induction: { theme: 'worker', subjectId: 'worker_training' },
    specific_training: { theme: 'worker', subjectId: 'worker_training' },
    contract: { theme: 'worker', subjectId: 'worker_contract' },
    immigration_docs: { theme: 'worker', subjectId: 'worker_contract' },
    // Equipamento / Equipamentos
    maintenance: { theme: 'equipment', subjectId: 'equip_maintenance' },
    inspection: { theme: 'equipment', subjectId: 'equip_maintenance' },
    insurance: { theme: 'equipment', subjectId: 'equip_insurance' },
    property_title: { theme: 'equipment', subjectId: 'equip_property' }
};

export const STANDARD_FOLDERS = [
    'Organizações',
    'Pessoas',
    'Equipamentos',
    '04-Controlo de Acessos',
    '05-Sinistralidade',
    '06-Formação',
    '07-Formulários',
    '08-Auditorias'
];

export const SPECIAL_SUBFOLDERS: Record<string, string[]> = {
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

export const COMPANY_STANDARD_FOLDERS = [
    'Organizações',
    'Pessoas',
    'Equipamentos',
    '04-Controlo de Acessos',
    '05-Sinistralidade',
    '06-Formação'
];

export const COMPANY_SPECIAL_SUBFOLDERS: Record<string, string[]> = {
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

    // Base folder → send 'root' so the SERVER resolves it from the authoritative DB config
    // (the client-side cached folderId may be stale after the CDE folder was changed).
    const serverParentId = (!parentId || parentId === 'root' || parentId === config.folderId) ? 'root' : parentId;

    // 1. Tentar via endpoint de ação CDE no servidor (que tem credenciais desencriptadas)
    try {
        const res = await fetch(`/api/projects/${compOrProjId}/cde/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'create_folder',
                payload: { parentId: serverParentId, folderName: name }
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

    // Execução no servidor para SharePoint (fonte de verdade: configuração cifrada na BD)
    if (config.provider === 'onedrive' || (config.provider as string) === 'sharepoint') {
        const srvRes = await fetch(`/api/projects/${compOrProjId}/cde/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'initialize_project_structure',
                payload: {}
            })
        });
        const srvData = await srvRes.json().catch(() => ({}));
        if (!srvRes.ok) {
            throw new Error(srvData?.error || 'Falha ao criar pastas tipo no SharePoint.');
        }
        return srvData.result?.logs || [];
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
                } else if ((config.provider as string) === 'onedrive' || (config.provider as string) === 'sharepoint') {
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
                            } else if ((config.provider as string) === 'onedrive' || (config.provider as string) === 'sharepoint') {
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
/**
 * Inicializa a estrutura de pastas de uma empresa específica num projeto:
 * 📁 [Nome da Empresa]/
 *    ├── 📁 Organizações/ (com subpastas e Arquivo/)
 *    ├── 📁 Pessoas/ (com subpastas e Arquivo/)
 *    └── 📁 Equipamentos/ (com subpastas e Arquivo/)
 */
export async function initializeProjectCompanyStructure(
    config: CDEConfig,
    companyName: string
): Promise<string[]> {
    if (!config.connected) throw new Error('CDE not connected');
    const cleanCompanyName = (companyName || '').trim();
    if (!cleanCompanyName) throw new Error('Nome da empresa é obrigatório.');

    const compOrProjId = (config as any).projectId || (config as any).id || (config as any).companyId || 'comp_master';

    // 1. Tentar executar via servidor (garante SharePoint, OneDrive e consistência na BD)
    try {
        const srvRes = await fetch(`/api/projects/${compOrProjId}/cde/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'initialize_project_company_structure',
                payload: { companyName: cleanCompanyName }
            })
        });
        const srvData = await srvRes.json().catch(() => ({}));
        if (srvRes.ok && srvData.result?.logs) {
            return srvData.result.logs;
        }
    } catch (srvErr) {
        console.warn('[CDE] Server initialize_project_company_structure fallback:', srvErr);
    }

    // 2. Fallback de cliente para Google Drive, Dropbox ou quando servidor direto não está disponível
    const rootId = (config.provider === 'gdrive' ? (config.folderId || 'root') :
        config.provider === 'dropbox' ? (config.folderPath || '') :
            (config.folderId || 'root'));

    const logs: string[] = [];
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

    // Criar pasta raiz da empresa
    let compFolder: CreateFolderResult | null = null;
    if (config.provider === 'gdrive') {
        compFolder = await createGoogleDriveFolder(config.accessToken!, rootId, cleanCompanyName);
    } else if (config.provider === 'dropbox') {
        compFolder = await createDropboxFolder(config.accessToken!, rootId, cleanCompanyName);
    } else {
        compFolder = await createOneDriveFolder(config, rootId, cleanCompanyName);
    }

    logs.push(compFolder.exists ? `Pasta da Empresa existente: ${cleanCompanyName}` : `Pasta da Empresa criada: ${cleanCompanyName}`);

    // Criar Temas e Assuntos com Arquivo
    for (const [themeName, subjects] of Object.entries(PROJECT_COMPANY_THEMES)) {
        let themeFolder: CreateFolderResult | null = null;
        if (config.provider === 'gdrive') {
            themeFolder = await createGoogleDriveFolder(config.accessToken!, compFolder.id, themeName);
        } else if (config.provider === 'dropbox') {
            themeFolder = await createDropboxFolder(config.accessToken!, compFolder.id, themeName);
        } else {
            themeFolder = await createOneDriveFolder(config, compFolder.id, themeName);
        }

        logs.push(themeFolder.exists ? `  📁 ${themeName} (existente)` : `  📁 ${themeName} (criada)`);

        for (const sub of subjects) {
            let subFolder: CreateFolderResult | null = null;
            if (config.provider === 'gdrive') {
                subFolder = await createGoogleDriveFolder(config.accessToken!, themeFolder.id, sub);
            } else if (config.provider === 'dropbox') {
                subFolder = await createDropboxFolder(config.accessToken!, themeFolder.id, sub);
            } else {
                subFolder = await createOneDriveFolder(config, themeFolder.id, sub);
            }

            logs.push(subFolder.exists ? `    └─ 📁 ${sub}` : `    └─ 📁 ${sub} (criada)`);

            // Se for Documentos de Obra, criar pastas padrão para Modelos BIM e Desenhos 2D
            if (sub === 'Documentos de Obra') {
                try {
                    let bimFolder: CreateFolderResult | null = null;
                    if (config.provider === 'gdrive') {
                        bimFolder = await createGoogleDriveFolder(config.accessToken!, subFolder.id, 'Modelos BIM (IFC)');
                        await createGoogleDriveFolder(config.accessToken!, bimFolder.id, '01-Arquitetura');
                        await createGoogleDriveFolder(config.accessToken!, bimFolder.id, '02-Estruturas');
                        await createGoogleDriveFolder(config.accessToken!, bimFolder.id, '03-Especialidades (MEP)');
                        await createGoogleDriveFolder(config.accessToken!, subFolder.id, 'Desenhos 2D (Plantas e Cortes)');
                    } else if (config.provider === 'dropbox') {
                        bimFolder = await createDropboxFolder(config.accessToken!, subFolder.id, 'Modelos BIM (IFC)');
                        await createDropboxFolder(config.accessToken!, bimFolder.id, '01-Arquitetura');
                        await createDropboxFolder(config.accessToken!, bimFolder.id, '02-Estruturas');
                        await createDropboxFolder(config.accessToken!, bimFolder.id, '03-Especialidades (MEP)');
                        await createDropboxFolder(config.accessToken!, subFolder.id, 'Desenhos 2D (Plantas e Cortes)');
                    } else {
                        bimFolder = await createOneDriveFolder(config, subFolder.id, 'Modelos BIM (IFC)');
                        await createOneDriveFolder(config, bimFolder.id, '01-Arquitetura');
                        await createOneDriveFolder(config, bimFolder.id, '02-Estruturas');
                        await createOneDriveFolder(config, bimFolder.id, '03-Especialidades (MEP)');
                        await createOneDriveFolder(config, subFolder.id, 'Desenhos 2D (Plantas e Cortes)');
                    }
                    logs.push(`       └─ 📁 Modelos BIM (IFC)`);
                    logs.push(`       └─ 📁 Desenhos 2D (Plantas e Cortes)`);
                } catch (_) {}
            }

            // Arquivo
            let archFolder: CreateFolderResult | null = null;
            if (config.provider === 'gdrive') {
                archFolder = await createGoogleDriveFolder(config.accessToken!, subFolder.id, 'Arquivo');
            } else if (config.provider === 'dropbox') {
                archFolder = await createDropboxFolder(config.accessToken!, subFolder.id, 'Arquivo');
            } else {
                archFolder = await createOneDriveFolder(config, subFolder.id, 'Arquivo');
            }
            logs.push(archFolder.exists ? `       └─ 📁 Arquivo` : `       └─ 📁 Arquivo (criada)`);
        }
    }

    return logs;
}

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
    if (!config || !config.connected) {
        throw new Error('CDE não está conectado a este projeto ou empresa.');
    }

    const compOrProjId = (config as any).projectId || (config as any).companyId || (config as any).id;
    const targetId = compOrProjId || 'comp_master';

    // Prioritize server-side action (required when secrets/tokens are encrypted on server)
    if (!config.accessToken || config.provider === 'onedrive' || (config.provider as string) === 'sharepoint' || Boolean(compOrProjId)) {
        const arrayBuffer = await file.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const srvRes = await fetch(`/api/projects/${targetId}/cde/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'upload_file',
                payload: {
                    folderId: targetFolderIdOrPath,
                    path: targetFolderIdOrPath,
                    fileName: file.name,
                    fileBase64: base64,
                    mimeType: file.type || 'application/octet-stream'
                }
            })
        });

        if (!srvRes.ok) {
            const err = await srvRes.json().catch(() => ({ error: 'Falha no upload para o CDE' }));
            throw new Error(err.error || 'Falha no upload para o CDE');
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

    if (config.provider === 'gdrive' && config.accessToken) {
        const uploaded = await uploadToGoogleDrive(config.accessToken, targetFolderIdOrPath, file);
        return {
            id: uploaded.id,
            webViewLink: uploaded.webViewLink,
            size: file.size,
            name: file.name
        };
    } else if (config.provider === 'dropbox' && config.accessToken) {
        const uploaded = await uploadToDropbox(config.accessToken, targetFolderIdOrPath, file);
        return {
            id: uploaded.id,
            webViewLink: uploaded.webViewLink,
            size: file.size,
            name: file.name
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
            const res = await createGoogleDriveFolder(config.accessToken!, parentId, 'Arquivo');
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
            const res = await createDropboxFolder(config.accessToken!, parentId, 'Arquivo');
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

/**
 * Determina o caminho CDE estruturado por Tema e Assunto:
 * - Em projeto: [Nome da Empresa] / [Tema] / [Pasta do Assunto]
 * - Em espaço corporativo: [Tema] / [Pasta do Assunto]
 */
export function resolveDocumentCdePath(options: {
    projectId?: string;
    companyName?: string;
    entityType: 'company' | 'worker' | 'equipment';
    category?: string;
    profile?: { subjectFolders?: Record<string, string>; customDocuments?: Array<{ id: string; subject?: string; cdeFolder?: string }> } | null;
}): {
    themeName: string;
    subjectFolder: string;
    pathSegments: string[];
    displayPath: string;
} {
    const themeName = CDE_THEMES[options.entityType] || 'Organizações';
    let subjectFolder = '';

    // 1. Procurar em documentos personalizados do perfil
    if (options.category && options.profile?.customDocuments) {
        const customDoc = options.profile.customDocuments.find((d: any) => d.id === options.category);
        if (customDoc) {
            if (customDoc.cdeFolder) {
                subjectFolder = customDoc.cdeFolder;
            } else if (customDoc.subject) {
                const configuredFolder = options.profile.subjectFolders?.[customDoc.subject];
                subjectFolder = configuredFolder || customDoc.subject;
            }
        }
    }

    // 2. Mapeamento padrão por chave de requisito (standard requirements)
    if (!subjectFolder && options.category && REQUIREMENT_TO_SUBJECT_MAP[options.category]) {
        const mapping = REQUIREMENT_TO_SUBJECT_MAP[options.category];
        const configuredFolder = options.profile?.subjectFolders?.[mapping.subjectId];
        subjectFolder = configuredFolder || DEFAULT_SUBJECT_FOLDERS[mapping.subjectId] || mapping.subjectId;
    }

    // 3. Fallback de segurança baseado no tipo de entidade
    if (!subjectFolder) {
        if (options.entityType === 'company') subjectFolder = DEFAULT_SUBJECT_FOLDERS.insurance_policies;
        else if (options.entityType === 'worker') subjectFolder = DEFAULT_SUBJECT_FOLDERS.worker_health;
        else subjectFolder = DEFAULT_SUBJECT_FOLDERS.equip_maintenance;
    }

    // 4. Construção dos segmentos de pasta:
    // Apenas no projeto tem pasta de raiz com o nome da empresa!
    const segments: string[] = [];
    if (options.projectId && options.companyName && options.companyName.trim()) {
        segments.push(options.companyName.trim());
    }
    segments.push(themeName);
    segments.push(subjectFolder);

    return {
        themeName,
        subjectFolder,
        pathSegments: segments,
        displayPath: segments.join('/')
    };
}

/**
 * Garante recursivamente a criação de toda a cadeia de pastas no CDE.
 */
export async function ensureCDEPath(
    config: CDEConfig,
    pathSegments: string[]
): Promise<CreateFolderResult> {
    const validSegments = pathSegments.filter(s => s && s.trim().length > 0);
    if (validSegments.length === 0) {
        return { id: config.folderId || 'root', name: 'root', exists: true };
    }

    let currentId = (config.provider === 'gdrive' ? (config.folderId || 'root') :
        config.provider === 'dropbox' ? (config.folderPath || '') :
            'root');

    let lastResult: CreateFolderResult = { id: currentId, name: 'root', exists: true };

    for (const segment of validSegments) {
        if (config.provider === 'gdrive') {
            lastResult = await createGoogleDriveFolder(config.accessToken!, currentId, segment);
            currentId = lastResult.id;
        } else if (config.provider === 'dropbox') {
            lastResult = await createDropboxFolder(config.accessToken!, currentId, segment);
            currentId = lastResult.id;
        } else if (config.provider === 'onedrive' || (config.provider as string) === 'sharepoint') {
            lastResult = await createOneDriveFolder(config, currentId, segment);
            currentId = lastResult.id;
        }
    }

    return lastResult;
}

/**
 * Faz upload de um documento para a pasta do respetivo assunto do perfil.
 * - Em projeto: cria a raiz [Nome da Empresa] -> [Tema] -> [Assunto]
 * - Em corporativo: cria [Tema] -> [Assunto]
 * - Arquiva versões anteriores no subdiretório Arquivo desse assunto.
 */
export async function uploadToSubjectFolder(
    config: CDEConfig,
    options: {
        projectId?: string;
        companyName?: string;
        entityType: 'company' | 'worker' | 'equipment';
        category?: string;
        subjectFolder?: string;
        profile?: any;
        file: File;
        versionTag?: string;
    },
    onTokenRefresh?: (token: string, expiresAt: number) => void
): Promise<{
    id: string;
    webViewLink: string;
    archivedId?: string;
    archivedParentId?: string;
    archivedNewId?: string;
    archivedNewName?: string;
    folderPath: string;
}> {
    if (!config.connected) throw new Error('CDE Não Conectado');
    if (config.provider === 'gdrive' && !config.accessToken && !config.serviceAccountKey) {
        throw new Error('Google Drive: Token de acesso ausente ou sessão expirada. Por favor volte a ligar o CDE nas definições.');
    }
    if (config.provider === 'dropbox' && !config.accessToken && !config.refreshToken) {
        throw new Error('Dropbox: Token de acesso ausente ou expirado. Por favor volte a ligar o CDE nas definições.');
    }

    // 1. Resolução do caminho CDE
    const resolved = resolveDocumentCdePath({
        projectId: options.projectId,
        companyName: options.companyName,
        entityType: options.entityType,
        category: options.category,
        profile: options.profile
    });

    const segments = options.subjectFolder
        ? (options.projectId && options.companyName ? [options.companyName.trim(), resolved.themeName, options.subjectFolder] : [resolved.themeName, options.subjectFolder])
        : resolved.pathSegments;

    const displayPath = segments.join('/');
    console.log(`[CDE] Upload para pasta de assunto: ${displayPath}`);

    // 2. Garantir existência da cadeia de pastas
    const targetFolder = await ensureCDEPath(config, segments);
    const targetFolderId = targetFolder.id;

    // 3. Garantir pasta Arquivo dentro do assunto
    try {
        if (config.provider === 'gdrive') {
            await createGoogleDriveFolder(config.accessToken!, targetFolderId, 'Arquivo');
        } else if (config.provider === 'dropbox') {
            await createDropboxFolder(config.accessToken!, targetFolderId, 'Arquivo');
        } else if (config.provider === 'onedrive' || (config.provider as string) === 'sharepoint') {
            await createOneDriveFolder(config, targetFolderId, 'Arquivo');
        }
    } catch (_) { }

    let archivedId: string | undefined;
    let archivedNewId: string | undefined;
    let archivedNewName: string | undefined;

    // 4. Verificação de colisão e auto-arquivo
    try {
        const getBaseName = (name: string) => name.includes('.') ? name.substring(0, name.lastIndexOf('.')) : name;
        const uploadBaseName = getBaseName(options.file.name).toLowerCase();

        if (config.provider === 'gdrive') {
            const listRes = await fetch(`https://www.googleapis.com/drive/v3/files?q='${targetFolderId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType)&access_token=${config.accessToken}`);
            if (listRes.ok) {
                const listData = await listRes.json();
                const existing = listData.files?.find((f: any) =>
                    f.mimeType !== 'application/vnd.google-apps.folder' &&
                    getBaseName(f.name).toLowerCase() === uploadBaseName
                );
                if (existing) {
                    const arcRes = await archiveCDEFile(config, existing.id, targetFolderId, options.versionTag);
                    archivedId = existing.id;
                    if (arcRes.newId) archivedId = arcRes.newId;
                    if (arcRes.newName) archivedNewName = arcRes.newName;
                }
            }

            const upRes = await uploadToGoogleDrive(config.accessToken!, targetFolderId, options.file);
            return {
                id: upRes.id,
                webViewLink: upRes.webViewLink,
                archivedId,
                archivedParentId: targetFolderId,
                archivedNewId,
                archivedNewName,
                folderPath: displayPath
            };
        } else if (config.provider === 'dropbox') {
            const listRes = await fetch('/api/integration/dropbox', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'list', accessToken: config.accessToken, path: targetFolderId })
            });
            if (listRes.ok) {
                const listData = await listRes.json();
                const existing = listData.files?.find((f: any) => {
                    const isFile = f.mimeType !== 'application/vnd.google-apps.folder';
                    const fBase = getBaseName(f.name).toLowerCase();
                    return isFile && fBase === uploadBaseName;
                });
                if (existing) {
                    const arcRes = await archiveCDEFile(config, existing.id, targetFolderId, options.versionTag);
                    archivedId = existing.id;
                    if (arcRes.newId) archivedNewId = arcRes.newId;
                    if (arcRes.newName) archivedNewName = arcRes.newName;
                }
            }

            const upRes = await uploadToDropbox(config.accessToken!, targetFolderId, options.file);
            return {
                id: upRes.id,
                webViewLink: upRes.webViewLink,
                archivedId,
                archivedParentId: targetFolderId,
                archivedNewId,
                archivedNewName,
                folderPath: displayPath
            };
        } else if (config.provider === 'onedrive' || (config.provider as string) === 'sharepoint') {
            const compOrProjId = (config as any).projectId || (config as any).companyId || 'comp_master';
            const arrayBuffer = await options.file.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString('base64');

            const uploadRes = await fetch(`/api/projects/${compOrProjId}/cde/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'upload_file',
                    payload: {
                        folderId: targetFolderId,
                        fileName: options.file.name,
                        fileBase64: base64,
                        mimeType: options.file.type || 'application/octet-stream'
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
                archivedParentId: targetFolderId,
                folderPath: displayPath
            };
        }
    } catch (e: any) {
        console.error('[CDE] Erro no upload para pasta de assunto:', e);
        throw e;
    }

    throw new Error('Fornecedor de CDE não suportado para upload.');
}

/**
 * Função de upload retrocompatível que encaminha para a estrutura de Assunto e Tema.
 */
export async function uploadToEntityFolder(
    config: CDEConfig,
    entityType: 'company' | 'worker' | 'equipment',
    entityName: string,
    entityIdentifier: string | undefined,
    file: File,
    versionTag?: string,
    onTokenRefresh?: (token: string, expiresAt: number) => void,
    options?: {
        projectId?: string;
        companyName?: string;
        category?: string;
        subjectFolder?: string;
        profile?: any;
    }
): Promise<{ id: string, webViewLink: string, archivedId?: string, archivedParentId?: string, archivedNewId?: string, archivedNewName?: string, folderPath?: string }> {
    return await uploadToSubjectFolder(
        config,
        {
            projectId: options?.projectId,
            companyName: options?.companyName || (entityType === 'company' ? entityName : undefined),
            entityType,
            category: options?.category,
            subjectFolder: options?.subjectFolder,
            profile: options?.profile,
            file,
            versionTag
        },
        onTokenRefresh
    );
}

/**
 * Cria a estrutura de pastas BIM e 2D diretamente na raiz do CDE do Projeto.
 */
export async function createProjectBimRootFolders(
    config: CDEConfig,
    projectId: string
): Promise<string[]> {
    if (!config || !config.connected) {
        throw new Error('O CDE não está conectado a este projeto. Por favor configure a ligação Cloud nas Definições.');
    }

    try {
        const res = await fetch(`/api/projects/${projectId}/cde/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'init_project_bim_structure',
                payload: {}
            })
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({ error: 'Falha ao criar pastas BIM no servidor.' }));
            throw new Error(errData.error || 'Erro ao comunicar com o servidor CDE');
        }

        const data = await res.json();
        return data.result?.logs || ['Pastas BIM e 2D criadas com sucesso na raiz do projeto.'];
    } catch (err: any) {
        console.error('[CDE] createProjectBimRootFolders error:', err);
        throw err;
    }
}
