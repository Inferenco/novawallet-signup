import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { WalletButton } from "@/components/wallet/WalletButton";
import { hasConfiguredGameContracts } from "@/config/env";
import { formatCedraFromOctas } from "@/lib/format";
import { useToast } from "@/providers/ToastProvider";
import { useWallet } from "@/providers/WalletProvider";
import { GamesTopBar } from "../components/GamesTopBar";
import { CasinoDisclaimerModal } from "../components/casino/CasinoDisclaimerModal";
import { FreeChipsCard } from "../components/casino/FreeChipsCard";
import { MultiplierStoreModal } from "../components/casino/MultiplierStoreModal";
import { useCedraBalance } from "../hooks/useCedraBalance";
import { useGamesNetwork } from "../hooks/useGamesNetwork";
import { useGameSigner } from "../hooks/useGameSigner";
import { useChipActions } from "../hooks/poker/useChipActions";
import { useFreeChips } from "../hooks/poker/useFreeChips";
import {
  acknowledgeCurrentTerms,
  getCurrentTerms,
  hasAcknowledgedCurrent
} from "../services/consent";
import { CHIP_IMAGE_URL } from "../config/games";
import { formatChips } from "../services/poker/chips";
import "../styles/casino.css";

function isTermsError(message: string | null | undefined): boolean {
  const safe = String(message ?? "").toLowerCase();
  return safe.includes("terms") || safe.includes("acknowledge") || safe.includes("casino");
}

