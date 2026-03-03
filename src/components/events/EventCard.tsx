import type { ReactNode } from "react";
import { formatDateTime, shortAddress } from "@/lib/format";
import type { EventRecord } from "@/services/events/types";
import { StatusBadge } from "./StatusBadge";
import { GlassCard } from "@/components/ui";

interface EventCardProps {
  event: EventRecord;
  actions?: ReactNode;
}

export function EventCard({ event, actions }: EventCardProps) {
  return (
    <GlassCard as="article" className="grid gap-nova-md" pressable={!actions}>
      <div className="flex flex-wrap items-start justify-between gap-nova-sm">
        <div>
          <h3 className="text-h3 text-text-primary">{event.title}</h3>
          <p className="text-caption text-text-muted">
            by {shortAddress(event.submitter)}
          </p>
        </div>
        <StatusBadge status={event.status} />
      </div>

      <p className="text-body text-text-secondary">{event.description}</p>

      <div className="grid gap-nova-xs text-caption text-text-muted">
        <p>
          <span className="text-text-secondary">Category:</span> {event.category}
        </p>
        <p>
          <span className="text-text-secondary">Schedule:</span>{" "}
          {event.isTba
            ? "To be announced"
            : `${formatDateTime(event.startTimestamp)} - ${formatDateTime(
                event.endTimestamp
              )}`}
        </p>
      </div>

      {event.imageUrl && (
        <img
          src={event.imageUrl}
          alt={`${event.title} cover`}
          className="h-40 w-full rounded-nova-small object-cover"
          loading="lazy"
        />
      )}

      {event.eventUrl && (
        <a
          href={event.eventUrl}
          target="_blank"
          rel="noreferrer"
          className="text-body text-nova-cyan hover:underline"
        >
          Event link
        </a>
      )}

      {actions && (
        <div className="flex flex-wrap gap-nova-sm border-t border-surface-glass-border pt-nova-md">
          {actions}
        </div>
      )}
    </GlassCard>
  );
}
