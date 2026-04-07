import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties
} from "react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/providers/ToastProvider";
import { useWallet } from "@/providers/WalletProvider";
import { hasConfiguredGameContracts } from "@/config/env";
import { useGamesNetwork } from "../../hooks/useGamesNetwork";
import { useGameSigner } from "../../hooks/useGameSigner";
import { useChipActions } from "../../hooks/poker/useChipActions";
import {
  usePokerTableStore,
  useIsAdmin,
  useIsMyTurn,
  useNeedsCommit,
  useNeedsReveal
} from "../../stores/poker/table";
import { usePokerTablesStore } from "../../stores/poker/tables";
import { useCommitReveal } from "../../hooks/poker/useCommitReveal";
import { useBettingActions } from "../../hooks/poker/useBettingActions";
import { useTableActions } from "../../hooks/poker/useTableActions";
import { useOwnerActions } from "../../hooks/poker/useAdminActions";
import { useTimeoutHandler } from "../../hooks/poker/useTimeoutHandler";
import { useAbortVote } from "../../hooks/poker/useAbortVote";
import { usePolling } from "../../utils/poker/polling";
import { GAME_PHASES, PHASE_NAMES } from "../../config/games";
import { parsePokerError } from "../../utils/poker/errors";
import { formatChips } from "../../services/poker/chips";
import { fetchHandResults } from "../../services/poker/indexer";
import { getProfiles, type UserProfile } from "../../services/profiles";
import { deriveThemeFromColor } from "../../utils/theme";
import { useChatContext } from "../../context/chat";
import { AbortVoteModal } from "./AbortVoteModal";
import { ChatPanel } from "./ChatPanel";
import { CommitRevealOverlay } from "./CommitRevealOverlay";
import { DesktopPokerGameplayLayout } from "./DesktopPokerGameplayLayout";
import { JoinTableModal } from "./JoinTableModal";
import { MobilePokerGameplayLayout } from "./MobilePokerGameplayLayout";
import { resolvePokerLayoutMode } from "./pokerGameplayLayout";
import type {
  PokerDisplaySeat,
  PokerGameplayLayoutProps,
  PokerGameplayViewModel,
  PokerLayoutMode
} from "./pokerGameplayTypes";
import { ShowdownModal } from "./ShowdownModal";
import { deriveGameplayTimerState } from "../../utils/poker/timers";
import "../../styles/games.css";
import "../../styles/poker-gameplay-shared.css";
import "../../styles/poker-gameplay-mobile.css";
import "../../styles/poker-gameplay-desktop.css";

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

