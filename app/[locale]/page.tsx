'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from '@/navigation';
import { useStore, type AppState } from '@/store/useStore';

import { ChevronDown, Plus, LayoutGrid, List, Search, Filter, Folder, MapPin, Users, Layout, LogOut, ArrowRight, Sun, Moon } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { useShallow } from 'zustand/react/shallow';
import { Modal, InputGroup, PrimaryButton } from '@/components/Modal';
import AuthGuard from '@/components/AuthGuard';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useTheme } from '@/providers/ThemeProvider';

export default function Home() {
    const router = useRouter();
    const { projects, currentUser, addProject, setCurrentUser, addProjectRequest, projectRequests } = useStore(useShallow((state: AppState) => ({
        projects: state.projects,
        currentUser: state.currentUser,
        addProject: state.addProject,
        setCurrentUser: state.setCurrentUser,
        addProjectRequest: state.addProjectRequest,
        projectRequests: state.projectRequests
    })));
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isJoinOpen, setIsJoinOpen] = useState(false);
    const [joinCode, setJoinCode] = useState('');
    const { isDark, toggleTheme } = useTheme();

    // New Project State
    const [newProj, setNewProj] = useState({ name: '', address: '', description: '' });

    useEffect(() => {
        if (!currentUser) {
            router.replace('/login');
        }
    }, [currentUser, router]);

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        addProject({ ...newProj, status: 'active' });
        setIsCreateOpen(false);
        setNewProj({ name: '', address: '', description: '' });
    };

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault();
        let foundProj: any = null;
        projects.forEach((p: any) => {
            const code = `PRJ-${p.id.substring(0, 4).toUpperCase()}-${new Date().getFullYear()}`;
            if (code === joinCode.trim().toUpperCase() || p.id === joinCode.trim()) {
                foundProj = p;
            }
        });

        if (foundProj && currentUser) {
            addProjectRequest(currentUser.id, foundProj.id);
            alert(`Request sent to join ${foundProj.name}.`);
            setIsJoinOpen(false);
            setJoinCode('');
        } else if (!foundProj) {
            alert('Invalid Project Code.');
        }
    };

    const handleLogout = () => {
        setCurrentUser(null);
        router.push('/login');
    };

    if (!currentUser) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const isAdmin = currentUser.role === 'admin' || currentUser.role === 'superadmin';
    const visibleProjects = projects.filter((p: any) => {
        if (isAdmin) return true;
        return currentUser.projectAccess?.some((pa: any) => pa.projectId === p.id);
    });

    return (
        <AuthGuard>
            {/* Allow global theme backgrounds to apply */}
            <div className="min-h-screen bg-background text-content-text flex flex-col">
                {/* Top Bar */}
                <div className="bg-[var(--bg-card)] border-b border-[var(--border)] px-8 py-4 flex items-center justify-between shadow-sm sticky top-0 z-[100] transition-colors">
                    <div className="flex items-center gap-3">
                        <img src="/safetyfirst-logo.png" className="w-9 h-9 object-contain shrink-0" alt="Safety1irst Logo" />
                        <span className="font-semibold text-lg tracking-tight text-[var(--text)]">
                            Safety<span style={{ color: '#4285F4', fontWeight: 700 }}>1irst</span>
                        </span>
                    </div>
                    <div className="flex items-center gap-5">
                        <LanguageSwitcher />
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-lg hover:bg-[var(--bg-input)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                            title={isDark ? "Mudar para modo claro" : "Mudar para modo escuro"}
                        >
                            {isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-slate-400" />}
                        </button>
                        <div className="text-right hidden sm:block">
                            <span className="block text-sm text-[var(--text)] font-medium">{currentUser.name}</span>
                            <span className="block text-xs text-[var(--text-muted)] uppercase">{currentUser.role}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            {!isAdmin && (
                                <button
                                    onClick={() => setIsJoinOpen(true)}
                                    className="text-sm bg-blue-500/10 text-[#4285F4] px-3 py-1.5 rounded-lg font-medium hover:bg-blue-500/20 transition-colors"
                                >
                                    Enter Code
                                </button>
                            )}
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#4285F4] to-[#8B5CF6] text-white flex items-center justify-center text-sm font-semibold shadow-sm">
                                {currentUser.name.charAt(0)}
                            </div>
                            <button onClick={handleLogout} className="p-2 text-[var(--text-muted)] hover:text-red-500 transition-colors" title="Logout">
                                <LogOut size={20} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 max-w-6xl w-full mx-auto p-8">
                    <div className="mb-10 text-center sm:text-left">
                        <h1 className="text-3xl font-heading font-light text-gray-900 dark:text-white">Welcome Back, <span className="font-semibold">{currentUser.name.split(' ')[0] || 'User'}</span></h1>
                        <p className="text-gray-500 mt-2">Here are the projects you are currently working on.</p>
                    </div>

                    <div className="flex items-center justify-between mb-6 border-b border-gray-200 dark:border-[#444746] pb-4">
                        <h2 className="text-lg font-heading font-semibold text-gray-900 dark:text-white flex items-center gap-2"><Layout size={20} /> Workspaces</h2>

                        {isAdmin && (
                            <div className="flex gap-2">
                                {currentUser.role === 'superadmin' && (
                                    <button
                                        onClick={() => router.push('/platform')}
                                        className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-700 px-4 py-2 rounded-lg font-medium hover:bg-indigo-100 shadow-sm transition-all text-sm"
                                    >
                                        <Layout size={16} /> Gestão de Clientes
                                    </button>
                                )}
                                <button
                                    onClick={() => router.push('/global-users')}
                                    className="flex items-center gap-2 bg-white dark:bg-surface border border-gray-300 dark:border-[#444746] text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-[#131314] shadow-sm transition-all text-sm"
                                >
                                    <Users size={16} /> Utilizadores
                                </button>
                                <button
                                    onClick={() => setIsCreateOpen(true)}
                                    className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-hover shadow-sm transition-all text-sm"
                                >
                                    <Plus size={16} /> Novo Projecto
                                </button>
                            </div>
                        )}
                    </div>

                    {visibleProjects.length === 0 ? (
                        <div className="text-center py-20 bg-white dark:bg-surface rounded-xl border border-dashed border-gray-300 dark:border-[#444746]">
                            <Folder className="mx-auto text-gray-300 mb-4" size={48} />
                            <h2 className="text-2xl font-medium text-gray-900 dark:text-white">No Projects Found</h2>
                            <p className="text-gray-500">You haven't been assigned to any projects yet.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {visibleProjects.map((project: any) => (
                                <div
                                    key={project.id}
                                    onClick={() => router.push(`/project/${project.id}/dashboard`)}
                                    className="bg-white dark:bg-surface rounded-xl p-6 border border-gray-200 dark:border-[#444746] shadow-sm hover:shadow-drive hover:border-primary/30 cursor-pointer transition-all group relative overflow-hidden"
                                >
                                    <div className="absolute top-0 left-0 w-2 h-full bg-primary-light0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-primary-light rounded-lg text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                            <Folder size={24} fill="currentColor" />
                                        </div>
                                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${project.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 dark:bg-surface text-gray-600 dark:text-gray-300'}`}>
                                            {project.status}
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-primary transition-colors">{project.name}</h3>
                                    <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-4">
                                        <MapPin size={14} /> {project.address || 'No address'}
                                    </div>
                                    <div className="pt-4 border-t border-gray-100 dark:border-[#444746] flex items-center justify-between text-xs text-gray-400">
                                        <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
                                        <span className="flex items-center gap-1 text-primary font-medium">Enter <ArrowRight size={16} /></span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Create Project Modal */}
                <Modal title="Create New Project" isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)}>
                    <form onSubmit={handleCreate}>
                        <InputGroup label="Project Name">
                            <input required type="text" className="w-full p-2.5 border border-gray-300 dark:border-[#444746] rounded-lg focus:border-primary outline-none"
                                value={newProj.name} onChange={e => setNewProj({ ...newProj, name: e.target.value })} />
                        </InputGroup>
                        <InputGroup label="Address">
                            <input required type="text" className="w-full p-2.5 border border-gray-300 dark:border-[#444746] rounded-lg focus:border-primary outline-none"
                                value={newProj.address} onChange={e => setNewProj({ ...newProj, address: e.target.value })} />
                        </InputGroup>
                        <InputGroup label="Description">
                            <textarea className="w-full p-2.5 border border-gray-300 dark:border-[#444746] rounded-lg focus:border-primary outline-none" rows={3}
                                value={newProj.description} onChange={e => setNewProj({ ...newProj, description: e.target.value })} />
                        </InputGroup>
                        <PrimaryButton type="submit">Create Project</PrimaryButton>
                    </form>
                </Modal>

                {/* Join Project Modal */}
                <Modal title="Join Project" isOpen={isJoinOpen} onClose={() => setIsJoinOpen(false)}>
                    <form onSubmit={handleJoin}>
                        <InputGroup label="Invitation Code">
                            <input required type="text" className="w-full p-2.5 border border-gray-300 dark:border-[#444746] rounded-lg focus:border-primary outline-none uppercase placeholder:normal-case"
                                placeholder="e.g. PRJ-PROJ-2026"
                                value={joinCode} onChange={e => setJoinCode(e.target.value)} />
                        </InputGroup>
                        <p className="text-xs text-gray-500 mb-4">
                            Enter the code provided by your administrator. Your request will be sent for approval.
                        </p>
                        <PrimaryButton type="submit">Send Request</PrimaryButton>
                    </form>
                </Modal>
            </div>
        </AuthGuard>
    );
}
