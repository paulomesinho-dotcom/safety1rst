// src/lib/company-ifc-map.ts
// Mapeamento: papel da empresa em obra (PT) → IfcRoleEnum (IFC4.3)
// O utilizador vê o label PT. A app guarda o ifcActorRole internamente.

export type IfcOrganizationRole =
    | 'ARCHITECT'
    | 'BUILDINGOPERATOR'
    | 'CIVILENGINEER'
    | 'CLIENT'
    | 'COMMISSIONINGENGINEER'
    | 'CONSTRUCTIONMANAGER'
    | 'CONSULTANT'
    | 'CONTRACTOR'
    | 'COSTENGINEER'
    | 'ELECTRICALENGINEER'
    | 'ENGINEER'
    | 'FACILITIESMANAGER'
    | 'MANUFACTURER'
    | 'MECHANICALENGINEER'
    | 'OWNER'
    | 'PROJECTMANAGER'
    | 'RESELLER'
    | 'STRUCTURALENGINEER'
    | 'SUBCONTRACTOR'
    | 'SUPPLIER'
    | 'USERDEFINED'
    | 'NOTDEFINED';

export interface CompanyRoleOption {
    /** Texto mostrado ao utilizador — linguagem natural de obra PT */
    label: string;
    /** Descrição curta — mostrada como hint no UI */
    hint: string;
    /** Valor guardado na DB (campo companyRole) — PT, legível */
    value: string;
    /** Mapeamento IFC4.3 invisível — guardado no campo ifcActorRole */
    ifcRole: IfcOrganizationRole;
    /** Grupo para organizar o dropdown */
    group: string;
}

