import { describe, expect, it } from "vitest";
import {
  countsByTeam,
  isSnoozed,
  neighbours,
  nextAfterRemoval,
  visibleQueue,
} from "~/lib/triage/queue";
import { makeIssue } from "../../support/factories";

const now = new Date("2026-09-29T04:00:00Z");

const issues = [
  makeIssue({
    createdAt: "2026-09-20T10:00:00Z",
    id: "a",
    identifier: "MYR-1",
  }),
  makeIssue({
    createdAt: "2026-09-25T10:00:00Z",
    id: "b",
    identifier: "SHS-7",
    team: { id: "team-shs" },
  }),
  makeIssue({
    createdAt: "2026-09-25T10:00:00Z",
    id: "c",
    identifier: "MYR-2",
  }),
  makeIssue({
    createdAt: "2026-09-27T10:00:00Z",
    id: "snoozed",
    identifier: "MYR-3",
    snoozedUntilAt: "2026-09-30T08:00:00Z",
  }),
  makeIssue({
    createdAt: "2026-09-10T10:00:00Z",
    id: "woken",
    identifier: "MYR-0",
    snoozedUntilAt: "2026-09-28T08:00:00Z",
  }),
];

const ids = (list: { id: string }[]) => list.map((issue) => issue.id);

describe("isSnoozed", () => {
  it("is true only while the snooze time is in the future", () => {
    expect(isSnoozed({ snoozedUntilAt: "2026-09-30T08:00:00Z" }, now)).toBe(
      true
    );
    expect(isSnoozed({ snoozedUntilAt: "2026-09-28T08:00:00Z" }, now)).toBe(
      false
    );
    expect(isSnoozed({ snoozedUntilAt: null }, now)).toBe(false);
  });
});

describe("visibleQueue", () => {
  it("shows newest first, hides snoozed issues and breaks ties by identifier", () => {
    expect(
      ids(
        visibleQueue(issues, {
          now,
          order: "newest",
          teamId: null,
          view: "active",
        })
      )
    ).toEqual(["c", "b", "a", "woken"]);
  });

  it("shows oldest first on request", () => {
    expect(
      ids(
        visibleQueue(issues, {
          now,
          order: "oldest",
          teamId: null,
          view: "active",
        })
      )
    ).toEqual(["woken", "a", "c", "b"]);
  });

  it("filters to one team", () => {
    expect(
      ids(
        visibleQueue(issues, {
          now,
          order: "newest",
          teamId: "team-shs",
          view: "active",
        })
      )
    ).toEqual(["b"]);
  });

  it("lists only snoozed issues, soonest to wake first, in the snoozed view", () => {
    const laterSnooze = makeIssue({
      id: "later",
      identifier: "MYR-9",
      snoozedUntilAt: "2026-10-05T08:00:00Z",
    });
    expect(
      ids(
        visibleQueue([laterSnooze, ...issues], {
          now,
          order: "newest",
          teamId: null,
          view: "snoozed",
        })
      )
    ).toEqual(["snoozed", "later"]);
  });
});

describe("countsByTeam", () => {
  it("counts active and snoozed issues per team and in total", () => {
    expect(countsByTeam(issues, now)).toEqual({
      active: { all: 4, byTeam: { "team-myr": 3, "team-shs": 1 } },
      snoozed: { all: 1, byTeam: { "team-myr": 1 } },
    });
  });
});

describe("neighbours", () => {
  const queue = [{ id: "a" }, { id: "b" }, { id: "c" }];

  it("finds the previous and next issue and the 1-based position", () => {
    expect(neighbours(queue, "b")).toEqual({
      nextId: "c",
      position: 2,
      previousId: "a",
    });
    expect(neighbours(queue, "a")).toEqual({
      nextId: "b",
      position: 1,
      previousId: null,
    });
    expect(neighbours(queue, "c")).toEqual({
      nextId: null,
      position: 3,
      previousId: "b",
    });
  });

  it("returns nulls for an issue that is not in the queue", () => {
    expect(neighbours(queue, "zzz")).toEqual({
      nextId: null,
      position: null,
      previousId: null,
    });
  });
});

describe("nextAfterRemoval", () => {
  const queue = [{ id: "a" }, { id: "b" }, { id: "c" }];

  it("moves on to the following issue, or the previous one at the end", () => {
    expect(nextAfterRemoval(queue, "a")).toBe("b");
    expect(nextAfterRemoval(queue, "b")).toBe("c");
    expect(nextAfterRemoval(queue, "c")).toBe("b");
  });

  it("returns null when nothing is left or the issue is unknown", () => {
    expect(nextAfterRemoval([{ id: "a" }], "a")).toBeNull();
    expect(nextAfterRemoval(queue, "zzz")).toBeNull();
  });
});
