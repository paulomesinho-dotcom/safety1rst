'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter, Link } from '@/navigation';
import { useStore } from '@/store/useStore';
import AuthGuard from '@/components/AuthGuard';
import { useTheme } from '@/providers/ThemeProvider';
import Header from '@/components/Header';
import { useTranslations } from 'next-intl';
import { 
    Building2, Users, Wrench, GraduationCap, Folder, 
    ArrowLeft, ArrowRight, Plus, Search, Trash2, Edit2, Pencil, Check, 
    FileText, Shield, Calendar, Phone, Mail, MapPin, 
    Clock, AlertCircle, Save, CheckCircle2, ChevronRight, ChevronLeft,
    LogOut, Share2, UploadCloud, Download, ExternalLink, CheckCircle, Eye,
    User, Briefcase, Activity, AlertTriangle, X, Cloud, Filter,
    FolderPlus, FolderCheck, FileSpreadsheet, HardDrive, RotateCw, History, Paperclip, ChevronDown,
    Archive, ShieldCheck, Server, Settings as SettingsIcon
} from 'lucide-react';
import { CDESettingsModal } from '@/components/CDESettingsModal';
import { ProfileManagerModal, type ProfileType } from '@/components/ProfileManagerModal';
import { 
    initializeCompanyStructure, 
    uploadToCDEFolder, 
    archiveCDEFile,
    createOneDriveFolder,
    COMPANY_STANDARD_FOLDERS, 
    COMPANY_SPECIAL_SUBFOLDERS 
} from '@/lib/cde-manager';
import { DocumentUpload } from '@/components/DocumentUpload';
import { DocumentList } from '@/components/DocumentList';
import { GoogleDriveIcon } from '@/components/GoogleDriveIcons';
import { 
    FlatCompaniesIcon, FlatWorkersIcon, FlatEquipmentIcon, 
    FlatTrainingIcon, FlatDocumentsIcon, FlatFolderIcon,
    FlatSettingsIcon
} from '@/components/FlatIcons';
import { 
    COMPANY_ROLE_OPTIONS, 
    COMPANY_ROLE_GROUPS, 
    getIfcRoleFromCompanyRole,
    getCompanyRoleLabel 
} from '@/lib/company-ifc-map';
import { 
    WORKER_ROLES, 
    OPERATIVE_CATEGORIES, 
    getRoleDefinition 
} from '@/lib/worker-roles';
import { Modal, InputGroup, PrimaryButton, SecondaryButton } from '@/components/Modal';
import { cn } from '@/lib/utils';
import { nanoid } from 'nanoid';
import type { Worker, Equipment, Company, Project, Document } from '@/types';

type CompanyTab = 'organization' | 'workers' | 'equipment' | 'training' | 'documents' | 'settings';

