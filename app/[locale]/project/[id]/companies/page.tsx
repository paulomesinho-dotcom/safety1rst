"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useStore } from "@/store/useStore";
import { useShallow } from "zustand/react/shallow";
import {
  LayoutGrid,
  List as ListIcon,
  Building2,
  Plus,
  FileText,
  Link as LinkIcon,
  Download,
  AlertCircle,
  Check,
  X,
  Edit2,
  Trash2,
  ArchiveRestore,
  Eye,
  MoreHorizontal,
  Lock,
  Unlock,
  Shield,
  MoreVertical,
  CornerDownRight,
  CornerUpRight,
  Clock,
  CheckCircle,
  AlertTriangle,
  Settings,
  MessageSquare,
  Archive,
  ChevronDown,
  ChevronUp,
  Search,
  Send,
  Pencil,
  ArrowLeft,
  RefreshCw,
  Forward,
  Save,
  User,
  ClipboardCheck,
  Landmark,
  Paperclip,
  Users,
  Wrench,
  ShieldAlert,
  Info,
  Forklift,
  ExternalLink,
} from "lucide-react";
import { EntityTicketThread } from "@/components/EntityTicketThread";
import { cn } from "@/lib/utils";
import type { Company, Ticket, TicketMessage } from "@/types";
import { Modal, InputGroup, PrimaryButton } from "@/components/Modal";
import {
  COMPANY_ROLE_OPTIONS,
  COMPANY_ROLE_GROUPS,
  getIfcRoleFromCompanyRole,
} from "@/lib/company-ifc-map";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";

import { ConfirmationModal } from "@/components/ConfirmationModal";

import { PDFConfigModal } from "@/components/PDFConfigModal";
import { DocumentUpload } from "@/components/DocumentUpload";
import { DocumentList } from "@/components/DocumentList";
import { WorkflowHistory } from "@/components/WorkflowHistory";
import { TableActionMenu } from "@/components/TableActionMenu";
import {
  archiveCDEFile,
  uploadToEntityFolder,
  deleteCDEFile,
  moveCDEFile,
} from "@/lib/cde-manager";
import { CompanyQuickCreateModal } from "@/components/CompanyQuickCreateModal";
import { nanoid } from "nanoid";

export const getWorkflowStatusColors = (status: string | undefined, role: string | null = null) => {
  if (status === "validated") {
    return "bg-green-50 text-green-700 border border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800";
  }
  if (status === "approved") {
    return "bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800";
  }

  switch (status) {
    case "draft":
    case "incomplete":
      return "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800";
    case "validation_pending":
    case "data_requested":
    case "data_update":
      return "bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800";
    case "approval_pending":
    case "approval_data_update":
      return "bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800";
    case "off_site":
    case "archived":
      return "bg-gray-100 text-gray-600 border border-gray-200 dark:bg-surface dark:text-gray-300 dark:border-[#444746]";
    default:
      return "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800";
  }
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
      <div className="flex-1 overflow-y-auto bg-white dark:bg-surface">
        <div className="max-w-7xl mx-auto p-6 min-h-full">{children}</div>
      </div>

      {/* Sticky Footer */}
      {footerContent && (
        <div className="border-t border-gray-200 dark:border-[#444746] bg-white dark:bg-surface p-4 sticky bottom-0 z-20">
          <div className="max-w-7xl mx-auto flex items-center justify-end gap-3">
            {footerContent}
          </div>
        </div>
      )}
    </div>
  );
};

