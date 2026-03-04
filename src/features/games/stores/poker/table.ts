/* eslint-disable @typescript-eslint/no-explicit-any */
// Nova Wallet - Poker Table Store
// State management for active table and gameplay

import { create } from 'zustand';
import type { NetworkType } from '../../utils/constants';
import {
    getTableSummary,
    getTableState,
    getAllSeats,
    getPlayersInHand,
    getActionOn,
    getCommunityCards,
    getGamePhase,
    getEncryptedHoleCards,
    getPotSize,
    getMinRaise,
    getCommitStatus,
    getRevealStatus,
    getCommitDeadline,
    getRevealDeadline,
    getAbortRequestStatus,
} from '../../services/poker/views';
import type {
    TableSummary,
    TableState,
    SeatInfo,
    ActionInfo,
    AbortStatus,
} from '../../services/poker/types';
import { GAME_PHASES, MAX_SEATS } from '../../config/games';
import { decryptHoleCards, areCardsValid } from '../../utils/poker/cardCrypto';
import { clearSecret, getSecret } from '../../services/poker/secrets';
import { normalizeAddress } from '../../utils/address';

// ============================================================================
// Types
// ============================================================================

export interface PlayerInHand {
    seatIndex: number;
    handIndex: number;
    address: string;
    chips: number;
    currentBet: number;
    status: number;
    hasCommitted: boolean;
    hasRevealed: boolean;
    encryptedCards: number[];
}

export interface ActiveTableState {
    // Table identity
    tableAddress: string | null;
    network: NetworkType | null;

    // Table metadata
    summary: TableSummary | null;
    tableState: TableState | null;
    seats: SeatInfo[];

    // Game state
    phase: number;
    playersInHand: PlayerInHand[];
    actionInfo: ActionInfo | null;
    potSize: number;
    communityCards: number[];
    minRaise: number;
    maxCurrentBet: number; // Highest current bet on the table (for local callAmount calculation)

    // Player's own state
    mySeatIndex: number | null;
    myHandIndex: number | null;
    myHoleCards: number[];
    myCardsDecrypted: boolean;

    // Commit/reveal deadlines
    commitDeadline: number;
    revealDeadline: number;
    commitStatus: boolean[];
    revealStatus: boolean[];

    // Abort state
    abortStatus: AbortStatus | null;

    // UI state
    isLoading: boolean;
    isRefreshing: boolean;
    error: string | null;
    lastRefresh: number | null;
    lastClearedHandNumber: number;

    // Transaction states
    pendingAction: string | null;

    // Actions
    setActiveTable: (address: string, network: NetworkType) => void;
    refreshTableData: (playerAddress?: string) => Promise<void>;
    refreshGameState: (playerAddress?: string) => Promise<void>;
    decryptMyCards: (secret: string) => void;
    setPendingAction: (action: string | null) => void;
    clearError: () => void;
    reset: () => void;
}

// ============================================================================
// Store
// ============================================================================

const initialState = {
    tableAddress: null as string | null,
    network: null as NetworkType | null,
    summary: null as TableSummary | null,
    tableState: null as TableState | null,
    seats: [] as SeatInfo[],
    phase: GAME_PHASES.WAITING,
    playersInHand: [] as PlayerInHand[],
    actionInfo: null as ActionInfo | null,
    potSize: 0,
    communityCards: [] as number[],
    minRaise: 0,
    maxCurrentBet: 0,
    mySeatIndex: null as number | null,
    myHandIndex: null as number | null,
    myHoleCards: [] as number[],
    myCardsDecrypted: false,
    commitDeadline: 0,
    revealDeadline: 0,
    commitStatus: [] as boolean[],
    revealStatus: [] as boolean[],
    abortStatus: null as AbortStatus | null,
    isLoading: false,
    isRefreshing: false,
    error: null as string | null,
    lastRefresh: null as number | null,
    lastClearedHandNumber: 0,
    pendingAction: null as string | null,
};

