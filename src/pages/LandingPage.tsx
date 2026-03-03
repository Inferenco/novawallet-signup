import { Link } from "react-router-dom";
import { GlassCard, NovaButton } from "@/components/ui";

export function LandingPage() {
  return (
    <section className="grid gap-nova-xxl lg:grid-cols-[1.2fr_1fr]">
      <div className="space-y-nova-xl">
        <span className="nova-badge nova-badge-info">Cedra Ecosystem dApp</span>
        <h1 className="text-display text-text-primary">
          Submit and manage Nova community events directly on chain.
        </h1>
        <p className="max-w-2xl text-body leading-relaxed text-text-secondary">
          Connect your wallet, submit event requests with escrow, track pending
          approvals, and manage your live listings from one browser-native
          experience.
        </p>
        <div className="flex flex-wrap gap-nova-md">
          <Link to="/events">
            <NovaButton variant="accent">Explore Events</NovaButton>
          </Link>
          <Link to="/my-events">
            <NovaButton variant="ghost">Manage My Events</NovaButton>
          </Link>
          <Link to="/games">
            <NovaButton variant="ghost">Games Preview</NovaButton>
          </Link>
        </div>
      </div>

      <GlassCard as="aside" className="grid gap-nova-md">
        <img
          src="/colour-logo.png"
          alt="Nova ecosystem logo"
          className="h-20 w-20 rounded-full object-cover"
        />
        <h2 className="text-h2 text-text-primary">What you can do now</h2>
        <ul className="grid gap-nova-sm text-body text-text-secondary">
          <li className="flex items-start gap-nova-sm">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-nova-cyan" />
            Connect with supported Cedra wallet-standard wallets.
          </li>
          <li className="flex items-start gap-nova-sm">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-nova-cyan" />
            Submit event requests using contract-configured escrow fees.
          </li>
          <li className="flex items-start gap-nova-sm">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-nova-cyan" />
            Review your pending submissions and live event list.
          </li>
          <li className="flex items-start gap-nova-sm">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-nova-cyan" />
            Cancel pending/live events or submit edit requests.
          </li>
        </ul>
        <GlassCard className="text-caption text-text-muted">
          Gaming suite integration is coming soon. The /games route is ready for
          rollout.
        </GlassCard>
      </GlassCard>
    </section>
  );
}
