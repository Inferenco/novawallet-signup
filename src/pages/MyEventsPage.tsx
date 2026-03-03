import { useMemo, useState } from "react";
import {
  EventForm,
  type EventFormValues,
} from "@/components/events/EventForm";
import { EventList } from "@/components/events/EventList";
import {
  useUserEventsQuery,
  useUserPendingEventsQuery,
} from "@/hooks/events/useEventQueries";
import { useEventMutations } from "@/hooks/events/useEventMutations";
import { mapErrorMessage, toUnixSeconds } from "@/lib/format";
import type { EventRecord } from "@/services/events/types";
import { useToast } from "@/providers/ToastProvider";
import { useWallet } from "@/providers/WalletProvider";
import { GlassCard, NovaButton } from "@/components/ui";

const PAGE_SIZE = 20;

export function MyEventsPage() {
  const wallet = useWallet();
  const { pushToast } = useToast();
  const accountAddress = wallet.account?.address?.toString() ?? null;

  const [editTarget, setEditTarget] = useState<EventRecord | null>(null);

  const userEventsQuery = useUserEventsQuery({
    address: accountAddress,
    page: 0,
    pageSize: PAGE_SIZE,
  });
  const userPendingQuery = useUserPendingEventsQuery({
    address: accountAddress,
    page: 0,
    pageSize: PAGE_SIZE,
  });

  const {
    cancelPendingMutation,
    cancelLiveMutation,
    submitEditRequestMutation,
  } = useEventMutations();

  const sections = useMemo(() => {
    const events = userEventsQuery.data ?? [];
    return {
      live: events.filter((event) => event.status === "Live"),
      upcoming: events.filter(
        (event) => event.status === "Upcoming" || event.status === "TBA"
      ),
      past: events.filter((event) => event.status === "Past"),
    };
  }, [userEventsQuery.data]);

  if (!wallet.connected || !accountAddress) {
    return (
      <GlassCard as="section" className="py-nova-xxxl text-center">
        <h1 className="text-h1 text-text-primary">My Events</h1>
        <p className="mt-nova-sm text-body text-text-muted">
          Connect your wallet to view pending submissions and approved event
          listings.
        </p>
      </GlassCard>
    );
  }

  if (wallet.networkMismatch) {
    return (
      <GlassCard
        as="section"
        className="border-status-warning-border bg-status-warning-bg py-nova-xxl"
      >
        <h1 className="text-h1 text-status-warning">Network mismatch</h1>
        <p className="mt-nova-sm text-body text-text-primary">
          Switch your wallet to Cedra Testnet to load and manage your events.
        </p>
      </GlassCard>
    );
  }

  return (
    <section className="grid gap-nova-xl">
      <header>
        <h1 className="text-h1 text-text-primary">My Events</h1>
        <p className="text-body text-text-muted">
          Manage pending submissions and your live/upcoming/past events.
        </p>
      </header>

      {/* Pending Submissions */}
      <GlassCard as="section" className="grid gap-nova-md">
        <h2 className="text-h2 text-text-primary">Pending Submissions</h2>
        {userPendingQuery.isLoading ? (
          <p className="text-body text-text-muted">
            Loading pending submissions...
          </p>
        ) : (userPendingQuery.data?.length ?? 0) === 0 ? (
          <p className="text-body text-text-muted">No pending submissions.</p>
        ) : (
          <div className="grid gap-nova-md">
            {userPendingQuery.data?.map((pending) => (
              <GlassCard key={pending.pendingId} className="grid gap-nova-sm">
                <div className="flex flex-wrap items-start justify-between gap-nova-sm">
                  <div>
                    <h3 className="text-h3 text-text-primary">
                      {pending.title}
                    </h3>
                    <p className="text-caption text-text-muted">
                      Pending ID: {pending.pendingId}
                    </p>
                  </div>
                  <NovaButton
                    variant="danger"
                    size="sm"
                    disabled={cancelPendingMutation.isPending}
                    onClick={async () => {
                      try {
                        const tx = await cancelPendingMutation.mutateAsync(
                          pending.pendingId
                        );
                        pushToast("success", "Pending event cancelled.", {
                          actionHref: tx.explorerUrl,
                          actionLabel: "View transaction",
                        });
                      } catch (error) {
                        pushToast("error", mapErrorMessage(error));
                      }
                    }}
                  >
                    Cancel Pending
                  </NovaButton>
                </div>
                <p className="text-body text-text-secondary">
                  {pending.description}
                </p>
              </GlassCard>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Approved Events */}
      <section className="grid gap-nova-lg">
        <h2 className="text-h2 text-text-primary">Approved Events</h2>
        <EventList
          events={[...sections.live, ...sections.upcoming, ...sections.past]}
          emptyTitle="No approved events yet"
          emptyCopy="Your approved events will appear here."
          renderActions={(event) => (
            <>
              <NovaButton
                variant="ghost"
                size="sm"
                onClick={() => setEditTarget(event)}
              >
                Submit Edit Request
              </NovaButton>
              <NovaButton
                variant="danger"
                size="sm"
                disabled={cancelLiveMutation.isPending}
                onClick={async () => {
                  if (!window.confirm("Cancel this live event?")) return;

                  try {
                    const tx = await cancelLiveMutation.mutateAsync(event.id);
                    pushToast("success", "Live event cancelled.", {
                      actionHref: tx.explorerUrl,
                      actionLabel: "View transaction",
                    });
                  } catch (error) {
                    pushToast("error", mapErrorMessage(error));
                  }
                }}
              >
                Cancel Live Event
              </NovaButton>
            </>
          )}
        />
      </section>

      {/* Edit Request Modal */}
      {editTarget && (
        <GlassCard as="section" className="grid gap-nova-md">
          <div className="flex items-center justify-between gap-nova-sm">
            <h2 className="text-h2 text-text-primary">Edit Request</h2>
            <NovaButton
              variant="ghost"
              size="sm"
              onClick={() => setEditTarget(null)}
            >
              Close
            </NovaButton>
          </div>
          <EventForm
            mode="edit"
            initialValues={{
              title: editTarget.title,
              description: editTarget.description,
              category: editTarget.category,
              imageUrl: editTarget.imageUrl,
              eventUrl: editTarget.eventUrl,
              isTba: editTarget.isTba,
              startTimestamp: editTarget.startTimestamp,
              endTimestamp: editTarget.endTimestamp,
            }}
            submitLabel="Submit Edit Request"
            isSubmitting={submitEditRequestMutation.isPending}
            onSubmit={async (values: EventFormValues) => {
              try {
                const tx = await submitEditRequestMutation.mutateAsync({
                  eventId: editTarget.id,
                  newTitle: values.title,
                  newDescription: values.description,
                  newCategory: values.category,
                  newImageUrl: values.imageUrl || "",
                  newEventUrl: values.eventUrl || "",
                  newStartTimestamp: values.isTba
                    ? 0
                    : toUnixSeconds(values.startAt || ""),
                  newEndTimestamp: values.isTba
                    ? 0
                    : toUnixSeconds(values.endAt || ""),
                  newIsTba: values.isTba,
                });
                setEditTarget(null);
                pushToast("success", "Edit request submitted.", {
                  actionHref: tx.explorerUrl,
                  actionLabel: "View transaction",
                });
              } catch (error) {
                pushToast("error", mapErrorMessage(error));
              }
            }}
          />
        </GlassCard>
      )}
    </section>
  );
}
