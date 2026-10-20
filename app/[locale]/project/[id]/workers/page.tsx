'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { ArrowLeft, Plus, Search, Filter, MoreVertical, LayoutGrid, List as ListIcon, UserPlus, Save, AlertTriangle, AlertCircle, Clock, User, Briefcase, Shield, FileText, QrCode, GraduationCap, CheckCircle, CheckCircle2, Check, X, Settings, Lock, Unlock, MessageSquare, Edit2, Building2, ChevronDown, Eye } from 'lucide-react';
import { ListView } from '@/components/ListView';
import { GridView } from '@/components/GridView';
import { Modal } from '@/components/Modal';
import { WorkerCardModal } from '@/components/WorkerCardModal';
import { Worker, Company, Ticket } from '@/types';
import { cn } from '@/lib/utils';
import { PrimaryButton } from '@/components/ui/Button';
import { WorkerQuickCreateModal } from '@/components/WorkerQuickCreateModal';
import { DocumentUpload } from '@/components/DocumentUpload';
import { DocumentList } from '@/components/DocumentList';
import { EntityTicketThread } from '@/components/EntityTicketThread';
import { InputGroup } from '@/components/ui/InputGroup';
import { WorkflowHistory } from '@/components/WorkflowHistory';
import { useShallow } from 'zustand/react/shallow';
import { generateIfcExport } from '@/lib/ifc-export';
import { useTranslations } from 'next-intl';
import { OCCUPATION_OPTIONS, OCCUPATION_GROUPS, getIfcTypeFromOccupation } from '@/lib/occupation-ifc-map';
import { WORKER_ROLES, OPERATIVE_CATEGORIES, getRoleDefinition } from '@/lib/worker-roles';

const DocumentRow: React.FC<{
    label: string;
    entityId: string;
    projectId: string;
    category: string;
    isValidated?: boolean;
    onToggleValidation?: () => void;
    canValidate?: boolean;
    approvalStatus?: 'pending' | 'approved' | 'rejected';
    onApprove?: () => void;
    onReject?: () => void;
    canApprove?: boolean;
    isUploadVisible: boolean;
    isManager: boolean;
    isDataUser: boolean;
    isApprovalUser: boolean;
    showRequestChange?: boolean;
    onRequestChange?: () => void;
    children?: React.ReactNode;
    isEditing?: boolean;
    workflowStatus?: string;
}> = ({
    label, entityId, projectId, category, isValidated, onToggleValidation,
    canValidate, approvalStatus, onApprove, onReject, canApprove,
    isUploadVisible, isManager, isDataUser, isApprovalUser,
    showRequestChange, onRequestChange, children, isEditing, workflowStatus
}) => {
        const [isExpanded, setIsExpanded] = useState(false);
        const { documents, tickets, currentUser } = useStore(useShallow(state => ({
            documents: state.documents,
            tickets: state.tickets,
            currentUser: state.currentUser
        })));

        const isPreWorkflowPhase = ['draft', 'data_requested'].includes(workflowStatus || 'draft');
        const openTicket = tickets.find(t =>
            t.entityId === entityId &&
            t.fieldId === category &&
            t.status === 'open' &&
            t.assignedTo === currentUser?.id
        );
        const hasAssignedTicket = !!openTicket;

        let canUploadNow = false;
        if (isEditing && isUploadVisible) {
            const activeDoc = documents.find(d =>
                d.entityId === entityId &&
                d.category === category &&
                !d.archived
            );

            if (!activeDoc) {
                canUploadNow = isPreWorkflowPhase || hasAssignedTicket;
            } else {
                if (hasAssignedTicket && openTicket) {
                    if (new Date(activeDoc.createdAt) < new Date(openTicket.createdAt)) {
                        canUploadNow = true;
                    }
                }
            }
        }

        return (
            <div className="flex flex-col gap-2 p-3 bg-white dark:bg-surface border border-gray-100 dark:border-[#444746] rounded-xl shadow-sm hover:border-primary/20 transition-all">
                <div className="flex items-center justify-between gap-4">
                    <div
                        className="flex items-center gap-3 cursor-pointer flex-1"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        <div className={cn("p-2 rounded-lg transition-colors", isExpanded ? "bg-primary-light text-primary" : "bg-gray-50 dark:bg-[#131314] text-gray-400")}>
                            <FileText size={18} />
                        </div>
                        <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{label}</div>
                            <div className="text-[11px] text-gray-400 uppercase tracking-wider">{category.replace('_', ' ')}</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {isValidated && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-[10px] font-bold border border-green-100 uppercase">
                                <Check size={10} strokeWidth={3} /> VALIDADO
                            </span>
                        )}
                        {approvalStatus === 'approved' && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-light text-primary-hover text-[10px] font-bold border border-primary/10 uppercase">
                                <Shield size={10} strokeWidth={3} /> APROVADO
                            </span>
                        )}

                        <div className="h-4 w-px bg-gray-200 mx-1" />

                        <div className="flex items-center gap-1.5">
                            {canUploadNow && (isManager || isDataUser || !isApprovalUser) && (
                                <DocumentUpload
                                    entityId={entityId}
                                    projectId={projectId}
                                    category={category}
                                    layout="button"
                                    label="Upload"
                                    systemLabel={label}
                                />
                            )}

                            {isEditing && isManager && showRequestChange && isValidated && ( // Review ONLY if Validated
                                <button
                                    type="button"
                                    onClick={onRequestChange}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-primary bg-white dark:bg-surface border border-primary/20 hover:bg-primary-light transition-all flex items-center gap-1"
                                    title="Solicitar Alteração"
                                >
                                    <MessageSquare size={14} /> REVIEW
                                </button>
                            )}

                            {isEditing && canValidate && (
                                <button
                                    type="button"
                                    onClick={onToggleValidation}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                                        isValidated
                                            ? "bg-green-600 text-white border-green-700 shadow-sm"
                                            : "bg-white dark:bg-surface text-gray-600 dark:text-gray-300 border-gray-200 dark:border-[#444746] hover:border-green-300 hover:text-green-700 hover:bg-green-50"
                                    )}
                                >
                                    {isValidated ? "VALIDADO" : "VALIDAR"}
                                </button>
                            )}

                            {isEditing && canApprove && (
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={onApprove}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                                            approvalStatus === 'approved'
                                                ? "bg-primary text-white border-blue-700 shadow-sm"
                                                : "bg-white dark:bg-surface text-primary border-primary/20 hover:bg-primary-light"
                                        )}
                                    >
                                        {approvalStatus === 'approved' ? "APROVADO" : "APROVAR"}
                                    </button>
                                    {approvalStatus !== 'approved' && onReject && (
                                        <button
                                            type="button"
                                            onClick={onReject}
                                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 border border-gray-200 dark:border-[#444746] hover:border-red-200 transition-all"
                                            title="Rejeitar"
                                        >
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                {children && <div className="mt-2 pl-11">{children}</div>}
                {isExpanded && (
                    <div className="mt-1 pl-11 animate-in fade-in slide-in-from-top-2 duration-200">
                        <DocumentList
                            entityId={entityId}
                            projectId={projectId}
                            category={category}
                            isEditing={isEditing}
                            workflowStatus={workflowStatus}
                        />
                    </div>
                )}
            </div>
        );
    };

// Custom Page View (formerly Drawer)
const Drawer = ({
    isOpen,
    onClose,
    title,
    children,
    headerContent,
    actions,
    footerContent,
}: {
    isOpen: boolean;
    onClose: () => void;
    title: React.ReactNode;
    children: React.ReactNode;
    headerContent?: React.ReactNode;
    actions?: React.ReactNode;
    footerContent?: React.ReactNode;
}) => {
    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 w-full h-full bg-[var(--bg-card)] flex flex-col z-50">
            {/* Clean Header */}
            <div className="bg-[var(--bg-card)] border-b border-[var(--border)] sticky top-0 z-10 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-3 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <button
                            onClick={onClose}
                            className="p-1.5 -ml-1 text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-input)] rounded-lg transition-colors shrink-0"
                            title="Voltar"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div className="min-w-0">
                            {title}
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
                </div>
                {/* Extended Header Content (Tabs/Status) */}
                {headerContent && <div className="px-6">{headerContent}</div>}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-[var(--bg)]">
                <div className="max-w-7xl mx-auto p-6 min-h-full">{children}</div>
            </div>

            {/* Sticky Footer */}
            {footerContent && (
                <div className="border-t border-[var(--border)] bg-[var(--bg-card)] p-4 sticky bottom-0 z-20">
                    <div className="max-w-7xl mx-auto flex items-center justify-end gap-3">
                        {footerContent}
                    </div>
                </div>
            )}
        </div>
    );
};

