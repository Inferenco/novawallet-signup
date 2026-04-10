// Nova Wallet - Abort Vote Hook
// Handles abort vote flow with status tracking

import { useState, useCallback } from 'react';
import type { GameSigner } from "../../types";
import type { NetworkType } from '../../utils/constants';
import { requestAbort, voteAbort, finalizeAbort, cancelAbortRequest } from '../../services/poker/actions';
import { usePokerTableStore } from '../../stores/poker/table';

interface UseAbortVoteOptions {
    network: NetworkType;
    tableAddress: string;
    onRequestSuccess?: () => void;
    onVoteSuccess?: (approved: boolean) => void;
    onFinalizeSuccess?: () => void;
    onCancelSuccess?: () => void;
}

interface UseAbortVoteReturn {
    // State from store
    abortInProgress: boolean;
    abortDeadline: number;
    approvalCount: number;
    vetoCount: number;
    seatedCount: number;

    // Local state
    isPending: boolean;
    error: string | null;

    // Actions
    request: (account: GameSigner) => Promise<boolean>;
    vote: (account: GameSigner, approve: boolean) => Promise<boolean>;
    finalize: (account: GameSigner) => Promise<boolean>;
    cancel: (account: GameSigner) => Promise<boolean>;

    // Helpers
    clearError: () => void;
    canFinalize: boolean;
}

export function useAbortVote({
    network,
    tableAddress,
    onRequestSuccess,
    onVoteSuccess,
    onFinalizeSuccess,
    onCancelSuccess,
}: UseAbortVoteOptions): UseAbortVoteReturn {
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { abortStatus } = usePokerTableStore();

    const abortInProgress = abortStatus !== null && abortStatus.timestamp > 0;
    const abortDeadline = abortStatus?.deadline || 0;
    const approvalCount = abortStatus?.approvals || 0;
    const vetoCount = abortStatus?.vetos || 0;
    const seatedCount = abortStatus?.seatedCount || 0;

    // Finalization is allowed after all votes or deadline, even if vetoed.
    const allVoted = approvalCount + vetoCount >= seatedCount;
    const deadlinePassed = abortDeadline > 0 && Math.floor(Date.now() / 1000) > abortDeadline;
    const canFinalize = abortInProgress && (allVoted || deadlinePassed);

    const request = useCallback(async (account: GameSigner): Promise<boolean> => {
        if (isPending) {
            setError('Action already in progress');
            return false;
        }

        try {
            setIsPending(true);
            setError(null);

            const result = await requestAbort(network, account, tableAddress);

            if (result.success) {
                onRequestSuccess?.();
                return true;
            } else {
                setError('Request abort failed');
                return false;
            }
        } catch (err) {
            console.error('Request abort failed:', err);
            setError(err instanceof Error ? err.message : 'Request failed');
            return false;
        } finally {
            setIsPending(false);
        }
    }, [network, tableAddress, isPending, onRequestSuccess]);

    const vote = useCallback(async (account: GameSigner, approve: boolean): Promise<boolean> => {
        if (isPending) {
            setError('Vote already in progress');
            return false;
        }

        try {
            setIsPending(true);
            setError(null);

            const result = await voteAbort(network, account, tableAddress, approve);

            if (result.success) {
                onVoteSuccess?.(approve);
                return true;
            } else {
                setError('Vote transaction failed');
                return false;
            }
        } catch (err) {
            console.error('Abort vote failed:', err);
            setError(err instanceof Error ? err.message : 'Vote failed');
            return false;
        } finally {
            setIsPending(false);
        }
    }, [network, tableAddress, isPending, onVoteSuccess]);

    const finalize = useCallback(async (account: GameSigner): Promise<boolean> => {
        if (!canFinalize) {
            setError('Cannot finalize yet - waiting for votes or deadline');
            return false;
        }

        if (isPending) {
            setError('Action already in progress');
            return false;
        }

        try {
            setIsPending(true);
            setError(null);

            const result = await finalizeAbort(network, account, tableAddress);

            if (result.success) {
                onFinalizeSuccess?.();
                return true;
            } else {
                setError('Finalize transaction failed');
                return false;
            }
        } catch (err) {
            console.error('Abort finalize failed:', err);
            setError(err instanceof Error ? err.message : 'Finalize failed');
            return false;
        } finally {
            setIsPending(false);
        }
    }, [network, tableAddress, canFinalize, isPending, onFinalizeSuccess]);

    const cancel = useCallback(async (account: GameSigner): Promise<boolean> => {
        if (isPending) {
            setError('Action already in progress');
            return false;
        }

        try {
            setIsPending(true);
            setError(null);

            const result = await cancelAbortRequest(network, account, tableAddress);

            if (result.success) {
                onCancelSuccess?.();
                return true;
            } else {
                setError('Cancel request failed');
                return false;
            }
        } catch (err) {
            console.error('Cancel abort request failed:', err);
            setError(err instanceof Error ? err.message : 'Cancel failed');
            return false;
        } finally {
            setIsPending(false);
        }
    }, [network, tableAddress, isPending, onCancelSuccess]);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        abortInProgress,
        abortDeadline,
        approvalCount,
        vetoCount,
        seatedCount,
        isPending,
        error,
        request,
        vote,
        finalize,
        cancel,
        canFinalize,
        clearError,
    };
}

export default useAbortVote;
