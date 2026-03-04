// Nova Wallet - Commit/Reveal Hook
// Handles the cryptographic commit-reveal flow for card dealing

import { useState, useCallback } from 'react';
import type { GameSigner } from "../../types";
import type { NetworkType } from '../../utils/constants';
import { generateSecret, createCommitHash } from '../../utils/poker/cardCrypto';
import { storeSecret, getSecret, clearSecret } from '../../services/poker/secrets';
import { submitCommit, revealSecret } from '../../services/poker/actions';

export type CommitRevealStatus =
    | 'idle'
    | 'generating'
    | 'committing'
    | 'committed'
    | 'revealing'
    | 'revealed'
    | 'error';

interface UseCommitRevealOptions {
    network: NetworkType;
    tableAddress: string;
    playerAddress: string;
    handNumber: number;
}

interface UseCommitRevealReturn {
    status: CommitRevealStatus;
    error: string | null;

    // Actions
    commit: (account: GameSigner) => Promise<boolean>;
    reveal: (account: GameSigner) => Promise<boolean>;

    // Helpers
    hasStoredSecret: () => Promise<boolean>;
    clearStoredSecret: () => Promise<void>;
}

export function useCommitReveal({
    network,
    tableAddress,
    playerAddress,
    handNumber,
}: UseCommitRevealOptions): UseCommitRevealReturn {
    const [status, setStatus] = useState<CommitRevealStatus>('idle');
    const [error, setError] = useState<string | null>(null);

    /**
     * Generate a secret, store it securely, and submit the commit hash.
     */
    const commit = useCallback(async (account: GameSigner): Promise<boolean> => {
        if (!network || !tableAddress || !playerAddress || !handNumber) {
            setError('Missing required parameters');
            return false;
        }

        try {
            setError(null);

            let secret = await getSecret(network, tableAddress, playerAddress, handNumber);
            if (!secret) {
                setStatus('generating');
                // Generate a new random secret
                secret = generateSecret();
                // Store it securely BEFORE submitting to chain
                await storeSecret(network, tableAddress, playerAddress, handNumber, secret);
                console.log('[CommitReveal] Secret stored for hand:', handNumber, 'table:', tableAddress.slice(0, 10) + '...');
            } else {
                console.log('[CommitReveal] Existing secret found for hand:', handNumber);
            }

            // Create the commit hash
            const commitHash = createCommitHash(secret);

            setStatus('committing');

            // Submit to chain
            const result = await submitCommit(network, account, tableAddress, commitHash);

            if (result.success) {
                setStatus('committed');
                return true;
            } else {
                setError('Commit transaction failed');
                setStatus('error');
                return false;
            }
        } catch (err) {
            console.error('Commit failed:', err);
            setError(err instanceof Error ? err.message : 'Commit failed');
            setStatus('error');
            return false;
        }
    }, [network, tableAddress, playerAddress, handNumber]);

    /**
     * Retrieve the stored secret and submit the reveal.
     */
    const reveal = useCallback(async (account: GameSigner): Promise<boolean> => {
        if (!network || !tableAddress || !playerAddress || !handNumber) {
            setError('Missing required parameters');
            return false;
        }

        try {
            setStatus('revealing');
            setError(null);

            // Retrieve the stored secret
            const secret = await getSecret(network, tableAddress, playerAddress, handNumber);

            if (!secret) {
                setError('No secret found - did you commit?');
                setStatus('error');
                return false;
            }

            // Submit the reveal
            const result = await revealSecret(network, account, tableAddress, secret);

            if (result.success) {
                setStatus('revealed');
                return true;
            } else {
                setError('Reveal transaction failed');
                setStatus('error');
                return false;
            }
        } catch (err) {
            console.error('Reveal failed:', err);
            setError(err instanceof Error ? err.message : 'Reveal failed');
            setStatus('error');
            return false;
        }
    }, [network, tableAddress, playerAddress, handNumber]);

    /**
     * Check if we have a stored secret for this hand.
     */
    const hasStoredSecret = useCallback(async (): Promise<boolean> => {
        const secret = await getSecret(network, tableAddress, playerAddress, handNumber);
        return secret !== null;
    }, [network, tableAddress, playerAddress, handNumber]);

    /**
     * Clear stored secret (for cleanup).
     */
    const clearStoredSecret = useCallback(async (): Promise<void> => {
        await clearSecret(network, tableAddress, playerAddress, handNumber);
    }, [network, tableAddress, playerAddress, handNumber]);

    return {
        status,
        error,
        commit,
        reveal,
        hasStoredSecret,
        clearStoredSecret,
    };
}

export default useCommitReveal;
