import { NavLink } from "react-router-dom";
import { WalletButton } from "@/components/wallet/WalletButton";
import { useWallet } from "@/providers/WalletProvider";

interface NavBarProps {
  theme: "dark" | "light";
  onToggleTheme: () => void;
}

const navItems = [
  { to: "/", label: "Home" },
  { to: "/events", label: "Events" },
  { to: "/my-events", label: "My Events" },
  { to: "/games", label: "Games" },
  { to: "/privacy", label: "Privacy" }
];

export function NavBar({ theme, onToggleTheme }: NavBarProps) {
  const { networkMismatch } = useWallet();

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-bg-0/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <NavLink to="/" className="inline-flex items-center gap-2">
          <img src="/nova-logo.png" alt="Nova logo" className="h-8 w-8" />
          <div>
            <p className="font-display text-sm font-semibold uppercase tracking-[0.16em] text-ink-0">
              Nova Ecosystem
            </p>
            <p className="text-xs text-ink-2">Cedra Browser dApp</p>
          </div>
        </NavLink>

        <nav className="flex items-center gap-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-full px-3 py-1.5 text-sm transition ${
                  isActive
                    ? "bg-white/10 text-ink-0"
                    : "text-ink-2 hover:bg-white/5 hover:text-ink-1"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleTheme}
            className="rounded-full border border-white/20 px-3 py-1.5 text-xs text-ink-1 transition hover:border-white/40 hover:text-ink-0"
            type="button"
          >
            {theme === "dark" ? "Light" : "Dark"} Mode
          </button>
          <WalletButton />
        </div>
      </div>
      {networkMismatch ? (
        <div className="border-t border-amber-400/20 bg-amber-950/50 px-4 py-2 text-center text-xs text-amber-100">
          Wallet network mismatch. Switch to Cedra Testnet to submit or manage events.
        </div>
      ) : null}
    </header>
  );
}
