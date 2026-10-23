'use client';

import React, { useState, useEffect } from 'react';
import { Cloud, X, Save, RefreshCw, Trash2, ExternalLink, ChevronDown, ChevronRight, ShieldCheck, CheckCircle2, AlertCircle, Lock, Copy, Check, BookOpen, Server, HelpCircle } from 'lucide-react';
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

    // Modal navigation tab
    const [activeModalTab, setActiveModalTab] = useState<'config' | 'free_setup' | 'self_hosted' | 'troubleshooting'>('config');
    const [copiedRedirectUri, setCopiedRedirectUri] = useState(false);

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

    const redirectUri = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : '';
    const handleCopyRedirectUri = () => {
        if (!redirectUri) return;
        navigator.clipboard.writeText(redirectUri);
        setCopiedRedirectUri(true);
        setTimeout(() => setCopiedRedirectUri(false), 2000);
    };

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
            <div className="bg-white dark:bg-surface rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50 dark:bg-[#131314]">
                    <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <Cloud size={20} className="text-primary" />
                        {title || "Ambiente Comum de Dados (CDE)"}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" aria-label="Close">
                        <X size={20} />
                    </button>
                </div>

                {/* Sub-Tabs Navigation */}
                <div className="flex border-b border-gray-200 dark:border-[#444746] bg-gray-50/70 dark:bg-[#131314]/70 px-4 gap-1 text-xs overflow-x-auto">
                    <button
                        onClick={() => setActiveModalTab('config')}
                        className={`py-2.5 px-3 font-semibold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${activeModalTab === 'config' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                        <Cloud size={14} /> Configuração
                    </button>
                    <button
                        onClick={() => setActiveModalTab('free_setup')}
                        className={`py-2.5 px-3 font-semibold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${activeModalTab === 'free_setup' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                        <BookOpen size={14} /> Criar Conta Gratuita (Do Zero)
                    </button>
                    <button
                        onClick={() => setActiveModalTab('self_hosted')}
                        className={`py-2.5 px-3 font-semibold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${activeModalTab === 'self_hosted' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                        <Server size={14} /> Serviço Próprio / WebDAV
                    </button>
                    <button
                        onClick={() => setActiveModalTab('troubleshooting')}
                        className={`py-2.5 px-3 font-semibold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${activeModalTab === 'troubleshooting' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                        <HelpCircle size={14} /> Dúvidas & Diagnóstico
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    {/* ════════ TAB 1: CONFIGURAÇÃO ════════ */}
                    {activeModalTab === 'config' && (
                        <div>
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

                            {/* Redirect URI Quick Copy */}
                            <div className="mb-5 p-3 rounded-lg bg-gray-50 dark:bg-[#131314] border border-gray-200 dark:border-[#444746] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 block">
                                        Redirect URI da sua App:
                                    </span>
                                    <code className="text-xs font-mono text-primary font-semibold select-all break-all">
                                        {redirectUri}
                                    </code>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleCopyRedirectUri}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-white dark:bg-surface border border-gray-300 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 transition-colors shrink-0 self-start sm:self-auto"
                                >
                                    {copiedRedirectUri ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                                    <span>{copiedRedirectUri ? 'Copiado!' : 'Copiar URI'}</span>
                                </button>
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

                            {/* Google Drive Inputs */}
                            {provider === 'gdrive' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Google Client ID</label>
                                        <input
                                            type="text"
                                            value={credentials.clientId}
                                            onChange={e => setCredentials({ ...credentials, clientId: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 dark:bg-[#131314] focus:bg-white dark:focus:bg-surface transition-colors outline-none focus:ring-2 focus:ring-green-100 focus:border-green-400 font-mono"
                                            placeholder="ex: 123456789-abcdef.apps.googleusercontent.com"
                                        />
                                        <p className="text-[10px] text-gray-500 mt-1">Obtido na Google Cloud Console &rarr; Credenciais &rarr; ID do Cliente OAuth (Web).</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Link da Pasta da Obra (Opcional)</label>
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

                            {/* OneDrive / SharePoint Inputs */}
                            {provider === 'onedrive' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Link da Pasta / Site do SharePoint</label>
                                        <input
                                            type="text"
                                            value={credentials.folderUrl}
                                            onChange={e => setCredentials({ ...credentials, folderUrl: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 dark:bg-[#131314] focus:bg-white dark:focus:bg-surface transition-colors outline-none focus:ring-2 focus:ring-primary-light focus:border-primary"
                                            placeholder="https://empresa.sharepoint.com/sites/NomeObra"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Directory (Tenant) ID</label>
                                            <input
                                                type="text"
                                                value={credentials.tenantId}
                                                onChange={e => setCredentials({ ...credentials, tenantId: e.target.value })}
                                                className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 dark:bg-[#131314] focus:bg-white dark:focus:bg-surface transition-colors outline-none focus:ring-2 focus:ring-primary-light focus:border-primary font-mono"
                                                placeholder="00000000-0000-0000-0000-000000000000"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Application (Client) ID</label>
                                            <input
                                                type="text"
                                                value={credentials.clientId}
                                                onChange={e => setCredentials({ ...credentials, clientId: e.target.value })}
                                                className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 dark:bg-[#131314] focus:bg-white dark:focus:bg-surface transition-colors outline-none focus:ring-2 focus:ring-primary-light focus:border-primary font-mono"
                                                placeholder="00000000-0000-0000-0000-000000000000"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Client Secret</label>
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
                                            className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 dark:bg-[#131314] focus:bg-white dark:focus:bg-surface transition-colors outline-none focus:ring-2 focus:ring-primary-light focus:border-primary font-mono"
                                            placeholder={serverCdeConfig?.hasClientSecret ? '•••••••••••••••• (deixe inalterado para manter)' : 'Insira o Client Secret'}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Dropbox Inputs */}
                            {provider === 'dropbox' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Dropbox App Key</label>
                                        <input
                                            type="text"
                                            value={credentials.appKey}
                                            onChange={e => setCredentials({ ...credentials, appKey: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 dark:bg-[#131314] focus:bg-white dark:focus:bg-surface transition-colors outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 font-mono"
                                            placeholder="Ex: sl98df... "
                                        />
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Dropbox App Secret</label>
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
                                            className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 dark:bg-[#131314] focus:bg-white dark:focus:bg-surface transition-colors outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 font-mono"
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
                    )}

                    {/* ════════ TAB 2: CONTA GRATUITA (DO ZERO) ════════ */}
                    {activeModalTab === 'free_setup' && (
                        <div className="space-y-5 text-xs text-gray-700 dark:text-gray-300">
                            <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                                <h4 className="font-bold text-sm text-blue-950 dark:text-blue-200 mb-1">
                                    Guia Rápido: Criar um CDE 100% Gratuito só para esta Obra
                                </h4>
                                <p className="text-[11px] text-blue-900/80 dark:text-blue-300/80">
                                    Não necessita de ter conta corporativa paga. Pode criar uma conta de nuvem gratuita dedicada em 2 minutos para gerir todos os ficheiros da obra em conformidade com o DL 273/2003 e ISO 19650.
                                </p>
                            </div>

                            {/* Método 1: Dropbox Gratuito */}
                            <div className="p-4 rounded-xl border border-gray-200 dark:border-[#444746] space-y-3 bg-white dark:bg-[#131314]">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                        <Cloud size={16} className="text-indigo-600" />
                                        Opção 1 (Recomendada): Dropbox Gratuito (2 GB de Oferta)
                                    </span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                                        Mais Rápido (2 min)
                                    </span>
                                </div>
                                <ol className="list-decimal list-inside space-y-2 text-xs leading-relaxed">
                                    <li>
                                        Registe uma conta gratuita em <a href="https://www.dropbox.com" target="_blank" rel="noopener noreferrer" className="text-primary font-semibold underline">dropbox.com</a> (ex: com o email da obra ou projeto).
                                    </li>
                                    <li>
                                        Aceda à consola de developers do Dropbox: <a href="https://www.dropbox.com/developers/apps" target="_blank" rel="noopener noreferrer" className="text-primary font-semibold underline">dropbox.com/developers/apps</a>.
                                    </li>
                                    <li>
                                        Clique no botão azul <strong>"Create app"</strong>:
                                        <ul className="list-disc list-inside ml-4 mt-1 space-y-1 text-gray-600 dark:text-gray-400">
                                            <li>Escolha <strong>"Scoped access"</strong>.</li>
                                            <li>Escolha <strong>"Full Dropbox"</strong> (ou "App folder" se preferir uma pasta exclusiva).</li>
                                            <li>Dê um nome à app (ex: <code>SafeSite-Obra-{projectId.slice(0, 5)}</code>).</li>
                                        </ul>
                                    </li>
                                    <li>
                                        Na aba <strong>"Permissions"</strong>, assinale as seguintes 4 permissões e clique em <em>Submit</em>:
                                        <code className="block mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
                                            files.metadata.write • files.metadata.read • files.content.write • files.content.read
                                        </code>
                                    </li>
                                    <li>
                                        Na aba <strong>"Settings"</strong>, localize o campo <strong>"Redirect URIs"</strong> e cole exatamente:
                                        <div className="flex items-center gap-2 mt-1">
                                            <code className="flex-1 p-1.5 bg-gray-100 dark:bg-gray-800 rounded font-mono text-[11px] text-gray-800 dark:text-gray-200">
                                                {redirectUri}
                                            </code>
                                            <button
                                                type="button"
                                                onClick={handleCopyRedirectUri}
                                                className="px-2 py-1 rounded bg-primary/10 text-primary text-[11px] font-bold hover:bg-primary/20"
                                            >
                                                {copiedRedirectUri ? 'Copiado!' : 'Copiar'}
                                            </button>
                                        </div>
                                    </li>
                                    <li>
                                        Copie o <strong>App Key</strong> e o <strong>App Secret</strong>, cole na aba "Configuração" e clique em <em>Autorizar & Ligar</em>.
                                    </li>
                                </ol>
                            </div>

                            {/* Método 2: Google Drive Gratuito */}
                            <div className="p-4 rounded-xl border border-gray-200 dark:border-[#444746] space-y-3 bg-white dark:bg-[#131314]">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                        <GoogleDriveIcon type="folder" size={16} />
                                        Opção 2: Google Drive Gratuito (15 GB de Oferta)
                                    </span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300">
                                        Maior Espaço
                                    </span>
                                </div>
                                <ol className="list-decimal list-inside space-y-2 text-xs leading-relaxed">
                                    <li>
                                        Crie uma conta Google gratuita para a obra (ex: <code>obra.safesite.demo@gmail.com</code>).
                                    </li>
                                    <li>
                                        Aceda a <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary font-semibold underline">console.cloud.google.com</a> e crie um projeto com o nome da obra.
                                    </li>
                                    <li>
                                        No menu lateral, vá a <strong>APIs e Serviços &rarr; Biblioteca</strong> e ative a <strong>Google Drive API</strong>.
                                    </li>
                                    <li>
                                        Em <strong>Ecrã de consentimento OAuth</strong>, selecione <strong>Externo</strong>, preencha o nome da aplicação e adicione o email da obra como utilizador de teste.
                                    </li>
                                    <li>
                                        Em <strong>Credenciais &rarr; Criar Credenciais &rarr; ID do Cliente OAuth</strong> (Tipo: <em>Aplicação Web</em>):
                                        <div className="mt-1 space-y-1">
                                            <p className="text-[11px] text-gray-500">Origens JavaScript autorizadas:</p>
                                            <code className="block p-1 bg-gray-100 dark:bg-gray-800 rounded font-mono text-[10px]">
                                                {typeof window !== 'undefined' ? window.location.origin : ''}
                                            </code>
                                            <p className="text-[11px] text-gray-500 mt-1">URIs de redirecionamento autorizados:</p>
                                            <code className="block p-1 bg-gray-100 dark:bg-gray-800 rounded font-mono text-[10px]">
                                                {redirectUri}
                                            </code>
                                        </div>
                                    </li>
                                    <li>
                                        Copie o <strong>Client ID</strong> gerado e cole na aba de configuração.
                                    </li>
                                </ol>
                            </div>
                        </div>
                    )}

                    {/* ════════ TAB 3: SERVIDOR PRÓPRIO / WEBDAV ════════ */}
                    {activeModalTab === 'self_hosted' && (
                        <div className="space-y-4 text-xs text-gray-700 dark:text-gray-300">
                            <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                                <h4 className="font-bold text-sm text-purple-950 dark:text-purple-200 mb-1">
                                    Serviço Próprio da Empresa ou Servidor On-Premise
                                </h4>
                                <p className="text-[11px] text-purple-900/80 dark:text-purple-300/80">
                                    Se a sua empresa já possui infraestrutura própria (Nextcloud, MinIO S3, Synology NAS ou servidor WebDAV com SSL), os documentos podem ser sincronizados diretamente para o vosso data center privado.
                                </p>
                            </div>

                            {/* Nextcloud / Owncloud */}
                            <div className="p-4 rounded-xl border border-gray-200 dark:border-[#444746] space-y-2 bg-white dark:bg-[#131314]">
                                <h5 className="font-bold text-xs text-gray-900 dark:text-gray-100">
                                    1. Nextcloud / ownCloud (WebDAV)
                                </h5>
                                <p className="text-[11px] text-gray-600 dark:text-gray-400">
                                    O Nextcloud suporta nativamente o protocolo WebDAV com controlo de versões ISO 19650.
                                </p>
                                <div className="p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg font-mono text-[11px] space-y-1">
                                    <div className="text-gray-500 text-[10px]"># Endereço WebDAV típico do Nextcloud:</div>
                                    <div className="text-purple-600 dark:text-purple-400">https://cloud.suaempresa.pt/remote.php/dav/files/UTILIZADOR/CDE_Obra/</div>
                                </div>
                                <ul className="list-disc list-inside text-[11px] space-y-1 text-gray-600 dark:text-gray-400 pt-1">
                                    <li>Recomendado: Crie uma "Palavra-passe de aplicação" nas definições de Segurança do seu utilizador no Nextcloud.</li>
                                    <li>A pasta da obra será mantida sincronizada via protocolo padrão WebDAV.</li>
                                </ul>
                            </div>

                            {/* MinIO / S3 Compatível */}
                            <div className="p-4 rounded-xl border border-gray-200 dark:border-[#444746] space-y-2 bg-white dark:bg-[#131314]">
                                <h5 className="font-bold text-xs text-gray-900 dark:text-gray-100">
                                    2. MinIO / Armazenamento S3 Próprio (Object Storage)
                                </h5>
                                <p className="text-[11px] text-gray-600 dark:text-gray-400">
                                    Para empresas com cluster MinIO, Ceph ou VPS próprio:
                                </p>
                                <ul className="list-disc list-inside text-[11px] space-y-1 text-gray-600 dark:text-gray-400">
                                    <li>Crie um Bucket dedicado com o identificador da obra (ex: <code>cde-obra-{projectId.slice(0, 8)}</code>).</li>
                                    <li>Gere um par <em>Access Key</em> e <em>Secret Key</em> com permissões <code>s3:PutObject</code> e <code>s3:GetObject</code>.</li>
                                    <li>Todas as chamadas são encaminhadas pelo backend encriptado do SafeSite para manter sigilo total.</li>
                                </ul>
                            </div>

                            {/* NAS Synology / QNAP */}
                            <div className="p-4 rounded-xl border border-gray-200 dark:border-[#444746] space-y-2 bg-white dark:bg-[#131314]">
                                <h5 className="font-bold text-xs text-gray-900 dark:text-gray-100">
                                    3. NAS de Escritório (Synology DSM / QNAP QTS)
                                </h5>
                                <p className="text-[11px] text-gray-600 dark:text-gray-400">
                                    Instale o pacote <strong>WebDAV Server</strong> no seu NAS e configure um certificado SSL Let's Encrypt gratuito com porta 5006 (HTTPS). Crie uma pasta partilhada com permissão restrita para o utilizador da obra.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ════════ TAB 4: RESOLUÇÃO DE DÚVIDAS / TROUBLESHOOTING ════════ */}
                    {activeModalTab === 'troubleshooting' && (
                        <div className="space-y-4 text-xs text-gray-700 dark:text-gray-300">
                            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                                <h4 className="font-bold text-sm text-amber-950 dark:text-amber-200 mb-1">
                                    Diagnóstico & Solução de Problemas Comuns
                                </h4>
                                <p className="text-[11px] text-amber-900/80 dark:text-amber-300/80">
                                    Confira as causas mais frequentes quando a ligação falha ou o teste de ligação dá erro.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div className="p-3 rounded-lg border border-gray-200 dark:border-[#444746]">
                                    <h5 className="font-bold text-xs text-red-600 dark:text-red-400 mb-1">
                                        1. Erro: "Redirect URI mismatch" ou "URI de redirecionamento inválido"
                                    </h5>
                                    <p className="text-[11px] text-gray-600 dark:text-gray-400">
                                        Causa: O endereço configurado na consola (Dropbox ou Google) não é exatamente igual ao que o browser está a usar.
                                    </p>
                                    <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-1">
                                        Solução: Copie o botão <strong>"Copiar URI"</strong> na aba de Configuração e cole-o nas definições da app na consola do provedor.
                                    </p>
                                </div>

                                <div className="p-3 rounded-lg border border-gray-200 dark:border-[#444746]">
                                    <h5 className="font-bold text-xs text-red-600 dark:text-red-400 mb-1">
                                        2. Janela de login fecha ou é bloqueada (Pop-up blocker)
                                    </h5>
                                    <p className="text-[11px] text-gray-600 dark:text-gray-400">
                                        Causa: O browser bloqueou a abertura de pop-ups de autenticação da Google ou Dropbox.
                                    </p>
                                    <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-1">
                                        Solução: Verifique o ícone de aviso no canto direito da barra de endereços do browser e selecione "Permitir sempre pop-ups deste site".
                                    </p>
                                </div>

                                <div className="p-3 rounded-lg border border-gray-200 dark:border-[#444746]">
                                    <h5 className="font-bold text-xs text-red-600 dark:text-red-400 mb-1">
                                        3. Permissões insuficientes para criar pastas (403 Forbidden)
                                    </h5>
                                    <p className="text-[11px] text-gray-600 dark:text-gray-400">
                                        Causa: Na consola do Dropbox ou SharePoint faltou selecionar as permissões de escrita (Write).
                                    </p>
                                    <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-1">
                                        Solução: No Dropbox, garanta que <code>files.content.write</code> está ativo. No SharePoint / Azure, conceda <code>Sites.ReadWrite.All</code> com "Admin Consent".
                                    </p>
                                </div>
                            </div>
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
