import React, { useRef, useState, useEffect } from 'react';
import { Modal, PrimaryButton } from './Modal';
import type { Worker, Company, Project } from '../types';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, ToggleLeft, ToggleRight, LayoutTemplate, User, ShieldCheck, GripHorizontal, Image as ImageIcon, Save, Layers, Palette, MonitorPlay } from 'lucide-react';
import { OCCUPATION_OPTIONS } from '@/lib/occupation-ifc-map';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { DndContext, useDraggable, useSensor, useSensors, MouseSensor, TouchSensor, type DragEndEvent } from '@dnd-kit/core';
import { restrictToParentElement } from '@dnd-kit/modifiers';

const PRESET_DESIGNS = [
    {
        id: 'standard',
        name: 'Standard Blue',
        description: 'Left-aligned text layout with right-side QR and blue bar.',
        previewColor: '#1e3a8a',
        config: {
            orientation: 'landscape',
            cardBgColor: '#ffffff',
            textColor: '#111827',
            bottomBarColor: '#1e3a8a',
            bottomBarHeight: 80,
            positions: {
                project: { x: 30, y: 30 },
                company: { x: 30, y: 80 },
                info: { x: 30, y: 140 },
                number: { x: 30, y: 220 },
                qr: { x: 440, y: 30 },
                photo: { x: 310, y: 30 },
                logos: { x: 340, y: 200 },
                bottomBar: { x: 0, y: 300 }
            },
            scales: { photo: 1.0, info: 1.0, project: 1.1, company: 1.0, qr: 1.0, number: 1.0, logos: 1.0 },
            visible: { project: true, company: true, role: true, logos: true, number: true, bottomBar: true, photo: false }
        }
    },
    {
        id: 'modern',
        name: 'Modern Minimal',
        description: 'Clean whitespace with grid alignment and subtle footer.',
        previewColor: '#f3f4f6',
        config: {
            orientation: 'landscape',
            cardBgColor: '#ffffff',
            textColor: '#111827',
            bottomBarColor: '#1e3a8a',
            bottomBarHeight: 80,
            positions: {
                project: { x: 30, y: 30 },
                company: { x: 30, y: 80 },
                info: { x: 30, y: 140 },
                number: { x: 30, y: 220 },
                qr: { x: 440, y: 30 },
                photo: { x: 310, y: 30 },
                logos: { x: 340, y: 200 },
                bottomBar: { x: 0, y: 300 }
            },
            scales: { photo: 1.0, info: 1.0, project: 1.1, company: 1.0, qr: 1.0, number: 1.0, logos: 1.0 },
            visible: { project: true, company: true, role: true, logos: true, number: true, bottomBar: false, photo: false }
        }
    },
    {
        id: 'safety',
        name: 'Safety First',
        description: 'High visibility layout with prominent safety zone.',
        previewColor: '#facc15',
        config: {
            orientation: 'landscape',
            cardBgColor: '#ffffff',
            textColor: '#111827',
            bottomBarColor: '#facc15',
            bottomBarHeight: 80,
            positions: {
                project: { x: 30, y: 30 },
                company: { x: 30, y: 80 },
                info: { x: 30, y: 140 },
                number: { x: 30, y: 220 },
                qr: { x: 440, y: 30 },
                photo: { x: 310, y: 30 },
                logos: { x: 340, y: 200 },
                bottomBar: { x: 0, y: 300 }
            },
            scales: { photo: 1.0, info: 1.0, project: 1.1, company: 1.0, qr: 1.0, number: 1.0, logos: 1.0 },
            visible: { project: true, company: true, role: true, logos: true, number: true, bottomBar: true, photo: false }
        }
    }
];

