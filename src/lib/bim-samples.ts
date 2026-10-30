/**
 * SafeSite - High-Fidelity BIM, 2D Technical Drawings and Site Logistics Catalog
 * ISO 19650 CDE & ISO 7010 Safety Standards
 */

export interface BimSampleFile {
    folder: string;
    fileName: string;
    title: string;
    discipline: 'architecture' | 'structure' | 'mep' | 'safety';
    storey?: string;
    format?: string;
    rev: string;
    size: string;
}

export const SAMPLE_BIM_MODELS: BimSampleFile[] = [
    {
        folder: '01-Arquitetura',
        fileName: 'ARQ_Edificio_Principal_R02.ifc',
        title: 'Edifício Principal - Arquitetura Integrada',
        discipline: 'architecture',
        rev: 'Rev 02',
        size: '14.8 MB'
    },
    {
        folder: '02-Estruturas',
        fileName: 'EST_Estrutura_Betao_Armado_R01.ifc',
        title: 'Estrutura em Betão Armado e Lajes Maciças',
        discipline: 'structure',
        rev: 'Rev 01',
        size: '12.4 MB'
    },
    {
        folder: '03-Especialidades (MEP)',
        fileName: 'MEP_Rede_AVAC_Incendio_R01.ifc',
        title: 'Rede Hidráulica, AVAC e Segurança contra Incêndio',
        discipline: 'mep',
        rev: 'Rev 01',
        size: '8.6 MB'
    },
    {
        folder: '04-Segurança (PSS)',
        fileName: 'PSS_Estaleiro_Seguranca_R01.ifc',
        title: 'Plano de Segurança e Saúde (PSS) e Estaleiro 3D',
        discipline: 'safety',
        rev: 'Rev 02',
        size: '5.2 MB'
    }
];

export const SAMPLE_2D_DRAWINGS: BimSampleFile[] = [
    {
        folder: 'Desenhos 2D (Plantas e Cortes)',
        fileName: 'P00_ARQ_Planta_Implantacao_Estaleiro.pdf',
        title: 'Planta de Implantação e Estaleiro Geral (PSS)',
        discipline: 'safety',
        storey: 'Exterior / Estaleiro',
        format: 'A0 (1:200)',
        rev: 'Rev 03',
        size: '2.4 MB'
    },
    {
        folder: 'Desenhos 2D (Plantas e Cortes)',
        fileName: 'P01_ARQ_Planta_Piso_0_R02.pdf',
        title: 'Arquitetura - Planta do Piso 0 (R/C)',
        discipline: 'architecture',
        storey: 'Piso 0',
        format: 'A1 (1:100)',
        rev: 'Rev 02',
        size: '3.1 MB'
    },
    {
        folder: 'Desenhos 2D (Plantas e Cortes)',
        fileName: 'P02_EST_Armaduras_Laje_Piso_1.pdf',
        title: 'Estruturas - Armaduras de Laje e Vigas Piso 1',
        discipline: 'structure',
        storey: 'Piso 1',
        format: 'A1 (1:50)',
        rev: 'Rev 01',
        size: '2.9 MB'
    },
    {
        folder: 'Desenhos 2D (Plantas e Cortes)',
        fileName: 'P03_PSS_Planta_Emergencia_Evacuacao.pdf',
        title: 'Segurança - Rotas de Evacuação e Meios de Extinção',
        discipline: 'safety',
        storey: 'Piso 0',
        format: 'A2 (1:100)',
        rev: 'Rev 02',
        size: '1.8 MB'
    }
];

export interface LogisticsCatalogItem {
    id: string;
    type: string;
    name: string;
    category: 'logistics' | 'emergency';
    group: 'lifting' | 'facilities' | 'safety' | 'environment' | 'collective';
    groupLabel: string;
    icon: string;
    subtitle: string;
    description: string;
    defaultRadius?: number;
    color: string;
}

