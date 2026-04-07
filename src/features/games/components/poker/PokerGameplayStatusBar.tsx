interface PokerGameplayStatusBarProps {
  statusMessage: string;
  isMyTurn: boolean;
  canTimeout: boolean;
  timeoutPending: boolean;
  onTimeout: () => void;
}

export function PokerGameplayStatusBar({
  statusMessage,
  isMyTurn,
  canTimeout,
  timeoutPending,
  onTimeout
}: PokerGameplayStatusBarProps) {
  return (
    <div className={`games-wallet-status-bar ${isMyTurn ? "active" : ""}`}>
      <p className="m-0">• {statusMessage}</p>
      <div className="games-wallet-status-actions">
        <button
          type="button"
          className="games-wallet-mini-btn games-wallet-mini-btn-danger"
          disabled={!canTimeout || timeoutPending}
          onClick={onTimeout}
        >
          {timeoutPending ? "Timing out..." : "Timeout"}
        </button>
      </div>
    </div>
  );
}
