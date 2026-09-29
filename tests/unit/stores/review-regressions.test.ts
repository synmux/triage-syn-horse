/**
 * Regression tests for problems found in the 2026-09-29 code review, each
 * reproducing the reviewer's failure scenario.
 */
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import { storagePrefix } from "~/lib/storage";
import { planAccept } from "~/lib/triage/actions";
import { useDetailStore } from "~/stores/detail";
import { useHistoryStore } from "~/stores/history";
import { useSessionStore } from "~/stores/session";
import { connection } from "../../support/fetch-stub";
import {
  connectAndLoad,
  first,
  gate,
  ids,
  myr,
  myrStates,
  second,
  third,
  updated,
} from "../../support/store-harness";

const detailOf = (issue: typeof first) => ({
  issue: {
    ...issue,
    attachments: { nodes: [] },
    comments: { nodes: [] },
    description: "Details",
    inverseRelations: { nodes: [] },
    parent: null,
    relations: { nodes: [] },
  },
});

beforeEach(() => {
  localStorage.clear();
  setActivePinia(createPinia());
});

describe("a refresh answered after an action", () => {
  it("cannot bring back an issue it fetched before the action landed", async () => {
    const refreshGate = gate();
    let refreshes = 0;
    const { queue } = await connectAndLoad({
      TriageQueue: async () => {
        refreshes += 1;
        if (refreshes === 2) {
          await refreshGate.opened;
        }
        return { issues: connection([first, second, third]) };
      },
      UpdateIssue: (variables: { input: object }) =>
        updated(second, variables.input),
    });

    const staleRefresh = queue.refresh();
    await queue.perform(planAccept(second, myr, myrStates));
    refreshGate.open();
    await staleRefresh;

    expect(ids(queue.visible)).toEqual(["issue-1", "issue-3"]);
  });

  it("lets a refresh started after the action decide", async () => {
    // Responses in order: initial load, then two refreshes after the action.
    const responses = [
      [first, second, third],
      [first, third],
      [first, second, third],
    ];
    const { queue } = await connectAndLoad({
      TriageQueue: () => ({ issues: connection(responses.shift() ?? []) }),
      UpdateIssue: () => updated(second, { state: { id: "myr-backlog" } }),
    });

    await queue.perform(planAccept(second, myr, myrStates));
    await queue.refresh();
    await queue.refresh();

    // Linear listing it again in a later refresh means it really is back in
    // triage (for example, undone elsewhere), so it shows again.
    expect(ids(queue.visible)).toEqual(["issue-1", "issue-2", "issue-3"]);
  });
});

describe("two queued edits that both fail", () => {
  it("leaves the value Linear last confirmed", async () => {
    const { queue } = await connectAndLoad({
      UpdateIssue: () => ({ issueUpdate: { issue: null, success: false } }),
    });

    const firstEdit = queue.edit("issue-1", { priority: 1 }, { priority: 1 });
    const secondEdit = queue.edit("issue-1", { priority: 4 }, { priority: 4 });
    await Promise.all([firstEdit, secondEdit]);

    expect(queue.issueById("issue-1")?.priority).toBe(0);
  });

  it("keeps a later edit's value when only the earlier edit fails", async () => {
    let calls = 0;
    const { queue } = await connectAndLoad({
      UpdateIssue: (variables: { input: { priority: number } }) => {
        calls += 1;
        return calls === 1
          ? { issueUpdate: { issue: null, success: false } }
          : updated(first, variables.input);
      },
    });

    await Promise.all([
      queue.edit("issue-1", { priority: 1 }, { priority: 1 }),
      queue.edit("issue-1", { priority: 4 }, { priority: 4 }),
    ]);

    expect(queue.issueById("issue-1")?.priority).toBe(4);
  });
});

describe("the detail cache after changes", () => {
  it("is invalidated by an action, so the issue is re-read before acting again", async () => {
    const { queue } = await connectAndLoad({
      IssueDetail: () => detailOf(second),
      // Linear answers with the issue's new state object.
      UpdateIssue: () => updated(second, { state: { id: "myr-backlog" } }),
    });
    const detail = useDetailStore();
    await detail.load("issue-2");
    expect(detail.isStale("issue-2")).toBe(false);

    await queue.perform(planAccept(second, myr, myrStates));

    expect(detail.isStale("issue-2")).toBe(true);
    expect(detail.entries.get("issue-2")?.issue?.state.id).toBe("myr-backlog");
  });

  it("takes in an edit's result", async () => {
    const { queue } = await connectAndLoad({
      IssueDetail: () => detailOf(first),
      UpdateIssue: (variables: { input: object }) =>
        updated(first, variables.input),
    });
    const detail = useDetailStore();
    await detail.load("issue-1");

    await queue.edit("issue-1", { priority: 2 }, { priority: 2 });

    expect(detail.entries.get("issue-1")?.issue?.priority).toBe(2);
  });

  it("keeps an answer to a request made before an action stale", async () => {
    const detailGate = gate();
    const { queue } = await connectAndLoad({
      IssueDetail: async () => {
        await detailGate.opened;
        return detailOf(second);
      },
      UpdateIssue: (variables: { input: object }) =>
        updated(second, variables.input),
    });
    const detail = useDetailStore();

    const earlyLoad = detail.load("issue-2");
    await queue.perform(planAccept(second, myr, myrStates));
    detailGate.open();
    await earlyLoad;

    expect(detail.isStale("issue-2")).toBe(true);
  });
});

describe("disconnecting", () => {
  it("clears Recent so another account's actions can't be undone", async () => {
    const { queue } = await connectAndLoad({
      UpdateIssue: (variables: { input: object }) =>
        updated(second, variables.input),
    });
    await queue.perform(planAccept(second, myr, myrStates));
    expect(useHistoryStore().entries).toHaveLength(1);

    useSessionStore().disconnect();
    await Promise.resolve();

    expect(useHistoryStore().entries).toEqual([]);
    expect(localStorage.getItem(`${storagePrefix}history`)).toBeNull();
  });

  it("drops a refresh that finishes afterwards instead of writing it back", async () => {
    const refreshGate = gate();
    let refreshes = 0;
    const { queue } = await connectAndLoad({
      TriageQueue: async () => {
        refreshes += 1;
        if (refreshes === 2) {
          await refreshGate.opened;
        }
        return { issues: connection([first, second, third]) };
      },
    });

    const lateRefresh = queue.refresh();
    useSessionStore().disconnect();
    refreshGate.open();
    await lateRefresh;

    expect(queue.issues).toEqual([]);
    expect(localStorage.length).toBe(0);
  });
});
