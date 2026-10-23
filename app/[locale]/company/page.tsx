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
    ArrowLeft, ArrowRight, Plus, Search, Trash2, Edit2, Check, 
    FileText, Shield, Calendar, Phone, Mail, MapPin, 
    Clock, AlertCircle, Save, CheckCircle2, ChevronRight, ChevronLeft,
    LogOut, Share2, UploadCloud, Download, ExternalLink, CheckCircle, Eye,
    User, Briefcase, Activity, AlertTriangle, X, Cloud, Filter
} from 'lucide-react';
import { CDESettingsModal } from '@/components/CDESettingsModal';
import { 
    FlatCompaniesIcon, FlatWorkersIcon, FlatEquipmentIcon, 
    FlatTrainingIcon, FlatDocumentsIcon, FlatFolderIcon 
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
import type { Worker, Equipment, Company, Project } from '@/types';

type CompanyTab = 'organization' | 'workers' | 'equipment' | 'training' | 'documents';

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
        importEquipmentToProject
    } = useStore();

    const handleLogout = () => {
        setCurrentUser(null);
        router.push('/login');
    };

    const [activeTab, setActiveTab] = useState<CompanyTab>('organization');
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Current user's account & master company record
    const userAccount = accounts.find(a => a.id === currentUser?.accountId) || account;
    const currentPlan = userAccount?.plan || 'free';
    const isPaidOrAdmin = currentPlan !== 'free' || currentUser?.role === 'admin' || currentUser?.role === 'superadmin';

    // Find or init the master company entity for this account (without project link or fallback)
    const masterCompany = companies.find(c => c.accountId === userAccount?.id && !c.projectId) || 
                          companies.find(c => c.accountId === userAccount?.id);

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

    // Only projects that the user has on the Workplace "Os Meus Projetos" page
    const userProjects = useMemo(() => {
        if (!currentUser) return [];
        return (projects || []).filter((p: Project) => {
            if (currentUser.role === 'superadmin') return true;
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

        let compId = masterCompany?.id;
        if (!compId) {
            const newId = `comp_${nanoid(8)}`;
            addCompany({
                ...companyForm,
                id: newId,
                accountId: userAccount?.id || 'default',
                status: companyForm.status,
                workflowStatus: 'validated',
                ifcActorRole: getIfcRoleFromCompanyRole(companyForm.companyRole || ''),
                createdAt: new Date().toISOString()
            } as any);
            compId = newId;
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

    // Filter Workers & Equipment for this company account (account level)
    const companyWorkers = useMemo(() => {
        return workers.filter(w => w.accountId === userAccount?.id || (masterCompany && w.companyId === masterCompany.id));
    }, [workers, userAccount?.id, masterCompany]);

    const companyEquipment = useMemo(() => {
        return equipment.filter(e => e.accountId === userAccount?.id || (masterCompany && e.companyId === masterCompany.id));
    }, [equipment, userAccount?.id, masterCompany]);

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
        setWorkerModalMode('view');
        setIsWorkerModalOpen(true);
    };

    const handleOpenCreateWorker = () => {
        setSelectedWorker(null);
        setEditingWorkerId(null);
        setWorkerForm(defaultWorkerForm);
        setWorkerModalMode('edit');
        setIsWorkerModalOpen(true);
    };

    const handleOpenEditWorker = (w: Worker) => {
        handleOpenViewWorker(w);
        setWorkerModalMode('edit');
    };

    // Modal state for Equipment
    const [isEquipModalOpen, setIsEquipModalOpen] = useState(false);
    const [editingEquipId, setEditingEquipId] = useState<string | null>(null);
    const [equipForm, setEquipForm] = useState({
        name: '',
        type: 'vehicle' as const,
        serialNumber: '',
        brand: '',
        model: '',
        inspectionDate: '',
        ceCertified: true
    });

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
        } else {
            addCompany({
                ...companyForm,
                id: `comp_${nanoid(8)}`,
                accountId: userAccount?.id || 'default',
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
                companyId: masterCompany?.id || `comp_${userAccount?.id}`,
                accountId: userAccount?.id,
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
    const handleSaveEquipment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!equipForm.name.trim()) return;

        if (editingEquipId) {
            updateEquipment(editingEquipId, {
                name: equipForm.name.trim(),
                type: equipForm.type,
                serialNumber: equipForm.serialNumber.trim(),
                brand: equipForm.brand.trim(),
                model: equipForm.model.trim(),
                inspectionDueDate: equipForm.inspectionDate || undefined,
                ceMarking: equipForm.ceCertified
            });
            addNotification('success', 'Equipamento atualizado com sucesso!');
        } else {
            addEquipment({
                name: equipForm.name.trim(),
                type: equipForm.type,
                companyId: masterCompany?.id || `comp_${userAccount?.id}`,
                status: 'operational',
                serialNumber: equipForm.serialNumber.trim(),
                brand: equipForm.brand.trim(),
                model: equipForm.model.trim(),
                inspectionDueDate: equipForm.inspectionDate || undefined,
                ceMarking: equipForm.ceCertified,
                workflowStatus: 'validated'
            });
            addNotification('success', 'Equipamento adicionado à sua empresa!');
        }
        setIsEquipModalOpen(false);
        setEditingEquipId(null);
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
                                    { id: 'documents', label: 'Documentos', icon: FlatDocumentsIcon },
                                ].map((item) => {
                                    const IconComponent = item.icon;
                                    const isActive = activeTab === item.id;
                                    return (
                                        <li key={item.id}>
                                            <button
                                                type="button"
                                                onClick={() => setActiveTab(item.id as CompanyTab)}
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
                            <header className="p-5 border-b border-[var(--border)] bg-[var(--bg-card)]/80 backdrop-blur-sm sticky top-0 z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                                <div>
                                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-1">
                                        <span className="font-semibold text-primary">A Minha Empresa</span>
                                        <span>•</span>
                                        <span className="capitalize">{activeTab === 'organization' ? 'Organizações' : activeTab}</span>
                                    </div>
                                    <h1 className="text-xl font-extrabold text-[var(--text)]">
                                        {activeTab === 'organization' && 'Dados e Documentos da Organização'}
                                        {activeTab === 'workers' && `Colaboradores da Empresa (${companyWorkers.length})`}
                                        {activeTab === 'equipment' && `Equipamentos e Máquinas (${companyEquipment.length})`}
                                        {activeTab === 'training' && 'Matriz e Cursos de Formação'}
                                        {activeTab === 'documents' && 'Repositório Documental Corporativo'}
                                    </h1>
                                </div>

                                {/* Action Buttons based on Tab */}
                                <div className="flex items-center gap-2 self-start sm:self-auto">
                                    <button
                                        type="button"
                                        onClick={() => setIsCdeModalOpen(true)}
                                        className="px-3.5 py-2 rounded-xl bg-[var(--bg-input)] hover:bg-[var(--border)] text-[var(--text)] text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border border-[var(--border)]"
                                        title="Configurar Ambiente Comum de Dados (CDE) da Empresa"
                                    >
                                        <Cloud size={14} className="text-primary" />
                                        <span>CDE da Empresa</span>
                                    </button>
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
                                            onClick={() => {
                                                setEditingEquipId(null);
                                                setEquipForm({ name: '', type: 'vehicle', serialNumber: '', brand: '', model: '', inspectionDate: '', ceCertified: true });
                                                setIsEquipModalOpen(true);
                                            }}
                                            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                                        >
                                            <Plus size={14} /> Adicionar Equipamento
                                        </button>
                                    )}
                                </div>
                            </header>

                            {/* Scrollable Body Content */}
                            <div className="flex-1 overflow-y-auto p-6">
                                <div className="max-w-6xl w-full mx-auto space-y-6">
                            {/* Notice Banner */}
                            {savedNotice && (
                                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2 animate-in fade-in">
                                    <Check size={16} /> Dados gravados com sucesso!
                                </div>
                            )}

                            {/* ════════ TAB: ORGANIZAÇÃO (Listagem) ════════ */}
                            {activeTab === 'organization' && (
                                <div className="space-y-6">
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
                                                                    <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
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
                                                                <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                                                                    <button
                                                                        onClick={() => {
                                                                            setExportEntityType('company');
                                                                            setExportTargetProjectId(userProjects[0]?.id || '');
                                                                            setIsExportModalOpen(true);
                                                                        }}
                                                                        className="p-1.5 text-[var(--text-muted)] hover:text-primary rounded-lg transition-colors cursor-pointer"
                                                                        title="Sincronizar com Obra"
                                                                    >
                                                                        <Share2 size={14} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            setCompanyModalMode('view');
                                                                            setIsCompanyModalOpen(true);
                                                                        }}
                                                                        className="p-1.5 text-[var(--text-muted)] hover:text-primary rounded-lg transition-colors cursor-pointer"
                                                                        title="Ver Informações"
                                                                    >
                                                                        <Eye size={14} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            setCompanyModalMode('edit');
                                                                            setIsCompanyModalOpen(true);
                                                                        }}
                                                                        className="p-1.5 text-[var(--text-muted)] hover:text-primary rounded-lg transition-colors cursor-pointer"
                                                                        title="Editar Dados"
                                                                    >
                                                                        <Edit2 size={14} />
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

                                {/* Obras / Projetos Sincronizados com a Organização */}
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
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {syncedCompanyProjects.map(proj => (
                                                <div key={proj.projectId} className="p-3.5 rounded-xl bg-[var(--bg-input)]/40 border border-[var(--border)] hover:border-primary/40 transition-all flex flex-col justify-between gap-3">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="font-bold text-xs text-[var(--text)] truncate" title={proj.projectName}>
                                                                {proj.projectName}
                                                            </span>
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                                                                Sincronizada
                                                            </span>
                                                        </div>
                                                        {proj.projectAddress && (
                                                            <p className="text-[10px] text-[var(--text-muted)] truncate">
                                                                {proj.projectAddress}
                                                            </p>
                                                        )}
                                                        <div className="text-[10px] text-[var(--text-muted)] pt-1">
                                                            Função: <span className="font-medium text-[var(--text)]">{getCompanyRoleLabel(proj.companyRole)}</span>
                                                        </div>
                                                    </div>
                                                    <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-xs">
                                                        <span className="text-[10px] font-mono text-[var(--text-muted)]">ID: {proj.projectId.slice(0, 8)}</span>
                                                        <Link
                                                            href={`/projects/${proj.projectId}`}
                                                            className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline cursor-pointer"
                                                        >
                                                            <span>Abrir Obra</span>
                                                            <ArrowRight size={12} />
                                                        </Link>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                </div>
                            )}

                            {/* ════════ TAB: PESSOAS ════════ */}
                            {activeTab === 'workers' && (
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
                                                                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
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
                            )}

                            {/* ════════ TAB: EQUIPAMENTOS ════════ */}
                            {activeTab === 'equipment' && (
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
                                                                    className={cn(
                                                                        "hover:bg-[var(--bg-input)]/30 transition-colors",
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
                                                                    <td className="px-5 py-3.5 whitespace-nowrap font-bold text-xs text-[var(--text)]">
                                                                        {eq.name}
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
                                                                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                                                        <div className="flex items-center justify-end gap-1">
                                                                            <button
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
                                                                            <button
                                                                                onClick={() => {
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
                                                                                    setIsEquipModalOpen(true);
                                                                                }}
                                                                                className="p-1.5 text-[var(--text-muted)] hover:text-primary rounded-lg transition-colors cursor-pointer"
                                                                                title="Editar"
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
                                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-4">
                                    <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                                        <h3 className="font-bold text-sm text-[var(--text)] flex items-center gap-2">
                                            <Folder size={16} className="text-primary" /> Repositório e Ficheiros da Empresa
                                        </h3>
                                    </div>
                                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                                        Consulte e mantenha atualizados os documentos gerais da sua empresa (Certidão Comercial, Apólices de Seguros, Fichas de Aptidão e Declarações).
                                    </p>
                                    <div className="p-8 border border-dashed border-[var(--border)] rounded-2xl text-center space-y-3">
                                        <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center">
                                            <Folder size={24} />
                                        </div>
                                        <div className="text-xs font-bold text-[var(--text)]">Documentos da Conta Prontos para Sincronização</div>
                                        <p className="text-[11px] text-[var(--text-muted)] max-w-sm mx-auto">
                                            Os documentos registados neste espaço da empresa ficam disponíveis para envio e compatibilização direta em qualquer obra em que a sua empresa ingresse.
                                        </p>
                                    </div>
                                </div>
                            )}
                                </div>
                            </div>
                        </main>
                    </div>

                    {/* ════════ MODALS ════════ */}
                    {/* Modal Colaborador — Dual Mode: Visualização & Edição (IFC Standard ISO 16739 & DL 273/2003) */}
                    <Modal
                        maxWidth="max-w-4xl"
                        title={
                            workerModalMode === 'view' ? (
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                                        {getInitials(selectedWorker?.name || workerForm.name)}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-bold text-sm text-[var(--text)] truncate">
                                                {selectedWorker?.name || workerForm.name || 'Ficha do Colaborador'}
                                            </span>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900 font-semibold">
                                                IFC: {selectedWorker?.ifcLaborType || selectedWorker?.ifcActorRole || selectedWorker?.occupation || 'IfcLaborResource'}
                                            </span>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                                Ativo
                                            </span>
                                        </div>
                                        <div className="text-[11px] text-[var(--text-muted)] truncate">
                                            {selectedWorker?.role || workerForm.role || 'Colaborador'} • {masterCompany?.name || 'A Minha Empresa'}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <User size={18} className="text-primary" />
                                    <div>
                                        <h3 className="font-bold text-sm text-[var(--text)]">
                                            {editingWorkerId ? "Editar Colaborador (Norma IFC)" : "Novo Colaborador (Norma IFC)"}
                                        </h3>
                                        <p className="text-[10px] text-[var(--text-muted)]">
                                            ISO 16739-1:2024 (IfcPerson, IfcLaborResource, IfcActorRole) • DL 273/2003
                                        </p>
                                    </div>
                                </div>
                            )
                        }
                        headerAction={
                            workerModalMode === 'view' ? (
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (selectedWorker) {
                                                setSelectedWorkerForExport(selectedWorker);
                                                setExportEntityType('worker');
                                                setExportTargetProjectId(userProjects[0]?.id || '');
                                                setIsExportModalOpen(true);
                                            }
                                        }}
                                        className="px-3 py-1.5 rounded-lg bg-[var(--bg-input)] hover:bg-[var(--border)] text-[var(--text)] text-xs font-semibold border border-[var(--border)] transition-colors flex items-center gap-1.5 cursor-pointer"
                                        title="Sincronizar colaborador com uma das suas obras"
                                    >
                                        <Share2 size={13} className="text-primary" />
                                        <span className="hidden sm:inline">Sincronizar com Obra</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setWorkerModalMode('edit')}
                                        className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                                        title="Editar dados do colaborador"
                                    >
                                        <Edit2 size={13} />
                                        <span>Editar</span>
                                    </button>
                                </div>
                            ) : (
                                editingWorkerId && selectedWorker ? (
                                    <button
                                        type="button"
                                        onClick={() => setWorkerModalMode('view')}
                                        className="px-3 py-1.5 rounded-lg bg-[var(--bg-input)] hover:bg-[var(--border)] text-[var(--text)] text-xs font-semibold border border-[var(--border)] transition-colors flex items-center gap-1.5 cursor-pointer"
                                        title="Voltar ao modo de visualização"
                                    >
                                        <Eye size={13} />
                                        <span>Ver Ficha</span>
                                    </button>
                                ) : null
                            )
                        }
                        isOpen={isWorkerModalOpen}
                        onClose={() => setIsWorkerModalOpen(false)}
                    >
                        {workerModalMode === 'view' ? (
                            <div className="space-y-6">
                                {/* Banner de Sincronização e Conformidade */}
                                <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-primary flex items-center justify-center shrink-0">
                                            <Shield size={20} />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                                Registo Padronizado com Norma IFC (ISO 16739) & DL 273/2003
                                            </h4>
                                            <p className="text-[11px] text-[var(--text-muted)]">
                                                Os dados deste colaborador estão compatibilizados com o esquema BIM e podem ser sincronizados diretamente para qualquer estaleiro.
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (selectedWorker) {
                                                setSelectedWorkerForExport(selectedWorker);
                                                setExportEntityType('worker');
                                                setExportTargetProjectId(userProjects[0]?.id || '');
                                                setIsExportModalOpen(true);
                                            }
                                        }}
                                        className="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
                                    >
                                        <Share2 size={13} /> Sincronizar com Obra
                                    </button>
                                </div>

                                {/* 1. Identificação & Dados Pessoais (IfcPerson) */}
                                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
                                    <div className="px-4 py-3 bg-[var(--bg-input)]/50 border-b border-[var(--border)] flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <User size={15} className="text-primary" />
                                            <h4 className="text-xs font-bold text-[var(--text)] uppercase tracking-wider">
                                                1. Identificação e Dados Pessoais
                                            </h4>
                                        </div>
                                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                            IfcPerson
                                        </span>
                                    </div>
                                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                                        <div>
                                            <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">Nome Completo</span>
                                            <span className="font-bold text-[var(--text)]">{selectedWorker?.name || workerForm.name || '—'}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">NIF</span>
                                            <span className="font-mono text-[var(--text)] font-semibold">{selectedWorker?.nif || workerForm.nif || '—'}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">N.º Segurança Social (NISS)</span>
                                            <span className="font-mono text-[var(--text)]">{selectedWorker?.ssn || workerForm.ssn || '—'}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">Documento de Identificação</span>
                                            <span className="text-[var(--text)]">
                                                {selectedWorker?.idCardNumber ? `${(selectedWorker?.idCardType || 'CC').toUpperCase()}: ${selectedWorker.idCardNumber}` : '—'}
                                                {selectedWorker?.idCardExpiry ? ` (Validade: ${new Date(selectedWorker.idCardExpiry).toLocaleDateString()})` : ''}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">Nacionalidade</span>
                                            <span className="text-[var(--text)] font-medium">
                                                {selectedWorker?.nationalityType === 'other'
                                                    ? `Extracomunitário (${selectedWorker.foreignCountry || 'Outra'})`
                                                    : selectedWorker?.nationalityType === 'eu_etc'
                                                    ? `União Europeia / EEE (${selectedWorker.foreignCountry || 'U.E.'})`
                                                    : 'Portugal (PT)'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">Data Nasc. / Género</span>
                                            <span className="text-[var(--text)]">
                                                {selectedWorker?.birthDate ? new Date(selectedWorker.birthDate).toLocaleDateString() : '—'} • {selectedWorker?.gender === 'F' ? 'Feminino' : 'Masculino'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">Contactos</span>
                                            <div className="text-[var(--text)]">
                                                {selectedWorker?.phone && <div>Tel: {selectedWorker.phone}</div>}
                                                {selectedWorker?.email && <div>Email: {selectedWorker.email}</div>}
                                                {!selectedWorker?.phone && !selectedWorker?.email && '—'}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">Morada</span>
                                            <div className="text-[var(--text)]">
                                                {selectedWorker?.address || workerForm.address ? (
                                                    `${selectedWorker?.address || workerForm.address}${selectedWorker?.postalCode ? `, ${selectedWorker.postalCode}` : ''} ${selectedWorker?.city || ''}`
                                                ) : '—'}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">Contacto de Emergência</span>
                                            <span className="text-[var(--text)]">
                                                {(selectedWorker?.emergencyContactName || workerForm.emergencyContactName) ? (
                                                    `${selectedWorker?.emergencyContactName || workerForm.emergencyContactName} ${(selectedWorker?.emergencyContactPhone || workerForm.emergencyContactPhone) ? `(${selectedWorker?.emergencyContactPhone || workerForm.emergencyContactPhone})` : ''}`
                                                ) : '—'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* 2. Função & Recurso BIM (IfcLaborResource / IfcActorRole) */}
                                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
                                    <div className="px-4 py-3 bg-[var(--bg-input)]/50 border-b border-[var(--border)] flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Briefcase size={15} className="text-primary" />
                                            <h4 className="text-xs font-bold text-[var(--text)] uppercase tracking-wider">
                                                2. Função e Qualificação Profissional
                                            </h4>
                                        </div>
                                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                            IfcLaborResource / IfcActorRole
                                        </span>
                                    </div>
                                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                                        <div>
                                            <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">Função Padronizada</span>
                                            <span className="font-bold text-[var(--text)]">{selectedWorker?.role || workerForm.role || '—'}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">Tipo de Recurso IFC (PredefinedType)</span>
                                            <span className="font-mono text-primary font-bold">{selectedWorker?.ifcLaborType || workerForm.ifcLaborType || 'USERDEFINED'}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">Papel IFC (IfcActorRole)</span>
                                            <span className="font-mono text-[var(--text)]">{selectedWorker?.ifcActorRole || 'CONSTRUCTIONMANAGER / LABOUR'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* 3. Vínculo Laboral & Enquadramento (IfcPersonAndOrganization) */}
                                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
                                    <div className="px-4 py-3 bg-[var(--bg-input)]/50 border-b border-[var(--border)] flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Building2 size={15} className="text-primary" />
                                            <h4 className="text-xs font-bold text-[var(--text)] uppercase tracking-wider">
                                                3. Vínculo Laboral & Enquadramento
                                            </h4>
                                        </div>
                                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                            IfcPersonAndOrganization
                                        </span>
                                    </div>
                                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                                        <div>
                                            <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">Tipo de Vínculo Contratual</span>
                                            <span className="font-semibold text-[var(--text)]">{getContractTypeLabel(selectedWorker?.contractType || workerForm.contractType)}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">Categoria Profissional Legal</span>
                                            <span className="text-[var(--text)]">{getProfessionCategoryLabel(selectedWorker?.professionCategory || workerForm.professionCategory)}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">Horário de Trabalho</span>
                                            <span className="text-[var(--text)]">{getWorkScheduleLabel(selectedWorker?.workSchedule || workerForm.workSchedule)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* 4. Saúde, Segurança & EPIs (DL 273/2003) */}
                                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
                                    <div className="px-4 py-3 bg-[var(--bg-input)]/50 border-b border-[var(--border)] flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Shield size={15} className="text-primary" />
                                            <h4 className="text-xs font-bold text-[var(--text)] uppercase tracking-wider">
                                                4. Saúde, Segurança no Trabalho & EPIs
                                            </h4>
                                        </div>
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                            DL 273/2003 • SST
                                        </span>
                                    </div>
                                    <div className="p-4 space-y-4 text-xs">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                            <div>
                                                <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-1">Aptidão Médica (FAT)</span>
                                                {(() => {
                                                    const badge = getMedicalFitnessBadge(selectedWorker?.medicalFitness || workerForm.medicalFitness, selectedWorker?.medicalExpiry || workerForm.medicalExpiry);
                                                    return (
                                                        <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border", badge.color)}>
                                                            <Check size={12} /> {badge.label}
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-1">Data / Validade do Exame</span>
                                                <span className="font-medium text-[var(--text)]">
                                                    {(selectedWorker?.medicalExpiry || workerForm.medicalExpiry)
                                                        ? new Date(selectedWorker?.medicalExpiry || workerForm.medicalExpiry).toLocaleDateString()
                                                        : 'Sem data registada'}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-1">Data de Entrega de EPI</span>
                                                <span className="text-[var(--text)]">
                                                    {(selectedWorker?.epiDate || workerForm.epiDate)
                                                        ? new Date(selectedWorker?.epiDate || workerForm.epiDate).toLocaleDateString()
                                                        : 'Registada com admissão'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* EPIs List */}
                                        <div>
                                            <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-2">EPIs Atribuídos / Entregues</span>
                                            <div className="flex flex-wrap gap-2">
                                                {(selectedWorker?.epiDeliveryList || workerForm.epiDeliveryList || []).map((epi: string) => (
                                                    <span key={epi} className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5">
                                                        <Check size={12} /> {epi}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {(selectedWorker?.medicalObservations || workerForm.medicalObservations) && (
                                            <div className="p-3 rounded-lg bg-[var(--bg-input)]/50 border border-[var(--border)] text-[11px]">
                                                <span className="font-bold text-[var(--text)] block mb-1">Observações Médicas:</span>
                                                <p className="text-[var(--text-muted)]">{selectedWorker?.medicalObservations || workerForm.medicalObservations}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Modal Footer (View Mode) */}
                                <div className="flex items-center justify-end pt-3 border-t border-[var(--border)]">
                                    <SecondaryButton type="button" onClick={() => setIsWorkerModalOpen(false)}>
                                        Fechar
                                    </SecondaryButton>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleSaveWorker} className="space-y-6">
                                {/* 1. Identificação e Dados Pessoais (IfcPerson) */}
                                <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-input)]/20 space-y-4">
                                    <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                                        <div className="flex items-center gap-2">
                                            <User size={15} className="text-primary" />
                                            <h4 className="text-xs font-bold text-[var(--text)] uppercase tracking-wider">
                                                1. Identificação e Dados Pessoais (Norma IFC: IfcPerson)
                                            </h4>
                                        </div>
                                        <span className="text-[10px] text-[var(--text-muted)] font-mono">ISO 16739</span>
                                    </div>

                                    {/* Nomes */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <InputGroup label="Primeiro Nome *">
                                            <input
                                                type="text"
                                                required
                                                value={workerForm.firstName}
                                                onChange={e => setWorkerForm({ ...workerForm, firstName: e.target.value })}
                                                className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                                placeholder="ex: João"
                                            />
                                        </InputGroup>
                                        <InputGroup label="Nome do Meio">
                                            <input
                                                type="text"
                                                value={workerForm.middleName}
                                                onChange={e => setWorkerForm({ ...workerForm, middleName: e.target.value })}
                                                className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                                placeholder="ex: Carlos"
                                            />
                                        </InputGroup>
                                        <InputGroup label="Apelido *">
                                            <input
                                                type="text"
                                                required
                                                value={workerForm.lastName}
                                                onChange={e => setWorkerForm({ ...workerForm, lastName: e.target.value })}
                                                className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                                placeholder="ex: Silva"
                                            />
                                        </InputGroup>
                                    </div>

                                    {/* Nacionalidade */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <InputGroup label="Nacionalidade *">
                                            <select
                                                value={workerForm.nationalityType}
                                                onChange={e => setWorkerForm({ ...workerForm, nationalityType: e.target.value as any })}
                                                className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                            >
                                                <option value="portugal">Portugal (PT)</option>
                                                <option value="eu_etc">U.E., Islândia, Liechtenstein, Noruega, Suíça e Andorra</option>
                                                <option value="other">Outra Nacionalidade (Extracomunitário)</option>
                                            </select>
                                        </InputGroup>
                                        {workerForm.nationalityType !== 'portugal' && (
                                            <InputGroup label="País de Origem *">
                                                <input
                                                    type="text"
                                                    required
                                                    value={workerForm.foreignCountry}
                                                    onChange={e => setWorkerForm({ ...workerForm, foreignCountry: e.target.value })}
                                                    className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                                    placeholder="ex: Brasil, Cabo Verde, Espanha..."
                                                />
                                            </InputGroup>
                                        )}
                                    </div>

                                    {/* Documentos de Identificação e Fiscais */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                                        <InputGroup label="NIF do Colaborador *">
                                            <input
                                                type="text"
                                                required
                                                value={workerForm.nif}
                                                onChange={e => setWorkerForm({ ...workerForm, nif: e.target.value })}
                                                className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary font-mono"
                                                placeholder="ex: 234567890"
                                            />
                                        </InputGroup>
                                        <InputGroup label="Tipo de Documento ID">
                                            <select
                                                value={workerForm.idCardType}
                                                onChange={e => setWorkerForm({ ...workerForm, idCardType: e.target.value })}
                                                className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                            >
                                                <option value="cc">Cartão de Cidadão</option>
                                                <option value="bi">Bilhete de Identidade</option>
                                                <option value="passaporte">Passaporte</option>
                                                <option value="residencia">Título de Residência</option>
                                                <option value="outro">Outro...</option>
                                            </select>
                                        </InputGroup>
                                        <InputGroup label="N.º do Documento">
                                            <input
                                                type="text"
                                                value={workerForm.idCardNumber}
                                                onChange={e => setWorkerForm({ ...workerForm, idCardNumber: e.target.value })}
                                                className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                                placeholder="N.º Identificação"
                                            />
                                        </InputGroup>
                                        <InputGroup label="N.º Seg. Social (NISS)">
                                            <input
                                                type="text"
                                                value={workerForm.ssn}
                                                onChange={e => setWorkerForm({ ...workerForm, ssn: e.target.value })}
                                                className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary font-mono"
                                                placeholder="ex: 12034567890"
                                            />
                                        </InputGroup>
                                    </div>

                                    {/* Demografia e Contactos */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                                        <InputGroup label="Data de Nascimento">
                                            <input
                                                type="date"
                                                value={workerForm.birthDate}
                                                onChange={e => setWorkerForm({ ...workerForm, birthDate: e.target.value })}
                                                className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                            />
                                        </InputGroup>
                                        <InputGroup label="Género">
                                            <select
                                                value={workerForm.gender}
                                                onChange={e => setWorkerForm({ ...workerForm, gender: e.target.value })}
                                                className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                            >
                                                <option value="M">Masculino</option>
                                                <option value="F">Feminino</option>
                                                <option value="outro">Outro / Prefere não declarar</option>
                                            </select>
                                        </InputGroup>
                                        <InputGroup label="Telefone">
                                            <input
                                                type="text"
                                                value={workerForm.phone}
                                                onChange={e => setWorkerForm({ ...workerForm, phone: e.target.value })}
                                                className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                                placeholder="ex: 912345678"
                                            />
                                        </InputGroup>
                                        <InputGroup label="Email">
                                            <input
                                                type="email"
                                                value={workerForm.email}
                                                onChange={e => setWorkerForm({ ...workerForm, email: e.target.value })}
                                                className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                                placeholder="colaborador@empresa.pt"
                                            />
                                        </InputGroup>
                                    </div>

                                    {/* Morada */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div className="sm:col-span-2">
                                            <InputGroup label="Morada">
                                                <input
                                                    type="text"
                                                    value={workerForm.address}
                                                    onChange={e => setWorkerForm({ ...workerForm, address: e.target.value })}
                                                    className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                                    placeholder="Rua, Número, Andar..."
                                                />
                                            </InputGroup>
                                        </div>
                                        <InputGroup label="Código Postal e Localidade">
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={workerForm.postalCode}
                                                    onChange={e => setWorkerForm({ ...workerForm, postalCode: e.target.value })}
                                                    className="w-24 p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                                    placeholder="0000-000"
                                                />
                                                <input
                                                    type="text"
                                                    value={workerForm.city}
                                                    onChange={e => setWorkerForm({ ...workerForm, city: e.target.value })}
                                                    className="flex-1 p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                                    placeholder="Localidade"
                                                />
                                            </div>
                                        </InputGroup>
                                    </div>

                                    {/* Contacto de Emergência */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                        <InputGroup label="Contacto de Emergência (Nome)">
                                            <input
                                                type="text"
                                                value={workerForm.emergencyContactName}
                                                onChange={e => setWorkerForm({ ...workerForm, emergencyContactName: e.target.value })}
                                                className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                                placeholder="ex: Maria Silva (Esposa)"
                                            />
                                        </InputGroup>
                                        <InputGroup label="Contacto de Emergência (Telefone)">
                                            <input
                                                type="text"
                                                value={workerForm.emergencyContactPhone}
                                                onChange={e => setWorkerForm({ ...workerForm, emergencyContactPhone: e.target.value })}
                                                className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                                placeholder="ex: 919876543"
                                            />
                                        </InputGroup>
                                    </div>
                                </div>

                                {/* 2. Função e Qualificação Profissional (IfcLaborResource / IfcActorRole) */}
                                <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-input)]/20 space-y-4">
                                    <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                                        <div className="flex items-center gap-2">
                                            <Briefcase size={15} className="text-primary" />
                                            <h4 className="text-xs font-bold text-[var(--text)] uppercase tracking-wider">
                                                2. Função e Qualificação Profissional (Norma IFC)
                                            </h4>
                                        </div>
                                        <span className="text-[10px] text-[var(--text-muted)] font-mono">IfcLaborResource / IfcActorRole</span>
                                    </div>

                                    <div className="space-y-3">
                                        <InputGroup label="Função Padronizada (Norma IFC / Obra) *">
                                            <select
                                                value={workerForm.workerRoleId}
                                                required
                                                onChange={e => {
                                                    const roleId = e.target.value;
                                                    const roleDef = getRoleDefinition(roleId);
                                                    const roleLabel = roleId === 'OTHER'
                                                        ? (workerForm.roleCustom || 'Outra')
                                                        : tRoles(`roles.${roleId}`);

                                                    setWorkerForm({
                                                        ...workerForm,
                                                        workerRoleId: roleId,
                                                        role: roleLabel,
                                                        occupation: roleDef?.ifcLaborResource?.objectType ?? '',
                                                        ifcLaborType: roleDef?.ifcLaborResource?.predefinedType ?? ''
                                                    });
                                                }}
                                                className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                            >
                                                <option value="">— Selecionar função padronizada IFC —</option>

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
                                        </InputGroup>

                                        {workerForm.workerRoleId === 'OTHER' && (
                                            <InputGroup label="Especificar Função Personalizada *">
                                                <input
                                                    type="text"
                                                    required
                                                    value={workerForm.roleCustom}
                                                    onChange={e => setWorkerForm({ 
                                                        ...workerForm, 
                                                        roleCustom: e.target.value,
                                                        role: e.target.value 
                                                    })}
                                                    placeholder="Indique a função específica..."
                                                    className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                                />
                                            </InputGroup>
                                        )}

                                        {/* Mapeamento IFC Dinâmico */}
                                        {workerForm.workerRoleId && (
                                            <div className="p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/40 text-[11px] flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-blue-800 dark:text-blue-300">Classificação BIM / IFC:</span>
                                                    <span className="font-mono text-[var(--text)]">
                                                        {workerForm.ifcLaborType ? `IfcLaborResourceType: ${workerForm.ifcLaborType}` : 'IfcActorRole: Standard'}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-[var(--text-muted)] font-mono">
                                                    {workerForm.occupation || 'Standard Labor'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* 3. Vínculo Laboral & Enquadramento (IfcPersonAndOrganization) */}
                                <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-input)]/20 space-y-4">
                                    <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                                        <div className="flex items-center gap-2">
                                            <Building2 size={15} className="text-primary" />
                                            <h4 className="text-xs font-bold text-[var(--text)] uppercase tracking-wider">
                                                3. Vínculo Laboral & Enquadramento
                                            </h4>
                                        </div>
                                        <span className="text-[10px] text-[var(--text-muted)] font-mono">IfcPersonAndOrganization</span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <InputGroup label="Tipo de Vínculo Contratual">
                                            <select
                                                value={workerForm.contractType}
                                                onChange={e => setWorkerForm({ ...workerForm, contractType: e.target.value })}
                                                className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                            >
                                                {CONTRACT_TYPE_OPTIONS.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </InputGroup>
                                        <InputGroup label="Categoria Profissional Legal">
                                            <select
                                                value={workerForm.professionCategory}
                                                onChange={e => setWorkerForm({ ...workerForm, professionCategory: e.target.value })}
                                                className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                            >
                                                {PROFESSION_CATEGORY_OPTIONS.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </InputGroup>
                                        <InputGroup label="Horário de Trabalho">
                                            <select
                                                value={workerForm.workSchedule}
                                                onChange={e => setWorkerForm({ ...workerForm, workSchedule: e.target.value })}
                                                className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                            >
                                                {WORK_SCHEDULE_OPTIONS.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </InputGroup>
                                    </div>
                                </div>

                                {/* 4. Saúde, Segurança no Trabalho & Acessos (DL 273/2003) */}
                                <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-input)]/20 space-y-4">
                                    <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                                        <div className="flex items-center gap-2">
                                            <Shield size={15} className="text-primary" />
                                            <h4 className="text-xs font-bold text-[var(--text)] uppercase tracking-wider">
                                                4. Saúde, Segurança no Trabalho & EPIs
                                            </h4>
                                        </div>
                                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">DL 273/2003</span>
                                    </div>

                                    {/* Aptidão Médica */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <InputGroup label="Data do Exame Médico (Ficha de Aptidão)">
                                            <input
                                                type="date"
                                                value={workerForm.medicalExpiry}
                                                onChange={e => setWorkerForm({ ...workerForm, medicalExpiry: e.target.value })}
                                                className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                            />
                                        </InputGroup>
                                        <InputGroup label="Resultado da Aptidão Médica">
                                            <select
                                                value={workerForm.medicalFitness}
                                                onChange={e => setWorkerForm({ ...workerForm, medicalFitness: e.target.value })}
                                                className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                            >
                                                <option value="apto">Apto para a Função (Sem Restrições)</option>
                                                <option value="apto_condicionado">Apto Condicionado / com Restrições</option>
                                                <option value="inapto">Inapto Temporariamente</option>
                                                <option value="outro">Outro / Pendente</option>
                                            </select>
                                        </InputGroup>
                                    </div>

                                    <InputGroup label="Observações / Condicionantes Médicas">
                                        <textarea
                                            rows={2}
                                            value={workerForm.medicalObservations}
                                            onChange={e => setWorkerForm({ ...workerForm, medicalObservations: e.target.value })}
                                            placeholder="Ex: Apto com restrição para trabalhos em altura superior a 2 metros..."
                                            className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary resize-none"
                                        />
                                    </InputGroup>

                                    {/* EPI Checklist */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[11px] font-semibold text-[var(--text)] uppercase tracking-wider">
                                                EPIs Obrigatórios Entregues (DL 273/2003)
                                            </span>
                                            <span className="text-[10px] text-[var(--text-muted)]">Clique para selecionar</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {ALL_EPIS.map(epi => {
                                                const selected = workerForm.epiDeliveryList.includes(epi);
                                                return (
                                                    <button
                                                        key={epi}
                                                        type="button"
                                                        onClick={() => {
                                                            const current = workerForm.epiDeliveryList || [];
                                                            const updated = selected
                                                                ? current.filter(e => e !== epi)
                                                                : [...current, epi];
                                                            setWorkerForm({ ...workerForm, epiDeliveryList: updated });
                                                        }}
                                                        className={cn(
                                                            "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5",
                                                            selected
                                                                ? "bg-primary text-white border-primary shadow-sm"
                                                                : "bg-[var(--bg-input)] text-[var(--text-muted)] border-[var(--border)] hover:border-primary/40"
                                                        )}
                                                    >
                                                        {selected ? <Check size={12} /> : null}
                                                        {epi}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* Form Action Buttons */}
                                <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
                                    <SecondaryButton
                                        type="button"
                                        onClick={() => {
                                            if (editingWorkerId && selectedWorker) {
                                                setWorkerModalMode('view');
                                            } else {
                                                setIsWorkerModalOpen(false);
                                            }
                                        }}
                                    >
                                        Cancelar
                                    </SecondaryButton>
                                    <PrimaryButton type="submit" className="px-4 py-2 text-xs font-bold">
                                        <Save size={14} className="mr-1.5 inline" />
                                        {editingWorkerId ? "Guardar Alterações" : "Adicionar Colaborador à Empresa"}
                                    </PrimaryButton>
                                </div>
                            </form>
                        )}
                    </Modal>

                    {/* Modal Equipamento */}
                    <Modal
                        title={editingEquipId ? "Editar Equipamento" : "Adicionar Equipamento à Minha Empresa"}
                        isOpen={isEquipModalOpen}
                        onClose={() => setIsEquipModalOpen(false)}
                    >
                        <form onSubmit={handleSaveEquipment} className="space-y-4">
                            <InputGroup label="Designação do Equipamento *">
                                <input
                                    type="text"
                                    required
                                    value={equipForm.name}
                                    onChange={e => setEquipForm({ ...equipForm, name: e.target.value })}
                                    className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                    placeholder="ex: Retroescavadora JCB"
                                />
                            </InputGroup>
                            <div className="grid grid-cols-2 gap-3">
                                <InputGroup label="Número de Série">
                                    <input
                                        type="text"
                                        value={equipForm.serialNumber}
                                        onChange={e => setEquipForm({ ...equipForm, serialNumber: e.target.value })}
                                        className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary font-mono"
                                        placeholder="ex: SN-998822"
                                    />
                                </InputGroup>
                                <InputGroup label="Tipo">
                                    <select
                                        value={equipForm.type}
                                        onChange={e => setEquipForm({ ...equipForm, type: e.target.value as any })}
                                        className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                    >
                                        <option value="vehicle">Veículo / Máquina</option>
                                        <option value="heavy_machinery">Máquinas Pesadas</option>
                                        <option value="lifting">Equipamento de Elevação</option>
                                        <option value="power_tool">Ferramenta Elétrica</option>
                                        <option value="other">Outro</option>
                                    </select>
                                </InputGroup>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <InputGroup label="Marca">
                                    <input
                                        type="text"
                                        value={equipForm.brand}
                                        onChange={e => setEquipForm({ ...equipForm, brand: e.target.value })}
                                        className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </InputGroup>
                                <InputGroup label="Modelo">
                                    <input
                                        type="text"
                                        value={equipForm.model}
                                        onChange={e => setEquipForm({ ...equipForm, model: e.target.value })}
                                        className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </InputGroup>
                            </div>
                            <InputGroup label="Data da Próxima Inspeção Periódica">
                                <input
                                    type="date"
                                    value={equipForm.inspectionDate}
                                    onChange={e => setEquipForm({ ...equipForm, inspectionDate: e.target.value })}
                                    className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                />
                            </InputGroup>
                            <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text)] cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={equipForm.ceCertified}
                                    onChange={e => setEquipForm({ ...equipForm, ceCertified: e.target.checked })}
                                    className="rounded text-primary"
                                />
                                Possui Declaração de Conformidade CE
                            </label>
                            <PrimaryButton type="submit" className="w-full py-2.5 text-xs font-bold">
                                {editingEquipId ? "Guardar Alterações" : "Adicionar Equipamento"}
                            </PrimaryButton>
                        </form>
                    </Modal>

                    {/* Modal Informação / Edição da Empresa */}
                    <Modal
                        title={
                            <div className="flex items-center gap-2">
                                <Building2 size={18} className="text-primary" />
                                <span>{companyModalMode === 'view' ? "Ficha da Organização" : "Editar Dados da Organização"}</span>
                            </div>
                        }
                        isOpen={isCompanyModalOpen}
                        onClose={() => setIsCompanyModalOpen(false)}
                        maxWidth="max-w-4xl"
                        headerAction={
                            companyModalMode === 'view' ? (
                                <button
                                    type="button"
                                    onClick={() => setCompanyModalMode('edit')}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-hover shadow-sm transition-all cursor-pointer"
                                >
                                    <Edit2 size={13} /> Editar Empresa
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setCompanyModalMode('view')}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[var(--text)] bg-[var(--bg-input)] hover:bg-[var(--border)] transition-all cursor-pointer border border-[var(--border)]"
                                >
                                    <Eye size={13} /> Ver Ficha
                                </button>
                            )
                        }
                    >
                        {companyModalMode === 'view' ? (
                            <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
                                {/* Top overview card */}
                                <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-3.5">
                                        <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center font-extrabold text-base shadow-sm shrink-0">
                                            {getInitials(companyForm.name)}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-base font-bold text-[var(--text)]">{companyForm.name || 'A Minha Empresa'}</h3>
                                                <span className={cn(
                                                    "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                                                    companyForm.status === 'inactive' ? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                                )}>
                                                    {companyForm.status === 'inactive' ? 'Inativa' : 'Ativa'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-[var(--text-muted)] font-mono">
                                                NIF: {companyForm.nif || 'Não definido'} • Natureza: {companyForm.legalForm?.toUpperCase() || 'LDA'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsCompanyModalOpen(false);
                                                setExportEntityType('company');
                                                setExportTargetProjectId(userProjects[0]?.id || '');
                                                setIsExportModalOpen(true);
                                            }}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 transition-all cursor-pointer"
                                            title="Sincronizar com uma das suas obras"
                                        >
                                            <Share2 size={13} /> Sincronizar com Obra
                                        </button>
                                    </div>
                                </div>

                                {/* Section 1: Identificação */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5 pb-1 border-b border-[var(--border)]">
                                        <Building2 size={14} className="text-primary" /> Identificação e Dados Fiscais
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                        <div className="p-3 rounded-xl bg-[var(--bg-input)]/40 border border-[var(--border)]">
                                            <div className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Nome Oficial</div>
                                            <div className="text-xs font-bold text-[var(--text)] mt-0.5">{companyForm.name || '—'}</div>
                                        </div>
                                        <div className="p-3 rounded-xl bg-[var(--bg-input)]/40 border border-[var(--border)]">
                                            <div className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">NIF / NIPC</div>
                                            <div className="text-xs font-mono font-bold text-[var(--text)] mt-0.5">{companyForm.nif || '—'}</div>
                                        </div>
                                        <div className="p-3 rounded-xl bg-[var(--bg-input)]/40 border border-[var(--border)]">
                                            <div className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Tipo de Empresa</div>
                                            <div className="text-xs font-bold text-[var(--text)] mt-0.5">
                                                {getCompanyRoleLabel(companyForm.companyRole)}
                                                {companyForm.companyRole === 'outro' && companyForm.companyRoleCustom ? ` (${companyForm.companyRoleCustom})` : ''}
                                            </div>
                                        </div>
                                        <div className="p-3 rounded-xl bg-[var(--bg-input)]/40 border border-[var(--border)]">
                                            <div className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Natureza Jurídica</div>
                                            <div className="text-xs font-medium text-[var(--text)] mt-0.5">
                                                {companyForm.legalForm === 'lda' ? 'Lda. (Sociedade por Quotas)' :
                                                 companyForm.legalForm === 'sa' ? 'S.A. (Sociedade Anónima)' :
                                                 companyForm.legalForm === 'unipessoal' ? 'Unipessoal Lda.' :
                                                 companyForm.legalForm === 'eni' ? 'ENI (Empresário em Nome Individual)' :
                                                 companyForm.legalForm === 'ace' ? 'ACE' : 'Outra'}
                                            </div>
                                        </div>
                                        <div className="p-3 rounded-xl bg-[var(--bg-input)]/40 border border-[var(--border)]">
                                            <div className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Código CAE</div>
                                            <div className="text-xs font-mono font-medium text-[var(--text)] mt-0.5">{companyForm.caeCode || '—'}</div>
                                        </div>
                                        <div className="p-3 rounded-xl bg-[var(--bg-input)]/40 border border-[var(--border)]">
                                            <div className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Alvará / Título IMPIC</div>
                                            <div className="text-xs font-mono font-medium text-[var(--text)] mt-0.5">{companyForm.impic || '—'}</div>
                                        </div>
                                        <div className="sm:col-span-2 md:col-span-3 p-3 rounded-xl bg-[var(--bg-input)]/40 border border-[var(--border)]">
                                            <div className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Atividade Principal</div>
                                            <div className="text-xs font-medium text-[var(--text)] mt-0.5">{companyForm.activity || '—'}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: Contactos & Sede */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5 pb-1 border-b border-[var(--border)]">
                                        <MapPin size={14} className="text-primary" /> Contactos e Localização
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="p-3 rounded-xl bg-[var(--bg-input)]/40 border border-[var(--border)]">
                                            <div className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Email Geral</div>
                                            <div className="text-xs font-medium text-[var(--text)] mt-0.5">{companyForm.email || '—'}</div>
                                        </div>
                                        <div className="p-3 rounded-xl bg-[var(--bg-input)]/40 border border-[var(--border)]">
                                            <div className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Telefone Geral</div>
                                            <div className="text-xs font-medium text-[var(--text)] mt-0.5">{companyForm.phone || '—'}</div>
                                        </div>
                                        <div className="sm:col-span-2 p-3 rounded-xl bg-[var(--bg-input)]/40 border border-[var(--border)]">
                                            <div className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Sede / Morada Oficial</div>
                                            <div className="text-xs font-medium text-[var(--text)] mt-0.5">{companyForm.address || '—'}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 3: Seguros e Certidões Legais DL 273/2003 */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5 pb-1 border-b border-[var(--border)]">
                                        <Shield size={14} className="text-primary" /> Seguros Obrigatórios & Certidões Não Dívida (DL 273/2003)
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="p-3.5 rounded-xl bg-[var(--bg-input)]/40 border border-[var(--border)] space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] font-bold text-[var(--text)]">Seguro Acidentes de Trabalho</span>
                                                {companyForm.insuranceWorkAccDate ? (
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200">
                                                        Válido
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200">
                                                        Pendente
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[11px] text-[var(--text-muted)]">
                                                Apólice: <span className="font-mono text-[var(--text)]">{companyForm.insuranceWorkAccPolicy || 'Não indicada'}</span>
                                            </div>
                                            <div className="text-[11px] text-[var(--text-muted)]">
                                                Validade: <span className="font-medium text-[var(--text)]">{companyForm.insuranceWorkAccDate ? new Date(companyForm.insuranceWorkAccDate).toLocaleDateString() : '—'}</span>
                                            </div>
                                        </div>

                                        <div className="p-3.5 rounded-xl bg-[var(--bg-input)]/40 border border-[var(--border)] space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] font-bold text-[var(--text)]">Seguro Responsabilidade Civil</span>
                                                {companyForm.insuranceCivilDate ? (
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200">
                                                        Válido
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200">
                                                        Pendente
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[11px] text-[var(--text-muted)]">
                                                Apólice: <span className="font-mono text-[var(--text)]">{companyForm.insuranceCivilPolicy || 'Não indicada'}</span>
                                            </div>
                                            <div className="text-[11px] text-[var(--text-muted)]">
                                                Validade: <span className="font-medium text-[var(--text)]">{companyForm.insuranceCivilDate ? new Date(companyForm.insuranceCivilDate).toLocaleDateString() : '—'}</span>
                                            </div>
                                        </div>

                                        <div className="p-3.5 rounded-xl bg-[var(--bg-input)]/40 border border-[var(--border)] space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] font-bold text-[var(--text)]">Certidão Seg. Social</span>
                                                {companyForm.cleanSSDate ? (
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200">
                                                        Válida
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200">
                                                        Pendente
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[11px] text-[var(--text-muted)]">
                                                Validade: <span className="font-medium text-[var(--text)]">{companyForm.cleanSSDate ? new Date(companyForm.cleanSSDate).toLocaleDateString() : 'Não registada'}</span>
                                            </div>
                                        </div>

                                        <div className="p-3.5 rounded-xl bg-[var(--bg-input)]/40 border border-[var(--border)] space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] font-bold text-[var(--text)]">Certidão Finanças</span>
                                                {companyForm.cleanFinDate ? (
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200">
                                                        Válida
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200">
                                                        Pendente
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[11px] text-[var(--text-muted)]">
                                                Validade: <span className="font-medium text-[var(--text)]">{companyForm.cleanFinDate ? new Date(companyForm.cleanFinDate).toLocaleDateString() : 'Não registada'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-end pt-3 border-t border-[var(--border)]">
                                    <SecondaryButton type="button" onClick={() => setIsCompanyModalOpen(false)}>
                                        Fechar
                                    </SecondaryButton>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={(e) => { handleSaveCompany(e); setCompanyModalMode('view'); }} className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
                                <div className="bg-[var(--bg-input)]/30 border border-[var(--border)] rounded-2xl p-5 space-y-4">
                                    <h4 className="font-bold text-xs text-[var(--text)] flex items-center gap-2 pb-2 border-b border-[var(--border)]">
                                        <Building2 size={14} className="text-primary" /> Identificação e Dados Fiscais
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                        <InputGroup label="Nome Oficial da Empresa *">
                                            <input
                                                type="text"
                                                required
                                                value={companyForm.name}
                                                onChange={e => {
                                                    isFormEditedRef.current = true;
                                                    setCompanyForm({ ...companyForm, name: e.target.value });
                                                }}
                                                className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                            />
                                        </InputGroup>
                                        <InputGroup label="NIF / NIPC *">
                                            <input
                                                type="text"
                                                required
                                                value={companyForm.nif}
                                                onChange={e => {
                                                    isFormEditedRef.current = true;
                                                    setCompanyForm({ ...companyForm, nif: e.target.value });
                                                }}
                                                className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary font-mono"
                                                placeholder="500000000"
                                            />
                                        </InputGroup>
                                        <InputGroup label="Tipo de Empresa *">
                                            <select
                                                value={companyForm.companyRole}
                                                onChange={e => {
                                                    isFormEditedRef.current = true;
                                                    setCompanyForm({ ...companyForm, companyRole: e.target.value });
                                                }}
                                                className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                            >
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
                                        </InputGroup>
                                        {companyForm.companyRole === 'outro' && (
                                            <InputGroup label="Especificar Tipo de Empresa">
                                                <input
                                                    type="text"
                                                    value={companyForm.companyRoleCustom}
                                                    onChange={e => {
                                                        isFormEditedRef.current = true;
                                                        setCompanyForm({ ...companyForm, companyRoleCustom: e.target.value });
                                                    }}
                                                    placeholder="Ex: Empresa de Sinalização Rodoviária"
                                                    className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                                />
                                            </InputGroup>
                                        )}
                                        <InputGroup label="Natureza Jurídica">
                                            <select
                                                value={companyForm.legalForm}
                                                onChange={e => {
                                                    isFormEditedRef.current = true;
                                                    setCompanyForm({ ...companyForm, legalForm: e.target.value as any });
                                                }}
                                                className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                            >
                                                <option value="lda">Lda. (Sociedade por Quotas)</option>
                                                <option value="unipessoal">Unipessoal Lda.</option>
                                                <option value="sa">S.A. (Sociedade Anónima)</option>
                                                <option value="eni">ENI (Empresário em Nome Individual)</option>
                                                <option value="ace">ACE (Agrupamento Complementar de Empresas)</option>
                                                <option value="other">Outra</option>
                                            </select>
                                        </InputGroup>
                                        <InputGroup label="Estado Operacional">
                                            <select
                                                value={companyForm.status}
                                                onChange={e => {
                                                    isFormEditedRef.current = true;
                                                    setCompanyForm({ ...companyForm, status: e.target.value as any });
                                                }}
                                                className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                            >
                                                <option value="active">Ativa / Em Laboração</option>
                                                <option value="inactive">Inativa / Suspensa</option>
                                            </select>
                                        </InputGroup>
                                        <InputGroup label="Código CAE Principal">
                                            <input
                                                type="text"
                                                value={companyForm.caeCode}
                                                onChange={e => {
                                                    isFormEditedRef.current = true;
                                                    setCompanyForm({ ...companyForm, caeCode: e.target.value });
                                                }}
                                                className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary font-mono"
                                                placeholder="ex: 41200"
                                            />
                                        </InputGroup>
                                        <InputGroup label="Atividade Principal">
                                            <input
                                                type="text"
                                                value={companyForm.activity}
                                                onChange={e => {
                                                    isFormEditedRef.current = true;
                                                    setCompanyForm({ ...companyForm, activity: e.target.value });
                                                }}
                                                className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                                placeholder="ex: Construção Civil e Obras Públicas"
                                            />
                                        </InputGroup>
                                        <InputGroup label="Alvará / Título IMPIC">
                                            <input
                                                type="text"
                                                value={companyForm.impic}
                                                onChange={e => {
                                                    isFormEditedRef.current = true;
                                                    setCompanyForm({ ...companyForm, impic: e.target.value });
                                                }}
                                                className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                                placeholder="ex: IMPIC 12345"
                                            />
                                        </InputGroup>
                                    </div>
                                </div>

                                <div className="bg-[var(--bg-input)]/30 border border-[var(--border)] rounded-2xl p-5 space-y-4">
                                    <h4 className="font-bold text-xs text-[var(--text)] flex items-center gap-2 pb-2 border-b border-[var(--border)]">
                                        <MapPin size={14} className="text-primary" /> Contactos e Sede
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <InputGroup label="Email Geral">
                                            <input
                                                type="email"
                                                value={companyForm.email}
                                                onChange={e => {
                                                    isFormEditedRef.current = true;
                                                    setCompanyForm({ ...companyForm, email: e.target.value });
                                                }}
                                                className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                            />
                                        </InputGroup>
                                        <InputGroup label="Telefone Geral">
                                            <input
                                                type="text"
                                                value={companyForm.phone}
                                                onChange={e => {
                                                    isFormEditedRef.current = true;
                                                    setCompanyForm({ ...companyForm, phone: e.target.value });
                                                }}
                                                className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                            />
                                        </InputGroup>
                                        <div className="sm:col-span-2">
                                            <InputGroup label="Sede / Morada">
                                                <input
                                                    type="text"
                                                    value={companyForm.address}
                                                    onChange={e => {
                                                        isFormEditedRef.current = true;
                                                        setCompanyForm({ ...companyForm, address: e.target.value });
                                                    }}
                                                    className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                                />
                                            </InputGroup>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-[var(--bg-input)]/30 border border-[var(--border)] rounded-2xl p-5 space-y-4">
                                    <h4 className="font-bold text-xs text-[var(--text)] flex items-center gap-2 pb-2 border-b border-[var(--border)]">
                                        <Shield size={14} className="text-primary" /> Seguros Obrigatórios & Certidões Legais
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <InputGroup label="Apólice Seguro Acidentes Trabalho">
                                            <input
                                                type="text"
                                                value={companyForm.insuranceWorkAccPolicy}
                                                onChange={e => {
                                                    isFormEditedRef.current = true;
                                                    setCompanyForm({ ...companyForm, insuranceWorkAccPolicy: e.target.value });
                                                }}
                                                className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                            />
                                        </InputGroup>
                                        <InputGroup label="Validade Seguro Acidentes Trabalho">
                                            <input
                                                type="date"
                                                value={companyForm.insuranceWorkAccDate}
                                                onChange={e => {
                                                    isFormEditedRef.current = true;
                                                    setCompanyForm({ ...companyForm, insuranceWorkAccDate: e.target.value });
                                                }}
                                                className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                            />
                                        </InputGroup>
                                        <InputGroup label="Apólice Seguro Resp. Civil">
                                            <input
                                                type="text"
                                                value={companyForm.insuranceCivilPolicy}
                                                onChange={e => {
                                                    isFormEditedRef.current = true;
                                                    setCompanyForm({ ...companyForm, insuranceCivilPolicy: e.target.value });
                                                }}
                                                className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                            />
                                        </InputGroup>
                                        <InputGroup label="Validade Seguro Resp. Civil">
                                            <input
                                                type="date"
                                                value={companyForm.insuranceCivilDate}
                                                onChange={e => {
                                                    isFormEditedRef.current = true;
                                                    setCompanyForm({ ...companyForm, insuranceCivilDate: e.target.value });
                                                }}
                                                className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                            />
                                        </InputGroup>
                                        <InputGroup label="Validade Certidão Não Dívida Seg. Social">
                                            <input
                                                type="date"
                                                value={companyForm.cleanSSDate}
                                                onChange={e => {
                                                    isFormEditedRef.current = true;
                                                    setCompanyForm({ ...companyForm, cleanSSDate: e.target.value });
                                                }}
                                                className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                            />
                                        </InputGroup>
                                        <InputGroup label="Validade Certidão Não Dívida Finanças">
                                            <input
                                                type="date"
                                                value={companyForm.cleanFinDate}
                                                onChange={e => {
                                                    isFormEditedRef.current = true;
                                                    setCompanyForm({ ...companyForm, cleanFinDate: e.target.value });
                                                }}
                                                className="w-full p-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                            />
                                        </InputGroup>
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-2 pt-2">
                                    <SecondaryButton type="button" onClick={() => setCompanyModalMode('view')}>
                                        Cancelar / Voltar à Visualização
                                    </SecondaryButton>
                                    <PrimaryButton type="submit" className="py-2 px-5 text-xs font-bold">
                                        Guardar Alterações
                                    </PrimaryButton>
                                </div>
                            </form>
                        )}
                    </Modal>

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

                    {/* Modal CDE da Empresa */}
                    <CDESettingsModal
                        isOpen={isCdeModalOpen}
                        onClose={() => setIsCdeModalOpen(false)}
                        projectId={masterCompany?.id || 'comp_master'}
                        title="Ambiente Comum de Dados (CDE) da Empresa"
                    />
                </div>
            )}
        </AuthGuard>
    );
}
