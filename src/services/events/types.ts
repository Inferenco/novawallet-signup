import type { EventStatus } from "@/lib/format";

export interface EventRecord {
  id: string;
  submitter: string;
  title: string;
  description: string;
  category: string;
  imageUrl: string;
  eventUrl: string;
  startTimestamp: number;
  endTimestamp: number;
  isTba: boolean;
  status: EventStatus;
}

export interface PendingEventRecord {
  pendingId: string;
  submitter: string;
  title: string;
  description: string;
  category: string;
  imageUrl: string;
  eventUrl: string;
  startTimestamp: number;
  endTimestamp: number;
  isTba: boolean;
  escrowAmount: bigint;
  submittedAt: number;
}

export interface EventsFeesConfig {
  minEscrowFee: bigint;
  approvalFeePercent: number;
  rejectionFeePercent: number;
}

export interface PaginationParams {
  limit: number;
  offset: number;
}

export interface SubmitEventInput {
  escrowAmount: bigint;
  title: string;
  description: string;
  category: string;
  imageUrl: string;
  eventUrl: string;
  startTimestamp: number;
  endTimestamp: number;
  isTba: boolean;
}

export interface EditRequestPayload {
  eventId: string;
  newTitle: string;
  newDescription: string;
  newCategory: string;
  newImageUrl: string;
  newEventUrl: string;
  newStartTimestamp: number;
  newEndTimestamp: number;
  newIsTba: boolean;
}

export interface TxResult {
  hash: string;
  explorerUrl: string;
}

export interface WalletTxSubmitter {
  signAndSubmitTransaction: (payload: {
    data: {
      function: `${string}::${string}::${string}`;
      typeArguments?: string[];
      functionArguments: unknown[];
    };
  }) => Promise<{ hash: string }>;
}
