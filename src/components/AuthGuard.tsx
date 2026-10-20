'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useStore } from '@/store/useStore';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const currentUser = useStore(state => state.currentUser);
    const isInitialized = useStore(state => state.isInitialized);
    const router = useRouter();
    const pathname = usePathname();
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        setHasMounted(true);
    }, []);

    useEffect(() => {
        // Aguardar que o componente monte no cliente e que a base de dados/store inicializem
        if (!hasMounted || !isInitialized) {
            return;
        }

        // Se após inicialização não houver utilizador com sessão iniciada, redirecionar
        if (!currentUser) {
            const localePrefix = pathname?.split('/')[1] || 'pt';
            const validLocales = ['pt', 'en'];
            const locale = validLocales.includes(localePrefix) ? localePrefix : 'pt';
            router.push(`/${locale}/login`);
        }
    }, [currentUser, isInitialized, hasMounted, router, pathname]);

    // Mostrar ecrã de carregamento suave enquanto a store/sessão está a hidratar
    if (!hasMounted || !isInitialized) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs text-muted-foreground animate-pulse">A carregar sessão...</p>
                </div>
            </div>
        );
    }

    if (!currentUser) {
        return null;
    }

    return <>{children}</>;
}

