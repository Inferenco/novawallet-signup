import { useMemo } from "react";
import { useWallet } from "@/providers/WalletProvider";
import type { GameSigner } from "../types";

export function useGameSigner(): GameSigner | null {
  const wallet = useWallet();

  return useMemo(() => {
    const address = wallet.account?.address?.toString();
    if (!wallet.connected || !address) {
      return null;
    }

    return {
      accountAddress: address,
      signAndSubmitTransaction: wallet.signAndSubmitTransaction
    };
  }, [wallet.account, wallet.connected, wallet.signAndSubmitTransaction]);
}
