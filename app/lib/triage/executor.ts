/**
 * Runs action plans against Linear and produces serialisable undo plans.
 *
 * Steps run strictly in order. If one fails, the steps already applied are
 * reversed (best effort) and an ActionFailedError explains what happened,
 * including anything that could not be reversed. Undo plans are data, so
 * they can be stored and replayed later from the Recent screen.
 */
import type { LinearClient } from "../linear/client";
import {
  describeError,
  LinearGraphQLError,
  LinearNetworkError,
} from "../linear/errors";
import {
  CreateCommentDocument,
  CreateIssueRelationDocument,
  DeleteCommentDocument,
  DeleteIssueRelationDocument,
  IssueStateDocument,
  UpdateIssueDocument,
} from "../linear/generated/graphql";
import type { TriageIssue } from "../linear/types";
import type {
  ActionKind,
  ActionPlan,
  Expectation,
  PlannedStep,
  UndoStep,
} from "./actions";

export interface UndoPlan {
  /** Undo refuses to run unless the issue still matches this. */
  expectation: Expectation;
  identifier: string;
  issueId: string;
  steps: UndoStep[];
}

export interface ExecutionResult {
  /** The issue as Linear returned it from the last update, if any. */
  issue: TriageIssue | null;
  undo: UndoPlan;
  /** Things the user should know, even though the action succeeded. */
  warnings: string[];
}

/** Linear answered but reported `success: false`. */
export class MutationNotConfirmedError extends Error {
  override name = "MutationNotConfirmedError";

  constructor() {
    super("Linear did not confirm the change");
  }
}

export class ActionFailedError extends Error {
  override name = "ActionFailedError";
  /** True when no partial change was left behind in Linear. */
  readonly rolledBack: boolean;

  constructor(
    message: string,
    options: { cause: unknown; rolledBack: boolean }
  ) {
    super(message, { cause: options.cause });
    this.rolledBack = options.rolledBack;
  }
}

/** The issue changed after the action, so undoing could clobber that change. */
export class UndoConflictError extends Error {
  override name = "UndoConflictError";
}

export class UndoFailedError extends Error {
  override name = "UndoFailedError";
  /** Undo steps that did complete; a retry resumes after them. */
  readonly completedSteps: number;

  constructor(
    message: string,
    options: { cause: unknown; completedSteps: number }
  ) {
    super(message, { cause: options.cause });
    this.completedSteps = options.completedSteps;
  }
}

const notFoundPattern = /not found|could not find/i;

/** Whether Linear says the thing a delete targets no longer exists. */
function isAlreadyGone(error: unknown): boolean {
  return (
    error instanceof LinearGraphQLError &&
    (notFoundPattern.test(error.message) ||
      notFoundPattern.test(error.userMessage ?? ""))
  );
}

const failureLeads: Record<ActionKind, (identifier: string) => string> = {
  accept: (identifier) => `Couldn't accept ${identifier}`,
  decline: (identifier) => `Couldn't decline ${identifier}`,
  duplicate: (identifier) => `Couldn't mark ${identifier} as a duplicate`,
  snooze: (identifier) => `Couldn't snooze ${identifier}`,
  unsnooze: (identifier) => `Couldn't unsnooze ${identifier}`,
};

const undoStepDescriptions: Record<UndoStep["kind"], string> = {
  deleteComment: "The comment that was already posted could not be removed",
  deleteRelation:
    "The duplicate link that was already created could not be removed",
  updateIssue: "The change that was already made could not be reverted",
};

const sentenceEnding = /[.!?]$/;

const asSentence = (text: string) =>
  sentenceEnding.test(text) ? text : `${text}.`;

interface StepOutcome {
  /** Undo steps for this step, in the order they must be pushed. */
  inverses: UndoStep[];
  issue?: TriageIssue | null;
  /** Where Linear put the issue after a duplicate relation was created. */
  relationState?: { id: string; name: string; type: string };
}

