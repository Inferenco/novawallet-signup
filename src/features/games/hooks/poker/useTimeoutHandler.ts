// Nova Wallet - Timeout Handler Hook
// Handles timeout detection and action

import { useState, useCallback, useEffect } from 'react';
import type { GameSigner } from "../../types";
import type { NetworkType } from '../../utils/constants';
import { handleTimeout } from '../../services/poker/actions';
import { usePokerTableStore } from '../../stores/poker/table';

interface UseTimeoutHandlerOptions {
    network: NetworkType;
    tableAddress: string;
    onTimeoutCalled?: () => void;
}

interface UseTimeoutHandlerReturn {
    // State
    isTimedOut: boolean;
    remainingSeconds: number;
    canCallTimeout: boolean;
    isPending: boolean;
    error: string | null;

    // Actions
    callTimeout: (account: GameSigner) => Promise<boolean>;

    // Helpers
    clearError: () => void;
}

export function useTimeoutHandler({
    network,
    tableAddress,
    onTimeoutCalled,
}: UseTimeoutHandlerOptions): UseTimeoutHandlerReturn {
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [remainingSeconds, setRemainingSeconds] = useState(0);

    const { actionInfo, commitDeadline, revealDeadline, phase } = usePokerTableStore();

    // Calculate remaining time based on phase
    useEffect(() => {
        const calculateRemaining = () => {
            const now = Date.now() / 1000;
            let deadline = 0;

            // During betting phases, use actionInfo deadline
            if (actionInfo?.deadline && actionInfo.deadline > 0) {
                deadline = actionInfo.deadline;
            }
            // During commit phase
            else if (phase === 1 && commitDeadline > 0) { // GAME_PHASES.COMMIT
                deadline = commitDeadline;
            }
            // During reveal phase
            else if (phase === 2 && revealDeadline > 0) { // GAME_PHASES.REVEAL
                deadline = revealDeadline;
            }

            const remaining = Math.max(0, deadline - now);
            setRemainingSeconds(Math.floor(remaining));
        };

        calculateRemaining();
        const interval = setInterval(calculateRemaining, 1000);

        return () => clearInterval(interval);
    }, [actionInfo, commitDeadline, revealDeadline, phase]);

    const isTimedOut = remainingSeconds === 0 && (
        (actionInfo?.deadline && actionInfo.deadline > 0) ||
        (commitDeadline > 0) ||
        (revealDeadline > 0)
    );

    const canCallTimeout = isTimedOut && !isPending;

    const callTimeout = useCallback(async (account: GameSigner): Promise<boolean> => {
        if (!canCallTimeout) {
            return false;
        }

        try {
            setIsPending(true);
            setError(null);

            const result = await handleTimeout(network, account, tableAddress);

            if (result.success) {
                onTimeoutCalled?.();
                return true;
            } else {
                setError('Timeout transaction failed');
                return false;
            }
        } catch (err) {
            console.error('Timeout call failed:', err);
            setError(err instanceof Error ? err.message : 'Timeout failed');
            return false;
        } finally {
            setIsPending(false);
        }
    }, [network, tableAddress, canCallTimeout, onTimeoutCalled]);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        isTimedOut,
        remainingSeconds,
        canCallTimeout,
        isPending,
        error,
        callTimeout,
        clearError,
    };
}

export default useTimeoutHandler;
