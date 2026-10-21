'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from '@/navigation';
import { useStore, type AppState } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { 
    Folder, MapPin, Users, Layout, LogOut, ArrowRight, Sun, Moon, 
    Plus, Check, Shield, Building2, CheckCircle2, Clock, AlertCircle, 
    Copy, Search, Sparkles, UserPlus, Crown, CheckCheck, 
    XCircle, ChevronRight, Briefcase, FileCheck, ArrowUpRight, KeyRound,
    UserX, UserCheck, Trash2, Ban, ShieldAlert, Info, RotateCcw, Filter
} from 'lucide-react';
import { Modal, InputGroup, PrimaryButton, SecondaryButton } from '@/components/Modal';
import AuthGuard from '@/components/AuthGuard';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useTheme } from '@/providers/ThemeProvider';
import type { PlanType, ProjectRole, User, Account, Project } from '@/types';

type WorkplaceTab = 'projects' | 'requests' | 'company' | 'subscriptions' | 'client_management' | 'users_management';

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
        addNotification,
        syncFromServer,
        suspendUser,
        reactivateUser,
        deleteUserGdpr,
        cleanupInactiveUsers,
        deleteAccount,
        cleanupOrphanAccounts
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
        addNotification: state.addNotification,
        syncFromServer: state.syncFromServer,
        suspendUser: state.suspendUser,
        reactivateUser: state.reactivateUser,
        deleteUserGdpr: state.deleteUserGdpr,
        cleanupInactiveUsers: state.cleanupInactiveUsers,
        deleteAccount: state.deleteAccount,
        cleanupOrphanAccounts: state.cleanupOrphanAccounts
    })));

    // Active Navigation Tab
    const [activeTab, setActiveTab] = useState<WorkplaceTab>('projects');
    const [searchQuery, setSearchQuery] = useState('');
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    const [clientPlanFilter, setClientPlanFilter] = useState<'all' | 'paid' | 'free' | 'orphans'>('all');

    // User Management & GDPR State
    const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'suspended' | 'inactive' | 'deleted'>('all');
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [selectedUserForAction, setSelectedUserForAction] = useState<User | null>(null);
    const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
    const [suspensionReasonInput, setSuspensionReasonInput] = useState('');
    const [isDeleteGdprModalOpen, setIsDeleteGdprModalOpen] = useState(false);
    const [deleteGdprMode, setDeleteGdprMode] = useState<'anonymize' | 'purge'>('anonymize');
    const [deleteGdprReason, setDeleteGdprReason] = useState('Exercício do Direito ao Apagamento (Art. 17.º RGPD)');
    const [isCleanupModalOpen, setIsCleanupModalOpen] = useState(false);
    const [cleanupThresholdDays, setCleanupThresholdDays] = useState<number>(180);
    const [cleanupMode, setCleanupMode] = useState<'suspend' | 'anonymize'>('suspend');
    const [isProcessingAction, setIsProcessingAction] = useState(false);

    // Modals
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isJoinOpen, setIsJoinOpen] = useState(false);
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const [selectedUpgradePlan, setSelectedUpgradePlan] = useState<PlanType>('premium');
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

    useEffect(() => {
        syncFromServer?.().catch(() => {});
    }, [syncFromServer]);

    // Active Account & Subscription Details
    const userAccount = useMemo(() => {
        if (!currentUser) return null;
        return accounts.find(a => a.id === currentUser.accountId) || accounts.find(a => a.id === account?.id) || account || null;
    }, [accounts, currentUser, account]);

    // Paid & Free Accounts Split for SuperAdmin
    const paidAccounts = useMemo(() => accounts.filter(a => a.plan !== 'free'), [accounts]);
    const freeAccounts = useMemo(() => accounts.filter(a => a.plan === 'free'), [accounts]);
    const orphanAccounts = useMemo(() => accounts.filter(acc => {
        if (acc.plan !== 'free') return false;
        const hasUsers = users.some(u => u.accountId === acc.id && u.status !== 'deleted');
        const hasProjects = projects.some(p => p.accountId === acc.id);
        return acc.isOrphan || (!hasUsers && !hasProjects);
    }), [accounts, users, projects]);

    const filteredAccounts = useMemo(() => {
        if (clientPlanFilter === 'paid') return paidAccounts;
        if (clientPlanFilter === 'free') return freeAccounts;
        if (clientPlanFilter === 'orphans') return orphanAccounts;
        return accounts;
    }, [accounts, paidAccounts, freeAccounts, orphanAccounts, clientPlanFilter]);

    // User Categorization & Inactivity Metrics for SuperAdmin
    const activeUsers = useMemo(() => users.filter(u => u.status !== 'suspended' && u.status !== 'deleted'), [users]);
    const suspendedUsers = useMemo(() => users.filter(u => u.status === 'suspended'), [users]);
    const deletedUsers = useMemo(() => users.filter(u => u.status === 'deleted'), [users]);
    const inactiveUsers = useMemo(() => users.filter(u => {
        if (u.status === 'deleted') return false;
        const date = u.lastLoginAt ? new Date(u.lastLoginAt) : new Date(u.createdAt);
        const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
        return days >= 90;
    }), [users]);

    const filteredManagedUsers = useMemo(() => {
        return users.filter(u => {
            // Status filter
            if (userStatusFilter === 'active' && (u.status === 'suspended' || u.status === 'deleted')) return false;
            if (userStatusFilter === 'suspended' && u.status !== 'suspended') return false;
            if (userStatusFilter === 'deleted' && u.status !== 'deleted') return false;
            if (userStatusFilter === 'inactive') {
                if (u.status === 'deleted') return false;
                const date = u.lastLoginAt ? new Date(u.lastLoginAt) : new Date(u.createdAt);
                const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
                if (days < 90) return false;
            }

            // Search filter
            if (userSearchTerm.trim()) {
                const query = userSearchTerm.toLowerCase();
                const matchName = (u.name || '').toLowerCase().includes(query);
                const matchEmail = (u.email || '').toLowerCase().includes(query);
                const acc = accounts.find(a => a.id === u.accountId);
                const matchAccount = (acc?.name || '').toLowerCase().includes(query);
                return matchName || matchEmail || matchAccount;
            }

            return true;
        });
    }, [users, userStatusFilter, userSearchTerm, accounts]);

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
    const handleRequestUpgrade = (plan: PlanType = 'premium') => {
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

    // Handle User Management Actions (Suspend, Reactivate, GDPR Delete, Inactivity Cleanup)
    const handleConfirmSuspend = async () => {
        if (!selectedUserForAction) return;
        setIsProcessingAction(true);
        try {
            await suspendUser(selectedUserForAction.id, suspensionReasonInput.trim() || undefined);
            setIsSuspendModalOpen(false);
            setSelectedUserForAction(null);
            setSuspensionReasonInput('');
        } finally {
            setIsProcessingAction(false);
        }
    };

    const handleConfirmDeleteGdpr = async () => {
        if (!selectedUserForAction) return;
        setIsProcessingAction(true);
        try {
            await deleteUserGdpr(selectedUserForAction.id, deleteGdprMode, deleteGdprReason.trim() || undefined);
            setIsDeleteGdprModalOpen(false);
            setSelectedUserForAction(null);
        } finally {
            setIsProcessingAction(false);
        }
    };

    const handleConfirmCleanup = async () => {
        setIsProcessingAction(true);
        try {
            await cleanupInactiveUsers(cleanupThresholdDays, cleanupMode);
            setIsCleanupModalOpen(false);
        } finally {
            setIsProcessingAction(false);
        }
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

                            {currentPlan !== 'free' && (
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
                            )}
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
                            <>
                                <button
                                    onClick={() => setActiveTab('client_management')}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                                        activeTab === 'client_management'
                                            ? 'bg-indigo-600 text-white shadow-sm'
                                            : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50'
                                    }`}
                                >
                                    <Shield size={16} /> Gestão de Clientes & Subscrições
                                </button>
                                <button
                                    onClick={() => setActiveTab('users_management')}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                                        activeTab === 'users_management'
                                            ? 'bg-purple-700 text-white shadow-sm'
                                            : 'text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-purple-200 dark:border-purple-900/50'
                                    }`}
                                >
                                    <UserCheck size={16} /> Gestão de Utilizadores & RGPD ({users.length})
                                </button>
                            </>
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
                                                <th className="py-2.5 px-3">Estado</th>
                                                <th className="py-2.5 px-3 text-right">Ação</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--border)]">
                                            {companyMembers.map(member => {
                                                const isSuspended = member.status === 'suspended';
                                                const canManage = (currentUser?.role === 'admin' || currentUser?.role === 'superadmin' || currentUser?.role === 'client_admin') && member.id !== currentUser.id;

                                                return (
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
                                                        <td className="py-3 px-3">
                                                            {isSuspended ? (
                                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300">
                                                                    Suspenso
                                                                </span>
                                                            ) : (
                                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                    Ativo
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-3 text-right">
                                                            {canManage ? (
                                                                isSuspended ? (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => reactivateUser(member.id)}
                                                                        className="px-2.5 py-1 rounded text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200"
                                                                    >
                                                                        Reativar
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setSelectedUserForAction(member);
                                                                            setSuspensionReasonInput('');
                                                                            setIsSuspendModalOpen(true);
                                                                        }}
                                                                        className="px-2.5 py-1 rounded text-[10px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200"
                                                                    >
                                                                        Suspender
                                                                    </button>
                                                                )
                                                            ) : (
                                                                <span className="text-[10px] text-gray-400">—</span>
                                                            )}
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
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200">
                                            Pagas: {paidAccounts.length}
                                        </span>
                                        <span className="font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200">
                                            Gratuitas: {freeAccounts.length}
                                        </span>
                                        {orphanAccounts.length > 0 && (
                                            <span className="font-semibold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200">
                                                Órfãs: {orphanAccounts.length}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Filter Tabs: All, Paid, Free, Orphans + Batch Cleanup Action */}
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-[var(--border)]">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setClientPlanFilter('all')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                                clientPlanFilter === 'all'
                                                    ? 'bg-primary text-white shadow-sm'
                                                    : 'bg-[var(--bg-input)] text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]'
                                            }`}
                                        >
                                            <span>Todas as Contas</span>
                                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${clientPlanFilter === 'all' ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
                                                {accounts.length}
                                            </span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setClientPlanFilter('paid')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                                clientPlanFilter === 'paid'
                                                    ? 'bg-amber-600 text-white shadow-sm'
                                                    : 'bg-[var(--bg-input)] text-[var(--text-muted)] hover:text-amber-600 dark:hover:text-amber-400 border border-[var(--border)]'
                                            }`}
                                        >
                                            <Crown size={13} className={clientPlanFilter === 'paid' ? 'text-white' : 'text-amber-500'} />
                                            <span>Subscrições Pagas</span>
                                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${clientPlanFilter === 'paid' ? 'bg-white/20 text-white' : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200'}`}>
                                                {paidAccounts.length}
                                            </span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setClientPlanFilter('free')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                                clientPlanFilter === 'free'
                                                    ? 'bg-slate-700 text-white shadow-sm'
                                                    : 'bg-[var(--bg-input)] text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]'
                                            }`}
                                        >
                                            <span>Utilizadores Gratuitos</span>
                                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${clientPlanFilter === 'free' ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
                                                {freeAccounts.length}
                                            </span>
                                        </button>

                                        {orphanAccounts.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => setClientPlanFilter('orphans')}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                                    clientPlanFilter === 'orphans'
                                                        ? 'bg-rose-600 text-white shadow-sm'
                                                        : 'bg-[var(--bg-input)] text-rose-600 dark:text-rose-400 hover:bg-rose-50 border border-rose-200 dark:border-rose-800'
                                                }`}
                                            >
                                                <AlertCircle size={13} />
                                                <span>Contas Órfãs</span>
                                                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${clientPlanFilter === 'orphans' ? 'bg-white/20 text-white' : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200'}`}>
                                                    {orphanAccounts.length}
                                                </span>
                                            </button>
                                        )}
                                    </div>

                                    {orphanAccounts.length > 0 && (
                                        <button
                                            type="button"
                                            disabled={isProcessingAction}
                                            onClick={async () => {
                                                if (window.confirm(`Tem a certeza que deseja limpar definitivamente ${orphanAccounts.length} conta(s) órfã(s) (sem utilizadores e sem obras ativas)?`)) {
                                                    setIsProcessingAction(true);
                                                    try {
                                                        await cleanupOrphanAccounts();
                                                    } finally {
                                                        setIsProcessingAction(false);
                                                    }
                                                }
                                            }}
                                            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
                                            title="Remover todas as contas gratuitas órfãs que ficaram sem utilizadores e sem obras"
                                        >
                                            <Trash2 size={13} />
                                            <span>Limpar Contas Órfãs ({orphanAccounts.length})</span>
                                        </button>
                                    )}
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                            <tr className="border-b border-[var(--border)] text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-wider bg-[var(--bg-input)]/50">
                                                <th className="py-3 px-3">Empresa / Registo</th>
                                                <th className="py-3 px-3">Categoria</th>
                                                <th className="py-3 px-3">NIF / NIPC</th>
                                                <th className="py-3 px-3">Contacto</th>
                                                <th className="py-3 px-3">Plano Atual (Alteração Ágil)</th>
                                                <th className="py-3 px-3">Obras Criadas</th>
                                                <th className="py-3 px-3">Membros</th>
                                                <th className="py-3 px-3">Estado</th>
                                                <th className="py-3 px-3 text-right">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--border)]">
                                            {filteredAccounts.length === 0 ? (
                                                <tr>
                                                    <td colSpan={9} className="py-8 text-center text-xs text-[var(--text-muted)]">
                                                        Nenhuma conta encontrada nesta categoria.
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredAccounts.map(acc => {
                                                    const accProjectsCount = projects.filter(p => p.accountId === acc.id).length;
                                                    const accMembersCount = users.filter(u => u.accountId === acc.id && u.status !== 'deleted').length;
                                                    const registeredName = acc.registeredUserName || users.find(u => u.accountId === acc.id || (u.email && acc.contactEmail && u.email.toLowerCase() === acc.contactEmail.toLowerCase()))?.name;
                                                    const isPaid = acc.plan !== 'free';
                                                    const isOrphan = acc.isOrphan || (accMembersCount === 0 && accProjectsCount === 0 && !isPaid);

                                                    return (
                                                        <tr key={acc.id} className="hover:bg-primary/5 transition-colors">
                                                            <td className="py-3 px-3">
                                                                <div className="font-bold text-[var(--text)] text-sm">{acc.name}</div>
                                                                {registeredName ? (
                                                                    <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
                                                                        <Users size={12} className="text-primary/70 shrink-0" />
                                                                        <span>Utilizador: <strong className="text-[var(--text)] font-semibold">{registeredName}</strong></span>
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1 mt-0.5">
                                                                        <AlertCircle size={11} /> Sem utilizador associado
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="py-3 px-3 whitespace-nowrap">
                                                                {isPaid ? (
                                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                                                        <Crown size={11} className="text-amber-600" />
                                                                        Subscrição Paga
                                                                    </span>
                                                                ) : isOrphan ? (
                                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                                                        Conta Órfã
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                                                        Conta Gratuita
                                                                    </span>
                                                                )}
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
                                                            <td className="py-3 px-3">
                                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                    {acc.status || 'Ativo'}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 px-3 text-right whitespace-nowrap">
                                                                {isPaid ? (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200" title="Subscrição contratada protegida contra eliminação">
                                                                        <Shield size={10} className="text-amber-600" /> Protegida
                                                                    </span>
                                                                ) : accProjectsCount > 0 ? (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200" title="Empresa responsável por obras ativas. Não pode ser eliminada sem transferir a obra.">
                                                                        <Building2 size={10} className="text-blue-600" /> Em Obra
                                                                    </span>
                                                                ) : isOrphan ? (
                                                                    <button
                                                                        type="button"
                                                                        disabled={isProcessingAction}
                                                                        onClick={async () => {
                                                                            if (window.confirm(`Eliminar a conta órfã "${acc.name}" definitivamente?`)) {
                                                                                setIsProcessingAction(true);
                                                                                try {
                                                                                    await deleteAccount(acc.id);
                                                                                } finally {
                                                                                    setIsProcessingAction(false);
                                                                                }
                                                                            }
                                                                        }}
                                                                        className="px-2 py-1 rounded text-[11px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors inline-flex items-center gap-1 disabled:opacity-50"
                                                                        title="Eliminar conta órfã"
                                                                    >
                                                                        <Trash2 size={12} />
                                                                        <span>Limpar Órfã</span>
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        type="button"
                                                                        disabled={isProcessingAction}
                                                                        onClick={async () => {
                                                                            if (window.confirm(`Eliminar a conta gratuita "${acc.name}"?`)) {
                                                                                setIsProcessingAction(true);
                                                                                try {
                                                                                    await deleteAccount(acc.id);
                                                                                } finally {
                                                                                    setIsProcessingAction(false);
                                                                                }
                                                                            }
                                                                        }}
                                                                        className="px-2 py-1 rounded text-[11px] font-bold bg-gray-50 hover:bg-rose-50 text-gray-600 hover:text-rose-700 border border-gray-200 hover:border-rose-200 transition-colors inline-flex items-center gap-1 disabled:opacity-50"
                                                                        title="Eliminar conta"
                                                                    >
                                                                        <Trash2 size={12} />
                                                                        <span>Eliminar</span>
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ════════ TAB 6: GESTÃO DE UTILIZADORES & RGPD (SUPERADMIN) ════════ */}
                    {activeTab === 'users_management' && isSuperAdmin && (
                        <div className="space-y-6">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div className="bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border)] shadow-sm">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Total Registados</span>
                                    <div className="text-2xl font-black text-[var(--text)] mt-1">{users.length}</div>
                                    <div className="text-[11px] text-[var(--text-muted)] mt-0.5">Utilizadores globais</div>
                                </div>
                                <div className="bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border)] shadow-sm">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Ativos</span>
                                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{activeUsers.length}</div>
                                    <div className="text-[11px] text-[var(--text-muted)] mt-0.5">Acesso operacional</div>
                                </div>
                                <div className="bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border)] shadow-sm">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Suspensos</span>
                                    <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{suspendedUsers.length}</div>
                                    <div className="text-[11px] text-[var(--text-muted)] mt-0.5">Acesso impedido</div>
                                </div>
                                <div className="bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border)] shadow-sm">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">Inativos &gt; 90d</span>
                                    <div className="text-2xl font-black text-red-600 dark:text-red-400 mt-1">{inactiveUsers.length}</div>
                                    <div className="text-[11px] text-[var(--text-muted)] mt-0.5">Alerta de retenção RGPD</div>
                                </div>
                            </div>

                            {/* Users Table Card */}
                            <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border)] p-6 shadow-sm">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                    <div>
                                        <h3 className="text-base font-bold text-[var(--text)] flex items-center gap-2">
                                            <Users size={18} className="text-purple-600" />
                                            Utilizadores Registados & Conformidade RGPD
                                        </h3>
                                        <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                            Controlo de acessos, suspensão temporária, apagamento manual e política de retenção por inatividade.
                                        </p>
                                    </div>
                                    
                                    <button
                                        type="button"
                                        onClick={() => setIsCleanupModalOpen(true)}
                                        className="px-3.5 py-2 rounded-lg bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-2 shrink-0 self-start sm:self-auto"
                                    >
                                        <RotateCcw size={14} />
                                        <span>Auditoria & Limpeza por Inatividade RGPD</span>
                                    </button>
                                </div>

                                {/* Filters and Search Bar */}
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[var(--border)]">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setUserStatusFilter('all')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                                userStatusFilter === 'all'
                                                    ? 'bg-purple-700 text-white shadow-sm'
                                                    : 'bg-[var(--bg-input)] text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]'
                                            }`}
                                        >
                                            <span>Todos</span>
                                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${userStatusFilter === 'all' ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
                                                {users.length}
                                            </span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setUserStatusFilter('active')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                                userStatusFilter === 'active'
                                                    ? 'bg-emerald-600 text-white shadow-sm'
                                                    : 'bg-[var(--bg-input)] text-[var(--text-muted)] hover:text-emerald-600 border border-[var(--border)]'
                                            }`}
                                        >
                                            <span>Ativos</span>
                                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${userStatusFilter === 'active' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                                                {activeUsers.length}
                                            </span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setUserStatusFilter('suspended')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                                userStatusFilter === 'suspended'
                                                    ? 'bg-amber-600 text-white shadow-sm'
                                                    : 'bg-[var(--bg-input)] text-[var(--text-muted)] hover:text-amber-600 border border-[var(--border)]'
                                            }`}
                                        >
                                            <span>Suspensos</span>
                                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${userStatusFilter === 'suspended' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'}`}>
                                                {suspendedUsers.length}
                                            </span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setUserStatusFilter('inactive')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                                userStatusFilter === 'inactive'
                                                    ? 'bg-rose-600 text-white shadow-sm'
                                                    : 'bg-[var(--bg-input)] text-[var(--text-muted)] hover:text-rose-600 border border-[var(--border)]'
                                            }`}
                                        >
                                            <span>Inativos (&gt;90d)</span>
                                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${userStatusFilter === 'inactive' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-800'}`}>
                                                {inactiveUsers.length}
                                            </span>
                                        </button>

                                        {deletedUsers.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => setUserStatusFilter('deleted')}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                                    userStatusFilter === 'deleted'
                                                        ? 'bg-slate-700 text-white shadow-sm'
                                                        : 'bg-[var(--bg-input)] text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]'
                                                }`}
                                            >
                                                <span>Eliminados (RGPD)</span>
                                                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${userStatusFilter === 'deleted' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'}`}>
                                                    {deletedUsers.length}
                                                </span>
                                            </button>
                                        )}
                                    </div>

                                    <div className="relative w-full sm:w-64">
                                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[var(--text-muted)]" />
                                        <input
                                            type="text"
                                            placeholder="Pesquisar por nome ou e-mail..."
                                            value={userSearchTerm}
                                            onChange={(e) => setUserSearchTerm(e.target.value)}
                                            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text)] focus:ring-1 focus:ring-purple-600 outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Table */}
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                            <tr className="border-b border-[var(--border)] text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-wider bg-[var(--bg-input)]/50">
                                                <th className="py-3 px-3">Utilizador</th>
                                                <th className="py-3 px-3">Empresa Associada</th>
                                                <th className="py-3 px-3">Perfil</th>
                                                <th className="py-3 px-3">Última Atividade / Inatividade</th>
                                                <th className="py-3 px-3">Estado</th>
                                                <th className="py-3 px-3 text-right">Ações de Gestão & RGPD</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--border)]">
                                            {filteredManagedUsers.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="py-8 text-center text-xs text-[var(--text-muted)]">
                                                        Nenhum utilizador encontrado com os filtros selecionados.
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredManagedUsers.map(u => {
                                                    const userAcc = accounts.find(a => a.id === u.accountId);
                                                    const lastActDate = u.lastLoginAt ? new Date(u.lastLoginAt) : new Date(u.createdAt);
                                                    const daysInactive = Math.floor((Date.now() - lastActDate.getTime()) / (1000 * 60 * 60 * 24));
                                                    const isDeleted = u.status === 'deleted';
                                                    const isSuspended = u.status === 'suspended';
                                                    const isUserSuperAdmin = u.role === 'superadmin';
                                                    const isUserPaid = userAcc ? userAcc.plan !== 'free' : (u.isPaidPlan ?? false);
                                                    const userProjects = projects.filter(p => p.accountId === u.accountId);
                                                    const hasActiveProjects = userProjects.length > 0 || (u.hasActiveProjects ?? false);

                                                    let inactivityBadge = null;
                                                    if (!isDeleted) {
                                                        if (daysInactive < 30) {
                                                            inactivityBadge = <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Ativo recentemente</span>;
                                                        } else if (daysInactive < 90) {
                                                            inactivityBadge = <span className="text-[10px] text-[var(--text-muted)]">Inativo há {daysInactive}d</span>;
                                                        } else if (daysInactive < 180) {
                                                            inactivityBadge = <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200">Inativo ({daysInactive}d)</span>;
                                                        } else if (daysInactive < 365) {
                                                            inactivityBadge = <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200">Inatividade Prolongada ({daysInactive}d)</span>;
                                                        } else {
                                                            inactivityBadge = <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200">Retenção RGPD Excedida (&gt;1 ano)</span>;
                                                        }
                                                    }

                                                    return (
                                                        <tr key={u.id} className="hover:bg-primary/5 transition-colors">
                                                            <td className="py-3 px-3">
                                                                <div className="flex items-center gap-2.5">
                                                                    <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-[var(--text)] font-bold flex items-center justify-center text-xs shrink-0">
                                                                        {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-bold text-[var(--text)]">{u.name}</div>
                                                                        <div className="text-[11px] text-[var(--text-muted)] font-mono">{u.email}</div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="py-3 px-3">
                                                                <div className="font-semibold text-[var(--text)]">{userAcc?.name || '—'}</div>
                                                                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                                                    <span className="text-[10px] text-[var(--text-muted)] uppercase">Plano: {userAcc?.plan || 'free'}</span>
                                                                    {isUserPaid && (
                                                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200" title="Subscrição Paga Contratada: Isento de eliminação por inatividade/RGPD">
                                                                            <Crown size={9} className="text-amber-600" /> Pago
                                                                        </span>
                                                                    )}
                                                                    {hasActiveProjects && (
                                                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200" title={`Responsável por ${userProjects.length} obra(s) ativa(s): Não pode ser apagado para não quebrar a obra`}>
                                                                            <Building2 size={9} className="text-blue-600" /> Obra Ativa
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="py-3 px-3">
                                                                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                                                    isUserSuperAdmin 
                                                                        ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                                                                        : (u.role === 'admin' || u.role === 'client_admin') 
                                                                        ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                                                                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                                                                }`}>
                                                                    {isUserSuperAdmin ? 'SuperAdmin' : (u.role === 'admin' || u.role === 'client_admin') ? 'Administrador' : 'Colaborador'}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 px-3">
                                                                <div className="text-[11px] font-medium text-[var(--text)]">
                                                                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Nunca acedeu'}
                                                                </div>
                                                                <div className="mt-0.5">{inactivityBadge}</div>
                                                            </td>
                                                            <td className="py-3 px-3 whitespace-nowrap">
                                                                {isDeleted ? (
                                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300">
                                                                        Anonimizado RGPD
                                                                    </span>
                                                                ) : isSuspended ? (
                                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300" title={u.suspensionReason || 'Suspensão temporária'}>
                                                                        Suspenso Temporariamente
                                                                    </span>
                                                                ) : (
                                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200">
                                                                        Ativo
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="py-3 px-3 text-right">
                                                                {isUserSuperAdmin ? (
                                                                    <span className="text-[10px] text-gray-400 italic">SuperAdmin (Protegido)</span>
                                                                ) : isDeleted ? (
                                                                    <span className="text-[10px] text-gray-400 italic">Direito ao Esquecimento Exercido</span>
                                                                ) : (
                                                                    <div className="flex items-center justify-end gap-1.5">
                                                                        {isSuspended ? (
                                                                            <button
                                                                                type="button"
                                                                                onClick={async () => {
                                                                                    await reactivateUser(u.id);
                                                                                }}
                                                                                className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
                                                                                title="Reativar acesso do utilizador à plataforma"
                                                                            >
                                                                                Reativar Acesso
                                                                            </button>
                                                                        ) : (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setSelectedUserForAction(u);
                                                                                    setSuspensionReasonInput('');
                                                                                    setIsSuspendModalOpen(true);
                                                                                }}
                                                                                className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors"
                                                                                title="Impedir temporariamente o acesso do utilizador"
                                                                            >
                                                                                Suspender
                                                                            </button>
                                                                        )}

                                                                        {isUserPaid ? (
                                                                            <span
                                                                                className="px-2 py-1 rounded-md text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 flex items-center gap-1 cursor-help"
                                                                                title="Protegido: Contas com subscrição contratada ativa não podem ser apagadas diretamente. Cancele o plano primeiro."
                                                                            >
                                                                                <ShieldAlert size={12} className="text-amber-600" />
                                                                                <span>Plano Pago</span>
                                                                            </span>
                                                                        ) : hasActiveProjects ? (
                                                                            <span
                                                                                className="px-2 py-1 rounded-md text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 flex items-center gap-1 cursor-help"
                                                                                title={`Protegido: Empresa responsável por ${userProjects.length} obra(s) ativa(s). A eliminação deste utilizador destruiria a obra.`}
                                                                            >
                                                                                <ShieldAlert size={12} className="text-blue-600" />
                                                                                <span>Obra Ativa</span>
                                                                            </span>
                                                                        ) : (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setSelectedUserForAction(u);
                                                                                    setDeleteGdprMode('anonymize');
                                                                                    setDeleteGdprReason('Exercício do Direito ao Apagamento (Artigo 17.º RGPD)');
                                                                                    setIsDeleteGdprModalOpen(true);
                                                                                }}
                                                                                className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors"
                                                                                title="Eliminar dados pessoais ao abrigo do RGPD"
                                                                            >
                                                                                Eliminar (RGPD)
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Informative GDPR & Safety Legislation Card */}
                            <div className="bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-800 p-5 text-xs text-[var(--text-muted)] space-y-2">
                                <h4 className="font-bold text-[var(--text)] flex items-center gap-2">
                                    <ShieldAlert size={16} className="text-purple-600" />
                                    Enquadramento Legal: RGPD & Conservação de Dados de SST
                                </h4>
                                <p>
                                    <strong>Princípio da Limitação da Conservação (Art. 5.º, n.º 1, al. e) do RGPD):</strong> Os dados pessoais de utilizadores que permaneçam sem atividade prolongada (&gt; 1 ano) e sem obras em curso devem ser propostos para expurgo ou anonimização.
                                </p>
                                <p>
                                    <strong>Direito ao Apagamento (Art. 17.º do RGPD):</strong> O titular dos dados pode solicitar o apagamento dos seus dados a qualquer momento.
                                </p>
                                <p>
                                    <strong>Salvaguarda Jurídica em Obra (Art. 17.º, n.º 3, al. b) do RGPD &amp; Lei n.º 102/2009):</strong> Para cumprimento de obrigações legais no âmbito da Segurança e Saúde no Trabalho e fiscalização da ACT, relatórios de acidentes, termos de abertura e registos de controlo de acessos devem ser mantidos durante o prazo legal obrigatório (5 a 10 anos). Nestes casos, a opção <em>Anonimizar</em> remove os dados identificativos pessoais sem invalidar a conformidade técnica dos registos históricos da obra.
                                </p>
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
                    title="Subscrição e Upgrade de Plano"
                    isOpen={isUpgradeModalOpen} 
                    onClose={() => setIsUpgradeModalOpen(false)}
                >
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                                Escolha o Plano Pretendido
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                {[
                                    {
                                        id: 'basic' as PlanType,
                                        name: 'Básico',
                                        badge: '1 Obra',
                                        members: 'Até 5 colaboradores',
                                        desc: 'Para pequenas equipas',
                                    },
                                    {
                                        id: 'premium' as PlanType,
                                        name: 'Premium',
                                        badge: '3 Obras',
                                        members: 'Até 10 colaboradores',
                                        desc: 'CDE e IA avançados',
                                        recommended: true,
                                    },
                                    {
                                        id: 'enterprise' as PlanType,
                                        name: 'Enterprise',
                                        badge: 'Ilimitado',
                                        members: 'Até 50 colaboradores',
                                        desc: 'Grandes empreitadas',
                                    },
                                ].map((p) => {
                                    const isSelected = selectedUpgradePlan === p.id;
                                    return (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => setSelectedUpgradePlan(p.id)}
                                            className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                                                isSelected
                                                    ? 'border-primary bg-primary/10 ring-2 ring-primary/40 shadow-sm'
                                                    : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-primary/50'
                                            }`}
                                        >
                                            {p.recommended && (
                                                <span className="absolute -top-2 right-2 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-primary text-white uppercase tracking-wider shadow-sm">
                                                    Recomendado
                                                </span>
                                            )}
                                            <div>
                                                <div className="flex items-center justify-between">
                                                    <span className="font-extrabold text-xs text-[var(--text)]">{p.name}</span>
                                                    <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-[var(--bg-input)] text-primary">
                                                        {p.badge}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-[var(--text-muted)] mt-1">{p.desc}</p>
                                            </div>
                                            <div className="mt-2.5 pt-2 border-t border-[var(--border)] text-[10px] font-medium text-[var(--text-muted)]">
                                                {p.members}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-primary uppercase">Plano Selecionado</span>
                                <span className="text-xs font-bold text-[var(--text)] uppercase">{selectedUpgradePlan}</span>
                            </div>
                            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
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

                {/* ════════ MODAL: SUSPENDER ACESSO TEMPORÁRIO ════════ */}
                <Modal
                    title="Suspender Acesso Temporário"
                    isOpen={isSuspendModalOpen}
                    onClose={() => {
                        setIsSuspendModalOpen(false);
                        setSelectedUserForAction(null);
                    }}
                >
                    <div className="space-y-4">
                        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
                            <Ban className="text-amber-600 shrink-0 mt-0.5" size={18} />
                            <div className="text-xs text-amber-950 dark:text-amber-200">
                                <strong>Atenção:</strong> O utilizador <strong>{selectedUserForAction?.name}</strong> ({selectedUserForAction?.email}) ficará imediatamente impedido de iniciar sessão na plataforma até que seja reativado.
                            </div>
                        </div>

                        <InputGroup label="Motivo da Suspensão Temporária (Opcional)">
                            <textarea
                                className="w-full p-2.5 text-xs border border-gray-300 dark:border-[#444746] rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                                rows={3}
                                placeholder="ex: Auditoria interna, pagamento pendente, ausência temporária..."
                                value={suspensionReasonInput}
                                onChange={e => setSuspensionReasonInput(e.target.value)}
                            />
                        </InputGroup>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <SecondaryButton
                                onClick={() => {
                                    setIsSuspendModalOpen(false);
                                    setSelectedUserForAction(null);
                                }}
                                className="text-xs"
                            >
                                Cancelar
                            </SecondaryButton>
                            <button
                                type="button"
                                disabled={isProcessingAction}
                                onClick={handleConfirmSuspend}
                                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50"
                            >
                                {isProcessingAction ? 'A processar...' : 'Confirmar Suspensão'}
                            </button>
                        </div>
                    </div>
                </Modal>

                {/* ════════ MODAL: ELIMINAR UTILIZADOR (RGPD) ════════ */}
                {(() => {
                    const selectedUserAccount = selectedUserForAction ? accounts.find(a => a.id === selectedUserForAction.accountId) : null;
                    const isSelectedUserPaid = selectedUserAccount ? selectedUserAccount.plan !== 'free' : (selectedUserForAction?.isPaidPlan ?? false);
                    const selectedUserProjects = selectedUserForAction ? projects.filter(p => p.accountId === selectedUserForAction.accountId) : [];
                    const isSelectedUserProjectOwner = selectedUserProjects.length > 0 || (selectedUserForAction?.hasActiveProjects ?? false);
                    const isDeletionBlocked = isSelectedUserPaid || isSelectedUserProjectOwner;

                    return (
                        <Modal
                            title="Eliminar Utilizador (Direito ao Esquecimento RGPD)"
                            isOpen={isDeleteGdprModalOpen}
                            onClose={() => {
                                setIsDeleteGdprModalOpen(false);
                                setSelectedUserForAction(null);
                            }}
                        >
                            <div className="space-y-4">
                                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 flex items-start gap-3">
                                    <Trash2 className="text-rose-600 shrink-0 mt-0.5" size={18} />
                                    <div className="text-xs text-rose-950 dark:text-rose-200">
                                        Está prestes a aplicar o direito ao apagamento ao utilizador <strong>{selectedUserForAction?.name}</strong> ({selectedUserForAction?.email}).
                                    </div>
                                </div>

                                {isSelectedUserPaid && (
                                    <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 flex items-start gap-3">
                                        <ShieldAlert className="text-amber-600 shrink-0 mt-0.5" size={18} />
                                        <div className="text-xs text-amber-950 dark:text-amber-200 leading-relaxed">
                                            <strong>Ação Bloqueada — Subscrição Paga Ativa:</strong> Este utilizador pertence à empresa <strong>{selectedUserAccount?.name}</strong> com plano contratado ({selectedUserAccount?.plan?.toUpperCase()}). Contas pagas estão protegidas contra apagamento direto. Cancele ou altere o plano para Gratuito na Gestão de Clientes se pretender rescindir o serviço antes de apagar.
                                        </div>
                                    </div>
                                )}

                                {isSelectedUserProjectOwner && (
                                    <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-300 dark:border-blue-700 flex items-start gap-3">
                                        <ShieldAlert className="text-blue-600 shrink-0 mt-0.5" size={18} />
                                        <div className="text-xs text-blue-950 dark:text-blue-200 leading-relaxed">
                                            <strong>Ação Bloqueada — Responsável por Obras Ativas:</strong> Este utilizador/empresa é proprietário de {selectedUserProjects.length} obra(s) em curso ({selectedUserProjects.map(p => `"${p.name}"`).join(', ')}). A eliminação deste utilizador destruiria a obra. A titularidade da obra deve ser transferida ou o projeto arquivado antes do apagamento.
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-[var(--text)] block">
                                        Método de Apagamento:
                                    </label>

                                    <div 
                                        onClick={() => setDeleteGdprMode('anonymize')}
                                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                                            deleteGdprMode === 'anonymize'
                                                ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/30 ring-1 ring-purple-600'
                                                : 'border-[var(--border)] hover:bg-[var(--bg-input)]'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-xs text-[var(--text)] flex items-center gap-1.5">
                                                <CheckCircle2 size={14} className={deleteGdprMode === 'anonymize' ? 'text-purple-600' : 'text-gray-400'} />
                                                Anonimização Segura (Recomendado SST)
                                            </span>
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
                                                Art. 17.º, n.º 3, al. b) RGPD
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-[var(--text-muted)] mt-1 pl-5 leading-relaxed">
                                            Substitui nome por &quot;Utilizador Removido (RGPD)&quot;, anonimiza o e-mail, apaga credenciais e remove acessos. Preserva a validade de relatórios de acidentes e segurança de obra obrigatórios por lei (Lei n.º 102/2009).
                                        </p>
                                    </div>

                                    <div 
                                        onClick={() => setDeleteGdprMode('purge')}
                                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                                            deleteGdprMode === 'purge'
                                                ? 'border-rose-600 bg-rose-50/50 dark:bg-rose-950/30 ring-1 ring-rose-600'
                                                : 'border-[var(--border)] hover:bg-[var(--bg-input)]'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-xs text-[var(--text)] flex items-center gap-1.5">
                                                <CheckCircle2 size={14} className={deleteGdprMode === 'purge' ? 'text-rose-600' : 'text-gray-400'} />
                                                Purga Total Definitiva (Hard Delete)
                                            </span>
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
                                                Eliminação Total
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-[var(--text-muted)] mt-1 pl-5 leading-relaxed">
                                            Elimina de forma permanente o registo do utilizador da base de dados. (Aplicável apenas se o utilizador não tiver relatórios legais vinculados).
                                        </p>
                                    </div>
                                </div>

                                <InputGroup label="Motivo / Fundamento do Pedido">
                                    <input
                                        type="text"
                                        className="w-full p-2.5 text-xs border border-gray-300 dark:border-[#444746] rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
                                        value={deleteGdprReason}
                                        onChange={e => setDeleteGdprReason(e.target.value)}
                                    />
                                </InputGroup>

                                <div className="flex items-center justify-end gap-3 pt-2">
                                    <SecondaryButton
                                        onClick={() => {
                                            setIsDeleteGdprModalOpen(false);
                                            setSelectedUserForAction(null);
                                        }}
                                        className="text-xs"
                                    >
                                        Cancelar
                                    </SecondaryButton>
                                    <button
                                        type="button"
                                        disabled={isDeletionBlocked || isProcessingAction}
                                        onClick={handleConfirmDeleteGdpr}
                                        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        {isProcessingAction ? 'A processar...' : 'Confirmar Apagamento RGPD'}
                                    </button>
                                </div>
                            </div>
                        </Modal>
                    );
                })()}

                {/* ════════ MODAL: LIMPEZA POR INATIVIDADE RGPD ════════ */}
                <Modal
                    title="Auditoria & Limpeza por Inatividade (RGPD)"
                    isOpen={isCleanupModalOpen}
                    onClose={() => setIsCleanupModalOpen(false)}
                >
                    <div className="space-y-4">
                        <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 flex items-start gap-3">
                            <Info className="text-purple-600 shrink-0 mt-0.5" size={18} />
                            <div className="text-xs text-purple-950 dark:text-purple-200 leading-relaxed">
                                <strong>Princípio da Limitação da Conservação:</strong> O Artigo 5.º, n.º 1, al. e) do RGPD determina que os dados pessoais não devem ser retidos por períodos excessivos sem utilidade contratual ou legal.
                            </div>
                        </div>

                        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-900 dark:text-emerald-200 flex items-start gap-2">
                            <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                                <strong>Algoritmo de Blindagem Ativo:</strong> Subscrições pagas (Básico, Premium, Enterprise) e contas criadoras de obras ativas estão <strong>totalmente salvaguardadas</strong> e nunca serão afetadas por esta rotina. A limpeza incide estritamente sobre contas gratuitas sem obras ativas.
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-[var(--text)] block">
                                Ponto de Corte de Inatividade:
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setCleanupThresholdDays(90)}
                                    className={`p-2.5 rounded-xl border text-center transition-all ${
                                        cleanupThresholdDays === 90
                                            ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 font-bold'
                                            : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]'
                                    }`}
                                >
                                    <div className="text-xs">90 dias</div>
                                    <div className="text-[10px] opacity-75">3 meses</div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCleanupThresholdDays(180)}
                                    className={`p-2.5 rounded-xl border text-center transition-all ${
                                        cleanupThresholdDays === 180
                                            ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 font-bold'
                                            : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]'
                                    }`}
                                >
                                    <div className="text-xs">180 dias</div>
                                    <div className="text-[10px] opacity-75">6 meses</div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCleanupThresholdDays(365)}
                                    className={`p-2.5 rounded-xl border text-center transition-all ${
                                        cleanupThresholdDays === 365
                                            ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 font-bold'
                                            : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]'
                                    }`}
                                >
                                    <div className="text-xs">365 dias</div>
                                    <div className="text-[10px] opacity-75">1 ano (RGPD)</div>
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-[var(--text)] block">
                                Ação a Aplicar aos Inativos:
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setCleanupMode('suspend')}
                                    className={`p-2.5 rounded-xl border text-left transition-all ${
                                        cleanupMode === 'suspend'
                                            ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-bold'
                                            : 'border-[var(--border)] text-[var(--text-muted)]'
                                    }`}
                                >
                                    <div className="text-xs font-bold">Suspender Acesso</div>
                                    <div className="text-[10px] font-normal opacity-80 mt-0.5">Impedir acesso temporário mas manter dados</div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCleanupMode('anonymize')}
                                    className={`p-2.5 rounded-xl border text-left transition-all ${
                                        cleanupMode === 'anonymize'
                                            ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 font-bold'
                                            : 'border-[var(--border)] text-[var(--text-muted)]'
                                    }`}
                                >
                                    <div className="text-xs font-bold">Anonimizar RGPD</div>
                                    <div className="text-[10px] font-normal opacity-80 mt-0.5">Remover dados pessoais identificáveis</div>
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <SecondaryButton onClick={() => setIsCleanupModalOpen(false)} className="text-xs">
                                Cancelar
                            </SecondaryButton>
                            <button
                                type="button"
                                disabled={isProcessingAction}
                                onClick={handleConfirmCleanup}
                                className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50"
                            >
                                {isProcessingAction ? 'A processar limpeza...' : `Executar Limpeza (${cleanupThresholdDays}d)`}
                            </button>
                        </div>
                    </div>
                </Modal>
            </div>
        </AuthGuard>
    );
}
