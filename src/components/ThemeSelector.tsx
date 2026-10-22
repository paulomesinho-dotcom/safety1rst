'use client';

import React from 'react';
import { useTheme, type Theme } from '@/providers/ThemeProvider';
import { FlatSunIcon, FlatMoonIcon, FlatS1Icon } from '@/components/FlatIcons';
import { cn } from '@/lib/utils';

interface ThemeSelectorProps {
    variant?: 'sidebar' | 'workplace';
    isCollapsed?: boolean;
    className?: string;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
    variant = 'sidebar',
    isCollapsed = false,
    className = '',
}) => {
    const { theme, setTheme } = useTheme();

    // ── Workplace Header Variant: strictly 'Claro' and 'Escuro' ──
    if (variant === 'workplace') {
        const isCurrentDark = theme === 'dark';
        const isCurrentLight = theme === 'light' || theme === 's1';

        return (
            <div
                className={cn(
                    "inline-flex items-center p-0.5 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] shadow-sm select-none",
                    className
                )}
                role="group"
                aria-label="Seletor de Tema"
            >
                {/* Claro */}
                <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer",
                        isCurrentLight
                            ? "bg-[var(--bg-card)] text-amber-600 dark:text-amber-400 shadow-sm font-bold"
                            : "text-[var(--text-muted)] hover:text-[var(--text)]"
                    )}
                    title="Modo Claro"
                >
                    <FlatSunIcon size={14} className={isCurrentLight ? "text-amber-500" : "text-[var(--text-muted)]"} />
                    <span className="hidden sm:inline">Claro</span>
                </button>

                {/* Escuro */}
                <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer",
                        isCurrentDark
                            ? "bg-[var(--bg-card)] text-blue-500 dark:text-blue-400 shadow-sm font-bold"
                            : "text-[var(--text-muted)] hover:text-[var(--text)]"
                    )}
                    title="Modo Escuro"
                >
                    <FlatMoonIcon size={14} className={isCurrentDark ? "text-blue-500 dark:text-blue-400" : "text-[var(--text-muted)]"} />
                    <span className="hidden sm:inline">Escuro</span>
                </button>
            </div>
        );
    }

    // ── Collapsed Sidebar Mode: Clean single-cycle button ──
    if (isCollapsed) {
        const cycleTheme = () => {
            if (theme === 'light') setTheme('dark');
            else if (theme === 'dark') setTheme('s1');
            else setTheme('light');
        };

        const themeLabels: Record<Theme, string> = {
            light: 'Tema: Claro',
            dark: 'Tema: Escuro',
            s1: 'Tema: S1 (Claro + Barra Escura)',
        };

        return (
            <button
                type="button"
                onClick={cycleTheme}
                className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer",
                    "hover:bg-black/10 dark:hover:bg-white/10 text-[var(--text-muted)] hover:text-[var(--text)]",
                    className
                )}
                title={themeLabels[theme]}
            >
                {theme === 'light' && <FlatSunIcon size={18} className="text-amber-500" />}
                {theme === 'dark' && <FlatMoonIcon size={18} className="text-blue-400" />}
                {theme === 's1' && <FlatS1Icon size={18} className="text-emerald-400" />}
            </button>
        );
    }

    // ── Expanded Sidebar Mode: 3-Option Segmented Selector (Claro | Escuro | S1) ──
    return (
        <div className={cn("w-full select-none", className)}>
            <div className="flex items-center justify-between mb-1.5 px-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] opacity-80">
                    Tema
                </span>
                <span className="text-[10px] font-semibold text-primary capitalize">
                    {theme === 's1' ? 'S1 Híbrido' : theme === 'dark' ? 'Escuro' : 'Claro'}
                </span>
            </div>

            <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-semibold">
                {/* Claro */}
                <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={cn(
                        "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer",
                        theme === 'light'
                            ? "bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm font-bold scale-[1.02]"
                            : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/5"
                    )}
                    title="Modo Claro"
                >
                    <FlatSunIcon size={13} className={theme === 'light' ? "text-amber-500" : ""} />
                    <span>Claro</span>
                </button>

                {/* Escuro */}
                <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={cn(
                        "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer",
                        theme === 'dark'
                            ? "bg-slate-800 text-blue-400 shadow-sm font-bold scale-[1.02]"
                            : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/5"
                    )}
                    title="Modo Escuro"
                >
                    <FlatMoonIcon size={13} className={theme === 'dark' ? "text-blue-400" : ""} />
                    <span>Escuro</span>
                </button>

                {/* S1 */}
                <button
                    type="button"
                    onClick={() => setTheme('s1')}
                    className={cn(
                        "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer",
                        theme === 's1'
                            ? "bg-[#0F172A] text-emerald-400 shadow-sm font-bold scale-[1.02] border border-emerald-500/30"
                            : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/5"
                    )}
                    title="Tema S1: Conteúdo Claro com Barra Lateral Escura"
                >
                    <FlatS1Icon size={14} className={theme === 's1' ? "text-emerald-400" : ""} />
                    <span>S1</span>
                </button>
            </div>
        </div>
    );
};

export default ThemeSelector;
