import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Modal, PrimaryButton, SecondaryButton } from './Modal';
import {
    Plus,
    Trash2,
    Save,
    FileText,
    Check,
    AlertCircle,
    Lock,
    Star,
    Timer,
    Shield,
    ShieldCheck,
    Landmark,
    HardHat,
    HeartPulse,
    GraduationCap,
    FileCheck,
    Wrench,
    FileBadge,
    Layers,
    FolderPlus,
    Folder,
    Info,
    Sparkles,
} from 'lucide-react';
import { nanoid } from 'nanoid';
import { cn } from '../lib/utils';
import { CustomDocumentDefinition } from '../types';
import { CDE_THEMES } from '../lib/cde-manager';
import { useTranslations } from 'next-intl';

export type ProfileType = 'company' | 'worker' | 'equipment';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    entityType: ProfileType;
}

// Standard metadata for dates and expiration
const STANDARD_DATE_DOC_CONFIG: Record<string, { isMonth?: boolean; defaultExpiry: boolean }> = {
    insurance_at: { defaultExpiry: true },
    insurance_rc: { defaultExpiry: true },
    finance_ss: { defaultExpiry: true },
    finance_fin: { defaultExpiry: true },
    ss_discount: { isMonth: true, defaultExpiry: true },
    pss_acceptance: { defaultExpiry: false },
    work_schedule: { defaultExpiry: false },
    medical_fitness: { defaultExpiry: true },
    induction: { defaultExpiry: false },
    epi: { defaultExpiry: false },
    specific_training: { defaultExpiry: true },
    contract: { defaultExpiry: true },
    maintenance: { defaultExpiry: true },
    inspection: { defaultExpiry: true },
    insurance: { defaultExpiry: true },
    property_title: { defaultExpiry: false }
};

export interface SubjectDefinition {
    id: string;
    title: string;
    description: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    colorClass: string;
    standardDocIds: string[];
    defaultFolder: string;
    suggestedFolders: string[];
}

// Agrupamento por assunto (DL 273/2003 para empresas, normas de segurança para trabalhadores e equipamentos)
export const PROFILE_SUBJECTS: Record<ProfileType, SubjectDefinition[]> = {
    company: [
        {
            id: 'insurance_policies',
            title: 'Seguros e Apólices',
            description: 'Apólices e recibos de seguros obrigatórios (Acidentes de Trabalho e Responsabilidade Civil).',
            icon: Shield,
            colorClass: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/40',
            standardDocIds: ['insurance_at', 'insurance_rc'],
            defaultFolder: 'Seguros e Apólices',
            suggestedFolders: ['Seguros e Apólices', '01-Seguros', 'Apólices e Recibos']
        },
        {
            id: 'state_obligations',
            title: 'Obrigações do Estado',
            description: 'Declarações fiscais, certidões da Segurança Social e folhas de remunerações/descontos.',
            icon: Landmark,
            colorClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/40',
            standardDocIds: ['finance_ss', 'finance_fin', 'ss_discount'],
            defaultFolder: 'Obrigações do Estado',
            suggestedFolders: ['Obrigações do Estado', '02-Certidões e Impostos', 'Finanças e Segurança Social']
        },
        {
            id: 'site_documents',
            title: 'Documentos de Obra',
            description: 'Aceitação formal do Plano de Segurança e Saúde (PSS) e horários de trabalho autorizados.',
            icon: HardHat,
            colorClass: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/40',
            standardDocIds: ['pss_acceptance', 'work_schedule'],
            defaultFolder: 'Documentos de Obra',
            suggestedFolders: ['Documentos de Obra', '03-Documentos de Estaleiro', 'PSS e Horários']
        }
    ],
    worker: [
        {
            id: 'worker_health',
            title: 'Aptidão Médica e Segurança',
            description: 'Fichas de aptidão médica e comprovativos de receção de Equipamentos de Proteção Individual.',
            icon: HeartPulse,
            colorClass: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/40',
            standardDocIds: ['medical_fitness', 'epi'],
            defaultFolder: 'Aptidão Médica e Segurança',
            suggestedFolders: ['Aptidão Médica e Segurança', '01-Medicina e EPI', 'Saúde Ocupacional']
        },
        {
            id: 'worker_training',
            title: 'Formação e Acolhimento',
            description: 'Acolhimento na obra e certificados de formação técnica específica.',
            icon: GraduationCap,
            colorClass: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/40',
            standardDocIds: ['induction', 'specific_training'],
            defaultFolder: 'Formação e Acolhimento',
            suggestedFolders: ['Formação e Acolhimento', '02-Formação Técnica', 'Certificados']
        },
        {
            id: 'worker_contract',
            title: 'Documentação Legal e Contratual',
            description: 'Contratos de trabalho, certidões e autorizações legais.',
            icon: FileCheck,
            colorClass: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800/40',
            standardDocIds: ['contract'],
            defaultFolder: 'Documentação Legal e Contratual',
            suggestedFolders: ['Documentação Legal e Contratual', '03-Contratos', 'Identificação e Vistos']
        }
    ],
    equipment: [
        {
            id: 'equip_maintenance',
            title: 'Manutenção e Inspeções',
            description: 'Relatórios de manutenção preventiva e certificados de inspeção periódica obrigatória.',
            icon: Wrench,
            colorClass: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800/40',
            standardDocIds: ['maintenance', 'inspection'],
            defaultFolder: 'Manutenção e Inspeções',
            suggestedFolders: ['Manutenção e Inspeções', '01-Manutenção', 'Relatórios Periódicos']
        },
        {
            id: 'equip_insurance',
            title: 'Seguro e Conformidade',
            description: 'Apólice de seguro de máquinas e declarações de conformidade CE.',
            icon: ShieldCheck,
            colorClass: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800/40',
            standardDocIds: ['insurance'],
            defaultFolder: 'Seguro e Conformidade',
            suggestedFolders: ['Seguro e Conformidade', '02-Seguros e CE', 'Conformidade Legal']
        },
        {
            id: 'equip_property',
            title: 'Registo e Propriedade',
            description: 'Título de registo de propriedade e documentos de identificação do equipamento.',
            icon: FileBadge,
            colorClass: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/40',
            standardDocIds: ['property_title'],
            defaultFolder: 'Registo e Propriedade',
            suggestedFolders: ['Registo e Propriedade', '03-Livrete e Matrícula', 'Títulos']
        }
    ]
};

