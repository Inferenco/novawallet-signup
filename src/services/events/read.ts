import { CHAIN_CONFIG } from "@/config/chain";
import { appEnv } from "@/config/env";
import { getCedraClient } from "@/lib/cedraClient";
import { computeEventStatus, parseBoolean, parseInteger } from "@/lib/format";
import {
  mockGetEvents,
  mockGetFeeConfig,
  mockGetUserEvents,
  mockGetUserPendingEvents
} from "./mockStore";
import type {
  EventRecord,
  EventsFeesConfig,
  PaginationParams,
  PendingEventRecord
} from "./types";

function eventsFunction(functionName: string): `${string}::${string}::${string}` {
  return `${CHAIN_CONFIG.walletContractAddress}::events::${functionName}`;
}

function normalizeEvent(raw: Record<string, unknown>): EventRecord {
  const startTimestamp = parseInteger(raw.start_timestamp);
  const endTimestamp = parseInteger(raw.end_timestamp);
  const isTba = parseBoolean(raw.is_tba);

  return {
    id: String(raw.id ?? "0"),
    submitter: String(raw.submitter ?? "0x0"),
    title: String(raw.title ?? "Untitled"),
    description: String(raw.description ?? ""),
    category: String(raw.category ?? "General"),
    imageUrl: String(raw.image_url ?? ""),
    eventUrl: String(raw.event_url ?? ""),
    startTimestamp,
    endTimestamp,
    isTba,
    status: computeEventStatus(startTimestamp, endTimestamp, isTba)
  };
}

function normalizePendingEvent(raw: Record<string, unknown>): PendingEventRecord {
  return {
    pendingId: String(raw.pending_id ?? "0"),
    submitter: String(raw.submitter ?? "0x0"),
    title: String(raw.title ?? "Untitled"),
    description: String(raw.description ?? ""),
    category: String(raw.category ?? "General"),
    imageUrl: String(raw.image_url ?? ""),
    eventUrl: String(raw.event_url ?? ""),
    startTimestamp: parseInteger(raw.start_timestamp),
    endTimestamp: parseInteger(raw.end_timestamp),
    isTba: parseBoolean(raw.is_tba),
    escrowAmount: BigInt(String(raw.escrow_amount ?? "0")),
    submittedAt: parseInteger(raw.submitted_at)
  };
}

export async function fetchEventsPage({
  limit,
  offset
}: PaginationParams): Promise<EventRecord[]> {
  if (appEnv.mockChain) {
    return mockGetEvents(limit, offset);
  }

  const client = getCedraClient();
  const result = await client.view({
    payload: {
      function: eventsFunction("get_events_page"),
      functionArguments: [limit.toString(), offset.toString()]
    }
  });

  const rows = Array.isArray(result[0]) ? (result[0] as Record<string, unknown>[]) : [];
  return rows.map(normalizeEvent);
}

export async function fetchUserEvents(
  userAddress: string,
  { limit, offset }: PaginationParams
): Promise<EventRecord[]> {
  if (appEnv.mockChain) {
    return mockGetUserEvents(userAddress, limit, offset);
  }

  const client = getCedraClient();
  const result = await client.view({
    payload: {
      function: eventsFunction("get_user_events"),
      functionArguments: [userAddress, limit.toString(), offset.toString()]
    }
  });

  const rows = Array.isArray(result[0]) ? (result[0] as Record<string, unknown>[]) : [];
  return rows.map(normalizeEvent);
}

export async function fetchUserPendingEvents(
  userAddress: string,
  { limit, offset }: PaginationParams
): Promise<PendingEventRecord[]> {
  if (appEnv.mockChain) {
    return mockGetUserPendingEvents(userAddress, limit, offset);
  }

  const client = getCedraClient();
  const result = await client.view({
    payload: {
      function: eventsFunction("get_user_pending_events"),
      functionArguments: [userAddress, limit.toString(), offset.toString()]
    }
  });

  const rows = Array.isArray(result[0]) ? (result[0] as Record<string, unknown>[]) : [];
  return rows.map(normalizePendingEvent);
}

export async function fetchEventFeeConfig(): Promise<EventsFeesConfig> {
  if (appEnv.mockChain) {
    return mockGetFeeConfig();
  }

  const client = getCedraClient();
  const [minEscrowResult, approvalResult, rejectionResult] = await Promise.all([
    client.view({
      payload: {
        function: eventsFunction("get_min_escrow_fee"),
        functionArguments: []
      }
    }),
    client.view({
      payload: {
        function: eventsFunction("get_approval_fee_percent"),
        functionArguments: []
      }
    }),
    client.view({
      payload: {
        function: eventsFunction("get_rejection_fee_percent"),
        functionArguments: []
      }
    })
  ]);

  return {
    minEscrowFee: BigInt(String(minEscrowResult[0] ?? "0")),
    approvalFeePercent: parseInteger(approvalResult[0]),
    rejectionFeePercent: parseInteger(rejectionResult[0])
  };
}
