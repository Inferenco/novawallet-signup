import { CHIP_IMAGE_URL } from "../../config/games";
import { formatCard } from "../../utils/poker/cards";
import { formatChips } from "../../services/poker/chips";

interface PokerHeroActionBarProps {
  avatarUrl?: string | null;
  avatarBlocked: boolean;
  nickname?: string | null;
  isMyTurn: boolean;
  stack: number;
  cards: number[];
  cardsDecrypted: boolean;
  raiseToAmount: string;
  raiseRatio: number;
  minRaiseTo: number;
  maxRaiseTo: number;
  callAmount: number;
  canCheck: boolean;
  inBettingRound: boolean;
  actionLocked: boolean;
  canStraddle: boolean;
  pendingActionCopy: string;
  onAvatarError: (avatarUrl: string) => void;
  onRaiseInputChange: (value: string) => void;
  onPreset: (ratio: number) => void;
  onSliderChange: (ratio: number) => void;
  onFold: () => void;
  onCheck: () => void;
  onCall: () => void;
  onRaise: () => void;
  onAllIn: () => void;
  onStraddle: () => void;
  onSitOut: () => void;
  onSitIn: () => void;
  onAbort: () => void;
}

export function PokerHeroActionBar({
  avatarUrl,
  avatarBlocked,
  nickname,
  isMyTurn,
  stack,
  cards,
  cardsDecrypted,
  raiseToAmount,
  raiseRatio,
  minRaiseTo,
  maxRaiseTo,
  callAmount,
  canCheck,
  inBettingRound,
  actionLocked,
  canStraddle,
  pendingActionCopy,
  onAvatarError,
  onRaiseInputChange,
  onPreset,
  onSliderChange,
  onFold,
  onCheck,
  onCall,
  onRaise,
  onAllIn,
  onStraddle,
  onSitOut,
  onSitIn,
  onAbort
}: PokerHeroActionBarProps) {
  return (
    <section className="games-wallet-hero-bar">
      <div className="games-wallet-hero-top">
        <div className="games-wallet-hero-summary">
          <span className={`games-wallet-hero-avatar ${isMyTurn ? "active" : ""}`}>
            {avatarUrl && !avatarBlocked ? (
              <img
                src={avatarUrl}
                alt={nickname || "Hero"}
                onError={() => onAvatarError(avatarUrl)}
              />
            ) : (
              <span>{(nickname || "H").slice(0, 1).toUpperCase()}</span>
            )}
          </span>
          <div>
            <p className="m-0 games-wallet-hero-label">MY STACK</p>
            <p className="m-0 games-wallet-hero-value">{formatChips(stack)}</p>
          </div>
        </div>

        <div className="games-wallet-hero-cards">
          {[0, 1].map((idx) => {
            const card = cards[idx];
            const hidden = card === undefined || !cardsDecrypted;
            return (
              <span key={idx} className={`games-wallet-card small ${hidden ? "face-down" : ""}`}>
                {hidden ? "♠" : formatCard(card)}
              </span>
            );
          })}
        </div>

        <div className="games-wallet-raise-box">
          <label htmlFor="raise-input">RAISE TO</label>
          <input
            id="raise-input"
            className="games-wallet-text-input"
            value={raiseToAmount}
            onChange={(event) => onRaiseInputChange(event.target.value)}
            placeholder={`${minRaiseTo}`}
          />
        </div>
      </div>

      <div className="games-wallet-raise-controls">
        <div className="games-wallet-preset-row">
          <button
            type="button"
            className="games-wallet-preset-btn"
            onClick={() => onPreset(0)}
            disabled={!inBettingRound || !isMyTurn || actionLocked}
          >
            MIN
          </button>
          <button
            type="button"
            className="games-wallet-preset-btn"
            onClick={() => onPreset(50)}
            disabled={!inBettingRound || !isMyTurn || actionLocked}
          >
            50%
          </button>
          <button
            type="button"
            className="games-wallet-preset-btn"
            onClick={() => onPreset(100)}
            disabled={!inBettingRound || !isMyTurn || actionLocked}
          >
            MAX
          </button>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={raiseRatio}
          className="games-wallet-raise-slider"
          disabled={!inBettingRound || !isMyTurn || maxRaiseTo <= minRaiseTo || actionLocked}
          onChange={(event) => onSliderChange(Number.parseInt(event.target.value, 10))}
        />
      </div>

      <div className="games-wallet-action-row">
        <button
          type="button"
          className="games-wallet-action-btn fold"
          disabled={!isMyTurn || !inBettingRound || actionLocked}
          onClick={onFold}
        >
          Fold
        </button>
        <button
          type="button"
          className="games-wallet-action-btn check"
          disabled={!isMyTurn || !inBettingRound || !canCheck || actionLocked}
          onClick={onCheck}
        >
          Check
        </button>
        <button
          type="button"
          className="games-wallet-action-btn call"
          disabled={!isMyTurn || !inBettingRound || canCheck || actionLocked}
          onClick={onCall}
        >
          Call {formatChips(callAmount)}
        </button>
        <button
          type="button"
          className="games-wallet-action-btn raise"
          disabled={!isMyTurn || !inBettingRound || actionLocked}
          onClick={onRaise}
        >
          Raise
        </button>
      </div>

      <div className="games-wallet-subaction-row">
        <button
          type="button"
          className="games-wallet-link-btn danger"
          disabled={!isMyTurn || !inBettingRound || actionLocked}
          onClick={onAllIn}
        >
          <span className="games-chip-medallion games-chip-medallion-xs" aria-hidden="true">
            <img src={CHIP_IMAGE_URL} alt="" />
          </span>
          ALL-IN ({formatChips(stack)})
        </button>
        <button
          type="button"
          className="games-wallet-link-btn"
          disabled={!canStraddle || actionLocked}
          onClick={onStraddle}
        >
          Straddle
        </button>
        <button type="button" className="games-wallet-link-btn" onClick={onSitOut}>
          Sit Out
        </button>
        <button type="button" className="games-wallet-link-btn" onClick={onSitIn}>
          Sit In
        </button>
        <button type="button" className="games-wallet-link-btn" onClick={onAbort}>
          Abort
        </button>
        <span className="games-wallet-pending-copy">{pendingActionCopy}</span>
      </div>
    </section>
  );
}
