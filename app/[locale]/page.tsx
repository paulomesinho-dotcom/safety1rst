'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from '@/navigation';
import { useStore, type AppState } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { 
    Folder, MapPin, Users, Layout, LogOut, ArrowRight, Sun, Moon, 
    Plus, Check, Shield, Building2, CheckCircle2, Clock, AlertCircle, 
    Copy, Search, Sparkles, UserPlus, Crown, CheckCheck, 
    XCircle, ChevronRight, Briefcase, FileCheck, ArrowUpRight, KeyRound
} from 'lucide-react';
import { Modal, InputGroup, PrimaryButton, SecondaryButton } from '@/components/Modal';
import AuthGuard from '@/components/AuthGuard';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useTheme } from '@/providers/ThemeProvider';
import type { PlanType, ProjectRole, User, Account, Project } from '@/types';

type WorkplaceTab = 'projects' | 'requests' | 'company' | 'subscriptions' | 'client_management';

export default function Home() {
    const router = useRouter();
    const { isDark, toggleTheme } = useTheme();

    const { 
        projects, 
        currentUser, 
        users, 
        accounts, 
        account,
        companies, 
        projectRequests, 
        subscriptionRequests,
        addProject, 
        setCurrentUser, 
        addProjectRequest, 
        resolveProjectRequest,
        changeAccountPlan,
        associateCompanyUser,
        addSubscriptionRequest,
        approveSubscriptionRequest,
        rejectSubscriptionRequest,
        addNotification
    } = useStore(useShallow((state: AppState) => ({
        projects: state.projects,
        currentUser: state.currentUser,
        users: state.users,
        accounts: state.accounts,
        account: state.account,
        companies: state.companies,
        projectRequests: state.projectRequests,
        subscriptionRequests: state.subscriptionRequests,
        addProject: state.addProject,
        setCurrentUser: state.setCurrentUser,
        addProjectRequest: state.addProjectRequest,
        resolveProjectRequest: state.resolveProjectRequest,
        changeAccountPlan: state.changeAccountPlan,
        associateCompanyUser: state.associateCompanyUser,
        addSubscriptionRequest: state.addSubscriptionRequest,
        approveSubscriptionRequest: state.approveSubscriptionRequest,
        rejectSubscriptionRequest: state.rejectSubscriptionRequest,
        addNotification: state.addNotification
    })));

    // Active Navigation Tab
    const [activeTab, setActiveTab] = useState<WorkplaceTab>('projects');
    const [searchQuery, setSearchQuery] = useState('');
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    // Modals
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isJoinOpen, setIsJoinOpen] = useState(false);
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const [selectedUpgradePlan, setSelectedUpgradePlan] = useState<PlanType>('basic');
    const [upgradeNotes, setUpgradeNotes] = useState('');

    // Join Project State
    const [joinCode, setJoinCode] = useState('');
    const [selectedCompanyId, setSelectedCompanyId] = useState('');
    const [joinError, setJoinError] = useState('');
    const [joinSuccess, setJoinSuccess] = useState('');

    // Create Project State
    const [newProj, setNewProj] = useState({ name: '', address: '', description: '' });

    // Invite Member State
    const [inviteData, setInviteData] = useState({ name: '', email: '' });
    const [inviteError, setInviteError] = useState('');
    const [inviteSuccess, setInviteSuccess] = useState('');

    useEffect(() => {
        if (!currentUser) {
            router.replace('/login');
        }
    }, [currentUser, router]);

    // Active Account & Subscription Details
    const userAccount = useMemo(() => {
        if (!currentUser) return null;
        return accounts.find(a => a.id === currentUser.accountId) || accounts.find(a => a.id === account?.id) || account || null;
    }, [accounts, currentUser, account]);

    const isSuperAdmin = currentUser?.role === 'superadmin';
    const currentPlan: PlanType = isSuperAdmin ? 'enterprise' : (userAccount?.plan || 'free');

    // Limits
    const projectCreationLimit = useMemo(() => {
        if (isSuperAdmin) return Infinity;
        if (!userAccount || userAccount.plan === 'free') return 0;
        if (userAccount.plan === 'basic') return 1;
        if (userAccount.plan === 'premium') return 3;
        return Infinity; // enterprise
    }, [isSuperAdmin, userAccount]);

    const maxJoinedProjects = useMemo(() => {
        if (isSuperAdmin) return Infinity;
        // User without subscription: 5 projects. User with subscription or associated to subscription: 5 + 10 = 15 projects. Enterprise: unlimited
        if (!userAccount || userAccount.plan === 'free') return 5;
        if (userAccount.plan === 'enterprise') return Infinity;
        return 15;
    }, [isSuperAdmin, userAccount]);

    const maxCompanyMembers = useMemo(() => {
        if (isSuperAdmin) return Infinity;
        if (!userAccount || userAccount.plan === 'free') return 1;
        if (userAccount.plan === 'basic') return 5;
        if (userAccount.plan === 'premium') return 10;
        return 50; // enterprise
    }, [isSuperAdmin, userAccount]);

    // Joined projects
    const joinedProjects = useMemo(() => {
        if (!currentUser) return [];
        return projects.filter((p: Project) => {
            if (isSuperAdmin) return true;
            return currentUser.projectAccess?.some(pa => pa.projectId === p.id);
        });
    }, [projects, currentUser, isSuperAdmin]);

    const createdProjectsCount = useMemo(() => {
        if (!userAccount) return 0;
        return projects.filter(p => p.accountId === userAccount.id).length;
    }, [projects, userAccount]);

    // Filtered Projects for Table/Grid
    const visibleProjects = useMemo(() => {
        return joinedProjects.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  (p.address || '').toLowerCase().includes(searchQuery.toLowerCase());
            return matchesSearch;
        });
    }, [joinedProjects, searchQuery]);

    // Company Members
    const companyMembers = useMemo(() => {
        if (!userAccount) return currentUser ? [currentUser] : [];
        return users.filter(u => u.accountId === userAccount.id);
    }, [users, userAccount, currentUser]);

    // Access Requests
    const managedProjectIds = useMemo(() => {
        if (!currentUser) return [];
        if (isSuperAdmin) return projects.map(p => p.id);
        return projects.filter(p => {
            const isOwner = p.accountId === userAccount?.id;
            const isManager = currentUser.projectAccess?.some(pa => pa.projectId === p.id && pa.role === 'manager');
            return isOwner || isManager;
        }).map(p => p.id);
    }, [projects, currentUser, userAccount, isSuperAdmin]);

    const receivedRequests = useMemo(() => {
        return projectRequests.filter(r => r.status === 'pending' && managedProjectIds.includes(r.projectId));
    }, [projectRequests, managedProjectIds]);

    const sentRequests = useMemo(() => {
        if (!currentUser) return [];
        return projectRequests.filter(r => r.userId === currentUser.id);
    }, [projectRequests, currentUser]);

    // Matched Project for Join Modal
    const matchedJoinProject = useMemo(() => {
        if (!joinCode.trim()) return null;
        const codeClean = joinCode.trim().toUpperCase();
        return projects.find(p => {
            const code = `PRJ-${p.id.substring(0, 4).toUpperCase()}-${new Date(p.createdAt || Date.now()).getFullYear()}`;
            return code === codeClean || p.id.toUpperCase() === codeClean;
        }) || null;
    }, [joinCode, projects]);

    const companiesInMatchedProject = useMemo(() => {
        if (!matchedJoinProject) return [];
        return companies.filter(c => c.projectId === matchedJoinProject.id);
    }, [matchedJoinProject, companies]);

    // Copy project invitation code
    const handleCopyCode = (project: Project) => {
        const code = `PRJ-${project.id.substring(0, 4).toUpperCase()}-${new Date(project.createdAt || Date.now()).getFullYear()}`;
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2500);
    };

    // Handle Create Project
    const handleCreateProject = (e: React.FormEvent) => {
        e.preventDefault();
        if (projectCreationLimit === 0) {
            alert('A criação de projetos requer uma subscrição ativa. Por favor faça upgrade do seu plano.');
            setIsCreateOpen(false);
            setActiveTab('subscriptions');
            return;
        }

        if (createdProjectsCount >= projectCreationLimit) {
            alert(`Atingiu o limite de ${projectCreationLimit} obra(s) para o plano ${currentPlan.toUpperCase()}. Faça upgrade para criar mais obras.`);
            return;
        }

        addProject({
            name: newProj.name.trim(),
            address: newProj.address.trim(),
            description: newProj.description.trim(),
            status: 'active'
        });

        setIsCreateOpen(false);
        setNewProj({ name: '', address: '', description: '' });
        addNotification('success', 'Obra criada com sucesso!');
    };

    // Handle Join Request
    const handleJoinSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setJoinError('');
        setJoinSuccess('');

        if (!matchedJoinProject || !currentUser) {
            setJoinError('Por favor insira um código de obra válido.');
            return;
        }

        // Check if already has access
        const alreadyHasAccess = currentUser.projectAccess?.some(pa => pa.projectId === matchedJoinProject.id);
        if (alreadyHasAccess) {
            setJoinError('Já tem acesso a esta obra.');
            return;
        }

        // Check project limit
        if (joinedProjects.length >= maxJoinedProjects) {
            setJoinError(`Atingiu o seu limite de ${maxJoinedProjects} obras em simultâneo. Faça upgrade do seu plano para aceder a mais projetos.`);
            return;
        }

        // Check company selection requirement
        if (!selectedCompanyId) {
            setJoinError('Deve selecionar a sua empresa da lista de empresas desta obra.');
            return;
        }

        const selectedCompany = companiesInMatchedProject.find(c => c.id === selectedCompanyId);

        addProjectRequest(
            currentUser.id, 
            matchedJoinProject.id, 
            selectedCompanyId, 
            selectedCompany?.name || 'Subempreiteiro'
        );

        setJoinSuccess(`Pedido de acesso enviado com sucesso para a obra "${matchedJoinProject.name}"!`);
        setTimeout(() => {
            setIsJoinOpen(false);
            setJoinCode('');
            setSelectedCompanyId('');
            setJoinSuccess('');
        }, 1800);
    };

    // Handle Invite / Associate Company Member
    const handleInviteSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setInviteError('');
        setInviteSuccess('');

        if (!userAccount) {
            setInviteError('Conta de empresa não encontrada.');
            return;
        }

        if (!inviteData.email.trim()) {
            setInviteError('Por favor introduza o email do colaborador.');
            return;
        }

        const res = associateCompanyUser(userAccount.id, inviteData.email.trim(), inviteData.name.trim() || undefined);
        if (res.success) {
            setInviteSuccess(res.message);
            setTimeout(() => {
                setIsInviteOpen(false);
                setInviteData({ name: '', email: '' });
                setInviteSuccess('');
            }, 1600);
        } else {
            setInviteError(res.message);
        }
    };

    // Handle Subscription Request / Upgrade
    const handleRequestUpgrade = (plan: PlanType) => {
        setSelectedUpgradePlan(plan);
        setIsUpgradeModalOpen(true);
    };

    const submitUpgradeRequest = () => {
        if (!currentUser) return;
        addSubscriptionRequest({
            companyName: userAccount?.name || currentUser.name + ' - Empresa',
            nif: userAccount?.vatNumber || '999999990',
            contactName: currentUser.name,
            email: currentUser.email,
            phone: currentUser.phone,
            plan: selectedUpgradePlan,
            status: 'pending'
        });

        setIsUpgradeModalOpen(false);
        setUpgradeNotes('');
        addNotification('success', `Pedido de subscrição para o plano ${selectedUpgradePlan.toUpperCase()} enviado à administração!`);
    };

    const handleLogout = () => {
        setCurrentUser(null);
        router.push('/login');
    };

    if (!currentUser) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <AuthGuard>
            <div className="min-h-screen bg-background text-content-text flex flex-col font-sans">
                {/* ── Top Bar ── */}
                <header className="bg-[var(--bg-card)] border-b border-[var(--border)] px-6 sm:px-8 py-3.5 flex items-center justify-between shadow-sm sticky top-0 z-[100] transition-colors">
                    <div className="flex items-center gap-4">
                        <img src="/safetyfirst-logo.png" className="w-8 h-8 object-contain shrink-0" alt="Safety1irst Logo" />
                        <div>
                            <span className="font-bold text-lg tracking-tight text-[var(--text)]">
                                Safety<span className="text-primary font-black">1irst</span>
                            </span>
                            <span className="hidden sm:inline-block ml-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                                Workplace
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 sm:gap-6">
                        {/* Current Plan Badge */}
                        <div 
                            onClick={() => setActiveTab('subscriptions')}
                            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 hover:bg-primary/10 cursor-pointer transition-all"
                            title="Ver estado da subscrição"
                        >
                            <Crown size={14} className="text-primary shrink-0" />
                            <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 capitalize">
                                Plano: <strong className="text-primary uppercase">{currentPlan}</strong>
                            </span>
                            {currentPlan === 'free' && (
                                <span className="text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1.5 py-0.2 rounded-full">
                                    Upgrade
                                </span>
                            )}
                        </div>

                        <LanguageSwitcher />

                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-lg hover:bg-[var(--bg-input)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                            title={isDark ? "Mudar para modo claro" : "Mudar para modo escuro"}
                        >
                            {isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-slate-400" />}
                        </button>

                        <div className="text-right hidden lg:block">
                            <span className="block text-xs font-bold text-[var(--text)]">{currentUser.name}</span>
                            <span className="block text-[11px] text-[var(--text-muted)] truncate max-w-[160px]">
                                {userAccount?.name || currentUser.email}
                            </span>
                        </div>

                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                                {currentUser.name.charAt(0).toUpperCase()}
                            </div>
                            <button 
                                onClick={handleLogout} 
                                className="p-2 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors" 
                                title="Terminar Sessão"
                            >
                                <LogOut size={18} />
                            </button>
                        </div>
                    </div>
                </header>

                {/* ── Main Workplace Hub Container ── */}
                <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6">
                    {/* ── Header & Direct Actions (Clean & Straight) ── */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text)]">
                                Workplace
                            </h1>
                            <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                {userAccount?.name ? `${userAccount.name} • ` : ''}Plano <strong className="uppercase text-primary">{currentPlan}</strong> &bull; {joinedProjects.length}/{maxJoinedProjects === Infinity ? '∞' : maxJoinedProjects} obras em acesso
                            </p>
                        </div>

                        {/* Direct Straight Actions */}
                        <div className="flex items-center gap-2.5">
                            <button
                                onClick={() => {
                                    setJoinCode('');
                                    setSelectedCompanyId('');
                                    setJoinError('');
                                    setIsJoinOpen(true);
                                }}
                                className="px-3.5 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-input)] text-[var(--text)] font-semibold text-xs shadow-sm transition-all flex items-center gap-2"
                            >
                                <KeyRound size={14} className="text-primary" /> Solicitar Projeto
                            </button>

                            <button
                                onClick={() => {
                                    if (projectCreationLimit === 0) {
                                        setActiveTab('subscriptions');
                                        addNotification('warning', 'A criação de novos projetos requer uma subscrição Básico, Pro ou Enterprise.');
                                    } else {
                                        setIsCreateOpen(true);
                                    }
                                }}
                                className="px-3.5 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold text-xs shadow-sm transition-all flex items-center gap-2"
                            >
                                <Plus size={15} /> Criar Novo Projeto
                            </button>
                        </div>
                    </div>

                    {/* ── Navigation Tabs ── */}
                    <div className="flex items-center gap-2 border-b border-[var(--border)] overflow-x-auto pb-1 scrollbar-none">
                        <button
                            onClick={() => setActiveTab('projects')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                                activeTab === 'projects'
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-input)]'
                            }`}
                        >
                            <Briefcase size={16} /> Os Meus Projetos ({joinedProjects.length})
                        </button>

                        <button
                            onClick={() => setActiveTab('requests')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap relative ${
                                activeTab === 'requests'
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-input)]'
                            }`}
                        >
                            <FileCheck size={16} /> Solicitações de Acesso
                            {receivedRequests.length > 0 && (
                                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-400 text-amber-950">
                                    {receivedRequests.length}
                                </span>
                            )}
                        </button>

                        <button
                            onClick={() => setActiveTab('company')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                                activeTab === 'company'
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-input)]'
                            }`}
                        >
                            <Users size={16} /> Membros da Empresa ({companyMembers.length})
                        </button>

                        <button
                            onClick={() => setActiveTab('subscriptions')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                                activeTab === 'subscriptions'
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-input)]'
                            }`}
                        >
                            <Crown size={16} /> As Minhas Subscrições
                        </button>

                        {isSuperAdmin && (
                            <button
                                onClick={() => setActiveTab('client_management')}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                                    activeTab === 'client_management'
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50'
                                }`}
                            >
                                <Shield size={16} /> Gestão de Clientes (SuperAdmin)
                            </button>
                        )}
                    </div>

                    {/* ════════ TAB 1: MEUS PROJETOS ════════ */}
                    {activeTab === 'projects' && (
                        <div className="space-y-4">
                            {/* Filter Bar */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border)] shadow-sm">
                                <div className="relative w-full sm:w-80">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--text-muted)]" />
                                    <input
                                        type="text"
                                        placeholder="Pesquisar por obra ou localização..."
                                        className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-background text-[var(--text)] outline-none focus:ring-2 focus:ring-primary"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                    />
                                </div>

                                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                    <span className="text-xs text-[var(--text-muted)]">
                                        Total: <strong>{visibleProjects.length}</strong> obra(s)
                                    </span>
                                </div>
                            </div>

                            {visibleProjects.length === 0 ? (
                                <div className="text-center py-16 bg-[var(--bg-card)] rounded-lg border border-dashed border-[var(--border)] p-6">
                                    <Folder className="mx-auto text-[var(--text-muted)] mb-3 opacity-40" size={48} />
                                    <h3 className="text-base font-bold text-[var(--text)]">Nenhum projeto encontrado</h3>
                                    <p className="text-xs text-[var(--text-muted)] mt-1 max-w-md mx-auto">
                                        Ainda não está associado a nenhuma obra. Peça o código de convite ao gestor da obra ou solicite acesso diretamente.
                                    </p>
                                    <div className="mt-4 flex items-center justify-center gap-3">
                                        <button
                                            onClick={() => setIsJoinOpen(true)}
                                            className="px-4 py-2 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-hover shadow-sm"
                                        >
                                            Solicitar Acesso a Obra
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border)] shadow-sm overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse text-xs">
                                            <thead>
                                                <tr className="border-b border-[var(--border)] bg-[var(--bg-input)]/50 text-[var(--text-muted)] font-bold uppercase tracking-wider text-[10px]">
                                                    <th className="py-3 px-4">Obra / Projeto</th>
                                                    <th className="py-3 px-4">Código de Convite</th>
                                                    <th className="py-3 px-4">Localização</th>
                                                    <th className="py-3 px-4">Meu Perfil</th>
                                                    <th className="py-3 px-4">Estado</th>
                                                    <th className="py-3 px-4 text-right">Ação</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[var(--border)]">
                                                {visibleProjects.map((project: Project) => {
                                                    const code = `PRJ-${project.id.substring(0, 4).toUpperCase()}-${new Date(project.createdAt || Date.now()).getFullYear()}`;
                                                    const isCopied = copiedCode === code;
                                                    const userAccess = currentUser.projectAccess?.find(pa => pa.projectId === project.id);
                                                    const roleLabel = isSuperAdmin ? 'SuperAdmin' : (userAccess?.role === 'manager' ? 'Gestor de Obra' : 'Subempreiteiro / Utilizador');

                                                    return (
                                                        <tr key={project.id} className="hover:bg-primary/5 transition-colors group">
                                                            <td className="py-3.5 px-4 font-semibold text-[var(--text)]">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-primary shrink-0 border border-blue-100 dark:border-blue-900/50">
                                                                        <Folder size={18} />
                                                                    </div>
                                                                    <div>
                                                                        <span className="block font-bold text-xs">{project.name}</span>
                                                                        {project.description && (
                                                                            <span className="text-[11px] text-[var(--text-muted)] line-clamp-1">{project.description}</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="py-3.5 px-4">
                                                                <button
                                                                    onClick={() => handleCopyCode(project)}
                                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--bg-input)] hover:bg-[var(--border)] text-[11px] font-mono font-medium text-[var(--text)] border border-[var(--border)] transition-colors"
                                                                    title="Clique para copiar código de convite da obra"
                                                                >
                                                                    <span>{code}</span>
                                                                    {isCopied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} className="text-[var(--text-muted)]" />}
                                                                </button>
                                                            </td>
                                                            <td className="py-3.5 px-4 text-[var(--text-muted)]">
                                                                <div className="flex items-center gap-1.5 text-xs">
                                                                    <MapPin size={13} className="shrink-0 text-gray-400" />
                                                                    <span>{project.address || 'Não especificada'}</span>
                                                                </div>
                                                            </td>
                                                            <td className="py-3.5 px-4">
                                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                                                    {roleLabel}
                                                                </span>
                                                            </td>
                                                            <td className="py-3.5 px-4">
                                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                                    project.status === 'active' 
                                                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                                                                        : 'bg-gray-100 text-gray-600'
                                                                }`}>
                                                                    {project.status === 'active' ? 'Ativa' : project.status}
                                                                </span>
                                                            </td>
                                                            <td className="py-3.5 px-4 text-right">
                                                                <button
                                                                    onClick={() => router.push(`/project/${project.id}/dashboard`)}
                                                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-sm transition-all hover:scale-[1.02]"
                                                                >
                                                                    <span>Entrar na Obra</span>
                                                                    <ArrowRight size={13} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ════════ TAB 2: SOLICITAÇÕES DE ACESSO ════════ */}
                    {activeTab === 'requests' && (
                        <div className="space-y-6">
                            {/* Pedidos Recebidos (Aprovação pelo Gestor) */}
                            <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border)] p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
                                            <Shield size={16} className="text-primary" /> Pedidos Recebidos para Aprovação
                                        </h3>
                                        <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                            Pedidos de subempreiteiros e colaboradores para entrar nas suas obras.
                                        </p>
                                    </div>
                                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                                        {receivedRequests.length} pendente(s)
                                    </span>
                                </div>

                                {receivedRequests.length === 0 ? (
                                    <div className="text-center py-10 text-[var(--text-muted)] text-xs border border-dashed border-[var(--border)] rounded-xl">
                                        Não existem solicitações de acesso pendentes para aprovação.
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead>
                                                <tr className="border-b border-[var(--border)] text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-wider bg-[var(--bg-input)]/50">
                                                    <th className="py-2.5 px-3">Requerente</th>
                                                    <th className="py-2.5 px-3">Email</th>
                                                    <th className="py-2.5 px-3">Obra Solicitada</th>
                                                    <th className="py-2.5 px-3">Empresa a Representar</th>
                                                    <th className="py-2.5 px-3">Data</th>
                                                    <th className="py-2.5 px-3 text-right">Ação</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[var(--border)]">
                                                {receivedRequests.map(req => {
                                                    const proj = projects.find(p => p.id === req.projectId);
                                                    return (
                                                        <tr key={req.id} className="hover:bg-primary/5">
                                                            <td className="py-3 px-3 font-semibold text-[var(--text)]">
                                                                {req.userName || 'Utilizador'}
                                                            </td>
                                                            <td className="py-3 px-3 text-[var(--text-muted)]">{req.userEmail || '—'}</td>
                                                            <td className="py-3 px-3 font-medium text-primary">{proj?.name || req.projectName || req.projectId}</td>
                                                            <td className="py-3 px-3">
                                                                <span className="px-2 py-0.5 rounded font-semibold text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                                                                    {req.companyName || 'Empresa designada'}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 px-3 text-[var(--text-muted)] text-[11px]">
                                                                {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : '—'}
                                                            </td>
                                                            <td className="py-3 px-3 text-right">
                                                                <div className="flex items-center justify-end gap-2">
                                                                    <button
                                                                        onClick={() => {
                                                                            resolveProjectRequest(req.id, 'approved', 'data_user');
                                                                            addNotification('success', `Acesso de ${req.userName} aprovado com sucesso!`);
                                                                        }}
                                                                        className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm"
                                                                    >
                                                                        <Check size={12} /> Aprovar
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            resolveProjectRequest(req.id, 'rejected');
                                                                            addNotification('info', `Pedido recusado.`);
                                                                        }}
                                                                        className="px-2 py-1 rounded-md bg-red-100 hover:bg-red-200 text-red-700 font-semibold text-[11px]"
                                                                    >
                                                                        Rejeitar
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* Os Meus Pedidos Enviados */}
                            <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border)] p-6 shadow-sm">
                                <h3 className="text-sm font-bold text-[var(--text)] mb-3 flex items-center gap-2">
                                    <Clock size={16} className="text-[var(--text-muted)]" /> Os Meus Pedidos Enviados
                                </h3>

                                {sentRequests.length === 0 ? (
                                    <div className="text-center py-6 text-[var(--text-muted)] text-xs border border-dashed border-[var(--border)] rounded-xl">
                                        Não submeteu nenhuma solicitação de acesso a projetos recentemente.
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead>
                                                <tr className="border-b border-[var(--border)] text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-wider bg-[var(--bg-input)]/50">
                                                    <th className="py-2.5 px-3">Obra</th>
                                                    <th className="py-2.5 px-3">Empresa Selecionada</th>
                                                    <th className="py-2.5 px-3">Data do Pedido</th>
                                                    <th className="py-2.5 px-3 text-right">Estado</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[var(--border)]">
                                                {sentRequests.map(req => {
                                                    const proj = projects.find(p => p.id === req.projectId);
                                                    return (
                                                        <tr key={req.id}>
                                                            <td className="py-2.5 px-3 font-semibold text-[var(--text)]">
                                                                {proj?.name || req.projectName || req.projectId}
                                                            </td>
                                                            <td className="py-2.5 px-3 text-[var(--text-muted)]">{req.companyName || '—'}</td>
                                                            <td className="py-2.5 px-3 text-[var(--text-muted)] text-[11px]">
                                                                {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : '—'}
                                                            </td>
                                                            <td className="py-2.5 px-3 text-right">
                                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                                    req.status === 'approved' 
                                                                        ? 'bg-emerald-100 text-emerald-800' 
                                                                        : req.status === 'rejected'
                                                                        ? 'bg-red-100 text-red-700'
                                                                        : 'bg-amber-100 text-amber-800'
                                                                }`}>
                                                                    {req.status === 'approved' ? 'Aprovado' : req.status === 'rejected' ? 'Rejeitado' : 'Pendente de Aprovação'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ════════ TAB 3: MEMBROS DA EMPRESA ════════ */}
                    {activeTab === 'company' && (
                        <div className="space-y-6">
                            <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border)] p-6 shadow-sm">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <Building2 size={20} className="text-primary" />
                                            <h3 className="text-base font-bold text-[var(--text)]">
                                                {userAccount?.name || 'A Minha Empresa'}
                                            </h3>
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary uppercase">
                                                {currentPlan}
                                            </span>
                                        </div>
                                        <p className="text-xs text-[var(--text-muted)] mt-1">
                                            {userAccount?.vatNumber ? `NIF: ${userAccount.vatNumber} • ` : ''} 
                                            Utilizadores associados: <strong>{companyMembers.length} / {maxCompanyMembers === Infinity ? 'Ilimitados' : maxCompanyMembers}</strong>
                                        </p>
                                    </div>

                                    <button
                                        onClick={() => {
                                            setInviteError('');
                                            setInviteSuccess('');
                                            setIsInviteOpen(true);
                                        }}
                                        className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2 shrink-0 self-start sm:self-auto"
                                    >
                                        <UserPlus size={15} /> Associar Utilizador
                                    </button>
                                </div>

                                {/* Bonus project accesses banner */}
                                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 flex items-start gap-3 mb-6">
                                    <Sparkles size={18} className="text-primary shrink-0 mt-0.5" />
                                    <div className="text-xs text-blue-950 dark:text-blue-200">
                                        <strong className="font-bold">Bónus de Acessos a Obras:</strong> No seu plano com subscrição, cada utilizador associado à sua empresa tem direito a <strong>+10 acessos a obras parceiras</strong> (total de 15 obras simultâneas em vez das 5 gratuitas).
                                    </div>
                                </div>

                                {/* Members Table */}
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                            <tr className="border-b border-[var(--border)] text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-wider bg-[var(--bg-input)]/50">
                                                <th className="py-2.5 px-3">Colaborador</th>
                                                <th className="py-2.5 px-3">Email</th>
                                                <th className="py-2.5 px-3">Perfil</th>
                                                <th className="py-2.5 px-3">Obras Associadas</th>
                                                <th className="py-2.5 px-3 text-right">Limite de Acesso</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--border)]">
                                            {companyMembers.map(member => (
                                                <tr key={member.id} className="hover:bg-primary/5">
                                                    <td className="py-3 px-3 font-semibold text-[var(--text)]">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-[var(--text)] font-bold flex items-center justify-center text-xs">
                                                                {member.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <span>{member.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-3 text-[var(--text-muted)]">{member.email}</td>
                                                    <td className="py-3 px-3">
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 dark:bg-surface text-gray-700 dark:text-gray-300">
                                                            {member.role === 'admin' || member.role === 'client_admin' ? 'Administrador' : 'Colaborador'}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-3 font-medium text-[var(--text)]">
                                                        {member.projectAccess?.length || 0} obra(s)
                                                    </td>
                                                    <td className="py-3 px-3 text-right">
                                                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                                            {currentPlan === 'free' ? '5 obras' : (currentPlan === 'enterprise' ? 'Ilimitado' : '15 obras (+10 bónus)')}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ════════ TAB 4: AS MINHAS SUBSCRIÇÕES ════════ */}
                    {activeTab === 'subscriptions' && (
                        <div className="space-y-6">
                            {/* Current Plan Overview Card */}
                            <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border)] p-6 shadow-sm">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--border)]">
                                    <div>
                                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Subscrição Ativa</span>
                                        <h2 className="text-2xl font-black text-[var(--text)] mt-1 flex items-center gap-2">
                                            Plano <span className="text-primary uppercase">{currentPlan}</span>
                                            {currentPlan !== 'free' && <CheckCircle2 size={20} className="text-emerald-500" />}
                                        </h2>
                                        <p className="text-xs text-[var(--text-muted)] mt-1">
                                            Empresa: <strong>{userAccount?.name || currentUser.name}</strong> • Estado: <strong className="text-emerald-600">Ativo</strong>
                                        </p>
                                    </div>

                                    {currentPlan === 'free' ? (
                                        <button
                                            onClick={() => handleRequestUpgrade('premium')}
                                            className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 self-start sm:self-auto"
                                        >
                                            <Crown size={15} /> Fazer Upgrade para Plano Pago
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleRequestUpgrade('enterprise')}
                                            className="px-4 py-2 rounded-xl border border-primary/30 text-primary hover:bg-primary/5 font-semibold text-xs transition-colors self-start sm:self-auto"
                                        >
                                            Alterar / Fazer Upgrade
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
                                    <div className="p-4 rounded-xl bg-[var(--bg-input)]/40 border border-[var(--border)]">
                                        <span className="text-xs text-[var(--text-muted)] block">Criação de Obras Próprias</span>
                                        <span className="text-xl font-bold text-[var(--text)] mt-1 block">
                                            {projectCreationLimit === Infinity ? 'Ilimitadas' : `${createdProjectsCount} / ${projectCreationLimit}`}
                                        </span>
                                        <span className="text-[11px] text-[var(--text-muted)] mt-0.5 block">
                                            {projectCreationLimit === 0 ? 'Requer plano pago' : 'Obras criadas pela sua empresa'}
                                        </span>
                                    </div>
                                    <div className="p-4 rounded-xl bg-[var(--bg-input)]/40 border border-[var(--border)]">
                                        <span className="text-xs text-[var(--text-muted)] block">Acesso Simultâneo a Obras Parceiras</span>
                                        <span className="text-xl font-bold text-[var(--text)] mt-1 block">
                                            {maxJoinedProjects === Infinity ? 'Ilimitado' : `${joinedProjects.length} / ${maxJoinedProjects}`}
                                        </span>
                                        <span className="text-[11px] text-[var(--text-muted)] mt-0.5 block">
                                            {currentPlan === 'free' ? '5 obras gratuitas' : '15 obras (+10 bónus incluído)'}
                                        </span>
                                    </div>
                                    <div className="p-4 rounded-xl bg-[var(--bg-input)]/40 border border-[var(--border)]">
                                        <span className="text-xs text-[var(--text-muted)] block">Membros da Equipa</span>
                                        <span className="text-xl font-bold text-[var(--text)] mt-1 block">
                                            {maxCompanyMembers === Infinity ? 'Ilimitados' : `${companyMembers.length} / ${maxCompanyMembers}`}
                                        </span>
                                        <span className="text-[11px] text-[var(--text-muted)] mt-0.5 block">
                                            Colaboradores da sua empresa
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Plans Comparison Grid */}
                            <div className="text-center pt-2">
                                <h3 className="text-lg font-bold text-[var(--text)]">Escolha o plano ideal para a sua empresa</h3>
                                <p className="text-xs text-[var(--text-muted)] mt-1">
                                    Aceda a mais obras, crie os seus próprios estaleiros e beneficie da gestão documental e de acessos avançada.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Plano Básico */}
                                <div className={`rounded-lg border p-6 flex flex-col justify-between transition-all bg-[var(--bg-card)] ${
                                    currentPlan === 'basic' ? 'border-primary ring-2 ring-primary/20 shadow-md' : 'border-[var(--border)] hover:border-primary/40'
                                }`}>
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="font-extrabold text-base text-[var(--text)]">Básico</h4>
                                            {currentPlan === 'basic' && (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-white">Plano Atual</span>
                                            )}
                                        </div>
                                        <div className="text-2xl font-black text-primary mb-1">1 Obra</div>
                                        <p className="text-xs text-[var(--text-muted)] mb-4">Ideal para empreiteiros a arrancar com uma obra principal.</p>

                                        <ul className="space-y-2 text-xs text-[var(--text)] pt-2 border-t border-[var(--border)]">
                                            <li className="flex items-center gap-2">
                                                <Check size={14} className="text-emerald-500 shrink-0" />
                                                <span><strong>1 Obra Própria</strong> gerida pela sua empresa</span>
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <Check size={14} className="text-emerald-500 shrink-0" />
                                                <span>Até <strong>5 utilizadores</strong> da sua empresa</span>
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <Check size={14} className="text-emerald-500 shrink-0" />
                                                <span><strong>15 Obras simultâneas</strong> (+10 acessos por user)</span>
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <Check size={14} className="text-emerald-500 shrink-0" />
                                                <span>Até 1.200 registos de controlo de acessos</span>
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <Check size={14} className="text-emerald-500 shrink-0" />
                                                <span>Suporte standard</span>
                                            </li>
                                        </ul>
                                    </div>

                                    <button
                                        disabled={currentPlan === 'basic'}
                                        onClick={() => handleRequestUpgrade('basic')}
                                        className={`w-full py-2 rounded-xl text-xs font-bold mt-6 transition-all ${
                                            currentPlan === 'basic'
                                                ? 'bg-gray-100 dark:bg-surface text-gray-400 cursor-not-allowed'
                                                : 'bg-primary hover:bg-primary-hover text-white shadow-sm'
                                        }`}
                                    >
                                        {currentPlan === 'basic' ? 'Plano Atual' : 'Pedir Subscrição Básico'}
                                    </button>
                                </div>

                                {/* Plano Premium */}
                                <div className={`rounded-lg border p-6 flex flex-col justify-between transition-all bg-[var(--bg-card)] relative ${
                                    currentPlan === 'premium' ? 'border-primary ring-2 ring-primary/20 shadow-md' : 'border-primary/50 shadow-sm hover:border-primary'
                                }`}>
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-primary to-blue-600 text-white shadow-sm">
                                        Mais Popular
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="font-extrabold text-base text-[var(--text)]">Premium</h4>
                                            {currentPlan === 'premium' && (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-white">Plano Atual</span>
                                            )}
                                        </div>
                                        <div className="text-2xl font-black text-primary mb-1">3 Obras</div>
                                        <p className="text-xs text-[var(--text-muted)] mb-4">Para empresas de construção com múltiplos projetos em curso.</p>

                                        <ul className="space-y-2 text-xs text-[var(--text)] pt-2 border-t border-[var(--border)]">
                                            <li className="flex items-center gap-2">
                                                <Check size={14} className="text-emerald-500 shrink-0" />
                                                <span>Até <strong>3 Obras Próprias</strong> em simultâneo</span>
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <Check size={14} className="text-emerald-500 shrink-0" />
                                                <span>Até <strong>10 utilizadores</strong> da sua empresa</span>
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <Check size={14} className="text-emerald-500 shrink-0" />
                                                <span><strong>15 Obras simultâneas</strong> (+10 acessos por user)</span>
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <Check size={14} className="text-emerald-500 shrink-0" />
                                                <span>Gestão Documental & CDE na Nuvem</span>
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <Check size={14} className="text-emerald-500 shrink-0" />
                                                <span>Até 3.600 registos de acessos</span>
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <Check size={14} className="text-emerald-500 shrink-0" />
                                                <span>Suporte prioritário</span>
                                            </li>
                                        </ul>
                                    </div>

                                    <button
                                        disabled={currentPlan === 'premium'}
                                        onClick={() => handleRequestUpgrade('premium')}
                                        className={`w-full py-2 rounded-xl text-xs font-bold mt-6 transition-all ${
                                            currentPlan === 'premium'
                                                ? 'bg-gray-100 dark:bg-surface text-gray-400 cursor-not-allowed'
                                                : 'bg-primary hover:bg-primary-hover text-white shadow-sm'
                                        }`}
                                    >
                                        {currentPlan === 'premium' ? 'Plano Atual' : 'Pedir Subscrição Premium'}
                                    </button>
                                </div>

                                {/* Plano Enterprise */}
                                <div className={`rounded-lg border p-6 flex flex-col justify-between transition-all bg-[var(--bg-card)] ${
                                    currentPlan === 'enterprise' ? 'border-primary ring-2 ring-primary/20 shadow-md' : 'border-[var(--border)] hover:border-primary/40'
                                }`}>
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="font-extrabold text-base text-[var(--text)]">Enterprise</h4>
                                            {currentPlan === 'enterprise' && (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-white">Plano Atual</span>
                                            )}
                                        </div>
                                        <div className="text-2xl font-black text-primary mb-1">Ilimitado</div>
                                        <p className="text-xs text-[var(--text-muted)] mb-4">Grandes construtoras com necessidades à medida e infraestrutura dedicada.</p>

                                        <ul className="space-y-2 text-xs text-[var(--text)] pt-2 border-t border-[var(--border)]">
                                            <li className="flex items-center gap-2">
                                                <Check size={14} className="text-emerald-500 shrink-0" />
                                                <span><strong>Obras Próprias Ilimitadas</strong></span>
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <Check size={14} className="text-emerald-500 shrink-0" />
                                                <span>Até <strong>50 utilizadores</strong> da sua empresa</span>
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <Check size={14} className="text-emerald-500 shrink-0" />
                                                <span>Acessos a obras <strong>Ilimitados</strong></span>
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <Check size={14} className="text-emerald-500 shrink-0" />
                                                <span>Registo de controlo de acessos ilimitado</span>
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <Check size={14} className="text-emerald-500 shrink-0" />
                                                <span>Gestor de conta dedicado & Onboarding</span>
                                            </li>
                                        </ul>
                                    </div>

                                    <button
                                        disabled={currentPlan === 'enterprise'}
                                        onClick={() => handleRequestUpgrade('enterprise')}
                                        className={`w-full py-2 rounded-xl text-xs font-bold mt-6 transition-all ${
                                            currentPlan === 'enterprise'
                                                ? 'bg-gray-100 dark:bg-surface text-gray-400 cursor-not-allowed'
                                                : 'bg-slate-900 dark:bg-white text-white dark:text-gray-900 hover:bg-slate-800 shadow-sm'
                                        }`}
                                    >
                                        {currentPlan === 'enterprise' ? 'Plano Atual' : 'Contactar para Enterprise'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ════════ TAB 5: GESTÃO ÁGIL DE CLIENTES (SUPERADMIN) ════════ */}
                    {activeTab === 'client_management' && isSuperAdmin && (
                        <div className="space-y-6">
                            {/* Pending Subscription Requests from Users */}
                            {subscriptionRequests.filter(r => r.status === 'pending').length > 0 && (
                                <div className="bg-[var(--bg-card)] rounded-lg border border-amber-300 dark:border-amber-800 p-6 shadow-sm">
                                    <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2 mb-3">
                                        <Clock size={16} className="text-amber-600" />
                                        Pedidos de Subscrição / Upgrade Pendentes
                                    </h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead>
                                                <tr className="border-b border-[var(--border)] text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-wider bg-[var(--bg-input)]/50">
                                                    <th className="py-2 px-3">Empresa</th>
                                                    <th className="py-2 px-3">Contacto</th>
                                                    <th className="py-2 px-3">Plano Solicitado</th>
                                                    <th className="py-2 px-3">Data</th>
                                                    <th className="py-2 px-3 text-right">Ação</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[var(--border)]">
                                                {subscriptionRequests.filter(r => r.status === 'pending').map(req => (
                                                    <tr key={req.id}>
                                                        <td className="py-2.5 px-3 font-semibold text-[var(--text)]">
                                                            {req.companyName} {req.nif ? `(NIF: ${req.nif})` : ''}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-[var(--text-muted)]">
                                                            {req.contactName} ({req.email})
                                                        </td>
                                                        <td className="py-2.5 px-3">
                                                            <span className="px-2 py-0.5 rounded-full font-bold uppercase text-[10px] bg-primary/10 text-primary">
                                                                {req.plan}
                                                            </span>
                                                        </td>
                                                        <td className="py-2.5 px-3 text-[var(--text-muted)] text-[11px]">
                                                            {new Date(req.createdAt).toLocaleDateString()}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button
                                                                    onClick={() => {
                                                                        approveSubscriptionRequest(req.id, currentUser.name);
                                                                        addNotification('success', `Subscrição para ${req.companyName} aprovada!`);
                                                                    }}
                                                                    className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px]"
                                                                >
                                                                    Aprovar
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        rejectSubscriptionRequest(req.id);
                                                                        addNotification('info', 'Pedido de subscrição rejeitado.');
                                                                    }}
                                                                    className="px-2 py-1 rounded bg-red-100 hover:bg-red-200 text-red-700 font-semibold text-[11px]"
                                                                >
                                                                    Rejeitar
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Client Accounts Agile Table */}
                            <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border)] p-6 shadow-sm">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                    <div>
                                        <h3 className="text-base font-bold text-[var(--text)] flex items-center gap-2">
                                            <Shield size={18} className="text-indigo-600" />
                                            Gestão Ágil de Clientes & Subscrições
                                        </h3>
                                        <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                            Altere o plano de qualquer cliente de forma imediata através do seletor em tempo real.
                                        </p>
                                    </div>
                                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200">
                                        Total: {accounts.length} contas
                                    </span>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                            <tr className="border-b border-[var(--border)] text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-wider bg-[var(--bg-input)]/50">
                                                <th className="py-3 px-3">Empresa / Cliente</th>
                                                <th className="py-3 px-3">NIF / NIPC</th>
                                                <th className="py-3 px-3">Contacto</th>
                                                <th className="py-3 px-3">Plano Atual (Alteração Ágil)</th>
                                                <th className="py-3 px-3">Obras Criadas</th>
                                                <th className="py-3 px-3">Membros</th>
                                                <th className="py-3 px-3 text-right">Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--border)]">
                                            {accounts.map(acc => {
                                                const accProjectsCount = projects.filter(p => p.accountId === acc.id).length;
                                                const accMembersCount = users.filter(u => u.accountId === acc.id).length;

                                                return (
                                                    <tr key={acc.id} className="hover:bg-primary/5 transition-colors">
                                                        <td className="py-3 px-3 font-bold text-[var(--text)]">
                                                            {acc.name}
                                                        </td>
                                                        <td className="py-3 px-3 text-[var(--text-muted)] font-mono">
                                                            {acc.vatNumber || '—'}
                                                        </td>
                                                        <td className="py-3 px-3 text-[var(--text-muted)]">
                                                            <div>{acc.contactEmail || '—'}</div>
                                                            {acc.contactPhone && <div className="text-[10px] text-gray-400">{acc.contactPhone}</div>}
                                                        </td>
                                                        <td className="py-3 px-3">
                                                            {/* Agile Instant Plan Switcher Dropdown */}
                                                            <select
                                                                value={acc.plan}
                                                                onChange={(e) => {
                                                                    const newPlan = e.target.value as PlanType;
                                                                    changeAccountPlan(acc.id, newPlan);
                                                                    addNotification('success', `Plano da empresa "${acc.name}" atualizado para ${newPlan.toUpperCase()}!`);
                                                                }}
                                                                className="px-2.5 py-1 text-xs font-bold rounded-lg border border-primary/30 bg-primary/5 text-primary outline-none focus:ring-2 focus:ring-primary cursor-pointer hover:bg-primary/10 transition-colors"
                                                            >
                                                                <option value="free">Gratuito (0 obras | 1 user)</option>
                                                                <option value="basic">Básico (1 obra | 5 users)</option>
                                                                <option value="premium">Premium (3 obras | 10 users)</option>
                                                                <option value="enterprise">Enterprise (Ilimitado | 50 users)</option>
                                                            </select>
                                                        </td>
                                                        <td className="py-3 px-3 font-semibold text-[var(--text)]">
                                                            {accProjectsCount} / {acc.maxProjects === -1 ? '∞' : (acc.maxProjects ?? 0)}
                                                        </td>
                                                        <td className="py-3 px-3 text-[var(--text-muted)]">
                                                            {accMembersCount} / {acc.maxCompanyUsers || 1}
                                                        </td>
                                                        <td className="py-3 px-3 text-right">
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                {acc.status || 'Ativo'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </main>

                {/* ════════ MODAL: SOLICITAR PROJETO ════════ */}
                <Modal 
                    title="Solicitar Acesso a Obra" 
                    isOpen={isJoinOpen} 
                    onClose={() => setIsJoinOpen(false)}
                >
                    <form onSubmit={handleJoinSubmit} className="space-y-4">
                        <InputGroup label="Código da Obra / Convite *">
                            <input
                                required
                                type="text"
                                className="w-full p-2.5 border border-gray-300 dark:border-[#444746] rounded-lg focus:ring-2 focus:ring-primary outline-none uppercase font-mono text-sm placeholder:normal-case"
                                placeholder="ex: PRJ-ABCD-2026"
                                value={joinCode}
                                onChange={e => {
                                    setJoinCode(e.target.value);
                                    setSelectedCompanyId('');
                                    setJoinError('');
                                }}
                            />
                        </InputGroup>

                        {/* Real-time Project Match Feedback */}
                        {joinCode.trim() && (
                            <div>
                                {matchedJoinProject ? (
                                    <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                                                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                                                    Obra Encontrada: {matchedJoinProject.name}
                                                </span>
                                            </div>
                                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded-full">
                                                Código Válido
                                            </span>
                                        </div>

                                        {matchedJoinProject.address && (
                                            <div className="text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                                                <MapPin size={12} /> {matchedJoinProject.address}
                                            </div>
                                        )}

                                        {/* Mandatory Company Selection */}
                                        <div className="pt-2 border-t border-emerald-200 dark:border-emerald-800">
                                            <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-1.5">
                                                Selecione a sua Empresa nesta Obra *
                                            </label>
                                            <p className="text-[11px] text-gray-500 mb-2">
                                                Identifique qual a empresa/subempreiteiro que representa para esta intervenção.
                                            </p>

                                            {companiesInMatchedProject.length > 0 ? (
                                                <select
                                                    required
                                                    value={selectedCompanyId}
                                                    onChange={e => setSelectedCompanyId(e.target.value)}
                                                    className="w-full p-2 text-xs border border-gray-300 dark:border-[#444746] rounded-lg bg-white dark:bg-surface focus:ring-2 focus:ring-primary outline-none font-medium"
                                                >
                                                    <option value="">-- Escolha a sua empresa da lista da obra --</option>
                                                    {companiesInMatchedProject.map(comp => (
                                                        <option key={comp.id} value={comp.id}>
                                                            {comp.name} {comp.nif ? `(NIF: ${comp.nif})` : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <div className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                                                    Ainda não existem empresas ou subempreiteiros registados nesta obra pelo gestor.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-200 flex items-center gap-2">
                                        <AlertCircle size={14} className="shrink-0" />
                                        <span>Nenhuma obra encontrada com este código. Confirme o código com o gestor da obra.</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {joinError && (
                            <div className="text-red-600 text-xs bg-red-50 p-2.5 rounded-lg border border-red-200 flex items-center gap-2">
                                <AlertCircle size={14} className="shrink-0" />
                                <span>{joinError}</span>
                            </div>
                        )}

                        {joinSuccess && (
                            <div className="text-emerald-700 text-xs bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 flex items-center gap-2">
                                <CheckCircle2 size={14} className="shrink-0" />
                                <span>{joinSuccess}</span>
                            </div>
                        )}

                        <PrimaryButton 
                            type="submit" 
                            disabled={!matchedJoinProject || !selectedCompanyId}
                            className="w-full py-2.5 text-xs font-bold"
                        >
                            Submeter Pedido de Acesso
                        </PrimaryButton>
                    </form>
                </Modal>

                {/* ════════ MODAL: CRIAR NOVO PROJETO ════════ */}
                <Modal 
                    title="Criar Novo Projeto / Obra" 
                    isOpen={isCreateOpen} 
                    onClose={() => setIsCreateOpen(false)}
                >
                    <form onSubmit={handleCreateProject} className="space-y-4">
                        <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-xs text-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
                            Será configurado automaticamente como <strong>Gestor de Obra</strong> e será gerado um código de convite para partilhar com os seus parceiros e subempreiteiros.
                        </div>

                        <InputGroup label="Nome da Obra / Projeto *">
                            <input 
                                required 
                                type="text" 
                                className="w-full p-2.5 text-xs border border-gray-300 dark:border-[#444746] rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                placeholder="ex: Reabilitação Edifício Rossio"
                                value={newProj.name} 
                                onChange={e => setNewProj({ ...newProj, name: e.target.value })} 
                            />
                        </InputGroup>

                        <InputGroup label="Localização / Morada *">
                            <input 
                                required 
                                type="text" 
                                className="w-full p-2.5 text-xs border border-gray-300 dark:border-[#444746] rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                placeholder="ex: Praça D. Pedro IV, Lisboa"
                                value={newProj.address} 
                                onChange={e => setNewProj({ ...newProj, address: e.target.value })} 
                            />
                        </InputGroup>

                        <InputGroup label="Descrição ou Notas">
                            <textarea 
                                className="w-full p-2.5 text-xs border border-gray-300 dark:border-[#444746] rounded-lg focus:ring-2 focus:ring-primary outline-none" 
                                rows={3}
                                placeholder="Notas breves sobre a intervenção..."
                                value={newProj.description} 
                                onChange={e => setNewProj({ ...newProj, description: e.target.value })} 
                            />
                        </InputGroup>

                        <PrimaryButton type="submit" className="w-full py-2.5 text-xs font-bold">
                            Criar Obra e Gerar Código
                        </PrimaryButton>
                    </form>
                </Modal>

                {/* ════════ MODAL: ASSOCIAR MEMBRO À EMPRESA ════════ */}
                <Modal 
                    title="Associar Utilizador à Empresa" 
                    isOpen={isInviteOpen} 
                    onClose={() => setIsInviteOpen(false)}
                >
                    <form onSubmit={handleInviteSubmit} className="space-y-4">
                        <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-xs text-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
                            Os colaboradores associados à sua empresa beneficiam de <strong>+10 acessos a obras parceiras</strong> ao abrigo da sua subscrição ({currentPlan.toUpperCase()}).
                        </div>

                        <InputGroup label="Nome do Colaborador">
                            <input 
                                type="text" 
                                className="w-full p-2.5 text-xs border border-gray-300 dark:border-[#444746] rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                placeholder="Nome completo"
                                value={inviteData.name} 
                                onChange={e => setInviteData({ ...inviteData, name: e.target.value })} 
                            />
                        </InputGroup>

                        <InputGroup label="Email Corporativo do Colaborador *">
                            <input 
                                required 
                                type="email" 
                                className="w-full p-2.5 text-xs border border-gray-300 dark:border-[#444746] rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                placeholder="colaborador@empresa.pt"
                                value={inviteData.email} 
                                onChange={e => setInviteData({ ...inviteData, email: e.target.value })} 
                            />
                        </InputGroup>

                        {inviteError && (
                            <div className="text-red-600 text-xs bg-red-50 p-2.5 rounded-lg border border-red-200 flex items-center gap-2">
                                <AlertCircle size={14} className="shrink-0" />
                                <span>{inviteError}</span>
                            </div>
                        )}

                        {inviteSuccess && (
                            <div className="text-emerald-700 text-xs bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 flex items-center gap-2">
                                <CheckCircle2 size={14} className="shrink-0" />
                                <span>{inviteSuccess}</span>
                            </div>
                        )}

                        <PrimaryButton type="submit" className="w-full py-2.5 text-xs font-bold">
                            Associar Colaborador
                        </PrimaryButton>
                    </form>
                </Modal>

                {/* ════════ MODAL: PEDIDO DE SUBSCRIÇÃO / UPGRADE ════════ */}
                <Modal 
                    title={`Subscrever Plano ${selectedUpgradePlan.toUpperCase()}`}
                    isOpen={isUpgradeModalOpen} 
                    onClose={() => setIsUpgradeModalOpen(false)}
                >
                    <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
                            <div className="text-xs font-bold text-primary uppercase">Resumo da Subscrição</div>
                            <div className="text-lg font-extrabold text-[var(--text)]">Plano {selectedUpgradePlan.toUpperCase()}</div>
                            <p className="text-xs text-[var(--text-muted)]">
                                {selectedUpgradePlan === 'basic' && 'Permite criar 1 obra própria, associar até 5 membros da sua empresa e concede 15 acessos a obras em simultâneo (+10 bónus).'}
                                {selectedUpgradePlan === 'premium' && 'Permite criar até 3 obras próprias, associar até 10 membros da sua empresa com CDE avançado e 15 acessos simultâneos.'}
                                {selectedUpgradePlan === 'enterprise' && 'Obras próprias ilimitadas, até 50 utilizadores e acessos sem restrições com suporte dedicado.'}
                            </p>
                        </div>

                        <InputGroup label="Observações ou Notas de Faturação">
                            <textarea 
                                className="w-full p-2.5 text-xs border border-gray-300 dark:border-[#444746] rounded-lg focus:ring-2 focus:ring-primary outline-none" 
                                rows={3}
                                placeholder="Indique eventuais dados de faturação ou requisitos específicos..."
                                value={upgradeNotes} 
                                onChange={e => setUpgradeNotes(e.target.value)} 
                            />
                        </InputGroup>

                        <div className="flex items-center gap-3 pt-2">
                            <SecondaryButton onClick={() => setIsUpgradeModalOpen(false)} className="text-xs">
                                Cancelar
                            </SecondaryButton>
                            <PrimaryButton onClick={submitUpgradeRequest} className="text-xs font-bold">
                                Confirmar e Enviar Pedido
                            </PrimaryButton>
                        </div>
                    </div>
                </Modal>
            </div>
        </AuthGuard>
    );
}
