// Nova Wallet - Owner Actions Hook
// Handles table owner controls with loading states

import { useState, useCallback } from 'react';
import type { GameSigner } from "../../types";
import type { NetworkType } from '../../utils/constants';
import {
    pauseTable,
    resumeTable,
    toggleOwnerOnlyStart,
    updateBlinds,
    updateAnte,
    toggleStraddle,
    updateBuyInLimits,
    kickPlayer,
    transferOwnership,
    closeTable,
    requestAbort,
    cancelAbortRequest,
} from '../../services/poker/actions';

export type OwnerActionType =
    | 'pause'
    | 'resume'
    | 'toggleOwnerStart'
    | 'updateBlinds'
    | 'updateAnte'
    | 'toggleStraddle'
    | 'updateBuyIn'
    | 'kick'
    | 'transfer'
    | 'close'
    | 'requestAbort'
    | 'cancelAbort';

interface UseOwnerActionsOptions {
    network: NetworkType;
    tableAddress: string;
    onSuccess?: (action: OwnerActionType) => void;
    onError?: (action: OwnerActionType, error: string) => void;
}

interface UseOwnerActionsReturn {
    // State
    pendingAction: OwnerActionType | null;
    error: string | null;

    // Actions
    doPause: (account: GameSigner) => Promise<boolean>;
    doResume: (account: GameSigner) => Promise<boolean>;
    doToggleOwnerOnlyStart: (account: GameSigner, enabled: boolean) => Promise<boolean>;
    doUpdateBlinds: (account: GameSigner, smallBlind: bigint, bigBlind: bigint) => Promise<boolean>;
    doUpdateAnte: (account: GameSigner, ante: bigint) => Promise<boolean>;
    doToggleStraddle: (account: GameSigner, enabled: boolean) => Promise<boolean>;
    doUpdateBuyInLimits: (account: GameSigner, minBuyIn: bigint, maxBuyIn: bigint) => Promise<boolean>;
    doKickPlayer: (account: GameSigner, seatIndex: number) => Promise<boolean>;
    doTransferOwnership: (account: GameSigner, newOwner: string) => Promise<boolean>;
    doCloseTable: (account: GameSigner) => Promise<boolean>;
    doRequestAbort: (account: GameSigner) => Promise<boolean>;
    doCancelAbortRequest: (account: GameSigner) => Promise<boolean>;

    // Helpers
    clearError: () => void;
}

export function useOwnerActions({
    network,
    tableAddress,
    onSuccess,
    onError,
}: UseOwnerActionsOptions): UseOwnerActionsReturn {
    const [pendingAction, setPendingAction] = useState<OwnerActionType | null>(null);
    const [error, setError] = useState<string | null>(null);

    const executeAction = useCallback(async (
        actionType: OwnerActionType,
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
            console.error(`Owner ${actionType} failed:`, err);
            const errorMsg = err instanceof Error ? err.message : 'Action failed';
            setError(errorMsg);
            onError?.(actionType, errorMsg);
            return false;
        } finally {
            setPendingAction(null);
        }
    }, [pendingAction, onSuccess, onError]);

    const doPause = useCallback(async (account: GameSigner): Promise<boolean> => {
        return executeAction('pause', () => pauseTable(network, account, tableAddress));
    }, [network, tableAddress, executeAction]);

    const doResume = useCallback(async (account: GameSigner): Promise<boolean> => {
        return executeAction('resume', () => resumeTable(network, account, tableAddress));
    }, [network, tableAddress, executeAction]);

    const doToggleOwnerOnlyStart = useCallback(async (
        account: GameSigner,
        enabled: boolean
    ): Promise<boolean> => {
        return executeAction('toggleOwnerStart', () =>
            toggleOwnerOnlyStart(network, account, tableAddress, enabled)
        );
    }, [network, tableAddress, executeAction]);

    const doUpdateBlinds = useCallback(async (
        account: GameSigner,
        smallBlind: bigint,
        bigBlind: bigint
    ): Promise<boolean> => {
        return executeAction('updateBlinds', () =>
            updateBlinds(network, account, tableAddress, smallBlind, bigBlind)
        );
    }, [network, tableAddress, executeAction]);

    const doUpdateAnte = useCallback(async (
        account: GameSigner,
        ante: bigint
    ): Promise<boolean> => {
        return executeAction('updateAnte', () =>
            updateAnte(network, account, tableAddress, ante)
        );
    }, [network, tableAddress, executeAction]);

    const doToggleStraddle = useCallback(async (
        account: GameSigner,
        enabled: boolean
    ): Promise<boolean> => {
        return executeAction('toggleStraddle', () =>
            toggleStraddle(network, account, tableAddress, enabled)
        );
    }, [network, tableAddress, executeAction]);

    const doUpdateBuyInLimits = useCallback(async (
        account: GameSigner,
        minBuyIn: bigint,
        maxBuyIn: bigint
    ): Promise<boolean> => {
        return executeAction('updateBuyIn', () =>
            updateBuyInLimits(network, account, tableAddress, minBuyIn, maxBuyIn)
        );
    }, [network, tableAddress, executeAction]);

    const doKickPlayer = useCallback(async (
        account: GameSigner,
        seatIndex: number
    ): Promise<boolean> => {
        return executeAction('kick', () =>
            kickPlayer(network, account, tableAddress, seatIndex)
        );
    }, [network, tableAddress, executeAction]);

    const doTransferOwnership = useCallback(async (
        account: GameSigner,
        newOwner: string
    ): Promise<boolean> => {
        return executeAction('transfer', () =>
            transferOwnership(network, account, tableAddress, newOwner)
        );
    }, [network, tableAddress, executeAction]);

    const doCloseTable = useCallback(async (account: GameSigner): Promise<boolean> => {
        return executeAction('close', () => closeTable(network, account, tableAddress));
    }, [network, tableAddress, executeAction]);

    const doRequestAbort = useCallback(async (account: GameSigner): Promise<boolean> => {
        return executeAction('requestAbort', () =>
            requestAbort(network, account, tableAddress)
        );
    }, [network, tableAddress, executeAction]);

    const doCancelAbortRequest = useCallback(async (account: GameSigner): Promise<boolean> => {
        return executeAction('cancelAbort', () =>
            cancelAbortRequest(network, account, tableAddress)
        );
    }, [network, tableAddress, executeAction]);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        pendingAction,
        error,
        doPause,
        doResume,
        doToggleOwnerOnlyStart,
        doUpdateBlinds,
        doUpdateAnte,
        doToggleStraddle,
        doUpdateBuyInLimits,
        doKickPlayer,
        doTransferOwnership,
        doCloseTable,
        doRequestAbort,
        doCancelAbortRequest,
        clearError,
    };
}

export default useOwnerActions;
