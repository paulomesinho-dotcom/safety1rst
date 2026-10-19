import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Modal, PrimaryButton, SecondaryButton } from './Modal';
import { Plus, Trash2, Save, FileText, Check, AlertCircle, Lock, Star, Timer } from 'lucide-react';
import { nanoid } from 'nanoid';
import { cn } from '../lib/utils';
import { CustomDocumentDefinition } from '../types';
import { useTranslations } from 'next-intl';

// Standard docs that can have expiry dates (and their metadata)
const STANDARD_DATE_DOC_CONFIG: Record<string, { isMonth?: boolean; defaultExpiry: boolean }> = {
    insurance_at: { defaultExpiry: true },
    insurance_rc: { defaultExpiry: true },
    finance_ss: { defaultExpiry: true },
    finance_fin: { defaultExpiry: true },
    ss_discount: { isMonth: true, defaultExpiry: true },
    pss_acceptance: { defaultExpiry: false }, // No expiry by default
    // work_schedule: no date, skipped
};

export type ProfileType = 'company' | 'worker' | 'equipment';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    entityType: ProfileType;
}

// IDs only - Labels come from translations
const DOC_IDS: Record<ProfileType, string[]> = {
    company: ['insurance_at', 'insurance_rc', 'finance_ss', 'finance_fin', 'ss_discount', 'pss_acceptance', 'work_schedule'],
    worker: ['medical_fitness', 'induction', 'epi', 'specific_training', 'contract'],
    equipment: ['maintenance', 'inspection', 'insurance', 'property_title']
};

