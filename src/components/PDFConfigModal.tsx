import React, { useState, useEffect } from 'react';
import { Modal, PrimaryButton, InputGroup } from './Modal';
import { FileText, Image as ImageIcon, LayoutTemplate } from 'lucide-react';
import { useStore } from '../store/useStore';

interface PDFConfig {
    pageSize: 'a4' | 'a3';
    orientation: 'portrait' | 'landscape';
    headerText: string;
    logoUrl: string | null;
    templateId?: string;
}

interface PDFConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (config: PDFConfig) => void;
}

export const PDFConfigModal: React.FC<PDFConfigModalProps> = ({ isOpen, onClose, onGenerate }) => {
    const { templates } = useStore();
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

    const [config, setConfig] = useState<PDFConfig>({
        pageSize: 'a4',
        orientation: 'portrait',
        headerText: 'Company Report',
        logoUrl: null
    });

    // When template changes, update config defaults if possible, but mainly keep ID
    useEffect(() => {
        if (selectedTemplateId) {
            const tmpl = templates.find(t => t.id === selectedTemplateId);
            if (tmpl) {
                setConfig(prev => ({
                    ...prev,
                    pageSize: tmpl.config.pageSize,
                    orientation: tmpl.config.orientation,
                    templateId: selectedTemplateId
                }));
            }
        } else {
            setConfig(prev => ({ ...prev, templateId: undefined }));
        }
    }, [selectedTemplateId, templates]);

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setConfig(prev => ({ ...prev, logoUrl: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <Modal title="Configure PDF Export" isOpen={isOpen} onClose={onClose}>
            <div className="space-y-4">
                {/* Template Selector */}
                <div className="bg-primary-light p-3 rounded-lg border border-primary/10 mb-4">
                    <label className="block text-sm font-medium text-blue-900 mb-1 flex items-center gap-2">
                        <LayoutTemplate size={16} /> Select Template (Optional)
                    </label>
                    <select
                        className="w-full p-2.5 border border-primary/20 rounded-lg outline-none focus:border-primary bg-white dark:bg-surface text-gray-700 dark:text-gray-200"
                        value={selectedTemplateId}
                        onChange={e => setSelectedTemplateId(e.target.value)}
                    >
                        <option value="">-- Use Default Layout --</option>
                        {templates.map(t => (
                            <option key={t.id} value={t.id}>{t.name} ({t.config.pageSize.toUpperCase()} - {t.config.orientation})</option>
                        ))}
                    </select>
                </div>

                {!selectedTemplateId && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-2 gap-4">
                            <InputGroup label="Page Size">
                                <select
                                    className="w-full p-2.5 border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-primary bg-white dark:bg-surface"
                                    value={config.pageSize}
                                    onChange={e => setConfig({ ...config, pageSize: e.target.value as 'a4' | 'a3' })}
                                >
                                    <option value="a4">A4 (Standard)</option>
                                    <option value="a3">A3 (Large)</option>
                                </select>
                            </InputGroup>
                            <InputGroup label="Orientation">
                                <select
                                    className="w-full p-2.5 border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-primary bg-white dark:bg-surface"
                                    value={config.orientation}
                                    onChange={e => setConfig({ ...config, orientation: e.target.value as 'portrait' | 'landscape' })}
                                >
                                    <option value="portrait">Portrait (Vertical)</option>
                                    <option value="landscape">Landscape (Horizontal)</option>
                                </select>
                            </InputGroup>
                        </div>

                        <InputGroup label="Report Header Title">
                            <input
                                type="text"
                                className="w-full p-2.5 border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-primary"
                                value={config.headerText}
                                onChange={e => setConfig({ ...config, headerText: e.target.value })}
                                placeholder="e.g., Weekly Safety Report"
                            />
                        </InputGroup>

                        <div className="border-2 border-dashed border-gray-300 dark:border-[#444746] rounded-lg p-4 text-center hover:bg-gray-50 dark:hover:bg-[#131314] transition-colors relative">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleLogoUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            {config.logoUrl ? (
                                <div className="flex flex-col items-center gap-2">
                                    <img src={config.logoUrl} alt="Logo Preview" className="h-16 object-contain" />
                                    <span className="text-xs text-green-600 font-medium">Click to change logo</span>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-gray-500">
                                    <ImageIcon size={24} />
                                    <span className="text-sm">Upload Header Logo (Optional)</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {selectedTemplateId && (
                    <div className="text-sm text-gray-500 italic text-center p-4 bg-gray-50 dark:bg-[#131314] rounded mx-auto border border-gray-200 dark:border-[#444746]">
                        Using selected template layout settings. <br /> Manual overrides are disabled.
                    </div>
                )}

                <div className="pt-4 flex justify-end gap-2 border-t">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-surface rounded-lg text-sm font-medium">Cancel</button>
                    <PrimaryButton onClick={() => onGenerate(config)} className="flex items-center justify-center gap-2">
                        <FileText size={18} /> Generate PDF
                    </PrimaryButton>
                </div>
            </div>
        </Modal>
    );
};
