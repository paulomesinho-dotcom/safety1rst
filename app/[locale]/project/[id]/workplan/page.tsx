'use client';

import React, { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import {
    ClipboardList, Plus, Upload, Download, Search,
    Calendar, Users, Wrench, Building2, ChevronRight,
    CheckCircle2, Clock, AlertTriangle, XCircle, Play,
    ArrowLeft, Filter, MoreVertical, Edit2, Trash2
} from 'lucide-react';
import { WorkPlanTask, Worker, Equipment, Company } from '@/types';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

// ─── Status Config ──────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<WorkPlanTask['status'], { label: string; color: string; bg: string; icon: React.ElementType }> = {
    planned: { label: 'Planeada', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: Clock },
    active: { label: 'Em Curso', color: 'text-green-700', bg: 'bg-green-50 border-green-200', icon: Play },
    completed: { label: 'Concluída', color: 'text-gray-600', bg: 'bg-gray-100 border-gray-200', icon: CheckCircle2 },
    delayed: { label: 'Atrasada', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: AlertTriangle },
    cancelled: { label: 'Cancelada', color: 'text-red-600', bg: 'bg-red-50 border-red-200', icon: XCircle },
};

const generateId = () => `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

// ─── Empty Task Factory ──────────────────────────────────────────────────────
const emptyTask = (projectId: string): WorkPlanTask => ({
    id: generateId(),
    projectId,
    name: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    status: 'planned',
    createdAt: new Date().toISOString(),
});

// ─── Task Modal ──────────────────────────────────────────────────────────────
const TaskModal: React.FC<{
    task: WorkPlanTask;
    workers: Worker[];
    equipment: Equipment[];
    companies: Company[];
    onSave: (task: WorkPlanTask) => void;
    onClose: () => void;
}> = ({ task, workers, equipment, companies, onSave, onClose }) => {
    const [form, setForm] = useState<WorkPlanTask>({ ...task });

    const toggleWorker = (id: string) => {
        const ids = form.assignedWorkerIds || [];
        setForm(f => ({ ...f, assignedWorkerIds: ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id] }));
    };
    const toggleEquipment = (id: string) => {
        const ids = form.assignedEquipmentIds || [];
        setForm(f => ({ ...f, assignedEquipmentIds: ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id] }));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-surface rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-[#444746] flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {task.name ? `Editar: ${task.name}` : 'Nova Tarefa'}
                    </h2>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-[#131314]">
                        <XCircle size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* Nome */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Nome da Tarefa ★</label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-200 dark:border-[#444746] rounded-lg focus:ring-2 focus:ring-primary/20 outline-none bg-white dark:bg-[#131314] text-gray-900 dark:text-gray-100"
                            placeholder="Ex: Escavação da Fundação Bloco A"
                            required
                        />
                    </div>

                    {/* WBS + IFC */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Código WBS</label>
                            <input type="text" value={form.wbs || ''} onChange={e => setForm(f => ({ ...f, wbs: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-200 dark:border-[#444746] rounded-lg outline-none bg-white dark:bg-[#131314] text-gray-900 dark:text-gray-100"
                                placeholder="Ex: 1.2.3" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Estado</label>
                            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as WorkPlanTask['status'] }))}
                                className="w-full px-3 py-2 border border-gray-200 dark:border-[#444746] rounded-lg outline-none bg-white dark:bg-[#131314] text-gray-900 dark:text-gray-100">
                                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                    <option key={k} value={k}>{v.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Datas */}
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Data de Início ★</label>
                            <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-200 dark:border-[#444746] rounded-lg outline-none bg-white dark:bg-[#131314] text-gray-900 dark:text-gray-100" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Data de Fim ★</label>
                            <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-200 dark:border-[#444746] rounded-lg outline-none bg-white dark:bg-[#131314] text-gray-900 dark:text-gray-100" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Progresso (%)</label>
                            <input type="number" min={0} max={100} value={form.progress ?? ''} onChange={e => setForm(f => ({ ...f, progress: parseInt(e.target.value) || 0 }))}
                                className="w-full px-3 py-2 border border-gray-200 dark:border-[#444746] rounded-lg outline-none bg-white dark:bg-[#131314] text-gray-900 dark:text-gray-100" />
                        </div>
                    </div>

                    {/* Empresa */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Empresa Responsável</label>
                        <select value={form.assignedCompanyId || ''} onChange={e => setForm(f => ({ ...f, assignedCompanyId: e.target.value || undefined }))}
                            className="w-full px-3 py-2 border border-gray-200 dark:border-[#444746] rounded-lg outline-none bg-white dark:bg-[#131314] text-gray-900 dark:text-gray-100">
                            <option value="">Sem empresa atribuída</option>
                            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    {/* Trabalhadores */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1"><Users size={12} /> Trabalhadores ({form.assignedWorkerIds?.length || 0})</label>
                        <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto border border-gray-100 dark:border-[#444746] rounded-lg p-2">
                            {workers.length === 0 ? (
                                <p className="text-sm text-gray-400 col-span-2 text-center py-2">Sem trabalhadores no projeto</p>
                            ) : workers.map(w => {
                                const sel = form.assignedWorkerIds?.includes(w.id);
                                return (
                                    <button key={w.id} type="button" onClick={() => toggleWorker(w.id)}
                                        className={cn('flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left transition-colors', sel ? 'bg-primary-light text-primary font-medium' : 'hover:bg-gray-50 dark:hover:bg-[#1e1e20] text-gray-700 dark:text-gray-300')}>
                                        <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600 shrink-0">
                                            {w.name.charAt(0)}
                                        </div>
                                        <span className="truncate">{w.name}</span>
                                        {sel && <CheckCircle2 size={14} className="text-primary ml-auto shrink-0" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Equipamentos */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1"><Wrench size={12} /> Equipamentos ({form.assignedEquipmentIds?.length || 0})</label>
                        <div className="grid grid-cols-2 gap-1 max-h-32 overflow-y-auto border border-gray-100 dark:border-[#444746] rounded-lg p-2">
                            {equipment.length === 0 ? (
                                <p className="text-sm text-gray-400 col-span-2 text-center py-2">Sem equipamentos no projeto</p>
                            ) : equipment.map(eq => {
                                const sel = form.assignedEquipmentIds?.includes(eq.id);
                                return (
                                    <button key={eq.id} type="button" onClick={() => toggleEquipment(eq.id)}
                                        className={cn('flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left transition-colors', sel ? 'bg-primary-light text-primary font-medium' : 'hover:bg-gray-50 dark:hover:bg-[#1e1e20] text-gray-700 dark:text-gray-300')}>
                                        <Wrench size={14} className="shrink-0" />
                                        <span className="truncate">{eq.name}</span>
                                        {sel && <CheckCircle2 size={14} className="text-primary ml-auto shrink-0" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Descrição */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Descrição / Observações</label>
                        <textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3}
                            className="w-full px-3 py-2 border border-gray-200 dark:border-[#444746] rounded-lg outline-none bg-white dark:bg-[#131314] text-gray-900 dark:text-gray-100 resize-none"
                            placeholder="Descrição da tarefa, restrições, notas..." />
                    </div>

                    {/* IFC Info */}
                    <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-700 rounded-lg p-3 text-xs text-teal-800 dark:text-teal-300">
                        <span className="font-bold">IFC:</span> Esta tarefa corresponde a um <code>IfcTask</code> com recursos atribuídos via <code>IfcRelAssignsToProcess</code> — compatível com exportação para o otimizador externo.
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 dark:border-[#444746] flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-[#1e1e20] rounded-lg transition-colors">Cancelar</button>
                    <button type="button" onClick={() => { if (!form.name) return; onSave(form); onClose(); }}
                        disabled={!form.name}
                        className="px-5 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover font-medium disabled:opacity-50 transition-colors">
                        Guardar Tarefa
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Task Row ────────────────────────────────────────────────────────────────
const TaskRow: React.FC<{
    task: WorkPlanTask;
    workers: Worker[];
    equipment: Equipment[];
    companies: Company[];
    onEdit: () => void;
    onDelete: () => void;
}> = ({ task, workers, equipment, companies, onEdit, onDelete }) => {
    const cfg = STATUS_CONFIG[task.status];
    const Icon = cfg.icon;
    const assignedWorkers = workers.filter(w => task.assignedWorkerIds?.includes(w.id));
    const assignedEquipment = equipment.filter(e => task.assignedEquipmentIds?.includes(e.id));
    const company = companies.find(c => c.id === task.assignedCompanyId);
    const dur = Math.ceil((new Date(task.endDate).getTime() - new Date(task.startDate).getTime()) / 86400000);

    return (
        <div className="bg-white dark:bg-surface border border-gray-100 dark:border-[#444746] rounded-xl p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    {/* Status + Nome */}
                    <div className="flex items-center gap-2 mb-1">
                        <span className={cn('flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold border', cfg.bg, cfg.color)}>
                            <Icon size={11} />{cfg.label}
                        </span>
                        {task.wbs && <span className="text-xs text-gray-400 font-mono">{task.wbs}</span>}
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">{task.name}</h3>

                    {/* Datas */}
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Calendar size={11} />{task.startDate} → {task.endDate}</span>
                        <span className="text-gray-300">|</span>
                        <span>{dur} dias</span>
                    </div>

                    {/* Progress bar */}
                    {task.progress !== undefined && (
                        <div className="mt-2">
                            <div className="flex justify-between text-xs text-gray-400 mb-0.5">
                                <span>Progresso</span><span>{task.progress}%</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 dark:bg-[#1e1e20] rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${task.progress}%` }} />
                            </div>
                        </div>
                    )}

                    {/* Recursos */}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                        {company && (
                            <span className="flex items-center gap-1 text-xs bg-gray-50 dark:bg-[#1e1e20] border border-gray-200 dark:border-[#444746] rounded px-2 py-0.5 text-gray-600 dark:text-gray-400">
                                <Building2 size={11} />{company.name}
                            </span>
                        )}
                        {assignedWorkers.length > 0 && (
                            <span className="flex items-center gap-1 text-xs bg-blue-50 border border-blue-200 rounded px-2 py-0.5 text-blue-700">
                                <Users size={11} />{assignedWorkers.length} trabalhador{assignedWorkers.length !== 1 ? 'es' : ''}
                            </span>
                        )}
                        {assignedEquipment.length > 0 && (
                            <span className="flex items-center gap-1 text-xs bg-amber-50 border border-amber-200 rounded px-2 py-0.5 text-amber-700">
                                <Wrench size={11} />{assignedEquipment.length} equip.
                            </span>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                    <button onClick={onEdit} className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary-light rounded-lg transition-colors" title="Editar">
                        <Edit2 size={15} />
                    </button>
                    <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                        <Trash2 size={15} />
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Main Page ───────────────────────────────────────────────────────────────
const WorkPlanPage: React.FC = () => {
    const params = useParams();
    const projectId = params?.id as string;

    const { projects, workers, equipment, companies } = useStore(useShallow(state => ({
        projects: state.projects,
        workers: state.workers,
        equipment: state.equipment,
        companies: state.companies,
    })));

    const currentProject = projects.find(p => p.id === projectId);
    const projectWorkers = (workers as Worker[]).filter((w: Worker) => w.projectId === projectId && !w.archived);
    const projectEquipment = (equipment as Equipment[]).filter((e: Equipment) => e.projectId === projectId);
    const projectCompanies = (companies as Company[]).filter((c: Company) => c.projectId === projectId && !c.archived);

    // Local state (tasks stored in memory — future: persist in store/DB)
    const [tasks, setTasks] = useState<WorkPlanTask[]>([]);
    const [editingTask, setEditingTask] = useState<WorkPlanTask | null>(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<WorkPlanTask['status'] | 'all'>('all');

    const filteredTasks = useMemo(() => tasks.filter(t => {
        if (statusFilter !== 'all' && t.status !== statusFilter) return false;
        if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    }), [tasks, search, statusFilter]);

    const saveTask = (task: WorkPlanTask) => {
        setTasks(prev => {
            const idx = prev.findIndex(t => t.id === task.id);
            if (idx >= 0) { const next = [...prev]; next[idx] = task; return next; }
            return [...prev, task];
        });
    };

    const deleteTask = (id: string) => setTasks(prev => prev.filter(t => t.id !== id));

    // Export to JSON (optimizer format)
    const exportTasks = () => {
        const payload = {
            project: { id: projectId, name: currentProject?.name },
            exportedAt: new Date().toISOString(),
            ifcSchema: 'IFC4',
            tasks: tasks.map(t => ({
                ifcType: 'IfcTask',
                guid: t.ifcGuid || t.id,
                name: t.name,
                wbs: t.wbs,
                startDate: t.startDate,
                endDate: t.endDate,
                status: t.status,
                progress: t.progress,
                assignedWorkers: t.assignedWorkerIds?.map(id => {
                    const w = projectWorkers.find(w => w.id === id);
                    return { id, name: w?.name, profession: w?.profession, category: w?.professionCategory };
                }),
                assignedEquipment: t.assignedEquipmentIds?.map(id => {
                    const eq = projectEquipment.find(e => e.id === id);
                    return { id, name: eq?.name, type: eq?.type };
                }),
                assignedCompany: t.assignedCompanyId,
                optimizerTaskId: t.optimizerTaskId,
            })),
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `workplan_${projectId}_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Import from JSON
    const importTasks = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            try {
                const data = JSON.parse(ev.target?.result as string);
                const imported: WorkPlanTask[] = (data.tasks || []).map((t: any) => ({
                    id: t.id || generateId(),
                    projectId,
                    name: t.name || 'Tarefa importada',
                    wbs: t.wbs,
                    startDate: t.startDate || new Date().toISOString().split('T')[0],
                    endDate: t.endDate || new Date().toISOString().split('T')[0],
                    status: t.status || 'planned',
                    progress: t.progress,
                    assignedWorkerIds: t.assignedWorkers?.map((w: any) => w.id),
                    assignedEquipmentIds: t.assignedEquipment?.map((e: any) => e.id),
                    assignedCompanyId: t.assignedCompany,
                    optimizerTaskId: t.optimizerTaskId,
                    optimizerData: t.optimizerData,
                    ifcGuid: t.guid,
                    description: t.description,
                    createdAt: new Date().toISOString(),
                }));
                setTasks(prev => [...prev, ...imported]);
            } catch {
                alert('Erro ao importar ficheiro. Verifique o formato JSON.');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    // Stats
    const stats = useMemo(() => ({
        total: tasks.length,
        planned: tasks.filter(t => t.status === 'planned').length,
        active: tasks.filter(t => t.status === 'active').length,
        completed: tasks.filter(t => t.status === 'completed').length,
        delayed: tasks.filter(t => t.status === 'delayed').length,
    }), [tasks]);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0f0f0f]">
            {/* Header */}
            <div className="bg-white dark:bg-surface border-b border-gray-200 dark:border-[#444746] px-6 py-4">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center gap-3 mb-1">
                        <Link href={`/pt/project/${projectId}`} className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                            <ArrowLeft size={18} />
                        </Link>
                        <ClipboardList size={22} className="text-primary" />
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Plano de Trabalhos</h1>
                            <p className="text-xs text-gray-500">{currentProject?.name} — <code>IfcTask / IfcRelAssignsToProcess</code></p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-6">
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                    {[
                        { label: 'Total', value: stats.total, color: 'text-gray-700', bg: 'bg-white' },
                        { label: 'Planeadas', value: stats.planned, color: 'text-blue-700', bg: 'bg-blue-50' },
                        { label: 'Em Curso', value: stats.active, color: 'text-green-700', bg: 'bg-green-50' },
                        { label: 'Concluídas', value: stats.completed, color: 'text-gray-600', bg: 'bg-gray-100' },
                        { label: 'Atrasadas', value: stats.delayed, color: 'text-amber-700', bg: 'bg-amber-50' },
                    ].map(s => (
                        <div key={s.label} className={cn('rounded-xl border border-gray-100 dark:border-[#444746] p-4 dark:bg-surface', s.bg)}>
                            <div className={cn('text-2xl font-bold', s.color)}>{s.value}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-3 mb-5">
                    {/* Search */}
                    <div className="flex-1 min-w-48 relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            value={search} onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-[#444746] rounded-lg bg-white dark:bg-surface text-sm outline-none focus:ring-2 focus:ring-primary/20"
                            placeholder="Pesquisar tarefas..."
                        />
                    </div>

                    {/* Status Filter */}
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}
                        className="px-3 py-2 border border-gray-200 dark:border-[#444746] rounded-lg bg-white dark:bg-surface text-sm outline-none">
                        <option value="all">Todos os estados</option>
                        {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>

                    {/* Import */}
                    <label className="cursor-pointer flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-[#444746] rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1e1e20] transition-colors">
                        <Upload size={15} /> Importar
                        <input type="file" accept=".json" className="hidden" onChange={importTasks} />
                    </label>

                    {/* Export */}
                    <button onClick={exportTasks} disabled={tasks.length === 0}
                        className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-[#444746] rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1e1e20] disabled:opacity-40 transition-colors">
                        <Download size={15} /> Exportar para Otimizador
                    </button>

                    {/* Nova tarefa */}
                    <button onClick={() => setEditingTask(emptyTask(projectId))}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover font-medium transition-colors shadow-sm">
                        <Plus size={16} /> Nova Tarefa
                    </button>
                </div>

                {/* Task List */}
                {filteredTasks.length === 0 ? (
                    <div className="text-center py-20 text-gray-400">
                        <ClipboardList size={48} className="mx-auto mb-3 opacity-30" />
                        <p className="text-lg font-medium text-gray-500">
                            {tasks.length === 0 ? 'Nenhuma tarefa criada' : 'Nenhuma tarefa corresponde ao filtro'}
                        </p>
                        <p className="text-sm mt-1">
                            {tasks.length === 0
                                ? 'Crie a primeira tarefa ou importe um plano JSON do otimizador externo.'
                                : 'Tente ajustar os filtros de pesquisa.'}
                        </p>
                        {tasks.length === 0 && (
                            <button onClick={() => setEditingTask(emptyTask(projectId))}
                                className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-hover font-medium mx-auto transition-colors">
                                <Plus size={16} /> Criar Primeira Tarefa
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filteredTasks.map(task => (
                            <TaskRow
                                key={task.id}
                                task={task}
                                workers={projectWorkers}
                                equipment={projectEquipment}
                                companies={projectCompanies}
                                onEdit={() => setEditingTask(task)}
                                onDelete={() => deleteTask(task.id)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Task Modal */}
            {editingTask && (
                <TaskModal
                    task={editingTask}
                    workers={projectWorkers}
                    equipment={projectEquipment}
                    companies={projectCompanies}
                    onSave={saveTask}
                    onClose={() => setEditingTask(null)}
                />
            )}
        </div>
    );
};

export default WorkPlanPage;
