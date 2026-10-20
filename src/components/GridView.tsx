import React from 'react';
import { Worker } from '@/types';
import { cn } from '@/lib/utils';
import { Edit2, Shield, AlertTriangle, CheckCircle, Clock, FileText } from 'lucide-react';

interface GridViewProps {
    workers: Worker[];
    onEdit: (worker: Worker) => void;
}

export const GridView: React.FC<GridViewProps> = ({ workers, onEdit }) => {
    if (workers.length === 0) {
        return (
            <div className="text-center py-10 text-gray-500">
                No workers found.
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {workers.map((worker) => {
                const status = getValidationStatus(worker);

                return (
                    <div
                        key={worker.id}
                        className="bg-white dark:bg-surface rounded-xl shadow-sm border border-gray-200 dark:border-[#444746] p-5 hover:shadow-md transition-shadow relative group cursor-pointer"
                        onClick={() => onEdit(worker)}
                    >
                        {/* Status Badge */}
                        <div className={cn("absolute top-5 right-5 text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1 border shadow-2xs", status.color)}>
                            {status.status === 'valid' && <CheckCircle size={12} />}
                            {status.status === 'expired' && <AlertTriangle size={12} />}
                            {status.status === 'pending' && <Clock size={12} />}
                            {status.status === 'incomplete' && <Clock size={12} />}
                            {status.status === 'archived' && <FileText size={12} />}
                            {status.label}
                        </div>

                        <div className="flex items-center gap-4 mb-4">
                            {worker.avatarUrl ? (
                                <img src={worker.avatarUrl} alt={worker.name} className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm" />
                            ) : (
                                <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center text-brand font-medium text-xl border-2 border-white shadow-sm">
                                    {worker.name.charAt(0)}
                                </div>
                            )}
                            <div>
                                <h3 className="font-medium text-gray-900 dark:text-white line-clamp-1" title={worker.name}>{worker.name}</h3>
                                <p className="text-sm text-gray-500">{worker.role}</p>
                            </div>
                        </div>

                        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300 mb-4">
                            <div className="flex justify-between">
                                <span>Entity:</span>
                                <span className="font-medium">Company {worker.companyId.slice(0, 4)}...</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Nationality:</span>
                                <span className="font-medium">{worker.isForeign ? 'Foreign' : 'National'}</span>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-100 dark:border-[#444746] flex items-center justify-between">
                            <div className="flex -space-x-1">
                                <ValidationDot valid={!isExpired(worker.idCardExpiry)} title="ID Card" />
                                <ValidationDot valid={!isExpired(worker.medicalExpiry)} title="Medical" />
                                {worker.isForeign && <ValidationDot valid={!isExpired(worker.contractExpiry)} title="Contract" />}
                            </div>

                            <button className="text-primary hover-row p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                                <Edit2 size={16} />
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const getValidationStatus = (worker: Worker) => {
    if (worker.archived) return { status: 'archived', label: 'Arquivado', color: 'bg-gray-100 text-gray-600 border border-gray-200 dark:bg-surface dark:text-gray-300 dark:border-[#444746]' };

    // Check expiries
    const now = new Date();
    const warnings: string[] = [];

    if (worker.idCardExpiry && new Date(worker.idCardExpiry) < now) warnings.push('CC Expirado');
    if (worker.contractExpiry && new Date(worker.contractExpiry) < now) warnings.push('Contrato Expirado');
    if (worker.medicalExpiry && new Date(worker.medicalExpiry) < now) warnings.push('Apto Médico Expirado');

    if (warnings.length > 0) return { status: 'expired', label: warnings[0], color: 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800' };
    if (worker.workflowStatus === 'validated') return { status: 'valid', label: 'Validado', color: 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800' };
    if (worker.workflowStatus === 'validation_pending') return { status: 'pending', label: 'Validação Pendente', color: 'bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800' };

    return { status: 'incomplete', label: 'Em Validação', color: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800' };
};

const isExpired = (dateStr?: string) => {
    if (!dateStr) return true;
    return new Date(dateStr) < new Date();
};

const ValidationDot = ({ valid, title }: { valid: boolean; title: string }) => (
    <div
        className={cn("w-3 h-3 rounded-full border-2 border-white ring-1", valid ? "bg-green-500 ring-green-100" : "bg-red-500 ring-red-100")}
        title={title}
    />
);
