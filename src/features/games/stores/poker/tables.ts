// Nova Wallet - Poker Tables Store
// State management for table discovery and list

import { create } from 'zustand';
import type { NetworkType } from '../../utils/constants';
import {
    discoverActiveTables,
    type DiscoveredTable,
} from '../../services/poker/indexer';

// ============================================================================
// Types
// ============================================================================

type TableFilter = 'all' | 'open' | 'low' | 'medium' | 'high';

interface PokerTablesState {
    // Data
    tables: DiscoveredTable[];
    myTableAddress: string | null;

    // Pagination
    hasMore: boolean;
    isLoadingMore: boolean;

    // UI state
    filter: TableFilter;
    searchQuery: string;
    isLoading: boolean;
    error: string | null;
    lastRefresh: number | null;

    // Actions
    refreshTables: (network: NetworkType, limit?: number) => Promise<void>;
    loadMoreTables: (network: NetworkType) => Promise<void>;
    setFilter: (filter: TableFilter) => void;
    setSearchQuery: (query: string) => void;
    setMyTable: (address: string | null) => void;
    upsertTable: (table: DiscoveredTable) => void;
    removeTable: (tableAddress: string) => void;
    clearError: () => void;
    reset: () => void;
}

// ============================================================================
// Store
// ============================================================================

const initialState = {
    tables: [],
    myTableAddress: null,
    hasMore: true,
    isLoadingMore: false,
    filter: 'all' as TableFilter,
    searchQuery: '',
    isLoading: false,
    error: null,
    lastRefresh: null,
};

export const usePokerTablesStore = create<PokerTablesState>((set, get) => ({
    ...initialState,

    refreshTables: async (network: NetworkType, limit = 20) => {
        set({ isLoading: true, error: null });

        try {
            const tables = await discoverActiveTables(network, limit);

            set({
                tables,
                isLoading: false,
                hasMore: tables.length >= limit,
                lastRefresh: Date.now(),
            });
        } catch (error) {
            console.error('Failed to refresh tables:', error);
            set({
                isLoading: false,
                error: 'Failed to load tables. Please try again.',
            });
        }
    },

    loadMoreTables: async (network: NetworkType) => {
        const { tables, hasMore, isLoadingMore } = get();

        if (!hasMore || isLoadingMore) return;

        set({ isLoadingMore: true });

        try {
            // Fetch next batch of 20
            const newTables = await discoverActiveTables(network, tables.length + 20);

            // Get only the new ones
            const existingAddresses = new Set(tables.map(t => t.tableAddress));
            const freshTables = newTables.filter(t => !existingAddresses.has(t.tableAddress));

            set({
                tables: [...tables, ...freshTables],
                hasMore: newTables.length >= tables.length + 20,
                isLoadingMore: false,
            });
        } catch (error) {
            console.error('Failed to load more tables:', error);
            set({
                isLoadingMore: false,
                error: 'Failed to load more tables.',
            });
        }
    },

    setFilter: (filter: TableFilter) => {
        set({ filter });
    },

    setSearchQuery: (query: string) => {
        set({ searchQuery: query });
    },

    setMyTable: (address: string | null) => {
        set({ myTableAddress: address });
    },

    upsertTable: (table: DiscoveredTable) => {
        set((state) => {
            const nextTables = [...state.tables];
            const index = nextTables.findIndex((entry) => entry.tableAddress === table.tableAddress);

            if (index >= 0) {
                nextTables[index] = table;
            } else {
                nextTables.unshift(table);
            }

            return { tables: nextTables };
        });
    },

    removeTable: (tableAddress: string) => {
        set((state) => ({
            tables: state.tables.filter((table) => table.tableAddress !== tableAddress),
            myTableAddress:
                state.myTableAddress === tableAddress ? null : state.myTableAddress
        }));
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
 * Get filtered tables based on current filter and search.
 */
export function useFilteredTables(): DiscoveredTable[] {
    const { tables, filter, searchQuery } = usePokerTablesStore();

    let filtered = [...tables];

    // Apply search filter
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(
            (t) =>
                t.name.toLowerCase().includes(query) ||
                t.tableAddress.toLowerCase().includes(query)
        );
    }

    // Apply category filter
    switch (filter) {
        case 'open':
            filtered = filtered.filter((t) => t.occupiedSeats < t.totalSeats);
            break;
        case 'low':
            filtered = filtered.filter((t) => t.bigBlind <= 10);
            break;
        case 'medium':
            filtered = filtered.filter((t) => t.bigBlind > 10 && t.bigBlind <= 100);
            break;
        case 'high':
            filtered = filtered.filter((t) => t.bigBlind > 100);
            break;
    }

    return filtered;
}

/**
 * Get the user's own table if they have created one.
 */
export function useMyTable(): DiscoveredTable | null {
    const { tables, myTableAddress } = usePokerTablesStore();

    if (!myTableAddress) return null;

    return tables.find((t) => t.tableAddress === myTableAddress) || null;
}
