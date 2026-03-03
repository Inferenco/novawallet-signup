import type { ReactNode } from "react";
import type { EventRecord } from "@/services/events/types";
import { EventCard } from "./EventCard";

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
  renderActions
}: EventListProps) {
  if (events.length === 0) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
        <h3 className="font-display text-xl text-ink-0">{emptyTitle}</h3>
        <p className="mt-2 text-sm text-ink-2">{emptyCopy}</p>
      </section>
    );
  }

  return (
    <section className="grid gap-4 md:grid-cols-2">
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
