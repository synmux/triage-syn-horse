/**
 * E2E fixtures. Queries go to the real Linear API (read-only); every
 * mutation is meant to be intercepted, recorded and answered locally, so
 * tests can assert exactly what the app would have sent.
 *
 * WARNING: route interception alone is NOT a sufficient guard. See the
 * note at the top of triage.e2e.ts and "E2E safety" in AGENTS.md before
 * re-enabling this suite.
 */
import { test as base, expect, type Route } from "@playwright/test";

export const apiKey =
  process.env.LINEAR_API_KEY ?? process.env.__LINEAR_API_KEY;

export interface RecordedMutation {
  operation: string;
  variables: Record<string, unknown>;
}

interface IssueRecord {
  id: string;
  identifier: string;
  labels: { nodes: { id: string }[] };
  state: { id: string };
  team: { id: string };
  [field: string]: unknown;
}

interface StateRecord {
  id: string;
  name: string;
  team: { id: string };
  type: string;
}

interface ShadowState {
  snoozedUntilAt?: string | null;
  stateId?: string;
}

export interface LinearHarness {
  issues: Map<string, IssueRecord>;
  mutations: RecordedMutation[];
  /** The id of the named state in the issue's team. */
  stateId: (issue: IssueRecord, stateName: string) => string;
  states: StateRecord[];
  unexpected: string[];
}

type Variables = Record<string, unknown>;

const operationPattern = /\b(query|mutation)\s+(\w+)/;
/** Scalar inputs copied onto the recorded issue as-is. */
const copiedFields = ["priority", "estimate", "title", "snoozedUntilAt"];

function createHarness(): LinearHarness {
  const harness: LinearHarness = {
    issues: new Map(),
    mutations: [],
    stateId: (issue, stateName) => {
      const state = harness.states.find(
        (candidate) =>
          candidate.team.id === issue.team.id && candidate.name === stateName
      );
      if (!state) {
        throw new Error(`No ${stateName} state for ${issue.identifier}`);
      }
      return state.id;
    },
    states: [],
    unexpected: [],
  };
  return harness;
}

function applyLabelDelta(issue: IssueRecord, input: Variables) {
  const labels = new Set(issue.labels.nodes.map((label) => label.id));
  for (const added of (input.addedLabelIds as string[] | undefined) ?? []) {
    labels.add(added);
  }
  for (const removed of (input.removedLabelIds as string[] | undefined) ?? []) {
    labels.delete(removed);
  }
  return { nodes: [...labels].map((labelId) => ({ id: labelId })) };
}

function applyUpdate(issue: IssueRecord, input: Variables): IssueRecord {
  const updated: IssueRecord = {
    ...issue,
    labels: applyLabelDelta(issue, input),
  };
  for (const field of copiedFields) {
    if (input[field] !== undefined) {
      updated[field] = input[field];
    }
  }
  if (typeof input.stateId === "string") {
    updated.state = { id: input.stateId };
  }
  return updated;
}

function shadowOf(input: Variables): ShadowState {
  const shadow: ShadowState = {};
  if (typeof input.stateId === "string") {
    shadow.stateId = input.stateId;
  }
  if (input.snoozedUntilAt !== undefined) {
    shadow.snoozedUntilAt = input.snoozedUntilAt as string | null;
  }
  return shadow;
}

/** Answers intercepted mutations with schema-shaped success payloads. */
function createMutationResponder(
  harness: LinearHarness,
  shadow: Map<string, ShadowState>
) {
  let createdIds = 0;
  const nextId = (prefix: string) => {
    createdIds += 1;
    return `e2e-${prefix}-${createdIds}`;
  };

  const handlers: Record<string, (variables: Variables) => unknown> = {
    CreateComment: () => ({
      commentCreate: { comment: { id: nextId("comment") }, success: true },
    }),
    CreateIssueRelation: (variables) => {
      const { issueId } = variables.input as { issueId: string };
      const issue = harness.issues.get(issueId);
      const duplicate = harness.states.find(
        (state) =>
          state.team.id === issue?.team.id && state.type === "duplicate"
      );
      if (!(issue && duplicate)) {
        throw new Error("CreateIssueRelation for an unknown issue or team");
      }
      shadow.set(issueId, { stateId: duplicate.id });
      const { id, name, type } = duplicate;
      return {
        issueRelationCreate: {
          issueRelation: {
            id: nextId("relation"),
            issue: { id: issueId, state: { id, name, type } },
          },
          success: true,
        },
      };
    },
    DeleteComment: () => ({ commentDelete: { success: true } }),
    DeleteIssueRelation: () => ({ issueRelationDelete: { success: true } }),
    UpdateIssue: (variables) => {
      const id = String(variables.id);
      const input = variables.input as Variables;
      const current = harness.issues.get(id);
      if (!current) {
        throw new Error(
          `UpdateIssue for an issue the harness never saw: ${id}`
        );
      }
      const updated = applyUpdate(current, input);
      harness.issues.set(id, updated);
      shadow.set(id, { ...shadow.get(id), ...shadowOf(input) });
      return { issueUpdate: { issue: updated, success: true } };
    },
  };

  return (operation: string, variables: Variables) =>
    handlers[operation]?.(variables) ?? null;
}

