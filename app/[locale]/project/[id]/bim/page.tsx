'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useStore } from '@/store/useStore';
import Bim2dSafetyEditor from '@/components/Bim2dSafetyEditor';
import Bim4dSimulationPlayer from '@/components/Bim4dSimulationPlayer';
import { SiteWorkZone, WorkPlanTask } from '@/types';
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
    Users,
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
    FileUp,
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
    Edit3,
    Move,
    RefreshCw,
    ZoomIn,
    ZoomOut,
    HeartPulse,
    Bath,
    Utensils,
    BellRing,
    Recycle,
    Fuel,
    Droplets,
    Grid,
    Footprints,
    Star,
    Zap,
    ArrowUp,
    ArrowDown,
    ArrowLeft,
    ArrowRight,
    ArrowUpFromLine,
    Copy,
    Scissors
} from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { SiteObservation, SiteLogisticsItem } from '@/types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { uploadToCDEFolder } from '@/lib/cde-manager';
import {
    SITE_LOGISTICS_CATALOG,
    SAMPLE_BIM_MODELS,
    SAMPLE_2D_DRAWINGS,
    LogisticsCatalogItem,
    generateRealisticPdfDrawing
} from '@/lib/bim-samples';
import { shouldUseFragmentsEngine, calculateEngineOptimization } from '@/lib/that-open-fragments';

export type ProjectionMode = 'perspective' | 'isometric';
export type ViewOrientation = 'isometric' | 'top' | 'front' | 'back' | 'right' | 'left';
export type CameraViewPreset = ViewOrientation;

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
export interface CdeDrawing2D {
    id: string;
    cdeId?: string;
    code: string;
    title: string;
    discipline: 'architecture' | 'structure' | 'mep' | 'safety';
    storey: string;
    format: string;
    revision: string;
    fileName: string;
    date: string;
    webViewLink?: string;
    isRealCdeFile?: boolean;
    isBaseModel?: boolean;
    localBlobUrl?: string;
    previewDataUrl?: string;
    vectorSegments?: [number, number, number, number][];
    scale?: string;
    cotaCorte?: number;
    referenceElevation?: number;
    style?: 'cad' | 'shaded';
    viewOrientation?: ViewOrientation;
    underlay?: {
        enabled: boolean;
        url?: string;
        fileName?: string;
        offsetX: number;
        offsetZ: number;
        scale: number;
        rotation: number;
        opacity: number;
    };
    modelBounds?: {
        minX: number;
        maxX: number;
        minZ: number;
        maxZ: number;
        width: number;
        depth: number;
        height: number;
        cutY: number;
        meshCount: number;
    };
}

export interface Generate2dDrawingOptions {
    title: string;
    code: string;
    format: 'a4' | 'a3' | 'a2' | 'a1' | 'a0';
    orientation: 'landscape' | 'portrait';
    viewOrientation: ViewOrientation;
    scale: '1:50' | '1:100' | '1:200' | '1:500';
    style: 'cad' | 'shaded';
    storey: string;
    referenceElevation: number;
    cotaCorteOffset: number;
    underlayUrl?: string | null;
    underlayFileName?: string | null;
}

export interface CdeModelItem {
    id: string;
    cdeId?: string;
    folder: string;
    name: string;
    size: string;
    rev: string;
    active: boolean;
    discipline: 'architecture' | 'structure' | 'mep' | 'safety';
    webViewLink?: string;
    isRealCdeFile?: boolean;
    isBaseModel?: boolean;
}

const DEFAULT_CDE_MODELS: CdeModelItem[] = [];

const DEFAULT_2D_DRAWINGS: CdeDrawing2D[] = [];

const isSampleModelId = (m: any) =>
    !m ||
    !m.isRealCdeFile ||
    ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'].includes(m.id) ||
    String(m.id || '').startsWith('cde-m-') ||
    ['ARQ_Skyline_Edificio.ifc', 'ARQ_Arranjos_Exteriores.ifc', 'EST_Estrutura_Betao.ifc', 'EST_Fundacoes_Contencoes.ifc', 'MEP_Redes_AVAC.ifc', 'MEP_Rede_Incendio.ifc'].includes(m.name);

