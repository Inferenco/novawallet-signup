import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useGamesNetwork } from "./useGamesNetwork";

vi.mock("@/providers/WalletProvider", () => ({
  useWallet: () => ({
    network: { name: "devnet" }
  })
}));

describe("useGamesNetwork", () => {
  it("uses the configured app network instead of the wallet-reported network", () => {
    const { result } = renderHook(() => useGamesNetwork());

    expect(result.current).toBe("testnet");
  });
});
