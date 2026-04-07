import type { UserProfile } from "../../services/profiles";

export type PokerLayoutMode = "mobile" | "desktop";

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

export interface PokerGameplayViewModel {
  table: {
    name: string;
    blindsLabel: string;
    phase: number;
    phaseLabel: string;
    handNumber: number;
    handNumberLabel: string;
    statusMessage: string;
    timerText: string;
    timerUrgent: boolean;
    potSize: number;
    communityCards: number[];
    dealerSeat: number | null;
    heroSeatIndex: number | null;
    canTimeout: boolean;
    timeoutPending: boolean;
  };
  hero: {
    seated: boolean;
    nickname: string | null;
    avatarUrl: string | null;
    avatarBlocked: boolean;
    stack: number;
    cards: number[];
    cardsDecrypted: boolean;
    isMyTurn: boolean;
    callAmount: number;
    canCheck: boolean;
    canStraddle: boolean;
    inBettingRound: boolean;
    actionLocked: boolean;
    pendingActionCopy: string;
    raiseToAmount: string;
    raiseRatio: number;
    minRaiseTo: number;
    maxRaiseTo: number;
  };
  tableSeats: PokerDisplaySeat[];
  controls: {
    canStartHand: boolean;
    canJoinTable: boolean;
    canLeaveWaitingState: boolean;
    joinButtonLabel: string;
  };
  overlays: {
    showCommitReveal: boolean;
    showJoin: boolean;
    showOwnerPanel: boolean;
    showAbortPanel: boolean;
    showChat: boolean;
    showShowdown: boolean;
  };
  chat: {
    unreadCount: number;
    enabled: boolean;
  };
  session: {
    isAdmin: boolean;
  };
}

export interface PokerGameplayActionHandlers {
  onToggleChat: () => void;
  onToggleOwnerPanel: () => void;
  onJoinSeat: (seatIndex: number) => void;
  onRaiseInputChange: (value: string) => void;
  onPreset: (ratio: number) => void;
  onSliderChange: (ratio: number) => void;
  onFold: () => void;
  onCheck: () => void;
  onCall: () => void;
  onRaise: () => void;
  onAllIn: () => void;
  onStraddle: () => void;
  onSitOut: () => void;
  onSitIn: () => void;
  onStartHand: () => void;
  onLeaveTable: () => void;
  onTimeout: () => void;
  onAbort: () => void;
}

export interface PokerGameplayLayoutProps extends PokerGameplayActionHandlers {
  viewModel: PokerGameplayViewModel;
  failedAvatarUrls: Set<string>;
  onAvatarError: (avatarUrl: string) => void;
}
