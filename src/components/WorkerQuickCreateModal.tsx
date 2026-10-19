'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useStore } from '@/store/useStore';
import { Modal, InputGroup, PrimaryButton } from '@/components/Modal';
import { AlertCircle, Lock, ChevronDown, Shield } from 'lucide-react';
import {
    WORKER_ROLES,
    OPERATIVE_CATEGORIES,
    getRolesByGroup,
    getRoleDefinition,
    type WorkerGroup,
} from '@/lib/worker-roles';
import { WorkerObligatoryRole } from '@/types';
import { cn } from '@/lib/utils';

interface WorkerQuickCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
}

export function WorkerQuickCreateModal({ isOpen, onClose, projectId }: WorkerQuickCreateModalProps) {
    const t = useTranslations('workerRoles');
    const { addWorker, companies, workers, projects, currentUser, users } = useStore();
    const currentProject = projects.find(p => p.id === projectId);
    const [submitting, setSubmitting] = useState(false);

    // Determine the data user's assigned companies for this project
    const dataUserAccess = currentUser
        ? users.find(u => u.id === currentUser.id)?.projectAccess?.find(pa => pa.projectId === projectId)
        : null;
    const isDataUser = dataUserAccess?.role === 'data_user';
    const dataUserCompanyIds = dataUserAccess?.companyIds || [];

    const validCompanies = companies.filter(c => {
        if (c.projectId !== projectId) return false;

        // Status check: validated and approved always ok;
        // data_update allowed only if project setting permits it
        const isValidatedOrApproved = c.workflowStatus === 'validated' || c.workflowStatus === 'approved';
        const isDataUpdate = c.workflowStatus === 'data_update';
        const passesStatus = isValidatedOrApproved ||
            (!currentProject?.requireCompanyValidatedToAddWorkers && isDataUpdate);

        if (!passesStatus) return false;

        // If the current user is a data_user, restrict to their assigned companies
        if (isDataUser && dataUserCompanyIds.length > 0) {
            return dataUserCompanyIds.includes(c.id);
        }
        return true;
    });

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        nif: '',
        companyId: '',
        workerRoleId: '',
        roleCustom: '',          // used when workerRoleId === 'OTHER'
        shstRoleId: '',          // secondary SHST role (only when isSiteResponsible + accumulates)
        shstRoleCustom: '',      // used when shstRoleId === 'OTHER'
        accumulatesShst: false,  // 1st worker also takes the SHST role
    });

    useEffect(() => {
        if (isOpen) {
            setFormData({
                firstName: '', lastName: '', nif: '', companyId: '',
                workerRoleId: '', roleCustom: '',
                shstRoleId: '', shstRoleCustom: '', accumulatesShst: false,
            });
            setSubmitting(false);
        }
    }, [isOpen]);

    // ── Obligatory role detection ─────────────────────────────────────────────
    const companyWorkersCount = workers.filter(w => w.companyId === formData.companyId && !w.archived).length;
    const selectedCompany = companies.find(c => c.id === formData.companyId);

    const isSiteResponsible = formData.companyId !== '' && companyWorkersCount === 0;
    // 2nd slot is SHST — unless the 1st accumulated, in which case 2nd is still free for another SHST
    const isShstResponsible = formData.companyId !== '' && companyWorkersCount === 1;
    const isObligatory = isSiteResponsible || isShstResponsible;

    let requireQualifiedShst = false;
    if (selectedCompany && currentProject?.shstSettings) {
        const tier = selectedCompany.tier || 1;
        if (tier === 1) requireQualifiedShst = currentProject.shstSettings.requireQualifiedShstByTier.tier1;
        if (tier === 2) requireQualifiedShst = currentProject.shstSettings.requireQualifiedShstByTier.tier2;
        if (tier >= 3) requireQualifiedShst = currentProject.shstSettings.requireQualifiedShstByTier.tier3plus;
    }

    // Which group drives the main role selector
    const obligatoryGroup: WorkerGroup | null = isSiteResponsible
        ? 'SITE_RESPONSIBLE'
        : isShstResponsible
            ? 'SHST_RESPONSIBLE'
            : null;

    // Roles for the main selector (Groups A/B include OTHER at the end; Group C is by category)
    const siteRoles = [...getRolesByGroup('SITE_RESPONSIBLE'), { id: 'OTHER', group: 'SITE_RESPONSIBLE' as WorkerGroup }];
    const shstRoles = [...getRolesByGroup('SHST_RESPONSIBLE'), { id: 'OTHER', group: 'SHST_RESPONSIBLE' as WorkerGroup }];
    const operativeRoles = WORKER_ROLES.filter(r => r.group === 'OPERATIVE');

    const allowedRoles =
        obligatoryGroup === 'SITE_RESPONSIBLE'
            ? siteRoles
            : obligatoryGroup === 'SHST_RESPONSIBLE'
                ? shstRoles
                : operativeRoles;

    // Auto-select on company change
    const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const companyId = e.target.value;
        const count = workers.filter(w => w.companyId === companyId && !w.archived).length;
        const comp = companies.find(c => c.id === companyId);

        let newRoleId = '';
        let reqShst = false;
        if (comp && currentProject?.shstSettings) {
            const tier = comp.tier || 1;
            if (tier === 1) reqShst = currentProject.shstSettings.requireQualifiedShstByTier.tier1;
            if (tier === 2) reqShst = currentProject.shstSettings.requireQualifiedShstByTier.tier2;
            if (tier >= 3) reqShst = currentProject.shstSettings.requireQualifiedShstByTier.tier3plus;
        }

        if (count === 0) {
            newRoleId = 'SITE_DIRECTOR';
        } else if (count === 1) {
            newRoleId = reqShst ? 'SAFETY_TECH_L6' : 'SAFETY_MANAGER';
        }

        setFormData({
            ...formData,
            companyId,
            workerRoleId: newRoleId,
            roleCustom: '',
            shstRoleId: reqShst ? 'SAFETY_TECH_L6' : 'SAFETY_MANAGER',
            shstRoleCustom: '',
            accumulatesShst: false,
        });
    };

    const isValid =
        formData.firstName.trim() &&
        formData.lastName.trim() &&
        formData.nif.trim() &&
        formData.companyId &&
        formData.workerRoleId &&
        (formData.workerRoleId !== 'OTHER' || formData.roleCustom.trim() !== '') &&
        (!formData.accumulatesShst || (
            formData.shstRoleId !== '' &&
            (formData.shstRoleId !== 'OTHER' || formData.shstRoleCustom.trim() !== '')
        ));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid) return;
        setSubmitting(true);

        try {
            const roleDef = getRoleDefinition(formData.workerRoleId);
            const roleLabel = formData.workerRoleId === 'OTHER'
                ? formData.roleCustom
                : t(`roles.${formData.workerRoleId}`);

            // Determine obligatory role
            let obligatoryRole: WorkerObligatoryRole | undefined;
            if (isSiteResponsible) {
                if (formData.accumulatesShst) {
                    // Accumulates both: mark as SITE_RESPONSIBLE; shst captured in shstRoleId
                    const shstLabel = formData.shstRoleId === 'OTHER'
                        ? formData.shstRoleCustom
                        : t(`roles.${formData.shstRoleId}`);
                    obligatoryRole = {
                        type: 'SITE_RESPONSIBLE',
                        rol: roleLabel,
                        rolCustom: shstLabel, // secondary: stores the SHST role label
                    };
                } else {
                    obligatoryRole = { type: 'SITE_RESPONSIBLE', rol: roleLabel };
                }
            } else if (isShstResponsible) {
                obligatoryRole = { type: 'SHST_RESPONSIBLE', rol: roleLabel };
            }

            await addWorker({
                name: `${formData.firstName} ${formData.lastName}`.trim(),
                firstName: formData.firstName,
                lastName: formData.lastName,
                nif: formData.nif,
                companyId: formData.companyId,
                workerRoleId: formData.workerRoleId,
                role: roleLabel,
                // IFC back-compat (from OPERATIVE group; Groups A/B use ifcActorRole instead)
                occupation: roleDef?.ifcLaborResource?.objectType ?? undefined,
                ifcLaborType: roleDef?.ifcLaborResource?.predefinedType ?? undefined,
                obligatoryRole,
                projectId,
                status: 'active',
                workflowStatus: 'draft',
            });
            onClose();
        } catch (error) {
            console.error('Failed to create worker', error);
        } finally {
            setSubmitting(false);
        }
    };

    const inputCls =
        'w-full bg-white dark:bg-[#131314] border border-gray-300 dark:border-[#444746] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all dark:text-gray-100';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Adicionar Trabalhador" maxWidth="max-w-md">
            <form onSubmit={handleSubmit} className="p-6 flex space-y-4 flex-col">
                <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-3 rounded-lg flex items-start gap-3 text-sm">
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <p>
                        Preencha os dados básicos para adicionar o trabalhador ao projeto. Detalhes completos e
                        documentação poderão ser inseridos posteriormente.
                    </p>
                </div>

                <InputGroup label="Primeiro Nome *">
                    <input type="text" value={formData.firstName}
                        onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                        className={inputCls} placeholder="Ex: João" required />
                </InputGroup>
                <InputGroup label="Último Nome (Apelido) *">
                    <input type="text" value={formData.lastName}
                        onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                        className={inputCls} placeholder="Ex: Silva" required />
                </InputGroup>

                <InputGroup label="NIF *">
                    <input type="text" value={formData.nif}
                        onChange={e => setFormData({ ...formData, nif: e.target.value })}
                        className={inputCls} placeholder="Ex: 123456789" required />
                </InputGroup>

                <InputGroup label="Empresa *">
                    <select value={formData.companyId} onChange={handleCompanyChange}
                        title="Empresa" className={inputCls} required>
                        <option value="">Selecione uma empresa</option>
                        {validCompanies.map(c => (
                            <option key={c.id} value={c.id}>
                                {c.name} {c.nif && `(NIF: ${c.nif})`}
                            </option>
                        ))}
                    </select>
                </InputGroup>

                {/* ── Main role selector ────────────────────────────────────── */}
                <InputGroup label={obligatoryGroup ? `${t(`groups.${obligatoryGroup}`)} *` : 'Função na Obra *'}>
                    <div className="relative">
                        <select
                            value={formData.workerRoleId}
                            onChange={e => setFormData({ ...formData, workerRoleId: e.target.value, roleCustom: '' })}
                            title="Função na Obra"
                            className={cn(
                                'w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none appearance-none transition-all',
                                'bg-white border-gray-300 dark:bg-[#131314] dark:border-[#444746] dark:text-gray-100',
                            )}
                            required
                        >
                            <option value="">— Selecionar função —</option>

                            {obligatoryGroup ? (
                                // Groups A or B — flat list including OTHER
                                allowedRoles.map(r => (
                                    <option key={r.id} value={r.id}>
                                        {r.id === 'OTHER' ? t('roles.OTHER') : t(`roles.${r.id}`)}
                                    </option>
                                ))
                            ) : (
                                // Group C — organised by category + OTHER at end
                                <>
                                    {OPERATIVE_CATEGORIES.map(cat => {
                                        const catRoles = operativeRoles.filter(r => r.category === cat);
                                        if (!catRoles.length) return null;
                                        return (
                                            <optgroup key={cat} label={t(`categories.${cat}`)}>
                                                {catRoles.map(r => (
                                                    <option key={r.id} value={r.id}>
                                                        {t(`roles.${r.id}`)}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        );
                                    })}
                                </>
                            )}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                    </div>

                    {isObligatory && (
                        <p className="text-[11px] text-primary mt-1 font-medium flex items-center gap-1">
                            <Lock size={10} />
                            {isSiteResponsible
                                ? '1.º trabalhador desta empresa — Responsável em Obra.'
                                : '2.º trabalhador desta empresa — Responsável de SHST em Obra.'}
                            {requireQualifiedShst && isShstResponsible && ' Técnico qualificado obrigatório.'}
                        </p>
                    )}
                </InputGroup>

                {/* FREE TEXT for OTHER in main role */}
                {formData.workerRoleId === 'OTHER' && (
                    <InputGroup label="Especificar função *">
                        <input type="text" value={formData.roleCustom}
                            onChange={e => setFormData({ ...formData, roleCustom: e.target.value })}
                            className={inputCls} placeholder="Ex: Montador de Painéis Sandwich" required />
                    </InputGroup>
                )}

                {/* ── Accumulates SHST (only for 1st worker / Grupo A) ─────── */}
                {isSiteResponsible && (
                    <div className={cn(
                        'rounded-xl border p-3 transition-colors',
                        formData.accumulatesShst
                            ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700/40'
                            : 'bg-gray-50 dark:bg-surface/50 border-gray-200 dark:border-[#444746]'
                    )}>
                        <label className="flex items-start gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.accumulatesShst}
                                onChange={e => setFormData({
                                    ...formData,
                                    accumulatesShst: e.target.checked,
                                    shstRoleId: e.target.checked
                                        ? (requireQualifiedShst ? 'SAFETY_TECH_L6' : 'SAFETY_MANAGER')
                                        : '',
                                    shstRoleCustom: '',
                                })}
                                className="mt-0.5 accent-primary"
                            />
                            <span className="text-sm">
                                <span className="font-semibold flex items-center gap-1.5">
                                    <Shield size={13} className="text-amber-500" />
                                    Acumula funções de Responsável de SHST em Obra
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 block mt-0.5">
                                    O Responsável em Obra também assume as funções de SHST nesta empresa.
                                </span>
                            </span>
                        </label>

                        {/* Secondary SHST role selector */}
                        {formData.accumulatesShst && (
                            <div className="mt-3 space-y-3">
                                <InputGroup label="Função de SHST *">
                                    <div className="relative">
                                        <select
                                            value={formData.shstRoleId}
                                            onChange={e => setFormData({ ...formData, shstRoleId: e.target.value, shstRoleCustom: '' })}
                                            title="Função de SHST"
                                            className={cn(
                                                'w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none appearance-none transition-all',
                                                'bg-white border-gray-300 dark:bg-[#131314] dark:border-[#444746] dark:text-gray-100',
                                            )}
                                            required={formData.accumulatesShst}
                                        >
                                            <option value="">— Selecionar função SHST —</option>
                                            {shstRoles.map(r => (
                                                <option key={r.id} value={r.id}>
                                                    {r.id === 'OTHER' ? t('roles.OTHER') : t(`roles.${r.id}`)}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                                    </div>
                                </InputGroup>
                                {formData.shstRoleId === 'OTHER' && (
                                    <InputGroup label="Especificar função SHST *">
                                        <input type="text" value={formData.shstRoleCustom}
                                            onChange={e => setFormData({ ...formData, shstRoleCustom: e.target.value })}
                                            className={inputCls} placeholder="Ex: Responsável de Segurança" required />
                                    </InputGroup>
                                )}
                                {requireQualifiedShst && (
                                    <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                        <Shield size={10} />
                                        Este projeto requer técnico qualificado de SST para esta empresa.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                <div className="pt-4 flex justify-end gap-3 mt-4">
                    <button type="button" onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-surface dark:text-gray-300 dark:border-[#444746] dark:hover:bg-[#1e1e20] transition-colors">
                        Cancelar
                    </button>
                    <PrimaryButton type="submit" disabled={!isValid || submitting} className="min-w-[120px]">
                        {submitting ? 'A criar...' : 'Criar Trabalhador'}
                    </PrimaryButton>
                </div>
            </form>
        </Modal>
    );
}
