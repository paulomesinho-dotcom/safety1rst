import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Account, Project, Company, Worker, Equipment, Module, ProjectRole, ProjectAccess, PDFTemplate, Document, CompanyRequest, Notification, AccessLog, AccessPoint, Training, Accident, RiskAssessment, CompanyProfile, WorkerProfile, EquipmentProfile, Ticket, TicketMessage, WorkflowLog, Course, TrainingSession, WorkerTrainingRecord, SubscriptionRequest, SubscriptionRequestStatus, PlanType } from '../types';

export interface ProjectRequest {
    id: string;
    userId: string;
    userName?: string;
    userEmail?: string;
    projectId: string;
    projectName?: string;
    companyId?: string;
    companyName?: string;
    nif?: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
}
import { nanoid } from 'nanoid';
import { initDB, executeQuery, toSnake, insert as dbInsert, update as dbUpdate, remove as dbRemove } from '../lib/db';
import { createEntityFolder } from '../lib/cde-manager';
import { getIfcRoleFromCompanyRole, getCompanyRoleLabel } from '../lib/company-ifc-map';
import { getIfcTypeFromOccupation } from '../lib/occupation-ifc-map';
import { getIfcTypeFromEquipment, getEquipmentTypeLabel } from '../lib/equipment-ifc-map';

const generateIfcGuid = () => {
    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$";
    let result = "";
    for (let i = 0; i < 22; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

export interface AppState {
    isInitialized: boolean;
    initialize: () => Promise<void>;
    accounts: Account[];
    currentUser: User | null;
    setCurrentUser: (user: User | null) => void;
    users: User[];
    account: Account | null;
    projects: Project[];
    companies: Company[];
    workers: Worker[];
    equipment: Equipment[];
    modules: Module[];
    projectRequests: ProjectRequest[];
    companyRequests: CompanyRequest[];
    subscriptionRequests: SubscriptionRequest[];
    templates: PDFTemplate[];
    documents: Document[];
    notifications: Notification[];
    addNotification: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
    companyProfiles: CompanyProfile[];
    accessLogs: AccessLog[];
    accessPoints: AccessPoint[];
    trainings: Training[];
    accidents: Accident[];
    riskAssessments: RiskAssessment[];
    workflowLogs: WorkflowLog[];

    // Course Module
    courses: Course[];
    trainingSessions: TrainingSession[];
    workerTrainingRecords: WorkerTrainingRecord[];

    // Profiles
    addCompanyProfile: (profile: CompanyProfile) => void;
    updateCompanyProfile: (id: string, updates: Partial<CompanyProfile>) => void;
    deleteCompanyProfile: (id: string) => void;

    // Tickets & Permissions
    tickets: Ticket[];
    ticketMessages: TicketMessage[];
    createTicket: (ticket: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { id?: string }) => void;
    updateTicket: (id: string, updates: Partial<Ticket>) => void;
    publishDraftTickets: (entityId: string) => void;
    resolveTicket: (id: string) => void;
    archiveTicket: (id: string) => void;
    deleteTicket: (id: string) => void;
    addTicketMessage: (ticketId: string, message: string, userId: string) => void;
    deleteTicketMessage: (id: string) => void;
    setFieldPermission: (entityId: string, entityType: 'company' | 'worker' | 'equipment', field: string, allowEdit: boolean) => void;

    // Users
    login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
    addUser: (user: Omit<User, 'id' | 'createdAt'> & { id?: string }) => void;
    addAccount: (account: Omit<Account, 'id' | 'createdAt'> & { id?: string }) => void;
    updateAccount: (id: string, updates: Partial<Account>) => void;
    deleteAccount: (accountId: string) => Promise<{ success: boolean; message?: string }>;
    cleanupOrphanAccounts: () => Promise<{ success: boolean; count?: number; message?: string }>;
    updateUser: (id: string, updates: Partial<User>) => void;
    deleteUser: (userId: string) => void;
    suspendUser: (userId: string, reason?: string) => Promise<{ success: boolean; message?: string }>;
    reactivateUser: (userId: string) => Promise<{ success: boolean; message?: string }>;
    deleteUserGdpr: (userId: string, mode?: 'anonymize' | 'purge', reason?: string) => Promise<{ success: boolean; message?: string }>;
    cleanupInactiveUsers: (thresholdDays: number, mode?: 'suspend' | 'anonymize') => Promise<{ success: boolean; count: number; message: string }>;
    ensureSuperAdmin: () => void;
    syncFromServer: () => Promise<void>;
    addAccessLog: (log: Omit<AccessLog, 'id' | 'timestamp'>) => { success: boolean; message?: string };

    // Subscription Requests (Client Onboarding)
    addSubscriptionRequest: (req: Omit<SubscriptionRequest, 'id' | 'createdAt'> & { id?: string }) => void;
    updateSubscriptionRequest: (id: string, updates: Partial<SubscriptionRequest>) => void;
    approveSubscriptionRequest: (id: string, reviewedBy?: string) => void;
    rejectSubscriptionRequest: (id: string, reason?: string) => void;

    // Access Points
    addAccessPoint: (point: Omit<AccessPoint, 'id' | 'createdAt'>) => void;
    updateAccessPoint: (id: string, updates: Partial<AccessPoint>) => void;
    deleteAccessPoint: (id: string) => void;

    // Actions now support optional projectId context
    addProject: (project: Omit<Project, 'id' | 'accountId' | 'createdAt'>) => void;
    updateProject: (id: string, updates: Partial<Project>) => void;
    addCompany: (company: Omit<Company, 'id' | 'accountId' | 'createdAt'> & { id?: string }) => void;
    updateCompany: (id: string, updates: Partial<Company>) => void;
    addWorker: (worker: Omit<Worker, 'id' | 'accountId' | 'createdAt'>) => void;
    updateWorker: (id: string, updates: Partial<Worker>) => void;
    addEquipment: (equipment: Omit<Equipment, 'id' | 'accountId' | 'createdAt'>) => void;
    updateEquipment: (id: string, updates: Partial<Equipment>) => void;

    submitEquipment: (id: string) => void;
    validateEquipment: (id: string) => void;
    requestEquipmentElements: (id: string, missingFields: string[]) => void;
    toggleEquipmentFieldValidation: (id: string, field: string, isValid: boolean) => void;

    // Helper to get resources by project
    getProjectResources: (projectId: string) => {
        companies: Company[];
        workers: Worker[];
        equipment: Equipment[];
    };

    // Permission Helpers
    getUserRoleInProject: (userId: string, projectId: string) => ProjectRole | null;
    canAccessModule: (userId: string, projectId: string, moduleId: string) => boolean;
    canEditProject: (userId: string, projectId: string) => boolean; // Can add/edit records
    canDeleteInProject: (userId: string, projectId: string) => boolean; // Only Manager can delete

    // Workflow Role Helpers
    getProjectManager: (projectId: string) => User | undefined;
    getProjectApprover: (projectId: string) => User | undefined;
    getCompanyDataUser: (companyId: string) => User | undefined;
    canAssignRole: (userId: string, projectId: string, role: ProjectRole, companyIds?: string[]) => { allowed: boolean; reason?: string };

    // Project Team Management
    updateProjectAccess: (userId: string, access: ProjectAccess) => void;
    removeProjectAccess: (userId: string, projectId: string) => void;

    // Requests
    addProjectRequest: (userId: string, projectId: string, companyId?: string, companyName?: string, nif?: string) => void;
    resolveProjectRequest: (requestId: string, status: 'approved' | 'rejected', role?: ProjectRole) => void;
    changeAccountPlan: (accountId: string, newPlan: PlanType) => void;
    associateCompanyUser: (companyAccountId: string, userEmail: string, userName?: string) => { success: boolean; message: string };

    // Company Requests
    addCompanyRequest: (userId: string, companyId: string, projectId: string, updates: Partial<Company>) => void;
    resolveCompanyRequest: (requestId: string, status: 'approved' | 'rejected') => void;

    // Routine Tasks
    checkExpirations: () => void;

    // Templates
    addTemplate: (template: Omit<PDFTemplate, 'id' | 'createdAt'>) => void;
    updateTemplate: (id: string, updates: Partial<PDFTemplate>) => void;
    deleteTemplate: (id: string) => void;

    // Training (legacy types)
    addTraining: (training: Omit<Training, 'id' | 'createdAt'>) => void;
    updateTraining: (id: string, updates: Partial<Training>) => void;
    deleteTraining: (id: string) => void;

    // Courses
    addCourse: (course: Omit<Course, 'id' | 'createdAt' | 'updatedAt' | 'version'>) => Course;
    updateCourse: (id: string, updates: Partial<Course>) => void;
    deleteCourse: (id: string) => void;
    publishCourse: (id: string) => void;

    // Training Sessions
    addTrainingSession: (session: Omit<TrainingSession, 'id' | 'createdAt' | 'updatedAt'>) => TrainingSession;
    updateTrainingSession: (id: string, updates: Partial<TrainingSession>) => void;
    deleteTrainingSession: (id: string) => void;
    completeTrainingSession: (sessionId: string, attendees: TrainingSession['attendees']) => void;

    // Worker Training Records
    addWorkerTrainingRecord: (record: Omit<WorkerTrainingRecord, 'id' | 'createdAt'>) => void;
    deleteWorkerTrainingRecord: (id: string) => void;

    // Accidents & Risk Assessments
    addAccident: (accident: Omit<Accident, 'id' | 'createdAt'>) => void;
    updateAccident: (id: string, updates: Partial<Accident>) => void;
    deleteAccident: (id: string) => void;

    addRiskAssessment: (risk: Omit<RiskAssessment, 'id' | 'createdAt'>) => void;
    updateRiskAssessment: (id: string, updates: Partial<RiskAssessment>) => void;
    deleteRiskAssessment: (id: string) => void;

    // Documents
    addDocument: (doc: Omit<Document, 'id' | 'createdAt'>) => void;
    updateDocument: (id: string, updates: Partial<Document>) => void;
    unarchiveDocument: (id: string) => void;
    deleteDocument: (id: string) => void;
    getDocumentsByEntity: (entityId: string) => Document[];
    getDocumentsByProject: (projectId: string) => Document[];

    updateProjectCDE: (projectId: string, config: Project['cdeConfig']) => void;

    // Company Actions
    archiveCompany: (id: string) => void;
    restoreCompany: (id: string) => void;
    // Company Workflow Actions
    updateCompanyStatus: (id: string, status: Company['workflowStatus']) => void;
    checkCompanyExpirations: () => void;
    requestCompanyDocumentation: (id: string) => void;
    assignCompanyDataUser: (id: string, userId: string) => void;
    toggleFieldValidation: (id: string, field: string, isValid: boolean) => void;

    // Worker Workflow
    submitWorker: (id: string) => void;
    requestWorkerElements: (id: string, missingElements: string[]) => void;
    validateWorker: (id: string) => void;
    checkWorkerCompliance: (workerId: string) => void;
    blockAccessCard: (id: string, blocked: boolean) => void;
    assignWorkerDataUser: (id: string, userId: string) => void;
    updateWorkerStatus: (id: string, status: Worker['workflowStatus']) => void;
    toggleWorkerFieldValidation: (id: string, field: string, isValid: boolean) => void;
    archiveWorker: (id: string) => void;
    restoreWorker: (id: string) => void;
    updateProjectSettings: (id: string, settings: Partial<Project>) => void;
    approveWorker: (id: string) => void;
    approveCompany: (id: string) => void;
    approveEquipment: (id: string) => void;



    // Worker Profiles
    workerProfiles: WorkerProfile[];
    addWorkerProfile: (profile: WorkerProfile) => void;
    updateWorkerProfile: (id: string, updates: Partial<WorkerProfile>) => void;
    deleteWorkerProfile: (id: string) => void;
    getProjectStats: (projectId: string) => any;
    // Equipment Profiles
    equipmentProfiles: EquipmentProfile[];
    addEquipmentProfile: (profile: EquipmentProfile) => void;
    updateEquipmentProfile: (id: string, updates: Partial<EquipmentProfile>) => void;
    deleteEquipmentProfile: (id: string) => void;
}

// Mock Data
const MOCK_ACCOUNT_ID = 'acc_1';
const MOCK_MODULES: Module[] = [
    { id: 'companies', name: 'Organizações', icon: 'Building2', path: 'companies', description: 'Registry of associated companies', isBase: true },
    { id: 'workers', name: 'Pessoas', icon: 'Users', path: 'workers', description: 'Worker registry and access', isBase: true },
    { id: 'equipment', name: 'Equipment', icon: 'HardHat', path: 'equipment', description: 'Equipment registry', isBase: true },
    { id: 'access-control', name: 'Access Control', icon: 'Scan', path: 'access-control', description: 'Worker access logs', isBase: true },
    { id: 'accidents', name: 'Safety & Risks', icon: 'AlertTriangle', path: 'accidents', description: 'Safety incidents and risk assessments', isBase: false },
    { id: 'training', name: 'Training', icon: 'GraduationCap', path: 'training', description: 'Worker certifications', isBase: false },
    { id: 'forms', name: 'Forms', icon: 'FileInput', path: 'form-builder', description: 'Form Builder', isBase: false },
    { id: 'documents', name: 'Documents', icon: 'FileText', path: 'documents', description: 'Document management', isBase: true },
];

const MOCK_ACCOUNTS: Account[] = [
    { id: 'acc_1', name: 'Xispoli Construction', plan: 'premium', maxProjects: 3, accessControlLimit: 3600, subscriptionStatus: 'active', modules: MOCK_MODULES.map(m => m.id), createdAt: new Date().toISOString() },
    { id: 'acc_2', name: 'StartUp Builders', plan: 'basic', maxProjects: 1, accessControlLimit: 1200, subscriptionStatus: 'active', modules: MOCK_MODULES.map(m => m.id), createdAt: new Date().toISOString() },
];

const MOCK_PROJECTS: Project[] = [
    {
        id: 'proj_1',
        name: 'Skyline Tower',
        description: 'Complexo residencial de luxo',
        address: 'Av. da Liberdade 100, Lisboa',
        accountId: MOCK_ACCOUNT_ID,
        status: 'active',
        approvalWorkflow: { companies: true, workers: true, equipment: true },
        createdAt: new Date().toISOString()
    },
    {
        id: 'proj_2',
        name: 'Reabilitação Ponte do Freixo',
        description: 'Manutenção estrutural e pintura',
        address: 'Porto',
        accountId: MOCK_ACCOUNT_ID,
        status: 'active',
        approvalWorkflow: { companies: true, workers: true, equipment: true },
        createdAt: new Date().toISOString()
    },
];

// Super Admin Users
const MOCK_USERS: User[] = [
    {
        id: 'user_super',
        email: 'paulo.ferreira@xispoli.eu',
        name: 'Paulo Ferreira',
        role: 'superadmin',
        accountId: 'platform_admin',
        password: 'Pferreira.Xispoli@1914',
        createdAt: new Date().toISOString(),
        projectAccess: [
            { projectId: 'proj_1', role: 'manager', allowedModules: MOCK_MODULES.map(m => m.id) }
        ]
    },
    {
        id: 'user_super_safesite',
        email: 'super@safesite.pt',
        name: 'Super Admin',
        role: 'superadmin',
        accountId: 'platform_admin',
        password: 'SuperAdmin2026!',
        createdAt: new Date().toISOString(),
        projectAccess: [
            { projectId: 'proj_1', role: 'manager', allowedModules: MOCK_MODULES.map(m => m.id) }
        ]
    }
];

// Seed data
const MOCK_COMPANIES: Company[] = [
    // Tier 1
    { id: 'c1', name: 'Construções Mota-Engil', nif: '500123456', email: 'geral@mota-engil.pt', address: 'Porto', activity: 'Construção Civil', impic: 'IMP-12345', entryDate: '2024-01-10', workSchedule: '08:00 - 17:00', insuranceCivilDate: '2025-01-01', insuranceWorkAccDate: '2025-01-01', insuranceWorkAccPolicy: 'A-2024-001', cleanSSDate: '2024-12-31', cleanFinDate: '2024-12-31', ssDiscountSheet: '2024-10', pssAcceptanceDate: '2024-01-05', tier: 1, accountId: MOCK_ACCOUNT_ID, projectId: 'proj_1', createdAt: new Date().toISOString(), status: 'active', workflowStatus: 'validated' },
    { id: 'c2', name: 'Teixeira Duarte', nif: '500998877', email: 'contacto@teixeiraduarte.pt', address: 'Lisboa', activity: 'Obras Públicas', impic: 'IMP-98765', entryDate: '2024-02-15', workSchedule: '08:00 - 18:00', insuranceCivilDate: '2025-06-01', insuranceWorkAccDate: '2025-06-01', insuranceWorkAccPolicy: 'B-9922-X', cleanSSDate: '2024-12-31', cleanFinDate: '2024-12-31', ssDiscountSheet: '2024-10', pssAcceptanceDate: '2024-02-10', tier: 1, accountId: MOCK_ACCOUNT_ID, projectId: 'proj_1', createdAt: new Date().toISOString(), status: 'active', workflowStatus: 'validated' },

    // Tier 2 (Sub of c1)
    { id: 'c3', name: 'Eletricidade do Norte', nif: '501000111', email: 'geral@elecnorte.pt', address: 'Braga', activity: 'Instalações Elétricas', impic: 'IMP-222', parentId: 'c1', tier: 2, accountId: MOCK_ACCOUNT_ID, projectId: 'proj_1', status: 'active', workflowStatus: 'validated', createdAt: new Date().toISOString() },
    { id: 'c4', name: 'Canalizações Santos', nif: '501000222', email: 'santos@canal.pt', address: 'Vila Real', activity: 'AVAC e Águas', impic: 'IMP-333', parentId: 'c1', tier: 2, accountId: MOCK_ACCOUNT_ID, projectId: 'proj_1', status: 'active', workflowStatus: 'validated', createdAt: new Date().toISOString() },

    // Tier 2 (Sub of c2)
    { id: 'c5', name: 'Betão & Cilindro', nif: '501000333', email: 'obras@betao.pt', address: 'Leiria', activity: 'Estruturas', impic: 'IMP-444', parentId: 'c2', tier: 2, accountId: MOCK_ACCOUNT_ID, projectId: 'proj_1', status: 'active', workflowStatus: 'validated', createdAt: new Date().toISOString() },

    // Tier 3 (Sub of c3 - Elec Norte)
    { id: 'c6', name: 'Instalações Rápidas Unipessoal', nif: '501000444', email: 'rui@rapidas.pt', address: 'Guimarães', activity: 'Mão de Obra Elétrica', impic: 'IMP-555', parentId: 'c3', tier: 3, accountId: MOCK_ACCOUNT_ID, projectId: 'proj_1', status: 'active', workflowStatus: 'validation_pending', createdAt: new Date().toISOString() },

    // Tier 3 (Sub of c3 - Elec Norte)
    { id: 'c7', name: 'Fios & Cabos Lda', nif: '501000555', email: 'geral@fioscabos.pt', address: 'Porto', activity: 'Infraestruturas TI', impic: 'IMP-666', parentId: 'c3', tier: 3, accountId: MOCK_ACCOUNT_ID, projectId: 'proj_1', status: 'active', workflowStatus: 'validated', createdAt: new Date().toISOString() },

    // Tier 3 (Sub of c5 - Betão)
    { id: 'c8', name: 'Cofragens do Centro', nif: '501000777', email: 'geral@cofragens.pt', address: 'Coimbra', activity: 'Cofragens', impic: 'IMP-777', parentId: 'c5', tier: 3, accountId: MOCK_ACCOUNT_ID, projectId: 'proj_1', status: 'active', workflowStatus: 'data_requested', createdAt: new Date().toISOString() },
];

const MOCK_WORKERS: Worker[] = [
    // C1 Workers
    { id: 'w1', name: 'Manuel António Silva', role: 'Chefe de Equipa', companyId: 'c1', status: 'active', accessCardCode: 'XIS-8821', accessCardValid: true, completedTrainingIds: ['t1', 't3'], accountId: MOCK_ACCOUNT_ID, projectId: 'proj_1', createdAt: new Date().toISOString(), workflowStatus: 'validated' },
    { id: 'w2', name: 'José Carlos Santos', role: 'Pedreiro de 1ª', companyId: 'c1', status: 'active', accessCardCode: 'XIS-9912', accessCardValid: true, completedTrainingIds: ['t3'], accountId: MOCK_ACCOUNT_ID, projectId: 'proj_1', createdAt: new Date().toISOString(), workflowStatus: 'validated' },
    { id: 'w3', name: 'António Costa', role: 'Servente', companyId: 'c1', status: 'active', accessCardCode: 'XIS-1122', accessCardValid: true, accountId: MOCK_ACCOUNT_ID, projectId: 'proj_1', createdAt: new Date().toISOString(), workflowStatus: 'validated' },

    // C2 Workers
    { id: 'w4', name: 'Fernando Pessoa', role: 'Engenheiro Civil', companyId: 'c2', status: 'active', accessCardCode: 'XIS-3344', accessCardValid: true, completedTrainingIds: ['t1', 't2', 't4'], accountId: MOCK_ACCOUNT_ID, projectId: 'proj_1', createdAt: new Date().toISOString(), workflowStatus: 'validated' },

    // C3 Workers (Elec Norte)
    { id: 'w5', name: 'Rui Veloso', role: 'Eletricista Chefe', companyId: 'c3', status: 'active', accessCardCode: 'XIS-5566', accessCardValid: true, completedTrainingIds: ['t2'], accountId: MOCK_ACCOUNT_ID, projectId: 'proj_1', createdAt: new Date().toISOString(), workflowStatus: 'validated' },
    { id: 'w6', name: 'Carlos Paredes', role: 'Ajudante Eletricista', companyId: 'c3', status: 'active', accessCardCode: '', accessCardValid: false, accountId: MOCK_ACCOUNT_ID, projectId: 'proj_1', createdAt: new Date().toISOString(), workflowStatus: 'validation_pending' },

    // C6 Workers (Sub of Elec Norte)
    { id: 'w7', name: 'Mariza Reis', role: 'Técnica de Redes', companyId: 'c6', status: 'active', accessCardCode: 'XIS-7788', accessCardValid: true, completedTrainingIds: ['t2', 't3'], accountId: MOCK_ACCOUNT_ID, projectId: 'proj_1', createdAt: new Date().toISOString(), workflowStatus: 'validated' },

    // C5 Workers (Betão)
    { id: 'w8', name: 'Salvador Sobral', role: 'Carpinteiro Cofragem', companyId: 'c5', status: 'active', accessCardCode: 'XIS-9900', accessCardValid: true, completedTrainingIds: ['t5'], accountId: MOCK_ACCOUNT_ID, projectId: 'proj_1', createdAt: new Date().toISOString(), workflowStatus: 'validated' },
    { id: 'w9', name: 'Luísa Sobral', role: 'Armadora de Ferro', companyId: 'c5', status: 'inactive', accessCardCode: 'XIS-0011', accessCardValid: false, accountId: MOCK_ACCOUNT_ID, projectId: 'proj_1', createdAt: new Date().toISOString(), workflowStatus: 'draft' },
];

const MOCK_EQUIPMENT: Equipment[] = [
    { id: 'eq1', name: 'Escavadora Caterpillar 320', type: 'Maquinaria Pesada', serialNumber: 'CAT-2024-X99', companyId: 'c1', status: 'operational', accountId: MOCK_ACCOUNT_ID, projectId: 'proj_1', createdAt: new Date().toISOString() },
    { id: 'eq2', name: 'Gerador Atlas Copco', type: 'Equipamento Ligeiro', serialNumber: 'GEN-AT-442', companyId: 'c1', status: 'maintenance', accountId: MOCK_ACCOUNT_ID, projectId: 'proj_1', createdAt: new Date().toISOString() },
    { id: 'eq3', name: 'Empilhador Manitou', type: 'Movimentação Cargas', serialNumber: 'MAN-21-QQ', companyId: 'c2', status: 'operational', accountId: MOCK_ACCOUNT_ID, projectId: 'proj_1', createdAt: new Date().toISOString() },
    { id: 'eq4', name: 'Compressor Portátil', type: 'Equipamento Ligeiro', serialNumber: 'AIR-992', companyId: 'c2', status: 'out_of_service', accountId: MOCK_ACCOUNT_ID, projectId: 'proj_1', createdAt: new Date().toISOString() },
    { id: 'eq5', name: 'Grua Torre Liebherr', type: 'Maquinaria Pesada', serialNumber: 'LBH-T-88', companyId: 'c1', status: 'operational', accountId: MOCK_ACCOUNT_ID, projectId: 'proj_1', createdAt: new Date().toISOString() },
    { id: 'eq6', name: 'Carrinha Transporte', type: 'Vehicles', serialNumber: 'AA-00-XX', companyId: 'c4', status: 'operational', accountId: MOCK_ACCOUNT_ID, projectId: 'proj_1', createdAt: new Date().toISOString() },
    { id: 'eq7', name: 'Betoneira Elétrica', type: 'Power Tools', serialNumber: 'BET-202', companyId: 'c1', status: 'maintenance', accountId: MOCK_ACCOUNT_ID, projectId: 'proj_1', createdAt: new Date().toISOString() },
    { id: 'eq8', name: 'Andaime Alumínio', type: 'Equipment', serialNumber: 'AND-555', companyId: 'c5', status: 'operational', accountId: MOCK_ACCOUNT_ID, projectId: 'proj_1', createdAt: new Date().toISOString() },
];

const MOCK_ACCESS_POINTS: AccessPoint[] = [
    // Main Site
    { id: 'ap_site_main', name: 'Estaleiro Principal', type: 'entry', category: 'site', code: 'MAIN-001', capacity: 100, status: 'active', projectId: 'proj_1', createdAt: new Date().toISOString() },
    // Zones inside Main Site
    { id: 'ap_zone_A', name: 'Zona A (Armazém)', type: 'zone', category: 'zone', parentId: 'ap_site_main', code: 'ZONE-A', capacity: 20, status: 'active', projectId: 'proj_1', createdAt: new Date().toISOString() },
    { id: 'ap_zone_B', name: 'Zona B (Edifício 1)', type: 'zone', category: 'zone', parentId: 'ap_site_main', code: 'ZONE-B', capacity: 50, status: 'active', projectId: 'proj_1', createdAt: new Date().toISOString() },
    // Gates
    { id: 'ap_gate_1', name: 'Portaria Norte', type: 'entry', category: 'gate', parentId: 'ap_site_main', code: 'GATE-N', status: 'active', projectId: 'proj_1', createdAt: new Date().toISOString() },
    // Restricted Zones with Required Training
    { id: 'ap_zone_C', name: 'Zona C (High Voltage)', type: 'zone', category: 'zone', parentId: 'ap_site_main', code: 'ZONE-C', capacity: 10, requiredTrainingIds: ['t2', 't4'], status: 'active', projectId: 'proj_1', createdAt: new Date().toISOString() },
    { id: 'ap_roof', name: 'Roof Access', type: 'zone', category: 'zone', parentId: 'ap_site_main', code: 'ROOF-1', capacity: 5, requiredTrainingIds: ['t1'], status: 'active', projectId: 'proj_1', createdAt: new Date().toISOString() },
    // Safe Point
    { id: 'ap_safe_1', name: 'Ponto de Encontro 1', type: 'zone', category: 'safe_point', parentId: 'ap_site_main', code: 'SAFE-1', status: 'active', projectId: 'proj_1', createdAt: new Date().toISOString() },
    { id: 'ap-5', name: 'Remote Station Alpha', code: 'LOC-9999', projectId: 'proj_1', type: 'entry', status: 'active', category: 'site', capacity: 50, requiresGps: true, gps: { lat: 38.71667, lng: -9.13333, radius: 100 }, createdAt: new Date().toISOString() }
];

const generateMockLogs = () => {
    const logs: AccessLog[] = [];
    // Target only top-level sites or major zones for the chart
    const sitePoints = MOCK_ACCESS_POINTS.filter(p => p.category === 'site' || p.category === 'gate');

    // Generate for last 8 days (to include today and ensure coverage)
    for (let i = 0; i < 8; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        sitePoints.forEach(point => {
            // Random number of workers between 5 and 30
            const count = Math.floor(Math.random() * 26) + 5;

            // Allow some randomness in workers to simulate real attendance
            // We use a simple shuffle-like approach or just pick by index with modulo for stability + randomness
            const dayOffset = i * 7;
            const selectedWorkers = MOCK_WORKERS.filter((_, idx) => (idx + dayOffset + point.name.length) % 2 === 0 || Math.random() > 0.5).slice(0, count);

            // If we didn't get enough from the filter, just grab the first N
            const finalWorkers = selectedWorkers.length > 0 ? selectedWorkers : MOCK_WORKERS.slice(0, count);

            finalWorkers.forEach((worker, idx) => {
                // Randomize entry time between 07:00 and 10:00
                const hour = 7 + Math.floor(Math.random() * 3);
                const minute = Math.floor(Math.random() * 60);
                const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;

                logs.push({
                    id: `mock-log-${i}-${point.id}-${worker.id}-${idx}`,
                    projectId: 'proj_1',
                    workerId: worker.id,
                    workerName: worker.name,
                    locationId: point.id,
                    location: point.name,
                    timestamp: `${dateStr}T${timeStr}Z`,
                    status: 'granted',
                    method: 'qr',
                    entityType: 'worker'
                });
            });
        });
    }

    // Maintain the existing specific logs if needed, or just return these. 
    // The user wants general data for the chart.
    return logs;
};

const MOCK_ACCESS_LOGS: AccessLog[] = [
    ...generateMockLogs(),
    // Keep a few specific recent ones if useful for other tests, but ensuring IDs don't clash
    { id: 'log-eq-1', projectId: 'proj_1', entityType: 'equipment', equipmentId: 'eq1', entityName: 'Escavadora Caterpillar 320', locationId: 'ap_site_main', location: 'Estaleiro Principal', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), status: 'granted', method: 'qr' },
    { id: 'log-eq-2', projectId: 'proj_1', entityType: 'equipment', equipmentId: 'eq3', entityName: 'Empilhador Manitou', locationId: 'ap_gate_1', location: 'Portaria Norte', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), status: 'granted', method: 'qr' },
    { id: 'log-eq-4', projectId: 'proj_1', entityType: 'equipment', equipmentId: 'eq4', entityName: 'Compressor Portátil', locationId: 'ap_gate_1', location: 'Portaria Norte', timestamp: new Date(Date.now() - 1000 * 30).toISOString(), status: 'denied', reason: 'Out of Service', method: 'qr' },
];

