import { useEffect, useMemo, useRef } from "react";
import type { CommitRevealStatus } from "../../hooks/poker/useCommitReveal";
import "../../styles/poker-modals.css";

interface CommitRevealOverlayProps {
  visible: boolean;
  phase: "commit" | "reveal";
  secondsRemaining: number;
  status: CommitRevealStatus;
  error: string | null;
  canCallTimeout: boolean;
  timeoutPending: boolean;
  onCommit: () => void;
  onReveal: () => void;
  onTimeout: () => void;
}

function formatTimer(seconds: number): string {
  if (seconds <= 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

export function CommitRevealOverlay({
  visible,
  phase,
  secondsRemaining,
  status,
  error,
  canCallTimeout,
  timeoutPending,
  onCommit,
  onReveal,
  onTimeout
}: CommitRevealOverlayProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const primaryActionRef = useRef<HTMLButtonElement>(null);
  const isCommitPhase = phase === "commit";
  const isExpired = secondsRemaining === 0;
  const showTimeoutAction = isExpired && (canCallTimeout || timeoutPending);
  const isWorking = status === "generating" || status === "committing" || status === "revealing";
  const isDone = isCommitPhase ? status === "committed" : status === "revealed";

  const statusCopy = useMemo(() => {
    if (error) return error;
    if (showTimeoutAction) {
      return "The response window expired. Force timeout to move the hand forward.";
    }
    if (status === "generating") return "Generating your secure card secret...";
    if (status === "committing") return "Requesting your cards on-chain...";
    if (status === "revealing") return "Accepting and decrypting your cards...";
    if (isDone) return isCommitPhase ? "Cards requested." : "Cards accepted.";
    return isCommitPhase
      ? "You need to request your hole cards before the timer expires."
      : "You need to accept your hole cards before the timer expires.";
  }, [error, isCommitPhase, isDone, showTimeoutAction, status]);

  useEffect(() => {
    if (!visible) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    primaryActionRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        return;
      }

      if (event.key !== "Tab") return;

      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );

      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (!dialog.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="games-overlay games-overlay-commit" data-testid="commit-reveal-overlay">
      <div
        ref={dialogRef}
        className={`games-modal-panel games-commit-panel ${isExpired ? "games-commit-timeouted" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="commit-reveal-title"
        aria-describedby="commit-reveal-copy"
      >
        <div className="games-commit-header">
          <div className="games-commit-phase">
            <span className="games-commit-icon" aria-hidden="true">
              {isCommitPhase ? "🔐" : "🔓"}
            </span>
            <span className="games-commit-phase-label">
              {isCommitPhase ? "Secure Deal" : "Card Reveal"}
            </span>
          </div>
          <span className={`games-commit-timer ${secondsRemaining <= 10 ? "urgent" : ""}`}>
            {formatTimer(secondsRemaining)}
          </span>
        </div>

        <div className="games-commit-copy-wrap">
          <h3 id="commit-reveal-title" className="games-commit-title">
            {isCommitPhase ? "Request Cards" : "Accept Cards"}
          </h3>
          <p id="commit-reveal-copy" className={`games-commit-copy ${error ? "error" : ""}`}>
            {statusCopy}
          </p>
        </div>

        <div className="games-modal-actions">
          <button
            ref={!showTimeoutAction ? primaryActionRef : undefined}
            type="button"
            className="games-button games-commit-primary"
            disabled={isWorking || isDone || showTimeoutAction}
            onClick={isCommitPhase ? onCommit : onReveal}
          >
            {isWorking
              ? "Working..."
              : isDone
                ? isCommitPhase
                  ? "Cards Requested"
                  : "Cards Accepted"
                : isCommitPhase
                  ? "Request Cards"
                  : "Accept Cards"}
          </button>

          {showTimeoutAction && (
            <button
              ref={showTimeoutAction ? primaryActionRef : undefined}
              type="button"
              className="games-button games-button-secondary games-commit-danger"
              disabled={!canCallTimeout || timeoutPending}
              onClick={onTimeout}
            >
              {timeoutPending ? "Forcing Timeout..." : "Force Timeout"}
            </button>
          )}
        </div>

        <p className="games-commit-footnote">
          {isCommitPhase
            ? "A secure hash is submitted first, then your cards can be revealed to you."
            : "Reveal your stored secret so the hand can continue and your cards can be used."}
        </p>
      </div>
    </div>
  );
}
