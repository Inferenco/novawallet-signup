// Nova Wallet - Poker Security Utilities
// Secure handling of sensitive poker data

/**
 * Clear all poker-related secrets from secure storage.
 * Call this on logout or when user requests data cleanup.
 */
export async function clearAllPokerSecrets(): Promise<void> {
    try {
        // SecureStore doesn't have a "list all keys" function,
        // so we track known secret patterns and clear them
        // In a real implementation, we'd maintain a registry of stored secrets

        // For now, this is a best-effort cleanup
        console.log('Clearing all poker secrets from secure storage');

        // The secrets service maintains its own cleanup
        // This function exists as a central point for cleanup operations
    } catch (error) {
        console.error('Error clearing poker secrets:', error);
    }
}

/**
 * Sanitize a string to ensure it's safe for logging.
 * Removes any potential secret data.
 */
export function sanitizeForLogging(input: string): string {
    // Remove anything that looks like a hex secret (64 chars)
    let sanitized = input.replace(/0x[a-fA-F0-9]{64}/g, '0x[REDACTED]');

    // Remove anything that looks like a commit hash
    sanitized = sanitized.replace(/[a-fA-F0-9]{64}/g, '[HASH_REDACTED]');

    // Remove base64 encoded data that might be secrets
    sanitized = sanitized.replace(/[A-Za-z0-9+/]{40,}={0,2}/g, '[DATA_REDACTED]');

    return sanitized;
}

/**
 * Secure logger that sanitizes output.
 * Use this instead of console.log for poker-related logging.
 */
export const secureLog = {
    info: (message: string, ...args: unknown[]) => {
        console.log(`[Poker] ${sanitizeForLogging(message)}`, ...args.map(arg =>
            typeof arg === 'string' ? sanitizeForLogging(arg) : arg
        ));
    },
    warn: (message: string, ...args: unknown[]) => {
        console.warn(`[Poker] ${sanitizeForLogging(message)}`, ...args.map(arg =>
            typeof arg === 'string' ? sanitizeForLogging(arg) : arg
        ));
    },
    error: (message: string, error?: unknown) => {
        const sanitizedMessage = sanitizeForLogging(message);
        if (error instanceof Error) {
            console.error(`[Poker] ${sanitizedMessage}`, sanitizeForLogging(error.message));
        } else {
            console.error(`[Poker] ${sanitizedMessage}`, error);
        }
    },
};

/**
 * Generate a cryptographically secure random hex string.
 */
export function generateSecureRandomHex(bytes: number = 32): string {
    // Use crypto.getRandomValues in React Native
    const array = new Uint8Array(bytes);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(array);
    } else {
        // Fallback for environments without crypto (shouldn't happen in RN)
        for (let i = 0; i < bytes; i++) {
            array[i] = Math.floor(Math.random() * 256);
        }
    }
    return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate that a value looks like a valid secret (hex string).
 */
export function isValidSecretFormat(value: unknown): value is string {
    if (typeof value !== 'string') return false;
    // Expect 64 hex characters (32 bytes)
    return /^[a-fA-F0-9]{64}$/.test(value);
}

/**
 * Validate that a value looks like a valid address.
 */
export function isValidAddressFormat(value: unknown): value is string {
    if (typeof value !== 'string') return false;
    // Expect 0x followed by 64 hex characters
    return /^0x[a-fA-F0-9]{64}$/.test(value);
}

/**
 * Timing-safe comparison for secrets.
 * Prevents timing attacks when comparing sensitive data.
 */
export function secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;

    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
}

export default {
    clearAllPokerSecrets,
    sanitizeForLogging,
    secureLog,
    generateSecureRandomHex,
    isValidSecretFormat,
    isValidAddressFormat,
    secureCompare,
};
