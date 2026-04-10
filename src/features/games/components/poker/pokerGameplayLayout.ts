import type { PokerLayoutMode } from "./pokerGameplayTypes";

interface LayoutModeInput {
  width: number;
  coarsePointer: boolean;
}

export interface PokerMobileViewportBuckets {
  widthBucket: "w360" | "w390" | "w430" | "wWide";
  heightBucket: "h760" | "h860" | "hTall";
  compact: boolean;
}

export function resolvePokerLayoutMode({
  width,
  coarsePointer
}: LayoutModeInput): PokerLayoutMode {
  if (width < 1024 || coarsePointer) {
    return "mobile";
  }
  return "desktop";
}

export function derivePokerMobileViewportBuckets(
  width: number,
  height: number
): PokerMobileViewportBuckets {
  const widthBucket =
    width <= 360 ? "w360" : width <= 390 ? "w390" : width <= 430 ? "w430" : "wWide";
  const heightBucket = height <= 760 ? "h760" : height <= 860 ? "h860" : "hTall";

  return {
    widthBucket,
    heightBucket,
    compact: width <= 390 || height <= 760
  };
}
