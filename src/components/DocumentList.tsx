import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { FileText, Trash2, Eye, Download, AlertCircle, FileCheck, Brain, Edit2, Save, X, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PDFViewerModal } from './PDFViewerModal';
import { deleteCDEFile, moveCDEFile } from '@/lib/cde-manager';
import { useTranslations } from 'next-intl';

interface DocumentListProps {
    projectId: string;
    entityId: string;
    className?: string;
    showProjectDocs?: boolean;
    category?: string;
    isEditing?: boolean;
    workflowStatus?: string;
    onDelete?: (cdeId: string) => void;
}

export const DocumentList: React.FC<DocumentListProps> = ({ projectId, entityId, className, showProjectDocs, category, isEditing, workflowStatus, onDelete }) => {
    const t = useTranslations('Components.DocumentList'); // Use "Components" namespace if configured or "DocumentList" if root. Structure is Components.DocumentList
    const { getDocumentsByEntity, deleteDocument, unarchiveDocument, documents, projects, updateDocument } = useStore();
    const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
    const [editingDocId, setEditingDocId] = useState<string | null>(null);
    const [draftDoc, setDraftDoc] = useState<Partial<any>>({});

    const project = projects.find(p => p.id === projectId);

    // Filter documents
    // If a specific category is requested (e.g. for a field), usually we only want the ACTIVE one.
    // But the user said "In the files separator present current and archived".
    // So:
    // - If `category` prop is passed (Field View): Filter by category + !archived (ONLY Active).
    // - If NO `category` prop is passed (Files Tab): Show ALL (Active + Archived).

    let entityDocs = getDocumentsByEntity(entityId);

    if (category) {
        // Field View: Specific Category, Active Only
        entityDocs = entityDocs.filter(d => d.category === category && !d.archived);
    } else {
        // Files Tab: All categories, All statuses (Active + Archived)
        // No filter needed for category/archive state here, just entityId which is already done.
    }

    // Sort by date desc
    const sortedDocs = [...entityDocs].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm(t('deleteConfirm'))) return;

        const docToDelete = documents.find(d => d.id === id);
        if (!docToDelete) return;

        const storeState = useStore.getState();
        const companyForCde = storeState.companies.find(c => c.id === entityId || c.id === projectId || (!c.projectId && c.accountId === storeState.currentUser?.accountId));
        const effectiveCdeConfig = project?.cdeConfig || (companyForCde as any)?.cdeConfig;

        if (effectiveCdeConfig?.connected && docToDelete.cdeFileId) {
            // 1. Delete Physical File
            console.log(`Deleting file ${docToDelete.name} (${docToDelete.cdeFileId})`);
            await deleteCDEFile(effectiveCdeConfig, docToDelete.cdeFileId);

            // Notify Parent
            if (onDelete) onDelete(docToDelete.cdeFileId);
        }

        // Global store handles the rollback logic automatically
        deleteDocument(id);
    };

    if (sortedDocs.length === 0) {
        return (
            <div className={cn("text-center py-8 bg-gray-50 dark:bg-[#131314] border border-dashed border-gray-300 dark:border-[#444746] rounded-lg", className)}>
                <FileText className="mx-auto h-10 w-10 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">{t('empty')}</p>
            </div>
        );
    }

    const handleSaveDocMetadata = (docId: string) => {
        updateDocument(docId, draftDoc);
        setEditingDocId(null);
        setDraftDoc({});
    };

    return (
        <div className={cn("overflow-hidden rounded-lg border border-gray-200 dark:border-[#444746] bg-white dark:bg-surface", className)}>
            <table className="w-full text-left text-xs bg-white dark:bg-surface">
                <thead className="bg-gray-50 dark:bg-[#131314] text-gray-600 dark:text-gray-300 font-medium border-b border-gray-200 dark:border-[#444746]">
                    <tr>
                        <th className="px-4 py-3 w-8">#</th>
                        <th className="px-4 py-3">{t('name')}</th>
                        {/* Title Removed */}
                        <th className="px-4 py-3 w-20">{t('version')}</th>
                        <th className="px-4 py-3 w-32">{t('date')}</th>
                        <th className="px-4 py-3 text-right">{t('actions')}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {sortedDocs.map((doc, index) => {
                        const isPreviewable = (doc.type?.startsWith('image/') || doc.type === 'application/pdf') ||
                            /\.(pdf|jpg|jpeg|png|webp|gif)$/i.test(doc.name || '');

                        return (
                            <React.Fragment key={doc.id}>
                                <tr className={cn(
                                    "transition-colors group",
                                    doc.archived ? "bg-gray-50 dark:bg-[#131314] text-gray-400" : "hover-row"
                                )}>
                                    <td className="px-4 py-3 text-gray-400">
                                        <div className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center",
                                            doc.archived ? "bg-gray-100 dark:bg-surface text-gray-400" : (doc.aiData ? "bg-purple-100 text-purple-600" : "bg-blue-50 text-brand")
                                        )}>
                                            {doc.aiData ? <Brain size={16} /> : <FileText size={16} />}
                                        </div>
                                    </td>
                                    <td className={cn("px-4 py-3 font-medium", doc.archived ? "text-gray-500" : "text-gray-900 dark:text-white")}>
                                        <div className="flex flex-col">
                                            <span>{doc.name}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-gray-400">{(Number(doc.size) / 1024).toFixed(0)} {t('kb')}</span>
                                                {/* Optional: Show Category as subtitle if needed, or remove if strictly redundant */}
                                                {doc.category && <span className="text-[10px] text-brand capitalize">{doc.category.replace(/_/g, ' ')}</span>}
                                            </div>
                                        </div>
                                        {doc.archived && <span className="ml-2 text-[10px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full">Arq</span>}
                                    </td>

                                    {/* Title Cell Removed */}

                                    <td className="px-4 py-3 text-gray-500">
                                        v{doc.version || 1}.0
                                    </td>
                                    <td className="px-4 py-3 text-gray-500">
                                        {new Date(doc.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className={cn("flex items-center justify-end gap-1 transition-opacity", isEditing ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
                                            {doc.aiData && (
                                                <button
                                                    className="p-1.5 text-purple-600 hover:bg-purple-50 rounded"
                                                    title="AI Data Extracted"
                                                    onClick={() => alert(JSON.stringify(doc.aiData, null, 2))}
                                                >
                                                    <Brain size={14} />
                                                </button>
                                            )}
                                            {doc.url && (
                                                <a
                                                    href={doc.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1.5 text-gray-500 hover:text-primary hover:bg-primary-light rounded"
                                                    title={t('download')}
                                                >
                                                    <Download size={14} />
                                                </a>
                                            )}
                                            {isPreviewable && (
                                                <button
                                                    onClick={() => setSelectedDoc(doc.url || '')}
                                                    className="p-1.5 text-gray-500 hover:text-primary hover:bg-primary-light rounded"
                                                    title={t('preview')}
                                                >
                                                    <Eye size={14} />
                                                </button>
                                            )}
                                            {isEditing && !doc.archived && (
                                                <button
                                                    onClick={() => {
                                                        if (editingDocId === doc.id) {
                                                            setEditingDocId(null);
                                                        } else {
                                                            setEditingDocId(doc.id);
                                                            setDraftDoc(doc);
                                                        }
                                                    }}
                                                    className="p-1.5 text-gray-500 hover:text-primary hover:bg-primary-light rounded"
                                                    title={t('edit') || 'Edit Metadata'}
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                            )}
                                            {isEditing && !doc.archived && (
                                                // Check delete permission based on workflowStatus?
                                                // User: "só deve estar disponivel em documentos carregados que ainda não seguiram nenhum fluxo"
                                                // Only allowed if workflowStatus is draft/pre-workflow?
                                                // But caller controls `isEditing`. 
                                                // We should check inside here too to be safe/granular.
                                                (!workflowStatus || ['draft', 'data_requested', 'data_update', 'incomplete'].includes(workflowStatus)) && (
                                                    <button
                                                        onClick={(e) => handleDelete(doc.id, e)}
                                                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                                                        title={t('delete')}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )
                                            )}
                                        </div>
                                    </td>
                                </tr>
                                {/* Inline Edit Form Row */}
                                {
                                    editingDocId === doc.id && (
                                        <tr className="bg-gray-50/80 dark:bg-[#131415] border-b border-gray-100 dark:border-[#444746]">
                                            <td colSpan={5} className="p-4">
                                                <div className="bg-white dark:bg-surface border border-gray-200 dark:border-[#444746] rounded-lg p-4 shadow-sm">
                                                    <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-[#444746] pb-3">
                                                        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                                            <FileCheck size={16} className="text-primary" /> Metadados ISO 19650 e Legal
                                                        </h4>
                                                        <div className="flex gap-2">
                                                            <button onClick={() => setEditingDocId(null)} className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-surface rounded-lg transition-colors flex items-center gap-1">
                                                                <X size={14} /> Cancelar
                                                            </button>
                                                            <button onClick={() => handleSaveDocMetadata(doc.id)} className="px-3 py-1.5 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors flex items-center gap-1">
                                                                <Save size={14} /> Guardar Alterações
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                        {/* ISO 19650 Fields */}
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Código do Documento (ISO)</label>
                                                            <input type="text" value={draftDoc.documentCode || ''} onChange={e => setDraftDoc({ ...draftDoc, documentCode: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#444746] rounded-md bg-white dark:bg-[#131415] text-gray-900 dark:text-white" placeholder="Ex: PRO-HS-001" />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Disciplina (BIM)</label>
                                                            <input type="text" value={draftDoc.discipline || ''} onChange={e => setDraftDoc({ ...draftDoc, discipline: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#444746] rounded-md bg-white dark:bg-[#131415] text-gray-900 dark:text-white" placeholder="Ex: ARC, STR, MEP..." />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Idioma</label>
                                                            <select title="Idioma" value={draftDoc.language || 'pt'} onChange={e => setDraftDoc({ ...draftDoc, language: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#444746] rounded-md bg-white dark:bg-[#131415] text-gray-900 dark:text-white">
                                                                <option value="pt">Português</option>
                                                                <option value="en">Inglês</option>
                                                                <option value="es">Espanhol</option>
                                                                <option value="fr">Francês</option>
                                                            </select>
                                                        </div>

                                                        {/* Legal & GDPR */}
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Base Legal (RGPD)</label>
                                                            <input type="text" value={draftDoc.gdprBasis || ''} onChange={e => setDraftDoc({ ...draftDoc, gdprBasis: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#444746] rounded-md bg-white dark:bg-[#131415] text-gray-900 dark:text-white" placeholder="Ex: Artigo 6(1)(b) - Execução de contrato" />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Data Limite de Retenção (RGPD)</label>
                                                            <input title="Data Limite de Retenção" type="date" value={draftDoc.retentionUntil || ''} onChange={e => setDraftDoc({ ...draftDoc, retentionUntil: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#444746] rounded-md bg-white dark:bg-[#131415] text-gray-900 dark:text-white" />
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-6">
                                                            <input
                                                                type="checkbox"
                                                                id={`confidential-${doc.id}`}
                                                                checked={draftDoc.isConfidential || false}
                                                                onChange={e => setDraftDoc({ ...draftDoc, isConfidential: e.target.checked })}
                                                                className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary"
                                                            />
                                                            <label htmlFor={`confidential-${doc.id}`} className="text-sm font-medium text-gray-900 dark:text-gray-300 flex items-center gap-1 cursor-pointer">
                                                                <ShieldAlert size={14} className="text-orange-500" />
                                                                Documento Confidencial
                                                            </label>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>

            {/* Simple PDF Viewer Modal Integration if needed, or just open in new tab */}
            {
                selectedDoc && (
                    <PDFViewerModal
                        isOpen={!!selectedDoc}
                        onClose={() => setSelectedDoc(null)}
                        fileUrl={selectedDoc || ''}
                        fileName="Document Preview"
                        fileType="pdf"
                    />
                )
            }
        </div >
    );
};
