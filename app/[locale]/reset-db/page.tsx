"use client";

import { useEffect, useState } from 'react';
import { executeQuery } from '@/lib/db';
import { useRouter } from 'next/navigation';

export default function ResetDbPage() {
    const [status, setStatus] = useState('idle');
    const [log, setLog] = useState<string[]>([]);
    const router = useRouter();

    const addLog = (msg: string) => setLog(prev => [...prev, msg]);

    const handleReset = async () => {
        setStatus('running');
        addLog('Starting cleanup...');

        try {
            // 1. Clear LocalStorage and SessionStorage
            localStorage.clear();
            sessionStorage.clear();
            addLog('✅ LocalStorage and SessionStorage cleared.');

            // 2. Drop all tables in SQLite
            addLog('Fetching tables...');
            const tables = await executeQuery("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");

            if (tables.length === 0) {
                addLog('⚠️ No tables found or DB not initialized.');
            } else {
                for (const table of tables) {
                    addLog(`Dropping table: ${table.name}...`);
                    await executeQuery(`DROP TABLE IF EXISTS ${table.name}`);
                }
                addLog('✅ All tables dropped.');
            }

            // 3. Delete arbitrary IndexedDBs (if any exist outside of SQLite WASM scope, though SQLite WASM usually uses OPFS or IDB)
            // We'll leave this to the browser clear mostly, but we can try clearing specific ones if we knew them.
            // For now, dropping tables is the most effective way to reset the SQL state.

            setStatus('done');
            addLog('✨ Database cleared successfully!');
            addLog('Redirecting to login in 3 seconds...');

            setTimeout(() => {
                window.location.href = '/pt/login'; // Force reload to re-init DB
            }, 3000);

        } catch (error: any) {
            console.error(error);
            addLog(`❌ Error: ${error.message}`);
            setStatus('error');
        }
    };

    return (
        <div className="p-8 max-w-2xl mx-auto font-sans">
            <h1 className="text-2xl font-bold text-red-600 mb-4">⚠️ Danger Zone: Clear Database</h1>
            <p className="mb-6 text-gray-700 dark:text-gray-200">
                This action will delete <strong>ALL DATA</strong> stored in the browser's database (SQLite) and LocalStorage.
                This cannot be undone.
            </p>

            {status === 'idle' && (
                <button
                    onClick={handleReset}
                    className="px-6 py-3 bg-red-600 text-white font-bold rounded hover:bg-red-700 transition"
                >
                    DELETE EVERYTHING
                </button>
            )}

            {status === 'running' && (
                <div className="text-primary font-bold animate-pulse">
                    Cleaning up...
                </div>
            )}

            {status === 'done' && (
                <div className="text-green-600 font-bold">
                    Done! Redirecting...
                </div>
            )}

            <div className="mt-8 p-4 bg-gray-100 dark:bg-surface rounded border border-gray-300 dark:border-[#444746] font-mono text-sm min-h-[200px] overflow-auto">
                {log.map((l, i) => (
                    <div key={i}>{l}</div>
                ))}
            </div>
        </div>
    );
}
