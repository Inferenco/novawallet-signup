import { Link } from "react-router-dom";
import type { ReactNode } from "react";

interface GamesTopBarProps {
  title: string;
  subtitle?: string;
  backTo?: string;
  backLabel?: string;
  rightSlot?: ReactNode;
}

export function GamesTopBar({
  title,
  subtitle,
  backTo,
  backLabel = "Back",
  rightSlot
}: GamesTopBarProps) {
  return (
    <header className="games-topbar">
      <div className="games-topbar-slot">
        {backTo ? (
          <Link className="games-icon-button games-icon-button-text" to={backTo}>
            {backLabel}
          </Link>
        ) : (
          <div className="games-topbar-placeholder" />
        )}
      </div>

      <div className="games-topbar-center">
        <p className="games-topbar-title">{title}</p>
        {subtitle ? <p className="games-topbar-subtitle">{subtitle}</p> : null}
      </div>

      <div className="games-topbar-slot games-topbar-slot-right">
        {rightSlot ?? <div className="games-topbar-placeholder" />}
      </div>
    </header>
  );
}
