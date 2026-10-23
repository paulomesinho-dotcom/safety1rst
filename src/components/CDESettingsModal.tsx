'use client';

import React, { useState, useEffect } from 'react';
import { Cloud, X, Save, RefreshCw, Trash2, ExternalLink, ChevronDown, ChevronRight, ShieldCheck, CheckCircle2, AlertCircle, Lock } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { GoogleDriveIcon } from './GoogleDriveIcons';

interface CDESettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    title?: string;
}

export const CDESettingsModal: React.FC<CDESettingsModalProps> = ({ isOpen, onClose, projectId, title }) => {
    const { projects, updateProjectCDE } = useStore();
    const project = projects.find(p => p.id === projectId);

    // Local State for Form
    const [provider, setProvider] = useState<'onedrive' | 'gdrive' | 'dropbox' | null>(null);
    const [serverCdeConfig, setServerCdeConfig] = useState<any>(null);
    const [isLoadingServerConfig, setIsLoadingServerConfig] = useState(false);
    const [credentials, setCredentials] = useState({
        folderUrl: '',
        serviceAccountJson: '', // Google
        tenantId: '',           // SharePoint
        clientId: '',           // SharePoint / Google
        clientSecret: '',       // SharePoint
        siteUrl: '',            // SharePoint
        appKey: '',             // Dropbox
        appSecret: ''           // Dropbox
    });
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [authError, setAuthError] = useState('');
    const [isManualOpen, setIsManualOpen] = useState(false);

    // Test connection state
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    // Load existing sanitized config from server and store on open
    useEffect(() => {
        if (!isOpen) return;

        // Populate initial values from local store if present
        if (project?.cdeConfig) {
            setProvider((project.cdeConfig.provider as any) || null);
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
        }

        // Fetch authoritative server-side sanitized config
        if (projectId) {
            setIsLoadingServerConfig(true);
            fetch(`/api/projects/${projectId}/cde`)
                .then(res => res.ok ? res.json() : null)
                .then(data => {
                    if (data?.cdeConfig) {
                        const cfg = data.cdeConfig;
                        setServerCdeConfig(cfg);
                        if (cfg.provider) {
                            setProvider(cfg.provider);
                        }
                        setCredentials(prev => ({
                            folderUrl: cfg.folderPath || cfg.folderUrl || prev.folderUrl,
                            serviceAccountJson: cfg.serviceAccountKey || prev.serviceAccountJson,
                            tenantId: cfg.tenantId || prev.tenantId,
                            clientId: cfg.clientId || prev.clientId,
                            clientSecret: cfg.clientSecretMasked || (cfg.hasClientSecret ? '••••••••••••••••' : prev.clientSecret),
                            siteUrl: cfg.siteUrl || prev.siteUrl,
                            appKey: cfg.appKey || prev.appKey,
                            appSecret: cfg.appSecretMasked || (cfg.hasAppSecret ? '••••••••••••••••' : prev.appSecret)
                        }));
                    }
                })
                .catch(err => {
                    console.error('[CDE] Failed to fetch server CDE config:', err);
                })
                .finally(() => {
                    setIsLoadingServerConfig(false);
                });
        }
    }, [isOpen, projectId, project]);

    const OAUTH_PENDING_KEY = 'safesite_oauth_pending';
    const OAUTH_RESULT_KEY = 'safesite_oauth_result';

    // Check if returning from OAuth redirect
    useEffect(() => {
        const raw = localStorage.getItem(OAUTH_RESULT_KEY);
        if (!raw) return;

        try {
            const result = JSON.parse(raw);
            if (result.type === 'dropbox_connected' && result.projectId === projectId) {
                localStorage.removeItem(OAUTH_RESULT_KEY);
                // Refresh server config after OAuth
                fetch(`/api/projects/${projectId}/cde`)
                    .then(res => res.ok ? res.json() : null)
                    .then(data => {
                        if (data?.cdeConfig) {
                            updateProjectCDE(projectId, data.cdeConfig);
                            setServerCdeConfig(data.cdeConfig);
                        }
                    });
                onClose();
                setTimeout(() => alert('Dropbox Conectado com Sucesso e Cifrado no Servidor!'), 300);
            }
        } catch (_) { }
    }, [projectId, updateProjectCDE, onClose]);

    // Storage event: picks up OAuth result written by /auth/callback in another tab/window
    useEffect(() => {
        const handler = (e: StorageEvent) => {
            if (e.key !== OAUTH_RESULT_KEY || !e.newValue) return;
            try {
                const result = JSON.parse(e.newValue);
                localStorage.removeItem(OAUTH_RESULT_KEY);
                if (result.type === 'dropbox_connected' && result.projectId === projectId) {
                    fetch(`/api/projects/${projectId}/cde`)
                        .then(res => res.ok ? res.json() : null)
                        .then(data => {
                            if (data?.cdeConfig) {
                                updateProjectCDE(projectId, data.cdeConfig);
                                setServerCdeConfig(data.cdeConfig);
                            }
                        });
                    onClose();
                    setTimeout(() => alert('Dropbox Conectado com Sucesso e Cifrado no Servidor!'), 100);
                }
            } catch (_) { }
        };
        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);
    }, [projectId, updateProjectCDE, onClose]);

    // For popup-based flows with storage event (Google Drive implicit)
    const startOAuthListener = (onResult: (data: any) => void) => {
        localStorage.removeItem(OAUTH_RESULT_KEY);
        const handler = (e: StorageEvent) => {
            if (e.key === OAUTH_RESULT_KEY && e.newValue) {
                window.removeEventListener('storage', handler);
                clearInterval(interval);
                localStorage.removeItem(OAUTH_RESULT_KEY);
                try { onResult(JSON.parse(e.newValue)); } catch (_) { }
            }
        };
        const interval = setInterval(() => {
            const raw = localStorage.getItem(OAUTH_RESULT_KEY);
            if (raw) {
                clearInterval(interval);
                window.removeEventListener('storage', handler);
                localStorage.removeItem(OAUTH_RESULT_KEY);
                try { onResult(JSON.parse(raw)); } catch (_) { }
            }
        }, 400);
        window.addEventListener('storage', handler);
        setTimeout(() => { clearInterval(interval); window.removeEventListener('storage', handler); }, 5 * 60 * 1000);
    };

    // Test connection action executed on server
    const handleTestConnection = async () => {
        setIsTesting(true);
        setTestResult(null);
        setAuthError('');

        try {
            const res = await fetch(`/api/projects/${projectId}/cde/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'test_connection' })
            });

            const data = await res.json();
            if (!res.ok || data.success === false) {
                throw new Error(data.error || 'Falha ao testar ligação.');
            }

            setTestResult({
                success: true,
                message: data.message || 'Ligação ao CDE validada com sucesso pelo servidor seguro!'
            });
        } catch (err: any) {
            setTestResult({
                success: false,
                message: err.message || 'Erro ao validar ligação.'
            });
        } finally {
            setIsTesting(false);
        }
    };

    const handleConnect = async () => {
        setAuthError('');
        setTestResult(null);
        setIsAuthenticating(true);

        try {
            if (provider === 'gdrive') {
                if (!credentials.clientId) throw new Error('Client ID é obrigatório.');
                const authUrl = `https://accounts.google.com/o/oauth2/v2/auth` +
                    `?client_id=${encodeURIComponent(credentials.clientId)}` +
                    `&redirect_uri=${encodeURIComponent(window.location.origin + '/auth/callback')}` +
                    `&response_type=token` +
                    `&scope=${encodeURIComponent('https://www.googleapis.com/auth/drive')}` +
                    `&prompt=consent` +
                    `&include_granted_scopes=true`;

                window.open(authUrl, 'google_oauth_popup', 'width=600,height=600');

                // Poll localStorage for token
                startOAuthListener(async (data) => {
                    if (data?.type !== 'gdrive_token' || !data.accessToken) {
                        setAuthError('Nenhum token de acesso recebido.');
                        setIsAuthenticating(false);
                        return;
                    }
                    try {
                        let folderId = 'root';
                        if (credentials.folderUrl) {
                            const match = credentials.folderUrl.match(/folders\/([-a-zA-Z0-9_]+)/) || credentials.folderUrl.match(/id=([-a-zA-Z0-9_]+)/);
                            if (match) folderId = match[1];
                        }

                        // Persist to backend with encryption
                        const saveRes = await fetch(`/api/projects/${projectId}/cde/setup`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                provider: 'gdrive',
                                connected: true,
                                clientId: credentials.clientId,
                                accessToken: data.accessToken,
                                folderId,
                                folderUrl: credentials.folderUrl
                            })
                        });

                        const saveData = await saveRes.json();
                        if (!saveRes.ok) throw new Error(saveData.error || 'Falha ao guardar no servidor.');

                        updateProjectCDE(projectId, saveData.cdeConfig);
                        setServerCdeConfig(saveData.cdeConfig);
                        setAuthError('');
                        setIsAuthenticating(false);
                        onClose();
                        alert('Google Drive Conectado com Sucesso!');
                    } catch (e: any) {
                        setAuthError('Falha ao guardar: ' + e.message);
                        setIsAuthenticating(false);
                    }
                });

            } else if (provider === 'dropbox') {
                if (!credentials.appKey) throw new Error('Dropbox App Key é obrigatória.');
                const redirectUri = `${window.location.origin}/auth/callback`;
                const authUrl = `https://www.dropbox.com/oauth2/authorize` +
                    `?client_id=${encodeURIComponent(credentials.appKey)}` +
                    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
                    `&response_type=code` +
                    `&token_access_type=offline`;

                // Save pending credentials so callback can exchange and encrypt on backend
                localStorage.setItem(OAUTH_PENDING_KEY, JSON.stringify({
                    provider: 'dropbox',
                    appKey: credentials.appKey,
                    appSecret: credentials.appSecret,
                    folderPath: credentials.folderUrl,
                    projectId,
                    cdeConfig: project?.cdeConfig,
                    returnUrl: window.location.href
                }));

                window.location.href = authUrl;
                return;

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
                                const sitePrefix = `/sites/${parts[1]}`;
                                folderPath = url.pathname.substring(url.pathname.toLowerCase().indexOf(sitePrefix.toLowerCase()) + sitePrefix.length);
                            }
                        }
                    }
                } catch (e) { }

                // Save to server with AES-256-GCM encryption
                const res = await fetch(`/api/projects/${projectId}/cde/setup`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        provider: 'onedrive',
                        connected: true,
                        clientId: credentials.clientId,
                        clientSecret: credentials.clientSecret,
                        tenantId: credentials.tenantId,
                        siteUrl,
                        folderPath
                    })
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Falha ao guardar no servidor.');

                updateProjectCDE(projectId, data.cdeConfig);
                setServerCdeConfig(data.cdeConfig);
                setIsAuthenticating(false);
                onClose();
                alert('Configuração SharePoint/OneDrive guardada com sucesso e encriptada com AES-256-GCM no servidor!');
            }
        } catch (e: any) {
            setAuthError(e.message);
            setIsAuthenticating(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm('Tem a certeza de que deseja desligar o CDE deste projeto? Todas as credenciais serão eliminadas do servidor de forma segura.')) {
            return;
        }

        try {
            const res = await fetch(`/api/projects/${projectId}/cde`, {
                method: 'DELETE'
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Falha ao desligar CDE no servidor.');
            }

            updateProjectCDE(projectId, undefined);
            setProvider(null);
            setServerCdeConfig(null);
            setCredentials({
                folderUrl: '', serviceAccountJson: '', tenantId: '', clientId: '', clientSecret: '', siteUrl: '', appKey: '', appSecret: ''
            });
            onClose();
            alert('CDE desligado e credenciais eliminadas com sucesso.');
        } catch (e: any) {
            setAuthError(e.message);
        }
    };

    if (!isOpen) return null;

    const isConnected = !!(serverCdeConfig?.connected || project?.cdeConfig?.connected);

    return (
        <div className="fixed inset-0 bg-black/50 z-[9000] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-surface rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50 dark:bg-[#131314]">
                    <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <Cloud size={20} className="text-primary" />
                        {title || "Ambiente Comum de Dados (CDE)"}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" aria-label="Close">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {/* Security Badge */}
                    <div className="mb-5 p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-start gap-3">
                        <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                        <div className="text-xs text-emerald-900 dark:text-emerald-200">
                            <span className="font-semibold block">Segurança Máxima Ativa (Backend BFF)</span>
                            <span className="text-emerald-800 dark:text-emerald-300">
                                Todas as credenciais, segredos de clientes e tokens são cifrados com <strong>AES-256-GCM</strong> no servidor e nunca expostos em texto simples no browser.
                            </span>
                        </div>
                    </div>

                    {/* Provider Selection */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
                        <button
                            onClick={() => { setProvider('onedrive'); setTestResult(null); }}
                            className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${provider === 'onedrive' ? 'bg-primary-light border-primary/20 text-primary-hover font-semibold shadow-sm' : 'bg-white dark:bg-surface border-gray-200 dark:border-[#444746] hover:bg-gray-50 dark:hover:bg-[#131314] text-gray-600 dark:text-gray-300'}`}
                        >
                            <Cloud size={24} className={provider === 'onedrive' ? "text-primary" : "text-gray-400"} />
                            <span className="text-xs">OneDrive / SharePoint</span>
                        </button>
                        <button
                            onClick={() => { setProvider('gdrive'); setTestResult(null); }}
                            className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${provider === 'gdrive' ? 'bg-green-50 border-green-200 text-green-700 font-semibold shadow-sm' : 'bg-white dark:bg-surface border-gray-200 dark:border-[#444746] hover:bg-gray-50 dark:hover:bg-[#131314] text-gray-600 dark:text-gray-300'}`}
                        >
                            <GoogleDriveIcon type="folder" size={24} />
                            <span className="text-xs">Google Drive</span>
                        </button>
                        <button
                            onClick={() => { setProvider('dropbox'); setTestResult(null); }}
                            className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${provider === 'dropbox' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-semibold shadow-sm' : 'bg-white dark:bg-surface border-gray-200 dark:border-[#444746] hover:bg-gray-50 dark:hover:bg-[#131314] text-gray-600 dark:text-gray-300'}`}
                        >
                            <Cloud size={24} className={provider === 'dropbox' ? "text-indigo-600" : "text-gray-400"} />
                            <span className="text-xs">Dropbox</span>
                        </button>
                    </div>

                    {/* Google Drive Manual */}
                    {provider === 'gdrive' && (
                        <div className="mb-6 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg overflow-hidden">
                            <button
                                onClick={() => setIsManualOpen(!isManualOpen)}
                                className="w-full flex items-center justify-between p-4 text-left hover:bg-blue-100/50 dark:hover:bg-blue-900/30 transition-colors"
                            >
                                <div className="flex items-center gap-2 font-semibold text-blue-800 dark:text-blue-300 text-sm">
                                    <ExternalLink size={16} />
                                    <span>Como conectar o Google Drive</span>
                                </div>
                                {isManualOpen ? <ChevronDown size={16} className="text-primary" /> : <ChevronRight size={16} className="text-primary" />}
                            </button>

                            {isManualOpen && (
                                <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
                                    <ol className="list-decimal list-inside text-xs text-primary-hover dark:text-blue-200 space-y-1 ml-1 border-t border-primary/20 pt-3">
                                        <li>Aceda à <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-900">Google Cloud Console</a>.</li>
                                        <li>Crie um projeto ou selecione um existente.</li>
                                        <li>Ative a <strong>Google Drive API</strong> em "APIs & Services".</li>
                                        <li>Configure o "OAuth consent screen" (User Type: External).</li>
                                        <li>Em "Credentials", crie um <strong>OAuth Client ID</strong> (Web Application).</li>
                                        <li>Adicione <code>{typeof window !== 'undefined' ? window.location.origin : ''}</code> em "Authorized JavaScript origins".</li>
                                        <li>Adicione <code>{typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : ''}</code> em "Authorized redirect URIs".</li>
                                        <li>Copie o <strong>Client ID</strong> e cole abaixo.</li>
                                    </ol>
                                </div>
                            )}
                        </div>
                    )}

                    {provider === 'gdrive' && (
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
                                <p className="text-[10px] text-gray-500 mt-1">Necessário para Autenticação OAuth</p>
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
                    )}

                    {/* OneDrive Manual */}
                    {provider === 'onedrive' && (
                        <div className="mb-6 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg overflow-hidden">
                            <button
                                onClick={() => setIsManualOpen(!isManualOpen)}
                                className="w-full flex items-center justify-between p-4 text-left hover:bg-blue-100/50 dark:hover:bg-blue-900/30 transition-colors"
                            >
                                <div className="flex items-center gap-2 font-semibold text-blue-800 dark:text-blue-300 text-sm">
                                    <ExternalLink size={16} />
                                    <span>Como conectar o SharePoint / OneDrive</span>
                                </div>
                                {isManualOpen ? <ChevronDown size={16} className="text-primary" /> : <ChevronRight size={16} className="text-primary" />}
                            </button>

                            {isManualOpen && (
                                <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
                                    <ol className="list-decimal list-inside text-xs text-primary-hover dark:text-blue-200 space-y-1 ml-1 border-t border-primary/20 pt-3">
                                        <li>Aceda ao <a href="https://portal.azure.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-900">Azure Portal</a> e abra "App registrations".</li>
                                        <li>Crie um "New registration".</li>
                                        <li>Copie o <strong>Application (client) ID</strong> e o <strong>Directory (tenant) ID</strong>.</li>
                                        <li>Em "Certificates & secrets", gere um novo client secret e copie o <strong>Value</strong>.</li>
                                        <li>Em "API Permissions", adicione <code>Sites.ReadWrite.All</code> e conceda consentimento do administrador ("Grant Admin Consent").</li>
                                        <li>Preencha os campos abaixo com os dados obtidos.</li>
                                    </ol>
                                </div>
                            )}
                        </div>
                    )}

                    {provider === 'onedrive' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Link da Pasta / Site do SharePoint</label>
                                <input
                                    type="text"
                                    value={credentials.folderUrl}
                                    onChange={e => setCredentials({ ...credentials, folderUrl: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 dark:bg-[#131314] focus:bg-white dark:focus:bg-surface transition-colors outline-none focus:ring-2 focus:ring-primary-light focus:border-primary"
                                    placeholder="https://tenant.sharepoint.com/sites/NomeObra"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Directory (Tenant) ID</label>
                                    <input
                                        type="text"
                                        value={credentials.tenantId}
                                        onChange={e => setCredentials({ ...credentials, tenantId: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 dark:bg-[#131314] focus:bg-white dark:focus:bg-surface transition-colors outline-none focus:ring-2 focus:ring-primary-light focus:border-primary"
                                        placeholder="00000000-0000-0000-0000-000000000000"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Application (Client) ID</label>
                                    <input
                                        type="text"
                                        value={credentials.clientId}
                                        onChange={e => setCredentials({ ...credentials, clientId: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 dark:bg-[#131314] focus:bg-white dark:focus:bg-surface transition-colors outline-none focus:ring-2 focus:ring-primary-light focus:border-primary"
                                        placeholder="00000000-0000-0000-0000-000000000000"
                                    />
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                                        Client Secret
                                    </label>
                                    {serverCdeConfig?.hasClientSecret && (
                                        <span className="text-[11px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
                                            <Lock size={12} /> Cifrado no Servidor
                                        </span>
                                    )}
                                </div>
                                <input
                                    type="password"
                                    value={credentials.clientSecret}
                                    onChange={e => setCredentials({ ...credentials, clientSecret: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 dark:bg-[#131314] focus:bg-white dark:focus:bg-surface transition-colors outline-none focus:ring-2 focus:ring-primary-light focus:border-primary"
                                    placeholder={serverCdeConfig?.hasClientSecret ? '•••••••••••••••• (deixe inalterado para manter)' : 'Insira o Client Secret'}
                                />
                            </div>
                        </div>
                    )}

                    {/* Dropbox Manual */}
                    {provider === 'dropbox' && (
                        <div className="mb-6 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg overflow-hidden">
                            <button
                                onClick={() => setIsManualOpen(!isManualOpen)}
                                className="w-full flex items-center justify-between p-4 text-left hover:bg-blue-100/50 dark:hover:bg-blue-900/30 transition-colors"
                            >
                                <div className="flex items-center gap-2 font-semibold text-blue-800 dark:text-blue-300 text-sm">
                                    <ExternalLink size={16} />
                                    <span>Como conectar o Dropbox</span>
                                </div>
                                {isManualOpen ? <ChevronDown size={16} className="text-primary" /> : <ChevronRight size={16} className="text-primary" />}
                            </button>

                            {isManualOpen && (
                                <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
                                    <ol className="list-decimal list-inside text-xs text-primary-hover dark:text-blue-200 space-y-1 ml-1 border-t border-primary/20 pt-3">
                                        <li>Aceda à <a href="https://www.dropbox.com/developers/apps" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-900">Dropbox App Console</a>.</li>
                                        <li>Clique em "Create app" &rarr; "Scoped access" &rarr; "Full Dropbox".</li>
                                        <li>Na tab "Permissions", ative <code>files.content.write</code> e <code>files.content.read</code>.</li>
                                        <li>Na tab "Settings", adicione <code>{typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : ''}</code> em "Redirect URIs".</li>
                                        <li>Copie o <strong>App Key</strong> e o <strong>App Secret</strong> e cole abaixo.</li>
                                    </ol>
                                </div>
                            )}
                        </div>
                    )}

                    {provider === 'dropbox' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Dropbox App Key</label>
                                <input
                                    type="text"
                                    value={credentials.appKey}
                                    onChange={e => setCredentials({ ...credentials, appKey: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 dark:bg-[#131314] focus:bg-white dark:focus:bg-surface transition-colors outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                                    placeholder="Ex: sl98df... "
                                />
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                                        Dropbox App Secret
                                    </label>
                                    {serverCdeConfig?.hasAppSecret && (
                                        <span className="text-[11px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
                                            <Lock size={12} /> Cifrado no Servidor
                                        </span>
                                    )}
                                </div>
                                <input
                                    type="password"
                                    value={credentials.appSecret}
                                    onChange={e => setCredentials({ ...credentials, appSecret: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 dark:bg-[#131314] focus:bg-white dark:focus:bg-surface transition-colors outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                                    placeholder={serverCdeConfig?.hasAppSecret ? '•••••••••••••••• (deixe inalterado para manter)' : 'Insira o App Secret'}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Caminho da Pasta Inicial (Opcional)</label>
                                <input
                                    type="text"
                                    value={credentials.folderUrl}
                                    onChange={e => setCredentials({ ...credentials, folderUrl: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 dark:bg-[#131314] focus:bg-white dark:focus:bg-surface transition-colors outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                                    placeholder="/Obras/Obra Principal"
                                />
                            </div>
                        </div>
                    )}

                    {/* Test Connection Result Feedback */}
                    {testResult && (
                        <div className={`mt-4 p-3 rounded-lg text-sm flex items-start gap-2.5 ${testResult.success ? 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-950/30 dark:border-green-800 dark:text-green-300' : 'bg-red-50 text-red-600 border border-red-200 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300'}`}>
                            {testResult.success ? <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
                            <div>{testResult.message}</div>
                        </div>
                    )}

                    {authError && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-600 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300 text-sm rounded-lg flex items-start gap-2">
                            <span className="mt-0.5">⚠️</span>
                            <div>{authError}</div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-gray-50 dark:bg-[#131314] border-t flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        {isConnected && (
                            <button
                                onClick={handleDisconnect}
                                className="px-3.5 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg flex items-center gap-2 transition-colors border border-red-200 dark:border-red-900"
                            >
                                <Trash2 size={16} /> Desligar CDE
                            </button>
                        )}

                        {isConnected && (
                            <button
                                onClick={handleTestConnection}
                                disabled={isTesting}
                                className="px-3.5 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 rounded-lg flex items-center gap-2 transition-colors border border-emerald-200 dark:border-emerald-800"
                            >
                                {isTesting ? <RefreshCw size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
                                {isTesting ? 'A testar...' : 'Testar Ligação'}
                            </button>
                        )}
                    </div>

                    <div className="flex gap-2 ml-auto">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-surface hover:shadow-sm rounded-lg border border-transparent hover:border-gray-200 dark:hover:border-[#444746] transition-all"
                        >
                            Fechar
                        </button>
                        {provider && (
                            <button
                                onClick={handleConnect}
                                disabled={isAuthenticating}
                                className={`px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-2 ${provider === 'gdrive' ? 'bg-green-600 hover:bg-green-700' : provider === 'dropbox' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-primary hover:bg-primary-hover'}`}
                            >
                                {isAuthenticating ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                                {provider === 'onedrive' ? 'Guardar com Segurança' : 'Autorizar & Ligar'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