export const SITE_LOGISTICS_CATALOG: LogisticsCatalogItem[] = [
    // Movimentação & Cargas
    {
        id: 'crane',
        type: 'crane',
        name: 'Grua Torre Fixa (26m)',
        category: 'logistics',
        group: 'lifting',
        groupLabel: 'Movimentação & Elevação',
        icon: 'Crane',
        subtitle: 'Lança horizontal 26m / Raio de cargas',
        description: 'Grua de torre com cabine de comando, contrapesos e raio de rotação balizado.',
        defaultRadius: 26,
        color: '#f59e0b'
    },
    {
        id: 'mobile_crane',
        type: 'mobile_crane',
        name: 'Grua Telescópica Móvel (40t)',
        category: 'logistics',
        group: 'lifting',
        groupLabel: 'Movimentação & Elevação',
        icon: 'Truck',
        subtitle: 'Braço telescópico para descargas pesadas',
        description: 'Grua automóvel todo-o-terreno com sapatas estabilizadoras estendidas.',
        defaultRadius: 18,
        color: '#d97706'
    },
    {
        id: 'hoist',
        type: 'hoist',
        name: 'Monta-Cargas Exterior (1500kg)',
        category: 'logistics',
        group: 'lifting',
        groupLabel: 'Movimentação & Elevação',
        icon: 'ArrowUpFromLine',
        subtitle: 'Elevação de materiais e pessoal',
        description: 'Elevador de cremalheira vertical fixo à prumada da fachada.',
        color: '#b45309'
    },

    // Instalações Sociais & Apoio
    {
        id: 'office_container',
        type: 'office_container',
        name: 'Módulo de Escritório de Direção',
        category: 'logistics',
        group: 'facilities',
        groupLabel: 'Instalações de Apoio',
        icon: 'Building2',
        subtitle: 'Contentor 6.0x2.4m climatizado',
        description: 'Gabinete técnico de fiscalização, reuniões de segurança e receção da obra.',
        color: '#3b82f6'
    },
    {
        id: 'dining_container',
        type: 'dining_container',
        name: 'Módulo Refeitório & Vestiário',
        category: 'logistics',
        group: 'facilities',
        groupLabel: 'Instalações de Apoio',
        icon: 'Utensils',
        subtitle: 'Contentor 6.0x2.4m com cacifos',
        description: 'Espaço social com mesas, micro-ondas, lavatórios e cacifos individuais.',
        color: '#2563eb'
    },
    {
        id: 'sanitary_container',
        type: 'sanitary_container',
        name: 'Bloco Sanitário com Fossa Séptica',
        category: 'logistics',
        group: 'facilities',
        groupLabel: 'Instalações de Apoio',
        icon: 'Bath',
        subtitle: 'Cabines WC e lavatórios de campanha',
        description: 'Módulo sanitário estanque com ligação a fossa estanque certificada.',
        color: '#1d4ed8'
    },
    {
        id: 'gate',
        type: 'gate',
        name: 'Portaria & Torniquete Biométrico',
        category: 'logistics',
        group: 'facilities',
        groupLabel: 'Instalações de Apoio',
        icon: 'ShieldCheck',
        subtitle: 'Controlo de acessos e torniquete',
        description: 'Posto de guarda e controlo de acessos com torniquete e leitor facial/RFID.',
        color: '#0284c7'
    },

    // Segurança & Emergência (ISO 7010)
    {
        id: 'meeting_point',
        type: 'meeting_point',
        name: 'Ponto de Encontro de Evacuação (ISO 7010)',
        category: 'emergency',
        group: 'safety',
        groupLabel: 'Segurança & Emergência',
        icon: 'Users',
        subtitle: 'Sinal E007 / Zona segura de concentração',
        description: 'Local amplo no exterior, desimpedido de cargas, para concentração em sinistro.',
        defaultRadius: 6,
        color: '#10b981'
    },
    {
        id: 'first_aid',
        type: 'first_aid',
        name: 'Posto de Primeiros Socorros & DAE',
        category: 'emergency',
        group: 'safety',
        groupLabel: 'Segurança & Emergência',
        icon: 'HeartPulse',
        subtitle: 'Sinal E003 / Mala socorros, maca e desfibrilhador',
        description: 'Posto dotado de mala homologada, maca de imobilização rígida e desfibrilhador (DAE).',
        color: '#059669'
    },
    {
        id: 'fire_extinguisher',
        type: 'fire_extinguisher',
        name: 'Central de Extintores ABC e CO2',
        category: 'emergency',
        group: 'safety',
        groupLabel: 'Segurança & Emergência',
        icon: 'Flame',
        subtitle: 'Sinal F001 / Bateria de pó químico 6kg + CO2',
        description: 'Posto de combate a incêndios protegido contra intempéries com extintores aferidos.',
        color: '#dc2626'
    },
    {
        id: 'alarm_siren',
        type: 'alarm_siren',
        name: 'Sirene de Emergência & Alarme Sonoro',
        category: 'emergency',
        group: 'safety',
        groupLabel: 'Segurança & Emergência',
        icon: 'BellRing',
        subtitle: 'Acionador manual e aviso acústico de 110dB',
        description: 'Pulsador de emergência com corneta autónoma de alta potência para evacuação imediata.',
        color: '#e11d48'
    },

    // Ambiente & Gestão de Resíduos (RCD)
    {
        id: 'waste_bay',
        type: 'waste_bay',
        name: 'Parque de Resíduos / Baias RCD',
        category: 'logistics',
        group: 'environment',
        groupLabel: 'Ambiente & Resíduos (RCD)',
        icon: 'Recycle',
        subtitle: 'Triagem de inertes, madeira, plástico e metais',
        description: 'Baias delimitadas em betão com sinalização DL 102-D/2020 para deposição seletiva.',
        color: '#16a34a'
    },
    {
        id: 'fuel_depot',
        type: 'fuel_depot',
        name: 'Bacia de Retenção de Hidrocarbonetos',
        category: 'logistics',
        group: 'environment',
        groupLabel: 'Ambiente & Resíduos (RCD)',
        icon: 'Fuel',
        subtitle: 'Armazenamento estanque de gasóleo e óleos',
        description: 'Bacia metálica com capacidade para 110% do depósito e manta absorvente de derrames.',
        color: '#ca8a04'
    },
    {
        id: 'wheel_wash',
        type: 'wheel_wash',
        name: 'Lava-Rodados para Camiões e Betoneiras',
        category: 'logistics',
        group: 'environment',
        groupLabel: 'Ambiente & Resíduos (RCD)',
        icon: 'Droplets',
        subtitle: 'Descontaminação antes da saída para via pública',
        description: 'Grelha de retenção com jato de água em circuito fechado e bacia de decantação de lamas.',
        color: '#0891b2'
    },

    // Proteções Coletivas & Tráfego
    {
        id: 'scaffolding',
        type: 'scaffolding',
        name: 'Torre de Andaime de Fachada Multidirecional',
        category: 'logistics',
        group: 'collective',
        groupLabel: 'Proteções Coletivas & Tráfego',
        icon: 'Grid',
        subtitle: 'Andaime certificado com duplo guarda-corpos e rodapé',
        description: 'Estrutura metálica com escada de alçapão interna e rede de proteção contra queda de objetos.',
        color: '#6366f1'
    },
    {
        id: 'pedestrian_path',
        type: 'pedestrian_path',
        name: 'Passadiço Pedonal Protegido',
        category: 'emergency',
        group: 'collective',
        groupLabel: 'Proteções Coletivas & Tráfego',
        icon: 'Footprints',
        subtitle: 'Corredor coberto com guarda-costas e iluminação',
        description: 'Caminho seguro e segregado para circulação exclusiva de peões e visitas à obra.',
        color: '#8b5cf6'
    },
    {
        id: 'vehicle_route',
        type: 'vehicle_route',
        name: 'Corredor de Camiões & Tráfego Pesado',
        category: 'logistics',
        group: 'collective',
        groupLabel: 'Proteções Coletivas & Tráfego',
        icon: 'Navigation',
        subtitle: 'Via de sentido único com sinalização rodoviária',
        description: 'Pista reforçada com tout-venant para circulação balizada de betoneiras e camiões basculantes.',
        color: '#475569'
    }
];

