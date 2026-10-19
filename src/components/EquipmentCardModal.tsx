import React, { useRef, useState, useEffect } from 'react';
import { Modal, PrimaryButton } from './Modal';
import type { Equipment, Company, Project } from '../types';
import { getEquipmentTypeLabel, getEquipmentTypeIcon } from '@/lib/equipment-ifc-map';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, ToggleLeft, ToggleRight, LayoutTemplate, HardHat, GripHorizontal, Image as ImageIcon, Save, Layers, Palette, MonitorPlay, Wrench, Calendar, Gauge } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { DndContext, useDraggable, useSensor, useSensors, MouseSensor, TouchSensor, type DragEndEvent } from '@dnd-kit/core';
import { restrictToParentElement } from '@dnd-kit/modifiers';

const PRESET_DESIGNS = [
    {
        id: 'standard',
        name: 'Standard Inventory',
        description: 'Clean layout with focus on identification.',
        previewColor: '#e5e7eb',
        config: {
            orientation: 'landscape',
            cardBgColor: '#ffffff',
            textColor: '#111827',
            bottomBarColor: '#374151',
            bottomBarHeight: 60,
            positions: {
                project: { x: 30, y: 30 },
                company: { x: 30, y: 80 },
                info: { x: 30, y: 140 }, // Name & Type
                details: { x: 30, y: 220 }, // Brand & Model
                qr: { x: 440, y: 40 },
                photo: { x: 310, y: 30 },
                maintenance: { x: 30, y: 280 }, // Next Maintenance
                bottomBar: { x: 0, y: 320 }
            },
            scales: { photo: 1.0, info: 1.0, project: 1.1, company: 1.0, qr: 1.0, details: 1.0, maintenance: 1.0 },
            visible: { project: true, company: true, type: true, details: true, maintenance: true, bottomBar: true, photo: false }
        }
    },
    {
        id: 'safety',
        name: 'Safety Tag',
        description: 'High visibility yellow for site equipment.',
        previewColor: '#facc15',
        config: {
            orientation: 'landscape',
            cardBgColor: '#fefce8',
            textColor: '#111827',
            bottomBarColor: '#facc15',
            bottomBarHeight: 60,
            positions: {
                project: { x: 30, y: 30 },
                company: { x: 30, y: 70 },
                info: { x: 30, y: 130 },
                details: { x: 30, y: 200 },
                qr: { x: 440, y: 40 },
                photo: { x: 310, y: 30 },
                maintenance: { x: 30, y: 270 },
                bottomBar: { x: 0, y: 320 }
            },
            scales: { photo: 1.0, info: 1.0, project: 1.0, company: 1.0, qr: 1.0, details: 1.0, maintenance: 1.1 },
            visible: { project: true, company: true, type: true, details: true, maintenance: true, bottomBar: true, photo: false }
        }
    }
];

interface EquipmentCardModalProps {
    isOpen: boolean;
    onClose: () => void;
    equipment: Equipment;
    company?: Company;
    project?: Project;
}

// Draggable Wrapper Component
const DraggableItem: React.FC<{
    id: string;
    left: number;
    top: number;
    children: React.ReactNode;
    visible: boolean;
}> = ({ id, left, top, children, visible }) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });

    if (!visible) return null;

    const style: React.CSSProperties = {
        position: 'absolute',
        left: left,
        top: top,
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        cursor: 'move',
        zIndex: 10,
        touchAction: 'none'
    };

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="hover:outline hover:outline-1 hover:outline-blue-400 group">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-primary-light0 text-white rounded-full p-0.5 z-20">
                <GripHorizontal size={12} />
            </div>
            {children}
        </div>
    );
};