function formatCedraCompact(balance: number): string {
  const raw = formatCedraFromOctas(BigInt(Math.max(balance, 0))).replace(/\s+CEDRA$/, "");
  const [whole, decimal = ""] = raw.split(".");
  const trimmed = decimal.slice(0, 3).replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed}` : whole;
}

export function CasinoPage() {
  const wallet = useWallet();
  const signer = useGameSigner();
  const network = useGamesNetwork();
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const address = wallet.account?.address?.toString() ?? "";
  const { balance: cedraBalance, refreshBalance: refreshCedraBalance } = useCedraBalance(address);

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
  const { refreshBalance: refreshChipBalance, refreshMultiplierData } = chipActions;
  const { refreshClaimStatus } = freeChips;

  const [showBoostStore, setShowBoostStore] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [consentLoading, setConsentLoading] = useState(false);
  const [consentSubmitting, setConsentSubmitting] = useState(false);
  const [termsMarkdown, setTermsMarkdown] = useState("");
  const [termsFormat, setTermsFormat] = useState("text/markdown");
  const [consentError, setConsentError] = useState<string | null>(null);
  const [retryAction, setRetryAction] = useState<null | (() => Promise<void>)>(null);

  const loadConsentState = useCallback(async () => {
    if (!wallet.connected || !address) {
      setShowDisclaimer(false);
      return;
    }

    setConsentLoading(true);
    setConsentError(null);

    try {
      const [terms, acknowledged] = await Promise.all([
        getCurrentTerms(network),
        hasAcknowledgedCurrent(network, address)
      ]);

      if (terms) {
        setTermsMarkdown(terms.content);
        setTermsFormat(terms.format || "text/markdown");
      } else {
        setTermsMarkdown("");
        setTermsFormat("text/markdown");
        setConsentError("Unable to load the latest casino notice.");
      }

      setShowDisclaimer(!acknowledged);
    } catch {
      setTermsMarkdown("");
      setTermsFormat("text/markdown");
      setConsentError("Unable to load the latest casino notice.");
      setShowDisclaimer(true);
    } finally {
      setConsentLoading(false);
    }
  }, [address, network, wallet.connected]);

  useEffect(() => {
    if (!wallet.connected || !address) return;

    void refreshChipBalance();
    void refreshMultiplierData();
    void refreshClaimStatus();
    void refreshCedraBalance();
    void loadConsentState();
  }, [
    address,
    loadConsentState,
    refreshChipBalance,
    refreshClaimStatus,
    refreshMultiplierData,
    refreshCedraBalance,
    wallet.connected
  ]);

  useEffect(() => {
    if (freeChips.canClaim || !wallet.connected || !address) return undefined;

    const timer = window.setInterval(() => {
      void refreshClaimStatus();
      void refreshMultiplierData();
    }, 10_000);

    return () => window.clearInterval(timer);
  }, [address, freeChips.canClaim, refreshClaimStatus, refreshMultiplierData, wallet.connected]);

  const requireSigner = useCallback(() => {
    if (!wallet.connected || !signer) {
      pushToast("error", "Connect your wallet before using casino actions.");
      return null;
    }
    if (wallet.networkMismatch) {
      pushToast("error", "Switch wallet network to Cedra Testnet.");
      return null;
    }
    if (!hasConfiguredGameContracts()) {
      pushToast("error", "Game contracts are not configured.");
      return null;
    }

    return signer;
  }, [pushToast, signer, wallet.connected, wallet.networkMismatch]);

  const openDisclaimerForRetry = useCallback(
    async (nextAction?: () => Promise<void>) => {
      setRetryAction(() => nextAction ?? null);
      await loadConsentState();
      setShowDisclaimer(true);
    },
    [loadConsentState]
  );

  const handleClaim = useCallback(async () => {
    const activeSigner = requireSigner();
    if (!activeSigner) return;

    const success = await freeChips.doClaimFreeChips(activeSigner);
    if (success) {
      await Promise.all([
        refreshChipBalance(),
        refreshClaimStatus(),
        refreshCedraBalance()
      ]);
      pushToast("success", "Free chips claimed.");
      return;
    }

    if (isTermsError(freeChips.error)) {
      await openDisclaimerForRetry(handleClaim);
    }
  }, [
    freeChips,
    openDisclaimerForRetry,
    pushToast,
    refreshChipBalance,
    refreshClaimStatus,
    refreshCedraBalance,
    requireSigner
  ]);

  const handlePurchase = useCallback(
    async (factor: number): Promise<boolean> => {
      const activeSigner = requireSigner();
      if (!activeSigner) return false;

      const success = await chipActions.doPurchaseMultiplier(activeSigner, factor);
      if (success) {
        await Promise.all([
          refreshChipBalance(),
          refreshMultiplierData(),
          refreshClaimStatus(),
          refreshCedraBalance()
        ]);
        pushToast("success", `${factor}x multiplier activated.`);
        return true;
      }

      if (isTermsError(chipActions.error)) {
        await openDisclaimerForRetry(async () => {
          await handlePurchase(factor);
        });
      }

      return false;
    },
    [
      chipActions,
      openDisclaimerForRetry,
      pushToast,
      refreshChipBalance,
      refreshClaimStatus,
      refreshMultiplierData,
      refreshCedraBalance,
      requireSigner
    ]
  );

  const handleAcknowledgeDisclaimer = useCallback(async () => {
    const activeSigner = requireSigner();
    if (!activeSigner) return;

    setConsentSubmitting(true);
    setConsentError(null);
    try {
      const result = await acknowledgeCurrentTerms(network, activeSigner);
      if (!result.success) {
        setConsentError("Acknowledgment transaction failed.");
        return;
      }

      setShowDisclaimer(false);
      pushToast("success", "Casino notice acknowledged.");
      if (retryAction) {
        const nextAction = retryAction;
        setRetryAction(null);
        await nextAction();
      }
    } catch (error) {
      setConsentError(error instanceof Error ? error.message : "Failed to acknowledge notice.");
    } finally {
      setConsentSubmitting(false);
    }
  }, [network, pushToast, requireSigner, retryAction]);

  const boostSummary = useMemo(() => {
    if (!chipActions.multiplierStatus.isActive) {
      return "No active boost";
    }

    return `${chipActions.multiplierStatus.factor}x active`;
  }, [chipActions.multiplierStatus.factor, chipActions.multiplierStatus.isActive]);
  const cedraDisplay = useMemo(() => formatCedraCompact(cedraBalance), [cedraBalance]);

  if (!wallet.connected) {
    return (
      <section className="games-screen">
        <GamesTopBar title="Nova Casino" backTo="/games" rightSlot={<WalletButton />} />
        <div className="games-screen-content">
          <div className="games-empty-state">
            Connect your wallet to claim chips, activate boosts, and enter poker tables.
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="games-screen">
      <GamesTopBar title="Nova Casino" backTo="/games" rightSlot={<WalletButton />} />

      <div className="games-screen-scroll">
        <div className="games-screen-content">
          <div className="games-casino-dashboard">
            {!hasConfiguredGameContracts() ? (
              <div className="games-empty-state games-casino-config-warning">
                Configure `VITE_GAME_CONTRACT_ADDRESS` and the games wallet contract env vars to use
                live casino actions.
              </div>
            ) : null}

            <div className="games-casino-column games-casino-column-primary">
              <div className="games-card games-card-hero games-casino-hero-card">
                <div className="games-section games-casino-hero-copy">
                  <p className="games-section-kicker">Daily Rewards</p>
                  <h1 className="games-section-title games-casino-hero-title">Chips & Boosts</h1>
                  <p className="games-section-copy">
                    Claim periodic free chips, activate multipliers, and step into live poker tables
                    from one polished casino floor.
                  </p>
                </div>
                <div className="games-casino-hero-pills" aria-label="Casino highlights">
                  <span>Daily claim cycle</span>
                  <span>{boostSummary}</span>
                  <span>{formatChips(chipActions.chipBalance)} chips ready</span>
                </div>
              </div>

              <div className="games-casino-primary-column">
                <FreeChipsCard
                  dailyAmount={freeChips.dailyAmount}
                  boostedDailyAmount={freeChips.boostedDailyAmount}
                  multiplierFactor={freeChips.multiplierFactor}
                  multiplierTimeLeft={freeChips.multiplierTimeLeft}
                  canClaim={freeChips.canClaim}
                  timeUntilNext={freeChips.timeUntilNext}
                  isClaiming={freeChips.isClaiming}
                  error={freeChips.error}
                  onClaim={() => {
                    void handleClaim();
                  }}
                />

                <div className="games-card games-card-body games-section games-casino-store-card">
                  <div className="games-casino-section-head">
                    <div>
                      <p className="games-section-kicker">Boost Store</p>
                      <h2 className="games-section-title">Multiplier Upgrades</h2>
                    </div>
                    <button
                      type="button"
                      className="games-button games-button-accent"
                      onClick={() => setShowBoostStore(true)}
                    >
                      Open Store
                    </button>
                  </div>

                  <p className="games-section-copy games-casino-store-copy">
                    Tune your claim rate with short-term multipliers, then carry those boosted chips
                    straight into poker.
                  </p>

                  <div className="games-casino-store-footer">
                    <span className="games-casino-store-status">{boostSummary}</span>
                    <p className="games-casino-disclaimer">
                      Current boosted claim:{" "}
                      <span className="games-casino-chip-inline">
                        <span className="games-casino-chip-badge" aria-hidden="true">
                          <img src={CHIP_IMAGE_URL} alt="" />
                        </span>
                        {formatChips(freeChips.boostedDailyAmount)} chips
                      </span>
                      .
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="games-casino-column games-casino-column-secondary">
              <div className="games-card games-card-body games-section games-casino-summary-card">
                <div className="games-casino-summary-head">
                  <div>
                    <p className="games-section-kicker">Account Overview</p>
                    <h2 className="games-section-title">Wallet Balances</h2>
                  </div>
                </div>

                <div className="games-casino-inline-stats">
                  <div className="games-casino-stat-card">
                    <p className="games-casino-stat-label">CEDRA Wallet</p>
                    <p className="games-casino-stat-value games-casino-stat-value-balance">
                      <span>{cedraDisplay}</span>
                      <span className="games-casino-stat-unit">CEDRA</span>
                    </p>
                  </div>
                  <div className="games-casino-stat-card">
                    <p className="games-casino-stat-label">Chip Wallet</p>
                    <p className="games-casino-stat-value games-casino-stat-value-chip">
                      <span className="games-casino-chip-badge" aria-hidden="true">
                        <img src={CHIP_IMAGE_URL} alt="" />
                      </span>
                      <span>{formatChips(chipActions.chipBalance)}</span>
                    </p>
                  </div>
                </div>

                <p className="games-casino-disclaimer">
                  Your Cedra balance funds multiplier purchases, and your chip wallet is ready for
                  poker tables.
                </p>
              </div>

            <div className="games-card games-card-body games-section games-casino-games-card">
              <div className="games-casino-section-head">
                <div>
                  <p className="games-section-kicker">Available Games</p>
                  <h2 className="games-section-title">Live Tables</h2>
                </div>
              </div>

                <div className="games-casino-live-tile">
                  <div className="games-casino-live-head">
                    <img
                      className="games-casino-game-icon"
                      src="/assets/casino/game-icon.png"
                      alt="Poker"
                    />
                    <div className="games-casino-game-meta">
                      <p className="games-casino-game-title">Texas Hold&apos;em</p>
                      <p className="games-casino-game-copy">
                        Join direct tables, browse active rooms, or host your own from a cleaner
                        poker floor with a desktop-ready lobby.
                      </p>
                    </div>
                  </div>

                  <div className="games-casino-live-points">
                    <span>Live lobby access</span>
                    <span>Owner-hosted tables</span>
                    <span>Chip-funded play</span>
                  </div>

                  <div className="games-casino-live-actions">
                    <Link className="games-button-link games-button-link-primary" to="/games/poker">
                      Enter Poker
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <MultiplierStoreModal
        visible={showBoostStore}
        onClose={() => setShowBoostStore(false)}
        cedraBalance={BigInt(Math.max(cedraBalance, 0))}
        chipBalance={chipActions.chipBalance}
        isPending={chipActions.pendingAction === "purchaseMultiplier"}
        isSimulating={chipActions.isSimulatingPurchase}
        error={chipActions.error}
        onSimulatePurchase={chipActions.simulatePurchaseMultiplier}
        onPurchase={handlePurchase}
        multiplierOptions={chipActions.multiplierOptions}
        multiplierDuration={chipActions.multiplierDuration}
        multiplierStatus={chipActions.multiplierStatus}
      />

      <CasinoDisclaimerModal
        visible={showDisclaimer}
        onAcknowledge={handleAcknowledgeDisclaimer}
        onClose={() => {
          setShowDisclaimer(false);
          setRetryAction(null);
          navigate("/games");
        }}
        allowClose
        allowAcknowledge
        termsMarkdown={termsMarkdown}
        termsFormat={termsFormat}
        isLoadingTerms={consentLoading}
        termsError={consentError}
        onRetryLoadTerms={() => {
          void loadConsentState();
        }}
        isSubmittingAcknowledge={consentSubmitting}
      />
    </section>
  );
}
