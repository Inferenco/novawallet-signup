import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import { useEventMutations } from "./useEventMutations";
import type { PropsWithChildren } from "react";

const submitEventMock = vi.fn();
const cancelPendingMock = vi.fn();
const cancelLiveMock = vi.fn();
const submitEditRequestMock = vi.fn();

vi.mock("@/providers/WalletProvider", () => ({
  useWallet: () => ({
    account: { address: { toString: () => "0xabc" } },
    networkMismatch: false,
    signAndSubmitTransaction: vi.fn()
  })
}));

vi.mock("@/services/events/write", () => ({
  submitEvent: (...args: unknown[]) => submitEventMock(...args),
  cancelPendingEvent: (...args: unknown[]) => cancelPendingMock(...args),
  cancelLiveEvent: (...args: unknown[]) => cancelLiveMock(...args),
  submitEditRequest: (...args: unknown[]) => submitEditRequestMock(...args)
}));

describe("useEventMutations", () => {
  it("invalidates event queries after successful submit", async () => {
    submitEventMock.mockResolvedValue({ hash: "0x1", explorerUrl: "https://example.com" });

    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useEventMutations(), { wrapper });

    await result.current.submitEventMutation.mutateAsync({
      escrowAmount: 100000000n,
      title: "Title",
      description: "Description",
      category: "Category",
      imageUrl: "",
      eventUrl: "",
      startTimestamp: 10,
      endTimestamp: 20,
      isTba: false
    });

    expect(invalidateSpy).toHaveBeenCalled();
  });
});
