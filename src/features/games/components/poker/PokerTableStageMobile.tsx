import { CHIP_IMAGE_URL, GAME_PHASES, PLAYER_STATUS } from "../../config/games";
import { formatChips } from "../../services/poker/chips";
import type { PokerGameplayViewModel } from "./pokerGameplayTypes";
import { PokerPlayingCard } from "./PokerPlayingCard";

interface PokerTableStageMobileProps {
  viewModel: PokerGameplayViewModel;
  failedAvatarUrls: Set<string>;
  onAvatarError: (avatarUrl: string) => void;
  onJoinSeat: (seatIndex: number) => void;
  compact: boolean;
}

function shortAddress(address: string | null | undefined): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function isEmptySeat(address: string | null | undefined): boolean {
  return !address || address === "0x0";
}

export function PokerTableStageMobile({
  viewModel,
  failedAvatarUrls,
  onAvatarError,
  onJoinSeat,
  compact
}: PokerTableStageMobileProps) {
  return (
    <section
      className={`poker-gameplay-stage poker-gameplay-stage-mobile ${
        compact ? "is-compact" : ""
      }`}
      aria-label="Poker table"
    >
      <div className="poker-gameplay-stage-surface">
        {viewModel.table.potSize > 0 ? (
          <div className="poker-gameplay-pot-pill">
            <span className="label">Pot</span>
            <span className="value">{formatChips(viewModel.table.potSize)}</span>
          </div>
        ) : null}

        <div className="poker-gameplay-table-oval">
          <div className="poker-gameplay-table-rim">
            <div className="poker-gameplay-table-felt">
              <div className="poker-gameplay-board-row">
                {[0, 1, 2, 3, 4].map((idx) => {
                  const card = viewModel.table.communityCards[idx];
                  return (
                    <PokerPlayingCard
                      key={idx}
                      value={card}
                      faceDown={card === undefined}
                      size="board"
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {viewModel.tableSeats.map(({ actualSeatIndex, displayPosition, seat, profile, isActive }) => {
          const empty = isEmptySeat(seat.playerAddress);
          const canJoinThisSeat = empty && !viewModel.hero.seated;
          const isFolded = seat.status === PLAYER_STATUS.FOLDED;
          const isAllIn = seat.status === PLAYER_STATUS.ALL_IN;
          const seatName = empty
            ? "Tap to Join"
            : profile?.nickname || shortAddress(seat.playerAddress) || `Seat ${actualSeatIndex + 1}`;
          const hasBrokenAvatar = Boolean(profile?.avatarUrl && failedAvatarUrls.has(profile.avatarUrl));
          const shouldShowBet =
            !empty &&
            seat.currentBet > 0 &&
            viewModel.table.phase !== GAME_PHASES.WAITING;
          const isDealer = viewModel.table.dealerSeat === actualSeatIndex;
          const isHero = viewModel.table.heroSeatIndex === actualSeatIndex;

          return (
            <button
              key={actualSeatIndex}
              type="button"
              className={`poker-gameplay-seat poker-gameplay-seat-${displayPosition} ${
                isActive ? "is-active" : ""
              } ${isHero ? "is-hero" : ""} ${canJoinThisSeat ? "is-joinable" : ""}`}
              onClick={() => {
                if (canJoinThisSeat) {
                  onJoinSeat(actualSeatIndex);
                }
              }}
              disabled={!canJoinThisSeat}
            >
              {shouldShowBet ? (
                <span className="poker-gameplay-seat-bet">
                  <span className="games-chip-medallion games-chip-medallion-xs" aria-hidden="true">
                    <img src={CHIP_IMAGE_URL} alt="" />
                  </span>
                  {formatChips(seat.currentBet)}
                </span>
              ) : null}

              <span className={`poker-gameplay-seat-avatar ${empty ? "is-empty" : ""}`}>
                {profile?.avatarUrl && !hasBrokenAvatar ? (
                  <img
                    src={profile.avatarUrl}
                    alt={seatName}
                    onError={() => onAvatarError(profile.avatarUrl as string)}
                  />
                ) : empty ? (
                  <span className="poker-gameplay-seat-empty-copy">
                    TAP TO
                    <br />
                    JOIN
                  </span>
                ) : (
                  <span>{seatName.slice(0, 1).toUpperCase()}</span>
                )}
              </span>

              {isDealer && !empty ? <span className="poker-gameplay-seat-dealer">D</span> : null}

              {!empty ? (
                <span className="poker-gameplay-seat-meta">
                  <span className={`poker-gameplay-seat-name ${isFolded ? "is-muted" : ""}`}>
                    {seatName}
                  </span>
                  <span className={`poker-gameplay-seat-stack ${isFolded ? "is-muted" : ""}`}>
                    <span className="games-chip-medallion games-chip-medallion-xs" aria-hidden="true">
                      <img src={CHIP_IMAGE_URL} alt="" />
                    </span>
                    {formatChips(seat.chipCount)}
                  </span>
                  {isAllIn ? <span className="poker-gameplay-seat-allin">ALL-IN</span> : null}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
