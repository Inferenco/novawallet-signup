// Nova Wallet - Card Display Utilities
// Decode card values and provide display helpers for UI

// Card encoding: card = suit * 13 + rank
// Ranks: 0=2, 1=3, ..., 8=T, 9=J, 10=Q, 11=K, 12=A
// Suits: 0=Clubs, 1=Diamonds, 2=Hearts, 3=Spades

export interface DecodedCard {
    rank: number;      // 0-12 (2-A)
    suit: number;      // 0-3 (Clubs, Diamonds, Hearts, Spades)
    rankSymbol: string;
    suitSymbol: string;
    suitName: string;
    name: string;      // e.g., "A♠" or "10♥"
    color: string;     // 'red' or 'black'
}

const RANK_SYMBOLS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const RANK_NAMES = ['Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Jack', 'Queen', 'King', 'Ace'];
const SUIT_SYMBOLS = ['♣', '♦', '♥', '♠'];
const SUIT_NAMES = ['Clubs', 'Diamonds', 'Hearts', 'Spades'];
const SUIT_COLORS = ['black', 'red', 'red', 'black'];

/**
 * Decode a card value (0-51) into its components.
 */
export function decodeCard(value: number): DecodedCard {
    const suit = Math.floor(value / 13);
    const rank = value % 13;

    return {
        rank,
        suit,
        rankSymbol: RANK_SYMBOLS[rank] || '?',
        suitSymbol: SUIT_SYMBOLS[suit] || '?',
        suitName: SUIT_NAMES[suit] || 'Unknown',
        name: `${RANK_SYMBOLS[rank] || '?'}${SUIT_SYMBOLS[suit] || '?'}`,
        color: SUIT_COLORS[suit] || 'black',
    };
}

/**
 * Get the rank symbol for a rank value.
 */
export function getRankSymbol(rank: number): string {
    return RANK_SYMBOLS[rank] || '?';
}

/**
 * Get the rank name for a rank value.
 */
export function getRankName(rank: number): string {
    return RANK_NAMES[rank] || 'Unknown';
}

/**
 * Get the suit symbol for a suit value.
 */
export function getSuitSymbol(suit: number): string {
    return SUIT_SYMBOLS[suit] || '?';
}

/**
 * Get the suit name for a suit value.
 */
export function getSuitName(suit: number): string {
    return SUIT_NAMES[suit] || 'Unknown';
}

/**
 * Get the color for a suit value ('red' or 'black').
 */
export function getSuitColor(suit: number): 'red' | 'black' {
    return SUIT_COLORS[suit] === 'red' ? 'red' : 'black';
}

/**
 * Format a card for display.
 */
export function formatCard(value: number): string {
    const card = decodeCard(value);
    return card.name;
}

/**
 * Format multiple cards for display.
 */
export function formatCards(values: number[]): string {
    return values.map(formatCard).join(' ');
}

/**
 * Get a display-friendly description of a hand ranking.
 */
export function getHandRankDescription(rankValue: number): string {
    const descriptions: Record<number, string> = {
        0: 'High Card',
        1: 'One Pair',
        2: 'Two Pair',
        3: 'Three of a Kind',
        4: 'Straight',
        5: 'Flush',
        6: 'Full House',
        7: 'Four of a Kind',
        8: 'Straight Flush',
        9: 'Royal Flush',
    };
    return descriptions[rankValue] || 'Unknown';
}

/**
 * Parse community cards from contract format to decoded cards.
 */
export function parseCommunityCards(cardValues: number[]): DecodedCard[] {
    return cardValues.map(decodeCard);
}

/**
 * Check if a card value represents a face card (J, Q, K).
 */
export function isFaceCard(value: number): boolean {
    const rank = value % 13;
    return rank >= 9 && rank <= 11; // J, Q, K
}

/**
 * Check if a card value represents an ace.
 */
export function isAce(value: number): boolean {
    const rank = value % 13;
    return rank === 12;
}

/**
 * Get the pip count for card display (2-10 show pips, face cards show symbols).
 */
export function getPipCount(value: number): number {
    const rank = value % 13;
    if (rank <= 8) return rank + 2; // 2-10
    return 0; // Face cards and Ace don't use pips
}
