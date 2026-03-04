import { useMemo } from "react";
import { useWallet } from "@/providers/WalletProvider";
import { resolveNetworkType, type NetworkType } from "../utils/constants";

export function useGamesNetwork(): NetworkType {
  const wallet = useWallet();

  return useMemo(() => {
    const walletNetwork = String(wallet.network?.name ?? "").toLowerCase();
    if (walletNetwork.includes("devnet")) return "devnet";
    if (walletNetwork.includes("testnet")) return "testnet";
    return resolveNetworkType();
  }, [wallet.network]);
}
