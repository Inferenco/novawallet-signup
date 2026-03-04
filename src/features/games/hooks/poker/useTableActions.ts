// Nova Wallet - Table Actions Hook
// Handles join, leave, start hand, and table management actions

import { useState, useCallback } from 'react';
import type { GameSigner } from "../../types";
import type { NetworkType } from '../../utils/constants';
import {
    joinTable,
    leaveTable,
    topUp,
    sitOut,
    sitIn,
    leaveAfterHand,
    cancelLeaveAfterHand,
    startHand,
} from '../../services/poker/actions';

export type TableActionType =
    | 'join'
    | 'leave'
    | 'topUp'
    | 'sitOut'
    | 'sitIn'
    | 'leaveAfterHand'
    | 'cancelLeaveAfterHand'
    | 'startHand';

interface UseTableActionsOptions {
    network: NetworkType;
    tableAddress: string;
    onSuccess?: (action: TableActionType) => void;
    onError?: (action: TableActionType, error: string) => void;
}

interface UseTableActionsReturn {
    // State
    pendingAction: TableActionType | null;
    error: string | null;

    // Actions
    doJoin: (account: GameSigner, seatIndex: number, buyIn: bigint) => Promise<boolean>;
    doLeave: (account: GameSigner) => Promise<boolean>;
    doTopUp: (account: GameSigner, amount: bigint) => Promise<boolean>;
    doSitOut: (account: GameSigner) => Promise<boolean>;
    doSitIn: (account: GameSigner) => Promise<boolean>;
    doLeaveAfterHand: (account: GameSigner) => Promise<boolean>;
    doCancelLeaveAfterHand: (account: GameSigner) => Promise<boolean>;
    doStartHand: (account: GameSigner) => Promise<boolean>;

    // Helpers
    clearError: () => void;
}

export function useTableActions({
    network,
    tableAddress,
    onSuccess,
    onError,
}: UseTableActionsOptions): UseTableActionsReturn {
    const [pendingAction, setPendingAction] = useState<TableActionType | null>(null);
    const [error, setError] = useState<string | null>(null);

    /**
     * Generic action wrapper with loading state and error handling.
     */
    const executeAction = useCallback(async (
        actionType: TableActionType,
        actionFn: () => Promise<{ success: boolean; hash: string }>
    ): Promise<boolean> => {
        if (pendingAction) {
            setError('Another action is in progress');
            return false;
        }

        try {
            setPendingAction(actionType);
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
        }
    }, [pendingAction, onSuccess, onError]);

    const doJoin = useCallback(async (
        account: GameSigner,
        seatIndex: number,
        buyIn: bigint
    ): Promise<boolean> => {
        return executeAction('join', () =>
            joinTable(network, account, tableAddress, seatIndex, buyIn)
        );
    }, [network, tableAddress, executeAction]);

    const doLeave = useCallback(async (account: GameSigner): Promise<boolean> => {
        return executeAction('leave', () => leaveTable(network, account, tableAddress));
    }, [network, tableAddress, executeAction]);

    const doTopUp = useCallback(async (account: GameSigner, amount: bigint): Promise<boolean> => {
        return executeAction('topUp', () => topUp(network, account, tableAddress, amount));
    }, [network, tableAddress, executeAction]);

    const doSitOut = useCallback(async (account: GameSigner): Promise<boolean> => {
        return executeAction('sitOut', () => sitOut(network, account, tableAddress));
    }, [network, tableAddress, executeAction]);

    const doSitIn = useCallback(async (account: GameSigner): Promise<boolean> => {
        return executeAction('sitIn', () => sitIn(network, account, tableAddress));
    }, [network, tableAddress, executeAction]);

    const doLeaveAfterHand = useCallback(async (account: GameSigner): Promise<boolean> => {
        return executeAction('leaveAfterHand', () =>
            leaveAfterHand(network, account, tableAddress)
        );
    }, [network, tableAddress, executeAction]);

    const doCancelLeaveAfterHand = useCallback(async (account: GameSigner): Promise<boolean> => {
        return executeAction('cancelLeaveAfterHand', () =>
            cancelLeaveAfterHand(network, account, tableAddress)
        );
    }, [network, tableAddress, executeAction]);

    const doStartHand = useCallback(async (account: GameSigner): Promise<boolean> => {
        return executeAction('startHand', () => startHand(network, account, tableAddress));
    }, [network, tableAddress, executeAction]);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        pendingAction,
        error,
        doJoin,
        doLeave,
        doTopUp,
        doSitOut,
        doSitIn,
        doLeaveAfterHand,
        doCancelLeaveAfterHand,
        doStartHand,
        clearError,
    };
}

export default useTableActions;
