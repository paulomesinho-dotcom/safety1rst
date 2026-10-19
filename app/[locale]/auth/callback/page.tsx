'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
    // Use state to avoid hydration mismatch — window values are only available client-side
    const [debugInfo, setDebugInfo] = useState<{
        href: string;
        opener: string;
        hash: string;
        query: string;
    } | null>(null);

    useEffect(() => {
        // Capture debug info on the client only
        setDebugInfo({
            href: window.location.href,
            opener: window.opener ? 'CONNECTED' : 'MISSING (Orphaned)',
            hash: window.location.hash,
            query: window.location.search,
        });

        // Parse hash parameters (Implicit flow - access_token in hash)
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const error = params.get('error');

        if (accessToken) {
            if (window.opener) {
                console.log('Sending Success Message to Opener');
                window.opener.postMessage({ type: 'SAFE_SITE_OAUTH_SUCCESS', accessToken }, window.location.origin);
                setTimeout(() => window.close(), 500);
            } else {
                alert('CRITICAL: window.opener is missing. Cannot send token back.');
            }
        } else if (error) {
            if (window.opener) {
                window.opener.postMessage({ type: 'SAFE_SITE_OAUTH_ERROR', error }, window.location.origin);
                window.close();
            }
        }

        // Dropbox Code Flow (Authorization Code - query param)
        const queryParams = new URLSearchParams(window.location.search);
        const code = queryParams.get('code');
        if (code) {
            if (window.opener) {
                console.log('Sending Dropbox Code to Opener');
                window.opener.postMessage({ type: 'SAFE_SITE_DROPBOX_CODE', code }, window.location.origin);
                setTimeout(() => window.close(), 500);
            }
        }
    }, []);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-[#131314]">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
            <p className="text-gray-500 font-medium">Authenticating...</p>
            <p className="text-gray-400 text-sm mt-2">You can close this window if it doesn't close automatically.</p>

            {/* DEBUG — only rendered client-side to avoid hydration mismatch */}
            {debugInfo && (
                <div className="mt-4 p-4 bg-white dark:bg-surface rounded shadow-sm border max-w-md w-full break-all text-xs">
                    <p className="font-bold">Debug Info:</p>
                    <p className="mb-2"><strong>Full URL:</strong> {debugInfo.href}</p>
                    <p className="mb-2"><strong>Opener Status:</strong> {debugInfo.opener}</p>
                    <p><strong>Hash:</strong> {debugInfo.hash}</p>
                    <p><strong>Query:</strong> {debugInfo.query}</p>
                </div>
            )}
        </div>
    );
}