interface WorkerCardModalProps {
    isOpen: boolean;
    onClose: () => void;
    worker: Worker;
    company?: Company;
    project?: Project;
    workerNumber?: number;
    onSaveTemplate?: (config: any) => void;
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

export const WorkerCardModal: React.FC<WorkerCardModalProps> = ({ isOpen, onClose, worker, company, project, workerNumber, onSaveTemplate }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [activeTab, setActiveTab] = useState<'templates' | 'style' | 'elements' | 'scaling'>('templates');

    // Design State
    const [cardBgColor, setCardBgColor] = useState('#ffffff');
    const [textColor, setTextColor] = useState('#111827');
    const [bottomBarColor, setBottomBarColor] = useState('#1e3a8a');
    const [bgImage, setBgImage] = useState<string | null>(null);
    const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
    const [bottomBarHeight, setBottomBarHeight] = useState(28);

    // Individual Scales
    const [scales, setScales] = useState({
        photo: 1,
        info: 1, // Name & Role
        project: 1,
        company: 1,
        qr: 1,
        number: 1,
        logos: 1
    });

    // Toggles
    const [showProject, setShowProject] = useState(true);
    const [showCompany, setShowCompany] = useState(true);
    const [showRole, setShowRole] = useState(true);
    const [showTrainings, setShowTrainings] = useState(true);
    const [showNumber, setShowNumber] = useState(true);
    const [showBottomBar, setShowBottomBar] = useState(true);
    const [showPhoto, setShowPhoto] = useState(true);
    const [exportFormat, setExportFormat] = useState<'pdf' | 'jpg'>('pdf');

    // Positions State
    const [positions, setPositions] = useState<{ [key: string]: { x: number, y: number } }>({
        photo: { x: 30, y: 80 },
        info: { x: 180, y: 100 },
        project: { x: 30, y: 30 },
        company: { x: 30, y: 50 },
        qr: { x: 450, y: 120 },
        logos: { x: 30, y: 250 },
        number: { x: 500, y: 30 },
        bottomBar: { x: 0, y: 350 },
    });

    const hasLoadedRef = useRef(false);

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
        setShowRole(c.visible.role);
        setShowTrainings(c.visible.logos);
        setShowNumber(c.visible.number);
        setShowBottomBar(c.visible.bottomBar);
        setShowPhoto(c.visible.photo);
    };

    // Load Template Logic
    const loadTemplate = () => {
        console.log("Loading template. Project Config available?:", !!project?.cardConfig, project?.cardConfig);
        // Default State
        const defaults = {
            orientation: 'landscape' as const,
            cardBgColor: '#ffffff',
            textColor: '#111827',
            bottomBarColor: '#1e3a8a',
            bottomBarHeight: 50,
            positions: {
                project: { x: 30, y: 30 },
                company: { x: 30, y: 80 },
                info: { x: 30, y: 140 },
                number: { x: 30, y: 220 },
                qr: { x: 460, y: 40 },
                photo: { x: 340, y: 50 },
                logos: { x: 340, y: 200 },
                bottomBar: { x: 0, y: 320 }
            },
            scales: { photo: 1, info: 1, project: 1, company: 1, qr: 1, number: 1, logos: 1 },
            visible: {
                project: true, company: true, role: true,
                logos: true, number: true, bottomBar: true, photo: true
            }
        };

        if (project?.cardConfig) {
            const config = project.cardConfig;
            setOrientation(config.orientation || defaults.orientation);
            setCardBgColor(config.cardBgColor || defaults.cardBgColor);
            setTextColor(config.textColor || defaults.textColor);
            setBottomBarColor(config.bottomBarColor || defaults.bottomBarColor);
            setBgImage(config.bgImage || project.logoUrl || null);
            setBottomBarHeight(config.bottomBarHeight || defaults.bottomBarHeight);

            setPositions(config.positions || defaults.positions);
            setScales(config.scales || defaults.scales);

            if (config.visibleElements) {
                setShowProject(config.visibleElements.project ?? true);
                setShowCompany(config.visibleElements.company ?? true);
                setShowRole(config.visibleElements.role ?? true);
                setShowTrainings(config.visibleElements.logos ?? true);
                setShowNumber(config.visibleElements.number ?? true);
                setShowBottomBar(config.visibleElements.bottomBar ?? true);
                setShowPhoto(config.visibleElements.photo ?? true);
            } else {
                // Reset usage if config exists but visibility was missing (rare)
                setShowProject(true); setShowCompany(true); setShowRole(true);
                setShowTrainings(true); setShowNumber(true); setShowBottomBar(true); setShowPhoto(true);
            }
        } else {
            // Revert to defaults if no saved layout
            setOrientation(defaults.orientation);
            setCardBgColor(defaults.cardBgColor);
            setTextColor(defaults.textColor);
            setBottomBarColor(defaults.bottomBarColor);
            setBgImage(project?.logoUrl || null);
            setBottomBarHeight(defaults.bottomBarHeight);
            setPositions(defaults.positions);
            setScales(defaults.scales);
            setShowProject(true); setShowCompany(true); setShowRole(true);
            setShowTrainings(true); setShowNumber(true); setShowBottomBar(true); setShowPhoto(true);

            if (!hasLoadedRef.current) {
                // Initial load feedback only
                // console.log("No saved layout found, reverting to defaults");
            }
        }
    };