function formatTimer(seconds: number | null): string {
  if (seconds === null || seconds <= 0) return "--:--";
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

type OwnerEditorMode = "main" | "blinds" | "buyin" | "kick";

interface PokerGameplayControllerProps {
  tableAddress: string;
}

interface ShowdownState {
  visible: boolean;
  winners: Array<{
    address: string;
    amount: number;
    holeCards: number[];
    handType: number;
    seatIndex: number;
  }>;
  resultType: "showdown" | "fold_win";
  totalPot: number;
  communityCards: number[];
  handNumber: number;
  showdownPlayers: Array<{
    address: string;
    seatIndex: number;
    holeCards: number[];
    handType: number;
  }>;
}

function getInitialLayoutMode(): PokerLayoutMode {
  if (typeof window === "undefined") {
    return "desktop";
  }

  return resolvePokerLayoutMode({
    width: window.innerWidth,
    coarsePointer: "matchMedia" in window ? window.matchMedia("(pointer: coarse)").matches : false
  });
}

export function PokerGameplayController({ tableAddress }: PokerGameplayControllerProps) {
  const navigate = useNavigate();
  const wallet = useWallet();
  const signer = useGameSigner();
  const network = useGamesNetwork();
  const { pushToast } = useToast();
  const { unreadCount, clearMessages, setIsTableOwner, isEnabled: isChatEnabled } = useChatContext();
  const address = wallet.account?.address?.toString() ?? "";
  const contractsReady = hasConfiguredGameContracts();
  const { removeTable, setMyTable } = usePokerTablesStore();

  const {
    setActiveTable,
    refreshTableData,
    summary,
    tableState,
    seats,
    phase,
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
    error,
    clearError,
    reset
  } = usePokerTableStore();

  const isMyTurn = useIsMyTurn(address || undefined);
  const needsCommit = useNeedsCommit(address || undefined);
  const needsReveal = useNeedsReveal(address || undefined);
  const isAdmin = useIsAdmin(address || undefined);
  const chipActions = useChipActions({
    network,
    playerAddress: address
  });
  const { refreshBalance: refreshChipBalance } = chipActions;

  const [layoutMode, setLayoutMode] = useState<PokerLayoutMode>(getInitialLayoutMode);
  const [playerProfiles, setPlayerProfiles] = useState<Map<string, UserProfile | null>>(new Map());
  const [joinSeat, setJoinSeat] = useState<number | null>(null);
  const [joinBuyIn, setJoinBuyIn] = useState("200");
  const [raiseToAmount, setRaiseToAmount] = useState("");
  const [raiseRatio, setRaiseRatio] = useState(50);
  const [showChat, setShowChat] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showOwnerPanel, setShowOwnerPanel] = useState(false);
  const [showAbortPanel, setShowAbortPanel] = useState(false);
  const [actionLocked, setActionLocked] = useState(false);
  const [actionLockHand, setActionLockHand] = useState<number | null>(null);
  const [actionLockPhase, setActionLockPhase] = useState<number | null>(null);
  const [ownerEditorMode, setOwnerEditorMode] = useState<OwnerEditorMode>("main");
  const [newSmallBlind, setNewSmallBlind] = useState("");
  const [newBigBlind, setNewBigBlind] = useState("");
  const [newMinBuyIn, setNewMinBuyIn] = useState("");
  const [newMaxBuyIn, setNewMaxBuyIn] = useState("");
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [failedAvatarUrls, setFailedAvatarUrls] = useState<Set<string>>(new Set());
  const routeReadyForErrorsRef = useRef(false);
  const [showdownData, setShowdownData] = useState<ShowdownState>({
    visible: false,
    winners: [],
    resultType: "showdown",
    totalPot: 0,
    communityCards: [],
    handNumber: 0,
    showdownPlayers: []
  });

  const commitReveal = useCommitReveal({
    network,
    tableAddress,
    playerAddress: address,
    handNumber: tableState?.handNumber || 0
  });

  const onActionSuccess = useCallback(async () => {
    await refreshTableData(address || undefined);
  }, [address, refreshTableData]);

  const bettingActions = useBettingActions({
    network,
    tableAddress,
    onSuccess: () => {
      void onActionSuccess();
    },
    onError: (_action, message) => {
      pushToast("error", parsePokerError(message));
    }
  });

  const tableActions = useTableActions({
    network,
    tableAddress,
    onSuccess: () => {
      void onActionSuccess();
    },
    onError: (_action, message) => {
      pushToast("error", parsePokerError(message));
    }
  });

  const ownerActions = useOwnerActions({
    network,
    tableAddress,
    onSuccess: () => {
      void onActionSuccess();
    },
    onError: (_action, message) => {
      pushToast("error", parsePokerError(message));
    }
  });

  const timeoutHandler = useTimeoutHandler({
    network,
    tableAddress,
    onTimeoutCalled: () => {
      void onActionSuccess();
    }
  });

  const abortVote = useAbortVote({
    network,
    tableAddress,
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
      setShowAbortPanel(false);
    },
    onCancelSuccess: () => {
      void onActionSuccess();
      setShowAbortPanel(false);
    }
  });

  useEffect(() => {
    const media = "matchMedia" in window ? window.matchMedia("(pointer: coarse)") : null;
    const updateLayoutMode = () => {
      setLayoutMode(
        resolvePokerLayoutMode({
          width: window.innerWidth,
          coarsePointer: media?.matches ?? false
        })
      );
    };

    updateLayoutMode();
    window.addEventListener("resize", updateLayoutMode);
    media?.addEventListener("change", updateLayoutMode);

    return () => {
      window.removeEventListener("resize", updateLayoutMode);
      media?.removeEventListener("change", updateLayoutMode);
    };
  }, []);

  useEffect(() => {
    routeReadyForErrorsRef.current = false;
    clearError();
    if (!contractsReady) return;
    setActiveTable(tableAddress, network);
    void refreshTableData(address || undefined);
    routeReadyForErrorsRef.current = true;

    return () => {
      routeReadyForErrorsRef.current = false;
      reset();
    };
  }, [address, clearError, contractsReady, network, refreshTableData, reset, setActiveTable, tableAddress]);

  useEffect(() => {
    if (!wallet.connected || !address) return;
    void refreshChipBalance();
  }, [address, refreshChipBalance, wallet.connected]);

  useEffect(() => {
    setIsTableOwner(isAdmin);
  }, [isAdmin, setIsTableOwner]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => {
      window.clearInterval(id);
    };
  }, []);

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
      enabled: Boolean(contractsReady)
    }
  );

  useEffect(() => {
    setUrgent(isMyTurn || needsCommit || needsReveal);
  }, [isMyTurn, needsCommit, needsReveal, setUrgent]);

  useEffect(() => {
    if (routeReadyForErrorsRef.current && error === "TABLE_CLOSED") {
      clearError();
      pushToast("info", "This table was closed.");
      navigate("/games/poker", { replace: true });
    }
  }, [clearError, error, navigate, pushToast]);

  useEffect(() => {
    if (!actionLocked) return;

    const shouldUnlock =
      phase < GAME_PHASES.PREFLOP ||
      phase > GAME_PHASES.RIVER ||
      !isMyTurn ||
      (actionLockPhase !== null && phase !== actionLockPhase) ||
      (actionLockHand !== null && tableState?.handNumber != null && tableState.handNumber !== actionLockHand);
    if (shouldUnlock) {
      const id = window.setTimeout(() => setActionLocked(false), 0);
      return () => window.clearTimeout(id);
    }
  }, [actionLockHand, actionLockPhase, actionLocked, isMyTurn, phase, tableState?.handNumber]);

  const previousPhaseRef = useRef<number | null>(null);
  const previousHandNumberRef = useRef<number | null>(null);
  const processedHandsRef = useRef<Set<number>>(new Set());
  const latestHandRef = useRef(0);

  useEffect(() => {
    previousPhaseRef.current = null;
    previousHandNumberRef.current = null;
    processedHandsRef.current = new Set();
    latestHandRef.current = 0;
    const id = window.setTimeout(() => {
      setShowdownData((current) => (current.visible ? { ...current, visible: false } : current));
    }, 0);
    return () => window.clearTimeout(id);
  }, [tableAddress]);

  useEffect(() => {
    const prevPhase = previousPhaseRef.current;
    const currentPhase = phase;
    const prevHand = previousHandNumberRef.current;
    const currentHand = tableState?.handNumber || 0;

    previousPhaseRef.current = currentPhase;
    previousHandNumberRef.current = currentHand;
    latestHandRef.current = currentHand;

    const wasInActiveHand = prevPhase !== null && prevPhase >= GAME_PHASES.PREFLOP;
    const phaseToWaiting = wasInActiveHand && currentPhase === GAME_PHASES.WAITING;
    const phaseToShowdown =
      currentPhase === GAME_PHASES.SHOWDOWN &&
      (prevPhase === null || prevPhase !== GAME_PHASES.SHOWDOWN);
    const handIncremented = currentHand > (prevHand || 0);

    let targetHand: number | null = null;

    if (prevPhase === null || prevHand === null) {
      if (currentPhase === GAME_PHASES.SHOWDOWN) {
        targetHand = currentHand;
      }
    } else {
      if (currentHand > prevHand) {
        window.setTimeout(() => {
          setShowdownData((current) => (current.visible ? { ...current, visible: false } : current));
        }, 0);
      }

      if (handIncremented) {
        targetHand = prevHand;
      } else if (phaseToWaiting || phaseToShowdown) {
        targetHand = currentHand;
      }
    }

    if (targetHand === null || processedHandsRef.current.has(targetHand)) {
      return;
    }

    processedHandsRef.current.add(targetHand);
    let attempt = 0;
    const maxAttempts = 8;

    const fetchResult = () => {
      void fetchHandResults(network, tableAddress, 10)
        .then((events) => {
          const event = events.find((entry) => entry.handNumber === targetHand);
          if (event) {
            const showdownPlayers = event.showdownPlayers.map((playerAddress, index) => ({
              address: playerAddress,
              seatIndex: event.showdownSeats[index] || 0,
              holeCards: event.showdownHoleCards[index] || [],
              handType: event.showdownHandTypes[index] || 0
            }));

            const winners = event.winnerPlayers.map((winnerAddress, index) => {
              const seatIndex = event.winnerSeats[index] || 0;
              const showdownIndex = event.showdownSeats.indexOf(seatIndex);

              return {
                address: winnerAddress,
                amount: event.winnerAmounts[index] || 0,
                holeCards: showdownIndex >= 0 ? event.showdownHoleCards[showdownIndex] || [] : [],
                handType: showdownIndex >= 0 ? event.showdownHandTypes[showdownIndex] || 0 : 0,
                seatIndex
              };
            });

            if (latestHandRef.current > targetHand) {
              return;
            }

            setShowdownData({
              visible: true,
              winners,
              resultType: event.resultType === 1 ? "fold_win" : "showdown",
              totalPot: event.totalPot,
              communityCards: event.communityCards,
              handNumber: event.handNumber,
              showdownPlayers
            });
            return;
          }

          if (attempt < maxAttempts) {
            attempt += 1;
            window.setTimeout(fetchResult, 1500);
          }
        })
        .catch(() => {
          if (attempt < maxAttempts) {
            attempt += 1;
            window.setTimeout(fetchResult, 1500);
          }
        });
    };

    fetchResult();
  }, [network, phase, tableAddress, tableState?.handNumber]);

  const requireSigner = useCallback(() => {
    if (!contractsReady) {
      pushToast("error", "Game contract addresses are not configured.");
      return null;
    }
    if (!wallet.connected || !signer) {
      pushToast("error", "Connect your wallet to play.");
      return null;
    }
    if (wallet.networkMismatch) {
      pushToast("error", "Switch wallet network to Cedra Testnet.");
      return null;
    }
    return signer;
  }, [contractsReady, pushToast, signer, wallet.connected, wallet.networkMismatch]);

  const myCurrentBet = mySeatIndex !== null && seats[mySeatIndex] ? seats[mySeatIndex].currentBet : 0;
  const myStack = mySeatIndex !== null && seats[mySeatIndex] ? seats[mySeatIndex].chipCount : 0;
  const callAmount = Math.max(0, maxCurrentBet - myCurrentBet);
  const canCheck = callAmount === 0;
  const inBettingRound = phase >= GAME_PHASES.PREFLOP && phase <= GAME_PHASES.RIVER;
  const activeSeatCount = seats.filter(
    (seat) => !isEmptySeat(seat.playerAddress) && !seat.isSittingOut && seat.chipCount > 0
  ).length;
  const minRaiseTo = Math.max(minRaise, myCurrentBet + callAmount);
  const maxRaiseTo = myCurrentBet + myStack;

  const runAction = useCallback(
    async (
      action: (activeSigner: NonNullable<typeof signer>) => Promise<boolean>,
      options?: { lockOnSuccess?: boolean }
    ) => {
      if (options?.lockOnSuccess && actionLocked) return false;

      const activeSigner = requireSigner();
      if (!activeSigner) return false;
      const ok = await action(activeSigner);
      if (ok) {
        if (options?.lockOnSuccess) {
          setActionLocked(true);
          setActionLockHand(tableState?.handNumber ?? null);
          setActionLockPhase(phase);
        }
        await onActionSuccess();
      }
      return ok;
    },
    [actionLocked, onActionSuccess, phase, requireSigner, tableState?.handNumber]
  );

  const calculateRaiseFromRatio = useCallback(
    (ratio: number) => {
      if (maxRaiseTo <= minRaiseTo) return minRaiseTo;
      return Math.round(minRaiseTo + (ratio / 100) * (maxRaiseTo - minRaiseTo));
    },
    [maxRaiseTo, minRaiseTo]
  );

  const syncRatioFromRaise = useCallback(
    (amount: number) => {
      if (maxRaiseTo <= minRaiseTo) {
        setRaiseRatio(100);
        return;
      }
      const raw = ((amount - minRaiseTo) / (maxRaiseTo - minRaiseTo)) * 100;
      const bounded = Math.max(0, Math.min(100, Math.round(raw)));
      setRaiseRatio(bounded);
    },
    [maxRaiseTo, minRaiseTo]
  );

  const setRaisePreset = useCallback(
    (ratio: number) => {
      const bounded = Math.max(0, Math.min(100, ratio));
      setRaiseRatio(bounded);
      setRaiseToAmount(String(calculateRaiseFromRatio(bounded)));
    },
    [calculateRaiseFromRatio]
  );

  const handleJoin = useCallback(
    async (seatOverride?: number, buyInOverride?: bigint) => {
      const selectedSeat = seatOverride ?? joinSeat;
      if (selectedSeat === null) {
        pushToast("error", "Select an empty seat first.");
        return;
      }

      const buyIn = buyInOverride ? Number(buyInOverride) : Number.parseInt(joinBuyIn, 10);
      if (!Number.isFinite(buyIn) || buyIn <= 0) {
        pushToast("error", "Enter a valid buy-in amount.");
        return;
      }

      if (summary && (buyIn < summary.minBuyIn || buyIn > summary.maxBuyIn)) {
        pushToast(
          "error",
          `Buy-in must be between ${formatChips(summary.minBuyIn)} and ${formatChips(summary.maxBuyIn)}.`
        );
        return;
      }

      const joined = await runAction(
        (activeSigner) => tableActions.doJoin(activeSigner, selectedSeat, BigInt(buyIn)),
        undefined
      );
      if (joined) {
        setShowJoinModal(false);
        setJoinSeat(null);
      }
    },
    [joinBuyIn, joinSeat, pushToast, runAction, summary, tableActions]
  );

  const getProfileForAddress = useCallback(
    (seatAddress: string | null | undefined): UserProfile | null => {
      if (!seatAddress) return null;
      if (playerProfiles.has(seatAddress)) {
        return playerProfiles.get(seatAddress) ?? null;
      }
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

  const rotatedSeatData = useMemo<PokerDisplaySeat[]>(() => {
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
    if (needsReveal) return "Accept your cards";
    if (phase === GAME_PHASES.WAITING) {
      return activeSeatCount >= 2 ? "Press Start Hand to begin" : "Waiting for players...";
    }
    if (phase === GAME_PHASES.SHOWDOWN) return "Showdown";
    if (isMyTurn) return "Your turn";
    if (actionInfo?.playerAddr && actionInfo.playerAddr !== "0x0") {
      return `Waiting for ${shortAddress(actionInfo.playerAddr)}`;
    }
    return PHASE_NAMES[phase] || `Phase ${phase}`;
  }, [summary?.isPaused, needsCommit, needsReveal, phase, activeSeatCount, isMyTurn, actionInfo?.playerAddr]);

  const timerState = useMemo(
    () =>
      deriveGameplayTimerState({
        nowMs,
        needsCommit,
        needsReveal,
        commitDeadline,
        revealDeadline,
        actionDeadline: actionInfo?.deadline ?? null
      }),
    [actionInfo?.deadline, commitDeadline, needsCommit, needsReveal, nowMs, revealDeadline]
  );

  const overlayVisible = mySeatIndex !== null && (needsCommit || needsReveal);

  useEffect(() => {
    if (!overlayVisible) return;
    const id = window.setTimeout(() => {
      setShowChat(false);
      setShowOwnerPanel(false);
      setShowAbortPanel(false);
    }, 0);
    return () => window.clearTimeout(id);
  }, [overlayVisible]);

  useEffect(() => {
    if (!showOwnerPanel && !showAbortPanel && !showJoinModal && !showdownData.visible) return;
    setShowChat(false);
  }, [showAbortPanel, showJoinModal, showOwnerPanel, showdownData.visible]);

  const pendingActionCopy = useMemo(() => {
    if (
      tableActions.pendingAction ||
      bettingActions.pendingAction ||
      ownerActions.pendingAction ||
      abortVote.isPending
    ) {
      return "Action pending...";
    }
    if (isMyTurn) return "Action on you";
    return "Waiting";
  }, [
    abortVote.isPending,
    bettingActions.pendingAction,
    isMyTurn,
    ownerActions.pendingAction,
    tableActions.pendingAction
  ]);

  const occupiedSeats = useMemo(
    () =>
      seats
        .map((seat, seatIndex) => ({ seat, seatIndex }))
        .filter(({ seat }) => !isEmptySeat(seat.playerAddress)),
    [seats]
  );

  const myProfile = getProfileForAddress(address);
  const myAvatarBlocked = Boolean(myProfile?.avatarUrl && failedAvatarUrls.has(myProfile.avatarUrl));
  const markAvatarFailed = useCallback((avatarUrl: string) => {
    setFailedAvatarUrls((current) => {
      const next = new Set(current);
      next.add(avatarUrl);
      return next;
    });
  }, []);

  const buyInBbMin = summary?.bigBlind ? Math.floor(summary.minBuyIn / summary.bigBlind) : 0;
  const buyInBbMax = summary?.bigBlind ? Math.floor(summary.maxBuyIn / summary.bigBlind) : 0;
  const blindsLabel = `Blinds ${summary?.smallBlind ?? 0}/${summary?.bigBlind ?? 0} • Buy-In ${buyInBbMin}-${buyInBbMax} BB`;

  const handleCommitPrompt = useCallback(() => {
    void runAction(async (activeSigner) => commitReveal.commit(activeSigner));
  }, [commitReveal, runAction]);

  const handleRevealPrompt = useCallback(() => {
    void runAction(async (activeSigner) => commitReveal.reveal(activeSigner));
  }, [commitReveal, runAction]);

  const handleTimeoutAction = useCallback(() => {
    void runAction((activeSigner) => timeoutHandler.callTimeout(activeSigner), {
      lockOnSuccess: true
    });
  }, [runAction, timeoutHandler]);

  const handleToggleControls = useCallback(() => {
    setShowChat(false);
    if (isAdmin) {
      setShowOwnerPanel((current) => {
        const next = !current;
        if (next && summary) {
          setNewSmallBlind(String(summary.smallBlind));
          setNewBigBlind(String(summary.bigBlind));
          setNewMinBuyIn(String(summary.minBuyIn));
          setNewMaxBuyIn(String(summary.maxBuyIn));
          setOwnerEditorMode("main");
        }
        if (next) {
          setShowAbortPanel(false);
        }
        return next;
      });
    } else {
      setShowAbortPanel((current) => {
        const next = !current;
        if (next) {
          setShowOwnerPanel(false);
        }
        return next;
      });
    }
  }, [isAdmin, summary]);

  const handleJoinSeat = useCallback(
    (seatIndex: number) => {
      setJoinSeat(seatIndex);
      setShowJoinModal(true);
    },
    []
  );

  const viewModel = useMemo<PokerGameplayViewModel>(
    () => ({
      table: {
        name: summary?.name || "Nova Poker",
        blindsLabel,
        phase,
        phaseLabel: PHASE_NAMES[phase] || "Waiting",
        handNumber: tableState?.handNumber || 0,
        handNumberLabel: `Hand #${tableState?.handNumber || 0}`,
        statusMessage,
        timerText: formatTimer(timerState.secondsRemaining),
        timerUrgent: timerState.isUrgent,
        potSize,
        communityCards,
        dealerSeat: tableState?.dealerSeat ?? null,
        heroSeatIndex: mySeatIndex,
        canTimeout: timeoutHandler.canCallTimeout,
        timeoutPending: timeoutHandler.isPending
      },
      hero: {
        seated: mySeatIndex !== null,
        nickname: myProfile?.nickname ?? null,
        avatarUrl: myProfile?.avatarUrl ?? null,
        avatarBlocked: myAvatarBlocked,
        stack: myStack,
        cards: myHoleCards,
        cardsDecrypted: myCardsDecrypted,
        isMyTurn,
        callAmount,
        canCheck,
        canStraddle,
        inBettingRound,
        actionLocked,
        pendingActionCopy,
        raiseToAmount,
        raiseRatio,
        minRaiseTo,
        maxRaiseTo
      },
      tableSeats: rotatedSeatData,
      controls: {
        canStartHand,
        canJoinTable:
          chipActions.chipBalance > 0 &&
          (summary ? summary.occupiedSeats < summary.totalSeats : false),
        canLeaveWaitingState: mySeatIndex !== null,
        joinButtonLabel: chipActions.chipBalance <= 0 ? "No Chips" : "Join Table"
      },
      overlays: {
        showCommitReveal: overlayVisible,
        showJoin: showJoinModal,
        showOwnerPanel,
        showAbortPanel,
        showChat,
        showShowdown: showdownData.visible
      },
      chat: {
        unreadCount,
        enabled: isChatEnabled
      },
      session: {
        isAdmin
      }
    }),
    [
      actionLocked,
      blindsLabel,
      callAmount,
      canCheck,
      canStartHand,
      canStraddle,
      chipActions.chipBalance,
      communityCards,
      inBettingRound,
      isAdmin,
      isChatEnabled,
      isMyTurn,
      maxRaiseTo,
      minRaiseTo,
      myAvatarBlocked,
      myCardsDecrypted,
      myHoleCards,
      myProfile?.avatarUrl,
      myProfile?.nickname,
      mySeatIndex,
      myStack,
      overlayVisible,
      pendingActionCopy,
      phase,
      potSize,
      raiseRatio,
      raiseToAmount,
      rotatedSeatData,
      showdownData.visible,
      showAbortPanel,
      showChat,
      showJoinModal,
      showOwnerPanel,
      statusMessage,
      summary,
      tableState?.dealerSeat,
      tableState?.handNumber,
      timerState.isUrgent,
      timerState.secondsRemaining,
      timeoutHandler.canCallTimeout,
      timeoutHandler.isPending,
      unreadCount
    ]
  );

  const sharedLayoutProps: PokerGameplayLayoutProps = {
    viewModel,
    failedAvatarUrls,
    onAvatarError: markAvatarFailed,
    onToggleChat: () => {
      setShowOwnerPanel(false);
      setShowAbortPanel(false);
      setShowChat((current) => !current);
    },
    onToggleOwnerPanel: handleToggleControls,
    onJoinSeat: handleJoinSeat,
    onRaiseInputChange: (value: string) => {
      setRaiseToAmount(value);
      const parsed = Number.parseInt(value, 10);
      if (Number.isFinite(parsed)) {
        syncRatioFromRaise(parsed);
      }
    },
    onPreset: setRaisePreset,
    onSliderChange: (ratio: number) => {
      setRaiseRatio(ratio);
      setRaiseToAmount(String(calculateRaiseFromRatio(ratio)));
    },
    onFold: () =>
      void runAction((activeSigner) => bettingActions.doFold(activeSigner), {
        lockOnSuccess: true
      }),
    onCheck: () =>
      void runAction((activeSigner) => bettingActions.doCheck(activeSigner), {
        lockOnSuccess: true
      }),
    onCall: () =>
      void runAction((activeSigner) => bettingActions.doCall(activeSigner), {
        lockOnSuccess: true
      }),
    onRaise: () => {
      const parsed = Number.parseInt(raiseToAmount, 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        pushToast("error", "Enter a valid raise amount.");
        return;
      }
      if (parsed < minRaiseTo) {
        pushToast("error", `Raise must be at least ${formatChips(minRaiseTo)}.`);
        return;
      }
      void runAction((activeSigner) => bettingActions.doRaise(activeSigner, BigInt(parsed)), {
        lockOnSuccess: true
      });
    },
    onAllIn: () =>
      void runAction((activeSigner) => bettingActions.doAllIn(activeSigner), {
        lockOnSuccess: true
      }),
    onStraddle: () =>
      void runAction((activeSigner) => bettingActions.doStraddle(activeSigner), {
        lockOnSuccess: true
      }),
    onSitOut: () => void runAction((activeSigner) => tableActions.doSitOut(activeSigner)),
    onSitIn: () => void runAction((activeSigner) => tableActions.doSitIn(activeSigner)),
    onStartHand: () => void runAction((activeSigner) => tableActions.doStartHand(activeSigner)),
    onLeaveTable: () => void runAction((activeSigner) => tableActions.doLeave(activeSigner)),
    onTimeout: handleTimeoutAction,
    onAbort: () => {
      setShowChat(false);
      setShowAbortPanel(true);
    }
  };

  return (
    <div className="games-gameplay-shell games-gameplay-shell-wallet poker-gameplay-route" style={themeVars}>
      {!contractsReady && (
        <div className="games-wallet-config-warning">
          Configure `VITE_GAME_CONTRACT_ADDRESS` and `VITE_WALLET_CONTRACT_ADDRESS` to enable live transactions.
        </div>
      )}

      {layoutMode === "mobile" ? (
        <MobilePokerGameplayLayout {...sharedLayoutProps} />
      ) : (
        <DesktopPokerGameplayLayout {...sharedLayoutProps} />
      )}

      <CommitRevealOverlay
        visible={overlayVisible}
        phase={needsCommit ? "commit" : "reveal"}
        secondsRemaining={timerState.secondsRemaining ?? 0}
        status={commitReveal.status}
        error={commitReveal.error}
        canCallTimeout={timeoutHandler.canCallTimeout}
        timeoutPending={timeoutHandler.isPending}
        onCommit={handleCommitPrompt}
        onReveal={handleRevealPrompt}
        onTimeout={handleTimeoutAction}
      />

      {showOwnerPanel && isAdmin && summary ? (
        <div className="games-modal-backdrop">
          <div className="games-wallet-modal games-wallet-owner-modal">
            <div className="games-wallet-modal-header">
              <p className="m-0 games-wallet-modal-title">Admin Controls</p>
              <button
                type="button"
                className="games-wallet-icon-btn games-wallet-icon-only"
                onClick={() => setShowOwnerPanel(false)}
              >
                ✕
              </button>
            </div>

            {ownerEditorMode === "main" ? (
              <>
                <div className="games-wallet-owner-status-row">
                  <span>Table Status</span>
                  <span className={`games-wallet-status-pill ${summary.isPaused ? "paused" : "active"}`}>
                    {summary.isPaused ? "PAUSED" : "ACTIVE"}
                  </span>
                </div>

                <div className="games-wallet-owner-pause-row">
                  <div>
                    <p className="m-0 games-wallet-modal-title-small">Pause Table</p>
                    <p className="m-0 games-wallet-modal-copy">Prevent new hands from starting</p>
                  </div>
                  <label className="games-wallet-switch">
                    <input
                      type="checkbox"
                      checked={summary.isPaused}
                      onChange={() => {
                        void runAction((activeSigner) =>
                          summary.isPaused
                            ? ownerActions.doResume(activeSigner)
                            : ownerActions.doPause(activeSigner)
                        );
                      }}
                    />
                    <span />
                  </label>
                </div>

                <div className="games-wallet-owner-grid">
                  <button type="button" className="games-wallet-owner-action" onClick={() => setOwnerEditorMode("blinds")}>
                    Blinds
                  </button>
                  <button type="button" className="games-wallet-owner-action" onClick={() => setOwnerEditorMode("buyin")}>
                    Buy-In
                  </button>
                  <button
                    type="button"
                    className="games-wallet-owner-action"
                    onClick={() => setOwnerEditorMode("kick")}
                    disabled={occupiedSeats.length === 0}
                  >
                    Kick
                  </button>
                  <button
                    type="button"
                    className="games-wallet-owner-action danger"
                    onClick={async () => {
                      if (summary.hasActiveGame) {
                        pushToast("error", "Cannot close table during an active hand.");
                        return;
                      }
                      const closed = await runAction((activeSigner) => ownerActions.doCloseTable(activeSigner));
                      if (closed) {
                        removeTable(tableAddress);
                        setMyTable(null);
                        await clearMessages();
                        navigate("/games/poker", { replace: true });
                      }
                    }}
                    disabled={summary.hasActiveGame}
                  >
                    Close
                  </button>
                </div>
              </>
            ) : null}

            {ownerEditorMode === "blinds" ? (
              <>
                <p className="m-0 games-wallet-modal-title-small">Update Blinds</p>
                <div className="games-wallet-form-grid">
                  <label>
                    Small Blind
                    <input
                      className="games-wallet-text-input"
                      value={newSmallBlind}
                      onChange={(event) => setNewSmallBlind(event.target.value)}
                    />
                  </label>
                  <label>
                    Big Blind
                    <input
                      className="games-wallet-text-input"
                      value={newBigBlind}
                      onChange={(event) => setNewBigBlind(event.target.value)}
                    />
                  </label>
                </div>
                <div className="games-wallet-modal-actions">
                  <button type="button" className="games-wallet-mini-btn" onClick={() => setOwnerEditorMode("main")}>
                    Back
                  </button>
                  <button
                    type="button"
                    className="games-wallet-mini-btn games-wallet-mini-btn-accent"
                    onClick={() => {
                      const sb = Number.parseInt(newSmallBlind, 10);
                      const bb = Number.parseInt(newBigBlind, 10);
                      if (!Number.isFinite(sb) || !Number.isFinite(bb) || sb <= 0 || bb <= 0) {
                        pushToast("error", "Enter valid blind values.");
                        return;
                      }
                      if (bb !== sb * 2) {
                        pushToast("error", "Big blind must be exactly 2x small blind.");
                        return;
                      }
                      void runAction((activeSigner) =>
                        ownerActions.doUpdateBlinds(activeSigner, BigInt(sb), BigInt(bb))
                      );
                      setOwnerEditorMode("main");
                    }}
                  >
                    Update
                  </button>
                </div>
              </>
            ) : null}

            {ownerEditorMode === "buyin" ? (
              <>
                <p className="m-0 games-wallet-modal-title-small">Update Buy-In</p>
                <div className="games-wallet-form-grid">
                  <label>
                    Min Buy-In
                    <input
                      className="games-wallet-text-input"
                      value={newMinBuyIn}
                      onChange={(event) => setNewMinBuyIn(event.target.value)}
                    />
                  </label>
                  <label>
                    Max Buy-In
                    <input
                      className="games-wallet-text-input"
                      value={newMaxBuyIn}
                      onChange={(event) => setNewMaxBuyIn(event.target.value)}
                    />
                  </label>
                </div>
                <div className="games-wallet-modal-actions">
                  <button type="button" className="games-wallet-mini-btn" onClick={() => setOwnerEditorMode("main")}>
                    Back
                  </button>
                  <button
                    type="button"
                    className="games-wallet-mini-btn games-wallet-mini-btn-accent"
                    onClick={() => {
                      const min = Number.parseInt(newMinBuyIn, 10);
                      const max = Number.parseInt(newMaxBuyIn, 10);
                      if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max <= 0) {
                        pushToast("error", "Enter valid buy-in values.");
                        return;
                      }
                      if (max < min) {
                        pushToast("error", "Max buy-in must be greater than or equal to min buy-in.");
                        return;
                      }
                      void runAction((activeSigner) =>
                        ownerActions.doUpdateBuyInLimits(activeSigner, BigInt(min), BigInt(max))
                      );
                      setOwnerEditorMode("main");
                    }}
                  >
                    Update
                  </button>
                </div>
              </>
            ) : null}

            {ownerEditorMode === "kick" ? (
              <>
                <p className="m-0 games-wallet-modal-title-small">Kick Player</p>
                <div className="games-wallet-kick-list">
                  {occupiedSeats.map(({ seat, seatIndex }) => (
                    <button
                      key={seat.playerAddress || seatIndex}
                      type="button"
                      className="games-wallet-kick-item"
                      onClick={() => {
                        void runAction((activeSigner) => ownerActions.doKickPlayer(activeSigner, seatIndex));
                        setOwnerEditorMode("main");
                      }}
                    >
                      <span>
                        Seat {seatIndex + 1} {shortAddress(seat.playerAddress)}
                      </span>
                      <span>{formatChips(seat.chipCount)}</span>
                    </button>
                  ))}
                </div>
                <div className="games-wallet-modal-actions">
                  <button type="button" className="games-wallet-mini-btn" onClick={() => setOwnerEditorMode("main")}>
                    Back
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      <ChatPanel visible={showChat} onClose={() => setShowChat(false)} layoutMode={layoutMode} />

      {summary ? (
        <JoinTableModal
          visible={showJoinModal}
          selectedSeat={joinSeat}
          seats={seats}
          minBuyIn={summary.minBuyIn}
          maxBuyIn={summary.maxBuyIn}
          userChipBalance={chipActions.chipBalance}
          isPending={tableActions.pendingAction === "join"}
          onClose={() => setShowJoinModal(false)}
          onSelectedSeatChange={(seatIndex) => setJoinSeat(seatIndex)}
          onJoin={async (seatIndex, buyInAmount) => {
            setJoinBuyIn(String(buyInAmount));
            await handleJoin(seatIndex, buyInAmount);
          }}
        />
      ) : null}

      <ShowdownModal
        visible={showdownData.visible}
        handNumber={showdownData.handNumber}
        resultType={showdownData.resultType}
        totalPot={showdownData.totalPot}
        communityCards={showdownData.communityCards}
        winners={showdownData.winners}
        showdownPlayers={showdownData.showdownPlayers}
        playerProfiles={playerProfiles}
        onClose={() => {
          setShowdownData((current) => ({ ...current, visible: false }));
          void poll();
        }}
      />

      <AbortVoteModal
        visible={showAbortPanel || abortVote.abortInProgress}
        abortInProgress={abortVote.abortInProgress}
        approvals={abortVote.approvalCount}
        vetos={abortVote.vetoCount}
        seatedCount={abortVote.seatedCount}
        deadline={abortVote.abortDeadline}
        canFinalize={abortVote.canFinalize}
        isPending={abortVote.isPending}
        onClose={() => setShowAbortPanel(false)}
        onRequest={async () => {
          await runAction((activeSigner) => abortVote.request(activeSigner));
        }}
        onVote={async (approve) => {
          await runAction((activeSigner) => abortVote.vote(activeSigner, approve));
        }}
        onFinalize={async () => {
          await runAction((activeSigner) => abortVote.finalize(activeSigner));
        }}
        onCancel={async () => {
          await runAction((activeSigner) => abortVote.cancel(activeSigner));
        }}
      />

      {!summary && !contractsReady ? null : !summary ? (
        <div className="poker-gameplay-empty-state">
          <p>Loading table…</p>
          <Link className="nova-btn nova-btn-ghost" to="/games/poker">
            Back to lobby
          </Link>
        </div>
      ) : null}
    </div>
  );
}
