// Nova Wallet - Poker Error Utilities
// Maps VM errors to user-friendly messages

// Common error codes from the poker contracts
const POKER_ERROR_CODES: Record<number, string> = {
    1: 'Only the table owner can perform this action',
    2: 'Table already exists',
    3: 'Table not found',
    4: 'That seat is already taken',
    5: 'You are not seated at this table',
    6: 'A hand is already in progress',
    7: 'No active hand',
    8: "It's not your turn",
    9: 'Invalid action',
    10: 'Insufficient chips',
    11: 'Invalid raise amount',
    12: 'Not enough players to start a hand',
    13: 'You have already committed',
    15: 'Invalid secret',
    16: 'Wrong game phase',
    17: 'Table is full',
    18: 'Buy-in is too low',
    19: 'Maximum buy-in exceeds the global table limit. Please reduce your maximum buy-in amount.',
    20: 'You have already revealed',
    21: 'No timeout is available',
    22: 'Straddle is not allowed',
    23: 'Straddle already posted',
    24: 'Only UTG can straddle',
    25: 'Invalid blinds configuration',
    26: 'Invalid buy-in amount',
    27: 'Amount must be greater than zero',
    31: 'Invalid commit size',
    32: 'Invalid secret size',
    33: 'You are already seated',
    34: 'Invalid seat count',
    35: 'Invalid table speed',
    36: 'Abort request not found',
    37: 'Abort vote expired',
    38: 'You already voted on this abort',
    39: 'Abort vote still in progress',
    40: 'Abort request not allowed',
    41: 'Abort request already exists',
    42: 'Cannot finalize abort yet',
    43: 'Invalid table name',
    44: 'Invalid table color',
    45: 'Invalid table name length',
};

// Chips module error codes
const CHIPS_ERROR_CODES: Record<number, string> = {
    3: 'Only admins can perform this action',
    4: 'Only the primary admin can perform this action',
    6: 'Amount must be greater than zero',
    9: 'You already claimed free chips today',
    11: 'Free chip claims are disabled',
    12: 'Insufficient chip balance',
    16: 'That boost option is not available',
    17: 'Cannot downgrade or invalid boost option',
    18: 'Accept the latest casino terms before claiming chips or purchasing boosts',
};

// Common error message patterns
const ERROR_PATTERNS: [RegExp, string][] = [
    [/INSUFFICIENT_BALANCE_FOR_TRANSACTION_FEE/i, "You don't have enough CEDRA to pay for gas fees."],
    [/INSUFFICIENT_BALANCE/i, 'Insufficient balance to complete this action.'],
    [/E_ALREADY_CLAIMED_THIS_PERIOD/i, 'You already claimed free chips today'],
    [/E_INVALID_MULTIPLIER/i, 'That boost option is not available'],
    [/E_CANNOT_DOWNGRADE/i, 'You can only upgrade to a higher boost'],
    [/E_TERMS_NOT_ACKNOWLEDGED/i, 'Accept the latest casino terms before claiming chips or purchasing boosts'],
    [/E_BUY_IN_TOO_HIGH/i, 'Maximum buy-in exceeds the global table limit. Please reduce your maximum buy-in amount.'],
    [/E_FREE_CLAIM_DISABLED/i, 'Free chip claims are disabled'],
    [/E_NOT_YOUR_TURN/i, "It's not your turn to act"],
    [/E_INVALID_RAISE/i, 'Raise amount is invalid'],
    [/E_TABLE_PAUSED/i, 'Table is currently paused'],
    [/E_HAND_ACTIVE/i, 'Cannot perform this action during an active hand'],
    [/E_NO_ACTIVE_HAND/i, 'No hand is currently active'],
    [/E_ALREADY_COMMITTED/i, 'You have already submitted your commitment'],
    [/E_NOT_COMMITTED/i, 'You must commit first before revealing'],
    [/E_SEAT_OCCUPIED/i, 'This seat is already taken'],
    [/E_NOT_SEATED/i, 'You are not seated at this table'],
    [/E_NOT_ADMIN/i, 'Only the table admin can perform this action'],
    [/abort.*failed/i, 'Transaction was aborted by the network'],
    [/execution_failure/i, 'Contract execution failed'],
    [/sequence.*number/i, 'Transaction sequence error - please try again'],
    [/gas.*insufficient/i, 'Insufficient CEDRA for transaction fees'],
];