export const ProfileManagerModal: React.FC<Props> = ({ isOpen, onClose, projectId, entityType }) => {
    const t = useTranslations('Components.ProfileManager');
    const store = useStore();
    const currentProject = store.projects.find(p => p.id === projectId);
    const userRole = store.currentUser ? store.getUserRoleInProject(store.currentUser.id, projectId) : null;
    const isManager = userRole === 'manager';

    // Select Data based on Type
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
                customDocuments: data.customDocuments
            };
            if (entityType === 'company') store.updateCompanyProfile(editingId!, updates);
            if (entityType === 'worker') store.updateWorkerProfile(editingId!, updates);
            if (entityType === 'equipment') store.updateEquipmentProfile(editingId!, updates);
        }
    };

    const projectProfiles = getProfiles().filter(p => p.projectId === projectId);
    const standardDocIds = DOC_IDS[entityType];

    // Local State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formState, setFormState] = useState<{
        name: string;
        requirements: Record<string, boolean>;
        standardUploads: Record<string, boolean>;
        standardDocConfig: Record<string, { isExpirationDate: boolean; toleranceDays: number }>;
        customDocuments: CustomDocumentDefinition[];
        isSystem?: boolean;
    }>({
        name: '',
        requirements: {},
        standardUploads: {},
        standardDocConfig: {},
        customDocuments: []
    });

    const handleEdit = (profile: any) => {
        setEditingId(profile.id);
        // Build default standardDocConfig: enabled fields default to isExpirationDate=true, tolerance=0
        const defaultConfig: Record<string, { isExpirationDate: boolean; toleranceDays: number }> = {};
        Object.entries(STANDARD_DATE_DOC_CONFIG).forEach(([docId, meta]) => {
            defaultConfig[docId] = profile.standardDocConfig?.[docId] ?? {
                isExpirationDate: meta.defaultExpiry,
                toleranceDays: 0,
            };
        });
        setFormState({
            name: profile.name,
            requirements: profile.requirements || {},
            standardUploads: profile.standardUploads || {},
            standardDocConfig: defaultConfig,
            customDocuments: profile.customDocuments || [],
            isSystem: profile.isSystem
        });
    };

    const handleCreate = () => {
        setEditingId('new');
        // Build default standardDocConfig for new profile
        const defaultConfig: Record<string, { isExpirationDate: boolean; toleranceDays: number }> = {};
        Object.entries(STANDARD_DATE_DOC_CONFIG).forEach(([docId, meta]) => {
            defaultConfig[docId] = { isExpirationDate: meta.defaultExpiry, toleranceDays: 0 };
        });
        setFormState({
            name: '',
            requirements: {},
            standardUploads: {},
            standardDocConfig: defaultConfig,
            customDocuments: []
        });
    };

    const handleSave = () => {
        if (!formState.name) return alert(t('name') + " is required"); // Keep simple alert for now
        saveProfile(editingId === 'new', formState);
        setEditingId(null);
    };

    const toggleRequirement = (key: string) => {
        const current = formState.requirements?.[key] || false;
        const newRequirements = { ...formState.requirements, [key]: !current };

        // If disabling requirement, also disable upload requirement
        const newUploads = { ...formState.standardUploads };
        if (current) {
            delete newUploads[key];
        } else {
            // Default to requiring upload when enabling?
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

    const removeCustomDoc = (id: string) => {
        setFormState({
            ...formState,
            customDocuments: formState.customDocuments?.filter(d => d.id !== id)
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t(`types.${entityType}` as any)} maxWidth="max-w-4xl" resizable>
            <div className="flex gap-6 min-h-[400px]">
                {/* Left: List */}
                <div className="w-1/3 border-r border-gray-200 dark:border-[#444746] pr-4 flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-gray-700 dark:text-gray-200">{t('title')}</h3>
                        <button onClick={handleCreate} className="p-1.5 bg-primary-light text-primary rounded hover:bg-primary-light transition-colors" title={t('create')}>
                            <Plus size={16} />
                        </button>
                    </div>

                    <div className="space-y-2">
                        {projectProfiles.length === 0 && (
                            <p className="text-sm text-gray-400 italic text-center py-4">{t('noProfiles')}</p>
                        )}
                        {projectProfiles.map(p => {
                            const usageCount = getUsageCount(p.id);
                            const isUsed = usageCount > 0;

                            return (
                                <div key={p.id}
                                    onClick={() => handleEdit(p)}
                                    className={cn("p-3 rounded-lg border cursor-pointer hover:bg-gray-50 dark:hover:bg-[#131314] flex justify-between items-center group transition-all",
                                        editingId === p.id ? "border-blue-500 bg-primary-light shadow-sm" : "border-gray-200 dark:border-[#444746]"
                                    )}
                                >
                                    <span className={cn("font-medium text-sm flex items-center gap-2", editingId === p.id ? "text-primary-hover" : "text-gray-700 dark:text-gray-200")}>
                                        {p.isSystem && <Lock size={12} className="text-amber-500" />}
                                        {p.id === (entityType === 'company' ? currentProject?.defaultCompanyProfileId :
                                            entityType === 'worker' ? currentProject?.defaultWorkerProfileId :
                                                currentProject?.defaultEquipmentProfileId) && <Star size={12} className="text-yellow-500 fill-yellow-500" />}
                                        {p.name}
                                    </span>
                                    <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                                        {!p.isSystem && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (isUsed) return;
                                                    deleteProfile(p.id);
                                                    if (editingId === p.id) setEditingId(null);
                                                }}
                                                className={cn("p-1 transition-colors", isUsed ? "text-gray-300 cursor-not-allowed" : "text-red-400 hover:text-red-600")}
                                                title={isUsed ? t('cannotDelete', { count: usageCount }) : t('deleteProfile')}
                                                disabled={isUsed}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right: Editor */}
                <div className="flex-1 flex flex-col">
                    {editingId ? (
                        <>
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                    {t('name')}
                                    {formState.isSystem && <span className="ml-2 text-xs text-amber-600 font-normal bg-amber-50 px-2 py-0.5 rounded border border-amber-200">{t('systemProfile')}</span>}
                                </label>
                                <input
                                    type="text"
                                    value={formState.name}
                                    onChange={e => setFormState({ ...formState, name: e.target.value })}
                                    className="w-full p-2 text-sm border border-gray-300 dark:border-[#444746] rounded-md focus:ring-2 focus:ring-primary outline-none disabled:bg-gray-50 dark:bg-[#131314] disabled:text-gray-500"
                                    placeholder="e.g. Standard Requirement"
                                    disabled={formState.isSystem}
                                />
                            </div>

                            <div className="pr-2">
                                {/* Standard Docs */}
                                <div className="mb-6">
                                    <h4 className="text-xs font-bold uppercase text-gray-400 mb-3 tracking-wider">{t('standardRequirements')}</h4>
                                    <div className="grid grid-cols-1 gap-3">
                                        {standardDocIds.map(docId => {
                                            const isReq = formState.requirements?.[docId];
                                            const isUploadReq = formState.standardUploads?.[docId];
                                            const dateConfig = STANDARD_DATE_DOC_CONFIG[docId];
                                            const expiryConfig = formState.standardDocConfig?.[docId];
                                            return (
                                                <div key={docId}
                                                    className={cn("p-3 rounded border flex flex-col gap-2 transition-all",
                                                        isReq ? "bg-primary-light/30 border-primary/20" : "bg-white dark:bg-surface border-gray-200 dark:border-[#444746]",
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div
                                                                onClick={() => !formState.isSystem && toggleRequirement(docId)}
                                                                className={cn("w-5 h-5 rounded border flex items-center justify-center transition-colors cursor-pointer",
                                                                    isReq ? "bg-primary border-primary text-white" : "bg-white dark:bg-surface border-gray-300 dark:border-[#444746]"
                                                                )}
                                                            >
                                                                {isReq && <Check size={14} />}
                                                            </div>
                                                            <span className={cn("text-sm", isReq ? "text-blue-900 font-medium" : "text-gray-600 dark:text-gray-300")}>
                                                                {t(`docTypes.${docId}` as any)}
                                                            </span>
                                                        </div>

                                                        {isReq && (
                                                            <div
                                                                onClick={() => !formState.isSystem && toggleUploadRequirement(docId)}
                                                                className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all",
                                                                    isUploadReq
                                                                        ? "bg-orange-100 text-orange-700 border border-orange-200"
                                                                        : "bg-gray-100 dark:bg-surface text-gray-500 border border-gray-200 dark:border-[#444746]"
                                                                )}
                                                            >
                                                                <FileText size={12} />
                                                                {isUploadReq ? t('uploadRequired') : t('dataOnly')}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Expiry config for date-capable fields */}
                                                    {isReq && dateConfig && (
                                                        <div className="flex items-center gap-4 pl-8 pt-1">
                                                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
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
                                                                    className="w-3.5 h-3.5 text-orange-500 rounded"
                                                                />
                                                                <span className="text-[11px] text-orange-700 dark:text-orange-400 font-medium flex items-center gap-1">
                                                                    <Timer size={11} /> Expira
                                                                </span>
                                                            </label>
                                                            {(expiryConfig?.isExpirationDate ?? dateConfig.defaultExpiry) && (
                                                                <label className="flex items-center gap-1.5">
                                                                    <span className="text-[11px] text-gray-500">Tolerância:</span>
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
                                                                        className="w-14 text-xs p-0.5 border rounded bg-white dark:bg-surface text-center"
                                                                    />
                                                                    <span className="text-[11px] text-gray-400">dias</span>
                                                                </label>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                                        <AlertCircle size={12} /> {t('unselectedWarning')}
                                    </p>
                                </div>

                                {/* Custom Docs */}
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="text-xs font-bold uppercase text-gray-400 tracking-wider">{t('customDocs')}</h4>
                                    </div>

                                    {/* Add Custom Doc Form - Hide if System */}
                                    {!formState.isSystem && (
                                        <div className="bg-gray-50 dark:bg-[#131314] p-3 rounded-lg border border-gray-200 dark:border-[#444746] mb-4">
                                            <div className="grid grid-cols-2 gap-3 mb-2">
                                                <div>
                                                    <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">{t('fieldName')}</label>
                                                    <input
                                                        className="w-full text-xs p-2 border rounded bg-white dark:bg-surface"
                                                        placeholder="e.g. Extra Certificate"
                                                        id="new-doc-name"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">{t('dataType')}</label>
                                                    <select
                                                        className="w-full text-xs p-2 border rounded bg-white dark:bg-surface"
                                                        id="new-doc-type"
                                                        defaultValue="text"
                                                        title={t('dataType')}
                                                        onChange={(e) => {
                                                            const optionsInput = document.getElementById('new-doc-options') as HTMLInputElement;
                                                            const uploadInput = document.getElementById('new-doc-upload') as HTMLInputElement;
                                                            const expirationInput = document.getElementById('new-doc-expiration') as HTMLInputElement;
                                                            const toleranceInput = document.getElementById('new-doc-tolerance') as HTMLInputElement;

                                                            if (optionsInput) {
                                                                if (e.target.value === 'single_select' || e.target.value === 'multi_select') {
                                                                    optionsInput.parentElement!.classList.remove('hidden');
                                                                    optionsInput.parentElement!.classList.add('block');
                                                                } else {
                                                                    optionsInput.parentElement!.classList.add('hidden');
                                                                    optionsInput.parentElement!.classList.remove('block');
                                                                }
                                                            }

                                                            if (expirationInput) {
                                                                const container = document.getElementById('new-doc-expiration-container');
                                                                const tolContainer = document.getElementById('new-doc-tolerance-container');
                                                                if (e.target.value === 'date' || e.target.value === 'month') {
                                                                    if (container) {
                                                                        container.classList.remove('hidden');
                                                                        container.classList.add('flex');
                                                                    }
                                                                } else {
                                                                    if (container) {
                                                                        container.classList.add('hidden');
                                                                        container.classList.remove('flex');
                                                                    }
                                                                    if (tolContainer) {
                                                                        tolContainer.classList.add('hidden');
                                                                        tolContainer.classList.remove('flex');
                                                                    }
                                                                    expirationInput.checked = false;
                                                                }
                                                            }
                                                        }}>
                                                        <option value="text">Text</option>
                                                        <option value="number">Number</option>
                                                        <option value="date">Date</option>
                                                        <option value="boolean">Yes/No</option>
                                                        <option value="single_select">Single Select</option>
                                                        <option value="multi_select">Multi Select</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="mb-2 hidden">
                                                <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">{t('options')} (comma separated)</label>
                                                <input
                                                    className="w-full text-xs p-2 border rounded bg-white dark:bg-surface"
                                                    placeholder="Option A, Option B"
                                                    id="new-doc-options"
                                                    title={t('options')}
                                                />
                                            </div>

                                            <div className="flex items-center justify-between mt-3">
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <input type="checkbox" id="new-doc-upload" className="w-4 h-4 text-primary rounded" defaultChecked />
                                                        <label htmlFor="new-doc-upload" className="text-xs text-gray-700 dark:text-gray-200">{t('requiresUpload')}</label>
                                                    </div>
                                                    <div className="hidden items-center gap-2" id="new-doc-expiration-container">
                                                        <input
                                                            type="checkbox"
                                                            id="new-doc-expiration"
                                                            className="w-4 h-4 text-orange-500 rounded"
                                                            onChange={(e) => {
                                                                const tolContainer = document.getElementById('new-doc-tolerance-container');
                                                                if (tolContainer) {
                                                                    if (e.target.checked) {
                                                                        tolContainer.classList.remove('hidden');
                                                                        tolContainer.classList.add('flex');
                                                                    } else {
                                                                        tolContainer.classList.add('hidden');
                                                                        tolContainer.classList.remove('flex');
                                                                    }
                                                                }
                                                            }}
                                                        />
                                                        <label htmlFor="new-doc-expiration" className="text-xs text-orange-700 dark:text-orange-400 font-medium">Data de Expiração (gera workflow)</label>
                                                    </div>
                                                    <div className="hidden items-center gap-2" id="new-doc-tolerance-container">
                                                        <label className="text-xs text-gray-600 dark:text-gray-300 font-medium" htmlFor="new-doc-tolerance">Tolerância (dias após expiração):</label>
                                                        <input
                                                            type="number"
                                                            id="new-doc-tolerance"
                                                            min={0}
                                                            max={365}
                                                            defaultValue={0}
                                                            className="w-16 text-xs p-1 border rounded bg-white dark:bg-surface text-center"
                                                        />
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        const nameInput = document.getElementById('new-doc-name') as HTMLInputElement;
                                                        const typeInput = document.getElementById('new-doc-type') as HTMLSelectElement;
                                                        const optionsInput = document.getElementById('new-doc-options') as HTMLInputElement;
                                                        const uploadInput = document.getElementById('new-doc-upload') as HTMLInputElement;
                                                        const expirationInput = document.getElementById('new-doc-expiration') as HTMLInputElement;
                                                        const toleranceInput = document.getElementById('new-doc-tolerance') as HTMLInputElement;

                                                        if (!nameInput.value) return alert(t('fieldName') + " is required");

                                                        const newDoc: CustomDocumentDefinition = {
                                                            id: nanoid(),
                                                            name: nameInput.value,
                                                            dataType: typeInput.value as any,
                                                            options: optionsInput.value ? optionsInput.value.split(',').map(s => s.trim()).filter(Boolean) : [],
                                                            requiresUpload: uploadInput.checked,
                                                            isExpirationDate: (typeInput.value === 'date' || typeInput.value === 'month') ? expirationInput.checked : false,
                                                            toleranceDays: (typeInput.value === 'date' || typeInput.value === 'month') && expirationInput.checked
                                                                ? (parseInt(toleranceInput?.value || '0', 10) || 0)
                                                                : undefined,
                                                        };

                                                        setFormState({
                                                            ...formState,
                                                            customDocuments: [...(formState.customDocuments || []), newDoc]
                                                        });

                                                        // Reset
                                                        nameInput.value = '';
                                                        typeInput.value = 'text';
                                                        optionsInput.value = '';
                                                        uploadInput.checked = true;
                                                        expirationInput.checked = false;
                                                        if (toleranceInput) toleranceInput.value = '0';
                                                        if (optionsInput.parentElement) {
                                                            optionsInput.parentElement.classList.add('hidden');
                                                            optionsInput.parentElement.classList.remove('block');
                                                        }
                                                        const expContainer = document.getElementById('new-doc-expiration-container');
                                                        const tolContainer = document.getElementById('new-doc-tolerance-container');
                                                        if (expContainer) {
                                                            expContainer.classList.add('hidden');
                                                            expContainer.classList.remove('flex');
                                                        }
                                                        if (tolContainer) {
                                                            tolContainer.classList.add('hidden');
                                                            tolContainer.classList.remove('flex');
                                                        }
                                                    }}
                                                    className="text-xs bg-primary text-white px-3 py-1.5 rounded hover:bg-primary-hover font-medium"
                                                    title={t('addField') || 'Add Field'}
                                                >
                                                    {t('addField')}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        {formState.customDocuments?.length === 0 && (
                                            <p className="text-sm text-gray-400 border border-dashed border-gray-200 dark:border-[#444746] rounded p-4 text-center">
                                                {t('noCustomFields')}
                                            </p>
                                        )}
                                        {formState.customDocuments?.map((doc) => (
                                            <div key={doc.id} className="flex items-center justify-between p-3 bg-white dark:bg-surface rounded border border-gray-200 dark:border-[#444746] hover:border-primary/30 transition-colors">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{doc.name}</span>
                                                        <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-surface text-gray-500 rounded uppercase font-medium">{doc.dataType.replace('_', ' ')}</span>
                                                        {doc.requiresUpload && <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-brand rounded font-medium flex items-center gap-1"><FileText size={10} /> PDF</span>}
                                                        {doc.isExpirationDate && <span className="text-[10px] px-1.5 py-0.5 bg-orange-50 text-orange-600 border border-orange-200 rounded font-medium flex items-center gap-1"><AlertCircle size={10} /> Expira{doc.toleranceDays ? ` +${doc.toleranceDays}d` : ''}</span>}
                                                    </div>
                                                    {doc.options && doc.options.length > 0 && (
                                                        <p className="text-xs text-gray-400 truncate">{t('options')}: {doc.options.join(', ')}</p>
                                                    )}
                                                </div>
                                                {!formState.isSystem && (
                                                    <button onClick={() => removeCustomDoc(doc.id)} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors" title={t('remove') || 'Remove'}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-[#444746] flex items-center justify-between">
                                {/* Left Side: Actions like Set Default or Delete */}
                                <div>
                                    {editingId !== 'new' && isManager && (
                                        <button
                                            onClick={() => {
                                                const field = entityType === 'company' ? 'defaultCompanyProfileId' :
                                                    entityType === 'worker' ? 'defaultWorkerProfileId' :
                                                        'defaultEquipmentProfileId';
                                                store.updateProjectSettings(projectId, { [field]: editingId });
                                            }}
                                            disabled={editingId === (entityType === 'company' ? currentProject?.defaultCompanyProfileId :
                                                entityType === 'worker' ? currentProject?.defaultWorkerProfileId :
                                                    currentProject?.defaultEquipmentProfileId)}
                                            className={cn(
                                                "px-3 py-2 text-xs font-medium rounded-lg border flex items-center gap-2 transition-colors shadow-sm",
                                                editingId === (entityType === 'company' ? currentProject?.defaultCompanyProfileId :
                                                    entityType === 'worker' ? currentProject?.defaultWorkerProfileId :
                                                        currentProject?.defaultEquipmentProfileId)
                                                    ? "bg-amber-50 border-amber-200 text-amber-700 cursor-default"
                                                    : "bg-white dark:bg-surface border-gray-200 dark:border-[#444746] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#131314] hover:text-gray-900 dark:hover:text-white"
                                            )}
                                            title={t('setDefault')}
                                        >
                                            <Star size={14} className={cn(editingId === (entityType === 'company' ? currentProject?.defaultCompanyProfileId :
                                                entityType === 'worker' ? currentProject?.defaultWorkerProfileId :
                                                    currentProject?.defaultEquipmentProfileId) && "fill-amber-500 text-amber-500")} />
                                            {editingId === (entityType === 'company' ? currentProject?.defaultCompanyProfileId :
                                                entityType === 'worker' ? currentProject?.defaultWorkerProfileId :
                                                    currentProject?.defaultEquipmentProfileId)
                                                ? t('isDefault')
                                                : t('setDefault')}
                                        </button>
                                    )}
                                </div>

                                {/* Right Side: Save/Cancel */}
                                <div className="flex items-center gap-3">
                                    <SecondaryButton
                                        onClick={() => setEditingId(null)}
                                        className="w-auto px-4 py-2"
                                    >
                                        {t('cancel')}
                                    </SecondaryButton>

                                    {!formState.isSystem && (
                                        <PrimaryButton
                                            onClick={handleSave}
                                            className="w-auto px-6 py-2 flex items-center gap-2 shadow-sm shadow-blue-200"
                                        >
                                            <Save size={16} />
                                            {t('save')}
                                        </PrimaryButton>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                            <FileText size={48} className="mb-4 text-gray-200" />
                            <p>{t('selectProfile')}</p>
                        </div>
                    )}
                </div>
            </div>
        </Modal >
    );
};
