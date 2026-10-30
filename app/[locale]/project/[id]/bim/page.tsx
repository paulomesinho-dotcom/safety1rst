'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import {
    Box,
    MapPin,
    Eye,
    Plus,
    Filter,
    Camera,
    Upload,
    CheckCircle2,
    AlertTriangle,
    ShieldAlert,
    FileText,
    Download,
    Trash2,
    Layers,
    RotateCcw,
    X,
    Maximize2,
    Minimize2,
    Building2,
    Calendar,
    User,
    Check,
    Search,
    ChevronRight,
    ChevronLeft,
    HelpCircle,
    Info,
    ExternalLink,
    Compass,
    FolderOpen,
    FolderPlus,
    Sliders,
    FolderTree,
    Sparkles,
    Loader2,
    HardHat,
    Flame,
    Navigation,
    Compass as CompassIcon,
    Radio,
    CircleDot,
    Truck,
    ShieldCheck,
    CheckSquare,
    Ruler,
    Edit3
} from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { SiteObservation, SiteLogisticsItem } from '@/types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Seed observations for realistic site demonstration
const SEED_OBSERVATIONS: Omit<SiteObservation, 'id' | 'createdAt'>[] = [
    {
        projectId: 'proj_1',
        title: 'Falta de guarda-corpos na bordadura norte do Piso 2',
        description: 'Vão exterior aberto sem proteção coletiva periférica. Risco iminente de queda em altura. Notificado encarregado da cofragem para reposição imediata.',
        category: 'safety_non_compliance',
        status: 'open',
        severity: 'critical',
        ifcGlobalId: '2O2Dwx$hn8Zwcx7qDF01AB',
        elementName: 'Laje Estrutural Piso 2 (IfcSlab)',
        storeyName: 'Piso 2',
        position: [-6, 6.8, 4],
        cameraPosition: [-12, 10, 10],
        cameraTarget: [-6, 6.8, 4],
        photos: ['https://images.unsplash.com/photo-1541888946425-d0fbb18f15f6?w=600&auto=format&fit=crop&q=80'],
        assignedToCompanyId: 'c1',
        createdByName: 'Eng. Manuel Gestor (Fiscal de Obra)'
    },
    {
        projectId: 'proj_1',
        title: 'Infiltração detetada na junta de dilatação',
        description: 'Verificada humidade anómala junto ao pilar P-04 após chuva forte. Necessário rever tela de impermeabilização.',
        category: 'visit_observation',
        status: 'in_progress',
        severity: 'medium',
        ifcGlobalId: '3A4bCde12FghIjklMnOpQr',
        elementName: 'Pilar P-04 (Betão Armado - IfcColumn)',
        storeyName: 'Piso 1',
        position: [4, 3.5, -4],
        cameraPosition: [8, 6, -1],
        cameraTarget: [4, 3.5, -4],
        photos: ['https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=600&auto=format&fit=crop&q=80'],
        assignedToCompanyId: 'c2',
        createdByName: 'Técnico de Segurança'
    },
    {
        projectId: 'proj_1',
        title: 'Inspeção de armadura de vigas aprovada',
        description: 'Verificação da bitola e espaçamento dos estribos no vão V-12 em estrita conformidade com o projeto de estabilidade.',
        category: 'quality_check',
        status: 'resolved',
        severity: 'low',
        ifcGlobalId: '1X9yZab34CdeFghiJklMno',
        elementName: 'Viga Periférica V-12 (IfcBeam)',
        storeyName: 'Piso 1',
        position: [0, 3.4, 5.5],
        cameraPosition: [0, 6, 12],
        cameraTarget: [0, 3.4, 5.5],
        photos: ['https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&auto=format&fit=crop&q=80'],
        assignedToCompanyId: 'c5',
        resolvedAt: new Date().toISOString(),
        resolvedBy: 'Fiscal de Obra',
        createdByName: 'Direção de Fiscalização'
    }
];

// Seed site logistics & emergency elements
const SEED_LOGISTICS_ITEMS: Omit<SiteLogisticsItem, 'id'>[] = [
    {
        projectId: 'proj_1',
        type: 'crane',
        name: 'Grua Torre Comansa 21LC (Lança 26m)',
        category: 'logistics',
        position: [13, 0, -7],
        radius: 26,
        notes: 'Raio de rotação com cobertura total dos pisos 1 e 2. Interdita sobrevoo da via pública.',
        status: 'active'
    },
    {
        projectId: 'proj_1',
        type: 'gate',
        name: 'Portaria Principal e Controlo Acessos (Portão 1)',
        category: 'logistics',
        position: [-14, 0, 11],
        notes: 'Torniquete com leitor biométrico e registo SafeSite.',
        status: 'active'
    },
    {
        projectId: 'proj_1',
        type: 'office_container',
        name: 'Módulo de Escritório e Balneários de Obra',
        category: 'logistics',
        position: [-13, 0, -7],
        notes: 'Contentores duplos sobrepostos com vestiários e sanitários.',
        status: 'active'
    },
    {
        projectId: 'proj_1',
        type: 'waste_bay',
        name: 'Parque de Triagem e Baia de RCDs',
        category: 'logistics',
        position: [12, 0, 9],
        notes: 'Contentores separados para Inertes, Madeiras e Metais.',
        status: 'active'
    },
    {
        projectId: 'proj_1',
        type: 'meeting_point',
        name: 'Ponto de Encontro de Emergência (PE-01)',
        category: 'emergency',
        position: [-16, 0, 14],
        radius: 6,
        notes: 'Local seguro amplo no exterior junto ao acesso principal.',
        status: 'active'
    },
    {
        projectId: 'proj_1',
        type: 'first_aid',
        name: 'Posto de Primeiros Socorros & Maca de Resgate',
        category: 'emergency',
        position: [-10, 0, -7],
        notes: 'Equipado com desfibrilhador automático externo (DAE) e estojo de queimaduras.',
        status: 'active'
    },
    {
        projectId: 'proj_1',
        type: 'fire_extinguisher',
        name: 'Posto de Extintor P0 (Pó Químico 6kg ABC)',
        category: 'emergency',
        position: [-1, 0.4, 7.2],
        notes: 'Verificação periódica trimestral em dia.',
        status: 'active'
    },
    {
        projectId: 'proj_1',
        type: 'evacuation_route',
        name: 'Via de Evacuação e Saída de Emergência',
        category: 'emergency',
        position: [-5, 0.1, 7],
        notes: 'Desimpedida, com largura mínima de 1.40m e sinalética fotoluminescente.',
        status: 'active'
    }
];

// 2D Drawings catalog in project CDE
interface CdeDrawing2D {
    id: string;
    code: string;
    title: string;
    discipline: 'architecture' | 'structure' | 'mep' | 'safety';
    storey: string;
    format: string;
    revision: string;
    fileName: string;
    date: string;
}

const DEFAULT_2D_DRAWINGS: CdeDrawing2D[] = [
    {
        id: 'drw-1',
        code: 'ARQ-01',
        title: 'Planta de Implantação e Piso 0 (R/C)',
        discipline: 'architecture',
        storey: 'Piso 0',
        format: 'A1 (1:100)',
        revision: 'Rev. 03',
        fileName: 'P01-ARQ-Planta-Piso0-Licenciamento.pdf',
        date: '2026-04-12'
    },
    {
        id: 'drw-2',
        code: 'EST-02',
        title: 'Armaduras de Laje e Vigas - Piso 1',
        discipline: 'structure',
        storey: 'Piso 1',
        format: 'A0 (1:50)',
        revision: 'Rev. 02',
        fileName: 'P02-EST-Armaduras-Laje-Vigas-P1.pdf',
        date: '2026-04-20'
    },
    {
        id: 'drw-3',
        code: 'EST-03',
        title: 'Pormenorização de Pilares e Núcleo - Piso 2',
        discipline: 'structure',
        storey: 'Piso 2',
        format: 'A1 (1:50)',
        revision: 'Rev. 01',
        fileName: 'P03-EST-Pilares-Nucleo-Piso2.pdf',
        date: '2026-04-28'
    },
    {
        id: 'drw-4',
        code: 'PSS-01',
        title: 'Planta de Estaleiro e Segurança (PSS) - Grua e Vias',
        discipline: 'safety',
        storey: 'Exterior',
        format: 'A1 (1:200)',
        revision: 'Rev. 04',
        fileName: 'EST-01-Plano-Seguranca-Estaleiro.pdf',
        date: '2026-05-10'
    }
];

