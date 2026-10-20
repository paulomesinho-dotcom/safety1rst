'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore, type AppState } from '@/store/useStore';
import { ArrowLeft, Shield, Plus, Building2, CheckCircle2, Clock, XCircle, Mail, Phone, UserCheck, AlertTriangle, Inbox, Check, X, FileText, User as UserIcon, Loader2, Sparkles, RotateCw } from 'lucide-react';
import { Modal, InputGroup, PrimaryButton } from '@/components/Modal';
import { cn } from '@/lib/utils';
import { nanoid } from 'nanoid';
import type { PlanType, Account, User, SubscriptionRequest } from '@/types';
import AuthGuard from '@/components/AuthGuard';

export default function PlatformDashboardPage() {
    const router = useRouter();
    const accounts = useStore(state => state.accounts);
    const users = useStore(state => state.users);
    const addAccount = useStore(state => state.addAccount);
    const addUser = useStore(state => state.addUser);
    const updateAccount = useStore(state => state.updateAccount);
    const currentUser = useStore(state => state.currentUser);

    const storeRequests = useStore(state => state.subscriptionRequests);
    const approveSubscriptionRequest = useStore(state => state.approveSubscriptionRequest);
    const rejectSubscriptionRequest = useStore(state => state.rejectSubscriptionRequest);

    // State declarations - all hooks unconditionally at top level
    const [serverRequests, setServerRequests] = useState<SubscriptionRequest[]>([]);
    const [isLoadingRequests, setIsLoadingRequests] = useState(false);
    const [activeTab, setActiveTab] = useState<'requests' | 'accounts'>('requests');
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [showSavedMessage, setShowSavedMessage] = useState(false);
    const [editAccount, setEditAccount] = useState<Account | null>(null);
    const [newAccount, setNewAccount] = useState({
        name: '',
        plan: 'free' as PlanType,
        adminName: '',
        adminEmail: '',
        adminPassword: ''
    });

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

    const handleApprove = async (req: SubscriptionRequest) => {
        setProcessingId(req.id);
        try {
            // 1. Atualizar store local
            approveSubscriptionRequest(req.id, currentUser?.name || 'Super Admin');

            // 2. Chamar endpoint da API para atualizar Prisma e disparar Resend email
            await fetch(`/api/platform/requests/${req.id}/approve`, {
                method: 'POST',
            }).catch(() => {});

            // 3. Atualizar serverRequests na view imediatamente
            setServerRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'approved', reviewedAt: new Date().toISOString() } : r));

            setFeedback({
                type: 'success',
                message: `Conta de "${req.companyName}" aprovada com sucesso! O utilizador admin foi criado e o cliente notificado por e-mail.`
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

    // Safe permission check rendered inside UI without breaking hook rules
    if (!currentUser || currentUser.role !== 'superadmin') {
        return (
            <AuthGuard>
                <div className="min-h-screen bg-background flex flex-col justify-center items-center p-8">
                    <Shield className="w-12 h-12 text-primary animate-pulse mb-3" />
                    <p className="text-sm text-gray-500">A verificar credenciais de administrador da plataforma...</p>
                </div>
            </AuthGuard>
        );
    }

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
            role: 'admin',
            accountId: accountId,
            password: newAccount.adminPassword || '123456',
            projectAccess: []
        });

        setIsCreateOpen(false);
        setNewAccount({ name: '', plan: 'free', adminName: '', adminEmail: '', adminPassword: '' });
    };

    const handleEditOpen = (account: Account) => {
        setEditAccount(account);
        setIsEditOpen(true);
    };

    const handleEditSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (editAccount) {
            updateAccount(editAccount.id, {
                plan: editAccount.plan,
                maxProjects: editAccount.maxProjects,
                accessControlLimit: editAccount.accessControlLimit,
                subscriptionStatus: editAccount.subscriptionStatus
            });
            setShowSavedMessage(true);
            setTimeout(() => setShowSavedMessage(false), 3000);
        }
    };

    return (
        <AuthGuard>
            <div className="min-h-screen bg-background flex flex-col">
                <div className="bg-white dark:bg-surface border-b border-gray-200 dark:border-[#444746] px-8 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.push('/')} className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="text-xl font-medium text-gray-800 dark:text-gray-100 flex items-center gap-2">
                            <Shield size={20} className="text-primary" /> Platform Administration
                        </h1>
                    </div>
                </div>

                <div className="max-w-6xl mx-auto w-full p-8">
                    {/* Feedback message */}
                    {feedback && (
                        <div className={cn(
                            "mb-6 p-4 rounded-xl border flex items-center justify-between animate-in fade-in duration-200",
                            feedback.type === 'success'
                                ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 text-emerald-800 dark:text-emerald-300"
                                : "bg-red-50 dark:bg-red-950/30 border-red-200 text-red-800 dark:text-red-300"
                        )}>
                            <div className="flex items-center gap-3">
                                {feedback.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                                <span className="text-sm font-medium">{feedback.message}</span>
                            </div>
                            <button onClick={() => setFeedback(null)} className="text-sm hover:opacity-75">
                                <X size={16} />
                            </button>
                        </div>
                    )}

                    {/* Navigation Tabs */}
                    <div className="flex border-b border-gray-200 dark:border-[#444746] mb-8 gap-8">
                        <button
                            onClick={() => setActiveTab('requests')}
                            className={cn(
                                "pb-3.5 text-sm font-semibold flex items-center gap-2.5 relative transition-colors",
                                activeTab === 'requests'
                                    ? "text-primary border-b-2 border-primary"
                                    : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                            )}
                        >
                            <Inbox size={18} /> Pedidos de Subscrição
                            {pendingCount > 0 && (
                                <span className="bg-amber-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                                    {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
                                </span>
                            )}
                        </button>

                        <button
                            onClick={() => setActiveTab('accounts')}
                            className={cn(
                                "pb-3.5 text-sm font-semibold flex items-center gap-2.5 relative transition-colors",
                                activeTab === 'accounts'
                                    ? "text-primary border-b-2 border-primary"
                                    : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                            )}
                        >
                            <Building2 size={18} /> Contas de Clientes
                            <span className="bg-gray-100 dark:bg-surface text-gray-600 dark:text-gray-300 text-xs px-2 py-0.5 rounded-full">
                                {accounts.length}
                            </span>
                        </button>
                    </div>

                    {/* TAB 1: Subscription Requests */}
                    {activeTab === 'requests' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Pedidos de Subscrição</h2>
                                    <p className="text-gray-500 text-sm mt-1">
                                        Analise, aprove ou rejeite novos clientes registados a partir do site.
                                    </p>
                                </div>
                                <button
                                    onClick={fetchRequests}
                                    disabled={isLoadingRequests}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 text-xs font-medium text-gray-700 dark:text-gray-200 transition-colors shadow-sm disabled:opacity-50"
                                >
                                    <RotateCw size={14} className={isLoadingRequests ? "animate-spin text-primary" : ""} />
                                    <span>{isLoadingRequests ? "A carregar..." : "Atualizar"}</span>
                                </button>
                            </div>

                            {subscriptionRequests.length === 0 ? (
                                <div className="bg-white dark:bg-surface rounded-2xl p-12 text-center border border-gray-200 dark:border-[#444746] shadow-sm">
                                    <Inbox className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                    <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">Nenhum pedido de registo</h3>
                                    <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
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
                                                    "bg-white dark:bg-surface p-6 rounded-2xl shadow-sm border transition-all flex flex-col md:flex-row md:items-center justify-between gap-6",
                                                    isPendingApproval
                                                        ? "border-blue-300 dark:border-blue-800 ring-1 ring-blue-500/10 shadow-md"
                                                        : "border-gray-200 dark:border-[#444746]"
                                                )}
                                            >
                                                <div className="space-y-3">
                                                    <div className="flex flex-wrap items-center gap-3">
                                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                            <Building2 className="text-primary w-5 h-5 shrink-0" />
                                                            {req.companyName}
                                                        </h3>
                                                        <span className="text-xs text-gray-500 font-mono bg-gray-100 dark:bg-surface px-2 py-0.5 rounded">
                                                            NIF: {req.nif}
                                                        </span>
                                                        <span className={cn(
                                                            "px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider",
                                                            req.plan === 'enterprise' ? "bg-purple-100 text-purple-700" :
                                                            req.plan === 'premium' ? "bg-blue-100 text-blue-700" :
                                                            "bg-gray-100 text-gray-700"
                                                        )}>
                                                            Plano {req.plan}
                                                        </span>

                                                        {/* Status Badge */}
                                                        {isPendingApproval && (
                                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse">
                                                                <CheckCircle2 size={13} /> Aguarda Aprovação
                                                            </span>
                                                        )}
                                                        {isPendingEmail && (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                                                <Clock size={12} /> Email por confirmar
                                                            </span>
                                                        )}
                                                        {isApproved && (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                                                                <Check size={12} /> Ativo & Aprovado
                                                            </span>
                                                        )}
                                                        {isRejected && (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                                                <X size={12} /> Rejeitado
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                                                        <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-200 font-medium">
                                                            <UserIcon size={14} className="text-gray-400" /> {req.contactName}
                                                        </span>
                                                        <span className="flex items-center gap-1.5">
                                                            <Mail size={14} className="text-gray-400" /> {req.email}
                                                        </span>
                                                        {req.phone && (
                                                            <span className="flex items-center gap-1.5">
                                                                <Phone size={14} className="text-gray-400" /> {req.phone}
                                                            </span>
                                                        )}
                                                        <span className="text-gray-400">
                                                            Pedido em: {new Date(req.createdAt).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-gray-100">
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
                                                        <div className="text-xs text-gray-400">
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

                    {/* TAB 2: Client Accounts */}
                    {activeTab === 'accounts' && (
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Contas de Clientes Ativas</h2>
                                    <p className="text-gray-500 mt-1">Gerir planos de subscrição e limites das empresas clientes.</p>
                                </div>
                                <button
                                    onClick={() => setIsCreateOpen(true)}
                                    className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-hover shadow-sm transition-all"
                                >
                                    <Plus size={18} /> Nova Conta de Cliente
                                </button>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {accounts.map(account => {
                                    const adminUser = users.find(u => u.accountId === account.id && (u.role === 'admin' || u.role === 'superadmin'));

                                    return (
                                        <div key={account.id} className="bg-white dark:bg-surface p-6 rounded-xl shadow-sm border border-gray-200 dark:border-[#444746] flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-lg bg-primary-light text-primary flex items-center justify-center">
                                                    <Building2 size={24} />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{account.name}</h3>
                                                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                                                        <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold uppercase",
                                                            account.plan === 'enterprise' ? "bg-purple-100 text-purple-700" :
                                                                account.plan === 'premium' ? "bg-emerald-100 text-emerald-700" :
                                                                    "bg-gray-100 dark:bg-surface text-gray-700 dark:text-gray-200"
                                                        )}>{account.plan}</span>

                                                        <span>Max Obras: {account.maxProjects === -1 ? 'Ilimitado' : account.maxProjects}</span>
                                                        <span>Limite Acessos: {account.accessControlLimit === -1 ? 'Ilimitado' : account.accessControlLimit}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6">
                                                {adminUser ? (
                                                    <div className="text-right">
                                                        <div className="text-sm font-medium text-gray-900 dark:text-white">{adminUser.name}</div>
                                                        <div className="text-xs text-gray-500">{adminUser.email}</div>
                                                    </div>
                                                ) : (
                                                    <div className="text-sm text-red-500 italic">Sem Admin Atribuído</div>
                                                )}

                                                <div className="h-8 w-px bg-gray-200"></div>

                                                <button
                                                    onClick={() => handleEditOpen(account)}
                                                    className="text-primary hover:text-blue-800 text-sm font-medium"
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
                </div>

                <Modal title="New Client Account" isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)}>
                    <form onSubmit={handleCreateAccount} className="space-y-4">
                        <InputGroup label="Company / Account Name">
                            <input required type="text" className="w-full p-2.5 border border-gray-300 dark:border-[#444746] rounded-lg"
                                value={newAccount.name} onChange={e => setNewAccount({ ...newAccount, name: e.target.value })} />
                        </InputGroup>

                        <InputGroup label="Subscription Plan">
                            <select className="w-full p-2.5 border border-gray-300 dark:border-[#444746] rounded-lg"
                                value={newAccount.plan} onChange={e => setNewAccount({ ...newAccount, plan: e.target.value as PlanType })}>
                                <option value="free">Free (1 Project, 1200 Logs)</option>
                                <option value="premium">Premium (3 Projects, 3600 Logs) - 49€/mo</option>
                                <option value="enterprise">Enterprise (Custom)</option>
                            </select>
                        </InputGroup>

                        <div className="border-t border-gray-100 dark:border-[#444746] pt-4 mt-4">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 block">Account Administrator</h4>
                            <InputGroup label="Admin Name">
                                <input required type="text" className="w-full p-2.5 border border-gray-300 dark:border-[#444746] rounded-lg"
                                    value={newAccount.adminName} onChange={e => setNewAccount({ ...newAccount, adminName: e.target.value })} />
                            </InputGroup>
                            <InputGroup label="Admin Email">
                                <input required type="email" className="w-full p-2.5 border border-gray-300 dark:border-[#444746] rounded-lg"
                                    value={newAccount.adminEmail} onChange={e => setNewAccount({ ...newAccount, adminEmail: e.target.value })} />
                            </InputGroup>
                            <InputGroup label="Temporary Password">
                                <input required type="password" className="w-full p-2.5 border border-gray-300 dark:border-[#444746] rounded-lg"
                                    value={newAccount.adminPassword} onChange={e => setNewAccount({ ...newAccount, adminPassword: e.target.value })} />
                            </InputGroup>
                        </div>

                        <PrimaryButton type="submit">Create Account</PrimaryButton>
                    </form>
                </Modal>

                <Modal title="Edit Subscription Plan" isOpen={isEditOpen} onClose={() => setIsEditOpen(false)}>
                    {editAccount && (
                        <form onSubmit={handleEditSave} className="space-y-4">
                            <InputGroup label="Account Name">
                                <input type="text" className="w-full p-2.5 border border-gray-300 dark:border-[#444746] rounded-lg bg-gray-100 dark:bg-surface" value={editAccount.name} disabled />
                            </InputGroup>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                    Subscription Plan
                                </label>
                                <div className="grid grid-cols-3 gap-3">
                                    {['free', 'premium', 'enterprise'].map((p) => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => setEditAccount({ ...editAccount, plan: p as PlanType })}
                                            className={cn(
                                                "py-2 px-3 rounded-lg border text-sm font-medium capitalize transition-all",
                                                editAccount.plan === p
                                                    ? "border-blue-500 bg-primary-light text-primary-hover ring-1 ring-primary"
                                                    : "border-gray-200 dark:border-[#444746] text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-[#444746] hover:bg-gray-50 dark:hover:bg-[#131314]"
                                            )}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Max Projects</label>
                                    <input
                                        type="number"
                                        className="w-full border border-gray-300 dark:border-[#444746] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-light outline-none"
                                        value={editAccount.maxProjects}
                                        onChange={e => setEditAccount({ ...editAccount, maxProjects: parseInt(e.target.value) })}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">-1 for Unlimited</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Access Logs Limit</label>
                                    <input
                                        type="number"
                                        className="w-full border border-gray-300 dark:border-[#444746] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-light outline-none"
                                        value={editAccount.accessControlLimit}
                                        onChange={e => setEditAccount({ ...editAccount, accessControlLimit: parseInt(e.target.value) })}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Monthly Limit</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Subscription Status</label>
                                <select
                                    className="w-full border border-gray-300 dark:border-[#444746] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-light outline-none"
                                    value={editAccount.subscriptionStatus}
                                    onChange={e => setEditAccount({ ...editAccount, subscriptionStatus: e.target.value as 'active' | 'suspended' | 'canceled' })}
                                >
                                    <option value="active">Active</option>
                                    <option value="suspended">Suspended</option>
                                    <option value="canceled">Canceled</option>
                                </select>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsEditOpen(false)}
                                    className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-surface rounded-lg text-sm font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <PrimaryButton type="submit">
                                    <div className="flex items-center gap-2">
                                        {showSavedMessage && (
                                            <span className="text-sm font-medium text-green-200 animate-in fade-in slide-in-from-right-2">
                                                Guardado
                                            </span>
                                        )}
                                        Save Changes
                                    </div>
                                </PrimaryButton>
                            </div>
                        </form>
                    )}
                </Modal>
            </div>
        </AuthGuard>
    );
};
