'use client';

import React, { useState, useMemo, useRef } from 'react';
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
    RotateCcw,
    Eye,
    EyeOff,
    Sliders,
    Type,
    Ruler,
    Cloud,
    HardHat,
    FileUp,
    X,
    Move,
    Search,
    Plus,
    Flame,
    AlertTriangle,
    Info
} from 'lucide-react';
import { jsPDF } from 'jspdf';

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
    showToast
}: Bim2dSafetyEditorProps) {
    const [activeTool, setActiveTool] = useState<'navigate' | 'place_symbol' | 'draw_zone' | 'draw_route' | 'measure' | 'add_text' | 'cloud'>('navigate');
    
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
    const [activeNoteText, setActiveNoteText] = useState<string>('Aviso de Segurana: Manter passagem desimpedida');
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

    // Zoom & Print Options
    const [sheetZoom, setSheetZoom] = useState<number>(1);
    const [scaleFormat, setScaleFormat] = useState<'1:50' | '1:100' | '1:200' | '1:500'>(activeDrawing?.scale || '1:100');
    const [sheetFormat, setSheetFormat] = useState<'a4' | 'a3' | 'a2' | 'a1' | 'a0'>('a3');
    const underlayFileInputRef = useRef<HTMLInputElement | null>(null);

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
            showToast(`Planta de referncia "${file.name}" carregada! Use o boto 'Calibrar Fundo' para ajustar.`);
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
                notes: `Smbolo ${selectedSymbolId} afixado na planta`
            });
            showToast(`Smbolo "${selectedSymbolId}" afixado na planta e projetado no modelo 3D!`);
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
                showToast('Ponto inicial da medio marcado. Clique no segundo ponto.');
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
                showToast(`Distncia medida: ${dist} metros`);
            }
            return;
        }

        if (activeTool === 'add_text') {
            const noteText = prompt('Introduza o texto da nota tcnica de segurana:', activeNoteText);
            if (noteText && noteText.trim()) {
                const newNote: TextNoteItem = {
                    id: `n-${Date.now()}`,
                    text: noteText.trim(),
                    position: [normX, normZ],
                    category: activeNoteCat
                };
                setTextNotes(prev => [...prev, newNote]);
                showToast('Nota de segurana afixada na planta!');
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
            name: zoneName || 'Zona de Segurana',
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
        showToast(`Zona "${zoneName}" delimitada com exigncia de formao!`);
    };

    const handleFinishRoute = () => {
        if (pendingPoints.length < 2) {
            showToast('Marque pelo menos 2 pontos para criar uma rota de evacuao.');
            return;
        }
        onAddLogisticsItem({
            projectId,
            type: 'evacuation_route',
            name: 'Percurso de Evacuao Seguro',
            category: 'emergency',
            position: [pendingPoints[0][0], 0, pendingPoints[0][1]],
            routePoints: pendingPoints,
            storeyName: storey,
            symbolId: 'E001'
        });
        setPendingPoints([]);
        setActiveTool('navigate');
        showToast('Percurso de Evacuao registado na planta e projetado com setas 3D no modelo!');
    };

    // Calibrated PDF Export with or without background
    const handleExportCalibratedPDF = () => {
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: sheetFormat });
        const pW = sheetFormat === 'a1' ? 841 : sheetFormat === 'a2' ? 594 : sheetFormat === 'a4' ? 297 : 420;
        const pH = sheetFormat === 'a1' ? 594 : sheetFormat === 'a2' ? 420 : sheetFormat === 'a4' ? 210 : 297;
        const now = new Date();

        doc.setDrawColor(15, 23, 42);
        doc.setLineWidth(0.6);
        doc.rect(10, 10, pW - 20, pH - 20);
        doc.setLineWidth(0.2);
        doc.rect(12, 12, pW - 24, pH - 24);

        // Header Title Block
        doc.setFillColor(15, 23, 42);
        doc.rect(12, 12, pW - 24, 18, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('SAFESITE | PLANTA DE ESTALEIRO, PREVENO E EMERGNCIA (PSS / DL 273/2003)', 16, 23);

        doc.setTextColor(51, 65, 85);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.text(`Obra: ${projectName} | Piso: ${storey} | Escala: ${scaleFormat} | Formato: ${sheetFormat.toUpperCase()}`, 16, 36);
        doc.text(`Data: ${now.toLocaleDateString('pt-PT')} | Enquadramento: Decreto-Lei n. 273/2003 e ISO 7010`, 16, 41);

        // Underlay background image if active and requested
        if (showUnderlay && underlayUrl) {
            try {
                doc.addImage(underlayUrl, 'PNG', 20, 48, pW - 140, pH - 90);
            } catch (_) {}
        }

        // Technical approval block at bottom
        const finalY = pH - 38;
        doc.rect(16, finalY, 110, 24);
        doc.setFont('helvetica', 'bold');
        doc.text('COORDENAO DE SEGURANA (CSO)', 20, finalY + 7);
        doc.setFont('helvetica', 'normal');
        doc.text('Aprovado nos termos do DL 273/2003', 20, finalY + 13);
        doc.text('Assinatura: ___________________________', 20, finalY + 20);

        doc.save(`Planta_Estaleiro_${projectName.replace(/[^a-zA-Z0-9]/g, '_')}_${scaleFormat.replace(':', '_')}.pdf`);
        showToast('Planta de Estaleiro e Segurana exportada em PDF com sucesso!');
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

                    {/* Tool: Smbolo ISO 7010 */}
                    <button
                        type="button"
                        onClick={() => setActiveTool('place_symbol')}
                        className={`h-7 px-2.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                            activeTool === 'place_symbol' ? 'bg-amber-600 text-white shadow-xs' : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                        title="Afixar Smbolo Oficial ISO 7010 na Planta"
                    >
                        <ShieldAlert size={13} />
                        <span>+ Smbolo ISO</span>
                    </button>

                    {/* Tool: Rota de Evacuao */}
                    <button
                        type="button"
                        onClick={() => { setActiveTool('draw_route'); setPendingPoints([]); }}
                        className={`h-7 px-2.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                            activeTool === 'draw_route' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                        title="Desenhar Percurso de Evacuao com Setas Direcionais"
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

                    {/* Tool: Medio / Rgua */}
                    <button
                        type="button"
                        onClick={() => { setActiveTool('measure'); setPendingMeasureStart(null); }}
                        className={`h-7 px-2.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                            activeTool === 'measure' ? 'bg-blue-600 text-white shadow-xs' : 'bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200'
                        }`}
                        title="Medir Distncias Reais na Planta Calibrada"
                    >
                        <Ruler size={13} />
                        <span>Rgua</span>
                    </button>

                    {/* Tool: Anotao de Texto */}
                    <button
                        type="button"
                        onClick={() => setActiveTool('add_text')}
                        className={`h-7 px-2.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                            activeTool === 'add_text' ? 'bg-purple-600 text-white shadow-xs' : 'bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200'
                        }`}
                        title="Adicionar Nota Tcnica ou Aviso na Planta"
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

                {/* Right Controls: Fundo de Referncia, Escala, Formato, Impresso */}
                <div className="flex items-center gap-1.5 shrink-0">
                    {/* Controlo de Fundo de Referncia */}
                    <div className="flex items-center bg-slate-100 dark:bg-neutral-800 p-0.5 rounded-lg border border-slate-200 dark:border-neutral-700 gap-0.5 h-7">
                        <button
                            type="button"
                            onClick={() => {
                                const next = !showUnderlay;
                                setShowUnderlay(next);
                                showToast(next ? 'Fundo de referncia visvel' : 'Fundo de referncia ocultado (desenho limpo)');
                            }}
                            className={`h-6 px-2 rounded flex items-center gap-1 text-[10px] font-bold cursor-pointer transition-colors ${
                                showUnderlay && underlayUrl ? 'bg-white dark:bg-neutral-900 text-blue-700 dark:text-blue-300 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                            }`}
                            title="Ligar / Desligar Planta de Fundo de Referncia"
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
                            title="Calibrar e Ajustar Posio/Escala do Fundo de Referncia"
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
                        title="Escala Tcnica Calibrada"
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

                    {/* Boto Exportar PDF Oficial */}
                    <button
                        type="button"
                        onClick={handleExportCalibratedPDF}
                        className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                        title="Exportar Planta Calibrada com Carimbo e Cotas"
                    >
                        <Download size={12} />
                        <span>Imprimir</span>
                    </button>
                </div>
            </div>

            {/* Sub-bar: Smbolos ISO 7010 com Categorias e Pesquisa */}
            {activeTool === 'place_symbol' && (
                <div className="h-11 px-3 bg-amber-50/95 dark:bg-[#201d16] border-b border-amber-200 dark:border-amber-900/40 flex items-center justify-between text-xs overflow-x-auto no-scrollbar gap-2 shrink-0">
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Filtros de Categoria */}
                        <div className="flex items-center bg-white dark:bg-neutral-800 rounded-md border border-amber-300 dark:border-neutral-700 p-0.5 gap-0.5">
                            {[
                                { id: 'all', label: 'Todos' },
                                { id: 'fire', label: 'Incndio (F)' },
                                { id: 'safe', label: 'Emergncia (E)' },
                                { id: 'warning', label: 'Aviso (W)' },
                                { id: 'mandatory', label: 'EPI (M)' },
                                { id: 'prohibition', label: 'Proibio (P)' }
                            ].map(cat => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => setSymbolCategoryFilter(cat.id)}
                                    className={`px-1.5 py-0.5 text-[9px] font-bold rounded cursor-pointer ${
                                        symbolCategoryFilter === cat.id ? 'bg-amber-600 text-white' : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>

                        {/* Search Input */}
                        <div className="relative flex items-center">
                            <Search size={11} className="absolute left-1.5 text-slate-400" />
                            <input
                                type="text"
                                value={symbolSearchQuery}
                                onChange={e => setSymbolSearchQuery(e.target.value)}
                                placeholder="Pesquisar cdigo ou nome..."
                                className="h-6 pl-5 pr-2 bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded text-[10px] w-36 outline-none"
                            />
                        </div>

                        {/* Lista de Smbolos Filtrados */}
                        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 max-w-[480px]">
                            {filteredSymbols.slice(0, 30).map(sym => (
                                <button
                                    key={sym.id}
                                    type="button"
                                    onClick={() => setSelectedSymbolId(sym.id)}
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all border shrink-0 ${
                                        selectedSymbolId === sym.id ? 'bg-amber-600 text-white border-amber-600 shadow-xs' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                    }`}
                                    title={`${sym.id}: ${sym.name}`}
                                >
                                    {sym.id}
                                </button>
                            ))}
                        </div>
                    </div>
                    <span className="text-[10px] text-amber-800 dark:text-amber-300 font-semibold shrink-0">Clique na planta para posicionar</span>
                </div>
            )}

            {/* Sub-bar: Rota de Evacuao */}
            {activeTool === 'draw_route' && (
                <div className="h-10 px-3 bg-emerald-50/95 dark:bg-[#152518] border-b border-emerald-200 dark:border-emerald-900/40 flex items-center justify-between text-xs overflow-x-auto no-scrollbar gap-2 shrink-0">
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="font-bold text-emerald-900 dark:text-emerald-300 text-[11px]">Desenhar Percurso de Evacuao:</span>
                        <span className="text-[11px] text-emerald-800 dark:text-emerald-400">Clique na planta para marcar pontos. As setas e o traado verde sero gerados e projetados em 3D.</span>
                    </div>
                    {pendingPoints.length > 0 && (
                        <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">{pendingPoints.length} ponto(s)</span>
                            <button
                                type="button"
                                onClick={handleFinishRoute}
                                className="h-6 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold cursor-pointer"
                            >
                                Concluir Rota
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Sub-bar: Zonas Hachuradas */}
            {activeTool === 'draw_zone' && (
                <div className="h-10 px-3 bg-red-50/95 dark:bg-[#251515] border-b border-red-200 dark:border-red-900/40 flex items-center gap-3 text-xs overflow-x-auto shrink-0">
                    <span className="font-bold text-red-900 dark:text-red-300 text-[11px]">Tipo de Zona:</span>
                    <select
                        value={selectedZoneCat}
                        onChange={e => setSelectedZoneCat(e.target.value as any)}
                        className="h-6 px-1.5 bg-white dark:bg-neutral-800 border border-red-200 dark:border-red-800 rounded text-[11px] font-semibold"
                    >
                        <option value="hazard">Perigo Geral (DL 273/2003)</option>
                        <option value="height">Trabalhos em Altura</option>
                        <option value="lifting">Cargas Suspensas (Gruas)</option>
                        <option value="hot_work">Trabalhos a Quente</option>
                        <option value="confined_space">Espao Confinado</option>
                    </select>

                    <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">Formao Obrigatria:</span>
                        <input
                            type="text"
                            value={zoneReqCert}
                            onChange={e => setZoneReqCert(e.target.value)}
                            placeholder="Ex: Trabalhos em Altura..."
                            className="h-6 px-2 bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded text-[11px] w-48"
                        />
                    </div>
                </div>
            )}

            {/* Painel Flutuante de Calibrao e Ajuste da Planta de Fundo */}
            {isCalibratingUnderlay && (
                <div className="absolute top-14 right-4 z-30 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-300 dark:border-neutral-700 shadow-2xl w-80 space-y-3 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-neutral-800">
                        <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Sliders size={13} className="text-blue-600" />
                            Calibrao do Fundo de Referncia
                        </span>
                        <button onClick={() => setIsCalibratingUnderlay(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                            <X size={13} />
                        </button>
                    </div>

                    {underlayFileName && (
                        <div className="text-[10px] text-slate-500 truncate bg-slate-50 dark:bg-neutral-800 p-1.5 rounded">
                            Ficheiro: <strong>{underlayFileName}</strong>
                        </div>
                    )}

                    <div className="space-y-2 text-[11px]">
                        {/* Deslocamento X e Y */}
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[10px] text-slate-500 font-semibold">Offset X: {underlayOffsetX}px</label>
                                <input
                                    type="range"
                                    min="-300"
                                    max="300"
                                    value={underlayOffsetX}
                                    onChange={e => setUnderlayOffsetX(Number(e.target.value))}
                                    className="w-full h-1 bg-slate-200 dark:bg-neutral-700 rounded appearance-none cursor-pointer accent-blue-600"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-500 font-semibold">Offset Y: {underlayOffsetY}px</label>
                                <input
                                    type="range"
                                    min="-300"
                                    max="300"
                                    value={underlayOffsetY}
                                    onChange={e => setUnderlayOffsetY(Number(e.target.value))}
                                    className="w-full h-1 bg-slate-200 dark:bg-neutral-700 rounded appearance-none cursor-pointer accent-blue-600"
                                />
                            </div>
                        </div>

                        {/* Escala do Fundo */}
                        <div>
                            <label className="text-[10px] text-slate-500 font-semibold flex justify-between">
                                <span>Escala do Fundo</span>
                                <strong>{Math.round(underlayScale * 100)}%</strong>
                            </label>
                            <input
                                type="range"
                                min="0.4"
                                max="2.5"
                                step="0.02"
                                value={underlayScale}
                                onChange={e => setUnderlayScale(Number(e.target.value))}
                                className="w-full h-1 bg-slate-200 dark:bg-neutral-700 rounded appearance-none cursor-pointer accent-blue-600"
                            />
                        </div>

                        {/* Rotao do Fundo */}
                        <div>
                            <label className="text-[10px] text-slate-500 font-semibold flex justify-between">
                                <span>Rotao</span>
                                <strong>{underlayRotation}</strong>
                            </label>
                            <input
                                type="range"
                                min="-180"
                                max="180"
                                step="1"
                                value={underlayRotation}
                                onChange={e => setUnderlayRotation(Number(e.target.value))}
                                className="w-full h-1 bg-slate-200 dark:bg-neutral-700 rounded appearance-none cursor-pointer accent-blue-600"
                            />
                        </div>

                        {/* Opacidade */}
                        <div>
                            <label className="text-[10px] text-slate-500 font-semibold flex justify-between">
                                <span>Opacidade da Planta de Fundo</span>
                                <strong>{Math.round(underlayOpacity * 100)}%</strong>
                            </label>
                            <input
                                type="range"
                                min="0.05"
                                max="1"
                                step="0.05"
                                value={underlayOpacity}
                                onChange={e => setUnderlayOpacity(Number(e.target.value))}
                                className="w-full h-1 bg-slate-200 dark:bg-neutral-700 rounded appearance-none cursor-pointer accent-blue-600"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 pt-1 border-t border-slate-200 dark:border-neutral-800">
                        <button
                            type="button"
                            onClick={() => {
                                setUnderlayOffsetX(0);
                                setUnderlayOffsetY(0);
                                setUnderlayScale(1);
                                setUnderlayRotation(0);
                            }}
                            className="flex-1 py-1 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 rounded text-slate-700 cursor-pointer"
                        >
                            Repor Centro
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setUnderlayUrl(null);
                                setUnderlayFileName(null);
                                setIsCalibratingUnderlay(false);
                                showToast('Planta de fundo removida.');
                            }}
                            className="flex-1 py-1 text-[10px] font-bold bg-red-50 hover:bg-red-100 text-red-600 rounded cursor-pointer"
                        >
                            Remover Fundo
                        </button>
                    </div>
                </div>
            )}

            {/* Central Drawing Surface */}
            <div className="flex-1 overflow-auto flex items-center justify-center p-4 relative">
                <div
                    onClick={handleCanvasClick}
                    style={{
                        transform: `scale(${sheetZoom})`,
                        transformOrigin: 'center center',
                        transition: 'transform 0.15s ease-out'
                    }}
                    className="relative w-[860px] h-[600px] bg-white dark:bg-[#16181b] border-2 border-slate-400 dark:border-neutral-700 shadow-2xl rounded-xs cursor-crosshair overflow-hidden shrink-0"
                >
                    {/* Layer 0: Planta de Fundo de Referncia (Underlay Calibrvel com Opacidade e Rotao) */}
                    {showUnderlay && underlayUrl && (
                        <div
                            style={{
                                transform: `translate(${underlayOffsetX}px, ${underlayOffsetY}px) scale(${underlayScale}) rotate(${underlayRotation}deg)`,
                                transformOrigin: 'center center',
                                opacity: underlayOpacity
                            }}
                            className="absolute inset-0 pointer-events-none select-none z-0 flex items-center justify-center"
                        >
                            <img
                                src={underlayUrl}
                                alt="Planta de Fundo de Referncia"
                                className="w-full h-full object-contain"
                            />
                        </div>
                    )}

                    {/* Layer 1: Background Technical Plan (Render Shaded do Modelo IFC) */}
                    {activeDrawing?.previewDataUrl && (
                        <img
                            src={activeDrawing.previewDataUrl}
                            alt="Planta de Fundo IFC"
                            className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-1"
                        />
                    )}

                    {/* Layer 2: Vector CAD Section Lines from IFC Geometry */}
                    {activeDrawing?.vectorSegments && (
                        <svg className="absolute inset-0 w-full h-full pointer-events-none z-2" viewBox="0 0 860 600">
                            {activeDrawing.vectorSegments.slice(0, 4000).map(([x1, z1, x2, z2]: number[], idx: number) => {
                                const mb = activeDrawing.modelBounds || { minX: -12, maxX: 12, minZ: -10, maxZ: 10, width: 24, depth: 20 };
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

                    {/* Layer 3: 45-Degree Diagonal Hatched Work & Hazard Zones + Evacuation Routes */}
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

                        {/* Zonas Hachuradas a 45 */}
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

                        {/* Percursos de Evacuao com Setas Direcionais Verdes */}
                        {logisticsItems.filter(item => item.type === 'evacuation_route' && item.routePoints && item.routePoints.length >= 2).map(item => {
                            const pts = item.routePoints!.map(([wx, wz]) => {
                                const px = (50 + (wx / 20) * 35) * 8.6;
                                const py = (50 + (wz / 16) * 35) * 6.0;
                                return `${px},${py}`;
                            }).join(' ');

                            return (
                                <g key={item.id} className="pointer-events-auto cursor-pointer" onClick={(e) => {
                                    e.stopPropagation();
                                    showToast(`${item.name} (${item.routePoints?.length} pontos de evacuao)`);
                                }}>
                                    <polyline
                                        points={pts}
                                        fill="none"
                                        stroke="#22c55e"
                                        strokeWidth="8"
                                        strokeOpacity="0.28"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                    <polyline
                                        points={pts}
                                        fill="none"
                                        stroke="#15803d"
                                        strokeWidth="3"
                                        strokeDasharray="8 5"
                                        markerEnd="url(#arrow-evac)"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                    {item.routePoints!.map(([wx, wz], idx) => {
                                        const px = (50 + (wx / 20) * 35) * 8.6;
                                        const py = (50 + (wz / 16) * 35) * 6.0;
                                        const isLast = idx === item.routePoints!.length - 1;
                                        return (
                                            <g key={idx}>
                                                <circle
                                                    cx={px}
                                                    cy={py}
                                                    r={isLast ? 6 : 4}
                                                    fill={isLast ? "#16a34a" : "#22c55e"}
                                                    stroke="#ffffff"
                                                    strokeWidth="1.5"
                                                />
                                                {isLast && (
                                                    <text
                                                        x={px + 8}
                                                        y={py + 3}
                                                        fontSize="10"
                                                        fontWeight="bold"
                                                        fill="#15803d"
                                                        className="select-none"
                                                    >
                                                        SADA
                                                    </text>
                                                )}
                                            </g>
                                        );
                                    })}
                                </g>
                            );
                        })}

                        {/* Pending Route In Progress */}
                        {activeTool === 'draw_route' && pendingPoints.length >= 1 && (
                            <g>
                                {pendingPoints.length >= 2 && (
                                    <polyline
                                        points={pendingPoints.map(([wx, wz]) => `${(50 + (wx / 20) * 35) * 8.6},${(50 + (wz / 16) * 35) * 6.0}`).join(' ')}
                                        fill="none"
                                        stroke="#22c55e"
                                        strokeWidth="3"
                                        strokeDasharray="6 4"
                                        markerEnd="url(#arrow-pending)"
                                    />
                                )}
                                {pendingPoints.map(([wx, wz], idx) => (
                                    <circle
                                        key={idx}
                                        cx={(50 + (wx / 20) * 35) * 8.6}
                                        cy={(50 + (wz / 16) * 35) * 6.0}
                                        r="4"
                                        fill="#22c55e"
                                        stroke="#ffffff"
                                        strokeWidth="1.5"
                                    />
                                ))}
                            </g>
                        )}

                        {/* Medies / Cotas na Planta */}
                        {measurements.map(m => {
                            const x1 = (50 + (m.p1[0] / 20) * 35) * 8.6;
                            const y1 = (50 + (m.p1[1] / 16) * 35) * 6.0;
                            const x2 = (50 + (m.p2[0] / 20) * 35) * 8.6;
                            const y2 = (50 + (m.p2[1] / 16) * 35) * 6.0;
                            const mx = (x1 + x2) / 2;
                            const my = (y1 + y2) / 2;
                            return (
                                <g key={m.id} className="pointer-events-auto">
                                    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#2563eb" strokeWidth="1.8" strokeDasharray="3 2" />
                                    <circle cx={x1} cy={y1} r="3" fill="#2563eb" />
                                    <circle cx={x2} cy={y2} r="3" fill="#2563eb" />
                                    <rect x={mx - 24} y={my - 9} width="48" height="18" rx="4" fill="#1e3a8a" fillOpacity="0.9" />
                                    <text x={mx} y={my + 3} textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">
                                        {m.distance}m
                                    </text>
                                </g>
                            );
                        })}
                    </svg>

                    {/* Layer 4: Smbolos ISO 7010 Afixados */}
                    {logisticsItems.map(item => {
                        const px = 50 + (item.position[0] / 20) * 35;
                        const py = 50 + (item.position[2] / 16) * 35;
                        const svgCode = item.symbolId ? getSymbolSvg(item.symbolId) : null;

                        return (
                            <div
                                key={item.id}
                                style={{ left: `${px}%`, top: `${py}%` }}
                                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center cursor-pointer group z-10"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    showToast(`${item.name} [${item.position[0]}, ${item.position[2]}]`);
                                }}
                            >
                                {svgCode ? (
                                    <div
                                        className="w-7 h-7 rounded shadow-md overflow-hidden bg-white p-0.5 border border-slate-300 group-hover:scale-125 transition-transform"
                                        dangerouslySetInnerHTML={{ __html: svgCode }}
                                    />
                                ) : (
                                    <div className="w-6 h-6 rounded bg-amber-500 text-white font-bold text-[9px] flex items-center justify-center shadow-md">
                                        EST
                                    </div>
                                )}
                                <span className="text-[8px] font-bold text-slate-800 dark:text-slate-200 bg-white/95 px-1.5 py-0.5 rounded shadow-2xs mt-0.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity border border-slate-200">
                                    {item.name}
                                </span>
                            </div>
                        );
                    })}

                    {/* Layer 5: Notas Tcnicas de Texto */}
                    {textNotes.map(n => {
                        const px = 50 + (n.position[0] / 20) * 35;
                        const py = 50 + (n.position[1] / 16) * 35;
                        return (
                            <div
                                key={n.id}
                                style={{ left: `${px}%`, top: `${py}%` }}
                                className="absolute -translate-x-1/2 -translate-y-1/2 z-15 bg-amber-50 border border-amber-300 shadow-md px-2 py-1 rounded text-[10px] text-amber-900 font-semibold max-w-[180px] leading-tight"
                            >
                                {n.text}
                            </div>
                        );
                    })}

                    {/* Cartouche Tcnico Regulamentar (ISO 19650 / DL 273/2003) */}
                    <div className="absolute bottom-3 right-3 z-20 pointer-events-none bg-slate-900/90 text-white text-[10px] px-3.5 py-2 rounded-lg border border-slate-700 shadow-xl flex items-center gap-2.5 backdrop-blur-xs">
                        <span className="font-bold text-blue-400 font-mono">{scaleFormat}</span>
                        <span></span>
                        <span className="font-semibold">{projectName}</span>
                        <span></span>
                        <span>{storey}</span>
                        <span></span>
                        <span className="text-emerald-400 font-bold uppercase font-mono">{sheetFormat.toUpperCase()}</span>
                        {showUnderlay && underlayUrl && (
                            <>
                                <span></span>
                                <span className="text-amber-400 text-[9px]">Fundo Calibrado</span>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
