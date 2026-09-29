import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTriageActions } from "~/composables/use-triage-actions";
import { useQueueStore } from "~/stores/queue";
import { useSessionStore } from "~/stores/session";
import { useToastStore } from "~/stores/toasts";
import { useWorkspaceStore } from "~/stores/workspace";
import { makeIssue, makeWorkspace } from "../../support/factories";
import { connection, stubLinearFetch } from "../../support/fetch-stub";

const workspace = makeWorkspace();
// Ready to accept: accepting needs a priority and an estimate.
const issue = makeIssue({ estimate: 2, priority: 3 });

async function setUp(
  overrides: Record<string, (variables: never) => unknown> = {}
) {
  const stub = stubLinearFetch({
    IssueLabels: () => ({ issueLabels: connection(workspace.labels) }),
    Projects: () => ({ projects: connection(workspace.projects) }),
    Teams: () => ({ teams: connection(workspace.teams) }),
    TriageQueue: () => ({ issues: connection([issue]) }),
    UpdateIssue: (variables: { input: object }) => ({
      issueUpdate: { issue: { ...issue, ...variables.input }, success: true },
    }),
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
    ...overrides,
  });
  await useSessionStore().connect("lin_api_good");
  await useWorkspaceStore().load();
  await useQueueStore().refresh();
  return stub;
}

beforeEach(() => {
  localStorage.clear();
  setActivePinia(createPinia());
});

describe("useTriageActions", () => {
  it("accepts into the team's default state", async () => {
    const { requests } = await setUp();

    const handle = useTriageActions().accept(issue);

    expect(handle.planned).toBe(true);
    await expect(handle.completion).resolves.toBe(true);

    expect(requests.at(-1)?.variables).toEqual({
      id: "issue-1",
      input: { stateId: "myr-backlog" },
    });
  });

  it("snoozes until 09:00 tomorrow as the signed-in user", async () => {
    vi.useFakeTimers({
      now: new Date("2026-09-29T04:18:00+01:00"),
      toFake: ["Date"],
    });
    const { requests } = await setUp();

    await useTriageActions().snoozeUntilTomorrow(issue).completion;

    expect(requests.at(-1)?.variables).toEqual({
      id: "issue-1",
      input: {
        snoozedById: "user-syn",
        snoozedUntilAt: "2026-09-30T08:00:00.000Z",
      },
    });
    vi.useRealTimers();
  });

  it("shows a planning refusal as an error and sends nothing", async () => {
    const { requests } = await setUp();
    const before = requests.length;

    const handle = useTriageActions().duplicate(issue, {
      id: issue.id,
      identifier: issue.identifier,
    });

    expect(handle.planned).toBe(false);
    await expect(handle.completion).resolves.toBe(false);

    expect(requests).toHaveLength(before);
    expect(useToastStore().items.at(-1)).toMatchObject({
      message: "An issue cannot be a duplicate of itself",
      tone: "error",
    });
  });

  it("refuses to act on an issue whose team has not loaded", async () => {
    await setUp();
    const stranger = makeIssue({
      id: "issue-x",
      identifier: "ZZZ-1",
      team: { id: "team-unknown" },
    });

    expect(useTriageActions().decline(stranger).planned).toBe(false);

    expect(useToastStore().items.at(-1)?.message).toBe(
      "The team for ZZZ-1 has not loaded yet. Try again in a moment."
    );
  });
});

describe("accepting an issue that isn't ready", () => {
  it("sends nothing and says what is missing", async () => {
    const { requests } = await setUp();
    const before = requests.length;
    const unready = makeIssue({ id: "issue-1", identifier: "MYR-1" });

    const handle = useTriageActions().accept(unready);

    expect(handle.planned).toBe(false);
    await expect(handle.completion).resolves.toBe(false);
    expect(requests).toHaveLength(before);
    expect(useToastStore().items.at(-1)).toMatchObject({
      message:
        "MYR-1 needs a priority and an estimate before it can be accepted",
      tone: "error",
    });
  });
});