export const COMPANY_ROLE_OPTIONS: CompanyRoleOption[] = [

    // ── Execução de Obra ─────────────────────────────────────────────
    {
        label: 'Empreiteiro Geral',
        hint: 'Empresa principal responsável pela execução da obra',
        value: 'empreiteiro_geral',
        ifcRole: 'CONTRACTOR',
        group: 'Execução de Obra',
    },
    {
        label: 'Subempreiteiro',
        hint: 'Empresa contratada pelo empreiteiro para trabalhos específicos',
        value: 'subempreiteiro',
        ifcRole: 'SUBCONTRACTOR',
        group: 'Execução de Obra',
    },
    {
        label: 'Empresa de Construção (geral)',
        hint: 'Construtora sem papel fixo definido',
        value: 'empresa_construcao',
        ifcRole: 'CONTRACTOR',
        group: 'Execução de Obra',
    },
    {
        label: 'Empresa de Demolição',
        hint: 'Especializada em trabalhos de demolição',
        value: 'empresa_demolicao',
        ifcRole: 'SUBCONTRACTOR',
        group: 'Execução de Obra',
    },
    {
        label: 'Empresa de Escavação / Movimentação de Terras',
        hint: 'Especializada em terraplenagens e escavações',
        value: 'empresa_escavacao',
        ifcRole: 'SUBCONTRACTOR',
        group: 'Execução de Obra',
    },

    // ── Especialidades Técnicas ───────────────────────────────────────
    {
        label: 'Empresa de Eletricidade',
        hint: 'Instalações elétricas, ITED/ITUR',
        value: 'empresa_eletricidade',
        ifcRole: 'SUBCONTRACTOR',
        group: 'Especialidades Técnicas',
    },
    {
        label: 'Empresa de Canalizações / Saneamento',
        hint: 'Redes de água, esgotos e pluviais',
        value: 'empresa_canalizacoes',
        ifcRole: 'SUBCONTRACTOR',
        group: 'Especialidades Técnicas',
    },
    {
        label: 'Empresa de AVAC / Climatização',
        hint: 'Aquecimento, ventilação e ar condicionado',
        value: 'empresa_avac',
        ifcRole: 'SUBCONTRACTOR',
        group: 'Especialidades Técnicas',
    },
    {
        label: 'Empresa de Elevadores / Escadas Rolantes',
        hint: 'Instalação e manutenção de elevadores',
        value: 'empresa_elevadores',
        ifcRole: 'SUBCONTRACTOR',
        group: 'Especialidades Técnicas',
    },
    {
        label: 'Empresa de Gás',
        hint: 'Redes de gás e equipamentos a gás',
        value: 'empresa_gas',
        ifcRole: 'SUBCONTRACTOR',
        group: 'Especialidades Técnicas',
    },
    {
        label: 'Empresa de Segurança Eletrónica',
        hint: 'CCTV, controlo de acessos, intrusão',
        value: 'empresa_seguranca_eletronica',
        ifcRole: 'SUBCONTRACTOR',
        group: 'Especialidades Técnicas',
    },
    {
        label: 'Empresa de Andaimes',
        hint: 'Montagem e aluguer de andaimes',
        value: 'empresa_andaimes',
        ifcRole: 'SUBCONTRACTOR',
        group: 'Especialidades Técnicas',
    },
    {
        label: 'Empresa de Impermeabilização / Coberturas',
        hint: 'Coberturas, impermeabilizações e fachadas',
        value: 'empresa_impermeabilizacao',
        ifcRole: 'SUBCONTRACTOR',
        group: 'Especialidades Técnicas',
    },

    // ── Projeto e Consultoria ─────────────────────────────────────────
    {
        label: 'Gabinete de Arquitetura',
        hint: 'Autor do projeto de arquitetura',
        value: 'gabinete_arquitetura',
        ifcRole: 'ARCHITECT',
        group: 'Projeto e Consultoria',
    },
    {
        label: 'Gabinete de Engenharia Civil / Estruturas',
        hint: 'Projeto de estruturas e fundações',
        value: 'gabinete_eng_estruturas',
        ifcRole: 'STRUCTURALENGINEER',
        group: 'Projeto e Consultoria',
    },
    {
        label: 'Gabinete de Engenharia de Especialidades',
        hint: 'Projetos de eletricidade, AVAC, canalizações',
        value: 'gabinete_eng_especialidades',
        ifcRole: 'ENGINEER',
        group: 'Projeto e Consultoria',
    },
    {
        label: 'Consultora de Gestão de Projeto',
        hint: 'Coordenação e gestão do processo construtivo',
        value: 'consultora_gestao_projeto',
        ifcRole: 'PROJECTMANAGER',
        group: 'Projeto e Consultoria',
    },
    {
        label: 'Empresa de Fiscalização / Gestão de Obra',
        hint: 'Fiscalização em nome do dono de obra',
        value: 'empresa_fiscalizacao',
        ifcRole: 'CONSTRUCTIONMANAGER',
        group: 'Projeto e Consultoria',
    },
    {
        label: 'Empresa de Segurança e Saúde (Coord. SST)',
        hint: 'Coordenação de segurança em obra',
        value: 'empresa_coord_sst',
        ifcRole: 'CONSULTANT',
        group: 'Projeto e Consultoria',
    },
    {
        label: 'Laboratório de Ensaios / Controlo de Qualidade',
        hint: 'Ensaios geotécnicos, betão, materiais',
        value: 'laboratorio_ensaios',
        ifcRole: 'CONSULTANT',
        group: 'Projeto e Consultoria',
    },

    // ── Dono de Obra e Promotor ───────────────────────────────────────
    {
        label: 'Dono de Obra / Cliente',
        hint: 'Entidade que encomenda e financia a obra',
        value: 'dono_obra',
        ifcRole: 'CLIENT',
        group: 'Dono de Obra e Promotor',
    },
    {
        label: 'Promotor Imobiliário',
        hint: 'Empresa que desenvolve o empreendimento',
        value: 'promotor_imobiliario',
        ifcRole: 'OWNER',
        group: 'Dono de Obra e Promotor',
    },
    {
        label: 'Entidade Pública / Município',
        hint: 'Câmara Municipal, IP, IMT, etc.',
        value: 'entidade_publica',
        ifcRole: 'CLIENT',
        group: 'Dono de Obra e Promotor',
    },

    // ── Fornecimento e Logística ──────────────────────────────────────
    {
        label: 'Fornecedor de Materiais',
        hint: 'Betão pronto, aço, cerâmica, etc.',
        value: 'fornecedor_materiais',
        ifcRole: 'SUPPLIER',
        group: 'Fornecimento e Logística',
    },
    {
        label: 'Aluguer de Equipamentos / Maquinaria',
        hint: 'Gruas, escavadoras, plataformas, andaimes',
        value: 'aluguer_equipamentos',
        ifcRole: 'SUPPLIER',
        group: 'Fornecimento e Logística',
    },
    {
        label: 'Fabricante / Produtor',
        hint: 'Fabrica elementos para a obra (pré-fabricados, caixilharia)',
        value: 'fabricante',
        ifcRole: 'MANUFACTURER',
        group: 'Fornecimento e Logística',
    },
    {
        label: 'Empresa de Transportes / Logística',
        hint: 'Transporte de materiais e resíduos',
        value: 'empresa_transportes',
        ifcRole: 'SUPPLIER',
        group: 'Fornecimento e Logística',
    },

    // ── Gestão de Instalações (FM) ────────────────────────────────────
    {
        label: 'Empresa de Facility Management',
        hint: 'Gestão e manutenção do edifício em operação',
        value: 'empresa_fm',
        ifcRole: 'FACILITIESMANAGER',
        group: 'Gestão de Instalações (FM)',
    },
    {
        label: 'Empresa de Operação de Edifício',
        hint: 'Operação de sistemas técnicos (BMS, energia)',
        value: 'empresa_operacao',
        ifcRole: 'BUILDINGOPERATOR',
        group: 'Gestão de Instalações (FM)',
    },

    // ── Outro ─────────────────────────────────────────────────────────
    {
        label: 'Outro tipo de empresa',
        hint: 'Especificar manualmente',
        value: 'outro',
        ifcRole: 'USERDEFINED',
        group: 'Outro',
    },
];

export const COMPANY_ROLE_GROUPS = Array.from(
    new Set(COMPANY_ROLE_OPTIONS.map(o => o.group))
);

export function getIfcRoleFromCompanyRole(value: string): IfcOrganizationRole {
    return COMPANY_ROLE_OPTIONS.find(o => o.value === value)?.ifcRole ?? 'NOTDEFINED';
}

export function getCompanyRoleLabel(value: string): string {
    return COMPANY_ROLE_OPTIONS.find(o => o.value === value)?.label ?? value;
}

export function getCompanyRoleHint(value: string): string {
    return COMPANY_ROLE_OPTIONS.find(o => o.value === value)?.hint ?? '';
}
