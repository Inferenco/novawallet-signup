import { useEffect, useMemo, useState } from "react";
import { CHIP_IMAGE_URL } from "../../config/games";
import { formatChips } from "../../services/poker/chips";

interface FreeChipsCardProps {
  dailyAmount: number;
  boostedDailyAmount: number;
  multiplierFactor: number;
  multiplierTimeLeft: number;
  canClaim: boolean;
  timeUntilNext: number;
  isClaiming: boolean;
  error: string | null;
  onClaim: () => void;
}

function formatCountdown(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  }
  return `${minutes}m ${String(secs).padStart(2, "0")}s`;
}

export function FreeChipsCard({
  dailyAmount,
  boostedDailyAmount,
  multiplierFactor,
  multiplierTimeLeft,
  canClaim,
  timeUntilNext,
  isClaiming,
  error,
  onClaim
}: FreeChipsCardProps) {
  const [countdown, setCountdown] = useState(timeUntilNext);
  const [boostCountdown, setBoostCountdown] = useState(multiplierTimeLeft);
  const claimsDisabled = dailyAmount <= 0;

  useEffect(() => {
    setCountdown(timeUntilNext);
  }, [timeUntilNext]);

  useEffect(() => {
    setBoostCountdown(multiplierTimeLeft);
  }, [multiplierTimeLeft]);

  useEffect(() => {
    if (canClaim || claimsDisabled || countdown <= 0) return undefined;
    const timer = window.setInterval(() => {
      setCountdown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [canClaim, claimsDisabled, countdown]);

  useEffect(() => {
    if (boostCountdown <= 0) return undefined;
    const timer = window.setInterval(() => {
      setBoostCountdown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [boostCountdown]);

  const hasBoost = multiplierFactor > 1 && boostCountdown > 0;
  const displayAmount = useMemo(
    () => (hasBoost ? boostedDailyAmount : dailyAmount),
    [boostedDailyAmount, dailyAmount, hasBoost]
  );
  const effectiveCanClaim = canClaim || countdown <= 0;

  return (
    <div className="games-card games-card-body games-section games-casino-free-card">
      <div className="games-inline-row" style={{ justifyContent: "space-between" }}>
        <p className="games-field-label" style={{ margin: 0 }}>
          Daily Free Chips
        </p>
        <span className="games-casino-gift" aria-hidden="true">
          🎁
        </span>
      </div>
      <p className="games-casino-stat-value games-casino-stat-value-chip" style={{ margin: 0 }}>
        <img src={CHIP_IMAGE_URL} alt="" aria-hidden="true" />
        <span>{claimsDisabled ? "Free claims disabled" : `${formatChips(displayAmount)} chips`}</span>
      </p>
      {hasBoost ? (
        <p className="games-status-text">
          {multiplierFactor}x boost active. Ends in {formatCountdown(boostCountdown)}.
        </p>
      ) : null}
      {!effectiveCanClaim && !claimsDisabled ? (
        <p className="games-status-text">Next claim in {formatCountdown(countdown)}.</p>
      ) : null}
      {error ? <p className="games-status-text games-status-error">{error}</p> : null}
      <button
        type="button"
        className="games-button games-button-primary"
        disabled={isClaiming || claimsDisabled || !effectiveCanClaim}
        onClick={onClaim}
      >
        {claimsDisabled
          ? "Unavailable"
          : isClaiming
            ? "Claiming..."
            : effectiveCanClaim
              ? "Claim Now"
              : "Claimed"}
      </button>
    </div>
  );
}
