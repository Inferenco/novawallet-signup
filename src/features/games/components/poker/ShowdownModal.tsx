import { HAND_RANKS } from "../../config/games";
import { type UserProfile } from "../../services/profiles";
import { formatChips } from "../../services/poker/chips";
import { formatCard } from "../../utils/poker/cards";
import "../../styles/poker-modals.css";

interface WinnerSummary {
  address: string;
  amount: number;
  holeCards: number[];
  handType: number;
  seatIndex: number;
}

interface ShowdownPlayerSummary {
  address: string;
  seatIndex: number;
  holeCards: number[];
  handType: number;
}

interface ShowdownModalProps {
  visible: boolean;
  handNumber: number;
  resultType: "showdown" | "fold_win";
  totalPot: number;
  communityCards: number[];
  winners: WinnerSummary[];
  showdownPlayers: ShowdownPlayerSummary[];
  playerProfiles: Map<string, UserProfile | null>;
  onClose: () => void;
}

function displayName(
  playerProfiles: Map<string, UserProfile | null>,
  address: string
) {
  return playerProfiles.get(address)?.nickname || `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function ShowdownModal({
  visible,
  handNumber,
  resultType,
  totalPot,
  communityCards,
  winners,
  showdownPlayers,
  playerProfiles,
  onClose
}: ShowdownModalProps) {
  if (!visible) return null;

  return (
    <div className="games-overlay" role="dialog" aria-modal="true">
      <div className="games-modal-panel">
        <div className="games-modal-header">
          <div>
            <h3 className="games-modal-title">Hand #{handNumber}</h3>
            <p className="games-status-text">
              {resultType === "fold_win" ? "Won by fold" : "Showdown complete"} • Pot{" "}
              {formatChips(totalPot)}
            </p>
          </div>
          <button type="button" className="games-icon-button" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="games-board-row">
          {communityCards.map((card, index) => (
            <span key={`${card}-${index}`} className="games-showdown-card">
              {formatCard(card)}
            </span>
          ))}
        </div>

        <div className="games-section">
          <p className="games-field-label">Winners</p>
          {winners.map((winner) => (
            <div key={`${winner.address}-${winner.seatIndex}`} className="games-showdown-row">
              <div>
                <p className="games-section-title" style={{ fontSize: "1rem" }}>
                  {displayName(playerProfiles, winner.address)}
                </p>
                <p className="games-section-copy">
                  Seat {winner.seatIndex + 1}
                  {winner.handType >= 0 ? ` • ${HAND_RANKS[winner.handType] || "Winning hand"}` : ""}
                </p>
              </div>
              <strong>{formatChips(winner.amount)}</strong>
            </div>
          ))}
        </div>

        {showdownPlayers.length > 0 ? (
          <div className="games-section">
            <p className="games-field-label">Showdown Players</p>
            {showdownPlayers.map((player) => (
              <div key={`${player.address}-${player.seatIndex}`} className="games-showdown-row">
                <div>
                  <p className="games-section-title" style={{ fontSize: "1rem" }}>
                    {displayName(playerProfiles, player.address)}
                  </p>
                  <p className="games-section-copy">
                    Seat {player.seatIndex + 1} • {HAND_RANKS[player.handType] || "Hand"}
                  </p>
                </div>
                <div className="games-board-row">
                  {player.holeCards.map((card, index) => (
                    <span key={`${player.address}-${index}`} className="games-showdown-card small">
                      {formatCard(card)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