// Nomes descritivos padrão em português
const DOC_FALLBACK_LABELS: Record<string, string> = {
    insurance_at: 'Seguro de Acidentes de Trabalho',
    insurance_rc: 'Seguro de Responsabilidade Civil',
    finance_ss: 'Declaração Não Dívida — Segurança Social',
    finance_fin: 'Declaração Não Dívida — Finanças (AT)',
    ss_discount: 'Folha de Remunerações / Descontos (Segurança Social)',
    pss_acceptance: 'Declaração de Aceitação do PSS',
    work_schedule: 'Horário de Trabalho e Mapa de Pessoal',
    medical_fitness: 'Ficha de Aptidão Médica',
    induction: 'Acolhimento em Obra',
    epi: 'Registo de Entrega de EPI',
    specific_training: 'Formação Específica',
    contract: 'Contrato de Trabalho',
    maintenance: 'Relatórios de Manutenção',
    inspection: 'Inspeção / Certificado CE',
    insurance: 'Seguro do Equipamento',
    property_title: 'Título de Propriedade / Registo'
};

export const ProfileManagerModal: React.FC<Props> = ({ isOpen, onClose, projectId, entityType }) => {
    const t = useTranslations('Components.ProfileManager');
    const store = useStore();
    const currentProject = store.projects.find(p => p.id === projectId);
    const userRole = store.currentUser ? store.getUserRoleInProject(store.currentUser.id, projectId) : null;
    const isManager = userRole === 'manager' || store.currentUser?.role === 'admin' || store.currentUser?.role === 'superadmin' || projectId.startsWith('comp_');

    const subjects = PROFILE_SUBJECTS[entityType] || [];
    const allStandardDocIds = useMemo(() => subjects.flatMap(s => s.standardDocIds), [subjects]);

    // Obter perfis segundo o tipo de entidade
    const getProfiles = () => {
        if (entityType === 'company') return store.companyProfiles;
        if (entityType === 'worker') return store.workerProfiles;
        return store.equipmentProfiles;
    };

    const getUsageCount = (profileId: string) => {
        if (entityType === 'company') return store.companies.filter(c => c.profileId === profileId && c.projectId === projectId).length;
        if (entityType === 'worker') return store.workers.filter(w => w.profileId === profileId && w.projectId === projectId).length;
        return store.equipment.filter(e => e.profileId === profileId && e.projectId === projectId).length;
    };

    const deleteProfile = (id: string) => {
        if (entityType === 'company') store.deleteCompanyProfile(id);
        if (entityType === 'worker') store.deleteWorkerProfile(id);
        if (entityType === 'equipment') store.deleteEquipmentProfile(id);
    };

    const saveProfile = (isNew: boolean, data: any) => {
        if (isNew) {
            const newProfile = {
                id: nanoid(),
                projectId: projectId,
                name: data.name,
                requirements: data.requirements || {},
                standardUploads: data.standardUploads || {},
                standardDocConfig: data.standardDocConfig || {},
                subjectFolders: data.subjectFolders || {},
                customDocuments: data.customDocuments || [],
                createdAt: new Date().toISOString()
            };
            if (entityType === 'company') store.addCompanyProfile(newProfile);
            if (entityType === 'worker') store.addWorkerProfile(newProfile);
            if (entityType === 'equipment') store.addEquipmentProfile(newProfile);
        } else {
            const updates = {
                name: data.name,
                requirements: data.requirements,
                standardUploads: data.standardUploads,
                standardDocConfig: data.standardDocConfig || {},
                subjectFolders: data.subjectFolders || {},
                customDocuments: data.customDocuments
            };
            if (entityType === 'company') store.updateCompanyProfile(editingId!, updates);
            if (entityType === 'worker') store.updateWorkerProfile(editingId!, updates);
            if (entityType === 'equipment') store.updateEquipmentProfile(editingId!, updates);
        }
    };

    const projectProfiles = getProfiles().filter(p => p.projectId === projectId);

    // Auto-criação do Perfil Padrão DL 273/2003 caso não exista nenhum perfil no projeto
    React.useEffect(() => {
        if (!isOpen || !projectId) return;
        const currentProfiles = getProfiles().filter(p => p.projectId === projectId);
        if (currentProfiles.length === 0) {
            const stdId = `std_${entityType}_${projectId}`;
            const defaultConfig: Record<string, { isExpirationDate: boolean; toleranceDays: number }> = {};
            Object.entries(STANDARD_DATE_DOC_CONFIG).forEach(([docId, meta]) => {
                defaultConfig[docId] = { isExpirationDate: meta.defaultExpiry, toleranceDays: 0 };
            });
            const defaultRequirements = allStandardDocIds.reduce((acc, id) => ({ ...acc, [id]: true }), {});
            const defaultUploads = allStandardDocIds.reduce((acc, id) => ({ ...acc, [id]: true }), {});

            const defaultFolders: Record<string, string> = {};
            subjects.forEach(s => {
                defaultFolders[s.id] = s.defaultFolder;
            });
            const newProfile = {
                id: stdId,
                projectId,
                name: entityType === 'company' ? 'Perfil Padrão (DL 273/2003)' : 'Perfil Padrão',
                requirements: defaultRequirements,
                standardUploads: defaultUploads,
                standardDocConfig: defaultConfig,
                subjectFolders: defaultFolders,
                customDocuments: [],
                isSystem: false,
                createdAt: new Date().toISOString()
            };
            if (entityType === 'company') store.addCompanyProfile(newProfile);
            if (entityType === 'worker') store.addWorkerProfile(newProfile);
            if (entityType === 'equipment') store.addEquipmentProfile(newProfile);
        }
    }, [isOpen, projectId, entityType, allStandardDocIds]);

    // Local State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formState, setFormState] = useState<{
        name: string;
        requirements: Record<string, boolean>;
        standardUploads: Record<string, boolean>;
        standardDocConfig: Record<string, { isExpirationDate: boolean; toleranceDays: number }>;
        subjectFolders: Record<string, string>;
        customDocuments: CustomDocumentDefinition[];
        isSystem?: boolean;
    }>({
        name: '',
        requirements: {},
        standardUploads: {},
        standardDocConfig: {},
        subjectFolders: {},
        customDocuments: []
    });

    // Form para novo documento personalizado
    const [newDocName, setNewDocName] = useState('');
    const [newDocSubject, setNewDocSubject] = useState(subjects[0]?.title || 'Seguros e Apólices');
    const [customSubjectInput, setCustomSubjectInput] = useState('');
    const [newDocType, setNewDocType] = useState<'text' | 'date' | 'month' | 'number' | 'boolean' | 'single_select'>('date');
    const [newDocUpload, setNewDocUpload] = useState(true);
    const [newDocExpires, setNewDocExpires] = useState(true);
    const [newDocTolerance, setNewDocTolerance] = useState(0);
    const [newDocOptions, setNewDocOptions] = useState('');
    const [isAddingCustomDoc, setIsAddingCustomDoc] = useState(false);

    // Selecionar o primeiro perfil por defeito ao abrir
    React.useEffect(() => {
        if (isOpen && !editingId && projectProfiles.length > 0) {
            handleEdit(projectProfiles[0]);
        }
    }, [isOpen, projectProfiles.length]);

    const handleEdit = (profile: any) => {
        setEditingId(profile.id);
        const defaultConfig: Record<string, { isExpirationDate: boolean; toleranceDays: number }> = {};
        Object.entries(STANDARD_DATE_DOC_CONFIG).forEach(([docId, meta]) => {
            defaultConfig[docId] = profile.standardDocConfig?.[docId] ?? {
                isExpirationDate: meta.defaultExpiry,
                toleranceDays: 0,
            };
        });
        const initialFolders: Record<string, string> = {};
        subjects.forEach(s => {
            initialFolders[s.id] = profile.subjectFolders?.[s.id] || profile.subjectFolders?.[s.title] || s.defaultFolder;
        });
        if (profile.subjectFolders) {
            Object.assign(initialFolders, profile.subjectFolders);
        }
        setFormState({
            name: profile.name,
            requirements: profile.requirements || {},
            standardUploads: profile.standardUploads || {},
            standardDocConfig: defaultConfig,
            subjectFolders: initialFolders,
            customDocuments: profile.customDocuments || [],
            isSystem: profile.isSystem
        });
        setIsAddingCustomDoc(false);
    };

    const handleCreate = () => {
        setEditingId('new');
        const defaultConfig: Record<string, { isExpirationDate: boolean; toleranceDays: number }> = {};
        Object.entries(STANDARD_DATE_DOC_CONFIG).forEach(([docId, meta]) => {
            defaultConfig[docId] = { isExpirationDate: meta.defaultExpiry, toleranceDays: 0 };
        });
        const defaultFolders: Record<string, string> = {};
        subjects.forEach(s => {
            defaultFolders[s.id] = s.defaultFolder;
        });
        setFormState({
            name: '',
            requirements: allStandardDocIds.reduce((acc, id) => ({ ...acc, [id]: true }), {}),
            standardUploads: allStandardDocIds.reduce((acc, id) => ({ ...acc, [id]: true }), {}),
            standardDocConfig: defaultConfig,
            subjectFolders: defaultFolders,
            customDocuments: []
        });
        setIsAddingCustomDoc(false);
    };

    const handleSave = () => {
        if (!formState.name.trim()) {
            alert(t('name') + " é obrigatório");
            return;
        }
        saveProfile(editingId === 'new', formState);
        setEditingId(null);
    };

    const toggleRequirement = (key: string) => {
        const current = formState.requirements?.[key] || false;
        const newRequirements = { ...formState.requirements, [key]: !current };
        const newUploads = { ...formState.standardUploads };
        if (current) {
            delete newUploads[key];
        } else {
            newUploads[key] = true;
        }

        setFormState({
            ...formState,
            requirements: newRequirements,
            standardUploads: newUploads
        });
    };

    const toggleUploadRequirement = (key: string) => {
        const current = formState.standardUploads?.[key] || false;
        setFormState({
            ...formState,
            standardUploads: {
                ...formState.standardUploads,
                [key]: !current
            }
        });
    };

    const handleAddCustomDoc = () => {
        if (!newDocName.trim()) {
            alert("O nome do documento é obrigatório.");
            return;
        }
        const effectiveSubject = newDocSubject === '__custom__'
            ? (customSubjectInput.trim() || 'Documentos Personalizados')
            : newDocSubject;

        const newDoc: CustomDocumentDefinition = {
            id: nanoid(),
            name: newDocName.trim(),
            subject: effectiveSubject,
            dataType: newDocType,
            options: newDocOptions ? newDocOptions.split(',').map(s => s.trim()).filter(Boolean) : [],
            requiresUpload: newDocUpload,
            isExpirationDate: (newDocType === 'date' || newDocType === 'month') ? newDocExpires : false,
            toleranceDays: (newDocType === 'date' || newDocType === 'month') && newDocExpires ? newDocTolerance : undefined,
        };

        setFormState(prev => ({
            ...prev,
            customDocuments: [...(prev.customDocuments || []), newDoc]
        }));

        // Reset
        setNewDocName('');
        setCustomSubjectInput('');
        setNewDocOptions('');
        setNewDocUpload(true);
        setNewDocExpires(true);
        setNewDocTolerance(0);
        setIsAddingCustomDoc(false);
    };

    const removeCustomDoc = (id: string) => {
        setFormState({
            ...formState,
            customDocuments: formState.customDocuments?.filter(d => d.id !== id)
        });
    };

    // Estatísticas do perfil atual
    const activeReqCount = useMemo(() => {
        const stdCount = Object.values(formState.requirements || {}).filter(Boolean).length;
        const customCount = (formState.customDocuments || []).length;
        return stdCount + customCount;
    }, [formState.requirements, formState.customDocuments]);

    const activeUploadCount = useMemo(() => {
        const stdUploads = Object.values(formState.standardUploads || {}).filter(Boolean).length;
        const customUploads = (formState.customDocuments || []).filter(d => d.requiresUpload).length;
        return stdUploads + customUploads;
    }, [formState.standardUploads, formState.customDocuments]);

    const activeExpiryCount = useMemo(() => {
        const stdExp = Object.keys(formState.requirements || {}).filter(k =>
            formState.requirements[k] && formState.standardDocConfig?.[k]?.isExpirationDate
        ).length;
        const customExp = (formState.customDocuments || []).filter(d => d.isExpirationDate).length;
        return stdExp + customExp;
    }, [formState.requirements, formState.standardDocConfig, formState.customDocuments]);

    const defaultProfileId = entityType === 'company'
        ? currentProject?.defaultCompanyProfileId
        : entityType === 'worker'
            ? currentProject?.defaultWorkerProfileId
            : currentProject?.defaultEquipmentProfileId;

    const isCurrentDefault = Boolean(editingId && editingId === defaultProfileId);

    // Assuntos extras criados pelos documentos personalizados
    const extraCustomSubjects = useMemo(() => {
        const standardTitles = new Set(subjects.map(s => s.title.toLowerCase()));
        const extras = new Set<string>();
        (formState.customDocuments || []).forEach(d => {
            const sub = (d.subject || '').trim();
            if (sub && !standardTitles.has(sub.toLowerCase())) {
                extras.add(sub);
            }
        });
        return Array.from(extras);
    }, [subjects, formState.customDocuments]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={entityType === 'company' ? 'Perfis de Documentos — Empresas (DL 273/2003)' : t(`types.${entityType}` as any)}
            maxWidth="max-w-5xl"
            resizable
        >
            <div className="flex flex-col md:flex-row gap-6 min-h-[560px] max-h-[80vh]">
                {/* ════════ SIDEBAR ESQUERDA: LISTA DE PERFIS ════════ */}
                <div className="w-full md:w-72 shrink-0 border-b md:border-b-0 md:border-r border-gray-200 dark:border-[#444746] pr-0 md:pr-4 flex flex-col">
                    <div className="flex justify-between items-center mb-3">
                        <div>
                            <h3 className="font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                {t('title') || 'Perfis de Requisitos'}
                            </h3>
                            <p className="text-[11px] text-gray-400 mt-0.5">Modelos de conformidade</p>
                        </div>
                        <button
                            onClick={handleCreate}
                            className="p-1.5 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors shadow-xs flex items-center gap-1 text-xs font-semibold cursor-pointer"
                            title={t('create') || 'Novo Perfil'}
                        >
                            <Plus size={14} /> Novo
                        </button>
                    </div>

                    <div className="space-y-2 overflow-y-auto flex-1 pr-1">
                        {projectProfiles.length === 0 && (
                            <p className="text-xs text-gray-400 italic text-center py-6">
                                {t('noProfiles') || 'Nenhum perfil configurado.'}
                            </p>
                        )}
                        {projectProfiles.map(p => {
                            const usageCount = getUsageCount(p.id);
                            const isUsed = usageCount > 0;
                            const isSelected = editingId === p.id;
                            const isDefault = p.id === defaultProfileId;

                            return (
                                <div
                                    key={p.id}
                                    onClick={() => handleEdit(p)}
                                    className={cn(
                                        "p-3 rounded-xl border cursor-pointer flex flex-col gap-1.5 transition-all text-left group",
                                        isSelected
                                            ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-xs ring-1 ring-primary/20"
                                            : "border-gray-200 dark:border-[#444746] hover:bg-gray-50 dark:hover:bg-[#131314] hover:border-gray-300"
                                    )}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className={cn(
                                            "font-semibold text-xs truncate flex items-center gap-1.5",
                                            isSelected ? "text-primary dark:text-primary-light" : "text-gray-800 dark:text-gray-200"
                                        )}>
                                            {p.isSystem && <Lock size={12} className="text-amber-500 shrink-0" />}
                                            {isDefault && <Star size={12} className="text-amber-500 fill-amber-500 shrink-0" />}
                                            {p.name}
                                        </span>
                                        {!p.isSystem && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (isUsed) return;
                                                    if (confirm(`Tem a certeza que deseja eliminar o perfil "${p.name}"?`)) {
                                                        deleteProfile(p.id);
                                                        if (editingId === p.id) setEditingId(null);
                                                    }
                                                }}
                                                className={cn(
                                                    "opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-all cursor-pointer",
                                                    isUsed && "hidden"
                                                )}
                                                title={isUsed ? t('cannotDelete', { count: usageCount }) : t('deleteProfile')}
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        {isDefault && (
                                            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
                                                Padrão
                                            </span>
                                        )}
                                        <span className="text-[10px] text-gray-400">
                                            {isUsed ? `${usageCount} em uso` : 'Sem uso'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ════════ PAINEL DIREITO: EDITOR DO PERFIL ════════ */}
                <div className="flex-1 flex flex-col overflow-y-auto pr-1">
                    {editingId ? (
                        <div className="space-y-6">
                            {/* Cabeçalho do Perfil & Indicadores */}
                            <div className="bg-gray-50/70 dark:bg-surface/60 rounded-xl p-4 border border-gray-200/80 dark:border-[#444746] space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex-1">
                                        <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                                            {t('name') || 'Nome do Perfil'}
                                        </label>
                                        <input
                                            type="text"
                                            value={formState.name}
                                            onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                                            disabled={!!formState.isSystem}
                                            placeholder="Ex: Perfil Padrão (DL 273/2003)"
                                            className="w-full px-3 py-2 text-sm font-semibold rounded-lg border border-gray-300 dark:border-[#444746] bg-white dark:bg-[#131314] text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:opacity-60"
                                        />
                                    </div>
                                    {isManager && editingId !== 'new' && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const field = entityType === 'company' ? 'defaultCompanyProfileId' :
                                                    entityType === 'worker' ? 'defaultWorkerProfileId' :
                                                        'defaultEquipmentProfileId';
                                                store.updateProjectSettings(projectId, { [field]: editingId });
                                            }}
                                            disabled={isCurrentDefault}
                                            className={cn(
                                                "self-start sm:self-end px-3 py-2 text-xs font-semibold rounded-lg border flex items-center gap-1.5 transition-all shadow-xs cursor-pointer",
                                                isCurrentDefault
                                                    ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/40 cursor-default"
                                                    : "bg-white dark:bg-[#131314] text-gray-700 dark:text-gray-200 border-gray-300 dark:border-[#444746] hover:border-amber-400 hover:text-amber-600"
                                            )}
                                        >
                                            <Star size={14} className={cn(isCurrentDefault && "fill-amber-500 text-amber-500")} />
                                            {isCurrentDefault ? 'Perfil Padrão da Obra' : 'Definir como Padrão'}
                                        </button>
                                    )}
                                </div>

                                {/* KPIs rápidos de controlo */}
                                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-gray-200/60 dark:border-[#444746]">
                                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                                        <Layers size={14} className="text-primary shrink-0" />
                                        <span><strong>{activeReqCount}</strong> requisitos ativos</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                                        <FileText size={14} className="text-orange-500 shrink-0" />
                                        <span><strong>{activeUploadCount}</strong> com upload</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                                        <Timer size={14} className="text-emerald-500 shrink-0" />
                                        <span><strong>{activeExpiryCount}</strong> com prazos</span>
                                    </div>
                                </div>
                            </div>

                            {/* ════════ SECÇÃO: DOCUMENTOS AGREGADOS POR ASSUNTO ════════ */}
                            <div className="space-y-5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                            Requisitos Agrupados por Assunto
                                        </h4>
                                        <p className="text-[11px] text-gray-400 mt-0.5">
                                            Selecione os requisitos obrigatórios e configure o método de upload e controlo de validade.
                                        </p>
                                    </div>
                                    {!formState.isSystem && (
                                        <button
                                            type="button"
                                            onClick={() => setIsAddingCustomDoc(!isAddingCustomDoc)}
                                            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 dark:bg-blue-950/40 text-primary dark:text-primary-light border border-primary/20 hover:bg-primary/10 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                                        >
                                            <FolderPlus size={14} />
                                            {isAddingCustomDoc ? 'Fechar Adição' : '+ Documento Personalizado'}
                                        </button>
                                    )}
                                </div>

                                {/* Formulário para Novo Documento Personalizado */}
                                {isAddingCustomDoc && (
                                    <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 dark:bg-primary/10 space-y-3 animate-in fade-in duration-150">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-xs text-primary dark:text-primary-light flex items-center gap-1.5">
                                                <Sparkles size={14} /> Novo Documento / Requisito Personalizado
                                            </span>
                                            <button
                                                onClick={() => setIsAddingCustomDoc(false)}
                                                className="text-xs text-gray-400 hover:text-gray-600"
                                            >
                                                Cancelar
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">
                                                    Nome do Documento *
                                                </label>
                                                <input
                                                    type="text"
                                                    value={newDocName}
                                                    onChange={(e) => setNewDocName(e.target.value)}
                                                    placeholder="Ex: Certidão Comercial / Alvará"
                                                    className="w-full px-2.5 py-1.5 text-xs border rounded-lg bg-white dark:bg-[#131314] border-gray-300 dark:border-[#444746] text-gray-800 dark:text-gray-100 outline-none focus:ring-1 focus:ring-primary"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">
                                                    Assunto / Grupo de Agregação *
                                                </label>
                                                <select
                                                    value={newDocSubject}
                                                    onChange={(e) => setNewDocSubject(e.target.value)}
                                                    className="w-full px-2.5 py-1.5 text-xs border rounded-lg bg-white dark:bg-[#131314] border-gray-300 dark:border-[#444746] text-gray-800 dark:text-gray-100 outline-none focus:ring-1 focus:ring-primary"
                                                >
                                                    {subjects.map(s => (
                                                        <option key={s.id} value={s.title}>{s.title}</option>
                                                    ))}
                                                    <option value="__custom__">+ Outro Assunto Personalizado...</option>
                                                </select>
                                            </div>
                                        </div>

                                        {newDocSubject === '__custom__' && (
                                            <div>
                                                <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">
                                                    Designação do Novo Assunto
                                                </label>
                                                <input
                                                    type="text"
                                                    value={customSubjectInput}
                                                    onChange={(e) => setCustomSubjectInput(e.target.value)}
                                                    placeholder="Ex: Certificações ISO e Ambiente"
                                                    className="w-full px-2.5 py-1.5 text-xs border rounded-lg bg-white dark:bg-[#131314] border-gray-300 dark:border-[#444746] text-gray-800 dark:text-gray-100 outline-none focus:ring-1 focus:ring-primary"
                                                />
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">
                                                    Tipo de Dados
                                                </label>
                                                <select
                                                    value={newDocType}
                                                    onChange={(e) => setNewDocType(e.target.value as any)}
                                                    className="w-full px-2.5 py-1.5 text-xs border rounded-lg bg-white dark:bg-[#131314] border-gray-300 dark:border-[#444746] text-gray-800 dark:text-gray-100 outline-none focus:ring-1 focus:ring-primary"
                                                >
                                                    <option value="date">Data (Dia / Mês / Ano)</option>
                                                    <option value="month">Mês (Mês / Ano)</option>
                                                    <option value="text">Texto Livre</option>
                                                    <option value="number">Número</option>
                                                    <option value="boolean">Sim / Não</option>
                                                    <option value="single_select">Seleção de Opções</option>
                                                </select>
                                            </div>

                                            {newDocType === 'single_select' && (
                                                <div>
                                                    <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">
                                                        Opções (separadas por vírgula)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={newDocOptions}
                                                        onChange={(e) => setNewDocOptions(e.target.value)}
                                                        placeholder="Válido, Isento, Em aprovação"
                                                        className="w-full px-2.5 py-1.5 text-xs border rounded-lg bg-white dark:bg-[#131314] border-gray-300 dark:border-[#444746] text-gray-800 dark:text-gray-100 outline-none"
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-5 pt-1">
                                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={newDocUpload}
                                                    onChange={(e) => setNewDocUpload(e.target.checked)}
                                                    className="w-3.5 h-3.5 text-primary rounded"
                                                />
                                                <span className="text-xs text-gray-700 dark:text-gray-200 font-medium flex items-center gap-1">
                                                    <FileText size={12} className="text-orange-500" /> Requer Upload de Documento (PDF)
                                                </span>
                                            </label>

                                            {(newDocType === 'date' || newDocType === 'month') && (
                                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                                    <input
                                                        type="checkbox"
                                                        checked={newDocExpires}
                                                        onChange={(e) => setNewDocExpires(e.target.checked)}
                                                        className="w-3.5 h-3.5 text-orange-500 rounded"
                                                    />
                                                    <span className="text-xs text-orange-700 dark:text-orange-400 font-medium flex items-center gap-1">
                                                        <Timer size={12} /> Gera Alerta de Expiração
                                                    </span>
                                                </label>
                                            )}

                                            {(newDocType === 'date' || newDocType === 'month') && newDocExpires && (
                                                <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                                                    <span>Tolerância:</span>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        max={365}
                                                        value={newDocTolerance}
                                                        onChange={(e) => setNewDocTolerance(parseInt(e.target.value, 10) || 0)}
                                                        className="w-12 px-1.5 py-0.5 text-xs text-center border rounded bg-white dark:bg-[#131314]"
                                                    />
                                                    <span className="text-gray-400 text-[11px]">dias</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex justify-end pt-2">
                                            <button
                                                type="button"
                                                onClick={handleAddCustomDoc}
                                                className="px-3.5 py-1.5 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors shadow-xs cursor-pointer"
                                            >
                                                Adicionar ao Assunto
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* RENDERIZAÇÃO DOS ASSUNTOS PADRÃO (SEGUROS, OBRIGAÇÕES ESTADO, OBRA) */}
                                {subjects.map((subject) => {
                                    const SubjectIcon = subject.icon;

                                    // Documentos standard deste assunto
                                    const subjectStandardDocs = subject.standardDocIds;

                                    // Documentos custom associados a este assunto
                                    const subjectCustomDocs = (formState.customDocuments || []).filter(d =>
                                        (d.subject || '').trim().toLowerCase() === subject.title.toLowerCase() ||
                                        d.subject === subject.id
                                    );

                                    // Contagem de ativos no assunto
                                    const activeStandardCount = subjectStandardDocs.filter(id => formState.requirements?.[id]).length;
                                    const totalSubjectCount = subjectStandardDocs.length + subjectCustomDocs.length;
                                    const activeSubjectCount = activeStandardCount + subjectCustomDocs.length;

                                    return (
                                        <div
                                            key={subject.id}
                                            className="rounded-xl border border-gray-200 dark:border-[#444746] bg-white dark:bg-[#1a1a1c] overflow-hidden shadow-2xs"
                                        >
                                            {/* Cabeçalho do Assunto */}
                                            <div className="px-4 py-3 bg-gray-50/80 dark:bg-surface/70 border-b border-gray-200/80 dark:border-[#444746] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                <div className="flex items-center gap-2.5">
                                                    <div className={cn("p-1.5 rounded-lg border", subject.colorClass)}>
                                                        <SubjectIcon size={16} />
                                                    </div>
                                                    <div>
                                                        <h5 className="font-bold text-xs text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                                            {subject.title}
                                                        </h5>
                                                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                                            {subject.description}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className={cn(
                                                    "self-start sm:self-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                                                    activeSubjectCount > 0
                                                        ? "bg-primary/10 text-primary border-primary/20 dark:text-primary-light"
                                                        : "bg-gray-100 text-gray-400 border-gray-200 dark:bg-surface dark:border-[#444746]"
                                                )}>
                                                    {activeSubjectCount} / {totalSubjectCount} Ativos
                                                </span>
                                            </div>

                                            {/* Configuração da Pasta de Destino no CDE */}
                                            <div className="px-4 py-2.5 bg-blue-50/50 dark:bg-blue-950/20 border-b border-gray-200/80 dark:border-[#444746] flex flex-wrap items-center justify-between gap-3 text-xs">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <div className="flex items-center gap-1.5 font-bold text-gray-700 dark:text-gray-200">
                                                        <Folder size={14} className="text-primary" />
                                                        <span>Pasta de Destino CDE:</span>
                                                    </div>
                                                    <div className="relative">
                                                        <input
                                                            type="text"
                                                            list={`folders-${subject.id}`}
                                                            value={formState.subjectFolders?.[subject.id] ?? subject.defaultFolder}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setFormState(prev => ({
                                                                    ...prev,
                                                                    subjectFolders: {
                                                                        ...(prev.subjectFolders || {}),
                                                                        [subject.id]: val
                                                                    }
                                                                }));
                                                            }}
                                                            className="px-2.5 py-1 text-xs font-medium rounded-lg border border-gray-300 dark:border-[#444746] bg-white dark:bg-[#131314] text-gray-900 dark:text-white focus:ring-1 focus:ring-primary outline-none shadow-2xs"
                                                            placeholder={subject.defaultFolder}
                                                        />
                                                        <datalist id={`folders-${subject.id}`}>
                                                            {subject.suggestedFolders.map(f => (
                                                                <option key={f} value={f} />
                                                            ))}
                                                        </datalist>
                                                    </div>
                                                </div>

                                                {/* Pré-visualização do Caminho no CDE */}
                                                <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                                                    <span className="text-gray-400">Destino:</span>
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-[#131314] border border-gray-200 dark:border-gray-700 font-mono text-[10px] text-primary dark:text-primary-light font-semibold">
                                                        {projectId
                                                            ? `[Empresa] / ${CDE_THEMES[entityType]} / ${formState.subjectFolders?.[subject.id] || subject.defaultFolder}`
                                                            : `${CDE_THEMES[entityType]} / ${formState.subjectFolders?.[subject.id] || subject.defaultFolder}`}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Lista de Documentos do Assunto */}
                                            <div className="p-3 space-y-2.5">
                                                {/* Documentos Padrão */}
                                                {subjectStandardDocs.map(docId => {
                                                    const isReq = formState.requirements?.[docId];
                                                    const isUploadReq = formState.standardUploads?.[docId];
                                                    const dateConfig = STANDARD_DATE_DOC_CONFIG[docId];
                                                    const expiryConfig = formState.standardDocConfig?.[docId];
                                                    const label = t(`docTypes.${docId}` as any) || DOC_FALLBACK_LABELS[docId] || docId;

                                                    return (
                                                        <div
                                                            key={docId}
                                                            className={cn(
                                                                "p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all",
                                                                isReq
                                                                    ? "bg-primary-light/20 dark:bg-primary/5 border-primary/25"
                                                                    : "bg-gray-50/50 dark:bg-surface/30 border-gray-200/70 dark:border-[#444746] opacity-75"
                                                            )}
                                                        >
                                                            {/* Checkbox e Nome */}
                                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => !formState.isSystem && toggleRequirement(docId)}
                                                                    disabled={!!formState.isSystem}
                                                                    className={cn(
                                                                        "w-5 h-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer shrink-0",
                                                                        isReq
                                                                            ? "bg-primary border-primary text-white shadow-xs"
                                                                            : "bg-white dark:bg-surface border-gray-300 dark:border-[#444746]"
                                                                    )}
                                                                >
                                                                    {isReq && <Check size={13} strokeWidth={3} />}
                                                                </button>
                                                                <span className={cn(
                                                                    "text-xs truncate",
                                                                    isReq ? "font-bold text-gray-900 dark:text-gray-100" : "text-gray-500 dark:text-gray-400"
                                                                )}>
                                                                    {label}
                                                                </span>
                                                            </div>

                                                            {/* Controlos de Upload e Expiração */}
                                                            {isReq && (
                                                                <div className="flex items-center gap-3 shrink-0 flex-wrap">
                                                                    {/* Toggle Upload */}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => !formState.isSystem && toggleUploadRequirement(docId)}
                                                                        disabled={!!formState.isSystem}
                                                                        className={cn(
                                                                            "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all border",
                                                                            isUploadReq
                                                                                ? "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800/40 shadow-2xs"
                                                                                : "bg-gray-100 text-gray-500 border-gray-200 dark:bg-surface dark:border-[#444746]"
                                                                        )}
                                                                        title={isUploadReq ? "Upload de Ficheiro Obrigatório" : "Apenas registo de dados"}
                                                                    >
                                                                        <FileText size={11} />
                                                                        {isUploadReq ? 'Upload Obrigatório' : 'Apenas Dados'}
                                                                    </button>

                                                                    {/* Controlo de Expiração */}
                                                                    {dateConfig && (
                                                                        <div className="flex items-center gap-2 pl-2 border-l border-gray-200 dark:border-[#444746]">
                                                                            <label className="flex items-center gap-1 cursor-pointer select-none">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    disabled={!!formState.isSystem}
                                                                                    checked={expiryConfig?.isExpirationDate ?? dateConfig.defaultExpiry}
                                                                                    onChange={(e) => {
                                                                                        setFormState(prev => ({
                                                                                            ...prev,
                                                                                            standardDocConfig: {
                                                                                                ...prev.standardDocConfig,
                                                                                                [docId]: {
                                                                                                    isExpirationDate: e.target.checked,
                                                                                                    toleranceDays: expiryConfig?.toleranceDays ?? 0,
                                                                                                }
                                                                                            }
                                                                                        }));
                                                                                    }}
                                                                                    className="w-3 h-3 text-orange-500 rounded"
                                                                                />
                                                                                <span className="text-[11px] text-gray-600 dark:text-gray-300 font-medium flex items-center gap-1">
                                                                                    <Timer size={11} className="text-orange-500" /> Expira
                                                                                </span>
                                                                            </label>

                                                                            {(expiryConfig?.isExpirationDate ?? dateConfig.defaultExpiry) && (
                                                                                <label className="flex items-center gap-1 text-[11px] text-gray-500">
                                                                                    <span>Tol:</span>
                                                                                    <input
                                                                                        type="number"
                                                                                        min={0}
                                                                                        max={365}
                                                                                        disabled={!!formState.isSystem}
                                                                                        value={expiryConfig?.toleranceDays ?? 0}
                                                                                        onChange={(e) => {
                                                                                            setFormState(prev => ({
                                                                                                ...prev,
                                                                                                standardDocConfig: {
                                                                                                    ...prev.standardDocConfig,
                                                                                                    [docId]: {
                                                                                                        isExpirationDate: expiryConfig?.isExpirationDate ?? dateConfig.defaultExpiry,
                                                                                                        toleranceDays: parseInt(e.target.value, 10) || 0,
                                                                                                    }
                                                                                                }
                                                                                            }));
                                                                                        }}
                                                                                        className="w-10 text-[11px] p-0.5 border rounded bg-white dark:bg-[#131314] text-center font-mono"
                                                                                    />
                                                                                    <span>d</span>
                                                                                </label>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}

                                                {/* Documentos Custom integrados neste assunto */}
                                                {subjectCustomDocs.map(doc => (
                                                    <div
                                                        key={doc.id}
                                                        className="p-3 rounded-lg border border-primary/25 bg-primary/5 dark:bg-primary/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                                                    >
                                                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                                            <span className="w-5 h-5 rounded-md bg-primary text-white flex items-center justify-center shrink-0">
                                                                <Check size={13} strokeWidth={3} />
                                                            </span>
                                                            <div className="truncate">
                                                                <span className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate block">
                                                                    {doc.name}
                                                                </span>
                                                                <span className="text-[10px] text-primary/80 font-mono uppercase">
                                                                    Personalizado ({doc.dataType})
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2.5 shrink-0">
                                                            {doc.requiresUpload && (
                                                                <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950/40 dark:text-orange-400">
                                                                    <FileText size={10} /> Upload
                                                                </span>
                                                            )}
                                                            {doc.isExpirationDate && (
                                                                <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400">
                                                                    <Timer size={10} /> Expira{doc.toleranceDays ? ` (${doc.toleranceDays}d)` : ''}
                                                                </span>
                                                            )}
                                                            {!formState.isSystem && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeCustomDoc(doc.id)}
                                                                    className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                                    title="Remover documento"
                                                                >
                                                                    <Trash2 size={13} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* OUTROS ASSUNTOS PERSONALIZADOS (SE EXISTIREM) */}
                                {extraCustomSubjects.map(subjectTitle => {
                                    const extraDocs = (formState.customDocuments || []).filter(d => (d.subject || '').trim().toLowerCase() === subjectTitle.toLowerCase());
                                    if (extraDocs.length === 0) return null;

                                    return (
                                        <div
                                            key={subjectTitle}
                                            className="rounded-xl border border-gray-200 dark:border-[#444746] bg-white dark:bg-[#1a1a1c] overflow-hidden shadow-2xs"
                                        >
                                            <div className="px-4 py-3 bg-gray-50/80 dark:bg-surface/70 border-b border-gray-200/80 dark:border-[#444746] flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 rounded-lg border bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400">
                                                        <Sparkles size={16} />
                                                    </div>
                                                    <h5 className="font-bold text-xs text-gray-900 dark:text-gray-100">
                                                        {subjectTitle}
                                                    </h5>
                                                </div>
                                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                                                    {extraDocs.length} Personalizado{extraDocs.length > 1 ? 's' : ''}
                                                </span>
                                            </div>

                                            {/* Configuração da Pasta de Destino no CDE para Assunto Personalizado */}
                                            <div className="px-4 py-2.5 bg-purple-50/50 dark:bg-purple-950/20 border-b border-gray-200/80 dark:border-[#444746] flex flex-wrap items-center justify-between gap-3 text-xs">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <div className="flex items-center gap-1.5 font-bold text-gray-700 dark:text-gray-200">
                                                        <Folder size={14} className="text-purple-600" />
                                                        <span>Pasta de Destino CDE:</span>
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={formState.subjectFolders?.[subjectTitle] ?? subjectTitle}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setFormState(prev => ({
                                                                ...prev,
                                                                subjectFolders: {
                                                                    ...(prev.subjectFolders || {}),
                                                                    [subjectTitle]: val
                                                                }
                                                            }));
                                                        }}
                                                        className="px-2.5 py-1 text-xs font-medium rounded-lg border border-gray-300 dark:border-[#444746] bg-white dark:bg-[#131314] text-gray-900 dark:text-white focus:ring-1 focus:ring-primary outline-none shadow-2xs"
                                                        placeholder={subjectTitle}
                                                    />
                                                </div>

                                                <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                                                    <span className="text-gray-400">Destino:</span>
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-[#131314] border border-gray-200 dark:border-gray-700 font-mono text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
                                                        {projectId
                                                            ? `📁 [Nome da Empresa] / ${CDE_THEMES[entityType]} / ${formState.subjectFolders?.[subjectTitle] || subjectTitle}`
                                                            : `📁 ${CDE_THEMES[entityType]} / ${formState.subjectFolders?.[subjectTitle] || subjectTitle}`}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="p-3 space-y-2">
                                                {extraDocs.map(doc => (
                                                    <div
                                                        key={doc.id}
                                                        className="p-3 rounded-lg border border-purple-200/70 bg-purple-50/30 dark:bg-purple-950/10 flex items-center justify-between gap-3"
                                                    >
                                                        <div className="flex items-center gap-2.5">
                                                            <span className="w-5 h-5 rounded-md bg-purple-600 text-white flex items-center justify-center shrink-0">
                                                                <Check size={13} strokeWidth={3} />
                                                            </span>
                                                            <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
                                                                {doc.name}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {doc.requiresUpload && (
                                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200">
                                                                    Upload
                                                                </span>
                                                            )}
                                                            {!formState.isSystem && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeCustomDoc(doc.id)}
                                                                    className="p-1 rounded text-gray-400 hover:text-red-600"
                                                                    title="Remover"
                                                                >
                                                                    <Trash2 size={13} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* ════════ BARRA INFERIOR DE GRAVAÇÃO ════════ */}
                            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-[#444746] flex items-center justify-between">
                                <p className="text-[11px] text-gray-400 italic">
                                    {formState.isSystem ? 'Perfil de sistema protegido contra edição.' : 'As alterações aplicam-se a novas submissões do perfil.'}
                                </p>

                                <div className="flex items-center gap-2.5">
                                    <SecondaryButton
                                        onClick={() => setEditingId(null)}
                                        className="w-auto px-4 py-2 text-xs"
                                    >
                                        {t('cancel') || 'Cancelar'}
                                    </SecondaryButton>

                                    {!formState.isSystem && (
                                        <PrimaryButton
                                            onClick={handleSave}
                                            className="w-auto px-5 py-2 text-xs flex items-center gap-1.5 shadow-sm"
                                        >
                                            <Save size={15} />
                                            {t('save') || 'Guardar Perfil'}
                                        </PrimaryButton>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-12">
                            <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-surface flex items-center justify-center text-gray-400 mb-3 border border-gray-200 dark:border-[#444746]">
                                <FileText size={28} />
                            </div>
                            <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300">Nenhum perfil selecionado</h4>
                            <p className="text-xs text-gray-400 mt-1 text-center max-w-sm">
                                Selecione um perfil na lista à esquerda para editar os requisitos agregados por assunto ou crie um novo perfil.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};
