import { useMemo, useState } from "react";
import { EventFilters } from "@/components/events/EventFilters";
import { EventForm, type EventFormValues } from "@/components/events/EventForm";
import { EventList } from "@/components/events/EventList";
import { useCategoryOptions, useEventFeesQuery, usePublicEventsQuery } from "@/hooks/events/useEventQueries";
import { useEventMutations } from "@/hooks/events/useEventMutations";
import { toUnixSeconds, mapErrorMessage } from "@/lib/format";
import { useWallet } from "@/providers/WalletProvider";
import { useToast } from "@/providers/ToastProvider";
import { hasConfiguredWalletContract } from "@/config/env";

const PAGE_SIZE = 10;

export function EventsPage() {
  const [page, setPage] = useState(0);
  const [category, setCategory] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  const wallet = useWallet();
  const { pushToast } = useToast();
  const feesQuery = useEventFeesQuery();
  const eventsQuery = usePublicEventsQuery({ page, pageSize: PAGE_SIZE, category });
  const categoryOptions = useCategoryOptions(eventsQuery.data);
  const { submitEventMutation } = useEventMutations();

  const escrowAmount = feesQuery.data?.minEscrowFee;
  const writeDisabled = !wallet.connected || wallet.connecting || wallet.networkMismatch;

  const canGoNext = useMemo(
    () => (eventsQuery.data?.length ?? 0) === PAGE_SIZE,
    [eventsQuery.data]
  );

  const handleSubmit = async (values: EventFormValues) => {
    if (!escrowAmount) {
      throw new Error("Escrow fee not loaded yet.");
    }

    const tx = await submitEventMutation.mutateAsync({
      escrowAmount,
      title: values.title,
      description: values.description,
      category: values.category,
      imageUrl: values.imageUrl || "",
      eventUrl: values.eventUrl || "",
      startTimestamp: values.isTba ? 0 : toUnixSeconds(values.startAt || ""),
      endTimestamp: values.isTba ? 0 : toUnixSeconds(values.endAt || ""),
      isTba: values.isTba
    });

    setLastTxHash(tx.hash);
    setShowForm(false);
    pushToast("success", "Event request submitted.", {
      actionHref: tx.explorerUrl,
      actionLabel: "View transaction"
    });
  };

  return (
    <section className="grid gap-5">
      <header className="grid gap-2">
        <h1 className="font-display text-3xl text-ink-0">Events</h1>
        <p className="text-sm text-ink-2">
          Browse approved community events and submit your own event request.
        </p>
      </header>

      {!hasConfiguredWalletContract() ? (
        <p className="rounded-xl border border-amber-300/30 bg-amber-950/50 p-3 text-sm text-amber-100">
          Wallet contract address is not configured. Set VITE_WALLET_CONTRACT_ADDRESS to
          enable on-chain calls.
        </p>
      ) : null}

      <section className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl text-ink-0">Submit new event</h2>
          <button
            type="button"
            className="rounded-lg border border-white/20 px-3 py-2 text-xs text-ink-1 transition hover:border-white/40 hover:text-ink-0"
            onClick={() => setShowForm((current) => !current)}
            disabled={writeDisabled}
          >
            {showForm ? "Hide form" : "Open form"}
          </button>
        </div>

        <p className="text-xs text-ink-2">
          Required escrow: {escrowAmount ? escrowAmount.toString() : "Loading..."} octas.
          Approved and rejected refunds follow contract fee rules.
        </p>

        {wallet.networkMismatch ? (
          <p className="text-xs text-amber-200">
            Switch your wallet network to Cedra Testnet before submitting.
          </p>
        ) : null}

        {!wallet.connected ? (
          <p className="text-xs text-ink-2">
            Connect your wallet to submit events.
          </p>
        ) : null}

        {showForm ? (
          <EventForm
            mode="submit"
            escrowAmount={escrowAmount}
            submitLabel="Submit Event Request"
            isSubmitting={submitEventMutation.isPending}
            onSubmit={async (values) => {
              try {
                await handleSubmit(values);
              } catch (error) {
                pushToast("error", mapErrorMessage(error));
              }
            }}
          />
        ) : null}

        {lastTxHash ? (
          <p className="text-xs text-ink-2">Last submission hash: {lastTxHash}</p>
        ) : null}
      </section>

      <EventFilters
        categories={categoryOptions}
        selectedCategory={category}
        onCategoryChange={(next) => {
          setCategory(next);
          setPage(0);
        }}
      />

      {eventsQuery.isLoading ? (
        <p className="text-sm text-ink-2">Loading events...</p>
      ) : eventsQuery.error ? (
        <p className="rounded-xl border border-rose-400/40 bg-rose-950/40 p-3 text-sm text-rose-100">
          Failed to load events.
        </p>
      ) : (
        <EventList
          events={eventsQuery.data ?? []}
          emptyTitle="No events in this category"
          emptyCopy="Try another category or submit the first listing."
        />
      )}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          className="rounded-lg border border-white/20 px-3 py-2 text-xs text-ink-1 transition hover:border-white/40 hover:text-ink-0 disabled:opacity-50"
          onClick={() => setPage((current) => Math.max(0, current - 1))}
          disabled={page === 0}
        >
          Previous
        </button>
        <button
          type="button"
          className="rounded-lg border border-white/20 px-3 py-2 text-xs text-ink-1 transition hover:border-white/40 hover:text-ink-0 disabled:opacity-50"
          onClick={() => setPage((current) => current + 1)}
          disabled={!canGoNext}
        >
          Next
        </button>
      </div>
    </section>
  );
}
