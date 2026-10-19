'use client';

import { useState } from 'react';
import { DndContext, DragOverlay, useDraggable, useDroppable } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { nanoid } from 'nanoid';
import {
    Type, Image as ImageIcon, Layout, Save, Trash2,
    ArrowLeft, AlignLeft, AlignCenter, AlignRight,
    Bold, X, Minus, Palette, Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import type { PDFTemplate, TemplateColumn, TemplateElement } from '@/types';
import { PrimaryButton, InputGroup } from '@/components/Modal';
import { ConfirmationModal } from '@/components/ConfirmationModal';

// --- TYPES & HELPERS ---

type DraggableType = 'text' | 'image' | 'variable' | 'line';

const DEFAULT_ELEMENT_STYLE: TemplateElement['style'] = {
    fontSize: 10,
    fontFamily: 'helvetica',
    color: '#000000',
    align: 'left',
    width: 100
};

// --- SUB-COMPONENTS ---

// 1. Draggable Tool Sidebar Item
const DraggableTool = ({ type, icon: Icon, label }: { type: DraggableType; icon: any; label: string }) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `tool-${type}`,
        data: { type, label, isNew: true },
    });

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={cn(
                "flex items-center gap-3 p-3 bg-white dark:bg-surface border border-gray-200 dark:border-[#444746] rounded-lg shadow-sm cursor-move hover:border-primary transition-colors",
                isDragging && "opacity-50"
            )}
        >
            <Icon size={18} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{label}</span>
        </div>
    );
};

