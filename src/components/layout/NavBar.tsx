import { NavLink } from "react-router-dom";
import { WalletButton } from "@/components/wallet/WalletButton";
import { useWallet } from "@/providers/WalletProvider";

interface NavBarProps {
  theme: "dark" | "light";
  onToggleTheme: () => void;
  hideThemeToggle?: boolean;
}

const navItems = [
  { to: "/", label: "Home" },
  { to: "/events", label: "Events" },
  { to: "/my-events", label: "My Events" },
  { to: "/games", label: "Games" },
];

export function NavBar({ theme, onToggleTheme, hideThemeToggle }: NavBarProps) {
  const { networkMismatch } = useWallet();

  return (
    <header className="sticky top-0 z-30 border-b border-surface-glass-border bg-bg-primary/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-nova-md px-nova-lg py-nova-md">
        <NavLink to="/" className="inline-flex items-center gap-nova-sm">
          <img
            src="/nova-logo.png"
            alt="Nova logo"
            className="h-8 w-8 rounded-nova-micro"
          />
          <div>
            <p className="text-body font-semibold text-text-primary">
              Nova Ecosystem
            </p>
            <p className="text-caption text-text-muted">Cedra dApp</p>
          </div>
        </NavLink>

        <nav className="flex items-center gap-nova-xs">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `min-h-touch flex items-center rounded-nova-round px-nova-md py-nova-sm text-body transition-colors ${
                  isActive
                    ? "bg-surface-glass font-medium text-text-primary"
                    : "text-text-secondary hover:bg-surface-glass/50 hover:text-text-primary"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-nova-sm">
          {!hideThemeToggle && (
            <button
              onClick={onToggleTheme}
              className="nova-btn nova-btn-ghost nova-btn-sm"
              type="button"
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? "Light" : "Dark"}
            </button>
          )}
          <WalletButton />
        </div>
      </div>

      {networkMismatch && (
        <div className="border-t border-status-warning-border bg-status-warning-bg px-nova-lg py-nova-sm text-center text-caption text-status-warning">
          Network mismatch. Switch to Cedra Testnet to submit or manage events.
        </div>
      )}
    </header>
  );
}
