

export type SystemRole = 'superadmin' | 'admin' | 'user' | 'manager' | 'editor' | 'data_user' | 'approval_user';
export type ProjectRole = 'manager' | 'editor' | 'viewer' | 'data_user' | 'approval_user'; // Advanced, Basic, Preview, Data Provider (Company specific), Approval

export interface ProjectAccess {
    projectId: string;
    role: ProjectRole;
    allowedModules: string[]; // IDs of allowed modules
    companyIds?: string[]; // For Data Users: ID of the companies they can access
}

export interface User {
    id: string;
    email: string;
    name: string;
    role: SystemRole;
    accountId: string; // Tenant ID
    projectAccess?: ProjectAccess[]; // Permissions per project
    avatarUrl?: string;
    createdAt: string;
}

export type PlanType = 'free' | 'basic' | 'premium' | 'enterprise';

export interface Account {
    id: string;
    name: string;
    plan: PlanType;
    subscriptionStatus: 'active' | 'suspended' | 'canceled';
    maxProjects: number; // 1, 3, or unlimited (-1)
    accessControlLimit: number; // 1200, 3600, or unlimited (-1) per month
    modules: string[]; // List of enabled module IDs
    createdAt: string;
}

export interface CDEConfig {
    provider: 'onedrive' | 'gdrive' | 'dropbox' | 'local';
    connected: boolean;
    lastSync?: string;

    // Google Drive (Service Account)
    serviceAccountKey?: string; // Content of JSON file
    folderId?: string;
    folderUrl?: string; // Stored for reference

    // SharePoint (Azure AD)
    tenantId?: string;
    clientId?: string;
    clientSecret?: string;
    siteUrl?: string;
    driveId?: string;
    folderPath?: string; // Optional: Initial folder path to mount

    // Dropbox (App Key)
    appKey?: string;
    appSecret?: string;
    refreshToken?: string;

    // Legacy/OAuth
    accessToken?: string;
    tokenExpiry?: string;
}

export interface ShstSettings {
    requireQualifiedShstByTier: {
        tier1: boolean;      // true = obrigatório técnico qualificado
        tier2: boolean;
        tier3plus: boolean;
    };
}

export interface Project {
    id: string;
    name: string;
    description?: string;
    address?: string;
    accountId: string;
    cdeConfig?: CDEConfig;
    status: 'active' | 'completed' | 'archived';
    logoUrl?: string; // URL for project logo/background
    cardConfig?: any; // Stores Access Card Design (CardDesignConfig)
    workflowCcList?: string[];
    defaultCompanyProfileId?: string;
    defaultWorkerProfileId?: string;
    defaultEquipmentProfileId?: string;
    approvalFlowEnabled?: boolean; // Legacy? Or global toggle? keeping for safety.
    approvalWorkflow?: {
        companies: boolean;
        workers: boolean;
        equipment: boolean;
    };
    shstSettings?: ShstSettings;
    expiryTimezone?: string; // IANA timezone string, e.g. "Europe/Lisbon". Defaults to browser/system timezone.
    /** Se true, o Data User só pode adicionar trabalhadores/equipamentos se a empresa estiver validada ou aprovada (sem documentos expirados). */
    requireCompanyValidatedToAddWorkers?: boolean;
    accessZones?: {
        id: string;
        name: string;
        requiredTrainings?: string[]; // IDs of mandatory trainings to access this zone
    }[];
    createdAt: string;
}

/**
 * IfcRoleEnum values applicable to Organizations (IfcOrganization / IfcActor).
 * Subset of ISO 16739 IfcRoleEnum — excludes roles typically held only by individuals.
 */
export type IfcOrganizationRole =
    | 'SUPPLIER'
    | 'MANUFACTURER'
    | 'CONTRACTOR'
    | 'SUBCONTRACTOR'
    | 'ARCHITECT'
    | 'STRUCTURALENGINEER'
    | 'COSTENGINEER'
    | 'CLIENT'
    | 'BUILDINGOPERATOR'
    | 'MECHANICALENGINEER'
    | 'ELECTRICALENGINEER'
    | 'PROJECTMANAGER'
    | 'FACILITIESMANAGER'
    | 'CIVILENGINEER'
    | 'COMMISSIONINGENGINEER'
    | 'ENGINEER'
    | 'OWNER'
    | 'CONSULTANT'
    | 'CONSTRUCTIONMANAGER'
    | 'RESELLER'
    | 'USERDEFINED'
    | 'NOTDEFINED';

