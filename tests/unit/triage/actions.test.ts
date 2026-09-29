import { describe, expect, it } from "vitest";
import { LinearGraphQLError, LinearNetworkError } from "~/lib/linear/errors";
import {
  AcceptBlockedError,
  acceptBlockers,
  describeAcceptBlockers,
  planAccept,
  planDecline,
  planDuplicate,
  planSnooze,
  planUnsnooze,
} from "~/lib/triage/actions";
import {
  ActionFailedError,
  executePlan,
  executeUndo,
  UndoConflictError,
  UndoFailedError,
  verifyUndoPreconditions,
} from "~/lib/triage/executor";
import { statesForTeam } from "~/lib/triage/states";
import { makeIssue, makeTeam, makeWorkspace } from "../../support/factories";
import { createFakeClient } from "../../support/fake-client";

const workspace = makeWorkspace();
const team = makeTeam();
const teamStates = statesForTeam("team-myr", workspace.states);
const issue = makeIssue();
/** Has the priority and estimate that accepting requires. */
const readyIssue = makeIssue({ estimate: 2, priority: 3 });

const updateIssueOk = (variables: { id: string }) => ({
  issueUpdate: { issue: { ...issue, id: variables.id }, success: true },
});
const createCommentOk = () => ({
  commentCreate: { comment: { id: "comment-1" }, success: true },
});
const deleteOk = () => ({ commentDelete: { success: true } });
const relationOk = (stateType: string) => () => ({
  issueRelationCreate: {
    issueRelation: {
      id: "relation-1",
      issue: {
        id: issue.id,
        state: { id: `myr-${stateType}`, name: stateType, type: stateType },
      },
    },
    success: true,
  },
});

describe("planAccept", () => {
  it("moves the issue to the team's default state and can undo back to triage", async () => {
    const plan = planAccept(readyIssue, team, teamStates);
    const { calls, client } = createFakeClient({ UpdateIssue: updateIssueOk });

    const result = await executePlan(client, plan);

    expect(plan.summary).toBe("Accepted MYR-1 into Backlog");
    expect(plan.removesFromQueue).toBe(true);
    expect(calls).toEqual([
      {
        operation: "UpdateIssue",
        signedFileUrls: false,
        variables: { id: "issue-1", input: { stateId: "myr-backlog" } },
      },
    ]);
    expect(result.undo).toEqual({
      expectation: { stateId: "myr-backlog" },
      identifier: "MYR-1",
      issueId: "issue-1",
      steps: [
        {
          input: { stateId: "myr-triage" },
          issueId: "issue-1",
          kind: "updateIssue",
        },
      ],
    });
    expect(result.warnings).toEqual([]);
  });

  it("posts the comment before moving, and undo removes it again", async () => {
    const plan = planAccept(readyIssue, team, teamStates, {
      comment: "Good idea, doing it next.",
      stateId: "myr-scheduled",
    });
    const { calls, client } = createFakeClient({
      CreateComment: createCommentOk,
      UpdateIssue: updateIssueOk,
    });

    const result = await executePlan(client, plan);

    expect(plan.summary).toBe("Accepted MYR-1 into Scheduled");
    expect(calls.map((call) => [call.operation, call.variables])).toEqual([
      [
        "CreateComment",
        { input: { body: "Good idea, doing it next.", issueId: "issue-1" } },
      ],
      ["UpdateIssue", { id: "issue-1", input: { stateId: "myr-scheduled" } }],
    ]);
    expect(result.undo.steps).toEqual([
      {
        input: { stateId: "myr-triage" },
        issueId: "issue-1",
        kind: "updateIssue",
      },
      { commentId: "comment-1", kind: "deleteComment" },
    ]);
  });

  it("ignores a blank comment", () => {
    const plan = planAccept(readyIssue, team, teamStates, { comment: "   \n" });
    expect(plan.steps.map((step) => step.kind)).toEqual(["updateIssue"]);
  });

  it("refuses a state that is not a valid acceptance target", () => {
    expect(() =>
      planAccept(readyIssue, team, teamStates, { stateId: "myr-done" })
    ).toThrow("Done is not a state MYR-1 can be accepted into");
  });

  it("never accepts into Triage, even when asked to", () => {
    expect(() =>
      planAccept(readyIssue, team, teamStates, { stateId: "myr-triage" })
    ).toThrow("Triage is not a state MYR-1 can be accepted into");
  });

  it("refuses to accept without a priority and an estimate", () => {
    const attempt = () => planAccept(issue, team, teamStates);
    expect(attempt).toThrow(AcceptBlockedError);
    expect(attempt).toThrow(
      "MYR-1 needs a priority and an estimate before it can be accepted"
    );
  });

  it("names whichever of the two is missing", () => {
    expect(() =>
      planAccept(makeIssue({ priority: 2 }), team, teamStates)
    ).toThrow("MYR-1 needs an estimate before it can be accepted");
    expect(() =>
      planAccept(makeIssue({ estimate: 3 }), team, teamStates)
    ).toThrow("MYR-1 needs a priority before it can be accepted");
  });

  it("counts a zero estimate as an estimate", () => {
    expect(() =>
      planAccept(
        makeIssue({ estimate: 0, priority: 4 }),
        makeTeam({ issueEstimationAllowZero: true }),
        teamStates
      )
    ).not.toThrow();
  });

  it("only requires a priority in a team that doesn't use estimates", () => {
    const noEstimates = makeTeam({ issueEstimationType: "notUsed" });
    expect(() =>
      planAccept(makeIssue({ priority: 1 }), noEstimates, teamStates)
    ).not.toThrow();
    expect(() => planAccept(issue, noEstimates, teamStates)).toThrow(
      "MYR-1 needs a priority before it can be accepted"
    );
  });
});

