'use client';

import React, { useTransition } from 'react';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/navigation';
import { cn } from '@/lib/utils';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher() {
    const router = useRouter();
    const pathname = usePathname();
    const locale = useLocale();
    const [isPending, startTransition] = useTransition();

    const switchLocale = (nextLocale: string) => {
        if (nextLocale === locale || isPending) return;
        startTransition(() => {
            router.replace(pathname, { locale: nextLocale });
        });
    };

    return (
        <div 
            className="inline-flex items-center p-0.5 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] shadow-sm select-none"
            role="group"
            aria-label="Selecionar Idioma"
        >
            <div className="pl-1.5 pr-1 text-[var(--text-muted)] flex items-center" title="Idioma">
                <Globe size={13} />
            </div>
            <button
                type="button"
                onClick={() => switchLocale('pt')}
                disabled={isPending}
                className={cn(
                    "px-2 py-1 rounded-md text-xs font-bold transition-all cursor-pointer",
                    locale === 'pt'
                        ? "bg-[var(--bg-card)] text-primary shadow-sm"
                        : "text-[var(--text-muted)] hover:text-[var(--text)]"
                )}
                title="Português (PT)"
            >
                PT
            </button>
            <button
                type="button"
                onClick={() => switchLocale('en')}
                disabled={isPending}
                className={cn(
                    "px-2 py-1 rounded-md text-xs font-bold transition-all cursor-pointer",
                    locale === 'en'
                        ? "bg-[var(--bg-card)] text-primary shadow-sm"
                        : "text-[var(--text-muted)] hover:text-[var(--text)]"
                )}
                title="English (EN)"
            >
                EN
            </button>
        </div>
    );
}
