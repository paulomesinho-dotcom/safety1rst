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
                const isApprovalForThis = isApprovalUser && !!currentProject?.approvalWorkflow?.workers;
                const dataUserCanSeeActions = isDataUser && ['draft', 'data_requested', 'data_update'].includes(cw.workflowStatus || '');
                if (!isManagerForThis && !dataUserCanSeeActions && !isApprovalForThis) return null;

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
                                        "px-3 py-1.5 text-xs font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-xs flex items-center gap-1.5",
                                        !drawerReadyToSubmit && "opacity-40 cursor-not-allowed"
                                    )}
                                >
                                    <CheckCircle size={13} /> Submeter
                                </button>
                            );
                        })()}

                        {isManagerForThis && cw.workflowStatus === 'validation_pending' && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const missing = checkFields.filter(k => !cw.fieldValidations?.[k]);
                                        requestWorkerElements(cw.id!, missing);
                                    }}
                                    className="px-3 py-1.5 text-xs font-semibold text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors shadow-xs flex items-center gap-1.5"
                                >
                                    <AlertTriangle size={13} /> Rever
                                </button>
                                
                                <button
                                    type="button"
                                    disabled={!isAllValidated}
                                    onClick={() => validateWorker(cw.id!)}
                                    className={cn(
                                        "px-3 py-1.5 text-xs font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-xs flex items-center gap-1.5",
                                        !isAllValidated && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    <Check size={13} /> Validar
                                </button>
                            </>
                        )}

                        {isApprovalForThis && (cw.workflowStatus === 'approval_pending' || (cw.workflowStatus === 'validated' && cw.approvalStatus !== 'approved')) && (
                            <button
                                type="button"
                                onClick={() => approveWorker(cw.id!)}
                                className="px-3 py-1.5 text-xs font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors shadow-xs flex items-center gap-1.5"
                            >
                                <CheckCircle size={13} /> Aprovar
                            </button>
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
                    <div className="flex items-center border-t border-[var(--border)] overflow-x-auto no-scrollbar">
                        {[
                            { id: 'id', label: '1. Identificação & Contactos' },
                            { id: 'pro', label: '2. Dados Laborais & Função' },
                            { id: 'safety', label: '3. Requisitos Legais & Médicos' },
                            { id: 'docs', label: '4. Ficheiros & Documentos' },
                            { id: 'qualifications', label: '5. Qualificações & Formação' },
                            { id: 'process', label: '6. Processo & Validação' },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setDrawerTab(tab.id as any)}
                                className={cn(
                                    "flex items-center gap-2 py-2.5 px-4 border-b-2 transition-colors text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer",
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
                footerContent={
                    isEditing ? (
                        <div className="max-w-7xl mx-auto flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={handleCancelWithRollback}
                                className="px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-surface border border-gray-300 dark:border-[#444746] rounded-lg hover:bg-gray-100 dark:hover:bg-[#131314] transition-colors shadow-xs cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    handleSubmit();
                                    setIsEditing(false);
                                }}
                                className="px-4 py-2 text-xs font-semibold text-white bg-[#4285F4] hover:bg-[#3367D6] dark:hover:bg-[#1A73E8] rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                            >
                                <Save size={14} /> Guardar Alterações
                            </button>
                        </div>
                    ) : undefined
                }
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

                    const FieldRow = ({ label, value, fieldKey, tab, docCategory, editControl }: {
                        label: string;
                        value?: string | null;
                        fieldKey?: string;
                        tab?: 'id' | 'pro' | 'bim' | 'safety' | 'qualifications' | 'process';
                        docCategory?: string;
                        editControl?: React.ReactNode;
                    }) => {
                        const isValidated = fieldKey ? !!w.fieldValidations?.[fieldKey] : false;
                        const filePresent = docCategory ? hasDoc(docCategory) : undefined;

                        return (
                            <tr className="hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors">
                                <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                    <div className="flex items-center gap-2">
                                        {label}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                    {isEditing && editControl ? (
                                        editControl
                                    ) : docCategory !== undefined ? (
                                        filePresent
                                            ? <span className="inline-flex items-center gap-1 text-green-700 dark:text-green-400 font-semibold text-xs"><CheckCircle size={13} /> Ficheiro carregado</span>
                                            : <span className="inline-flex items-center gap-1 text-amber-600 text-xs font-semibold"><AlertTriangle size={13} /> Sem ficheiro</span>
                                    ) : value === undefined || value === null || value === '' ? (
                                        <span className="text-gray-400 italic font-normal text-xs">Por preencher...</span>
                                    ) : (
                                        <span className="text-gray-900 dark:text-gray-100 font-medium">{String(value)}</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    {isValidated ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200">
                                            <Check size={11} strokeWidth={3} /> Validado
                                        </span>
                                    ) : w.workflowStatus === 'approved' ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200">
                                            <Shield size={11} strokeWidth={3} /> Aprovado
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 dark:bg-surface dark:text-gray-400 border border-gray-200 dark:border-gray-700">
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
                        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-sm p-5 space-y-4 animate-in fade-in">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border)]">
                                <div>
                                    <h3 className="font-bold text-sm text-[var(--text)] flex items-center gap-2">
                                        <FileText className="text-[#4285F4]" size={16} /> Ficheiros e Documentos Comprovativos da Pessoa
                                    </h3>
                                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                        Ficha de aptidão médica (FAT), apólice de seguro de acidentes de trabalho e documentos de identificação.
                                    </p>
                                </div>
                                <DocumentUpload
                                    entityId={w.id || ''}
                                    projectId={projectId}
                                    category="worker"
                                    layout="button"
                                    label="Carregar Documento"
                                />
                            </div>
                            <DocumentList entityId={w.id || ''} projectId={projectId} isEditing={isEditing} />
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
