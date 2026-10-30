import fs from 'fs';
import path from 'path';

export interface ActiveSession {
    email: string;
    sessionId: string;
    lastHeartbeat: number;
    createdAt: number;
    userAgent?: string;
    ip?: string;
}

export interface ServerOperationalData {
    version: number;
    lastModified: string;
    accounts?: any[];
    users?: any[];
    companies: any[];
    workers: any[];
    equipment: any[];
    documents: any[];
    companyProfiles: any[];
    workerProfiles: any[];
    equipmentProfiles: any[];
    tickets: any[];
    ticketMessages: any[];
    accessPoints: any[];
    accessLogs: any[];
    trainings: any[];
    courses: any[];
    trainingSessions: any[];
    workerTrainingRecords: any[];
    accidents: any[];
    riskAssessments: any[];
    siteObservations?: any[];
}

const SESSION_TIMEOUT_MS = 45000; // 45 seconds timeout for inactive heartbeats

// Global singleton reference for Next.js hot reload support in dev
const globalForServerState = globalThis as unknown as {
    __safesite_server_state?: ServerOperationalData;
    __safesite_active_sessions?: Map<string, ActiveSession>;
};

const DATA_DIR = path.join(process.cwd(), '.data');
const STATE_FILE = path.join(DATA_DIR, 'server_state.json');

function ensureDataDir() {
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
    } catch (e) {
        console.warn('[ServerState] Failed to ensure data directory:', e);
    }
}

