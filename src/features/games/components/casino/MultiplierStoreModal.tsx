import { useEffect, useMemo, useState } from "react";
import { formatCedraFromOctas } from "@/lib/format";
import { CHIP_IMAGE_URL } from "../../config/games";
import { formatChips } from "../../services/poker/chips";
import type { MultiplierOption, MultiplierStatus, PurchaseSimulationPreview } from "../../hooks/poker/useChipActions";
import "../../styles/poker-modals.css";

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0m";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  return `${minutes}m`;
}

interface MultiplierStoreModalProps {
  visible: boolean;
  onClose: () => void;
  cedraBalance: bigint;
  chipBalance: number;
  isPending: boolean;
  isSimulating: boolean;
  error: string | null;
  onSimulatePurchase: (factor: number) => Promise<PurchaseSimulationPreview | null>;
  onPurchase: (factor: number) => Promise<boolean>;
  multiplierOptions: MultiplierOption[];
  multiplierDuration: number;
  multiplierStatus: MultiplierStatus;
}

export function MultiplierStoreModal({
  visible,
  onClose,
  cedraBalance,
  chipBalance,
  isPending,
  isSimulating,
  error,
  onSimulatePurchase,
  onPurchase,
  multiplierOptions,
  multiplierDuration,
  multiplierStatus
}: MultiplierStoreModalProps) {
  const [, setTick] = useState(0);
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    factor: number;
    simulation: PurchaseSimulationPreview;
  } | null>(null);

  useEffect(() => {
    if (!visible) return undefined;
    const timer = window.setInterval(() => setTick((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      setPendingConfirmation(null);
    }
  }, [visible]);

  const now = Math.floor(Date.now() / 1000);
  const activeTimeLeft = multiplierStatus.isActive
    ? Math.max(0, multiplierStatus.expiresAt - now)
    : 0;
  const hasActiveBoost = multiplierStatus.isActive && activeTimeLeft > 0;
  const activeFactor = hasActiveBoost ? multiplierStatus.factor : 1;

  const priceMap = useMemo(() => {
    const map = new Map<number, bigint>();
    multiplierOptions.forEach((option) => map.set(option.factor, option.price));
    return map;
  }, [multiplierOptions]);

  const totalDuration = useMemo(() => {
    if (multiplierStatus.expiresAt > multiplierStatus.startedAt) {
      return multiplierStatus.expiresAt - multiplierStatus.startedAt;
    }
    return multiplierDuration;
  }, [multiplierDuration, multiplierStatus.expiresAt, multiplierStatus.startedAt]);

  const renderOptionPrice = (factor: number, price: bigint) => {
    if (!hasActiveBoost) return price;
    if (factor <= activeFactor) return null;
    const currentPrice = priceMap.get(activeFactor) ?? 0n;
    if (currentPrice <= 0n || price <= currentPrice || totalDuration <= 0) {
      return price;
    }
    return ((price - currentPrice) * BigInt(activeTimeLeft)) / BigInt(totalDuration);
  };

  const isBusy = isPending || isSimulating;

  const handleReview = async (factor: number) => {
    if (isBusy) return;
    const preview = (await onSimulatePurchase(factor)) ?? {
      gasUsed: "estimate unavailable",
      vmStatus: "ready for review"
    };
    setPendingConfirmation({ factor, simulation: preview });
  };

  const handleConfirmPurchase = async () => {
    if (!pendingConfirmation || isBusy) return;
    const success = await onPurchase(pendingConfirmation.factor);
    if (success) {
      setPendingConfirmation(null);
    }
  };

  if (!visible) return null;

  const confirmationOption = pendingConfirmation
    ? multiplierOptions.find((option) => option.factor === pendingConfirmation.factor)
    : null;
  const confirmationPrice = confirmationOption
    ? renderOptionPrice(confirmationOption.factor, confirmationOption.price) ?? confirmationOption.price
    : null;

  return (
    <div className="games-overlay" role="dialog" aria-modal="true">
      <div className="games-modal-panel">
        <div className="games-modal-header">
          <h3 className="games-modal-title">Boost Store</h3>
          <button type="button" className="games-icon-button" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="games-casino-inline-stats">
          <div className="games-casino-stat-card">
            <p className="games-casino-stat-label">Wallet</p>
            <p className="games-status-text">{formatCedraFromOctas(cedraBalance)}</p>
          </div>
          <div className="games-casino-stat-card">
            <p className="games-casino-stat-label">Chips</p>
            <p className="games-status-text games-casino-chip-inline">
              <span className="games-chip-medallion games-chip-medallion-sm" aria-hidden="true">
                <img src={CHIP_IMAGE_URL} alt="" />
              </span>
              {formatChips(chipBalance)}
            </p>
          </div>
        </div>

        <div className="games-section">
          <p className="games-status-text">
            Active boost:{" "}
            {hasActiveBoost ? `${activeFactor}x · ${formatDuration(activeTimeLeft)} left` : "None"}
          </p>
          <p className="games-status-text">Duration: {formatDuration(multiplierDuration)}</p>
          {error ? <p className="games-status-text games-status-error">{error}</p> : null}
        </div>

        {pendingConfirmation ? (
          <div className="games-card games-card-body games-section">
            <h4 className="games-section-title">Simulation Review</h4>
            <p className="games-status-text">Boost: {pendingConfirmation.factor}x</p>
            {confirmationPrice !== null ? (
              <p className="games-status-text">
                Price: {formatCedraFromOctas(confirmationPrice)}
              </p>
            ) : null}
            <p className="games-status-text">
              Estimated gas: {pendingConfirmation.simulation.gasUsed}
            </p>
            {pendingConfirmation.simulation.vmStatus ? (
              <p className="games-status-text">{pendingConfirmation.simulation.vmStatus}</p>
            ) : null}
            <div className="games-modal-inline-actions">
              <button
                type="button"
                className="games-button games-button-secondary"
                onClick={() => setPendingConfirmation(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="games-button games-button-primary"
                disabled={isBusy}
                onClick={() => void handleConfirmPurchase()}
              >
                {isBusy ? "Submitting..." : "Confirm & Activate"}
              </button>
            </div>
          </div>
        ) : null}

        <div className="games-section">
          {multiplierOptions.length === 0 ? (
            <p className="games-status-text">No boosts configured yet.</p>
          ) : (
            multiplierOptions.map((option) => {
              const isActive = hasActiveBoost && option.factor === activeFactor;
              const isLowerTier = hasActiveBoost && option.factor < activeFactor;
              const isUpgrade = hasActiveBoost && option.factor > activeFactor;
              const optionPrice = renderOptionPrice(option.factor, option.price);

              return (
                <div key={option.factor} className="games-casino-boost-row">
                  <div className="games-casino-boost-meta">
                    <p className="games-casino-boost-title">{option.factor}x Multiplier</p>
                    <p className="games-casino-boost-copy">
                      {isActive
                        ? "Currently active"
                        : isLowerTier
                          ? "Included in active boost"
                          : `${isUpgrade ? "Upgrade cost" : "Price"}: ${formatCedraFromOctas(
                              optionPrice ?? option.price
                            )}`}
                    </p>
                  </div>
                  {isActive ? (
                    <span className="games-status-text games-status-success">ACTIVE</span>
                  ) : isLowerTier ? (
                    <span className="games-status-text">INCLUDED</span>
                  ) : (
                    <button
                      type="button"
                      className="games-button games-button-accent"
                      disabled={isBusy}
                      onClick={() => void handleReview(option.factor)}
                    >
                      {isUpgrade ? "Review Upgrade" : "Review"}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