async function runPlannedStep(
  client: LinearClient,
  step: PlannedStep
): Promise<StepOutcome> {
  switch (step.kind) {
    case "updateIssue": {
      const data = await client.request(UpdateIssueDocument, {
        id: step.issueId,
        input: step.input,
      });
      if (!data.issueUpdate.success) {
        throw new MutationNotConfirmedError();
      }
      return {
        inverses: [
          { input: step.revert, issueId: step.issueId, kind: "updateIssue" },
        ],
        issue: data.issueUpdate.issue ?? null,
      };
    }
    case "createComment": {
      const data = await client.request(CreateCommentDocument, {
        input: { body: step.body, issueId: step.issueId },
      });
      if (!data.commentCreate.success) {
        throw new MutationNotConfirmedError();
      }
      return {
        inverses: [
          { commentId: data.commentCreate.comment.id, kind: "deleteComment" },
        ],
      };
    }
    case "createRelation": {
      const data = await client.request(CreateIssueRelationDocument, {
        input: {
          issueId: step.issueId,
          relatedIssueId: step.relatedIssueId,
          type: step.type,
        },
      });
      if (!data.issueRelationCreate.success) {
        throw new MutationNotConfirmedError();
      }
      const relation = data.issueRelationCreate.issueRelation;
      return {
        // Pushed in this order so that, reversed, the relation goes first.
        inverses: [
          { input: step.revert, issueId: step.issueId, kind: "updateIssue" },
          { kind: "deleteRelation", relationId: relation.id },
        ],
        relationState: relation.issue.state,
      };
    }
    default:
      throw new Error(`Unknown step ${JSON.stringify(step satisfies never)}`);
  }
}

async function runUndoStep(
  client: LinearClient,
  step: UndoStep
): Promise<void> {
  switch (step.kind) {
    case "updateIssue": {
      const data = await client.request(UpdateIssueDocument, {
        id: step.issueId,
        input: step.input,
      });
      if (!data.issueUpdate.success) {
        throw new MutationNotConfirmedError();
      }
      return;
    }
    case "deleteComment": {
      const data = await client.request(DeleteCommentDocument, {
        id: step.commentId,
      });
      if (!data.commentDelete.success) {
        throw new MutationNotConfirmedError();
      }
      return;
    }
    case "deleteRelation": {
      const data = await client.request(DeleteIssueRelationDocument, {
        id: step.relationId,
      });
      if (!data.issueRelationDelete.success) {
        throw new MutationNotConfirmedError();
      }
      return;
    }
    default:
      throw new Error(`Unknown step ${JSON.stringify(step satisfies never)}`);
  }
}

/**
 * After a state or snooze change failed on the network (for example a
 * timeout), asks Linear whether it landed anyway. Anything else, or a
 * failed check, counts as not landed.
 */
async function landedAnyway(
  client: LinearClient,
  step: Extract<PlannedStep, { kind: "updateIssue" }>
): Promise<boolean> {
  const { snoozedUntilAt, stateId } = step.input;
  if (stateId === undefined && snoozedUntilAt === undefined) {
    return false;
  }
  try {
    const { issue } = await client.request(IssueStateDocument, {
      id: step.issueId,
    });
    const stateMatches = stateId === undefined || issue.state.id === stateId;
    const snoozeMatches =
      snoozedUntilAt === undefined ||
      sameInstant(issue.snoozedUntilAt, snoozedUntilAt ?? null);
    return stateMatches && snoozeMatches;
  } catch {
    // The check itself failed: assume the change did not land.
    return false;
  }
}

/** Runs a step; a lost answer to a change that did land counts as success. */
async function runStepCheckingLostAnswers(
  client: LinearClient,
  step: PlannedStep
): Promise<StepOutcome> {
  try {
    return await runPlannedStep(client, step);
  } catch (error) {
    if (
      error instanceof LinearNetworkError &&
      step.kind === "updateIssue" &&
      (await landedAnyway(client, step))
    ) {
      return {
        inverses: [
          { input: step.revert, issueId: step.issueId, kind: "updateIssue" },
        ],
      };
    }
    throw error;
  }
}

/** Reverses applied steps; returns a description of each one that failed. */
async function rollBack(
  client: LinearClient,
  steps: UndoStep[]
): Promise<string[]> {
  const failures: string[] = [];
  for (const step of steps) {
    try {
      // Reversal must happen in order, one step at a time.
      // biome-ignore lint/performance/noAwaitInLoops: sequential by design.
      await runUndoStep(client, step);
    } catch (error) {
      if (!(step.kind !== "updateIssue" && isAlreadyGone(error))) {
        failures.push(
          `${undoStepDescriptions[step.kind]}: ${describeError(error)}`
        );
      }
    }
  }
  return failures;
}