function getInitialOperationalData(): ServerOperationalData {
    const now = new Date().toISOString();
    return {
        version: 1,
        lastModified: now,
        companies: [
            { id: 'c1', name: 'Construções Mota-Engil', nif: '500123456', email: 'geral@mota-engil.pt', address: 'Porto', activity: 'Construção Civil', impic: 'IMP-12345', entryDate: '2024-01-10', workSchedule: '08:00 - 17:00', insuranceCivilDate: '2025-01-01', insuranceWorkAccDate: '2025-01-01', insuranceWorkAccPolicy: 'A-2024-001', cleanSSDate: '2024-12-31', cleanFinDate: '2024-12-31', ssDiscountSheet: '2024-10', pssAcceptanceDate: '2024-01-05', tier: 1, accountId: 'acc_1', projectId: 'proj_1', createdAt: now, status: 'active', workflowStatus: 'validated' },
            { id: 'c2', name: 'Teixeira Duarte', nif: '500998877', email: 'contacto@teixeiraduarte.pt', address: 'Lisboa', activity: 'Obras Públicas', impic: 'IMP-98765', entryDate: '2024-02-15', workSchedule: '08:00 - 18:00', insuranceCivilDate: '2025-06-01', insuranceWorkAccDate: '2025-06-01', insuranceWorkAccPolicy: 'B-9922-X', cleanSSDate: '2024-12-31', cleanFinDate: '2024-12-31', ssDiscountSheet: '2024-10', pssAcceptanceDate: '2024-02-10', tier: 1, accountId: 'acc_1', projectId: 'proj_1', createdAt: now, status: 'active', workflowStatus: 'validated' },
            { id: 'c3', name: 'Eletricidade do Norte', nif: '501000111', email: 'geral@elecnorte.pt', address: 'Braga', activity: 'Instalações Elétricas', impic: 'IMP-222', parentId: 'c1', tier: 2, accountId: 'acc_1', projectId: 'proj_1', status: 'active', workflowStatus: 'validated', createdAt: now },
            { id: 'c4', name: 'Canalizações Santos', nif: '501000222', email: 'santos@canal.pt', address: 'Vila Real', activity: 'AVAC e Águas', impic: 'IMP-333', parentId: 'c1', tier: 2, accountId: 'acc_1', projectId: 'proj_1', status: 'active', workflowStatus: 'validated', createdAt: now },
            { id: 'c5', name: 'Betão & Cilindro', nif: '501000333', email: 'obras@betao.pt', address: 'Leiria', activity: 'Estruturas', impic: 'IMP-444', parentId: 'c2', tier: 2, accountId: 'acc_1', projectId: 'proj_1', status: 'active', workflowStatus: 'validated', createdAt: now },
            { id: 'c6', name: 'Instalações Rápidas Unipessoal', nif: '501000444', email: 'rui@rapidas.pt', address: 'Guimarães', activity: 'Mão de Obra Elétrica', impic: 'IMP-555', parentId: 'c3', tier: 3, accountId: 'acc_1', projectId: 'proj_1', status: 'active', workflowStatus: 'validation_pending', createdAt: now },
            { id: 'c7', name: 'Fios & Cabos Lda', nif: '501000555', email: 'geral@fioscabos.pt', address: 'Porto', activity: 'Infraestruturas TI', impic: 'IMP-666', parentId: 'c3', tier: 3, accountId: 'acc_1', projectId: 'proj_1', status: 'active', workflowStatus: 'validated', createdAt: now },
            { id: 'c8', name: 'Cofragens do Centro', nif: '501000777', email: 'geral@cofragens.pt', address: 'Coimbra', activity: 'Cofragens', impic: 'IMP-777', parentId: 'c5', tier: 3, accountId: 'acc_1', projectId: 'proj_1', status: 'active', workflowStatus: 'data_requested', createdAt: now },
        ],
        workers: [
            { id: 'w1', name: 'Manuel António Silva', role: 'Chefe de Equipa', companyId: 'c1', status: 'active', accessCardCode: 'XIS-8821', accessCardValid: true, completedTrainingIds: ['t1', 't3'], accountId: 'acc_1', projectId: 'proj_1', createdAt: now, workflowStatus: 'validated' },
            { id: 'w2', name: 'José Carlos Santos', role: 'Pedreiro de 1ª', companyId: 'c1', status: 'active', accessCardCode: 'XIS-9912', accessCardValid: true, completedTrainingIds: ['t3'], accountId: 'acc_1', projectId: 'proj_1', createdAt: now, workflowStatus: 'validated' },
            { id: 'w3', name: 'António Costa', role: 'Servente', companyId: 'c1', status: 'active', accessCardCode: 'XIS-1122', accessCardValid: true, accountId: 'acc_1', projectId: 'proj_1', createdAt: now, workflowStatus: 'validated' },
            { id: 'w4', name: 'Fernando Pessoa', role: 'Engenheiro Civil', companyId: 'c2', status: 'active', accessCardCode: 'XIS-3344', accessCardValid: true, completedTrainingIds: ['t1', 't2', 't4'], accountId: 'acc_1', projectId: 'proj_1', createdAt: now, workflowStatus: 'validated' },
            { id: 'w5', name: 'Rui Veloso', role: 'Eletricista Chefe', companyId: 'c3', status: 'active', accessCardCode: 'XIS-5566', accessCardValid: true, completedTrainingIds: ['t2'], accountId: 'acc_1', projectId: 'proj_1', createdAt: now, workflowStatus: 'validated' },
            { id: 'w6', name: 'Carlos Paredes', role: 'Ajudante Eletricista', companyId: 'c3', status: 'active', accessCardCode: '', accessCardValid: false, accountId: 'acc_1', projectId: 'proj_1', createdAt: now, workflowStatus: 'validation_pending' },
            { id: 'w7', name: 'Mariza Reis', role: 'Técnica de Redes', companyId: 'c6', status: 'active', accessCardCode: 'XIS-7788', accessCardValid: true, completedTrainingIds: ['t2', 't3'], accountId: 'acc_1', projectId: 'proj_1', createdAt: now, workflowStatus: 'validated' },
            { id: 'w8', name: 'Salvador Sobral', role: 'Carpinteiro Cofragem', companyId: 'c5', status: 'active', accessCardCode: 'XIS-9900', accessCardValid: true, completedTrainingIds: ['t5'], accountId: 'acc_1', projectId: 'proj_1', createdAt: now, workflowStatus: 'validated' },
            { id: 'w9', name: 'Luísa Sobral', role: 'Armadora de Ferro', companyId: 'c5', status: 'inactive', accessCardCode: 'XIS-0011', accessCardValid: false, accountId: 'acc_1', projectId: 'proj_1', createdAt: now, workflowStatus: 'draft' },
        ],
        equipment: [
            { id: 'eq1', name: 'Escavadora Caterpillar 320', type: 'Maquinaria Pesada', serialNumber: 'CAT-2024-X99', companyId: 'c1', status: 'operational', accountId: 'acc_1', projectId: 'proj_1', createdAt: now },
            { id: 'eq2', name: 'Gerador Atlas Copco', type: 'Equipamento Ligeiro', serialNumber: 'GEN-AT-442', companyId: 'c1', status: 'maintenance', accountId: 'acc_1', projectId: 'proj_1', createdAt: now },
            { id: 'eq3', name: 'Empilhador Manitou', type: 'Movimentação Cargas', serialNumber: 'MAN-21-QQ', companyId: 'c2', status: 'operational', accountId: 'acc_1', projectId: 'proj_1', createdAt: now },
            { id: 'eq4', name: 'Compressor Portátil', type: 'Equipamento Ligeiro', serialNumber: 'AIR-992', companyId: 'c2', status: 'out_of_service', accountId: 'acc_1', projectId: 'proj_1', createdAt: now },
            { id: 'eq5', name: 'Grua Torre Liebherr', type: 'Maquinaria Pesada', serialNumber: 'LBH-T-88', companyId: 'c1', status: 'operational', accountId: 'acc_1', projectId: 'proj_1', createdAt: now },
            { id: 'eq6', name: 'Carrinha Transporte', type: 'Vehicles', serialNumber: 'AA-00-XX', companyId: 'c4', status: 'operational', accountId: 'acc_1', projectId: 'proj_1', createdAt: now },
            { id: 'eq7', name: 'Betoneira Elétrica', type: 'Power Tools', serialNumber: 'BET-202', companyId: 'c1', status: 'maintenance', accountId: 'acc_1', projectId: 'proj_1', createdAt: now },
            { id: 'eq8', name: 'Andaime Alumínio', type: 'Equipment', serialNumber: 'AND-555', companyId: 'c5', status: 'operational', accountId: 'acc_1', projectId: 'proj_1', createdAt: now },
        ],
        documents: [],
        companyProfiles: [
            {
                id: 'profile_std_company_proj_1',
                projectId: 'proj_1',
                name: 'Standard',
                requirements: {
                    insurance_at: true,
                    insurance_at_receipt: true,
                    insurance_rc: true,
                    insurance_rc_receipt: true,
                    finance_ss: true,
                    finance_fin: true,
                    ss_discount: true,
                    pss_acceptance: true,
                    work_schedule: true,
                },
                standardUploads: {
                    insurance_at: true,
                    insurance_at_receipt: true,
                    insurance_rc: true,
                    insurance_rc_receipt: true,
                    finance_ss: true,
                    finance_fin: true,
                    ss_discount: true,
                    pss_acceptance: true,
                    work_schedule: true,
                },
                subjectFolders: {
                    insurance_policies: 'Seguros e Apólices',
                    state_obligations: 'Obrigações do Estado',
                    site_documents: 'Documentos de Obra',
                },
                customDocuments: [],
                isSystem: false,
                createdAt: now,
            },
        ],
        workerProfiles: [
            {
                id: 'profile_std_worker_proj_1',
                projectId: 'proj_1',
                name: 'Standard',
                requirements: { medical_fitness: true, induction: true, epi: true, specific_training: true, contract: true },
                standardUploads: { medical_fitness: true, induction: true, epi: true, specific_training: true, contract: true },
                subjectFolders: {
                    worker_health: 'Aptidão Médica e Segurança',
                    worker_training: 'Formação e Acolhimento',
                    worker_contract: 'Documentação Legal e Contratual',
                },
                customDocuments: [],
                isSystem: false,
                createdAt: now,
            },
        ],
        equipmentProfiles: [
            {
                id: 'profile_std_equipment_proj_1',
                projectId: 'proj_1',
                name: 'Standard',
                requirements: { maintenance: true, inspection: true, insurance: true, property_title: true },
                standardUploads: { maintenance: true, inspection: true, insurance: true, property_title: true },
                subjectFolders: {
                    equip_maintenance: 'Manutenção e Inspeções',
                    equip_insurance: 'Seguro e Conformidade',
                    equip_property: 'Registo e Propriedade',
                },
                customDocuments: [],
                isSystem: false,
                createdAt: now,
            },
        ],
        tickets: [],
        ticketMessages: [],
        accessPoints: [
            { id: 'ap_site_main', name: 'Estaleiro Principal', type: 'entry', category: 'site', code: 'MAIN-001', capacity: 100, status: 'active', projectId: 'proj_1', createdAt: now },
            { id: 'ap_zone_A', name: 'Zona A (Armazém)', type: 'zone', category: 'zone', parentId: 'ap_site_main', code: 'ZONE-A', capacity: 20, status: 'active', projectId: 'proj_1', createdAt: now },
            { id: 'ap_zone_B', name: 'Zona B (Edifício 1)', type: 'zone', category: 'zone', parentId: 'ap_site_main', code: 'ZONE-B', capacity: 50, status: 'active', projectId: 'proj_1', createdAt: now },
            { id: 'ap_gate_1', name: 'Portaria Norte', type: 'entry', category: 'gate', parentId: 'ap_site_main', code: 'GATE-N', status: 'active', projectId: 'proj_1', createdAt: now },
        ],
        accessLogs: [],
        trainings: [],
        courses: [],
        trainingSessions: [],
        workerTrainingRecords: [],
        accidents: [],
        riskAssessments: [],
    };
}