function getInitials(name?: string) {
    if (!name) return 'U';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const CONTRACT_TYPE_OPTIONS = [
    { value: 'sem_termo', label: 'Sem Termo (Efetivo)' },
    { value: 'termo_certo', label: 'Termo Resolutivo Certo' },
    { value: 'termo_incerto', label: 'Termo Resolutivo Incerto' },
    { value: 'prestacao_servicos', label: 'Prestação de Serviços' },
    { value: 'trabalho_temporario', label: 'Trabalho Temporário' },
    { value: 'cedencia_ocasional', label: 'Cedência Ocasional' },
    { value: 'estagio', label: 'Estágio Profissional' },
];

const PROFESSION_CATEGORY_OPTIONS = [
    { value: 'encarregado_geral', label: 'Encarregado Geral' },
    { value: 'encarregado', label: 'Encarregado de Obra' },
    { value: 'oficial_especializado', label: 'Oficial Especializado' },
    { value: 'oficial', label: 'Oficial' },
    { value: 'pre_oficial', label: 'Pré-Oficial' },
    { value: 'ajudante', label: 'Ajudante / Servente' },
    { value: 'aprendiz', label: 'Aprendiz' },
    { value: 'tecnico_superior', label: 'Técnico Superior' },
    { value: 'tecnico_medio', label: 'Técnico Médio' },
    { value: 'administrativo', label: 'Administrativo de Obra' },
];

const WORK_SCHEDULE_OPTIONS = [
    { value: 'normal', label: 'Geral Diurno (8h-17h)' },
    { value: 'turnos_rotativos', label: 'Turnos Rotativos' },
    { value: 'turno_noturno', label: 'Turno Noturno' },
    { value: 'parcial', label: 'Tempo Parcial (Part-Time)' },
    { value: 'isencao', label: 'Isenção de Horário' },
];

const ALL_EPIS = [
    'Capacete',
    'Colete Refletor',
    'Botins de Proteção',
    'Luvas de Proteção',
    'Óculos de Proteção',
    'Proteção Auditiva',
    'Arnês Antiqueda',
    'Máscara FFP2/FFP3',
];

const getContractTypeLabel = (val?: string) => {
    const found = CONTRACT_TYPE_OPTIONS.find(o => o.value === val);
    return found ? found.label : (val || 'Sem Termo (Efetivo)');
};

const getProfessionCategoryLabel = (val?: string) => {
    const found = PROFESSION_CATEGORY_OPTIONS.find(o => o.value === val);
    return found ? found.label : (val || 'Oficial');
};

const getWorkScheduleLabel = (val?: string) => {
    const found = WORK_SCHEDULE_OPTIONS.find(o => o.value === val);
    return found ? found.label : (val || 'Geral Diurno (8h-17h)');
};

const getMedicalFitnessBadge = (fitness?: string, expiry?: string) => {
    const isExpired = expiry ? new Date(expiry) < new Date() : false;
    if (isExpired) {
        return { label: 'FAT Expirada', color: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200 dark:border-red-800' };
    }
    switch (fitness) {
        case 'apto':
            return { label: 'Apto', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' };
        case 'apto_condicionado':
        case 'apto_condicionalmente':
            return { label: 'Apto Condicionado', color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800' };
        case 'inapto':
        case 'inapto_definitivo':
            return { label: 'Inapto', color: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200 dark:border-red-800' };
        default:
            return expiry 
                ? { label: 'Exame Válido', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' }
                : { label: 'FAT Pendente', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700' };
    }
};


const RequirementCard = ({
    label,
    category,
    entityId,
    projectId,
    expiryDate,
    policyNumber,
    isEditing = true,
    children
}: {
    label: string;
    category: string;
    entityId: string;
    projectId: string;
    expiryDate?: string;
    policyNumber?: string;
    isEditing?: boolean;
    children?: React.ReactNode;
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const { documents } = useStore();
    const hasDocs = documents.some(d => d.entityId === entityId && d.category === category && !d.archived);

    useEffect(() => {
        if (hasDocs) setIsExpanded(true);
    }, [hasDocs]);

    const isExpired = expiryDate ? new Date(expiryDate) < new Date() : false;

    return (
        <div className="flex flex-col gap-2 p-3 bg-white dark:bg-surface border border-gray-100 dark:border-[#444746] rounded-xl shadow-xs hover:border-primary/20 transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div 
                    className="flex items-start sm:items-center gap-3 cursor-pointer flex-1"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <div className={cn(
                        "p-2 rounded-lg transition-colors mt-0.5 sm:mt-0",
                        isExpanded ? "bg-primary-light text-primary" : "bg-gray-50 dark:bg-[#131314] text-gray-400"
                    )}>
                        <FileText size={18} />
                    </div>
                    <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white leading-tight">{label}</div>
                        <div className="text-[11px] text-gray-400 uppercase tracking-wider mt-0.5">
                            {policyNumber ? `N.º ${policyNumber}` : category.replace(/_/g, ' ')}
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {expiryDate ? (
                        <span className={cn(
                            "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase",
                            isExpired 
                                ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800" 
                                : "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800"
                        )}>
                            {isExpired ? <AlertTriangle size={10} /> : <Check size={10} />}
                            {new Date(expiryDate).toLocaleDateString()}
                        </span>
                    ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                            Sem data
                        </span>
                    )}

                    <div className="hidden sm:block h-4 w-px bg-gray-200 dark:bg-[#444746] mx-1" />

                    <DocumentUpload
                        entityId={entityId}
                        projectId={projectId}
                        category={category}
                        layout="button"
                        label="Upload"
                        systemLabel={label}
                    />
                </div>
            </div>

            {children && <div className="mt-2 pl-0 sm:pl-11">{children}</div>}

            {isExpanded && (
                <div className="mt-2 pl-0 sm:pl-11 animate-in fade-in slide-in-from-top-2 duration-200">
                    <DocumentList
                        entityId={entityId}
                        projectId={projectId}
                        category={category}
                        isEditing={isEditing}
                    />
                </div>
            )}
        </div>
    );
};

export default function MyCompanyPage() {
    const router = useRouter();
    const { isDark } = useTheme();
    const { 
        currentUser, 
        setCurrentUser,
        account, 
        accounts,
        updateAccount,
        companies, 
        workers, 
        equipment, 
        trainings,
        courses,
        projects,
        companyProfiles,
        updateCompany,
        addCompany,
        addWorker,
        updateWorker,
        addEquipment,
        updateEquipment,
        addNotification,
        importCompanyToProject,
        importWorkerToProject,
        importEquipmentToProject,
        documents,
        addDocument,
        updateDocument,
        deleteDocument,
        unarchiveDocument
    } = useStore();

    const handleLogout = () => {
        setCurrentUser(null);
        router.push('/login');
    };

    const [activeTab, setActiveTab] = useState<CompanyTab>('organization');
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [settingsSubTab, setSettingsSubTab] = useState<'cde' | 'profiles'>('cde');
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [profileModalType, setProfileModalType] = useState<ProfileType>('company');

    // Current user's account & master company record (strictly isolated per user/account, never shared with superadmin or across accounts)
    const effectiveAccountId = useMemo(() => {
        if (!currentUser) return '';
        if (currentUser.role === 'superadmin') return `sa_${currentUser.id}`;
        return currentUser.accountId || `usr_${currentUser.id}`;
    }, [currentUser]);

    const userAccount = useMemo(() => {
        if (!currentUser || currentUser.role === 'superadmin' || !currentUser.accountId) return null;
        return accounts.find(a => a.id === currentUser.accountId) || null;
    }, [accounts, currentUser]);

    const currentPlan = userAccount?.plan || 'free';
    const isPaidOrAdmin = currentPlan !== 'free' || currentUser?.role === 'admin' || currentUser?.role === 'superadmin';

    // Find the master company entity strictly for this account/user
    const masterCompany = useMemo(() => {
        if (!effectiveAccountId) return undefined;
        return companies.find(c => c.accountId === effectiveAccountId && !c.projectId && c.id !== 'comp_master') ||
               companies.find(c => c.accountId === effectiveAccountId && c.id !== 'comp_master');
    }, [companies, effectiveAccountId]);

    // Deterministic, strictly isolated corporate entity ID per user/account (never 'comp_master')
    const corporateEntityId = useMemo(() => {
        if (!currentUser) return '';
        if (currentUser.role === 'superadmin') return `comp_sa_${currentUser.id}`;
        if (masterCompany?.id && masterCompany.id !== 'comp_master') return masterCompany.id;
        if (currentUser.accountId) return `comp_acc_${currentUser.accountId}`;
        return `comp_usr_${currentUser.id}`;
    }, [currentUser, masterCompany?.id]);

    // Form state for Company Details
    const [companyForm, setCompanyForm] = useState({
        name: masterCompany?.name || userAccount?.name || 'A Minha Empresa',
        nif: masterCompany?.nif || userAccount?.vatNumber || '',
        activity: masterCompany?.activity || '',
        caeCode: masterCompany?.caeCode || '',
        companyRole: masterCompany?.companyRole || 'empresa_construcao',
        companyRoleCustom: masterCompany?.companyRoleCustom || '',
        legalForm: (masterCompany?.legalForm as any) || 'lda',
        status: (masterCompany?.status as any) || 'active',
        impic: masterCompany?.impic || '',
        email: masterCompany?.email || userAccount?.contactEmail || currentUser?.email || '',
        phone: masterCompany?.phone || userAccount?.contactPhone || '',
        address: masterCompany?.address || '',
        insuranceWorkAccPolicy: masterCompany?.insuranceWorkAccPolicy || '',
        insuranceWorkAccDate: masterCompany?.insuranceWorkAccDate || '',
        insuranceCivilPolicy: masterCompany?.insuranceCivilPolicy || '',
        insuranceCivilDate: masterCompany?.insuranceCivilDate || '',
        cleanSSDate: masterCompany?.cleanSSDate || '',
        cleanFinDate: masterCompany?.cleanFinDate || '',
    });

    const isFormEditedRef = useRef(false);

    // Keep form synced if master company or account is loaded/updated, unless user is typing
    useEffect(() => {
        if (!isFormEditedRef.current && (masterCompany || userAccount)) {
            setCompanyForm(prev => ({
                ...prev,
                name: masterCompany?.name || userAccount?.name || prev.name,
                nif: masterCompany?.nif || userAccount?.vatNumber || prev.nif,
                activity: masterCompany?.activity ?? prev.activity,
                caeCode: masterCompany?.caeCode ?? prev.caeCode,
                companyRole: masterCompany?.companyRole ?? prev.companyRole,
                companyRoleCustom: masterCompany?.companyRoleCustom ?? prev.companyRoleCustom,
                legalForm: (masterCompany?.legalForm as any) ?? prev.legalForm,
                status: (masterCompany?.status as any) ?? prev.status,
                impic: masterCompany?.impic ?? prev.impic,
                email: masterCompany?.email || userAccount?.contactEmail || currentUser?.email || prev.email,
                phone: masterCompany?.phone || userAccount?.contactPhone || prev.phone,
                address: masterCompany?.address ?? prev.address,
                insuranceWorkAccPolicy: masterCompany?.insuranceWorkAccPolicy ?? prev.insuranceWorkAccPolicy,
                insuranceWorkAccDate: masterCompany?.insuranceWorkAccDate ?? prev.insuranceWorkAccDate,
                insuranceCivilPolicy: masterCompany?.insuranceCivilPolicy ?? prev.insuranceCivilPolicy,
                insuranceCivilDate: masterCompany?.insuranceCivilDate ?? prev.insuranceCivilDate,
                cleanSSDate: masterCompany?.cleanSSDate ?? prev.cleanSSDate,
                cleanFinDate: masterCompany?.cleanFinDate ?? prev.cleanFinDate,
            }));
        }
    }, [masterCompany, userAccount]);

    const [savedNotice, setSavedNotice] = useState(false);

    // Company Details Modal (View vs Edit mode)
    const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
    const [companyModalMode, setCompanyModalMode] = useState<'view' | 'edit'>('view');
    const [companyModalTab, setCompanyModalTab] = useState<'identification' | 'legal' | 'documents'>('identification');
    const [companySearchTerm, setCompanySearchTerm] = useState('');

    // Export / Sincronizar Modal State
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportEntityType, setExportEntityType] = useState<'company' | 'worker' | 'equipment'>('company');
    const [exportTargetProjectId, setExportTargetProjectId] = useState<string>('');
    const [exportProjectRole, setExportProjectRole] = useState<string>('subempreiteiro');
    const [selectedWorkerForExport, setSelectedWorkerForExport] = useState<Worker | null>(null);
    const [selectedEquipForExport, setSelectedEquipForExport] = useState<Equipment | null>(null);

    // CDE Modal State
    const [isCdeModalOpen, setIsCdeModalOpen] = useState(false);

    // Multi-select & Filters for Workers
    const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
    const [workerProjectFilter, setWorkerProjectFilter] = useState<string>('all');

    // Multi-select & Filters for Equipment
    const [selectedEquipIds, setSelectedEquipIds] = useState<string[]>([]);
    const [equipProjectFilter, setEquipProjectFilter] = useState<string>('all');

    // Only projects that the user personally owns or belongs to
    const userProjects = useMemo(() => {
        if (!currentUser) return [];
        return (projects || []).filter((p: Project) => {
            if (p.creatorId && p.creatorId === currentUser.id) return true;
            if (userAccount && p.accountId === userAccount.id) return true;
            return currentUser.projectAccess?.some(pa => pa.projectId === p.id);
        });
    }, [projects, currentUser, userAccount]);

    useEffect(() => {
        if (isExportModalOpen && !exportTargetProjectId && userProjects.length > 0) {
            setExportTargetProjectId(userProjects[0].id);
        }
    }, [isExportModalOpen, exportTargetProjectId, userProjects]);

    // Companies displayed in Organization tab listing
    const displayedCompanies = useMemo(() => {
        const base = masterCompany ? [{
            ...masterCompany,
            ...companyForm,
        }] : [{
            id: 'master_company',
            ...companyForm,
        }];
        if (!companySearchTerm.trim()) return base;
        const q = companySearchTerm.toLowerCase();
        return base.filter(c => (c.name || '').toLowerCase().includes(q) || (c.nif || '').toLowerCase().includes(q));
    }, [masterCompany, companyForm, companySearchTerm]);

    // Helper: Synced projects for company
    const syncedCompanyProjects = useMemo(() => {
        const masterId = masterCompany?.id;
        const masterNif = masterCompany?.nif || companyForm.nif;

        const matched = companies.filter(c => 
            c.projectId && (
                (masterId && c.corporateCompanyId === masterId) ||
                (masterNif && c.nif && c.nif === masterNif) ||
                (userAccount?.id && c.accountId === userAccount.id && c.projectId)
            )
        );

        const uniquePids = Array.from(new Set(matched.map(c => c.projectId!)));
        return uniquePids.map(pid => {
            const prj = projects.find(p => p.id === pid);
            const compInPrj = matched.find(c => c.projectId === pid);
            return {
                projectId: pid,
                projectName: prj?.name || `Obra ${pid}`,
                projectAddress: prj?.address,
                companyRole: compInPrj?.companyRole || 'subempreiteiro',
                status: compInPrj?.status || 'active',
                workflowStatus: compInPrj?.workflowStatus || 'validated'
            };
        });
    }, [companies, masterCompany?.id, masterCompany?.nif, companyForm.nif, userAccount?.id, projects]);

    // Helper: Synced projects for a worker
    const getWorkerSyncedProjects = (workerId: string, workerNif?: string) => {
        const matches = workers.filter(w => 
            w.projectId && (
                w.corporateWorkerId === workerId || 
                (workerNif && w.nif && w.nif === workerNif)
            )
        );
        return matches.map(w => {
            const prj = projects.find(p => p.id === w.projectId);
            return {
                projectId: w.projectId!,
                projectName: prj?.name || `Obra ${w.projectId}`,
                status: w.workflowStatus || w.status
            };
        });
    };

    // Helper: Synced projects for an equipment
    const getEquipmentSyncedProjects = (equipId: string, serialNumber?: string) => {
        const matches = equipment.filter(e => 
            e.projectId && (
                e.corporateEquipmentId === equipId || 
                (serialNumber && e.serialNumber && e.serialNumber === serialNumber)
            )
        );
        return matches.map(e => {
            const prj = projects.find(p => p.id === e.projectId);
            return {
                projectId: e.projectId!,
                projectName: prj?.name || `Obra ${e.projectId}`,
                status: e.workflowStatus || e.status
            };
        });
    };

    const handlePerformExport = (e: React.FormEvent) => {
        e.preventDefault();
        if (!exportTargetProjectId) {
            addNotification('error', 'Selecione uma obra de destino.');
            return;
        }

        let compId = masterCompany?.id || corporateEntityId;
        if (!masterCompany && compId) {
            addCompany({
                ...companyForm,
                id: compId,
                accountId: effectiveAccountId || 'default',
                status: companyForm.status,
                workflowStatus: 'validated',
                ifcActorRole: getIfcRoleFromCompanyRole(companyForm.companyRole || ''),
                createdAt: new Date().toISOString()
            } as any);
        }

        if (exportEntityType === 'company') {
            const imported = importCompanyToProject(compId, exportTargetProjectId, exportProjectRole);
            if (imported) {
                setIsExportModalOpen(false);
                addNotification('success', 'Empresa sincronizada com sucesso na obra!');
            }
        } else if (exportEntityType === 'worker') {
            const workersToSync = selectedWorkerIds.length > 0
                ? companyWorkers.filter(w => selectedWorkerIds.includes(w.id))
                : (selectedWorkerForExport ? [selectedWorkerForExport] : []);

            if (workersToSync.length === 0) return;

            let targetProjCompany = companies.find(c => c.projectId === exportTargetProjectId && (c.corporateCompanyId === compId || c.nif === companyForm.nif));
            if (!targetProjCompany) {
                targetProjCompany = importCompanyToProject(compId, exportTargetProjectId, exportProjectRole) || undefined;
            }
            if (targetProjCompany) {
                let successCount = 0;
                for (const w of workersToSync) {
                    const imported = importWorkerToProject(w.id, exportTargetProjectId, targetProjCompany.id);
                    if (imported) successCount++;
                }
                setIsExportModalOpen(false);
                setSelectedWorkerIds([]);
                setSelectedWorkerForExport(null);
                addNotification('success', `${successCount} colaborador(es) sincronizado(s) com sucesso na obra!`);
            }
        } else if (exportEntityType === 'equipment') {
            const equipsToSync = selectedEquipIds.length > 0
                ? companyEquipment.filter(e => selectedEquipIds.includes(e.id))
                : (selectedEquipForExport ? [selectedEquipForExport] : []);

            if (equipsToSync.length === 0) return;

            let targetProjCompany = companies.find(c => c.projectId === exportTargetProjectId && (c.corporateCompanyId === compId || c.nif === companyForm.nif));
            if (!targetProjCompany) {
                targetProjCompany = importCompanyToProject(compId, exportTargetProjectId, exportProjectRole) || undefined;
            }
            if (targetProjCompany) {
                let successCount = 0;
                for (const eq of equipsToSync) {
                    const imported = importEquipmentToProject(eq.id, exportTargetProjectId, targetProjCompany.id);
                    if (imported) successCount++;
                }
                setIsExportModalOpen(false);
                setSelectedEquipIds([]);
                setSelectedEquipForExport(null);
                addNotification('success', `${successCount} equipamento(s) sincronizado(s) com sucesso na obra!`);
            }
        }
    };

    // Filter Workers & Equipment strictly for this company account (never leak across accounts)
    const companyWorkers = useMemo(() => {
        if (!effectiveAccountId) return [];
        return workers.filter(w => {
            if (w.projectId) return false;
            if (w.accountId && w.accountId === effectiveAccountId) return true;
            if (corporateEntityId && w.companyId === corporateEntityId) return true;
            if (masterCompany && w.companyId === masterCompany.id) return true;
            return false;
        });
    }, [workers, effectiveAccountId, corporateEntityId, masterCompany]);

    const companyEquipment = useMemo(() => {
        if (!effectiveAccountId) return [];
        return equipment.filter(e => {
            if (e.projectId) return false;
            if (e.accountId && e.accountId === effectiveAccountId) return true;
            if (corporateEntityId && e.companyId === corporateEntityId) return true;
            if (masterCompany && e.companyId === masterCompany.id) return true;
            return false;
        });
    }, [equipment, effectiveAccountId, corporateEntityId, masterCompany]);

    // ════════ GESTÃO DOCUMENTAL & CDE CORPORATIVO ════════
    const [companyCdeConfig, setCompanyCdeConfig] = useState<any>(null);
    const [isLoadingCdeConfig, setIsLoadingCdeConfig] = useState(false);

    // Live CDE Explorer State (fetches actual folders & files from SharePoint / Cloud CDE)
    const [cdeCurrentPath, setCdeCurrentPath] = useState<Array<{ id: string; name: string }>>([]);
    const [cdeDriveItems, setCdeDriveItems] = useState<any[]>([]);
    const [cdeTreeData, setCdeTreeData] = useState<Record<string, any[]>>({});
    const [cdeExpandedFolders, setCdeExpandedFolders] = useState<Set<string>>(new Set(['root']));
    const [isLoadingCdeItems, setIsLoadingCdeItems] = useState(false);
    const [cdeLoadError, setCdeLoadError] = useState<string>('');
    const prevCdeFolderKeyRef = useRef<string>('');

    const fetchCompanyCde = async () => {
        if (!corporateEntityId || corporateEntityId === 'comp_master') {
            setCompanyCdeConfig(null);
            return null;
        }
        setIsLoadingCdeConfig(true);
        try {
            const res = await fetch(`/api/projects/${corporateEntityId}/cde`);
            if (res.ok) {
                const data = await res.json();
                const cfg = data.cdeConfig || null;
                if (cfg && (cfg.connected || cfg.provider)) {
                    cfg.projectId = corporateEntityId;
                    cfg.companyId = corporateEntityId;
                    setCompanyCdeConfig(cfg);
                    return cfg;
                }
            }
            setCompanyCdeConfig(null);
            return null;
        } catch (e) {
            console.error('Failed to fetch corporate CDE config:', e);
            setCompanyCdeConfig(null);
            return null;
        } finally {
            setIsLoadingCdeConfig(false);
        }
    };

    useEffect(() => {
        setCompanyCdeConfig(null);
        setCdeCurrentPath([]);
        setCdeDriveItems([]);
        setCdeTreeData({});
        setCdeLoadError('');
        fetchCompanyCde();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [corporateEntityId]);

    // Fetch live folder content from the server-side CDE action endpoint
    const fetchCompanyCdeContent = async (cfg: any, folderId: string): Promise<any[]> => {
        if (!corporateEntityId || !cfg?.connected) return [];
        const serverFolderId = (!folderId || folderId === 'root' || folderId === cfg?.folderId) ? 'root' : folderId;

        const res = await fetch(`/api/projects/${corporateEntityId}/cde/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'list',
                payload: { folderId: serverFolderId }
            })
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new Error(data?.error || 'Falha ao carregar pastas do CDE.');
        }

        const srvBaseId = data.result?.baseFolderId;
        if (serverFolderId === 'root' && srvBaseId && srvBaseId !== 'root' && srvBaseId !== cfg?.folderId) {
            fetchCompanyCde();
        }

        return data.result?.files || [];
    };

    // Reset navigation & tree cache when the linked CDE folder changes
    useEffect(() => {
        const key = `${companyCdeConfig?.provider || ''}:${companyCdeConfig?.siteUrl || ''}:${companyCdeConfig?.folderId || ''}:${companyCdeConfig?.folderPath || ''}`;
        if (key !== prevCdeFolderKeyRef.current) {
            prevCdeFolderKeyRef.current = key;
            setCdeCurrentPath([]);
            setCdeTreeData({});
            setCdeDriveItems([]);
        }
    }, [companyCdeConfig?.provider, companyCdeConfig?.siteUrl, companyCdeConfig?.folderId, companyCdeConfig?.folderPath]);

    // Load live CDE content when connected or navigating
    const loadCompanyCdeView = async (overrideTargetId?: string, refreshRootAlso: boolean = false) => {
        if (!companyCdeConfig?.connected) {
            setCdeDriveItems([]);
            setCdeTreeData({});
            return;
        }
        setIsLoadingCdeItems(true);
        setCdeLoadError('');
        try {
            const targetId = overrideTargetId !== undefined
                ? overrideTargetId
                : (cdeCurrentPath.length > 0 ? cdeCurrentPath[cdeCurrentPath.length - 1].id : 'root');
            const items = await fetchCompanyCdeContent(companyCdeConfig, targetId);
            setCdeDriveItems(items);

            const isRoot = !targetId || targetId === 'root' || targetId === companyCdeConfig.folderId;
            if (isRoot) {
                setCdeTreeData(prev => ({
                    ...prev,
                    root: items,
                    ...(companyCdeConfig.folderId ? { [companyCdeConfig.folderId]: items } : {})
                }));
            } else {
                setCdeTreeData(prev => ({ ...prev, [targetId]: items }));
                if (refreshRootAlso || !cdeTreeData['root']) {
                    const rootItems = await fetchCompanyCdeContent(companyCdeConfig, 'root');
                    setCdeTreeData(prev => ({
                        ...prev,
                        [targetId]: items,
                        root: rootItems,
                        ...(companyCdeConfig.folderId ? { [companyCdeConfig.folderId]: rootItems } : {})
                    }));
                }
            }

            setCdeExpandedFolders(prev => {
                const next = new Set(prev);
                next.add('root');
                if (companyCdeConfig.folderId) next.add(companyCdeConfig.folderId);
                cdeCurrentPath.forEach(p => next.add(p.id));
                return next;
            });
        } catch (err: any) {
            console.error('[Corporate CDE] Load error:', err);
            setCdeLoadError(err?.message || 'Erro ao comunicar com o CDE.');
        } finally {
            setIsLoadingCdeItems(false);
        }
    };

    useEffect(() => {
        if (companyCdeConfig?.connected) {
            loadCompanyCdeView();
        } else {
            setCdeDriveItems([]);
            setCdeTreeData({});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        companyCdeConfig?.connected,
        companyCdeConfig?.folderId,
        companyCdeConfig?.folderPath,
        companyCdeConfig?.lastSync,
        cdeCurrentPath
    ]);

    const toggleCdeTreeFolderExpand = async (folderId: string) => {
        const next = new Set(cdeExpandedFolders);
        if (next.has(folderId)) {
            next.delete(folderId);
            setCdeExpandedFolders(next);
        } else {
            next.add(folderId);
            setCdeExpandedFolders(next);
            if (!cdeTreeData[folderId] && companyCdeConfig?.connected) {
                try {
                    const items = await fetchCompanyCdeContent(companyCdeConfig, folderId);
                    setCdeTreeData(prev => ({ ...prev, [folderId]: items }));
                } catch (e) {
                    console.warn('Failed to expand folder in tree:', e);
                }
            }
        }
    };

    // Folders & Document Navigation State
    const [selectedFolderPath, setSelectedFolderPath] = useState<string>('01-Empresa');
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set([
        '01-Empresa', 
        '02-Trabalhadores', 
        '03-Equipamentos', 
        '04-Formação e Qualificações', 
        '05-Segurança e Saúde (SST)',
        '06-Modelos e Minutas'
    ]));
    const [customFolders, setCustomFolders] = useState<string[]>([]);
    const [folderSearchTerm, setFolderSearchTerm] = useState('');

    const toggleFolderExpand = (folderPath: string) => {
        setExpandedFolders(prev => {
            const next = new Set(prev);
            if (next.has(folderPath)) next.delete(folderPath);
            else next.add(folderPath);
            return next;
        });
    };

    // Document Filters & Search
    const [docSearchTerm, setDocSearchTerm] = useState('');
    const [docStatusFilter, setDocStatusFilter] = useState<'all' | 'valid' | 'expiring' | 'expired' | 'permanent' | 'archived'>('all');

    // CDE Document Explorer Menu & Search States
    const [isCdeNewMenuOpen, setIsCdeNewMenuOpen] = useState(false);
    const [cdeDocSearch, setCdeDocSearchTerm] = useState('');

    // Folder Initialization State & Result Modal
    const [isInitializingFolders, setIsInitializingFolders] = useState(false);
    const [initResultLogs, setInitResultLogs] = useState<string[]>([]);
    const [isInitResultModalOpen, setIsInitResultModalOpen] = useState(false);

    // New Folder Modal State
    const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [newFolderParent, setNewFolderParent] = useState('root');

    // Upload / Place Document State
    const [isUploadDocModalOpen, setIsUploadDocModalOpen] = useState(false);
    const [isUploadingDoc, setIsUploadingDoc] = useState(false);
    const [uploadDocFile, setUploadDocFile] = useState<File | null>(null);
    const [uploadDocForm, setUploadDocForm] = useState({
        name: '',
        entityType: 'company' as 'company' | 'worker' | 'equipment',
        entityId: corporateEntityId,
        category: 'insurance_work_accident',
        folderPath: '01-Empresa/02-Seguros',
        issueDate: '',
        expiryDate: '',
        hasNoExpiry: false,
        documentCode: '',
        isConfidential: false
    });

    const COMPANY_DOC_CATEGORIES = [
        { value: 'insurance_work_accident', label: 'Seguro de Acidentes de Trabalho (Apólice e Recibo)', folder: '01-Empresa/02-Seguros' },
        { value: 'insurance_civil_liability', label: 'Seguro de Responsabilidade Civil', folder: '01-Empresa/02-Seguros' },
        { value: 'certidao_comercial', label: 'Certidão Comercial / Permanente', folder: '01-Empresa/01-Certidão Comercial' },
        { value: 'non_debt_tax', label: 'Certidão Não Dívida AT (Finanças)', folder: '01-Empresa/03-Certidões Não Dívida (AT e SS)' },
        { value: 'non_debt_ss', label: 'Certidão Não Dívida Segurança Social', folder: '01-Empresa/03-Certidões Não Dívida (AT e SS)' },
        { value: 'alvara_impic', label: 'Alvará ou Título de Registo IMPIC', folder: '01-Empresa/04-Alvará e Título Registo' },
        { value: 'medicina_trabalho', label: 'Relatório / Contrato Medicina no Trabalho', folder: '01-Empresa/05-Medicina no Trabalho' },
        { value: 'folhas_remuneracao', label: 'Declaração Remunerações / DRI', folder: '01-Empresa/06-Folhas de Remunerações' },
        { value: 'outros_empresa', label: 'Outro Documento Geral da Empresa', folder: '01-Empresa' },
    ];

    const WORKER_DOC_CATEGORIES = [
        { value: 'medical_fitness', label: 'Ficha de Aptidão Médica (FAT)' },
        { value: 'training_cert', label: 'Certificado de Formação / Qualificação' },
        { value: 'identification', label: 'Documento Identificação (CC / Passaporte)' },
        { value: 'work_contract', label: 'Contrato de Trabalho / Vínculo' },
        { value: 'ppe_receipt', label: 'Ficha de Entrega de EPI Assinada' },
        { value: 'outros_trabalhador', label: 'Outro Documento do Colaborador' },
    ];

    const EQUIP_DOC_CATEGORIES = [
        { value: 'ce_declaration', label: 'Declaração de Conformidade CE' },
        { value: 'inspection', label: 'Relatório de Inspeção Periódica / Termo Verificação' },
        { value: 'instruction_manual', label: 'Manual de Instruções e Segurança' },
        { value: 'maintenance', label: 'Ficha de Manutenção Preventiva/Corretiva' },
        { value: 'equipment_insurance', label: 'Seguro de Máquinas / Equipamentos' },
        { value: 'outros_equipamento', label: 'Outro Documento do Equipamento' },
    ];

    const companyWorkerIds = useMemo(() => companyWorkers.map(w => w.id), [companyWorkers]);
    const companyEquipmentIds = useMemo(() => companyEquipment.map(e => e.id), [companyEquipment]);
    const corporateCompanyId = corporateEntityId;

    // Filter documents strictly belonging to this corporate company, its workers, and its equipment
    const corporateDocuments = useMemo(() => {
        if (!effectiveAccountId && !corporateCompanyId) return [];
        return documents.filter(doc => {
            const belongsToAccount = Boolean(effectiveAccountId && doc.accountId === effectiveAccountId);
            const isOurCompany = doc.entityType === 'company' && Boolean(corporateCompanyId && doc.entityId === corporateCompanyId);
            const isOurWorker = doc.entityType === 'worker' && companyWorkerIds.includes(doc.entityId);
            const isOurEquipment = doc.entityType === 'equipment' && companyEquipmentIds.includes(doc.entityId);

            return belongsToAccount || isOurCompany || isOurWorker || isOurEquipment;
        });
    }, [documents, effectiveAccountId, corporateCompanyId, companyWorkerIds, companyEquipmentIds]);

    // Document compliance status calculation
    const getDocumentStatusInfo = (doc: Document) => {
        if (doc.archived) {
            return {
                status: 'archived' as const,
                label: 'Arquivado',
                badgeClass: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700',
                daysRemaining: null
            };
        }
        if (!doc.expiryDate) {
            return {
                status: 'permanent' as const,
                label: 'Permanente',
                badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
                daysRemaining: null
            };
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const exp = new Date(doc.expiryDate);
        exp.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return {
                status: 'expired' as const,
                label: `Expirado (${Math.abs(diffDays)}d)`,
                badgeClass: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200 dark:border-red-800',
                daysRemaining: diffDays
            };
        }
        if (diffDays <= 30) {
            return {
                status: 'expiring' as const,
                label: `Expira em ${diffDays}d`,
                badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
                daysRemaining: diffDays
            };
        }
        return {
            status: 'valid' as const,
            label: `Válido (${diffDays}d)`,
            badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
            daysRemaining: diffDays
        };
    };

    // KPI Metrics calculation
    const docKpiStats = useMemo(() => {
        let total = 0;
        let valid = 0;
        let expiring = 0;
        let expired = 0;
        let permanent = 0;
        let archived = 0;

        corporateDocuments.forEach(doc => {
            if (doc.archived) {
                archived++;
                return;
            }
            total++;
            const status = getDocumentStatusInfo(doc).status;
            if (status === 'valid') valid++;
            else if (status === 'expiring') expiring++;
            else if (status === 'expired') expired++;
            else if (status === 'permanent') permanent++;
        });

        return { total, valid, expiring, expired, permanent, archived };
    }, [corporateDocuments]);

    // Build complete folder hierarchy for the corporate space
    const allCompanyFolders = useMemo(() => {
        const folders: { path: string; name: string; parent: string | null }[] = [];

        // Standard Top Level Folders
        COMPANY_STANDARD_FOLDERS.forEach(top => {
            folders.push({ path: top, name: top, parent: null });

            // Special Subfolders
            if (COMPANY_SPECIAL_SUBFOLDERS[top]) {
                COMPANY_SPECIAL_SUBFOLDERS[top].forEach(sub => {
                    folders.push({ path: `${top}/${sub}`, name: sub, parent: top });
                });
            }
        });

        // Individual Worker Folders
        companyWorkers.forEach(w => {
            const idTag = w.idCardNumber || w.nif || w.id.slice(0, 8);
            const folderName = `${idTag}-${w.name.trim()}`;
            const fullPath = `02-Trabalhadores/${folderName}`;
            folders.push({ path: fullPath, name: folderName, parent: '02-Trabalhadores' });
            folders.push({ path: `${fullPath}/Arquivo`, name: 'Arquivo', parent: fullPath });
        });

        // Individual Equipment Folders
        companyEquipment.forEach(eq => {
            const idTag = (eq as any).licensePlate || eq.serialNumber || eq.id.slice(0, 8);
            const folderName = `${idTag}-${eq.name.trim()}`;
            const fullPath = `03-Equipamentos/${folderName}`;
            folders.push({ path: fullPath, name: folderName, parent: '03-Equipamentos' });
            folders.push({ path: `${fullPath}/Arquivo`, name: 'Arquivo', parent: fullPath });
        });

        // Custom Folders added by user
        customFolders.forEach(cf => {
            const parts = cf.split('/');
            const name = parts[parts.length - 1];
            const parent = parts.length > 1 ? parts.slice(0, -1).join('/') : null;
            if (!folders.some(f => f.path === cf)) {
                folders.push({ path: cf, name, parent });
            }
        });

        return folders;
    }, [companyWorkers, companyEquipment, customFolders]);

    // Filter documents by selected folder, status, and search query
    const filteredDocuments = useMemo(() => {
        return corporateDocuments.filter(doc => {
            // Status filter
            const info = getDocumentStatusInfo(doc);
            if (docStatusFilter === 'archived') {
                if (!doc.archived) return false;
            } else {
                if (doc.archived) return false;
                if (docStatusFilter !== 'all' && info.status !== docStatusFilter) return false;
            }

            // Folder path filter
            if (selectedFolderPath && selectedFolderPath !== 'all') {
                const docFolder = doc.folderPath || '';
                const matchesFolder = docFolder === selectedFolderPath || docFolder.startsWith(`${selectedFolderPath}/`);
                if (!matchesFolder) return false;
            }

            // Search filter
            if (docSearchTerm.trim()) {
                const q = docSearchTerm.toLowerCase();
                const matchesName = (doc.name || '').toLowerCase().includes(q);
                const matchesCode = (doc.documentCode || '').toLowerCase().includes(q);
                const matchesCat = (doc.category || '').toLowerCase().includes(q);
                if (!matchesName && !matchesCode && !matchesCat) return false;
            }

            return true;
        });
    }, [corporateDocuments, docStatusFilter, selectedFolderPath, docSearchTerm]);

    // Document counts per folder for tree badges
    const folderDocCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        corporateDocuments.forEach(doc => {
            if (doc.archived) return;
            const fp = doc.folderPath || '01-Empresa';
            counts[fp] = (counts[fp] || 0) + 1;
            // Also count in parent folder
            const parts = fp.split('/');
            if (parts.length > 1) {
                const top = parts[0];
                counts[top] = (counts[top] || 0) + 1;
            }
        });
        return counts;
    }, [corporateDocuments]);

    // Auto-update folder path when entity or category changes in modal
    const handleUploadEntityTypeChange = (type: 'company' | 'worker' | 'equipment') => {
        let defaultId = '';
        let defaultFolder = '01-Empresa/02-Seguros';
        let defaultCat = 'insurance_work_accident';

        if (type === 'company') {
            defaultId = corporateEntityId;
            defaultFolder = '01-Empresa/02-Seguros';
            defaultCat = 'insurance_work_accident';
        } else if (type === 'worker') {
            defaultId = companyWorkers[0]?.id || '';
            const w = companyWorkers[0];
            const idTag = w ? (w.idCardNumber || w.nif || w.id.slice(0, 8)) : '';
            defaultFolder = w ? `02-Trabalhadores/${idTag}-${w.name.trim()}` : '02-Trabalhadores';
            defaultCat = 'medical_fitness';
        } else if (type === 'equipment') {
            defaultId = companyEquipment[0]?.id || '';
            const eq = companyEquipment[0];
            const idTag = eq ? ((eq as any).licensePlate || eq.serialNumber || eq.id.slice(0, 8)) : '';
            defaultFolder = eq ? `03-Equipamentos/${idTag}-${eq.name.trim()}` : '03-Equipamentos';
            defaultCat = 'ce_declaration';
        }

        setUploadDocForm(prev => ({
            ...prev,
            entityType: type,
            entityId: defaultId,
            category: defaultCat,
            folderPath: defaultFolder
        }));
    };

    const handleUploadWorkerChange = (workerId: string) => {
        const w = companyWorkers.find(x => x.id === workerId);
        if (w) {
            const idTag = w.idCardNumber || w.nif || w.id.slice(0, 8);
            const folder = `02-Trabalhadores/${idTag}-${w.name.trim()}`;
            setUploadDocForm(prev => ({ ...prev, entityId: workerId, folderPath: folder }));
        } else {
            setUploadDocForm(prev => ({ ...prev, entityId: workerId }));
        }
    };

    const handleUploadEquipChange = (equipId: string) => {
        const eq = companyEquipment.find(x => x.id === equipId);
        if (eq) {
            const idTag = (eq as any).licensePlate || eq.serialNumber || eq.id.slice(0, 8);
            const folder = `03-Equipamentos/${idTag}-${eq.name.trim()}`;
            setUploadDocForm(prev => ({ ...prev, entityId: equipId, folderPath: folder }));
        } else {
            setUploadDocForm(prev => ({ ...prev, entityId: equipId }));
        }
    };

    const handleUploadCategoryChange = (category: string) => {
        let suggestedFolder = uploadDocForm.folderPath;
        if (uploadDocForm.entityType === 'company') {
            if (category === 'certidao_comercial') suggestedFolder = '01-Empresa/01-Certidão Comercial';
            else if (category === 'insurance_work_accident' || category === 'insurance_civil_liability') suggestedFolder = '01-Empresa/02-Seguros';
            else if (category === 'non_debt_tax' || category === 'non_debt_ss') suggestedFolder = '01-Empresa/03-Certidões Não Dívida (AT e SS)';
            else if (category === 'alvara_impic') suggestedFolder = '01-Empresa/04-Alvará e Título Registo';
            else if (category === 'medicina_trabalho') suggestedFolder = '01-Empresa/05-Medicina no Trabalho';
            else if (category === 'folhas_remuneracao') suggestedFolder = '01-Empresa/06-Folhas de Remunerações';
            else suggestedFolder = '01-Empresa';
        }
        setUploadDocForm(prev => ({ ...prev, category, folderPath: suggestedFolder }));
    };

    // Create Company Standard Folder Structure
    const handleInitializeCompanyFolders = async () => {
        let activeCfg = companyCdeConfig;
        if (!activeCfg?.connected) {
            activeCfg = await fetchCompanyCde();
        }

        if (!activeCfg?.connected) {
            alert('O CDE não está conectado. Configure primeiro a ligação ao SharePoint/Cloud no botão "CDE" para criar a estrutura de pastas tipo.');
            setIsCdeModalOpen(true);
            return;
        }

        const targetFolderName = activeCfg.folderPath || (activeCfg.provider === 'onedrive' ? 'SharePoint (Raiz)' : 'CDE');
        const hasExisting = cdeDriveItems.length > 0 ||
            (cdeTreeData['root'] && cdeTreeData['root'].length > 0) ||
            (activeCfg.folderId && cdeTreeData[activeCfg.folderId] && cdeTreeData[activeCfg.folderId].length > 0);

        const confirmMsg = hasExisting
            ? `As pastas tipo já parecem existir ou já foram criadas pastas na pasta:\n"${targetFolderName}"\n\nDeseja verificar e criar novamente a estrutura de pastas tipo?\n\n(Garantia de Segurança: Os seus ficheiros e pastas já existentes NÃO serão apagados nem alterados.)`
            : `Deseja verificar e criar a estrutura normalizada de pastas tipo na pasta:\n"${targetFolderName}"?\n\n(Garantia de Segurança: Os seus ficheiros e pastas já existentes NÃO serão apagados nem alterados.)`;

        if (!window.confirm(confirmMsg)) {
            return;
        }

        setIsInitializingFolders(true);
        try {
            const compId = corporateEntityId;
            const config = {
                ...activeCfg,
                projectId: compId,
                companyId: compId,
                connected: true,
                provider: activeCfg.provider,
                folderPath: activeCfg.folderPath || ''
            };

            const companyInfo = {
                name: companyForm.name || 'Empresa',
                nif: companyForm.nif
            };

            const logs = await initializeCompanyStructure(
                config,
                companyInfo,
                companyWorkers.map(w => ({ id: w.id, name: w.name, nif: w.nif, idNumber: w.idCardNumber })),
                companyEquipment.map(e => ({ id: e.id, name: e.name, licensePlate: (e as any).licensePlate, serialNumber: e.serialNumber })),
                () => {}
            );
            setInitResultLogs(logs);
            setIsInitResultModalOpen(true);
            addNotification('success', 'Estrutura documental normalizada da empresa verificada no CDE com sucesso!');

            // Refresh live CDE folder contents so newly created folders appear immediately
            await loadCompanyCdeView(undefined, true);
        } catch (err: any) {
            console.error('Erro ao inicializar pastas da empresa:', err);
            addNotification('error', `Falha ao criar pastas: ${err.message || 'Erro desconhecido'}`);
            alert(`Erro ao criar pastas tipo: ${err.message || 'Erro desconhecido'}`);
        } finally {
            setIsInitializingFolders(false);
        }
    };

    // Upload / Place Document Handler
    const handleUploadDocumentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!uploadDocFile && !uploadDocForm.name) {
            addNotification('error', 'Por favor selecione um ficheiro ou indique o nome do documento.');
            return;
        }

        setIsUploadingDoc(true);
        try {
            const finalDocName = uploadDocForm.name.trim() || (uploadDocFile ? uploadDocFile.name : 'Documento');
            let cdeFileId: string | undefined;
            let cdeUrl: string | undefined;

            // Upload to Cloud CDE if connected and file is selected
            if (uploadDocFile && companyCdeConfig?.connected) {
                try {
                    const targetCdeFolder = cdeCurrentPath.length > 0 ? cdeCurrentPath[cdeCurrentPath.length - 1].id : 'root';
                    const uploadRes = await uploadToCDEFolder(
                        { ...companyCdeConfig, projectId: corporateEntityId, companyId: corporateEntityId },
                        companyCdeConfig.provider === 'onedrive' ? targetCdeFolder : uploadDocForm.folderPath,
                        uploadDocFile
                    );
                    cdeFileId = uploadRes.id;
                    cdeUrl = uploadRes.webViewLink;
                } catch (uploadErr: any) {
                    console.warn('Aviso: Falha ao enviar para o CDE Cloud, armazenando localmente:', uploadErr);
                    addNotification('warning', `Upload Cloud pendente: ${uploadErr.message}. O documento foi registado localmente.`);
                }
            }

            const entityId = uploadDocForm.entityType === 'company' 
                ? corporateEntityId
                : uploadDocForm.entityId;

            if (!entityId) {
                addNotification('error', 'Entidade de destino não selecionada.');
                setIsUploadingDoc(false);
                return;
            }

            // Add Document in Store
            addDocument({
                name: finalDocName,
                size: uploadDocFile ? uploadDocFile.size : 0,
                type: uploadDocFile ? uploadDocFile.type : 'application/pdf',
                url: cdeUrl,
                cdeFileId: cdeFileId,
                entityId: entityId,
                entityType: uploadDocForm.entityType,
                documentCode: uploadDocForm.documentCode.trim() || undefined,
                folderPath: uploadDocForm.folderPath,
                issueDate: uploadDocForm.issueDate || undefined,
                expiryDate: uploadDocForm.hasNoExpiry ? undefined : (uploadDocForm.expiryDate || undefined),
                isConfidential: uploadDocForm.isConfidential,
                category: uploadDocForm.category,
                provider: companyCdeConfig?.connected ? (companyCdeConfig.provider || 'local') : 'local',
                status: cdeFileId ? 'synced' : 'pending',
                approvalStatus: 'published',
                accountId: effectiveAccountId || 'default'
            } as any);

            // Synchronize with Entity Profile dates
            const expiry = uploadDocForm.hasNoExpiry ? undefined : uploadDocForm.expiryDate;
            const code = uploadDocForm.documentCode.trim();

            if (uploadDocForm.entityType === 'company') {
                const compUpdates: Partial<Company> = {};
                if (uploadDocForm.category === 'insurance_work_accident') {
                    if (expiry) compUpdates.insuranceWorkAccDate = expiry;
                    if (code) compUpdates.insuranceWorkAccPolicy = code;
                    setCompanyForm(prev => ({
                        ...prev,
                        insuranceWorkAccDate: expiry || prev.insuranceWorkAccDate,
                        insuranceWorkAccPolicy: code || prev.insuranceWorkAccPolicy
                    }));
                } else if (uploadDocForm.category === 'insurance_civil_liability') {
                    if (expiry) compUpdates.insuranceCivilDate = expiry;
                    if (code) compUpdates.insuranceCivilPolicy = code;
                    setCompanyForm(prev => ({
                        ...prev,
                        insuranceCivilDate: expiry || prev.insuranceCivilDate,
                        insuranceCivilPolicy: code || prev.insuranceCivilPolicy
                    }));
                } else if (uploadDocForm.category === 'non_debt_tax') {
                    if (expiry) compUpdates.cleanFinDate = expiry;
                    setCompanyForm(prev => ({ ...prev, cleanFinDate: expiry || prev.cleanFinDate }));
                } else if (uploadDocForm.category === 'non_debt_ss') {
                    if (expiry) compUpdates.cleanSSDate = expiry;
                    setCompanyForm(prev => ({ ...prev, cleanSSDate: expiry || prev.cleanSSDate }));
                } else if (uploadDocForm.category === 'alvara_impic') {
                    if (code) compUpdates.impic = code;
                    setCompanyForm(prev => ({ ...prev, impic: code || prev.impic }));
                }

                if (masterCompany?.id && Object.keys(compUpdates).length > 0) {
                    updateCompany(masterCompany.id, compUpdates);
                }
            } else if (uploadDocForm.entityType === 'worker') {
                const wId = uploadDocForm.entityId;
                const workerUpdates: Partial<Worker> = {};
                if (uploadDocForm.category === 'medical_fitness') {
                    if (expiry) workerUpdates.medicalExpiry = expiry;
                    workerUpdates.medicalFitness = 'apto';
                } else if (uploadDocForm.category === 'work_contract') {
                    if (expiry) workerUpdates.contractExpiry = expiry;
                } else if (uploadDocForm.category === 'identification') {
                    if (expiry) workerUpdates.idCardExpiry = expiry;
                } else if (uploadDocForm.category === 'ppe_receipt') {
                    if (uploadDocForm.issueDate) workerUpdates.epiDate = uploadDocForm.issueDate;
                }

                if (Object.keys(workerUpdates).length > 0) {
                    updateWorker(wId, workerUpdates);
                }
            } else if (uploadDocForm.entityType === 'equipment') {
                const eqId = uploadDocForm.entityId;
                const eqUpdates: Partial<Equipment> = {};
                if (uploadDocForm.category === 'ce_declaration') {
                    eqUpdates.ceMarking = true;
                } else if (uploadDocForm.category === 'inspection') {
                    if (expiry) eqUpdates.inspectionDueDate = expiry;
                }

                if (Object.keys(eqUpdates).length > 0) {
                    updateEquipment(eqId, eqUpdates);
                }
            }

            addNotification('success', `Documento "${finalDocName}" adicionado com sucesso e perfil atualizado!`);
            setIsUploadDocModalOpen(false);
            setUploadDocFile(null);
            setUploadDocForm(prev => ({
                ...prev,
                name: '',
                documentCode: '',
                issueDate: '',
                expiryDate: '',
                hasNoExpiry: false
            }));

            if (companyCdeConfig?.connected) {
                await loadCompanyCdeView();
            }
        } catch (err: any) {
            console.error('Erro ao colocar documento:', err);
            addNotification('error', `Falha ao registar documento: ${err.message || 'Erro inesperado'}`);
        } finally {
            setIsUploadingDoc(false);
        }
    };

    // Create New Custom Subfolder
    const handleCreateNewFolder = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanName = newFolderName.trim();
        if (!cleanName) return;

        if (!companyCdeConfig?.connected) {
            alert('O CDE não está conectado. Configure primeiro a ligação ao CDE.');
            setIsNewFolderModalOpen(false);
            setIsCdeModalOpen(true);
            return;
        }

        setIsNewFolderModalOpen(false);
        setNewFolderName('');
        setIsLoadingCdeItems(true);

        try {
            const parentFolderId = cdeCurrentPath.length > 0 ? cdeCurrentPath[cdeCurrentPath.length - 1].id : 'root';
            const effectiveConfig = {
                ...companyCdeConfig,
                projectId: corporateEntityId,
                companyId: corporateEntityId
            };
            await createOneDriveFolder(effectiveConfig, parentFolderId, cleanName);
            addNotification('success', `Pasta "${cleanName}" criada com sucesso no CDE!`);
            await loadCompanyCdeView(parentFolderId, true);
        } catch (err: any) {
            console.error('Erro ao criar pasta no CDE:', err);
            addNotification('error', `Falha ao criar pasta no CDE: ${err.message}`);
            alert(`Erro ao criar pasta: ${err.message}`);
        } finally {
            setIsLoadingCdeItems(false);
        }
    };

    // Search & Filter
    const [searchTerm, setSearchTerm] = useState('');

    const filteredWorkers = useMemo(() => {
        return companyWorkers.filter(w => {
            const q = searchTerm.toLowerCase();
            const matchesSearch = !searchTerm.trim() || 
                (w.name || '').toLowerCase().includes(q) || 
                (w.email && w.email.toLowerCase().includes(q)) ||
                (w.nif && w.nif.includes(searchTerm));
            if (!matchesSearch) return false;

            if (workerProjectFilter === 'all') return true;
            const synced = getWorkerSyncedProjects(w.id, w.nif);
            if (workerProjectFilter === 'unsynced') {
                return synced.length === 0;
            }
            return synced.some(p => p.projectId === workerProjectFilter);
        });
    }, [companyWorkers, searchTerm, workerProjectFilter, workers, projects]);

    const filteredEquipment = useMemo(() => {
        return companyEquipment.filter(eq => {
            const q = searchTerm.toLowerCase();
            const matchesSearch = !searchTerm.trim() ||
                (eq.name || '').toLowerCase().includes(q) ||
                (eq.serialNumber && eq.serialNumber.toLowerCase().includes(q)) ||
                (eq.brand && eq.brand.toLowerCase().includes(q));
            if (!matchesSearch) return false;

            if (equipProjectFilter === 'all') return true;
            const synced = getEquipmentSyncedProjects(eq.id, eq.serialNumber);
            if (equipProjectFilter === 'unsynced') {
                return synced.length === 0;
            }
            return synced.some(p => p.projectId === equipProjectFilter);
        });
    }, [companyEquipment, searchTerm, equipProjectFilter, equipment, projects]);

    const toggleSelectWorker = (id: string) => {
        setSelectedWorkerIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const toggleSelectAllWorkers = () => {
        if (selectedWorkerIds.length === filteredWorkers.length && filteredWorkers.length > 0) {
            setSelectedWorkerIds([]);
        } else {
            setSelectedWorkerIds(filteredWorkers.map(w => w.id));
        }
    };

    const toggleSelectEquip = (id: string) => {
        setSelectedEquipIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const toggleSelectAllEquip = () => {
        if (selectedEquipIds.length === filteredEquipment.length && filteredEquipment.length > 0) {
            setSelectedEquipIds([]);
        } else {
            setSelectedEquipIds(filteredEquipment.map(e => e.id));
        }
    };

    const tRoles = useTranslations('workerRoles');

    // Default & State for Worker (IFC Standard ISO 16739 + DL 273/2003)
    const defaultWorkerForm = {
        firstName: '',
        middleName: '',
        lastName: '',
        name: '',
        nationalityType: 'portugal' as 'portugal' | 'eu_etc' | 'other',
        foreignCountry: '',
        nif: '',
        idCardType: 'cc',
        idCardTypeCustom: '',
        idCardNumber: '',
        idCardExpiry: '',
        ssn: '',
        birthDate: '',
        gender: 'M',
        email: '',
        phone: '',
        address: '',
        postalCode: '',
        city: '',
        emergencyContactName: '',
        emergencyContactPhone: '',

        workerRoleId: '',
        roleCustom: '',
        role: '',
        occupation: '',
        ifcLaborType: '',

        contractType: 'sem_termo',
        professionCategory: 'oficial',
        contractExpiry: '',
        workSchedule: 'normal',

        medicalFitness: 'apto',
        medicalExpiry: '',
        medicalObservations: '',
        epiDeliveryList: ['Capacete', 'Colete Refletor', 'Botins de Proteção', 'Luvas de Proteção'],
        epiDate: '',
    };

    // Modal state for Worker (Dual mode: view vs edit)
    const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
    const [workerModalMode, setWorkerModalMode] = useState<'view' | 'edit'>('view');
    const [workerModalTab, setWorkerModalTab] = useState<'identification' | 'labor' | 'safety' | 'documents'>('identification');
    const [editingWorkerId, setEditingWorkerId] = useState<string | null>(null);
    const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
    const [workerForm, setWorkerForm] = useState(defaultWorkerForm);

    const handleOpenViewWorker = (w: Worker) => {
        setSelectedWorker(w);
        setEditingWorkerId(w.id);

        const parts = (w.name || '').trim().split(/\s+/);
        const first = w.firstName || (parts.length > 0 ? parts[0] : '');
        const last = w.lastName || (parts.length > 1 ? parts[parts.length - 1] : '');
        const mid = w.middleName || (parts.length > 2 ? parts.slice(1, -1).join(' ') : '');

        setWorkerForm({
            firstName: first,
            middleName: mid,
            lastName: last,
            name: w.name || '',
            nationalityType: (w.nationalityType as any) || (w.isForeign ? 'other' : 'portugal'),
            foreignCountry: w.foreignCountry || '',
            nif: w.nif || '',
            idCardType: w.idCardType || 'cc',
            idCardTypeCustom: w.idCardTypeCustom || '',
            idCardNumber: w.idCardNumber || '',
            idCardExpiry: w.idCardExpiry || '',
            ssn: w.ssn || '',
            birthDate: w.birthDate || '',
            gender: w.gender || 'M',
            email: w.email || '',
            phone: w.phone || '',
            address: w.address || '',
            postalCode: w.postalCode || '',
            city: w.city || '',
            emergencyContactName: w.emergencyContactName || w.emergencyContact || '',
            emergencyContactPhone: w.emergencyContactPhone || '',

            workerRoleId: w.workerRoleId || '',
            roleCustom: w.roleCustom || '',
            role: w.role || '',
            occupation: w.occupation || '',
            ifcLaborType: w.ifcLaborType || '',

            contractType: w.contractType || 'sem_termo',
            professionCategory: w.professionCategory || 'oficial',
            contractExpiry: w.contractExpiry || '',
            workSchedule: w.workSchedule || 'normal',

            medicalFitness: w.medicalFitness || 'apto',
            medicalExpiry: w.medicalExpiry || '',
            medicalObservations: w.medicalObservations || '',
            epiDeliveryList: w.epiDeliveryList || ['Capacete', 'Colete Refletor', 'Botins de Proteção', 'Luvas de Proteção'],
            epiDate: w.epiDate || '',
        });
        setWorkerModalTab('identification');
        setWorkerModalMode('view');
        setIsWorkerModalOpen(true);
    };

    const handleOpenCreateWorker = () => {
        setSelectedWorker(null);
        setEditingWorkerId(null);
        setWorkerForm(defaultWorkerForm);
        setWorkerModalTab('identification');
        setWorkerModalMode('edit');
        setIsWorkerModalOpen(true);
    };

    const handleOpenEditWorker = (w: Worker) => {
        handleOpenViewWorker(w);
        setWorkerModalTab('identification');
        setWorkerModalMode('edit');
    };

    // Modal/Detail state for Equipment
    const [isEquipModalOpen, setIsEquipModalOpen] = useState(false);
    const [equipModalMode, setEquipModalMode] = useState<'view' | 'edit'>('view');
    const [equipModalTab, setEquipModalTab] = useState<'identification' | 'safety' | 'documents'>('identification');
    const [editingEquipId, setEditingEquipId] = useState<string | null>(null);
    const [selectedEquip, setSelectedEquip] = useState<Equipment | null>(null);
    const [equipForm, setEquipForm] = useState({
        name: '',
        type: 'vehicle' as const,
        serialNumber: '',
        brand: '',
        model: '',
        inspectionDate: '',
        ceCertified: true
    });

    const handleOpenViewEquip = (eq: Equipment) => {
        setSelectedEquip(eq);
        setEditingEquipId(eq.id);
        setEquipForm({
            name: eq.name,
            type: (eq.type as any) || 'vehicle',
            serialNumber: eq.serialNumber || '',
            brand: eq.brand || '',
            model: eq.model || '',
            inspectionDate: eq.inspectionDueDate || '',
            ceCertified: eq.ceMarking ?? true
        });
        setEquipModalTab('identification');
        setEquipModalMode('view');
        setIsEquipModalOpen(true);
    };

    const handleOpenCreateEquip = () => {
        setSelectedEquip(null);
        setEditingEquipId(null);
        setEquipForm({
            name: '',
            type: 'vehicle',
            serialNumber: '',
            brand: '',
            model: '',
            inspectionDate: '',
            ceCertified: true
        });
        setEquipModalTab('identification');
        setEquipModalMode('edit');
        setIsEquipModalOpen(true);
    };

    const handleOpenEditEquip = (eq: Equipment) => {
        handleOpenViewEquip(eq);
        setEquipModalTab('identification');
        setEquipModalMode('edit');
    };

    // Save Master Company details
    const handleSaveCompany = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const trimmedName = companyForm.name.trim();
        const trimmedNif = companyForm.nif.trim();
        const ifcActorRole = getIfcRoleFromCompanyRole(companyForm.companyRole || '');

        if (masterCompany) {
            updateCompany(masterCompany.id, {
                ...companyForm,
                name: trimmedName,
                nif: trimmedNif,
                ifcActorRole,
            });
        } else if (corporateEntityId) {
            addCompany({
                ...companyForm,
                id: corporateEntityId,
                accountId: effectiveAccountId || 'default',
                status: companyForm.status,
                workflowStatus: 'validated',
                ifcActorRole,
                createdAt: new Date().toISOString()
            } as any);
        }

        if (userAccount?.id) {
            updateAccount(userAccount.id, {
                name: trimmedName,
                vatNumber: trimmedNif,
                contactEmail: companyForm.email.trim(),
                contactPhone: companyForm.phone.trim(),
            });
        }

        isFormEditedRef.current = false;
        setSavedNotice(true);
        addNotification('success', 'Dados da empresa guardados com sucesso!');
        setTimeout(() => setSavedNotice(false), 3000);
    };

    const handleCancelCompanyEdit = () => {
        isFormEditedRef.current = false;
        setCompanyForm({
            name: masterCompany?.name || userAccount?.name || 'A Minha Empresa',
            nif: masterCompany?.nif || userAccount?.vatNumber || '',
            activity: masterCompany?.activity ?? '',
            caeCode: masterCompany?.caeCode ?? '',
            companyRole: masterCompany?.companyRole ?? 'empresa_construcao',
            companyRoleCustom: masterCompany?.companyRoleCustom ?? '',
            legalForm: (masterCompany?.legalForm as any) ?? 'lda',
            status: (masterCompany?.status as any) ?? 'active',
            impic: masterCompany?.impic ?? '',
            email: masterCompany?.email || userAccount?.contactEmail || currentUser?.email || '',
            phone: masterCompany?.phone || userAccount?.contactPhone || '',
            address: masterCompany?.address ?? '',
            insuranceWorkAccPolicy: masterCompany?.insuranceWorkAccPolicy ?? '',
            insuranceWorkAccDate: masterCompany?.insuranceWorkAccDate ?? '',
            insuranceCivilPolicy: masterCompany?.insuranceCivilPolicy ?? '',
            insuranceCivilDate: masterCompany?.insuranceCivilDate ?? '',
            cleanSSDate: masterCompany?.cleanSSDate ?? '',
            cleanFinDate: masterCompany?.cleanFinDate ?? '',
        });
        setCompanyModalMode('view');
    };

    const handleCloseCompanyView = () => {
        handleCancelCompanyEdit();
        setIsCompanyModalOpen(false);
    };

    const renderFieldStatus = (isValid: boolean) => {
        if (isValid) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400">
                    <Check size={12} strokeWidth={3} /> VALIDADO
                </span>
            );
        }
        return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] uppercase font-bold bg-gray-100 dark:bg-[#131314] text-gray-500 dark:text-gray-400">
                PENDENTE
            </span>
        );
    };

    const renderDateStatus = (dateStr?: string) => {
        if (!dateStr) {
            return (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] uppercase font-bold bg-gray-100 dark:bg-[#131314] text-gray-500 dark:text-gray-400">
                    PENDENTE
                </span>
            );
        }
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) {
            return (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] uppercase font-bold bg-gray-100 dark:bg-[#131314] text-gray-500 dark:text-gray-400">
                    PENDENTE
                </span>
            );
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (d < today) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400">
                    <AlertCircle size={12} strokeWidth={2.5} /> EXPIRADO
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400">
                <Check size={12} strokeWidth={3} /> VALIDADO
            </span>
        );
    };

    const renderFileCell = (category: string) => {
        const hasDoc = documents.some(d => d.entityId === corporateEntityId && d.category === category && !d.archived);
        return (
            <div className="flex items-center justify-center gap-2">
                {hasDoc ? (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setCompanyModalTab('documents');
                        }}
                        className="inline-flex items-center justify-center p-1.5 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 rounded-md border border-green-200 dark:border-green-500/30 hover:scale-105 transition-transform cursor-pointer"
                        title="Ver no Dossier Documental"
                    >
                        <FileText size={16} />
                    </button>
                ) : (
                    <div
                        className="inline-flex items-center justify-center p-1.5 bg-gray-50 dark:bg-[#131314] text-gray-400 dark:text-gray-600 rounded-md border border-gray-200 dark:border-[#444746]"
                        title="Sem Documento"
                    >
                        <FileText size={16} />
                    </div>
                )}
                <DocumentUpload
                    entityId={corporateEntityId}
                    projectId={corporateEntityId}
                    category={category}
                    layout="button"
                    label=""
                />
            </div>
        );
    };

    // Save Worker (IFC Standardized ISO 16739)
    const handleSaveWorker = (e: React.FormEvent) => {
        e.preventDefault();
        const fullName = [workerForm.firstName.trim(), workerForm.middleName.trim(), workerForm.lastName.trim()]
            .filter(Boolean)
            .join(' ') || workerForm.name.trim();

        if (!fullName) {
            addNotification('error', 'O nome do colaborador é obrigatório.');
            return;
        }

        const roleDef = getRoleDefinition(workerForm.workerRoleId);
        const finalRoleLabel = workerForm.workerRoleId === 'OTHER'
            ? (workerForm.roleCustom.trim() || 'Outra')
            : (workerForm.workerRoleId ? tRoles(`roles.${workerForm.workerRoleId}`) : (workerForm.role.trim() || 'Colaborador'));

        const ifcActorRole = roleDef?.ifcActorRole?.role as any;
        const ifcLaborType = roleDef?.ifcLaborResource?.predefinedType ?? (workerForm.ifcLaborType || undefined);
        const occupation = roleDef?.ifcLaborResource?.objectType ?? (workerForm.occupation || undefined);

        const workerPayload: Partial<Worker> = {
            name: fullName,
            firstName: workerForm.firstName.trim(),
            middleName: workerForm.middleName.trim() || undefined,
            lastName: workerForm.lastName.trim(),
            nationalityType: workerForm.nationalityType,
            isForeign: workerForm.nationalityType !== 'portugal',
            foreignCountry: workerForm.nationalityType !== 'portugal' ? workerForm.foreignCountry.trim() : undefined,
            nif: workerForm.nif.trim(),
            idCardType: workerForm.idCardType,
            idCardTypeCustom: workerForm.idCardTypeCustom.trim() || undefined,
            idCardNumber: workerForm.idCardNumber.trim(),
            idCardExpiry: workerForm.idCardExpiry || undefined,
            ssn: workerForm.ssn.trim(),
            birthDate: workerForm.birthDate || undefined,
            gender: workerForm.gender,
            email: workerForm.email.trim(),
            phone: workerForm.phone.trim(),
            address: workerForm.address.trim(),
            postalCode: workerForm.postalCode.trim(),
            city: workerForm.city.trim(),
            emergencyContactName: workerForm.emergencyContactName.trim() || undefined,
            emergencyContactPhone: workerForm.emergencyContactPhone.trim() || undefined,

            workerRoleId: workerForm.workerRoleId || undefined,
            roleCustom: workerForm.roleCustom.trim() || undefined,
            role: finalRoleLabel,
            occupation,
            ifcLaborType,
            ifcActorRole,

            contractType: workerForm.contractType,
            professionCategory: workerForm.professionCategory,
            contractExpiry: workerForm.contractExpiry || undefined,
            workSchedule: workerForm.workSchedule,

            medicalFitness: workerForm.medicalFitness,
            medicalExpiry: workerForm.medicalExpiry || undefined,
            medicalObservations: workerForm.medicalObservations.trim() || undefined,
            epiDeliveryList: workerForm.epiDeliveryList,
            epiDate: workerForm.epiDate || undefined,
        };

        if (editingWorkerId) {
            updateWorker(editingWorkerId, workerPayload);
            addNotification('success', 'Colaborador atualizado com sucesso!');
            setSelectedWorker(prev => prev ? ({ ...prev, ...workerPayload } as Worker) : null);
            setWorkerModalMode('view');
        } else {
            const newWorkerId = `w_corp_${nanoid(8)}`;
            const newWorker: Worker = {
                id: newWorkerId,
                companyId: corporateEntityId,
                accountId: effectiveAccountId,
                status: 'active',
                accessCardCode: `EMP-${nanoid(6).toUpperCase()}`,
                accessCardValid: true,
                workflowStatus: 'validated',
                ...workerPayload,
            } as Worker;

            addWorker(newWorker);
            addNotification('success', 'Colaborador adicionado à sua empresa!');
            setSelectedWorker(newWorker);
            setEditingWorkerId(newWorkerId);
            setWorkerModalMode('view');
        }
    };

    // Save Equipment
    const handleSaveEquipment = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!equipForm.name.trim()) return;

        if (editingEquipId) {
            const updatedPayload = {
                name: equipForm.name.trim(),
                type: equipForm.type,
                serialNumber: equipForm.serialNumber.trim(),
                brand: equipForm.brand.trim(),
                model: equipForm.model.trim(),
                inspectionDueDate: equipForm.inspectionDate || undefined,
                ceMarking: equipForm.ceCertified
            };
            updateEquipment(editingEquipId, updatedPayload);
            addNotification('success', 'Equipamento atualizado com sucesso!');
            setSelectedEquip(prev => prev ? ({ ...prev, ...updatedPayload } as Equipment) : null);
            setEquipModalMode('view');
        } else {
            const newEquipId = `eq_corp_${nanoid(8)}`;
            const newEquip: Equipment = {
                id: newEquipId,
                name: equipForm.name.trim(),
                type: equipForm.type,
                companyId: corporateEntityId,
                accountId: effectiveAccountId,
                status: 'operational',
                serialNumber: equipForm.serialNumber.trim(),
                brand: equipForm.brand.trim(),
                model: equipForm.model.trim(),
                inspectionDueDate: equipForm.inspectionDate || undefined,
                ceMarking: equipForm.ceCertified,
                workflowStatus: 'validated'
            } as Equipment;
            addEquipment(newEquip);
            addNotification('success', 'Equipamento adicionado à sua empresa!');
            setSelectedEquip(newEquip);
            setEditingEquipId(newEquipId);
            setEquipModalMode('view');
        }
    };

    return (
        <AuthGuard>
            {!isPaidOrAdmin ? (
                <div className="flex h-screen items-center justify-center bg-[var(--bg)] px-4">
                    <div className="max-w-md w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-8 text-center shadow-lg space-y-4">
                        <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center">
                            <Building2 size={28} />
                        </div>
                        <h1 className="text-xl font-bold text-[var(--text)]">Módulo "A Minha Empresa"</h1>
                        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                            O acesso à gestão corporativa da sua própria empresa (Organizações, Pessoas, Equipamentos, Formação e Documentos) requer no mínimo uma subscrição do <strong>Plano Básico</strong>.
                        </p>
                        <div className="pt-2 flex flex-col gap-2">
                            <button
                                onClick={() => router.push('/')}
                                className="w-full py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-sm transition-all cursor-pointer"
                            >
                                Voltar ao Workplace e Conhecer Planos
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex h-screen w-full bg-[var(--bg)] text-[var(--text)] overflow-hidden">
                    {/* FundacaoJM Style Sidebar */}
                    <aside className={cn(
                        "sidebar-container relative h-full flex flex-col transition-all duration-300 ease-in-out shrink-0 select-none",
                        isCollapsed ? "w-[60px] py-5 px-2.5 collapsed" : "w-[270px] p-5"
                    )}>
                        {/* Floating Sidebar Toggle Button (FundacaoJM style) */}
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="sidebar-toggle-btn"
                            title={isCollapsed ? "Expandir barra lateral" : "Recolher barra lateral"}
                        >
                            {isCollapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
                        </button>

                        {/* Top Logo & App Title */}
                        <div className={cn("flex items-center gap-3 mb-4 pb-4 border-b border-[var(--border)]", isCollapsed ? "justify-center" : "px-1")}>
                            <img src="/safetyfirst-logo.png" alt="Safety1irst" className="w-8 h-8 object-contain shrink-0" />
                            {!isCollapsed && (
                                <span className="text-[20px] font-medium tracking-[-0.5px] text-[var(--text)] whitespace-nowrap">
                                    Safety<span style={{ color: '#4285F4', fontWeight: 700 }}>1irst</span>
                                </span>
                            )}
                        </div>

                        {/* Return to Workplace Button */}
                        <div className="mb-3">
                            <Link
                                href="/"
                                className={cn(
                                    "fjm-nav-item",
                                    isCollapsed && "justify-center px-0"
                                )}
                                title="Voltar ao Workplace"
                            >
                                <FlatFolderIcon size={18} className="shrink-0" />
                                {!isCollapsed && <span className="truncate">Voltar ao Workplace</span>}
                            </Link>
                        </div>

                        {/* Nav Items List */}
                        <nav className="flex-1 overflow-y-auto pr-1">
                            {!isCollapsed && (
                                <div className="fjm-nav-label">Menu</div>
                            )}
                            <ul className="space-y-0.5">
                                {[
                                    { id: 'organization', label: 'Organizações', icon: FlatCompaniesIcon },
                                    { id: 'workers', label: 'Pessoas', icon: FlatWorkersIcon, badge: companyWorkers.length },
                                    { id: 'equipment', label: 'Equipamentos', icon: FlatEquipmentIcon, badge: companyEquipment.length },
                                    { id: 'training', label: 'Formação', icon: FlatTrainingIcon },
                                    { id: 'documents', label: 'Documentos', icon: FlatDocumentsIcon, badge: corporateDocuments.length },
                                    { id: 'settings', label: 'Configurações', icon: FlatSettingsIcon },
                                ].map((item) => {
                                    const IconComponent = item.icon;
                                    const isActive = activeTab === item.id;
                                    return (
                                        <li key={item.id}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setActiveTab(item.id as CompanyTab);
                                                    setIsCompanyModalOpen(false);
                                                    setIsWorkerModalOpen(false);
                                                    setIsEquipModalOpen(false);
                                                    setCompanyModalMode('view');
                                                    setWorkerModalMode('view');
                                                    setEquipModalMode('view');
                                                }}
                                                className={cn(
                                                    "fjm-nav-item w-full text-left bg-transparent border-0 outline-none",
                                                    isActive && "active",
                                                    isCollapsed && "justify-center px-0"
                                                )}
                                                title={isCollapsed ? item.label : undefined}
                                            >
                                                <IconComponent size={18} className="shrink-0" />
                                                {!isCollapsed && <span className="truncate">{item.label}</span>}
                                                {!isCollapsed && item.badge !== undefined && item.badge > 0 && (
                                                    <span className={cn(
                                                        "ml-auto px-1.5 py-0.2 rounded-full text-[10px] font-extrabold",
                                                        isActive ? "bg-[#4285F4]/30 text-white" : "bg-[var(--bg-input)] text-[var(--text-muted)]"
                                                    )}>
                                                        {item.badge}
                                                    </span>
                                                )}
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </nav>

                        {/* Sidebar Footer: User Card (FundacaoJM style) */}
                        <div className="fjm-sidebar-footer">
                            {/* User Card with Logout */}
                            <div className={cn("fjm-user-card", isCollapsed && "justify-center p-1.5")}>
                                <div className="fjm-user-avatar" title={currentUser?.name}>
                                    {getInitials(currentUser?.name)}
                                </div>
                                {!isCollapsed && (
                                    <div className="flex-1 min-w-0">
                                        <div className="fjm-user-name" title={currentUser?.name}>
                                            {currentUser?.name || 'Utilizador'}
                                        </div>
                                        <div className="fjm-user-role capitalize" title={companyForm.name || currentUser?.role}>
                                            {companyForm.name || currentUser?.role || 'Utilizador'}
                                        </div>
                                    </div>
                                )}
                                {!isCollapsed && (
                                    <button
                                        onClick={handleLogout}
                                        title="Terminar Sessão"
                                        className="p-1.5 rounded-full hover:bg-[var(--bg-input)] hover:text-red-500 text-[var(--text-muted)] transition-colors shrink-0 cursor-pointer"
                                    >
                                        <LogOut size={16} />
                                    </button>
                                )}
                            </div>

                            {/* Collapsed Mode Logout Button */}
                            {isCollapsed && (
                                <button
                                    onClick={handleLogout}
                                    title="Terminar Sessão"
                                    className="mt-2 p-1.5 rounded-full hover:bg-[var(--bg-input)] hover:text-red-500 text-[var(--text-muted)] transition-colors flex items-center justify-center w-full cursor-pointer"
                                >
                                    <LogOut size={16} />
                                </button>
                            )}
                        </div>
                    </aside>

                    {/* ── Main Content Area ── */}
                    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                        <Header 
                            title={companyForm.name || 'A Minha Empresa'} 
                            subtitle={`Espaço Corporativo • Plano ${currentPlan.toUpperCase()}`} 
                        />
                        <main className="flex-1 bg-[var(--bg-card)] ml-3 mt-3 mr-4 mb-4 rounded-lg shadow-sm border border-[var(--border)] overflow-hidden relative flex flex-col">
                            {/* Header Action Bar */}
                            {activeTab === 'organization' && isCompanyModalOpen ? (
                                /* Clean Organization Header (Matching Project Organization layout) */
                                <div className="bg-[var(--bg-card)] border-b border-[var(--border)] sticky top-0 z-10 shadow-xs">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-3.5 gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <button
                                                type="button"
                                                onClick={handleCloseCompanyView}
                                                className="p-1.5 -ml-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-input)] transition-colors cursor-pointer shrink-0"
                                                title="Voltar à lista de organizações"
                                            >
                                                <ArrowLeft size={18} />
                                            </button>
                                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-[#4285F4] flex items-center justify-center font-bold text-sm shrink-0 border border-blue-500/20 shadow-2xs">
                                                {companyForm.name ? companyForm.name.slice(0, 2).toUpperCase() : 'ORG'}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2.5">
                                                    <h2 className="text-base font-bold text-[var(--text)] tracking-tight truncate">
                                                        {companyForm.name || "A Minha Empresa"}
                                                    </h2>
                                                    <span className={cn(
                                                        "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                                                        companyForm.status === 'inactive' ? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                                    )}>
                                                        {companyForm.status === 'inactive' ? 'Inativa' : 'Ativa'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mt-0.5 truncate">
                                                    <span className="truncate">NIF: {companyForm.nif || '---'}</span>
                                                    <span className="w-1 h-1 rounded-full bg-[var(--border)] shrink-0"></span>
                                                    <span className="truncate">Natureza: {companyForm.legalForm?.toUpperCase() || 'LDA'}</span>
                                                    {companyForm.caeCode && (
                                                        <>
                                                            <span className="w-1 h-1 rounded-full bg-[var(--border)] shrink-0"></span>
                                                            <span className="truncate">CAE: {companyForm.caeCode}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                                            {/* Sincronizar com Obra */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setExportEntityType('company');
                                                    setExportTargetProjectId(userProjects[0]?.id || '');
                                                    setIsExportModalOpen(true);
                                                }}
                                                className="px-3 py-1.5 rounded-lg bg-[var(--bg-input)] hover:bg-[var(--border)] text-[var(--text)] text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer border border-[var(--border)]"
                                                title="Sincronizar com uma das suas obras"
                                            >
                                                <Share2 size={13} className="text-[#4285F4]" />
                                                <span>Sincronizar com Obra</span>
                                            </button>

                                            <div className="h-6 w-px bg-[var(--border)] mx-1" />

                                            {/* Botão Editar / Salvar */}
                                            {companyModalMode === 'view' ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setCompanyModalMode('edit')}
                                                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#4285F4] hover:bg-[#3367D6] rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                                                >
                                                    <Pencil size={13} /> Editar Empresa
                                                </button>
                                            ) : (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={handleCancelCompanyEdit}
                                                        className="px-3 py-1.5 text-xs font-medium text-[var(--text)] bg-[var(--bg-card)] border border-[var(--border)] rounded-lg hover:bg-[var(--bg-input)] transition-colors shadow-xs cursor-pointer"
                                                    >
                                                        Cancelar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            handleSaveCompany(e);
                                                            setCompanyModalMode('view');
                                                        }}
                                                        className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#4285F4] hover:bg-[#3367D6] rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                                                    >
                                                        <Save size={13} /> Guardar
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Extended Sub-Tabs (Identificação, Requisitos Legais, Ficheiros) */}
                                    <div className="flex items-center px-6 border-t border-[var(--border)] overflow-x-auto no-scrollbar">
                                        {[
                                            { id: "identification", label: "1. Identificação" },
                                            { id: "legal", label: "2. Requisitos Legais (DL 273/2003)" },
                                            { id: "documents", label: "3. Ficheiros & Documentos" },
                                        ].map((tab) => (
                                            <button
                                                key={tab.id}
                                                type="button"
                                                onClick={() => setCompanyModalTab(tab.id as any)}
                                                className={cn(
                                                    "flex items-center gap-2 py-2.5 px-4 border-b-2 transition-colors text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer",
                                                    companyModalTab === tab.id
                                                        ? "border-[#4285F4] text-[#4285F4] font-semibold"
                                                        : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
                                                )}
                                            >
                                                <span>{tab.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : activeTab === 'workers' && isWorkerModalOpen ? (
                                /* Clean Worker Detail Header (Matching Organization layout) */
                                <div className="bg-[var(--bg-card)] border-b border-[var(--border)] sticky top-0 z-10 shadow-xs">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-3.5 gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsWorkerModalOpen(false);
                                                    setWorkerModalMode('view');
                                                }}
                                                className="p-1.5 -ml-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-input)] transition-colors cursor-pointer shrink-0"
                                                title="Voltar à lista de colaboradores"
                                            >
                                                <ArrowLeft size={18} />
                                            </button>
                                            <div className="w-10 h-10 rounded-full bg-blue-500/10 text-[#4285F4] flex items-center justify-center font-bold text-sm shrink-0 border border-blue-500/20 shadow-2xs">
                                                {getInitials(selectedWorker?.name || workerForm.name)}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2.5">
                                                    <h2 className="text-base font-bold text-[var(--text)] tracking-tight truncate">
                                                        {selectedWorker?.name || workerForm.name || "Novo Colaborador"}
                                                    </h2>
                                                    {(() => {
                                                        const badge = getMedicalFitnessBadge(workerForm.medicalFitness, workerForm.medicalExpiry);
                                                        return (
                                                            <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border", badge.color)}>
                                                                {badge.label}
                                                            </span>
                                                        );
                                                    })()}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mt-0.5 truncate">
                                                    <span className="truncate">NIF: {workerForm.nif || '---'}</span>
                                                    <span className="w-1 h-1 rounded-full bg-[var(--border)] shrink-0"></span>
                                                    <span className="truncate">Função: {workerForm.role || 'Colaborador'}</span>
                                                    <span className="w-1 h-1 rounded-full bg-[var(--border)] shrink-0"></span>
                                                    <span className="truncate">Empresa: {companyForm.name || 'A Minha Empresa'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                                            {/* Sincronizar com Obra */}
                                            {selectedWorker && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedWorkerForExport(selectedWorker);
                                                        setExportEntityType('worker');
                                                        setExportTargetProjectId(userProjects[0]?.id || '');
                                                        setIsExportModalOpen(true);
                                                    }}
                                                    className="px-3 py-1.5 rounded-lg bg-[var(--bg-input)] hover:bg-[var(--border)] text-[var(--text)] text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer border border-[var(--border)]"
                                                    title="Sincronizar este colaborador com uma das suas obras"
                                                >
                                                    <Share2 size={13} className="text-[#4285F4]" />
                                                    <span>Sincronizar com Obra</span>
                                                </button>
                                            )}

                                            <div className="h-6 w-px bg-[var(--border)] mx-1" />

                                            {/* Botão Editar / Salvar */}
                                            {workerModalMode === 'view' ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setWorkerModalMode('edit')}
                                                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#4285F4] hover:bg-[#3367D6] rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                                                >
                                                    <Pencil size={13} /> Editar Colaborador
                                                </button>
                                            ) : (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (selectedWorker) {
                                                                handleOpenViewWorker(selectedWorker);
                                                            } else {
                                                                setIsWorkerModalOpen(false);
                                                            }
                                                        }}
                                                        className="px-3 py-1.5 text-xs font-medium text-[var(--text)] bg-[var(--bg-card)] border border-[var(--border)] rounded-lg hover:bg-[var(--bg-input)] transition-colors shadow-xs cursor-pointer"
                                                    >
                                                        Cancelar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleSaveWorker(e)}
                                                        className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#4285F4] hover:bg-[#3367D6] rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                                                    >
                                                        <Save size={13} /> Guardar
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Extended Sub-Tabs for Worker */}
                                    <div className="flex items-center px-6 border-t border-[var(--border)] overflow-x-auto no-scrollbar">
                                        {[
                                            { id: "identification", label: "1. Identificação & Contactos" },
                                            { id: "labor", label: "2. Dados Laborais & Função" },
                                            { id: "safety", label: "3. Requisitos Legais & Médicos" },
                                            { id: "documents", label: "4. Ficheiros & Documentos" },
                                        ].map((tab) => (
                                            <button
                                                key={tab.id}
                                                type="button"
                                                onClick={() => setWorkerModalTab(tab.id as any)}
                                                className={cn(
                                                    "flex items-center gap-2 py-2.5 px-4 border-b-2 transition-colors text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer",
                                                    workerModalTab === tab.id
                                                        ? "border-[#4285F4] text-[#4285F4] font-semibold"
                                                        : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
                                                )}
                                            >
                                                <span>{tab.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : activeTab === 'equipment' && isEquipModalOpen ? (
                                /* Clean Equipment Detail Header (Matching Organization layout) */
                                <div className="bg-[var(--bg-card)] border-b border-[var(--border)] sticky top-0 z-10 shadow-xs">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-3.5 gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsEquipModalOpen(false);
                                                    setEquipModalMode('view');
                                                }}
                                                className="p-1.5 -ml-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-input)] transition-colors cursor-pointer shrink-0"
                                                title="Voltar à lista de equipamentos"
                                            >
                                                <ArrowLeft size={18} />
                                            </button>
                                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-[#4285F4] flex items-center justify-center font-bold text-sm shrink-0 border border-blue-500/20 shadow-2xs">
                                                <Wrench size={20} />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2.5">
                                                    <h2 className="text-base font-bold text-[var(--text)] tracking-tight truncate">
                                                        {equipForm.name || "Novo Equipamento"}
                                                    </h2>
                                                    <span className={cn(
                                                        "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                                                        equipForm.ceCertified
                                                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                                            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                                    )}>
                                                        {equipForm.ceCertified ? 'Conforme CE' : 'Sem Certificado'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mt-0.5 truncate">
                                                    <span className="truncate">N.º Série: {equipForm.serialNumber || '---'}</span>
                                                    <span className="w-1 h-1 rounded-full bg-[var(--border)] shrink-0"></span>
                                                    <span className="truncate">Tipo: {equipForm.type}</span>
                                                    {equipForm.brand && (
                                                        <>
                                                            <span className="w-1 h-1 rounded-full bg-[var(--border)] shrink-0"></span>
                                                            <span className="truncate">Marca: {equipForm.brand} {equipForm.model || ''}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                                            {/* Sincronizar com Obra */}
                                            {selectedEquip && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedEquipForExport(selectedEquip);
                                                        setExportEntityType('equipment');
                                                        setExportTargetProjectId(userProjects[0]?.id || '');
                                                        setIsExportModalOpen(true);
                                                    }}
                                                    className="px-3 py-1.5 rounded-lg bg-[var(--bg-input)] hover:bg-[var(--border)] text-[var(--text)] text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer border border-[var(--border)]"
                                                    title="Sincronizar este equipamento com uma das suas obras"
                                                >
                                                    <Share2 size={13} className="text-[#4285F4]" />
                                                    <span>Sincronizar com Obra</span>
                                                </button>
                                            )}

                                            <div className="h-6 w-px bg-[var(--border)] mx-1" />

                                            {/* Botão Editar / Salvar */}
                                            {equipModalMode === 'view' ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setEquipModalMode('edit')}
                                                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#4285F4] hover:bg-[#3367D6] rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                                                >
                                                    <Pencil size={13} /> Editar Equipamento
                                                </button>
                                            ) : (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (selectedEquip) {
                                                                handleOpenViewEquip(selectedEquip);
                                                            } else {
                                                                setIsEquipModalOpen(false);
                                                            }
                                                        }}
                                                        className="px-3 py-1.5 text-xs font-medium text-[var(--text)] bg-[var(--bg-card)] border border-[var(--border)] rounded-lg hover:bg-[var(--bg-input)] transition-colors shadow-xs cursor-pointer"
                                                    >
                                                        Cancelar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleSaveEquipment(e)}
                                                        className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#4285F4] hover:bg-[#3367D6] rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                                                    >
                                                        <Save size={13} /> Guardar
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Extended Sub-Tabs for Equipment */}
                                    <div className="flex items-center px-6 border-t border-[var(--border)] overflow-x-auto no-scrollbar">
                                        {[
                                            { id: "identification", label: "1. Identificação & Características" },
                                            { id: "safety", label: "2. Requisitos Legais & Segurança" },
                                            { id: "documents", label: "3. Ficheiros & Documentos" },
                                        ].map((tab) => (
                                            <button
                                                key={tab.id}
                                                type="button"
                                                onClick={() => setEquipModalTab(tab.id as any)}
                                                className={cn(
                                                    "flex items-center gap-2 py-2.5 px-4 border-b-2 transition-colors text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer",
                                                    equipModalTab === tab.id
                                                        ? "border-[#4285F4] text-[#4285F4] font-semibold"
                                                        : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
                                                )}
                                            >
                                                <span>{tab.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <header className="p-5 border-b border-[var(--border)] bg-[var(--bg-card)]/80 backdrop-blur-sm sticky top-0 z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                                    <div>
                                        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-1">
                                            <span className="font-semibold text-primary">A Minha Empresa</span>
                                            <span>•</span>
                                            <span className="capitalize">{activeTab === 'organization' ? 'Organizações' : activeTab === 'settings' ? 'Configurações' : activeTab}</span>
                                        </div>
                                        <h1 className="text-xl font-extrabold text-[var(--text)]">
                                            {activeTab === 'organization' && 'Dados e Documentos da Organização'}
                                            {activeTab === 'workers' && `Colaboradores da Empresa (${companyWorkers.length})`}
                                            {activeTab === 'equipment' && `Equipamentos e Máquinas (${companyEquipment.length})`}
                                            {activeTab === 'training' && 'Matriz e Cursos de Formação'}
                                            {activeTab === 'documents' && 'Repositório Documental Corporativo'}
                                            {activeTab === 'settings' && 'Definições & Configurações da Empresa'}
                                        </h1>
                                    </div>

                                    {/* Action Buttons based on Tab */}
                                    <div className="flex items-center gap-2 self-start sm:self-auto">
                                        {activeTab === 'organization' && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setExportEntityType('company');
                                                        setExportTargetProjectId(userProjects[0]?.id || '');
                                                        setIsExportModalOpen(true);
                                                    }}
                                                    className="px-3.5 py-2 rounded-xl bg-[var(--bg-input)] hover:bg-[var(--border)] text-[var(--text)] text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border border-[var(--border)]"
                                                    title="Sincronizar dados desta empresa com uma das suas obras"
                                                >
                                                    <Share2 size={14} className="text-primary" /> Sincronizar com Obra
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setCompanyModalMode('edit');
                                                        setIsCompanyModalOpen(true);
                                                    }}
                                                    className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                                                >
                                                    <Edit2 size={14} /> Editar Empresa
                                                </button>
                                            </>
                                        )}
                                        {activeTab === 'workers' && (
                                            <button
                                                onClick={handleOpenCreateWorker}
                                                className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                                            >
                                                <Plus size={14} /> Adicionar Colaborador
                                            </button>
                                        )}
                                        {activeTab === 'equipment' && (
                                            <button
                                                onClick={handleOpenCreateEquip}
                                                className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                                            >
                                                <Plus size={14} /> Adicionar Equipamento
                                            </button>
                                        )}
                                    </div>
                                </header>
                            )}

                            {/* Scrollable Body Content */}
                            <div className="flex-1 overflow-y-auto p-6">
                                <div className="max-w-6xl w-full mx-auto space-y-6">
                            {/* Notice Banner */}
                            {savedNotice && (
                                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2 animate-in fade-in">
                                    <Check size={16} /> Dados gravados com sucesso!
                                </div>
                            )}

                            {/* ════════ TAB: ORGANIZAÇÃO ════════ */}
                            {activeTab === 'organization' && (
                                <div className="space-y-6">
                                    {!isCompanyModalOpen ? (
                                        /* ── Tabela com a linha da empresa e Projetos Sincronizados ── */
                                        <>
                                            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
                                                <div className="p-4 border-b border-[var(--border)] flex items-center justify-between gap-3">
                                                    <div className="relative flex-1 max-w-sm">
                                                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                                                        <input
                                                            type="text"
                                                            placeholder="Pesquisar organização por nome ou NIF..."
                                                            className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-xl pl-9 pr-4 py-2 text-xs text-[var(--text)] outline-none focus:ring-2 focus:ring-primary/20"
                                                            value={companySearchTerm}
                                                            onChange={e => setCompanySearchTerm(e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs text-[var(--text-muted)] font-medium">
                                                            {displayedCompanies.length} organização(ões) registada(s)
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setCompanyModalMode('edit');
                                                                setIsCompanyModalOpen(true);
                                                            }}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 transition-all cursor-pointer"
                                                        >
                                                            <Edit2 size={13} /> Editar Empresa
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-xs text-left min-w-[700px]">
                                                        <thead className="bg-[var(--bg-input)]/50 text-[var(--text-muted)] font-bold uppercase tracking-wider text-[10px] border-b border-[var(--border)]">
                                                            <tr>
                                                                <th className="px-5 py-3.5">Organização</th>
                                                                <th className="px-5 py-3.5">Tipo / Função</th>
                                                                <th className="px-5 py-3.5">Contacto</th>
                                                                <th className="px-5 py-3.5">Seguros & Conformidade</th>
                                                                <th className="px-5 py-3.5 text-right">Ação</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-[var(--border)]">
                                                            {displayedCompanies.length === 0 ? (
                                                                <tr>
                                                                    <td colSpan={5} className="px-6 py-12 text-center text-[var(--text-muted)]">
                                                                        Nenhuma organização registada nesta conta.
                                                                    </td>
                                                                </tr>
                                                            ) : (
                                                                displayedCompanies.map(comp => (
                                                                    <tr 
                                                                        key={comp.id || 'master'} 
                                                                        onClick={() => {
                                                                            setCompanyModalMode('view');
                                                                            setIsCompanyModalOpen(true);
                                                                        }}
                                                                        className="hover:bg-[var(--bg-input)]/30 transition-colors cursor-pointer group"
                                                                    >
                                                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                                                            <div className="flex items-center gap-3">
                                                                                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-[#4285F4] flex items-center justify-center font-bold text-xs shrink-0">
                                                                                    <Building2 size={16} />
                                                                                </div>
                                                                                <div>
                                                                                    <div className="font-bold text-xs text-[var(--text)] group-hover:text-primary transition-colors flex items-center gap-2">
                                                                                        {comp.name}
                                                                                        <span className={cn(
                                                                                            "text-[10px] px-1.5 py-0.5 rounded-md font-semibold",
                                                                                            comp.status === 'inactive' ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                                                                        )}>
                                                                                            {comp.status === 'inactive' ? 'Inativa' : 'Ativa'}
                                                                                        </span>
                                                                                    </div>
                                                                                    <div className="text-[10px] font-mono text-[var(--text-muted)]">
                                                                                        NIF: {comp.nif || 'Não indicado'} {comp.caeCode ? `• CAE ${comp.caeCode}` : ''}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-5 py-3.5 whitespace-nowrap text-xs text-[var(--text)]">
                                                                            <span className="font-medium">{getCompanyRoleLabel(comp.companyRole || 'empresa_construcao')}</span>
                                                                            {comp.activity && (
                                                                                <div className="text-[10px] text-[var(--text-muted)] truncate max-w-[200px]">
                                                                                    {comp.activity}
                                                                                </div>
                                                                            )}
                                                                        </td>
                                                                        <td className="px-5 py-3.5 whitespace-nowrap text-[11px] text-[var(--text-muted)]">
                                                                            <div>{comp.email || userAccount?.contactEmail || '—'}</div>
                                                                            <div className="text-[10px]">{comp.phone || userAccount?.contactPhone || ''}</div>
                                                                        </td>
                                                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                                {comp.insuranceWorkAccDate ? (
                                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800" title={`Seguro AT válido até ${new Date(comp.insuranceWorkAccDate).toLocaleDateString()}`}>
                                                                                        <Check size={10} /> AT Válido
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                                                                        AT Pendente
                                                                                    </span>
                                                                                )}
                                                                                {comp.insuranceCivilDate ? (
                                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800" title={`Seguro RC válido até ${new Date(comp.insuranceCivilDate).toLocaleDateString()}`}>
                                                                                        <Check size={10} /> RC Válido
                                                                                    </span>
                                                                                ) : null}
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                                                            <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        setCompanyModalMode('view');
                                                                                        setIsCompanyModalOpen(true);
                                                                                    }}
                                                                                    className="p-1.5 rounded-lg hover:bg-[var(--bg-input)] text-[var(--text-muted)] hover:text-primary transition-colors cursor-pointer"
                                                                                    title="Ver Ficha da Empresa"
                                                                                >
                                                                                    <Eye size={15} />
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        setCompanyModalMode('edit');
                                                                                        setIsCompanyModalOpen(true);
                                                                                    }}
                                                                                    className="p-1.5 rounded-lg hover:bg-[var(--bg-input)] text-[var(--text-muted)] hover:text-primary transition-colors cursor-pointer"
                                                                                    title="Editar Dados da Empresa"
                                                                                >
                                                                                    <Edit2 size={15} />
                                                                                </button>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                ))
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>

                                            {/* Card: Obras e Projetos Sincronizados com a Organização */}
                                            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden p-5 space-y-4">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                                                            <Share2 size={16} />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-sm font-bold text-[var(--text)]">
                                                                Obras e Projetos Sincronizados ({syncedCompanyProjects.length})
                                                            </h3>
                                                            <p className="text-[11px] text-[var(--text-muted)]">
                                                                Estaleiros onde esta organização está integrada com conformidade DL 273/2003 e CDE.
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setExportEntityType('company');
                                                            setExportTargetProjectId(userProjects[0]?.id || '');
                                                            setIsExportModalOpen(true);
                                                        }}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 transition-all cursor-pointer self-start sm:self-auto"
                                                    >
                                                        <Share2 size={13} /> Sincronizar com Obra
                                                    </button>
                                                </div>

                                                {syncedCompanyProjects.length === 0 ? (
                                                    <div className="p-6 text-center rounded-xl bg-[var(--bg-input)]/30 border border-dashed border-[var(--border)] text-xs text-[var(--text-muted)]">
                                                        Esta organização ainda não está sincronizada com nenhuma das suas obras.
                                                        Utilize o botão <strong className="text-[var(--text)]">"Sincronizar com Obra"</strong> para disponibilizar a empresa e a sua documentação nos estaleiros.
                                                    </div>
                                                ) : (
                                                    <div className="overflow-x-auto border border-[var(--border)] rounded-xl">
                                                        <table className="w-full text-left text-xs border-collapse">
                                                            <thead>
                                                                <tr className="border-b border-[var(--border)] text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-wider bg-[var(--bg-input)]/50">
                                                                    <th className="py-2.5 px-3">Obra / Estaleiro</th>
                                                                    <th className="py-2.5 px-3">Localização</th>
                                                                    <th className="py-2.5 px-3">Função na Obra</th>
                                                                    <th className="py-2.5 px-3">Estado</th>
                                                                    <th className="py-2.5 px-3 text-right">Ação</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-[var(--border)]">
                                                                {syncedCompanyProjects.map(proj => (
                                                                    <tr key={proj.projectId} className="hover:bg-primary/5 transition-colors">
                                                                        <td className="py-3 px-3 font-semibold text-[var(--text)]">
                                                                            <div className="flex items-center gap-2.5">
                                                                                <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-primary flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/50">
                                                                                    <Folder size={14} />
                                                                                </div>
                                                                                <div>
                                                                                    <span className="block font-bold text-xs">{proj.projectName}</span>
                                                                                    <span className="text-[10px] font-mono text-[var(--text-muted)]">ID: {proj.projectId.slice(0, 8)}</span>
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                        <td className="py-3 px-3 text-[var(--text-muted)]">
                                                                            <span className="truncate max-w-[200px] block">{proj.projectAddress || '—'}</span>
                                                                        </td>
                                                                        <td className="py-3 px-3">
                                                                            <span className="font-medium text-[var(--text)]">{getCompanyRoleLabel(proj.companyRole)}</span>
                                                                        </td>
                                                                        <td className="py-3 px-3">
                                                                            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
                                                                                <Check size={11} /> Sincronizada
                                                                            </span>
                                                                        </td>
                                                                        <td className="py-3 px-3 text-right">
                                                                            <Link
                                                                                href={`/project/${proj.projectId}/dashboard`}
                                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 transition-all cursor-pointer"
                                                                            >
                                                                                <span>Abrir Obra</span>
                                                                                <ArrowRight size={12} />
                                                                            </Link>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    ) : (
                                        /* ── Detalhes da Organização (3 Sub-tabs) ── */
                                        <>
                                            {/* TAB 1: IDENTIFICAÇÃO */}
                                {companyModalTab === 'identification' && (
                                    <div className="space-y-6">
                                        <div className="overflow-hidden border border-gray-200 dark:border-[#444746] rounded-xl bg-white dark:bg-surface shadow-xs">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-[13px]">
                                                    <thead className="bg-gray-50/80 dark:bg-surface/80 border-b border-gray-200 dark:border-[#444746] text-gray-500 uppercase tracking-wider text-[11px] font-bold">
                                                        <tr>
                                                            <th className="px-4 py-3 min-w-[220px]">Campo</th>
                                                            <th className="px-4 py-3 min-w-[280px]">Valor Registado</th>
                                                            <th className="px-4 py-3 w-[150px] text-center">Estado</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100 dark:divide-[#444746]">
                                                        {/* Grupo: Identificação */}
                                                        <tr className="bg-primary/5 dark:bg-primary/10 border-y border-primary/10 dark:border-primary/20">
                                                            <td
                                                                colSpan={3}
                                                                className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-primary dark:text-primary-light"
                                                            >
                                                                Identificação e Dados Fiscais
                                                            </td>
                                                        </tr>

                                                        {/* Nome Oficial */}
                                                        <tr className="hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors">
                                                            <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                                                Nome Oficial da Empresa <span className="text-red-500">*</span>
                                                            </td>
                                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                                {companyModalMode === 'edit' ? (
                                                                    <input
                                                                        type="text"
                                                                        required
                                                                        value={companyForm.name}
                                                                        onChange={e => {
                                                                            isFormEditedRef.current = true;
                                                                            setCompanyForm({ ...companyForm, name: e.target.value });
                                                                        }}
                                                                        className="w-full px-2.5 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-primary"
                                                                    />
                                                                ) : (
                                                                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                                                                        {companyForm.name || <span className="text-gray-400 italic font-normal text-xs">Unset...</span>}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {renderFieldStatus(!!companyForm.name?.trim())}
                                                            </td>
                                                        </tr>

                                                        {/* NIF / NIPC */}
                                                        <tr className="hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors">
                                                            <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                                                NIF / NIPC <span className="text-red-500">*</span>
                                                            </td>
                                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                                {companyModalMode === 'edit' ? (
                                                                    <input
                                                                        type="text"
                                                                        required
                                                                        value={companyForm.nif}
                                                                        onChange={e => {
                                                                            isFormEditedRef.current = true;
                                                                            setCompanyForm({ ...companyForm, nif: e.target.value });
                                                                        }}
                                                                        className="w-full px-2.5 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-primary font-mono"
                                                                        placeholder="500000000"
                                                                    />
                                                                ) : (
                                                                    <span className="font-mono font-medium">
                                                                        {companyForm.nif || <span className="text-gray-400 italic font-normal text-xs">Unset...</span>}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {renderFieldStatus(!!companyForm.nif?.trim())}
                                                            </td>
                                                        </tr>

                                                        {/* Tipo de Empresa */}
                                                        <tr className="hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors">
                                                            <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                                                Tipo de Empresa <span className="text-red-500">*</span>
                                                            </td>
                                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                                {companyModalMode === 'edit' ? (
                                                                    <select
                                                                        value={companyForm.companyRole}
                                                                        onChange={e => {
                                                                            isFormEditedRef.current = true;
                                                                            setCompanyForm({ ...companyForm, companyRole: e.target.value });
                                                                        }}
                                                                        className="w-full px-2.5 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-primary"
                                                                    >
                                                                        {COMPANY_ROLE_OPTIONS.map(opt => (
                                                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                                        ))}
                                                                    </select>
                                                                ) : (
                                                                    <span>
                                                                        {getCompanyRoleLabel(companyForm.companyRole)}
                                                                        {companyForm.companyRole === 'outro' && companyForm.companyRoleCustom ? ` (${companyForm.companyRoleCustom})` : ''}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {renderFieldStatus(!!companyForm.companyRole)}
                                                            </td>
                                                        </tr>

                                                        {/* Natureza Jurídica */}
                                                        <tr className="hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors">
                                                            <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                                                Natureza Jurídica
                                                            </td>
                                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                                {companyModalMode === 'edit' ? (
                                                                    <select
                                                                        value={companyForm.legalForm}
                                                                        onChange={e => {
                                                                            isFormEditedRef.current = true;
                                                                            setCompanyForm({ ...companyForm, legalForm: e.target.value as any });
                                                                        }}
                                                                        className="w-full px-2.5 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-primary"
                                                                    >
                                                                        <option value="lda">Lda. (Sociedade por Quotas)</option>
                                                                        <option value="sa">S.A. (Sociedade Anónima)</option>
                                                                        <option value="unipessoal">Unipessoal Lda.</option>
                                                                        <option value="eni">ENI (Empresário em Nome Individual)</option>
                                                                        <option value="ace">ACE</option>
                                                                        <option value="outra">Outra</option>
                                                                    </select>
                                                                ) : (
                                                                    <span>
                                                                        {companyForm.legalForm === 'lda' ? 'Lda. (Sociedade por Quotas)' :
                                                                         companyForm.legalForm === 'sa' ? 'S.A. (Sociedade Anónima)' :
                                                                         companyForm.legalForm === 'unipessoal' ? 'Unipessoal Lda.' :
                                                                         companyForm.legalForm === 'eni' ? 'ENI (Empresário em Nome Individual)' :
                                                                         companyForm.legalForm === 'ace' ? 'ACE' :
                                                                         companyForm.legalForm === 'outra' ? 'Outra' : (companyForm.legalForm || <span className="text-gray-400 italic font-normal text-xs">Unset...</span>)}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {renderFieldStatus(!!companyForm.legalForm)}
                                                            </td>
                                                        </tr>

                                                        {/* Código CAE Principal */}
                                                        <tr className="hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors">
                                                            <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                                                Código CAE Principal
                                                            </td>
                                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                                {companyModalMode === 'edit' ? (
                                                                    <input
                                                                        type="text"
                                                                        value={companyForm.caeCode}
                                                                        onChange={e => {
                                                                            isFormEditedRef.current = true;
                                                                            setCompanyForm({ ...companyForm, caeCode: e.target.value });
                                                                        }}
                                                                        className="w-full px-2.5 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-primary font-mono"
                                                                        placeholder="ex: 41200"
                                                                    />
                                                                ) : (
                                                                    <span className="font-mono">
                                                                        {companyForm.caeCode || <span className="text-gray-400 italic font-normal text-xs">Unset...</span>}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {renderFieldStatus(!!companyForm.caeCode?.trim())}
                                                            </td>
                                                        </tr>

                                                        {/* Alvará / Título IMPIC */}
                                                        <tr className="hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors">
                                                            <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                                                Alvará / Título IMPIC
                                                            </td>
                                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                                {companyModalMode === 'edit' ? (
                                                                    <input
                                                                        type="text"
                                                                        value={companyForm.impic}
                                                                        onChange={e => {
                                                                            isFormEditedRef.current = true;
                                                                            setCompanyForm({ ...companyForm, impic: e.target.value });
                                                                        }}
                                                                        className="w-full px-2.5 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-primary"
                                                                        placeholder="ex: IMPIC 12345"
                                                                    />
                                                                ) : (
                                                                    <span>
                                                                        {companyForm.impic || <span className="text-gray-400 italic font-normal text-xs">Unset...</span>}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {renderFieldStatus(!!companyForm.impic?.trim())}
                                                            </td>
                                                        </tr>

                                                        {/* Atividade Principal */}
                                                        <tr className="hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors">
                                                            <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                                                Atividade Principal
                                                            </td>
                                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                                {companyModalMode === 'edit' ? (
                                                                    <input
                                                                        type="text"
                                                                        value={companyForm.activity}
                                                                        onChange={e => {
                                                                            isFormEditedRef.current = true;
                                                                            setCompanyForm({ ...companyForm, activity: e.target.value });
                                                                        }}
                                                                        className="w-full px-2.5 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-primary"
                                                                        placeholder="ex: Construção de Edifícios Residenciais"
                                                                    />
                                                                ) : (
                                                                    <span>
                                                                        {companyForm.activity || <span className="text-gray-400 italic font-normal text-xs">Unset...</span>}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {renderFieldStatus(!!companyForm.activity?.trim())}
                                                            </td>
                                                        </tr>

                                                        {/* Grupo: Contactos e Localização */}
                                                        <tr className="bg-primary/5 dark:bg-primary/10 border-y border-primary/10 dark:border-primary/20">
                                                            <td
                                                                colSpan={3}
                                                                className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-primary dark:text-primary-light"
                                                            >
                                                                Contactos e Localização
                                                            </td>
                                                        </tr>

                                                        {/* Email Geral */}
                                                        <tr className="hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors">
                                                            <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                                                Email Geral
                                                            </td>
                                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                                {companyModalMode === 'edit' ? (
                                                                    <input
                                                                        type="email"
                                                                        value={companyForm.email}
                                                                        onChange={e => {
                                                                            isFormEditedRef.current = true;
                                                                            setCompanyForm({ ...companyForm, email: e.target.value });
                                                                        }}
                                                                        className="w-full px-2.5 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-primary"
                                                                    />
                                                                ) : (
                                                                    <span>
                                                                        {companyForm.email || <span className="text-gray-400 italic font-normal text-xs">Unset...</span>}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {renderFieldStatus(!!companyForm.email?.trim())}
                                                            </td>
                                                        </tr>

                                                        {/* Telefone Geral */}
                                                        <tr className="hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors">
                                                            <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                                                Telefone Geral
                                                            </td>
                                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                                {companyModalMode === 'edit' ? (
                                                                    <input
                                                                        type="text"
                                                                        value={companyForm.phone}
                                                                        onChange={e => {
                                                                            isFormEditedRef.current = true;
                                                                            setCompanyForm({ ...companyForm, phone: e.target.value });
                                                                        }}
                                                                        className="w-full px-2.5 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-primary"
                                                                    />
                                                                ) : (
                                                                    <span>
                                                                        {companyForm.phone || <span className="text-gray-400 italic font-normal text-xs">Unset...</span>}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {renderFieldStatus(!!companyForm.phone?.trim())}
                                                            </td>
                                                        </tr>

                                                        {/* Sede / Morada */}
                                                        <tr className="hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors">
                                                            <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                                                Sede / Morada Oficial
                                                            </td>
                                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                                {companyModalMode === 'edit' ? (
                                                                    <input
                                                                        type="text"
                                                                        value={companyForm.address}
                                                                        onChange={e => {
                                                                            isFormEditedRef.current = true;
                                                                            setCompanyForm({ ...companyForm, address: e.target.value });
                                                                        }}
                                                                        className="w-full px-2.5 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-primary"
                                                                    />
                                                                ) : (
                                                                    <span>
                                                                        {companyForm.address || <span className="text-gray-400 italic font-normal text-xs">Unset...</span>}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {renderFieldStatus(!!companyForm.address?.trim())}
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* TAB 2: REQUISITOS LEGAIS (DL 273/2003) */}
                                {companyModalTab === 'legal' && (
                                    <div className="space-y-6">
                                        <div className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/40 text-xs text-[var(--text)] flex items-start gap-2.5">
                                            <Shield size={18} className="text-primary shrink-0 mt-0.5" />
                                            <div>
                                                <span className="font-bold block">Conformidade Legal & Documentação Obrigatória (DL 273/2003)</span>
                                                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                                                    Consulte o estado de validação de cada requisito legal, respetivos valores registados (apólices e datas de validade) e os comprovativos documentais anexados.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="overflow-hidden border border-gray-200 dark:border-[#444746] rounded-xl bg-white dark:bg-surface shadow-xs">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-[13px]">
                                                    <thead className="bg-gray-50/80 dark:bg-surface/80 border-b border-gray-200 dark:border-[#444746] text-gray-500 uppercase tracking-wider text-[11px] font-bold">
                                                        <tr>
                                                            <th className="px-4 py-3 min-w-[280px]">Documento</th>
                                                            <th className="px-4 py-3 min-w-[220px]">Valor Registado</th>
                                                            <th className="px-4 py-3 w-[150px] text-center">Ficheiro</th>
                                                            <th className="px-4 py-3 w-[150px] text-center">Estado</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100 dark:divide-[#444746]">
                                                        {/* Grupo: Apólices e Seguros */}
                                                        <tr className="bg-primary/5 dark:bg-primary/10 border-y border-primary/10 dark:border-primary/20">
                                                            <td
                                                                colSpan={4}
                                                                className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-primary dark:text-primary-light"
                                                            >
                                                                Apólices e Seguros Obrigatórios
                                                            </td>
                                                        </tr>

                                                        {/* Seguro Acidentes Trabalho — Apólice */}
                                                        <tr className="hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors">
                                                            <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                                                Seguro Ac. Trabalho — Apólice
                                                            </td>
                                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                                {companyModalMode === 'edit' ? (
                                                                    <input
                                                                        type="text"
                                                                        value={companyForm.insuranceWorkAccPolicy}
                                                                        onChange={e => {
                                                                            isFormEditedRef.current = true;
                                                                            setCompanyForm({ ...companyForm, insuranceWorkAccPolicy: e.target.value });
                                                                        }}
                                                                        placeholder="ex: AP-123456"
                                                                        className="w-full px-2.5 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-primary font-mono"
                                                                    />
                                                                ) : (
                                                                    <span className="font-mono">
                                                                        {companyForm.insuranceWorkAccPolicy || <span className="text-gray-400 italic font-normal text-xs">Unset...</span>}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {renderFileCell("insurance_work_accident")}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {renderFieldStatus(!!companyForm.insuranceWorkAccPolicy?.trim())}
                                                            </td>
                                                        </tr>

                                                        {/* Seguro Acidentes Trabalho — Validade */}
                                                        <tr className="hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors">
                                                            <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                                                Seguro Ac. Trabalho — Data de Validade
                                                            </td>
                                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                                {companyModalMode === 'edit' ? (
                                                                    <input
                                                                        type="date"
                                                                        value={companyForm.insuranceWorkAccDate}
                                                                        onChange={e => {
                                                                            isFormEditedRef.current = true;
                                                                            setCompanyForm({ ...companyForm, insuranceWorkAccDate: e.target.value });
                                                                        }}
                                                                        className="w-full px-2.5 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-primary"
                                                                    />
                                                                ) : (
                                                                    <span>
                                                                        {companyForm.insuranceWorkAccDate ? new Date(companyForm.insuranceWorkAccDate).toLocaleDateString() : <span className="text-gray-400 italic font-normal text-xs">Unset...</span>}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {renderFileCell("insurance_work_accident")}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {renderDateStatus(companyForm.insuranceWorkAccDate)}
                                                            </td>
                                                        </tr>

                                                        {/* Seguro Responsabilidade Civil — Apólice */}
                                                        <tr className="hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors">
                                                            <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                                                Seguro Responsabilidade Civil — Apólice
                                                            </td>
                                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                                {companyModalMode === 'edit' ? (
                                                                    <input
                                                                        type="text"
                                                                        value={companyForm.insuranceCivilPolicy}
                                                                        onChange={e => {
                                                                            isFormEditedRef.current = true;
                                                                            setCompanyForm({ ...companyForm, insuranceCivilPolicy: e.target.value });
                                                                        }}
                                                                        placeholder="ex: RC-789012"
                                                                        className="w-full px-2.5 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-primary font-mono"
                                                                    />
                                                                ) : (
                                                                    <span className="font-mono">
                                                                        {companyForm.insuranceCivilPolicy || <span className="text-gray-400 italic font-normal text-xs">Unset...</span>}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {renderFileCell("insurance_civil_liability")}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {renderFieldStatus(!!companyForm.insuranceCivilPolicy?.trim())}
                                                            </td>
                                                        </tr>

                                                        {/* Seguro Responsabilidade Civil — Validade */}
                                                        <tr className="hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors">
                                                            <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                                                Seguro Responsabilidade Civil — Data de Validade
                                                            </td>
                                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                                {companyModalMode === 'edit' ? (
                                                                    <input
                                                                        type="date"
                                                                        value={companyForm.insuranceCivilDate}
                                                                        onChange={e => {
                                                                            isFormEditedRef.current = true;
                                                                            setCompanyForm({ ...companyForm, insuranceCivilDate: e.target.value });
                                                                        }}
                                                                        className="w-full px-2.5 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-primary"
                                                                    />
                                                                ) : (
                                                                    <span>
                                                                        {companyForm.insuranceCivilDate ? new Date(companyForm.insuranceCivilDate).toLocaleDateString() : <span className="text-gray-400 italic font-normal text-xs">Unset...</span>}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {renderFileCell("insurance_civil_liability")}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {renderDateStatus(companyForm.insuranceCivilDate)}
                                                            </td>
                                                        </tr>

                                                        {/* Grupo: Regularidade Fiscal e Segurança Social */}
                                                        <tr className="bg-primary/5 dark:bg-primary/10 border-y border-primary/10 dark:border-primary/20">
                                                            <td
                                                                colSpan={4}
                                                                className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-primary dark:text-primary-light"
                                                            >
                                                                Regularidade Fiscal e Segurança Social
                                                            </td>
                                                        </tr>

                                                        {/* Certidão Não Dívida Finanças */}
                                                        <tr className="hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors">
                                                            <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                                                Certidão de Não Dívida da AT (Finanças)
                                                            </td>
                                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                                {companyModalMode === 'edit' ? (
                                                                    <input
                                                                        type="date"
                                                                        value={companyForm.cleanFinDate}
                                                                        onChange={e => {
                                                                            isFormEditedRef.current = true;
                                                                            setCompanyForm({ ...companyForm, cleanFinDate: e.target.value });
                                                                        }}
                                                                        className="w-full px-2.5 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-primary"
                                                                    />
                                                                ) : (
                                                                    <span>
                                                                        {companyForm.cleanFinDate ? new Date(companyForm.cleanFinDate).toLocaleDateString() : <span className="text-gray-400 italic font-normal text-xs">Unset...</span>}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {renderFileCell("non_debt_tax")}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {renderDateStatus(companyForm.cleanFinDate)}
                                                            </td>
                                                        </tr>

                                                        {/* Certidão Não Dívida Segurança Social */}
                                                        <tr className="hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors">
                                                            <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                                                Certidão de Não Dívida da Segurança Social
                                                            </td>
                                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                                {companyModalMode === 'edit' ? (
                                                                    <input
                                                                        type="date"
                                                                        value={companyForm.cleanSSDate}
                                                                        onChange={e => {
                                                                            isFormEditedRef.current = true;
                                                                            setCompanyForm({ ...companyForm, cleanSSDate: e.target.value });
                                                                        }}
                                                                        className="w-full px-2.5 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-primary"
                                                                    />
                                                                ) : (
                                                                    <span>
                                                                        {companyForm.cleanSSDate ? new Date(companyForm.cleanSSDate).toLocaleDateString() : <span className="text-gray-400 italic font-normal text-xs">Unset...</span>}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {renderFileCell("non_debt_ss")}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {renderDateStatus(companyForm.cleanSSDate)}
                                                            </td>
                                                        </tr>

                                                        {/* Folhas de Remuneração */}
                                                        <tr className="hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors">
                                                            <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                                                Folhas de Remunerações / Declaração DRI
                                                            </td>
                                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                                {documents.some(d => d.entityId === corporateEntityId && d.category === 'folhas_remuneracao' && !d.archived) ? (
                                                                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Documento Carregado</span>
                                                                ) : (
                                                                    <span className="text-gray-400 italic font-normal text-xs">Unset...</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {renderFileCell("folhas_remuneracao")}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {renderFieldStatus(documents.some(d => d.entityId === corporateEntityId && d.category === 'folhas_remuneracao' && !d.archived))}
                                                            </td>
                                                        </tr>

                                                        {/* Grupo: Habilitação e Saúde no Trabalho */}
                                                        <tr className="bg-primary/5 dark:bg-primary/10 border-y border-primary/10 dark:border-primary/20">
                                                            <td
                                                                colSpan={4}
                                                                className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-primary dark:text-primary-light"
                                                            >
                                                                Habilitação e Saúde no Trabalho
                                                            </td>
                                                        </tr>

                                                        {/* Alvará IMPIC */}
                                                        <tr className="hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors">
                                                            <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                                                Alvará de Construção / Título de Registo IMPIC
                                                            </td>
                                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                                {companyModalMode === 'edit' ? (
                                                                    <input
                                                                        type="text"
                                                                        value={companyForm.impic}
                                                                        onChange={e => {
                                                                            isFormEditedRef.current = true;
                                                                            setCompanyForm({ ...companyForm, impic: e.target.value });
                                                                        }}
                                                                        placeholder="ex: Alvará n.º 12345-PUB"
                                                                        className="w-full px-2.5 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-primary"
                                                                    />
                                                                ) : (
                                                                    <span>
                                                                        {companyForm.impic || <span className="text-gray-400 italic font-normal text-xs">Unset...</span>}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {renderFileCell("alvara_impic")}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {renderFieldStatus(!!companyForm.impic?.trim() || documents.some(d => d.entityId === corporateEntityId && d.category === 'alvara_impic' && !d.archived))}
                                                            </td>
                                                        </tr>

                                                        {/* Certidão Comercial / Permanente */}
                                                        <tr className="hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors">
                                                            <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                                                Certidão Comercial / Código Certidão Permanente
                                                            </td>
                                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                                {documents.some(d => d.entityId === corporateEntityId && d.category === 'certidao_comercial' && !d.archived) ? (
                                                                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Certidão Carregada</span>
                                                                ) : (
                                                                    <span className="text-gray-400 italic font-normal text-xs">Unset...</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {renderFileCell("certidao_comercial")}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {renderFieldStatus(documents.some(d => d.entityId === corporateEntityId && d.category === 'certidao_comercial' && !d.archived))}
                                                            </td>
                                                        </tr>

                                                        {/* Medicina no Trabalho */}
                                                        <tr className="hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors">
                                                            <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                                                Medicina no Trabalho (Contrato / Comprovativo SST)
                                                            </td>
                                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                                {documents.some(d => d.entityId === corporateEntityId && d.category === 'medicina_trabalho' && !d.archived) ? (
                                                                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Contrato SST Carregado</span>
                                                                ) : (
                                                                    <span className="text-gray-400 italic font-normal text-xs">Unset...</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {renderFileCell("medicina_trabalho")}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {renderFieldStatus(documents.some(d => d.entityId === corporateEntityId && d.category === 'medicina_trabalho' && !d.archived))}
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* TAB 3: DOCUMENTOS */}
                                {companyModalTab === 'documents' && (
                                    <div className="space-y-4">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[var(--bg-input)]/30 border border-[var(--border)]">
                                            <div>
                                                <h4 className="text-xs font-bold text-[var(--text)] uppercase tracking-wider">
                                                    Dossier Documental da Organização
                                                </h4>
                                                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                                                    Consulte o histórico de versões e todos os documentos anexados a esta organização.
                                                </p>
                                            </div>
                                            <DocumentUpload
                                                entityId={corporateEntityId}
                                                projectId={corporateEntityId}
                                                category="general"
                                                layout="button"
                                                label="Carregar Documento"
                                            />
                                        </div>

                                        <DocumentList
                                            entityId={corporateEntityId}
                                            projectId={corporateEntityId}
                                            isEditing={companyModalMode === 'edit'}
                                        />
                                    </div>
                                )}
                                        </>
                                    )}
                                </div>
                            )}

                            {/* ════════ TAB: PESSOAS ════════ */}
                            {activeTab === 'workers' && (
                                <div className="space-y-6">
                                    {!isWorkerModalOpen ? (
                                        <div className="space-y-4">
                                            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
                                                <div className="p-4 border-b border-[var(--border)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                                                    <div className="relative flex-1 max-w-sm">
                                                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                                                        <input
                                                            type="text"
                                                            placeholder="Pesquisar colaborador por nome, email ou NIF..."
                                                            className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-xl pl-9 pr-4 py-2 text-xs text-[var(--text)] outline-none focus:ring-2 focus:ring-primary/20"
                                                            value={searchTerm}
                                                            onChange={e => setSearchTerm(e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-2.5 py-1.5">
                                                            <Filter size={13} className="text-primary shrink-0" />
                                                            <select
                                                                value={workerProjectFilter}
                                                                onChange={e => setWorkerProjectFilter(e.target.value)}
                                                                className="bg-transparent text-xs text-[var(--text)] outline-none cursor-pointer"
                                                            >
                                                                <option value="all">Todas as Obras ({companyWorkers.length})</option>
                                                                <option value="unsynced">Não Sincronizados</option>
                                                                {userProjects.map(p => (
                                                                    <option key={p.id} value={p.id}>Obra: {p.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <span className="text-xs text-[var(--text-muted)] font-medium hidden sm:inline">
                                                            {filteredWorkers.length} colaborador(es)
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Batch Actions Bar */}
                                                {selectedWorkerIds.length > 0 && (
                                                    <div className="mx-4 my-2.5 p-3 rounded-xl bg-primary/10 border border-primary/20 flex flex-wrap items-center justify-between gap-2 animate-in fade-in">
                                                        <div className="flex items-center gap-2 text-xs font-bold text-primary">
                                                            <CheckCircle2 size={16} />
                                                            <span>{selectedWorkerIds.length} colaborador(es) selecionado(s)</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={toggleSelectAllWorkers}
                                                                className="px-2.5 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text)] font-medium cursor-pointer"
                                                            >
                                                                Desmarcar todos
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setExportEntityType('worker');
                                                                    setExportTargetProjectId(userProjects[0]?.id || '');
                                                                    setIsExportModalOpen(true);
                                                                }}
                                                                className="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                                                            >
                                                                <Share2 size={13} /> Sincronizar Selecionados com Obra
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-xs text-left min-w-[760px]">
                                                        <thead className="bg-[var(--bg-input)]/50 text-[var(--text-muted)] font-bold uppercase tracking-wider text-[10px] border-b border-[var(--border)]">
                                                            <tr>
                                                                <th className="w-10 px-4 py-3.5 text-center">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={selectedWorkerIds.length === filteredWorkers.length && filteredWorkers.length > 0}
                                                                        onChange={toggleSelectAllWorkers}
                                                                        className="rounded text-primary cursor-pointer"
                                                                        title="Selecionar todos"
                                                                    />
                                                                </th>
                                                                <th className="px-5 py-3.5">Colaborador</th>
                                                                <th className="px-5 py-3.5">Função (Norma IFC)</th>
                                                                <th className="px-5 py-3.5">Vínculo / Categoria</th>
                                                                <th className="px-5 py-3.5">Aptidão Médica (FAT)</th>
                                                                <th className="px-5 py-3.5">Sincronização</th>
                                                                <th className="px-5 py-3.5 text-right">Ação</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-[var(--border)]">
                                                            {filteredWorkers.length === 0 ? (
                                                                <tr>
                                                                    <td colSpan={7} className="px-6 py-12 text-center text-[var(--text-muted)]">
                                                                        Nenhum colaborador encontrado com os filtros atuais.
                                                                    </td>
                                                                </tr>
                                                            ) : (
                                                                filteredWorkers.map(w => {
                                                                    const syncedPrjs = getWorkerSyncedProjects(w.id, w.nif);
                                                                    const isSelected = selectedWorkerIds.includes(w.id);
                                                                    return (
                                                                        <tr 
                                                                            key={w.id} 
                                                                            onClick={() => handleOpenViewWorker(w)}
                                                                            className={cn(
                                                                                "hover:bg-[var(--bg-input)]/30 transition-colors cursor-pointer group",
                                                                                isSelected && "bg-primary/5"
                                                                            )}
                                                                        >
                                                                            <td className="w-10 px-4 py-3.5 text-center" onClick={e => e.stopPropagation()}>
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={isSelected}
                                                                                    onChange={() => toggleSelectWorker(w.id)}
                                                                                    className="rounded text-primary cursor-pointer"
                                                                                />
                                                                            </td>
                                                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                                                <div className="flex items-center gap-3">
                                                                                    <div className="w-8 h-8 rounded-full bg-blue-500/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                                                                                        {getInitials(w.name)}
                                                                                    </div>
                                                                                    <div>
                                                                                        <div className="font-bold text-xs text-[var(--text)] group-hover:text-primary transition-colors flex items-center gap-2">
                                                                                            {w.name}
                                                                                            {w.isForeign && (
                                                                                                <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                                                                                    {w.foreignCountry || 'Estrangeiro'}
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                        {w.nif && <div className="text-[10px] font-mono text-[var(--text-muted)]">NIF: {w.nif}</div>}
                                                                                    </div>
                                                                                </div>
                                                                            </td>
                                                                            <td className="px-5 py-3.5 whitespace-nowrap text-xs text-[var(--text)]">
                                                                                <span className="font-medium">{w.role || 'Colaborador'}</span>
                                                                                <div className="text-[10px] font-mono text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
                                                                                    <span className="px-1.5 py-0.2 rounded bg-primary/10 text-primary font-semibold">IFC:</span> 
                                                                                    {w.ifcLaborType || w.ifcActorRole || w.occupation || 'IfcLaborResource'}
                                                                                </div>
                                                                            </td>
                                                                            <td className="px-5 py-3.5 whitespace-nowrap text-xs">
                                                                                <div className="font-medium text-[var(--text)]">{getContractTypeLabel(w.contractType)}</div>
                                                                                <div className="text-[10px] text-[var(--text-muted)]">{getProfessionCategoryLabel(w.professionCategory)}</div>
                                                                            </td>
                                                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                                                {(() => {
                                                                                    const badge = getMedicalFitnessBadge(w.medicalFitness, w.medicalExpiry);
                                                                                    return (
                                                                                        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border", badge.color)}>
                                                                                            <Check size={10} /> {badge.label}
                                                                                            {w.medicalExpiry && <span className="opacity-80">({new Date(w.medicalExpiry).toLocaleDateString()})</span>}
                                                                                        </span>
                                                                                    );
                                                                                })()}
                                                                            </td>
                                                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                                                {syncedPrjs.length > 0 ? (
                                                                                    <span
                                                                                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                                                                        title={`Sincronizado com: ${syncedPrjs.map(p => p.projectName).join(', ')}`}
                                                                                    >
                                                                                        <Share2 size={11} className="text-emerald-600" />
                                                                                        <span>{syncedPrjs.length} {syncedPrjs.length === 1 ? 'Obra' : 'Obras'}</span>
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-[var(--text-muted)] bg-[var(--bg-input)] border border-[var(--border)]">
                                                                                        Não sincronizado
                                                                                    </span>
                                                                                )}
                                                                            </td>
                                                                            <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                                                                <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                                                                                    <button
                                                                                        onClick={() => {
                                                                                            setSelectedWorkerForExport(w);
                                                                                            setExportEntityType('worker');
                                                                                            setExportTargetProjectId(userProjects[0]?.id || '');
                                                                                            setIsExportModalOpen(true);
                                                                                        }}
                                                                                        className="p-1.5 text-[var(--text-muted)] hover:text-primary rounded-lg transition-colors cursor-pointer"
                                                                                        title="Sincronizar com Obra"
                                                                                    >
                                                                                        <Share2 size={14} />
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => handleOpenViewWorker(w)}
                                                                                        className="p-1.5 text-[var(--text-muted)] hover:text-primary rounded-lg transition-colors cursor-pointer"
                                                                                        title="Ver Ficha do Colaborador"
                                                                                    >
                                                                                        <Eye size={14} />
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => handleOpenEditWorker(w)}
                                                                                        className="p-1.5 text-[var(--text-muted)] hover:text-primary rounded-lg transition-colors cursor-pointer"
                                                                                        title="Editar Dados"
                                                                                    >
                                                                                        <Edit2 size={14} />
                                                                                    </button>
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        /* ── Detalhes do Colaborador (4 Sub-abas) ── */
                                        <div className="space-y-6">
                                            {/* TAB 1: IDENTIFICAÇÃO & CONTACTOS */}
                                            {workerModalTab === 'identification' && (
                                                <div className="overflow-hidden border border-gray-200 dark:border-[#444746] rounded-xl bg-white dark:bg-surface shadow-xs">
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-left text-[13px]">
                                                            <thead className="bg-gray-50/80 dark:bg-surface/80 border-b border-gray-200 dark:border-[#444746] text-gray-500 uppercase tracking-wider text-[11px] font-bold">
                                                                <tr>
                                                                    <th className="px-4 py-3 min-w-[220px]">Campo</th>
                                                                    <th className="px-4 py-3 min-w-[280px]">Valor Registado</th>
                                                                    <th className="px-4 py-3 w-[150px] text-center">Estado</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-100 dark:divide-[#444746]">
                                                                <tr className="bg-primary/5 dark:bg-primary/10 border-y border-primary/10 dark:border-primary/20">
                                                                    <td colSpan={3} className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-primary dark:text-primary-light">
                                                                        Identificação e Dados Pessoais (Norma IFC: IfcPerson)
                                                                    </td>
                                                                </tr>

                                                                {/* Nome Completo */}
                                                                <tr className="hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors">
                                                                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                                                        Nome Completo <span className="text-red-500">*</span>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                                        {workerModalMode === 'edit' ? (
                                                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                                                <input
                                                                                    type="text"
                                                                                    required
                                                                                    placeholder="Primeiro Nome"
                                                                                    value={workerForm.firstName}
                                                                                    onChange={e => {
                                                                                        const fn = e.target.value;
                                                                                        const fullName = [fn, workerForm.middleName, workerForm.lastName].filter(Boolean).join(' ');
                                                                                        setWorkerForm({ ...workerForm, firstName: fn, name: fullName });
                                                                                    }}
                                                                                    className="w-full px-2.5 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-primary"
                                                                                />
                                                                                <input
                                                                                    type="text"
                                                                                    placeholder="Nome do Meio"
                                                                                    value={workerForm.middleName}
                                                                                    onChange={e => {
                                                                                        const mn = e.target.value;
                                                                                        const fullName = [workerForm.firstName, mn, workerForm.lastName].filter(Boolean).join(' ');
                                                                                        setWorkerForm({ ...workerForm, middleName: mn, name: fullName });
                                                                                    }}
                                                                                    className="w-full px-2.5 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-primary"
                                                                                />
                                                                                <input
                                                                                    type="text"
                                                                                    required
                                                                                    placeholder="Último Nome"
                                                                                    value={workerForm.lastName}
                                                                                    onChange={e => {
                                                                                        const ln = e.target.value;
                                                                                        const fullName = [workerForm.firstName, workerForm.middleName, ln].filter(Boolean).join(' ');
                                                                                        setWorkerForm({ ...workerForm, lastName: ln, name: fullName });
                                                                                    }}
                                                                                    className="w-full px-2.5 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-primary"
                                                                                />
                                                                            </div>
                                                                        ) : (
                                                                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                                                                                {selectedWorker?.name || workerForm.name || <span className="text-gray-400 italic font-normal text-xs">Unset...</span>}
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        {renderFieldStatus(!!(selectedWorker?.name || workerForm.name))}
                                                                    </td>
                                                                </tr>

                                                                {/* NIF */}
                                                                <tr className="hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors">
                                                                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                                                        NIF (N.º Identificação Fiscal) <span className="text-red-500">*</span>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                                        {workerModalMode === 'edit' ? (
                                                                            <input
                                                                                type="text"
                                                                                required
                                                                                maxLength={9}
                                                                                placeholder="ex: 123456789"
                                                                                value={workerForm.nif}
                                                                                onChange={e => setWorkerForm({ ...workerForm, nif: e.target.value })}
                                                                                className="w-full sm:w-64 px-2.5 py-1.5 text-xs font-mono bg-[var(--bg-input)] border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-primary"
                                                                            />
                                                                        ) : (
                                                                            <span className="font-mono font-medium text-gray-900 dark:text-gray-100">
                                                                                {selectedWorker?.nif || workerForm.nif || <span className="text-gray-400 italic font-normal text-xs">Unset...</span>}
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        {renderFieldStatus(!!(selectedWorker?.nif || workerForm.nif))}
                                                                    </td>
                                                                </tr>

                                                                {/* NISS */}
                                                                <tr className="hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors">
                                                                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                                                        N.º Segurança Social (NISS)
                                                                    </td>
                                                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                                        {workerModalMode === 'edit' ? (
                                                                            <input
                                                                                type="text"
                                                                                maxLength={11}
                                                                                placeholder="ex: 12000000000"
                                                                                value={workerForm.ssn}
                                                                                onChange={e => setWorkerForm({ ...workerForm, ssn: e.target.value })}
                                                                                className="w-full sm:w-64 px-2.5 py-1.5 text-xs font-mono bg-[var(--bg-input)] border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-primary"
                                                                            />
                                                                        ) : (
                                                                            <span className="font-mono text-gray-900 dark:text-gray-100">
                                                                                {selectedWorker?.ssn || workerForm.ssn || <span className="text-gray-400 italic font-normal text-xs">Unset...</span>}
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        {renderFieldStatus(!!(selectedWorker?.ssn || workerForm.ssn))}
                                                                    </td>
                                                                </tr>

                                                                {/* Documento de Identificação */}
                                                                <tr className="hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors">
                                                                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                                                        Documento de Identificação
                                                                    </td>
                                                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                                        {workerModalMode === 'edit' ? (
                                                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                                                <select
                                                                                    value={workerForm.idCardType}
                                                                                    onChange={e => setWorkerForm({ ...workerForm, idCardType: e.target.value as any })}
                                                                                    className="px-2.5 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-primary"
                                                                                >
                                                                                    <option value="cc">Cartão de Cidadão</option>
                                                                                    <option value="passport">Passaporte</option>
                                                                                    <option value="residence_permit">Título de Residência</option>
                                                                                    <option value="other">Outro</option>
                                                                                </select>
                                                                                <input
                                                                                    type="text"
                                                                                    placeholder="Número do documento"
                                                                                    value={workerForm.idCardNumber}
                                                                                    onChange={e => setWorkerForm({ ...workerForm, idCardNumber: e.target.value })}
                                                                                    className="px-2.5 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-primary font-mono"
                                                                                />
                                                                                <input
                                                                                    type="date"
                                                                                    title="Data de Validade"
                                                                                    value={workerForm.idCardExpiry}
                                                                                    onChange={e => setWorkerForm({ ...workerForm, idCardExpiry: e.target.value })}
                                                                                    className="px-2.5 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-primary"
                                                                                />
                                                                            </div>
                                                                        ) : (
                                                                            <span>
                                                                                {(selectedWorker?.idCardNumber || workerForm.idCardNumber) ? (
                                                                                    <>
                                                                                        <span className="font-semibold uppercase text-gray-900 dark:text-gray-100">{selectedWorker?.idCardType || workerForm.idCardType || 'CC'}: </span>
                                                                                        <span className="font-mono">{selectedWorker?.idCardNumber || workerForm.idCardNumber}</span>
                                                                                        {(selectedWorker?.idCardExpiry || workerForm.idCardExpiry) && (
                                                                                            <span className="text-xs text-[var(--text-muted)] ml-2">
                                                                                                (Validade: {new Date(selectedWorker?.idCardExpiry || workerForm.idCardExpiry).toLocaleDateString()})
                                                                                            </span>
                                                                                        )}
                                                                                    </>
                                                                                ) : (
                                                                                    <span className="text-gray-400 italic font-normal text-xs">Unset...</span>
                                                                                )}
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        {renderDateStatus(selectedWorker?.idCardExpiry || workerForm.idCardExpiry)}
                                                                    </td>
                                                                </tr>

                                                                {/* Nacionalidade */}
                                                                <tr className="hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors">
                                                                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                                                        Nacionalidade
                                                                    </td>
                                                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                                        {workerModalMode === 'edit' ? (
                                                                            <div className="flex items-center gap-2">
                                                                                <select
                                                                                    value={workerForm.nationalityType}
                                                                                    onChange={e => setWorkerForm({ ...workerForm, nationalityType: e.target.value as any })}
                                                                                    className="px-2.5 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-primary"
                                                                                >
                                                                                    <option value="portugal">Portugal (PT)</option>
                                                                                    <option value="eu_etc">União Europeia / EEE</option>
                                                                                    <option value="other">Extracomunitário</option>
                                                                                </select>
                                                                                {workerForm.nationalityType !== 'portugal' && (
                                                                                    <input
                                                                                        type="text"
                                                                                        placeholder="País de Origem"
                                                                                        value={workerForm.foreignCountry}
                                                                                        onChange={e => setWorkerForm({ ...workerForm, foreignCountry: e.target.value })}
                                                                                        className="px-2.5 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-primary"
                                                                                    />
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            <span>
                                                                                {workerForm.nationalityType === 'other'
                                                                                    ? `Extracomunitário (${workerForm.foreignCountry || 'Outro'})`
                                                                                    : workerForm.nationalityType === 'eu_etc'
                                                                                    ? `União Europeia / EEE (${workerForm.foreignCountry || 'U.E.'})`
                                                                                    : 'Portugal (PT)'}
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        {renderFieldStatus(true)}
                                                                    </td>
                                                                </tr>

                                                                {/* Data de Nascimento & Género */}
                                                                <tr className="hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors">
                                                                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                                                        Data de Nascimento & Género
                                                                    </td>
                                                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                                        {workerModalMode === 'edit' ? (
                                                                            <div className="flex items-center gap-2">
                                                                                <input
                                                                                    type="date"
                                                                                    value={workerForm.birthDate}
                                                                                    onChange={e => setWorkerForm({ ...workerForm, birthDate: e.target.value })}
                                                                                    className="px-2.5 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-primary"
                                                                                />
                                                                                <select
                                                                                    value={workerForm.gender}
                                                                                    onChange={e => setWorkerForm({ ...workerForm, gender: e.target.value as any })}
                                                                                    className="px-2.5 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-primary"
                                                                                >
                                                                                    <option value="M">Masculino</option>
                                                                                    <option value="F">Feminino</option>
                                                                                </select>
                                                                            </div>
                                                                        ) : (
                                                                            <span>
                                                                                {(selectedWorker?.birthDate || workerForm.birthDate) ? new Date(selectedWorker?.birthDate || workerForm.birthDate).toLocaleDateString() : '---'} • {workerForm.gender === 'F' ? 'Feminino' : 'Masculino'}
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        {renderFieldStatus(!!(selectedWorker?.birthDate || workerForm.birthDate))}
                                                                    </td>
                                                                </tr>

                                                                {/* Grupo: Contactos e Residência */}
                                                                <tr className="bg-primary/5 dark:bg-primary/10 border-y border-primary/10 dark:border-primary/20">
                                                                    <td colSpan={3} className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-primary dark:text-primary-light">
                                                                        Contactos e Residência
                                                                    </td>
                                                                </tr>

                                                                {/* Email */}
                                                                <tr className="hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors">
                                                                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                                                        Email
                                                                    </td>
                                                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                                        {workerModalMode === 'edit' ? (
                                                                            <input
                                                                                type="email"
                                                                                placeholder="ex: colaborador@empresa.pt"
                                                                                value={workerForm.email}
                                                                                onChange={e => setWorkerForm({ ...workerForm, email: e.target.value })}
                                                                                className="w-full sm:w-80 px-2.5 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-primary"
                                                                            />
                                                                        ) : (
                                                                            <span>{selectedWorker?.email || workerForm.email || <span className="text-gray-400 italic font-normal text-xs">Unset...</span>}</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        {renderFieldStatus(!!(selectedWorker?.email || workerForm.email))}
                                                                    </td>
                                                                </tr>

                                                                {/* Telefone */}
                                                                <tr className="hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors">
                                                                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                                                        Contacto Telefónico
                                                                    </td>
                                                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                                        {workerModalMode === 'edit' ? (
                                                                            <input
                                                                                type="tel"
                                                                                placeholder="ex: +351 910 000 000"
                                                                                value={workerForm.phone}
                                                                                onChange={e => setWorkerForm({ ...workerForm, phone: e.target.value })}
                                                                                className="w-full sm:w-64 px-2.5 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-primary"
                                                                            />
                                                                        ) : (
                                                                            <span>{selectedWorker?.phone || workerForm.phone || <span className="text-gray-400 italic font-normal text-xs">Unset...</span>}</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        {renderFieldStatus(!!(selectedWorker?.phone || workerForm.phone))}
                                                                    </td>
                                                                </tr>

                                                                {/* Morada e Localidade */}
                                                                <tr className="hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors">
                                                                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                                                        Morada e Residência
                                                                    </td>
                                                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                                        {workerModalMode === 'edit' ? (
                                                                            <div className="space-y-2">
                                                                                <input
                                                                                    type="text"
                                                                                    placeholder="Rua, Número, Andar"
                                                                                    value={workerForm.address}
                                                                                    onChange={e => setWorkerForm({ ...workerForm, address: e.target.value })}
                                                                                    className="w-full px-2.5 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-primary"
                                                                                />
                                                                                <div className="flex gap-2">
                                                                                    <input
                                                                                        type="text"
                                                                                        placeholder="Código Postal (ex: 1000-001)"
                                                                                        value={workerForm.postalCode}
                                                                                        onChange={e => setWorkerForm({ ...workerForm, postalCode: e.target.value })}
                                                                                        className="w-36 px-2.5 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-primary"
                                                                                    />
                                                                                    <input
                                                                                        type="text"
                                                                                        placeholder="Localidade / Cidade"
                                                                                        value={workerForm.city}
                                                                                        onChange={e => setWorkerForm({ ...workerForm, city: e.target.value })}
                                                                                        className="flex-1 px-2.5 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-primary"
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <span>
                                                                                {(selectedWorker?.address || workerForm.address) ? (
                                                                                    `${selectedWorker?.address || workerForm.address}${(selectedWorker?.postalCode || workerForm.postalCode) ? `, ${selectedWorker?.postalCode || workerForm.postalCode}` : ''} ${selectedWorker?.city || workerForm.city || ''}`
                                                                                ) : (
                                                                                    <span className="text-gray-400 italic font-normal text-xs">Unset...</span>
                                                                                )}
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        {renderFieldStatus(!!(selectedWorker?.address || workerForm.address))}
                                                                    </td>
                                                                </tr>

                                                                {/* Contacto de Emergência */}
                                                                <tr className="hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors">
                                                                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                                                        Contacto de Emergência (Nome & Telefone)
                                                                    </td>
                                                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                                        {workerModalMode === 'edit' ? (
                                                                            <div className="flex gap-2">
                                                                                <input
                                                                                    type="text"
                                                                                    placeholder="Nome do Contacto"
                                                                                    value={workerForm.emergencyContactName}
                                                                                    onChange={e => setWorkerForm({ ...workerForm, emergencyContactName: e.target.value })}
                                                                                    className="flex-1 px-2.5 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-primary"
                                                                                />
                                                                                <input
                                                                                    type="tel"
                                                                                    placeholder="Telefone Emergência"
                                                                                    value={workerForm.emergencyContactPhone}
                                                                                    onChange={e => setWorkerForm({ ...workerForm, emergencyContactPhone: e.target.value })}
                                                                                    className="w-48 px-2.5 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-primary"
                                                                                />
                                                                            </div>
                                                                        ) : (
                                                                            <span>
                                                                                {(selectedWorker?.emergencyContactName || workerForm.emergencyContactName) ? (
                                                                                    `${selectedWorker?.emergencyContactName || workerForm.emergencyContactName} ${(selectedWorker?.emergencyContactPhone || workerForm.emergencyContactPhone) ? `(${selectedWorker?.emergencyContactPhone || workerForm.emergencyContactPhone})` : ''}`
                                                                                ) : (
                                                                                    <span className="text-gray-400 italic font-normal text-xs">Unset...</span>
                                                                                )}
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        {renderFieldStatus(!!(selectedWorker?.emergencyContactName || workerForm.emergencyContactName))}
                                                                    </td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}

                                            {/* TAB 2: DADOS LABORAIS & FUNÇÃO */}
                                            {workerModalTab === 'labor' && (
                                                <div className="overflow-hidden border border-gray-200 dark:border-[#444746] rounded-xl bg-white dark:bg-surface shadow-xs">
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-left text-[13px]">
                                                            <thead className="bg-gray-50/80 dark:bg-surface/80 border-b border-gray-200 dark:border-[#444746] text-gray-500 uppercase tracking-wider text-[11px] font-bold">
                                                                <tr>
                                                                    <th className="px-4 py-3 min-w-[220px]">Campo</th>
                                                                    <th className="px-4 py-3 min-w-[280px]">Valor Registado</th>
                                                                    <th className="px-4 py-3 w-[150px] text-center">Estado</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-100 dark:divide-[#444746]">
                                                                <tr className="bg-primary/5 dark:bg-primary/10 border-y border-primary/10 dark:border-primary/20">
                                                                    <td colSpan={3} className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-primary dark:text-primary-light">
                                                                        Vínculo Contratual e Função (Norma IFC: IfcLaborResource)
                                                                    </td>
                                                                </tr>

                                                                {/* Empresa Vinculada */}
                                                                <tr className="hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors">
                                                                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                                                        Empresa Vinculada (Empregador)
                                                                    </td>
                                                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">
                                                                        {companyForm.name || 'A Minha Empresa'}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        {renderFieldStatus(true)}
                                                                    </td>
                                                                </tr>

                                                                {/* Função / Cargo em Obra */}
                                                                <tr className="hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors">
                                                                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                                                        Função / Cargo em Obra <span className="text-red-500">*</span>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                                        {workerModalMode === 'edit' ? (
                                                                            <div className="space-y-2">
                                                                                <select
                                                                                    value={workerForm.workerRoleId}
                                                                                    onChange={e => {
                                                                                        const rid = e.target.value;
                                                                                        const def = getRoleDefinition(rid);
                                                                                        const roleLabel = rid === 'OTHER'
                                                                                            ? workerForm.roleCustom || 'Outra'
                                                                                            : (tRoles ? tRoles(`roles.${rid}`) : rid);
                                                                                        setWorkerForm({
                                                                                            ...workerForm,
                                                                                            workerRoleId: rid,
                                                                                            role: roleLabel,
                                                                                            occupation: def?.ifcLaborResource?.objectType || '',
                                                                                            ifcLaborType: def?.ifcLaborResource?.predefinedType || '',
                                                                                        });
                                                                                    }}
                                                                                    className="w-full px-2.5 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-primary"
                                                                                >
                                                                                    <option value="">Selecione uma função normalizada...</option>
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
                                                                                {workerForm.workerRoleId === 'OTHER' && (
                                                                                    <input
                                                                                        type="text"
                                                                                        placeholder="Designação da função personalizada"
                                                                                        value={workerForm.roleCustom}
                                                                                        onChange={e => setWorkerForm({ ...workerForm, roleCustom: e.target.value, role: e.target.value })}
                                                                                        className="w-full px-2.5 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-primary"
                                                                                    />
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                                                                                {selectedWorker?.role || workerForm.role || <span className="text-gray-400 italic font-normal text-xs">Unset...</span>}
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        {renderFieldStatus(!!(selectedWorker?.role || workerForm.role))}
                                                                    </td>
                                                                </tr>

                                                                {/* Classificação IFC */}
                                                                <tr className="hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors">
                                                                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                                                        Classificação IFC (ISO 16739)
                                                                    </td>
                                                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs">
                                                                        <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold">
                                                                            {workerForm.ifcLaborType || 'IfcLaborResource'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        {renderFieldStatus(true)}
                                                                    </td>
                                                                </tr>

                                                                {/* Categoria Profissional */}
                                                                <tr className="hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors">
                                                                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                                                        Categoria Profissional (CCT Construção)
                                                                    </td>
                                                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                                        {workerModalMode === 'edit' ? (
                                                                            <select
                                                                                value={workerForm.professionCategory}
                                                                                onChange={e => setWorkerForm({ ...workerForm, professionCategory: e.target.value as any })}
                                                                                className="px-2.5 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-primary"
                                                                            >
                                                                                <option value="oficial">Oficial</option>
                                                                                <option value="pre_oficial">Pré-Oficial</option>
                                                                                <option value="servente">Servente</option>
                                                                                <option value="encarregado">Encarregado</option>
                                                                                <option value="tecnico">Técnico / Especialista</option>
                                                                                <option value="outra">Outra</option>
                                                                            </select>
                                                                        ) : (
                                                                            <span>{getProfessionCategoryLabel(workerForm.professionCategory)}</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        {renderFieldStatus(true)}
                                                                    </td>
                                                                </tr>

                                                                {/* Tipo de Contrato */}
                                                                <tr className="hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors">
                                                                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                                                        Tipo de Contrato de Trabalho
                                                                    </td>
                                                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                                        {workerModalMode === 'edit' ? (
                                                                            <div className="flex gap-2">
                                                                                <select
                                                                                    value={workerForm.contractType}
                                                                                    onChange={e => setWorkerForm({ ...workerForm, contractType: e.target.value as any })}
                                                                                    className="px-2.5 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-primary"
                                                                                >
                                                                                    <option value="sem_termo">Contrato Sem Termo (Efetivo)</option>
                                                                                    <option value="termo_certo">A Termo Certo</option>
                                                                                    <option value="termo_incerto">A Termo Incerto</option>
                                                                                    <option value="cedencia">Cedência Ocasional</option>
                                                                                    <option value="prestacao_servicos">Prestação de Serviços</option>
                                                                                </select>
                                                                                {workerForm.contractType === 'termo_certo' && (
                                                                                    <input
                                                                                        type="date"
                                                                                        title="Data de Termo"
                                                                                        value={workerForm.contractExpiry}
                                                                                        onChange={e => setWorkerForm({ ...workerForm, contractExpiry: e.target.value })}
                                                                                        className="px-2.5 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-primary"
                                                                                    />
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            <span>
                                                                                {getContractTypeLabel(workerForm.contractType)}
                                                                                {workerForm.contractExpiry && ` (Termo: ${new Date(workerForm.contractExpiry).toLocaleDateString()})`}
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        {workerForm.contractExpiry ? renderDateStatus(workerForm.contractExpiry) : renderFieldStatus(true)}
                                                                    </td>
                                                                </tr>

                                                                {/* Horário de Trabalho */}
                                                                <tr className="hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors">
                                                                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                                                        Regime de Horário
                                                                    </td>
                                                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                                        {workerModalMode === 'edit' ? (
                                                                            <select
                                                                                value={workerForm.workSchedule}
                                                                                onChange={e => setWorkerForm({ ...workerForm, workSchedule: e.target.value as any })}
                                                                                className="px-2.5 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-primary"
                                                                            >
                                                                                <option value="normal">Horário Normal (8h/dia)</option>
                                                                                <option value="turnos">Trabalho por Turnos</option>
                                                                                <option value="isencao">Isenção de Horário</option>
                                                                            </select>
                                                                        ) : (
                                                                            <span>
                                                                                {workerForm.workSchedule === 'turnos' ? 'Trabalho por Turnos' : workerForm.workSchedule === 'isencao' ? 'Isenção de Horário' : 'Horário Normal (8h/dia)'}
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        {renderFieldStatus(true)}
                                                                    </td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}

                                            {/* TAB 3: REQUISITOS LEGAIS & MÉDICOS */}
                                            {workerModalTab === 'safety' && (
                                                <div className="overflow-hidden border border-gray-200 dark:border-[#444746] rounded-xl bg-white dark:bg-surface shadow-xs">
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-left text-[13px]">
                                                            <thead className="bg-gray-50/80 dark:bg-surface/80 border-b border-gray-200 dark:border-[#444746] text-gray-500 uppercase tracking-wider text-[11px] font-bold">
                                                                <tr>
                                                                    <th className="px-4 py-3 min-w-[220px]">Campo</th>
                                                                    <th className="px-4 py-3 min-w-[280px]">Valor Registado</th>
                                                                    <th className="px-4 py-3 w-[150px] text-center">Estado</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-100 dark:divide-[#444746]">
                                                                <tr className="bg-primary/5 dark:bg-primary/10 border-y border-primary/10 dark:border-primary/20">
                                                                    <td colSpan={3} className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-primary dark:text-primary-light">
                                                                        Saúde no Trabalho e Aptidão Médica (DL 273/2003)
                                                                    </td>
                                                                </tr>

                                                                {/* Aptidão Médica */}
                                                                <tr className="hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors">
                                                                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                                                        Aptidão Médica (FAT) <span className="text-red-500">*</span>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                                        {workerModalMode === 'edit' ? (
                                                                            <select
                                                                                value={workerForm.medicalFitness}
                                                                                onChange={e => setWorkerForm({ ...workerForm, medicalFitness: e.target.value as any })}
                                                                                className="px-2.5 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-primary font-semibold"
                                                                            >
                                                                                <option value="apto">Apto</option>
                                                                                <option value="apto_restricoes">Apto com Restrições</option>
                                                                                <option value="inapto_temp">Inapto Temporariamente</option>
                                                                                <option value="inapto">Inapto</option>
                                                                            </select>
                                                                        ) : (
                                                                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                                                                                {workerForm.medicalFitness === 'apto' ? 'Apto' : workerForm.medicalFitness === 'apto_restricoes' ? 'Apto com Restrições' : workerForm.medicalFitness === 'inapto_temp' ? 'Inapto Temporariamente' : 'Inapto'}
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        {renderFieldStatus(workerForm.medicalFitness === 'apto' || workerForm.medicalFitness === 'apto_restricoes')}
                                                                    </td>
                                                                </tr>

                                                                {/* Validade FAT */}
                                                                <tr className="hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors">
                                                                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                                                        Validade da Ficha de Aptidão Médica <span className="text-red-500">*</span>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                                        {workerModalMode === 'edit' ? (
                                                                            <input
                                                                                type="date"
                                                                                required
                                                                                value={workerForm.medicalExpiry}
                                                                                onChange={e => setWorkerForm({ ...workerForm, medicalExpiry: e.target.value })}
                                                                                className="px-2.5 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-primary"
                                                                            />
                                                                        ) : (
                                                                            <span>
                                                                                {workerForm.medicalExpiry ? new Date(workerForm.medicalExpiry).toLocaleDateString() : <span className="text-gray-400 italic font-normal text-xs">Pendente...</span>}
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        {renderDateStatus(workerForm.medicalExpiry)}
                                                                    </td>
                                                                </tr>

                                                                {/* Restrições */}
                                                                <tr className="hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors">
                                                                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                                                        Observações / Restrições Médicas
                                                                    </td>
                                                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                                        {workerModalMode === 'edit' ? (
                                                                            <input
                                                                                type="text"
                                                                                placeholder="ex: Uso obrigatório de óculos graduados; Sem trabalhos em altura"
                                                                                value={workerForm.medicalObservations}
                                                                                onChange={e => setWorkerForm({ ...workerForm, medicalObservations: e.target.value })}
                                                                                className="w-full px-2.5 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-primary"
                                                                            />
                                                                        ) : (
                                                                            <span>{workerForm.medicalObservations || <span className="text-gray-400 italic font-normal text-xs">Sem restrições registadas.</span>}</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        {renderFieldStatus(true)}
                                                                    </td>
                                                                </tr>

                                                                <tr className="bg-primary/5 dark:bg-primary/10 border-y border-primary/10 dark:border-primary/20">
                                                                    <td colSpan={3} className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-primary dark:text-primary-light">
                                                                        Equipamentos de Proteção Individual (EPI) & Seguros
                                                                    </td>
                                                                </tr>

                                                                {/* EPIs */}
                                                                <tr className="hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors">
                                                                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                                                        Registo de Entrega de EPIs
                                                                    </td>
                                                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                                        {workerModalMode === 'edit' ? (
                                                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                                                {['Capacete', 'Colete Refletor', 'Botins de Proteção', 'Luvas de Proteção', 'Óculos de Proteção', 'Proteção Auditiva'].map(epi => (
                                                                                    <label key={epi} className="flex items-center gap-1.5 text-xs cursor-pointer">
                                                                                        <input
                                                                                            type="checkbox"
                                                                                            checked={workerForm.epiDeliveryList.includes(epi)}
                                                                                            onChange={e => {
                                                                                                if (e.target.checked) {
                                                                                                    setWorkerForm({ ...workerForm, epiDeliveryList: [...workerForm.epiDeliveryList, epi] });
                                                                                                } else {
                                                                                                    setWorkerForm({ ...workerForm, epiDeliveryList: workerForm.epiDeliveryList.filter(item => item !== epi) });
                                                                                                }
                                                                                            }}
                                                                                            className="rounded text-primary"
                                                                                        />
                                                                                        <span>{epi}</span>
                                                                                    </label>
                                                                                ))}
                                                                            </div>
                                                                        ) : (
                                                                            <span>{workerForm.epiDeliveryList.length > 0 ? workerForm.epiDeliveryList.join(', ') : <span className="text-gray-400 italic font-normal text-xs">Nenhum registado</span>}</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        {renderFieldStatus(workerForm.epiDeliveryList.length > 0)}
                                                                    </td>
                                                                </tr>

                                                                {/* Data Entrega EPIs */}
                                                                <tr className="hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors">
                                                                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                                                        Data de Entrega dos EPIs
                                                                    </td>
                                                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                                        {workerModalMode === 'edit' ? (
                                                                            <input
                                                                                type="date"
                                                                                value={workerForm.epiDate}
                                                                                onChange={e => setWorkerForm({ ...workerForm, epiDate: e.target.value })}
                                                                                className="px-2.5 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-primary"
                                                                            />
                                                                        ) : (
                                                                            <span>{workerForm.epiDate ? new Date(workerForm.epiDate).toLocaleDateString() : <span className="text-gray-400 italic font-normal text-xs">Pendente...</span>}</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        {renderDateStatus(workerForm.epiDate)}
                                                                    </td>
                                                                </tr>

                                                                {/* Seguro AT */}
                                                                <tr className="hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors">
                                                                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                                                        Seguro de Acidentes de Trabalho (Empresa)
                                                                    </td>
                                                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                                        {companyForm.insuranceWorkAccPolicy ? (
                                                                            <span>Apólice {companyForm.insuranceWorkAccPolicy} (Validade: {companyForm.insuranceWorkAccDate ? new Date(companyForm.insuranceWorkAccDate).toLocaleDateString() : 'N/D'})</span>
                                                                        ) : (
                                                                            <span className="text-amber-500 font-medium">Pendente de apólice corporativa</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        {renderDateStatus(companyForm.insuranceWorkAccDate)}
                                                                    </td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}

                                            {/* TAB 4: FICHEIROS & DOCUMENTOS */}
                                            {workerModalTab === 'documents' && (
                                                <div className="space-y-4">
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[var(--bg-input)]/30 border border-[var(--border)]">
                                                        <div>
                                                            <h4 className="text-xs font-bold text-[var(--text)] uppercase tracking-wider">
                                                                Dossier Documental do Colaborador
                                                            </h4>
                                                            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                                                                Ficha de aptidão médica, certificados de formação, contrato de trabalho e comprovativos.
                                                            </p>
                                                        </div>
                                                        <DocumentUpload
                                                            entityId={editingWorkerId || 'new_worker'}
                                                            projectId={corporateEntityId}
                                                            category="worker"
                                                            layout="button"
                                                            label="Carregar Documento"
                                                        />
                                                    </div>
                                                    <DocumentList
                                                        entityId={editingWorkerId || 'new_worker'}
                                                        projectId={corporateEntityId}
                                                        isEditing={workerModalMode === 'edit'}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ════════ TAB: EQUIPAMENTOS ════════ */}
                            {activeTab === 'equipment' && (
                                !isEquipModalOpen ? (
                                    <div className="space-y-4">
                                        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
                                            <div className="p-4 border-b border-[var(--border)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                                                <div className="relative flex-1 max-w-sm">
                                                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                                                    <input
                                                        type="text"
                                                        placeholder="Pesquisar equipamento por nome ou número de série..."
                                                        className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-xl pl-9 pr-4 py-2 text-xs text-[var(--text)] outline-none focus:ring-2 focus:ring-primary/20"
                                                        value={searchTerm}
                                                        onChange={e => setSearchTerm(e.target.value)}
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2.5">
                                                    <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-2.5 py-1.5">
                                                        <Filter size={13} className="text-primary shrink-0" />
                                                        <select
                                                            value={equipProjectFilter}
                                                            onChange={e => setEquipProjectFilter(e.target.value)}
                                                            className="bg-transparent text-xs text-[var(--text)] outline-none cursor-pointer"
                                                        >
                                                            <option value="all">Todas as Obras ({companyEquipment.length})</option>
                                                            <option value="unsynced">Não Sincronizados</option>
                                                            {userProjects.map(p => (
                                                                <option key={p.id} value={p.id}>Obra: {p.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <span className="text-xs text-[var(--text-muted)] font-medium hidden sm:inline">
                                                        {filteredEquipment.length} equipamento(s)
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Batch Actions Bar */}
                                            {selectedEquipIds.length > 0 && (
                                                <div className="mx-4 my-2.5 p-3 rounded-xl bg-primary/10 border border-primary/20 flex flex-wrap items-center justify-between gap-2 animate-in fade-in">
                                                    <div className="flex items-center gap-2 text-xs font-bold text-primary">
                                                        <CheckCircle2 size={16} />
                                                        <span>{selectedEquipIds.length} equipamento(s) selecionado(s)</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={toggleSelectAllEquip}
                                                            className="px-2.5 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text)] font-medium cursor-pointer"
                                                        >
                                                            Desmarcar todos
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setExportEntityType('equipment');
                                                                setExportTargetProjectId(userProjects[0]?.id || '');
                                                                setIsExportModalOpen(true);
                                                            }}
                                                            className="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                                                        >
                                                            <Share2 size={13} /> Sincronizar Selecionados com Obra
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="overflow-x-auto">
                                                <table className="w-full text-xs text-left min-w-[700px]">
                                                    <thead className="bg-[var(--bg-input)]/50 text-[var(--text-muted)] font-bold uppercase tracking-wider text-[10px] border-b border-[var(--border)]">
                                                        <tr>
                                                            <th className="w-10 px-4 py-3.5 text-center">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedEquipIds.length === filteredEquipment.length && filteredEquipment.length > 0}
                                                                    onChange={toggleSelectAllEquip}
                                                                    className="rounded text-primary cursor-pointer"
                                                                    title="Selecionar todos"
                                                                />
                                                            </th>
                                                            <th className="px-5 py-3.5">Equipamento</th>
                                                            <th className="px-5 py-3.5">N.º Série</th>
                                                            <th className="px-5 py-3.5">Marca / Modelo</th>
                                                            <th className="px-5 py-3.5">Conformidade CE</th>
                                                            <th className="px-5 py-3.5">Sincronização</th>
                                                            <th className="px-5 py-3.5 text-right">Ação</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-[var(--border)]">
                                                        {filteredEquipment.length === 0 ? (
                                                            <tr>
                                                                <td colSpan={7} className="px-6 py-12 text-center text-[var(--text-muted)]">
                                                                    Nenhum equipamento encontrado com os filtros atuais.
                                                                </td>
                                                            </tr>
                                                        ) : (
                                                            filteredEquipment.map(eq => {
                                                                const syncedPrjs = getEquipmentSyncedProjects(eq.id, eq.serialNumber);
                                                                const isSelected = selectedEquipIds.includes(eq.id);
                                                                return (
                                                                    <tr 
                                                                        key={eq.id} 
                                                                        onClick={() => handleOpenViewEquip(eq)}
                                                                        className={cn(
                                                                            "hover:bg-[var(--bg-input)]/30 transition-colors cursor-pointer group",
                                                                            isSelected && "bg-primary/5"
                                                                        )}
                                                                    >
                                                                        <td className="w-10 px-4 py-3.5 text-center" onClick={e => e.stopPropagation()}>
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={isSelected}
                                                                                onChange={() => toggleSelectEquip(eq.id)}
                                                                                className="rounded text-primary cursor-pointer"
                                                                            />
                                                                        </td>
                                                                        <td className="px-5 py-3.5 whitespace-nowrap font-bold text-xs text-[var(--text)] group-hover:text-primary transition-colors">
                                                                            <div className="flex items-center gap-2.5">
                                                                                <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-[#4285F4] flex items-center justify-center shrink-0">
                                                                                    <Wrench size={14} />
                                                                                </div>
                                                                                <span>{eq.name}</span>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-5 py-3.5 whitespace-nowrap text-xs font-mono text-[var(--text-muted)]">
                                                                            {eq.serialNumber || '—'}
                                                                        </td>
                                                                        <td className="px-5 py-3.5 whitespace-nowrap text-xs text-[var(--text-muted)]">
                                                                            {eq.brand || eq.model ? `${eq.brand || ''} ${eq.model || ''}` : '—'}
                                                                        </td>
                                                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                                                            {eq.ceMarking ? (
                                                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200">
                                                                                    Conforme CE
                                                                                </span>
                                                                            ) : (
                                                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600">
                                                                                    Sem Certificado
                                                                                </span>
                                                                            )}
                                                                        </td>
                                                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                                                            {syncedPrjs.length > 0 ? (
                                                                                <span
                                                                                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                                                                    title={`Sincronizado com: ${syncedPrjs.map(p => p.projectName).join(', ')}`}
                                                                                >
                                                                                    <Share2 size={11} className="text-emerald-600" />
                                                                                    <span>{syncedPrjs.length} {syncedPrjs.length === 1 ? 'Obra' : 'Obras'}</span>
                                                                                </span>
                                                                            ) : (
                                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-[var(--text-muted)] bg-[var(--bg-input)] border border-[var(--border)]">
                                                                                    Não sincronizado
                                                                                </span>
                                                                            )}
                                                                        </td>
                                                                        <td className="px-5 py-3.5 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                                                                            <div className="flex items-center justify-end gap-1">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleOpenViewEquip(eq)}
                                                                                    className="p-1.5 text-[var(--text-muted)] hover:text-primary rounded-lg transition-colors cursor-pointer"
                                                                                    title="Ver Ficha Detalhada"
                                                                                >
                                                                                    <Eye size={14} />
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleOpenEditEquip(eq)}
                                                                                    className="p-1.5 text-[var(--text-muted)] hover:text-primary rounded-lg transition-colors cursor-pointer"
                                                                                    title="Editar Dados"
                                                                                >
                                                                                    <Edit2 size={14} />
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        setSelectedEquipForExport(eq);
                                                                                        setExportEntityType('equipment');
                                                                                        setExportTargetProjectId(userProjects[0]?.id || '');
                                                                                        setIsExportModalOpen(true);
                                                                                    }}
                                                                                    className="p-1.5 text-[var(--text-muted)] hover:text-primary rounded-lg transition-colors cursor-pointer"
                                                                                    title="Sincronizar com Obra"
                                                                                >
                                                                                    <Share2 size={14} />
                                                                                </button>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* In-Flow Equipment Detail View (Matching Organization & Workers Layout) */
                                    <div className="space-y-4">
                                        {/* TAB 1: IDENTIFICAÇÃO & CARACTERÍSTICAS */}
                                        {equipModalTab === 'identification' && (
                                            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-xs text-left">
                                                        <thead className="bg-gray-50/75 dark:bg-surface/50 text-[var(--text-muted)] font-semibold text-[11px] border-b border-[var(--border)]">
                                                            <tr>
                                                                <th className="px-4 py-3 w-1/3">Campo</th>
                                                                <th className="px-4 py-3 w-1/2">Valor Registado</th>
                                                                <th className="px-4 py-3 text-center">Estado</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-[var(--border)]">
                                                            {/* Category: Identificação */}
                                                            <tr className="bg-primary/5 dark:bg-primary/10 border-y border-primary/10 dark:border-primary/20">
                                                                <td colSpan={3} className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-primary dark:text-primary-light">
                                                                    Identificação e Características Técnicas (Norma IFC: IfcConstructionEquipmentResource)
                                                                </td>
                                                            </tr>

                                                            {/* Designação */}
                                                            <tr className="hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors">
                                                                <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                                                    Designação do Equipamento / Máquina <span className="text-red-500">*</span>
                                                                </td>
                                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                                    {equipModalMode === 'edit' ? (
                                                                        <input
                                                                            type="text"
                                                                            required
                                                                            placeholder="ex: Retroescavadora JCB 3CX"
                                                                            value={equipForm.name}
                                                                            onChange={e => setEquipForm({ ...equipForm, name: e.target.value })}
                                                                            className="w-full px-2.5 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-primary"
                                                                        />
                                                                    ) : (
                                                                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                                                                            {selectedEquip?.name || equipForm.name || <span className="text-gray-400 italic font-normal text-xs">Unset...</span>}
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 text-center">
                                                                    {renderFieldStatus(!!(selectedEquip?.name || equipForm.name))}
                                                                </td>
                                                            </tr>

                                                            {/* Número de Série / Matrícula */}
                                                            <tr className="hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors">
                                                                <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                                                    N.º de Série / Matrícula / Chassis
                                                                </td>
                                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                                    {equipModalMode === 'edit' ? (
                                                                        <input
                                                                            type="text"
                                                                            placeholder="ex: SN-998822 / 00-AA-00"
                                                                            value={equipForm.serialNumber}
                                                                            onChange={e => setEquipForm({ ...equipForm, serialNumber: e.target.value })}
                                                                            className="w-full sm:w-64 px-2.5 py-1.5 text-xs font-mono bg-[var(--bg-input)] border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-primary"
                                                                        />
                                                                    ) : (
                                                                        <span className="font-mono font-medium text-gray-900 dark:text-gray-100">
                                                                            {selectedEquip?.serialNumber || equipForm.serialNumber || <span className="text-gray-400 italic font-normal text-xs">Unset...</span>}
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 text-center">
                                                                    {renderFieldStatus(!!(selectedEquip?.serialNumber || equipForm.serialNumber))}
                                                                </td>
                                                            </tr>

                                                            {/* Tipo de Equipamento */}
                                                            <tr className="hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors">
                                                                <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                                                    Tipo de Equipamento (Classificação Técnica)
                                                                </td>
                                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                                    {equipModalMode === 'edit' ? (
                                                                        <select
                                                                            value={equipForm.type}
                                                                            onChange={e => setEquipForm({ ...equipForm, type: e.target.value as any })}
                                                                            className="w-full sm:w-64 px-2.5 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                                                                        >
                                                                            <option value="vehicle">Veículo / Máquina Automotriz</option>
                                                                            <option value="heavy_machinery">Máquinas Pesadas / Terraplanagem</option>
                                                                            <option value="lifting">Equipamento de Elevação de Cargas</option>
                                                                            <option value="power_tool">Ferramenta Elétrica Portátil</option>
                                                                            <option value="other">Outro Equipamento de Apoio</option>
                                                                        </select>
                                                                    ) : (
                                                                        <span className="font-medium text-gray-900 dark:text-gray-100">
                                                                            {(() => {
                                                                                const t = selectedEquip?.type || equipForm.type;
                                                                                if (t === 'vehicle') return 'Veículo / Máquina Automotriz';
                                                                                if (t === 'heavy_machinery') return 'Máquinas Pesadas / Terraplanagem';
                                                                                if (t === 'lifting') return 'Equipamento de Elevação de Cargas';
                                                                                if (t === 'power_tool') return 'Ferramenta Elétrica Portátil';
                                                                                return 'Outro Equipamento de Apoio';
                                                                            })()}
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 text-center">
                                                                    {renderFieldStatus(true)}
                                                                </td>
                                                            </tr>

                                                            {/* Marca */}
                                                            <tr className="hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors">
                                                                <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                                                    Marca do Fabricante
                                                                </td>
                                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                                    {equipModalMode === 'edit' ? (
                                                                        <input
                                                                            type="text"
                                                                            placeholder="ex: Caterpillar, JCB, Bosch..."
                                                                            value={equipForm.brand}
                                                                            onChange={e => setEquipForm({ ...equipForm, brand: e.target.value })}
                                                                            className="w-full sm:w-64 px-2.5 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-primary"
                                                                        />
                                                                    ) : (
                                                                        <span className="font-medium text-gray-900 dark:text-gray-100">
                                                                            {selectedEquip?.brand || equipForm.brand || <span className="text-gray-400 italic font-normal text-xs">Unset...</span>}
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 text-center">
                                                                    {renderFieldStatus(!!(selectedEquip?.brand || equipForm.brand))}
                                                                </td>
                                                            </tr>

                                                            {/* Modelo */}
                                                            <tr className="hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors">
                                                                <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                                                    Modelo / Versão
                                                                </td>
                                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                                    {equipModalMode === 'edit' ? (
                                                                        <input
                                                                            type="text"
                                                                            placeholder="ex: 3CX Eco Turbo"
                                                                            value={equipForm.model}
                                                                            onChange={e => setEquipForm({ ...equipForm, model: e.target.value })}
                                                                            className="w-full sm:w-64 px-2.5 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-primary"
                                                                        />
                                                                    ) : (
                                                                        <span className="font-medium text-gray-900 dark:text-gray-100">
                                                                            {selectedEquip?.model || equipForm.model || <span className="text-gray-400 italic font-normal text-xs">Unset...</span>}
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 text-center">
                                                                    {renderFieldStatus(!!(selectedEquip?.model || equipForm.model))}
                                                                </td>
                                                            </tr>

                                                            {/* Empresa Proprietária */}
                                                            <tr className="hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors">
                                                                <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                                                    Empresa Proprietária / Vínculo
                                                                </td>
                                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-5 h-5 rounded-md bg-blue-500/10 text-[#4285F4] flex items-center justify-center font-bold text-[10px]">
                                                                            <Building2 size={12} />
                                                                        </div>
                                                                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                                                                            {masterCompany?.name || userAccount?.name || 'A Minha Empresa'}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3 text-center">
                                                                    {renderFieldStatus(true)}
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}

                                        {/* TAB 2: REQUISITOS LEGAIS & SEGURANÇA */}
                                        {equipModalTab === 'safety' && (
                                            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-xs text-left">
                                                        <thead className="bg-gray-50/75 dark:bg-surface/50 text-[var(--text-muted)] font-semibold text-[11px] border-b border-[var(--border)]">
                                                            <tr>
                                                                <th className="px-4 py-3 w-1/3">Campo</th>
                                                                <th className="px-4 py-3 w-1/2">Valor Registado</th>
                                                                <th className="px-4 py-3 text-center">Estado</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-[var(--border)]">
                                                            {/* Category: Segurança */}
                                                            <tr className="bg-primary/5 dark:bg-primary/10 border-y border-primary/10 dark:border-primary/20">
                                                                <td colSpan={3} className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-primary dark:text-primary-light">
                                                                    Segurança, Marcação CE e Inspeções Periódicas (DL 50/2005)
                                                                </td>
                                                            </tr>

                                                            {/* Declaração de Conformidade CE */}
                                                            <tr className="hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors">
                                                                <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                                                    Marcação CE / Declaração de Conformidade
                                                                </td>
                                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                                    {equipModalMode === 'edit' ? (
                                                                        <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text)] cursor-pointer">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={equipForm.ceCertified}
                                                                                onChange={e => setEquipForm({ ...equipForm, ceCertified: e.target.checked })}
                                                                                className="rounded text-primary cursor-pointer w-4 h-4"
                                                                            />
                                                                            <span>Possui Declaração de Conformidade CE e Marcação CE válida</span>
                                                                        </label>
                                                                    ) : (
                                                                        equipForm.ceCertified ? (
                                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                                                <Check size={12} /> Conforme CE (Diretiva Máquinas)
                                                                            </span>
                                                                        ) : (
                                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                                                                <AlertTriangle size={12} /> Sem Declaração CE Registada
                                                                            </span>
                                                                        )
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 text-center">
                                                                    {renderFieldStatus(equipForm.ceCertified)}
                                                                </td>
                                                            </tr>

                                                            {/* Data da Próxima Inspeção Periódica */}
                                                            <tr className="hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors">
                                                                <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                                                    Data da Próxima Inspeção Periódica
                                                                </td>
                                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                                    {equipModalMode === 'edit' ? (
                                                                        <input
                                                                            type="date"
                                                                            value={equipForm.inspectionDate}
                                                                            onChange={e => setEquipForm({ ...equipForm, inspectionDate: e.target.value })}
                                                                            className="w-full sm:w-64 px-2.5 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-primary"
                                                                        />
                                                                    ) : (
                                                                        equipForm.inspectionDate ? (
                                                                            <span className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                                                                <span>{new Date(equipForm.inspectionDate).toLocaleDateString()}</span>
                                                                                {new Date(equipForm.inspectionDate) < new Date() ? (
                                                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300">
                                                                                        Expirada
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                                                                        Válida
                                                                                    </span>
                                                                                )}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-gray-400 italic font-normal text-xs">Sem data agendada</span>
                                                                        )
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 text-center">
                                                                    {renderFieldStatus(!!equipForm.inspectionDate && new Date(equipForm.inspectionDate) >= new Date())}
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}

                                        {/* TAB 3: FICHEIROS & DOCUMENTOS */}
                                        {equipModalTab === 'documents' && (
                                            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-sm p-5 space-y-4">
                                                <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                                                    <div>
                                                        <h3 className="font-bold text-sm text-[var(--text)] flex items-center gap-2">
                                                            <Folder className="text-[#4285F4]" size={16} /> Ficheiros e Documentos Comprovativos do Equipamento
                                                        </h3>
                                                        <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                                            Declarações de conformidade CE, relatórios de inspeção periódica e manuais de utilização.
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <RequirementCard
                                                        label="Declaração de Conformidade CE e Manual de Instruções"
                                                        entityId={selectedEquip?.id || editingEquipId || 'new-equip'}
                                                        projectId={corporateEntityId}
                                                        category="equipment"
                                                        isEditing={equipModalMode === 'edit'}
                                                    />
                                                    <RequirementCard
                                                        label="Relatório de Inspeção Periódica Oficial (DL 50/2005)"
                                                        entityId={selectedEquip?.id || editingEquipId || 'new-equip'}
                                                        projectId={corporateEntityId}
                                                        category="equipment"
                                                        expiryDate={equipForm.inspectionDate}
                                                        isEditing={equipModalMode === 'edit'}
                                                    />
                                                    <RequirementCard
                                                        label="Apólice de Seguro de Máquinas / Circulação (se aplicável)"
                                                        entityId={selectedEquip?.id || editingEquipId || 'new-equip'}
                                                        projectId={corporateEntityId}
                                                        category="equipment"
                                                        isEditing={equipModalMode === 'edit'}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            )}

                            {/* ════════ TAB: FORMAÇÃO ════════ */}
                            {activeTab === 'training' && (
                                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-4">
                                    <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                                        <h3 className="font-bold text-sm text-[var(--text)] flex items-center gap-2">
                                            <GraduationCap size={16} className="text-primary" /> Matriz de Competências & Formação da Empresa
                                        </h3>
                                        <span className="text-xs text-[var(--text-muted)]">
                                            {courses.length} curso(s) disponíveis
                                        </span>
                                    </div>
                                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                                        Aqui gere as ações de acolhimento, qualificações profissionais e formações de segurança atribuídas aos colaboradores da sua empresa.
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                                        {courses.map(course => (
                                            <div key={course.id} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-input)]/40 hover:border-primary/40 transition-all space-y-2">
                                                <h4 className="font-bold text-xs text-[var(--text)]">{course.title}</h4>
                                                <p className="text-[11px] text-[var(--text-muted)] line-clamp-2">{course.description || 'Sem descrição.'}</p>
                                                <div className="flex items-center justify-between pt-1 text-[10px] text-[var(--text-muted)]">
                                                    <span>Validade: {course.validityMonths ? `${course.validityMonths} meses` : 'Vitalício'}</span>
                                                    <span className="font-bold text-primary">Pronto</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ════════ TAB: DOCUMENTOS ════════ */}
                            {activeTab === 'documents' && (
                                <div className="space-y-4">
                                    {/* Clean CDE Explorer Header */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 dark:border-[#444746] gap-4">
                                        <div>
                                            <h2 className="text-xl font-normal text-google-text flex items-center gap-2">
                                                <Folder className="text-primary" size={22} />
                                                <span>Documentos da Empresa</span>
                                            </h2>
                                            {/* Breadcrumbs Navigation */}
                                            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1 flex-wrap">
                                                <span
                                                    className={cn(
                                                        "cursor-pointer transition-colors",
                                                        cdeCurrentPath.length === 0 ? "font-bold text-[var(--text)]" : "hover:underline hover:text-primary"
                                                    )}
                                                    onClick={() => setCdeCurrentPath([])}
                                                >
                                                    {companyCdeConfig?.connected
                                                        ? (companyCdeConfig.folderPath || 'SharePoint / CDE')
                                                        : 'CDE (Não Ligado)'}
                                                </span>
                                                {cdeCurrentPath.map((p, idx) => (
                                                    <span key={p.id || idx} className="flex items-center gap-1.5">
                                                        <span>/</span>
                                                        <span
                                                            className={cn(
                                                                "cursor-pointer transition-colors",
                                                                idx === cdeCurrentPath.length - 1 ? "font-bold text-[var(--text)]" : "hover:underline hover:text-primary"
                                                            )}
                                                            onClick={() => setCdeCurrentPath(cdeCurrentPath.slice(0, idx + 1))}
                                                        >
                                                            {p.name}
                                                        </span>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2.5">
                                            {/* Button: Pastas Tipo */}
                                            <button
                                                type="button"
                                                onClick={handleInitializeCompanyFolders}
                                                disabled={isInitializingFolders}
                                                className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-surface border border-gray-200 dark:border-[#444746] rounded-full hover:bg-gray-50 dark:hover:bg-[#131314] transition-all cursor-pointer shadow-xs disabled:opacity-50"
                                                title="Inicializar estrutura de pastas padronizada no CDE"
                                            >
                                                {isInitializingFolders ? (
                                                    <RotateCw size={14} className="animate-spin text-primary" />
                                                ) : (
                                                    <FolderPlus size={15} className="text-primary" />
                                                )}
                                                <span>Pastas Tipo</span>
                                            </button>

                                            {/* Button: Dropdown Novo */}
                                            <div className="relative">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (!companyCdeConfig?.connected) {
                                                            addNotification('warning', 'Ligue primeiro o CDE da sua empresa para criar pastas ou carregar ficheiros.');
                                                            setIsCdeModalOpen(true);
                                                            return;
                                                        }
                                                        setIsCdeNewMenuOpen(!isCdeNewMenuOpen);
                                                    }}
                                                    className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-primary rounded-full hover:bg-primary-hover shadow-sm transition-all cursor-pointer"
                                                >
                                                    <Plus size={15} className="text-white" />
                                                    <span>Novo</span>
                                                    <ChevronDown size={13} className="text-white/80" />
                                                </button>

                                                {isCdeNewMenuOpen && (
                                                    <>
                                                        <div className="fixed inset-0 z-40" onClick={() => setIsCdeNewMenuOpen(false)}></div>
                                                        <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-surface rounded-xl shadow-xl border border-gray-100 dark:border-[#444746] py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setIsCdeNewMenuOpen(false);
                                                                    setNewFolderParent(cdeCurrentPath.length > 0 ? cdeCurrentPath[cdeCurrentPath.length - 1].id : 'root');
                                                                    setIsNewFolderModalOpen(true);
                                                                }}
                                                                className="w-full text-left px-4 py-2.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#131314] flex items-center gap-3 cursor-pointer"
                                                            >
                                                                <GoogleDriveIcon type="folder" size={16} />
                                                                <span>Nova pasta</span>
                                                            </button>
                                                            <div className="h-px bg-gray-100 dark:bg-gray-800 my-1"></div>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setIsCdeNewMenuOpen(false);
                                                                    const currentFolder = cdeCurrentPath.length > 0 ? cdeCurrentPath.map(p => p.name).join('/') : '01-Empresa';
                                                                    setUploadDocForm(prev => ({ ...prev, folderPath: currentFolder }));
                                                                    setIsUploadDocModalOpen(true);
                                                                }}
                                                                className="w-full text-left px-4 py-2.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#131314] flex items-center gap-3 cursor-pointer"
                                                            >
                                                                <FileText size={16} className="text-primary" />
                                                                <span>Carregar ficheiro</span>
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>

                                            {/* Button: Definições CDE */}
                                            <button
                                                type="button"
                                                onClick={() => setIsCdeModalOpen(true)}
                                                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-surface border border-gray-200 dark:border-[#444746] rounded-full hover:bg-gray-50 dark:hover:bg-[#131314] transition-all cursor-pointer shadow-xs"
                                                title="Configurar integração com Cloud CDE"
                                            >
                                                <Cloud size={14} className={companyCdeConfig?.connected ? "text-emerald-500" : "text-amber-500"} />
                                                <span>CDE: {companyCdeConfig?.connected ? (companyCdeConfig.provider?.toUpperCase() || 'Cloud') : 'Não Ligado'}</span>
                                            </button>

                                            {/* Search input */}
                                            <div className="relative">
                                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                <input
                                                    type="text"
                                                    value={cdeDocSearch}
                                                    onChange={e => setCdeDocSearchTerm(e.target.value)}
                                                    placeholder="Pesquisar..."
                                                    className="bg-gray-100 dark:bg-surface border-none rounded-full pl-9 pr-4 py-1.5 text-xs w-48 sm:w-56 focus:ring-2 focus:ring-primary-light outline-none transition-all focus:bg-white dark:focus:bg-surface focus:shadow-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Main Explorer View: Left Folder Tree & Right Content Table */}
                                    <div className="flex h-[620px] gap-6 bg-white dark:bg-surface border border-gray-200 dark:border-[#444746] rounded-2xl overflow-hidden shadow-xs">
                                        {/* Left Sidebar (Tree View) */}
                                        <div className="w-64 flex-shrink-0 border-r border-gray-100 dark:border-[#444746] hidden md:flex md:flex-col p-4 h-full bg-gray-50/50 dark:bg-[#131314]/30">
                                            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] pb-2 border-b border-[var(--border)] mb-2 flex items-center justify-between">
                                                <span>Pastas CDE</span>
                                                {companyCdeConfig?.connected && (
                                                    <button
                                                        type="button"
                                                        onClick={() => loadCompanyCdeView(undefined, true)}
                                                        className="text-[10px] text-primary hover:underline cursor-pointer flex items-center gap-1"
                                                        title="Atualizar pastas do SharePoint"
                                                    >
                                                        <RotateCw size={11} className={isLoadingCdeItems ? "animate-spin" : ""} />
                                                    </button>
                                                )}
                                            </div>

                                            <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar pr-1 space-y-0.5">
                                                {!companyCdeConfig?.connected ? (
                                                    <div className="py-8 px-2 text-center text-xs text-[var(--text-muted)]">
                                                        Sem pastas (CDE não ligado)
                                                    </div>
                                                ) : (
                                                    (() => {
                                                        const renderCdeTreeItem = (
                                                            folderId: string,
                                                            folderName: string,
                                                            pathUntilNow: Array<{ id: string; name: string }>,
                                                            depth = 0
                                                        ): React.ReactNode => {
                                                            const isExpanded = cdeExpandedFolders.has(folderId);
                                                            const isCurrent =
                                                                (folderId === 'root' && cdeCurrentPath.length === 0) ||
                                                                (cdeCurrentPath.length > 0 && cdeCurrentPath[cdeCurrentPath.length - 1].id === folderId);
                                                            const children = (cdeTreeData[folderId] || []).filter(
                                                                (i: any) => i.mimeType === 'application/vnd.google-apps.folder' || (i.mimeType || '').includes('folder')
                                                            );

                                                            return (
                                                                <div key={folderId} className="select-none">
                                                                    <div
                                                                        className={cn(
                                                                            "flex items-center gap-1.5 py-1.5 px-2 rounded-lg cursor-pointer transition-colors text-xs",
                                                                            isCurrent
                                                                                ? "bg-primary-light text-primary font-bold"
                                                                                : "hover:bg-gray-200/50 dark:hover:bg-surface text-[var(--text)]"
                                                                        )}
                                                                        style={{ paddingLeft: `${depth * 14 + 8}px` }}
                                                                        onClick={() => {
                                                                            if (folderId === 'root') {
                                                                                setCdeCurrentPath([]);
                                                                            } else {
                                                                                setCdeCurrentPath(pathUntilNow);
                                                                            }
                                                                            if (!isExpanded) {
                                                                                toggleCdeTreeFolderExpand(folderId);
                                                                            }
                                                                        }}
                                                                    >
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                toggleCdeTreeFolderExpand(folderId);
                                                                            }}
                                                                            className="p-0.5 rounded hover:bg-gray-300 dark:hover:bg-surface text-gray-500 cursor-pointer shrink-0"
                                                                        >
                                                                            {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                                                                        </button>
                                                                        <GoogleDriveIcon type="folder" size={16} />
                                                                        <span className="truncate">{folderName}</span>
                                                                    </div>

                                                                    {isExpanded && children.length > 0 && (
                                                                        <div className="space-y-0.5 mt-0.5">
                                                                            {children.map((child: any) =>
                                                                                renderCdeTreeItem(
                                                                                    child.id,
                                                                                    child.name,
                                                                                    [...pathUntilNow, { id: child.id, name: child.name }],
                                                                                    depth + 1
                                                                                )
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        };

                                                        return renderCdeTreeItem(
                                                            'root',
                                                            companyCdeConfig.folderPath || 'SharePoint',
                                                            [],
                                                            0
                                                        );
                                                    })()
                                                )}
                                            </div>
                                        </div>

                                        {/* Right Main Table */}
                                        <div className="flex-1 flex flex-col min-w-0 p-4 overflow-y-auto">
                                            {!companyCdeConfig?.connected ? (
                                                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                                                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
                                                        <Cloud size={28} />
                                                    </div>
                                                    <h3 className="text-sm font-bold text-[var(--text)] mb-1">
                                                        Nenhum CDE conectado a esta conta
                                                    </h3>
                                                    <p className="text-xs text-[var(--text-muted)] max-w-md mb-5 leading-relaxed">
                                                        Para visualizar e gerir as pastas reais da sua empresa no SharePoint, OneDrive ou Google Drive, configure primeiro a ligação ao Ambiente Comum de Dados (CDE) desta conta.
                                                    </p>
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsCdeModalOpen(true)}
                                                        className="px-4 py-2 rounded-full text-xs font-bold bg-primary text-white hover:bg-primary-hover shadow-sm transition-all cursor-pointer inline-flex items-center gap-2"
                                                    >
                                                        <Cloud size={14} />
                                                        <span>Configurar Ligação CDE</span>
                                                    </button>
                                                </div>
                                            ) : isLoadingCdeItems ? (
                                                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-400">
                                                    <RotateCw size={26} className="animate-spin text-primary mb-3" />
                                                    <p className="text-xs">A carregar pastas e documentos do CDE ({companyCdeConfig.folderPath || 'SharePoint'})...</p>
                                                </div>
                                            ) : (
                                                <table className="w-full text-left text-xs text-gray-600 dark:text-gray-300">
                                                    <thead>
                                                        <tr className="border-b border-gray-200 dark:border-[#444746] text-gray-400 font-normal">
                                                            <th className="py-2.5 px-3 font-normal w-10 text-center">#</th>
                                                            <th className="py-2.5 px-3 font-normal">Nome</th>
                                                            <th className="py-2.5 px-3 font-normal w-36">Data</th>
                                                            <th className="py-2.5 px-3 font-normal w-24">Tamanho</th>
                                                            <th className="w-20 text-right pr-4">Ações</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {/* Parent navigation row */}
                                                        {cdeCurrentPath.length > 0 && (
                                                            <tr
                                                                className="hover:bg-gray-50 dark:hover:bg-[#131314] border-b border-gray-100 dark:border-gray-800 cursor-pointer group"
                                                                onClick={() => setCdeCurrentPath(cdeCurrentPath.slice(0, cdeCurrentPath.length - 1))}
                                                            >
                                                                <td className="py-2 px-3 text-center">
                                                                    <div className="flex justify-center">
                                                                        <GoogleDriveIcon type="folder" size={20} />
                                                                    </div>
                                                                </td>
                                                                <td className="py-2 px-3 font-medium text-gray-500" colSpan={4}>
                                                                    .. (Voltar para pasta anterior)
                                                                </td>
                                                            </tr>
                                                        )}

                                                        {(() => {
                                                            let visibleItems = [...cdeDriveItems];
                                                            if (cdeDocSearch.trim()) {
                                                                const q = cdeDocSearch.toLowerCase();
                                                                visibleItems = visibleItems.filter((item: any) => (item.name || '').toLowerCase().includes(q));
                                                            }

                                                            // Sort folders first, then alphabetically
                                                            visibleItems.sort((a: any, b: any) => {
                                                                const aIsFolder = a.mimeType === 'application/vnd.google-apps.folder' || (a.mimeType || '').includes('folder');
                                                                const bIsFolder = b.mimeType === 'application/vnd.google-apps.folder' || (b.mimeType || '').includes('folder');
                                                                if (aIsFolder && !bIsFolder) return -1;
                                                                if (!aIsFolder && bIsFolder) return 1;
                                                                return String(a.name || '').localeCompare(String(b.name || ''), undefined, { numeric: true });
                                                            });

                                                            if (visibleItems.length === 0) {
                                                                return (
                                                                    <tr>
                                                                        <td colSpan={5} className="py-12 text-center text-gray-400">
                                                                            <GoogleDriveIcon type="default" size={40} className="mx-auto mb-2 opacity-20" />
                                                                            <p className="text-xs font-medium text-[var(--text)] mb-1">
                                                                                Nenhum documento ou pasta encontrado nesta localização do CDE.
                                                                            </p>
                                                                            {cdeLoadError && (
                                                                                <p className="text-[11px] text-red-500 mb-2">
                                                                                    Erro: {cdeLoadError}
                                                                                </p>
                                                                            )}
                                                                            <p className="text-[11px] text-[var(--text-muted)] mb-4">
                                                                                Fornecedor: <strong>{companyCdeConfig.provider?.toUpperCase()}</strong> • Pasta base: <strong>{companyCdeConfig.folderPath || 'Raiz'}</strong>
                                                                            </p>
                                                                            <div className="flex items-center justify-center gap-2">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => loadCompanyCdeView(undefined, true)}
                                                                                    className="px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-[var(--text)] hover:bg-gray-200 transition-all cursor-pointer inline-flex items-center gap-1.5"
                                                                                >
                                                                                    <RotateCw size={12} /> Recarregar Conteúdos
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={handleInitializeCompanyFolders}
                                                                                    className="px-3 py-1.5 rounded-full text-xs font-semibold bg-primary text-white hover:bg-primary-hover shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
                                                                                >
                                                                                    <FolderPlus size={12} /> Criar Pastas Tipo
                                                                                </button>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            }

                                                            return visibleItems.map((item: any) => {
                                                                const isFolder = item.mimeType === 'application/vnd.google-apps.folder' || (item.mimeType || '').includes('folder');
                                                                const displayDate = item.modifiedTime ? new Date(item.modifiedTime).toLocaleDateString() : '—';
                                                                const displaySize = !isFolder && item.size
                                                                    ? (Number(item.size) > 1048576
                                                                        ? `${(Number(item.size) / 1048576).toFixed(1)} MB`
                                                                        : `${Math.max(1, Math.round(Number(item.size) / 1024))} KB`)
                                                                    : '—';

                                                                return (
                                                                    <tr
                                                                        key={item.id}
                                                                        className="hover:bg-gray-50 dark:hover:bg-[#131314] border-b border-gray-100 dark:border-gray-800 cursor-pointer group"
                                                                        onClick={() => {
                                                                            if (isFolder) {
                                                                                setCdeCurrentPath([...cdeCurrentPath, { id: item.id, name: item.name }]);
                                                                            } else if (item.webViewLink) {
                                                                                window.open(item.webViewLink, '_blank');
                                                                            }
                                                                        }}
                                                                    >
                                                                        <td className="py-2 px-3 text-center">
                                                                            <div className="flex justify-center">
                                                                                <GoogleDriveIcon type={isFolder ? 'folder' : (item.mimeType || 'pdf')} size={20} />
                                                                            </div>
                                                                        </td>
                                                                        <td className="py-2 px-3">
                                                                            <span className={cn(
                                                                                "block group-hover:text-primary transition-colors",
                                                                                isFolder ? "font-semibold text-gray-900 dark:text-white" : "font-medium text-gray-900 dark:text-white"
                                                                            )}>
                                                                                {item.name}
                                                                            </span>
                                                                        </td>
                                                                        <td className="py-2 px-3 text-gray-500 font-mono">
                                                                            {displayDate}
                                                                        </td>
                                                                        <td className="py-2 px-3 text-gray-500 font-mono">
                                                                            {displaySize}
                                                                        </td>
                                                                        <td className="py-2 px-3 text-right pr-4">
                                                                            {isFolder ? (
                                                                                <ChevronRight size={14} className="inline text-gray-400 group-hover:text-primary transition-colors" />
                                                                            ) : (
                                                                                item.webViewLink && (
                                                                                    <a
                                                                                        href={item.webViewLink}
                                                                                        target="_blank"
                                                                                        rel="noopener noreferrer"
                                                                                        onClick={(e) => e.stopPropagation()}
                                                                                        className="p-1 rounded-full text-gray-400 hover:text-primary hover:bg-blue-50 dark:hover:bg-blue-950/40 inline-flex"
                                                                                        title="Abrir no SharePoint / Cloud"
                                                                                    >
                                                                                        <ExternalLink size={15} />
                                                                                    </a>
                                                                                )
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            });
                                                        })()}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ════════ TAB: CONFIGURAÇÕES ════════ */}
                            {activeTab === 'settings' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    {/* Navigation Tabs (Segmented Bar) */}
                                    <div className="flex items-center gap-2 border-b border-[var(--border)] overflow-x-auto pb-1 scrollbar-none">
                                        <button
                                            type="button"
                                            onClick={() => setSettingsSubTab('cde')}
                                            className={cn(
                                                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                                                settingsSubTab === 'cde'
                                                    ? "bg-primary text-white shadow-sm"
                                                    : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-input)]"
                                            )}
                                        >
                                            <FlatDocumentsIcon size={16} /> Integrações &amp; CDE
                                            {companyCdeConfig?.connected && (
                                                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                            )}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setSettingsSubTab('profiles')}
                                            className={cn(
                                                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                                                settingsSubTab === 'profiles'
                                                    ? "bg-primary text-white shadow-sm"
                                                    : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-input)]"
                                            )}
                                        >
                                            <FlatSettingsIcon size={16} /> Perfis de Documentos &amp; Metadados
                                        </button>
                                    </div>

                                    {/* ── SUB-TAB: INTEGRAÇÕES & CDE ── */}
                                    {settingsSubTab === 'cde' && (
                                        <div className="space-y-6">
                                            {/* Main CDE Dashboard Card */}
                                            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
                                                <div className="p-6 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-50/40 via-transparent to-transparent dark:from-blue-950/20">
                                                    <div className="flex items-start gap-4">
                                                        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20 shadow-sm">
                                                            <Cloud size={26} />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2.5">
                                                                <h3 className="text-lg font-bold text-[var(--text)]">
                                                                    Ambiente Comum de Dados (CDE) da Empresa
                                                                </h3>
                                                                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hidden sm:inline-block">
                                                                    ISO 19650 &amp; DL 273/2003
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-[var(--text-muted)] mt-1 max-w-2xl leading-relaxed">
                                                                Repositório corporativo para sincronização bidirecional de documentação legal, certidões permanentes, apólices de seguros, alvarás IMPIC e fichas de colaboradores e equipamentos.
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col sm:items-end gap-2 shrink-0">
                                                        <span className={cn(
                                                            "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border self-start sm:self-auto shadow-sm",
                                                            companyCdeConfig?.connected
                                                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                                                : "bg-gray-500/10 text-[var(--text-muted)] border-[var(--border)]"
                                                        )}>
                                                            <span className={cn("w-2 h-2 rounded-full", companyCdeConfig?.connected ? "bg-emerald-500 animate-pulse" : "bg-gray-400")} />
                                                            {companyCdeConfig?.connected ? `Conectado (${companyCdeConfig.provider?.toUpperCase()})` : 'Desconectado'}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="p-6 space-y-6">
                                                    {/* Status Summary & Details */}
                                                    {companyCdeConfig?.connected ? (
                                                        <div className="p-5 rounded-2xl bg-[var(--bg-input)]/40 border border-[var(--border)] space-y-4">
                                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                                                                <div className="space-y-1">
                                                                    <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Provedor Ativo</span>
                                                                    <span className="font-bold text-sm text-[var(--text)] capitalize flex items-center gap-2">
                                                                        <Cloud size={16} className="text-primary" />
                                                                        {companyCdeConfig.provider === 'onedrive' ? 'Microsoft SharePoint' :
                                                                         companyCdeConfig.provider === 'gdrive' ? 'Google Drive' :
                                                                         companyCdeConfig.provider === 'dropbox' ? 'Dropbox Business' : 'Servidor Próprio / WebDAV'}
                                                                    </span>
                                                                </div>

                                                                <div className="space-y-1">
                                                                    <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Destino da Pasta</span>
                                                                    <span className="font-mono text-xs text-[var(--text)] truncate block" title={companyCdeConfig.folderPath || companyCdeConfig.folderUrl || companyCdeConfig.siteUrl || '/'}>
                                                                        {companyCdeConfig.folderPath || companyCdeConfig.folderUrl || companyCdeConfig.siteUrl || 'Pasta Principal'}
                                                                    </span>
                                                                </div>

                                                                <div className="space-y-1">
                                                                    <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Última Sincronização</span>
                                                                    <span className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
                                                                        <Clock size={14} />
                                                                        {companyCdeConfig.lastSync ? new Date(companyCdeConfig.lastSync).toLocaleString('pt-PT') : 'Conectado'}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)]">
                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={handleInitializeCompanyFolders}
                                                                        disabled={isInitializingFolders}
                                                                        className="px-3.5 py-2 rounded-xl bg-white dark:bg-surface border border-gray-200 dark:border-[#444746] hover:bg-gray-50 dark:hover:bg-[#131314] text-xs font-semibold text-[var(--text)] transition-all flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                                                                        title="Verificar ou criar estrutura tipo no CDE"
                                                                    >
                                                                        {isInitializingFolders ? <RotateCw size={14} className="animate-spin text-primary" /> : <FolderPlus size={14} className="text-primary" />}
                                                                        <span>Pastas Tipo ISO 19650</span>
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setActiveTab('documents')}
                                                                        className="px-3.5 py-2 rounded-xl bg-white dark:bg-surface border border-gray-200 dark:border-[#444746] hover:bg-gray-50 dark:hover:bg-[#131314] text-xs font-semibold text-[var(--text)] transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                                                                    >
                                                                        <Folder size={14} className="text-primary" />
                                                                        <span>Explorador de Documentos</span>
                                                                    </button>
                                                                </div>

                                                                <button
                                                                    type="button"
                                                                    onClick={() => setIsCdeModalOpen(true)}
                                                                    className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                                                                >
                                                                    <SettingsIcon size={14} />
                                                                    <span>Alterar Definições do CDE</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="p-6 rounded-2xl bg-[var(--bg-input)]/30 border border-dashed border-[var(--border)] text-center space-y-4">
                                                            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
                                                                <Cloud size={24} />
                                                            </div>
                                                            <div className="max-w-md mx-auto space-y-1">
                                                                <h4 className="text-sm font-bold text-[var(--text)]">
                                                                    Nenhum Armazenamento Conectado a esta Empresa
                                                                </h4>
                                                                <p className="text-xs text-[var(--text-muted)]">
                                                                    Ligue o SharePoint da sua organização, Google Drive, Dropbox ou servidor privado para sincronização em tempo real de documentos e requisitos legais.
                                                                </p>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => setIsCdeModalOpen(true)}
                                                                className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all inline-flex items-center gap-2 shadow-md cursor-pointer"
                                                            >
                                                                <Cloud size={15} />
                                                                <span>Configurar Ambiente Comum de Dados (CDE)</span>
                                                            </button>
                                                        </div>
                                                    )}

                                                    {/* Supported Providers Simplified */}
                                                    <div className="pt-2 border-t border-[var(--border)]">
                                                        <span className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2.5">
                                                            Provedores Suportados pelo Safety1irst
                                                        </span>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-input)]/40 text-xs text-[var(--text)] font-medium">
                                                                <Cloud size={14} className="text-primary" />
                                                                <span>Microsoft SharePoint / OneDrive</span>
                                                            </div>
                                                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-input)]/40 text-xs text-[var(--text)] font-medium">
                                                                <GoogleDriveIcon type="folder" size={14} />
                                                                <span>Google Drive</span>
                                                            </div>
                                                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-input)]/40 text-xs text-[var(--text)] font-medium">
                                                                <Cloud size={14} className="text-indigo-500" />
                                                                <span>Dropbox Business</span>
                                                            </div>
                                                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-input)]/40 text-xs text-[var(--text)] font-medium">
                                                                <Server size={14} className="text-purple-500" />
                                                                <span>Servidor Próprio (WebDAV / Nextcloud / S3)</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* ── SUB-TAB: PERFIS DE DOCUMENTOS ── */}
                                    {settingsSubTab === 'profiles' && (
                                        <div className="space-y-6">
                                            {/* Perfis de Dados e Metadados Card */}
                                            <div className="p-6 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-sm space-y-6">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                                                            <FlatSettingsIcon size={20} />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-base font-bold text-[var(--text)]">
                                                                Perfis de Documentos &amp; Metadados
                                                            </h3>
                                                            <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                                                Configure os campos de informação, formulários, prazos de validade e categorias de documentação exigidos aos intervenientes da sua empresa.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/40 text-xs text-[var(--text)] flex items-start gap-2.5">
                                                    <Shield size={18} className="text-primary shrink-0 mt-0.5" />
                                                    <div>
                                                        <span className="font-bold block">Normalização Legal e Conformidade (DL 273/2003 &amp; ISO 19650)</span>
                                                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                                                            Os perfis de documentação determinam que documentos obrigatórios (seguros, aptidão médica, entrega de EPI, declarações CE) são solicitados em cada ficha e sincronizados com os estaleiros de obra.
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                    <button
                                                        type="button"
                                                        onClick={() => { setProfileModalType('company'); setIsProfileModalOpen(true); }}
                                                        className="p-5 border border-[var(--border)] rounded-2xl bg-[var(--bg-input)]/30 hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-3 group text-center cursor-pointer shadow-xs"
                                                    >
                                                        <div className="w-12 h-12 bg-blue-500/10 text-primary rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform border border-blue-500/20">
                                                            <FlatCompaniesIcon size={22} />
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-xs text-[var(--text)] mb-0.5">Organizações</div>
                                                            <div className="text-[11px] text-[var(--text-muted)]">Campos e perfis empresariais (Seguros, Finanças, SS, IMPIC)</div>
                                                        </div>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => { setProfileModalType('worker'); setIsProfileModalOpen(true); }}
                                                        className="p-5 border border-[var(--border)] rounded-2xl bg-[var(--bg-input)]/30 hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-3 group text-center cursor-pointer shadow-xs"
                                                    >
                                                        <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform border border-emerald-500/20">
                                                            <FlatWorkersIcon size={22} />
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-xs text-[var(--text)] mb-0.5">Pessoas</div>
                                                            <div className="text-[11px] text-[var(--text-muted)]">Fichas e aptidão de colaboradores (FAT Médica, EPI, Contratos)</div>
                                                        </div>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => { setProfileModalType('equipment'); setIsProfileModalOpen(true); }}
                                                        className="p-5 border border-[var(--border)] rounded-2xl bg-[var(--bg-input)]/30 hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-3 group text-center cursor-pointer shadow-xs"
                                                    >
                                                        <div className="w-12 h-12 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform border border-amber-500/20">
                                                            <FlatEquipmentIcon size={22} />
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-xs text-[var(--text)] mb-0.5">Equipamentos</div>
                                                            <div className="text-[11px] text-[var(--text-muted)]">Inspeções e fichas de maquinaria (Conformidade CE, Manutenções)</div>
                                                        </div>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                                </div>
                            </div>

                            {/* Sticky Footer when editing in Organization, Workers or Equipment tabs */}
                            {(
                                (activeTab === 'organization' && isCompanyModalOpen && companyModalMode === 'edit') ||
                                (activeTab === 'workers' && isWorkerModalOpen && workerModalMode === 'edit') ||
                                (activeTab === 'equipment' && isEquipModalOpen && equipModalMode === 'edit')
                            ) && (
                                <div className="border-t border-gray-200 dark:border-[#444746] bg-white dark:bg-surface p-4 sticky bottom-0 z-20 shadow-xs">
                                    <div className="max-w-7xl mx-auto flex items-center justify-end gap-3">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (activeTab === 'organization') handleCancelCompanyEdit();
                                                else if (activeTab === 'workers') {
                                                    if (selectedWorker) handleOpenViewWorker(selectedWorker);
                                                    else setIsWorkerModalOpen(false);
                                                } else if (activeTab === 'equipment') {
                                                    if (selectedEquip) handleOpenViewEquip(selectedEquip);
                                                    else setIsEquipModalOpen(false);
                                                }
                                            }}
                                            className="px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-surface border border-gray-300 dark:border-[#444746] rounded-lg hover:bg-gray-100 dark:hover:bg-[#131314] transition-colors shadow-xs cursor-pointer"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                if (activeTab === 'organization') {
                                                    handleSaveCompany(e);
                                                    setCompanyModalMode('view');
                                                } else if (activeTab === 'workers') {
                                                    handleSaveWorker(e);
                                                } else if (activeTab === 'equipment') {
                                                    handleSaveEquipment(e);
                                                }
                                            }}
                                            className="px-4 py-2 text-xs font-semibold text-white bg-[#4285F4] hover:bg-[#3367D6] dark:hover:bg-[#1A73E8] rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                                        >
                                            <Save size={14} /> Guardar Alterações
                                        </button>
                                    </div>
                                </div>
                            )}
                        </main>
                    </div>

                    {/* ════════ MODALS ════════ */}
{/* Modal Sincronizar com Obra */}
                    <Modal
                        title={
                            exportEntityType === 'company' ? "Sincronizar Empresa com Obra" :
                            exportEntityType === 'worker' ? "Sincronizar Colaborador com Obra" :
                            "Sincronizar Equipamento com Obra"
                        }
                        isOpen={isExportModalOpen}
                        onClose={() => setIsExportModalOpen(false)}
                    >
                        <form onSubmit={handlePerformExport} className="space-y-4">
                            {userProjects.length === 0 ? (
                                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-700 dark:text-amber-400 text-xs">
                                    Não tem obras associadas na página "Os Meus Projetos". Crie ou junte-se a uma obra no Workplace para poder efetuar a sincronização.
                                </div>
                            ) : (
                                <>
                                    <InputGroup label="Selecione a Obra de Destino *">
                                        <select
                                            value={exportTargetProjectId}
                                            onChange={e => setExportTargetProjectId(e.target.value)}
                                            required
                                            className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                        >
                                            {userProjects.map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name} {p.code ? `(${p.code})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </InputGroup>

                                    {exportEntityType === 'company' && (
                                        <>
                                            <InputGroup label="Papel / Função da Empresa na Obra *">
                                                <select
                                                    value={exportProjectRole}
                                                    onChange={e => setExportProjectRole(e.target.value)}
                                                    className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                                >
                                                    <option value="subempreiteiro">Subempreiteiro</option>
                                                    <option value="empreiteiro_geral">Empreiteiro Geral</option>
                                                    <option value="prestador_servicos">Prestador de Serviços</option>
                                                    <option value="instalador">Instalador Especializado</option>
                                                    <option value="fornecedor">Fornecedor com Montagem</option>
                                                    <option value="fiscalizacao">Fiscalização / Coordenação</option>
                                                    <option value="dono_obra">Dono de Obra</option>
                                                </select>
                                            </InputGroup>

                                            <div className="p-3.5 bg-[var(--bg-input)]/50 border border-[var(--border)] rounded-xl space-y-2">
                                                <div className="text-[11px] font-bold text-[var(--text)] flex items-center gap-1.5">
                                                    <Shield size={13} className="text-primary" />
                                                    Compatibilização Legal DL 273/2003
                                                </div>
                                                <div className="space-y-1 text-[11px] text-[var(--text-muted)]">
                                                    <div className="flex items-center justify-between">
                                                        <span>Seguro Acidentes de Trabalho:</span>
                                                        <span className={cn("font-medium", companyForm.insuranceWorkAccDate ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500")}>
                                                            {companyForm.insuranceWorkAccDate ? `Válido até ${new Date(companyForm.insuranceWorkAccDate).toLocaleDateString()}` : 'Pendente'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span>Seguro Responsabilidade Civil:</span>
                                                        <span className={cn("font-medium", companyForm.insuranceCivilDate ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500")}>
                                                            {companyForm.insuranceCivilDate ? `Válido até ${new Date(companyForm.insuranceCivilDate).toLocaleDateString()}` : 'Pendente'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span>Certidão Seg. Social:</span>
                                                        <span className={cn("font-medium", companyForm.cleanSSDate ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500")}>
                                                            {companyForm.cleanSSDate ? `Válida até ${new Date(companyForm.cleanSSDate).toLocaleDateString()}` : 'Pendente'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span>Certidão Finanças:</span>
                                                        <span className={cn("font-medium", companyForm.cleanFinDate ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500")}>
                                                            {companyForm.cleanFinDate ? `Válida até ${new Date(companyForm.cleanFinDate).toLocaleDateString()}` : 'Pendente'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {exportEntityType === 'worker' && selectedWorkerIds.length > 0 && (
                                        <div className="p-3.5 bg-primary/5 border border-primary/20 rounded-xl space-y-2">
                                            <div className="text-xs font-bold text-primary flex items-center gap-1.5">
                                                <Users size={14} />
                                                <span>Sincronizar {selectedWorkerIds.length} Colaboradores Selecionados</span>
                                            </div>
                                            <p className="text-[11px] text-[var(--text-muted)]">
                                                Os colaboradores selecionados e todas as suas respetivas formações profissionais serão sincronizados automaticamente com a obra de destino.
                                            </p>
                                            <div className="max-h-28 overflow-y-auto space-y-1 pt-1">
                                                {companyWorkers.filter(w => selectedWorkerIds.includes(w.id)).map(w => (
                                                    <div key={w.id} className="text-[11px] flex items-center justify-between py-0.5 px-2 rounded bg-[var(--bg-input)]/50">
                                                        <span className="font-medium text-[var(--text)]">{w.name}</span>
                                                        <span className="text-[10px] text-[var(--text-muted)]">{w.role || 'Colaborador'}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {exportEntityType === 'worker' && selectedWorkerIds.length === 0 && selectedWorkerForExport && (
                                        <div className="p-3.5 bg-[var(--bg-input)]/50 border border-[var(--border)] rounded-xl space-y-2">
                                            <div className="text-[11px] font-bold text-[var(--text)]">
                                                {selectedWorkerForExport.name} ({selectedWorkerForExport.role || 'Colaborador'})
                                            </div>
                                            <div className="space-y-1 text-[11px] text-[var(--text-muted)]">
                                                <div className="flex items-center justify-between">
                                                    <span>Ficha de Aptidão Médica:</span>
                                                    <span className={cn("font-medium", selectedWorkerForExport.medicalExpiry ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500")}>
                                                        {selectedWorkerForExport.medicalExpiry ? `Válida até ${new Date(selectedWorkerForExport.medicalExpiry).toLocaleDateString()}` : 'Pendente'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span>Cartão de Acesso / NIF:</span>
                                                    <span className="font-mono text-[var(--text)]">{selectedWorkerForExport.nif || selectedWorkerForExport.accessCardCode || '—'}</span>
                                                </div>
                                                <div className="flex items-center justify-between pt-1 border-t border-[var(--border)]">
                                                    <span className="text-primary font-medium">Formação Profissional:</span>
                                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Segue com o trabalhador</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {exportEntityType === 'equipment' && selectedEquipIds.length > 0 && (
                                        <div className="p-3.5 bg-primary/5 border border-primary/20 rounded-xl space-y-2">
                                            <div className="text-xs font-bold text-primary flex items-center gap-1.5">
                                                <Wrench size={14} />
                                                <span>Sincronizar {selectedEquipIds.length} Equipamentos Selecionados</span>
                                            </div>
                                            <p className="text-[11px] text-[var(--text-muted)]">
                                                As máquinas e equipamentos selecionados serão registados no estaleiro com respetiva conformidade legal CE.
                                            </p>
                                            <div className="max-h-28 overflow-y-auto space-y-1 pt-1">
                                                {companyEquipment.filter(e => selectedEquipIds.includes(e.id)).map(e => (
                                                    <div key={e.id} className="text-[11px] flex items-center justify-between py-0.5 px-2 rounded bg-[var(--bg-input)]/50">
                                                        <span className="font-medium text-[var(--text)]">{e.name}</span>
                                                        <span className="text-[10px] font-mono text-[var(--text-muted)]">{e.serialNumber || 'S/N'}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {exportEntityType === 'equipment' && selectedEquipIds.length === 0 && selectedEquipForExport && (
                                        <div className="p-3.5 bg-[var(--bg-input)]/50 border border-[var(--border)] rounded-xl space-y-2">
                                            <div className="text-[11px] font-bold text-[var(--text)]">
                                                {selectedEquipForExport.name} {selectedEquipForExport.serialNumber ? `(S/N: ${selectedEquipForExport.serialNumber})` : ''}
                                            </div>
                                            <div className="space-y-1 text-[11px] text-[var(--text-muted)]">
                                                <div className="flex items-center justify-between">
                                                    <span>Declaração CE:</span>
                                                    <span className={cn("font-medium", selectedEquipForExport.ceMarking ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500")}>
                                                        {selectedEquipForExport.ceMarking ? 'Conforme CE' : 'Sem Certificado'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span>Inspeção Periódica:</span>
                                                    <span className={cn("font-medium", selectedEquipForExport.inspectionDueDate ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500")}>
                                                        {selectedEquipForExport.inspectionDueDate ? `Válida até ${new Date(selectedEquipForExport.inspectionDueDate).toLocaleDateString()}` : 'Pendente'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="text-[11px] text-[var(--text-muted)] flex items-start gap-2 bg-primary/5 p-3 rounded-xl border border-primary/10">
                                        <CheckCircle2 size={15} className="text-primary shrink-0 mt-0.5" />
                                        <span>
                                            Os dados e perfis documentais serão sincronizados com o CDE da obra. Sempre que um documento for aprovado ou atualizado na obra, a sincronização é sugerida na conta corporativa.
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-end gap-2 pt-2">
                                        <SecondaryButton type="button" onClick={() => setIsExportModalOpen(false)}>
                                            Cancelar
                                        </SecondaryButton>
                                        <PrimaryButton type="submit" className="py-2 px-4 text-xs font-bold">
                                            Sincronizar com Obra
                                        </PrimaryButton>
                                    </div>
                                </>
                            )}
                        </form>
                    </Modal>

                    {/* ════════ MODAL: COLOCAR DOCUMENTO NA EMPRESA ════════ */}
                    <Modal
                        maxWidth="max-w-2xl"
                        title={
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                                    <FileText size={16} />
                                </div>
                                <div>
                                    <div className="font-bold text-sm text-[var(--text)]">Colocar Documento no Repositório</div>
                                    <div className="text-[11px] text-[var(--text-muted)] font-normal">
                                        Associe ficheiros à empresa, colaboradores ou equipamentos com validação de conformidade legal.
                                    </div>
                                </div>
                            </div>
                        }
                        isOpen={isUploadDocModalOpen}
                        onClose={() => {
                            if (!isUploadingDoc) setIsUploadDocModalOpen(false);
                        }}
                    >
                        <form onSubmit={handleUploadDocumentSubmit} className="space-y-4">
                            {/* File Upload Zone */}
                            <div className="p-4 border-2 border-dashed border-[var(--border)] rounded-xl bg-[var(--bg-input)]/20 hover:border-primary/50 transition-colors text-center relative cursor-pointer">
                                <input
                                    type="file"
                                    id="company-doc-file-input"
                                    onChange={e => {
                                        const f = e.target.files?.[0];
                                        if (f) {
                                            setUploadDocFile(f);
                                            if (!uploadDocForm.name) {
                                                const baseName = f.name.includes('.') ? f.name.substring(0, f.name.lastIndexOf('.')) : f.name;
                                                setUploadDocForm(prev => ({ ...prev, name: baseName }));
                                            }
                                        }
                                    }}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <div className="space-y-1.5 pointer-events-none">
                                    <div className="w-10 h-10 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center">
                                        <UploadCloud size={20} />
                                    </div>
                                    {uploadDocFile ? (
                                        <div>
                                            <div className="text-xs font-bold text-primary">{uploadDocFile.name}</div>
                                            <div className="text-[10px] text-[var(--text-muted)]">
                                                {(uploadDocFile.size / 1024).toFixed(1)} KB &bull; Pronto para guardar
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <div className="text-xs font-bold text-[var(--text)]">Clique ou arraste um ficheiro aqui</div>
                                            <div className="text-[10px] text-[var(--text-muted)]">PDF, Imagens, Documentos Office (até 50 MB)</div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Document Title */}
                            <div>
                                <label className="block text-xs font-bold text-[var(--text)] mb-1">
                                    Título / Designação do Documento <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={uploadDocForm.name}
                                    onChange={e => setUploadDocForm(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Ex: Apólice Seguro Acidentes Trabalho 2026, Ficha Aptidão Médica..."
                                    className="w-full text-xs px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text)] focus:outline-none focus:border-primary"
                                />
                            </div>

                            {/* Destination Entity Type Pills */}
                            <div>
                                <label className="block text-xs font-bold text-[var(--text)] mb-1.5">
                                    Âmbito / Entidade de Destino
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { type: 'company', label: 'Empresa', icon: Building2 },
                                        { type: 'worker', label: 'Colaborador', icon: User },
                                        { type: 'equipment', label: 'Equipamento', icon: Wrench },
                                    ].map(item => {
                                        const ItemIcon = item.icon;
                                        const isSelected = uploadDocForm.entityType === item.type;
                                        return (
                                            <button
                                                key={item.type}
                                                type="button"
                                                onClick={() => handleUploadEntityTypeChange(item.type as any)}
                                                className={cn(
                                                    "py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                                                    isSelected
                                                        ? "border-primary bg-primary/10 text-primary shadow-sm"
                                                        : "border-[var(--border)] bg-[var(--bg-input)]/40 text-[var(--text-muted)] hover:text-[var(--text)]"
                                                )}
                                            >
                                                <ItemIcon size={14} />
                                                <span>{item.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Entity Dropdown (if Worker or Equipment) */}
                            {uploadDocForm.entityType === 'worker' && (
                                <div>
                                    <label className="block text-xs font-bold text-[var(--text)] mb-1">
                                        Selecionar Colaborador <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        required
                                        value={uploadDocForm.entityId}
                                        onChange={e => handleUploadWorkerChange(e.target.value)}
                                        className="w-full text-xs px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text)] focus:outline-none focus:border-primary"
                                    >
                                        <option value="">Selecione o colaborador...</option>
                                        {companyWorkers.map(w => (
                                            <option key={w.id} value={w.id}>
                                                {w.name} {w.nif ? `(NIF: ${w.nif})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {uploadDocForm.entityType === 'equipment' && (
                                <div>
                                    <label className="block text-xs font-bold text-[var(--text)] mb-1">
                                        Selecionar Equipamento <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        required
                                        value={uploadDocForm.entityId}
                                        onChange={e => handleUploadEquipChange(e.target.value)}
                                        className="w-full text-xs px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text)] focus:outline-none focus:border-primary"
                                    >
                                        <option value="">Selecione o equipamento...</option>
                                        {companyEquipment.map(eq => (
                                            <option key={eq.id} value={eq.id}>
                                                {eq.name} {eq.serialNumber ? `(S/N: ${eq.serialNumber})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Category & Folder Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-[var(--text)] mb-1">
                                        Categoria Documental
                                    </label>
                                    <select
                                        value={uploadDocForm.category}
                                        onChange={e => handleUploadCategoryChange(e.target.value)}
                                        className="w-full text-xs px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text)] focus:outline-none focus:border-primary"
                                    >
                                        {uploadDocForm.entityType === 'company' && (
                                            COMPANY_DOC_CATEGORIES.map(c => (
                                                <option key={c.value} value={c.value}>{c.label}</option>
                                            ))
                                        )}
                                        {uploadDocForm.entityType === 'worker' && (
                                            WORKER_DOC_CATEGORIES.map(c => (
                                                <option key={c.value} value={c.value}>{c.label}</option>
                                            ))
                                        )}
                                        {uploadDocForm.entityType === 'equipment' && (
                                            EQUIP_DOC_CATEGORIES.map(c => (
                                                <option key={c.value} value={c.value}>{c.label}</option>
                                            ))
                                        )}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-[var(--text)] mb-1">
                                        Pasta de Destino no Repositório
                                    </label>
                                    <select
                                        value={uploadDocForm.folderPath}
                                        onChange={e => setUploadDocForm(prev => ({ ...prev, folderPath: e.target.value }))}
                                        className="w-full text-xs px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text)] focus:outline-none focus:border-primary"
                                    >
                                        {allCompanyFolders.map(f => (
                                            <option key={f.path} value={f.path}>
                                                📁 {f.path}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Document Reference / Code */}
                            <div>
                                <label className="block text-xs font-bold text-[var(--text)] mb-1">
                                    N.º de Apólice / Código de Validação / Referência (Opcional)
                                </label>
                                <input
                                    type="text"
                                    value={uploadDocForm.documentCode}
                                    onChange={e => setUploadDocForm(prev => ({ ...prev, documentCode: e.target.value }))}
                                    placeholder="Ex: 009848488/AT, Certidão Nº 9988-7766..."
                                    className="w-full text-xs px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text)] focus:outline-none focus:border-primary"
                                />
                            </div>

                            {/* Emission & Expiry Dates */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-[var(--text)] mb-1">
                                        Data de Emissão (Opcional)
                                    </label>
                                    <input
                                        type="date"
                                        value={uploadDocForm.issueDate}
                                        onChange={e => setUploadDocForm(prev => ({ ...prev, issueDate: e.target.value }))}
                                        className="w-full text-xs px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text)] focus:outline-none focus:border-primary"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-[var(--text)] mb-1">
                                        Data de Validade Legal
                                    </label>
                                    <input
                                        type="date"
                                        disabled={uploadDocForm.hasNoExpiry}
                                        value={uploadDocForm.expiryDate}
                                        onChange={e => setUploadDocForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                                        className={cn(
                                            "w-full text-xs px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text)] focus:outline-none focus:border-primary",
                                            uploadDocForm.hasNoExpiry && "opacity-50 cursor-not-allowed"
                                        )}
                                    />
                                </div>
                            </div>

                            {/* Checkboxes: No Expiry & RGPD */}
                            <div className="space-y-2 pt-1">
                                <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--text)]">
                                    <input
                                        type="checkbox"
                                        checked={uploadDocForm.hasNoExpiry}
                                        onChange={e => setUploadDocForm(prev => ({ 
                                            ...prev, 
                                            hasNoExpiry: e.target.checked,
                                            expiryDate: e.target.checked ? '' : prev.expiryDate
                                        }))}
                                        className="rounded border-[var(--border)] text-primary focus:ring-0"
                                    />
                                    <span>Documento sem termo de validade / Vitalício (Permanente)</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--text)]">
                                    <input
                                        type="checkbox"
                                        checked={uploadDocForm.isConfidential}
                                        onChange={e => setUploadDocForm(prev => ({ ...prev, isConfidential: e.target.checked }))}
                                        className="rounded border-[var(--border)] text-primary focus:ring-0"
                                    />
                                    <span>Documento Confidencial / Dados Pessoais Protegidos (RGPD)</span>
                                </label>
                            </div>

                            {/* Notice about CDE & profile sync */}
                            <div className="text-[11px] text-[var(--text-muted)] flex items-start gap-2 bg-primary/5 p-3 rounded-xl border border-primary/10">
                                <CheckCircle2 size={15} className="text-primary shrink-0 mt-0.5" />
                                <span>
                                    Ao colocar o documento, o Safety1irst sincroniza automaticamente as datas correspondentes no perfil da entidade (apólices de seguros, data da FAT médica ou inspeção) e versiona o ficheiro de acordo com a ISO 19650.
                                </span>
                            </div>

                            {/* Modal Actions */}
                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
                                <SecondaryButton 
                                    type="button" 
                                    disabled={isUploadingDoc}
                                    onClick={() => setIsUploadDocModalOpen(false)}
                                >
                                    Cancelar
                                </SecondaryButton>
                                <PrimaryButton 
                                    type="submit" 
                                    disabled={isUploadingDoc}
                                    className="py-2 px-4 text-xs font-bold flex items-center gap-2"
                                >
                                    {isUploadingDoc ? (
                                        <>
                                            <RotateCw size={14} className="animate-spin" />
                                            <span>A Guardar e Sincronizar...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Check size={14} />
                                            <span>Colocar Documento</span>
                                        </>
                                    )}
                                </PrimaryButton>
                            </div>
                        </form>
                    </Modal>

                    {/* ════════ MODAL: NOVA SUBPASTA ════════ */}
                    <Modal
                        maxWidth="max-w-md"
                        title={
                            <div className="flex items-center gap-2">
                                <FolderPlus size={18} className="text-primary" />
                                <span className="font-bold text-sm text-[var(--text)]">Criar Nova Pasta</span>
                            </div>
                        }
                        isOpen={isNewFolderModalOpen}
                        onClose={() => setIsNewFolderModalOpen(false)}
                    >
                        <form onSubmit={handleCreateNewFolder} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-[var(--text)] mb-1">
                                    Pasta de Destino no CDE
                                </label>
                                <div className="w-full text-xs px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-input)]/60 text-[var(--text-muted)] font-mono truncate">
                                    📁 {cdeCurrentPath.length > 0
                                        ? `${companyCdeConfig?.folderPath || 'CDE'} / ${cdeCurrentPath.map(p => p.name).join(' / ')}`
                                        : (companyCdeConfig?.folderPath || 'Raiz do CDE')}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-[var(--text)] mb-1">
                                    Nome da Nova Pasta <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={newFolderName}
                                    onChange={e => setNewFolderName(e.target.value)}
                                    placeholder="Ex: Auditorias 2026, Declarações Clientes..."
                                    className="w-full text-xs px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text)] focus:outline-none focus:border-primary"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
                                <SecondaryButton type="button" onClick={() => setIsNewFolderModalOpen(false)}>
                                    Cancelar
                                </SecondaryButton>
                                <PrimaryButton type="submit" className="py-2 px-4 text-xs font-bold">
                                    Criar Pasta
                                </PrimaryButton>
                            </div>
                        </form>
                    </Modal>

                    {/* ════════ MODAL: RESULTADO DA CRIAÇÃO DE PASTAS ════════ */}
                    <Modal
                        maxWidth="max-w-lg"
                        title={
                            <div className="flex items-center gap-2">
                                <FolderCheck size={18} className="text-emerald-500" />
                                <span className="font-bold text-sm text-[var(--text)]">Estrutura de Pastas Normalizada</span>
                            </div>
                        }
                        isOpen={isInitResultModalOpen}
                        onClose={() => setIsInitResultModalOpen(false)}
                    >
                        <div className="space-y-4">
                            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                                <div className="font-bold flex items-center gap-1.5">
                                    <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                                    <span>Estrutura Corporativa Criada com Sucesso</span>
                                </div>
                                <p className="text-[11px] leading-relaxed">
                                    As pastas tipo foram geradas e normalizadas segundo os requisitos legais da construção civil e arquivo ISO 19650.
                                </p>
                            </div>

                            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-input)]/40 p-3 max-h-60 overflow-y-auto space-y-1 font-mono text-[11px] text-[var(--text-muted)]">
                                {initResultLogs.map((log, idx) => (
                                    <div key={idx} className="flex items-center gap-1.5">
                                        <span className="text-primary font-bold">&rsaquo;</span>
                                        <span>{log}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center justify-end pt-2 border-t border-[var(--border)]">
                                <PrimaryButton 
                                    type="button" 
                                    onClick={() => setIsInitResultModalOpen(false)}
                                    className="py-2 px-4 text-xs font-bold"
                                >
                                    Concluir
                                </PrimaryButton>
                            </div>
                        </div>
                    </Modal>

                    {/* Modal CDE da Empresa */}
                    <CDESettingsModal
                        isOpen={isCdeModalOpen}
                        onClose={() => {
                            setIsCdeModalOpen(false);
                            fetchCompanyCde();
                        }}
                        projectId={corporateEntityId}
                        title="Ambiente Comum de Dados (CDE) da Empresa"
                    />

                    {/* Modal Perfis de Documentos da Empresa */}
                    {isProfileModalOpen && (
                        <ProfileManagerModal
                            isOpen={isProfileModalOpen}
                            onClose={() => setIsProfileModalOpen(false)}
                            projectId={corporateEntityId}
                            entityType={profileModalType}
                        />
                    )}
                </div>
            )}
        </AuthGuard>
    );
}
