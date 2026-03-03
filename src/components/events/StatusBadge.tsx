import type { EventStatus } from "@/lib/format";

const statusStyles: Record<EventStatus, string> = {
  Live: "bg-emerald-500/20 text-emerald-100 border-emerald-300/30",
  Upcoming: "bg-sky-500/20 text-sky-100 border-sky-300/30",
  Past: "bg-slate-500/20 text-slate-100 border-slate-300/30",
  TBA: "bg-violet-500/20 text-violet-100 border-violet-300/30"
};

export function StatusBadge({ status }: { status: EventStatus }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
}