describe("planDecline", () => {
  it("moves the issue to the canceled state with an optional reason", async () => {
    const plan = planDecline(issue, team, teamStates, {
      comment: "Not doing this.",
    });
    const { calls, client } = createFakeClient({
      CreateComment: createCommentOk,
      UpdateIssue: updateIssueOk,
    });

    const result = await executePlan(client, plan);

    expect(plan.summary).toBe("Declined MYR-1");
    expect(calls.map((call) => call.variables)).toEqual([
      { input: { body: "Not doing this.", issueId: "issue-1" } },
      { id: "issue-1", input: { stateId: "myr-canceled" } },
    ]);
    expect(result.undo.expectation).toEqual({ stateId: "myr-canceled" });
  });
});

describe("planDuplicate", () => {
  const canonical = { id: "issue-9", identifier: "MYR-9" };

  it("creates a duplicate relation and undoes by deleting it and restoring the state", async () => {
    const plan = planDuplicate(issue, canonical);
    const { calls, client } = createFakeClient({
      CreateIssueRelation: relationOk("duplicate"),
    });

    const result = await executePlan(client, plan);

    expect(plan.summary).toBe("Marked MYR-1 as a duplicate of MYR-9");
    expect(calls).toEqual([
      {
        operation: "CreateIssueRelation",
        signedFileUrls: false,
        variables: {
          input: {
            issueId: "issue-1",
            relatedIssueId: "issue-9",
            type: "duplicate",
          },
        },
      },
    ]);
    expect(result.warnings).toEqual([]);
    expect(result.undo).toEqual({
      expectation: { stateId: "myr-duplicate" },
      identifier: "MYR-1",
      issueId: "issue-1",
      steps: [
        { kind: "deleteRelation", relationId: "relation-1" },
        {
          input: { stateId: "myr-triage" },
          issueId: "issue-1",
          kind: "updateIssue",
        },
      ],
    });
  });

  it("warns when Linear does not move the issue to Duplicate", async () => {
    const { client } = createFakeClient({
      CreateIssueRelation: relationOk("triage"),
    });

    const result = await executePlan(client, planDuplicate(issue, canonical));

    expect(result.warnings).toEqual([
      "Linear kept MYR-1 in triage instead of moving it to Duplicate",
    ]);
  });

  it("refuses to mark an issue as a duplicate of itself", () => {
    expect(() =>
      planDuplicate(issue, { id: issue.id, identifier: issue.identifier })
    ).toThrow("An issue cannot be a duplicate of itself");
  });
});

describe("planSnooze and planUnsnooze", () => {
  it("snoozes as the viewer and undo clears the snooze", async () => {
    const until = new Date("2026-09-30T08:00:00.000Z");
    const plan = planSnooze(issue, until, "user-syn");
    const { calls, client } = createFakeClient({ UpdateIssue: updateIssueOk });

    const result = await executePlan(client, plan);

    expect(plan.summary).toBe("Snoozed MYR-1 until Wed 30 Sept, 09:00");
    expect(plan.removesFromQueue).toBe(true);
    expect(calls[0]?.variables).toEqual({
      id: "issue-1",
      input: {
        snoozedById: "user-syn",
        snoozedUntilAt: "2026-09-30T08:00:00.000Z",
      },
    });
    expect(result.undo.steps).toEqual([
      {
        input: { snoozedById: null, snoozedUntilAt: null },
        issueId: "issue-1",
        kind: "updateIssue",
      },
    ]);
    expect(result.undo.expectation).toEqual({
      snoozedUntilAt: "2026-09-30T08:00:00.000Z",
    });
  });

  it("unsnoozes and undo restores the previous snooze", async () => {
    const snoozed = makeIssue({
      snoozedBy: { id: "user-syn" },
      snoozedUntilAt: "2026-10-05T08:00:00.000Z",
    });
    const plan = planUnsnooze(snoozed);
    const { client } = createFakeClient({ UpdateIssue: updateIssueOk });

    const result = await executePlan(client, plan);

    expect(plan.summary).toBe("Unsnoozed MYR-1");
    expect(plan.removesFromQueue).toBe(false);
    expect(result.undo.steps).toEqual([
      {
        input: {
          snoozedById: "user-syn",
          snoozedUntilAt: "2026-10-05T08:00:00.000Z",
        },
        issueId: "issue-1",
        kind: "updateIssue",
      },
    ]);
  });
});

