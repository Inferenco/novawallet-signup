import { useEffect, useState } from "react";
import "../../styles/poker-modals.css";

interface AbortVoteModalProps {
  visible: boolean;
  abortInProgress: boolean;
  approvals: number;
  vetos: number;
  seatedCount: number;
  deadline: number;
  canFinalize: boolean;
  isPending: boolean;
  onClose: () => void;
  onRequest: () => Promise<void> | void;
  onVote: (approve: boolean) => Promise<void> | void;
  onFinalize: () => Promise<void> | void;
  onCancel: () => Promise<void> | void;
}

function formatDeadline(deadline: number, now: number) {
  const remaining = Math.max(0, deadline - now);
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function AbortVoteModal({
  visible,
  abortInProgress,
  approvals,
  vetos,
  seatedCount,
  deadline,
  canFinalize,
  isPending,
  onClose,
  onRequest,
  onVote,
  onFinalize,
  onCancel
}: AbortVoteModalProps) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    if (!visible) return undefined;
    const timer = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="games-overlay" role="dialog" aria-modal="true">
      <div className="games-modal-panel">
        <div className="games-modal-header">
          <div>
            <h3 className="games-modal-title">Abort Vote</h3>
            <p className="games-status-text">
              {approvals}/{seatedCount} approvals • {vetos} vetoes
            </p>
          </div>
          <button type="button" className="games-icon-button" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="games-casino-inline-stats">
          <div className="games-casino-stat-card">
            <p className="games-casino-stat-label">Approvals</p>
            <p className="games-casino-stat-value">{approvals}</p>
          </div>
          <div className="games-casino-stat-card">
            <p className="games-casino-stat-label">Deadline</p>
            <p className="games-casino-stat-value">{deadline > 0 ? formatDeadline(deadline, now) : "--:--"}</p>
          </div>
        </div>

        <div className="games-modal-actions">
          <button
            type="button"
            className="games-button games-button-secondary"
            disabled={abortInProgress || isPending}
            onClick={() => {
              void onRequest();
            }}
          >
            Request Vote
          </button>
          <button
            type="button"
            className="games-button games-button-primary"
            disabled={!abortInProgress || isPending}
            onClick={() => {
              void onVote(true);
            }}
          >
            Approve
          </button>
          <button
            type="button"
            className="games-button games-button-secondary"
            disabled={!abortInProgress || isPending}
            onClick={() => {
              void onVote(false);
            }}
          >
            Veto
          </button>
          <button
            type="button"
            className="games-button games-button-accent"
            disabled={!canFinalize || isPending}
            onClick={() => {
              void onFinalize();
            }}
          >
            Finalize
          </button>
          <button
            type="button"
            className="games-button games-button-danger"
            disabled={!abortInProgress || isPending}
            onClick={() => {
              void onCancel();
            }}
          >
            Cancel Vote
          </button>
        </div>
      </div>
    </div>
  );
}
