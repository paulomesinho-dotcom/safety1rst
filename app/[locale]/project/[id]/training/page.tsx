'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/navigation';
import {
    GraduationCap, Plus, Search, Trash2, Edit, CheckCircle,
    Zap, ArrowUp, HeartPulse, HardHat, Box, Pickaxe, Flame,
    ShieldAlert, Anchor, Radiation, Construction, LayoutGrid, List,
    Lock, Users, Wind, Siren, Wand2, BookOpen, Play,
    FileText, Clock, Calendar, MapPin, UserCheck, ChevronRight,
    AlertCircle, CheckCircle2, FileDown,
} from 'lucide-react';
import { Modal, InputGroup, PrimaryButton, SecondaryButton } from '@/components/Modal';
import { ConfirmationModal } from '@/components/ConfirmationModal';
import { SignatureModal } from '@/components/training/SignatureModal';
import { useStore } from '@/store/useStore';
import { Training, Course, TrainingSession } from '@/types';
import { cn } from '@/lib/utils';
import { nanoid } from 'nanoid';

const DEFAULT_QUALIFICATIONS: Array<{
    name: string; provider: string; description: string;
    type: Training['type']; validityMonths: number; icon: string;
}> = [
    { name: 'Formação de Manobrador', provider: 'Geral', description: 'Operação de máquinas.', type: 'machinery', validityMonths: 24, icon: 'Construction' },
    { name: 'Trabalhos em Tensão', provider: 'Geral', description: 'Trabalhos elétricos.', type: 'electrical', validityMonths: 12, icon: 'Zap' },
    { name: 'Montagem de Andaimes', provider: 'Geral', description: 'Montagem e desmontagem de estruturas.', type: 'heights', validityMonths: 12, icon: 'ArrowUp' }
];

const TRAINING_TYPES = [
    { value: 'general',        label: 'Geral',              icon: GraduationCap, color: 'text-primary bg-primary-light' },
    { value: 'heights',        label: 'Trabalhos em Altura', icon: ArrowUp,       color: 'text-purple-600 bg-purple-100' },
    { value: 'electrical',     label: 'Elétrica',            icon: Zap,           color: 'text-yellow-600 bg-yellow-100' },
    { value: 'first_aid',      label: 'Primeiros Socorros',  icon: HeartPulse,    color: 'text-red-600 bg-red-100' },
    { value: 'confined_space', label: 'Espaços Confinados',  icon: Box,           color: 'text-orange-600 bg-orange-100' },
    { value: 'machinery',      label: 'Maquinaria',          icon: HardHat,       color: 'text-slate-600 bg-slate-100' },
];

const AVAILABLE_ICONS = [
    { name: 'Zap', icon: Zap }, { name: 'ArrowUp', icon: ArrowUp }, { name: 'Box', icon: Box },
    { name: 'Pickaxe', icon: Pickaxe }, { name: 'Flame', icon: Flame }, { name: 'ShieldAlert', icon: ShieldAlert },
    { name: 'Anchor', icon: Anchor }, { name: 'HardHat', icon: HardHat }, { name: 'Radiation', icon: Radiation },
    { name: 'Construction', icon: Construction }, { name: 'Wind', icon: Wind }, { name: 'Siren', icon: Siren },
];

const SESSION_STATUS_MAP: Record<TrainingSession['status'], { label: string; color: string }> = {
    scheduled:   { label: 'Agendada',    color: 'bg-blue-100 text-blue-700' },
    in_progress: { label: 'Em Curso',    color: 'bg-amber-100 text-amber-700' },
    completed:   { label: 'Concluída',   color: 'bg-green-100 text-green-700' },
    cancelled:   { label: 'Cancelada',   color: 'bg-gray-100 text-gray-500' },
};

