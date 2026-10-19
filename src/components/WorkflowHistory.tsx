import React, { useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
    History,
    FileText,
    CheckCircle,
    XCircle,
    AlertCircle,
    MessageSquare,
    Shield,
    Clock,
    User as UserIcon,
    Building2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface WorkflowHistoryProps {
    entityId: string;
    projectId: string;
    entityType: 'company' | 'worker';
}

type HistoryEventType = 'company_created' | 'request_created' | 'ticket_created' | 'ticket_updated' | 'company_approved' | 'company_rejected' | 'workflow_status' | 'workflow_request' | 'workflow_approval' | 'workflow_submission';

interface HistoryEvent {
    id: string;
    type: HistoryEventType;
    date: Date;
    title: string;
    description?: string;
    user?: string; // Name of the user who performed the action
    icon: React.ReactNode;
    color: string;
}

export const WorkflowHistory: React.FC<WorkflowHistoryProps> = ({ entityId, projectId, entityType }) => {
    const t = useTranslations('Companies');
    const { companies, getProjectResources, companyRequests, tickets, users, workflowLogs } = useStore(useShallow(state => ({
        companies: state.companies,
        companyRequests: state.companyRequests,
        tickets: state.tickets,
        users: state.users,
        workflowLogs: state.workflowLogs,
        getProjectResources: state.getProjectResources
    })));

    const workers = getProjectResources(projectId).workers;

    // Function to get translated status names
    const getStatusName = (status: string | undefined): string => {
        switch (status) {
            case 'draft': return t('status.draft');
            case 'data_requested': return t('status.data_requested');
            case 'data_update': return t('status.data_update');
            case 'validation_pending': return t('status.validation_pending');
            case 'validated': return t('status.validated');
            case 'approval_pending': return t('status.approval_pending');
            case 'approved': return t('status.approved');
            case 'approval_data_update': return t('status.approval_data_update');
            case 'off_site': return t('status.off_site');
            case 'incomplete': return t('status.incomplete');
            default: return status?.replace('_', ' ') || 'Unknown';
        }
    };

    const events = useMemo(() => {
        const entityName = entityType === 'company'
            ? companies.find(c => c.id === entityId)?.name
            : workers.find(w => w.id === entityId)?.name;

        // If entity completely not found, we can still show basic logs, but no "Creation" event
        const list: HistoryEvent[] = [];

        // 0. Workflow Logs (Status Changes & Actions)
        const logs = workflowLogs?.filter(l => l.entityId === entityId) || [];
        logs.forEach(log => {
            const actor = users.find(u => u.id === log.actorId);
            let title = 'Atualização de Workflow';
            let description = log.details || '';
            let icon = <History size={16} />;
            let color = 'bg-gray-100 dark:bg-surface text-gray-600 dark:text-gray-300';
            let type: HistoryEventType = 'workflow_status';

            switch (log.action) {
                case 'status_change':
                    // FIX: Show actual status name as title instead of generic "Status Change"
                    const statusName = getStatusName(log.newStatus);
                    title = statusName;
                    description = `Status changed to "${statusName}".`;

                    // Set color based on new status
                    if (log.newStatus === 'validated') {
                        icon = <Shield size={16} />;
                        color = 'bg-green-100 text-green-600';
                    } else if (log.newStatus === 'validation_pending') {
                        icon = <Clock size={16} />;
                        color = 'bg-primary-light text-primary';
                    } else if (log.newStatus === 'approved') {
                        icon = <CheckCircle size={16} />;
                        color = 'bg-emerald-100 text-emerald-600';
                    } else if (log.newStatus === 'approval_pending') {
                        icon = <Clock size={16} />;
                        color = 'bg-purple-100 text-purple-600';
                    } else if (log.newStatus === 'data_requested') {
                        icon = <FileText size={16} />;
                        color = 'bg-orange-100 text-orange-600';
                    } else if (log.newStatus === 'data_update') {
                        icon = <AlertCircle size={16} />;
                        color = 'bg-yellow-100 text-yellow-600';
                    } else if (log.newStatus === 'approval_data_update') {
                        icon = <AlertCircle size={16} />;
                        color = 'bg-red-100 text-red-600';
                    } else if (log.newStatus === 'draft') {
                        icon = <FileText size={16} />;
                        color = 'bg-gray-100 dark:bg-surface text-gray-600 dark:text-gray-300';
                    }
                    type = 'workflow_status';
                    break;
                case 'data_requested':
                    title = 'Solicitação de Documentação';
                    description = 'Foi solicitado o preenchimento de dados/documentos.';
                    icon = <FileText size={16} />;
                    color = 'bg-orange-100 text-orange-600';
                    type = 'workflow_request';
                    break;
                case 'approved':
                    title = 'Aprovação';
                    description = 'O processo foi aprovado e validado.';
                    icon = <CheckCircle size={16} />;
                    color = 'bg-green-100 text-green-600';
                    type = 'workflow_approval';
                    break;
                case 'validation_submitted':
                    title = 'Submetido para Validação';
                    description = 'O processo foi submetido para validação.';
                    icon = <Shield size={16} />;
                    color = 'bg-primary-light text-primary';
                    type = 'workflow_submission';
                    break;
                case 'rejected':
                    title = 'Rejeição';
                    description = 'O processo foi rejeitado.';
                    icon = <XCircle size={16} />;
                    color = 'bg-red-100 text-red-600';
                    type = 'company_rejected';
                    break;
            }

            list.push({
                id: `log_${log.id}`,
                type,
                date: new Date(log.createdAt),
                title,
                description,
                icon,
                color,
                user: actor?.name || 'Sistema'
            });
        });

        // 1. Entity Creation
        const company = entityType === 'company' ? companies.find(c => c.id === entityId) : null;
        const worker = entityType === 'worker' ? workers.find(w => w.id === entityId) : null;

        if (entityType === 'company' && company?.createdAt) {
            list.push({
                id: `create_${company.id}`,
                type: 'company_created',
                date: new Date(company.createdAt),
                title: 'Empresa Criada',
                description: `A empresa ${company.name} foi registada no sistema.`,
                icon: <Building2 size={16} />,
                color: 'bg-primary-light text-primary',
                user: 'System'
            });
        }

        if (entityType === 'worker' && worker?.createdAt) {
            list.push({
                id: `create_${worker.id}`,
                type: 'company_created',
                date: new Date(worker.createdAt),
                title: 'Trabalhador Adicionado',
                description: `O trabalhador ${worker.name} foi adicionado ao estaleiro.`,
                icon: <UserIcon size={16} />,
                color: 'bg-primary-light text-primary',
                user: 'System'
            });
        }

        // 2. Company Requests
        if (entityType === 'company') {
            const relevantRequests = companyRequests.filter(r => r.companyId === entityId);
            relevantRequests.forEach(req => {
                const requester = users.find(u => u.id === req.userId)?.name || 'Unknown User';
                list.push({
                    id: `req_${req.id}`,
                    type: 'request_created',
                    date: new Date(req.createdAt),
                    title: 'Pedido de Edição',
                    description: `Pedido de alteração de dados efetuado por ${requester}. Estado: ${req.status}.`,
                    icon: <FileText size={16} />,
                    color: 'bg-orange-100 text-orange-600',
                    user: requester
                });
            });
        }

        // 3. Tickets
        const relevantTickets = tickets.filter(t => t.entityId === entityId);
        relevantTickets.forEach(ticket => {
            const creator = users.find(u => u.id === ticket.createdBy)?.name || 'Unknown User';
            list.push({
                id: `ticket_${ticket.id}`,
                type: 'ticket_created',
                date: new Date(ticket.createdAt),
                title: `Ticket Criado: ${ticket.title}`,
                description: ticket.description,
                icon: <MessageSquare size={16} />,
                color: 'bg-purple-100 text-purple-600',
                user: creator
            });

            if (ticket.status === 'resolved' || ticket.status === 'closed') {
                // Trying to use updatedAt if available, otherwise fallback to created + delta or just ignore date accuracy for now
                // Assuming ticket.updatedAt exists as per types
                if (ticket.updatedAt && ticket.updatedAt !== ticket.createdAt) {
                    list.push({
                        id: `ticket_resolve_${ticket.id}`,
                        type: 'ticket_updated',
                        date: new Date(ticket.updatedAt),
                        title: `Ticket Resolvido/Fechado: ${ticket.title}`,
                        description: `Estado alterado para ${ticket.status}.`,
                        icon: <CheckCircle size={16} />,
                        color: 'bg-green-100 text-green-600',
                        user: 'System'
                    });
                }
            }
        });

        // 4. Approval Status
        if (entityType === 'company' && company?.approvedAt && company.approvedBy) {
            const approver = users.find(u => u.id === company.approvedBy)?.name || 'Unknown Manager';
            list.push({
                id: `approval_${company.id}`,
                type: 'company_approved',
                date: new Date(company.approvedAt),
                title: 'Empresa Aprovada',
                description: `A empresa foi aprovada por ${approver}.`,
                icon: <Shield size={16} />,
                color: 'bg-green-100 text-green-600',
                user: approver
            });
        }

        if (entityType === 'worker' && worker?.approvedAt && worker.approvedBy) {
            const approver = users.find(u => u.id === worker.approvedBy)?.name || 'Unknown Manager';
            list.push({
                id: `approval_${worker.id}`,
                type: 'company_approved',
                date: new Date(worker.approvedAt),
                title: 'Trabalhador Aprovado',
                description: `O processo do trabalhador foi validado por ${approver}.`,
                icon: <Shield size={16} />,
                color: 'bg-green-100 text-green-600',
                user: approver
            });
        }

        return list.sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [entityId, projectId, entityType, companies, workers, companyRequests, tickets, users, workflowLogs]);

    if (events.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400" >
                <History size={48} className="mb-4 opacity-50" />
                <p>Não existe histórico para este registo.</p>
            </div >
        );
    }

    return (
        <div className="space-y-6 p-4">
            <div className="flex items-center gap-2 mb-4">
                <History className="text-gray-500" size={20} />
                <h3 className="font-semibold text-gray-700 dark:text-gray-200">Histórico de Eventos</h3>
            </div>

            <div className="relative border-l-2 border-gray-200 dark:border-[#444746] ml-3 space-y-8">
                {events.map((event, index) => (
                    <div key={event.id} className="relative pl-8">
                        {/* Timeline Connector */}
                        <div className={cn(
                            "absolute -left-[11px] top-0 w-6 h-6 rounded-full border-4 border-white flex items-center justify-center bg-white dark:bg-surface",
                        )}>
                            <div className={cn("w-full h-full rounded-full flex items-center justify-center", event.color)}>
                                {event.icon}
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                            <div>
                                <h4 className="text-sm font-bold text-gray-900 dark:text-white">{event.title}</h4>
                                <p className="text-xs text-gray-500 mt-1">{event.description}</p>
                                {event.user && (
                                    <div className="flex items-center gap-1 mt-2 text-xs text-gray-500 bg-gray-50 dark:bg-[#131314] w-fit px-2 py-1 rounded">
                                        <UserIcon size={12} />
                                        <span>{event.user}</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-400 whitespace-nowrap mt-2 sm:mt-0">
                                <Clock size={12} />
                                <span>{format(event.date, "d MMM yyyy 'às' HH:mm", { locale: pt })}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
