/**
 * Snooze times, in the device's local time zone. Snoozing hides an issue
 * from the triage queue until the chosen time.
 */

export type SnoozePresetId =
  | "three-hours"
  | "tomorrow"
  | "next-week"
  | "next-month";

export interface SnoozePreset {
  id: SnoozePresetId;
  label: string;
  until: Date;
}

const morningHour = 9;
const datetimeLocalPattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

const atMorning = (year: number, monthIndex: number, day: number) =>
  new Date(year, monthIndex, day, morningHour, 0, 0, 0);

const daysInMonth = (year: number, monthIndex: number) =>
  new Date(year, monthIndex + 1, 0).getDate();

export function snoozePresets(now: Date): SnoozePreset[] {
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();

  const tomorrow = atMorning(year, month, day + 1);

  const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
  const nextMonday = atMorning(year, month, day + daysUntilMonday);

  const targetMonth = month + 1;
  const nextMonth = atMorning(
    year,
    targetMonth,
    Math.min(day, daysInMonth(year, targetMonth))
  );

  const presets: SnoozePreset[] = [
    {
      id: "three-hours",
      label: "In 3 hours",
      until: new Date(now.getTime() + 3 * 60 * 60 * 1000),
    },
    { id: "tomorrow", label: "Tomorrow", until: tomorrow },
    { id: "next-week", label: "Next Monday", until: nextMonday },
    { id: "next-month", label: "In a month", until: nextMonth },
  ];

  // On a Sunday, next Monday is tomorrow: keep only the first of any duplicates.
  return presets.filter(
    (preset, index) =>
      presets.findIndex(
        (other) => other.until.getTime() === preset.until.getTime()
      ) === index
  );
}

/** Parses an `<input type="datetime-local">` value, which must be in the future. */
export function parseCustomSnooze(value: string, now: Date): Date {
  const match = datetimeLocalPattern.exec(value);
  if (!match) {
    throw new Error("Choose a date and time");
  }
  const [year, month, day, hour, minute] = match.slice(1).map(Number) as [
    number,
    number,
    number,
    number,
    number,
  ];
  const until = new Date(year, month - 1, day, hour, minute);
  const roundTrips =
    until.getFullYear() === year &&
    until.getMonth() === month - 1 &&
    until.getDate() === day &&
    until.getHours() === hour &&
    until.getMinutes() === minute;
  if (!roundTrips) {
    throw new Error("Choose a date and time");
  }
  if (until.getTime() <= now.getTime()) {
    throw new Error("Choose a time in the future");
  }
  return until;
}