function loadOperationalData(): ServerOperationalData {
    if (globalForServerState.__safesite_server_state) {
        return globalForServerState.__safesite_server_state;
    }

    ensureDataDir();

    if (fs.existsSync(STATE_FILE)) {
        try {
            const raw = fs.readFileSync(STATE_FILE, 'utf-8');
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object' && Array.isArray(parsed.companies)) {
                globalForServerState.__safesite_server_state = parsed;
                return parsed;
            }
        } catch (e) {
            console.warn('[ServerState] Error reading server_state.json, creating initial state:', e);
        }
    }

    const initial = getInitialOperationalData();
    saveOperationalData(initial);
    globalForServerState.__safesite_server_state = initial;
    return initial;
}

function saveOperationalData(data: ServerOperationalData) {
    ensureDataDir();
    try {
        data.lastModified = new Date().toISOString();
        data.version = (data.version || 0) + 1;
        const tempFile = `${STATE_FILE}.tmp`;
        fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
        fs.renameSync(tempFile, STATE_FILE);
        globalForServerState.__safesite_server_state = data;
    } catch (e) {
        console.error('[ServerState] Failed to persist server_state.json:', e);
    }
}

export function getServerOperationalData(): ServerOperationalData {
    return loadOperationalData();
}

export function applyServerMutation(mutation: {
    action: 'insert' | 'update' | 'remove';
    table: string;
    id?: string;
    data?: any;
}): { success: boolean; version: number } {
    const state = loadOperationalData();
    const tableKey = toCamelCase(mutation.table);

    // Tables we track
    const validTables: Array<keyof ServerOperationalData> = [
        'accounts',
        'users',
        'companies',
        'workers',
        'equipment',
        'documents',
        'companyProfiles',
        'workerProfiles',
        'equipmentProfiles',
        'tickets',
        'ticketMessages',
        'accessPoints',
        'accessLogs',
        'trainings',
        'courses',
        'trainingSessions',
        'workerTrainingRecords',
        'accidents',
        'riskAssessments',
        'siteObservations',
    ];

    const matchedKey = validTables.find(
        (k) => k.toLowerCase() === tableKey.toLowerCase() || k.toLowerCase() === mutation.table.replace(/_/g, '').toLowerCase()
    );

    if (!matchedKey) {
        return { success: false, version: state.version };
    }

    const currentArray = (state[matchedKey] as any[]) || [];

    if (mutation.action === 'insert') {
        const item = mutation.data;
        if (item && item.id) {
            const idx = currentArray.findIndex((x) => x.id === item.id);
            if (idx === -1) {
                currentArray.push(item);
            } else {
                currentArray[idx] = { ...currentArray[idx], ...item };
            }
        }
    } else if (mutation.action === 'update') {
        const targetId = mutation.id || mutation.data?.id;
        if (targetId) {
            const idx = currentArray.findIndex((x) => x.id === targetId);
            if (idx !== -1) {
                currentArray[idx] = { ...currentArray[idx], ...(mutation.data || {}) };
            } else if (mutation.data) {
                currentArray.push({ id: targetId, ...mutation.data });
            }
        }
    } else if (mutation.action === 'remove') {
        const targetId = mutation.id;
        if (targetId) {
            const idx = currentArray.findIndex((x) => x.id === targetId);
            if (idx !== -1) {
                currentArray.splice(idx, 1);
            }
        }
    }

    (state as any)[matchedKey] = currentArray;
    saveOperationalData(state);

    return { success: true, version: state.version };
}

function toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// ─────────────────────────────────────────────
// ACTIVE SESSIONS MANAGEMENT (Single Active Session Enforcement)
// ─────────────────────────────────────────────

function getActiveSessionsMap(): Map<string, ActiveSession> {
    if (!globalForServerState.__safesite_active_sessions) {
        globalForServerState.__safesite_active_sessions = new Map<string, ActiveSession>();
    }
    return globalForServerState.__safesite_active_sessions;
}

export function acquireUserSession(params: {
    email: string;
    sessionId: string;
    userAgent?: string;
    ip?: string;
    forceTakeover?: boolean;
}): {
    success: boolean;
    error?: string;
    message?: string;
    canTakeover?: boolean;
    activeSession?: { createdAt: number; lastHeartbeat: number };
} {
    const cleanEmail = params.email.trim().toLowerCase();
    const sessions = getActiveSessionsMap();
    const now = Date.now();

    const existing = sessions.get(cleanEmail);

    if (existing) {
        const isSameSession = existing.sessionId === params.sessionId;
        const isAlive = now - existing.lastHeartbeat < SESSION_TIMEOUT_MS;

        if (isSameSession) {
            // Refresh heartbeat for the same browser session
            existing.lastHeartbeat = now;
            sessions.set(cleanEmail, existing);
            return { success: true };
        }

        if (isAlive && !params.forceTakeover) {
            // Blocked: Another active session exists in another browser/device!
            const minutesActive = Math.round((now - existing.createdAt) / 60000);
            return {
                success: false,
                error: 'active_session_exists',
                canTakeover: true,
                message: `A sua conta já tem uma sessão ativa noutro navegador ou dispositivo${minutesActive > 0 ? ` (iniciada há ${minutesActive} min)` : ''}. Por segurança, não é permitido aceder em simultâneo com a mesma conta.`,
                activeSession: {
                    createdAt: existing.createdAt,
                    lastHeartbeat: existing.lastHeartbeat,
                },
            };
        }
    }

    // Assign new active session (or force takeover)
    sessions.set(cleanEmail, {
        email: cleanEmail,
        sessionId: params.sessionId,
        createdAt: now,
        lastHeartbeat: now,
        userAgent: params.userAgent,
        ip: params.ip,
    });

    return { success: true };
}

