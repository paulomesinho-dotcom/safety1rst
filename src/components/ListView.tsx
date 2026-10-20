import React from 'react';
import { MoreVertical, Edit2, Trash2, FileText, Smartphone, Shield, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Worker, Company } from '@/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { TableActionMenu } from './TableActionMenu';

interface ListViewProps {
    workers: Worker[];
    companies: Company[];
    onEdit: (worker: Worker) => void;
    getStatus: (worker: Worker) => { status: string; label: string; color: string };
    openMenuId: string | null;
    setOpenMenuId: (id: string | null) => void;
    onAction: (action: string, worker: Worker) => void;
    canEdit: boolean;
    canDelete: boolean;
}

export const ListView: React.FC<ListViewProps> = ({
    workers,
    companies,
    onEdit,
    getStatus,
    openMenuId,
    setOpenMenuId,
    onAction,
    canEdit,
    canDelete
}) => {
    if (workers.length === 0) {
        return (
            <div className="bg-white dark:bg-surface rounded-xl shadow-sm border border-gray-200 dark:border-[#444746] p-8 text-center">
                <p className="text-gray-500">Nenhuma pessoa encontrada.</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-surface">
            <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 dark:bg-[#131314] text-gray-500 font-medium border-b border-gray-200 dark:border-[#444746]">
                    <tr>
                        <th className="px-6 py-3 w-12 text-center">#</th>
                        <th className="px-6 py-3">Pessoa / Função</th>
                        <th className="px-6 py-3 text-center">Organização</th>
                        <th className="px-6 py-3 text-center">Nationality</th>
                        <th className="px-6 py-3 text-center">Status</th>
                        <th className="px-6 py-3 text-center">Validations</th>
                        <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {workers.map((worker, index) => {
                        const validation = getStatus(worker);
                        const company = companies.find(c => c.id === worker.companyId);

                        return (
                            <tr key={worker.id} onClick={() => onEdit(worker)} className="bg-white dark:bg-surface border-b border-gray-50 hover-row cursor-pointer transition-colors group">
                                <td className="px-6 py-4 text-center font-mono text-xs text-gray-400">
                                    {index + 1}
                                </td>
                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                    <div className="flex items-center gap-3">
                                        {worker.avatarUrl ? (
                                            <img src={worker.avatarUrl} alt={worker.name} className="w-10 h-10 rounded-full object-cover border border-gray-100 dark:border-[#444746]" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-brand font-medium border border-blue-100">
                                                {worker.name.charAt(0)}
                                            </div>
                                        )}
                                        <div>
                                            <div className="font-medium text-gray-900 dark:text-white line-clamp-1 max-w-[180px]" title={worker.name}>{worker.name}</div>
                                            <div className="text-xs text-gray-500 flex items-center gap-1">
                                                <BriefcaseIcon size={12} />
                                                {worker.role}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex flex-col items-center">
                                        <span className="font-normal text-gray-800 dark:text-gray-100 text-xs">{company?.name || 'Unknown'}</span>
                                        <span className="text-[10px] text-gray-400">NIF: {worker.nif}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    {worker.isForeign ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                                            🌍 Foreign
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-brand border border-blue-100">
                                            🇵🇹 National
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={cn(
                                        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border shadow-2xs",
                                        validation.color
                                    )}>
                                        {validation.status === 'valid' && <CheckCircle size={12} />}
                                        {validation.status === 'expired' && <AlertTriangle size={12} />}
                                        {validation.status === 'pending' && <Clock size={12} />}
                                        {validation.status === 'incomplete' && <Clock size={12} />}
                                        {validation.status === 'archived' && <FileText size={12} />}
                                        {validation.label}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex justify-center -space-x-1">
                                        <ValidationDot valid={!isExpired(worker.idCardExpiry)} title={`CC: ${getStatusText(worker.idCardExpiry)}`} />
                                        <ValidationDot valid={!isExpired(worker.medicalExpiry)} title={`Medical: ${getStatusText(worker.medicalExpiry)}`} />
                                        {worker.isForeign && (
                                            <ValidationDot valid={!isExpired(worker.contractExpiry)} title={`Contract: ${getStatusText(worker.contractExpiry)}`} />
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right relative">
                                    <TableActionMenu
                                        isOpen={openMenuId === worker.id}
                                        onToggle={() => setOpenMenuId(openMenuId === worker.id ? null : worker.id)}
                                        onClose={() => setOpenMenuId(null)}
                                    >
                                        {canEdit && (
                                            <button onClick={() => { onEdit(worker); setOpenMenuId(null); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#131314] flex items-center gap-2">
                                                <Edit2 size={16} /> Edit Details
                                            </button>
                                        )}
                                        <button onClick={() => onAction('card', worker)} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#131314] flex items-center gap-2">
                                            <Smartphone size={16} /> Access Card
                                        </button>
                                        <button onClick={() => { onEdit(worker); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#131314] flex items-center gap-2">
                                            <FileText size={16} /> Documents
                                        </button>
                                        <div className="h-px bg-gray-100 dark:bg-surface my-1" />
                                        {canDelete && (
                                            <button onClick={() => onAction('archive', worker)} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                                                <Trash2 size={16} /> Arquivar Pessoa
                                            </button>
                                        )}
                                    </TableActionMenu>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

const BriefcaseIcon = ({ size }: { size: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
);

const isExpired = (dateStr?: string) => {
    if (!dateStr) return true; // Missing date is considered invalid/expired for dot check
    return new Date(dateStr) < new Date();
};

const getStatusText = (dateStr?: string) => {
    if (!dateStr) return 'Missing';
    return isExpired(dateStr) ? 'Expired' : 'Valid';
};

const ValidationDot = ({ valid, title }: { valid: boolean; title: string }) => (
    <div
        className={cn("w-3 h-3 rounded-full border-2 border-white ring-1", valid ? "bg-green-500 ring-green-100" : "bg-red-500 ring-red-100")}
        title={title}
    />
);
