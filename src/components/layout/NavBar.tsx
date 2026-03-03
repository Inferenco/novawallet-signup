import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { WalletButton } from "@/components/wallet/WalletButton";
import { useWallet } from "@/providers/WalletProvider";

interface NavBarProps {
  theme: "dark" | "light";
  onToggleTheme: () => void;
  hideThemeToggle?: boolean;
}

const navItems = [
  { to: "/events", label: "Events" },
  { to: "/my-events", label: "My Events" },
  { to: "/games", label: "Games" },
];

export function NavBar({ theme, onToggleTheme, hideThemeToggle }: NavBarProps) {
  const { networkMismatch } = useWallet();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-30 border-b border-surface-glass-border bg-bg-primary/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-nova-md px-nova-lg py-nova-md">
        {/* Logo + Home */}
        <div className="flex shrink-0 items-center gap-nova-xs">
          <NavLink to="/" className="shrink-0">
            <img
              src="/nova-logo.png"
              alt="Nova logo"
              className="h-8 w-8 rounded-nova-micro"
            />
          </NavLink>
          <NavLink
            to="/"
            className={({ isActive }) =>
              `whitespace-nowrap rounded-nova-round px-nova-md py-nova-sm text-body transition-colors ${
                isActive
                  ? "bg-surface-glass font-medium text-text-primary"
                  : "text-text-secondary hover:bg-surface-glass/50 hover:text-text-primary"
              }`
            }
          >
            Home
          </NavLink>
        </div>

        {/* Desktop Nav - hidden on mobile */}
        <nav className="hidden items-center gap-nova-xs md:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-nova-round px-nova-md py-nova-sm text-body transition-colors ${
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

        {/* Right Actions */}
        <div className="flex shrink-0 items-center gap-nova-sm">
          {!hideThemeToggle && (
            <button
              onClick={onToggleTheme}
              className="hidden whitespace-nowrap rounded-nova-round bg-surface-glass px-nova-md py-nova-sm text-body text-text-secondary transition-colors hover:bg-surface-glass/80 hover:text-text-primary md:block"
              type="button"
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? "Light" : "Dark"}
            </button>
          )}
          <WalletButton />

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-nova-small text-text-primary md:hidden"
            type="button"
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <nav className="border-t border-surface-glass-border bg-bg-primary/95 backdrop-blur-xl md:hidden">
          <div className="mx-auto max-w-6xl px-nova-lg py-nova-md">
            <div className="grid gap-nova-xs">
              {navItems.map((item) => {
                const isActive = location.pathname === item.to;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={closeMobileMenu}
                    className={`rounded-nova-small px-nova-md py-nova-md text-body transition-colors ${
                      isActive
                        ? "bg-surface-glass font-medium text-text-primary"
                        : "text-text-secondary hover:bg-surface-glass/50 hover:text-text-primary"
                    }`}
                  >
                    {item.label}
                  </NavLink>
                );
              })}
              {!hideThemeToggle && (
                <button
                  onClick={() => {
                    onToggleTheme();
                    closeMobileMenu();
                  }}
                  className="rounded-nova-small px-nova-md py-nova-md text-left text-body text-text-secondary transition-colors hover:bg-surface-glass/50 hover:text-text-primary"
                  type="button"
                >
                  {theme === "dark" ? "Switch to Light" : "Switch to Dark"}
                </button>
              )}
            </div>
          </div>
        </nav>
      )}

      {networkMismatch && (
        <div className="border-t border-status-warning-border bg-status-warning-bg px-nova-lg py-nova-sm text-center text-caption text-status-warning">
          Network mismatch. Switch to Cedra Testnet to submit or manage events.
        </div>
      )}
    </header>
  );
}