export interface Company {
    id: string;
    number?: string; // Company Internal Number
    name: string;
    nif: string; // Tax ID (Contribuinte)
    activity?: string; // Atividade
    impic?: string; // IMPIC N.º
    email?: string;
    phone?: string;
    address?: string;
    companyRole?: string;              // papel da empresa PT (ex: 'empreiteiro_geral')
    companyRoleCustom?: string;        // texto livre se companyRole === 'outro'
    ifcActorRole?: IfcOrganizationRole; // IfcRoleEnum — papel IFC da organização
    ifcActorRoleUserDefined?: string; // Valor livre caso o papel seja USERDEFINED

    // Obra
    entryDate?: string; // Entrada em Obra (data)
    workSchedule?: string; // Horario de Trabalho

    // Seguros & Documentação
    insuranceCivilDate?: string; // Seguro Responsabilidade Civil (data)
    insuranceCivilPolicy?: string; // Nº Apolice Seguro RC
    insuranceWorkAccDate?: string; // Seguro de Acidentes de Trabalho (data)
    insuranceWorkAccPolicy?: string; // Nº Apolice Seguro AT
    cleanSSDate?: string; // Declaração de não dividas à Segurança Social (data)
    cleanFinDate?: string; // Declaração de não dividas às Finanças (data)
    ssDiscountSheet?: string; // Folha de descontos para a Segurança Social (Month/Year)
    pssAcceptanceDate?: string; // Aceitação do PSS (data)

    // Hierarchy
    tier?: 1 | 2 | 3 | 4; // 1=Executante, 2=Sub, 3=Sub-Sub, 4=Sub-Sub-Sub
    parentId?: string; // Contracted by
    exitDate?: string;
    workScheduleDelivered?: boolean;

    accountId: string;
    projectId?: string; // Associated project
    archived?: boolean; // Added for soft-delete

    // IFC4.3 - Campos Adicionais
    caeCode?: string; // CAE Code Ex: 41200
    legalForm?: 'sa' | 'lda' | 'unipessoal' | 'eni' | 'ace' | 'other';
    siteManagerId?: string; // FK to workers
    safetyTechnicianId?: string; // FK to workers
    priorNoticeDate?: string;
    priorNoticeNumber?: string;
    pssVersion?: string;
    insuranceCivilProvider?: string;
    insuranceWorkAccProvider?: string;
    iso45001Cert?: boolean;
    iso45001Expiry?: string;
    maxWorkersOnSite?: number;
    riskLevel?: 'verylow' | 'low' | 'moderate' | 'high' | 'veryhigh';
    ifcGlobalId?: string;

    // Campos Originais de Site
    siteManager?: string; // Responsável em obra
    siteContact?: string; // Contacto do Responsável

    // Workflow
    workflowStatus?: 'draft' | 'data_requested' | 'validation_pending' | 'validated' | 'incomplete' | 'off_site' | 'data_update' | 'approval_pending' | 'approval_data_update' | 'approved';
    assignedDataUserId?: string; // User responsible for data entry
    workflowNotificationCcs?: string[];
    fieldValidations?: Record<string, boolean>; // Field key -> Validated by manager
    fieldEditPermissions?: Record<string, boolean>; // Field key -> Can Data User edit? (Lock override)
    fieldLastEditors?: Record<string, string>; // Field key -> 'manager' | 'data_user' (Role of last editor)

    // Added Status to Company
    status?: 'active' | 'inactive';
    draftData?: Partial<Company>; // Draft data for Data Users

    // Profiles
    profileId?: string;
    customDocuments?: Record<string, any>; // Key (custom doc id) -> { url, expiry? } or just string value

    // Approval
    approvalStatus?: 'pending' | 'approved' | 'rejected';
    approvedBy?: string;
    approvedAt?: string;

    createdAt: string;
}

export interface CustomDocumentDefinition {
    id: string;
    name: string;
    dataType: 'text' | 'number' | 'date' | 'month' | 'boolean' | 'single_select' | 'multi_select';
    options?: string[]; // For select types
    requiresUpload: boolean; // If true, shows DocumentUpload
    isExpirationDate?: boolean; // Se a data expirar, gera ticket de retificação
    toleranceDays?: number; // Extra days after the date before considered expired (0 = day-after default)
}

export interface CompanyProfile {
    id: string;
    projectId: string;
    name: string;
    // Standard docs: true = required/visible, false = hidden
    requirements: {
        insurance_at?: boolean;
        insurance_rc?: boolean;
        finance_ss?: boolean;
        finance_fin?: boolean;
        ss_discount?: boolean;
        pss_acceptance?: boolean;
        work_schedule?: boolean;
    };
    standardUploads?: Record<string, boolean>; // Defines if standard requirement requires file upload
    standardDocConfig?: Record<string, { isExpirationDate: boolean; toleranceDays: number }>; // Per-field expiry config
    // Custom defined docs
    customDocuments: CustomDocumentDefinition[];
    isSystem?: boolean;
    createdAt: string;
}


