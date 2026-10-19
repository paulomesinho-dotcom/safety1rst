'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/navigation';
import { useTransition } from 'react';
import { cn } from '@/lib/utils';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher() {
    const router = useRouter();
    const pathname = usePathname();
    const locale = useLocale();
    const [isPending, startTransition] = useTransition();

    const onSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const nextLocale = e.target.value;
        startTransition(() => {
            router.replace(pathname, { locale: nextLocale });
        });
    };

    return (
        <div className="flex items-center gap-2">
            <Globe size={16} className="text-gray-500" />
            <select
                defaultValue={locale}
                disabled={isPending}
                onChange={onSelectChange}
                className={cn(
                    "bg-transparent text-sm text-gray-700 dark:text-gray-200 font-medium outline-none cursor-pointer hover:text-gray-900 dark:hover:text-white transition-colors",
                    isPending && "opacity-50"
                )}
            >
                <option value="pt">Português</option>
                <option value="en">English</option>
            </select>
        </div>
    );
}
