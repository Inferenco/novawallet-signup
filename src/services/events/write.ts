import { CHAIN_CONFIG } from "@/config/chain";
import { appEnv } from "@/config/env";
import { waitForTransaction } from "@/lib/cedraClient";
import { toU64String } from "@/lib/format";
import {
  mockCancelLiveEvent,
  mockCancelPendingEvent,
  mockSubmitEditRequest,
  mockSubmitEvent
} from "./mockStore";
import type {
  EditRequestPayload,
  SubmitEventInput,
  TxResult,
  WalletTxSubmitter
} from "./types";

function eventsFunction(functionName: string): `${string}::${string}::${string}` {
  return `${CHAIN_CONFIG.walletContractAddress}::events::${functionName}`;
}

function buildExplorerUrl(hash: string): string {
  return `${appEnv.explorerTxBaseUrl}/${hash}?network=${CHAIN_CONFIG.networkName}`;
}

export function buildSubmitEventPayload(input: SubmitEventInput) {
  return {
    function: eventsFunction("submit_event"),
    functionArguments: [
      input.escrowAmount.toString(),
      input.title,
      input.description,
      input.category,
      input.imageUrl,
      input.eventUrl,
      toU64String(input.isTba ? 0 : input.startTimestamp),
      toU64String(input.isTba ? 0 : input.endTimestamp),
      input.isTba
    ]
  };
}

export function buildCancelPendingPayload(pendingId: string) {
  return {
    function: eventsFunction("cancel_pending_event"),
    functionArguments: [toU64String(pendingId)]
  };
}

export function buildCancelLivePayload(eventId: string) {
  return {
    function: eventsFunction("cancel_live_event"),
    functionArguments: [toU64String(eventId)]
  };
}

export function buildEditRequestPayload(payload: EditRequestPayload) {
  return {
    function: eventsFunction("submit_edit_request"),
    functionArguments: [
      toU64String(payload.eventId),
      payload.newTitle,
      payload.newDescription,
      payload.newCategory,
      payload.newImageUrl,
      payload.newEventUrl,
      toU64String(payload.newIsTba ? 0 : payload.newStartTimestamp),
      toU64String(payload.newIsTba ? 0 : payload.newEndTimestamp),
      payload.newIsTba
    ]
  };
}

export async function submitEvent(
  wallet: WalletTxSubmitter,
  accountAddress: string,
  input: SubmitEventInput
): Promise<TxResult> {
  if (appEnv.mockChain) {
    const response = mockSubmitEvent(accountAddress, input);
    return { hash: response.hash, explorerUrl: buildExplorerUrl(response.hash) };
  }

  const response = await wallet.signAndSubmitTransaction({
    data: buildSubmitEventPayload(input)
  });
  await waitForTransaction(response.hash);
  return { hash: response.hash, explorerUrl: buildExplorerUrl(response.hash) };
}

export async function cancelPendingEvent(
  wallet: WalletTxSubmitter,
  accountAddress: string,
  pendingId: string
): Promise<TxResult> {
  if (appEnv.mockChain) {
    const response = mockCancelPendingEvent(accountAddress, pendingId);
    return { hash: response.hash, explorerUrl: buildExplorerUrl(response.hash) };
  }

  const response = await wallet.signAndSubmitTransaction({
    data: buildCancelPendingPayload(pendingId)
  });
  await waitForTransaction(response.hash);
  return { hash: response.hash, explorerUrl: buildExplorerUrl(response.hash) };
}

export async function cancelLiveEvent(
  wallet: WalletTxSubmitter,
  accountAddress: string,
  eventId: string
): Promise<TxResult> {
  if (appEnv.mockChain) {
    const response = mockCancelLiveEvent(accountAddress, eventId);
    return { hash: response.hash, explorerUrl: buildExplorerUrl(response.hash) };
  }

  const response = await wallet.signAndSubmitTransaction({
    data: buildCancelLivePayload(eventId)
  });
  await waitForTransaction(response.hash);
  return { hash: response.hash, explorerUrl: buildExplorerUrl(response.hash) };
}

export async function submitEditRequest(
  wallet: WalletTxSubmitter,
  accountAddress: string,
  payload: EditRequestPayload
): Promise<TxResult> {
  if (appEnv.mockChain) {
    const response = mockSubmitEditRequest(accountAddress, payload);
    return { hash: response.hash, explorerUrl: buildExplorerUrl(response.hash) };
  }

  const response = await wallet.signAndSubmitTransaction({
    data: buildEditRequestPayload(payload)
  });
  await waitForTransaction(response.hash);
  return { hash: response.hash, explorerUrl: buildExplorerUrl(response.hash) };
}
