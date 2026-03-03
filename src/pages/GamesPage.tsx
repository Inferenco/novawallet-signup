export function GamesPage() {
  return (
    <section className="grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-8">
      <p className="inline-flex w-fit rounded-full border border-accent-0/30 bg-accent-1/15 px-3 py-1 text-xs uppercase tracking-[0.16em] text-accent-0">
        Coming Soon
      </p>
      <h1 className="font-display text-4xl text-ink-0">Nova Games</h1>
      <p className="max-w-3xl text-base leading-7 text-ink-1">
        The Nova gaming suite is being prepared for browser rollout. This section will
        host on-chain poker and additional game experiences in upcoming releases.
      </p>
      <div className="grid gap-3 rounded-2xl border border-white/10 bg-bg-1 p-4 text-sm text-ink-2 md:grid-cols-3">
        <p>Wallet-native game sessions</p>
        <p>On-chain fair-play mechanics</p>
        <p>Expanded single and multiplayer formats</p>
      </div>
    </section>
  );
}
