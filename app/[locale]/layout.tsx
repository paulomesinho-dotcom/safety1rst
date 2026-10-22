import type { Metadata, Viewport } from 'next';
import { Outfit, Inter } from 'next/font/google';
import '../globals.css';
import RootClientWrapper from '@/components/RootClientWrapper';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { ThemeProvider } from '@/providers/ThemeProvider';
import PwaRegister from '@/components/PwaRegister';

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const viewport: Viewport = {
    themeColor: '#0F172A',
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
};

export const metadata: Metadata = {
    title: {
        template: '%s | Safety1irst',
        default: 'Safety1irst',
    },
    description: 'Plataforma de Gestão de SHST e Conformidade em Obras',
    manifest: '/manifest.json',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'Safety1irst',
    },
    icons: {
        icon: '/safetyfirst-logo.png',
        apple: '/apple-touch-icon.png',
    },
};

export default async function RootLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    // Receive messages from the server
    const messages = await getMessages();

    return (
        <html lang={locale} suppressHydrationWarning>
            <head>
                <link rel="manifest" href="/manifest.json" />
                <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" />
            </head>
            <body className={`${outfit.variable} ${inter.variable} font-sans`} suppressHydrationWarning>
                <NextIntlClientProvider locale={locale} messages={messages}>
                    <ThemeProvider defaultTheme="dark">
                        <RootClientWrapper>
                            {children}
                        </RootClientWrapper>
                        <PwaRegister />
                    </ThemeProvider>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
