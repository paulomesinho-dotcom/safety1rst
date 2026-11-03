// SafeSite CDE Local Persistent Storage (IndexedDB)
// Stores real Blobs, PDFs and IFC files locally so they never disappear on refresh,
// even when not connected to an external cloud provider (OneDrive/GDrive/Dropbox).

const DB_NAME = 'safesite_cde_storage';
const DB_VERSION = 1;
const STORE_NAME = 'cde_files';

interface StoredCdeFile {
    id: string;
    projectId: string;
    subProjectId?: string;
    folderPath: string; // e.g., '02-Desenhos 2D (Plantas)/WIP'
    fileName: string;
    blob: Blob;
    dataUrl?: string;
    mimeType: string;
    size: number;
    updatedAt: string;
}

let dbInstance: IDBDatabase | null = null;

async function getDB(): Promise<IDBDatabase> {
    if (dbInstance) return dbInstance;
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !window.indexedDB) {
            reject(new Error('IndexedDB not supported'));
            return;
        }
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (e) => {
            const db = (e.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('projectId', 'projectId', { unique: false });
                store.createIndex('folderPath', 'folderPath', { unique: false });
            }
        };
        request.onsuccess = () => {
            dbInstance = request.result;
            resolve(dbInstance);
        };
        request.onerror = () => reject(request.error);
    });
}

/**
 * Save a CDE File (PDF or IFC) locally in IndexedDB
 */
export async function saveCdeFileLocally(file: StoredCdeFile): Promise<void> {
    try {
        const db = await getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.put(file);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    } catch (err) {
        console.warn('[CDE Storage] IndexedDB save fallback:', err);
    }
}

/**
 * Get a single CDE file by ID
 */
export async function getCdeFileLocally(id: string): Promise<StoredCdeFile | null> {
    try {
        const db = await getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.get(id);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
        });
    } catch (err) {
        console.warn('[CDE Storage] IndexedDB get fallback:', err);
        return null;
    }
}

/**
 * Get all CDE files for a project
 */
export async function getAllProjectCdeFilesLocally(projectId: string): Promise<StoredCdeFile[]> {
    try {
        const db = await getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const index = store.index('projectId');
            const req = index.getAll(projectId);
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(req.error);
        });
    } catch (err) {
        console.warn('[CDE Storage] IndexedDB getAll fallback:', err);
        return [];
    }
}

/**
 * Delete a CDE file locally
 */
export async function deleteCdeFileLocally(id: string): Promise<void> {
    try {
        const db = await getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.delete(id);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    } catch (err) {
        console.warn('[CDE Storage] IndexedDB delete fallback:', err);
    }
}
