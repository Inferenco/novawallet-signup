import type { EventStatus } from "@/lib/format";

const statusConfig: Record<
  EventStatus,
  { className: string; showPulse?: boolean }
> = {
  Live: {
    className: "nova-badge-success",
    showPulse: true,
  },
  Upcoming: {
    className: "nova-badge-info",
  },
  Past: {
    className: "nova-badge-muted",
  },
  TBA: {
    className: "nova-badge-violet",
  },
};

export function StatusBadge({ status }: { status: EventStatus }) {
  const config = statusConfig[status];

  return (
    <span className={`nova-badge ${config.className}`}>
      {config.showPulse && (
        <span className="h-1.5 w-1.5 rounded-full bg-status-success animate-pulse" />
      )}
      {status}
    </span>
  );
}
