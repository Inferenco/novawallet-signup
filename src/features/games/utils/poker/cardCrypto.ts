// Nova Wallet - Card Crypto Utilities
// Key derivation and XOR decryption for encrypted hole cards
//
// Cards are XOR-encrypted using per-player keys derived from their commit secrets.
// The contract uses: key = SHA3-256(secret || "HOLECARDS" || BCS(seat_idx_u64))

import { sha3_256 } from '@noble/hashes/sha3';

/**
 * Derive a card decryption key from the player's secret and seat index.
 * Matches the contract's derive_card_key function EXACTLY.
 *
 * Contract implementation (texas_holdem.move):
 * ```move
 * fun derive_card_key(secret: &vector<u8>, seat_idx: u64): vector<u8> {
 *     let key_material = vector::empty<u8>();
 *     vector::append(&mut key_material, *secret);          // 1. SECRET bytes
 *     vector::append(&mut key_material, b"HOLECARDS");     // 2. "HOLECARDS" (9 bytes)
 *     let seat_bytes = bcs::to_bytes(&seat_idx);           // 3. BCS-encoded u64 (8 bytes LE)
 *     vector::append(&mut key_material, seat_bytes);
 *     hash::sha3_256(key_material)
 * }
 * ```
 *
 * @param secret - The player's reveal secret (same string sent to contract)
 * @param seatIdx - The player's seat index (0-4)
 * @returns 32-byte key as Uint8Array
 */
export function deriveCardKey(secret: string | Uint8Array, seatIdx: number): Uint8Array {
    // Convert secret to bytes using TextEncoder - matches how reveal sends it
    let secretBytes: Uint8Array;
    if (typeof secret === 'string') {
        secretBytes = new TextEncoder().encode(secret);
    } else {
        secretBytes = secret;
    }

    // Domain separator must match contract EXACTLY: "HOLECARDS" (9 bytes)
    const domainSeparator = new TextEncoder().encode('HOLECARDS');

    // Seat index as BCS-encoded u64 (8 bytes, little-endian)
    const seatBytes = new Uint8Array(8);
    const view = new DataView(seatBytes.buffer);
    view.setBigUint64(0, BigInt(seatIdx), true); // true = little-endian

    // Combine in CONTRACT ORDER: secret || "HOLECARDS" || seat_idx_bcs
    const combined = new Uint8Array(secretBytes.length + domainSeparator.length + seatBytes.length);
    combined.set(secretBytes, 0);
    combined.set(domainSeparator, secretBytes.length);
    combined.set(seatBytes, secretBytes.length + domainSeparator.length);

    // Hash with SHA3-256
    return sha3_256(combined);
}

/**
 * XOR decrypt cards using the derived key.
 * Each card is XORed with the corresponding byte of the key.
 *
 * @param encryptedCards - Array of encrypted card bytes (2 cards)
 * @param key - 32-byte decryption key
 * @returns Decrypted card values
 */
export function xorDecryptCards(encryptedCards: number[], key: Uint8Array): number[] {
    return encryptedCards.map((card, i) => card ^ key[i % key.length]);
}

/**
 * Attempt to decrypt hole cards for the current player.
 *
 * @param encryptedCards - The encrypted hole cards from the contract
 * @param secret - The player's reveal secret
 * @param seatIdx - The player's seat index
 * @returns Decrypted card values, or original if decryption fails
 */
export function decryptHoleCards(
    encryptedCards: number[],
    secret: string | null,
    seatIdx: number
): number[] {
    if (!secret || encryptedCards.length !== 2) {
        return encryptedCards;
    }

    try {
        const key = deriveCardKey(secret, seatIdx);
        return xorDecryptCards(encryptedCards, key);
    } catch (error) {
        console.warn('Failed to decrypt hole cards:', error);
        return encryptedCards;
    }
}

/**
 * Validate that a card value is in valid range (0-51).
 * If cards are outside this range, decryption likely failed.
 */
export function isValidCard(cardValue: number): boolean {
    return Number.isInteger(cardValue) && cardValue >= 0 && cardValue <= 51;
}

/**
 * Check if decrypted cards are valid.
 */
export function areCardsValid(cards: number[]): boolean {
    return cards.length === 2 && cards.every(isValidCard);
}

/**
 * Create a commit hash from a secret using SHA3-256.
 *
 * @param secret - The secret string to hash
 * @returns 32-byte hash as Uint8Array
 */
export function createCommitHash(secret: string): Uint8Array {
    const secretBytes = new TextEncoder().encode(secret);
    return sha3_256(secretBytes);
}

/**
 * Generate a cryptographically secure random secret.
 *
 * @returns 32-character hex string (16 bytes)
 */
export function generateSecret(): string {
    const bytes = new Uint8Array(16);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(bytes);
    } else {
        // Fallback for environments without crypto.getRandomValues
        for (let i = 0; i < bytes.length; i++) {
            bytes[i] = Math.floor(Math.random() * 256);
        }
    }
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Convert a Uint8Array to hex string for display or storage.
 */
export function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Convert a hex string to Uint8Array.
 */
export function hexToBytes(hex: string): Uint8Array {
    const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
    const bytes = new Uint8Array(cleanHex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
    }
    return bytes;
}
