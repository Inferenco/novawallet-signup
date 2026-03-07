import { useEffect, useMemo, useState } from "react";
import type { SeatInfo } from "../../services/poker/types";
import { formatChips } from "../../services/poker/chips";
import "../../styles/poker-modals.css";

interface JoinTableModalProps {
  visible: boolean;
  selectedSeat: number | null;
  seats: SeatInfo[];
  minBuyIn: number;
  maxBuyIn: number;
  userChipBalance: number;
  isPending?: boolean;
  onClose: () => void;
  onJoin: (seatIndex: number, buyInAmount: bigint) => Promise<void> | void;
  onSelectedSeatChange: (seatIndex: number) => void;
}

function isSeatEmpty(seat: SeatInfo | undefined) {
  return !seat?.playerAddress || seat.playerAddress === "0x0";
}

export function JoinTableModal({
  visible,
  selectedSeat,
  seats,
  minBuyIn,
  maxBuyIn,
  userChipBalance,
  isPending = false,
  onClose,
  onJoin,
  onSelectedSeatChange
}: JoinTableModalProps) {
  const [buyInAmount, setBuyInAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    const id = window.setTimeout(() => {
      setBuyInAmount(String(minBuyIn));
      setError(null);
    }, 0);
    return () => window.clearTimeout(id);
  }, [minBuyIn, visible]);

  const availableSeats = useMemo(
    () => seats.map((seat, index) => ({ seat, index })).filter(({ seat }) => isSeatEmpty(seat)),
    [seats]
  );
  const occupiedSeats = useMemo(
    () => seats.map((seat, index) => ({ seat, index })).filter(({ seat }) => !isSeatEmpty(seat)),
    [seats]
  );

  if (!visible) return null;

  const amount = Number.parseInt(buyInAmount, 10);
  const validAmount =
    Number.isFinite(amount) && amount >= minBuyIn && amount <= maxBuyIn && amount <= userChipBalance;

  return (
    <div className="games-overlay" role="dialog" aria-modal="true">
      <div className="games-modal-panel">
        <div className="games-modal-header">
          <h3 className="games-modal-title">Join Table</h3>
          <button type="button" className="games-icon-button" onClick={onClose}>
            ✕
          </button>
        </div>

        {occupiedSeats.length > 0 ? (
          <div className="games-seat-pill-row">
            {occupiedSeats.map(({ index }) => (
              <span key={index} className="games-seat-pill games-seat-pill-filled">
                Seat {index + 1}
              </span>
            ))}
          </div>
        ) : null}

        <div className="games-section">
          <p className="games-field-label">Select seat</p>
          <div className="games-seat-grid">
            {availableSeats.length === 0 ? (
              <div className="games-empty-state">No seats available.</div>
            ) : (
              availableSeats.map(({ index }) => (
                <button
                  key={index}
                  type="button"
                  className={`games-seat-picker ${selectedSeat === index ? "active" : ""}`}
                  onClick={() => onSelectedSeatChange(index)}
                >
                  {index + 1}
                </button>
              ))
            )}
          </div>
        </div>

        <label className="games-field">
          <span className="games-field-label">
            Buy-in ({formatChips(minBuyIn)} - {formatChips(maxBuyIn)})
          </span>
          <input
            className="games-input"
            inputMode="numeric"
            value={buyInAmount}
            onChange={(event) => setBuyInAmount(event.target.value)}
          />
        </label>

        <div className="games-seat-pill-row">
          <button type="button" className="games-seat-pill" onClick={() => setBuyInAmount(String(minBuyIn))}>
            Min
          </button>
          <button
            type="button"
            className="games-seat-pill"
            onClick={() => setBuyInAmount(String(Math.floor((minBuyIn + maxBuyIn) / 2)))}
          >
            Mid
          </button>
          <button type="button" className="games-seat-pill" onClick={() => setBuyInAmount(String(maxBuyIn))}>
            Max
          </button>
        </div>

        <p className="games-status-text">Chip balance: {formatChips(userChipBalance)}</p>
        {error ? <p className="games-status-text games-status-error">{error}</p> : null}

        <div className="games-modal-inline-actions">
          <button type="button" className="games-button games-button-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="games-button games-button-primary"
            disabled={selectedSeat === null || !validAmount || isPending}
            onClick={() => {
              if (selectedSeat === null) {
                setError("Choose an empty seat.");
                return;
              }
              if (!Number.isFinite(amount) || amount < minBuyIn || amount > maxBuyIn) {
                setError(`Buy-in must be between ${formatChips(minBuyIn)} and ${formatChips(maxBuyIn)}.`);
                return;
              }
              if (amount > userChipBalance) {
                setError("You do not have enough chips for that buy-in.");
                return;
              }

              setError(null);
              void onJoin(selectedSeat, BigInt(amount));
            }}
          >
            {isPending ? "Joining..." : "Join Table"}
          </button>
        </div>
      </div>
    </div>
  );
}
