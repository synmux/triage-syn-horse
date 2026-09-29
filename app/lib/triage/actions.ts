/**
 * Triage action planners.
 *
 * A plan is plain data: the mutations to send, in order, each with enough
 * information to reverse it. Nothing here talks to the network; see
 * `executor.ts` for running a plan and producing its undo plan.
 */
import { formatShortDateTime } from "../format/time";
import type {
  IssueUpdateInput,
  Team,
  TriageIssue,
  WorkflowState,
} from "../linear/types";
import { estimationEnabled } from "./estimates";
import { acceptState, acceptTargets, declineState } from "./states";

/** A property an issue must have before it may be accepted. */
export type AcceptBlocker = "priority" | "estimate";

const blockerNames: Record<AcceptBlocker, string> = {
  estimate: "an estimate",
  priority: "a priority",
};

/** "a priority and an estimate": what is missing, in words. */
export function describeAcceptBlockers(missing: AcceptBlocker[]): string {
  return missing.map((blocker) => blockerNames[blocker]).join(" and ");
}

/** Accepting was refused because the issue is not ready yet. */
export class AcceptBlockedError extends Error {
  override name = "AcceptBlockedError";
  readonly missing: AcceptBlocker[];

  constructor(identifier: string, missing: AcceptBlocker[]) {
    super(
      `${identifier} needs ${describeAcceptBlockers(missing)} before it can be accepted`
    );
    this.missing = missing;
  }
}

/**
 * What an issue still needs before it may be accepted: always a priority,
 * and an estimate when the team uses estimates (otherwise one could never
 * be set). An estimate of zero counts.
 */
export function acceptBlockers(
  issue: Pick<TriageIssue, "priority" | "estimate">,
  team: Pick<
    Team,
    | "issueEstimationType"
    | "issueEstimationExtended"
    | "issueEstimationAllowZero"
  >
): AcceptBlocker[] {
  const missing: AcceptBlocker[] = [];
  if (issue.priority === 0) {
    missing.push("priority");
  }
  if (estimationEnabled(team) && issue.estimate === null) {
    missing.push("estimate");
  }
  return missing;
}

/** A forward step, with what is needed to reverse it. */
export type PlannedStep =
  | {
      kind: "updateIssue";
      issueId: string;
      input: IssueUpdateInput;
      /** The input that puts the touched fields back. */
      revert: IssueUpdateInput;
    }
  | { kind: "createComment"; issueId: string; body: string }
  | {
      kind: "createRelation";
      issueId: string;
      relatedIssueId: string;
      type: "duplicate";
      /** Applied after deleting the relation, because Linear moved the issue. */
      revert: IssueUpdateInput;
    };

/** A step that reverses part of an executed plan. */
export type UndoStep =
  | { kind: "updateIssue"; issueId: string; input: IssueUpdateInput }
  | { kind: "deleteComment"; commentId: string }
  | { kind: "deleteRelation"; relationId: string };

export type ActionKind =
  | "accept"
  | "decline"
  | "duplicate"
  | "snooze"
  | "unsnooze";

/** The four outcomes on the issue screen's action strip. */
export type StripAction = Exclude<ActionKind, "unsnooze">;

/** How the issue must still look for an undo to be safe. */
export interface Expectation {
  snoozedUntilAt?: string | null;
  stateId?: string;
}

export interface ActionPlan {
  /**
   * The expectation to check before undoing. Duplicate plans leave `stateId`
   * unset; the executor fills it from the state Linear moved the issue to.
   */
  expectation: Expectation;
  identifier: string;
  issueId: string;
  kind: ActionKind;
  /** Whether the issue leaves the (active) triage queue once done. */
  removesFromQueue: boolean;
  steps: PlannedStep[];
  /** Past tense, for toasts and the Recent list: "Accepted MYR-1 into Backlog". */
  summary: string;
}

type PlannableIssue = Pick<
  TriageIssue,
  | "id"
  | "identifier"
  | "priority"
  | "estimate"
  | "state"
  | "snoozedUntilAt"
  | "snoozedBy"
>;