const fulfil = (route: Route, data: unknown) =>
  route.fulfill({
    body: JSON.stringify({ data }),
    contentType: "application/json",
    headers: { "access-control-allow-origin": "*" },
    status: 200,
  });

function shadowedIssueState(
  harness: LinearHarness,
  issueId: string,
  shadowed: ShadowState
) {
  const issue = harness.issues.get(issueId);
  const state = harness.states.find(
    (candidate) => candidate.id === (shadowed.stateId ?? issue?.state.id)
  );
  return {
    issue: {
      id: issueId,
      identifier: issue?.identifier ?? "?",
      snoozedUntilAt: shadowed.snoozedUntilAt ?? null,
      state: {
        id: state?.id ?? shadowed.stateId,
        name: state?.name ?? "?",
        type: state?.type ?? "?",
      },
    },
  };
}

/** Remembers issues and states from real query responses. */
function remember(
  harness: LinearHarness,
  operation: string,
  data: Record<string, unknown> | undefined
) {
  if (operation === "TriageQueue" && data?.issues) {
    const { nodes } = data.issues as { nodes: IssueRecord[] };
    for (const issue of nodes) {
      harness.issues.set(issue.id, issue);
    }
  }
  if (operation === "WorkflowStates" && data?.workflowStates) {
    const { nodes } = data.workflowStates as { nodes: StateRecord[] };
    harness.states.push(...nodes);
  }
}

export const test = base.extend<{ linear: LinearHarness }>({
  // auto: every test gets the seeded key and the mutation guard, even if
  // it never asks for the harness.
  linear: [
    async ({ context }, use) => {
      const harness = createHarness();
      /** What Linear would now say about issues the app "changed". */
      const shadow = new Map<string, ShadowState>();
      const respond = createMutationResponder(harness, shadow);

      await context.addInitScript((key) => {
        if (!localStorage.getItem("triage-syn-horse:api-key")) {
          localStorage.setItem(
            "triage-syn-horse:api-key",
            JSON.stringify({ value: key, version: 1 })
          );
        }
      }, apiKey ?? "");

      await context.route("https://api.linear.app/graphql", async (route) => {
        if (route.request().method() !== "POST") {
          return route.continue();
        }
        const body = JSON.parse(route.request().postData() ?? "{}") as {
          query?: string;
          variables?: Variables;
        };
        const [, kind, operation = "unknown"] =
          operationPattern.exec(body.query ?? "") ?? [];
        const variables = body.variables ?? {};

        if (kind === "mutation") {
          harness.mutations.push({ operation, variables });
          const data = respond(operation, variables);
          if (data === null) {
            harness.unexpected.push(operation);
            return route.fulfill({ body: "unexpected mutation", status: 500 });
          }
          return fulfil(route, data);
        }

        const shadowed = shadow.get(String(variables.id));
        if (operation === "IssueState" && shadowed) {
          return fulfil(
            route,
            shadowedIssueState(harness, String(variables.id), shadowed)
          );
        }

        const response = await route.fetch();
        const json = (await response.json()) as {
          data?: Record<string, unknown>;
        };
        remember(harness, operation, json.data);
        return route.fulfill({ json, response });
      });

      await use(harness);

      expect(harness.unexpected, "unexpected mutations").toEqual([]);
    },
    { auto: true },
  ],
});
