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
      {backTo ? (
        <Link className="games-icon-button games-icon-button-text" to={backTo}>
          {backLabel}
        </Link>
      ) : (
        <div style={{ width: 38 }} />
      )}

      <div className="games-topbar-center">
        <p className="games-topbar-title">{title}</p>
        {subtitle ? <p className="games-topbar-subtitle">{subtitle}</p> : null}
      </div>

      <div>{rightSlot ?? <div style={{ width: 38 }} />}</div>
    </header>
  );
}
