'use client';

import React, { useState, useRef, useEffect, useTransition } from 'react';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/navigation';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export default function LanguageSwitcher() {
    const router = useRouter();
    const pathname = usePathname();
    const locale = useLocale();
    const [isPending, startTransition] = useTransition();
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

    const switchLocale = (nextLocale: string) => {
        setIsOpen(false);
        if (nextLocale === locale || isPending) return;
        startTransition(() => {
            router.replace(pathname, { locale: nextLocale });
        });
    };

    const languages = [
        { code: 'pt', label: 'Português', short: 'PT' },
        { code: 'en', label: 'English', short: 'EN' },
    ];

    const currentLang = languages.find((l) => l.code === locale) || languages[0];

    return (
        <div className="relative inline-block text-left" ref={menuRef}>
            {/* Top Bar Trigger Button: APENAS a letra do idioma visível na faixa */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                disabled={isPending}
                className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center border border-[var(--border)]",
                    "bg-[var(--bg-input)] hover:bg-[var(--bg-card)] text-[var(--text)] transition-all shadow-sm select-none cursor-pointer",
                    "text-xs font-bold tracking-wider uppercase",
                    isOpen && "ring-2 ring-primary/40 border-primary",
                    isPending && "opacity-60 cursor-wait"
                )}
                aria-expanded={isOpen}
                aria-haspopup="true"
                title={`Idioma: ${currentLang.label} (clique para alterar)`}
                aria-label={`Idioma atual: ${currentLang.label}`}
            >
                {currentLang.short}
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div 
                    className="absolute right-0 mt-2 w-40 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-1.5 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150"
                    role="menu"
                >
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border)] mb-1">
                        Idioma
                    </div>

                    <div className="space-y-0.5">
                        {languages.map((l) => {
                            const isSelected = locale === l.code;
                            return (
                                <button
                                    key={l.code}
                                    type="button"
                                    onClick={() => switchLocale(l.code)}
                                    className={cn(
                                        "w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer",
                                        isSelected
                                            ? "bg-primary/10 text-primary font-bold"
                                            : "text-[var(--text)] hover:bg-[var(--bg-input)]"
                                    )}
                                    role="menuitem"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono font-bold text-xs">{l.short}</span>
                                        <span className="text-xs">{l.label}</span>
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
