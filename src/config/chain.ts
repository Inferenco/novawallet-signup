import { Network } from "@cedra-labs/ts-sdk";
import type { NetworkInfo } from "@cedra-labs/wallet-adapter-core";
import { appEnv } from "./env";

export interface ChainConfig {
  id: "cedra";
  label: string;
  network: Network;
  networkName: string;
  rpcUrl: string;
  indexerUrl: string;
  walletContractAddress: string;
  tokenSymbol: string;
  tokenDecimals: number;
}

export const CHAIN_CONFIG: ChainConfig = {
  id: "cedra",
  label: "Cedra Testnet",
  network: Network.TESTNET,
  networkName: "testnet",
  rpcUrl: appEnv.fullnodeUrl,
  indexerUrl: appEnv.indexerUrl,
  walletContractAddress: appEnv.walletContractAddress,
  tokenSymbol: "CEDRA",
  tokenDecimals: 8
};

export function isExpectedNetwork(network: NetworkInfo | null): boolean {
  if (!network) return false;

  const candidates = [
    String((network as { name?: unknown }).name ?? ""),
    String((network as { chainId?: unknown }).chainId ?? ""),
    String((network as { url?: unknown }).url ?? "")
  ]
    .filter(Boolean)
    .map((value) => value.toLowerCase());

  return candidates.some((value) => value.includes(CHAIN_CONFIG.networkName));
}
