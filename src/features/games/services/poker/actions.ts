// Nova Wallet - Poker Entry Functions
// Transaction builders for all poker contract actions

import type { GameSigner } from "../../types";
import type { NetworkType } from '../../utils/constants';
import { MAX_SEATS } from '../../config/games';
import { submitTransaction } from './client';
import type { TransactionResult } from './types';

// ============================================================================
// Chip Actions
// ============================================================================

/**
 * Purchase a multiplier boost.
 * @param factor - Multiplier factor (e.g., 2, 3, 4)
 */
export async function purchaseMultiplier(
    network: NetworkType,
    signer: GameSigner,
    factor: number
): Promise<TransactionResult> {
    return submitTransaction(network, signer, 'CHIPS', 'purchase_multiplier', [factor], []);
}

/**
 * Claim daily free chips.
 */
export async function claimFreeChips(
    network: NetworkType,
    signer: GameSigner
): Promise<TransactionResult> {
    return submitTransaction(network, signer, 'CHIPS', 'claim_free_chips', []);
}
// ============================================================================
// Table Management
// ============================================================================

/**
 * Create a new poker table.
 */
export async function createTable(
    network: NetworkType,
    signer: GameSigner,
    params: {
        smallBlind: bigint;
        bigBlind: bigint;
        minBuyIn: bigint;
        maxBuyIn: bigint;
        ante: bigint;
        straddleEnabled: boolean;
        tableSpeed?: number;
        name?: string;
        colorIndex?: number;
    }
): Promise<TransactionResult> {
    const rawName = params.name?.trim() ?? '';
    const sanitizedName = rawName.replace(/[^A-Za-z0-9 _-]/g, '').slice(0, 32);
    const resolvedName = sanitizedName.length >= 3 ? sanitizedName : 'Nova Table';

    return submitTransaction(network, signer, 'TEXAS_HOLDEM', 'create_table', [
        params.smallBlind,
        params.bigBlind,
        params.minBuyIn,
        params.maxBuyIn,
        params.ante,
        params.straddleEnabled,
        MAX_SEATS, // Always 5 seats
        params.tableSpeed ?? 0,
        resolvedName,
        params.colorIndex ?? 0,
    ]);
}

/**
 * Join a table at a specific seat.
 */
export async function joinTable(
    network: NetworkType,
    signer: GameSigner,
    tableAddress: string,
    seatIndex: number,
    buyIn: bigint
): Promise<TransactionResult> {
    return submitTransaction(network, signer, 'TEXAS_HOLDEM', 'join_table', [
        tableAddress,
        seatIndex,
        buyIn,
    ]);
}

/**
 * Leave the table.
 */
export async function leaveTable(
    network: NetworkType,
    signer: GameSigner,
    tableAddress: string
): Promise<TransactionResult> {
    return submitTransaction(network, signer, 'TEXAS_HOLDEM', 'leave_table', [
        tableAddress,
    ]);
}

/**
 * Top up chips at the table (between hands only).
 */
export async function topUp(
    network: NetworkType,
    signer: GameSigner,
    tableAddress: string,
    amount: bigint
): Promise<TransactionResult> {
    return submitTransaction(network, signer, 'TEXAS_HOLDEM', 'top_up', [
        tableAddress,
        amount,
    ]);
}

// ============================================================================
// Seat Controls
// ============================================================================

/**
 * Sit out of the current hand.
 */
export async function sitOut(
    network: NetworkType,
    signer: GameSigner,
    tableAddress: string
): Promise<TransactionResult> {
    return submitTransaction(network, signer, 'TEXAS_HOLDEM', 'sit_out', [
        tableAddress,
    ]);
}

/**
 * Sit back in for the next hand.
 */
export async function sitIn(
    network: NetworkType,
    signer: GameSigner,
    tableAddress: string
): Promise<TransactionResult> {
    return submitTransaction(network, signer, 'TEXAS_HOLDEM', 'sit_in', [
        tableAddress,
    ]);
}

/**
 * Request to leave after the current hand.
 */
export async function leaveAfterHand(
    network: NetworkType,
    signer: GameSigner,
    tableAddress: string
): Promise<TransactionResult> {
    return submitTransaction(network, signer, 'TEXAS_HOLDEM', 'leave_after_hand', [
        tableAddress,
    ]);
}

/**
 * Cancel pending leave after hand.
 */
