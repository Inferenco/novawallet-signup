// Nova Wallet - Poker Chips Service
// Chip balance, daily claim, and multiplier economy functions

import { getCedraClient } from '../../core/transactions';
import type { NetworkType } from '../../utils/constants';
import { buildFunctionId } from '../../config/games';

const reportedViewErrors = new Set<string>();
let multiplierViewsSupported: boolean | null = null;

function reportViewErrorOnce(key: string, error: unknown) {
    if (!import.meta.env.DEV || reportedViewErrors.has(key)) return;
    reportedViewErrors.add(key);
    console.debug(`[Games chips] ${key} view failed`, error);
}

function isMissingEntryFunctionError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const message = error.message.toLowerCase();
    return message.includes('could not find entry function');
}

// ============================================================================
// View Functions
// ============================================================================

/**
 * Get chip balance for a player.
 */
export async function getChipBalance(
    network: NetworkType,
    playerAddress: string
): Promise<number> {
    const cedra = getCedraClient(network);
    const functionId = buildFunctionId(network, 'CHIPS', 'balance');

    try {
        const result = await cedra.view({
            payload: {
                function: functionId as `${string}::${string}::${string}`,
                typeArguments: [],
                functionArguments: [playerAddress],
            },
        });
        return Number(result[0]);
    } catch (error) {
        reportViewErrorOnce('chip_balance', error);
        return 0;
    }
}

/**
 * Get daily free chips amount.
 */
export async function getDailyFreeAmount(
    network: NetworkType
): Promise<number> {
    const cedra = getCedraClient(network);
    const functionId = buildFunctionId(network, 'CHIPS', 'get_daily_free_amount');

    try {
        const result = await cedra.view({
            payload: {
                function: functionId as `${string}::${string}::${string}`,
                typeArguments: [],
                functionArguments: [],
            },
        });
        return Number(result[0]);
    } catch (error) {
        reportViewErrorOnce('daily_free_amount', error);
        return 0;
    }
}

/**
 * Get last daily claim time for player.
 */
export async function getLastClaimTime(
    network: NetworkType,
    playerAddress: string
): Promise<number> {
    const cedra = getCedraClient(network);
    const functionId = buildFunctionId(network, 'CHIPS', 'get_last_claim_time');

    try {
        const result = await cedra.view({
            payload: {
                function: functionId as `${string}::${string}::${string}`,
                typeArguments: [],
                functionArguments: [playerAddress],
            },
        });
        return Number(result[0]);
    } catch (error) {
        reportViewErrorOnce('last_claim_time', error);
        return 0;
    }
}

/**
 * Get active multiplier options (factors).
 */
export async function getMultiplierOptions(
    network: NetworkType
): Promise<number[]> {
    if (multiplierViewsSupported === false) {
        return [];
    }

    const cedra = getCedraClient(network);
    const functionId = buildFunctionId(network, 'CHIPS', 'get_multiplier_options');

    try {
        const result = await cedra.view({
            payload: {
                function: functionId as `${string}::${string}::${string}`,
                typeArguments: [],
                functionArguments: [],
            },
        });

        const raw = result[0];
        multiplierViewsSupported = true;

        // If it's already an array, use it directly
        if (Array.isArray(raw)) {
            return raw.map((value) => Number(value));
        }

        // If it's a hex string (e.g., "0x02030405"), decode it to [2, 3, 4, 5]
        if (typeof raw === 'string' && raw.startsWith('0x')) {
            const hex = raw.slice(2); // Remove "0x" prefix
            const bytes: number[] = [];
            for (let i = 0; i < hex.length; i += 2) {
                bytes.push(parseInt(hex.slice(i, i + 2), 16));
            }
            return bytes;
        }

        return [];
    } catch (error) {
        if (isMissingEntryFunctionError(error)) {
            multiplierViewsSupported = false;
        }
        reportViewErrorOnce('multiplier_options', error);
        return [];
    }
}

/**
 * Get multiplier price for a factor (in octas).
 */
export async function getMultiplierPrice(
    network: NetworkType,
    factor: number
): Promise<bigint> {
    if (multiplierViewsSupported === false) {
        return 0n;
    }

    const cedra = getCedraClient(network);
    const functionId = buildFunctionId(network, 'CHIPS', 'get_multiplier_price');

    try {
        const result = await cedra.view({
            payload: {
                function: functionId as `${string}::${string}::${string}`,
                typeArguments: [],
                functionArguments: [factor],
            },
        });
        multiplierViewsSupported = true;
        const value = result[0];
        if (typeof value === 'bigint') return value;
        if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
            return BigInt(value);
        }
        return 0n;
    } catch (error) {
        if (isMissingEntryFunctionError(error)) {
            multiplierViewsSupported = false;
        }
        reportViewErrorOnce(`multiplier_price_${factor}`, error);
        return 0n;
    }
}

/**
 * Get multiplier duration (seconds).
 */
export async function getMultiplierDuration(
    network: NetworkType
): Promise<number> {
    if (multiplierViewsSupported === false) {
        return 0;
    }

    const cedra = getCedraClient(network);
    const functionId = buildFunctionId(network, 'CHIPS', 'get_multiplier_duration');

    try {
        const result = await cedra.view({
            payload: {
                function: functionId as `${string}::${string}::${string}`,
                typeArguments: [],
                functionArguments: [],
            },
        });
        multiplierViewsSupported = true;
        return Number(result[0]);
    } catch (error) {
        if (isMissingEntryFunctionError(error)) {
            multiplierViewsSupported = false;
        }
        reportViewErrorOnce('multiplier_duration', error);
        return 0;
    }
}

