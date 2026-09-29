/**
 * Date and time formatting in UK English, in the device's time zone.
 */

const shortDateTime = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  weekday: "short",
});

const fullDateTime = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  year: "numeric",
});

/** "Wed 30 Sept, 09:00": for snooze targets and other near-future times. */
export function formatShortDateTime(date: Date): string {
  return shortDateTime.format(date);
}

/** "29 Sept 2026, 04:18": for tooltips and accessible labels. */
export function formatFullDateTime(date: Date): string {
  return fullDateTime.format(date);
}

const dueDateThisYear = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  weekday: "short",
});

const dueDateOtherYear = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  weekday: "short",
  year: "numeric",
});

const calendarDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A Linear due date ("YYYY-MM-DD", no time zone) as a local calendar date. */
function calendarDate(value: string): Date | null {
  const match = calendarDatePattern.exec(value);
  if (!match) {
    return null;
  }
  const [year, month, day] = match.slice(1).map(Number) as [
    number,
    number,
    number,
  ];
  const date = new Date(year, month - 1, day);
  const real =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;
  return real ? date : null;
}

/** "Mon 5 Oct", with the year when it isn't this year. */
export function formatDueDate(value: string, now: Date = new Date()): string {
  const date = calendarDate(value);
  if (!date) {
    return value;
  }
  return date.getFullYear() === now.getFullYear()
    ? dueDateThisYear.format(date)
    : dueDateOtherYear.format(date);
}

/** True once the due date's day has ended; the due day itself is not overdue. */
export function isOverdue(value: string, now: Date): boolean {
  const date = calendarDate(value);
  if (!date) {
    return false;
  }
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return date.getTime() < today.getTime();
}

/** Checks an `<input type="date">` value and returns it as Linear expects. */
export function parseDueDateInput(value: string): string {
  if (!calendarDate(value)) {
    throw new Error("Choose a date");
  }
  return value;
}

const minute = 60 * 1000;
const hour = 60 * minute;
const day = 24 * hour;
const week = 7 * day;
const month = 30 * day;
const year = 365 * day;

/** Compact age like Linear's lists: "now", "5m", "3h", "2d", "3w", "4mo", "2y". */
export function relativeAge(date: Date, now: Date): string {
  const elapsed = Math.max(0, now.getTime() - date.getTime());
  if (elapsed < minute) {
    return "now";
  }
  if (elapsed < hour) {
    return `${Math.floor(elapsed / minute)}m`;
  }
  if (elapsed < day) {
    return `${Math.floor(elapsed / hour)}h`;
  }
  if (elapsed < week) {
    return `${Math.floor(elapsed / day)}d`;
  }
  if (elapsed < month) {
    return `${Math.floor(elapsed / week)}w`;
  }
  if (elapsed < year) {
    return `${Math.floor(elapsed / month)}mo`;
  }
  return `${Math.floor(elapsed / year)}y`;
}
