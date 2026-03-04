// Nova Wallet - Betting Actions Hook
// Handles all betting actions with loading states and error handling

import { useState, useCallback } from 'react';
import type { GameSigner } from "../../types";
import type { NetworkType } from '../../utils/constants';
import {
    fold,
    check,
    call,
    raiseTo,
    allIn,
    straddle,
} from '../../services/poker/actions';
import { usePokerTableStore } from '../../stores/poker/table';

export type BettingActionType = 'fold' | 'check' | 'call' | 'raise' | 'allIn' | 'straddle';

interface UseBettingActionsOptions {
    network: NetworkType;
    tableAddress: string;
    onSuccess?: (action: BettingActionType) => void;
    onError?: (action: BettingActionType, error: string) => void;
}

interface UseBettingActionsReturn {
    // State
    pendingAction: BettingActionType | null;
    error: string | null;

    // Actions
    doFold: (account: GameSigner) => Promise<boolean>;
    doCheck: (account: GameSigner) => Promise<boolean>;
    doCall: (account: GameSigner) => Promise<boolean>;
    doRaise: (account: GameSigner, amount: bigint) => Promise<boolean>;
    doAllIn: (account: GameSigner) => Promise<boolean>;
    doStraddle: (account: GameSigner) => Promise<boolean>;

    // Helpers
    clearError: () => void;
}

export function useBettingActions({
    network,
    tableAddress,
    onSuccess,
    onError,
}: UseBettingActionsOptions): UseBettingActionsReturn {
    const [pendingAction, setPendingAction] = useState<BettingActionType | null>(null);
    const [error, setError] = useState<string | null>(null);

    const { setPendingAction: setStorePendingAction } = usePokerTableStore();

    /**
     * Generic action wrapper with loading state and error handling.
     */
    const executeAction = useCallback(async (
        actionType: BettingActionType,
        actionFn: () => Promise<{ success: boolean; hash: string }>
    ): Promise<boolean> => {
        if (pendingAction) {
            setError('Another action is in progress');
            return false;
        }

        try {
            setPendingAction(actionType);
            setStorePendingAction(actionType);
            setError(null);

            const result = await actionFn();

            if (result.success) {
                onSuccess?.(actionType);
                return true;
            } else {
                const errorMsg = 'Transaction failed';
                setError(errorMsg);
                onError?.(actionType, errorMsg);
                return false;
            }
        } catch (err) {
            console.error(`${actionType} failed:`, err);
            const errorMsg = err instanceof Error ? err.message : 'Action failed';
            setError(errorMsg);
            onError?.(actionType, errorMsg);
            return false;
        } finally {
            setPendingAction(null);
            setStorePendingAction(null);
        }
    }, [pendingAction, onSuccess, onError, setStorePendingAction]);

    const doFold = useCallback(async (account: GameSigner): Promise<boolean> => {
        return executeAction('fold', () => fold(network, account, tableAddress));
    }, [network, tableAddress, executeAction]);

    const doCheck = useCallback(async (account: GameSigner): Promise<boolean> => {
        return executeAction('check', () => check(network, account, tableAddress));
    }, [network, tableAddress, executeAction]);

    const doCall = useCallback(async (account: GameSigner): Promise<boolean> => {
        return executeAction('call', () => call(network, account, tableAddress));
    }, [network, tableAddress, executeAction]);

    const doRaise = useCallback(async (account: GameSigner, amount: bigint): Promise<boolean> => {
        return executeAction('raise', () => raiseTo(network, account, tableAddress, amount));
    }, [network, tableAddress, executeAction]);

    const doAllIn = useCallback(async (account: GameSigner): Promise<boolean> => {
        return executeAction('allIn', () => allIn(network, account, tableAddress));
    }, [network, tableAddress, executeAction]);

    const doStraddle = useCallback(async (account: GameSigner): Promise<boolean> => {
        return executeAction('straddle', () => straddle(network, account, tableAddress));
    }, [network, tableAddress, executeAction]);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        pendingAction,
        error,
        doFold,
        doCheck,
        doCall,
        doRaise,
        doAllIn,
        doStraddle,
        clearError,
    };
}

export default useBettingActions;
