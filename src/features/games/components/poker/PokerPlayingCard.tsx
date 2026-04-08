import clsx from "clsx";
import { decodeCard, getPipCount, isAce, isFaceCard } from "../../utils/poker/cards";

type PokerPlayingCardSize = "board" | "hero" | "showdown" | "mini";

interface PokerPlayingCardProps {
  value?: number;
  faceDown?: boolean;
  size?: PokerPlayingCardSize;
  className?: string;
  simplified?: boolean;
}

const PIP_LAYOUTS: Record<number, Array<{ x: number; y: number }>> = {
  2: [
    { x: 50, y: 20 },
    { x: 50, y: 80 }
  ],
  3: [
    { x: 50, y: 20 },
    { x: 50, y: 50 },
    { x: 50, y: 80 }
  ],
  4: [
    { x: 32, y: 20 },
    { x: 68, y: 20 },
    { x: 32, y: 80 },
    { x: 68, y: 80 }
  ],
  5: [
    { x: 32, y: 20 },
    { x: 68, y: 20 },
    { x: 50, y: 50 },
    { x: 32, y: 80 },
    { x: 68, y: 80 }
  ],
  6: [
    { x: 32, y: 20 },
    { x: 68, y: 20 },
    { x: 32, y: 50 },
    { x: 68, y: 50 },
    { x: 32, y: 80 },
    { x: 68, y: 80 }
  ],
  7: [
    { x: 32, y: 20 },
    { x: 68, y: 20 },
    { x: 50, y: 35 },
    { x: 32, y: 50 },
    { x: 68, y: 50 },
    { x: 32, y: 80 },
    { x: 68, y: 80 }
  ],
  8: [
    { x: 32, y: 18 },
    { x: 68, y: 18 },
    { x: 50, y: 33 },
    { x: 32, y: 48 },
    { x: 68, y: 48 },
    { x: 50, y: 63 },
    { x: 32, y: 80 },
    { x: 68, y: 80 }
  ],
  9: [
    { x: 32, y: 16 },
    { x: 68, y: 16 },
    { x: 32, y: 36 },
    { x: 68, y: 36 },
    { x: 50, y: 50 },
    { x: 32, y: 64 },
    { x: 68, y: 64 },
    { x: 32, y: 84 },
    { x: 68, y: 84 }
  ],
  10: [
    { x: 32, y: 16 },
    { x: 68, y: 16 },
    { x: 50, y: 28 },
    { x: 32, y: 40 },
    { x: 68, y: 40 },
    { x: 32, y: 60 },
    { x: 68, y: 60 },
    { x: 50, y: 72 },
    { x: 32, y: 84 },
    { x: 68, y: 84 }
  ]
};

export function PokerPlayingCard({
  value,
  faceDown = false,
  size = "board",
  className,
  simplified = false
}: PokerPlayingCardProps) {
  if (faceDown || value === undefined) {
    return (
      <div
        className={clsx("poker-gameplay-card", `size-${size}`, "face-down", className)}
        role="img"
        aria-label="Face-down card"
      >
        <div className="poker-gameplay-card-back-pattern" aria-hidden="true" />
      </div>
    );
  }

  const card = decodeCard(value);
  const faceCard = isFaceCard(value);
  const aceCard = isAce(value);
  const pipCount = getPipCount(value);
  const pipLayout = PIP_LAYOUTS[pipCount] ?? [];
  const pipDensityClass =
    pipCount >= 8 ? "has-dense-pips" : pipCount >= 6 ? "has-tight-pips" : undefined;

  return (
    <div
      className={clsx(
        "poker-gameplay-card",
        `size-${size}`,
        "face-up",
        `color-${card.color}`,
        pipDensityClass,
        className
      )}
      role="img"
      aria-label={`${card.rankSymbol} of ${card.suitName}`}
    >
      <div className="poker-gameplay-card-corner poker-gameplay-card-corner-tl" aria-hidden="true">
        <span className="poker-gameplay-card-rank">{card.rankSymbol}</span>
        <span className="poker-gameplay-card-suit">{card.suitSymbol}</span>
      </div>

      <div className="poker-gameplay-card-center" aria-hidden="true">
        {aceCard ? (
          <span className="poker-gameplay-card-ace">{card.suitSymbol}</span>
        ) : faceCard ? (
          <div className="poker-gameplay-card-face">
            <span className="poker-gameplay-card-face-rank">{card.rankSymbol}</span>
            <span className="poker-gameplay-card-face-suit">{card.suitSymbol}</span>
          </div>
        ) : simplified ? (
          <div className="poker-gameplay-card-face poker-gameplay-card-face-simple">
            <span className="poker-gameplay-card-face-suit">{card.suitSymbol}</span>
          </div>
        ) : (
          pipLayout.map((pip, index) => (
            <span
              key={`${card.name}-${index}`}
              className="poker-gameplay-card-pip"
              style={{
                left: `${pip.x}%`,
                top: `${pip.y}%`,
                transform: `translate(-50%, -50%)${pip.y > 50 ? " rotate(180deg)" : ""}`
              }}
            >
              {card.suitSymbol}
            </span>
          ))
        )}
      </div>

      <div className="poker-gameplay-card-corner poker-gameplay-card-corner-br" aria-hidden="true">
        <span className="poker-gameplay-card-rank">{card.rankSymbol}</span>
        <span className="poker-gameplay-card-suit">{card.suitSymbol}</span>
      </div>
    </div>
  );
}
