// src/lib/equipment-ifc-map.ts
// Mapeamento: tipo de equipamento de obra (PT) → IfcElementType IFC4.3
// O utilizador vê o label PT. A app guarda o ifcElementType internamente.

// Tipos IFC4.3 relevantes para equipamentos de obra:
// IfcTransportElement, IfcBuildingElementProxy, IfcDiscreteAccessory
// Para equipamentos de obra usa-se maioritariamente IfcBuildingElementProxy
// com PredefinedType + ObjectType para distinguir.
// Valores baseados em IfcElementCompositionEnum e tipos de construção IFC4.3.

export type IfcEquipmentType =
    | 'CRANE'            // Grua (torre ou móvel)
    | 'VEHICLE'          // Veículo de obra
    | 'EARTHMOVER'       // Máquina de terraplenagem
    | 'LIFTINGGEAR'      // Equipamento de elevação
    | 'SCAFFOLD'         // Andaime
    | 'FORMWORK'         // Cofragem
    | 'GENERATOR'        // Gerador elétrico
    | 'COMPRESSOR'       // Compressor de ar
    | 'PUMP'             // Bomba
    | 'MIXER'            // Misturadora / betoneira
    | 'CUTTINGTOOL'      // Equipamento de corte
    | 'WELDINGTOOL'      // Equipamento de soldadura
    | 'MEASURINGTOOL'    // Equipamento de medição
    | 'SAFETYEQUIPMENT'  // Equipamento de segurança coletiva
    | 'TEMPORARYWORK'    // Trabalhos temporários (sinalização, vedação)
    | 'USERDEFINED'
    | 'NOTDEFINED';

export interface EquipmentTypeOption {
    /** Texto mostrado ao utilizador — linguagem natural de obra PT */
    label: string;
    /** Descrição curta para hint contextual */
    hint: string;
    /** Valor guardado no campo equipmentType (PT, legível) */
    value: string;
    /** Mapeamento IFC4.3 invisível — guardado no campo ifcElementType */
    ifcType: IfcEquipmentType;
    /** Grupo para organizar o dropdown */
    group: string;
    /** Ícone emoji para identificação visual rápida no cartão */
    icon: string;
}