/**
 * Get free claim period in seconds.
 */
export async function getFreeClaimPeriodSeconds(
    network: NetworkType
): Promise<number> {
    if (multiplierViewsSupported === false) {
        return 10800;
    }

    const cedra = getCedraClient(network);
    const functionId = buildFunctionId(network, 'CHIPS', 'get_free_claim_period_seconds');

    try {
        const result = await cedra.view({
            payload: {
                function: functionId as `${string}::${string}::${string}`,
                typeArguments: [],
                functionArguments: [],
            },
        });
        multiplierViewsSupported = true;
        return Number(result[0]);
    } catch (error) {
        if (isMissingEntryFunctionError(error)) {
            multiplierViewsSupported = false;
        }
        reportViewErrorOnce('free_claim_period', error);
        return 10800; // Default: 3 hours
    }
}

/**
 * Get multiplier status for a player.
 */
export async function getMultiplierStatus(
    network: NetworkType,
    playerAddress: string
): Promise<{ factor: number; startedAt: number; expiresAt: number }> {
    if (multiplierViewsSupported === false) {
        return { factor: 1, startedAt: 0, expiresAt: 0 };
    }

    const cedra = getCedraClient(network);
    const functionId = buildFunctionId(network, 'CHIPS', 'get_multiplier_status');

    try {
        const result = await cedra.view({
            payload: {
                function: functionId as `${string}::${string}::${string}`,
                typeArguments: [],
                functionArguments: [playerAddress],
            },
        });
        multiplierViewsSupported = true;
        return {
            factor: Number(result[0] ?? 1),
            startedAt: Number(result[1] ?? 0),
            expiresAt: Number(result[2] ?? 0),
        };
    } catch (error) {
        if (isMissingEntryFunctionError(error)) {
            multiplierViewsSupported = false;
        }
        reportViewErrorOnce('multiplier_status', error);
        return { factor: 1, startedAt: 0, expiresAt: 0 };
    }
}

/**
 * Get treasury balance.
 */
export async function getTreasuryBalance(
    network: NetworkType
): Promise<number> {
    const cedra = getCedraClient(network);
    const functionId = buildFunctionId(network, 'GAMES_TREASURY', 'get_treasury_balance');

    try {
        const result = await cedra.view({
            payload: {
                function: functionId as `${string}::${string}::${string}`,
                typeArguments: [],
                functionArguments: [],
            },
        });
        return Number(result[0]);
    } catch {
        return 0;
    }
}

/**
 * Get total chip supply.
 */
export async function getTotalChipSupply(
    network: NetworkType
): Promise<number> {
    const cedra = getCedraClient(network);
    const functionId = buildFunctionId(network, 'CHIPS', 'get_total_chip_supply');

    try {
        const result = await cedra.view({
            payload: {
                function: functionId as `${string}::${string}::${string}`,
                typeArguments: [],
                functionArguments: [],
            },
        });
        return Number(result[0]);
    } catch {
        return 0;
    }
}

// ============================================================================
// Claim Helpers
// ============================================================================

/**
 * Check if a player can claim free chips based on claim period.
 * @param lastClaimTime Last claim timestamp (seconds or milliseconds)
 * @param claimPeriodSeconds Claim period in seconds (from contract)
 */
export function canClaimFreeChips(lastClaimTime: number, claimPeriodSeconds: number): boolean {
    if (!lastClaimTime) return true;
    const lastClaimMs = lastClaimTime < 1_000_000_000_000 ? lastClaimTime * 1000 : lastClaimTime;
    const nextEligible = lastClaimMs + claimPeriodSeconds * 1000;
    return Date.now() >= nextEligible;
}

/**
 * Time remaining until next free claim (ms).
 * @param lastClaimTime Last claim timestamp (seconds or milliseconds)
 * @param claimPeriodSeconds Claim period in seconds (from contract)
 */
export function getTimeUntilNextClaim(lastClaimTime: number, claimPeriodSeconds: number): number {
    if (!lastClaimTime) return 0;
    const lastClaimMs = lastClaimTime < 1_000_000_000_000 ? lastClaimTime * 1000 : lastClaimTime;
    const nextEligible = lastClaimMs + claimPeriodSeconds * 1000;
    return Math.max(0, Math.floor((nextEligible - Date.now()) / 1000));
}

// ============================================================================
// Formatting
// ============================================================================

/**
 * Format chip amount for display.
 */
export function formatChips(chips: number): string {
    const absoluteChips = Math.abs(chips);

    if (absoluteChips < 10_000) {
        return chips.toLocaleString();
    }

    const suffixes = ['', 'k', 'm', 'b', 't'];
    let compactValue = chips;
    let suffixIndex = 0;

    while (Math.abs(compactValue) >= 1000 && suffixIndex < suffixes.length - 1) {
        compactValue /= 1000;
        suffixIndex += 1;
    }

    // Handle rounding edge cases (e.g. 999.999k -> 1m).
    let roundedValue = Number(compactValue.toFixed(2));
    while (Math.abs(roundedValue) >= 1000 && suffixIndex < suffixes.length - 1) {
        roundedValue = Number((roundedValue / 1000).toFixed(2));
        suffixIndex += 1;
    }

    return `${roundedValue.toString()}${suffixes[suffixIndex]}`;
}
