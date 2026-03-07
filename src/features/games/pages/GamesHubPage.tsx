import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { WalletButton } from "@/components/wallet/WalletButton";
import { useWallet } from "@/providers/WalletProvider";
import { shortAddress } from "@/lib/format";
import { GamesTopBar } from "../components/GamesTopBar";
import { useGamesNetwork } from "../hooks/useGamesNetwork";
import { getProfile, type UserProfile } from "../services/profiles";
import "../styles/gaming-hub.css";

export function GamesHubPage() {
  const wallet = useWallet();
  const network = useGamesNetwork();
  const address = wallet.account?.address?.toString() ?? null;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const displayName = profile?.nickname?.trim() ? profile.nickname.trim() : "Anon User";
  const displayAvatarUrl = profile?.avatarUrl?.trim() && !avatarFailed
    ? profile.avatarUrl.trim()
    : "/assets/casino/avatar-placeholder.svg";

  useEffect(() => {
    let alive = true;

    const loadProfile = async () => {
      if (!wallet.connected || !address) {
        if (alive) {
          setProfile(null);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      try {
        const nextProfile = await getProfile(network, address);
        if (alive) {
          setProfile(nextProfile);
        }
      } finally {
        if (alive) {
          setIsLoading(false);
        }
      }
    };

    void loadProfile();
    return () => {
      alive = false;
    };
  }, [address, network, wallet.connected]);

  useEffect(() => {
    setAvatarFailed(false);
  }, [profile?.avatarUrl]);

  const navCards = useMemo(
    () => [
      {
        kicker: "Casino Floor",
        title: "Nova Casino",
        description: "A free to play daily social casino",
        to: "/games/casino",
        image: "/assets/casino/nova-casino-wide.jpg",
        featured: false
      },
      {
        kicker: "Competitive Play",
        title: "Games of Skill",
        description: "Strategy & skill-based games",
        to: "/games/skill-games",
        image: "/assets/casino/games-of-skill-wide.jpg",
        featured: false
      },
      {
        kicker: "Partner Studios",
        title: "3rd Party Games",
        description: "Partner games & integrations",
        to: "/games/third-party",
        image: "/assets/casino/third-party-wide.jpg",
        featured: false
      }
    ],
    []
  );

  return (
    <section className="games-screen">
      <GamesTopBar title="Gaming" rightSlot={<WalletButton />} />

      {isLoading ? (
        <div className="games-loading-screen">
          <div className="games-spinner" />
        </div>
      ) : (
        <div className="games-screen-scroll">
          <div className="games-screen-content games-hub-layout">
            {!wallet.connected ? (
              <div className="games-card games-profile-setup">
                <div className="games-profile-setup-icon">◎</div>
                <div className="games-section">
                  <h2 className="games-section-title">Nova Gaming</h2>
                  <p className="games-section-copy">
                    Use the wallet control in the top-right corner to connect and open casino or
                    poker screens.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <section className="games-section">
                  <h2 className="games-section-title">Player Profile</h2>
                  <div className="games-card games-hub-profile-card">
                    <div className="games-hub-profile-main">
                      <div className="games-hub-avatar-shell">
                        <img
                          src={displayAvatarUrl}
                          alt={displayName}
                          onError={() => setAvatarFailed(true)}
                        />
                      </div>
                      <div className="games-hub-profile-meta">
                        <p className="games-hub-profile-name">{displayName}</p>
                        <span className="games-hub-address-badge">◇ {shortAddress(address ?? "")}</span>
                      </div>
                    </div>
                  </div>
                </section>
              </>
            )}

            <section className="games-section">
              <div className="games-inline-row games-hub-section-header">
                <div>
                  <p className="games-section-kicker">Game Rooms</p>
                  <h2 className="games-section-title">Games</h2>
                </div>
                <p className="games-status-text">Choose a room and enter instantly</p>
              </div>
              <div className="games-hub-nav-grid">
                {navCards.map((card) => (
                  <Link
                    key={card.to}
                    className={`games-hub-nav-card ${card.featured ? "featured" : ""}`}
                    to={card.to}
                  >
                    <div
                      className="games-hub-nav-image"
                      style={{ backgroundImage: `url(${card.image})` }}
                      aria-hidden="true"
                    />
                    <div className="games-hub-nav-scrim" aria-hidden="true" />
                    <div className="games-hub-nav-glow" aria-hidden="true" />
                    <div className="games-hub-nav-body">
                      <div className="games-hub-nav-content">
                        <p className="games-hub-nav-kicker">{card.kicker}</p>
                        <p className="games-hub-nav-title">{card.title}</p>
                        <p className="games-hub-nav-copy">{card.description}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}
    </section>
  );
}
