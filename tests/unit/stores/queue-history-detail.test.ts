import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { planAccept, planUnsnooze } from "~/lib/triage/actions";
import { detailMaxAgeMs, useDetailStore } from "~/stores/detail";
import { useHistoryStore } from "~/stores/history";
import { useSessionStore } from "~/stores/session";
import { useToastStore } from "~/stores/toasts";
import { makeIssue } from "../../support/factories";
import { connection, stubLinearFetch } from "../../support/fetch-stub";
import {
  baseHandlers,
  connectAndLoad,
  first,
  gate,
  ids,
  myr,
  myrStates,
  second,
  updated,
} from "../../support/store-harness";

const issueDetailPattern = /IssueDetail/;

beforeEach(() => {
  localStorage.clear();
  setActivePinia(createPinia());
});

describe("queue store", () => {
  it("loads the triage queue newest first", async () => {
    const { queue } = await connectAndLoad({});

    expect(ids(queue.visible)).toEqual(["issue-1", "issue-2", "issue-3"]);
    expect(queue.loadedAt).not.toBeNull();
  });

  it("removes an accepted issue at once, then records history and offers undo", async () => {
    const hold = gate();
    const { queue, requests } = await connectAndLoad({
      UpdateIssue: async (variables: { id: string; input: object }) => {
        await hold.opened;
        return updated(second, variables.input);
      },
    });

    const performing = queue.perform(planAccept(second, myr, myrStates));

    expect(ids(queue.visible)).toEqual(["issue-1", "issue-3"]);
    expect(queue.pending.has("issue-2")).toBe(true);
    hold.open();
    await expect(performing).resolves.toBe(true);

    expect(requests.at(-1)).toMatchObject({
      operation: "UpdateIssue",
      variables: { id: "issue-2", input: { stateId: "myr-backlog" } },
    });
    expect(useHistoryStore().entries[0]).toMatchObject({
      identifier: "MYR-2",
      status: "done",
      summary: "Accepted MYR-2 into Backlog",
    });
    const toast = useToastStore().items.at(-1);
    expect(toast?.message).toBe("Accepted MYR-2 into Backlog");
    expect(toast?.action?.label).toBe("Undo");
  });

  it("puts a failed action's issue back where it was and shows the error", async () => {
    const { queue } = await connectAndLoad({
      UpdateIssue: () =>
        Promise.reject(
          Response.json(
            {
              errors: [
                {
                  extensions: {
                    code: "INPUT_ERROR",
                    userPresentableMessage: "State not allowed.",
                  },
                  message: "bad",
                },
              ],
            },
            { status: 400 }
          )
        ),
    });

    await expect(
      queue.perform(planAccept(second, myr, myrStates))
    ).resolves.toBe(false);

    expect(ids(queue.visible)).toEqual(["issue-1", "issue-2", "issue-3"]);
    expect(queue.pending.size).toBe(0);
    expect(useToastStore().items.at(-1)).toMatchObject({
      message: "Couldn't accept MYR-2: State not allowed.",
      tone: "error",
    });
  });

  it("does not let a refresh resurrect an issue whose removal is in flight", async () => {
    const hold = gate();
    const { queue } = await connectAndLoad({
      UpdateIssue: async (variables: { input: object }) => {
        await hold.opened;
        return updated(second, variables.input);
      },
    });

    const performing = queue.perform(planAccept(second, myr, myrStates));
    await queue.refresh();

    expect(ids(queue.visible)).toEqual(["issue-1", "issue-3"]);
    hold.open();
    await performing;
  });

  it("clears a snooze optimistically when unsnoozing", async () => {
    const snoozed = makeIssue({
      id: "issue-9",
      identifier: "MYR-9",
      snoozedBy: { id: "user-syn" },
      snoozedUntilAt: "2099-01-01T09:00:00Z",
    });
    const { queue } = await connectAndLoad({
      TriageQueue: () => ({ issues: connection([first, snoozed]) }),
      UpdateIssue: (variables: { input: object }) =>
        updated(snoozed, variables.input),
    });
    expect(ids(queue.visible)).toEqual(["issue-1"]);

    await queue.perform(planUnsnooze(snoozed));

    expect(ids(queue.visible)).toEqual(["issue-1", "issue-9"]);
  });

  it("applies an edit optimistically and keeps Linear's version", async () => {
    const { queue, requests } = await connectAndLoad({
      UpdateIssue: (variables: { input: object }) =>
        updated(first, {
          ...variables.input,
          updatedAt: "2026-09-29T05:00:00Z",
        }),
    });

    const editing = queue.edit("issue-1", { priority: 2 }, { priority: 2 });
    expect(queue.issueById("issue-1")?.priority).toBe(2);
    await expect(editing).resolves.toBe(true);

    expect(requests.at(-1)?.variables).toEqual({
      id: "issue-1",
      input: { priority: 2 },
    });
    expect(queue.issueById("issue-1")?.updatedAt).toBe("2026-09-29T05:00:00Z");
  });

  it("rolls an edit back when Linear refuses it", async () => {
    const { queue } = await connectAndLoad({
      UpdateIssue: () => ({ issueUpdate: { issue: null, success: false } }),
    });

    await expect(
      queue.edit("issue-1", { priority: 1 }, { priority: 1 })
    ).resolves.toBe(false);

    expect(queue.issueById("issue-1")?.priority).toBe(3);
    expect(useToastStore().items.at(-1)?.message).toBe(
      "Linear did not confirm the change"
    );
  });

  it("drops an issue that an edit moved out of triage", async () => {
    const { queue } = await connectAndLoad({
      UpdateIssue: () =>
        updated(first, {
          state: { id: "shs-backlog" },
          team: { id: "team-shs" },
        }),
    });

    await queue.edit(
      "issue-1",
      { stateId: "shs-backlog", teamId: "team-shs" },
      { team: { id: "team-shs" } }
    );

    expect(queue.issueById("issue-1")).toBeUndefined();
  });

  it("keeps edits to one issue in order", async () => {
    const hold = gate();
    const seen: unknown[] = [];
    const { queue } = await connectAndLoad({
      UpdateIssue: async (variables: { input: { priority: number } }) => {
        seen.push(variables.input.priority);
        if (variables.input.priority === 1) {
          await hold.opened;
        }
        return updated(first, variables.input);
      },
    });

    const firstEdit = queue.edit("issue-1", { priority: 1 }, { priority: 1 });
    const secondEdit = queue.edit("issue-1", { priority: 4 }, { priority: 4 });
    await Promise.resolve();
    expect(seen).toEqual([1]);
    hold.open();
    await Promise.all([firstEdit, secondEdit]);

    expect(seen).toEqual([1, 4]);
    expect(queue.issueById("issue-1")?.priority).toBe(4);
  });
});