export async function cancelLeaveAfterHand(
    network: NetworkType,
    signer: GameSigner,
    tableAddress: string
): Promise<TransactionResult> {
    return submitTransaction(network, signer, 'TEXAS_HOLDEM', 'cancel_leave_after_hand', [
        tableAddress,
    ]);
}

// ============================================================================
// Hand Lifecycle
// ============================================================================

/**
 * Start a new hand.
 */
export async function startHand(
    network: NetworkType,
    signer: GameSigner,
    tableAddress: string
): Promise<TransactionResult> {
    return submitTransaction(network, signer, 'TEXAS_HOLDEM', 'start_hand', [
        tableAddress,
    ]);
}

/**
 * Submit commit hash for card dealing.
 */
export async function submitCommit(
    network: NetworkType,
    signer: GameSigner,
    tableAddress: string,
    commitHash: Uint8Array
): Promise<TransactionResult> {
    // Pass byte array directly for proper serialization as vector<u8>
    // (Hex strings can cause byte count issues with the SDK)
    return submitTransaction(network, signer, 'TEXAS_HOLDEM', 'submit_commit', [
        tableAddress,
        Array.from(commitHash),
    ]);
}

/**
 * Reveal the secret to decrypt cards.
 */
export async function revealSecret(
    network: NetworkType,
    signer: GameSigner,
    tableAddress: string,
    secret: string
): Promise<TransactionResult> {
    // Convert secret string to bytes and pass as array for proper serialization
    // (Hex strings can cause byte count issues with the SDK)
    const secretBytes = new TextEncoder().encode(secret);
    return submitTransaction(network, signer, 'TEXAS_HOLDEM', 'reveal_secret', [
        tableAddress,
        Array.from(secretBytes),
    ]);
}

// ============================================================================
// Betting Actions
// ============================================================================

/**
 * Fold current hand.
 */
export async function fold(
    network: NetworkType,
    signer: GameSigner,
    tableAddress: string
): Promise<TransactionResult> {
    return submitTransaction(network, signer, 'TEXAS_HOLDEM', 'fold', [
        tableAddress,
    ]);
}

/**
 * Check (pass action with no bet).
 */
export async function check(
    network: NetworkType,
    signer: GameSigner,
    tableAddress: string
): Promise<TransactionResult> {
    return submitTransaction(network, signer, 'TEXAS_HOLDEM', 'check', [
        tableAddress,
    ]);
}

/**
 * Call the current bet.
 */
export async function call(
    network: NetworkType,
    signer: GameSigner,
    tableAddress: string
): Promise<TransactionResult> {
    return submitTransaction(network, signer, 'TEXAS_HOLDEM', 'call', [
        tableAddress,
    ]);
}

/**
 * Raise to a specific amount.
 */
export async function raiseTo(
    network: NetworkType,
    signer: GameSigner,
    tableAddress: string,
    amount: bigint
): Promise<TransactionResult> {
    return submitTransaction(network, signer, 'TEXAS_HOLDEM', 'raise_to', [
        tableAddress,
        amount,
    ]);
}

/**
 * Go all-in.
 */
export async function allIn(
    network: NetworkType,
    signer: GameSigner,
    tableAddress: string
): Promise<TransactionResult> {
    return submitTransaction(network, signer, 'TEXAS_HOLDEM', 'all_in', [
        tableAddress,
    ]);
}

/**
 * Post a straddle (UTG only, preflop, before any action).
 */
export async function straddle(
    network: NetworkType,
    signer: GameSigner,
    tableAddress: string
): Promise<TransactionResult> {
    return submitTransaction(network, signer, 'TEXAS_HOLDEM', 'straddle', [
        tableAddress,
    ]);
}

// ============================================================================
// Timeout & Abort
// ============================================================================

/**
 * Handle a timeout (anyone can call when deadline passed).
 */
export async function handleTimeout(
    network: NetworkType,
    signer: GameSigner,
    tableAddress: string
): Promise<TransactionResult> {
    return submitTransaction(network, signer, 'TEXAS_HOLDEM', 'handle_timeout', [
        tableAddress,
    ]);
}

/**
 * Request an abort vote (admin only).
 */
export async function requestAbort(
    network: NetworkType,
    signer: GameSigner,
    tableAddress: string
): Promise<TransactionResult> {
    return submitTransaction(network, signer, 'TEXAS_HOLDEM', 'request_abort', [
        tableAddress,
    ]);
}

/**
 * Vote on an abort request.
 */
export async function voteAbort(
    network: NetworkType,
    signer: GameSigner,
    tableAddress: string,
    approve: boolean
): Promise<TransactionResult> {
    return submitTransaction(network, signer, 'TEXAS_HOLDEM', 'vote_abort', [
        tableAddress,
        approve,
    ]);
}

