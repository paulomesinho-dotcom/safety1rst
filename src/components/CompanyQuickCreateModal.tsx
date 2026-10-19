import React, { useState, useEffect } from 'react';
import { Modal, InputGroup, PrimaryButton, SecondaryButton } from './Modal';
import { Company, CompanyProfile } from '@/types';
import {
    COMPANY_ROLE_OPTIONS,
    COMPANY_ROLE_GROUPS,
    getIfcRoleFromCompanyRole,
    type IfcOrganizationRole,
} from '@/lib/company-ifc-map';
import { useTranslations } from 'next-intl';
import { Building2, ChevronDown } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (data: {
        name: string;
        profileId: string;
        parentId: string;
        companyRole?: string;
        companyRoleCustom?: string;
        ifcActorRole?: IfcOrganizationRole;
        ifcActorRoleUserDefined?: string;
    }) => void;
    profiles: CompanyProfile[];
    companies: Company[];
    defaultProfileId?: string;
}



export const CompanyQuickCreateModal: React.FC<Props> = ({ isOpen, onClose, onCreate, profiles, companies, defaultProfileId }) => {
    const t = useTranslations('Companies');
    const tCommon = useTranslations('Common');

    const [name, setName] = useState('');
    const [profileId, setProfileId] = useState('');
    const [parentId, setParentId] = useState('');
    const [companyRole, setCompanyRole] = useState('');          // valor PT seleccionado
    const [companyRoleCustom, setCompanyRoleCustom] = useState(''); // texto livre se 'outro'

    // Reset state on open
    useEffect(() => {
        if (isOpen) {
            setName('');
            setProfileId(defaultProfileId || '');
            setParentId('');
            setCompanyRole('');
            setCompanyRoleCustom('');
        }
    }, [isOpen, defaultProfileId]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !profileId) return;
        const ifcActorRoleValue = getIfcRoleFromCompanyRole(companyRole);

        onCreate({
            name,
            profileId,
            parentId: parentId || 'root',
            companyRole: companyRole || undefined,
            companyRoleCustom: companyRole === 'outro' ? companyRoleCustom : undefined,
            ifcActorRole: ifcActorRoleValue !== 'NOTDEFINED' ? ifcActorRoleValue : undefined,
            ifcActorRoleUserDefined: companyRole === 'outro' ? companyRoleCustom : undefined
        });
    };

    const activeCompanies = companies.filter(c => !c.archived);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('newButton')}
            maxWidth="max-w-md"
        >
            <form onSubmit={handleSubmit} className="space-y-4">

                {/* Name */}
                <InputGroup label={t('fields.companyName')}>
                    <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-[#444746] rounded-lg focus:ring-2 focus:ring-primary focus:border-blue-500 outline-none transition-all"
                            placeholder="e.g. Acme Corp"
                            autoFocus
                        />
                    </div>
                </InputGroup>

                {/* Tipo de Empresa — dropdown PT com mapeamento IFC invisível */}
                <InputGroup label="Tipo de Empresa *">
                    <div className="relative">
                        <select
                            title="Tipo de empresa"
                            value={companyRole}
                            onChange={e => setCompanyRole(e.target.value)}
                            className="w-full pl-3 pr-10 py-2 border border-gray-300 dark:border-[#444746] rounded-lg focus:ring-2 focus:ring-primary outline-none appearance-none bg-white dark:bg-surface text-[13px]"
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
                        <ChevronDown
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                            size={16}
                        />
                    </div>
                    {/* Hint contextual — só aparece quando algo está selecionado */}
                    {companyRole && companyRole !== 'outro' && (
                        <p className="text-[11px] text-gray-400 mt-1">
                            {COMPANY_ROLE_OPTIONS.find(o => o.value === companyRole)?.hint}
                        </p>
                    )}
                </InputGroup>

                {/* Campo de texto livre — só aparece se "Outro tipo de empresa" */}
                {companyRole === 'outro' && (
                    <InputGroup label="Especificar tipo de empresa">
                        <input
                            type="text"
                            value={companyRoleCustom}
                            onChange={e => setCompanyRoleCustom(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-[#444746] rounded-lg focus:ring-2 focus:ring-primary focus:border-blue-500 outline-none transition-all text-[13px]"
                            placeholder="Ex: Empresa de Sinalização Rodoviária"
                            required
                        />
                    </InputGroup>
                )}



                {/* Profile */}
                <InputGroup label="Perfil">
                    <div className="relative">
                        <select
                            title="Perfil da Empresa"
                            value={profileId}
                            onChange={e => setProfileId(e.target.value)}
                            className="w-full pl-3 pr-10 py-2 border border-gray-300 dark:border-[#444746] rounded-lg focus:ring-2 focus:ring-primary outline-none appearance-none bg-white dark:bg-surface text-[13px]"
                        >
                            <option value="" disabled>Selecionar Perfil...</option>
                            {profiles.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                    </div>
                </InputGroup>

                {/* Parent Company */}
                <InputGroup label={t('fields.contractingCompany')}>
                    <div className="relative">
                        <select
                            title="Empresa Contratante"
                            value={parentId}
                            onChange={e => setParentId(e.target.value)}
                            className="w-full pl-3 pr-10 py-2 border border-gray-300 dark:border-[#444746] rounded-lg focus:ring-2 focus:ring-primary outline-none appearance-none bg-white dark:bg-surface text-[13px]"
                        >
                            <option value="">{t('fields.rootCompany')} (Nenhuma)</option>
                            {activeCompanies.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                    </div>
                </InputGroup>

                {/* Actions */}
                <div className="pt-4 flex gap-3">
                    <SecondaryButton type="button" onClick={onClose}>
                        Cancelar
                    </SecondaryButton>
                    <PrimaryButton type="submit" disabled={!name || !profileId}>
                        Criar
                    </PrimaryButton>
                </div>
            </form>
        </Modal>
    );
};
