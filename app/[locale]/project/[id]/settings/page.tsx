'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { 
    Check, Search, Copy, Lock, UserPlus, Trash2, Mail, Plus, X, 
    LayoutGrid, List, Cloud, ExternalLink, ChevronDown, ChevronRight, 
    Save, RefreshCw, Settings as SettingsIcon, Building2, Users, HardHat, 
    Shield, Clock, FileCheck, CheckCircle2, AlertCircle, ArrowLeft 
} from 'lucide-react';
import { Modal, PrimaryButton } from '@/components/Modal';
import { ConfirmationModal } from '@/components/ConfirmationModal';
import { cn } from '@/lib/utils';
import type { ProjectRole } from '@/types';
import { GoogleDriveIcon } from '@/components/GoogleDriveIcons';
import { ProfileManagerModal } from '@/components/ProfileManagerModal';
import { 
    FlatWorkersIcon, 
    FlatSettingsIcon, 
    FlatShieldUserIcon, 
    FlatDocumentsIcon, 
    FlatRequestsIcon, 
    FlatCompaniesIcon, 
    FlatEquipmentIcon,
    GoogleMaterialIcon 
} from '@/components/FlatIcons';

type SettingsTab = 'team' | 'config' | 'compliance' | 'integrations';

const ProjectSettings = () => {
    const params = useParams();
    const router = useRouter();
    const projectId = params?.id as string;
    const { 
        users, 
        modules, 
        companies, 
        projects, 
        updateProjectAccess, 
        removeProjectAccess, 
        getUserRoleInProject, 
        currentUser, 
        projectRequests, 
        resolveProjectRequest, 
        updateProjectSettings, 
        updateProjectCDE, 
        updateProject 
    } = useStore();

    // Tab State
    const [activeTab, setActiveTab] = useState<SettingsTab>('team');

    // --- Team Tab State & Functions ---
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [selectedUser, setSelectedUser] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [removeConfirmation, setRemoveConfirmation] = useState<string | null>(null);
    const [pendingRoles, setPendingRoles] = useState<Record<string, ProjectRole>>({});
    const [roleError, setRoleError] = useState<string>('');
    const [role, setRole] = useState<ProjectRole>('viewer');
    const [allowedModules, setAllowedModules] = useState<string[]>([]);
    const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
    const [copiedCode, setCopiedCode] = useState(false);

    // --- Config Tab State & Functions ---
    const [newCcEmail, setNewCcEmail] = useState('');
    const [savedWorkflowNotice, setSavedWorkflowNotice] = useState(false);
    const [savedShstNotice, setSavedShstNotice] = useState(false);
    const [approvalSettings, setApprovalSettings] = useState({
        companies: false,
        workers: false,
        equipment: false
    });
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [profileModalType, setProfileModalType] = useState<'company' | 'worker' | 'equipment'>('company');
    const [shstSettings, setShstSettings] = useState({
        requireQualifiedShstByTier: { tier1: false, tier2: false, tier3plus: false }
    });

    const project = projects.find(p => p.id === projectId);

    useEffect(() => {
        if (project) {
            setApprovalSettings(project.approvalWorkflow || {
                companies: false,
                workers: false,
                equipment: false
            });
            setShstSettings(project.shstSettings || {
                requireQualifiedShstByTier: { tier1: false, tier2: false, tier3plus: false }
            });
        }
    }, [project]);

    // --- CDE Tab State & Functions ---
    const [provider, setProvider] = useState<'onedrive' | 'gdrive' | 'dropbox' | null>(null);
    const [credentials, setCredentials] = useState({
        folderUrl: '', serviceAccountJson: '', tenantId: '', clientId: '', clientSecret: '', siteUrl: '', appKey: '', appSecret: ''
    });
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [authError, setAuthError] = useState('');
    const [isManualOpen, setIsManualOpen] = useState(false);

    useEffect(() => {
        if (project?.cdeConfig) {
            setProvider(project.cdeConfig.provider as any);
            setCredentials({
                folderUrl: project.cdeConfig.folderPath || project.cdeConfig.folderUrl || '',
                serviceAccountJson: project.cdeConfig.serviceAccountKey || '',
                tenantId: project.cdeConfig.tenantId || '',
                clientId: project.cdeConfig.clientId || '',
                clientSecret: project.cdeConfig.clientSecret || '',
                siteUrl: project.cdeConfig.siteUrl || '',
                appKey: project.cdeConfig.appKey || '',
                appSecret: project.cdeConfig.appSecret || ''
            });
        } else {
            setProvider(null);
            setCredentials({ folderUrl: '', serviceAccountJson: '', tenantId: '', clientId: '', clientSecret: '', siteUrl: '', appKey: '', appSecret: '' });
        }
    }, [project?.cdeConfig, activeTab]);

    useEffect(() => {
        const handleMessage = async (event: MessageEvent) => {
            if (activeTab !== 'integrations') return;

            if (event.data?.type === 'SAFE_SITE_OAUTH_SUCCESS') {
                const accessToken = event.data.accessToken;
                if ((window as any).google_oauth_popup) (window as any).google_oauth_popup.close();

                if (!accessToken) {
                    setAuthError('Nenhum token de acesso recebido.');
                    return;
                }

                try {
                    let folderId = 'root';
                    if (credentials.folderUrl) {
                        const match = credentials.folderUrl.match(/folders\/([-a-zA-Z0-9_]+)/) || credentials.folderUrl.match(/id=([-a-zA-Z0-9_]+)/);
                        if (match) folderId = match[1];
                    }

                    updateProjectCDE(projectId, {
                        ...project?.cdeConfig,
                        provider: 'gdrive',
                        connected: true,
                        lastSync: new Date().toISOString(),
                        clientId: credentials.clientId,
                        accessToken: accessToken,
                        folderId: folderId,
                        folderUrl: credentials.folderUrl
                    } as any);

                    setAuthError('');
                    alert('Google Drive Conectado com Sucesso!');
                } catch (e) {
                    setAuthError('Falha ao guardar configuração: ' + e);
                }
            } else if (event.data?.type === 'SAFE_SITE_DROPBOX_CODE') {
                const code = event.data.code;
                try {
                    const res = await fetch('/api/integration/dropbox', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'exchange',
                            code: code,
                            appKey: credentials.appKey,
                            appSecret: credentials.appSecret,
                            redirectUri: window.location.origin + '/auth/callback'
                        })
                    });

                    if (!res.ok) throw new Error('Falha na troca de código Dropbox');
                    const data = await res.json();

                    updateProjectCDE(projectId, {
                        ...project?.cdeConfig,
                        provider: 'dropbox',
                        connected: true,
                        lastSync: new Date().toISOString(),
                        appKey: credentials.appKey,
                        appSecret: credentials.appSecret,
                        accessToken: data.access_token,
                        refreshToken: data.refresh_token,
                        folderPath: credentials.folderUrl
                    } as any);

                    setAuthError('');
                    alert('Dropbox Conectado com Sucesso!');

                } catch (e: any) {
                    setAuthError('Autenticação Dropbox falhou: ' + e.message);
                }
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [credentials, projectId, project, activeTab, updateProjectCDE]);

    const handleConnectCDE = async () => {
        setAuthError('');
        setIsAuthenticating(true);

        try {
            if (provider === 'gdrive') {
                if (!credentials.clientId) throw new Error('Google Client ID é obrigatório.');
                const authUrl = `https://accounts.google.com/o/oauth2/v2/auth` +
                    `?client_id=${encodeURIComponent(credentials.clientId)}` +
                    `&redirect_uri=${encodeURIComponent(window.location.origin + '/auth/callback')}` +
                    `&response_type=token` +
                    `&scope=${encodeURIComponent('https://www.googleapis.com/auth/drive')}` +
                    `&prompt=consent` +
                    `&include_granted_scopes=true`;

                window.open(authUrl, 'google_oauth_popup', 'width=600,height=600');
            } else if (provider === 'dropbox') {
                if (!credentials.appKey) throw new Error('App Key do Dropbox é obrigatória.');
                const authUrl = `https://www.dropbox.com/oauth2/authorize` +
                    `?client_id=${encodeURIComponent(credentials.appKey)}` +
                    `&redirect_uri=${encodeURIComponent(window.location.origin + '/auth/callback')}` +
                    `&response_type=code` +
                    `&token_access_type=offline`;

                localStorage.setItem('safesite_oauth_pending', JSON.stringify({
                    provider: 'dropbox',
                    appKey: credentials.appKey,
                    appSecret: credentials.appSecret,
                    folderPath: credentials.folderUrl,
                    projectId,
                    cdeConfig: project?.cdeConfig,
                    returnUrl: window.location.href
                }));

                window.location.href = authUrl;
            } else if (provider === 'onedrive') {
                const link = credentials.folderUrl;
                let siteUrl = credentials.siteUrl || link;
                let folderPath = '';

                try {
                    const url = new URL(link);
                    if (url.pathname.toLowerCase().startsWith('/sites/')) {
                        const parts = url.pathname.split('/').filter(Boolean);
                        if (parts.length >= 2) {
                            siteUrl = `${url.origin}/sites/${parts[1]}`;
                            if (parts.length > 2) {
                                const rawPath = url.pathname;
                                const sitePrefix = `/sites/${parts[1]}`;
                                folderPath = rawPath.substring(rawPath.toLowerCase().indexOf(sitePrefix.toLowerCase()) + sitePrefix.length);
                            }
                        }
                    }
                } catch (e) { }

                updateProjectCDE(projectId, {
                    provider: 'onedrive',
                    connected: true,
                    lastSync: new Date().toISOString(),
                    clientId: credentials.clientId,
                    clientSecret: credentials.clientSecret,
                    tenantId: credentials.tenantId,
                    siteUrl: siteUrl,
                    folderPath: folderPath
                });
                alert('Configuração OneDrive/SharePoint guardada com sucesso!');
            }
        } catch (e: any) {
            setAuthError(e.message);
        } finally {
            setIsAuthenticating(false);
        }
    };

    const handleDisconnectCDE = () => {
        if (confirm('Tem a certeza de que deseja desconectar o CDE?')) {
            updateProjectCDE(projectId, undefined);
            setProvider(null);
        }
    };

    // --- Config Save Handlers ---
    const handleSaveApprovalWorkflow = () => {
        updateProject(projectId, { approvalWorkflow: approvalSettings });
        setSavedWorkflowNotice(true);
        setTimeout(() => setSavedWorkflowNotice(false), 3000);
    };

    const handleSaveShstSettings = () => {
        updateProject(projectId, { shstSettings });
        setSavedShstNotice(true);
        setTimeout(() => setSavedShstNotice(false), 3000);
    };

    const handleAddCc = () => {
        if (!newCcEmail || !newCcEmail.includes('@')) return;
        const currentList = project?.workflowCcList || [];
        if (currentList.includes(newCcEmail)) return;
        updateProjectSettings(projectId, { workflowCcList: [...currentList, newCcEmail] });
        setNewCcEmail('');
    };

    const handleRemoveCc = (email: string) => {
        const currentList = project?.workflowCcList || [];
        updateProjectSettings(projectId, { workflowCcList: currentList.filter(e => e !== email) });
    };

    const inviteCode = project?.code || `PRJ-${projectId?.replace(/^prj_/, '').substring(0, 4).toUpperCase()}-${new Date(project?.createdAt || Date.now()).getFullYear()}`;
    const pendingRequests = projectRequests.filter(r => r.projectId === projectId && r.status === 'pending');

    const projectUsers = users.filter(u => {
        return u.projectAccess?.some(pa => pa.projectId === projectId);
    }).filter(u => {
        const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchesSearch) return false;
        if (roleFilter === 'all') return true;
        const r = getUserRoleInProject(u.id, projectId);
        return r === roleFilter;
    });

    const handleCopyInviteCode = () => {
        navigator.clipboard.writeText(inviteCode);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
    };

    const handleOpenEdit = (userId: string) => {
        const user = users.find(u => u.id === userId);
        const projectAccess = user?.projectAccess?.find(pa => pa.projectId === projectId);
        setSelectedUser(userId);
        setRole(projectAccess?.role || 'viewer');
        setAllowedModules(projectAccess?.allowedModules || []);
        setSelectedCompanyIds(projectAccess?.companyIds || []);
        setRoleError('');
        setIsModalOpen(true);
    };

    const handleSaveRoles = () => {
        if (!selectedUser) return;
        const validation = useStore.getState().canAssignRole(
            selectedUser,
            projectId,
            role,
            role === 'data_user' ? selectedCompanyIds : undefined
        );

        if (!validation.allowed) {
            setRoleError(validation.reason || 'Não é possível atribuir este perfil');
            return;
        }

        setRoleError('');
        updateProjectAccess(selectedUser, {
            projectId,
            role,
            allowedModules: role === 'manager' ? modules.map(m => m.id) : allowedModules,
            companyIds: role === 'data_user' ? selectedCompanyIds : undefined
        });
        setIsModalOpen(false);
    };

    const handleRemove = (userId: string) => setRemoveConfirmation(userId);

    const handleApproveRequest = (reqId: string, roleToAssign: ProjectRole) => {
        resolveProjectRequest(reqId, 'approved', roleToAssign);
    };

    const toggleModule = (modId: string) => {
        if (allowedModules.includes(modId)) setAllowedModules(allowedModules.filter(id => id !== modId));
        else setAllowedModules([...allowedModules, modId]);
    };

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'manager': return 'Manager (Gestor)';
            case 'data_user': return 'Data User (Subempreiteiro)';
            case 'editor': return 'Editor';
            case 'viewer': return 'Viewer (Visualizador)';
            case 'approval_user': return 'Approval User (Validador)';
            case 'admin':
            case 'superadmin': return 'Administrador';
            default: return 'Membro';
        }
    };

    return (
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6 font-sans">
            {/* ── Top Header & Executive Actions ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <button
                            onClick={() => router.push(`/${params.locale || 'pt'}`)}
                            className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-primary transition-colors cursor-pointer"
                            title="Voltar ao Workplace"
                        >
                            <ArrowLeft size={13} /> Workplace
                        </button>
                        <span className="text-xs text-[var(--text-muted)]">•</span>
                        <span className="text-xs font-semibold text-primary uppercase tracking-wider">Configurações</span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text)]">
                        {project?.name || 'Configurações da Obra'}
                    </h1>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        {project?.address ? `${project.address} • ` : ''}Gira a equipa, permissões, workflows e conexões cloud da obra.
                    </p>
                </div>

                {/* Direct Executive Actions */}
                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Invite Code Pill */}
                    <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-sm">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Código de Adesão:</span>
                        <code className="text-xs font-mono font-extrabold text-primary select-all px-2 py-0.5 rounded bg-primary/10 border border-primary/20">{inviteCode}</code>
                        <button 
                            type="button"
                            onClick={handleCopyInviteCode} 
                            className="text-[var(--text-muted)] hover:text-primary transition-colors p-1 rounded cursor-pointer" 
                            title="Copiar código de adesão"
                        >
                            {copiedCode ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        </button>
                    </div>
                </div>
            </div>


            {/* ── Notificação Visual de Pedidos de Acesso Pendentes ── */}
            {pendingRequests.length > 0 && activeTab !== 'team' && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 shadow-sm animate-pulse">
                            <FlatRequestsIcon size={20} />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                                {pendingRequests.length === 1 ? '1 Pedido de Adesão Pendente' : `${pendingRequests.length} Pedidos de Adesão Pendentes`}
                            </h4>
                            <p className="text-xs text-amber-800 dark:text-amber-300/80">
                                Existem colaboradores ou parceiros a aguardar aprovação para ingressar nesta obra.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setActiveTab('team')}
                        className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2 self-start sm:self-auto shrink-0 cursor-pointer"
                    >
                        <FileCheck size={14} /> Rever e Aprovar ({pendingRequests.length})
                    </button>
                </div>
            )}

            {/* ── Navigation Tabs (Segmented Bar) ── */}
            <div className="flex items-center gap-2 border-b border-[var(--border)] overflow-x-auto pb-1 scrollbar-none">
                <button
                    type="button"
                    onClick={() => setActiveTab('team')}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                        activeTab === 'team'
                            ? "bg-primary text-white shadow-sm"
                            : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-input)]"
                    )}
                >
                    <FlatWorkersIcon size={16} /> Equipa & Acessos ({projectUsers.length})
                    {pendingRequests.length > 0 && (
                        <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-400 text-amber-950">
                            {pendingRequests.length}
                        </span>
                    )}
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('config')}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                        activeTab === 'config'
                            ? "bg-primary text-white shadow-sm"
                            : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-input)]"
                    )}
                >
                    <FlatSettingsIcon size={16} /> Workflows & Alertas
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('compliance')}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                        activeTab === 'compliance'
                            ? "bg-primary text-white shadow-sm"
                            : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-input)]"
                    )}
                >
                    <FlatShieldUserIcon size={16} /> Segurança, SHST & Perfis
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('integrations')}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                        activeTab === 'integrations'
                            ? "bg-primary text-white shadow-sm"
                            : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-input)]"
                    )}
                >
                    <FlatDocumentsIcon size={16} /> Integrações & CDE
                    {project?.cdeConfig?.connected && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    )}
                </button>
            </div>

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* TAB 1: EQUIPA & ACESSOS                                         */}
            {/* ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'team' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* 1. Pedidos de Adesão a Aguardar Decisão */}
                    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--border)]">
                            <div>
                                <h3 className="font-bold text-sm text-[var(--text)] flex items-center gap-2">
                                    <FlatRequestsIcon size={18} className="text-amber-500" /> 
                                    Pedidos de Adesão Pendentes
                                    {pendingRequests.length > 0 && (
                                        <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-amber-500 text-white shadow-sm">
                                            {pendingRequests.length}
                                        </span>
                                    )}
                                </h3>
                                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                    Utilizadores que solicitaram entrada nesta obra com o código do projeto. Selecione o perfil de acesso e decida a adesão.
                                </p>
                            </div>
                            <div className="text-xs text-[var(--text-muted)] bg-[var(--bg-input)] px-3 py-1.5 rounded-xl border border-[var(--border)] self-start sm:self-auto flex items-center gap-1.5">
                                Código da Obra: <code className="text-primary font-mono font-bold">{inviteCode}</code>
                            </div>
                        </div>

                        {pendingRequests.length === 0 ? (
                            <div className="p-6 text-center text-[var(--text-muted)] border border-dashed border-[var(--border)] rounded-xl bg-[var(--bg-input)]/20">
                                <FlatRequestsIcon size={26} className="mx-auto mb-2 opacity-40 text-amber-500" />
                                <p className="text-xs font-semibold text-[var(--text)]">Nenhum pedido de adesão pendente</p>
                                <p className="text-[11px] text-[var(--text-muted)] mt-1 max-w-lg mx-auto">
                                    Os membros do projeto entram sempre por solicitação. Partilhe o código <code className="font-mono text-primary font-bold">{inviteCode}</code> para que os colaboradores peçam adesão a partir do seu Workplace.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left min-w-[760px]">
                                    <thead className="bg-[var(--bg-input)]/50 text-[var(--text-muted)] font-bold uppercase tracking-wider text-[11px] border-b border-[var(--border)]">
                                        <tr>
                                            <th className="px-4 py-3">Utilizador</th>
                                            <th className="px-4 py-3">Empresa Representada</th>
                                            <th className="px-4 py-3">Data</th>
                                            <th className="px-4 py-3">Perfil a Atribuir (Obrigatório)</th>
                                            <th className="px-4 py-3 text-right">Decisão</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--border)]">
                                        {pendingRequests.map(req => {
                                            const user = users.find(u => u.id === req.userId);
                                            const defaultRole: ProjectRole = (req.companyId || req.companyName) ? 'data_user' : 'viewer';
                                            const chosenRole = pendingRoles[req.id] || defaultRole;
                                            const companyName = req.companyName || (req.companyId ? companies.find(c => c.id === req.companyId)?.name : 'Não especificada');

                                            return (
                                                <tr key={req.id} className="hover:bg-[var(--bg-input)]/30 transition-colors">
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center justify-center text-xs font-bold shrink-0">
                                                                {(user?.name || req.userName || 'U').charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-xs text-[var(--text)]">{user?.name || req.userName || 'Utilizador'}</div>
                                                                <div className="text-[11px] text-[var(--text-muted)]">{user?.email || req.userEmail || ''}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--bg-input)] text-[var(--text)] border border-[var(--border)]">
                                                            <Building2 size={13} className="text-primary" />
                                                            {companyName}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-[11px] text-[var(--text-muted)]">
                                                        {req.createdAt ? new Date(req.createdAt).toLocaleDateString('pt-PT') : 'Hoje'}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <select
                                                            value={chosenRole}
                                                            onChange={(e) => setPendingRoles(prev => ({ ...prev, [req.id]: e.target.value as ProjectRole }))}
                                                            className="bg-[var(--bg-input)] border border-primary/40 focus:border-primary rounded-lg px-2.5 py-1.5 text-xs text-[var(--text)] font-semibold outline-none cursor-pointer shadow-sm"
                                                        >
                                                            <option value="data_user">Data User (Subempreiteiro)</option>
                                                            <option value="viewer">Viewer (Visualizador / Fiscal)</option>
                                                            <option value="editor">Editor (Encarregado / Preparador)</option>
                                                            <option value="approval_user">Validador (Técnico SHST)</option>
                                                            <option value="manager">Manager (Gestor de Obra)</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-4 py-3 text-right whitespace-nowrap">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => resolveProjectRequest(req.id, 'rejected')}
                                                                className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                                                            >
                                                                Recusar
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleApproveRequest(req.id, chosenRole)}
                                                                className="px-3.5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                                                            >
                                                                <Check size={14} /> Aceitar no Projeto
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

                    {/* 2. Membros Ativos da Obra */}
                    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex flex-1 items-center gap-2">
                                <div className="relative flex-1 max-w-sm">
                                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                                    <input
                                        type="text"
                                        placeholder="Pesquisar membro por nome ou email..."
                                        className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-xl pl-9 pr-4 py-2 text-xs text-[var(--text)] focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                </div>

                                <select
                                    title="Filtrar por Perfil"
                                    value={roleFilter}
                                    onChange={e => setRoleFilter(e.target.value)}
                                    className="bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--text)] focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer"
                                >
                                    <option value="all">Todos os Perfis ({projectUsers.length})</option>
                                    <option value="manager">Managers</option>
                                    <option value="editor">Editores</option>
                                    <option value="data_user">Data Users</option>
                                    <option value="approval_user">Validadores</option>
                                    <option value="viewer">Visualizadores</option>
                                </select>
                            </div>

                            <span className="text-[11px] text-[var(--text-muted)] self-end sm:self-auto font-medium">
                                {projectUsers.length} membro(s) ativo(s)
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left min-w-[700px]">
                                <thead className="bg-[var(--bg-input)]/50 text-[var(--text-muted)] font-bold uppercase tracking-wider text-[11px] border-b border-[var(--border)]">
                                    <tr>
                                        <th className="px-6 py-3.5">Membro</th>
                                        <th className="px-6 py-3.5">Perfil</th>
                                        <th className="px-6 py-3.5">Módulos Autorizados</th>
                                        <th className="px-6 py-3.5 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border)]">
                                    {projectUsers.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-[var(--text-muted)]">
                                                Nenhum membro encontrado.
                                            </td>
                                        </tr>
                                    )}
                                    {projectUsers.map(user => {
                                        const projectRole = getUserRoleInProject(user.id, projectId);
                                        const isSelf = user.id === currentUser?.id;
                                        const isTargetManager = projectRole === 'manager';
                                        const canEdit = !isSelf && !isTargetManager;

                                        return (
                                            <tr key={user.id} className="hover:bg-[var(--bg-input)]/30 transition-colors group">
                                                <td className="px-6 py-3.5 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm">
                                                            {user.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-xs text-[var(--text)]">{user.name}</div>
                                                            <div className="text-[11px] text-[var(--text-muted)]">{user.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3.5 whitespace-nowrap">
                                                    <span className={cn(
                                                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide border",
                                                        (user.role === 'admin' || user.role === 'superadmin') ? 'bg-purple-500/10 text-purple-600 border-purple-500/20' :
                                                            projectRole === 'manager' ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' :
                                                                projectRole === 'data_user' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                                                                    projectRole === 'editor' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                                                                        'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
                                                    )}>
                                                        {(user.role === 'admin' || user.role === 'superadmin') ? 'Administrador' : getRoleLabel(projectRole || '')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3.5">
                                                    <div className="flex flex-wrap gap-1 max-w-sm">
                                                        {projectRole === 'manager' ? (
                                                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                                                <Check size={12} /> Acesso Total à Obra
                                                            </span>
                                                        ) : (
                                                            user.projectAccess?.find(pa => pa.projectId === projectId)?.allowedModules?.map(mId => {
                                                                const mod = modules.find(m => m.id === mId);
                                                                return mod ? (
                                                                    <span key={mId} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-[var(--bg-input)] text-[var(--text-muted)] border border-[var(--border)]">
                                                                        {mod.name}
                                                                    </span>
                                                                ) : null;
                                                            }) || <span className="text-xs text-[var(--text-muted)] italic">Sem restrições</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3.5 text-right whitespace-nowrap">
                                                    {canEdit ? (
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenEdit(user.id)}
                                                                className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-[var(--border)] hover:border-primary hover:text-primary transition-colors cursor-pointer"
                                                            >
                                                                Editar Permissões
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemove(user.id)}
                                                                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                                                                title="Remover"
                                                            >
                                                                <Trash2 size={15} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[11px] text-[var(--text-muted)] italic flex items-center justify-end gap-1">
                                                            <Lock size={12} /> {isSelf ? 'Sua Conta' : 'Protegido'}
                                                        </span>
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

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* TAB 2: WORKFLOWS & ALERTAS                                      */}
            {/* ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'config' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* Workflow de Aprovação */}
                    <div className="p-6 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-sm">
                        <div className="flex items-start justify-between gap-4 mb-5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20">
                                    <FileCheck size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-[var(--text)]">
                                        Workflow de Validação & Aprovação
                                    </h3>
                                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                        Ative etapas de aprovação formal para exigir dupla verificação após a inserção de dados.
                                    </p>
                                </div>
                            </div>

                            {savedWorkflowNotice && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 animate-in fade-in">
                                    <CheckCircle2 size={14} /> Guardado!
                                </span>
                            )}
                        </div>

                        <div className="space-y-3 bg-[var(--bg-input)]/40 p-4 rounded-xl border border-[var(--border)]">
                            <div className="flex items-center justify-between py-1">
                                <div>
                                    <span className="text-xs font-bold text-[var(--text)] block">Organizações & Empresas</span>
                                    <span className="text-[11px] text-[var(--text-muted)]">Requer aprovação do gestor antes da admissão em obra</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setApprovalSettings(prev => ({ ...prev, companies: !prev.companies }))}
                                    className={cn(
                                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer",
                                        approvalSettings.companies ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"
                                    )}
                                    title="Alternar aprovação de empresas"
                                >
                                    <span className={cn(
                                        "inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform",
                                        approvalSettings.companies ? "translate-x-6" : "translate-x-1"
                                    )} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between py-1 border-t border-[var(--border)]">
                                <div>
                                    <span className="text-xs font-bold text-[var(--text)] block">Pessoas & Trabalhadores</span>
                                    <span className="text-[11px] text-[var(--text-muted)]">Exige validação prévia de fichas e aptidão médica</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setApprovalSettings(prev => ({ ...prev, workers: !prev.workers }))}
                                    className={cn(
                                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer",
                                        approvalSettings.workers ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"
                                    )}
                                    title="Alternar aprovação de trabalhadores"
                                >
                                    <span className={cn(
                                        "inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform",
                                        approvalSettings.workers ? "translate-x-6" : "translate-x-1"
                                    )} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between py-1 border-t border-[var(--border)]">
                                <div>
                                    <span className="text-xs font-bold text-[var(--text)] block">Equipamentos & Máquinas</span>
                                    <span className="text-[11px] text-[var(--text-muted)]">Obriga a homologação de inspeções e seguros</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setApprovalSettings(prev => ({ ...prev, equipment: !prev.equipment }))}
                                    className={cn(
                                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer",
                                        approvalSettings.equipment ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"
                                    )}
                                    title="Alternar aprovação de equipamentos"
                                >
                                    <span className={cn(
                                        "inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform",
                                        approvalSettings.equipment ? "translate-x-6" : "translate-x-1"
                                    )} />
                                </button>
                            </div>
                        </div>

                        <div className="mt-4 flex justify-end">
                            <button
                                type="button"
                                onClick={handleSaveApprovalWorkflow}
                                className="px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                            >
                                <Save size={15} /> Guardar Regras de Workflow
                            </button>
                        </div>
                    </div>

                    {/* Notificações por Email (Lista CC) */}
                    <div className="p-6 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-primary flex items-center justify-center shrink-0 border border-blue-500/20">
                                <Mail size={20} />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-[var(--text)]">
                                    Notificações por Email (Lista CC)
                                </h3>
                                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                    Estes endereços receberão cópias automáticas dos alertas de aprovação e relatórios de conformidade.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <input
                                    type="email"
                                    className="flex-1 bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-xs text-[var(--text)] focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                    placeholder="exemplo@empresa.pt"
                                    value={newCcEmail}
                                    onChange={e => setNewCcEmail(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddCc()}
                                />
                                <button 
                                    type="button"
                                    onClick={handleAddCc} 
                                    className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0"
                                >
                                    <Plus size={15} /> Adicionar
                                </button>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {project?.workflowCcList?.map(email => (
                                    <div key={email} className="bg-primary/10 border border-primary/20 text-primary px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-2 shadow-sm">
                                        <span>{email}</span>
                                        <button 
                                            type="button"
                                            onClick={() => handleRemoveCc(email)} 
                                            className="hover:text-red-600 transition-colors cursor-pointer"
                                            title="Remover email"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                                {(!project?.workflowCcList || project.workflowCcList.length === 0) && (
                                    <p className="text-xs text-[var(--text-muted)] italic">Nenhum email adicional configurado na lista CC.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Fuso Horário de Referência */}
                    <div className="p-6 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                                <Clock size={20} />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-[var(--text)]">
                                    Fuso Horário da Obra
                                </h3>
                                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                    Define o fuso de referência para o cálculo de expiração de documentos e prazos legais de SST.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            <select
                                title="Fuso Horário de Referência"
                                className="flex-1 bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-xs text-[var(--text)] focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer"
                                value={project?.expiryTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone}
                                onChange={e => updateProject(projectId, { expiryTimezone: e.target.value })}
                            >
                                {[
                                    'Europe/Lisbon', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
                                    'Europe/Madrid', 'Europe/Rome', 'Europe/Warsaw', 'Europe/Bucharest',
                                    'Europe/Helsinki', 'Europe/Athens', 'Europe/Istanbul',
                                    'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
                                    'America/Sao_Paulo', 'America/Buenos_Aires',
                                    'Africa/Luanda', 'Africa/Maputo', 'Africa/Accra',
                                    'Asia/Dubai', 'Asia/Tokyo', 'Asia/Singapore', 'Asia/Shanghai',
                                    'Australia/Sydney', 'Pacific/Auckland',
                                    'UTC'
                                ].map(tz => (
                                    <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>
                                ))}
                            </select>

                            <div className="text-xs text-[var(--text-muted)] bg-[var(--bg-input)]/50 px-3 py-2 rounded-xl border border-[var(--border)] shrink-0">
                                Hora Local Atual: <strong className="text-[var(--text)]">{new Intl.DateTimeFormat('pt-PT', { timeZone: project?.expiryTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone, timeStyle: 'short', dateStyle: 'short' }).format(new Date())}</strong>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* TAB 3: SEGURANÇA, SHST & PERFIS                                 */}
            {/* ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'compliance' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* Controlo de Criação de Recursos */}
                    <div className="p-6 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-sm">
                        <div className="flex items-start justify-between gap-4 mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-primary flex items-center justify-center shrink-0 border border-blue-500/20">
                                    <FlatCompaniesIcon size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-[var(--text)]">
                                        Controlo de Inserção de Recursos
                                    </h3>
                                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                        Restringir a permissão de subempreiteiros (Data Users) para adicionar trabalhadores e equipamentos.
                                    </p>
                                </div>
                            </div>

                            <span className={cn(
                                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shrink-0",
                                project?.requireCompanyValidatedToAddWorkers
                                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
                                    : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            )}>
                                <span className={cn("w-2 h-2 rounded-full", project?.requireCompanyValidatedToAddWorkers ? "bg-amber-500" : "bg-emerald-500")} />
                                {project?.requireCompanyValidatedToAddWorkers ? 'Restrição Ativa' : 'Sem Restrição'}
                            </span>
                        </div>

                        <div className="bg-[var(--bg-input)]/40 p-4 rounded-xl border border-[var(--border)] flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-bold text-[var(--text)]">
                                    Exigir empresa validada para criar novos trabalhadores e equipamentos
                                </p>
                                <p className="text-[11px] text-[var(--text-muted)] mt-1">
                                    Se <strong>ativo</strong>, o parceiro só pode associar colaboradores se a sua própria empresa estiver com a documentação 100% regularizada.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => updateProject(projectId, {
                                    requireCompanyValidatedToAddWorkers: !project?.requireCompanyValidatedToAddWorkers
                                })}
                                className={cn(
                                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0 mt-0.5",
                                    project?.requireCompanyValidatedToAddWorkers ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"
                                )}
                                title={project?.requireCompanyValidatedToAddWorkers ? 'Desativar restrição' : 'Ativar restrição'}
                            >
                                <span className={cn(
                                    "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                                    project?.requireCompanyValidatedToAddWorkers ? "translate-x-6" : "translate-x-1"
                                )} />
                            </button>
                        </div>
                    </div>

                    {/* Regras SHST por Nível de Subcontratação */}
                    <div className="p-6 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-sm">
                        <div className="flex items-start justify-between gap-4 mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 border border-orange-500/20">
                                    <HardHat size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-[var(--text)]">
                                        Obrigatoriedade de Técnico SHST Qualificado
                                    </h3>
                                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                        Exigir profissional qualificado de Segurança e Saúde no Trabalho por patamar de intervenção na cadeia de subcontratação.
                                    </p>
                                </div>
                            </div>

                            {savedShstNotice && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 animate-in fade-in">
                                    <CheckCircle2 size={14} /> Guardado!
                                </span>
                            )}
                        </div>

                        <div className="space-y-3 bg-[var(--bg-input)]/40 p-4 rounded-xl border border-[var(--border)]">
                            <div className="flex items-center justify-between py-1">
                                <div>
                                    <span className="text-xs font-bold text-[var(--text)] block">Nível 1 (Empreiteiro Geral)</span>
                                    <span className="text-[11px] text-[var(--text-muted)]">Obrigatória habilitação de Técnico Superior de Segurança no Trabalho (TSST)</span>
                                </div>
                                <button
                                    type="button"
                                    title="Alternar obrigatoriedade Nível 1"
                                    onClick={() => setShstSettings(prev => ({
                                        requireQualifiedShstByTier: { ...prev.requireQualifiedShstByTier, tier1: !prev.requireQualifiedShstByTier.tier1 }
                                    }))}
                                    className={cn(
                                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer",
                                        shstSettings.requireQualifiedShstByTier.tier1 ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"
                                    )}
                                >
                                    <span className={cn(
                                        "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                                        shstSettings.requireQualifiedShstByTier.tier1 ? "translate-x-6" : "translate-x-1"
                                    )} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between py-1 border-t border-[var(--border)]">
                                <div>
                                    <span className="text-xs font-bold text-[var(--text)] block">Nível 2 (1.º Subempreiteiro)</span>
                                    <span className="text-[11px] text-[var(--text-muted)]">Exigir CAP / Certificação de Técnico de Segurança</span>
                                </div>
                                <button
                                    type="button"
                                    title="Alternar obrigatoriedade Nível 2"
                                    onClick={() => setShstSettings(prev => ({
                                        requireQualifiedShstByTier: { ...prev.requireQualifiedShstByTier, tier2: !prev.requireQualifiedShstByTier.tier2 }
                                    }))}
                                    className={cn(
                                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer",
                                        shstSettings.requireQualifiedShstByTier.tier2 ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"
                                    )}
                                >
                                    <span className={cn(
                                        "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                                        shstSettings.requireQualifiedShstByTier.tier2 ? "translate-x-6" : "translate-x-1"
                                    )} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between py-1 border-t border-[var(--border)]">
                                <div>
                                    <span className="text-xs font-bold text-[var(--text)] block">Nível 3+ (Sub-subempreiteiros e Especialistas)</span>
                                    <span className="text-[11px] text-[var(--text-muted)]">Aplicável a empresas de trabalhos em altura, demolição ou riscos especiais</span>
                                </div>
                                <button
                                    type="button"
                                    title="Alternar obrigatoriedade Nível 3+"
                                    onClick={() => setShstSettings(prev => ({
                                        requireQualifiedShstByTier: { ...prev.requireQualifiedShstByTier, tier3plus: !prev.requireQualifiedShstByTier.tier3plus }
                                    }))}
                                    className={cn(
                                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer",
                                        shstSettings.requireQualifiedShstByTier.tier3plus ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"
                                    )}
                                >
                                    <span className={cn(
                                        "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                                        shstSettings.requireQualifiedShstByTier.tier3plus ? "translate-x-6" : "translate-x-1"
                                    )} />
                                </button>
                            </div>
                        </div>

                        <div className="mt-4 flex justify-end">
                            <button
                                type="button"
                                onClick={handleSaveShstSettings}
                                className="px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                            >
                                <Save size={15} /> Guardar Regras SHST
                            </button>
                        </div>
                    </div>

                    {/* Perfis de Dados Personalizados */}
                    <div className="p-6 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                                <FlatSettingsIcon size={20} />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-[var(--text)]">
                                    Perfis de Dados & Metadados
                                </h3>
                                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                    Configure os campos de informação, formulários e categorias de documentação exigidos aos intervenientes.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <button
                                type="button"
                                onClick={() => { setProfileModalType('company'); setIsProfileModalOpen(true); }}
                                className="p-5 border border-[var(--border)] rounded-2xl bg-[var(--bg-input)]/30 hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-3 group text-center cursor-pointer"
                            >
                                <div className="w-12 h-12 bg-blue-500/10 text-primary rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform border border-blue-500/20">
                                    <FlatCompaniesIcon size={22} />
                                </div>
                                <div>
                                    <div className="font-bold text-xs text-[var(--text)] mb-0.5">Organizações</div>
                                    <div className="text-[11px] text-[var(--text-muted)]">Campos e perfis empresariais</div>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => { setProfileModalType('worker'); setIsProfileModalOpen(true); }}
                                className="p-5 border border-[var(--border)] rounded-2xl bg-[var(--bg-input)]/30 hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-3 group text-center cursor-pointer"
                            >
                                <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform border border-emerald-500/20">
                                    <FlatWorkersIcon size={22} />
                                </div>
                                <div>
                                    <div className="font-bold text-xs text-[var(--text)] mb-0.5">Pessoas</div>
                                    <div className="text-[11px] text-[var(--text-muted)]">Fichas e aptidão de trabalhadores</div>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => { setProfileModalType('equipment'); setIsProfileModalOpen(true); }}
                                className="p-5 border border-[var(--border)] rounded-2xl bg-[var(--bg-input)]/30 hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-3 group text-center cursor-pointer"
                            >
                                <div className="w-12 h-12 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform border border-amber-500/20">
                                    <FlatEquipmentIcon size={22} />
                                </div>
                                <div>
                                    <div className="font-bold text-xs text-[var(--text)] mb-0.5">Equipamentos</div>
                                    <div className="text-[11px] text-[var(--text-muted)]">Inspeções e fichas de maquinaria</div>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* TAB 4: INTEGRAÇÕES & CDE (CLOUD)                                */}
            {/* ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'integrations' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-primary flex items-center justify-center shrink-0 border border-blue-500/20">
                                    <Cloud size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-[var(--text)]">
                                        Ambiente Comum de Dados (CDE)
                                    </h3>
                                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                        Sincronização bidirecional de documentação técnica, atas e evidências de segurança com o seu armazenamento na cloud.
                                    </p>
                                </div>
                            </div>

                            <span className={cn(
                                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border self-start sm:self-auto",
                                project?.cdeConfig?.connected
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                    : "bg-gray-500/10 text-[var(--text-muted)] border-[var(--border)]"
                            )}>
                                <span className={cn("w-2 h-2 rounded-full", project?.cdeConfig?.connected ? "bg-emerald-500" : "bg-gray-400")} />
                                {project?.cdeConfig?.connected ? `Conectado (${project.cdeConfig.provider?.toUpperCase()})` : 'Desconectado'}
                            </span>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Provider Selection Cards */}
                            <div>
                                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">
                                    Selecione o Provedor Cloud
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setProvider('onedrive')}
                                        className={cn(
                                            "p-4 rounded-xl border flex flex-col items-center gap-2.5 transition-all cursor-pointer text-center",
                                            provider === 'onedrive'
                                                ? "bg-primary/10 border-primary text-primary shadow-sm ring-2 ring-primary/20"
                                                : "bg-[var(--bg-input)]/40 border-[var(--border)] hover:bg-[var(--bg-input)] text-[var(--text-muted)]"
                                        )}
                                    >
                                        <Cloud size={26} className={provider === 'onedrive' ? "text-primary" : "opacity-60"} />
                                        <div>
                                            <span className="text-xs font-bold block text-[var(--text)]">OneDrive / SharePoint</span>
                                            <span className="text-[10px] text-[var(--text-muted)]">Microsoft 365 Enterprise</span>
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setProvider('gdrive')}
                                        className={cn(
                                            "p-4 rounded-xl border flex flex-col items-center gap-2.5 transition-all cursor-pointer text-center",
                                            provider === 'gdrive'
                                                ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 shadow-sm ring-2 ring-emerald-500/20"
                                                : "bg-[var(--bg-input)]/40 border-[var(--border)] hover:bg-[var(--bg-input)] text-[var(--text-muted)]"
                                        )}
                                    >
                                        <GoogleDriveIcon type="folder" size={26} />
                                        <div>
                                            <span className="text-xs font-bold block text-[var(--text)]">Google Drive</span>
                                            <span className="text-[10px] text-[var(--text-muted)]">Google Workspace OAuth</span>
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setProvider('dropbox')}
                                        className={cn(
                                            "p-4 rounded-xl border flex flex-col items-center gap-2.5 transition-all cursor-pointer text-center",
                                            provider === 'dropbox'
                                                ? "bg-indigo-500/10 border-indigo-500 text-indigo-600 shadow-sm ring-2 ring-indigo-500/20"
                                                : "bg-[var(--bg-input)]/40 border-[var(--border)] hover:bg-[var(--bg-input)] text-[var(--text-muted)]"
                                        )}
                                    >
                                        <Cloud size={26} className={provider === 'dropbox' ? "text-indigo-600" : "opacity-60"} />
                                        <div>
                                            <span className="text-xs font-bold block text-[var(--text)]">Dropbox Business</span>
                                            <span className="text-[10px] text-[var(--text-muted)]">Dropbox API App</span>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Google Drive Configuration */}
                            {provider === 'gdrive' && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="bg-primary/5 border border-primary/20 rounded-xl overflow-hidden">
                                        <button
                                            type="button"
                                            onClick={() => setIsManualOpen(!isManualOpen)}
                                            className="w-full flex items-center justify-between p-4 text-left hover:bg-primary/10 transition-colors cursor-pointer"
                                        >
                                            <div className="flex items-center gap-2 font-bold text-xs text-primary">
                                                <ExternalLink size={15} />
                                                <span>Instruções de Configuração do Google Drive</span>
                                            </div>
                                            {isManualOpen ? <ChevronDown size={15} className="text-primary" /> : <ChevronRight size={15} className="text-primary" />}
                                        </button>

                                        {isManualOpen && (
                                            <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
                                                <ol className="list-decimal list-inside text-xs text-[var(--text-muted)] space-y-1.5 border-t border-primary/10 pt-3">
                                                    <li>Aceda à <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="underline text-primary">Google Cloud Console</a>.</li>
                                                    <li>Crie um projeto ou selecione um existente.</li>
                                                    <li>Ative a <strong>Google Drive API</strong> em "APIs & Services".</li>
                                                    <li>Configure o ecrã de consentimento OAuth (Externo).</li>
                                                    <li>Em "Credentials", crie um <strong>OAuth Client ID</strong> (Web Application).</li>
                                                    <li>Adicione <code className="bg-[var(--bg-input)] px-1 rounded">{typeof window !== 'undefined' ? window.location.origin : ''}</code> em Authorized JavaScript origins.</li>
                                                    <li>Adicione <code className="bg-[var(--bg-input)] px-1 rounded">{typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : ''}</code> em Authorized redirect URIs.</li>
                                                    <li>Copie o <strong>Client ID</strong> e cole abaixo.</li>
                                                </ol>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Google Client ID</label>
                                            <input
                                                type="text"
                                                value={credentials.clientId}
                                                onChange={e => setCredentials({ ...credentials, clientId: e.target.value })}
                                                className="w-full px-4 py-2.5 rounded-xl text-xs bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text)] focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                                placeholder="xxxxxx.apps.googleusercontent.com"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Link da Pasta Partilhada</label>
                                            <input
                                                type="text"
                                                value={credentials.folderUrl}
                                                onChange={e => setCredentials({ ...credentials, folderUrl: e.target.value })}
                                                className="w-full px-4 py-2.5 rounded-xl text-xs bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text)] focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                                placeholder="https://drive.google.com/drive/folders/..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* OneDrive / SharePoint Configuration */}
                            {provider === 'onedrive' && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="bg-primary/5 border border-primary/20 rounded-xl overflow-hidden">
                                        <button
                                            type="button"
                                            onClick={() => setIsManualOpen(!isManualOpen)}
                                            className="w-full flex items-center justify-between p-4 text-left hover:bg-primary/10 transition-colors cursor-pointer"
                                        >
                                            <div className="flex items-center gap-2 font-bold text-xs text-primary">
                                                <ExternalLink size={15} />
                                                <span>Instruções de Configuração do SharePoint / OneDrive</span>
                                            </div>
                                            {isManualOpen ? <ChevronDown size={15} className="text-primary" /> : <ChevronRight size={15} className="text-primary" />}
                                        </button>

                                        {isManualOpen && (
                                            <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
                                                <ol className="list-decimal list-inside text-xs text-[var(--text-muted)] space-y-1.5 border-t border-primary/10 pt-3">
                                                    <li>Aceda ao <a href="https://portal.azure.com/" target="_blank" rel="noopener noreferrer" className="underline text-primary">Azure Portal</a> e vá a "App registrations".</li>
                                                    <li>Faça "New registration" (Accounts in this organizational directory only).</li>
                                                    <li>Copie o <strong>Application (client) ID</strong> e o <strong>Directory (tenant) ID</strong>.</li>
                                                    <li>Em "Certificates & secrets", crie um novo client secret e copie o <strong>Value</strong>.</li>
                                                    <li>Em "API Permissions", adicione <code>Sites.ReadWrite.All</code> e conceda "Admin Consent".</li>
                                                    <li>Preencha os campos abaixo com os dados obtidos.</li>
                                                </ol>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Link da Pasta do SharePoint</label>
                                            <input
                                                type="text"
                                                value={credentials.folderUrl}
                                                onChange={e => setCredentials({ ...credentials, folderUrl: e.target.value })}
                                                className="w-full px-4 py-2.5 rounded-xl text-xs bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text)] focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                                placeholder="https://tenant.sharepoint.com/sites/..."
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Tenant ID</label>
                                                <input 
                                                    type="text" 
                                                    value={credentials.tenantId} 
                                                    onChange={e => setCredentials({ ...credentials, tenantId: e.target.value })} 
                                                    className="w-full px-4 py-2.5 rounded-xl text-xs bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text)] focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Client ID</label>
                                                <input 
                                                    type="text" 
                                                    value={credentials.clientId} 
                                                    onChange={e => setCredentials({ ...credentials, clientId: e.target.value })} 
                                                    className="w-full px-4 py-2.5 rounded-xl text-xs bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text)] focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Client Secret</label>
                                            <input 
                                                type="password" 
                                                value={credentials.clientSecret} 
                                                onChange={e => setCredentials({ ...credentials, clientSecret: e.target.value })} 
                                                className="w-full px-4 py-2.5 rounded-xl text-xs bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text)] focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Dropbox Configuration */}
                            {provider === 'dropbox' && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">App Key</label>
                                            <input
                                                type="text"
                                                value={credentials.appKey}
                                                onChange={e => setCredentials({ ...credentials, appKey: e.target.value })}
                                                className="w-full px-4 py-2.5 rounded-xl text-xs bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text)] focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                                placeholder="Dropbox App Key"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">App Secret</label>
                                            <input
                                                type="password"
                                                value={credentials.appSecret}
                                                onChange={e => setCredentials({ ...credentials, appSecret: e.target.value })}
                                                className="w-full px-4 py-2.5 rounded-xl text-xs bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text)] focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                                placeholder="Dropbox App Secret"
                                            />
                                        </div>
                                        <div className="col-span-full">
                                            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Caminho da Pasta</label>
                                            <input
                                                type="text"
                                                value={credentials.folderUrl}
                                                onChange={e => setCredentials({ ...credentials, folderUrl: e.target.value })}
                                                className="w-full px-4 py-2.5 rounded-xl text-xs bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text)] focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                                placeholder="/Obras/Projeto A"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {authError && (
                                <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs rounded-xl flex items-center gap-2">
                                    <AlertCircle size={16} className="shrink-0" />
                                    <span>{authError}</span>
                                </div>
                            )}
                        </div>

                        {/* Actions Footer */}
                        <div className="p-4 bg-[var(--bg-input)]/50 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-3">
                            {project?.cdeConfig?.connected ? (
                                <button
                                    type="button"
                                    onClick={handleDisconnectCDE}
                                    className="px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                                >
                                    <Trash2 size={15} /> Desconectar CDE
                                </button>
                            ) : <div />}

                            <div className="flex gap-2 ml-auto">
                                {provider && (
                                    <button
                                        type="button"
                                        onClick={handleConnectCDE}
                                        disabled={isAuthenticating}
                                        className={cn(
                                            "px-4 py-2 text-xs font-bold text-white rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer",
                                            provider === 'gdrive' ? "bg-emerald-600 hover:bg-emerald-700" :
                                                provider === 'dropbox' ? "bg-indigo-600 hover:bg-indigo-700" :
                                                    "bg-primary hover:bg-primary-hover"
                                        )}
                                    >
                                        {isAuthenticating ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
                                        {provider === 'onedrive' ? 'Guardar Configuração' : 'Autorizar & Conectar'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* MODALS                                                          */}
            {/* ══════════════════════════════════════════════════════════════ */}

            {/* Modal: Editar Permissões do Membro */}
            <Modal title="Configurar Permissões de Acesso" isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <div className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Perfil de Acesso na Obra</label>
                        <div className="grid grid-cols-2 gap-2">
                            {(['manager', 'editor', 'viewer', 'data_user', 'approval_user'] as ProjectRole[]).map(r => (
                                <button
                                    key={r}
                                    type="button"
                                    onClick={() => setRole(r)}
                                    className={cn(
                                        "py-2 px-3 text-xs font-semibold rounded-xl border transition-all text-left flex items-center gap-2 cursor-pointer",
                                        role === r 
                                            ? "bg-primary text-white border-primary shadow-sm" 
                                            : "bg-[var(--bg-input)] text-[var(--text)] border-[var(--border)] hover:border-primary/40"
                                    )}
                                >
                                    <div className={cn("w-3 h-3 rounded-full border border-current shrink-0", role === r ? "bg-white" : "bg-transparent")} />
                                    <span className="truncate">{getRoleLabel(r).split(' ')[0]}</span>
                                </button>
                            ))}
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] mt-2 bg-[var(--bg-input)] p-2.5 rounded-xl border border-[var(--border)]">
                            {role === 'manager' && "Controlo total. Pode gerir configurações, equipa, aprovações e todos os dados."}
                            {role === 'editor' && "Pode adicionar e editar dados em módulos atribuídos. Não altera configurações da obra."}
                            {role === 'viewer' && "Acesso exclusivo de consulta e leitura nos módulos permitidos."}
                            {role === 'data_user' && "Restrito exclusivamente aos dados das empresas e subempreiteiros associados."}
                            {role === 'approval_user' && "Perfil de auditoria e validação de requisitos de segurança (Reviewer)."}
                        </p>
                    </div>

                    {role === 'data_user' && (
                        <div className="animate-in fade-in slide-in-from-top-2">
                            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Empresas Associadas</label>
                            <div className="border border-[var(--border)] rounded-xl p-3 max-h-52 overflow-y-auto bg-[var(--bg-input)]/50 flex flex-col gap-2">
                                {companies.filter(c => c.projectId === projectId || !c.projectId).length === 0 ? (
                                    <p className="text-xs text-[var(--text-muted)] italic">Nenhuma empresa registada nesta obra.</p>
                                ) : (
                                    companies.filter(c => c.projectId === projectId || !c.projectId).map(c => {
                                        const isSelected = selectedCompanyIds.includes(c.id);
                                        return (
                                            <label key={c.id} className="flex items-start gap-2 p-2.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl hover:border-primary/40 cursor-pointer transition-all">
                                                <input
                                                    type="checkbox"
                                                    className="mt-0.5 rounded text-primary"
                                                    checked={isSelected}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedCompanyIds([...selectedCompanyIds, c.id]);
                                                        } else {
                                                            setSelectedCompanyIds(selectedCompanyIds.filter(id => id !== c.id));
                                                        }
                                                    }}
                                                />
                                                <div>
                                                    <span className="text-xs font-bold text-[var(--text)] block">{c.name}</span>
                                                    <span className="text-[10px] text-[var(--text-muted)]">{c.activity || 'Atividade geral'}</span>
                                                </div>
                                            </label>
                                        );
                                    })
                                )}
                            </div>
                            <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1.5 font-medium">O utilizador só terá visibilidade sobre os trabalhadores e recursos das empresas selecionadas.</p>
                        </div>
                    )}

                    {role !== 'manager' && role !== 'data_user' && (
                        <div className="animate-in fade-in slide-in-from-top-2">
                            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Módulos Autorizados</label>
                            <div className="grid grid-cols-2 gap-2">
                                {modules.filter(m => !m.isBase || m.name !== 'Projects').map(m => (
                                    <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => toggleModule(m.id)}
                                        className={cn(
                                            "flex items-center gap-2 p-2.5 rounded-xl text-xs border text-left transition-all cursor-pointer",
                                            allowedModules.includes(m.id) 
                                                ? "border-primary bg-primary/10 text-primary font-bold" 
                                                : "border-[var(--border)] bg-[var(--bg-input)] text-[var(--text)] hover:border-primary/40"
                                        )}
                                    >
                                        <div className={cn("w-4 h-4 rounded border flex items-center justify-center shrink-0", allowedModules.includes(m.id) ? "border-primary bg-primary text-white" : "border-[var(--border)] bg-[var(--bg-card)]")}>
                                            {allowedModules.includes(m.id) && <Check size={10} />}
                                        </div>
                                        <span className="truncate">{m.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {roleError && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-600 text-xs font-semibold flex items-center gap-2">
                            <AlertCircle size={15} className="shrink-0" />
                            <span>{roleError}</span>
                        </div>
                    )}

                    <PrimaryButton onClick={handleSaveRoles}>Guardar Permissões</PrimaryButton>
                </div>
            </Modal>

            {/* Modal: Confirmação de Remoção */}
            <ConfirmationModal
                isOpen={!!removeConfirmation}
                onClose={() => setRemoveConfirmation(null)}
                onConfirm={() => {
                    if (removeConfirmation) removeProjectAccess(removeConfirmation, projectId);
                    setRemoveConfirmation(null);
                }}
                title="Remover Membro da Obra?"
                message="Tem a certeza de que deseja revogar o acesso deste utilizador a esta obra?"
                description="O utilizador perderá o acesso imediato aos módulos e relatórios deste projeto."
                confirmText="Remover Acesso"
                variant="danger"
                icon="trash"
            />

            {/* Modal: Perfis de Dados */}
            {isProfileModalOpen && (
                <ProfileManagerModal
                    isOpen={isProfileModalOpen}
                    onClose={() => setIsProfileModalOpen(false)}
                    projectId={projectId}
                    entityType={profileModalType}
                />
            )}
        </div>
    );
};

export default ProjectSettings;
