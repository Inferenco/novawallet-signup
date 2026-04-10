import { describe, expect, it } from "vitest";
import {
  derivePokerMobileViewportBuckets,
  resolvePokerLayoutMode
} from "./pokerGameplayLayout";

describe("poker gameplay layout selection", () => {
  it("uses mobile layout below desktop width", () => {
    expect(resolvePokerLayoutMode({ width: 390, coarsePointer: false })).toBe("mobile");
  });

  it("uses mobile layout for coarse pointers even at wide widths", () => {
    expect(resolvePokerLayoutMode({ width: 1280, coarsePointer: true })).toBe("mobile");
  });

  it("uses desktop layout for wide fine-pointer screens", () => {
    expect(resolvePokerLayoutMode({ width: 1280, coarsePointer: false })).toBe("desktop");
  });
});

describe("poker mobile viewport buckets", () => {
  it("marks small phones as compact", () => {
    expect(derivePokerMobileViewportBuckets(360, 760)).toEqual({
      widthBucket: "w360",
      heightBucket: "h760",
      compact: true
    });
  });

  it("keeps taller/wider phones out of compact mode", () => {
    expect(derivePokerMobileViewportBuckets(430, 844)).toEqual({
      widthBucket: "w430",
      heightBucket: "h860",
      compact: false
    });
  });
});
