import { useMemo, useRef, useState } from "react";
import { EventFilters } from "@/components/events/EventFilters";
import {
  EventForm,
  type EventFormValues,
} from "@/components/events/EventForm";
import { EventList } from "@/components/events/EventList";
import {
  useAllCategoriesQuery,
  useEventFeesQuery,
  usePublicEventsQuery,
} from "@/hooks/events/useEventQueries";
import { useEventMutations } from "@/hooks/events/useEventMutations";
import {
  formatCedraFromOctas,
  mapErrorMessage,
  toUnixSeconds,
} from "@/lib/format";
import { useWallet } from "@/providers/WalletProvider";
import { useToast } from "@/providers/ToastProvider";
import { hasConfiguredWalletContract } from "@/config/env";
import { GlassCard, NovaButton } from "@/components/ui";

const PAGE_SIZE = 10;

export function EventsPage() {
  const [page, setPage] = useState(0);
  const [category, setCategory] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const formSectionRef = useRef<HTMLElement | null>(null);

  const wallet = useWallet();
  const { pushToast } = useToast();
  const feesQuery = useEventFeesQuery();
  const eventsQuery = usePublicEventsQuery({
    page,
    pageSize: PAGE_SIZE,
    category,
  });
  const categoriesQuery = useAllCategoriesQuery();
  const { submitEventMutation } = useEventMutations();

  const escrowAmount = feesQuery.data?.minEscrowFee;
  const writeDisabled =
    !wallet.connected || wallet.connecting || wallet.networkMismatch;

  const canGoNext = useMemo(
    () => (eventsQuery.data?.length ?? 0) === PAGE_SIZE,
    [eventsQuery.data]
  );

  const openSubmitForm = () => {
    setShowForm(true);

    window.requestAnimationFrame(() => {
      formSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

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
      isTba: values.isTba,
    });

    setLastTxHash(tx.hash);
    setShowForm(false);
    pushToast("success", "Event request submitted.", {
      actionHref: tx.explorerUrl,
      actionLabel: "View transaction",
    });
  };

  return (
    <section className="grid gap-nova-xl">
      <header className="grid gap-nova-sm">
        <h1 className="text-h1 text-text-primary">Events</h1>
        <p className="text-body text-text-muted">
          Browse approved community events and submit your own event request.
        </p>
      </header>

      {!hasConfiguredWalletContract() && (
        <GlassCard className="border-status-warning-border bg-status-warning-bg text-body text-status-warning">
          Wallet contract address is not configured. Set
          VITE_WALLET_CONTRACT_ADDRESS to enable on-chain calls.
        </GlassCard>
      )}

      {/* Featured CTA Section */}
      <section className="relative overflow-hidden rounded-nova-hero border border-nova-blue/30 bg-gradient-to-br from-nova-blue/25 via-bg-secondary/85 to-bg-primary p-nova-xl shadow-nova-glow">
        <div
          className="nova-section-glow -right-10 -top-20"
          aria-hidden="true"
        />
        <div className="relative z-10 grid gap-nova-lg lg:grid-cols-[1.2fr_auto] lg:items-center">
          <div className="space-y-nova-sm">
            <span className="nova-badge nova-badge-info">
              Spotlight Your Event
            </span>
            <h2 className="text-h1 text-text-primary">
              Ready to publish your next event?
            </h2>
            <p className="max-w-2xl text-body text-text-secondary">
              Open the submission flow, fill out details, and send your on-chain
              request in under a minute.
            </p>
          </div>

          <button
            type="button"
            className="nova-submit-cta"
            onClick={openSubmitForm}
            disabled={writeDisabled}
          >
            <span>Start Event Submission</span>
            <span aria-hidden className="cta-arrow">
              &rarr;
            </span>
          </button>
        </div>

        {!wallet.connected && (
          <p className="relative z-10 mt-nova-md text-caption text-text-muted">
            Connect your wallet first, then use the button above to jump into
            the form.
          </p>
        )}

        {wallet.networkMismatch && (
          <p className="relative z-10 mt-nova-sm text-caption text-status-warning">
            Your wallet is on the wrong network. Switch to Cedra Testnet to
            submit.
          </p>
        )}
      </section>

      {/* Submit Form Section */}
      <section ref={formSectionRef}>
      <GlassCard className="grid gap-nova-md">
        <div className="flex flex-wrap items-center justify-between gap-nova-sm">
          <h2 className="text-h2 text-text-primary">Submit new event</h2>
          <NovaButton
            variant="ghost"
            size="sm"
            onClick={() => setShowForm((current) => !current)}
            disabled={writeDisabled}
          >
            {showForm ? "Hide form" : "Open form panel"}
          </NovaButton>
        </div>

        <p className="text-caption text-text-muted">
          Required escrow:{" "}
          {escrowAmount ? formatCedraFromOctas(escrowAmount) : "Loading..."}.
          Approved and rejected refunds follow contract fee rules.
        </p>

        {wallet.networkMismatch && (
          <p className="text-caption text-status-warning">
            Switch your wallet network to Cedra Testnet before submitting.
          </p>
        )}

        {!wallet.connected && (
          <p className="text-caption text-text-muted">
            Connect your wallet to submit events.
          </p>
        )}

        {showForm && (
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
        )}

        {lastTxHash && (
          <p className="text-caption text-text-muted">
            Last submission hash: <code>{lastTxHash}</code>
          </p>
        )}
      </GlassCard>
      </section>

      <EventFilters
        categories={categoriesQuery.data ?? ["All"]}
        selectedCategory={category}
        onCategoryChange={(next) => {
          setCategory(next);
          setPage(0);
        }}
      />

      {eventsQuery.isLoading ? (
        <p className="text-body text-text-muted">Loading events...</p>
      ) : eventsQuery.error ? (
        <GlassCard className="border-status-error-border bg-status-error-bg text-body text-status-error">
          Failed to load events.
        </GlassCard>
      ) : (
        <EventList
          events={eventsQuery.data ?? []}
          emptyTitle="No events in this category"
          emptyCopy="Try another category or submit the first listing."
        />
      )}

      <div className="flex items-center justify-end gap-nova-sm">
        <NovaButton
          variant="ghost"
          size="sm"
          onClick={() => setPage((current) => Math.max(0, current - 1))}
          disabled={page === 0}
        >
          Previous
        </NovaButton>
        <NovaButton
          variant="ghost"
          size="sm"
          onClick={() => setPage((current) => current + 1)}
          disabled={!canGoNext}
        >
          Next
        </NovaButton>
      </div>
    </section>
  );
}
