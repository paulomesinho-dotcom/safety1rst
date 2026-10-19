'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { Check, Search, Copy, Lock, UserPlus, Trash2, Mail, Plus, X, LayoutGrid, List, Sliders, Server, Cloud, ExternalLink, ChevronDown, ChevronRight, Save, RefreshCw, Settings as SettingsIcon, Building2, Users, HardHat } from 'lucide-react';
import { Modal, PrimaryButton } from '@/components/Modal';
import { ConfirmationModal } from '@/components/ConfirmationModal';
import { cn } from '@/lib/utils';
import type { ProjectRole } from '@/types';
import { GoogleDriveIcon } from '@/components/GoogleDriveIcons';
import { ProfileManagerModal } from '@/components/ProfileManagerModal';

const ProjectSettings = () => {
    const params = useParams();
    const projectId = params?.id as string;
    const { users, modules, companies, projects, updateProjectAccess, removeProjectAccess, getUserRoleInProject, currentUser, projectRequests, resolveProjectRequest, updateProjectSettings, updateProjectCDE, updateProject } = useStore();

    // Tab State
    const [activeTab, setActiveTab] = useState<'team' | 'config' | 'integrations'>('team');

    // --- Team Tab State & Functions ---
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAddUserOpen, setIsAddUserOpen] = useState(false);
    const [addUserSearch, setAddUserSearch] = useState('');
    const [removeConfirmation, setRemoveConfirmation] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [roleError, setRoleError] = useState<string>('');
    const [role, setRole] = useState<ProjectRole>('viewer');
    const [allowedModules, setAllowedModules] = useState<string[]>([]);
    const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);

    // --- Config Tab State & Functions ---
    const [newCcEmail, setNewCcEmail] = useState('');
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
                    setAuthError('No access token received.');
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
                    alert('Google Drive Connected Successfully!');
                } catch (e) {
                    setAuthError('Failed to save configuration: ' + e);
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

                    if (!res.ok) throw new Error('Exchange Failed');
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
                    alert('Dropbox Connected Successfully!');

                } catch (e: any) {
                    setAuthError('Dropbox Auth Failed: ' + e.message);
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
                if (!credentials.clientId) throw new Error('Client ID is required.');
                const authUrl = `https://accounts.google.com/o/oauth2/v2/auth` +
                    `?client_id=${encodeURIComponent(credentials.clientId)}` +
                    `&redirect_uri=${encodeURIComponent(window.location.origin + '/auth/callback')}` +
                    `&response_type=token` +
                    `&scope=${encodeURIComponent('https://www.googleapis.com/auth/drive')}` +
                    `&prompt=consent` +
                    `&include_granted_scopes=true`;

                window.open(authUrl, 'google_oauth_popup', 'width=600,height=600');
            } else if (provider === 'dropbox') {
                if (!credentials.appKey) throw new Error('App Key is required.');
                const authUrl = `https://www.dropbox.com/oauth2/authorize` +
                    `?client_id=${encodeURIComponent(credentials.appKey)}` +
                    `&redirect_uri=${encodeURIComponent(window.location.origin + '/auth/callback')}` +
                    `&response_type=code` +
                    `&token_access_type=offline`;

                // Save credentials so the callback page can do the token exchange
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
                // SharePoint Manual Config
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
                alert('OneDrive/SharePoint Configuration Saved.');
            }
        } catch (e: any) {
            setAuthError(e.message);
        } finally {
            setIsAuthenticating(false);
        }
    };

    const handleDisconnectCDE = () => {
        if (confirm('Are you sure you want to disconnect?')) {
            updateProjectCDE(projectId, undefined);
            setProvider(null);
        }
    };

    // --- Config Save Handlers ---
    const handleSaveApprovalWorkflow = () => {
        updateProject(projectId, { approvalWorkflow: approvalSettings });
        alert("Workflow settings saved!");
    };

    const handleSaveShstSettings = () => {
        updateProject(projectId, { shstSettings });
        alert("Configurações de Segurança e Conformidade guardadas!");
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

    const inviteCode = `PRJ-${projectId?.substring(0, 4).toUpperCase()}-${new Date().getFullYear()}`;
    const pendingRequests = projectRequests.filter(r => r.projectId === projectId && r.status === 'pending');

    const projectUsers = users.filter(u => {
        if (u.role === 'admin' || u.role === 'superadmin') return true;
        if (u.projectAccess?.some(pa => pa.projectId === projectId)) return true;
        return false;
    }).filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const searchableUsers = users.filter(u => {
        const inProject = u.role === 'admin' || u.role === 'superadmin' || u.projectAccess?.some(pa => pa.projectId === projectId);
        return !inProject && u.name.toLowerCase().includes(addUserSearch.toLowerCase());
    });

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
            setRoleError(validation.reason || 'Não é possível atribuir este role');
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
        setIsAddUserOpen(false);
    };

    const handleRemove = (userId: string) => setRemoveConfirmation(userId);

    const handleApproveRequest = (reqId: string) => resolveProjectRequest(reqId, 'approved', 'viewer');

    const handleAddUserInit = (userId: string) => {
        setSelectedUser(userId);
        setRole('viewer');
        setAllowedModules([]);
        setRoleError('');
        setIsAddUserOpen(false);
        setIsModalOpen(true);
    };

    const toggleModule = (modId: string) => {
        if (allowedModules.includes(modId)) setAllowedModules(allowedModules.filter(id => id !== modId));
        else setAllowedModules([...allowedModules, modId]);
    };

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'manager': return 'Manager';
            case 'data_user': return 'Data User';
            case 'editor': return 'Editor';
            case 'viewer': return 'Viewer';
            case 'approval_user': return 'Approval User';
            case 'admin':
            case 'superadmin': return 'Administrator';
            default: return 'Member';
        }
    };

    return (
        <div className="flex flex-col min-h-full max-w-6xl mx-auto px-4 py-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-gray-100 dark:border-[#444746] mb-6 gap-4">
                <div>
                    <h2 className="text-xl font-normal text-google-text">Project Settings</h2>
                    <p className="text-sm text-gray-500 mt-1">Manage project team access, workflows, and integrations.</p>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex space-x-1 mb-8 bg-gray-100/50 dark:bg-surface/50 p-1 rounded-xl w-max">
                <button
                    onClick={() => setActiveTab('team')}
                    className={cn(
                        "px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2",
                        activeTab === 'team' ? "bg-white dark:bg-surface shadow text-primary" : "text-gray-600 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-[#131314]"
                    )}
                >
                    <UserPlus size={16} /> Team & Access
                </button>
                <button
                    onClick={() => setActiveTab('config')}
                    className={cn(
                        "px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2",
                        activeTab === 'config' ? "bg-white dark:bg-surface shadow text-primary" : "text-gray-600 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-[#131314]"
                    )}
                >
                    <Sliders size={16} /> Configurations
                </button>
                <button
                    onClick={() => setActiveTab('integrations')}
                    className={cn(
                        "px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2",
                        activeTab === 'integrations' ? "bg-white dark:bg-surface shadow text-primary" : "text-gray-600 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-[#131314]"
                    )}
                >
                    <Server size={16} /> Integrations
                </button>
            </div>

            {/* TEAM & ACCESS TAB */}
            {activeTab === 'team' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex bg-primary-light px-4 py-2 rounded-lg border border-primary/10 items-center gap-3">
                            <span className="text-xs font-semibold text-primary uppercase tracking-wide">Invite Code</span>
                            <code className="text-sm font-mono text-gray-800 dark:text-gray-100">{inviteCode}</code>
                            <button className="text-primary hover:text-primary"><Copy size={14} /></button>
                        </div>
                        <button
                            onClick={() => setIsAddUserOpen(true)}
                            className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-hover shadow-sm flex items-center gap-2"
                        >
                            <UserPlus size={18} /> Add Member
                        </button>
                    </div>

                    {/* Pending Requests */}
                    {pendingRequests.length > 0 && (
                        <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                            <h3 className="font-medium text-yellow-800 mb-3 flex items-center gap-2"><UserPlus size={18} /> Pending Requests ({pendingRequests.length})</h3>
                            <div className="space-y-2">
                                {pendingRequests.map(req => {
                                    const user = users.find(u => u.id === req.userId);
                                    if (!user) return null;
                                    return (
                                        <div key={req.id} className="flex items-center justify-between bg-white dark:bg-surface p-3 rounded-lg border border-yellow-100 shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">{user.name.charAt(0)}</div>
                                                <span className="font-medium text-gray-800 dark:text-gray-100">{user.name} <span className="text-gray-400 font-normal">({user.email})</span></span>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => resolveProjectRequest(req.id, 'rejected')} className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded">Deny</button>
                                                <button onClick={() => handleApproveRequest(req.id)} className="px-3 py-1 text-sm bg-primary text-white hover:bg-primary-hover rounded">Approve</button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-between mb-6">
                        <div className="relative">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Filter team members..."
                                className="bg-gray-100 dark:bg-surface border-none rounded-lg pl-10 pr-4 py-2 text-sm w-full md:w-64 focus:ring-2 focus:ring-primary-light outline-none transition-all"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex bg-gray-100 dark:bg-surface p-1 rounded-lg">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={cn(
                                    "p-2 rounded-md transition-all flex items-center justify-center text-sm font-medium",
                                    viewMode === 'grid' ? "bg-white dark:bg-surface shadow text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
                                )}
                                title="Grid View"
                            >
                                <LayoutGrid size={18} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={cn(
                                    "p-2 rounded-md transition-all flex items-center justify-center text-sm font-medium",
                                    viewMode === 'list' ? "bg-white dark:bg-surface shadow text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
                                )}
                                title="List View"
                            >
                                <List size={18} />
                            </button>
                        </div>
                    </div>

                    {viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {projectUsers.length === 0 && (
                                <div className="col-span-full p-8 text-center text-gray-500 border border-dashed border-gray-300 dark:border-[#444746] rounded-xl">
                                    No team members found matching your search.
                                </div>
                            )}
                            {projectUsers.map(user => {
                                const projectRole = getUserRoleInProject(user.id, projectId);
                                const isSelf = user.id === currentUser?.id;
                                const isTargetManager = projectRole === 'manager';
                                const canEdit = !isSelf && !isTargetManager;

                                return (
                                    <div key={user.id} className="border border-gray-200 dark:border-[#444746] rounded-xl p-5 bg-white dark:bg-surface flex flex-col items-center text-center hover:shadow-sm transition-all group">
                                        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-surface flex items-center justify-center text-gray-500 font-medium text-xl mb-3 group-hover:bg-primary-light group-hover:text-primary transition-colors">
                                            {user.name.charAt(0)}
                                        </div>
                                        <h3 className="font-medium text-gray-900 dark:text-white">{user.name}</h3>
                                        <p className="text-sm text-gray-500 mb-4">{user.email}</p>

                                        <div className="mt-auto w-full">
                                            <div className={cn("text-xs font-bold tracking-wider mb-3 py-1 bg-gray-50 dark:bg-[#131314] rounded-lg",
                                                (user.role === 'admin' || user.role === 'superadmin') ? 'text-purple-600 bg-purple-50' :
                                                    projectRole === 'manager' ? 'text-purple-600' :
                                                        projectRole === 'data_user' ? 'text-orange-600' :
                                                            projectRole === 'editor' ? 'text-primary' : 'text-gray-600 dark:text-gray-300'
                                            )}>
                                                {(user.role === 'admin' || user.role === 'superadmin') ? 'Administrator' : getRoleLabel(projectRole || '')}
                                            </div>

                                            {canEdit ? (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleOpenEdit(user.id)}
                                                        className="flex-1 py-2 text-sm border border-gray-200 dark:border-[#444746] rounded-lg hover:border-primary/30 hover:text-primary transition-colors"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleRemove(user.id)}
                                                        className="px-3 py-2 text-sm border border-gray-200 dark:border-[#444746] rounded-lg hover:border-red-300 hover:text-red-600 transition-colors"
                                                        title="Remove from Project"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button disabled className="w-full py-2 text-sm border border-gray-100 dark:border-[#444746] bg-gray-50 dark:bg-[#131314] text-gray-400 rounded-lg cursor-not-allowed flex items-center justify-center gap-2">
                                                    <Lock size={14} /> Protected
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-surface border border-gray-200 dark:border-[#444746] rounded-lg shadow-sm overflow-x-auto">
                            <table className="w-full text-sm text-left min-w-[600px]">
                                <thead className="bg-gray-50 dark:bg-[#131314] text-gray-500 font-medium border-b border-gray-100 dark:border-[#444746]">
                                    <tr>
                                        <th className="px-6 py-3 font-semibold">Member</th>
                                        <th className="px-6 py-3 font-semibold">Role</th>
                                        <th className="px-6 py-3 font-semibold">Permissions</th>
                                        <th className="px-6 py-3 text-right font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white dark:bg-surface">
                                    {projectUsers.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                                No team members found.
                                            </td>
                                        </tr>
                                    )}
                                    {projectUsers.map(user => {
                                        const projectRole = getUserRoleInProject(user.id, projectId);
                                        const isSelf = user.id === currentUser?.id;
                                        const isTargetManager = projectRole === 'manager';
                                        const canEdit = !isSelf && !isTargetManager;

                                        return (
                                            <tr key={user.id} className="hover-row transition-colors group">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-primary-light text-primary flex items-center justify-center text-xs font-bold ring-2 ring-white shadow-sm">
                                                            {user.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-gray-900 dark:text-white">{user.name}</div>
                                                            <div className="text-gray-500 text-xs">{user.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide border",
                                                        (user.role === 'admin' || user.role === 'superadmin') ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                                            projectRole === 'manager' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                                                projectRole === 'data_user' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                                                                    'bg-gray-50 dark:bg-[#131314] text-gray-700 dark:text-gray-200 border-gray-100 dark:border-[#444746]'
                                                    )}>
                                                        {(user.role === 'admin' || user.role === 'superadmin') ? 'Administrator' : getRoleLabel(projectRole || '')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-wrap gap-1 max-w-xs">
                                                        {projectRole === 'manager' ? (
                                                            <span className="text-xs text-gray-500 flex items-center gap-1"><Check size={12} /> Full Project Access</span>
                                                        ) : (
                                                            user.projectAccess?.find(pa => pa.projectId === projectId)?.allowedModules?.map(mId => {
                                                                const mod = modules.find(m => m.id === mId);
                                                                return mod ? (
                                                                    <span key={mId} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-gray-100 dark:bg-surface text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-[#444746]">
                                                                        {mod.name}
                                                                    </span>
                                                                ) : null;
                                                            }) || <span className="text-xs text-gray-400 italic">No specific modules</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right whitespace-nowrap">
                                                    {canEdit ? (
                                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => handleOpenEdit(user.id)}
                                                                className="text-primary hover:text-blue-800 font-medium text-xs px-3 py-1.5 rounded hover:bg-primary-light transition-colors border border-transparent hover:border-primary/10"
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={() => handleRemove(user.id)}
                                                                className="text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50 transition-colors"
                                                                title="Remove"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400 text-xs italic flex items-center justify-end gap-1">
                                                            <Lock size={12} /> Protected
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* CONFIGURATIONS TAB */}
            {activeTab === 'config' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">
                    {/* Communication Settings */}
                    <div className="p-6 bg-white dark:bg-surface border border-gray-200 dark:border-[#444746] rounded-xl shadow-sm">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                    <Mail size={20} className="text-primary" />
                                    Communication Settings
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">Configure email notifications for workflow actions (e.g. Validator requests).</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Workflow CC List</label>
                                <div className="flex items-center gap-2 mb-3">
                                    <input
                                        type="email"
                                        className="flex-1 border border-gray-300 dark:border-[#444746] rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary-light outline-none"
                                        placeholder="Enter email address..."
                                        value={newCcEmail}
                                        onChange={e => setNewCcEmail(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddCc()}
                                    />
                                    <button onClick={handleAddCc} className="bg-gray-100 dark:bg-surface text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-200 font-medium flex items-center gap-2">
                                        <Plus size={16} /> Add
                                    </button>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {project?.workflowCcList?.map(email => (
                                        <div key={email} className="bg-primary-light text-primary-hover px-3 py-1 rounded-full text-sm flex items-center gap-2">
                                            <span>{email}</span>
                                            <button onClick={() => handleRemoveCc(email)} className="hover:text-blue-900"><X size={14} /></button>
                                        </div>
                                    ))}
                                    {(!project?.workflowCcList || project.workflowCcList.length === 0) && (
                                        <p className="text-sm text-gray-400 italic">No emails configured. Notifications will only go to direct assignees.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Timezone Settings */}
                    <div className="p-6 bg-white dark:bg-surface border border-gray-200 dark:border-[#444746] rounded-xl shadow-sm">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                    <SettingsIcon size={20} className="text-primary" />
                                    Fuso Horário de Expiração
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">Define o fuso horário usado para calcular datas de expiração. Por defeito usa o fuso do sistema do manager.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <select
                                title="Fuso Horário"
                                className="flex-1 border border-gray-300 dark:border-[#444746] rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary-light outline-none bg-white dark:bg-surface"
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
                            <span className="text-xs text-gray-400">
                                Agora: {new Intl.DateTimeFormat('pt-PT', { timeZone: project?.expiryTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone, timeStyle: 'short', dateStyle: 'short' }).format(new Date())}
                            </span>
                        </div>
                    </div>

                    {/* Workflow Settings */}
                    <div className="p-6 bg-white dark:bg-surface border border-gray-200 dark:border-[#444746] rounded-xl shadow-sm">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                    <Check size={20} className="text-primary" />
                                    Workflow de Aprovação
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">Ative para exigir uma etapa extra de aprovação após a validação.</p>
                            </div>
                        </div>

                        <div className="space-y-3 bg-gray-50 dark:bg-[#131314] p-4 rounded-xl border border-gray-200 dark:border-[#444746]">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Empresas</span>
                                <button
                                    onClick={() => setApprovalSettings(prev => ({
                                        ...prev,
                                        companies: !prev.companies
                                    }))}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${approvalSettings.companies ? 'bg-primary' : 'bg-gray-200'}`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-surface transition-transform ${approvalSettings.companies ? 'translate-x-6' : 'translate-x-1'}`}
                                    />
                                </button>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Trabalhadores</span>
                                <button
                                    onClick={() => setApprovalSettings(prev => ({
                                        ...prev,
                                        workers: !prev.workers
                                    }))}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${approvalSettings.workers ? 'bg-primary' : 'bg-gray-200'}`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-surface transition-transform ${approvalSettings.workers ? 'translate-x-6' : 'translate-x-1'}`}
                                    />
                                </button>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Equipamentos</span>
                                <button
                                    onClick={() => setApprovalSettings(prev => ({
                                        ...prev,
                                        equipment: !prev.equipment
                                    }))}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${approvalSettings.equipment ? 'bg-primary' : 'bg-gray-200'}`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-surface transition-transform ${approvalSettings.equipment ? 'translate-x-6' : 'translate-x-1'}`}
                                    />
                                </button>
                            </div>
                        </div>
                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={handleSaveApprovalWorkflow}
                                className="px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-black rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-2"
                            >
                                <Save size={16} />
                                Guardar Alterações
                            </button>
                        </div>
                    </div>

                    {/* Controlo de Criação de Recursos */}
                    <div className="p-6 bg-white dark:bg-surface border border-gray-200 dark:border-[#444746] rounded-xl shadow-sm">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                    <Users size={20} className="text-primary" />
                                    Controlo de Criação de Recursos
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    Define se o Data User pode adicionar trabalhadores e equipamentos a uma empresa com documentos expirados.
                                </p>
                            </div>
                        </div>

                        <div className="bg-gray-50 dark:bg-[#131314] rounded-xl border border-gray-200 dark:border-[#444746] divide-y divide-gray-100 dark:divide-[#444746]">
                            <div className="flex items-start gap-4 p-4">
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                                        Exigir empresa validada para criar trabalhadores e equipamentos
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Se <strong>ativo</strong>, o Data User só pode adicionar novos trabalhadores e equipamentos se a empresa estiver no estado <em>Validado</em> ou <em>Aprovado</em> (sem documentos expirados a aguardar atualização).
                                        Se <strong>inativo</strong>, é possível adicionar novos recursos a uma empresa que já foi validada/aprovada mas que tem documentos expirados.
                                    </p>
                                </div>
                                <button
                                    onClick={() => updateProject(projectId, {
                                        requireCompanyValidatedToAddWorkers: !project?.requireCompanyValidatedToAddWorkers
                                    })}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 shrink-0 mt-0.5 ${project?.requireCompanyValidatedToAddWorkers ? 'bg-primary' : 'bg-gray-200'}`}
                                    title={project?.requireCompanyValidatedToAddWorkers ? 'Desativar restrição' : 'Ativar restrição'}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${project?.requireCompanyValidatedToAddWorkers ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${project?.requireCompanyValidatedToAddWorkers ? 'bg-amber-500' : 'bg-green-500'}`} />
                            <p className="text-xs text-gray-500">
                                {project?.requireCompanyValidatedToAddWorkers
                                    ? 'Restrição ativa — Data User bloqueado se empresa em atualização de dados'
                                    : 'Sem restrição — Data User pode sempre adicionar recursos a empresas previamente aprovadas'}
                            </p>
                        </div>
                    </div>

                    {/* Segurança e Conformidade Settings */}
                    <div className="p-6 bg-white dark:bg-surface border border-gray-200 dark:border-[#444746] rounded-xl shadow-sm">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                    <HardHat size={20} className="text-primary" />
                                    Segurança e Conformidade
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">Configurar regras estritas para os Responsáveis de Segurança e Saúde no Trabalho (SHST) por nível de subcontratação.</p>
                            </div>
                        </div>

                        <div className="space-y-4 bg-gray-50 dark:bg-[#131314] p-4 rounded-xl border border-gray-200 dark:border-[#444746]">
                            <p className="text-sm text-gray-700 dark:text-gray-300 font-medium border-b border-gray-200 dark:border-[#444746] pb-2 mb-4">Obrigatoriedade de Técnico SHST Qualificado</p>

                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600 dark:text-gray-300">Nível 1 (Empreiteiro Geral)</span>
                                <button
                                    title="Alternar obrigatoriedade Nível 1"
                                    onClick={() => setShstSettings(prev => ({
                                        requireQualifiedShstByTier: { ...prev.requireQualifiedShstByTier, tier1: !prev.requireQualifiedShstByTier.tier1 }
                                    }))}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${shstSettings.requireQualifiedShstByTier.tier1 ? 'bg-primary' : 'bg-gray-200'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-surface transition-transform ${shstSettings.requireQualifiedShstByTier.tier1 ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                            
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600 dark:text-gray-300">Nível 2 (1.º Subempreiteiro)</span>
                                <button
                                    title="Alternar obrigatoriedade Nível 2"
                                    onClick={() => setShstSettings(prev => ({
                                        requireQualifiedShstByTier: { ...prev.requireQualifiedShstByTier, tier2: !prev.requireQualifiedShstByTier.tier2 }
                                    }))}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${shstSettings.requireQualifiedShstByTier.tier2 ? 'bg-primary' : 'bg-gray-200'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-surface transition-transform ${shstSettings.requireQualifiedShstByTier.tier2 ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                            
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600 dark:text-gray-300">Nível 3+ (Sub-subempreiteiros)</span>
                                <button
                                    title="Alternar obrigatoriedade Nível 3+"
                                    onClick={() => setShstSettings(prev => ({
                                        requireQualifiedShstByTier: { ...prev.requireQualifiedShstByTier, tier3plus: !prev.requireQualifiedShstByTier.tier3plus }
                                    }))}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${shstSettings.requireQualifiedShstByTier.tier3plus ? 'bg-primary' : 'bg-gray-200'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-surface transition-transform ${shstSettings.requireQualifiedShstByTier.tier3plus ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 italic mt-2">Ativar esta opção exige que o Responsável SHST da empresa tenha formação específica em Segurança. Se inativado, pode ser o Diretor da Obra ou Encarregado.</p>
                        </div>
                        
                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={handleSaveShstSettings}
                                className="px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-black rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-2"
                            >
                                <Save size={16} />
                                Guardar Alterações
                            </button>
                        </div>
                    </div>

                    {/* Data Profiles Settings */}
                    <div className="p-6 bg-white dark:bg-surface border border-gray-200 dark:border-[#444746] rounded-xl shadow-sm">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                    <SettingsIcon size={20} className="text-primary" />
                                    Perfis de Dados
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">Gira os perfis e os campos personalizados utilizados para classificar a informação do projeto.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <button
                                onClick={() => { setProfileModalType('company'); setIsProfileModalOpen(true); }}
                                className="p-4 border border-gray-200 dark:border-[#444746] rounded-xl hover:border-primary/50 hover:bg-primary-light/30 transition-all flex flex-col items-center justify-center gap-3 group text-center"
                            >
                                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-primary rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Building2 size={24} />
                                </div>
                                <div>
                                    <div className="font-medium text-gray-900 dark:text-white mb-1">Empresas</div>
                                    <div className="text-xs text-gray-500">Configurar campos de Organizações</div>
                                </div>
                            </button>

                            <button
                                onClick={() => { setProfileModalType('worker'); setIsProfileModalOpen(true); }}
                                className="p-4 border border-gray-200 dark:border-[#444746] rounded-xl hover:border-emerald-500/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all flex flex-col items-center justify-center gap-3 group text-center"
                            >
                                <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Users size={24} />
                                </div>
                                <div>
                                    <div className="font-medium text-gray-900 dark:text-white mb-1">Trabalhadores</div>
                                    <div className="text-xs text-gray-500">Configurar campos de Pessoas</div>
                                </div>
                            </button>

                            <button
                                onClick={() => { setProfileModalType('equipment'); setIsProfileModalOpen(true); }}
                                className="p-4 border border-gray-200 dark:border-[#444746] rounded-xl hover:border-orange-500/50 hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-all flex flex-col items-center justify-center gap-3 group text-center"
                            >
                                <div className="w-12 h-12 bg-orange-50 dark:bg-orange-900/20 text-orange-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <HardHat size={24} />
                                </div>
                                <div>
                                    <div className="font-medium text-gray-900 dark:text-white mb-1">Equipamentos</div>
                                    <div className="text-xs text-gray-500">Configurar campos de Maquinaria</div>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* INTEGRATIONS TAB */}
            {activeTab === 'integrations' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="bg-white dark:bg-surface rounded-xl shadow-sm border border-gray-200 dark:border-[#444746] flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50 dark:bg-[#131314] rounded-t-xl">
                            <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                <Cloud size={20} className="text-primary" />
                                Ambiente Comum de Dados (CDE)
                            </h3>
                        </div>

                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                                <button
                                    onClick={() => setProvider('onedrive')}
                                    className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${provider === 'onedrive' ? 'bg-primary-light border-primary/20 text-primary-hover' : 'bg-white dark:bg-surface border-gray-200 dark:border-[#444746] hover:bg-gray-50 dark:hover:bg-[#131314] text-gray-600 dark:text-gray-300'}`}
                                >
                                    <Cloud size={24} className={provider === 'onedrive' ? "text-primary" : "text-gray-400"} />
                                    <span className="text-xs font-medium">OneDrive / SharePoint</span>
                                </button>
                                <button
                                    onClick={() => setProvider('gdrive')}
                                    className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${provider === 'gdrive' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white dark:bg-surface border-gray-200 dark:border-[#444746] hover:bg-gray-50 dark:hover:bg-[#131314] text-gray-600 dark:text-gray-300'}`}
                                >
                                    <GoogleDriveIcon type="folder" size={24} />
                                    <span className="text-xs font-medium">Google Drive</span>
                                </button>
                                <button
                                    onClick={() => setProvider('dropbox')}
                                    className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${provider === 'dropbox' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white dark:bg-surface border-gray-200 dark:border-[#444746] hover:bg-gray-50 dark:hover:bg-[#131314] text-gray-600 dark:text-gray-300'}`}
                                >
                                    <Cloud size={24} className={provider === 'dropbox' ? "text-indigo-600" : "text-gray-400"} />
                                    <span className="text-xs font-medium">Dropbox</span>
                                </button>
                            </div>

                            {/* Google Drive */}
                            {provider === 'gdrive' && (
                                <>
                                    <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg overflow-hidden">
                                        <button
                                            onClick={() => setIsManualOpen(!isManualOpen)}
                                            className="w-full flex items-center justify-between p-4 text-left hover:bg-blue-100/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-2 font-semibold text-blue-800">
                                                <ExternalLink size={16} />
                                                <span>Como conectar o Google Drive</span>
                                            </div>
                                            {isManualOpen ? <ChevronDown size={16} className="text-primary" /> : <ChevronRight size={16} className="text-primary" />}
                                        </button>

                                        {isManualOpen && (
                                            <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
                                                <ol className="list-decimal list-inside text-sm text-primary-hover space-y-1 ml-1 border-t border-primary/20 pt-3">
                                                    <li>Aceda à <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-900">Google Cloud Console</a>.</li>
                                                    <li>Crie um projeto ou selecione um existente.</li>
                                                    <li>Ative a <strong>Google Drive API</strong> em "APIs & Services".</li>
                                                    <li>Configure o "OAuth consent screen" (User Type: External).</li>
                                                    <li>Em "Credentials", crie um <strong>OAuth Client ID</strong> (Web Application).</li>
                                                    <li>Adicione <code>{window.location.origin}</code> em "Authorized JavaScript origins".</li>
                                                    <li>Adicione <code>{window.location.origin}/auth/callback</code> em "Authorized redirect URIs".</li>
                                                    <li>Copie o <strong>Client ID</strong> e cole abaixo.</li>
                                                </ol>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Google Client ID</label>
                                            <input
                                                type="text"
                                                value={credentials.clientId}
                                                onChange={e => setCredentials({ ...credentials, clientId: e.target.value })}
                                                className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 dark:bg-[#131314] focus:bg-white dark:focus:bg-surface transition-colors outline-none focus:ring-2 focus:ring-green-100 focus:border-green-400"
                                                placeholder="apps.googleusercontent.com"
                                            />
                                            <p className="text-[10px] text-gray-500 mt-1">Required for User Authentication (OAuth)</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Link da Pasta Partilhada</label>
                                            <input
                                                type="text"
                                                value={credentials.folderUrl}
                                                onChange={e => setCredentials({ ...credentials, folderUrl: e.target.value })}
                                                className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 dark:bg-[#131314] focus:bg-white dark:focus:bg-surface transition-colors outline-none focus:ring-2 focus:ring-green-100 focus:border-green-400"
                                                placeholder="https://drive.google.com/drive/folders/..."
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* OneDrive */}
                            {provider === 'onedrive' && (
                                <>
                                    <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg overflow-hidden">
                                        <button
                                            onClick={() => setIsManualOpen(!isManualOpen)}
                                            className="w-full flex items-center justify-between p-4 text-left hover:bg-blue-100/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-2 font-semibold text-blue-800">
                                                <ExternalLink size={16} />
                                                <span>Como conectar o SharePoint/OneDrive</span>
                                            </div>
                                            {isManualOpen ? <ChevronDown size={16} className="text-primary" /> : <ChevronRight size={16} className="text-primary" />}
                                        </button>

                                        {isManualOpen && (
                                            <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
                                                <ol className="list-decimal list-inside text-sm text-primary-hover space-y-1 ml-1 border-t border-primary/20 pt-3">
                                                    <li>Aceda ao <a href="https://portal.azure.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-900">Azure Portal</a> e vá a "App registrations".</li>
                                                    <li>Faça "New registration" (Accounts in this organizational directory only).</li>
                                                    <li>Copie o <strong>Application (client) ID</strong> e o <strong>Directory (tenant) ID</strong>.</li>
                                                    <li>Em "Certificates & secrets", crie um novo client secret e copie o <strong>Value</strong>.</li>
                                                    <li>Em "API Permissions", adicione <code>Sites.ReadWrite.All</code> (SharePoint) e conceda "Admin Consent".</li>
                                                    <li>Preencha os campos abaixo com os dados obtidos.</li>
                                                </ol>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">SharePoint Folder Link</label>
                                            <input
                                                type="text"
                                                value={credentials.folderUrl}
                                                onChange={e => setCredentials({ ...credentials, folderUrl: e.target.value })}
                                                className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 dark:bg-[#131314] focus:bg-white dark:focus:bg-surface transition-colors outline-none focus:ring-2 focus:ring-primary-light focus:border-primary"
                                                placeholder="https://tenant.sharepoint.com/sites/..."
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Tenant ID</label>
                                                <input type="text" value={credentials.tenantId} onChange={e => setCredentials({ ...credentials, tenantId: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Client ID</label>
                                                <input type="text" value={credentials.clientId} onChange={e => setCredentials({ ...credentials, clientId: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Client Secret</label>
                                            <input type="password" value={credentials.clientSecret} onChange={e => setCredentials({ ...credentials, clientSecret: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Dropbox */}
                            {provider === 'dropbox' && (
                                <>
                                    <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg overflow-hidden">
                                        <button
                                            onClick={() => setIsManualOpen(!isManualOpen)}
                                            className="w-full flex items-center justify-between p-4 text-left hover:bg-blue-100/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-2 font-semibold text-blue-800">
                                                <ExternalLink size={16} />
                                                <span>Como conectar o Dropbox</span>
                                            </div>
                                            {isManualOpen ? <ChevronDown size={16} className="text-primary" /> : <ChevronRight size={16} className="text-primary" />}
                                        </button>

                                        {isManualOpen && (
                                            <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
                                                <ol className="list-decimal list-inside text-sm text-primary-hover space-y-1 ml-1 border-t border-primary/20 pt-3">
                                                    <li>Aceda à <a href="https://www.dropbox.com/developers/apps" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-900">Dropbox App Console</a>.</li>
                                                    <li>Clique em "Create app" &rarr; "Scoped access" &rarr; "Full Dropbox".</li>
                                                    <li>Na tab "Permissions", ative <code>files.content.write</code> e <code>files.content.read</code>.</li>
                                                    <li>Na tab "Settings", adicione <code>{window.location.origin}/auth/callback</code> em "Redirect URIs".</li>
                                                    <li>Copie o <strong>App Key</strong> e o <strong>App Secret</strong> e cole abaixo.</li>
                                                </ol>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Dropbox App Key</label>
                                            <input
                                                type="text"
                                                value={credentials.appKey}
                                                onChange={e => setCredentials({ ...credentials, appKey: e.target.value })}
                                                className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 dark:bg-[#131314] focus:bg-white dark:focus:bg-surface transition-colors outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">App Secret</label>
                                            <input
                                                type="password"
                                                value={credentials.appSecret}
                                                onChange={e => setCredentials({ ...credentials, appSecret: e.target.value })}
                                                className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 dark:bg-[#131314] focus:bg-white dark:focus:bg-surface transition-colors outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Initial Folder Path (Optional)</label>
                                            <input
                                                type="text"
                                                value={credentials.folderUrl}
                                                onChange={e => setCredentials({ ...credentials, folderUrl: e.target.value })}
                                                className="w-full px-3 py-2 border rounded-lg text-sm"
                                                placeholder="/Engineering/Project A"
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            {authError && (
                                <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-start gap-2">
                                    <span className="mt-0.5">⚠️</span>
                                    {authError}
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-gray-50 dark:bg-[#131314] border-t flex justify-between gap-3 rounded-b-xl">
                            {project?.cdeConfig?.connected && (
                                <button
                                    onClick={handleDisconnectCDE}
                                    className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2 transition-colors"
                                >
                                    <Trash2 size={16} /> Disconnect
                                </button>
                            )}
                            <div className="flex gap-2 ml-auto">
                                {provider && (
                                    <button
                                        onClick={handleConnectCDE}
                                        disabled={isAuthenticating}
                                        className={`px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-2 ${provider === 'gdrive' ? 'bg-green-600 hover:bg-green-700' : provider === 'dropbox' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-primary hover:bg-primary-hover'}`}
                                    >
                                        {isAuthenticating ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                                        {provider === 'onedrive' ? 'Save Config' : 'Authorize & Connect'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {/* Modals for Team Access */}
            <Modal title="Configure Access" isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Role</label>
                        <div className="grid grid-cols-2 gap-2">
                            {(['manager', 'editor', 'viewer', 'data_user', 'approval_user'] as ProjectRole[]).map(r => (
                                <button
                                    key={r}
                                    onClick={() => setRole(r)}
                                    className={cn(
                                        "py-2 px-3 text-sm font-medium rounded-lg border transition-all text-left flex items-center gap-2",
                                        role === r ? "bg-primary text-white border-primary" : "bg-white dark:bg-surface text-gray-600 dark:text-gray-300 border-gray-200 dark:border-[#444746] hover:border-gray-300 dark:hover:border-[#444746]"
                                    )}
                                >
                                    <div className={cn("w-3 h-3 rounded-full border border-current", role === r ? "bg-white dark:bg-surface" : "bg-transparent")}></div>
                                    {r === 'manager' ? 'Manager' : r === 'editor' ? 'Editor' : r === 'viewer' ? 'Viewer' : r === 'approval_user' ? 'Approval User' : 'Data User'}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-2 bg-gray-50 dark:bg-[#131314] p-2 rounded">
                            {role === 'manager' && "Full control. Can manage settings, team (users), and all data."}
                            {role === 'editor' && "Can add and edit data. Cannot delete/configure."}
                            {role === 'viewer' && "Read-only access."}
                            {role === 'data_user' && "Restricted to specific Company data. Cannot see other companies' info."}
                            {role === 'approval_user' && "Special role for workflow approvals (Reviewer). Cannot edit project settings."}
                        </p>
                    </div>

                    {role === 'data_user' && (
                        <div className="animate-in fade-in slide-in-from-top-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Assign Companies</label>
                            <div className="border border-gray-200 dark:border-[#444746] rounded-lg p-3 max-h-60 overflow-y-auto bg-gray-50 dark:bg-[#131314] flex flex-col gap-2">
                                {companies.filter(c => c.projectId === projectId || !c.projectId).length === 0 ? (
                                    <p className="text-sm text-gray-500 italic">No companies available.</p>
                                ) : (
                                    companies.filter(c => c.projectId === projectId || !c.projectId).map(c => {
                                        const isSelected = selectedCompanyIds.includes(c.id);
                                        return (
                                            <label key={c.id} className="flex items-start gap-2 p-2 bg-white dark:bg-surface border border-gray-200 dark:border-[#444746] rounded hover:border-primary/30 cursor-pointer transition-all">
                                                <input
                                                    type="checkbox"
                                                    className="mt-1"
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
                                                    <span className="text-sm font-medium text-gray-900 dark:text-white block">{c.name}</span>
                                                    <span className="text-xs text-gray-500">{c.activity}</span>
                                                </div>
                                            </label>
                                        );
                                    })
                                )}
                            </div>
                            <p className="text-xs text-orange-600 mt-2">User will see data associated with ALL selected companies.</p>
                        </div>
                    )}

                    {role !== 'manager' && role !== 'data_user' && (
                        <div className="animate-in fade-in slide-in-from-top-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">Allowed Modules</label>
                            <div className="grid grid-cols-2 gap-3">
                                {modules.filter(m => !m.isBase || m.name !== 'Projects').map(m => ( // Don't show Projects module
                                    <button
                                        key={m.id}
                                        onClick={() => toggleModule(m.id)}
                                        className={cn(
                                            "flex items-center gap-2 p-2 rounded-lg text-sm border text-left transition-all",
                                            allowedModules.includes(m.id) ? "border-blue-500 bg-primary-light text-primary-hover" : "border-gray-200 dark:border-[#444746] hover:border-gray-300 dark:hover:border-[#444746] text-gray-600 dark:text-gray-300"
                                        )}
                                    >
                                        <div className={cn("w-4 h-4 rounded border flex items-center justify-center bg-white dark:bg-surface", allowedModules.includes(m.id) ? "border-blue-500" : "border-gray-300 dark:border-[#444746]")}>
                                            {allowedModules.includes(m.id) && <Check size={10} className="text-primary" />}
                                        </div>
                                        {m.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {roleError && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-700 font-medium">{roleError}</p>
                        </div>
                    )}

                    <PrimaryButton onClick={handleSaveRoles}>Save Permissions</PrimaryButton>
                </div>
            </Modal>

            <Modal title="Add Member to Project" isOpen={isAddUserOpen} onClose={() => setIsAddUserOpen(false)}>
                <div className="space-y-4">
                    <div className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search registered users..."
                            className="bg-gray-100 dark:bg-surface border-none rounded-lg pl-10 pr-4 py-2.5 text-sm w-full outline-none focus:ring-2 focus:ring-primary-light"
                            value={addUserSearch}
                            onChange={e => setAddUserSearch(e.target.value)}
                        />
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                        {searchableUsers.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">{addUserSearch ? 'No matching users found.' : 'Start typing to search users...'}</p>
                        ) : (
                            searchableUsers.map(u => (
                                <div key={u.id} className="flex items-center justify-between p-3 border border-gray-100 dark:border-[#444746] rounded-lg hover:bg-gray-50 dark:hover:bg-[#131314]">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary-light text-primary flex items-center justify-center text-xs font-bold">{u.name.charAt(0)}</div>
                                        <div className="text-sm">
                                            <div className="font-medium text-gray-900 dark:text-white">{u.name}</div>
                                            <div className="text-gray-500">{u.email}</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleAddUserInit(u.id)}
                                        className="text-xs bg-white dark:bg-surface border border-gray-300 dark:border-[#444746] px-3 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-[#131314] font-medium"
                                    >
                                        Select
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </Modal>

            <ConfirmationModal
                isOpen={!!removeConfirmation}
                onClose={() => setRemoveConfirmation(null)}
                onConfirm={() => {
                    if (removeConfirmation) removeProjectAccess(removeConfirmation, projectId);
                    setRemoveConfirmation(null);
                }}
                title="Remove Team Member?"
                message="Are you sure you want to remove this user from the project?"
                description="They will lose access to all project data and modules."
                confirmText="Remove Member"
                variant="danger"
                icon="trash"
            />

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
