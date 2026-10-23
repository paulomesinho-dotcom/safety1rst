'use client';

import { useEffect, useState, useRef } from 'react';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useStore } from '@/store/useStore';

const PENDING_KEY = 'safesite_oauth_pending';
const RESULT_KEY = 'safesite_oauth_result';

export default function AuthCallback() {
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');
    const updateProjectCDE = useStore(state => state.updateProjectCDE);
    // Prevent double execution in strict mode
    const hasRun = useRef(false);

    useEffect(() => {
        if (hasRun.current) return;
        hasRun.current = true;

        const run = async () => {
            // --- Google Drive: implicit flow (token in hash) ---
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            const accessToken = hashParams.get('access_token');
            if (accessToken) {
                localStorage.setItem(RESULT_KEY, JSON.stringify({ type: 'gdrive_token', accessToken }));
                setStatus('success');
                setMessage('Google Drive connected!');
                // Let storage event reach the opener tab, then go back
                setTimeout(() => history.back(), 800);
                return;
            }

            // --- Dropbox: authorization code flow (?code=...) ---
            const code = new URLSearchParams(window.location.search).get('code');
            if (!code) {
                setStatus('error');
                setMessage('No authorization code received.');
                return;
            }

            // Read pending OAuth config stored before redirect
            const pendingRaw = localStorage.getItem(PENDING_KEY);
            if (!pendingRaw) {
                // Fallback: just store code for storage-event listeners
                localStorage.setItem(RESULT_KEY, JSON.stringify({ type: 'dropbox_code', code }));
                setStatus('success');
                setMessage('Connected! You can safely close this window or return to the app.');
                // Try to close if it's a popup, otherwise navigate to home to break any loops
                setTimeout(() => {
                    try { window.close(); } catch (_) { }
                    if (!window.closed) {
                        window.location.href = '/';
                    }
                }, 1500);
                return;
            }

            const pending = JSON.parse(pendingRaw);
            localStorage.removeItem(PENDING_KEY);

            try {
                // Exchange code for token directly from callback page
                const res = await fetch('/api/integration/dropbox', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'exchange',
                        code,
                        appKey: pending.appKey,
                        appSecret: pending.appSecret,
                        redirectUri: window.location.origin + '/auth/callback'
                    })
                });

                if (!res.ok) throw new Error(await res.text());
                const tokenData = await res.json();

                // Persist securely to backend with AES-256-GCM encryption
                let sanitizedCdeConfig = null;
                if (pending.projectId) {
                    try {
                        const setupRes = await fetch(`/api/projects/${pending.projectId}/cde/setup`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                provider: 'dropbox',
                                connected: true,
                                appKey: pending.appKey,
                                appSecret: pending.appSecret,
                                accessToken: tokenData.access_token,
                                refreshToken: tokenData.refresh_token,
                                folderPath: pending.folderPath
                            })
                        });
                        if (setupRes.ok) {
                            const setupData = await setupRes.json();
                            sanitizedCdeConfig = setupData.cdeConfig;
                        }
                    } catch (setupErr) {
                        console.error('Failed to save encrypted CDE credentials on server:', setupErr);
                    }

                    // Apply sanitized setting to Zustand store (no plaintext secrets exposed)
                    updateProjectCDE(pending.projectId, sanitizedCdeConfig || {
                        ...pending.cdeConfig,
                        provider: 'dropbox',
                        connected: true,
                        lastSync: new Date().toISOString(),
                        appKey: pending.appKey,
                        hasAppSecret: true,
                        appSecretMasked: '••••••••••••••••',
                        hasRefreshToken: !!tokenData.refresh_token,
                        folderPath: pending.folderPath
                    });
                }

                // Also trigger storage event backwards-compatibility
                localStorage.setItem(RESULT_KEY, JSON.stringify({
                    type: 'dropbox_connected',
                    projectId: pending.projectId,
                    appKey: pending.appKey,
                    folderPath: pending.folderPath,
                    connected: true
                }));

                setStatus('success');
                setMessage('Dropbox connected! Redirecting...');

                // Redirect back to the app page the user was on
                setTimeout(() => {
                    window.location.href = pending.returnUrl || '/';
                }, 1000);

            } catch (err: any) {
                setStatus('error');
                setMessage('Authentication failed: ' + err.message);
            }
        };

        run();
    }, []);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
            {status === 'loading' && (
                <>
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                    <p className="text-gray-600 font-medium">Connecting to Dropbox...</p>
                </>
            )}
            {status === 'success' && (
                <>
                    <CheckCircle2 className="w-12 h-12 text-green-500 mb-4" />
                    <p className="text-gray-800 font-semibold text-xl">Connected!</p>
                    <p className="text-gray-400 text-sm mt-1">{message}</p>
                </>
            )}
            {status === 'error' && (
                <>
                    <XCircle className="w-12 h-12 text-red-500 mb-4" />
                    <p className="text-gray-800 font-semibold">Connection Failed</p>
                    <p className="text-red-400 text-sm mt-1">{message}</p>
                    <button
                        onClick={() => history.back()}
                        className="mt-4 px-4 py-2 bg-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-300"
                    >
                        Go Back
                    </button>
                </>
            )}
        </div>
    );
}
