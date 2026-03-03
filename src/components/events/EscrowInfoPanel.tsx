import { GlassCard } from "@/components/ui";
import { formatCedraFromOctas } from "@/lib/format";
import type { EventsFeesConfig } from "@/services/events/types";

interface EscrowInfoPanelProps {
  fees: EventsFeesConfig | undefined;
  isLoading: boolean;
}

export function EscrowInfoPanel({ fees, isLoading }: EscrowInfoPanelProps) {
  if (isLoading) {
    return (
      <GlassCard className="text-body text-text-muted">
        Loading fee information...
      </GlassCard>
    );
  }

  if (!fees) {
    return null;
  }

  const escrowDisplay = formatCedraFromOctas(fees.minEscrowFee);
  const approvalRefund = 100 - fees.approvalFeePercent;
  const rejectionRefund = 100 - fees.rejectionFeePercent;

  return (
    <GlassCard className="grid gap-nova-md">
      <h3 className="text-h3 text-text-primary">How Escrow Works</h3>

      <p className="text-body text-text-secondary">
        When you submit an event, you deposit <strong className="text-text-primary">{escrowDisplay}</strong> as escrow.
        This ensures quality submissions and covers processing costs.
      </p>

      <div className="grid gap-nova-sm">
        <div className="flex items-start gap-nova-sm">
          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-status-success" />
          <div>
            <p className="text-body-medium text-text-primary">Approved</p>
            <p className="text-body-small text-text-muted">
              You receive {approvalRefund}% of your escrow back ({fees.approvalFeePercent}% processing fee)
            </p>
          </div>
        </div>

        <div className="flex items-start gap-nova-sm">
          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-status-error" />
          <div>
            <p className="text-body-medium text-text-primary">Rejected</p>
            <p className="text-body-small text-text-muted">
              You receive {rejectionRefund}% of your escrow back ({fees.rejectionFeePercent}% fee for review)
            </p>
          </div>
        </div>

        <div className="flex items-start gap-nova-sm">
          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-status-warning" />
          <div>
            <p className="text-body-medium text-text-primary">Cancelled by you</p>
            <p className="text-body-small text-text-muted">
              Full escrow refunded if cancelled before approval
            </p>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
