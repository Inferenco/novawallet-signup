import { useMemo, useState } from "react";
import { EventForm, type EventFormValues } from "@/components/events/EventForm";
import { EventList } from "@/components/events/EventList";
import {
  useUserEventsQuery,
  useUserPendingEventsQuery
} from "@/hooks/events/useEventQueries";
import { useEventMutations } from "@/hooks/events/useEventMutations";
import { mapErrorMessage, toUnixSeconds } from "@/lib/format";
import type { EventRecord } from "@/services/events/types";
import { useToast } from "@/providers/ToastProvider";
import { useWallet } from "@/providers/WalletProvider";

const PAGE_SIZE = 20;

function actionButtonClassName(kind: "danger" | "neutral" = "neutral") {
  if (kind === "danger") {
    return "rounded-lg border border-rose-300/40 px-3 py-2 text-xs text-rose-100 transition hover:bg-rose-500/20";
  }
  return "rounded-lg border border-white/20 px-3 py-2 text-xs text-ink-1 transition hover:border-white/40 hover:text-ink-0";
}

export function MyEventsPage() {
  const wallet = useWallet();
  const { pushToast } = useToast();
  const accountAddress = wallet.account?.address?.toString() ?? null;

  const [editTarget, setEditTarget] = useState<EventRecord | null>(null);

  const userEventsQuery = useUserEventsQuery({
    address: accountAddress,
    page: 0,
    pageSize: PAGE_SIZE
  });
  const userPendingQuery = useUserPendingEventsQuery({
    address: accountAddress,
    page: 0,
    pageSize: PAGE_SIZE
  });

  const {
    cancelPendingMutation,
    cancelLiveMutation,
    submitEditRequestMutation
  } = useEventMutations();

  const sections = useMemo(() => {
    const events = userEventsQuery.data ?? [];
    return {
      live: events.filter((event) => event.status === "Live"),
      upcoming: events.filter((event) => event.status === "Upcoming" || event.status === "TBA"),
      past: events.filter((event) => event.status === "Past")
    };
  }, [userEventsQuery.data]);

  if (!wallet.connected || !accountAddress) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
        <h1 className="font-display text-3xl text-ink-0">My Events</h1>
        <p className="mt-2 text-sm text-ink-2">
          Connect your wallet to view pending submissions and approved event listings.
        </p>
      </section>
    );
  }

  if (wallet.networkMismatch) {
    return (
      <section className="rounded-2xl border border-amber-300/30 bg-amber-950/50 p-6">
        <h1 className="font-display text-3xl text-amber-100">Network mismatch</h1>
        <p className="mt-2 text-sm text-amber-50">
          Switch your wallet to Cedra Testnet to load and manage your events.
        </p>
      </section>
    );
  }

  return (
    <section className="grid gap-6">
      <header>
        <h1 className="font-display text-3xl text-ink-0">My Events</h1>
        <p className="text-sm text-ink-2">
          Manage pending submissions and your live/upcoming/past events.
        </p>
      </header>

      <section className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="font-display text-xl text-ink-0">Pending Submissions</h2>
        {userPendingQuery.isLoading ? (
          <p className="text-sm text-ink-2">Loading pending submissions...</p>
        ) : (userPendingQuery.data?.length ?? 0) === 0 ? (
          <p className="text-sm text-ink-2">No pending submissions.</p>
        ) : (
          <div className="grid gap-3">
            {userPendingQuery.data?.map((pending) => (
              <article
                key={pending.pendingId}
                className="rounded-xl border border-white/10 bg-bg-1 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-display text-lg text-ink-0">{pending.title}</h3>
                    <p className="text-xs text-ink-2">Pending ID: {pending.pendingId}</p>
                  </div>
                  <button
                    type="button"
                    className={actionButtonClassName("danger")}
                    disabled={cancelPendingMutation.isPending}
                    onClick={async () => {
                      try {
                        const tx = await cancelPendingMutation.mutateAsync(
                          pending.pendingId
                        );
                        pushToast("success", "Pending event cancelled.", {
                          actionHref: tx.explorerUrl,
                          actionLabel: "View transaction"
                        });
                      } catch (error) {
                        pushToast("error", mapErrorMessage(error));
                      }
                    }}
                  >
                    Cancel Pending
                  </button>
                </div>
                <p className="mt-2 text-sm text-ink-1">{pending.description}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4">
        <h2 className="font-display text-xl text-ink-0">Approved Events</h2>
        <EventList
          events={[...sections.live, ...sections.upcoming, ...sections.past]}
          emptyTitle="No approved events yet"
          emptyCopy="Your approved events will appear here."
          renderActions={(event) => (
            <>
              <button
                type="button"
                className={actionButtonClassName()}
                onClick={() => setEditTarget(event)}
              >
                Submit Edit Request
              </button>
              <button
                type="button"
                className={actionButtonClassName("danger")}
                disabled={cancelLiveMutation.isPending}
                onClick={async () => {
                  if (!window.confirm("Cancel this live event?")) return;

                  try {
                    const tx = await cancelLiveMutation.mutateAsync(event.id);
                    pushToast("success", "Live event cancelled.", {
                      actionHref: tx.explorerUrl,
                      actionLabel: "View transaction"
                    });
                  } catch (error) {
                    pushToast("error", mapErrorMessage(error));
                  }
                }}
              >
                Cancel Live Event
              </button>
            </>
          )}
        />
      </section>

      {editTarget ? (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-display text-xl text-ink-0">Edit Request</h2>
            <button
              type="button"
              className={actionButtonClassName()}
              onClick={() => setEditTarget(null)}
            >
              Close
            </button>
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
              endTimestamp: editTarget.endTimestamp
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
                  newEndTimestamp: values.isTba ? 0 : toUnixSeconds(values.endAt || ""),
                  newIsTba: values.isTba
                });
                setEditTarget(null);
                pushToast("success", "Edit request submitted.", {
                  actionHref: tx.explorerUrl,
                  actionLabel: "View transaction"
                });
              } catch (error) {
                pushToast("error", mapErrorMessage(error));
              }
            }}
          />
        </section>
      ) : null}
    </section>
  );
}
