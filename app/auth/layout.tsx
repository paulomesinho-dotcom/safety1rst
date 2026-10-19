import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Authenticating...',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
