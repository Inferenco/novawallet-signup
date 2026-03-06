import { WalletButton } from "@/components/wallet/WalletButton";
import { GamesTopBar } from "../components/GamesTopBar";

export function SkillGamesPage() {
  return (
    <section className="games-screen">
      <GamesTopBar
        title="Games of Skill"
        backTo="/games"
        rightSlot={<WalletButton />}
      />
      <div className="games-screen-content" style={{ flex: 1, justifyContent: "center" }}>
        <div className="games-card games-profile-setup">
          <div className="games-profile-setup-icon">⌘</div>
          <div className="games-section">
            <h2 className="games-section-title">Under Development</h2>
            <p className="games-section-copy">
              We&apos;re building exciting skill-based games where strategy and mastery determine
              the outcome.
            </p>
          </div>
          <div className="games-section" style={{ textAlign: "left" }}>
            <p className="games-section-copy">Chess and strategy games</p>
            <p className="games-section-copy">Puzzle challenges</p>
            <p className="games-section-copy">Competitive tournaments</p>
          </div>
          <p className="games-status-text">Stay tuned for updates.</p>
        </div>
      </div>
    </section>
  );
}