export async function executePlan(
  client: LinearClient,
  plan: ActionPlan
): Promise<ExecutionResult> {
  const undoStack: UndoStep[] = [];
  const warnings: string[] = [];
  let expectation: Expectation = { ...plan.expectation };
  let issue: TriageIssue | null = null;

  for (const step of plan.steps) {
    try {
      // Each step depends on the previous one having succeeded.
      // biome-ignore lint/performance/noAwaitInLoops: sequential by design.
      const outcome = await runStepCheckingLostAnswers(client, step);
      const { inverses, issue: returnedIssue, relationState } = outcome;
      undoStack.push(...inverses);
      if (returnedIssue !== undefined) {
        issue = returnedIssue;
      }
      if (relationState) {
        expectation = { ...expectation, stateId: relationState.id };
        if (relationState.type !== "duplicate") {
          warnings.push(
            `Linear kept ${plan.identifier} in ${relationState.name} instead of moving it to Duplicate`
          );
        }
      }
    } catch (error) {
      const rollbackFailures = await rollBack(client, [...undoStack].reverse());
      let message = `${failureLeads[plan.kind](plan.identifier)}: ${describeError(error)}`;
      if (rollbackFailures.length > 0) {
        message = `${asSentence(message)} ${rollbackFailures.join(" ")}`;
      }
      throw new ActionFailedError(message, {
        cause: error,
        rolledBack: rollbackFailures.length === 0,
      });
    }
  }

  return {
    issue,
    undo: {
      expectation,
      identifier: plan.identifier,
      issueId: plan.issueId,
      steps: undoStack.reverse(),
    },
    warnings,
  };
}

const sameInstant = (first: string | null, second: string | null) =>
  first === null || second === null
    ? first === second
    : new Date(first).getTime() === new Date(second).getTime();

/** Throws UndoConflictError if the issue no longer looks as the action left it. */
export async function verifyUndoPreconditions(
  client: LinearClient,
  undo: UndoPlan
): Promise<void> {
  const { issue } = await client.request(IssueStateDocument, {
    id: undo.issueId,
  });
  const { expectation } = undo;
  if (
    expectation.stateId !== undefined &&
    issue.state.id !== expectation.stateId
  ) {
    throw new UndoConflictError(
      `${undo.identifier} changed since this action (now ${issue.state.name}), so it was not undone`
    );
  }
  if (
    expectation.snoozedUntilAt !== undefined &&
    !sameInstant(issue.snoozedUntilAt, expectation.snoozedUntilAt)
  ) {
    throw new UndoConflictError(
      `${undo.identifier} changed since this action (its snooze changed), so it was not undone`
    );
  }
}

/** Runs an undo plan's steps in order. Call verifyUndoPreconditions first. */
export interface UndoProgress {
  /** Called after each completed step with the number completed so far. */
  onStepDone?: (completedSteps: number) => void;
  /** Skip steps already completed by an earlier, interrupted attempt. */
  startAt?: number;
}

/**
 * Runs an undo plan's steps in order, from `startAt`. A delete whose
 * target is already gone counts as done. Call verifyUndoPreconditions
 * first unless resuming.
 */
export async function executeUndo(
  client: LinearClient,
  undo: UndoPlan,
  progress: UndoProgress = {}
): Promise<void> {
  const startAt = progress.startAt ?? 0;
  for (const [index, step] of undo.steps.entries()) {
    if (index < startAt) {
      continue;
    }
    try {
      // Undo steps must land in order, like the action's own steps.
      // biome-ignore lint/performance/noAwaitInLoops: sequential by design.
      await runUndoStep(client, step);
    } catch (error) {
      if (!(step.kind !== "updateIssue" && isAlreadyGone(error))) {
        const partly = index > 0 ? "partly undone" : "not undone";
        throw new UndoFailedError(
          `${undo.identifier} was ${partly}: ${describeError(error)}`,
          { cause: error, completedSteps: index }
        );
      }
    }
    progress.onStepDone?.(index + 1);
  }
}