const isSampleDrawingId = (d: any) =>
    !d ||
    !d.isRealCdeFile ||
    ['drw-1', 'drw-2', 'drw-3', 'drw-4'].includes(d.id) ||
    String(d.id || '').startsWith('cde-d-') ||
    String(d.revision || '').includes('Exemplo');

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
        siteWorkZones,
        addSiteWorkZone,
        deleteSiteWorkZone,
        workPlanTasks,
        addWorkPlanTask,
        updateWorkPlanTask,
        deleteWorkPlanTask,
    } = useStore();

    const currentProject = projects.find(p => p.id === projectId) || { name: 'Obra Skyline Tower' };

    // Canvas & Three.js references
    const mountRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | THREE.OrthographicCamera | null>(null);
    const perspCameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const orthoCameraRef = useRef<THREE.OrthographicCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const bimGroupRef = useRef<THREE.Group | null>(null);
    const pinsGroupRef = useRef<THREE.Group | null>(null);
    const logisticsGroupRef = useRef<THREE.Group | null>(null);
    const grid2dGroupRef = useRef<THREE.Group | null>(null);
    const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
    const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());

    // Navigation and Visualization States
    const [viewDimension, setViewDimension] = useState<'3d' | '2d'>('3d');
    const [projectionMode, setProjectionMode] = useState<ProjectionMode>('perspective');
    const [viewOrientation, setViewOrientation] = useState<ViewOrientation>('isometric');
    const modelCenterRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 4.5, 0));
    const modelSizeRef = useRef<THREE.Vector3>(new THREE.Vector3(24, 12, 20));
    const selectedMeshRef = useRef<THREE.Mesh | null>(null);
    const [activeMode, setActiveMode] = useState<'navigate' | 'pan' | 'add_point' | 'add_logistics' | 'add_emergency' | 'moving_logistics'>('navigate');
    const [isXRayMode, setIsXRayMode] = useState<boolean>(false);
    const [sectionCutActive, setSectionCutActive] = useState<boolean>(false);
    const [sectionCutHeight, setSectionCutHeight] = useState<number>(10);
    const [modelHeightRange, setModelHeightRange] = useState<{ min: number; max: number }>({ min: -2, max: 25 });
    const [copiedGuid, setCopiedGuid] = useState<boolean>(false);

    // New 2D Technical Drawing Configuration Modal States
    const [isNew2dModalOpen, setIsNew2dModalOpen] = useState<boolean>(false);
    const [newDrawingTitle, setNewDrawingTitle] = useState<string>('Planta de Estaleiro e Segurana - Piso 0');
    const [newDrawingCode, setNewDrawingCode] = useState<string>('PE-01');
    const [newDrawingFormat, setNewDrawingFormat] = useState<'a4' | 'a3' | 'a2' | 'a1' | 'a0'>('a3');
    const [newDrawingOrientation, setNewDrawingOrientation] = useState<'landscape' | 'portrait'>('landscape');
    const [newDrawingViewOrientation, setNewDrawingViewOrientation] = useState<ViewOrientation>('top');
    const [newDrawingScale, setNewDrawingScale] = useState<'1:50' | '1:100' | '1:200' | '1:500'>('1:100');
    const [newDrawingStyle, setNewDrawingStyle] = useState<'cad' | 'shaded'>('cad');
    const [newDrawingStorey, setNewDrawingStorey] = useState<string>('Piso 0');
    const [newDrawingRefElevation, setNewDrawingRefElevation] = useState<number>(0.0);
    const [newDrawingCotaCorteOffset, setNewDrawingCotaCorteOffset] = useState<number>(1.20);
    const [newDrawingUnderlayUrl, setNewDrawingUnderlayUrl] = useState<string | null>(null);
    const [newDrawingUnderlayFileName, setNewDrawingUnderlayFileName] = useState<string | null>(null);
    const [selectedDiscipline, setSelectedDiscipline] = useState<'all' | 'structure' | 'architecture' | 'mep' | 'safety'>('all');
    const [selectedStorey, setSelectedStorey] = useState<string>('all');
    const [ghostMode, setGhostMode] = useState<boolean>(true);
    // 4D Construction Simulation & Time-Lapse Player
    const [simDate, setSimDate] = useState<string>(new Date().toISOString().slice(0, 10));
    const [is4dActive, setIs4dActive] = useState<boolean>(false);
    const [show4dFutureGhost, setShow4dFutureGhost] = useState<boolean>(true);

    // Layer Visibility & Preset Dropdown
    const [showObservationsLayer, setShowObservationsLayer] = useState(true);
    const [showLogisticsLayer, setShowLogisticsLayer] = useState(true);
    const [showEmergencyLayer, setShowEmergencyLayer] = useState(true);
    const [activeLayerPreset, setActiveLayerPreset] = useState<'all' | 'inspections' | 'logistics' | 'emergency' | 'clean'>('all');

    // Helper to get initial CDE state from localStorage or Zustand storage synchronously
    const initialCdeData = useMemo(() => {
        if (typeof window === 'undefined') {
            return {
                status: { connected: false },
                models: [],
                drawings: [],
                baseModelId: null,
                autoLoad: true
            };
        }
        try {
            const storedState = localStorage.getItem('safesite-storage');
            let isConnected = false;
            let provider: string | null = null;
            if (storedState) {
                const parsed = JSON.parse(storedState);
                const projs = parsed?.state?.projects || [];
                const proj = projs.find((p: any) => p.id === projectId);
                if (proj?.cdeConfig?.connected || proj?.cdeConfig?.provider) {
                    isConnected = Boolean(proj.cdeConfig.connected);
                    provider = proj.cdeConfig.provider;
                }
            }

            const cachedModelsRaw = localStorage.getItem(`safesite_cde_models_${projectId}`);
            const cachedDrawingsRaw = localStorage.getItem(`safesite_cde_drawings_${projectId}`);
            const savedBaseId = localStorage.getItem(`safesite_base_model_${projectId}`);
            const autoLoadSetting = localStorage.getItem(`safesite_autoload_ifc_${projectId}`);

            const rawModels = cachedModelsRaw ? JSON.parse(cachedModelsRaw) : [];
            const rawDrawings = cachedDrawingsRaw ? JSON.parse(cachedDrawingsRaw) : [];

            const cleanModels = Array.isArray(rawModels) ? rawModels.filter((m: any) => !isSampleModelId(m)) : [];
            const cleanDrawings = Array.isArray(rawDrawings) ? rawDrawings.filter((d: any) => !isSampleDrawingId(d)) : [];

            if (Array.isArray(rawModels) && cleanModels.length !== rawModels.length) {
                localStorage.setItem(`safesite_cde_models_${projectId}`, JSON.stringify(cleanModels));
            }
            if (Array.isArray(rawDrawings) && cleanDrawings.length !== rawDrawings.length) {
                localStorage.setItem(`safesite_cde_drawings_${projectId}`, JSON.stringify(cleanDrawings));
            }

            return {
                status: { connected: isConnected, provider },
                models: cleanModels,
                drawings: cleanDrawings,
                baseModelId: savedBaseId || null,
                autoLoad: autoLoadSetting !== 'false'
            };
        } catch (_) {
            return {
                status: { connected: false },
                models: [],
                drawings: [],
                baseModelId: null,
                autoLoad: true
            };
        }
    }, [projectId]);

    // Real CDE Cloud Connection State (initialized from cache)
    const [cdeStatus, setCdeStatus] = useState<{ connected: boolean; provider?: string | null; hasFiles?: boolean }>(initialCdeData.status);
    const [isSyncingCde, setIsSyncingCde] = useState(false);
    const [cdeDrawings, setCdeDrawings] = useState<CdeDrawing2D[]>(initialCdeData.drawings);
    const [selected2dDrawing, setSelected2dDrawing] = useState<CdeDrawing2D | null>(initialCdeData.drawings[0] || null);

    // Active 2D drawing: strictly real CDE or IFC-generated drawings
    const active2dDrawing = useMemo(() => {
        if (selected2dDrawing) return selected2dDrawing;
        const real = cdeDrawings.find(d => d.isRealCdeFile);
        if (real) return real;
        return null;
    }, [selected2dDrawing, cdeDrawings]);

    const [drawingViewMode, setDrawingViewMode] = useState<'interactive' | 'pdf'>('interactive');
    const [currentPdfUrl, setCurrentPdfUrl] = useState<string | null>(null);
    const [sheetZoom, setSheetZoom] = useState<number>(1);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [isGenerating2dPlan, setIsGenerating2dPlan] = useState(false);

    // Logistics Search & Filter
    const [logisticsCategoryFilter, setLogisticsCategoryFilter] = useState<string>('all');
    const [logisticsSearchQuery, setLogisticsSearchQuery] = useState<string>('');

    // Left Panel Tabs: 'models' | 'logistics' | 'hierarchy' | 'properties'
    const [leftPanelTab, setLeftPanelTab] = useState<'models' | 'logistics' | 'hierarchy' | 'properties'>('models');
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

    // CDE Loaded Models & Explorer Folders
    const [cdeModels, setCdeModels] = useState<CdeModelItem[]>(initialCdeData.models);
    const [baseModelId, setBaseModelId] = useState<string | null>(initialCdeData.baseModelId);
    const [autoLoadBaseModel, setAutoLoadBaseModel] = useState<boolean>(initialCdeData.autoLoad);
    const hasAutoLoadedModelRef = useRef<boolean>(false);

    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
        'bim_root': true,
        'drawings_root': true
    });

    const handleToggleModelActive = (modelId: string) => {
        setCdeModels(prev => prev.map(m => {
            if (m.id === modelId) {
                const nextActive = !m.active;
                showToast(nextActive ? `Modelo "${m.name}" ativado.` : `Modelo "${m.name}" desativado.`);
                return { ...m, active: nextActive };
            }
            return m;
        }));
    };

    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isCdeHelpOpen, setIsCdeHelpOpen] = useState(false);
    const [is2dDrawingsModalOpen, setIs2dDrawingsModalOpen] = useState(false);

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

    // Synchronize Real-time PDF Blob for the selected 2D Drawing (from IFC generator or Real CDE)
    useEffect(() => {
        const drawingToDisplay = selected2dDrawing || active2dDrawing;
        if (!drawingToDisplay) {
            setCurrentPdfUrl(null);
            return;
        }

        // If this drawing was generated locally from the 3D IFC model, use its blob URL directly!
        if (drawingToDisplay.localBlobUrl) {
            setCurrentPdfUrl(drawingToDisplay.localBlobUrl);
            return;
        }

        let isMounted = true;
        let createdBlobUrl: string | null = null;

        const loadPdfContent = async () => {
            try {
                // Download real PDF bytes from CDE
                if (drawingToDisplay.isRealCdeFile && !String(drawingToDisplay.cdeId || '').startsWith('cde-gen-')) {
                    const fileId = drawingToDisplay.cdeId || drawingToDisplay.id;
                    const res = await fetch(`/api/projects/${projectId}/cde/download?fileId=${encodeURIComponent(fileId)}&fileName=${encodeURIComponent(drawingToDisplay.fileName)}`);
                    if (res.ok) {
                        const blob = await res.blob();
                        if (isMounted) {
                            createdBlobUrl = URL.createObjectURL(blob);
                            setCurrentPdfUrl(createdBlobUrl);
                        }
                        return;
                    }
                }
            } catch (e) {
                console.warn('Erro ao obter conteúdo do PDF do CDE:', e);
            }
        };

        loadPdfContent();

        return () => {
            isMounted = false;
            if (createdBlobUrl) {
                URL.revokeObjectURL(createdBlobUrl);
            }
        };
    }, [selected2dDrawing, active2dDrawing, projectId]);

    // Handlers for base model designation & auto-load toggle
    const handleSetBaseModel = (model: CdeModelItem) => {
        setBaseModelId(model.id);
        if (typeof window !== 'undefined') {
            localStorage.setItem(`safesite_base_model_${projectId}`, model.id);
        }
        showToast(`⭐ "${model.name}" definido como modelo IFC base da obra! Carregará automaticamente ao entrar.`);
    };

    const handleToggleAutoLoad = () => {
        const nextVal = !autoLoadBaseModel;
        setAutoLoadBaseModel(nextVal);
        if (typeof window !== 'undefined') {
            localStorage.setItem(`safesite_autoload_ifc_${projectId}`, String(nextVal));
        }
        showToast(nextVal ? '⚡ Carregamento automático do modelo base ATIVADO.' : 'Carregamento automático DESATIVADO.');
    };

    // Load Real CDE Cloud Files
    const loadRealCdeFiles = useCallback(async () => {
        setIsSyncingCde(true);
        try {
            // First check status directly from server endpoint
            const statusRes = await fetch(`/api/projects/${projectId}/cde`).catch(() => null);
            let activeCfg: any = null;
            if (statusRes?.ok) {
                const sData = await statusRes.json().catch(() => ({}));
                const sCfg = sData?.cdeConfig || sData?.config;
                if (sCfg?.connected || sCfg?.provider) {
                    activeCfg = sCfg;
                }
            }

            // Fallback: check project in client store or localStorage
            if (!activeCfg || !activeCfg.connected) {
                const storedProjCfg = (currentProject as any)?.cdeConfig;
                if (storedProjCfg?.connected || storedProjCfg?.provider) {
                    activeCfg = storedProjCfg;
                } else if (typeof window !== 'undefined') {
                    try {
                        const storedState = localStorage.getItem('safesite-storage');
                        if (storedState) {
                            const parsed = JSON.parse(storedState);
                            const projs = parsed?.state?.projects || [];
                            const proj = projs.find((p: any) => p.id === projectId);
                            if (proj?.cdeConfig?.connected || proj?.cdeConfig?.provider) {
                                activeCfg = proj.cdeConfig;
                            }
                        }
                    } catch (_) {}
                }
            }

            if (activeCfg?.connected || activeCfg?.provider) {
                setCdeStatus({
                    connected: true,
                    provider: activeCfg.provider,
                    hasFiles: true
                });
            }

            const res = await fetch(`/api/projects/${projectId}/cde/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'list_bim_files',
                    payload: { cdeConfig: activeCfg }
                })
            });

            if (res.ok) {
                const data = await res.json();
                const result = data.result || data;
                if (result.connected || activeCfg?.connected) {
                    setCdeStatus({
                        connected: true,
                        provider: result.provider || activeCfg?.provider,
                        hasFiles: result.hasFiles ?? true
                    });
                    if (result.models) {
                        const realModels = result.models.filter((m: any) => !isSampleModelId(m));
                        setCdeModels(realModels);
                        try {
                            localStorage.setItem(`safesite_cde_models_${projectId}`, JSON.stringify(realModels));
                        } catch (_) {}

                        // Automatic Loading of Base IFC Model on entry / refresh
                        if (autoLoadBaseModel && !hasAutoLoadedModelRef.current && realModels.length > 0) {
                            const preferredId = baseModelId || (typeof window !== 'undefined' ? localStorage.getItem(`safesite_base_model_${projectId}`) : null);
                            const targetModel = realModels.find((m: any) => m.id === preferredId) ||
                                                realModels.find((m: any) => m.isRealCdeFile) ||
                                                realModels[0];

                            if (targetModel && targetModel.isRealCdeFile) {
                                hasAutoLoadedModelRef.current = true;
                                showToast(`⚡ A carregar automaticamente o modelo base "${targetModel.name}" do CDE...`);
                                handleLoadModelFromCde(targetModel);
                            }
                        }
                    }
                    if (result.drawings) {
                        const realDrawings = result.drawings.filter((d: any) => !isSampleDrawingId(d));
                        setCdeDrawings(prev => {
                            const localGenerated = prev.filter(d => Boolean(d.localBlobUrl));
                            const merged = [
                                ...localGenerated,
                                ...realDrawings.filter((rd: any) => !localGenerated.some(lg => lg.fileName === rd.fileName))
                            ];
                            try {
                                const lightMerged = merged.map(({ previewDataUrl: _p, vectorSegments: _v, localBlobUrl: _b, ...rest }) => rest);
                                localStorage.setItem(`safesite_cde_drawings_${projectId}`, JSON.stringify(lightMerged));
                            } catch (_) {}
                            return merged;
                        });

                        setSelected2dDrawing(prev => {
                            if (prev && (prev.localBlobUrl || !isSampleDrawingId(prev))) return prev;
                            return realDrawings[0] || null;
                        });
                    }
                }
            }
        } catch (e) {
            console.warn('Erro ao carregar ficheiros CDE:', e);
        } finally {
            setIsSyncingCde(false);
        }
    }, [projectId, autoLoadBaseModel, baseModelId]);

    useEffect(() => {
        loadRealCdeFiles();
    }, [loadRealCdeFiles]);

    // Immediate Auto-Load on Mount if Real Model is already in Cache
    useEffect(() => {
        if (autoLoadBaseModel && !hasAutoLoadedModelRef.current && initialCdeData.models && initialCdeData.models.length > 0) {
            const preferredId = initialCdeData.baseModelId || (typeof window !== 'undefined' ? localStorage.getItem(`safesite_base_model_${projectId}`) : null);
            const targetModel = initialCdeData.models.find((m: any) => m.id === preferredId) ||
                                initialCdeData.models.find((m: any) => m.isRealCdeFile);

            if (targetModel && targetModel.isRealCdeFile) {
                hasAutoLoadedModelRef.current = true;
                setTimeout(() => {
                    handleLoadModelFromCde(targetModel);
                }, 500);
            }
        }
    }, []);

    // Seed Sample Realistic BIM Models & 2D Drawings into the real Connected CDE
    const handleSeedCdeSampleFiles = async () => {
        setIsCreatingCdeFolders(true);
        showToast('A enviar modelos IFC e pranchas 2D fidedignas para o seu CDE conectado...');
        try {
            const activeCfg = (currentProject as any)?.cdeConfig;
            const res = await fetch(`/api/projects/${projectId}/cde/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'seed_bim_sample_files',
                    payload: { cdeConfig: activeCfg }
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao carregar no CDE');
            const result = data.result || data;
            showToast(result.message || 'Modelos BIM e Desenhos 2D carregados com sucesso no seu CDE!');
            await loadRealCdeFiles();
        } catch (err: any) {
            showToast(`Aviso: ${err.message || 'Verifique a ligação ao CDE'}`);
        } finally {
            setIsCreatingCdeFolders(false);
        }
    };

    // Layer Preset Handler
    const handleLayerPresetChange = (preset: 'all' | 'inspections' | 'logistics' | 'emergency' | 'clean') => {
        setActiveLayerPreset(preset);
        if (preset === 'all') {
            setShowObservationsLayer(true);
            setShowLogisticsLayer(true);
            setShowEmergencyLayer(true);
            showToast('Todas as camadas visíveis.');
        } else if (preset === 'inspections') {
            setShowObservationsLayer(true);
            setShowLogisticsLayer(false);
            setShowEmergencyLayer(false);
            showToast('Apenas anotações de inspeção visíveis.');
        } else if (preset === 'logistics') {
            setShowObservationsLayer(false);
            setShowLogisticsLayer(true);
            setShowEmergencyLayer(false);
            showToast('Apenas elementos de estaleiro visíveis.');
        } else if (preset === 'emergency') {
            setShowObservationsLayer(false);
            setShowLogisticsLayer(false);
            setShowEmergencyLayer(true);
            showToast('Apenas rotas e meios de emergência visíveis.');
        } else if (preset === 'clean') {
            setShowObservationsLayer(false);
            setShowLogisticsLayer(false);
            setShowEmergencyLayer(false);
            showToast('Anotações ocultadas (Modelo limpo).');
        }
    };

    // Interactive Move & Nudge for Placed Logistics Elements
    const handleNudgeLogisticsItem = (dx: number, dz: number) => {
        if (!activeLogisticsItem) return;
        const newPos: [number, number, number] = [
            Number((activeLogisticsItem.position[0] + dx).toFixed(2)),
            activeLogisticsItem.position[1],
            Number((activeLogisticsItem.position[2] + dz).toFixed(2))
        ];
        updateSiteLogisticsItem(activeLogisticsItem.id, { position: newPos });
        setActiveLogisticsItem(prev => prev ? { ...prev, position: newPos } : null);
        showToast(`Elemento deslocado para [${newPos[0]}, ${newPos[2]}].`);
    };

    const handleRotateLogisticsItem = () => {
        if (!activeLogisticsItem) return;
        const newRot = ((activeLogisticsItem.rotation || 0) + Math.PI / 4) % (Math.PI * 2);
        updateSiteLogisticsItem(activeLogisticsItem.id, { rotation: newRot });
        setActiveLogisticsItem(prev => prev ? { ...prev, rotation: newRot } : null);
        showToast(`Elemento rodado para ${Math.round((newRot * 180) / Math.PI)}°.`);
    };

    // Open Authentic PDF Drawing
    const handleOpenAuthenticPdf = async (drawing?: CdeDrawing2D | null) => {
        const target = drawing || selected2dDrawing;
        if (!target) return;
        setIsGeneratingPdf(true);
        showToast(`A preparar documento PDF oficial "${target.fileName}"...`);
        try {
            if (target.localBlobUrl) {
                const a = document.createElement('a');
                a.href = target.localBlobUrl;
                a.download = target.fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                showToast(`Download de "${target.fileName}" iniciado.`);
                return;
            }

            if (target.isRealCdeFile) {
                const targetId = target.cdeId || target.id;
                const url = `/api/projects/${projectId}/cde/download?download=1&fileId=${encodeURIComponent(targetId)}&fileName=${encodeURIComponent(target.fileName)}`;
                const a = document.createElement('a');
                a.href = url;
                a.download = target.fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                showToast(`Download de "${target.fileName}" iniciado.`);
                return;
            }
        } catch (err: any) {
            showToast(`Erro ao preparar PDF: ${err.message}`);
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    // Automatic 2D Technical Drawing & Plan Generator directly from the loaded 3D IFC Model
    const handleGenerate2dDrawingFromModel = async (customOptions?: Partial<Generate2dDrawingOptions>) => {
        setIsGenerating2dPlan(true);
        showToast('A processar geometria do modelo 3D IFC para gerar a prancha 2D calibrada...');

        try {
            // Ensure a 3D IFC model is loaded in bimGroupRef
            if (bimGroupRef.current && bimGroupRef.current.children.length === 0 && cdeModels.length > 0) {
                const firstRealModel = cdeModels.find(m => m.isRealCdeFile) || cdeModels[0];
                if (firstRealModel) {
                    await handleLoadModelFromCde(firstRealModel);
                }
            }

            const bimGroup = bimGroupRef.current;
            if (!bimGroup || bimGroup.children.length === 0) {
                showToast('Carregue primeiro o seu ficheiro .ifc no visualizador 3D para gerar o desenho 2D.');
                setIsGenerating2dPlan(false);
                return;
            }

            bimGroup.updateMatrixWorld(true);

            // Compute exact 3D bounding box of the loaded IFC model
            const fullBox = new THREE.Box3().setFromObject(bimGroup);
            const min = fullBox.min;
            const max = fullBox.max;
            const size = fullBox.getSize(new THREE.Vector3());
            const center = fullBox.getCenter(new THREE.Vector3());

            const modelW = Math.max(size.x, 1);
            const modelD = Math.max(size.z, 1);
            const modelH = Math.max(size.y, 1);

            // Options: Storey, Reference Elevation & Standard Cut Plane (+1.20m)
            const targetStorey = customOptions?.storey || (selectedStorey !== 'all' ? selectedStorey : 'Piso 0');
            
            let refElevation = customOptions?.referenceElevation;
            if (refElevation === undefined) {
                if (targetStorey === 'Piso 1') refElevation = min.y + modelH * 0.33;
                else if (targetStorey === 'Piso 2') refElevation = min.y + modelH * 0.66;
                else if (targetStorey === 'Cobertura') refElevation = min.y + modelH * 0.88;
                else refElevation = min.y + 0.3; // Piso 0
            }

            // Standard Architectural Section Cut Plane (+1.20m above floor level)
            const cotaOffset = customOptions?.cotaCorteOffset ?? 1.20;
            const cutY = refElevation + cotaOffset;
            const sliceBandHalf = 0.85;

            // Sheet format, scale & style options
            const sheetFormat = customOptions?.format || 'a3';
            const orientation = customOptions?.orientation || 'landscape';
            const scaleFormat = customOptions?.scale || '1:100';
            const style = customOptions?.style || 'cad';
            const chosenView = customOptions?.viewOrientation || viewOrientation || 'top';
            const title = customOptions?.title || `Planta de Estaleiro e Segurana - ${targetStorey}`;
            const code = customOptions?.code || `PE-0${(cdeDrawings.length + 1).toString().padStart(2, '0')}`;
            const fileName = `${code}_${title.replace(/[^a-zA-Z0-9]/g, '_')}_${scaleFormat.replace(':', '_')}.pdf`;

            // 1. Extract 2D vector section-cut segments [x1, z1, x2, z2] from IFC meshes
            const cutSegments: [number, number, number, number][] = [];
            const projFootprints: [number, number, number, number][] = [];
            let sectionedMeshCount = 0;

            const vA = new THREE.Vector3();
            const vB = new THREE.Vector3();
            const vC = new THREE.Vector3();

            const addPlaneTriangleIntersection = (p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, planeY: number) => {
                const pts: [number, number][] = [];
                const checkEdge = (a: THREE.Vector3, b: THREE.Vector3) => {
                    const da = a.y - planeY;
                    const db = b.y - planeY;
                    if ((da <= 0 && db >= 0) || (da >= 0 && db <= 0)) {
                        const denom = b.y - a.y;
                        if (Math.abs(denom) > 1e-5) {
                            const t = (planeY - a.y) / denom;
                            if (t >= 0 && t <= 1) {
                                pts.push([a.x + t * (b.x - a.x), a.z + t * (b.z - a.z)]);
                            }
                        }
                    }
                };
                checkEdge(p1, p2);
                checkEdge(p2, p3);
                checkEdge(p3, p1);
                if (pts.length >= 2) {
                    const dx = pts[0][0] - pts[1][0];
                    const dz = pts[0][1] - pts[1][1];
                    if (dx * dx + dz * dz > 0.0004) {
                        cutSegments.push([pts[0][0], pts[0][1], pts[1][0], pts[1][1]]);
                    }
                }
            };

            bimGroup.traverse((child) => {
                if (child instanceof THREE.Mesh && child.geometry) {
                    const mBox = new THREE.Box3().setFromObject(child);
                    if (mBox.max.y < min.y - 0.5 || mBox.min.y > cutY + sliceBandHalf) return;

                    sectionedMeshCount++;
                    const geom = child.geometry as THREE.BufferGeometry;
                    const posAttr = geom.attributes.position;
                    if (!posAttr) return;

                    const testY = (mBox.min.y <= cutY && mBox.max.y >= cutY)
                        ? cutY
                        : (mBox.min.y + mBox.max.y) * 0.5;

                    if (Math.abs(testY - cutY) <= sliceBandHalf && cutSegments.length < 18000) {
                        const indexAttr = geom.index;
                        if (indexAttr) {
                            const triCount = Math.min(indexAttr.count, 9000);
                            for (let i = 0; i < triCount; i += 3) {
                                vA.fromBufferAttribute(posAttr, indexAttr.getX(i)).applyMatrix4(child.matrixWorld);
                                vB.fromBufferAttribute(posAttr, indexAttr.getX(i + 1)).applyMatrix4(child.matrixWorld);
                                vC.fromBufferAttribute(posAttr, indexAttr.getX(i + 2)).applyMatrix4(child.matrixWorld);
                                addPlaneTriangleIntersection(vA, vB, vC, testY);
                            }
                        } else {
                            const vertCount = Math.min(posAttr.count, 9000);
                            for (let i = 0; i < vertCount; i += 3) {
                                vA.fromBufferAttribute(posAttr, i).applyMatrix4(child.matrixWorld);
                                vB.fromBufferAttribute(posAttr, i + 1).applyMatrix4(child.matrixWorld);
                                vC.fromBufferAttribute(posAttr, i + 2).applyMatrix4(child.matrixWorld);
                                addPlaneTriangleIntersection(vA, vB, vC, testY);
                            }
                        }
                    }

                    if (projFootprints.length < 2500) {
                        const bw = mBox.max.x - mBox.min.x;
                        const bd = mBox.max.z - mBox.min.z;
                        if (bw < modelW * 0.98 || bd < modelD * 0.98) {
                            projFootprints.push([mBox.min.x, mBox.min.z, mBox.max.x, mBox.max.z]);
                        }
                    }
                }
            });

            // 2. High-resolution orthographic snapshot if shaded or CAD overlay
            let previewDataUrl: string | undefined;
            const renderer = rendererRef.current;
            const scene = sceneRef.current;
            if (renderer && scene && style === 'shaded') {
                const prevBg = scene.background;
                const prevPinsVis = pinsGroupRef.current ? pinsGroupRef.current.visible : true;
                const prevLogVis = logisticsGroupRef.current ? logisticsGroupRef.current.visible : true;
                const prevGridVis = grid2dGroupRef.current ? grid2dGroupRef.current.visible : false;
                const prevClipping = renderer.clippingPlanes;
                const prevLocalClip = renderer.localClippingEnabled;

                const hiddenHelpers: THREE.Object3D[] = [];
                scene.children.forEach(obj => {
                    if (obj instanceof THREE.GridHelper || (obj instanceof THREE.Mesh && !bimGroup.children.includes(obj))) {
                        if (obj.visible) {
                            obj.visible = false;
                            hiddenHelpers.push(obj);
                        }
                    }
                });

                if (pinsGroupRef.current) pinsGroupRef.current.visible = false;
                if (logisticsGroupRef.current) logisticsGroupRef.current.visible = false;
                if (grid2dGroupRef.current) grid2dGroupRef.current.visible = false;

                scene.background = new THREE.Color(0xffffff);
                renderer.localClippingEnabled = true;
                const sectionPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), cutY + 0.6);
                renderer.clippingPlanes = [sectionPlane];

                const padFactor = 1.08;
                const halfW = (modelW * padFactor) / 2;
                const halfD = (modelD * padFactor) / 2;
                const snapshotCamera = new THREE.OrthographicCamera(
                    -halfW, halfW, halfD, -halfD, 0.1, 500
                );
                snapshotCamera.position.set(center.x, max.y + 30, center.z);
                snapshotCamera.lookAt(center.x, cutY, center.z);
                snapshotCamera.up.set(0, 0, -1);
                snapshotCamera.updateProjectionMatrix();

                const snapW = 2048;
                const snapH = Math.round(snapW * (modelD / modelW));
                const renderTarget = new THREE.WebGLRenderTarget(snapW, snapH, {
                    format: THREE.RGBAFormat,
                    colorSpace: THREE.SRGBColorSpace
                });

                renderer.setRenderTarget(renderTarget);
                renderer.render(scene, snapshotCamera);
                renderer.setRenderTarget(null);

                const pixelBuffer = new Uint8Array(snapW * snapH * 4);
                renderer.readRenderTargetPixels(renderTarget, 0, 0, snapW, snapH, pixelBuffer);
                renderTarget.dispose();

                const offCanvas = document.createElement('canvas');
                offCanvas.width = snapW;
                offCanvas.height = snapH;
                const ctx = offCanvas.getContext('2d');
                if (ctx) {
                    const imgData = ctx.createImageData(snapW, snapH);
                    for (let row = 0; row < snapH; row++) {
                        const srcRow = snapH - 1 - row;
                        const srcOffset = srcRow * snapW * 4;
                        const dstOffset = row * snapW * 4;
                        imgData.data.set(pixelBuffer.subarray(srcOffset, srcOffset + snapW * 4), dstOffset);
                    }
                    ctx.putImageData(imgData, 0, 0);
                    previewDataUrl = offCanvas.toDataURL('image/png', 0.92);
                }

                scene.background = prevBg;
                if (pinsGroupRef.current) pinsGroupRef.current.visible = prevPinsVis;
                if (logisticsGroupRef.current) logisticsGroupRef.current.visible = prevLogVis;
                if (grid2dGroupRef.current) grid2dGroupRef.current.visible = prevGridVis;
                hiddenHelpers.forEach(obj => { obj.visible = true; });
                renderer.clippingPlanes = prevClipping;
                renderer.localClippingEnabled = prevLocalClip;
            }

            // 3. Assemble Official Technical Drawing PDF
            const dims: Record<string, [number, number]> = {
                a4: [297, 210],
                a3: [420, 297],
                a2: [594, 420],
                a1: [841, 594],
                a0: [1189, 841]
            };
            const [pW, pH] = orientation === 'portrait'
                ? [dims[sheetFormat][1], dims[sheetFormat][0]]
                : [dims[sheetFormat][0], dims[sheetFormat][1]];

            const doc = new jsPDF({ orientation, unit: 'mm', format: sheetFormat });

            // Official Margins (10mm outer, 12mm inner)
            doc.setDrawColor(15, 23, 42);
            doc.setLineWidth(0.6);
            doc.rect(10, 10, pW - 20, pH - 20);
            doc.setLineWidth(0.2);
            doc.rect(12, 12, pW - 24, pH - 24);

            // Viewport Box on Sheet
            const sidebarW = Math.min(95, pW * 0.24);
            const vpX = 24;
            const vpY = 22;
            const vpW = pW - sidebarW - 36;
            const vpH = pH - 44;

            const scaleX = vpW / modelW;
            const scaleZ = vpH / modelD;
            const drawScale = Math.min(scaleX, scaleZ) * 0.85;

            const drawW = modelW * drawScale;
            const drawH = modelD * drawScale;
            const offsetX = vpX + (vpW - drawW) / 2;
            const offsetY = vpY + (vpH - drawH) / 2;

            const toSheetX = (wx: number) => offsetX + ((wx - min.x) / modelW) * drawW;
            const toSheetY = (wz: number) => offsetY + ((wz - min.z) / modelD) * drawH;

            // Optional Underlay Image in PDF
            if (customOptions?.underlayUrl) {
                try {
                    doc.addImage(customOptions.underlayUrl, 'PNG', offsetX, offsetY, drawW, drawH);
                } catch (_) {}
            }

            // Place shaded snapshot if requested
            if (previewDataUrl && style === 'shaded') {
                try {
                    const padW = drawW * 1.08;
                    const padH = drawH * 1.08;
                    const imgX = offsetX - (padW - drawW) / 2;
                    const imgY = offsetY - (padH - drawH) / 2;
                    doc.addImage(previewDataUrl, 'PNG', imgX, imgY, padW, padH);
                } catch (_) {}
            }

            // Structural CAD Grid Axes (1, 2, 3.. and A, B, C..)
            const cols = 5;
            const rows = 4;
            doc.setDrawColor(203, 213, 225);
            doc.setLineWidth(0.12);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            doc.setTextColor(71, 85, 105);

            for (let i = 0; i <= cols; i++) {
                const gx = offsetX + (drawW / cols) * i;
                doc.line(gx, offsetY - 8, gx, offsetY + drawH + 8);
                doc.circle(gx, offsetY - 11, 2.5);
                doc.text(String(i + 1), gx - 0.8, offsetY - 10.2);
            }
            const axisLetters = ['A', 'B', 'C', 'D', 'E'];
            for (let j = 0; j <= rows; j++) {
                const gy = offsetY + (drawH / rows) * j;
                doc.line(offsetX - 8, gy, offsetX + drawW + 8, gy);
                doc.circle(offsetX - 11, gy, 2.5);
                doc.text(axisLetters[j] || String(j + 1), offsetX - 11.8, gy + 0.8);
            }

            // Projected Footprints below cut plane (Light grey)
            doc.setDrawColor(148, 163, 184);
            doc.setLineWidth(0.12);
            for (const [x1, z1, x2, z2] of projFootprints) {
                const sx = toSheetX(x1);
                const sy = toSheetY(z1);
                const sw = Math.max(toSheetX(x2) - sx, 0.2);
                const sh = Math.max(toSheetY(z2) - sy, 0.2);
                doc.rect(sx, sy, sw, sh);
            }

            // Bold Section Cut Vector Lines from IFC Triangles (Standard Architectural 0.35mm)
            doc.setDrawColor(15, 23, 42);
            doc.setLineWidth(0.35);
            for (const [x1, z1, x2, z2] of cutSegments) {
                doc.line(toSheetX(x1), toSheetY(z1), toSheetX(x2), toSheetY(z2));
            }

            // Dimension Strings (L and P in meters)
            doc.setDrawColor(37, 99, 235);
            doc.setTextColor(30, 64, 175);
            doc.setLineWidth(0.22);
            doc.setFontSize(8);
            const dimY = offsetY + drawH + 14;
            doc.line(offsetX, dimY, offsetX + drawW, dimY);
            doc.line(offsetX, offsetY + drawH + 2, offsetX, dimY + 2);
            doc.line(offsetX + drawW, offsetY + drawH + 2, offsetX + drawW, dimY + 2);
            doc.text(`L = ${modelW.toFixed(2)} m (Medio Real IFC)`, offsetX + drawW / 2 - 18, dimY - 1.5);

            const dimX = offsetX + drawW + 14;
            doc.line(dimX, offsetY, dimX, offsetY + drawH);
            doc.line(offsetX + drawW + 2, offsetY, dimX + 2, offsetY);
            doc.line(offsetX + drawW + 2, offsetY + drawH, dimX + 2, offsetY + drawH);
            doc.text(`P = ${modelD.toFixed(2)} m`, dimX + 2, offsetY + drawH / 2);

            // Right-Side Technical Sidebar & ISO 19650 Cartouche
            const sbX = pW - sidebarW - 12;
            doc.setDrawColor(15, 23, 42);
            doc.setLineWidth(0.35);
            doc.line(sbX, 12, sbX, pH - 12);

            // Sidebar Box
            doc.setFillColor(248, 250, 252);
            doc.rect(sbX + 3, 16, sidebarW - 6, 92, 'FD');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(15, 23, 42);
            doc.text('DADOS TCNICOS DO IFC', sbX + 7, 24);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(51, 65, 85);
            doc.text(`Obra: ${currentProject.name.slice(0, 28)}`, sbX + 7, 33);
            doc.text(`Nvel / Piso: ${targetStorey}`, sbX + 7, 40);
            doc.text(`Cota do Piso: ${refElevation.toFixed(2)} m`, sbX + 7, 47);
            doc.text(`Cota de Corte: +${cotaOffset.toFixed(2)} m (Regulamentar)`, sbX + 7, 54);
            doc.text(`Dimenses: ${modelW.toFixed(2)}m  ${modelD.toFixed(2)}m`, sbX + 7, 61);
            doc.text(`Escala: ${scaleFormat} | Formato: ${sheetFormat.toUpperCase()}`, sbX + 7, 68);
            doc.text(`Elementos Cortados: ${sectionedMeshCount}`, sbX + 7, 75);
            doc.text(`Segmentos Vetoriais: ${cutSegments.length}`, sbX + 7, 82);
            doc.text(`Norma: ISO 16739 (IFC) / DL 273/2003`, sbX + 7, 89);
            doc.text(`Estilo: ${style === 'cad' ? 'CAD Vetorial P&B' : 'Shaded IFC'}`, sbX + 7, 96);

            // Official Title Block (Carimbo Tcnico CSO)
            const cartH = 68;
            const cartY = pH - cartH - 14;
            doc.setFillColor(15, 23, 42);
            doc.rect(sbX + 3, cartY, sidebarW - 6, 16, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text('SAFESITE BIM  PLANTA 2D', sbX + 7, cartY + 7);
            doc.setFontSize(7);
            doc.text('GEORREFERENCIADA COM O MODELO 3D', sbX + 7, cartY + 12.5);

            doc.setDrawColor(15, 23, 42);
            doc.rect(sbX + 3, cartY + 16, sidebarW - 6, cartH - 16);
            doc.setTextColor(15, 23, 42);
            doc.setFontSize(8);
            doc.text(`OBRA: ${currentProject.name.slice(0, 24)}`, sbX + 7, cartY + 23);
            doc.text(`PEA: ${code} - ${targetStorey}`, sbX + 7, cartY + 30);
            doc.text(`ESCALA: ${scaleFormat} | ${sheetFormat.toUpperCase()}`, sbX + 7, cartY + 37);
            doc.text(`DATA: ${new Date().toLocaleDateString('pt-PT')}`, sbX + 7, cartY + 44);
            doc.text(`COORDENAO: DL 273/2003 (CSO)`, sbX + 7, cartY + 51);
            doc.text(`ESTADO: Aprovado para Estaleiro`, sbX + 7, cartY + 58);

            const pdfBlob = doc.output('blob');
            const createdBlobUrl = URL.createObjectURL(pdfBlob);
            const generatedPdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

            const newDrawingId = `gen-dw-${Date.now()}`;
            const newDrawing: CdeDrawing2D = {
                id: newDrawingId,
                code,
                title,
                fileName,
                format: `${sheetFormat.toUpperCase()} (${scaleFormat})`,
                storey: targetStorey,
                revision: 'IFC Direto',
                discipline: 'architecture',
                date: new Date().toISOString().slice(0, 10),
                isRealCdeFile: true,
                cdeId: `cde-gen-${Date.now()}`,
                localBlobUrl: createdBlobUrl,
                previewDataUrl,
                vectorSegments: cutSegments.slice(0, 6000),
                scale: scaleFormat,
                cotaCorte: cotaOffset,
                referenceElevation: refElevation,
                style,
                underlay: customOptions?.underlayUrl ? {
                    enabled: true,
                    url: customOptions.underlayUrl,
                    fileName: customOptions.underlayFileName || 'Fundo_Referencia.pdf',
                    offsetX: 0,
                    offsetZ: 0,
                    scale: 1.0,
                    rotation: 0,
                    opacity: 0.45
                } : undefined,
                modelBounds: {
                    minX: min.x,
                    maxX: max.x,
                    minZ: min.z,
                    maxZ: max.z,
                    width: modelW,
                    depth: modelD,
                    height: modelH,
                    cutY: cutY - min.y,
                    meshCount: sectionedMeshCount
                }
            };

            // Persist metadata in state and localStorage
            setCdeDrawings(prev => {
                const next = [newDrawing, ...prev.filter(d => d.id !== newDrawingId && !isSampleDrawingId(d))];
                try {
                    const lightNext = next.map(({ previewDataUrl: _p, vectorSegments: _v, localBlobUrl: _b, ...rest }) => rest);
                    localStorage.setItem(`safesite_cde_drawings_${projectId}`, JSON.stringify(lightNext));
                } catch (_) {}
                return next;
            });

            setSelected2dDrawing(newDrawing);
            setCurrentPdfUrl(createdBlobUrl);
            setViewDimension('2d');
            setDrawingViewMode('interactive');

            // Synchronize with CDE Cloud storage if connected
            fetch(`/api/projects/${projectId}/cde`)
                .then(r => r.json())
                .then(data => {
                    if (data?.cdeConfig?.connected) {
                        uploadToCDEFolder(
                            { ...data.cdeConfig, projectId } as any,
                            'Desenhos 2D (Plantas)',
                            generatedPdfFile
                        ).then(() => {
                            showToast(`Planta "${code}" arquivada com sucesso no CDE Cloud.`);
                        }).catch(cdeErr => {
                            console.warn('[BIM CDE Sync warning]', cdeErr);
                        });
                    }
                }).catch(() => {});

            showToast(`Prancha 2D "${title}" gerada com sucesso e aberta no editor!`);
        } catch (err: any) {
            console.error('Failed to generate 2D drawing:', err);
            showToast('Aviso: No foi possvel extrair a planta 2D do modelo IFC.');
        } finally {
            setIsGenerating2dPlan(false);
        }
    };

    // Filter project observations and logistics items
    const projectObservations = useMemo(() => {
        return (siteObservations || []).filter(o => o.projectId === projectId);
    }, [siteObservations, projectId]);

    const projectLogistics = useMemo(() => {
        return (siteLogisticsItems || []).filter(l => {
            if (l.projectId !== projectId) return false;
            if (is4dActive && simDate) {
                if (l.startDate && l.startDate > simDate) return false;
                if (l.endDate && l.endDate < simDate) return false;
            }
            return true;
        });
    }, [siteLogisticsItems, projectId, is4dActive, simDate]);

    const projectWorkZones = useMemo(() => {
        return (siteWorkZones || []).filter(z => {
            if (z.projectId !== projectId) return false;
            if (is4dActive && simDate) {
                if (z.startDate && z.startDate > simDate) return false;
                if (z.endDate && z.endDate < simDate) return false;
            }
            return true;
        });
    }, [siteWorkZones, projectId, is4dActive, simDate]);

    const projectTasks = useMemo(() => {
        return (workPlanTasks || []).filter(t => t.projectId === projectId);
    }, [workPlanTasks, projectId]);

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

        modelCenterRef.current = new THREE.Vector3(0, 4.8, 0);
        modelSizeRef.current = new THREE.Vector3(18, 10, 14);
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

    const createSignageCanvasTexture = useCallback((symbolId?: string, label?: string, type?: string): THREE.Texture => {
        if (typeof document === 'undefined') return new THREE.Texture();
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        if (!ctx) return new THREE.Texture();

        const isFire = symbolId?.startsWith('F') || type === 'fire_extinguisher';
        const isWarning = symbolId?.startsWith('W') || type === 'fuel_depot';
        const isMandatory = symbolId?.startsWith('M') || type === 'gate';
        const isSafe = symbolId?.startsWith('E') || type === 'meeting_point' || type === 'first_aid' || type === 'evacuation_route';

        let bgColor = '#16a34a'; // ISO 7010 Green
        let textColor = '#ffffff';
        let borderColor = '#ffffff';

        if (isFire) {
            bgColor = '#dc2626'; // ISO 7010 Red
        } else if (isWarning) {
            bgColor = '#f59e0b'; // ISO 7010 Yellow
            textColor = '#0f172a';
            borderColor = '#0f172a';
        } else if (isMandatory) {
            bgColor = '#2563eb'; // ISO 7010 Blue
        } else if (isSafe) {
            bgColor = '#16a34a';
        }

        // Background
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, 256, 256);

        // Inner Border
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 12;
        ctx.strokeRect(12, 12, 232, 232);

        // Header Code
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 36px Arial, sans-serif';
        const code = symbolId || (isFire ? 'F001' : isSafe ? 'E001' : isWarning ? 'W001' : 'SST');
        ctx.fillText(code, 128, 62);

        // Center Graphic Pictogram Representation
        ctx.font = '64px Arial, sans-serif';
        if (isFire) {
            ctx.fillText('🧯', 128, 130);
        } else if (symbolId === 'E003' || type === 'first_aid') {
            ctx.fillText('✚', 128, 130);
        } else if (symbolId === 'E007' || type === 'meeting_point') {
            ctx.fillText('👥', 128, 130);
        } else if (isSafe) {
            ctx.fillText('➔', 128, 130);
        } else if (isWarning) {
            ctx.fillText('⚠️', 128, 130);
        } else {
            ctx.fillText('🛡️', 128, 130);
        }

        // Bottom Subtitle Label
        ctx.font = 'bold 20px Arial, sans-serif';
        const displayLabel = (label || code).slice(0, 16);
        ctx.fillText(displayLabel, 128, 202);

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }, []);

    const createSignage3D = useCallback((symbolId?: string, label?: string, type?: string): THREE.Group => {
        const signGroup = new THREE.Group();

        const poleMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.3 });
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.0, 16), poleMat);
        pole.position.y = 1.0;
        pole.castShadow = true;
        signGroup.add(pole);

        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.04, 16), poleMat);
        base.position.y = 0.02;
        signGroup.add(base);

        const texture = createSignageCanvasTexture(symbolId, label, type);
        const signMat = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.3,
            metalness: 0.1
        });
        const edgeMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
        const board = new THREE.Mesh(
            new THREE.BoxGeometry(0.85, 0.85, 0.04),
            [edgeMat, edgeMat, edgeMat, edgeMat, signMat, signMat]
        );
        board.position.y = 1.95;
        board.castShadow = true;
        signGroup.add(board);

        return signGroup;
    }, [createSignageCanvasTexture]);

    // Render 3D and 2D High-Detail Meshes for Estaleiro & Emergência Items
    const renderLogisticsAndEmergencyItems = useCallback((group: THREE.Group, items: SiteLogisticsItem[]) => {
        group.clear();

        items.forEach((item) => {
            const itemGroup = new THREE.Group();
            itemGroup.position.set(item.position[0], item.position[1], item.position[2]);
            itemGroup.rotation.y = item.rotation || 0;
            itemGroup.userData = { logisticsItem: item };

            const isSelected = activeLogisticsItem?.id === item.id;

            // Highlight ring if selected
            if (isSelected) {
                const selGeo = new THREE.RingGeometry(1.2, 1.4, 32);
                const selMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide });
                const selMesh = new THREE.Mesh(selGeo, selMat);
                selMesh.rotation.x = -Math.PI / 2;
                selMesh.position.y = 0.08;
                itemGroup.add(selMesh);
            }

            if (item.type === 'crane') {
                // High-Fidelity Tower Crane (Grua Torre)
                const yellowMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.35, metalness: 0.4 });
                const darkMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });

                // Lattice Mast Tower
                const mast = new THREE.Mesh(new THREE.BoxGeometry(1.2, 19, 1.2), yellowMat);
                mast.position.y = 9.5;
                mast.castShadow = true;
                itemGroup.add(mast);

                // Operator Cabin
                const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.8, 1.2), new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.2 }));
                cabin.position.set(0.9, 17.5, 0);
                itemGroup.add(cabin);

                // Horizontal Jib & Counter-Jib
                const jibLen = item.radius || 26;
                const jib = new THREE.Mesh(new THREE.BoxGeometry(jibLen, 0.7, 0.7), yellowMat);
                jib.position.set((jibLen / 2) - 3, 19.4, 0);
                itemGroup.add(jib);

                // Counterweight Blocks
                const cw = new THREE.Mesh(new THREE.BoxGeometry(4.0, 1.4, 1.2), darkMat);
                cw.position.set(-6, 19.4, 0);
                itemGroup.add(cw);

                // Hoist Cable & Hook
                const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 10), darkMat);
                cable.position.set(jibLen * 0.45, 14, 0);
                const hook = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.05, 0.6), darkMat);
                hook.position.set(jibLen * 0.45, 8.8, 0);
                itemGroup.add(cable, hook);

                // Crane radius coverage ring on ground
                const radiusGeo = new THREE.RingGeometry(jibLen - 0.25, jibLen, 64);
                const radiusMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
                const ring = new THREE.Mesh(radiusGeo, radiusMat);
                ring.rotation.x = -Math.PI / 2;
                ring.position.y = 0.06;
                itemGroup.add(ring);
            } else if (item.type === 'mobile_crane') {
                // Mobile Crane (Grua Móvel Telescópica)
                const orangeMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4 });
                const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });

                // Truck Chassis
                const chassis = new THREE.Mesh(new THREE.BoxGeometry(7, 1.2, 2.6), orangeMat);
                chassis.position.y = 0.9;
                chassis.castShadow = true;
                itemGroup.add(chassis);

                // Telescopic Boom
                const boom = new THREE.Mesh(new THREE.BoxGeometry(0.8, 14, 0.8), orangeMat);
                boom.position.set(0, 7.5, 0);
                boom.rotation.z = -0.4;
                itemGroup.add(boom);

                // Wheels
                for (let x = -2.5; x <= 2.5; x += 1.8) {
                    const wheelL = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.4, 16), darkMat);
                    wheelL.rotation.x = Math.PI / 2;
                    wheelL.position.set(x, 0.5, 1.4);
                    const wheelR = wheelL.clone();
                    wheelR.position.set(x, 0.5, -1.4);
                    itemGroup.add(wheelL, wheelR);
                }
            } else if (item.type === 'hoist') {
                // Material Hoist (Monta-Cargas Exterior)
                const hoistMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.5 });
                const mast = new THREE.Mesh(new THREE.BoxGeometry(0.8, 14, 0.8), hoistMat);
                mast.position.y = 7;
                const cage = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.2, 1.8), new THREE.MeshStandardMaterial({ color: 0xfacc15, wireframe: true }));
                cage.position.set(1.4, 4, 0);
                itemGroup.add(mast, cage);
            } else if (item.type === 'office_container' || item.type === 'dining_container' || item.type === 'sanitary_container') {
                // Prefab Containers (6 x 2.4 x 2.6m)
                const bodyColor = item.type === 'office_container' ? 0x1e3a8a : item.type === 'dining_container' ? 0x2563eb : 0x0f766e;
                const containerMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.4 });
                const cornerMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });

                const container = new THREE.Mesh(new THREE.BoxGeometry(6, 2.6, 2.4), containerMat);
                container.position.y = 1.3;
                container.castShadow = true;

                // Corner Posts & Door detail
                const door = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.0, 0.9), new THREE.MeshStandardMaterial({ color: 0xffffff }));
                door.position.set(3.01, 1.1, 0);
                const windowMesh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 0.05), new THREE.MeshPhysicalMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.8 }));
                windowMesh.position.set(0, 1.4, 1.21);

                itemGroup.add(container, door, windowMesh);
            } else if (item.type === 'gate') {
                // Portaria & Torniquete Biométrico
                const gateMat = new THREE.MeshStandardMaterial({ color: 0x0284c7 });
                const kiosk = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 2.0), gateMat);
                kiosk.position.set(-1.8, 1.2, 0);
                const turnstile = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.1, 16), new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 }));
                turnstile.position.set(0.8, 0.55, 0);
                const bar = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 0.1), gateMat);
                bar.position.set(1.5, 1.0, 0);
                itemGroup.add(kiosk, turnstile, bar);
            } else if (item.type === 'waste_bay') {
                // RCD Waste Bays (3 partitioned bays)
                const wallMat = new THREE.MeshStandardMaterial({ color: 0x64748b });
                const backWall = new THREE.Mesh(new THREE.BoxGeometry(6.4, 1.6, 0.2), wallMat);
                backWall.position.set(0, 0.8, -1.5);
                itemGroup.add(backWall);

                // 3 Bays with color markers (Blue: Paper/Cardboard, Yellow: Plastic/Metal, Grey: Rubble)
                const bayColors = [0x3b82f6, 0xeab308, 0x475569];
                for (let i = 0; i < 3; i++) {
                    const floorMat = new THREE.MeshStandardMaterial({ color: bayColors[i], roughness: 0.7 });
                    const bayFloor = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.2, 3.0), floorMat);
                    bayFloor.position.set(-2.0 + i * 2.0, 0.1, 0);
                    itemGroup.add(bayFloor);
                }
            } else if (item.type === 'fuel_depot') {
                // Bacia de Retenção de Combustível
                const bundMat = new THREE.MeshStandardMaterial({ color: 0xca8a04 });
                const bund = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.6, 2.5), bundMat);
                bund.position.y = 0.3;
                const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 2.4, 16), new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.6 }));
                tank.rotation.z = Math.PI / 2;
                tank.position.y = 1.1;
                itemGroup.add(bund, tank);
            } else if (item.type === 'wheel_wash') {
                // Lava-Rodados para Camiões
                const washMat = new THREE.MeshStandardMaterial({ color: 0x0891b2 });
                const ramp = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.3, 3.2), washMat);
                ramp.position.y = 0.15;
                itemGroup.add(ramp);
            } else if (item.type === 'scaffolding') {
                // Andaime Multidirecional
                const scMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7 });
                const frame = new THREE.Mesh(new THREE.BoxGeometry(3.0, 6.0, 1.2), new THREE.MeshStandardMaterial({ color: 0x64748b, wireframe: true }));
                frame.position.y = 3.0;
                const plank = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.08, 1.1), new THREE.MeshStandardMaterial({ color: 0xeab308 }));
                plank.position.y = 3.0;
                itemGroup.add(frame, plank);
            } else if (item.type === 'pedestrian_path') {
                // Passadiço Pedonal Protegido
                const walkwayMat = new THREE.MeshStandardMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.85 });
                const walk = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.1, 1.8), walkwayMat);
                walk.position.y = 0.08;
                const rail = new THREE.Mesh(new THREE.BoxGeometry(6.0, 1.0, 0.06), new THREE.MeshStandardMaterial({ color: 0xfacc15 }));
                rail.position.set(0, 0.55, 0.85);
                itemGroup.add(walk, rail);
            } else if (item.type === 'vehicle_route') {
                // Corredor de Tráfego Pesado
                const roadMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 });
                const road = new THREE.Mesh(new THREE.BoxGeometry(10.0, 0.04, 3.6), roadMat);
                road.position.y = 0.04;
                itemGroup.add(road);
            } else if (item.type === 'meeting_point') {
                // Emergency Muster Point (Green ISO 7010)
                const greenMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.3 });
                const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.4), greenMat);
                pole.position.y = 1.7;
                const sign = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 0.08), greenMat);
                sign.position.y = 3.4;
                itemGroup.add(pole, sign);

                // Safe assembly circle on floor
                const circleGeo = new THREE.RingGeometry(4.8, 5.0, 48);
                const circleMat = new THREE.MeshBasicMaterial({ color: 0x16a34a, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
                const assemblyRing = new THREE.Mesh(circleGeo, circleMat);
                assemblyRing.rotation.x = -Math.PI / 2;
                assemblyRing.position.y = 0.06;
                itemGroup.add(assemblyRing);
            } else if (item.type === 'fire_extinguisher') {
                // Central de Extintores (ISO 7010 Red)
                const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626 });
                const shelter = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.6, 0.5), redMat);
                shelter.position.y = 1.0;
                const cyl1 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.65), redMat);
                cyl1.position.set(-0.3, 0.6, 0);
                const cyl2 = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.70), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
                cyl2.position.set(0.3, 0.6, 0);
                itemGroup.add(shelter, cyl1, cyl2);
            } else if (item.type === 'first_aid') {
                // Posto de Primeiros Socorros & DAE
                const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 });
                const box = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.4, 2.4), whiteMat);
                box.position.y = 1.2;
                const cross = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.04), new THREE.MeshStandardMaterial({ color: 0x16a34a }));
                cross.position.set(0, 1.3, 1.21);
                itemGroup.add(box, cross);
            } else if (item.type === 'alarm_siren') {
                // Sirene de Emergência & Corneta
                const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.6), new THREE.MeshStandardMaterial({ color: 0xe11d48 }));
                pole.position.y = 1.8;
                const horn = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.6, 16), new THREE.MeshStandardMaterial({ color: 0xbe123c }));
                horn.rotation.x = Math.PI / 2;
                horn.position.set(0, 3.5, 0.3);
                itemGroup.add(pole, horn);
            } else if (item.type === 'evacuation_route') {
                // 3D Evacuation Path with Ground Track, Directional Chevrons and Exit Totem
                if (item.routePoints && item.routePoints.length >= 2) {
                    const routeMat = new THREE.MeshStandardMaterial({
                        color: 0x16a34a,
                        roughness: 0.4,
                        metalness: 0.1
                    });
                    const chevronMat = new THREE.MeshBasicMaterial({ color: 0x4ade80 });

                    for (let i = 0; i < item.routePoints.length - 1; i++) {
                        const p1 = item.routePoints[i];
                        const p2 = item.routePoints[i + 1];
                        const dx = p2[0] - p1[0];
                        const dz = p2[1] - p1[1];
                        const dist = Math.sqrt(dx * dx + dz * dz);
                        if (dist < 0.01) continue;

                        const midX = (p1[0] + p2[0]) / 2 - item.position[0];
                        const midZ = (p1[1] + p2[1]) / 2 - item.position[2];
                        const angle = Math.atan2(dz, dx);

                        // Ground track ribbon (0.7m wide)
                        const trackGeo = new THREE.BoxGeometry(dist, 0.05, 0.7);
                        const track = new THREE.Mesh(trackGeo, routeMat);
                        track.position.set(midX, 0.05, midZ);
                        track.rotation.y = -angle;
                        itemGroup.add(track);

                        // Directional chevrons along the segment (every ~2.5m)
                        const numChevrons = Math.max(1, Math.floor(dist / 2.5));
                        for (let c = 1; c <= numChevrons; c++) {
                            const frac = c / (numChevrons + 1);
                            const cx = (p1[0] + dx * frac) - item.position[0];
                            const cz = (p1[1] + dz * frac) - item.position[2];

                            const arrowCone = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.5, 3), chevronMat);
                            arrowCone.rotation.x = Math.PI / 2;
                            arrowCone.rotation.z = -angle - Math.PI / 2;
                            arrowCone.position.set(cx, 0.08, cz);
                            itemGroup.add(arrowCone);
                        }

                        // Waypoint disk
                        const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.06, 16), chevronMat);
                        disc.position.set(p1[0] - item.position[0], 0.06, p1[1] - item.position[2]);
                        itemGroup.add(disc);
                    }

                    // Destination point: 3D Exit Totem
                    const lastPt = item.routePoints[item.routePoints.length - 1];
                    const exitTotem = createSignage3D('E001', 'SAÍDA DE EMERGÊNCIA', 'evacuation_route');
                    exitTotem.position.set(lastPt[0] - item.position[0], 0, lastPt[1] - item.position[2]);
                    itemGroup.add(exitTotem);
                } else {
                    const greenMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.8 });
                    const arrow = new THREE.Mesh(new THREE.BoxGeometry(4, 0.04, 1.2), greenMat);
                    arrow.position.y = 0.05;
                    itemGroup.add(arrow);
                    const exitTotem = createSignage3D('E001', item.name, 'evacuation_route');
                    itemGroup.add(exitTotem);
                }
            }

            // If item has an ISO 7010 symbol assigned, add standing 3D signage totem
            if (item.symbolId && item.type !== 'evacuation_route') {
                const totem = createSignage3D(item.symbolId, item.name, item.type);
                itemGroup.add(totem);
            }

            group.add(itemGroup);
        });
    }, [activeLogisticsItem, createSignage3D]);

    // Initialize Three.js Scene
    useEffect(() => {
        if (!mountRef.current) return;
        const container = mountRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf8fafc);
        sceneRef.current = scene;

        const aspect = (width || 800) / (height || 600);

        const persCamera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
        persCamera.position.set(22, 18, 26);
        perspCameraRef.current = persCamera;

        const frustumSize = 35;
        const orthoCamera = new THREE.OrthographicCamera(
            (-frustumSize * aspect) / 2,
            (frustumSize * aspect) / 2,
            frustumSize / 2,
            -frustumSize / 2,
            0.1,
            2000
        );
        orthoCamera.position.set(22, 18, 26);
        orthoCameraRef.current = orthoCamera;

        const activeCamera = projectionMode === 'isometric' ? orthoCamera : persCamera;
        cameraRef.current = activeCamera;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
        renderer.setSize(width || 800, height || 600, false);
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        renderer.domElement.style.display = 'block';
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;
        container.replaceChildren(renderer.domElement);
        renderer.localClippingEnabled = true;
        rendererRef.current = renderer;

        const controls = new OrbitControls(activeCamera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.maxDistance = 250;
        controls.minDistance = 0.5;
        controls.maxPolarAngle = Math.PI - 0.05;
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

            const currentCam = cameraRef.current || persCamera;
            renderer.render(scene, currentCam);
        };
        animate();

        const updateCameras = (w: number, h: number) => {
            if (w <= 0 || h <= 0) return;
            const a = w / h;
            if (perspCameraRef.current) {
                perspCameraRef.current.aspect = a;
                perspCameraRef.current.updateProjectionMatrix();
            }
            if (orthoCameraRef.current) {
                const f = 35;
                orthoCameraRef.current.left = (-f * a) / 2;
                orthoCameraRef.current.right = (f * a) / 2;
                orthoCameraRef.current.top = f / 2;
                orthoCameraRef.current.bottom = -f / 2;
                orthoCameraRef.current.updateProjectionMatrix();
            }
            if (rendererRef.current) {
                rendererRef.current.setSize(w, h, false);
            }
        };

        const handleResize = () => {
            if (!container) return;
            updateCameras(container.clientWidth, container.clientHeight);
        };

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width: w, height: h } = entry.contentRect;
                updateCameras(w, h);
            }
        });
        resizeObserver.observe(container);
        window.addEventListener('resize', handleResize);

        return () => {
            resizeObserver.disconnect();
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

    // Handle Active Mode (Orbit vs Pan mouse drag)
    useEffect(() => {
        if (!controlsRef.current) return;
        if (activeMode === 'pan') {
            controlsRef.current.mouseButtons.LEFT = THREE.MOUSE.PAN;
            controlsRef.current.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
        } else {
            controlsRef.current.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
            controlsRef.current.mouseButtons.RIGHT = THREE.MOUSE.PAN;
        }
    }, [activeMode]);

    // Handle 3D Section Cut Plane
    useEffect(() => {
        if (!rendererRef.current) return;
        rendererRef.current.localClippingEnabled = true;
        if (sectionCutActive) {
            const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), sectionCutHeight);
            rendererRef.current.clippingPlanes = [plane];
        } else {
            rendererRef.current.clippingPlanes = [];
        }
    }, [sectionCutActive, sectionCutHeight]);

    // Handle X-Ray Interior View (Wall / Facade transparency)
    useEffect(() => {
        if (!bimGroupRef.current) return;
        bimGroupRef.current.traverse((child) => {
            if (child instanceof THREE.Mesh && child.userData?.isIfcElement) {
                if (selectedMeshRef.current === child) return;

                const cat = child.userData.category;
                const isEnvelope = cat === 'Wall' || cat === 'CurtainWall' || cat === 'Roof' || cat === 'Slab';

                if (isXRayMode) {
                    if (isEnvelope) {
                        child.material.transparent = true;
                        child.material.opacity = 0.22;
                        child.material.depthWrite = false;
                    }
                } else {
                    if (child.userData.originalMaterial) {
                        child.material = child.userData.originalMaterial;
                    } else {
                        child.material.transparent = cat === 'CurtainWall';
                        child.material.opacity = cat === 'CurtainWall' ? 0.45 : 1.0;
                        child.material.depthWrite = true;
                    }
                }
            }
        });
    }, [isXRayMode]);

    // Handle Discipline, Storey, and 4D Timeline Filtering
    useEffect(() => {
        if (!bimGroupRef.current) return;

        bimGroupRef.current.traverse((child) => {
            if (child instanceof THREE.Mesh && child.userData.isIfcElement) {
                const elementStorey = child.userData.storey;
                const elementDiscipline = child.userData.discipline || 'structure';

                const matchesStorey = selectedStorey === 'all' || elementStorey === selectedStorey || elementStorey === 'Exterior';
                const matchesDiscipline = selectedDiscipline === 'all' || elementDiscipline === selectedDiscipline;

                // 4D Construction Simulation Status Matching
                let is4dVisible = true;
                let is4dActiveTask = false;
                if (is4dActive && simDate && projectTasks.length > 0) {
                    const matchingTasks = projectTasks.filter(t => !t.storeyName || t.storeyName === elementStorey || t.storeyName === 'all');
                    if (matchingTasks.length > 0) {
                        const hasCompleted = matchingTasks.some(t => t.endDate && t.endDate < simDate);
                        const hasInProgress = matchingTasks.some(t => t.startDate && t.endDate && t.startDate <= simDate && t.endDate >= simDate);
                        const isFuture = matchingTasks.every(t => t.startDate && t.startDate > simDate);

                        if (hasInProgress) {
                            is4dActiveTask = true;
                            is4dVisible = true;
                        } else if (hasCompleted) {
                            is4dVisible = true;
                        } else if (isFuture) {
                            is4dVisible = show4dFutureGhost;
                        }
                    }
                }

                if (matchesStorey && matchesDiscipline && is4dVisible) {
                    child.visible = true;
                    if (child.material) {
                        if (is4dActive && is4dActiveTask) {
                            child.material.transparent = true;
                            child.material.opacity = 0.85;
                            child.material.color = new THREE.Color(0xf59e0b);
                            child.material.depthWrite = true;
                        } else {
                            child.material.transparent = Boolean(child.userData.category === 'CurtainWall');
                            child.material.opacity = child.userData.category === 'CurtainWall' ? 0.45 : 1.0;
                            child.material.depthWrite = true;
                        }
                    }
                } else if (!matchesStorey || !is4dVisible) {
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
    }, [selectedDiscipline, selectedStorey, ghostMode, is4dActive, simDate, show4dFutureGhost, projectTasks]);

    // Toggle 2D vs 3D View Dimension
    const handleToggleViewDimension = (mode: '3d' | '2d') => {
        setViewDimension(mode);
        if (mode === '2d') {
            setDrawingViewMode('interactive');
            const realDrawings = cdeDrawings.filter(d => d.isRealCdeFile);
            if (!selected2dDrawing || !selected2dDrawing.isRealCdeFile) {
                if (realDrawings.length > 0) {
                    setSelected2dDrawing(realDrawings[0]);
                } else if (!cdeStatus.connected && cdeDrawings.length > 0) {
                    setSelected2dDrawing(cdeDrawings[0]);
                } else {
                    setSelected2dDrawing(null);
                    // Automatic generation of 2D drawing of model in current view
                    handleGenerate2dDrawingFromModel();
                }
            }
            showToast('Modo Planta Técnica 2D ativado.');
        } else {
            showToast('Modo 3D ativado.');
        }

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
        } else {
            cameraRef.current.position.set(22, 18, 26);
            controlsRef.current.target.set(0, 4.5, 0);
            controlsRef.current.maxPolarAngle = Math.PI / 2 + 0.02;
            controlsRef.current.minPolarAngle = 0.0;
            controlsRef.current.update();
        }
    };

    // Toggle Projection Mode: Perspetiva vs Isométrica (Ortográfica)
    const handleToggleProjectionMode = useCallback((mode: ProjectionMode) => {
        setProjectionMode(mode);
        if (!controlsRef.current || !rendererRef.current) return;

        const controls = controlsRef.current;
        const target = controls.target.clone();
        const currentCam = cameraRef.current;
        const pos = currentCam ? currentCam.position.clone() : new THREE.Vector3(22, 18, 26);

        const container = mountRef.current;
        const w = container?.clientWidth || 800;
        const h = container?.clientHeight || 600;
        const aspect = w / h;

        const size = modelSizeRef.current || new THREE.Vector3(24, 12, 20);
        const maxDim = Math.max(size.x, size.y, size.z, 16);

        if (mode === 'isometric') {
            // Switch to genuine OrthographicCamera (Parallel Projection)
            const dist = pos.distanceTo(target);
            const frustum = Math.max(maxDim * 1.5, dist * 0.85);
            let ortho = orthoCameraRef.current;
            if (!ortho) {
                ortho = new THREE.OrthographicCamera(
                    (-frustum * aspect) / 2,
                    (frustum * aspect) / 2,
                    frustum / 2,
                    -frustum / 2,
                    0.1,
                    2000
                );
                orthoCameraRef.current = ortho;
            } else {
                ortho.left = (-frustum * aspect) / 2;
                ortho.right = (frustum * aspect) / 2;
                ortho.top = frustum / 2;
                ortho.bottom = -frustum / 2;
            }
            ortho.position.copy(pos);
            ortho.lookAt(target);
            ortho.zoom = 1;
            ortho.updateProjectionMatrix();

            cameraRef.current = ortho;
            controls.object = ortho;
            controls.update();
            showToast('Modo Isométrico / Ortográfico ativado (linhas paralelas sem distorção).');
        } else {
            // Switch to PerspectiveCamera
            const persp = perspCameraRef.current;
            if (persp) {
                persp.aspect = aspect;
                persp.position.copy(pos);
                persp.lookAt(target);
                persp.updateProjectionMatrix();

                cameraRef.current = persp;
                controls.object = persp;
                controls.update();
            }
            showToast('Modo Perspetiva 3D ativado (projeção natural com pontos de fuga).');
        }
    }, [showToast]);

    // Select Standard Camera View Orientations (3D Geral, Topo, Frente, Trás, Direita, Esquerda)
    const handleSetViewOrientation = useCallback((view: ViewOrientation) => {
        setViewOrientation(view);
        if (viewDimension === '2d') {
            setViewDimension('3d');
        }

        if (!cameraRef.current || !controlsRef.current) return;

        const target = modelCenterRef.current ? modelCenterRef.current.clone() : new THREE.Vector3(0, 4.5, 0);
        const size = modelSizeRef.current || new THREE.Vector3(24, 12, 20);
        const maxDim = Math.max(size.x, size.y, size.z, 16);

        const controls = controlsRef.current;
        const camera = cameraRef.current;

        let destination = new THREE.Vector3();
        let toastMsg = '';

        controls.minPolarAngle = 0;
        controls.maxPolarAngle = Math.PI;

        switch (view) {
            case 'isometric': // 3D Geral / Axonometria
                if (projectionMode === 'isometric') {
                    const isoDist = maxDim * 1.35;
                    destination.set(target.x + isoDist, target.y + isoDist, target.z + isoDist);
                    toastMsg = 'Vista Axonométrica Isométrica 3D ativada (linhas estritamente paralelas).';
                } else {
                    destination.set(target.x + maxDim * 1.25, target.y + maxDim * 0.9, target.z + maxDim * 1.35);
                    controls.maxPolarAngle = Math.PI / 2 + 0.05;
                    toastMsg = 'Vista Perspetiva 3D Geral ativada.';
                }
                break;
            case 'top':
                destination.set(target.x, target.y + maxDim * 2.5, target.z + 0.0001);
                toastMsg = projectionMode === 'isometric'
                    ? 'Vista de Topo (Planta 2D Ortográfica CAD do Modelo 3D).'
                    : 'Vista de Topo (Planta Superior em Perspetiva).';
                break;
            case 'front':
                destination.set(target.x, target.y + maxDim * 0.1, target.z + maxDim * 2.5);
                toastMsg = projectionMode === 'isometric'
                    ? 'Vista de Frente (Alçado Principal Sul Ortográfico).'
                    : 'Vista de Frente (Alçado Principal Sul em Perspetiva).';
                break;
            case 'back':
                destination.set(target.x, target.y + maxDim * 0.1, target.z - maxDim * 2.5);
                toastMsg = projectionMode === 'isometric'
                    ? 'Vista de Trás (Alçado Posterior Norte Ortográfico).'
                    : 'Vista de Trás (Alçado Posterior Norte em Perspetiva).';
                break;
            case 'right':
                destination.set(target.x + maxDim * 2.5, target.y + maxDim * 0.1, target.z);
                toastMsg = projectionMode === 'isometric'
                    ? 'Vista Lateral Direita (Alçado Este Ortográfico).'
                    : 'Vista Lateral Direita (Alçado Este em Perspetiva).';
                break;
            case 'left':
                destination.set(target.x - maxDim * 2.5, target.y + maxDim * 0.1, target.z);
                toastMsg = projectionMode === 'isometric'
                    ? 'Vista Lateral Esquerda (Alçado Oeste Ortográfico).'
                    : 'Vista Lateral Esquerda (Alçado Oeste em Perspetiva).';
                break;
        }

        if (view === 'top') {
            camera.up.set(0, 0, -1);
        } else {
            camera.up.set(0, 1, 0);
        }

        // Smooth camera lerp animation
        let step = 0;
        const initialPos = camera.position.clone();
        const initialTarget = controls.target.clone();

        const animateCameraMove = () => {
            step += 0.08;
            if (step < 1) {
                camera.position.lerpVectors(initialPos, destination, step);
                controls.target.lerpVectors(initialTarget, target, step);
                controls.update();
                requestAnimationFrame(animateCameraMove);
            } else {
                camera.position.copy(destination);
                controls.target.copy(target);
                controls.update();
            }
        };
        animateCameraMove();
        showToast(toastMsg);
    }, [viewDimension, projectionMode, showToast]);

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

    // Clear Selection and restore original 3D material
    const clearSelection = useCallback(() => {
        if (selectedMeshRef.current && selectedMeshRef.current.userData?.originalMaterial) {
            selectedMeshRef.current.material = selectedMeshRef.current.userData.originalMaterial;
        }
        selectedMeshRef.current = null;
        setSelectedElement(null);
        setActivePin(null);
        setActiveLogisticsItem(null);
    }, []);

    // Focus camera on selected element
    const flyToElement = useCallback((elem: any) => {
        if (!controlsRef.current || !cameraRef.current) return;
        const target = new THREE.Vector3(
            elem.centerPosition ? elem.centerPosition[0] : 0,
            elem.centerPosition ? elem.centerPosition[1] : (elem.elevationY || 3),
            elem.centerPosition ? elem.centerPosition[2] : 0
        );
        controlsRef.current.target.copy(target);
        cameraRef.current.position.set(target.x + 8, target.y + 6, target.z + 8);
        controlsRef.current.update();
        showToast("Câmara focada em " + elem.elementName);
    }, [showToast]);

    // Handle Canvas Click (Raycasting for inspection points and logistics placement)
    const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!mountRef.current || !cameraRef.current || !sceneRef.current) return;
        // In Pan mode, left click dragging should not create or select pins/elements
        if (activeMode === 'pan') return;

        const rect = mountRef.current.getBoundingClientRect();
        mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

        // 0. Moving Logistics Item mode
        if (activeMode === 'moving_logistics' && activeLogisticsItem) {
            const groundIntersects = raycasterRef.current.intersectObjects(sceneRef.current.children, true);
            if (groundIntersects.length > 0) {
                const pt = groundIntersects[0].point;
                const newPos: [number, number, number] = [Number(pt.x.toFixed(2)), 0, Number(pt.z.toFixed(2))];
                updateSiteLogisticsItem(activeLogisticsItem.id, { position: newPos });
                setActiveLogisticsItem(prev => prev ? { ...prev, position: newPos } : null);
                setActiveMode('navigate');
                showToast(`Elemento "${activeLogisticsItem.name}" deslocado para [${newPos[0]}, ${newPos[2]}].`);
                return;
            }
        }

        // 1. Raycast on existing observations
        if (pinsGroupRef.current) {
            const pinIntersects = raycasterRef.current.intersectObjects(pinsGroupRef.current.children, true);
            if (pinIntersects.length > 0) {
                let targetGroup: any = pinIntersects[0].object;
                while (targetGroup.parent && targetGroup.parent !== pinsGroupRef.current) {
                    targetGroup = targetGroup.parent;
                }
                if (targetGroup?.userData?.observation) {
                    if (selectedMeshRef.current && selectedMeshRef.current.userData?.originalMaterial) {
                        selectedMeshRef.current.material = selectedMeshRef.current.userData.originalMaterial;
                    }
                    selectedMeshRef.current = null;
                    setActivePin(targetGroup.userData.observation);
                    setSelectedElement(null);
                    setActiveLogisticsItem(null);
                    setLeftPanelTab('properties');
                    setIsLeftSidebarOpen(true);
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
                    if (selectedMeshRef.current && selectedMeshRef.current.userData?.originalMaterial) {
                        selectedMeshRef.current.material = selectedMeshRef.current.userData.originalMaterial;
                    }
                    selectedMeshRef.current = null;
                    setActiveLogisticsItem(targetGroup.userData.logisticsItem);
                    setSelectedElement(null);
                    setActivePin(null);
                    setLeftPanelTab('properties');
                    setIsLeftSidebarOpen(true);
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
                const catalogMatch = SITE_LOGISTICS_CATALOG.find(c => c.type === type);
                const itemName = catalogMatch ? catalogMatch.name : (type === 'crane' ? 'Grua Torre' : 'Equipamento de Estaleiro');
                const itemCategory = catalogMatch ? catalogMatch.category : (activeMode === 'add_emergency' ? 'emergency' : 'logistics');
                const itemRadius = catalogMatch?.defaultRadius;

                addSiteLogisticsItem({
                    projectId,
                    type,
                    name: itemName,
                    category: itemCategory,
                    position: [Number(point.x.toFixed(2)), 0, Number(point.z.toFixed(2))],
                    radius: itemRadius,
                    rotation: 0,
                    status: 'active',
                    notes: `Implantado no estaleiro em ${new Date().toLocaleDateString('pt-PT')}`
                });

                setActiveMode('navigate');
                setPendingPlacementType(null);
                showToast(`"${itemName}" posicionado no estaleiro com sucesso!`);
                return;
            }
        }

        // 4. Raycast on Building IFC Elements with High-Visibility 3D Selection Highlight
        if (bimGroupRef.current) {
            const intersects = raycasterRef.current.intersectObjects(bimGroupRef.current.children, true);
            if (intersects.length > 0) {
                const hit = intersects[0];
                const mesh = hit.object as THREE.Mesh;
                const point = hit.point;

                if (mesh.userData?.isIfcElement) {
                    // Restore previously selected mesh material
                    if (selectedMeshRef.current && selectedMeshRef.current !== mesh) {
                        if (selectedMeshRef.current.userData?.originalMaterial) {
                            selectedMeshRef.current.material = selectedMeshRef.current.userData.originalMaterial;
                        }
                    }

                    // Save original material
                    if (!mesh.userData.originalMaterial) {
                        mesh.userData.originalMaterial = mesh.material;
                    }

                    // Apply high-visibility cyan highlight material
                    const highlightMat = new THREE.MeshStandardMaterial({
                        color: 0x06b6d4, // Cyan-500
                        emissive: 0x0891b2,
                        emissiveIntensity: 0.65,
                        roughness: 0.25,
                        metalness: 0.2
                    });
                    mesh.material = highlightMat;
                    selectedMeshRef.current = mesh;

                    // Compute dimensions and volume
                    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
                    const bb = mesh.geometry.boundingBox;
                    const dimX = bb ? Number((bb.max.x - bb.min.x).toFixed(2)) : 0;
                    const dimY = bb ? Number((bb.max.y - bb.min.y).toFixed(2)) : 0;
                    const dimZ = bb ? Number((bb.max.z - bb.min.z).toFixed(2)) : 0;
                    const volume = dimX > 0 && dimY > 0 && dimZ > 0 ? Number((dimX * dimY * dimZ).toFixed(2)) : undefined;
                    const area = dimX > 0 && dimZ > 0 ? Number((dimX * dimZ).toFixed(2)) : undefined;

                    setSelectedElement({
                        ...mesh.userData,
                        dimensions: { width: dimX, height: dimY, length: dimZ },
                        volume,
                        area,
                        elevationY: Number(mesh.position.y.toFixed(2)),
                        centerPosition: [Number(point.x.toFixed(2)), Number(point.y.toFixed(2)), Number(point.z.toFixed(2))],
                        meshUuid: mesh.uuid
                    });
                    setActivePin(null);
                    setActiveLogisticsItem(null);
                    if (activeMode !== 'add_point') {
                        setLeftPanelTab('properties');
                        setIsLeftSidebarOpen(true);
                    }

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
                clearSelection();
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
            const activeCfg = (currentProject as any)?.cdeConfig;
            const res = await fetch(`/api/projects/${projectId}/cde/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'init_project_bim_structure',
                    payload: { cdeConfig: activeCfg }
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Erro ao comunicar com o CDE');
            }

            showToast('Estrutura de pastas BIM e 2D criada com sucesso na raiz do projeto!');
            alert('Pastas criadas com sucesso na raiz do projeto:\n📁 Modelos BIM (IFC)/\n   ├── 📁 01-Arquitetura/\n   ├── 📁 02-Estruturas/\n   └── 📁 03-Especialidades (MEP)/\n📁 Desenhos 2D (Plantas e Cortes)/');
            await loadRealCdeFiles();
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
                modelCenterRef.current = new THREE.Vector3(0, size.y / 2, 0);
                modelSizeRef.current = size.clone();
                cameraRef.current.position.set(maxDim * 1.3, maxDim * 0.9, maxDim * 1.4);
                controlsRef.current.target.set(0, size.y / 2, 0);
                controlsRef.current.maxDistance = maxDim * 8;
                controlsRef.current.update();
            }

            setLoadedIfcName(file.name);
            setCdeModels(prev => {
                const exists = prev.find(m => m.name === file.name);
                if (exists) return prev.map(m => m.name === file.name ? { ...m, active: true } : m);
                return [
                    {
                        id: `m_${Date.now()}`,
                        folder: 'Raiz do CDE',
                        name: file.name,
                        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
                        rev: 'Upload Local',
                        active: true,
                        discipline: 'architecture',
                        isRealCdeFile: true
                    },
                    ...prev
                ];
            });
            showToast(`Modelo IFC "${file.name}" carregado com sucesso (${loadedMeshesCount} elementos 3D).`);

            // Sincronização automática para a pasta CDE Cloud caso esteja ligado
            fetch(`/api/projects/${projectId}/cde`)
                .then(r => r.json())
                .then(data => {
                    if (data?.cdeConfig?.connected) {
                        uploadToCDEFolder(
                            { ...data.cdeConfig, projectId } as any,
                            'Modelos BIM (IFC)/01-Arquitetura',
                            file
                        ).then(() => {
                            showToast(`Ficheiro "${file.name}" sincronizado com sucesso na Cloud CDE.`);
                        }).catch(cdeErr => {
                            console.warn('[BIM CDE Sync warning]', cdeErr);
                        });
                    }
                }).catch(() => {});
        } catch (err: any) {
            console.error('Error loading IFC file:', err);
            alert(`Aviso ao carregar IFC: ${err.message || 'Ficheiro não reconhecido'}`);
        } finally {
            setIsLoadingModel(false);
            setLoadingMessage('');
        }
    };

    // Load IFC Model directly from connected CDE Cloud
    const handleLoadModelFromCde = async (model: CdeModelItem) => {
        setIsLoadingModel(true);
        setLoadingMessage(`A transferir "${model.name}" (${model.size}) do CDE Cloud...`);
        showToast(`A carregar modelo "${model.name}" diretamente do CDE...`);

        try {
            const targetId = model.cdeId || model.id;
            const res = await fetch(`/api/projects/${projectId}/cde/download?fileId=${encodeURIComponent(targetId)}&fileName=${encodeURIComponent(model.name)}`);
            
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Erro ao comunicar com a Cloud CDE.');
            }

            const blob = await res.blob();
            if (blob.size === 0) {
                throw new Error('Ficheiro recebido vazio do CDE.');
            }

            const file = new File([blob], model.name, { type: 'application/x-step' });
            await handleProcessIfcFile(file);

            // Mark this model as active in CDE models list
            setCdeModels(prev => prev.map(m => m.id === model.id ? { ...m, active: true } : m));
            showToast(`Modelo IFC "${model.name}" aberto diretamente do CDE!`);
        } catch (err: any) {
            console.error('Erro ao abrir modelo do CDE:', err);
            showToast(`Erro ao abrir do CDE: ${err.message || 'Verifique a ligação à Cloud'}`);
            alert(`Não foi possível carregar o modelo do CDE: ${err.message}`);
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

    // Filtered Site Logistics Catalog
    const filteredCatalog = useMemo(() => {
        return SITE_LOGISTICS_CATALOG.filter(item => {
            if (logisticsCategoryFilter !== 'all' && item.group !== logisticsCategoryFilter) return false;
            if (logisticsSearchQuery.trim()) {
                const q = logisticsSearchQuery.toLowerCase();
                return item.name.toLowerCase().includes(q) ||
                       item.subtitle.toLowerCase().includes(q) ||
                       item.description.toLowerCase().includes(q);
            }
            return true;
        });
    }, [logisticsCategoryFilter, logisticsSearchQuery]);

    // Icon helper for catalog
    const renderCatalogIcon = (iconName: string) => {
        switch (iconName) {
            case 'Crane': return <Building2 size={14} />;
            case 'Truck': return <Truck size={14} />;
            case 'ArrowUpFromLine': return <Layers size={14} />;
            case 'Building2': return <Building2 size={14} />;
            case 'Utensils': return <Utensils size={14} />;
            case 'Bath': return <Bath size={14} />;
            case 'ShieldCheck': return <ShieldCheck size={14} />;
            case 'Users': return <Users size={14} />;
            case 'HeartPulse': return <HeartPulse size={14} />;
            case 'Flame': return <Flame size={14} />;
            case 'BellRing': return <BellRing size={14} />;
            case 'Recycle': return <Recycle size={14} />;
            case 'Fuel': return <Fuel size={14} />;
            case 'Droplets': return <Droplets size={14} />;
            case 'Grid': return <Grid size={14} />;
            case 'Footprints': return <Footprints size={14} />;
            default: return <Navigation size={14} />;
        }
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
                : "h-[calc(100vh-125px)] min-h-[580px] rounded-2xl border border-slate-200 dark:border-neutral-800 shadow-sm"
        )}>
            {/* Top Sleek Revit/OpenProject-style Ribbon Toolbar */}
            <div className="bg-white/95 dark:bg-[#1e2023]/95 backdrop-blur-md border-b border-slate-200 dark:border-neutral-800 px-3 py-1.5 h-11 flex items-center justify-between gap-2 z-20 shrink-0">
                {/* Pinned Navegador BIM Button - SEMPRE À VISTA */}
                <div className="shrink-0 flex items-center pr-2 border-r border-slate-200 dark:border-neutral-800">
                    <button
                        onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
                        className={cn(
                            "h-7 px-2.5 rounded-md border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs",
                            isLeftSidebarOpen
                                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent"
                                : "bg-slate-50 hover:bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-neutral-700"
                        )}
                        title="Navegador BIM (CDE, Estaleiro e Pisos)"
                    >
                        <FolderTree size={14} strokeWidth={1.75} />
                        <span className="text-[11px] font-bold tracking-tight whitespace-nowrap">Navegador BIM</span>
                    </button>
                </div>

                {/* Middle Ribbon Groups (Compactos, Flat, Sem Scroll) */}
                <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                    {/* PROJEÇÃO 3D / 2D INTERATIVO */}
                    <div className="flex items-center bg-slate-100 dark:bg-neutral-800 p-0.5 rounded-lg border border-slate-200 dark:border-neutral-700 gap-0.5 h-7">
                        <button
                            type="button"
                            onClick={() => handleToggleViewDimension('3d')}
                            className={cn(
                                "h-6 px-2.5 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer",
                                viewDimension === '3d'
                                    ? "bg-blue-600 text-white shadow-xs"
                                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                            )}
                            title="Visualizar Modelo 3D"
                        >
                            <Box size={13} strokeWidth={2} />
                            <span>3D</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleToggleViewDimension('2d')}
                            className={cn(
                                "h-6 px-2.5 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer",
                                viewDimension === '2d'
                                    ? "bg-indigo-600 text-white shadow-xs"
                                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                            )}
                            title="Alternar diretamente para Planta Técnica Interativa 2D"
                        >
                            <Layers size={13} strokeWidth={2} />
                            <span>2D</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsNew2dModalOpen(true)}
                            className="h-6 px-2.5 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs ml-1"
                            title="Criar Novo Desenho 2D / Prancha Técnica a partir do Modelo 3D"
                        >
                            <Sparkles size={12} strokeWidth={2} />
                            <span>+ Novo 2D</span>
                        </button>
                    </div>

                    {/* NAVEGAÇÃO 3D: Orbitar vs Pan (Deslocamento) */}
                    {viewDimension === '3d' && (
                        <div className="flex items-center bg-slate-100 dark:bg-neutral-800 p-0.5 rounded-lg border border-slate-200 dark:border-neutral-700 gap-0.5 h-7">
                            <button
                                type="button"
                                onClick={() => setActiveMode('navigate')}
                                className={cn(
                                    "h-6 w-6 rounded-md flex items-center justify-center transition-all cursor-pointer",
                                    activeMode === 'navigate'
                                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs"
                                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                )}
                                title="Orbitar / Girar Modelo (Arrastar com botão esquerdo para rodar)"
                            >
                                <RotateCcw size={13} strokeWidth={2} />
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveMode(activeMode === 'pan' ? 'navigate' : 'pan')}
                                className={cn(
                                    "h-6 w-6 rounded-md flex items-center justify-center transition-all cursor-pointer",
                                    activeMode === 'pan'
                                        ? "bg-blue-600 text-white shadow-2xs"
                                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                )}
                                title="Pan / Deslocar Modelo (Arrastar com botão esquerdo para mover a vista)"
                            >
                                <Move size={13} strokeWidth={2} />
                            </button>
                        </div>
                    )}

                    {/* MODO DE PROJEÇÃO: Perspetiva vs Isométrica (Apenas Ícones) */}
                    {viewDimension === '3d' && (
                        <div className="flex items-center bg-slate-100 dark:bg-neutral-800 p-0.5 rounded-lg border border-slate-200 dark:border-neutral-700 gap-0.5 h-7">
                            <button
                                type="button"
                                onClick={() => handleToggleProjectionMode('perspective')}
                                className={cn(
                                    "h-6 w-6 rounded-md flex items-center justify-center transition-all cursor-pointer",
                                    projectionMode === 'perspective'
                                        ? "bg-blue-600 text-white shadow-2xs"
                                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                )}
                                title="Projeção em Perspetiva (vista natural com pontos de fuga)"
                            >
                                <Eye size={13} strokeWidth={2} />
                            </button>
                            <button
                                type="button"
                                onClick={() => handleToggleProjectionMode('isometric')}
                                className={cn(
                                    "h-6 w-6 rounded-md flex items-center justify-center transition-all cursor-pointer",
                                    projectionMode === 'isometric'
                                        ? "bg-indigo-600 text-white shadow-2xs"
                                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                )}
                                title="Projeção Isométrica / Ortográfica (linhas paralelas sem distorção)"
                            >
                                <Grid size={13} strokeWidth={2} />
                            </button>
                        </div>
                    )}

                    {/* VISTAS E ALÇADOS DO MODELO (Apenas Ícones Compactos) */}
                    {viewDimension === '3d' && (
                        <div className="flex items-center bg-slate-100 dark:bg-neutral-800 p-0.5 rounded-lg border border-slate-200 dark:border-neutral-700 gap-0.5 h-7">
                            <button
                                type="button"
                                onClick={() => handleSetViewOrientation('isometric')}
                                className={cn(
                                    "h-6 w-6 rounded-md flex items-center justify-center transition-all cursor-pointer",
                                    viewOrientation === 'isometric'
                                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs"
                                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                )}
                                title="3D Geral (Axonometria / Perspetiva)"
                            >
                                <Box size={13} strokeWidth={1.8} />
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSetViewOrientation('top')}
                                className={cn(
                                    "h-6 w-6 rounded-md flex items-center justify-center transition-all cursor-pointer",
                                    viewOrientation === 'top'
                                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs"
                                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                )}
                                title={projectionMode === 'isometric' ? "Topo (Planta 2D Ortográfica)" : "Topo (Planta Superior em Perspetiva)"}
                            >
                                <ArrowUp size={13} strokeWidth={2} />
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSetViewOrientation('front')}
                                className={cn(
                                    "h-6 w-6 rounded-md flex items-center justify-center transition-all cursor-pointer",
                                    viewOrientation === 'front'
                                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs"
                                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                )}
                                title={projectionMode === 'isometric' ? "Frente (Alçado Sul Ortográfico)" : "Frente (Alçado Sul em Perspetiva)"}
                            >
                                <ArrowDown size={13} strokeWidth={2} />
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSetViewOrientation('back')}
                                className={cn(
                                    "h-6 w-6 rounded-md flex items-center justify-center transition-all cursor-pointer",
                                    viewOrientation === 'back'
                                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs"
                                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                )}
                                title={projectionMode === 'isometric' ? "Trás (Alçado Norte Ortográfico)" : "Trás (Alçado Norte em Perspetiva)"}
                            >
                                <ArrowUpFromLine size={13} strokeWidth={2} />
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSetViewOrientation('right')}
                                className={cn(
                                    "h-6 w-6 rounded-md flex items-center justify-center transition-all cursor-pointer",
                                    viewOrientation === 'right'
                                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs"
                                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                )}
                                title={projectionMode === 'isometric' ? "Direita (Alçado Este Ortográfico)" : "Direita (Alçado Este em Perspetiva)"}
                            >
                                <ArrowRight size={13} strokeWidth={2} />
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSetViewOrientation('left')}
                                className={cn(
                                    "h-6 w-6 rounded-md flex items-center justify-center transition-all cursor-pointer",
                                    viewOrientation === 'left'
                                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs"
                                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                )}
                                title={projectionMode === 'isometric' ? "Esquerda (Alçado Oeste Ortográfico)" : "Esquerda (Alçado Oeste em Perspetiva)"}
                            >
                                <ArrowLeft size={13} strokeWidth={2} />
                            </button>
                        </div>
                    )}

                    {/* VER INTERIOR DO EDIFÍCIO: Modo Raio-X & Plano de Corte 3D */}
                    {viewDimension === '3d' && (
                        <div className="flex items-center bg-slate-100 dark:bg-neutral-800 p-0.5 rounded-lg border border-slate-200 dark:border-neutral-700 gap-0.5 h-7">
                            <button
                                type="button"
                                onClick={() => {
                                    const next = !isXRayMode;
                                    setIsXRayMode(next);
                                    showToast(next ? 'Modo Raio-X Ativado: paredes e lajes translúcidas para ver o interior' : 'Modo Raio-X Desativado');
                                }}
                                className={cn(
                                    "h-6 px-2 rounded-md flex items-center gap-1 transition-all cursor-pointer text-[11px] font-semibold",
                                    isXRayMode
                                        ? "bg-indigo-600 text-white shadow-2xs"
                                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                )}
                                title="Ver Interior (Modo Raio-X: fachadas e paredes translúcidas)"
                            >
                                <Eye size={12} strokeWidth={2} />
                                <span className="hidden sm:inline">Raio-X</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const next = !sectionCutActive;
                                    setSectionCutActive(next);
                                    showToast(next ? 'Plano de Corte 3D Ativado: use o slider para cortar pisos' : 'Plano de Corte Desativado');
                                }}
                                className={cn(
                                    "h-6 px-2 rounded-md flex items-center gap-1 transition-all cursor-pointer text-[11px] font-semibold",
                                    sectionCutActive
                                        ? "bg-amber-600 text-white shadow-2xs"
                                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                )}
                                title="Plano de Corte 3D Horizontal (Fatiar pisos para ver o interior)"
                            >
                                <Scissors size={12} strokeWidth={2} />
                                <span className="hidden sm:inline">Corte</span>
                            </button>
                        </div>
                    )}

                    {/* SIMULAÇÃO 4D (Player Temporal de Estaleiro & Construção como no 4DIFC) */}
                    <div className="flex items-center pl-1 border-l border-slate-200 dark:border-neutral-800">
                        <button
                            type="button"
                            onClick={() => {
                                const next = !is4dActive;
                                setIs4dActive(next);
                                showToast(next ? '⚡ Modo Simulação 4D Ativado! Use o player inferior.' : 'Modo 4D Desativado.');
                            }}
                            className={cn(
                                "h-7 px-2.5 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs border",
                                is4dActive
                                    ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                                    : "bg-white dark:bg-neutral-800 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 hover:bg-purple-50"
                            )}
                            title="Ativar/Desativar Player de Simulação 4D (Como no 4DIFC)"
                        >
                            <Calendar size={13} strokeWidth={2} />
                            <span>Simulação 4D</span>
                            {is4dActive && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping ml-0.5" />}
                        </button>
                    </div>

                    {/* CAMADAS: Droplist de Escolha */}
                    <div className="flex items-center">
                        <select
                            value={activeLayerPreset}
                            onChange={(e) => handleLayerPresetChange(e.target.value as any)}
                            className="bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-[11px] rounded-md px-2 py-0.5 font-semibold text-slate-700 dark:text-slate-200 outline-none cursor-pointer h-7 shadow-xs"
                            title="Filtrar visibilidade de camadas"
                        >
                            <option value="all">👁️ Todas as Camadas</option>
                            <option value="inspections">📍 Apenas Inspeções</option>
                            <option value="logistics">🏗️ Apenas Estaleiro</option>
                            <option value="emergency">🚨 Apenas Emergência</option>
                            <option value="clean">⚪ Ocultar Anotações</option>
                        </select>
                    </div>

                    {/* REGISTOS SST: Apenas Icons Flat */}
                    <div className="flex items-center gap-1 pl-1 border-l border-slate-200 dark:border-neutral-800">
                        <button
                            onClick={() => setActiveMode(activeMode === 'add_point' ? 'navigate' : 'add_point')}
                            className={cn(
                                "h-7 w-7 rounded-md flex items-center justify-center transition-all cursor-pointer border shadow-xs",
                                activeMode === 'add_point'
                                    ? "bg-red-600 text-white border-red-600 animate-pulse"
                                    : "bg-white dark:bg-neutral-800 text-red-600 border-slate-200 dark:border-neutral-700 hover:bg-red-50"
                            )}
                            title="Registar Ponto de Inspeção / Não Conformidade (+ Inspeção)"
                        >
                            <MapPin size={13} strokeWidth={2} />
                        </button>

                        <button
                            onClick={() => {
                                setLeftPanelTab('logistics');
                                setIsLeftSidebarOpen(true);
                                setActiveMode(activeMode === 'add_logistics' ? 'navigate' : 'add_logistics');
                            }}
                            className={cn(
                                "h-7 w-7 rounded-md flex items-center justify-center transition-all cursor-pointer border shadow-xs",
                                activeMode === 'add_logistics'
                                    ? "bg-amber-600 text-white border-amber-600 animate-pulse"
                                    : "bg-white dark:bg-neutral-800 text-amber-600 border-slate-200 dark:border-neutral-700 hover:bg-amber-50"
                            )}
                            title="Implantar Equipamento de Estaleiro / Emergência (+ Estaleiro)"
                        >
                            <HardHat size={13} strokeWidth={2} />
                        </button>
                    </div>

                    {/* EXPORTAR: Apenas os Botões Compactos */}
                    <div className="flex items-center gap-1 pl-1 border-l border-slate-200 dark:border-neutral-800">
                        <button
                            onClick={handleExportPDF}
                            className="h-7 px-2.5 bg-white dark:bg-neutral-800 hover:bg-slate-50 border border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-slate-200 rounded-md text-[11px] font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                            title="Exportar Relatório Oficial de Visita e Inspeções (PDF)"
                        >
                            <Download size={12} strokeWidth={1.75} />
                            <span>PDF Visita</span>
                        </button>

                        <button
                            onClick={handleExportSitePlanPDF}
                            className="h-7 px-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-md text-[11px] font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                            title="Exportar Planta Oficial de Estaleiro e Emergência (PSS)"
                        >
                            <FileText size={12} strokeWidth={1.75} className="text-emerald-600" />
                            <span>Planta PSS</span>
                        </button>
                    </div>
                </div>

                {/* Right Actions (Pinned) */}
                <div className="flex items-center gap-1.5 shrink-0 pl-2 border-l border-slate-200 dark:border-neutral-800 h-7">
                    <button
                        onClick={() => handleSetViewOrientation('isometric')}
                        className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 text-xs shadow-xs cursor-pointer"
                        title="Repor câmara para 3D Geral"
                    >
                        <RotateCcw size={13} strokeWidth={1.75} />
                    </button>

                    <button
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 text-xs shadow-xs cursor-pointer"
                        title={isFullscreen ? 'Sair de Ecrã Completo' : 'Ecrã Completo'}
                    >
                        {isFullscreen ? <Minimize2 size={13} strokeWidth={1.75} /> : <Maximize2 size={13} strokeWidth={1.75} />}
                    </button>

                    <button
                        onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
                        className={cn(
                            "h-7 px-2 rounded-md border text-xs font-semibold flex items-center gap-1 transition-colors shadow-xs cursor-pointer",
                            isRightSidebarOpen
                                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent"
                                : "bg-white text-slate-700 dark:bg-neutral-800 dark:text-slate-200 border-slate-200 dark:border-neutral-700 hover:bg-slate-50"
                        )}
                        title="Abrir/Fechar Painel de Inspeções"
                    >
                        <MapPin size={12} strokeWidth={1.75} />
                        <span className="text-[11px] font-bold">Inspeções ({filteredObservations.length})</span>
                        <ChevronRight className={cn("w-3.5 h-3.5 transition-transform", isRightSidebarOpen ? "" : "rotate-180")} />
                    </button>
                </div>
            </div>

            {/* Main OpenProject BIM Workspace (Left Panel + Center 3D/2D Viewport + Right BCF Panel) */}
            <div className="relative flex-1 w-full h-full flex overflow-hidden">
                {/* ZONE A: Left OpenProject BIM Panel (Collapsible) */}
                <div className={cn(
                    "h-full bg-white dark:bg-[#1a1b1e] border-r border-slate-200 dark:border-neutral-800 z-10 flex flex-col transition-all duration-300 ease-in-out shrink-0 shadow-lg select-none",
                    isLeftSidebarOpen ? "w-80" : "w-0 overflow-hidden border-none"
                )}>
                    {/* Left Panel Tabs: 4 Separadores com Apenas Ícones (CDE, Estaleiro, Piso, Propriedades) */}
                    <div className="grid grid-cols-4 border-b border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900 shrink-0">
                        <button
                            onClick={() => setLeftPanelTab('models')}
                            className={cn(
                                "py-2.5 text-center border-b-2 transition-all flex items-center justify-center cursor-pointer",
                                leftPanelTab === 'models'
                                    ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-[#1a1b1e]"
                                    : "border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                            )}
                            title="Modelos e Desenhos CDE"
                        >
                            <FolderTree size={18} strokeWidth={1.75} />
                        </button>
                        <button
                            onClick={() => setLeftPanelTab('logistics')}
                            className={cn(
                                "py-2.5 text-center border-b-2 transition-all flex items-center justify-center cursor-pointer",
                                leftPanelTab === 'logistics'
                                    ? "border-amber-600 text-amber-600 dark:text-amber-400 bg-white dark:bg-[#1a1b1e]"
                                    : "border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                            )}
                            title="Equipamentos e Estaleiro (Logística)"
                        >
                            <HardHat size={18} strokeWidth={1.75} />
                        </button>
                        <button
                            onClick={() => setLeftPanelTab('hierarchy')}
                            className={cn(
                                "py-2.5 text-center border-b-2 transition-all flex items-center justify-center cursor-pointer",
                                leftPanelTab === 'hierarchy'
                                    ? "border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-[#1a1b1e]"
                                    : "border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                            )}
                            title="Pisos e Níveis da Obra"
                        >
                            <Layers size={18} strokeWidth={1.75} />
                        </button>
                        <button
                            onClick={() => setLeftPanelTab('properties')}
                            className={cn(
                                "py-2.5 text-center border-b-2 transition-all flex items-center justify-center cursor-pointer relative",
                                leftPanelTab === 'properties'
                                    ? "border-purple-600 text-purple-600 dark:text-purple-400 bg-white dark:bg-[#1a1b1e]"
                                    : "border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                            )}
                            title="Propriedades da Seleção (Elemento, Ponto ou Equipamento)"
                        >
                            <Sliders size={18} strokeWidth={1.75} />
                            {(selectedElement || activePin || activeLogisticsItem) && (
                                <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
                            )}
                        </button>
                    </div>

                    {/* TOP HALF OF LEFT PANEL: Separator Content */}
                    <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4 text-xs">
                        {/* Tab 1 Content: CDE & Modelos Carregados */}
                        {leftPanelTab === 'models' && (
                            <div className="space-y-3">
                                {/* CDE Real Cloud Connection Status & Cloud Seeding */}
                                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 truncate">
                                            <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", cdeStatus.connected ? "bg-emerald-500 animate-pulse" : "bg-slate-400")} />
                                            <span className="font-bold text-[11px] text-slate-800 dark:text-slate-100 truncate">
                                                {cdeStatus.connected ? `CDE Conectado (${cdeStatus.provider?.toUpperCase()})` : 'CDE Local (Sem Cloud)'}
                                            </span>
                                        </div>
                                        <button
                                            onClick={loadRealCdeFiles}
                                            disabled={isSyncingCde}
                                            className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                                            title="Sincronizar ficheiros com o CDE em tempo real"
                                        >
                                            <RefreshCw size={11} className={cn(isSyncingCde ? "animate-spin" : "")} />
                                            <span>Sincronizar</span>
                                        </button>
                                    </div>

                                    {/* Auto-Load Base Model Setting Toggle */}
                                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/80 dark:border-neutral-800 text-[10px]">
                                        <button
                                            type="button"
                                            onClick={handleToggleAutoLoad}
                                            className={cn(
                                                "w-full flex items-center justify-between px-2 py-1 rounded cursor-pointer transition-colors font-medium shadow-2xs",
                                                autoLoadBaseModel
                                                    ? "text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100"
                                                    : "text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200"
                                            )}
                                            title="Ao entrar ou refrescar a obra, o modelo IFC base é carregado automaticamente no 3D"
                                        >
                                            <div className="flex items-center gap-1.5 truncate">
                                                <Zap size={11} className={autoLoadBaseModel ? "fill-amber-500 text-amber-500" : ""} />
                                                <span className="truncate">Carregamento automático do IFC</span>
                                            </div>
                                            <span className="font-bold uppercase text-[9px]">{autoLoadBaseModel ? 'Ativo' : 'Inativo'}</span>
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={handleCreateCdeFolders}
                                            disabled={isCreatingCdeFolders}
                                            className="w-full py-1 px-1.5 rounded-lg bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-[10px] font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1 cursor-pointer hover:bg-slate-50 transition-colors shadow-2xs"
                                            title="Criar estrutura oficial de pastas BIM e 2D no CDE"
                                        >
                                            {isCreatingCdeFolders ? <Loader2 size={11} className="animate-spin" /> : <FolderPlus size={11} />}
                                            <span>+ Criar Pastas no CDE</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Empty state if CDE is connected but has no IFCs discovered yet */}
                                {cdeStatus.connected && cdeModels.length === 0 && !isSyncingCde && (
                                    <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-[11px] space-y-1.5">
                                        <div className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                                            <Info size={13} className="shrink-0 text-amber-600" />
                                            <span>Nenhum ficheiro .ifc na pasta da obra</span>
                                        </div>
                                        <p className="text-[10px] text-slate-600 dark:text-slate-300 leading-snug">
                                            O CDE está ligado à sua pasta na cloud. Para visualizar o seu edifício aqui, coloque o seu ficheiro <strong>.ifc</strong> na pasta e prima <strong>Sincronizar</strong>.
                                        </p>
                                    </div>
                                )}

                                {/* CDE Root Folders Explorer with selectable models */}
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                                            <FolderTree size={14} className="text-blue-600" strokeWidth={1.75} />
                                            Modelos no CDE (Raiz do Projeto)
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-semibold">{cdeModels.length} IFCs</span>
                                    </div>

                                    <div className="p-2 bg-slate-50 dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-800 space-y-2">
                                        {/* BIM Root Folder */}
                                        <div>
                                            <button
                                                type="button"
                                                onClick={() => setExpandedFolders(p => ({ ...p, bim_root: !p.bim_root }))}
                                                className="w-full flex items-center justify-between font-bold text-slate-900 dark:text-slate-100 hover:text-blue-600 py-1 cursor-pointer"
                                            >
                                                <div className="flex items-center gap-1.5 truncate">
                                                    <ChevronRight size={13} className={cn("transition-transform text-slate-400", expandedFolders.bim_root ? "rotate-90" : "")} />
                                                    <FolderOpen size={14} className="text-amber-500" strokeWidth={1.75} />
                                                    <span className="text-[11px] truncate">Modelos BIM (IFC)</span>
                                                </div>
                                                <span className="text-[9px] bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full font-bold">
                                                    {cdeModels.length}
                                                </span>
                                            </button>

                                            {expandedFolders.bim_root && (
                                                <div className="pl-3.5 space-y-2 mt-1 border-l-2 border-slate-200 dark:border-neutral-700 ml-2">
                                                    {cdeModels.length === 0 ? (
                                                        <div className="text-[10px] text-slate-400 italic py-1">
                                                            Sem ficheiros .ifc carregados no CDE.
                                                        </div>
                                                    ) : (
                                                        Array.from(new Set(cdeModels.map(m => m.folder || 'Raiz do CDE'))).map(folderName => {
                                                            const folderModels = cdeModels.filter(m => (m.folder || 'Raiz do CDE') === folderName);
                                                            const isExp = expandedFolders[folderName] ?? true;
                                                            return (
                                                                <div key={folderName} className="space-y-1">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setExpandedFolders(p => ({ ...p, [folderName]: !p[folderName] }))}
                                                                        className="w-full flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 py-0.5 cursor-pointer"
                                                                    >
                                                                        <div className="flex items-center gap-1.5 truncate">
                                                                            <ChevronRight size={11} className={cn("transition-transform text-slate-400", isExp ? "rotate-90" : "")} />
                                                                            <FolderOpen size={12} className="text-amber-600" />
                                                                            <span className="truncate">{folderName}</span>
                                                                        </div>
                                                                        <span className="text-[9px] text-slate-400">({folderModels.length})</span>
                                                                    </button>

                                                                    {isExp && (
                                                                        <div className="pl-3 space-y-1.5 mt-0.5">
                                                                            {folderModels.map(model => {
                                                                                const isBaseModel = model.id === baseModelId || (!baseModelId && cdeModels[0]?.id === model.id);
                                                                                return (
                                                                                    <div
                                                                                        key={model.id}
                                                                                        onClick={() => handleLoadModelFromCde(model)}
                                                                                        className={cn(
                                                                                            "p-2 rounded-lg border text-[11px] transition-all cursor-pointer flex flex-col gap-1.5",
                                                                                            model.active
                                                                                                ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700 text-blue-950 dark:text-blue-100 shadow-2xs"
                                                                                                : "bg-white dark:bg-neutral-800/60 border-slate-200 dark:border-neutral-700 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                                                                                        )}
                                                                                    >
                                                                                        <div className="flex items-center justify-between gap-1.5">
                                                                                            <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
                                                                                                <Box size={13} className="text-blue-600 dark:text-blue-400 shrink-0" />
                                                                                                <span className="font-bold truncate text-[11px] text-slate-900 dark:text-slate-100" title={model.name}>
                                                                                                    {model.name}
                                                                                                </span>
                                                                                            </div>
                                                                                            <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded shrink-0 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                                                                                CDE Real
                                                                                            </span>
                                                                                        </div>

                                                                                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                                                                                            <div className="flex items-center gap-1.5 truncate">
                                                                                                <span>{model.size} • {model.rev}</span>
                                                                                                {isBaseModel && (
                                                                                                    <span className="text-[8px] font-bold text-amber-700 dark:text-amber-300 flex items-center gap-0.5 bg-amber-50 dark:bg-amber-950/60 px-1 py-0.2 rounded border border-amber-300 dark:border-amber-800" title="Modelo IFC Base carregado automaticamente ao entrar">
                                                                                                        <Star size={9} className="fill-amber-500 text-amber-500" />
                                                                                                        <span>Base</span>
                                                                                                    </span>
                                                                                                )}
                                                                                            </div>

                                                                                            <div className="flex items-center gap-1 shrink-0">
                                                                                                <button
                                                                                                    type="button"
                                                                                                    onClick={(e) => {
                                                                                                        e.stopPropagation();
                                                                                                        handleSetBaseModel(model);
                                                                                                    }}
                                                                                                    className={cn(
                                                                                                        "p-1 rounded cursor-pointer transition-colors",
                                                                                                        isBaseModel
                                                                                                            ? "text-amber-500 hover:text-amber-600 bg-amber-50 dark:bg-amber-950"
                                                                                                            : "text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-neutral-700"
                                                                                                    )}
                                                                                                    title={isBaseModel ? "Modelo Base atual (carrega automaticamente)" : "Definir como Modelo Base (carrega automaticamente ao entrar na obra)"}
                                                                                                >
                                                                                                    <Star size={11} className={isBaseModel ? "fill-amber-500 text-amber-500" : ""} />
                                                                                                </button>
                                                                                                <button
                                                                                                    type="button"
                                                                                                    onClick={(e) => {
                                                                                                        e.stopPropagation();
                                                                                                        handleLoadModelFromCde(model);
                                                                                                    }}
                                                                                                    className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
                                                                                                    title="Descarregar e carregar este modelo IFC diretamente da Cloud no visualizador 3D"
                                                                                                >
                                                                                                    <Download size={10} />
                                                                                                    <span>Carregar no 3D</span>
                                                                                                </button>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* 2D Drawings Folder (Plantas em PDF) */}
                                        <div className="pt-1 border-t border-slate-200 dark:border-neutral-800">
                                            <button
                                                type="button"
                                                onClick={() => setExpandedFolders(p => ({ ...p, drawings_root: !p.drawings_root }))}
                                                className="w-full flex items-center justify-between font-bold text-slate-900 dark:text-slate-100 hover:text-blue-600 py-1 cursor-pointer"
                                            >
                                                <div className="flex items-center gap-1.5 truncate">
                                                    <ChevronRight size={13} className={cn("transition-transform text-slate-400", expandedFolders.drawings_root ? "rotate-90" : "")} />
                                                    <FolderOpen size={14} className="text-blue-500" strokeWidth={1.75} />
                                                    <span className="text-[11px] truncate">Desenhos 2D (Plantas)</span>
                                                </div>
                                                <span className="text-[9px] bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 px-1.5 py-0.5 rounded-full font-bold">
                                                    {cdeDrawings.length}
                                                </span>
                                            </button>

                                            {expandedFolders.drawings_root && (
                                                <div className="pl-3.5 space-y-1.5 mt-1 border-l-2 border-slate-200 dark:border-neutral-700 ml-2">
                                                    {cdeDrawings.length === 0 ? (
                                                        <div className="p-2.5 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-dashed border-blue-200 dark:border-blue-800 text-center space-y-2">
                                                            <p className="text-[10px] text-slate-600 dark:text-slate-300">
                                                                Nenhum desenho 2D no CDE. Pode gerar plantas técnicas diretamente a partir do modelo 3D IFC.
                                                            </p>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleGenerate2dDrawingFromModel()}
                                                                disabled={isGenerating2dPlan}
                                                                className="w-full py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[10px] font-bold flex items-center justify-center gap-1 shadow-xs cursor-pointer transition-colors"
                                                            >
                                                                {isGenerating2dPlan ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                                                                <span>⚡ Gerar Planta 2D do Modelo</span>
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            {cdeDrawings.map(dw => {
                                                                const isSelected = selected2dDrawing?.id === dw.id && viewDimension === '2d';
                                                                return (
                                                                    <div
                                                                        key={dw.id}
                                                                        onClick={() => {
                                                                            setSelected2dDrawing(dw);
                                                                            setViewDimension('2d');
                                                                            setDrawingViewMode('pdf');
                                                                            showToast(`Desenho "${dw.code} - ${dw.title}" aberto em PDF.`);
                                                                        }}
                                                                        className={cn(
                                                                            "p-2 rounded-lg border text-[11px] transition-all cursor-pointer flex flex-col gap-1.5",
                                                                            isSelected
                                                                                ? "bg-blue-50/90 border-blue-500 text-blue-950 font-bold dark:bg-blue-950/70 dark:border-blue-600 dark:text-blue-100 shadow-2xs ring-1 ring-blue-500/20"
                                                                                : "bg-white dark:bg-neutral-800/60 border-slate-200 dark:border-neutral-700 hover:border-slate-300 dark:hover:border-neutral-600"
                                                                        )}
                                                                    >
                                                                        <div className="flex items-start justify-between gap-1.5">
                                                                            <div className="truncate flex-1 min-w-0">
                                                                                <div className="font-semibold truncate flex items-center gap-1.5">
                                                                                    <FileText size={12} className={isSelected ? "text-blue-600 dark:text-blue-400 shrink-0" : "text-slate-400 shrink-0"} />
                                                                                    <span className="text-blue-600 dark:text-blue-400 font-bold">{dw.code}</span>
                                                                                    <span className="truncate">{dw.title}</span>
                                                                                </div>
                                                                                <div className="text-[9px] text-slate-400 truncate pl-4.5">{dw.storey} • {dw.format}</div>
                                                                            </div>
                                                                            {dw.isRealCdeFile ? (
                                                                                <span className="text-[8px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-1 py-0.5 rounded font-bold uppercase tracking-wider shrink-0">
                                                                                    CDE Cloud
                                                                                </span>
                                                                            ) : (
                                                                                <span className="text-[8px] bg-slate-100 text-slate-500 dark:bg-neutral-800 dark:text-neutral-400 px-1 py-0.5 rounded font-medium uppercase tracking-wider shrink-0">
                                                                                    Exemplo
                                                                                </span>
                                                                            )}
                                                                        </div>

                                                                        {/* Quick Action Buttons: Ver PDF vs Anotar */}
                                                                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-neutral-750 text-[10px]">
                                                                            <span className="text-[9px] text-slate-400 font-mono">{dw.revision}</span>
                                                                            <div className="flex items-center gap-1">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setSelected2dDrawing(dw);
                                                                                        setViewDimension('2d');
                                                                                        setDrawingViewMode('pdf');
                                                                                        showToast(`A visualizar PDF de "${dw.code}" no ecrã central.`);
                                                                                    }}
                                                                                    className={cn(
                                                                                        "px-2 py-0.5 rounded font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs",
                                                                                        isSelected && drawingViewMode === 'pdf'
                                                                                            ? "bg-blue-600 text-white"
                                                                                            : "bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                                                                                    )}
                                                                                    title="Visualizar documento PDF oficial"
                                                                                >
                                                                                    <FileText size={10} />
                                                                                    <span>Ver PDF</span>
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setSelected2dDrawing(dw);
                                                                                        setViewDimension('2d');
                                                                                        setDrawingViewMode('interactive');
                                                                                        showToast(`Prancha interativa de "${dw.code}" ativada.`);
                                                                                    }}
                                                                                    className={cn(
                                                                                        "px-2 py-0.5 rounded font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs",
                                                                                        isSelected && drawingViewMode === 'interactive'
                                                                                            ? "bg-amber-600 text-white"
                                                                                            : "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-neutral-800 dark:text-slate-300"
                                                                                    )}
                                                                                    title="Abrir prancha interativa de estaleiro para anotações e equipamentos"
                                                                                >
                                                                                    <Layers size={10} />
                                                                                    <span>Anotar</span>
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                            <button
                                                                type="button"
                                                                onClick={() => handleGenerate2dDrawingFromModel()}
                                                                disabled={isGenerating2dPlan}
                                                                className="w-full py-1.5 px-2 mt-1 rounded-lg border border-dashed border-blue-300 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-[10px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                                                title="Gerar nova planta 2D técnica a partir do modelo 3D"
                                                            >
                                                                {isGenerating2dPlan ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                                                                <span>+ Gerar Planta 2D do Modelo</span>
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Disciplinas Ativas (Filtro Federado) */}
                                <div>
                                    <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1.5 text-xs">
                                        Filtro de Disciplinas Federadas
                                    </span>
                                    <div className="space-y-1 bg-slate-50 dark:bg-neutral-900 p-2 rounded-xl border border-slate-200 dark:border-neutral-800">
                                        <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                                            <input
                                                type="checkbox"
                                                checked={selectedDiscipline === 'all' || selectedDiscipline === 'structure'}
                                                onChange={() => setSelectedDiscipline(selectedDiscipline === 'structure' ? 'all' : 'structure')}
                                                className="rounded text-blue-600"
                                            />
                                            <span className="font-medium text-slate-700 dark:text-slate-200">🏗️ Estruturas (Betão Armado)</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                                            <input
                                                type="checkbox"
                                                checked={selectedDiscipline === 'all' || selectedDiscipline === 'architecture'}
                                                onChange={() => setSelectedDiscipline(selectedDiscipline === 'architecture' ? 'all' : 'architecture')}
                                                className="rounded text-blue-600"
                                            />
                                            <span className="font-medium text-slate-700 dark:text-slate-200">📐 Arquitetura (Paredes, Vãos)</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                                            <input
                                                type="checkbox"
                                                checked={selectedDiscipline === 'all' || selectedDiscipline === 'mep'}
                                                onChange={() => setSelectedDiscipline(selectedDiscipline === 'mep' ? 'all' : 'mep')}
                                                className="rounded text-blue-600"
                                            />
                                            <span className="font-medium text-slate-700 dark:text-slate-200">⚙️ MEP (Redes & Condutas)</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Upload Direto Local */}
                                <div>
                                    <label className="p-3 rounded-xl border border-dashed border-blue-300 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 transition-colors">
                                        <Upload size={18} className="text-blue-600 mb-1" strokeWidth={1.75} />
                                        <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                                            {loadedIfcName ? `Ativo: ${loadedIfcName.slice(0, 16)}...` : 'Carregar Modelo IFC (.ifc)'}
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

                        {/* Tab 2 Content: Catálogo Completo de Estaleiro & Emergência (ISO 7010 / PSS) */}
                        {leftPanelTab === 'logistics' && (
                            <div className="space-y-3">
                                {/* Search input */}
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Pesquisar equipamento (Grua, Contentor, ISO)..."
                                        value={logisticsSearchQuery}
                                        onChange={e => setLogisticsSearchQuery(e.target.value)}
                                        className="w-full pl-8 pr-2.5 py-1 text-[11px] bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-lg outline-none focus:border-amber-500"
                                    />
                                </div>

                                {/* Category Filters */}
                                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
                                    {[
                                        { id: 'all', label: 'Todos' },
                                        { id: 'lifting', label: 'Cargas' },
                                        { id: 'facilities', label: 'Apoio' },
                                        { id: 'safety', label: 'Emergência' },
                                        { id: 'environment', label: 'Ambiente' },
                                        { id: 'collective', label: 'Proteções' }
                                    ].map(cat => (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => setLogisticsCategoryFilter(cat.id)}
                                            className={cn(
                                                "px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 cursor-pointer transition-all",
                                                logisticsCategoryFilter === cat.id
                                                    ? "bg-amber-600 text-white shadow-2xs"
                                                    : "bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                                            )}
                                        >
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Catalog List with Google Fonts / Flat Material Icons */}
                                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                                    {filteredCatalog.map(item => (
                                        <button
                                            key={item.id}
                                            onClick={() => {
                                                setPendingPlacementType(item.type as any);
                                                setActiveMode(item.category === 'emergency' ? 'add_emergency' : 'add_logistics');
                                                showToast(`Clique no modelo ou planta para posicionar "${item.name}".`);
                                            }}
                                            className="w-full p-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900/60 hover:border-amber-500 hover:bg-amber-50/30 text-left transition-all cursor-pointer flex items-center justify-between gap-2 shadow-2xs group"
                                        >
                                            <div className="flex items-center gap-2 truncate">
                                                <div
                                                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-white shadow-xs"
                                                    style={{ backgroundColor: item.color }}
                                                >
                                                    {renderCatalogIcon(item.icon)}
                                                </div>
                                                <div className="truncate">
                                                    <div className="font-bold text-[11px] text-slate-800 dark:text-slate-100 truncate group-hover:text-amber-700 dark:group-hover:text-amber-400">
                                                        {item.name}
                                                    </div>
                                                    <div className="text-[9px] text-slate-400 truncate">{item.subtitle}</div>
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                + Implantar
                                            </span>
                                        </button>
                                    ))}
                                </div>

                                {/* Inventory of Placed Elements in Project */}
                                <div className="pt-2 border-t border-slate-200 dark:border-neutral-800">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                                            Inventário no Estaleiro ({projectLogistics.length})
                                        </span>
                                        <button
                                            onClick={handleExportSitePlanPDF}
                                            className="text-[10px] text-emerald-600 font-bold hover:underline cursor-pointer"
                                        >
                                            Exportar PSS &rarr;
                                        </button>
                                    </div>

                                    <div className="space-y-1.5 max-h-32 overflow-y-auto pr-0.5">
                                        {projectLogistics.length === 0 ? (
                                            <div className="text-[10px] text-slate-400 italic py-1">Nenhum elemento implantado ainda.</div>
                                        ) : (
                                            projectLogistics.map(item => (
                                                <div
                                                    key={item.id}
                                                    onClick={() => {
                                                        setActiveLogisticsItem(item);
                                                        setSelectedElement(null);
                                                        setActivePin(null);
                                                    }}
                                                    className={cn(
                                                        "p-1.5 rounded-lg border text-[11px] flex items-center justify-between gap-2 cursor-pointer transition-all",
                                                        activeLogisticsItem?.id === item.id
                                                            ? "bg-amber-50 border-amber-400 text-amber-900 font-bold dark:bg-amber-950/40 dark:border-amber-700 dark:text-amber-300"
                                                            : "bg-slate-50 dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 hover:border-slate-300"
                                                    )}
                                                >
                                                    <div className="truncate">
                                                        <span className="font-bold text-slate-800 dark:text-slate-100">{item.name}</span>
                                                        <div className="text-[9px] text-slate-400">[{item.position.join(', ')}]</div>
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActiveLogisticsItem(item);
                                                                setActiveMode('moving_logistics');
                                                                showToast(`Clique na nova posição para deslocar "${item.name}".`);
                                                            }}
                                                            className="text-amber-600 hover:text-amber-800 p-1 cursor-pointer"
                                                            title="Deslocar no modelo"
                                                        >
                                                            <Move size={12} strokeWidth={2} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                deleteSiteLogisticsItem(item.id);
                                                                if (activeLogisticsItem?.id === item.id) setActiveLogisticsItem(null);
                                                                showToast('Elemento removido.');
                                                            }}
                                                            className="text-red-400 hover:text-red-600 p-1 cursor-pointer"
                                                            title="Remover do estaleiro"
                                                        >
                                                            <Trash2 size={12} strokeWidth={1.75} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tab 3 Content: Pisos & Espaços */}
                        {leftPanelTab === 'hierarchy' && (
                            <div className="space-y-3">
                                <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                                    Isolar Nível / Piso
                                </span>
                                <div className="space-y-1">
                                    {['all', 'Piso 0', 'Piso 1', 'Piso 2', 'Cobertura', 'Exterior'].map(st => (
                                        <button
                                            key={st}
                                            onClick={() => setSelectedStorey(st)}
                                            className={cn(
                                                "w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer",
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

                        {/* Tab 4 Content: Propriedades da Seleção (Elemento, Ponto de Inspeção ou Equipamento de Estaleiro) */}
                        {leftPanelTab === 'properties' && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-neutral-800">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-neutral-300 flex items-center gap-1.5">
                                        <Sliders size={14} strokeWidth={1.75} className="text-purple-600" />
                                        Propriedades da Seleção
                                    </span>
                                    {(selectedElement || activePin || activeLogisticsItem) && (
                                        <button
                                            onClick={clearSelection}
                                            className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-0.5 cursor-pointer"
                                        >
                                            <X size={12} strokeWidth={1.75} />
                                            <span>Limpar</span>
                                        </button>
                                    )}
                                </div>

                                {selectedElement ? (
                                    <div className="space-y-3">
                                        <div className="flex items-start justify-between gap-1.5">
                                            <span className="font-bold text-slate-900 dark:text-white text-xs leading-tight">
                                                {selectedElement.elementName}
                                            </span>
                                            <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 shrink-0">
                                                {selectedElement.category || 'IFC'}
                                            </span>
                                        </div>

                                        {/* Status visual de destaque no 3D */}
                                        <div className="flex items-center gap-1.5 text-[10px] text-cyan-700 dark:text-cyan-300 font-semibold bg-cyan-50 dark:bg-cyan-950/40 px-2 py-1 rounded-lg border border-cyan-200 dark:border-cyan-800">
                                            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse shrink-0" />
                                            <span>Elemento Realçado a Cyan no Modelo 3D</span>
                                        </div>

                                        {/* Metadados e Localização IFC */}
                                        <div className="space-y-1.5 bg-slate-50 dark:bg-neutral-900 p-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 text-[11px] text-slate-600 dark:text-slate-300">
                                            <div className="flex justify-between items-center pb-1 border-b border-slate-200 dark:border-neutral-800">
                                                <span className="text-slate-400">Entidade:</span>
                                                <strong className="text-slate-800 dark:text-slate-100 font-mono text-[10px]">{selectedElement.category ? `Ifc${selectedElement.category}` : 'IfcBuildingElement'}</strong>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-400">Piso / Nível:</span>
                                                <strong className="text-slate-800 dark:text-slate-100">{selectedElement.storey}</strong>
                                            </div>
                                            {selectedElement.elevationY !== undefined && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-400">Cota de Elevação (Y):</span>
                                                    <strong className="font-mono text-slate-800 dark:text-slate-100">{selectedElement.elevationY} m</strong>
                                                </div>
                                            )}
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-400">Disciplina:</span>
                                                <strong className="uppercase text-blue-600 font-bold">{selectedElement.discipline || 'Estrutura'}</strong>
                                            </div>
                                            <div className="pt-1 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-between">
                                                <span className="text-slate-400">GUID:</span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (selectedElement.ifcGlobalId) {
                                                            navigator.clipboard.writeText(selectedElement.ifcGlobalId);
                                                            setCopiedGuid(true);
                                                            setTimeout(() => setCopiedGuid(false), 2000);
                                                        }
                                                    }}
                                                    className="font-mono text-[10px] text-slate-700 dark:text-slate-200 hover:text-blue-600 flex items-center gap-1 cursor-pointer"
                                                    title="Copiar GUID para a área de transferência"
                                                >
                                                    <Copy size={11} />
                                                    <span className="truncate max-w-[120px]">{selectedElement.ifcGlobalId}</span>
                                                    {copiedGuid && <span className="text-emerald-600 font-bold text-[9px]">(Copiado!)</span>}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Geometria e Dimensões 3D */}
                                        {selectedElement.dimensions && (
                                            <div className="space-y-1 bg-slate-50 dark:bg-neutral-900 p-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 text-[11px] text-slate-600 dark:text-slate-300">
                                                <div className="font-bold text-[10px] uppercase tracking-wider text-slate-400 pb-1">Geometria do Elemento</div>
                                                <div className="grid grid-cols-2 gap-1 text-[10px]">
                                                    <div>Dimensões (L×C×A): <strong className="font-mono text-slate-800 dark:text-slate-100">{selectedElement.dimensions.width}×{selectedElement.dimensions.length}×{selectedElement.dimensions.height}m</strong></div>
                                                    {selectedElement.volume && <div>Volume: <strong className="font-mono text-slate-800 dark:text-slate-100">{selectedElement.volume} m³</strong></div>}
                                                    {selectedElement.area && <div>Área Base: <strong className="font-mono text-slate-800 dark:text-slate-100">{selectedElement.area} m²</strong></div>}
                                                    {selectedElement.centerPosition && <div className="col-span-2 text-slate-400">Centro: <span className="font-mono text-[9px]">[{selectedElement.centerPosition.join(', ')}]</span></div>}
                                                </div>
                                            </div>
                                        )}

                                        {/* Requisitos Legais & Prevenção SST (DL 273/2003) */}
                                        <div className="bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800/60 text-[11px] space-y-1 text-amber-900 dark:text-amber-200">
                                            <div className="font-bold text-[10px] uppercase flex items-center gap-1 text-amber-800 dark:text-amber-300">
                                                <ShieldCheck size={12} />
                                                <span>Segurança do Trabalho (DL 273/2003)</span>
                                            </div>
                                            <p className="text-[10px] leading-relaxed text-amber-800 dark:text-amber-300/90">
                                                {selectedElement.category === 'Slab'
                                                    ? 'Risco de queda em altura na bordadura ou vãos da laje. Exige proteção coletiva periférica EN 13374 Classe A/B.'
                                                    : selectedElement.category === 'Wall'
                                                    ? 'Risco de entalamento e queda de cargas durante descofragem e betonagem.'
                                                    : selectedElement.category === 'Column' || selectedElement.category === 'Beam'
                                                    ? 'Risco de queda de objetos em suspensão durante elevação e betonagem vertical.'
                                                    : 'Verificar estabilidade provisória, acessos e equipamentos de proteção coletiva.'}
                                            </p>
                                        </div>

                                        {/* Botões de Ação Direta */}
                                        <div className="space-y-1.5 pt-1">
                                            <button
                                                type="button"
                                                onClick={() => flyToElement(selectedElement)}
                                                className="w-full py-1.5 px-3 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                            >
                                                <Eye size={13} strokeWidth={1.75} />
                                                <span>Focar Câmara no Elemento</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setActiveMode('add_point');
                                                    setPendingPinData({
                                                        position: selectedElement.centerPosition || [0, 2, 0],
                                                        cameraPosition: [10, 10, 10],
                                                        cameraTarget: selectedElement.centerPosition || [0, 2, 0],
                                                        ifcGlobalId: selectedElement.ifcGlobalId,
                                                        elementName: selectedElement.elementName,
                                                        storeyName: selectedElement.storey,
                                                        discipline: selectedElement.discipline
                                                    });
                                                    setFormTitle(`Inspeção: ${selectedElement.elementName}`);
                                                    setFormDesc('');
                                                    setFormCategory('safety_non_compliance');
                                                    setFormSeverity('high');
                                                    setFormCompanyId(companies[0]?.id || '');
                                                    setFormPhoto('');
                                                    setIsCreateModalOpen(true);
                                                }}
                                                className="w-full py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                                            >
                                                <MapPin size={13} strokeWidth={1.75} />
                                                <span>+ Registar Não Conformidade SST</span>
                                            </button>
                                        </div>
                                    </div>
                                ) : activePin ? (
                                    <div className="space-y-3">
                                        <div className="flex items-start justify-between gap-1.5">
                                            <span className="font-bold text-slate-900 dark:text-white text-xs">
                                                {activePin.title}
                                            </span>
                                            <span className={cn(
                                                "text-[9px] uppercase font-bold px-1.5 py-0.5 rounded shrink-0",
                                                activePin.severity === 'critical' ? "bg-red-100 text-red-700" :
                                                activePin.severity === 'high' ? "bg-orange-100 text-orange-700" :
                                                "bg-slate-100 text-slate-600"
                                            )}>
                                                {activePin.severity}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-600 dark:text-slate-300">
                                            {activePin.description}
                                        </p>
                                        <div className="text-[10px] text-slate-400 bg-slate-50 dark:bg-neutral-900 p-2 rounded-lg border border-slate-200 dark:border-neutral-800">
                                            📍 {activePin.storeyName} • {activePin.elementName}
                                        </div>
                                        <button
                                            onClick={() => flyToObservation(activePin)}
                                            className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                                        >
                                            <Eye size={13} strokeWidth={1.75} />
                                            <span>Focar no Modelo 3D</span>
                                        </button>
                                    </div>
                                ) : activeLogisticsItem ? (
                                    <div className="space-y-3">
                                        <div className="flex items-start justify-between gap-1.5">
                                            <span className="font-bold text-slate-900 dark:text-white text-xs leading-tight">
                                                {activeLogisticsItem.name}
                                            </span>
                                            <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 shrink-0">
                                                {activeLogisticsItem.category}
                                            </span>
                                        </div>
                                        <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1 bg-slate-50 dark:bg-neutral-900 p-2.5 rounded-xl border border-slate-200 dark:border-neutral-800">
                                            <div>Tipo: <strong>{activeLogisticsItem.type}</strong></div>
                                            <div>Posição: <strong className="font-mono text-slate-800 dark:text-slate-100">[{activeLogisticsItem.position.join(', ')}]</strong></div>
                                            <div>Rotação: <strong className="font-mono">{Math.round(((activeLogisticsItem.rotation || 0) * 180) / Math.PI)}°</strong></div>
                                            {activeLogisticsItem.radius && <div>Raio de Lança: <strong>{activeLogisticsItem.radius}m</strong></div>}
                                        </div>

                                        {/* Action: Deslocar / Mover no Modelo */}
                                        <button
                                            onClick={() => {
                                                setActiveMode(activeMode === 'moving_logistics' ? 'navigate' : 'moving_logistics');
                                                showToast('Modo Deslocação: clique na nova posição do modelo ou planta.');
                                            }}
                                            className={cn(
                                                "w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer",
                                                activeMode === 'moving_logistics'
                                                    ? "bg-amber-600 text-white animate-pulse"
                                                    : "bg-amber-500 hover:bg-amber-600 text-white"
                                            )}
                                        >
                                            <Move size={13} strokeWidth={2} />
                                            <span>{activeMode === 'moving_logistics' ? 'Clique no Local Desejado...' : 'Deslocar Elemento (Mover)'}</span>
                                        </button>

                                        {/* Fine Tuning Nudge Buttons */}
                                        <div className="bg-slate-50 dark:bg-neutral-900 p-2 rounded-xl border border-slate-200 dark:border-neutral-800 space-y-1.5">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Ajuste Fino de Posição</div>
                                            <div className="grid grid-cols-4 gap-1.5">
                                                <button
                                                    onClick={() => handleNudgeLogisticsItem(-1, 0)}
                                                    className="py-1 px-1 bg-white hover:bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-slate-200 rounded text-[11px] font-bold"
                                                    title="Deslocar -1m no Eixo X"
                                                >
                                                    ← X
                                                </button>
                                                <button
                                                    onClick={() => handleNudgeLogisticsItem(1, 0)}
                                                    className="py-1 px-1 bg-white hover:bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-slate-200 rounded text-[11px] font-bold"
                                                    title="Deslocar +1m no Eixo X"
                                                >
                                                    X →
                                                </button>
                                                <button
                                                    onClick={() => handleNudgeLogisticsItem(0, -1)}
                                                    className="py-1 px-1 bg-white hover:bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-slate-200 rounded text-[11px] font-bold"
                                                    title="Deslocar -1m no Eixo Z"
                                                >
                                                    ↑ Z
                                                </button>
                                                <button
                                                    onClick={() => handleNudgeLogisticsItem(0, 1)}
                                                    className="py-1 px-1 bg-white hover:bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-slate-200 rounded text-[11px] font-bold"
                                                    title="Deslocar +1m no Eixo Z"
                                                >
                                                    ↓ Z
                                                </button>
                                            </div>
                                            <button
                                                onClick={handleRotateLogisticsItem}
                                                className="w-full py-1 px-1 bg-white hover:bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-slate-200 rounded text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer"
                                                title="Rodar 45 graus"
                                            >
                                                <RotateCcw size={11} />
                                                <span>Rodar +45°</span>
                                            </button>
                                        </div>

                                        <button
                                            onClick={() => {
                                                deleteSiteLogisticsItem(activeLogisticsItem.id);
                                                setActiveLogisticsItem(null);
                                                showToast('Elemento removido do estaleiro.');
                                            }}
                                            className="w-full py-1.5 px-3 border border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                                        >
                                            <Trash2 size={12} strokeWidth={1.75} />
                                            <span>Remover do Estaleiro</span>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="h-48 flex flex-col items-center justify-center text-center text-slate-400 dark:text-neutral-500 py-6">
                                        <Box size={28} className="stroke-[1.5] mb-2 opacity-60 text-slate-400" />
                                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            Nenhum elemento selecionado
                                        </span>
                                        <p className="text-[11px] text-slate-400 dark:text-neutral-500 max-w-[220px] mt-1 leading-normal">
                                            Clique num elemento 3D, ponto ou equipamento no modelo para ver aqui as propriedades.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
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
                    {/* 4D Construction Simulation Player Bar */}
                    {is4dActive && (
                        <Bim4dSimulationPlayer
                            tasks={projectTasks}
                            logisticsItems={siteLogisticsItems?.filter(l => l.projectId === projectId) || []}
                            workZones={siteWorkZones?.filter(z => z.projectId === projectId) || []}
                            currentDate={simDate}
                            onDateChange={(d) => setSimDate(d)}
                            showFuture={show4dFutureGhost}
                            onToggleShowFuture={(sh) => setShow4dFutureGhost(sh)}
                            activeTaskCount={projectTasks.filter(t => t.startDate && t.endDate && t.startDate <= simDate && t.endDate >= simDate).length}
                        />
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

                    {/* Mode Notice Overlay */}
                    {activeMode === 'add_point' && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-4 py-2 bg-red-600 text-white text-xs font-semibold rounded-full shadow-lg flex items-center gap-2 animate-pulse pointer-events-none">
                            <MapPin size={15} />
                            Clique no modelo 3D ou na planta 2D para posicionar a inspeção
                        </div>
                    )}

                    {(activeMode === 'add_logistics' || activeMode === 'add_emergency') && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-4 py-2 bg-amber-600 text-white text-xs font-semibold rounded-full shadow-lg flex items-center gap-2 animate-pulse pointer-events-none">
                            <HardHat size={15} />
                            Clique na planta ou no chão para posicionar o equipamento
                        </div>
                    )}

                    {activeMode === 'moving_logistics' && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-4 py-2 bg-amber-600 text-white text-xs font-semibold rounded-full shadow-lg flex items-center gap-2 animate-pulse pointer-events-none">
                            <Move size={15} />
                            Clique na nova posição (3D ou na planta 2D) para deslocar o elemento
                        </div>
                    )}

                    {/* Pan Notice Overlay */}
                    {activeMode === 'pan' && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-full shadow-lg flex items-center gap-2 pointer-events-none">
                            <Move size={14} />
                            Modo Pan Ativo: arraste com o botão esquerdo para deslocar a vista
                        </div>
                    )}

                    {/* Floating Section Cut Height Slider */}
                    {sectionCutActive && viewDimension === '3d' && (
                        <div className="absolute top-4 right-4 z-30 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md p-2.5 rounded-xl border border-amber-300 dark:border-amber-700 shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                                <Scissors size={14} />
                                <span>Corte 3D:</span>
                                <span className="font-mono text-slate-900 dark:text-white font-bold">{sectionCutHeight}m</span>
                            </div>
                            <input
                                type="range"
                                min={modelHeightRange.min}
                                max={modelHeightRange.max}
                                step={0.5}
                                value={sectionCutHeight}
                                onChange={(e) => setSectionCutHeight(Number(e.target.value))}
                                className="w-36 h-1.5 bg-slate-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-amber-600"
                                title="Deslize para cortar a altura do modelo"
                            />
                            <button
                                onClick={() => setSectionCutActive(false)}
                                className="h-5 w-5 rounded flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
                                title="Fechar corte 3D"
                            >
                                <X size={13} />
                            </button>
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

                    {/* DUAL-MODE VIEWPORT: 2D TECHNICAL DRAWING SHEET (PRANCHA TÉCNICA) VS 3D WEBGL MODEL */}
                    {viewDimension === '2d' && (selected2dDrawing || active2dDrawing) && (() => {
                        const dw = (selected2dDrawing || active2dDrawing)!;
                        return (
                        <div className="absolute inset-0 z-20 flex flex-col bg-slate-200/90 dark:bg-[#121316] select-none overflow-hidden">
                            {/* Sheet Toolbar */}
                            <div className="h-12 px-3 bg-white/95 dark:bg-neutral-900/95 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between shrink-0 shadow-2xs z-20 gap-2">
                                {/* Left Section: Back to 3D and Drawing Identity */}
                                <div className="flex items-center gap-2 truncate">
                                    <button
                                        type="button"
                                        onClick={() => handleToggleViewDimension('3d')}
                                        className="h-8 px-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all shrink-0"
                                        title="Voltar ao modelo 3D em perspetiva"
                                    >
                                        <Box size={14} />
                                        <span>← Voltar ao 3D</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setIsNew2dModalOpen(true)}
                                        className="h-8 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all shrink-0"
                                        title="Configurar e Gerar Novo Desenho 2D do Modelo"
                                    >
                                        <Sparkles size={13} />
                                        <span>+ Novo Desenho 2D</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setIs2dDrawingsModalOpen(true)}
                                        className="h-8 px-2.5 bg-white dark:bg-neutral-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-neutral-700 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all shrink-0"
                                        title="Ver e Selecionar Outras Plantas 2D do CDE"
                                    >
                                        <FileText size={13} />
                                        <span>Pranchas CDE ({cdeDrawings.length})</span>
                                    </button>

                                    <div className="h-5 w-px bg-slate-200 dark:bg-neutral-700 shrink-0 mx-1" />

                                    <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800 shrink-0 font-mono">
                                        {dw.code}
                                    </span>
                                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate max-w-[200px] sm:max-w-xs md:max-w-sm">
                                        {dw.title}
                                    </span>
                                    {dw.isRealCdeFile ? (
                                        <span className="text-[9px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.5 rounded-full font-bold uppercase shrink-0 border border-emerald-300 dark:border-emerald-800">
                                            ☁️ CDE Real
                                        </span>
                                    ) : (
                                        <span className="text-[9px] bg-slate-100 text-slate-500 dark:bg-neutral-800 dark:text-neutral-400 px-1.5 py-0.5 rounded-full font-medium uppercase shrink-0">
                                            Exemplo
                                        </span>
                                    )}
                                </div>

                                {/* Right Section: View Mode Tabs & Actions */}
                                <div className="flex items-center gap-2 shrink-0">
                                    {/* Clear Segmented Switcher */}
                                    <div className="flex items-center bg-slate-100 dark:bg-neutral-800 p-1 rounded-lg border border-slate-200 dark:border-neutral-700 gap-1">
                                        <button
                                            type="button"
                                            onClick={() => setDrawingViewMode('pdf')}
                                            className={cn(
                                                "px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer",
                                                drawingViewMode === 'pdf'
                                                    ? "bg-white dark:bg-neutral-900 text-blue-600 dark:text-blue-400 shadow-xs font-bold"
                                                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                            )}
                                            title="Visualizar o Documento PDF oficial arquivado no CDE"
                                        >
                                            <FileText size={13} />
                                            <span>Documento PDF</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDrawingViewMode('interactive')}
                                            className={cn(
                                                "px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer",
                                                drawingViewMode === 'interactive'
                                                    ? "bg-white dark:bg-neutral-900 text-amber-600 dark:text-amber-400 shadow-xs font-bold"
                                                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                            )}
                                            title="Prancha vetorial para posicionar gruas, equipamentos e anotar inspeções"
                                        >
                                            <Layers size={13} />
                                            <span>Folha de Estaleiro & Anotações</span>
                                        </button>
                                    </div>

                                    {/* Zoom controls (only in interactive mode) */}
                                    {drawingViewMode === 'interactive' && (
                                        <div className="flex items-center border border-slate-200 dark:border-neutral-700 rounded-lg p-0.5 bg-slate-50 dark:bg-neutral-800">
                                            <button
                                                onClick={() => setSheetZoom(z => Math.max(0.6, z - 0.15))}
                                                className="h-7 w-7 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 cursor-pointer"
                                                title="Diminuir Zoom"
                                            >
                                                <ZoomOut size={13} />
                                            </button>
                                            <span className="text-[10px] font-mono px-1 font-semibold">{Math.round(sheetZoom * 100)}%</span>
                                            <button
                                                onClick={() => setSheetZoom(z => Math.min(2.2, z + 0.15))}
                                                className="h-7 w-7 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 cursor-pointer"
                                                title="Aumentar Zoom"
                                            >
                                                <ZoomIn size={13} />
                                            </button>
                                            <button
                                                onClick={() => setSheetZoom(1)}
                                                className="px-1.5 text-[10px] text-slate-500 hover:text-slate-800 cursor-pointer font-bold"
                                                title="Repor Zoom Original"
                                            >
                                                100%
                                            </button>
                                        </div>
                                    )}

                                    <button
                                        onClick={() => handleOpenAuthenticPdf(dw)}
                                        disabled={isGeneratingPdf}
                                        className="h-8 px-2.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                                        title="Descarregar o ficheiro PDF diretamente"
                                    >
                                        <Download size={13} strokeWidth={2} />
                                        <span className="hidden sm:inline">Descarregar</span>
                                    </button>
                                </div>
                            </div>

                            {/* Informational Sub-Bar explaining the current active 2D mode */}
                            {drawingViewMode === 'pdf' ? (
                                <div className="h-8 px-3 bg-blue-50/80 dark:bg-blue-950/40 border-b border-blue-200 dark:border-blue-900/60 flex items-center justify-between text-[11px] text-blue-900 dark:text-blue-200 shrink-0">
                                    <div className="flex items-center gap-1.5 truncate">
                                        <FileText size={13} className="text-blue-600 dark:text-blue-400 shrink-0" />
                                        <span className="truncate">
                                            <strong>Documento PDF Oficial ({dw.fileName}):</strong> Visualização fiel do ficheiro do projeto.
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setDrawingViewMode('interactive')}
                                        className="text-blue-700 dark:text-blue-300 font-bold hover:underline shrink-0 ml-2 cursor-pointer flex items-center gap-1"
                                    >
                                        <span>Mudar para Anotações / Estaleiro &rarr;</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="h-8 px-3 bg-amber-50/80 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 flex items-center justify-between text-[11px] text-amber-900 dark:text-amber-200 shrink-0">
                                    <div className="flex items-center gap-1.5 truncate">
                                        <Layers size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
                                        <span className="truncate">
                                            <strong>Folha de Estaleiro & Anotações:</strong> Clique na planta para marcar inspeções ou posicionar gruas/equipamentos.
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setDrawingViewMode('pdf')}
                                        className="text-amber-800 dark:text-amber-300 font-bold hover:underline shrink-0 ml-2 cursor-pointer flex items-center gap-1"
                                    >
                                        <span>Ver Documento PDF Original &rarr;</span>
                                    </button>
                                </div>
                            )}

                            {/* Viewport Content: Either Native PDF Iframe or Interactive Vector Sheet */}
                            {drawingViewMode === 'pdf' ? (
                                <div className="flex-1 w-full h-full p-3 bg-slate-300/80 dark:bg-neutral-950 flex flex-col items-center justify-center overflow-hidden">
                                    {currentPdfUrl ? (
                                        <div className="w-full h-full flex flex-col bg-white dark:bg-neutral-900 rounded-lg shadow-xl border border-slate-300 dark:border-neutral-800 overflow-hidden">
                                            <iframe
                                                src={currentPdfUrl}
                                                title={dw.title}
                                                className="w-full h-full border-none"
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center text-slate-600 dark:text-slate-300 py-12">
                                            <Loader2 size={24} className="animate-spin text-blue-600 mb-2" />
                                            <span className="text-xs font-semibold">A carregar prancha técnica PDF de {dw.code}...</span>
                                        </div>
                                    )}
                                </div>
                                                        ) : (
                                <Bim2dSafetyEditor
                                    projectId={projectId}
                                    projectName={currentProject.name}
                                    storey={dw.storey || selectedStorey}
                                    activeDrawing={dw}
                                    logisticsItems={projectLogistics}
                                    workZones={projectWorkZones}
                                    onAddLogisticsItem={addSiteLogisticsItem}
                                    onDeleteLogisticsItem={deleteSiteLogisticsItem}
                                    onAddWorkZone={addSiteWorkZone}
                                    onDeleteWorkZone={deleteSiteWorkZone}
                                    currentPdfUrl={currentPdfUrl}
                                    showToast={showToast}
                                />
                            )}
                        </div>
                        );
                    })()}

                    {/* Fallback Viewport if 2D Mode is selected but no 2D Drawing exists */}
                    {viewDimension === '2d' && !active2dDrawing && (
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-100/95 dark:bg-neutral-900/95 backdrop-blur-xs p-6 text-center select-none">
                            <div className="max-w-md p-6 bg-white dark:bg-neutral-800 rounded-2xl border border-slate-200 dark:border-neutral-700 shadow-xl flex flex-col items-center">
                                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
                                    <FileText size={24} />
                                </div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                                    Sem Plantas 2D no CDE
                                </h3>
                                <p className="text-xs text-slate-600 dark:text-slate-300 mb-5 leading-relaxed">
                                    Não foram detetadas pranchas técnicas 2D (ficheiros PDF) na pasta CDE desta obra. A aplicação pode <strong>gerar uma planta técnica 2D vetorial de imediato</strong> a partir do modelo 3D IFC carregado.
                                </p>
                                <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
                                    <button
                                        type="button"
                                        onClick={() => handleGenerate2dDrawingFromModel()}
                                        disabled={isGenerating2dPlan}
                                        className="w-full sm:flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                                    >
                                        {isGenerating2dPlan ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                        <span>⚡ Gerar Planta 2D do Modelo 3D</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            handleToggleViewDimension('3d');
                                            handleToggleProjectionMode('isometric');
                                            handleSetViewOrientation('top');
                                        }}
                                        className="w-full sm:w-auto py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                                        title="Ver planta ortográfica diretamente no modelo 3D"
                                    >
                                        📐 Planta no 3D
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Floating Standard Views & Projection Control Pill when in 3D */}
                    {viewDimension === '3d' && (
                        <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md px-2.5 py-1 rounded-xl border border-slate-200/80 dark:border-neutral-800 shadow-md">
                            {/* Projection Mode (Persp vs Iso) */}
                            <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-neutral-800 p-0.5 rounded-lg border border-slate-200 dark:border-neutral-700">
                                <button
                                    type="button"
                                    onClick={() => handleToggleProjectionMode('perspective')}
                                    className={cn(
                                        "px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer",
                                        projectionMode === 'perspective' ? "bg-blue-600 text-white shadow-2xs" : "hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-700 dark:text-slate-200"
                                    )}
                                    title="Projeção em Perspetiva (vista natural com pontos de fuga)"
                                >
                                    Persp
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleToggleProjectionMode('isometric')}
                                    className={cn(
                                        "px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer",
                                        projectionMode === 'isometric' ? "bg-indigo-600 text-white shadow-2xs" : "hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-700 dark:text-slate-200"
                                    )}
                                    title="Projeção Isométrica / Ortográfica (linhas paralelas sem distorção)"
                                >
                                    Iso
                                </button>
                            </div>

                            <div className="h-4 w-px bg-slate-300 dark:bg-neutral-700" />

                            {/* View Orientations (3D Geral, Topo, Frente, Trás, Dir, Esq) */}
                            <div className="flex items-center gap-0.5">
                                <button
                                    type="button"
                                    onClick={() => handleSetViewOrientation('isometric')}
                                    className={cn(
                                        "px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer",
                                        viewOrientation === 'isometric' ? "bg-slate-800 text-white dark:bg-white dark:text-slate-900" : "hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-700 dark:text-slate-300"
                                    )}
                                    title="3D Geral"
                                >
                                    3D
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSetViewOrientation('top')}
                                    className={cn(
                                        "px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer",
                                        viewOrientation === 'top' ? "bg-slate-800 text-white dark:bg-white dark:text-slate-900" : "hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-700 dark:text-slate-300"
                                    )}
                                    title={projectionMode === 'isometric' ? "Planta 2D Ortográfica CAD (Topo)" : "Planta Superior (Topo em Perspetiva)"}
                                >
                                    Topo
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSetViewOrientation('front')}
                                    className={cn(
                                        "px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer",
                                        viewOrientation === 'front' ? "bg-slate-800 text-white dark:bg-white dark:text-slate-900" : "hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-700 dark:text-slate-300"
                                    )}
                                    title={projectionMode === 'isometric' ? "Alçado Sul Ortográfico (Frente)" : "Alçado Frente (Sul em Perspetiva)"}
                                >
                                    Frente
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSetViewOrientation('back')}
                                    className={cn(
                                        "px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer",
                                        viewOrientation === 'back' ? "bg-slate-800 text-white dark:bg-white dark:text-slate-900" : "hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-700 dark:text-slate-300"
                                    )}
                                    title={projectionMode === 'isometric' ? "Alçado Norte Ortográfico (Trás)" : "Alçado Trás (Norte em Perspetiva)"}
                                >
                                    Trás
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSetViewOrientation('right')}
                                    className={cn(
                                        "px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer",
                                        viewOrientation === 'right' ? "bg-slate-800 text-white dark:bg-white dark:text-slate-900" : "hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-700 dark:text-slate-300"
                                    )}
                                    title={projectionMode === 'isometric' ? "Alçado Este Ortográfico (Direita)" : "Alçado Direita (Este em Perspetiva)"}
                                >
                                    Dir
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSetViewOrientation('left')}
                                    className={cn(
                                        "px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer",
                                        viewOrientation === 'left' ? "bg-slate-800 text-white dark:bg-white dark:text-slate-900" : "hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-700 dark:text-slate-300"
                                    )}
                                    title={projectionMode === 'isometric' ? "Alçado Oeste Ortográfico (Esquerda)" : "Alçado Esquerda (Oeste em Perspetiva)"}
                                >
                                    Esq
                                </button>
                            </div>
                        </div>
                    )}

                    {/* 3D WebGL Canvas - Permanent mount to prevent WebGL context loss */}
                    <div
                        ref={mountRef}
                        onClick={handleCanvasClick}
                        className={cn(
                            "w-full h-full",
                            activeMode === 'pan' ? 'cursor-grab active:cursor-grabbing' :
                            activeMode === 'navigate' ? 'cursor-default' : 'cursor-crosshair',
                            viewDimension === '2d' ? 'invisible pointer-events-none' : ''
                        )}
                    />
                </div>

                {/* ZONE C: Right OpenProject BIM BCF Issues Panel (Mesma largura do painel esquerdo: w-80) */}
                <div className={cn(
                    "h-full bg-white dark:bg-[#1a1b1e] border-l border-slate-200 dark:border-neutral-800 z-10 flex flex-col transition-all duration-300 ease-in-out shrink-0 shadow-lg",
                    isRightSidebarOpen ? "w-80" : "w-0 overflow-hidden border-none"
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

            {/* Modal: Configurar Novo Desenho 2D / Prancha Técnica (IFC -> CAD & PDF) */}
            {isNew2dModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
                    <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-neutral-800 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="p-4 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/40">
                            <div className="flex items-center gap-2.5">
                                <Sparkles size={20} className="text-emerald-600" />
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                        Novo Desenho 2D / Prancha Técnica do Modelo
                                    </h3>
                                    <p className="text-[11px] text-slate-500">
                                        Geração calibrada de plantas CAD e PDF com corte regulamentar a +1,20m e opções de fundo
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsNew2dModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Body Form */}
                        <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
                            {/* Identificação */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-2">
                                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Título do Desenho / Peça Desenhada
                                    </label>
                                    <input
                                        type="text"
                                        value={newDrawingTitle}
                                        onChange={(e) => setNewDrawingTitle(e.target.value)}
                                        className="w-full px-3 py-1.5 border border-slate-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 font-medium"
                                        placeholder="Ex: Planta de Estaleiro e Segurança - Piso 0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Código da Peça
                                    </label>
                                    <input
                                        type="text"
                                        value={newDrawingCode}
                                        onChange={(e) => setNewDrawingCode(e.target.value)}
                                        className="w-full px-3 py-1.5 border border-slate-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 font-mono font-bold"
                                        placeholder="Ex: PE-01"
                                    />
                                </div>
                            </div>

                            {/* Vista do Modelo 3D */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Vista do Modelo 3D a Projetar
                                </label>
                                <select
                                    value={newDrawingViewOrientation}
                                    onChange={(e) => setNewDrawingViewOrientation(e.target.value as ViewOrientation)}
                                    className="w-full px-3 py-1.5 border border-slate-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 font-semibold"
                                >
                                    <option value="top">📐 Planta / Topo (Planta do Piso com Corte Horizontal)</option>
                                    <option value="front">🏛️ Alçado Sul (Frente)</option>
                                    <option value="back">🏛️ Alçado Norte (Trás)</option>
                                    <option value="right">🏛️ Alçado Este (Direita)</option>
                                    <option value="left">🏛️ Alçado Oeste (Esquerda)</option>
                                    <option value="isometric">🧊 Vista Isométrica / Axonométrica</option>
                                </select>
                            </div>

                            {/* Piso e Cota de Corte Regulamentar (+1,20m) */}
                            <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-neutral-800/60 rounded-xl border border-slate-200 dark:border-neutral-700">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                                        Piso / Nível
                                    </label>
                                    <select
                                        value={newDrawingStorey}
                                        onChange={(e) => {
                                            const st = e.target.value;
                                            setNewDrawingStorey(st);
                                            setNewDrawingTitle(`Planta de Estaleiro e Segurança - ${st}`);
                                            const ref = st === 'Piso 1' ? 3.3 : st === 'Piso 2' ? 6.6 : st === 'Cobertura' ? 9.9 : 0.0;
                                            setNewDrawingRefElevation(ref);
                                        }}
                                        className="w-full px-2 py-1 border border-slate-200 dark:border-neutral-700 rounded bg-white dark:bg-neutral-800 font-bold"
                                    >
                                        <option value="Piso 0">Piso 0 (R/C)</option>
                                        <option value="Piso 1">Piso 1</option>
                                        <option value="Piso 2">Piso 2</option>
                                        <option value="Cobertura">Cobertura</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                                        Cota do Piso (Y ref)
                                    </label>
                                    <div className="flex items-center">
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={newDrawingRefElevation}
                                            onChange={(e) => setNewDrawingRefElevation(Number(e.target.value))}
                                            className="w-full px-2 py-1 border border-slate-200 dark:border-neutral-700 rounded bg-white dark:bg-neutral-800 font-mono"
                                        />
                                        <span className="ml-1 text-[10px] text-slate-400">m</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-emerald-700 dark:text-emerald-400 mb-1">
                                        Cota de Corte (+1,20m)
                                    </label>
                                    <div className="flex items-center">
                                        <input
                                            type="number"
                                            step="0.05"
                                            value={newDrawingCotaCorteOffset}
                                            onChange={(e) => setNewDrawingCotaCorteOffset(Number(e.target.value))}
                                            className="w-full px-2 py-1 border border-emerald-300 dark:border-emerald-700 rounded bg-emerald-50 dark:bg-emerald-950 font-mono font-bold text-emerald-800 dark:text-emerald-200"
                                        />
                                        <span className="ml-1 text-[10px] text-slate-400">m</span>
                                    </div>
                                </div>
                                <div className="col-span-3 text-[10px] text-slate-500 dark:text-slate-400 italic">
                                    💡 Norma de desenho técnico: os cortes horizontais de planta são realizados a <strong>1,20m acima do piso de referência</strong> para seccionar paredes, portas e janelas mantendo os peitoris visíveis.
                                </div>
                            </div>

                            {/* Formato da Folha, Escala e Estilo */}
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Tamanho da Folha
                                    </label>
                                    <select
                                        value={newDrawingFormat}
                                        onChange={(e) => setNewDrawingFormat(e.target.value as any)}
                                        className="w-full px-2 py-1.5 border border-slate-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 uppercase font-bold"
                                    >
                                        <option value="a4">A4 (297×210 mm)</option>
                                        <option value="a3">A3 (420×297 mm) [Padrão]</option>
                                        <option value="a2">A2 (594×420 mm)</option>
                                        <option value="a1">A1 (841×594 mm)</option>
                                        <option value="a0">A0 (1189×841 mm)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Escala Técnica
                                    </label>
                                    <select
                                        value={newDrawingScale}
                                        onChange={(e) => setNewDrawingScale(e.target.value as any)}
                                        className="w-full px-2 py-1.5 border border-slate-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 font-bold"
                                    >
                                        <option value="1:50">Escala 1:50 (Pormenor)</option>
                                        <option value="1:100">Escala 1:100 (Estaleiro Padrão)</option>
                                        <option value="1:200">Escala 1:200 (Implantação)</option>
                                        <option value="1:500">Escala 1:500 (Conjunto)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Estilo do Desenho
                                    </label>
                                    <select
                                        value={newDrawingStyle}
                                        onChange={(e) => setNewDrawingStyle(e.target.value as any)}
                                        className="w-full px-2 py-1.5 border border-slate-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 font-semibold"
                                    >
                                        <option value="cad">📐 Tipo Planta CAD (Vetorial P&B)</option>
                                        <option value="shaded">🎨 Modelo Sombreado (IFC Shaded)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Planta PDF de Fundo de Referência (Opcional) */}
                            <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800/60 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 font-bold text-[11px] text-amber-900 dark:text-amber-200">
                                        <FileUp size={14} className="text-amber-600" />
                                        <span>Planta de Fundo de Referência (Opcional)</span>
                                    </div>
                                    {newDrawingUnderlayUrl && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setNewDrawingUnderlayUrl(null);
                                                setNewDrawingUnderlayFileName(null);
                                            }}
                                            className="text-[10px] text-red-600 hover:underline cursor-pointer"
                                        >
                                            Remover Fundo
                                        </button>
                                    )}
                                </div>
                                <p className="text-[10px] text-amber-800/80 dark:text-amber-300/80 leading-relaxed">
                                    Pode carregar uma planta PDF ou imagem de projeto existente para colocar no fundo. Posteriormente, no editor 2D, poderá ajustar a escala, deslocamento, rotação ou ocultar/tirar o fundo.
                                </p>
                                {newDrawingUnderlayFileName ? (
                                    <div className="flex items-center gap-2 bg-white dark:bg-neutral-800 px-2.5 py-1.5 rounded-lg border border-amber-300 text-[11px] text-slate-700 dark:text-slate-200">
                                        <Check size={13} className="text-emerald-600" />
                                        <span className="truncate font-semibold">{newDrawingUnderlayFileName}</span>
                                    </div>
                                ) : (
                                    <input
                                        type="file"
                                        accept=".pdf,image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            const reader = new FileReader();
                                            reader.onload = (ev) => {
                                                setNewDrawingUnderlayUrl(ev.target?.result as string);
                                                setNewDrawingUnderlayFileName(file.name);
                                            };
                                            reader.readAsDataURL(file);
                                        }}
                                        className="text-[11px] file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[10px] file:font-bold file:bg-amber-600 file:text-white cursor-pointer"
                                    />
                                )}
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-4 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-end gap-2 bg-slate-50 dark:bg-neutral-900">
                            <button
                                type="button"
                                onClick={() => setIsNew2dModalOpen(false)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-neutral-800 cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    setIsNew2dModalOpen(false);
                                    await handleGenerate2dDrawingFromModel({
                                        title: newDrawingTitle,
                                        code: newDrawingCode,
                                        format: newDrawingFormat,
                                        orientation: newDrawingOrientation,
                                        viewOrientation: newDrawingViewOrientation,
                                        scale: newDrawingScale,
                                        style: newDrawingStyle,
                                        storey: newDrawingStorey,
                                        referenceElevation: newDrawingRefElevation,
                                        cotaCorteOffset: newDrawingCotaCorteOffset,
                                        underlayUrl: newDrawingUnderlayUrl,
                                        underlayFileName: newDrawingUnderlayFileName
                                    });
                                }}
                                disabled={isGenerating2dPlan}
                                className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                                {isGenerating2dPlan ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                                <span>Gerar Prancha 2D (Guardar no CDE)</span>
                            </button>
                        </div>
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
                                {cdeDrawings.map(drawing => (
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
                                {cdeDrawings.length} desenhos técnicos arquivados no projeto.
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
