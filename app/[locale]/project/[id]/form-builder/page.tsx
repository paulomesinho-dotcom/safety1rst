'use client';

import { useState } from 'react';
import { DndContext, DragOverlay, useDraggable, useDroppable } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { Type, CheckSquare, Image as ImageIcon, PenTool, Trash2, Download, FileText, LayoutTemplate } from 'lucide-react';
import { cn } from '@/lib/utils';
import { nanoid } from 'nanoid';
// import html2canvas from 'html2canvas'; // Dynamic import
// import { jsPDF } from 'jspdf'; // Dynamic import
import TemplateBuilder from './TemplateBuilder';

// Types
type FieldType = 'text' | 'checkbox' | 'image' | 'signature';

interface FormField {
    id: string;
    type: FieldType;
    label: string;
    required: boolean;
}

const DraggableItem = ({ type, icon: Icon, label }: { type: FieldType; icon: any; label: string }) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `new-${type}`,
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

// Original Form Editor Component
function FormEditor() {
    const [fields, setFields] = useState<FormField[]>([]);
    const [draggedItem, setDraggedItem] = useState<any>(null);

    const handleDragStart = (event: DragStartEvent) => {
        setDraggedItem(event.active.data.current);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setDraggedItem(null);

        if (over && over.id === 'canvas') {
            const type = active.data.current?.type as FieldType;
            if (type) {
                const newField: FormField = {
                    id: nanoid(),
                    type,
                    label: `New ${type} field`,
                    required: false,
                };
                setFields([...fields, newField]);
            }
        }
    };

    const removeField = (id: string) => {
        setFields(fields.filter(f => f.id !== id));
    };

    const handleExportPdf = async () => {
        const element = document.getElementById('canvas-content');
        if (!element) return;

        try {
            const html2canvas = (await import('html2canvas')).default;
            const { jsPDF } = await import('jspdf');

            const canvas = await html2canvas(element, {
                scale: 2,
                backgroundColor: '#ffffff'
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const imgHeight = canvas.height;
            const imgWidth = canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, (imgHeight * pdfWidth) / imgWidth);
            pdf.save('form-template.pdf');
        } catch (err) {
            console.error("Export failed", err);
            alert("Failed to export PDF");
        }
    };

    return (
        <div className="flex h-full gap-6 relative">
            <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <div className="w-64 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900 dark:text-white">Form Elements</h3>
                    </div>
                    <div className="flex flex-col gap-2">
                        <DraggableItem type="text" icon={Type} label="Text Input" />
                        <DraggableItem type="checkbox" icon={CheckSquare} label="Checkbox" />
                        <DraggableItem type="image" icon={ImageIcon} label="Image Upload" />
                        <DraggableItem type="signature" icon={PenTool} label="Signature" />
                    </div>
                    <div className="mt-8 pt-4 border-t border-gray-200 dark:border-[#444746]">
                        <button onClick={handleExportPdf} className="flex items-center gap-2 w-full justify-center bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary-hover transition-colors">
                            <Download size={18} /> Export PDF
                        </button>
                    </div>
                </div>

                <div className="flex-1 bg-gray-100 dark:bg-surface p-8 overflow-y-auto flex justify-center">
                    <Canvas fields={fields} onRemove={removeField} />
                </div>

                <DragOverlay>
                    {draggedItem ? (
                        <div className="flex items-center gap-3 p-3 bg-white dark:bg-surface border border-blue-500 rounded-lg shadow-xl opacity-90 w-48">
                            <span className="font-medium text-blue-900">{draggedItem.label}</span>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
}

const Canvas = ({ fields, onRemove }: { fields: FormField[], onRemove: (id: string) => void }) => {
    const { setNodeRef, isOver } = useDroppable({ id: 'canvas' });

    return (
        <div ref={setNodeRef} id="canvas-content" className={cn("w-[210mm] min-h-[297mm] bg-white dark:bg-surface shadow-lg p-10 flex flex-col gap-4 transition-colors relative", isOver && "bg-primary-light ring-2 ring-blue-300")}>
            <div className="text-center border-b border-gray-200 dark:border-[#444746] pb-4 mb-4">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Untitled Form</h1>
            </div>
            {fields.length === 0 && <div className="flex-1 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 dark:border-[#444746] rounded-xl">Drop fields here</div>}
            {fields.map((field) => (
                <div key={field.id} className="group relative p-4 border border-transparent hover:border-gray-200 dark:hover:border-[#444746] hover:bg-gray-50 dark:hover:bg-[#131314] rounded-lg transition-all">
                    <button onClick={() => onRemove(field.id)} className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{field.label} {field.required && <span className="text-red-500">*</span>}</label>
                    {field.type === 'text' && <input disabled type="text" className="w-full p-2 border border-gray-300 dark:border-[#444746] rounded bg-gray-50 dark:bg-[#131314]" placeholder="Text answer" />}
                    {field.type === 'checkbox' && <div className="flex items-center gap-2"><input disabled type="checkbox" className="w-4 h-4 text-primary rounded" /><span className="text-gray-500">Option</span></div>}
                    {field.type === 'image' && <div className="w-full h-32 border-2 border-dashed border-gray-300 dark:border-[#444746] rounded flex items-center justify-center bg-gray-50 dark:bg-[#131314] text-gray-400"><ImageIcon size={24} className="mr-2" /> Upload Image</div>}
                    {field.type === 'signature' && <div className="w-full h-24 border border-gray-300 dark:border-[#444746] rounded bg-gray-50 dark:bg-[#131314] flex items-end p-2"><span className="text-xs text-gray-400">Sign here</span></div>}
                </div>
            ))}
        </div>
    );
}

// Main Component with Tabs
export default function FormBuilderPage() {
    const [activeTab, setActiveTab] = useState<'forms' | 'templates'>('forms');

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center gap-4 mb-4 pb-2 border-b border-gray-200 dark:border-[#444746] px-4 pt-4">
                <button
                    onClick={() => setActiveTab('forms')}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                        activeTab === 'forms' ? "bg-primary-light text-primary-hover" : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#131314]"
                    )}
                >
                    <FileText size={18} /> Form Builder
                </button>
                <div className="w-px h-6 bg-gray-300"></div>
                <button
                    onClick={() => setActiveTab('templates')}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                        activeTab === 'templates' ? "bg-primary-light text-primary-hover" : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#131314]"
                    )}
                >
                    <LayoutTemplate size={18} /> PDF Templates
                </button>
            </div>

            <div className="flex-1 overflow-hidden px-4 pb-4">
                {activeTab === 'forms' ? <FormEditor /> : <TemplateBuilder />}
            </div>
        </div>
    );
}
