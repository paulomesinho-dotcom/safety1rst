'use client';

import React, { useState, useEffect } from 'react';
import { Cloud, X, Check, Save, RefreshCw, Trash2, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { GoogleDriveIcon } from './GoogleDriveIcons';
import { refreshDropboxToken } from '@/lib/cde-manager';

interface CDESettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
}

export const CDESettingsModal: React.FC<CDESettingsModalProps> = ({ isOpen, onClose, projectId }) => {
    const { projects, updateProjectCDE } = useStore();
    const project = projects.find(p => p.id === projectId);

    // Local State for Form
    const [provider, setProvider] = useState<'onedrive' | 'gdrive' | 'dropbox' | null>(null);
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

    // Load existing config on open
    useEffect(() => {
        if (isOpen && project?.cdeConfig) {
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
        } else if (isOpen) {
            setProvider(null); // Reset if no config
            setCredentials({
                folderUrl: '', serviceAccountJson: '', tenantId: '', clientId: '', clientSecret: '', siteUrl: '', appKey: '', appSecret: ''
            });
        }
    }, [isOpen, project]);

    // Handle File Upload (Google JSON)
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const json = event.target?.result as string;
                    JSON.parse(json); // Validate
                    setCredentials(prev => ({ ...prev, serviceAccountJson: json }));
                } catch (e) {
                    setAuthError('Invalid JSON file.');
                }
            };
            reader.readAsText(file);
        }
    };

    const OAUTH_PENDING_KEY = 'safesite_oauth_pending';
    const OAUTH_RESULT_KEY = 'safesite_oauth_result';

    // Check if we're returning from an OAuth redirect and apply result (even if modal is closed)
    useEffect(() => {
        const raw = localStorage.getItem(OAUTH_RESULT_KEY);
        if (!raw) return;

        try {
            const result = JSON.parse(raw);

            if (result.type === 'dropbox_connected' && result.projectId === projectId) {
                // We found a pending result for THIS project! Consume it.
                localStorage.removeItem(OAUTH_RESULT_KEY);

                updateProjectCDE(projectId, {
                    provider: 'dropbox', connected: true, lastSync: new Date().toISOString(),
                    appKey: result.appKey, appSecret: result.appSecret,
                    accessToken: result.accessToken, refreshToken: result.refreshToken,
                    folderPath: result.folderPath
                } as any);

                // Option to close if somehow open, and show success
                onClose();
                setTimeout(() => alert('Dropbox Connected Successfully!'), 300);
            } else if (result.type === 'gdrive_token' && result.accessToken) {
                // Google Drive via implicit flow — handled separately
            }
        } catch (_) { }
    }, [projectId, updateProjectCDE]); // run when component mounts with this projectId

    // Storage event: picks up OAuth result written by /auth/callback in another tab/window
    useEffect(() => {
        const handler = (e: StorageEvent) => {
            if (e.key !== OAUTH_RESULT_KEY || !e.newValue) return;
            try {
                const result = JSON.parse(e.newValue);
                localStorage.removeItem(OAUTH_RESULT_KEY);
                if (result.type === 'dropbox_connected' && result.projectId === projectId) {
                    updateProjectCDE(projectId, {
                        provider: 'dropbox', connected: true, lastSync: new Date().toISOString(),
                        appKey: result.appKey, appSecret: result.appSecret,
                        accessToken: result.accessToken, refreshToken: result.refreshToken,
                        folderPath: result.folderPath
                    } as any);
                    onClose();
                    setTimeout(() => alert('Dropbox Connected Successfully!'), 100);
                } else if (result.type === 'gdrive_token' && result.accessToken) {
                    // handled in startOAuthListener below
                }
            } catch (_) { }
        };
        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);
    }, [projectId]);

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


    const handleConnect = async () => {
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

                // Poll localStorage for the token written by /auth/callback
                startOAuthListener(async (data) => {
                    if (data?.type !== 'gdrive_token' || !data.accessToken) {
                        setAuthError('No access token received.'); setIsAuthenticating(false); return;
                    }
                    try {
                        let folderId = 'root';
                        if (credentials.folderUrl) {
                            const match = credentials.folderUrl.match(/folders\/([-a-zA-Z0-9_]+)/) || credentials.folderUrl.match(/id=([-a-zA-Z0-9_]+)/);
                            if (match) folderId = match[1];
                        }
                        updateProjectCDE(projectId, {
                            ...project?.cdeConfig, provider: 'gdrive', connected: true,
                            lastSync: new Date().toISOString(), clientId: credentials.clientId,
                            accessToken: data.accessToken, folderId, folderUrl: credentials.folderUrl
                        } as any);
                        setAuthError(''); setIsAuthenticating(false); onClose();
                        alert('Google Drive Connected Successfully!');
                    } catch (e) { setAuthError('Failed to save: ' + e); setIsAuthenticating(false); }
                });

            } else if (provider === 'dropbox') {
                if (!credentials.appKey) throw new Error('App Key is required.');
                const redirectUri = `${window.location.origin}/auth/callback`;
                const authUrl = `https://www.dropbox.com/oauth2/authorize` +
                    `?client_id=${encodeURIComponent(credentials.appKey)}` +
                    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
                    `&response_type=code` +
                    `&token_access_type=offline`;

                // Save credentials so the callback page can do the token exchange
                localStorage.setItem(OAUTH_PENDING_KEY, JSON.stringify({
                    provider: 'dropbox',
                    appKey: credentials.appKey,
                    appSecret: credentials.appSecret,
                    folderPath: credentials.folderUrl,
                    projectId,
                    cdeConfig: project?.cdeConfig,
                    returnUrl: window.location.href
                }));

                // Navigate current window to Dropbox (most reliable, works even if popups blocked)
                window.location.href = authUrl;
                return; // page will navigate away

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
                updateProjectCDE(projectId, {
                    provider: 'onedrive', connected: true, lastSync: new Date().toISOString(),
                    clientId: credentials.clientId, clientSecret: credentials.clientSecret,
                    tenantId: credentials.tenantId, siteUrl, folderPath
                });
                onClose();
                alert('OneDrive/SharePoint Configuration Saved.');
                setIsAuthenticating(false);
            }
        } catch (e: any) {
            setAuthError(e.message);
            setIsAuthenticating(false);
        }
    };

    const handleDisconnect = () => {
        if (confirm('Are you sure you want to disconnect?')) {
            updateProjectCDE(projectId, undefined);
            setProvider(null);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[9000] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-surface rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50 dark:bg-[#131314]">
                    <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <Cloud size={20} className="text-primary" />
                        Ambiente Comum de Dados (CDE)
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" aria-label="Close">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {/* Provider Selection */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
                        <button
                            onClick={() => setProvider('onedrive')}
                            className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${provider === 'onedrive' ? 'bg-primary-light border-primary/20 text-primary-hover' : 'bg-white dark:bg-surface border-gray-200 dark:border-[#444746] hover:bg-gray-50 dark:hover:bg-[#131314] text-gray-600 dark:text-gray-300'}`}
                        >
                            <Cloud size={24} className={provider === 'onedrive' ? "text-primary" : "text-gray-400"} />
                            <span className="text-xs font-medium">OneDrive</span>
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

                    {/* Google Drive Manual */}
                    {/* Google Drive Manual */}
                    {provider === 'gdrive' && (
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
                    )}

                    {/* OneDrive Manual */}
                    {provider === 'onedrive' && (
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
                    )}

                    {provider === 'onedrive' && (
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
                            <div className="grid grid-cols-2 gap-4">
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
                    )}

                    {/* Dropbox Manual */}
                    {provider === 'dropbox' && (
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
                    )}

                    {authError && (
                        <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-start gap-2">
                            <span className="mt-0.5">⚠️</span>
                            {authError}
                        </div>
                    )}
                </div>

                <div className="p-4 bg-gray-50 dark:bg-[#131314] border-t flex justify-between gap-3">
                    {project?.cdeConfig?.connected && (
                        <button
                            onClick={handleDisconnect}
                            className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2 transition-colors"
                        >
                            <Trash2 size={16} /> Disconnect
                        </button>
                    )}
                    <div className="flex gap-2 ml-auto">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-surface hover:shadow-sm rounded-lg border border-transparent hover:border-gray-200 dark:hover:border-[#444746] transition-all"
                        >
                            Cancel
                        </button>
                        {provider && (
                            <button
                                onClick={handleConnect}
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
    );
};
