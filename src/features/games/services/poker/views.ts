/* eslint-disable @typescript-eslint/no-explicit-any */
// Nova Wallet - Poker View Functions
// Read-only contract calls for table data, game state, and player info

import type { NetworkType } from '../../utils/constants';
import { callView } from './client';
import { isEmptyAddress, normalizeAddress } from '../../utils/address';
import type {
    AbortStatus,
    ActionInfo,
    SeatInfo,
    TableConfig,
    TableState,
    TableSummary,
} from './types';

// ============================================================================
// Table Metadata
// ============================================================================

/**
 * Get comprehensive table summary.
 */
export async function getTableSummary(
    network: NetworkType,
    tableAddress: string
): Promise<TableSummary> {
    const result = await callView<any[]>(
        network,
        'TEXAS_HOLDEM',
        'get_table_summary',
        [tableAddress]
    );

    return {
        owner: result[0] as string,
        smallBlind: Number(result[1]),
        bigBlind: Number(result[2]),
        minBuyIn: Number(result[3]),
        maxBuyIn: Number(result[4]),
        isPaused: result[5] as boolean,
        ownerOnlyStart: result[6] as boolean,
        occupiedSeats: Number(result[7]),
        totalSeats: Number(result[8]),
        hasActiveGame: result[9] as boolean,
        ante: Number(result[10]),
        straddleEnabled: result[11] as boolean,
        tableSpeed: Number(result[12]),
        name: result[13] as string,
        colorIndex: Number(result[14]),
    };
}

/**
 * Get table configuration.
 */
export async function getTableConfig(
    network: NetworkType,
    tableAddress: string
): Promise<TableConfig> {
    const result = await callView<any[]>(
        network,
        'TEXAS_HOLDEM',
        'get_table_config_full',
        [tableAddress]
    );

    return {
        smallBlind: Number(result[0]),
        bigBlind: Number(result[1]),
        minBuyIn: Number(result[2]),
        maxBuyIn: Number(result[3]),
        ante: Number(result[4]),
        straddleEnabled: result[5] as boolean,
    };
}

/**
 * Get table state (hand number, dealer, etc).
 */
export async function getTableState(
    network: NetworkType,
    tableAddress: string
): Promise<TableState> {
    const result = await callView<any[]>(
        network,
        'TEXAS_HOLDEM',
        'get_table_state',
        [tableAddress]
    );

    return {
        handNumber: Number(result[0]),
        dealerSeat: Number(result[1]),
        nextBigBlindSeat: Number(result[2]),
    };
}

/**
 * Get current on-chain game phase.
 */
export async function getGamePhase(
    network: NetworkType,
    tableAddress: string
): Promise<number> {
    const result = await callView<[number]>(
        network,
        'TEXAS_HOLDEM',
        'get_game_phase',
        [tableAddress]
    );
    return Number(result[0]);
}

/**
 * Get the table owner address.
 */
export async function getOwner(
    network: NetworkType,
    tableAddress: string
): Promise<string> {
    const result = await callView<[string]>(
        network,
        'TEXAS_HOLDEM',
        'get_owner',
        [tableAddress]
    );
    return result[0];
}

/**
 * Check if table is paused.
 */
export async function isPaused(
    network: NetworkType,
    tableAddress: string
): Promise<boolean> {
    const result = await callView<[boolean]>(
        network,
        'TEXAS_HOLDEM',
        'is_paused',
        [tableAddress]
    );
    return result[0];
}

/**
 * Check if owner-only start is enabled.
 */
export async function isOwnerOnlyStart(
    network: NetworkType,
    tableAddress: string
): Promise<boolean> {
    const result = await callView<[boolean]>(
        network,
        'TEXAS_HOLDEM',
        'is_owner_only_start',
        [tableAddress]
    );
    return result[0];
}

// ============================================================================
// Seat Information
// ============================================================================

/**
 * Get full information for a specific seat.
 */
export async function getSeatInfo(
    network: NetworkType,
    tableAddress: string,
    seatIndex: number
): Promise<SeatInfo> {
    const result = await callView<any[]>(
        network,
        'TEXAS_HOLDEM',
        'get_seat_info_full',
        [tableAddress, seatIndex]
    );

    // Normalize the address and check if it's a zero-address (empty seat)
    const rawAddress = result[0] as string;
    const normalizedAddress = rawAddress ? normalizeAddress(rawAddress) : null;

    return {
        // Treat zero-addresses as null (empty seat)
        playerAddress: isEmptyAddress(normalizedAddress) ? null : normalizedAddress,
        chipCount: Number(result[1]),
        isSittingOut: result[2] as boolean,
        currentBet: Number(result[3]),
        status: Number(result[4]),
    };
}

/**
 * Get all seat information for a table.
 */
export async function getAllSeats(
    network: NetworkType,
    tableAddress: string,
    totalSeats: number = 5
): Promise<SeatInfo[]> {
    const promises = [];
    for (let i = 0; i < totalSeats; i++) {
        promises.push(getSeatInfo(network, tableAddress, i));
    }
    return Promise.all(promises);
}

/**
 * Get seat indices of players currently in hand.
 */
export async function getPlayersInHand(
    network: NetworkType,
    tableAddress: string
): Promise<number[]> {
    const result = await callView<[number[]]>(
        network,
        'TEXAS_HOLDEM',
        'get_players_in_hand',
        [tableAddress]
    );
    // Handle case where result is empty or undefined (no active game)
    if (!result[0] || !Array.isArray(result[0])) {
        return [];
    }
    return result[0].map(Number);
}

// ============================================================================
// Game State
// ============================================================================

/**
 * Get current action information.
 */
