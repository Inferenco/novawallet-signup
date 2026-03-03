import { computeEventStatus, toU64String } from "./format";

describe("format helpers", () => {
  it("computes Live status for active event", () => {
    expect(computeEventStatus(100, 200, false, 150)).toBe("Live");
  });

  it("computes Upcoming status for future event", () => {
    expect(computeEventStatus(100, 200, false, 99)).toBe("Upcoming");
  });

  it("computes Past status for ended event", () => {
    expect(computeEventStatus(100, 200, false, 201)).toBe("Past");
  });

  it("computes TBA status when marked TBA", () => {
    expect(computeEventStatus(100, 200, true, 150)).toBe("TBA");
  });

  it("normalizes u64 values", () => {
    expect(toU64String(12n)).toBe("12");
    expect(toU64String(45)).toBe("45");
    expect(toU64String("99")).toBe("99");
  });
});
