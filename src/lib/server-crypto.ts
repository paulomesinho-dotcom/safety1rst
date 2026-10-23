import crypto from 'crypto';

/**
 * Server-Side Master Secret Encryption (AES-256-GCM)
 * Safely encrypts and decrypts CDE credentials (SharePoint, Dropbox, Google Drive)
 * so secrets are NEVER stored in plaintext in the database and NEVER leaked to the client.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const PREFIX = 'enc_v1';

function getMasterKey(): Buffer {
    const rawSecret = 
        process.env.ENCRYPTION_SECRET || 
        process.env.AUTH_SECRET || 
        process.env.NEXTAUTH_SECRET || 
        'safesite-aes-256-gcm-master-encryption-key-32b';
    return crypto.createHash('sha256').update(rawSecret).digest();
}

/**
 * Encrypts a sensitive string using AES-256-GCM.
 * Output format: enc_v1:iv_hex:auth_tag_hex:ciphertext_hex
 */
export function encryptSecret(plainText: string): string {
    if (!plainText || typeof plainText !== 'string') return '';
    if (plainText.startsWith(`${PREFIX}:`)) return plainText; // Already encrypted

    const key = getMasterKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return `${PREFIX}:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts a sensitive string previously encrypted with encryptSecret.
 * If the string was not encrypted (legacy plaintext), returns the string as-is.
 */
export function decryptSecret(cipherText?: string): string {
    if (!cipherText || typeof cipherText !== 'string') return '';
    if (!cipherText.startsWith(`${PREFIX}:`)) {
        return cipherText; // Return legacy plaintext as-is
    }

    try {
        const parts = cipherText.split(':');
        if (parts.length !== 4) return '';

        const [, ivHex, authTagHex, encryptedHex] = parts;
        const key = getMasterKey();
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (err) {
        console.error('[server-crypto] Decryption error:', err);
        return '';
    }
}

/**
 * Helper to produce a visual masked string for user interfaces.
 */
export function maskSecret(secret?: string): string {
    if (!secret || secret.trim().length === 0) return '';
    return '••••••••••••••••';
}

/**
 * Sanitizes CDE configuration for safe transmission to the client frontend.
 * Stuffs sensitive keys with boolean flags or masks, NEVER exposing plaintext tokens.
 */
export function sanitizeCdeConfig(config: any): any {
    if (!config || typeof config !== 'object') {
        return {
            connected: false,
            provider: null,
        };
    }

    return {
        provider: config.provider || null,
        connected: Boolean(config.connected),
        lastSync: config.lastSync || null,
        siteUrl: config.siteUrl || '',
        folderUrl: config.folderUrl || '',
        folderPath: config.folderPath || '',
        folderId: config.folderId || '',
        tenantId: config.tenantId || '',
        clientId: config.clientId || '',
        appKey: config.appKey || '',
        // Security Flags (Client knows it's configured without knowing secrets)
        hasClientSecret: Boolean(config.clientSecret),
        hasAppSecret: Boolean(config.appSecret),
        hasRefreshToken: Boolean(config.refreshToken),
        hasServiceAccountKey: Boolean(config.serviceAccountKey),
        // Masked placeholders for UI inputs
        clientSecretMasked: maskSecret(config.clientSecret),
        appSecretMasked: maskSecret(config.appSecret),
        serviceAccountKeyMasked: maskSecret(config.serviceAccountKey),
    };
}
