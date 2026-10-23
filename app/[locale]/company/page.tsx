'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter, Link } from '@/navigation';
import { useStore } from '@/store/useStore';
import AuthGuard from '@/components/AuthGuard';
import { useTheme } from '@/providers/ThemeProvider';
import Header from '@/components/Header';
import { 
    Building2, Users, Wrench, GraduationCap, Folder, 
    ArrowLeft, Plus, Search, Trash2, Edit2, Check, 
    FileText, Shield, Calendar, Phone, Mail, MapPin, 
    Clock, AlertCircle, Save, CheckCircle2, ChevronRight, ChevronLeft,
    LogOut, Share2, UploadCloud, Download, ExternalLink, CheckCircle, Eye
} from 'lucide-react';
import { 
    FlatCompaniesIcon, FlatWorkersIcon, FlatEquipmentIcon, 
    FlatTrainingIcon, FlatDocumentsIcon, FlatFolderIcon 
} from '@/components/FlatIcons';
import { 
    COMPANY_ROLE_OPTIONS, 
    COMPANY_ROLE_GROUPS, 
    getIfcRoleFromCompanyRole,
    getCompanyRoleLabel 
} from '@/lib/company-ifc-map';
import { Modal, InputGroup, PrimaryButton, SecondaryButton } from '@/components/Modal';
import { cn } from '@/lib/utils';
import { nanoid } from 'nanoid';
import type { Worker, Equipment, Company, Project } from '@/types';

type CompanyTab = 'organization' | 'workers' | 'equipment' | 'training' | 'documents';