const commentSteps = (
  issueId: string,
  comment: string | undefined
): PlannedStep[] => {
  const body = comment?.trim();
  return body ? [{ body, issueId, kind: "createComment" }] : [];
};

const moveStep = (issue: PlannableIssue, stateId: string): PlannedStep => ({
  input: { stateId },
  issueId: issue.id,
  kind: "updateIssue",
  revert: { stateId: issue.state.id },
});

export function planAccept(
  issue: PlannableIssue,
  team: Team,
  teamStates: WorkflowState[],
  options: { stateId?: string; comment?: string } = {}
): ActionPlan {
  const missing = acceptBlockers(issue, team);
  if (missing.length > 0) {
    throw new AcceptBlockedError(issue.identifier, missing);
  }
  let target = acceptState(team, teamStates);
  if (options.stateId) {
    const chosen = teamStates.find((state) => state.id === options.stateId);
    const allowed = acceptTargets(team, teamStates);
    if (!(chosen && allowed.some((state) => state.id === chosen.id))) {
      throw new Error(
        `${chosen?.name ?? "That state"} is not a state ${issue.identifier} can be accepted into`
      );
    }
    target = chosen;
  }

  return {
    expectation: { stateId: target.id },
    identifier: issue.identifier,
    issueId: issue.id,
    kind: "accept",
    removesFromQueue: true,
    steps: [
      ...commentSteps(issue.id, options.comment),
      moveStep(issue, target.id),
    ],
    summary: `Accepted ${issue.identifier} into ${target.name}`,
  };
}

export function planDecline(
  issue: PlannableIssue,
  team: Team,
  teamStates: WorkflowState[],
  options: { comment?: string } = {}
): ActionPlan {
  const target = declineState(team, teamStates);
  return {
    expectation: { stateId: target.id },
    identifier: issue.identifier,
    issueId: issue.id,
    kind: "decline",
    removesFromQueue: true,
    steps: [
      ...commentSteps(issue.id, options.comment),
      moveStep(issue, target.id),
    ],
    summary: `Declined ${issue.identifier}`,
  };
}

export function planDuplicate(
  issue: PlannableIssue,
  canonical: { id: string; identifier: string }
): ActionPlan {
  if (canonical.id === issue.id) {
    throw new Error("An issue cannot be a duplicate of itself");
  }
  return {
    expectation: {},
    identifier: issue.identifier,
    issueId: issue.id,
    kind: "duplicate",
    removesFromQueue: true,
    steps: [
      {
        issueId: issue.id,
        kind: "createRelation",
        relatedIssueId: canonical.id,
        revert: { stateId: issue.state.id },
        type: "duplicate",
      },
    ],
    summary: `Marked ${issue.identifier} as a duplicate of ${canonical.identifier}`,
  };
}

const previousSnooze = (issue: PlannableIssue): IssueUpdateInput => ({
  snoozedById: issue.snoozedBy?.id ?? null,
  snoozedUntilAt: issue.snoozedUntilAt,
});

export function planSnooze(
  issue: PlannableIssue,
  until: Date,
  viewerId: string
): ActionPlan {
  const snoozedUntilAt = until.toISOString();
  return {
    expectation: { snoozedUntilAt },
    identifier: issue.identifier,
    issueId: issue.id,
    kind: "snooze",
    removesFromQueue: true,
    steps: [
      {
        input: { snoozedById: viewerId, snoozedUntilAt },
        issueId: issue.id,
        kind: "updateIssue",
        revert: previousSnooze(issue),
      },
    ],
    summary: `Snoozed ${issue.identifier} until ${formatShortDateTime(until)}`,
  };
}

export function planUnsnooze(issue: PlannableIssue): ActionPlan {
  return {
    expectation: { snoozedUntilAt: null },
    identifier: issue.identifier,
    issueId: issue.id,
    kind: "unsnooze",
    removesFromQueue: false,
    steps: [
      {
        input: { snoozedById: null, snoozedUntilAt: null },
        issueId: issue.id,
        kind: "updateIssue",
        revert: previousSnooze(issue),
      },
    ],
    summary: `Unsnoozed ${issue.identifier}`,
  };
}
