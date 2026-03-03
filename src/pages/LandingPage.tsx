import { Link } from "react-router-dom";

export function LandingPage() {
  return (
    <section className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
      <div className="space-y-5">
        <p className="inline-flex rounded-full border border-accent-0/30 bg-accent-1/15 px-3 py-1 text-xs uppercase tracking-[0.16em] text-accent-0">
          Cedra Ecosystem dApp
        </p>
        <h1 className="font-display text-4xl leading-tight text-ink-0 md:text-5xl">
          Submit and manage Nova community events directly on chain.
        </h1>
        <p className="max-w-2xl text-base leading-7 text-ink-1">
          Connect your wallet, submit event requests with escrow, track pending approvals,
          and manage your live listings from one browser-native experience.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/events"
            className="rounded-full border border-accent-0/40 bg-accent-1/25 px-5 py-2 text-sm font-semibold text-ink-0"
          >
            Explore Events
          </Link>
          <Link
            to="/my-events"
            className="rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-ink-1"
          >
            Manage My Events
          </Link>
          <Link
            to="/games"
            className="rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-ink-1"
          >
            Games Preview
          </Link>
        </div>
      </div>

      <aside className="grid gap-3 rounded-3xl border border-white/10 bg-white/5 p-5">
        <img
          src="/colour-logo.png"
          alt="Nova ecosystem logo"
          className="h-20 w-20 rounded-full object-cover"
        />
        <h2 className="font-display text-2xl text-ink-0">What you can do now</h2>
        <ul className="grid gap-2 text-sm text-ink-1">
          <li>Connect with supported Cedra wallet-standard wallets.</li>
          <li>Submit event requests using contract-configured escrow fees.</li>
          <li>Review your pending submissions and live event list.</li>
          <li>Cancel pending/live events or submit edit requests.</li>
        </ul>
        <p className="rounded-xl border border-white/10 bg-bg-1 px-3 py-2 text-xs text-ink-2">
          Gaming suite integration is coming soon. The /games route is ready for rollout.
        </p>
      </aside>
    </section>
  );
}
