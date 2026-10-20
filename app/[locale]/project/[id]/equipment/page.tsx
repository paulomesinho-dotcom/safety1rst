'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { LayoutGrid, List as ListIcon, HardHat, Plus, Search, Check, AlertTriangle, FileText, Wrench, Gauge, Save, Download, MoreVertical, Settings, Shield, X, CheckCircle, MessageSquare, Unlock, Lock, Edit2, ChevronDown, Eye, Clock } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { cn } from '@/lib/utils';
import type { Equipment, Company, Ticket } from '@/types';
import { Modal, InputGroup, PrimaryButton } from '@/components/Modal';
import { DocumentUpload } from '@/components/DocumentUpload';
import { DocumentList } from '@/components/DocumentList';
import { EquipmentCardModal } from '@/components/EquipmentCardModal';
import { ProfileManagerModal } from '@/components/ProfileManagerModal';
import { PDFConfigModal } from '@/components/PDFConfigModal';
import { FieldValidator } from '@/components/FieldValidator';
import { EQUIPMENT_TYPE_OPTIONS, EQUIPMENT_TYPE_GROUPS, getEquipmentTypeLabel, getEquipmentTypeIcon } from '@/lib/equipment-ifc-map';

export const getEquipmentDisplayStatus = (eq: Partial<Equipment>) => {
    if (eq.status === 'out_of_service' || (eq as any).archived) {
        return {
            status: 'archived' as const,
            label: 'Arquivado',
            color: 'bg-gray-100 text-gray-600 border border-gray-200 dark:bg-surface dark:text-gray-300 dark:border-[#444746]',
            icon: 'file' as const
        };
    }
    if (eq.nextMaintenanceDate && new Date(eq.nextMaintenanceDate) < new Date()) {
        return {
            status: 'expired' as const,
            label: 'Manutenção Vencida',
            color: 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
            icon: 'alert' as const
        };
    }
    const ws = eq.workflowStatus;
    if (eq.approvalStatus === 'approved' || ws === 'approved') {
        return {
            status: 'approved' as const,
            label: 'Aprovado',
            color: 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
            icon: 'check' as const
        };
    }
    if (ws === 'approval_pending' || (ws === 'validated' && eq.approvalStatus === 'pending')) {
        return {
            status: 'pending' as const,
            label: 'Pendente Aprovação',
            color: 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
            icon: 'clock' as const
        };
    }
    if (ws === 'validated') {
        return {
            status: 'valid' as const,
            label: 'Validado',
            color: 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800',
            icon: 'check' as const
        };
    }
    if (ws === 'validation_pending') {
        return {
            status: 'pending' as const,
            label: 'Validação Pendente',
            color: 'bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800',
            icon: 'clock' as const
        };
    }
    return {
        status: 'incomplete' as const,
        label: 'Em Validação',
        color: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
        icon: 'clock' as const
    };
};

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
                                <Check size={10} strokeWidth={3} /> APROVADO
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

                            {isEditing && isManager && showRequestChange && !isValidated && (
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

const EquipmentPage: React.FC = () => {
    const params = useParams();
    const projectId = params?.id as string;

    const {
        getProjectResources,
        addEquipment,
        updateEquipment,
        companies,
        currentUser,
        templates,
        getUserRoleInProject,
        toggleEquipmentFieldValidation,
        submitEquipment,
        validateEquipment,
        equipmentProfiles,
        projects,
        approveEquipment,
        tickets,
        createTicket,
        setFieldPermission
    } = useStore(useShallow(state => ({
        getProjectResources: state.getProjectResources,
        addEquipment: state.addEquipment,
        updateEquipment: state.updateEquipment,
        companies: state.companies,
        currentUser: state.currentUser,
        templates: state.templates,
        getUserRoleInProject: state.getUserRoleInProject,
        toggleEquipmentFieldValidation: state.toggleEquipmentFieldValidation,
        submitEquipment: state.submitEquipment,
        validateEquipment: state.validateEquipment,
        equipmentProfiles: state.equipmentProfiles,
        projects: state.projects,
        approveEquipment: state.approveEquipment,
        tickets: state.tickets,
        createTicket: state.createTicket,
        setFieldPermission: state.setFieldPermission
    })));
    const currentProject = projects.find(p => p.id === projectId);

    const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
    const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);

    useEffect(() => {
        const resources = getProjectResources(projectId);
        setEquipmentList(resources.equipment);
        setFilteredCompanies(resources.companies);
    }, [projectId, getProjectResources]);

    const access = getUserRoleInProject(currentUser?.id || '', projectId);

    const isManager = access === 'manager' || currentUser?.role === 'admin';
    const isDataUser = access === 'data_user';
    const isApprovalUser = access === 'approval_user';

    // A company is "addable" for new equipment depending on the project setting:
    // - If requireCompanyValidatedToAddWorkers is true: only validated/approved (not data_update)
    // - If false (default): validated, approved AND data_update are all ok
    const hasValidCompany = filteredCompanies.some(c => {
        const isValidatedOrApproved = c.workflowStatus === 'validated' || c.workflowStatus === 'approved';
        const isDataUpdate = c.workflowStatus === 'data_update';
        if (currentProject?.requireCompanyValidatedToAddWorkers) {
            return isValidatedOrApproved;
        }
        return isValidatedOrApproved || isDataUpdate;
    });

    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentEq, setCurrentEq] = useState<Partial<Equipment>>({});
    const [mode, setMode] = useState<'create' | 'edit'>('create');
    const [activeTab, setActiveTab] = useState<'id' | 'tech' | 'maint' | 'docs'>('id');
    const [cardEq, setCardEq] = useState<Equipment | null>(null);

    const canEdit = access === 'manager' || access === 'editor' || currentUser?.role === 'admin' || (isDataUser && (!currentEq.id || ['draft', 'incomplete', 'data_requested'].includes(currentEq.workflowStatus || 'draft')));
    const [isPDFModalOpen, setIsPDFModalOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    // Profile Logic
    const selectedProfile = equipmentProfiles.find(p => p.id === currentEq.profileId);

    // Auto-select standard profile ON CREATE
    useEffect(() => {
        if (mode === 'create' && !currentEq.profileId && isModalOpen) {
            const defaultId = currentProject?.defaultEquipmentProfileId || `profile_std_equipment_${projectId}`;
            setCurrentEq(prev => ({ ...prev, profileId: defaultId }));
        }
    }, [mode, isModalOpen, currentProject?.defaultEquipmentProfileId, projectId, currentEq.profileId]);

    const isVisible = (key: string) => {
        if (!selectedProfile) return true;
        return !!selectedProfile.requirements[key as keyof typeof selectedProfile.requirements];
    };

    const isUploadVisible = (key: string) => {
        if (!selectedProfile) return true;
        return selectedProfile.standardUploads?.[key] !== false;
    };


    // Export Logic
    const exportToExcel = async () => {
        try {
            if (filteredEquipment.length === 0) {
                alert("No equipment to export.");
                return;
            }
            const XLSX = await import('xlsx');
            const data = filteredEquipment.map(e => ({
                "Nome": e.name || '-',
                "Tipo": e.type || '-',
                "Fabricante": e.manufacturer || '-',
                "Modelo": e.model || '-',
                "S/N": e.serialNumber || '-',
                "Status": e.status,
                "Workflow": e.workflowStatus || 'draft',
                "Próx. Manutenção": e.nextMaintenanceDate || '-'
            }));
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Equipamentos");
            const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = "Equipment_List.xlsx";
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 100);
        } catch (error) {
            console.error("Export failed:", error);
            alert("Failed to export Excel.");
        }
    };

    const handleGeneratePDF = async (config: any) => {
        try {
            // const jsPDF = (await import('jspdf')).default;
            const autoTable = (await import('jspdf-autotable')).default;
            const { default: jsPDF } = await import('jspdf');

            const template = config.templateId ? templates.find(t => t.id === config.templateId) : null;

            const doc = new jsPDF({
                orientation: template ? template.config.orientation : config.orientation,
                format: template ? template.config.pageSize : config.pageSize
            });

            const tableBody = filteredEquipment.map(e => [
                e.name || '-',
                e.type || '-',
                e.manufacturer || '-',
                `${e.model || '-'} (S/N: ${e.serialNumber || '-'})`,
                e.status,
                e.nextMaintenanceDate || '-'
            ]);

            if (template) {
                // Template logic (simplified from Companies)
                const pageWidth = doc.internal.pageSize.getWidth();
                const pageHeight = doc.internal.pageSize.getHeight();
                const renderColumns = (section: 'header' | 'footer', startY: number, height: number, columns: any[]) => {
                    let currentX = 0;
                    columns.forEach(col => {
                        const safeWidth = col.width || (100 / columns.length);
                        const colWidth = (pageWidth * safeWidth) / 100;
                        const colX = currentX;
                        currentX += colWidth;
                        col.elements.forEach((el: any) => {
                            let xPos = colX;
                            if (el.style.align === 'center') xPos = colX + (colWidth / 2);
                            if (el.style.align === 'right') xPos = colX + colWidth - 5;
                            if (el.style.align === 'left') xPos = colX + 5;
                            const yPos = startY + (height / 2) + 2;
                            doc.setFontSize(el.style.fontSize || 10);
                            doc.setTextColor(el.style.color || '#000000');
                            if (el.type === 'text') {
                                doc.text(el.content, xPos, yPos, { align: el.style.align as any, baseline: 'middle' });
                            } else if (el.type === 'variable') {
                                let text = '';
                                if (el.content === 'page_number') text = `Page ${doc.getCurrentPageInfo().pageNumber}`;
                                if (el.content === 'print_date') text = new Date().toLocaleDateString();
                                doc.text(text, xPos, yPos, { align: el.style.align as any, baseline: 'middle' });
                            }
                        });
                    });
                };
                autoTable(doc, {
                    head: [['Nome', 'Tipo', 'Marca', 'Modelo/SN', 'Status', 'Manutenção']],
                    body: tableBody,
                    startY: (template.config.marginTop || 10) + template.header.height + 5,
                    margin: { top: (template.config.marginTop || 10) + template.header.height, bottom: (template.config.marginBottom || 10) + template.footer.height, left: 10, right: 10 },
                    styles: { fontSize: 8 },
                    headStyles: { fillColor: [41, 128, 185] },
                    didDrawPage: (_data: any) => {
                        renderColumns('header', template.config.marginTop || 10, template.header.height, template.header.columns);
                        const footerY = pageHeight - (template.config.marginBottom || 10) - template.footer.height;
                        renderColumns('footer', footerY, template.footer.height, template.footer.columns);
                    }
                });
            } else {
                if (config.headerText) {
                    doc.setFontSize(18);
                    doc.text(config.headerText, 15, 20);
                    doc.setFontSize(10);
                    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 15, 26);
                }
                autoTable(doc, {
                    head: [['Nome', 'Tipo', 'Fabricante', 'Modelo/SN', 'Status', 'Manutenção']],
                    body: tableBody,
                    startY: 35,
                    styles: { fontSize: 8 },
                    headStyles: { fillColor: [41, 128, 185] }
                });
            }

            const pdfBlob = doc.output('blob');
            const url = window.URL.createObjectURL(pdfBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'Equipment_Report.pdf';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 100);
            setIsPDFModalOpen(false);
        } catch (error) {
            console.error(error);
            alert("PDF Export failed.");
        }
    };

    // Filters
    const [filter, setFilter] = useState<'all' | 'valid' | 'pending' | 'maintenance'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [showSavedMessage, setShowSavedMessage] = useState(false);

    const handleCreate = () => {
        setCurrentEq({
            name: '',
            type: '',
            status: 'operational',
            companyId: filteredCompanies[0]?.id || '',
            workflowStatus: 'draft',
            fieldValidations: {}
        });
        setMode('create');
        setIsEditing(true); // Always start editing when creating
        setActiveTab('id');
        setIsModalOpen(true);
    };

    const handleEdit = (eq: Equipment) => {
        setCurrentEq({ ...eq });
        setMode('edit');
        setIsEditing(false); // Default to View Mode
        setActiveTab('id');
        setIsModalOpen(true);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (mode === 'create') {
            addEquipment({
                name: currentEq.name!,
                type: currentEq.type!,
                serialNumber: currentEq.serialNumber!,
                companyId: currentEq.companyId!,
                status: currentEq.status as any,
                projectId,
                manufacturer: currentEq.manufacturer,
                model: currentEq.model,
                manufacturingYear: currentEq.manufacturingYear,
                soundPower: currentEq.soundPower,
                entryDate: currentEq.entryDate,
                exitDate: currentEq.exitDate,
                lastMaintenanceDate: currentEq.lastMaintenanceDate,
                nextMaintenanceDate: currentEq.nextMaintenanceDate,
                workingHoursOrKm: currentEq.workingHoursOrKm,
                workflowStatus: 'draft',
                fieldValidations: {}
            } as any);
            setIsModalOpen(false);
        } else {
            if (currentEq.id) {
                updateEquipment(currentEq.id, {
                    ...currentEq,
                    fieldValidations: currentEq.fieldValidations || {},
                    workflowNotificationCcs: currentEq.workflowNotificationCcs || []
                });
                // Keep modal open and show saved message
                setShowSavedMessage(true);
                setTimeout(() => setShowSavedMessage(false), 3000);
            }
        }
    };

    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [reviewField, setReviewField] = useState<{ id: string, label: string, currentValue?: any } | null>(null);

    const getFieldProps = (id: string, label: string) => {
        const openTicket = tickets.find(t => t.entityId === currentEq?.id && t.fieldId === id && t.status === 'open');
        const hasOpenTicket = !!openTicket;
        const liveEq = equipmentList.find(e => e.id === currentEq?.id);
        const isValidated = liveEq?.fieldValidations?.[id] === true;

        const lastEditor = liveEq?.fieldLastEditors?.[id];
        const isManagerEdited = lastEditor === 'manager';

        const isLockedForDataUser = isValidated || isManagerEdited;
        const locked = !isManager && isLockedForDataUser;

        return {
            label,
            isValidated,
            isLocked: locked,
            hasOpenTicket,
            canValidate: isManager,
            canUnlock: false,
            canRequestReview: isManager || isDataUser,
            onValidate: () => toggleEquipmentFieldValidation(currentEq.id!, id, !isValidated),
            onUnlock: () => { },
            onRequestReview: () => {
                setReviewField({ id, label, currentValue: (currentEq as any)[id] });
                setReviewModalOpen(true);
            },
            currentValue: (currentEq as any)[id],
            ticket: openTicket,
            isManager,
            onResolveTicket: () => { /* Handle resolve */ },
            isDisabled: !isEditing || (locked && !isManager),
            isEditing,
            workflowStatus: currentEq?.workflowStatus
        };
    };

    const handleSubmitReview = (message: string) => {
        if (!reviewField || !currentEq.id) return;
        createTicket({
            projectId,
            entityId: currentEq.id,
            type: 'field_review',
            fieldId: reviewField.id,
            title: `Review: ${reviewField.label}`,
            description: message,
            priority: 'medium',
            createdBy: currentUser?.id || 'unknown',
            assignedTo: currentEq.assignedDataUserId,
            isDraft: true,
            valueAtReview: JSON.stringify(reviewField.currentValue)
        });
        setReviewModalOpen(false);
        setReviewField(null);
    };

    // Filter Logic
    const filteredEquipment = equipmentList.filter(e => {
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = e.name.toLowerCase().includes(searchLower) ||
            e.serialNumber?.toLowerCase().includes(searchLower) ||
            e.type.toLowerCase().includes(searchLower);

        if (!matchesSearch) return false;

        if (filter === 'all') return true;
        if (filter === 'valid') return e.workflowStatus === 'validated';
        if (filter === 'pending') return e.workflowStatus === 'validation_pending' || e.workflowStatus === 'incomplete';
        if (filter === 'maintenance') return e.status === 'maintenance' || (e.nextMaintenanceDate && new Date(e.nextMaintenanceDate) < new Date());

        return true;
    });

    return (
        <div className="flex flex-col h-full">
            {/* Header / Top Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border)] mb-4 px-2 pt-2">
                {/* Title + Count */}
                <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold text-[var(--text)] tracking-tight">
                        Equipamentos
                    </h1>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[var(--bg-input)] text-[var(--text-muted)] border border-[var(--border)]">
                        {filteredEquipment.length}
                    </span>
                </div>

                {/* Controls & Actions */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" size={15} />
                        <input
                            type="text"
                            placeholder="Pesquisar equipamentos..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-40 sm:w-48 focus:w-60 transition-all duration-200 pl-9 pr-3 py-1.5 text-xs bg-[var(--bg-input)] text-[var(--text)] border border-[var(--border)] rounded-lg outline-none focus:border-[#4285F4] placeholder:text-[var(--text-muted)]"
                        />
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center bg-[var(--bg-input)] border border-[var(--border)] rounded-lg p-0.5">
                        {[
                            { key: 'all', label: 'Todos' },
                            { key: 'valid', label: 'Válidos' },
                            { key: 'pending', label: 'Pendentes' },
                            { key: 'maintenance', label: 'Manutenção' },
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

                    {/* Export Buttons */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={exportToExcel}
                            className="p-1.5 text-[var(--text-muted)] hover:text-green-600 hover:bg-green-500/10 rounded-lg transition-colors"
                            title="Exportar Excel"
                        >
                            <FileText size={17} />
                        </button>
                        <button
                            onClick={() => setIsPDFModalOpen(true)}
                            className="p-1.5 text-[var(--text-muted)] hover:text-red-600 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Exportar PDF"
                        >
                            <Download size={17} />
                        </button>
                    </div>

                    {/* New Equipment Button */}
                    {(canEdit || isManager || isDataUser) && (
                        <button
                            disabled={!hasValidCompany}
                            title={!hasValidCompany
                                ? currentProject?.requireCompanyValidatedToAddWorkers
                                    ? "A empresa precisa estar validada ou aprovada (sem documentos expirados) para adicionar equipamentos."
                                    : "A sua empresa precisa estar validada ou aprovada para adicionar equipamentos."
                                : ""}
                            onClick={handleCreate}
                            className={cn(
                                "flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white rounded-lg shadow-xs transition-all whitespace-nowrap",
                                hasValidCompany ? "bg-[#4285F4] hover:bg-[#3367D6]" : "bg-gray-400 cursor-not-allowed opacity-60"
                            )}
                        >
                            <Plus size={15} /> <span>Novo Equipamento</span>
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

            <div className="flex-1 overflow-y-auto">
                {filteredEquipment.length === 0 ? <div className="text-center text-gray-500 mt-10">No equipment found.</div> :
                    (viewMode === 'grid' ?
                        <div className="grid grid-cols-1 md:grid-grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-4 pb-4">
                            {filteredEquipment.map(eq => (
                                <div key={eq.id} onClick={() => handleEdit(eq)} className="bg-white dark:bg-surface border border-gray-200 dark:border-[#444746] rounded-xl p-4 shadow-sm hover:shadow-md hover:border-primary/30 cursor-pointer transition-all group relative">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center">
                                                <HardHat size={20} />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900 dark:text-white leading-tight">{eq.name}</h3>
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    <span className="text-xs">{getEquipmentTypeIcon(eq.equipmentType ?? '')}</span>
                                                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">{eq.equipmentTypeCustom ?? eq.type}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className={cn("w-2 h-2 rounded-full", eq.status === 'operational' ? "bg-green-500" : eq.status === 'maintenance' ? "bg-yellow-500" : "bg-red-500")} />
                                    </div>
                                    <div className="space-y-1 text-xs text-gray-600 dark:text-gray-300 mb-4">
                                        <div className="flex justify-between"><span>Owner:</span> <span className="font-medium text-gray-900 dark:text-white">{companies.find(c => c.id === eq.companyId)?.name}</span></div>
                                        <div className="flex justify-between"><span>S/N:</span> <span>{eq.serialNumber}</span></div>
                                        {eq.nextMaintenanceDate && <div className="flex justify-between"><span>Next Maint:</span> <span className={new Date(eq.nextMaintenanceDate) < new Date() ? "text-red-600 font-bold" : ""}>{eq.nextMaintenanceDate}</span></div>}
                                    </div>
                                    <div className="flex items-center justify-between border-t border-gray-100 dark:border-[#444746] pt-3">
                                        {(() => {
                                            const st = getEquipmentDisplayStatus(eq);
                                            return (
                                                <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border shadow-2xs", st.color)}>
                                                    {st.icon === 'check' && <CheckCircle size={12} />}
                                                    {st.icon === 'alert' && <AlertTriangle size={12} />}
                                                    {st.icon === 'clock' && <Clock size={12} />}
                                                    {st.icon === 'file' && <FileText size={12} />}
                                                    {st.label}
                                                </span>
                                            );
                                        })()}

                                        <button onClick={(e) => { e.stopPropagation(); setCardEq(eq); }} className="text-gray-400 hover:text-primary p-1">
                                            <Gauge size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        :
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left text-gray-500">
                                <thead className="text-xs text-gray-700 dark:text-gray-200 uppercase bg-gray-50 dark:bg-[#131314] border-b border-gray-100 dark:border-[#444746]">
                                    <tr>
                                        <th className="px-6 py-3 font-medium w-12 text-center">#</th>
                                        <th className="px-6 py-3 font-medium">Equipamento</th>
                                        <th className="px-6 py-3 font-medium">Tipo</th>
                                        <th className="px-6 py-3 font-medium">Fabricante / Modelo</th>
                                        <th className="px-6 py-3 font-medium">Proprietário</th>
                                        <th className="px-6 py-3 font-medium">Status</th>
                                        <th className="px-6 py-3 font-medium">Workflow</th>
                                        <th className="px-6 py-3 font-medium text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredEquipment.map((eq, index) => (
                                        <tr key={eq.id} onClick={() => handleEdit(eq)} className="bg-white dark:bg-surface border-b border-gray-50 hover-row cursor-pointer transition-colors">
                                            <td className="px-6 py-4 text-center font-mono text-xs text-gray-400">
                                                {index + 1}
                                            </td>
                                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{eq.name}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-sm">{getEquipmentTypeIcon(eq.equipmentType ?? '')}</span>
                                                    <span>{eq.equipmentTypeCustom ?? eq.type}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">{(eq.manufacturer || eq.model) ? `${eq.manufacturer || ''} ${eq.model || ''}` : '-'}</td>
                                            <td className="px-6 py-4">{companies.find(c => c.id === eq.companyId)?.name || '-'}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className={cn("w-2 h-2 rounded-full", eq.status === 'operational' ? "bg-green-500" : eq.status === 'maintenance' ? "bg-yellow-500" : "bg-red-500")} />
                                                    <span className="capitalize">{eq.status?.replace('_', ' ') || 'Operational'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {(() => {
                                                    const st = getEquipmentDisplayStatus(eq);
                                                    return (
                                                        <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border shadow-2xs", st.color)}>
                                                            {st.icon === 'check' && <CheckCircle size={12} />}
                                                            {st.icon === 'alert' && <AlertTriangle size={12} />}
                                                            {st.icon === 'clock' && <Clock size={12} />}
                                                            {st.icon === 'file' && <FileText size={12} />}
                                                            {st.label}
                                                        </span>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={(e) => { e.stopPropagation(); setCardEq(eq); }} className="text-gray-400 hover:text-primary p-1">
                                                    <Gauge size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
            </div>

            <Modal
                title={mode === 'create' ? "Registar Equipamento" : (currentEq.name || "Equipamento")}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                resizable={true}
                headerAction={
                    <div className="flex items-center gap-2">
                        {/* Mode Badge */}
                        {!isEditing && mode !== 'create' && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-surface border border-gray-200 dark:border-[#444746] rounded shrink-0">
                                <Eye size={10} className="text-gray-400" /> Visualização
                            </span>
                        )}
                        {isEditing && mode !== 'create' && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded shrink-0">
                                <Edit2 size={10} /> Edição
                            </span>
                        )}

                        {/* Workflow Actions — only in View Mode */}
                        {!isEditing && mode !== 'create' && (() => {
                            if (!currentEq.id) return null;
                            const isPreValidation = currentEq.workflowStatus === 'draft' || currentEq.workflowStatus === 'incomplete';
                            const isValidationPending = currentEq.workflowStatus === 'validation_pending';
                            const isValidated = currentEq.workflowStatus === 'validated';

                            return (
                                <div className="flex items-center gap-2 mr-2">
                                    {/* Submit Action */}
                                    {(isDataUser || isManager) && isPreValidation && (
                                        <button
                                            type="button"
                                            onClick={() => { submitEquipment(currentEq.id!); setIsModalOpen(false); }}
                                            className="px-3 py-1.5 text-xs font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-xs flex items-center gap-1.5"
                                        >
                                            <CheckCircle size={13} /> Submeter
                                        </button>
                                    )}

                                    {/* Manager Actions */}
                                    {isManager && isValidationPending && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    updateEquipment(currentEq.id!, { ...currentEq, workflowStatus: 'incomplete' });
                                                    setIsModalOpen(false);
                                                }}
                                                className="px-3 py-1.5 text-xs font-semibold text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors shadow-xs flex items-center gap-1.5"
                                            >
                                                <AlertTriangle size={13} /> Rever
                                            </button>
                                            {(() => {
                                                const checkFields: (keyof Equipment)[] = ['name', 'type', 'serialNumber', 'manufacturer', 'model', 'companyId', 'entryDate'];
                                                const validations = currentEq.fieldValidations || {};
                                                const isAllValidated = checkFields.every(k => validations[k as string] === true);
                                                return (
                                                    <button
                                                        type="button"
                                                        disabled={!isAllValidated}
                                                        onClick={() => { validateEquipment(currentEq.id!); setIsModalOpen(false); }}
                                                        className={cn(
                                                            "px-3 py-1.5 text-xs font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-xs flex items-center gap-1.5",
                                                            !isAllValidated && "opacity-50 cursor-not-allowed"
                                                        )}
                                                    >
                                                        <Check size={13} /> Validar
                                                    </button>
                                                );
                                            })()}
                                        </>
                                    )}

                                    {/* Approval Action */}
                                    {isApprovalUser && (isValidated || currentEq.workflowStatus === 'approval_pending') && (
                                        <button
                                            type="button"
                                            onClick={() => { approveEquipment(currentEq.id!); setIsModalOpen(false); }}
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
                        {!isEditing && mode !== 'create' && canEdit && (
                            <button
                                type="button"
                                onClick={() => setIsEditing(true)}
                                className="px-3 py-1.5 text-xs font-semibold text-white bg-[#4285F4] hover:bg-[#3367D6] dark:hover:bg-[#1A73E8] hover:text-white rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                            >
                                <Edit2 size={13} className="text-white" /> Editar
                            </button>
                        )}
                        {/* Botão Cancelar — só em modo de edição (sai do modo, não fecha a janela) */}
                        {isEditing && (
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-surface border border-gray-300 dark:border-[#444746] rounded-lg hover:bg-gray-100 dark:hover:bg-[#131314] transition-colors shadow-xs cursor-pointer shrink-0"
                            >
                                Cancelar
                            </button>
                        )}
                        {/* Botão Guardar — só em modo de edição ou criação */}
                        {(isEditing || mode === 'create') && (
                            <button
                                type="submit"
                                form="eq-form"
                                className="px-3 py-1.5 text-xs font-semibold text-white bg-[#4285F4] hover:bg-[#3367D6] rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                            >
                                {showSavedMessage && mode !== 'create' && (
                                    <span className="text-[11px] font-medium text-green-200 animate-in fade-in slide-in-from-right-2">✓ Guardado</span>
                                )}
                                {mode === 'create' ? <Plus size={13} /> : <Save size={13} />}
                                {mode === 'create' ? 'Criar' : 'Guardar'}
                            </button>
                        )}
                    </div>
                }
            >
                <div className="min-h-[400px]">
                    <div className="flex items-center justify-between mb-4 bg-gray-50 dark:bg-[#131314] p-3 rounded-lg border border-gray-200 dark:border-[#444746]">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold uppercase text-gray-500 tracking-wider">Status:</span>
                            {(() => {
                                const st = getEquipmentDisplayStatus(currentEq);
                                return (
                                    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border shadow-2xs", st.color)}>
                                        {st.icon === 'check' && <CheckCircle size={12} />}
                                        {st.icon === 'alert' && <AlertTriangle size={12} />}
                                        {st.icon === 'clock' && <Clock size={12} />}
                                        {st.icon === 'file' && <FileText size={12} />}
                                        {st.label}
                                    </span>
                                );
                            })()}
                        </div>
                    </div>

                    <div className="flex border-b border-gray-200 dark:border-[#444746] mb-4 overflow-x-auto">
                        <button onClick={() => setActiveTab('id')} className={cn("px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap", activeTab === 'id' ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-200")}>
                            <HardHat size={16} /> Identificação
                        </button>
                        <button onClick={() => setActiveTab('tech')} className={cn("px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap", activeTab === 'tech' ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-200")}>
                            <Gauge size={16} /> Dados Técnicos
                        </button>
                        <button onClick={() => setActiveTab('maint')} className={cn("px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap", activeTab === 'maint' ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-200")}>
                            <Wrench size={16} /> Manutenção e Seguros
                        </button>
                        <button onClick={() => setActiveTab('docs')} className={cn("px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap", activeTab === 'docs' ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-200")}>
                            <FileText size={16} /> Documentação
                        </button>
                    </div>

                    <div className="px-1">
                        <form id="eq-form" onSubmit={handleSave}>
                            {activeTab === 'id' && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center bg-gray-50 dark:bg-[#131314] p-3 rounded-lg mb-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Equipment Profile</label>
                                            <p className="text-xs text-gray-500">Determines required documents & maintenance checks.</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={currentEq.profileId || ''}
                                                onChange={(e) => setCurrentEq({ ...currentEq, profileId: e.target.value })}
                                                className="text-sm border-gray-300 dark:border-[#444746] rounded-md shadow-sm focus:border-blue-500 focus:ring-primary p-2 border"
                                                disabled={!isManager}
                                            >
                                                <option value="">Select Profile</option>
                                                {equipmentProfiles.filter(p => p.projectId === projectId).map(p => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.name} {p.isSystem ? '(Default)' : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <FieldControl {...getFieldProps('name', 'Equipment Name')}>
                                        <input
                                            required
                                            disabled={getFieldProps('name', '').isDisabled}
                                            className="w-full p-2.5 border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-primary disabled:bg-gray-50 dark:bg-[#131314] disabled:text-gray-500"
                                            value={currentEq.name || ''}
                                            onChange={e => setCurrentEq({ ...currentEq, name: e.target.value })}
                                        />
                                    </FieldControl>

                                    <div className="grid grid-cols-2 gap-4">
                                        <FieldControl {...getFieldProps('equipmentType', 'Tipo / Categoria')}>
                                            <div className="relative">
                                                <select
                                                    disabled={getFieldProps('equipmentType', '').isDisabled}
                                                    className="w-full p-2.5 pl-3 pr-10 border border-gray-300 dark:border-[#444746] rounded-lg outline-none disabled:bg-gray-50 dark:bg-[#131314] disabled:text-gray-500 appearance-none bg-white dark:bg-surface text-gray-900 dark:text-gray-100"
                                                    value={currentEq.equipmentType || ''}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        const opt = EQUIPMENT_TYPE_OPTIONS.find(o => o.value === val);
                                                        setCurrentEq(prev => ({
                                                            ...prev,
                                                            equipmentType: val,
                                                            equipmentTypeCustom: opt?.label,
                                                            ifcElementType: opt?.ifcType,
                                                            type: opt?.label 
                                                        }));
                                                    }}
                                                >
                                                    <option value="" disabled>Selecione o tipo de equipamento...</option>
                                                    {EQUIPMENT_TYPE_GROUPS.map(group => (
                                                        <optgroup key={group} label={group}>
                                                            {EQUIPMENT_TYPE_OPTIONS.filter(o => o.group === group).map(o => (
                                                                <option key={o.value} value={o.value}>
                                                                    {o.icon} {o.label}
                                                                </option>
                                                            ))}
                                                        </optgroup>
                                                    ))}
                                                </select>
                                                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                            </div>
                                        </FieldControl>
                                        <FieldControl {...getFieldProps('serialNumber', 'Serial Number')}>
                                            <input
                                                type="text"
                                                disabled={getFieldProps('serialNumber', '').isDisabled}
                                                className="w-full p-2.5 border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-primary disabled:bg-gray-50 dark:bg-[#131314] disabled:text-gray-500"
                                                value={currentEq.serialNumber || ''}
                                                onChange={e => setCurrentEq({ ...currentEq, serialNumber: e.target.value })}
                                            />
                                        </FieldControl>
                                    </div>

                                    <FieldControl {...getFieldProps('companyId', 'Owner Company')}>
                                        <select
                                            disabled={getFieldProps('companyId', '').isDisabled}
                                            className="w-full p-2.5 border border-gray-300 dark:border-[#444746] rounded-lg outline-none disabled:bg-gray-50 dark:bg-[#131314] disabled:text-gray-500"
                                            value={currentEq.companyId || ''}
                                            onChange={e => setCurrentEq({ ...currentEq, companyId: e.target.value })}
                                        >
                                            <option value="">Select Company...</option>
                                            {filteredCompanies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </FieldControl>

                                    <div className="grid grid-cols-2 gap-4">
                                        <FieldControl {...getFieldProps('entryDate', 'Entry Date')}>
                                            <input type="date" disabled={true} className="w-full p-2.5 border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-primary disabled:bg-gray-50 dark:disabled:bg-[#131314] disabled:text-gray-500"
                                                value={currentEq.entryDate || ''} onChange={e => setCurrentEq({ ...currentEq, entryDate: e.target.value })} />
                                        </FieldControl>
                                        <FieldControl {...getFieldProps('exitDate', 'Exit Date')}>
                                            <input type="date" disabled={getFieldProps('exitDate', '').isLocked} className="w-full p-2.5 border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-primary disabled:bg-gray-50 dark:bg-[#131314] disabled:text-gray-500"
                                                value={currentEq.exitDate || ''} onChange={e => setCurrentEq({ ...currentEq, exitDate: e.target.value })} />
                                        </FieldControl>
                                    </div>
                                    <div className="hidden">
                                        <FieldControl {...getFieldProps('ifcGlobalId', 'GUID IFC (Opcional)')}>
                                            <input type="text" disabled={getFieldProps('ifcGlobalId', '').isDisabled} className="w-full p-2.5 border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-primary disabled:bg-gray-50 dark:bg-[#131314] disabled:text-gray-500 font-mono text-sm"
                                                value={currentEq.ifcGlobalId || ''} onChange={e => setCurrentEq({ ...currentEq, ifcGlobalId: e.target.value })} placeholder="Automático se vazio" />
                                        </FieldControl>
                                    </div>

                                    {selectedProfile?.customDocuments?.map((doc) => (
                                        <FieldControl key={doc.id} {...getFieldProps(doc.id, doc.name)}>
                                            <input
                                                type={doc.dataType === 'date' ? 'date' : doc.dataType === 'number' ? 'number' : 'text'}
                                                disabled={getFieldProps(doc.id, '').isLocked}
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-blue-500 outline-none transition-all disabled:bg-gray-50 dark:bg-[#131314] disabled:text-gray-500"
                                                value={currentEq.customDocuments?.[doc.id] || ''}
                                                onChange={(e) => {
                                                    setCurrentEq({
                                                        ...currentEq,
                                                        customDocuments: {
                                                            ...currentEq.customDocuments,
                                                            [doc.id]: e.target.value
                                                        }
                                                    })
                                                }}
                                            />
                                        </FieldControl>
                                    ))}
                                </div>
                            )}

                            {activeTab === 'tech' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <FieldControl {...getFieldProps('manufacturer', 'Fabricante / Marca')}>
                                            <input type="text" disabled={getFieldProps('manufacturer', '').isDisabled} className="w-full p-2.5 border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-primary disabled:bg-gray-50 dark:bg-[#131314] disabled:text-gray-500"
                                                value={currentEq.manufacturer || ''} onChange={e => setCurrentEq({ ...currentEq, manufacturer: e.target.value })} />
                                        </FieldControl>
                                        <FieldControl {...getFieldProps('model', 'Model')}>
                                            <input type="text" disabled={getFieldProps('model', '').isDisabled} className="w-full p-2.5 border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-primary disabled:bg-gray-50 dark:bg-[#131314] disabled:text-gray-500"
                                                value={currentEq.model || ''} onChange={e => setCurrentEq({ ...currentEq, model: e.target.value })} />
                                        </FieldControl>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <FieldControl {...getFieldProps('manufacturingYear', 'Manufacturing Year')}>
                                            <input type="number" disabled={getFieldProps('manufacturingYear', '').isDisabled} className="w-full p-2.5 border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-primary disabled:bg-gray-50 dark:bg-[#131314] disabled:text-gray-500"
                                                value={currentEq.manufacturingYear || ''} onChange={e => setCurrentEq({ ...currentEq, manufacturingYear: e.target.value })} />
                                        </FieldControl>
                                        <FieldControl {...getFieldProps('workingHoursOrKm', 'Horas de Trabalho / Km')}>
                                            <input type="text" disabled={getFieldProps('workingHoursOrKm', '').isDisabled} className="w-full p-2.5 border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-primary disabled:bg-gray-50 dark:bg-[#131314] disabled:text-gray-500"
                                                value={currentEq.workingHoursOrKm || ''} onChange={e => setCurrentEq({ ...currentEq, workingHoursOrKm: e.target.value })} />
                                        </FieldControl>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FieldControl {...getFieldProps('noiseLevelDb', 'Nível Ruído dB(A)')}>
                                            <input type="number" step="0.1" disabled={getFieldProps('noiseLevelDb', '').isDisabled} className="w-full p-2.5 border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-primary disabled:bg-gray-50 dark:bg-[#131314] disabled:text-gray-500"
                                                value={currentEq.noiseLevelDb || ''} onChange={e => setCurrentEq({ ...currentEq, noiseLevelDb: parseFloat(e.target.value) })} />
                                        </FieldControl>
                                        <FieldControl {...getFieldProps('riskNature', 'Natureza de Risco')}>
                                            <select disabled={getFieldProps('riskNature', '').isDisabled} className="w-full p-2.5 border border-gray-300 dark:border-[#444746] rounded-lg outline-none disabled:bg-gray-50 dark:bg-[#131314] disabled:text-gray-500"
                                                value={currentEq.riskNature || ''} onChange={e => setCurrentEq({ ...currentEq, riskNature: e.target.value })}>
                                                <option value="">Selecione...</option>
                                                <option value="elevated">Elevado (Segurança)</option>
                                                <option value="standard">Normal</option>
                                                <option value="minimal">Mínimo</option>
                                            </select>
                                        </FieldControl>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'maint' && (
                                <div className="space-y-4">
                                    <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200 mb-2">
                                        <FieldControl {...getFieldProps('status', 'Operational Status')}>
                                            <select disabled={getFieldProps('status', '').isDisabled} className="w-full p-2.5 border border-gray-300 dark:border-[#444746] rounded-lg outline-none disabled:bg-gray-50 dark:bg-[#131314] disabled:text-gray-500"
                                                value={currentEq.status || 'operational'} onChange={e => setCurrentEq({ ...currentEq, status: e.target.value as any })}>
                                                <option value="operational">Operational</option>
                                                <option value="maintenance">Maintenance</option>
                                                <option value="out_of_service">Out of Service</option>
                                            </select>
                                        </FieldControl>
                                    </div>

                                    {isVisible('maintenance') && (
                                        <div className="grid grid-cols-1 gap-4">
                                            <DocumentRow
                                                entityId={currentEq.id!}
                                                projectId={projectId}
                                                category="maintenance_log"
                                                isUploadVisible={isUploadVisible('maintenance_log')}
                                                {...getFieldProps('nextMaintenanceDate', 'Maintenance Log (Registro Manutenção)')}
                                                onToggleValidation={getFieldProps('nextMaintenanceDate', '').onValidate}
                                                canValidate={isManager && mode !== 'create'}
                                                isManager={isManager}
                                                isDataUser={isDataUser}
                                                isApprovalUser={isApprovalUser}
                                                approvalStatus={currentEq.approvalStatus}
                                                canApprove={isApprovalUser && currentEq.workflowStatus === 'validated'}
                                                onApprove={() => approveEquipment(currentEq.id!)}
                                                isEditing={canEdit}
                                            >
                                                <div className="grid grid-cols-2 gap-4">
                                                    <FieldControl {...getFieldProps('lastMaintenanceDate', 'Last Maintenance')}>
                                                        <input type="date" disabled={getFieldProps('lastMaintenanceDate', '').isDisabled} className="w-full p-2.5 border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-primary disabled:bg-gray-50 dark:bg-[#131314] disabled:text-gray-500"
                                                            value={currentEq.lastMaintenanceDate || ''} onChange={e => setCurrentEq({ ...currentEq, lastMaintenanceDate: e.target.value })} />
                                                    </FieldControl>
                                                    <FieldControl {...getFieldProps('nextMaintenanceDate', 'Next Maintenance')}>
                                                        <input type="date" disabled={getFieldProps('nextMaintenanceDate', '').isDisabled} className="w-full p-2.5 border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-primary disabled:bg-gray-50 dark:bg-[#131314] disabled:text-gray-500"
                                                            value={currentEq.nextMaintenanceDate || ''} onChange={e => setCurrentEq({ ...currentEq, nextMaintenanceDate: e.target.value })} />
                                                    </FieldControl>
                                                </div>
                                            </DocumentRow>
                                        </div>
                                    )}

                                    {isVisible('inspection') && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 bg-gray-50 dark:bg-[#131314] p-3 rounded">
                                            <p className="md:col-span-2 text-xs font-semibold text-gray-500 uppercase">Inspections & Certifications</p>
                                            <div className="bg-white dark:bg-surface p-2 border rounded text-sm text-gray-500 flex items-center justify-between">
                                                <span>Inspections Required (Upload in Docs)</span>
                                                {isUploadVisible('inspection_cert') && currentEq.id && (
                                                    <DocumentUpload entityId={currentEq.id} projectId={projectId} category="inspection_cert" layout="button" label="Carregar Certificado" />
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'docs' && mode !== 'create' && (
                                <div className="space-y-4">
                                    <DocumentRow
                                        label="Technical Documentation (Manuals/CE)"
                                        entityId={currentEq.id!}
                                        projectId={projectId}
                                        category="technical_doc"
                                        isUploadVisible={isUploadVisible('technical_manual')}
                                        isManager={isManager}
                                        isDataUser={isDataUser}
                                        isApprovalUser={isApprovalUser}
                                        approvalStatus={currentEq.approvalStatus}
                                        canApprove={isApprovalUser && currentEq.workflowStatus === 'validated'}
                                        onApprove={() => approveEquipment(currentEq.id!)}
                                        isEditing={canEdit}
                                    />

                                    <DocumentRow
                                        label="Inspection Certificates"
                                        entityId={currentEq.id!}
                                        projectId={projectId}
                                        category="inspection_cert"
                                        isUploadVisible={isUploadVisible('inspection_cert')}
                                        isManager={isManager}
                                        isDataUser={isDataUser}
                                        isApprovalUser={isApprovalUser}
                                        approvalStatus={currentEq.approvalStatus}
                                        canApprove={isApprovalUser && currentEq.workflowStatus === 'validated'}
                                        onApprove={() => approveEquipment(currentEq.id!)}
                                        isEditing={canEdit}
                                    />

                                    {selectedProfile?.customDocuments?.map(doc => (
                                        <DocumentRow
                                            key={doc.id}
                                            label={doc.name}
                                            entityId={currentEq.id!}
                                            projectId={projectId}
                                            category={`custom_${doc.id}`}
                                            isUploadVisible={doc.requiresUpload !== false}
                                            isManager={isManager}
                                            isDataUser={isDataUser}
                                            isApprovalUser={isApprovalUser}
                                            approvalStatus={currentEq.approvalStatus}
                                            canApprove={isApprovalUser && currentEq.workflowStatus === 'validated'}
                                            onApprove={() => approveEquipment(currentEq.id!)}
                                            isEditing={canEdit}
                                        >
                                            <div className="text-[11px] text-gray-400 mb-1 uppercase tracking-tighter">
                                                {doc.dataType ? doc.dataType.replace('_', ' ') : 'DOCUMENTO'}
                                            </div>
                                            <input
                                                type={doc.dataType === 'date' ? 'date' : doc.dataType === 'number' ? 'number' : 'text'}
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-blue-500 outline-none transition-all"
                                                value={currentEq.customDocuments?.[doc.id] || ''}
                                                onChange={(e) => {
                                                    setCurrentEq({
                                                        ...currentEq,
                                                        customDocuments: {
                                                            ...currentEq.customDocuments,
                                                            [doc.id]: e.target.value
                                                        }
                                                    })
                                                }}
                                            />
                                        </DocumentRow>
                                    ))}
                                </div>
                            )}
                            {activeTab === 'docs' && mode === 'create' && (
                                <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                                    <FileText size={48} className="mb-2 opacity-50" />
                                    <p>Save equipment first to upload documents.</p>
                                </div>
                            )}
                        </form>
                    </div>


                </div>
            </Modal>

            <ReviewModal
                isOpen={reviewModalOpen}
                onClose={() => setReviewModalOpen(false)}
                onSubmit={handleSubmitReview}
                fieldLabel={reviewField?.label || ''}
            />

            {/* Profile Manager Modal */}
            <ProfileManagerModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
                projectId={projectId}
                entityType="equipment"
            />

            {/* Equipment Card Modal */}
            {cardEq && (
                <EquipmentCardModal
                    isOpen={!!cardEq}
                    onClose={() => setCardEq(null)}
                    equipment={cardEq}
                    project={useStore.getState().projects.find(p => p.id === (cardEq.projectId || projectId))}
                    company={companies.find(c => c.id === cardEq.companyId)}
                />
            )}

            {/* PDF Config Modal */}
            <PDFConfigModal
                isOpen={isPDFModalOpen}
                onClose={() => setIsPDFModalOpen(false)}
                onGenerate={handleGeneratePDF}
            />
        </div>
    );
};

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
    currentValue?: any;
    ticket?: Ticket;
    isManager: boolean;
    onResolveTicket?: () => void;
    isDisabled?: boolean;
    isEditing?: boolean;
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
                        {isValidated && !isEditing && (
                            <div title="Validado" className="text-green-600 bg-green-50 p-1 rounded-full border border-green-200">
                                <Check size={12} strokeWidth={3} />
                            </div>
                        )}
                        <div className="flex items-center gap-1.5">
                            {isEditing && (
                                <>
                                    {canRequestReview && isValidated && (
                                        <button
                                            type="button"
                                            onClick={onRequestReview}
                                            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-white dark:bg-surface text-primary border border-primary/20 hover:bg-primary-light transition-colors shadow-sm"
                                        >
                                            <MessageSquare size={12} /> REVIEW
                                        </button>
                                    )}

                                    {canValidate && (
                                        <button
                                            type="button"
                                            onClick={onValidate}
                                            className={cn(
                                                "flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold transition-all border shadow-sm",
                                                isValidated
                                                    ? "bg-green-600 text-white border-green-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                                                    : "bg-white dark:bg-surface text-gray-600 dark:text-gray-300 border-gray-200 dark:border-[#444746] hover:border-green-300 hover:text-green-700 hover:bg-green-50"
                                            )}
                                            title={isValidated ? "Clique para Invalidar/Desbloquear" : "Clique para Validar"}
                                        >
                                            {isValidated ? (
                                                <>
                                                    <Check size={12} strokeWidth={3} /> VALIDADO
                                                </>
                                            ) : "VALIDAR"}
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

const ReviewModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (message: string) => void;
    fieldLabel: string;
}> = ({ isOpen, onClose, onSubmit, fieldLabel }) => {
    const [message, setMessage] = useState('');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-surface rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-gray-100 dark:border-[#444746] flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Solicitar Revisão</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-surface rounded-lg text-gray-400"><X size={20} /></button>
                </div>
                <div className="p-6">
                    <div className="mb-4">
                        <label className="text-xs font-semibold text-gray-400 uppercase mb-2 block">Campo</label>
                        <div className="text-sm font-medium text-gray-900 dark:text-white bg-gray-50 dark:bg-[#131314] p-3 rounded-xl border border-gray-100 dark:border-[#444746]">{fieldLabel}</div>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-400 uppercase mb-2 block">Justificação / Erro</label>
                        <textarea
                            autoFocus
                            className="w-full h-32 p-4 text-sm border border-gray-200 dark:border-[#444746] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-blue-500 outline-none resize-none transition-all placeholder:text-gray-400"
                            placeholder="Descreva o que está incorreto ou o que precisa ser alterado..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                        />
                    </div>
                </div>
                <div className="p-6 pt-0 flex gap-3">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-surface rounded-xl transition-colors">Cancelar</button>
                    <button
                        onClick={() => { if (message.trim()) { onSubmit(message); setMessage(''); } }}
                        disabled={!message.trim()}
                        className="flex-[2] px-4 py-2.5 text-sm font-medium bg-primary text-white rounded-xl hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/20"
                    >
                        Enviar Solicitação
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EquipmentPage;