/**
 * Generates an authentic, fully standard ISO-10303-21 IFC4 text string
 */
export function generateRealisticIfc(fileName: string, discipline: string = 'architecture'): string {
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);
    const modelName = fileName.replace('.ifc', '').replace(/_/g, ' ');

    return `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView_V2.0]', 'ExchangeRequirement [${discipline.toUpperCase()}]'), '2;1');
FILE_NAME('${fileName}', '${timestamp}', ('SafeSite BIM Engineering Lda'), ('SafeSite Cloud Platform'), 'SafeSite IFC Kernel 2.4', 'OpenBIM SafeSite 2026', '');
FILE_SCHEMA(('IFC4'));
ENDSEC;

DATA;
#1=IFCPROJECT('0A1b2C3d4E5f6G7h8I9j0K',#2,'${modelName}',$,$,$,$,(#10),#20);
#2=IFCOWNERHISTORY(#3,#4,$,.ADDED.,$,$,$,1714000000);
#3=IFCPERSONANDORGANIZATION(#5,#6,$);
#5=IFCPERSON($,'Direcao','Obra',$,$,$,$,$);
#6=IFCORGANIZATION($,'SafeSite Engenharia e Seguranca',$,$,$);
#4=IFCAPPLICATION(#6,'2026.1','SafeSite BIM Suite','SafeSite');
#10=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,#11,$);
#11=IFCAXIS2PLACEMENT3D(#12,#13,#14);
#12=IFCCARTESIANPOINT((0.,0.,0.));
#13=IFCDIRECTION((0.,0.,1.));
#14=IFCDIRECTION((1.,0.,0.));
#20=IFCUNITASSIGNMENT((#21,#22,#23));
#21=IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.);
#22=IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.);
#23=IFCSIUNIT(*,.VOLUMEUNIT.,$,.CUBIC_METRE.);

/* Spatial Hierarchy */
#30=IFCSITE('1B2c3D4e5F6g7H8i9J0k1L',#2,'Estaleiro da Obra',$,$,#31,$,$,.ELEMENT.,(38.7223, -9.1393),0.,$,$,$);
#31=IFCLOCALPLACEMENT($,#11);
#40=IFCBUILDING('2C3d4E5f6G7h8I9j0K1l2M',#2,'Edificio Principal SafeSite',$,$,#41,$,$,.ELEMENT.,$,$,$);
#41=IFCLOCALPLACEMENT(#31,#11);
#50=IFCBUILDINGSTOREY('3D4e5F6g7H8i9J0k1L2m3N',#2,'Piso 0 (R/C)',$,$,#51,$,$,.ELEMENT.,0.0);
#51=IFCLOCALPLACEMENT(#41,#11);
#52=IFCBUILDINGSTOREY('3D4e5F6g7H8i9J0k1L2m3O',#2,'Piso 1',$,$,#53,$,$,.ELEMENT.,3.5);
#53=IFCLOCALPLACEMENT(#41,#11);

/* Building Elements */
#60=IFCWALLSTANDARDCASE('4E5f6G7h8I9j0K1l2M3n4O',#2,'Parede Exterior Norte (Termica)',$,$,#61,#62,$);
#61=IFCLOCALPLACEMENT(#51,#11);
#62=IFCPRODUCTDEFINITIONSHAPE($,$,(#63));
#63=IFCSHAPEREPRESENTATION(#10,'Body','SweptSolid',(#64));
#64=IFCEXTRUDEDAREASOLID(#65,#11,#13,3.0);
#65=IFCRECTANGLEPROFILEDEF(.AREA.,$,#11,22.0,0.30);

#70=IFCWALLSTANDARDCASE('4E5f6G7h8I9j0K1l2M3n4P',#2,'Parede Exterior Sul (Fachada Principal)',$,$,#71,#72,$);
#71=IFCLOCALPLACEMENT(#51,#11);
#72=IFCPRODUCTDEFINITIONSHAPE($,$,(#73));
#73=IFCSHAPEREPRESENTATION(#10,'Body','SweptSolid',(#74));
#74=IFCEXTRUDEDAREASOLID(#75,#11,#13,3.0);
#75=IFCRECTANGLEPROFILEDEF(.AREA.,$,#11,22.0,0.30);

#80=IFCSLAB('5F6g7H8i9J0k1L2m3N4o5P',#2,'Laje Macica Betao Armado Piso 0',$,$,#81,#82,$,.FLOOR.);
#81=IFCLOCALPLACEMENT(#51,#11);
#82=IFCPRODUCTDEFINITIONSHAPE($,$,(#83));
#83=IFCSHAPEREPRESENTATION(#10,'Body','SweptSolid',(#84));
#84=IFCEXTRUDEDAREASOLID(#85,#11,#13,0.30);
#85=IFCRECTANGLEPROFILEDEF(.AREA.,$,#11,22.0,16.0);

#90=IFCCOLUMN('6G7h8I9j0K1l2M3n4O5p6Q',#2,'Pilar P1 - Betao C30/37 40x40',$,$,#91,#92,$);
#91=IFCLOCALPLACEMENT(#51,#11);
#92=IFCPRODUCTDEFINITIONSHAPE($,$,(#93));
#93=IFCSHAPEREPRESENTATION(#10,'Body','SweptSolid',(#94));
#94=IFCEXTRUDEDAREASOLID(#95,#11,#13,3.5);
#95=IFCRECTANGLEPROFILEDEF(.AREA.,$,#11,0.40,0.40);

/* Structural Links */
#100=IFCRELAGGREGATES('7H8i9J0k1L2m3N4o5P6q7R',#2,'ProjectSite',$,#1,(#30));
#101=IFCRELAGGREGATES('8I9j0K1l2M3n4O5p6Q7r8S',#2,'SiteBuilding',$,#30,(#40));
#102=IFCRELAGGREGATES('9J0k1L2m3N4o5P6q7R8s9T',#2,'BuildingStoreys',$,#40,(#50,#52));
#103=IFCRELCONTAINEDINSPATIALSTRUCTURE('0K1l2M3n4O5p6Q7r8S9t0U',#2,'StoreyZeroElements',$,(#60,#70,#80,#90),#50);
ENDSEC;
END-ISO-10303-21;
`;
}

