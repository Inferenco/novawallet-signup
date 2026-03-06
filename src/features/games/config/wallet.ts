import { CHAIN_CONFIG } from "@/config/chain";
import type { NetworkType } from "../utils/constants";

const FALLBACK_WALLET_ADDRESS = "0x0";

export const WALLET_CONTRACTS: Record<
  NetworkType,
  {
    address: string;
    modules: {
      EVENTS: string;
      USER_PROFILES: string;
      WALLET_TREASURY: string;
    };
  }
> = {
  testnet: {
    address: CHAIN_CONFIG.walletContractAddress || FALLBACK_WALLET_ADDRESS,
    modules: {
      EVENTS: "events",
      USER_PROFILES: "user_profiles",
      WALLET_TREASURY: "wallet_treasury"
    }
  },
  devnet: {
    address: CHAIN_CONFIG.walletContractAddress || FALLBACK_WALLET_ADDRESS,
    modules: {
      EVENTS: "events",
      USER_PROFILES: "user_profiles",
      WALLET_TREASURY: "wallet_treasury"
    }
  }
};

export function getWalletContract(network: NetworkType) {
  return WALLET_CONTRACTS[network];
}

export function buildWalletFunctionId(
  network: NetworkType,
  module: keyof typeof WALLET_CONTRACTS.testnet.modules,
  fn: string
) {
  const contract = getWalletContract(network);
  return `${contract.address}::${contract.modules[module]}::${fn}`;
}