export const EquipmentCardModal: React.FC<EquipmentCardModalProps> = ({ isOpen, onClose, equipment, company, project }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [activeTab, setActiveTab] = useState<'templates' | 'style' | 'elements' | 'scaling'>('templates');

    // Design State
    const [cardBgColor, setCardBgColor] = useState('#ffffff');
    const [textColor, setTextColor] = useState('#111827');
    const [bottomBarColor, setBottomBarColor] = useState('#374151');
    const [bgImage, setBgImage] = useState<string | null>(null);
    const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
    const [bottomBarHeight, setBottomBarHeight] = useState(60);

    // Individual Scales
    const [scales, setScales] = useState({
        photo: 1,
        info: 1,
        project: 1,
        company: 1,
        qr: 1,
        details: 1,
        maintenance: 1
    });

    // Toggles
    const [showProject, setShowProject] = useState(true);
    const [showCompany, setShowCompany] = useState(true);
    const [showType, setShowType] = useState(true);
    const [showDetails, setShowDetails] = useState(true); // Brand/Model/Serial
    const [showMaintenance, setShowMaintenance] = useState(true);
    const [showBottomBar, setShowBottomBar] = useState(true);
    const [showPhoto, setShowPhoto] = useState(false); // Default false for equipment usually
    const [exportFormat, setExportFormat] = useState<'pdf' | 'jpg'>('pdf');

    // Positions State
    const [positions, setPositions] = useState<{ [key: string]: { x: number, y: number } }>({
        project: { x: 30, y: 30 },
        company: { x: 30, y: 70 },
        photo: { x: 30, y: 80 },
        info: { x: 30, y: 120 },
        details: { x: 30, y: 180 },
        maintenance: { x: 30, y: 260 },
        qr: { x: 450, y: 50 },
        bottomBar: { x: 0, y: 320 },
    });

    const applyPreset = (presetId: string) => {
        const preset = PRESET_DESIGNS.find(p => p.id === presetId);
        if (!preset) return;

        const c = preset.config;
        setOrientation(c.orientation as any);
        setCardBgColor(c.cardBgColor);
        setTextColor(c.textColor);
        setBottomBarColor(c.bottomBarColor);
        setBottomBarHeight(c.bottomBarHeight);
        setPositions(c.positions);
        setScales(c.scales);

        setShowProject(c.visible.project);
        setShowCompany(c.visible.company);
        setShowType(c.visible.type);
        setShowDetails(c.visible.details);
        setShowMaintenance(c.visible.maintenance);
        setShowBottomBar(c.visible.bottomBar);
        setShowPhoto(c.visible.photo);
    };

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setBgImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const switchOrientation = (newOrientation: 'landscape' | 'portrait') => {
        setOrientation(newOrientation);
    };

    const sensors = useSensors(useSensor(MouseSensor), useSensor(TouchSensor));

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, delta } = event;
        const id = active.id;
        setPositions(prev => ({
            ...prev,
            [id]: {
                x: (prev[id as string]?.x || 0) + delta.x,
                y: (prev[id as string]?.y || 0) + delta.y,
            }
        }));
    };

    const handleExport = async () => {
        if (!cardRef.current) return;
        setIsExporting(true);
        // Similar export logic as WorkerCardModal
        // Simplified for brevity, assume similar html2canvas + jspdf flow
        try {
            const canvas = await html2canvas(cardRef.current, {
                scale: 3,
                useCORS: true,
                backgroundColor: '#ffffff'
            });

            const filenameSafe = equipment.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const fileName = `Equip_${filenameSafe}_${orientation}.${exportFormat}`;

            if (exportFormat === 'jpg') {
                const link = document.createElement('a');
                link.download = fileName;
                link.href = canvas.toDataURL('image/jpeg', 0.95);
                link.click();
            } else {
                const imgData = canvas.toDataURL('image/png');
                const width = orientation === 'landscape' ? 85.6 : 53.98;
                const height = orientation === 'landscape' ? 53.98 : 85.6;
                const pdf = new jsPDF({ orientation, unit: 'mm', format: [85.6, 53.98] });
                pdf.addImage(imgData, 'PNG', 0, 0, width, height);
                pdf.save(fileName);
            }
        } catch (error) {
            console.error("Export failed", error);
            alert("Export failed");
        } finally {
            setIsExporting(false);
        }
    };

    const qrValue = `EQUIP:${equipment.id}`; // Simple equipment ID tag
    const cardWidth = orientation === 'landscape' ? '600px' : '378px';
    const cardHeight = orientation === 'landscape' ? '378px' : '600px';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Design Equipment Tag" maxWidth="max-w-6xl">
            <div className="flex flex-col lg:flex-row gap-6 h-[750px] transition-all">
                {/* Controls Sidebar */}
                <div className="w-full lg:w-80 bg-gray-50 dark:bg-[#131314] p-4 rounded-xl border border-gray-100 dark:border-[#444746] flex flex-col gap-4 overflow-hidden flex-shrink-0">
                    {/* Tab Nav */}
                    <div className="flex p-1 bg-gray-200/50 rounded-xl mb-6">
                        <button onClick={() => setActiveTab('templates')} className={`flex-1 flex items-center justify-center py-2 rounded-lg transition-all ${activeTab === 'templates' ? 'bg-white dark:bg-surface text-primary shadow-sm' : 'text-gray-500 hover:bg-gray-200/50'}`} title="Templates"><MonitorPlay size={18} /></button>
                        <button onClick={() => setActiveTab('style')} className={`flex-1 flex items-center justify-center py-2 rounded-lg transition-all ${activeTab === 'style' ? 'bg-white dark:bg-surface text-primary shadow-sm' : 'text-gray-500 hover:bg-gray-200/50'}`} title="Style"><Palette size={18} /></button>
                        <button onClick={() => setActiveTab('elements')} className={`flex-1 flex items-center justify-center py-2 rounded-lg transition-all ${activeTab === 'elements' ? 'bg-white dark:bg-surface text-primary shadow-sm' : 'text-gray-500 hover:bg-gray-200/50'}`} title="Elements"><Layers size={18} /></button>
                        <button onClick={() => setActiveTab('scaling')} className={`flex-1 flex items-center justify-center py-2 rounded-lg transition-all ${activeTab === 'scaling' ? 'bg-white dark:bg-surface text-primary shadow-sm' : 'text-gray-500 hover:bg-gray-200/50'}`} title="Scaling"><Gauge size={18} /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
                        {activeTab === 'templates' && (
                            <div className="space-y-3">
                                <label className="text-xs font-semibold text-gray-500">Choose a Layout</label>
                                {PRESET_DESIGNS.map(preset => (
                                    <button key={preset.id} onClick={() => applyPreset(preset.id)} className="flex items-start gap-3 p-3 text-left bg-white dark:bg-surface border border-gray-200 dark:border-[#444746] rounded-xl hover:border-primary/30 hover:shadow-md transition-all w-full">
                                        <div className="w-12 h-8 rounded-md flex-shrink-0 shadow-sm border border-gray-100 dark:border-[#444746] mt-1" style={{ backgroundColor: preset.config.cardBgColor, borderBottom: `${preset.config.bottomBarHeight / 3}px solid ${preset.config.bottomBarColor}` }} />
                                        <div>
                                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-primary-hover">{preset.name}</h4>
                                            <p className="text-[10px] text-gray-500 leading-tight mt-0.5">{preset.description}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {activeTab === 'style' && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-gray-500">Orientation</label>
                                    <div className="flex items-center justify-between bg-white dark:bg-surface p-1 rounded-lg border border-gray-200 dark:border-[#444746]">
                                        <button onClick={() => switchOrientation('landscape')} className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium rounded ${orientation === 'landscape' ? 'bg-primary-light text-primary-hover' : 'text-gray-500'}`}><LayoutTemplate className="rotate-0" size={14} /> Landscape</button>
                                        <button onClick={() => switchOrientation('portrait')} className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium rounded ${orientation === 'portrait' ? 'bg-primary-light text-primary-hover' : 'text-gray-500'}`}><LayoutTemplate className="rotate-90" size={14} /> Portrait</button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="text-center"><input type="color" value={cardBgColor} onChange={(e) => setCardBgColor(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0 block mx-auto shadow-sm" /><span className="text-[10px] text-gray-500 mt-1 block">Bg</span></div>
                                    <div className="text-center"><input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0 block mx-auto shadow-sm" /><span className="text-[10px] text-gray-500 mt-1 block">Text</span></div>
                                    <div className="text-center"><input type="color" value={bottomBarColor} onChange={(e) => setBottomBarColor(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0 block mx-auto shadow-sm" /><span className="text-[10px] text-gray-500 mt-1 block">Bar</span></div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'elements' && (
                            <div className="space-y-4">
                                <label className="text-xs font-semibold text-gray-500">Visibility</label>
                                <div className="space-y-1">
                                    <ToggleOption label="Project Name" checked={showProject} onChange={setShowProject} />
                                    <ToggleOption label="Company Name" checked={showCompany} onChange={setShowCompany} />
                                    <ToggleOption label="Name & Type" checked={showType} onChange={setShowType} />
                                    <ToggleOption label="Tech Details" checked={showDetails} onChange={setShowDetails} />
                                    <ToggleOption label="Next Maintenance" checked={showMaintenance} onChange={setShowMaintenance} />
                                    <ToggleOption label="Equipment Photo" checked={showPhoto} onChange={setShowPhoto} />
                                    <ToggleOption label="Bottom Bar" checked={showBottomBar} onChange={setShowBottomBar} />
                                </div>
                            </div>
                        )}

                        {activeTab === 'scaling' && (
                            <div className="space-y-4">
                                <label className="text-xs font-semibold text-gray-500">Individual Sizes</label>
                                <div className="space-y-4">
                                    <ScaleSlider label="Info Block" value={scales.info} onChange={(v) => setScales({ ...scales, info: v })} />
                                    <ScaleSlider label="Details" value={scales.details} onChange={(v) => setScales({ ...scales, details: v })} />
                                    <ScaleSlider label="QR Code" value={scales.qr} onChange={(v) => setScales({ ...scales, qr: v })} />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-auto pt-6 border-t border-gray-100 dark:border-[#444746] flex flex-col gap-3">
                        <div className="flex gap-2">
                            <div className="flex bg-gray-100 dark:bg-surface p-1 rounded-xl border border-gray-200 dark:border-[#444746] flex-shrink-0">
                                <button onClick={() => setExportFormat('pdf')} className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${exportFormat === 'pdf' ? 'bg-white dark:bg-surface text-primary shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'}`}>PDF</button>
                                <button onClick={() => setExportFormat('jpg')} className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${exportFormat === 'jpg' ? 'bg-white dark:bg-surface text-primary shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'}`}>JPG</button>
                            </div>
                            <PrimaryButton onClick={handleExport} disabled={isExporting} className="flex-1 justify-center py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/20">
                                {isExporting ? 'Exporting...' : <div className="flex items-center gap-2"><Download size={18} /> Download</div>}
                            </PrimaryButton>
                        </div>
                    </div>
                </div>

                {/* Canvas */}
                <div className="flex-1 bg-gray-200/50 rounded-xl border border-dashed border-gray-300 dark:border-[#444746] flex items-center justify-center p-8 overflow-auto relative select-none">
                    <DndContext sensors={sensors} onDragEnd={handleDragEnd} modifiers={[restrictToParentElement]}>
                        <div ref={cardRef} className="shadow-2xl overflow-hidden relative bg-white dark:bg-surface transition-all duration-300 flex-shrink-0"
                            style={{ width: cardWidth, height: cardHeight, backgroundColor: cardBgColor, color: textColor }}>

                            {bgImage && <div className="absolute inset-0 z-0 pointer-events-none" style={{ backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 1 }} />}

                            <DraggableItem id="bottomBar" left={positions.bottomBar.x} top={positions.bottomBar.y} visible={showBottomBar}>
                                <div style={{ width: cardWidth, height: `${bottomBarHeight}px`, backgroundColor: bottomBarColor }} className="pointer-events-none" />
                            </DraggableItem>

                            <DraggableItem id="photo" left={positions.photo.x} top={positions.photo.y} visible={showPhoto}>
                                <div style={{ transform: `scale(${scales.photo})`, transformOrigin: 'top left' }} className="w-32 h-32 border-4 border-white/50 shadow-md overflow-hidden bg-blue-50 flex items-center justify-center pointer-events-none">
                                    <HardHat size={64} className="text-brand" />
                                </div>
                            </DraggableItem>

                            <DraggableItem id="info" left={positions.info.x} top={positions.info.y} visible={true}>
                                <div style={{ transform: `scale(${scales.info})`, transformOrigin: 'top left' }} className="text-left p-2 border-none transition-colors pointer-events-none bg-transparent whitespace-nowrap">
                                    <h2 className="font-bold text-2xl leading-none uppercase tracking-tight" style={{ color: textColor }}>{equipment.name}</h2>
                                    {showType && (
                                        <div className="flex items-center gap-2 mt-2 opacity-80" style={{ color: textColor }}>
                                            <span className="text-lg drop-shadow-sm">
                                                {getEquipmentTypeIcon(equipment.equipmentType ?? '')}
                                            </span>
                                            <p className="text-sm font-bold uppercase tracking-widest mt-0.5">
                                                {equipment.equipmentTypeCustom ?? (equipment.equipmentType ? getEquipmentTypeLabel(equipment.equipmentType) : equipment.type)}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </DraggableItem>

                            <DraggableItem id="details" left={positions.details.x} top={positions.details.y} visible={showDetails}>
                                <div style={{ transform: `scale(${scales.details})`, transformOrigin: 'top left' }} className="text-left pointer-events-none bg-transparent whitespace-nowrap text-sm opacity-90 space-y-1">
                                    {equipment.brand && <div className="flex items-center gap-1"><span className="font-bold">Brand:</span> {equipment.brand}</div>}
                                    {equipment.model && <div className="flex items-center gap-1"><span className="font-bold">Model:</span> {equipment.model}</div>}
                                    <div className="flex items-center gap-1"><span className="font-bold">S/N:</span> {equipment.serialNumber}</div>
                                </div>
                            </DraggableItem>

                            <DraggableItem id="maintenance" left={positions.maintenance.x} top={positions.maintenance.y} visible={showMaintenance && !!equipment.nextMaintenanceDate}>
                                <div style={{ transform: `scale(${scales.maintenance})`, transformOrigin: 'top left' }} className="flex items-center gap-2 pointer-events-none bg-white dark:bg-surface/10 backdrop-blur-sm p-1 rounded text-xs font-medium border border-current">
                                    <Calendar size={14} />
                                    <span>Next Maint: {equipment.nextMaintenanceDate}</span>
                                </div>
                            </DraggableItem>

                            <DraggableItem id="project" left={positions.project.x} top={positions.project.y} visible={showProject && !!project}>
                                <div style={{ transform: `scale(${scales.project})`, transformOrigin: 'top left' }} className="bg-transparent whitespace-nowrap pointer-events-none text-left">
                                    <span className="block font-bold text-[10px] uppercase tracking-wider opacity-60" style={{ color: textColor }}>Project</span>
                                    <span className="font-bold text-lg leading-tight block" style={{ color: textColor }}>{project?.name}</span>
                                </div>
                            </DraggableItem>

                            <DraggableItem id="company" left={positions.company.x} top={positions.company.y} visible={showCompany && !!company}>
                                <div style={{ transform: `scale(${scales.company})`, transformOrigin: 'top left' }} className="bg-transparent whitespace-nowrap pointer-events-none text-left">
                                    <span className="block font-bold text-[10px] uppercase tracking-wider opacity-60" style={{ color: textColor }}>Owner</span>
                                    <span className="font-semibold text-sm leading-tight block" style={{ color: textColor }}>{company?.name}</span>
                                </div>
                            </DraggableItem>

                            <DraggableItem id="qr" left={positions.qr.x} top={positions.qr.y} visible={true}>
                                <div style={{ transform: `scale(${scales.qr})`, transformOrigin: 'top left' }} className="bg-white dark:bg-surface p-2 shadow-sm border border-gray-100 dark:border-[#444746] pointer-events-none">
                                    <QRCodeCanvas value={qrValue} size={100} fgColor="#000000" bgColor="#FFFFFF" level="H" includeMargin={false} />
                                </div>
                            </DraggableItem>

                        </div>
                    </DndContext>
                </div>
            </div>
        </Modal>
    );
};

const ToggleOption: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void }> = ({ label, checked, onChange }) => (
    <div className="flex items-center justify-between p-1.5 pl-0 hover:bg-gray-100 dark:hover:bg-surface/50 rounded-lg cursor-pointer transition-colors" onClick={() => onChange(!checked)}>
        <span className="text-xs font-medium text-gray-700 dark:text-gray-200">{label}</span>
        <div className={`transition-colors duration-200 ${checked ? 'text-primary' : 'text-gray-300'}`}>
            {checked ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
        </div>
    </div>
);

const ScaleSlider: React.FC<{ label: string; value: number; onChange: (v: number) => void }> = ({ label, value, onChange }) => (
    <div>
        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300 mb-1">
            <span>{label}</span>
            <span>{Math.round(value * 100)}%</span>
        </div>
        <input type="range" min="0.5" max="2.0" step="0.1" value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary" />
    </div>
);
