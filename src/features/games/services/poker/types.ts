// Nova Wallet - Poker Shared Types
// Data-only DTOs and result shapes for poker services

export interface TransactionResult {
    hash: string;
    success: boolean;
}

export interface TableSummary {
    owner: string;
    smallBlind: number;
    bigBlind: number;
    minBuyIn: number;
    maxBuyIn: number;
    isPaused: boolean;
    ownerOnlyStart: boolean;
    occupiedSeats: number;
    totalSeats: number;
    hasActiveGame: boolean;
    ante: number;
    straddleEnabled: boolean;
    tableSpeed: number;
    name: string;
    colorIndex: number;
}

export interface TableConfig {
    smallBlind: number;
    bigBlind: number;
    minBuyIn: number;
    maxBuyIn: number;
    ante: number;
    straddleEnabled: boolean;
}

export interface TableState {
    handNumber: number;
    dealerSeat: number;
    nextBigBlindSeat: number;
}

export interface SeatInfo {
    playerAddress: string | null;
    chipCount: number;
    isSittingOut: boolean;
    currentBet: number;
    status: number;
}

export interface GameState {
    phase: number;
    actionOnSeat: number;
    actionOnPlayer: string;
    actionDeadline: number;
    potSize: number;
    communityCards: number[];
    minRaise: number;
    maxBet: number;
}

export interface ActionInfo {
    seatIdx: number;
    playerAddr: string;
    deadline: number;
}

export interface AbortStatus {
    timestamp: number;
    approvals: number;
    vetos: number;
    deadline: number;
    seatedCount: number;
}
