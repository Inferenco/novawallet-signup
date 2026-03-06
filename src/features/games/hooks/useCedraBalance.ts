import { useCallback, useEffect, useState } from "react";
import { useGamesNetwork } from "./useGamesNetwork";
import { getCedraClient } from "../core/transactions";

const CEDRA_COIN = "0x1::cedra_coin::CedraCoin";

export function useCedraBalance(address: string | null | undefined) {
  const network = useGamesNetwork();
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const refreshBalance = useCallback(async () => {
    if (!address) {
      setBalance(0);
      return;
    }

    setIsLoading(true);
    try {
      const cedra = getCedraClient(network);
      const amount = await cedra.getAccountCoinAmount({
        accountAddress: address,
        coinType: CEDRA_COIN
      });
      setBalance(Number.isFinite(amount) ? amount : 0);
    } catch (error) {
      console.error("Failed to load CEDRA balance:", error);
      setBalance(0);
    } finally {
      setIsLoading(false);
    }
  }, [address, network]);

  useEffect(() => {
    void refreshBalance();
  }, [refreshBalance]);

  return {
    balance,
    isLoading,
    refreshBalance
  };
}
