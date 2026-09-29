/**
 * Pure queue maths: which triage issues are visible, in what order, and
 * where to go after acting on one.
 */
import type { TriageIssue } from "../linear/types";

export type QueueOrder = "newest" | "oldest";
export type QueueView = "active" | "snoozed";

export interface QueueFilter {
  now: Date;
  order: QueueOrder;
  teamId: string | null;
  view: QueueView;
}

type Snoozable = Pick<TriageIssue, "snoozedUntilAt">;
type Sortable = Pick<
  TriageIssue,
  "id" | "identifier" | "createdAt" | "snoozedUntilAt" | "team"
>;

export function isSnoozed(issue: Snoozable, now: Date): boolean {
  return (
    issue.snoozedUntilAt !== null &&
    new Date(issue.snoozedUntilAt).getTime() > now.getTime()
  );
}

const timeOf = (isoDate: string | null) =>
  isoDate === null ? 0 : new Date(isoDate).getTime();

export function visibleQueue<TIssue extends Sortable>(
  issues: TIssue[],
  filter: QueueFilter
): TIssue[] {
  const inView = issues.filter(
    (issue) =>
      (filter.teamId === null || issue.team.id === filter.teamId) &&
      isSnoozed(issue, filter.now) === (filter.view === "snoozed")
  );

  const direction = filter.order === "newest" ? -1 : 1;
  return inView.sort((first, second) => {
    const primary =
      filter.view === "snoozed"
        ? timeOf(first.snoozedUntilAt) - timeOf(second.snoozedUntilAt)
        : direction * (timeOf(first.createdAt) - timeOf(second.createdAt));
    return (
      primary ||
      first.identifier.localeCompare(second.identifier, "en-GB", {
        numeric: true,
      })
    );
  });
}

export interface QueueCounts {
  active: { all: number; byTeam: Record<string, number> };
  snoozed: { all: number; byTeam: Record<string, number> };
}

export function countsByTeam(issues: Sortable[], now: Date): QueueCounts {
  const counts: QueueCounts = {
    active: { all: 0, byTeam: {} },
    snoozed: { all: 0, byTeam: {} },
  };
  for (const issue of issues) {
    const bucket = isSnoozed(issue, now) ? counts.snoozed : counts.active;
    bucket.all += 1;
    bucket.byTeam[issue.team.id] = (bucket.byTeam[issue.team.id] ?? 0) + 1;
  }
  return counts;
}

export interface Neighbours {
  nextId: string | null;
  /** 1-based position in the queue, or null when the issue is not in it. */
  position: number | null;
  previousId: string | null;
}

export function neighbours(queue: { id: string }[], id: string): Neighbours {
  const index = queue.findIndex((issue) => issue.id === id);
  if (index === -1) {
    return { nextId: null, position: null, previousId: null };
  }
  return {
    nextId: queue[index + 1]?.id ?? null,
    position: index + 1,
    previousId: queue[index - 1]?.id ?? null,
  };
}

/** After acting on `removedId`, the issue to show next: the following one, else the previous. */
export function nextAfterRemoval(
  queue: { id: string }[],
  removedId: string
): string | null {
  const { nextId, previousId, position } = neighbours(queue, removedId);
  if (position === null) {
    return null;
  }
  return nextId ?? previousId;
}
