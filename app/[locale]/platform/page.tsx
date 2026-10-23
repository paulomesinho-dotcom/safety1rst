'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { 
    ArrowLeft, Shield, Plus, Building2, CheckCircle2, Clock, 
    XCircle, Mail, Phone, UserCheck, AlertTriangle, Inbox, Check, 
    X, FileText, User as UserIcon, Loader2, Sparkles, RotateCw, 
    Folder, Search, Users, Trash2, Ban, Lock, DollarSign, Settings,
    SlidersHorizontal, KeyRound, ExternalLink, ShieldAlert
} from 'lucide-react';
import { Modal, InputGroup, PrimaryButton, SecondaryButton } from '@/components/Modal';
import { cn } from '@/lib/utils';
import { nanoid } from 'nanoid';
import type { PlanType, Account, User, SubscriptionRequest, PlatformPlan, Project } from '@/types';
import AuthGuard from '@/components/AuthGuard';

type PlatformTab = 'projects' | 'requests' | 'accounts' | 'users' | 'plans';

export default function PlatformDashboardPage() {
    const router = useRouter();
    const accounts = useStore(state => state.accounts);
    const users = useStore(state => state.users);
    const projects = useStore(state => state.projects);
    const addAccount = useStore(state => state.addAccount);
    const addUser = useStore(state => state.addUser);
    const updateAccount = useStore(state => state.updateAccount);
    const currentUser = useStore(state => state.currentUser);
    const isInitialized = useStore(state => state.isInitialized);

    const storeRequests = useStore(state => state.subscriptionRequests);
    const approveSubscriptionRequest = useStore(state => state.approveSubscriptionRequest);
    const rejectSubscriptionRequest = useStore(state => state.rejectSubscriptionRequest);
    const suspendUser = useStore(state => state.suspendUser);
    const reactivateUser = useStore(state => state.reactivateUser);
    const deleteUserGdpr = useStore(state => state.deleteUserGdpr);
    const platformPlans = useStore(state => state.platformPlans);
    const updatePlatformPlan = useStore(state => state.updatePlatformPlan);
    const resetPlatformPlans = useStore(state => state.resetPlatformPlans);
    const syncFromServer = useStore(state => state.syncFromServer);

    // State declarations
    const [activeTab, setActiveTab] = useState<PlatformTab>('projects');
    const [serverRequests, setServerRequests] = useState<SubscriptionRequest[]>([]);
    const [isLoadingRequests, setIsLoadingRequests] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Search filters
    const [projectSearch, setProjectSearch] = useState('');
    const [userSearch, setUserSearch] = useState('');
    const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'superadmin' | 'admin' | 'user'>('all');

    // Modals
    const [isCreateAccountOpen, setIsCreateAccountOpen] = useState(false);
    const [isEditAccountOpen, setIsEditAccountOpen] = useState(false);
    const [editAccount, setEditAccount] = useState<Account | null>(null);

    const [isCreateAdminOpen, setIsCreateAdminOpen] = useState(false);
    const [newAdminData, setNewAdminData] = useState({ name: '', email: '', password: '' });
    const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);

    const [isEditPlanOpen, setIsEditPlanOpen] = useState(false);
    const [editPlan, setEditPlan] = useState<PlatformPlan | null>(null);
    const [editPlanFeaturesText, setEditPlanFeaturesText] = useState('');
    const [isSavingPlan, setIsSavingPlan] = useState(false);

    const [newAccount, setNewAccount] = useState({
        name: '',
        plan: 'free' as PlanType,
        adminName: '',
        adminEmail: '',
        adminPassword: ''
    });

    const isSuperAdmin = currentUser?.role === 'superadmin';
    const isPlatformAdmin = isSuperAdmin || currentUser?.role === 'admin';

    // Fetch subscription requests from server database
    const fetchRequests = async () => {
        setIsLoadingRequests(true);
        try {
            const res = await fetch('/api/platform/requests');
            const data = await res.json();
            if (data.success && Array.isArray(data.requests)) {
                setServerRequests(data.requests);
            }
        } catch (err) {
            console.error('[Platform] Erro ao carregar pedidos da API:', err);
        } finally {
            setIsLoadingRequests(false);
        }
    };

    useEffect(() => {
        fetchRequests();
        syncFromServer().catch(() => {});
    }, []);

    // Merge server requests and local store requests without duplicate IDs
    const allRequestsMap = new Map<string, SubscriptionRequest>();
    serverRequests.forEach(r => allRequestsMap.set(r.id, r));
    storeRequests.forEach(r => {
        if (!allRequestsMap.has(r.id)) {
            allRequestsMap.set(r.id, r);
        }
    });
    const subscriptionRequests = Array.from(allRequestsMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const pendingCount = subscriptionRequests.filter(r => r.status === 'pending_approval' || r.status === 'pending_email').length;

    // Filtered Projects across the entire platform
    const filteredProjects = useMemo(() => {
        const query = projectSearch.toLowerCase().trim();
        return projects.filter(p => {
            const clientAcc = accounts.find(a => a.id === p.accountId);
            const matchesQuery = !query || 
                p.name.toLowerCase().includes(query) ||
                (p.code || '').toLowerCase().includes(query) ||
                (p.address || '').toLowerCase().includes(query) ||
                (clientAcc?.name || '').toLowerCase().includes(query);
            return matchesQuery;
        });
    }, [projects, accounts, projectSearch]);

    // Filtered Users
    const filteredUsers = useMemo(() => {
        const query = userSearch.toLowerCase().trim();
        return users.filter(u => {
            const matchesRole = userRoleFilter === 'all' || 
                (userRoleFilter === 'superadmin' && u.role === 'superadmin') ||
                (userRoleFilter === 'admin' && u.role === 'admin') ||
                (userRoleFilter === 'user' && u.role !== 'superadmin' && u.role !== 'admin');
            
            const matchesQuery = !query ||
                u.name.toLowerCase().includes(query) ||
                u.email.toLowerCase().includes(query);

            return matchesRole && matchesQuery;
        });
    }, [users, userRoleFilter, userSearch]);

    const handleApprove = async (req: SubscriptionRequest) => {
        setProcessingId(req.id);
        try {
            approveSubscriptionRequest(req.id, currentUser?.name || 'Super Admin');
            await fetch(`/api/platform/requests/${req.id}/approve`, {
                method: 'POST',
            }).catch(() => {});

            setServerRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'approved', reviewedAt: new Date().toISOString() } : r));
            setFeedback({
                type: 'success',
                message: `Conta de "${req.companyName}" aprovada com sucesso! Cliente ativado e notificado.`
            });
            setTimeout(() => setFeedback(null), 5000);
        } catch (err: any) {
            setFeedback({ type: 'error', message: 'Erro ao aprovar pedido.' });
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (req: SubscriptionRequest) => {
        if (!confirm(`Tem a certeza que deseja rejeitar o pedido de "${req.companyName}"?`)) return;

        setProcessingId(req.id);
        try {
            rejectSubscriptionRequest(req.id, 'Pedido não validado pela administração.');
            await fetch(`/api/platform/requests/${req.id}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: 'Pedido não validado pela administração.' }),
            }).catch(() => {});

            setServerRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'rejected' } : r));
            setFeedback({
                type: 'success',
                message: `Pedido de "${req.companyName}" foi marcado como rejeitado.`
            });
            setTimeout(() => setFeedback(null), 4000);
        } catch (err: any) {
            setFeedback({ type: 'error', message: 'Erro ao rejeitar pedido.' });
        } finally {
            setProcessingId(null);
        }
    };

    // Criar novo Administrador da Plataforma (apenas Super Admin pode fazer)
    const handleCreateAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isSuperAdmin) {
            alert('Apenas o Super Administrador pode criar outros Administradores.');
            return;
        }

        setIsCreatingAdmin(true);
        try {
            const res = await fetch('/api/platform/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newAdminData.name,
                    email: newAdminData.email,
                    password: newAdminData.password,
                    role: 'admin',
                    status: 'active'
                }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                addUser({
                    id: data.user.id,
                    name: newAdminData.name,
                    email: newAdminData.email,
                    role: 'admin',
                    accountId: currentUser.accountId || 'acc_platform',
                    password: newAdminData.password,
                    projectAccess: []
                });
                setIsCreateAdminOpen(false);
                setNewAdminData({ name: '', email: '', password: '' });
                setFeedback({ type: 'success', message: `Administrador "${newAdminData.name}" criado com sucesso!` });
                setTimeout(() => setFeedback(null), 4000);
            } else {
                alert(data.error || 'Erro ao criar administrador.');
            }
        } catch (err: any) {
            alert('Falha na comunicação com o servidor ao criar administrador.');
        } finally {
            setIsCreatingAdmin(false);
        }
    };

    // Suspender / Reativar Utilizador
    const handleToggleUserStatus = async (user: User) => {
        const isTargetAdmin = user.role === 'admin' || user.role === 'superadmin';
        if (isTargetAdmin && !isSuperAdmin) {
            alert('Apenas o Super Administrador pode suspender ou alterar o estado de outros Administradores.');
            return;
        }

        if (user.status === 'suspended') {
            await reactivateUser(user.id);
            setFeedback({ type: 'success', message: `Utilizador ${user.name} reativado com sucesso.` });
        } else {
            if (!confirm(`Deseja suspender temporariamente o acesso de ${user.name}?`)) return;
            await suspendUser(user.id, 'Suspensão pelo Gestor da Plataforma');
            setFeedback({ type: 'success', message: `Utilizador ${user.name} suspenso com sucesso.` });
        }
        setTimeout(() => setFeedback(null), 4000);
    };

    // Eliminar Utilizador (RGPD)
    const handleDeleteUser = async (user: User) => {
        const isTargetAdmin = user.role === 'admin' || user.role === 'superadmin';
        if (isTargetAdmin && !isSuperAdmin) {
            alert('Permissão Negada: Apenas o Super Administrador pode eliminar Administradores da plataforma.');
            return;
        }

        if (!confirm(`Tem a certeza que deseja eliminar o utilizador "${user.name}" (${user.email})?`)) return;

        const res = await deleteUserGdpr(user.id, 'anonymize', 'Eliminado pelo Gestor da Plataforma');
        if (res.success) {
            setFeedback({ type: 'success', message: res.message || 'Utilizador removido com sucesso.' });
        } else {
            alert(res.message || 'Erro ao remover utilizador.');
        }
        setTimeout(() => setFeedback(null), 5000);
    };

    // Guardar Edição de Plano da Plataforma
    const handleSavePlan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editPlan) return;

        setIsSavingPlan(true);
        try {
            const features = editPlanFeaturesText
                .split('\n')
                .map(f => f.trim())
                .filter(f => f.length > 0);

            const updates: Partial<PlatformPlan> = {
                name: editPlan.name,
                price: editPlan.price,
                billingPeriod: editPlan.billingPeriod,
                description: editPlan.description,
                maxProjects: Number(editPlan.maxProjects),
                maxUsers: Number(editPlan.maxUsers),
                maxJoinedProjects: Number(editPlan.maxJoinedProjects),
                isPopular: editPlan.isPopular,
                features
            };

            const res = await updatePlatformPlan(editPlan.id, updates);
            if (res.success) {
                setIsEditPlanOpen(false);
                setFeedback({ type: 'success', message: `Plano ${editPlan.name} atualizado! A página de subscrições já reflete os novos dados.` });
                setTimeout(() => setFeedback(null), 5000);
            }
        } finally {
            setIsSavingPlan(false);
        }
    };

    const handleOpenEditPlan = (plan: PlatformPlan) => {
        setEditPlan({ ...plan });
        setEditPlanFeaturesText((plan.features || []).join('\n'));
        setIsEditPlanOpen(true);
    };

    const handleResetPlans = async () => {
        if (!confirm('Tem a certeza que deseja repor todos os planos e preços para os valores de fábrica padrão?')) return;
        const res = await resetPlatformPlans();
        if (res.success) {
            setFeedback({ type: 'success', message: 'Planos repostos para os valores padrão com sucesso!' });
            setTimeout(() => setFeedback(null), 4000);
        }
    };

    // Criar Nova Conta de Cliente Manual
    const handleCreateAccount = (e: React.FormEvent) => {
        e.preventDefault();
        const accountId = nanoid();

        let maxProjects = 1;
        let accessLimit = 1200;
        if (newAccount.plan === 'premium') {
            maxProjects = 3;
            accessLimit = 3600;
        } else if (newAccount.plan === 'enterprise') {
            maxProjects = -1;
            accessLimit = -1;
        }

        addAccount({
            // @ts-ignore
            id: accountId,
            name: newAccount.name,
            plan: newAccount.plan,
            maxProjects,
            accessControlLimit: accessLimit,
            subscriptionStatus: 'active',
            modules: [],
        });

        addUser({
            name: newAccount.adminName,
            email: newAccount.adminEmail,
            role: 'client_admin',
            accountId: accountId,
            password: newAccount.adminPassword || '123456',
            projectAccess: []
        });

        setIsCreateAccountOpen(false);
        setNewAccount({ name: '', plan: 'free', adminName: '', adminEmail: '', adminPassword: '' });
        setFeedback({ type: 'success', message: `Conta "${newAccount.name}" criada com sucesso.` });
        setTimeout(() => setFeedback(null), 4000);
    };

    // Guardar Edição de Conta de Cliente
    const handleEditAccountSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (editAccount) {
            updateAccount(editAccount.id, {
                plan: editAccount.plan,
                maxProjects: editAccount.maxProjects,
                accessControlLimit: editAccount.accessControlLimit,
                subscriptionStatus: editAccount.subscriptionStatus
            });
            setIsEditAccountOpen(false);
            setFeedback({ type: 'success', message: `Configurações da conta "${editAccount.name}" atualizadas.` });
            setTimeout(() => setFeedback(null), 3000);
        }
    };

    // Verificações de Acesso
    if (!isInitialized) {
        return (
            <div className="min-h-screen bg-background flex flex-col justify-center items-center p-8">
                <Shield className="w-12 h-12 text-primary animate-pulse mb-3" />
                <p className="text-sm text-gray-500">A carregar Workplace da Plataforma...</p>
            </div>
        );
    }

    if (!currentUser) {
        return (
            <AuthGuard>
                <div className="min-h-screen bg-background flex flex-col justify-center items-center p-8">
                    <Shield className="w-12 h-12 text-primary animate-pulse mb-3" />
                    <p className="text-sm text-gray-500">A verificar sessão...</p>
                </div>
            </AuthGuard>
        );
    }

    if (!isPlatformAdmin) {
        return (
            <div className="min-h-screen bg-background flex flex-col justify-center items-center p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center text-amber-600 mb-4 border border-amber-200 dark:border-amber-900/50">
                    <ShieldAlert className="w-8 h-8" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Acesso Restrito</h2>
                <p className="text-sm text-gray-500 max-w-sm mt-1 mb-6">
                    Esta área é reservada exclusivamente para Administradores da plataforma Safety1irst.
                </p>
                <button
                    onClick={() => router.push('/')}
                    className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                    Voltar ao Meu Workplace Normal
                </button>
            </div>
        );
    }

    return (
        <AuthGuard>
            <div className="min-h-screen bg-background flex flex-col text-content-text">
                {/* ── Top Bar Gestor da Plataforma ── */}
                <header className="bg-[var(--bg-card)] border-b border-[var(--border)] px-6 sm:px-8 py-3.5 flex items-center justify-between shadow-sm sticky top-0 z-[100]">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => router.push('/')} 
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-input)] text-xs font-semibold text-[var(--text)] transition-colors"
                        >
                            <ArrowLeft size={16} />
                            <span>Meu Workplace Normal</span>
                        </button>
                        <div className="h-6 w-px bg-[var(--border)] hidden sm:block" />
                        <div>
                            <h1 className="text-base sm:text-lg font-bold text-[var(--text)] flex items-center gap-2">
                                <Shield size={18} className="text-primary" />
                                <span>Workplace do Gestor da Plataforma</span>
                                <span className={cn(
                                    "text-[10px] uppercase font-black px-2 py-0.5 rounded-full tracking-wider border",
                                    isSuperAdmin 
                                        ? "bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800"
                                        : "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800"
                                )}>
                                    {isSuperAdmin ? 'Super Admin' : 'Admin'}
                                </span>
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetchRequests}
                            disabled={isLoadingRequests}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-input)] text-xs font-medium text-[var(--text)] transition-colors shadow-sm disabled:opacity-50"
                            title="Atualizar dados do servidor"
                        >
                            <RotateCw size={13} className={isLoadingRequests ? "animate-spin text-primary" : ""} />
                            <span className="hidden sm:inline">Sincronizar</span>
                        </button>
                        <div className="text-right hidden sm:block">
                            <span className="block text-xs font-bold text-[var(--text)]">{currentUser.name}</span>
                            <span className="block text-[11px] text-[var(--text-muted)]">{currentUser.email}</span>
                        </div>
                    </div>
                </header>

                {/* ── Main Container ── */}
                <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6">
                    {/* Feedback message banner */}
                    {feedback && (
                        <div className={cn(
                            "p-4 rounded-xl border flex items-center justify-between animate-in fade-in duration-200",
                            feedback.type === 'success'
                                ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 text-emerald-800 dark:text-emerald-300"
                                : "bg-red-50 dark:bg-red-950/30 border-red-200 text-red-800 dark:text-red-300"
                        )}>
                            <div className="flex items-center gap-3">
                                {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                                <span className="text-sm font-medium">{feedback.message}</span>
                            </div>
                            <button onClick={() => setFeedback(null)} className="text-sm hover:opacity-75">
                                <X size={16} />
                            </button>
                        </div>
                    )}

                    {/* Navigation Tabs */}
                    <div className="flex overflow-x-auto border-b border-[var(--border)] gap-2 sm:gap-6 pb-px scrollbar-none">
                        <button
                            onClick={() => setActiveTab('projects')}
                            className={cn(
                                "pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-colors relative",
                                activeTab === 'projects'
                                    ? "text-primary border-b-2 border-primary"
                                    : "text-[var(--text-muted)] hover:text-[var(--text)]"
                            )}
                        >
                            <Folder size={17} />
                            <span>Todas as Obras</span>
                            <span className="px-2 py-0.5 rounded-full text-[11px] bg-[var(--bg-input)] text-[var(--text-muted)] font-semibold">
                                {projects.length}
                            </span>
                        </button>

                        <button
                            onClick={() => setActiveTab('requests')}
                            className={cn(
                                "pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-colors relative",
                                activeTab === 'requests'
                                    ? "text-primary border-b-2 border-primary"
                                    : "text-[var(--text-muted)] hover:text-[var(--text)]"
                            )}
                        >
                            <Inbox size={17} />
                            <span>Pedidos de Registo</span>
                            {pendingCount > 0 && (
                                <span className="px-2 py-0.5 rounded-full text-[11px] bg-amber-500 text-white font-black animate-pulse">
                                    {pendingCount}
                                </span>
                            )}
                        </button>

                        <button
                            onClick={() => setActiveTab('accounts')}
                            className={cn(
                                "pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-colors relative",
                                activeTab === 'accounts'
                                    ? "text-primary border-b-2 border-primary"
                                    : "text-[var(--text-muted)] hover:text-[var(--text)]"
                            )}
                        >
                            <Building2 size={17} />
                            <span>Clientes & Subscrições</span>
                            <span className="px-2 py-0.5 rounded-full text-[11px] bg-[var(--bg-input)] text-[var(--text-muted)] font-semibold">
                                {accounts.length}
                            </span>
                        </button>

                        <button
                            onClick={() => setActiveTab('users')}
                            className={cn(
                                "pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-colors relative",
                                activeTab === 'users'
                                    ? "text-primary border-b-2 border-primary"
                                    : "text-[var(--text-muted)] hover:text-[var(--text)]"
                            )}
                        >
                            <Users size={17} />
                            <span>Utilizadores & Administradores</span>
                            <span className="px-2 py-0.5 rounded-full text-[11px] bg-[var(--bg-input)] text-[var(--text-muted)] font-semibold">
                                {users.length}
                            </span>
                        </button>

                        <button
                            onClick={() => setActiveTab('plans')}
                            className={cn(
                                "pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-colors relative",
                                activeTab === 'plans'
                                    ? "text-primary border-b-2 border-primary"
                                    : "text-[var(--text-muted)] hover:text-[var(--text)]"
                            )}
                        >
                            <DollarSign size={17} />
                            <span>Planos & Preçário</span>
                        </button>
                    </div>

                    {/* ════════ TAB 1: TODAS AS OBRAS DA PLATAFORMA ════════ */}
                    {activeTab === 'projects' && (
                        <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-xl font-bold text-[var(--text)]">Todas as Obras da Plataforma</h2>
                                    <p className="text-xs text-[var(--text-muted)] mt-1">
                                        Supervisão global de todos os estaleiros e projetos ativos criados por clientes no Safety1irst.
                                    </p>
                                </div>
                                <div className="relative w-full sm:w-72">
                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                                    <input
                                        type="text"
                                        placeholder="Pesquisar por nome, código, cliente..."
                                        value={projectSearch}
                                        onChange={e => setProjectSearch(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-xs focus:ring-2 focus:ring-primary/20 outline-none"
                                    />
                                </div>
                            </div>

                            {filteredProjects.length === 0 ? (
                                <div className="bg-[var(--bg-card)] rounded-2xl p-12 text-center border border-[var(--border)] shadow-sm">
                                    <Folder className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3 opacity-40" />
                                    <h3 className="text-sm font-bold text-[var(--text)]">Nenhuma obra encontrada</h3>
                                    <p className="text-xs text-[var(--text-muted)] mt-1">
                                        {projectSearch ? 'Ajuste os termos de pesquisa.' : 'Ainda não existem obras criadas na plataforma.'}
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {filteredProjects.map(project => {
                                        const clientAcc = accounts.find(a => a.id === project.accountId);
                                        return (
                                            <div
                                                key={project.id}
                                                className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-5 shadow-sm hover:border-primary/40 transition-all flex flex-col justify-between gap-4"
                                            >
                                                <div>
                                                    <div className="flex items-start justify-between gap-2 mb-2">
                                                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                                            <Folder size={20} />
                                                        </div>
                                                        <span className={cn(
                                                            "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                                                            project.status === 'active' 
                                                                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                                                                : "bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 border-gray-200"
                                                        )}>
                                                            {project.status === 'active' ? 'Ativa' : project.status}
                                                        </span>
                                                    </div>

                                                    <h3 className="font-bold text-sm text-[var(--text)] line-clamp-1" title={project.name}>
                                                        {project.name}
                                                    </h3>
                                                    <p className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
                                                        Código: {project.code || 'S/ Código'}
                                                    </p>

                                                    <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-1.5 text-xs text-[var(--text-muted)]">
                                                        <div className="flex items-center justify-between">
                                                            <span>Empresa Cliente:</span>
                                                            <strong className="text-[var(--text)]">{clientAcc?.name || 'Cliente Direto'}</strong>
                                                        </div>
                                                        {project.address && (
                                                            <div className="flex items-center justify-between">
                                                                <span>Localização:</span>
                                                                <span className="text-[var(--text)] truncate max-w-[150px]">{project.address}</span>
                                                            </div>
                                                        )}
                                                        <div className="flex items-center justify-between text-[11px]">
                                                            <span>Criada em:</span>
                                                            <span>{new Date(project.createdAt).toLocaleDateString('pt-PT')}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => router.push(`/project/${project.id}`)}
                                                    className="w-full py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                                                >
                                                    <span>Entrar na Obra (Acesso Gestor)</span>
                                                    <ExternalLink size={13} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ════════ TAB 2: PEDIDOS DE SUBSCRIÇÃO ════════ */}
                    {activeTab === 'requests' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-bold text-[var(--text)]">Pedidos de Registo de Empresas</h2>
                                    <p className="text-xs text-[var(--text-muted)] mt-1">
                                        Analise, aprove ou rejeite novos clientes registados a partir do site exterior.
                                    </p>
                                </div>
                            </div>

                            {subscriptionRequests.length === 0 ? (
                                <div className="bg-[var(--bg-card)] rounded-2xl p-12 text-center border border-[var(--border)] shadow-sm">
                                    <Inbox className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3 opacity-40" />
                                    <h3 className="text-sm font-bold text-[var(--text)]">Nenhum pedido de registo</h3>
                                    <p className="text-xs text-[var(--text-muted)] mt-1 max-w-sm mx-auto">
                                        Quando novas empresas preencherem o formulário no ecrã de entrada, os pedidos aparecerão aqui para aprovação.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4">
                                    {subscriptionRequests.map((req) => {
                                        const isPendingApproval = req.status === 'pending_approval';
                                        const isPendingEmail = req.status === 'pending_email';
                                        const isApproved = req.status === 'approved';
                                        const isRejected = req.status === 'rejected';

                                        return (
                                            <div
                                                key={req.id}
                                                className={cn(
                                                    "bg-[var(--bg-card)] p-6 rounded-2xl shadow-sm border transition-all flex flex-col md:flex-row md:items-center justify-between gap-6",
                                                    isPendingApproval
                                                        ? "border-blue-300 dark:border-blue-800 ring-1 ring-blue-500/10 shadow-md"
                                                        : "border-[var(--border)]"
                                                )}
                                            >
                                                <div className="space-y-3">
                                                    <div className="flex flex-wrap items-center gap-3">
                                                        <h3 className="text-base font-bold text-[var(--text)] flex items-center gap-2">
                                                            <Building2 className="text-primary w-5 h-5 shrink-0" />
                                                            {req.companyName}
                                                        </h3>
                                                        <span className="text-xs text-[var(--text-muted)] font-mono bg-[var(--bg-input)] px-2 py-0.5 rounded">
                                                            NIF: {req.nif}
                                                        </span>
                                                        <span className={cn(
                                                            "px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider",
                                                            req.plan === 'enterprise' ? "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300" :
                                                            req.plan === 'premium' ? "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" :
                                                            "bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-gray-300"
                                                        )}>
                                                            Plano {req.plan}
                                                        </span>

                                                        {isPendingApproval && (
                                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse">
                                                                <CheckCircle2 size={13} /> Aguarda Aprovação
                                                            </span>
                                                        )}
                                                        {isPendingEmail && (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                                                <Clock size={12} /> Email por confirmar
                                                            </span>
                                                        )}
                                                        {isApproved && (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                                                <Check size={12} /> Ativo & Aprovado
                                                            </span>
                                                        )}
                                                        {isRejected && (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                                                <X size={12} /> Rejeitado
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-[var(--text-muted)]">
                                                        <span className="flex items-center gap-1.5 text-[var(--text)] font-medium">
                                                            <UserIcon size={14} className="text-[var(--text-muted)]" /> {req.contactName}
                                                        </span>
                                                        <span className="flex items-center gap-1.5">
                                                            <Mail size={14} className="text-[var(--text-muted)]" /> {req.email}
                                                        </span>
                                                        {req.phone && (
                                                            <span className="flex items-center gap-1.5">
                                                                <Phone size={14} className="text-[var(--text-muted)]" /> {req.phone}
                                                            </span>
                                                        )}
                                                        <span>
                                                            Pedido em: {new Date(req.createdAt).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[var(--border)]">
                                                    {!isApproved && !isRejected ? (
                                                        <>
                                                            <button
                                                                onClick={() => handleApprove(req)}
                                                                disabled={processingId === req.id}
                                                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-sm transition-all disabled:opacity-50"
                                                            >
                                                                {processingId === req.id ? (
                                                                    <Loader2 size={14} className="animate-spin" />
                                                                ) : (
                                                                    <Check size={14} />
                                                                )}
                                                                Aprovar Conta
                                                            </button>

                                                            <button
                                                                onClick={() => handleReject(req)}
                                                                disabled={processingId === req.id}
                                                                className="flex items-center gap-1 px-3 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-medium transition-all"
                                                            >
                                                                <X size={14} /> Rejeitar
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <div className="text-xs text-[var(--text-muted)]">
                                                            {isApproved ? `Aprovado em ${new Date(req.reviewedAt || req.createdAt).toLocaleDateString('pt-PT')}` : 'Pedido arquivado'}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ════════ TAB 3: CONTAS DE CLIENTES & SUBSCRIÇÕES ════════ */}
                    {activeTab === 'accounts' && (
                        <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-xl font-bold text-[var(--text)]">Contas de Clientes & Empresas</h2>
                                    <p className="text-xs text-[var(--text-muted)] mt-1">
                                        Gerir planos de subscrição contratados e limites individuais por cliente.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsCreateAccountOpen(true)}
                                    className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-primary-hover shadow-sm transition-all self-start sm:self-auto"
                                >
                                    <Plus size={16} /> Nova Conta de Cliente
                                </button>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {accounts.map(account => {
                                    const adminUser = users.find(u => u.accountId === account.id && (u.role === 'admin' || u.role === 'superadmin' || u.role === 'client_admin'));
                                    const accountProjects = projects.filter(p => p.accountId === account.id);

                                    return (
                                        <div key={account.id} className="bg-[var(--bg-card)] p-6 rounded-2xl shadow-sm border border-[var(--border)] flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                                    <Building2 size={24} />
                                                </div>
                                                <div>
                                                    <h3 className="text-base font-bold text-[var(--text)]">{account.name}</h3>
                                                    <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)] mt-1">
                                                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                                            account.plan === 'enterprise' ? "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300" :
                                                            account.plan === 'premium' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" :
                                                            "bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300"
                                                        )}>{account.plan}</span>

                                                        <span>Obras: <strong>{accountProjects.length}</strong> / {account.maxProjects === -1 ? 'Ilimitado' : account.maxProjects}</span>
                                                        <span>Limite Registos: <strong>{account.accessControlLimit === -1 ? 'Ilimitado' : account.accessControlLimit}</strong></span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6">
                                                {adminUser ? (
                                                    <div className="text-right">
                                                        <div className="text-xs font-bold text-[var(--text)]">{adminUser.name}</div>
                                                        <div className="text-[11px] text-[var(--text-muted)]">{adminUser.email}</div>
                                                    </div>
                                                ) : (
                                                    <div className="text-xs text-red-500 italic">Sem Admin</div>
                                                )}

                                                <div className="h-8 w-px bg-[var(--border)] hidden sm:block" />

                                                <button
                                                    onClick={() => {
                                                        setEditAccount(account);
                                                        setIsEditAccountOpen(true);
                                                    }}
                                                    className="px-3 py-1.5 rounded-lg border border-primary/30 text-primary hover:bg-primary/5 text-xs font-bold transition-colors"
                                                >
                                                    Editar Plano
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ════════ TAB 4: UTILIZADORES & ADMINISTRADORES ════════ */}
                    {activeTab === 'users' && (
                        <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-xl font-bold text-[var(--text)]">Gestão Central de Utilizadores & Administradores</h2>
                                    <p className="text-xs text-[var(--text-muted)] mt-1">
                                        Super Admin pode nomear outros Administradores da APP. Administradores não podem eliminar outros administradores.
                                    </p>
                                </div>

                                {isSuperAdmin && (
                                    <button
                                        onClick={() => setIsCreateAdminOpen(true)}
                                        className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-md transition-all self-start sm:self-auto"
                                    >
                                        <Plus size={16} /> Novo Administrador da Plataforma
                                    </button>
                                )}
                            </div>

                            {/* Search and Role Filter */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                <div className="relative flex-1">
                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                                    <input
                                        type="text"
                                        placeholder="Pesquisar utilizador por nome ou email..."
                                        value={userSearch}
                                        onChange={e => setUserSearch(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-xs focus:ring-2 focus:ring-primary/20 outline-none"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    {(['all', 'superadmin', 'admin', 'user'] as const).map(roleOption => (
                                        <button
                                            key={roleOption}
                                            onClick={() => setUserRoleFilter(roleOption)}
                                            className={cn(
                                                "px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all border",
                                                userRoleFilter === roleOption
                                                    ? "bg-primary text-white border-primary"
                                                    : "bg-[var(--bg-input)] text-[var(--text-muted)] border-[var(--border)] hover:bg-[var(--border)]"
                                            )}
                                        >
                                            {roleOption === 'all' ? 'Todos' : roleOption === 'superadmin' ? 'Super Admin' : roleOption === 'admin' ? 'Administradores' : 'Utilizadores'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Users Table / List */}
                            <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm">
                                <div className="divide-y divide-[var(--border)]">
                                    {filteredUsers.map(user => {
                                        const isTargetSuperAdmin = user.role === 'superadmin';
                                        const isTargetAdmin = user.role === 'admin';
                                        const isUserSelf = user.id === currentUser.id;
                                        const userAccount = accounts.find(a => a.id === user.accountId);

                                        // Hierarchy rule: regular admin CANNOT delete or suspend administrators!
                                        const canManageThisUser = isSuperAdmin || (!isTargetAdmin && !isTargetSuperAdmin);

                                        return (
                                            <div key={user.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[var(--bg-input)]/30 transition-colors">
                                                <div className="flex items-center gap-3.5">
                                                    <div className={cn(
                                                        "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0",
                                                        isTargetSuperAdmin 
                                                            ? "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                                                            : isTargetAdmin 
                                                                ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                                                                : "bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-gray-300"
                                                    )}>
                                                        {user.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-sm text-[var(--text)]">{user.name}</span>
                                                            {isUserSelf && (
                                                                <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.2 rounded font-bold">Você</span>
                                                            )}
                                                            <span className={cn(
                                                                "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                                                                isTargetSuperAdmin 
                                                                    ? "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300"
                                                                    : isTargetAdmin
                                                                        ? "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300"
                                                                        : "bg-gray-100 text-gray-600 border-gray-300 dark:bg-zinc-800 dark:text-gray-300"
                                                            )}>
                                                                {isTargetSuperAdmin ? 'Super Admin' : isTargetAdmin ? 'Admin da Plataforma' : 'Utilizador'}
                                                            </span>

                                                            {user.status === 'suspended' && (
                                                                <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                                                                    Suspenso
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)] mt-1">
                                                            <span>{user.email}</span>
                                                            <span>•</span>
                                                            <span>Empresa: <strong>{userAccount?.name || 'Sem empresa'}</strong></span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="flex items-center gap-2 self-end sm:self-auto">
                                                    {isTargetSuperAdmin ? (
                                                        <span className="text-xs text-[var(--text-muted)] italic px-3 py-1">
                                                            Conta Protegida
                                                        </span>
                                                    ) : !canManageThisUser ? (
                                                        <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-3 py-1 rounded-lg border border-amber-200 dark:border-amber-900/50" title="Apenas o Super Admin tem autoridade para gerir ou eliminar Administradores">
                                                            Apenas Super Admin pode gerir
                                                        </span>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={() => handleToggleUserStatus(user)}
                                                                disabled={isUserSelf}
                                                                className={cn(
                                                                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 border",
                                                                    user.status === 'suspended'
                                                                        ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                                                                        : "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100"
                                                                )}
                                                            >
                                                                {user.status === 'suspended' ? <UserCheck size={14} /> : <Ban size={14} />}
                                                                <span>{user.status === 'suspended' ? 'Reativar' : 'Suspender'}</span>
                                                            </button>

                                                            <button
                                                                onClick={() => handleDeleteUser(user)}
                                                                disabled={isUserSelf}
                                                                className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                                                title="Eliminar utilizador"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ════════ TAB 5: PLANOS & PREÇÁRIO DA PLATAFORMA ════════ */}
                    {activeTab === 'plans' && (
                        <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-xl font-bold text-[var(--text)]">Planos & Preçário da Aplicação</h2>
                                    <p className="text-xs text-[var(--text-muted)] mt-1">
                                        Personalize preços, limites e características para novos clientes. Os planos atualizam-se instantaneamente na página de subscrições.
                                    </p>
                                </div>
                                <button
                                    onClick={handleResetPlans}
                                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[var(--border)] hover:bg-[var(--bg-input)] text-xs font-bold text-[var(--text)] transition-colors shadow-sm self-start sm:self-auto"
                                >
                                    <RotateCw size={14} /> Repor Preçário Padrão
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {(platformPlans && platformPlans.length > 0 ? platformPlans : []).map(plan => {
                                    return (
                                        <div
                                            key={plan.id}
                                            className={cn(
                                                "bg-[var(--bg-card)] rounded-2xl border p-6 shadow-sm flex flex-col justify-between transition-all relative",
                                                plan.isPopular 
                                                    ? "border-primary ring-2 ring-primary/20" 
                                                    : "border-[var(--border)] hover:border-primary/40"
                                            )}
                                        >
                                            {plan.isPopular && (
                                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-primary to-blue-600 text-white shadow-sm">
                                                    Mais Popular
                                                </div>
                                            )}

                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <h3 className="font-extrabold text-base text-[var(--text)]">{plan.name}</h3>
                                                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[var(--bg-input)] text-[var(--text-muted)]">
                                                        {plan.id}
                                                    </span>
                                                </div>

                                                <div className="flex items-baseline gap-1.5 mb-2">
                                                    <span className="text-2xl font-black text-primary">{plan.price}</span>
                                                    {plan.billingPeriod && (
                                                        <span className="text-xs text-[var(--text-muted)] font-medium">{plan.billingPeriod}</span>
                                                    )}
                                                </div>

                                                <p className="text-xs text-[var(--text-muted)] mb-4 min-h-[32px]">{plan.description}</p>

                                                <div className="space-y-1.5 py-3 border-y border-[var(--border)] text-xs text-[var(--text)]">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[var(--text-muted)]">Obras Próprias:</span>
                                                        <strong>{plan.maxProjects === -1 ? 'Ilimitado' : plan.maxProjects}</strong>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[var(--text-muted)]">Utilizadores:</span>
                                                        <strong>{plan.maxUsers === -1 ? 'Ilimitado' : plan.maxUsers}</strong>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[var(--text-muted)]">Obras Simultâneas:</span>
                                                        <strong>{plan.maxJoinedProjects === -1 ? 'Ilimitado' : plan.maxJoinedProjects}</strong>
                                                    </div>
                                                </div>

                                                <div className="pt-3">
                                                    <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase block mb-2">Benefícios Incluídos</span>
                                                    <ul className="space-y-1.5 text-xs text-[var(--text)]">
                                                        {plan.features.map((feat, idx) => (
                                                            <li key={idx} className="flex items-start gap-2">
                                                                <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                                                                <span className="leading-tight">{feat}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleOpenEditPlan(plan)}
                                                className="w-full mt-6 py-2 rounded-xl border border-primary/30 text-primary hover:bg-primary/5 text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                                            >
                                                <SlidersHorizontal size={14} />
                                                <span>Editar Parâmetros do Plano</span>
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </main>

                {/* ════════ MODAL: CRIAR NOVO ADMINISTRADOR DA PLATAFORMA ════════ */}
                <Modal title="Criar Administrador da Plataforma" isOpen={isCreateAdminOpen} onClose={() => setIsCreateAdminOpen(false)}>
                    <form onSubmit={handleCreateAdmin} className="space-y-4">
                        <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-xs text-purple-800 dark:text-purple-300">
                            <strong>Hierarquia de Administradores:</strong> Os administradores têm acesso ao Workplace da Plataforma e podem gerir obras e clientes, mas <strong>não podem eliminar outros administradores</strong>. Apenas o Super Administrador detém essa autoridade.
                        </div>

                        <InputGroup label="Nome do Administrador">
                            <input
                                required
                                type="text"
                                className="w-full p-2.5 border border-[var(--border)] bg-[var(--bg-input)] rounded-lg text-sm text-[var(--text)]"
                                value={newAdminData.name}
                                onChange={e => setNewAdminData({ ...newAdminData, name: e.target.value })}
                                placeholder="ex: Eng. António Silva"
                            />
                        </InputGroup>

                        <InputGroup label="Email de Acesso">
                            <input
                                required
                                type="email"
                                className="w-full p-2.5 border border-[var(--border)] bg-[var(--bg-input)] rounded-lg text-sm text-[var(--text)]"
                                value={newAdminData.email}
                                onChange={e => setNewAdminData({ ...newAdminData, email: e.target.value })}
                                placeholder="antonio.silva@empresa.pt"
                            />
                        </InputGroup>

                        <InputGroup label="Palavra-passe Temporária">
                            <input
                                required
                                type="password"
                                className="w-full p-2.5 border border-[var(--border)] bg-[var(--bg-input)] rounded-lg text-sm text-[var(--text)]"
                                value={newAdminData.password}
                                onChange={e => setNewAdminData({ ...newAdminData, password: e.target.value })}
                                placeholder="Mínimo 6 caracteres"
                            />
                        </InputGroup>

                        <div className="pt-4 flex justify-end gap-3">
                            <SecondaryButton type="button" onClick={() => setIsCreateAdminOpen(false)}>
                                Cancelar
                            </SecondaryButton>
                            <PrimaryButton type="submit" disabled={isCreatingAdmin}>
                                {isCreatingAdmin ? 'A criar...' : 'Criar Administrador'}
                            </PrimaryButton>
                        </div>
                    </form>
                </Modal>

                {/* ════════ MODAL: EDITAR PARÂMETROS DO PLANO ════════ */}
                <Modal title={`Editar Plano: ${editPlan?.name || ''}`} isOpen={isEditPlanOpen} onClose={() => setIsEditPlanOpen(false)}>
                    {editPlan && (
                        <form onSubmit={handleSavePlan} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <InputGroup label="Nome do Plano">
                                    <input
                                        required
                                        type="text"
                                        className="w-full p-2.5 border border-[var(--border)] bg-[var(--bg-input)] rounded-lg text-sm text-[var(--text)]"
                                        value={editPlan.name}
                                        onChange={e => setEditPlan({ ...editPlan, name: e.target.value })}
                                    />
                                </InputGroup>

                                <InputGroup label="Preço Visível (ex: 49 €, Sob Consulta)">
                                    <input
                                        required
                                        type="text"
                                        className="w-full p-2.5 border border-[var(--border)] bg-[var(--bg-input)] rounded-lg text-sm text-[var(--text)]"
                                        value={editPlan.price}
                                        onChange={e => setEditPlan({ ...editPlan, price: e.target.value })}
                                    />
                                </InputGroup>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <InputGroup label="Período de Cobrança (ex: /mês, /ano)">
                                    <input
                                        type="text"
                                        className="w-full p-2.5 border border-[var(--border)] bg-[var(--bg-input)] rounded-lg text-sm text-[var(--text)]"
                                        value={editPlan.billingPeriod}
                                        onChange={e => setEditPlan({ ...editPlan, billingPeriod: e.target.value })}
                                        placeholder="/mês"
                                    />
                                </InputGroup>

                                <div className="flex items-center gap-2 pt-6">
                                    <input
                                        type="checkbox"
                                        id="isPopularCheck"
                                        checked={editPlan.isPopular}
                                        onChange={e => setEditPlan({ ...editPlan, isPopular: e.target.checked })}
                                        className="w-4 h-4 rounded text-primary focus:ring-primary"
                                    />
                                    <label htmlFor="isPopularCheck" className="text-sm font-medium text-[var(--text)] cursor-pointer">
                                        Destacar como &quot;Mais Popular&quot;
                                    </label>
                                </div>
                            </div>

                            <InputGroup label="Descrição Curta">
                                <input
                                    type="text"
                                    className="w-full p-2.5 border border-[var(--border)] bg-[var(--bg-input)] rounded-lg text-sm text-[var(--text)]"
                                    value={editPlan.description}
                                    onChange={e => setEditPlan({ ...editPlan, description: e.target.value })}
                                />
                            </InputGroup>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-[var(--text)] mb-1">Max Obras Próprias</label>
                                    <input
                                        type="number"
                                        className="w-full border border-[var(--border)] bg-[var(--bg-input)] rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none"
                                        value={editPlan.maxProjects}
                                        onChange={e => setEditPlan({ ...editPlan, maxProjects: parseInt(e.target.value) || 0 })}
                                    />
                                    <span className="text-[10px] text-[var(--text-muted)]">-1 = Ilimitado</span>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-[var(--text)] mb-1">Max Utilizadores</label>
                                    <input
                                        type="number"
                                        className="w-full border border-[var(--border)] bg-[var(--bg-input)] rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none"
                                        value={editPlan.maxUsers}
                                        onChange={e => setEditPlan({ ...editPlan, maxUsers: parseInt(e.target.value) || 0 })}
                                    />
                                    <span className="text-[10px] text-[var(--text-muted)]">-1 = Ilimitado</span>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-[var(--text)] mb-1">Obras Simultâneas</label>
                                    <input
                                        type="number"
                                        className="w-full border border-[var(--border)] bg-[var(--bg-input)] rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none"
                                        value={editPlan.maxJoinedProjects}
                                        onChange={e => setEditPlan({ ...editPlan, maxJoinedProjects: parseInt(e.target.value) || 0 })}
                                    />
                                    <span className="text-[10px] text-[var(--text-muted)]">-1 = Ilimitado</span>
                                </div>
                            </div>

                            <InputGroup label="Benefícios e Funcionalidades (uma por linha)">
                                <textarea
                                    rows={5}
                                    className="w-full p-2.5 border border-[var(--border)] bg-[var(--bg-input)] rounded-lg text-xs text-[var(--text)] font-mono leading-relaxed outline-none"
                                    value={editPlanFeaturesText}
                                    onChange={e => setEditPlanFeaturesText(e.target.value)}
                                    placeholder="Exemplo:&#10;Gestão Documental & CDE na Nuvem&#10;Até 3.600 registos de acessos&#10;Suporte prioritário"
                                />
                            </InputGroup>

                            <div className="pt-4 flex justify-end gap-3">
                                <SecondaryButton type="button" onClick={() => setIsEditPlanOpen(false)}>
                                    Cancelar
                                </SecondaryButton>
                                <PrimaryButton type="submit" disabled={isSavingPlan}>
                                    {isSavingPlan ? 'A guardar...' : 'Guardar Alterações do Plano'}
                                </PrimaryButton>
                            </div>
                        </form>
                    )}
                </Modal>

                {/* ════════ MODAL: CRIAR CONTA DE CLIENTE MANUAL ════════ */}
                <Modal title="Nova Conta de Cliente" isOpen={isCreateAccountOpen} onClose={() => setIsCreateAccountOpen(false)}>
                    <form onSubmit={handleCreateAccount} className="space-y-4">
                        <InputGroup label="Nome da Empresa / Cliente">
                            <input required type="text" className="w-full p-2.5 border border-[var(--border)] bg-[var(--bg-input)] rounded-lg text-sm text-[var(--text)]"
                                value={newAccount.name} onChange={e => setNewAccount({ ...newAccount, name: e.target.value })} />
                        </InputGroup>

                        <InputGroup label="Plano de Subscrição">
                            <select className="w-full p-2.5 border border-[var(--border)] bg-[var(--bg-input)] rounded-lg text-sm text-[var(--text)]"
                                value={newAccount.plan} onChange={e => setNewAccount({ ...newAccount, plan: e.target.value as PlanType })}>
                                <option value="free">Gratuito (1 Obra de terceiros, 0 Obras Próprias)</option>
                                <option value="basic">Básico (1 Obra Própria, 5 Users)</option>
                                <option value="premium">Premium (3 Obras Próprias, 10 Users)</option>
                                <option value="enterprise">Enterprise (Obras Ilimitadas)</option>
                            </select>
                        </InputGroup>

                        <div className="border-t border-[var(--border)] pt-4 mt-4">
                            <h4 className="text-xs font-bold text-[var(--text)] uppercase mb-3 block">Administrador Principal da Empresa</h4>
                            <InputGroup label="Nome do Responsável">
                                <input required type="text" className="w-full p-2.5 border border-[var(--border)] bg-[var(--bg-input)] rounded-lg text-sm text-[var(--text)]"
                                    value={newAccount.adminName} onChange={e => setNewAccount({ ...newAccount, adminName: e.target.value })} />
                            </InputGroup>
                            <InputGroup label="Email">
                                <input required type="email" className="w-full p-2.5 border border-[var(--border)] bg-[var(--bg-input)] rounded-lg text-sm text-[var(--text)]"
                                    value={newAccount.adminEmail} onChange={e => setNewAccount({ ...newAccount, adminEmail: e.target.value })} />
                            </InputGroup>
                            <InputGroup label="Palavra-passe Temporária">
                                <input required type="password" className="w-full p-2.5 border border-[var(--border)] bg-[var(--bg-input)] rounded-lg text-sm text-[var(--text)]"
                                    value={newAccount.adminPassword} onChange={e => setNewAccount({ ...newAccount, adminPassword: e.target.value })} />
                            </InputGroup>
                        </div>

                        <div className="pt-4 flex justify-end gap-3">
                            <SecondaryButton type="button" onClick={() => setIsCreateAccountOpen(false)}>
                                Cancelar
                            </SecondaryButton>
                            <PrimaryButton type="submit">Criar Conta</PrimaryButton>
                        </div>
                    </form>
                </Modal>

                {/* ════════ MODAL: EDITAR PLANO DE CLIENTE EXISTENTE ════════ */}
                <Modal title="Editar Plano do Cliente" isOpen={isEditAccountOpen} onClose={() => setIsEditAccountOpen(false)}>
                    {editAccount && (
                        <form onSubmit={handleEditAccountSave} className="space-y-4">
                            <InputGroup label="Empresa">
                                <input type="text" className="w-full p-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-input)] text-sm text-[var(--text)]" value={editAccount.name} disabled />
                            </InputGroup>

                            <div>
                                <label className="block text-xs font-bold text-[var(--text)] mb-1">
                                    Plano de Subscrição
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {['free', 'basic', 'premium', 'enterprise'].map((p) => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => setEditAccount({ ...editAccount, plan: p as PlanType })}
                                            className={cn(
                                                "py-2 px-2 rounded-lg border text-xs font-bold uppercase transition-all",
                                                editAccount.plan === p
                                                    ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                                                    : "border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-input)]"
                                            )}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-[var(--text)] mb-1">Max Obras Próprias</label>
                                    <input
                                        type="number"
                                        className="w-full border border-[var(--border)] bg-[var(--bg-input)] rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none"
                                        value={editAccount.maxProjects}
                                        onChange={e => setEditAccount({ ...editAccount, maxProjects: parseInt(e.target.value) || 0 })}
                                    />
                                    <p className="text-[10px] text-[var(--text-muted)] mt-1">-1 para Ilimitado</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-[var(--text)] mb-1">Limite Acessos / Mês</label>
                                    <input
                                        type="number"
                                        className="w-full border border-[var(--border)] bg-[var(--bg-input)] rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none"
                                        value={editAccount.accessControlLimit}
                                        onChange={e => setEditAccount({ ...editAccount, accessControlLimit: parseInt(e.target.value) || 0 })}
                                    />
                                    <p className="text-[10px] text-[var(--text-muted)] mt-1">-1 para Ilimitado</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-[var(--text)] mb-1">Estado da Subscrição</label>
                                <select
                                    className="w-full border border-[var(--border)] bg-[var(--bg-input)] rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none"
                                    value={editAccount.subscriptionStatus}
                                    onChange={e => setEditAccount({ ...editAccount, subscriptionStatus: e.target.value as any })}
                                >
                                    <option value="active">Ativa</option>
                                    <option value="suspended">Suspensa</option>
                                    <option value="canceled">Cancelada</option>
                                </select>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <SecondaryButton type="button" onClick={() => setIsEditAccountOpen(false)}>
                                    Cancelar
                                </SecondaryButton>
                                <PrimaryButton type="submit">
                                    Guardar Alterações
                                </PrimaryButton>
                            </div>
                        </form>
                    )}
                </Modal>
            </div>
        </AuthGuard>
    );
}
