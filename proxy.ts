import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import createIntlMiddleware from 'next-intl/middleware';

const intlMiddleware = createIntlMiddleware({
    locales: ['en', 'pt'],
    defaultLocale: 'pt',
});

// Rotas públicas (não precisam de autenticação)
const PUBLIC_PATHS = [
    '/pt/login',
    '/en/login',
    '/pt/register',
    '/en/register',
    '/api/auth',
    '/auth/callback',
];

function isPublicPath(pathname: string): boolean {
    return PUBLIC_PATHS.some(
        (p) => pathname === p || pathname.startsWith(p + '/')
    );
}

export default async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Ignorar assets estáticos e API routes internas
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api/auth') ||
        pathname.startsWith('/auth/callback') ||
        pathname.includes('.')
    ) {
        return NextResponse.next();
    }

    // Modo demo em desenvolvimento: sem verificação de sessão (login mock)
    if (process.env.NODE_ENV === 'development') {
        return intlMiddleware(request);
    }

    // Verificar autenticação
    const session = await auth();

    // Redirigir para login se não autenticado e rota não é pública
    if (!session && !isPublicPath(pathname)) {
        const loginUrl = new URL('/pt/login', request.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Utilizador autenticado a tentar aceder ao login → redirigir para home
    if (session && (pathname === '/pt/login' || pathname === '/en/login' || pathname === '/')) {
        return NextResponse.redirect(new URL('/pt', request.url));
    }

    // Utilizador sem tenant → redirigir para onboarding (excepto se já lá está)
    if (session && !(session.user as any).tenantId) {
        const onboardingPath = '/pt/onboarding';
        if (!pathname.startsWith(onboardingPath) && !isPublicPath(pathname)) {
            return NextResponse.redirect(new URL(onboardingPath, request.url));
        }
    }

    // Aplicar i18n routing
    return intlMiddleware(request);
}

export const config = {
    matcher: ['/((?!api|_next|_vercel|auth/callback|.*\\..*).*)', '/'],
};