export interface WorkerRequirement {
    medical_fitness?: boolean;
    induction?: boolean;
    epi?: boolean;
    specific_training?: boolean;
    contract?: boolean; // For contractExpiry
}

export interface WorkerProfile {
    id: string;
    projectId: string;
    name: string;
    requirements: {
        medical_fitness?: boolean;   // Ficha de Aptidão Médica
        induction?: boolean;         // Acolhimento/Indução
        epi?: boolean;               // Registo básico de EPIs
        epi_list?: boolean;          // Lista detalhada de EPIs entregues
        specific_training?: boolean; // Formação específica
        contract?: boolean;          // Validade de Contrato (estrangeiros)
        immigration_docs?: boolean;  // Documentos de imigração
        insurance?: boolean;         // Cobertura de seguro AT
    };
    standardUploads?: Record<string, boolean>;
    standardDocConfig?: Record<string, { isExpirationDate: boolean; toleranceDays: number }>;
    customDocuments: CustomDocumentDefinition[];
    isSystem?: boolean;
    createdAt: string;
}

export interface EquipmentRequirement {
    maintenance?: boolean; // For maintenance dates
    inspection?: boolean; // General inspection
    insurance?: boolean;
    property_title?: boolean;
}

export interface EquipmentProfile {
    id: string;
    projectId: string;
    name: string;
    requirements: {
        maintenance?: boolean;
        inspection?: boolean;
        insurance?: boolean;
        property_title?: boolean;
    };
    standardUploads?: Record<string, boolean>;
    customDocuments: CustomDocumentDefinition[];
    isSystem?: boolean;
    createdAt: string;
}

/**
 * IFC4 IfcActorRole enumeration.
 * Represents the role of a construction project participant per ISO 16739.
 */
export type IfcActorRole =
    | 'SUPPLIER'
    | 'MANUFACTURER'
    | 'CONTRACTOR'
    | 'SUBCONTRACTOR'
    | 'ARCHITECT'
    | 'STRUCTURALENGINEER'
    | 'COSTENGINEER'
    | 'CLIENT'
    | 'BUILDINGOPERATOR'
    | 'BUILDINGADMIN'
    | 'MECHANICALENGINEER'
    | 'ELECTRICALENGINEER'
    | 'PROJECTMANAGER'
    | 'FACILITIESMANAGER'
    | 'CIVILENGINEER'
    | 'COMMISSIONINGENGINEER'
    | 'ENGINEER'
    | 'OWNER'
    | 'CONSULTANT'
    | 'CONSTRUCTIONMANAGER'
    | 'FIELDCONSTRUCTIONMANAGER'
    | 'RESELLER'
    | 'USERDEFINED'
    | 'NOTDEFINED';

export interface WorkerObligatoryRole {
    type: 'SITE_RESPONSIBLE' | 'SHST_RESPONSIBLE';
    rol: string;            // ex: "Diretor de Obra" | "Técnico SST Nível 6" | custom
    rolCustom?: string;     // preenchido se rol === "Outro"
}

export interface Worker {
    id: string;
    profileId?: string; // Linked Profile
    name: string;
    companyId: string;
    role: string; // Job title
    occupation?: string;
    occupationCustom?: string;
    ifcLaborType?: string;
    email?: string;
    phone?: string;
    nif?: string;

    isForeign?: boolean; // Estrangeiro/Passaporte?

    status?: 'active' | 'inactive'; // Added Status
    archived?: boolean;
    draftData?: Partial<Worker>; // Draft data for Data Users

    obligatoryRole?: WorkerObligatoryRole; // Papel obrigatório na obra (responsáveis)
    workerRoleId?: string;  // references a WORKER_ROLES id, e.g. 'BRICKLAYER' | 'SITE_DIRECTOR'
    roleCustom?: string;    // Texto livre quando workerRoleId === 'OTHER'


