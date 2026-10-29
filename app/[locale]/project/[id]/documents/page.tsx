'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { 
    Folder, Cloud, FolderPlus, Plus, ChevronDown, ChevronRight, 
    FileText, Search, RotateCw, ExternalLink, Archive, CheckCircle2, 
    FolderCheck, Upload
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { 
        createOneDriveFolder, 
    archiveCDEFile, 
    uploadToCDEFolder 
} from '@/lib/cde-manager';
import { GoogleDriveIcon } from '@/components/GoogleDriveIcons';
import { CDESettingsModal } from '@/components/CDESettingsModal';
import { Modal, PrimaryButton, SecondaryButton } from '@/components/Modal';
import { PDFViewerModal } from '@/components/PDFViewerModal';
import { cn } from '@/lib/utils';

export default function ProjectDocumentsPage() {
    const params = useParams();
    const projectId = params?.id as string;
    const { projects, updateProjectCDE, getDocumentsByProject, addNotification, currentUser } = useStore();

    const project = projects.find(p => p.id === projectId);
    const cdeConfig = project?.cdeConfig;
    const dbDocuments = getDocumentsByProject(projectId);

    // Map DB documents by CDE File ID and Name
    const dbDocMapById = useMemo(() => {
        const map = new Map<string, any>();
        dbDocuments.forEach(doc => {
            if (doc.cdeFileId) map.set(doc.cdeFileId, doc);
        });
        return map;
    }, [dbDocuments]);

    const dbDocMapByName = useMemo(() => {
        const map = new Map<string, any>();
        dbDocuments.forEach(doc => {
            if (doc.name) map.set(doc.name.toLowerCase(), doc);
        });
        return map;
    }, [dbDocuments]);

    // Navigation and Explorer State
    const [currentPath, setCurrentPath] = useState<Array<{ id: string; name: string }>>([]);
    const [driveItems, setDriveItems] = useState<any[]>([]);
    const [treeData, setTreeData] = useState<Record<string, any[]>>({});
    const treeDataRef = useRef<Record<string, any[]>>({});
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root']));
    const [isLoadingDrive, setIsLoadingDrive] = useState(false);
    const [cdeLoadError, setCdeLoadError] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');

    // Actions & Modals State
    const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
    const [isCdeModalOpen, setIsCdeModalOpen] = useState(false);
    const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [viewerDoc, setViewerDoc] = useState<{ url: string; name: string } | null>(null);

    const prevCdeFolderKeyRef = useRef<string>('');
    const fileInputUploadRef = useRef<HTMLInputElement>(null);
    const folderInputRef = useRef<HTMLInputElement>(null);

    // Synchronize authoritative CDE configuration from the server on page mount
    useEffect(() => {
        if (!projectId) return;
        fetch(`/api/projects/${projectId}/cde`)
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                const cfg = data?.cdeConfig || data?.config;
                if (cfg && cfg.connected) {
                    updateProjectCDE(projectId, cfg);
                }
            })
            .catch(err => console.warn('[CDE] Sync project cdeConfig failed:', err));
    }, [projectId, updateProjectCDE]);

    // Fetch live folder content from the server-side CDE action endpoint
    const fetchCdeContent = async (cfg: any, folderId: string): Promise<any[]> => {
        if (!projectId || !cfg?.connected) return [];
        const serverFolderId = (!folderId || folderId === 'root' || folderId === cfg?.folderId) ? 'root' : folderId;

        const res = await fetch(`/api/projects/${projectId}/cde/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'list',
                payload: { folderId: serverFolderId }
            })
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new Error(data?.error || 'Falha ao carregar pastas do CDE.');
        }

        return data.result?.files || [];
    };

    // Reset navigation & tree cache when the linked CDE folder changes
    useEffect(() => {
        const key = `${cdeConfig?.provider || ''}:${cdeConfig?.siteUrl || ''}:${cdeConfig?.folderId || ''}:${cdeConfig?.folderPath || ''}`;
        if (key !== prevCdeFolderKeyRef.current) {
            prevCdeFolderKeyRef.current = key;
            setCurrentPath([]);
            setTreeData({});
            treeDataRef.current = {};
            setDriveItems([]);
        }
    }, [cdeConfig?.provider, cdeConfig?.siteUrl, cdeConfig?.folderId, cdeConfig?.folderPath]);

    // Load live CDE content with Instant Cache & Background Revalidation
    const loadProjectCdeView = async (overrideTargetId?: string, forceRefresh: boolean = false) => {
        if (!cdeConfig?.connected) {
            setDriveItems([]);
            setTreeData({});
            treeDataRef.current = {};
            return;
        }

        const targetId = overrideTargetId !== undefined
            ? overrideTargetId
            : (currentPath.length > 0 ? currentPath[currentPath.length - 1].id : 'root');

        const cached = treeDataRef.current[targetId];

        // 1. INSTANT RENDER: If folder is already cached, show immediately with 0ms delay
        if (cached && !forceRefresh) {
            setDriveItems(cached);
            setCdeLoadError('');
            setExpandedFolders(prev => {
                const next = new Set(prev);
                next.add('root');
                if (cdeConfig.folderId) next.add(cdeConfig.folderId);
                currentPath.forEach(p => next.add(p.id));
                if (targetId && targetId !== 'root') next.add(targetId);
                return next;
            });

            // Silent background revalidation (never blocks UI or shows spinner)
            fetchCdeContent(cdeConfig, targetId).then(freshItems => {
                treeDataRef.current[targetId] = freshItems;
                setDriveItems(freshItems);
                setTreeData(prev => ({ ...prev, [targetId]: freshItems }));
            }).catch(e => console.warn('[CDE] Background refresh warning:', e));
            return;
        }

        // 2. First-time fetch: show loading and fetch
        setIsLoadingDrive(true);
        setCdeLoadError('');
        try {
            const items = await fetchCdeContent(cdeConfig, targetId);
            treeDataRef.current[targetId] = items;
            setDriveItems(items);

            const isRoot = !targetId || targetId === 'root' || targetId === cdeConfig.folderId;
            if (isRoot) {
                treeDataRef.current['root'] = items;
                if (cdeConfig.folderId) treeDataRef.current[cdeConfig.folderId] = items;
                setTreeData(prev => ({
                    ...prev,
                    root: items,
                    ...(cdeConfig.folderId ? { [cdeConfig.folderId]: items } : {})
                }));
            } else {
                setTreeData(prev => ({ ...prev, [targetId]: items }));
            }

            setExpandedFolders(prev => {
                const next = new Set(prev);
                next.add('root');
                if (cdeConfig.folderId) next.add(cdeConfig.folderId);
                currentPath.forEach(p => next.add(p.id));
                if (targetId && targetId !== 'root') next.add(targetId);
                return next;
            });
        } catch (err: any) {
            console.error('[Project CDE] Load error:', err);
            setCdeLoadError(err?.message || 'Erro ao comunicar com o CDE.');
        } finally {
            setIsLoadingDrive(false);
        }
    };

    useEffect(() => {
        if (cdeConfig?.connected) {
            loadProjectCdeView();
        } else {
            setDriveItems([]);
            setTreeData({});
            treeDataRef.current = {};
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        cdeConfig?.connected,
        cdeConfig?.folderId,
        cdeConfig?.folderPath,
        cdeConfig?.lastSync,
        currentPath
    ]);

    const toggleTreeFolderExpand = async (folderId: string) => {
        const next = new Set(expandedFolders);
        if (next.has(folderId)) {
            next.delete(folderId);
            setExpandedFolders(next);
        } else {
            next.add(folderId);
            setExpandedFolders(next);
            if (!treeDataRef.current[folderId] && cdeConfig?.connected) {
                try {
                    const items = await fetchCdeContent(cdeConfig, folderId);
                    treeDataRef.current[folderId] = items;
                    setTreeData(prev => ({ ...prev, [folderId]: items }));
                } catch (e) {
                    console.warn('Failed to expand folder in tree:', e);
                }
            }
        }
    };


    // Create New Folder in Current Path
    const handleCreateNewFolder = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanName = newFolderName.trim();
        if (!cleanName) return;

        if (!cdeConfig?.connected) {
            addNotification('warning', 'Configure primeiro a ligação ao CDE.');
            setIsNewFolderModalOpen(false);
            setIsCdeModalOpen(true);
            return;
        }

        setIsNewFolderModalOpen(false);
        setNewFolderName('');
        setIsLoadingDrive(true);

        try {
            const parentFolderId = currentPath.length > 0 ? currentPath[currentPath.length - 1].id : 'root';
            const effectiveConfig = {
                ...cdeConfig,
                projectId,
            };
            await createOneDriveFolder(effectiveConfig, parentFolderId, cleanName);
            addNotification('success', `Pasta "${cleanName}" criada com sucesso no CDE!`);
            await loadProjectCdeView(parentFolderId, true);
        } catch (err: any) {
            console.error('Erro ao criar pasta no CDE:', err);
            addNotification('error', `Falha ao criar pasta no CDE: ${err.message}`);
            alert(`Erro ao criar pasta: ${err.message}`);
        } finally {
            setIsLoadingDrive(false);
        }
    };

    // Upload Files / Folders
    const handleUploadAction = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        if (!cdeConfig?.connected) {
            addNotification('warning', 'Ligue primeiro o CDE da obra para carregar ficheiros.');
            setIsCdeModalOpen(true);
            return;
        }

        setIsLoadingDrive(true);
        try {
            const targetFolder = currentPath.length > 0 ? currentPath[currentPath.length - 1].id : 'root';
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                await uploadToCDEFolder(
                    { ...cdeConfig, projectId } as any,
                    targetFolder,
                    file
                );
            }
            addNotification('success', `${files.length} ficheiro(s) carregado(s) com sucesso para o CDE!`);
            await loadProjectCdeView(targetFolder, true);
        } catch (err: any) {
            console.error('Erro no upload de ficheiros:', err);
            addNotification('error', `Falha no upload: ${err.message}`);
            alert(`Falha no upload: ${err.message}`);
        } finally {
            setIsLoadingDrive(false);
            if (fileInputUploadRef.current) fileInputUploadRef.current.value = '';
            if (folderInputRef.current) folderInputRef.current.value = '';
        }
    };

    // Archive File to "Arquivo" Subfolder
    const handleArchive = async (file: any) => {
        if (!confirm(`Tem a certeza que deseja arquivar "${file.name}"? O ficheiro será movido para a subpasta "Arquivo".`)) return;

        setIsLoadingDrive(true);
        try {
            const parentId = currentPath.length > 0 ? currentPath[currentPath.length - 1].id : 'root';
            const result = await archiveCDEFile(cdeConfig!, file.id, parentId);

            if (result.success) {
                addNotification('success', `Ficheiro "${file.name}" arquivado com sucesso.`);
                await loadProjectCdeView(parentId, true);
            } else {
                addNotification('error', `Falha ao arquivar: ${result.message}`);
            }
        } catch (e: any) {
            addNotification('error', `Erro ao arquivar: ${e.message}`);
        } finally {
            setIsLoadingDrive(false);
        }
    };

    return (
        <div className="space-y-4 p-4 md:p-6">
            {/* ════════ HEADER: BARRA DE FERRAMENTAS CDE ════════ */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 dark:border-[#444746] gap-4">
                <div>
                    <h2 className="text-xl font-normal text-google-text flex items-center gap-2">
                        <Folder className="text-primary" size={22} />
                        <span>Documentos da Obra</span>
                    </h2>
                    {/* Breadcrumbs Navigation */}
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1 flex-wrap">
                        <span
                            className={cn(
                                "cursor-pointer transition-colors",
                                currentPath.length === 0 ? "font-bold text-[var(--text)]" : "hover:underline hover:text-primary"
                            )}
                            onClick={() => setCurrentPath([])}
                        >
                            {cdeConfig?.connected
                                ? (cdeConfig.folderPath || (cdeConfig.provider === 'onedrive' ? 'SharePoint / CDE' : 'CDE'))
                                : 'CDE (Não Ligado)'}
                        </span>
                        {currentPath.map((p, idx) => (
                            <span key={p.id || idx} className="flex items-center gap-1.5">
                                <span>/</span>
                                <span
                                    className={cn(
                                        "cursor-pointer transition-colors",
                                        idx === currentPath.length - 1 ? "font-bold text-[var(--text)]" : "hover:underline hover:text-primary"
                                    )}
                                    onClick={() => setCurrentPath(currentPath.slice(0, idx + 1))}
                                >
                                    {p.name}
                                </span>
                            </span>
                        ))}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Button: Dropdown Novo */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => {
                                if (!cdeConfig?.connected) {
                                    addNotification('warning', 'Ligue primeiro o CDE da obra para criar pastas ou carregar ficheiros.');
                                    setIsCdeModalOpen(true);
                                    return;
                                }
                                setIsNewMenuOpen(!isNewMenuOpen);
                            }}
                            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-primary rounded-full hover:bg-primary-hover shadow-sm transition-all cursor-pointer"
                        >
                            <Plus size={15} className="text-white" />
                            <span>Novo</span>
                            <ChevronDown size={13} className="text-white/80" />
                        </button>

                        {isNewMenuOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsNewMenuOpen(false)}></div>
                                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-surface rounded-xl shadow-xl border border-gray-100 dark:border-[#444746] py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsNewMenuOpen(false);
                                            setIsNewFolderModalOpen(true);
                                        }}
                                        className="w-full text-left px-4 py-2.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#131314] flex items-center gap-3 cursor-pointer"
                                    >
                                        <GoogleDriveIcon type="folder" size={18} />
                                        <span>Nova pasta</span>
                                    </button>
                                    <div className="h-px bg-gray-100 dark:bg-gray-800 my-1"></div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsNewMenuOpen(false);
                                            fileInputUploadRef.current?.click();
                                        }}
                                        className="w-full text-left px-4 py-2.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#131314] flex items-center gap-3 cursor-pointer"
                                    >
                                        <FileText size={16} className="text-primary" />
                                        <span>Carregar ficheiro</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsNewMenuOpen(false);
                                            folderInputRef.current?.click();
                                        }}
                                        className="w-full text-left px-4 py-2.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#131314] flex items-center gap-3 cursor-pointer"
                                    >
                                        <GoogleDriveIcon type="folder" size={18} />
                                        <span>Carregar pasta</span>
                                    </button>
                                </div>
                            </>
                        )}

                        <input
                            type="file"
                            ref={fileInputUploadRef}
                            className="hidden"
                            multiple
                            onChange={handleUploadAction}
                        />
                        <input
                            type="file"
                            ref={folderInputRef}
                            className="hidden"
                            {...({ webkitdirectory: '', directory: '' } as any)}
                            onChange={handleUploadAction}
                        />
                    </div>

                    {/* Button: Definições CDE */}
                    <button
                        type="button"
                        onClick={() => setIsCdeModalOpen(true)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-surface border border-gray-200 dark:border-[#444746] rounded-full hover:bg-gray-50 dark:hover:bg-[#131314] transition-all cursor-pointer shadow-xs"
                        title="Configurar integração com Cloud CDE da Obra"
                    >
                        <Cloud size={14} className={cdeConfig?.connected ? "text-emerald-500" : "text-amber-500"} />
                        <span>CDE: {cdeConfig?.connected ? (cdeConfig.provider?.toUpperCase() || 'Cloud') : 'Não Ligado'}</span>
                    </button>

                    {/* Search input */}
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Pesquisar..."
                            className="bg-gray-100 dark:bg-surface border-none rounded-full pl-9 pr-4 py-1.5 text-xs w-48 sm:w-56 focus:ring-2 focus:ring-primary-light outline-none transition-all focus:bg-white dark:focus:bg-surface focus:shadow-sm"
                        />
                    </div>
                </div>
            </div>

            {/* ════════ MAIN EXPLORER: ÁRVORE ESQUERDA & TABELA DIREITA ════════ */}
            <div className="flex h-[640px] gap-6 bg-white dark:bg-surface border border-gray-200 dark:border-[#444746] rounded-2xl overflow-hidden shadow-xs">
                {/* Left Sidebar (Tree View) */}
                <div className="w-64 flex-shrink-0 border-r border-gray-100 dark:border-[#444746] hidden md:flex md:flex-col p-4 h-full bg-gray-50/50 dark:bg-[#131314]/30">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] pb-2 border-b border-[var(--border)] mb-2 flex items-center justify-between">
                        <span>Pastas CDE</span>
                        {cdeConfig?.connected && (
                            <button
                                type="button"
                                onClick={() => loadProjectCdeView(undefined, true)}
                                className="text-[10px] text-primary hover:underline cursor-pointer flex items-center gap-1"
                                title="Atualizar pastas do CDE"
                            >
                                <RotateCw size={11} className={isLoadingDrive ? "animate-spin" : ""} />
                            </button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar pr-1 space-y-0.5">
                        {!cdeConfig?.connected ? (
                            <div className="py-8 px-2 text-center text-xs text-[var(--text-muted)]">
                                Sem pastas (CDE não ligado)
                            </div>
                        ) : (
                            (() => {
                                const renderTreeItem = (
                                    folderId: string,
                                    folderName: string,
                                    pathUntilNow: Array<{ id: string; name: string }>,
                                    depth = 0
                                ): React.ReactNode => {
                                    const isExpanded = expandedFolders.has(folderId);
                                    const isCurrent =
                                        (folderId === 'root' && currentPath.length === 0) ||
                                        (currentPath.length > 0 && currentPath[currentPath.length - 1].id === folderId);
                                    const children = (treeData[folderId] || []).filter(
                                        (i: any) => i.mimeType === 'application/vnd.google-apps.folder' || (i.mimeType || '').includes('folder')
                                    );

                                    return (
                                        <div key={folderId} className="select-none">
                                            <div
                                                className={cn(
                                                    "flex items-center gap-2 py-1.5 px-2.5 rounded-lg cursor-pointer transition-colors text-xs font-medium",
                                                    isCurrent
                                                        ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800/60 shadow-xs"
                                                        : "hover:bg-gray-100 dark:hover:bg-surface text-gray-700 dark:text-gray-200"
                                                )}
                                                style={{ paddingLeft: `${depth * 14 + 8}px` }}
                                                onClick={() => {
                                                    if (folderId === 'root') {
                                                        setCurrentPath([]);
                                                    } else {
                                                        setCurrentPath(pathUntilNow);
                                                    }
                                                    setExpandedFolders(prev => new Set(prev).add(folderId));
                                                }}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleTreeFolderExpand(folderId);
                                                    }}
                                                    className={cn(
                                                        "p-0.5 rounded cursor-pointer shrink-0 transition-colors",
                                                        isCurrent
                                                            ? "text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                                                            : "text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-surface"
                                                    )}
                                                >
                                                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                </button>
                                                <GoogleDriveIcon
                                                    type="folder"
                                                    size={20}
                                                    customColor={isCurrent ? "#2563EB" : undefined}
                                                />
                                                <span className="truncate">{folderName}</span>
                                            </div>

                                            {isExpanded && children.length > 0 && (
                                                <div className="space-y-0.5 mt-0.5">
                                                    {children.map((child: any) =>
                                                        renderTreeItem(
                                                            child.id,
                                                            child.name,
                                                            [...pathUntilNow, { id: child.id, name: child.name }],
                                                            depth + 1
                                                        )
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                };

                                return renderTreeItem(
                                    'root',
                                    cdeConfig.folderPath || (cdeConfig.provider === 'onedrive' ? 'SharePoint' : 'CDE'),
                                    [],
                                    0
                                );
                            })()
                        )}
                    </div>
                </div>

                {/* Right Main Table */}
                <div className="flex-1 flex flex-col min-w-0 p-4 overflow-y-auto">
                    {!cdeConfig?.connected ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
                                <Cloud size={28} />
                            </div>
                            <h3 className="text-sm font-bold text-[var(--text)] mb-1">
                                Nenhum CDE conectado a esta obra
                            </h3>
                            <p className="text-xs text-[var(--text-muted)] max-w-md mb-5 leading-relaxed">
                                Para visualizar e gerir os documentos e pastas reais da obra no SharePoint, OneDrive, Google Drive ou Dropbox, configure primeiro a ligação ao Ambiente Comum de Dados (CDE).
                            </p>
                            <button
                                type="button"
                                onClick={() => setIsCdeModalOpen(true)}
                                className="px-4 py-2 rounded-full text-xs font-bold bg-primary text-white hover:bg-primary-hover shadow-sm transition-all cursor-pointer inline-flex items-center gap-2"
                            >
                                <Cloud size={14} />
                                <span>Configurar Ligação CDE</span>
                            </button>
                        </div>
                    ) : isLoadingDrive ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-400">
                            <RotateCw size={26} className="animate-spin text-primary mb-3" />
                            <p className="text-xs">A carregar pastas e documentos do CDE ({cdeConfig.folderPath || (cdeConfig.provider === 'onedrive' ? 'SharePoint' : 'CDE')})...</p>
                        </div>
                    ) : (
                        <table className="w-full text-left text-xs text-gray-600 dark:text-gray-300">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-[#444746] text-gray-400 font-normal">
                                    <th className="py-2.5 px-3 font-normal w-10 text-center">#</th>
                                    <th className="py-2.5 px-3 font-normal">Nome</th>
                                    <th className="py-2.5 px-3 font-normal w-24">Versão</th>
                                    <th className="py-2.5 px-3 font-normal w-32">Data</th>
                                    <th className="py-2.5 px-3 font-normal w-24">Tamanho</th>
                                    <th className="w-24 text-right pr-4">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Parent navigation row */}
                                {currentPath.length > 0 && (
                                    <tr
                                        className="hover:bg-gray-50 dark:hover:bg-[#131314] border-b border-gray-100 dark:border-gray-800 cursor-pointer group"
                                        onClick={() => setCurrentPath(currentPath.slice(0, currentPath.length - 1))}
                                    >
                                        <td className="py-2 px-3 text-center">
                                            <div className="flex justify-center">
                                                <GoogleDriveIcon type="folder" size={24} />
                                            </div>
                                        </td>
                                        <td className="py-2 px-3 font-medium text-gray-500" colSpan={5}>
                                            .. (Voltar para pasta anterior)
                                        </td>
                                    </tr>
                                )}

                                {(() => {
                                    let visibleItems = [...driveItems];
                                    if (searchQuery.trim()) {
                                        const q = searchQuery.toLowerCase();
                                        visibleItems = visibleItems.filter((item: any) => (item.name || '').toLowerCase().includes(q));
                                    }

                                    // Sort folders first, then alphabetically
                                    visibleItems.sort((a: any, b: any) => {
                                        const aIsFolder = a.mimeType === 'application/vnd.google-apps.folder' || (a.mimeType || '').includes('folder');
                                        const bIsFolder = b.mimeType === 'application/vnd.google-apps.folder' || (b.mimeType || '').includes('folder');
                                        if (aIsFolder && !bIsFolder) return -1;
                                        if (!aIsFolder && bIsFolder) return 1;
                                        return String(a.name || '').localeCompare(String(b.name || ''), undefined, { numeric: true });
                                    });

                                    if (visibleItems.length === 0) {
                                        return (
                                            <tr>
                                                <td colSpan={6} className="py-12 text-center text-gray-400">
                                                    <GoogleDriveIcon type="default" size={40} className="mx-auto mb-2 opacity-20" />
                                                    <p className="text-xs font-medium text-[var(--text)] mb-1">
                                                        Nenhum documento ou pasta encontrado nesta localização do CDE.
                                                    </p>
                                                    {cdeLoadError && (
                                                        <p className="text-[11px] text-red-500 mb-2">
                                                            Erro: {cdeLoadError}
                                                        </p>
                                                    )}
                                                    <p className="text-[11px] text-[var(--text-muted)] mb-4">
                                                        Fornecedor: <strong>{cdeConfig.provider?.toUpperCase()}</strong> • Pasta base: <strong>{cdeConfig.folderPath || 'Raiz'}</strong>
                                                    </p>
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => loadProjectCdeView(undefined, true)}
                                                            className="px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-[var(--text)] hover:bg-gray-200 transition-all cursor-pointer inline-flex items-center gap-1.5"
                                                        >
                                                            <RotateCw size={12} /> Recarregar Conteúdos
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    }

                                    return visibleItems.map((item: any) => {
                                        const isFolder = item.mimeType === 'application/vnd.google-apps.folder' || (item.mimeType || '').includes('folder');
                                        const dbDoc = dbDocMapById.get(item.id) || (!isFolder ? dbDocMapByName.get(item.name.toLowerCase()) : null);
                                        const version = isFolder ? '—' : (dbDoc?.version ? `v${dbDoc.version}.0` : 'v1.0');
                                        const displayDate = dbDoc?.updatedAt
                                            ? new Date(dbDoc.updatedAt).toLocaleDateString()
                                            : (item.modifiedTime || item.createdTime ? new Date(item.modifiedTime || item.createdTime).toLocaleDateString() : '—');
                                        const displaySize = !isFolder && item.size
                                            ? (Number(item.size) > 1048576
                                                ? `${(Number(item.size) / 1048576).toFixed(1)} MB`
                                                : `${Math.max(1, Math.round(Number(item.size) / 1024))} KB`)
                                            : '—';

                                        return (
                                            <tr
                                                key={item.id}
                                                className="hover:bg-gray-50 dark:hover:bg-[#131314] border-b border-gray-100 dark:border-gray-800 cursor-pointer group"
                                                onClick={() => {
                                                    if (isFolder) {
                                                        setCurrentPath([...currentPath, { id: item.id, name: item.name }]);
                                                    } else if (item.webViewLink) {
                                                        window.open(item.webViewLink, '_blank');
                                                    }
                                                }}
                                            >
                                                <td className="py-2 px-3 text-center">
                                                    <div className="flex justify-center">
                                                        <GoogleDriveIcon type={isFolder ? 'folder' : (item.mimeType || 'pdf')} size={isFolder ? 24 : 20} />
                                                    </div>
                                                </td>
                                                <td className="py-2 px-3">
                                                    <span className={cn(
                                                        "block group-hover:text-primary transition-colors",
                                                        isFolder ? "font-semibold text-gray-900 dark:text-white" : "font-medium text-gray-900 dark:text-white"
                                                    )}>
                                                        {item.name}
                                                    </span>
                                                </td>
                                                <td className="py-2 px-3 text-gray-500 font-mono">
                                                    {version}
                                                </td>
                                                <td className="py-2 px-3 text-gray-500 font-mono">
                                                    {displayDate}
                                                </td>
                                                <td className="py-2 px-3 text-gray-500 font-mono">
                                                    {displaySize}
                                                </td>
                                                <td className="py-2 px-3 text-right pr-4">
                                                    <div className="flex items-center gap-1.5 justify-end">
                                                        {isFolder ? (
                                                            <ChevronRight size={14} className="text-gray-400 group-hover:text-primary transition-colors" />
                                                        ) : (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleArchive(item);
                                                                    }}
                                                                    className="p-1 rounded-full text-gray-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/40 inline-flex transition-colors cursor-pointer"
                                                                    title="Arquivar documento"
                                                                >
                                                                    <Archive size={15} />
                                                                </button>
                                                                {item.webViewLink && (
                                                                    <a
                                                                        href={item.webViewLink}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        className="p-1 rounded-full text-gray-400 hover:text-primary hover:bg-blue-50 dark:hover:bg-blue-950/40 inline-flex transition-colors"
                                                                        title="Abrir no SharePoint / Cloud"
                                                                    >
                                                                        <ExternalLink size={15} />
                                                                    </a>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    });
                                })()}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* ════════ MODAL: CRIAR NOVA PASTA ════════ */}
            <Modal
                maxWidth="max-w-md"
                title={
                    <div className="flex items-center gap-2">
                        <FolderPlus size={18} className="text-primary" />
                        <span className="font-bold text-sm text-[var(--text)]">Criar Nova Pasta</span>
                    </div>
                }
                isOpen={isNewFolderModalOpen}
                onClose={() => setIsNewFolderModalOpen(false)}
            >
                <form onSubmit={handleCreateNewFolder} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-[var(--text)] mb-1">
                            Pasta de Destino no CDE
                        </label>
                        <div className="w-full text-xs px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-input)]/60 text-[var(--text-muted)] font-mono truncate">
                            📁 {currentPath.length > 0
                                ? `${cdeConfig?.folderPath || 'CDE'} / ${currentPath.map(p => p.name).join(' / ')}`
                                : (cdeConfig?.folderPath || 'Raiz do CDE')}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-[var(--text)] mb-1">
                            Nome da Nova Pasta <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={newFolderName}
                            onChange={e => setNewFolderName(e.target.value)}
                            placeholder="Ex: Auditorias 2026, Declarações Clientes..."
                            className="w-full text-xs px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text)] focus:outline-none focus:border-primary"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
                        <SecondaryButton type="button" onClick={() => setIsNewFolderModalOpen(false)}>
                            Cancelar
                        </SecondaryButton>
                        <PrimaryButton type="submit" className="py-2 px-4 text-xs font-bold">
                            Criar Pasta
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>


            {/* ════════ MODAL: CONFIGURAÇÕES CDE ════════ */}
            <CDESettingsModal
                isOpen={isCdeModalOpen}
                onClose={() => setIsCdeModalOpen(false)}
                projectId={projectId}
            />

            {/* ════════ MODAL: VISUALIZADOR DE PDF / DOCUMENTOS ════════ */}
            <PDFViewerModal
                isOpen={!!viewerDoc}
                onClose={() => setViewerDoc(null)}
                fileUrl={viewerDoc?.url || ''}
                fileName={viewerDoc?.name || 'Documento'}
            />
        </div>
    );
}