describe("history store", () => {
  const acceptAndGetEntry = async (issueState: () => unknown) => {
    const context = await connectAndLoad({
      IssueState: issueState,
      UpdateIssue: (variables: { input: object }) =>
        updated(second, variables.input),
    });
    await context.queue.perform(planAccept(second, myr, myrStates));
    const [entry] = useHistoryStore().entries;
    if (!entry) {
      throw new Error("No history entry recorded");
    }
    return { ...context, entry };
  };

  it("undoes after checking the issue is unchanged, then refreshes the queue", async () => {
    const { entry, requests } = await acceptAndGetEntry(() => ({
      issue: {
        id: "issue-2",
        identifier: "MYR-2",
        snoozedUntilAt: null,
        state: { id: "myr-backlog", name: "Backlog", type: "backlog" },
      },
    }));
    const requestsBefore = requests.length;

    await expect(useHistoryStore().undo(entry.id)).resolves.toBe(true);
    await vi.waitFor(() =>
      expect(
        requests.slice(requestsBefore).map((request) => request.operation)
      ).toEqual(["IssueState", "UpdateIssue", "TriageQueue"])
    );

    expect(requests[requestsBefore + 1]?.variables).toEqual({
      id: "issue-2",
      input: { stateId: "myr-triage" },
    });
    expect(useHistoryStore().entries[0]?.status).toBe("undone");
  });

  it("refuses to undo when the issue changed elsewhere", async () => {
    const { entry, requests } = await acceptAndGetEntry(() => ({
      issue: {
        id: "issue-2",
        identifier: "MYR-2",
        snoozedUntilAt: null,
        state: { id: "myr-in-progress", name: "In Progress", type: "started" },
      },
    }));
    const requestsBefore = requests.length;

    await expect(useHistoryStore().undo(entry.id)).resolves.toBe(false);

    expect(
      requests.slice(requestsBefore).map((request) => request.operation)
    ).toEqual(["IssueState"]);
    expect(useHistoryStore().entries[0]).toMatchObject({
      message:
        "MYR-2 changed since this action (now In Progress), so it was not undone",
      status: "conflict",
    });
  });

  it("will not undo the same entry twice", async () => {
    const { entry } = await acceptAndGetEntry(() => ({
      issue: {
        id: "issue-2",
        identifier: "MYR-2",
        snoozedUntilAt: null,
        state: { id: "myr-backlog", name: "Backlog", type: "backlog" },
      },
    }));

    await useHistoryStore().undo(entry.id);
    await expect(useHistoryStore().undo(entry.id)).resolves.toBe(false);
  });

  it("lets a failed undo be retried, but never a conflicting one", async () => {
    let failNext = true;
    const { entry } = await acceptAndGetEntry(() => {
      if (failNext) {
        failNext = false;
        return Promise.reject(new TypeError("Load failed"));
      }
      return {
        issue: {
          id: "issue-2",
          identifier: "MYR-2",
          snoozedUntilAt: null,
          state: { id: "myr-backlog", name: "Backlog", type: "backlog" },
        },
      };
    });

    await expect(useHistoryStore().undo(entry.id)).resolves.toBe(false);
    expect(useHistoryStore().entries[0]?.status).toBe("failed");

    await expect(useHistoryStore().undo(entry.id)).resolves.toBe(true);
    expect(useHistoryStore().entries[0]?.status).toBe("undone");
  });

  it("persists entries, newest first, capped at fifty", async () => {
    stubLinearFetch(baseHandlers);
    await useSessionStore().connect("lin_api_good");
    const history = useHistoryStore();
    const undo = {
      expectation: {},
      identifier: "MYR-1",
      issueId: "issue-1",
      steps: [],
    };

    for (let index = 0; index < 55; index += 1) {
      history.record(
        { ...planAccept(first, myr, myrStates), summary: `Action ${index}` },
        undo
      );
    }

    setActivePinia(createPinia());
    const restored = useHistoryStore();
    expect(restored.entries).toHaveLength(50);
    expect(restored.entries[0]?.summary).toBe("Action 54");
  });
});

