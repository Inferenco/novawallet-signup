import { NavLink } from "react-router-dom";

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-surface-glass-border bg-bg-primary/60 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-nova-md px-nova-lg py-nova-xl text-caption text-text-muted md:flex-row">
        <div className="flex items-center gap-nova-lg">
          <p>Nova Ecosystem dApp</p>
          <NavLink
            to="/privacy"
            className="transition-colors hover:text-text-secondary"
          >
            Privacy
          </NavLink>
        </div>
        <div className="flex items-center gap-nova-lg">
          <a
            href="https://x.com/movenovawallet"
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-text-primary"
          >
            X (Twitter)
          </a>
          <a
            href="https://t.me/movenovawallet"
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-text-primary"
          >
            Telegram
          </a>
        </div>
      </div>
    </footer>
  );
}
