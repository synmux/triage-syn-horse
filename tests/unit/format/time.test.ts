import { describe, expect, it } from "vitest";
import {
  formatDueDate,
  formatFullDateTime,
  formatShortDateTime,
  isOverdue,
  parseDueDateInput,
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

describe("due dates", () => {
  it("formats a calendar date without shifting the day", () => {
    const thisYear = new Date("2026-09-29T12:00:00Z");
    expect(formatDueDate("2026-10-05", thisYear)).toBe("Mon 5 Oct");
    expect(formatDueDate("2027-01-01", thisYear)).toBe("Fri, 1 Jan 2027");
  });

  it("knows when a due date has passed, counting today as not overdue", () => {
    const morning = new Date("2026-10-05T08:00:00+01:00");
    expect(isOverdue("2026-10-04", morning)).toBe(true);
    expect(isOverdue("2026-10-05", morning)).toBe(false);
    expect(isOverdue("2026-10-06", morning)).toBe(false);
  });

  it("accepts only real dates from the date picker", () => {
    expect(parseDueDateInput("2026-10-05")).toBe("2026-10-05");
    expect(() => parseDueDateInput("")).toThrow("Choose a date");
    expect(() => parseDueDateInput("2026-02-30")).toThrow("Choose a date");
    expect(() => parseDueDateInput("5/10/2026")).toThrow("Choose a date");
  });
});
