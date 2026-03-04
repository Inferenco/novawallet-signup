import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { GlassCard, NovaButton } from "@/components/ui";
import { useToast } from "@/providers/ToastProvider";
import { formatCedraFromOctas } from "@/lib/format";
import { useWallet } from "@/providers/WalletProvider";
import { hasConfiguredGameContracts } from "@/config/env";
import { useGamesNetwork } from "../hooks/useGamesNetwork";
import { useGameSigner } from "../hooks/useGameSigner";
import { useChipActions } from "../hooks/poker/useChipActions";
import { useFreeChips } from "../hooks/poker/useFreeChips";
import {
  acknowledgeCurrentTerms,
  getCurrentTerms,
  hasAcknowledgedCurrent,
  type CasinoTerms
} from "../services/consent";
import { formatChips } from "../services/poker/chips";
import { ContractsWarning } from "../components/ContractsWarning";
import "../styles/games.css";

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "ready";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

function isTermsError(message: string | null | undefined): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("terms") ||
    lower.includes("acknowledged") ||
    lower.includes("casino notice")
  );
}

export function CasinoPage() {
  const wallet = useWallet();
  const signer = useGameSigner();
  const network = useGamesNetwork();
  const { pushToast } = useToast();
  const address = wallet.account?.address?.toString() ?? "";

  const chipActions = useChipActions({
    network,
    playerAddress: address,
    onError: (_, error) => {
      pushToast("error", error);
    }
  });

  const freeChips = useFreeChips({
    network,
    playerAddress: address
  });

  const [consentModalOpen, setConsentModalOpen] = useState(false);
  const [consentLoading, setConsentLoading] = useState(false);
  const [consentSubmitting, setConsentSubmitting] = useState(false);
  const [consentTerms, setConsentTerms] = useState<CasinoTerms | null>(null);
  const [consentError, setConsentError] = useState<string | null>(null);
  const [retryAction, setRetryAction] = useState<null | (() => Promise<void>)>(null);

  const { refreshBalance, refreshMultiplierData } = chipActions;
  const { refreshClaimStatus, canClaim } = freeChips;

  useEffect(() => {
    if (!wallet.connected || !address) return;
    void refreshBalance();
    void refreshMultiplierData();
    void refreshClaimStatus();
  }, [
    address,
    refreshBalance,
    refreshClaimStatus,
    refreshMultiplierData,
    wallet.connected
  ]);

  useEffect(() => {
    if (canClaim) return;
    const id = window.setInterval(() => {
      void refreshClaimStatus();
    }, 10000);
    return () => window.clearInterval(id);
  }, [canClaim, refreshClaimStatus]);

  const openConsent = useCallback(async (afterConsent?: () => Promise<void>) => {
    if (!address) return;

    setConsentLoading(true);
    setConsentError(null);
    setRetryAction(() => afterConsent ?? null);
    try {
      const [terms, acknowledged] = await Promise.all([
        getCurrentTerms(network),
        hasAcknowledgedCurrent(network, address)
      ]);

      if (acknowledged) {
        if (afterConsent) {
          await afterConsent();
        }
        return;
      }

      if (!terms) {
        setConsentError("Unable to load current casino notice.");
      }
      setConsentTerms(terms);
      setConsentModalOpen(true);
    } catch {
      setConsentError("Unable to load current casino notice.");
      setConsentModalOpen(true);
    } finally {
      setConsentLoading(false);
    }
  }, [address, network]);

  const requireSigner = useCallback(() => {
    if (!wallet.connected || !signer) {
      pushToast("error", "Connect your wallet before using casino actions.");
      return null;
    }
    if (wallet.networkMismatch) {
      pushToast("error", "Switch wallet network to Cedra Testnet.");
      return null;
    }
    return signer;
  }, [pushToast, signer, wallet.connected, wallet.networkMismatch]);

  const handleClaim = useCallback(async () => {
    const activeSigner = requireSigner();
    if (!activeSigner) return;

    const success = await freeChips.doClaimFreeChips(activeSigner);
    if (success) {
      await chipActions.refreshBalance();
      pushToast("success", "Free chips claimed.");
      return;
    }

    if (isTermsError(freeChips.error)) {
      await openConsent(async () => {
        await handleClaim();
      });
    }
  }, [chipActions, freeChips, openConsent, pushToast, requireSigner]);

  const handlePurchaseBoost = useCallback(async (factor: number) => {
    const activeSigner = requireSigner();
    if (!activeSigner) return;

    const success = await chipActions.doPurchaseMultiplier(activeSigner, factor);
    if (success) {
      await freeChips.refreshClaimStatus();
      pushToast("success", `${factor}x boost activated.`);
      return;
    }

    if (isTermsError(chipActions.error)) {
      await openConsent(async () => {
        await handlePurchaseBoost(factor);
      });
    }
  }, [chipActions, freeChips, openConsent, pushToast, requireSigner]);

  const handleAcceptConsent = useCallback(async () => {
    const activeSigner = requireSigner();
    if (!activeSigner) return;

    setConsentSubmitting(true);
    setConsentError(null);
    try {
      await acknowledgeCurrentTerms(network, activeSigner);
      setConsentModalOpen(false);
      pushToast("success", "Casino notice acknowledged.");
      if (retryAction) {
        await retryAction();
      }
    } catch (error) {
      setConsentError(error instanceof Error ? error.message : "Failed to submit acknowledgment.");
    } finally {
      setConsentSubmitting(false);
    }
  }, [network, pushToast, requireSigner, retryAction]);

  const boostTimeLeft = useMemo(() => {
    if (!chipActions.multiplierStatus.isActive) return 0;
    const now = Math.floor(Date.now() / 1000);
    return Math.max(0, chipActions.multiplierStatus.expiresAt - now);
  }, [chipActions.multiplierStatus.expiresAt, chipActions.multiplierStatus.isActive]);

  return (
    <section className="games-page">
      <ContractsWarning />

      <header className="games-hero">
        <p className="m-0 text-caption uppercase tracking-wide text-nova-cyan">Nova Casino</p>
        <h1 className="m-0 mt-nova-sm text-h1 text-text-primary">Chips & Boosts</h1>
        <p className="m-0 mt-nova-sm max-w-2xl text-body text-text-secondary">
          Claim periodic free chips, activate multipliers, and enter live poker tables.
        </p>
      </header>

      <div className="games-grid games-grid-2">
        <GlassCard className="grid gap-nova-md">
          <h2 className="games-section-title">Chip Wallet</h2>
          <p className="m-0 text-body text-text-primary">{formatChips(chipActions.chipBalance)} chips</p>
          <p className="m-0 text-caption text-text-muted">
            Approx CEDRA value: {formatCedraFromOctas(BigInt(chipActions.chipBalance * 100_000))}
          </p>
          <div className="games-kpi">
            <div className="item">
              <p className="label">Base Claim</p>
              <p className="value">{formatChips(freeChips.dailyAmount)}</p>
            </div>
            <div className="item">
              <p className="label">Boosted Claim</p>
              <p className="value">{formatChips(freeChips.boostedDailyAmount)}</p>
            </div>
          </div>
          <NovaButton onClick={() => void handleClaim()} disabled={!freeChips.canClaim || !hasConfiguredGameContracts()}>
            {freeChips.canClaim ? "Claim Free Chips" : `Next claim in ${formatDuration(freeChips.timeUntilNext)}`}
          </NovaButton>
        </GlassCard>

        <GlassCard className="grid gap-nova-md">
          <h2 className="games-section-title">Boost Store</h2>
          <p className="m-0 text-caption text-text-muted">
            Active boost: {chipActions.multiplierStatus.isActive ? `${chipActions.multiplierStatus.factor}x` : "none"}
            {chipActions.multiplierStatus.isActive ? ` • expires in ${formatDuration(boostTimeLeft)}` : ""}
          </p>
          <div className="games-card-list">
            {chipActions.multiplierOptions.length === 0 ? (
              <p className="m-0 text-body text-text-muted">No boost options available.</p>
            ) : (
              chipActions.multiplierOptions.map((option) => (
                <div key={option.factor} className="games-list-row">
                  <div className="meta">
                    <p className="name">{option.factor}x Multiplier</p>
                    <p className="sub">Price: {formatCedraFromOctas(option.price)}</p>
                  </div>
                  <NovaButton
                    size="sm"
                    variant="accent"
                    disabled={!hasConfiguredGameContracts()}
                    onClick={() => void handlePurchaseBoost(option.factor)}
                  >
                    Buy
                  </NovaButton>
                </div>
              ))
            )}
          </div>
        </GlassCard>
      </div>

      <GlassCard className="grid gap-nova-md">
        <div className="flex flex-wrap items-center justify-between gap-nova-sm">
          <div>
            <h2 className="m-0 text-h2 text-text-primary">Poker Tables</h2>
            <p className="m-0 text-caption text-text-muted">
              Use your chip balance to join or host Texas Hold&apos;em tables.
            </p>
          </div>
          <Link className="nova-btn nova-btn-primary" to="/games/poker">
            Enter Poker Lobby
          </Link>
        </div>
      </GlassCard>

      {consentModalOpen && (
        <div className="games-modal-backdrop" role="dialog" aria-modal="true">
          <div className="games-modal">
            <h3 className="m-0 text-h2 text-text-primary">Casino Notice</h3>
            {consentLoading ? (
              <p className="m-0 text-body text-text-muted">Loading current notice...</p>
            ) : (
              <pre className="m-0 max-h-[50vh] overflow-auto whitespace-pre-wrap rounded-nova-standard border border-surface-glass-border bg-surface-glass p-nova-md text-body text-text-secondary">
                {consentTerms?.content || "No terms available."}
              </pre>
            )}

            {consentError && (
              <p className="m-0 text-caption text-status-error">{consentError}</p>
            )}

            <div className="flex flex-wrap justify-end gap-nova-sm">
              <NovaButton
                variant="ghost"
                onClick={() => {
                  setConsentModalOpen(false);
                  setRetryAction(null);
                }}
              >
                Cancel
              </NovaButton>
              <NovaButton
                variant="primary"
                loading={consentSubmitting}
                onClick={() => void handleAcceptConsent()}
              >
                Accept and Continue
              </NovaButton>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
