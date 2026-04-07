import { CHIP_IMAGE_URL } from "../../config/games";
import { formatChips } from "../../services/poker/chips";
import { formatCard } from "../../utils/poker/cards";
import type { PokerGameplayActionHandlers, PokerGameplayViewModel } from "./pokerGameplayTypes";

interface PokerActionDockMobileProps
  extends Pick<
      PokerGameplayActionHandlers,
      | "onAbort"
      | "onAllIn"
      | "onCall"
      | "onCheck"
      | "onFold"
      | "onRaise"
      | "onRaiseInputChange"
      | "onPreset"
      | "onSitIn"
      | "onSitOut"
      | "onSliderChange"
      | "onStraddle"
    > {
  viewModel: PokerGameplayViewModel;
  compact: boolean;
  onAvatarError: (avatarUrl: string) => void;
}

export function PokerActionDockMobile({
  viewModel,
  compact,
  onAvatarError,
  onAbort,
  onAllIn,
  onCall,
  onCheck,
  onFold,
  onRaise,
  onRaiseInputChange,
  onPreset,
  onSitIn,
  onSitOut,
  onSliderChange,
  onStraddle
}: PokerActionDockMobileProps) {
  const { hero } = viewModel;
  const hiddenCards = hero.cards.some((card) => card === undefined) || !hero.cardsDecrypted;

  return (
    <section
      className={`poker-gameplay-dock poker-gameplay-dock-mobile ${compact ? "is-compact" : ""}`}
      aria-label="Player actions"
    >
      <div className="poker-gameplay-dock-hero-row">
        <div className="poker-gameplay-dock-hero-summary">
          <span className={`poker-gameplay-dock-avatar ${hero.isMyTurn ? "is-active" : ""}`}>
            {hero.avatarUrl && !hero.avatarBlocked ? (
              <img
                src={hero.avatarUrl}
                alt={hero.nickname || "Hero"}
                onError={() => onAvatarError(hero.avatarUrl as string)}
              />
            ) : (
              <span>{(hero.nickname || "H").slice(0, 1).toUpperCase()}</span>
            )}
          </span>
          <div>
            <p className="poker-gameplay-dock-label">My Stack</p>
            <p className="poker-gameplay-dock-value">{formatChips(hero.stack)}</p>
          </div>
        </div>

        <div className="poker-gameplay-dock-cards">
          {[0, 1].map((idx) => {
            const card = hero.cards[idx];
            const hidden = hiddenCards || card === undefined;
            return (
              <span key={idx} className={`poker-gameplay-card small ${hidden ? "face-down" : ""}`}>
                {hidden ? "♠" : formatCard(card)}
              </span>
            );
          })}
        </div>
      </div>

      <div className="poker-gameplay-dock-raise-row">
        <label htmlFor="poker-mobile-raise-input">Raise To</label>
        <input
          id="poker-mobile-raise-input"
          className="games-wallet-text-input"
          value={hero.raiseToAmount}
          onChange={(event) => onRaiseInputChange(event.target.value)}
          placeholder={`${hero.minRaiseTo}`}
        />
      </div>

      <div className="poker-gameplay-dock-slider-row">
        <div className="poker-gameplay-dock-presets">
          <button
            type="button"
            className="poker-gameplay-chip-button"
            onClick={() => onPreset(0)}
            disabled={!hero.inBettingRound || !hero.isMyTurn || hero.actionLocked}
          >
            MIN
          </button>
          <button
            type="button"
            className="poker-gameplay-chip-button"
            onClick={() => onPreset(50)}
            disabled={!hero.inBettingRound || !hero.isMyTurn || hero.actionLocked}
          >
            50%
          </button>
          <button
            type="button"
            className="poker-gameplay-chip-button"
            onClick={() => onPreset(100)}
            disabled={!hero.inBettingRound || !hero.isMyTurn || hero.actionLocked}
          >
            MAX
          </button>
        </div>

        <input
          type="range"
          min={0}
          max={100}
          value={hero.raiseRatio}
          className="poker-gameplay-slider"
          disabled={
            !hero.inBettingRound ||
            !hero.isMyTurn ||
            hero.maxRaiseTo <= hero.minRaiseTo ||
            hero.actionLocked
          }
          onChange={(event) => onSliderChange(Number.parseInt(event.target.value, 10))}
        />
      </div>

      <div className="poker-gameplay-dock-primary-row poker-gameplay-dock-primary-row-mobile">
        <button
          type="button"
          className="poker-gameplay-action-button fold"
          disabled={!hero.isMyTurn || !hero.inBettingRound || hero.actionLocked}
          onClick={onFold}
        >
          Fold
        </button>
        <button
          type="button"
          className={`poker-gameplay-action-button ${hero.canCheck ? "check" : "call"}`}
          disabled={!hero.isMyTurn || !hero.inBettingRound || hero.actionLocked}
          onClick={hero.canCheck ? onCheck : onCall}
        >
          {hero.canCheck ? "Check" : `Call ${formatChips(hero.callAmount)}`}
        </button>
        <button
          type="button"
          className="poker-gameplay-action-button raise"
          disabled={!hero.isMyTurn || !hero.inBettingRound || hero.actionLocked}
          onClick={onRaise}
        >
          Raise
        </button>
      </div>

      <div className="poker-gameplay-dock-secondary-row">
        <button
          type="button"
          className="poker-gameplay-pill-button danger"
          disabled={!hero.isMyTurn || !hero.inBettingRound || hero.actionLocked}
          onClick={onAllIn}
        >
          <span className="games-chip-medallion games-chip-medallion-xs" aria-hidden="true">
            <img src={CHIP_IMAGE_URL} alt="" />
          </span>
          All-in ({formatChips(hero.stack)})
        </button>
        <button
          type="button"
          className="poker-gameplay-pill-button"
          disabled={!hero.canStraddle || hero.actionLocked}
          onClick={onStraddle}
        >
          Straddle
        </button>
        <button type="button" className="poker-gameplay-pill-button" onClick={onSitOut}>
          Sit Out
        </button>
        <button type="button" className="poker-gameplay-pill-button" onClick={onSitIn}>
          Sit In
        </button>
        <button type="button" className="poker-gameplay-pill-button" onClick={onAbort}>
          Abort
        </button>
      </div>

      <div className="poker-gameplay-dock-footer">
        <span className="poker-gameplay-dock-pending">{hero.pendingActionCopy}</span>
      </div>
    </section>
  );
}
