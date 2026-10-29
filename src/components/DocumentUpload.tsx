import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileText, Image, RotateCw, X, Upload, Download, ScanEye, Eye } from 'lucide-react';
import { cn, downloadFile } from '../lib/utils';
import { useStore } from '../store/useStore';
import { scanDocument, type ExtractedData } from '../utils/ai-scanner';
import { PDFViewerModal } from './PDFViewerModal';
import { uploadToEntityFolder } from '../lib/cde-manager';
import { generateIfcIsoDocumentName } from '../lib/ifc-document-naming';

interface DocumentUploadProps {
    entityId: string;
    projectId: string;
    category?: string;
    layout?: 'zone' | 'button';
    label?: string;
    systemLabel?: string;
    enableAI?: boolean; // New prop to enable AI scanning
    aiType?: 'date' | 'text'; // Type of data to extract
    draftAuthorId?: string;
    onUploadComplete?: () => void;
    onSmartComplete?: (data: ExtractedData) => void;
    onOperation?: (op: { type: 'upload', fileId: string, archivedId?: string, archivedParentId?: string }) => void;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({ entityId, projectId, category, layout = 'zone', label, systemLabel, enableAI = false, aiType = 'text', draftAuthorId, onUploadComplete, onSmartComplete, onOperation }) => {
    const { addDocument, updateDocument, documents, projects } = useStore();
    const [uploading, setUploading] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [progress, setProgress] = useState(0);

    const project = projects.find(p => p.id === projectId);
    const provider = project?.cdeConfig?.connected ? project.cdeConfig.provider : 'local';

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return;

        setUploading(true);
        setProgress(0);

        // Simulate upload progress
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 90) {
                    return 90; // Wait for real upload
                }
                return prev + 10;
            });
        }, 200);

        // Process files
        setTimeout(async () => {
            for (const file of acceptedFiles) {
                const type = file.type.includes('image') ? 'image' :
                    file.type.includes('pdf') ? 'pdf' : 'other';

                let fileToUpload = file;
                let fileUrl = '';
                let status = 'synced';

                try {
                    console.log('DocumentUpload: Starting Upload for', file.name);
                    let cdeFileId: string | undefined;

                    // 1. Resolve Entity details (Worker, Equipment, Company)
                    const storeState = useStore.getState();
                    const worker = storeState.workers.find(w => w.id === entityId);
                    const equipment = storeState.equipment.find(e => e.id === entityId);
                    let company = storeState.companies.find(c => c.id === entityId);
                    if (!company) {
                        company = storeState.companies.find(c =>
                            c.accountId === storeState.currentUser?.accountId && (!c.projectId || c.id !== 'comp_master')
                        );
                    }
                    if (!company && projectId) {
                        company = storeState.companies.find(c => c.id === entityId || c.projectId === projectId);
                    }

                    let entityType: 'company' | 'worker' | 'equipment' = 'company';
                    let entityName = '';
                    let entityIdentifier = '';
                    let ifcRole = 'subempreiteiro';

                    if (worker) {
                        entityType = 'worker';
                        entityName = worker.name;
                        entityIdentifier = worker.nif || worker.id;
                        ifcRole = 'worker';
                    } else if (equipment) {
                        entityType = 'equipment';
                        entityName = equipment.name;
                        entityIdentifier = equipment.serialNumber || equipment.id;
                        ifcRole = 'equipment';
                    } else {
                        entityType = 'company';
                        entityName = company?.name || storeState.currentUser?.name || 'A Minha Empresa';
                        entityIdentifier = company?.nif || company?.number || 'PT500000000';
                        ifcRole = company?.companyRole || (company as any)?.ifcActorRole || 'subempreiteiro';
                    }

                    // 2. Determine Version & Existing Docs according to ISO 19650
                    const currentDocs = storeState.documents;
                    const existingDocs = currentDocs.filter(d =>
                        d.entityId === entityId &&
                        (category ? d.category === category : true)
                    );
                    const maxVersion = existingDocs.reduce((max, d) => Math.max(max, d.version || 1), 0);
                    const nextDocVersion = existingDocs.length > 0 ? maxVersion + 1 : 1;
                    const prevActiveDoc = existingDocs.find(d => !d.archived);

                    // 3. Standardized ISO 19650 / IFC Naming - ALWAYS generated regardless of CDE connection
                    const ifcStandardName = generateIfcIsoDocumentName({
                        entityIdentifier: entityIdentifier || 'ENT',
                        ifcRole: ifcRole,
                        category: category || 'general',
                        version: nextDocVersion,
                        originalFileName: file.name
                    });

                    console.log(`DocumentUpload: Renaming '${file.name}' to ISO 19650/IFC '${ifcStandardName}' (Version ${nextDocVersion})`);
                    fileToUpload = new File([file], ifcStandardName, { type: file.type });

                    // 4. Check CDE Connection
                    const companyForCde = company || storeState.companies.find(c => c.id === entityId || c.id === projectId || (!c.projectId && c.accountId === storeState.currentUser?.accountId));
                    const effectiveCdeConfig = project?.cdeConfig || (companyForCde as any)?.cdeConfig;

                    if (effectiveCdeConfig?.connected) {
                        console.log(`DocumentUpload: Uploading to Entity Folder (${entityType})...`);
                        const versionTag = prevActiveDoc ? `v${prevActiveDoc.version || 1}` : undefined;

                        const uploadRes = await uploadToEntityFolder(
                            effectiveCdeConfig,
                            entityType,
                            entityName,
                            entityIdentifier,
                            fileToUpload,
                            versionTag
                        );
                        fileUrl = uploadRes.webViewLink;
                        cdeFileId = uploadRes.id;
                        console.log('Uploaded to CDE:', fileUrl);

                        if (onOperation && uploadRes.id) {
                            onOperation({
                                type: 'upload',
                                fileId: uploadRes.id,
                                archivedId: uploadRes.archivedId,
                                archivedParentId: uploadRes.archivedParentId
                            });
                        }

                        // Update Archived File Integrity (e.g. Dropbox Path Change)
                        if (uploadRes.archivedId && (uploadRes.archivedNewId || uploadRes.archivedNewName)) {
                            console.log('DocumentUpload: Archived detected. ID:', uploadRes.archivedId, 'NewName:', uploadRes.archivedNewName);
                            const oldDoc = currentDocs.find(d => d.cdeFileId === uploadRes.archivedId);
                            if (oldDoc) {
                                updateDocument(oldDoc.id, {
                                    cdeFileId: uploadRes.archivedNewId,
                                    name: uploadRes.archivedNewName || oldDoc.name
                                });
                            }
                        }
                    } else {
                        // Local Simulation
                        const toBase64 = (f: File) => new Promise<string>((resolve, reject) => {
                            const reader = new FileReader();
                            reader.readAsDataURL(f);
                            reader.onload = () => resolve(reader.result as string);
                            reader.onerror = error => reject(error);
                        });
                        if (file.size < 2 * 1024 * 1024) fileUrl = await toBase64(file);
                        else fileUrl = URL.createObjectURL(file);
                        cdeFileId = `local_${Date.now()}`;
                    }

                    // 5. Archive previous active document in store if replacing
                    if (prevActiveDoc) {
                        updateDocument(prevActiveDoc.id, {
                            archived: true,
                            archivedAt: new Date().toISOString()
                        });
                        console.log(`DocumentUpload: Archived previous active document ${prevActiveDoc.name} (v${prevActiveDoc.version || 1})`);
                    }

                    // 6. Save new document in store with standardized name and calculated version
                    addDocument({
                        name: fileToUpload.name,
                        size: formatFileSize(file.size),
                        type,
                        url: fileUrl,
                        cdeFileId,
                        entityId,
                        projectId: projectId,
                        category: category,
                        provider: (effectiveCdeConfig?.connected ? provider : 'local') as any,
                        status: status,
                        version: nextDocVersion,
                        archived: false,
                        draftAuthorId: draftAuthorId,
                    } as any);

                    // Trigger AI
                    if (enableAI && onSmartComplete) {
                        setScanning(true);
                        setUploading(false);
                        try {
                            const contextKeywords = [label, systemLabel].filter((s): s is string => !!s);
                            const extracted = await scanDocument(file, aiType, contextKeywords);
                            onSmartComplete(extracted);
                        } catch (error) {
                            console.error("AI Scan failed", error);
                        } finally {
                            setScanning(false);
                        }
                    }

                } catch (e) {
                    console.error("Upload Error", e);
                    alert("Upload Failed: " + (e as Error).message);
                }
            }

            if (!enableAI) {
                setUploading(false);
            }
            clearInterval(interval);
            setProgress(100);
            if (onUploadComplete) onUploadComplete();
        }, 500);

    }, [entityId, projectId, category, provider, addDocument, updateDocument, onUploadComplete, enableAI, aiType, onSmartComplete, project, draftAuthorId, label, systemLabel, onOperation]);

    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({ onDrop, noClick: layout === 'button' });

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    if (layout === 'button') {
        return (
            <div className="relative inline-block">
                <input {...getInputProps()} />
                <button
                    type="button"
                    onClick={open}
                    disabled={uploading || scanning}
                    className="px-3 py-2 bg-white dark:bg-surface border border-gray-200 dark:border-[#444746] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#131314] hover:text-primary rounded-lg transition-all disabled:opacity-50 flex items-center gap-2 text-sm font-medium shadow-sm"
                    title={uploading ? "Uploading..." : scanning ? "Scanning..." : `Upload ${label || 'Document'}`}
                >
                    {uploading ? <RotateCw size={16} className="animate-spin" /> :
                        scanning ? <ScanEye size={16} className="animate-pulse text-purple-600" /> :
                            <Upload size={16} />}
                    {label && <span>{label}</span>}
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Dropzone */}
            <div
                {...getRootProps()}
                className={cn(
                    "border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer relative overflow-hidden",
                    isDragActive ? "border-blue-500 bg-primary-light" : "border-gray-200 dark:border-[#444746] hover:border-primary/30 hover:bg-gray-50 dark:hover:bg-[#131314]",
                    uploading || scanning ? "pointer-events-none opacity-50" : ""
                )}
            >
                <input {...getInputProps()} />

                <div className="flex flex-col items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-brand">
                        <Upload size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {isDragActive ? "Drop the files here" : "Click or drag files here to upload"}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                            Supported: PDF, Excel, Word, Images (Max 10MB)
                        </p>
                    </div>
                </div>

                {/* Upload Overlay */}
                {(uploading || scanning) && (
                    <div className="absolute inset-0 bg-white dark:bg-surface/90 flex flex-col items-center justify-center z-10 backdrop-blur-sm">
                        {scanning ?
                            <ScanEye size={32} className="text-purple-600 animate-pulse mb-3" /> :
                            <RotateCw size={32} className="text-primary animate-spin mb-3" />
                        }

                        {uploading && (
                            <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }}></div>
                            </div>
                        )}
                        <p className="text-xs text-primary font-medium mt-2">
                            {scanning ? "Scanning document..." : "Uploading..."}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