export const EQUIPMENT_TYPE_OPTIONS: EquipmentTypeOption[] = [

    // ── Elevação e Transporte Vertical ───────────────────────────────
    {
        label: 'Grua Torre',
        hint: 'Grua fixa montada em torre, para obras em altura',
        value: 'grua_torre',
        ifcType: 'CRANE',
        group: 'Elevação e Transporte Vertical',
        icon: '🏗️',
    },
    {
        label: 'Grua Móvel / Automóvel',
        hint: 'Grua montada em veículo, para cargas pontuais',
        value: 'grua_movel',
        ifcType: 'CRANE',
        group: 'Elevação e Transporte Vertical',
        icon: '🏗️',
    },
    {
        label: 'Plataforma Elevatória (Manlift)',
        hint: 'Plataforma articulada ou telescópica para trabalho em altura',
        value: 'plataforma_elevatoria',
        ifcType: 'LIFTINGGEAR',
        group: 'Elevação e Transporte Vertical',
        icon: '🦺',
    },
    {
        label: 'Elevador de Obra / Monta-cargas',
        hint: 'Elevador de materiais e pessoas em fachada',
        value: 'elevador_obra',
        ifcType: 'LIFTINGGEAR',
        group: 'Elevação e Transporte Vertical',
        icon: '⬆️',
    },
    {
        label: 'Empilhador / Porta-paletes Elevado',
        hint: 'Movimentação de paletes e materiais no estaleiro',
        value: 'empilhador',
        ifcType: 'LIFTINGGEAR',
        group: 'Elevação e Transporte Vertical',
        icon: '🔧',
    },

    // ── Movimentação de Terras ────────────────────────────────────────
    {
        label: 'Escavadora de Rastos',
        hint: 'Escavação de fundações e valas',
        value: 'escavadora_rastos',
        ifcType: 'EARTHMOVER',
        group: 'Movimentação de Terras',
        icon: '🚧',
    },
    {
        label: 'Escavadora de Pneus',
        hint: 'Escavação com maior mobilidade em pavimentos',
        value: 'escavadora_pneus',
        ifcType: 'EARTHMOVER',
        group: 'Movimentação de Terras',
        icon: '🚧',
    },
    {
        label: 'Pá Carregadora / Bobcat',
        hint: 'Movimentação e carga de material granular',
        value: 'pa_carregadora',
        ifcType: 'EARTHMOVER',
        group: 'Movimentação de Terras',
        icon: '🚧',
    },
    {
        label: 'Bulldozer / Trator de Rastos',
        hint: 'Terraplenagem e empurramento de terras',
        value: 'bulldozer',
        ifcType: 'EARTHMOVER',
        group: 'Movimentação de Terras',
        icon: '🚧',
    },
    {
        label: 'Motoniveladora',
        hint: 'Nivelamento de terrenos e sub-bases',
        value: 'motoniveladora',
        ifcType: 'EARTHMOVER',
        group: 'Movimentação de Terras',
        icon: '🚧',
    },
    {
        label: 'Compactador de Rolo',
        hint: 'Compactação de aterros e pavimentos',
        value: 'compactador_rolo',
        ifcType: 'EARTHMOVER',
        group: 'Movimentação de Terras',
        icon: '🔄',
    },
    {
        label: 'Placa / Sapo Compactador',
        hint: 'Compactação manual de pequenas áreas',
        value: 'placa_compactadora',
        ifcType: 'EARTHMOVER',
        group: 'Movimentação de Terras',
        icon: '🔄',
    },

    // ── Transporte e Logística ────────────────────────────────────────
    {
        label: 'Camião Basculante / Dumper',
        hint: 'Transporte de terras, entulho e materiais a granel',
        value: 'camiao_basculante',
        ifcType: 'VEHICLE',
        group: 'Transporte e Logística',
        icon: '🚛',
    },
    {
        label: 'Dumper de Obra (mini)',
        hint: 'Transporte de materiais no interior do estaleiro',
        value: 'dumper_obra',
        ifcType: 'VEHICLE',
        group: 'Transporte e Logística',
        icon: '🚛',
    },
    {
        label: 'Camião Betoneira',
        hint: 'Transporte e fornecimento de betão pronto',
        value: 'camiao_betoneira',
        ifcType: 'VEHICLE',
        group: 'Transporte e Logística',
        icon: '🚛',
    },
    {
        label: 'Bomba de Betão',
        hint: 'Bombeamento de betão para locais de difícil acesso',
        value: 'bomba_betao',
        ifcType: 'PUMP',
        group: 'Transporte e Logística',
        icon: '💧',
    },

    // ── Betão e Cofragem ──────────────────────────────────────────────
    {
        label: 'Betoneira / Misturadora',
        hint: 'Mistura de betão no estaleiro',
        value: 'betoneira',
        ifcType: 'MIXER',
        group: 'Betão e Cofragem',
        icon: '🔄',
    },
    {
        label: 'Vibrador de Betão',
        hint: 'Consolidação do betão após betonagem',
        value: 'vibrador_betao',
        ifcType: 'MIXER',
        group: 'Betão e Cofragem',
        icon: '🔧',
    },
    {
        label: 'Sistema de Cofragem (painéis)',
        hint: 'Cofragem metálica ou de madeira para lajes e paredes',
        value: 'sistema_cofragem',
        ifcType: 'FORMWORK',
        group: 'Betão e Cofragem',
        icon: '🏗️',
    },
    {
        label: 'Escoramento / Cimbre',
        hint: 'Suporte temporário de lajes e vigas durante betonagem',
        value: 'escoramento',
        ifcType: 'FORMWORK',
        group: 'Betão e Cofragem',
        icon: '🏗️',
    },

    // ── Andaimes e Acesso em Altura ───────────────────────────────────
    {
        label: 'Andaime Tubular',
        hint: 'Andaime metálico de tubo e braçadeira',
        value: 'andaime_tubular',
        ifcType: 'SCAFFOLD',
        group: 'Andaimes e Acesso em Altura',
        icon: '🦺',
    },
    {
        label: 'Andaime de Fachada (sistema)',
        hint: 'Sistema modular de andaime de fachada (Layher, Peri, etc.)',
        value: 'andaime_fachada',
        ifcType: 'SCAFFOLD',
        group: 'Andaimes e Acesso em Altura',
        icon: '🦺',
    },
    {
        label: 'Andaime Suspenso / Balancim',
        hint: 'Andaime suspenso por cabos para fachadas em altura',
        value: 'andaime_suspenso',
        ifcType: 'SCAFFOLD',
        group: 'Andaimes e Acesso em Altura',
        icon: '🦺',
    },
    {
        label: 'Torre de Trabalho / Andaime Móvel',
        hint: 'Torre telescópica em alumínio com rodas',
        value: 'torre_trabalho',
        ifcType: 'SCAFFOLD',
        group: 'Andaimes e Acesso em Altura',
        icon: '🦺',
    },

    // ── Energia e Fluidos ─────────────────────────────────────────────
    {
        label: 'Gerador Elétrico',
        hint: 'Fornecimento de energia elétrica no estaleiro',
        value: 'gerador_eletrico',
        ifcType: 'GENERATOR',
        group: 'Energia e Fluidos',
        icon: '⚡',
    },
    {
        label: 'Compressor de Ar',
        hint: 'Fornecimento de ar comprimido para ferramentas pneumáticas',
        value: 'compressor_ar',
        ifcType: 'COMPRESSOR',
        group: 'Energia e Fluidos',
        icon: '💨',
    },
    {
        label: 'Grupo de Soldadura',
        hint: 'Equipamento de soldadura elétrica ou MIG/MAG',
        value: 'grupo_soldadura',
        ifcType: 'WELDINGTOOL',
        group: 'Energia e Fluidos',
        icon: '🔥',
    },
    {
        label: 'Bomba de Esgotamento',
        hint: 'Remoção de água de escavações e caves',
        value: 'bomba_esgotamento',
        ifcType: 'PUMP',
        group: 'Energia e Fluidos',
        icon: '💧',
    },

    // ── Ferramentas e Corte ───────────────────────────────────────────
    {
        label: 'Serra de Corte / Rebarbadora',
        hint: 'Corte de materiais de construção',
        value: 'serra_corte',
        ifcType: 'CUTTINGTOOL',
        group: 'Ferramentas e Corte',
        icon: '🔧',
    },
    {
        label: 'Martelo Demolidor / Pneumático',
        hint: 'Demolição e picagem de betão e alvenaria',
        value: 'martelo_demolidor',
        ifcType: 'CUTTINGTOOL',
        group: 'Ferramentas e Corte',
        icon: '🔨',
    },
    {
        label: 'Máquina de Furar / Berbequim Industrial',
        hint: 'Furação de betão, metal e alvenaria',
        value: 'maquina_furar',
        ifcType: 'CUTTINGTOOL',
        group: 'Ferramentas e Corte',
        icon: '🔧',
    },

    // ── Medição e Topografia ──────────────────────────────────────────
    {
        label: 'Estação Total / Teodolito',
        hint: 'Levantamento topográfico e implantação de obra',
        value: 'estacao_total',
        ifcType: 'MEASURINGTOOL',
        group: 'Medição e Topografia',
        icon: '📐',
    },
    {
        label: 'Nível Laser / Nível de Linha',
        hint: 'Transferência de cotas e alinhamentos',
        value: 'nivel_laser',
        ifcType: 'MEASURINGTOOL',
        group: 'Medição e Topografia',
        icon: '📐',
    },
    {
        label: 'Scanner 3D / LiDAR',
        hint: 'Levantamento dimensional de estruturas existentes',
        value: 'scanner_3d',
        ifcType: 'MEASURINGTOOL',
        group: 'Medição e Topografia',
        icon: '📐',
    },

    // ── Segurança Coletiva ────────────────────────────────────────────
    {
        label: 'Vedação / Guarda de Segurança',
        hint: 'Guarda-corpos, redes de segurança, vedações perimetrais',
        value: 'vedacao_seguranca',
        ifcType: 'SAFETYEQUIPMENT',
        group: 'Segurança Coletiva',
        icon: '🦺',
    },
    {
        label: 'Sinalização de Obra',
        hint: 'Sinais, cones, balizas e painéis de sinalização',
        value: 'sinalizacao_obra',
        ifcType: 'TEMPORARYWORK',
        group: 'Segurança Coletiva',
        icon: '⚠️',
    },
    {
        label: 'Extintor / Equipamento de Combate a Incêndio',
        hint: 'Extintores e bocas de incêndio no estaleiro',
        value: 'extintor',
        ifcType: 'SAFETYEQUIPMENT',
        group: 'Segurança Coletiva',
        icon: '🧯',
    },
    {
        label: 'Instalações de Apoio (Contentores / WC)',
        hint: 'Instalações sanitárias, vestiários e escritórios de estaleiro',
        value: 'instalacoes_apoio',
        ifcType: 'TEMPORARYWORK',
        group: 'Segurança Coletiva',
        icon: '🏠',
    },

    // ── Outro ─────────────────────────────────────────────────────────
    {
        label: 'Outro equipamento',
        hint: 'Especificar manualmente',
        value: 'outro',
        ifcType: 'USERDEFINED',
        group: 'Outro',
        icon: '🔧',
    },
];

export const EQUIPMENT_TYPE_GROUPS = Array.from(
    new Set(EQUIPMENT_TYPE_OPTIONS.map(o => o.group))
);

export function getIfcTypeFromEquipment(value: string): IfcEquipmentType {
    return EQUIPMENT_TYPE_OPTIONS.find(o => o.value === value)?.ifcType ?? 'NOTDEFINED';
}

export function getEquipmentTypeLabel(value: string): string {
    return EQUIPMENT_TYPE_OPTIONS.find(o => o.value === value)?.label ?? value;
}

export function getEquipmentTypeIcon(value: string): string {
    return EQUIPMENT_TYPE_OPTIONS.find(o => o.value === value)?.icon ?? '🔧';
}