export const usePokerTableStore = create<ActiveTableState>((set, get) => ({
    ...initialState,

    setActiveTable: (address: string, network: NetworkType) => {
        set({
            ...initialState,
            tableAddress: address,
            network,
            isLoading: true,
        });
    },

    refreshTableData: async (playerAddress?: string) => {
        const { tableAddress, network } = get();
        if (!tableAddress || !network) return;

        set({ isRefreshing: true, error: null });

        try {
            const [summary, tableState, seats] = await Promise.all([
                getTableSummary(network, tableAddress),
                getTableState(network, tableAddress),
                getAllSeats(network, tableAddress, MAX_SEATS),
            ]);

            // Find player's seat
            let mySeatIndex: number | null = null;
            if (playerAddress) {
                const normalizedPlayer = normalizeAddress(playerAddress);
                mySeatIndex = seats.findIndex(
                    (s) => normalizeAddress(s.playerAddress) === normalizedPlayer
                );
                if (mySeatIndex === -1) mySeatIndex = null;
            }

            // Calculate max current bet from all seats (for local callAmount calculation)
            const maxCurrentBet = Math.max(...seats.map(s => s.currentBet), 0);

            set({
                summary,
                tableState,
                seats,
                mySeatIndex,
                maxCurrentBet,
                isLoading: false,
                isRefreshing: false,
                lastRefresh: Date.now(),
            });

            // Also refresh game state if there's an active hand
            if (summary.hasActiveGame) {
                await get().refreshGameState(playerAddress);
            }
        } catch (error: any) {
            const msg = error?.message || String(error);
            // Check for specific "Table Closed" errors:
            // 1. VMError with ABORTED status
            // 2. VMError with MISSING_DATA status (Failed to borrow global resource)
            const isTableClosed =
                (msg.includes('VMError') && msg.includes('ABORTED')) ||
                (msg.includes('MISSING_DATA') && msg.includes('Failed to borrow global resource'));

            if (isTableClosed) {
                set({
                    isLoading: false,
                    isRefreshing: false,
                    error: 'TABLE_CLOSED',
                });
                return;
            }

            console.error('Failed to refresh table data:', error);
            set({
                isLoading: false,
                isRefreshing: false,
                error: 'Failed to load table data',
            });
        }
    },

    refreshGameState: async (playerAddress?: string) => {
        const { tableAddress, network, mySeatIndex, tableState, lastClearedHandNumber } = get();
        if (!tableAddress || !network) return;

        try {
            const [
                latestTableState,
                gamePhase,
                playersInHandIndices,
                actionInfoRaw,
                potSize,
                communityCards,
                minRaise,
                commitStatus,
                revealStatus,
                commitDeadline,
                revealDeadline,
                encryptedCards,
                abortStatus,
            ] = await Promise.all([
                getTableState(network, tableAddress),
                getGamePhase(network, tableAddress),
                getPlayersInHand(network, tableAddress),
                getActionOn(network, tableAddress),
                getPotSize(network, tableAddress),
                getCommunityCards(network, tableAddress),
                getMinRaise(network, tableAddress),
                getCommitStatus(network, tableAddress),
                getRevealStatus(network, tableAddress),
                getCommitDeadline(network, tableAddress),
                getRevealDeadline(network, tableAddress),
                getEncryptedHoleCards(network, tableAddress),
                getAbortRequestStatus(network, tableAddress),
            ]);

            const phase = gamePhase ?? GAME_PHASES.WAITING;
            const hasActiveGame = phase !== GAME_PHASES.WAITING;

            const actionInfo = hasActiveGame ? actionInfoRaw : null;
            const effectiveTableState = latestTableState || tableState;
            let clearedHandNumber = lastClearedHandNumber;
            if (!hasActiveGame && playerAddress && effectiveTableState?.handNumber && effectiveTableState.handNumber > lastClearedHandNumber) {
                try {
                    await clearSecret(network, tableAddress, playerAddress, effectiveTableState.handNumber);
                    clearedHandNumber = effectiveTableState.handNumber;
                } catch (error) {
                    console.warn('Failed to clear secret for completed hand:', error);
                }
            }

            // Build players in hand with all their data
            const { seats } = get();
            const playersInHand: PlayerInHand[] = hasActiveGame
                ? playersInHandIndices.map((seatIndex, handIndex) => {
                    const seat = seats[seatIndex];
                    return {
                        seatIndex,
                        handIndex,
                        address: seat?.playerAddress || '',
                        chips: seat?.chipCount || 0,
                        currentBet: seat?.currentBet || 0,
                        status: seat?.status || 0,
                        hasCommitted: commitStatus[handIndex] || false,
                        hasRevealed: revealStatus[handIndex] || false,
                        encryptedCards: encryptedCards[handIndex] || [],
                    };
                })
                : [];

            // Find my hand index
            let myHandIndex: number | null = null;
            if (hasActiveGame && mySeatIndex !== null) {
                myHandIndex = playersInHandIndices.indexOf(mySeatIndex);
                if (myHandIndex === -1) myHandIndex = null;
            }

            // Get my encrypted cards
            let myHoleCards: number[] = [];
            let myCardsDecrypted = false;

            if (hasActiveGame && myHandIndex !== null && encryptedCards[myHandIndex]) {
                myHoleCards = encryptedCards[myHandIndex];

                // Try to decrypt if we have the secret
                if (playerAddress && effectiveTableState?.handNumber) {
                    let secret = await getSecret(
                        network,
                        tableAddress,
                        playerAddress,
                        effectiveTableState.handNumber
                    );

                    if (!secret && effectiveTableState.handNumber > 1) {
                        // Fallback for legacy hand-number drift (pre-fix)
                        secret = await getSecret(
                            network,
                            tableAddress,
                            playerAddress,
                            effectiveTableState.handNumber - 1
                        );
                    }
                    if (secret && mySeatIndex !== null) {
                        const decrypted = decryptHoleCards(myHoleCards, secret, mySeatIndex);
                        if (areCardsValid(decrypted)) {
                            myHoleCards = decrypted;
                            myCardsDecrypted = true;
                        }
                    }
                }
            }

            set({
                phase,
                playersInHand,
                actionInfo,
                potSize,
                communityCards,
                minRaise,
                commitStatus: hasActiveGame ? commitStatus : [],
                revealStatus: hasActiveGame ? revealStatus : [],
                commitDeadline: hasActiveGame ? commitDeadline : 0,
                revealDeadline: hasActiveGame ? revealDeadline : 0,
                tableState: latestTableState || tableState,
                myHandIndex,
                myHoleCards,
                myCardsDecrypted,
                abortStatus: abortStatus.timestamp > 0 ? abortStatus : null,
                lastClearedHandNumber: clearedHandNumber,
            });
        } catch (error: any) {
            // Suppress "table not found" errors which happen when polling deleted tables or during initialization
            const msg = error?.message || String(error);
            if (msg.includes('MISSING_DATA') || msg.includes('Failed to borrow global resource')) {
                // Silent fail - table likely doesn't exist yet or was deleted
                return;
            }
            console.error('Failed to refresh game state:', error);
        }
    },

    decryptMyCards: (secret: string) => {
        const { myHoleCards, mySeatIndex, myCardsDecrypted } = get();
        if (myCardsDecrypted || mySeatIndex === null || myHoleCards.length !== 2) {
            return;
        }

        const decrypted = decryptHoleCards(myHoleCards, secret, mySeatIndex);
        if (areCardsValid(decrypted)) {
            set({
                myHoleCards: decrypted,
                myCardsDecrypted: true,
            });
        }
    },

    setPendingAction: (action: string | null) => {
        set({ pendingAction: action });
    },

    clearError: () => {
        set({ error: null });
    },

    reset: () => {
        set(initialState);
    },
}));

