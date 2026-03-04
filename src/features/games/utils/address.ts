// Nova Wallet - Shared Address Utilities

/**
 * Normalize a chain address for comparisons and UI display.
 * - Lowercases
 * - Ensures a 0x prefix
 * - Strips left-padding zeros so padded and short forms compare equally
 * - Returns "0x0" for zero-addresses
 *
 * Use this for chain/account addresses (e.g., poker seat addresses, events).
 */
export function normalizeAddress(address: string | null | undefined): string {
    if (!address) return '';
    const trimmed = address.trim().toLowerCase();
    if (!trimmed) return '';

    const hex = trimmed.startsWith('0x') ? trimmed.slice(2) : trimmed;
    const stripped = hex.replace(/^0+/, '');
    return stripped === '' ? '0x0' : `0x${stripped}`;
}

/**
 * Check if an address represents an empty/zero address.
 * Treats empty, "0x", "0x0", and fully-zero padded values as empty.
 */
export function isEmptyAddress(address: string | null | undefined): boolean {
    if (!address) return true;
    const normalized = address.trim().toLowerCase();
    return normalized === '0x0' || normalized === '0x' || /^0x0+$/.test(normalized);
}

/**
 * Normalize a token address for swaps/pools.
 * - Converts CEDRA coin type to its FA metadata object address
 * - Leaves Move type strings intact (e.g., 0x1::module::Type)
 * - Ensures 0x prefix and 64-nybble padding for object addresses
 *
 * Use this for token/object addresses (e.g., Avera pool inputs).
 */
export function normalizeTokenAddress(address: string): string {
    if (!address) return '';

    const trimmed = address.trim();
    if (!trimmed) return '';

    // Handle Move coin types (e.g., 0x1::cedra_coin::CedraCoin)
    if (trimmed === CEDRA_NATIVE_COIN || trimmed.includes('cedra_coin::CedraCoin')) {
        return CEDRA_POOL_ADDRESS;
    }

    // Other coin types are not supported for pools
    if (trimmed.includes('::')) {
        return trimmed;
    }

    let normalized = trimmed.toLowerCase();
    if (!normalized.startsWith('0x')) {
        normalized = `0x${normalized}`;
    }

    const hexPart = normalized.slice(2);
    if (hexPart.length < 64) {
        normalized = `0x${hexPart.padStart(64, '0')}`;
    }

    return normalized;
}

// Avera/Cedra constants used in token normalization.
export const CEDRA_NATIVE_COIN = '0x1::cedra_coin::CedraCoin';
export const CEDRA_POOL_ADDRESS = '0x000000000000000000000000000000000000000000000000000000000000000a';