/**
 * Finalize an abort vote.
 */
export async function finalizeAbort(
    network: NetworkType,
    signer: GameSigner,
    tableAddress: string
): Promise<TransactionResult> {
    return submitTransaction(network, signer, 'TEXAS_HOLDEM', 'finalize_abort', [
        tableAddress,
    ]);
}

/**
 * Cancel an abort request (admin only).
 */
export async function cancelAbortRequest(
    network: NetworkType,
    signer: GameSigner,
    tableAddress: string
): Promise<TransactionResult> {
    return submitTransaction(network, signer, 'TEXAS_HOLDEM', 'cancel_abort_request', [
        tableAddress,
    ]);
}

// ============================================================================
// Owner Controls
// ============================================================================

/**
 * Pause the table.
 */
export async function pauseTable(
    network: NetworkType,
    signer: GameSigner,
    tableAddress: string
): Promise<TransactionResult> {
    return submitTransaction(network, signer, 'TEXAS_HOLDEM', 'pause_table', [
        tableAddress,
    ]);
}

/**
 * Resume the table.
 */
export async function resumeTable(
    network: NetworkType,
    signer: GameSigner,
    tableAddress: string
): Promise<TransactionResult> {
    return submitTransaction(network, signer, 'TEXAS_HOLDEM', 'resume_table', [
        tableAddress,
    ]);
}

/**
 * Toggle owner-only start.
 */
export async function toggleOwnerOnlyStart(
    network: NetworkType,
    signer: GameSigner,
    tableAddress: string,
    enabled: boolean
): Promise<TransactionResult> {
    return submitTransaction(network, signer, 'TEXAS_HOLDEM', 'toggle_owner_only_start', [
        tableAddress,
        enabled,
    ]);
}

/**
 * Update blinds.
 */
export async function updateBlinds(
    network: NetworkType,
    signer: GameSigner,
    tableAddress: string,
    smallBlind: bigint,
    bigBlind: bigint
): Promise<TransactionResult> {
    return submitTransaction(network, signer, 'TEXAS_HOLDEM', 'update_blinds', [
        tableAddress,
        smallBlind,
        bigBlind,
    ]);
}

/**
 * Update ante.
 */
export async function updateAnte(
    network: NetworkType,
    signer: GameSigner,
    tableAddress: string,
    ante: bigint
): Promise<TransactionResult> {
    return submitTransaction(network, signer, 'TEXAS_HOLDEM', 'update_ante', [
        tableAddress,
        ante,
    ]);
}

/**
 * Toggle straddle.
 */
export async function toggleStraddle(
    network: NetworkType,
    signer: GameSigner,
    tableAddress: string,
    enabled: boolean
): Promise<TransactionResult> {
    return submitTransaction(network, signer, 'TEXAS_HOLDEM', 'toggle_straddle', [
        tableAddress,
        enabled,
    ]);
}

/**
 * Update buy-in limits.
 */
export async function updateBuyInLimits(
    network: NetworkType,
    signer: GameSigner,
    tableAddress: string,
    minBuyIn: bigint,
    maxBuyIn: bigint
): Promise<TransactionResult> {
    return submitTransaction(network, signer, 'TEXAS_HOLDEM', 'update_buy_in_limits', [
        tableAddress,
        minBuyIn,
        maxBuyIn,
    ]);
}

/**
 * Kick a player from the table.
 */
export async function kickPlayer(
    network: NetworkType,
    signer: GameSigner,
    tableAddress: string,
    seatIndex: number
): Promise<TransactionResult> {
    return submitTransaction(network, signer, 'TEXAS_HOLDEM', 'kick_player', [
        tableAddress,
        seatIndex,
    ]);
}

/**
 * Transfer table ownership.
 */
export async function transferOwnership(
    network: NetworkType,
    signer: GameSigner,
    tableAddress: string,
    newOwner: string
): Promise<TransactionResult> {
    return submitTransaction(network, signer, 'TEXAS_HOLDEM', 'transfer_ownership', [
        tableAddress,
        newOwner,
    ]);
}

/**
 * Close the table and refund all players.
 */
export async function closeTable(
    network: NetworkType,
    signer: GameSigner,
    tableAddress: string
): Promise<TransactionResult> {
    return submitTransaction(network, signer, 'TEXAS_HOLDEM', 'close_table', [
        tableAddress,
    ]);
}
