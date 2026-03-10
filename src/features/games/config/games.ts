import { CHAIN_CONFIG } from "@/config/chain";
import type { NetworkType } from "../utils/constants";

const FALLBACK_GAME_ADDRESS = "0x0";

export const GAME_CONTRACTS: Record<NetworkType, {
  address: string;
    modules: {
      TEXAS_HOLDEM: string;
      POKER_EVENTS: string;
      HAND_EVAL: string;
      POT_MANAGER: string;
      CHIPS: string;
      GAMES_TREASURY: string;
      GAMING_CONSENT: string;
    };
}> = {
  testnet: {
    address: CHAIN_CONFIG.gameContractAddress || FALLBACK_GAME_ADDRESS,
    get modules() {
      return {
        TEXAS_HOLDEM: `${this.address}::poker_texas_holdem`,
        POKER_EVENTS: `${this.address}::poker_events`,
        HAND_EVAL: `${this.address}::poker_hand_eval`,
        POT_MANAGER: `${this.address}::poker_pot_manager`,
        CHIPS: `${this.address}::chips`,
        GAMES_TREASURY: `${this.address}::games_treasury`,
        GAMING_CONSENT: `${this.address}::gaming_consent`
      };
    }
  },
  devnet: {
    address: CHAIN_CONFIG.gameContractAddress || FALLBACK_GAME_ADDRESS,
    get modules() {
      return {
        TEXAS_HOLDEM: `${this.address}::poker_texas_holdem`,
        POKER_EVENTS: `${this.address}::poker_events`,
        HAND_EVAL: `${this.address}::poker_hand_eval`,
        POT_MANAGER: `${this.address}::poker_pot_manager`,
        CHIPS: `${this.address}::chips`,
        GAMES_TREASURY: `${this.address}::games_treasury`,
        GAMING_CONSENT: `${this.address}::gaming_consent`
      };
    }
  }
};

export function getGameContract(network: NetworkType) {
  return GAME_CONTRACTS[network];
}

export function buildFunctionId(
  network: NetworkType,
  module: keyof typeof GAME_CONTRACTS.testnet.modules,
  fn: string
) {
  const contract = getGameContract(network);
  return `${contract.modules[module]}::${fn}`;
}

export const CHIP_IMAGE_URL =
  "/assets/games/chip.png";

export const CHIPS_PER_TOKEN = 1000;
export const BASE_UNITS_PER_CHIP = 100_000;
export const TOKEN_DECIMALS = 8;

export const MAX_SEATS = 5;
export const MIN_BUY_IN_BB = 20;
export const MAX_BUY_IN_BB = 200;

export const TABLE_SPEEDS = {
  STANDARD: 0,
  FAST: 1,
  QUICK_FIRE: 2
} as const;

export const SPEED_NAMES: Record<number, string> = {
  0: "Standard",
  1: "Fast",
  2: "Quick Fire"
};

export const SPEED_LABELS: Record<number, string> = {
  0: "Standard (90s)",
  1: "Fast (60s)",
  2: "Quick Fire (30s)"
};

export const SPEED_ACTION_TIMEOUT: Record<number, number> = {
  0: 90,
  1: 60,
  2: 30
};

export const BASE_TIMEOUTS = {
  COMMIT: 120,
  REVEAL: 120,
  ACTION: 60
};

export const SPEED_MULTIPLIERS: Record<number, number> = {
  0: 1,
  1: 0.5,
  2: 0.25
};

export const GAME_PHASES = {
  WAITING: 0,
  COMMIT: 1,
  REVEAL: 2,
  PREFLOP: 3,
  FLOP: 4,
  TURN: 5,
  RIVER: 6,
  SHOWDOWN: 7
} as const;

export const PHASE_NAMES: Record<number, string> = {
  0: "Waiting",
  1: "Request Cards",
  2: "Accept Cards",
  3: "Pre-Flop",
  4: "Flop",
  5: "Turn",
  6: "River",
  7: "Showdown"
};

export const PLAYER_STATUS = {
  WAITING: 0,
  ACTIVE: 1,
  FOLDED: 2,
  ALL_IN: 3
} as const;

export const HAND_RANKS: Record<number, string> = {
  0: "High Card",
  1: "One Pair",
  2: "Two Pair",
  3: "Three of a Kind",
  4: "Straight",
  5: "Flush",
  6: "Full House",
  7: "Four of a Kind",
  8: "Straight Flush",
  9: "Royal Flush"
};

export const TABLE_COLORS: Record<
  number,
  { name: string; felt: string; rail: string; accent: string }
> = {
  0: { name: "Nova Blue", felt: "#0f3a50", rail: "#1a5070", accent: "#00d4ff" },
  1: {
    name: "Classic Green",
    felt: "#1f4d2b",
    rail: "#0f1b17",
    accent: "#2fbf71"
  },
  2: { name: "Teal Noir", felt: "#0f3d3e", rail: "#0b1416", accent: "#28a5a8" },
  3: {
    name: "Indigo Steel",
    felt: "#1e2a44",
    rail: "#0c1016",
    accent: "#5fa8ff"
  },
  4: { name: "Ember Red", felt: "#4a1c1c", rail: "#160b0b", accent: "#ff6b35" },
  5: {
    name: "Olive Gold",
    felt: "#3f4a2a",
    rail: "#12150c",
    accent: "#c9b458"
  }
};

export const SECRET_KEY_PREFIX = "holdem_secret";

/** @deprecated Use GAME_CONTRACTS instead */
export const POKER_CONTRACTS = GAME_CONTRACTS;

/** @deprecated Use getGameContract instead */
export function getPokerContract(network: NetworkType) {
  return getGameContract(network);
}
