// src/lib/worker-roles.ts
// Taxonomia de Funções de Trabalhadores — SafeSite
// Mapeamento IFC4.3 (ISO 16739-1:2024) + i18n

export type WorkerGroup = 'SITE_RESPONSIBLE' | 'SHST_RESPONSIBLE' | 'OPERATIVE';

export type IfcRoleEnum =
    | 'CONSTRUCTIONMANAGER'
    | 'FIELDCONSTRUCTIONMANAGER'
    | 'PROJECTMANAGER'
    | 'ENGINEER'
    | 'CONSULTANT'
    | 'USERDEFINED';

export type IfcLaborResourceTypeEnum =
    | 'ADMINISTRATION'
    | 'CARPENTRY'
    | 'CLEANING'
    | 'CONCRETE'
    | 'DRYWALL'
    | 'ELECTRIC'
    | 'FINISHING'
    | 'FLOORING'
    | 'GENERAL'
    | 'HVAC'
    | 'LANDSCAPING'
    | 'MASONRY'
    | 'PAINTING'
    | 'PAVING'
    | 'PLUMBING'
    | 'ROOFING'
    | 'SITEGRADING'
    | 'STEELWORK'
    | 'SURVEYING'
    | 'USERDEFINED'
    | 'NOTDEFINED';

export interface WorkerRoleDefinition {
    id: string;
    group: WorkerGroup;
    /** Category label key (for OPERATIVE group only), shown as optgroup header */
    category?: string;
    ifcActorRole?: {
        role: IfcRoleEnum;
        userDefinedRole?: string;
    };
    ifcLaborResource?: {
        predefinedType: IfcLaborResourceTypeEnum;
        objectType: string;
    };
}

