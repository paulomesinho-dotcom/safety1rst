
import React, { useState, useEffect } from 'react';
import { X, Settings, Check, Shield } from 'lucide-react';
import { Project } from '../types';
import { useStore } from '../store/useStore';

interface ProjectSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    project: Project;
}

export default function ProjectSettingsModal({ isOpen, onClose, project }: ProjectSettingsModalProps) {
    const updateProject = useStore(state => state.updateProject);

    // Local state for settings
    const [settings, setSettings] = useState<{
        approvalWorkflow: {
            companies: boolean;
            workers: boolean;
            equipment: boolean;
        }
    }>({
        approvalWorkflow: {
            companies: false,
            workers: false,
            equipment: false
        }
    });

    useEffect(() => {
        if (project) {
            setSettings({
                approvalWorkflow: project.approvalWorkflow || {
                    companies: false,
                    workers: false,
                    equipment: false
                }
            });
        }
    }, [project]);

    const handleSave = () => {
        updateProject(project.id, {
            approvalWorkflow: settings.approvalWorkflow
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[9000] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-surface rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50 dark:bg-[#131314]">
                    <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <Settings size={20} className="text-gray-500" />
                        Definições do Projeto
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Approval Workflow Section */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="bg-purple-100 p-2 rounded-lg text-purple-600">
                                <Shield size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-800 dark:text-gray-100">Workflow de Aprovação</h4>
                                <p className="text-xs text-gray-500">Ative para exigir uma etapa extra de aprovação após a validação.</p>
                            </div>
                        </div>

                        <div className="space-y-3 bg-gray-50 dark:bg-[#131314] p-4 rounded-xl border border-gray-200 dark:border-[#444746]">
                            {/* Companies Toggle */}
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Empresas</span>
                                <button
                                    onClick={() => setSettings(prev => ({
                                        ...prev,
                                        approvalWorkflow: { ...prev.approvalWorkflow, companies: !prev.approvalWorkflow.companies }
                                    }))}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${settings.approvalWorkflow.companies ? 'bg-purple-600' : 'bg-gray-200'}`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-surface transition-transform ${settings.approvalWorkflow.companies ? 'translate-x-6' : 'translate-x-1'}`}
                                    />
                                </button>
                            </div>

                            {/* Workers Toggle */}
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Trabalhadores</span>
                                <button
                                    onClick={() => setSettings(prev => ({
                                        ...prev,
                                        approvalWorkflow: { ...prev.approvalWorkflow, workers: !prev.approvalWorkflow.workers }
                                    }))}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${settings.approvalWorkflow.workers ? 'bg-purple-600' : 'bg-gray-200'}`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-surface transition-transform ${settings.approvalWorkflow.workers ? 'translate-x-6' : 'translate-x-1'}`}
                                    />
                                </button>
                            </div>

                            {/* Equipment Toggle */}
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Equipamentos</span>
                                <button
                                    onClick={() => setSettings(prev => ({
                                        ...prev,
                                        approvalWorkflow: { ...prev.approvalWorkflow, equipment: !prev.approvalWorkflow.equipment }
                                    }))}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${settings.approvalWorkflow.equipment ? 'bg-purple-600' : 'bg-gray-200'}`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-surface transition-transform ${settings.approvalWorkflow.equipment ? 'translate-x-6' : 'translate-x-1'}`}
                                    />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-[#131314] border-t flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-surface hover:shadow-sm rounded-lg border border-transparent hover:border-gray-200 dark:hover:border-[#444746] transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-black rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-2"
                    >
                        <Check size={16} />
                        Guardar Alterações
                    </button>
                </div>
            </div>
        </div>
    );
}
