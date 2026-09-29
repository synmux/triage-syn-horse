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
