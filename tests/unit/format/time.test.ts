import { describe, expect, it } from "vitest";
import {
  formatFullDateTime,
  formatShortDateTime,
  relativeAge,
} from "~/lib/format/time";

const now = new Date("2026-09-29T04:18:00Z");
const ago = (milliseconds: number) => new Date(now.getTime() - milliseconds);
const minutes = (count: number) => count * 60 * 1000;
const hours = (count: number) => minutes(count * 60);
const days = (count: number) => hours(count * 24);

describe("relativeAge", () => {
  it.each([
    [0, "now"],
    [minutes(0.5), "now"],
    [minutes(5), "5m"],
    [minutes(59), "59m"],
    [hours(3), "3h"],
    [days(2), "2d"],
    [days(6), "6d"],
    [days(21), "3w"],
    [days(125), "4mo"],
    [days(800), "2y"],
  ])("shows %i ms as %s", (elapsed, expected) => {
    expect(relativeAge(ago(elapsed), now)).toBe(expected);
  });

  it("treats future dates as now", () => {
    expect(relativeAge(new Date(now.getTime() + hours(1)), now)).toBe("now");
  });
});

describe("date formatting", () => {
  it("formats short and full dates in UK English", () => {
    const date = new Date("2026-09-30T08:00:00Z");
    expect(formatShortDateTime(date)).toBe("Wed 30 Sept, 09:00");
    expect(formatFullDateTime(date)).toBe("30 Sept 2026, 09:00");
  });
});
