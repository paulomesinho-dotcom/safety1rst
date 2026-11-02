'use client';

import React, { useState } from 'react';
import { ALL_SAFETY_SYMBOLS, getSymbolSvg } from '@/lib/safety-symbols';
import { SiteLogisticsItem, SiteWorkZone } from '@/types';
import { ShieldAlert, Route, Grid, Download, Trash2, Check, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { jsPDF } from 'jspdf';

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
    const [activeTool, setActiveTool] = useState<'navigate' | 'place_symbol' | 'draw_zone' | 'draw_route'>('navigate');
    const [selectedSymbolId, setSelectedSymbolId] = useState<string>('F001');
    const [selectedZoneCat, setSelectedZoneCat] = useState<SiteWorkZone['category']>('hazard');
    const [zoneName, setZoneName] = useState<string>('Zona de Risco');
    const [zoneReqCert, setZoneReqCert] = useState<string>('Trabalhos em Altura');
    const [pendingPoints, setPendingPoints] = useState<[number, number][]>([]);
    const [sheetZoom, setSheetZoom] = useState<number>(1);
    const [scaleFormat, setScaleFormat] = useState<'1:50' | '1:100' | '1:200'>('1:100');
    const [sheetFormat, setSheetFormat] = useState<'a4' | 'a3' | 'a1'>('a3');

    const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
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
                notes: `Símbolo ${selectedSymbolId} implantado na planta`
            });
            showToast(`Símbolo "${selectedSymbolId}" afixado na planta!`);
            return;
        }

        if (activeTool === 'draw_zone' || activeTool === 'draw_route') {
            const next = [...pendingPoints, [normX, normZ] as [number, number]];
            setPendingPoints(next);
            showToast(`Ponto ${next.length} adicionado. Clique 'Concluir' quando terminar.`);
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
            showToast('Marque pelo menos 2 pontos para criar uma rota.');
            return;
        }
        onAddLogisticsItem({
            projectId,
            type: 'evacuation_route',
            name: 'Percurso de Evacuação Seguro',
            category: 'emergency',
            position: [pendingPoints[0][0], 0, pendingPoints[0][1]],
            routePoints: pendingPoints,
            storeyName: storey,
            symbolId: 'E001'
        });
        setPendingPoints([]);
        setActiveTool('navigate');
        showToast('Percurso de Evacuação registado na planta!');
    };

    const handleExportCalibratedPDF = () => {
        const isA1 = sheetFormat === 'a1';
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: sheetFormat });
        const pW = isA1 ? 841 : sheetFormat === 'a4' ? 297 : 420;
        const pH = isA1 ? 594 : sheetFormat === 'a4' ? 210 : 297;
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
        doc.text('SAFESITE | PLANTA DE ESTALEIRO, PREVENÇÃO E EMERGÊNCIA (PSS / DL 273/2003)', 16, 23);

        doc.setTextColor(51, 65, 85);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.text(`Obra: ${projectName} | Piso: ${storey} | Escala Calibrada: ${scaleFormat}`, 16, 36);
        doc.text(`Data: ${now.toLocaleDateString('pt-PT')} | Enquadramento: DL 273/2003 e ISO 7010`, 16, 41);

        // Technical approval block at bottom
        const finalY = pH - 38;
        doc.rect(16, finalY, 110, 24);
        doc.setFont('helvetica', 'bold');
        doc.text('COORDENAÇÃO DE SEGURANÇA (CSO)', 20, finalY + 7);
        doc.setFont('helvetica', 'normal');
        doc.text('Aprovado nos termos do DL 273/2003', 20, finalY + 13);
        doc.text('Assinatura: ___________________________', 20, finalY + 20);

        doc.save(`Planta_Estaleiro_${projectName.replace(/[^a-zA-Z0-9]/g, '_')}_${scaleFormat.replace(':', '_')}.pdf`);
        showToast('Planta de Estaleiro e Segurança exportada em PDF com sucesso!');
    };

    return (
        <div className="flex flex-col h-full w-full bg-slate-100 dark:bg-neutral-900 select-none overflow-hidden">
            {/* Top Toolbar with Calibrated Scale & Tools */}
            <div className="h-12 px-3 bg-white dark:bg-[#1a1b1e] border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between gap-2 shrink-0 z-20">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                    <button
                        type="button"
                        onClick={() => setActiveTool('navigate')}
                        className={`h-7 px-2.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                            activeTool === 'navigate' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700 hover:bg-slate-200'
                        }`}
                    >
                        <span>Navegar</span>
                    </button>

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

                    <button
                        type="button"
                        onClick={() => { setActiveTool('draw_zone'); setPendingPoints([]); }}
                        className={`h-7 px-2.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                            activeTool === 'draw_zone' ? 'bg-red-600 text-white shadow-xs' : 'bg-red-50 hover:bg-red-100 text-red-800 border border-red-200'
                        }`}
                        title="Desenhar Zona Hachurada de Risco / Requisito de Formação"
                    >
                        <Grid size={13} />
                        <span>+ Zona de Risco</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => { setActiveTool('draw_route'); setPendingPoints([]); }}
                        className={`h-7 px-2.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                            activeTool === 'draw_route' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                        title="Desenhar Percurso de Evacuação Dinâmico"
                    >
                        <Route size={13} />
                        <span>+ Percurso Fuga</span>
                    </button>

                    {(activeTool === 'draw_zone' || activeTool === 'draw_route') && pendingPoints.length > 0 && (
                        <div className="flex items-center gap-1 pl-1 border-l border-slate-200">
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

                {/* Calibrated Scale, Format & Print Controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                    <select
                        value={scaleFormat}
                        onChange={e => setScaleFormat(e.target.value as any)}
                        className="h-7 px-2 bg-white dark:bg-neutral-800 border border-slate-200 text-[11px] font-bold rounded-lg cursor-pointer"
                        title="Escala Técnica de Impressão"
                    >
                        <option value="1:50">Escala 1:50</option>
                        <option value="1:100">Escala 1:100</option>
                        <option value="1:200">Escala 1:200</option>
                    </select>

                    <select
                        value={sheetFormat}
                        onChange={e => setSheetFormat(e.target.value as any)}
                        className="h-7 px-2 bg-white dark:bg-neutral-800 border border-slate-200 text-[11px] font-bold rounded-lg cursor-pointer"
                        title="Formato de Prancha"
                    >
                        <option value="a4">A4</option>
                        <option value="a3">A3</option>
                        <option value="a1">A1</option>
                    </select>

                    <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50 dark:bg-neutral-800">
                        <button onClick={() => setSheetZoom(z => Math.max(0.6, z - 0.15))} className="h-6 w-6 flex items-center justify-center text-slate-600 hover:text-slate-900 cursor-pointer">
                            <ZoomOut size={12} />
                        </button>
                        <span className="text-[10px] font-mono px-1 font-semibold">{Math.round(sheetZoom * 100)}%</span>
                        <button onClick={() => setSheetZoom(z => Math.min(2.0, z + 0.15))} className="h-6 w-6 flex items-center justify-center text-slate-600 hover:text-slate-900 cursor-pointer">
                            <ZoomIn size={12} />
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={handleExportCalibratedPDF}
                        className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                    >
                        <Download size={12} />
                        <span>Imprimir Planta</span>
                    </button>
                </div>
            </div>

            {/* Sub-bar for Symbol Selection or Zone Configuration */}
            {activeTool === 'place_symbol' && (
                <div className="h-10 px-3 bg-amber-50/90 border-b border-amber-200 flex items-center justify-between text-xs overflow-x-auto no-scrollbar gap-2 shrink-0">
                    <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-bold text-amber-900 text-[11px]">Símbolo Ativo:</span>
                        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 max-w-[550px]">
                            {ALL_SAFETY_SYMBOLS.slice(0, 20).map(sym => (
                                <button
                                    key={sym.id}
                                    type="button"
                                    onClick={() => setSelectedSymbolId(sym.id)}
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all border ${
                                        selectedSymbolId === sym.id ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-slate-700 border-slate-200'
                                    }`}
                                    title={`${sym.id}: ${sym.name}`}
                                >
                                    {sym.id} - {sym.name.slice(0, 14)}
                                </button>
                            ))}
                        </div>
                    </div>
                    <span className="text-[10px] text-amber-800 shrink-0">Clique na planta para posicionar</span>
                </div>
            )}

            {activeTool === 'draw_route' && (
                <div className="h-10 px-3 bg-emerald-50/90 border-b border-emerald-200 flex items-center justify-between text-xs overflow-x-auto no-scrollbar gap-2 shrink-0">
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="font-bold text-emerald-900 text-[11px]">Desenhar Percurso de Evacuação:</span>
                        <span className="text-[11px] text-emerald-800">Clique na planta para marcar os pontos. As setas direcionais e sinalização ISO serão criadas em 2D e projetadas em 3D.</span>
                    </div>
                    {pendingPoints.length > 0 && (
                        <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[11px] font-bold text-emerald-800">{pendingPoints.length} ponto(s) marcado(s)</span>
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

            {activeTool === 'draw_zone' && (
                <div className="h-10 px-3 bg-red-50/90 border-b border-red-200 flex items-center gap-3 text-xs overflow-x-auto shrink-0">
                    <span className="font-bold text-red-900 text-[11px]">Tipo de Zona:</span>
                    <select
                        value={selectedZoneCat}
                        onChange={e => setSelectedZoneCat(e.target.value as any)}
                        className="h-6 px-1.5 bg-white border border-red-200 rounded text-[11px] font-semibold"
                    >
                        <option value="hazard">Perigo Geral</option>
                        <option value="height">Trabalhos em Altura</option>
                        <option value="lifting">Cargas Suspensas</option>
                        <option value="hot_work">Trabalhos a Quente</option>
                        <option value="confined_space">Espaço Confinado</option>
                    </select>

                    <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-700 text-[11px]">Formação Obrigatória:</span>
                        <input
                            type="text"
                            value={zoneReqCert}
                            onChange={e => setZoneReqCert(e.target.value)}
                            placeholder="Ex: Trabalhos em Altura..."
                            className="h-6 px-2 bg-white border border-slate-200 rounded text-[11px] w-48"
                        />
                    </div>
                </div>
            )}

            {/* Central Drawing Surface */}
            <div className="flex-1 overflow-auto flex items-center justify-center p-4">
                <div
                    onClick={handleCanvasClick}
                    style={{
                        transform: `scale(${sheetZoom})`,
                        transformOrigin: 'center center',
                        transition: 'transform 0.15s ease-out'
                    }}
                    className="relative w-[860px] h-[600px] bg-white dark:bg-[#16181b] border-2 border-slate-400 dark:border-neutral-700 shadow-2xl rounded-xs cursor-crosshair overflow-hidden shrink-0"
                >
                    {/* Background Technical Plan (IFC Render or PDF) */}
                    {activeDrawing?.previewDataUrl ? (
                        <img
                            src={activeDrawing.previewDataUrl}
                            alt="Planta de Fundo"
                            className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0"
                        />
                    ) : currentPdfUrl ? (
                        <iframe
                            src={`${currentPdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                            title="Planta PDF"
                            className="absolute inset-0 w-full h-full border-none pointer-events-none select-none z-0 bg-white"
                        />
                    ) : (
                        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" xmlns="http://www.w3.org/2000/svg">
                            <rect width="100%" height="100%" fill="#f8fafc" />
                            <rect x="20" y="20" width="820" height="560" fill="none" stroke="#0f172a" strokeWidth="1.5" />
                        </svg>
                    )}

                    {/* Vector Section Lines if extracted from IFC */}
                    {activeDrawing?.vectorSegments && (
                        <svg className="absolute inset-0 w-full h-full pointer-events-none z-1" viewBox="0 0 860 600">
                            {activeDrawing.vectorSegments.slice(0, 3000).map(([x1, z1, x2, z2]: number[], idx: number) => {
                                const mb = activeDrawing.modelBounds || { minX: -12, maxX: 12, minZ: -10, maxZ: 10, width: 24, depth: 20 };
                                const ox = 64;
                                const oy = 64;
                                const rW = 860 - 128;
                                const rH = 600 - 128;
                                const sx1 = ox + ((x1 - mb.minX) / mb.width) * rW;
                                const sz1 = oy + ((z1 - mb.minZ) / mb.depth) * rH;
                                const sx2 = ox + ((x2 - mb.minX) / mb.width) * rW;
                                const sz2 = oy + ((z2 - mb.minZ) / mb.depth) * rH;
                                return <line key={idx} x1={sx1} y1={sz1} x2={sx2} y2={sz2} stroke="#0f172a" strokeWidth="1.2" />;
                            })}
                        </svg>
                    )}

                    {/* 45-Degree Diagonal Hatched Work & Hazard Zones + Evacuation Routes */}
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

                        {/* Evacuation Routes (Setas e Percursos de Fuga com Traçado Verde e Setas Direcionais) */}
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
                                    {/* Glowing green route corridor */}
                                    <polyline
                                        points={pts}
                                        fill="none"
                                        stroke="#22c55e"
                                        strokeWidth="8"
                                        strokeOpacity="0.28"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                    {/* Main directional route with arrowhead at the end */}
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
                                    {/* Waypoint circle markers */}
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
                                                        SAÍDA
                                                    </text>
                                                )}
                                            </g>
                                        );
                                    })}
                                </g>
                            );
                        })}

                        {/* Pending Evacuation Route In Progress */}
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
                    </svg>

                    {/* Deployed Logistics & Safety Symbols */}
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
                                <span className="text-[8px] font-bold text-slate-800 dark:text-slate-200 bg-white/90 px-1 rounded shadow-2xs mt-0.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                                    {item.name}
                                </span>
                            </div>
                        );
                    })}

                    {/* Official Cartouche / Technical Block at bottom-right */}
                    <div className="absolute bottom-3 right-3 z-20 pointer-events-none bg-slate-900/90 text-white text-[10px] px-3 py-1.5 rounded-md border border-slate-700 shadow-lg flex items-center gap-2">
                        <span className="font-bold text-blue-400">{scaleFormat}</span>
                        <span>•</span>
                        <span className="font-semibold">{projectName}</span>
                        <span>•</span>
                        <span>{storey}</span>
                        <span>•</span>
                        <span className="text-emerald-400 font-bold uppercase">{sheetFormat.toUpperCase()}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
