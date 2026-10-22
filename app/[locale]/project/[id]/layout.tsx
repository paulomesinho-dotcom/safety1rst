'use client';

import React, { useState } from 'react';
import { Link, usePathname, useRouter } from '@/navigation';
import { useParams } from 'next/navigation';

import { useStore } from '@/store/useStore';
import Header from '@/components/Header';
import {
    LayoutDashboard,
    Building2,
    Users,
    HardHat,
    Scan,
    FileText,
    FileInput,
    AlertTriangle,
    GraduationCap,
    ChevronLeft,
    ChevronRight,
    LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import AuthGuard from '@/components/AuthGuard';
import { useTheme } from '@/providers/ThemeProvider';
import {
    FlatDashboardIcon,
    FlatCompaniesIcon,
    FlatWorkersIcon,
    FlatEquipmentIcon,
    FlatAccessControlIcon,
    FlatAccidentsIcon,
    FlatTrainingIcon,
    FlatFormsIcon,
    FlatDocumentsIcon,
    FlatWorkplanIcon,
    FlatSettingsIcon,
    FlatFolderIcon,
} from '@/components/FlatIcons';

const iconMap: Record<string, React.FC<any>> = {
    'dashboard': FlatDashboardIcon,
    'companies': FlatCompaniesIcon,
    'workers': FlatWorkersIcon,
    'equipment': FlatEquipmentIcon,
    'access-control': FlatAccessControlIcon,
    'accidents': FlatAccidentsIcon,
    'training': FlatTrainingIcon,
    'forms': FlatFormsIcon,
    'documents': FlatDocumentsIcon,
    'settings': FlatSettingsIcon,
};

const nameMap: Record<string, string> = {
    'companies': 'Organizações',
    'workers': 'Pessoas',
    'equipment': 'Equipamentos',
    'access-control': 'Controlo de Acessos',
    'accidents': 'Safety & Risks',
    'training': 'Formação',
    'forms': 'Formulários',
    'documents': 'Documentos',
};

function getInitials(name?: string) {
    if (!name) return 'U';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
    const params = useParams();
    const id = params?.id as string;
    const pathname = usePathname();
    const router = useRouter();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const { projects, modules, currentUser, setCurrentUser, getUserRoleInProject, canAccessModule, projectRequests } = useStore();
    const currentProject = projects.find(p => p.id === id);
    const { isDark } = useTheme();

    const isCreatorOrAdmin = currentUser?.role === 'admin' || currentUser?.role === 'superadmin' || currentProject?.creatorId === currentUser?.id;
    const userRole = isCreatorOrAdmin ? 'manager' : (currentUser && currentProject ? getUserRoleInProject(currentUser.id, id) : null);
    const pendingProjectRequests = (projectRequests || []).filter(r => r.projectId === id && r.status === 'pending');

    const handleLogout = () => {
        setCurrentUser(null);
        router.push('/login');
    };

    return (
        <AuthGuard>
            {!currentProject ? (
                <div className="flex h-screen items-center justify-center bg-[var(--bg)]">
                    <div className="text-center">
                        <h1 className="text-xl font-medium text-[var(--text)]">Obra Não Encontrada</h1>
                        <Link href="/" className="text-[#4285F4] hover:underline mt-2 inline-block">Voltar ao Workplace</Link>
                    </div>
                </div>
            ) : (!userRole || userRole === 'none') ? (
                <div className="flex h-screen items-center justify-center bg-[var(--bg)] px-4">
                    <div className="max-w-md w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-8 text-center shadow-lg space-y-4">
                        <div className="w-14 h-14 mx-auto rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center">
                            <AlertTriangle size={28} />
                        </div>
                        <h1 className="text-xl font-bold text-[var(--text)]">Acesso sem Perfil Atribuído</h1>
                        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                            O seu pedido foi aceite na obra, mas o Gestor ou Administrador ainda não lhe definiu um perfil de acesso (Manager, Editor, Viewer, Data User ou Approval).
                        </p>
                        <div className="pt-2">
                            <Link href="/" className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-sm transition-all">
                                Voltar ao Workplace
                            </Link>
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

                        {/* Return to All Projects Button */}
                        <div className="mb-3">
                            <Link
                                href="/"
                                className={cn(
                                    "fjm-nav-item",
                                    isCollapsed && "justify-center px-0"
                                )}
                                title="Todos os Projectos"
                            >
                                <FlatFolderIcon size={18} className="shrink-0" />
                                {!isCollapsed && <span className="truncate">Todos os Projectos</span>}
                            </Link>
                        </div>

                        {/* Nav Items List */}
                        <nav className="flex-1 overflow-y-auto pr-1">
                            {!isCollapsed && (
                                <div className="fjm-nav-label">Menu</div>
                            )}
                            <ul className="space-y-0.5">
                                {/* Dashboard */}
                                <li>
                                    {(() => {
                                        const dashPath = `/project/${id}/dashboard`;
                                        const rootPath = `/project/${id}`;
                                        const locale = params?.locale;
                                        const isActive = pathname === dashPath || pathname === rootPath ||
                                            (!!locale && (pathname === `/${locale}${dashPath}` || pathname === `/${locale}${rootPath}`));

                                        return (
                                            <Link
                                                href={dashPath}
                                                className={cn(
                                                    "fjm-nav-item",
                                                    isActive && "active",
                                                    isCollapsed && "justify-center px-0"
                                                )}
                                                title={isCollapsed ? "Dashboard" : undefined}
                                            >
                                                <FlatDashboardIcon size={18} className="shrink-0" />
                                                {!isCollapsed && <span className="truncate">Dashboard</span>}
                                            </Link>
                                        );
                                    })()}
                                </li>

                                {/* Dynamic Modules */}
                                {modules.filter(m => m.name !== 'Projects').map((module) => {
                                    if (currentUser && !canAccessModule(currentUser.id, id, module.id)) return null;

                                    const label = nameMap[module.id] || module.name;
                                    const modulePath = `/project/${id}/${module.path}`;
                                    const locale = params?.locale;
                                    const isActive = pathname === modulePath || pathname?.startsWith(`${modulePath}/`) ||
                                        (!!locale && (pathname === `/${locale}${modulePath}` || pathname?.startsWith(`/${locale}${modulePath}/`)));

                                    const IconComponent = iconMap[module.id] || LayoutDashboard;

                                    return (
                                        <li key={module.id}>
                                            <Link
                                                href={modulePath}
                                                className={cn(
                                                    "fjm-nav-item",
                                                    isActive && "active",
                                                    isCollapsed && "justify-center px-0"
                                                )}
                                                title={isCollapsed ? label : undefined}
                                            >
                                                <IconComponent size={18} className="shrink-0" />
                                                {!isCollapsed && <span className="truncate">{label}</span>}
                                            </Link>
                                        </li>
                                    );
                                })}

                                {/* Work Plan (Plano de Trabalhos) */}
                                {(() => {
                                    const wpPath = `/project/${id}/workplan`;
                                    const locale = params?.locale;
                                    const isActive = pathname === wpPath || pathname?.startsWith(`${wpPath}/`) ||
                                        (!!locale && (pathname === `/${locale}${wpPath}` || pathname?.startsWith(`/${locale}${wpPath}/`)));

                                    return (
                                        <li>
                                            <Link
                                                href={wpPath}
                                                className={cn(
                                                    "fjm-nav-item",
                                                    isActive && "active",
                                                    isCollapsed && "justify-center px-0"
                                                )}
                                                title={isCollapsed ? "Plano de Trabalhos" : undefined}
                                            >
                                                <FlatWorkplanIcon size={18} className="shrink-0" />
                                                {!isCollapsed && <span className="truncate">Plano de Trabalhos</span>}
                                            </Link>
                                        </li>
                                    );
                                })()}

                                {/* Settings (Manager / Admin Only) */}
                                {(() => {
                                    const setPath = `/project/${id}/settings`;
                                    const locale = params?.locale;
                                    const isActive = pathname === setPath || (!!locale && pathname === `/${locale}${setPath}`);

                                    return (
                                        <li className="pt-2">
                                            <Link
                                                href={setPath}
                                                className={cn(
                                                    "fjm-nav-item",
                                                    isActive && "active",
                                                    isCollapsed && "justify-center px-0"
                                                )}
                                                title={isCollapsed ? "Configurações da Obra" : undefined}
                                            >
                                                <FlatSettingsIcon size={18} className="shrink-0" />
                                                {!isCollapsed && <span className="truncate">Configurações</span>}
                                                {pendingProjectRequests.length > 0 && (
                                                    <span className="ml-auto px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-500 text-white animate-pulse">
                                                        {pendingProjectRequests.length}
                                                    </span>
                                                )}
                                            </Link>
                                        </li>
                                    );
                                })()}
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
                                        <div className="fjm-user-role capitalize" title={userRole || currentUser?.role}>
                                            {userRole || currentUser?.role || 'Utilizador'}
                                        </div>
                                    </div>
                                )}
                                {!isCollapsed && (
                                    <button
                                        onClick={handleLogout}
                                        title="Terminar Sessão"
                                        className="p-1.5 rounded-full hover:bg-[var(--bg-input)] hover:text-red-500 text-[var(--text-muted)] transition-colors shrink-0"
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
                                    className="mt-2 p-1.5 rounded-full hover:bg-[var(--bg-input)] hover:text-red-500 text-[var(--text-muted)] transition-colors flex items-center justify-center w-full"
                                >
                                    <LogOut size={16} />
                                </button>
                            )}
                        </div>
                    </aside>

                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                        <Header />
                        <main className="flex-1 bg-[var(--bg-card)] ml-3 mt-3 mr-4 mb-4 rounded-lg shadow-sm border border-[var(--border)] overflow-hidden relative">
                            <div className="absolute inset-0 overflow-y-auto p-6">
                                {pendingProjectRequests.length > 0 && (
                                    <div className="mb-4 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-center justify-between gap-3 animate-in fade-in">
                                        <div className="flex items-center gap-2.5">
                                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" />
                                            <span className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                                                Tem {pendingProjectRequests.length === 1 ? '1 pedido de acesso pendente' : `${pendingProjectRequests.length} pedidos de acesso pendentes`} nesta obra.
                                            </span>
                                        </div>
                                        <Link
                                            href="/"
                                            className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold shadow-sm transition-all whitespace-nowrap"
                                        >
                                            Ver no Workplace &rarr;
                                        </Link>
                                    </div>
                                )}
                                {children}
                            </div>
                        </main>
                    </div>
                </div>
            )}
        </AuthGuard>
    );
}
