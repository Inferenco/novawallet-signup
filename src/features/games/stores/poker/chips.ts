import { create } from 'zustand';
import type { NetworkType } from '../../utils/constants';

type ChipBalanceEntry = {
    balance: number;
    updatedAt: number;
};

type PokerChipsState = {
    balances: Record<string, ChipBalanceEntry>;
    setBalance: (network: NetworkType, address: string, balance: number) => void;
};

export function buildChipBalanceKey(network?: NetworkType | null, address?: string | null) {
    if (!network || !address) return null;
    return `${network}:${address.toLowerCase()}`;
}

export const usePokerChipsStore = create<PokerChipsState>((set) => ({
    balances: {},
    setBalance: (network, address, balance) => {
        const key = buildChipBalanceKey(network, address);
        if (!key) return;
        set((state) => ({
            balances: {
                ...state.balances,
                [key]: { balance, updatedAt: Date.now() },
            },
        }));
    },
}));