const ListView: React.FC<{
  companies: Company[];
  globalSequenceMap: Map<string, number>;
  onRowClick: (c: Company) => void;
  onAction: (
    action: "view" | "edit" | "delete" | "restore",
    c: Company,
  ) => void;
  canEdit: boolean;
  canDelete: boolean;
  getValidationStatus: (c: Company) => any;
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
}> = ({
  companies,
  globalSequenceMap,
  onRowClick,
  onAction,
  canEdit,
  canDelete,
  getValidationStatus,
  openMenuId,
  setOpenMenuId,
}) => {
    const t = useTranslations("Companies");
    return (
      <div className="bg-white dark:bg-surface overflow-x-auto w-full">
        <table className="w-full text-xs text-left whitespace-nowrap">
          <thead className="bg-gray-50 dark:bg-[#131314] text-gray-500 font-medium border-b border-gray-200 dark:border-[#444746]">
            <tr>
              <th className="px-6 py-3 w-12 text-center">#</th>
              <th className="px-3 py-3 w-10 text-center" title="Tier Level">
                {t("fields.level")}
              </th>
              <th className="px-6 py-3 max-w-[250px] truncate">
                {t("fields.companyName")}
              </th>
              <th className="px-6 py-3">{t("fields.activity")} / Papel IFC</th>
              <th className="px-6 py-3">{t("fields.contractingCompany")}</th>

              <th className="px-6 py-3">{t("fields.status")}</th>
              <th className="px-6 py-3">Waiting For</th>

              <th className="px-6 py-3 text-right sticky right-0 bg-gray-50 dark:bg-[#131314] z-10">
                {t("fields.actions")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {companies.map((company, index) => {
              const status = getValidationStatus(company);
              const tier = company.tier || 1;
              const indentation = (tier - 1) * 24; // 24px per level

              return (
                <tr
                  key={company.id}
                  onClick={() => onRowClick(company)}
                  className="hover-row transition-colors cursor-pointer group"
                >
                  <td className="px-6 py-4 text-center font-mono text-xs text-gray-400">
                    {globalSequenceMap.get(company.id) || "-"}
                  </td>
                  <td className="px-3 py-4 text-center">
                    <div
                      className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ring-1 ring-inset",
                        tier === 1
                          ? "bg-primary-light text-primary-hover ring-blue-200"
                          : tier === 2
                            ? "bg-purple-50 text-purple-700 ring-purple-200"
                            : "bg-orange-50 text-orange-700 ring-orange-200",
                      )}
                    >
                      {tier}
                    </div>
                  </td>
                  <td className="px-6 py-4 max-w-[250px] truncate">
                    <div
                      className="flex items-center gap-2"
                      style={{ paddingLeft: `${indentation}px` }}
                    >
                      {tier > 1 && (
                        <CornerDownRight
                          size={16}
                          className="text-gray-400 shrink-0"
                        />
                      )}
                      <div
                        className="font-medium text-gray-900 dark:text-white truncate"
                        title={company.name}
                      >
                        {company.name}
                      </div>
                    </div>
                  </td>
                  <td
                    className="px-6 py-4 text-gray-600 dark:text-gray-300 font-medium max-w-[200px] truncate"
                    title={
                      [company.activity, company.ifcActorRole]
                        .filter(Boolean)
                        .join(" - ") || "-"
                    }
                  >
                    {[company.activity, company.ifcActorRole]
                      .filter(Boolean)
                      .join(" - ") || "-"}
                  </td>
                  <td
                    className="px-6 py-4 text-gray-600 dark:text-gray-300 font-medium max-w-[200px] truncate"
                    title={companies.find((c) => c.id === company.parentId)?.name}
                  >
                    {companies.find((c) => c.id === company.parentId)?.name ||
                      "-"}
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border shadow-2xs whitespace-nowrap",
                        status.color,
                      )}
                    >
                      {(status.status === "validated" || status.status === "approved" || status.status === "valid") && <CheckCircle size={12} />}
                      {(status.status === "validation_pending" || status.status === "approval_pending" || status.status === "data_requested" || status.status === "data_update" || status.status === "approval_data_update" || status.status === "draft" || status.status === "incomplete" || status.status === "pending") && <Clock size={12} />}
                      {status.status === "expired" && <AlertTriangle size={12} />}
                      {(status.status === "off_site" || status.status === "archived") && <FileText size={12} />}
                      {status.label}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-gray-500 text-sm whitespace-nowrap">
                    {status.waitingForRole === "data_user" && "Data User"}
                    {status.waitingForRole === "manager" && "Manager"}
                    {status.waitingForRole === "approval_user" && "Approver"}
                    {!status.waitingForRole && "-"}
                  </td>

                  <td className="px-6 py-4 text-right relative sticky right-0 bg-white dark:bg-surface group-hover:bg-gray-50 dark:group-hover:bg-[#1f1f22] z-10">
                    <TableActionMenu
                      isOpen={openMenuId === company.id}
                      onToggle={() =>
                        setOpenMenuId(
                          openMenuId === company.id ? null : company.id,
                        )
                      }
                      onClose={() => setOpenMenuId(null)}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAction("view", company);
                          setOpenMenuId(null);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#131314] flex items-center gap-2"
                      >
                        <Eye size={16} /> {t("actions.viewDetails")}
                      </button>
                      {canEdit && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onAction("edit", company);
                            setOpenMenuId(null);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#131314] flex items-center gap-2"
                        >
                          <Edit2 size={16} /> {t("actions.editCompany")}
                        </button>
                      )}
                      <div className="h-px bg-gray-100 dark:bg-surface my-1" />
                      {canDelete &&
                        (company.archived ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onAction("restore", company);
                              setOpenMenuId(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-green-50 flex items-center gap-2"
                          >
                            <ArchiveRestore size={16} /> {t("actions.restore")}
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onAction("delete", company);
                              setOpenMenuId(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Trash2 size={16} /> {t("actions.archive")}
                          </button>
                        ))}
                    </TableActionMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

const GridView: React.FC<{
  companies: Company[];
  onCardClick: (c: Company) => void;
  getValidationStatus: (c: Company) => any;
}> = ({ companies, onCardClick, getValidationStatus }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {companies.map((company) => (
        <div
          key={company.id}
          onClick={() => onCardClick(company)}
          className="bg-white dark:bg-surface p-5 rounded-xl shadow-sm border border-gray-200 dark:border-[#444746] hover:border-primary/30 transition-all cursor-pointer group hover:shadow-md"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-lg bg-primary-light text-primary flex items-center justify-center">
              <Building2 size={24} />
            </div>
            <span
              className={cn(
                "px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-surface text-gray-600 dark:text-gray-300",
              )}
            >
              Tier {company.tier}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {company.name}
            </h3>
            <p className="text-sm text-gray-500">{company.nif}</p>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-[#444746] flex flex-col gap-2 text-sm text-gray-500">
            <div className="flex justify-between items-center">
              <span className="truncate max-w-[150px]" title={company.siteManager || "No Manager"}>
                {company.siteManager || "No Manager"}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border shadow-2xs whitespace-nowrap",
                  getValidationStatus(company).color,
                )}
              >
                {(getValidationStatus(company).status === "validated" || getValidationStatus(company).status === "approved" || getValidationStatus(company).status === "valid") && <CheckCircle size={12} />}
                {(getValidationStatus(company).status === "validation_pending" || getValidationStatus(company).status === "approval_pending" || getValidationStatus(company).status === "data_requested" || getValidationStatus(company).status === "data_update" || getValidationStatus(company).status === "approval_data_update" || getValidationStatus(company).status === "draft" || getValidationStatus(company).status === "incomplete" || getValidationStatus(company).status === "pending") && <Clock size={12} />}
                {getValidationStatus(company).status === "expired" && <AlertTriangle size={12} />}
                {(getValidationStatus(company).status === "off_site" || getValidationStatus(company).status === "archived") && <FileText size={12} />}
                {getValidationStatus(company).label}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-gray-400 uppercase tracking-wider">Waiting For:</span>
              <span className="font-medium text-gray-600 dark:text-gray-300">
                {getValidationStatus(company).waitingForRole === "data_user" && "Data User"}
                {getValidationStatus(company).waitingForRole === "manager" && "Manager"}
                {getValidationStatus(company).waitingForRole === "approval_user" && "Approver"}
                {!getValidationStatus(company).waitingForRole && "-"}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const DocumentRow: React.FC<{
  label: string;
  entityId: string;
  projectId: string;
  category: string;
  isValidated?: boolean;
  onToggleValidation?: () => void;
  canValidate?: boolean;
  canRequestReview?: boolean;
  onRequestReview?: () => void;
  approvalStatus?: "pending" | "approved" | "rejected";
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
  hasTicket?: boolean;
  workflowStatus?: string;
  onSessionUpload?: (cdeId: string) => void;
  onSessionDelete?: (cdeId: string) => void;
  enableAI?: boolean;
  aiType?: "date" | "text";
  onSmartComplete?: (data: any) => void;
}> = ({
  label,
  entityId,
  projectId,
  category,
  isValidated,
  onToggleValidation,
  canValidate,
  canRequestReview,
  onRequestReview,
  approvalStatus,
  onApprove,
  onReject,
  canApprove,
  isUploadVisible,
  isManager,
  isDataUser,
  isApprovalUser,
  showRequestChange,
  onRequestChange,
  children,
  isEditing,
  hasTicket,
  workflowStatus,
  onSessionUpload,
  onSessionDelete,
  enableAI = true,
  aiType = "date",
  onSmartComplete,
}) => {
    const t = useTranslations("Companies");
    const [isExpanded, setIsExpanded] = useState(false);
    const documents = useStore(useShallow((state) => state.documents));
    const hasDocs = documents.some(
      (d) => d.entityId === entityId && d.category === category && !d.archived,
    );

    useEffect(() => {
      if (hasDocs) {
        setIsExpanded(true);
      }
    }, [hasDocs]);

    return (
      <div className="flex flex-col gap-2 p-3 bg-white dark:bg-surface border border-gray-100 dark:border-[#444746] rounded-xl shadow-sm hover:border-primary/20 transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div
            className="flex items-start sm:items-center gap-3 cursor-pointer flex-1"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div
              className={cn(
                "p-2 rounded-lg transition-colors mt-0.5 sm:mt-0",
                isExpanded
                  ? "bg-primary-light text-primary"
                  : "bg-gray-50 dark:bg-[#131314] text-gray-400",
              )}
            >
              <FileText size={18} />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white leading-tight">
                {label}
              </div>
              <div className="text-[11px] text-gray-400 uppercase tracking-wider mt-0.5">
                {category.replace("_", " ")}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:justify-end">
            {isValidated && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-[10px] font-bold border border-green-100 uppercase">
                <Check size={10} strokeWidth={3} /> {t("common.valid")}
              </span>
            )}
            {hasTicket && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 text-[10px] font-bold border border-orange-100 uppercase">
                <AlertTriangle size={10} strokeWidth={3} /> {t("common.review")}
              </span>
            )}
            {approvalStatus === "approved" && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-light text-primary-hover text-[10px] font-bold border border-primary/10 uppercase">
                <Shield size={10} strokeWidth={3} /> {t("status.approved")}
              </span>
            )}

            <div className="hidden sm:block h-4 w-px bg-gray-200 dark:bg-[#444746] mx-1" />

            <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
              {isUploadVisible &&
                !hasDocs &&
                (isManager || isDataUser || !isApprovalUser) &&
                isEditing && (
                  <DocumentUpload
                    entityId={entityId}
                    projectId={projectId}
                    category={category}
                    layout="button"
                    label="Upload"
                    systemLabel={label}
                    onOperation={(op) => {
                      if (op.type === "upload" && onSessionUpload) {
                        onSessionUpload(op.fileId);
                      }
                    }}
                    enableAI={enableAI}
                    aiType={aiType}
                    onSmartComplete={onSmartComplete}
                  />
                )}

              {isEditing && canRequestReview && onRequestReview && (
                <button
                  type="button"
                  onClick={onRequestReview}
                  title="Solicitar Revisão"
                  className="flex items-center justify-center w-6 h-6 rounded-full bg-white dark:bg-surface text-primary border border-primary/20 hover:bg-primary-light transition-colors shadow-sm"
                >
                  <MessageSquare size={14} />
                </button>
              )}

              {isEditing && canValidate && (
                <button
                  type="button"
                  onClick={onToggleValidation}
                  title={isValidated ? t("common.valid") : t("actions.validate")}
                  className={cn(
                    "flex items-center justify-center w-6 h-6 rounded-full transition-all border",
                    isValidated
                      ? "bg-green-600 text-white border-green-700 shadow-sm"
                      : "bg-white dark:bg-surface text-gray-600 dark:text-gray-300 border-gray-200 dark:border-[#444746] hover:border-green-300 hover:text-green-700 hover:bg-green-50",
                  )}
                >
                  {isValidated ? (
                    <Check size={14} strokeWidth={3} />
                  ) : (
                    <Check size={14} />
                  )}
                </button>
              )}

              {isEditing && canApprove && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={onApprove}
                    title={
                      approvalStatus === "approved"
                        ? t("status.approved")
                        : t("actions.approve")
                    }
                    className={cn(
                      "flex items-center justify-center w-6 h-6 rounded-full transition-all border",
                      approvalStatus === "approved"
                        ? "bg-primary text-white border-blue-700 shadow-sm"
                        : "bg-white dark:bg-surface text-primary border-primary/20 hover:bg-primary-light",
                    )}
                  >
                    {approvalStatus === "approved" ? (
                      <Shield size={14} strokeWidth={3} />
                    ) : (
                      <Shield size={14} />
                    )}
                  </button>
                  {approvalStatus !== "approved" && onReject && (
                    <button
                      type="button"
                      onClick={onReject}
                      className="flex items-center justify-center w-6 h-6 rounded-full text-red-600 hover:bg-red-50 border border-gray-200 dark:border-[#444746] hover:border-red-200 transition-all"
                      title={t("actions.reject")}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        {children && <div className="mt-3 pl-0 sm:pl-11">{children}</div>}
        {isExpanded && (
          <div className="mt-2 pl-0 sm:pl-11 animate-in fade-in slide-in-from-top-2 duration-200">
            <DocumentList
              entityId={entityId}
              projectId={projectId}
              category={category}
              isEditing={isEditing}
              workflowStatus={workflowStatus}
              onDelete={onSessionDelete}
            />
          </div>
        )}
      </div>
    );
  };

export default function CompaniesPage() {
  const t = useTranslations("Companies");
  const params = useParams();
  const router = useRouter();
  const projectId = params?.id as string;

  const {
    companies,
    users,
    currentUser,
    projects,
    companyProfiles,
    addCompany,
    updateCompany,
    archiveCompany,
    restoreCompany,
    tickets,
    ticketMessages,
    createTicket,
    updateTicket,
    resolveTicket,
    archiveTicket,
    addTicketMessage,
    deleteTicketMessage,
    documents,
    addDocument,
    deleteDocument,
    unarchiveDocument,
    getDocumentsByEntity,
    requestCompanyDocumentation,
    updateCompanyStatus,
    approveCompany,
    getProjectResources,
    getUserRoleInProject,
    toggleFieldValidation,
    addCompanyRequest,
    companyRequests,
    resolveCompanyRequest,
    checkCompanyExpirations,
    templates,
    getProjectManager,
    getProjectApprover,
    getCompanyDataUser,
    equipment,
    accidents,
    workers,
  } = useStore(
    useShallow((state) => ({
      companies: state.companies,
      users: state.users,
      currentUser: state.currentUser,
      projects: state.projects,
      companyProfiles: state.companyProfiles,
      addCompany: state.addCompany,
      updateCompany: state.updateCompany,
      archiveCompany: state.archiveCompany,
      restoreCompany: state.restoreCompany,
      tickets: state.tickets,
      ticketMessages: state.ticketMessages,
      createTicket: state.createTicket,
      updateTicket: state.updateTicket,
      resolveTicket: state.resolveTicket,
      archiveTicket: state.archiveTicket,
      addTicketMessage: state.addTicketMessage,
      deleteTicketMessage: state.deleteTicketMessage,
      documents: state.documents,
      addDocument: state.addDocument,
      deleteDocument: state.deleteDocument,
      unarchiveDocument: state.unarchiveDocument,
      getDocumentsByEntity: state.getDocumentsByEntity,
      requestCompanyDocumentation: state.requestCompanyDocumentation,
      updateCompanyStatus: state.updateCompanyStatus,
      approveCompany: state.approveCompany,

      getProjectResources: state.getProjectResources,
      getUserRoleInProject: state.getUserRoleInProject,
      toggleFieldValidation: state.toggleFieldValidation,
      addCompanyRequest: state.addCompanyRequest,
      companyRequests: state.companyRequests,
      resolveCompanyRequest: state.resolveCompanyRequest,
      checkCompanyExpirations: state.checkCompanyExpirations,
      templates: state.templates,
      getProjectManager: state.getProjectManager,
      getProjectApprover: state.getProjectApprover,
      getCompanyDataUser: state.getCompanyDataUser,
      equipment: state.equipment,
      accidents: state.accidents,
      workers: state.workers,
    })),
  );
  const currentProject = projects.find((p) => p.id === projectId);

  // Run Expiration Check on Mount
  useEffect(() => {
    checkCompanyExpirations();
  }, [checkCompanyExpirations]);

  // RBAC
  const userRole = currentUser
    ? getUserRoleInProject(currentUser.id, projectId)
    : null;
  const isManager = userRole === "manager"; // Advanced User

  useEffect(() => {
    console.log("CompaniesPage Role Debug:", {
      currentUser: currentUser?.email,
      role: currentUser?.role,
      projectId,
      userRole,
      isManager,
    });
  }, [currentUser, projectId, userRole, isManager]);
  const isEditor = userRole === "editor"; // Basic User
  const isDataUser = userRole === "data_user"; // Data User
  const canValidate = isManager; // Only Manager can validate fields
  const isViewer = userRole === "viewer"; // Viewer
  const isApprovalUser = userRole === "approval_user"; // Approval User
  const canCreate = isManager || isEditor;
  const canDelete = isManager;
  const canEditDirectly = isManager || isEditor;
  const canRequestEdit = isDataUser;

  const [isActingAsDataUser, setIsActingAsDataUser] = useState(false);
  const effectiveIsManager = isManager && !isActingAsDataUser;
  const effectiveIsDataUser = isDataUser || (isManager && isActingAsDataUser);

  // Approval Logic
  const pendingRequests = companyRequests.filter(
    (r) => r.projectId === projectId && r.status === "pending",
  );
  const [activeCompanies, setActiveCompanies] = useState<Company[]>([]);

  useEffect(() => {
    const resources = getProjectResources(projectId);

    // Sort Hierarchically
    const sorted = [...resources.companies];
    const companyMap = new Map(sorted.map((c) => [c.id, c]));
    const childrenMap = new Map<string, Company[]>();

    sorted.forEach((c) => {
      if (c.parentId) {
        const siblings = childrenMap.get(c.parentId) || [];
        siblings.push(c);
        childrenMap.set(c.parentId, siblings);
      }
    });

    const result: Company[] = [];
    const visited = new Set<string>();

    const visit = (c: Company, tier: number) => {
      if (visited.has(c.id)) return;
      visited.add(c.id);

      // Create a display-only object or assign tier property if mutable (state is fresh copy locally)
      // Ideally we clone it to avoid mutating source if it matters, but 'sorted' is a new array.
      // However, objects inside are refs. Let's start with mutating the copy in result or treating 'tier' as source of truth if we fix it.
      // But we want DYNAMIC tier based on recursion depth.
      const displayCompany = { ...c, tier: tier };

      result.push(displayCompany as Company);
      const kids = childrenMap.get(c.id) || [];
      kids.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      kids.forEach((k) => visit(k, tier + 1));
    };

    const roots = sorted
      .filter((c) => !c.parentId || !companyMap.has(c.parentId))
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    roots.forEach((r) => visit(r, 1)); // Roots are Tier 1

    console.log("[Debug] Updating activeCompanies. Count:", result.length);
    setActiveCompanies(result);
  }, [projectId, getProjectResources, companies]); // Removed stable useStore hook from deps

  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitConfirmationOpen, setIsSubmitConfirmationOpen] =
    useState(false);
  const [confirmationType, setConfirmationType] = useState<
    "submit" | "requestDetails" | "submitReview"
  >("submit");
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "info" | "legal" | "docs" | "site" | "history"
  >("info");

  // Granular Review State (Moved up)
  // Form State
  const initialFormState: Omit<
    Company,
    "id" | "accountId" | "createdAt" | "projectId"
  > & { id?: string } = {
    name: "",
    nif: "",
    email: "",
    phone: "",
    address: "",
    activity: "",
    impic: "",
    entryDate: "",
    workSchedule: "",
    insuranceCivilDate: "",
    insuranceCivilPolicy: "",
    insuranceWorkAccDate: "",
    insuranceWorkAccPolicy: "",
    cleanSSDate: "",
    cleanFinDate: "",
    ssDiscountSheet: "",
    pssAcceptanceDate: "",
    tier: 1,
    parentId: "",
    exitDate: "",
    workScheduleDelivered: false,
    // New Fields
    siteManager: "",
    siteContact: "",
    workflowStatus: "draft",
    fieldValidations: {},
    workflowNotificationCcs: [],
    profileId: "",
    customDocuments: {},
  };
  const [newItem, setNewItem] = useState(initialFormState);
  const [mode, setMode] = useState<"create" | "details">("create");
  const [sessionUploads, setSessionUploads] = useState<string[]>([]);

  const handleSessionUpload = (cdeId: string) => {
    setSessionUploads((prev) => [...prev, cdeId]);
  };

  const handleSessionDelete = (cdeId: string) => {
    setSessionUploads((prev) => prev.filter((id) => id !== cdeId));
  };

  const handleCustomCancel = async () => {
    setCorrectedFields({});
    setPendingTicketActions(new Map());
    console.log(
      "Cancelling with Rollback. Cleanup counts:",
      sessionUploads.length,
    );

    for (const cdeId of sessionUploads) {
      const docToDelete = documents.find((d) => d.cdeFileId === cdeId);
      if (docToDelete && currentProject?.cdeConfig?.connected) {
        try {
          console.log("Rolling back upload:", docToDelete.name);
          await deleteCDEFile(currentProject.cdeConfig, cdeId);

          // Revert Logic (Same as DocumentList)
          const isPreWorkflow =
            !newItem.workflowStatus ||
            ["draft", "data_requested", "data_update"].includes(
              newItem.workflowStatus,
            );
          if (isPreWorkflow) {
            const previousVer = documents.find(
              (d) =>
                d.entityId === docToDelete.entityId &&
                d.category === docToDelete.category &&
                d.archived &&
                d.version === (docToDelete.version || 1) - 1,
            );
            if (previousVer) {
              console.log("Restoring previous version:", previousVer.name);
              unarchiveDocument(previousVer.id);
            }
          }
          deleteDocument(docToDelete.id);
        } catch (e) {
          console.error("Rollback failed for", cdeId, e);
        }
      }
    }
    setSessionUploads([]);
    setIsModalOpen(false);
  };

  const editingItem = newItem as Company;
  // FIX: Allow Data User to edit in approval_data_update status (when Manager forwards tickets)
  const disableInputs =
    !isEditing ||
    newItem.workflowStatus === "validated" ||
    (newItem.workflowStatus === "validation_pending" && !isManager) ||
    (newItem.workflowStatus === "approval_data_update" && !isDataUser); // Strictly allow Data User in approval_data_update
  const canPerformValidation = isManager;
  // Waiting For Logic
  const getWaitingForRole = (c: Company) => {
    if (c.workflowStatus === "validated" || c.workflowStatus === "approved") {
      return null;
    }

    const openTickets = tickets.filter(
      (t) => t.entityId === c.id && t.status === "open"
    );

    if (openTickets.length > 0) {
      let hasDataUserTicket = false;
      let hasManagerTicket = false;

      for (const t of openTickets) {
        const role = getUserRoleInProject(t.assignedTo || "", projectId);
        if (role === "data_user") hasDataUserTicket = true;
        if (role === "manager") hasManagerTicket = true;
      }

      if (hasDataUserTicket) return "data_user";
      if (hasManagerTicket) return "manager";

      if (c.workflowStatus === "validation_pending" || c.workflowStatus === "approval_data_update" || c.workflowStatus === "draft") {
        return "manager";
      }
      return "approval_user";
    }

    switch (c.workflowStatus) {
      case "draft":
        return "manager"; // Draft: manager still needs to send to data user
      case "data_requested":
      case "data_update":
        return "data_user";
      case "validation_pending":
      case "approval_data_update":
        return "manager";
      case "approval_pending":
        return "approval_user";
      default:
        return null;
    }
  };

  const currentWaitingForRole = getWaitingForRole(newItem as Company);
  const canEditThisItem =
    (canEditDirectly &&
      !(isManager && newItem.workflowStatus === "approval_pending")) ||
    (effectiveIsDataUser && currentWaitingForRole === "data_user") ||
    (isApprovalUser && newItem.workflowStatus === "approval_pending");

  const [ticketConfirmation, setTicketConfirmation] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => { } });

  // Track deferred ticket actions (all committed on Submit)
  type PendingTicketAction =
    | "forward"
    | "resolve"
    | "request_revision"
    | "open";
  const [pendingTicketActions, setPendingTicketActions] = useState<
    Map<string, PendingTicketAction>
  >(new Map());

  const handleSetTicketAction = (
    ticketId: string,
    action: PendingTicketAction,
  ) => {
    setPendingTicketActions((prev) => {
      const next = new Map(prev);
      if (next.get(ticketId) === action) {
        // Toggle off if same action clicked again (undo)
        next.delete(ticketId);

        // FIX: If undoing a 'resolve', auto-remove validation from the field
        // so that a field with an open ticket cannot remain validated.
        if (action === "resolve") {
          const ticket = tickets.find((t) => t.id === ticketId);
          const fieldId = ticket?.fieldId;
          if (fieldId) {
            setNewItem((prev: any) => ({
              ...prev,
              fieldValidations: {
                ...(prev.fieldValidations || {}),
                [fieldId]: false,
              },
            }));
          }
        }
      } else {
        // Set new action (replaces any existing)
        next.set(ticketId, action);
      }
      return next;
    });
  };

  // Helper for Data User Submission (Strict Validation) - Defined at top level to avoid Hook Rules violation
  // "All fields mandatory except Entry Date and Expected Exit Date"
  // Moved isDataUserReady below correctedFields definition to avoid ReferenceError

  const getFieldProps = (id: string, label: string) => {
    const fieldIdForTicket = id.startsWith("custom_")
      ? id.replace("custom_", "")
      : id;
    const openTickets = tickets.filter(
      (t) =>
        t.entityId === (editingItem as any).id &&
        t.fieldId === fieldIdForTicket &&
        t.status === "open",
    );
    const hasOpenTicket = openTickets.length > 0;
    const ticket = openTickets[0]; // For single ticket reference if needed
    const liveCompany = companies.find((c) => c.id === editingItem?.id);
    // Resolve Data User for Ticket Thread Display
    const companyDataUser = users?.find(
      (u) => u.id === editingItem?.assignedDataUserId,
    );

    // Use newItem for immediate visual feedback when clicking VALIDATE
    const isValidated = newItem.fieldValidations?.[id] === true;

    // Locking Logic
    const lastEditor = liveCompany?.fieldLastEditors?.[id];
    const isManagerEdited = lastEditor === "manager" && !canEditDirectly;

    // Always lock these fields for Data Users
    const isHardLocked =
      ["name", "profileId", "parentId"].includes(id) && !canEditDirectly;

    // Check persistence: If any open ticket has the "Correction" message as its latest message
    let correctionDate: string | undefined;

    const correctionTicket = openTickets.find((ticket) => {
      const msgs =
        ticketMessages?.filter((m) => m.ticketId === ticket.id) || [];
      const latest = msgs.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0];
      // Check for both Portuguese and English messages
      if (
        latest?.message &&
        (latest.message.startsWith("Correção efetuada") ||
          latest.message.startsWith("Correction made"))
      ) {
        correctionDate = latest.createdAt;
        return true;
      }
      return false;
    });

    // CORRECTION LOGIC FIX:
    // A field is "Corrected" (Locked Pending Review) ONLY if:
    // 1. User manually marked it as corrected (local state) OR
    // 2. There is a correction ticket, BUT it is assigned to someone else (Manager).
    // If the ticket is assigned to ME (Data User), it is "Changes Requested" -> Editable -> NOT Corrected.
    // REVISION FIX: If ticket was sent back for revision (latest message is NOT a correction),
    // ignore local correctedFields state — user is starting a fresh correction cycle.

    const effectiveUserIdForCorrection =
      isActingAsDataUser && editingItem.assignedDataUserId
        ? editingItem.assignedDataUserId
        : currentUser?.id;
    const correctionTicketAssignedToMe =
      correctionTicket &&
      correctionTicket.assignedTo === effectiveUserIdForCorrection;

    // FIX: Always respect local correctedFields state (session-based).
    // Previous logic checking isRevisionRequested prevented re-correction for Data User until new message was added.
    const localCorrected = !!correctedFields[id];
    const isCorrected =
      localCorrected || (!!correctionTicket && !correctionTicketAssignedToMe);

    // STRICT LOCKING LOGIC
    // Phases where fields are locked for EVERYONE (including Managers) unless a ticket is open
    // FIX: 'data_requested' should also be strict for Managers (unless acting as Data User)
    // Data User is allowed to edit in 'data_requested' (handled by !effectiveIsManager check below)

    // EXPANDED: "para todos os status, dados já entraram em workflow" -> Everything except Draft and Data Requested
    const isStrictCorrectionPhase = [
      "data_update",
      "approval_data_update",
      "validation_pending",
      "validated",
      "approval_pending",
      "approved",
      "off_site",
    ].includes(editingItem.workflowStatus || "");
    const isDataRequested = editingItem.workflowStatus === "data_requested";

    const baseLocked = isValidated || isManagerEdited || isHardLocked;
    let locked = baseLocked;

    if (isStrictCorrectionPhase || (isDataRequested && effectiveIsManager)) {
      // In strict phases OR if Manager is viewing 'data_requested', everything is locked by default
      locked = true;

      // UNLOCK checks:
      // - Approvers: NEVER unlock fields
      // - Data Users: unlock when they have assigned tickets to make corrections
      // - Managers: unlock ONLY when they have Approver-created tickets (need to correct themselves)
      // - Managers with self-created tickets (validation_pending): stay locked
      if (isApprovalUser) {
        // Approvers can never edit fields
        locked = true;
      } else if (!effectiveIsManager) {
        // Data User unlock
        const targetUserId =
          effectiveIsDataUser && editingItem.assignedDataUserId
            ? editingItem.assignedDataUserId
            : currentUser?.id;
        const ticketAssignedToMe = openTickets.some(
          (t) =>
            t.assignedTo === targetUserId ||
            t.createdBy === "system" ||
            t.createdBy === "auto",
        );

        // RESTORED: !isCorrected so the Corrigir button correctly locks the field.
        // Safe now because setCorrectedFields is no longer called inside onChange handlers.
        if (hasOpenTicket && ticketAssignedToMe && !isCorrected) {
          locked = false;
        }
      } else {
        // Manager unlock: only for Approver-created tickets
        const hasApproverTicketAssignedToMe = openTickets.some((t) => {
          if (t.assignedTo !== currentUser?.id) return false;
          const creatorRole =
            projectId && getUserRoleInProject
              ? getUserRoleInProject(t.createdBy, projectId)
              : undefined;
          return creatorRole === "approval_user";
        });

        // RESTORED: !isCorrected so the Corrigir button correctly locks the field.
        // Safe now because setCorrectedFields is no longer called inside onChange handlers.
        if (hasOpenTicket && hasApproverTicketAssignedToMe && !isCorrected) {
          locked = false;
        }
      }

      // DEBUG: Trace why field is locked
      /*
            if (openTickets.length > 0) {
                 console.log(`[getFieldProps] ${id} Locking Debug:`, {
                    status: editingItem.workflowStatus,
                    isStrictCorrectionPhase,
                    locked,
                    hasOpenTicket,
                    isCorrected,
                    ticketAssignedToMe,
                    effectiveUserId,
                    currentUser: currentUser?.id,
                    acting: isActingAsDataUser
                 });
            }
            */
    } else {
      // Normal Phases (Draft only basically)
      if (!effectiveIsManager && !isApprovalUser) {
        // FIX: In normal phases, field should stay unlocked as long as ticket is open
        // Do not lock it simply because `isCorrected` became true locally while typing
        if (hasOpenTicket) {
          locked = false; // explicitly unlocked for correction
        }
      }
    }

    let ticketDotColor = "#f97316"; // Default: Orange (Pedido de Review)
    if (hasOpenTicket) {
      for (const t of openTickets) {
        const pendingAction = pendingTicketActions?.get(t.id);
        if (pendingAction === "forward") {
          ticketDotColor = "#a855f7";
          break;
        }
        if (pendingAction === "resolve") {
          ticketDotColor = "#22c55e"; // Green (Resolved)
          break;
        }
        if (pendingAction === "request_revision") {
          ticketDotColor = "#f97316"; // Orange (Review)
          break;
        }

        const tMsgs =
          ticketMessages
            ?.filter((m) => m.ticketId === t.id)
            .sort(
              (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime(),
            ) || [];
        const latestMsg = tMsgs.length > 0 ? tMsgs[tMsgs.length - 1] : null;
        if (latestMsg) {
          const msgTxt = latestMsg.message.toLowerCase();
          if (msgTxt.includes("correction") || msgTxt.includes("correção")) {
            ticketDotColor = "#3b82f6"; // Blue (Pedido de Validação Corrigido)
            break;
          } else if (
            msgTxt.includes("revision") ||
            msgTxt.includes("revisão")
          ) {
            ticketDotColor = "#f97316"; // Orange (Review)
          }
        }
      }
    }

    const props = {
      label,
      isEditing: isEditing,
      currentValue: id.startsWith("custom_")
        ? (editingItem as any).customDocuments?.[id.replace("custom_", "")]
          ?.value
        : (editingItem as any)[id],
      isValidated,
      isInvalid: false,
      isLocked: locked,
      hasOpenTicket: hasOpenTicket,
      ticketDotColor: ticketDotColor,
      tickets: openTickets,
      ticketMessages: ticketMessages?.filter((m) =>
        openTickets.some((t) => t.id === m.ticketId),
      ),
      isManager: effectiveIsManager, // Pass validation/management capability
      isDataUser: effectiveIsDataUser, // Pass role for reply visibility
      isCorrected: isCorrected,
      isApprovalUser: isApprovalUser,
      companyDataUser: companyDataUser,
      currentWaitingForRole: currentWaitingForRole,
      // Actions
      onValidate: () => {
        const isValidating = !isValidated;

        const executeValidation = () => {
          // FIX: DEFERRED VALIDATION - If Manager is reviewing (validation_pending), save validation to draftData!
          // REMOVED IMMEDIATE STORE UPDATE: Validation is now only local until SAVE is clicked.
          // This creates a consistent 'Cancel' behavior for both Validated and Validation Pending statuses.

          /*
                    const isDraftReview = isManager && editingItem.workflowStatus === 'validation_pending';

                    if (isDraftReview) {
                        const currentDraft = (editingItem.draftData || {}) as Partial<Company>;
                        const newValidations = { ...((newItem as any).fieldValidations || {}), [id]: isValidating };
                        const newDraftData = { ...currentDraft, fieldValidations: newValidations };
                        updateCompany((newItem as any).id, { draftData: newDraftData });
                    } else {
                        toggleFieldValidation((newItem as any).id, id, isValidating);
                    }
                    */

          if (!isValidating) {
            // Re-open tickets if un-validating
            const resolvedTickets = tickets.filter(
              (t) =>
                t.entityId === (newItem as any).id &&
                t.fieldId === id &&
                t.status === "resolved",
            );
            resolvedTickets.forEach((t) =>
              updateTicket(t.id, { status: "open" }),
            );
          }

          setNewItem((prev: any) => ({
            ...prev,
            fieldValidations: {
              ...prev.fieldValidations,
              [id]: isValidating,
            },
          }));
        };

        executeValidation();
      },
      onRequestReview: () => {
        setReviewField({ id, label, currentValue: (editingItem as any)[id] });
        setReviewModalOpen(true);
      },
      onResolveTicket: (ticketId: string) => {
        resolveTicket(ticketId);
      },
      onArchiveTicket: (ticketId: string) => {
        archiveTicket(ticketId);
      },

      onAddMessage: (ticketId: string, msg: string) => {
        if (currentUser) addTicketMessage(ticketId, msg, currentUser.id);
      },
      onToggleCorrection: (val: boolean) => {
        const newCorrected = { ...correctedFields, [id]: val };
        setCorrectedFields((prev) => newCorrected);

        // When marking as corrected (val = true)
        if (val && canEditThisItem) {
          // 1. Save the field value immediately (so it doesn't get lost on refresh before submit)
          const docId = id.startsWith("custom_")
            ? id.replace("custom_", "")
            : null;
          const fieldValue = docId
            ? (newItem as any).customDocuments?.[docId]?.value
            : (newItem as any)[id];

          // FIX: DEFERRED MERGE - If Data User (or Manager Reviewing), save to draftData!
          // This prevents visibility to other users until submission/approval.

          const isManagerReviewing =
            effectiveIsManager &&
            editingItem.workflowStatus === "validation_pending";
          const isDataUserEditing =
            effectiveIsDataUser &&
            (editingItem.workflowStatus === "draft" ||
              editingItem.workflowStatus === "data_requested" ||
              editingItem.workflowStatus === "data_update" ||
              editingItem.workflowStatus === "approval_data_update");

          if (isDataUserEditing || isManagerReviewing) {
            const currentDraft = (editingItem.draftData ||
              {}) as Partial<Company>;
            let newDraft;
            if (docId) {
              newDraft = {
                ...currentDraft,
                customDocuments: {
                  ...(currentDraft.customDocuments || {}),
                  [docId]: {
                    ...((currentDraft.customDocuments as any)?.[docId] || {}),
                    value: fieldValue,
                  },
                },
              };
            } else {
              newDraft = { ...currentDraft, [id]: fieldValue };
            }

            console.log(
              `[onToggleCorrection] Saving to draftData: ${id} = ${fieldValue}`,
            );
            updateCompany((newItem as any).id, { draftData: newDraft });
          } else {
            // Direct update for others (or if not in draft mode)
            let fieldUpdate;
            if (docId) {
              fieldUpdate = {
                customDocuments: {
                  ...((newItem as any).customDocuments || {}),
                  [docId]: {
                    ...((newItem as any).customDocuments?.[docId] || {}),
                    value: fieldValue,
                  },
                },
              };
            } else {
              fieldUpdate = { [id]: fieldValue };
            }
            console.log(
              `[onToggleCorrection] Saving to Root: ${id} = ${fieldValue}`,
            );
            updateCompany((newItem as any).id, fieldUpdate);
          }

          // Immediately add correction message to ticket so the dot turns blue now
          // This persists the correction state so it survives reloads (not just local state)
          const fieldIdForMsg = id.startsWith("custom_")
            ? id.replace("custom_", "")
            : id;
          const openTicketsForField = tickets.filter(
            (t) =>
              t.entityId === (newItem as any).id &&
              t.fieldId === fieldIdForMsg &&
              t.status === "open",
          );
          if (currentUser) {
            openTicketsForField.forEach((t) => {
              // Limpar mensagens de correção/edição anteriores
              const tMsgs = ticketMessages?.filter((m) => m.ticketId === t.id) || [];
              const oldSystemMsgs = tMsgs.filter(
                (m) =>
                  m.message.startsWith("Correção efetuada") ||
                  m.message.startsWith("Correction made") ||
                  m.message.startsWith("Campo em edição") ||
                  m.message.startsWith("Field in edit")
              );
              oldSystemMsgs.forEach((m) => deleteTicketMessage(m.id));

              const msgText = effectiveIsManager
                ? "Correção efetuada pelo manager."
                : "Correção efetuada pelo utilizador. Aguarda validação.";
              addTicketMessage(
                t.id,
                msgText,
                currentUser.id,
              );
            });
          }
        } else {
          // Unlocking: add message so the dot goes back to orange (not blue)
          const fieldIdForMsg = id.startsWith("custom_")
            ? id.replace("custom_", "")
            : id;
          const openTicketsForField = tickets.filter(
            (t) =>
              t.entityId === (newItem as any).id &&
              t.fieldId === fieldIdForMsg &&
              t.status === "open",
          );
          if (currentUser) {
            openTicketsForField.forEach((t) => {
              // Limpar mensagens de correção/edição anteriores
              const tMsgs = ticketMessages?.filter((m) => m.ticketId === t.id) || [];
              const oldSystemMsgs = tMsgs.filter(
                (m) =>
                  m.message.startsWith("Correção efetuada") ||
                  m.message.startsWith("Correction made") ||
                  m.message.startsWith("Campo em edição") ||
                  m.message.startsWith("Field in edit")
              );
              oldSystemMsgs.forEach((m) => deleteTicketMessage(m.id));

              const msgText = effectiveIsManager
                ? "Campo em edição novamente pelo manager."
                : "Campo em edição novamente.";
              addTicketMessage(
                t.id,
                msgText,
                currentUser.id,
              );
            });
          }
        }
      },
      // Permissions
      // Permissions
      // FIX: Hide Validate button if there is an open ticket (must resolve first), UNLESS Manager corrected the field
      canValidate:
        mode !== "create" &&
        // Manager can validate in all relevant statuses (except draft, data_requested, approval_pending, approved, validated)
        ((
          (!hasOpenTicket || isCorrected) &&
          effectiveIsManager &&
          editingItem.workflowStatus !== "draft" &&
          editingItem.workflowStatus !== "data_requested" &&
          editingItem.workflowStatus !== "approval_pending" &&
          editingItem.workflowStatus !== "approved" &&
          editingItem.workflowStatus !== "validated"
        ) ||
          // Approver can validate in approval_pending after resolving the field's ticket
          (
            isApprovalUser &&
            editingItem.workflowStatus === "approval_pending" &&
            (!hasOpenTicket || pendingTicketActions.get(openTickets[0]?.id) === "resolve")
          )),
      canUnlock: false,
      // FIX: Enforce "One Ticket Per Field" - Hide Review button if ticket exists
      // FIX: Allowed Review in all valid phases for manager, even if validated
      canRequestReview:
        !hasOpenTicket &&
        ((
          mode !== "create" &&
          effectiveIsManager &&
          editingItem.workflowStatus !== "draft" &&
          editingItem.workflowStatus !== "data_requested" &&
          !isStrictCorrectionPhase) ||
          (mode !== "create" &&
            isApprovalUser &&
            editingItem.workflowStatus === "approval_pending") ||
          (isStrictCorrectionPhase && effectiveIsManager)),

      // STRICT LOCKING IMPLEMENTATION for isDisabled
      isDisabled:
        !isEditing ||
        (isStrictCorrectionPhase
          ? locked // In strict phases, even Managers cannot bypass the lock unless unlocked by a ticket
          : locked && !canEditDirectly), // In normal phases, Managers can bypass standard locks (validation, etc.)

      users: users,
      correctionDate: correctionDate,
      workflowStatus: editingItem.workflowStatus,
      projectId,
      onUpdateTicket: updateTicket,
      onUpdateCompanyStatus: (id: string, s: string) =>
        updateCompanyStatus(id, s as any),
      getUserRoleInProject,
      pendingTicketActions,
      onSetTicketAction: handleSetTicketAction,
      dataUserId: editingItem.assignedDataUserId,
      onForceValidate: (newState: boolean) => {
        toggleFieldValidation((newItem as any).id, id, newState);
        setNewItem((prev: any) => ({
          ...prev,
          fieldValidations: {
            ...prev.fieldValidations,
            [id]: newState,
          },
        }));
      },
    };
    return props;
  };

  const handleSubmitReview = (message: string) => {
    if (!reviewField || !editingItem) return;

    // Use helper functions to find the correct users
    const projectManager = getProjectManager(projectId);
    // FIX: Resolve Data User from local state first (newItem), then fallback to store
    const effectiveDataUserId =
      (editingItem as any).assignedDataUserId ||
      (editingItem.id ? getCompanyDataUser(editingItem.id)?.id : undefined);
    const companyDataUser = users.find((u) => u.id === effectiveDataUserId);

    let assignTo: string | undefined;

    if (isApprovalUser) {
      // Approver always assigns to Manager
      assignTo = projectManager?.id;
      if (!assignTo) {
        console.warn(
          "[Ticket Assignment] No Manager found for project. Ticket will be unassigned.",
        );
      }
      // 2. Process Corrected Fields (Defer Ticket Reassignment)
      // Iterate over all fields marked as corrected in this session
      Object.entries(correctedFields).forEach(([fieldId, isCorrected]) => {
        const ticket = tickets.find(
          (t) =>
            t.entityId === editingItem.id &&
            t.fieldId === fieldId &&
            t.status !== "resolved" &&
            t.status !== "closed",
        );

        if (isCorrected && ticket && currentUser) {
          // Reassign to Manager
          const manager = getProjectManager(projectId);
          if (manager) {
            updateTicket(ticket.id, {
              assignedTo: manager.id,
              status: "open",
            });

            addTicketMessage(
              ticket.id,
              `Correction made. Reassigned to Manager.`,
              currentUser.id,
            );
          }
        }
      });

      if (isManager) {
        // Manager Save: Just save the data
      }
    } else if (isManager) {
      // Manager assigns to Data User, or to themselves if no Data User
      assignTo = companyDataUser?.id || currentUser?.id;
      if (!companyDataUser) {
        console.warn(
          "[Ticket Assignment] No Data User assigned to company. Assigning to Manager.",
        );
      }
    } else {
      // Data User assigns to Manager (fallback)
      assignTo = projectManager?.id;
      if (!assignTo) {
        console.warn(
          "[Ticket Assignment] No Manager found for project. Ticket will be unassigned.",
        );
      }
    }

    console.log("[Ticket Assignment]", {
      isApprovalUser,
      isManager,
      isDataUser,
      projectManager: projectManager?.email,
      companyDataUser: companyDataUser?.email,
      assignTo,
      currentUser: currentUser?.email,
    });

    // FIX: Check for existing active ticket for this field to prevent duplicates
    const existingTicket = tickets.find(
      (t) =>
        t.entityId === editingItem.id &&
        t.fieldId === reviewField.id &&
        (t.status === "open" || t.status === "resolved")
    );

    if (existingTicket && currentUser) {
      // Append message to existing ticket and ensure it's open and assigned correctly
      updateTicket(existingTicket.id, {
        assignedTo: assignTo,
        status: "open",
        isDraft: true,
        valueAtReview: JSON.stringify(reviewField.currentValue),
      });

      addTicketMessage(
        existingTicket.id,
        message, // Use the new review message
        currentUser.id
      );

      handleSetTicketAction(existingTicket.id, "open");
    } else {
      // Create a brand new ticket
      const newTicketId = nanoid();
      createTicket({
        id: newTicketId,
        entityId: editingItem.id,
        projectId,
        type: "field_review",
        fieldId: reviewField.id,
        title: `Review: ${reviewField.label}`,
        description: message,
        priority: "medium",
        createdBy: currentUser?.id || "unknown",
        assignedTo: assignTo,
        isDraft: true,
        valueAtReview: JSON.stringify(reviewField.currentValue),
      });

      // Immediately set as 'open' action for submission
      handleSetTicketAction(newTicketId, "open");
    }

    // FIX 1: If Approver or Manager creates a review ticket, unvalidate the field automatically
    if ((isApprovalUser || isManager) && editingItem.id && reviewField.id) {
      toggleFieldValidation(editingItem.id, reviewField.id, false);
      setNewItem((prev: any) => ({
        ...prev,
        fieldValidations: {
          ...prev.fieldValidations,
          [reviewField.id]: false,
        },
      }));
    }

    // WORKFLOW STATE MACHINE
    // Strict transitions based on User Role and Current Status
    const currentStatus = editingItem.workflowStatus;
    let newStatus = currentStatus;

    // APPROVER & MANAGER: DO NOT CHANGE STATUS IMMEDIATELY
    // Status change is deferred to "Submeter para Revisão" or "Request Details" buttons.
    // This allows batching of feedback tickets without locking the UI.

    // Apply Status Change if needed (REMOVED - Deferred)
    // if (newStatus !== currentStatus && editingItem.id) {
    //    console.log(`[Workflow] Transitioning from ${currentStatus} to ${newStatus}`);
    //    updateCompanyStatus(editingItem.id, newStatus);
    //    setNewItem((prev: any) => ({ ...prev, workflowStatus: newStatus }));
    // }

    setReviewField(null);
  };

  useEffect(() => {
    if (isModalOpen && mode === "create") {
      setActiveTab("info");
    }
  }, [isModalOpen, mode]);

  // Auto-select default profile ON CREATE
  useEffect(() => {
    if (mode === "create" && !newItem.profileId && isModalOpen) {
      const defaultId =
        currentProject?.defaultCompanyProfileId ||
        `profile_std_company_${projectId}`;
      setNewItem((prev: any) => ({ ...prev, profileId: defaultId }));
    }
  }, [
    mode,
    isModalOpen,
    currentProject?.defaultCompanyProfileId,
    projectId,
    newItem.profileId,
  ]);

  // Validation Logic
  const getValidationStatus = (c: Company) => {
    const missingFields: string[] = [];
    const expiredFields: string[] = [];
    const unvalidatedFields: string[] = [];
    const validations = c.fieldValidations || {};
    const workflowStatus = c.workflowStatus || "draft";

    const checkField = (key: keyof Company, label: string) => {
      if (!c[key]) {
        missingFields.push(label);
      } else if (
        workflowStatus === "validation_pending" ||
        workflowStatus === "validated" ||
        workflowStatus === "approval_pending" ||
        workflowStatus === "approval_data_update"
      ) {
        if (!validations[key as string]) {
          unvalidatedFields.push(label);
        }
      }
    };

    // Mandatory Fields Check (Must map to fields with explicit Validate buttons)
    checkField("name", t("fields.companyName"));
    checkField("nif", t("fields.nif"));
    // profileId and parentId don't have VALIDATE buttons, so we don't check validation for them

    checkField("email", t("fields.email"));
    checkField("phone", t("fields.phone"));
    checkField("address", t("fields.address"));
    checkField("activity", t("fields.activity"));
    checkField("impic", t("fields.impic"));


    // Dates Check
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const checkDate = (
      dateStr: string | undefined,
      label: string,
      key: string,
      hasExpiry = true,
    ) => {
      if (!dateStr) {
        missingFields.push(label);
      } else {
        const d = new Date(dateStr);
        d.setHours(0, 0, 0, 0);
        // Only flag as expired if: field has expiry, date is in the past,
        // AND the field has NOT been validated by the manager.
        // Manager validation explicitly overrides expired state.
        if (hasExpiry && d < today && !validations[key]) {
          expiredFields.push(label);
        }
        if (
          (workflowStatus === "validation_pending" ||
            workflowStatus === "validated" ||
            workflowStatus === "approval_pending" ||
            workflowStatus === "approval_data_update") &&
          !validations[key]
        ) {
          unvalidatedFields.push(label);
        }
      }
    };

    // Helper for monthly fields: expires on the 1st of the NEXT month after the stored date.
    // e.g. date = "2026-02" → expiry = 2026-03-01
    const checkMonthlyDate = (dateStr: string | undefined, label: string, key: string) => {
      if (!dateStr) {
        missingFields.push(label);
      } else {
        const d = new Date(dateStr);
        d.setHours(0, 0, 0, 0);
        // Expiry = 1st of next month
        const expiry = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        if (expiry <= today && !validations[key]) {
          expiredFields.push(label);
        }
        if (
          (workflowStatus === "validation_pending" ||
            workflowStatus === "validated" ||
            workflowStatus === "approval_pending" ||
            workflowStatus === "approval_data_update") &&
          !validations[key]
        ) {
          unvalidatedFields.push(label);
        }
      }
    };

    // Optional Dates (Validation required ONLY if filled - check if they have validation buttons first!)
    // In this app, only the main requirements have validation buttons.

    // Requirements-based checks (Standard)
    const checkRequirement = (
      hasReq: boolean | undefined,
      dateKey: keyof Company,
      policyKey: keyof Company | undefined,
      labelBase: string,
      hasExpiry = true,
    ) => {
      if (hasReq) {
        checkDate(
          (c as any)[dateKey],
          `${labelBase} (Date)`,
          dateKey as string,
          hasExpiry,
        );
        if (policyKey && (c as any)[policyKey]) {
          // Check validation for Policy Number if present
          if (
            (workflowStatus === "validation_pending" ||
              workflowStatus === "validated" ||
              workflowStatus === "approval_pending" ||
              workflowStatus === "approval_data_update") &&
            !validations[policyKey as string]
          ) {
            unvalidatedFields.push(`${labelBase} (Doc/Ref)`);
          }
        }
      }
    };

    // We need the profile to know requirements.
    // We can find it from store using c.profileId
    const companyProfile = companyProfiles.find((p) => p.id === c.profileId);
    const reqs = companyProfile?.requirements || {};

    checkRequirement(
      reqs.insurance_at,
      "insuranceWorkAccDate",
      "insuranceWorkAccPolicy",
      "Workers Comp",
    );
    checkRequirement(
      reqs.insurance_rc,
      "insuranceCivilDate",
      "insuranceCivilPolicy",
      "Civil Liability",
    );

    checkRequirement(
      reqs.finance_ss,
      "cleanSSDate",
      undefined,
      "Social Security",
    );
    checkRequirement(
      reqs.finance_fin,
      "cleanFinDate",
      undefined,
      "Tax Authority",
    );
    if (reqs.ss_discount) {
      // ssDiscountSheet is monthly – expires on 1st of the following month
      checkMonthlyDate(
        (c as any)["ssDiscountSheet"],
        "Wage Sheet (Date)",
        "ssDiscountSheet",
      );
    }
    checkRequirement(
      reqs.pss_acceptance,
      "pssAcceptanceDate",
      undefined,
      "H&S Plan",
      false, // PSS acceptance does not have an expiry date — past dates are valid
    );

    // Custom Documents
    if (companyProfile?.customDocuments) {
      companyProfile.customDocuments.forEach((doc) => {
        if (doc.requiresUpload !== false) {
          const key = `custom_${doc.id}`;

          if (
            !doc.dataType ||
            (doc.dataType as any) === "document" ||
            (doc.dataType as any) === "file"
          ) {
            const hasDoc = documents.some(
              (d: any) =>
                d.entityId === c.id && d.category === doc.id && !d.archived,
            );
            if (!hasDoc) {
              missingFields.push(doc.name);
            }
          } else {
            const hasValue = (c.customDocuments?.[doc.id] as any)?.value;
            if (!hasValue && hasValue !== false && hasValue !== "false") {
              missingFields.push(doc.name);
            }
          }

          if (
            workflowStatus === "validation_pending" ||
            workflowStatus === "validated" ||
            workflowStatus === "approval_pending" ||
            workflowStatus === "approval_data_update"
          ) {
            if (!validations[key]) {
              unvalidatedFields.push(doc.name);
            }
          }
        }
      });
    }

    // entryDate and exitDate do NOT have confirmation buttons in UI, so we SKIP them in unvalidatedFields (only checking missing if needed, but keeping simple for now)
    // checkOptionalDate(c.entryDate, 'Data de Entrada', 'entryDate'); // REMOVED per user request "only fields with validate button"

    return {
      isValid:
        missingFields.length === 0 &&
        expiredFields.length === 0 &&
        unvalidatedFields.length === 0,
      details: [...missingFields, ...expiredFields, ...unvalidatedFields],
    };
  };



  // Status Logic
  const getDisplayStatus = (c: Company, overrideRole?: string | null) => {
    const { isValid, details } = getValidationStatus(c);
    const workflowStatus = c.workflowStatus || "draft";
    const role = overrideRole !== undefined ? overrideRole : getWaitingForRole(c);

    switch (workflowStatus) {
      case "off_site":
        return {
          status: "off_site",
          label: t("status.off_site"),
          color: getWorkflowStatusColors("off_site", role),
          details: [],
          waitingForRole: role,
        };
      case "draft":
        return {
          status: "draft",
          label: "Em Validação",
          color: getWorkflowStatusColors("draft", role),
          details: details,
          waitingForRole: role,
        };
      case "data_requested":
        return {
          status: "data_requested",
          label: t("status.data_requested"),
          color: getWorkflowStatusColors("data_requested", role),
          details: details,
          waitingForRole: role,
        };
      case "data_update":
        return {
          status: "data_update",
          label: t("status.data_update"),
          color: getWorkflowStatusColors("data_update", role),
          details: details,
          waitingForRole: role,
        };
      case "validation_pending":
        return {
          status: "validation_pending",
          label: t("status.validation_pending"),
          color: getWorkflowStatusColors("validation_pending", role),
          details: details,
          waitingForRole: role,
        };
      case "validated":
        return {
          status: "validated",
          label: t("status.validated"),
          color: getWorkflowStatusColors("validated", role),
          details: details,
          waitingForRole: role,
        };
      case "approval_pending":
        return {
          status: "approval_pending",
          label: t("status.approval_pending"),
          color: getWorkflowStatusColors("approval_pending", role),
          details: details,
          waitingForRole: role,
        };
      case "approval_data_update":
        return {
          status: "approval_data_update",
          label: t("status.approval_data_update"),
          color: getWorkflowStatusColors("approval_data_update", role),
          details: details,
          waitingForRole: role,
        };
      case "approved":
        return {
          status: "approved",
          label: t("status.approved"),
          color: getWorkflowStatusColors("approved", role),
          details: [],
          waitingForRole: role,
        };
      case "incomplete":
        return {
          status: "incomplete",
          label: "Em Validação",
          color: getWorkflowStatusColors("incomplete", role),
          details: details,
          waitingForRole: role,
        };
      default:
        return {
          status: "draft",
          label: "Unknown",
          color: getWorkflowStatusColors("draft", role),
          details: [],
          waitingForRole: role,
        };
    }
  };

  // Tracking ref to avoid duplicate auto-tickets on rapid re-renders
  const expirationTicketsCreatedRef = useRef<Set<string>>(new Set());

  // Auto-Expiration Check
  useEffect(() => {
    if (!isManager) return; // Only manager (or anyone really, but let's stick to manager or arbitrary for now. Actually, any user loading the app could trigger it, but best if manager)
    // Better: let any user trigger it to ensure it happens.

    const checkExpirations = () => {
      const now = new Date();
      companies.forEach((company) => {
        if (
          company.workflowStatus !== "validated" &&
          company.workflowStatus !== "data_update"
        )
          return;

        const expiredFields: string[] = [];

        const checkField = (field: keyof Company, label: string) => {
          const val = company[field];
          if (val && typeof val === "string" && new Date(val) < now) {
            // Check if ticket exists
            const existingTicket = tickets.find(
              (t) =>
                t.entityId === company.id &&
                t.fieldId === field &&
                t.status === "open",
            );

            // Generate a unique key for tracking session creations
            const creationKey = `${company.id}-${field}`;

            if (!existingTicket && !expirationTicketsCreatedRef.current.has(creationKey)) {
              expirationTicketsCreatedRef.current.add(creationKey);
              expiredFields.push(field);

              // Create Ticket
              createTicket({
                projectId: company.projectId || projectId || "", // Fallback
                entityId: company.id,
                type: "field_review",
                fieldId: field,
                title: `Atualizar ${label} (Expirado)`,
                description:
                  "Atualizar a data do documento. Este documento expirou.",
                priority: "high",
                createdBy: "system",
                assignedTo: company.assignedDataUserId || "system", // Assign to data user for correction
                isDraft: false, // Immediately visible
              });
            }
          }
        };

        // Check Standard Dates
        // NOTE: pssAcceptanceDate is intentionally excluded — it is configured as a
        // non-expiry date (isExpirationDate: false) and past dates are valid.
        checkField("insuranceWorkAccDate", "Seguro AT");
        checkField("insuranceCivilDate", "Seguro RC");
        checkField("cleanSSDate", "N/ Dívida SS");
        checkField("cleanFinDate", "N/ Dívida Finanças");
        // checkField('entryDate', 'Data Entrada'); // Entry date doesn't "expire" in the same way? Or does it? Usually Validity dates expire.
        // Let's stick to document validity dates.

        const hasExpired = expiredFields.length > 0;
        if (hasExpired) {
          // Update Status if not already
          if (company.workflowStatus === "validated") {
            console.log(
              `[Auto-Expire] Company ${company.name} has expired fields: ${expiredFields.join(", ")}. Moving to 'data_update'.`,
            );

            // Invalidate fields
            const newValidations = { ...(company.fieldValidations || {}) };
            // Ensure both the field and the customDocuments equivalent are invalidated
            expiredFields.forEach((f) => {
              newValidations[f] = false;
              if (f.startsWith('custom_')) {
                newValidations[f.replace('custom_', '')] = false;
              }
            });
            updateCompany(company.id, {
              workflowStatus: "data_update",
              fieldValidations: newValidations
            });
          } else {
            // If not validated but we still need to invalidate the specific fields locally
            const newValidations = { ...(company.fieldValidations || {}) };
            let changed = false;
            expiredFields.forEach((f) => {
              if (newValidations[f] !== false) {
                newValidations[f] = false;
                changed = true;
              }
              if (f.startsWith('custom_') && newValidations[f.replace('custom_', '')] !== false) {
                newValidations[f.replace('custom_', '')] = false;
                changed = true;
              }
            });

            if (changed) {
              updateCompany(company.id, { fieldValidations: newValidations });
            }
          }
        }
      });
    };

    checkExpirations();
  }, [companies, tickets, updateCompany, createTicket, isManager, projectId]);

  // Filter Logic
  const [filter, setFilter] = useState<"all" | "active" | "archived">("all");

  // Compute Sequential IDs based on Global Creation Date
  const globalSequenceMap = React.useMemo(() => {
    const all = companies; // Use direct 'companies' prop or store access? 'companies' prop is available (line 410 dependency uses it)
    // Check if 'companies' variable is in scope. Yes, from useStore.
    // Sort by creation date ascending
    const sorted = [...all].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    // Map ID -> Index (1-based)
    return new Map(sorted.map((c, i) => [c.id, i + 1]));
  }, [companies]);

  const filteredCompanies = activeCompanies.filter((c) => {
    if (filter === "archived") return c.archived;
    if (c.archived) return false;

    const matchesSearch =
      !searchQuery ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.nif.includes(searchQuery) ||
      (c.activity &&
        c.activity.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      filterStatus === "all" || (c.workflowStatus || "draft") === filterStatus;

    if (isApprovalUser) {
      // Approval User sees Validados, Em Aprovação, Aprovação com Atualização, and Aprovados
      if (
        ![
          "validated",
          "approval_pending",
          "approval_data_update",
          "approved",
        ].includes(c.workflowStatus || "")
      )
        return false;
    }

    if (filter === "active") {
      return (
        (!c.exitDate || new Date(c.exitDate) > new Date()) &&
        matchesSearch &&
        matchesStatus
      );
    }
    return matchesSearch && matchesStatus;
  });

  // Export Logic
  const [isPDFModalOpen, setIsPDFModalOpen] = useState(false);

  // Tab Editing State
  const [editingTabModal, setEditingTabModal] = useState<
    "info" | "site" | null
  >(null);

  // Document Validation State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedDocRow, setSelectedDocRow] = useState<any>(null);
  const [reviewField, setReviewField] = useState<{
    id: string;
    label: string;
    currentValue?: any;
  } | null>(null);
  const [showSavedMessage, setShowSavedMessage] = useState(false);
  const [showCompanyStats, setShowCompanyStats] = useState(false);

  // Track which fields have been corrected by the Data User in this session
  const [correctedFields, setCorrectedFields] = useState<
    Record<string, boolean>
  >({});

  // Transaction Management for Files
  const [sessionOperations, setSessionOperations] = useState<
    Array<{
      type: "upload" | "archive";
      fileId: string;
      archivedId?: string;
      archivedParentId?: string;
    }>
  >([]);

  const handleUploadOperation = (op: {
    type: "upload";
    fileId: string;
    archivedId?: string;
    archivedParentId?: string;
  }) => {
    setSessionOperations((prev) => [...prev, op]);
  };

  const handleCancelWithRollback = async () => {
    if (sessionOperations.length > 0 && currentProject?.cdeConfig) {
      console.log("Rolling back session operations...", sessionOperations);
      const reverseOps = [...sessionOperations].reverse(); // Undo in reverse order

      for (const op of reverseOps) {
        if (op.type === "upload") {
          // 1. Delete the new file
          console.log(`Rollback: Deleting ${op.fileId}`);
          await deleteCDEFile(currentProject.cdeConfig, op.fileId);

          // 2. Restore archived file if any
          if (op.archivedId && op.archivedParentId) {
            console.log(
              `Rollback: Restoring ${op.archivedId} to ${op.archivedParentId}`,
            );
            await moveCDEFile(
              currentProject.cdeConfig,
              op.archivedId,
              op.archivedParentId,
            );
          }
        }
      }
      // Clear operations
      setSessionOperations([]);
    }

    if (mode === "create") {
      setNewItem(initialFormState);
      setIsModalOpen(false);
      setIsEditing(false);
    } else {
      const originalCompany = companies.find((c) => c.id === (newItem as any).id);
      if (originalCompany) {
        const assignedUser = users.find((u) =>
          u.projectAccess?.some(
            (pa) =>
              pa.projectId === projectId &&
              pa.role === "data_user" &&
              pa.companyIds?.includes(originalCompany.id),
          ),
        );
        const effectiveAssignedId = originalCompany.assignedDataUserId || assignedUser?.id;

        const formCompany = {
          ...originalCompany,
          parentId: originalCompany.parentId || "root",
          assignedDataUserId: effectiveAssignedId,
        };

        const isAssigned = effectiveAssignedId === currentUser?.id;
        const currentWaitingForRole = getWaitingForRole(originalCompany);
        const isDataUserViewingSubmission =
          isAssigned &&
          originalCompany.workflowStatus === "validation_pending";
        const isManagerReviewing =
          effectiveIsManager && currentWaitingForRole === "manager";

        if ((isManagerReviewing || isDataUserViewingSubmission) && originalCompany.draftData) {
          const merged = { ...formCompany, ...originalCompany.draftData };
          merged.workflowStatus = formCompany.workflowStatus;
          merged.fieldValidations = formCompany.fieldValidations;
          if (!merged.parentId) merged.parentId = "root";
          setNewItem(merged as any);
        } else {
          setNewItem({ ...formCompany } as any);
        }
      } else {
        setNewItem(initialFormState);
      }
      setIsEditing(false);
    }
  };

  // Helper for Data User Submission (Strict Validation) - Moved here to access correctedFields and other hooks
  const dataUserValidation = useMemo(() => {
    // Return { isReady: boolean, messages: string[] }
    if (!isDataUser) return { isReady: true, messages: [] };

    const msgs: string[] = [];

    // Helper for visibility check inside this hook
    const currentProfile = companyProfiles.find(
      (p) => p.id === newItem.profileId,
    );

    const isFieldVisible = (key: string) => {
      if (!newItem.profileId) return true;
      if (!currentProfile) return true;
      return !!currentProfile.requirements?.[
        key as keyof typeof currentProfile.requirements
      ];
    };

    const isUploadVisible = (key: string) => {
      if (!newItem.profileId) return true;
      if (!currentProfile) return true;
      return !!currentProfile.standardUploads?.[
        key as keyof typeof currentProfile.standardUploads
      ];
    };

    const hasDoc = (category: string) => {
      return documents.some(
        (d) =>
          d.entityId === newItem.id && d.category === category && !d.archived,
      );
    };

    // 1. Identification Tab
    if (!newItem.name) msgs.push("Nome da Empresa");
    if (!newItem.nif) msgs.push("NIF");
    if (!newItem.profileId) msgs.push("Perfil de Organização");
    if (!newItem.email) msgs.push("Email");
    if (!newItem.phone) msgs.push("Telefone");
    if (!newItem.address) msgs.push("Morada");
    if (!newItem.activity) msgs.push("Atividade");
    if (!newItem.parentId) msgs.push("Empresa Contratante");
    if (!newItem.impic) msgs.push("Alvará / Título de Registo");

    // 2. Site Info Tab (Except Entry/Exit Date)
    // removed: siteManager and siteContact

    // 3. Legal / Documents Tab (Dependent on Visibility & Document Upload Requirements)
    if (isFieldVisible("insurance_at")) {
      if (!newItem.insuranceWorkAccDate) msgs.push("Data Validade: Seguro AT");
      if (!newItem.insuranceWorkAccPolicy) msgs.push("Texto: Seguro AT Apólice");
      if (isUploadVisible("insurance_at")) {
        if (!hasDoc("insurance_work_acc_receipt")) msgs.push("Ficheiro: Seguro AT Recibo");
        if (!hasDoc("insurance_work_acc_policy")) msgs.push("Ficheiro: Seguro AT Apólice");
      }
    }

    if (isFieldVisible("insurance_rc")) {
      if (!newItem.insuranceCivilDate) msgs.push("Data Validade: Seguro RC");
      if (!newItem.insuranceCivilPolicy) msgs.push("Texto: Seguro RC Apólice");
      if (isUploadVisible("insurance_rc")) {
        if (!hasDoc("insurance_civil_receipt")) msgs.push("Ficheiro: Seguro RC Recibo");
        if (!hasDoc("insurance_civil_policy")) msgs.push("Ficheiro: Seguro RC Apólice");
      }
    }

    if (isFieldVisible("finance_ss")) {
      if (!newItem.cleanSSDate) msgs.push("Data Validade: Decl. Seg. Social");
      if (isUploadVisible("finance_ss") && !hasDoc("finance_ss")) msgs.push("Ficheiro: Declaração Seg. Social");
    }

    if (isFieldVisible("finance_fin")) {
      if (!newItem.cleanFinDate) msgs.push("Data Validade: Decl. Finanças");
      if (isUploadVisible("finance_fin") && !hasDoc("finance_fin")) msgs.push("Ficheiro: Declaração Finanças");
    }

    if (isFieldVisible("ss_discount")) {
      if (!newItem.ssDiscountSheet) msgs.push("Texto: Folha de Remunerações");
      if (isUploadVisible("ss_discount") && !hasDoc("ss_discount_sheet")) msgs.push("Ficheiro: Folha de Remunerações");
    }

    if (isFieldVisible("pss_acceptance")) {
      if (!newItem.pssAcceptanceDate) msgs.push("Data Validade: Decl. Aceitação PSS");
      if (isUploadVisible("pss_acceptance") && !hasDoc("pss_acceptance")) msgs.push("Ficheiro: Decl. Aceitação PSS");
    }

    if (isFieldVisible("work_schedule")) {
      if (!hasDoc("work_schedule")) msgs.push("Ficheiro: Horário de Trabalho");
    }

    // Custom Documents
    if (currentProfile && currentProfile.customDocuments) {
      for (const doc of currentProfile.customDocuments) {
        const isDocVisible = !(
          doc.dataType === "boolean" &&
          newItem.customDocuments?.[doc.id]?.value === "false"
        );
        if (isDocVisible) {
          const val = newItem.customDocuments?.[doc.id]?.value;
          if (val === undefined || val === null || val === "") msgs.push(`Texto Opcão: ${doc.name}`);

          if (doc.requiresUpload !== false) {
            if (!hasDoc(`custom_${doc.id}`)) msgs.push(`Ficheiro Anexo: ${doc.name}`);
          }
        }
      }
    }

    // 4. Check Open Tickets (Must be corrected)
    if (
      newItem.workflowStatus === "data_requested" ||
      newItem.workflowStatus === "data_update" ||
      newItem.workflowStatus === "approval_data_update"
    ) {
      const openTickets = tickets.filter(
        (t) => t.entityId === newItem.id && t.status === "open",
      );
      // Check if any open ticket is NOT marked as corrected in this session
      const hasUncorrectedTickets = openTickets.some(
        (t) => t.fieldId && !correctedFields[t.fieldId],
      );
      if (hasUncorrectedTickets) msgs.push("Tickets em aberto da Revisão (verifique nos detalhes de cada sub-menu)");
    }

    return { isReady: msgs.length === 0, messages: msgs };
  }, [
    newItem,
    isDataUser,
    companyProfiles,
    documents,
    tickets,
    correctedFields,
  ]);
  const isDataUserReady = dataUserValidation.isReady;

  const exportToExcel = async () => {
    try {
      if (filteredCompanies.length === 0) {
        alert("No companies to export.");
        return;
      }

      const XLSX = await import("xlsx");

      const data = filteredCompanies.map((c) => ({
        Nome: c.name,
        NIF: c.nif,
        Nível: c.tier,
        Parent: c.parentId
          ? activeCompanies.find((p) => p.id === c.parentId)?.name
          : "-",
        Entrada: c.entryDate,
        Saída: c.exitDate || "Em Obra",
        "Horário Entregue": c.workScheduleDelivered ? "Sim" : "Não",
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Empresas");
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });

      // Create Blob and trigger download
      const blob = new Blob([wbout], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = "Companies_List.xlsx";
      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export Excel. Please check the console for details.");
    }
  };

  const handleGeneratePDF = async (config: any) => {
    try {
      const jsPDF = (await import("jspdf")).default;
      const autoTable = (await import("jspdf-autotable")).default;

      const template = config.templateId
        ? templates.find((t) => t.id === config.templateId)
        : null;

      const doc = new jsPDF({
        orientation: template
          ? template.config.orientation
          : config.orientation,
        format: template ? template.config.pageSize : config.pageSize,
      });

      // Table Data
      const tableBody = filteredCompanies.map((c) => [
        c.name,
        c.nif,
        `T-${c.tier || 1}`,
        c.parentId
          ? activeCompanies.find((p) => p.id === c.parentId)?.name || "-"
          : "-",
        c.entryDate || "-",
        c.exitDate || "-",
        c.workScheduleDelivered ? "Sim" : "Não",
      ]);

      if (template) {
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        const renderColumns = (
          _section: "header" | "footer",
          startY: number,
          height: number,
          columns: any[],
        ) => {
          let currentX = 0;
          columns.forEach((col: any) => {
            const safeWidth = col.width || 100 / columns.length;
            const colWidth = (pageWidth * safeWidth) / 100;
            const colX = currentX;
            currentX += colWidth;

            col.elements.forEach((el: any) => {
              let xPos = colX;
              if (el.style.align === "center") xPos = colX + colWidth / 2;
              if (el.style.align === "right") xPos = colX + colWidth - 5;
              if (el.style.align === "left") xPos = colX + 5;

              const yPos = startY + height / 2 + 2;

              doc.setFontSize(el.style.fontSize || 10);
              doc.setTextColor(el.style.color || "#000000");

              if (el.type === "text") {
                doc.text(el.content, xPos, yPos, {
                  align: el.style.align as any,
                  baseline: "middle",
                });
              } else if (el.type === "variable") {
                let text = "";
                if (el.content === "page_number") {
                  text = `Page ${doc.getCurrentPageInfo().pageNumber}`;
                }
                if (el.content === "print_date")
                  text = new Date().toLocaleDateString();
                doc.text(text, xPos, yPos, {
                  align: el.style.align as any,
                  baseline: "middle",
                });
              }
              // Note: Image rendering skipped for simplicity in manual migration, can be re-added if vital
            });
          });
        };

        autoTable(doc, {
          head: [
            [
              "Empresa",
              "NIF",
              "Nível",
              "Parent",
              "Entrada",
              "Saída",
              "Horário",
            ],
          ],
          body: tableBody,
          startY:
            (template.config.marginTop || 10) + template.header.height + 5,
          margin: {
            top: (template.config.marginTop || 10) + template.header.height,
            bottom:
              (template.config.marginBottom || 10) + template.footer.height,
            left: template.config.marginLeft || 10,
            right: template.config.marginRight || 10,
          },
          styles: { fontSize: 8 },
          headStyles: { fillColor: [41, 128, 185] },
          didDrawPage: (_data: any) => {
            renderColumns(
              "header",
              template.config.marginTop || 10,
              template.header.height,
              template.header.columns,
            );
            const footerY =
              pageHeight -
              (template.config.marginBottom || 10) -
              template.footer.height;
            renderColumns(
              "footer",
              footerY,
              template.footer.height,
              template.footer.columns,
            );
          },
        });
      } else {
        if (config.logoUrl) {
          // doc.addImage(config.logoUrl, 'JPEG', 15, 10, 30, 15);
        }
        doc.setFontSize(18);
        doc.text(config.headerText, 50, 20);
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 50, 26);

        autoTable(doc, {
          head: [
            [
              "Empresa",
              "NIF",
              "Nível",
              "Parent",
              "Entrada",
              "Saída",
              "Horário",
            ],
          ],
          body: tableBody,
          startY: 35,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [41, 128, 185] },
        });
      }

      const pdfBlob = doc.output("blob");
      const url = window.URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = "Companies_Report.pdf";
      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100);

      setIsPDFModalOpen(false);
    } catch (error) {
      console.error("PDF Export failed:", error);
      alert("Failed to export PDF. Please check the console for details.");
    }
  };

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{
    type: "archive";
    company: Company;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation: Unique Name and NIF (Edit Mode / General Save)
    const currentId = (newItem as any).id;
    const nameExists = companies.some(
      (c) =>
        c.projectId === projectId &&
        c.id !== currentId &&
        c.name.trim().toLowerCase() === newItem.name.trim().toLowerCase(),
    );
    if (nameExists) {
      alert(
        t("common.errorNameExists") ||
        "A company with this name already exists.",
      );
      return;
    }

    if (newItem.nif) {
      const nifExists = companies.some(
        (c) =>
          c.projectId === projectId &&
          c.id !== currentId &&
          c.nif === newItem.nif,
      );
      if (nifExists) {
        alert(
          t("common.errorNifExists") ||
          "A company with this Tax ID (NIF) already exists.",
        );
        return;
      }
    }

    // 1. Validation for Data Users: Validation is now enforced by the 'Submit' button disabled state (isDataUserReady).
    // 'Save' (handleSubmit) is for Drafts and should not enforce ticket correction or send messages.
    // Message sending is deferred to the 'Submit' confirmation modal.

    // Convert "root" selection back to undefined/empty logic
    const submissionItem = {
      ...newItem,
      parentId: newItem.parentId === "root" ? undefined : newItem.parentId,
    };

    if (mode === "create") {
      addCompany({
        ...submissionItem,
        id: newItem.id, // Explicitly pass the generated ID
        projectId,
      });
      setIsModalOpen(false);
      setSessionUploads([]);
      setNewItem(initialFormState);
      setActiveTab("info");
    } else {
      const realCompany = activeCompanies.find(
        (c) => c.id === (newItem as any).id,
      );
      const isAssigned =
        effectiveIsDataUser &&
        (realCompany?.assignedDataUserId === currentUser?.id ||
          (newItem as any).assignedDataUserId === currentUser?.id);
      const currentStatus = newItem.workflowStatus;
      const canEditAssigned =
        effectiveIsDataUser &&
        (currentStatus === "draft" ||
          currentStatus === "data_requested" ||
          currentStatus === "data_update" ||
          currentStatus === "approval_data_update");

      console.log("[handleSubmit] Debug Flags:", {
        isDataUser: effectiveIsDataUser,
        currentUser: currentUser?.id,
        realCompanyId: realCompany?.id,
        assignedTo: realCompany?.assignedDataUserId,
        companyAssignedTo: (newItem as any).assignedDataUserId,
        isAssigned,
        workflowStatus: currentStatus,
        canEditAssigned,
        canEditDirectly,
        canRequestEdit,
      });

      if (canEditDirectly) {
        // Manager/Editor direct update

        // FIX: DEFERRED MERGE - If Manager is in 'validation_pending', save to draftData instead of root!
        if (
          currentStatus === "validation_pending" ||
          currentStatus === "approval_data_update"
        ) {
          console.log(
            "[handleSubmit] Manager Saving Review Draft. Validation Pending/Approver Update.",
          );

          // Same logic as Data User Save
          // Same logic as Data User Save
          const { draftData: _ignored, ...draftPayload } = submissionItem;

          // FIX: Ensure fieldValidations are persisted in draftData
          // When Manager validates, it updates newItem.fieldValidations.
          // We need to ensure these validation states are saved into the draftData object
          // so they persist when re-opened (since handleRowClick merges draftData back).

          // We also need to be careful not to lose existing draftData structure if any
          const draftUpdate = {
            ...realCompany,
            fieldValidations: (newItem as any).fieldValidations, // Fix: Ensure validations are saved to ROOT
            draftData: {
              ...draftPayload,
              fieldValidations: (newItem as any).fieldValidations, // Explicitly include validations in draft too
            },
          } as Company;

          updateCompany((newItem as any).id, draftUpdate);
        } else {
          // Standard Root Update for other statuses (or if we decide Manager always writes to root in other cases)
          console.log(
            "[handleSubmit] Manager Direct Update (Root):",
            submissionItem,
          );
          updateCompany((newItem as any).id, submissionItem);
        }

        // Show "Saved" message and keep modal open
        setShowSavedMessage(true);
        setTimeout(() => setShowSavedMessage(false), 3000);

        // Commit Transaction
        setSessionOperations([]);
        setSessionUploads([]);
      } else if (canEditAssigned) {
        // Data User saving draft -> Save to draftData ONLY
        console.log(
          "[handleSubmit] Data User Saving Draft. RealCompany:",
          realCompany,
        );
        console.log("[handleSubmit] Submission Item:", submissionItem);

        // Strip draftData from payload to prevent recursion/nesting
        const { draftData: _ignored, ...draftPayload } = submissionItem;
        console.log("[handleSubmit] Draft Payload (Clean):", draftPayload);

        const draftUpdate = {
          ...realCompany,
          draftData: draftPayload,
        } as Company;
        console.log("[handleSubmit] Calling updateCompany with:", draftUpdate);

        updateCompany((newItem as any).id, draftUpdate);

        // Show "Saved" message and keep modal open
        setShowSavedMessage(true);
        setTimeout(() => setShowSavedMessage(false), 3000);

        // Commit Transaction
        setSessionOperations([]);
        setSessionUploads([]);
      } else if (canRequestEdit) {
        // ... request logic
        addCompanyRequest(
          currentUser!.id,
          (newItem as any).id,
          projectId,
          submissionItem,
        );

        // User requested "Saved" message instead of "Update requested"
        setShowSavedMessage(true);
        setTimeout(() => setShowSavedMessage(false), 3000);
        // alert(t('common.saved'));

        // Commit Transaction
        setSessionOperations([]);
        setSessionUploads([]);
        // Keep modal open to mimic save behavior
        // setIsModalOpen(false);
      } else {
        console.warn("[handleSubmit] NO ACTION MATCHED. Save ignored.");
        alert(
          "Debug: Save Ignored. Check console for flags. Status: " +
          newItem.workflowStatus,
        );
      }
    }
  };

  const handleOpenCreate = () => {
    setIsQuickCreateOpen(true);
  };

  const handleQuickCreate = (data: {
    name: string;
    profileId: string;
    parentId: string;
    companyRole?: string;
    companyRoleCustom?: string;
    ifcActorRole?: string;
    ifcActorRoleUserDefined?: string;
  }) => {
    // Validation: Unique Name
    const nameExists = companies.some(
      (c) =>
        c.projectId === projectId &&
        c.name.trim().toLowerCase() === data.name.trim().toLowerCase(),
    );
    if (nameExists) {
      alert(
        t("common.errorNameExists") ||
        "A company with this name already exists.",
      );
      return;
    }

    const newId = nanoid();
    const parentId = data.parentId === "root" ? "" : data.parentId;

    const newCompany: Company = {
      ...initialFormState,
      id: newId,
      projectId,
      name: data.name,
      profileId: data.profileId,
      parentId: parentId,
      companyRole: data.companyRole,
      companyRoleCustom: data.companyRoleCustom,
      ifcActorRole: data.ifcActorRole,
      ifcActorRoleUserDefined: data.ifcActorRoleUserDefined,
      workflowStatus: "draft",
      createdAt: new Date().toISOString(),
      accountId: currentUser?.accountId || "acc_default", // Fallback
    } as Company;

    addCompany(newCompany);
    setIsQuickCreateOpen(false);
  };

  const handleRowClick = (company: Company) => {
    setCorrectedFields({});
    setPendingTicketActions(new Map());
    // Resolve Data User from Project Team if not set on company
    const assignedUser = users.find((u) =>
      u.projectAccess?.some(
        (pa) =>
          pa.projectId === projectId &&
          pa.role === "data_user" &&
          pa.companyIds?.includes(company.id),
      ),
    );
    const effectiveAssignedId = company.assignedDataUserId || assignedUser?.id;

    const isAssigned = effectiveAssignedId === currentUser?.id;
    // Logic uses effective roles implicitly via actions available, but draft loading logic above depends on it.
    // Wait, handleRowClick sets up the modal. We need to decide if we load draft based on acting mode.
    // But acting mode is STATE state, so it persists.

    const currentWaitingForRole = getWaitingForRole(company);

    const isDataUserTurn = currentWaitingForRole === "data_user";
    const isActingDataUserAccess = isActingAsDataUser && isDataUserTurn;
    const canEditState = isDataUserTurn;

    const isApprovalUserReviewing =
      isApprovalUser && currentWaitingForRole === "approval_user";

    // Manager reviewing submission
    const isManagerReviewing =
      effectiveIsManager && currentWaitingForRole === "manager";

    const shouldEdit =
      (isAssigned && canEditState) ||
      isActingDataUserAccess ||
      isApprovalUserReviewing;

    // Ensure parentId maps to 'root' if it's missing, for the select component
    const formCompany = {
      ...company,
      parentId: company.parentId || "root",
      assignedDataUserId: effectiveAssignedId, // Ensure form has the resolved ID
    };

    // Also show draftData to the data user in read-only mode when they are in validation_pending
    // so they can see the data they submitted while waiting for manager review.
    const isDataUserViewingSubmission =
      isAssigned &&
      company.workflowStatus === "validation_pending";

    if ((shouldEdit || isManagerReviewing || isDataUserViewingSubmission) && company.draftData) {
      // If Data User is editing OR Manager is reviewing, load draft data!
      const merged = { ...formCompany, ...company.draftData };
      // Ensure Critical Fields are NOT overwritten by stale draft data (optional, but good practice)
      // But if we are in validation_pending, we want to see the Draft status/validations too?
      // Actually, validations might be on root.
      // Let's keep logic:
      merged.workflowStatus = formCompany.workflowStatus;
      merged.fieldValidations = formCompany.fieldValidations; // FIX: Ensure we keep existing validations

      // Ensure parentId is not undefined
      if (!merged.parentId) merged.parentId = "root";
      setNewItem(merged as any);
    } else {
      // Otherwise show official data
      setNewItem({ ...formCompany } as any);
    }

    setMode("details");

    setIsEditing(shouldEdit);
    setIsModalOpen(true);
  };

  const handleAction = (
    action: "view" | "edit" | "delete" | "restore",
    company: Company,
  ) => {
    if (action === "view") {
      setCorrectedFields({});
      setPendingTicketActions(new Map());
      handleRowClick(company);
    } else if (action === "edit") {
      setCorrectedFields({});
      setPendingTicketActions(new Map());
      const assignedUser = users.find((u) =>
        u.projectAccess?.some(
          (pa) =>
            pa.projectId === projectId &&
            pa.role === "data_user" &&
            pa.companyIds?.includes(company.id),
        ),
      );
      const effectiveAssignedId =
        company.assignedDataUserId || assignedUser?.id;

      const formCompany = {
        ...company,
        parentId: company.parentId || "root",
        assignedDataUserId: effectiveAssignedId,
      };

      if (company.draftData) {
        // If Data User is editing and there is draft data, load it!
        const merged = { ...formCompany, ...company.draftData };
        // Ensure Critical Fields are NOT overwritten by stale draft data
        merged.workflowStatus = formCompany.workflowStatus;
        merged.fieldValidations = formCompany.fieldValidations;

        // Ensure parentId is not undefined (draft might have saved it as undefined for 'root')
        if (!merged.parentId) merged.parentId = "root";
        setNewItem(merged as any);
      } else {
        setNewItem({ ...formCompany } as any);
      }
      setMode("details");
      setIsEditing(true);
      setIsModalOpen(true);
    } else if (action === "delete") {
      setConfirmation({ type: "archive", company });
    } else if (action === "restore") {
      restoreCompany(company.id);
    }
  };

  const getStatusConfig = (status: string | undefined, role: string | null = null) => {
    switch (status) {
      case "draft":
        return {
          icon: FileText,
          color: getWorkflowStatusColors("draft", role),
        };
      case "data_requested":
        return {
          icon: Send,
          color: getWorkflowStatusColors("data_requested", role),
        };
      case "data_update":
        return {
          icon: RefreshCw,
          color: getWorkflowStatusColors("data_update", role),
        };
      case "validation_pending":
        return {
          icon: AlertCircle,
          color: getWorkflowStatusColors("validation_pending", role),
        };
      case "validated":
        return {
          icon: Shield,
          color: getWorkflowStatusColors("validated", role),
        };
      case "approval_pending":
        return {
          icon: Clock,
          color: getWorkflowStatusColors("approval_pending", role),
        };
      case "approved":
        return {
          icon: CheckCircle,
          color: getWorkflowStatusColors("approved", role),
        };
      case "approval_data_update":
        return {
          icon: AlertTriangle,
          color: getWorkflowStatusColors("approval_data_update", role),
        };
      default:
        return {
          icon: FileText,
          color: getWorkflowStatusColors("draft", role),
        };
    }
  };

  const currentRole = mode !== "create" && getWaitingForRole ? getWaitingForRole(newItem as Company) : null;
  const statusConfig = getStatusConfig(newItem?.workflowStatus, currentRole);
  const StatusIcon = statusConfig.icon;

  // Helper function to determine who should act next
  const getWaitingForUser = (company: Company | typeof newItem) => {
    const status = company.workflowStatus;
    const companyId = (company as any).id;

    switch (status) {
      case "draft":
        // If Assigned, waiting for Data User to submit
        if (company.assignedDataUserId) {
          const dataUser = users.find(
            (u) => u.id === company.assignedDataUserId,
          );
          return dataUser ? `${dataUser.name} (Data User)` : "Data User";
        }
        // If Unassigned, waiting for Manager to assign/request docs
        return "Manager";

      case "data_requested":
      case "data_update":
        // Waiting for Data User or Manager to complete data
        // Resolve from Project Team if not direct
        let du = company.assignedDataUserId
          ? users.find((u) => u.id === company.assignedDataUserId)
          : null;
        if (!du) {
          du = users.find((u) =>
            u.projectAccess?.some(
              (pa) =>
                pa.projectId === projectId &&
                pa.role === "data_user" &&
                pa.companyIds?.includes(company.id || ""),
            ),
          );
        }
        return du ? `${du.name} (Data User)` : "Data User";

      case "validation_pending":
        // Waiting for Manager to validate
        return "Manager";

      case "approval_pending":
        // Waiting for Approval User
        const approver = getProjectApprover(projectId);
        return approver ? `${approver.name} (Approver)` : "Approver";

      case "approval_data_update": {
        // Check which role the open tickets are assigned to
        const companyTickets2 = companyId
          ? tickets.filter((t) => t.entityId === companyId && t.status === "open")
          : [];

        // Check for manager-assigned tickets (approver-created, sent to manager)
        const managerTickets = companyTickets2.filter((t) => {
          if (!t.assignedTo) return false;
          const role = getUserRoleInProject(t.assignedTo, projectId);
          return role === "manager";
        });
        if (managerTickets.length > 0) {
          const manager = getProjectManager(projectId);
          return manager ? `${manager.name} (Manager)` : "Manager";
        }

        // Check for data-user-assigned tickets (forwarded by manager)
        const dataUserTickets2 = companyTickets2.filter((t) => {
          if (!t.assignedTo) return false;
          const role = getUserRoleInProject(t.assignedTo, projectId);
          return role === "data_user";
        });
        if (dataUserTickets2.length > 0) {
          const assignedDataUser = users.find((u) => u.id === dataUserTickets2[0].assignedTo);
          return assignedDataUser ? `${assignedDataUser.name} (Data User)` : "Data User";
        }

        // Otherwise, waiting for Manager to review or forward
        return "Manager";
      }

      case "validated":
        // Waiting for Manager to Submit for Approval ONLY if approval workflow is active
        if (currentProject?.approvalWorkflow?.companies) {
          return "Manager";
        }
        return null;

      case "approved":
        return null;

      default:
        return null;
    }
  };

  const waitingFor = mode !== "create" ? getWaitingForUser(newItem) : null;


  const handleToggleActingMode = () => {
    const newActingState = !isActingAsDataUser;
    setIsActingAsDataUser(newActingState);

    // RELOAD DATA based on the new mode
    // We need to fetch the LATEST data for this company from the store to be sure
    const realCompany = activeCompanies.find(
      (c) => c.id === (newItem as any).id,
    );
    if (!realCompany) return;

    console.log(
      `[handleToggleActingMode] Switching to ${newActingState ? "Data User" : "Manager"} mode for company ${realCompany.name}`,
    );

    const formCompany = {
      ...realCompany,
      parentId: realCompany.parentId || "root",
      // If acting as Data User, we pretend to be the assigned user (or one of them)
      // But actually we just leave assignedDataUserId as is.
    };

    if (newActingState) {
      // SWITCHING TO DATA USER MODE
      // Load Draft Data if it exists
      if (realCompany.draftData) {
        const merged = { ...formCompany, ...realCompany.draftData };
        merged.workflowStatus = formCompany.workflowStatus; // Preserve status? Usually yes.
        merged.fieldValidations = formCompany.fieldValidations;

        // Calculate Corrected Fields based on Draft Data presence/tickets
        const openTicketsForCompany = tickets.filter(
          (t) => t.entityId === realCompany.id && t.status === "open",
        );
        const newCorrectedFields: Record<string, boolean> = {};

        openTicketsForCompany.forEach((t) => {
          if (t.fieldId) {
            if (
              realCompany.draftData &&
              Object.prototype.hasOwnProperty.call(
                realCompany.draftData,
                t.fieldId,
              )
            ) {
              // FIX: Only mark as corrected if the ticket is NOT assigned to the Data User.
              // if Assigned to Data User, it means "Changes Requested" (Open for Edit)
              // if Assigned to Manager, it means "Pending Review" (Corrected)
              if (t.assignedTo !== realCompany.assignedDataUserId) {
                newCorrectedFields[t.fieldId] = true;
              }
            }
          }
        });
        setCorrectedFields(newCorrectedFields);

        if (!merged.parentId) merged.parentId = "root";
        setNewItem(merged as any);
      } else {
        setNewItem({ ...formCompany } as any);
      }
    } else {
      // SWITCHING BACK TO MANAGER MODE
      // Load Official Data (Root)
      // Clear corrections visualization as Manager usually sees the "request" state not the "draft correction" state unless explicitly reviewing
      // But wait, if Manager is reviewing validation_pending, they SHOULD see draft data.
      // If status is validation_pending, Manager mode ALSO shows draft data (via handleRowClick logic).

      const isManagerReviewing =
        realCompany.workflowStatus === "validation_pending";

      if (isManagerReviewing && realCompany.draftData) {
        const merged = { ...formCompany, ...realCompany.draftData };
        merged.workflowStatus = formCompany.workflowStatus;
        // merged.fieldValidations = formCompany.fieldValidations; // REMOVED: Allow draftData validations to persist
        if (!merged.parentId) merged.parentId = "root";
        setNewItem(merged as any);
      } else {
        setNewItem({ ...formCompany } as any);
      }
      setCorrectedFields({});
    }
  };

  const statusBadge = (
    <div className="flex items-center gap-2 shrink-0">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border shadow-2xs shrink-0",
          statusConfig.color,
        )}
      >
        <StatusIcon size={12} />
        {mode !== "create"
          ? getDisplayStatus(newItem as Company).label
          : "Em Validação"}
      </span>
      {isActingAsDataUser && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border shadow-2xs bg-orange-100 text-orange-800 border-orange-200 animate-pulse">
          <User size={11} />
          Acting as Data User
        </span>
      )}
    </div>
  );

  const projectManagers = users.filter((u) =>
    u.projectAccess?.some(
      (pa) => pa.projectId === projectId && pa.role === "manager",
    ),
  );
  const approvalUsers = users.filter((u) =>
    u.projectAccess?.some(
      (pa) => pa.projectId === projectId && pa.role === "approval_user",
    ),
  );

  // Helper for Create Mode
  const isCreateMode = mode === "create";
  const isCreateFormValid = !!(
    newItem.name &&
    newItem.profileId &&
    newItem.parentId
  );

  // Validation status (moved here so drawerActions can reference it)
  const validation = useMemo(
    () => getValidationStatus(newItem as Company),
    [newItem],
  );
  const isAllValidated = validation.details.length === 0;

  const drawerActions = (
    <div className="flex items-center gap-4">
      {/* Project Team Stack - Clean Google Style */}

      {/* 1. Data User (First) */}
      <div className="flex flex-col items-start gap-1">
        <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">
          Data User
        </span>
        {(() => {
          const user = users.find((u) => u.id === newItem?.assignedDataUserId);
          return user ? (
            <div
              className="w-6 h-6 rounded-full bg-orange-100 border-2 border-white flex items-center justify-center text-[10px] font-medium text-orange-700 relative z-30 ring-1 ring-white"
              title={`Data User: ${user.name}`}
            >
              {user.name.charAt(0)}
            </div>
          ) : (
            <div
              className="w-6 h-6 rounded-full bg-gray-100 dark:bg-surface border-2 border-white flex items-center justify-center text-[9px] text-gray-400 relative z-30 ring-1 ring-white"
              title="No Data User"
            >
              <User size={12} />
            </div>
          );
        })()}
      </div>

      <div className="h-6 w-px bg-gray-200"></div>

      {/* 2. Managers */}
      <div className="flex flex-col items-start gap-1">
        <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">
          Managers
        </span>
        <div className="flex items-center -space-x-2">
          {projectManagers.slice(0, 3).map((mgr, i) => (
            <div
              key={mgr.id}
              className="w-6 h-6 rounded-full bg-primary-light border-2 border-white flex items-center justify-center text-[10px] font-medium text-primary-hover relative z-20 ring-1 ring-white"
              title={`Manager: ${mgr.name}`}
            >
              {mgr.name.charAt(0)}
            </div>
          ))}
          {projectManagers.length > 3 && (
            <div className="w-6 h-6 rounded-full bg-gray-50 dark:bg-[#131314] border-2 border-white flex items-center justify-center text-[9px] font-medium text-gray-500 relative z-10 ring-1 ring-white">
              +{projectManagers.length - 3}
            </div>
          )}
        </div>
      </div>

      {/* 3. Approvers (If Enabled) */}
      {currentProject?.approvalWorkflow?.companies &&
        approvalUsers.length > 0 && (
          <>
            <div className="h-6 w-px bg-gray-200"></div>
            <div className="flex flex-col items-start gap-1">
              <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">
                Approvers
              </span>
              <div className="flex items-center -space-x-2">
                {approvalUsers.slice(0, 3).map((usr, i) => (
                  <div
                    key={usr.id}
                    className="w-6 h-6 rounded-full bg-purple-100 border-2 border-white flex items-center justify-center text-[10px] font-medium text-purple-700 relative z-10 ring-1 ring-white"
                    title={`Approver: ${usr.name}`}
                  >
                    {usr.name.charAt(0)}
                  </div>
                ))}
                {approvalUsers.length > 3 && (
                  <div className="w-6 h-6 rounded-full bg-gray-50 dark:bg-[#131314] border-2 border-white flex items-center justify-center text-[9px] font-medium text-gray-500 relative z-0 ring-1 ring-white">
                    +{approvalUsers.length - 3}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

      {/* │ Separator before Edit/Cancel/Save actions */}
      <div className="h-6 w-px bg-gray-200 dark:bg-[#334155]" />

      {/* Mode Badge */}
      {!isEditing && mode !== "create" && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-surface border border-gray-200 dark:border-[#444746] rounded shrink-0">
          <Eye size={10} className="text-gray-400" /> Visualização
        </span>
      )}
      {isEditing && mode !== "create" && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded shrink-0">
          <Edit2 size={10} /> Edição
        </span>
      )}

      {/* Botão Editar — só em modo de visualização */}
      {!isEditing && mode !== "create" && canEditThisItem && (
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="px-3 py-1.5 text-xs font-semibold text-white bg-[#4285F4] hover:bg-[#3367D6] dark:hover:bg-[#1A73E8] hover:text-white rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Pencil size={13} className="text-white" /> Editar
        </button>
      )}

      {/* Botão Cancelar — em modo de edição, sai do modo (não fecha o Drawer) */}
      {isEditing && (
        <button
          type="button"
          onClick={() => handleCancelWithRollback()}
          className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-surface border border-gray-300 dark:border-[#444746] rounded-lg hover:bg-gray-100 dark:hover:bg-[#131314] transition-colors shadow-xs"
        >
          Cancelar
        </button>
      )}

      {/* Botão Guardar — em modo de edição ou criação */}
      {(isEditing || isCreateMode) && canEditThisItem && (
        <button
          type={isCreateMode ? "button" : "submit"}
          form={!isCreateMode ? "company-form" : undefined}
          onClick={
            isCreateMode
              ? () => {
                const newId = nanoid();
                addCompany({
                  ...newItem,
                  id: newId,
                  projectId,
                  workflowStatus: "draft",
                } as Company);
                setIsModalOpen(false);
              }
              : undefined
          }
          disabled={isCreateMode ? !isCreateFormValid : false}
          className={cn(
            "px-3 py-1.5 text-xs font-semibold text-white bg-[#4285F4] hover:bg-[#3367D6] rounded-lg transition-colors shadow-xs flex items-center gap-1.5",
            isCreateMode && !isCreateFormValid && "opacity-50 cursor-not-allowed bg-gray-400 hover:bg-gray-400",
          )}
        >
          {showSavedMessage && (
            <span className="text-[11px] font-medium text-green-200 animate-in fade-in slide-in-from-right-2">✓ Guardado</span>
          )}
          <Save size={13} /> Guardar
        </button>
      )}

      {/* ─── Workflow Buttons (View Mode Only) ─── */}
          {!isEditing && mode !== "create" && (
        <>
          <div className="h-8 w-px bg-gray-200 dark:bg-[#444746]" />

          {/* 3. REVER / ENVIAR (Manager -> Data User) */}
          {(isManager || isCreateMode) &&
            (
              newItem.workflowStatus === "draft" ||
              newItem.workflowStatus === "validation_pending" ||
              (newItem.workflowStatus === "approval_data_update" &&
                (Array.from(pendingTicketActions.values()).some((a) => a === "forward" || a === "open") ||
                  tickets.some(
                    (t) => t.entityId === (newItem as any).id && t.status === "open" && t.createdBy === currentUser?.id,
                  ))) ||
              ((newItem.workflowStatus === "validated" || newItem.workflowStatus === "approved") &&
                tickets.some(
                  (t) => t.entityId === (newItem as any).id && t.status === "open" && t.createdBy === currentUser?.id,
                )) ||
              isCreateMode
            ) &&
            (() => {
              const isDraftReverDisabled =
                newItem.workflowStatus === "draft" &&
                tickets.filter(
                  (t) =>
                    t.entityId === (newItem as any).id &&
                    t.status === "open" &&
                    t.createdBy === currentUser?.id &&
                    !t.isDraft,
                ).length === 0;
              return (
                <div
                  title={
                    isDraftReverDisabled
                      ? "Adicione pelo menos um ticket de revisão antes de enviar."
                      : ""
                  }
                  className={isDraftReverDisabled ? "cursor-not-allowed inline-block" : "inline-block"}
                >
                  <button
                    type="button"
                    disabled={isDraftReverDisabled}
                    onClick={() => {
                      setConfirmationType("requestDetails");
                      setIsSubmitConfirmationOpen(true);
                    }}
                    className={cn(
                      "px-3 py-1.5 text-xs font-semibold text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors shadow-xs flex items-center gap-1.5",
                      isDraftReverDisabled && "opacity-50 pointer-events-none bg-gray-400 hover:bg-gray-400",
                    )}
                  >
                    <ArrowLeft size={13} /> Rever
                  </button>
                </div>
              );
            })()}

          {/* REVER (Approver -> Manager) */}
          {(() => {
            const headerCompanyOpenTickets = (newItem as any).id
              ? tickets.filter((t) => t.entityId === (newItem as any).id && t.status === "open")
              : [];
            const headerHasPendingReviewTickets =
              headerCompanyOpenTickets.length > 0 &&
              headerCompanyOpenTickets.some((t) => {
                const action = pendingTicketActions.get(t.id);
                return action === "forward" || action === "request_revision" || action === "open";
              });
            if (!isApprovalUser || newItem.workflowStatus !== "approval_pending") return null;
            return (
              <div title={!headerHasPendingReviewTickets ? "Tem de definir ação em pelo menos um ticket para pedir revisão." : ""} className={!headerHasPendingReviewTickets ? "cursor-not-allowed inline-block" : "inline-block"}>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmationType("requestDetails");
                    setIsSubmitConfirmationOpen(true);
                  }}
                  disabled={!headerHasPendingReviewTickets}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors shadow-xs flex items-center gap-1.5",
                    !headerHasPendingReviewTickets && "opacity-50 pointer-events-none bg-gray-400 hover:bg-gray-400",
                  )}
                >
                  <ArrowLeft size={13} /> Rever
                </button>
              </div>
            );
          })()}

          {/* 4. SEGUIR (Data User -> Manager) */}
          {effectiveIsDataUser && currentWaitingForRole === "data_user" && (
            <div title={!isDataUserReady ? `Em falta:\n${dataUserValidation.messages.join('\n')}` : ""} className={!isDataUserReady ? "cursor-not-allowed inline-block" : "inline-block"}>
              <button
                type="button"
                disabled={!isDataUserReady}
                onClick={() => {
                  setConfirmationType("submit");
                  setIsSubmitConfirmationOpen(true);
                }}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shadow-xs flex items-center gap-1.5",
                  !isDataUserReady ? "opacity-50 pointer-events-none text-white bg-gray-400" : "text-white hover:opacity-90 bg-purple-600",
                )}
              >
                <Forward size={13} /> Seguir
              </button>
            </div>
          )}

          {/* SEGUIR (Manager -> Approver via Validated status) */}
          {isManager && newItem.workflowStatus === "validated" && currentProject?.approvalWorkflow?.companies && (
            <div title={!isAllValidated ? `Falta validar/preencher:\n${validation.details.join('\n')}` : ""} className={!isAllValidated ? "cursor-not-allowed inline-block" : "inline-block"}>
              <button
                type="button"
                disabled={!isAllValidated}
                onClick={() => {
                  setConfirmationType("submit");
                  setIsSubmitConfirmationOpen(true);
                }}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shadow-xs flex items-center gap-1.5",
                  !isAllValidated ? "opacity-50 pointer-events-none bg-gray-400 text-white" : "text-white hover:opacity-90 bg-purple-600",
                )}
              >
                <Forward size={13} /> Seguir
              </button>
            </div>
          )}

          {/* SEGUIR (Manager -> Approver via approval_data_update) */}
          {isManager &&
            !isActingAsDataUser &&
            newItem.workflowStatus === "approval_data_update" &&
            (() => {
              const companyTicketsForApproval = tickets.filter(
                (t) => t.entityId === (newItem as any).id && t.status === "open" && !t.isDraft,
              );
              const approverCreatedTickets = companyTicketsForApproval.filter((t) => {
                const creatorRole = t.createdBy ? getUserRoleInProject(t.createdBy, projectId) : null;
                return creatorRole === "approval_user";
              });
              const allApproverTicketsCorrected =
                approverCreatedTickets.length === 0 ||
                approverCreatedTickets.every((t) => {
                  const action = pendingTicketActions.get(t.id);
                  if (action === "resolve") return true;
                  const tMsgs = (ticketMessages || []).filter((m: any) => m.ticketId === t.id && !m.isSystemMessage);
                  const latestMsg = tMsgs.sort(
                    (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
                  )[0];
                  return (
                    latestMsg?.message?.startsWith("Correção efetuada") ||
                    latestMsg?.message?.startsWith("Correction made")
                  );
                });
              const canManagerSubmitApproval = allApproverTicketsCorrected && isAllValidated;
              if (currentProject?.approvalWorkflow?.companies) {
                return (
                  <div title={!canManagerSubmitApproval ? `Falta validar/preencher:\n- Resolver tickets do aprovador\n${validation.details.join('\n')}` : ""} className={!canManagerSubmitApproval ? "cursor-not-allowed inline-block" : "inline-block"}>
                    <button
                      type="button"
                      disabled={!canManagerSubmitApproval}
                      onClick={() => {
                        setConfirmationType("submit");
                        setIsSubmitConfirmationOpen(true);
                      }}
                      className={cn(
                        "px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shadow-xs flex items-center gap-1.5",
                        !canManagerSubmitApproval ? "opacity-50 pointer-events-none bg-gray-400 text-white" : "text-white hover:opacity-90 bg-purple-600",
                      )}
                    >
                      <Forward size={13} /> Seguir
                    </button>
                  </div>
                );
              }
              return null;
            })()}

          {/* 5. VALIDAR ou SEGUIR (from Validation Pending) */}
          {isManager &&
            (currentWaitingForRole === "manager" || newItem.workflowStatus === "validated" || newItem.workflowStatus === "approved") &&
            newItem.workflowStatus === "validation_pending" && (
              <div title={!isAllValidated ? `Falta validar/preencher:\n${validation.details.join('\n')}` : ""} className={!isAllValidated ? "cursor-not-allowed inline-block" : "inline-block"}>
                <button
                  type="button"
                  disabled={!isAllValidated}
                  onClick={() => {
                    setConfirmationType("submit");
                    setIsSubmitConfirmationOpen(true);
                  }}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shadow-xs flex items-center gap-1.5",
                    currentProject?.approvalWorkflow?.companies
                      ? !isAllValidated ? "opacity-50 pointer-events-none bg-gray-400 text-white" : "text-white hover:opacity-90 bg-purple-600"
                      : !isAllValidated ? "opacity-50 pointer-events-none bg-gray-400 text-white" : "bg-green-600 text-white hover:bg-green-700 font-medium"
                  )}
                >
                  {currentProject?.approvalWorkflow?.companies ? (
                    <><Forward size={13} /> Seguir</>
                  ) : (
                    "Validar"
                  )}
                </button>
              </div>
            )}

          {/* 6. APROVAR */}
          {isApprovalUser &&
            (newItem.workflowStatus === "approval_pending" || newItem.workflowStatus === "approval_data_update") &&
            (() => {
              const headerOpenTickets = (newItem as any).id
                ? tickets.filter((t) => t.entityId === (newItem as any).id && t.status === "open")
                : [];
              const unresolvedOpenTickets = headerOpenTickets.filter(
                (t) => pendingTicketActions.get(t.id) !== "resolve",
              );
              const approverCanApprove =
                newItem.workflowStatus === "approval_pending" && unresolvedOpenTickets.length === 0 && isAllValidated;
              return (
                <div title={!approverCanApprove ? "Tem de resolver todos os tickets abertos e validar os campos restantes." : ""} className={!approverCanApprove ? "cursor-not-allowed inline-block" : "inline-block"}>
                  <button
                    type="button"
                    disabled={!approverCanApprove}
                    onClick={() => {
                      setConfirmationType("submitReview");
                      setIsSubmitConfirmationOpen(true);
                    }}
                    className={cn(
                      "px-3 py-1.5 text-xs font-semibold text-white rounded-lg transition-colors shadow-xs flex items-center gap-1.5",
                      !approverCanApprove ? "opacity-50 pointer-events-none bg-gray-400 hover:bg-gray-400" : "bg-green-600 hover:bg-green-700",
                    )}
                  >
                    Aprovar
                  </button>
                </div>
              );
            })()}
        </>
      )}
    </div>
  );

  const headerContent = (
    <div className="flex flex-row items-center justify-between border-b border-[var(--border)] w-full mt-2 overflow-x-auto">
      <div className="flex items-center gap-1">
        {[
          { id: "info", label: "1. Identificação" },
          { id: "site", label: "2. Obra & Atividade" },
          { id: "legal", label: "3. Legal & Documentos" },
          { id: "docs", label: "4. Ficheiros" },
          { id: "history", label: "5. Histórico" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 py-2.5 px-3.5 border-b-2 transition-colors text-xs font-medium whitespace-nowrap shrink-0",
              activeTab === tab.id
                ? "border-[#4285F4] text-[#4285F4] font-semibold"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]",
            )}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
      {activeTab === "info" && (
        <button
          type="button"
          onClick={() => setShowCompanyStats(!showCompanyStats)}
          className="text-xs font-semibold text-[#4285F4] hover:text-[#3367D6] flex items-center gap-1.5 bg-blue-500/10 hover:bg-blue-500/20 px-2.5 py-1 rounded-lg transition-colors border border-blue-500/20 shrink-0 mb-1"
        >
          <Info size={13} />
          {showCompanyStats ? "Ocultar Info" : "+ Info"}
        </button>
      )}
    </div>
  );

  // Footer Logic
  // validation and isAllValidated now declared before drawerActions above



  const handleCreateAndRequest = () => {
    if (!newItem.assignedDataUserId) return;
    const newId = nanoid();
    addCompany({
      ...newItem,
      id: newId,
      projectId,
      workflowStatus: "draft",
    } as Company);
    // Use setTimeout to allow store update if needed, or call request directly
    setTimeout(() => requestCompanyDocumentation(newId), 100);
    setIsModalOpen(false);
  };

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* Header / Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border)] mb-4 px-2 pt-2">
        {/* Title + Count */}
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-[var(--text)] tracking-tight">
            Organizações
          </h1>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[var(--bg-input)] text-[var(--text-muted)] border border-[var(--border)]">
            {filteredCompanies.length}
          </span>
        </div>

        {/* Controls & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" size={15} />
            <input
              type="text"
              placeholder="Pesquisar organizações..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-40 sm:w-48 focus:w-60 transition-all duration-200 pl-9 pr-3 py-1.5 text-xs bg-[var(--bg-input)] text-[var(--text)] border border-[var(--border)] rounded-lg outline-none focus:border-[#4285F4] placeholder:text-[var(--text-muted)]"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex items-center bg-[var(--bg-input)] border border-[var(--border)] rounded-lg p-0.5">
            {[
              { key: 'all', label: 'Todas' },
              { key: 'active', label: 'Em Obra' },
              ...(isManager ? [{ key: 'archived', label: 'Arquivadas' }] : [])
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as any)}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap",
                  filter === tab.key
                    ? "bg-[var(--bg-card)] text-[var(--text)] font-semibold shadow-xs"
                    : "text-[var(--text-muted)] hover:text-[var(--text)]"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 text-xs bg-[var(--bg-input)] text-[var(--text)] border border-[var(--border)] rounded-lg outline-none focus:border-[#4285F4] cursor-pointer"
            >
              <option value="all">Estado: Todos</option>
              <option value="draft">Rascunho</option>
              <option value="data_requested">Dados Pedidos</option>
              <option value="data_update">Atualização</option>
              <option value="validation_pending">Pendente Validação</option>
              <option value="validated">Validada</option>
              <option value="approval_pending">Pendente Aprovação</option>
              <option value="approved">Aprovada</option>
              <option value="off_site">Fora da Obra</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" size={13} />
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

          {/* New Company Button */}
          {canCreate && (
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-[#4285F4] hover:bg-[#3367D6] rounded-lg shadow-xs transition-all whitespace-nowrap"
            >
              <Plus size={15} /> <span>Nova Organização</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <ListView
          companies={filteredCompanies}
          globalSequenceMap={globalSequenceMap}
          onRowClick={handleRowClick}
          onAction={handleAction}
          canEdit={canEditDirectly}
          canDelete={!!canDelete}
          getValidationStatus={getDisplayStatus}
          openMenuId={openMenuId}
          setOpenMenuId={setOpenMenuId}
        />
      </div>

      {isManager && pendingRequests.length > 0 && (
        <div className="mb-4 mx-4 bg-amber-50 border border-amber-200 rounded-lg p-4 transition-all">
          <h3 className="text-sm font-medium text-amber-800 flex items-center gap-2 mb-3">
            <AlertCircle size={16} /> Pending Approvals (
            {pendingRequests.length})
          </h3>
          <div className="space-y-2">
            {pendingRequests.map((req) => {
              const companyName =
                activeCompanies.find((c) => c.id === req.companyId)?.name ||
                "Unknown Company";
              return (
                <div
                  key={req.id}
                  className="flex items-center justify-between bg-white dark:bg-surface p-3 rounded border border-amber-100 shadow-sm"
                >
                  <span className="text-sm text-gray-700 dark:text-gray-200">
                    Update requested for <b>{companyName}</b>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => resolveCompanyRequest(req.id, "approved")}
                      className="p-1 text-green-600 hover:bg-green-50 rounded"
                    >
                      <Check size={18} />
                    </button>
                    <button
                      onClick={() => resolveCompanyRequest(req.id, "rejected")}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <PDFConfigModal
        isOpen={isPDFModalOpen}
        onClose={() => setIsPDFModalOpen(false)}
        onGenerate={handleGeneratePDF}
      />
      <CompanyQuickCreateModal
        isOpen={isQuickCreateOpen}
        onClose={() => setIsQuickCreateOpen(false)}
        onCreate={handleQuickCreate}
        profiles={companyProfiles.filter((p) => p.projectId === projectId)}
        companies={activeCompanies}
        defaultProfileId={currentProject?.defaultCompanyProfileId}
      />

      <ConfirmationModal
        isOpen={!!confirmation}
        onClose={() => setConfirmation(null)}
        onConfirm={() => {
          if (confirmation) archiveCompany(confirmation.company.id);
          setConfirmation(null);
        }}
        title="Archive Company?"
        message={`Are you sure you want to archive "${confirmation?.company.name}"?`}
        description="The company will be moved to the archived list. You can restore it later."
        confirmText="Archive Company"
        variant="warning"
        icon="archive"
      />

      {/* Company Details Drawer (Replaces Modal) */}
      <Drawer
        isOpen={isModalOpen}
        onClose={() => {
          if (reviewModalOpen) return;
          handleCustomCancel();
        }}
        title={
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-[#4285F4] flex items-center justify-center font-bold text-xs shrink-0 border border-blue-500/20 shadow-2xs">
              {newItem?.name ? newItem.name.slice(0, 2).toUpperCase() : 'ORG'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-bold text-[var(--text)] tracking-tight truncate">
                  {mode === "create"
                    ? "Nova Organização"
                    : newItem?.name || "Detalhes da Organização"}
                </h2>
                {statusBadge}
              </div>
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mt-0.5 truncate">
                <span className="truncate">NIF: {newItem?.nif || '---'}</span>
                {waitingFor && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-[var(--border)] shrink-0"></span>
                    <span className="flex items-center gap-1 truncate">
                      <Clock size={12} className="shrink-0" />
                      <span>A aguardar: {waitingFor}</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        }
        actions={drawerActions}
        headerContent={headerContent}
      >
        {(() => {
          const realCompany = activeCompanies.find(
            (c) => c.id === (newItem as any).id,
          );
          const workflowLocked =
            !isManager &&
            realCompany &&
            (realCompany.workflowStatus === "validation_pending" ||
              realCompany.workflowStatus === "validated");

          // Resolve Assigned User for Logic
          const resolvedAssignedId =
            realCompany?.assignedDataUserId ||
            users.find((u) =>
              u.projectAccess?.some(
                (pa) =>
                  pa.projectId === projectId &&
                  pa.role === "data_user" &&
                  realCompany?.id &&
                  pa.companyIds?.includes(realCompany.id),
              ),
            )?.id;

          const isAssignedDataUser =
            effectiveIsDataUser &&
            (resolvedAssignedId === currentUser?.id || isActingAsDataUser);

          // Tickets Logic
          const companyOpenTickets = (newItem as any).id
            ? tickets.filter(
              (t) =>
                t.entityId === (newItem as any).id && t.status === "open",
            )
            : [];
          const hasOpenTickets = companyOpenTickets.length > 0;

          // Button is only active when AT LEAST ONE open ticket has been explicitly actioned by the manager/approver
          // (forward, request_revision, or open).
          const hasPendingReviewTickets =
            companyOpenTickets.length > 0 &&
            companyOpenTickets.some((t) => {
              const action = pendingTicketActions.get(t.id);
              return (
                action === "forward" ||
                action === "request_revision" ||
                action === "open"
              );
            });

          // Check if there are tickets assigned to the Data User (Real or Acting)
          const hasDataUserTickets = companyOpenTickets.some(
            (t) => t.assignedTo === resolvedAssignedId,
          );

          const canEditAssigned =
            isAssignedDataUser && getWaitingForRole((realCompany || newItem) as Company) === "data_user";

          // Manager in validation_pending: can enter Edit mode (for validate/resolve actions) but NOT edit field content
          const isManagerValidationReview =
            effectiveIsManager &&
            newItem.workflowStatus === "validation_pending";

          const canEditThisItem =
            canEditDirectly ||
            canEditAssigned ||
            isManagerValidationReview ||
            (isApprovalUser &&
              (realCompany?.workflowStatus === "approval_pending" ||
                (newItem as any).workflowStatus === "approval_pending"));

          // Visibility Logic
          const selectedProfile = companyProfiles.find(
            (p) => p.id === newItem.profileId,
          );
          const isVisible = (key: string) => {
            if (!newItem.profileId) return true;
            if (!selectedProfile) return true;
            return !!selectedProfile.requirements?.[
              key as keyof typeof selectedProfile.requirements
            ];
          };

          const isUploadVisible = (key: string) => {
            if (!newItem.profileId) return true;
            if (!selectedProfile) return true;
            return selectedProfile.standardUploads?.[key] !== false;
          };

          return (
            <form id="company-form" onSubmit={handleSubmit}>
              <div className="mt-4">
                {activeTab === "info" && (
                  <div className="animate-in fade-in duration-300 mb-8 mt-4 space-y-4">
                    <div className="flex gap-6 items-start">
                      <div
                        className={cn(
                          "transition-all duration-300",
                          showCompanyStats ? "w-3/4" : "w-full",
                        )}
                      >
                        {/* Unified Identification & Site Info Table */}
                        <div className="overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-[13px]">
                              <thead className="bg-gray-50/80 dark:bg-surface/80 border-b border-gray-200 dark:border-[#444746] text-gray-500 uppercase tracking-wider text-[11px] font-bold">
                                <tr>
                                  <th className="px-4 py-3 min-w-[200px]">
                                    Campo
                                  </th>
                                  <th className="px-4 py-3 min-w-[200px]">
                                    Valor Registado
                                  </th>
                                  <th className="px-4 py-3 w-[150px] text-center">
                                    Estado
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 dark:divide-[#444746]">
                                <tr className="bg-primary/5 dark:bg-primary/10 border-y border-primary/10 dark:border-primary/20">
                                  <td
                                    colSpan={3}
                                    className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-primary dark:text-primary-light"
                                  >
                                    Identification
                                  </td>
                                </tr>

                                {[
                                  {
                                    id: "name",
                                    ...getFieldProps("name", "Company Name *"),
                                  },
                                  {
                                    id: "nif",
                                    ...getFieldProps("nif", "Tax ID (NIF)"),
                                  },
                                  {
                                    id: "profileId",
                                    ...getFieldProps(
                                      "profileId",
                                      "Company Profile *",
                                    ),
                                    value:
                                      companyProfiles.find(
                                        (p) => p.id === newItem.profileId,
                                      )?.name || "Unset...",
                                    type: "text",
                                  },
                                  {
                                    id: "email",
                                    ...getFieldProps("email", "General Email"),
                                  },
                                  {
                                    id: "phone",
                                    ...getFieldProps("phone", "Phone"),
                                  },
                                  {
                                    id: "address",
                                    ...getFieldProps(
                                      "address",
                                      "Headquarters Address",
                                    ),
                                  },
                                  {
                                    id: "activity",
                                    ...getFieldProps(
                                      "activity",
                                      "Main Activity",
                                    ),
                                  },
                                  {
                                    id: "companyRole",
                                    ...getFieldProps(
                                      "companyRole",
                                      "Tipo de empresa no projeto",
                                    ),
                                    value: (() => {
                                      if (!newItem.companyRole) return undefined;
                                      if (newItem.companyRole === 'outro') return newItem.companyRoleCustom || undefined;
                                      return COMPANY_ROLE_OPTIONS.find(o => o.value === newItem.companyRole)?.label || newItem.companyRole;
                                    })(),
                                    type: "text"
                                  },
                                  {
                                    id: "impic",
                                    ...getFieldProps(
                                      "impic",
                                      "IMPIC / License",
                                    ),
                                  },
                                  {
                                    id: "legalForm",
                                    ...getFieldProps(
                                      "legalForm",
                                      "Natureza Jurídica",
                                    ),
                                    value: newItem.legalForm ? { sa: "S.A.", lda: "Lda.", unipessoal: "Unipessoal Lda.", eni: "ENI", ace: "ACE", other: "Outra" }[newItem.legalForm as string] || newItem.legalForm : "Unset...",
                                    type: "text"
                                  },
                                  {
                                    id: "parentId",
                                    ...getFieldProps(
                                      "parentId",
                                      "Parent Company *",
                                    ),
                                    value:
                                      !newItem.parentId ||
                                        newItem.parentId === "root"
                                        ? "None (General Contractor)"
                                        : companies.find(
                                          (c) => c.id === newItem.parentId,
                                        )?.name || "Unknown Company",
                                    type: "text",
                                  },
                                ].map((field: any, index: number) => (
                                  <tr
                                    key={field.id || index}
                                    className="hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors cursor-pointer group"
                                    onClick={(e) => {
                                      setEditingTabModal("info");
                                    }}
                                  >
                                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                      <div className="flex items-center gap-2">
                                        {field.hasOpenTicket && (
                                          <span
                                            className="w-2 h-2 rounded-full shadow-sm"
                                            style={{
                                              backgroundColor:
                                                field.ticketDotColor ||
                                                "#f97316",
                                            }}
                                            title="Open Ticket"
                                          />
                                        )}
                                        {field.label}
                                      </div>
                                    </td>
                                    <td
                                      className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-[300px] truncate"
                                      title={String(
                                        field.value || (newItem as any)[field.id] || "",
                                      )}
                                    >
                                      {(() => {
                                        const val =
                                          field.value || (newItem as any)[field.id];
                                        if (
                                          val === undefined ||
                                          val === null ||
                                          val === ""
                                        )
                                          return (
                                            <span className="text-gray-400 italic font-normal text-xs">
                                              Unset...
                                            </span>
                                          );
                                        return String(val);
                                      })()}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      {!!newItem.fieldValidations?.[
                                        field.id
                                      ] ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400">
                                          <Check size={12} strokeWidth={3} />{" "}
                                          VALIDATED
                                        </span>
                                      ) : newItem.workflowStatus ===
                                        "approved" ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400">
                                          <Shield size={12} strokeWidth={3} />{" "}
                                          APPROVED
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] uppercase font-bold bg-gray-100 dark:bg-[#131314] text-gray-500 dark:text-gray-400">
                                          PENDING
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>

                      {showCompanyStats && (
                        <div className="w-1/4 animate-in fade-in slide-in-from-right-4 duration-300">
                          {(() => {
                            const numAccidents =
                              accidents?.filter(
                                (a: any) =>
                                  a.projectId === projectId &&
                                  a.companyId === newItem.id,
                              ).length || 0;
                            const numIrregularities = 0;
                            const companyOpenTickets = newItem.id
                              ? tickets.filter(
                                (t: any) =>
                                  t.entityId === newItem.id &&
                                  t.status === "open",
                              )
                              : [];
                            const numOpenTickets = companyOpenTickets.length;

                            let safetyScore =
                              100 -
                              numAccidents * 15 -
                              numIrregularities * 10 -
                              numOpenTickets * 5;
                            safetyScore = Math.max(
                              0,
                              Math.min(100, safetyScore),
                            );

                            let safetyColor =
                              "text-green-600 dark:text-green-400";
                            let safetyIconColor = "text-green-600";
                            let icon = (
                              <CheckCircle
                                size={24}
                                className={safetyIconColor}
                                strokeWidth={2.5}
                              />
                            );
                            let statusLabel = "Excellent";

                            if (safetyScore < 50) {
                              safetyColor = "text-red-500 dark:text-red-400";
                              safetyIconColor = "text-red-500";
                              icon = (
                                <ShieldAlert
                                  size={24}
                                  className={safetyIconColor}
                                  strokeWidth={2.5}
                                />
                              );
                              statusLabel = "Critical";
                            } else if (safetyScore < 80) {
                              safetyColor =
                                "text-amber-500 dark:text-amber-400";
                              safetyIconColor = "text-amber-500";
                              icon = (
                                <AlertTriangle
                                  size={24}
                                  className={safetyIconColor}
                                  strokeWidth={2.5}
                                />
                              );
                              statusLabel = "Warning";
                            } else if (safetyScore < 100) {
                              statusLabel = "Good";
                            }

                            return (
                              <div className="flex flex-col gap-4">
                                <div className="bg-white dark:bg-surface border border-gray-200 dark:border-[#444746] rounded-xl p-5 flex items-center justify-between shadow-sm relative overflow-hidden">
                                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-transparent to-gray-50/50 dark:to-[#131314]/50 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />
                                  <div className="flex flex-col relative z-10">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                                      Safety Index
                                    </span>
                                    <div className="flex items-baseline gap-1">
                                      <span
                                        className={cn(
                                          "text-4xl font-black tracking-tight",
                                          safetyColor,
                                        )}
                                      >
                                        {safetyScore}
                                      </span>
                                      <span className="text-xs font-bold text-gray-400">
                                        / 100
                                      </span>
                                    </div>
                                    <span
                                      className={cn(
                                        "text-[11px] font-bold uppercase tracking-wider mt-1",
                                        safetyColor,
                                      )}
                                    >
                                      {statusLabel} Status
                                    </span>
                                  </div>
                                  <div
                                    className={cn(
                                      "w-14 h-14 rounded-full flex items-center justify-center bg-gray-50 dark:bg-[#131314] border border-gray-100 dark:border-[#444746] relative z-10",
                                    )}
                                  >
                                    {icon}
                                  </div>
                                </div>

                                <div className="overflow-hidden">
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left text-[13px]">
                                      <thead className="bg-gray-50/80 dark:bg-surface/80 border-b border-gray-200 dark:border-[#444746] text-gray-500 uppercase tracking-wider text-[11px] font-bold">
                                        <tr>
                                          <th colSpan={2} className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                              <Building2
                                                size={14}
                                                style={{ color: "#0A2540" }}
                                              />
                                              Organization Statistics
                                            </div>
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100 dark:divide-[#444746]">
                                        <tr className="bg-blue-50/50 dark:bg-primary/10 border-y border-blue-100 dark:border-primary/20">
                                          <td className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-primary-light">
                                            Statistic
                                          </td>
                                          <td className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-primary-light text-right">
                                            Count
                                          </td>
                                        </tr>

                                        {/* Workers Stat */}
                                        <tr className="bg-white dark:bg-surface hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors group">
                                          <td className="px-4 py-3 font-medium text-gray-800 dark:text-white">
                                            <div className="flex items-center gap-2">
                                              <div
                                                className="w-6 h-6 rounded-full dark:bg-blue-400/10 flex items-center justify-center border dark:border-blue-400/20"
                                                style={{
                                                  backgroundColor:
                                                    "rgba(10, 37, 64, 0.05)",
                                                  borderColor:
                                                    "rgba(10, 37, 64, 0.1)",
                                                }}
                                              >
                                                <Users
                                                  size={12}
                                                  className="dark:text-blue-400"
                                                  style={{ color: "#0A2540" }}
                                                />
                                              </div>
                                              <span className="text-sm font-medium">
                                                Total Workers
                                              </span>
                                            </div>
                                          </td>
                                          <td className="px-4 py-3 text-right">
                                            <span className="text-sm font-bold text-gray-800 dark:text-gray-100">
                                              {users.filter((u: any) =>
                                                u.projectAccess?.some(
                                                  (pa: any) =>
                                                    pa.projectId ===
                                                    projectId &&
                                                    pa.role === "worker" &&
                                                    pa.companyIds?.includes(
                                                      newItem.id,
                                                    ),
                                                ),
                                              ).length || 0}
                                            </span>
                                          </td>
                                        </tr>

                                        {/* Equipments Stat */}
                                        <tr className="bg-white dark:bg-surface hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors group">
                                          <td className="px-4 py-3 font-medium text-gray-800 dark:text-white">
                                            <div className="flex items-center gap-2">
                                              <div
                                                className="w-6 h-6 rounded-full dark:bg-blue-400/10 flex items-center justify-center border dark:border-blue-400/20"
                                                style={{
                                                  backgroundColor:
                                                    "rgba(10, 37, 64, 0.05)",
                                                  borderColor:
                                                    "rgba(10, 37, 64, 0.1)",
                                                }}
                                              >
                                                <Forklift
                                                  size={12}
                                                  className="dark:text-blue-400"
                                                  style={{ color: "#0A2540" }}
                                                />
                                              </div>
                                              <span className="text-sm font-medium">
                                                Equipments
                                              </span>
                                            </div>
                                          </td>
                                          <td className="px-4 py-3 text-right">
                                            <span className="text-sm font-bold text-gray-800 dark:text-gray-100">
                                              {equipment?.filter(
                                                (e: any) =>
                                                  e.projectId === projectId &&
                                                  e.companyId === newItem.id,
                                              ).length || 0}
                                            </span>
                                          </td>
                                        </tr>

                                        {/* Accidents Stat */}
                                        <tr className="bg-red-50/50 dark:bg-red-900/10 hover:bg-red-100/50 transition-colors group">
                                          <td className="px-4 py-3 font-medium text-gray-800 dark:text-white">
                                            <div className="flex items-center gap-2">
                                              <div
                                                className="w-6 h-6 rounded-full dark:bg-blue-400/10 flex items-center justify-center border dark:border-blue-400/20"
                                                style={{
                                                  backgroundColor:
                                                    "rgba(10, 37, 64, 0.05)",
                                                  borderColor:
                                                    "rgba(10, 37, 64, 0.1)",
                                                }}
                                              >
                                                <AlertTriangle
                                                  size={12}
                                                  className="dark:text-blue-400"
                                                  style={{ color: "#0A2540" }}
                                                />
                                              </div>
                                              <span className="text-sm font-medium">
                                                Accidents
                                              </span>
                                            </div>
                                          </td>
                                          <td className="px-4 py-3 text-right">
                                            <span className="text-sm font-bold text-gray-800 dark:text-gray-100">
                                              {accidents?.filter(
                                                (a: any) =>
                                                  a.projectId === projectId &&
                                                  a.companyId === newItem.id,
                                              ).length || 0}
                                            </span>
                                          </td>
                                        </tr>

                                        {/* Irregularities Stat */}
                                        <tr className="bg-white dark:bg-surface hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors group">
                                          <td className="px-4 py-3 font-medium text-gray-800 dark:text-white">
                                            <div className="flex items-center gap-2">
                                              <div
                                                className="w-6 h-6 rounded-full dark:bg-blue-400/10 flex items-center justify-center border dark:border-blue-400/20"
                                                style={{
                                                  backgroundColor:
                                                    "rgba(10, 37, 64, 0.05)",
                                                  borderColor:
                                                    "rgba(10, 37, 64, 0.1)",
                                                }}
                                              >
                                                <ShieldAlert
                                                  size={12}
                                                  className="dark:text-blue-400"
                                                  style={{ color: "#0A2540" }}
                                                />
                                              </div>
                                              <span className="text-sm font-medium">
                                                Open Irregularities
                                              </span>
                                            </div>
                                          </td>
                                          <td className="px-4 py-3 text-right">
                                            <span className="text-sm font-bold text-gray-800 dark:text-gray-100">
                                              0
                                            </span>
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === "site" && (
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
                                <tr className="bg-primary/5 dark:bg-primary/10 border-y border-primary/10 dark:border-primary/20">
                                  <td
                                    colSpan={3}
                                    className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-primary dark:text-primary-light"
                                  >
                                    Site Info
                                  </td>
                                </tr>

                                {[
                                  {
                                    id: "siteManager",
                                    ...getFieldProps("siteManager", "Responsável em Obra"),
                                    value: workers.find(w => w.companyId === newItem.id && w.obligatoryRole?.type === 'SITE_RESPONSIBLE')?.name || "Não Atribuído",
                                    workerLink: workers.find(w => w.companyId === newItem.id && w.obligatoryRole?.type === 'SITE_RESPONSIBLE'),
                                    isSystem: true,
                                    canValidate: false,
                                    canRequestReview: false,
                                  },
                                  {
                                    id: "safetyTechnicianId",
                                    ...getFieldProps("safetyTechnicianId", "Responsável de SHST em Obra"),
                                    value: workers.find(w => w.companyId === newItem.id && w.obligatoryRole?.type === 'SHST_RESPONSIBLE')?.name || "Não Atribuído",
                                    workerLink: workers.find(w => w.companyId === newItem.id && w.obligatoryRole?.type === 'SHST_RESPONSIBLE'),
                                    isSystem: true,
                                    canValidate: false,
                                    canRequestReview: false,
                                  },
                                  {
                                    id: "maxWorkersOnSite",
                                    ...getFieldProps("maxWorkersOnSite", "Nº Máx. Trabalhadores Previsto"),
                                    isRequired: true,
                                  },
                                  {
                                    id: "entryDate",
                                    ...getFieldProps("entryDate", "Data de Entrada"),
                                    type: "date",
                                    isSystem: true,
                                  },
                                ].map((field: any, index: number) => {
                                  return (
                                  <tr
                                    key={field.id || index}
                                    className="hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors cursor-pointer group"
                                    onClick={() => setEditingTabModal("site")}
                                  >
                                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                      <div className="flex items-center gap-2">
                                        {field.hasOpenTicket && (
                                          <span
                                            className="w-2 h-2 rounded-full shadow-sm"
                                            style={{
                                              backgroundColor:
                                                field.ticketDotColor ||
                                                "#f97316",
                                            }}
                                            title="Open Ticket"
                                          />
                                        )}
                                        {field.label}
                                        {field.isRequired && (
                                          <span className="text-red-500 text-xs font-bold">*</span>
                                        )}
                                      </div>
                                    </td>
                                    <td
                                      className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-[300px] truncate"
                                      title={String(
                                        field.value || (newItem as any)[field.id] || "",
                                      )}
                                    >
                                      {(() => {
                                        const val =
                                          field.value || (newItem as any)[field.id];
                                        if (
                                          val === undefined ||
                                          val === null ||
                                          val === "" ||
                                          val === "Não Atribuído"
                                        ) {
                                          if (field.workerLink === undefined && (val === undefined || val === null || val === ""))
                                            return (
                                              <span className="text-gray-400 italic font-normal text-xs">
                                                Unset...
                                              </span>
                                            );
                                          if (field.workerLink === undefined && val === "Não Atribuído")
                                            return <span className="text-amber-500 italic font-medium text-xs">Não Atribuído</span>;
                                        }
                                        if (field.workerLink) {
                                          const worker = field.workerLink;
                                          return (
                                            <button
                                              type="button"
                                              className="flex items-center gap-1.5 text-primary hover:underline font-medium text-sm"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                router.push(`/${params.locale}/project/${params.id}/workers?worker=${worker.id}`);                                              }}
                                            >
                                              <ExternalLink size={12} />
                                              {worker.name}
                                            </button>
                                          );
                                        }
                                        if (field.type === "date")
                                          return new Date(
                                            val,
                                          ).toLocaleDateString();
                                        return String(val);
                                      })()}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      {field.isSystem ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400">
                                          <Check size={12} strokeWidth={3} /> SYSTEM
                                        </span>
                                      ) : !!newItem.fieldValidations?.[
                                        field.id
                                      ] ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400">
                                          <Check size={12} strokeWidth={3} />{" "}
                                          VALIDATED
                                        </span>
                                      ) : newItem.workflowStatus ===
                                        "approved" ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400">
                                          <Shield size={12} strokeWidth={3} />{" "}
                                          APPROVED
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] uppercase font-bold bg-gray-100 dark:bg-[#131314] text-gray-500 dark:text-gray-400">
                                          PENDING
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                                })}
                              </tbody>
                            </table>
                          </div>

                          <div className="flex flex-col gap-2 mx-0">
                            <div className="flex items-center justify-between p-2 border rounded-lg bg-gray-50 dark:bg-[#131314] h-[38px] mt-6">
                              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                Work Completed / Off Site
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const isOffSite =
                                    newItem.workflowStatus === "off_site";
                                  if (isOffSite) {
                                    // Revert to valid status
                                    const approvalEnabled =
                                      currentProject?.approvalWorkflow
                                        ?.companies;
                                    const revertStatus = approvalEnabled
                                      ? "approved"
                                      : "validated";
                                    setNewItem({
                                      ...newItem,
                                      workflowStatus: revertStatus,
                                      exitDate: "",
                                    });
                                  } else {
                                    // Set to Off Site
                                    setNewItem({
                                      ...newItem,
                                      workflowStatus: "off_site",
                                      exitDate: new Date()
                                        .toISOString()
                                        .split("T")[0],
                                    });
                                  }
                                }}
                                className={cn(
                                  "w-8 h-4 rounded-full transition-colors relative",
                                  newItem.workflowStatus === "off_site"
                                    ? "bg-red-500"
                                    : "bg-gray-300",
                                )}
                                disabled={!isManager || !isEditing}
                                title="Toggle Work Completed / Off Site Status"
                              >
                                <span
                                  className={cn(
                                    "absolute top-0.5 left-0.5 bg-white dark:bg-surface w-3 h-3 rounded-full transition-transform shadow-sm",
                                    newItem.workflowStatus === "off_site"
                                      ? "translate-x-4"
                                      : "translate-x-0",
                                  )}
                                />
                              </button>
                            </div>

                            {newItem.workflowStatus === "off_site" && (
                              <FieldControl
                                {...getFieldProps("exitDate", "Exit Date")}
                                canValidate={false}
                                canRequestReview={false}
                              >
                                <input
                                  type="date"
                                  className="w-full p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-colors"
                                  value={newItem.exitDate || ""}
                                  onChange={(e) =>
                                    setNewItem({
                                      ...newItem,
                                      exitDate: e.target.value,
                                    })
                                  }
                                  disabled={!isManager || !isEditing}
                                />
                              </FieldControl>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {activeTab === "legal" && (
                  <div className="space-y-6 animate-in fade-in duration-300 mb-8 mt-4">
                    {/* Data Table Implementation */}
                    <div className="overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-[13px]">
                          <thead className="bg-gray-50/80 dark:bg-surface/80 border-b border-gray-200 dark:border-[#444746] text-gray-500 uppercase tracking-wider text-[11px] font-bold">
                            <tr>
                              <th className="px-4 py-3 min-w-[300px]">
                                Documento
                              </th>
                              <th className="px-4 py-3 min-w-[200px]">
                                Valor Registado
                              </th>
                              <th className="px-4 py-3 w-[150px] text-center">
                                Ficheiro
                              </th>
                              <th className="px-4 py-3 w-[150px] text-center">
                                Estado
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-[#444746]">
                            {/* We render grouped rows */}
                            {(() => {
                              const groupedRows: Record<string, any[]> = {};

                              const addRow = (
                                groupKey: string,
                                rowData: any,
                              ) => {
                                if (!groupedRows[groupKey])
                                  groupedRows[groupKey] = [];
                                groupedRows[groupKey].push(rowData);
                              };

                              if (isVisible("insurance_at")) {
                                addRow("insurancePolicies", {
                                  id: "insuranceWorkAccDate",
                                  label:
                                    "Seguro Ac. Trabalho — Recibo",
                                  category: "insurance_work_acc_receipt",
                                  type: "date",
                                  isUploadVisible:
                                    isUploadVisible("insurance_at"),
                                  value: newItem.insuranceWorkAccDate,
                                  isValidated:
                                    !!newItem.fieldValidations?.[
                                    "insuranceWorkAccDate"
                                    ],
                                  hasOpenTicket: getFieldProps(
                                    "insuranceWorkAccDate",
                                    "",
                                  ).hasOpenTicket,
                                  ticketDotColor: getFieldProps(
                                    "insuranceWorkAccDate",
                                    "",
                                  ).ticketDotColor,
                                  approvalStatus: newItem.approvalStatus,
                                  workflowStatus: newItem.workflowStatus,
                                  canValidate: isManager && isEditing,
                                  canApprove:
                                    isApprovalUser &&
                                    newItem.workflowStatus === "validated",
                                  canRequestReview:
                                    newItem.workflowStatus !== "draft" &&
                                    newItem.workflowStatus !==
                                    "data_requested" &&
                                    !isDataUser,
                                  onToggleValidation: () => {
                                    const isValidating =
                                      !newItem.fieldValidations?.[
                                      "insuranceWorkAccDate"
                                      ];
                                    toggleFieldValidation(
                                      newItem.id!,
                                      "insuranceWorkAccDate",
                                      isValidating,
                                    );
                                    setNewItem((prev: any) => ({
                                      ...prev,
                                      fieldValidations: {
                                        ...prev.fieldValidations,
                                        insuranceWorkAccDate: isValidating,
                                      },
                                    }));
                                  },
                                  entityId: newItem.id,
                                  isExpirationDate: true,
                                  renderControl: () => null,
                                });

                                 addRow("insurancePolicies", {
                                   id: "insuranceWorkAccPolicy",
                                   label: "Seguro Ac. Trabalho — Apólice",
                                   category: "insurance_work_acc_policy",
                                   type: "text",
                                   isUploadVisible: isUploadVisible("insurance_at"),
                                   value: newItem.insuranceWorkAccPolicy,
                                   isValidated: !!newItem.fieldValidations?.["insuranceWorkAccPolicy"],
                                   hasOpenTicket: getFieldProps("insuranceWorkAccPolicy", "").hasOpenTicket,
                                   ticketDotColor: getFieldProps("insuranceWorkAccPolicy", "").ticketDotColor,
                                   approvalStatus: newItem.approvalStatus,
                                   workflowStatus: newItem.workflowStatus,
                                   canValidate: isManager && isEditing,
                                   canApprove: isApprovalUser && newItem.workflowStatus === "validated",
                                   canRequestReview: newItem.workflowStatus !== "draft" && newItem.workflowStatus !== "data_requested" && !isDataUser,
                                   onToggleValidation: () => {
                                     const isValidating = !newItem.fieldValidations?.["insuranceWorkAccPolicy"];
                                     toggleFieldValidation(newItem.id!, "insuranceWorkAccPolicy", isValidating);
                                     setNewItem((prev: any) => ({
                                       ...prev,
                                       fieldValidations: { ...prev.fieldValidations, insuranceWorkAccPolicy: isValidating },
                                     }));
                                   },
                                   entityId: newItem.id,
                                   renderControl: () => null,
                                 });
                              }

                               if (isVisible("insurance_rc")) {
                                 addRow("insurancePolicies", {
                                   id: "insuranceCivilDate",
                                   label: "Seguro Resp. Civil — Recibo",
                                   category: "insurance_civil_receipt",
                                   type: "date",
                                   isUploadVisible: isUploadVisible("insurance_rc"),
                                   value: newItem.insuranceCivilDate,
                                   isValidated: !!newItem.fieldValidations?.["insuranceCivilDate"],
                                   hasOpenTicket: getFieldProps("insuranceCivilDate", "").hasOpenTicket,
                                   ticketDotColor: getFieldProps("insuranceCivilDate", "").ticketDotColor,
                                   approvalStatus: newItem.approvalStatus,
                                   workflowStatus: newItem.workflowStatus,
                                   canValidate: isManager && isEditing,
                                   canApprove: isApprovalUser && newItem.workflowStatus === "validated",
                                   canRequestReview: newItem.workflowStatus !== "draft" && newItem.workflowStatus !== "data_requested" && !isDataUser,
                                   onToggleValidation: () => {
                                     const isValidating = !newItem.fieldValidations?.["insuranceCivilDate"];
                                     toggleFieldValidation(newItem.id!, "insuranceCivilDate", isValidating);
                                     setNewItem((prev: any) => ({
                                       ...prev,
                                       fieldValidations: { ...prev.fieldValidations, insuranceCivilDate: isValidating },
                                     }));
                                   },
                                   entityId: newItem.id,
                                   isExpirationDate: true,
                                   renderControl: () => null,
                                 });
                                 addRow("insurancePolicies", {
                                   id: "insuranceCivilPolicy",
                                   label: "Seguro Resp. Civil — Apólice",
                                   category: "insurance_civil_policy",
                                   type: "text",
                                   isUploadVisible: isUploadVisible("insurance_rc"),
                                   value: newItem.insuranceCivilPolicy,
                                   isValidated: !!newItem.fieldValidations?.["insuranceCivilPolicy"],
                                   hasOpenTicket: getFieldProps("insuranceCivilPolicy", "").hasOpenTicket,
                                   ticketDotColor: getFieldProps("insuranceCivilPolicy", "").ticketDotColor,
                                   approvalStatus: newItem.approvalStatus,
                                   workflowStatus: newItem.workflowStatus,
                                   canValidate: isManager && isEditing,
                                   canApprove: isApprovalUser && newItem.workflowStatus === "validated",
                                   canRequestReview: newItem.workflowStatus !== "draft" && newItem.workflowStatus !== "data_requested" && !isDataUser,
                                   onToggleValidation: () => {
                                     const isValidating = !newItem.fieldValidations?.["insuranceCivilPolicy"];
                                     toggleFieldValidation(newItem.id!, "insuranceCivilPolicy", isValidating);
                                     setNewItem((prev: any) => ({
                                       ...prev,
                                       fieldValidations: { ...prev.fieldValidations, insuranceCivilPolicy: isValidating },
                                     }));
                                   },
                                   entityId: newItem.id,
                                   renderControl: () => null,
                                 });
                               }

                              // 2. Segurança Social e Finanças
                              if (isVisible("finance_ss")) {
                                addRow("financeAndSS", {
                                  id: "cleanSSDate",
                                  label:
                                    "Non-Debt Declaration (Social Security)",
                                  category: "finance_ss",
                                  type: "date",
                                  isUploadVisible:
                                    isUploadVisible("finance_ss"),
                                  value: newItem.cleanSSDate,
                                  isValidated:
                                    !!newItem.fieldValidations?.["cleanSSDate"],
                                  hasOpenTicket: getFieldProps(
                                    "cleanSSDate",
                                    "",
                                  ).hasOpenTicket,
                                  ticketDotColor: getFieldProps(
                                    "cleanSSDate",
                                    "",
                                  ).ticketDotColor,
                                  approvalStatus: newItem.approvalStatus,
                                  workflowStatus: newItem.workflowStatus,
                                  canValidate: isManager && isEditing,
                                  canApprove: false,
                                  canRequestReview: false,
                                  onToggleValidation: () => {
                                    const isValidating =
                                      !newItem.fieldValidations?.[
                                      "cleanSSDate"
                                      ];
                                    toggleFieldValidation(
                                      newItem.id!,
                                      "cleanSSDate",
                                      isValidating,
                                    );
                                    setNewItem((prev: any) => ({
                                      ...prev,
                                      fieldValidations: {
                                        ...prev.fieldValidations,
                                        cleanSSDate: isValidating,
                                      },
                                    }));
                                  },
                                  entityId: newItem.id,
                                  isExpirationDate: true,
                                  renderControl: () => null,
                                });
                              }

                              if (isVisible("finance_fin")) {
                                addRow("financeAndSS", {
                                  id: "cleanFinDate",
                                  label: "Non-Debt Declaration (Tax Authority)",
                                  category: "finance_fin",
                                  type: "date",
                                  isUploadVisible:
                                    isUploadVisible("finance_fin"),
                                  value: newItem.cleanFinDate,
                                  isValidated:
                                    !!newItem.fieldValidations?.[
                                    "cleanFinDate"
                                    ],
                                  hasOpenTicket: getFieldProps(
                                    "cleanFinDate",
                                    "",
                                  ).hasOpenTicket,
                                  ticketDotColor: getFieldProps(
                                    "cleanFinDate",
                                    "",
                                  ).ticketDotColor,
                                  approvalStatus: newItem.approvalStatus,
                                  workflowStatus: newItem.workflowStatus,
                                  canValidate: isManager && isEditing,
                                  canApprove: false,
                                  canRequestReview: false,
                                  onToggleValidation: () => {
                                    const isValidating =
                                      !newItem.fieldValidations?.[
                                      "cleanFinDate"
                                      ];
                                    toggleFieldValidation(
                                      newItem.id!,
                                      "cleanFinDate",
                                      isValidating,
                                    );
                                    setNewItem((prev: any) => ({
                                      ...prev,
                                      fieldValidations: {
                                        ...prev.fieldValidations,
                                        cleanFinDate: isValidating,
                                      },
                                    }));
                                  },
                                  entityId: newItem.id,
                                  isExpirationDate: true,
                                  renderControl: () => null,
                                });
                              }

                              if (isVisible("ss_discount")) {
                                addRow("financeAndSS", {
                                  id: "ssDiscountSheet",
                                  label: "SS Payment Sheet",
                                  category: "ss_discount_sheet",
                                  type: "month",
                                  isUploadVisible:
                                    isUploadVisible("ss_discount"),
                                  value: newItem.ssDiscountSheet,
                                  isValidated:
                                    !!newItem.fieldValidations?.[
                                    "ssDiscountSheet"
                                    ],
                                  hasOpenTicket: getFieldProps(
                                    "ssDiscountSheet",
                                    "",
                                  ).hasOpenTicket,
                                  ticketDotColor: getFieldProps(
                                    "ssDiscountSheet",
                                    "",
                                  ).ticketDotColor,
                                  approvalStatus: newItem.approvalStatus,
                                  workflowStatus: newItem.workflowStatus,
                                  canValidate: isManager && isEditing,
                                  canApprove: false,
                                  canRequestReview: false,
                                  onToggleValidation: () => {
                                    const isValidating =
                                      !newItem.fieldValidations?.[
                                      "ssDiscountSheet"
                                      ];
                                    toggleFieldValidation(
                                      newItem.id!,
                                      "ssDiscountSheet",
                                      isValidating,
                                    );
                                    setNewItem((prev: any) => ({
                                      ...prev,
                                      fieldValidations: {
                                        ...prev.fieldValidations,
                                        ssDiscountSheet: isValidating,
                                      },
                                    }));
                                  },
                                  entityId: newItem.id,
                                  isExpirationDate: true,
                                  renderControl: () => null,
                                });
                              }

                              if (isVisible("pss_acceptance")) {
                                addRow("siteDocuments", {
                                  id: "pssAcceptanceDate",
                                  label: "H&S Plan Acceptance",
                                  category: "pss_acceptance",
                                  type: "date",
                                  isUploadVisible:
                                    isUploadVisible("pss_acceptance"),
                                  value: newItem.pssAcceptanceDate,
                                  isValidated:
                                    !!newItem.fieldValidations?.[
                                    "pssAcceptanceDate"
                                    ],
                                  hasOpenTicket: getFieldProps(
                                    "pssAcceptanceDate",
                                    "",
                                  ).hasOpenTicket,
                                  ticketDotColor: getFieldProps(
                                    "pssAcceptanceDate",
                                    "",
                                  ).ticketDotColor,
                                  approvalStatus: newItem.approvalStatus,
                                  workflowStatus: newItem.workflowStatus,
                                  canValidate: isManager && isEditing,
                                  canApprove: false,
                                  canRequestReview: false,
                                  onToggleValidation: () => {
                                    const isValidating =
                                      !newItem.fieldValidations?.[
                                      "pssAcceptanceDate"
                                      ];
                                    toggleFieldValidation(
                                      newItem.id!,
                                      "pssAcceptanceDate",
                                      isValidating,
                                    );
                                    setNewItem((prev: any) => ({
                                      ...prev,
                                      fieldValidations: {
                                        ...prev.fieldValidations,
                                        pssAcceptanceDate: isValidating,
                                      },
                                    }));
                                  },
                                  entityId: newItem.id,
                                  isExpirationDate: false,
                                  renderControl: () => null,
                                });
                              }

                              // 3. Horário de Trabalho
                              if (isVisible("work_schedule")) {
                                addRow("siteDocuments", {
                                  id: "workScheduleDelivered",
                                  label: "Work Schedule Delivery",
                                  category: "work_schedule",
                                  type: "boolean",
                                  isUploadVisible: true,
                                  value: documents.some(
                                    (d: any) =>
                                      d.entityId === newItem.id &&
                                      d.category === "work_schedule" &&
                                      !d.archived,
                                  ),
                                  isValidated:
                                    !!newItem.fieldValidations?.[
                                    "workScheduleDelivered"
                                    ],
                                  hasOpenTicket: getFieldProps(
                                    "workScheduleDelivered",
                                    "",
                                  ).hasOpenTicket,
                                  ticketDotColor: getFieldProps(
                                    "workScheduleDelivered",
                                    "",
                                  ).ticketDotColor,
                                  approvalStatus: newItem.approvalStatus,
                                  workflowStatus: newItem.workflowStatus,
                                  canValidate: isManager && isEditing,
                                  canApprove: false,
                                  canRequestReview: false,
                                  onToggleValidation: () => {
                                    const isValidating =
                                      !newItem.fieldValidations?.[
                                      "workScheduleDelivered"
                                      ];
                                    toggleFieldValidation(
                                      newItem.id!,
                                      "workScheduleDelivered",
                                      isValidating,
                                    );
                                    setNewItem((prev: any) => ({
                                      ...prev,
                                      fieldValidations: {
                                        ...prev.fieldValidations,
                                        workScheduleDelivered: isValidating,
                                      },
                                    }));
                                  },
                                  entityId: newItem.id,
                                  renderControl: () => null,
                                });
                              }

                              // 4. Custom Documents
                              if (
                                selectedProfile &&
                                selectedProfile.customDocuments &&
                                selectedProfile.customDocuments.length > 0
                              ) {
                                selectedProfile.customDocuments.forEach(
                                  (doc) => {
                                    const fieldKey = `custom_${doc.id}`;
                                    const isDocVisible = !(
                                      doc.dataType === "boolean" &&
                                      newItem.customDocuments?.[doc.id]
                                        ?.value === "false"
                                    );

                                    const isLocked = !isEditing;
                                    const isValidated =
                                      newItem.fieldValidations?.[fieldKey];
                                    const disableInputs =
                                      isLocked || (isValidated && !isManager);

                                    if (isDocVisible) {
                                      addRow("otherDocuments", {
                                        id: doc.id,
                                        label: doc.name,
                                        category: fieldKey,
                                        type: doc.dataType,
                                        isUploadVisible:
                                          doc.requiresUpload !== false,
                                        value:
                                          newItem.customDocuments?.[doc.id]
                                            ?.value,
                                        isValidated: isValidated,
                                        hasOpenTicket: getFieldProps(
                                          doc.id,
                                          "",
                                        ).hasOpenTicket,
                                        ticketDotColor: getFieldProps(
                                          doc.id,
                                          "",
                                        ).ticketDotColor,
                                        approvalStatus: newItem.approvalStatus,
                                        workflowStatus: newItem.workflowStatus,
                                        canValidate: isManager && isEditing,
                                        canApprove: false,
                                        canRequestReview:
                                          (isManager &&
                                            newItem.workflowStatus !==
                                            "draft" &&
                                            newItem.workflowStatus !==
                                            "data_requested") ||
                                          (isApprovalUser &&
                                            newItem.workflowStatus ===
                                            "approval_pending"),
                                        onToggleValidation: () => {
                                          const isValidating = !isValidated;
                                          const executeValidation = () => {
                                            toggleFieldValidation(
                                              (newItem as any).id,
                                              fieldKey,
                                              isValidating,
                                            );
                                            if (!isValidating) {
                                              const resolvedTickets = (
                                                (newItem as any).tickets || []
                                              ).filter(
                                                (t: any) =>
                                                  t.fieldId === doc.id &&
                                                  t.status === "resolved",
                                              );
                                              resolvedTickets.forEach(
                                                (t: any) =>
                                                  updateTicket(t.id, {
                                                    status: "open",
                                                  }),
                                              );
                                            }
                                            setNewItem((prev: any) => ({
                                              ...prev,
                                              fieldValidations: {
                                                ...prev.fieldValidations,
                                                [fieldKey]: isValidating,
                                              },
                                            }));
                                          };
                                          executeValidation();
                                        },
                                        entityId: newItem.id,
                                        renderControl: () => null,
                                      });
                                    }
                                  },
                                );
                              }

                              return Object.entries(
                                groupedRows as Record<string, any[]>,
                              ).map(([groupKey, rows]) => {
                                if (rows.length === 0) return null;
                                return (
                                  <React.Fragment key={groupKey}>
                                    <tr className="bg-primary/5 dark:bg-primary/10 border-y border-primary/10 dark:border-primary/20">
                                      <td
                                        colSpan={4}
                                        className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-primary dark:text-primary-light"
                                      >
                                        {t(`headers.${groupKey}`) || groupKey}
                                      </td>
                                    </tr>
                                    {rows.map((row: any) => {
                                      const hasDocs = documents.some(
                                        (d) =>
                                          d.entityId === row.entityId &&
                                          d.category === row.category &&
                                          !d.archived,
                                      );
                                      return (
                                        <tr
                                          key={row.id}
                                          className="hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors cursor-pointer group"
                                          onClick={(e) => {
                                            if (
                                              (
                                                e.target as HTMLElement
                                              ).tagName.toLowerCase() ===
                                              "input" ||
                                              (
                                                e.target as HTMLElement
                                              ).tagName.toLowerCase() ===
                                              "select"
                                            )
                                              return;
                                            setSelectedDocRow(row);
                                          }}
                                        >
                                          <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                            <div className="flex items-center gap-2">
                                              {row.hasOpenTicket && (
                                                <span
                                                  className="w-2 h-2 rounded-full shadow-sm"
                                                  style={{
                                                    backgroundColor:
                                                      row.ticketDotColor ||
                                                      "#f97316",
                                                  }}
                                                  title="Open Ticket"
                                                />
                                              )}
                                              {row.label}
                                            </div>
                                          </td>
                                          <td
                                            className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-[200px] truncate"
                                            title={
                                              row.value ? String(row.value) : ""
                                            }
                                          >
                                            {(() => {
                                              if (
                                                row.value === undefined ||
                                                row.value === null ||
                                                row.value === ""
                                              ) {
                                                return (
                                                  <span className="text-gray-400 italic font-normal text-xs">
                                                    Unset...
                                                  </span>
                                                );
                                              }
                                              if (row.type === "date")
                                                return new Date(
                                                  row.value,
                                                ).toLocaleDateString();
                                              if (row.type === "boolean")
                                                return String(row.value) ===
                                                  "true"
                                                  ? "Yes"
                                                  : "No";
                                              return String(row.value);
                                            })()}
                                          </td>
                                          <td className="px-4 py-3 text-center">
                                            {hasDocs ? (
                                              <div
                                                className="inline-flex items-center justify-center p-1.5 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 rounded-md border border-green-100 dark:border-green-500/20 group-hover:scale-105 transition-transform"
                                                title="Document Uploaded"
                                              >
                                                <FileText size={16} />
                                              </div>
                                            ) : (
                                              <div
                                                className="inline-flex items-center justify-center p-1.5 bg-gray-50 dark:bg-[#131314] text-gray-400 dark:text-gray-600 rounded-md border border-gray-100 dark:border-[#444746]"
                                                title="Document Missing"
                                              >
                                                <FileText size={16} />
                                              </div>
                                            )}
                                          </td>
                                          <td className="px-4 py-3 text-center">
                                            {row.isValidated ? (
                                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400">
                                                <Check
                                                  size={12}
                                                  strokeWidth={3}
                                                />{" "}
                                                VALIDATED
                                              </span>
                                            ) : row.approvalStatus ===
                                              "approved" ? (
                                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400">
                                                <Shield
                                                  size={12}
                                                  strokeWidth={3}
                                                />{" "}
                                                APPROVED
                                              </span>
                                            ) : (
                                              <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] uppercase font-bold bg-gray-100 dark:bg-[#131314] text-gray-500 dark:text-gray-400">
                                                PENDING
                                              </span>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </React.Fragment>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "docs" && (
                  <div className="space-y-4">
                    <div className="bg-primary-light p-4 rounded-lg flex justify-between items-center border border-primary/10">
                      <div>
                        <h4 className="text-sm font-semibold text-blue-900">
                          General Documentation
                        </h4>
                        <p className="text-xs text-primary-hover">
                          Upload PDF documents related to this company.
                        </p>
                      </div>
                      {isEditing &&
                        (() => {
                          const hasDoc = useStore
                            .getState()
                            .documents.some(
                              (d) =>
                                d.entityId === (newItem as any).id &&
                                d.category === "general" &&
                                !d.archived,
                            );
                          const isDraft = [
                            "draft",
                            "data_requested",
                            "data_update",
                          ].includes(newItem.workflowStatus || "draft");

                          // If in Draft and Doc Exists -> Hide Upload (Force Delete first)
                          if (isDraft && hasDoc) return null;

                          return (
                            <DocumentUpload
                              layout="button"
                              label={t("actions.uploadDocument")}
                              entityId={(newItem as any).id}
                              projectId={projectId}
                              category="general"
                              onOperation={handleUploadOperation}
                            />
                          );
                        })()}
                    </div>
                    <div className="border rounded-lg bg-gray-50 dark:bg-[#131314] min-h-[300px]">
                      <DocumentList
                        entityId={(newItem as any).id}
                        projectId={projectId}
                        workflowStatus={newItem.workflowStatus}
                      />
                    </div>
                  </div>
                )}

                {activeTab === "history" && (
                  <WorkflowHistory
                    entityId={(newItem as any).id}
                    entityType="company"
                    projectId={projectId}
                  />
                )}
              </div>

            </form>
          );
        })()}
      </Drawer>


      {editingTabModal && (
        <TabEditModal
          tab={editingTabModal}
          setTab={setEditingTabModal}
          newItem={newItem}
          setNewItem={setNewItem}
          getFieldProps={getFieldProps}
          canEditThisItem={canEditDirectly || isActingAsDataUser}
          isEditing={isEditing}
          companyProfiles={companyProfiles}
          projectId={projectId}
          activeCompanies={activeCompanies}
          companies={companies}
          setCorrectedFields={setCorrectedFields}
        />
      )}

      {/* Custom Submit Confirmation Modal */}
      {isSubmitConfirmationOpen &&
        (() => {
          const isRequestDetails = confirmationType === "requestDetails";
          const isSubmitReview = confirmationType === "submitReview";

          // Determine target status for submit action
          let targetStatus: Company["workflowStatus"] = "validation_pending";
          if (isManager && !isActingAsDataUser) {
            targetStatus = "validated";
            if (currentProject?.approvalWorkflow?.companies) {
              targetStatus = "approval_pending";
            }
          }

          const isApprovalWorkflow =
            targetStatus === "approval_pending" && !isSubmitReview;

          // Dynamic content based on action type
          let title = t("common.submissionConfirmation");
          let question = t("common.submitQuestion");
          let message: React.ReactNode = t("common.submissionMessage");
          let IconComponent = Send;
          let colorScheme = "blue";

          if (isRequestDetails) {
            if ((newItem as any).workflowStatus === "draft") {
              // Custom message for Draft -> Data Requested
              title = t("actions.requestDocs");
              question = "Solicitar Dados?";
              message =
                "Todas as alterações serão guardadas e o processo será enviado para pedido de dados.";
              IconComponent = Send;
              colorScheme = "orange";
            } else {
              // Standard Correction Request (Validation Pending -> Data Requested)
              title = t("actions.requestDetails");
              question = "Solicitar Detalhes?";
              // Calc fields with open tickets
              const openTickets = tickets.filter(
                (t) =>
                  t.entityId === (newItem as any).id && t.status === "open",
              );
              const ticketTitles = openTickets.map((t) => {
                // Try to get field label if possible, otherwise use ticket title
                // Ticket title usually contains "Review: Label"
                return t.title.replace("Review: ", "");
              });
              const uniqueTitles = Array.from(new Set(ticketTitles));

              message = (
                <div className="space-y-2">
                  <p>
                    Será enviado pedido de correção para os seguintes dados:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-xs font-medium text-gray-700 dark:text-gray-200 bg-orange-50 p-2 rounded-lg border border-orange-100">
                    {uniqueTitles.map((title, i) => (
                      <li key={i}>{title}</li>
                    ))}
                    {uniqueTitles.length === 0 && (
                      <li>(Nenhum detalhe especificado)</li>
                    )}
                  </ul>
                </div>
              );
              IconComponent = AlertTriangle;
              colorScheme = "orange";
            }
          } else if (isSubmitReview) {
            title = "Aprovar organização";
            question = "Aprovar a organização?";
            message = "Todas as alterações serão guardadas e o processo será aprovado.";
            IconComponent = Check;
            colorScheme = "green";
          } else if (
            (newItem as any).workflowStatus === "approval_data_update" &&
            isManager &&
            !isActingAsDataUser &&
            !isRequestDetails
          ) {
            title = "Submeter para Aprovação";
            question = "Submeter correções para aprovação?";
            message =
              "As correções serão guardadas e o processo retomará o fluxo de aprovação.";
            IconComponent = Send;
            colorScheme = "purple";
          } else if (
            (newItem as any).workflowStatus === "validation_pending" &&
            isManager &&
            !isRequestDetails
          ) {
            if (isApprovalWorkflow) {
              // Manager submitting for Approval
              title = "Submeter para Aprovação";
              question = "Submeter para Aprovação?";
              message =
                "Todas as alterações serão guardadas e o processo será enviado para aprovação.";
              IconComponent = Send;
              colorScheme = "purple";
            } else {
              // Manager Validating (no approval workflow)
              title = "Validar Dados?";
              question = "Validar Dados?";
              message =
                "Todas as alterações serão guardadas e o processo será validado.";
              IconComponent = Check;
              colorScheme = "green";
            }
          } else if (
            (newItem as any).workflowStatus === "approval_pending" &&
            isApprovalUser &&
            !isRequestDetails
          ) {
            title = "Aprovar organização";
            question = "Aprovar a organização?";
            message = "Todas as alterações serão guardadas e o processo será aprovado.";
            IconComponent = Send;
            colorScheme = "purple";
          } else if (isApprovalWorkflow) {
            question = "Submeter para Aprovação?";
            message =
              "Todas as alterações serão guardadas e o processo será enviado para aprovação.";
            colorScheme = "purple";
          }

          const colorStyles = {
            blue: {
              iconColor: "text-blue-600",
              iconBg: "bg-blue-100 dark:bg-blue-900/30",
              boxBg: "bg-blue-50 dark:bg-blue-900/10",
              boxBorder: "border-blue-100 dark:border-blue-900/20",
              buttonColor: "bg-blue-600 hover:bg-blue-700",
            },
            orange: {
              iconColor: "text-orange-600",
              iconBg: "bg-orange-100 dark:bg-orange-900/30",
              boxBg: "bg-orange-50 dark:bg-orange-900/10",
              boxBorder: "border-orange-100 dark:border-orange-900/20",
              buttonColor: "bg-orange-600 hover:bg-orange-700",
            },
            green: {
              iconColor: "text-green-600",
              iconBg: "bg-green-100 dark:bg-green-900/30",
              boxBg: "bg-green-50 dark:bg-green-900/10",
              boxBorder: "border-green-100 dark:border-green-900/20",
              buttonColor: "bg-green-600 hover:bg-green-700",
            },
            purple: {
              iconColor: "text-purple-600",
              iconBg: "bg-purple-100 dark:bg-purple-900/30",
              boxBg: "bg-purple-50 dark:bg-purple-900/10",
              boxBorder: "border-purple-100 dark:border-purple-900/20",
              buttonColor: "bg-purple-600 hover:bg-purple-700",
            },
          };

          const selectedStyles =
            colorStyles[colorScheme as keyof typeof colorStyles] ||
            colorStyles.blue;
          const { iconColor, iconBg, boxBg, boxBorder, buttonColor } =
            selectedStyles;

          return (
            <Modal
              isOpen={isSubmitConfirmationOpen}
              onClose={() => setIsSubmitConfirmationOpen(false)}
              title={title}
            >
              <div className="flex flex-col gap-4 p-4">
                <div
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-xl border",
                    boxBg,
                    boxBorder,
                  )}
                >
                  <div className={cn("p-2 rounded-full", iconBg, iconColor)}>
                    <IconComponent size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 dark:text-gray-100">
                      {question}
                    </h3>
                    <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      {typeof message === "string" ? message : message}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={() => setIsSubmitConfirmationOpen(false)}
                    className="px-4 py-2 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-surface rounded-lg transition-colors"
                  >
                    {t("actions.cancel")}
                  </button>
                  <button
                    onClick={() => {
                      if (isRequestDetails) {
                        // VALIDATE: All open tickets must have a pending action
                        const companyTickets = tickets.filter(
                          (t) =>
                            t.entityId === (newItem as any).id &&
                            t.status === "open",
                        );
                        // Only require actions for tickets NOT opened by the user, OR tickets assigned to the user
                        const ticketsRequiringAction = companyTickets.filter(
                          (t) =>
                            t.createdBy !== currentUser?.id ||
                            t.assignedTo === currentUser?.id,
                        );
                        const ticketsWithoutAction =
                          ticketsRequiringAction.filter(
                            (t) => !pendingTicketActions.has(t.id),
                          );

                        if (ticketsWithoutAction.length > 0) {
                          const ticketNames = ticketsWithoutAction
                            .map((t) => t.title || t.fieldId || "Unknown")
                            .join(", ");
                          alert(
                            `Existem tickets que necessitam de verificação: ${ticketNames}\n\nPor favor, defina uma ação (Forward, Resolve ou Revision) para os tickets que não foram abertos por si ou que lhe exigem ação.`,
                          );
                          return;
                        }

                        // FIX: Request Details - unvalidate fields with tickets
                        companyTickets.forEach((ticket) => {
                          if (ticket.fieldId) {
                            toggleFieldValidation(
                              (newItem as any).id,
                              ticket.fieldId,
                              false,
                            );
                          }
                        });

                        // PROCESS ALL DEFERRED TICKET ACTIONS
                        pendingTicketActions.forEach((action, ticketId) => {
                          const ticket = tickets.find((t) => t.id === ticketId);
                          if (!ticket) return;

                          if (action === "forward") {
                            const dataUserId =
                              (newItem as any).assignedDataUserId ||
                              users?.find(
                                (u) =>
                                  projectId &&
                                  getUserRoleInProject &&
                                  getUserRoleInProject(u.id, projectId) ===
                                  "data_user" &&
                                  u.projectAccess?.some(
                                    (pa) => pa.projectId === projectId,
                                  ),
                              )?.id;
                            if (dataUserId) {
                              updateTicket(ticketId, {
                                assignedTo: dataUserId,
                                status: "open",
                              });
                              addTicketMessage(
                                ticketId,
                                "Ticket reencaminhado para o utilizador.",
                                currentUser?.id || "system",
                              );
                            }
                          } else if (action === "resolve") {
                            updateTicket(ticketId, { status: "resolved" });
                            addTicketMessage(
                              ticketId,
                              "Ticket resolved.",
                              currentUser?.id || "system",
                            );
                          } else if (action === "request_revision") {
                            // Reassign ticket back to whoever had it before (Data User or assignee)
                            const dataUserId =
                              (newItem as any).assignedDataUserId ||
                              ticket.assignedTo;
                            if (dataUserId) {
                              updateTicket(ticketId, {
                                assignedTo: dataUserId,
                                status: "open",
                              });
                              addTicketMessage(
                                ticketId,
                                "Revisão solicitada. Aguarda nova correção.",
                                currentUser?.id || "system",
                              );
                            }
                          } else if (action === "open") {
                            // For approver-created tickets: keep assignedTo = Manager (already set at creation)
                            // For manager/data-user tickets: assign to Data User
                            const ticketCreatorRole = ticket.createdBy
                              ? getUserRoleInProject?.(ticket.createdBy, projectId || "")
                              : null;
                            const isApproverTicket = ticketCreatorRole === "approval_user";

                            if (isApproverTicket) {
                              // Ticket was created by Approver — already assigned to Manager at creation
                              // Publish it (isDraft: false) and set status to open
                              updateTicket(ticketId, { status: "open", isDraft: false });
                            } else {
                              // Manager/Data User ticket: assign to Data User for correction
                              const dataUserId =
                                (newItem as any).assignedDataUserId ||
                                users?.find(
                                  (u) =>
                                    projectId &&
                                    getUserRoleInProject &&
                                    getUserRoleInProject(u.id, projectId) === "data_user" &&
                                    u.projectAccess?.some((pa) => pa.projectId === projectId),
                                )?.id;
                              if (dataUserId) {
                                updateTicket(ticketId, {
                                  assignedTo: dataUserId,
                                  status: "open",
                                  isDraft: false,
                                });
                              }
                            }
                          }
                        });
                        setPendingTicketActions(new Map()); // Clear after processing

                        // FIX: Preserve approval_data_update status if coming from Approver
                        // Only change to data_requested if coming from validation_pending, validated, or approved
                        const currentStatus = (newItem as any).workflowStatus;
                        const isApproverFlow =
                          isApprovalUser ||
                          currentStatus === "approval_pending" ||
                          currentStatus === "approval_data_update";
                        const newStatus = isApproverFlow
                          ? "approval_data_update"
                          : "data_requested";

                        // FIX: Save the data AND update the status!
                        // Manager's edits must be persisted as official data before handing over to Data User.
                        const fieldsToSave = {
                          ...newItem,
                          workflowStatus: newStatus as any,
                        };
                        delete (fieldsToSave as any).draftData; // Ensure we don't nest draft data

                        updateCompany((newItem as any).id, fieldsToSave);
                      } else if (isSubmitReview) {
                        // Approval User Submitting Review
                        const companyDraftTickets = tickets.filter(
                          (t) =>
                            t.entityId === (newItem as any).id && t.isDraft,
                        );

                        // 1. Publish all draft tickets
                        companyDraftTickets.forEach((t) =>
                          updateTicket(t.id, {
                            isDraft: false,
                            status: "open",
                          }),
                        );

                        // 2. Update Status
                        if (companyDraftTickets.length > 0) {
                          updateCompanyStatus(
                            (newItem as any).id,
                            "approval_data_update",
                          );
                        } else {
                          // FIX: Force update via updateCompany to ensure persistence
                          const updatePayload: any = {
                            workflowStatus: "approved",
                          };
                          if (!newItem.entryDate) {
                            updatePayload.entryDate = new Date()
                              .toISOString()
                              .split("T")[0];
                          }
                          updateCompany((newItem as any).id, updatePayload);
                        }
                      } else {
                        // FIX: Submit for Validation/Approval - check if Data User has open tickets
                        if ((newItem as any).id) {
                          const companyTickets = tickets.filter(
                            (t) =>
                              t.entityId === (newItem as any).id &&
                              t.status === "open" &&
                              pendingTicketActions.get(t.id) !== "resolve",
                          );
                          const hasOpenTickets = companyTickets.length > 0;

                          // If Data User has open tickets, send to Manager (validation_pending)
                          // Otherwise use the original targetStatus (approval_pending for approval workflow)
                          let finalStatus = targetStatus;
                          if (
                            hasOpenTickets &&
                            (!isManager || isActingAsDataUser)
                          ) {
                            // If the open tickets came from an approval context, return to approval_data_update
                            // (i.e., they were created by an approver or forwarded from approval_data_update)
                            const currentWfStatus = (newItem as any).workflowStatus;
                            const openTicketsForCompanyAll = tickets.filter(
                              (t) => t.entityId === (newItem as any).id && t.status === "open"
                            );
                            const hasApproverTickets = openTicketsForCompanyAll.some((t) => {
                              const creatorRole = projectId && getUserRoleInProject
                                ? getUserRoleInProject(t.createdBy, projectId)
                                : undefined;
                              return creatorRole === "approval_user";
                            });
                            finalStatus = (hasApproverTickets || currentWfStatus === "approval_data_update")
                              ? ("approval_data_update" as any)
                              : "validation_pending";
                          }

                          // Send messages for corrected fields (Data User Submission)
                          if (
                            !isManager &&
                            [
                              "data_requested",
                              "data_update",
                              "approval_data_update",
                            ].includes((newItem as any).workflowStatus || "")
                          ) {
                            const liveCompany = activeCompanies.find(
                              (c) => c.id === (newItem as any).id,
                            );
                            const liveTickets = tickets.filter(
                              (t) =>
                                t.entityId === liveCompany?.id &&
                                t.status !== "resolved" &&
                                t.status !== "closed" &&
                                pendingTicketActions.get(t.id) !== "resolve",
                            );

                            liveTickets.forEach((t) => {
                              // 1. Clean previous system messages and add the new one
                              const tMsgs = ticketMessages?.filter((m) => m.ticketId === t.id) || [];
                              // Always clean previous system messages and add the new one at the end
                              const oldSystemMsgs = tMsgs.filter(
                                (m) =>
                                  m.message.startsWith("Correção efetuada") ||
                                  m.message.startsWith("Correction made") ||
                                  m.message.startsWith("Campo em edição") ||
                                  m.message.startsWith("Field in edit")
                              );
                              oldSystemMsgs.forEach((m) => deleteTicketMessage(m.id));

                              addTicketMessage(
                                t.id,
                                "Correção efetuada pelo utilizador. Aguarda validação.",
                                currentUser?.id || "unknown",
                              );

                              // 2. FIX: Reassign Ticket back to Manager (Creator)
                              if (t.createdBy && t.assignedTo !== t.createdBy) {
                                updateTicket(t.id, { assignedTo: t.createdBy });
                              }
                            });
                          }

                          // CORE FIX: DEFERRED MERGE LOGIC

                          if (!isManager || isActingAsDataUser) {
                            // DATA USER SUBMIT
                            // Action: Update Status to 'validation_pending' but KEEP data in 'draftData'.
                            // Do NOT Merge to Root.

                            const draftPayload = { ...newItem };
                            delete (draftPayload as any).draftData; // clean self-ref

                            // We must update the ROOT status, but keep the ROOT data unchanged (old data).
                            // We set draftData to the NEW data.

                            const updatePayload = {
                              workflowStatus: finalStatus,
                              draftData: draftPayload,
                            };

                            console.log(
                              "[ConfirmationModal] Data User Submit - Deferring Merge:",
                              updatePayload,
                            );
                            updateCompany(
                              (newItem as any).id,
                              updatePayload as any,
                            );
                          } else {
                            // MANAGER SUBMIT (Approval or Validation)
                            // Action: Merge 'newItem' (which is the View of Draft) into Root.
                            // Clear draftData.

                            const fieldsToSave = {
                              ...newItem,
                              workflowStatus: finalStatus,
                            };
                            // Explicitly clear draftData
                            (fieldsToSave as any).draftData = {};

                            // AUTO-FILL ENTRY DATE
                            const isApprovalEnabled =
                              currentProject?.approvalWorkflow?.companies;
                            // If transitioning to 'validated' and NO approval workflow -> End of process
                            const isFinalValidation =
                              finalStatus === "validated" && !isApprovalEnabled;

                            if (isFinalValidation && !fieldsToSave.entryDate) {
                              fieldsToSave.entryDate = new Date()
                                .toISOString()
                                .split("T")[0];
                            }

                            console.log(
                              "[ConfirmationModal] Manager Submit - Merging to Root:",
                              fieldsToSave,
                            );
                            updateCompany((newItem as any).id, fieldsToSave);
                          }
                        }
                      }

                      // Archive all tickets the manager marked as "Resolve"
                      // so they disappear from the field view and only appear in History
                      pendingTicketActions.forEach((action, ticketId) => {
                        if (action === "resolve") {
                          archiveTicket(ticketId);
                        }
                      });
                      setPendingTicketActions(new Map());

                      setIsSubmitConfirmationOpen(false);
                      setIsModalOpen(false);
                    }}
                    className={cn(
                      "px-4 py-2 text-sm font-bold text-white rounded-lg shadow-sm flex items-center gap-2",
                      buttonColor,
                    )}
                  >
                    <Check size={16} /> {t("common.confirmSubmit")}
                  </button>
                </div>
              </div>
            </Modal>
          );
        })()}

      {/* Confirmation Modal for Ticket Resolution */}
      <ConfirmationModal
        isOpen={ticketConfirmation.isOpen}
        onClose={() =>
          setTicketConfirmation({ ...ticketConfirmation, isOpen: false })
        }
        onConfirm={() => {
          ticketConfirmation.onConfirm();
          setTicketConfirmation({ ...ticketConfirmation, isOpen: false });
        }}
        title={ticketConfirmation.title}
        message={ticketConfirmation.message}
        confirmText="Yes, Resolve Tickets"
        cancelText="Cancel"
        variant="info"
      />

      <DocumentDetailsModal
        selectedDocRow={selectedDocRow}
        setSelectedDocRow={setSelectedDocRow}
        isEditing={isEditing}
        setReviewField={setReviewField}
        setReviewModalOpen={setReviewModalOpen}
        approveCompany={approveCompany}
        newItem={newItem}
        t={t}
        projectId={projectId}
        isManager={isManager}
        isDataUser={isDataUser}
        isApprovalUser={isApprovalUser}
        handleSessionUpload={handleSessionUpload}
        handleSessionDelete={handleSessionDelete}
        setNewItem={setNewItem}
        documents={documents}
        getFieldProps={getFieldProps}
        setCorrectedFields={setCorrectedFields}
      />

      <ReviewModal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        onSubmit={handleSubmitReview}
        title={
          reviewField
            ? `${t("common.review")}: ${reviewField.label}`
            : t("common.review")
        }
      />
    </div>
  );
}

// --- TICKET THREAD COMPONENT EXPORTED ---
// Removed duplicate import

// --- NEW FIELD CONTROL COMPONENT ---
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
  tickets?: Ticket[];
  isManager: boolean;
  isDataUser: boolean;
  onResolveTicket?: (id: string) => void;
  onArchiveTicket?: (id: string) => void;
  isDisabled?: boolean;
  ticketMessages?: TicketMessage[];
  onAddMessage?: (id: string, msg: string) => void;
  isCorrected?: boolean;
  onToggleCorrection?: (val: boolean) => void;
  users?: { id: string; name: string; projectAccess?: any[] }[];
  correctionDate?: string;
  workflowStatus?: string;
  projectId?: string;
  onUpdateTicket?: (id: string, data: Partial<Ticket>) => void;
  onUpdateCompanyStatus?: (id: string, status: string) => void;
  getUserRoleInProject?: (userId: string, projectId: string) => string | null;
  isApprovalUser?: boolean;
  pendingTicketActions?: Map<
    string,
    "forward" | "resolve" | "request_revision" | "open"
  >;
  onSetTicketAction?: (
    ticketId: string,
    action: "forward" | "resolve" | "request_revision" | "open",
  ) => void;
  companyDataUser?: any;
  dataUserId?: string;
  onForceValidate?: (state: boolean) => void;
  currentWaitingForRole?: string | null;
}

function FieldControl({
  label,
  children,
  isValidated,
  isInvalid,
  isLocked,
  hasOpenTicket,
  canValidate,
  canUnlock,
  canRequestReview,
  onValidate,
  onUnlock,
  onRequestReview,
  isEditing,
  currentValue,
  tickets,
  isManager,
  isDataUser,
  onResolveTicket,
  onArchiveTicket,
  isDisabled,
  ticketMessages,
  onAddMessage,
  isCorrected,
  onToggleCorrection,
  users,
  correctionDate,
  workflowStatus,
  projectId,
  onUpdateTicket,
  onUpdateCompanyStatus,
  getUserRoleInProject,
  isApprovalUser,
  pendingTicketActions,
  onSetTicketAction,
  companyDataUser,
  dataUserId,
  onForceValidate,
  currentWaitingForRole,
}: FieldControlProps) {
  const sortedTickets =
    tickets?.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    ) || [];
  const currentUser = useStore((state) => state.currentUser);
  const deleteTicket = useStore((state) => state.deleteTicket);

  // Check if current user is assigned to any open ticket for this field
  // FIX: If acting as Data User, check if ticket is assigned to the company's Data User
  const isAssignedToTicket = sortedTickets.some((ticket) => {
    const isMe = ticket.assignedTo === currentUser?.id;
    // Use dataUserId prop if available, otherwise fallback to companyDataUser object
    const targetDataUserId = dataUserId || companyDataUser?.id;
    const isDataUserTicket =
      isDataUser && targetDataUserId && ticket.assignedTo === targetDataUserId;
    // console.log(`[FieldControl Debug] ${label} Ticket ${ticket.title}: Me=${isMe}, DataUser=${isDataUserTicket} (Assigned:${ticket.assignedTo} vs Target:${targetDataUserId})`);
    return (
      ticket.status !== "resolved" &&
      ticket.status !== "closed" &&
      (isMe || isDataUserTicket)
    );
  });

  // Derived Logic for Manager View
  // If ticket is assigned to Manager AND created by Data User, it implies correction (Pending Review)
  const isPendingReview =
    isManager &&
    sortedTickets.some((t) => {
      // Check if the latest message on this ticket is a correction from the Data User
      const msgs = ticketMessages?.filter((m) => m.ticketId === t.id) || [];
      const latest = msgs.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0];

      if (!latest?.message) return false;

      // Se a mensagem for de correção do utilizador, está pendente de revisão pelo manager.
      // Retirado o check 'latest.userId !== currentUser?.id' para permitir que a mesma conta teste os dois papéis.
      return (
        latest.message.startsWith("Correção efetuada pelo utilizador") ||
        (latest.message.startsWith("Correção efetuada") && !latest.message.includes("manager")) ||
        (latest.message.startsWith("Correction made") && !latest.message.includes("manager"))
      );
    });

  // Effective Corrected State: Local correction OR Pending Review from Data User
  const effectiveCorrected = isCorrected || isPendingReview;

  // NEW: Effective Open Tickets (ignoring those marked for resolution)
  // If a ticket is marked 'resolve', we treat it as if it's not blocking validation
  const effectiveHasOpenTicket = sortedTickets.some(
    (t) => t.status === "open" && pendingTicketActions?.get(t.id) !== "resolve",
  );

  const canValidateOverride =
    isManager && isEditing && hasOpenTicket && !effectiveHasOpenTicket;
  const finalCanValidate = canValidate || canValidateOverride;

  // NEW: Determine dot color based on ticket status instead of company workflow status
  const getTicketDotColors = () => {
    if (!hasOpenTicket || sortedTickets.length === 0) return "bg-gray-100 text-gray-500";

    // Use the highest priority open ticket logic (same as TicketThread)
    const activeTicket = sortedTickets[0];
    const msgs = ticketMessages?.filter((m) => m.ticketId === activeTicket.id) || [];
    const latestMessage = msgs.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];

    if (activeTicket.status === "open" && latestMessage) {
      const msg = latestMessage.message.toLowerCase();
      if (msg.includes("correction") || msg.includes("correção")) {
        return "bg-blue-50 text-blue-700 border-blue-200 border"; // Review Pending / Corrected
      } else if (msg.includes("revision") || msg.includes("revisão")) {
        return "bg-orange-50 text-orange-700 border-orange-200 border"; // Revision
      }
    }
    // Default for open ticket requiring action from Data User
    return "bg-orange-50 text-orange-700 border-orange-200 border";
  };

  // If manager corrects an approver ticket, this button locks the field
  const finalIsDisabled = isCorrected ? true : (isDisabled || isPendingReview);

  const canRenderValidationButton =
    isManager &&
    finalCanValidate &&
    (!effectiveHasOpenTicket || isPendingReview || isCorrected) &&
    (currentWaitingForRole === "manager" || workflowStatus === "validated" || workflowStatus === "approved") &&
    workflowStatus !== "draft" &&
    workflowStatus !== "data_requested" &&
    workflowStatus !== "approval_pending";

  return (
    <div className="flex flex-col gap-1 animate-in fade-in duration-300">
      <div className="flex justify-between items-center px-1">
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-gray-500 uppercase font-bold tracking-wider">
            {label}
          </label>
          <div className="flex items-center gap-1.5">
            {isValidated && (!isEditing || !canRenderValidationButton) && (
              <div
                title="Validated"
                className="text-green-600 bg-green-50 p-1 rounded-full border border-green-200"
              >
                <Check size={12} strokeWidth={3} />
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <>
                {isEditing && canRequestReview && !isCorrected && !(isManager && workflowStatus === "approval_pending") &&
                  (!isManager || currentWaitingForRole === "manager" || workflowStatus === "validated" || workflowStatus === "approved") && (
                    <button
                      type="button"
                      onClick={onRequestReview}
                      title="Solicitar Revisão"
                      className="flex items-center justify-center w-6 h-6 rounded-full bg-white dark:bg-surface text-primary border border-primary/20 hover:bg-primary-light transition-colors shadow-sm"
                    >
                      <MessageSquare size={14} />
                    </button>
                  )}

                {/* Edit / Lock correction button */}
                {isEditing &&
                  (isManager || isDataUser) &&
                  !isPendingReview &&
                  (isCorrected || (isAssignedToTicket && hasOpenTicket)) && (
                    <button
                      type="button"
                      onClick={() => {
                        if (onToggleCorrection) {
                          onToggleCorrection(!isCorrected);
                        }
                      }}
                      className={cn(
                        "flex items-center justify-center w-6 h-6 rounded-full transition-colors shadow-sm",
                        isCorrected
                          ? "bg-primary-light0 border border-primary text-primary hover:bg-primary hover:text-white"
                          : "bg-green-600 border border-green-700 hover:bg-green-700 animate-pulse text-white",
                      )}
                      title={
                        isCorrected
                          ? "Click to edit again"
                          : "Click to lock and confirm correction"
                      }
                    >
                      {isCorrected ? <Edit2 size={12} /> : <Lock size={12} />}
                    </button>
                  )}

                {isEditing && canRenderValidationButton && (
                  <button
                    type="button"
                    onClick={onValidate}
                    className={cn(
                      "flex items-center justify-center w-6 h-6 rounded-full transition-all border shadow-sm",
                      isValidated
                        ? "bg-green-600 text-white border-green-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                        : "bg-white dark:bg-surface text-gray-600 dark:text-gray-300 border-gray-200 dark:border-[#444746] hover:border-green-300 hover:text-green-700 hover:bg-green-50",
                    )}
                    title={
                      isValidated
                        ? "Click to Invalidate/Unlock"
                        : "Click to Validate"
                    }
                  >
                    {isValidated ? (
                      <Check size={14} strokeWidth={3} />
                    ) : (
                      <Check size={14} />
                    )}
                  </button>
                )}
              </>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isLocked && <Lock size={12} className="text-gray-400" />}
            {hasOpenTicket && (
              <div
                className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1", getTicketDotColors())}
                title="Open Reviews"
              >
                <AlertTriangle size={10} /> {sortedTickets.length}
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        className={cn(
          "relative rounded-lg group transition-all",
          (isLocked || isCorrected || (isValidated && !isManager && !hasOpenTicket)) &&
          "opacity-60 pointer-events-none bg-gray-50 dark:bg-[#131314]",
        )}
      >
        {children}
        {(isLocked || isCorrected || (isValidated && !isManager && !hasOpenTicket)) && (
          <div
            className="absolute inset-0 z-10 cursor-not-allowed"
            title="Field locked. Contact Manager for changes."
          />
        )}
      </div>

      {hasOpenTicket && sortedTickets.length > 0 && (
        <div className="flex flex-col gap-2 mt-1">
          {effectiveCorrected && (
            <div className="bg-primary-light text-primary-hover px-3 py-1.5 rounded-lg text-xs font-bold border border-primary/20 flex items-center gap-2 shadow-sm animate-in fade-in slide-in-from-top-1">
              <Check size={14} strokeWidth={3} />
              <span>
                Corrected (
                {correctionDate
                  ? new Date(correctionDate).toLocaleDateString()
                  : "Pending/Review"}
                )
              </span>
            </div>
          )}

          {sortedTickets.map((ticket) => (
            <EntityTicketThread
              key={ticket.id}
              ticket={ticket}
              currentValue={currentValue}
              messages={
                ticketMessages?.filter((m) => m.ticketId === ticket.id) || []
              }
              isEditing={isEditing}
              isManager={isManager}
              isDataUser={isDataUser}
              onResolve={(id: string) => onResolveTicket?.(id)}
              onArchive={(id: string) => onArchiveTicket?.(id)}
              onDelete={(id: string) => {
                deleteTicket(id);
                // "se o manager eliminar o ticket antes de enviar repõe o estado anterior."
                if (isManager && (workflowStatus === "validated" || workflowStatus === "approved")) {
                  onForceValidate?.(true);
                }
              }}
              onAddMessage={(id: string, msg: string) => onAddMessage?.(id, msg)}
              isFieldCorrected={isCorrected}
              users={users}
              projectId={projectId}
              onUpdateTicket={onUpdateTicket}
              getUserRoleInProject={getUserRoleInProject}
              workflowStatus={workflowStatus}
              isApprovalUser={isApprovalUser}
              pendingTicketActions={pendingTicketActions}
              onSetTicketAction={onSetTicketAction}
              entityDataUser={companyDataUser}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// --- TAB DETAILS MODAL ---
function TabEditModal({
  tab,
  setTab,
  newItem,
  setNewItem,
  getFieldProps,
  canEditThisItem,
  isEditing,
  companyProfiles,
  activeCompanies,
  companies,
  projectId,
  setCorrectedFields,
}: any) {
  const workers = useStore((state) => state.workers);
  if (!tab) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-100 dark:border-[#444746] animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 dark:border-[#444746] bg-gray-50/50 dark:bg-surface/50">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {tab === "info" ? "Edit Identification" : "Edit Site Info"}
            </h2>
            <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">
              Batch Form Editing
            </p>
          </div>
          <button
            onClick={() => setTab(null)}
            className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            title="Ficheiro em nuvem"
            aria-label="Selecionar ficheiro"
          > <X size={20} />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          <div className="bg-gray-50/50 dark:bg-surface/50 rounded-xl p-4 border border-gray-100 dark:border-[#444746]">
            {tab === "info" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                <FieldControl {...getFieldProps("name", "Company Name *")}>
                  <input
                    type="text"
                    disabled={getFieldProps("name", "Company Name *").isDisabled}
                    className="w-full p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-colors disabled:bg-gray-100 dark:bg-surface disabled:text-gray-500"
                    value={newItem.name || ""}
                    onChange={(e) =>
                      setNewItem({ ...newItem, name: e.target.value })
                    }
                  />
                </FieldControl>

                <FieldControl {...getFieldProps("nif", "Tax ID (NIF)")}>
                  <input
                    type="text"
                    disabled={getFieldProps("nif", "").isDisabled}
                    className="w-full p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-colors"
                    value={newItem.nif || ""}
                    onChange={(e) =>
                      setNewItem({ ...newItem, nif: e.target.value })
                    }
                  />
                </FieldControl>

                <FieldControl
                  {...getFieldProps("profileId", "Company Profile *")}
                >
                  <select
                    disabled={getFieldProps("profileId", "Company Profile *").isDisabled}
                    className="w-full p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-colors bg-white dark:bg-surface disabled:bg-gray-100 dark:bg-surface disabled:text-gray-500"
                    value={newItem.profileId || ""}
                    onChange={(e) =>
                      setNewItem({ ...newItem, profileId: e.target.value })
                    }
                  >
                    <option value="" disabled hidden>
                      Select Profile...
                    </option>
                    {companyProfiles
                      .filter((p: any) => p.projectId === projectId)
                      .map((p: any) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </FieldControl>

                <FieldControl {...getFieldProps("email", "General Email")}>
                  <input
                    type="email"
                    disabled={getFieldProps("email", "").isDisabled}
                    className="w-full p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-colors"
                    value={newItem.email || ""}
                    onChange={(e) =>
                      setNewItem({ ...newItem, email: e.target.value })
                    }
                  />
                </FieldControl>
                <FieldControl {...getFieldProps("phone", "Phone")}>
                  <input
                    type="tel"
                    disabled={getFieldProps("phone", "").isDisabled}
                    className="w-full p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-colors"
                    value={newItem.phone || ""}
                    onChange={(e) =>
                      setNewItem({ ...newItem, phone: e.target.value })
                    }
                  />
                </FieldControl>

                <div className="sm:col-span-2">
                  <FieldControl
                    {...getFieldProps("address", "Headquarters Address")}
                  >
                    <input
                      type="text"
                      disabled={getFieldProps("address", "").isDisabled}
                      className="w-full p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-colors"
                      value={newItem.address || ""}
                      onChange={(e) =>
                        setNewItem({ ...newItem, address: e.target.value })
                      }
                    />
                  </FieldControl>
                </div>

                <FieldControl
                  {...getFieldProps("activity", "Main Activity")}
                  isEditing={isEditing}
                >
                  <input
                    type="text"
                    disabled={getFieldProps("activity", "").isDisabled}
                    className="w-full p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-colors"
                    value={newItem.activity || ""}
                    onChange={(e) =>
                      setNewItem({ ...newItem, activity: e.target.value })
                    }
                  />
                </FieldControl>

                <FieldControl
                  {...getFieldProps("companyRole", "Tipo de Empresa")}
                  isEditing={isEditing}
                >
                  <select
                    title="Tipo de Empresa"
                    disabled={isEditing || getFieldProps("companyRole", "").isDisabled}
                    className="w-full p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-colors bg-white dark:bg-surface disabled:bg-gray-100 disabled:dark:bg-[#131314] disabled:text-gray-500"
                    value={newItem.companyRole || ""}
                    onChange={(e) => {
                      const newRole = e.target.value;
                      const ifcRole = newRole ? getIfcRoleFromCompanyRole(newRole) : undefined;
                      setNewItem({
                        ...newItem,
                        companyRole: newRole,
                        companyRoleCustom: newRole !== 'outro' ? '' : newItem.companyRoleCustom,
                        ifcActorRole: ifcRole !== 'NOTDEFINED' ? ifcRole : undefined,
                        ifcActorRoleUserDefined: newRole !== 'outro' ? '' : newItem.companyRoleCustom
                      });
                    }}
                  >
                    <option value="">— Selecionar tipo de empresa —</option>
                    {COMPANY_ROLE_GROUPS.map(group => (
                      <optgroup key={group} label={group}>
                        {COMPANY_ROLE_OPTIONS.filter(o => o.group === group).map(o => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </FieldControl>

                {newItem.companyRole === 'outro' && (
                  <FieldControl
                    {...getFieldProps("companyRoleCustom", "Especificar Tipo de Empresa")}
                    isEditing={isEditing}
                  >
                    <input
                      type="text"
                      disabled={isEditing || getFieldProps("companyRoleCustom", "").isDisabled}
                      className="w-full p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-colors"
                      value={newItem.companyRoleCustom || ""}
                      onChange={(e) =>
                        setNewItem({
                          ...newItem,
                          companyRoleCustom: e.target.value,
                          ifcActorRoleUserDefined: e.target.value
                        })
                      }
                      placeholder="Ex: Empresa de Sinalização Rodoviária"
                    />
                  </FieldControl>
                )}

                <FieldControl
                  {...getFieldProps("impic", "IMPIC / License")}
                  isEditing={isEditing}
                >
                  <input
                    type="text"
                    disabled={getFieldProps("impic", "").isDisabled}
                    className="w-full p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-colors"
                    value={newItem.impic || ""}
                    onChange={(e) =>
                      setNewItem({ ...newItem, impic: e.target.value })
                    }
                  />
                </FieldControl>

                {/* Legal Form */}
                <FieldControl
                  {...getFieldProps("legalForm", "Natureza Jurídica")}
                  isEditing={isEditing}
                >
                  <select
                    title="Natureza Jurídica"
                    disabled={getFieldProps("legalForm", "").isDisabled}
                    className="w-full p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-colors bg-white dark:bg-surface disabled:bg-gray-100 disabled:dark:bg-[#131314] disabled:text-gray-500"
                    value={newItem.legalForm || ""}
                    onChange={(e) =>
                      setNewItem({ ...newItem, legalForm: e.target.value })
                    }
                  >
                    <option value="">— Selecionar —</option>
                    <option value="sa">S.A.</option>
                    <option value="lda">Lda.</option>
                    <option value="unipessoal">Unipessoal Lda.</option>
                    <option value="eni">ENI</option>
                    <option value="ace">ACE</option>
                    <option value="other">Outra</option>
                  </select>
                </FieldControl>

                <div className="sm:col-span-2">
                  <FieldControl
                    {...getFieldProps("parentId", "Parent Company *")}
                    isEditing={isEditing}
                  >
                    {canEditThisItem && isEditing ? (
                      <select
                        required
                        disabled={getFieldProps("parentId", "Parent Company *").isDisabled}
                        className="w-full p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-colors bg-white dark:bg-surface"
                        value={newItem.parentId || ""}
                        onChange={(e) =>
                          setNewItem({ ...newItem, parentId: e.target.value })
                        }
                      >
                        <option value="" disabled hidden>
                          Select an option...
                        </option>
                        <option value="root">None (General Contractor)</option>
                        {activeCompanies
                          .filter((c: any) => c.id !== (newItem as any).id)
                          .map((c: any) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        disabled
                        className="w-full p-2.5 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none bg-gray-50 dark:bg-[#131314] text-gray-700 dark:text-gray-200"
                        value={(() => {
                          if (!newItem.parentId || newItem.parentId === "root")
                            return "None (General Contractor)";
                          const parent = companies.find(
                            (c: any) => c.id === newItem.parentId,
                          );
                          return parent ? parent.name : "Unknown Company";
                        })()}
                      />
                    )}
                  </FieldControl>
                </div>
              </div>
            )}

            {tab === "site" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <FieldControl {...getFieldProps("siteManager", "Responsável em Obra")} canValidate={false} canRequestReview={false}>
                  <input
                    disabled
                    readOnly
                    className="w-full p-2.5 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none bg-gray-50 dark:bg-[#131314] text-gray-700 dark:text-gray-200"
                    value={workers.find(wk => wk.companyId === newItem.id && wk.obligatoryRole?.type === 'SITE_RESPONSIBLE')?.name || "Não Atribuído"}
                  />
                </FieldControl>
                <FieldControl {...getFieldProps("safetyTechnicianId", "Responsável de SHST em Obra")} canValidate={false} canRequestReview={false}>
                  <input
                    disabled
                    readOnly
                    className="w-full p-2.5 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none bg-gray-50 dark:bg-[#131314] text-gray-700 dark:text-gray-200"
                    value={workers.find(wk => wk.companyId === newItem.id && wk.obligatoryRole?.type === 'SHST_RESPONSIBLE')?.name || "Não Atribuído"}
                  />
                </FieldControl>

                {/* Seguro RC e AT são editados nos modais do separador Legal/Documents */}

                <FieldControl {...getFieldProps("maxWorkersOnSite", "Nº Máx. Trabalhadores Previsto")}>
                  <input
                    type="number"
                    min="0"
                    disabled={getFieldProps("maxWorkersOnSite", "").isDisabled}
                    className="w-full p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-colors"
                    value={newItem.maxWorkersOnSite || ""}
                    onChange={(e) =>
                      setNewItem({ ...newItem, maxWorkersOnSite: parseInt(e.target.value) || undefined })
                    }
                  />
                </FieldControl>

                <FieldControl
                  {...getFieldProps("entryDate", "Data de Entrada")}
                  canValidate={false}
                  canRequestReview={false}
                >
                  <input
                    type="date"
                    disabled={true}
                    className="w-full p-2.5 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-colors disabled:bg-gray-50 dark:disabled:bg-[#131314] disabled:text-gray-500"
                    value={newItem.entryDate || ""}
                    onChange={(e) =>
                      setNewItem({ ...newItem, entryDate: e.target.value })
                    }
                  />
                </FieldControl>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

// --- DOCUMENT DETAILS MODAL ---
function DocumentDetailsModal({
  selectedDocRow,
  setSelectedDocRow,
  isEditing,
  setReviewField,
  setReviewModalOpen,
  approveCompany,
  newItem,
  t,
  projectId,
  isManager,
  isDataUser,
  isApprovalUser,
  handleSessionUpload,
  handleSessionDelete,
  setNewItem,
  documents,
  getFieldProps,
  setCorrectedFields,
}: any) {
  const { toggleFieldValidation, updateTicket, addNotification } = useStore();
  const currentUser = useStore((state) => state.currentUser);

  if (!selectedDocRow) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-100 dark:border-[#444746] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 dark:border-[#444746] bg-gray-50/50 dark:bg-surface/50">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {selectedDocRow.label}
            </h2>
            <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">
              {selectedDocRow.category.replace(/_/g, " ")}
            </p>
          </div>
          <button
            onClick={() => setSelectedDocRow(null)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-surface rounded-full transition-colors"
            title="Fechar"
            aria-label="Fechar modal"
          >
            <X size={20} />
          </button>
        </div>
        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* Controls Action Bar (Approve/Reject/Validate/Review) */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-surface rounded-xl border border-gray-100 dark:border-[#444746]">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Workflow Actions:
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isEditing && selectedDocRow.canApprove && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      approveCompany(newItem.id);
                      setSelectedDocRow(null);
                    }}
                    className={
                      "flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg transition-all border shadow-sm text-sm font-medium " +
                      (selectedDocRow.approvalStatus === "approved"
                        ? "bg-primary text-white border-blue-700"
                        : "bg-white dark:bg-surface text-primary border-primary/20 hover:bg-primary-light")
                    }
                  >
                    {selectedDocRow.approvalStatus === "approved" ? (
                      <Shield size={16} strokeWidth={3} />
                    ) : (
                      <Shield size={16} />
                    )}
                    {selectedDocRow.approvalStatus === "approved"
                      ? t("status.approved")
                      : t("actions.approve")}
                  </button>
                  {selectedDocRow.approvalStatus !== "approved" &&
                    selectedDocRow.onReject && (
                      <button
                        type="button"
                        onClick={selectedDocRow.onReject}
                        className="flex items-center justify-center p-1.5 rounded-lg text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all"
                        title={t("actions.reject")}
                      >
                        <X size={16} />
                      </button>
                    )}
                </div>
              )}
            </div>
          </div>

          {/* Main Input Field — hidden for insurance policy rows (Dados da Apólice section handles them) */}
          {selectedDocRow.category !== "insurance_civil_policy" && selectedDocRow.category !== "insurance_work_acc_policy" && (
          <div className="bg-gray-50/50 dark:bg-surface/50 rounded-xl p-4 border border-gray-100 dark:border-[#444746]">
            {(() => {
              const fieldKey = selectedDocRow.category?.startsWith("custom_")
                ? selectedDocRow.category
                : selectedDocRow.id;
              let props = getFieldProps
                ? getFieldProps(fieldKey, selectedDocRow.label)
                : null;

              // If user is just viewing, we might still want to override isEditing
              if (props && !isEditing) {
                props = { ...props, isEditing: false };
              }

              const renderInput = () => {
                const isDisabled = props?.isDisabled || !isEditing;
                // Compute today string for min-date constraint on expiry fields
                const todayStr = new Intl.DateTimeFormat('en-CA').format(new Date());
                const todayMonth = todayStr.substring(0, 7); // YYYY-MM

                // For insurance policy rows, the "Dados da Apólice" section below
                // renders both fields — suppress the main input entirely.
                if (
                  selectedDocRow.category === "insurance_civil_policy" ||
                  selectedDocRow.category === "insurance_work_acc_policy"
                ) {
                  return null;
                }

                if (selectedDocRow.category?.startsWith("custom_")) {
                  if (selectedDocRow.type === "boolean") {
                    return (
                      <select
                        className="w-full p-2 text-[13px] border rounded-md bg-white dark:bg-[#131314] border-gray-300 dark:border-[#444746] text-gray-700 dark:text-gray-200"
                        value={
                          newItem.customDocuments?.[
                            selectedDocRow.id
                          ]?.value || "false"
                        }
                        onChange={(e) => {
                          setNewItem((prev: any) => ({
                            ...prev,
                            customDocuments: {
                              ...(prev.customDocuments || {}),
                              [selectedDocRow.id]: {
                                ...(prev.customDocuments?.[
                                  selectedDocRow.id
                                ] || {}),
                                value: e.target.value,
                              },
                            },
                          }));
                        }}
                        disabled={isDisabled}
                      >
                        <option value="false">No</option>
                        <option value="true">Yes</option>
                      </select>
                    );
                  } else if (
                    selectedDocRow.type === "single_select" ||
                    selectedDocRow.type === "multi_select"
                  ) {
                    // TODO: Multi-select implementation if needed
                    return (
                      <select
                        className="w-full p-2 text-[13px] border rounded-md bg-white dark:bg-[#131314] border-gray-300 dark:border-[#444746] text-gray-700 dark:text-gray-200"
                        value={
                          newItem.customDocuments?.[
                            selectedDocRow.id
                          ]?.value || ""
                        }
                        onChange={(e) => {
                          setNewItem((prev: any) => ({
                            ...prev,
                            customDocuments: {
                              ...(prev.customDocuments || {}),
                              [selectedDocRow.id]: {
                                ...(prev.customDocuments?.[
                                  selectedDocRow.id
                                ] || {}),
                                value: e.target.value,
                              },
                            },
                          }));
                        }}
                        disabled={isDisabled}
                        multiple={selectedDocRow.type === "multi_select"}
                      >
                        <option value="">Select option...</option>
                      </select>
                    );
                  } else {
                    const isExpiryCustom = selectedDocRow.isExpirationDate === true;
                    return (
                      <input
                        type={
                          selectedDocRow.type === "date" ||
                            selectedDocRow.type === "month"
                            ? selectedDocRow.type
                            : selectedDocRow.type === "number"
                              ? "number"
                              : "text"
                        }
                        className="w-full p-2 text-[13px] border rounded-md border-gray-300 dark:border-[#444746] bg-white dark:bg-[#131314] text-gray-700 dark:text-gray-200 focus:outline-none focus:border-primary disabled:opacity-50"
                        value={
                          newItem.customDocuments?.[
                            selectedDocRow.id
                          ]?.value || ""
                        }
                        onChange={(e) => {
                          setNewItem((prev: any) => ({
                            ...prev,
                            customDocuments: {
                              ...(prev.customDocuments || {}),
                              [selectedDocRow.id]: {
                                ...(prev.customDocuments?.[
                                  selectedDocRow.id
                                ] || {}),
                                value: e.target.value,
                              },
                            },
                          }));
                        }}
                        disabled={isDisabled}
                        placeholder={
                          selectedDocRow.type === "text" ? "Enter value..." : ""
                        }
                        min={isExpiryCustom ? (selectedDocRow.type === 'month' ? todayMonth : todayStr) : undefined}
                      />
                    );
                  }
                } else if (selectedDocRow.id === "workScheduleDelivered") {
                  return (
                    <div className="flex items-center gap-2">
                      {documents?.some(
                        (d: any) =>
                          d.entityId === selectedDocRow.entityId &&
                          d.category === selectedDocRow.category &&
                          !d.archived,
                      ) ? (
                        <span className="px-3 py-1.5 bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 rounded-md text-sm font-bold border border-green-200 dark:border-green-500/30">
                          Entregue
                        </span>
                      ) : (
                        <span className="px-3 py-1.5 bg-gray-100 text-gray-600 dark:bg-[#131314] dark:text-gray-400 rounded-md text-sm font-bold border border-gray-200 dark:border-[#444746]">
                          Pendente
                        </span>
                      )}
                    </div>
                  );
                } else {
                  // Standard date fields — only apply min=today if the field is an expiry field
                  // (isExpirationDate: true). PSS acceptance, horário, and other non-expiry
                  // date fields allow past dates and must NOT have a min constraint.
                  const isExpiryStdDate =
                    selectedDocRow.isExpirationDate === true &&
                    (selectedDocRow.type === 'date' || selectedDocRow.type === 'month');
                  return (
                    <input
                      type={
                        selectedDocRow.type === "date" ||
                          selectedDocRow.type === "month"
                          ? selectedDocRow.type
                          : selectedDocRow.type === "number"
                            ? "number"
                            : "text"
                      }
                      className="w-full p-3 text-[14px] font-medium border rounded-md border-gray-300 dark:border-[#444746] bg-white dark:bg-[#131314] text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all disabled:opacity-50"
                      value={newItem[selectedDocRow.id] || ""}
                      onChange={(e) => {
                        setNewItem((prev: any) => ({
                          ...prev,
                          [selectedDocRow.id]: e.target.value,
                        }));
                      }}
                      disabled={isDisabled}
                      placeholder={`Enter ${selectedDocRow.label}...`}
                      min={isExpiryStdDate ? (selectedDocRow.type === 'month' ? todayMonth : todayStr) : undefined}
                    />
                  );
                }
              };

              if (props) {
                return <FieldControl {...props}>{renderInput()}</FieldControl>;
              }

              // Fallback if no props provided for some reason
              return (
                <>
                  <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
                    <Edit2 size={16} className="text-gray-400" /> Form Data
                  </h4>
                  {renderInput()}
                </>
              );
            })()}
          </div>
          )}

          {/* Extra inline fields for insurance policy rows */}
          {(selectedDocRow.category === "insurance_civil_policy" || selectedDocRow.category === "insurance_work_acc_policy") && (() => {
            const isRC = selectedDocRow.category === "insurance_civil_policy";
            const providerKey = isRC ? "insuranceCivilProvider" : "insuranceWorkAccProvider";
            const policyKey = isRC ? "insuranceCivilPolicy" : "insuranceWorkAccPolicy";
            const isDisabled = !isEditing;

            const renderInputs = () => (
              <div className="bg-gray-50/50 dark:bg-surface/50 rounded-xl p-4 border border-gray-100 dark:border-[#444746] space-y-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Dados da Apólice</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-gray-500 uppercase font-bold tracking-wider px-1">Seguradora</label>
                    <input
                      type="text"
                      placeholder="Nome da seguradora"
                      disabled={isDisabled}
                      className="w-full p-3 text-[14px] font-medium border rounded-md border-gray-300 dark:border-[#444746] bg-white dark:bg-[#131314] text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all disabled:opacity-50"
                      value={newItem[providerKey] || ""}
                      onChange={(e) => setNewItem((prev: any) => ({ ...prev, [providerKey]: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-gray-500 uppercase font-bold tracking-wider px-1">Nº Apólice</label>
                    <input
                      type="text"
                      placeholder="Nº da apólice"
                      disabled={isDisabled}
                      className="w-full p-3 text-[14px] font-medium border rounded-md border-gray-300 dark:border-[#444746] bg-white dark:bg-[#131314] text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all disabled:opacity-50"
                      value={newItem[policyKey] || ""}
                      onChange={(e) => setNewItem((prev: any) => ({ ...prev, [policyKey]: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            );

            const props = getFieldProps(selectedDocRow.id, selectedDocRow.label);

            if (props) {
              return (
                <FieldControl {...props}>
                  {renderInputs()}
                </FieldControl>
              );
            }

            return renderInputs();
          })()}

          {/* Documents Upload & List */}
          <div className="border-t border-gray-200 dark:border-[#444746] pt-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <Paperclip size={16} className="text-gray-400" /> Attached Files
              </h4>
              {(() => {
                const fieldKey = selectedDocRow.category?.startsWith("custom_")
                  ? selectedDocRow.category
                  : selectedDocRow.id;
                const props = getFieldProps
                  ? getFieldProps(fieldKey, selectedDocRow.label)
                  : null;
                const isPreWorkflowPhase = ["draft", "data_requested"].includes(
                  newItem?.workflowStatus,
                );
                const hasAssignedTicket =
                  props?.hasOpenTicket &&
                  props?.tickets?.some(
                    (t: any) =>
                      (t.assignedTo === currentUser?.id ||
                        t.createdBy === "system" ||
                        t.createdBy === "auto") &&
                      t.status === "open",
                  );

                let canUploadNow = false;

                if (isEditing && selectedDocRow.isUploadVisible) {
                  const activeDoc = documents?.find(
                    (d: any) =>
                      d.entityId === selectedDocRow.entityId &&
                      d.category === selectedDocRow.category &&
                      !d.archived,
                  );

                  if (!activeDoc) {
                    // No document exists yet
                    canUploadNow = isPreWorkflowPhase || hasAssignedTicket;
                  } else {
                    // Document exists, check ticket dates to see if user needs to upload a new one
                    if (hasAssignedTicket) {
                      const openTicket = props.tickets.find(
                        (t: any) =>
                          t.assignedTo === currentUser?.id &&
                          t.status === "open",
                      );
                      if (
                        openTicket &&
                        new Date(activeDoc.createdAt) <
                        new Date(openTicket.createdAt)
                      ) {
                        canUploadNow = true;
                      }
                    }
                  }
                }

                return (
                  canUploadNow && (
                    <DocumentUpload
                      entityId={selectedDocRow.entityId}
                      projectId={projectId}
                      category={selectedDocRow.category}
                      layout="button"
                      label="Upload"
                      systemLabel={selectedDocRow.label}
                      onOperation={(op) => {
                        if (op.type === "upload") {
                          handleSessionUpload(op.fileId);
                          const fieldKey = selectedDocRow.category?.startsWith("custom_")
                            ? selectedDocRow.category
                            : selectedDocRow.id;
                          setCorrectedFields((prev: any) => ({
                            ...prev,
                            [fieldKey]: true,
                          }));
                        }
                      }}
                      enableAI={true}
                      aiType={selectedDocRow.type === "date" ? "date" : "text"}
                      onSmartComplete={(data) => {
                        const isCustom = selectedDocRow.category?.startsWith("custom_");

                        // === PAST-DATE GUARD FOR EXPIRY FIELDS ===
                        // Both standard and custom fields: only block past dates if isExpirationDate === true.
                        // pssAcceptanceDate and other non-expiry standard fields must NOT be blocked.
                        const isExpiryField = selectedDocRow.isExpirationDate === true;

                        if (isExpiryField && data.date) {
                          const todayStr = new Intl.DateTimeFormat('en-CA').format(new Date());
                          const extractedDate = data.date.length === 7 // YYYY-MM (month)
                            ? `${data.date}-01`
                            : data.date;
                          if (extractedDate < todayStr) {
                            addNotification(
                              'warning',
                              `⚠️ Data extraída do documento (${data.date}) é anterior à data de hoje. O campo não foi preenchido automaticamente — por favor, introduza uma data válida.`
                            );
                            return; // Block auto-fill
                          }
                        }

                        setNewItem((prev: any) => {
                          if (isCustom) {
                            if (data.date && selectedDocRow.type === "date") {
                              return {
                                ...prev,
                                customDocuments: {
                                  ...(prev.customDocuments || {}),
                                  [selectedDocRow.id]: {
                                    ...(prev.customDocuments?.[selectedDocRow.id] || {}),
                                    value: data.date,
                                  },
                                },
                              };
                            } else if (data.text && selectedDocRow.type === "text") {
                              return {
                                ...prev,
                                customDocuments: {
                                  ...(prev.customDocuments || {}),
                                  [selectedDocRow.id]: {
                                    ...(prev.customDocuments?.[selectedDocRow.id] || {}),
                                    value: data.text,
                                  },
                                },
                              };
                            }
                          } else {
                            if (data.date && selectedDocRow.type === "date") {
                              return {
                                ...prev,
                                [selectedDocRow.id]: data.date,
                              };
                            } else if (data.text && selectedDocRow.type === "text") {
                              return {
                                ...prev,
                                [selectedDocRow.id]: data.text,
                              };
                            }
                          }
                          return prev;
                        });
                      }}
                    />
                  )
                );
              })()}
            </div>
            <div className="pt-2">
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

// --- REVIEW MODAL ---
function ReviewModal({
  isOpen,
  onClose,
  onSubmit,
  title = "Request Review",
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (msg: string) => void;
  title?: string;
}) {
  const t = useTranslations("Companies");
  const [message, setMessage] = useState("");
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-[999] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-surface rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50 dark:bg-[#131314]">
          <h3 className="font-bold text-gray-800 dark:text-gray-100">
            {title}
          </h3>
          <button onClick={onClose}>
            <X size={18} className="text-gray-500" />
          </button>
        </div>
        <div className="p-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            {t("common.feedbackRequest")}
          </label>
          <textarea
            className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary outline-none min-h-[100px]"
            placeholder={t("common.reviewPlaceholder")}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            autoFocus
          />
        </div>
        <div className="p-4 bg-gray-50 dark:bg-[#131314] flex justify-end gap-2 text-sm">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg hover:bg-white dark:hover:bg-surface transition-colors"
          >
            {t("actions.cancel")}
          </button>
          <button
            onClick={() => {
              onSubmit(message);
              setMessage("");
              onClose();
            }}
            disabled={!message.trim()}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {t("common.sendRequest")}
          </button>
        </div>
      </div>
    </div>
  );
}
