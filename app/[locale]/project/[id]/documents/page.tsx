'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Upload, Search, Archive, Plus, ChevronDown, ChevronRight, FileText, FolderPlus } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { archiveCDEFile, refreshDropboxToken, initializeProjectStructure, createOneDriveFolder } from '@/lib/cde-manager';
import { GoogleDriveIcon } from '@/components/GoogleDriveIcons';

const Documents = () => {
    const params = useParams();
    const projectId = params?.id as string;
    const { projects, updateProjectCDE, getDocumentsByProject } = useStore();

    // Get current project and documents
    const project = projects.find(p => p.id === projectId);
    const dbDocuments = getDocumentsByProject(projectId);

    // Create a lookup map for DB documents by CDE File ID (Primary) and Name (Secondary)
    const dbDocMapById = new Map<string, any>();
    const dbDocMapByName = new Map<string, any>();

    dbDocuments.forEach(doc => {
        if (doc.cdeFileId) {
            dbDocMapById.set(doc.cdeFileId, doc);
        }
        if (doc.name) {
            dbDocMapByName.set(doc.name.toLowerCase(), doc);
        }
    });

    // CDE Specific Colors
    const getFolderColor = () => {
        const provider = project?.cdeConfig?.provider;
        if (provider === 'dropbox') return '#A0C4FF';
        if (provider === 'onedrive') return '#FFD84C';
        return undefined; // Google Drive / Default
    };
    const folderColor = getFolderColor();



    // Drive State
    const [currentPath, setCurrentPath] = useState<Array<{ id: string, name: string }>>([]);
    const [driveItems, setDriveItems] = useState<any[]>([]); // Content of the current view (Right pane)
    const [isLoadingDrive, setIsLoadingDrive] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

    // Tree State
    const [treeData, setTreeData] = useState<Record<string, any[]>>({}); // Cache of folder children for the tree
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

    // UI State
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(true); // Default open (per user request "vista inicial predefinida... mostrar todas as pastas")
    const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
    const [isInitializing, setIsInitializing] = useState(false);

    const fileInputUploadRef = useRef<HTMLInputElement>(null);
    const folderInputRef = useRef<HTMLInputElement>(null);



    const extractFolderId = (url: string) => {
        if (!url) return null;
        const folderMatch = url.match(/folders\/([-a-zA-Z0-9_]+)/);
        if (folderMatch) return folderMatch[1];
        const idMatch = url.match(/id=([-a-zA-Z0-9_]+)/);
        if (idMatch) return idMatch[1];
        return null;
    };



    // Generic fetch that returns the items (doesn't set state directly)
    const fetchGenericDriveContent = async (accessToken: string, folderId: string) => {
        try {
            const query = `'${folderId}' in parents and trashed = false`;
            const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&orderBy=folder,name&fields=files(id,name,mimeType,size,webViewLink,iconLink,createdTime,thumbnailLink)`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });

            if (!response.ok) {
                // handle error
                return [];
            }
            const data = await response.json();
            return data.files || [];
        } catch (error) {
            console.error('Fetch Drive Logic Error:', error);
            return [];
        }
    };

    // Helper wrappers
    const fetchGoogleDriveContent = async (accessToken: string, folderId: string) => {
        const items = await fetchGenericDriveContent(accessToken, folderId);
        return items;
    };

    const createGoogleDriveFolder = async (accessToken: string, parentId: string, folderName: string) => {
        try {
            const metadata = {
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [parentId]
            };
            const response = await fetch('https://www.googleapis.com/drive/v3/files', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(metadata)
            });
            if (!response.ok) throw new Error('Failed to create folder');
            return await response.json();
        } catch (error) {
            console.error('Create Folder Error:', error);
            alert('Failed to create folder: ' + error);
            throw error;
        }
    };

    const uploadFileToGoogleDrive = async (accessToken: string, parentId: string, file: File) => {
        try {
            const metadata = {
                name: file.name,
                parents: [parentId]
            };
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', file);

            const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: { Authorization: `Bearer ${accessToken}` },
                body: form
            });
            if (!response.ok) throw new Error('Failed to upload file');
            return await response.json();
        } catch (error) {
            console.error('Upload Error:', error);
            throw error;
        }
    };

    const uploadFileToDropbox = async (accessToken: string, parentPath: string, file: File) => {
        // Dropbox Upload: 2 steps usually (Start, Append, Finish) for large files, or /upload for small
        // For simplicity, using /files/upload (limited 150MB)
        try {
            const path = (parentPath === 'root' || !parentPath) ? '' : parentPath;
            const dbxPath = `${path}/${file.name}`;

            // Dropbox requires "Dropbox-API-Arg" header JSON
            const args = {
                path: dbxPath,
                mode: 'add',
                autorename: true,
                mute: false
            };

            const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Dropbox-API-Arg': JSON.stringify(args),
                    'Content-Type': 'application/octet-stream' // Binary payload
                },
                body: file
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error('Dropbox Upload Failed: ' + errText);
            }
            return await response.json();
        } catch (error) {
            console.error('Dropbox Upload Error', error);
            throw error;
        }
    };

    const handleCreateFolderAction = async () => {
        if (!project?.cdeConfig?.connected) return;
        const name = prompt('Nome da Pasta:');
        if (!name) return;

        setIsLoadingDrive(true);
        const defaultFolderId = project?.cdeConfig?.provider === 'dropbox' ? (project.cdeConfig.folderPath || '') : (project.cdeConfig.folderId || 'root');
        const folderId = currentPath.length > 0 ? currentPath[currentPath.length - 1].id : defaultFolderId;
        const provider = project.cdeConfig.provider;

        console.log('Creating Folder:', name, 'Provider:', provider, 'Target:', folderId);

        try {
            if (provider === 'gdrive') {
                await createGoogleDriveFolder(project.cdeConfig.accessToken!, folderId, name);
                const items = await fetchGoogleDriveContent(project.cdeConfig.accessToken!, folderId);
                setDriveItems(items);
                setTreeData(prev => ({ ...prev, [folderId]: items }));
            } else if (provider === 'dropbox') {
                await createDropboxFolder(project.cdeConfig.accessToken!, folderId === 'root' ? '' : folderId, name);
                const items = await fetchDropboxContent(project.cdeConfig, folderId === 'root' ? '' : folderId);
                setDriveItems(items);
                setTreeData(prev => ({ ...prev, [folderId]: items }));
            } else if (provider === 'onedrive') {
                await createOneDriveFolder({ ...project.cdeConfig, projectId: project.id } as any, folderId, name);
                const items = await fetchSharePointContent(project.cdeConfig, folderId);
                setDriveItems(items);
                const rootId = project.cdeConfig.folderId || 'root';
                setTreeData(prev => ({ 
                    ...prev, 
                    [folderId]: items,
                    [rootId]: (!currentPath.length || folderId === rootId || folderId === 'root') ? items : (prev[rootId] || items),
                    'root': (!currentPath.length || folderId === 'root') ? items : (prev['root'] || items)
                }));
            }
        } catch (e: any) {
            alert(`Falha ao criar pasta (${provider}): ` + e.message);
        } finally {
            setIsLoadingDrive(false);
        }
    };

    const handleUploadAction = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0 || !project?.cdeConfig?.connected) return;

        setIsLoadingDrive(true);
        const defaultFolderId = project?.cdeConfig?.provider === 'dropbox' ? (project.cdeConfig.folderPath || '') : (project.cdeConfig.folderId || 'root');
        const folderId = currentPath.length > 0 ? currentPath[currentPath.length - 1].id : defaultFolderId;
        const provider = project.cdeConfig.provider;

        console.log('Uploading', files.length, 'files. Provider:', provider);

        let successCount = 0;
        let failCount = 0;

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                try {
                    // TODO: Handle file.webkitRelativePath for folder structure preservation if needed
                    if (provider === 'gdrive') {
                        await uploadFileToGoogleDrive(project.cdeConfig.accessToken!, folderId, file);
                    } else if (provider === 'dropbox') {
                        await uploadFileToDropbox(project.cdeConfig.accessToken!, folderId === 'root' ? '' : folderId, file);
                    } else if (provider === 'onedrive') {
                        // Skip
                    }
                    successCount++;
                } catch (e) {
                    console.error('File Upload Failed:', file.name, e);
                    failCount++;
                }
            }

            if (provider === 'gdrive') {
                const items = await fetchGoogleDriveContent(project.cdeConfig.accessToken!, folderId);
                setDriveItems(items);
            } else if (provider === 'dropbox') {
                const items = await fetchDropboxContent(project.cdeConfig, folderId === 'root' ? '' : folderId);
                setDriveItems(items);
            }

            if (failCount > 0) {
                alert(`Upload Complete: ${successCount} success, ${failCount} failed.`);
            }

        } catch (e: any) {
            alert(`Batch Upload Error (${provider}): ` + e.message);
        } finally {
            setIsLoadingDrive(false);
            // Reset inputs
            if (fileInputUploadRef.current) fileInputUploadRef.current.value = '';
            if (folderInputRef.current) folderInputRef.current.value = '';
        }
    };

    const handleInitializeFolders = async () => {
        if (!project?.cdeConfig?.connected) return;
        setIsInitializing(true);
        try {
            const logs = await initializeProjectStructure(project.cdeConfig, async (token, expiresAt) => {
                updateProjectCDE(project.id, { ...project.cdeConfig, accessToken: token } as any);
            });
            alert('Pastas tipo criadas:\n' + logs.filter(l => l.includes('Created') || l.includes('Criada')).join('\n'));

            // Refresh main view
            const rootId = project.cdeConfig.provider === 'dropbox' ? (project.cdeConfig.folderPath || '') : (project.cdeConfig.folderId || 'root');
            const targetId = currentPath.length > 0 ? currentPath[currentPath.length - 1].id : rootId;

            let items: any[] = [];
            if (project.cdeConfig.provider === 'gdrive' && project.cdeConfig.accessToken) {
                items = await fetchGoogleDriveContent(project.cdeConfig.accessToken, targetId);
            } else if (project.cdeConfig.provider === 'onedrive') {
                items = await fetchSharePointContent(project.cdeConfig, targetId);
            } else if (project.cdeConfig.provider === 'dropbox') {
                items = await fetchDropboxContent(project.cdeConfig, targetId);
            }
            setDriveItems(items);
            setTreeData(prev => ({ ...prev, [targetId]: items, [rootId]: items, 'root': items }));
        } catch (e: any) {
            alert('Erro ao criar pastas tipo: ' + e.message);
        } finally {
            setIsInitializing(false);
        }
    };

    const fetchSharePointContent = async (config: any, folderId: string) => {
        try {
            // 1. Tentar via endpoint de ação CDE no servidor (que tem credenciais desencriptadas)
            try {
                const res = await fetch(`/api/projects/${projectId}/cde/action`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'list',
                        payload: { folderId }
                    })
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.result?.files) {
                        return data.result.files;
                    }
                }
            } catch (_) { }

            // 2. Fallback via /api/integration/sharepoint
            const res2 = await fetch('/api/integration/sharepoint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'list',
                    tenantId: config.tenantId,
                    clientId: config.clientId,
                    clientSecret: config.clientSecret,
                    siteUrl: config.siteUrl,
                    folderPath: config.folderPath,
                    folderId: folderId,
                    projectId: projectId
                })
            });
            if (!res2.ok) {
                const err = await res2.json();
                throw new Error(err.error || 'SharePoint Error');
            }
            const data2 = await res2.json();
            return data2.files || [];
        } catch (error) {
            console.error('SharePoint Fetch Error:', error);
            throw error;
        }
    };

    const fetchDropboxContent = async (config: any, path: string): Promise<any[]> => {
        try {
            // Dropbox paths: root is '', folders are '/Folder'
            const dbxPath = (path === 'root' || !path) ? '' : path;

            console.log(`Documents: Listing Dropbox '${dbxPath}'...`);
            const res = await fetch('/api/integration/dropbox', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'list',
                    accessToken: config.accessToken,
                    path: dbxPath
                })
            });

            if (!res.ok) {
                const errText = await res.text();

                // Check Access Token Expiry
                if (errText.includes('expired_access_token')) {
                    console.log('Dropbox Token Expired. Attempting Refresh...');
                    if (!config.refreshToken) {
                        throw new Error('Dropbox Connection Expired. Please reconnect.');
                    }
                    try {
                        const newTokens = await refreshDropboxToken(config);
                        // Update Store with new token
                        if (project) {
                            updateProjectCDE(project.id, { ...config, accessToken: newTokens.accessToken });
                        }

                        // Retry with new token
                        return await fetchDropboxContent({ ...config, accessToken: newTokens.accessToken }, path);

                    } catch (refreshErr) {
                        console.error('Dropbox Refresh Failed', refreshErr);
                        throw new Error('Dropbox Connection Expired. Please reconnect.');
                    }
                }

                console.error('Dropbox API Error:', errText);
                try {
                    const err = JSON.parse(errText);
                    throw new Error(err.error || 'Dropbox Error');
                } catch (e) {
                    throw new Error('Dropbox API Failed: ' + errText);
                }
            }
            const data = await res.json();
            return data.files || [];
        } catch (error: any) {
            console.error('Dropbox Fetch Error:', error);
            // Avoid double wrapping error
            if (error.message && error.message.includes('Dropbox Connection Expired')) throw error;
            throw error;
        }
    };

    const createDropboxFolder = async (accessToken: string, parentPath: string, folderName: string) => {
        try {
            const res = await fetch('/api/integration/dropbox', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'create_folder',
                    accessToken: accessToken,
                    path: parentPath,
                    name: folderName
                })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Create Folder Failed');
            }
            return await res.json();
        } catch (error) {
            console.error('Dropbox Create Folder Error:', error);
            throw error;
        }
    };

    const handleArchive = async (file: any) => {
        if (!confirm(`Are you sure you want to archive "${file.name}"? It will be moved to the "Arquivo" subfolder.`)) return;

        setIsLoadingDrive(true);
        try {
            const parentId = currentPath.length > 0
                ? currentPath[currentPath.length - 1].id
                : (project?.cdeConfig?.provider === 'dropbox' ? (project.cdeConfig.folderPath || '') : (project?.cdeConfig?.folderId || 'root'));

            const result = await archiveCDEFile(project!.cdeConfig!, file.id, parentId);

            if (result.success) {
                // Refresh
                const items = project?.cdeConfig?.provider === 'gdrive'
                    ? await fetchGoogleDriveContent(project.cdeConfig.accessToken!, parentId)
                    : await fetchDropboxContent(project!.cdeConfig!, parentId);
                setDriveItems(items);
                alert('File archived successfully.');
            } else {
                alert('Archive failed: ' + result.message);
            }
        } catch (e: any) {
            alert('Archive Error: ' + e.message);
        } finally {
            setIsLoadingDrive(false);
        }
    };

    // ... useEffect ...

    // Initial Load & Navigation
    useEffect(() => {
        if (project?.cdeConfig?.connected) {
            const load = async () => {
                setIsLoadingDrive(true);
                try {
                    const defaultRootId = project.cdeConfig!.provider === 'dropbox' ? (project.cdeConfig!.folderPath || '') : (project.cdeConfig!.folderId || 'root');
                    const targetId = currentPath.length > 0 ? currentPath[currentPath.length - 1].id : defaultRootId;
                    console.log('Loading Content:', project.cdeConfig!.provider, targetId);

                    let items: any[] = [];
                    // ... (existing loading logic for main view) ...
                    if (project.cdeConfig!.provider === 'gdrive' && project.cdeConfig!.accessToken) {
                        items = await fetchGoogleDriveContent(project.cdeConfig!.accessToken, targetId);

                        // Populate Tree Data for Root if empty
                        const rootId = project.cdeConfig!.folderId || 'root';

                        // If we are at root (or initialized), ensure root is loaded in treeData
                        if (!treeData[rootId]) {
                            // If targetId IS root, we have items.
                            if (targetId === rootId) {
                                setTreeData(prev => ({ ...prev, [rootId]: items }));
                            } else {
                                // Fetch root separately if we started deep (unlikely in this app flow but good for robustness)
                                const rootItems = await fetchGenericDriveContent(project.cdeConfig!.accessToken, rootId);
                                setTreeData(prev => ({ ...prev, [rootId]: rootItems }));
                            }
                            setExpandedFolders(prev => {
                                const next = new Set(prev);
                                next.add(rootId);
                                // Also expand all found folders in the root to ensure "Show all folders" visual preference?
                                // User said "mostrar todas as pastas dentro do CDE" (show all folders inside CDE).
                                // Expanding the Root (CDE) accomplishes this by revealing Level 1.
                                return next;
                            });
                        }

                        // Also populate treeData for CURRENT folder, so if we expand it later, it is there
                        setTreeData(prev => ({ ...prev, [targetId]: items }));

                        // Auto-expand hierarchy in tree logic
                        // If we navigated to a folder, and we want to show it in the tree, we should ensure parents are expanded.
                        // Since currentPath tracks history, we can iterate:
                        if (currentPath.length > 0) {
                            const newExpanded = new Set(expandedFolders);
                            newExpanded.add(rootId);
                            currentPath.forEach(p => newExpanded.add(p.id));
                            // Note: We might miss siblings if we forced expand without fetching. 
                            // The tree component handles fetching only on manual toggle. 
                            // Auto-expand assumes data is there or will be fetched? 
                            // Current implementation: We only setTreeData for what we fetched (targetId). 
                            // So intermediate nodes might be expanded but empty until manually toggled or fetched?
                            // Fix: We should probably fetch generic content for ancestors if missing? 
                            // For MVP, we'll let user manually toggle or assume linear navigation populated the tree.
                            // But user said: "ao entrar numa pasta... colapsa" (updates tree).
                            setExpandedFolders(newExpanded);
                        }

                    } else if (project.cdeConfig!.provider === 'onedrive') {
                        items = await fetchSharePointContent(project.cdeConfig, targetId);
                        const rootId = project.cdeConfig!.folderId || 'root';
                        const currentId = targetId || rootId;
                        setTreeData(prev => ({
                            ...prev,
                            [currentId]: items,
                            ...(targetId === 'root' || targetId === rootId ? { [rootId]: items, 'root': items } : {})
                        }));

                        const newExpanded = new Set(expandedFolders);
                        newExpanded.add(rootId);
                        newExpanded.add('root');
                        currentPath.forEach(p => newExpanded.add(p.id));
                        setExpandedFolders(newExpanded);
                    } else if (project.cdeConfig!.provider === 'dropbox') {
                        let initialPath = targetId === 'root' ? '' : targetId;
                        if (targetId === 'root' && project.cdeConfig!.folderPath) {
                            initialPath = project.cdeConfig!.folderPath;
                        }
                        items = await fetchDropboxContent(project.cdeConfig, initialPath);

                        // Basic Tree Support for Dropbox (using paths as IDs)
                        const rootId = project.cdeConfig!.folderPath || 'root'; // Dropbox uses paths
                        setTreeData(prev => ({ ...prev, [targetId === '' ? 'root' : targetId]: items }));
                        setExpandedFolders(prev => new Set(prev).add(rootId === '' ? 'root' : rootId));
                    }

                    setDriveItems(items);
                } catch (err: any) {
                    console.error('Content Load Error:', err);
                } finally {
                    setIsLoadingDrive(false);
                }
            };
            load();
        }
    }, [project?.cdeConfig?.lastSync, project?.cdeConfig?.connected, currentPath]);








    const FileIcon = ({ type, size = 24, customColor }: { type: string, size?: number, customColor?: string }) => {
        return <GoogleDriveIcon type={type} size={size} customColor={customColor} />;
    };

    const toggleFolderExpand = async (folderId: string) => {
        // Toggle state
        const newExpanded = new Set(expandedFolders);
        if (newExpanded.has(folderId)) {
            newExpanded.delete(folderId);
        } else {
            newExpanded.add(folderId);
            // If opening and not in treeData, fetch
            if (!treeData[folderId]) {
                if (project?.cdeConfig?.provider === 'gdrive' && project.cdeConfig.accessToken) {
                    fetchGenericDriveContent(project.cdeConfig.accessToken, folderId).then(items => {
                        setTreeData(prev => ({ ...prev, [folderId]: items }));
                    });
                } else if (project?.cdeConfig?.provider === 'onedrive') {
                    fetchSharePointContent(project.cdeConfig, folderId).then(items => {
                        setTreeData(prev => ({ ...prev, [folderId]: items }));
                    });
                } else if (project?.cdeConfig?.provider === 'dropbox') {
                    fetchDropboxContent(project.cdeConfig, folderId).then(items => {
                        setTreeData(prev => ({ ...prev, [folderId]: items }));
                    });
                }
            }
        }
        setExpandedFolders(newExpanded);
    };

    const SidebarFolderItem = ({ folder, level = 0 }: { folder: { id: string, name: string }, level?: number }) => {
        const isExpanded = expandedFolders.has(folder.id);
        const children = treeData[folder.id]?.filter((i: any) => i.mimeType === 'application/vnd.google-apps.folder') || [];
        const hasChildren = children.length > 0; // or unknown if not loaded? For now assume valid if loaded.

        // Check if this folder is the currently selected one
        const isSelected = currentPath.length > 0 && currentPath[currentPath.length - 1].id === folder.id;

        return (
            <div className="select-none">
                <div
                    className={`flex items-center gap-1 px-2 py-2 text-[13px] rounded-r-md transition-colors cursor-pointer group ${isSelected ? 'bg-primary-light text-primary-hover' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-surface'}`}
                    style={{ paddingLeft: `${level * 16 + 8}px` }}
                    onClick={() => {
                        // Select: Update Path
                        // Also expand path to here?
                        // "when expanding... collapse" -> user said 'don't collapse'.
                        // Logic: Set as current path.

                        // We need to build the full path for Breadcrumbs if we jumped here.
                        // Limitation: We don't know the full ancestry if we just clicked a node in the tree unless we tracked it.
                        // Actually, since we render recursivly, we can pass the ancestry down?
                        // Complex. For now, we assume simple navigation.
                        // If we click a child in the tree, we append to current path OR we need to find it.

                        // Simplified: tree navigation just updates ID, but we might lose breadcrumbs if we don't reconstruct them.
                        // However, standard GDrive just changes the view.

                        // Let's rely on standard drill down for now for breadcrumbs logic 
                        // OR we assume we clicked a known child of a known parent.

                        // IF we click a node in the tree, we want to view it.
                        // We'll update currentPath to be [Root, ...Ancestors, ThisNode]
                        // We need to pass ancestors down.
                    }}
                >
                    {/* Chevron - Click to toggle expand only */}
                    <div
                        className="p-0.5 rounded hover:bg-gray-300 text-gray-500"
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleFolderExpand(folder.id);
                        }}
                    >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </div>

                    {/* Name area - Click to select */}
                    <div
                        className="flex items-center gap-2 flex-1 overflow-hidden"
                        onClick={(e) => {
                            e.stopPropagation();
                            // TODO: Handle Path Construction
                            // For this MVP refactor, let's just push to path if it's a child?
                            // Or reset path if we can't determine?
                            // Ideally, we maintain `currentPath`.

                            // If we are rendering this item, we know its parent.
                            // We can pass `ancestors` prop recursively.
                        }}
                    >
                        <GoogleDriveIcon type="folder" size={18} customColor={folderColor} />
                        <span className="truncate">{folder.name}</span>
                    </div>
                </div>

                {isExpanded && (
                    <div className="animate-in slide-in-from-left-1 fade-in duration-200">
                        {children.length > 0 ? children.map((child: any) => (
                            <SidebarFolderItem key={child.id} folder={child} level={level + 1} />
                        )) : (
                            // Loaded but empty?
                            treeData[folder.id] ? <div className="pl-8 py-1 text-[10px] text-gray-400 italic font-light ml-4" style={{ paddingLeft: `${(level + 1) * 16 + 8}px` }}>(Vazio)</div> : null
                        )}
                    </div>
                )}
            </div>
        );
    };

    // Recursive Tree Component that accepts ancestors for path reconstruction
    const FolderTreeItem = ({
        item,
        level,
        ancestors
    }: {
        item: { id: string, name: string },
        level: number,
        ancestors: { id: string, name: string }[]
    }) => {
        const isRoot = level === 0 || item.id === (project?.cdeConfig?.folderId || 'root') || item.name === 'Root';
        const isExpanded = expandedFolders.has(item.id) || (isRoot && (expandedFolders.has('root') || expandedFolders.has(project?.cdeConfig?.folderId || 'root')));
        const folderItems = treeData[item.id] || (isRoot ? (treeData['root'] || treeData[project?.cdeConfig?.folderId || 'root']) : undefined);
        const children = folderItems?.filter((i: any) => i.mimeType === 'application/vnd.google-apps.folder') || [];
        const isLoaded = !!folderItems;

        const isSelected = isRoot 
            ? currentPath.length === 0 
            : (currentPath.length > 0 && currentPath[currentPath.length - 1].id === item.id);
        const rootDisplayName = project?.cdeConfig?.folderPath || (project?.cdeConfig?.provider === 'onedrive' ? 'SharePoint' : 'CDE');

        return (
            <div>
                <div
                    className={`flex items-center gap-1 py-2 pr-2 rounded-r-md cursor-pointer transition-colors group ${isSelected ? 'bg-primary-light' : 'hover:bg-gray-100 dark:hover:bg-surface'}`}
                    style={{ paddingLeft: `${level * 16 + 4}px` }}
                >
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleFolderExpand(item.id);
                        }}
                        className="p-1 rounded hover:bg-gray-200 text-gray-500"
                    >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>

                    <div
                        className="flex-1 flex items-center gap-2 overflow-hidden"
                        onClick={() => {
                            if (isRoot) {
                                setCurrentPath([]);
                            } else {
                                setCurrentPath([...ancestors, { id: item.id, name: item.name }]);
                            }
                        }}
                    >
                        <GoogleDriveIcon type="folder" size={18} customColor={folderColor} />
                        <span className={`truncate text-[13px] ${isSelected ? 'text-primary-hover font-medium' : 'text-gray-700 dark:text-gray-200'}`}>
                            {isRoot ? rootDisplayName : item.name}
                        </span>
                    </div>
                </div>

                {isExpanded && (
                    <div>
                        {isLoaded && children.length === 0 && (
                            <div className="text-[10px] text-gray-400 italic py-1" style={{ paddingLeft: `${(level + 1) * 16 + 24}px` }}>

                            </div>
                        )}
                        {children.map((child: any) => (
                            <FolderTreeItem
                                key={child.id}
                                item={{ id: child.id, name: child.name }}
                                level={level + 1}
                                ancestors={isRoot ? [] : [...ancestors, { id: item.id, name: item.name }]}
                            />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex h-full gap-6">
            {/* Sidebar (CDE & Folders) */}
            <div className="w-64 flex-shrink-0 border-r border-gray-100 dark:border-[#444746] pr-4 hidden md:flex md:flex-col pl-4 py-4 h-full">

                {/* Folder Structure - Tree View */}
                <div className="flex-1 overflow-y-auto min-h-0 mb-4 px-0 pt-2 custom-scrollbar">
                    {project?.cdeConfig?.connected && (
                        <FolderTreeItem
                            item={{ 
                                id: project.cdeConfig.folderId || 'root', 
                                name: project.cdeConfig.folderPath || (project.cdeConfig.provider === 'onedrive' ? 'SharePoint' : 'CDE') 
                            }}
                            level={0}
                            ancestors={[]}
                        />
                    )}
                </div>


            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-[#444746] mb-6 px-4 pt-4">
                    <div>
                        <h2 className="text-xl font-normal text-google-text">Documents</h2>
                        {/* Breadcrumbs */}
                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                            <span
                                className={`hover:underline cursor-pointer ${currentPath.length === 0 ? 'font-semibold text-primary' : 'hover:text-primary'}`}
                                onClick={() => setCurrentPath([])}
                            >
                                {project?.cdeConfig?.folderPath || (project?.cdeConfig?.provider === 'onedrive' ? 'SharePoint' : 'CDE')}
                            </span>
                            {currentPath.map((p, idx) => (
                                <span key={p.id} className="flex items-center gap-1">
                                    <span>/</span>
                                    <span
                                        className={`hover:underline cursor-pointer ${idx === currentPath.length - 1 ? 'font-semibold text-gray-800 dark:text-gray-200' : 'hover:text-primary'}`}
                                        onClick={() => setCurrentPath(currentPath.slice(0, idx + 1))}
                                    >
                                        {p.name}
                                    </span>
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {project?.cdeConfig?.connected && (
                            <>
                                <button
                                    onClick={handleInitializeFolders}
                                    disabled={isInitializing}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-surface border border-gray-200 dark:border-[#444746] rounded-full hover:bg-gray-50 dark:hover:bg-[#131314] transition-all disabled:opacity-50"
                                >
                                    <FolderPlus size={18} />
                                    <span>Pastas Tipo</span>
                                </button>
                                <div className="relative">
                                    <button
                                        onClick={() => setIsNewMenuOpen(!isNewMenuOpen)}
                                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-full hover:bg-primary-hover shadow-sm transition-all"
                                    >
                                        <Plus size={18} className="text-white" />
                                        <span>Novo</span>
                                        <ChevronDown size={14} className="text-blue-100" />
                                    </button>
                                    {/* Dropdown Menu */}
                                    {isNewMenuOpen && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setIsNewMenuOpen(false)}></div>
                                            <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-surface rounded-lg shadow-xl border border-gray-100 dark:border-[#444746] py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                                                <button
                                                    onClick={() => {
                                                        setIsNewMenuOpen(false);
                                                        setIsUploadModalOpen(true);
                                                        handleCreateFolderAction();
                                                    }}
                                                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#131314] flex items-center gap-3"
                                                >
                                                    <div className="w-5 flex justify-center"><GoogleDriveIcon type="folder" size={18} /></div>
                                                    Nova pasta
                                                </button>
                                                <div className="h-px bg-gray-100 dark:bg-surface my-1"></div>
                                                <button
                                                    onClick={() => {
                                                        setIsNewMenuOpen(false);
                                                        fileInputUploadRef.current?.click();
                                                    }}
                                                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#131314] flex items-center gap-3"
                                                >
                                                    <div className="w-5 flex justify-center"><FileText size={18} className="text-primary" /></div>
                                                    Carregar ficheiro
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setIsNewMenuOpen(false);
                                                        if (folderInputRef.current) {
                                                            folderInputRef.current.click();
                                                        }
                                                    }}
                                                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#131314] flex items-center gap-3"
                                                >
                                                    <div className="w-5 flex justify-center"><GoogleDriveIcon type="folder" size={18} /></div>
                                                    Carregar pasta
                                                </button>
                                            </div>
                                        </>
                                    )}
                                    <input
                                        type="file"
                                        ref={fileInputUploadRef}
                                        className="hidden"
                                        onChange={handleUploadAction}
                                    />
                                    <input
                                        type="file"
                                        ref={folderInputRef}
                                        className="hidden"
                                        {...({ webkitdirectory: "", directory: "" } as any)}
                                        onChange={handleUploadAction}
                                    />
                                </div>
                            </>
                        )}
                        <div className="relative">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input type="text" placeholder="Search..." className="bg-gray-100 dark:bg-surface border-none rounded-full pl-10 pr-4 py-2 text-sm w-64 focus:ring-2 focus:ring-primary-light outline-none transition-all focus:bg-white dark:focus:bg-surface focus:shadow-sm" />
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 pb-4">
                    {driveItems.length === 0 && !isLoadingDrive ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                            <GoogleDriveIcon type="default" size={48} className="mb-4 opacity-10" />
                            <p className="text-sm font-medium">No documents found.</p>

                            {/* DEBUG INFO FOR USER */}
                            {project?.cdeConfig?.connected && (
                                <div className="mt-4 p-4 bg-gray-50 dark:bg-[#131314] rounded text-xs text-left max-w-sm w-full">
                                    <p className="font-bold mb-2">Debug Info:</p>
                                    <p>Provider: {project.cdeConfig.provider}</p>
                                    <p>Connected: Yes</p>
                                    <p>Token: {project.cdeConfig.accessToken ? 'Present (' + project.cdeConfig.accessToken.substring(0, 10) + '...)' : 'Missing'}</p>
                                    <p>Folder ID: {project.cdeConfig.folderId || 'Missing'}</p>
                                    <button
                                        className="mt-3 px-3 py-1 bg-white dark:bg-surface border border-gray-300 dark:border-[#444746] rounded shadow-sm hover:bg-gray-100 dark:hover:bg-surface w-full"
                                        onClick={() => {
                                            if (project.cdeConfig?.accessToken && project.cdeConfig?.folderId) {
                                                setIsLoadingDrive(true);
                                                fetchGoogleDriveContent(project.cdeConfig.accessToken, project.cdeConfig.folderId)
                                                    .then(items => {
                                                        setDriveItems(items);
                                                        setIsLoadingDrive(false);
                                                    })
                                                    .catch(err => {
                                                        alert('Retry Failed: ' + err.message);
                                                        setIsLoadingDrive(false);
                                                    });
                                            } else {
                                                alert('Missing Token or Folder ID');
                                            }
                                        }}
                                    >
                                        Retry Fetch
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-[#444746] text-gray-400 font-normal">
                                    <th className="py-2 px-2 font-normal w-12 text-center">#</th>
                                    <th className="py-2 px-2 font-normal">Nome</th>
                                    <th className="py-2 px-2 font-normal w-24">Versão</th>
                                    <th className="py-2 px-2 font-normal w-32">Data</th>
                                    <th className="py-2 px-2 font-normal w-24">Tamanho</th>
                                    <th className="w-20 text-right pr-4">Ações</th>
                                </tr>
                            </thead>
                            <tbody className={isLoadingDrive ? 'opacity-50 pointer-events-none' : ''}>
                                {/* Back Navigation */}
                                {currentPath.length > 0 && (
                                    <tr className="hover:bg-gray-50 dark:hover:bg-[#131314] border-b border-gray-50 cursor-pointer group"
                                        onClick={() => setCurrentPath(currentPath.slice(0, currentPath.length - 1))}
                                    >
                                        <td className="py-1.5 px-2 text-center">
                                            <div className="flex justify-center">
                                                <GoogleDriveIcon type="folder" size={26} customColor={folderColor} />
                                            </div>
                                        </td>
                                        <td className="py-1.5 px-2 font-medium text-gray-500">
                                            ..
                                        </td>
                                        <td colSpan={4}></td>
                                    </tr>
                                )}
                                {driveItems.map(doc => (
                                    <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-[#131314] border-b border-gray-50 cursor-pointer group"
                                        onClick={() => {
                                            if (doc.mimeType === 'application/vnd.google-apps.folder') {
                                                setCurrentPath([...currentPath, { id: doc.id, name: doc.name }]);
                                            } else {
                                                window.open(doc.webViewLink, '_blank');
                                            }
                                        }}
                                    >
                                        {(() => {
                                            // Match with DB Document
                                            // Prioritize ID match (Robust against renames), fallback to Name
                                            const dbDoc = dbDocMapById.get(doc.id) || (!doc.mimeType.includes('folder') ? dbDocMapByName.get(doc.name.toLowerCase()) : null);

                                            const version = dbDoc?.version ? `v${dbDoc.version}.0` : 'v1.0';
                                            // Prefer DB date if available, else File date
                                            const displayDate = dbDoc?.updatedAt
                                                ? new Date(dbDoc.updatedAt).toLocaleDateString()
                                                : (doc.createdTime ? new Date(doc.createdTime).toLocaleDateString() : '-');

                                            // For Size: if standard folder, show '-' or if file show size
                                            const displaySize = doc.size ? (Number(doc.size) / 1024).toFixed(0) + ' KB' : '-';

                                            return (
                                                <>
                                                    <td className="py-1.5 px-2 text-center">
                                                        <div className="flex justify-center">
                                                            {doc.mimeType === 'application/vnd.google-apps.folder' ? (
                                                                <GoogleDriveIcon type="folder" size={26} customColor={folderColor} />
                                                            ) : (
                                                                <FileIcon type={doc.mimeType} size={26} customColor={folderColor} />
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-1.5 px-2">
                                                        <span className="font-normal text-gray-900 dark:text-white block">{doc.name}</span>
                                                    </td>
                                                    <td className="py-1.5 px-2 text-gray-500">
                                                        {doc.mimeType === 'application/vnd.google-apps.folder' ? '-' : version}
                                                    </td>
                                                    <td className="py-1.5 px-2 text-gray-500">
                                                        {displayDate}
                                                    </td>
                                                    <td className="py-1.5 px-2 text-gray-500 font-mono text-xs">
                                                        {displaySize}
                                                    </td>
                                                    <td className="py-1.5 px-2 text-right">
                                                        <div className="flex items-center gap-1 justify-end">
                                                            {doc.mimeType !== 'application/vnd.google-apps.folder' && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleArchive(doc);
                                                                    }}
                                                                    className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-surface text-gray-400 hover:text-orange-600 transition-colors"
                                                                    title="Archive"
                                                                >
                                                                    <Archive size={16} />
                                                                </button>
                                                            )}
                                                            {doc.webViewLink && (
                                                                <a
                                                                    href={doc.webViewLink}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-surface text-gray-400 hover:text-primary transition-colors"
                                                                    title="Open"
                                                                >
                                                                    <Upload size={16} className="rotate-90" />
                                                                </a>
                                                            )}
                                                        </div>
                                                    </td>
                                                </>
                                            );
                                        })()}
                                    </tr >
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>



        </div >
    );
};

export default Documents;
