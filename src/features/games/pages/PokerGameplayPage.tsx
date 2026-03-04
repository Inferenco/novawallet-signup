import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { NovaButton } from "@/components/ui";
import { useToast } from "@/providers/ToastProvider";
import { useWallet } from "@/providers/WalletProvider";
import { hasConfiguredGameContracts } from "@/config/env";
import { useGamesNetwork } from "../hooks/useGamesNetwork";
import { useGameSigner } from "../hooks/useGameSigner";
import {
  usePokerTableStore,
  useIsAdmin,
  useIsMyTurn,
  useNeedsCommit,
  useNeedsReveal
} from "../stores/poker/table";
import { useCommitReveal } from "../hooks/poker/useCommitReveal";
import { useBettingActions } from "../hooks/poker/useBettingActions";
import { useTableActions } from "../hooks/poker/useTableActions";
import { useOwnerActions } from "../hooks/poker/useAdminActions";
import { useTimeoutHandler } from "../hooks/poker/useTimeoutHandler";
import { useAbortVote } from "../hooks/poker/useAbortVote";
import { usePolling } from "../utils/poker/polling";
import { GAME_PHASES, HAND_RANKS, PHASE_NAMES } from "../config/games";
import { parsePokerError } from "../utils/poker/errors";
import { formatCard } from "../utils/poker/cards";
import { fetchHandResults, type HandResultEvent } from "../services/poker/indexer";
import { formatChips } from "../services/poker/chips";
import { getProfiles, type UserProfile } from "../services/profiles";
import { deriveThemeFromColor } from "../utils/theme";
import "../styles/games.css";

const NORMAL_POLL = 3000;
const URGENT_POLL = 1000;
const BACKGROUND_POLL = 10000;

const DISPLAY_POSITIONS = ["bottom", "left", "top-left", "top-right", "right"] as const;

function shortAddress(address: string | null | undefined): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function isEmptySeat(address: string | null | undefined): boolean {
  return !address || address === "0x0";
}