export function heartbeatUserSession(params: {
    email: string;
    sessionId: string;
}): { valid: boolean; reason?: string } {
    const cleanEmail = params.email.trim().toLowerCase();
    const sessions = getActiveSessionsMap();
    const now = Date.now();

    const existing = sessions.get(cleanEmail);
    if (!existing) {
        // Automatically establish session if not yet registered
        sessions.set(cleanEmail, {
            email: cleanEmail,
            sessionId: params.sessionId,
            createdAt: now,
            lastHeartbeat: now,
        });
        return { valid: true };
    }

    if (existing.sessionId !== params.sessionId) {
        // Session was taken over or superseded by another browser
        return { valid: false, reason: 'taken_over' };
    }

    existing.lastHeartbeat = now;
    sessions.set(cleanEmail, existing);
    return { valid: true };
}

export function validateUserSession(params: {
    email: string;
    sessionId: string;
}): { valid: boolean; reason?: string } {
    const cleanEmail = params.email.trim().toLowerCase();
    const sessions = getActiveSessionsMap();
    const now = Date.now();

    const existing = sessions.get(cleanEmail);
    if (!existing) {
        // If no active session is on record, this browser claims it
        sessions.set(cleanEmail, {
            email: cleanEmail,
            sessionId: params.sessionId,
            createdAt: now,
            lastHeartbeat: now,
        });
        return { valid: true };
    }

    if (existing.sessionId !== params.sessionId) {
        const isAlive = now - existing.lastHeartbeat < SESSION_TIMEOUT_MS;
        if (isAlive) {
            return { valid: false, reason: 'active_elsewhere' };
        }
        // Stale session, this browser claims it
        sessions.set(cleanEmail, {
            email: cleanEmail,
            sessionId: params.sessionId,
            createdAt: now,
            lastHeartbeat: now,
        });
        return { valid: true };
    }

    existing.lastHeartbeat = now;
    return { valid: true };
}

export function releaseUserSession(params: {
    email: string;
    sessionId?: string;
}): { success: boolean } {
    const cleanEmail = params.email.trim().toLowerCase();
    const sessions = getActiveSessionsMap();

    const existing = sessions.get(cleanEmail);
    if (existing) {
        if (!params.sessionId || existing.sessionId === params.sessionId) {
            sessions.delete(cleanEmail);
        }
    }
    return { success: true };
}
