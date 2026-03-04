import { describe, expect, it } from "vitest";
import { isEmptyAddress, normalizeAddress } from "./address";

describe("games address utils", () => {
  it("normalizes padded addresses", () => {
    expect(
      normalizeAddress(
        "0x00000000000000000000000000000000000000000000000000000000000000ab"
      )
    ).toBe("0xab");
  });

  it("normalizes zero-address to 0x0", () => {
    expect(normalizeAddress("0x0000")).toBe("0x0");
  });

  it("detects empty/zero addresses", () => {
    expect(isEmptyAddress("0x0")).toBe(true);
    expect(isEmptyAddress("0x000000")).toBe(true);
    expect(isEmptyAddress("0x123")).toBe(false);
  });
});