// 2. Element Renderer & Editor
const ElementItem = ({
    element,
    isSelected,
    onSelect,
    onRemove,
    onUpdate
}: {
    element: TemplateElement;
    isSelected: boolean;
    onSelect: () => void;
    onRemove: () => void;
    onUpdate: (updates: Partial<TemplateElement> | Partial<TemplateElement['style']>) => void;
}) => {
    return (
        <div
            onClick={(e) => { e.stopPropagation(); onSelect(); }}
            className={cn(
                "relative group border rounded p-1 mb-2 cursor-pointer transition-all",
                isSelected ? "border-blue-500 ring-2 ring-blue-100 bg-primary-light/20" : "border-transparent hover:border-primary/20"
            )}
            style={{
                textAlign: element.style.align as any,
                backgroundColor: element.style.backgroundColor || 'transparent'
            }}
        >
            {element.type === 'text' && (
                <div style={{
                    fontSize: element.style.fontSize,
                    fontFamily: element.style.fontFamily,
                    color: element.style.color,
                    fontWeight: element.style.fontWeight
                }}>
                    {element.content || "Text Block"}
                </div>
            )}

            {element.type === 'variable' && (
                <div className="text-xs bg-gray-100 dark:bg-surface rounded px-2 py-1 inline-block border border-gray-300 dark:border-[#444746] text-gray-600 dark:text-gray-300 font-mono">
                    {`{{ ${element.content.replace('_', ' ').toUpperCase()} }}`}
                </div>
            )}

            {element.type === 'image' && (
                <div className="w-full flex justify-center">
                    {element.content ? (
                        <img
                            src={element.content}
                            alt="Template Asset"
                            style={{ height: element.style.height ? `${element.style.height}mm` : 'auto', maxHeight: '100%' }}
                            className="object-contain"
                        />
                    ) : (
                        <div className="h-12 w-full bg-gray-50 dark:bg-[#131314] border border-dashed border-gray-300 dark:border-[#444746] flex items-center justify-center text-gray-400 text-xs">
                            <ImageIcon size={16} className="mr-1" /> Image Placeholder
                        </div>
                    )}
                </div>
            )}

            {element.type === 'line' && (
                <div className="w-full py-1">
                    <div style={{
                        height: element.style.height ? `${element.style.height}mm` : '1px',
                        backgroundColor: element.style.color,
                        width: `${element.style.width}%`
                    }}></div>
                </div>
            )}

            {/* Quick Remove Button */}
            <button
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                className={cn(
                    "absolute -top-2 -right-2 p-1 bg-white dark:bg-surface rounded-full shadow border hover:text-red-500 hover:border-red-500 transition-all z-10",
                    isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}
                title="Remove Element"
            >
                <Trash2 size={12} />
            </button>
        </div>
    );
};

// 3. Column Droppable Zone
const ColumnDroppable = ({
    id,
    column,
    elements,
    selectedElementId,
    onRemoveElement,
    onSelectElement,
    onUpdateElement,
    onUpdateColumn
}: {
    id: string,
    column: TemplateColumn,
    elements: TemplateElement[],
    selectedElementId: string | null,
    onRemoveElement: (colId: string, elId: string) => void,
    onSelectElement: (el: TemplateElement) => void,
    onUpdateElement: (elId: string, updates: any) => void,
    onUpdateColumn: (colId: string, updates: Partial<TemplateColumn>) => void
}) => {
    const { setNodeRef, isOver } = useDroppable({
        id: id,
        data: { columnId: column.id }
    });

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "flex-1 border-r last:border-r-0 border-dashed border-gray-300 dark:border-[#444746] min-h-[50px] p-2 flex flex-col gap-1 transition-colors relative group/col",
                isOver && "bg-primary-light border-primary"
            )}
            style={{ backgroundColor: column.backgroundColor || 'transparent' }}
        >
            {/* Column Settings Trigger (Hover) */}
            <div className="absolute top-0 right-0 p-1 opacity-0 group-hover/col:opacity-100 transition-opacity z-20">
                <button
                    className="p-1 bg-white dark:bg-surface shadow-sm border rounded text-gray-400 hover:text-primary"
                    onClick={(e) => {
                        e.stopPropagation();
                        // Creating a simplified prompt for bg color for now to avoid too much UI clutter
                        const color = prompt("Enter background color (hex or name) for this column:", column.backgroundColor || "");
                        if (color !== null) onUpdateColumn(column.id, { backgroundColor: color });
                    }}
                    title="Column Background Color"
                >
                    <Palette size={10} />
                </button>
            </div>

            {elements.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-[10px] text-gray-300 pointer-events-none">
                    Drop Item
                </div>
            )}

            {elements.map(el => (
                <ElementItem
                    key={el.id}
                    element={el}
                    isSelected={selectedElementId === el.id}
                    onSelect={() => onSelectElement(el)}
                    onRemove={() => onRemoveElement(column.id, el.id)}
                    onUpdate={(updates) => onUpdateElement(el.id, updates)}
                />
            ))}
        </div>
    );
};

// --- MAIN PAGE COMPONENT ---