    // Trigger load on project change - ONLY first time
    useEffect(() => {
        console.log("Project Prop Changed in Modal:", project?.id);
        if (!hasLoadedRef.current && project) {
            console.log("Performing Initial Load");
            loadTemplate();
            hasLoadedRef.current = true;
        } else if (project) {
            console.log("Skipping auto-load (already loaded). Current prop config:", project.cardConfig);
        }
    }, [project]);

    const handleSaveTemplate = () => {
        if (onSaveTemplate) {
            console.log("Attempting to save template...");
            const config = {
                orientation,
                cardBgColor,
                textColor,
                bottomBarColor,
                bottomBarHeight,
                bgImage,
                positions,
                visibleElements: {
                    project: showProject,
                    company: showCompany,
                    role: showRole,
                    logos: showTrainings,
                    number: showNumber,
                    bottomBar: showBottomBar,
                    photo: showPhoto
                },
                scales
            };
            onSaveTemplate(config);
            alert("Project Layout Saved! This design will be used for all workers in this project.");
        }
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
        let tempImageUrl: string | null = null;
        let originalImageSrc: string | null = null;
        const imgElement = cardRef.current.querySelector('img') as HTMLImageElement;

        try {
            // Pre-process Image to handle Network/CORS restrictions
            if (imgElement && imgElement.src && !imgElement.src.startsWith('data:') && !imgElement.src.startsWith('blob:')) {
                try {
                    originalImageSrc = imgElement.src;
                    const response = await fetch(originalImageSrc, { mode: 'cors' });
                    if (response.ok) {
                        const blob = await response.blob();
                        tempImageUrl = URL.createObjectURL(blob);
                        imgElement.src = tempImageUrl;
                        // Give browser a moment to decode the new local source
                        await new Promise(resolve => setTimeout(resolve, 200));
                    }
                } catch (e) {
                    console.warn("Image pre-fetch failed, falling back to standard CORS load", e);
                }
            }

            // Generate Canvas
            const canvas = await html2canvas(cardRef.current, {
                scale: 3,
                useCORS: true,
                allowTaint: true, // Try to render even if tainted (though export might fail if truly tainted)
                backgroundColor: '#ffffff',
                logging: false,
                onclone: (clonedDoc) => {
                    const clonedCard = clonedDoc.querySelector('[data-card-export]') as HTMLElement;
                    if (clonedCard) clonedCard.style.transform = 'none';

                    // Ensure cloned image also has the safe URL if applicable
                    if (tempImageUrl) {
                        const clonedImg = clonedCard.querySelector('img');
                        if (clonedImg) clonedImg.src = tempImageUrl;
                    }
                }
            });

            // Restore original image source in UI immediately
            if (imgElement && originalImageSrc) {
                imgElement.src = originalImageSrc;
            }

            const filenameSafe = worker.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();

            const fileName = `AccessCard_${filenameSafe}_${orientation}.${exportFormat}`;
            let finalBlob: Blob | null = null;

            if (exportFormat === 'jpg') {
                finalBlob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
            } else {
                const imgData = canvas.toDataURL('image/png');
                const width = orientation === 'landscape' ? 85.6 : 53.98;
                const height = orientation === 'landscape' ? 53.98 : 85.6;

                const pdf = new jsPDF({
                    orientation: orientation,
                    unit: 'mm',
                    format: [85.6, 53.98]
                });

                pdf.addImage(imgData, 'PNG', 0, 0, width, height);
                finalBlob = pdf.output('blob');
            }

            if (!finalBlob) throw new Error("File generation failed");

            // Save As Dialog (Chrome/Edge/Opera high-privilege)
            if ('showSaveFilePicker' in window) {
                try {
                    const handle = await (window as any).showSaveFilePicker({
                        suggestedName: fileName,
                        types: [{
                            description: exportFormat === 'jpg' ? 'JPEG Image' : 'PDF Document',
                            accept: exportFormat === 'jpg' ? { 'image/jpeg': ['.jpg', '.jpeg'] } : { 'application/pdf': ['.pdf'] }
                        }],
                    });
                    const writable = await handle.createWritable();
                    await writable.write(finalBlob);
                    await writable.close();
                    return; // Success
                } catch (err: any) {
                    if (err.name === 'AbortError') return; // User cancelled
                    console.warn("Save Picker failed, falling back to auto-download", err);
                }
            }

            // Fallback (Blob Anchor)
            const url = URL.createObjectURL(finalBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 60000);
        } catch (error: any) {
            console.error("Export failed", error);
            alert(`Export Failed: ${error.message || 'Unknown error'}. Check console.`);
            // Restore image if error occurred properly
            if (imgElement && originalImageSrc) {
                imgElement.src = originalImageSrc;
            }
        } finally {
            if (tempImageUrl) URL.revokeObjectURL(tempImageUrl);
            setIsExporting(false);
        }
    };