const MOCK_TRAININGS: Training[] = [
    { id: 't1', name: 'Manobrador de Máquinas', type: 'machinery', provider: 'Interno', validityMonths: 60, icon: 'Hammer', isMandatory: true, accountId: MOCK_ACCOUNT_ID, projectId: 'proj_1', createdAt: new Date().toISOString() },
    { id: 't2', name: 'Trabalhos Eléctricos', type: 'electrical', provider: 'Interno', validityMonths: 12, icon: 'Zap', isMandatory: true, accountId: MOCK_ACCOUNT_ID, projectId: 'proj_1', createdAt: new Date().toISOString() },
    { id: 't3', name: 'Ferrovia (Trabalhos na Via)', type: 'general', provider: 'Infraestruturas de Portugal', validityMonths: 36, icon: 'Train', isMandatory: true, accountId: MOCK_ACCOUNT_ID, projectId: 'proj_1', createdAt: new Date().toISOString() },
    { id: 't4', name: 'Montador de Andaime', type: 'heights', provider: 'Interno', validityMonths: 24, icon: 'ArrowUp', isMandatory: true, accountId: MOCK_ACCOUNT_ID, projectId: 'proj_1', createdAt: new Date().toISOString() },
];

const MOCK_ACCIDENTS: Accident[] = [
    {
        id: 'acc1', title: 'Queda em altura', date: '2024-10-10', location: 'Fachada Norte', locationId: 'ap_site_main',
        severity: 'high', status: 'investigating', type: 'accident', description: 'Trabalhador escorregou em andaime.',
        projectId: 'proj_1', createdAt: new Date().toISOString()
    },
    {
        id: 'acc2', title: 'Corte superficial', date: new Date().toISOString().split('T')[0], location: 'Zona A (Armazém)', locationId: 'ap_zone_A',
        severity: 'low', status: 'closed', type: 'accident', description: 'Corte ao manusear ferramentas.',
        projectId: 'proj_1', createdAt: new Date().toISOString()
    },
    {
        id: 'acc3', title: 'Quase atropelamento', date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0], location: 'Portaria Norte', locationId: 'ap_gate_1',
        severity: 'critical', status: 'open', type: 'near_miss', description: 'Veículo entrou sem sinalizar.',
        projectId: 'proj_1', createdAt: new Date().toISOString()
    },
    {
        id: 'acc4', title: 'Entorse no tornozelo', date: new Date(Date.now() - 86400000 * 10).toISOString().split('T')[0], location: 'Zona B', locationId: 'ap_zone_B',
        severity: 'medium', status: 'closed', type: 'accident', description: 'Tropeçou em material mal arrumado.',
        projectId: 'proj_1', createdAt: new Date().toISOString()
    },
    // More mixed cases for testing
    {
        id: 'acc5', title: 'Queda de objeto', date: new Date(Date.now() - 86400000 * 1).toISOString().split('T')[0], location: 'Zona A (Armazém)', locationId: 'ap_zone_A',
        severity: 'medium', status: 'investigating', type: 'near_miss', description: 'Martelo caiu do 1º andar.',
        projectId: 'proj_1', createdAt: new Date().toISOString()
    },
    {
        id: 'acc6', title: 'Poeira nos olhos', date: new Date(Date.now() - 86400000 * 20).toISOString().split('T')[0], location: 'Zona A (Armazém)', locationId: 'ap_zone_A',
        severity: 'low', status: 'closed', type: 'accident', description: 'Uso incorreto de óculos.',
        projectId: 'proj_1', createdAt: new Date().toISOString()
    }
];

