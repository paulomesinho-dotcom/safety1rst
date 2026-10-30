'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useStore } from '@/store/useStore';
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
    Building2,
    Calendar,
    User,
    Check,
    Search,
    ChevronRight,
    HelpCircle,
    Info,
    ExternalLink
} from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { SiteObservation } from '@/types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Pre-defined seed observations for realism when a project opens for the first time
const SEED_OBSERVATIONS: Omit<SiteObservation, 'id' | 'createdAt'>[] = [
    {
        projectId: 'proj_1',
        title: 'Falta de guarda-corpos na bordadura norte do Piso 2',
        description: 'Vão exterior aberto sem proteção coletiva periférica. Risco iminente de queda em altura. Notificado encarregado da cofragem.',
        category: 'safety_non_compliance',
        status: 'open',
        severity: 'critical',
        ifcGlobalId: '2O2Dwx$hn8Zwcx7qDF01AB',
        elementName: 'Laje Estrutural Piso 2',
        storeyName: 'Piso 2',
        position: [-6, 6.2, 4],
        cameraPosition: [-12, 10, 10],
        cameraTarget: [-6, 6.2, 4],
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
        elementName: 'Pilar P-04 (Betão Armado)',
        storeyName: 'Piso 1',
        position: [4, 3.1, -4],
        cameraPosition: [8, 6, -1],
        cameraTarget: [4, 3.1, -4],
        photos: ['https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=600&auto=format&fit=crop&q=80'],
        assignedToCompanyId: 'c2',
        createdByName: 'Técnico de Segurança'
    },
    {
        projectId: 'proj_1',
        title: 'Inspeção de armadura de vigas aprovada',
        description: 'Verificação da bitola e espaçamento dos estribos no vão V-12 em conformidade com o projeto de estabilidade.',
        category: 'quality_check',
        status: 'resolved',
        severity: 'low',
        ifcGlobalId: '1X9yZab34CdeFghiJklMno',
        elementName: 'Viga Periférica V-12',
        storeyName: 'Piso 1',
        position: [0, 3.2, 5.5],
        cameraPosition: [0, 6, 12],
        cameraTarget: [0, 3.2, 5.5],
        photos: ['https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&auto=format&fit=crop&q=80'],
        assignedToCompanyId: 'c5',
        resolvedAt: new Date().toISOString(),
        resolvedBy: 'Fiscal de Obra',
        createdByName: 'Direção de Fiscalização'
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

    // Canvas container ref
    const mountRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const bimGroupRef = useRef<THREE.Group | null>(null);
    const pinsGroupRef = useRef<THREE.Group | null>(null);
    const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
    const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());

    // UI States
    const [activeMode, setActiveMode] = useState<'navigate' | 'add_point'>('navigate');
    const [selectedStorey, setSelectedStorey] = useState<string>('all');
    const [selectedElement, setSelectedElement] = useState<any | null>(null);
    const [activePin, setActivePin] = useState<SiteObservation | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [searchFilter, setSearchFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

    // Modal state for creating a new observation
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [pendingPinData, setPendingPinData] = useState<{
        position: [number, number, number];
        cameraPosition: [number, number, number];
        cameraTarget: [number, number, number];
        ifcGlobalId: string;
        elementName: string;
        storeyName: string;
    } | null>(null);

    const [formTitle, setFormTitle] = useState('');
    const [formDesc, setFormDesc] = useState('');
    const [formCategory, setFormCategory] = useState<SiteObservation['category']>('visit_observation');
    const [formSeverity, setFormSeverity] = useState<SiteObservation['severity']>('medium');
    const [formCompanyId, setFormCompanyId] = useState('');
    const [formPhoto, setFormPhoto] = useState('');

    // Loaded custom IFC file info
    const [loadedIfcName, setLoadedIfcName] = useState<string | null>(null);

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

    // Initialize Three.js Scene and Procedural IFC Model
    useEffect(() => {
        if (!mountRef.current) return;
        const container = mountRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;

        // Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf1f5f9);
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
        controls.maxDistance = 120;
        controls.minDistance = 3;
        controls.maxPolarAngle = Math.PI / 2 + 0.05; // Do not go under the ground
        controls.target.set(0, 4, 0);
        controlsRef.current = controls;

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
        scene.add(ambientLight);

        const hemiLight = new THREE.HemisphereLight(0xddeeff, 0x9999aa, 0.4);
        scene.add(hemiLight);

        const sunLight = new THREE.DirectionalLight(0xfff5e6, 1.2);
        sunLight.position.set(30, 45, 25);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 150;
        sunLight.shadow.camera.left = -25;
        sunLight.shadow.camera.right = 25;
        sunLight.shadow.camera.top = 25;
        sunLight.shadow.camera.bottom = -25;
        sunLight.shadow.bias = -0.0005;
        scene.add(sunLight);

        const fillLight = new THREE.DirectionalLight(0xb0c4de, 0.4);
        fillLight.position.set(-20, 20, -20);
        scene.add(fillLight);

        // Ground & Grid
        const gridHelper = new THREE.GridHelper(50, 50, 0x94a3b8, 0xcbd5e1);
        gridHelper.position.y = -0.02;
        scene.add(gridHelper);

        const groundGeo = new THREE.PlaneGeometry(80, 80);
        const groundMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.9, metalness: 0.1 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.05;
        ground.receiveShadow = true;
        scene.add(ground);

        // BIM Group
        const bimGroup = new THREE.Group();
        bimGroup.name = 'BimBuildingModel';
        scene.add(bimGroup);
        bimGroupRef.current = bimGroup;

        // Pins Group
        const pinsGroup = new THREE.Group();
        pinsGroup.name = 'PinsGroup';
        scene.add(pinsGroup);
        pinsGroupRef.current = pinsGroup;

        // Materials
        const concreteMat = new THREE.MeshStandardMaterial({ color: 0xd8dcd6, roughness: 0.7, metalness: 0.1 });
        const slabMat = new THREE.MeshStandardMaterial({ color: 0xe5e7eb, roughness: 0.6, metalness: 0.15 });
        const columnMat = new THREE.MeshStandardMaterial({ color: 0xc4c8c2, roughness: 0.8, metalness: 0.05 });
        const beamMat = new THREE.MeshStandardMaterial({ color: 0xb5bab2, roughness: 0.75, metalness: 0.05 });
        const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.45, roughness: 0.1, transmission: 0.7, thickness: 0.5 });
        const safetyYellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4, metalness: 0.4 });
        const scaffoldMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5, metalness: 0.7 });
        const brickMat = new THREE.MeshStandardMaterial({ color: 0xc2714f, roughness: 0.85 });

        // Helper to register IFC element
        const addIfcMesh = (mesh: THREE.Mesh, ifcId: string, name: string, storey: string, category: string) => {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.userData = {
                isIfcElement: true,
                ifcGlobalId: ifcId,
                elementName: name,
                storey,
                category,
                originalMaterial: mesh.material,
            };
            bimGroup.add(mesh);
        };

        // 1. PISO 0 (R/C & Fundação)
        const f0Slab = new THREE.Mesh(new THREE.BoxGeometry(20, 0.6, 14), slabMat);
        f0Slab.position.set(0, 0.3, 0);
        addIfcMesh(f0Slab, '0A1_SLAB_F0', 'Laje de Fundação e R/C (IfcSlab)', 'Piso 0', 'Slab');

        // Central core / elevator shaft walls
        const coreWall = new THREE.Mesh(new THREE.BoxGeometry(4, 9, 3), concreteMat);
        coreWall.position.set(0, 4.5, 0);
        addIfcMesh(coreWall, '0_CORE_WALLS', 'Núcleo Central de Betão / Escadas (IfcWall)', 'Piso 0', 'Core');

        // F0 Columns
        const gridX = [-7, -2.5, 2.5, 7];
        const gridZ = [-5, 0, 5];

        let colIdx = 1;
        for (const x of gridX) {
            for (const z of gridZ) {
                if (Math.abs(x) < 3 && Math.abs(z) < 2) continue; // Skip core
                const col = new THREE.Mesh(new THREE.BoxGeometry(0.6, 3, 0.6), columnMat);
                col.position.set(x, 1.8, z);
                addIfcMesh(col, `0_COL_P0_${colIdx}`, `Pilar P-0${colIdx} R/C (IfcColumn)`, 'Piso 0', 'Column');
                colIdx++;
            }
        }

        // F0 Glass Façade
        const f0GlassFront = new THREE.Mesh(new THREE.BoxGeometry(19.6, 2.8, 0.1), glassMat);
        f0GlassFront.position.set(0, 1.8, 6.8);
        addIfcMesh(f0GlassFront, '0_CURTAIN_F0_S', 'Fachada Cortina Vidro R/C (IfcCurtainWall)', 'Piso 0', 'Glass');

        // 2. PISO 1 (Estrutura e Vão)
        const f1Slab = new THREE.Mesh(new THREE.BoxGeometry(20.4, 0.5, 14.4), slabMat);
        f1Slab.position.set(0, 3.45, 0);
        addIfcMesh(f1Slab, '1B2_SLAB_F1', 'Laje Estrutural Piso 1 (IfcSlab)', 'Piso 1', 'Slab');

        // F1 Beams (Perimeter)
        const b1Front = new THREE.Mesh(new THREE.BoxGeometry(20.4, 0.6, 0.5), beamMat);
        b1Front.position.set(0, 3.2, 7);
        addIfcMesh(b1Front, '1X9yZab34CdeFghiJklMno', 'Viga Periférica V-12 (IfcBeam)', 'Piso 1', 'Beam');

        // F1 Columns
        colIdx = 1;
        for (const x of gridX) {
            for (const z of gridZ) {
                if (Math.abs(x) < 3 && Math.abs(z) < 2) continue;
                const col = new THREE.Mesh(new THREE.BoxGeometry(0.55, 3, 0.55), columnMat);
                col.position.set(x, 4.95, z);
                addIfcMesh(col, `3A4bCde12FghIjklMnOpQr_${colIdx}`, `Pilar P-0${colIdx} Piso 1 (IfcColumn)`, 'Piso 1', 'Column');
                colIdx++;
            }
        }

        // F1 Masonry walls (in-progress)
        const f1WallBack = new THREE.Mesh(new THREE.BoxGeometry(9, 2.8, 0.3), brickMat);
        f1WallBack.position.set(-4.5, 4.85, -6.8);
        addIfcMesh(f1WallBack, '1_WALL_BRICK_F1', 'Alvenaria Tijolo Térmico Norte (IfcWall)', 'Piso 1', 'Wall');

        // 3. PISO 2 (Frente de Trabalho Ativa)
        const f2Slab = new THREE.Mesh(new THREE.BoxGeometry(20.4, 0.5, 14.4), slabMat);
        f2Slab.position.set(0, 6.65, 0);
        addIfcMesh(f2Slab, '2O2Dwx$hn8Zwcx7qDF01AB', 'Laje Estrutural Piso 2 (IfcSlab)', 'Piso 2', 'Slab');

        // F2 Columns (Under construction with rebar extension)
        colIdx = 1;
        for (const x of gridX) {
            for (const z of gridZ) {
                if (Math.abs(x) < 3 && Math.abs(z) < 2) continue;
                const col = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.8, 0.5), columnMat);
                col.position.set(x, 8.05, z);
                addIfcMesh(col, `2_COL_P2_${colIdx}`, `Pilar Estrutura P-2${colIdx} (IfcColumn)`, 'Piso 2', 'Column');

                // Rebar extensions
                const rebar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8), scaffoldMat);
                rebar.position.set(x, 9.7, z);
                bimGroup.add(rebar);
                colIdx++;
            }
        }

        // F2 Safety Railings (Yellow temporary safety guardrails)
        const rail1 = new THREE.Mesh(new THREE.BoxGeometry(20, 1.1, 0.08), safetyYellowMat);
        rail1.position.set(0, 7.45, 7.1);
        addIfcMesh(rail1, '2_RAILING_SOUTH', 'Guarda-Corpos Provisório Sul (IfcRailing)', 'Piso 2', 'Safety');

        const railEast = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.1, 14), safetyYellowMat);
        railEast.position.set(10.1, 7.45, 0);
        addIfcMesh(railEast, '2_RAILING_EAST', 'Guarda-Corpos Provisório Este (IfcRailing)', 'Piso 2', 'Safety');

        // 4. COBERTURA (Roof & Parapets)
        const roofSlab = new THREE.Mesh(new THREE.BoxGeometry(16, 0.4, 11), slabMat);
        roofSlab.position.set(0, 9.6, 0);
        addIfcMesh(roofSlab, '3_ROOF_SLAB', 'Laje da Cobertura e Desvão (IfcRoof)', 'Cobertura', 'Slab');

        // HVAC Equipment on Roof
        const hvac = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.4, 2), scaffoldMat);
        hvac.position.set(3, 10.5, 2);
        addIfcMesh(hvac, '3_HVAC_UNIT', 'Central de Ventilação e Climatização (IfcEnergyConversionDevice)', 'Cobertura', 'Equipment');

        // 5. EQUIPAMENTOS DE ESTALEIRO: Grua Torre (Tower Crane)
        const craneGroup = new THREE.Group();
        const craneMast = new THREE.Mesh(new THREE.BoxGeometry(0.9, 18, 0.9), safetyYellowMat);
        craneMast.position.set(13, 9, -7);
        craneGroup.add(craneMast);

        const craneJib = new THREE.Mesh(new THREE.BoxGeometry(24, 0.6, 0.6), safetyYellowMat);
        craneJib.position.set(7, 18.2, -7);
        craneGroup.add(craneJib);

        const craneCounter = new THREE.Mesh(new THREE.BoxGeometry(6, 0.7, 0.7), concreteMat);
        craneCounter.position.set(16, 18.2, -7);
        craneGroup.add(craneCounter);

        const craneCab = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 1.2), glassMat);
        craneCab.position.set(12.2, 17.5, -6.4);
        craneGroup.add(craneCab);

        craneMast.userData = {
            isIfcElement: true,
            ifcGlobalId: 'CRANE_COMANSA_21LC',
            elementName: 'Grua Torre Comansa 21LC (IfcConstructionEquipmentResource)',
            storey: 'Exterior',
            category: 'Equipment'
        };
        bimGroup.add(craneGroup);

        // Animation Loop
        let animationFrameId: number;
        const clock = new THREE.Clock();

        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            controls.update();

            // Animate 3D pins gentle pulsing
            const elapsedTime = clock.getElapsedTime();
            if (pinsGroupRef.current) {
                pinsGroupRef.current.children.forEach((pin, index) => {
                    const wave = Math.sin(elapsedTime * 2.5 + index * 0.5) * 0.08;
                    pin.position.y = (pin.userData.baseY || pin.position.y) + wave;
                });
            }

            renderer.render(scene, camera);
        };
        animate();

        // Handle Window / Container Resize
        const handleResize = () => {
            if (!container || !rendererRef.current || !cameraRef.current) return;
            const w = container.clientWidth;
            const h = container.clientHeight;
            cameraRef.current.aspect = w / h;
            cameraRef.current.updateProjectionMatrix();
            rendererRef.current.setSize(w, h);
        };
        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
            renderer.dispose();
            controls.dispose();
        };
    }, []);

    // Filter Building Elements by Storey
    useEffect(() => {
        if (!bimGroupRef.current) return;
        bimGroupRef.current.traverse((child) => {
            if (child instanceof THREE.Mesh && child.userData.isIfcElement) {
                const elementStorey = child.userData.storey;
                if (selectedStorey === 'all' || elementStorey === selectedStorey || elementStorey === 'Exterior') {
                    child.visible = true;
                    if (child.material) {
                        child.material.transparent = false;
                        child.material.opacity = 1.0;
                    }
                } else {
                    // Make unselected storeys ghostly/translucent for spatial context
                    child.visible = true;
                    if (child.material) {
                        child.material.transparent = true;
                        child.material.opacity = 0.12;
                    }
                }
            }
        });
    }, [selectedStorey]);

    // Render 3D Pins in Scene when projectObservations change
    useEffect(() => {
        if (!pinsGroupRef.current) return;
        const pinsGroup = pinsGroupRef.current;
        pinsGroup.clear();

        projectObservations.forEach((obs) => {
            const pinContainer = new THREE.Group();
            pinContainer.position.set(obs.position[0], obs.position[1], obs.position[2]);
            pinContainer.userData = {
                observation: obs,
                baseY: obs.position[1],
            };

            // Color by status and severity
            let colorHex = 0x3b82f6; // blue
            if (obs.status === 'resolved') {
                colorHex = 0x10b981; // green
            } else if (obs.severity === 'critical' || obs.severity === 'high') {
                colorHex = 0xef4444; // red
            } else if (obs.severity === 'medium') {
                colorHex = 0xf59e0b; // amber
            }

            // Pin Stem
            const stemGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8);
            const stemMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
            const stem = new THREE.Mesh(stemGeo, stemMat);
            stem.position.y = 0.4;
            pinContainer.add(stem);

            // Pin Head Sphere
            const headGeo = new THREE.SphereGeometry(0.3, 16, 16);
            const headMat = new THREE.MeshStandardMaterial({
                color: colorHex,
                emissive: colorHex,
                emissiveIntensity: 0.6,
                roughness: 0.2,
                metalness: 0.8
            });
            const head = new THREE.Mesh(headGeo, headMat);
            head.position.y = 0.8;
            head.castShadow = true;
            pinContainer.add(head);

            // Base Beacon Ring
            const ringGeo = new THREE.RingGeometry(0.2, 0.4, 24);
            const ringMat = new THREE.MeshBasicMaterial({ color: colorHex, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = -Math.PI / 2;
            ring.position.y = 0.02;
            pinContainer.add(ring);

            pinsGroup.add(pinContainer);
        });
    }, [projectObservations]);

    // Handle Canvas Click (Raycasting for selection and pin placement)
    const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!mountRef.current || !cameraRef.current || !sceneRef.current) return;
        const rect = mountRef.current.getBoundingClientRect();
        mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

        // 1. Check if clicking on an existing Pin
        if (pinsGroupRef.current) {
            const pinIntersects = raycasterRef.current.intersectObjects(pinsGroupRef.current.children, true);
            if (pinIntersects.length > 0) {
                // Find top group
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

        // 2. Check if clicking on Building Model
        if (bimGroupRef.current) {
            const intersects = raycasterRef.current.intersectObjects(bimGroupRef.current.children, true);
            if (intersects.length > 0) {
                const hit = intersects[0];
                const mesh = hit.object as THREE.Mesh;
                const point = hit.point;

                if (mesh.userData?.isIfcElement) {
                    setSelectedElement(mesh.userData);
                    setActivePin(null);

                    // If in "Add Point" mode, trigger modal immediately at click position
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
                            elementName: mesh.userData.elementName || 'Elemento IFC',
                            storeyName: mesh.userData.storey || 'Piso Atual'
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

        // Simple smooth tween
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

    // Reset Camera View
    const handleResetView = () => {
        if (!controlsRef.current || !cameraRef.current) return;
        cameraRef.current.position.set(22, 18, 26);
        controlsRef.current.target.set(0, 4, 0);
        controlsRef.current.update();
        setSelectedStorey('all');
        setSelectedElement(null);
        setActivePin(null);
    };

    // Handle Creating New Observation
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
    };

    // Generate Official PDF Report for Site Visits
    const handleExportPDF = () => {
        const doc = new jsPDF();
        const now = new Date();
        const formattedDate = now.toLocaleDateString('pt-PT') + ' ' + now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

        // Header
        doc.setFillColor(37, 99, 235); // Blue primary
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
        doc.text(`Referência BIM/IFC: ISO 19650-6 / ISO 16739 (Modelo 3D Geolocalizado)`, 14, 50);

        // Summary Boxes
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

        // Save PDF
        doc.save(`Relatorio_Visita_${currentProject.name.replace(/[^a-zA-Z0-9]/g, '_')}_${now.toISOString().split('T')[0]}.pdf`);
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
        <div className="relative w-full h-[calc(100vh-64px)] overflow-hidden bg-slate-100 flex flex-col select-none">
            {/* Top Toolbar */}
            <div className="h-14 bg-white/95 dark:bg-[#1e2023]/95 backdrop-blur-md border-b border-slate-200 dark:border-[#333] px-4 flex items-center justify-between z-20 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 pr-3 border-r border-slate-200 dark:border-neutral-700">
                        <Box className="w-5 h-5 text-blue-600" />
                        <h1 className="text-sm font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                            BIM 3D & Visitas de Obra
                        </h1>
                        <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                            IFC 4.3
                        </span>
                    </div>

                    {/* Mode Toggle */}
                    <div className="flex items-center bg-slate-100 dark:bg-neutral-800 p-0.5 rounded-lg border border-slate-200 dark:border-neutral-700 text-xs font-medium">
                        <button
                            onClick={() => setActiveMode('navigate')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                                activeMode === 'navigate'
                                    ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-sm font-semibold'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                            }`}
                        >
                            <Eye size={14} />
                            Navegação
                        </button>
                        <button
                            onClick={() => setActiveMode('add_point')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                                activeMode === 'add_point'
                                    ? 'bg-red-600 text-white shadow-sm font-bold'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-red-600'
                            }`}
                        >
                            <MapPin size={14} className={activeMode === 'add_point' ? 'animate-bounce' : ''} />
                            Adicionar Ponto de Visita
                        </button>
                    </div>

                    {/* Floor / Storey Selector */}
                    <div className="flex items-center gap-1.5 ml-2">
                        <Layers size={14} className="text-slate-400" />
                        <select
                            value={selectedStorey}
                            onChange={(e) => setSelectedStorey(e.target.value)}
                            className="bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-xs rounded-md px-2.5 py-1.5 text-slate-700 dark:text-slate-200 outline-none font-medium focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="all">🏢 Todos os Pisos</option>
                            <option value="Piso 0">Piso 0 (R/C & Fundação)</option>
                            <option value="Piso 1">Piso 1 (Estrutura)</option>
                            <option value="Piso 2">Piso 2 (Frente de Trabalho)</option>
                            <option value="Cobertura">Cobertura & HVAC</option>
                        </select>
                    </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2">
                    {/* Reset Camera */}
                    <button
                        onClick={handleResetView}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 text-xs flex items-center gap-1.5 font-medium shadow-sm transition-colors"
                        title="Repor câmara inicial"
                    >
                        <RotateCcw size={14} />
                        Repor Vista
                    </button>

                    {/* Load IFC File */}
                    <label className="cursor-pointer px-3 py-1.5 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 text-xs flex items-center gap-1.5 font-medium shadow-sm transition-colors">
                        <Upload size={14} className="text-blue-600" />
                        <span>{loadedIfcName ? `IFC: ${loadedIfcName}` : 'Carregar IFC'}</span>
                        <input
                            type="file"
                            accept=".ifc"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    setLoadedIfcName(file.name);
                                    alert(`Ficheiro IFC "${file.name}" carregado com sucesso no CDE do projeto.`);
                                }
                            }}
                        />
                    </label>

                    {/* Export PDF Report */}
                    <button
                        onClick={handleExportPDF}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs flex items-center gap-1.5 font-medium shadow-sm transition-all"
                    >
                        <Download size={14} />
                        Exportar Relatório PDF
                    </button>

                    {/* Toggle Sidebar */}
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 text-xs shadow-sm transition-colors"
                        title={isSidebarOpen ? 'Ocultar lista de visitas' : 'Mostrar lista de visitas'}
                    >
                        <ChevronRight className={`w-4 h-4 transition-transform ${isSidebarOpen ? '' : 'rotate-180'}`} />
                    </button>
                </div>
            </div>

            {/* Main Area: 3D Canvas + Overlays */}
            <div className="relative flex-1 w-full h-full flex overflow-hidden">
                {/* Mode Indicator Overlay */}
                {activeMode === 'add_point' && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-4 py-2 bg-red-600 text-white text-xs font-semibold rounded-full shadow-lg flex items-center gap-2 animate-pulse pointer-events-none">
                        <MapPin size={15} />
                        Clique em qualquer elemento do modelo 3D para criar um ponto de visita geolocalizado
                    </div>
                )}

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
                            <div><strong>Tipo IFC:</strong> {selectedElement.category}</div>
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

                {/* Pin Detail Popup Overlay */}
                {activePin && (
                    <div className="absolute top-4 left-4 z-10 bg-white/95 dark:bg-[#1e2023]/95 backdrop-blur-md border border-slate-200 dark:border-[#333] p-4 rounded-xl shadow-2xl max-w-sm text-xs space-y-2.5 animate-in fade-in zoom-in-95">
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
                                Pontos georreferenciados no modelo 3D
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