    const formattedNumber = workerNumber ? `#${workerNumber.toString().padStart(3, '0')}` : '#---';
    const qrValue = worker.accessCardCode || worker.id;

    const cardWidth = orientation === 'landscape' ? '600px' : '378px';
    const cardHeight = orientation === 'landscape' ? '378px' : '600px';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Design Access Card" maxWidth="max-w-6xl">
            <div className="flex flex-col lg:flex-row gap-6 h-[750px] transition-all">

                {/* Controls Sidebar */}
                <div className="w-full lg:w-80 bg-gray-50 dark:bg-[#131314] p-4 rounded-xl border border-gray-100 dark:border-[#444746] flex flex-col gap-4 overflow-hidden flex-shrink-0">

                    {/* Tab Nav */}
                    <div className="flex p-1 bg-gray-200/50 rounded-xl mb-6">
                        <button onClick={() => setActiveTab('templates')} className={`flex-1 flex items-center justify-center py-2 rounded-lg transition-all ${activeTab === 'templates' ? 'bg-white dark:bg-surface text-primary shadow-sm' : 'text-gray-500 hover:bg-gray-200/50'}`} title="Templates">
                            <MonitorPlay size={18} />
                        </button>
                        <button onClick={() => setActiveTab('style')} className={`flex-1 flex items-center justify-center py-2 rounded-lg transition-all ${activeTab === 'style' ? 'bg-white dark:bg-surface text-primary shadow-sm' : 'text-gray-500 hover:bg-gray-200/50'}`} title="Style">
                            <Palette size={18} />
                        </button>
                        <button onClick={() => setActiveTab('elements')} className={`flex-1 flex items-center justify-center py-2 rounded-lg transition-all ${activeTab === 'elements' ? 'bg-white dark:bg-surface text-primary shadow-sm' : 'text-gray-500 hover:bg-gray-200/50'}`} title="Elements">
                            <Layers size={18} />
                        </button>
                        <button onClick={() => setActiveTab('scaling')} className={`flex-1 flex items-center justify-center py-2 rounded-lg transition-all ${activeTab === 'scaling' ? 'bg-white dark:bg-surface text-primary shadow-sm' : 'text-gray-500 hover:bg-gray-200/50'}`} title="Scaling">
                            <User size={18} /> {/* Using User icon for scaling/sizing as placeholder if Maximize not available, but user had User imported */}
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">

