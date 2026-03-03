import { Link } from "react-router-dom";
import { GlassCard } from "@/components/ui";

type CategoryStatus = "live" | "coming-soon";

interface Category {
  id: string;
  title: string;
  description: string;
  to: string | null;
  status: CategoryStatus;
  accentColor: "nova-cyan" | "nova-violet" | "nova-blue" | "gradient";
}

const categories: Category[] = [
  {
    id: "events",
    title: "Events",
    description: "Submit and manage community events on-chain",
    to: "/events",
    status: "live",
    accentColor: "nova-cyan",
  },
  {
    id: "games",
    title: "Games",
    description: "On-chain gaming experiences",
    to: "/games",
    status: "coming-soon",
    accentColor: "nova-violet",
  },
  {
    id: "nfts",
    title: "NFTs",
    description: "Explore and trade digital collectibles",
    to: null,
    status: "coming-soon",
    accentColor: "nova-blue",
  },
  {
    id: "defi",
    title: "DeFi",
    description: "Staking, swaps, and yield opportunities",
    to: null,
    status: "coming-soon",
    accentColor: "gradient",
  },
];

const accentBorderClasses: Record<Category["accentColor"], string> = {
  "nova-cyan": "border-nova-cyan/40 hover:border-nova-cyan/70 hover:shadow-[0_0_24px_rgba(34,232,255,0.15)]",
  "nova-violet": "border-nova-violet/40 hover:border-nova-violet/70 hover:shadow-[0_0_24px_rgba(139,92,246,0.15)]",
  "nova-blue": "border-nova-blue/40 hover:border-nova-blue/70 hover:shadow-[0_0_24px_rgba(61,122,255,0.15)]",
  gradient: "border-nova-blue/40 hover:border-nova-violet/70 hover:shadow-[0_0_24px_rgba(139,92,246,0.12)]",
};

const accentDotClasses: Record<Category["accentColor"], string> = {
  "nova-cyan": "bg-nova-cyan",
  "nova-violet": "bg-nova-violet",
  "nova-blue": "bg-nova-blue",
  gradient: "bg-gradient-to-r from-nova-blue to-nova-violet",
};

function CategoryCard({ category }: { category: Category }) {
  const isDisabled = !category.to;
  const borderClass = accentBorderClasses[category.accentColor];
  const dotClass = accentDotClasses[category.accentColor];

  const cardContent = (
    <GlassCard
      pressable={!isDisabled}
      className={`relative grid gap-nova-sm border-2 transition-all duration-200 ${borderClass} ${
        isDisabled ? "cursor-not-allowed opacity-60" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-nova-sm">
          <span className={`h-3 w-3 rounded-full ${dotClass}`} />
          <h3 className="text-h2 text-text-primary">{category.title}</h3>
        </div>
        {category.status === "live" ? (
          <span className="nova-badge nova-badge-success">Live</span>
        ) : (
          <span className="nova-badge nova-badge-muted">Coming Soon</span>
        )}
      </div>
      <p className="text-body text-text-secondary">{category.description}</p>
      {!isDisabled && (
        <span className="text-caption text-text-muted">
          Tap to explore &rarr;
        </span>
      )}
    </GlassCard>
  );

  if (isDisabled) {
    return cardContent;
  }

  return (
    <Link to={category.to!} className="block">
      {cardContent}
    </Link>
  );
}

export function LandingPage() {
  return (
    <section className="grid gap-nova-xxl">
      {/* Hero Section */}
      <header className="grid gap-nova-lg text-center lg:text-left">
        <span className="nova-badge nova-badge-info mx-auto lg:mx-0 w-fit">
          Cedra Ecosystem dApp
        </span>
        <h1 className="text-display text-text-primary">
          Welcome to Nova Ecosystem
        </h1>
        <p className="mx-auto max-w-2xl text-body leading-relaxed text-text-secondary lg:mx-0">
          Your gateway to decentralized applications on the Cedra network.
          Connect your wallet and explore community events, games, and more.
        </p>
      </header>

      {/* Category Cards Section */}
      <section className="grid gap-nova-lg">
        <h2 className="text-h2 text-text-primary">Explore</h2>
        <div className="grid gap-nova-lg sm:grid-cols-2">
          {categories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      </section>

      {/* Info Aside */}
      <GlassCard as="aside" className="grid gap-nova-md">
        <div className="flex items-center gap-nova-sm">
          <img
            src="/colour-logo.png"
            alt="Nova ecosystem logo"
            className="h-10 w-10 rounded-full object-cover"
          />
          <h2 className="text-h3 text-text-primary">Getting Started</h2>
        </div>
        <ul className="grid gap-nova-sm text-body text-text-secondary">
          <li className="flex items-start gap-nova-sm">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-nova-cyan" />
            Connect a Cedra wallet-standard wallet from the header.
          </li>
          <li className="flex items-start gap-nova-sm">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-nova-cyan" />
            Browse categories above to discover what you can do.
          </li>
          <li className="flex items-start gap-nova-sm">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-nova-cyan" />
            More features are on the way as the ecosystem grows.
          </li>
        </ul>
      </GlassCard>
    </section>
  );
}