export function PokerGameplayPage() {
  const { tableAddress } = useParams<{ tableAddress: string }>();
  const navigate = useNavigate();
  const wallet = useWallet();
  const signer = useGameSigner();
  const network = useGamesNetwork();
  const { pushToast } = useToast();
  const address = wallet.account?.address?.toString() ?? "";

  const {
    setActiveTable,
    refreshTableData,
    summary,
    tableState,
    seats,
    phase,
    playersInHand,
    actionInfo,
    potSize,
    communityCards,
    minRaise,
    maxCurrentBet,
    myHoleCards,
    myCardsDecrypted,
    mySeatIndex,
    commitDeadline,
    revealDeadline,
    isLoading,
    isRefreshing,
    error,
    reset
  } = usePokerTableStore();

  const isMyTurn = useIsMyTurn(address || undefined);
  const needsCommit = useNeedsCommit(address || undefined);
  const needsReveal = useNeedsReveal(address || undefined);
  const isAdmin = useIsAdmin(address || undefined);

  const [playerProfiles, setPlayerProfiles] = useState<Map<string, UserProfile | null>>(new Map());
  const [joinSeat, setJoinSeat] = useState<number | null>(null);
  const [joinBuyIn, setJoinBuyIn] = useState("200");
  const [raiseToAmount, setRaiseToAmount] = useState("");
  const [latestResult, setLatestResult] = useState<HandResultEvent | null>(null);
  const [showUtilityPanel, setShowUtilityPanel] = useState(true);
  const [failedAvatarUrls, setFailedAvatarUrls] = useState<Set<string>>(new Set());

  const commitReveal = useCommitReveal({
    network,
    tableAddress: tableAddress || "",
    playerAddress: address,
    handNumber: tableState?.handNumber || 0
  });

  const onActionSuccess = useCallback(async () => {
    await refreshTableData(address || undefined);
  }, [address, refreshTableData]);

  const bettingActions = useBettingActions({
    network,
    tableAddress: tableAddress || "",
    onSuccess: () => {
      void onActionSuccess();
    },
    onError: (_action, message) => {
      pushToast("error", parsePokerError(message));
    }
  });

  const tableActions = useTableActions({
    network,
    tableAddress: tableAddress || "",
    onSuccess: () => {
      void onActionSuccess();
    },
    onError: (_action, message) => {
      pushToast("error", parsePokerError(message));
    }
  });

  const ownerActions = useOwnerActions({
    network,
    tableAddress: tableAddress || "",
    onSuccess: () => {
      void onActionSuccess();
    },
    onError: (_action, message) => {
      pushToast("error", parsePokerError(message));
    }
  });

  const timeoutHandler = useTimeoutHandler({
    network,
    tableAddress: tableAddress || "",
    onTimeoutCalled: () => {
      void onActionSuccess();
    }
  });

  const abortVote = useAbortVote({
    network,
    tableAddress: tableAddress || "",
    onRequestSuccess: () => {
      pushToast("info", "Abort vote requested.");
      void onActionSuccess();
    },
    onVoteSuccess: () => {
      void onActionSuccess();
    },
    onFinalizeSuccess: () => {
      pushToast("info", "Abort vote finalized.");
      void onActionSuccess();
    },
    onCancelSuccess: () => {
      void onActionSuccess();
    }
  });

  useEffect(() => {
    if (!tableAddress || !hasConfiguredGameContracts()) return;
    setActiveTable(tableAddress, network);
    void refreshTableData(address || undefined);

    return () => {
      reset();
    };
  }, [address, network, refreshTableData, reset, setActiveTable, tableAddress]);

  useEffect(() => {
    if (!tableAddress) return;
    const id = window.setInterval(() => {
      void fetchHandResults(network, tableAddress, 1)
        .then((results) => {
          setLatestResult(results[0] || null);
        })
        .catch(() => {
          // ignore indexer lag/errors
        });
    }, 4000);

    return () => window.clearInterval(id);
  }, [network, tableAddress]);

  useEffect(() => {
    if (seats.length === 0) return;
    const addresses = Array.from(
      new Set(
        seats
          .map((seat) => seat.playerAddress)
          .filter((value): value is string => Boolean(value && value !== "0x0"))
      )
    );
    if (addresses.length === 0) return;

    getProfiles(network, addresses)
      .then((profiles) => {
        setPlayerProfiles(profiles);
      })
      .catch(() => {
        // ignore profile fetch failures
      });
  }, [network, seats]);

  const { poll, setUrgent } = usePolling(
    async () => {
      await refreshTableData(address || undefined);
    },
    {
      interval: NORMAL_POLL,
      urgentInterval: URGENT_POLL,
      backgroundInterval: BACKGROUND_POLL,
      enabled: Boolean(tableAddress && hasConfiguredGameContracts())
    }
  );

  useEffect(() => {
    setUrgent(isMyTurn || needsCommit || needsReveal);
  }, [isMyTurn, needsCommit, needsReveal, setUrgent]);

  useEffect(() => {
    if (error === "TABLE_CLOSED") {
      pushToast("info", "This table was closed.");
      navigate("/games/poker", { replace: true });
    }
  }, [error, navigate, pushToast]);

  const requireSigner = useCallback(() => {
    if (!wallet.connected || !signer) {
      pushToast("error", "Connect your wallet to play.");
      return null;
    }
    if (wallet.networkMismatch) {
      pushToast("error", "Switch wallet network to Cedra Testnet.");
      return null;
    }
    return signer;
  }, [pushToast, signer, wallet.connected, wallet.networkMismatch]);

  const myCurrentBet =
    mySeatIndex !== null && seats[mySeatIndex] ? seats[mySeatIndex].currentBet : 0;
  const callAmount = Math.max(0, maxCurrentBet - myCurrentBet);
  const canCheck = callAmount === 0;
  const inBettingRound = phase >= GAME_PHASES.PREFLOP && phase <= GAME_PHASES.RIVER;
  const activeSeatCount = seats.filter(
    (seat) => !isEmptySeat(seat.playerAddress) && !seat.isSittingOut && seat.chipCount > 0
  ).length;

  const runAction = useCallback(
    async (action: (activeSigner: NonNullable<typeof signer>) => Promise<boolean>) => {
      const activeSigner = requireSigner();
      if (!activeSigner) return;
      const ok = await action(activeSigner);
      if (ok) {
        await onActionSuccess();
      }
    },
    [onActionSuccess, requireSigner]
  );

  const handleJoin = useCallback(async () => {
    if (joinSeat === null) {
      pushToast("error", "Select an empty seat first.");
      return;
    }

    const buyIn = Number.parseInt(joinBuyIn, 10);
    if (!Number.isFinite(buyIn) || buyIn <= 0) {
      pushToast("error", "Enter a valid buy-in amount.");
      return;
    }

    await runAction((activeSigner) =>
      tableActions.doJoin(activeSigner, joinSeat, BigInt(buyIn))
    );
  }, [joinBuyIn, joinSeat, pushToast, runAction, tableActions]);

  const getProfileForAddress = useCallback(
    (seatAddress: string | null | undefined): UserProfile | null => {
      if (!seatAddress) return null;
      const direct = playerProfiles.get(seatAddress);
      if (direct) return direct;

      const lower = seatAddress.toLowerCase();
      for (const [key, value] of playerProfiles.entries()) {
        if (key.toLowerCase() === lower) {
          return value;
        }
      }
      return null;
    },
    [playerProfiles]
  );

  const theme = useMemo(() => deriveThemeFromColor(summary?.colorIndex ?? 0), [summary?.colorIndex]);

  const themeVars = useMemo(
    () =>
      ({
        "--poker-accent": theme.accent,
        "--poker-felt": theme.tableFeltLight,
        "--poker-felt-dark": theme.felt,
        "--poker-rail": theme.rail,
        "--poker-glow": `${theme.accent}66`
      }) as CSSProperties,
    [theme]
  );

  const rotatedSeatData = useMemo(() => {
    const seatCount = Math.max(summary?.totalSeats || 0, seats.length || 0, 5);
    const seatOrder = Array.from({ length: seatCount }, (_, displayPos) => {
      if (mySeatIndex === null || mySeatIndex < 0 || mySeatIndex >= seatCount) return displayPos;
      return (mySeatIndex + displayPos) % seatCount;
    });

    return seatOrder.map((actualSeatIndex, displayPos) => {
      const seat = seats[actualSeatIndex] || {
        playerAddress: null,
        chipCount: 0,
        currentBet: 0,
        status: 0,
        isSittingOut: false
      };
      const seatAddress = seat.playerAddress;
      const profile = getProfileForAddress(seatAddress);
      const isActive = actionInfo?.seatIdx === actualSeatIndex && inBettingRound;

      return {
        actualSeatIndex,
        displayPos,
        displayPosition: DISPLAY_POSITIONS[displayPos] || "bottom",
        seat,
        profile,
        isActive
      };
    });
  }, [summary?.totalSeats, seats, mySeatIndex, getProfileForAddress, actionInfo?.seatIdx, inBettingRound]);

  const canStartHand = Boolean(
    summary &&
      !summary.isPaused &&
      activeSeatCount >= 2 &&
      (!summary.ownerOnlyStart || isAdmin)
  );

  const canStraddle = useMemo(() => {
    if (!summary?.straddleEnabled) return false;
    if (phase !== GAME_PHASES.PREFLOP) return false;
    if (mySeatIndex === null || !tableState) return false;
    if (!isMyTurn) return false;

    const totalSeats = seats.length || 5;
    let utgSeat = -1;
    for (let offset = 3; offset <= totalSeats + 2; offset += 1) {
      const seatIdx = (tableState.dealerSeat + offset) % totalSeats;
      if (!isEmptySeat(seats[seatIdx]?.playerAddress)) {
        utgSeat = seatIdx;
        break;
      }
    }

    if (mySeatIndex !== utgSeat) return false;
    return maxCurrentBet <= summary.bigBlind;
  }, [summary, phase, mySeatIndex, tableState, isMyTurn, seats, maxCurrentBet]);

  const statusMessage = useMemo(() => {
    if (summary?.isPaused) return "Table paused";
    if (needsCommit) return "Request your cards";
    if (needsReveal) return "Reveal secret to accept cards";
    if (phase === GAME_PHASES.WAITING) {
      return activeSeatCount >= 2 ? "Ready to start hand" : "Waiting for players";
    }
    if (phase === GAME_PHASES.SHOWDOWN) return "Showdown";
    if (isMyTurn) return "Your turn";
    if (actionInfo?.playerAddr && actionInfo.playerAddr !== "0x0") {
      return `Waiting for ${shortAddress(actionInfo.playerAddr)}`;
    }
    return PHASE_NAMES[phase] || `Phase ${phase}`;
  }, [summary?.isPaused, needsCommit, needsReveal, phase, activeSeatCount, isMyTurn, actionInfo?.playerAddr]);

  if (!tableAddress) {
    return (
      <div className="games-gameplay-shell">
        <div className="games-gameplay-wrap">
          <p>Missing table address.</p>
          <Link className="nova-btn nova-btn-ghost" to="/games/poker">
            Back to lobby
          </Link>
        </div>
      </div>
    );
  }

  const myProfile = getProfileForAddress(address);
  const myAvatarBlocked = Boolean(
    myProfile?.avatarUrl && failedAvatarUrls.has(myProfile.avatarUrl)
  );

  return (
    <div className="games-gameplay-shell" style={themeVars}>
      <div className="games-gameplay-wrap games-gameplay-wrap-poker">
        <header className="games-poker-header">
          <div className="games-poker-header-left">
            <Link className="nova-btn nova-btn-ghost nova-btn-sm" to="/games/poker">
              Back
            </Link>
            <div>
              <p className="m-0 text-caption text-text-muted">Table</p>
              <p className="m-0 text-body text-text-primary">
                {summary?.name || shortAddress(tableAddress)}
              </p>
            </div>
          </div>

          <div className="games-poker-header-right">
            <span className={`games-poker-phase-pill ${isMyTurn ? "active" : ""}`}>
              {PHASE_NAMES[phase] || `Phase ${phase}`}
            </span>
            <NovaButton variant="ghost" size="sm" onClick={() => poll()}>
              Refresh
            </NovaButton>
            <NovaButton
              variant="ghost"
              size="sm"
              onClick={() => setShowUtilityPanel((current) => !current)}
            >
              {showUtilityPanel ? "Hide Panel" : "Show Panel"}
            </NovaButton>
          </div>
        </header>

        <div className={`games-poker-status ${isMyTurn ? "active" : ""}`}>
          <span>{statusMessage}</span>
          <div className="games-poker-status-actions">
            {needsCommit && (
              <NovaButton
                size="sm"
                onClick={() =>
                  void runAction(async (activeSigner) => commitReveal.commit(activeSigner))
                }
              >
                Commit
              </NovaButton>
            )}
            {needsReveal && (
              <NovaButton
                size="sm"
                onClick={() =>
                  void runAction(async (activeSigner) => commitReveal.reveal(activeSigner))
                }
              >
                Reveal
              </NovaButton>
            )}
            <NovaButton
              size="sm"
              variant="danger"
              disabled={!timeoutHandler.canCallTimeout}
              onClick={() => void runAction((activeSigner) => timeoutHandler.callTimeout(activeSigner))}
            >
              Timeout
            </NovaButton>
          </div>
        </div>

        {!hasConfiguredGameContracts() && (
          <div className="rounded-nova-standard border border-status-warning-border bg-status-warning-bg p-nova-md text-status-warning">
            Game contracts are not configured for this dapp environment.
          </div>
        )}

        <section className="games-poker-stage">
          <div className="games-poker-table-wrap">
            <div className="games-poker-table-rim">
              <div className="games-poker-table-felt">
                <div className="games-poker-pot-pill">
                  <span className="label">Pot</span>
                  <span className="value">{formatChips(potSize)}</span>
                </div>

                <div className="games-poker-board-row">
                  {[0, 1, 2, 3, 4].map((idx) => {
                    const card = communityCards[idx];
                    return (
                      <span
                        key={idx}
                        className={`games-playing-card ${card === undefined ? "face-down" : ""}`}
                      >
                        {card === undefined ? "" : formatCard(card)}
                      </span>
                    );
                  })}
                </div>

                <div className="games-poker-meta-row">
                  <span>Hand #{tableState?.handNumber || 0}</span>
                  <span>Players in hand: {playersInHand.length}</span>
                  <span>{isLoading || isRefreshing ? "Syncing..." : "Synced"}</span>
                </div>
              </div>
            </div>

            {rotatedSeatData.map(({ actualSeatIndex, displayPosition, seat, profile, isActive }) => {
              const empty = isEmptySeat(seat.playerAddress);
              const canJoinThisSeat = empty && mySeatIndex === null;
              const isFolded = seat.status === 2;
              const seatName = empty
                ? "Empty Seat"
                : profile?.nickname || shortAddress(seat.playerAddress) || `Seat ${actualSeatIndex + 1}`;
              const hasBrokenAvatar = Boolean(
                profile?.avatarUrl && failedAvatarUrls.has(profile.avatarUrl)
              );
              const shouldShowBet = !empty && seat.currentBet > 0 && phase !== GAME_PHASES.WAITING;

              return (
                <button
                  key={actualSeatIndex}
                  type="button"
                  className={`games-poker-seat games-poker-seat-${displayPosition} ${isActive ? "active" : ""} ${
                    mySeatIndex === actualSeatIndex ? "hero" : ""
                  } ${canJoinThisSeat ? "joinable" : ""}`}
                  onClick={() => {
                    if (canJoinThisSeat) {
                      setJoinSeat(actualSeatIndex);
                    }
                  }}
                  disabled={!canJoinThisSeat}
                >
                  <span className="seat-index">Seat {actualSeatIndex + 1}</span>
                  <span className="avatar-ring">
                    {profile?.avatarUrl && !hasBrokenAvatar ? (
                      <img
                        src={profile.avatarUrl}
                        alt={seatName}
                        onError={() => {
                          setFailedAvatarUrls((current) => {
                            const next = new Set(current);
                            next.add(profile.avatarUrl as string);
                            return next;
                          });
                        }}
                      />
                    ) : (
                      <span>{empty ? "+" : seatName.slice(0, 1).toUpperCase()}</span>
                    )}
                  </span>
                  <span className={`seat-name ${isFolded ? "muted" : ""}`}>{seatName}</span>
                  <span className={`seat-stack ${isFolded ? "muted" : ""}`}>
                    {formatChips(seat.chipCount)}
                  </span>
                  {shouldShowBet && <span className="seat-bet">Bet {formatChips(seat.currentBet)}</span>}
                  {canJoinThisSeat && <span className="join-copy">Tap to join</span>}
                </button>
              );
            })}
          </div>
        </section>

        {showUtilityPanel && (
          <section className="games-poker-utility-grid">
            <div className="games-poker-panel">
              <p className="panel-title">Join / Seat</p>
              <p className="panel-copy">
                {mySeatIndex === null
                  ? `Selected seat: ${joinSeat !== null ? joinSeat + 1 : "none"}`
                  : `You are seated at ${mySeatIndex + 1}`}
              </p>
              <input
                className="games-inline-input"
                value={joinBuyIn}
                onChange={(event) => setJoinBuyIn(event.target.value)}
                placeholder="Join buy-in"
              />
              <div className="games-poker-inline-actions">
                <NovaButton
                  size="sm"
                  disabled={joinSeat === null || mySeatIndex !== null}
                  onClick={() => void handleJoin()}
                >
                  Join Selected Seat
                </NovaButton>
                <NovaButton
                  size="sm"
                  variant="ghost"
                  onClick={() => void runAction((activeSigner) => tableActions.doLeave(activeSigner))}
                >
                  Leave
                </NovaButton>
                <NovaButton
                  size="sm"
                  variant="ghost"
                  onClick={() => void runAction((activeSigner) => tableActions.doSitOut(activeSigner))}
                >
                  Sit Out
                </NovaButton>
                <NovaButton
                  size="sm"
                  variant="ghost"
                  onClick={() => void runAction((activeSigner) => tableActions.doSitIn(activeSigner))}
                >
                  Sit In
                </NovaButton>
              </div>
            </div>

            <div className="games-poker-panel">
              <p className="panel-title">Commit / Reveal</p>
              <p className="panel-copy">
                Commit deadline: {commitDeadline > 0 ? new Date(commitDeadline * 1000).toLocaleTimeString() : "--"}
              </p>
              <p className="panel-copy">
                Reveal deadline: {revealDeadline > 0 ? new Date(revealDeadline * 1000).toLocaleTimeString() : "--"}
              </p>
              <p className="panel-copy">
                Status: {commitReveal.status}
                {commitReveal.error ? ` • ${commitReveal.error}` : ""}
              </p>
            </div>

            <div className="games-poker-panel">
              <p className="panel-title">Abort Vote</p>
              <p className="panel-copy">
                {abortVote.abortInProgress
                  ? `In progress • ${abortVote.approvalCount}/${abortVote.seatedCount} approvals`
                  : "No active abort vote"}
              </p>
              <div className="games-poker-inline-actions">
                <NovaButton size="sm" variant="ghost" onClick={() => void runAction((s) => abortVote.request(s))}>
                  Request
                </NovaButton>
                <NovaButton size="sm" variant="ghost" onClick={() => void runAction((s) => abortVote.vote(s, true))}>
                  Approve
                </NovaButton>
                <NovaButton size="sm" variant="ghost" onClick={() => void runAction((s) => abortVote.vote(s, false))}>
                  Veto
                </NovaButton>
                <NovaButton size="sm" disabled={!abortVote.canFinalize} onClick={() => void runAction((s) => abortVote.finalize(s))}>
                  Finalize
                </NovaButton>
                <NovaButton size="sm" variant="ghost" onClick={() => void runAction((s) => abortVote.cancel(s))}>
                  Cancel
                </NovaButton>
              </div>
            </div>

            {isAdmin && (
              <div className="games-poker-panel">
                <p className="panel-title">Owner Controls</p>
                <div className="games-poker-inline-actions">
                  <NovaButton size="sm" disabled={!canStartHand} onClick={() => void runAction((s) => tableActions.doStartHand(s))}>
                    Start Hand
                  </NovaButton>
                  <NovaButton size="sm" variant="ghost" onClick={() => void runAction((s) => ownerActions.doPause(s))}>
                    Pause
                  </NovaButton>
                  <NovaButton size="sm" variant="ghost" onClick={() => void runAction((s) => ownerActions.doResume(s))}>
                    Resume
                  </NovaButton>
                </div>
              </div>
            )}

            {latestResult && (
              <div className="games-poker-panel">
                <p className="panel-title">Latest Result</p>
                <p className="panel-copy">Hand #{latestResult.handNumber} • Pot {formatChips(latestResult.totalPot)}</p>
                <p className="panel-copy">
                  Winners: {latestResult.winnerPlayers.length}
                  {latestResult.showdownHandTypes[0] !== undefined
                    ? ` • ${HAND_RANKS[latestResult.showdownHandTypes[0]] || "Showdown"}`
                    : ""}
                </p>
              </div>
            )}
          </section>
        )}

        <section className="games-poker-hero-bar">
          <div className="games-poker-hero-top">
            <div className="games-poker-hero-summary">
              <span className={`hero-avatar ${isMyTurn ? "active" : ""}`}>
                {myProfile?.avatarUrl && !myAvatarBlocked ? (
                  <img
                    src={myProfile.avatarUrl}
                    alt={myProfile.nickname || "Hero"}
                    onError={() => {
                      setFailedAvatarUrls((current) => {
                        const next = new Set(current);
                        next.add(myProfile.avatarUrl as string);
                        return next;
                      });
                    }}
                  />
                ) : (
                  <span>{(myProfile?.nickname || "H").slice(0, 1).toUpperCase()}</span>
                )}
              </span>
              <div>
                <p className="m-0 text-caption text-text-muted">My Stack</p>
                <p className="m-0 text-body text-text-primary">
                  {formatChips(mySeatIndex !== null && seats[mySeatIndex] ? seats[mySeatIndex].chipCount : 0)}
                </p>
              </div>
            </div>

            <div className="games-poker-hero-cards">
              {[0, 1].map((idx) => {
                const card = myHoleCards[idx];
                const hidden = card === undefined || !myCardsDecrypted;
                return (
                  <span
                    key={idx}
                    className={`games-playing-card ${hidden ? "face-down" : ""}`}
                  >
                    {hidden ? "" : formatCard(card)}
                  </span>
                );
              })}
            </div>

            <div className="games-poker-raise-input">
              <label htmlFor="raise-input">Raise To</label>
              <input
                id="raise-input"
                className="games-inline-input"
                value={raiseToAmount}
                onChange={(event) => setRaiseToAmount(event.target.value)}
                placeholder={`${Math.max(minRaise, callAmount + myCurrentBet)}`}
              />
            </div>
          </div>

          <div className="games-poker-hero-actions">
            <NovaButton
              size="sm"
              variant="ghost"
              disabled={!isMyTurn || !inBettingRound}
              onClick={() => void runAction((s) => bettingActions.doFold(s))}
            >
              Fold
            </NovaButton>
            <NovaButton
              size="sm"
              variant="ghost"
              disabled={!isMyTurn || !inBettingRound || !canCheck}
              onClick={() => void runAction((s) => bettingActions.doCheck(s))}
            >
              Check
            </NovaButton>
            <NovaButton
              size="sm"
              variant="accent"
              disabled={!isMyTurn || !inBettingRound || canCheck}
              onClick={() => void runAction((s) => bettingActions.doCall(s))}
            >
              Call {formatChips(callAmount)}
            </NovaButton>
            <NovaButton
              size="sm"
              disabled={!isMyTurn || !inBettingRound}
              onClick={() => {
                const parsed = Number.parseInt(raiseToAmount, 10);
                if (!Number.isFinite(parsed) || parsed <= 0) {
                  pushToast("error", "Enter a valid raise amount.");
                  return;
                }
                void runAction((s) => bettingActions.doRaise(s, BigInt(parsed)));
              }}
            >
              Raise
            </NovaButton>
            <NovaButton
              size="sm"
              variant="danger"
              disabled={!isMyTurn || !inBettingRound}
              onClick={() => void runAction((s) => bettingActions.doAllIn(s))}
            >
              All-in
            </NovaButton>
          </div>

          <div className="games-poker-hero-subactions">
            <NovaButton
              size="sm"
              variant="ghost"
              disabled={!canStraddle}
              onClick={() => void runAction((s) => bettingActions.doStraddle(s))}
            >
              Straddle
            </NovaButton>
            <span className="text-caption text-text-muted">
              {tableActions.pendingAction || bettingActions.pendingAction || ownerActions.pendingAction
                ? "Submitting action..."
                : isMyTurn
                  ? "Action on you"
                  : "Waiting"}
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
