import type { ReactNode } from "react";
import { formatDateTime, shortAddress } from "@/lib/format";
import type { EventRecord } from "@/services/events/types";
import { StatusBadge } from "./StatusBadge";

interface EventCardProps {
  event: EventRecord;
  actions?: ReactNode;
}

export function EventCard({ event, actions }: EventCardProps) {
  return (
    <article className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-lg text-ink-0">{event.title}</h3>
          <p className="text-xs text-ink-2">by {shortAddress(event.submitter)}</p>
        </div>
        <StatusBadge status={event.status} />
      </div>

      <p className="text-sm text-ink-1">{event.description}</p>

      <div className="grid gap-1 text-xs text-ink-2">
        <p>
          <span className="text-ink-1">Category:</span> {event.category}
        </p>
        <p>
          <span className="text-ink-1">Schedule:</span>{" "}
          {event.isTba
            ? "To be announced"
            : `${formatDateTime(event.startTimestamp)} to ${formatDateTime(
                event.endTimestamp
              )}`}
        </p>
      </div>

      {event.imageUrl ? (
        <img
          src={event.imageUrl}
          alt={`${event.title} cover`}
          className="h-40 w-full rounded-xl object-cover"
          loading="lazy"
        />
      ) : null}

      {event.eventUrl ? (
        <a
          href={event.eventUrl}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-accent-0 underline"
        >
          Event link
        </a>
      ) : null}

      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </article>
  );
}
