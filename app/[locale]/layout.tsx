import type { Metadata } from 'next';
import { Outfit, Inter } from 'next/font/google';
import '../globals.css';
import RootClientWrapper from '@/components/RootClientWrapper';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { ThemeProvider } from '@/providers/ThemeProvider';

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
    title: {
        template: '%s | SafetyFirst',
        default: 'SafetyFirst',
    },
    description: 'Construction Safety Management Platform',
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
            <body className={`${outfit.variable} ${inter.variable} font-sans`} suppressHydrationWarning>
                <NextIntlClientProvider locale={locale} messages={messages}>
                    <ThemeProvider defaultTheme="system">
                        <RootClientWrapper>
                            {children}
                        </RootClientWrapper>
                    </ThemeProvider>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
