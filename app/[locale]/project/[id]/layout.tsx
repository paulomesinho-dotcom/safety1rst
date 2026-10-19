'use client';

import React, { useState } from 'react';
import { Link, usePathname, useRouter } from '@/navigation';
import { useParams } from 'next/navigation';

import { useStore } from '@/store/useStore';
import Header from '@/components/Header';
import {
    LayoutDashboard, Building2, Users, HardHat, Scan, FileText, FileInput, AlertTriangle, GraduationCap, ChevronLeft, ChevronRight, UserCog, PanelLeftClose, PanelLeftOpen, Settings as SettingsIcon,
    Globe, Bot, Cpu, Activity, FileStack, Shield, BrainCircuit,
    Component, UserSquare, Wrench, FileCode, Hammer, Scale,
    Server, Bug, Blocks, Brackets, Network, Boxes, GitMerge,
    TriangleAlert, Monitor, Fingerprint, Forklift, Presentation, Sliders, ClipboardList
} from 'lucide-react';
import { cn } from '@/lib/utils';
import AuthGuard from '@/components/AuthGuard';
import { BrandLogo } from '@/components/BrandLogo';
import { useTheme } from '@/providers/ThemeProvider';


const iconMaps: Record<string, Record<string, React.FC<any>>> = {
    'default': {
        'companies': Building2,
        'workers': Users,
        'equipment': HardHat,
        'access-control': Scan,
        'accidents': AlertTriangle,
        'training': GraduationCap,
        'forms': FileInput,
        'documents': FileText,
        'team': UserCog,
        'dashboard': LayoutDashboard,
        'settings': SettingsIcon
    },
    'future': {
        'companies': Globe,
        'workers': Bot,
        'equipment': Cpu,
        'access-control': Scan,
        'accidents': Activity,
        'training': BrainCircuit,
        'forms': FileStack,
        'documents': FileText,
        'team': Users,
        'dashboard': LayoutDashboard,
        'settings': SettingsIcon
    },
    'bim': {
        'companies': Network,
        'workers': Users, // Pessoas
        'equipment': Forklift, // Maquinaria pesada (empilhadora)
        'access-control': Fingerprint, // Impressão digital
        'accidents': TriangleAlert, // Triangulo com exclamação
        'training': Presentation, // Formação / Apresentação
        'forms': Brackets, // Formulários (icone anterior)
        'documents': Monitor, // PC
        'team': GitMerge,
        'dashboard': LayoutDashboard,
        'settings': Sliders
    }
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

// Removed colorMap as it's now handled dynamically
const getColorClass = (id: string) => {
    switch (id) {
        case 'companies': return 'text-primary dark:text-gray-300';
        case 'workers': return 'text-emerald-600 dark:text-gray-300';
        case 'equipment': return 'text-orange-600 dark:text-gray-300';
        case 'access-control': return 'text-purple-600 dark:text-gray-300';
        case 'accidents': return 'text-red-600 dark:text-gray-300';
        case 'training': return 'text-indigo-600 dark:text-gray-300';
        case 'forms': return 'text-pink-600 dark:text-gray-300';
        case 'documents': return 'text-teal-600 dark:text-gray-300';
        default: return 'text-gray-600 dark:text-gray-300';
    }
};

const getBgColorClass = (id: string) => {
    switch (id) {
        case 'companies': return 'bg-blue-50 text-primary dark:bg-[#1e1f20] dark:text-gray-200';
        case 'workers': return 'bg-emerald-50 text-emerald-600 dark:bg-[#1e1f20] dark:text-gray-200';
        case 'equipment': return 'bg-orange-50 text-orange-600 dark:bg-[#1e1f20] dark:text-gray-200';
        case 'access-control': return 'bg-purple-50 text-purple-600 dark:bg-[#1e1f20] dark:text-gray-200';
        case 'accidents': return 'bg-red-50 text-red-600 dark:bg-[#1e1f20] dark:text-gray-200';
        case 'training': return 'bg-indigo-50 text-indigo-600 dark:bg-[#1e1f20] dark:text-gray-200';
        case 'forms': return 'bg-pink-50 text-pink-600 dark:bg-[#1e1f20] dark:text-gray-200';
        case 'documents': return 'bg-teal-50 text-teal-600 dark:bg-[#1e1f20] dark:text-gray-200';
        default: return 'bg-gray-100 text-gray-600 dark:bg-[#1e1f20] dark:text-gray-200';
    }
}

const ModuleIcon = ({ id, isActive, theme }: { id: string, isActive: boolean, theme: string }) => {
    const { color } = useTheme();

    // Determine Icon Component
    let mapToUse = iconMaps.default;
    if (theme === 'future') mapToUse = iconMaps.future;
    if (theme === 'bim') mapToUse = iconMaps.bim;

    const IconComponent = mapToUse[id] || LayoutDashboard;

    // Apply Styles based on Theme
    if (theme === 'round') {
        const activeClass = "bg-primary text-white shadow-md";
        const inactiveClass = getBgColorClass(id); // Pastel background for inactive

        return (
            <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                isActive ? activeClass : inactiveClass
            )}>
                <IconComponent size={16} />
            </div>
        );
    }

    if (theme === 'colour') {
        const colorClass = getColorClass(id);
        // "Colour": Show colors on inactive state too (opacity-70)
        return <IconComponent size={18} className={cn("shrink-0 transition-colors", isActive ? colorClass : cn(colorClass, "opacity-70 group-hover:opacity-100"))} />;
    }

    if (theme === 'real') {
        // "Real" style: Use default icons but with a filled/solid look approximation via classes or specific icons if available
        // Improve realism with heavier weight and fill
        return <IconComponent size={18} className={cn("shrink-0 drop-shadow-sm", isActive ? "text-slate-900 fill-slate-900" : "text-gray-500 fill-gray-300")} strokeWidth={1.5} />;
    }

    if (theme === 'future') {
        // Future Theme Icons: Glow effect using the active text color
        const inactiveColor = color === 'colab' || color === 'x1' ? "text-gray-300" : "text-slate-500";
        return <IconComponent size={18} className={cn("shrink-0 transition-colors duration-200", isActive ? "text-nav-active drop-shadow-[0_0_8px_currentColor]" : inactiveColor)} />;
    }

    if (theme === 'bim') {
        const inactiveColor = (color === 'bim' || color === 'deep/bim') ? "text-slate-400" : color === 'colab' || color === 'x1' ? "text-gray-300" : "text-google-text opacity-70";
        // BIM Theme Icons: High-tech grey when inactive, dynamic when active
        return <IconComponent size={18} className={cn("shrink-0 transition-colors duration-200", isActive ? "text-nav-active" : inactiveColor)} strokeWidth={1.5} />;
    }

    // Default 'safety' and regular variants
    const colabInactiveColor = color === 'colab' || color === 'x1' ? "text-gray-300" : "text-gray-500 dark:text-gray-400";
    return <IconComponent size={18} className={cn("shrink-0", isActive ? "text-nav-active" : colabInactiveColor)} />;
};

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
    const params = useParams();
    const id = params?.id as string;
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const { projects, modules, currentUser, getUserRoleInProject, canAccessModule, canEditProject } = useStore();
    const currentProject = projects.find(p => p.id === id);
    const { iconTheme, color } = useTheme(); // Consume Theme

    // Auth logic is handled by AuthGuard wrapping
    // We moved checks inside to ensure AuthGuard runs
    const userRole = currentUser && currentProject ? getUserRoleInProject(currentUser.id, id) : null;
    const canEdit = currentUser && currentProject ? canEditProject(currentUser.id, id) : false;

    return (
        <AuthGuard>
            {!currentProject ? (
                <div className="flex h-screen items-center justify-center bg-background">
                    <div className="text-center">
                        <h1 className="text-xl font-medium text-gray-900 dark:text-white">Project Not Found</h1>
                        <Link href="/" className="text-primary hover:underline mt-2 inline-block">Return Home</Link>
                    </div>
                </div>
            ) : !userRole ? (
                <div className="flex h-screen items-center justify-center bg-background">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h1>
                        <p className="text-gray-500 mb-4">You do not have permission to view this project.</p>
                        <Link href="/" className="text-primary hover:underline">Return Home</Link>
                    </div>
                </div>
            ) : (
                <div className="flex h-screen w-full bg-background overflow-hidden">
                    {/* Project Sidebar */}
                    <aside className={cn(
                        "h-full flex flex-col pt-4 pr-4 pb-4 transition-all duration-300 ease-in-out border-r bg-nav-sidebar border-nav-sidebar",
                        isCollapsed ? "w-20" : "w-64"
                    )}>
                        <div className={cn("flex flex-col", isCollapsed ? "items-center px-1" : "pl-6 pr-2")}>

                            <div className={cn("flex items-center gap-3", isCollapsed ? "justify-center mb-4 mt-4" : "mb-6 mt-4")}>
                                <img src="/safetyfirst-logo.png" alt="SafetyFirst Logo" className="w-10 h-10 object-contain" />
                                {!isCollapsed && <BrandLogo className="text-xl" isBim={color === 'bim' || color === 'deep/bim'} isColab={color === 'colab' || color === 'x1'} />}
                            </div>

                            <div className={cn("flex items-center mb-2 w-full transition-all", isCollapsed ? "justify-center gap-1" : "justify-between")}>
                                <Link
                                    href="/"
                                    className={cn(
                                        "flex items-center gap-2 text-sm p-1.5 rounded-lg transition-colors",
                                        isCollapsed && "justify-center",
                                        (color === 'bim' || color === 'deep/bim')
                                            ? "text-slate-400 hover:text-[#39CACC] hover:bg-slate-800"
                                            : color === 'colab' || color === 'x1'
                                                ? "text-gray-300 hover:text-white hover:bg-[#2a4060]"
                                                : "text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-surface"
                                    )}
                                    title="All Projects"
                                >
                                    <ChevronLeft size={20} /> {!isCollapsed && "All Projects"}
                                </Link>

                                <button
                                    onClick={() => setIsCollapsed(!isCollapsed)}
                                    className={cn(
                                        "p-1.5 rounded-lg transition-colors",
                                        (color === 'bim' || color === 'deep/bim')
                                            ? "text-slate-400 hover:text-[#39CACC] hover:bg-slate-800"
                                            : color === 'colab' || color === 'x1'
                                                ? "text-gray-300 hover:text-white hover:bg-[#2a4060]"
                                                : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-surface"
                                    )}
                                    title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                                >
                                    {isCollapsed ? <ChevronRight size={20} /> : <PanelLeftClose size={18} />}
                                </button>
                            </div>
                        </div>

                        <nav className="flex-1 overflow-y-auto mt-2">
                            <ul className="space-y-1">
                                <li>
                                    <Link
                                        href={`/project/${id}/dashboard`}
                                        className={cn("flex items-center gap-3 py-2 rounded-r-full text-sm font-medium transition-colors group",
                                            isCollapsed ? "px-0 justify-center" : "px-6",
                                            (pathname === `/project/${id}/dashboard` || pathname === `/project/${id}` ||
                                                (params && (pathname === `/${params.locale}/project/${id}/dashboard` || pathname === `/${params.locale}/project/${id}`)))
                                                ? ((color === 'bim' || color === 'deep/bim') ? "bg-slate-800 text-[#39CACC]" : color === 'colab' || color === 'x1' ? "bg-nav-active text-nav-active" : "bg-nav-active text-nav-active")
                                                : cn("text-google-text/70 dark:text-content-text/70 hover:bg-gray-100 dark:hover:bg-surface dark:hover:bg-nav-hover-bg hover:text-google-text dark:hover:text-content-text", (color === 'bim' || color === 'deep/bim') && "text-slate-400 hover:bg-slate-800 hover:text-[#39CACC]", color === 'colab' || color === 'x1' && "text-gray-300 hover:bg-[#2a4060] hover:text-white")
                                        )}
                                        title={isCollapsed ? "Dashboard" : ""}
                                    >
                                        <ModuleIcon id="dashboard" isActive={(pathname === `/project/${id}/dashboard` || pathname === `/project/${id}` ||
                                            (params && (pathname === `/${params.locale}/project/${id}/dashboard` || pathname === `/${params.locale}/project/${id}`)))} theme={iconTheme || 'safety'} />
                                        {!isCollapsed && "Dashboard"}
                                    </Link>
                                </li>

                                {/* Modules Filtered by Permission */}
                                {modules.filter(m => m.name !== 'Projects').map((module) => {
                                    if (currentUser && !canAccessModule(currentUser.id, id, module.id)) return null;

                                    const label = nameMap[module.id] || module.name;
                                    const modulePath = `/project/${id}/${module.path}`;
                                    const locale = params?.locale;
                                    const isActive = pathname === modulePath || pathname?.startsWith(`${modulePath}/`) ||
                                        (!!locale && (pathname === `/${locale}${modulePath}` || pathname?.startsWith(`/${locale}${modulePath}/`)));

                                    return (
                                        <li key={module.id}>
                                            <Link
                                                href={modulePath}
                                                className={cn(
                                                    "flex items-center gap-3 py-2 rounded-r-full text-sm font-medium transition-colors group",
                                                    isCollapsed ? "px-0 justify-center" : "px-6",
                                                    isActive
                                                        ? ((color === 'bim' || color === 'deep/bim') ? "bg-slate-800 text-[#39CACC]" : color === 'colab' || color === 'x1' ? "bg-nav-active text-nav-active" : "bg-nav-active text-nav-active")
                                                        : cn("text-google-text/70 dark:text-content-text/70 hover:bg-gray-100 dark:hover:bg-surface dark:hover:bg-nav-hover-bg hover:text-google-text dark:hover:text-content-text", (color === 'bim' || color === 'deep/bim') && "text-slate-400 hover:bg-slate-800 hover:text-[#39CACC]", color === 'colab' || color === 'x1' && "text-gray-300 hover:bg-[#2a4060] hover:text-white")
                                                )}
                                                title={isCollapsed ? label : ""}
                                            >
                                                <ModuleIcon id={module.id} isActive={isActive} theme={iconTheme || 'safety'} />
                                                {!isCollapsed && label}
                                            </Link>
                                        </li>
                                    );
                                })}

                                {/* Work Plan — Plano de Trabalhos */}
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
                                                    'flex items-center gap-3 py-2 rounded-r-full text-sm font-medium transition-colors group',
                                                    isCollapsed ? 'px-0 justify-center' : 'px-6',
                                                    isActive
                                                        ? ((color === 'bim' || color === 'deep/bim') ? 'bg-slate-800 text-[#39CACC]' : color === 'colab' || color === 'x1' ? 'bg-nav-active text-nav-active' : 'bg-nav-active text-nav-active')
                                                        : cn('text-google-text/70 dark:text-content-text/70 hover:bg-gray-100 dark:hover:bg-surface dark:hover:bg-nav-hover-bg hover:text-google-text dark:hover:text-content-text', (color === 'bim' || color === 'deep/bim') && 'text-slate-400 hover:bg-slate-800 hover:text-[#39CACC]', color === 'colab' || color === 'x1' && 'text-gray-300 hover:bg-[#2a4060] hover:text-white')
                                                )}
                                                title={isCollapsed ? 'Plano de Trabalhos' : ''}
                                            >
                                                <ClipboardList size={18} className={cn('shrink-0', isActive ? 'text-nav-active' : 'text-gray-500 dark:text-gray-400')} />
                                                {!isCollapsed && 'Plano de Trabalhos'}
                                            </Link>
                                        </li>
                                    );
                                })()}

                                {/* Project Settings - Only for Managers */}
                                <li className={cn("mt-6 pt-4 border-t border-gray-100 dark:border-[#444746]", !isCollapsed && "mx-4 transition-all")}>
                                    <div className="flex flex-col gap-1">
                                        <Link
                                            href={`/project/${id}/settings`}
                                            className={cn(
                                                "flex items-center gap-3 py-1.5 rounded-r-full text-sm font-medium transition-colors group",
                                                isCollapsed ? "px-0 justify-center" : "px-2",
                                                (pathname === `/project/${id}/settings` || (params && pathname === `/${params.locale}/project/${id}/settings`))
                                                    ? ((color === 'bim' || color === 'deep/bim') ? "bg-slate-800 text-[#39CACC]" : color === 'colab' || color === 'x1' ? "bg-nav-active text-nav-active" : "bg-nav-active text-nav-active")
                                                    : cn("text-google-text/70 dark:text-content-text/70 hover:bg-gray-100 dark:hover:bg-surface dark:hover:bg-nav-hover-bg hover:text-google-text dark:hover:text-content-text", (color === 'bim' || color === 'deep/bim') && "text-slate-400 hover:bg-slate-800 hover:text-[#39CACC]", color === 'colab' || color === 'x1' && "text-gray-300 hover:bg-[#2a4060] hover:text-white")
                                            )}
                                            title={isCollapsed ? "Project Settings" : ""}
                                        >
                                            <ModuleIcon id="settings" isActive={(pathname === `/project/${id}/settings` || (!!params && pathname === `/${params.locale}/project/${id}/settings`))} theme={iconTheme || 'safety'} />
                                            {!isCollapsed && "Project Settings"}
                                        </Link>
                                    </div>
                                </li>

                            </ul>
                        </nav>
                    </aside>

                    {/* Main Content */}
                    <div className="flex-1 flex flex-col min-w-0">
                        <Header />
                        <main className="flex-1 bg-white dark:bg-surface ml-2 mt-2 mr-4 mb-4 rounded-2xl shadow-sm border border-gray-100 dark:border-nav-sidebar-border overflow-hidden relative">
                            <div className="absolute inset-0 overflow-y-auto p-6">
                                {children}
                            </div>
                        </main>
                    </div>
                </div>
            )
            }
            {/* Modal for Project Creating/Editing if needed could go here, or remain global */}
        </AuthGuard>
    );
};
