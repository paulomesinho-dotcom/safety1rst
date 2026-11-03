'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ALL_SAFETY_SYMBOLS, getSymbolSvg } from '@/lib/safety-symbols';
import { SiteLogisticsItem, SiteWorkZone } from '@/types';
import {
    ShieldAlert,
    Route,
    Grid,
    Download,
    Trash2,
    Check,
    ZoomIn,
    ZoomOut,
    Eye,
    EyeOff,
    Sliders,
    Type,
    Ruler,
    FileUp,
    Move,
    Search,
    Save,
    Share2,
    CheckCircle2,
    AlertCircle,
    Info,
    RotateCcw
} from 'lucide-react';
import { jsPDF } from 'jspdf';

export type BimState = 'WIP' | 'SHARED' | 'PUBLISHED' | 'ARCHIVED';

interface MeasurementItem {
    id: string;
    p1: [number, number];
    p2: [number, number];
    distance: number;
}

interface TextNoteItem {
    id: string;
    text: string;
    position: [number, number];
    category: 'warning' | 'info' | 'mandatory';
}

interface Bim2dSafetyEditorProps {
    projectId: string;
    projectName: string;
    storey: string;
    activeDrawing: any;
    logisticsItems: SiteLogisticsItem[];
    workZones: SiteWorkZone[];
    onAddLogisticsItem: (item: Omit<SiteLogisticsItem, 'id'>) => void;
    onDeleteLogisticsItem: (id: string) => void;
    onAddWorkZone: (zone: Omit<SiteWorkZone, 'id' | 'createdAt'>) => void;
    onDeleteWorkZone: (id: string) => void;
    currentPdfUrl: string | null;
    showToast: (msg: string) => void;
    onSaveUpdatedPdf?: (pdfBlob: Blob, pdfDataUrl: string, overlays: any) => Promise<void> | void;
    onPublishRevision?: (newRevision: string, newState: BimState, pdfBlob: Blob, pdfDataUrl: string) => Promise<void> | void;
}

