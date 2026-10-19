'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useStore } from '@/store/useStore';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const { currentUser } = useStore();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!currentUser) {
            // Determine locale from current pathname prefix (e.g. /pt/ or /en/)
            const localePrefix = pathname?.split('/')[1] || 'pt';
            const validLocales = ['pt', 'en'];
            const locale = validLocales.includes(localePrefix) ? localePrefix : 'pt';
            router.push(`/${locale}/login`);
        }
    }, [currentUser, router, pathname]);

    if (!currentUser) {
        return null; // Don't render protected content
    }

    return <>{children}</>;
}
