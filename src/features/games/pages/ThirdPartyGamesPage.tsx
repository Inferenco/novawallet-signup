import { WalletButton } from "@/components/wallet/WalletButton";
import { GamesTopBar } from "../components/GamesTopBar";

export function ThirdPartyGamesPage() {
  return (
    <section className="games-screen">
      <GamesTopBar
        title="3rd Party Games"
        backTo="/games"
        rightSlot={<WalletButton />}
      />
      <div className="games-screen-content" style={{ flex: 1, justifyContent: "center" }}>
        <div className="games-card games-profile-setup">
          <div className="games-profile-setup-icon">◈</div>
          <div className="games-section">
            <h2 className="games-section-title">Coming Soon</h2>
            <p className="games-section-copy">
              We&apos;re partnering with game developers to bring an exciting collection of
              third-party games integrated with your Nova wallet.
            </p>
          </div>
          <p className="games-status-text">Partner integrations are in progress.</p>
        </div>
      </div>
    </section>
  );
}
