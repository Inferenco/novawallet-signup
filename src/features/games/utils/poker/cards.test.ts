import { describe, expect, it } from "vitest";
import { decodeCard, getPipCount, getSuitColor, isAce, isFaceCard } from "./cards";

describe("poker card utilities", () => {
  it("decodes suit, rank, and color correctly", () => {
    expect(decodeCard(51)).toMatchObject({
      rankSymbol: "A",
      suitSymbol: "♠",
      suitName: "Spades",
      color: "black"
    });
  });

  it("returns red or black suit colors", () => {
    expect(getSuitColor(1)).toBe("red");
    expect(getSuitColor(3)).toBe("black");
  });

  it("detects pips, aces, and face cards correctly", () => {
    expect(getPipCount(8)).toBe(10);
    expect(isAce(12)).toBe(true);
    expect(isFaceCard(11)).toBe(true);
  });
});
