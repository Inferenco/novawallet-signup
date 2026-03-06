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
        title: "Nova Casino",
        description: "A free to play daily social casino",
        to: "/games/casino",
        image: "/assets/casino/nova-casino-wide.jpg"
      },
      {
        title: "Games of Skill",
        description: "Strategy & skill-based games",
        to: "/games/skill-games",
        image: "/assets/casino/games-of-skill-wide.jpg"
      },
      {
        title: "3rd Party Games",
        description: "Partner games & integrations",
        to: "/games/third-party",
        image: "/assets/casino/third-party-wide.jpg"
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
          <div className="games-screen-content">
            {!wallet.connected ? (
              <div className="games-card games-profile-setup">
                <div className="games-profile-setup-icon">◎</div>
                <div className="games-section">
                  <h2 className="games-section-title">Connect Your Wallet</h2>
                  <p className="games-section-copy">
                    Connect a Cedra wallet to load your gaming profile and open casino or poker
                    screens.
                  </p>
                </div>
                <div className="games-inline-row" style={{ justifyContent: "center" }}>
                  <WalletButton />
                </div>
              </div>
            ) : profile?.nickname ? (
              <>
                <section className="games-section">
                  <h2 className="games-section-title">Player Profile</h2>
                  <div className="games-card games-hub-profile-card">
                    <Link className="games-hub-edit-link" to="/games/profile" aria-label="Edit profile">
                      ✎
                    </Link>
                    <div className="games-hub-profile-main">
                      <div className="games-hub-avatar-shell">
                        {profile.avatarUrl && !avatarFailed ? (
                          <img
                            src={profile.avatarUrl}
                            alt={profile.nickname}
                            onError={() => setAvatarFailed(true)}
                          />
                        ) : (
                          <span className="games-hub-avatar-fallback">
                            {profile.nickname.slice(0, 1).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="games-hub-profile-meta">
                        <p className="games-hub-profile-name">{profile.nickname}</p>
                        <span className="games-hub-address-badge">◇ {shortAddress(address ?? "")}</span>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="games-section">
                  <h2 className="games-section-title">Games</h2>
                  <div className="games-hub-nav-grid">
                    {navCards.map((card) => (
                      <Link
                        key={card.to}
                        className="games-hub-nav-card"
                        to={card.to}
                        style={{ backgroundImage: `url(${card.image})` }}
                      >
                        <div>
                          <p className="games-hub-nav-title">{card.title}</p>
                          <p className="games-hub-nav-copy">{card.description}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              </>
            ) : (
              <div className="games-card games-profile-setup">
                <div className="games-profile-setup-icon">◌</div>
                <div className="games-section">
                  <h2 className="games-section-title">Set Up Your Player Profile</h2>
                  <p className="games-section-copy">
                    Create a player name to start playing games. Your profile will be visible to
                    other players.
                  </p>
                </div>
                <div className="games-profile-setup-warning">
                  <p className="games-profile-setup-warning-title">Gas Required</p>
                  <p className="games-section-copy">
                    You need CEDRA in this wallet to create a player profile. This is an on-chain
                    transaction.
                  </p>
                </div>
                <Link className="games-button-link games-button-link-primary" to="/games/profile">
                  Set Up Profile
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
