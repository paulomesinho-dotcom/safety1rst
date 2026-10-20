
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

let db: any = null;

const initDB = async () => {
    if (db) return;
    try {
        // DEBUG: Check if file is accessible
        try {
            const check = await fetch(self.location.origin + '/sqlite3.wasm', { method: 'HEAD' });
            console.log('[Worker] WASM Check:', check.status, check.url);
        } catch (e) {
            console.error('[Worker] WASM Check Failed:', e);
        }

        const sqlite3 = await (sqlite3InitModule as any)({
            print: console.log,
            printErr: console.error,
            locateFile: (file: string) => {
                if (file.endsWith('.wasm')) {
                    const url = new URL('/sqlite3.wasm', self.location.origin).href;
                    console.log('[Worker] Loading WASM from:', url);
                    return url;
                }
                return file;
            }
        });

        if ('opfs' in sqlite3) {
            db = new sqlite3.oo1.OpfsDb('/safesite_db.sqlite3');
            console.log('[Worker] Opened OPFS database');
        } else {
            db = new sqlite3.oo1.DB('/safesite_db.sqlite3', 'ct');
            console.warn('[Worker] OPFS not available, using transient DB');
        }

        // Schema creation logic would ideally go here or be triggered
        // For simplicity, we'll expose a method to run arbitrary SQL
    } catch (err) {
        console.error('[Worker] Init Failed', err);
        throw err;
    }
};

self.onmessage = async (e: MessageEvent) => {
    const { id, type, sql, params } = e.data;

    try {
        if (!db) await initDB();

        if (type === 'exec') {
            const result: any[] = [];
            db.exec({
                sql: sql,
                bind: params,
                rowMode: 'object',
                callback: (row: any) => result.push(row)
            });
            self.postMessage({ id, result });
        } else if (type === 'init') {
            // Just explicit init if needed
            self.postMessage({ id, success: true });
        }
    } catch (error: any) {
        const msg = error?.message || String(error);
        if (!msg.includes('duplicate column name')) {
            console.error('[Worker] Error executing query', error);
        }
        self.postMessage({ id, error: msg });
    }
};