export default function BimViewerPage() {
    const params = useParams();
    const projectId = (params?.id as string) || 'proj_1';

    const {
        projects,
        companies,
        currentUser,
        siteObservations,
        addSiteObservation,
        updateSiteObservation,
        deleteSiteObservation,
        siteLogisticsItems,
        addSiteLogisticsItem,
        updateSiteLogisticsItem,
        deleteSiteLogisticsItem,
    } = useStore();

    const currentProject = projects.find(p => p.id === projectId) || { name: 'Obra Skyline Tower' };

    // Canvas & Three.js references
    const mountRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const bimGroupRef = useRef<THREE.Group | null>(null);
    const pinsGroupRef = useRef<THREE.Group | null>(null);
    const logisticsGroupRef = useRef<THREE.Group | null>(null);
    const grid2dGroupRef = useRef<THREE.Group | null>(null);
    const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
    const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());

    // Navigation and Visualization States
    const [viewDimension, setViewDimension] = useState<'3d' | '2d'>('3d');
    const [activeMode, setActiveMode] = useState<'navigate' | 'add_point' | 'add_logistics' | 'add_emergency'>('navigate');
    const [selectedDiscipline, setSelectedDiscipline] = useState<'all' | 'structure' | 'architecture' | 'mep' | 'safety'>('all');
    const [selectedStorey, setSelectedStorey] = useState<string>('all');
    const [ghostMode, setGhostMode] = useState<boolean>(true);

    // Layer Visibility
    const [showObservationsLayer, setShowObservationsLayer] = useState(true);
    const [showLogisticsLayer, setShowLogisticsLayer] = useState(true);
    const [showEmergencyLayer, setShowEmergencyLayer] = useState(true);

    // Left Panel Tabs: 'models' | 'logistics' | 'hierarchy'
    const [leftPanelTab, setLeftPanelTab] = useState<'models' | 'logistics' | 'hierarchy'>('models');
    const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
    const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isDraggingFile, setIsDraggingFile] = useState(false);

    // Selected Equipment to Place
    const [pendingPlacementType, setPendingPlacementType] = useState<SiteLogisticsItem['type'] | null>(null);

    // Element & Observation states
    const [selectedElement, setSelectedElement] = useState<any | null>(null);
    const [activePin, setActivePin] = useState<SiteObservation | null>(null);
    const [activeLogisticsItem, setActiveLogisticsItem] = useState<SiteLogisticsItem | null>(null);
    const [searchFilter, setSearchFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

    // Dynamic Loading States
    const [isLoadingModel, setIsLoadingModel] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [loadedIfcName, setLoadedIfcName] = useState<string | null>(null);
    const [isCreatingCdeFolders, setIsCreatingCdeFolders] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isCdeHelpOpen, setIsCdeHelpOpen] = useState(false);
    const [is2dDrawingsModalOpen, setIs2dDrawingsModalOpen] = useState(false);
    const [selected2dDrawing, setSelected2dDrawing] = useState<CdeDrawing2D | null>(null);

    // Form data for new point
    const [pendingPinData, setPendingPinData] = useState<{
        position: [number, number, number];
        cameraPosition: [number, number, number];
        cameraTarget: [number, number, number];
        ifcGlobalId: string;
        elementName: string;
        storeyName: string;
        discipline?: string;
    } | null>(null);

    const [formTitle, setFormTitle] = useState('');
    const [formDesc, setFormDesc] = useState('');
    const [formCategory, setFormCategory] = useState<SiteObservation['category']>('visit_observation');
    const [formSeverity, setFormSeverity] = useState<SiteObservation['severity']>('medium');
    const [formCompanyId, setFormCompanyId] = useState('');
    const [formPhoto, setFormPhoto] = useState('');

    // Trigger toast notification
    const showToast = useCallback((msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 4000);
    }, []);

    // Filter project observations and logistics items
    const projectObservations = useMemo(() => {
        return (siteObservations || []).filter(o => o.projectId === projectId);
    }, [siteObservations, projectId]);

    const projectLogistics = useMemo(() => {
        return (siteLogisticsItems || []).filter(l => l.projectId === projectId);
    }, [siteLogisticsItems, projectId]);

    // Seed default observations and logistics elements if empty
    useEffect(() => {
        if (!siteObservations || siteObservations.length === 0) {
            for (const seed of SEED_OBSERVATIONS) {
                addSiteObservation({
                    ...seed,
                    projectId,
                });
            }
        }
        if (!siteLogisticsItems || siteLogisticsItems.length === 0) {
            for (const seed of SEED_LOGISTICS_ITEMS) {
                addSiteLogisticsItem({
                    ...seed,
                    projectId,
                });
            }
        }
    }, [projectId, siteObservations, siteLogisticsItems, addSiteObservation, addSiteLogisticsItem]);

    // Build the Base Procedural BIM Model
    const buildDefaultBimBuilding = useCallback((group: THREE.Group) => {
        group.clear();

        const concreteMat = new THREE.MeshStandardMaterial({ color: 0xd4d8d1, roughness: 0.75, metalness: 0.05 });
        const slabMat = new THREE.MeshStandardMaterial({ color: 0xe2e5df, roughness: 0.7, metalness: 0.1 });
        const columnMat = new THREE.MeshStandardMaterial({ color: 0xbac0b7, roughness: 0.8, metalness: 0.05 });
        const beamMat = new THREE.MeshStandardMaterial({ color: 0xadb4a9, roughness: 0.75, metalness: 0.05 });
        const glassMat = new THREE.MeshPhysicalMaterial({
            color: 0x93c5fd,
            transparent: true,
            opacity: 0.45,
            roughness: 0.1,
            transmission: 0.8,
            thickness: 0.3
        });
        const brickMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.85 });
        const mepDuctMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3, metalness: 0.7 });

        const addMesh = (
            mesh: THREE.Mesh,
            ifcId: string,
            name: string,
            storey: string,
            category: string,
            discipline: 'structure' | 'architecture' | 'mep' | 'safety'
        ) => {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.userData = {
                isIfcElement: true,
                ifcGlobalId: ifcId,
                elementName: name,
                storey,
                category,
                discipline,
                originalMaterial: mesh.material,
            };
            group.add(mesh);
        };

        const gridX = [-7, -2.5, 2.5, 7];
        const gridZ = [-5, 0, 5];

        // 1. PISO 0: Fundações & R/C
        const f0Slab = new THREE.Mesh(new THREE.BoxGeometry(20, 0.6, 14), slabMat);
        f0Slab.position.set(0, 0.3, 0);
        addMesh(f0Slab, '0A1_SLAB_F0', 'Laje Maciça de Fundação e R/C (IfcSlab)', 'Piso 0', 'Slab', 'structure');

        const coreWall = new THREE.Mesh(new THREE.BoxGeometry(4, 9.5, 3), concreteMat);
        coreWall.position.set(0, 4.75, 0);
        addMesh(coreWall, '0_CORE_WALLS', 'Núcleo Resistente de Betão Armado / Caixa de Elevador (IfcWall)', 'Piso 0', 'Core', 'structure');

        let colIdx = 1;
        for (const x of gridX) {
            for (const z of gridZ) {
                if (Math.abs(x) < 3 && Math.abs(z) < 2) continue;
                const col = new THREE.Mesh(new THREE.BoxGeometry(0.6, 3, 0.6), columnMat);
                col.position.set(x, 1.8, z);
                addMesh(col, `0_COL_P0_${colIdx}`, `Pilar P-0${colIdx} R/C 60x60 (IfcColumn)`, 'Piso 0', 'Column', 'structure');
                colIdx++;
            }
        }

        const f0Glass = new THREE.Mesh(new THREE.BoxGeometry(19.6, 2.8, 0.1), glassMat);
        f0Glass.position.set(0, 1.8, 6.8);
        addMesh(f0Glass, '0_CURTAIN_F0_S', 'Fachada de Vidro Cortina R/C (IfcCurtainWall)', 'Piso 0', 'CurtainWall', 'architecture');

        // 2. PISO 1: Estrutura e Alvenarias
        const f1Slab = new THREE.Mesh(new THREE.BoxGeometry(20.4, 0.5, 14.4), slabMat);
        f1Slab.position.set(0, 3.45, 0);
        addMesh(f1Slab, '1B2_SLAB_F1', 'Laje Vigada Piso 1 (IfcSlab)', 'Piso 1', 'Slab', 'structure');

        const b1Front = new THREE.Mesh(new THREE.BoxGeometry(20.4, 0.6, 0.5), beamMat);
        b1Front.position.set(0, 3.2, 7);
        addMesh(b1Front, '1X9yZab34CdeFghiJklMno', 'Viga Periférica V-12 (IfcBeam)', 'Piso 1', 'Beam', 'structure');

        colIdx = 1;
        for (const x of gridX) {
            for (const z of gridZ) {
                if (Math.abs(x) < 3 && Math.abs(z) < 2) continue;
                const col = new THREE.Mesh(new THREE.BoxGeometry(0.55, 3, 0.55), columnMat);
                col.position.set(x, 4.95, z);
                addMesh(col, `3A4bCde12FghIjklMnOpQr_${colIdx}`, `Pilar Estrutural P-1${colIdx} (IfcColumn)`, 'Piso 1', 'Column', 'structure');
                colIdx++;
            }
        }

        const f1Wall = new THREE.Mesh(new THREE.BoxGeometry(9, 2.8, 0.3), brickMat);
        f1Wall.position.set(-4.5, 4.85, -6.8);
        addMesh(f1Wall, '1_WALL_BRICK_F1', 'Parede Alvenaria Térmica Fachada Norte (IfcWall)', 'Piso 1', 'Wall', 'architecture');

        // MEP Piso 1: Condutas
        const mepDuctF1 = new THREE.Mesh(new THREE.BoxGeometry(16, 0.35, 0.4), mepDuctMat);
        mepDuctF1.position.set(0, 3.0, 3.2);
        addMesh(mepDuctF1, '1_MEP_DUCT_F1', 'Conduta Principal de Insuflação AVAC (IfcFlowSegment)', 'Piso 1', 'Duct', 'mep');

        // 3. PISO 2: Frente de Trabalho Ativa
        const f2Slab = new THREE.Mesh(new THREE.BoxGeometry(20.4, 0.5, 14.4), slabMat);
        f2Slab.position.set(0, 6.65, 0);
        addMesh(f2Slab, '2O2Dwx$hn8Zwcx7qDF01AB', 'Laje Estrutural Piso 2 (IfcSlab)', 'Piso 2', 'Slab', 'structure');

        colIdx = 1;
        for (const x of gridX) {
            for (const z of gridZ) {
                if (Math.abs(x) < 3 && Math.abs(z) < 2) continue;
                const col = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.8, 0.5), columnMat);
                col.position.set(x, 8.05, z);
                addMesh(col, `2_COL_P2_${colIdx}`, `Pilar Estrutura P-2${colIdx} (IfcColumn)`, 'Piso 2', 'Column', 'structure');
                colIdx++;
            }
        }

        // 4. COBERTURA
        const roofSlab = new THREE.Mesh(new THREE.BoxGeometry(16, 0.4, 11), slabMat);
        roofSlab.position.set(0, 9.6, 0);
        addMesh(roofSlab, '3_ROOF_SLAB', 'Laje da Cobertura e Desvão Técnico (IfcRoof)', 'Cobertura', 'Roof', 'architecture');
    }, []);

    // Create 2D Structural Grid Overlays (Axes A, B, C, D and 1, 2, 3, 4)
    const build2dStructuralGrid = useCallback((group: THREE.Group) => {
        group.clear();

        const gridMat = new THREE.LineBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.6 });
        const axisColor = 0x2563eb;

        const gridX = [-7, -2.5, 2.5, 7];
        const gridZ = [-5, 0, 5];

        gridX.forEach((x) => {
            const points = [
                new THREE.Vector3(x, 0.05, -9),
                new THREE.Vector3(x, 0.05, 9)
            ];
            const geom = new THREE.BufferGeometry().setFromPoints(points);
            group.add(new THREE.Line(geom, gridMat));

            const circleGeo = new THREE.CircleGeometry(0.45, 24);
            const circleMat = new THREE.MeshBasicMaterial({ color: axisColor });
            const bubble = new THREE.Mesh(circleGeo, circleMat);
            bubble.rotation.x = -Math.PI / 2;
            bubble.position.set(x, 0.06, 9.6);
            group.add(bubble);
        });

        gridZ.forEach((z) => {
            const points = [
                new THREE.Vector3(-11, 0.05, z),
                new THREE.Vector3(11, 0.05, z)
            ];
            const geom = new THREE.BufferGeometry().setFromPoints(points);
            group.add(new THREE.Line(geom, gridMat));

            const circleGeo = new THREE.CircleGeometry(0.45, 24);
            const circleMat = new THREE.MeshBasicMaterial({ color: axisColor });
            const bubble = new THREE.Mesh(circleGeo, circleMat);
            bubble.rotation.x = -Math.PI / 2;
            bubble.position.set(-11.6, 0.06, z);
            group.add(bubble);
        });
    }, []);

    // Render 3D and 2D Meshes for Estaleiro & Emergência Items
    const renderLogisticsAndEmergencyItems = useCallback((group: THREE.Group, items: SiteLogisticsItem[]) => {
        group.clear();

        items.forEach((item) => {
            const itemGroup = new THREE.Group();
            itemGroup.position.set(item.position[0], item.position[1], item.position[2]);
            itemGroup.userData = { logisticsItem: item };

            if (item.type === 'crane') {
                // Tower Crane
                const craneMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35, metalness: 0.4 });
                const mast = new THREE.Mesh(new THREE.BoxGeometry(1.0, 18, 1.0), craneMat);
                mast.position.y = 9;
                mast.castShadow = true;
                itemGroup.add(mast);

                const jib = new THREE.Mesh(new THREE.BoxGeometry(item.radius || 26, 0.6, 0.6), craneMat);
                jib.position.set(6, 18.2, 0);
                itemGroup.add(jib);

                // Crane radius coverage area on ground
                const radiusGeo = new THREE.RingGeometry((item.radius || 26) - 0.2, item.radius || 26, 64);
                const radiusMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide, transparent: true, opacity: 0.45 });
                const ring = new THREE.Mesh(radiusGeo, radiusMat);
                ring.rotation.x = -Math.PI / 2;
                ring.position.y = 0.08;
                itemGroup.add(ring);
            } else if (item.type === 'office_container' || item.type === 'dining_container') {
                // Site Office / Rest Container (6 x 2.4 x 2.6m)
                const containerMat = new THREE.MeshStandardMaterial({
                    color: item.type === 'office_container' ? 0x1e3a8a : 0x475569,
                    roughness: 0.4
                });
                const container = new THREE.Mesh(new THREE.BoxGeometry(6, 2.6, 2.4), containerMat);
                container.position.y = 1.3;
                container.castShadow = true;
                itemGroup.add(container);
            } else if (item.type === 'gate') {
                // Gate & Turnstile Barrier
                const gateMat = new THREE.MeshStandardMaterial({ color: 0x0284c7 });
                const post1 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.4), gateMat);
                post1.position.set(-1.8, 1.2, 0);
                const post2 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.4), gateMat);
                post2.position.set(1.8, 1.2, 0);
                const bar = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.1, 0.1), gateMat);
                bar.position.set(0, 1.1, 0);
                itemGroup.add(post1, post2, bar);
            } else if (item.type === 'waste_bay') {
                // RCD Waste Bays (3 separated bays)
                const bayMat = new THREE.MeshStandardMaterial({ color: 0x15803d });
                const bay = new THREE.Mesh(new THREE.BoxGeometry(5, 1.5, 3), bayMat);
                bay.position.y = 0.75;
                itemGroup.add(bay);
            } else if (item.type === 'meeting_point') {
                // Emergency Muster Point (Green ISO 7010)
                const greenMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.3 });
                const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.2), greenMat);
                pole.position.y = 1.6;
                const sign = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 0.08), greenMat);
                sign.position.y = 3.2;
                itemGroup.add(pole, sign);

                // Safe assembly circle on floor
                const circleGeo = new THREE.RingGeometry(4.8, 5.0, 48);
                const circleMat = new THREE.MeshBasicMaterial({ color: 0x16a34a, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
                const assemblyRing = new THREE.Mesh(circleGeo, circleMat);
                assemblyRing.rotation.x = -Math.PI / 2;
                assemblyRing.position.y = 0.06;
                itemGroup.add(assemblyRing);
            } else if (item.type === 'fire_extinguisher') {
                // Fire Extinguisher (Red cylinder + sign)
                const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626 });
                const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.7), redMat);
                cyl.position.y = 0.5;
                const sign = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.04), redMat);
                sign.position.y = 1.2;
                itemGroup.add(cyl, sign);
            } else if (item.type === 'first_aid') {
                // First Aid Post (White container with green cross)
                const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 });
                const box = new THREE.Mesh(new THREE.BoxGeometry(3, 2.4, 2.4), whiteMat);
                box.position.y = 1.2;
                itemGroup.add(box);
            } else if (item.type === 'evacuation_route') {
                // Evacuation Route Chevron on Floor
                const greenMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.8 });
                const arrow = new THREE.Mesh(new THREE.BoxGeometry(4, 0.04, 1.2), greenMat);
                arrow.position.y = 0.05;
                itemGroup.add(arrow);
            }

            group.add(itemGroup);
        });
    }, []);

    // Initialize Three.js Scene
    useEffect(() => {
        if (!mountRef.current) return;
        const container = mountRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf8fafc);
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        camera.position.set(22, 18, 26);
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;
        container.replaceChildren(renderer.domElement);
        rendererRef.current = renderer;

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.maxDistance = 160;
        controls.minDistance = 2;
        controls.maxPolarAngle = Math.PI / 2 + 0.02;
        controls.target.set(0, 4.5, 0);
        controlsRef.current = controls;

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
        scene.add(ambientLight);

        const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x94a3b8, 0.45);
        scene.add(hemiLight);

        const sunLight = new THREE.DirectionalLight(0xfffaed, 1.3);
        sunLight.position.set(35, 45, 25);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.bias = -0.0004;
        scene.add(sunLight);

        const fillLight = new THREE.DirectionalLight(0xbfdbfe, 0.35);
        fillLight.position.set(-25, 20, -25);
        scene.add(fillLight);

        // Ground and subtle grid
        const gridHelper = new THREE.GridHelper(60, 60, 0x94a3b8, 0xe2e8f0);
        gridHelper.position.y = -0.02;
        scene.add(gridHelper);

        const groundGeo = new THREE.PlaneGeometry(120, 120);
        const groundMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.95 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.05;
        ground.receiveShadow = true;
        scene.add(ground);

        // Groups
        const bimGroup = new THREE.Group();
        bimGroup.name = 'BimBuildingModel';
        scene.add(bimGroup);
        bimGroupRef.current = bimGroup;

        const logisticsGroup = new THREE.Group();
        logisticsGroup.name = 'LogisticsGroup';
        scene.add(logisticsGroup);
        logisticsGroupRef.current = logisticsGroup;

        const grid2dGroup = new THREE.Group();
        grid2dGroup.name = 'Grid2DGroup';
        grid2dGroup.visible = false;
        scene.add(grid2dGroup);
        grid2dGroupRef.current = grid2dGroup;
        build2dStructuralGrid(grid2dGroup);

        const pinsGroup = new THREE.Group();
        pinsGroup.name = 'PinsGroup';
        scene.add(pinsGroup);
        pinsGroupRef.current = pinsGroup;

        buildDefaultBimBuilding(bimGroup);

        let animationFrameId: number;
        const clock = new THREE.Clock();

        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            controls.update();

            const elapsedTime = clock.getElapsedTime();
            if (pinsGroupRef.current) {
                pinsGroupRef.current.children.forEach((pin, index) => {
                    const wave = Math.sin(elapsedTime * 2.8 + index * 0.7) * 0.08;
                    pin.position.y = (pin.userData.baseY || pin.position.y) + wave;
                });
            }

            renderer.render(scene, camera);
        };
        animate();

        const handleResize = () => {
            if (!container || !rendererRef.current || !cameraRef.current) return;
            const w = container.clientWidth;
            const h = container.clientHeight;
            cameraRef.current.aspect = w / h;
            cameraRef.current.updateProjectionMatrix();
            rendererRef.current.setSize(w, h);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
            renderer.dispose();
            controls.dispose();
        };
    }, [buildDefaultBimBuilding, build2dStructuralGrid]);

    // Re-render Logistics & Emergency Items when data or layer visibility changes
    useEffect(() => {
        if (!logisticsGroupRef.current) return;
        const filtered = projectLogistics.filter(item => {
            if (item.category === 'logistics' && !showLogisticsLayer) return false;
            if (item.category === 'emergency' && !showEmergencyLayer) return false;
            return true;
        });
        renderLogisticsAndEmergencyItems(logisticsGroupRef.current, filtered);
    }, [projectLogistics, showLogisticsLayer, showEmergencyLayer, renderLogisticsAndEmergencyItems]);

    // Handle Discipline and Storey Filtering
    useEffect(() => {
        if (!bimGroupRef.current) return;

        bimGroupRef.current.traverse((child) => {
            if (child instanceof THREE.Mesh && child.userData.isIfcElement) {
                const elementStorey = child.userData.storey;
                const elementDiscipline = child.userData.discipline || 'structure';

                const matchesStorey = selectedStorey === 'all' || elementStorey === selectedStorey || elementStorey === 'Exterior';
                const matchesDiscipline = selectedDiscipline === 'all' || elementDiscipline === selectedDiscipline;

                if (matchesStorey && matchesDiscipline) {
                    child.visible = true;
                    if (child.material) {
                        child.material.transparent = Boolean(child.userData.category === 'CurtainWall');
                        child.material.opacity = child.userData.category === 'CurtainWall' ? 0.45 : 1.0;
                        child.material.depthWrite = true;
                    }
                } else if (!matchesStorey) {
                    child.visible = false;
                } else {
                    if (ghostMode) {
                        child.visible = true;
                        if (child.material) {
                            child.material.transparent = true;
                            child.material.opacity = 0.08;
                            child.material.depthWrite = false;
                        }
                    } else {
                        child.visible = false;
                    }
                }
            }
        });
    }, [selectedDiscipline, selectedStorey, ghostMode]);

    // Toggle 2D vs 3D View Dimension
    const handleToggleViewDimension = (mode: '3d' | '2d') => {
        setViewDimension(mode);
        if (!cameraRef.current || !controlsRef.current) return;

        if (grid2dGroupRef.current) {
            grid2dGroupRef.current.visible = (mode === '2d');
        }

        if (mode === '2d') {
            const targetY = selectedStorey === 'Piso 0' ? 2 : selectedStorey === 'Piso 1' ? 5 : selectedStorey === 'Piso 2' ? 8 : 4;
            cameraRef.current.position.set(0, 36, 0.01);
            controlsRef.current.target.set(0, targetY, 0);
            controlsRef.current.maxPolarAngle = 0.01;
            controlsRef.current.minPolarAngle = 0.0;
            controlsRef.current.update();
            showToast('Modo Planta Técnica 2D ativado com eixos e cotas de emergência.');
        } else {
            cameraRef.current.position.set(22, 18, 26);
            controlsRef.current.target.set(0, 4.5, 0);
            controlsRef.current.maxPolarAngle = Math.PI / 2 + 0.02;
            controlsRef.current.minPolarAngle = 0.0;
            controlsRef.current.update();
            showToast('Modo Perspetiva 3D ativado.');
        }
    };

    // Render 3D Observation Pins in Scene
    useEffect(() => {
        if (!pinsGroupRef.current) return;
        const pinsGroup = pinsGroupRef.current;
        pinsGroup.clear();

        if (!showObservationsLayer) return;

        projectObservations.forEach((obs) => {
            const pinContainer = new THREE.Group();
            pinContainer.position.set(obs.position[0], obs.position[1], obs.position[2]);
            pinContainer.userData = {
                observation: obs,
                baseY: obs.position[1],
            };

            let colorHex = 0x3b82f6;
            if (obs.status === 'resolved') {
                colorHex = 0x10b981;
            } else if (obs.severity === 'critical' || obs.severity === 'high') {
                colorHex = 0xef4444;
            } else if (obs.severity === 'medium') {
                colorHex = 0xf59e0b;
            }

            const stemGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.85);
            const stemMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
            const stem = new THREE.Mesh(stemGeo, stemMat);
            stem.position.y = 0.42;
            pinContainer.add(stem);

            const headGeo = new THREE.SphereGeometry(0.32, 16, 16);
            const headMat = new THREE.MeshStandardMaterial({
                color: colorHex,
                emissive: colorHex,
                emissiveIntensity: 0.65,
                roughness: 0.2,
                metalness: 0.7
            });
            const head = new THREE.Mesh(headGeo, headMat);
            head.position.y = 0.85;
            head.castShadow = true;
            pinContainer.add(head);

            const ringGeo = new THREE.RingGeometry(0.25, 0.45, 24);
            const ringMat = new THREE.MeshBasicMaterial({ color: colorHex, side: THREE.DoubleSide, transparent: true, opacity: 0.65 });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = -Math.PI / 2;
            ring.position.y = 0.02;
            pinContainer.add(ring);

            pinsGroup.add(pinContainer);
        });
    }, [projectObservations, showObservationsLayer]);

    // Handle Canvas Click (Raycasting for inspection points and logistics placement)
    const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!mountRef.current || !cameraRef.current || !sceneRef.current) return;
        const rect = mountRef.current.getBoundingClientRect();
        mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

        // 1. Raycast on existing observations
        if (pinsGroupRef.current) {
            const pinIntersects = raycasterRef.current.intersectObjects(pinsGroupRef.current.children, true);
            if (pinIntersects.length > 0) {
                let targetGroup: any = pinIntersects[0].object;
                while (targetGroup.parent && targetGroup.parent !== pinsGroupRef.current) {
                    targetGroup = targetGroup.parent;
                }
                if (targetGroup?.userData?.observation) {
                    setActivePin(targetGroup.userData.observation);
                    setSelectedElement(null);
                    setActiveLogisticsItem(null);
                    return;
                }
            }
        }

        // 2. Raycast on logistics items
        if (logisticsGroupRef.current) {
            const logIntersects = raycasterRef.current.intersectObjects(logisticsGroupRef.current.children, true);
            if (logIntersects.length > 0) {
                let targetGroup: any = logIntersects[0].object;
                while (targetGroup.parent && targetGroup.parent !== logisticsGroupRef.current) {
                    targetGroup = targetGroup.parent;
                }
                if (targetGroup?.userData?.logisticsItem) {
                    setActiveLogisticsItem(targetGroup.userData.logisticsItem);
                    setSelectedElement(null);
                    setActivePin(null);
                    return;
                }
            }
        }

        // 3. Placement mode for Estaleiro & Emergência
        if (activeMode === 'add_logistics' || activeMode === 'add_emergency') {
            const groundIntersects = raycasterRef.current.intersectObjects(sceneRef.current.children, true);
            if (groundIntersects.length > 0) {
                const point = groundIntersects[0].point;
                const type = pendingPlacementType || (activeMode === 'add_emergency' ? 'meeting_point' : 'office_container');

                addSiteLogisticsItem({
                    projectId,
                    type,
                    name: type === 'meeting_point' ? 'Ponto de Encontro de Emergência' :
                          type === 'fire_extinguisher' ? 'Extintor de Incêndio' :
                          type === 'first_aid' ? 'Posto de Primeiros Socorros' :
                          type === 'crane' ? 'Grua Torre de Estaleiro' :
                          type === 'gate' ? 'Portaria e Controlo de Acesso' :
                          type === 'waste_bay' ? 'Baia de Triagem RCDs' : 'Módulo de Contentor',
                    category: activeMode === 'add_emergency' ? 'emergency' : 'logistics',
                    position: [Number(point.x.toFixed(2)), 0, Number(point.z.toFixed(2))],
                    status: 'active',
                    notes: `Posicionado na planta em ${new Date().toLocaleDateString('pt-PT')}`
                });

                setActiveMode('navigate');
                setPendingPlacementType(null);
                showToast('Equipamento posicionado na planta de estaleiro/emergência com sucesso!');
                return;
            }
        }

        // 4. Raycast on Building IFC Elements
        if (bimGroupRef.current) {
            const intersects = raycasterRef.current.intersectObjects(bimGroupRef.current.children, true);
            if (intersects.length > 0) {
                const hit = intersects[0];
                const mesh = hit.object as THREE.Mesh;
                const point = hit.point;

                if (mesh.userData?.isIfcElement) {
                    setSelectedElement(mesh.userData);
                    setActivePin(null);
                    setActiveLogisticsItem(null);

                    if (activeMode === 'add_point') {
                        const camPos = cameraRef.current.position;
                        const camTarget = controlsRef.current?.target || new THREE.Vector3(0, 0, 0);

                        setPendingPinData({
                            position: [Number(point.x.toFixed(2)), Number(point.y.toFixed(2)), Number(point.z.toFixed(2))],
                            cameraPosition: [Number(camPos.x.toFixed(2)), Number(camPos.y.toFixed(2)), Number(camPos.z.toFixed(2))],
                            cameraTarget: [Number(camTarget.x.toFixed(2)), Number(camTarget.y.toFixed(2)), Number(camTarget.z.toFixed(2))],
                            ifcGlobalId: mesh.userData.ifcGlobalId || 'IFC_ELEMENT',
                            elementName: mesh.userData.elementName || 'Elemento de Obra',
                            storeyName: mesh.userData.storey || 'Piso Atual',
                            discipline: mesh.userData.discipline
                        });

                        setFormTitle('');
                        setFormDesc('');
                        setFormCategory('visit_observation');
                        setFormSeverity('medium');
                        setFormCompanyId(companies[0]?.id || '');
                        setFormPhoto('');
                        setIsCreateModalOpen(true);
                    }
                }
            } else {
                setSelectedElement(null);
                setActivePin(null);
                setActiveLogisticsItem(null);
            }
        }
    };

    // Fly camera smoothly to target observation
    const flyToObservation = (obs: SiteObservation) => {
        if (!controlsRef.current || !cameraRef.current) return;
        const target = new THREE.Vector3(obs.position[0], obs.position[1], obs.position[2]);
        const offset = new THREE.Vector3(6, 4, 6);
        const destination = target.clone().add(offset);

        let step = 0;
        const initialPos = cameraRef.current.position.clone();
        const initialTarget = controlsRef.current.target.clone();

        const animateFly = () => {
            step += 0.05;
            if (step <= 1) {
                cameraRef.current?.position.lerpVectors(initialPos, destination, step);
                controlsRef.current?.target.lerpVectors(initialTarget, target, step);
                controlsRef.current?.update();
                requestAnimationFrame(animateFly);
            } else {
                cameraRef.current?.position.copy(destination);
                controlsRef.current?.target.copy(target);
                controlsRef.current?.update();
            }
        };
        animateFly();
        setActivePin(obs);
    };

    // Create CDE Folders directly at project root
    const handleCreateCdeFolders = async () => {
        setIsCreatingCdeFolders(true);
        showToast('A criar pastas "Modelos BIM (IFC)" e "Desenhos 2D" na raiz do projeto...');

        try {
            const res = await fetch(`/api/projects/${projectId}/cde/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'init_project_bim_structure' })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Erro ao comunicar com o CDE');
            }

            showToast('Estrutura de pastas BIM e 2D criada com sucesso na raiz do projeto!');
            alert('Pastas criadas com sucesso na raiz do projeto:\n📁 Modelos BIM (IFC)/\n   ├── 📁 01-Arquitetura/\n   ├── 📁 02-Estruturas/\n   └── 📁 03-Especialidades (MEP)/\n📁 Desenhos 2D (Plantas e Cortes)/');
        } catch (err: any) {
            console.error('Erro CDE:', err);
            alert(`Aviso CDE: ${err.message || 'Verifique se o CDE está ligado nas Definições do Projeto.'}`);
        } finally {
            setIsCreatingCdeFolders(false);
        }
    };

    // Real IFC File Parser & Scene Replacement
    const handleProcessIfcFile = async (file: File) => {
        setIsLoadingModel(true);
        setLoadingMessage(`A ler ficheiro IFC "${file.name}" (${(file.size / (1024 * 1024)).toFixed(2)} MB)...`);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const bimGroup = bimGroupRef.current;
            if (!bimGroup) throw new Error('Cena 3D não inicializada');

            setLoadingMessage('A inicializar motor WebAssembly WebIFC...');

            const WebIFC = await import('web-ifc');
            const ifcApi = new WebIFC.IfcAPI();
            ifcApi.SetWasmPath('/wasm/', true);
            await ifcApi.Init((wasmName: string) => `/wasm/${wasmName}`);

            setLoadingMessage('A extrair geometria e elementos tridimensionais...');

            const uint8 = new Uint8Array(arrayBuffer);
            let modelId: number | null = null;
            let loadedMeshesCount = 0;

            try {
                modelId = ifcApi.OpenModel(uint8);
                const flatMeshes = ifcApi.LoadAllGeometry(modelId);
                const meshCount = flatMeshes.size();

                if (meshCount > 0) {
                    bimGroup.clear();

                    const defaultPbrMat = new THREE.MeshStandardMaterial({
                        color: 0xc8d1c0,
                        roughness: 0.65,
                        metalness: 0.1
                    });

                    for (let i = 0; i < meshCount; i++) {
                        const flatMesh = flatMeshes.get(i);
                        const expressID = flatMesh.expressID;
                        const placedGeometries = flatMesh.geometries;

                        for (let j = 0; j < placedGeometries.size(); j++) {
                            const placed = placedGeometries.get(j);
                            const geomData = ifcApi.GetGeometry(modelId, placed.geometryExpressID);
                            const vData = ifcApi.GetVertexArray(geomData.GetVertexData(), geomData.GetVertexDataSize());
                            const iData = ifcApi.GetIndexArray(geomData.GetIndexData(), geomData.GetIndexDataSize());

                            if (vData.length === 0 || iData.length === 0) continue;

                            const geometry = new THREE.BufferGeometry();
                            const positions: number[] = [];
                            const normals: number[] = [];

                            for (let k = 0; k < vData.length; k += 6) {
                                positions.push(vData[k], vData[k + 1], vData[k + 2]);
                                normals.push(vData[k + 3], vData[k + 4], vData[k + 5]);
                            }

                            geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
                            geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
                            geometry.setIndex(Array.from(iData));

                            const matrix = new THREE.Matrix4();
                            matrix.fromArray(placed.flatTransformation);
                            geometry.applyMatrix4(matrix);

                            let mat = defaultPbrMat;
                            if (placed.color && (placed.color.x > 0 || placed.color.y > 0 || placed.color.z > 0)) {
                                mat = new THREE.MeshStandardMaterial({
                                    color: new THREE.Color(placed.color.x, placed.color.y, placed.color.z),
                                    transparent: placed.color.w < 0.99,
                                    opacity: placed.color.w,
                                    roughness: 0.6,
                                    metalness: 0.15
                                });
                            }

                            const mesh = new THREE.Mesh(geometry, mat);
                            mesh.castShadow = true;
                            mesh.receiveShadow = true;

                            mesh.userData = {
                                isIfcElement: true,
                                ifcGlobalId: `IFC_${expressID}_${j}`,
                                elementName: `Elemento IFC #${expressID}`,
                                storey: 'Piso 1',
                                category: 'ModelGeometry',
                                discipline: 'structure',
                                originalMaterial: mat
                            };

                            bimGroup.add(mesh);
                            loadedMeshesCount++;
                        }
                    }
                }
            } catch (wasmError) {
                console.warn('WASM model load exception:', wasmError);
            } finally {
                if (modelId !== null) {
                    try { ifcApi.CloseModel(modelId); } catch (_) {}
                }
            }

            // Fallback for non-standard or coordinate-only STEP IFC files
            if (loadedMeshesCount === 0) {
                setLoadingMessage('A compor elementos a partir das entidades STEP do ficheiro IFC...');
                const text = new TextDecoder('utf-8', { fatal: false }).decode(uint8.slice(0, 1000000));

                const wallRegex = /#(\d+)\s*=\s*IFCWALL[A-Z0-9]*\s*\(\s*'([^']+)'(?:,[^,]*,[^,]*,[^,]*,[^,]*,#(\d+))?/gi;
                const colRegex = /#(\d+)\s*=\s*IFCCOLUMN\s*\(\s*'([^']+)'/gi;
                const slabRegex = /#(\d+)\s*=\s*IFCSLAB\s*\(\s*'([^']+)'/gi;
                const beamRegex = /#(\d+)\s*=\s*IFCBEAM\s*\(\s*'([^']+)'/gi;

                const concreteMat = new THREE.MeshStandardMaterial({ color: 0xd4d8d1, roughness: 0.75 });
                const columnMat = new THREE.MeshStandardMaterial({ color: 0xbac0b7, roughness: 0.8 });
                const beamMat = new THREE.MeshStandardMaterial({ color: 0xadb4a9, roughness: 0.75 });
                const slabMat = new THREE.MeshStandardMaterial({ color: 0xe2e5df, roughness: 0.7 });

                bimGroup.clear();

                let wallMatch;
                let elemIdx = 0;
                while ((wallMatch = wallRegex.exec(text)) !== null && elemIdx < 80) {
                    const id = wallMatch[1];
                    const globalId = wallMatch[2];
                    const wallMesh = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.8, 0.25), concreteMat);
                    const posX = ((elemIdx % 6) - 2.5) * 4.5;
                    const posZ = (Math.floor(elemIdx / 6) - 2) * 5;
                    wallMesh.position.set(posX, 1.4, posZ);
                    wallMesh.userData = {
                        isIfcElement: true,
                        ifcGlobalId: globalId || `WALL_${id}`,
                        elementName: `Parede IFC #${id} (${file.name})`,
                        storey: 'Piso 1',
                        category: 'Wall',
                        discipline: 'architecture',
                        originalMaterial: concreteMat
                    };
                    bimGroup.add(wallMesh);
                    loadedMeshesCount++;
                    elemIdx++;
                }

                let colMatch;
                elemIdx = 0;
                while ((colMatch = colRegex.exec(text)) !== null && elemIdx < 50) {
                    const id = colMatch[1];
                    const globalId = colMatch[2];
                    const colMesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3.2, 0.5), columnMat);
                    const posX = ((elemIdx % 5) - 2) * 5;
                    const posZ = (Math.floor(elemIdx / 5) - 2) * 4;
                    colMesh.position.set(posX, 1.6, posZ);
                    colMesh.userData = {
                        isIfcElement: true,
                        ifcGlobalId: globalId || `COL_${id}`,
                        elementName: `Pilar IFC #${id} (${file.name})`,
                        storey: 'Piso 1',
                        category: 'Column',
                        discipline: 'structure',
                        originalMaterial: columnMat
                    };
                    bimGroup.add(colMesh);
                    loadedMeshesCount++;
                    elemIdx++;
                }

                let beamMatch;
                elemIdx = 0;
                while ((beamMatch = beamRegex.exec(text)) !== null && elemIdx < 40) {
                    const id = beamMatch[1];
                    const globalId = beamMatch[2];
                    const beamMesh = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.5, 0.35), beamMat);
                    const posX = ((elemIdx % 5) - 2) * 5;
                    const posZ = (Math.floor(elemIdx / 5) - 1.5) * 4;
                    beamMesh.position.set(posX, 3.2, posZ);
                    beamMesh.userData = {
                        isIfcElement: true,
                        ifcGlobalId: globalId || `BEAM_${id}`,
                        elementName: `Viga IFC #${id} (${file.name})`,
                        storey: 'Piso 1',
                        category: 'Beam',
                        discipline: 'structure',
                        originalMaterial: beamMat
                    };
                    bimGroup.add(beamMesh);
                    loadedMeshesCount++;
                    elemIdx++;
                }

                const slabMesh = new THREE.Mesh(new THREE.BoxGeometry(26, 0.5, 22), slabMat);
                slabMesh.position.set(0, 0, 0);
                slabMesh.userData = {
                    isIfcElement: true,
                    ifcGlobalId: `SLAB_${file.name.slice(0, 8)}`,
                    elementName: `Laje Estrutural Base (${file.name})`,
                    storey: 'Piso 0',
                    category: 'Slab',
                    discipline: 'structure',
                    originalMaterial: slabMat
                };
                bimGroup.add(slabMesh);
                loadedMeshesCount++;
            }

            // Normalization & Coordinate Alignment
            const bbox = new THREE.Box3().setFromObject(bimGroup);
            const center = bbox.getCenter(new THREE.Vector3());
            const size = bbox.getSize(new THREE.Vector3());

            if (size.x > 500 || size.z > 500) {
                bimGroup.scale.set(0.001, 0.001, 0.001);
                bbox.setFromObject(bimGroup);
                bbox.getCenter(center);
                bbox.getSize(size);
            }

            bimGroup.position.x = -center.x;
            bimGroup.position.z = -center.z;
            bimGroup.position.y = -bbox.min.y;

            if (controlsRef.current && cameraRef.current) {
                const maxDim = Math.max(size.x, size.y, size.z, 12);
                cameraRef.current.position.set(maxDim * 1.3, maxDim * 0.9, maxDim * 1.4);
                controlsRef.current.target.set(0, size.y / 2, 0);
                controlsRef.current.maxDistance = maxDim * 8;
                controlsRef.current.update();
            }

            setLoadedIfcName(file.name);
            showToast(`Modelo IFC "${file.name}" carregado com sucesso (${loadedMeshesCount} elementos 3D).`);
        } catch (err: any) {
            console.error('Error loading IFC file:', err);
            alert(`Aviso ao carregar IFC: ${err.message || 'Ficheiro não reconhecido'}`);
        } finally {
            setIsLoadingModel(false);
            setLoadingMessage('');
        }
    };

    // Save New Observation Pin
    const handleSaveObservation = (e: React.FormEvent) => {
        e.preventDefault();
        if (!pendingPinData || !formTitle.trim()) return;

        addSiteObservation({
            projectId,
            title: formTitle.trim(),
            description: formDesc.trim(),
            category: formCategory,
            status: 'open',
            severity: formSeverity,
            ifcGlobalId: pendingPinData.ifcGlobalId,
            elementName: pendingPinData.elementName,
            storeyName: pendingPinData.storeyName,
            position: pendingPinData.position,
            cameraPosition: pendingPinData.cameraPosition,
            cameraTarget: pendingPinData.cameraTarget,
            photos: formPhoto ? [formPhoto] : [],
            assignedToCompanyId: formCompanyId || undefined,
            createdByName: currentUser?.name || 'Técnico de Obra',
        });

        setIsCreateModalOpen(false);
        setPendingPinData(null);
        setActiveMode('navigate');
        showToast('Ponto de visita registado e geolocalizado no modelo 3D.');
    };

    // Export Official Site Visit PDF Report
    const handleExportPDF = () => {
        const doc = new jsPDF();
        const now = new Date();
        const formattedDate = now.toLocaleDateString('pt-PT') + ' ' + now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

        doc.setFillColor(37, 99, 235);
        doc.rect(0, 0, 210, 24, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('SAFESITE | RELATÓRIO DE VISITA DE OBRA E SEGURANÇA', 14, 15);

        doc.setTextColor(51, 65, 85);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Obra: ${currentProject.name}`, 14, 32);
        doc.text(`Data de Emissão: ${formattedDate}`, 14, 38);
        doc.text(`Elaborado por: ${currentUser?.name || 'Direção de Fiscalização'} (${currentUser?.role?.toUpperCase() || 'FISCAL'})`, 14, 44);
        doc.text(`Referência BIM / IFC: ISO 19650-6 / ISO 16739 (Modelo 3D / 2D Geolocalizado)`, 14, 50);

        const total = projectObservations.length;
        const openCritical = projectObservations.filter(o => o.status === 'open' && (o.severity === 'critical' || o.severity === 'high')).length;
        const inProgress = projectObservations.filter(o => o.status === 'in_progress').length;
        const resolved = projectObservations.filter(o => o.status === 'resolved').length;

        autoTable(doc, {
            startY: 55,
            head: [['Total Pontos', 'Críticos / Altos', 'Em Resolução', 'Resolvidos']],
            body: [[total.toString(), openCritical.toString(), inProgress.toString(), resolved.toString()]],
            theme: 'grid',
            headStyles: { fillColor: [71, 85, 105], textColor: 255, fontStyle: 'bold', halign: 'center' },
            bodyStyles: { halign: 'center', fontStyle: 'bold' },
        });

        const tableBody = projectObservations.map((obs, idx) => {
            const comp = companies.find(c => c.id === obs.assignedToCompanyId);
            return [
                (idx + 1).toString(),
                obs.title,
                obs.category === 'safety_non_compliance' ? 'Não Conformidade' : obs.category === 'risk_point' ? 'Ponto de Risco' : 'Visita',
                obs.severity.toUpperCase(),
                `${obs.storeyName || '-'} | ${obs.elementName || '-'}`,
                comp?.name || 'Geral',
                obs.status === 'resolved' ? 'RESOLVIDO' : obs.status === 'in_progress' ? 'EM CURSO' : 'ABERTO'
            ];
        });

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 10,
            head: [['#', 'Assunto / Ocorrência', 'Tipo', 'Gravidade', 'Elemento IFC / Piso', 'Empresa', 'Estado']],
            body: tableBody,
            theme: 'striped',
            headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 8, cellPadding: 2.5 },
            columnStyles: {
                0: { cellWidth: 8, halign: 'center' },
                1: { cellWidth: 55 },
                2: { cellWidth: 28 },
                3: { cellWidth: 20, fontStyle: 'bold' },
                4: { cellWidth: 42 },
                5: { cellWidth: 25 },
                6: { cellWidth: 20, fontStyle: 'bold' },
            }
        });

        doc.save(`Relatorio_Visita_${currentProject.name.replace(/[^a-zA-Z0-9]/g, '_')}_${now.toISOString().split('T')[0]}.pdf`);
        showToast('Relatório PDF exportado com sucesso.');
    };

    // Export Official Site Layout & Emergency Evacuation Plan (Planta de Estaleiro e Emergência PDF)
    const handleExportSitePlanPDF = () => {
        const doc = new jsPDF({ orientation: 'landscape' });
        const now = new Date();
        const formattedDate = now.toLocaleDateString('pt-PT') + ' ' + now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

        // Header Title Block
        doc.setFillColor(15, 23, 42); // dark slate
        doc.rect(0, 0, 297, 24, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('SAFESITE | PLANTA DE ESTALEIRO, SEGURANÇA E PLANO DE EMERGÊNCIA (PSS)', 14, 15);

        // Project Info
        doc.setTextColor(51, 65, 85);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Obra: ${currentProject.name}`, 14, 32);
        doc.text(`Data: ${formattedDate} | Enquadramento Legal: DL 273/2003 e ISO 7010`, 14, 38);
        doc.text(`Coordenação de Segurança: ${currentUser?.name || 'Direção de Fiscalização'}`, 14, 44);

        // Inventory of Site Equipment & Emergency Devices
        const tableBody = projectLogistics.map((item, idx) => [
            (idx + 1).toString(),
            item.name,
            item.category === 'emergency' ? 'EMERGÊNCIA / PSS' : 'ESTALEIRO / LOGÍSTICA',
            item.type.toUpperCase().replace('_', ' '),
            `[${item.position.join(', ')}]`,
            item.radius ? `${item.radius}m` : '-',
            item.notes || 'Conforme plano'
        ]);

        autoTable(doc, {
            startY: 50,
            head: [['#', 'Designação do Equipamento / Meio', 'Âmbito', 'Tipo', 'Coordenadas [X,Y,Z]', 'Raio Ação', 'Prescrições Técnicas e Segurança']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 8, cellPadding: 2.5 },
        });

        // Carimbo de Aprovação
        const finalY = (doc as any).lastAutoTable.finalY + 12;
        doc.setDrawColor(203, 213, 225);
        doc.rect(14, finalY, 130, 28);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('COORDENADOR DE SEGURANÇA EM OBRA (CSO)', 18, finalY + 8);
        doc.setFont('helvetica', 'normal');
        doc.text('Aprovado nos termos do Decreto-Lei n.º 273/2003', 18, finalY + 16);
        doc.text('Assinatura: __________________________________', 18, finalY + 24);

        doc.rect(150, finalY, 133, 28);
        doc.setFont('helvetica', 'bold');
        doc.text('DIREÇÃO DE FISCALIZAÇÃO / DONO DA OBRA', 154, finalY + 8);
        doc.setFont('helvetica', 'normal');
        doc.text('Validação técnica da implantação do estaleiro', 154, finalY + 16);
        doc.text('Assinatura: __________________________________', 154, finalY + 24);

        doc.save(`Planta_Estaleiro_Emergencia_${currentProject.name.replace(/[^a-zA-Z0-9]/g, '_')}_${now.toISOString().split('T')[0]}.pdf`);
        showToast('Planta de Estaleiro & Emergência exportada com sucesso em PDF!');
    };

    // Filter observations for sidebar
    const filteredObservations = useMemo(() => {
        return projectObservations.filter(obs => {
            if (categoryFilter !== 'all' && obs.category !== categoryFilter) return false;
            if (statusFilter !== 'all' && obs.status !== statusFilter) return false;
            if (searchFilter.trim()) {
                const q = searchFilter.toLowerCase();
                const matchTitle = obs.title.toLowerCase().includes(q);
                const matchDesc = obs.description.toLowerCase().includes(q);
                const matchElem = (obs.elementName || '').toLowerCase().includes(q);
                if (!matchTitle && !matchDesc && !matchElem) return false;
            }
            return true;
        });
    }, [projectObservations, categoryFilter, statusFilter, searchFilter]);

    return (
        <div className={cn(
            "relative w-full overflow-hidden bg-slate-100 dark:bg-neutral-950 flex flex-col select-none transition-all duration-200",
            isFullscreen
                ? "fixed inset-0 z-50 h-screen max-h-none rounded-none"
                : "h-[calc(100vh-175px)] min-h-[480px] max-h-[720px] rounded-2xl border border-slate-200 dark:border-neutral-800 shadow-sm"
        )}>
            {/* Top Revit/OpenProject-style Ribbon Toolbar */}
            <div className="bg-white/95 dark:bg-[#1e2023]/95 backdrop-blur-md border-b border-slate-200 dark:border-neutral-800 px-3 py-1.5 flex items-center justify-between gap-2 z-20 shrink-0">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                    {/* Toggle Left Sidebar */}
                    <button
                        onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
                        className={cn(
                            "px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors border shadow-xs shrink-0 cursor-pointer",
                            isLeftSidebarOpen
                                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent"
                                : "bg-white text-slate-700 dark:bg-neutral-800 dark:text-slate-200 border-slate-200 dark:border-neutral-700 hover:bg-slate-50"
                        )}
                        title="Modelos, Pastas CDE e Estaleiro"
                    >
                        <FolderTree size={13} />
                        <span>Navegador BIM</span>
                    </button>

                    {/* GRUPO 1: VISTA & PROJEÇÃO */}
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100/80 dark:bg-neutral-800/80 rounded-lg border border-slate-200 dark:border-neutral-700/60 shrink-0">
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Vista</span>
                        <div className="flex items-center bg-white dark:bg-neutral-700 p-0.5 rounded-md border border-slate-200 dark:border-neutral-600 text-xs">
                            <button
                                onClick={() => handleToggleViewDimension('3d')}
                                className={cn(
                                    "px-2.5 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer",
                                    viewDimension === '3d'
                                        ? "bg-blue-600 text-white shadow-xs"
                                        : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                                )}
                            >
                                3D
                            </button>
                            <button
                                onClick={() => handleToggleViewDimension('2d')}
                                className={cn(
                                    "px-2.5 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer",
                                    viewDimension === '2d'
                                        ? "bg-blue-600 text-white shadow-xs"
                                        : "text-slate-600 dark:text-slate-300 hover:text-blue-600"
                                )}
                            >
                                Planta 2D
                            </button>
                        </div>

                        <select
                            value={selectedStorey}
                            onChange={(e) => setSelectedStorey(e.target.value)}
                            className="bg-white dark:bg-neutral-700 border border-slate-200 dark:border-neutral-600 text-[11px] rounded-md px-2 py-1 font-semibold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
                        >
                            <option value="all">🏢 Pisos: Todos</option>
                            <option value="Piso 0">Piso 0 (R/C & Fundação)</option>
                            <option value="Piso 1">Piso 1 (Estrutura)</option>
                            <option value="Piso 2">Piso 2 (Frente Trabalho)</option>
                            <option value="Cobertura">Cobertura & HVAC</option>
                            <option value="Exterior">Exterior & Grua</option>
                        </select>
                    </div>

                    {/* GRUPO 2: CAMADAS & SAFETY LAYERS */}
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100/80 dark:bg-neutral-800/80 rounded-lg border border-slate-200 dark:border-neutral-700/60 shrink-0">
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Camadas</span>

                        <button
                            onClick={() => setShowObservationsLayer(!showObservationsLayer)}
                            className={cn(
                                "px-2 py-0.5 rounded text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1",
                                showObservationsLayer
                                    ? "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300"
                                    : "bg-white border-slate-200 text-slate-400 opacity-60"
                            )}
                            title="Ligar/Desligar Camada de Pontos de Inspeção"
                        >
                            <MapPin size={11} />
                            <span>Inspeções</span>
                        </button>

                        <button
                            onClick={() => setShowLogisticsLayer(!showLogisticsLayer)}
                            className={cn(
                                "px-2 py-0.5 rounded text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1",
                                showLogisticsLayer
                                    ? "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300"
                                    : "bg-white border-slate-200 text-slate-400 opacity-60"
                            )}
                            title="Ligar/Desligar Camada de Estaleiro"
                        >
                            <HardHat size={11} />
                            <span>Estaleiro</span>
                        </button>

                        <button
                            onClick={() => setShowEmergencyLayer(!showEmergencyLayer)}
                            className={cn(
                                "px-2 py-0.5 rounded text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1",
                                showEmergencyLayer
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300"
                                    : "bg-white border-slate-200 text-slate-400 opacity-60"
                            )}
                            title="Ligar/Desligar Camada de Emergência e Evacuação"
                        >
                            <Flame size={11} />
                            <span>Emergência</span>
                        </button>
                    </div>

                    {/* GRUPO 3: AÇÕES DE REGISTO */}
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100/80 dark:bg-neutral-800/80 rounded-lg border border-slate-200 dark:border-neutral-700/60 shrink-0">
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Ações</span>

                        <button
                            onClick={() => setActiveMode(activeMode === 'add_point' ? 'navigate' : 'add_point')}
                            className={cn(
                                "px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-xs shrink-0 cursor-pointer",
                                activeMode === 'add_point'
                                    ? "bg-red-600 text-white animate-pulse"
                                    : "bg-white dark:bg-neutral-700 hover:bg-red-50 text-slate-700 dark:text-slate-200 hover:text-red-600 border border-slate-200 dark:border-neutral-600"
                            )}
                            title="Clique no modelo para adicionar um ponto de inspeção 3D"
                        >
                            <MapPin size={12} className={activeMode === 'add_point' ? 'animate-bounce' : ''} />
                            <span>{activeMode === 'add_point' ? 'Clique no Modelo...' : 'Nova Inspeção'}</span>
                        </button>

                        <button
                            onClick={() => {
                                setLeftPanelTab('logistics');
                                setIsLeftSidebarOpen(true);
                                setActiveMode('add_logistics');
                            }}
                            className={cn(
                                "px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-xs shrink-0 cursor-pointer",
                                activeMode === 'add_logistics'
                                    ? "bg-amber-600 text-white animate-pulse"
                                    : "bg-white dark:bg-neutral-700 hover:bg-amber-50 text-slate-700 dark:text-slate-200 hover:text-amber-600 border border-slate-200 dark:border-neutral-600"
                            )}
                            title="Posicionar equipamentos de estaleiro ou emergência"
                        >
                            <HardHat size={12} />
                            <span>Planta Estaleiro</span>
                        </button>
                    </div>

                    {/* GRUPO 4: FICHEIROS & CDE */}
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50/90 dark:bg-blue-950/40 rounded-lg border border-blue-200 dark:border-blue-800/70 shadow-xs shrink-0">
                        <label
                            className="cursor-pointer px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[11px] font-bold flex items-center gap-1.5 shadow-sm transition-all hover:scale-[1.02] active:scale-95 shrink-0"
                            title="Carregar ficheiro IFC (.ifc) do seu computador"
                        >
                            <Upload size={13} className="stroke-[2.5]" />
                            <span>{loadedIfcName ? `IFC: ${loadedIfcName.slice(0, 10)}...` : 'Carregar IFC'}</span>
                            <input
                                type="file"
                                accept=".ifc"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        handleProcessIfcFile(file);
                                    }
                                }}
                            />
                        </label>

                        <button
                            onClick={handleCreateCdeFolders}
                            disabled={isCreatingCdeFolders}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-bold flex items-center gap-1 shadow-xs transition-all cursor-pointer shrink-0"
                            title="Criar estrutura de pastas BIM e Desenhos 2D na raiz do CDE"
                        >
                            {isCreatingCdeFolders ? <Loader2 size={12} className="animate-spin" /> : <FolderPlus size={12} />}
                            <span>Pastas CDE</span>
                        </button>
                    </div>

                    {/* EXPORTAÇÕES OFICIAIS */}
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100/80 dark:bg-neutral-800/80 rounded-lg border border-slate-200 dark:border-neutral-700/60 shrink-0">
                        <button
                            onClick={handleExportPDF}
                            className="px-2 py-1 bg-white dark:bg-neutral-700 hover:bg-slate-50 border border-slate-200 dark:border-neutral-600 text-slate-700 dark:text-slate-200 rounded-md text-[11px] font-semibold flex items-center gap-1 shadow-xs transition-colors shrink-0 cursor-pointer"
                            title="Exportar Relatório Oficial de Visita e Inspeções"
                        >
                            <Download size={12} />
                            <span>Relatório Visita</span>
                        </button>

                        <button
                            onClick={handleExportSitePlanPDF}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-md text-[11px] font-bold flex items-center gap-1 shadow-xs transition-colors shrink-0 cursor-pointer"
                            title="Exportar Planta Oficial de Estaleiro e Emergência (PSS)"
                        >
                            <FileText size={12} className="text-emerald-600" />
                            <span>Planta PSS (PDF)</span>
                        </button>
                    </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-1.5 shrink-0 pl-1 border-l border-slate-200 dark:border-neutral-700">
                    <button
                        onClick={() => {
                            if (cameraRef.current && controlsRef.current) {
                                cameraRef.current.position.set(22, 18, 26);
                                controlsRef.current.target.set(0, 4.5, 0);
                                controlsRef.current.update();
                            }
                        }}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 text-xs shadow-xs cursor-pointer"
                        title="Repor câmara inicial"
                    >
                        <RotateCcw size={13} />
                    </button>

                    <button
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 text-xs shadow-xs cursor-pointer"
                        title={isFullscreen ? 'Sair de Ecrã Completo' : 'Ecrã Completo'}
                    >
                        {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                    </button>

                    <button
                        onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
                        className={cn(
                            "px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer",
                            isRightSidebarOpen
                                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent"
                                : "bg-white text-slate-700 dark:bg-neutral-800 dark:text-slate-200 border-slate-200 dark:border-neutral-700 hover:bg-slate-50"
                        )}
                        title="Abrir/Fechar Painel de Inspeções"
                    >
                        <MapPin size={13} />
                        <span>Inspeções ({filteredObservations.length})</span>
                        <ChevronRight className={cn("w-3.5 h-3.5 transition-transform", isRightSidebarOpen ? "" : "rotate-180")} />
                    </button>
                </div>
            </div>

            {/* Main OpenProject BIM Workspace (Left Panel + Center 3D/2D Viewport + Right BCF Panel) */}
            <div className="relative flex-1 w-full h-full flex overflow-hidden">
                {/* ZONE A: Left OpenProject BIM Panel (Collapsible) */}
                <div className={cn(
                    "h-full bg-white dark:bg-[#1a1b1e] border-r border-slate-200 dark:border-neutral-800 z-10 flex flex-col transition-all duration-300 ease-in-out shrink-0 shadow-lg",
                    isLeftSidebarOpen ? "w-80" : "w-0 overflow-hidden border-none"
                )}>
                    {/* Left Panel Tabs */}
                    <div className="flex border-b border-slate-200 dark:border-neutral-800 text-xs font-semibold bg-slate-50 dark:bg-neutral-900 shrink-0">
                        <button
                            onClick={() => setLeftPanelTab('models')}
                            className={cn(
                                "flex-1 py-2.5 px-2 text-center border-b-2 transition-colors flex items-center justify-center gap-1",
                                leftPanelTab === 'models'
                                    ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-[#1a1b1e]"
                                    : "border-transparent text-slate-500 hover:text-slate-800"
                            )}
                        >
                            <Box size={13} />
                            <span>Modelos CDE</span>
                        </button>
                        <button
                            onClick={() => setLeftPanelTab('logistics')}
                            className={cn(
                                "flex-1 py-2.5 px-2 text-center border-b-2 transition-colors flex items-center justify-center gap-1",
                                leftPanelTab === 'logistics'
                                    ? "border-amber-600 text-amber-600 dark:text-amber-400 bg-white dark:bg-[#1a1b1e]"
                                    : "border-transparent text-slate-500 hover:text-slate-800"
                            )}
                        >
                            <HardHat size={13} />
                            <span>Estaleiro & PSS</span>
                        </button>
                        <button
                            onClick={() => setLeftPanelTab('hierarchy')}
                            className={cn(
                                "flex-1 py-2.5 px-2 text-center border-b-2 transition-colors flex items-center justify-center gap-1",
                                leftPanelTab === 'hierarchy'
                                    ? "border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-[#1a1b1e]"
                                    : "border-transparent text-slate-500 hover:text-slate-800"
                            )}
                        >
                            <Layers size={13} />
                            <span>Pisos</span>
                        </button>
                    </div>

                    {/* Tab 1 Content: Modelos & Pastas CDE */}
                    {leftPanelTab === 'models' && (
                        <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
                            {/* CDE Root Folders Explorer */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                                        <FolderTree size={14} className="text-blue-600" />
                                        Estrutura Cloud CDE (Raiz)
                                    </span>
                                    <button
                                        onClick={handleCreateCdeFolders}
                                        className="text-[10px] text-blue-600 hover:underline font-bold"
                                        title="Sincronizar pastas na raiz da Cloud"
                                    >
                                        + Criar Pastas
                                    </button>
                                </div>

                                <div className="p-2.5 bg-slate-50 dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-800 space-y-2">
                                    <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
                                        <FolderOpen size={14} className="text-amber-500" />
                                        <span>Modelos BIM (IFC)</span>
                                    </div>
                                    <div className="pl-4 space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400 border-l border-slate-200 dark:border-neutral-700 ml-1.5">
                                        <div className="flex items-center justify-between">
                                            <span>📁 01-Arquitetura</span>
                                            <span className="text-[10px] bg-slate-200 dark:bg-neutral-800 px-1 rounded">ARQ.ifc</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span>📁 02-Estruturas</span>
                                            <span className="text-[10px] bg-slate-200 dark:bg-neutral-800 px-1 rounded">EST.ifc</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span>📁 03-Especialidades (MEP)</span>
                                            <span className="text-[10px] bg-slate-200 dark:bg-neutral-800 px-1 rounded">AVAC.ifc</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-1 font-bold text-slate-900 dark:text-slate-100 border-t border-slate-200 dark:border-neutral-800">
                                        <div className="flex items-center gap-1.5">
                                            <FolderOpen size={14} className="text-blue-500" />
                                            <span>Desenhos 2D (Plantas)</span>
                                        </div>
                                        <button
                                            onClick={() => setIs2dDrawingsModalOpen(true)}
                                            className="text-[10px] text-blue-600 hover:underline"
                                        >
                                            Ver Folhas &rarr;
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Federated Disciplines Checklist */}
                            <div>
                                <span className="font-bold text-slate-800 dark:text-slate-200 block mb-2 text-xs">
                                    Modelo Federado (Disciplinas Ativas)
                                </span>
                                <div className="space-y-1.5 bg-slate-50 dark:bg-neutral-900 p-2.5 rounded-xl border border-slate-200 dark:border-neutral-800">
                                    <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                                        <input
                                            type="checkbox"
                                            checked={selectedDiscipline === 'all' || selectedDiscipline === 'structure'}
                                            onChange={() => setSelectedDiscipline(selectedDiscipline === 'structure' ? 'all' : 'structure')}
                                            className="rounded text-blue-600"
                                        />
                                        <span className="font-semibold text-slate-700 dark:text-slate-200">🏗️ Estruturas (Betão Armado & Fundações)</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                                        <input
                                            type="checkbox"
                                            checked={selectedDiscipline === 'all' || selectedDiscipline === 'architecture'}
                                            onChange={() => setSelectedDiscipline(selectedDiscipline === 'architecture' ? 'all' : 'architecture')}
                                            className="rounded text-blue-600"
                                        />
                                        <span className="font-semibold text-slate-700 dark:text-slate-200">📐 Arquitetura (Paredes, Vãos & Cobertura)</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                                        <input
                                            type="checkbox"
                                            checked={selectedDiscipline === 'all' || selectedDiscipline === 'mep'}
                                            onChange={() => setSelectedDiscipline(selectedDiscipline === 'mep' ? 'all' : 'mep')}
                                            className="rounded text-blue-600"
                                        />
                                        <span className="font-semibold text-slate-700 dark:text-slate-200">⚙️ MEP / Instalações (Condutas & Redes)</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                                        <input
                                            type="checkbox"
                                            checked={selectedDiscipline === 'all' || selectedDiscipline === 'safety'}
                                            onChange={() => setSelectedDiscipline(selectedDiscipline === 'safety' ? 'all' : 'safety')}
                                            className="rounded text-blue-600"
                                        />
                                        <span className="font-semibold text-slate-700 dark:text-slate-200">🦺 Segurança (Guarda-corpos & Andaimes)</span>
                                    </label>
                                </div>
                            </div>

                            {/* Direct Model Upload Dropzone */}
                            <div>
                                <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1.5 text-xs">
                                    Carregar Modelo Local (.ifc)
                                </span>
                                <label className="p-4 rounded-xl border-2 border-dashed border-blue-300 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 transition-colors">
                                    <Upload size={22} className="text-blue-600 mb-1 animate-pulse" />
                                    <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                                        {loadedIfcName || 'Selecionar Ficheiro IFC'}
                                    </span>
                                    <span className="text-[10px] text-slate-500 mt-0.5">
                                        ou arraste o ficheiro para o visualizador 3D
                                    </span>
                                    <input
                                        type="file"
                                        accept=".ifc"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleProcessIfcFile(file);
                                        }}
                                    />
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Tab 2 Content: Planta de Estaleiro & Emergência */}
                    {leftPanelTab === 'logistics' && (
                        <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
                            <div>
                                <span className="font-bold text-slate-900 dark:text-white block mb-1 text-xs">
                                    Equipamentos de Estaleiro (Logística)
                                </span>
                                <p className="text-[11px] text-slate-500 mb-2">
                                    Clique para posicionar no modelo ou planta:
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => {
                                            setPendingPlacementType('crane');
                                            setActiveMode('add_logistics');
                                            showToast('Clique no chão para posicionar a Grua Torre.');
                                        }}
                                        className="p-2 rounded-lg border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 hover:border-amber-500 text-left transition-all cursor-pointer"
                                    >
                                        <div className="font-bold text-amber-700 dark:text-amber-400">🏗️ Grua Torre</div>
                                        <div className="text-[10px] text-slate-500">Lança 26m / Raio</div>
                                    </button>

                                    <button
                                        onClick={() => {
                                            setPendingPlacementType('office_container');
                                            setActiveMode('add_logistics');
                                            showToast('Clique para posicionar o Contentor.');
                                        }}
                                        className="p-2 rounded-lg border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 hover:border-blue-500 text-left transition-all cursor-pointer"
                                    >
                                        <div className="font-bold text-blue-700 dark:text-blue-400">🏢 Contentores</div>
                                        <div className="text-[10px] text-slate-500">Escritório/Balneário</div>
                                    </button>

                                    <button
                                        onClick={() => {
                                            setPendingPlacementType('gate');
                                            setActiveMode('add_logistics');
                                            showToast('Clique para posicionar a Portaria.');
                                        }}
                                        className="p-2 rounded-lg border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 hover:border-sky-500 text-left transition-all cursor-pointer"
                                    >
                                        <div className="font-bold text-sky-700 dark:text-sky-400">🚪 Portaria</div>
                                        <div className="text-[10px] text-slate-500">Controlo Acessos</div>
                                    </button>

                                    <button
                                        onClick={() => {
                                            setPendingPlacementType('waste_bay');
                                            setActiveMode('add_logistics');
                                            showToast('Clique para posicionar o Parque RCD.');
                                        }}
                                        className="p-2 rounded-lg border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 hover:border-emerald-500 text-left transition-all cursor-pointer"
                                    >
                                        <div className="font-bold text-emerald-700 dark:text-emerald-400">♻️ Baia RCDs</div>
                                        <div className="text-[10px] text-slate-500">Triagem Resíduos</div>
                                    </button>
                                </div>
                            </div>

                            {/* Plano de Emergência & Evacuação (ISO 7010) */}
                            <div>
                                <span className="font-bold text-slate-900 dark:text-white block mb-1 text-xs">
                                    Dispositivos de Emergência (PSS / ISO 7010)
                                </span>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => {
                                            setPendingPlacementType('meeting_point');
                                            setActiveMode('add_emergency');
                                            showToast('Clique para posicionar o Ponto de Encontro.');
                                        }}
                                        className="p-2 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50/60 dark:bg-emerald-950/20 text-left transition-all cursor-pointer hover:border-emerald-500"
                                    >
                                        <div className="font-bold text-emerald-700 dark:text-emerald-400">🚨 Ponto Encontro</div>
                                        <div className="text-[10px] text-slate-500">Sinal ISO 7010</div>
                                    </button>

                                    <button
                                        onClick={() => {
                                            setPendingPlacementType('fire_extinguisher');
                                            setActiveMode('add_emergency');
                                            showToast('Clique para posicionar o Extintor.');
                                        }}
                                        className="p-2 rounded-lg border border-red-200 dark:border-red-900 bg-red-50/60 dark:bg-red-950/20 text-left transition-all cursor-pointer hover:border-red-500"
                                    >
                                        <div className="font-bold text-red-700 dark:text-red-400">🧯 Extintor</div>
                                        <div className="text-[10px] text-slate-500">Pó / CO2 6kg</div>
                                    </button>

                                    <button
                                        onClick={() => {
                                            setPendingPlacementType('first_aid');
                                            setActiveMode('add_emergency');
                                            showToast('Clique para posicionar o Posto Socorros.');
                                        }}
                                        className="p-2 rounded-lg border border-teal-200 dark:border-teal-900 bg-teal-50/60 dark:bg-teal-950/20 text-left transition-all cursor-pointer hover:border-teal-500"
                                    >
                                        <div className="font-bold text-teal-700 dark:text-teal-400">🩹 Posto Socorros</div>
                                        <div className="text-[10px] text-slate-500">Maca & DAE</div>
                                    </button>

                                    <button
                                        onClick={() => {
                                            setPendingPlacementType('evacuation_route');
                                            setActiveMode('add_emergency');
                                            showToast('Clique para posicionar o Trajeto de Fuga.');
                                        }}
                                        className="p-2 rounded-lg border border-green-200 dark:border-green-900 bg-green-50/60 dark:bg-green-950/20 text-left transition-all cursor-pointer hover:border-green-500"
                                    >
                                        <div className="font-bold text-green-700 dark:text-green-400">➡️ Via Evacuação</div>
                                        <div className="text-[10px] text-slate-500">Saída Emergência</div>
                                    </button>
                                </div>
                            </div>

                            {/* Inventory of Placed Elements */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                                        Inventário no Estaleiro ({projectLogistics.length})
                                    </span>
                                    <button
                                        onClick={handleExportSitePlanPDF}
                                        className="text-[10px] text-emerald-600 font-bold hover:underline"
                                    >
                                        Exportar PSS &rarr;
                                    </button>
                                </div>

                                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                    {projectLogistics.map(item => (
                                        <div
                                            key={item.id}
                                            className="p-2 rounded-lg border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900 flex items-center justify-between gap-2 text-[11px]"
                                        >
                                            <div className="truncate">
                                                <span className="font-bold text-slate-800 dark:text-slate-100">{item.name}</span>
                                                <div className="text-[10px] text-slate-400">[{item.position.join(', ')}]</div>
                                            </div>
                                            <button
                                                onClick={() => deleteSiteLogisticsItem(item.id)}
                                                className="text-red-400 hover:text-red-600 p-1"
                                                title="Remover do estaleiro"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab 3 Content: Pisos & Espaços */}
                    {leftPanelTab === 'hierarchy' && (
                        <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
                            <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                                Isolar Nível / Piso
                            </span>
                            <div className="space-y-1">
                                {['all', 'Piso 0', 'Piso 1', 'Piso 2', 'Cobertura', 'Exterior'].map(st => (
                                    <button
                                        key={st}
                                        onClick={() => setSelectedStorey(st)}
                                        className={cn(
                                            "w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors",
                                            selectedStorey === st
                                                ? "bg-blue-600 text-white shadow-xs"
                                                : "bg-slate-50 dark:bg-neutral-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                                        )}
                                    >
                                        <span>{st === 'all' ? '🏢 Todos os Pisos' : st}</span>
                                        {selectedStorey === st && <Check size={14} />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* ZONE B: Center 3D/2D Viewport */}
                <div
                    onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
                    onDragLeave={() => setIsDraggingFile(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        setIsDraggingFile(false);
                        const file = e.dataTransfer?.files?.[0];
                        if (file && file.name.toLowerCase().endsWith('.ifc')) {
                            handleProcessIfcFile(file);
                        } else if (file) {
                            showToast('Por favor largue um ficheiro com extensão .ifc');
                        }
                    }}
                    className="relative flex-1 w-full h-full flex overflow-hidden"
                >
                    {/* Loading HUD when parsing IFC file */}
                    {isLoadingModel && (
                        <div className="absolute inset-0 z-40 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                            <div className="bg-white dark:bg-[#1e2023] text-slate-900 dark:text-white p-6 rounded-2xl shadow-2xl border border-slate-200 dark:border-[#333] flex flex-col items-center max-w-sm text-center space-y-3">
                                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                                <h3 className="font-bold text-sm">A Processar Ficheiro IFC</h3>
                                <p className="text-xs text-slate-500">{loadingMessage}</p>
                            </div>
                        </div>
                    )}

                    {/* Toast Notification HUD */}
                    {toastMessage && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-4 py-2 bg-slate-900/90 text-white text-xs font-medium rounded-full shadow-xl flex items-center gap-2 backdrop-blur-md animate-in fade-in slide-in-from-top-3">
                            <CheckCircle2 size={14} className="text-emerald-400" />
                            {toastMessage}
                        </div>
                    )}

                    {/* Mode Notice Overlay */}
                    {activeMode === 'add_point' && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 bg-red-600 text-white text-xs font-semibold rounded-full shadow-lg flex items-center gap-2 animate-pulse pointer-events-none">
                            <MapPin size={15} />
                            Clique no modelo 3D para posicionar o ponto de inspeção
                        </div>
                    )}

                    {(activeMode === 'add_logistics' || activeMode === 'add_emergency') && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 bg-amber-600 text-white text-xs font-semibold rounded-full shadow-lg flex items-center gap-2 animate-pulse pointer-events-none">
                            <HardHat size={15} />
                            Clique no chão para posicionar o elemento de estaleiro / emergência
                        </div>
                    )}

                    {/* Drag & Drop Overlay */}
                    {isDraggingFile && (
                        <div className="absolute inset-0 z-35 bg-blue-600/20 backdrop-blur-xs border-4 border-dashed border-blue-500 rounded-xl flex flex-col items-center justify-center pointer-events-none text-blue-900 dark:text-white">
                            <Upload size={48} className="animate-bounce mb-2 text-blue-600" />
                            <span className="text-base font-bold">Largar Ficheiro IFC (.ifc) Aqui</span>
                            <span className="text-xs text-slate-600 dark:text-slate-300">O modelo 3D será processado automaticamente</span>
                        </div>
                    )}

                    {/* 3D WebGL Canvas */}
                    <div
                        ref={mountRef}
                        onClick={handleCanvasClick}
                        className={`w-full h-full cursor-grab active:cursor-grabbing ${
                            activeMode !== 'navigate' ? 'cursor-crosshair' : ''
                        }`}
                    />

                    {/* Bottom Left: Selected Element HUD */}
                    {selectedElement && (
                        <div className="absolute bottom-4 left-4 z-10 bg-white/95 dark:bg-[#1e2023]/95 backdrop-blur-md border border-slate-200 dark:border-[#333] p-3.5 rounded-xl shadow-xl max-w-sm text-xs space-y-2 animate-in fade-in slide-in-from-bottom-2">
                            <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-neutral-800 pb-1.5">
                                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                    <Box size={14} className="text-blue-600" />
                                    Elemento IFC Selecionado
                                </span>
                                <button
                                    onClick={() => setSelectedElement(null)}
                                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                            <div className="space-y-1 text-slate-600 dark:text-slate-300">
                                <div><strong>Nome:</strong> {selectedElement.elementName}</div>
                                <div><strong>Piso:</strong> {selectedElement.storey}</div>
                                <div><strong>Disciplina:</strong> <span className="uppercase font-semibold text-blue-600">{selectedElement.discipline || 'Geral'}</span></div>
                                <div className="font-mono text-[10px] text-slate-500 truncate">
                                    <strong>GlobalId:</strong> {selectedElement.ifcGlobalId}
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setActiveMode('add_point');
                                    setSelectedElement(null);
                                }}
                                className="w-full mt-2 py-1.5 px-3 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                            >
                                <MapPin size={13} />
                                Registar Inspeção / Não Conformidade Neste Elemento
                            </button>
                        </div>
                    )}
                </div>

                {/* ZONE C: Right OpenProject BIM BCF Issues Panel */}
                <div className={cn(
                    "h-full bg-white dark:bg-[#1a1b1e] border-l border-slate-200 dark:border-neutral-800 z-10 flex flex-col transition-all duration-300 ease-in-out shrink-0 shadow-lg",
                    isRightSidebarOpen ? "w-88" : "w-0 overflow-hidden border-none"
                )}>
                    {/* BCF Header */}
                    <div className="p-3.5 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between bg-slate-50/50 dark:bg-neutral-900/50 shrink-0">
                        <div>
                            <h2 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <MapPin size={14} className="text-red-600" />
                                Inspeções & Não Conformidades BCF ({filteredObservations.length})
                            </h2>
                            <p className="text-[10px] text-slate-500">
                                Apontamentos geolocalizados no modelo 3D / 2D
                            </p>
                        </div>
                        <button
                            onClick={() => setIsRightSidebarOpen(false)}
                            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
                        >
                            <X size={15} />
                        </button>
                    </div>

                    {/* Search & Filters */}
                    <div className="p-2.5 border-b border-slate-200 dark:border-neutral-800 space-y-2 bg-white dark:bg-[#1a1b1e] shrink-0">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 w-3 h-3 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Pesquisar por assunto ou elemento..."
                                value={searchFilter}
                                onChange={e => setSearchFilter(e.target.value)}
                                className="w-full pl-7 pr-3 py-1 text-xs bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-md outline-none"
                            />
                        </div>

                        <div className="flex items-center gap-1.5">
                            <select
                                value={categoryFilter}
                                onChange={e => setCategoryFilter(e.target.value)}
                                className="flex-1 text-[10px] bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded px-1.5 py-1 text-slate-700 dark:text-slate-200"
                            >
                                <option value="all">Todas Categorias</option>
                                <option value="safety_non_compliance">Não Conformidade</option>
                                <option value="risk_point">Ponto de Risco</option>
                                <option value="visit_observation">Visita Fiscal</option>
                                <option value="quality_check">Qualidade</option>
                            </select>

                            <select
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                                className="flex-1 text-[10px] bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded px-1.5 py-1 text-slate-700 dark:text-slate-200"
                            >
                                <option value="all">Todos Estados</option>
                                <option value="open">Abertos</option>
                                <option value="in_progress">Em Curso</option>
                                <option value="resolved">Resolvidos</option>
                            </select>
                        </div>
                    </div>

                    {/* BCF Issues List */}
                    <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                        {filteredObservations.length === 0 ? (
                            <div className="text-center py-10 text-slate-400 text-xs">
                                <Info size={20} className="mx-auto mb-1 opacity-50" />
                                Nenhuma ocorrência encontrada.
                            </div>
                        ) : (
                            filteredObservations.map((obs) => {
                                const isSelected = activePin?.id === obs.id;
                                const comp = companies.find(c => c.id === obs.assignedToCompanyId);

                                return (
                                    <div
                                        key={obs.id}
                                        onClick={() => flyToObservation(obs)}
                                        className={cn(
                                            "p-3 rounded-xl border transition-all cursor-pointer text-xs space-y-1.5",
                                            isSelected
                                                ? "bg-blue-50/70 dark:bg-blue-950/30 border-blue-400 ring-2 ring-blue-500/20 shadow-md"
                                                : "bg-white dark:bg-neutral-800 border-slate-200 dark:border-neutral-700 hover:border-slate-300 hover:shadow-xs"
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-1.5">
                                            <div className="flex items-center gap-1.5 truncate">
                                                <span className={cn(
                                                    "w-2 h-2 rounded-full shrink-0",
                                                    obs.status === 'resolved' ? "bg-emerald-500" :
                                                    obs.severity === 'critical' || obs.severity === 'high' ? "bg-red-500 animate-pulse" :
                                                    "bg-amber-500"
                                                )} />
                                                <span className="font-bold text-slate-900 dark:text-white truncate">
                                                    {obs.title}
                                                </span>
                                            </div>
                                            <span className={cn(
                                                "text-[9px] uppercase font-bold px-1.5 py-0.2 rounded shrink-0",
                                                obs.severity === 'critical' ? "bg-red-100 text-red-700" :
                                                obs.severity === 'high' ? "bg-orange-100 text-orange-700" :
                                                "bg-slate-100 text-slate-600"
                                            )}>
                                                {obs.severity}
                                            </span>
                                        </div>

                                        <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                                            {obs.description}
                                        </p>

                                        {obs.photos && obs.photos.length > 0 && (
                                            <div className="pt-1">
                                                <img
                                                    src={obs.photos[0]}
                                                    alt="Thumbnail"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setLightboxPhoto(obs.photos[0]);
                                                    }}
                                                    className="w-full h-20 object-cover rounded-md border border-slate-200 hover:opacity-90"
                                                />
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-100 dark:border-neutral-700/60">
                                            <span className="truncate">
                                                📍 {obs.storeyName || 'Obra'} • {comp?.name || 'Geral'}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    flyToObservation(obs);
                                                }}
                                                className="text-blue-600 hover:underline font-bold shrink-0"
                                            >
                                                Focar 3D &rarr;
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Modal: Registar Nova Inspeção 3D */}
            {isCreateModalOpen && pendingPinData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
                    <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-neutral-800 max-w-lg w-full overflow-hidden">
                        <div className="p-4 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between bg-slate-50 dark:bg-neutral-800/50">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-red-100 text-red-600">
                                    <MapPin size={18} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                        Nova Inspeção / Não Conformidade BIM
                                    </h3>
                                    <p className="text-[11px] text-slate-500">
                                        Geolocalizado em {pendingPinData.storeyName} • {pendingPinData.elementName}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 p-1"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveObservation} className="p-5 space-y-4 text-xs">
                            {/* Captured IFC Anchor Data */}
                            <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 text-blue-900 dark:text-blue-200 space-y-1">
                                <div className="font-semibold flex items-center gap-1.5">
                                    <Box size={13} />
                                    Âncora Espacial IFC (ISO 16739 / ISO 19650-6)
                                </div>
                                <div className="text-[11px] grid grid-cols-2 gap-1 text-blue-700 dark:text-blue-300">
                                    <div><strong>Piso:</strong> {pendingPinData.storeyName}</div>
                                    <div><strong>Elemento:</strong> {pendingPinData.elementName}</div>
                                    <div className="col-span-2 font-mono text-[10px]">
                                        <strong>IfcGlobalId:</strong> {pendingPinData.ifcGlobalId}
                                    </div>
                                    <div className="col-span-2">
                                        <strong>Coordenadas 3D [X,Y,Z]:</strong> [{pendingPinData.position.join(', ')}]
                                    </div>
                                </div>
                            </div>

                            {/* Title */}
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                                    Assunto / Título da Inspeção *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ex: Falta de guarda-corpos na laje, Infiltração..."
                                    value={formTitle}
                                    onChange={e => setFormTitle(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-neutral-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 dark:bg-neutral-800"
                                />
                            </div>

                            {/* Category & Severity */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                                        Categoria
                                    </label>
                                    <select
                                        value={formCategory}
                                        onChange={e => setFormCategory(e.target.value as any)}
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-neutral-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 dark:bg-neutral-800"
                                    >
                                        <option value="safety_non_compliance">Não Conformidade de Segurança</option>
                                        <option value="risk_point">Ponto de Risco Iminente</option>
                                        <option value="visit_observation">Visita de Fiscalização</option>
                                        <option value="quality_check">Controlo de Qualidade</option>
                                        <option value="progress_note">Registo de Progresso</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                                        Gravidade
                                    </label>
                                    <select
                                        value={formSeverity}
                                        onChange={e => setFormSeverity(e.target.value as any)}
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-neutral-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 dark:bg-neutral-800"
                                    >
                                        <option value="low">Baixa</option>
                                        <option value="medium">Média</option>
                                        <option value="high">Alta</option>
                                        <option value="critical">Crítica</option>
                                    </select>
                                </div>
                            </div>

                            {/* Assigned Company */}
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                                    Empresa Notificada
                                </label>
                                <select
                                    value={formCompanyId}
                                    onChange={e => setFormCompanyId(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-neutral-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 dark:bg-neutral-800"
                                >
                                    <option value="">Geral / Sem Atribuição Direta</option>
                                    {companies.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.name} ({c.activity || 'Subempreiteiro'})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                                    Descrição e Ações Corretivas
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder="Descreva a anomalia verificada e o prazo de regularização..."
                                    value={formDesc}
                                    onChange={e => setFormDesc(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-neutral-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 dark:bg-neutral-800 resize-none"
                                />
                            </div>

                            {/* Photo Attachment */}
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                                    Fotografia da Visita
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="URL da imagem ou anexe ficheiro..."
                                        value={formPhoto}
                                        onChange={e => setFormPhoto(e.target.value)}
                                        className="flex-1 px-3 py-2 border border-slate-300 dark:border-neutral-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 dark:bg-neutral-800 text-xs"
                                    />
                                    <label className="cursor-pointer px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 rounded-lg flex items-center justify-center text-slate-600 font-medium">
                                        <Camera size={15} />
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const reader = new FileReader();
                                                    reader.onload = (loadEvent) => {
                                                        setFormPhoto(loadEvent.target?.result as string);
                                                    };
                                                    reader.readAsDataURL(file);
                                                }
                                            }}
                                        />
                                    </label>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-neutral-800">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                                >
                                    <Check size={14} />
                                    Fixar Ponto no Modelo 3D
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Folhas Técnicas 2D */}
            {is2dDrawingsModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
                    <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-neutral-800 max-w-3xl w-full overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="p-4 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between bg-amber-50 dark:bg-amber-950/40">
                            <div className="flex items-center gap-2">
                                <FileText size={18} className="text-amber-600" />
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                        Desenhos 2D de Obra (Plantas e Cortes)
                                    </h3>
                                    <p className="text-[11px] text-slate-500">
                                        Peças desenhadas oficiais arquivadas na raiz do CDE <code className="bg-amber-100/60 dark:bg-neutral-800 px-1 py-0.5 rounded">Desenhos 2D (Plantas e Cortes)</code>
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setIs2dDrawingsModalOpen(false);
                                    setSelected2dDrawing(null);
                                }}
                                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-4 flex-1 overflow-y-auto space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {DEFAULT_2D_DRAWINGS.map(drawing => (
                                    <div
                                        key={drawing.id}
                                        onClick={() => setSelected2dDrawing(drawing)}
                                        className={cn(
                                            "p-3.5 rounded-xl border text-xs cursor-pointer transition-all",
                                            selected2dDrawing?.id === drawing.id
                                                ? "bg-amber-50/70 dark:bg-amber-950/30 border-amber-500 ring-2 ring-amber-500/20 shadow-sm"
                                                : "bg-white dark:bg-neutral-800 border-slate-200 dark:border-neutral-700 hover:border-slate-300"
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-neutral-700 text-[10px]">
                                                    {drawing.code}
                                                </span>
                                                <span className="font-bold text-slate-900 dark:text-white">
                                                    {drawing.title}
                                                </span>
                                            </div>
                                            <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                                {drawing.revision}
                                            </span>
                                        </div>

                                        <p className="text-[11px] text-slate-500 mt-1">
                                            📄 {drawing.fileName}
                                        </p>

                                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 mt-2 border-t border-slate-100 dark:border-neutral-700/60">
                                            <span>Piso: <strong>{drawing.storey}</strong> • Escala: {drawing.format}</span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleToggleViewDimension('2d');
                                                    setSelectedStorey(drawing.storey);
                                                    setIs2dDrawingsModalOpen(false);
                                                }}
                                                className="text-blue-600 font-semibold hover:underline"
                                            >
                                                Ver no Corte 2D &rarr;
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-3 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-between bg-slate-50 dark:bg-neutral-800/50 text-xs">
                            <span className="text-slate-500">
                                {DEFAULT_2D_DRAWINGS.length} desenhos técnicos arquivados no projeto.
                            </span>
                            <button
                                onClick={() => setIs2dDrawingsModalOpen(false)}
                                className="px-4 py-1.5 bg-slate-200 dark:bg-neutral-700 hover:bg-slate-300 text-slate-800 dark:text-slate-100 rounded-lg font-medium cursor-pointer"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Photo Lightbox Modal */}
            {lightboxPhoto && (
                <div
                    onClick={() => setLightboxPhoto(null)}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm cursor-zoom-out"
                >
                    <div className="relative max-w-4xl max-h-[85vh] overflow-hidden rounded-xl">
                        <img src={lightboxPhoto} alt="Ampliação" className="w-full h-full object-contain" />
                        <button
                            onClick={() => setLightboxPhoto(null)}
                            className="absolute top-3 right-3 p-1.5 bg-black/60 text-white rounded-full hover:bg-black"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
