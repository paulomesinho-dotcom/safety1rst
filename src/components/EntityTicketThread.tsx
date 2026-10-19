"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    ChevronDown,
    CornerUpRight,
    CheckCircle,
    RefreshCw,
    AlertTriangle,
    MessageSquare,
    X,
    Archive,
    Trash2,
} from "lucide-react";
import { useStore } from "@/store/useStore";
import { cn } from "@/lib/utils";
import { Ticket, TicketMessage } from "@/types";

interface EntityTicketThreadProps {
    ticket: Ticket;
    messages: TicketMessage[];
    isManager: boolean;
    isDataUser: boolean;
    onResolve: (id: string) => void;
    onArchive: (id: string) => void;
    onDelete?: (id: string) => void;
    onAddMessage: (id: string, msg: string) => void;
    currentValue?: any;
    users?: { id: string; name: string; projectAccess?: any[] }[];
    projectId?: string;
    onUpdateTicket?: (id: string, data: Partial<Ticket>) => void;
    onUpdateEntityStatus?: (id: string, status: string) => void;
    workflowStatus?: string;
    getUserRoleInProject?: (userId: string, projectId: string) => string | null;
    pendingTicketActions?: Map<
        string,
        "forward" | "resolve" | "request_revision" | "open"
    >;
    onSetTicketAction?: (
        ticketId: string,
        action: "forward" | "resolve" | "request_revision" | "open",
    ) => void;
    isEditing?: boolean;
    isApprovalUser?: boolean;
    entityDataUser?: any;
    // Field-level correction state to hide/show Forward button
    isFieldCorrected?: boolean;
}

// Helper to get workflow colors (can be extracted to utils if needed elsewhere)
const getWorkflowStatusColors = (status?: string) => {
    switch (status) {
        case "draft":
            return "bg-gray-100 text-gray-700 border-gray-200";
        case "data_requested":
            return "bg-blue-50 text-blue-700 border-blue-200";
        case "validation_pending":
            return "bg-yellow-50 text-yellow-700 border-yellow-200";
        case "data_update":
            return "bg-orange-50 text-orange-700 border-orange-200";
        case "validated":
            return "bg-green-50 text-green-700 border-green-200";
        case "approval_pending":
            return "bg-purple-50 text-purple-700 border-purple-200";
        case "approval_data_update":
            return "bg-pink-50 text-pink-700 border-pink-200";
        case "approved":
            return "bg-emerald-50 text-emerald-700 border-emerald-200";
        default:
            return "bg-gray-50 text-gray-600 border-gray-200";
    }
};