                        {activeTab === 'templates' && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
                                <label className="text-xs font-medium text-gray-500">Choose a Layout</label>
                                <div className="grid grid-cols-1 gap-3">
                                    {PRESET_DESIGNS.map(preset => (
                                        <button
                                            key={preset.id}
                                            onClick={() => applyPreset(preset.id)}
                                            className="flex items-start gap-3 p-3 text-left bg-white dark:bg-surface border border-gray-200 dark:border-[#444746] rounded-xl hover:border-primary/30 hover:shadow-md transition-all group"
                                        >
                                            <div className="w-12 h-8 rounded-md flex-shrink-0 shadow-sm border border-gray-100 dark:border-[#444746] mt-1"
                                                style={{ backgroundColor: preset.config.cardBgColor, borderBottom: `${preset.config.bottomBarHeight / 3}px solid ${preset.config.bottomBarColor}` }}>
                                                {/* Mini Preview */}
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-primary-hover">{preset.name}</h4>
                                                <p className="text-[10px] text-gray-500 leading-tight mt-0.5">{preset.description}</p>
                                            </div>
                                        </button>
                                    ))}

                                    {/* Custom Saved Layout */}
                                    <button
                                        onClick={loadTemplate}
                                        className="flex items-start gap-3 p-3 text-left bg-white dark:bg-surface border-2 border-dashed border-gray-300 dark:border-[#444746] rounded-xl hover:border-primary hover:bg-primary-light/50 hover:shadow-md transition-all group relative overflow-hidden"
                                    >
                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Save size={14} className="text-primary" />
                                        </div>
                                        <div className="w-12 h-8 rounded-md flex-shrink-0 shadow-sm border border-gray-100 dark:border-[#444746] mt-1"
                                            style={{
                                                backgroundColor: project?.cardConfig?.cardBgColor || '#f9fafb',
                                                borderBottom: `${(project?.cardConfig?.bottomBarHeight || 10) / 3}px solid ${project?.cardConfig?.bottomBarColor || '#d1d5db'}`
                                            }}>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-primary-hover">Project Saved Layout</h4>
                                            <p className="text-[10px] text-gray-500 leading-tight mt-0.5">
                                                {project?.cardConfig ? 'New Layout Saved' : 'No layout saved yet.'}
                                            </p>
                                        </div>
                                    </button>
                                </div>
                                <div className="mt-4 p-3 bg-primary-light rounded-lg text-xs text-primary-hover border border-primary/10">
                                    <p><strong>Tip:</strong> After selecting a layout, you can still customize colors and positions in the other tabs!</p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'style' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-500">Orientation</label>
                                    <div className="flex items-center justify-between bg-white dark:bg-surface p-1 rounded-lg border border-gray-200 dark:border-[#444746]">
                                        <button onClick={() => switchOrientation('landscape')} className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium rounded ${orientation === 'landscape' ? 'bg-primary-light text-primary-hover' : 'text-gray-500'}`}><LayoutTemplate className="rotate-0" size={14} /> Landscape</button>
                                        <button onClick={() => switchOrientation('portrait')} className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium rounded ${orientation === 'portrait' ? 'bg-primary-light text-primary-hover' : 'text-gray-500'}`}><LayoutTemplate className="rotate-90" size={14} /> Portrait</button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div className="text-center">
                                        <input type="color" value={cardBgColor} onChange={(e) => setCardBgColor(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0 block mx-auto shadow-sm" />
                                        <span className="text-[10px] text-gray-500 mt-1 block">Background</span>
                                    </div>
                                    <div className="text-center">
                                        <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0 block mx-auto shadow-sm" />
                                        <span className="text-[10px] text-gray-500 mt-1 block">Text</span>
                                    </div>
                                    <div className="text-center">
                                        <input type="color" value={bottomBarColor} onChange={(e) => setBottomBarColor(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0 block mx-auto shadow-sm" />
                                        <span className="text-[10px] text-gray-500 mt-1 block">Bar Color</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="flex items-center justify-center w-full px-4 py-3 bg-white dark:bg-surface border border-gray-300 dark:border-[#444746] rounded-lg text-xs hover:bg-gray-50 dark:hover:bg-[#131314] hover:border-gray-400 cursor-pointer gap-2 transition-all shadow-sm">
                                        <ImageIcon size={16} /> {bgImage ? 'Change Custom Image' : 'Upload Custom Image'}
                                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                    </label>
                                    {bgImage && <button onClick={() => setBgImage(null)} className="text-[10px] text-red-400 mt-2 w-full text-center hover:text-red-500 hover:underline">Remove Image</button>}
                                </div>
                            </div>
                        )}

                        {activeTab === 'elements' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                <label className="text-xs font-medium text-gray-500">Visibility</label>
                                <div className="space-y-1">
                                    <ToggleOption label="Project Name" checked={showProject} onChange={setShowProject} />
                                    <ToggleOption label="Company Name" checked={showCompany} onChange={setShowCompany} />
                                    <ToggleOption label="Role" checked={showRole} onChange={setShowRole} />
                                    <ToggleOption label="Safety Logos" checked={showTrainings} onChange={setShowTrainings} />
                                    <ToggleOption label="Worker #" checked={showNumber} onChange={setShowNumber} />
                                    <ToggleOption label="Worker Photo" checked={showPhoto} onChange={setShowPhoto} />
                                    <ToggleOption label="Bottom Bar" checked={showBottomBar} onChange={setShowBottomBar} />
                                </div>
                            </div>
                        )}

                        {activeTab === 'scaling' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                <label className="text-xs font-medium text-gray-500">Individual Sizes</label>
                                <div className="space-y-4">
                                    <ScaleSlider label="Name & Role" value={scales.info} onChange={(v) => setScales({ ...scales, info: v })} />
                                    <ScaleSlider label="Project Name" value={scales.project} onChange={(v) => setScales({ ...scales, project: v })} />
                                    <ScaleSlider label="Company Name" value={scales.company} onChange={(v) => setScales({ ...scales, company: v })} />
                                    <ScaleSlider label="Worker #" value={scales.number} onChange={(v) => setScales({ ...scales, number: v })} />
                                    <ScaleSlider label="Photo" value={scales.photo} onChange={(v) => setScales({ ...scales, photo: v })} />
                                    <ScaleSlider label="QR Code" value={scales.qr} onChange={(v) => setScales({ ...scales, qr: v })} />
                                    <ScaleSlider label="Logos" value={scales.logos} onChange={(v) => setScales({ ...scales, logos: v })} />

                                    <div>
                                        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300 mb-1">
                                            <span>Bottom Bar Height</span>
                                            <span>{bottomBarHeight}px</span>
                                        </div>
                                        <input
                                            type="range" min="10" max="150" step="1"
                                            value={bottomBarHeight}
                                            onChange={(e) => setBottomBarHeight(parseInt(e.target.value))}
                                            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>

                    <div className="mt-auto pt-6 border-t border-gray-100 dark:border-[#444746] flex flex-col gap-3">
                        {onSaveTemplate && (
                            <button
                                onClick={handleSaveTemplate}
                                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white dark:bg-surface border border-gray-200 dark:border-[#444746] text-gray-700 dark:text-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-[#131314] hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-[#444746] transition-all shadow-sm active:scale-[0.99]"
                            >
                                <Save size={16} className="text-gray-500" />
                                <span>Save to Project</span>
                            </button>
                        )}

                        <div className="flex gap-2">
                            <div className="flex bg-gray-100 dark:bg-surface p-1 rounded-xl border border-gray-200 dark:border-[#444746] flex-shrink-0">
                                <button onClick={() => setExportFormat('pdf')} className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${exportFormat === 'pdf' ? 'bg-white dark:bg-surface text-primary shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'}`}>PDF</button>
                                <button onClick={() => setExportFormat('jpg')} className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${exportFormat === 'jpg' ? 'bg-white dark:bg-surface text-primary shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'}`}>JPG</button>
                            </div>

                            <PrimaryButton
                                onClick={handleExport}
                                disabled={isExporting}
                                className="flex-1 justify-center py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform"
                            >
                                {isExporting ? (
                                    <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Exporting...</span>
                                ) : (
                                    <div className="flex items-center justify-center gap-2 w-full">
                                        <Download size={18} strokeWidth={2.5} />
                                        <span>Download</span>
                                    </div>
                                )}
                            </PrimaryButton>
                        </div>
                    </div>
                </div>

                {/* Canvas Area */}
                <div className="flex-1 bg-gray-200/50 rounded-xl border border-dashed border-gray-300 dark:border-[#444746] flex items-center justify-center p-8 overflow-auto relative select-none">
                    <DndContext sensors={sensors} onDragEnd={handleDragEnd} modifiers={[restrictToParentElement]}>
                        <div
                            ref={cardRef}
                            data-card-export="true"
                            className="shadow-2xl overflow-hidden relative bg-white dark:bg-surface transition-all duration-300 flex-shrink-0"
                            style={{
                                width: cardWidth,
                                height: cardHeight,
                                backgroundColor: cardBgColor,
                                color: textColor,
                                boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
                            }}
                        >
                            {bgImage && <div className="absolute inset-0 z-0 pointer-events-none" style={{ backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 1 }} />}
                            {!bgImage && <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 10px 10px, currentColor 1px, transparent 1px)', backgroundSize: '20px 20px' }} />}

                            <DraggableItem id="bottomBar" left={positions.bottomBar.x} top={positions.bottomBar.y} visible={showBottomBar}>
                                <div style={{ width: cardWidth, height: `${bottomBarHeight}px`, backgroundColor: bottomBarColor }} className="pointer-events-none" />
                            </DraggableItem>

                            <DraggableItem id="photo" left={positions.photo.x} top={positions.photo.y} visible={showPhoto}>
                                <div style={{ transform: `scale(${scales.photo})`, transformOrigin: 'top left' }} className="w-32 h-32 border-4 border-white/50 shadow-md overflow-hidden bg-blue-50 flex items-center justify-center pointer-events-none">
                                    {worker.avatarUrl ? <img src={worker.avatarUrl} alt="" className="w-full h-full object-cover" crossOrigin="anonymous" /> : <User size={64} className="text-brand" />}
                                </div>
                            </DraggableItem>

                            <DraggableItem id="info" left={positions.info.x} top={positions.info.y} visible={true}>
                                <div style={{ transform: `scale(${scales.info})`, transformOrigin: 'top left' }} className="text-left p-2 border-none transition-colors pointer-events-none bg-transparent whitespace-nowrap">
                                    <h2 className="font-bold text-2xl leading-none uppercase tracking-tight" style={{ color: textColor }}>{worker.name}</h2>
                                    {showRole && (
                                        <p className="text-sm font-bold uppercase tracking-widest mt-2 opacity-80"
                                            style={{ color: textColor }}>
                                            {/* Mostrar profissão em destaque; função na obra como subtítulo */}
                                            {worker.occupationCustom
                                                || (worker.occupation
                                                    ? OCCUPATION_OPTIONS.find(o => o.value === worker.occupation)?.label
                                                    : null)
                                                || worker.role
                                                || ''}
                                            {worker.role
                                                && (worker.occupation || worker.occupationCustom)
                                                && worker.role !== worker.occupation && (
                                                    <span className="block text-[10px] font-normal normal-case tracking-normal opacity-60 mt-0.5">
                                                        {worker.role}
                                                    </span>
                                                )}
                                        </p>
                                    )}
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
                                    <span className="block font-bold text-[10px] uppercase tracking-wider opacity-60" style={{ color: textColor }}>Company</span>
                                    <span className="font-semibold text-sm leading-tight block" style={{ color: textColor }}>{company?.name}</span>
                                </div>
                            </DraggableItem>

                            <DraggableItem id="qr" left={positions.qr.x} top={positions.qr.y} visible={true}>
                                <div style={{ transform: `scale(${scales.qr})`, transformOrigin: 'top left' }} className="bg-white dark:bg-surface p-2 shadow-sm border border-gray-100 dark:border-[#444746] pointer-events-none">
                                    <QRCodeCanvas value={qrValue} size={120} fgColor="#000000" bgColor="#FFFFFF" level="H" includeMargin={false} />
                                </div>
                            </DraggableItem>

                            <DraggableItem id="number" left={positions.number.x} top={positions.number.y} visible={showNumber}>
                                <div style={{ transform: `scale(${scales.number})`, transformOrigin: 'top left', color: textColor }} className="font-mono font-bold text-xl px-2 py-1 pointer-events-none opacity-90 tracking-widest bg-transparent whitespace-nowrap">{formattedNumber}</div>
                            </DraggableItem>

                            <DraggableItem id="logos" left={positions.logos.x} top={positions.logos.y} visible={showTrainings}>
                                <div style={{ transform: `scale(${scales.logos})`, transformOrigin: 'top left' }} className="flex items-center gap-4 pointer-events-none bg-transparent">
                                    {worker.fieldValidations?.medicalExpiry && <div className="flex flex-col items-center justify-center w-12 h-12 bg-blue-50 text-blue-800 rounded-full border-2 border-blue-500 shadow-sm"><ShieldCheck size={20} /><span className="text-[6px] font-bold uppercase mt-0.5">Medic</span></div>}
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
        <input
            type="range" min="0.5" max="2.5" step="0.1"
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
        />
    </div>
);
