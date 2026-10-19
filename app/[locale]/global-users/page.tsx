'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { ArrowLeft, Plus, Folder, Users, Settings, Search, LayoutGrid, List, MoreVertical, X, Check, Shield } from 'lucide-react';
import { Modal, InputGroup, PrimaryButton } from '@/components/Modal';
import { cn } from '@/lib/utils';
import type { User, ProjectRole } from '@/types';
import AuthGuard from '@/components/AuthGuard';

export default function AccountDashboardPage() {
    const router = useRouter();
    const {
        currentUser,
        projects,
        users,
        account,
        addProject,
        addUser,
        updateUser
    } = useStore();

    // Permissions Check
    // Can also be done inside AuthGuard or logic here
    if (currentUser && (currentUser.role !== 'admin' && currentUser.role !== 'superadmin')) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-[#131314]">
                <div className="bg-white dark:bg-surface p-8 rounded-2xl shadow-sm text-center max-w-md">
                    <Shield size={48} className="text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Access Denied</h2>
                    <p className="text-gray-500 mb-6">You do not have permission to view this page.</p>
                    <button onClick={() => router.push('/')} className="text-primary hover:text-primary-hover font-medium">Return to Home</button>
                </div>
            </div>
        );
    }

    // Data Context
    const currentAccountId = currentUser?.accountId;
    const accountProjects = projects.filter(p => p.accountId === currentAccountId);
    const accountUsers = users.filter(u => u.accountId === currentAccountId);

    const [userViewMode, setUserViewMode] = useState<'list' | 'grid'>('grid');
    const [searchTerm, setSearchTerm] = useState('');

    // Modals
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);

    // State for Forms
    const [newProject, setNewProject] = useState({ name: '', address: '', description: '' });
    const [newUser, setNewUser] = useState({ name: '', email: '', role: 'user' });
    const [selectedUserForAccess, setSelectedUserForAccess] = useState<User | null>(null);

    const handleCreateProject = (e: React.FormEvent) => {
        e.preventDefault();
        addProject({
            name: newProject.name,
            address: newProject.address,
            description: newProject.description,
            status: 'active',
        });
        setIsProjectModalOpen(false);
        setNewProject({ name: '', address: '', description: '' });
    };

    const handleCreateUser = (e: React.FormEvent) => {
        e.preventDefault();
        addUser({
            name: newUser.name,
            email: newUser.email,
            role: newUser.role as any,
            accountId: currentAccountId!,
            projectAccess: []
        });
        setIsUserModalOpen(false);
        setNewUser({ name: '', email: '', role: 'user' });
    };

    const handleOpenAccessModal = (user: User) => {
        setSelectedUserForAccess(user);
        setIsAccessModalOpen(true);
    };

    const handleToggleProjectAccess = (projectId: string, currentAccess: boolean) => {
        if (!selectedUserForAccess) return;

        let newAccessList = [...(selectedUserForAccess.projectAccess || [])];

        if (currentAccess) {
            newAccessList = newAccessList.filter(a => a.projectId !== projectId);
        } else {
            newAccessList.push({
                projectId,
                role: 'viewer',
                allowedModules: []
            });
        }

        updateUser(selectedUserForAccess.id, { projectAccess: newAccessList });
    };

    const handleRoleChange = (projectId: string, newRole: ProjectRole) => {
        if (!selectedUserForAccess) return;

        const newAccessList = (selectedUserForAccess.projectAccess || []).map(access =>
            access.projectId === projectId ? { ...access, role: newRole } : access
        );

        updateUser(selectedUserForAccess.id, { projectAccess: newAccessList });
    };

    const filteredUsers = accountUsers.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <AuthGuard>
            <div className="min-h-screen bg-gray-50 dark:bg-[#131314] flex flex-col font-sans">
                {/* Header */}
                <div className="bg-white dark:bg-surface border-b border-gray-200 dark:border-[#444746] px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-20">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.push('/')} className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all hover:-translate-x-1">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                Account Administration
                            </h1>
                            {account && <p className="text-sm text-gray-500">{account.name} • {account.plan} Plan</p>}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="bg-primary-light text-primary-hover px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wide">
                            {currentUser?.role}
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto w-full p-6 lg:p-8 space-y-8">
                    {/* Projects Section */}
                    <section>
                        <div className="flex justify-between items-end mb-4">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Folder className="text-primary" size={20} />
                                    Projects
                                    <span className="bg-gray-100 dark:bg-surface text-gray-600 dark:text-gray-300 text-xs font-medium px-2 py-0.5 rounded-full">{accountProjects.length}</span>
                                </h2>
                                <p className="text-sm text-gray-500 mt-1">Manage your active construction sites and projects.</p>
                            </div>
                            <button
                                onClick={() => setIsProjectModalOpen(true)}
                                className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm flex items-center gap-2"
                            >
                                <Plus size={16} /> New Project
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {accountProjects.map(project => (
                                <div key={project.id} className="group bg-white dark:bg-surface p-5 rounded-xl shadow-sm border border-gray-200 dark:border-[#444746] hover:shadow-md hover:border-primary/20 transition-all cursor-pointer relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><MoreVertical size={16} /></button>
                                    </div>
                                    <div className="mb-3">
                                        <div className="w-10 h-10 rounded-lg bg-primary-light text-primary flex items-center justify-center mb-3">
                                            <Folder size={20} />
                                        </div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">{project.name}</h3>
                                        <p className="text-sm text-gray-500 truncate">{project.address || "No address provided"}</p>
                                    </div>
                                    <div className="pt-3 border-t border-gray-50 flex justify-between items-center">
                                        <span className={cn("px-2 py-0.5 rounded text-xs font-medium capitalize",
                                            project.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 dark:bg-surface text-gray-600 dark:text-gray-300')}>
                                            {project.status}
                                        </span>
                                        <span className="text-xs text-gray-400">Created recently</span>
                                    </div>
                                </div>
                            ))}
                            {accountProjects.length === 0 && (
                                <div className="col-span-full py-12 text-center bg-white dark:bg-surface rounded-xl border border-dashed border-gray-300 dark:border-[#444746]">
                                    <Folder className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">No projects yet</h3>
                                    <p className="text-sm text-gray-500 mt-1">Get started by creating your first project.</p>
                                </div>
                            )}
                        </div>
                    </section>

                    <hr className="border-gray-200 dark:border-[#444746]" />

                    {/* Users Section */}
                    <section>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Users className="text-purple-600" size={20} />
                                    Team Members
                                    <span className="bg-gray-100 dark:bg-surface text-gray-600 dark:text-gray-300 text-xs font-medium px-2 py-0.5 rounded-full">{accountUsers.length}</span>
                                </h2>
                                <p className="text-sm text-gray-500 mt-1">Manage user access and project assignments.</p>
                            </div>
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <div className="relative flex-1 sm:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search users..."
                                        className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-[#444746] rounded-lg text-sm focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <div className="flex bg-white dark:bg-surface border border-gray-200 dark:border-[#444746] rounded-lg p-1 gap-1">
                                    <button onClick={() => setUserViewMode('grid')} className={cn("p-1.5 rounded transition-colors", userViewMode === 'grid' ? "bg-gray-100 dark:bg-surface text-gray-900 dark:text-white" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300")}>
                                        <LayoutGrid size={16} />
                                    </button>
                                    <button onClick={() => setUserViewMode('list')} className={cn("p-1.5 rounded transition-colors", userViewMode === 'list' ? "bg-gray-100 dark:bg-surface text-gray-900 dark:text-white" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300")}>
                                        <List size={16} />
                                    </button>
                                </div>
                                <button
                                    onClick={() => setIsUserModalOpen(true)}
                                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm flex items-center gap-2 whitespace-nowrap"
                                >
                                    <Plus size={16} /> Add Member
                                </button>
                            </div>
                        </div>

                        {userViewMode === 'grid' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {filteredUsers.map(user => (
                                    <div key={user.id} className="bg-white dark:bg-surface p-5 rounded-xl shadow-sm border border-gray-200 dark:border-[#444746] hover:border-purple-200 transition-all flex flex-col h-full">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 text-purple-700 flex items-center justify-center text-sm font-bold border border-white shadow-sm">
                                                {user.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <span className={cn("px-2 py-0.5 rounded text-xs font-semibold capitalize border",
                                                user.role === 'admin' ? "bg-amber-50 text-amber-700 border-amber-100" :
                                                    user.role === 'manager' ? "bg-primary-light text-primary-hover border-primary/10" :
                                                        "bg-gray-50 dark:bg-[#131314] text-gray-600 dark:text-gray-300 border-gray-100 dark:border-[#444746]")}>
                                                {user.role}
                                            </span>
                                        </div>
                                        <div className="mb-4 flex-1">
                                            <h3 className="font-semibold text-gray-900 dark:text-white truncate">{user.name}</h3>
                                            <p className="text-sm text-gray-500 truncate">{user.email}</p>
                                        </div>
                                        <div className="pt-4 border-t border-gray-100 dark:border-[#444746] mt-auto">
                                            <button
                                                onClick={() => handleOpenAccessModal(user)}
                                                className="w-full py-2 px-3 bg-gray-50 dark:bg-[#131314] hover:bg-gray-100 dark:hover:bg-surface text-gray-700 dark:text-gray-200 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Settings size={14} /> Manage Access
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-surface rounded-xl shadow-sm border border-gray-200 dark:border-[#444746] overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 dark:bg-[#131314] text-gray-500 font-medium border-b border-gray-200 dark:border-[#444746]">
                                        <tr>
                                            <th className="px-6 py-3">User</th>
                                            <th className="px-6 py-3">Role</th>
                                            <th className="px-6 py-3">Project Access</th>
                                            <th className="px-6 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredUsers.map(user => (
                                            <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-[#131314] transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">
                                                            {user.name.substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-gray-900 dark:text-white">{user.name}</div>
                                                            <div className="text-xs text-gray-500">{user.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="capitalize text-gray-700 dark:text-gray-200">{user.role}</span>
                                                </td>
                                                <td className="px-6 py-4 text-gray-500">
                                                    {(user.projectAccess?.length || 0)} Projects Assigned
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => handleOpenAccessModal(user)}
                                                        className="text-primary hover:text-blue-800 font-medium text-xs"
                                                    >
                                                        Manage Access
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </div>

                <Modal title="Create New Project" isOpen={isProjectModalOpen} onClose={() => setIsProjectModalOpen(false)}>
                    <form onSubmit={handleCreateProject} className="space-y-4">
                        <InputGroup label="Project Name">
                            <input required type="text" className="w-full p-2.5 border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-all"
                                value={newProject.name} onChange={e => setNewProject({ ...newProject, name: e.target.value })} placeholder="e.g. Riverside Complex" />
                        </InputGroup>
                        <InputGroup label="Address / Location">
                            <input required type="text" className="w-full p-2.5 border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-all"
                                value={newProject.address} onChange={e => setNewProject({ ...newProject, address: e.target.value })} placeholder="e.g. 123 Main St, Lisbon" />
                        </InputGroup>
                        <InputGroup label="Description">
                            <textarea className="w-full p-2.5 border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-all"
                                value={newProject.description} onChange={e => setNewProject({ ...newProject, description: e.target.value })} placeholder="Project details..." />
                        </InputGroup>
                        <PrimaryButton type="submit">Create Project</PrimaryButton>
                    </form>
                </Modal>

                <Modal title="Add New Team Member" isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)}>
                    <form onSubmit={handleCreateUser} className="space-y-4">
                        <InputGroup label="Full Name">
                            <input required type="text" className="w-full p-2.5 border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-purple-500 transition-all"
                                value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} placeholder="John Doe" />
                        </InputGroup>
                        <InputGroup label="Email Address">
                            <input required type="email" className="w-full p-2.5 border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-purple-500 transition-all"
                                value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} placeholder="john@company.com" />
                        </InputGroup>
                        <InputGroup label="Role">
                            <select className="w-full p-2.5 border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-purple-500 transition-all"
                                value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                                <option value="user">Standard User</option>
                                <option value="manager">Manager</option>
                            </select>
                            <p className="text-xs text-gray-500 mt-1">Managers have more permissions within assigned projects.</p>
                        </InputGroup>
                        <PrimaryButton type="submit">Add Member</PrimaryButton>
                    </form>
                </Modal>

                {selectedUserForAccess && (
                    <Modal
                        title={`Manage Access for ${selectedUserForAccess.name}`}
                        isOpen={isAccessModalOpen}
                        onClose={() => setIsAccessModalOpen(false)}
                    >
                        <div className="space-y-4">
                            <div className="bg-primary-light p-4 rounded-lg flex items-start gap-3">
                                <Shield className="text-primary shrink-0 mt-0.5" size={18} />
                                <div>
                                    <h4 className="text-sm font-semibold text-blue-900">Access Control</h4>
                                    <p className="text-xs text-primary-hover mt-1">
                                        Assign this user to specific projects. They will only see projects they are assigned to.
                                    </p>
                                </div>
                            </div>

                            <div className="max-h-[400px] overflow-y-auto space-y-2 border border-gray-100 dark:border-[#444746] rounded-lg p-2">
                                {accountProjects.length === 0 ? (
                                    <p className="text-sm text-gray-500 text-center py-4">No projects available to assign.</p>
                                ) : (
                                    accountProjects.map(project => {
                                        const userAccess = selectedUserForAccess.projectAccess?.find(a => a.projectId === project.id);
                                        const hasAccess = !!userAccess;

                                        return (
                                            <div key={project.id} className={cn("p-3 rounded-lg border transition-all", hasAccess ? "border-primary/20 bg-primary-light/50" : "border-gray-200 dark:border-[#444746] hover:bg-gray-50 dark:hover:bg-[#131314]")}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className={cn("w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-colors",
                                                                hasAccess ? "bg-primary border-primary text-white" : "border-gray-300 dark:border-[#444746] bg-white dark:bg-surface")}
                                                            onClick={() => handleToggleProjectAccess(project.id, hasAccess)}
                                                        >
                                                            {hasAccess && <Check size={12} />}
                                                        </div>
                                                        <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{project.name}</span>
                                                    </div>
                                                    {hasAccess && (
                                                        <select
                                                            className="text-xs border border-primary/20 rounded px-2 py-1 bg-white dark:bg-surface text-gray-700 dark:text-gray-200 outline-none focus:ring-1 focus:ring-primary"
                                                            value={userAccess.role}
                                                            onChange={(e) => handleRoleChange(project.id, e.target.value as ProjectRole)}
                                                        >
                                                            <option value="viewer">Viewer</option>
                                                            <option value="editor">Editor</option>
                                                            <option value="manager">Manager</option>
                                                        </select>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            <div className="flex justify-end pt-2">
                                <button
                                    onClick={() => setIsAccessModalOpen(false)}
                                    className="px-4 py-2 bg-gray-100 dark:bg-surface hover:bg-gray-200 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </Modal>
                )}
            </div>
        </AuthGuard>
    );
};
