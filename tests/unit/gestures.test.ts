import { describe, expect, it } from "vitest";
import {
  lockIntent,
  pullProgress,
  resolveSwipe,
  startsInEdgeZone,
  swipeTuning,
} from "~/lib/gestures";

describe("startsInEdgeZone", () => {
  it("ignores touches that begin at either screen edge (system back gesture)", () => {
    expect(startsInEdgeZone(10, 390)).toBe(true);
    expect(startsInEdgeZone(385, 390)).toBe(true);
    expect(startsInEdgeZone(200, 390)).toBe(false);
    expect(startsInEdgeZone(swipeTuning.edgeGuard, 390)).toBe(false);
  });
});

describe("lockIntent", () => {
  it("waits until the finger has moved far enough to tell", () => {
    expect(lockIntent(4, 3)).toBeNull();
  });

  it("locks horizontal only for clearly sideways movement", () => {
    expect(lockIntent(30, 5)).toBe("horizontal");
    expect(lockIntent(-30, 10)).toBe("horizontal");
  });

  it("treats diagonal or vertical movement as scrolling", () => {
    expect(lockIntent(20, 18)).toBe("vertical");
    expect(lockIntent(3, 40)).toBe("vertical");
  });
});

describe("resolveSwipe", () => {
  it("commits only past 40% of the row width", () => {
    expect(resolveSwipe(160, 390)).toBe("right");
    expect(resolveSwipe(-160, 390)).toBe("left");
    expect(resolveSwipe(150, 400)).toBeNull();
    expect(resolveSwipe(-100, 390)).toBeNull();
  });

  it("never commits for a zero-width row", () => {
    expect(resolveSwipe(100, 0)).toBeNull();
  });
});

describe("pullProgress", () => {
  it("scales pull distance to 0–1 against the threshold", () => {
    expect(pullProgress(0)).toBe(0);
    expect(pullProgress(swipeTuning.pullThreshold / 2)).toBe(0.5);
    expect(pullProgress(swipeTuning.pullThreshold * 3)).toBe(1);
    expect(pullProgress(-20)).toBe(0);
  });
});
