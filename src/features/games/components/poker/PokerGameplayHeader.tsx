import { Link } from "react-router-dom";

interface PokerGameplayHeaderProps {
  tableName: string;
  blindsLabel: string;
  unreadCount: number;
  showChat: boolean;
  isAdmin: boolean;
  onToggleChat: () => void;
  onToggleControls: () => void;
}

export function PokerGameplayHeader({
  tableName,
  blindsLabel,
  unreadCount,
  showChat,
  isAdmin,
  onToggleChat,
  onToggleControls
}: PokerGameplayHeaderProps) {
  return (
    <header className="games-wallet-header">
      <Link className="games-wallet-icon-btn" to="/games/poker">
        Back
      </Link>

      <div className="games-wallet-header-center">
        <img
          className="games-wallet-header-logo"
          src="/assets/casino/game-icon.png"
          alt="Nova"
        />
        <div>
          <p className="games-wallet-table-name">{tableName}</p>
          <p className="games-wallet-table-meta">{blindsLabel}</p>
        </div>
      </div>

      <div className="games-wallet-header-right">
        <button
          type="button"
          className="games-wallet-icon-btn games-wallet-chat-trigger"
          onClick={onToggleChat}
          aria-expanded={showChat}
        >
          Chat{unreadCount > 0 && !showChat ? ` (${unreadCount})` : ""}
        </button>
        <button
          type="button"
          className="games-wallet-icon-btn games-wallet-icon-only"
          onClick={onToggleControls}
          aria-label={isAdmin ? "Admin Controls" : "Table Actions"}
        >
          {isAdmin ? "⚙" : "⋮"}
        </button>
      </div>
    </header>
  );
}
