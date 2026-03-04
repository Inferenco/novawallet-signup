import { describe, expect, it } from "vitest";
import { parsePokerError } from "./errors";

describe("parsePokerError", () => {
  it("maps known terms error", () => {
    const message = parsePokerError("E_TERMS_NOT_ACKNOWLEDGED(0x12)");
    expect(message.toLowerCase()).toContain("terms");
  });

  it("maps known insufficient fee error", () => {
    const message = parsePokerError("INSUFFICIENT_BALANCE_FOR_TRANSACTION_FEE");
    expect(message.toLowerCase()).toContain("gas");
  });

  it("returns fallback message for noisy errors", () => {
    const message = parsePokerError({ any: "value" });
    expect(typeof message).toBe("string");
    expect(message.length).toBeGreaterThan(0);
  });
});