describe("executePlan failures", () => {
  it("rolls back earlier steps when a later one fails", async () => {
    const plan = planDecline(issue, team, teamStates, { comment: "No." });
    const { calls, client } = createFakeClient({
      CreateComment: createCommentOk,
      DeleteComment: deleteOk,
      UpdateIssue: () => {
        throw new LinearGraphQLError("Argument Validation Error", {
          code: "INVALID_INPUT",
          userMessage: "That state is not allowed.",
        });
      },
    });

    const error = await executePlan(client, plan).catch(
      (failure: unknown) => failure
    );

    expect(error).toBeInstanceOf(ActionFailedError);
    expect((error as ActionFailedError).message).toBe(
      "Couldn't decline MYR-1: That state is not allowed."
    );
    expect((error as ActionFailedError).rolledBack).toBe(true);
    expect(calls.map((call) => call.operation)).toEqual([
      "CreateComment",
      "UpdateIssue",
      "DeleteComment",
    ]);
  });

  it("says so when the rollback fails too", async () => {
    const plan = planDecline(issue, team, teamStates, { comment: "No." });
    const { client } = createFakeClient({
      CreateComment: createCommentOk,
      DeleteComment: () => {
        throw new Error("gone");
      },
      UpdateIssue: () => {
        throw new Error("state failed");
      },
    });

    const error = (await executePlan(client, plan).catch(
      (failure: unknown) => failure
    )) as ActionFailedError;

    expect(error.rolledBack).toBe(false);
    expect(error.message).toBe(
      "Couldn't decline MYR-1: state failed. The comment that was already posted could not be removed: gone"
    );
  });

  it("treats an unconfirmed mutation as a failure", async () => {
    const { client } = createFakeClient({
      UpdateIssue: () => ({ issueUpdate: { issue: null, success: false } }),
    });

    await expect(
      executePlan(client, planAccept(readyIssue, team, teamStates))
    ).rejects.toThrow(
      "Couldn't accept MYR-1: Linear did not confirm the change"
    );
  });
});

describe("undo", () => {
  const undo = {
    expectation: { stateId: "myr-backlog" },
    identifier: "MYR-1",
    issueId: "issue-1",
    steps: [
      {
        input: { stateId: "myr-triage" },
        issueId: "issue-1",
        kind: "updateIssue" as const,
      },
      { commentId: "comment-1", kind: "deleteComment" as const },
    ],
  };

  const issueState = (
    stateId: string,
    stateName: string,
    snoozedUntilAt: string | null = null
  ) => ({
    issue: {
      id: "issue-1",
      identifier: "MYR-1",
      snoozedUntilAt,
      state: { id: stateId, name: stateName, type: "backlog" },
    },
  });

  it("passes the precondition check when the issue is as the action left it", async () => {
    const { client } = createFakeClient({
      IssueState: () => issueState("myr-backlog", "Backlog"),
    });
    await expect(
      verifyUndoPreconditions(client, undo)
    ).resolves.toBeUndefined();
  });

  it("refuses when the issue has moved on since", async () => {
    const { client } = createFakeClient({
      IssueState: () => issueState("myr-in-progress", "In Progress"),
    });

    const error = await verifyUndoPreconditions(client, undo).catch(
      (failure: unknown) => failure
    );
    expect(error).toBeInstanceOf(UndoConflictError);
    expect((error as Error).message).toBe(
      "MYR-1 changed since this action (now In Progress), so it was not undone"
    );
  });

  it("compares snooze times as instants, not strings", async () => {
    const snoozeUndo = {
      ...undo,
      expectation: { snoozedUntilAt: "2026-09-30T08:00:00.000Z" },
    };
    const same = createFakeClient({
      IssueState: () =>
        issueState("myr-triage", "Triage", "2026-09-30T08:00:00Z"),
    });
    await expect(
      verifyUndoPreconditions(same.client, snoozeUndo)
    ).resolves.toBeUndefined();

    const changed = createFakeClient({
      IssueState: () =>
        issueState("myr-triage", "Triage", "2026-10-01T08:00:00Z"),
    });
    await expect(
      verifyUndoPreconditions(changed.client, snoozeUndo)
    ).rejects.toThrow(
      "MYR-1 changed since this action (its snooze changed), so it was not undone"
    );
  });

  it("runs the undo steps in order", async () => {
    const { calls, client } = createFakeClient({
      DeleteComment: deleteOk,
      UpdateIssue: updateIssueOk,
    });

    await executeUndo(client, undo);

    expect(calls.map((call) => [call.operation, call.variables])).toEqual([
      ["UpdateIssue", { id: "issue-1", input: { stateId: "myr-triage" } }],
      ["DeleteComment", { id: "comment-1" }],
    ]);
  });
});