export async function getActionOn(
    network: NetworkType,
    tableAddress: string
): Promise<ActionInfo> {
    const result = await callView<any[]>(
        network,
        'TEXAS_HOLDEM',
        'get_action_on',
        [tableAddress]
    );

    return {
        seatIdx: Number(result[0]),
        playerAddr: normalizeAddress(result[1] as string),
        deadline: Number(result[2]),
    };
}

/**
 * Get community cards.
 */
export async function getCommunityCards(
    network: NetworkType,
    tableAddress: string
): Promise<number[]> {
    const result = await callView<[any]>(
        network,
        'TEXAS_HOLDEM',
        'get_community_cards',
        [tableAddress]
    );

    // Handle case where result is empty or undefined (no active game)
    if (!result[0]) {
        return [];
    }

    // Result can be a hex string like "0x22302a" representing packed card bytes
    // or an array of numbers
    const cards = result[0];

    if (typeof cards === 'string') {
        // Decode hex string to bytes - each byte is a card value
        return hexStringToBytes(cards);
    } else if (Array.isArray(cards)) {
        return cards.map(Number);
    }

    return [];
}

/**
 * Convert a hex string like "0x176b" to an array of bytes [0x17, 0x6b]
 */
function hexStringToBytes(hex: string): number[] {
    if (!hex || hex === '0x') return [];
    const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
    // Pad if odd length
    const paddedHex = cleanHex.length % 2 === 0 ? cleanHex : '0' + cleanHex;
    const bytes: number[] = [];
    for (let i = 0; i < paddedHex.length; i += 2) {
        bytes.push(parseInt(paddedHex.substr(i, 2), 16));
    }
    return bytes;
}

/**
 * Get encrypted hole cards (indexed by hand order, not seat).
 */
export async function getEncryptedHoleCards(
    network: NetworkType,
    tableAddress: string
): Promise<number[][]> {
    const result = await callView<[any[]]>(
        network,
        'TEXAS_HOLDEM',
        'get_encrypted_hole_cards',
        [tableAddress]
    );

    // The chain returns either:
    // 1. Array of hex strings like ["0x176b", "0xec27"] - each string is one player's 2 encrypted cards
    // 2. Array of arrays like [[23, 107], [236, 39]] - already parsed
    return result[0].map((cards: any) => {
        if (typeof cards === 'string') {
            // Hex string like "0x176b" -> [0x17, 0x6b] = [23, 107]
            return hexStringToBytes(cards);
        } else if (Array.isArray(cards)) {
            return cards.map(Number);
        }
        return [];
    });
}

/**
 * Get pot size.
 */
export async function getPotSize(
    network: NetworkType,
    tableAddress: string
): Promise<number> {
    const result = await callView<[number]>(
        network,
        'TEXAS_HOLDEM',
        'get_pot_size',
        [tableAddress]
    );
    return Number(result[0]);
}

/**
 * Get minimum raise amount.
 */
export async function getMinRaise(
    network: NetworkType,
    tableAddress: string
): Promise<number> {
    const result = await callView<[number]>(
        network,
        'TEXAS_HOLDEM',
        'get_min_raise',
        [tableAddress]
    );
    return Number(result[0]);
}

/**
 * Get call amount for a specific hand index.
 */
export async function getCallAmount(
    network: NetworkType,
    tableAddress: string,
    handIndex: number
): Promise<number> {
    const result = await callView<[number]>(
        network,
        'TEXAS_HOLDEM',
        'get_call_amount',
        [tableAddress, handIndex]
    );
    return Number(result[0]);
}

// ============================================================================
// Commit/Reveal Status
// ============================================================================

/**
 * Get commit status (indexed by hand order).
 */
export async function getCommitStatus(
    network: NetworkType,
    tableAddress: string
): Promise<boolean[]> {
    const result = await callView<[boolean[]]>(
        network,
        'TEXAS_HOLDEM',
        'get_commit_status',
        [tableAddress]
    );
    return result[0];
}

/**
 * Get reveal status (indexed by hand order).
 */
export async function getRevealStatus(
    network: NetworkType,
    tableAddress: string
): Promise<boolean[]> {
    const result = await callView<[boolean[]]>(
        network,
        'TEXAS_HOLDEM',
        'get_reveal_status',
        [tableAddress]
    );
    return result[0];
}

/**
 * Get commit deadline.
 */
export async function getCommitDeadline(
    network: NetworkType,
    tableAddress: string
): Promise<number> {
    const result = await callView<[number]>(
        network,
        'TEXAS_HOLDEM',
        'get_commit_deadline',
        [tableAddress]
    );
    return Number(result[0]);
}

/**
 * Get reveal deadline.
 */
export async function getRevealDeadline(
    network: NetworkType,
    tableAddress: string
): Promise<number> {
    const result = await callView<[number]>(
        network,
        'TEXAS_HOLDEM',
        'get_reveal_deadline',
        [tableAddress]
    );
    return Number(result[0]);
}

// ============================================================================
// Abort Status
// ============================================================================

/**
 * Get abort request status.
 */
export async function getAbortRequestStatus(
    network: NetworkType,
    tableAddress: string
): Promise<AbortStatus> {
    const result = await callView<any[]>(
        network,
        'TEXAS_HOLDEM',
        'get_abort_request_status',
        [tableAddress]
    );

    return {
        timestamp: Number(result[0]),
        approvals: Number(result[1]),
        vetos: Number(result[2]),
        deadline: Number(result[3]),
        seatedCount: Number(result[4]),
    };
}

// ============================================================================
// Table Address Resolution
// ============================================================================

/**
 * Get table object address for an admin.
 */
export async function getTableAddress(
    network: NetworkType,
    adminAddress: string
): Promise<string> {
    const result = await callView<[string]>(
        network,
        'TEXAS_HOLDEM',
        'get_table_address',
        [adminAddress]
    );
    return normalizeAddress(result[0]);
}
