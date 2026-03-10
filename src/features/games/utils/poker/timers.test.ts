import { describe, expect, it } from "vitest";
import { deriveGameplayTimerState } from "./timers";

describe("deriveGameplayTimerState", () => {
  it("prefers commit deadlines when commit is required", () => {
    expect(
      deriveGameplayTimerState({
        nowMs: 100_000,
        needsCommit: true,
        needsReveal: false,
        commitDeadline: 110,
        revealDeadline: 130,
        actionDeadline: 150
      })
    ).toEqual({
      kind: "commit",
      secondsRemaining: 10,
      isUrgent: true,
      isExpired: false
    });
  });

  it("uses reveal deadlines when reveal is required", () => {
    expect(
      deriveGameplayTimerState({
        nowMs: 100_000,
        needsCommit: false,
        needsReveal: true,
        commitDeadline: 110,
        revealDeadline: 118,
        actionDeadline: 150
      })
    ).toEqual({
      kind: "reveal",
      secondsRemaining: 18,
      isUrgent: false,
      isExpired: false
    });
  });

  it("falls back to the action deadline when commit and reveal are inactive", () => {
    expect(
      deriveGameplayTimerState({
        nowMs: 100_000,
        needsCommit: false,
        needsReveal: false,
        commitDeadline: 0,
        revealDeadline: 0,
        actionDeadline: 125
      })
    ).toEqual({
      kind: "action",
      secondsRemaining: 25,
      isUrgent: false,
      isExpired: false
    });
  });

  it("returns no timer state when every deadline is inactive", () => {
    expect(
      deriveGameplayTimerState({
        nowMs: 100_000,
        needsCommit: false,
        needsReveal: false,
        commitDeadline: 0,
        revealDeadline: 0,
        actionDeadline: null
      })
    ).toEqual({
      kind: null,
      secondsRemaining: null,
      isUrgent: false,
      isExpired: false
    });
  });

  it("marks urgent countdowns at ten seconds or less", () => {
    expect(
      deriveGameplayTimerState({
        nowMs: 100_000,
        needsCommit: false,
        needsReveal: true,
        commitDeadline: 0,
        revealDeadline: 110,
        actionDeadline: null
      }).isUrgent
    ).toBe(true);
  });

  it("marks expired countdowns at zero seconds", () => {
    expect(
      deriveGameplayTimerState({
        nowMs: 100_000,
        needsCommit: false,
        needsReveal: false,
        commitDeadline: 0,
        revealDeadline: 0,
        actionDeadline: 100
      })
    ).toEqual({
      kind: "action",
      secondsRemaining: 0,
      isUrgent: true,
      isExpired: true
    });
  });

  it("keeps commit and reveal priority over action deadlines", () => {
    const commitState = deriveGameplayTimerState({
      nowMs: 100_000,
      needsCommit: true,
      needsReveal: false,
      commitDeadline: 101,
      revealDeadline: 0,
      actionDeadline: 160
    });

    const revealState = deriveGameplayTimerState({
      nowMs: 100_000,
      needsCommit: false,
      needsReveal: true,
      commitDeadline: 0,
      revealDeadline: 102,
      actionDeadline: 160
    });

    expect(commitState.kind).toBe("commit");
    expect(revealState.kind).toBe("reveal");
  });
});
