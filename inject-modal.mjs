import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetFile = path.join(__dirname, 'app/[locale]/project/[id]/companies/page.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

const modalInsertionPoint = "// --- REVIEW MODAL ---";
const modalContent = `
// --- DOCUMENT DETAILS MODAL ---
function DocumentDetailsModal({
    isOpen,
    onClose,
    selectedDocRow,
    isEditing,
    isManager,
    isDataUser,
    isApprovalUser,
    newItem,
    setNewItem,
    projectId,
    documents,
    handleSessionUpload,
    handleSessionDelete,
    approveCompany,
    setReviewField,
    setReviewModalOpen,
}: any) {
    const t = useTranslations('Companies');
    if (!isOpen || !selectedDocRow) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-100 dark:border-[#444746] animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 dark:border-[#444746] bg-gray-50/50 dark:bg-surface/50">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{selectedDocRow.label}</h2>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">{selectedDocRow.category.replace(/_/g, ' ')}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-surface rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
                {/* Body */}
                <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
                    
                    {/* Controls Action Bar (Approve/Reject/Validate/Review) */}
                    <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-surface rounded-xl border border-gray-100 dark:border-[#444746]">
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Workflow Actions:</span>
                        </div>
                        <div className="flex items-center gap-2">
                             {isEditing && selectedDocRow.canRequestReview && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setReviewField({ id: selectedDocRow.id, label: selectedDocRow.label, currentValue: selectedDocRow.value });
                                        setReviewModalOpen(true);
                                        onClose();
                                    }}
                                    title="Solicitar Revisão"
                                    className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-surface text-primary border border-primary/20 hover:bg-primary-light transition-colors shadow-sm text-sm font-medium"
                                >
                                    <MessageSquare size={16} /> Request Review
                                </button>
                            )}

                            {isEditing && selectedDocRow.canValidate && (
                                <button
                                    type="button"
                                    onClick={selectedDocRow.onToggleValidation}
                                    className={"flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg transition-all border shadow-sm text-sm font-medium " + 
                                        (selectedDocRow.isValidated
                                            ? "bg-green-600 text-white border-green-700"
                                            : "bg-white dark:bg-surface text-gray-700 border-gray-200 hover:border-green-300 hover:text-green-700 hover:bg-green-50")
                                    }
                                >
                                    {selectedDocRow.isValidated ? <Check size={16} strokeWidth={3} /> : <Check size={16} />}
                                    {selectedDocRow.isValidated ? t('common.valid') : t('actions.validate')}
                                </button>
                            )}

                             {isEditing && selectedDocRow.canApprove && (
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            approveCompany(newItem.id);
                                            onClose();
                                        }}
                                        className={"flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg transition-all border shadow-sm text-sm font-medium " + 
                                            (selectedDocRow.approvalStatus === 'approved'
                                                ? "bg-primary text-white border-blue-700"
                                                : "bg-white dark:bg-surface text-primary border-primary/20 hover:bg-primary-light")
                                        }
                                    >
                                        {selectedDocRow.approvalStatus === 'approved' ? <Shield size={16} strokeWidth={3} /> : <Shield size={16} />}
                                        {selectedDocRow.approvalStatus === 'approved' ? t('status.approved') : t('actions.approve')}
                                    </button>
                                    {selectedDocRow.approvalStatus !== 'approved' && selectedDocRow.onReject && (
                                        <button
                                            type="button"
                                            onClick={selectedDocRow.onReject}
                                            className="flex items-center justify-center p-1.5 rounded-lg text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all"
                                            title={t('actions.reject')}
                                        >
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Main Input Field */}
                    <div>
                        {selectedDocRow.renderControl()}
                    </div>

                    {/* Documents Upload & List */}
                    <div className="border-t border-gray-200 dark:border-[#444746] pt-6">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                <Paperclip size={16} className="text-gray-400" /> Attached Files
                            </h4>
                            {selectedDocRow.isUploadVisible && (isManager || isDataUser || !isApprovalUser) && isEditing && (
                                <DocumentUpload
                                    entityId={selectedDocRow.entityId}
                                    projectId={projectId}
                                    category={selectedDocRow.category}
                                    layout="button"
                                    label="Upload"
                                    systemLabel={selectedDocRow.label}
                                    onOperation={(op: any) => {
                                        if (op.type === 'upload') handleSessionUpload(op.fileId);
                                    }}
                                    enableAI={true}
                                    aiType={selectedDocRow.type === 'date' ? 'date' : 'text'}
                                    onSmartComplete={(data: any) => {
                                        if (data.date && selectedDocRow.type === 'date') {
                                            setNewItem((prev: any) => ({ ...prev, [selectedDocRow.id]: data.date }));
                                        } else if (data.text && selectedDocRow.type === 'text') {
                                            setNewItem((prev: any) => ({ ...prev, [selectedDocRow.id]: data.text }));
                                        }
                                    }}
                                />
                            )}
                        </div>
                        <div className="bg-gray-50/50 dark:bg-[#131314] rounded-xl p-4 border border-gray-100 dark:border-[#444746]">
                            <DocumentList
                                entityId={selectedDocRow.entityId}
                                projectId={projectId}
                                category={selectedDocRow.category}
                                isEditing={isEditing}
                                workflowStatus={newItem.workflowStatus}
                                onDelete={handleSessionDelete}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- REVIEW MODAL ---`;

if (content.includes("function DocumentDetailsModal") || content.includes("// --- DOCUMENT DETAILS MODAL ---")) {
    console.log("DocumentDetailsModal already injected.");
} else {
    content = content.replace(modalInsertionPoint, modalContent);
    fs.writeFileSync(targetFile, content, 'utf8');
    console.log("Successfully injected DocumentDetailsModal!");
}
