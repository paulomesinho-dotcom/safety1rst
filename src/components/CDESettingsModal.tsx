'use client';

import React, { useState, useEffect } from 'react';
import { 
    Cloud, X, Save, RefreshCw, Trash2, ExternalLink, ChevronDown, ChevronRight, 
    ShieldCheck, CheckCircle2, AlertCircle, Lock, Copy, Check, BookOpen, 
    Server, HelpCircle, Building2, HardDrive, Key, Globe, ArrowRight, Shield,
    Folder, FolderPlus, Search, CornerDownRight, CheckSquare, Sparkles
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { GoogleDriveIcon } from './GoogleDriveIcons';

interface CDESettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    title?: string;
}

type ModalTab = 'config' | 'sharepoint_guide' | 'self_hosted' | 'free_setup' | 'troubleshooting';

/**
 * Intelligently parses SharePoint browser URLs (including query parameters ?id=, ?RootFolder=,
 * document library view paths, and encoded symbols) into a clean siteUrl and folderPath.
 */
export function parseSharePointUrl(rawUrl: string): {
    siteUrl: string;
    folderPath: string;
} {
    if (!rawUrl || typeof rawUrl !== 'string') {
        return { siteUrl: '', folderPath: '' };
    }

    let trimmed = rawUrl.trim();
    try {
        if (trimmed.includes('%2F') || trimmed.includes('%3A')) {
            trimmed = decodeURIComponent(trimmed);
        }
    } catch { }

    let url: URL;
    try {
        url = new URL(trimmed);
    } catch {
        return { siteUrl: '', folderPath: trimmed.replace(/^[/\\]+/, '') };
    }

    const host = url.origin;
    const queryId = url.searchParams.get('id') || url.searchParams.get('RootFolder') || url.searchParams.get('rootfolder');
    let rawPath = queryId ? decodeURIComponent(queryId) : decodeURIComponent(url.pathname);

    // Strip sharing prefix like /:f:/r/ or /:f:/s/
    rawPath = rawPath.replace(/^\/:(?:[a-z]):\/[a-z]\//i, '/');

    // Identify /sites/SiteName or /teams/TeamName
    let siteUrl = host;
    let pathAfterSite = rawPath;

    const siteMatch = rawPath.match(/^(\/(?:sites|teams)\/[^/]+)/i);
    if (siteMatch) {
        siteUrl = `${host}${siteMatch[1]}`;
        pathAfterSite = rawPath.substring(siteMatch[1].length);
    } else {
        siteUrl = host;
        pathAfterSite = rawPath;
    }

    // Strip ASPX views like /Forms/AllItems.aspx
    let cleaned = pathAfterSite
        .replace(/\/Forms\/[a-zA-Z0-9_\.]+/i, '')
        .replace(/\/[a-zA-Z0-9_]+\.aspx$/i, '')
        .replace(/^\/+/, '');

    // Check if starts with a standard document library name
    const libMatch = cleaned.match(/^(Shared Documents|Documentos Partilhados|Documentos|Documents)\/?(.*)$/i);
    let extractedFolderPath = '';
    if (libMatch) {
        extractedFolderPath = libMatch[2] ? libMatch[2].replace(/^\/+|\/+$/g, '') : '';
    } else {
        extractedFolderPath = cleaned.replace(/^\/+|\/+$/g, '');
    }

    return {
        siteUrl,
        folderPath: extractedFolderPath
    };
}

export const CDESettingsModal: React.FC<CDESettingsModalProps> = ({ isOpen, onClose, projectId, title }) => {
    const { projects, updateProjectCDE } = useStore();
    const project = projects.find(p => p.id === projectId);

    // Modal navigation tab
    const [activeModalTab, setActiveModalTab] = useState<ModalTab>('config');
    const [copiedRedirectUri, setCopiedRedirectUri] = useState(false);

    // Local State for Form
    const [provider, setProvider] = useState<'onedrive' | 'gdrive' | 'dropbox' | 'local' | null>(null);
    const [serverCdeConfig, setServerCdeConfig] = useState<any>(null);
    const [isLoadingServerConfig, setIsLoadingServerConfig] = useState(false);
    const [credentials, setCredentials] = useState({
        folderUrl: '',
        folderPath: '',
        folderId: '',
        serviceAccountJson: '', // Google
        tenantId: '',           // SharePoint
        clientId: '',           // SharePoint / Google / WebDAV username
        clientSecret: '',       // SharePoint / WebDAV password
        siteUrl: '',            // SharePoint / WebDAV URL
        appKey: '',             // Dropbox
        appSecret: ''           // Dropbox
    });
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [authError, setAuthError] = useState('');

    // SharePoint Folder Picker state
    const [isExploringFolders, setIsExploringFolders] = useState(false);
    const [isLoadingFolders, setIsLoadingFolders] = useState(false);
    const [folderList, setFolderList] = useState<Array<{ id: string; name: string; childCount?: number; webViewLink?: string }>>([]);
    const [folderPickerParentId, setFolderPickerParentId] = useState<string>('root');
    const [folderBreadcrumbs, setFolderBreadcrumbs] = useState<Array<{ id: string; name: string }>>([
        { id: 'root', name: 'Documentos (Raiz)' }
    ]);
    const [folderPickerError, setFolderPickerError] = useState<string>('');
    const [isCreatingFolderInPicker, setIsCreatingFolderInPicker] = useState(false);
    const [newPickerFolderName, setNewPickerFolderName] = useState('');
    const [urlCleanedNotice, setUrlCleanedNotice] = useState<string>('');

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

    const isCompanyScope = projectId?.startsWith('comp_') || title?.toLowerCase().includes('empresa') || title?.toLowerCase().includes('corporativo');

    // Load existing sanitized config from server and store on open
    useEffect(() => {
        if (!isOpen) return;

        // Reset errors and test status
        setAuthError('');
        setTestResult(null);

        // Populate initial values from local store if present
        if (project?.cdeConfig) {
            setProvider((project.cdeConfig.provider as any) || null);
            setCredentials({
                folderUrl: project.cdeConfig.folderPath || project.cdeConfig.folderUrl || '',
                folderPath: project.cdeConfig.folderPath || project.cdeConfig.folderUrl || '',
                folderId: (project.cdeConfig as any).folderId || '',
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
                            folderPath: cfg.folderPath || cfg.folderUrl || prev.folderPath,
                            folderId: cfg.folderId || prev.folderId,
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
                fetch(`/api/projects/${projectId}/cde`)
                    .then(res => res.ok ? res.json() : null)
                    .then(data => {
                        if (data?.cdeConfig) {
                            updateProjectCDE(projectId, data.cdeConfig);
                            setServerCdeConfig(data.cdeConfig);
                        }
                    });
                onClose();
                setTimeout(() => alert('Dropbox Conectado com Sucesso e Cifrado com AES-256 no Servidor!'), 300);
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
                    setTimeout(() => alert('Dropbox Conectado com Sucesso e Cifrado com AES-256 no Servidor!'), 100);
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

    // SharePoint input handlers and folder explorer logic
    const handleSiteUrlChange = (value: string) => {
        const parsed = parseSharePointUrl(value);
        if (parsed.folderPath) {
            setCredentials(prev => ({
                ...prev,
                siteUrl: parsed.siteUrl,
                folderPath: parsed.folderPath,
                folderUrl: parsed.folderPath
            }));
            setUrlCleanedNotice(`Link higienizado! Pasta detetada: "${parsed.folderPath}"`);
            setTimeout(() => setUrlCleanedNotice(''), 4500);
        } else {
            setCredentials(prev => ({
                ...prev,
                siteUrl: parsed.siteUrl || value
            }));
        }
    };

    const handleFolderPathChange = (value: string) => {
        if (value.startsWith('http://') || value.startsWith('https://')) {
            const parsed = parseSharePointUrl(value);
            setCredentials(prev => ({
                ...prev,
                siteUrl: parsed.siteUrl || prev.siteUrl,
                folderPath: parsed.folderPath || value,
                folderUrl: value
            }));
            if (parsed.folderPath) {
                setUrlCleanedNotice(`Pasta extraída do link: "${parsed.folderPath}"`);
                setTimeout(() => setUrlCleanedNotice(''), 4500);
            }
        } else {
            setCredentials(prev => ({
                ...prev,
                folderPath: value,
                folderUrl: value
            }));
        }
    };

    const handleValidateAndResolveFolder = async (targetVal?: string) => {
        const val = targetVal || credentials.folderPath || credentials.folderUrl || credentials.siteUrl;
        if (!val) return;
        setIsLoadingFolders(true);
        try {
            const parsed = parseSharePointUrl(credentials.siteUrl || val);
            const res = await fetch('/api/integration/sharepoint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'resolve_folder',
                    siteUrl: parsed.siteUrl || credentials.siteUrl,
                    tenantId: credentials.tenantId,
                    clientId: credentials.clientId,
                    clientSecret: credentials.clientSecret,
                    folderUrl: val,
                    folderPath: val,
                    projectId
                })
            });
            const data = await res.json();
            if (data?.folder?.id && data.folder.id !== 'root') {
                setCredentials(prev => ({
                    ...prev,
                    folderId: data.folder.id,
                    folderPath: data.folder.name || prev.folderPath,
                    folderUrl: data.folder.name || prev.folderUrl
                }));
                setUrlCleanedNotice(`✓ Pasta "${data.folder.name}" validada e vinculada por ID imutável (${data.folder.id})!`);
                setTimeout(() => setUrlCleanedNotice(''), 6000);
            } else {
                setUrlCleanedNotice('Pasta não encontrada pelo link. Use "Explorar Pastas" para selecionar manualmente.');
                setTimeout(() => setUrlCleanedNotice(''), 5000);
            }
        } catch (_) { 
            setUrlCleanedNotice('Erro ao validar pasta. Verifique as credenciais.');
            setTimeout(() => setUrlCleanedNotice(''), 5000);
        } finally {
            setIsLoadingFolders(false);
        }
    };

    const loadSharePointFolders = async (targetParentId: string = 'root', breadcrumbTitle?: string) => {
        setIsLoadingFolders(true);
        setFolderPickerError('');

        const parsed = parseSharePointUrl(credentials.siteUrl);
        const effectiveSiteUrl = parsed.siteUrl || credentials.siteUrl;

        try {
            const res = await fetch('/api/integration/sharepoint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'list_folders',
                    siteUrl: effectiveSiteUrl,
                    tenantId: credentials.tenantId,
                    clientId: credentials.clientId,
                    clientSecret: credentials.clientSecret,
                    parentId: targetParentId,
                    projectId: projectId
                })
            });

            const data = await res.json();
            if (!res.ok || data.error) {
                throw new Error(data.error || data.details || 'Falha ao listar pastas do SharePoint.');
            }

            setFolderList(data.folders || []);
            setFolderPickerParentId(targetParentId);

            if (targetParentId === 'root') {
                setFolderBreadcrumbs([{ id: 'root', name: 'Documentos (Raiz)' }]);
            } else if (breadcrumbTitle) {
                setFolderBreadcrumbs(prev => {
                    const idx = prev.findIndex(b => b.id === targetParentId);
                    if (idx !== -1) {
                        return prev.slice(0, idx + 1);
                    }
                    return [...prev, { id: targetParentId, name: breadcrumbTitle }];
                });
            }
        } catch (err: any) {
            setFolderPickerError(err.message || 'Erro ao explorar pastas do SharePoint.');
        } finally {
            setIsLoadingFolders(false);
        }
    };

    const handleSelectFolder = (folder: { id: string; name: string; isDrive?: boolean }) => {
        if (folder.isDrive) {
            loadSharePointFolders(folder.id, folder.name.replace(/^📚 \[Biblioteca\] /, ''));
            return;
        }

        const cleanName = folder.name;
        setCredentials(prev => ({
            ...prev,
            folderId: folder.id,
            folderPath: cleanName,
            folderUrl: cleanName
        }));
        setIsExploringFolders(false);
        setUrlCleanedNotice(`Pasta "${cleanName}" vinculada com sucesso pelo ID imutável (${folder.id})!`);
        setTimeout(() => setUrlCleanedNotice(''), 5000);
    };

    const handleSelectCurrentBreadcrumb = () => {
        if (folderPickerParentId === 'root') {
            setCredentials(prev => ({
                ...prev,
                folderId: 'root',
                folderPath: '',
                folderUrl: ''
            }));
            setUrlCleanedNotice('Selecionada a raiz da biblioteca de documentos.');
        } else {
            const currentItem = folderBreadcrumbs[folderBreadcrumbs.length - 1];
            setCredentials(prev => ({
                ...prev,
                folderId: currentItem.id,
                folderPath: currentItem.name,
                folderUrl: currentItem.name
            }));
            setUrlCleanedNotice(`Pasta "${currentItem.name}" vinculada por ID imutável (${currentItem.id})!`);
        }
        setIsExploringFolders(false);
        setTimeout(() => setUrlCleanedNotice(''), 5000);
    };

    const handleCreateFolderInPicker = async () => {
        if (!newPickerFolderName.trim()) return;
        setIsCreatingFolderInPicker(true);
        try {
            const parsed = parseSharePointUrl(credentials.siteUrl);
            const res = await fetch('/api/integration/sharepoint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'create_folder',
                    siteUrl: parsed.siteUrl || credentials.siteUrl,
                    tenantId: credentials.tenantId,
                    clientId: credentials.clientId,
                    clientSecret: credentials.clientSecret,
                    parentId: folderPickerParentId,
                    folderName: newPickerFolderName.trim(),
                    projectId
                })
            });
            const data = await res.json();
            if (!res.ok || data.error) {
                throw new Error(data.error || 'Erro ao criar pasta');
            }
            setNewPickerFolderName('');
            await loadSharePointFolders(folderPickerParentId);
        } catch (err: any) {
            setFolderPickerError(err.message || 'Erro ao criar pasta');
        } finally {
            setIsCreatingFolderInPicker(false);
        }
    };

    // Test connection action executed securely on server
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
                throw new Error(data.error || 'Falha ao validar ligação no servidor.');
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
                if (!credentials.clientId) throw new Error('O Google Client ID é obrigatório.');
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
                        setAuthError('Nenhum token de acesso recebido do Google.');
                        setIsAuthenticating(false);
                        return;
                    }
                    try {
                        let folderId = 'root';
                        if (credentials.folderUrl) {
                            const match = credentials.folderUrl.match(/folders\/([-a-zA-Z0-9_]+)/) || credentials.folderUrl.match(/id=([-a-zA-Z0-9_]+)/);
                            if (match) folderId = match[1];
                        }

                        // Persist to backend with AES-256 encryption
                        const saveRes = await fetch(`/api/projects/${projectId}/cde/setup`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                provider: 'gdrive',
                                connected: true,
                                isCompany: isCompanyScope,
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
                        alert('Google Drive Conectado com Sucesso e Cifrado no Servidor!');
                    } catch (e: any) {
                        setAuthError('Falha ao guardar: ' + e.message);
                        setIsAuthenticating(false);
                    }
                });

            } else if (provider === 'dropbox') {
                if (!credentials.appKey) throw new Error('A Dropbox App Key é obrigatória.');
                const redirectUri = `${window.location.origin}/auth/callback`;
                const authUrl = `https://www.dropbox.com/oauth2/authorize` +
                    `?client_id=${encodeURIComponent(credentials.appKey)}` +
                    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
                    `&response_type=code` +
                    `&token_access_type=offline`;

                localStorage.setItem(OAUTH_PENDING_KEY, JSON.stringify({
                    provider: 'dropbox',
                    appKey: credentials.appKey,
                    appSecret: credentials.appSecret,
                    folderPath: credentials.folderUrl,
                    projectId,
                    isCompany: isCompanyScope,
                    cdeConfig: project?.cdeConfig,
                    returnUrl: window.location.href
                }));

                window.location.href = authUrl;
                return;

            } else if (provider === 'onedrive') {
                const rawLink = credentials.siteUrl || credentials.folderUrl;
                if (!rawLink) throw new Error('Indique o Link do Site ou Pasta do SharePoint.');
                if (!credentials.tenantId) throw new Error('Directory (Tenant) ID é obrigatório.');
                if (!credentials.clientId) throw new Error('Application (Client) ID é obrigatório.');

                // Cleanly parse SharePoint URL to extract base siteUrl and folderPath
                const parsed = parseSharePointUrl(credentials.siteUrl || credentials.folderUrl);
                const finalSiteUrl = parsed.siteUrl || credentials.siteUrl;
                const finalFolderPath = credentials.folderPath || parsed.folderPath || '';
                const finalFolderId = credentials.folderId || '';

                // Save to server with AES-256-GCM encryption
                const res = await fetch(`/api/projects/${projectId}/cde/setup`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        provider: 'onedrive',
                        connected: true,
                        isCompany: isCompanyScope,
                        clientId: credentials.clientId,
                        clientSecret: credentials.clientSecret,
                        tenantId: credentials.tenantId,
                        siteUrl: finalSiteUrl,
                        folderPath: finalFolderPath,
                        folderUrl: finalFolderPath,
                        folderId: finalFolderId
                    })
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Falha ao guardar no servidor.');

                updateProjectCDE(projectId, data.cdeConfig);
                setServerCdeConfig(data.cdeConfig);
                setIsAuthenticating(false);
                onClose();
                alert('Configuração SharePoint/OneDrive guardada com sucesso e cifrada com AES-256-GCM no servidor!');

            } else if (provider === 'local') {
                const targetUrl = credentials.siteUrl || credentials.folderUrl;
                if (!targetUrl) throw new Error('Indique o URL do Servidor / WebDAV.');

                const res = await fetch(`/api/projects/${projectId}/cde/setup`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        provider: 'local',
                        connected: true,
                        isCompany: isCompanyScope,
                        siteUrl: targetUrl,
                        folderUrl: credentials.folderUrl,
                        clientId: credentials.clientId, // Username
                        clientSecret: credentials.clientSecret, // App Password
                    })
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Falha ao guardar no servidor.');

                updateProjectCDE(projectId, data.cdeConfig);
                setServerCdeConfig(data.cdeConfig);
                setIsAuthenticating(false);
                onClose();
                alert('Configuração de Servidor Próprio / WebDAV guardada com sucesso no servidor!');
            }
        } catch (e: any) {
            setAuthError(e.message);
            setIsAuthenticating(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm('Tem a certeza de que deseja desligar o CDE? Todas as credenciais serão eliminadas do servidor de forma segura.')) {
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
                folderUrl: '', folderPath: '', folderId: '', serviceAccountJson: '', tenantId: '', clientId: '', clientSecret: '', siteUrl: '', appKey: '', appSecret: ''
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
        <div className="fixed inset-0 bg-black/60 z-[9000] flex items-center justify-center p-3 sm:p-4 backdrop-blur-md">
            <div className="bg-white dark:bg-[#1e1f20] border border-gray-200 dark:border-[#444746] rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
                
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-[#444746] flex justify-between items-center bg-gray-50/80 dark:bg-[#131314]/80">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20 shadow-sm">
                            <Cloud size={22} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-gray-100">
                                    {title || "Ambiente Comum de Dados (CDE)"}
                                </h3>
                                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hidden sm:inline-block">
                                    ISO 19650
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                Repositório seguro e sincronização bidirecional de evidências de segurança e ficheiros de obra.
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2c2d2e] transition-colors" 
                        aria-label="Close"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Sub-Tabs Navigation */}
                <div className="flex border-b border-gray-200 dark:border-[#444746] bg-gray-50/40 dark:bg-[#131314]/40 px-3 sm:px-5 gap-1 sm:gap-2 text-xs overflow-x-auto scrollbar-none">
                    <button
                        type="button"
                        onClick={() => setActiveModalTab('config')}
                        className={`py-3 px-3 font-semibold border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                            activeModalTab === 'config' 
                                ? 'border-primary text-primary bg-primary/5' 
                                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                        }`}
                    >
                        <Cloud size={15} /> Configuração
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveModalTab('sharepoint_guide')}
                        className={`py-3 px-3 font-semibold border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                            activeModalTab === 'sharepoint_guide' 
                                ? 'border-primary text-primary bg-primary/5' 
                                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                        }`}
                    >
                        <Building2 size={15} /> Guia SharePoint / M365
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveModalTab('self_hosted')}
                        className={`py-3 px-3 font-semibold border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                            activeModalTab === 'self_hosted' 
                                ? 'border-primary text-primary bg-primary/5' 
                                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                        }`}
                    >
                        <Server size={15} /> Servidor Próprio / WebDAV
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveModalTab('free_setup')}
                        className={`py-3 px-3 font-semibold border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                            activeModalTab === 'free_setup' 
                                ? 'border-primary text-primary bg-primary/5' 
                                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                        }`}
                    >
                        <BookOpen size={15} /> Conta Gratuita (Do Zero)
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveModalTab('troubleshooting')}
                        className={`py-3 px-3 font-semibold border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                            activeModalTab === 'troubleshooting' 
                                ? 'border-primary text-primary bg-primary/5' 
                                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                        }`}
                    >
                        <HelpCircle size={15} /> Dúvidas & Diagnóstico
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5">
                    
                    {/* ════════ TAB 1: CONFIGURAÇÃO ════════ */}
                    {activeModalTab === 'config' && (
                        <div className="space-y-5 animate-in fade-in duration-200">
                            
                            {/* Security & Status Banner */}
                            <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20 mt-0.5">
                                        <ShieldCheck size={20} />
                                    </div>
                                    <div className="text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-emerald-900 dark:text-emerald-200">
                                                Cifra AES-256-GCM Ativa (Backend BFF)
                                            </span>
                                            <span className="px-1.5 py-0.2 text-[10px] rounded bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 font-mono">
                                                Zero-Knowledge Client
                                            </span>
                                        </div>
                                        <p className="text-emerald-800/80 dark:text-emerald-300/80 mt-0.5">
                                            Credenciais e tokens são cifrados com chaves únicas de servidor e nunca transmitidos desprotegidos.
                                        </p>
                                    </div>
                                </div>
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border self-start sm:self-auto shrink-0 ${
                                    isConnected 
                                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' 
                                        : 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-700'
                                }`}>
                                    <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                                    {isConnected ? `Conectado (${(serverCdeConfig?.provider || project?.cdeConfig?.provider || '').toUpperCase()})` : 'Desconectado'}
                                </span>
                            </div>

                            {/* Redirect URI Quick Copy */}
                            <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#131314] border border-gray-200 dark:border-[#444746] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                <div className="space-y-0.5">
                                    <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 block">
                                        URI de Redirecionamento da Aplicação (Redirect URI):
                                    </span>
                                    <code className="text-xs font-mono text-primary font-semibold select-all break-all block">
                                        {redirectUri}
                                    </code>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleCopyRedirectUri}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-[#2c2d2e] border border-gray-300 dark:border-gray-600 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#383a3c] transition-all shrink-0 self-start sm:self-auto shadow-sm cursor-pointer"
                                >
                                    {copiedRedirectUri ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                                    <span>{copiedRedirectUri ? 'Copiado!' : 'Copiar URI'}</span>
                                </button>
                            </div>

                            {/* Provider Selection */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2.5">
                                    Selecione o Fornecedor de Nuvem
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                    
                                    {/* SharePoint */}
                                    <button
                                        type="button"
                                        onClick={() => { setProvider('onedrive'); setTestResult(null); }}
                                        className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer text-center ${
                                            provider === 'onedrive' 
                                                ? 'bg-primary/10 border-primary text-primary shadow-sm ring-2 ring-primary/20' 
                                                : 'bg-white dark:bg-[#131314] border-gray-200 dark:border-[#444746] hover:border-primary/40 text-gray-700 dark:text-gray-300'
                                        }`}
                                    >
                                        <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-primary flex items-center justify-center">
                                            <Cloud size={22} />
                                        </div>
                                        <div>
                                            <span className="text-xs font-bold block">SharePoint / M365</span>
                                            <span className="text-[10px] text-gray-500 block">Microsoft Azure</span>
                                        </div>
                                    </button>

                                    {/* Google Drive */}
                                    <button
                                        type="button"
                                        onClick={() => { setProvider('gdrive'); setTestResult(null); }}
                                        className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer text-center ${
                                            provider === 'gdrive' 
                                                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 shadow-sm ring-2 ring-emerald-500/20' 
                                                : 'bg-white dark:bg-[#131314] border-gray-200 dark:border-[#444746] hover:border-emerald-500/40 text-gray-700 dark:text-gray-300'
                                        }`}
                                    >
                                        <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                            <GoogleDriveIcon type="folder" size={22} />
                                        </div>
                                        <div>
                                            <span className="text-xs font-bold block">Google Drive</span>
                                            <span className="text-[10px] text-gray-500 block">Google Workspace</span>
                                        </div>
                                    </button>

                                    {/* Dropbox */}
                                    <button
                                        type="button"
                                        onClick={() => { setProvider('dropbox'); setTestResult(null); }}
                                        className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer text-center ${
                                            provider === 'dropbox' 
                                                ? 'bg-indigo-500/10 border-indigo-500 text-indigo-600 shadow-sm ring-2 ring-indigo-500/20' 
                                                : 'bg-white dark:bg-[#131314] border-gray-200 dark:border-[#444746] hover:border-indigo-500/40 text-gray-700 dark:text-gray-300'
                                        }`}
                                    >
                                        <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                                            <HardDrive size={22} />
                                        </div>
                                        <div>
                                            <span className="text-xs font-bold block">Dropbox</span>
                                            <span className="text-[10px] text-gray-500 block">Dropbox Business</span>
                                        </div>
                                    </button>

                                    {/* Servidor Próprio / WebDAV */}
                                    <button
                                        type="button"
                                        onClick={() => { setProvider('local'); setTestResult(null); }}
                                        className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer text-center ${
                                            provider === 'local' 
                                                ? 'bg-purple-500/10 border-purple-500 text-purple-600 shadow-sm ring-2 ring-purple-500/20' 
                                                : 'bg-white dark:bg-[#131314] border-gray-200 dark:border-[#444746] hover:border-purple-500/40 text-gray-700 dark:text-gray-300'
                                        }`}
                                    >
                                        <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
                                            <Server size={22} />
                                        </div>
                                        <div>
                                            <span className="text-xs font-bold block">Servidor Próprio</span>
                                            <span className="text-[10px] text-gray-500 block">WebDAV / Nextcloud</span>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* ─── SharePoint Configuration Inputs ─── */}
                            {provider === 'onedrive' && (
                                <div className="p-4 sm:p-5 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/30 dark:bg-blue-950/10 space-y-4 animate-in fade-in duration-200">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-xs text-blue-950 dark:text-blue-200 flex items-center gap-2">
                                            <Building2 size={16} className="text-primary" />
                                            Credenciais do Microsoft SharePoint & Entra ID (Azure)
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setActiveModalTab('sharepoint_guide')}
                                            className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                                        >
                                            Ver Guia Passo a Passo <ArrowRight size={12} />
                                        </button>
                                    </div>

                                    {/* Smart URL Notification */}
                                    {urlCleanedNotice && (
                                        <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                                            <Sparkles size={15} className="shrink-0 text-emerald-600" />
                                            <span>{urlCleanedNotice}</span>
                                        </div>
                                    )}

                                    {/* Link do Site SharePoint */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                                            Link do Site SharePoint (Site URL)
                                        </label>
                                        <input
                                            type="text"
                                            value={credentials.siteUrl}
                                            onChange={e => handleSiteUrlChange(e.target.value)}
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-xs bg-white dark:bg-[#131314] text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary/20 outline-none"
                                            placeholder="https://empresa.sharepoint.com/sites/NomeObra"
                                        />
                                        <p className="text-[10px] text-gray-500 mt-1">
                                            Pode colar o link direto do navegador; o SafeSite limpa os parâmetros estranhos e extrai o site e a pasta automaticamente.
                                        </p>
                                    </div>

                                    {/* Pasta de Destino no SharePoint */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                                                Pasta de Destino na Biblioteca de Documentos
                                            </label>
                                            {credentials.folderId && (
                                                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                    <CheckCircle2 size={11} /> Vinculada por ID
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <input
                                                    type="text"
                                                    value={credentials.folderPath}
                                                    onChange={e => handleFolderPathChange(e.target.value)}
                                                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-xs bg-white dark:bg-[#131314] text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary/20 outline-none"
                                                    placeholder="Ex: SafeSite ou Obras/Edificio (deixe vazio para usar a raiz)"
                                                />
                                                <Folder size={15} className="absolute left-3 top-3 text-gray-400" />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleValidateAndResolveFolder()}
                                                disabled={isLoadingFolders}
                                                className="px-3 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm"
                                                title="Validar e obter ID imutável da pasta"
                                            >
                                                <Sparkles size={14} />
                                                <span>Validar</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const willOpen = !isExploringFolders;
                                                    setIsExploringFolders(willOpen);
                                                    if (willOpen) {
                                                        loadSharePointFolders('root');
                                                    }
                                                }}
                                                className="px-3.5 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-primary text-xs font-bold hover:bg-blue-100 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm"
                                                title="Explorar e selecionar pasta no SharePoint"
                                            >
                                                <Search size={14} />
                                                <span>{isExploringFolders ? 'Fechar Explorador' : 'Explorar Pastas'}</span>
                                            </button>
                                        </div>

                                        {/* Linked Folder Immutable ID Badge */}
                                        {credentials.folderId && credentials.folderId !== 'root' && (
                                            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs mt-2">
                                                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold truncate">
                                                        Pasta vinculada por ID imutável: <span className="underline">{credentials.folderPath}</span>
                                                    </p>
                                                    <p className="text-[10px] text-emerald-700/80 dark:text-emerald-300/80 font-mono truncate">
                                                        ID Graph: {credentials.folderId} (permanecerá ligada mesmo que seja movida ou alterado o nome no SharePoint)
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Quick Shortcut Pills */}
                                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                            <span className="text-[10px] text-gray-400 font-semibold mr-1">Atalhos rápidos:</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setCredentials(prev => ({ ...prev, folderPath: 'SafeSite', folderUrl: 'SafeSite', folderId: '' }));
                                                    setUrlCleanedNotice('Pasta definida como "SafeSite"');
                                                    setTimeout(() => setUrlCleanedNotice(''), 3000);
                                                }}
                                                className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#1f2022] border border-gray-200 dark:border-gray-700 hover:border-primary text-[11px] font-medium text-gray-700 dark:text-gray-300 transition-all cursor-pointer flex items-center gap-1"
                                            >
                                                📁 Pasta "SafeSite"
                                            </button>
                                            {project?.name && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const pName = `SafeSite/${project.name.trim()}`;
                                                        setCredentials(prev => ({ ...prev, folderPath: pName, folderUrl: pName, folderId: '' }));
                                                        setUrlCleanedNotice(`Pasta definida como "${pName}"`);
                                                        setTimeout(() => setUrlCleanedNotice(''), 3000);
                                                    }}
                                                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#1f2022] border border-gray-200 dark:border-gray-700 hover:border-primary text-[11px] font-medium text-gray-700 dark:text-gray-300 transition-all cursor-pointer flex items-center gap-1"
                                                >
                                                    🏢 SafeSite/{project.name.length > 15 ? project.name.slice(0, 15) + '...' : project.name}
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setCredentials(prev => ({ ...prev, folderPath: '', folderUrl: '', folderId: 'root' }));
                                                    setUrlCleanedNotice('Definido para usar a raiz da biblioteca');
                                                    setTimeout(() => setUrlCleanedNotice(''), 3000);
                                                }}
                                                className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#1f2022] border border-gray-200 dark:border-gray-700 hover:border-gray-400 text-[11px] font-medium text-gray-500 dark:text-gray-400 transition-all cursor-pointer"
                                            >
                                                📂 Raiz (/)
                                            </button>
                                        </div>
                                    </div>

                                    {/* Interactive SharePoint Folder Explorer */}
                                    {isExploringFolders && (
                                        <div className="p-4 rounded-xl border border-blue-300 dark:border-blue-800 bg-white dark:bg-[#131314] shadow-md space-y-3 animate-in fade-in zoom-in-95 duration-200">
                                            {/* Explorer Header */}
                                            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
                                                <div className="flex items-center gap-2">
                                                    <Folder size={16} className="text-primary" />
                                                    <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
                                                        Explorador de Pastas do SharePoint
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsExploringFolders(false)}
                                                    className="text-gray-400 hover:text-gray-600 p-1 rounded"
                                                >
                                                    <X size={15} />
                                                </button>
                                            </div>

                                            {/* Breadcrumbs */}
                                            <div className="flex flex-wrap items-center gap-1 text-[11px] font-medium bg-gray-50 dark:bg-[#1b1c1d] px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800">
                                                {folderBreadcrumbs.map((b, idx) => (
                                                    <React.Fragment key={b.id}>
                                                        {idx > 0 && <span className="text-gray-400">/</span>}
                                                        <button
                                                            type="button"
                                                            onClick={() => loadSharePointFolders(b.id, b.name)}
                                                            className={`hover:underline cursor-pointer ${
                                                                idx === folderBreadcrumbs.length - 1 ? 'font-bold text-primary' : 'text-gray-600 dark:text-gray-400'
                                                            }`}
                                                        >
                                                            {b.name}
                                                        </button>
                                                    </React.Fragment>
                                                ))}
                                            </div>

                                            {/* Current Folder Selection Action */}
                                            <div className="flex items-center justify-between gap-2">
                                                <button
                                                    type="button"
                                                    onClick={handleSelectCurrentBreadcrumb}
                                                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                                                >
                                                    <CheckSquare size={13} />
                                                    <span>Usar pasta atual ({folderBreadcrumbs[folderBreadcrumbs.length - 1]?.name || 'Raiz'})</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => loadSharePointFolders(folderPickerParentId)}
                                                    disabled={isLoadingFolders}
                                                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 text-xs transition-colors cursor-pointer"
                                                    title="Recarregar pastas"
                                                >
                                                    <RefreshCw size={13} className={isLoadingFolders ? 'animate-spin' : ''} />
                                                </button>
                                            </div>

                                            {/* Error Display */}
                                            {folderPickerError && (
                                                <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-start gap-2">
                                                    <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-600" />
                                                    <div>
                                                        <p className="font-semibold">{folderPickerError}</p>
                                                        <p className="text-[10px] text-red-600/80 mt-0.5">
                                                            Certifique-se de que o Tenant ID, Client ID e Client Secret estão preenchidos antes de explorar.
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Loading State */}
                                            {isLoadingFolders && (
                                                <div className="py-6 flex flex-col items-center justify-center gap-2 text-xs text-gray-500">
                                                    <RefreshCw size={18} className="animate-spin text-primary" />
                                                    <span>A carregar pastas do SharePoint...</span>
                                                </div>
                                            )}

                                            {/* Folder Items */}
                                            {!isLoadingFolders && !folderPickerError && (
                                                <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                                                    {folderList.length === 0 ? (
                                                        <div className="py-5 text-center text-xs text-gray-400">
                                                            Nenhuma subpasta encontrada nesta localização. Pode criar uma abaixo ou usar a pasta atual.
                                                        </div>
                                                    ) : (
                                                        folderList.map(folder => (
                                                            <div
                                                                key={folder.id}
                                                                className="p-2 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-blue-400 dark:hover:border-blue-600 bg-white dark:bg-[#1a1b1c] flex items-center justify-between gap-2 transition-all group"
                                                            >
                                                                <div
                                                                    onClick={() => loadSharePointFolders(folder.id, folder.name)}
                                                                    className="flex items-center gap-2 flex-1 cursor-pointer min-w-0"
                                                                >
                                                                    <Folder size={16} className="text-amber-500 shrink-0" />
                                                                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate group-hover:text-primary transition-colors">
                                                                        {folder.name}
                                                                    </span>
                                                                    {folder.childCount !== undefined && folder.childCount > 0 && (
                                                                        <span className="text-[10px] text-gray-400">({folder.childCount})</span>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-1.5 shrink-0">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => loadSharePointFolders(folder.id, folder.name)}
                                                                        className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-[10px] font-semibold text-gray-600 dark:text-gray-300 cursor-pointer"
                                                                    >
                                                                        Abrir
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleSelectFolder(folder)}
                                                                        className="px-2.5 py-1 rounded bg-primary/10 hover:bg-primary text-primary hover:text-white text-[10px] font-bold transition-all cursor-pointer"
                                                                    >
                                                                        ✓ Selecionar
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            )}

                                            {/* Create Folder Inline */}
                                            <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex gap-2">
                                                <input
                                                    type="text"
                                                    value={newPickerFolderName}
                                                    onChange={e => setNewPickerFolderName(e.target.value)}
                                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreateFolderInPicker(); } }}
                                                    placeholder="Criar nova pasta aqui..."
                                                    className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-xs bg-white dark:bg-[#131314] text-gray-900 dark:text-gray-100 outline-none"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleCreateFolderInPicker}
                                                    disabled={isCreatingFolderInPicker || !newPickerFolderName.trim()}
                                                    className="px-3 py-1.5 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-bold hover:bg-gray-800 transition-all flex items-center gap-1 disabled:opacity-50 cursor-pointer shrink-0"
                                                >
                                                    {isCreatingFolderInPicker ? <RefreshCw size={13} className="animate-spin" /> : <FolderPlus size={13} />}
                                                    <span>Criar</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                                                Directory (Tenant) ID
                                            </label>
                                            <input
                                                type="text"
                                                value={credentials.tenantId}
                                                onChange={e => setCredentials({ ...credentials, tenantId: e.target.value.trim() })}
                                                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-xs bg-white dark:bg-[#131314] font-mono text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary/20 outline-none"
                                                placeholder="00000000-0000-0000-0000-000000000000"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                                                Application (Client) ID
                                            </label>
                                            <input
                                                type="text"
                                                value={credentials.clientId}
                                                onChange={e => setCredentials({ ...credentials, clientId: e.target.value.trim() })}
                                                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-xs bg-white dark:bg-[#131314] font-mono text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary/20 outline-none"
                                                placeholder="00000000-0000-0000-0000-000000000000"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                                                Client Secret (Valor do Segredo)
                                            </label>
                                            {serverCdeConfig?.hasClientSecret && (
                                                <span className="text-[11px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                                                    <Lock size={11} /> Cifrado com AES-256 no Servidor
                                                </span>
                                            )}
                                        </div>
                                        <input
                                            type="password"
                                            value={credentials.clientSecret}
                                            onChange={e => setCredentials({ ...credentials, clientSecret: e.target.value.trim() })}
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-xs bg-white dark:bg-[#131314] font-mono text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary/20 outline-none"
                                            placeholder={serverCdeConfig?.hasClientSecret ? '•••••••••••••••• (deixe inalterado para manter o segredo atual)' : 'Insira o Value do Client Secret'}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* ─── Google Drive Configuration Inputs ─── */}
                            {provider === 'gdrive' && (
                                <div className="p-4 sm:p-5 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/10 space-y-4 animate-in fade-in duration-200">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-xs text-emerald-950 dark:text-emerald-200 flex items-center gap-2">
                                            <GoogleDriveIcon type="folder" size={16} />
                                            Credenciais do Google Cloud Console
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setActiveModalTab('free_setup')}
                                            className="text-[11px] font-bold text-emerald-600 hover:underline flex items-center gap-1 cursor-pointer"
                                        >
                                            Ver Guia Google Drive <ArrowRight size={12} />
                                        </button>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                                            Google Client ID (OAuth Web Client)
                                        </label>
                                        <input
                                            type="text"
                                            value={credentials.clientId}
                                            onChange={e => setCredentials({ ...credentials, clientId: e.target.value.trim() })}
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-xs bg-white dark:bg-[#131314] font-mono text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                                            placeholder="123456789-abcdef.apps.googleusercontent.com"
                                        />
                                        <p className="text-[10px] text-gray-500 mt-1">
                                            Obtido na Google Cloud Console &rarr; APIs &amp; Services &rarr; Credentials.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                                            Link da Pasta da Obra (Opcional)
                                        </label>
                                        <input
                                            type="text"
                                            value={credentials.folderUrl}
                                            onChange={e => setCredentials({ ...credentials, folderUrl: e.target.value.trim() })}
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-xs bg-white dark:bg-[#131314] text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                                            placeholder="https://drive.google.com/drive/folders/1a2b3c4d5e6f..."
                                        />
                                    </div>
                                </div>
                            )}

                            {/* ─── Dropbox Configuration Inputs ─── */}
                            {provider === 'dropbox' && (
                                <div className="p-4 sm:p-5 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/30 dark:bg-indigo-950/10 space-y-4 animate-in fade-in duration-200">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-xs text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
                                            <HardDrive size={16} className="text-indigo-600" />
                                            Credenciais da Dropbox App Console
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setActiveModalTab('free_setup')}
                                            className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                                        >
                                            Ver Guia Dropbox <ArrowRight size={12} />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                                                Dropbox App Key
                                            </label>
                                            <input
                                                type="text"
                                                value={credentials.appKey}
                                                onChange={e => setCredentials({ ...credentials, appKey: e.target.value.trim() })}
                                                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-xs bg-white dark:bg-[#131314] font-mono text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                                placeholder="sl.98dfxyz..."
                                            />
                                        </div>
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                                                    App Secret
                                                </label>
                                                {serverCdeConfig?.hasAppSecret && (
                                                    <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 px-1.5 py-0.5 rounded-full font-bold">
                                                        Cifrado
                                                    </span>
                                                )}
                                            </div>
                                            <input
                                                type="password"
                                                value={credentials.appSecret}
                                                onChange={e => setCredentials({ ...credentials, appSecret: e.target.value.trim() })}
                                                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-xs bg-white dark:bg-[#131314] font-mono text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                                placeholder={serverCdeConfig?.hasAppSecret ? '••••••••••••••••' : 'App Secret'}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                                            Caminho da Pasta Inicial (Opcional)
                                        </label>
                                        <input
                                            type="text"
                                            value={credentials.folderUrl}
                                            onChange={e => setCredentials({ ...credentials, folderUrl: e.target.value.trim() })}
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-xs bg-white dark:bg-[#131314] text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                            placeholder="/Obras/Obra_Principal"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* ─── Servidor Próprio / WebDAV Configuration Inputs ─── */}
                            {provider === 'local' && (
                                <div className="p-4 sm:p-5 rounded-2xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/30 dark:bg-purple-950/10 space-y-4 animate-in fade-in duration-200">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-xs text-purple-950 dark:text-purple-200 flex items-center gap-2">
                                            <Server size={16} className="text-purple-600" />
                                            Serviço Próprio da Empresa / WebDAV / Nextcloud / MinIO
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setActiveModalTab('self_hosted')}
                                            className="text-[11px] font-bold text-purple-600 hover:underline flex items-center gap-1 cursor-pointer"
                                        >
                                            Ver Guia Servidor Próprio <ArrowRight size={12} />
                                        </button>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                                            URL WebDAV do Servidor / Endpoint HTTPS
                                        </label>
                                        <input
                                            type="text"
                                            value={credentials.siteUrl || credentials.folderUrl}
                                            onChange={e => setCredentials({ ...credentials, siteUrl: e.target.value, folderUrl: e.target.value })}
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-xs bg-white dark:bg-[#131314] text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500/20 outline-none"
                                            placeholder="https://nuvem.suaempresa.pt/remote.php/dav/files/user/Obras/"
                                        />
                                        <p className="text-[10px] text-gray-500 mt-1">
                                            Endereço WebDAV com SSL (Nextcloud, ownCloud, MinIO S3 ou Synology DSM).
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                                                Nome de Utilizador / Access Key
                                            </label>
                                            <input
                                                type="text"
                                                value={credentials.clientId}
                                                onChange={e => setCredentials({ ...credentials, clientId: e.target.value.trim() })}
                                                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-xs bg-white dark:bg-[#131314] font-mono text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500/20 outline-none"
                                                placeholder="utilizador_obra"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                                                Palavra-passe de Aplicação / Secret Key
                                            </label>
                                            <input
                                                type="password"
                                                value={credentials.clientSecret}
                                                onChange={e => setCredentials({ ...credentials, clientSecret: e.target.value.trim() })}
                                                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-xs bg-white dark:bg-[#131314] font-mono text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500/20 outline-none"
                                                placeholder="••••••••••••••••"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Test Connection Result Feedback */}
                            {testResult && (
                                <div className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 border shadow-sm ${
                                    testResult.success 
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300' 
                                        : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300'
                                }`}>
                                    {testResult.success ? <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" /> : <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />}
                                    <div className="font-medium leading-relaxed">{testResult.message}</div>
                                </div>
                            )}

                            {/* Authentication Error Feedback */}
                            {authError && (
                                <div className="p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs rounded-xl flex items-start gap-2.5 shadow-sm">
                                    <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
                                    <div className="font-medium leading-relaxed">{authError}</div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ════════ TAB 2: GUIA SHAREPOINT / MICROSOFT 365 ════════ */}
                    {activeModalTab === 'sharepoint_guide' && (
                        <div className="space-y-5 text-xs text-gray-700 dark:text-gray-300 animate-in fade-in duration-200">
                            <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 flex items-start gap-3">
                                <Building2 size={24} className="text-primary shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-bold text-sm text-blue-950 dark:text-blue-100">
                                        Como Ligar o SharePoint / OneDrive da Empresa ao SafeSite
                                    </h4>
                                    <p className="text-[11px] text-blue-900/80 dark:text-blue-200/80 mt-1">
                                        Para ligar o seu Microsoft 365 de forma autónoma (sem logins repetitivos de utilizador), utilizamos o <strong>Microsoft Entra ID</strong> (anterior Azure AD) com permissões seguras ao nível da API Microsoft Graph.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {/* Passo 1 */}
                                <div className="p-4 rounded-xl border border-gray-200 dark:border-[#444746] bg-white dark:bg-[#131314] space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center shrink-0">1</span>
                                        <h5 className="font-bold text-xs text-gray-900 dark:text-gray-100">
                                            Aceder ao Portal do Azure / Microsoft Entra ID
                                        </h5>
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-400 pl-8 leading-relaxed">
                                        Abra o <a href="https://portal.azure.com/#view/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/~/RegisteredApps" target="_blank" rel="noopener noreferrer" className="text-primary font-bold underline inline-flex items-center gap-1">Azure Portal &rarr; App registrations <ExternalLink size={11} /></a> com a conta de Administrador da sua organização Microsoft 365.
                                    </p>
                                </div>

                                {/* Passo 2 */}
                                <div className="p-4 rounded-xl border border-gray-200 dark:border-[#444746] bg-white dark:bg-[#131314] space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center shrink-0">2</span>
                                        <h5 className="font-bold text-xs text-gray-900 dark:text-gray-100">
                                            Criar um Novo Registo de Aplicação ("New registration")
                                        </h5>
                                    </div>
                                    <div className="pl-8 space-y-1.5 text-gray-600 dark:text-gray-400">
                                        <p>Clique no botão <strong>"New registration"</strong> no topo da página e preencha:</p>
                                        <ul className="list-disc list-inside space-y-1 ml-2">
                                            <li><strong>Name:</strong> <code>SafeSite CDE - Obras</code></li>
                                            <li><strong>Supported account types:</strong> Selecione a 1ª opção: <em>"Accounts in this organizational directory only (Single tenant)"</em></li>
                                        </ul>
                                        <p>Clique em <strong>Register</strong> no fundo da página.</p>
                                    </div>
                                </div>

                                {/* Passo 3 */}
                                <div className="p-4 rounded-xl border border-gray-200 dark:border-[#444746] bg-white dark:bg-[#131314] space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center shrink-0">3</span>
                                        <h5 className="font-bold text-xs text-gray-900 dark:text-gray-100">
                                            Copiar o Tenant ID e o Client ID
                                        </h5>
                                    </div>
                                    <div className="pl-8 space-y-1.5 text-gray-600 dark:text-gray-400">
                                        <p>Na página principal da aplicação recém-criada (ecrã <em>Overview</em>), copie dois valores:</p>
                                        <ul className="list-disc list-inside space-y-1 ml-2">
                                            <li><strong>Application (client) ID:</strong> Cole no campo <em>Application (Client) ID</em> no SafeSite.</li>
                                            <li><strong>Directory (tenant) ID:</strong> Cole no campo <em>Directory (Tenant) ID</em> no SafeSite.</li>
                                        </ul>
                                    </div>
                                </div>

                                {/* Passo 4 */}
                                <div className="p-4 rounded-xl border border-gray-200 dark:border-[#444746] bg-white dark:bg-[#131314] space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center shrink-0">4</span>
                                        <h5 className="font-bold text-xs text-gray-900 dark:text-gray-100">
                                            Gerar o Segredo do Cliente (Client Secret)
                                        </h5>
                                    </div>
                                    <div className="pl-8 space-y-1.5 text-gray-600 dark:text-gray-400">
                                        <p>No menu lateral esquerdo, clique em <strong>Certificates &amp; secrets</strong> &rarr; aba <strong>Client secrets</strong> &rarr; <strong>New client secret</strong>.</p>
                                        <ul className="list-disc list-inside space-y-1 ml-2">
                                            <li>Descrição: <code>SafeSite CDE Secret</code></li>
                                            <li>Validade: <em>24 months</em> (recomendado)</li>
                                        </ul>
                                        <p className="font-bold text-amber-700 dark:text-amber-400">
                                            ⚠️ Atenção: Copie imediatamente a coluna <strong>Value</strong> (não copie o Secret ID). O Azure oculta este valor logo que sair da página!
                                        </p>
                                    </div>
                                </div>

                                {/* Passo 5 */}
                                <div className="p-4 rounded-xl border border-gray-200 dark:border-[#444746] bg-white dark:bg-[#131314] space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center shrink-0">5</span>
                                        <h5 className="font-bold text-xs text-gray-900 dark:text-gray-100">
                                            Conceder Permissões no Microsoft Graph ("Sites.ReadWrite.All")
                                        </h5>
                                    </div>
                                    <div className="pl-8 space-y-1.5 text-gray-600 dark:text-gray-400">
                                        <p>No menu lateral esquerdo, clique em <strong>API permissions</strong> &rarr; <strong>Add a permission</strong> &rarr; <strong>Microsoft Graph</strong>:</p>
                                        <ul className="list-disc list-inside space-y-1 ml-2">
                                            <li>Escolha <strong>Application permissions</strong> (Permissões de aplicação).</li>
                                            <li>Pesquise por <code>Sites.ReadWrite.All</code> e marque a caixa.</li>
                                            <li>Clique em <strong>Add permissions</strong> no fundo.</li>
                                            <li>Por fim, clique no botão <strong>"Grant admin consent for [Sua Organização]"</strong>. O estado deve ficar com um visto verde ✓.</li>
                                        </ul>
                                    </div>
                                </div>

                                {/* Passo 6 */}
                                <div className="p-4 rounded-xl border border-gray-200 dark:border-[#444746] bg-white dark:bg-[#131314] space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center shrink-0">6</span>
                                        <h5 className="font-bold text-xs text-gray-900 dark:text-gray-100">
                                            Obter o Link do Site SharePoint
                                        </h5>
                                    </div>
                                    <div className="pl-8 space-y-1.5 text-gray-600 dark:text-gray-400">
                                        <p>Abra o site do SharePoint no browser e copie o URL da barra de endereços:</p>
                                        <code className="block p-2 bg-gray-100 dark:bg-gray-800 rounded font-mono text-[11px] text-primary">
                                            https://suaempresa.sharepoint.com/sites/NomeObra
                                        </code>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2 flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => { setProvider('onedrive'); setActiveModalTab('config'); }}
                                    className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                                >
                                    <span>Configurar Agora o SharePoint</span>
                                    <ArrowRight size={14} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ════════ TAB 3: SERVIDOR PRÓPRIO / WEBDAV ════════ */}
                    {activeModalTab === 'self_hosted' && (
                        <div className="space-y-5 text-xs text-gray-700 dark:text-gray-300 animate-in fade-in duration-200">
                            <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 flex items-start gap-3">
                                <Server size={24} className="text-purple-600 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-bold text-sm text-purple-950 dark:text-purple-100">
                                        Servidor Próprio On-Premise, Nextcloud ou MinIO S3
                                    </h4>
                                    <p className="text-[11px] text-purple-900/80 dark:text-purple-200/80 mt-1">
                                        O SafeSite suporta infraestrutura 100% privada da sua empresa. Todos os documentos de segurança, planos de prevenção e relatórios são enviados diretamente para o vosso data center privado via WebDAV HTTPS ou S3 Object Storage.
                                    </p>
                                </div>
                            </div>

                            {/* Opção 1: Nextcloud / ownCloud */}
                            <div className="p-4 rounded-xl border border-gray-200 dark:border-[#444746] space-y-3 bg-white dark:bg-[#131314]">
                                <div className="flex items-center justify-between">
                                    <h5 className="font-bold text-xs text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-purple-500" />
                                        1. Nextcloud / ownCloud (WebDAV com Controlo de Versões ISO 19650)
                                    </h5>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                                        Recomendado Privado
                                    </span>
                                </div>
                                <ol className="list-decimal list-inside space-y-1.5 text-gray-600 dark:text-gray-400 pl-2">
                                    <li>Abra o seu Nextcloud e navegue até à pasta que deseja utilizar para a obra ou empresa (ex: <code>/Obras/Obra_Lisboa</code>).</li>
                                    <li>No canto inferior esquerdo do Nextcloud, clique no ícone de <strong>Definições de Ficheiros</strong> e copie o URL WebDAV apresentado.</li>
                                    <li>O endereço WebDAV tem normalmente o formato:
                                        <code className="block mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded font-mono text-[11px] text-purple-600 dark:text-purple-400">
                                            https://cloud.suaempresa.pt/remote.php/dav/files/UTILIZADOR/Obras/
                                        </code>
                                    </li>
                                    <li>Nas <strong>Definições Pessoais &rarr; Segurança</strong> do seu utilizador no Nextcloud, crie uma <strong>"Palavra-passe de aplicação" (App Password)</strong> chamada <code>SafeSite</code>.</li>
                                    <li>Cole o URL, o seu Utilizador e a Palavra-passe de aplicação gerada no SafeSite.</li>
                                </ol>
                            </div>

                            {/* Opção 2: MinIO S3 */}
                            <div className="p-4 rounded-xl border border-gray-200 dark:border-[#444746] space-y-3 bg-white dark:bg-[#131314]">
                                <h5 className="font-bold text-xs text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                                    2. MinIO S3 / Ceph / Cluster VPS Próprio (Object Storage)
                                </h5>
                                <div className="space-y-1.5 text-gray-600 dark:text-gray-400 pl-2">
                                    <p>Para empresas com cluster MinIO ou armazenamento compatível com S3:</p>
                                    <ul className="list-disc list-inside space-y-1 ml-2">
                                        <li>Crie um Bucket dedicado com o identificador da obra (ex: <code>cde-safesite-obra</code>).</li>
                                        <li>Gere um par <strong>Access Key</strong> e <strong>Secret Key</strong> com políticas de leitura e gravação no bucket.</li>
                                        <li>No SafeSite, insira o endpoint HTTPS do MinIO no campo de URL e as chaves nos campos respetivos.</li>
                                    </ul>
                                </div>
                            </div>

                            {/* Opção 3: NAS Synology / QNAP */}
                            <div className="p-4 rounded-xl border border-gray-200 dark:border-[#444746] space-y-3 bg-white dark:bg-[#131314]">
                                <h5 className="font-bold text-xs text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                    3. NAS de Escritório (Synology DiskStation / QNAP QTS)
                                </h5>
                                <div className="space-y-1.5 text-gray-600 dark:text-gray-400 pl-2">
                                    <p>Pode usar o NAS do escritório da empresa como CDE local seguro:</p>
                                    <ul className="list-disc list-inside space-y-1 ml-2">
                                        <li>No Synology DSM, abra o <em>Package Center</em> e instale o pacote <strong>WebDAV Server</strong>.</li>
                                        <li>Ative o protocolo HTTPS na porta 5006 e garanta que o certificado SSL Let's Encrypt está válido.</li>
                                        <li>Crie uma pasta partilhada com permissões dedicadas e utilize o endereço: <code>https://nas.suaempresa.pt:5006/PastaObra/</code>.</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="pt-2 flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => { setProvider('local'); setActiveModalTab('config'); }}
                                    className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                                >
                                    <span>Configurar Servidor Próprio</span>
                                    <ArrowRight size={14} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ════════ TAB 4: CONTA GRATUITA (DO ZERO) ════════ */}
                    {activeModalTab === 'free_setup' && (
                        <div className="space-y-5 text-xs text-gray-700 dark:text-gray-300 animate-in fade-in duration-200">
                            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-start gap-3">
                                <BookOpen size={24} className="text-emerald-600 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-bold text-sm text-emerald-950 dark:text-emerald-100">
                                        Como Criar um CDE 100% Gratuito só para esta Obra (Do Zero)
                                    </h4>
                                    <p className="text-[11px] text-emerald-900/80 dark:text-emerald-200/80 mt-1">
                                        Se não tiver conta corporativa, pode criar uma conta gratuita dedicada à obra em menos de 2 minutos para gerir todos os documentos em cumprimento do DL 273/2003.
                                    </p>
                                </div>
                            </div>

                            {/* Opção 1: Dropbox Gratuito */}
                            <div className="p-4 rounded-xl border border-gray-200 dark:border-[#444746] space-y-3 bg-white dark:bg-[#131314]">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-xs text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                        <HardDrive size={16} className="text-indigo-600" />
                                        Opção Mais Fácil: Dropbox Gratuito (2 GB de Oferta)
                                    </span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                                        Leva 2 minutos
                                    </span>
                                </div>
                                <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-400 pl-2">
                                    <li>Registe uma conta gratuita em <a href="https://www.dropbox.com" target="_blank" rel="noopener noreferrer" className="text-primary font-bold underline">dropbox.com</a> (ex: com o email da obra).</li>
                                    <li>Aceda à consola de developers: <a href="https://www.dropbox.com/developers/apps" target="_blank" rel="noopener noreferrer" className="text-primary font-bold underline">dropbox.com/developers/apps</a>.</li>
                                    <li>Clique em <strong>"Create app"</strong> &rarr; escolha <em>"Scoped access"</em> &rarr; <em>"Full Dropbox"</em>.</li>
                                    <li>Dê um nome à app (ex: <code>SafeSite-Obra-{projectId.slice(0, 5)}</code>).</li>
                                    <li>Na aba <strong>"Permissions"</strong>, assinale: <code>files.metadata.write</code>, <code>files.metadata.read</code>, <code>files.content.write</code>, <code>files.content.read</code>.</li>
                                    <li>Na aba <strong>"Settings"</strong>, adicione em <em>"Redirect URIs"</em> o endereço copiado da aba de configuração:
                                        <code className="block mt-1 p-1.5 bg-gray-100 dark:bg-gray-800 rounded font-mono text-[10px] text-gray-800 dark:text-gray-200">
                                            {redirectUri}
                                        </code>
                                    </li>
                                    <li>Copie o <strong>App Key</strong> e <strong>App Secret</strong> para a aba de Configuração e clique em <em>Autorizar &amp; Ligar</em>.</li>
                                </ol>
                            </div>

                            {/* Opção 2: Google Drive Gratuito */}
                            <div className="p-4 rounded-xl border border-gray-200 dark:border-[#444746] space-y-3 bg-white dark:bg-[#131314]">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-xs text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                        <GoogleDriveIcon type="folder" size={16} />
                                        Opção Maior Espaço: Google Drive Gratuito (15 GB de Oferta)
                                    </span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                                        15 GB Grátis
                                    </span>
                                </div>
                                <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-400 pl-2">
                                    <li>Crie uma conta Google gratuita para a obra (ex: <code>obra.safesite@gmail.com</code>).</li>
                                    <li>Aceda à <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary font-bold underline">Google Cloud Console</a> e crie um projeto com o nome da obra.</li>
                                    <li>Em <strong>APIs e Serviços &rarr; Biblioteca</strong>, pesquise e ative a <strong>Google Drive API</strong>.</li>
                                    <li>Em <strong>Ecrã de consentimento OAuth</strong>, selecione <em>Externo</em>, preencha o nome da app e adicione o seu email como utilizador de teste.</li>
                                    <li>Em <strong>Credenciais &rarr; Criar Credenciais &rarr; ID do Cliente OAuth</strong> (Tipo: <em>Aplicação Web</em>):
                                        <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                                            <li>Origens JavaScript autorizadas: <code>{typeof window !== 'undefined' ? window.location.origin : ''}</code></li>
                                            <li>URIs de redirecionamento: <code>{redirectUri}</code></li>
                                        </ul>
                                    </li>
                                    <li>Copie o <strong>Client ID</strong> gerado e cole na aba de Configuração.</li>
                                </ol>
                            </div>
                        </div>
                    )}

                    {/* ════════ TAB 5: DÚVIDAS & RESOLUÇÃO DE PROBLEMAS ════════ */}
                    {activeModalTab === 'troubleshooting' && (
                        <div className="space-y-4 text-xs text-gray-700 dark:text-gray-300 animate-in fade-in duration-200">
                            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
                                <HelpCircle size={24} className="text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-bold text-sm text-amber-950 dark:text-amber-100">
                                        Diagnóstico &amp; Resolução de Falhas Frequentes
                                    </h4>
                                    <p className="text-[11px] text-amber-900/80 dark:text-amber-200/80 mt-1">
                                        Soluções imediatas para os erros mais comuns na configuração de nuvem.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="p-3.5 rounded-xl border border-gray-200 dark:border-[#444746] bg-white dark:bg-[#131314]">
                                    <h5 className="font-bold text-xs text-red-600 dark:text-red-400 mb-1">
                                        1. Erro: "Redirect URI mismatch" ou "URI de redirecionamento inválido"
                                    </h5>
                                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                        <strong>Causa:</strong> O endereço configurado na consola do fornecedor (Google ou Dropbox) não é exatamente igual ao endereço do seu navegador.
                                    </p>
                                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                                        <strong>Solução:</strong> Use o botão <strong>"Copiar URI"</strong> no topo da aba de Configuração e cole-o nas definições da consola.
                                    </p>
                                </div>

                                <div className="p-3.5 rounded-xl border border-gray-200 dark:border-[#444746] bg-white dark:bg-[#131314]">
                                    <h5 className="font-bold text-xs text-red-600 dark:text-red-400 mb-1">
                                        2. Janela de login fecha ou é bloqueada (Pop-up bloqueado)
                                    </h5>
                                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                        <strong>Causa:</strong> O navegador impediu a abertura automática da janela pop-up de autorização do Google.
                                    </p>
                                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                                        <strong>Solução:</strong> Verifique o ícone de bloqueio na barra de endereço do browser e clique em <em>"Permitir sempre pop-ups deste site"</em>.
                                    </p>
                                </div>

                                <div className="p-3.5 rounded-xl border border-gray-200 dark:border-[#444746] bg-white dark:bg-[#131314]">
                                    <h5 className="font-bold text-xs text-red-600 dark:text-red-400 mb-1">
                                        3. Falha de Permissão no SharePoint (403 Forbidden / Access Denied)
                                    </h5>
                                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                        <strong>Causa:</strong> A permissão <code>Sites.ReadWrite.All</code> foi adicionada no Azure, mas não recebeu o <em>"Admin Consent"</em>.
                                    </p>
                                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                                        <strong>Solução:</strong> Um administrador global do Microsoft 365 deve clicar no botão <strong>"Grant admin consent"</strong> na página de permissões do Azure.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="p-4 bg-gray-50 dark:bg-[#131314] border-t border-gray-200 dark:border-[#444746] flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        {isConnected && (
                            <button
                                type="button"
                                onClick={handleDisconnect}
                                className="px-3.5 py-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl flex items-center gap-2 transition-colors border border-red-200 dark:border-red-900 cursor-pointer"
                            >
                                <Trash2 size={15} /> Desligar CDE
                            </button>
                        )}

                        {isConnected && (
                            <button
                                type="button"
                                onClick={handleTestConnection}
                                disabled={isTesting}
                                className="px-3.5 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 rounded-xl flex items-center gap-2 transition-colors border border-emerald-200 dark:border-emerald-800 cursor-pointer"
                            >
                                {isTesting ? <RefreshCw size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                                {isTesting ? 'A testar ligação...' : 'Testar Ligação'}
                            </button>
                        )}
                    </div>

                    <div className="flex gap-2 ml-auto">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-[#2c2d2e] rounded-xl border border-gray-300 dark:border-gray-700 transition-all cursor-pointer"
                        >
                            Fechar
                        </button>
                        {provider && (
                            <button
                                type="button"
                                onClick={handleConnect}
                                disabled={isAuthenticating}
                                className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer ${
                                    provider === 'gdrive' ? 'bg-emerald-600 hover:bg-emerald-700' :
                                    provider === 'dropbox' ? 'bg-indigo-600 hover:bg-indigo-700' :
                                    provider === 'local' ? 'bg-purple-600 hover:bg-purple-700' :
                                    'bg-primary hover:bg-primary-hover'
                                }`}
                            >
                                {isAuthenticating ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
                                {provider === 'onedrive' || provider === 'local' ? 'Guardar com Segurança' : 'Autorizar & Ligar'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
