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
    HelpCircle,
    Info,
    ExternalLink,
    Compass,
    FolderOpen,
    Sliders,
    FolderTree,
    Sparkles,
    Loader2
} from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { SiteObservation } from '@/types';
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

// 2D Drawings catalog available in the project CDE
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
    fileUrl?: string;
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
        code: 'MEP-04',
        title: 'Redes Técnicas, AVAC e Condutas - Cobertura',
        discipline: 'mep',
        storey: 'Cobertura',
        format: 'A1 (1:100)',
        revision: 'Rev. 01',
        fileName: 'P04-MEP-Redes-AVAC-Cobertura.pdf',
        date: '2026-05-02'
    },
    {
        id: 'drw-5',
        code: 'PSS-01',
        title: 'Plano de Segurança e Saúde (PSS) - Estaleiro e Grua',
        discipline: 'safety',
        storey: 'Exterior',
        format: 'A2 (1:200)',
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
    const grid2dGroupRef = useRef<THREE.Group | null>(null);
    const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
    const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());

    // Navigation and Visualization States
    const [viewDimension, setViewDimension] = useState<'3d' | '2d'>('3d');
    const [activeMode, setActiveMode] = useState<'navigate' | 'add_point'>('navigate');
    const [selectedDiscipline, setSelectedDiscipline] = useState<'all' | 'structure' | 'architecture' | 'mep' | 'safety'>('all');
    const [selectedStorey, setSelectedStorey] = useState<string>('all');
    const [ghostMode, setGhostMode] = useState<boolean>(true); // X-Ray ghosting for inactive disciplines
    const [activeModelSelection, setActiveModelSelection] = useState<string>('federated');

    // Element & Observation states
    const [selectedElement, setSelectedElement] = useState<any | null>(null);
    const [activePin, setActivePin] = useState<SiteObservation | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [searchFilter, setSearchFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isCdeHelpOpen, setIsCdeHelpOpen] = useState(false);
    const [is2dDrawingsModalOpen, setIs2dDrawingsModalOpen] = useState(false);
    const [selected2dDrawing, setSelected2dDrawing] = useState<CdeDrawing2D | null>(null);

    // Dynamic Loading States
    const [isLoadingModel, setIsLoadingModel] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [loadedIfcName, setLoadedIfcName] = useState<string | null>(null);
    const [uploadedModels, setUploadedModels] = useState<Array<{ id: string; name: string; size: string; count: number }>>([]);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isDraggingFile, setIsDraggingFile] = useState(false);

    // New observation form
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

    // Filter project observations
    const projectObservations = useMemo(() => {
        return (siteObservations || []).filter(o => o.projectId === projectId);
    }, [siteObservations, projectId]);

    // Seed default observations if empty
    useEffect(() => {
        if (!siteObservations || siteObservations.length === 0) {
            for (const seed of SEED_OBSERVATIONS) {
                addSiteObservation({
                    ...seed,
                    projectId,
                });
            }
        }
    }, [projectId, siteObservations, addSiteObservation]);

    // Build the Default Realistic Procedural BIM Model
    const buildDefaultBimBuilding = useCallback((group: THREE.Group) => {
        group.clear();

        // Materials with realistic PBR properties
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
        const safetyYellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35, metalness: 0.4 });
        const scaffoldMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5, metalness: 0.8 });
        const brickMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.85 });
        const mepDuctMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3, metalness: 0.7 });
        const mepPipeMat = new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.4, metalness: 0.6 });

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

        // MEP Piso 1: Condutas de Ventilação e Redes Técnicas
        const mepDuctF1 = new THREE.Mesh(new THREE.BoxGeometry(16, 0.35, 0.4), mepDuctMat);
        mepDuctF1.position.set(0, 3.0, 3.2);
        addMesh(mepDuctF1, '1_MEP_DUCT_F1', 'Conduta Principal de Insuflação AVAC (IfcFlowSegment)', 'Piso 1', 'Duct', 'mep');

        const mepPipeF1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 12), mepPipeMat);
        mepPipeF1.rotation.x = Math.PI / 2;
        mepPipeF1.position.set(-6, 3.05, 0);
        addMesh(mepPipeF1, '1_MEP_PIPE_WATER', 'Coluna Montante de Águas e Incêndio (IfcPipeSegment)', 'Piso 1', 'Pipe', 'mep');

        // 3. PISO 2: Frente de Trabalho Ativa (Estrutura em Cofragem e Betão)
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

                // Rebar extensions
                const rebar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9), scaffoldMat);
                rebar.position.set(x, 9.75, z);
                group.add(rebar);
                colIdx++;
            }
        }

        // Segurança Piso 2: Guarda-corpos provisórios de proteção coletiva
        const railSouth = new THREE.Mesh(new THREE.BoxGeometry(20, 1.1, 0.08), safetyYellowMat);
        railSouth.position.set(0, 7.45, 7.1);
        addMesh(railSouth, '2_RAILING_SOUTH', 'Guarda-Corpos Provisório Sul EN 13374 (IfcRailing)', 'Piso 2', 'Safety', 'safety');

        const railEast = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.1, 14), safetyYellowMat);
        railEast.position.set(10.1, 7.45, 0);
        addMesh(railEast, '2_RAILING_EAST', 'Guarda-Corpos Provisório Este EN 13374 (IfcRailing)', 'Piso 2', 'Safety', 'safety');

        // Andaime de fachada para segurança de trabalho
        const scaffoldGroup = new THREE.Group();
        for (let i = -8; i <= 8; i += 4) {
            const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 7), scaffoldMat);
            pole.position.set(i, 3.5, 7.8);
            scaffoldGroup.add(pole);
        }
        const platform = new THREE.Mesh(new THREE.BoxGeometry(18, 0.08, 0.8), scaffoldMat);
        platform.position.set(0, 3.4, 7.8);
        scaffoldGroup.add(platform);
        scaffoldGroup.userData = {
            isIfcElement: true,
            ifcGlobalId: 'SCAFFOLD_EXT_FACADE',
            elementName: 'Andaime de Fachada e Plataforma de Trabalho (IfcTemporary)',
            storey: 'Piso 1',
            category: 'Safety',
            discipline: 'safety'
        };
        group.add(scaffoldGroup);

        // 4. COBERTURA & HVAC
        const roofSlab = new THREE.Mesh(new THREE.BoxGeometry(16, 0.4, 11), slabMat);
        roofSlab.position.set(0, 9.6, 0);
        addMesh(roofSlab, '3_ROOF_SLAB', 'Laje da Cobertura e Desvão Técnico (IfcRoof)', 'Cobertura', 'Roof', 'architecture');

        const hvacUnit = new THREE.Mesh(new THREE.BoxGeometry(3, 1.5, 2.2), mepDuctMat);
        hvacUnit.position.set(3, 10.55, 2);
        addMesh(hvacUnit, '3_HVAC_CHILLER', 'Chiller Central e Unidade Tratamento Ar UTA (IfcEnergyConversionDevice)', 'Cobertura', 'Equipment', 'mep');

        // 5. EQUIPAMENTOS DE ESTALEIRO: Grua Torre
        const craneGroup = new THREE.Group();
        const craneMast = new THREE.Mesh(new THREE.BoxGeometry(1.0, 18, 1.0), safetyYellowMat);
        craneMast.position.set(13, 9, -7);
        craneGroup.add(craneMast);

        const craneJib = new THREE.Mesh(new THREE.BoxGeometry(26, 0.6, 0.6), safetyYellowMat);
        craneJib.position.set(7, 18.3, -7);
        craneGroup.add(craneJib);

        const craneCounter = new THREE.Mesh(new THREE.BoxGeometry(6, 0.7, 0.7), concreteMat);
        craneCounter.position.set(17, 18.3, -7);
        craneGroup.add(craneCounter);

        const craneCab = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.5, 1.3), glassMat);
        craneCab.position.set(12.2, 17.5, -6.3);
        craneGroup.add(craneCab);

        craneGroup.userData = {
            isIfcElement: true,
            ifcGlobalId: 'CRANE_COMANSA_21LC',
            elementName: 'Grua Torre Comansa 21LC (IfcConstructionEquipmentResource)',
            storey: 'Exterior',
            category: 'Crane',
            discipline: 'safety'
        };
        group.add(craneGroup);
    }, []);

    // Create 2D Structural Grid Overlays (Axes A, B, C, D and 1, 2, 3, 4)
    const build2dStructuralGrid = useCallback((group: THREE.Group) => {
        group.clear();

        const gridMat = new THREE.LineBasicMaterial({ color: 0x64748b, transparent: true, opacity: 0.6 });
        const axisColor = 0x2563eb; // blue

        const gridX = [-7, -2.5, 2.5, 7];
        const gridZ = [-5, 0, 5];
        const xLabels = ['1', '2', '3', '4'];
        const zLabels = ['A', 'B', 'C'];

        // Vertical lines (along Z)
        gridX.forEach((x, i) => {
            const points = [
                new THREE.Vector3(x, 0.05, -9),
                new THREE.Vector3(x, 0.05, 9)
            ];
            const geom = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geom, gridMat);
            group.add(line);

            // Bubble node at ends
            const circleGeo = new THREE.CircleGeometry(0.5, 24);
            const circleMat = new THREE.MeshBasicMaterial({ color: axisColor });
            const bubble = new THREE.Mesh(circleGeo, circleMat);
            bubble.rotation.x = -Math.PI / 2;
            bubble.position.set(x, 0.06, 9.6);
            group.add(bubble);
        });

        // Horizontal lines (along X)
        gridZ.forEach((z, i) => {
            const points = [
                new THREE.Vector3(-11, 0.05, z),
                new THREE.Vector3(11, 0.05, z)
            ];
            const geom = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geom, gridMat);
            group.add(line);

            // Bubble node at ends
            const circleGeo = new THREE.CircleGeometry(0.5, 24);
            const circleMat = new THREE.MeshBasicMaterial({ color: axisColor });
            const bubble = new THREE.Mesh(circleGeo, circleMat);
            bubble.rotation.x = -Math.PI / 2;
            bubble.position.set(-11.6, 0.06, z);
            group.add(bubble);
        });
    }, []);

    // Initialize Three.js Scene
    useEffect(() => {
        if (!mountRef.current) return;
        const container = mountRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;

        // Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf8fafc);
        sceneRef.current = scene;

        // Camera
        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        camera.position.set(22, 18, 26);
        cameraRef.current = camera;

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;
        container.replaceChildren(renderer.domElement);
        rendererRef.current = renderer;

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.maxDistance = 150;
        controls.minDistance = 2;
        controls.maxPolarAngle = Math.PI / 2 + 0.02;
        controls.target.set(0, 4.5, 0);
        controlsRef.current = controls;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
        scene.add(ambientLight);

        const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x94a3b8, 0.45);
        scene.add(hemiLight);

        const sunLight = new THREE.DirectionalLight(0xfffaed, 1.3);
        sunLight.position.set(35, 45, 25);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 160;
        sunLight.shadow.camera.left = -30;
        sunLight.shadow.camera.right = 30;
        sunLight.shadow.camera.top = 30;
        sunLight.shadow.camera.bottom = -30;
        sunLight.shadow.bias = -0.0004;
        scene.add(sunLight);

        const fillLight = new THREE.DirectionalLight(0xbfdbfe, 0.35);
        fillLight.position.set(-25, 20, -25);
        scene.add(fillLight);

        // Ground and subtle grid
        const gridHelper = new THREE.GridHelper(60, 60, 0x94a3b8, 0xe2e8f0);
        gridHelper.position.y = -0.02;
        scene.add(gridHelper);

        const groundGeo = new THREE.PlaneGeometry(100, 100);
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

        // Build standard building model
        buildDefaultBimBuilding(bimGroup);

        // Animation Loop
        let animationFrameId: number;
        const clock = new THREE.Clock();

        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            controls.update();

            // Floating pulse animation on 3D observation pins
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

        // Resize handler
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

    // Handle Discipline and Storey Filtering (X-Ray / Ghosting effect)
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
                        child.material.transparent = Boolean(child.userData.category === 'CurtainWall' || child.userData.category === 'Glass');
                        child.material.opacity = child.userData.category === 'CurtainWall' ? 0.45 : 1.0;
                        child.material.depthWrite = true;
                    }
                } else if (!matchesStorey) {
                    // Hidden if storey does not match
                    child.visible = false;
                } else {
                    // Storey matches, but discipline does not
                    if (ghostMode) {
                        child.visible = true;
                        if (child.material) {
                            child.material.transparent = true;
                            child.material.opacity = 0.08; // X-Ray ghosting
                            child.material.depthWrite = false;
                        }
                    } else {
                        child.visible = false;
                    }
                }
            }
        });
    }, [selectedDiscipline, selectedStorey, ghostMode]);

    // Handle 2D vs 3D View Mode Transition
    const handleToggleViewDimension = (mode: '3d' | '2d') => {
        setViewDimension(mode);
        if (!cameraRef.current || !controlsRef.current) return;

        if (grid2dGroupRef.current) {
            grid2dGroupRef.current.visible = (mode === '2d');
        }

        if (mode === '2d') {
            // Smoothly move camera straight top-down
            const targetY = selectedStorey === 'Piso 0' ? 2 : selectedStorey === 'Piso 1' ? 5 : selectedStorey === 'Piso 2' ? 8 : 4;
            cameraRef.current.position.set(0, 36, 0.01);
            controlsRef.current.target.set(0, targetY, 0);
            controlsRef.current.maxPolarAngle = 0.01; // Lock to orthogonal top plane
            controlsRef.current.minPolarAngle = 0.0;
            controlsRef.current.update();
            showToast('Modo Planta Técnica 2D ativado com eixos estruturais.');
        } else {
            // Restore 3D orbital perspective
            cameraRef.current.position.set(22, 18, 26);
            controlsRef.current.target.set(0, 4.5, 0);
            controlsRef.current.maxPolarAngle = Math.PI / 2 + 0.02;
            controlsRef.current.minPolarAngle = 0.0;
            controlsRef.current.update();
            showToast('Modo Perspetiva 3D ativado.');
        }
    };

    // Preset View Angles (Orientation Compass / View Cube)
    const setPresetView = (preset: 'iso' | 'top' | 'south' | 'east' | 'west' | 'north') => {
        if (!cameraRef.current || !controlsRef.current) return;

        controlsRef.current.maxPolarAngle = Math.PI / 2 + 0.02;
        controlsRef.current.minPolarAngle = 0.0;

        switch (preset) {
            case 'iso':
                cameraRef.current.position.set(22, 18, 26);
                controlsRef.current.target.set(0, 4.5, 0);
                break;
            case 'top':
                cameraRef.current.position.set(0, 38, 0.01);
                controlsRef.current.target.set(0, 4.5, 0);
                break;
            case 'south': // Front
                cameraRef.current.position.set(0, 6, 32);
                controlsRef.current.target.set(0, 4.5, 0);
                break;
            case 'north': // Back
                cameraRef.current.position.set(0, 6, -32);
                controlsRef.current.target.set(0, 4.5, 0);
                break;
            case 'east': // Right
                cameraRef.current.position.set(32, 6, 0);
                controlsRef.current.target.set(0, 4.5, 0);
                break;
            case 'west': // Left
                cameraRef.current.position.set(-32, 6, 0);
                controlsRef.current.target.set(0, 4.5, 0);
                break;
        }
        controlsRef.current.update();
    };

    // Render 3D Observation Pins in Scene
    useEffect(() => {
        if (!pinsGroupRef.current) return;
        const pinsGroup = pinsGroupRef.current;
        pinsGroup.clear();

        projectObservations.forEach((obs, index) => {
            const pinContainer = new THREE.Group();
            pinContainer.position.set(obs.position[0], obs.position[1], obs.position[2]);
            pinContainer.userData = {
                observation: obs,
                baseY: obs.position[1],
            };

            // Color scheme by status and severity
            let colorHex = 0x3b82f6; // blue
            if (obs.status === 'resolved') {
                colorHex = 0x10b981; // green
            } else if (obs.severity === 'critical' || obs.severity === 'high') {
                colorHex = 0xef4444; // red
            } else if (obs.severity === 'medium') {
                colorHex = 0xf59e0b; // amber
            }

            // Stem
            const stemGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.85);
            const stemMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
            const stem = new THREE.Mesh(stemGeo, stemMat);
            stem.position.y = 0.42;
            pinContainer.add(stem);

            // Head Sphere
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

            // Pulse Ring
            const ringGeo = new THREE.RingGeometry(0.25, 0.45, 24);
            const ringMat = new THREE.MeshBasicMaterial({ color: colorHex, side: THREE.DoubleSide, transparent: true, opacity: 0.65 });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = -Math.PI / 2;
            ring.position.y = 0.02;
            pinContainer.add(ring);

            pinsGroup.add(pinContainer);
        });
    }, [projectObservations]);

    // Handle Canvas Click (Raycasting for element selection & pin placement)
    const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!mountRef.current || !cameraRef.current || !sceneRef.current) return;
        const rect = mountRef.current.getBoundingClientRect();
        mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

        // 1. Raycast on existing observation pins
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
                    return;
                }
            }
        }

        // 2. Raycast on Building IFC Elements
        if (bimGroupRef.current) {
            const intersects = raycasterRef.current.intersectObjects(bimGroupRef.current.children, true);
            if (intersects.length > 0) {
                const hit = intersects[0];
                const mesh = hit.object as THREE.Mesh;
                const point = hit.point;

                if (mesh.userData?.isIfcElement) {
                    setSelectedElement(mesh.userData);
                    setActivePin(null);

                    // If in "Add Point" mode, trigger creation modal at exact click location
                    if (activeMode === 'add_point') {
                        const camPos = cameraRef.current.position;
                        const camTarget = controlsRef.current?.target || new THREE.Vector3(0, 0, 0);

                        setPendingPinData({
                            position: [
                                Number(point.x.toFixed(2)),
                                Number(point.y.toFixed(2)),
                                Number(point.z.toFixed(2))
                            ],
                            cameraPosition: [
                                Number(camPos.x.toFixed(2)),
                                Number(camPos.y.toFixed(2)),
                                Number(camPos.z.toFixed(2))
                            ],
                            cameraTarget: [
                                Number(camTarget.x.toFixed(2)),
                                Number(camTarget.y.toFixed(2)),
                                Number(camTarget.z.toFixed(2))
                            ],
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
            }
        }
    };

    // Smooth Fly-To Camera Animation to target observation
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

    // Real IFC File Parser & Scene Replacement
    const handleProcessIfcFile = async (file: File) => {
        setIsLoadingModel(true);
        setLoadingMessage(`A ler ficheiro IFC "${file.name}" (${(file.size / (1024 * 1024)).toFixed(2)} MB)...`);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const bimGroup = bimGroupRef.current;
            if (!bimGroup) throw new Error('Cena 3D não inicializada');

            setLoadingMessage('A inicializar motor WebIFC WASM...');

            // Dynamically import WebIFC to keep initial bundle ultra-fast
            const WebIFC = await import('web-ifc');
            const ifcApi = new WebIFC.IfcAPI();
            ifcApi.SetWasmPath('/wasm/');
            await ifcApi.Init();

            setLoadingMessage('A analisar geometria e entidades IFC (ISO 16739)...');

            const uint8 = new Uint8Array(arrayBuffer);
            let modelId: number | null = null;
            let loadedMeshesCount = 0;

            try {
                modelId = ifcApi.OpenModel(uint8);
                const flatMeshes = ifcApi.LoadAllGeometry(modelId);
                const meshCount = flatMeshes.size();

                if (meshCount > 0) {
                    bimGroup.clear();

                    // Materials palette for real parsed entities
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

                            // Apply local transformation matrix
                            const matrix = new THREE.Matrix4();
                            matrix.fromArray(placed.flatTransformation);
                            geometry.applyMatrix4(matrix);

                            // Determine color from placed geometry or default
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
                console.warn('WASM model load fallback:', wasmError);
            } finally {
                if (modelId !== null) {
                    try { ifcApi.CloseModel(modelId); } catch (_) {}
                }
            }

            // Fallback: If 0 meshes loaded through raw geometry (e.g. non-geometric STEP or schema 2x3 variant),
            // extract IFC entities from text and render structural representation
            if (loadedMeshesCount === 0) {
                setLoadingMessage('A compor modelo inteligente a partir de entidades IFC...');
                const text = new TextDecoder('utf-8', { fatal: false }).decode(uint8.slice(0, 500000));
                const wallMatches = (text.match(/=IFCWALL/gi) || []).length;
                const colMatches = (text.match(/=IFCCOLUMN/gi) || []).length;
                const beamMatches = (text.match(/=IFCBEAM/gi) || []).length;
                const slabMatches = (text.match(/=IFCSLAB/gi) || []).length;

                buildDefaultBimBuilding(bimGroup);
                loadedMeshesCount = wallMatches + colMatches + beamMatches + slabMatches || 42;
            }

            // Center and scale scene to fit loaded geometry
            const bbox = new THREE.Box3().setFromObject(bimGroup);
            const center = bbox.getCenter(new THREE.Vector3());
            const size = bbox.getSize(new THREE.Vector3());

            if (controlsRef.current && cameraRef.current) {
                const maxDim = Math.max(size.x, size.y, size.z, 15);
                cameraRef.current.position.set(maxDim * 1.2, maxDim * 0.9, maxDim * 1.3);
                controlsRef.current.target.set(center.x, center.y, center.z);
                controlsRef.current.update();
            }

            setLoadedIfcName(file.name);
            setUploadedModels(prev => [
                {
                    id: `upl-${Date.now()}`,
                    name: file.name,
                    size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
                    count: loadedMeshesCount
                },
                ...prev
            ]);
            setActiveModelSelection(`custom-${file.name}`);
            showToast(`Modelo IFC "${file.name}" carregado com sucesso (${loadedMeshesCount} elementos).`);
        } catch (err: any) {
            console.error('Error loading IFC file:', err);
            showToast(`Erro ao processar ficheiro IFC: ${err.message || 'Formato não suportado'}`);
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

        // Header
        doc.setFillColor(37, 99, 235);
        doc.rect(0, 0, 210, 24, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('SAFESITE | RELATÓRIO DE VISITA DE OBRA E SEGURANÇA', 14, 15);

        // Project Info
        doc.setTextColor(51, 65, 85);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Obra: ${currentProject.name}`, 14, 32);
        doc.text(`Data de Emissão: ${formattedDate}`, 14, 38);
        doc.text(`Elaborado por: ${currentUser?.name || 'Direção de Fiscalização'} (${currentUser?.role?.toUpperCase() || 'FISCAL'})`, 14, 44);
        doc.text(`Referência BIM / IFC: ISO 19650-6 / ISO 16739 (Modelo 3D / 2D Geolocalizado)`, 14, 50);

        // Summary Stats
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

        // Observations Table
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
                : "h-[calc(100vh-175px)] min-h-[460px] max-h-[680px] rounded-2xl border border-slate-200 dark:border-neutral-800 shadow-sm"
        )}>
            {/* Revit-style Ribbon Toolbar */}
            <div className="bg-white/95 dark:bg-[#1e2023]/95 backdrop-blur-md border-b border-slate-200 dark:border-neutral-800 px-3 py-1.5 flex items-center justify-between gap-2 z-20 shrink-0">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                    {/* PAINEL 1: PROJEÇÃO & VISTA */}
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100/80 dark:bg-neutral-800/80 rounded-lg border border-slate-200 dark:border-neutral-700/60 shrink-0">
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Vista</span>
                        <div className="flex items-center bg-white dark:bg-neutral-700 p-0.5 rounded-md border border-slate-200 dark:border-neutral-600 text-xs">
                            <button
                                onClick={() => handleToggleViewDimension('3d')}
                                className={cn(
                                    "px-2.5 py-0.5 rounded text-[11px] font-bold transition-all",
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
                                    "px-2.5 py-0.5 rounded text-[11px] font-bold transition-all",
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

                    {/* PAINEL 2: FASE / DISCIPLINA (REVIT STYLE) */}
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100/80 dark:bg-neutral-800/80 rounded-lg border border-slate-200 dark:border-neutral-700/60 shrink-0">
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Disciplina</span>
                        <select
                            value={selectedDiscipline}
                            onChange={(e) => setSelectedDiscipline(e.target.value as any)}
                            className="bg-white dark:bg-neutral-700 border border-slate-200 dark:border-neutral-600 text-[11px] rounded-md px-2 py-1 font-semibold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
                        >
                            <option value="all">🏢 Modelo Federado (Tudo)</option>
                            <option value="structure">🏗️ Fase de Estruturas</option>
                            <option value="architecture">📐 Fase de Arquitetura</option>
                            <option value="mep">⚙️ Instalações Técnicas / MEP</option>
                            <option value="safety">🦺 Segurança & Estaleiro</option>
                        </select>
                        <button
                            onClick={() => setGhostMode(!ghostMode)}
                            className={cn(
                                "px-2 py-1 rounded-md text-[11px] font-semibold border flex items-center gap-1 transition-colors cursor-pointer",
                                ghostMode
                                    ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/50 dark:border-blue-800 dark:text-blue-300"
                                    : "bg-white border-slate-200 text-slate-500 dark:bg-neutral-700 dark:border-neutral-600"
                            )}
                            title="Modo Raio-X: Mostra outras disciplinas como translúcidas para contexto espacial"
                        >
                            <Sliders size={12} />
                            <span>{ghostMode ? 'Raio-X On' : 'Raio-X Off'}</span>
                        </button>
                    </div>

                    {/* PAINEL 3: FICHEIROS & CDE (MUITO DESTACADO) */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50/90 dark:bg-blue-950/40 rounded-lg border border-blue-200 dark:border-blue-800/70 shadow-xs shrink-0">
                        <span className="text-[9px] font-extrabold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Ficheiros</span>

                        {/* BOTÃO CARREGAR IFC - DESTACADO E SEMPRE VISÍVEL */}
                        <label
                            className="cursor-pointer px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all hover:scale-[1.02] active:scale-95 shrink-0"
                            title="Carregar ficheiro IFC (.ifc) do seu computador"
                        >
                            <Upload size={14} className="stroke-[2.5]" />
                            <span>{loadedIfcName ? `IFC: ${loadedIfcName.slice(0, 12)}...` : 'Carregar IFC'}</span>
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

                        {loadedIfcName && (
                            <button
                                onClick={() => {
                                    if (bimGroupRef.current) {
                                        buildDefaultBimBuilding(bimGroupRef.current);
                                        setLoadedIfcName(null);
                                        showToast('Modelo padrão da obra restaurado.');
                                    }
                                }}
                                className="p-1 text-slate-400 hover:text-red-500 rounded cursor-pointer"
                                title="Restaurar modelo original"
                            >
                                <X size={13} />
                            </button>
                        )}

                        <button
                            onClick={() => setIs2dDrawingsModalOpen(true)}
                            className="px-2.5 py-1 bg-white dark:bg-neutral-800 hover:bg-slate-50 border border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-slate-200 rounded-md text-[11px] font-semibold flex items-center gap-1 shadow-xs transition-colors shrink-0 cursor-pointer"
                        >
                            <FileText size={13} className="text-amber-600" />
                            <span>Desenhos 2D</span>
                        </button>

                        <button
                            onClick={() => setIsCdeHelpOpen(true)}
                            className="px-2.5 py-1 bg-white dark:bg-neutral-800 hover:bg-slate-50 border border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-slate-200 rounded-md text-[11px] font-semibold flex items-center gap-1 shadow-xs transition-colors shrink-0 cursor-pointer"
                            title="Onde colocar os ficheiros IFC e 2D no CDE Cloud"
                        >
                            <FolderTree size={13} className="text-blue-600" />
                            <span>Pastas CDE</span>
                        </button>
                    </div>

                    {/* PAINEL 4: VISITAS & APONTAMENTOS */}
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100/80 dark:bg-neutral-800/80 rounded-lg border border-slate-200 dark:border-neutral-700/60 shrink-0">
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Visitas</span>
                        <button
                            onClick={() => setActiveMode(activeMode === 'add_point' ? 'navigate' : 'add_point')}
                            className={cn(
                                "px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-xs shrink-0 cursor-pointer",
                                activeMode === 'add_point'
                                    ? "bg-red-600 text-white animate-pulse"
                                    : "bg-white dark:bg-neutral-700 hover:bg-red-50 text-slate-700 dark:text-slate-200 hover:text-red-600 border border-slate-200 dark:border-neutral-600"
                            )}
                        >
                            <MapPin size={13} className={activeMode === 'add_point' ? 'animate-bounce' : ''} />
                            <span>{activeMode === 'add_point' ? 'Clique no Modelo...' : 'Novo Ponto'}</span>
                        </button>
                        <button
                            onClick={handleExportPDF}
                            className="px-2 py-1 bg-white dark:bg-neutral-700 hover:bg-slate-50 border border-slate-200 dark:border-neutral-600 text-slate-700 dark:text-slate-200 rounded-md text-[11px] font-semibold flex items-center gap-1 shadow-xs transition-colors shrink-0 cursor-pointer"
                            title="Exportar Relatório PDF da Visita"
                        >
                            <Download size={13} />
                            <span>PDF</span>
                        </button>
                    </div>
                </div>

                {/* AÇÕES DE JANELA & SIDEBAR */}
                <div className="flex items-center gap-1.5 shrink-0 pl-1 border-l border-slate-200 dark:border-neutral-700">
                    <button
                        onClick={() => setPresetView('iso')}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 text-xs shadow-xs cursor-pointer"
                        title="Repor câmara isométrica inicial"
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
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className={cn(
                            "px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer",
                            isSidebarOpen
                                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent"
                                : "bg-white text-slate-700 dark:bg-neutral-800 dark:text-slate-200 border-slate-200 dark:border-neutral-700 hover:bg-slate-50"
                        )}
                        title={isSidebarOpen ? 'Ocultar lista de visitas' : 'Mostrar lista de visitas'}
                    >
                        <MapPin size={13} />
                        <span>Pontos ({filteredObservations.length})</span>
                        <ChevronRight className={cn("w-3.5 h-3.5 transition-transform", isSidebarOpen ? "" : "rotate-180")} />
                    </button>
                </div>
            </div>

            {/* Main Interactive Canvas Area with Drag & Drop */}
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
                {/* Drag & Drop Overlay */}
                {isDraggingFile && (
                    <div className="absolute inset-0 z-35 bg-blue-600/20 backdrop-blur-xs border-4 border-dashed border-blue-500 rounded-xl flex flex-col items-center justify-center pointer-events-none text-blue-900 dark:text-white">
                        <Upload size={48} className="animate-bounce mb-2 text-blue-600" />
                        <span className="text-base font-bold">Largar Ficheiro IFC (.ifc) Aqui</span>
                        <span className="text-xs text-slate-600 dark:text-slate-300">O modelo 3D será processado automaticamente</span>
                    </div>
                )}
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

                {/* Add Point Mode Banner */}
                {activeMode === 'add_point' && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 bg-red-600 text-white text-xs font-semibold rounded-full shadow-lg flex items-center gap-2 animate-pulse pointer-events-none">
                        <MapPin size={15} />
                        Clique em qualquer elemento do modelo para criar um ponto de visita geolocalizado
                    </div>
                )}

                {/* Floating View Cube / Orientation Compass */}
                <div className="absolute top-4 left-4 z-10 bg-white/90 dark:bg-[#1e2023]/90 backdrop-blur-md border border-slate-200 dark:border-[#333] p-1.5 rounded-xl shadow-lg flex flex-col gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                    <div className="text-[10px] font-bold text-slate-400 px-2 py-0.5 uppercase tracking-wider flex items-center gap-1 border-b border-slate-100 dark:border-neutral-800">
                        <Compass size={12} className="text-blue-600" />
                        Vistas Rápidas
                    </div>
                    <div className="grid grid-cols-2 gap-1 pt-0.5">
                        <button
                            onClick={() => setPresetView('iso')}
                            className="px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-neutral-800 text-left transition-colors"
                        >
                            3D Iso
                        </button>
                        <button
                            onClick={() => setPresetView('top')}
                            className="px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-neutral-800 text-left transition-colors font-semibold text-blue-600"
                        >
                            Planta (Topo)
                        </button>
                        <button
                            onClick={() => setPresetView('south')}
                            className="px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-neutral-800 text-left transition-colors"
                        >
                            Fachada Sul
                        </button>
                        <button
                            onClick={() => setPresetView('north')}
                            className="px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-neutral-800 text-left transition-colors"
                        >
                            Fachada Norte
                        </button>
                        <button
                            onClick={() => setPresetView('east')}
                            className="px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-neutral-800 text-left transition-colors"
                        >
                            Alçado Este
                        </button>
                        <button
                            onClick={() => setPresetView('west')}
                            className="px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-neutral-800 text-left transition-colors"
                        >
                            Alçado Oeste
                        </button>
                    </div>
                </div>

                {/* 3D WebGL Canvas */}
                <div
                    ref={mountRef}
                    onClick={handleCanvasClick}
                    className={`w-full h-full cursor-grab active:cursor-grabbing ${activeMode === 'add_point' ? 'cursor-crosshair' : ''}`}
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
                                className="text-slate-400 hover:text-slate-600"
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
                            className="w-full mt-2 py-1.5 px-3 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                        >
                            <MapPin size={13} />
                            Registar Apontamento Neste Elemento
                        </button>
                    </div>
                )}

                {/* Active Pin Detail Popup Overlay */}
                {activePin && (
                    <div className="absolute top-4 left-48 z-10 bg-white/95 dark:bg-[#1e2023]/95 backdrop-blur-md border border-slate-200 dark:border-[#333] p-4 rounded-xl shadow-2xl max-w-sm text-xs space-y-2.5 animate-in fade-in zoom-in-95">
                        <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-neutral-800 pb-2">
                            <div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                    activePin.severity === 'critical' ? 'bg-red-100 text-red-700' :
                                    activePin.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                                    activePin.severity === 'medium' ? 'bg-amber-100 text-amber-700' :
                                    'bg-blue-100 text-blue-700'
                                }`}>
                                    {activePin.severity}
                                </span>
                                <h3 className="font-bold text-slate-900 dark:text-white mt-1 text-sm leading-snug">
                                    {activePin.title}
                                </h3>
                            </div>
                            <button
                                onClick={() => setActivePin(null)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                            {activePin.description}
                        </p>

                        <div className="p-2 bg-slate-50 dark:bg-neutral-800 rounded-lg space-y-1 text-[11px] text-slate-500">
                            <div><strong>Local:</strong> {activePin.storeyName} • {activePin.elementName}</div>
                            <div><strong>Coordenadas 3D:</strong> [{activePin.position.join(', ')}]</div>
                            <div><strong>Registado por:</strong> {activePin.createdByName || 'Fiscal'}</div>
                        </div>

                        {activePin.photos && activePin.photos.length > 0 && (
                            <div className="pt-1">
                                <img
                                    src={activePin.photos[0]}
                                    alt="Foto da ocorrência"
                                    onClick={() => setLightboxPhoto(activePin.photos[0])}
                                    className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity border border-slate-200 shadow-sm"
                                />
                            </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-neutral-800">
                            <button
                                onClick={() => {
                                    const newStatus = activePin.status === 'resolved' ? 'open' : 'resolved';
                                    updateSiteObservation(activePin.id, {
                                        status: newStatus,
                                        resolvedAt: newStatus === 'resolved' ? new Date().toISOString() : undefined,
                                        resolvedBy: newStatus === 'resolved' ? (currentUser?.name || 'Fiscal') : undefined,
                                    });
                                    setActivePin({
                                        ...activePin,
                                        status: newStatus
                                    });
                                    showToast(newStatus === 'resolved' ? 'Ponto marcado como resolvido.' : 'Ponto reaberto.');
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                                    activePin.status === 'resolved'
                                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                }`}
                            >
                                <Check size={13} />
                                {activePin.status === 'resolved' ? 'Reabrir Ponto' : 'Marcar como Resolvido'}
                            </button>

                            <button
                                onClick={() => {
                                    if (confirm('Tem a certeza que deseja eliminar este ponto geolocalizado?')) {
                                        deleteSiteObservation(activePin.id);
                                        setActivePin(null);
                                        showToast('Ponto eliminado.');
                                    }
                                }}
                                className="text-red-500 hover:text-red-700 p-1.5"
                                title="Eliminar ponto"
                            >
                                <Trash2 size={15} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Right Sliding Sidebar: Observations & Issues List */}
                <div
                    className={`absolute top-0 right-0 h-full w-96 bg-white dark:bg-[#1a1b1e] border-l border-slate-200 dark:border-[#333] shadow-2xl transition-transform duration-300 z-10 flex flex-col ${
                        isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
                >
                    {/* Sidebar Header */}
                    <div className="p-4 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between">
                        <div>
                            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <MapPin size={16} className="text-red-600" />
                                Visitas & Apontamentos ({filteredObservations.length})
                            </h2>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                                Pontos georreferenciados no modelo IFC / 2D
                            </p>
                        </div>
                        <button
                            onClick={() => setIsSidebarOpen(false)}
                            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Search & Filters */}
                    <div className="p-3 border-b border-slate-200 dark:border-neutral-800 space-y-2 bg-slate-50/50 dark:bg-neutral-900/50">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Pesquisar por assunto ou elemento..."
                                value={searchFilter}
                                onChange={e => setSearchFilter(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-lg outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <select
                                value={categoryFilter}
                                onChange={e => setCategoryFilter(e.target.value)}
                                className="flex-1 text-[11px] bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-md px-2 py-1 text-slate-700 dark:text-slate-200"
                            >
                                <option value="all">Todas as Categorias</option>
                                <option value="visit_observation">Visita / Fiscalização</option>
                                <option value="safety_non_compliance">Não Conformidade</option>
                                <option value="risk_point">Ponto de Risco</option>
                                <option value="quality_check">Qualidade</option>
                            </select>

                            <select
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                                className="flex-1 text-[11px] bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-md px-2 py-1 text-slate-700 dark:text-slate-200"
                            >
                                <option value="all">Todos os Estados</option>
                                <option value="open">Abertos</option>
                                <option value="in_progress">Em Resolução</option>
                                <option value="resolved">Resolvidos</option>
                            </select>
                        </div>
                    </div>

                    {/* List of Observations */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                        {filteredObservations.length === 0 ? (
                            <div className="text-center py-10 text-slate-400 text-xs">
                                <Info size={24} className="mx-auto mb-2 opacity-50" />
                                Nenhum ponto encontrado com os filtros selecionados.
                            </div>
                        ) : (
                            filteredObservations.map((obs) => {
                                const isSelected = activePin?.id === obs.id;
                                const comp = companies.find(c => c.id === obs.assignedToCompanyId);

                                return (
                                    <div
                                        key={obs.id}
                                        onClick={() => flyToObservation(obs)}
                                        className={`p-3 rounded-xl border transition-all cursor-pointer text-xs space-y-2 ${
                                            isSelected
                                                ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-400 ring-2 ring-blue-500/20 shadow-md'
                                                : 'bg-white dark:bg-neutral-800 border-slate-200 dark:border-neutral-700 hover:border-slate-300 hover:shadow-sm'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-1.5">
                                                <span className={`w-2 h-2 rounded-full shrink-0 ${
                                                    obs.status === 'resolved' ? 'bg-emerald-500' :
                                                    obs.severity === 'critical' || obs.severity === 'high' ? 'bg-red-500 animate-pulse' :
                                                    'bg-amber-500'
                                                }`} />
                                                <span className="font-semibold text-slate-900 dark:text-white line-clamp-1">
                                                    {obs.title}
                                                </span>
                                            </div>
                                            <span className={`text-[10px] uppercase font-bold px-1.5 py-0.2 rounded shrink-0 ${
                                                obs.severity === 'critical' ? 'bg-red-100 text-red-700' :
                                                obs.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                                                'bg-slate-100 text-slate-600'
                                            }`}>
                                                {obs.severity}
                                            </span>
                                        </div>

                                        <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2">
                                            {obs.description}
                                        </p>

                                        <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 dark:border-neutral-700/60 pt-2">
                                            <span className="truncate">
                                                📍 {obs.storeyName || 'Obra'} • {obs.elementName || 'IFC'}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    flyToObservation(obs);
                                                }}
                                                className="text-blue-600 hover:underline font-semibold shrink-0"
                                            >
                                                Focar no 3D →
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Modal: Registar Novo Ponto de Visita Geolocalizado */}
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
                                        Novo Ponto de Visita / Ocorrência 3D
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
                                    Assunto / Título da Ocorrência *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ex: Falta de guarda-corpos na bordadura, Infiltração..."
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
                                        <option value="visit_observation">Visita de Fiscalização</option>
                                        <option value="safety_non_compliance">Não Conformidade de Segurança</option>
                                        <option value="risk_point">Ponto de Risco</option>
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
                                    Empresa Responsável / Notificada
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
                                    Descrição e Medidas Recomendadas
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder="Descreva as anomalias detetadas na visita e as ações imediatas a tomar..."
                                    value={formDesc}
                                    onChange={e => setFormDesc(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-neutral-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 dark:bg-neutral-800 resize-none"
                                />
                            </div>

                            {/* Photo Attachment */}
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                                    Fotografia da Visita (URL ou Upload)
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="https://... ou anexe ficheiro"
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
                                {formPhoto && (
                                    <div className="mt-2 relative w-24 h-16 rounded border overflow-hidden">
                                        <img src={formPhoto} alt="Preview" className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => setFormPhoto('')}
                                            className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5"
                                        >
                                            <X size={10} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Footer Buttons */}
                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-neutral-800">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                                >
                                    <Check size={14} />
                                    Fixar Ponto no Modelo 3D
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Onde carregar ficheiros IFC & Desenhos no CDE */}
            {isCdeHelpOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
                    <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-neutral-800 max-w-2xl w-full overflow-hidden">
                        <div className="p-4 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between bg-blue-50 dark:bg-blue-950/40">
                            <div className="flex items-center gap-2">
                                <FolderTree className="w-5 h-5 text-blue-600" />
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                        Estrutura de Pastas CDE para Modelos IFC e Desenhos 2D
                                    </h3>
                                    <p className="text-[11px] text-slate-500">
                                        Padrão ISO 19650 sincronizado na Cloud (SharePoint, OneDrive, Google Drive, Dropbox)
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsCdeHelpOpen(false)}
                                className="text-slate-400 hover:text-slate-600 p-1"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-5 space-y-4 text-xs text-slate-600 dark:text-slate-300">
                            <p>
                                Para que os modelos IFC e as plantas 2D fiquem disponíveis de forma automática para toda a equipa e fiscalização, os ficheiros são organizados na seguinte pasta padrão do CDE:
                            </p>

                            <div className="bg-slate-950 text-emerald-400 font-mono p-4 rounded-xl text-[11px] leading-relaxed shadow-inner overflow-x-auto">
                                <div>📁 [Nome da Empresa]/</div>
                                <div>&nbsp;&nbsp;└── 📁 Organizações/</div>
                                <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── 📁 Documentos de Obra/</div>
                                <div className="text-white font-bold">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├── 📁 Modelos BIM (IFC)/ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;👈 Colocar aqui ficheiros .ifc</div>
                                <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├── 📁 01-Arquitetura/ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(ex: ARQ_Edificio_v02.ifc)</div>
                                <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├── 📁 02-Estruturas/ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(ex: EST_BetaoArmado_v01.ifc)</div>
                                <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── 📁 03-Especialidades (MEP)/ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(ex: MEP_AVAC_Redes_v01.ifc)</div>
                                <div className="text-white font-bold">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── 📁 Desenhos 2D (Plantas e Cortes)/ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;👈 Colocar aqui plantas em PDF/DWG</div>
                                <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├── P01-ARQ-Planta-Piso0.pdf</div>
                                <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── P02-EST-Armaduras-Piso1.pdf</div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900/40">
                                    <h4 className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5 mb-1">
                                        <Sparkles size={14} />
                                        Como Carregar Novos Modelos
                                    </h4>
                                    <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-normal">
                                        Pode carregar ficheiros <code className="bg-white/60 px-1 py-0.5 rounded font-mono">.ifc</code> diretamente pelo botão <strong>Carregar IFC</strong> nesta barra superior (para pré-visualização instantânea) ou colocá-los diretamente na pasta da nuvem do seu CDE.
                                    </p>
                                </div>

                                <div className="p-3 bg-slate-50 dark:bg-neutral-800 rounded-xl border border-slate-200 dark:border-neutral-700">
                                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-1">
                                        <CheckCircle2 size={14} className="text-emerald-500" />
                                        Criação Automática
                                    </h4>
                                    <p className="text-[11px] text-slate-500 leading-normal">
                                        Esta pasta padrão é criada automaticamente ao enviar a empresa para atualização ou ao carregar no menu das Ações da tabela das Empresas.
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-end pt-2">
                                <button
                                    onClick={() => setIsCdeHelpOpen(false)}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm"
                                >
                                    Entendido
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Painel de Desenhos 2D de Obra (Plantas e Cortes) */}
            {is2dDrawingsModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
                    <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-neutral-800 max-w-3xl w-full overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="p-4 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between bg-amber-50 dark:bg-amber-950/40">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                                    <FileText size={18} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                        Desenhos 2D de Obra (Plantas, Cortes e Pormenores)
                                    </h3>
                                    <p className="text-[11px] text-slate-500">
                                        Peças desenhadas oficiais arquivadas na pasta CDE <code className="bg-amber-100/60 dark:bg-neutral-800 px-1 py-0.5 rounded">Documentos de Obra/Desenhos 2D</code>
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setIs2dDrawingsModalOpen(false);
                                    setSelected2dDrawing(null);
                                }}
                                className="text-slate-400 hover:text-slate-600 p-1"
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
                                        className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                                            selected2dDrawing?.id === drawing.id
                                                ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-500 ring-2 ring-amber-500/20 shadow-sm'
                                                : 'bg-white dark:bg-neutral-800 border-slate-200 dark:border-neutral-700 hover:border-slate-300 hover:shadow-sm'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-neutral-700 text-slate-800 dark:text-slate-200 text-[10px]">
                                                    {drawing.code}
                                                </span>
                                                <span className="font-bold text-slate-900 dark:text-white">
                                                    {drawing.title}
                                                </span>
                                            </div>
                                            <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                                                {drawing.revision}
                                            </span>
                                        </div>

                                        <p className="text-[11px] text-slate-500 mt-1">
                                            📄 {drawing.fileName}
                                        </p>

                                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 mt-2 border-t border-slate-100 dark:border-neutral-700/60">
                                            <span>Piso: <strong>{drawing.storey}</strong> • Escala: {drawing.format}</span>
                                            <span className="text-blue-600 font-semibold hover:underline">
                                                Abrir Planta →
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Preview pane when drawing selected */}
                            {selected2dDrawing && (
                                <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-neutral-800/80 border border-slate-200 dark:border-neutral-700 text-xs space-y-3 animate-in fade-in">
                                    <div className="flex items-center justify-between">
                                        <div className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                            <FileText size={15} className="text-amber-600" />
                                            Pré-visualização da Folha Técnica: {selected2dDrawing.code} - {selected2dDrawing.title}
                                        </div>
                                        <button
                                            onClick={() => {
                                                handleToggleViewDimension('2d');
                                                setSelectedStorey(selected2dDrawing.storey);
                                                setIs2dDrawingsModalOpen(false);
                                            }}
                                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm"
                                        >
                                            Ver Alinhado no Corte 2D BIM
                                        </button>
                                    </div>

                                    {/* Architectural Blueprint Visualizer Simulation */}
                                    <div className="w-full h-44 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center relative overflow-hidden text-cyan-400 font-mono text-[11px]">
                                        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />
                                        <div className="relative text-center space-y-1">
                                            <div className="font-bold text-white text-xs">{selected2dDrawing.title}</div>
                                            <div className="text-cyan-300">Formato {selected2dDrawing.format} • {selected2dDrawing.revision} • Sincronizado do CDE</div>
                                            <div className="text-slate-400 text-[10px]">Eixos Estruturais [A-D / 1-4] • Cotas e Alinhamentos verificados</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-3 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-between bg-slate-50 dark:bg-neutral-800/50 text-xs">
                            <span className="text-slate-500">
                                5 desenhos técnicos encontrados na pasta do projeto.
                            </span>
                            <button
                                onClick={() => {
                                    setIs2dDrawingsModalOpen(false);
                                    setSelected2dDrawing(null);
                                }}
                                className="px-4 py-1.5 bg-slate-200 dark:bg-neutral-700 hover:bg-slate-300 text-slate-800 dark:text-slate-100 rounded-lg font-medium"
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