    // Identification (01) — IfcPerson / IfcActor
    firstName?: string; // alias para First Name antigo
    middleName?: string;
    lastName?: string;
    givenName?: string; // IFC
    familyName?: string; // IFC
    prefixTitles?: string[]; // (Eng., Dr.) — guardado como JSON string na DB
    initials?: string;
    birthDate?: string;
    idCardNumber?: string; // N.º BI / Cartão Cidadão / Passaporte
    idCardType?: string; // Tipo de Documento de Identificação
    idCardTypeCustom?: string; // Especificação do documento se "outro"
    idCardExpiry?: string;
    ssn?: string; // N.º Segurança Social (NISS)
    ssNumber?: string; // Alias IFC
    nationality?: string;
    gender?: string;
    address?: string;
    postalCode?: string;
    city?: string;
    emergencyContact?: string; // nome do contacto (antigo)
    emergencyContactName?: string; // IFC Standard
    emergencyContactPhone?: string; // Telefone do contacto de emergência
    avatarUrl?: string;
    ifcActorRole?: IfcActorRole; // IfcActorRole standard IFC4
    ifcGlobalId?: string; // IFC Guid persistente
    // Immigration documents (isForeign=true)
    nationalityType?: 'portugal' | 'eu_etc' | 'other'; // Determina as regras de doc
    foreignCountry?: string;        // Nome do país se não for Portugal
    passportNumber?: string;        // N.º Passaporte
    passportExpiry?: string;        // Validade do Passaporte
    residencyPermitNumber?: string; // N.º Título de Residência / Visto Válido (para 'other')
    residencyExpiry?: string;       // Validade do Título de Residência
    actCommunication?: boolean;     // Comunicação ACT (marcado manual se upload existir, para 'other')
    euCitizenCertificate?: boolean; // Certificado Registo Cidadão UE (marcado manual se upload, para 'eu_etc')
    foreignContract?: boolean;      // Contrato de Trabalho (marcado manual se upload, para estrangeiros)
    workPermitNumber?: string;      // IFC Standard
    workPermitExpiry?: string;      // IFC Standard

    // Employment (02) — IfcPersonAndOrganization / IfcRelAssignsToActor
    contractType?: string;          // Tipo de Vínculo Laboral
    professionCategory?: string;    // Categoria Profissional Legal (ex: Encarregado, Técnico Superior)
    entryDate?: string;             // Data de Início no Estaleiro
    exitDate?: string;              // Data de Fim Prevista no Estaleiro
    contractExpiry?: string;        // Validade do Contrato
    workSchedule?: string;          // Horário de Trabalho (ex: 8h-17h)
    subcontractorOf?: string;       // ID da empresa subcontratante (se aplicável)

    // BIM Resource (03)
    profession?: string; // Profissão / Especialidade
    category?: string; // Categoria Profissional
    productivity?: number; // Produtividade (h/unidade)
    hourlyCost?: number; // Custo Unitário (€/hora)
    wbs?: string; // Tarefas / WBS Associadas
    ifcGuid?: string; // GUID IFC legacy
    dailyAvailability?: number; // Disponibilidade (h/dia)

    // Safety & Health (04) — IfcRelAssignsToActor
    workerCardNumber?: string;           // N.º Cartão de Trabalhador
    riskLevel?: string;                  // Grau de Risco
    riskCategory?: string;               // IFC Grau de Risco (High, Low)
    medicalExamDate?: string;            // Data do Último Exame Médico
    medicalFitness?: string;             // Aptidão Médica (apto / apto_condicionalmente / outro)
    medicalObservations?: string;        // Observações / Condicionantes da FAT
    medicalExpiry?: string;              // Validade da Ficha de Aptidão Médica
    medicalRestrictions?: string;        // Restrições / Condições Médicas
    bloodType?: string;                  // Grupo Sanguíneo
    // Insurance
    insuranceCovered?: boolean;          // Coberto pelo Seguro AT da Empresa?
    insuranceWorkAccPolicyWorker?: string; // N.º Apólice do Seguro de Acidentes de Trabalho
    insurerName?: string;                // Nome da Seguradora
    // PPE — Equipamento de Proteção Individual
    mandatoryPPE?: string[];             // Lista de EPIs obrigatórios (definidos no perfil)
    epiDeliveryList?: string[];          // EPIs efectivamente entregues e registados
    epiList?: string[];                  // IFC array de objectos JSON com {item: string, date: string, signature: string} na DB
    epiDate?: string;                    // Data de entrega dos EPIs
    epiSignedDate?: string;              // Data de assinatura da ficha de registo de EPIs
    // Mandatory Training Completion
    mandatoryTrainings?: Record<string, { completed: boolean; date?: string; }>; // keyed by training id
    // Training & Qualifications
    inductionDate?: string;              // Data de Acolhimento/Indução
    inductionGivenBy?: string;           // UUID do Formador
    specificTrainingDate?: string;       // Data da última formação específica
    trainingCertificates?: any[];        // IFC array {name, date, expiry} guardado como JSON
    heightWorkCert?: boolean;            // Certificado de Trabalhos em Altura
    heightWorkCertExpiry?: string;
    confinedSpaceCert?: boolean;         // Certificado Espaços Confinados
    certifications?: string;             // Certificações / Habilitações (ex: Cat. Elev.)

    // Access Log (05)
    authorizedZone?: string;         // legacy – zona única (deprecated, use authorizedZoneIds)
    authorizedZoneIds?: string[];    // Zonas autorizadas explicitamente (vazio = Todo o Estaleiro)
    observations?: string; // Observações
    lastAccess?: string;


