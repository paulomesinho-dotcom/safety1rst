'use client';

import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { User, Shield, CreditCard, LogOut, Mail, Lock, Plus, Users as UsersIcon, LayoutGrid } from 'lucide-react'; // Renamed Users to UsersIcon to avoid conflict if needed, though mostly okay
import { cn } from '@/lib/utils';
import { InputGroup, PrimaryButton, Modal } from '@/components/Modal';

const SettingsPage = () => {
    const { currentUser, account, addUser } = useStore();
    const [activeTab, setActiveTab] = useState<'profile' | 'account' | 'users'>('profile');

    // Admin Check
    // const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';

    // New User State
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [newUser, setNewUser] = useState({ name: '', email: '', role: 'user' });

    const handleAddUser = (e: React.FormEvent) => {
        e.preventDefault();
        addUser({
            ...newUser,
            role: newUser.role as any,
            accountId: account?.id || 'acc_1'
        });
        setIsUserModalOpen(false);
        setNewUser({ name: '', email: '', role: 'user' });
    };

    return (
        <div className="flex flex-col md:flex-row h-full gap-8 p-6">
            {/* Settings Sidebar */}
            <div className="w-full md:w-64 border-r border-gray-100 dark:border-[#444746] pr-4">
                <h2 className="text-xl font-normal text-google-text mb-6 pl-2">Settings</h2>
                <div className="space-y-1">
                    <TabItem active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={User} label="My Profile" />
                    <TabItem active={activeTab === 'account'} onClick={() => setActiveTab('account')} icon={Shield} label="Organization" />
                    <TabItem active={false} onClick={() => alert('Billing Portal Placeholder')} icon={CreditCard} label="Billing & Plans" />
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 max-w-4xl py-2">
                {activeTab === 'profile' && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300 max-w-xl">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6 flex items-center gap-2"><User size={20} /> Profile Settings</h3>
                        {/* ... Existing Profile UI ... */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-20 h-20 rounded-full bg-primary-light flex items-center justify-center text-2xl text-primary font-medium">
                                    {currentUser?.name.charAt(0)}
                                </div>
                                <div>
                                    <button className="text-sm text-primary font-medium hover:underline">Change Photo</button>
                                </div>
                            </div>
                            <InputGroup label="Full Name">
                                <input type="text" defaultValue={currentUser?.name} className="w-full p-2.5 bg-gray-50 dark:bg-[#131314] border border-gray-200 dark:border-[#444746] rounded-lg outline-none" />
                            </InputGroup>
                        </div>
                    </div>
                )}
                {activeTab === 'account' && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300 max-w-xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2"><Shield size={20} /> Organization Settings</h3>
                            <button onClick={() => setIsUserModalOpen(true)} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-hover">
                                <Plus size={16} /> Add User
                            </button>
                        </div>
                        <div className="space-y-6">
                            <InputGroup label="Account Name">
                                <input type="text" defaultValue={account?.name || 'My Organization'} className="w-full p-2.5 bg-background border border-gray-200 dark:border-[#444746] rounded-lg outline-none" />
                            </InputGroup>
                            {/* Basic list of users in account could go here */}
                            <div className="p-4 bg-background rounded-lg border border-gray-100 dark:border-[#444746]">
                                <h4 className="text-sm font-medium mb-2">Account Users</h4>
                                <p className="text-xs text-gray-500">Manage users in the Project Team settings.</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <Modal title="Create New Account" isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)}>
                <form onSubmit={handleAddUser}>
                    <InputGroup label="Full Name">
                        <input required type="text" className="w-full p-2.5 border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-primary"
                            value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} />
                    </InputGroup>
                    <InputGroup label="Email Address">
                        <input required type="email" className="w-full p-2.5 border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-primary"
                            value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
                    </InputGroup>
                    <InputGroup label="Account Type">
                        <select className="w-full p-2.5 border border-gray-300 dark:border-[#444746] rounded-lg outline-none"
                            value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                            <option value="user">Standard User (needs assignment)</option>
                            <option value="admin">Account Administrator</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-2">
                            Standard users must be assigned to projects by an Admin or Manager.
                        </p>
                    </InputGroup>
                    <PrimaryButton type="submit">Create Account</PrimaryButton>
                </form>
            </Modal>
        </div>
    );
};

const TabItem = ({ active, onClick, icon: Icon, label }: any) => (
    <button
        onClick={onClick}
        className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-r-full text-sm font-medium transition-colors text-left border-l-4",
            active ? "bg-primary-light text-primary border-primary" : "text-gray-600 dark:text-gray-300 border-transparent hover:bg-gray-50 dark:hover:bg-[#131314]"
        )}
    >
        <Icon size={18} />
        {label}
    </button>
);

export default SettingsPage;