function getInitials(name?: string) {
    if (!name) return 'U';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function MyCompanyPage() {
    const router = useRouter();
    const { isDark } = useTheme();
    const { 
        currentUser, 
        setCurrentUser,
        account, 
        accounts,
        updateAccount,
        companies, 
        workers, 
        equipment, 
        trainings,
        courses,
        projects,
        companyProfiles,
        updateCompany,
        addCompany,
        addWorker,
        updateWorker,
        addEquipment,
        updateEquipment,
        addNotification,
        importCompanyToProject,
        importWorkerToProject,
        importEquipmentToProject
    } = useStore();

    const handleLogout = () => {
        setCurrentUser(null);
        router.push('/login');
    };

    const [activeTab, setActiveTab] = useState<CompanyTab>('organization');
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Current user's account & master company record
    const userAccount = accounts.find(a => a.id === currentUser?.accountId) || account;
    const currentPlan = userAccount?.plan || 'free';
    const isPaidOrAdmin = currentPlan !== 'free' || currentUser?.role === 'admin' || currentUser?.role === 'superadmin';

    // Find or init the master company entity for this account (without project link or fallback)
    const masterCompany = companies.find(c => c.accountId === userAccount?.id && !c.projectId) || 
                          companies.find(c => c.accountId === userAccount?.id);

    // Form state for Company Details
    const [companyForm, setCompanyForm] = useState({
        name: masterCompany?.name || userAccount?.name || 'A Minha Empresa',
        nif: masterCompany?.nif || userAccount?.vatNumber || '',
        activity: masterCompany?.activity || '',
        caeCode: masterCompany?.caeCode || '',
        companyRole: masterCompany?.companyRole || 'empresa_construcao',
        companyRoleCustom: masterCompany?.companyRoleCustom || '',
        legalForm: (masterCompany?.legalForm as any) || 'lda',
        status: (masterCompany?.status as any) || 'active',
        impic: masterCompany?.impic || '',
        email: masterCompany?.email || userAccount?.contactEmail || currentUser?.email || '',
        phone: masterCompany?.phone || userAccount?.contactPhone || '',
        address: masterCompany?.address || '',
        insuranceWorkAccPolicy: masterCompany?.insuranceWorkAccPolicy || '',
        insuranceWorkAccDate: masterCompany?.insuranceWorkAccDate || '',
        insuranceCivilPolicy: masterCompany?.insuranceCivilPolicy || '',
        insuranceCivilDate: masterCompany?.insuranceCivilDate || '',
        cleanSSDate: masterCompany?.cleanSSDate || '',
        cleanFinDate: masterCompany?.cleanFinDate || '',
    });

    const isFormEditedRef = useRef(false);

    // Keep form synced if master company or account is loaded/updated, unless user is typing
    useEffect(() => {
        if (!isFormEditedRef.current && (masterCompany || userAccount)) {
            setCompanyForm(prev => ({
                ...prev,
                name: masterCompany?.name || userAccount?.name || prev.name,
                nif: masterCompany?.nif || userAccount?.vatNumber || prev.nif,
                activity: masterCompany?.activity ?? prev.activity,
                caeCode: masterCompany?.caeCode ?? prev.caeCode,
                companyRole: masterCompany?.companyRole ?? prev.companyRole,
                companyRoleCustom: masterCompany?.companyRoleCustom ?? prev.companyRoleCustom,
                legalForm: (masterCompany?.legalForm as any) ?? prev.legalForm,
                status: (masterCompany?.status as any) ?? prev.status,
                impic: masterCompany?.impic ?? prev.impic,
                email: masterCompany?.email || userAccount?.contactEmail || currentUser?.email || prev.email,
                phone: masterCompany?.phone || userAccount?.contactPhone || prev.phone,
                address: masterCompany?.address ?? prev.address,
                insuranceWorkAccPolicy: masterCompany?.insuranceWorkAccPolicy ?? prev.insuranceWorkAccPolicy,
                insuranceWorkAccDate: masterCompany?.insuranceWorkAccDate ?? prev.insuranceWorkAccDate,
                insuranceCivilPolicy: masterCompany?.insuranceCivilPolicy ?? prev.insuranceCivilPolicy,
                insuranceCivilDate: masterCompany?.insuranceCivilDate ?? prev.insuranceCivilDate,
                cleanSSDate: masterCompany?.cleanSSDate ?? prev.cleanSSDate,
                cleanFinDate: masterCompany?.cleanFinDate ?? prev.cleanFinDate,
            }));
        }
    }, [masterCompany, userAccount]);

    const [savedNotice, setSavedNotice] = useState(false);

    // Company Details Modal (View vs Edit mode)
    const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
    const [companyModalMode, setCompanyModalMode] = useState<'view' | 'edit'>('view');
    const [companySearchTerm, setCompanySearchTerm] = useState('');

    // Export / Sincronizar Modal State
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportEntityType, setExportEntityType] = useState<'company' | 'worker' | 'equipment'>('company');
    const [exportTargetProjectId, setExportTargetProjectId] = useState<string>('');
    const [exportProjectRole, setExportProjectRole] = useState<string>('subempreiteiro');
    const [selectedWorkerForExport, setSelectedWorkerForExport] = useState<Worker | null>(null);
    const [selectedEquipForExport, setSelectedEquipForExport] = useState<Equipment | null>(null);

    // Only projects that the user has on the Workplace "Os Meus Projetos" page
    const userProjects = useMemo(() => {
        if (!currentUser) return [];
        return (projects || []).filter((p: Project) => {
            if (currentUser.role === 'superadmin') return true;
            if (p.creatorId && p.creatorId === currentUser.id) return true;
            if (userAccount && p.accountId === userAccount.id) return true;
            return currentUser.projectAccess?.some(pa => pa.projectId === p.id);
        });
    }, [projects, currentUser, userAccount]);

    useEffect(() => {
        if (isExportModalOpen && !exportTargetProjectId && userProjects.length > 0) {
            setExportTargetProjectId(userProjects[0].id);
        }
    }, [isExportModalOpen, exportTargetProjectId, userProjects]);

    // Companies displayed in Organization tab listing
    const displayedCompanies = useMemo(() => {
        const base = masterCompany ? [{
            ...masterCompany,
            ...companyForm,
        }] : [{
            id: 'master_company',
            ...companyForm,
        }];
        if (!companySearchTerm.trim()) return base;
        const q = companySearchTerm.toLowerCase();
        return base.filter(c => (c.name || '').toLowerCase().includes(q) || (c.nif || '').toLowerCase().includes(q));
    }, [masterCompany, companyForm, companySearchTerm]);

    const handlePerformExport = (e: React.FormEvent) => {
        e.preventDefault();
        if (!exportTargetProjectId) {
            addNotification('error', 'Selecione uma obra de destino.');
            return;
        }

        let compId = masterCompany?.id;
        if (!compId) {
            const newId = `comp_${nanoid(8)}`;
            addCompany({
                ...companyForm,
                id: newId,
                accountId: userAccount?.id || 'default',
                status: companyForm.status,
                workflowStatus: 'validated',
                ifcActorRole: getIfcRoleFromCompanyRole(companyForm.companyRole || ''),
                createdAt: new Date().toISOString()
            } as any);
            compId = newId;
        }

        if (exportEntityType === 'company') {
            const imported = importCompanyToProject(compId, exportTargetProjectId, exportProjectRole);
            if (imported) {
                setIsExportModalOpen(false);
                addNotification('success', 'Empresa sincronizada com sucesso na obra!');
            }
        } else if (exportEntityType === 'worker') {
            if (!selectedWorkerForExport) return;
            let targetProjCompany = companies.find(c => c.projectId === exportTargetProjectId && (c.corporateCompanyId === compId || c.nif === companyForm.nif));
            if (!targetProjCompany) {
                targetProjCompany = importCompanyToProject(compId, exportTargetProjectId, exportProjectRole) || undefined;
            }
            if (targetProjCompany) {
                const imported = importWorkerToProject(selectedWorkerForExport.id, exportTargetProjectId, targetProjCompany.id);
                if (imported) {
                    setIsExportModalOpen(false);
                    addNotification('success', 'Colaborador sincronizado com sucesso na obra!');
                }
            }
        } else if (exportEntityType === 'equipment') {
            if (!selectedEquipForExport) return;
            let targetProjCompany = companies.find(c => c.projectId === exportTargetProjectId && (c.corporateCompanyId === compId || c.nif === companyForm.nif));
            if (!targetProjCompany) {
                targetProjCompany = importCompanyToProject(compId, exportTargetProjectId, exportProjectRole) || undefined;
            }
            if (targetProjCompany) {
                const imported = importEquipmentToProject(selectedEquipForExport.id, exportTargetProjectId, targetProjCompany.id);
                if (imported) {
                    setIsExportModalOpen(false);
                    addNotification('success', 'Equipamento sincronizado com sucesso na obra!');
                }
            }
        }
    };

    // Filter Workers & Equipment for this company account (account level)
    const companyWorkers = useMemo(() => {
        return workers.filter(w => w.accountId === userAccount?.id || (masterCompany && w.companyId === masterCompany.id));
    }, [workers, userAccount?.id, masterCompany]);

    const companyEquipment = useMemo(() => {
        return equipment.filter(e => e.accountId === userAccount?.id || (masterCompany && e.companyId === masterCompany.id));
    }, [equipment, userAccount?.id, masterCompany]);

    // Search & Filter
    const [searchTerm, setSearchTerm] = useState('');

    // Modal state for Worker
    const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
    const [editingWorkerId, setEditingWorkerId] = useState<string | null>(null);
    const [workerForm, setWorkerForm] = useState({
        name: '',
        role: '',
        nif: '',
        email: '',
        phone: '',
        medicalAptitudeDate: '',
        epiDelivered: false
    });

    // Modal state for Equipment
    const [isEquipModalOpen, setIsEquipModalOpen] = useState(false);
    const [editingEquipId, setEditingEquipId] = useState<string | null>(null);
    const [equipForm, setEquipForm] = useState({
        name: '',
        type: 'vehicle' as const,
        serialNumber: '',
        brand: '',
        model: '',
        inspectionDate: '',
        ceCertified: true
    });

    // Save Master Company details
    const handleSaveCompany = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const trimmedName = companyForm.name.trim();
        const trimmedNif = companyForm.nif.trim();
        const ifcActorRole = getIfcRoleFromCompanyRole(companyForm.companyRole || '');

        if (masterCompany) {
            updateCompany(masterCompany.id, {
                ...companyForm,
                name: trimmedName,
                nif: trimmedNif,
                ifcActorRole,
            });
        } else {
            addCompany({
                ...companyForm,
                id: `comp_${nanoid(8)}`,
                accountId: userAccount?.id || 'default',
                status: companyForm.status,
                workflowStatus: 'validated',
                ifcActorRole,
                createdAt: new Date().toISOString()
            } as any);
        }

        if (userAccount?.id) {
            updateAccount(userAccount.id, {
                name: trimmedName,
                vatNumber: trimmedNif,
                contactEmail: companyForm.email.trim(),
                contactPhone: companyForm.phone.trim(),
            });
        }

        isFormEditedRef.current = false;
        setSavedNotice(true);
        addNotification('success', 'Dados da empresa guardados com sucesso!');
        setTimeout(() => setSavedNotice(false), 3000);
    };

    // Save Worker
    const handleSaveWorker = (e: React.FormEvent) => {
        e.preventDefault();
        if (!workerForm.name.trim()) return;

        if (editingWorkerId) {
            updateWorker(editingWorkerId, {
                name: workerForm.name.trim(),
                role: workerForm.role.trim(),
                nif: workerForm.nif.trim(),
                email: workerForm.email.trim(),
                phone: workerForm.phone.trim(),
                medicalFitness: workerForm.medicalAptitudeDate ? 'apto' : undefined,
                medicalExpiry: workerForm.medicalAptitudeDate || undefined,
            });
            addNotification('success', 'Colaborador atualizado com sucesso!');
        } else {
            addWorker({
                name: workerForm.name.trim(),
                role: workerForm.role.trim() || 'Colaborador',
                companyId: masterCompany?.id || `comp_${userAccount?.id}`,
                status: 'active',
                accessCardCode: `EMP-${nanoid(6).toUpperCase()}`,
                accessCardValid: true,
                nif: workerForm.nif.trim(),
                email: workerForm.email.trim(),
                phone: workerForm.phone.trim(),
                medicalFitness: workerForm.medicalAptitudeDate ? 'apto' : undefined,
                medicalExpiry: workerForm.medicalAptitudeDate || undefined,
                workflowStatus: 'validated',
            });
            addNotification('success', 'Colaborador adicionado à sua empresa!');
        }
        setIsWorkerModalOpen(false);
        setEditingWorkerId(null);
    };

    // Save Equipment
    const handleSaveEquipment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!equipForm.name.trim()) return;

        if (editingEquipId) {
            updateEquipment(editingEquipId, {
                name: equipForm.name.trim(),
                type: equipForm.type,
                serialNumber: equipForm.serialNumber.trim(),
                brand: equipForm.brand.trim(),
                model: equipForm.model.trim(),
                inspectionDueDate: equipForm.inspectionDate || undefined,
                ceMarking: equipForm.ceCertified
            });
            addNotification('success', 'Equipamento atualizado com sucesso!');
        } else {
            addEquipment({
                name: equipForm.name.trim(),
                type: equipForm.type,
                companyId: masterCompany?.id || `comp_${userAccount?.id}`,
                status: 'operational',
                serialNumber: equipForm.serialNumber.trim(),
                brand: equipForm.brand.trim(),
                model: equipForm.model.trim(),
                inspectionDueDate: equipForm.inspectionDate || undefined,
                ceMarking: equipForm.ceCertified,
                workflowStatus: 'validated'
            });
            addNotification('success', 'Equipamento adicionado à sua empresa!');
        }
        setIsEquipModalOpen(false);
        setEditingEquipId(null);
    };

    return (
        <AuthGuard>
            {!isPaidOrAdmin ? (
                <div className="flex h-screen items-center justify-center bg-[var(--bg)] px-4">
                    <div className="max-w-md w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-8 text-center shadow-lg space-y-4">
                        <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center">
                            <Building2 size={28} />
                        </div>
                        <h1 className="text-xl font-bold text-[var(--text)]">Módulo "A Minha Empresa"</h1>
                        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                            O acesso à gestão corporativa da sua própria empresa (Organizações, Pessoas, Equipamentos, Formação e Documentos) requer no mínimo uma subscrição do <strong>Plano Básico</strong>.
                        </p>
                        <div className="pt-2 flex flex-col gap-2">
                            <button
                                onClick={() => router.push('/')}
                                className="w-full py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-sm transition-all cursor-pointer"
                            >
                                Voltar ao Workplace e Conhecer Planos
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex h-screen w-full bg-[var(--bg)] text-[var(--text)] overflow-hidden">
                    {/* FundacaoJM Style Sidebar */}
                    <aside className={cn(
                        "sidebar-container relative h-full flex flex-col transition-all duration-300 ease-in-out shrink-0 select-none",
                        isCollapsed ? "w-[60px] py-5 px-2.5 collapsed" : "w-[270px] p-5"
                    )}>
                        {/* Floating Sidebar Toggle Button (FundacaoJM style) */}
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="sidebar-toggle-btn"
                            title={isCollapsed ? "Expandir barra lateral" : "Recolher barra lateral"}
                        >
                            {isCollapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
                        </button>

                        {/* Top Logo & App Title */}
                        <div className={cn("flex items-center gap-3 mb-4 pb-4 border-b border-[var(--border)]", isCollapsed ? "justify-center" : "px-1")}>
                            <img src="/safetyfirst-logo.png" alt="Safety1irst" className="w-8 h-8 object-contain shrink-0" />
                            {!isCollapsed && (
                                <span className="text-[20px] font-medium tracking-[-0.5px] text-[var(--text)] whitespace-nowrap">
                                    Safety<span style={{ color: '#4285F4', fontWeight: 700 }}>1irst</span>
                                </span>
                            )}
                        </div>

                        {/* Return to Workplace Button */}
                        <div className="mb-3">
                            <Link
                                href="/"
                                className={cn(
                                    "fjm-nav-item",
                                    isCollapsed && "justify-center px-0"
                                )}
                                title="Voltar ao Workplace"
                            >
                                <FlatFolderIcon size={18} className="shrink-0" />
                                {!isCollapsed && <span className="truncate">Voltar ao Workplace</span>}
                            </Link>
                        </div>

                        {/* Nav Items List */}
                        <nav className="flex-1 overflow-y-auto pr-1">
                            {!isCollapsed && (
                                <div className="fjm-nav-label">Menu</div>
                            )}
                            <ul className="space-y-0.5">
                                {[
                                    { id: 'organization', label: 'Organizações', icon: FlatCompaniesIcon },
                                    { id: 'workers', label: 'Pessoas', icon: FlatWorkersIcon, badge: companyWorkers.length },
                                    { id: 'equipment', label: 'Equipamentos', icon: FlatEquipmentIcon, badge: companyEquipment.length },
                                    { id: 'training', label: 'Formação', icon: FlatTrainingIcon },
                                    { id: 'documents', label: 'Documentos', icon: FlatDocumentsIcon },
                                ].map((item) => {
                                    const IconComponent = item.icon;
                                    const isActive = activeTab === item.id;
                                    return (
                                        <li key={item.id}>
                                            <button
                                                type="button"
                                                onClick={() => setActiveTab(item.id as CompanyTab)}
                                                className={cn(
                                                    "fjm-nav-item w-full text-left bg-transparent border-0 outline-none",
                                                    isActive && "active",
                                                    isCollapsed && "justify-center px-0"
                                                )}
                                                title={isCollapsed ? item.label : undefined}
                                            >
                                                <IconComponent size={18} className="shrink-0" />
                                                {!isCollapsed && <span className="truncate">{item.label}</span>}
                                                {!isCollapsed && item.badge !== undefined && item.badge > 0 && (
                                                    <span className={cn(
                                                        "ml-auto px-1.5 py-0.2 rounded-full text-[10px] font-extrabold",
                                                        isActive ? "bg-[#4285F4]/30 text-white" : "bg-[var(--bg-input)] text-[var(--text-muted)]"
                                                    )}>
                                                        {item.badge}
                                                    </span>
                                                )}
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </nav>

                        {/* Sidebar Footer: User Card (FundacaoJM style) */}
                        <div className="fjm-sidebar-footer">
                            {/* User Card with Logout */}
                            <div className={cn("fjm-user-card", isCollapsed && "justify-center p-1.5")}>
                                <div className="fjm-user-avatar" title={currentUser?.name}>
                                    {getInitials(currentUser?.name)}
                                </div>
                                {!isCollapsed && (
                                    <div className="flex-1 min-w-0">
                                        <div className="fjm-user-name" title={currentUser?.name}>
                                            {currentUser?.name || 'Utilizador'}
                                        </div>
                                        <div className="fjm-user-role capitalize" title={companyForm.name || currentUser?.role}>
                                            {companyForm.name || currentUser?.role || 'Utilizador'}
                                        </div>
                                    </div>
                                )}
                                {!isCollapsed && (
                                    <button
                                        onClick={handleLogout}
                                        title="Terminar Sessão"
                                        className="p-1.5 rounded-full hover:bg-[var(--bg-input)] hover:text-red-500 text-[var(--text-muted)] transition-colors shrink-0 cursor-pointer"
                                    >
                                        <LogOut size={16} />
                                    </button>
                                )}
                            </div>

                            {/* Collapsed Mode Logout Button */}
                            {isCollapsed && (
                                <button
                                    onClick={handleLogout}
                                    title="Terminar Sessão"
                                    className="mt-2 p-1.5 rounded-full hover:bg-[var(--bg-input)] hover:text-red-500 text-[var(--text-muted)] transition-colors flex items-center justify-center w-full cursor-pointer"
                                >
                                    <LogOut size={16} />
                                </button>
                            )}
                        </div>
                    </aside>

                    {/* ── Main Content Area ── */}
                    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                        <Header 
                            title={companyForm.name || 'A Minha Empresa'} 
                            subtitle={`Espaço Corporativo • Plano ${currentPlan.toUpperCase()}`} 
                        />
                        <main className="flex-1 bg-[var(--bg-card)] ml-3 mt-3 mr-4 mb-4 rounded-lg shadow-sm border border-[var(--border)] overflow-hidden relative flex flex-col">
                            {/* Header Action Bar */}
                            <header className="p-5 border-b border-[var(--border)] bg-[var(--bg-card)]/80 backdrop-blur-sm sticky top-0 z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                                <div>
                                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-1">
                                        <span className="font-semibold text-primary">A Minha Empresa</span>
                                        <span>•</span>
                                        <span className="capitalize">{activeTab === 'organization' ? 'Organizações' : activeTab}</span>
                                    </div>
                                    <h1 className="text-xl font-extrabold text-[var(--text)]">
                                        {activeTab === 'organization' && 'Dados e Documentos da Organização'}
                                        {activeTab === 'workers' && `Colaboradores da Empresa (${companyWorkers.length})`}
                                        {activeTab === 'equipment' && `Equipamentos e Máquinas (${companyEquipment.length})`}
                                        {activeTab === 'training' && 'Matriz e Cursos de Formação'}
                                        {activeTab === 'documents' && 'Repositório Documental Corporativo'}
                                    </h1>
                                </div>

                                {/* Action Buttons based on Tab */}
                                <div className="flex items-center gap-2 self-start sm:self-auto">
                                    {activeTab === 'organization' && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setExportEntityType('company');
                                                    setExportTargetProjectId(userProjects[0]?.id || '');
                                                    setIsExportModalOpen(true);
                                                }}
                                                className="px-3.5 py-2 rounded-xl bg-[var(--bg-input)] hover:bg-[var(--border)] text-[var(--text)] text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border border-[var(--border)]"
                                                title="Sincronizar dados desta empresa com uma das suas obras"
                                            >
                                                <Share2 size={14} className="text-primary" /> Sincronizar com Obra
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setCompanyModalMode('edit');
                                                    setIsCompanyModalOpen(true);
                                                }}
                                                className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                                            >
                                                <Edit2 size={14} /> Editar Empresa
                                            </button>
                                        </>
                                    )}
                                    {activeTab === 'workers' && (
                                        <button
                                            onClick={() => {
                                                setEditingWorkerId(null);
                                                setWorkerForm({ name: '', role: '', nif: '', email: '', phone: '', medicalAptitudeDate: '', epiDelivered: false });
                                                setIsWorkerModalOpen(true);
                                            }}
                                            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                                        >
                                            <Plus size={14} /> Adicionar Colaborador
                                        </button>
                                    )}
                                    {activeTab === 'equipment' && (
                                        <button
                                            onClick={() => {
                                                setEditingEquipId(null);
                                                setEquipForm({ name: '', type: 'vehicle', serialNumber: '', brand: '', model: '', inspectionDate: '', ceCertified: true });
                                                setIsEquipModalOpen(true);
                                            }}
                                            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                                        >
                                            <Plus size={14} /> Adicionar Equipamento
                                        </button>
                                    )}
                                </div>
                            </header>

                            {/* Scrollable Body Content */}
                            <div className="flex-1 overflow-y-auto p-6">
                                <div className="max-w-6xl w-full mx-auto space-y-6">
                            {/* Notice Banner */}
                            {savedNotice && (
                                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2 animate-in fade-in">
                                    <Check size={16} /> Dados gravados com sucesso!
                                </div>
                            )}

                            {/* ════════ TAB: ORGANIZAÇÃO (Listagem) ════════ */}
                            {activeTab === 'organization' && (
                                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
                                    <div className="p-4 border-b border-[var(--border)] flex items-center justify-between gap-3">
                                        <div className="relative flex-1 max-w-sm">
                                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                                            <input
                                                type="text"
                                                placeholder="Pesquisar organização por nome ou NIF..."
                                                className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-xl pl-9 pr-4 py-2 text-xs text-[var(--text)] outline-none focus:ring-2 focus:ring-primary/20"
                                                value={companySearchTerm}
                                                onChange={e => setCompanySearchTerm(e.target.value)}
                                            />
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-[var(--text-muted)] font-medium">
                                                {displayedCompanies.length} organização(ões) registada(s)
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setCompanyModalMode('edit');
                                                    setIsCompanyModalOpen(true);
                                                }}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 transition-all cursor-pointer"
                                            >
                                                <Edit2 size={13} /> Editar Empresa
                                            </button>
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs text-left min-w-[700px]">
                                            <thead className="bg-[var(--bg-input)]/50 text-[var(--text-muted)] font-bold uppercase tracking-wider text-[10px] border-b border-[var(--border)]">
                                                <tr>
                                                    <th className="px-5 py-3.5">Organização</th>
                                                    <th className="px-5 py-3.5">Tipo / Função</th>
                                                    <th className="px-5 py-3.5">Contacto</th>
                                                    <th className="px-5 py-3.5">Seguros & Conformidade</th>
                                                    <th className="px-5 py-3.5 text-right">Ação</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[var(--border)]">
                                                {displayedCompanies.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={5} className="px-6 py-12 text-center text-[var(--text-muted)]">
                                                            Nenhuma organização registada nesta conta.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    displayedCompanies.map(comp => (
                                                        <tr 
                                                            key={comp.id || 'master'} 
                                                            onClick={() => {
                                                                setCompanyModalMode('view');
                                                                setIsCompanyModalOpen(true);
                                                            }}
                                                            className="hover:bg-[var(--bg-input)]/30 transition-colors cursor-pointer group"
                                                        >
                                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                                                                        <Building2 size={16} />
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-bold text-xs text-[var(--text)] group-hover:text-primary transition-colors flex items-center gap-2">
                                                                            {comp.name}
                                                                            <span className={cn(
                                                                                "text-[10px] px-1.5 py-0.5 rounded-md font-semibold",
                                                                                comp.status === 'inactive' ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                                                            )}>
                                                                                {comp.status === 'inactive' ? 'Inativa' : 'Ativa'}
                                                                            </span>
                                                                        </div>
                                                                        <div className="text-[10px] font-mono text-[var(--text-muted)]">
                                                                            NIF: {comp.nif || 'Não indicado'} {comp.caeCode ? `• CAE ${comp.caeCode}` : ''}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-5 py-3.5 whitespace-nowrap text-xs text-[var(--text)]">
                                                                <span className="font-medium">{getCompanyRoleLabel(comp.companyRole || 'empresa_construcao')}</span>
                                                                {comp.activity && (
                                                                    <div className="text-[10px] text-[var(--text-muted)] truncate max-w-[200px]">
                                                                        {comp.activity}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-5 py-3.5 whitespace-nowrap text-[11px] text-[var(--text-muted)]">
                                                                <div>{comp.email || userAccount?.contactEmail || '—'}</div>
                                                                <div className="text-[10px]">{comp.phone || userAccount?.contactPhone || ''}</div>
                                                            </td>
                                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    {comp.insuranceWorkAccDate ? (
                                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800" title={`Seguro AT válido até ${new Date(comp.insuranceWorkAccDate).toLocaleDateString()}`}>
                                                                            <Check size={10} /> AT Válido
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                                                            AT Pendente
                                                                        </span>
                                                                    )}
                                                                    {comp.insuranceCivilDate ? (
                                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800" title={`Seguro RC válido até ${new Date(comp.insuranceCivilDate).toLocaleDateString()}`}>
                                                                            <Check size={10} /> RC Válido
                                                                        </span>
                                                                    ) : null}
                                                                </div>
                                                            </td>
                                                            <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                                                <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                                                                    <button
                                                                        onClick={() => {
                                                                            setExportEntityType('company');
                                                                            setExportTargetProjectId(userProjects[0]?.id || '');
                                                                            setIsExportModalOpen(true);
                                                                        }}
                                                                        className="p-1.5 text-[var(--text-muted)] hover:text-primary rounded-lg transition-colors cursor-pointer"
                                                                        title="Sincronizar com Obra"
                                                                    >
                                                                        <Share2 size={14} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            setCompanyModalMode('view');
                                                                            setIsCompanyModalOpen(true);
                                                                        }}
                                                                        className="p-1.5 text-[var(--text-muted)] hover:text-primary rounded-lg transition-colors cursor-pointer"
                                                                        title="Ver Informações"
                                                                    >
                                                                        <Eye size={14} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            setCompanyModalMode('edit');
                                                                            setIsCompanyModalOpen(true);
                                                                        }}
                                                                        className="p-1.5 text-[var(--text-muted)] hover:text-primary rounded-lg transition-colors cursor-pointer"
                                                                        title="Editar Dados"
                                                                    >
                                                                        <Edit2 size={14} />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* ════════ TAB: PESSOAS ════════ */}
                            {activeTab === 'workers' && (
                                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
                                    <div className="p-4 border-b border-[var(--border)] flex items-center justify-between gap-3">
                                        <div className="relative flex-1 max-w-sm">
                                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                                            <input
                                                type="text"
                                                placeholder="Pesquisar colaborador por nome ou email..."
                                                className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-xl pl-9 pr-4 py-2 text-xs text-[var(--text)] outline-none focus:ring-2 focus:ring-primary/20"
                                                value={searchTerm}
                                                onChange={e => setSearchTerm(e.target.value)}
                                            />
                                        </div>
                                        <span className="text-xs text-[var(--text-muted)] font-medium">
                                            {companyWorkers.length} colaborador(es) registado(s)
                                        </span>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs text-left min-w-[650px]">
                                            <thead className="bg-[var(--bg-input)]/50 text-[var(--text-muted)] font-bold uppercase tracking-wider text-[10px] border-b border-[var(--border)]">
                                                <tr>
                                                    <th className="px-5 py-3.5">Colaborador</th>
                                                    <th className="px-5 py-3.5">Função</th>
                                                    <th className="px-5 py-3.5">Contacto</th>
                                                    <th className="px-5 py-3.5">Aptidão Médica</th>
                                                    <th className="px-5 py-3.5 text-right">Ação</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[var(--border)]">
                                                {companyWorkers.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={5} className="px-6 py-12 text-center text-[var(--text-muted)]">
                                                            Nenhum colaborador registado nesta empresa. Adicione os seus colaboradores.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    companyWorkers
                                                        .filter(w => w.name.toLowerCase().includes(searchTerm.toLowerCase()) || (w.email && w.email.toLowerCase().includes(searchTerm.toLowerCase())))
                                                        .map(w => (
                                                            <tr key={w.id} className="hover:bg-[var(--bg-input)]/30 transition-colors">
                                                                <td className="px-5 py-3.5 whitespace-nowrap">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                                                                            {w.name.charAt(0).toUpperCase()}
                                                                        </div>
                                                                        <div>
                                                                            <span className="font-bold text-xs text-[var(--text)]">{w.name}</span>
                                                                            {w.nif && <div className="text-[10px] font-mono text-[var(--text-muted)]">NIF: {w.nif}</div>}
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-5 py-3.5 whitespace-nowrap text-xs text-[var(--text)]">
                                                                    {w.role || '—'}
                                                                </td>
                                                                <td className="px-5 py-3.5 whitespace-nowrap text-[11px] text-[var(--text-muted)]">
                                                                    {w.email || w.phone || '—'}
                                                                </td>
                                                                <td className="px-5 py-3.5 whitespace-nowrap">
                                                                    {w.medicalExpiry ? (
                                                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                                                            <Check size={12} /> {new Date(w.medicalExpiry).toLocaleDateString()}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-[11px] text-[var(--text-muted)] italic">Pendente</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                                                    <div className="flex items-center justify-end gap-1">
                                                                        <button
                                                                            onClick={() => {
                                                                                setSelectedWorkerForExport(w);
                                                                                setExportEntityType('worker');
                                                                                setIsExportModalOpen(true);
                                                                            }}
                                                                            className="p-1.5 text-[var(--text-muted)] hover:text-primary rounded-lg transition-colors cursor-pointer"
                                                                            title="Compatibilizar / Importar para Obra"
                                                                        >
                                                                            <Share2 size={14} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => {
                                                                                setEditingWorkerId(w.id);
                                                                                setWorkerForm({
                                                                                    name: w.name,
                                                                                    role: w.role || '',
                                                                                    nif: w.nif || '',
                                                                                    email: w.email || '',
                                                                                    phone: w.phone || '',
                                                                                    medicalAptitudeDate: w.medicalExpiry || '',
                                                                                    epiDelivered: true
                                                                                });
                                                                                setIsWorkerModalOpen(true);
                                                                            }}
                                                                            className="p-1.5 text-[var(--text-muted)] hover:text-primary rounded-lg transition-colors cursor-pointer"
                                                                            title="Editar"
                                                                        >
                                                                            <Edit2 size={14} />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* ════════ TAB: EQUIPAMENTOS ════════ */}
                            {activeTab === 'equipment' && (
                                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
                                    <div className="p-4 border-b border-[var(--border)] flex items-center justify-between gap-3">
                                        <div className="relative flex-1 max-w-sm">
                                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                                            <input
                                                type="text"
                                                placeholder="Pesquisar equipamento por nome ou número de série..."
                                                className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-xl pl-9 pr-4 py-2 text-xs text-[var(--text)] outline-none focus:ring-2 focus:ring-primary/20"
                                                value={searchTerm}
                                                onChange={e => setSearchTerm(e.target.value)}
                                            />
                                        </div>
                                        <span className="text-xs text-[var(--text-muted)] font-medium">
                                            {companyEquipment.length} equipamento(s)
                                        </span>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs text-left min-w-[650px]">
                                            <thead className="bg-[var(--bg-input)]/50 text-[var(--text-muted)] font-bold uppercase tracking-wider text-[10px] border-b border-[var(--border)]">
                                                <tr>
                                                    <th className="px-5 py-3.5">Equipamento</th>
                                                    <th className="px-5 py-3.5">N.º Série</th>
                                                    <th className="px-5 py-3.5">Marca / Modelo</th>
                                                    <th className="px-5 py-3.5">Conformidade CE</th>
                                                    <th className="px-5 py-3.5 text-right">Ação</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[var(--border)]">
                                                {companyEquipment.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={5} className="px-6 py-12 text-center text-[var(--text-muted)]">
                                                            Nenhum equipamento registado. Adicione ferramentas e máquinas da sua empresa.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    companyEquipment
                                                        .filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()) || (e.serialNumber && e.serialNumber.toLowerCase().includes(searchTerm.toLowerCase())))
                                                        .map(eq => (
                                                            <tr key={eq.id} className="hover:bg-[var(--bg-input)]/30 transition-colors">
                                                                <td className="px-5 py-3.5 whitespace-nowrap font-bold text-xs text-[var(--text)]">
                                                                    {eq.name}
                                                                </td>
                                                                <td className="px-5 py-3.5 whitespace-nowrap text-xs font-mono text-[var(--text-muted)]">
                                                                    {eq.serialNumber || '—'}
                                                                </td>
                                                                <td className="px-5 py-3.5 whitespace-nowrap text-xs text-[var(--text-muted)]">
                                                                    {eq.brand || eq.model ? `${eq.brand || ''} ${eq.model || ''}` : '—'}
                                                                </td>
                                                                <td className="px-5 py-3.5 whitespace-nowrap">
                                                                    {eq.ceMarking ? (
                                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                            Conforme CE
                                                                        </span>
                                                                    ) : (
                                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600">
                                                                            Sem Certificado
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                                                    <div className="flex items-center justify-end gap-1">
                                                                        <button
                                                                            onClick={() => {
                                                                                setSelectedEquipForExport(eq);
                                                                                setExportEntityType('equipment');
                                                                                setIsExportModalOpen(true);
                                                                            }}
                                                                            className="p-1.5 text-[var(--text-muted)] hover:text-primary rounded-lg transition-colors cursor-pointer"
                                                                            title="Compatibilizar / Importar para Obra"
                                                                        >
                                                                            <Share2 size={14} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => {
                                                                                setEditingEquipId(eq.id);
                                                                                setEquipForm({
                                                                                    name: eq.name,
                                                                                    type: (eq.type as any) || 'vehicle',
                                                                                    serialNumber: eq.serialNumber || '',
                                                                                    brand: eq.brand || '',
                                                                                    model: eq.model || '',
                                                                                    inspectionDate: eq.inspectionDueDate || '',
                                                                                    ceCertified: eq.ceMarking ?? true
                                                                                });
                                                                                setIsEquipModalOpen(true);
                                                                            }}
                                                                            className="p-1.5 text-[var(--text-muted)] hover:text-primary rounded-lg transition-colors cursor-pointer"
                                                                            title="Editar"
                                                                        >
                                                                            <Edit2 size={14} />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* ════════ TAB: FORMAÇÃO ════════ */}
                            {activeTab === 'training' && (
                                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-4">
                                    <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                                        <h3 className="font-bold text-sm text-[var(--text)] flex items-center gap-2">
                                            <GraduationCap size={16} className="text-primary" /> Matriz de Competências & Formação da Empresa
                                        </h3>
                                        <span className="text-xs text-[var(--text-muted)]">
                                            {courses.length} curso(s) disponíveis
                                        </span>
                                    </div>
                                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                                        Aqui gere as ações de acolhimento, qualificações profissionais e formações de segurança atribuídas aos colaboradores da sua empresa.
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                                        {courses.map(course => (
                                            <div key={course.id} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-input)]/40 hover:border-primary/40 transition-all space-y-2">
                                                <h4 className="font-bold text-xs text-[var(--text)]">{course.title}</h4>
                                                <p className="text-[11px] text-[var(--text-muted)] line-clamp-2">{course.description || 'Sem descrição.'}</p>
                                                <div className="flex items-center justify-between pt-1 text-[10px] text-[var(--text-muted)]">
                                                    <span>Validade: {course.validityMonths ? `${course.validityMonths} meses` : 'Vitalício'}</span>
                                                    <span className="font-bold text-primary">Pronto</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ════════ TAB: DOCUMENTOS ════════ */}
                            {activeTab === 'documents' && (
                                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-4">
                                    <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                                        <h3 className="font-bold text-sm text-[var(--text)] flex items-center gap-2">
                                            <Folder size={16} className="text-primary" /> Repositório e Ficheiros da Empresa
                                        </h3>
                                    </div>
                                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                                        Consulte e mantenha atualizados os documentos gerais da sua empresa (Certidão Comercial, Apólices de Seguros, Fichas de Aptidão e Declarações).
                                    </p>
                                    <div className="p-8 border border-dashed border-[var(--border)] rounded-2xl text-center space-y-3">
                                        <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center">
                                            <Folder size={24} />
                                        </div>
                                        <div className="text-xs font-bold text-[var(--text)]">Documentos da Conta Prontos para Sincronização</div>
                                        <p className="text-[11px] text-[var(--text-muted)] max-w-sm mx-auto">
                                            Os documentos registados neste espaço da empresa ficam disponíveis para envio e compatibilização direta em qualquer obra em que a sua empresa ingresse.
                                        </p>
                                    </div>
                                </div>
                            )}
                                </div>
                            </div>
                        </main>
                    </div>

                    {/* ════════ MODALS ════════ */}
                    {/* Modal Colaborador */}
                    <Modal
                        title={editingWorkerId ? "Editar Colaborador" : "Adicionar Colaborador à Minha Empresa"}
                        isOpen={isWorkerModalOpen}
                        onClose={() => setIsWorkerModalOpen(false)}
                    >
                        <form onSubmit={handleSaveWorker} className="space-y-4">
                            <InputGroup label="Nome Completo *">
                                <input
                                    type="text"
                                    required
                                    value={workerForm.name}
                                    onChange={e => setWorkerForm({ ...workerForm, name: e.target.value })}
                                    className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                    placeholder="ex: João Silva"
                                />
                            </InputGroup>
                            <div className="grid grid-cols-2 gap-3">
                                <InputGroup label="Função / Cargo">
                                    <input
                                        type="text"
                                        value={workerForm.role}
                                        onChange={e => setWorkerForm({ ...workerForm, role: e.target.value })}
                                        className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                        placeholder="ex: Eletricista"
                                    />
                                </InputGroup>
                                <InputGroup label="NIF do Colaborador">
                                    <input
                                        type="text"
                                        value={workerForm.nif}
                                        onChange={e => setWorkerForm({ ...workerForm, nif: e.target.value })}
                                        className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary font-mono"
                                        placeholder="ex: 234567890"
                                    />
                                </InputGroup>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <InputGroup label="Email">
                                    <input
                                        type="email"
                                        value={workerForm.email}
                                        onChange={e => setWorkerForm({ ...workerForm, email: e.target.value })}
                                        className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </InputGroup>
                                <InputGroup label="Telefone">
                                    <input
                                        type="text"
                                        value={workerForm.phone}
                                        onChange={e => setWorkerForm({ ...workerForm, phone: e.target.value })}
                                        className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </InputGroup>
                            </div>
                            <InputGroup label="Data da Ficha de Aptidão Médica">
                                <input
                                    type="date"
                                    value={workerForm.medicalAptitudeDate}
                                    onChange={e => setWorkerForm({ ...workerForm, medicalAptitudeDate: e.target.value })}
                                    className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                />
                            </InputGroup>
                            <PrimaryButton type="submit" className="w-full py-2.5 text-xs font-bold">
                                {editingWorkerId ? "Guardar Alterações" : "Adicionar Colaborador"}
                            </PrimaryButton>
                        </form>
                    </Modal>

                    {/* Modal Equipamento */}
                    <Modal
                        title={editingEquipId ? "Editar Equipamento" : "Adicionar Equipamento à Minha Empresa"}
                        isOpen={isEquipModalOpen}
                        onClose={() => setIsEquipModalOpen(false)}
                    >
                        <form onSubmit={handleSaveEquipment} className="space-y-4">
                            <InputGroup label="Designação do Equipamento *">
                                <input
                                    type="text"
                                    required
                                    value={equipForm.name}
                                    onChange={e => setEquipForm({ ...equipForm, name: e.target.value })}
                                    className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                    placeholder="ex: Retroescavadora JCB"
                                />
                            </InputGroup>
                            <div className="grid grid-cols-2 gap-3">
                                <InputGroup label="Número de Série">
                                    <input
                                        type="text"
                                        value={equipForm.serialNumber}
                                        onChange={e => setEquipForm({ ...equipForm, serialNumber: e.target.value })}
                                        className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary font-mono"
                                        placeholder="ex: SN-998822"
                                    />
                                </InputGroup>
                                <InputGroup label="Tipo">
                                    <select
                                        value={equipForm.type}
                                        onChange={e => setEquipForm({ ...equipForm, type: e.target.value as any })}
                                        className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                    >
                                        <option value="vehicle">Veículo / Máquina</option>
                                        <option value="heavy_machinery">Máquinas Pesadas</option>
                                        <option value="lifting">Equipamento de Elevação</option>
                                        <option value="power_tool">Ferramenta Elétrica</option>
                                        <option value="other">Outro</option>
                                    </select>
                                </InputGroup>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <InputGroup label="Marca">
                                    <input
                                        type="text"
                                        value={equipForm.brand}
                                        onChange={e => setEquipForm({ ...equipForm, brand: e.target.value })}
                                        className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </InputGroup>
                                <InputGroup label="Modelo">
                                    <input
                                        type="text"
                                        value={equipForm.model}
                                        onChange={e => setEquipForm({ ...equipForm, model: e.target.value })}
                                        className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </InputGroup>
                            </div>
                            <InputGroup label="Data da Próxima Inspeção Periódica">
                                <input
                                    type="date"
                                    value={equipForm.inspectionDate}
                                    onChange={e => setEquipForm({ ...equipForm, inspectionDate: e.target.value })}
                                    className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                />
                            </InputGroup>
                            <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text)] cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={equipForm.ceCertified}
                                    onChange={e => setEquipForm({ ...equipForm, ceCertified: e.target.checked })}
                                    className="rounded text-primary"
                                />
                                Possui Declaração de Conformidade CE
                            </label>
                            <PrimaryButton type="submit" className="w-full py-2.5 text-xs font-bold">
                                {editingEquipId ? "Guardar Alterações" : "Adicionar Equipamento"}
                            </PrimaryButton>
                        </form>
                    </Modal>

                    {/* Modal Informação / Edição da Empresa */}
                    <Modal
                        title={
                            <div className="flex items-center gap-2">
                                <Building2 size={18} className="text-primary" />
                                <span>{companyModalMode === 'view' ? "Ficha da Organização" : "Editar Dados da Organização"}</span>
                            </div>
                        }
                        isOpen={isCompanyModalOpen}
                        onClose={() => setIsCompanyModalOpen(false)}
                        maxWidth="max-w-4xl"
                        headerAction={
                            companyModalMode === 'view' ? (
                                <button
                                    type="button"
                                    onClick={() => setCompanyModalMode('edit')}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-hover shadow-sm transition-all cursor-pointer"
                                >
                                    <Edit2 size={13} /> Mudar para Modo de Edição
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setCompanyModalMode('view')}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[var(--text)] bg-[var(--bg-input)] hover:bg-[var(--border)] transition-all cursor-pointer border border-[var(--border)]"
                                >
                                    <Eye size={13} /> Voltar à Visualização
                                </button>
                            )
                        }
                    >
                        {companyModalMode === 'view' ? (
                            <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
                                {/* Top overview card */}
                                <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-3.5">
                                        <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center font-extrabold text-base shadow-sm shrink-0">
                                            {getInitials(companyForm.name)}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-base font-bold text-[var(--text)]">{companyForm.name || 'A Minha Empresa'}</h3>
                                                <span className={cn(
                                                    "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                                                    companyForm.status === 'inactive' ? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                                )}>
                                                    {companyForm.status === 'inactive' ? 'Inativa' : 'Ativa'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-[var(--text-muted)] font-mono">
                                                NIF: {companyForm.nif || 'Não definido'} • Natureza: {companyForm.legalForm?.toUpperCase() || 'LDA'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsCompanyModalOpen(false);
                                                setExportEntityType('company');
                                                setExportTargetProjectId(userProjects[0]?.id || '');
                                                setIsExportModalOpen(true);
                                            }}
                                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 transition-all cursor-pointer"
                                            title="Sincronizar com uma das suas obras"
                                        >
                                            <Share2 size={13} /> Sincronizar com Obra
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCompanyModalMode('edit')}
                                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-hover shadow-sm transition-all cursor-pointer"
                                        >
                                            <Edit2 size={13} /> Editar Dados
                                        </button>
                                    </div>
                                </div>

                                {/* Section 1: Identificação */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5 pb-1 border-b border-[var(--border)]">
                                        <Building2 size={14} className="text-primary" /> Identificação e Dados Fiscais
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                        <div className="p-3 rounded-xl bg-[var(--bg-input)]/40 border border-[var(--border)]">
                                            <div className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Nome Oficial</div>
                                            <div className="text-xs font-bold text-[var(--text)] mt-0.5">{companyForm.name || '—'}</div>
                                        </div>
                                        <div className="p-3 rounded-xl bg-[var(--bg-input)]/40 border border-[var(--border)]">
                                            <div className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">NIF / NIPC</div>
                                            <div className="text-xs font-mono font-bold text-[var(--text)] mt-0.5">{companyForm.nif || '—'}</div>
                                        </div>
                                        <div className="p-3 rounded-xl bg-[var(--bg-input)]/40 border border-[var(--border)]">
                                            <div className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Tipo de Empresa</div>
                                            <div className="text-xs font-bold text-[var(--text)] mt-0.5">
                                                {getCompanyRoleLabel(companyForm.companyRole)}
                                                {companyForm.companyRole === 'outro' && companyForm.companyRoleCustom ? ` (${companyForm.companyRoleCustom})` : ''}
                                            </div>
                                        </div>
                                        <div className="p-3 rounded-xl bg-[var(--bg-input)]/40 border border-[var(--border)]">
                                            <div className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Natureza Jurídica</div>
                                            <div className="text-xs font-medium text-[var(--text)] mt-0.5">
                                                {companyForm.legalForm === 'lda' ? 'Lda. (Sociedade por Quotas)' :
                                                 companyForm.legalForm === 'sa' ? 'S.A. (Sociedade Anónima)' :
                                                 companyForm.legalForm === 'unipessoal' ? 'Unipessoal Lda.' :
                                                 companyForm.legalForm === 'eni' ? 'ENI (Empresário em Nome Individual)' :
                                                 companyForm.legalForm === 'ace' ? 'ACE' : 'Outra'}
                                            </div>
                                        </div>
                                        <div className="p-3 rounded-xl bg-[var(--bg-input)]/40 border border-[var(--border)]">
                                            <div className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Código CAE</div>
                                            <div className="text-xs font-mono font-medium text-[var(--text)] mt-0.5">{companyForm.caeCode || '—'}</div>
                                        </div>
                                        <div className="p-3 rounded-xl bg-[var(--bg-input)]/40 border border-[var(--border)]">
                                            <div className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Alvará / Título IMPIC</div>
                                            <div className="text-xs font-mono font-medium text-[var(--text)] mt-0.5">{companyForm.impic || '—'}</div>
                                        </div>
                                        <div className="sm:col-span-2 md:col-span-3 p-3 rounded-xl bg-[var(--bg-input)]/40 border border-[var(--border)]">
                                            <div className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Atividade Principal</div>
                                            <div className="text-xs font-medium text-[var(--text)] mt-0.5">{companyForm.activity || '—'}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: Contactos & Sede */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5 pb-1 border-b border-[var(--border)]">
                                        <MapPin size={14} className="text-primary" /> Contactos e Localização
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="p-3 rounded-xl bg-[var(--bg-input)]/40 border border-[var(--border)]">
                                            <div className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Email Geral</div>
                                            <div className="text-xs font-medium text-[var(--text)] mt-0.5">{companyForm.email || '—'}</div>
                                        </div>
                                        <div className="p-3 rounded-xl bg-[var(--bg-input)]/40 border border-[var(--border)]">
                                            <div className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Telefone Geral</div>
                                            <div className="text-xs font-medium text-[var(--text)] mt-0.5">{companyForm.phone || '—'}</div>
                                        </div>
                                        <div className="sm:col-span-2 p-3 rounded-xl bg-[var(--bg-input)]/40 border border-[var(--border)]">
                                            <div className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Sede / Morada Oficial</div>
                                            <div className="text-xs font-medium text-[var(--text)] mt-0.5">{companyForm.address || '—'}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 3: Seguros e Certidões Legais DL 273/2003 */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5 pb-1 border-b border-[var(--border)]">
                                        <Shield size={14} className="text-primary" /> Seguros Obrigatórios & Certidões Não Dívida (DL 273/2003)
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="p-3.5 rounded-xl bg-[var(--bg-input)]/40 border border-[var(--border)] space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] font-bold text-[var(--text)]">Seguro Acidentes de Trabalho</span>
                                                {companyForm.insuranceWorkAccDate ? (
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200">
                                                        Válido
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200">
                                                        Pendente
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[11px] text-[var(--text-muted)]">
                                                Apólice: <span className="font-mono text-[var(--text)]">{companyForm.insuranceWorkAccPolicy || 'Não indicada'}</span>
                                            </div>
                                            <div className="text-[11px] text-[var(--text-muted)]">
                                                Validade: <span className="font-medium text-[var(--text)]">{companyForm.insuranceWorkAccDate ? new Date(companyForm.insuranceWorkAccDate).toLocaleDateString() : '—'}</span>
                                            </div>
                                        </div>

                                        <div className="p-3.5 rounded-xl bg-[var(--bg-input)]/40 border border-[var(--border)] space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] font-bold text-[var(--text)]">Seguro Responsabilidade Civil</span>
                                                {companyForm.insuranceCivilDate ? (
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200">
                                                        Válido
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200">
                                                        Pendente
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[11px] text-[var(--text-muted)]">
                                                Apólice: <span className="font-mono text-[var(--text)]">{companyForm.insuranceCivilPolicy || 'Não indicada'}</span>
                                            </div>
                                            <div className="text-[11px] text-[var(--text-muted)]">
                                                Validade: <span className="font-medium text-[var(--text)]">{companyForm.insuranceCivilDate ? new Date(companyForm.insuranceCivilDate).toLocaleDateString() : '—'}</span>
                                            </div>
                                        </div>

                                        <div className="p-3.5 rounded-xl bg-[var(--bg-input)]/40 border border-[var(--border)] space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] font-bold text-[var(--text)]">Certidão Seg. Social</span>
                                                {companyForm.cleanSSDate ? (
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200">
                                                        Válida
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200">
                                                        Pendente
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[11px] text-[var(--text-muted)]">
                                                Validade: <span className="font-medium text-[var(--text)]">{companyForm.cleanSSDate ? new Date(companyForm.cleanSSDate).toLocaleDateString() : 'Não registada'}</span>
                                            </div>
                                        </div>

                                        <div className="p-3.5 rounded-xl bg-[var(--bg-input)]/40 border border-[var(--border)] space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] font-bold text-[var(--text)]">Certidão Finanças</span>
                                                {companyForm.cleanFinDate ? (
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200">
                                                        Válida
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200">
                                                        Pendente
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[11px] text-[var(--text-muted)]">
                                                Validade: <span className="font-medium text-[var(--text)]">{companyForm.cleanFinDate ? new Date(companyForm.cleanFinDate).toLocaleDateString() : 'Não registada'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--border)]">
                                    <SecondaryButton type="button" onClick={() => setIsCompanyModalOpen(false)}>
                                        Fechar
                                    </SecondaryButton>
                                    <button
                                        type="button"
                                        onClick={() => setCompanyModalMode('edit')}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-hover shadow-sm transition-all cursor-pointer"
                                    >
                                        <Edit2 size={14} /> Mudar para Modo de Edição
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={(e) => { handleSaveCompany(e); setCompanyModalMode('view'); }} className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
                                <div className="bg-[var(--bg-input)]/30 border border-[var(--border)] rounded-2xl p-5 space-y-4">
                                    <h4 className="font-bold text-xs text-[var(--text)] flex items-center gap-2 pb-2 border-b border-[var(--border)]">
                                        <Building2 size={14} className="text-primary" /> Identificação e Dados Fiscais
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                        <InputGroup label="Nome Oficial da Empresa *">
                                            <input
                                                type="text"
                                                required
                                                value={companyForm.name}
                                                onChange={e => {
                                                    isFormEditedRef.current = true;
                                                    setCompanyForm({ ...companyForm, name: e.target.value });
                                                }}
                                                className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                            />
                                        </InputGroup>
                                        <InputGroup label="NIF / NIPC *">
                                            <input
                                                type="text"
                                                required
                                                value={companyForm.nif}
                                                onChange={e => {
                                                    isFormEditedRef.current = true;
                                                    setCompanyForm({ ...companyForm, nif: e.target.value });
                                                }}
                                                className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary font-mono"
                                                placeholder="500000000"
                                            />
                                        </InputGroup>
                                        <InputGroup label="Tipo de Empresa *">
                                            <select
                                                value={companyForm.companyRole}
                                                onChange={e => {
                                                    isFormEditedRef.current = true;
                                                    setCompanyForm({ ...companyForm, companyRole: e.target.value });
                                                }}
                                                className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                            >
                                                {COMPANY_ROLE_GROUPS.map(group => (
                                                    <optgroup key={group} label={group}>
                                                        {COMPANY_ROLE_OPTIONS.filter(o => o.group === group).map(o => (
                                                            <option key={o.value} value={o.value}>
                                                                {o.label}
                                                            </option>
                                                        ))}
                                                    </optgroup>
                                                ))}
                                            </select>
                                        </InputGroup>
                                        {companyForm.companyRole === 'outro' && (
                                            <InputGroup label="Especificar Tipo de Empresa">
                                                <input
                                                    type="text"
                                                    value={companyForm.companyRoleCustom}
                                                    onChange={e => {
                                                        isFormEditedRef.current = true;
                                                        setCompanyForm({ ...companyForm, companyRoleCustom: e.target.value });
                                                    }}
                                                    placeholder="Ex: Empresa de Sinalização Rodoviária"
                                                    className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                                />
                                            </InputGroup>
                                        )}
                                        <InputGroup label="Natureza Jurídica">
                                            <select
                                                value={companyForm.legalForm}
                                                onChange={e => {
                                                    isFormEditedRef.current = true;
                                                    setCompanyForm({ ...companyForm, legalForm: e.target.value as any });
                                                }}
                                                className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                            >
                                                <option value="lda">Lda. (Sociedade por Quotas)</option>
                                                <option value="unipessoal">Unipessoal Lda.</option>
                                                <option value="sa">S.A. (Sociedade Anónima)</option>
                                                <option value="eni">ENI (Empresário em Nome Individual)</option>
                                                <option value="ace">ACE (Agrupamento Complementar de Empresas)</option>
                                                <option value="other">Outra</option>
                                            </select>
                                        </InputGroup>
                                        <InputGroup label="Estado Operacional">
                                            <select
                                                value={companyForm.status}
                                                onChange={e => {
                                                    isFormEditedRef.current = true;
                                                    setCompanyForm({ ...companyForm, status: e.target.value as any });
                                                }}
                                                className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                            >
                                                <option value="active">Ativa / Em Laboração</option>
                                                <option value="inactive">Inativa / Suspensa</option>
                                            </select>
                                        </InputGroup>
                                        <InputGroup label="Código CAE Principal">
                                            <input
                                                type="text"
                                                value={companyForm.caeCode}
                                                onChange={e => {
                                                    isFormEditedRef.current = true;
                                                    setCompanyForm({ ...companyForm, caeCode: e.target.value });
                                                }}
                                                className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary font-mono"
                                                placeholder="ex: 41200"
                                            />
                                        </InputGroup>
                                        <InputGroup label="Atividade Principal">
                                            <input
                                                type="text"
                                                value={companyForm.activity}
                                                onChange={e => {
                                                    isFormEditedRef.current = true;
                                                    setCompanyForm({ ...companyForm, activity: e.target.value });
                                                }}
                                                className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                                placeholder="ex: Construção Civil e Obras Públicas"
                                            />
                                        </InputGroup>
                                        <InputGroup label="Alvará / Título IMPIC">
                                            <input
                                                type="text"
                                                value={companyForm.impic}
                                                onChange={e => {
                                                    isFormEditedRef.current = true;
                                                    setCompanyForm({ ...companyForm, impic: e.target.value });
                                                }}
                                                className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                                placeholder="ex: IMPIC 12345"
                                            />
                                        </InputGroup>
                                    </div>
                                </div>

                                <div className="bg-[var(--bg-input)]/30 border border-[var(--border)] rounded-2xl p-5 space-y-4">
                                    <h4 className="font-bold text-xs text-[var(--text)] flex items-center gap-2 pb-2 border-b border-[var(--border)]">
                                        <MapPin size={14} className="text-primary" /> Contactos e Sede
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <InputGroup label="Email Geral">
                                            <input
                                                type="email"
                                                value={companyForm.email}
                                                onChange={e => {
                                                    isFormEditedRef.current = true;
                                                    setCompanyForm({ ...companyForm, email: e.target.value });
                                                }}
                                                className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                            />
                                        </InputGroup>
                                        <InputGroup label="Telefone Geral">
                                            <input
                                                type="text"
                                                value={companyForm.phone}
                                                onChange={e => {
                                                    isFormEditedRef.current = true;
                                                    setCompanyForm({ ...companyForm, phone: e.target.value });
                                                }}
                                                className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                            />
                                        </InputGroup>
                                        <div className="sm:col-span-2">
                                            <InputGroup label="Sede / Morada">
                                                <input
                                                    type="text"
                                                    value={companyForm.address}
                                                    onChange={e => {
                                                        isFormEditedRef.current = true;
                                                        setCompanyForm({ ...companyForm, address: e.target.value });
                                                    }}
                                                    className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                                />
                                            </InputGroup>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-[var(--bg-input)]/30 border border-[var(--border)] rounded-2xl p-5 space-y-4">
                                    <h4 className="font-bold text-xs text-[var(--text)] flex items-center gap-2 pb-2 border-b border-[var(--border)]">
                                        <Shield size={14} className="text-primary" /> Seguros Obrigatórios & Certidões Legais
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <InputGroup label="Apólice Seguro Acidentes Trabalho">
                                            <input
                                                type="text"
                                                value={companyForm.insuranceWorkAccPolicy}
                                                onChange={e => {
                                                    isFormEditedRef.current = true;
                                                    setCompanyForm({ ...companyForm, insuranceWorkAccPolicy: e.target.value });
                                                }}
                                                className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                            />
                                        </InputGroup>
                                        <InputGroup label="Validade Seguro Acidentes Trabalho">
                                            <input
                                                type="date"
                                                value={companyForm.insuranceWorkAccDate}
                                                onChange={e => {
                                                    isFormEditedRef.current = true;
                                                    setCompanyForm({ ...companyForm, insuranceWorkAccDate: e.target.value });
                                                }}
                                                className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                            />
                                        </InputGroup>
                                        <InputGroup label="Apólice Seguro Resp. Civil">
                                            <input
                                                type="text"
                                                value={companyForm.insuranceCivilPolicy}
                                                onChange={e => {
                                                    isFormEditedRef.current = true;
                                                    setCompanyForm({ ...companyForm, insuranceCivilPolicy: e.target.value });
                                                }}
                                                className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                            />
                                        </InputGroup>
                                        <InputGroup label="Validade Seguro Resp. Civil">
                                            <input
                                                type="date"
                                                value={companyForm.insuranceCivilDate}
                                                onChange={e => {
                                                    isFormEditedRef.current = true;
                                                    setCompanyForm({ ...companyForm, insuranceCivilDate: e.target.value });
                                                }}
                                                className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                            />
                                        </InputGroup>
                                        <InputGroup label="Validade Certidão Não Dívida Seg. Social">
                                            <input
                                                type="date"
                                                value={companyForm.cleanSSDate}
                                                onChange={e => {
                                                    isFormEditedRef.current = true;
                                                    setCompanyForm({ ...companyForm, cleanSSDate: e.target.value });
                                                }}
                                                className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                            />
                                        </InputGroup>
                                        <InputGroup label="Validade Certidão Não Dívida Finanças">
                                            <input
                                                type="date"
                                                value={companyForm.cleanFinDate}
                                                onChange={e => {
                                                    isFormEditedRef.current = true;
                                                    setCompanyForm({ ...companyForm, cleanFinDate: e.target.value });
                                                }}
                                                className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                            />
                                        </InputGroup>
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-2 pt-2">
                                    <SecondaryButton type="button" onClick={() => setCompanyModalMode('view')}>
                                        Cancelar / Voltar à Visualização
                                    </SecondaryButton>
                                    <PrimaryButton type="submit" className="py-2 px-5 text-xs font-bold">
                                        Guardar Alterações
                                    </PrimaryButton>
                                </div>
                            </form>
                        )}
                    </Modal>

                    {/* Modal Sincronizar com Obra */}
                    <Modal
                        title={
                            exportEntityType === 'company' ? "Sincronizar Empresa com Obra" :
                            exportEntityType === 'worker' ? "Sincronizar Colaborador com Obra" :
                            "Sincronizar Equipamento com Obra"
                        }
                        isOpen={isExportModalOpen}
                        onClose={() => setIsExportModalOpen(false)}
                    >
                        <form onSubmit={handlePerformExport} className="space-y-4">
                            {userProjects.length === 0 ? (
                                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-700 dark:text-amber-400 text-xs">
                                    Não tem obras associadas na página "Os Meus Projetos". Crie ou junte-se a uma obra no Workplace para poder efetuar a sincronização.
                                </div>
                            ) : (
                                <>
                                    <InputGroup label="Selecione a Obra de Destino *">
                                        <select
                                            value={exportTargetProjectId}
                                            onChange={e => setExportTargetProjectId(e.target.value)}
                                            required
                                            className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                        >
                                            {userProjects.map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name} {p.code ? `(${p.code})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </InputGroup>

                                    {exportEntityType === 'company' && (
                                        <>
                                            <InputGroup label="Papel / Função da Empresa na Obra *">
                                                <select
                                                    value={exportProjectRole}
                                                    onChange={e => setExportProjectRole(e.target.value)}
                                                    className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                                >
                                                    <option value="subempreiteiro">Subempreiteiro</option>
                                                    <option value="empreiteiro_geral">Empreiteiro Geral</option>
                                                    <option value="prestador_servicos">Prestador de Serviços</option>
                                                    <option value="instalador">Instalador Especializado</option>
                                                    <option value="fornecedor">Fornecedor com Montagem</option>
                                                    <option value="fiscalizacao">Fiscalização / Coordenação</option>
                                                    <option value="dono_obra">Dono de Obra</option>
                                                </select>
                                            </InputGroup>

                                            <div className="p-3.5 bg-[var(--bg-input)]/50 border border-[var(--border)] rounded-xl space-y-2">
                                                <div className="text-[11px] font-bold text-[var(--text)] flex items-center gap-1.5">
                                                    <Shield size={13} className="text-primary" />
                                                    Compatibilização Legal DL 273/2003
                                                </div>
                                                <div className="space-y-1 text-[11px] text-[var(--text-muted)]">
                                                    <div className="flex items-center justify-between">
                                                        <span>Seguro Acidentes de Trabalho:</span>
                                                        <span className={cn("font-medium", companyForm.insuranceWorkAccDate ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500")}>
                                                            {companyForm.insuranceWorkAccDate ? `Válido até ${new Date(companyForm.insuranceWorkAccDate).toLocaleDateString()}` : 'Pendente'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span>Seguro Responsabilidade Civil:</span>
                                                        <span className={cn("font-medium", companyForm.insuranceCivilDate ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500")}>
                                                            {companyForm.insuranceCivilDate ? `Válido até ${new Date(companyForm.insuranceCivilDate).toLocaleDateString()}` : 'Pendente'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span>Certidão Seg. Social:</span>
                                                        <span className={cn("font-medium", companyForm.cleanSSDate ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500")}>
                                                            {companyForm.cleanSSDate ? `Válida até ${new Date(companyForm.cleanSSDate).toLocaleDateString()}` : 'Pendente'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span>Certidão Finanças:</span>
                                                        <span className={cn("font-medium", companyForm.cleanFinDate ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500")}>
                                                            {companyForm.cleanFinDate ? `Válida até ${new Date(companyForm.cleanFinDate).toLocaleDateString()}` : 'Pendente'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {exportEntityType === 'worker' && selectedWorkerForExport && (
                                        <div className="p-3.5 bg-[var(--bg-input)]/50 border border-[var(--border)] rounded-xl space-y-2">
                                            <div className="text-[11px] font-bold text-[var(--text)]">
                                                {selectedWorkerForExport.name} ({selectedWorkerForExport.role || 'Colaborador'})
                                            </div>
                                            <div className="space-y-1 text-[11px] text-[var(--text-muted)]">
                                                <div className="flex items-center justify-between">
                                                    <span>Ficha de Aptidão Médica:</span>
                                                    <span className={cn("font-medium", selectedWorkerForExport.medicalExpiry ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500")}>
                                                        {selectedWorkerForExport.medicalExpiry ? `Válida até ${new Date(selectedWorkerForExport.medicalExpiry).toLocaleDateString()}` : 'Pendente'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span>Cartão de Acesso / NIF:</span>
                                                    <span className="font-mono text-[var(--text)]">{selectedWorkerForExport.nif || selectedWorkerForExport.accessCardCode || '—'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {exportEntityType === 'equipment' && selectedEquipForExport && (
                                        <div className="p-3.5 bg-[var(--bg-input)]/50 border border-[var(--border)] rounded-xl space-y-2">
                                            <div className="text-[11px] font-bold text-[var(--text)]">
                                                {selectedEquipForExport.name} {selectedEquipForExport.serialNumber ? `(S/N: ${selectedEquipForExport.serialNumber})` : ''}
                                            </div>
                                            <div className="space-y-1 text-[11px] text-[var(--text-muted)]">
                                                <div className="flex items-center justify-between">
                                                    <span>Declaração CE:</span>
                                                    <span className={cn("font-medium", selectedEquipForExport.ceMarking ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500")}>
                                                        {selectedEquipForExport.ceMarking ? 'Conforme CE' : 'Sem Certificado'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span>Inspeção Periódica:</span>
                                                    <span className={cn("font-medium", selectedEquipForExport.inspectionDueDate ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500")}>
                                                        {selectedEquipForExport.inspectionDueDate ? `Válida até ${new Date(selectedEquipForExport.inspectionDueDate).toLocaleDateString()}` : 'Pendente'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="text-[11px] text-[var(--text-muted)] flex items-start gap-2 bg-primary/5 p-3 rounded-xl border border-primary/10">
                                        <CheckCircle2 size={15} className="text-primary shrink-0 mt-0.5" />
                                        <span>
                                            Os dados e perfis documentais serão sincronizados com o CDE da obra. Sempre que um documento for aprovado ou atualizado na obra, a sincronização é sugerida na conta corporativa.
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-end gap-2 pt-2">
                                        <SecondaryButton type="button" onClick={() => setIsExportModalOpen(false)}>
                                            Cancelar
                                        </SecondaryButton>
                                        <PrimaryButton type="submit" className="py-2 px-4 text-xs font-bold">
                                            Sincronizar com Obra
                                        </PrimaryButton>
                                    </div>
                                </>
                            )}
                        </form>
                    </Modal>
                </div>
            )}
        </AuthGuard>
    );
}
