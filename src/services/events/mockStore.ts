import type {
  EditRequestPayload,
  EventRecord,
  PendingEventRecord,
  SubmitEventInput
} from "./types";
import { computeEventStatus } from "@/lib/format";

const now = Math.floor(Date.now() / 1000);

let nextEventId = 100;
let nextPendingId = 200;

let events: EventRecord[] = [
  {
    id: "1",
    submitter: "0x111",
    title: "Nova Community AMA",
    description: "Monthly community AMA covering wallet updates and ecosystem roadmap.",
    category: "Community",
    imageUrl: "",
    eventUrl: "https://x.com/movenovawallet",
    startTimestamp: now + 7200,
    endTimestamp: now + 10800,
    isTba: false,
    status: "Upcoming"
  },
  {
    id: "2",
    submitter: "0x222",
    title: "Move Builders Workshop",
    description: "Hands-on workshop for Move smart contract beginners.",
    category: "Workshop",
    imageUrl: "",
    eventUrl: "",
    startTimestamp: now - 3600,
    endTimestamp: now + 1800,
    isTba: false,
    status: "Live"
  }
];

let pendingEvents: PendingEventRecord[] = [
  {
    pendingId: "7",
    submitter: "0xabc",
    title: "Cedra Testnet Meetup",
    description: "Local meetup for Cedra builders and users.",
    category: "Meetup",
    imageUrl: "",
    eventUrl: "",
    startTimestamp: now + 172800,
    endTimestamp: now + 176400,
    isTba: false,
    escrowAmount: BigInt(100000000),
    submittedAt: now - 1200
  }
];

const DEFAULT_ESCROW = BigInt(100000000);

function recalculateStatuses(): void {
  const nowValue = Math.floor(Date.now() / 1000);
  events = events.map((event) => ({
    ...event,
    status: computeEventStatus(
      event.startTimestamp,
      event.endTimestamp,
      event.isTba,
      nowValue
    )
  }));
}

export function mockGetEvents(limit: number, offset: number): EventRecord[] {
  recalculateStatuses();
  return events.slice(offset, offset + limit);
}

export function mockGetUserEvents(
  userAddress: string,
  limit: number,
  offset: number
): EventRecord[] {
  recalculateStatuses();
  const byUser = events.filter(
    (event) => event.submitter.toLowerCase() === userAddress.toLowerCase()
  );
  return byUser.slice(offset, offset + limit);
}

export function mockGetUserPendingEvents(
  userAddress: string,
  limit: number,
  offset: number
): PendingEventRecord[] {
  const byUser = pendingEvents.filter(
    (event) => event.submitter.toLowerCase() === userAddress.toLowerCase()
  );
  return byUser.slice(offset, offset + limit);
}

export function mockGetFeeConfig() {
  return {
    minEscrowFee: DEFAULT_ESCROW,
    approvalFeePercent: 10,
    rejectionFeePercent: 1
  };
}

export function mockSubmitEvent(
  submitter: string,
  input: SubmitEventInput
): { hash: string } {
  const pendingId = (nextPendingId++).toString();
  pendingEvents = [
    {
      pendingId,
      submitter,
      title: input.title,
      description: input.description,
      category: input.category,
      imageUrl: input.imageUrl,
      eventUrl: input.eventUrl,
      startTimestamp: input.startTimestamp,
      endTimestamp: input.endTimestamp,
      isTba: input.isTba,
      escrowAmount: input.escrowAmount,
      submittedAt: Math.floor(Date.now() / 1000)
    },
    ...pendingEvents
  ];
  return { hash: `0xmocksubmit${pendingId}` };
}

export function mockCancelPendingEvent(
  submitter: string,
  pendingId: string
): { hash: string } {
  const candidate = pendingEvents.find((event) => event.pendingId === pendingId);
  if (!candidate) throw new Error("E_PENDING_EVENT_NOT_FOUND");
  if (candidate.submitter.toLowerCase() !== submitter.toLowerCase()) {
    throw new Error("E_NOT_SUBMITTER");
  }
  pendingEvents = pendingEvents.filter((event) => event.pendingId !== pendingId);
  return { hash: `0xmockcancelpending${pendingId}` };
}

export function mockCancelLiveEvent(
  submitter: string,
  eventId: string
): { hash: string } {
  const candidate = events.find((event) => event.id === eventId);
  if (!candidate) throw new Error("E_EVENT_NOT_FOUND");
  if (candidate.submitter.toLowerCase() !== submitter.toLowerCase()) {
    throw new Error("E_NOT_SUBMITTER");
  }
  events = events.filter((event) => event.id !== eventId);
  return { hash: `0xmockcancellive${eventId}` };
}

export function mockSubmitEditRequest(
  submitter: string,
  payload: EditRequestPayload
): { hash: string } {
  const candidate = events.find((event) => event.id === payload.eventId);
  if (!candidate) throw new Error("E_EVENT_NOT_FOUND");
  if (candidate.submitter.toLowerCase() !== submitter.toLowerCase()) {
    throw new Error("E_NOT_SUBMITTER");
  }

  events = events.map((event) => {
    if (event.id !== payload.eventId) return event;
    return {
      ...event,
      title: payload.newTitle,
      description: payload.newDescription,
      category: payload.newCategory,
      imageUrl: payload.newImageUrl,
      eventUrl: payload.newEventUrl,
      startTimestamp: payload.newStartTimestamp,
      endTimestamp: payload.newEndTimestamp,
      isTba: payload.newIsTba,
      status: computeEventStatus(
        payload.newStartTimestamp,
        payload.newEndTimestamp,
        payload.newIsTba
      )
    };
  });

  return { hash: `0xmockedit${nextEventId++}` };
}
