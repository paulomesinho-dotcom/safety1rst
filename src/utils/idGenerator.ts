import { customAlphabet } from 'nanoid';

// Alphabet with letters, numbers, and safe special characters
// Avoiding characters that might break URL encodings if not careful, but user asked for special chars.
const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%&*';

export const generateSecureId = (size: number = 24) => {
    const nanoid = customAlphabet(alphabet, size);
    return nanoid();
};