export const getWorkflowStatusColors = (status: string | undefined, role: string | null = null) => {
    if (status === "validated" || status === "approved") {
        return "bg-green-100 text-green-800 border-green-200";
    }

    if (role) {
        if (role === "data_user") return "bg-orange-100 text-orange-800 border-orange-200";
        if (role === "manager") return "bg-blue-100 text-blue-800 border-blue-200";
        if (role === "approval_user" || role === "approver") return "bg-purple-100 text-purple-800 border-purple-200";
    }

    switch (status) {
        case "draft": return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-surface dark:text-gray-300 dark:border-[#444746]";
        case "data_requested": return "bg-orange-100 text-orange-800 border-orange-200";
        case "validation_pending": return "bg-blue-100 text-blue-800 border-blue-200";
        case "approval_pending": return "bg-purple-100 text-purple-800 border-purple-200";
        case "validated": return "bg-green-100 text-green-800 border-green-200";
        case "approved": return "bg-green-100 text-green-800 border-green-200";
        case "data_update": return "bg-yellow-100 text-yellow-800 border-yellow-200";
        case "approval_data_update": return "bg-red-100 text-red-800 border-red-200";
        case "off_site": return "bg-gray-100 text-gray-600 border-gray-200";
        case "incomplete": return "bg-red-100 text-red-800 border-red-200";
        default: return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-surface dark:text-gray-300 dark:border-[#444746]";
    }
};

const WorkersPage: React.FC = () => {
    const params = useParams();
    const projectId = params?.id as string;
    const tWorkers = useTranslations('Workers');
    const tRoles = useTranslations('workerRoles');

    const {
        getProjectResources,
        addWorker,
        companies,
        allWorkers,
        users,
        currentUser,
        projects,
        updateProject,
        getUserRoleInProject,
        toggleWorkerFieldValidation,
        archiveWorker,
        restoreWorker,
        submitWorker,
        requestWorkerElements,
        validateWorker,
        blockAccessCard,
        updateWorker,
        trainings,
        workerProfiles,
        approveWorker,
        tickets,
        createTicket,
        setFieldPermission,
        documents,
        accessPoints,
        workerTrainingRecords,
        courses,
        addWorkerTrainingRecord,
        deleteWorkerTrainingRecord,
    } = useStore(useShallow(state => ({
        getProjectResources: state.getProjectResources,
        addWorker: state.addWorker,
        companies: state.companies,
        allWorkers: state.workers,
        users: state.users,
        currentUser: state.currentUser,
        projects: state.projects,
        updateProject: state.updateProject,
        getUserRoleInProject: state.getUserRoleInProject,
        toggleWorkerFieldValidation: state.toggleWorkerFieldValidation,
        archiveWorker: state.archiveWorker,
        restoreWorker: state.restoreWorker,
        submitWorker: state.submitWorker,
        requestWorkerElements: state.requestWorkerElements,
        validateWorker: state.validateWorker,
        blockAccessCard: state.blockAccessCard,
        updateWorker: state.updateWorker,
        trainings: state.trainings,
        workerProfiles: state.workerProfiles,
        approveWorker: state.approveWorker,
        tickets: state.tickets,
        createTicket: state.createTicket,
        setFieldPermission: state.setFieldPermission,
        documents: state.documents,
        accessPoints: state.accessPoints,
        workerTrainingRecords: state.workerTrainingRecords,
        courses: state.courses,
        addWorkerTrainingRecord: state.addWorkerTrainingRecord,
        deleteWorkerTrainingRecord: state.deleteWorkerTrainingRecord,
    })));
    const currentProject = projects.find(p => p.id === projectId);

    const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');

    // Reactive: filter workers and companies for this project directly from store
    const workers = allWorkers.filter((w: Worker) => w.projectId === projectId);
    const filteredCompanies = companies.filter((c: Company) => c.projectId === projectId);

    const access = getUserRoleInProject(currentUser?.id || '', projectId);
    const isManager = access === 'manager' || currentUser?.role === 'admin';
    const isDataUser = access === 'data_user';
    const isApprovalUser = access === 'approval_user';
    const canEdit = isManager || access === 'editor';
    const canDelete = isManager;


    const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);

    // A company is "addable" for new workers depending on the project setting:
    // - If requireCompanyValidatedToAddWorkers is true: only validated/approved companies (not in data_update)
    // - If false (default): validated, approved AND data_update companies are all ok
    const hasValidCompany = filteredCompanies.some(c => {
        const isValidatedOrApproved = c.workflowStatus === 'validated' || c.workflowStatus === 'approved';
        const isDataUpdate = c.workflowStatus === 'data_update';
        if (currentProject?.requireCompanyValidatedToAddWorkers) {
            return isValidatedOrApproved; // strict: data_update not allowed
        }
        return isValidatedOrApproved || isDataUpdate; // permissive: data_update allowed
    });

    // Auto-open a specific worker drawer if ?worker=<id> is in the URL
    const searchParams = useSearchParams();
    useEffect(() => {
        const workerIdParam = searchParams?.get('worker');
        if (workerIdParam) {
            // Wait for workers to be loaded
            const allWorkers = getProjectResources(projectId).workers;
            const target = allWorkers.find(w => w.id === workerIdParam);
            if (target) {
                handleDrawerOpen(target as Worker);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [filter, setFilter] = useState<'all' | 'valid' | 'pending' | 'expired' | 'archived'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [currentWorker, setCurrentWorker] = useState<Partial<Worker>>({});
    const [mode, setMode] = useState<'create' | 'edit'>('create');
    const [isEditing, setIsEditing] = useState(false);
    const [showSavedMessage, setShowSavedMessage] = useState(false);
    const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
    const [drawerTab, setDrawerTab] = useState<'id' | 'pro' | 'safety' | 'bim' | 'process' | 'docs' | 'history' | 'qualifications'>('id');
    const [activeTab, setActiveTab] = useState<'id' | 'pro' | 'safety' | 'qualifications' | 'process'>('id');
    const [cardWorkerId, setCardWorkerId] = useState<string | null>(null);

    // Workflow & Ticket States
    const [pendingTicketActions, setPendingTicketActions] = useState<Map<string, 'forward' | 'resolve' | 'request_revision' | 'open'>>(new Map());
    const [confirmationType, setConfirmationType] = useState<'submit' | 'validate' | 'review'>('submit');
    const [isSubmitConfirmationOpen, setIsSubmitConfirmationOpen] = useState(false);

    // Dummy addTicketMessage implementation until we migrate the full ticket system
    const addTicketMessage = (ticketId: string, message: string, userId: string) => {
        console.log("Mock addTicketMessage", { ticketId, message, userId });
    };

    const effectiveIsDataUser = currentWorker?.assignedDataUserId === currentUser?.id;

    const [ticketConfirmation, setTicketConfirmation] = useState<{
        isOpen: boolean;
        action: 'forward' | 'resolve' | 'request_revision' | 'open' | null;
        ticketId: string | null;
        title: string;
        message: string;
    }>({ isOpen: false, action: null, ticketId: null, title: '', message: '' });

    // Profile Logic
    const selectedProfile = workerProfiles.find(p => p.id === currentWorker.profileId);

    const handleDrawerOpen = (worker: Worker) => {
        setSelectedWorkerId(worker.id);
        setCurrentWorker(worker);
        setDrawerTab('id');
        // Do not open modal directly anymore
    };

    const handleEdit = (worker: Worker) => {
        // Fallback for direct edit calls if any
        setCurrentWorker(worker);
        setActiveTab('id');
        setMode('edit');
        setIsEditing(false); // Default to View Mode

        setIsModalOpen(true);
    };

    // Auto-select standard profile ON CREATE
    useEffect(() => {
        if (mode === 'create' && !currentWorker.profileId && isModalOpen) {
            const defaultId = currentProject?.defaultWorkerProfileId || `profile_std_worker_${projectId}`;
            setCurrentWorker(prev => ({ ...prev, profileId: defaultId }));
        }
    }, [mode, isModalOpen, currentProject?.defaultWorkerProfileId, projectId, currentWorker.profileId]);

    const isVisible = (fieldKey: string) => {
        if (!selectedProfile) return true; // Show everything if no profile
        return !!selectedProfile.requirements[fieldKey as keyof typeof selectedProfile.requirements];
    };

    const isUploadVisible = (key: string) => {
        if (!selectedProfile) return true;
        return selectedProfile.standardUploads?.[key] !== false;
    };

    // Override isVisible
    // Override isVisible



    // Computed
    const getValidationStatus = (worker: Worker) => {
        if (!worker) return { status: 'incomplete' as const, label: 'Em Validação', color: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800' };
        if (worker.archived) return { status: 'archived' as const, label: 'Arquivado', color: 'bg-gray-100 text-gray-600 border border-gray-200 dark:bg-surface dark:text-gray-300 dark:border-[#444746]' };

        // Check expiries
        const now = new Date();
        const warnings: string[] = [];

        if (worker.idCardExpiry && new Date(worker.idCardExpiry) < now) warnings.push('CC Expirado');
        if (worker.contractExpiry && new Date(worker.contractExpiry) < now) warnings.push('Contrato Expirado');
        if (worker.medicalExpiry && new Date(worker.medicalExpiry) < now) warnings.push('Apto Médico Expirado');

        if (warnings.length > 0) return { status: 'expired' as const, label: warnings[0], color: 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800' };
        if (worker.workflowStatus === 'validated') return { status: 'valid' as const, label: 'Validado', color: 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800' };
        if (worker.workflowStatus === 'approved') return { status: 'valid' as const, label: 'Aprovado', color: 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800' };
        if (worker.workflowStatus === 'validation_pending') return { status: 'pending' as const, label: 'Validação Pendente', color: 'bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800' };
        if (worker.workflowStatus === 'approval_pending') return { status: 'pending' as const, label: 'Pendente Aprovação', color: 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800' };

        return { status: 'incomplete' as const, label: 'Em Validação', color: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800' };
    };

    const filteredWorkers = workers.filter(worker => {
        // Filter by company
        if (selectedCompanyId !== 'all' && worker.companyId !== selectedCompanyId) return false;

        // Filter logic
        if (searchQuery) {
            const lowerInfo = (worker.name + worker.nif + worker.role).toLowerCase();
            if (!lowerInfo.includes(searchQuery.toLowerCase())) return false;
        }

        if (filter === 'all') return !worker.archived;
        if (filter === 'archived') return worker.archived;

        const status = getValidationStatus(worker).status;
        if (filter === 'valid') return status === 'valid';
        if (filter === 'pending') return status === 'pending' || status === 'incomplete';
        if (filter === 'expired') return status === 'expired';

        return true;
    });


    const handleSubmit = () => {
        if (mode === 'create') {
            if (currentWorker.name && currentWorker.companyId) {
                // Obter o data user da empresa para associar ao trabalhador
                const company = companies.find(c => c.id === currentWorker.companyId);
                const assignedDataUserId = company?.assignedDataUserId || undefined;

                // Add projectId/accountId
                addWorker({
                    ...currentWorker as Worker,
                    projectId,
                    assignedDataUserId, // O data user para os trabalhadores é o mesmo da empresa
                    workflowStatus: 'validation_pending' // O estado inicial passa para em validação
                });
                setIsModalOpen(false);
            }
        } else {
            if (currentWorker.id) {
                updateWorker(currentWorker.id, currentWorker);
                // Keep modal open and show saved message
                setShowSavedMessage(true);
                setTimeout(() => setShowSavedMessage(false), 3000);
            }
        }
    };

    const handleAction = (action: string, worker: Worker) => {
        if (action === 'archive') {
            if (confirm('Are you sure you want to archive this worker?')) {
                archiveWorker(worker.id);
            }
        } else if (action === 'restore') {
            restoreWorker(worker.id);
        }
        setOpenMenuId(null);
    };

    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [reviewField, setReviewField] = useState<{ id: string, label: string, currentValue?: any } | null>(null);

    const getFieldProps = (id: string, label: string) => {
        const openTicket = tickets.find(t => t.entityId === currentWorker?.id && t.fieldId === id && t.status === 'open');
        const hasOpenTicket = !!openTicket;
        const liveWorker = workers.find(w => w.id === currentWorker?.id) || currentWorker;
        const isValidated = liveWorker?.fieldValidations?.[id] === true;

        const lastEditor = liveWorker?.fieldLastEditors?.[id];
        const isManagerEdited = lastEditor === 'manager';

        // Considera-se preenchido pelo data user se o último editor for data_user OU se tiver um valor (e não foi o manager a editar explicitamente)
        let val = (liveWorker as any)?.[id];
        if (id === 'occupation' && !val && liveWorker?.workerRoleId) {
             val = liveWorker.workerRoleId;
        }
        const hasValue = val !== undefined && val !== null && val !== '';
        const isDataUserEdited = lastEditor === 'data_user' || (hasValue && !isManagerEdited);

        const isLockedForDataUser = isValidated || isManagerEdited;
        
        let locked = false;
        if (isManager) {
            locked = isDataUserEdited || isValidated;
        } else {
            locked = isLockedForDataUser;
        }

        if (mode === 'create') {
            locked = false; // Never lock fields during initial creation
        }

        return {
            label,
            isValidated,
            isLocked: locked,
            hasOpenTicket,
            canValidate: isManager && mode !== 'create',
            canUnlock: false,
            canRequestReview: isManager || isDataUser,
            onValidate: () => {
                if (currentWorker.id) toggleWorkerFieldValidation(currentWorker.id, id, !isValidated);
            },
            onUnlock: () => { },
            onRequestReview: () => {
                setReviewField({ id, label, currentValue: (currentWorker as any)[id] });
                setReviewModalOpen(true);
            },
            currentValue: (currentWorker as any)[id],
            ticket: openTicket,
            isManager,
            onResolveTicket: () => { /* Handle resolve */ },
            isDisabled: !isEditing || locked,
            isEditing,
            workflowStatus: currentWorker?.workflowStatus
        };
    };

    const handleSubmitReview = (message: string) => {
        if (!reviewField || !currentWorker.id) return;
        createTicket({
            projectId,
            entityId: currentWorker.id,
            type: 'field_review',
            fieldId: reviewField.id,
            title: `Review: ${reviewField.label}`,
            description: message,
            priority: 'medium',
            createdBy: currentUser?.id || 'unknown',
            assignedTo: currentWorker.assignedDataUserId,
            isDraft: true,
            valueAtReview: JSON.stringify(reviewField.currentValue)
        });
        setReviewModalOpen(false);
        setReviewField(null);
    };

    const handleCancelWithRollback = () => {
        setIsEditing(false);
    };

    const drawerActions = (
        <div className="flex items-center gap-2">
            {/* Badge: modo de visualização / edição discreto */}
            {!isEditing && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-surface border border-gray-200 dark:border-[#444746] rounded shrink-0">
                    <Eye size={10} className="text-gray-400" /> Visualização
                </span>
            )}
            {isEditing && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded shrink-0">
                    <Edit2 size={10} /> Edição
                </span>
            )}

            {/* Workflow Actions — only in View Mode */}
            {!isEditing && (() => {
                const cw = workers.find(w => w.id === selectedWorkerId) || currentWorker;
                if (!cw.id) return null;

                const isManagerForThis = isManager;
                const dataUserCanSeeActions = isDataUser && ['draft', 'data_requested', 'data_update'].includes(cw.workflowStatus || '');
                if (!isManagerForThis && !dataUserCanSeeActions) return null;

                const checkFields: (keyof Worker)[] = ['name', 'birthDate', 'idCardExpiry', 'companyId', 'role'];
                if (cw.isForeign) checkFields.push('residencyExpiry');

                const validCount = checkFields.filter(k => cw.fieldValidations?.[k]).length;
                const isAllValidated = validCount >= checkFields.length;

                const projectTrainings = trainings.filter(t => t.projectId === cw.projectId && t.isMandatory);
                const mandatoryCourses = courses.filter(c => c.projectId === cw.projectId && c.isMandatoryAll);
                let isCompliant = true;
                
                for (const pt of projectTrainings) {
                    if (!workerTrainingRecords.some(r => r.workerId === cw.id && r.trainingType === pt.type && r.status === 'completed')) {
                        isCompliant = false; break;
                    }
                }
                
                if (isCompliant) {
                    for (const mc of mandatoryCourses) {
                        if (!workerTrainingRecords.some(r => r.workerId === cw.id && r.courseId === mc.id && r.passed)) {
                            isCompliant = false; break;
                        }
                    }
                }

                return (
                    <div className="flex items-center gap-2 mr-2">
                        {(isDataUser || isManagerForThis) && (cw.workflowStatus === 'draft' || cw.workflowStatus === 'data_requested' || cw.workflowStatus === 'data_update') && (() => {
                            const profile = isDataUser ? (workerProfiles || []).find(p => p.id === cw.profileId) : null;
                            const reqs = profile?.requirements || {};
                            const fieldsFilled: boolean[] = [
                                !!(cw.firstName || cw.name),
                                !!(cw.companyId),
                                ...(!reqs.medical_fitness ? [] : [!!(cw.medicalExpiry || (cw as any).medicalFitness)]),
                                ...(!reqs.induction ? [] : [!!(cw as any).inductionDate]),
                                ...(!reqs.contract ? [] : [!!(cw.contractExpiry)]),
                            ];
                            const drawerReadyToSubmit = isManagerForThis || fieldsFilled.every(Boolean);
                            return (
                                <button
                                    type="button"
                                    disabled={!drawerReadyToSubmit}
                                    onClick={() => submitWorker(cw.id!)}
                                    className={cn(
                                        "px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-sm flex items-center gap-1.5",
                                        !drawerReadyToSubmit && "opacity-40 cursor-not-allowed"
                                    )}
                                >
                                    <CheckCircle size={14} /> Submeter
                                </button>
                            );
                        })()}

                        {isManagerForThis && (cw.workflowStatus === 'validation_pending' || cw.workflowStatus === 'validated' || cw.workflowStatus === 'in_training_process') && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const missing = checkFields.filter(k => !cw.fieldValidations?.[k]);
                                        requestWorkerElements(cw.id!, missing);
                                    }}
                                    className="px-3 py-1.5 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors shadow-sm flex items-center gap-1.5"
                                >
                                    <AlertTriangle size={14} /> Rever
                                </button>
                                
                                {isCompliant ? (
                                    <button
                                        type="button"
                                        disabled={!isAllValidated}
                                        onClick={() => validateWorker(cw.id!)}
                                        className={cn(
                                            "px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-sm flex items-center gap-1.5",
                                            !isAllValidated && "opacity-50 cursor-not-allowed"
                                        )}
                                    >
                                        <Check size={14} /> Validar
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        disabled={!isAllValidated}
                                        onClick={() => updateWorker(cw.id!, { workflowStatus: 'in_training_process' })}
                                        className={cn(
                                            "px-3 py-1.5 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors shadow-sm flex items-center gap-1.5",
                                            !isAllValidated && "opacity-50 cursor-not-allowed"
                                        )}
                                    >
                                        <GraduationCap size={14} /> Formação
                                    </button>
                                )}
                            </>
                        )}
                        <div className="h-6 w-px bg-gray-200 dark:bg-[#444746] mx-1" />
                    </div>
                );
            })()}

            {/* Botão Editar — só em modo de visualização */}
            {!isEditing && (canEdit || isDataUser) && (
                <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-[#4285F4] hover:bg-[#3367D6] dark:hover:bg-[#1A73E8] hover:text-white rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                    <Edit2 size={13} className="text-white" /> Editar
                </button>
            )}
            {/* Botão Cancelar — só em modo de edição (sai do modo) */}
            {isEditing && (
                <button
                    type="button"
                    onClick={handleCancelWithRollback}
                    className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-surface border border-gray-300 dark:border-[#444746] rounded-lg hover:bg-gray-100 dark:hover:bg-[#131314] transition-colors shadow-xs cursor-pointer shrink-0"
                >
                    Cancelar
                </button>
            )}
            {/* Botão Guardar — só em modo de edição */}
            {isEditing && (
                <button
                    type="button"
                    onClick={() => {
                        handleSubmit();
                        setIsEditing(false);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-[#4285F4] hover:bg-[#3367D6] dark:hover:bg-[#1A73E8] hover:text-white rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                    {showSavedMessage && (
                        <span className="text-[11px] font-medium text-green-200 animate-in fade-in slide-in-from-right-2">✓ Guardado</span>
                    )}
                    <Save size={13} className="text-white" /> Guardar
                </button>
            )}
        </div>
    );

    const expiredCount = workers.filter(w => getValidationStatus(w).status === 'expired').length;

    return (
        <div className="flex flex-col h-full">
            {isManager && expiredCount > 0 && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 mx-4 mt-4 rounded-r-lg flex items-center justify-between shadow-sm animate-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center gap-3">
                        <div className="bg-red-100 p-2 rounded-full text-red-600"><AlertTriangle size={20} /></div>
                        <div>
                            <h3 className="text-sm font-medium text-red-800">Atenção Necessária</h3>
                            <p className="text-sm text-red-700">Existem <b>{expiredCount}</b> trabalhadores com documentos ou validações expiradas.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setFilter('expired')}
                        className="bg-white dark:bg-surface border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-50 hover:text-red-800 transition-colors shadow-sm cursor-pointer"
                    >
                        Ver Expirados
                    </button>
                </div>
            )}

            {/* Header / Top Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border)] mb-4 px-2 pt-2">
                {/* Title + Count */}
                <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold text-[var(--text)] tracking-tight">
                        Pessoas
                    </h1>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[var(--bg-input)] text-[var(--text-muted)] border border-[var(--border)]">
                        {filteredWorkers.length}
                    </span>
                </div>

                {/* Controls & Actions */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" size={15} />
                        <input
                            type="text"
                            placeholder="Pesquisar pessoas..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-40 sm:w-48 focus:w-60 transition-all duration-200 pl-9 pr-3 py-1.5 text-xs bg-[var(--bg-input)] text-[var(--text)] border border-[var(--border)] rounded-lg outline-none focus:border-[#4285F4] placeholder:text-[var(--text-muted)]"
                        />
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center bg-[var(--bg-input)] border border-[var(--border)] rounded-lg p-0.5 overflow-x-auto">
                        {[
                            { key: 'all', label: 'Todas' },
                            { key: 'valid', label: 'Válidas' },
                            { key: 'pending', label: 'Pendentes' },
                            { key: 'expired', label: 'Expiradas' },
                            { key: 'archived', label: 'Arquivadas' },
                        ].map((f) => (
                            <button
                                key={f.key}
                                onClick={() => setFilter(f.key as any)}
                                className={cn(
                                    "px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap",
                                    filter === f.key
                                        ? "bg-[var(--bg-card)] text-[var(--text)] font-semibold shadow-xs"
                                        : "text-[var(--text-muted)] hover:text-[var(--text)]"
                                )}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {/* Company Filter Dropdown */}
                    <div className="relative">
                        <select
                            title="Filtrar por empresa"
                            value={selectedCompanyId}
                            onChange={(e) => setSelectedCompanyId(e.target.value)}
                            className="appearance-none pl-3 pr-8 py-1.5 text-xs bg-[var(--bg-input)] text-[var(--text)] border border-[var(--border)] rounded-lg outline-none focus:border-[#4285F4] cursor-pointer"
                        >
                            <option value="all">Todas as empresas</option>
                            {filteredCompanies.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" size={13} />
                    </div>

                    {/* New Worker Button */}
                    {(isDataUser || isManager) && (
                        <button
                            disabled={!hasValidCompany}
                            title={!hasValidCompany
                                ? currentProject?.requireCompanyValidatedToAddWorkers
                                    ? "A empresa precisa estar validada ou aprovada (sem documentos expirados) para adicionar pessoas."
                                    : "A sua empresa precisa estar validada ou aprovada para adicionar pessoas."
                                : "Adicionar Pessoa"}
                            onClick={() => setIsQuickCreateOpen(true)}
                            className={cn(
                                "flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white rounded-lg shadow-xs transition-all whitespace-nowrap",
                                hasValidCompany ? "bg-[#4285F4] hover:bg-[#3367D6]" : "bg-gray-400 cursor-not-allowed opacity-60"
                            )}
                        >
                            <Plus size={15} /> <span>Nova Pessoa</span>
                        </button>
                    )}

                    {/* View Toggle */}
                    <div className="flex items-center bg-[var(--bg-input)] border border-[var(--border)] rounded-lg p-0.5">
                        <button
                            title="Vista de Lista"
                            onClick={() => setViewMode('list')}
                            className={cn("p-1.5 rounded-md transition-colors", viewMode === 'list' ? "bg-[var(--bg-card)] text-[#4285F4] shadow-xs" : "text-[var(--text-muted)] hover:text-[var(--text)]")}
                        >
                            <ListIcon size={16} />
                        </button>
                        <button
                            title="Vista de Grelha"
                            onClick={() => setViewMode('grid')}
                            className={cn("p-1.5 rounded-md transition-colors", viewMode === 'grid' ? "bg-[var(--bg-card)] text-[#4285F4] shadow-xs" : "text-[var(--text-muted)] hover:text-[var(--text)]")}
                        >
                            <LayoutGrid size={16} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4">
                {viewMode === 'list' ? (
                    <ListView
                        workers={filteredWorkers}
                        companies={filteredCompanies}
                        onEdit={handleDrawerOpen}
                        getStatus={getValidationStatus}
                        openMenuId={openMenuId}
                        setOpenMenuId={setOpenMenuId}
                        onAction={(action, worker) => {
                            if (action === 'card') {
                                setCardWorkerId(worker.id);
                            } else {
                                handleAction(action, worker);
                            }
                        }}
                        canDelete={canDelete}
                        canEdit={canEdit}
                    />
                ) : (
                    <GridView workers={filteredWorkers} onEdit={handleDrawerOpen} />
                )}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={mode === 'create' ? "Adicionar Nova Pessoa" : (currentWorker.name || "Editar Pessoa")}
                maxWidth="max-w-4xl"
                resizable={true}
                headerAction={drawerActions}
            >
                <form id="worker-form" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-6">
                    {/* Profile Selection - Moved above sections */}
                    {mode !== 'create' && (
                    <div className="flex justify-between items-center bg-gray-50 dark:bg-[#131314] p-3 rounded-lg">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200">Perfil de Pessoa</label>
                            <p className="text-xs text-gray-500">Determines required documents &amp; trainings.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <select
                                value={currentWorker.profileId || ''}
                                onChange={(e) => setCurrentWorker({ ...currentWorker, profileId: e.target.value })}
                                className="text-sm border-gray-300 dark:border-[#444746] rounded-md shadow-sm focus:border-blue-500 focus:ring-primary p-2 border"
                                disabled={!isEditing || isManager}
                            >
                                <option value="">Select Profile</option>
                                {workerProfiles.filter(p => p.projectId === projectId).map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} {p.isSystem ? '(Default)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    )}




























                    {/* 01 — Identificação Pessoal */}
                    {(mode === 'create' || activeTab === 'id') && (
                        <div className="bg-gray-50 dark:bg-[#131314] border border-gray-100 dark:border-[#444746] rounded-xl overflow-hidden mb-6">
                            <div className="bg-gray-100 dark:bg-[#1e1e20] px-4 py-3 border-b border-gray-200 dark:border-[#444746] flex items-center justify-between">
                                <h3 className="text-md font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                    {tWorkers('tabs.id')}
                                </h3>
                                <div className="flex gap-2">
                                </div>
                            </div>
                            <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* Linha 1: Nomes */}
                                <FieldControl {...getFieldProps('firstName', 'Primeiro Nome')}>
                                    <input type="text" value={currentWorker.firstName || ''} onChange={e => setCurrentWorker({ ...currentWorker, firstName: e.target.value })} className="w-full p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-colors bg-white dark:bg-[#131415] disabled:bg-gray-100 disabled:text-gray-500" required />
                                </FieldControl>
                                <FieldControl {...getFieldProps('middleName', 'Nome do Meio')}>
                                    <input type="text" value={currentWorker.middleName || ''} onChange={e => setCurrentWorker({ ...currentWorker, middleName: e.target.value })} className="w-full p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-colors bg-white dark:bg-[#131415] disabled:bg-gray-100 disabled:text-gray-500" />
                                </FieldControl>
                                <FieldControl {...getFieldProps('lastName', 'Apelido')}>
                                    <input type="text" value={currentWorker.lastName || ''} onChange={e => setCurrentWorker({ ...currentWorker, lastName: e.target.value })} className="w-full p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-colors bg-white dark:bg-[#131415] disabled:bg-gray-100 disabled:text-gray-500" required />
                                </FieldControl>

                                <FieldControl {...getFieldProps('nationalityType', 'Nacionalidade ★')}>
                                    <select title="Nacionalidade" value={currentWorker.nationalityType || 'portugal'} onChange={e => {
                                        const nat = e.target.value as 'portugal' | 'eu_etc' | 'other';
                                        setCurrentWorker({
                                            ...currentWorker,
                                            nationalityType: nat,
                                            isForeign: nat !== 'portugal',
                                            foreignCountry: nat === 'portugal' ? '' : currentWorker.foreignCountry
                                        });
                                    }} className="w-full p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-colors bg-white dark:bg-[#131415] disabled:bg-gray-100 disabled:text-gray-500" required>
                                        <option value="portugal">Portugal (PT)</option>
                                        <option value="eu_etc">U.E., Islândia, Liechtenstein, Noruega, Suíça e Andorra</option>
                                        <option value="other">Outra Nacionalidade (Extracomunitário)</option>
                                    </select>
                                </FieldControl>

                                {currentWorker.nationalityType && currentWorker.nationalityType !== 'portugal' && (
                                    <FieldControl {...getFieldProps('foreignCountry', 'País de Origem ★')}>
                                        <input type="text" value={currentWorker.foreignCountry || ''} onChange={e => setCurrentWorker({ ...currentWorker, foreignCountry: e.target.value })} className="w-full p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-colors bg-white dark:bg-[#131415] disabled:bg-gray-100 disabled:text-gray-500" required placeholder="Ex: Espanha, Angola, de onde é o cidadão..." />
                                    </FieldControl>
                                )}

                                {/* Linha 2: Documentos (Proteção de dados em View mode) */}
                                {(() => {
                                    const maskValue = (val?: string) => {
                                        if (!val) return '';
                                        if (isEditing || mode === 'create') return val;
                                        if (val.length <= 4) return val;
                                        const first = val.substring(0, 1);
                                        const last = val.substring(val.length - 3);
                                        const masked = '*'.repeat(val.length - 4);
                                        return `${first}${masked}${last}`;
                                    };
                                    return (
                                        <>
                                            <FieldControl {...getFieldProps('nif', 'NIF ★')}>
                                                <input type="text" value={maskValue(currentWorker.nif)} onChange={e => setCurrentWorker({ ...currentWorker, nif: e.target.value })} required className="w-full p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-colors bg-white dark:bg-[#131415] disabled:bg-gray-100 disabled:text-gray-500" />
                                            </FieldControl>

                                            <div className={currentWorker.isForeign ? "md:col-span-2" : ""}>
                                                <FieldControl {...getFieldProps('idCardNumber', 'Documento de Identificação')}>
                                                    <div className="flex gap-2 w-full">
                                                        {currentWorker.isForeign && (
                                                            <>
                                                                <select
                                                                    title="Tipo de Documento"
                                                                    value={currentWorker.idCardType || 'passaporte'}
                                                                    onChange={e => setCurrentWorker({ ...currentWorker, idCardType: e.target.value })}
                                                                    className="w-[110px] sm:w-[130px] flex-shrink-0 p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-colors bg-white dark:bg-[#131415] disabled:bg-gray-100 disabled:text-gray-500 hover:border-gray-400"
                                                                >
                                                                    <option value="passaporte">Passaporte</option>
                                                                    <option value="dni">DNI</option>
                                                                    <option value="residencia">Tít. Residência</option>
                                                                    <option value="outro">Outro...</option>
                                                                </select>
                                                                {currentWorker.idCardType === 'outro' && (
                                                                    <input
                                                                        title="Especificar Documento"
                                                                        type="text"
                                                                        placeholder="Especifique..."
                                                                        value={currentWorker.idCardTypeCustom || ''}
                                                                        onChange={e => setCurrentWorker({ ...currentWorker, idCardTypeCustom: e.target.value })}
                                                                        className="w-[120px] sm:w-[140px] flex-shrink-0 p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-colors bg-white dark:bg-[#131415] disabled:bg-gray-100 disabled:text-gray-500"
                                                                    />
                                                                )}
                                                            </>
                                                        )}
                                                        <input 
                                                            title="Número do Documento"
                                                            type="text" 
                                                            value={maskValue(currentWorker.idCardNumber)} 
                                                            onChange={e => setCurrentWorker({ ...currentWorker, idCardNumber: e.target.value })} 
                                                            className="w-full p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-colors bg-white dark:bg-[#131415] disabled:bg-gray-100 disabled:text-gray-500" 
                                                            placeholder={currentWorker.isForeign ? "N.º do Documento" : "Número"} 
                                                        />
                                                    </div>
                                                </FieldControl>
                                            </div>

                                            <FieldControl {...getFieldProps('ssn', 'N.º Segurança Social')}>
                                                <input type="text" value={maskValue(currentWorker.ssn)} onChange={e => setCurrentWorker({ ...currentWorker, ssn: e.target.value })} className="w-full p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-colors bg-white dark:bg-[#131415] disabled:bg-gray-100 disabled:text-gray-500" />
                                            </FieldControl>
                                        </>
                                    );
                                })()}

                                {/* Linha 3: Demografia e Tipo Sanguíneo */}
                                <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FieldControl {...getFieldProps('birthDate', 'Data de Nascimento')}>
                                        <input type="date" value={currentWorker.birthDate || ''} onChange={e => setCurrentWorker({ ...currentWorker, birthDate: e.target.value })} className="w-full p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-colors bg-white dark:bg-[#131415] disabled:bg-gray-100 disabled:text-gray-500" />
                                    </FieldControl>
                                    <div className="hidden">
                                        <FieldControl {...getFieldProps('bloodType', 'Grupo Sanguíneo')}>
                                            <select value={currentWorker.bloodType || ''} onChange={e => setCurrentWorker({ ...currentWorker, bloodType: e.target.value })} className="w-full p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-colors bg-white dark:bg-[#131415] disabled:bg-gray-100 disabled:text-gray-500">
                                                <option value="">Desconhecido</option>
                                                <option value="A+">A+</option>
                                                <option value="A-">A-</option>
                                                <option value="B+">B+</option>
                                                <option value="B-">B-</option>
                                                <option value="AB+">AB+</option>
                                                <option value="AB-">AB-</option>
                                                <option value="O+">O+</option>
                                                <option value="O-">O-</option>
                                            </select>
                                        </FieldControl>
                                    </div>
                                </div>

                                {/* Função no Projeto */}
                                <FieldControl {...getFieldProps('occupation', 'Função no Projeto ★')}>
                                    <div className="flex flex-col gap-2 w-full">
                                        <select
                                            value={currentWorker.workerRoleId || ''}
                                            title="Função no Projeto"
                                            onChange={e => {
                                                const roleId = e.target.value;
                                                const roleDef = getRoleDefinition(roleId);
                                                const roleLabel = roleId === 'OTHER'
                                                    ? currentWorker.roleCustom || 'Outra'
                                                    : tRoles(`roles.${roleId}`);
                                                
                                                setCurrentWorker({
                                                    ...currentWorker,
                                                    workerRoleId: roleId,
                                                    role: roleLabel,
                                                    occupation: roleDef?.ifcLaborResource?.objectType ?? undefined,
                                                    ifcLaborType: roleDef?.ifcLaborResource?.predefinedType ?? undefined
                                                });
                                            }}
                                            className="w-full p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-colors bg-white dark:bg-[#131415] hover:border-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
                                            required
                                            disabled={getFieldProps('occupation', '').isDisabled}
                                        >
                                            <option value="">— Selecionar função —</option>

                                            <optgroup label="Responsáveis de Obra">
                                                {WORKER_ROLES.filter(r => r.group === 'SITE_RESPONSIBLE').map(r => (
                                                    <option key={r.id} value={r.id}>{tRoles(`roles.${r.id}`)}</option>
                                                ))}
                                            </optgroup>

                                            <optgroup label="Segurança no Trabalho (SHST)">
                                                {WORKER_ROLES.filter(r => r.group === 'SHST_RESPONSIBLE').map(r => (
                                                    <option key={r.id} value={r.id}>{tRoles(`roles.${r.id}`)}</option>
                                                ))}
                                            </optgroup>

                                            {OPERATIVE_CATEGORIES.map(cat => {
                                                const catRoles = WORKER_ROLES.filter(r => r.group === 'OPERATIVE' && r.category === cat);
                                                if (!catRoles.length) return null;
                                                return (
                                                    <optgroup key={cat} label={tRoles(`categories.${cat}`)}>
                                                        {catRoles.map(r => (
                                                            <option key={r.id} value={r.id}>{tRoles(`roles.${r.id}`)}</option>
                                                        ))}
                                                    </optgroup>
                                                );
                                            })}
                                        </select>
                                        
                                        {currentWorker.workerRoleId === 'OTHER' && (
                                            <input
                                                type="text"
                                                title="Especificar Função"
                                                value={currentWorker.roleCustom || ''}
                                                onChange={e => setCurrentWorker({ 
                                                    ...currentWorker, 
                                                    roleCustom: e.target.value,
                                                    role: e.target.value 
                                                })}
                                                placeholder="Especificar função..."
                                                className="w-full p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-colors bg-white dark:bg-[#131415] disabled:bg-gray-100 disabled:text-gray-500"
                                                required
                                                disabled={getFieldProps('occupation', '').isDisabled}
                                            />
                                        )}
                                    </div>
                                </FieldControl>


                                {/* Contactos Rápidos */}
                                <FieldControl {...getFieldProps('phone', 'Contacto')}>
                                    <input type="tel" disabled value={currentWorker.phone || ''} onChange={e => setCurrentWorker({ ...currentWorker, phone: e.target.value })} className="w-full p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-colors bg-white dark:bg-[#131415] disabled:bg-gray-100 dark:disabled:bg-[#1a1a1c] disabled:text-gray-500 disabled:cursor-not-allowed" placeholder="(Preenchido no Acolhimento)" />
                                </FieldControl>
                                <FieldControl {...getFieldProps('email', 'Email')}>
                                    <input type="email" disabled value={currentWorker.email || ''} onChange={e => setCurrentWorker({ ...currentWorker, email: e.target.value })} className="w-full p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-colors bg-white dark:bg-[#131415] disabled:bg-gray-100 dark:disabled:bg-[#1a1a1c] disabled:text-gray-500 disabled:cursor-not-allowed" placeholder="(Preenchido no Acolhimento)" />
                                </FieldControl>

                                {/* Morada completa num layout flexível */}
                                <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="md:col-span-2">
                                        <FieldControl {...getFieldProps('address', 'Morada')}>
                                            <input type="text" value={currentWorker.address || ''} onChange={e => setCurrentWorker({ ...currentWorker, address: e.target.value })} className="w-full p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-colors bg-white dark:bg-[#131415] disabled:bg-gray-100 disabled:text-gray-500" />
                                        </FieldControl>
                                    </div>
                                    <FieldControl {...getFieldProps('postalCode', 'Código Postal')}>
                                        <input type="text" value={currentWorker.postalCode || ''} onChange={e => {
                                            const pc = e.target.value;
                                            setCurrentWorker({ ...currentWorker, postalCode: pc });
                                            // TODO: Autopreencher localidade com base no CP no futuro
                                        }} className="w-full p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-colors bg-white dark:bg-[#131415] disabled:bg-gray-100 disabled:text-gray-500" />
                                    </FieldControl>
                                    <FieldControl {...getFieldProps('city', 'Localidade')}>
                                        <input type="text" value={currentWorker.city || ''} onChange={e => setCurrentWorker({ ...currentWorker, city: e.target.value })} className="w-full p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-colors bg-white dark:bg-[#131415] disabled:bg-gray-100 disabled:text-gray-500" />
                                    </FieldControl>
                                </div>

                                {/* Trabalhador Estrangeiro (Condicional) */}
                                {currentWorker.isForeign && (() => {
                                    const hasForeignDoc = (cat: string) =>
                                        documents.some(d => d.entityId === currentWorker.id && d.category === cat && !d.archived);
                                    return (
                                        <div className="lg:col-span-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4 mt-2">
                                            <h4 className="flex items-center gap-2 text-amber-800 dark:text-amber-300 text-sm font-bold mb-4">
                                                <AlertTriangle size={16} /> Documentação Obrigatória (Trabalhador Estrangeiro)
                                            </h4>
                                            <div className="flex flex-col gap-4">

                                                <DocumentRow entityId={currentWorker.id!} projectId={projectId} category="foreign_contract" isUploadVisible={true} {...getFieldProps('foreignContract', 'Contrato de Trabalho (Cópia)')} onToggleValidation={getFieldProps('foreignContract', '').onValidate} isManager={isManager} isDataUser={isDataUser} isApprovalUser={isApprovalUser} approvalStatus={currentWorker.approvalStatus}>
                                                    <div className="mt-2 flex items-center gap-2 text-xs">
                                                        <span className="font-semibold text-gray-500 uppercase">Ficheiro carregado:</span>
                                                        {hasForeignDoc('foreign_contract')
                                                            ? <span className="inline-flex items-center gap-1 text-green-700 font-bold"><CheckCircle size={13} /> Sim</span>
                                                            : <span className="inline-flex items-center gap-1 text-amber-600 font-bold"><AlertCircle size={13} /> Não</span>}
                                                    </div>
                                                </DocumentRow>

                                                {currentWorker.nationalityType === 'eu_etc' && (
                                                    <DocumentRow entityId={currentWorker.id!} projectId={projectId} category="eu_citizen_certificate" isUploadVisible={true} {...getFieldProps('euCitizenCertificate', 'Certificado Registo Cidadão UE')} onToggleValidation={getFieldProps('euCitizenCertificate', '').onValidate} isManager={isManager} isDataUser={isDataUser} isApprovalUser={isApprovalUser} approvalStatus={currentWorker.approvalStatus}>
                                                        <div className="mt-2 flex items-center gap-2 text-xs">
                                                            <span className="font-semibold text-gray-500 uppercase">Ficheiro carregado:</span>
                                                            {hasForeignDoc('eu_citizen_certificate')
                                                                ? <span className="inline-flex items-center gap-1 text-green-700 font-bold"><CheckCircle size={13} /> Sim</span>
                                                                : <span className="inline-flex items-center gap-1 text-amber-600 font-bold"><AlertCircle size={13} /> Não</span>}
                                                        </div>
                                                    </DocumentRow>
                                                )}

                                                {(currentWorker.nationalityType === 'other' || !currentWorker.nationalityType) && (
                                                    <>
                                                        <DocumentRow entityId={currentWorker.id!} projectId={projectId} category="residency_permit" isUploadVisible={true} {...getFieldProps('residencyPermitNumber', 'Visto Válido / Título de Residência')} onToggleValidation={getFieldProps('residencyPermitNumber', '').onValidate} isManager={isManager} isDataUser={isDataUser} isApprovalUser={isApprovalUser} approvalStatus={currentWorker.approvalStatus}>
                                                            <div className="mt-2 text-xs font-semibold text-gray-500 uppercase mb-1">Número do Título de Residência</div>
                                                            <input type="text" value={currentWorker.residencyPermitNumber || ''} onChange={e => setCurrentWorker({ ...currentWorker, residencyPermitNumber: e.target.value })} className="w-full p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-colors bg-white dark:bg-[#131415] disabled:bg-gray-100 disabled:text-gray-500" required placeholder="Inserir N.º do Visto" />
                                                            <div className="mt-2 flex items-center gap-2 text-xs">
                                                                <span className="font-semibold text-gray-500 uppercase">Ficheiro carregado:</span>
                                                                {hasForeignDoc('residency_permit')
                                                                    ? <span className="inline-flex items-center gap-1 text-green-700 font-bold"><CheckCircle size={13} /> Sim</span>
                                                                    : <span className="inline-flex items-center gap-1 text-amber-600 font-bold"><AlertCircle size={13} /> Não</span>}
                                                            </div>
                                                        </DocumentRow>

                                                        <DocumentRow entityId={currentWorker.id!} projectId={projectId} category="act_communication" isUploadVisible={true} {...getFieldProps('actCommunication', 'Comunicação à ACT')} onToggleValidation={getFieldProps('actCommunication', '').onValidate} isManager={isManager} isDataUser={isDataUser} isApprovalUser={isApprovalUser} approvalStatus={currentWorker.approvalStatus}>
                                                            <div className="mt-2 flex items-center gap-2 text-xs">
                                                                <span className="font-semibold text-gray-500 uppercase">Ficheiro carregado:</span>
                                                                {hasForeignDoc('act_communication')
                                                                    ? <span className="inline-flex items-center gap-1 text-green-700 font-bold"><CheckCircle size={13} /> Sim</span>
                                                                    : <span className="inline-flex items-center gap-1 text-amber-600 font-bold"><AlertCircle size={13} /> Não</span>}
                                                            </div>
                                                        </DocumentRow>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    )}

                    {/* 02 — Entidade Patronal */}
                    {(mode === 'create' || activeTab === 'pro') && (
                    (() => {
                        const workerCompany = filteredCompanies.find(c => c.id === currentWorker.companyId);
                        const sameCompanyWorkers = workers.filter(w =>
                            w.companyId === currentWorker.companyId &&
                            w.id !== currentWorker.id &&
                            !w.archived
                        );
                        const isSiteResp = currentWorker.obligatoryRole?.type === 'SITE_RESPONSIBLE';
                        const isShstResp = currentWorker.obligatoryRole?.type === 'SHST_RESPONSIBLE';
                        const hasObligation = isSiteResp || isShstResp;
                        const hasInsurance = !!(workerCompany?.insuranceWorkAccPolicy || workerCompany?.insuranceWorkAccDate);
                        return (
                        <div className="flex flex-col gap-6 mb-6">

                            {/* ── Empresa ─────────────────────────────── */}
                            <div className="bg-gray-50 dark:bg-[#131314] border border-gray-100 dark:border-[#444746] rounded-xl overflow-hidden">
                                <div className="bg-gray-100 dark:bg-[#1e1e20] px-4 py-3 border-b border-gray-200 dark:border-[#444746]">
                                    <h3 className="text-md font-bold text-gray-800 dark:text-gray-100">Empresa</h3>
                                </div>
                                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FieldControl {...getFieldProps('companyId', 'Empresa Titular')}>
                                        <select value={currentWorker.companyId || ''} onChange={e => setCurrentWorker({ ...currentWorker, companyId: e.target.value })} required className="w-full p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-colors bg-white dark:bg-[#131415] disabled:bg-gray-100 disabled:text-gray-500">
                                            <option value="">Selecionar empresa</option>
                                            {filteredCompanies.filter(c => mode === 'edit' || c.workflowStatus === 'validated' || c.workflowStatus === 'approved').map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </FieldControl>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">NIF da Empresa</label>
                                        <div className="w-full p-2 text-[13px] border border-gray-200 dark:border-[#444746] rounded-lg bg-gray-50 dark:bg-[#1a1a1c] text-gray-500">
                                            {workerCompany?.nif || '—'}
                                        </div>
                                    </div>

                                    {/* Seguro AT — só se a empresa tiver apólice registada */}
                                    {hasInsurance && (
                                        <>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">N.º Apólice Acidente de Trabalho</label>
                                                <div className="w-full p-2 text-[13px] border border-gray-200 dark:border-[#444746] rounded-lg bg-gray-50 dark:bg-[#1a1a1c] text-gray-500">
                                                    {workerCompany?.insuranceWorkAccPolicy || '—'}
                                                </div>
                                            </div>
                                            {workerCompany?.insuranceWorkAccDate && (
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Validade do Seguro AT</label>
                                                    <div className="w-full p-2 text-[13px] border border-gray-200 dark:border-[#444746] rounded-lg bg-gray-50 dark:bg-[#1a1a1c] text-gray-500">
                                                        {new Date(workerCompany.insuranceWorkAccDate).toLocaleDateString('pt-PT')}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* ── Responsabilidades em Obra — só quando aplicável ── */}
                            {hasObligation && (
                                <div className="bg-gray-50 dark:bg-[#131314] border border-gray-100 dark:border-[#444746] rounded-xl overflow-hidden">
                                    <div className="bg-gray-100 dark:bg-[#1e1e20] px-4 py-3 border-b border-gray-200 dark:border-[#444746]">
                                        <h3 className="text-md font-bold text-gray-800 dark:text-gray-100">Responsabilidade em Obra</h3>
                                    </div>
                                    <div className="p-5 flex flex-col gap-4">

                                        {isSiteResp && (
                                            <div className="rounded-xl border-2 border-primary bg-primary/5 dark:bg-primary/10 p-4 flex flex-col gap-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[13px] font-semibold text-gray-800 dark:text-gray-100">Responsável da Empresa em Obra</span>
                                                    <span className="text-[11px] bg-primary text-white px-2 py-0.5 rounded-full font-medium">Este trabalhador</span>
                                                </div>
                                                {isEditing && sameCompanyWorkers.length > 0 && (
                                                    <div className="flex flex-col gap-1">
                                                        <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Transferir para</label>
                                                        <select
                                                            title="Transferir responsabilidade para"
                                                            className="w-full p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-primary transition-colors bg-white dark:bg-[#131415]"
                                                            defaultValue=""
                                                            onChange={e => {
                                                                if (e.target.value) {
                                                                    alert(`Funcionalidade de transferência disponível em breve. Trabalhador selecionado: ${sameCompanyWorkers.find(w => w.id === e.target.value)?.name}`);
                                                                    e.target.value = '';
                                                                }
                                                            }}
                                                        >
                                                            <option value="">— Selecionar trabalhador —</option>
                                                            {sameCompanyWorkers.map(w => (
                                                                <option key={w.id} value={w.id}>{w.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {isShstResp && (
                                            <div className="rounded-xl border-2 border-green-500 bg-green-50 dark:bg-green-900/10 p-4 flex flex-col gap-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[13px] font-semibold text-gray-800 dark:text-gray-100">Responsável SHST</span>
                                                    <span className="text-[11px] bg-green-500 text-white px-2 py-0.5 rounded-full font-medium">Este trabalhador</span>
                                                </div>
                                                {isEditing && sameCompanyWorkers.length > 0 && (
                                                    <div className="flex flex-col gap-1">
                                                        <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Transferir para</label>
                                                        <select
                                                            title="Transferir responsabilidade SHST para"
                                                            className="w-full p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-green-500 transition-colors bg-white dark:bg-[#131415]"
                                                            defaultValue=""
                                                            onChange={e => {
                                                                if (e.target.value) {
                                                                    alert(`Funcionalidade de transferência disponível em breve. Trabalhador selecionado: ${sameCompanyWorkers.find(w => w.id === e.target.value)?.name}`);
                                                                    e.target.value = '';
                                                                }
                                                            }}
                                                        >
                                                            <option value="">— Selecionar trabalhador —</option>
                                                            {sameCompanyWorkers.map(w => (
                                                                <option key={w.id} value={w.id}>{w.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ── Período no Estaleiro ──────────────── */}
                            <div className="bg-gray-50 dark:bg-[#131314] border border-gray-100 dark:border-[#444746] rounded-xl overflow-hidden">
                                <div className="bg-gray-100 dark:bg-[#1e1e20] px-4 py-3 border-b border-gray-200 dark:border-[#444746]">
                                    <h3 className="text-md font-bold text-gray-800 dark:text-gray-100">Período no Estaleiro</h3>
                                </div>
                                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Data de Entrada no Estaleiro</label>
                                        <div className="w-full p-2 text-[13px] border border-gray-200 dark:border-[#444746] rounded-lg bg-gray-50 dark:bg-[#1a1a1c] text-gray-500 flex items-center justify-between">
                                            <span>{currentWorker.entryDate ? new Date(currentWorker.entryDate).toLocaleDateString('pt-PT') : '—'}</span>
                                            <span className="text-[10px] text-gray-400 italic">Definida pelo sistema</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Data de Saída do Estaleiro</label>
                                        {currentWorker.exitDate ? (
                                            <div className="flex gap-2 items-center">
                                                <div className="flex-1 p-2 text-[13px] border border-gray-200 dark:border-[#444746] rounded-lg bg-gray-50 dark:bg-[#1a1a1c] text-gray-500">
                                                    {new Date(currentWorker.exitDate).toLocaleDateString('pt-PT')}
                                                </div>
                                                {isEditing && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setCurrentWorker({ ...currentWorker, exitDate: undefined })}
                                                        className="px-3 py-2 text-[12px] font-semibold text-red-600 border border-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                        title="Anular data de saída"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            isEditing ? (
                                                <input
                                                    type="date"
                                                    value=""
                                                    onChange={e => setCurrentWorker({ ...currentWorker, exitDate: e.target.value })}
                                                    className="w-full p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-colors bg-white dark:bg-[#131415]"
                                                />
                                            ) : (
                                                <div className="w-full p-2 text-[13px] border border-gray-200 dark:border-[#444746] rounded-lg bg-gray-50 dark:bg-[#1a1a1c] text-gray-400">
                                                    Sem data de saída registada
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>

                        </div>
                        );
                    })()
                    )}

                    {/* 03 — Recurso BIM — hidden, fields merged into id */}
                    {false && (
                        <div className="bg-gray-50 dark:bg-[#131314] border border-gray-100 dark:border-[#444746] rounded-xl overflow-hidden mb-6">
                            <div className="bg-gray-100 dark:bg-[#1e1e20] px-4 py-3 border-b border-gray-200 dark:border-[#444746] flex items-center justify-between">
                                <h3 className="text-md font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                    {tWorkers('tabs.bim')}
                                </h3>
                                <div className="flex gap-2">
                                </div>
                            </div>
                            <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div className="hidden">
                                    <FieldControl {...getFieldProps('profession', 'Profissão / Especialidade')}>
                                        <input type="text" value={currentWorker.profession || ''} onChange={e => setCurrentWorker({ ...currentWorker, profession: e.target.value })} className="w-full p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-colors bg-white dark:bg-[#131415] disabled:bg-gray-100 disabled:text-gray-500" placeholder="Ex: Trolha, Carpinteiro" />
                                    </FieldControl>
                                    <FieldControl {...getFieldProps('role', 'Papel / Função ★')}>
                                        <input type="text" value={currentWorker.role || ''} onChange={e => setCurrentWorker({ ...currentWorker, role: e.target.value })} required className="w-full p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-colors bg-white dark:bg-[#131415] disabled:bg-gray-100 disabled:text-gray-500" placeholder="Ex: Subempreiteiro, Fiscal" />
                                    </FieldControl>
                                    <FieldControl {...getFieldProps('category', 'Categoria Profissional')}>
                                        <select value={currentWorker.category || ''} onChange={e => setCurrentWorker({ ...currentWorker, category: e.target.value })} className="w-full p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-colors bg-white dark:bg-[#131415] disabled:bg-gray-100 disabled:text-gray-500">
                                            <option value="">Selecione...</option>
                                            <option value="especializado">Oficial Especializado</option>
                                            <option value="ajudante">Ajudante</option>
                                            <option value="encarregado">Encarregado</option>
                                            <option value="tecnico">Técnico Superior</option>
                                        </select>
                                    </FieldControl>

                                    <FieldControl {...getFieldProps('wbs', 'Tarefas Associadas (WBS)')}>
                                        <input type="text" value={currentWorker.wbs || ''} onChange={e => setCurrentWorker({ ...currentWorker, wbs: e.target.value })} className="w-full p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-colors bg-white dark:bg-[#131415] disabled:bg-gray-100 disabled:text-gray-500" placeholder="Ex: WBS 1.2" />
                                    </FieldControl>

                                    <div className="lg:col-span-2">
                                        <FieldControl {...getFieldProps('ifcGuid', 'GUID IFC GlobalId')}>
                                            <input type="text" value={currentWorker.ifcGuid || ''} onChange={e => setCurrentWorker({ ...currentWorker, ifcGuid: e.target.value })} className="w-full p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-colors bg-white dark:bg-[#131415] disabled:bg-gray-100 disabled:text-gray-500 font-mono text-sm" placeholder="Auto-gerado se vazio" />
                                        </FieldControl>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 04 — Segurança e Saúde */}
                    {(mode === 'create' || activeTab === 'safety') && (
                    (() => {
                        // FAT validity auto-calculation (Decreto-Lei n.º 102/2009, Art.º 108º)
                        // General: 2 years. Occasional/temporary: 1 year. Over 50/risk posts: 1 year.
                        const calcFatValidity = (examDate: string | undefined): { expiry: string; label: string; status: 'ok' | 'warning' | 'expired' } | null => {
                            if (!examDate) return null;
                            const d = new Date(examDate);
                            const months = (currentWorker.category === 'tecnico' || currentWorker.medicalFitness?.toLowerCase().includes('risco')) ? 12 : 24;
                            const exp = new Date(d);
                            exp.setMonth(exp.getMonth() + months);
                            const now = new Date();
                            const msLeft = exp.getTime() - now.getTime();
                            const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
                            return {
                                expiry: exp.toLocaleDateString('pt-PT'),
                                label: months === 12 ? `1 ano (posto de risco)` : `2 anos`,
                                status: daysLeft < 0 ? 'expired' : daysLeft <= 30 ? 'warning' : 'ok',
                            };
                        };
                        const fatValidity = calcFatValidity(currentWorker.medicalExpiry);

                        const HIGH_RISK_TASKS = [
                            { id: 'trabalhos_altura', label: 'Trabalhos em Altura' },
                            { id: 'espacos_confinados', label: 'Espaços Confinados' },
                            { id: 'levantamento_cargas', label: 'Movimentação / Levantamento de Cargas' },
                            { id: 'trabalhos_eletricos', label: 'Trabalhos Elétricos' },
                            { id: 'trabalhos_soldadura', label: 'Soldadura / Corte Térmico' },
                            { id: 'trabalhos_explosivos', label: 'Trabalhos com Explosivos' },
                            { id: 'conducao_equipamentos', label: 'Condução de Equipamentos / Máquinas' },
                            { id: 'mergulho', label: 'Mergulho Profissional / Trabalho Subaquático' },
                            { id: 'amianto', label: 'Manuseamento de Amianto' },
                            { id: 'substancias_perigosas', label: 'Exposição a Substâncias Perigosas' },
                        ];
                        const restrictions: string[] = (currentWorker as any).workRestrictions || [];
                        const toggleRestriction = (id: string) => {
                            const updated = restrictions.includes(id)
                                ? restrictions.filter((r: string) => r !== id)
                                : [...restrictions, id];
                            setCurrentWorker({ ...currentWorker, ['workRestrictions' as any]: updated } as any);
                        };

                        return (
                        <div className="flex flex-col gap-6 mb-6">

                            {/* ── 1. Entrega de EPIs ──────────────────── */}
                            <div className="bg-gray-50 dark:bg-[#131314] border border-gray-100 dark:border-[#444746] rounded-xl overflow-hidden">
                                <div className="bg-gray-100 dark:bg-[#1e1e20] px-4 py-3 border-b border-gray-200 dark:border-[#444746]">
                                    <h3 className="text-md font-bold text-gray-800 dark:text-gray-100">Entrega de EPI</h3>
                                </div>
                                <div className="p-5 flex flex-col gap-5">
                                    {/* EPI chips */}
                                    <div>
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">EPIs entregues</p>
                                        <div className="flex flex-wrap gap-2">
                                            {(['Capacete', 'Colete Refletor', 'Luvas', 'Botins de Proteção', 'Óculos de Proteção', 'Arnês', 'Máscara FFP2', 'Proteção Auditiva', 'Calçado de Segurança'] as string[]).map(epi => {
                                                const selected = currentWorker.epiDeliveryList?.includes(epi);
                                                return (
                                                    <button
                                                        key={epi}
                                                        type="button"
                                                        disabled={!isEditing}
                                                        onClick={() => {
                                                            const current = currentWorker.epiDeliveryList || [];
                                                            const updated = selected ? current.filter(e => e !== epi) : [...current, epi];
                                                            setCurrentWorker({ ...currentWorker, epiDeliveryList: updated });
                                                        }}
                                                        className={cn('px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors', selected ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-surface text-gray-600 dark:text-gray-300 border-gray-200 dark:border-[#444746]', isEditing ? 'cursor-pointer hover:border-primary/50' : 'cursor-default opacity-75')}
                                                    >
                                                        {epi}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Date + upload */}
                                    {isVisible('epi') && (
                                        <DocumentRow entityId={currentWorker.id!} projectId={projectId} category="epi_doc" isUploadVisible={isUploadVisible('epi')} {...getFieldProps('epiDate', 'Registo de Entrega de EPI')} onToggleValidation={getFieldProps('epiDate', '').onValidate} isManager={isManager} isDataUser={isDataUser} isApprovalUser={isApprovalUser} approvalStatus={currentWorker.approvalStatus}>
                                            <div className="mt-2 text-xs font-semibold text-gray-500 uppercase mb-1">Data de Entrega</div>
                                            <input title="Data de entrega de EPI" type="date" value={currentWorker.epiDate || ''} onChange={e => setCurrentWorker(prev => ({ ...prev, epiDate: e.target.value }))} className="w-full p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-colors bg-white dark:bg-[#131415] disabled:bg-gray-100 disabled:text-gray-500" />
                                        </DocumentRow>
                                    )}
                                </div>
                            </div>

                            {/* ── 2. Ficha de Aptidão para o Trabalho ─── */}
                            <div className="bg-gray-50 dark:bg-[#131314] border border-gray-100 dark:border-[#444746] rounded-xl overflow-hidden">
                                <div className="bg-gray-100 dark:bg-[#1e1e20] px-4 py-3 border-b border-gray-200 dark:border-[#444746]">
                                    <h3 className="text-md font-bold text-gray-800 dark:text-gray-100">Ficha de Aptidão para o Trabalho (FAT)</h3>
                                </div>
                                <div className="p-5 flex flex-col gap-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        {/* Data do exame médico */}
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Data do Exame Médico</label>
                                            <input
                                                type="date"
                                                title="Data do exame médico"
                                                value={currentWorker.medicalExpiry || ''}
                                                onChange={e => setCurrentWorker(prev => ({ ...prev, medicalExpiry: e.target.value }))}
                                                disabled={!isEditing}
                                                className="w-full p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-colors bg-white dark:bg-[#131415] disabled:bg-gray-50 disabled:dark:bg-[#1a1a1c] disabled:text-gray-500 disabled:cursor-not-allowed"
                                            />
                                        </div>

                                        {/* Validade calculada automaticamente */}
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                                Validade (calculada automaticamente)
                                            </label>
                                            {fatValidity ? (
                                                <div className={cn(
                                                    'w-full p-2 text-[13px] border rounded-lg flex items-center justify-between',
                                                    fatValidity.status === 'ok' ? 'border-green-200 bg-green-50 dark:bg-green-900/10 text-green-700' :
                                                    fatValidity.status === 'warning' ? 'border-amber-200 bg-amber-50 dark:bg-amber-900/10 text-amber-700' :
                                                    'border-red-200 bg-red-50 dark:bg-red-900/10 text-red-700'
                                                )}>
                                                    <span className="font-semibold">{fatValidity.expiry}</span>
                                                    <span className="text-[11px] opacity-70">{fatValidity.label} · {fatValidity.status === 'expired' ? 'Expirado' : fatValidity.status === 'warning' ? 'A expirar' : 'Válido'}</span>
                                                </div>
                                            ) : (
                                                <div className="w-full p-2 text-[13px] border border-gray-200 dark:border-[#444746] rounded-lg bg-gray-50 dark:bg-[#1a1a1c] text-gray-400">
                                                    — Inserir data do exame para calcular
                                                </div>
                                            )}
                                            <p className="text-[11px] text-gray-400 mt-1">Calculada ao abrigo do DL 102/2009, Art.º 108.º — 2 anos (geral) ou 1 ano (posto de risco / &gt;50 anos)</p>
                                        </div>
                                    </div>

                                    {/* Resultado da aptidão médica */}
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Resultado Médico</label>
                                        <select
                                            title="Resultado do exame médico"
                                            value={currentWorker.medicalFitness || ''}
                                            onChange={e => setCurrentWorker({ ...currentWorker, medicalFitness: e.target.value })}
                                            disabled={!isEditing}
                                            className="w-full p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-colors bg-white dark:bg-[#131415] disabled:bg-gray-50 disabled:dark:bg-[#1a1a1c] disabled:text-gray-500 disabled:cursor-not-allowed"
                                        >
                                            <option value="">— Selecionar resultado —</option>
                                            <option value="apto">Apto</option>
                                            <option value="apto_condicionalmente">Apto condicionalmente</option>
                                            <option value="outro">Outro</option>
                                        </select>
                                    </div>

                                    {/* Observações médicas */}
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Observações / Condicionantes</label>
                                        <textarea
                                            title="Observações médicas"
                                            placeholder="Ex: Apto para trabalhos gerais. Restrições: trabalhos em altura."
                                            value={currentWorker.medicalObservations || ''}
                                            onChange={e => setCurrentWorker({ ...currentWorker, medicalObservations: e.target.value })}
                                            disabled={!isEditing}
                                            rows={3}
                                            className="w-full p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-colors bg-white dark:bg-[#131415] disabled:bg-gray-50 disabled:dark:bg-[#1a1a1c] disabled:text-gray-500 disabled:cursor-not-allowed resize-none"
                                        />
                                    </div>

                                    {/* Upload FAT */}
                                    {isVisible('medical_fitness') && (
                                        <DocumentRow entityId={currentWorker.id!} projectId={projectId} category="medical_exam" isUploadVisible={isUploadVisible('medical_exam')} {...getFieldProps('medicalExpiry', 'Documento FAT')} onToggleValidation={getFieldProps('medicalExpiry', '').onValidate} isManager={isManager} isDataUser={isDataUser} isApprovalUser={isApprovalUser} approvalStatus={currentWorker.approvalStatus}>
                                            <></>
                                        </DocumentRow>
                                    )}
                                </div>
                            </div>

                            {/* ── 3. Aptidão para Trabalhos de Risco ──── */}
                            <div className="bg-gray-50 dark:bg-[#131314] border border-gray-100 dark:border-[#444746] rounded-xl overflow-hidden">
                                <div className="bg-gray-100 dark:bg-[#1e1e20] px-4 py-3 border-b border-gray-200 dark:border-[#444746]">
                                    <h3 className="text-md font-bold text-gray-800 dark:text-gray-100">Aptidão para Trabalhos de Risco Específico</h3>
                                </div>
                                <div className="p-5">
                                    <p className="text-[12px] text-gray-500 dark:text-gray-400 mb-3">Selecionar os trabalhos para os quais este trabalhador foi avaliado e está <strong>apto</strong>. Trabalhos não marcados implicam restrição.</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {HIGH_RISK_TASKS.map(task => {
                                            const isApt = !restrictions.includes(task.id);
                                            return (
                                                <button
                                                    key={task.id}
                                                    type="button"
                                                    disabled={!isEditing}
                                                    onClick={() => toggleRestriction(task.id)}
                                                    className={cn(
                                                        'flex items-center justify-between p-3 rounded-lg border text-left transition-colors',
                                                        isApt
                                                            ? 'bg-white dark:bg-surface border-gray-200 dark:border-[#444746] text-gray-700 dark:text-gray-200'
                                                            : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400',
                                                        isEditing ? 'cursor-pointer hover:shadow-sm' : 'cursor-default'
                                                    )}
                                                >
                                                    <span className="text-[13px] font-medium">{task.label}</span>
                                                    <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', isApt ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                                                        {isApt ? 'Apto' : 'Restrito'}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                        </div>
                        );
                    })()
                    )}

                    {/* qualifications tab */}
                    {(mode === 'create' || activeTab === 'qualifications') && (
                    (() => {
                        const projectTrainings = trainings.filter(t => t.projectId === projectId);
                        const projectCourses = courses.filter(c => c.projectId === projectId);
                        const workerRecords = workerTrainingRecords.filter(r => r.workerId === currentWorker.id);

                        const handleRequestTraining = (trainingType: import('@/types').Training['type'], name: string) => {
                             if (!currentWorker.id) return;
                             const newRecord: import('@/types').WorkerTrainingRecord = {
                                 id: crypto.randomUUID(),
                                 workerId: currentWorker.id,
                                 projectId: projectId,
                                 trainingType,
                                 courseTitle: name,
                                 completedAt: new Date().toISOString(),
                                 passed: false,
                                 source: 'external',
                                 status: 'requested',
                                 createdAt: new Date().toISOString()
                             };
                             addWorkerTrainingRecord(newRecord);
                        };

                        const handleSaveTraining = (recordId: string, validUntil: string) => {
                             const oldRec = workerRecords.find(r => r.id === recordId);
                             if (oldRec) {
                                 deleteWorkerTrainingRecord(recordId);
                                 addWorkerTrainingRecord({
                                     ...oldRec,
                                     validUntil,
                                     passed: true,
                                     documentUrl: 'uploaded-doc-url',
                                     status: 'completed'
                                 });
                             }
                        };
                        
                        return (
                        <div className="flex flex-col gap-6 mb-6">

                            {/* ── Formações (Empresa/Externas) ──────────────────── */}
                            <div className="bg-gray-50 dark:bg-[#131314] border border-gray-100 dark:border-[#444746] rounded-xl overflow-hidden">
                                <div className="bg-gray-100 dark:bg-[#1e1e20] px-4 py-3 border-b border-gray-200 dark:border-[#444746] flex items-center justify-between">
                                    <h3 className="text-md font-bold text-gray-800 dark:text-gray-100">Qualificações da Empresa</h3>
                                </div>
                                <div className="p-4 flex flex-col gap-3">
                                    {projectTrainings.length === 0 && (
                                        <p className="text-sm text-gray-500">Nenhuma qualificação configurada neste projeto.</p>
                                    )}
                                    {projectTrainings.map(training => {
                                        const record = workerRecords.find(r => r.trainingType === training.type && r.source === 'external');
                                        const isCompleted = record?.status === 'completed';
                                        const isRequested = record?.status === 'requested';

                                        return (
                                            <div key={training.id} className={cn(
                                                'rounded-lg border p-3 transition-colors',
                                                isCompleted ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' : 'bg-white dark:bg-surface border-gray-200 dark:border-[#444746]'
                                            )}>
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex flex-col gap-1 items-start">
                                                        <div className={`p-1.5 rounded-full ${isCompleted ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                                                            <GraduationCap size={16} />
                                                        </div>
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className={cn('text-sm font-semibold', isCompleted ? 'text-green-800 dark:text-green-300' : 'text-gray-700 dark:text-gray-200')}>{training.name}</p>
                                                        <p className="text-xs text-gray-400 mt-0.5">{training.provider}</p>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                                        {isCompleted && <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded border border-green-200">CONCLUÍDO</span>}
                                                        {isRequested && <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200">PEDIDO ENVIADO</span>}
                                                    </div>
                                                </div>

                                                {!record && (isManager || isApprovalUser) && (
                                                    <div className="mt-3 pl-9">
                                                        <button 
                                                            onClick={() => handleRequestTraining(training.type, training.name)}
                                                            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 shadow-sm"
                                                        >
                                                            Solicitar ao Data User
                                                        </button>
                                                    </div>
                                                )}

                                                {isRequested && (isDataUser || isManager) && (
                                                    <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200 flex flex-col gap-3 ml-9">
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <label className="text-xs font-medium text-gray-500 mb-1 block">Validade</label>
                                                                <input id={`validity-${training.id}`} type="date" className="w-full text-xs p-2 border rounded" />
                                                            </div>
                                                            <div>
                                                                <label className="text-xs font-medium text-gray-500 mb-1 block">Documento</label>
                                                                <input type="file" className="w-full text-xs p-1" />
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                 const val = (document.getElementById(`validity-${training.id}`) as HTMLInputElement)?.value;
                                                                 if(val) handleSaveTraining(record.id, val);
                                                            }}
                                                            className="w-full py-2 bg-primary text-white text-xs font-bold rounded-lg mt-1"
                                                        >
                                                            Confirmar e Guardar Registo
                                                        </button>
                                                    </div>
                                                )}

                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* ── Formações do Projeto ─────────────── */}
                            <div className="bg-gray-50 dark:bg-[#131314] border border-gray-100 dark:border-[#444746] rounded-xl overflow-hidden">
                                <div className="bg-gray-100 dark:bg-[#1e1e20] px-4 py-3 border-b border-gray-200 dark:border-[#444746]">
                                    <h3 className="text-md font-bold text-gray-800 dark:text-gray-100">Formações do Projeto</h3>
                                </div>
                                <div className="p-4">
                                    {projectCourses.length === 0 && (
                                        <p className="text-sm text-gray-500">Nenhuma formação interna configurada no projeto.</p>
                                    )}
                                    <div className="grid grid-cols-1 gap-2">
                                        {projectCourses.map(course => {
                                            const record = workerRecords.find(r => r.courseId === course.id);
                                            const hasTraining = !!record && record.passed;
                                            return (
                                                <div key={course.id} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${hasTraining ? 'bg-primary-light/50 border-primary/20 shadow-sm' : 'bg-white dark:bg-surface border-gray-200 dark:border-[#444746]'}`}>
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-1.5 rounded-full ${hasTraining ? 'bg-primary-light text-primary' : 'bg-gray-100 text-gray-400'}`}><GraduationCap size={16} /></div>
                                                        <div className="flex flex-col gap-0.5">
                                                            <p className={`text-sm font-medium ${hasTraining ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500'}`}>{course.title}</p>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                {course.isMandatoryAll && <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded uppercase tracking-wider">Obrigatório</span>}
                                                                <a href={`/pt/project/${projectId}/training?tab=sessions`} target="_blank" rel="noreferrer" className="text-[10px] text-primary hover:underline flex items-center gap-1">
                                                                    Ver Turmas <ArrowLeft size={10} className="rotate-135" />
                                                                </a>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {hasTraining && <CheckCircle size={20} className="text-primary" />}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                        );
                    })()
                    )}


                    {/* 05 — Controlo de Acesso ao Estaleiro */}
                    {(mode === 'create' || activeTab === 'process') && (
                    (() => {
                        const projectZones = accessPoints.filter(
                            p => p.projectId === projectId && (p.category === 'site' || p.category === 'zone')
                        );

                        const completedIds = new Set([
                            ...(currentWorker.completedTrainingIds || []),
                            ...Object.entries(currentWorker.mandatoryTrainings || {})
                                .filter(([, v]) => v.completed)
                                .map(([k]) => k),
                        ]);

                        const getZoneStatus = (zone: typeof projectZones[0]): 'ok' | 'warning' => {
                            const required = zone.requiredTrainingIds || [];
                            const missing = required.filter(tid => !completedIds.has(tid));
                            return missing.length === 0 ? 'ok' : 'warning';
                        };

                        const getMissingNames = (zone: typeof projectZones[0]) =>
                            (zone.requiredTrainingIds || [])
                                .filter(tid => !completedIds.has(tid))
                                .map(tid => trainings.find(t => t.id === tid)?.name || tid);

                        // authorizedZoneIds: empty/undefined = "Todo o Estaleiro"
                        const zoneIds = currentWorker.authorizedZoneIds || [];
                        const isAllSite = zoneIds.length === 0;

                        // Any conditioned zone forces individual zone selection
                        const hasConditioned = projectZones.some(z => getZoneStatus(z) === 'warning');

                        const toggleZone = (zoneId: string) => {
                            if (!isEditing) return;
                            const current = currentWorker.authorizedZoneIds || [];
                            const next = current.includes(zoneId)
                                ? current.filter(id => id !== zoneId)
                                : [...current, zoneId];
                            setCurrentWorker({ ...currentWorker, authorizedZoneIds: next });
                        };

                        const setAllSite = () => {
                            if (!isEditing || hasConditioned) return;
                            setCurrentWorker({ ...currentWorker, authorizedZoneIds: [] });
                        };

                        // Card block — only manager or editor (not data_user)
                        const canBlockCard = (isManager || canEdit) && !isDataUser && mode !== 'create';

                        const toggleBlock = () => {
                            if (!canBlockCard) return;
                            const newVal = !currentWorker.isAccessCardBlocked;
                            // Update local state immediately for visual feedback
                            setCurrentWorker({ ...currentWorker, isAccessCardBlocked: newVal });
                            // Also persist to store if worker already exists
                            if (currentWorker.id) blockAccessCard(currentWorker.id, newVal);
                        };

                        return (
                        <div className="flex flex-col gap-6 mb-6">

                            {/* ── Zonas de Acesso ───────────────────────── */}
                            <div className="bg-gray-50 dark:bg-[#131314] border border-gray-100 dark:border-[#444746] rounded-xl overflow-hidden">
                                <div className="bg-gray-100 dark:bg-[#1e1e20] px-4 py-3 border-b border-gray-200 dark:border-[#444746] flex items-center justify-between">
                                    <h3 className="text-md font-bold text-gray-800 dark:text-gray-100">Zonas de Acesso Autorizadas</h3>
                                    {hasConditioned && (
                                        <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                                            Acesso total indisponível — formações em falta
                                        </span>
                                    )}
                                </div>
                                <div className="p-4 flex flex-col gap-3">
                                    {/* All access option */}
                                    <button
                                        type="button"
                                        disabled={!isEditing || hasConditioned}
                                        onClick={setAllSite}
                                        title={hasConditioned ? 'Não disponível enquanto houver formações em falta' : undefined}
                                        className={cn(
                                            'flex items-center justify-between p-3 rounded-lg border text-left transition-colors',
                                            isAllSite && !hasConditioned
                                                ? 'bg-primary/5 border-primary/30 ring-1 ring-primary/20'
                                                : hasConditioned
                                                    ? 'bg-gray-100 dark:bg-surface border-gray-200 dark:border-[#444746] opacity-50'
                                                    : 'bg-white dark:bg-surface border-gray-200 dark:border-[#444746]',
                                            isEditing && !hasConditioned ? 'cursor-pointer hover:shadow-sm' : 'cursor-default'
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={cn('w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
                                                isAllSite && !hasConditioned ? 'border-primary bg-primary' : 'border-gray-300'
                                            )}>
                                                {isAllSite && !hasConditioned && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                            </div>
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Todo o Estaleiro (Sem restrição de zona)</span>
                                        </div>
                                        {isAllSite && !hasConditioned && (
                                            <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Ativo</span>
                                        )}
                                    </button>

                                    {/* Per-zone toggles */}
                                    {projectZones.length === 0 && (
                                        <p className="text-xs text-gray-400 pl-2">Nenhuma zona configurada na página <strong>Controlo de Acessos</strong>.</p>
                                    )}
                                    {projectZones.map(zone => {
                                        const status = getZoneStatus(zone);
                                        const missing = getMissingNames(zone);
                                        const isAuthorized = zoneIds.includes(zone.id);
                                        return (
                                            <div
                                                key={zone.id}
                                                className={cn(
                                                    'flex items-start justify-between p-3 rounded-lg border transition-colors',
                                                    isAuthorized
                                                        ? 'bg-primary/5 border-primary/30'
                                                        : status === 'warning'
                                                            ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'
                                                            : 'bg-white dark:bg-surface border-gray-200 dark:border-[#444746]'
                                                )}
                                            >
                                                <div className="flex items-start gap-3 flex-1">
                                                    <div className="flex-1">
                                                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{zone.name}</p>
                                                        {missing.length > 0 && (
                                                            <p className="text-xs mt-0.5 text-amber-600">
                                                                🟡 Formação em falta: {missing.join(', ')}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 ml-2 shrink-0">
                                                    <span className={cn(
                                                        'text-[10px] font-bold px-2 py-0.5 rounded-full',
                                                        status === 'ok' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                                    )}>
                                                        {status === 'ok' ? 'OK' : 'Condicionado'}
                                                    </span>
                                                    {/* Toggle: Autorizado / Não Autorizado */}
                                                    {isEditing && (
                                                        <button
                                                            type="button"
                                                            title={isAuthorized ? 'Remover acesso a esta zona' : 'Autorizar acesso a esta zona'}
                                                            onClick={() => toggleZone(zone.id)}
                                                            className={cn(
                                                                'relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0',
                                                                isAuthorized ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                                                            )}
                                                        >
                                                            <span className={cn(
                                                                'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform',
                                                                isAuthorized ? 'translate-x-4' : 'translate-x-0.5'
                                                            )} />
                                                        </button>
                                                    )}
                                                    {!isEditing && (
                                                        <span className={cn(
                                                            'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                                                            isAuthorized
                                                                ? 'bg-green-50 text-green-700 border-green-200'
                                                                : 'bg-red-50 text-red-600 border-red-200'
                                                        )}>
                                                            {isAuthorized ? 'Autorizado' : 'Não Autorizado'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* ── Observações ───────────────────────────── */}
                            <div className="bg-gray-50 dark:bg-[#131314] border border-gray-100 dark:border-[#444746] rounded-xl overflow-hidden">
                                <div className="bg-gray-100 dark:bg-[#1e1e20] px-4 py-3 border-b border-gray-200 dark:border-[#444746]">
                                    <h3 className="text-md font-bold text-gray-800 dark:text-gray-100">Observações de Acesso</h3>
                                </div>
                                <div className="p-4">
                                    <textarea
                                        title="Observações de acesso"
                                        value={currentWorker.observations || ''}
                                        onChange={e => setCurrentWorker({ ...currentWorker, observations: e.target.value })}
                                        disabled={!isEditing}
                                        rows={3}
                                        placeholder="Restrições locais, notas de acesso, turnos autorizados…"
                                        className="w-full p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-colors bg-white dark:bg-[#131415] disabled:bg-gray-50 disabled:dark:bg-[#1a1a1c] disabled:text-gray-500 disabled:cursor-not-allowed resize-none"
                                    />
                                </div>
                            </div>

                            {/* ── Bloqueio do Cartão ────────────────────── */}
                            <div className={cn(
                                'rounded-xl border-2 p-4 flex items-center justify-between transition-all duration-300',
                                currentWorker.isAccessCardBlocked
                                    ? 'bg-red-50 dark:bg-red-900/10 border-red-400'
                                    : 'bg-gray-50 dark:bg-[#131314] border-gray-200 dark:border-[#444746]'
                            )}>
                                <div className="flex items-center gap-3">
                                    <div className={cn('p-2 rounded-full transition-colors', currentWorker.isAccessCardBlocked ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400')}>
                                        <QrCode size={20} />
                                    </div>
                                    <div>
                                        <p className={cn('text-sm font-bold transition-colors', currentWorker.isAccessCardBlocked ? 'text-red-700' : 'text-gray-700 dark:text-gray-200')}>
                                            {currentWorker.isAccessCardBlocked ? '🔴 Cartão Bloqueado' : '🟢 Cartão Ativo'}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {currentWorker.isAccessCardBlocked
                                                ? 'O trabalhador está impedido de aceder ao estaleiro.'
                                                : 'Acesso permitido nas catracas e leitores QR.'}
                                        </p>
                                    </div>
                                </div>
                                {canBlockCard ? (
                                    <button
                                        type="button"
                                        onClick={toggleBlock}
                                        className={cn(
                                            'px-4 py-2 rounded-lg text-sm font-bold border transition-all shrink-0',
                                            currentWorker.isAccessCardBlocked
                                                ? 'bg-white text-green-700 border-green-300 hover:bg-green-50'
                                                : 'bg-red-600 text-white border-red-700 hover:bg-red-700'
                                        )}
                                    >
                                        {currentWorker.isAccessCardBlocked ? 'DESBLOQUEAR CARTÃO' : 'BLOQUEAR CARTÃO'}
                                    </button>
                                ) : (
                                    !isDataUser && mode !== 'create' && (
                                        <span className="text-xs text-gray-400 italic">Apenas o gestor pode bloquear.</span>
                                    )
                                )}
                            </div>

                        </div>
                        );
                    })()
                    )}


{mode === 'edit' && currentWorker.id && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <EntityTicketThread
                                ticket={{} as any} // Temporary placeholder since we don't have individual tickets passed here in the same way, we need to map tickets
                                messages={[]}
                                isManager={isManager}
                                isDataUser={isDataUser}
                                onResolve={(id: string) => {
                                    setConfirmationType('submit');
                                    setIsSubmitConfirmationOpen(true);
                                }}
                                onArchive={(id: string) => { }}
                                onAddMessage={(id: string, msg: string) => {
                                    addTicketMessage(id, msg, currentUser?.id || 'system');
                                }}
                                projectId={projectId}
                                users={[]}
                                workflowStatus={currentWorker.workflowStatus}
                                getUserRoleInProject={getUserRoleInProject}
                                pendingTicketActions={pendingTicketActions}
                                onSetTicketAction={(ticketId: string, action: 'forward' | 'resolve' | 'request_revision' | 'open') => {
                                    const newMap = new Map(pendingTicketActions);
                                    if (newMap.get(ticketId) === action) {
                                        newMap.delete(ticketId);
                                    } else {
                                        newMap.set(ticketId, action);
                                    }
                                    setPendingTicketActions(newMap);
                                }}
                                isEditing={mode === 'edit'}
                                isApprovalUser={isApprovalUser}
                                entityDataUser={undefined}
                            />
                        </div>
                    )}

                </form>
            </Modal>

            <Drawer
                isOpen={!!selectedWorkerId}
                onClose={() => {
                    setSelectedWorkerId(null);
                    setCurrentWorker({});
                }}
                title={
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-[#4285F4] flex items-center justify-center font-bold text-xs shrink-0 border border-blue-500/20 shadow-2xs">
                            {currentWorker.name ? currentWorker.name.slice(0, 2).toUpperCase() : 'TR'}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2.5">
                                <h2 className="text-base font-bold text-[var(--text)] tracking-tight truncate">
                                    {currentWorker.name}
                                </h2>
                                {(() => {
                                    const validation = getValidationStatus(currentWorker as Worker);
                                    return (
                                        <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border shadow-2xs shrink-0', validation.color)}>
                                            {validation.status === 'valid' && <CheckCircle size={12} />}
                                            {validation.status === 'expired' && <AlertTriangle size={12} />}
                                            {validation.status === 'pending' && <Clock size={12} />}
                                            {validation.status === 'incomplete' && <Clock size={12} />}
                                            {validation.status === 'archived' && <FileText size={12} />}
                                            {validation.label}
                                        </span>
                                    );
                                })()}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mt-0.5 truncate">
                                <span className="flex items-center gap-1 truncate">
                                    <Building2 size={13} className="shrink-0 text-[var(--text-muted)]" />
                                    {companies.find(c => c.id === currentWorker.companyId)?.name || 'Sem Empresa'}
                                </span>
                                {currentWorker.role && (
                                    <>
                                        <span className="w-1 h-1 rounded-full bg-[var(--border)] shrink-0"></span>
                                        <span className="truncate">{currentWorker.role}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                }
                headerContent={
                    <div className="flex gap-1 border-b border-[var(--border)] mt-2 overflow-x-auto">
                        {[
                            { id: 'id', label: tWorkers('tabs.id') },
                            { id: 'pro', label: tWorkers('tabs.pro') },
                            { id: 'safety', label: tWorkers('tabs.safety') },
                            { id: 'qualifications', label: 'Qualificações' },
                            { id: 'process', label: tWorkers('tabs.process') },
                            { id: 'docs', label: tWorkers('tabs.docs') },
                            { id: 'history', label: tWorkers('tabs.history') },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setDrawerTab(tab.id as any)}
                                className={cn(
                                    "flex items-center gap-2 py-2.5 px-3.5 border-b-2 transition-colors text-xs font-medium whitespace-nowrap shrink-0",
                                    drawerTab === tab.id
                                        ? "border-[#4285F4] text-[#4285F4] font-semibold"
                                        : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
                                )}
                            >
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                }
                actions={
                    <div className="flex items-center gap-3">
                        {/* Project Team Stack - Google Style adapted from Organization Header */}
                        {(() => {
                            let dataUserId = currentWorker.assignedDataUserId;
                            if (!dataUserId && currentWorker.companyId) {
                                const company = companies.find(c => c.id === currentWorker.companyId);
                                dataUserId = company?.assignedDataUserId;
                            }
                            const dataUser = users?.find(u => u.id === dataUserId);
                            const projectManagers = (users || []).filter(u =>
                                u.projectAccess?.some(pa => pa.projectId === projectId && pa.role === 'manager')
                            );
                            const approvalUsers = (users || []).filter(u =>
                                u.projectAccess?.some(pa => pa.projectId === projectId && pa.role === 'approval_user')
                            );

                            return (
                                <div className="hidden md:flex items-center gap-3">
                                    {/* 1. Data User */}
                                    <div className="flex flex-col items-start gap-0.5">
                                        <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">
                                            Data User
                                        </span>
                                        {dataUser ? (
                                            <div
                                                className="w-6 h-6 rounded-full bg-orange-100 border-2 border-[var(--bg-card)] flex items-center justify-center text-[10px] font-medium text-orange-700 relative z-30 ring-1 ring-white dark:ring-[#1E293B]"
                                                title={`Data User: ${dataUser.name}`}
                                            >
                                                {dataUser.name.charAt(0)}
                                            </div>
                                        ) : (
                                            <div
                                                className="w-6 h-6 rounded-full bg-gray-100 dark:bg-surface border-2 border-[var(--bg-card)] flex items-center justify-center text-[9px] text-gray-400 relative z-30 ring-1 ring-white dark:ring-[#1E293B]"
                                                title="Sem Data User"
                                            >
                                                <User size={12} />
                                            </div>
                                        )}
                                    </div>

                                    <div className="h-6 w-px bg-gray-200 dark:bg-[#334155]" />

                                    {/* 2. Managers */}
                                    <div className="flex flex-col items-start gap-0.5">
                                        <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">
                                            Managers
                                        </span>
                                        <div className="flex items-center -space-x-1.5">
                                            {projectManagers.slice(0, 3).map((mgr) => (
                                                <div
                                                    key={mgr.id}
                                                    className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 border-2 border-[var(--bg-card)] flex items-center justify-center text-[10px] font-medium text-[#1A73E8] dark:text-blue-300 relative z-20 ring-1 ring-white dark:ring-[#1E293B]"
                                                    title={`Manager: ${mgr.name}`}
                                                >
                                                    {mgr.name.charAt(0)}
                                                </div>
                                            ))}
                                            {projectManagers.length > 3 && (
                                                <div className="w-6 h-6 rounded-full bg-gray-50 dark:bg-[#131314] border-2 border-[var(--bg-card)] flex items-center justify-center text-[9px] font-medium text-gray-500 relative z-10 ring-1 ring-white dark:ring-[#1E293B]">
                                                    +{projectManagers.length - 3}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* 3. Approvers (If Enabled) */}
                                    {currentProject?.approvalWorkflow?.workers && approvalUsers.length > 0 && (
                                        <>
                                            <div className="h-6 w-px bg-gray-200 dark:bg-[#334155]" />
                                            <div className="flex flex-col items-start gap-0.5">
                                                <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">
                                                    Approvers
                                                </span>
                                                <div className="flex items-center -space-x-1.5">
                                                    {approvalUsers.slice(0, 3).map((usr) => (
                                                        <div
                                                            key={usr.id}
                                                            className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/40 border-2 border-[var(--bg-card)] flex items-center justify-center text-[10px] font-medium text-purple-700 dark:text-purple-300 relative z-10 ring-1 ring-white dark:ring-[#1E293B]"
                                                            title={`Approver: ${usr.name}`}
                                                        >
                                                            {usr.name.charAt(0)}
                                                        </div>
                                                    ))}
                                                    {approvalUsers.length > 3 && (
                                                        <div className="w-6 h-6 rounded-full bg-gray-50 dark:bg-[#131314] border-2 border-[var(--bg-card)] flex items-center justify-center text-[9px] font-medium text-gray-500 relative z-0 ring-1 ring-white dark:ring-[#1E293B]">
                                                            +{approvalUsers.length - 3}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    <div className="h-6 w-px bg-gray-200 dark:bg-[#334155]" />
                                </div>
                            );
                        })()}

                        {/* Export & Card Buttons */}
                        <button
                            onClick={() => {
                                if (currentWorker.id) setCardWorkerId(currentWorker.id);
                            }}
                            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text)] bg-[var(--bg-input)] hover:bg-[var(--border)] border border-[var(--border)] rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
                            title="Cartão do Trabalhador"
                        >
                            <QrCode size={15} /> <span className="hidden sm:inline">Cartão</span>
                        </button>
                        <button
                            onClick={() => {
                                if (currentProject && currentWorker.id) {
                                    const c = companies.find(c => c.id === currentWorker.companyId);
                                    const ifcData = generateIfcExport(
                                        currentProject,
                                        c ? [c] : [],
                                        [currentWorker as Worker]
                                    );
                                    const blob = new Blob([ifcData], { type: 'application/step' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `trabalhador_${currentWorker.name || 'document'}.ifc`;
                                    a.click();
                                    URL.revokeObjectURL(url);
                                }
                            }}
                            className="p-1.5 text-[var(--text-muted)] hover:text-[#4285F4] bg-[var(--bg-input)] hover:bg-[var(--border)] border border-[var(--border)] rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                            title="Exportar dados para IFC"
                        >
                            <span>IFC</span>
                        </button>

                        <div className="h-5 w-px bg-[var(--border)] mx-0.5" />

                        {drawerActions}
                    </div>
                }
                footerContent={null}
            >
                {/* DRAWER CONTENT — 5 BIM/IFC Tabs */}
                {(() => {
                    const openTab = (tabId: 'id' | 'pro' | 'bim' | 'safety' | 'qualifications' | 'process') => {
                        // Map drawer tab ids to modal tab ids
                        const tabMap: Record<string, 'id' | 'pro' | 'safety' | 'qualifications' | 'process'> = {
                            'id': 'id',
                            'pro': 'pro',
                            'safety': 'safety',
                            'qualifications': 'qualifications',
                            'process': 'process',
                            'bim': 'id', // BIM fields are in the id tab
                        };
                        setActiveTab(tabMap[tabId] || 'id');
                        setMode('edit');
                        setIsEditing(false);
                        setIsModalOpen(true);
                    };

                    // Always use the freshest worker data from the live `workers` list
                    const w = workers.find(wr => wr.id === selectedWorkerId) || currentWorker;
                    const isForeign = !!(w.isForeign || (w.nationalityType && w.nationalityType !== 'portugal'));

                    // Helper: check if there is an active document in a given category for this worker
                    const hasDoc = (category: string) =>
                        documents.some(d => d.entityId === w.id && d.category === category && !d.archived);

                    const FieldRow = ({ label, value, fieldKey, tab, docCategory }: {
                        label: string;
                        value?: string | null;
                        fieldKey?: string;
                        tab: 'id' | 'pro' | 'bim' | 'safety' | 'qualifications' | 'process';
                        docCategory?: string; // if set, shows a file indicator in the value column
                    }) => {
                        const isValidated = fieldKey ? !!w.fieldValidations?.[fieldKey] : false;
                        const filePresent = docCategory ? hasDoc(docCategory) : undefined;

                        return (
                            <tr
                                className={cn(
                                    "transition-colors group",
                                    isEditing ? "hover:bg-gray-50/50 dark:hover:bg-surface/50 cursor-pointer" : ""
                                )}
                                onClick={() => {
                                    if (!isEditing) return;
                                    openTab(tab);
                                }}
                                title={isEditing ? `Editar ${label}` : undefined}
                            >
                                <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                    <div className="flex items-center gap-2">
                                        {label}
                                    </div>
                                </td>
                                <td
                                    className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-[300px] truncate"
                                    title={value || ''}
                                >
                                    {docCategory !== undefined ? (
                                        filePresent
                                            ? <span className="inline-flex items-center gap-1 text-green-700 dark:text-green-400 font-semibold text-xs"><CheckCircle size={13} /> Ficheiro carregado</span>
                                            : <span className="inline-flex items-center gap-1 text-amber-600 text-xs font-semibold"><AlertTriangle size={13} /> Sem ficheiro</span>
                                    ) : value === undefined || value === null || value === '' ? (
                                        <span className="text-gray-400 italic font-normal text-xs">Por preencher...</span>
                                    ) : (
                                        String(value)
                                    )}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    {isValidated ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400">
                                            <Check size={12} strokeWidth={3} /> Validado
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] uppercase font-bold bg-gray-100 dark:bg-[#131314] text-gray-500 dark:text-gray-400">
                                            Pendente
                                        </span>
                                    )}
                                </td>
                            </tr>
                        );
                    };

                    const SectionTitle = ({ title }: { title: string }) => (
                        <tr className="bg-primary/5 dark:bg-primary/10 border-y border-primary/10 dark:border-primary/20">
                            <td colSpan={3} className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-primary dark:text-primary-light">
                                {title}
                            </td>
                        </tr>
                    );

                    const ContentTable = ({ children }: { children: React.ReactNode }) => (
                        <div className="animate-in fade-in duration-300 mb-8 mt-4 space-y-4">
                            <div className="flex gap-6 items-start">
                                <div className="w-full">
                                    <div className="overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-[13px]">
                                                <thead className="bg-gray-50/80 dark:bg-surface/80 border-b border-gray-200 dark:border-[#444746] text-gray-500 uppercase tracking-wider text-[11px] font-bold">
                                                    <tr>
                                                        <th className="px-4 py-3 min-w-[200px]">Campo</th>
                                                        <th className="px-4 py-3 min-w-[200px]">Valor Registado</th>
                                                        <th className="px-4 py-3 w-[150px] text-center">Estado</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 dark:divide-[#444746]">
                                                    {children}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );

                    if (drawerTab === 'id') return (
                        <ContentTable>
                            <SectionTitle title={tWorkers('tabs.id')} />
                            <FieldRow tab="id" label="Nome" value={[w.firstName, w.middleName, w.lastName].filter(Boolean).join(' ') || w.name} fieldKey="firstName" />
                            <FieldRow tab="id" label="NIF" value={w.nif} fieldKey="nif" />
                            <FieldRow tab="id" label="Documento de Identificação" value={w.idCardNumber} fieldKey="idCardNumber" />
                            <FieldRow tab="id" label="N.º Segurança Social" value={w.ssn} fieldKey="ssn" />
                            <FieldRow tab="id" label="Data de Nascimento" value={w.birthDate ? new Date(w.birthDate).toLocaleDateString() : null} fieldKey="birthDate" />
                            <FieldRow tab="id" label="Papel IFC (IfcActorRole)" value={w.ifcActorRole} fieldKey="ifcActorRole" />
                            <FieldRow tab="id" label="Nacionalidade" value={w.nationalityType === 'portugal' ? 'Portugal' : w.nationalityType === 'eu_etc' ? 'U.E., Islândia, Liechtenstein, Noruega, Suíça e Andorra' : w.nationalityType === 'other' ? 'Outra' : isForeign ? 'Estrangeiro' : 'Portugal'} fieldKey="nationalityType" />
                            {isForeign && (
                                <FieldRow tab="id" label="País" value={w.foreignCountry} fieldKey="foreignCountry" />
                            )}
                            {isForeign && (w.nationalityType === 'other' || !w.nationalityType) && (
                                <FieldRow tab="id" label="Nº Título Residência / Visto" value={w.residencyPermitNumber} fieldKey="residencyPermitNumber" />
                            )}
                            {isForeign && (
                                <SectionTitle title="Documentação Obrigatória (Estrangeiro)" />
                            )}
                            {isForeign && (
                                <FieldRow tab="id" label="Contrato de Trabalho" value={undefined} fieldKey="foreignContract" docCategory="foreign_contract" />
                            )}
                            {isForeign && w.nationalityType === 'eu_etc' && (
                                <FieldRow tab="id" label="Certificado Registo Cidadão UE" value={undefined} fieldKey="euCitizenCertificate" docCategory="eu_citizen_certificate" />
                            )}
                            {isForeign && (w.nationalityType === 'other' || !w.nationalityType) && (
                                <FieldRow tab="id" label="Visto / Título de Residência (doc.)" value={undefined} fieldKey="residencyPermitNumber" docCategory="residency_permit" />
                            )}
                            {isForeign && (w.nationalityType === 'other' || !w.nationalityType) && (
                                <FieldRow tab="id" label="Comunicação à ACT" value={undefined} fieldKey="actCommunication" docCategory="act_communication" />
                            )}
                            <FieldRow tab="id" label="Autorização Trabalhos" value={w.workPermitNumber ? `${w.workPermitNumber}${w.workPermitExpiry ? ` (${new Date(w.workPermitExpiry).toLocaleDateString()})` : ''}` : null} fieldKey="workPermitNumber" />
                            <SectionTitle title="Contactos e Morada" />
                            <FieldRow tab="id" label="Telefone" value={w.phone} fieldKey="phone" />
                            <FieldRow tab="id" label="Email" value={w.email} fieldKey="email" />
                            <FieldRow tab="id" label="Morada" value={w.address} fieldKey="address" />
                            <FieldRow tab="id" label="Código Postal" value={w.postalCode} fieldKey="postalCode" />
                            <FieldRow tab="id" label="Localidade" value={w.city} fieldKey="city" />
                        </ContentTable>
                    );

                    if (drawerTab === 'pro') return (
                        <ContentTable>
                            <SectionTitle title={tWorkers('tabs.pro')} />
                            <FieldRow tab="pro" label="Empresa" value={companies.find(c => c.id === w.companyId)?.name} fieldKey="companyId" />
                            <FieldRow tab="pro" label="NIF da Empresa" value={companies.find(c => c.id === w.companyId)?.nif} />
                            <FieldRow tab="pro" label="Função / Papel" value={w.role} fieldKey="role" />
                            <FieldRow tab="pro" label="Entrada no Estaleiro" value={w.entryDate ? new Date(w.entryDate).toLocaleDateString() : null} fieldKey="entryDate" />
                            <FieldRow tab="pro" label="Saída Prevista" value={w.exitDate ? new Date(w.exitDate).toLocaleDateString() : null} />
                        </ContentTable>
                    );

                    if (drawerTab === 'safety') return (
                        <ContentTable>
                            <SectionTitle title={tWorkers('tabs.safety')} />
                            <FieldRow tab="safety" label="Aptidão Médica" value={w.medicalFitness} fieldKey="medicalFitness" />
                            <FieldRow tab="safety" label="Validade Exame Médico" value={w.medicalExpiry ? new Date(w.medicalExpiry).toLocaleDateString() : null} fieldKey="medicalExpiry" />
                            <FieldRow tab="safety" label="Data Entrega EPI" value={w.epiDate ? new Date(w.epiDate).toLocaleDateString() : null} fieldKey="epiDate" />
                            <FieldRow tab="safety" label="Formação Específica" value={w.specificTrainingDate ? new Date(w.specificTrainingDate).toLocaleDateString() : null} fieldKey="specificTrainingDate" />
                            <FieldRow tab="safety" label="N.º Apólice Acid. Trab." value={w.insuranceWorkAccPolicyWorker} />
                        </ContentTable>
                    );

                    if (drawerTab === 'bim') return (
                        <ContentTable>
                            <SectionTitle title={tWorkers('tabs.bim')} />
                            <FieldRow tab="bim" label="GUID IFC" value={w.ifcGuid} />
                            <FieldRow tab="bim" label="Profissão" value={w.profession} />
                            <FieldRow tab="bim" label="Categoria" value={w.category} />
                            <FieldRow tab="bim" label="N.º Cartão Profissional" value={w.workerCardNumber} />
                            <FieldRow tab="bim" label="Formações" value={w.completedTrainingIds?.length ? `${w.completedTrainingIds.length} concluída(s)` : null} />
                        </ContentTable>
                    );

                    if (drawerTab === 'qualifications') {
                        const HANDLING_ROLES = ['TOWER_CRANE_OP','MOBILE_CRANE_OP','EXCAVATOR_OP','BACKHOE_OP','MEWP_OP','DRIVER','CRANE_SIGNALLER'];
                        const isOperatorRole = HANDLING_ROLES.includes(w.workerRoleId || '');
                        const MANDATORY = [
                            { id: 'induction',   label: 'Formação de Acolhimento', condition: true },
                            { id: 'emergency',   label: 'Formação de Emergência e Evacuação', condition: true },
                            { id: 'environment', label: 'Formação de Ambiente', condition: true },
                            { id: 'operator',    label: 'Formação de Manobrador', condition: isOperatorRole },
                        ].filter(t => t.condition);
                        const mt = w.mandatoryTrainings || {};
                        const completedCount = MANDATORY.filter(t => mt[t.id]?.completed).length;

                        const statusBadge = (done: boolean, date?: string) => done
                            ? <span className="inline-flex items-center gap-1 text-green-700 font-semibold text-xs">
                                <CheckCircle size={12} /> {date ? new Date(date).toLocaleDateString('pt-PT') : 'Concluído'}
                              </span>
                            : <span className="text-amber-600 text-xs font-semibold">Pendente</span>;

                        const projectTrainings = trainings.filter(t => t.projectId === projectId);

                        return (
                            <ContentTable>
                                <SectionTitle title={`Formações Obrigatórias — ${completedCount}/${MANDATORY.length} concluídas`} />
                                {MANDATORY.map(t => {
                                    const done = mt[t.id]?.completed;
                                    const date = mt[t.id]?.date;
                                    return (
                                        <tr key={t.id} 
                                            className={cn("transition-colors group", isEditing ? "hover:bg-gray-50/50 dark:hover:bg-surface/50 cursor-pointer" : "")} 
                                            onClick={() => {
                                                if (!isEditing) return;
                                                openTab('qualifications');
                                            }} 
                                            title={isEditing ? "Editar formações" : undefined}>
                                            <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                                <div className="flex items-center gap-2">
                                                    <div className={cn('w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0', done ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300')}>
                                                        {done && <Check size={9} strokeWidth={3} />}
                                                    </div>
                                                    {t.label}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                {statusBadge(!!done, date)}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {done
                                                    ? <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold bg-green-100 text-green-700">Validado</span>
                                                    : <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] uppercase font-bold bg-gray-100 dark:bg-[#131314] text-gray-500">Pendente</span>
                                                }
                                            </td>
                                        </tr>
                                    );
                                })}

                                {projectTrainings.length > 0 && (
                                    <SectionTitle title="Outras Formações do Projeto" />
                                )}
                                {projectTrainings.map(training => {
                                    const has = w.completedTrainingIds?.includes(training.id);
                                    return (
                                        <tr key={training.id} className="hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors">
                                            <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                                <div className="flex items-center gap-2">
                                                    <GraduationCap size={14} className={has ? 'text-primary' : 'text-gray-400'} />
                                                    {training.name}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-500 text-xs">{training.provider}</td>
                                            <td className="px-4 py-3 text-center">
                                                {has
                                                    ? <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-green-100 text-green-700"><Check size={10} strokeWidth={3} />Concluído</span>
                                                    : <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] uppercase font-bold bg-gray-100 dark:bg-[#131314] text-gray-500">Pendente</span>
                                                }
                                            </td>
                                        </tr>
                                    );
                                })}
                            </ContentTable>
                        );
                    }

                    if (drawerTab === 'process') {
                        const projectZones = accessPoints.filter(
                            p => p.projectId === projectId && (p.category === 'site' || p.category === 'zone')
                        );
                        const completedSet = new Set([
                            ...(w.completedTrainingIds || []),
                            ...Object.entries(w.mandatoryTrainings || {}).filter(([, v]) => v.completed).map(([k]) => k),
                        ]);
                        const authorizedZoneIds = w.authorizedZoneIds || [];
                        const isAllSite = authorizedZoneIds.length === 0;

                        return (
                            <ContentTable>
                                <SectionTitle title="Zonas de Acesso" />

                                {/* All site row */}
                                <tr 
                                    className={cn("transition-colors", isEditing ? "hover:bg-gray-50/50 dark:hover:bg-surface/50 cursor-pointer" : "")} 
                                    onClick={() => {
                                        if (!isEditing) return;
                                        openTab('process');
                                    }} 
                                    title={isEditing ? "Gerir acessos" : undefined}>
                                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                        <div className="flex items-center gap-2">
                                            <div className={cn('w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
                                                isAllSite ? 'border-primary bg-primary' : 'border-gray-300'
                                            )}>
                                                {isAllSite && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                            </div>
                                            Todo o Estaleiro
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-gray-500 text-xs">Acesso a todas as zonas sem restrição</td>
                                    <td className="px-4 py-3 text-center">
                                        {isAllSite
                                            ? <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-green-100 text-green-700"><Check size={10} strokeWidth={3} />Ativo</span>
                                            : <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] uppercase font-bold bg-gray-100 dark:bg-[#131314] text-gray-500">Inativo</span>
                                        }
                                    </td>
                                </tr>

                                {projectZones.length === 0 && (
                                    <tr><td colSpan={3} className="px-4 py-3 text-xs text-gray-400 italic">Nenhuma zona configurada na página <strong>Controlo de Acessos</strong>.</td></tr>
                                )}
                                {projectZones.map(zone => {
                                    const required = zone.requiredTrainingIds || [];
                                    const missing = required.filter(tid => !completedSet.has(tid));
                                    const missingNames = missing.map(tid => trainings.find(t => t.id === tid)?.name || tid);
                                    const ok = missing.length === 0;
                                    const isAuthorized = isAllSite || authorizedZoneIds.includes(zone.id);
                                    return (
                                        <tr key={zone.id} 
                                            className={cn("transition-colors", isEditing ? "hover:bg-gray-50/50 dark:hover:bg-surface/50 cursor-pointer" : "")} 
                                            onClick={() => {
                                                if (!isEditing) return;
                                                openTab('process');
                                            }} 
                                            title={isEditing ? "Gerir acessos" : undefined}>
                                            <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                                <div className="flex items-center gap-2">
                                                    <div className={cn('w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
                                                        isAuthorized ? 'border-primary bg-primary' : 'border-gray-300'
                                                    )}>
                                                        {isAuthorized && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                                    </div>
                                                    {zone.name}
                                                </div>
                                                {missingNames.length > 0 && (
                                                    <p className="text-xs text-amber-600 pl-6 mt-0.5">🟡 Em falta: {missingNames.join(', ')}</p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full',
                                                    ok ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                                )}>
                                                    {ok ? 'Formação OK' : 'Condicionado'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {isAuthorized
                                                    ? <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-green-100 text-green-700"><Check size={10} strokeWidth={3} />Autorizado</span>
                                                    : <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold bg-red-100 text-red-600">Não Autorizado</span>
                                                }
                                            </td>
                                        </tr>
                                    );
                                })}

                                <SectionTitle title="Cartão de Acesso" />
                                <tr 
                                    className={cn("transition-colors", isEditing ? "hover:bg-gray-50/50 dark:hover:bg-surface/50 cursor-pointer" : "")} 
                                    onClick={() => {
                                        if (!isEditing) return;
                                        openTab('process');
                                    }} 
                                    title={isEditing ? "Gerir acessos" : undefined}>
                                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                        <div className="flex items-center gap-2">
                                            <QrCode size={14} className={w.isAccessCardBlocked ? 'text-red-500' : 'text-gray-400'} />
                                            Estado do Cartão
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-gray-500 text-xs">
                                        {w.isAccessCardBlocked ? 'Acesso ao estaleiro suspenso.' : 'Acesso permitido nas catracas e leitores QR.'}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {w.isAccessCardBlocked
                                            ? <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-red-100 text-red-700">🔴 Bloqueado</span>
                                            : <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-green-100 text-green-700">🟢 Ativo</span>
                                        }
                                    </td>
                                </tr>
                                {w.observations && (
                                    <tr>
                                        <td colSpan={3} className="px-4 py-2 text-xs text-gray-500 italic bg-gray-50 dark:bg-surface/30">
                                            {w.observations}
                                        </td>
                                    </tr>
                                )}
                            </ContentTable>
                        );
                    }

                    if (drawerTab === 'docs') return (
                        <div className="animate-in fade-in pt-4">
                            <DocumentList entityId={w.id || ''} projectId={projectId} />
                        </div>
                    );

                    if (drawerTab === 'history') return (
                        <div className="animate-in fade-in pt-4">
                            <WorkflowHistory entityId={w.id || ''} entityType="worker" projectId={projectId} />
                        </div>
                    );

                    return null;
                })()}
            </Drawer>

            <ReviewModal
                isOpen={reviewModalOpen}
                onClose={() => setReviewModalOpen(false)}
                onSubmit={handleSubmitReview}
                title={reviewField ? `Review: ${reviewField.label}` : 'Request Review'}
            />

            <WorkerQuickCreateModal
                isOpen={isQuickCreateOpen}
                onClose={() => setIsQuickCreateOpen(false)}
                projectId={projectId}
            />

            {cardWorkerId && (
                <WorkerCardModal
                    isOpen={!!cardWorkerId}
                    onClose={() => setCardWorkerId(null)}
                    worker={workers.find(w => w.id === cardWorkerId)!}
                    company={companies.find(c => c.id === workers.find(w => w.id === cardWorkerId)?.companyId) || undefined}
                    project={currentProject!}
                />
            )}
        </div>
    );
};

export default WorkersPage;

// --- SHARED COMPONENTS ---

interface FieldControlProps {
    label: string;
    children: React.ReactNode;
    isValidated?: boolean;
    isInvalid?: boolean;
    isLocked?: boolean;
    hasOpenTicket?: boolean;
    canValidate?: boolean;
    canUnlock?: boolean;
    canRequestReview?: boolean;
    onValidate?: () => void;
    onUnlock?: () => void;
    onRequestReview?: () => void;
    isEditing?: boolean;
    currentValue?: any;
    ticket?: Ticket;
    isManager: boolean;
    onResolveTicket?: () => void;
}

const FieldControl: React.FC<FieldControlProps> = ({
    label, children, isValidated, isInvalid, isLocked, hasOpenTicket,
    canValidate, canUnlock, canRequestReview,
    onValidate, onUnlock, onRequestReview, isEditing,
    currentValue, ticket, isManager, onResolveTicket
}) => {
    // Collapsible Logic for Open Ticket
    // If ticket is open, show it.
    const isOpen = hasOpenTicket && ticket;
    const [isTicketExpanded, setIsTicketExpanded] = useState(true);

    // Change Detection
    const hasChanged = ticket && ticket.valueAtReview !== JSON.stringify(currentValue);
    const isReadyForSubmission = isOpen && hasChanged && !isManager;

    return (
        <div className="flex flex-col gap-1.5 animate-in fade-in duration-300">
            <div className="flex justify-between items-center px-1">
                <div className="flex items-center gap-2">
                    <label className="text-[11px] text-gray-500 uppercase font-bold tracking-wider">
                        {label}
                    </label>
                    <div className="flex items-center gap-1.5">
                        {/* Public Validation Badge - Visible to ALL users when validated */}
                        {isValidated && (!isEditing || !canValidate) && (
                            <div title="Validado" className="text-green-600 bg-green-50 p-1 rounded-full border border-green-200">
                                <Check size={12} strokeWidth={3} />
                            </div>
                        )}

                        <div className="flex items-center gap-1.5">
                            {isEditing && (
                                <>
                                    {canRequestReview && !isValidated && (
                                        <button
                                            type="button"
                                            onClick={onRequestReview}
                                            title="Solicitar Revisão"
                                            className="flex items-center justify-center w-6 h-6 rounded-full bg-white dark:bg-surface text-primary border border-primary/20 hover:bg-primary-light transition-colors shadow-sm"
                                        >
                                            <MessageSquare size={14} />
                                        </button>
                                    )}

                                    {/* Validate Button (Toggles Validation/Lock) */}
                                    {canValidate && (
                                        <button
                                            type="button"
                                            onClick={onValidate}
                                            className={cn(
                                                "flex items-center justify-center w-6 h-6 rounded-full transition-all border shadow-sm",
                                                isValidated
                                                    ? "bg-green-600 text-white border-green-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                                                    : "bg-white dark:bg-surface text-gray-600 dark:text-gray-300 border-gray-200 dark:border-[#444746] hover:border-green-300 hover:text-green-700 hover:bg-green-50"
                                            )}
                                            title={isValidated ? "Clique para Invalidar/Desbloquear" : "Clique para Validar"}
                                        >
                                            {isValidated ? (
                                                <Check size={14} strokeWidth={3} />
                                            ) : (
                                                <Check size={14} />
                                            )}
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isLocked && <Lock size={12} className="text-gray-400" />}
                    {hasOpenTicket && (
                        <button
                            type="button"
                            onClick={() => setIsTicketExpanded(!isTicketExpanded)}
                            className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 animate-pulse hover:bg-orange-200"
                        >
                            <AlertTriangle size={10} /> REVIEW REQUESTED
                        </button>
                    )}
                </div>
            </div>

            {/* Ticket Alert Box */}
            {isOpen && isTicketExpanded && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs text-orange-800 shadow-inner">
                    <div className="flex justify-between items-start mb-1">
                        <span className="font-bold flex items-center gap-1">
                            <MessageSquare size={12} /> Request by {ticket.createdBy}
                        </span>
                        {!isManager && isReadyForSubmission && (
                            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold border border-green-200 animate-in fade-in slide-in-from-right-2">
                                PRONTO PARA ENVIO
                            </span>
                        )}
                    </div>
                    <p className="mb-2 italic">"{ticket.description}"</p>
                </div>
            )}

            <div className={cn("relative rounded-lg group transition-all", (isLocked || (isValidated && !isManager)) && "opacity-60 pointer-events-none bg-gray-50 dark:bg-[#131314]")}>
                {children}
                {(isLocked || (isValidated && !isManager)) && (
                    <div className="absolute inset-0 z-10 cursor-not-allowed" title="Campo bloqueado. Contacte o Manager para alterações." />
                )}
            </div>
        </div>
    );
};

const ReviewModal = ({ isOpen, onClose, onSubmit, title = "Request Review" }: { isOpen: boolean, onClose: () => void, onSubmit: (msg: string) => void, title?: string }) => {
    const [message, setMessage] = useState('');
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-surface rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50 dark:bg-[#131314]">
                    <h3 className="font-bold text-gray-800 dark:text-gray-100">{title}</h3>
                    <button onClick={onClose}><X size={18} className="text-gray-500" /></button>
                </div>
                <div className="p-4">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-2">Feedback / Change Request</label>
                    <textarea
                        className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary outline-none min-h-[100px]"
                        placeholder="Describe what needs to be changed..."
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        autoFocus
                    />
                </div>
                <div className="p-4 bg-gray-50 dark:bg-[#131314] flex justify-end gap-2 text-sm">
                    <button onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-white dark:hover:bg-surface transition-colors">Cancel</button>
                    <button
                        onClick={() => { onSubmit(message); setMessage(''); onClose(); }}
                        disabled={!message.trim()}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                        Send Request
                    </button>
                </div>
            </div>
        </div>
    );
};