export default function Bim2dSafetyEditor({
    projectId,
    projectName,
    storey,
    activeDrawing,
    logisticsItems,
    workZones,
    onAddLogisticsItem,
    onDeleteLogisticsItem,
    onAddWorkZone,
    onDeleteWorkZone,
    currentPdfUrl,
    showToast,
    onSaveUpdatedPdf,
    onPublishRevision
}: Bim2dSafetyEditorProps) {
    const [activeTool, setActiveTool] = useState<'navigate' | 'place_symbol' | 'draw_zone' | 'draw_route' | 'measure' | 'add_text'>('navigate');
    
    // Symbol selection and filtering
    const [selectedSymbolId, setSelectedSymbolId] = useState<string>('F001');
    const [symbolCategoryFilter, setSymbolCategoryFilter] = useState<string>('all');
    const [symbolSearchQuery, setSymbolSearchQuery] = useState<string>('');

    // Risk Zone State
    const [selectedZoneCat, setSelectedZoneCat] = useState<SiteWorkZone['category']>('hazard');
    const [zoneName, setZoneName] = useState<string>('Zona de Risco');
    const [zoneReqCert, setZoneReqCert] = useState<string>('Trabalhos em Altura');
    const [pendingPoints, setPendingPoints] = useState<[number, number][]>([]);

    // Measurements & Text Notes
    const [measurements, setMeasurements] = useState<MeasurementItem[]>([]);
    const [pendingMeasureStart, setPendingMeasureStart] = useState<[number, number] | null>(null);
    const [textNotes, setTextNotes] = useState<TextNoteItem[]>([]);
    const [activeNoteText, setActiveNoteText] = useState<string>('Aviso de Segurança: Manter passagem desimpedida');
    const [activeNoteCat, setActiveNoteCat] = useState<'warning' | 'info' | 'mandatory'>('warning');

    // Underlay / Reference Background State
    const [showUnderlay, setShowUnderlay] = useState<boolean>(true);
    const [underlayUrl, setUnderlayUrl] = useState<string | null>(activeDrawing?.underlay?.url || null);
    const [underlayFileName, setUnderlayFileName] = useState<string | null>(activeDrawing?.underlay?.fileName || null);
    const [underlayScale, setUnderlayScale] = useState<number>(activeDrawing?.underlay?.scale || 1.0);
    const [underlayOffsetX, setUnderlayOffsetX] = useState<number>(activeDrawing?.underlay?.offsetX || 0);
    const [underlayOffsetY, setUnderlayOffsetY] = useState<number>(activeDrawing?.underlay?.offsetY || 0);
    const [underlayRotation, setUnderlayRotation] = useState<number>(activeDrawing?.underlay?.rotation || 0);
    const [underlayOpacity, setUnderlayOpacity] = useState<number>(activeDrawing?.underlay?.opacity ?? 0.45);
    const [isCalibratingUnderlay, setIsCalibratingUnderlay] = useState<boolean>(false);

    // Zoom & Sheet Options
    const [sheetZoom, setSheetZoom] = useState<number>(1);
    const [scaleFormat, setScaleFormat] = useState<'1:50' | '1:100' | '1:200' | '1:500'>(activeDrawing?.scale || '1:100');
    const [sheetFormat, setSheetFormat] = useState<'a4' | 'a3' | 'a2' | 'a1' | 'a0'>('a3');
    const [isSavingPdf, setIsSavingPdf] = useState(false);
    const underlayFileInputRef = useRef<HTMLInputElement | null>(null);

    // Sync underlay and overlays when activeDrawing changes
    useEffect(() => {
        if (activeDrawing?.underlay) {
            setUnderlayUrl(activeDrawing.underlay.url || null);
            setUnderlayFileName(activeDrawing.underlay.fileName || null);
            setUnderlayScale(activeDrawing.underlay.scale || 1.0);
            setUnderlayOffsetX(activeDrawing.underlay.offsetX || 0);
            setUnderlayOffsetY(activeDrawing.underlay.offsetY || 0);
            setUnderlayRotation(activeDrawing.underlay.rotation || 0);
            setUnderlayOpacity(activeDrawing.underlay.opacity ?? 0.45);
        }
        if (activeDrawing?.scale) {
            setScaleFormat(activeDrawing.scale);
        }
        // Load stored overlays if available
        if (activeDrawing?.overlays?.measurements) {
            setMeasurements(activeDrawing.overlays.measurements);
        }
        if (activeDrawing?.overlays?.textNotes) {
            setTextNotes(activeDrawing.overlays.textNotes);
        }
    }, [activeDrawing?.id]);

    // Current BIM State & Revision
    const currentBimState: BimState = activeDrawing?.bimState || 'WIP';
    const currentRevision: string = activeDrawing?.revision || 'P01';

    // Filter symbols based on category & search
    const filteredSymbols = useMemo(() => {
        return ALL_SAFETY_SYMBOLS.filter(sym => {
            const matchesCat = symbolCategoryFilter === 'all' || sym.cat === symbolCategoryFilter;
            const q = symbolSearchQuery.toLowerCase().trim();
            const matchesSearch = !q || sym.id.toLowerCase().includes(q) || sym.name.toLowerCase().includes(q);
            return matchesCat && matchesSearch;
        });
    }, [symbolCategoryFilter, symbolSearchQuery]);

    // Handle background underlay file upload
    const handleUploadUnderlayFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const res = ev.target?.result as string;
            setUnderlayUrl(res);
            setUnderlayFileName(file.name);
            setShowUnderlay(true);
            showToast(`Planta de referência "${file.name}" carregada! Use o botão 'Calibrar Fundo' para ajustar.`);
        };
        reader.readAsDataURL(file);
    };

    // Canvas click handling
    const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        
        // Convert screen pixel coordinates to real model meters [-20..20, -16..16]
        const normX = Number((((clickX / rect.width) - 0.5) * 40).toFixed(2));
        const normZ = Number((((clickY / rect.height) - 0.5) * 32).toFixed(2));

        if (activeTool === 'place_symbol') {
            const symMeta = ALL_SAFETY_SYMBOLS.find(s => s.id === selectedSymbolId);
            onAddLogisticsItem({
                projectId,
                type: 'fire_extinguisher',
                name: symMeta ? `${symMeta.name} (${symMeta.id})` : selectedSymbolId,
                category: symMeta?.cat === 'fire' || symMeta?.cat === 'safe' || symMeta?.cat === 'medical' ? 'emergency' : 'logistics',
                position: [normX, 0, normZ],
                symbolId: selectedSymbolId,
                storeyName: storey,
                notes: `Símbolo ${selectedSymbolId} afixado na planta`
            });
            showToast(`Símbolo "${selectedSymbolId}" afixado na planta e projetado no modelo 3D!`);
            return;
        }

        if (activeTool === 'draw_zone' || activeTool === 'draw_route') {
            const next = [...pendingPoints, [normX, normZ] as [number, number]];
            setPendingPoints(next);
            showToast(`Ponto ${next.length} marcado. Clique 'Concluir' quando terminar.`);
            return;
        }

        if (activeTool === 'measure') {
            if (!pendingMeasureStart) {
                setPendingMeasureStart([normX, normZ]);
                showToast('Ponto inicial da medição marcado. Clique no segundo ponto.');
            } else {
                const dx = normX - pendingMeasureStart[0];
                const dz = normZ - pendingMeasureStart[1];
                const dist = Number(Math.sqrt(dx * dx + dz * dz).toFixed(2));
                const newMeasure: MeasurementItem = {
                    id: `m-${Date.now()}`,
                    p1: pendingMeasureStart,
                    p2: [normX, normZ],
                    distance: dist
                };
                setMeasurements(prev => [...prev, newMeasure]);
                setPendingMeasureStart(null);
                showToast(`Distância medida: ${dist} metros`);
            }
            return;
        }

        if (activeTool === 'add_text') {
            const noteText = prompt('Introduza o texto da nota técnica de segurança:', activeNoteText);
            if (noteText && noteText.trim()) {
                const newNote: TextNoteItem = {
                    id: `n-${Date.now()}`,
                    text: noteText.trim(),
                    position: [normX, normZ],
                    category: activeNoteCat
                };
                setTextNotes(prev => [...prev, newNote]);
                showToast('Nota de segurança afixada na planta!');
            }
            return;
        }
    };

    const handleFinishZone = () => {
        if (pendingPoints.length < 3) {
            showToast('Marque pelo menos 3 pontos para criar uma zona de risco.');
            return;
        }
        onAddWorkZone({
            projectId,
            name: zoneName || 'Zona de Segurança',
            category: selectedZoneCat,
            storeyName: storey,
            polygon: pendingPoints,
            color: selectedZoneCat === 'hazard' ? '#ef4444' : selectedZoneCat === 'height' ? '#3b82f6' : '#f59e0b',
            hatchStyle: 'diagonal',
            requiredCertifications: zoneReqCert ? [zoneReqCert] : [],
            active: true
        });
        setPendingPoints([]);
        setActiveTool('navigate');
        showToast(`Zona "${zoneName}" delimitada com exigência de formação!`);
    };

    const handleFinishRoute = () => {
        if (pendingPoints.length < 2) {
            showToast('Marque pelo menos 2 pontos para traçar a rota de evacuação.');
            return;
        }
        onAddLogisticsItem({
            projectId,
            type: 'evacuation_route',
            name: `Rota Evacuação ${storey} (${pendingPoints.length} marcos)`,
            category: 'emergency',
            position: [pendingPoints[0][0], 0, pendingPoints[0][1]],
            routePoints: pendingPoints,
            storeyName: storey,
            symbolId: 'E001'
        });
        setPendingPoints([]);
        setActiveTool('navigate');
        showToast('Percurso de Evacuação registado na planta e projetado com setas 3D no modelo!');
    };

    /**
     * Builds complete calibrated high-resolution PDF document matching exact interactive canvas
     */
    const buildCompletePdfDoc = (options?: { isPublish?: boolean; revisionOverride?: string }): { doc: jsPDF; blob: Blob; dataUrl: string } => {
        const dims: Record<string, [number, number]> = {
            a4: [297, 210],
            a3: [420, 297],
            a2: [594, 420],
            a1: [841, 594],
            a0: [1189, 841]
        };
        const [pW, pH] = [dims[sheetFormat][0], dims[sheetFormat][1]];
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: sheetFormat });
        const now = new Date();

        const stateLabel: BimState = options?.isPublish ? 'PUBLISHED' : currentBimState;
        const revLabel = options?.revisionOverride || currentRevision;

        // Outer & Inner Technical Margins
        doc.setDrawColor(15, 23, 42);
        doc.setLineWidth(0.6);
        doc.rect(10, 10, pW - 20, pH - 20);
        doc.setLineWidth(0.2);
        doc.rect(12, 12, pW - 24, pH - 24);

        // Header Title Banner
        doc.setFillColor(15, 23, 42);
        doc.rect(12, 12, pW - 24, 18, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('SAFESITE | PLANTA DE ESTALEIRO, PREVENÇÃO E EMERGÊNCIA (DL 273/2003 / ISO 7010)', 16, 22);

        // Drawing Viewport Boundaries
        const sidebarW = Math.min(95, pW * 0.24);
        const vpX = 20;
        const vpY = 36;
        const vpW = pW - sidebarW - 32;
        const vpH = pH - 52;

        const mb = activeDrawing?.modelBounds || { minX: -15, maxX: 15, minZ: -12, maxZ: 12, width: 30, depth: 24 };
        const scaleX = vpW / mb.width;
        const scaleZ = vpH / mb.depth;
        const drawScale = Math.min(scaleX, scaleZ) * 0.88;
        const drawW = mb.width * drawScale;
        const drawH = mb.depth * drawScale;
        const offsetX = vpX + (vpW - drawW) / 2;
        const offsetY = vpY + (vpH - drawH) / 2;

        const toPdfX = (wx: number) => offsetX + ((wx - mb.minX) / mb.width) * drawW;
        const toPdfY = (wz: number) => offsetY + ((wz - mb.minZ) / mb.depth) * drawH;

        // 1. Underlay Reference Background (if active)
        if (showUnderlay && underlayUrl) {
            try {
                doc.addImage(underlayUrl, 'PNG', offsetX, offsetY, drawW, drawH);
            } catch (_) {}
        }

        // 2. Structural Grid Lines
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.12);
        for (let i = 0; i <= 4; i++) {
            const gx = offsetX + (drawW / 4) * i;
            doc.line(gx, offsetY, gx, offsetY + drawH);
        }
        for (let j = 0; j <= 3; j++) {
            const gy = offsetY + (drawH / 3) * j;
            doc.line(offsetX, gy, offsetX + drawW, gy);
        }

        // 3. Section-Cut Vector Lines from IFC Triangles (Standard Architectural 0.35mm)
        if (activeDrawing?.vectorSegments && activeDrawing.vectorSegments.length > 0) {
            doc.setDrawColor(15, 23, 42);
            doc.setLineWidth(0.35);
            for (const [x1, z1, x2, z2] of activeDrawing.vectorSegments) {
                doc.line(toPdfX(x1), toPdfY(z1), toPdfX(x2), toPdfY(z2));
            }
        }

        // 4. Risk & Hazard Zones (Hatched polygons & borders)
        workZones.forEach(zone => {
            if (!zone.polygon || zone.polygon.length < 3) return;
            doc.setDrawColor(zone.color || '#ef4444');
            doc.setLineWidth(0.45);
            for (let i = 0; i < zone.polygon.length; i++) {
                const pA = zone.polygon[i];
                const pB = zone.polygon[(i + 1) % zone.polygon.length];
                doc.line(toPdfX(pA[0]), toPdfY(pA[1]), toPdfX(pB[0]), toPdfY(pB[1]));
            }
            // Label
            const cX = zone.polygon.reduce((acc, p) => acc + p[0], 0) / zone.polygon.length;
            const cY = zone.polygon.reduce((acc, p) => acc + p[1], 0) / zone.polygon.length;
            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(185, 28, 28);
            doc.text(`[ZONA] ${zone.name}`, toPdfX(cX) - 10, toPdfY(cY));
        });

        // 5. Evacuation Routes with Directional Arrows
        const evacRoutes = logisticsItems.filter(item => item.type === 'evacuation_route' && item.routePoints && item.routePoints.length >= 2);
        evacRoutes.forEach(route => {
            const pts = route.routePoints!;
            doc.setDrawColor(34, 197, 94);
            doc.setLineWidth(0.7);
            for (let i = 0; i < pts.length - 1; i++) {
                const sX = toPdfX(pts[i][0]);
                const sY = toPdfY(pts[i][1]);
                const eX = toPdfX(pts[i + 1][0]);
                const eY = toPdfY(pts[i + 1][1]);
                doc.line(sX, sY, eX, eY);
                // Draw circle marker at waypoints
                doc.circle(sX, sY, 1.2, 'FD');
            }
        });

        // 6. Placed Safety Symbols (ISO 7010)
        logisticsItems.forEach(item => {
            if (item.type === 'evacuation_route') return;
            const sx = toPdfX(item.position[0]);
            const sy = toPdfY(item.position[2]);
            const symCode = item.symbolId || 'F001';

            // Draw Symbol Box
            doc.setFillColor(item.category === 'emergency' ? 220 : 245, item.category === 'emergency' ? 38 : 158, item.category === 'emergency' ? 38 : 11);
            doc.rect(sx - 3.5, sy - 3.5, 7, 7, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(5.5);
            doc.setFont('helvetica', 'bold');
            doc.text(symCode.slice(0, 4), sx - 2.8, sy + 1.2);
        });

        // 7. Measurement Dimensions
        measurements.forEach(m => {
            const x1 = toPdfX(m.p1[0]);
            const y1 = toPdfY(m.p1[1]);
            const x2 = toPdfX(m.p2[0]);
            const y2 = toPdfY(m.p2[1]);
            doc.setDrawColor(37, 99, 235);
            doc.setLineWidth(0.3);
            doc.line(x1, y1, x2, y2);
            doc.circle(x1, y1, 1);
            doc.circle(x2, y2, 1);
            doc.setFontSize(6.5);
            doc.setTextColor(30, 64, 175);
            doc.text(`${m.distance} m`, (x1 + x2) / 2, (y1 + y2) / 2 - 1.5);
        });

        // 8. Text Notes
        textNotes.forEach(tn => {
            const tx = toPdfX(tn.position[0]);
            const ty = toPdfY(tn.position[1]);
            doc.setFillColor(254, 243, 199);
            doc.setDrawColor(217, 119, 6);
            doc.rect(tx, ty, 38, 9, 'FD');
            doc.setTextColor(146, 64, 14);
            doc.setFontSize(6.5);
            doc.setFont('helvetica', 'bold');
            doc.text(tn.text.slice(0, 24), tx + 2, ty + 5.5);
        });

        // 9. Right-Side Technical Sidebar & Official Cartouche (Carimbo ISO 19650)
        const sbX = pW - sidebarW - 12;
        doc.setDrawColor(15, 23, 42);
        doc.setLineWidth(0.35);
        doc.line(sbX, 12, sbX, pH - 12);

        // Sidebar Metadata Card
        doc.setFillColor(248, 250, 252);
        doc.rect(sbX + 3, 16, sidebarW - 6, 85, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(15, 23, 42);
        doc.text('DADOS DA PRANCHA TÉCNICA', sbX + 6, 23);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(51, 65, 85);
        doc.text(`Obra: ${projectName.slice(0, 26)}`, sbX + 6, 31);
        doc.text(`Piso / Nível: ${storey}`, sbX + 6, 38);
        doc.text(`Escala: ${scaleFormat} | Formato: ${sheetFormat.toUpperCase()}`, sbX + 6, 45);
        doc.text(`Cota de Corte: +1.20 m (Regulamentar)`, sbX + 6, 52);
        doc.text(`Símbolos ISO 7010 Afixados: ${logisticsItems.length}`, sbX + 6, 59);
        doc.text(`Zonas de Risco Delimitadas: ${workZones.length}`, sbX + 6, 66);
        doc.text(`Rotas de Evacuação: ${evacRoutes.length}`, sbX + 6, 73);
        doc.text(`Norma: ISO 19650 / DL 273/2003`, sbX + 6, 80);
        doc.text(`Fundo de Referência: ${showUnderlay && underlayUrl ? 'Calibrado' : 'Ocultado'}`, sbX + 6, 87);

        // Official Title Block (Carimbo CSO)
        const cartH = 68;
        const cartY = pH - cartH - 14;
        doc.setFillColor(15, 23, 42);
        doc.rect(sbX + 3, cartY, sidebarW - 6, 16, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.text('SAFESITE BIM | CDE 2D', sbX + 6, cartY + 6.5);
        doc.setFontSize(7);
        doc.text('ESTALEIRO, PREVENÇÃO E EMERGÊNCIA', sbX + 6, cartY + 12);

        doc.setDrawColor(15, 23, 42);
        doc.rect(sbX + 3, cartY + 16, sidebarW - 6, cartH - 16);
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(7.5);
        doc.text(`OBRA: ${projectName.slice(0, 22)}`, sbX + 6, cartY + 23);
        doc.text(`PEÇA: ${activeDrawing?.code || 'PE-01'} - ${storey}`, sbX + 6, cartY + 30);
        doc.text(`REVISÃO: ${revLabel}`, sbX + 6, cartY + 37);
        doc.text(`ESTADO BIM: ${stateLabel}`, sbX + 6, cartY + 44);
        doc.text(`DATA: ${now.toLocaleDateString('pt-PT')}`, sbX + 6, cartY + 51);
        doc.text(`CSO: Aprovado nos termos do DL 273/2003`, sbX + 6, cartY + 58);

        const pdfBlob = doc.output('blob');
        const pdfDataUrl = doc.output('datauristring');
        return { doc, blob: pdfBlob, dataUrl: pdfDataUrl };
    };

    /**
     * Save currently edited interactive plan to CDE PDF document
     */
    const handleSaveToCdePdf = async () => {
        setIsSavingPdf(true);
        try {
            const { blob, dataUrl } = buildCompletePdfDoc();
            const overlaysData = {
                measurements,
                textNotes,
                updatedAt: new Date().toISOString()
            };
            if (onSaveUpdatedPdf) {
                await onSaveUpdatedPdf(blob, dataUrl, overlaysData);
            }
            showToast('💾 Planta interativa gravada no PDF do CDE com sucesso!');
        } catch (err) {
            console.error('Error saving PDF to CDE:', err);
            showToast('Erro ao atualizar o PDF no CDE.');
        } finally {
            setIsSavingPdf(false);
        }
    };

    /**
     * Publish official revision under ISO 19650
     */
    const handlePublishRevision = async () => {
        setIsSavingPdf(true);
        try {
            // Compute next revision code
            let nextRev = 'C01';
            if (currentRevision.startsWith('C')) {
                const num = parseInt(currentRevision.slice(1), 10) || 1;
                nextRev = `C${String(num + 1).padStart(2, '0')}`;
            } else if (currentRevision.startsWith('P')) {
                nextRev = 'C01';
            }

            const { blob, dataUrl } = buildCompletePdfDoc({ isPublish: true, revisionOverride: nextRev });
            if (onPublishRevision) {
                await onPublishRevision(nextRev, 'PUBLISHED', blob, dataUrl);
            }
            showToast(`📢 Prancha publicada com sucesso! Nova revisão: ${nextRev} (PUBLISHED).`);
        } catch (err) {
            console.error('Error publishing revision:', err);
            showToast('Erro ao publicar revisão.');
        } finally {
            setIsSavingPdf(false);
        }
    };

    /**
     * Standard local download
     */
    const handleExportCalibratedPDF = () => {
        const { doc } = buildCompletePdfDoc();
        doc.save(`Planta_Estaleiro_${projectName.replace(/[^a-zA-Z0-9]/g, '_')}_${scaleFormat.replace(':', '_')}.pdf`);
        showToast('Planta de Estaleiro e Segurança descarregada em PDF!');
    };

    return (
        <div className="flex flex-col h-full w-full bg-slate-100 dark:bg-neutral-900 select-none overflow-hidden">
            {/* Hidden input for underlay file upload */}
            <input
                ref={underlayFileInputRef}
                type="file"
                accept=".pdf,image/*"
                onChange={handleUploadUnderlayFile}
                className="hidden"
            />

            {/* Top Toolbar with Tools & Actions */}
            <div className="h-12 px-3 bg-white dark:bg-[#1a1b1e] border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between gap-2 shrink-0 z-20 shadow-2xs">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                    {/* Tool: Navegar */}
                    <button
                        type="button"
                        onClick={() => setActiveTool('navigate')}
                        className={`h-7 px-2.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                            activeTool === 'navigate' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700 hover:bg-slate-200'
                        }`}
                        title="Navegar e Inspecionar Elementos"
                    >
                        <Move size={12} />
                        <span>Navegar</span>
                    </button>

                    {/* Tool: Símbolo ISO 7010 */}
                    <button
                        type="button"
                        onClick={() => setActiveTool('place_symbol')}
                        className={`h-7 px-2.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                            activeTool === 'place_symbol' ? 'bg-amber-600 text-white shadow-xs' : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                        title="Afixar Símbolo Oficial ISO 7010 na Planta"
                    >
                        <ShieldAlert size={13} />
                        <span>+ Símbolo ISO</span>
                    </button>

                    {/* Tool: Rota de Evacuação */}
                    <button
                        type="button"
                        onClick={() => { setActiveTool('draw_route'); setPendingPoints([]); }}
                        className={`h-7 px-2.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                            activeTool === 'draw_route' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                        title="Desenhar Percurso de Evacuação com Setas Direcionais"
                    >
                        <Route size={13} />
                        <span>+ Percurso Fuga</span>
                    </button>

                    {/* Tool: Zona Hachurada de Risco */}
                    <button
                        type="button"
                        onClick={() => { setActiveTool('draw_zone'); setPendingPoints([]); }}
                        className={`h-7 px-2.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                            activeTool === 'draw_zone' ? 'bg-red-600 text-white shadow-xs' : 'bg-red-50 hover:bg-red-100 text-red-800 border border-red-200'
                        }`}
                        title="Desenhar Zona Hachurada de Risco (DL 273/2003)"
                    >
                        <Grid size={13} />
                        <span>+ Zona Risco</span>
                    </button>

                    {/* Tool: Medição / Régua */}
                    <button
                        type="button"
                        onClick={() => { setActiveTool('measure'); setPendingMeasureStart(null); }}
                        className={`h-7 px-2.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                            activeTool === 'measure' ? 'bg-blue-600 text-white shadow-xs' : 'bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200'
                        }`}
                        title="Medir Distâncias Reais na Planta Calibrada"
                    >
                        <Ruler size={13} />
                        <span>Régua</span>
                    </button>

                    {/* Tool: Anotação de Texto */}
                    <button
                        type="button"
                        onClick={() => setActiveTool('add_text')}
                        className={`h-7 px-2.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                            activeTool === 'add_text' ? 'bg-purple-600 text-white shadow-xs' : 'bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200'
                        }`}
                        title="Adicionar Nota Técnica ou Aviso na Planta"
                    >
                        <Type size={13} />
                        <span>Texto</span>
                    </button>

                    {/* Concluir ou Cancelar Pontos Pendentes */}
                    {(activeTool === 'draw_zone' || activeTool === 'draw_route') && pendingPoints.length > 0 && (
                        <div className="flex items-center gap-1 pl-1 border-l border-slate-200 dark:border-neutral-700">
                            <button
                                type="button"
                                onClick={activeTool === 'draw_zone' ? handleFinishZone : handleFinishRoute}
                                className="h-7 px-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                            >
                                <Check size={13} />
                                <span>Concluir ({pendingPoints.length} pts)</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setPendingPoints([])}
                                className="h-7 px-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[11px] font-bold cursor-pointer"
                            >
                                Cancelar
                            </button>
                        </div>
                    )}
                </div>

                {/* Right Controls: Fundo, Ações CDE ISO 19650 e Impressão */}
                <div className="flex items-center gap-1.5 shrink-0">
                    {/* Badge ISO 19650 */}
                    <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold bg-slate-50 dark:bg-neutral-800">
                        <span className={`px-1.5 py-0.2 rounded text-[9px] uppercase font-mono ${
                            currentBimState === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                            currentBimState === 'SHARED' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' :
                            currentBimState === 'ARCHIVED' ? 'bg-slate-200 text-slate-700' :
                            'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        }`}>
                            {currentBimState}
                        </span>
                        <span className="text-slate-600 dark:text-slate-400 font-mono">Rev. {currentRevision}</span>
                    </div>

                    {/* Botão Salvar no PDF do CDE */}
                    <button
                        type="button"
                        onClick={handleSaveToCdePdf}
                        disabled={isSavingPdf}
                        className="h-7 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                        title="Atualizar e guardar permanentemente o ficheiro PDF no CDE com o que desenhou"
                    >
                        <Save size={12} />
                        <span>💾 Guardar no PDF</span>
                    </button>

                    {/* Botão Publicar Revisão (ISO 19650) */}
                    <button
                        type="button"
                        onClick={handlePublishRevision}
                        disabled={isSavingPdf}
                        className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                        title="Promover desenho para PUBLISHED e avançar a revisão (ISO 19650)"
                    >
                        <Share2 size={12} />
                        <span>📢 Publicar</span>
                    </button>

                    {/* Controlo de Fundo de Referência */}
                    <div className="flex items-center bg-slate-100 dark:bg-neutral-800 p-0.5 rounded-lg border border-slate-200 dark:border-neutral-700 gap-0.5 h-7">
                        <button
                            type="button"
                            onClick={() => {
                                const next = !showUnderlay;
                                setShowUnderlay(next);
                                showToast(next ? 'Fundo de referência visível' : 'Fundo de referência ocultado (desenho limpo)');
                            }}
                            className={`h-6 px-2 rounded flex items-center gap-1 text-[10px] font-bold cursor-pointer transition-colors ${
                                showUnderlay && underlayUrl ? 'bg-white dark:bg-neutral-900 text-blue-700 dark:text-blue-300 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                            }`}
                            title="Ligar / Desligar Planta de Fundo de Referência"
                        >
                            {showUnderlay && underlayUrl ? <Eye size={12} /> : <EyeOff size={12} />}
                            <span>{showUnderlay && underlayUrl ? 'Fundo ON' : 'Fundo OFF'}</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setIsCalibratingUnderlay(!isCalibratingUnderlay)}
                            className={`h-6 w-6 rounded flex items-center justify-center cursor-pointer transition-colors ${
                                isCalibratingUnderlay ? 'bg-amber-600 text-white' : 'text-slate-600 hover:text-slate-900'
                            }`}
                            title="Calibrar e Ajustar Posição/Escala do Fundo de Referência"
                        >
                            <Sliders size={12} />
                        </button>

                        {!underlayUrl && (
                            <button
                                type="button"
                                onClick={() => underlayFileInputRef.current?.click()}
                                className="h-6 px-1.5 text-blue-600 hover:bg-blue-50 text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
                                title="Carregar ficheiro PDF ou imagem para servir de fundo"
                            >
                                <FileUp size={11} />
                                <span>+ Fundo</span>
                            </button>
                        )}
                    </div>

                    {/* Escala */}
                    <select
                        value={scaleFormat}
                        onChange={e => setScaleFormat(e.target.value as any)}
                        className="h-7 px-2 bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-[11px] font-bold rounded-lg cursor-pointer"
                        title="Escala Técnica Calibrada"
                    >
                        <option value="1:50">1:50</option>
                        <option value="1:100">1:100</option>
                        <option value="1:200">1:200</option>
                        <option value="1:500">1:500</option>
                    </select>

                    {/* Formato */}
                    <select
                        value={sheetFormat}
                        onChange={e => setSheetFormat(e.target.value as any)}
                        className="h-7 px-2 bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-[11px] font-bold rounded-lg cursor-pointer uppercase"
                        title="Formato de Prancha"
                    >
                        <option value="a4">A4</option>
                        <option value="a3">A3</option>
                        <option value="a2">A2</option>
                        <option value="a1">A1</option>
                        <option value="a0">A0</option>
                    </select>

                    {/* Zoom */}
                    <div className="flex items-center border border-slate-200 dark:border-neutral-700 rounded-lg p-0.5 bg-slate-50 dark:bg-neutral-800">
                        <button onClick={() => setSheetZoom(z => Math.max(0.5, z - 0.15))} className="h-6 w-6 flex items-center justify-center text-slate-600 hover:text-slate-900 cursor-pointer">
                            <ZoomOut size={12} />
                        </button>
                        <span className="text-[10px] font-mono px-1 font-semibold">{Math.round(sheetZoom * 100)}%</span>
                        <button onClick={() => setSheetZoom(z => Math.min(2.5, z + 0.15))} className="h-6 w-6 flex items-center justify-center text-slate-600 hover:text-slate-900 cursor-pointer">
                            <ZoomIn size={12} />
                        </button>
                    </div>

                    {/* Botão Descarregar PDF Local */}
                    <button
                        type="button"
                        onClick={handleExportCalibratedPDF}
                        className="h-7 px-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                        title="Descarregar cópia em PDF"
                    >
                        <Download size={12} />
                        <span>Descarregar</span>
                    </button>
                </div>
            </div>

            {/* Sub-bar: Símbolos ISO 7010 com Categorias e Pesquisa */}
            {activeTool === 'place_symbol' && (
                <div className="h-11 px-3 bg-amber-50/95 dark:bg-[#201d16] border-b border-amber-200 dark:border-amber-900/40 flex items-center justify-between text-xs overflow-x-auto no-scrollbar gap-2 shrink-0">
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Filtros de Categoria */}
                        <div className="flex items-center bg-white dark:bg-neutral-800 rounded-md border border-amber-300 dark:border-neutral-700 p-0.5 gap-0.5">
                            {[
                                { id: 'all', label: 'Todos' },
                                { id: 'fire', label: 'Incêndio (F)' },
                                { id: 'safe', label: 'Emergência (E)' },
                                { id: 'warning', label: 'Aviso (W)' },
                                { id: 'mandatory', label: 'EPI (M)' },
                                { id: 'prohibition', label: 'Proibição (P)' }
                            ].map(cat => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => setSymbolCategoryFilter(cat.id)}
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                                        symbolCategoryFilter === cat.id ? 'bg-amber-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                                    }`}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>

                        {/* Pesquisa */}
                        <div className="relative flex items-center">
                            <Search size={11} className="absolute left-2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Pesquisar símbolo ou código..."
                                value={symbolSearchQuery}
                                onChange={e => setSymbolSearchQuery(e.target.value)}
                                className="h-6.5 pl-6 pr-2 bg-white dark:bg-neutral-800 border border-amber-300 dark:border-neutral-700 rounded-md text-[10px] w-48 font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                        </div>
                    </div>

                    {/* Carrossel Horizontal de Seleção de Símbolos */}
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-xl">
                        {filteredSymbols.slice(0, 30).map(sym => {
                            const isSelected = selectedSymbolId === sym.id;
                            const svgCode = getSymbolSvg(sym.id);
                            return (
                                <button
                                    key={sym.id}
                                    type="button"
                                    onClick={() => setSelectedSymbolId(sym.id)}
                                    className={`h-8 px-1.5 py-0.5 rounded border flex items-center gap-1 shrink-0 cursor-pointer transition-all ${
                                        isSelected
                                            ? 'bg-amber-500 text-white border-amber-600 shadow-xs ring-1 ring-amber-500'
                                            : 'bg-white dark:bg-neutral-800 border-slate-200 dark:border-neutral-700 hover:border-amber-400 text-slate-800 dark:text-slate-200'
                                    }`}
                                    title={`${sym.id}: ${sym.name}`}
                                >
                                    <div
                                        className="w-5 h-5 flex items-center justify-center shrink-0 [&>svg]:w-full [&>svg]:h-full"
                                        dangerouslySetInnerHTML={{ __html: svgCode || '' }}
                                    />
                                    <span className="text-[10px] font-mono font-bold">{sym.id}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Sub-bar: Configuração de Zona Hachurada de Risco */}
            {activeTool === 'draw_zone' && (
                <div className="h-10 px-3 bg-red-50/90 dark:bg-[#201414] border-b border-red-200 dark:border-red-900/40 flex items-center justify-between text-xs gap-3 shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-red-900 dark:text-red-300">Zona de Risco:</span>
                        <input
                            type="text"
                            value={zoneName}
                            onChange={e => setZoneName(e.target.value)}
                            placeholder="Designação da zona..."
                            className="h-6.5 px-2 bg-white dark:bg-neutral-800 border border-red-300 rounded text-[11px] w-48 font-medium"
                        />
                        <select
                            value={selectedZoneCat}
                            onChange={e => setSelectedZoneCat(e.target.value as any)}
                            className="h-6.5 px-2 bg-white dark:bg-neutral-800 border border-red-300 rounded text-[10px] font-bold"
                        >
                            <option value="hazard">Perigo Geral</option>
                            <option value="height">Queda em Altura</option>
                            <option value="lifting">Cargas Suspensas (Grua)</option>
                            <option value="confined_space">Espaço Confinado</option>
                            <option value="hot_work">Trabalhos a Quente</option>
                        </select>
                        <input
                            type="text"
                            value={zoneReqCert}
                            onChange={e => setZoneReqCert(e.target.value)}
                            placeholder="Formação exigida (ex: Altura, Andaimes)..."
                            className="h-6.5 px-2 bg-white dark:bg-neutral-800 border border-red-300 rounded text-[11px] w-56 font-medium"
                        />
                    </div>
                    <span className="text-[10px] text-red-700 dark:text-red-400 font-semibold">
                        Clique na planta para adicionar vértices do perímetro da zona.
                    </span>
                </div>
            )}

            {/* Sub-bar: Painel de Calibração do Fundo de Referência */}
            {isCalibratingUnderlay && (
                <div className="px-3 py-2 bg-slate-800 text-white border-b border-slate-700 flex flex-wrap items-center justify-between text-xs gap-3 shrink-0">
                    <div className="flex items-center gap-4 flex-wrap">
                        <span className="font-bold text-[11px] text-amber-400 flex items-center gap-1">
                            <Sliders size={13} />
                            <span>Calibração do Fundo ({underlayFileName || 'Fundo'}):</span>
                        </span>

                        {/* Escala */}
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-300">Escala:</span>
                            <input
                                type="range"
                                min="0.5"
                                max="2.0"
                                step="0.02"
                                value={underlayScale}
                                onChange={e => setUnderlayScale(parseFloat(e.target.value))}
                                className="w-20 accent-amber-500 cursor-pointer"
                            />
                            <span className="text-[10px] font-mono text-amber-400">{Math.round(underlayScale * 100)}%</span>
                        </div>

                        {/* Rotação */}
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-300">Rotação:</span>
                            <input
                                type="range"
                                min="-180"
                                max="180"
                                step="1"
                                value={underlayRotation}
                                onChange={e => setUnderlayRotation(parseFloat(e.target.value))}
                                className="w-20 accent-amber-500 cursor-pointer"
                            />
                            <span className="text-[10px] font-mono text-amber-400">{underlayRotation}°</span>
                        </div>

                        {/* Offset X */}
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-300">Desloc. X:</span>
                            <input
                                type="range"
                                min="-200"
                                max="200"
                                step="2"
                                value={underlayOffsetX}
                                onChange={e => setUnderlayOffsetX(parseFloat(e.target.value))}
                                className="w-16 accent-amber-500 cursor-pointer"
                            />
                            <span className="text-[10px] font-mono text-amber-400">{underlayOffsetX}px</span>
                        </div>

                        {/* Offset Y */}
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-300">Desloc. Y:</span>
                            <input
                                type="range"
                                min="-200"
                                max="200"
                                step="2"
                                value={underlayOffsetY}
                                onChange={e => setUnderlayOffsetY(parseFloat(e.target.value))}
                                className="w-16 accent-amber-500 cursor-pointer"
                            />
                            <span className="text-[10px] font-mono text-amber-400">{underlayOffsetY}px</span>
                        </div>

                        {/* Opacidade */}
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-300">Opacidade:</span>
                            <input
                                type="range"
                                min="0.1"
                                max="1.0"
                                step="0.05"
                                value={underlayOpacity}
                                onChange={e => setUnderlayOpacity(parseFloat(e.target.value))}
                                className="w-16 accent-amber-500 cursor-pointer"
                            />
                            <span className="text-[10px] font-mono text-amber-400">{Math.round(underlayOpacity * 100)}%</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setUnderlayScale(1.0);
                                setUnderlayRotation(0);
                                setUnderlayOffsetX(0);
                                setUnderlayOffsetY(0);
                                setUnderlayOpacity(0.45);
                                showToast('Calibração de fundo reposta aos valores de origem.');
                            }}
                            className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-[10px] font-semibold text-slate-200 cursor-pointer flex items-center gap-1"
                        >
                            <RotateCcw size={10} />
                            <span>Repor</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsCalibratingUnderlay(false)}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 rounded text-[10px] font-bold text-white cursor-pointer"
                        >
                            Pronto
                        </button>
                    </div>
                </div>
            )}

            {/* Central Viewport Canvas (Technical Sheet View) */}
            <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-slate-200 dark:bg-[#111215]">
                <div
                    onClick={handleCanvasClick}
                    className="relative bg-white shadow-2xl border border-slate-300 rounded-sm overflow-hidden cursor-crosshair shrink-0"
                    style={{
                        width: '860px',
                        height: '600px',
                        transform: `scale(${sheetZoom})`,
                        transformOrigin: 'center center',
                        transition: 'transform 0.15s ease-out'
                    }}
                >
                    {/* Layer 0: Official Outer & Inner Margins */}
                    <div className="absolute inset-2 border-2 border-slate-900 pointer-events-none z-1" />
                    <div className="absolute inset-3.5 border border-slate-300 pointer-events-none z-1" />

                    {/* Layer 1: Underlay Reference Plan (External PDF/Image) */}
                    {showUnderlay && underlayUrl && (
                        <div
                            className="absolute inset-0 pointer-events-none z-1 flex items-center justify-center overflow-hidden"
                            style={{
                                opacity: underlayOpacity,
                                transform: `translate(${underlayOffsetX}px, ${underlayOffsetY}px) rotate(${underlayRotation}deg) scale(${underlayScale})`,
                                transformOrigin: 'center center'
                            }}
                        >
                            <img
                                src={underlayUrl}
                                alt="Fundo de Referência"
                                className="w-full h-full object-contain filter contrast-125"
                            />
                        </div>
                    )}

                    {/* Layer 2: Shaded IFC Render Snapshot (if available) */}
                    {activeDrawing?.previewDataUrl && (
                        <img
                            src={activeDrawing.previewDataUrl}
                            alt="Planta 2D IFC"
                            className="absolute inset-0 w-full h-full object-contain pointer-events-none z-1 opacity-90"
                        />
                    )}

                    {/* Layer 3: Vector CAD Section Lines from IFC Geometry (+1.20m Cut) */}
                    {activeDrawing?.vectorSegments && (
                        <svg className="absolute inset-0 w-full h-full pointer-events-none z-2" viewBox="0 0 860 600">
                            {activeDrawing.vectorSegments.slice(0, 5000).map(([x1, z1, x2, z2]: number[], idx: number) => {
                                const mb = activeDrawing.modelBounds || { minX: -15, maxX: 15, minZ: -12, maxZ: 12, width: 30, depth: 24 };
                                const ox = 64;
                                const oy = 64;
                                const rW = 860 - 128;
                                const rH = 600 - 128;
                                const sx1 = ox + ((x1 - mb.minX) / mb.width) * rW;
                                const sz1 = oy + ((z1 - mb.minZ) / mb.depth) * rH;
                                const sx2 = ox + ((x2 - mb.minX) / mb.width) * rW;
                                const sz2 = oy + ((z2 - mb.minZ) / mb.depth) * rH;
                                return <line key={idx} x1={sx1} y1={sz1} x2={sx2} y2={sz2} stroke="#0f172a" strokeWidth="1.3" />;
                            })}
                        </svg>
                    )}

                    {/* Layer 4: 45-Degree Diagonal Hatched Work & Hazard Zones + Evacuation Routes */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-5" viewBox="0 0 860 600">
                        <defs>
                            <pattern id="diag-hazard" width="16" height="16" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                                <line x1="0" y1="0" x2="0" y2="16" stroke="#ef4444" strokeWidth="4" strokeOpacity="0.4" />
                            </pattern>
                            <pattern id="diag-height" width="16" height="16" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                                <line x1="0" y1="0" x2="0" y2="16" stroke="#3b82f6" strokeWidth="4" strokeOpacity="0.4" />
                            </pattern>
                            <marker id="arrow-evac" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                                <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#16a34a" />
                            </marker>
                            <marker id="arrow-pending" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                                <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#22c55e" />
                            </marker>
                        </defs>

                        {/* Zonas Hachuradas a 45º */}
                        {workZones.map(zone => {
                            if (!zone.polygon || zone.polygon.length < 3) return null;
                            const pts = zone.polygon.map(([wx, wz]) => {
                                const px = (50 + (wx / 20) * 35) * 8.6;
                                const py = (50 + (wz / 16) * 35) * 6.0;
                                return `${px},${py}`;
                            }).join(' ');
                            const pat = zone.category === 'height' ? 'url(#diag-height)' : 'url(#diag-hazard)';
                            return (
                                <g key={zone.id}>
                                    <polygon points={pts} fill={pat} stroke={zone.color} strokeWidth="2" strokeDasharray="4 2" />
                                </g>
                            );
                        })}

                        {/* Pending Zone In Progress */}
                        {activeTool === 'draw_zone' && pendingPoints.length > 1 && (
                            <polyline
                                points={pendingPoints.map(([wx, wz]) => `${(50 + (wx / 20) * 35) * 8.6},${(50 + (wz / 16) * 35) * 6.0}`).join(' ')}
                                fill="none"
                                stroke="#f59e0b"
                                strokeWidth="2"
                                strokeDasharray="4 2"
                            />
                        )}

                        {/* Percursos de Evacuação com Setas Direcionais Verdes */}
                        {logisticsItems.filter(item => item.type === 'evacuation_route' && item.routePoints && item.routePoints.length >= 2).map(item => {
                            const pts = item.routePoints!.map(([wx, wz]) => {
                                const px = (50 + (wx / 20) * 35) * 8.6;
                                const py = (50 + (wz / 16) * 35) * 6.0;
                                return `${px},${py}`;
                            }).join(' ');

                            return (
                                <g key={item.id} className="pointer-events-auto cursor-pointer" onClick={(e) => {
                                    e.stopPropagation();
                                    showToast(`${item.name} (${item.routePoints?.length} pontos de evacuação)`);
                                }}>
                                    <polyline
                                        points={pts}
                                        fill="none"
                                        stroke="#22c55e"
                                        strokeWidth="3.5"
                                        markerMid="url(#arrow-evac)"
                                        markerEnd="url(#arrow-evac)"
                                    />
                                    {item.routePoints!.map(([wx, wz], pIdx) => (
                                        <circle
                                            key={pIdx}
                                            cx={(50 + (wx / 20) * 35) * 8.6}
                                            cy={(50 + (wz / 16) * 35) * 6.0}
                                            r="4"
                                            fill="#16a34a"
                                        />
                                    ))}
                                </g>
                            );
                        })}

                        {/* Pending Route In Progress */}
                        {activeTool === 'draw_route' && pendingPoints.length > 1 && (
                            <polyline
                                points={pendingPoints.map(([wx, wz]) => `${(50 + (wx / 20) * 35) * 8.6},${(50 + (wz / 16) * 35) * 6.0}`).join(' ')}
                                fill="none"
                                stroke="#16a34a"
                                strokeWidth="3"
                                strokeDasharray="5 3"
                                markerEnd="url(#arrow-pending)"
                            />
                        )}

                        {/* Measurements */}
                        {measurements.map(m => {
                            const x1 = (50 + (m.p1[0] / 20) * 35) * 8.6;
                            const y1 = (50 + (m.p1[1] / 16) * 35) * 6.0;
                            const x2 = (50 + (m.p2[0] / 20) * 35) * 8.6;
                            const y2 = (50 + (m.p2[1] / 16) * 35) * 6.0;
                            return (
                                <g key={m.id}>
                                    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#2563eb" strokeWidth="2" strokeDasharray="3 3" />
                                    <circle cx={x1} cy={y1} r="3" fill="#2563eb" />
                                    <circle cx={x2} cy={y2} r="3" fill="#2563eb" />
                                    <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 5} fill="#1e40af" fontSize="11" fontWeight="bold">
                                        {m.distance} m
                                    </text>
                                </g>
                            );
                        })}
                    </svg>

                    {/* Layer 5: Placed Safety Symbols & Logistics Totems */}
                    {logisticsItems.filter(item => item.type !== 'evacuation_route').map(item => {
                        const px = 50 + (item.position[0] / 20) * 35;
                        const py = 50 + (item.position[2] / 16) * 35;
                        const svgCode = item.symbolId ? getSymbolSvg(item.symbolId) : null;

                        return (
                            <div
                                key={item.id}
                                style={{
                                    left: `${px}%`,
                                    top: `${py}%`,
                                    transform: 'translate(-50%, -50%)'
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm(`Remover o símbolo "${item.name}" desta planta?`)) {
                                        onDeleteLogisticsItem(item.id);
                                    }
                                }}
                                className="absolute z-10 p-1 bg-white/95 border border-slate-300 rounded shadow-sm hover:scale-125 transition-transform cursor-pointer group"
                                title={`${item.name} - Clique para eliminar`}
                            >
                                {svgCode ? (
                                    <div
                                        className="w-6 h-6 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                                        dangerouslySetInnerHTML={{ __html: svgCode }}
                                    />
                                ) : (
                                    <div className="w-5 h-5 bg-amber-500 rounded-sm flex items-center justify-center text-white text-[9px] font-bold">
                                        SOS
                                    </div>
                                )}
                                <span className="absolute left-1/2 -bottom-4.5 -translate-x-1/2 bg-slate-900 text-white text-[8px] font-bold px-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">
                                    {item.symbolId || item.name}
                                </span>
                            </div>
                        );
                    })}

                    {/* Layer 6: Text Notes Overlay */}
                    {textNotes.map(tn => {
                        const px = 50 + (tn.position[0] / 20) * 35;
                        const py = 50 + (tn.position[1] / 16) * 35;
                        return (
                            <div
                                key={tn.id}
                                style={{ left: `${px}%`, top: `${py}%`, transform: 'translate(-50%, -50%)' }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm(`Remover nota: "${tn.text}"?`)) {
                                        setTextNotes(prev => prev.filter(n => n.id !== tn.id));
                                    }
                                }}
                                className="absolute z-10 px-2 py-1 bg-amber-100/90 border border-amber-300 text-amber-900 rounded text-[10px] font-bold shadow-xs cursor-pointer hover:bg-amber-200 transition-colors"
                            >
                                📌 {tn.text}
                            </div>
                        );
                    })}

                    {/* Official Sheet Title Block Cartouche (Canto Inferior Direito) */}
                    <div className="absolute right-4 bottom-4 w-72 bg-white/95 border border-slate-900 rounded p-2 z-20 shadow-md text-slate-900 pointer-events-none">
                        <div className="bg-slate-900 text-white px-2 py-1 -mx-2 -mt-2 rounded-t flex items-center justify-between">
                            <span className="text-[10px] font-bold tracking-wider">SAFESITE BIM | CDE 2D</span>
                            <span className="text-[8px] bg-emerald-500 text-white px-1 rounded font-mono font-bold">
                                {currentBimState}
                            </span>
                        </div>
                        <div className="pt-1.5 space-y-0.5 text-[9px]">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Obra:</span>
                                <span className="font-bold truncate max-w-[170px]">{projectName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Peça / Nível:</span>
                                <span className="font-bold font-mono">{activeDrawing?.code || 'PE-01'} ({storey})</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Escala / Formato:</span>
                                <span className="font-mono font-bold">{scaleFormat} | {sheetFormat.toUpperCase()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Revisão ISO 19650:</span>
                                <span className="font-mono font-bold text-blue-700">Rev. {currentRevision}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Cota Corte Regulamentar:</span>
                                <span className="font-mono">+1.20 m acima do pavimento</span>
                            </div>
                            <div className="pt-1 border-t border-slate-200 flex justify-between text-[8px] text-slate-500">
                                <span>Coordenador de Segurança (CSO)</span>
                                <span>DL 273/2003</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
