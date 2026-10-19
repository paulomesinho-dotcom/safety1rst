'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore, type AppState } from '@/store/useStore';
import { ArrowLeft, Shield, Plus, Building2 } from 'lucide-react';
import { Modal, InputGroup, PrimaryButton } from '@/components/Modal';
import { cn } from '@/lib/utils';
import { nanoid } from 'nanoid';
import type { PlanType, Account, User } from '@/types';
import AuthGuard from '@/components/AuthGuard';

export default function PlatformDashboardPage() {
    const router = useRouter();
    const accounts = useStore(state => state.accounts);
    const users = useStore(state => state.users);
    const addAccount = useStore(state => state.addAccount);
    const addUser = useStore(state => state.addUser);
    const updateAccount = useStore(state => state.updateAccount);
    const currentUser = useStore(state => state.currentUser);

    // Permission check for superadmin only logic
    if (!currentUser || currentUser.role !== 'superadmin') {
        return null;
    }

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [showSavedMessage, setShowSavedMessage] = useState(false);
    const [editAccount, setEditAccount] = useState<Account | null>(null);
    const [newAccount, setNewAccount] = useState({
        name: '',
        plan: 'free' as PlanType,
        adminName: '',
        adminEmail: '',
        adminPassword: ''
    });

    const handleCreateAccount = (e: React.FormEvent) => {
        e.preventDefault();
        const accountId = nanoid();

        let maxProjects = 1;
        let accessLimit = 1200;
        if (newAccount.plan === 'premium') {
            maxProjects = 3;
            accessLimit = 3600;
        } else if (newAccount.plan === 'enterprise') {
            maxProjects = -1;
            accessLimit = -1;
        }

        addAccount({
            // @ts-ignore
            id: accountId,
            name: newAccount.name,
            plan: newAccount.plan,
            maxProjects,
            accessControlLimit: accessLimit,
            subscriptionStatus: 'active',
            modules: [],
        });

        addUser({
            name: newAccount.adminName,
            email: newAccount.adminEmail,
            role: 'admin',
            accountId: accountId,
            projectAccess: []
        });

        setIsCreateOpen(false);
        setNewAccount({ name: '', plan: 'free', adminName: '', adminEmail: '', adminPassword: '' });
    };

    const handleEditOpen = (account: Account) => {
        setEditAccount(account);
        setIsEditOpen(true);
    };

    const handleEditSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (editAccount) {
            updateAccount(editAccount.id, {
                plan: editAccount.plan,
                maxProjects: editAccount.maxProjects,
                accessControlLimit: editAccount.accessControlLimit,
                subscriptionStatus: editAccount.subscriptionStatus
            });
            setShowSavedMessage(true);
            setTimeout(() => setShowSavedMessage(false), 3000);
        }
    };

    return (
        <AuthGuard>
            <div className="min-h-screen bg-background flex flex-col">
                <div className="bg-white dark:bg-surface border-b border-gray-200 dark:border-[#444746] px-8 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.push('/')} className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="text-xl font-medium text-gray-800 dark:text-gray-100 flex items-center gap-2">
                            <Shield size={20} className="text-primary" /> Platform Administration
                        </h1>
                    </div>
                </div>

                <div className="max-w-6xl mx-auto w-full p-8">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Client Accounts</h2>
                            <p className="text-gray-500 mt-1">Manage subscription plans and limits for client companies.</p>
                        </div>
                        <button
                            onClick={() => setIsCreateOpen(true)}
                            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-hover shadow-sm transition-all"
                        >
                            <Plus size={18} /> New Client Account
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {accounts.map(account => {
                            const adminUser = users.find(u => u.accountId === account.id && (u.role === 'admin' || u.role === 'superadmin'));

                            return (
                                <div key={account.id} className="bg-white dark:bg-surface p-6 rounded-xl shadow-sm border border-gray-200 dark:border-[#444746] flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-lg bg-primary-light text-primary flex items-center justify-center">
                                            <Building2 size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{account.name}</h3>
                                            <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                                                <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold uppercase",
                                                    account.plan === 'enterprise' ? "bg-purple-100 text-purple-700" :
                                                        account.plan === 'premium' ? "bg-emerald-100 text-emerald-700" :
                                                            "bg-gray-100 dark:bg-surface text-gray-700 dark:text-gray-200"
                                                )}>{account.plan}</span>

                                                <span>Max Projects: {account.maxProjects === -1 ? 'Unlimited' : account.maxProjects}</span>
                                                <span>Access Limit: {account.accessControlLimit === -1 ? 'Unlimited' : account.accessControlLimit}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        {adminUser ? (
                                            <div className="text-right">
                                                <div className="text-sm font-medium text-gray-900 dark:text-white">{adminUser.name}</div>
                                                <div className="text-xs text-gray-500">{adminUser.email}</div>
                                            </div>
                                        ) : (
                                            <div className="text-sm text-red-500 italic">No Admin Assigned</div>
                                        )}

                                        <div className="h-8 w-px bg-gray-200"></div>

                                        <button
                                            onClick={() => handleEditOpen(account)}
                                            className="text-primary hover:text-blue-800 text-sm font-medium"
                                        >
                                            Edit Plan
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <Modal title="New Client Account" isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)}>
                    <form onSubmit={handleCreateAccount} className="space-y-4">
                        <InputGroup label="Company / Account Name">
                            <input required type="text" className="w-full p-2.5 border border-gray-300 dark:border-[#444746] rounded-lg"
                                value={newAccount.name} onChange={e => setNewAccount({ ...newAccount, name: e.target.value })} />
                        </InputGroup>

                        <InputGroup label="Subscription Plan">
                            <select className="w-full p-2.5 border border-gray-300 dark:border-[#444746] rounded-lg"
                                value={newAccount.plan} onChange={e => setNewAccount({ ...newAccount, plan: e.target.value as PlanType })}>
                                <option value="free">Free (1 Project, 1200 Logs)</option>
                                <option value="premium">Premium (3 Projects, 3600 Logs) - 49€/mo</option>
                                <option value="enterprise">Enterprise (Custom)</option>
                            </select>
                        </InputGroup>

                        <div className="border-t border-gray-100 dark:border-[#444746] pt-4 mt-4">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 block">Account Administrator</h4>
                            <InputGroup label="Admin Name">
                                <input required type="text" className="w-full p-2.5 border border-gray-300 dark:border-[#444746] rounded-lg"
                                    value={newAccount.adminName} onChange={e => setNewAccount({ ...newAccount, adminName: e.target.value })} />
                            </InputGroup>
                            <InputGroup label="Admin Email">
                                <input required type="email" className="w-full p-2.5 border border-gray-300 dark:border-[#444746] rounded-lg"
                                    value={newAccount.adminEmail} onChange={e => setNewAccount({ ...newAccount, adminEmail: e.target.value })} />
                            </InputGroup>
                            <InputGroup label="Temporary Password">
                                <input required type="password" className="w-full p-2.5 border border-gray-300 dark:border-[#444746] rounded-lg"
                                    value={newAccount.adminPassword} onChange={e => setNewAccount({ ...newAccount, adminPassword: e.target.value })} />
                            </InputGroup>
                        </div>

                        <PrimaryButton type="submit">Create Account</PrimaryButton>
                    </form>
                </Modal>

                <Modal title="Edit Subscription Plan" isOpen={isEditOpen} onClose={() => setIsEditOpen(false)}>
                    {editAccount && (
                        <form onSubmit={handleEditSave} className="space-y-4">
                            <InputGroup label="Account Name">
                                <input type="text" className="w-full p-2.5 border border-gray-300 dark:border-[#444746] rounded-lg bg-gray-100 dark:bg-surface" value={editAccount.name} disabled />
                            </InputGroup>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                    Subscription Plan
                                </label>
                                <div className="grid grid-cols-3 gap-3">
                                    {['free', 'premium', 'enterprise'].map((p) => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => setEditAccount({ ...editAccount, plan: p as PlanType })}
                                            className={cn(
                                                "py-2 px-3 rounded-lg border text-sm font-medium capitalize transition-all",
                                                editAccount.plan === p
                                                    ? "border-blue-500 bg-primary-light text-primary-hover ring-1 ring-primary"
                                                    : "border-gray-200 dark:border-[#444746] text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-[#444746] hover:bg-gray-50 dark:hover:bg-[#131314]"
                                            )}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Max Projects</label>
                                    <input
                                        type="number"
                                        className="w-full border border-gray-300 dark:border-[#444746] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-light outline-none"
                                        value={editAccount.maxProjects}
                                        onChange={e => setEditAccount({ ...editAccount, maxProjects: parseInt(e.target.value) })}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">-1 for Unlimited</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Access Logs Limit</label>
                                    <input
                                        type="number"
                                        className="w-full border border-gray-300 dark:border-[#444746] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-light outline-none"
                                        value={editAccount.accessControlLimit}
                                        onChange={e => setEditAccount({ ...editAccount, accessControlLimit: parseInt(e.target.value) })}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Monthly Limit</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Subscription Status</label>
                                <select
                                    className="w-full border border-gray-300 dark:border-[#444746] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-light outline-none"
                                    value={editAccount.subscriptionStatus}
                                    onChange={e => setEditAccount({ ...editAccount, subscriptionStatus: e.target.value as 'active' | 'suspended' | 'canceled' })}
                                >
                                    <option value="active">Active</option>
                                    <option value="suspended">Suspended</option>
                                    <option value="canceled">Canceled</option>
                                </select>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsEditOpen(false)}
                                    className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-surface rounded-lg text-sm font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <PrimaryButton type="submit">
                                    <div className="flex items-center gap-2">
                                        {showSavedMessage && (
                                            <span className="text-sm font-medium text-green-200 animate-in fade-in slide-in-from-right-2">
                                                Guardado
                                            </span>
                                        )}
                                        Save Changes
                                    </div>
                                </PrimaryButton>
                            </div>
                        </form>
                    )}
                </Modal>
            </div>
        </AuthGuard>
    );
};
