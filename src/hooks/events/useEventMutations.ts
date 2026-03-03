import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@/providers/WalletProvider";
import {
  cancelLiveEvent,
  cancelPendingEvent,
  submitEditRequest,
  submitEvent
} from "@/services/events/write";
import type { EditRequestPayload, SubmitEventInput } from "@/services/events/types";
import { eventsQueryKeys } from "./queryKeys";

function requireAccountAddress(address: string | undefined): string {
  if (!address) {
    throw new Error("Connect your wallet before submitting a transaction.");
  }
  return address;
}

export function useEventMutations() {
  const wallet = useWallet();
  const queryClient = useQueryClient();
  const address = wallet.account?.address?.toString();

  const invalidateEventQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: eventsQueryKeys.all }),
      queryClient.invalidateQueries({ queryKey: eventsQueryKeys.fees() })
    ]);
  };

  const submitEventMutation = useMutation({
    mutationFn: async (input: SubmitEventInput) => {
      if (wallet.networkMismatch) {
        throw new Error("Switch wallet network to Cedra Testnet.");
      }
      return submitEvent(wallet, requireAccountAddress(address), input);
    },
    onSuccess: invalidateEventQueries
  });

  const cancelPendingMutation = useMutation({
    mutationFn: async (pendingId: string) => {
      if (wallet.networkMismatch) {
        throw new Error("Switch wallet network to Cedra Testnet.");
      }
      return cancelPendingEvent(wallet, requireAccountAddress(address), pendingId);
    },
    onSuccess: invalidateEventQueries
  });

  const cancelLiveMutation = useMutation({
    mutationFn: async (eventId: string) => {
      if (wallet.networkMismatch) {
        throw new Error("Switch wallet network to Cedra Testnet.");
      }
      return cancelLiveEvent(wallet, requireAccountAddress(address), eventId);
    },
    onSuccess: invalidateEventQueries
  });

  const submitEditRequestMutation = useMutation({
    mutationFn: async (payload: EditRequestPayload) => {
      if (wallet.networkMismatch) {
        throw new Error("Switch wallet network to Cedra Testnet.");
      }
      return submitEditRequest(wallet, requireAccountAddress(address), payload);
    },
    onSuccess: invalidateEventQueries
  });

  return {
    submitEventMutation,
    cancelPendingMutation,
    cancelLiveMutation,
    submitEditRequestMutation
  };
}
