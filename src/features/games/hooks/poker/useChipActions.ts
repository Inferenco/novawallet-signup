import { useState, useCallback, useEffect } from "react";
import type { GameSigner } from "../../types";
import type { NetworkType } from "../../utils/constants";
import { purchaseMultiplier } from "../../services/poker/actions";
import {
  getChipBalance,
  getMultiplierOptions,
  getMultiplierPrice,
  getMultiplierDuration,
  getMultiplierStatus
} from "../../services/poker/chips";
import { parsePokerError } from "../../utils/poker/errors";
import { usePokerChipsStore } from "../../stores/poker/chips";

export type ChipActionType = "purchaseMultiplier";

export type MultiplierOption = {
  factor: number;
  price: bigint;
};

export type MultiplierStatus = {
  factor: number;
  startedAt: number;
  expiresAt: number;
  isActive: boolean;
  timeLeft: number;
};

export type PurchaseSimulationPreview = {
  gasUsed: string;
  vmStatus?: string;
};

interface UseChipActionsOptions {
  network: NetworkType;
  playerAddress: string;
  onSuccess?: (action: ChipActionType, detail: number) => void;
  onError?: (action: ChipActionType, error: string) => void;
}

interface UseChipActionsReturn {
  pendingAction: ChipActionType | null;
  isSimulatingPurchase: boolean;
  error: string | null;
  chipBalance: number;
  isLoadingBalance: boolean;
  multiplierOptions: MultiplierOption[];
  multiplierDuration: number;
  multiplierStatus: MultiplierStatus;
  simulatePurchaseMultiplier: (
    factor: number,
    _publicKey?: string
  ) => Promise<PurchaseSimulationPreview | null>;
  doPurchaseMultiplier: (signer: GameSigner, factor: number) => Promise<boolean>;
  refreshBalance: () => Promise<void>;
  refreshMultiplierData: () => Promise<{
    options: MultiplierOption[];
    duration: number;
    status: MultiplierStatus;
  } | null>;
  clearError: () => void;
}

export function useChipActions({
  network,
  playerAddress,
  onSuccess,
  onError
}: UseChipActionsOptions): UseChipActionsReturn {
  const [pendingAction, setPendingAction] = useState<ChipActionType | null>(null);
  const [isSimulatingPurchase, setIsSimulatingPurchase] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chipBalance, setChipBalance] = useState(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [multiplierOptions, setMultiplierOptions] = useState<MultiplierOption[]>([]);
  const [multiplierDuration, setMultiplierDuration] = useState(0);
  const [multiplierStatus, setMultiplierStatus] = useState<MultiplierStatus>({
    factor: 1,
    startedAt: 0,
    expiresAt: 0,
    isActive: false,
    timeLeft: 0
  });

  const refreshBalance = useCallback(async () => {
    if (!network || !playerAddress) return;

    setIsLoadingBalance(true);
    try {
      const balance = await getChipBalance(network, playerAddress);
      setChipBalance(balance);
      usePokerChipsStore.getState().setBalance(network, playerAddress, balance);
    } catch (err) {
      console.error("Failed to refresh chip balance:", err);
    } finally {
      setIsLoadingBalance(false);
    }
  }, [network, playerAddress]);

  const refreshMultiplierData = useCallback(async () => {
    if (!network) return null;
    try {
      const [options, duration, status] = await Promise.all([
        getMultiplierOptions(network),
        getMultiplierDuration(network),
        playerAddress
          ? getMultiplierStatus(network, playerAddress)
          : Promise.resolve({ factor: 1, startedAt: 0, expiresAt: 0 })
      ]);

      const prices = await Promise.all(
        options.map((factor) => getMultiplierPrice(network, factor))
      );

      const normalizedOptions = options
        .map((factor, index) => ({
          factor,
          price: prices[index] ?? 0n
        }))
        .sort((a, b) => a.factor - b.factor);

      const now = Math.floor(Date.now() / 1000);
      const isActive = status.factor > 1 && status.expiresAt > now;
      const timeLeft = isActive ? status.expiresAt - now : 0;

      const normalizedStatus: MultiplierStatus = {
        factor: status.factor,
        startedAt: status.startedAt,
        expiresAt: status.expiresAt,
        isActive,
        timeLeft
      };

      setMultiplierOptions(normalizedOptions);
      setMultiplierDuration(duration);
      setMultiplierStatus(normalizedStatus);

      return {
        options: normalizedOptions,
        duration,
        status: normalizedStatus
      };
    } catch (err) {
      console.error("Failed to refresh multiplier data:", err);
      return null;
    }
  }, [network, playerAddress]);

  useEffect(() => {
    if (network && playerAddress) {
      void refreshBalance();
    }
  }, [network, playerAddress, refreshBalance]);

  useEffect(() => {
    if (network) {
      void refreshMultiplierData();
    }
  }, [network, playerAddress, refreshMultiplierData]);

  const simulatePurchaseMultiplier = useCallback(
    async (factor: number): Promise<PurchaseSimulationPreview | null> => {
      if (factor <= 1) {
        setError("Invalid multiplier factor");
        return null;
      }

      // Wallet extension flow does not expose public key simulation pipeline in this dapp.
      return null;
    },
    []
  );

  const doPurchaseMultiplier = useCallback(
    async (signer: GameSigner, factor: number): Promise<boolean> => {
      if (pendingAction) {
        setError("Another action is in progress");
        return false;
      }

      if (factor <= 1) {
        setError("Invalid multiplier factor");
        return false;
      }

      try {
        setPendingAction("purchaseMultiplier");
        setIsSimulatingPurchase(false);
        setError(null);

        const result = await purchaseMultiplier(network, signer, factor);

        if (result.success) {
          onSuccess?.("purchaseMultiplier", factor);
          await refreshBalance();
          await refreshMultiplierData();
          return true;
        }
        setError("Transaction failed");
        onError?.("purchaseMultiplier", "Transaction failed");
        return false;
      } catch (err) {
        console.error("Purchase multiplier failed:", err);
        const errorMsg = parsePokerError(err);
        setError(errorMsg);
        onError?.("purchaseMultiplier", errorMsg);
        return false;
      } finally {
        setIsSimulatingPurchase(false);
        setPendingAction(null);
      }
    },
    [network, onSuccess, onError, pendingAction, refreshBalance, refreshMultiplierData]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    pendingAction,
    isSimulatingPurchase,
    error,
    chipBalance,
    isLoadingBalance,
    multiplierOptions,
    multiplierDuration,
    multiplierStatus,
    simulatePurchaseMultiplier,
    doPurchaseMultiplier,
    refreshBalance,
    refreshMultiplierData,
    clearError
  };
}

export default useChipActions;
