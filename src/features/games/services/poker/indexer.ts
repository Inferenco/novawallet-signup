/* eslint-disable @typescript-eslint/no-explicit-any, no-empty */
// Nova Wallet - Poker Indexer Service
// Event fetching and table discovery via GraphQL

import type { NetworkType } from '../../utils/constants';
import { getGameContract } from '../../config/games';
import { getTableSummary } from './views';
import type { TableSummary } from './types';
import { normalizeAddress } from '../../utils/address';
import { CHAIN_CONFIG } from "@/config/chain";

// ============================================================================
// Types
// ============================================================================

export interface IndexerEvent {
    type: string;
    data: Record<string, unknown>;
    transactionVersion: string;
    sequenceNumber?: number;
}

export interface TableCreatedEvent {
    tableAddress: string;
    owner: string;
    name: string;
    timestamp: number;
}

export interface TableClosedEvent {
    tableAddress: string;
    timestamp: number;
}

export interface HandResultEvent {
    tableAddress: string;
    handNumber: number;
    timestamp: number;
    resultType: number; // 0 = showdown, 1 = fold_win
    // Winner info
    winnerSeats: number[];
    winnerPlayers: string[];
    winnerAmounts: number[];
    // Showdown info (players who reached showdown)
    showdownSeats: number[];
    showdownPlayers: string[];
    showdownHoleCards: number[][];
    showdownHandTypes: number[];
    // Board
    communityCards: number[];
    totalPot: number;
}

export interface DiscoveredTable extends TableSummary {
    tableAddress: string;
}

// ============================================================================
// GraphQL Helpers
// ============================================================================

const GRAPHQL_ENDPOINT = CHAIN_CONFIG.gamesIndexerUrl;

interface GraphQLResponse<T> {
    data?: T;
    errors?: Array<{ message: string }>;
}

async function queryIndexer<T>(
    network: NetworkType,
    query: string,
    variables: Record<string, unknown> = {}
): Promise<T | null> {
    // For now, we only support Cedra testnet indexer
    if (network !== 'testnet') {
        console.warn('Indexer only available on testnet');
        return null;
    }

    try {
        console.log('[Indexer] Querying with variables:', JSON.stringify(variables, null, 2));

        const response = await fetch(GRAPHQL_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query, variables }),
        });

        const result: GraphQLResponse<T> = await response.json();

        if (result.errors) {
            console.error('[Indexer] GraphQL errors:', result.errors);
            return null;
        }

        console.log('[Indexer] Response data:', JSON.stringify(result.data, null, 2).slice(0, 500));

        return result.data ?? null;
    } catch (error) {
        console.error('[Indexer] Query failed:', error);
        return null;
    }
}

/**
 * Generate event type variants for querying.
 * Handles both padded and normalized address formats.
 */
function getEventTypeVariants(contractAddress: string, eventName: string): string[] {
    const normalized = normalizeAddress(contractAddress);
    const padded = '0x' + contractAddress.slice(2).padStart(64, '0');

    return [
        `${normalized}::poker_events::${eventName}`,
        `${padded}::poker_events::${eventName}`,
    ];
}

// ============================================================================
// Event Queries
// ============================================================================

/**
 * Fetch TableCreated events to discover tables.
 */
export async function fetchTableCreatedEvents(
    network: NetworkType,
    limit: number = 50
): Promise<TableCreatedEvent[]> {
    const contract = getGameContract(network);
    const eventTypes = getEventTypeVariants(contract.address, 'TableCreated');

    const query = `
        query FetchTableCreated($eventTypes: [String!], $limit: Int) {
            events(
                where: { type: { _in: $eventTypes } }
                order_by: { transaction_version: desc }
                limit: $limit
            ) {
                type
                data
                transaction_version
            }
        }
    `;

    const result = await queryIndexer<{
        events: Array<{ type: string; data: any; transaction_version: string }>;
    }>(network, query, { eventTypes, limit });

    if (!result?.events) return [];

    return result.events.map(e => ({
        tableAddress: normalizeAddress(e.data.table_addr || e.data.table_address || e.data.tableAddress || ''),
        owner: normalizeAddress(e.data.owner || e.data.admin || ''),
        name: e.data.name || '',
        timestamp: Number(e.data.timestamp || 0),
    }));
}

/**
 * Fetch TableClosed events.
 */
export async function fetchTableClosedEvents(
    network: NetworkType,
    limit: number = 50
): Promise<TableClosedEvent[]> {
    const contract = getGameContract(network);
    const eventTypes = getEventTypeVariants(contract.address, 'TableClosed');

    const query = `
        query FetchTableClosed($eventTypes: [String!], $limit: Int) {
            events(
                where: { type: { _in: $eventTypes } }
                order_by: { transaction_version: desc }
                limit: $limit
            ) {
                type
                data
                transaction_version
            }
        }
    `;

    const result = await queryIndexer<{
        events: Array<{ type: string; data: any; transaction_version: string }>;
    }>(network, query, { eventTypes, limit });

    if (!result?.events) return [];

    return result.events.map(e => ({
        tableAddress: normalizeAddress(e.data.table_addr || e.data.table_address || e.data.tableAddress || ''),
        timestamp: Number(e.data.timestamp || 0),
    }));
}

