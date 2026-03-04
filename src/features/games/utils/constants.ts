import { CHAIN_CONFIG } from "@/config/chain";

export type NetworkType = "testnet" | "devnet";

export function resolveNetworkType(): NetworkType {
  return CHAIN_CONFIG.networkName === "devnet" ? "devnet" : "testnet";
}

export const POKER_COLORS = {
  accent: "#00D4FF",
  accentDark: "#00A8CC",
  accentGlow: "rgba(0, 212, 255, 0.3)",
  accentBorder: "rgba(0, 212, 255, 0.2)",
  accentBg: "rgba(0, 212, 255, 0.1)",
  fold: "#6B7280",
  foldText: "#9CA3AF",
  check: "#00D4FF",
  call: "#00D4FF",
  raise: "#F59E0B",
  allIn: "#EF4444",
  straddle: "#8B5CF6",
  yourTurn: "#00D4FF",
  paused: "#F59E0B",
  waiting: "#6B7280",
  active: "#10B981",
  tableFeltStart: "#0a1628",
  tableFeltEnd: "#0d2847",
  tableRimGlow: "rgba(0, 212, 255, 0.4)",
  tableRimColor: "#1a5f7a",
  cardBg: "rgba(15, 25, 45, 0.8)",
  cardBorder: "rgba(0, 212, 255, 0.15)",
  dealerBadge: "#FFD700",
  chipRed: "#DC2626",
  chipGreen: "#10B981",
  chipBlue: "#3B82F6"
} as const;

export const COLORS = {
  primary: "#2D6CFF",
  primaryDark: "#1E54CC",
  primaryLight: "#5A8FFF",
  accent: "#18E0FF",
  accentDark: "#00B8D9",
  accentLight: "#6EE7FF",
  violet: "#8B5CF6",
  violetDark: "#6D28D9",
  violetLight: "#A78BFA",
  bgPrimary: "#0a0a0f",
  bgSecondary: "#12121a",
  bgTertiary: "#1a1a2e",
  bgCard: "rgba(26, 26, 46, 0.8)",
  bgCardBorder: "rgba(45, 108, 255, 0.2)",
  bgCardBorderIntense: "rgba(45, 108, 255, 0.4)",
  textPrimary: "#FFFFFF",
  textSecondary: "rgba(255, 255, 255, 0.7)",
  textMuted: "rgba(255, 255, 255, 0.5)",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  glass: "rgba(255, 255, 255, 0.05)",
  glassBorder: "rgba(255, 255, 255, 0.1)"
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 40
} as const;