    // Workflow
    workflowStatus?: 'draft' | 'data_requested' | 'data_update' | 'in_training_process' | 'validation_pending' | 'validated' | 'approval_pending' | 'approval_data_update' | 'approved' | 'incomplete' | 'off_site';

    isAwaitingTraining?: boolean;
    missingElements?: string[]; // Fields requested by manager
    fieldValidations?: Record<string, boolean>; // Field key -> Validated by manager
    fieldEditPermissions?: Record<string, boolean>; // Field key -> Can Data User edit? (Lock override)
    fieldLastEditors?: Record<string, string>; // Field key -> Role

    // Access Log

    // Access Card
    accessCardCode?: string;
    accessCardValid?: boolean;
    isAccessCardBlocked?: boolean;

    // Training & Qualifications
    completedTrainingIds?: string[]; // IDs of completed Training records

    assignedDataUserId?: string; // User responsible for data entry
    workflowNotificationCcs?: string[];

    // Custom Docs Values
    customDocuments?: Record<string, any>;

    // Approval
    approvalStatus?: 'pending' | 'approved' | 'rejected';
    approvedBy?: string;
    approvedAt?: string;

    accountId: string;
    projectId: string;
    createdAt: string;
}

export interface Equipment {
    id: string;
    profileId?: string; // Linked Profile
    name: string;
    type: string;
    equipmentType?: string;      // tipo de equipamento PT (ex: 'grua_torre') — visível
    equipmentTypeCustom?: string; // texto livre se equipmentType === 'outro'
    ifcElementType?: string;     // IfcEquipmentType (ex: 'CRANE') — invisível, para IFC
    serialNumber: string;
    brand?: string;
    // model?: string; // Removido por já constar na listagem IFC abaixo
    manufacturingYear?: string; // Number or Date string
    soundPower?: string; // dB(A)

    // Ownership & Location
    companyId: string;
    entryDate?: string;
    exitDate?: string;

    // Maintenance & IFC Equipment ISO 16739
    manufacturer?: string;
    model?: string;
    yearOfManufacture?: number; // integer
    ceMarking?: boolean;
    ceDeclarationDate?: string;
    inspectionDueDate?: string;
    lastInspectionDate?: string;
    inspectionEntity?: string;
    maintenanceSchedule?: string; // ex: 'mensal', 'anual'
    lastMaintenanceDate?: string;
    nextMaintenanceDate?: string;
    workingHoursOrKm?: string;
    operatorId?: string; // FK to Workers
    maxLoadKg?: number;
    noiseLevelDb?: number; // Subsitui soundPower
    vibrationLevel?: number;

    // Safety & Risk (Pset_Risk)
    riskName?: string;
    riskType?: string;
    riskNature?: string;
    unmitigatedRisk?: string;
    mitigatedRisk?: string;
    mitigationMeasures?: string;

    ifcGlobalId?: string;

    // Workflow
    workflowStatus?: 'draft' | 'data_requested' | 'validation_pending' | 'validated' | 'incomplete' | 'out_of_service';
    missingElements?: string[]; // Fields requested by manager
    fieldValidations?: Record<string, boolean>; // Field key -> Validated by manager
    fieldEditPermissions?: Record<string, boolean>; // Field key -> Can Data User edit? (Lock override)
    fieldLastEditors?: Record<string, string>; // Field key -> 'manager' | 'data_user' (Role of last editor)
    assignedDataUserId?: string;
    workflowNotificationCcs?: string[];

    status: 'operational' | 'maintenance' | 'out_of_service'; // Physical status
    draftData?: Partial<Equipment>; // Draft data for Data Users

    // Approval
    approvalStatus?: 'pending' | 'approved' | 'rejected';
    approvedBy?: string;
    approvedAt?: string;

    // Custom Docs Values
    customDocuments?: Record<string, any>;

    accountId: string;
    projectId: string;
    createdAt: string;
}

export interface Module {
    id: string;
    name: string;
    icon: string; // Lucide icon name
    path: string;
    description: string;
    isBase: boolean;
}

export interface PDFTemplate {
    id: string;
    name: string;
    config: {
        pageSize: 'a4' | 'a3';
        orientation: 'portrait' | 'landscape';
        marginTop?: number;
        marginBottom?: number;
        marginLeft?: number;
        marginRight?: number;
    };
    header: {
        height: number;
        columns: TemplateColumn[];
    };
    footer: {
        height: number;
        columns: TemplateColumn[];
    };
    accountId: string;
    createdAt: string;
}

export interface TemplateElement {
    id: string;
    type: 'text' | 'image' | 'variable' | 'line';
    content: string;
    style: {
        fontSize?: number;
        fontFamily?: string;
        color?: string;
        fontWeight?: string;
        align?: 'left' | 'center' | 'right';
        width?: number; // percentage or px
        height?: number; // mm for image/line
        backgroundColor?: string;
    };
}

