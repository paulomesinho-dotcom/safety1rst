'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTheme, type Theme } from '@/providers/ThemeProvider';
import { FlatSunIcon, FlatMoonIcon, FlatS1Icon } from '@/components/FlatIcons';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ThemeMenu() {
    const { theme, setTheme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    const themes: { id: Theme; label: string; desc: string; icon: React.ReactNode }[] = [
        {
            id: 'light',
            label: 'Claro',
            desc: 'Tema claro clássico',
            icon: <FlatSunIcon size={16} className="text-amber-500 shrink-0" />,
        },
        {
            id: 'dark',
            label: 'Escuro',
            desc: 'Tema escuro de alto contraste',
            icon: <FlatMoonIcon size={16} className="text-blue-400 shrink-0" />,
        },
        {
            id: 's1',
            label: 'S1 (Azul Petróleo)',
            desc: 'Workspace claro com barra lateral petróleo',
            icon: <FlatS1Icon size={16} className="shrink-0" />,
        },
    ];

    const currentThemeInfo = themes.find((t) => t.id === theme) || themes[0];

    return (
        <div className="relative inline-block text-left" ref={menuRef}>
            {/* Top Bar Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border)]",
                    "bg-[var(--bg-input)] hover:bg-[var(--bg-card)] text-[var(--text)] transition-all shadow-sm select-none cursor-pointer",
                    isOpen && "ring-2 ring-primary/40 border-primary"
                )}
                aria-expanded={isOpen}
                aria-haspopup="true"
                title="Alterar Tema da Aplicação"
            >
                <span className="flex items-center gap-1.5">
                    {currentThemeInfo.icon}
                    <span className="hidden sm:inline font-bold">{currentThemeInfo.label}</span>
                </span>
                <ChevronDown size={13} className={cn("text-[var(--text-muted)] transition-transform duration-200", isOpen && "rotate-180")} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div 
                    className="absolute right-0 mt-2 w-64 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-1.5 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150"
                    role="menu"
                >
                    <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border)] mb-1">
                        Selecionar Tema
                    </div>

                    <div className="space-y-0.5">
                        {themes.map((t) => {
                            const isSelected = theme === t.id;
                            return (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => {
                                        setTheme(t.id);
                                        setIsOpen(false);
                                    }}
                                    className={cn(
                                        "w-full flex items-center justify-between gap-3 px-2.5 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer",
                                        isSelected
                                            ? "bg-primary/10 text-primary font-bold"
                                            : "text-[var(--text)] hover:bg-[var(--bg-input)]"
                                    )}
                                    role="menuitem"
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className={cn(
                                            "w-7 h-7 rounded-md flex items-center justify-center shrink-0 border",
                                            isSelected 
                                                ? "border-primary/30 bg-primary/15" 
                                                : "border-[var(--border)] bg-[var(--bg-input)]"
                                        )}>
                                            {t.icon}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-semibold text-xs leading-tight truncate">
                                                {t.label}
                                            </div>
                                            <div className="text-[10px] text-[var(--text-muted)] truncate">
                                                {t.desc}
                                            </div>
                                        </div>
                                    </div>

                                    {isSelected && (
                                        <Check size={14} className="text-primary shrink-0 ml-1" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

export default ThemeMenu;
