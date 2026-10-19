import { NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';

const intlMiddleware = createIntlMiddleware({
    locales: ['en', 'pt'],
    defaultLocale: 'pt',
});

export default async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Ignorar assets estáticos e API routes internas
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api/') ||
        pathname.startsWith('/auth/callback') ||
        pathname.includes('.')
    ) {
        return NextResponse.next();
    }

    // Aplicar i18n routing (AuthGuard gere a proteção de sessão nas páginas protegidas)
    return intlMiddleware(request);
}

export const config = {
    matcher: ['/((?!api|_next|_vercel|auth/callback|.*\\..*).*)', '/'],
};
