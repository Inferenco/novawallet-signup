interface PokerGameInfoRowProps {
  timer: string;
  phaseLabel: string;
  handLabel: string;
  isUrgent: boolean;
}

export function PokerGameInfoRow({
  timer,
  phaseLabel,
  handLabel,
  isUrgent
}: PokerGameInfoRowProps) {
  return (
    <div className="games-wallet-info-row">
      <span className={`games-wallet-timer ${isUrgent ? "urgent" : ""}`}>{timer}</span>
      <span>{phaseLabel}</span>
      <span>{handLabel}</span>
    </div>
  );
}