const TrainingPage = () => {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;
    const locale = params.locale as string || 'pt';

    const {
        trainings, addTraining, updateTraining, deleteTraining, account,
        courses, deleteCourse,
        trainingSessions, addTrainingSession, updateTrainingSession, deleteTrainingSession,
        addWorkerTrainingRecord,
        workers, companies, currentUser,
    } = useStore();

    const [activeTab, setActiveTab] = useState<'trainings' | 'courses' | 'sessions'>('trainings');

    // ── Training (Formações) state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [newTraining, setNewTraining] = useState<Partial<Training>>({ name: '', provider: '', type: 'general', validityMonths: 12, icon: undefined });

    // ── Courses (Cursos) state
    const [deleteCourseConfirm, setDeleteCourseConfirm] = useState<string | null>(null);
    const [courseSearch, setCourseSearch] = useState('');
    const [courseViewMode, setCourseViewMode] = useState<'grid' | 'list'>('grid');

    // ── Sessions (Turmas) state
    const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
    const [deleteSessionConfirm, setDeleteSessionConfirm] = useState<string | null>(null);
    const [signatureSession, setSignatureSession] = useState<TrainingSession | null>(null);
    const [sessionSearch, setSessionSearch] = useState('');
    const [newSession, setNewSession] = useState<{
        courseId: string; scheduledDate: string; location: string;
        selectedWorkers: string[]; notes: string;
    }>({
        courseId: '', scheduledDate: new Date().toISOString().split('T')[0],
        location: '', selectedWorkers: [], notes: '',
    });
    
    const [sessionWorkerSearch, setSessionWorkerSearch] = useState('');
    const [sessionWorkerSort, setSessionWorkerSort] = useState<'name' | 'recent'>('recent');
    const [sessionWorkerCompany, setSessionWorkerCompany] = useState<string>('all');

    // ── Auto-seed default qualifications ─────────────────────────────────────
    useEffect(() => {
        const projectTrainingsCount = trainings.filter(t => t.projectId === projectId).length;
        if (projectTrainingsCount === 0 && account) {
            DEFAULT_QUALIFICATIONS.forEach(def => {
                addTraining({ name: def.name, provider: def.provider, type: def.type, validityMonths: def.validityMonths, icon: def.icon, isMandatory: false, accountId: account.id, projectId } as any);
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId, trainings.length, account]);

    // ── Filters ──────────────────────────────────────────────────────────────
    const allProjectTrainings = trainings.filter(t => t.projectId === projectId);
    const optionalList = allProjectTrainings.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const projectCourses = courses.filter(c => c.projectId === projectId && c.title.toLowerCase().includes(courseSearch.toLowerCase()));
    const projectWorkers = workers.filter(w => w.projectId === projectId);
    const projectCompanies = companies.filter(c => c.projectId === projectId);

    const filteredWorkers = projectWorkers.filter(w => {
        const company = companies.find(c => c.id === w.companyId);
        const matchesSearch = w.name.toLowerCase().includes(sessionWorkerSearch.toLowerCase()) || 
                              w.id.toLowerCase().includes(sessionWorkerSearch.toLowerCase()) || 
                              (company?.name.toLowerCase() || '').includes(sessionWorkerSearch.toLowerCase()) ||
                              (w.role?.toLowerCase() || '').includes(sessionWorkerSearch.toLowerCase());
        const matchesCompany = sessionWorkerCompany === 'all' || w.companyId === sessionWorkerCompany;
        return matchesSearch && matchesCompany;
    }).sort((a, b) => {
        if (sessionWorkerSort === 'name') return a.name.localeCompare(b.name);
        if (sessionWorkerSort === 'recent') {
            const dateA = a.entryDate ? new Date(a.entryDate).getTime() : 0;
            const dateB = b.entryDate ? new Date(b.entryDate).getTime() : 0;
            return dateB - dateA;
        }
        return 0;
    });

    const handleSelectAllWorkers = () => {
        const ids = filteredWorkers.map(w => w.id);
        const newIds = ids.filter(id => !newSession.selectedWorkers.includes(id));
        setNewSession(prev => ({
            ...prev,
            selectedWorkers: [...prev.selectedWorkers, ...newIds]
        }));
    };

    const handleDeselectAllWorkers = () => {
        const ids = filteredWorkers.map(w => w.id);
        setNewSession(prev => ({
            ...prev,
            selectedWorkers: prev.selectedWorkers.filter(id => !ids.includes(id))
        }));
    };

    const projectSessions = trainingSessions.filter(s =>
        s.projectId === projectId && (
            sessionSearch === '' ||
            courses.find(c => c.id === s.courseId)?.title.toLowerCase().includes(sessionSearch.toLowerCase()) ||
            s.location.toLowerCase().includes(sessionSearch.toLowerCase())
        )
    );

    // ── Formações handlers ────────────────────────────────────────────────────
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTraining.name || !newTraining.provider) return;
        if (editingId) {
            updateTraining(editingId, { name: newTraining.name, provider: newTraining.provider, type: newTraining.type as any, validityMonths: Number(newTraining.validityMonths), icon: newTraining.icon });
        } else {
            addTraining({ name: newTraining.name!, provider: newTraining.provider!, type: newTraining.type as any, validityMonths: Number(newTraining.validityMonths), icon: newTraining.icon, accountId: account?.id || 'acc_1', projectId });
        }
        setIsModalOpen(false);
        setNewTraining({ name: '', provider: '', type: 'general', validityMonths: 12, icon: undefined });
        setEditingId(null);
    };

    const handleEdit = (training: Training) => {
        if (training.isMandatory) return;
        setNewTraining({ name: training.name, provider: training.provider, type: training.type, validityMonths: training.validityMonths, icon: training.icon });
        setEditingId(training.id);
        setIsModalOpen(true);
    };

    const getIconEl = (t: Training) => {
        if (t.icon) { const C = AVAILABLE_ICONS.find(i => i.name === t.icon)?.icon; if (C) return <C size={18} />; }
        const typeDef = TRAINING_TYPES.find(x => x.value === t.type);
        const Icon = typeDef?.icon || GraduationCap;
        return <Icon size={18} />;
    };

    const getMandatoryIcon = (iconName: string) => {
        const match = AVAILABLE_ICONS.find(i => i.name === iconName);
        if (match) { const Icon = match.icon; return <Icon size={18} />; }
        return <GraduationCap size={18} />;
    };

    const getTypeColor = (type: string) => TRAINING_TYPES.find(x => x.value === type)?.color || 'bg-gray-100 text-gray-500';
    const getTypeBadge = (type: string) => {
        const t = TRAINING_TYPES.find(x => x.value === type);
        return <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${t?.color}`}>{t ? <t.icon size={12} /> : null}{t?.label}</span>;
    };

    // ── Courses helpers ───────────────────────────────────────────────────────
    const courseTypeLabel = (type: Course['type']) => {
        const map: Record<string, string> = { general_safety: 'Segurança Geral', onboarding: 'Acolhimento', environment: 'Ambiente', emergency: 'Emergência', safety_plan: 'Plano Segurança', task_based: 'Por Função' };
        return map[type] || type;
    };
    const courseStatusBadge = (status: Course['status']) => {
        if (status === 'published') return <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-bold">Publicado</span>;
        if (status === 'archived') return <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-bold">Arquivado</span>;
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">Rascunho</span>;
    };

    // ── Session handlers ──────────────────────────────────────────────────────
    const handleCreateSession = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSession.courseId || !newSession.scheduledDate) return;
        addTrainingSession({
            courseId: newSession.courseId,
            projectId,
            accountId: account?.id || 'acc_1',
            status: 'scheduled',
            scheduledDate: newSession.scheduledDate,
            location: newSession.location,
            trainerId: currentUser?.id || '',
            enrolledWorkers: newSession.selectedWorkers,
            attendees: newSession.selectedWorkers.map(wId => ({ workerId: wId, present: false })),
            notes: newSession.notes,
        });
        setIsSessionModalOpen(false);
        setNewSession({ courseId: '', scheduledDate: new Date().toISOString().split('T')[0], location: '', selectedWorkers: [], notes: '' });
    };

    const toggleWorkerSelection = (workerId: string) => {
        setNewSession(prev => ({
            ...prev,
            selectedWorkers: prev.selectedWorkers.includes(workerId)
                ? prev.selectedWorkers.filter(id => id !== workerId)
                : [...prev.selectedWorkers, workerId],
        }));
    };

    const getWorkerName = (workerId: string) => workers.find(w => w.id === workerId)?.name || workerId;
    const getWorkerCompany = (workerId: string) => {
        const worker = workers.find(w => w.id === workerId);
        return companies.find(c => c.id === worker?.companyId)?.name || 'Sem Empresa';
    };

    // ── Complete session: register training records for each signed worker ────
    const handleCompleteSession = (session: TrainingSession, signatures: { workerId: string; signatureDataUrl: string; signedAt: string }[]) => {
        const course = courses.find(c => c.id === session.courseId);
        const now = new Date().toISOString();
        const updatedAttendees = session.attendees.map(a => {
            const sig = signatures.find(s => s.workerId === a.workerId);
            return sig ? { ...a, present: true, signedAt: sig.signedAt, signatureImageBase64: sig.signatureDataUrl } : a;
        });
        updateTrainingSession(session.id, { status: 'completed', completedAt: now, attendees: updatedAttendees });
        signatures.forEach(sig => {
            const validity = course?.validityMonths;
            const validUntil = validity ? new Date(Date.now() + validity * 30 * 24 * 3600 * 1000).toISOString() : undefined;
            addWorkerTrainingRecord({
                workerId: sig.workerId,
                projectId: session.projectId,
                courseId: session.courseId,
                sessionId: session.id,
                trainingType: course?.type || 'general_safety',
                courseTitle: course?.title || 'Formação',
                completedAt: sig.signedAt,
                validUntil,
                passed: true,
                trainerId: session.trainerId,
                trainerName: currentUser?.name || '',
                signedDocumentUrl: sig.signatureDataUrl,
                source: 'presential',
            } as any);
        });
        setSignatureSession(null);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-[#444746] mb-0 px-4 pt-4">
                <div className="flex items-center gap-3">
                    <div className="bg-primary-light p-2 rounded-lg text-primary"><GraduationCap size={20} /></div>
                    <div>
                        <h2 className="text-xl font-normal text-gray-800 dark:text-gray-100">Qualificações &amp; Formações</h2>
                        <p className="text-xs text-gray-500">Gerir qualificações exigidas, formações do projeto e turmas</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    {activeTab === 'trainings' && (
                        <>
                            <div className="flex items-center gap-2">
                                <div className="flex bg-gray-100 dark:bg-surface p-1 rounded-lg">
                                    <button title="Vista em grelha" onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-surface shadow text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'}`}><LayoutGrid size={16} /></button>
                                    <button title="Vista em lista" onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-surface shadow text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'}`}><List size={16} /></button>
                                </div>
                                <div className="relative">
                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input type="text" title="Pesquisar formações" placeholder="Pesquisar formações..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                        className="pl-9 pr-4 py-1.5 text-sm border border-gray-200 dark:border-[#444746] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-light w-56" />
                                </div>
                            </div>
                            <button onClick={() => { setEditingId(null); setNewTraining({ name: '', provider: '', type: 'general', validityMonths: 12, icon: undefined }); setIsModalOpen(true); }}
                                className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-hover shadow-sm">
                                <Plus size={16} /> Adicionar Qualificação
                            </button>
                        </>
                    )}
                    {activeTab === 'courses' && (
                        <>
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input type="text" title="Pesquisar cursos" placeholder="Pesquisar cursos..." value={courseSearch} onChange={e => setCourseSearch(e.target.value)}
                                    className="pl-9 pr-4 py-1.5 text-sm border border-gray-200 dark:border-[#444746] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-light w-56" />
                            </div>
                            <div className="flex items-center border border-gray-200 dark:border-[#444746] rounded-lg overflow-hidden">
                                <button title="Vista em grelha" onClick={() => setCourseViewMode('grid')} className={cn('p-1.5 transition-colors', courseViewMode === 'grid' ? 'bg-primary text-white' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2b2c]')}>
                                    <LayoutGrid size={15} />
                                </button>
                                <button title="Vista em lista" onClick={() => setCourseViewMode('list')} className={cn('p-1.5 transition-colors', courseViewMode === 'list' ? 'bg-primary text-white' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2b2c]')}>
                                    <List size={15} />
                                </button>
                            </div>
                            <button onClick={() => router.push(`/project/${projectId}/training/courses/new` as any)}
                                className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-hover shadow-sm">
                                <Plus size={16} /> Nova Formação
                            </button>
                        </>
                    )}
                    {activeTab === 'sessions' && (
                        <>
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input type="text" title="Pesquisar turmas" placeholder="Pesquisar turmas..." value={sessionSearch} onChange={e => setSessionSearch(e.target.value)}
                                    className="pl-9 pr-4 py-1.5 text-sm border border-gray-200 dark:border-[#444746] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-light w-56" />
                            </div>
                            <button onClick={() => setIsSessionModalOpen(true)}
                                className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-hover shadow-sm">
                                <Plus size={16} /> Nova Turma
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-[#444746] px-4 bg-white dark:bg-surface shrink-0">
                {([
                    { id: 'trainings' as const, label: 'Qualificações', icon: GraduationCap },
                    { id: 'courses' as const, label: 'Formações', icon: BookOpen },
                    { id: 'sessions' as const, label: 'Turmas', icon: Users },
                ]).map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={cn('flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
                            activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700')}>
                        <tab.icon size={14} />{tab.label}
                        {tab.id === 'sessions' && projectSessions.length > 0 && (
                            <span className="ml-1 text-[10px] bg-primary-light text-primary px-1.5 py-0.5 rounded-full font-bold">{projectSessions.length}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4 space-y-6">

                {activeTab === 'trainings' && (
                    <>
                        <div>
                            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3 flex items-center gap-2"><GraduationCap size={16} /> Base de Qualificações</h3>
                            {viewMode === 'list' ? (
                                <div className="bg-white dark:bg-surface border border-gray-200 dark:border-[#444746] rounded-xl overflow-hidden">
                                    {optionalList.length === 0 ? (
                                        <div className="text-center py-12 text-gray-400"><GraduationCap size={40} className="mx-auto mb-3 opacity-30" /><p className="font-medium">Sem formações adicionais</p><p className="text-sm mt-1">Adiciona formações específicas do projeto.</p></div>
                                    ) : (
                                        <table className="w-full text-sm">
                                            <thead className="text-xs text-gray-400 uppercase border-b border-gray-100 dark:border-[#444746] bg-gray-50 dark:bg-[#131314]">
                                                <tr><th className="px-6 py-3 text-left font-medium">Nome</th><th className="px-6 py-3 text-left font-medium">Categoria</th><th className="px-6 py-3 text-left font-medium">Formador</th><th className="px-6 py-3 text-center font-medium">Validade</th><th className="px-6 py-3"></th></tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50 dark:divide-[#444746]">
                                                {optionalList.map(t => (
                                                    <tr key={t.id} className="group hover:bg-primary-light transition-colors">
                                                        <td className="px-6 py-4"><div className="flex items-center gap-3"><div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${getTypeColor(t.type)}`}>{getIconEl(t)}</div><span className="font-medium">{t.name}</span></div></td>
                                                        <td className="px-6 py-4">{getTypeBadge(t.type)}</td>
                                                        <td className="px-6 py-4 text-gray-500">{t.provider}</td>
                                                        <td className="px-6 py-4 text-center text-gray-500">{t.validityMonths}m</td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100">
                                                                <button onClick={() => handleEdit(t)} className="p-1.5 hover:bg-white dark:hover:bg-surface rounded text-gray-500 hover:text-primary" title="Editar"><Edit size={16} /></button>
                                                                <button onClick={() => setDeleteConfirmation(t.id)} className="p-1.5 hover:bg-white dark:hover:bg-surface rounded text-red-600" title="Eliminar"><Trash2 size={16} /></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {optionalList.length === 0 && <div className="col-span-full text-center py-20 text-gray-400 bg-gray-50 dark:bg-[#131314] rounded-xl border-dashed border-2 border-gray-200"><GraduationCap size={48} className="mx-auto mb-4 opacity-50" /><p className="text-lg font-medium">Sem formações adicionais</p></div>}
                                    {optionalList.map(t => (
                                        <div key={t.id} className="bg-white dark:bg-surface border border-gray-200 dark:border-[#444746] rounded-xl p-5 hover:shadow-md transition-all group relative flex flex-col gap-4">
                                            <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100">
                                                <button onClick={() => handleEdit(t)} className="p-1.5 hover:bg-gray-100 rounded-md text-gray-500" title="Editar"><Edit size={16} /></button>
                                                <button onClick={() => setDeleteConfirmation(t.id)} className="p-1.5 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded-md" title="Eliminar"><Trash2 size={16} /></button>
                                            </div>
                                            <div className="flex items-start gap-4"><div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${getTypeColor(t.type)}`}>{getIconEl(t)}</div><div className="min-w-0"><h3 className="font-semibold text-gray-900 dark:text-white truncate pr-6">{t.name}</h3><p className="text-xs text-gray-500 truncate">{t.provider}</p></div></div>
                                            <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">{getTypeBadge(t.type)}<span className="text-xs text-gray-400 font-medium">{t.validityMonths}m</span></div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* ── CURSOS tab (now Formações) ── */}
                {activeTab === 'courses' && (
                    <div>
                        {projectCourses.length === 0 ? (
                            <div className="text-center py-24 text-gray-400">
                                <BookOpen size={48} className="mx-auto mb-4 opacity-30" />
                                <p className="text-lg font-medium">Nenhum curso criado ainda</p>
                                <p className="text-sm mt-1">Cria um curso manualmente ou usa a AI para gerar conteúdo automaticamente.</p>
                                <button onClick={() => router.push(`/project/${projectId}/training/courses/new` as any)}
                                    className="mt-4 inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-hover">
                                    <Wand2 size={16} /> Criar Primeiro Curso
                                </button>
                            </div>
                        ) : courseViewMode === 'list' ? (
                            <div className="bg-white dark:bg-surface rounded-xl border border-gray-200 dark:border-[#444746] overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-[#131314] border-b border-gray-100 dark:border-[#444746]">
                                        <tr>
                                            <th className="px-4 py-3 text-left">Título</th>
                                            <th className="px-4 py-3 text-left">Tipo</th>
                                            <th className="px-4 py-3 text-center">Slides</th>
                                            <th className="px-4 py-3 text-left">Estado</th>
                                            <th className="px-4 py-3 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-[#444746]">
                                        {projectCourses.map(c => (
                                            <tr key={c.id} className="hover:bg-primary-light cursor-pointer group" onClick={() => router.push(`/project/${projectId}/training/courses/${c.id}` as any)}>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        {c.coverImage ? (
                                                            <img src={c.coverImage} alt={c.title} className="w-10 h-10 rounded-lg object-cover shrink-0 border border-gray-100 dark:border-[#444746]" />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-[#2a2b2c] flex items-center justify-center shrink-0">
                                                                <BookOpen size={16} className="text-gray-400" />
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p className="font-medium text-gray-900 dark:text-white">{c.title}</p>
                                                            <p className="text-xs text-gray-400 flex items-center gap-1"><Clock size={10} />{c.estimatedDuration || '?'} min · {c.questions?.length || 0} perguntas</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3"><span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full">{courseTypeLabel(c.type)}</span></td>
                                                <td className="px-4 py-3 text-center text-gray-600">{c.slides?.length || 0}</td>
                                                <td className="px-4 py-3">{courseStatusBadge(c.status)}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100">
                                                        <button onClick={e => { e.stopPropagation(); window.open(`/${locale}/present/${c.id}`, '_blank'); }} className="p-1.5 hover:bg-green-50 text-green-600 rounded border border-transparent hover:border-green-200" title="Iniciar Apresentação"><Play size={14} /></button>
                                                        <button onClick={e => { e.stopPropagation(); setDeleteCourseConfirm(c.id); }} className="p-1.5 hover:bg-red-50 text-red-600 rounded border border-transparent hover:border-red-200" title="Eliminar"><Trash2 size={14} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {projectCourses.map(c => (
                                    <div key={c.id} onClick={() => router.push(`/project/${projectId}/training/courses/${c.id}` as any)} className="bg-white dark:bg-surface border border-gray-200 dark:border-[#444746] rounded-xl overflow-hidden hover:shadow-md transition-all cursor-pointer group flex flex-col relative">
                                        <div className="h-36 bg-gray-50 dark:bg-[#131314] relative border-b border-gray-100 dark:border-[#444746]">
                                            {c.coverImage ? (
                                                <img src={c.coverImage} alt={c.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center text-gray-300 dark:text-gray-600">
                                                    <BookOpen size={40} className="opacity-40" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-4 flex flex-col flex-1">
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2 text-sm leading-snug">{c.title}</h3>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mb-4">
                                                <span className="flex items-center gap-1"><Clock size={12} /> {c.estimatedDuration || '?'}m</span>
                                                <span className="flex items-center gap-1"><FileText size={12} /> {c.slides.length} slides</span>
                                                <span className="flex items-center gap-1"><Wand2 size={12} className={c.sourceType === 'ai_generated' ? 'text-purple-500' : ''} /> {courseTypeLabel(c.type)}</span>
                                            </div>
                                            <div className="mt-auto flex items-center justify-between pt-3 border-t border-gray-50 dark:border-[#444746]">
                                                {courseStatusBadge(c.status)}
                                                <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={e => { e.stopPropagation(); window.open(`/${locale}/present/${c.id}`, '_blank'); }} className="p-1.5 hover:bg-green-50 text-green-600 rounded border border-transparent hover:border-green-200 transition-colors bg-white dark:bg-surface" title="Iniciar Apresentação"><Play size={14} /></button>
                                                    <button onClick={e => { e.stopPropagation(); setDeleteCourseConfirm(c.id); }} className="p-1.5 hover:bg-red-50 text-red-600 rounded border border-transparent hover:border-red-200 transition-colors bg-white dark:bg-surface" title="Eliminar"><Trash2 size={14} /></button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── TURMAS tab ── */}
                {activeTab === 'sessions' && (
                    <div>
                        {projectSessions.length === 0 ? (
                            <div className="text-center py-24 text-gray-400">
                                <Users size={48} className="mx-auto mb-4 opacity-30" />
                                <p className="text-lg font-medium">Nenhuma turma criada</p>
                                <p className="text-sm mt-1">Cria uma turma para agendar uma sessão de formação com trabalhadores.</p>
                                <button onClick={() => setIsSessionModalOpen(true)}
                                    className="mt-4 inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-hover">
                                    <Plus size={16} /> Criar Primeira Turma
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {projectSessions.map(session => {
                                    const course = courses.find(c => c.id === session.courseId);
                                    const st = SESSION_STATUS_MAP[session.status];
                                    const present = session.attendees.filter(a => a.present).length;
                                    return (
                                        <div key={session.id} className="bg-white dark:bg-surface border border-gray-200 dark:border-[#444746] rounded-xl p-4 hover:shadow-sm transition-all group">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex items-start gap-4 flex-1 min-w-0">
                                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 shrink-0">
                                                        <Users size={18} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{course?.title || 'Curso desconhecido'}</p>
                                                            <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0', st.color)}>{st.label}</span>
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                                                            <span className="flex items-center gap-1"><Calendar size={11} />{new Date(session.scheduledDate).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                                            {session.location && <span className="flex items-center gap-1"><MapPin size={11} />{session.location}</span>}
                                                            <span className="flex items-center gap-1"><UserCheck size={11} />{session.enrolledWorkers.length} inscritos</span>
                                                            {session.status === 'completed' && <span className="flex items-center gap-1 text-green-600"><CheckCircle2 size={11} />{present}/{session.attendees.length} presentes</span>}
                                                        </div>
                                                        {session.enrolledWorkers.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 mt-2">
                                                                {session.enrolledWorkers.slice(0, 5).map(wId => (
                                                                    <span key={wId} className="text-[10px] bg-gray-100 dark:bg-[#2a2b2c] text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">{getWorkerName(wId)}</span>
                                                                ))}
                                                                {session.enrolledWorkers.length > 5 && (
                                                                    <span className="text-[10px] bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">+{session.enrolledWorkers.length - 5}</span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                    {session.status === 'scheduled' && (
                                                        <button
                                                            onClick={() => {
                                                                updateTrainingSession(session.id, { status: 'in_progress', startedAt: new Date().toISOString() });
                                                                window.open(`/${locale}/present/${session.courseId}`, '_blank');
                                                            }}
                                                            className="text-xs flex items-center gap-1 px-3 py-1.5 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg font-medium"
                                                            title="Iniciar sessão e abrir apresentação">
                                                            <Play size={12} /> Iniciar
                                                        </button>
                                                    )}
                                                    {session.status === 'in_progress' && (
                                                        <button
                                                            onClick={() => setSignatureSession(session)}
                                                            className="text-xs flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg font-medium"
                                                            title="Registar presenças e assinaturas">
                                                            <UserCheck size={12} /> Concluir
                                                        </button>
                                                    )}
                                                    {session.status === 'completed' && (
                                                        <button
                                                            onClick={() => window.open(`/${locale}/training-report/${session.id}`, '_blank')}
                                                            className="text-xs flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg font-medium border border-indigo-100"
                                                            title="Exportar registo da formação em PDF">
                                                            <FileDown size={12} /> Exportar PDF
                                                        </button>
                                                    )}
                                                    <button onClick={() => setDeleteSessionConfirm(session.id)}
                                                        className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg" title="Eliminar turma">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modals */}
            <ConfirmationModal
                isOpen={!!deleteConfirmation}
                onClose={() => setDeleteConfirmation(null)}
                onConfirm={() => deleteConfirmation && deleteTraining(deleteConfirmation)}
                title="Eliminar Formação?" message="Tem a certeza?" description="Esta ação não pode ser desfeita."
                confirmText="Eliminar" variant="danger" icon="trash" />

            <ConfirmationModal
                isOpen={!!deleteCourseConfirm}
                onClose={() => setDeleteCourseConfirm(null)}
                onConfirm={() => { if (deleteCourseConfirm) { deleteCourse(deleteCourseConfirm); setDeleteCourseConfirm(null); } }}
                title="Eliminar Curso?" message="Tem a certeza?" description="Esta ação não pode ser desfeita."
                confirmText="Eliminar Curso" variant="danger" icon="trash" />

            <ConfirmationModal
                isOpen={!!deleteSessionConfirm}
                onClose={() => setDeleteSessionConfirm(null)}
                onConfirm={() => { if (deleteSessionConfirm) { deleteTrainingSession(deleteSessionConfirm); setDeleteSessionConfirm(null); } }}
                title="Eliminar Turma?" message="Tem a certeza?" description="A turma e todos os dados associados serão eliminados."
                confirmText="Eliminar Turma" variant="danger" icon="trash" />

            {/* Add/Edit Training Modal */}
            <Modal title={editingId ? 'Editar Formação' : 'Adicionar Nova Formação'} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <InputGroup label="Nome do Curso">
                        <input required type="text" placeholder="Ex: Segurança em Trabalhos em Altura"
                            className="w-full p-2.5 border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-primary-light"
                            value={newTraining.name} onChange={e => setNewTraining({ ...newTraining, name: e.target.value })} />
                    </InputGroup>
                    <div className="grid grid-cols-2 gap-4">
                        <InputGroup label="Categoria">
                            <select title="Categoria" className="w-full p-2.5 border border-gray-300 dark:border-[#444746] rounded-lg outline-none bg-white dark:bg-surface"
                                value={newTraining.type} onChange={e => setNewTraining({ ...newTraining, type: e.target.value as any })}>
                                {TRAINING_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </InputGroup>
                        <InputGroup label="Validade (Meses)">
                            <input required type="number" min="0" className="w-full p-2.5 border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500"
                                value={newTraining.validityMonths} onChange={e => setNewTraining({ ...newTraining, validityMonths: Number(e.target.value) })} />
                        </InputGroup>
                    </div>
                    <InputGroup label="Entidade / Formador">
                        <input required type="text" placeholder="Ex: Segurança no Trabalho Lda."
                            className="w-full p-2.5 border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500"
                            value={newTraining.provider} onChange={e => setNewTraining({ ...newTraining, provider: e.target.value })} />
                    </InputGroup>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Ícone Personalizado (Opcional)</label>
                        <div className="grid grid-cols-6 gap-2 bg-gray-50 dark:bg-[#131314] p-3 rounded-lg border border-gray-200 dark:border-[#444746]">
                            {AVAILABLE_ICONS.map(({ name, icon: Icon }) => (
                                <button key={name} type="button" onClick={() => setNewTraining({ ...newTraining, icon: name })}
                                    className={`p-2 rounded hover:bg-white dark:hover:bg-surface hover:shadow-sm flex items-center justify-center ${newTraining.icon === name ? 'bg-primary-light text-primary ring-2 ring-primary ring-offset-1' : 'text-gray-500'}`} title={name}>
                                    <Icon size={20} />
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="pt-2 flex justify-end gap-2">
                        <SecondaryButton type="button" onClick={() => setIsModalOpen(false)}>Cancelar</SecondaryButton>
                        <PrimaryButton type="submit">{editingId ? 'Atualizar' : 'Criar Formação'}</PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Create Training Session Modal */}
            <Modal title="Nova Turma de Formação" isOpen={isSessionModalOpen} onClose={() => setIsSessionModalOpen(false)}>
                <form onSubmit={handleCreateSession} className="space-y-4">
                    <InputGroup label="Curso">
                        {projectCourses.filter(c => c.status === 'published').length === 0 ? (
                            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                <span>Não há cursos publicados. Publica um curso no separador <strong>Cursos</strong> antes de criar uma turma.</span>
                            </div>
                        ) : (
                            <select required title="Selecionar curso" className="w-full p-2.5 border border-gray-300 dark:border-[#444746] rounded-lg outline-none bg-white dark:bg-surface focus:ring-2 focus:ring-primary-light"
                                value={newSession.courseId} onChange={e => setNewSession({ ...newSession, courseId: e.target.value })}>
                                <option value="">Selecionar curso...</option>
                                {projectCourses.filter(c => c.status === 'published').map(c => (
                                    <option key={c.id} value={c.id}>{c.title}</option>
                                ))}
                            </select>
                        )}
                    </InputGroup>

                    <div className="grid grid-cols-2 gap-4">
                        <InputGroup label="Data Agendada">
                            <input required type="date" title="Data da sessão"
                                className="w-full p-2.5 border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:ring-2 focus:ring-primary-light"
                                value={newSession.scheduledDate} onChange={e => setNewSession({ ...newSession, scheduledDate: e.target.value })} />
                        </InputGroup>
                        <InputGroup label="Local">
                            <input type="text" placeholder="Ex: Sala de reuniões A" title="Local da sessão"
                                className="w-full p-2.5 border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:ring-2 focus:ring-primary-light"
                                value={newSession.location} onChange={e => setNewSession({ ...newSession, location: e.target.value })} />
                        </InputGroup>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                Trabalhadores ({newSession.selectedWorkers.length} selecionados)
                            </label>
                            <div className="flex items-center gap-2">
                                <button type="button" onClick={handleSelectAllWorkers} className="text-xs text-primary hover:text-primary-hover font-medium">Selecionar Filtrados</button>
                                <span className="text-gray-300 dark:text-gray-600">|</span>
                                <button type="button" onClick={handleDeselectAllWorkers} className="text-xs text-red-500 hover:text-red-600 font-medium">Limpar Filtrados</button>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 bg-gray-50 dark:bg-surface border border-gray-200 dark:border-[#444746] p-2 rounded-lg">
                            <div className="relative flex-1">
                                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input type="text" placeholder="Nome, nº ou empresa..."
                                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 dark:border-[#444746] rounded-md outline-none focus:ring-1 focus:ring-primary"
                                    value={sessionWorkerSearch} onChange={e => setSessionWorkerSearch(e.target.value)} />
                            </div>
                            <select title="Filtrar por empresa" className="py-1.5 px-2 text-xs border border-gray-200 dark:border-[#444746] rounded-md outline-none bg-white dark:bg-[#1a1a1a] max-w-[140px]"
                                value={sessionWorkerCompany} onChange={e => setSessionWorkerCompany(e.target.value)}>
                                <option value="all">Todas as Empresas</option>
                                {projectCompanies.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            <select title="Ordenar por" className="py-1.5 px-2 text-xs border border-gray-200 dark:border-[#444746] rounded-md outline-none bg-white dark:bg-[#1a1a1a]"
                                value={sessionWorkerSort} onChange={e => setSessionWorkerSort(e.target.value as any)}>
                                <option value="recent">Entrada Recente</option>
                                <option value="name">Nome (A-Z)</option>
                            </select>
                        </div>

                        {projectWorkers.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">Nenhum trabalhador associado a este projeto.</p>
                        ) : filteredWorkers.length === 0 ? (
                            <p className="text-sm text-gray-400 italic text-center py-4 bg-gray-50 dark:bg-[#131314] rounded-lg border border-dashed border-gray-200 dark:border-[#444746]">Nenhum trabalhador corresponde à pesquisa.</p>
                        ) : (
                            <div className="border border-gray-200 dark:border-[#444746] rounded-lg overflow-hidden max-h-48 overflow-y-auto bg-white dark:bg-surface">
                                {filteredWorkers.map(w => (
                                    <label key={w.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-[#2a2b2c] cursor-pointer border-b border-gray-50 dark:border-[#444746] last:border-0">
                                        <input type="checkbox" className="w-4 h-4 rounded accent-primary shrink-0 transition-all"
                                            checked={newSession.selectedWorkers.includes(w.id)}
                                            onChange={() => toggleWorkerSelection(w.id)} />
                                        <div className="w-8 h-8 rounded-full bg-primary-light text-primary flex items-center justify-center text-xs font-bold shrink-0">
                                            {w.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{w.name}</p>
                                            <p className="text-[10px] text-gray-500 truncate">{w.role || 'Operário'} • {getWorkerCompany(w.id)}</p>
                                        </div>
                                        {newSession.selectedWorkers.includes(w.id) && <CheckCircle size={14} className="text-green-500 shrink-0" />}
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    <InputGroup label="Notas (Opcional)">
                        <textarea title="Notas" placeholder="Observações sobre a sessão..." rows={2}
                            className="w-full p-2.5 border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:ring-2 focus:ring-primary-light resize-none text-sm"
                            value={newSession.notes} onChange={e => setNewSession({ ...newSession, notes: e.target.value })} />
                    </InputGroup>

                    <div className="pt-2 flex justify-end gap-2">
                        <SecondaryButton type="button" onClick={() => setIsSessionModalOpen(false)}>Cancelar</SecondaryButton>
                        <PrimaryButton type="submit" disabled={!newSession.courseId || projectCourses.filter(c => c.status === 'published').length === 0}>
                            Criar Turma
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Signature Modal */}
            {signatureSession && (
                <SignatureModal
                    session={signatureSession}
                    course={courses.find(c => c.id === signatureSession.courseId)}
                    workers={workers}
                    onComplete={(sigs) => handleCompleteSession(signatureSession, sigs)}
                    onClose={() => setSignatureSession(null)}
                />
            )}
        </div>
    );
};

export default TrainingPage;