// ============================================================================
// Selectors
// ============================================================================

/**
 * Check if it's the player's turn to act.
 */
export function useIsMyTurn(playerAddress: string | undefined): boolean {
    const { actionInfo, phase, mySeatIndex } = usePokerTableStore();

    if (!playerAddress || !actionInfo) return false;
    if (phase < GAME_PHASES.PREFLOP || phase > GAME_PHASES.RIVER) return false;

    if (mySeatIndex !== null) {
        return actionInfo.seatIdx === mySeatIndex;
    }

    return normalizeAddress(actionInfo.playerAddr) === normalizeAddress(playerAddress);
}

/**
 * Check if player needs to commit.
 */
export function useNeedsCommit(playerAddress: string | undefined): boolean {
    const { phase, playersInHand, myHandIndex } = usePokerTableStore();

    if (!playerAddress || phase !== GAME_PHASES.COMMIT) return false;
    if (myHandIndex === null) return false;

    const player = playersInHand[myHandIndex];
    return player && !player.hasCommitted;
}

/**
 * Check if player needs to reveal.
 */
export function useNeedsReveal(playerAddress: string | undefined): boolean {
    const { phase, playersInHand, myHandIndex } = usePokerTableStore();

    if (!playerAddress || phase !== GAME_PHASES.REVEAL) return false;
    if (myHandIndex === null) return false;

    const player = playersInHand[myHandIndex];
    return player && !player.hasRevealed;
}

/**
 * Check if player is the table admin.
 */
export function useIsAdmin(playerAddress: string | undefined): boolean {
    const { summary } = usePokerTableStore();

    if (!playerAddress || !summary) return false;

    return summary.owner.toLowerCase() === playerAddress.toLowerCase();
}

/**
 * Check if an abort vote is in progress.
 */
export function useIsAbortInProgress(): boolean {
    const { abortStatus } = usePokerTableStore();
    return abortStatus !== null && abortStatus.timestamp > 0;
}
