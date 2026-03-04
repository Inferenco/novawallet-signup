import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { GlassCard } from "@/components/ui";
import { useWallet } from "@/providers/WalletProvider";
import { useGamesNetwork } from "../hooks/useGamesNetwork";
import { getProfile, type UserProfile } from "../services/profiles";
import { ContractsWarning } from "../components/ContractsWarning";
import "../styles/games.css";

function truncateAddress(address: string | null): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function GamesHubPage() {
  const wallet = useWallet();
  const network = useGamesNetwork();
  const address = wallet.account?.address?.toString() ?? null;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (!wallet.connected || !address) {
        setProfile(null);
        return;
      }

      setLoadingProfile(true);
      try {
        const result = await getProfile(network, address);
        if (isMounted) {
          setProfile(result);
        }
      } finally {
        if (isMounted) {
          setLoadingProfile(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [address, network, wallet.connected]);

  useEffect(() => {
    setAvatarFailed(false);
  }, [profile?.avatarUrl]);

  const headerCopy = useMemo(() => {
    if (!wallet.connected) {
      return "Connect your wallet to enter Nova Casino, where poker is available.";
    }
    if (loadingProfile) {
      return "Loading your on-chain player profile...";
    }
    if (profile?.nickname) {
      return `Welcome back, ${profile.nickname}.`; 
    }
    return "No player profile found for this wallet. You can still play immediately.";
  }, [loadingProfile, profile?.nickname, wallet.connected]);

  return (
    <section className="games-page">
      <ContractsWarning />

      <header className="games-hero">
        <span className="nova-badge nova-badge-info w-fit">Nova Games</span>
        <h1 className="mt-nova-md text-display text-text-primary">Nova Games</h1>
        <p className="max-w-3xl text-body text-text-secondary">{headerCopy}</p>
      </header>

      <GlassCard className="grid gap-nova-md">
        <h2 className="games-section-title">Player Profile</h2>
        {!wallet.connected ? (
          <p className="text-body text-text-muted">
            Connect your wallet from the top-right menu to load profile and play.
          </p>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-nova-md">
            <div className="grid gap-1">
              <p className="m-0 text-body text-text-primary">
                {profile?.nickname || "Unnamed Player"}
              </p>
              <p className="m-0 text-caption text-text-muted">
                {truncateAddress(address)}
              </p>
            </div>
            {profile?.avatarUrl && !avatarFailed ? (
              <img
                src={profile.avatarUrl}
                alt={profile.nickname || "player avatar"}
                className="h-14 w-14 rounded-full border border-surface-glass-border object-cover"
                onError={() => setAvatarFailed(true)}
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-surface-glass-border bg-surface-glass text-caption text-text-muted">
                No
                <br />
                Avatar
              </div>
            )}
          </div>
        )}
      </GlassCard>

      <div className="games-grid">
        <Link className="games-nav-card" to="/games/casino">
          <h3 className="games-nav-card-title">Nova Casino</h3>
          <p className="games-nav-card-copy">
            Claim chips, activate boosts, and open poker from inside the casino.
          </p>
        </Link>
      </div>

      <div className="flex flex-wrap gap-nova-sm">
        <Link className="nova-btn nova-btn-primary" to="/games/casino">
          Open Casino
        </Link>
      </div>
    </section>
  );
}
