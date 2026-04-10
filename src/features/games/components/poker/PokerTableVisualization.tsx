import { CHIP_IMAGE_URL, GAME_PHASES, PLAYER_STATUS } from "../../config/games";
import { type UserProfile } from "../../services/profiles";
import { formatChips } from "../../services/poker/chips";
import { formatCard } from "../../utils/poker/cards";

export interface PokerDisplaySeat {
  actualSeatIndex: number;
  displayPosition: "bottom" | "left" | "top-left" | "top-right" | "right";
  seat: {
    playerAddress: string | null;
    chipCount: number;
    currentBet: number;
    status: number;
    isSittingOut: boolean;
  };
  profile: UserProfile | null;
  isActive: boolean;
}

interface PokerTableVisualizationProps {
  seats: PokerDisplaySeat[];
  communityCards: number[];
  potSize: number;
  dealerSeat: number | null | undefined;
  mySeatIndex: number | null;
  phase: number;
  failedAvatarUrls: Set<string>;
  onAvatarError: (avatarUrl: string) => void;
  onJoinSeat: (seatIndex: number) => void;
}

function shortAddress(address: string | null | undefined): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function isEmptySeat(address: string | null | undefined): boolean {
  return !address || address === "0x0";
}

export function PokerTableVisualization({
  seats,
  communityCards,
  potSize,
  dealerSeat,
  mySeatIndex,
  phase,
  failedAvatarUrls,
  onAvatarError,
  onJoinSeat
}: PokerTableVisualizationProps) {
  return (
    <section className="games-wallet-table-section">
      <div className="games-wallet-table-canvas">
        <div className="games-wallet-table-outer">
          <img
            className="games-wallet-table-wood-texture"
            src="/assets/casino/wood-texture.png"
            alt=""
            aria-hidden
          />
          <div className="games-wallet-table-felt">
            <img
              className="games-wallet-table-felt-texture"
              src="/assets/casino/felt-texture.png"
              alt=""
              aria-hidden
            />

            {potSize > 0 ? (
              <div className="games-wallet-pot-pill">
                <span className="label">POT</span>
                <span className="value">{formatChips(potSize)}</span>
              </div>
            ) : null}

            <div className="games-wallet-board-row">
              {[0, 1, 2, 3, 4].map((idx) => {
                const card = communityCards[idx];
                return (
                  <span
                    key={idx}
                    className={`games-wallet-card ${card === undefined ? "face-down" : ""}`}
                  >
                    {card === undefined ? "♠" : formatCard(card)}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {seats.map(({ actualSeatIndex, displayPosition, seat, profile, isActive }) => {
          const empty = isEmptySeat(seat.playerAddress);
          const canJoinThisSeat = empty && mySeatIndex === null;
          const isFolded = seat.status === PLAYER_STATUS.FOLDED;
          const isAllIn = seat.status === PLAYER_STATUS.ALL_IN;
          const seatName = empty
            ? "Tap to Join"
            : profile?.nickname || shortAddress(seat.playerAddress) || `Seat ${actualSeatIndex + 1}`;
          const hasBrokenAvatar = Boolean(profile?.avatarUrl && failedAvatarUrls.has(profile.avatarUrl));
          const shouldShowBet = !empty && seat.currentBet > 0 && phase !== GAME_PHASES.WAITING;
          const isDealer = dealerSeat === actualSeatIndex;

          return (
            <button
              key={actualSeatIndex}
              type="button"
              className={`games-wallet-seat games-wallet-seat-${displayPosition} ${
                isActive ? "active" : ""
              } ${mySeatIndex === actualSeatIndex ? "hero" : ""} ${
                canJoinThisSeat ? "joinable" : ""
              }`}
              onClick={() => {
                if (canJoinThisSeat) {
                  onJoinSeat(actualSeatIndex);
                }
              }}
              disabled={!canJoinThisSeat}
            >
              <span className={`games-wallet-seat-circle ${empty ? "empty" : ""}`}>
                {profile?.avatarUrl && !hasBrokenAvatar ? (
                  <img
                    src={profile.avatarUrl}
                    alt={seatName}
                    onError={() => onAvatarError(profile.avatarUrl as string)}
                  />
                ) : empty ? (
                  <span className="games-wallet-seat-empty-copy">
                    TAP TO
                    <br />
                    JOIN
                  </span>
                ) : (
                  <span>{seatName.slice(0, 1).toUpperCase()}</span>
                )}
              </span>

              {isDealer && !empty ? <span className="games-wallet-dealer-chip">D</span> : null}

              {!empty ? (
                <>
                  <span className={`games-wallet-seat-name ${isFolded ? "muted" : ""}`}>
                    {seatName}
                  </span>
                  <span className={`games-wallet-seat-stack ${isFolded ? "muted" : ""}`}>
                    <span className="games-chip-medallion games-chip-medallion-xs" aria-hidden="true">
                      <img src={CHIP_IMAGE_URL} alt="" />
                    </span>
                    {formatChips(seat.chipCount)}
                  </span>
                  {isAllIn ? <span className="games-wallet-seat-allin">ALL-IN</span> : null}
                </>
              ) : null}

              {shouldShowBet ? (
                <span className="games-wallet-seat-bet">
                  <span className="games-chip-medallion games-chip-medallion-xs" aria-hidden="true">
                    <img src={CHIP_IMAGE_URL} alt="" />
                  </span>
                  {formatChips(seat.currentBet)}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
