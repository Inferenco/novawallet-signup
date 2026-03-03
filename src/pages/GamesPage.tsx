import { GlassCard } from "@/components/ui";

export function GamesPage() {
  return (
    <GlassCard as="section" className="grid gap-nova-lg p-nova-xxl">
      <span className="nova-badge nova-badge-info w-fit">Coming Soon</span>
      <h1 className="text-display text-text-primary">Nova Games</h1>
      <p className="max-w-3xl text-body leading-relaxed text-text-secondary">
        The Nova gaming suite is being prepared for browser rollout. This
        section will host on-chain poker and additional game experiences in
        upcoming releases.
      </p>
      <GlassCard className="grid gap-nova-md text-body text-text-muted md:grid-cols-3">
        <div className="flex items-center gap-nova-sm">
          <span className="h-2 w-2 rounded-full bg-nova-cyan" />
          Wallet-native game sessions
        </div>
        <div className="flex items-center gap-nova-sm">
          <span className="h-2 w-2 rounded-full bg-nova-violet" />
          On-chain fair-play mechanics
        </div>
        <div className="flex items-center gap-nova-sm">
          <span className="h-2 w-2 rounded-full bg-nova-blue" />
          Expanded single and multiplayer formats
        </div>
      </GlassCard>
    </GlassCard>
  );
}
