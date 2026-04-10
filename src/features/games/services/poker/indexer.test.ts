import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../config/games", () => ({
  getGameContract: () => ({ address: "0xabc" })
}));

vi.mock("@/config/chain", () => ({
  CHAIN_CONFIG: {
    gamesIndexerUrl: "https://indexer.test/graphql"
  }
}));

import { fetchHandResultForHand, fetchHandResults, fetchHoleCardsRevealedEvents } from "./indexer";

describe("poker indexer hand result helpers", () => {
  const fetchMock = vi.fn();
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    consoleErrorSpy.mockRestore();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("returns the exact hand result for the requested table and hand number", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          events: [
            {
              type: "hand_result",
              transaction_version: "11",
              data: {
                table_addr: "0x1",
                hand_number: "2",
                timestamp: "100",
                result_type: "0",
                community_cards: "[1,2,3]",
                showdown_seats: ["0"],
                showdown_players: ["0xaaa"],
                showdown_hole_cards: ["[10,11]"],
                showdown_hand_types: ["1"],
                winner_seats: ["0"],
                winner_players: ["0xaaa"],
                winner_amounts: ["40"],
                total_pot: "40"
              }
            },
            {
              type: "hand_result",
              transaction_version: "12",
              data: {
                table_addr: "0x1",
                hand_number: "3",
                timestamp: "101",
                result_type: "0",
                community_cards: "[4,5,6,7,8]",
                showdown_seats: ["0", "1"],
                showdown_players: ["0xaaa", "0xbbb"],
                showdown_hole_cards: ["[12,13]", "[14,15]"],
                showdown_hand_types: ["2", "3"],
                winner_seats: ["1"],
                winner_players: ["0xbbb"],
                winner_amounts: ["50"],
                total_pot: "50"
              }
            }
          ]
        }
      })
    });

    const event = await fetchHandResultForHand("testnet", "0x1", 3);

    expect(event).not.toBeNull();
    expect(event?.handNumber).toBe(3);
    expect(event?.communityCards).toEqual([4, 5, 6, 7, 8]);
    expect(event?.showdownHoleCards).toEqual([
      [12, 13],
      [14, 15]
    ]);
  });

  it("returns the newest exact-hand result when duplicate hand events exist", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          events: [
            {
              type: "hand_result",
              transaction_version: "12",
              data: {
                table_addr: "0x1",
                hand_number: "3",
                timestamp: "100",
                result_type: "0",
                community_cards: "[1,2,3,4,5]",
                showdown_seats: ["0"],
                showdown_players: ["0xaaa"],
                showdown_hole_cards: ["[10,11]"],
                showdown_hand_types: ["1"],
                winner_seats: ["0"],
                winner_players: ["0xaaa"],
                winner_amounts: ["40"],
                total_pot: "40"
              }
            },
            {
              type: "hand_result",
              transaction_version: "14",
              data: {
                table_addr: "0x1",
                hand_number: "3",
                timestamp: "101",
                result_type: "0",
                community_cards: "[6,7,8,9,10]",
                showdown_seats: ["1"],
                showdown_players: ["0xbbb"],
                showdown_hole_cards: ["[12,13]"],
                showdown_hand_types: ["2"],
                winner_seats: ["1"],
                winner_players: ["0xbbb"],
                winner_amounts: ["50"],
                total_pot: "50"
              }
            }
          ]
        }
      })
    });

    const event = await fetchHandResultForHand("testnet", "0x1", 3);

    expect(event?.transactionVersion).toBe(14);
    expect(event?.communityCards).toEqual([6, 7, 8, 9, 10]);
  });

  it("sorts hand results newest-first after parsing", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          events: [
            {
              type: "hand_result",
              transaction_version: "9",
              data: {
                table_addr: "0x1",
                hand_number: "1",
                timestamp: "99",
                result_type: "1",
                community_cards: "0x0102",
                showdown_seats: [],
                showdown_players: [],
                showdown_hole_cards: [],
                showdown_hand_types: [],
                winner_seats: ["0"],
                winner_players: ["0xaaa"],
                winner_amounts: ["10"],
                total_pot: "10"
              }
            },
            {
              type: "hand_result",
              transaction_version: "10",
              data: {
                table_addr: "0x1",
                hand_number: "4",
                timestamp: "102",
                result_type: "0",
                community_cards: "0x030405",
                showdown_seats: [],
                showdown_players: [],
                showdown_hole_cards: [],
                showdown_hand_types: [],
                winner_seats: ["0"],
                winner_players: ["0xaaa"],
                winner_amounts: ["20"],
                total_pot: "20"
              }
            }
          ]
        }
      })
    });

    const events = await fetchHandResults("testnet", "0x1", 10);

    expect(events.map((event) => event.handNumber)).toEqual([4, 1]);
    expect(events[0].communityCards).toEqual([3, 4, 5]);
  });

  it("filters and parses revealed hole card events for the exact hand", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          events: [
            {
              type: "hole_cards_revealed",
              transaction_version: "20",
              data: {
                table_addr: "0x1",
                hand_number: "3",
                timestamp: "200",
                seat_idx: "1",
                player: "0xbbb",
                hole_cards: "[12,13]"
              }
            },
            {
              type: "hole_cards_revealed",
              transaction_version: "21",
              data: {
                table_addr: "0x2",
                hand_number: "3",
                timestamp: "201",
                seat_idx: "2",
                player: "0xccc",
                hole_cards: "[14,15]"
              }
            }
          ]
        }
      })
    });

    const events = await fetchHoleCardsRevealedEvents("testnet", "0x1", 3);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      tableAddress: "0x1",
      handNumber: 3,
      transactionVersion: 20,
      seatIdx: 1,
      player: "0xbbb",
      holeCards: [12, 13]
    });
  });

  it("returns null for hand results when the indexer request fails", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));

    await expect(fetchHandResultForHand("testnet", "0x1", 3)).resolves.toBeNull();
  });

  it("returns revealed events as an empty list when the indexer request fails", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));

    await expect(fetchHoleCardsRevealedEvents("testnet", "0x1", 3)).resolves.toEqual([]);
  });

  it("times out hand-result lookups and degrades to null", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation((_input, init) => {
      const signal = (init as RequestInit | undefined)?.signal as AbortSignal;
      return new Promise((_resolve, reject) => {
        signal?.addEventListener("abort", () => {
          const error = new Error("aborted");
          error.name = "AbortError";
          reject(error);
        });
      });
    });

    const pending = fetchHandResultForHand("testnet", "0x1", 3);

    await vi.advanceTimersByTimeAsync(3000);

    await expect(pending).resolves.toBeNull();
  });

  it("times out reveal-event lookups and degrades to an empty list", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation((_input, init) => {
      const signal = (init as RequestInit | undefined)?.signal as AbortSignal;
      return new Promise((_resolve, reject) => {
        signal?.addEventListener("abort", () => {
          const error = new Error("aborted");
          error.name = "AbortError";
          reject(error);
        });
      });
    });

    const pending = fetchHoleCardsRevealedEvents("testnet", "0x1", 3);

    await vi.advanceTimersByTimeAsync(2000);

    await expect(pending).resolves.toEqual([]);
  });
});