export interface TemplateColumn {
    id: string;
    width: number; // percentage
    elements: TemplateElement[];
    backgroundColor?: string;
}

// Full PDF Configuration
export interface PDFGenerationConfig {
    id: string;
    name: string;
    header: {
        height: number;
        columns: TemplateColumn[];
    };
    footer: {
        height: number;
        columns: TemplateColumn[];
    };
    accountId: string;
    createdAt: string;
}

export interface Document {
    id: string;
    name: string;
    size: number; // in bytes
    type: string;
    url?: string;
    cdeFileId?: string; // ID (GDrive) or Path (Dropbox) for API operations
    entityId: string; // e.g. Company ID

    // ISO 19650 & Legal compliance
    entityType?: 'worker' | 'company' | 'equipment' | 'project'; // Type of entity it belongs to
    documentCode?: string; // Standardized Code (ex: PRO-HS-001)
    discipline?: string; // ISO 19650
    language?: string; // default 'pt'
    issueDate?: string;
    expiryDate?: string;
    documentVersion?: string;
    approvalStatus?: 'draft' | 'shared' | 'published' | 'archived'; // ISO 19650 States
    approvedById?: string; // Fk to Users
    approvedAt?: string;
    fileHash?: string; // SHA-256 for legal integrity
    isConfidential?: boolean;
    gdprBasis?: string; // Base legal de retenção de dados
    retentionUntil?: string; // Data limite para eliminação por RGPD

    category?: string; // e.g. 'insurance', 'financial'
    provider: 'onedrive' | 'gdrive' | 'dropbox' | 'local';
    status: 'synced' | 'pending' | 'error';
    aiData?: any;
    archived?: boolean;
    version?: number; // Internal db versioning, not visual document revision
    createdAt: string;
}

export interface WorkflowLog {
    id: string;
    projectId?: string; // Added for filtering
    entityId: string;
    entityType: 'company' | 'worker' | 'equipment' | 'ticket'; // Added ticket
    action: 'status_change' | 'data_requested' | 'validation_submitted' | 'approved' | 'rejected' | 'created' | 'ticket_reply' | 'ticket_resolved' | 'ticket_archived';
    previousStatus?: string;
    newStatus?: string;
    actorId?: string; // User ID who performed the action
    details?: string;
    createdAt: string;
}

export interface CompanyRequest {
    id: string;
    companyId: string;
    userId: string;
    projectId: string;
    updates: Partial<Company>;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
}

export interface Notification {
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
    read: boolean;
    createdAt: string;
}

export interface AccessLog {
    id: string;
    projectId: string; // Keep track of project ownership for querying
    entityType?: 'worker' | 'equipment'; // New field to distinguish
    workerId?: string; // Optional if equipment
    equipmentId?: string; // New field
    workerName?: string; // Legacy: kept for simple display, or use generic 'entityName'
    entityName?: string; // Generic name
    location: string;
    timestamp: string;
    status: 'granted' | 'denied';
    method: 'qr' | 'nfc' | 'face';
    reason?: string;
    locationId?: string; // Link to AccessPoint
}

export interface AccessPoint {
    id: string;
    name: string;
    code: string; // Unique code for mobile app pairing
    type: 'entry' | 'exit' | 'zone'; // Legacy or specific action type
    category: 'site' | 'zone' | 'gate' | 'safe_point'; // New hierarchy category
    parentId?: string; // ID of parent AccessPoint (Site/Zone)
    capacity?: number;
    gps?: {
        lat: number;
        lng: number;
        radius: number; // meters
    };
    requiresGps?: boolean;
    requiredTrainingIds?: string[]; // Trainings required to access this point
    projectId: string;
    status: 'active' | 'inactive';
    createdAt: string;
}

export interface Training {
    id: string;
    name: string;
    type: 'general' | 'heights' | 'electrical' | 'first_aid' | 'confined_space' | 'machinery';
    provider: string;
    description?: string;
    validityMonths?: number; // Default validity in months
    icon?: string; // Optional custom icon
    isMandatory?: boolean; // System mandatory training — cannot be deleted
    mandatoryKey?: string; // 'induction' | 'emergency' | 'environment' | 'operator'
    accountId: string;
    projectId: string;
    createdAt: string;
}

// ─── Course Module Types ───────────────────────────────────────────────────