/**
 * Fetch HandResult events for a specific table.
 */
export async function fetchHandResults(
    network: NetworkType,
    tableAddress: string,
    limit: number = 20
): Promise<HandResultEvent[]> {
    const contract = getGameContract(network);
    const eventTypes = getEventTypeVariants(contract.address, 'HandResult');
    const normalizedTable = normalizeAddress(tableAddress);

    const query = `
        query FetchHandResults($eventTypes: [String!], $limit: Int) {
            events(
                where: { type: { _in: $eventTypes } }
                order_by: { transaction_version: desc }
                limit: $limit
            ) {
                type
                data
                transaction_version
            }
        }
    `;

    const result = await queryIndexer<{
        events: Array<{ type: string; data: any; transaction_version: string }>;
    }>(network, query, { eventTypes, limit });

    if (!result?.events) return [];

    // Helper to safely get array from data
    const safeArray = (val: any): any[] => {
        if (Array.isArray(val)) return val;
        if (typeof val === 'string') {
            try {
                const parsed = JSON.parse(val);
                if (Array.isArray(parsed)) return parsed;
            } catch { }
        }
        return [];
    };

    // Helper to decode hex string to bytes
    const hexStringToBytes = (hex: string): number[] => {
        if (!hex || hex === '0x') return [];
        const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
        const paddedHex = cleanHex.length % 2 === 0 ? cleanHex : '0' + cleanHex;
        const bytes: number[] = [];
        for (let i = 0; i < paddedHex.length; i += 2) {
            bytes.push(parseInt(paddedHex.substr(i, 2), 16));
        }
        return bytes;
    };

    // Helper to parse card data (can be array, JSON array, or hex string)
    const parseCards = (val: any): number[] => {
        if (Array.isArray(val)) return val.map(Number);
        if (typeof val === 'string') {
            if (val.startsWith('0x')) return hexStringToBytes(val);
            try {
                const parsed = JSON.parse(val);
                if (Array.isArray(parsed)) return parsed.map(Number);
            } catch { }
        }
        return [];
    };

    // Filter by table address
    return result.events
        .filter(e => {
            const eventTable = normalizeAddress(e.data.table_addr || e.data.table_address || e.data.tableAddress || '');
            return eventTable === normalizedTable;
        })
        .map(e => {
            const data = e.data;
            return {
                tableAddress: normalizedTable,
                handNumber: Number(data.hand_number || 0),
                timestamp: Number(data.timestamp || 0),
                resultType: Number(data.result_type || 0),
                // Winner info
                winnerSeats: safeArray(data.winner_seats).map((s: any) => Number(s)),
                winnerPlayers: safeArray(data.winner_players).map(normalizeAddress),
                winnerAmounts: safeArray(data.winner_amounts).map((a: any) => Number(a)),
                // Showdown info
                showdownSeats: safeArray(data.showdown_seats).map((s: any) => Number(s)),
                showdownPlayers: safeArray(data.showdown_players).map(normalizeAddress),
                showdownHoleCards: safeArray(data.showdown_hole_cards).map((cards: any) => parseCards(cards)),
                showdownHandTypes: safeArray(data.showdown_hand_types).map((t: any) => Number(t)),
                // Board
                communityCards: parseCards(data.community_cards),
                totalPot: Number(data.total_pot || 0),
            };
        });
}

// ============================================================================
// Table Discovery
// ============================================================================

/**
 * Discover active tables by fetching events and validating with view calls.
 */
export async function discoverActiveTables(
    network: NetworkType,
    limit: number = 20
): Promise<DiscoveredTable[]> {
    // Fetch created and closed events (fetch more to account for filtering)
    const [created, closed] = await Promise.all([
        fetchTableCreatedEvents(network, limit * 3),
        fetchTableClosedEvents(network, limit * 3),
    ]);

    // Build set of closed table addresses
    const closedSet = new Set(closed.map(e => e.tableAddress));

    // Filter to active tables (created but not closed)
    const activeAddresses = created
        .filter(e => !closedSet.has(e.tableAddress))
        .map(e => e.tableAddress);

    // Deduplicate
    const uniqueAddresses = [...new Set(activeAddresses)];

    // Fetch summaries for each active table (up to limit)
    // Fetch summaries for each active table (up to limit) in parallel
    const targetAddresses = uniqueAddresses.slice(0, limit);

    const summaryPromises = targetAddresses.map(async (address) => {
        try {
            const summary = await getTableSummary(network, address);
            return {
                ...summary,
                tableAddress: address,
            };
        } catch (error) {
            // Table might have been closed or invalid, skip it
            console.warn(`Failed to fetch summary for ${address}:`, error);
            return null;
        }
    });

    const results = await Promise.all(summaryPromises);

    // Filter out failed requests (nulls)
    return results.filter((t): t is DiscoveredTable => t !== null);
}

/**
 * Check if a table address is valid and active.
 */
export async function isTableActive(
    network: NetworkType,
    tableAddress: string
): Promise<boolean> {
    try {
        const summary = await getTableSummary(network, tableAddress);
        return summary.totalSeats > 0;
    } catch {
        return false;
    }
}