describe("detail store", () => {
  const detailOf = (description: string) => ({
    issue: {
      ...first,
      attachments: { nodes: [] },
      comments: { nodes: [] },
      description,
      inverseRelations: { nodes: [] },
      parent: null,
      relations: { nodes: [] },
    },
  });

  it("fetches with signed file URLs and serves the cache while fresh", async () => {
    const { requests } = await connectAndLoad({
      IssueDetail: () => detailOf("Hello"),
    });
    const detail = useDetailStore();

    await detail.load("issue-1");
    await detail.load("issue-1");

    const detailRequests = requests.filter(
      (request) => request.operation === "IssueDetail"
    );
    expect(detailRequests).toHaveLength(1);
    expect(detailRequests[0]?.headers.get("public-file-urls-expire-in")).toBe(
      "3600"
    );
    expect(detail.entries.get("issue-1")?.issue?.description).toBe("Hello");
  });

  it("refetches once signed URLs are about to expire", async () => {
    const { requests } = await connectAndLoad({
      IssueDetail: () => detailOf("Hello"),
    });
    const detail = useDetailStore();
    await detail.load("issue-1");

    vi.useFakeTimers({ now: Date.now() + detailMaxAgeMs + 1000 });
    await detail.load("issue-1");
    vi.useRealTimers();

    expect(
      requests.filter((request) => request.operation === "IssueDetail")
    ).toHaveLength(2);
  });

  it("records prefetch failures on the entry instead of throwing", async () => {
    await connectAndLoad({});
    const detail = useDetailStore();

    detail.prefetch("issue-1");

    await vi.waitFor(() =>
      expect(detail.entries.get("issue-1")?.error).toMatch(issueDetailPattern)
    );
  });

  it("posts a comment and reloads the thread", async () => {
    const { requests } = await connectAndLoad({
      CreateComment: () => ({
        commentCreate: { comment: { id: "comment-1" }, success: true },
      }),
      IssueDetail: () => detailOf("Hello"),
    });

    await useDetailStore().addComment("issue-1", "  Looks good  ");

    expect(
      requests
        .slice(-2)
        .map((request) => [request.operation, request.variables])
    ).toEqual([
      ["CreateComment", { input: { body: "Looks good", issueId: "issue-1" } }],
      ["IssueDetail", { id: "issue-1" }],
    ]);
  });
});