export interface Slide {
    id: string;
    order: number;
    type: 'cover' | 'content' | 'image' | 'list' | 'question' | 'summary' | 'video';
    title: string;
    body?: string;           // Rich text / markdown
    imageUrl?: string;
    videoUrl?: string;       // For 'video' slides: YouTube, Vimeo, or direct URL
    items?: string[];        // For 'list' slides
    questionId?: string;     // For 'question' slides
    layout: 'default' | 'full_image' | 'two_column' | 'highlight';
    bgTheme?: 'default' | 'dark' | 'primary' | 'success' | 'warning' | 'danger';
    imagePosition?: 'top' | 'bottom' | 'left' | 'right' | 'center' | 'background';
    imageSize?: 'contain' | 'cover';
    notes?: string;          // Speaker notes (not shown on screen)
}

export interface Question {
    id: string;
    courseId: string;
    order: number;
    text: string;
    type: 'multiple_choice' | 'true_false';
    options: {
        id: string;
        text: string;
        isCorrect: boolean;
    }[];
    explanation?: string;
}

export interface Course {
    id: string;
    projectId: string;
    accountId: string;
    title: string;
    description?: string;
    coverImage?: string;     // Cover image for the course listing (Base64 or URL)
    type:
        | 'general_safety'   // Segurança geral
        | 'onboarding'       // Acolhimento em obra (obrigatório)
        | 'environment'      // Ambiente em obra (obrigatório)
        | 'emergency'        // Emergência e evacuação (obrigatório)
        | 'safety_plan'      // Plano de segurança específico
        | 'task_based';      // Por função/tarefa

    status: 'draft' | 'published' | 'archived';
    isTemplate: boolean;
    isMandatory: boolean; // Flag para ser formação base editável
    isMandatoryAll?: boolean; // Obriga TODOS os trabalhadores a terem o curso para validar
    isSelfLearning: boolean;

    language: 'pt' | 'en';
    estimatedDuration?: number;  // minutes

    sourceType:
        | 'ai_generated'
        | 'document_upload'
        | 'manual';

    sourceDocumentUrl?: string;
    aiPromptUsed?: string;

    slides: Slide[];
    passingScore: number;        // 0–100
    questions: Question[];

    validityMonths?: number;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    version: number;
}

// ─── Training Session (Turma) Types ──────────────────────────────────────

export interface AttendeeAnswer {
    questionId: string;
    selectedOptionId: string;
    isCorrect: boolean;
}

export interface Attendee {
    workerId: string;
    present: boolean;
    signedAt?: string;
    signatureImageBase64?: string;
    signatureMethod?: 'canvas' | 'absent';
    answers?: AttendeeAnswer[];
    score?: number;
    passed?: boolean;
}

export interface TrainingSession {
    id: string;
    courseId: string;
    projectId: string;
    accountId: string;
    status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
    scheduledDate: string;
    startedAt?: string;
    completedAt?: string;
    location: string;
    trainerId: string;
    enrolledWorkers: string[];
    attendees: Attendee[];
    signedDocumentUrl?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

// ─── Worker Training Record ──────────────────────────────────────────────

export interface WorkerTrainingRecord {
    id: string;
    workerId: string;
    projectId: string;
    courseId?: string;         // null if external/manual
    sessionId?: string;        // null if self-learning or manual
    trainingType: Course['type'] | Training['type'];
    courseTitle: string;
    completedAt: string;
    validUntil?: string;
    score?: number;
    passed: boolean;
    trainerId?: string;
    trainerName?: string;
    signedDocumentUrl?: string;
    documentUrl?: string; // Upload do certificado da formação externa
    source: 'presential' | 'self_learning' | 'manual' | 'external';
    status?: 'requested' | 'completed' | 'expired'; // Controlo de pedidos ao Data User
    createdAt: string;
}

export interface Accident {
    id: string;
    title: string;
    date: string; // YYYY-MM-DD
    time?: string; // HH:mm
    location: string;
    locationId?: string; // linked to AccessPoint
    severity: 'low' | 'medium' | 'high' | 'critical';
    status: 'open' | 'investigating' | 'closed';
    type: 'accident' | 'incident' | 'near_miss';
    description: string;

    // Involvements
    workerIds?: string[];

    // Media
    photos?: string[];

    projectId: string;
    createdAt: string;
    ifcGlobalId?: string;
    mitigationMeasures?: string;
}

export interface Ticket {
    id: string;
    projectId: string;
    entityId: string; // Company / Worker / Equipment ID
    type: 'field_review' | 'general' | 'bug' | 'support';
    fieldId?: string; // If type is field_review
    title: string;
    description: string;
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    priority: 'low' | 'medium' | 'high' | 'critical';
    createdBy: string;
    assignedTo?: string;
    isDraft?: boolean;
    valueAtReview?: string;
    documentUrlAtReview?: string;
    createdAt: string;
    updatedAt: string;
}

export interface TicketMessage {
    id: string;
    ticketId: string;
    userId: string; // The sender
    message: string;
    createdAt: string;
    isSystemMessage?: boolean; // For auto-logs like "Ticket resolved" inside the chat
}

// Work Plan — Plano de Trabalhos
// Alinha com IFC4: IfcTask, IfcRelAssignsToProcess
export interface WorkPlanTask {
    id: string;
    projectId: string;

