import { appEnv, hasConfiguredGameContracts } from "@/config/env";
import { GlassCard } from "@/components/ui";

export function ContractsWarning() {
  if (hasConfiguredGameContracts()) return null;

  const missing: string[] = [];
  if (appEnv.gameContractAddress === "0x0") {
    missing.push("`VITE_GAME_CONTRACT_ADDRESS`");
  }
  if (appEnv.walletContractAddress === "0x0") {
    missing.push("`VITE_WALLET_CONTRACT_ADDRESS`");
  }

  return (
    <GlassCard className="border-status-warning-border bg-status-warning-bg text-status-warning">
      Configure {missing.join(" and ")} to enable live game transactions.
    </GlassCard>
  );
}