export const useStore = create<AppState>()(persist((set, get) => ({
    currentUser: null,
    users: [],
    accounts: [],
    account: null,
    projects: [],
    companies: [],
    workers: [],
    equipment: [],
    modules: MOCK_MODULES,

    projectRequests: [],
    companyRequests: [],
    subscriptionRequests: [],
    templates: [],
    documents: [],
    notifications: [],
    accessLogs: [],
    accessPoints: [],
    trainings: [],
    accidents: [],
    riskAssessments: [],
    tickets: [],
    ticketMessages: [],
    workflowLogs: [],
    companyProfiles: [],
    workerProfiles: [],
    equipmentProfiles: [],
    courses: [],
    trainingSessions: [],
    workerTrainingRecords: [],

    isInitialized: false,

    initialize: async () => {
        const state = get();
        if (state.isInitialized) {
            console.log('[Store] Already initialized');
            return;
        }

        try {
            console.log('[Store] Initializing DB...');
            await initDB();

            // Check if seeded
            const existingAccounts = await executeQuery('SELECT * FROM accounts');
            const existingUsers = await executeQuery('SELECT * FROM users');

            const insert = async (table: string, items: any[]) => {
                if (!items || items.length === 0) return;
                for (const item of items) {
                    try {
                        const dbItem: any = {};
                        for (const k of Object.keys(item)) {
                            if (k === 'projectAccess' || k === 'draftData' || k === 'file') continue;
                            const val = item[k];
                            const dbKey = toSnake(k);
                            if (Array.isArray(val) || (typeof val === 'object' && val !== null)) {
                                dbItem[dbKey] = JSON.stringify(val);
                            } else {
                                dbItem[dbKey] = val;
                            }
                        }
                        const cols = Object.keys(dbItem).join(', ');
                        const placeholders = Object.keys(dbItem).map(() => '?').join(', ');
                        const values = Object.values(dbItem);
                        await executeQuery(`INSERT OR IGNORE INTO ${table} (${cols}) VALUES (${placeholders})`, values);
                    } catch (err) { console.error(`Error seeding ${table}:`, err); }
                }
            };


            if (existingAccounts.length === 0 || existingUsers.length === 0) {
                // CASE 1: DB is empty. Check if we have data in Local State (from Persistence)
                if (state.users && state.users.length > 0 && state.accounts && state.accounts.length > 0) {
                    console.log('[Store] DB is empty but State has data. Backfilling DB from Local State...');
                    await insert('accounts', state.accounts);
                    await insert('users', state.users);
                    await insert('projects', state.projects);
                    await insert('access_points', state.accessPoints);
                    await insert('trainings', state.trainings);
                    await insert('accidents', state.accidents);
                    await insert('risk_assessments', state.riskAssessments);
                    await insert('access_logs', state.accessLogs);

                    for (const u of state.users) {
                        if (u.projectAccess) {
                            for (const pa of u.projectAccess) {
                                await executeQuery(`INSERT OR IGNORE INTO project_members (id, project_id, user_id, role, allowed_modules, company_id) VALUES (?, ?, ?, ?, ?, ?)`,
                                    [nanoid(), pa.projectId, u.id, pa.role, JSON.stringify(pa.allowedModules), pa.companyIds ? JSON.stringify(pa.companyIds) : null]);
                            }
                        }
                    }
                } else {
                    // CASE 2: DB is empty and no persistence. Check skip flag.
                    const skipSeeding = localStorage.getItem('safesite_skip_seeding');
                    if (skipSeeding) {
                        console.log('[Store] Clean Mode Active. Seeding System Users only...');
                        await insert('accounts', MOCK_ACCOUNTS);
                        await insert('users', MOCK_USERS);
                        await insert('projects', MOCK_PROJECTS);
                        for (const u of MOCK_USERS) {
                            if (u.projectAccess) {
                                for (const pa of u.projectAccess) {
                                    await executeQuery(`INSERT OR IGNORE INTO project_members (id, project_id, user_id, role, allowed_modules, company_id) VALUES (?, ?, ?, ?, ?, ?)`,
                                        [nanoid(), pa.projectId, u.id, pa.role, JSON.stringify(pa.allowedModules), pa.companyIds ? JSON.stringify(pa.companyIds) : null]);
                                }
                            }
                        }
                    } else {
                        console.log('[Store] Seeding Database with Mocks...');
                        await insert('accounts', MOCK_ACCOUNTS);
                        await insert('users', MOCK_USERS);
                        await insert('projects', MOCK_PROJECTS);
                        await insert('companies', MOCK_COMPANIES);
                        await insert('workers', MOCK_WORKERS);
                        await insert('equipment', MOCK_EQUIPMENT);
                        await insert('access_points', MOCK_ACCESS_POINTS);
                        await insert('trainings', MOCK_TRAININGS);
                        await insert('accidents', MOCK_ACCIDENTS);
                        await insert('access_logs', MOCK_ACCESS_LOGS);

                        for (const u of MOCK_USERS) {
                            if (u.projectAccess) {
                                for (const pa of u.projectAccess) {
                                    await executeQuery(`INSERT OR IGNORE INTO project_members (id, project_id, user_id, role, allowed_modules, company_id) VALUES (?, ?, ?, ?, ?, ?)`,
                                        [nanoid(), pa.projectId, u.id, pa.role, JSON.stringify(pa.allowedModules), pa.companyIds ? JSON.stringify(pa.companyIds) : null]);
                                }
                            }
                        }
                    }
                }
            } else {
                // CASE 3: DB has accounts/users, but check if operational data was wiped (Partial Wipe Recovery)
                const existingCompanies = await executeQuery('SELECT id FROM companies LIMIT 1');
                const skipSeeding = localStorage.getItem('safesite_skip_seeding');

                if (existingCompanies.length === 0 && !skipSeeding) {
                    console.log('[Store] Partial wipe detected. Restoring operational defaults...');
                    await insert('companies', MOCK_COMPANIES);
                    await insert('workers', MOCK_WORKERS);
                    await insert('equipment', MOCK_EQUIPMENT);
                    await insert('access_points', MOCK_ACCESS_POINTS);
                    await insert('trainings', MOCK_TRAININGS);
                    await insert('accidents', MOCK_ACCIDENTS);
                    await insert('access_logs', MOCK_ACCESS_LOGS);
                }
            }

            // Load Data
            const load = async (table: string) => {
                const rows = await executeQuery(`SELECT * FROM ${table}`);
                if (!rows) return [];
                return rows.map(row => {
                    const item: any = {};
                    for (const k of Object.keys(row)) {
                        const camelKey = k.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
                        let val = row[k];
                        try {
                            if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))) {
                                val = JSON.parse(val);
                            }
                        } catch (e) { }
                        item[camelKey] = val;
                    }
                    return item;
                });
            };

            const [
                accounts, users, projects, companies, workers, equipment,
                accessPoints, trainings, accidents, riskAssessments, accessLogs, documents, companyProfiles,
                workerProfiles, equipmentProfiles, tickets, ticketMessages, courses, trainingSessions, workerTrainingRecords,
                subscriptionRequests, projectRequests
            ] = await Promise.all([
                load('accounts'), load('users'), load('projects'), load('companies'), load('workers'), load('equipment'),
                load('access_points'), load('trainings'), load('accidents'), load('risk_assessments'), load('access_logs'), load('documents'), load('company_profiles'),
                load('worker_profiles'), load('equipment_profiles'), load('tickets'), load('ticket_messages'),
                load('courses'), load('training_sessions'), load('worker_training_records'),
                load('subscription_requests'), load('project_requests')
            ]);

            const members = (await load('project_members')) as any[];

            // Ensure arrays are safe before touching them
            const safeUsers = Array.isArray(users) ? users : [];
            const safeMembers = Array.isArray(members) ? members : [];

            // Cleanup legacy demo accounts and ensure Super User
            const DEMO_EMAILS = [
                'admin@safesite.com',
                'manager@safesite.com',
                'basic@safesite.com',
                'fiscal@safesite.com',
                'data@safesite.com',
                'super@safesite.com',
                'approver@safesite.com'
            ];

            for (const demoEmail of DEMO_EMAILS) {
                await executeQuery(`DELETE FROM users WHERE LOWER(email) = ?`, [demoEmail.toLowerCase()]).catch(() => {});
                await executeQuery(`DELETE FROM project_members WHERE user_id IN (SELECT id FROM users WHERE LOWER(email) = ?)`, [demoEmail.toLowerCase()]).catch(() => {});
            }

            for (const superUser of MOCK_USERS) {
                const existingSuper = safeUsers.find((u: any) => u.email?.toLowerCase() === superUser.email.toLowerCase());
                if (!existingSuper) {
                    console.log(`[Store] Seeding Super User (${superUser.email})...`);
                    await insert('users', [superUser]);
                    if (superUser.projectAccess) {
                        for (const pa of superUser.projectAccess) {
                            await executeQuery(`INSERT OR IGNORE INTO project_members (id, project_id, user_id, role, allowed_modules, company_id) VALUES (?, ?, ?, ?, ?, ?)`,
                                [nanoid(), pa.projectId, superUser.id, pa.role, JSON.stringify(pa.allowedModules), pa.companyIds ? JSON.stringify(pa.companyIds) : null]);
                            safeMembers.push({
                                userId: superUser.id,
                                projectId: pa.projectId,
                                role: pa.role,
                                allowedModules: pa.allowedModules,
                                companyIds: pa.companyIds
                            });
                        }
                    }
                    safeUsers.push(superUser as any);
                } else {
                    await executeQuery(`UPDATE users SET password = ?, role = 'superadmin' WHERE LOWER(email) = ?`, [superUser.password, superUser.email.toLowerCase()]).catch(() => {});
                    existingSuper.password = superUser.password;
                    existingSuper.role = 'superadmin';
                }
            }

            // Exclude demo accounts
            const cleanSafeUsers = safeUsers.filter((u: any) => !DEMO_EMAILS.includes(u.email?.toLowerCase()));

            console.log('[Store] Mapping users with access...');

            const usersWithAccess = cleanSafeUsers.map((u: any) => ({
                ...u,
                projectAccess: safeMembers.filter((m: any) => m.userId === u.id).map((m: any) => ({
                    projectId: m.projectId,
                    role: m.role,
                    allowedModules: m.allowedModules,
                    companyIds: m.companyId
                }))
            }));


            // Verify Standard Profiles
            let finalCompanyProfiles = [...companyProfiles];
            let finalWorkerProfiles = [...workerProfiles];
            let finalEquipmentProfiles = [...equipmentProfiles];

            const projectsToCheck = projects.length > 0 ? projects : MOCK_PROJECTS;
            for (const proj of projectsToCheck) {
                // Company
                const stdCompanyId = `profile_std_company_${proj.id}`;
                const companyProfile: CompanyProfile = {
                    id: stdCompanyId, projectId: proj.id, name: 'Standard',
                    requirements: {
                        insurance_at: true, insurance_rc: true, finance_ss: true, finance_fin: true,
                        ss_discount: true, pss_acceptance: true, work_schedule: true
                    },
                    standardUploads: {
                        insurance_at: true, insurance_rc: true, finance_ss: true, finance_fin: true,
                        ss_discount: true, pss_acceptance: true, work_schedule: true
                    },
                    customDocuments: [], isSystem: false, createdAt: new Date().toISOString()
                };

                if (!finalCompanyProfiles.some(p => p.id === stdCompanyId)) {
                    await insert('company_profiles', [companyProfile]);
                    finalCompanyProfiles.push(companyProfile);
                }

                // Worker
                const stdWorkerId = `profile_std_worker_${proj.id}`;
                const workerProfile: WorkerProfile = {
                    id: stdWorkerId, projectId: proj.id, name: 'Standard',
                    requirements: { medical_fitness: true, induction: true, epi: true, specific_training: true, contract: true },
                    standardUploads: {
                        medical_fitness: true, induction: true, epi: true, specific_training: true, contract: true
                    },
                    customDocuments: [], isSystem: false, createdAt: new Date().toISOString()
                };

                if (!finalWorkerProfiles.some(p => p.id === stdWorkerId)) {
                    await insert('worker_profiles', [workerProfile]);
                    finalWorkerProfiles.push(workerProfile);
                }

                // Equipment
                const stdEquipId = `profile_std_equipment_${proj.id}`;
                const equipProfile: EquipmentProfile = {
                    id: stdEquipId, projectId: proj.id, name: 'Standard',
                    requirements: { maintenance: true, inspection: true, insurance: true, property_title: true },
                    standardUploads: {
                        maintenance: true, inspection: true, insurance: true, property_title: true
                    },
                    customDocuments: [], isSystem: false, createdAt: new Date().toISOString()
                };

                if (!finalEquipmentProfiles.some(p => p.id === stdEquipId)) {
                    await insert('equipment_profiles', [equipProfile]);
                    finalEquipmentProfiles.push(equipProfile);
                }
            }

            const activeUser = get().currentUser || state.currentUser;
            let resolvedUser: User | null = null;
            if (activeUser) {
                resolvedUser = usersWithAccess.find((u: any) => u.id === activeUser.id || (u.email && activeUser.email && u.email.toLowerCase() === activeUser.email.toLowerCase())) || activeUser;
            }

            set({
                isInitialized: true,
                accounts,
                users: usersWithAccess,
                currentUser: resolvedUser,
                projects,
                companies,
                workers,
                equipment,
                accessPoints,
                trainings,
                accidents,
                riskAssessments: riskAssessments || [],
                accessLogs,
                documents: documents || [],
                companyProfiles: finalCompanyProfiles,
                workerProfiles: finalWorkerProfiles,
                equipmentProfiles: finalEquipmentProfiles,
                courses: courses || [],
                trainingSessions: trainingSessions || [],
                workerTrainingRecords: workerTrainingRecords || [],
                subscriptionRequests: subscriptionRequests || [],
                projectRequests: projectRequests || []
            });
            console.log(`[Store] Initialization Complete. Loaded ${documents?.length || 0} documents.`);

            // Trigger routine expiration checks immediately
            get().checkExpirations();

            // Sincronizar utilizadores e clientes registados da base de dados central PostgreSQL
            get().syncFromServer().catch(() => {});
        } catch (e) {
            console.error("Failed to initialize store from DB", e);
        }
    },

    login: async (email: string, password?: string) => {
        const users = get().users;
        const cleanEmail = email.trim().toLowerCase();
        let user = users.find(u => u.email.trim().toLowerCase() === cleanEmail);
        if (!user) {
            user = MOCK_USERS.find(u => u.email.trim().toLowerCase() === cleanEmail);
        }
        if (user) {
            // Verificar suspensão temporária ou eliminação RGPD
            if (user.status === 'suspended') {
                return {
                    success: false,
                    error: user.suspensionReason
                        ? `A sua conta encontra-se temporariamente suspensa pelo administrador (Motivo: ${user.suspensionReason}).`
                        : 'A sua conta encontra-se temporariamente suspensa pelo administrador. Por favor contacte o suporte.'
                };
            }
            if (user.status === 'deleted') {
                return {
                    success: false,
                    error: 'Esta conta foi removida em conformidade com o RGPD.'
                };
            }

            if (user.password) {
                if (password && user.password === password) {
                    const now = new Date().toISOString();
                    const updatedUser = { ...user, lastLoginAt: now };
                    set({ currentUser: updatedUser });
                    get().updateUser(user.id, { lastLoginAt: now });
                    return { success: true };
                }
            } else {
                const now = new Date().toISOString();
                const updatedUser = { ...user, lastLoginAt: now };
                set({ currentUser: updatedUser });
                get().updateUser(user.id, { lastLoginAt: now });
                return { success: true };
            }
        }

        // Validação de fallback contra o PostgreSQL no servidor (garante login após deploy ou em novos navegadores)
        try {
            if (password) {
                const res = await fetch('/api/auth/login-verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: cleanEmail, password }),
                });
                const data = await res.json();
                if (res.ok && data.success && data.user) {
                    const authenticatedUser = data.user;
                    if (data.account) {
                        const existingAcc = get().accounts.find(a => a.id === data.account.id);
                        if (!existingAcc) {
                            get().addAccount(data.account);
                        }
                    }
                    const existingUser = get().users.find(u => u.id === authenticatedUser.id || u.email.toLowerCase() === cleanEmail);
                    if (!existingUser) {
                        get().addUser(authenticatedUser);
                    } else {
                        get().updateUser(existingUser.id, authenticatedUser);
                    }
                    set({ currentUser: authenticatedUser });
                    return { success: true };
                }

                if (!res.ok && data.message) {
                    return { success: false, error: data.message };
                }
            }
        } catch (serverErr) {
            console.warn('[Store] Fallback de autenticação no servidor falhou:', serverErr);
        }

        return { success: false, error: 'E-mail ou palavra-passe incorretos.' };
    },

    syncFromServer: async () => {
        try {
            const res = await fetch('/api/platform/clients');
            const data = await res.json();
            if (res.ok && data.success) {
                const { accounts: srvAccounts, users: srvUsers, subscriptionRequests: srvReqs, projects: srvProjects, projectRequests: srvProjectRequests } = data;
                let newPendingCount = 0;

                set((state) => {
                    // Sincronizar Accounts: se vier do servidor, o servidor é a fonte da verdade para contas registadas
                    const srvAccMap = new Map((srvAccounts || []).map((a: any) => [a.id, a]));
                    const mergedAccounts: Account[] = [];
                    if (Array.isArray(srvAccounts)) {
                        for (const srvAcc of srvAccounts) {
                            const local = state.accounts.find(a => a.id === srvAcc.id);
                            mergedAccounts.push(local ? { ...local, ...srvAcc } : srvAcc);
                        }
                    }
                    // Preservar contas locais default/mock se ainda existirem
                    for (const localAcc of state.accounts) {
                        if (!srvAccMap.has(localAcc.id) && (localAcc.id === 'acc_mock_01' || localAcc.id.startsWith('mock_'))) {
                            mergedAccounts.push(localAcc);
                        }
                    }

                    // Sincronizar Users preservando projectAccess
                    const existingUserEmails = new Set(state.users.map(u => u.email.toLowerCase()));
                    const mergedUsers = [...state.users];
                    if (Array.isArray(srvUsers)) {
                        for (const u of srvUsers) {
                            if (!existingUserEmails.has(u.email.toLowerCase())) {
                                mergedUsers.push(u);
                                existingUserEmails.add(u.email.toLowerCase());
                            } else {
                                const idx = mergedUsers.findIndex(usr => usr.email.toLowerCase() === u.email.toLowerCase());
                                if (idx !== -1) {
                                    // Preservar e fundir projectAccess sem perder dados
                                    const serverAccess = u.projectAccess || [];
                                    const localAccess = mergedUsers[idx].projectAccess || [];
                                    const combinedAccessMap = new Map();
                                    for (const pa of localAccess) combinedAccessMap.set(pa.projectId, pa);
                                    for (const pa of serverAccess) combinedAccessMap.set(pa.projectId, pa);
                                    const finalAccess = Array.from(combinedAccessMap.values());

                                    mergedUsers[idx] = { 
                                        ...mergedUsers[idx], 
                                        ...u,
                                        projectAccess: finalAccess
                                    };
                                }
                            }
                        }
                    }

                    // Atualizar currentUser se estiver na lista
                    let updatedCurrentUser = state.currentUser;
                    if (updatedCurrentUser) {
                        const match = mergedUsers.find(u => u.id === updatedCurrentUser?.id || (u.email && u.email.toLowerCase() === updatedCurrentUser?.email?.toLowerCase()));
                        if (match) {
                            updatedCurrentUser = {
                                ...updatedCurrentUser,
                                ...match,
                                projectAccess: match.projectAccess || updatedCurrentUser.projectAccess,
                            };
                        }
                    }

                    // Sincronizar Subscription Requests
                    const existingReqIds = new Set(state.subscriptionRequests.map(r => r.id));
                    const mergedReqs = [...state.subscriptionRequests];
                    if (Array.isArray(srvReqs)) {
                        for (const r of srvReqs) {
                            if (!existingReqIds.has(r.id)) {
                                mergedReqs.push(r);
                                existingReqIds.add(r.id);
                            } else {
                                const idx = mergedReqs.findIndex(req => req.id === r.id);
                                if (idx !== -1) {
                                    mergedReqs[idx] = { ...mergedReqs[idx], ...r };
                                }
                            }
                        }
                    }

                    // Sincronizar Projects
                    const existingProjectIds = new Set(state.projects.map(p => p.id));
                    const mergedProjects = [...state.projects];
                    if (Array.isArray(srvProjects)) {
                        for (const p of srvProjects) {
                            if (!existingProjectIds.has(p.id)) {
                                mergedProjects.push(p);
                                existingProjectIds.add(p.id);
                                dbInsert('projects', p).catch(() => {});
                            } else {
                                const idx = mergedProjects.findIndex(proj => proj.id === p.id);
                                if (idx !== -1) {
                                    mergedProjects[idx] = { ...mergedProjects[idx], ...p };
                                    dbUpdate('projects', p.id, p).catch(() => {});
                                }
                            }
                        }
                    }

                    // Sincronizar Project Requests (pedidos de adesão a obras)
                    const existingProjReqIds = new Set(state.projectRequests.map(r => r.id));
                    const mergedProjReqs = [...state.projectRequests];
                    if (Array.isArray(srvProjectRequests)) {
                        for (const pr of srvProjectRequests) {
                            if (!existingProjReqIds.has(pr.id)) {
                                mergedProjReqs.push(pr);
                                existingProjReqIds.add(pr.id);
                                dbInsert('project_requests', pr).catch(() => {});
                                if (pr.status === 'pending') {
                                    newPendingCount++;
                                }
                            } else {
                                const idx = mergedProjReqs.findIndex(req => req.id === pr.id);
                                if (idx !== -1) {
                                    mergedProjReqs[idx] = { ...mergedProjReqs[idx], ...pr };
                                    dbUpdate('project_requests', pr.id, pr).catch(() => {});
                                }
                            }
                        }
                    }

                    return {
                        accounts: mergedAccounts,
                        users: mergedUsers,
                        currentUser: updatedCurrentUser,
                        subscriptionRequests: mergedReqs,
                        projects: mergedProjects,
                        projectRequests: mergedProjReqs,
                    };
                });

                if (newPendingCount > 0) {
                    get().addNotification('info', `Tem ${newPendingCount} novo(s) pedido(s) de adesão a obras a aguardar aprovação.`);
                }
                console.log(`[Store] Sincronização com o servidor concluída: ${srvAccounts?.length || 0} contas, ${srvUsers?.length || 0} utilizadores, ${srvProjects?.length || 0} projetos, ${srvProjectRequests?.length || 0} pedidos de obra.`);
            }
        } catch (e) {
            console.warn('[Store] Falha ao sincronizar com servidor (offline fallback ativo):', e);
        }
    },

    setCurrentUser: (user: User | null) => set({ currentUser: user }),
    addNotification: (type: 'success' | 'error' | 'info' | 'warning', message: string) => set((state) => ({
        notifications: [...state.notifications, {
            id: nanoid(),
            type,
            message,
            read: false,
            createdAt: new Date().toISOString()
        }]
    })),
    addAccessLog: (log) => {
        let success = true;
        let message = 'Access Allowed';

        set((state) => {
            const project = state.projects.find(p => p.id === log.projectId);
            const account = state.accounts.find(a => a.id === project?.accountId);

            if (account && account.accessControlLimit !== -1) {
                const currentMonth = new Date().getMonth();
                const currentYear = new Date().getFullYear();
                const accountProjectIds = state.projects.filter(p => p.accountId === account.id).map(p => p.id);

                const monthlyLogsCount = state.accessLogs.filter(l => {
                    const logDate = new Date(l.timestamp);
                    return accountProjectIds.includes(l.projectId) &&
                        logDate.getMonth() === currentMonth &&
                        logDate.getFullYear() === currentYear;
                }).length;

                if (monthlyLogsCount >= account.accessControlLimit) {
                    // alert(`Access Control Limit Reached: ${account.accessControlLimit} logs/month for ${account.plan} plan.`);
                    success = false;
                    message = `Plan Limit Reached (${account.accessControlLimit}/month)`;
                    // Even if denied by limit, we might want to log it as denied or just block. 
                    // For now, let's just return state without adding log if strict, or add as denied.
                    // Implementation choice: Log as denied.
                }
            }

            // If the log passed in has status 'denied', success is false
            if (log.status === 'denied') {
                success = false;
                message = log.reason || 'Access Denied';
            }

            const newLog: AccessLog = {
                ...log,
                id: nanoid(),
                timestamp: new Date().toISOString(),
                entityType: log.entityType || 'worker', // Default to worker
                workerId: log.workerId || '', // Ensure compatible with type
                workerName: log.workerName || log.entityName || 'Unknown'
            };

            return {
                accessLogs: [newLog, ...state.accessLogs]
            };
        });

        return { success, message };
    },

    addAccessPoint: (point) => set((state) => {
        const id = nanoid();
        const newPoint = { ...point, id, createdAt: new Date().toISOString() };
        dbInsert('access_points', newPoint).catch(console.error);
        return { accessPoints: [...state.accessPoints, newPoint] };
    }),
    updateAccessPoint: (id, updates) => set((state) => {
        dbUpdate('access_points', id, updates).catch(console.error);
        return { accessPoints: state.accessPoints.map(p => p.id === id ? { ...p, ...updates } : p) };
    }),
    deleteAccessPoint: (id) => set((state) => {
        dbRemove('access_points', id).catch(console.error);
        return { accessPoints: state.accessPoints.filter(p => p.id !== id) };
    }),
    removeNotification: (id: string) => set((state) => ({
        notifications: state.notifications.filter(n => n.id !== id)
    })),

    addUser: (user: Omit<User, 'id' | 'createdAt'> & { id?: string }) => set((state) => {
        const id = user.id || nanoid();
        const newUser = { ...user, id, createdAt: new Date().toISOString() };
        dbInsert('users', newUser).catch(console.error);

        // Notificar servidor PostgreSQL para persistência centralizada
        fetch('/api/platform/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newUser),
        }).catch(console.error);

        return { users: [...state.users, newUser] };
    }),
    updateUser: (id, updates) => set((state) => {
        dbUpdate('users', id, updates).catch(console.error);
        return { users: state.users.map(u => u.id === id ? { ...u, ...updates } : u) };
    }),

    ensureSuperAdmin: () => set((state) => {
        let updatedUsers = [...state.users];
        for (const superUser of MOCK_USERS) {
            const existing = updatedUsers.find(u => u.email?.toLowerCase() === superUser.email.toLowerCase());
            if (existing) {
                updatedUsers = updatedUsers.map(u => 
                    u.email?.toLowerCase() === superUser.email.toLowerCase() 
                        ? { ...u, password: superUser.password, role: 'superadmin' as const } 
                        : u
                );
            } else {
                updatedUsers.push(superUser);
            }
        }
        return { users: updatedUsers };
    }),

    addProject: (project) => set((state) => {
        const isSuper = state.currentUser?.role === 'superadmin';
        const userAccountId = state.currentUser?.accountId;
        const account = state.accounts.find(a => a.id === userAccountId) || state.accounts.find(a => a.id === MOCK_ACCOUNT_ID) || state.account;

        if (!isSuper) {
            if (!account || account.plan === 'free' || account.maxProjects === 0) {
                alert('Para criar novos projetos é necessária uma subscrição ativa (Básico, Premium ou Enterprise). Solicite a sua subscrição no Workplace.');
                return state;
            }
            if (account.maxProjects !== -1) {
                const currentCount = state.projects.filter(p => p.accountId === account.id).length;
                if (currentCount >= account.maxProjects) {
                    alert(`Limite atingido: O seu plano ${account.plan.toUpperCase()} permite até ${account.maxProjects} obra(s). Faça upgrade para criar mais projetos.`);
                    return state;
                }
            }
        }
        const projectId = nanoid();
        const stdCompanyId = `profile_std_company_${projectId}`;
        const stdWorkerId = `profile_std_worker_${projectId}`;
        const stdEquipmentId = `profile_std_equipment_${projectId}`;
        const createdAt = new Date().toISOString();

        // Create Default Profiles
        const compProfile: CompanyProfile = {
            id: stdCompanyId, projectId, name: 'Standard',
            requirements: {
                insurance_at: true, insurance_rc: true, finance_ss: true, finance_fin: true,
                ss_discount: true, pss_acceptance: true, work_schedule: true
            },
            standardUploads: {
                insurance_at: true, insurance_rc: true, finance_ss: true, finance_fin: true,
                ss_discount: true, pss_acceptance: true, work_schedule: true
            },
            customDocuments: [], isSystem: false, createdAt
        };

        const workProfile: WorkerProfile = {
            id: stdWorkerId, projectId, name: 'Standard',
            requirements: { medical_fitness: true, induction: true, epi: true, specific_training: true, contract: true },
            standardUploads: { medical_fitness: true, induction: true, epi: true, specific_training: true, contract: true },
            customDocuments: [], isSystem: false, createdAt
        };

        const equipProfile: EquipmentProfile = {
            id: stdEquipmentId, projectId, name: 'Standard',
            requirements: { maintenance: true, inspection: true, insurance: true, property_title: true },
            standardUploads: { maintenance: true, inspection: true, insurance: true, property_title: true },
            customDocuments: [], isSystem: false, createdAt
        };

        dbInsert('company_profiles', compProfile).catch(console.error);
        dbInsert('worker_profiles', workProfile).catch(console.error);
        dbInsert('equipment_profiles', equipProfile).catch(console.error);

        const creatorId = state.currentUser?.id;
        const code = project.code || `PRJ-${projectId.replace(/^prj_/, '').substring(0, 4).toUpperCase()}-${new Date().getFullYear()}`;
        const newProject = {
            ...project,
            id: projectId,
            code,
            creatorId,
            accountId: account?.id || userAccountId || MOCK_ACCOUNT_ID,
            createdAt,
            defaultCompanyProfileId: stdCompanyId,
            defaultWorkerProfileId: stdWorkerId,
            defaultEquipmentProfileId: stdEquipmentId
        };
        dbInsert('projects', newProject).catch(console.error);

        // Notificar servidor central para persistência e disponibilidade a outros utilizadores
        fetch('/api/platform/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: newProject.id,
                name: newProject.name,
                code: newProject.code,
                description: newProject.description,
                address: newProject.address,
                accountId: newProject.accountId,
                creatorId: state.currentUser?.id,
                status: newProject.status || 'active',
            })
        }).catch(console.error);

        // Garantir acesso EXCLUSIVO do criador como gestor ao novo projeto (sem membros adicionais)
        let updatedUsers = state.users;
        let updatedCurrentUser = state.currentUser;
        if (creatorId) {
            const newAccess = {
                projectId,
                role: 'manager' as ProjectRole,
                allowedModules: MOCK_MODULES.map(m => m.id)
            };

            executeQuery(`INSERT OR REPLACE INTO project_members (id, project_id, user_id, role, allowed_modules) VALUES (?, ?, ?, ?, ?)`,
                [nanoid(), projectId, creatorId, 'manager', JSON.stringify(newAccess.allowedModules)]
            ).catch(console.error);

            updatedUsers = state.users.map(u => {
                if (u.id !== creatorId) return u;
                const updated = {
                    ...u,
                    projectAccess: [...(u.projectAccess || []), newAccess]
                };
                if (updatedCurrentUser?.id === creatorId) {
                    updatedCurrentUser = updated;
                }
                return updated;
            });
        }

        return {
            projects: [...state.projects, newProject],
            users: updatedUsers,
            currentUser: updatedCurrentUser,
            companyProfiles: [...state.companyProfiles, compProfile],
            workerProfiles: [...state.workerProfiles, workProfile],
            equipmentProfiles: [...state.equipmentProfiles, equipProfile]
        };
    }),

    addAccount: (account) => set((state) => {
        const id = (account as any).id || nanoid();
        const newAccount = { ...account, id, createdAt: new Date().toISOString() };
        dbInsert('accounts', newAccount).catch(console.error);
        return { accounts: [...state.accounts, newAccount] };
    }),
    updateAccount: (id, updates) => set((state) => {
        dbUpdate('accounts', id, updates).catch(console.error);
        return { accounts: state.accounts.map(a => a.id === id ? { ...a, ...updates } : a) };
    }),

    deleteAccount: async (accountId: string) => {
        try {
            const res = await fetch(`/api/platform/clients?accountId=${encodeURIComponent(accountId)}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            if (res.ok && data.success) {
                set((state) => ({
                    accounts: state.accounts.filter(a => a.id !== accountId)
                }));
                dbRemove('accounts', accountId).catch(console.error);
                get().addNotification('success', data.message || 'Conta de cliente removida com sucesso.');
                return { success: true, message: data.message };
            }
            const err = data.error || 'Não foi possível remover a conta.';
            get().addNotification('error', err);
            return { success: false, message: err };
        } catch (e: any) {
            const err = e?.message || 'Falha de comunicação ao remover conta.';
            get().addNotification('error', err);
            return { success: false, message: err };
        }
    },

    cleanupOrphanAccounts: async () => {
        try {
            const res = await fetch('/api/platform/clients?action=cleanup_orphans', {
                method: 'DELETE',
            });
            const data = await res.json();
            if (res.ok && data.success) {
                if (Array.isArray(data.deletedAccountIds) && data.deletedAccountIds.length > 0) {
                    const deletedSet = new Set(data.deletedAccountIds);
                    set((state) => ({
                        accounts: state.accounts.filter(a => !deletedSet.has(a.id))
                    }));
                    for (const id of data.deletedAccountIds) {
                        dbRemove('accounts', id).catch(console.error);
                    }
                }
                await get().syncFromServer();
                get().addNotification('success', data.message || 'Contas órfãs removidas com sucesso.');
                return { success: true, count: data.deletedAccountIds?.length || 0, message: data.message };
            }
            const err = data.error || 'Erro ao limpar contas órfãs.';
            get().addNotification('error', err);
            return { success: false, message: err };
        } catch (e: any) {
            const err = e?.message || 'Falha ao limpar contas órfãs.';
            get().addNotification('error', err);
            return { success: false, message: err };
        }
    },

    // Subscription Request Handlers (Client Onboarding)
    addSubscriptionRequest: (req) => set((state) => {
        const id = req.id || nanoid();
        const newReq: SubscriptionRequest = {
            ...req,
            id,
            status: req.status || 'pending_email',
            createdAt: new Date().toISOString()
        };
        dbInsert('subscription_requests', newReq).catch(console.error);
        return { subscriptionRequests: [newReq, ...state.subscriptionRequests] };
    }),
    updateSubscriptionRequest: (id, updates) => set((state) => {
        dbUpdate('subscription_requests', id, updates).catch(console.error);
        return {
            subscriptionRequests: state.subscriptionRequests.map(r =>
                r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
            )
        };
    }),
    approveSubscriptionRequest: (id, reviewedBy = 'Super Admin') => {
        const state = get();
        const req = state.subscriptionRequests.find(r => r.id === id);
        if (!req) return;

        const cleanEmail = req.email.toLowerCase().trim();
        const existingAccount = state.accounts.find(a => 
            a.contactEmail?.toLowerCase().trim() === cleanEmail || 
            (req.nif && a.vatNumber?.trim() === req.nif.trim()) ||
            a.name.toLowerCase().trim() === req.companyName.toLowerCase().trim()
        );

        if (existingAccount) {
            state.changeAccountPlan(existingAccount.id, req.plan);
        } else {
            const accountId = nanoid();
            let maxProjects = 1;
            let accessLimit = 1200;
            let maxCompanyUsers = 5;
            if (req.plan === 'premium') {
                maxProjects = 3;
                accessLimit = 3600;
                maxCompanyUsers = 10;
            } else if (req.plan === 'enterprise') {
                maxProjects = -1;
                accessLimit = -1;
                maxCompanyUsers = 50;
            }

            // 1. Create client Account / Tenant
            state.addAccount({
                // @ts-ignore
                id: accountId,
                name: req.companyName,
                vatNumber: req.nif,
                contactEmail: cleanEmail,
                contactPhone: req.phone,
                plan: req.plan,
                maxProjects,
                accessControlLimit: accessLimit,
                maxCompanyUsers,
                subscriptionStatus: 'active',
                modules: state.modules.map(m => m.id),
            });

            // 2. Create or link Company Administrator User
            const existingUser = state.users.find(u => u.email.toLowerCase().trim() === cleanEmail);
            if (existingUser) {
                state.updateUser(existingUser.id, { accountId, role: 'admin' });
            } else {
                state.addUser({
                    name: req.contactName,
                    email: req.email,
                    phone: req.phone,
                    role: 'admin',
                    accountId: accountId,
                    password: req.password || '123456',
                    projectAccess: []
                });
            }
        }

        // 3. Mark request as approved
        state.updateSubscriptionRequest(id, {
            status: 'approved',
            reviewedBy,
            reviewedAt: new Date().toISOString()
        });
    },
    rejectSubscriptionRequest: (id, reason) => {
        get().updateSubscriptionRequest(id, {
            status: 'rejected',
            rejectionReason: reason || 'Pedido rejeitado pelo administrador.',
            reviewedAt: new Date().toISOString()
        });
    },

    updateProject: (id, updates) => set((state) => {
        dbUpdate('projects', id, updates).catch(console.error);
        return { projects: state.projects.map(p => p.id === id ? { ...p, ...updates } : p) };
    }),

    // Profiles Logic
    addCompanyProfile: (profile) => set((state) => {
        const newProfile = { ...profile, createdAt: new Date().toISOString() };
        dbInsert('company_profiles', newProfile).catch(console.error);
        return { companyProfiles: [...state.companyProfiles, newProfile] };
    }),
    updateCompanyProfile: (id, updates) => set((state) => {
        dbUpdate('company_profiles', id, updates).catch(console.error);
        return { companyProfiles: state.companyProfiles.map(p => p.id === id ? { ...p, ...updates } : p) };
    }),
    deleteCompanyProfile: (id) => set((state) => {
        dbRemove('company_profiles', id).catch(console.error);
        return { companyProfiles: state.companyProfiles.filter(p => p.id !== id) };
    }),



    addCompany: (company) => set((state) => {
        const id = company.id || nanoid();
        const project = state.projects.find(p => p.id === company.projectId);
        const profileId = company.profileId || project?.defaultCompanyProfileId || `profile_std_company_${company.projectId}`;

        // Auto-generate number if missing (based on list position)
        let companyNumber = company.number;
        if (!companyNumber) {
            const existingCount = state.companies.filter(c => c.projectId === company.projectId).length;
            companyNumber = (existingCount + 1).toString().padStart(2, '0');
        }

        const newCompany = {
            ...company,
            id,
            number: companyNumber,
            profileId,
            accountId: MOCK_ACCOUNT_ID,
            ifcActorRole: getIfcRoleFromCompanyRole(company.companyRole ?? ''),
            ifcGlobalId: company.ifcGlobalId || generateIfcGuid(),
            createdAt: new Date().toISOString()
        };
        dbInsert('companies', newCompany).catch(console.error);

        // Auto-Create CDE Folder
        if (project?.cdeConfig?.connected) {
            // Use Number if available (now always is), fallback to NIF (shouldn't happen for folders if number is enforced)
            // Requirement: "numero da empresa na lista"-"nome da empresa"
            createEntityFolder(project.cdeConfig, 'company', newCompany.name, newCompany.number, (token, expiresAt) => {
                get().updateProjectCDE(project.id, { ...project.cdeConfig!, accessToken: token, tokenExpiry: new Date(expiresAt).toISOString() });
            }).then(log => {
                const type = log.startsWith('Error') ? 'error' : 'success';
                if (log.startsWith('Error')) console.error(log);
                else console.log(log);
                // Optional: Notify user
                if (type === 'error') get().addNotification('error', `CDE: ${log}`);
            });
        }

        return { companies: [...state.companies, newCompany] };
    }),

    updateCompany: (id, updates) => set((state) => {
        const company = state.companies.find(c => c.id === id);
        if (!company) return {};

        // Determine editor role
        let editorRole = 'data_user';
        const user = state.currentUser;
        if (user?.role === 'admin' || user?.role === 'superadmin') {
            editorRole = 'manager';
        } else {
            const projectAccess = user?.projectAccess?.find(pa => pa.projectId === company.projectId);
            if (projectAccess?.role === 'manager') editorRole = 'manager';
        }

        // Calculate new fieldLastEditors
        const existingEditors = company.fieldLastEditors || {};
        const newEditors = { ...existingEditors };

        // Only track keys that are actually fields (exclude metadata like id, etc if strictly needed, but broad tracking is fine for now)
        // We only care about fields in 'updates'
        Object.keys(updates).forEach(key => {
            if (key === 'fieldLastEditors' || key === 'fieldValidations' || key === 'workflowStatus' || key === 'updatedAt') return;

            const newValue = (updates as any)[key];
            const oldValue = (company as any)[key];

            if (JSON.stringify(newValue) !== JSON.stringify(oldValue)) {
                newEditors[key] = editorRole;
            }
        });

        const finalUpdates = { ...updates, fieldLastEditors: newEditors };

        // Auto-Log Status Change
        let newWorkflowLogs = state.workflowLogs || [];
        if (updates.workflowStatus && updates.workflowStatus !== company.workflowStatus) {
            const log: WorkflowLog = {
                id: nanoid(),
                entityId: id,
                entityType: 'company',
                action: 'status_change',
                previousStatus: company.workflowStatus,
                newStatus: updates.workflowStatus,
                actorId: state.currentUser?.id,
                details: `Status changed from ${company.workflowStatus} to ${updates.workflowStatus}`,
                createdAt: new Date().toISOString()
            };
            dbInsert('workflow_logs', log).catch(console.error);
            newWorkflowLogs = [...newWorkflowLogs, log];
        }

        dbUpdate('companies', id, finalUpdates).catch(console.error);
        return {
            companies: state.companies.map(c => c.id === id ? { ...c, ...finalUpdates } : c),
            workflowLogs: newWorkflowLogs
        };
    }),

    addWorker: (worker) => set((state) => {
        const id = nanoid();
        const project = state.projects.find(p => p.id === worker.projectId);
        const profileId = worker.profileId || project?.defaultWorkerProfileId || `profile_std_worker_${worker.projectId}`;

        // Generate IfcPerson.Identification code: SF-{6-char timestamp base36}{6-char random base36}
        // Used also as the QR code content on the worker access card
        const generateSFCode = (): string => {
            const timestamp = Math.floor(Date.now() / 1000).toString(36).toUpperCase().padStart(6, '0');
            const random = Math.random().toString(36).substring(2, 8).toUpperCase().padStart(6, '0');
            return `SF-${timestamp}${random}`;
        };

        const newWorker: Worker = {
            ...worker,
            id,
            profileId,
            accountId: MOCK_ACCOUNT_ID,
            accessCardCode: worker.accessCardCode || generateSFCode(),
            ifcLaborType: getIfcTypeFromOccupation(worker.occupation ?? ''),
            ifcGlobalId: worker.ifcGlobalId || generateIfcGuid(),
            createdAt: new Date().toISOString()
        };
        dbInsert('workers', newWorker).catch(console.error);

        // Auto-Create CDE Folder
        if (project?.cdeConfig?.connected) {
            createEntityFolder(project.cdeConfig, 'worker', newWorker.name, undefined, (token, expiresAt) => {
                get().updateProjectCDE(project.id, { ...project.cdeConfig!, accessToken: token, tokenExpiry: new Date(expiresAt).toISOString() });
            }).then(log => {
                const type = log.startsWith('Error') ? 'error' : 'success';
                if (type === 'error') get().addNotification('error', `CDE: ${log}`);
            });
        }

        return { workers: [...state.workers, newWorker] };
    }),

    updateWorker: (id, updates) => set((state) => {
        const worker = state.workers.find(w => w.id === id);
        if (!worker) return {};

        let editorRole = 'data_user';
        const user = state.currentUser;
        if (user?.role === 'admin' || user?.role === 'superadmin') {
            editorRole = 'manager';
        } else {
            const projectAccess = user?.projectAccess?.find(pa => pa.projectId === worker.projectId);
            if (projectAccess?.role === 'manager') editorRole = 'manager';
        }

        const newEditors = { ...(worker.fieldLastEditors || {}) };
        Object.keys(updates).forEach(key => {
            if (key === 'fieldLastEditors' || key === 'fieldValidations' || key === 'workflowStatus' || key === 'updatedAt') return;

            const newValue = (updates as any)[key];
            const oldValue = (worker as any)[key];

            if (JSON.stringify(newValue) !== JSON.stringify(oldValue)) {
                newEditors[key] = editorRole;
            }
        });

        const finalUpdates = { ...updates, fieldLastEditors: newEditors };

        dbUpdate('workers', id, finalUpdates).catch(console.error);
        return { workers: state.workers.map(w => w.id === id ? { ...w, ...finalUpdates } : w) };
    }),

    addEquipment: (equipment) => set((state) => {
        const id = nanoid();
        const project = state.projects.find(p => p.id === equipment.projectId);
        const profileId = equipment.profileId || project?.defaultEquipmentProfileId || `profile_std_equipment_${equipment.projectId}`;

        const newEquipment: Equipment = {
            ...equipment,
            id,
            profileId,
            accountId: MOCK_ACCOUNT_ID,
            type: getEquipmentTypeLabel(equipment.equipmentType ?? ''),
            ifcElementType: getIfcTypeFromEquipment(equipment.equipmentType ?? ''),
            ifcGlobalId: equipment.ifcGlobalId || generateIfcGuid(),
            createdAt: new Date().toISOString()
        };
        dbInsert('equipment', newEquipment).catch(console.error);

        // Auto-Create CDE Folder
        if (project?.cdeConfig?.connected) {
            createEntityFolder(project.cdeConfig, 'equipment', newEquipment.name).then(log => console.log(log));
        }

        return { equipment: [...state.equipment, newEquipment] };
    }),

    updateEquipment: (id, updates) => set((state) => {
        const eq = state.equipment.find(e => e.id === id);
        if (!eq) return {};

        let editorRole = 'data_user';
        const user = state.currentUser;
        if (user?.role === 'admin' || user?.role === 'superadmin') {
            editorRole = 'manager';
        } else {
            const projectAccess = user?.projectAccess?.find(pa => pa.projectId === eq.projectId);
            if (projectAccess?.role === 'manager') editorRole = 'manager';
        }

        const newEditors = { ...(eq.fieldLastEditors || {}) };
        Object.keys(updates).forEach(key => {
            if (key === 'fieldLastEditors' || key === 'fieldValidations' || key === 'workflowStatus' || key === 'updatedAt') return;

            const newValue = (updates as any)[key];
            const oldValue = (eq as any)[key];

            if (JSON.stringify(newValue) !== JSON.stringify(oldValue)) {
                newEditors[key] = editorRole;
            }
        });

        const finalUpdates = { ...updates, fieldLastEditors: newEditors };

        dbUpdate('equipment', id, finalUpdates).catch(console.error);
        return { equipment: state.equipment.map(e => e.id === id ? { ...e, ...finalUpdates } : e) };
    }),

    submitEquipment: (id) => set((state) => ({
        equipment: state.equipment.map(e => e.id === id ? { ...e, workflowStatus: 'validation_pending' } : e)
    })),

    validateEquipment: (id) => set((state) => ({
        equipment: state.equipment.map(e => e.id === id ? { ...e, workflowStatus: 'validated', missingElements: [] } : e)
    })),

    requestEquipmentElements: (id, missingFields) => set((state) => {
        const updatedTickets = state.tickets.map(t =>
            (t.entityId === id && t.isDraft) ? { ...t, isDraft: false, status: 'open' as const, updatedAt: new Date().toISOString() } : t
        );
        return {
            equipment: state.equipment.map(e => e.id === id ? { ...e, workflowStatus: 'incomplete', missingElements: missingFields } : e),
            tickets: updatedTickets
        }
    }),

    toggleEquipmentFieldValidation: (id, field, isValid) => set((state) => ({
        equipment: state.equipment.map(e => {
            if (e.id !== id) return e;
            return {
                ...e,
                fieldValidations: { ...(e.fieldValidations || {}), [field]: isValid }
            };
        })
    })),

    deleteUser: (userId: string) => set((state) => {
        dbRemove('users', userId).catch(console.error);
        return { users: state.users.filter(u => u.id !== userId) };
    }),

    suspendUser: async (userId: string, reason?: string) => {
        try {
            const res = await fetch('/api/platform/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'suspend', userId, reason }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                const now = new Date().toISOString();
                set((state) => ({
                    users: state.users.map(u => u.id === userId ? {
                        ...u,
                        status: 'suspended',
                        suspendedAt: now,
                        suspensionReason: reason || 'Suspensão temporária por decisão administrativa.'
                    } : u)
                }));
                get().addNotification('info', 'Utilizador suspenso temporariamente com sucesso.');
                return { success: true };
            }
            return { success: false, message: data.error };
        } catch (e: any) {
            const now = new Date().toISOString();
            set((state) => ({
                users: state.users.map(u => u.id === userId ? {
                    ...u,
                    status: 'suspended',
                    suspendedAt: now,
                    suspensionReason: reason || 'Suspensão temporária.'
                } : u)
            }));
            return { success: true };
        }
    },

    reactivateUser: async (userId: string) => {
        try {
            const res = await fetch('/api/platform/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reactivate', userId }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                set((state) => ({
                    users: state.users.map(u => u.id === userId ? {
                        ...u,
                        status: 'active',
                        suspendedAt: undefined,
                        suspensionReason: undefined
                    } : u)
                }));
                get().addNotification('success', 'Acesso do utilizador reativado com sucesso.');
                return { success: true };
            }
            return { success: false, message: data.error };
        } catch (e: any) {
            set((state) => ({
                users: state.users.map(u => u.id === userId ? {
                    ...u,
                    status: 'active',
                    suspendedAt: undefined,
                    suspensionReason: undefined
                } : u)
            }));
            return { success: true };
        }
    },

    deleteUserGdpr: async (userId: string, mode: 'anonymize' | 'purge' = 'anonymize', reason?: string) => {
        try {
            const res = await fetch(`/api/platform/users?userId=${encodeURIComponent(userId)}&mode=${mode}&reason=${encodeURIComponent(reason || '')}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            if (res.ok && data.success) {
                // Sincronizar remoção automática de conta órfã se o utilizador era o único membro
                if (data.deletedAccountId) {
                    set((state) => ({
                        accounts: state.accounts.filter(a => a.id !== data.deletedAccountId)
                    }));
                    dbRemove('accounts', data.deletedAccountId).catch(console.error);
                }

                if (mode === 'purge') {
                    set((state) => ({
                        users: state.users.filter(u => u.id !== userId)
                    }));
                    dbRemove('users', userId).catch(console.error);
                } else {
                    const now = new Date().toISOString();
                    const anonEmail = `anonimizado_${userId.substring(0, 8)}@rgpd.safe`;
                    set((state) => ({
                        users: state.users.map(u => u.id === userId ? {
                            ...u,
                            name: 'Utilizador Removido (RGPD)',
                            email: anonEmail,
                            password: '',
                            status: 'deleted',
                            deletedAt: now,
                            suspensionReason: reason,
                            gdprAnonymized: true,
                            projectAccess: []
                        } : u)
                    }));
                }
                get().addNotification('success', data.message || (mode === 'purge' ? 'Utilizador eliminado definitivamente.' : 'Dados do utilizador anonimizados ao abrigo do RGPD.'));
                return { success: true };
            }
            const errMsg = data.error || 'Não foi possível eliminar o utilizador.';
            get().addNotification('error', errMsg);
            return { success: false, message: errMsg };
        } catch (e: any) {
            set((state) => ({
                users: state.users.filter(u => u.id !== userId)
            }));
            dbRemove('users', userId).catch(console.error);
            return { success: true };
        }
    },

    cleanupInactiveUsers: async (thresholdDays: number, mode: 'suspend' | 'anonymize' = 'suspend') => {
        try {
            const res = await fetch('/api/platform/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'cleanup_inactive', thresholdDays, cleanupMode: mode }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                // Sincronizar contas órfãs eliminadas no servidor
                if (Array.isArray(data.deletedTenantIds) && data.deletedTenantIds.length > 0) {
                    const deletedSet = new Set(data.deletedTenantIds);
                    set((state) => ({
                        accounts: state.accounts.filter(a => !deletedSet.has(a.id))
                    }));
                    for (const tid of data.deletedTenantIds) {
                        dbRemove('accounts', tid).catch(console.error);
                    }
                }
                await get().syncFromServer();
                get().addNotification('info', data.message || 'Limpeza por inatividade concluída.');
                return { success: true, count: data.count || 0, message: data.message };
            }
            const errMsg = data.error || 'Erro ao executar limpeza.';
            get().addNotification('error', errMsg);
            return { success: false, count: 0, message: errMsg };
        } catch (e: any) {
            const errMsg = e?.message || 'Falha na comunicação com o servidor.';
            get().addNotification('error', errMsg);
            return { success: false, count: 0, message: errMsg };
        }
    },

    getProjectResources: (projectId: string) => {
        const state = get();
        const currentUser = state.currentUser;

        // Check if current user is restricted to a company in this project
        const projectAccess = currentUser?.projectAccess?.find(pa => pa.projectId === projectId);
        const isDataUser = projectAccess?.role === 'data_user';
        const restrictedCompanyIds = isDataUser ? projectAccess.companyIds : null;

        return {
            companies: state.companies.filter(c => {
                const matchProject = c.projectId === projectId || !c.projectId;
                if (!matchProject) return false;
                // If restricted, only show own company
                if (isDataUser) {
                    if (!restrictedCompanyIds || restrictedCompanyIds.length === 0) return false;
                    return restrictedCompanyIds.includes(c.id);
                }
                return true;
            }),
            workers: state.workers.filter(w => {
                const matchProject = w.projectId === projectId;
                if (!matchProject) return false;
                // If restricted, only show own workers
                if (isDataUser) {
                    if (!restrictedCompanyIds || restrictedCompanyIds.length === 0) return false;
                    return restrictedCompanyIds.includes(w.companyId);
                }
                return true;
            }),
            equipment: state.equipment.filter(e => {
                const matchProject = e.projectId === projectId;
                if (!matchProject) return false;
                // If restricted, only show own equipment
                if (isDataUser) {
                    if (!restrictedCompanyIds || restrictedCompanyIds.length === 0) return false;
                    return restrictedCompanyIds.includes(e.companyId);
                }
                return true;
            }),
        };
    },



    addProjectRequest: (userId, projectId, companyId, companyName, nif) => set((state) => {
        const user = state.users.find(u => u.id === userId) || state.currentUser;
        const proj = state.projects.find(p => p.id === projectId);
        const comp = companyId ? state.companies.find(c => c.id === companyId) : undefined;
        const newReq: ProjectRequest = {
            id: nanoid(),
            userId,
            userName: user?.name,
            userEmail: user?.email,
            projectId,
            projectName: proj?.name,
            companyId,
            companyName: companyName || comp?.name,
            nif: nif || comp?.nif,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        dbInsert('project_requests', newReq).catch(() => {});
        fetch('/api/platform/projects/requests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newReq)
        }).catch(() => {});
        return {
            projectRequests: [newReq, ...state.projectRequests]
        };
    }),

    resolveProjectRequest: (requestId, status, role = 'data_user') => set((state) => {
        const req = state.projectRequests.find(r => r.id === requestId);
        if (!req || req.status !== 'pending') return state; // No op

        let newUsers = state.users;
        let updatedCurrentUser = state.currentUser;
        let updatedCompanies = state.companies;

        if (status === 'approved') {
            let targetCompanyId = req.companyId;

            // Se o NIF ou nome da empresa foi fornecido mas a empresa ainda não constava na obra
            if (!targetCompanyId && (req.companyName || req.nif)) {
                const existingComp = state.companies.find(c =>
                    c.projectId === req.projectId &&
                    ((req.nif && c.nif === req.nif) || (req.companyName && c.name.toLowerCase() === req.companyName.toLowerCase()))
                );

                if (existingComp) {
                    targetCompanyId = existingComp.id;
                } else {
                    const newCompId = nanoid();
                    const newComp: Company = {
                        id: newCompId,
                        name: req.companyName || 'Subempreiteiro',
                        nif: req.nif || '999999990',
                        email: req.userEmail || '',
                        accountId: state.projects.find(p => p.id === req.projectId)?.accountId || state.currentUser?.accountId || 'default',
                        projectId: req.projectId,
                        companyRole: 'subempreiteiro',
                        tier: 2,
                        createdAt: new Date().toISOString(),
                    };
                    updatedCompanies = [...state.companies, newComp];
                    dbInsert('companies', newComp).catch(console.error);
                    targetCompanyId = newCompId;
                }
            }

            // Grant Access with requested company linked
            newUsers = state.users.map(u => {
                if (u.id !== req.userId) return u;
                const existing = u.projectAccess?.find(pa => pa.projectId === req.projectId);
                if (existing) return u; // Already has access
                const newAccess = {
                    projectId: req.projectId,
                    role: (role || 'data_user') as ProjectRole,
                    allowedModules: MOCK_MODULES.map(m => m.id),
                    companyIds: targetCompanyId ? [targetCompanyId] : undefined
                };

                executeQuery(`INSERT OR REPLACE INTO project_members (id, project_id, user_id, role, allowed_modules, company_id) VALUES (?, ?, ?, ?, ?, ?)`,
                    [nanoid(), req.projectId, req.userId, newAccess.role, JSON.stringify(newAccess.allowedModules), targetCompanyId ? JSON.stringify([targetCompanyId]) : null]
                ).catch(console.error);

                const updatedUser = {
                    ...u,
                    projectAccess: [...(u.projectAccess || []), newAccess]
                };
                if (state.currentUser?.id === u.id) {
                    updatedCurrentUser = updatedUser;
                }
                return updatedUser;
            });
        }

        dbUpdate('project_requests', requestId, { status }).catch(() => {});
        fetch('/api/platform/projects/requests', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId, status, role })
        }).catch(() => {});

        return {
            companies: updatedCompanies,
            users: newUsers,
            currentUser: updatedCurrentUser,
            projectRequests: state.projectRequests.map(r => r.id === requestId ? { ...r, status } : r)
        };
    }),

    changeAccountPlan: (accountId, newPlan) => set((state) => {
        let maxProjects = 0;
        let accessLimit = 600;
        let maxCompanyUsers = 1;

        if (newPlan === 'basic') {
            maxProjects = 1;
            accessLimit = 1200;
            maxCompanyUsers = 5;
        } else if (newPlan === 'premium') {
            maxProjects = 3;
            accessLimit = 3600;
            maxCompanyUsers = 10;
        } else if (newPlan === 'enterprise') {
            maxProjects = -1;
            accessLimit = -1;
            maxCompanyUsers = 50;
        }

        const updates = {
            plan: newPlan,
            maxProjects,
            accessControlLimit: accessLimit,
            maxCompanyUsers,
            subscriptionStatus: 'active' as const
        };

        dbUpdate('accounts', accountId, updates).catch(() => {});

        // Sincronizar alteração com o PostgreSQL no servidor
        fetch('/api/platform/clients', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountId, plan: newPlan }),
        }).catch(() => {});

        return {
            accounts: state.accounts.map(a => a.id === accountId ? { ...a, ...updates } : a)
        };
    }),

    associateCompanyUser: (companyAccountId, userEmail, userName) => {
        const state = get();
        const account = state.accounts.find(a => a.id === companyAccountId);
        if (!account) return { success: false, message: 'Conta de empresa não encontrada.' };

        const plan = account.plan;
        let maxUsers = 1;
        if (plan === 'basic') maxUsers = 5;
        else if (plan === 'premium') maxUsers = 10;
        else if (plan === 'enterprise') maxUsers = 50;

        const currentMembers = state.users.filter(u => u.accountId === companyAccountId);
        if (currentMembers.length >= maxUsers) {
            return {
                success: false,
                message: `Limite de utilizadores atingido (${currentMembers.length}/${maxUsers}) para o plano ${plan.toUpperCase()}. Faça upgrade para associar mais membros.`
            };
        }

        const cleanEmail = userEmail.trim().toLowerCase();
        const targetUser = state.users.find(u => u.email.trim().toLowerCase() === cleanEmail);

        if (targetUser) {
            dbUpdate('users', targetUser.id, { accountId: companyAccountId }).catch(() => {});
            set((s) => ({
                users: s.users.map(u => u.id === targetUser.id ? { ...u, accountId: companyAccountId } : u)
            }));
            return { success: true, message: `Utilizador ${targetUser.name} associado com sucesso à sua empresa!` };
        } else {
            const newUser: User = {
                id: nanoid(),
                email: cleanEmail,
                name: userName || cleanEmail.split('@')[0],
                role: 'user',
                accountId: companyAccountId,
                createdAt: new Date().toISOString()
            };
            dbInsert('users', newUser).catch(() => {});
            set((s) => ({
                users: [...s.users, newUser]
            }));
            return { success: true, message: `Convite registado e utilizador ${newUser.name} associado à sua empresa!` };
        }
    },

    addCompanyRequest: (userId, companyId, projectId, updates) => set((state) => ({
        companyRequests: [...state.companyRequests, {
            id: nanoid(),
            userId,
            companyId,
            projectId,
            updates,
            status: 'pending',
            createdAt: new Date().toISOString()
        }]
    })),

    resolveCompanyRequest: (requestId, status) => set((state) => {
        const req = state.companyRequests.find(r => r.id === requestId);
        if (!req || req.status !== 'pending') return state;

        let newCompanies = state.companies;
        if (status === 'approved') {
            newCompanies = state.companies.map(c => {
                if (c.id !== req.companyId) return c;
                return { ...c, ...req.updates };
            });
        }

        return {
            companies: newCompanies,
            companyRequests: state.companyRequests.map(r => r.id === requestId ? { ...r, status } : r)
        };
    }),

    addTemplate: (template) => set((state) => ({
        templates: [...state.templates, { ...template, id: nanoid(), createdAt: new Date().toISOString() }]
    })),



    updateTemplate: (id, updates) => set((state) => ({
        templates: state.templates.map(t => t.id === id ? { ...t, ...updates } : t)
    })),

    deleteTemplate: (id) => set((state) => ({
        templates: state.templates.filter(t => t.id !== id)
    })),

    // Training
    addTraining: (training) => set((state) => {
        const id = nanoid();
        const newTraining = { ...training, id, createdAt: new Date().toISOString() };
        dbInsert('trainings', newTraining).catch(console.error);
        return { trainings: [...state.trainings, newTraining] };
    }),
    updateTraining: (id, updates) => set((state) => {
        dbUpdate('trainings', id, updates).catch(console.error);
        return { trainings: state.trainings.map(t => t.id === id ? { ...t, ...updates } : t) };
    }),
    deleteTraining: (id) => set((state) => {
        dbRemove('trainings', id).catch(console.error);
        return { trainings: state.trainings.filter(t => t.id !== id) };
    }),

    // Accidents & Risk Assessments
    addAccident: (accident) => set((state) => {
        const id = nanoid();
        const newAcc = { ...accident, id, createdAt: new Date().toISOString() };
        dbInsert('accidents', newAcc).catch(console.error);
        return { accidents: [...state.accidents, newAcc] };
    }),
    updateAccident: (id, updates) => set((state) => {
        dbUpdate('accidents', id, updates).catch(console.error);
        return { accidents: state.accidents.map(a => a.id === id ? { ...a, ...updates } : a) };
    }),
    deleteAccident: (id) => set((state) => {
        dbRemove('accidents', id).catch(console.error);
        return { accidents: state.accidents.filter(a => a.id !== id) };
    }),

    addRiskAssessment: (risk) => set((state) => {
        const id = nanoid();
        const newRisk = { ...risk, id, createdAt: new Date().toISOString() };
        dbInsert('risk_assessments', newRisk).catch(console.error);
        return { riskAssessments: [...state.riskAssessments, newRisk] };
    }),
    updateRiskAssessment: (id, updates) => set((state) => {
        dbUpdate('risk_assessments', id, updates).catch(console.error);
        return { riskAssessments: state.riskAssessments.map(r => r.id === id ? { ...r, ...updates } : r) };
    }),
    deleteRiskAssessment: (id) => set((state) => {
        dbRemove('risk_assessments', id).catch(console.error);
        return { riskAssessments: state.riskAssessments.filter(r => r.id !== id) };
    }),

    // Documents
    addDocument: (doc) => set((state) => {
        const id = nanoid();

        // Versioning Logic
        let newVersion = 1;

        // If category is provided, check for existing versions
        let updatedDocuments = state.documents;

        if (doc.category && doc.category !== 'general') { // General docs might not need versioning or unique constraint? Assuming unique per category for fields.
            const existingDocs = state.documents.filter(d =>
                d.entityId === doc.entityId &&
                d.category === doc.category &&
                !d.archived
            );

            if (existingDocs.length > 0) {
                // Find max version
                const maxVersion = Math.max(...existingDocs.map(d => d.version || 1));
                newVersion = maxVersion + 1;

                // Archive existing
                updatedDocuments = state.documents.map(d => {
                    if (d.entityId === doc.entityId && d.category === doc.category && !d.archived) {
                        // Persist Archive Status
                        dbUpdate('documents', d.id, { archived: true })
                            .then(() => console.log(`[Store] Archived previous version: ${d.id}`))
                            .catch(err => console.error(`[Store] Failed to archive document ${d.id}:`, err));

                        return { ...d, archived: true };
                    }
                    return d;
                });
            }
        }

        const newDoc = {
            ...doc,
            id,
            version: newVersion,
            createdAt: new Date().toISOString()
        };

        dbInsert('documents', newDoc)
            .then(() => console.log('[Store] Document persisted to DB:', id))
            .catch(err => console.error('[Store] Failed to persist document:', err));
        return { documents: [...updatedDocuments, newDoc] };
    }),
    updateDocument: (id, updates) => set((state) => {
        dbUpdate('documents', id, updates).catch(console.error);
        return { documents: state.documents.map(d => d.id === id ? { ...d, ...updates } : d) };
    }),
    unarchiveDocument: (id) => set((state) => {
        const doc = state.documents.find(d => d.id === id);
        if (!doc) return {};
        // Set archived = false
        // Update version? Usually restore keeps version or increments?
        // User request: "reverte a dimensão... reverte o ficheiro anterior". 
        // If we just unarchive, it becomes active.
        dbUpdate('documents', id, { archived: false }).catch(console.error);
        return { documents: state.documents.map(d => d.id === id ? { ...d, archived: false } : d) };
    }),
    deleteDocument: (id) => set((state) => {
        const docToDelete = state.documents.find(d => d.id === id);

        dbRemove('documents', id).catch(console.error);

        if (docToDelete && !docToDelete.archived && docToDelete.version && docToDelete.version > 1) {
            // Find the previous version to rollback
            const previousVersion = state.documents.find(d =>
                d.entityId === docToDelete.entityId &&
                d.category === docToDelete.category &&
                d.archived &&
                d.version === docToDelete.version! - 1
            );

            if (previousVersion) {
                console.log(`[Store] Rolling back document: ${previousVersion.id} to active state`);
                dbUpdate('documents', previousVersion.id, { archived: false }).catch(console.error);
                return {
                    documents: state.documents.filter(d => d.id !== id).map(d =>
                        d.id === previousVersion.id ? { ...d, archived: false } : d
                    )
                };
            }
        }

        return { documents: state.documents.filter(d => d.id !== id) };
    }),
    getDocumentsByEntity: (entityId) => {
        return get().documents.filter(d => d.entityId === entityId);
    },
    getDocumentsByProject: (projectId) => {
        // In a real backend, we'd query by projectId directly.
        // For local state associated with companies/workers of a project:
        const state = get();
        // Get all company IDs in this project
        const companyIds = state.companies.filter(c => c.projectId === projectId || !c.projectId).map(c => c.id);
        const workerIds = state.workers.filter(w => w.projectId === projectId).map(w => w.id);
        const equipIds = state.equipment.filter(e => e.projectId === projectId).map(e => e.id);

        const allEntityIds = [...companyIds, ...workerIds, ...equipIds];

        return state.documents.filter(d => allEntityIds.includes(d.entityId));
    },

    updateProjectCDE: (projectId: string, config: any) => set((state) => {
        dbUpdate('projects', projectId, { cdeConfig: config }).catch(console.error);
        return { projects: state.projects.map(p => p.id === projectId ? { ...p, cdeConfig: config } : p) };
    }),


    updateCompanyStatus: (id, status) => set((state) => {
        const company = state.companies.find(c => c.id === id);
        const project = state.projects.find(p => p.id === company?.projectId);
        const companyName = company ? company.name : 'Company';
        const previousStatus = company?.workflowStatus;



        // Simulation: Email Notification
        const allCcs = [...(project?.workflowCcList || []), ...(company?.workflowNotificationCcs || [])];
        if (company) {
            console.log(`[EMAIL SERVICE] Status Update for Company '${company.name}': ${status}`);

            // Specific Workflow Notifications
            if (status === 'validation_pending') {
                // Find Managers
                const managers = state.users.filter(u =>
                    u.role === 'admin' ||
                    u.role === 'superadmin' ||
                    u.projectAccess?.some(pa => pa.projectId === company.projectId && pa.role === 'manager')
                );
                const managerEmails = managers.map(u => u.email).join(', ');
                console.log(`[EMAIL SERVICE] To Managers (${managerEmails}): Company '${company.name}' is pending validation.`);
            } else if (status === 'validated') {
                const assignedUser = state.users.find(u => u.id === company.assignedDataUserId);
                if (assignedUser) {
                    console.log(`[EMAIL SERVICE] To Assigned User (${assignedUser.email}): Company '${company.name}' has been VALIDATED.`);
                }
            } else if (status === 'data_requested') {
                const assignedUser = state.users.find(u => u.id === company.assignedDataUserId);
                if (assignedUser) {
                    console.log(`[EMAIL SERVICE] To Assigned User (${assignedUser.email}): Data requested for Company '${company.name}'.`);
                }
            }

            if (allCcs.length) {
                console.log(`[EMAIL SERVICE] CC: ${Array.from(new Set(allCcs)).join(', ')}`);
            }
        }

        const log: WorkflowLog = {
            id: nanoid(),
            entityId: id,
            entityType: 'company',
            action: 'status_change',
            previousStatus: company?.workflowStatus,
            newStatus: status,
            actorId: state.currentUser?.id,
            details: `Status changed from ${company?.workflowStatus} to ${status}`,
            createdAt: new Date().toISOString()
        };
        dbInsert('workflow_logs', log).catch(console.error);

        return {
            companies: state.companies.map(c => c.id === id ? { ...c, workflowStatus: status } : c),
            notifications: [...state.notifications, {
                id: nanoid(),
                type: 'info',
                message: `Company '${companyName}' status updated to ${status ? status.replace('_', ' ') : 'new status'}`,
                read: false,
                createdAt: new Date().toISOString()
            }],
            workflowLogs: [...(state.workflowLogs || []), log]
        };
    }),

    addWorkflowLog: (log: Omit<WorkflowLog, 'id' | 'createdAt'>) => set((state) => {
        const id = nanoid();
        const newLog = { ...log, id, createdAt: new Date().toISOString() };
        dbInsert('workflow_logs', newLog).catch(console.error);
        return { workflowLogs: [...(state.workflowLogs || []), newLog] };
    }),

    archiveCompany: (id: string) => set((state) => {
        // Persist archived = true to SQLite so it survives logout/login
        dbUpdate('companies', id, { archived: true }).catch(console.error);
        // Close any open tickets for this company so it has no activity
        const closedTickets = state.tickets.map(t =>
            t.entityId === id && t.status === 'open'
                ? { ...t, status: 'closed' as const, updatedAt: new Date().toISOString() }
                : t
        );
        closedTickets
            .filter(t => t.entityId === id && t.status === 'closed')
            .forEach(t => dbUpdate('tickets', t.id, { status: 'closed' }).catch(console.error));
        return {
            companies: state.companies.map(c => c.id === id ? { ...c, archived: true } : c),
            tickets: closedTickets,
        };
    }),

    restoreCompany: (id: string) => set((state) => {
        dbUpdate('companies', id, { archived: false }).catch(console.error);
        return {
            companies: state.companies.map(c => c.id === id ? { ...c, archived: false } : c),
        };
    }),

    checkCompanyExpirations: () => set((state) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Compare dates without time
        const updates: { id: string, name: string, expired: string[] }[] = [];

        const newCompanies = state.companies.map(c => {
            if (c.archived) return c; // Skip archived companies — no activity
            if (c.workflowStatus !== 'validated' && c.workflowStatus !== 'validation_pending') return c; // Only respond for active flows? Or all? User said "Sempre que um campo de data é ultrapassado" -> usually for valid ones to invalidate them.

            const expiredFields: string[] = [];
            const check = (dateStr: string | undefined, label: string) => {
                if (dateStr && new Date(dateStr) < today) {
                    expiredFields.push(label);
                }
            };

            check(c.insuranceCivilDate, 'Seg. Resp. Civil');
            check(c.insuranceWorkAccDate, 'Seg. Acid. Trabalho');
            check(c.cleanSSDate, 'N/ Dívida SS');
            check(c.cleanFinDate, 'N/ Dívida Finanças');

            // If expired, revert to data_requested
            if (expiredFields.length > 0) {
                updates.push({ id: c.id, name: c.name, expired: expiredFields });
                return { ...c, workflowStatus: 'data_requested' as const };
            }
            return c;
        });

        if (updates.length > 0) {
            updates.forEach(u => {
                console.log(`[EMAIL SERVICE] EXPIRATION WARNING: Company '${u.name}' has expired documents: ${u.expired.join(', ')}. Status set to Data Requested.`);
            });

            const newNotifications = updates.map(u => ({
                id: nanoid(),
                type: 'warning' as const,
                message: `Company '${u.name}' documents expired: ${u.expired.join(', ')}`,
                read: false,
                createdAt: new Date().toISOString()
            }));

            return { companies: newCompanies, notifications: [...state.notifications, ...newNotifications] };
        }

        return {};
    }),

    checkExpirations: () => {
        set((state) => {
            // Compute today's date in the project's configured timezone (first project found)
            // Defaults to the machine's local timezone if not configured
            const projectTimezone = state.projects?.[0]?.expiryTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
            const now = new Date();
            const todayStr = new Intl.DateTimeFormat('en-CA', {
                timeZone: projectTimezone,
                year: 'numeric', month: '2-digit', day: '2-digit'
            }).format(now); // en-CA gives "YYYY-MM-DD" format
            let newTickets = [...state.tickets];
            let newCompanies = [...state.companies];
            let newWorkers = [...state.workers];
            let newEquipment = [...state.equipment];
            let newLogs = [...state.workflowLogs];
            let newNotifications = [...state.notifications];
            let changesMade = false;

            const processEntity = (entity: any, type: 'company' | 'worker' | 'equipment', profiles: any[]) => {
                // === ARCHIVED GUARD ===
                // Archived entities have no activity — skip all expiry processing
                if (entity.archived) return;

                // === WORKFLOW STATUS GUARD ===
                // Expiry tickets may only be generated after the entity has been fully validated (or approved)
                // to avoid disturbing companies/workers/equipment that haven't completed their workflow yet.
                const entityProject = state.projects.find((p: any) => p.id === entity.projectId);
                const hasApprovalFlow = entityProject?.approvalWorkflow?.[type === 'company' ? 'companies' : type === 'worker' ? 'workers' : 'equipment'] === true;

                // Statuses that mean the entity has completed its validation phase:
                //   Without approval workflow: 'validated', 'approval_pending' (transitional), 'approval_data_update', 'approved'
                //   With approval workflow: only 'approved' (validation alone is not the final step)
                const validatedStatuses = hasApprovalFlow
                    ? ['approved']
                    : ['validated', 'approval_pending', 'approval_data_update', 'approved'];

                if (!validatedStatuses.includes(entity.workflowStatus)) return; // Entity not yet validated — skip expiry check

                const profile = profiles.find(p => p.id === entity.profileId);
                if (!profile || !profile.customDocuments) return;

                const activeExpirationFields = profile.customDocuments.filter((doc: any) => doc.isExpirationDate);
                if (activeExpirationFields.length === 0) return;

                let entityNeedsUpdate = false;
                const expiredNames: string[] = [];

                for (const field of activeExpirationFields) {
                    const rawFieldValue = entity.customDocuments?.[field.id];
                    if (!rawFieldValue) continue;

                    // Compute effective expiry date considering field type and toleranceDays
                    // Rules:
                    //   date: expires the day AFTER the field date (+ toleranceDays)
                    //   month (YYYY-MM): expires on the 1st of the NEXT month (+ toleranceDays)
                    const expiryDate = (() => {
                        if (field.dataType === 'month') {
                            const parts = (rawFieldValue as string).split('-').map(Number);
                            if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
                            return new Date(parts[0], parts[1], 1);
                        } else {
                            const d = new Date(rawFieldValue as string);
                            if (isNaN(d.getTime())) return null;
                            d.setDate(d.getDate() + 1);
                            return d;
                        }
                    })();

                    if (!expiryDate || isNaN(expiryDate.getTime())) continue;

                    // Apply tolerance (extra days from profile definition)
                    const tolerance = field.toleranceDays ?? 0;
                    if (tolerance > 0) {
                        expiryDate.setDate(expiryDate.getDate() + tolerance);
                    }

                    const expiryStr = expiryDate.toISOString().split('T')[0];
                    const fieldValue = rawFieldValue; // keep original for messages

                    // Check if expired (effective expiry date is before or on today)
                    if (expiryStr <= todayStr) {
                        // Expired! Check if there's already an open ticket for this exact field.
                        const existingTicket = newTickets.find(t =>
                            t.entityId === entity.id &&
                            t.type === 'field_review' &&
                            t.fieldId === field.id &&
                            t.status !== 'resolved' &&
                            t.status !== 'closed'
                        );

                        if (!existingTicket) {
                            expiredNames.push(field.name);

                            // Find data user for assignment
                            let assignedTo: string | undefined = undefined;
                            if (type === 'company') {
                                assignedTo = state.getCompanyDataUser(entity.id)?.id;
                            } else {
                                const parentCompany = state.companies.find(c => c.id === entity.companyId);
                                if (parentCompany) {
                                    assignedTo = state.getCompanyDataUser(parentCompany.id)?.id;
                                }
                            }

                            const newTicket = {
                                id: nanoid(),
                                projectId: entity.projectId,
                                entityId: entity.id,
                                type: 'field_review' as const,
                                fieldId: field.id,
                                title: `Documento Expirado: ${field.name}`,
                                description: `O documento "${field.name}" expirou a ${fieldValue}. Por favor, atualize-o com um novo documento válido.`,
                                status: 'open' as const,
                                priority: 'high' as const,
                                createdBy: 'system',
                                assignedTo,
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString()
                            };

                            dbInsert('tickets', newTicket).catch(console.error);
                            newTickets.push(newTicket);
                            entityNeedsUpdate = true;

                            // Clear field validation so the field becomes unvalidated when it expires
                            if (!entity.fieldValidations) entity.fieldValidations = {};
                            entity.fieldValidations[`custom_${field.id}`] = false;
                            entity.fieldValidations[field.id] = false;
                        }
                    }
                }

                // Standard Company fields expiration logic — same workflow status guard applies
                if (type === 'company') {
                    // Map of standard doc ID → { entityField, fieldName, isMonth, defaultExpiry }
                    const STANDARD_DOC_MAP: Record<string, { entityField: string; fieldName: string; isMonth?: boolean; defaultExpiry: boolean }> = {
                        insurance_at: { entityField: 'insuranceWorkAccDate', fieldName: 'Seg. Acid. Trabalho', defaultExpiry: true },
                        insurance_rc: { entityField: 'insuranceCivilDate', fieldName: 'Seg. Resp. Civil', defaultExpiry: true },
                        finance_ss: { entityField: 'cleanSSDate', fieldName: 'N/ Dívida SS', defaultExpiry: true },
                        finance_fin: { entityField: 'cleanFinDate', fieldName: 'N/ Dívida Finanças', defaultExpiry: true },
                        ss_discount: { entityField: 'ssDiscountSheet', fieldName: 'Folha Desc. SS', defaultExpiry: true, isMonth: true },
                        pss_acceptance: { entityField: 'pssAcceptanceDate', fieldName: 'Accept. PSS', defaultExpiry: false },
                    };

                    const checkStandardCompanyField = (dateValue: string | undefined, fieldId: string, fieldName: string, isMonth = false, toleranceDays = 0) => {
                        if (!dateValue) return;
                        const expiryDate = (() => {
                            if (isMonth) {
                                const parts = dateValue.split('-').map(Number);
                                if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
                                return new Date(parts[0], parts[1], 1); // first day of next month
                            } else {
                                const d = new Date(dateValue);
                                if (isNaN(d.getTime())) return null;
                                d.setDate(d.getDate() + 1);
                                return d;
                            }
                        })();
                        if (!expiryDate || isNaN(expiryDate.getTime())) return;

                        // Apply tolerance
                        if (toleranceDays > 0) expiryDate.setDate(expiryDate.getDate() + toleranceDays);

                        const expiryStr = expiryDate.toISOString().split('T')[0];
                        if (expiryStr <= todayStr) {
                            const existingTicket = newTickets.find(t =>
                                t.entityId === entity.id &&
                                t.type === 'field_review' &&
                                t.fieldId === fieldId &&
                                t.status !== 'resolved' &&
                                t.status !== 'closed'
                            );

                            if (!existingTicket) {
                                expiredNames.push(fieldName);
                                const assignedTo = state.getCompanyDataUser(entity.id)?.id;

                                const newTicket: Ticket = {
                                    id: nanoid(),
                                    projectId: entity.projectId || 'proj_1',
                                    entityId: entity.id,
                                    type: 'field_review',
                                    fieldId: fieldId,
                                    title: `Documento Expirado: ${fieldName}`,
                                    description: `O documento "${fieldName}" expirou a ${dateValue}. Por favor, atualize-o com um novo documento válido.`,
                                    status: 'open',
                                    priority: 'high',
                                    createdBy: 'system',
                                    assignedTo,
                                    createdAt: new Date().toISOString(),
                                    updatedAt: new Date().toISOString()
                                };

                                dbInsert('tickets', newTicket).catch(console.error);
                                newTickets.push(newTicket);
                                entityNeedsUpdate = true;

                                // Clean validations
                                if (entity.fieldValidations) {
                                    entity.fieldValidations[fieldId] = false;
                                }
                            }
                        }
                    };

                    // Process each standard field using profile config (or defaults)
                    Object.entries(STANDARD_DOC_MAP).forEach(([docId, meta]) => {
                        const fieldCfg = profile?.standardDocConfig?.[docId];
                        const isExpiry = fieldCfg?.isExpirationDate ?? meta.defaultExpiry;
                        if (!isExpiry) return; // skipped — expiry disabled for this field
                        const tolerance = fieldCfg?.toleranceDays ?? 0;
                        checkStandardCompanyField(entity[meta.entityField], meta.entityField, meta.fieldName, !!meta.isMonth, tolerance);
                    });
                } // end if (type === 'company')

                if (entityNeedsUpdate) {
                    entity.workflowStatus = 'data_update'; // Automatically revert to data_requested/data_update

                    const log = {
                        id: nanoid(),
                        projectId: entity.projectId,
                        entityId: entity.id,
                        entityType: type as any,
                        action: 'status_change',
                        userId: 'system',
                        timestamp: new Date().toISOString(),
                        previousStatus: entity.workflowStatus,
                        newStatus: 'data_update',
                        createdAt: new Date().toISOString(),
                        actorId: 'system',
                        details: `Workflow reverted due to document expiration: ${expiredNames.join(', ')}.`
                    };
                    dbInsert('workflow_logs', log).catch(console.error);
                    newLogs.push(log as any);

                    newNotifications.push({
                        id: nanoid(),
                        type: 'warning',
                        message: `Documentos expirados em ${entity.name}: ${expiredNames.join(', ')}`,
                        read: false,
                        createdAt: new Date().toISOString()
                    });

                    // Update entity in DB — include fieldValidations so cleared validations are persisted
                    if (type === 'company') dbUpdate('companies', entity.id, { workflowStatus: 'data_update', fieldValidations: entity.fieldValidations || {} });
                    if (type === 'worker') dbUpdate('workers', entity.id, { workflowStatus: 'data_update', fieldValidations: entity.fieldValidations || {} });
                    if (type === 'equipment') dbUpdate('equipment', entity.id, { workflowStatus: 'data_update', fieldValidations: entity.fieldValidations || {} });

                    changesMade = true;
                }
            };

            newCompanies.forEach(c => processEntity(c, 'company', state.companyProfiles));
            newWorkers.forEach(w => processEntity(w, 'worker', state.workerProfiles));
            newEquipment.forEach(e => processEntity(e, 'equipment', state.equipmentProfiles));

            if (changesMade) {
                return {
                    tickets: newTickets,
                    companies: newCompanies,
                    workers: newWorkers,
                    equipment: newEquipment,
                    workflowLogs: newLogs,
                    notifications: newNotifications
                };
            }

            return state;
        });
    },

    requestCompanyDocumentation: (id) => set((state) => {
        const company = state.companies.find(c => c.id === id);
        if (!company) return state;

        const assignedUser = state.users.find(u => u.id === company.assignedDataUserId);
        const project = state.projects.find(p => p.id === company.projectId);

        // Log Communication
        console.log(`[EMAIL SERVICE] Requesting Documentation for '${company.name}'`);
        if (assignedUser) {
            console.log(`[EMAIL SERVICE] To Data User: ${assignedUser.email}`);
        } else {
            console.log(`[EMAIL SERVICE] WARNING: No Data User assigned.`);
        }

        // CCs
        const allCcs = [...(project?.workflowCcList || []), ...(company?.workflowNotificationCcs || [])];
        if (allCcs.length) {
            console.log(`[EMAIL SERVICE] CC: ${Array.from(new Set(allCcs)).join(', ')}`);
        }

        // Publish Draft Tickets
        const updatedTickets = state.tickets.map(t =>
            (t.entityId === id && t.isDraft) ? { ...t, isDraft: false, status: 'open' as const, updatedAt: new Date().toISOString() } : t
        );

        // Create Log
        const log: WorkflowLog = {
            id: nanoid(),
            entityId: id,
            entityType: 'company',
            action: 'data_requested',
            previousStatus: company.workflowStatus,
            newStatus: 'data_requested',
            actorId: state.currentUser?.id,
            details: 'Documentation requested manually',
            createdAt: new Date().toISOString()
        };
        dbInsert('workflow_logs', log).catch(console.error);

        return {
            companies: state.companies.map(c => c.id === id ? { ...c, workflowStatus: 'data_requested' as const } : c),
            tickets: updatedTickets,
            notifications: [...state.notifications, {
                id: nanoid(),
                type: 'info',
                message: `Documentation requested for '${company.name}'`,
                read: false,
                createdAt: new Date().toISOString()
            }],
            workflowLogs: [...(state.workflowLogs || []), log]
        };
    }),

    assignCompanyDataUser: (id, userId) => set((state) => {
        const company = state.companies.find(c => c.id === id);
        const user = state.users.find(u => u.id === userId);
        // NOTE: Do NOT change workflowStatus here. Status changes to 'data_requested'
        // only when the manager explicitly clicks 'Rever' (requestCompanyDocumentation).
        return {
            companies: state.companies.map(c => c.id === id ? { ...c, assignedDataUserId: userId } : c),
            notifications: [...state.notifications, {
                id: nanoid(),
                type: 'success',
                message: `Data User '${user?.name}' assigned to '${company?.name}'`,
                read: false,
                createdAt: new Date().toISOString()
            }]
        };
    }),

    toggleFieldValidation: (id, field, isValid) => set((state) => {
        const company = state.companies.find(c => c.id === id);
        if (!company) return state;

        const currentValidations = company.fieldValidations || {};
        const newValidations = { ...currentValidations, [field]: isValid };

        return {
            companies: state.companies.map(c => c.id === id ? { ...c, fieldValidations: newValidations } : c)
        }
    }),

    // Worker Workflow Actions
    updateWorkerStatus: (id: string, status: Worker['workflowStatus']) => set((state) => {
        const worker = state.workers.find(w => w.id === id);
        return {
            workers: state.workers.map(w => w.id === id ? { ...w, workflowStatus: status } : w),
            notifications: [...state.notifications, {
                id: nanoid(),
                type: 'info',
                message: `Worker '${worker?.name}' status updated to ${status}`,
                read: false,
                createdAt: new Date().toISOString()
            }]
        };
    }),

    assignWorkerDataUser: (id: string, userId: string) => set((state) => {
        const worker = state.workers.find(w => w.id === id);
        const user = state.users.find(u => u.id === userId);
        return {
            workers: state.workers.map(w => w.id === id ? { ...w, assignedDataUserId: userId, workflowStatus: 'data_requested' } : w),
            notifications: [...state.notifications, {
                id: nanoid(),
                type: 'success',
                message: `Data User '${user?.name}' assigned to Worker '${worker?.name}'`,
                read: false,
                createdAt: new Date().toISOString()
            }]
        };
    }),

    submitWorker: (id) => set((state) => {
        const worker = state.workers.find(w => w.id === id);
        const project = state.projects.find(p => p.id === worker?.projectId);
        // Find a manager for this project to notify
        const manager = state.users.find(u => u.projectAccess?.some(pa => pa.projectId === worker?.projectId && pa.role === 'manager'));

        console.log(`[EMAIL SERVICE] To Manager (${manager?.email || 'admin'}): Worker ${worker?.name} submitted for validation.`);
        const allCcs = [...(project?.workflowCcList || []), ...(worker?.workflowNotificationCcs || [])];
        if (allCcs.length) {
            console.log(`[EMAIL SERVICE] CC: ${Array.from(new Set(allCcs)).join(', ')}`);
        }

        return {
            workers: state.workers.map(w => w.id === id ? { ...w, workflowStatus: 'validation_pending' } : w),
            notifications: [...state.notifications, {
                id: nanoid(),
                type: 'info',
                message: `Worker '${worker?.name}' submitted for validation`,
                read: false,
                createdAt: new Date().toISOString()
            }]
        };
    }),

    requestWorkerElements: (id, missingElements) => set((state) => {
        const worker = state.workers.find(w => w.id === id);
        const project = state.projects.find(p => p.id === worker?.projectId);
        const dataUser = state.users.find(u => u.id === worker?.assignedDataUserId);

        console.log(`[EMAIL SERVICE] To DataUser (${dataUser?.email || 'unknown'}): Missing elements for ${worker?.name}: ${missingElements.join(', ')}.`);
        const allCcs = [...(project?.workflowCcList || []), ...(worker?.workflowNotificationCcs || [])];
        if (allCcs.length) {
            console.log(`[EMAIL SERVICE] CC: ${Array.from(new Set(allCcs)).join(', ')}`);
        }

        return {
            workers: state.workers.map(w => w.id === id ? { ...w, workflowStatus: 'data_requested', missingElements } : w),
            notifications: [...state.notifications, {
                id: nanoid(),
                type: 'warning',
                message: `Requested elements for '${worker?.name}'`,
                read: false,
                createdAt: new Date().toISOString()
            }]
        };
    }),

    validateWorker: (id) => set((state) => {
        const worker = state.workers.find(w => w.id === id);
        const project = state.projects.find(p => p.id === worker?.projectId);
        const dataUser = state.users.find(u => u.id === worker?.assignedDataUserId);

        console.log(`[EMAIL SERVICE] To DataUser (${dataUser?.email || 'unknown'}): Worker ${worker?.name} APPROVED. Access Card Ready.`);
        const allCcs = [...(project?.workflowCcList || []), ...(worker?.workflowNotificationCcs || [])];
        if (allCcs.length) {
            console.log(`[EMAIL SERVICE] CC: ${Array.from(new Set(allCcs)).join(', ')}`);
        }

        return {
            workers: state.workers.map(w => w.id === id ? { ...w, workflowStatus: 'validated', missingElements: [] } : w),
            notifications: [...state.notifications, {
                id: nanoid(),
                type: 'success',
                message: `Worker '${worker?.name}' validated successfully`,
                read: false,
                createdAt: new Date().toISOString()
            }]
        };
    }),

    checkWorkerCompliance: (workerId: string) => set((state) => {
        const worker = state.workers.find(w => w.id === workerId);
        if (!worker) return state;

        if (worker.workflowStatus !== 'in_training_process' && worker.workflowStatus !== 'validated') {
            return state;
        }

        const projectTrainings = state.trainings.filter(t => t.projectId === worker.projectId && t.isMandatory);
        const mandatoryCourses = state.courses.filter(c => c.projectId === worker.projectId && c.isMandatoryAll);
        
        let isCompliant = true;

        for (const pt of projectTrainings) {
            const hasRecord = state.workerTrainingRecords.find(r => 
                r.workerId === worker.id && 
                r.trainingType === pt.type &&
                r.status === 'completed'
            );
            if (!hasRecord) {
                isCompliant = false;
                break;
            }
        }

        if (isCompliant) {
            for (const mc of mandatoryCourses) {
                const hasRecord = state.workerTrainingRecords.find(r => 
                    r.workerId === worker.id && 
                    r.courseId === mc.id &&
                    r.passed
                );
                if (!hasRecord) {
                    isCompliant = false;
                    break;
                }
            }
        }

        if (!isCompliant && worker.workflowStatus === 'validated') {
            return {
                workers: state.workers.map(w => w.id === worker.id ? { ...w, isAwaitingTraining: true } : w)
            };
        }
        
        if (isCompliant && worker.isAwaitingTraining) {
            return {
                workers: state.workers.map(w => w.id === worker.id ? { ...w, isAwaitingTraining: false } : w)
            };
        }

        if (isCompliant && worker.workflowStatus === 'in_training_process') {
            return {
                workers: state.workers.map(w => w.id === worker.id ? { ...w, workflowStatus: 'validated' } : w),
                notifications: [...state.notifications, {
                    id: nanoid(),
                    type: 'success',
                    message: `O trabalhador '${worker.name}' concluiu todas as formacoes obrigatorias e foi validado.`,
                    read: false,
                    createdAt: new Date().toISOString()
                }]
            };
        }

        return state;
    }),

    blockAccessCard: (id, blocked) => set((state) => ({
        workers: state.workers.map(w => w.id === id ? { ...w, isAccessCardBlocked: blocked } : w)
    })),

    updateProjectSettings: (id, settings) => set((state) => {
        dbUpdate('projects', id, settings).catch(console.error);
        return {
            projects: state.projects.map(p => p.id === id ? { ...p, ...settings } : p)
        };
    }),

    archiveWorker: (id) => set((state) => ({
        workers: state.workers.map(w => w.id === id ? { ...w, archived: true } : w)
    })),

    restoreWorker: (id) => set((state) => ({
        workers: state.workers.map(w => w.id === id ? { ...w, archived: false } : w)
    })),

    toggleWorkerFieldValidation: (id: string, field: string, isValid: boolean) => set((state) => {
        const worker = state.workers.find(w => w.id === id);
        if (!worker) return state;

        const currentValidations = worker.fieldValidations || {};
        const newValidations = { ...currentValidations, [field]: isValid };

        return {
            workers: state.workers.map(w => w.id === id ? { ...w, fieldValidations: newValidations } : w)
        }

    }),



    // Worker Profile Actions

    addWorkerProfile: (profile) => set((state) => ({ workerProfiles: [...state.workerProfiles, profile] })),
    updateWorkerProfile: (id, updates) => set((state) => ({
        workerProfiles: state.workerProfiles.map(p => p.id === id ? { ...p, ...updates } : p)
    })),
    deleteWorkerProfile: (id) => set((state) => ({
        workerProfiles: state.workerProfiles.filter(p => p.id !== id)
    })),

    // Equipment Profile Actions

    addEquipmentProfile: (profile) => set((state) => ({ equipmentProfiles: [...state.equipmentProfiles, profile] })),
    updateEquipmentProfile: (id, updates) => set((state) => ({
        equipmentProfiles: state.equipmentProfiles.map(p => p.id === id ? { ...p, ...updates } : p)
    })),
    deleteEquipmentProfile: (id) => set((state) => ({
        equipmentProfiles: state.equipmentProfiles.filter(p => p.id !== id)
    })),

    approveWorker: (id: string) => set((state) => {
        const worker = state.workers.find(w => w.id === id);
        if (!worker) return state;
        const approvedAt = new Date().toISOString();
        const approvedBy = state.currentUser?.id;

        dbUpdate('workers', id, { approvalStatus: 'approved', approvedBy, approvedAt }).catch(console.error);

        return {
            workers: state.workers.map(w => w.id === id ? { ...w, approvalStatus: 'approved', approvedBy, approvedAt } : w),
            notifications: [...state.notifications, {
                id: nanoid(),
                type: 'success',
                message: `Worker '${worker.name}' approved successfully`,
                read: false,
                createdAt: new Date().toISOString()
            }]
        };
    }),

    approveCompany: (id: string) => set((state) => {
        const company = state.companies.find(c => c.id === id);
        if (!company) return state;
        const approvedAt = new Date().toISOString();
        const approvedBy = state.currentUser?.id;

        dbUpdate('companies', id, { approvalStatus: 'approved', approvedBy, approvedAt }).catch(console.error);

        const log: WorkflowLog = {
            id: nanoid(),
            entityId: id,
            entityType: 'company',
            action: 'approved',
            previousStatus: company.workflowStatus,
            newStatus: 'validated', // Assuming approval implies validation or similar, or just approval status.
            actorId: approvedBy,
            details: 'Company approved',
            createdAt: approvedAt
        };
        dbInsert('workflow_logs', log).catch(console.error);

        return {
            companies: state.companies.map(c => c.id === id ? { ...c, approvalStatus: 'approved', approvedBy, approvedAt } : c),
            notifications: [...state.notifications, {
                id: nanoid(),
                type: 'success',
                message: `Company '${company.name}' approved successfully`,
                read: false,
                createdAt: new Date().toISOString()
            }],
            workflowLogs: [...(state.workflowLogs || []), log]
        };
    }),

    approveEquipment: (id: string) => set((state) => {
        const eq = state.equipment.find(e => e.id === id);
        if (!eq) return state;
        const approvedAt = new Date().toISOString();
        const approvedBy = state.currentUser?.id;

        dbUpdate('equipment', id, { approvalStatus: 'approved', approvedBy, approvedAt }).catch(console.error);

        return {
            equipment: state.equipment.map(e => e.id === id ? { ...e, approvalStatus: 'approved', approvedBy, approvedAt } : e),
            notifications: [...state.notifications, {
                id: nanoid(),
                type: 'success',
                message: `Equipment '${eq.name}' approved successfully`,
                read: false,
                createdAt: new Date().toISOString()
            }]
        };
    }),

    // Tickets & Permissions Implementation
    createTicket: (ticketData: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { id?: string }) => set((state) => {
        const id = ticketData.id || nanoid();
        const newTicket: Ticket = {
            ...ticketData,
            id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'open',
            isDraft: ticketData.isDraft ?? false
        };
        dbInsert('tickets', newTicket).catch(console.error);
        return { tickets: [...state.tickets, newTicket] };
    }),

    publishDraftTickets: (entityId) => set((state) => {
        const updatedTickets = state.tickets.map(t =>
            (t.entityId === entityId && t.isDraft) ? { ...t, isDraft: false, updatedAt: new Date().toISOString() } : t
        );
        // Sync with DB if needed
        return { tickets: updatedTickets };
    }),

    updateTicket: (id, updates) => set((state) => {
        dbUpdate('tickets', id, updates).catch(console.error);
        return { tickets: state.tickets.map(t => t.id === id ? { ...t, ...updates } : t) };
    }),

    resolveTicket: (id) => set((state) => {
        const ticket = state.tickets.find(t => t.id === id);
        if (!ticket) return {};

        // Permission check: Only creator can resolve
        if (ticket.createdBy !== state.currentUser?.id) {
            console.warn('[Store] Permission denied: Only ticket creator can resolve tickets');
            return {};
        }

        // Also add a system message
        const messageId = nanoid();
        const systemMsg: TicketMessage = {
            id: messageId,
            ticketId: id,
            userId: 'system',
            message: 'Ticket Resolved',
            createdAt: new Date().toISOString(),
            isSystemMessage: true
        };
        dbInsert('ticket_messages', systemMsg).catch(console.error);

        const updates = { status: 'resolved' as const, updatedAt: new Date().toISOString() };
        dbUpdate('tickets', id, updates).catch(console.error);

        // Log to Workflow History
        const logId = nanoid();
        const newLog: WorkflowLog = {
            id: logId,
            projectId: ticket.projectId,
            entityId: ticket.entityId,
            entityType: 'ticket', // Adjusted to match new type
            action: 'ticket_resolved',
            newStatus: 'resolved',
            actorId: state.currentUser?.id || 'system',
            details: `Ticket "${ticket.title}" resolved`,
            createdAt: new Date().toISOString()
        };
        dbInsert('workflow_logs', newLog).catch(console.error);

        return {
            tickets: state.tickets.map(t => t.id === id ? { ...t, ...updates } : t),
            ticketMessages: [...state.ticketMessages, systemMsg],
            workflowLogs: [...(state.workflowLogs || []), newLog]
        };
    }),

    archiveTicket: (id) => set((state) => {
        const ticket = state.tickets.find(t => t.id === id);
        if (!ticket) return {};

        // Permission check: Only creator can archive
        if (ticket.createdBy !== state.currentUser?.id) {
            console.warn('[Store] Permission denied: Only ticket creator can archive tickets');
            return {};
        }

        const updates = { status: 'closed' as const, updatedAt: new Date().toISOString() };
        dbUpdate('tickets', id, updates).catch(console.error);

        // Log to Workflow History
        const logId = nanoid();
        const newLog: WorkflowLog = {
            id: logId,
            projectId: ticket.projectId,
            entityId: ticket.entityId,
            entityType: 'ticket',
            action: 'ticket_archived',
            newStatus: 'closed',
            actorId: state.currentUser?.id || 'system',
            details: `Ticket "${ticket.title}" archived`,
            createdAt: new Date().toISOString()
        };
        dbInsert('workflow_logs', newLog).catch(console.error);

        return {
            tickets: state.tickets.map(t => t.id === id ? { ...t, ...updates } : t),
            workflowLogs: [...(state.workflowLogs || []), newLog]
        };
    }),

    addTicketMessage: (ticketId, message, userId) => set((state) => {
        const ticket = state.tickets.find(t => t.id === ticketId);

        const id = nanoid();
        const newMsg: TicketMessage = {
            id,
            ticketId,
            userId,
            message,
            createdAt: new Date().toISOString()
        };
        dbInsert('ticket_messages', newMsg).catch(console.error);

        // Also update ticket updated_at
        dbUpdate('tickets', ticketId, { updatedAt: new Date().toISOString() }).catch(console.error);

        // Log to Workflow History (Only for user replies, maybe?)
        // Yes, let's log it so we see activity.
        let newLog: WorkflowLog | null = null;
        if (ticket) {
            const logId = nanoid();
            newLog = {
                id: logId,
                projectId: ticket.projectId,
                entityId: ticket.entityId,
                entityType: 'ticket',
                action: 'ticket_reply',
                newStatus: ticket.status,
                actorId: state.currentUser?.id || userId, // userId passed might be name or ID, be careful. 
                // Passed userId in addTicketMessage in page.tsx is 'currentUser.name'. 
                // Wait, logic in page.tsx: addTicketMessage(openTicket.id, msg, currentUser.name);
                // I should pass currentUser.id ideally for consistent logging.
                // But let's use state.currentUser.id if available.
                details: `Reply to "${ticket.title}": ${message.substring(0, 30)}...`,
                createdAt: new Date().toISOString()
            };
            dbInsert('workflow_logs', newLog).catch(console.error);
        }

        return {
            ticketMessages: [...state.ticketMessages, newMsg],
            tickets: state.tickets.map(t => t.id === ticketId ? { ...t, updatedAt: new Date().toISOString() } : t),
            workflowLogs: newLog ? [...(state.workflowLogs || []), newLog] : state.workflowLogs
        };
    }),

    deleteTicketMessage: (id) => set((state) => {
        const message = state.ticketMessages.find(m => m.id === id);
        if (!message) return state;

        dbRemove('ticket_messages', id).catch(console.error);

        return {
            ticketMessages: state.ticketMessages.filter(m => m.id !== id)
        };
    }),

    deleteTicket: (id) => set((state) => {
        const ticket = state.tickets.find(t => t.id === id);
        if (!ticket) return {};

        // Permission check: Only creator can delete
        if (ticket.createdBy !== state.currentUser?.id) {
            console.warn('[Store] Permission denied: Only ticket creator can delete tickets');
            return {};
        }

        // Only allow deletion if ticket is still in draft
        if (!ticket.isDraft) {
            console.warn('[Store] Permission denied: Can only delete draft tickets');
            return {};
        }

        // Delete from database
        dbRemove('tickets', id).catch(console.error);

        // Also delete associated messages
        const messagesToDelete = state.ticketMessages.filter(m => m.ticketId === id);
        messagesToDelete.forEach(msg => {
            dbRemove('ticket_messages', msg.id).catch(console.error);
        });

        return {
            tickets: state.tickets.filter(t => t.id !== id),
            ticketMessages: state.ticketMessages.filter(m => m.ticketId !== id)
        };
    }),

    setFieldPermission: (entityId, entityType, field, allowEdit) => set((state) => {
        if (entityType === 'company') {
            const company = state.companies.find(c => c.id === entityId);
            if (!company) return state;
            const newPermissions = { ...(company.fieldEditPermissions || {}), [field]: allowEdit };
            dbUpdate('companies', entityId, { fieldEditPermissions: newPermissions }).catch(console.error);
            return { companies: state.companies.map(c => c.id === entityId ? { ...c, fieldEditPermissions: newPermissions } : c) };
        } else if (entityType === 'worker') {
            const worker = state.workers.find(w => w.id === entityId);
            if (!worker) return state;
            const newPermissions = { ...(worker.fieldEditPermissions || {}), [field]: allowEdit };
            dbUpdate('workers', entityId, { fieldEditPermissions: newPermissions }).catch(console.error);
            return { workers: state.workers.map(w => w.id === entityId ? { ...w, fieldEditPermissions: newPermissions } : w) };
        } else if (entityType === 'equipment') {
            const eq = state.equipment.find(e => e.id === entityId);
            if (!eq) return state;
            const newPermissions = { ...(eq.fieldEditPermissions || {}), [field]: allowEdit };
            dbUpdate('equipment', entityId, { fieldEditPermissions: newPermissions }).catch(console.error);
            return { equipment: state.equipment.map(e => e.id === entityId ? { ...e, fieldEditPermissions: newPermissions } : e) };
        }
        return state;
    }),

    // Permission Helpers Implementation
    getUserRoleInProject: (userId, projectId) => {
        const state = get();
        const user = state.users.find(u => u.id === userId) || (state.currentUser?.id === userId ? state.currentUser : null);
        if (!user) return null;

        // Global Admins are effectively managers
        if (user.role === 'admin' || user.role === 'superadmin') return 'manager';

        // Project Creator or Account Owner is always manager
        const project = state.projects.find(p => p.id === projectId);
        if (project) {
            if (project.creatorId && project.creatorId === userId) return 'manager';
            if (project.accountId && user.accountId && project.accountId === user.accountId) return 'manager';
        }

        // Project Specific Access
        const projectAccess = user.projectAccess?.find(pa => pa.projectId === projectId);
        return projectAccess ? projectAccess.role : null;
    },

    canAccessModule: (userId, projectId, moduleId) => {
        const state = get();
        const user = state.users.find(u => u.id === userId) || (state.currentUser?.id === userId ? state.currentUser : null);
        if (!user) return false;
        if (user.role === 'admin' || user.role === 'superadmin') return true;

        const role = state.getUserRoleInProject(userId, projectId);
        if (role === 'manager') return true;

        const access = user.projectAccess?.find(pa => pa.projectId === projectId);
        if (!access) return false;

        return access.allowedModules.includes(moduleId);
    },

    canEditProject: (userId, projectId) => {
        const state = get();
        const role = state.getUserRoleInProject(userId, projectId);
        return role === 'manager' || role === 'editor';
    },

    canDeleteInProject: (userId, projectId) => {
        const state = get();
        const role = state.getUserRoleInProject(userId, projectId);
        return role === 'manager';
    },

    // Workflow Role Helpers Implementation
    getProjectManager: (projectId) => {
        const state = get();
        const project = state.projects.find(p => p.id === projectId);
        if (project?.creatorId) {
            const creator = state.users.find(u => u.id === project.creatorId);
            if (creator) return creator;
        }
        return state.users.find(u =>
            (project?.accountId && u.accountId === project.accountId && u.role === 'admin') ||
            u.projectAccess?.some(pa =>
                pa.projectId === projectId && pa.role === 'manager'
            )
        );
    },

    getProjectApprover: (projectId) => {
        const state = get();
        return state.users.find(u =>
            u.projectAccess?.some(pa =>
                pa.projectId === projectId && pa.role === 'approval_user'
            )
        );
    },

    getCompanyDataUser: (companyId) => {
        const state = get();
        const company = state.companies.find(c => c.id === companyId);
        if (!company?.assignedDataUserId) return undefined;
        return state.users.find(u => u.id === company.assignedDataUserId);
    },

    canAssignRole: (userId, projectId, role, companyIds) => {
        const state = get();

        // Check if trying to assign Manager role
        if (role === 'manager') {
            const existingManager = state.users.find(u =>
                u.id !== userId && // Not the same user
                u.projectAccess?.some(pa =>
                    pa.projectId === projectId && pa.role === 'manager'
                )
            );
            if (existingManager) {
                return {
                    allowed: false,
                    reason: `O projeto já tem um Manager atribuído: ${existingManager.name}`
                };
            }
        }

        // Check if trying to assign Approval User role
        if (role === 'approval_user') {
            const existingApprover = state.users.find(u =>
                u.id !== userId && // Not the same user
                u.projectAccess?.some(pa =>
                    pa.projectId === projectId && pa.role === 'approval_user'
                )
            );
            if (existingApprover) {
                return {
                    allowed: false,
                    reason: `O projeto já tem um Approval User atribuído: ${existingApprover.name}`
                };
            }
        }

        // Check if trying to assign Data User role
        if (role === 'data_user' && companyIds && companyIds.length > 0) {
            for (const companyId of companyIds) {
                const company = state.companies.find(c => c.id === companyId);
                if (company?.assignedDataUserId && company.assignedDataUserId !== userId) {
                    const existingDataUser = state.users.find(u => u.id === company.assignedDataUserId);
                    return {
                        allowed: false,
                        reason: `A empresa '${company.name}' já tem um Data User atribuído: ${existingDataUser?.name || 'Unknown'}`
                    };
                }
            }
        }

        return { allowed: true };
    },

    getProjectStats: (projectId) => {
        const state = get();
        const projectWorkers = state.workers.filter(w => w.projectId === projectId);
        const activeWorkers = projectWorkers.filter(w => w.status === 'active').length;
        const projectCompanies = state.companies.filter(c => c.projectId === projectId);
        const activeCompanies = projectCompanies.filter(c => c.status === 'active').length;
        const projectEquipment = state.equipment.filter(e => e.projectId === projectId);

        return {
            activeWorkers,
            totalWorkers: projectWorkers.length,
            activeCompanies,
            totalCompanies: projectCompanies.length,
            equipmentCount: projectEquipment.length
        };
    },

    updateProjectAccess: (userId, access) => set((state) => {
        const user = state.users.find(u => u.id === userId);
        if (!user) return state;

        // Persist to DB
        // Check if exists
        const existingMember = user.projectAccess?.find(pa => pa.projectId === access.projectId);

        if (existingMember) {
            // Update
            executeQuery(`UPDATE project_members SET role = ?, allowed_modules = ?, company_id = ? WHERE user_id = ? AND project_id = ?`,
                [access.role, JSON.stringify(access.allowedModules), access.companyIds ? JSON.stringify(access.companyIds) : null, userId, access.projectId])
                .catch(console.error);
        } else {
            // Insert
            const id = nanoid();
            executeQuery(`INSERT INTO project_members (id, project_id, user_id, role, allowed_modules, company_id) VALUES (?, ?, ?, ?, ?, ?)`,
                [id, access.projectId, userId, access.role, JSON.stringify(access.allowedModules), access.companyIds ? JSON.stringify(access.companyIds) : null])
                .catch(console.error);
        }

        const newAccessList = existingMember
            ? user.projectAccess?.map(pa => pa.projectId === access.projectId ? access : pa) || []
            : [...(user.projectAccess || []), access];

        const updatedUsers = state.users.map(u => u.id === userId ? { ...u, projectAccess: newAccessList } : u);

        // Update Company Assignments (for Data Users)
        const updatedCompanies = state.companies.map(c => {
            if (c.projectId !== access.projectId) return c;

            const isAssignedToThisUser = c.assignedDataUserId === userId;
            const isNowAssigned = access.role === 'data_user' && access.companyIds?.includes(c.id);

            // If it WAS assigned, but now IS NOT (either role changed, or company list changed)
            if (isAssignedToThisUser && !isNowAssigned) {
                return { ...c, assignedDataUserId: undefined };
            }

            // If it WAS/WASNT assigned, and now IS
            if (isNowAssigned) {
                return { ...c, assignedDataUserId: userId };
            }

            return c;
        });

        return {
            users: updatedUsers,
            companies: updatedCompanies
        };
    }),

    removeProjectAccess: (userId, projectId) => set((state) => {
        const user = state.users.find(u => u.id === userId);
        if (!user) return state;

        // DB Removal
        executeQuery(`DELETE FROM project_members WHERE user_id = ? AND project_id = ?`, [userId, projectId]).catch(console.error);

        const newAccessList = user.projectAccess?.filter(pa => pa.projectId !== projectId) || [];
        return {
            users: state.users.map(u => u.id === userId ? { ...u, projectAccess: newAccessList } : u)
        };
    }),

    // ─── Course Actions ──────────────────────────────────────────────────────
    addCourse: (courseData) => {
        const now = new Date().toISOString();
        const course: Course = {
            ...courseData,
            id: nanoid(),
            version: 1,
            createdAt: now,
            updatedAt: now,
            slides: courseData.slides || [],
            questions: courseData.questions || [],
        };
        dbInsert('courses', course).catch(console.error);
        set((state) => ({ courses: [...state.courses, course] }));
        return course;
    },

    updateCourse: (id, updates) => {
        const now = new Date().toISOString();
        dbUpdate('courses', id, { ...updates, updatedAt: now }).catch(console.error);
        set((state) => ({
            courses: state.courses.map(c => c.id === id ? { ...c, ...updates, updatedAt: now } : c)
        }));
    },

    deleteCourse: (id) => {
        dbRemove('courses', id).catch(console.error);
        set((state) => ({ courses: state.courses.filter(c => c.id !== id) }));
    },

    publishCourse: (id) => {
        const now = new Date().toISOString();
        dbUpdate('courses', id, { status: 'published', updatedAt: now }).catch(console.error);
        set((state) => ({
            courses: state.courses.map(c => c.id === id ? { ...c, status: 'published', updatedAt: now } : c)
        }));
    },

    // ─── Training Session Actions ────────────────────────────────────────────
    addTrainingSession: (sessionData) => {
        const now = new Date().toISOString();
        const session: TrainingSession = {
            ...sessionData,
            id: nanoid(),
            attendees: sessionData.attendees || [],
            enrolledWorkers: sessionData.enrolledWorkers || [],
            createdAt: now,
            updatedAt: now,
        };
        dbInsert('training_sessions', session).catch(console.error);

        const state = get();
        const course = state.courses.find(c => c.id === session.courseId);
        let updatedWorkers = undefined;
        if (course?.isMandatoryAll) {
            updatedWorkers = state.workers.map(w => {
                if (session.enrolledWorkers.includes(w.id) && w.workflowStatus === 'validated') {
                    return { ...w, isAwaitingTraining: true };
                }
                return w;
            });
        }

        set((state) => ({ 
            trainingSessions: [...state.trainingSessions, session],
            ...(updatedWorkers && { workers: updatedWorkers })
        }));
        return session;
    },

    updateTrainingSession: (id, updates) => {
        const now = new Date().toISOString();
        dbUpdate('training_sessions', id, { ...updates, updatedAt: now }).catch(console.error);
        set((state) => ({
            trainingSessions: state.trainingSessions.map(s => s.id === id ? { ...s, ...updates, updatedAt: now } : s)
        }));
    },

    deleteTrainingSession: (id) => {
        dbRemove('training_sessions', id).catch(console.error);
        set((state) => ({ trainingSessions: state.trainingSessions.filter(s => s.id !== id) }));
    },

    completeTrainingSession: (sessionId, attendees) => {
        const now = new Date().toISOString();
        dbUpdate('training_sessions', sessionId, { status: 'completed', attendees, completedAt: now, updatedAt: now }).catch(console.error);
        set((state) => ({
            trainingSessions: state.trainingSessions.map(s =>
                s.id === sessionId ? { ...s, status: 'completed', attendees, completedAt: now, updatedAt: now } : s
            )
        }));

        // Verifica o compliance automaticamente caso os trabalhadores tenham passado a formacao
        const stateAfterUpdate = get();
        attendees.forEach(att => {
             if (att.passed) {
                 stateAfterUpdate.checkWorkerCompliance(att.workerId);
             }
        });
    },

    // ─── Worker Training Record Actions ──────────────────────────────────────
    addWorkerTrainingRecord: (recordData) => {
        const record: WorkerTrainingRecord = {
            ...recordData,
            id: nanoid(),
            createdAt: new Date().toISOString(),
        };
        dbInsert('worker_training_records', record).catch(console.error);
        set((state) => ({ workerTrainingRecords: [...state.workerTrainingRecords, record] }));
    },

    deleteWorkerTrainingRecord: (id) => {
        dbRemove('worker_training_records', id).catch(console.error);
        set((state) => ({ workerTrainingRecords: state.workerTrainingRecords.filter(r => r.id !== id) }));
    },

}), {
    name: 'safesite-storage',
    partialize: (state) => {
        // Exclude entities from localStorage - SQLite is source of truth
        const { isInitialized, documents, companies, workers, equipment, courses, ...rest } = state;
        return rest;
    },
    onRehydrateStorage: () => (state) => {
        // Always reset modules to current MOCK_MODULES to pick up any path changes
        if (state) {
            state.modules = MOCK_MODULES;
        }
    }
}
));