    // Identificação da tarefa — IfcTask
    name: string;
    description?: string;
    wbs?: string;                   // Código WBS (ex: 1.2.3)
    ifcGuid?: string;               // GUID IFC GlobalId

    // Datas — IfcScheduleTimeSelect
    startDate: string;              // YYYY-MM-DD
    endDate: string;                // YYYY-MM-DD
    durationDays?: number;          // Duração em dias úteis

    // Atribuição de Recursos — IfcRelAssignsToProcess
    assignedWorkerIds?: string[];   // IDs de trabalhadores atribuídos
    assignedEquipmentIds?: string[]; // IDs de equipamentos atribuídos
    assignedCompanyId?: string;     // Empresa responsável

    // Localização — IfcZone
    locationId?: string;            // AccessPoint ID

    // Estado
    status: 'planned' | 'active' | 'completed' | 'delayed' | 'cancelled';
    progress?: number;              // 0–100%

    // Restrições (para otimizador)
    requiredProfessions?: string[];  // Profissões necessárias
    requiredTrainingIds?: string[];  // Formações obrigatórias para esta tarefa
    minWorkers?: number;
    maxWorkers?: number;

    // Integração com otimizador externo
    optimizerTaskId?: string;        // ID externo do otimizador
    optimizerData?: Record<string, any>; // Dados brutos do otimizador

    createdAt: string;
    updatedAt?: string;
}

// ----------------------------------------------------
// ISO 19650-6 / IFC 4.3 - Safety Management Entities
// ----------------------------------------------------

export interface SafetyIncident {
    id: string;
    accountId: string;
    projectId: string;
    incidentCode: string; // e.g. INC-2023-001
    incidentType?: 'near_miss' | 'first_aid' | 'medical_treatment' | 'lost_time' | 'fatality' | 'environmental' | 'property_damage';
    severity?: 'low' | 'medium' | 'high' | 'critical';
    occurredAt: string; // ISO date-time format
    locationDescription?: string;
    zoneId?: string; // FK to work zones if applicable

    // Involved Entities
    workerId?: string;
    companyId?: string;
    equipmentId?: string;
    relatedRiskName?: string; // Link to a RiskAssessment

    // Description & Investigation
    description: string;
    immediateCause?: string;
    rootCause?: string;
    correctiveAction?: string;

    // Legal Reporting (Portuguese Context)
    reportedToACT?: boolean;
    actReportDate?: string;
    actReference?: string;
    reportedToInsurance?: boolean;
    insuranceReportDate?: string;
    workDaysLost?: number;

    investigatedBy?: string; // App user id or worker id
    investigationDate?: string;
    status: 'reported' | 'investigating' | 'action_required' | 'closed';

    createdAt: string;
    updatedAt: string;
}

export interface RiskAssessment {
    id: string;
    accountId: string;
    projectId: string;

    // Identity
    riskName: string; // Unique identifier for the risk (ex: RISK-FALL-01)
    riskType?: string; // Category (ex: 'Fall from height', 'Electrical', 'Biological')
    natureOfRisk?: string; // Description of the hazard
    riskNature?: string; // Alias for UI compatibility
    riskAssessmentMethodology?: string; // e.g. 'Matrix 5x5', 'Fine Kinney'
    unmitigatedRisk?: string;
    mitigatedRisk?: string;
    mitigationMeasures?: string;
    ifcGlobalId?: string;

    // Unmitigated State (Before measures)
    unmitigatedLikelihood?: string;
    unmitigatedConsequence?: string;
    unmitigatedSignificance?: string;

    // Mitigation
    mitigationPlanned?: string; // Proposed actions
    mitigationAccepted?: string; // Actually implemented actions

    // Mitigated State (Residual Risk)
    mitigatedLikelihood?: string;
    mitigatedConsequence?: string;
    mitigatedSignificance?: string;

    // Context / Assignment
    associatedWorkerId?: string; // Associated IfcActor
    associatedEquipmentId?: string; // Associated IfcElement
    associatedCompanyId?: string; // Associated IfcOrganization
    associatedLocation?: string; // Associated IfcSpatialElement
    associatedActivity?: string; // Associated IfcProcess/WBS

    // Management
    responsibleUserId?: string;
    reviewDate?: string;
    version?: number;
    supersedesId?: string; // Previous version ID if updated
    status: 'draft' | 'active' | 'archived';

    createdAt: string;
    updatedAt: string;
}
