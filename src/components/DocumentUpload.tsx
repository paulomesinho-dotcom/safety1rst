import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileText, Image, RotateCw, X, Upload, Download, ScanEye, Eye } from 'lucide-react';
import { cn, downloadFile } from '../lib/utils';
import { useStore } from '../store/useStore';
import { scanDocument, type ExtractedData } from '../utils/ai-scanner';
import { PDFViewerModal } from './PDFViewerModal';
import { uploadToEntityFolder } from '../lib/cde-manager';

interface DocumentUploadProps {
    entityId: string;
    projectId: string;
    category?: string;
    layout?: 'zone' | 'button';
    label?: string;
    systemLabel?: string;
    enableAI?: boolean; // New prop to enable AI scanning
    aiType?: 'date' | 'text'; // Type of data to extract
    onUploadComplete?: () => void;
    onSmartComplete?: (data: ExtractedData) => void;
    onOperation?: (op: { type: 'upload', fileId: string, archivedId?: string, archivedParentId?: string }) => void;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({ entityId, projectId, category, layout = 'zone', label, systemLabel, enableAI = false, aiType = 'text', onUploadComplete, onSmartComplete, onOperation }) => {
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
                    // Debug Logs
                    console.log('DocumentUpload: Starting Upload for', file.name);

                    let cdeFileId: string | undefined;
                    console.log('DocumentUpload: Project Config:', project?.cdeConfig);
                    console.log('DocumentUpload: Connected?', project?.cdeConfig?.connected);

                    // Check CDE Connection
                    if (project?.cdeConfig?.connected) {
                        // Find Entity details to get Name/Identifier
                        const storeState = useStore.getState();
                        const company = storeState.companies.find(c => c.id === entityId);
                        const worker = storeState.workers.find(w => w.id === entityId);
                        const equipment = storeState.equipment.find(e => e.id === entityId);

                        console.log('DocumentUpload: Searching entityId', entityId);
                        console.log('DocumentUpload: Found:', { company, worker, equipment });

                        let entityType: 'company' | 'worker' | 'equipment' | null = null;
                        let entityName = '';
                        let entityIdentifier = '';

                        if (company) {
                            entityType = 'company';
                            entityName = company.name;
                            entityIdentifier = company.number || company.nif;
                        } else if (worker) {
                            entityType = 'worker';
                            entityName = worker.name;
                            entityIdentifier = worker.nif || worker.id;
                        } else if (equipment) {
                            entityType = 'equipment';
                            entityName = equipment.name;
                            entityIdentifier = equipment.id; // Or serialNumber if available
                            if (equipment.serialNumber) entityIdentifier = equipment.serialNumber;
                        }

                        if (entityType) {
                            console.log(`DocumentUpload: Uploading to Entity Folder (${entityType})...`);

                            // System Naming Logic
                            const namingSource = systemLabel || label;

                            if (namingSource && namingSource !== 'Upload') {
                                const extension = file.name.split('.').pop();
                                const safeName = namingSource.replace(/[^a-zA-Z0-9]/g, '_');
                                const systemName = `${safeName}.${extension}`;
                                console.log(`DocumentUpload: Renaming '${file.name}' to '${systemName}' for System Consistency`);
                                fileToUpload = new File([file], systemName, { type: file.type });
                            }

                            // Determine Version Tag for Archiving
                            let versionTag: string | undefined;
                            // Check against documents in store with same name + entity + category
                            // We use `fileToUpload.name` because that's what `uploadToEntityFolder` uses for collision check.
                            const documents = useStore.getState().documents;
                            const existingActiveDoc = documents.find(d =>
                                d.entityId === entityId &&
                                d.category === category && // Category match important if same filenames allow in diff categories
                                !d.archived &&
                                d.name === fileToUpload.name
                            );

                            if (existingActiveDoc) {
                                versionTag = `v${existingActiveDoc.version || 1}`;
                                console.log(`DocumentUpload: Found existing active doc ${existingActiveDoc.name} (v${existingActiveDoc.version}). Will archive as ${versionTag}`);
                            }

                            const uploadRes = await uploadToEntityFolder(
                                project.cdeConfig,
                                entityType,
                                entityName,
                                entityIdentifier,
                                fileToUpload,
                                versionTag
                            );
                            fileUrl = uploadRes.webViewLink; // Use CDE Link
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
                                const oldDoc = documents.find(d => d.cdeFileId === uploadRes.archivedId);

                                if (oldDoc) {
                                    console.log('DocumentUpload: Found Matching Active Doc:', oldDoc.name, 'ID:', oldDoc.id);
                                    updateDocument(oldDoc.id, {
                                        cdeFileId: uploadRes.archivedNewId,
                                        name: uploadRes.archivedNewName || oldDoc.name
                                    });
                                    console.log('DocumentUpload: Sent updateDocument command.');
                                } else {
                                    console.warn('DocumentUpload: NO MATCHING DOC FOUND for ID:', uploadRes.archivedId);
                                    // Debug: Log all doc CDE IDs to see why we missed
                                    console.log('Available Docs CDE IDs:', documents.map(d => d.cdeFileId));
                                }
                            }
                        } else {
                            console.warn('Entity not found for CDE Upload, falling back to local simulation');
                            alert('System Warning: Could not find Entity context for CDE Upload. Saving locally.');
                            // Fallback
                            fileUrl = URL.createObjectURL(file);
                            status = 'pending';
                        }

                    } else {
                        // Local Simulation
                        const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
                            const reader = new FileReader();
                            reader.readAsDataURL(file);
                            reader.onload = () => resolve(reader.result as string);
                            reader.onerror = error => reject(error);
                        });
                        if (file.size < 2 * 1024 * 1024) fileUrl = await toBase64(file);
                        else fileUrl = URL.createObjectURL(file);
                    }

                    addDocument({
                        name: fileToUpload.name,
                        size: formatFileSize(file.size),
                        type,
                        url: fileUrl,
                        cdeFileId,
                        entityId,
                        projectId: projectId,
                        category: category,
                        provider: provider as any,
                        status: status,
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

    }, [entityId, projectId, category, provider, addDocument, onUploadComplete, enableAI, aiType, onSmartComplete, project]);

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