describe("undo that stops part-way", () => {
  const undo = {
    expectation: { stateId: "myr-backlog" },
    identifier: "MYR-1",
    issueId: "issue-1",
    steps: [
      {
        input: { stateId: "myr-triage" },
        issueId: "issue-1",
        kind: "updateIssue" as const,
      },
      { commentId: "comment-1", kind: "deleteComment" as const },
    ],
  };

  it("reports how many steps completed and resumes from there", async () => {
    const completed: number[] = [];
    const failing = createFakeClient({
      DeleteComment: () => {
        throw new LinearNetworkError("offline");
      },
      UpdateIssue: updateIssueOk,
    });

    const error = await executeUndo(failing.client, undo, {
      onStepDone: (count) => completed.push(count),
    }).catch((failure: unknown) => failure);

    expect(error).toBeInstanceOf(UndoFailedError);
    expect((error as UndoFailedError).completedSteps).toBe(1);
    expect(completed).toEqual([1]);

    const resumed = createFakeClient({ DeleteComment: deleteOk });
    await executeUndo(resumed.client, undo, { startAt: 1 });
    expect(resumed.calls.map((call) => call.operation)).toEqual([
      "DeleteComment",
    ]);
  });

  it("treats deleting something already gone as done", async () => {
    const { client } = createFakeClient({
      DeleteComment: () => {
        throw new LinearGraphQLError("Entity not found: Comment", {
          code: "INPUT_ERROR",
          userMessage: "Could not find referenced Comment.",
        });
      },
      UpdateIssue: updateIssueOk,
    });

    await expect(executeUndo(client, undo)).resolves.toBeUndefined();
  });
});

describe("a state change whose answer is lost", () => {
  const timeout = () => {
    throw new LinearNetworkError("Linear took too long to respond");
  };

  it("checks Linear and carries on when the change did land", async () => {
    const plan = planDecline(issue, team, teamStates, { comment: "No." });
    const { calls, client } = createFakeClient({
      CreateComment: createCommentOk,
      IssueState: () => ({
        issue: {
          id: "issue-1",
          identifier: "MYR-1",
          snoozedUntilAt: null,
          state: { id: "myr-canceled", name: "Canceled", type: "canceled" },
        },
      }),
      UpdateIssue: timeout,
    });

    const result = await executePlan(client, plan);

    expect(calls.map((call) => call.operation)).toEqual([
      "CreateComment",
      "UpdateIssue",
      "IssueState",
    ]);
    expect(result.undo.steps).toEqual([
      {
        input: { stateId: "myr-triage" },
        issueId: "issue-1",
        kind: "updateIssue",
      },
      { commentId: "comment-1", kind: "deleteComment" },
    ]);
  });

  it("rolls back when Linear shows the change did not land", async () => {
    const plan = planDecline(issue, team, teamStates, { comment: "No." });
    const { calls, client } = createFakeClient({
      CreateComment: createCommentOk,
      DeleteComment: deleteOk,
      IssueState: () => ({
        issue: {
          id: "issue-1",
          identifier: "MYR-1",
          snoozedUntilAt: null,
          state: { id: "myr-triage", name: "Triage", type: "triage" },
        },
      }),
      UpdateIssue: timeout,
    });

    await expect(executePlan(client, plan)).rejects.toBeInstanceOf(
      ActionFailedError
    );
    expect(calls.map((call) => call.operation)).toEqual([
      "CreateComment",
      "UpdateIssue",
      "IssueState",
      "DeleteComment",
    ]);
  });
});

describe("acceptBlockers", () => {
  it("lists what an issue still needs before it can be accepted", () => {
    expect(acceptBlockers(issue, team)).toEqual(["priority", "estimate"]);
    expect(acceptBlockers(makeIssue({ priority: 2 }), team)).toEqual([
      "estimate",
    ]);
    expect(acceptBlockers(readyIssue, team)).toEqual([]);
  });
});

describe("describeAcceptBlockers", () => {
  it("puts what is missing into words", () => {
    expect(describeAcceptBlockers(["priority", "estimate"])).toBe(
      "a priority and an estimate"
    );
    expect(describeAcceptBlockers(["estimate"])).toBe("an estimate");
  });
});
