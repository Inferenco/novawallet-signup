import { describe, expect, it, vi } from "vitest";

const callViewMock = vi.fn();

vi.mock("./client", () => ({
  callView: (...args: unknown[]) => callViewMock(...args)
}));

import { getLastHandResult } from "./views";

describe("poker views hand result helpers", () => {
  it("maps a stored last-hand-result tuple into the frontend DTO", async () => {
    callViewMock.mockResolvedValueOnce([
      true,
      "12",
      1,
      "123456789",
      "0x010203",
      ["0", 1],
      ["0xabc", "0xdef"],
      ["0x0a0b", "0x0c0d"],
      "0x0405",
      ["1"],
      ["0xdef"],
      ["250"],
      "250",
      "0"
    ]);

    await expect(getLastHandResult("testnet", "0x1")).resolves.toEqual({
      exists: true,
      handNumber: 12,
      resultType: 1,
      timestamp: 123456789,
      communityCards: [1, 2, 3],
      showdownSeats: [0, 1],
      showdownPlayers: ["0xabc", "0xdef"],
      showdownHoleCards: [[10, 11], [12, 13]],
      showdownHandTypes: [4, 5],
      winnerSeats: [1],
      winnerPlayers: ["0xdef"],
      winnerAmounts: [250],
      totalPot: 250,
      totalFees: 0
    });
  });

  it("accepts JSON-array encoded vectors from fallback payloads", async () => {
    callViewMock.mockResolvedValueOnce([
      true,
      "2",
      "0",
      "123",
      "[28,44,29,39,19]",
      ["0", "1"],
      ["0xabc", "0xdef"],
      ["[50,4]", "[13,2]"],
      "[4,2]",
      ["0"],
      ["0xabc"],
      ["66"],
      "66",
      "0"
    ]);

    await expect(getLastHandResult("testnet", "0x1")).resolves.toEqual({
      exists: true,
      handNumber: 2,
      resultType: 0,
      timestamp: 123,
      communityCards: [28, 44, 29, 39, 19],
      showdownSeats: [0, 1],
      showdownPlayers: ["0xabc", "0xdef"],
      showdownHoleCards: [[50, 4], [13, 2]],
      showdownHandTypes: [4, 2],
      winnerSeats: [0],
      winnerPlayers: ["0xabc"],
      winnerAmounts: [66],
      totalPot: 66,
      totalFees: 0
    });
  });

  it("returns a clean empty result when no stored hand exists", async () => {
    callViewMock.mockResolvedValueOnce([
      false,
      0,
      0,
      0,
      [],
      [],
      [],
      [],
      [],
      [],
      [],
      [],
      0,
      0
    ]);

    await expect(getLastHandResult("testnet", "0x1")).resolves.toEqual({
      exists: false,
      handNumber: 0,
      resultType: 0,
      timestamp: 0,
      communityCards: [],
      showdownSeats: [],
      showdownPlayers: [],
      showdownHoleCards: [],
      showdownHandTypes: [],
      winnerSeats: [],
      winnerPlayers: [],
      winnerAmounts: [],
      totalPot: 0,
      totalFees: 0
    });
  });
});
