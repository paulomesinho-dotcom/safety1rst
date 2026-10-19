// src/lib/occupation-ifc-map.ts
// Mapeamento: termos portugueses de obra → IfcLaborResourceTypeEnum (IFC4.3)
// O utilizador vê o label PT. A app guarda o ifcType internamente.

export type IfcLaborResourceType =
    | 'CARPENTRY'
    | 'CONCRETE'
    | 'ELECTRICAL'
    | 'EQUIPMENT'
    | 'GENERAL'
    | 'HVAC'
    | 'LANDSCAPING'
    | 'MASONRY'
    | 'PAINTING'
    | 'PLUMBING'
    | 'ROOFING'
    | 'STEELWORK'
    | 'USERDEFINED'
    | 'NOTDEFINED';

export interface OccupationOption {
    /** Texto mostrado ao utilizador — linguagem natural de obra PT */
    label: string;
    /** Valor guardado na DB (campo occupation) — também PT, legível */
    value: string;
    /** Mapeamento IFC4.3 invisível — guardado no campo ifc_labor_type */
    ifcType: IfcLaborResourceType;
    /** Grupo para organizar o dropdown */
    group: string;
}

export const OCCUPATION_OPTIONS: OccupationOption[] = [
    // ── Trabalhos em Madeira ──────────────────────────────────────────
    { label: 'Carpinteiro', value: 'carpinteiro', ifcType: 'CARPENTRY', group: 'Madeira e Cofragem' },
    { label: 'Cofreiro', value: 'cofreiro', ifcType: 'CARPENTRY', group: 'Madeira e Cofragem' },
    { label: 'Marceneiro', value: 'marceneiro', ifcType: 'CARPENTRY', group: 'Madeira e Cofragem' },
    { label: 'Montador de Estruturas Madeira', value: 'montador_madeira', ifcType: 'CARPENTRY', group: 'Madeira e Cofragem' },

    // ── Betão e Estruturas ────────────────────────────────────────────
    { label: 'Betoneiro', value: 'betoneiro', ifcType: 'CONCRETE', group: 'Betão e Estruturas' },
    { label: 'Armador de Ferro', value: 'armador_ferro', ifcType: 'CONCRETE', group: 'Betão e Estruturas' },
    { label: 'Operador de Bomba de Betão', value: 'operador_bomba_betao', ifcType: 'CONCRETE', group: 'Betão e Estruturas' },
    { label: 'Trolha / Rebocador', value: 'trolha', ifcType: 'MASONRY', group: 'Betão e Estruturas' },

    // ── Alvenaria e Acabamentos ───────────────────────────────────────
    { label: 'Pedreiro', value: 'pedreiro', ifcType: 'MASONRY', group: 'Alvenaria e Acabamentos' },
    { label: 'Assentador de Alvenaria', value: 'assentador_alvenaria', ifcType: 'MASONRY', group: 'Alvenaria e Acabamentos' },
    { label: 'Assentador de Cerâmica', value: 'assentador_ceramica', ifcType: 'MASONRY', group: 'Alvenaria e Acabamentos' },
    { label: 'Estuqueiro', value: 'estuqueiro', ifcType: 'MASONRY', group: 'Alvenaria e Acabamentos' },
    { label: 'Canalizador / Assentador de Pedra Natural', value: 'assentador_pedra', ifcType: 'MASONRY', group: 'Alvenaria e Acabamentos' },

    // ── Eletricidade ──────────────────────────────────────────────────
    { label: 'Eletricista', value: 'eletricista', ifcType: 'ELECTRICAL', group: 'Eletricidade e ITED' },
    { label: 'Eletricista de Obra', value: 'eletricista_obra', ifcType: 'ELECTRICAL', group: 'Eletricidade e ITED' },
    { label: 'Técnico ITED/ITUR', value: 'tecnico_ited', ifcType: 'ELECTRICAL', group: 'Eletricidade e ITED' },
    { label: 'Instalador de Painéis Solares', value: 'instalador_solar', ifcType: 'ELECTRICAL', group: 'Eletricidade e ITED' },
    { label: 'Técnico de Automação', value: 'tecnico_automacao', ifcType: 'ELECTRICAL', group: 'Eletricidade e ITED' },

    // ── Canalizações e AVAC ───────────────────────────────────────────
    { label: 'Canalizador', value: 'canalizador', ifcType: 'PLUMBING', group: 'Canalizações e AVAC' },
    { label: 'Serralheiro de Tubagens', value: 'serralheiro_tubagens', ifcType: 'PLUMBING', group: 'Canalizações e AVAC' },
    { label: 'Técnico AVAC', value: 'tecnico_avac', ifcType: 'HVAC', group: 'Canalizações e AVAC' },
    { label: 'Instalador de Climatização', value: 'instalador_climatizacao', ifcType: 'HVAC', group: 'Canalizações e AVAC' },
    { label: 'Técnico de Gás', value: 'tecnico_gas', ifcType: 'PLUMBING', group: 'Canalizações e AVAC' },

    // ── Coberturas e Impermeabilização ────────────────────────────────
    { label: 'Telhador', value: 'telhador', ifcType: 'ROOFING', group: 'Coberturas' },
    { label: 'Impermeabilizador', value: 'impermeabilizador', ifcType: 'ROOFING', group: 'Coberturas' },
    { label: 'Instalador de Cobertura Metálica', value: 'cobertura_metalica', ifcType: 'ROOFING', group: 'Coberturas' },

    // ── Serralharia e Estrutura Metálica ─────────────────────────────
    { label: 'Serralheiro', value: 'serralheiro', ifcType: 'STEELWORK', group: 'Metal e Serralharia' },
    { label: 'Soldador', value: 'soldador', ifcType: 'STEELWORK', group: 'Metal e Serralharia' },
    { label: 'Montador de Estrutura Metálica', value: 'montador_metal', ifcType: 'STEELWORK', group: 'Metal e Serralharia' },
    { label: 'Serralheiro de Alumínio', value: 'serralheiro_aluminio', ifcType: 'STEELWORK', group: 'Metal e Serralharia' },

    // ── Pintura e Revestimentos ───────────────────────────────────────
    { label: 'Pintor', value: 'pintor', ifcType: 'PAINTING', group: 'Pintura e Revestimentos' },
    { label: 'Estucador / Pintor', value: 'estucador_pintor', ifcType: 'PAINTING', group: 'Pintura e Revestimentos' },
    { label: 'Aplicador de Isolamentos', value: 'aplicador_isolamentos', ifcType: 'PAINTING', group: 'Pintura e Revestimentos' },
    { label: 'Aplicador ETICS/Capoto', value: 'aplicador_etics', ifcType: 'PAINTING', group: 'Pintura e Revestimentos' },

    // ── Equipamentos e Maquinaria ─────────────────────────────────────
    { label: 'Maquinista / Operador de Escavadora', value: 'maquinista_escavadora', ifcType: 'EQUIPMENT', group: 'Equipamentos e Máquinas' },
    { label: 'Operador de Grua', value: 'operador_grua', ifcType: 'EQUIPMENT', group: 'Equipamentos e Máquinas' },
    { label: 'Motorista / Condutor de Obra', value: 'motorista_obra', ifcType: 'EQUIPMENT', group: 'Equipamentos e Máquinas' },
    { label: 'Operador de Compactador', value: 'operador_compactador', ifcType: 'EQUIPMENT', group: 'Equipamentos e Máquinas' },
    { label: 'Operador de Plataforma Elevatória', value: 'operador_plataforma', ifcType: 'EQUIPMENT', group: 'Equipamentos e Máquinas' },

    // ── Gestão e Coordenação ──────────────────────────────────────────
    { label: 'Encarregado Geral', value: 'encarregado_geral', ifcType: 'GENERAL', group: 'Gestão e Coordenação' },
    { label: 'Encarregado de Frente', value: 'encarregado_frente', ifcType: 'GENERAL', group: 'Gestão e Coordenação' },
    { label: 'Diretor Técnico de Obra', value: 'diretor_tecnico_obra', ifcType: 'GENERAL', group: 'Gestão e Coordenação' },
    { label: 'Técnico de Segurança (TST)', value: 'tecnico_seguranca', ifcType: 'GENERAL', group: 'Gestão e Coordenação' },
    { label: 'Topógrafo', value: 'topografo', ifcType: 'GENERAL', group: 'Gestão e Coordenação' },
    { label: 'Apontador', value: 'apontador', ifcType: 'GENERAL', group: 'Gestão e Coordenação' },

    // ── Trabalhos Gerais ──────────────────────────────────────────────
    { label: 'Servente', value: 'servente', ifcType: 'GENERAL', group: 'Trabalhos Gerais' },
    { label: 'Ajudante de Construção', value: 'ajudante_construcao', ifcType: 'GENERAL', group: 'Trabalhos Gerais' },
    { label: 'Limpeza de Obra', value: 'limpeza_obra', ifcType: 'GENERAL', group: 'Trabalhos Gerais' },
    { label: 'Vigia / Segurança', value: 'vigia', ifcType: 'GENERAL', group: 'Trabalhos Gerais' },

    // ── Paisagismo ────────────────────────────────────────────────────
    { label: 'Jardineiro / Paisagista', value: 'jardineiro', ifcType: 'LANDSCAPING', group: 'Paisagismo' },
    { label: 'Assentador de Pavimento Exterior', value: 'pavimento_exterior', ifcType: 'LANDSCAPING', group: 'Paisagismo' },

    // ── Outro ─────────────────────────────────────────────────────────
    { label: 'Outra profissão', value: 'outro', ifcType: 'USERDEFINED', group: 'Outro' },
];

// Grupos únicos (para renderizar optgroup no select)
export const OCCUPATION_GROUPS = Array.from(new Set(OCCUPATION_OPTIONS.map(o => o.group)));

// Helper: dado o value (PT), devolve o ifcType correspondente
export function getIfcTypeFromOccupation(value: string): IfcLaborResourceType {
    return OCCUPATION_OPTIONS.find(o => o.value === value)?.ifcType ?? 'NOTDEFINED';
}

// Helper: dado o value (PT), devolve o label para mostrar
export function getOccupationLabel(value: string): string {
    return OCCUPATION_OPTIONS.find(o => o.value === value)?.label ?? value;
}