/**
 * Parse a VM error and return a user-friendly message.
 */
export function parsePokerError(error: unknown): string {
    if (!error) {
        return 'An unknown error occurred';
    }

    const errorString = error instanceof Error ? error.message : String(error);
    const isChipsError = /::chips::|\bchips\b/i.test(errorString);

    // Check for pattern matches
    for (const [pattern, message] of ERROR_PATTERNS) {
        if (pattern.test(errorString)) {
            return message;
        }
    }

    // Check for error code patterns like "error_code: 35"
    const codeMatch = errorString.match(/error[_\s]?code[:\s]*(\d+)/i);
    if (codeMatch) {
        const code = parseInt(codeMatch[1], 10);
        if (isChipsError && CHIPS_ERROR_CODES[code]) {
            return CHIPS_ERROR_CODES[code];
        }
        if (POKER_ERROR_CODES[code]) {
            return POKER_ERROR_CODES[code];
        }
        if (CHIPS_ERROR_CODES[code]) {
            return CHIPS_ERROR_CODES[code];
        }
    }

    // Check for common Move abort codes in the error (supports both decimal and hex)
    // Pattern: E_ERROR_NAME(0x13) or abort code 19 or abort 0x13
    const hexAbortMatch = errorString.match(/E_\w+\(0x([0-9a-f]+)\)|abort[ed]?\s*(?:code|with)?[\s:]*0x([0-9a-f]+)/i);
    if (hexAbortMatch) {
        const hexCode = hexAbortMatch[1] || hexAbortMatch[2];
        const code = parseInt(hexCode, 16);
        if (isChipsError && CHIPS_ERROR_CODES[code]) {
            return CHIPS_ERROR_CODES[code];
        }
        if (POKER_ERROR_CODES[code]) {
            return POKER_ERROR_CODES[code];
        }
        if (CHIPS_ERROR_CODES[code]) {
            return CHIPS_ERROR_CODES[code];
        }
    }
    
    const abortMatch = errorString.match(/abort[ed]?\s*(with|code)?[\s:]*(\d+)/i);
    if (abortMatch) {
        const code = parseInt(abortMatch[2], 10);
        if (isChipsError && CHIPS_ERROR_CODES[code]) {
            return CHIPS_ERROR_CODES[code];
        }
        if (POKER_ERROR_CODES[code]) {
            return POKER_ERROR_CODES[code];
        }
        if (CHIPS_ERROR_CODES[code]) {
            return CHIPS_ERROR_CODES[code];
        }
        return `Transaction aborted (code: ${code})`;
    }

    // Network/RPC errors
    if (errorString.includes('network') || errorString.includes('fetch')) {
        return 'Network error - please check your connection';
    }

    if (errorString.includes('timeout')) {
        return 'Request timed out - please try again';
    }

    // If message is short enough, use it directly
    if (errorString.length < 100 && !errorString.includes('0x')) {
        return errorString;
    }

    // Fallback
    return 'Transaction failed - please try again';
}

/**
 * Check if an error is retryable.
 */
export function isRetryableError(error: unknown): boolean {
    const errorString = error instanceof Error ? error.message : String(error);

    const retryablePatterns = [
        /network/i,
        /timeout/i,
        /fetch/i,
        /sequence.*number/i,
        /rate.?limit/i,
        /too.?many.?requests/i,
        /503/,
        /502/,
        /504/,
    ];

    return retryablePatterns.some(pattern => pattern.test(errorString));
}

/**
 * Get delay for retry based on attempt number.
 */
export function getRetryDelay(attempt: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, capped at 10s
    const baseDelay = 1000;
    const maxDelay = 10000;
    return Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
}

export default {
    parsePokerError,
    isRetryableError,
    getRetryDelay,
};
