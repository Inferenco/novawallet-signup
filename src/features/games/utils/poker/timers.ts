export type GameplayTimerKind = "commit" | "reveal" | "action" | null;

export interface GameplayTimerState {
  kind: GameplayTimerKind;
  secondsRemaining: number | null;
  isUrgent: boolean;
  isExpired: boolean;
}

interface DeriveGameplayTimerStateArgs {
  nowMs: number;
  needsCommit: boolean;
  needsReveal: boolean;
  commitDeadline: number;
  revealDeadline: number;
  actionDeadline: number | null;
}

export function deriveGameplayTimerState({
  nowMs,
  needsCommit,
  needsReveal,
  commitDeadline,
  revealDeadline,
  actionDeadline
}: DeriveGameplayTimerStateArgs): GameplayTimerState {
  let kind: GameplayTimerKind = null;
  let deadline: number | null = null;

  if (needsCommit && commitDeadline > 0) {
    kind = "commit";
    deadline = commitDeadline;
  } else if (needsReveal && revealDeadline > 0) {
    kind = "reveal";
    deadline = revealDeadline;
  } else if (actionDeadline !== null && actionDeadline > 0) {
    kind = "action";
    deadline = actionDeadline;
  }

  if (deadline === null) {
    return {
      kind: null,
      secondsRemaining: null,
      isUrgent: false,
      isExpired: false
    };
  }

  const nowSeconds = nowMs / 1000;
  const secondsRemaining = Math.max(0, Math.floor(deadline - nowSeconds));

  return {
    kind,
    secondsRemaining,
    isUrgent: secondsRemaining <= 10,
    isExpired: secondsRemaining === 0
  };
}
