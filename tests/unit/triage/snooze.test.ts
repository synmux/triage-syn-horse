import { describe, expect, it } from "vitest";
import { parseCustomSnooze, snoozePresets } from "~/lib/triage/snooze";

// Tests run with TZ=Europe/London (see vitest.config.ts).
const tuesdayEarly = new Date("2026-09-29T04:18:00+01:00");

const presetMap = (now: Date) =>
  Object.fromEntries(
    snoozePresets(now).map((preset) => [preset.id, preset.until.toISOString()])
  );

describe("snoozePresets", () => {
  it("offers three hours, tomorrow morning, next Monday and a month", () => {
    expect(snoozePresets(tuesdayEarly).map((preset) => preset.label)).toEqual([
      "In 3 hours",
      "Tomorrow",
      "Next Monday",
      "In a month",
    ]);
    expect(presetMap(tuesdayEarly)).toEqual({
      "next-month": "2026-10-29T09:00:00.000Z", // GMT after the clocks change
      "next-week": "2026-10-05T08:00:00.000Z",
      "three-hours": "2026-09-29T06:18:00.000Z",
      tomorrow: "2026-09-30T08:00:00.000Z",
    });
  });

  it("treats next Monday as a full week away on a Monday", () => {
    const monday = new Date("2026-10-05T12:00:00+01:00");
    expect(presetMap(monday)["next-week"]).toBe("2026-10-12T08:00:00.000Z");
  });

  it("drops next Monday on a Sunday because it would duplicate tomorrow", () => {
    const sunday = new Date("2026-10-04T12:00:00+01:00");
    expect(snoozePresets(sunday).map((preset) => preset.id)).toEqual([
      "three-hours",
      "tomorrow",
      "next-month",
    ]);
  });

  it("clamps a month from the 31st to the end of a shorter month", () => {
    const endOfJanuary = new Date("2027-01-31T10:00:00Z");
    expect(presetMap(endOfJanuary)["next-month"]).toBe(
      "2027-02-28T09:00:00.000Z"
    );
  });
});

describe("parseCustomSnooze", () => {
  it("reads a datetime-local value in local time", () => {
    expect(
      parseCustomSnooze("2026-09-30T10:30", tuesdayEarly).toISOString()
    ).toBe("2026-09-30T09:30:00.000Z");
  });

  it("rejects times that are not in the future", () => {
    expect(() => parseCustomSnooze("2026-09-29T04:00", tuesdayEarly)).toThrow(
      "Choose a time in the future"
    );
  });

  it("rejects malformed values", () => {
    expect(() => parseCustomSnooze("", tuesdayEarly)).toThrow(
      "Choose a date and time"
    );
    expect(() => parseCustomSnooze("2026-13-45T99:99", tuesdayEarly)).toThrow(
      "Choose a date and time"
    );
  });
});
