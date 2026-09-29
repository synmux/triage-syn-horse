/**
 * Shared setup for store tests: a connected session, a loaded workspace
 * and a three-issue MYR queue, all served by the fetch stub so the real
 * client runs underneath.
 */
import type { TriageIssue } from "~/lib/linear/types";
import { statesForTeam } from "~/lib/triage/states";
import { useQueueStore } from "~/stores/queue";
import { useSessionStore } from "~/stores/session";
import { useWorkspaceStore } from "~/stores/workspace";
import { makeIssue, makeWorkspace } from "./factories";
import { connection, stubLinearFetch } from "./fetch-stub";

export const workspace = makeWorkspace();
const [firstTeam] = workspace.teams;
if (!firstTeam) {
  throw new Error("Workspace fixture has no teams");
}
export const myr = firstTeam;
export const myrStates = statesForTeam("team-myr", workspace.states);

export const first = makeIssue({
  createdAt: "2026-09-27T10:00:00Z",
  // Ready to accept: accepting needs a priority and an estimate.
  estimate: 2,
  id: "issue-1",
  identifier: "MYR-1",
  priority: 3,
});
export const second = makeIssue({
  createdAt: "2026-09-26T10:00:00Z",
  // Ready to accept: accepting needs a priority and an estimate.
  estimate: 2,
  id: "issue-2",
  identifier: "MYR-2",
  priority: 3,
});
export const third = makeIssue({
  createdAt: "2026-09-25T10:00:00Z",
  // Ready to accept: accepting needs a priority and an estimate.
  estimate: 2,
  id: "issue-3",
  identifier: "MYR-3",
  priority: 3,
});

export const baseHandlers = {
  IssueLabels: () => ({ issueLabels: connection(workspace.labels) }),
  Projects: () => ({ projects: connection(workspace.projects) }),
  Teams: () => ({ teams: connection(workspace.teams) }),
  TriageQueue: () => ({ issues: connection([first, second, third]) }),
  Users: () => ({ users: connection(workspace.users) }),
  Viewer: () => ({
    organization: { name: "synmux", urlKey: "synmux" },
    viewer: {
      avatarUrl: null,
      displayName: "syn",
      email: "syn@example.com",
      id: "user-syn",
      name: "syn",
    },
  }),
  WorkflowStates: () => ({ workflowStates: connection(workspace.states) }),
};

/** An UpdateIssue response for `issue` with `changes` applied. */
export const updated = (issue: TriageIssue, changes: Partial<TriageIssue>) => ({
  issueUpdate: { issue: { ...issue, ...changes }, success: true },
});

export const ids = (issues: { id: string }[]) =>
  issues.map((issue) => issue.id);

/** A promise the test settles by hand, to observe in-flight states. */
export const gate = () => {
  let open: () => void = () => undefined;
  const opened = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { open, opened };
};

/** Connects, loads the workspace and refreshes the queue once. */
export async function connectAndLoad(
  handlers: Record<string, (variables: never) => unknown>
) {
  const stub = stubLinearFetch({ ...baseHandlers, ...handlers });
  await useSessionStore().connect("lin_api_good");
  await useWorkspaceStore().load();
  const queue = useQueueStore();
  await queue.refresh();
  return { queue, ...stub };
}