export default function TemplateBuilder() {
    const { templates, addTemplate, updateTemplate, deleteTemplate } = useStore();

    // View State: 'list' or 'editor'
    const [view, setView] = useState<'list' | 'editor'>('list');

    // Editor State
    const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(null);
    const [name, setName] = useState("Untitled Template");
    const [config, setConfig] = useState<PDFTemplate['config']>({
        pageSize: 'a4',
        orientation: 'portrait',
        marginTop: 10,
        marginBottom: 10,
        marginLeft: 10,
        marginRight: 10
    });
    const [headerHeight, setHeaderHeight] = useState(30);
    const [footerHeight, setFooterHeight] = useState(20);

    const [headerCols, setHeaderCols] = useState<TemplateColumn[]>([
        { id: 'h-col-1', width: 33.33, elements: [] },
        { id: 'h-col-2', width: 33.33, elements: [] },
        { id: 'h-col-3', width: 33.33, elements: [] }
    ]);
    const [footerCols, setFooterCols] = useState<TemplateColumn[]>([
        { id: 'f-col-1', width: 33.33, elements: [] },
        { id: 'f-col-2', width: 33.33, elements: [] },
        { id: 'f-col-3', width: 33.33, elements: [] }
    ]);

    const [selectedElement, setSelectedElement] = useState<TemplateElement | null>(null);
    const [draggedItem, setDraggedItem] = useState<any>(null);
    const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);

    // --- Template CRUD ---

    const handleCreateNew = () => {
        setName("New Template");
        setConfig({ pageSize: 'a4', orientation: 'portrait', marginTop: 10, marginBottom: 10, marginLeft: 10, marginRight: 10 });
        setHeaderCols([
            { id: 'h-col-1', width: 33.33, elements: [] },
            { id: 'h-col-2', width: 33.33, elements: [] },
            { id: 'h-col-3', width: 33.33, elements: [] }
        ]);
        setFooterCols([
            { id: 'f-col-1', width: 33.33, elements: [] },
            { id: 'f-col-2', width: 33.33, elements: [] },
            { id: 'f-col-3', width: 33.33, elements: [] }
        ]);
        setCurrentTemplateId(null);
        setView('editor');
    };

    const handleEditTemplate = (tmpl: PDFTemplate) => {
        setCurrentTemplateId(tmpl.id);
        setName(tmpl.name);
        setConfig(tmpl.config);
        setHeaderHeight(tmpl.header.height);
        setFooterHeight(tmpl.footer.height);
        setHeaderCols(tmpl.header.columns);
        setFooterCols(tmpl.footer.columns);
        setView('editor');
    };

    const handleSave = () => {
        const payload: Omit<PDFTemplate, 'id' | 'createdAt'> = {
            name,
            config,
            header: { height: headerHeight, columns: headerCols },
            footer: { height: footerHeight, columns: footerCols },
            accountId: 'acc_1', // Mock
        };

        if (currentTemplateId) {
            updateTemplate(currentTemplateId, payload);
        } else {
            addTemplate(payload);
        }
        setView('list');
    };

    // --- Drag & Drop Logic ---

    const handleDragStart = (event: DragStartEvent) => {
        setDraggedItem(event.active.data.current);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setDraggedItem(null);

        if (!over) return;

        const type = active.data.current?.type as DraggableType;
        const targetId = over.id as string;
        if (!type) return;

        // Create new element
        const newElement: TemplateElement = {
            id: nanoid(),
            type,
            content: type === 'text' ? 'Double click to edit' : type === 'image' ? '' : type === 'variable' ? 'page_number' : '',
            style: {
                ...DEFAULT_ELEMENT_STYLE,
                height: type === 'image' ? 15 : type === 'line' ? 1 : undefined,
                color: type === 'line' ? '#000000' : '#000000',
                width: 100
            }
        };

        const updateCols = (cols: TemplateColumn[]) => cols.map(c =>
            c.id === targetId ? { ...c, elements: [...c.elements, newElement] } : c
        );

        if (targetId.startsWith('h-')) setHeaderCols(updateCols);
        else setFooterCols(updateCols);

        setSelectedElement(newElement);
    };

    // --- Element & Column Updates ---

    const removeElement = (colId: string, elId: string) => {
        const filterEl = (c: TemplateColumn) => ({ ...c, elements: c.elements.filter(e => e.id !== elId) });
        if (colId.startsWith('h-')) setHeaderCols(cols => cols.map(c => c.id === colId ? filterEl(c) : c));
        else setFooterCols(cols => cols.map(c => c.id === colId ? filterEl(c) : c));

        if (selectedElement?.id === elId) setSelectedElement(null);
    };

    const updateElementState = (elId: string, updates: Partial<TemplateElement> | any) => {
        const updateFn = (cols: TemplateColumn[]) => cols.map(col => ({
            ...col,
            elements: col.elements.map(el => {
                if (el.id === elId) {
                    // Handle style updates vs root updates
                    if ('style' in updates) {
                        return { ...el, style: { ...el.style, ...updates.style } };
                    }
                    if ('fontSize' in updates || 'color' in updates || 'align' in updates || 'fontWeight' in updates || 'height' in updates || 'width' in updates || 'backgroundColor' in updates) {
                        return { ...el, style: { ...el.style, ...updates } };
                    }
                    return { ...el, ...updates };
                }
                return el;
            })
        }));

        setHeaderCols(updateFn);
        setFooterCols(updateFn);

        // Update selected element ref mostly for UI sync
        setSelectedElement(prev => prev?.id === elId ? { ...prev, ...updates, style: { ...prev.style, ...(updates.style || updates) } } : prev);
    };

    const updateColumnState = (colId: string, updates: Partial<TemplateColumn>) => {
        if (colId.startsWith('h-')) setHeaderCols(cols => cols.map(c => c.id === colId ? { ...c, ...updates } : c));
        else setFooterCols(cols => cols.map(c => c.id === colId ? { ...c, ...updates } : c));
    };

    // --- EDITOR UI RENDERING ---

    const renderEditor = () => (
        <div className="flex bg-gray-100 dark:bg-surface flex-1 overflow-hidden h-full">
            {/* Left Sidebar: Tools */}
            <div className="w-64 bg-white dark:bg-surface border-r flex flex-col p-4 gap-6 overflow-y-auto">
                <div>
                    <button onClick={() => setView('list')} className="flex items-center text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors">
                        <ArrowLeft size={16} className="mr-1" /> Back to List
                    </button>
                    <InputGroup label="Template Name">
                        <input
                            type="text"
                            className="w-full p-2 border rounded text-sm font-semibold"
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                    </InputGroup>
                </div>

                <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Elements</h4>
                    <div className="space-y-2">
                        <DraggableTool type="text" icon={Type} label="Text Block" />
                        <DraggableTool type="image" icon={ImageIcon} label="Image / Logo" />
                        <DraggableTool type="variable" icon={Layout} label="Dynamic Variable" />
                        <DraggableTool type="line" icon={Minus} label="Horizontal Line" />
                    </div>
                </div>

                <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Settings</h4>
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                            <InputGroup label="Format">
                                <select className="w-full p-1.5 border rounded text-xs bg-white dark:bg-surface" value={config.pageSize} onChange={e => setConfig({ ...config, pageSize: e.target.value as any })}>
                                    <option value="a4">A4</option>
                                    <option value="a3">A3</option>
                                </select>
                            </InputGroup>
                            <InputGroup label="Orient.">
                                <select className="w-full p-1.5 border rounded text-xs bg-white dark:bg-surface" value={config.orientation} onChange={e => setConfig({ ...config, orientation: e.target.value as any })}>
                                    <option value="portrait">Portrait</option>
                                    <option value="landscape">Landscape</option>
                                </select>
                            </InputGroup>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <InputGroup label="Header H (mm)">
                                <input type="number" className="w-full p-1.5 border rounded text-xs" value={headerHeight} onChange={e => setHeaderHeight(Number(e.target.value))} />
                            </InputGroup>
                            <InputGroup label="Footer H (mm)">
                                <input type="number" className="w-full p-1.5 border rounded text-xs" value={footerHeight} onChange={e => setFooterHeight(Number(e.target.value))} />
                            </InputGroup>
                        </div>
                        <div className="space-y-2 pt-2 border-t">
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-300 block">Margins (mm)</label>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="flex items-center gap-1"><span className="text-[10px] w-4">Top</span><input type="number" className="flex-1 p-1 text-xs border rounded" value={config.marginTop} onChange={e => setConfig({ ...config, marginTop: Number(e.target.value) })} /></div>
                                <div className="flex items-center gap-1"><span className="text-[10px] w-4">Bot</span><input type="number" className="flex-1 p-1 text-xs border rounded" value={config.marginBottom} onChange={e => setConfig({ ...config, marginBottom: Number(e.target.value) })} /></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-auto">
                    <PrimaryButton onClick={handleSave} className="w-full flex justify-center items-center gap-2">
                        <Save size={16} /> Save Template
                    </PrimaryButton>
                </div>
            </div>

            {/* Middle: Canvas */}
            <div className="flex-1 overflow-auto p-8 flex justify-center relative">
                <div
                    className="bg-white dark:bg-surface shadow-lg transition-all duration-300 flex flex-col relative"
                    style={{
                        width: config.orientation === 'portrait' ? '210mm' : '297mm',
                        height: config.orientation === 'portrait' ? '297mm' : '210mm',
                        paddingTop: `${config.marginTop}mm`,
                        paddingBottom: `${config.marginBottom}mm`,
                        paddingLeft: `${config.marginLeft}mm`,
                        paddingRight: `${config.marginRight}mm`,
                        transform: 'scale(0.8)', // Fixed scale for fit
                        transformOrigin: 'top center'
                    }}
                    onClick={() => setSelectedElement(null)}
                >
                    {/* Header Zone */}
                    <div
                        className="border-b border-dashed border-gray-300 dark:border-[#444746] flex"
                        style={{ height: `${headerHeight}mm` }}
                    >
                        {headerCols.map(col => (
                            <ColumnDroppable
                                key={col.id} id={col.id} column={col} elements={col.elements}
                                selectedElementId={selectedElement?.id || null}
                                onRemoveElement={removeElement} onSelectElement={setSelectedElement} onUpdateElement={updateElementState} onUpdateColumn={updateColumnState}
                            />
                        ))}
                    </div>

                    {/* Body Placeholder */}
                    <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 dark:bg-[#131314]/50 m-2 border border-dashed border-gray-200 dark:border-[#444746] rounded">
                        <div className="h-4 w-3/4 bg-gray-200 mb-2 rounded"></div>
                        <div className="h-4 w-3/4 bg-gray-200 mb-2 rounded"></div>
                        <div className="h-4 w-1/2 bg-gray-200 rounded"></div>
                        <span className="text-gray-400 text-sm mt-4 uppercase tracking-wider font-medium">Dynamic Content Area</span>
                    </div>

                    {/* Footer Zone */}
                    <div
                        className="border-t border-dashed border-gray-300 dark:border-[#444746] flex"
                        style={{ height: `${footerHeight}mm` }}
                    >
                        {footerCols.map(col => (
                            <ColumnDroppable
                                key={col.id} id={col.id} column={col} elements={col.elements}
                                selectedElementId={selectedElement?.id || null}
                                onRemoveElement={removeElement} onSelectElement={setSelectedElement} onUpdateElement={updateElementState} onUpdateColumn={updateColumnState}
                            />
                        ))}
                    </div>

                    {/* Guide Lines visual aid */}
                    <div className="absolute top-0 left-0 w-full h-[10px] border-b border-blue-500/20 text-[8px] text-primary pl-1">Header Margin</div>
                    <div className="absolute bottom-0 left-0 w-full h-[10px] border-t border-blue-500/20 flex items-end text-[8px] text-primary pl-1">Footer Margin</div>
                </div>
            </div>

            {/* Right Sidebar: Element Properties */}
            {selectedElement && (
                <div className="w-64 bg-white dark:bg-surface border-l p-4 flex flex-col gap-4 overflow-y-auto animate-in slide-in-from-right-10 duration-200">
                    <div className="flex items-center justify-between border-b pb-2">
                        <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100">Edit {selectedElement.type}</h4>
                        <button onClick={() => setSelectedElement(null)}><X size={16} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" /></button>
                    </div>

                    {/* Content Editor */}
                    <div className="space-y-3">
                        {selectedElement.type === 'text' && (
                            <InputGroup label="Text Content">
                                <textarea
                                    className="w-full p-2 border rounded text-sm"
                                    rows={3}
                                    value={selectedElement.content}
                                    onChange={e => updateElementState(selectedElement.id, { content: e.target.value })}
                                />
                            </InputGroup>
                        )}
                        {selectedElement.type === 'image' && (
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-gray-700 dark:text-gray-200">Image Source</label>
                                <div className="border border-dashed border-gray-300 dark:border-[#444746] p-3 rounded text-center bg-gray-50 dark:bg-[#131314] hover:bg-gray-100 dark:hover:bg-surface cursor-pointer relative">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onloadend = () => updateElementState(selectedElement.id, { content: reader.result as string });
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                    />
                                    <span className="text-xs text-primary">Upload Image</span>
                                </div>
                                {selectedElement.content && <img src={selectedElement.content} className="h-20 object-contain mx-auto border bg-white dark:bg-surface" alt="Preview" />}
                            </div>
                        )}
                        {selectedElement.type === 'variable' && (
                            <InputGroup label="Variable Type">
                                <select
                                    className="w-full p-2 border rounded text-sm bg-white dark:bg-surface"
                                    value={selectedElement.content}
                                    onChange={e => updateElementState(selectedElement.id, { content: e.target.value })}
                                >
                                    <option value="page_number">Page Number</option>
                                    <option value="print_date">Print Date</option>
                                    <option value="report_title">Report Title</option>
                                </select>
                            </InputGroup>
                        )}
                        {selectedElement.type === 'line' && (
                            <div className="pb-2 border-b">
                                <label className="text-xs font-medium text-gray-700 dark:text-gray-200 block mb-1">Dimensions</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="flex items-center gap-1"><span className="text-[10px]">W%</span><input type="number" className="flex-1 p-1 text-xs border rounded" value={selectedElement.style.width} onChange={e => updateElementState(selectedElement.id, { width: Number(e.target.value) })} /></div>
                                    <div className="flex items-center gap-1"><span className="text-[10px]">H(mm)</span><input type="number" className="flex-1 p-1 text-xs border rounded" value={selectedElement.style.height || 1} onChange={e => updateElementState(selectedElement.id, { height: Number(e.target.value) })} /></div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Styling Editor */}
                    <div className="space-y-4 pt-2">
                        <h5 className="text-xs font-bold text-gray-400 uppercase">Appearance</h5>

                        {selectedElement.type !== 'line' && (
                            <>
                                <div className="flex bg-gray-100 dark:bg-surface rounded p-1 gap-1">
                                    <button onClick={() => updateElementState(selectedElement.id, { align: 'left' })} className={cn("flex-1 p-1 rounded hover:bg-white dark:hover:bg-surface text-gray-600 dark:text-gray-300", selectedElement.style.align === 'left' && "bg-white dark:bg-surface shadow text-black")}><AlignLeft size={14} className="mx-auto" /></button>
                                    <button onClick={() => updateElementState(selectedElement.id, { align: 'center' })} className={cn("flex-1 p-1 rounded hover:bg-white dark:hover:bg-surface text-gray-600 dark:text-gray-300", selectedElement.style.align === 'center' && "bg-white dark:bg-surface shadow text-black")}><AlignCenter size={14} className="mx-auto" /></button>
                                    <button onClick={() => updateElementState(selectedElement.id, { align: 'right' })} className={cn("flex-1 p-1 rounded hover:bg-white dark:hover:bg-surface text-gray-600 dark:text-gray-300", selectedElement.style.align === 'right' && "bg-white dark:bg-surface shadow text-black")}><AlignRight size={14} className="mx-auto" /></button>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] text-gray-500 block mb-1">Font Size</label>
                                        <input type="number" className="w-full p-1.5 border rounded text-xs" value={selectedElement.style.fontSize} onChange={e => updateElementState(selectedElement.id, { fontSize: Number(e.target.value) })} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-500 block mb-1">Color</label>
                                        <input type="color" className="w-full h-8 p-0 border rounded cursor-pointer" value={selectedElement.style.color} onChange={e => updateElementState(selectedElement.id, { color: e.target.value })} />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => updateElementState(selectedElement.id, { fontWeight: selectedElement.style.fontWeight === 'bold' ? 'normal' : 'bold' })}
                                        className={cn("p-2 border rounded flex-1 flex justify-center items-center gap-2 text-xs font-medium hover:bg-gray-50 dark:hover:bg-[#131314]", selectedElement.style.fontWeight === 'bold' && "bg-primary-light text-primary border-primary/20")}
                                    >
                                        <Bold size={14} /> Bold
                                    </button>
                                </div>
                            </>
                        )}

                        {selectedElement.type === 'line' && (
                            <div>
                                <label className="text-[10px] text-gray-500 block mb-1">Line Color</label>
                                <input type="color" className="w-full h-8 p-0 border rounded cursor-pointer" value={selectedElement.style.color} onChange={e => updateElementState(selectedElement.id, { color: e.target.value })} />
                            </div>
                        )}

                        {selectedElement.type === 'image' && (
                            <div>
                                <label className="text-[10px] text-gray-500 block mb-1">Height (mm)</label>
                                <input type="number" className="w-full p-1.5 border rounded text-xs" value={selectedElement.style.height} onChange={e => updateElementState(selectedElement.id, { height: Number(e.target.value) })} />
                            </div>
                        )}

                        <div>
                            <label className="text-[10px] text-gray-500 block mb-1">Background Color</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="#ffffff"
                                    className="flex-1 p-1.5 border rounded text-xs"
                                    value={selectedElement.style.backgroundColor || ''}
                                    onChange={e => updateElementState(selectedElement.id, { backgroundColor: e.target.value })}
                                />
                                <div className="w-8 h-8 rounded border shadow-sm" style={{ backgroundColor: selectedElement.style.backgroundColor || 'transparent' }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    // --- LIST VIEW ---

    const renderList = () => (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">PDF Templates</h2>
                <PrimaryButton onClick={handleCreateNew} className="flex items-center gap-2">
                    <Plus size={18} /> Create Template
                </PrimaryButton>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {templates.map(tmpl => (
                    <div key={tmpl.id} onClick={() => handleEditTemplate(tmpl)} className="group bg-white dark:bg-surface border border-gray-200 dark:border-[#444746] rounded-xl p-6 hover:shadow-lg transition-all cursor-pointer relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-primary-light0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 rounded-lg bg-primary-light flex items-center justify-center text-primary">
                                <Layout size={20} />
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); setDeleteTemplateId(tmpl.id); }}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                        <h3 className="font-bold text-gray-900 dark:text-white mb-1">{tmpl.name}</h3>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                            <span className="bg-gray-100 dark:bg-surface px-2 py-0.5 rounded uppercase">{tmpl.config.pageSize}</span>
                            <span className="capitalize">{tmpl.config.orientation}</span>
                        </div>
                        <div className="text-xs text-gray-400">
                            Created: {new Date(tmpl.createdAt).toLocaleDateString()}
                        </div>
                    </div>
                ))}

                {templates.length === 0 && (
                    <div className="col-span-full py-12 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 dark:border-[#444746] rounded-xl">
                        <Layout size={48} className="mb-4 opacity-50" />
                        <p className="text-lg font-medium">No templates found</p>
                        <p className="text-sm">Create your first custom PDF layout to get started.</p>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="h-full flex flex-col">
            <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                {view === 'list' ? renderList() : renderEditor()}
                <DragOverlay>
                    {draggedItem ? (
                        <div className="flex items-center gap-3 p-3 bg-white dark:bg-surface border border-blue-500 rounded-lg shadow-xl opacity-90 w-48">
                            <span className="font-medium text-blue-900">{draggedItem.label}</span>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            <ConfirmationModal
                isOpen={!!deleteTemplateId}
                onClose={() => setDeleteTemplateId(null)}
                onConfirm={() => {
                    if (deleteTemplateId) deleteTemplate(deleteTemplateId);
                    setDeleteTemplateId(null);
                }}
                title="Delete Template?"
                message="Are you sure you want to delete this template?"
                description="This action cannot be undone."
                confirmText="Delete Template"
                variant="danger"
                icon="trash"
            />
        </div>
    );
}