export const WORKER_ROLES: WorkerRoleDefinition[] = [
    // ── GRUPO A — Responsável em Obra ─────────────────────────────
    { id: 'SITE_DIRECTOR',            group: 'SITE_RESPONSIBLE', ifcActorRole: { role: 'CONSTRUCTIONMANAGER' } },
    { id: 'DEPUTY_SITE_DIRECTOR',     group: 'SITE_RESPONSIBLE', ifcActorRole: { role: 'USERDEFINED', userDefinedRole: 'DeputySiteDirector' } },
    { id: 'SUPERVISION_DIRECTOR',     group: 'SITE_RESPONSIBLE', ifcActorRole: { role: 'USERDEFINED', userDefinedRole: 'SupervisionDirector' } },
    { id: 'SUPERVISION_TECH',         group: 'SITE_RESPONSIBLE', ifcActorRole: { role: 'USERDEFINED', userDefinedRole: 'SupervisionTechnician' } },
    { id: 'SITE_COORDINATOR',         group: 'SITE_RESPONSIBLE', ifcActorRole: { role: 'FIELDCONSTRUCTIONMANAGER' } },
    { id: 'GENERAL_FOREMAN',          group: 'SITE_RESPONSIBLE', ifcActorRole: { role: 'USERDEFINED', userDefinedRole: 'GeneralForeman' } },
    { id: 'AREA_FOREMAN',             group: 'SITE_RESPONSIBLE', ifcActorRole: { role: 'USERDEFINED', userDefinedRole: 'AreaForeman' } },
    { id: 'TEAM_LEADER',              group: 'SITE_RESPONSIBLE', ifcActorRole: { role: 'USERDEFINED', userDefinedRole: 'TeamLeader' } },
    { id: 'SITE_TECHNICIAN',          group: 'SITE_RESPONSIBLE', ifcActorRole: { role: 'ENGINEER' } },
    { id: 'PROJECT_MANAGER',          group: 'SITE_RESPONSIBLE', ifcActorRole: { role: 'PROJECTMANAGER' } },

    // ── GRUPO B — Responsável de SHST ────────────────────────────
    { id: 'SAFETY_MANAGER',           group: 'SHST_RESPONSIBLE', ifcActorRole: { role: 'USERDEFINED', userDefinedRole: 'SafetyManager' } },
    { id: 'SAFETY_COORD_SITE',        group: 'SHST_RESPONSIBLE', ifcActorRole: { role: 'USERDEFINED', userDefinedRole: 'SafetyCoordinatorSite' } },
    { id: 'SAFETY_COORD_DESIGN',      group: 'SHST_RESPONSIBLE', ifcActorRole: { role: 'USERDEFINED', userDefinedRole: 'SafetyCoordinatorDesign' } },
    { id: 'SENIOR_SAFETY_TECH',       group: 'SHST_RESPONSIBLE', ifcActorRole: { role: 'ENGINEER', userDefinedRole: 'SeniorSafetyTechnician' } },
    { id: 'SAFETY_TECH_L6',           group: 'SHST_RESPONSIBLE', ifcActorRole: { role: 'ENGINEER', userDefinedRole: 'SafetyTechnicianL6' } },
    { id: 'SAFETY_TECH_L5',           group: 'SHST_RESPONSIBLE', ifcActorRole: { role: 'ENGINEER', userDefinedRole: 'SafetyTechnicianL5' } },
    { id: 'SAFETY_TECH_L4',           group: 'SHST_RESPONSIBLE', ifcActorRole: { role: 'ENGINEER', userDefinedRole: 'SafetyTechnicianL4' } },
    { id: 'HSE_TECHNICIAN',           group: 'SHST_RESPONSIBLE', ifcActorRole: { role: 'USERDEFINED', userDefinedRole: 'HSETechnician' } },
    { id: 'SAFETY_REP',               group: 'SHST_RESPONSIBLE', ifcActorRole: { role: 'USERDEFINED', userDefinedRole: 'SafetyRepresentative' } },

    // ── GRUPO C — Trabalhadores Operacionais ─────────────────────
    // C.1 — Construção Civil / Obra Bruta
    { id: 'CONSTRUCTION_LABORER',     group: 'OPERATIVE', category: 'civil', ifcLaborResource: { predefinedType: 'GENERAL',     objectType: 'ConstructionLaborer' } },
    { id: 'BRICKLAYER',               group: 'OPERATIVE', category: 'civil', ifcLaborResource: { predefinedType: 'MASONRY',     objectType: 'Bricklayer' } },
    { id: 'SPECIALIST_MASON',         group: 'OPERATIVE', category: 'civil', ifcLaborResource: { predefinedType: 'MASONRY',     objectType: 'SpecialistMason' } },
    { id: 'CONCRETE_OPERATIVE',       group: 'OPERATIVE', category: 'civil', ifcLaborResource: { predefinedType: 'CONCRETE',    objectType: 'ConcreteOperative' } },
    { id: 'FORMWORK_CARPENTER',       group: 'OPERATIVE', category: 'civil', ifcLaborResource: { predefinedType: 'CARPENTRY',   objectType: 'FormworkCarpenter' } },
    { id: 'FINISHING_CARPENTER',      group: 'OPERATIVE', category: 'civil', ifcLaborResource: { predefinedType: 'CARPENTRY',   objectType: 'FinishingCarpenter' } },
    { id: 'STEEL_FIXER',              group: 'OPERATIVE', category: 'civil', ifcLaborResource: { predefinedType: 'STEELWORK',   objectType: 'SteelFixer' } },
    { id: 'CONSTRUCTION_STEELWORKER', group: 'OPERATIVE', category: 'civil', ifcLaborResource: { predefinedType: 'STEELWORK',   objectType: 'ConstructionSteelworker' } },
    { id: 'WATERPROOFING',            group: 'OPERATIVE', category: 'civil', ifcLaborResource: { predefinedType: 'ROOFING',     objectType: 'WaterproofingOperative' } },
    { id: 'ROOFER',                   group: 'OPERATIVE', category: 'civil', ifcLaborResource: { predefinedType: 'ROOFING',     objectType: 'Roofer' } },
    { id: 'PAVING_OPERATIVE',         group: 'OPERATIVE', category: 'civil', ifcLaborResource: { predefinedType: 'PAVING',      objectType: 'PavingOperative' } },
    { id: 'EARTHWORK_OPERATIVE',      group: 'OPERATIVE', category: 'civil', ifcLaborResource: { predefinedType: 'SITEGRADING', objectType: 'EarthworkOperative' } },
    { id: 'SURVEYOR',                 group: 'OPERATIVE', category: 'civil', ifcLaborResource: { predefinedType: 'SURVEYING',   objectType: 'Surveyor' } },
    // C.2 — Acabamentos
    { id: 'PAINTER',                  group: 'OPERATIVE', category: 'finishing', ifcLaborResource: { predefinedType: 'PAINTING',    objectType: 'Painter' } },
    { id: 'PLASTERER',                group: 'OPERATIVE', category: 'finishing', ifcLaborResource: { predefinedType: 'FINISHING',   objectType: 'Plasterer' } },
    { id: 'TILER',                    group: 'OPERATIVE', category: 'finishing', ifcLaborResource: { predefinedType: 'FINISHING',   objectType: 'Tiler' } },
    { id: 'FLOORING_OPERATIVE',       group: 'OPERATIVE', category: 'finishing', ifcLaborResource: { predefinedType: 'FLOORING',    objectType: 'FlooringOperative' } },
    { id: 'CEILING_FITTER',           group: 'OPERATIVE', category: 'finishing', ifcLaborResource: { predefinedType: 'DRYWALL',     objectType: 'SuspendedCeilingFitter' } },
    { id: 'DRYWALL_FITTER',           group: 'OPERATIVE', category: 'finishing', ifcLaborResource: { predefinedType: 'DRYWALL',     objectType: 'DrywallFitter' } },
    { id: 'POLISHER',                 group: 'OPERATIVE', category: 'finishing', ifcLaborResource: { predefinedType: 'FINISHING',   objectType: 'Polisher' } },
    { id: 'ALUMINIUM_PVC_FITTER',     group: 'OPERATIVE', category: 'finishing', ifcLaborResource: { predefinedType: 'FINISHING',   objectType: 'AluminiumPVCFitter' } },
    { id: 'GLAZIER',                  group: 'OPERATIVE', category: 'finishing', ifcLaborResource: { predefinedType: 'FINISHING',   objectType: 'Glazier' } },
    // C.3 — Instalações Técnicas (MEP)
    { id: 'ELECTRICIAN',              group: 'OPERATIVE', category: 'mep', ifcLaborResource: { predefinedType: 'ELECTRIC',    objectType: 'Electrician' } },
    { id: 'HV_ELECTRICIAN',           group: 'OPERATIVE', category: 'mep', ifcLaborResource: { predefinedType: 'ELECTRIC',    objectType: 'HVElectrician' } },
    { id: 'HVAC_TECH',                group: 'OPERATIVE', category: 'mep', ifcLaborResource: { predefinedType: 'HVAC',        objectType: 'HVACTechnician' } },
    { id: 'PLUMBER',                  group: 'OPERATIVE', category: 'mep', ifcLaborResource: { predefinedType: 'PLUMBING',    objectType: 'Plumber' } },
    { id: 'WELDER',                   group: 'OPERATIVE', category: 'mep', ifcLaborResource: { predefinedType: 'STEELWORK',   objectType: 'Welder' } },
    { id: 'GAS_TECH',                 group: 'OPERATIVE', category: 'mep', ifcLaborResource: { predefinedType: 'PLUMBING',    objectType: 'GasTechnician' } },
    { id: 'TELECOM_TECH',             group: 'OPERATIVE', category: 'mep', ifcLaborResource: { predefinedType: 'ELECTRIC',    objectType: 'TelecomTechnician' } },
    { id: 'AUTOMATION_TECH',          group: 'OPERATIVE', category: 'mep', ifcLaborResource: { predefinedType: 'HVAC',        objectType: 'AutomationTechnician' } },
    { id: 'SECURITY_TECH',            group: 'OPERATIVE', category: 'mep', ifcLaborResource: { predefinedType: 'ELECTRIC',    objectType: 'SecurityTechnician' } },
    { id: 'LIFT_TECH',                group: 'OPERATIVE', category: 'mep', ifcLaborResource: { predefinedType: 'USERDEFINED', objectType: 'LiftTechnician' } },
    // C.4 — Movimentação e Manuseamento
    { id: 'TOWER_CRANE_OP',           group: 'OPERATIVE', category: 'handling', ifcLaborResource: { predefinedType: 'GENERAL',     objectType: 'TowerCraneOperator' } },
    { id: 'MOBILE_CRANE_OP',          group: 'OPERATIVE', category: 'handling', ifcLaborResource: { predefinedType: 'GENERAL',     objectType: 'MobileCraneOperator' } },
    { id: 'EXCAVATOR_OP',             group: 'OPERATIVE', category: 'handling', ifcLaborResource: { predefinedType: 'SITEGRADING', objectType: 'ExcavatorOperator' } },
    { id: 'BACKHOE_OP',               group: 'OPERATIVE', category: 'handling', ifcLaborResource: { predefinedType: 'SITEGRADING', objectType: 'BackhoeOperator' } },
    { id: 'MEWP_OP',                  group: 'OPERATIVE', category: 'handling', ifcLaborResource: { predefinedType: 'GENERAL',     objectType: 'MEWPOperator' } },
    { id: 'DRIVER',                   group: 'OPERATIVE', category: 'handling', ifcLaborResource: { predefinedType: 'GENERAL',     objectType: 'Driver' } },
    { id: 'CRANE_SIGNALLER',          group: 'OPERATIVE', category: 'handling', ifcLaborResource: { predefinedType: 'GENERAL',     objectType: 'CraneSignaller' } },
    // C.5 — Gestão e Administração de Obra
    { id: 'SITE_MANAGER_ADM',         group: 'OPERATIVE', category: 'admin', ifcLaborResource: { predefinedType: 'ADMINISTRATION', objectType: 'SiteManager' } },
    { id: 'SITE_ADMIN',               group: 'OPERATIVE', category: 'admin', ifcLaborResource: { predefinedType: 'ADMINISTRATION', objectType: 'SiteAdministrator' } },
    { id: 'WAREHOUSE_CTRL',           group: 'OPERATIVE', category: 'admin', ifcLaborResource: { predefinedType: 'ADMINISTRATION', objectType: 'WarehouseController' } },
    { id: 'PLANNING_TECH',            group: 'OPERATIVE', category: 'admin', ifcLaborResource: { predefinedType: 'ADMINISTRATION', objectType: 'PlanningTechnician' } },
    { id: 'QUALITY_TECH',             group: 'OPERATIVE', category: 'admin', ifcLaborResource: { predefinedType: 'ADMINISTRATION', objectType: 'QualityTechnician' } },
    { id: 'ENVIRONMENTAL_TECH',       group: 'OPERATIVE', category: 'admin', ifcLaborResource: { predefinedType: 'ADMINISTRATION', objectType: 'EnvironmentalTechnician' } },
    // C.6 — Limpeza e Apoio
    { id: 'CLEANING_OPERATIVE',       group: 'OPERATIVE', category: 'support', ifcLaborResource: { predefinedType: 'CLEANING',    objectType: 'CleaningOperative' } },
    { id: 'SECURITY_GUARD',           group: 'OPERATIVE', category: 'support', ifcLaborResource: { predefinedType: 'GENERAL',     objectType: 'SiteSecurityGuard' } },
    { id: 'LANDSCAPER',               group: 'OPERATIVE', category: 'support', ifcLaborResource: { predefinedType: 'LANDSCAPING', objectType: 'Landscaper' } },
    // Other
    { id: 'OTHER',                    group: 'OPERATIVE', category: 'other',   ifcLaborResource: { predefinedType: 'USERDEFINED', objectType: 'UserDefined' } },
];

// ── Helpers ──────────────────────────────────────────────────────────────

/** Filter by functional group */
export const getRolesByGroup = (group: WorkerGroup): WorkerRoleDefinition[] =>
    WORKER_ROLES.filter(r => r.group === group);

/** Filter OPERATIVE roles by category */
export const getRolesByCategory = (category: string): WorkerRoleDefinition[] =>
    WORKER_ROLES.filter(r => r.group === 'OPERATIVE' && r.category === category);

/** Get full definition for a given role id */
export const getRoleDefinition = (id: string): WorkerRoleDefinition | undefined =>
    WORKER_ROLES.find(r => r.id === id);

/** Get translated label for a role id — requires next-intl `t` function */
export const getRoleLabel = (id: string, t: (key: string) => string): string =>
    t(`workerRoles.roles.${id}`) ?? id;

/** Unique operative categories in order */
export const OPERATIVE_CATEGORIES = ['civil', 'finishing', 'mep', 'handling', 'admin', 'support', 'other'] as const;
export type OperativeCategory = typeof OPERATIVE_CATEGORIES[number];