export function EntityTicketThread({
    ticket,
    messages,
    isManager,
    isDataUser,
    onResolve,
    onArchive,
    onDelete,
    onAddMessage,
    currentValue,
    users,
    projectId,
    onUpdateTicket,
    onUpdateEntityStatus,
    workflowStatus,
    getUserRoleInProject,
    pendingTicketActions,
    onSetTicketAction,
    isEditing,
    isApprovalUser,
    entityDataUser,
    isFieldCorrected,
}: EntityTicketThreadProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [replyText, setReplyText] = useState("");
    const currentUser = useStore((state: any) => state.currentUser);

    const hasChanged = ticket.valueAtReview !== JSON.stringify(currentValue);
    const isReadyForSubmission = hasChanged && !isManager;

    const sortedMessages =
        messages?.sort(
            (a, b) =>
                new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        ) || [];
    const hasMessages = sortedMessages.length > 0;

    // Permissões do criador do ticket
    const isCreator = ticket.createdBy === currentUser?.id;
    const isAssignedToMe = ticket.assignedTo === currentUser?.id;

    // Check if the workflow is currently 'with me' (I am blocking the flow), so I can still archive my created tickets
    const isMyTurn =
        (isApprovalUser && workflowStatus === "approval_pending") ||
        (isManager &&
            (workflowStatus === "validation_pending" ||
                workflowStatus === "draft")) ||
        (isDataUser && workflowStatus === "data_requested");

    // Check if ticket was returned to the creator (i.e., has messages from Data User)
    const isReturned = isCreator && isAssignedToMe && hasMessages;

    // Check if ticket was created by Approver (needed for canResolve and Forward button)
    const creatorRole =
        getUserRoleInProject && projectId
            ? getUserRoleInProject(ticket.createdBy, projectId)
            : undefined;
    const isApproverTicket = creatorRole === "approval_user";

    const canResolve =
        (isCreator && isAssignedToMe && !ticket.isDraft) ||
        // Approver: can only resolve after a correction has been returned to them
        (isCreator && isApprovalUser && isReturned && !ticket.isDraft) ||
        // Manager: can resolve approver-created tickets assigned to them (so they can correct and proceed to submit)
        (isManager && isAssignedToMe && isApproverTicket && !ticket.isDraft);
    // Archive: only for non-draft workflow tickets (draft tickets use Delete instead)
    const canArchive = isCreator && (isAssignedToMe || isMyTurn) && !isReturned && !ticket.isDraft;
    // Delete: only for draft tickets (permanent removal, never shows on workflow tickets)
    const canDelete = ticket.isDraft === true && isCreator;

    // Deferred Action State
    const pendingAction = pendingTicketActions?.get(ticket.id);
    const isMarkedForForward = pendingAction === "forward";
    const isMarkedForResolve = pendingAction === "resolve";
    const isMarkedForRevision = pendingAction === "request_revision";
    const isMarkedForOpen = pendingAction === "open";

    // DEBUG FORWARD BUTTON
    const assignedUser = users?.find((u) => u.id === ticket.assignedTo);
    // FALLBACK: If assignedUser is not found in the props list, checking if it matches the current company data user
    const resolvedName = assignedUser
        ? assignedUser.name
        : entityDataUser && entityDataUser.id === ticket.assignedTo
            ? entityDataUser.name
            : "Unknown";

    const assignedUserName = resolvedName;

    // Collapse if resolved
    useEffect(() => {
        if (ticket.status === "resolved") setIsExpanded(false);
    }, [ticket.status]);

    // DERIVED LOGICAL STATUS
    const latestMessage =
        sortedMessages.length > 0
            ? sortedMessages[sortedMessages.length - 1]
            : null;
    let logicalStatus: { label: string; style: string } | null = null;

    if (ticket.status === "open" && latestMessage) {
        const msg = latestMessage.message.toLowerCase();
        if (msg.includes("revision") || msg.includes("revisão")) {
            logicalStatus = {
                label: "REVISION",
                style: "bg-orange-50 text-orange-700 border-orange-200",
            };
        } else if (msg.includes("reencaminhado") || msg.includes("forwarded")) {
            logicalStatus = {
                label: "FORWARDED",
                style: "bg-orange-50 text-orange-700 border-orange-200",
            };
        } else if (msg.includes("correction") || msg.includes("correção")) {
            logicalStatus = {
                label: (isManager && latestMessage.userId === currentUser?.id) ? "CORRECTED" : "REVIEW PENDING",
                style: "bg-blue-50 text-blue-700 border-blue-200",
            };
        }
    }

    return (
        <div
            className={cn(
                "flex flex-col transition-all duration-300 ease-in-out",
                isExpanded ? "gap-3 w-full" : "w-auto self-start",
            )}
        >
            {!isExpanded ? (
                <button
                    type="button"
                    onClick={() => setIsExpanded(true)}
                    className={cn(
                        "group flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all shadow-sm border",
                        ticket.status === "resolved"
                            ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                            : isMarkedForForward
                                ? "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 ring-2 ring-purple-400 ring-offset-1"
                                : isMarkedForResolve
                                    ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100 ring-2 ring-green-400 ring-offset-1"
                                    : isMarkedForRevision
                                        ? "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 ring-2 ring-orange-400 ring-offset-1"
                                        : isMarkedForOpen
                                            ? "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 ring-2 ring-orange-400 ring-offset-1"
                                            : logicalStatus
                                                ? logicalStatus.style
                                                : getWorkflowStatusColors(workflowStatus) + " hover:opacity-80 transition-opacity",
                    )}
                >
                    {isMarkedForForward ? (
                        <CornerUpRight size={12} />
                    ) : isMarkedForResolve ? (
                        <CheckCircle size={12} />
                    ) : isMarkedForRevision ? (
                        <RefreshCw size={12} />
                    ) : ticket.status === "resolved" ? (
                        <CheckCircle size={12} />
                    ) : (
                        <AlertTriangle size={12} />
                    )}
                    <span className="truncate max-w-[200px]">{ticket.title}</span>
                    <span className="text-[10px] opacity-60 ml-1 font-normal">
                        • {new Date(ticket.createdAt).toLocaleDateString()}
                    </span>
                    {hasMessages && (
                        <span className="ml-1 flex items-center gap-0.5 bg-white dark:bg-surface/50 px-1.5 py-0.5 rounded-full text-[9px]">
                            <MessageSquare size={8} /> {sortedMessages.length}
                        </span>
                    )}
                    {/* Tiny Status Badge in collapsed view */}
                    {logicalStatus && !pendingAction && (
                        <span className="ml-1 text-[8px] uppercase tracking-wider font-bold opacity-80 border-l pl-1 border-gray-300 dark:border-[#444746]/50">
                            {logicalStatus.label}
                        </span>
                    )}
                    {/* Delete button in collapsed pill — only for draft tickets */}
                    {canDelete && onDelete && (
                        <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (confirm("Apagar este ticket permanentemente? Esta ação não pode ser revertida.")) {
                                    onDelete(ticket.id);
                                }
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.stopPropagation();
                                    if (confirm("Apagar este ticket permanentemente?")) onDelete(ticket.id);
                                }
                            }}
                            className="ml-1 p-0.5 rounded-full hover:bg-red-100 hover:text-red-600 transition-colors"
                            title="Apagar ticket (draft)"
                        >
                            <Trash2 size={11} />
                        </span>
                    )}
                </button>
            ) : (
                <div className="bg-white dark:bg-surface border border-gray-200 dark:border-[#444746] rounded-lg shadow-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 ring-1 ring-black/5 w-full max-w-xl mx-auto">
                    {/* Header */}
                    <div className="bg-white dark:bg-surface border-b border-gray-100 dark:border-[#444746] px-3 py-2 flex justify-between items-start gap-2 sticky top-0 z-10">
                        <div className="flex-1 min-w-0">
                            {/* Assinado A Debug */}
                            <div className="text-[9px] text-gray-400 mb-1">
                                Assigned to:{" "}
                                <span className="font-bold text-gray-600 dark:text-gray-300">
                                    {assignedUserName}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsExpanded(false)}
                                className="flex items-center gap-1.5 text-xs font-bold text-gray-800 dark:text-gray-100 mb-0.5 hover:text-primary transition-colors group"
                            >
                                <ChevronDown
                                    size={14}
                                    className="text-gray-400 group-hover:text-primary transition-colors"
                                />
                                {ticket.title}
                            </button>
                            <div className="flex items-center gap-2 text-[10px] text-gray-500 ml-5">
                                <span>
                                    {new Date(ticket.createdAt).toLocaleString(undefined, {
                                        dateStyle: "medium",
                                        timeStyle: "short",
                                    })}
                                </span>
                                <span className="w-0.5 h-0.5 rounded-full bg-gray-300"></span>
                                <span
                                    className={cn(
                                        "px-1.5 py-px rounded font-medium uppercase tracking-wider text-[9px]",
                                        ticket.status === "resolved"
                                            ? "bg-green-50 text-green-700 border border-green-100"
                                            : isMarkedForForward
                                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                                : isMarkedForResolve
                                                    ? "bg-green-50 text-green-700 border-green-200"
                                                    : isMarkedForRevision
                                                        ? "bg-orange-50 text-orange-700 border-orange-200"
                                                        : logicalStatus
                                                            ? logicalStatus.style
                                                            : getWorkflowStatusColors(workflowStatus),
                                    )}
                                >
                                    {pendingAction
                                        ? isMarkedForForward
                                            ? "Forward Pending"
                                            : isMarkedForResolve
                                                ? "Resolve Pending"
                                                : isMarkedForRevision
                                                    ? "Revision Pending"
                                                    : "Open Pending"
                                        : logicalStatus
                                            ? logicalStatus.label
                                            : ticket.status}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-1">
                            {/* Forward Button (Deferred) - Only when manager has NOT confirmed correction */}
                            {isEditing &&
                                isManager &&
                                isAssignedToMe &&
                                isApproverTicket &&
                                !isFieldCorrected &&
                                logicalStatus?.label !== "REVIEW PENDING" &&
                                ticket.status !== "resolved" &&
                                onSetTicketAction && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSetTicketAction(ticket.id, "forward");
                                        }}
                                        className={cn(
                                            "p-1.5 rounded-full transition-colors flex items-center gap-1 pr-2",
                                            isMarkedForForward
                                                ? "text-red-600 bg-red-50 hover:bg-red-100"
                                                : "text-purple-600 bg-purple-50 hover:bg-purple-100",
                                        )}
                                        title={
                                            isMarkedForForward
                                                ? "Undo Forward"
                                                : "Mark to Forward to Data User"
                                        }
                                    >
                                        {isMarkedForForward ? (
                                            <X size={14} />
                                        ) : (
                                            <CornerUpRight size={14} />
                                        )}
                                        <span className="text-[10px] font-bold">
                                            {isMarkedForForward ? "UNDO" : "FORWARD"}
                                        </span>
                                    </button>
                                )}

                            {/* Resolve (Deferred) — only for non-approver ticket creators, NOT manager on approver tickets */}
                            {isEditing &&
                                canResolve &&
                                !isMarkedForRevision &&
                                !(isManager && isApproverTicket) &&
                                ticket.status !== "resolved" &&
                                onSetTicketAction && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSetTicketAction(ticket.id, "resolve");
                                        }}
                                        className={cn(
                                            "p-1.5 rounded-full transition-colors flex items-center gap-1 pr-2",
                                            isMarkedForResolve
                                                ? "text-red-600 bg-red-50 hover:bg-red-100"
                                                : "text-green-600 bg-green-50 hover:bg-green-100",
                                        )}
                                        title={
                                            isMarkedForResolve ? "Undo Resolve" : "Mark to Resolve"
                                        }
                                    >
                                        {isMarkedForResolve ? (
                                            <X size={14} />
                                        ) : (
                                            <CheckCircle size={14} />
                                        )}
                                        <span className="text-[10px] font-bold">
                                            {isMarkedForResolve ? "UNDO" : "RESOLVE"}
                                        </span>
                                    </button>
                                )}

                            {/* Request Revision — manager after Data User corrected (REVIEW PENDING), or Approver when correction returned */}
                            {isEditing &&
                                !isFieldCorrected &&
                                (
                                    // Manager: data user has corrected (REVIEW PENDING)
                                    (isManager && logicalStatus?.label === "REVIEW PENDING") ||
                                    // Approver: correction returned to them
                                    (isApprovalUser && isCreator && isReturned && logicalStatus?.label === "REVIEW PENDING")
                                ) &&
                                !isMarkedForResolve &&
                                ticket.status !== "resolved" &&
                                onSetTicketAction && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSetTicketAction(ticket.id, "request_revision");
                                        }}
                                        className={cn(
                                            "p-1.5 rounded-full transition-colors flex items-center gap-1 pr-2",
                                            isMarkedForRevision
                                                ? "text-red-600 bg-red-50 hover:bg-red-100"
                                                : "text-orange-600 bg-orange-50 hover:bg-orange-100",
                                        )}
                                        title={
                                            isMarkedForRevision
                                                ? "Undo Revision Request"
                                                : "Request Revision"
                                        }
                                    >
                                        {isMarkedForRevision ? (
                                            <X size={14} />
                                        ) : (
                                            <RefreshCw size={14} />
                                        )}
                                        <span className="text-[10px] font-bold">
                                            {isMarkedForRevision ? "UNDO" : "REVISION"}
                                        </span>
                                    </button>
                                )}

                            {/* Archive (workflow tickets) or Delete (draft tickets) */}
                            {canArchive && (
                                <button
                                    type="button"
                                    onClick={() => onArchive(ticket.id)}
                                    className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-full transition-all border border-transparent hover:border-orange-100 hover:shadow-sm"
                                    title="Archive ticket"
                                >
                                    <Archive size={14} />
                                </button>
                            )}
                            {/* Delete — only for draft tickets (permanent removal) */}
                            {canDelete && onDelete && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (confirm("Apagar este ticket permanentemente? Esta ação não pode ser revertida.")) {
                                            onDelete(ticket.id);
                                        }
                                    }}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all border border-transparent hover:border-red-100 hover:shadow-sm"
                                    title="Delete permanently (draft only)"
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Messages Body */}
                    <div className="p-3 bg-gray-50 dark:bg-[#131314]/50 max-h-[350px] overflow-y-auto space-y-3 custom-scrollbar">
                        {ticket.description && (
                            <div className="px-1 mb-4">
                                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                    Issue Description
                                </span>
                                <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                                    {ticket.description}
                                </p>
                            </div>
                        )}

                        {sortedMessages.map((msg) => {
                            const isMe = msg.userId === currentUser?.id;
                            const isSystem = msg.userId === "system" || !msg.userId;

                            if (isSystem) {
                                return (
                                    <div
                                        key={msg.id}
                                        className="flex justify-center my-2 relative"
                                    >
                                        <div
                                            className="absolute inset-0 flex items-center"
                                            aria-hidden="true"
                                        >
                                            <div className="w-full border-t border-gray-100 dark:border-[#444746]"></div>
                                        </div>
                                        <span className="relative z-10 text-[9px] uppercase tracking-wide font-medium bg-gray-100 dark:bg-surface text-gray-500 px-2 py-0.5 rounded-full border border-gray-200 dark:border-[#444746] shadow-sm">
                                            {msg.message}
                                        </span>
                                    </div>
                                );
                            }

                            const user = users?.find((u) => u.id === msg.userId);
                            const userName = user ? user.name : "Unknown User";
                            const initials = userName
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .substring(0, 2)
                                .toUpperCase();

                            return (
                                <div
                                    key={msg.id}
                                    className={cn(
                                        "flex gap-2 max-w-[90%]",
                                        isMe ? "ml-auto flex-row-reverse" : "mr-auto",
                                    )}
                                >
                                    {/* Bubble */}
                                    <div
                                        className={cn(
                                            "flex flex-col p-2.5 rounded-xl text-xs shadow-sm relative group transition-all hover:shadow-md",
                                            isMe
                                                ? "bg-[#e8f0fe] text-blue-900 rounded-br-sm"
                                                : "bg-white dark:bg-surface border border-gray-100 dark:border-[#444746] text-gray-800 dark:text-gray-100 rounded-bl-sm",
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "text-[9px] font-bold opacity-60 mb-0.5 uppercase tracking-wider",
                                                isMe ? "text-primary-hover" : "text-gray-500",
                                            )}
                                        >
                                            {userName}
                                        </span>
                                        <p className="whitespace-pre-wrap leading-relaxed">
                                            {msg.message}
                                        </p>
                                        <span
                                            className={cn(
                                                "text-[9px] mt-1 opacity-60 self-end font-medium",
                                                isMe ? "text-primary-hover" : "text-gray-400",
                                            )}
                                        >
                                            {new Date(msg.createdAt).toLocaleTimeString([], {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}

                        {!hasMessages && !ticket.description && (
                            <div className="flex flex-col items-center justify-center py-6 text-gray-400 italic">
                                <MessageSquare size={24} className="mb-1 opacity-20" />
                                <span className="text-[10px]">
                                    No messages yet. Start the conversation!
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Footer / Input */}
                    {(ticket.status === "open" || canResolve) && (
                        <div className="p-3 bg-white dark:bg-surface border-t border-gray-100 dark:border-[#444746]">
                            {/* Ready Badge */}
                            {!isManager && isReadyForSubmission && (
                                <motion.div
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mb-2 flex justify-center"
                                >
                                    <span className="bg-green-50 text-green-700 px-2.5 py-1 rounded-full text-[10px] font-bold border border-green-100 flex items-center gap-1 shadow-sm">
                                        <CheckCircle size={10} className="text-green-600" />
                                        CHANGES READY FOR VALIDATION
                                    </span>
                                </motion.div>
                            )}

                            <div className="flex gap-2 items-center">
                                <div className="relative flex-1 group">
                                    <textarea
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        placeholder="Type a message..."
                                        className="w-full px-3 py-2 pr-2 text-xs border border-gray-200 dark:border-[#444746] bg-gray-50 dark:bg-[#131314] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white dark:focus:bg-surface focus:border-blue-500 transition-all resize-none min-h-[36px] max-h-[100px] shadow-sm"
                                        rows={1}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && !e.shiftKey) {
                                                e.preventDefault();
                                                if (replyText.trim()) {
                                                    onAddMessage(ticket.id, replyText);
                                                    setReplyText("");
                                                }
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
