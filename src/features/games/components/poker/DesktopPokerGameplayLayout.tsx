import { Link } from "react-router-dom";
import { GAME_PHASES, PHASE_NAMES } from "../../config/games";
import { PokerGameInfoRow } from "./PokerGameInfoRow";
import { PokerGameplayHeader } from "./PokerGameplayHeader";
import { PokerGameplayStatusBar } from "./PokerGameplayStatusBar";
import { PokerActionDockDesktop } from "./PokerActionDockDesktop";
import type { PokerGameplayLayoutProps } from "./pokerGameplayTypes";
import { PokerTableStageDesktop } from "./PokerTableStageDesktop";

export function DesktopPokerGameplayLayout({
  viewModel,
  failedAvatarUrls,
  onAvatarError,
  onAbort,
  onAllIn,
  onCall,
  onCheck,
  onFold,
  onJoinSeat,
  onLeaveTable,
  onPreset,
  onRaise,
  onRaiseInputChange,
  onRevealFoldedCards,
  onSitIn,
  onSitOut,
  onSliderChange,
  onStartHand,
  onStraddle,
  onTimeout,
  onToggleChat,
  onToggleOwnerPanel
}: PokerGameplayLayoutProps) {
  const firstJoinableSeat =
    viewModel.tableSeats.find(({ seat }) => !seat.playerAddress || seat.playerAddress === "0x0")
      ?.actualSeatIndex ?? 0;

  return (
    <div className="poker-gameplay-shell poker-gameplay-shell-desktop">
      <div className="poker-gameplay-desktop-stage">
        <PokerGameplayHeader
          tableName={viewModel.table.name}
          blindsLabel={viewModel.table.blindsLabel}
          unreadCount={viewModel.chat.unreadCount}
          showChat={viewModel.overlays.showChat}
          isAdmin={viewModel.session.isAdmin}
          onToggleChat={onToggleChat}
          onToggleControls={onToggleOwnerPanel}
        />

        <PokerGameplayStatusBar
          statusMessage={viewModel.table.statusMessage}
          isMyTurn={viewModel.hero.isMyTurn}
          canTimeout={viewModel.table.canTimeout}
          timeoutPending={viewModel.table.timeoutPending}
          onTimeout={onTimeout}
        />

        <PokerTableStageDesktop
          viewModel={viewModel}
          failedAvatarUrls={failedAvatarUrls}
          onAvatarError={onAvatarError}
          onJoinSeat={onJoinSeat}
        />

        <PokerGameInfoRow
          timer={viewModel.table.timerText}
          phaseLabel={PHASE_NAMES[viewModel.table.phase] || viewModel.table.phaseLabel}
          handLabel={viewModel.table.handNumberLabel}
          isUrgent={viewModel.table.timerUrgent}
        />

        {viewModel.hero.seated ? (
          <div className="poker-gameplay-desktop-controls">
            {viewModel.table.phase === GAME_PHASES.WAITING ? (
              <div className="poker-gameplay-desktop-waiting-row">
                <button
                  type="button"
                  className="poker-gameplay-action-button start"
                  disabled={!viewModel.controls.canStartHand}
                  onClick={onStartHand}
                >
                  Start Hand
                </button>
                <button
                  type="button"
                  className="poker-gameplay-action-button leave"
                  onClick={onLeaveTable}
                >
                  Leave
                </button>
              </div>
            ) : null}

            <PokerActionDockDesktop
              viewModel={viewModel}
              onAvatarError={onAvatarError}
              onAbort={onAbort}
              onAllIn={onAllIn}
              onCall={onCall}
              onCheck={onCheck}
              onFold={onFold}
              onPreset={onPreset}
              onRaise={onRaise}
              onRaiseInputChange={onRaiseInputChange}
              onRevealFoldedCards={onRevealFoldedCards}
              onSitIn={onSitIn}
              onSitOut={onSitOut}
              onSliderChange={onSliderChange}
              onStraddle={onStraddle}
            />
          </div>
        ) : (
          <div className="poker-gameplay-desktop-idle-row">
            <button
              type="button"
              className="poker-gameplay-action-button start"
              disabled={!viewModel.controls.canJoinTable}
              onClick={() => onJoinSeat(firstJoinableSeat)}
            >
              {viewModel.controls.joinButtonLabel}
            </button>
            <Link className="poker-gameplay-action-button leave poker-gameplay-idle-link" to="/games/poker">
              Back to Lobby
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