/**
 * Generates an authentic, valid PDF-1.4 binary buffer for 2D technical drawings
 */
export function generateRealisticPdfDrawing(fileName: string, title: string, code: string, storey: string = 'Piso 0'): Buffer {
    const cleanTitle = title.replace(/[^\x20-\x7E]/g, ' ');
    const cleanCode = code.replace(/[^\x20-\x7E]/g, ' ');
    const cleanStorey = storey.replace(/[^\x20-\x7E]/g, ' ');
    const dateStr = new Date().toISOString().slice(0, 10);

    // PDF Vector stream with technical drawing borders, title block (cartouche) and architectural grid
    const stream = [
        'BT',
        '/F1 16 Tf',
        '55 540 Td',
        '(SAFESITE CDE - DESENHO TECNICO DE ENGENHARIA E SEGURANCA) Tj',
        '0 -24 Td',
        '/F1 13 Tf',
        `(${cleanCode} - ${cleanTitle}) Tj`,
        '0 -18 Td',
        '/F1 9 Tf',
        `(Nivel: ${cleanStorey} | Escala: 1:100 | Sistema Coordenadas: PT-TM06 / ETRS89) Tj`,
        '0 -14 Td',
        `(Emissao: ${dateStr} | Emissor: SafeSite Cloud CDE | Estado: Aprovado para Execucao) Tj`,
        'ET',
        // Outer Sheet Margin & Border
        '0.1 0.1 0.1 RG',
        '2 w',
        '40 40 762 515 re S',
        // Inner Drafting Border
        '0.4 0.4 0.4 RG',
        '0.75 w',
        '48 48 746 499 re S',
        // Title Block (Cartouche) in Bottom Right
        '0.2 0.2 0.2 RG',
        '1.5 w',
        '500 48 294 130 re S',
        '500 135 m 794 135 l S',
        '500 95 m 794 95 l S',
        '640 48 m 640 95 l S',
        // Cartouche Text
        'BT',
        '/F1 11 Tf',
        '510 160 Td',
        '(PROJETO DE EXECUCAO E PSS) Tj',
        '/F1 8 Tf',
        '0 -16 Td',
        '(DONO DE OBRA: SAFESITE INVESTMENTS SA) Tj',
        '0 -28 Td',
        `(${cleanTitle}) Tj`,
        '0 -20 Td',
        `(${cleanCode} | ${cleanStorey}) Tj`,
        '150 0 Td',
        '(REV. 03 | 2026) Tj',
        'ET',
        // Drawing Frame & Grid Axes
        '0.7 0.7 0.7 RG',
        '0.5 w',
        '[3 3] 0 d',
        '70 200 m 480 200 l S',
        '70 300 m 480 300 l S',
        '70 400 m 480 400 l S',
        '150 160 m 150 480 l S',
        '270 160 m 270 480 l S',
        '390 160 m 390 480 l S',
        '[] 0 d',
        // Walls & Columns
        '0.15 0.15 0.15 RG',
        '2.5 w',
        '90 200 360 220 re S',
        '120 200 140 100 re S',
        '300 200 130 100 re S',
        // Reinforced Columns
        '0.1 0.3 0.7 RG',
        '90 200 14 14 re f',
        '250 200 14 14 re f',
        '436 200 14 14 re f',
        '90 406 14 14 re f',
        '250 406 14 14 re f',
        '436 406 14 14 re f',
        // Emergency Escape Route Arrows
        '0.1 0.65 0.3 RG',
        '2 w',
        '250 250 m 250 180 l S',
        '245 190 m 250 180 l 255 190 l S',
        '250 180 m 90 180 l S',
        '100 175 m 90 180 l 100 185 l S'
    ].join('\n');

    const streamLen = Buffer.byteLength(stream, 'utf8');

    const header = '%PDF-1.4\n';
    const obj1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
    const obj2 = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
    const obj3 = '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n';
    const obj4 = `4 0 obj\n<< /Length ${streamLen} >>\nstream\n${stream}\nendstream\nendobj\n`;
    const obj5 = '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n';

    const p1 = header.length;
    const p2 = p1 + obj1.length;
    const p3 = p2 + obj2.length;
    const p4 = p3 + obj3.length;
    const p5 = p4 + obj4.length;
    const startXref = p5 + obj5.length;

    const pad = (n: number) => n.toString().padStart(10, '0');
    const xref = [
        'xref',
        '0 6',
        '0000000000 65535 f ',
        `${pad(p1)} 00000 n `,
        `${pad(p2)} 00000 n `,
        `${pad(p3)} 00000 n `,
        `${pad(p4)} 00000 n `,
        `${pad(p5)} 00000 n `,
        'trailer',
        '<< /Size 6 /Root 1 0 R >>',
        'startxref',
        startXref.toString(),
        '%%EOF'
    ].join('\n');

    const fullPdf = header + obj1 + obj2 + obj3 + obj4 + obj5 + xref;
    return Buffer.from(fullPdf, 'utf8');
}
