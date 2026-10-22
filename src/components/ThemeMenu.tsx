'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTheme, type Theme } from '@/providers/ThemeProvider';
import { FlatSunIcon, FlatMoonIcon, FlatS1Icon } from '@/components/FlatIcons';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ThemeMenu() {
    const { theme, setTheme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click or Escape
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

    const themes: { id: Theme; label: string; icon: React.ReactNode }[] = [
        {
            id: 'light',
            label: 'Claro',
            icon: <FlatSunIcon size={16} className="text-amber-500" />,
        },
        {
            id: 'dark',
            label: 'Escuro',
            icon: <FlatMoonIcon size={16} className="text-blue-400" />,
        },
        {
            id: 's1',
            label: 'S1 (Barra Cinza)',
            icon: <FlatS1Icon size={18} className="text-slate-600 dark:text-slate-300" />,
        },
    ];

    const currentThemeInfo = themes.find((t) => t.id === theme) || themes[0];

    return (
        <div className="relative inline-block text-left" ref={menuRef}>
            {/* Top Bar Trigger Button: APENAS o ícone visível na faixa */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center border border-[var(--border)]",
                    "bg-[var(--bg-input)] hover:bg-[var(--bg-card)] text-[var(--text)] transition-all shadow-sm select-none cursor-pointer",
                    isOpen && "ring-2 ring-primary/40 border-primary"
                )}
                aria-expanded={isOpen}
                aria-haspopup="true"
                title={`Tema: ${currentThemeInfo.label} (clique para escolher)`}
                aria-label={`Tema atual: ${currentThemeInfo.label}`}
            >
                {currentThemeInfo.icon}
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div 
                    className="absolute right-0 mt-2 w-48 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-1.5 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150"
                    role="menu"
                >
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border)] mb-1">
                        Tema
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
                                        "w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer",
                                        isSelected
                                            ? "bg-primary/10 text-primary font-bold"
                                            : "text-[var(--text)] hover:bg-[var(--bg-input)]"
                                    )}
                                    role="menuitem"
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-5 h-5 flex items-center justify-center shrink-0">
                                            {t.icon}
                                        </div>
                                        <span className="truncate text-xs">{t.label}</span>
                                    </div>

                                    {isSelected && (
                                        <Check size={14} className="text-primary shrink-0" />
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
