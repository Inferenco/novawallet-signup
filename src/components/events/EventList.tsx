import type { ReactNode } from "react";
import type { EventRecord } from "@/services/events/types";
import { EventCard } from "./EventCard";
import { GlassCard } from "@/components/ui";

interface EventListProps {
  events: EventRecord[];
  emptyTitle: string;
  emptyCopy: string;
  renderActions?: (event: EventRecord) => ReactNode;
}

export function EventList({
  events,
  emptyTitle,
  emptyCopy,
  renderActions,
}: EventListProps) {
  if (events.length === 0) {
    return (
      <GlassCard as="section" className="py-nova-xxxl text-center">
        <h3 className="text-h2 text-text-primary">{emptyTitle}</h3>
        <p className="mt-nova-sm text-body text-text-muted">{emptyCopy}</p>
      </GlassCard>
    );
  }

  return (
    <section className="grid gap-nova-lg md:grid-cols-2">
      {events.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          actions={renderActions ? renderActions(event) : undefined}
        />
      ))}
    </section>
  );
}
