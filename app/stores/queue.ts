/**
 * The triage queue: every issue in a triage state, with optimistic
 * actions and edits that roll back (visibly) when Linear refuses them.
 */
import { defineStore } from "pinia";
import { computed, reactive, ref, watch } from "vue";
import { describeError } from "~/lib/linear/errors";
import {
  TriageQueueDocument,
  UpdateIssueDocument,
} from "~/lib/linear/generated/graphql";
import { collectPages } from "~/lib/linear/pagination";
import type { IssueUpdateInput, TriageIssue } from "~/lib/linear/types";
import { createStorage } from "~/lib/storage";
import type { ActionPlan } from "~/lib/triage/actions";
import {
  type ExecutionResult,
  executePlan,
  MutationNotConfirmedError,
} from "~/lib/triage/executor";
import { countsByTeam, type QueueView, visibleQueue } from "~/lib/triage/queue";
import { useDetailStore } from "./detail";
import { useHistoryStore } from "./history";
import { usePreferencesStore } from "./preferences";
import { useSessionStore } from "./session";
import { useToastStore } from "./toasts";
import { useWorkspaceStore } from "./workspace";
import { issueWriteQueue } from "./write-queue";

const isIssueList = (value: unknown): value is TriageIssue[] =>
  Array.isArray(value);

const queueStorage = createStorage<TriageIssue[]>("queue", {
  validate: isIssueList,
  version: 1,
});

const sameValue = (first: unknown, second: unknown) =>
  first === second || JSON.stringify(first) === JSON.stringify(second);

export const useQueueStore = defineStore("queue", () => {
  const session = useSessionStore();
  const preferences = usePreferencesStore();
  const toasts = useToastStore();

  const issues = ref<TriageIssue[]>(queueStorage.read() ?? []);
  const loadedAt = ref<Date | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const now = ref(new Date());
  const teamFilter = ref<string | null>(null);
  const view = ref<QueueView>("active");
  /** Issues with a write in flight: rows lock while it runs. */
  const pending = reactive(new Set<string>());
  /**
   * Issues removed by an action. `null` while the action runs; afterwards
   * the number of the last refresh that started before it finished. Any
   * refresh up to that number may predate the change, so it cannot bring
   * the issue back; the first refresh started later settles it.
   */
  const hidden = new Map<string, number | null>();
  /** The last version of each issue that Linear itself returned. */
  const confirmed = new Map<string, TriageIssue>();
  let refreshesStarted = 0;
  let inFlight: Promise<void> | null = null;

  const persist = () => {
    if (session.status === "disconnected") {
      return;
    }
    try {
      queueStorage.write(issues.value);
    } catch {
      toasts.warnOnce(
        "queue-storage",
        "This browser isn't letting Triage save data, so it will reload everything each time."
      );
    }
  };

  const visible = computed(() =>
    visibleQueue(issues.value, {
      now: now.value,
      order: preferences.values.order,
      teamId: teamFilter.value,
      view: view.value,
    })
  );
  const counts = computed(() => countsByTeam(issues.value, now.value));
  const ready = computed(
    () => loadedAt.value !== null || issues.value.length > 0
  );

  const issueById = (issueId: string) =>
    issues.value.find((issue) => issue.id === issueId);

  /** Re-evaluates snooze visibility against the current time. */
  function tick() {
    now.value = new Date();
  }

  const hiddenFrom = (issueId: string, refreshNumber: number) => {
    if (!hidden.has(issueId)) {
      return false;
    }
    const settledAfter = hidden.get(issueId);
    return settledAfter === null || settledAfter === undefined
      ? true
      : refreshNumber <= settledAfter;
  };

  function applyRefresh(fetched: TriageIssue[], refreshNumber: number) {
    for (const issue of fetched) {
      confirmed.set(issue.id, issue);
    }
    issues.value = fetched.filter(
      (issue) => !hiddenFrom(issue.id, refreshNumber)
    );
    for (const [issueId, settledAfter] of hidden) {
      if (settledAfter !== null && refreshNumber > settledAfter) {
        hidden.delete(issueId);
      }
    }
    loadedAt.value = new Date();
    error.value = null;
    tick();
    persist();
  }

  function refresh(): Promise<void> {
    if (inFlight) {
      return inFlight;
    }
    const client = session.requireClient();
    const startedIn = session.epoch;
    refreshesStarted += 1;
    const refreshNumber = refreshesStarted;
    loading.value = true;
    const fetchPage = async (after: string | null) =>
      (await client.request(TriageQueueDocument, { after })).issues;
    inFlight = collectPages(fetchPage)
      .then((fetched) => {
        if (session.isCurrent(startedIn)) {
          applyRefresh(fetched, refreshNumber);
        }
      })
      .catch((failure: unknown) => {
        if (session.isCurrent(startedIn)) {
          error.value = describeError(failure);
        }
        throw failure;
      })
      .finally(() => {
        loading.value = false;
        inFlight = null;
      });
    return inFlight;
  }

  const replace = (updated: TriageIssue) => {
    issues.value = issues.value.map((issue) =>
      issue.id === updated.id ? updated : issue
    );
  };

  const remove = (issueId: string) => {
    issues.value = issues.value.filter((issue) => issue.id !== issueId);
  };

  const reinsert = (issue: TriageIssue, index: number) => {
    if (issueById(issue.id)) {
      return;
    }
    const copy = [...issues.value];
    copy.splice(Math.min(index, copy.length), 0, issue);
    issues.value = copy;
  };

  /** Shows the action's outcome in the queue before Linear confirms it. */
  const applyOptimistically = (plan: ActionPlan, original?: TriageIssue) => {
    if (plan.removesFromQueue) {
      hidden.set(plan.issueId, null);
      remove(plan.issueId);
    } else if (plan.kind === "unsnooze" && original) {
      replace({ ...original, snoozedBy: null, snoozedUntilAt: null });
    }
  };

  const revertOptimistic = (
    plan: ActionPlan,
    original: TriageIssue | undefined,
    originalIndex: number
  ) => {
    hidden.delete(plan.issueId);
    if (!original) {
      return;
    }
    if (plan.removesFromQueue) {
      reinsert(original, originalIndex);
    } else {
      replace(original);
    }
  };

  const announce = (plan: ActionPlan, result: ExecutionResult) => {
    const history = useHistoryStore();
    const entry = history.record(plan, result.undo);
    toasts.push({
      action: { label: "Undo", run: () => history.undo(entry.id) },
      message: plan.summary,
      tone: "success",
    });
    for (const warning of result.warnings) {
      toasts.push({ message: warning, tone: "warning" });
    }
  };

  /**
   * Runs a triage action optimistically. Resolves to true when Linear
   * accepted it; on failure the issue is put back and the error shown.
   */
  async function perform(plan: ActionPlan): Promise<boolean> {
    const client = session.requireClient();
    const detail = useDetailStore();
    const original = issueById(plan.issueId);
    const originalIndex = original ? issues.value.indexOf(original) : -1;

    pending.add(plan.issueId);
    applyOptimistically(plan, original);
    try {
      const result = await issueWriteQueue.run(plan.issueId, () =>
        executePlan(client, plan)
      );
      if (plan.removesFromQueue) {
        hidden.set(plan.issueId, refreshesStarted);
      }
      if (result.issue) {
        confirmed.set(result.issue.id, result.issue);
        detail.merge(result.issue);
        if (!plan.removesFromQueue) {
          replace(result.issue);
        }
      }
      detail.invalidate(plan.issueId);
      persist();
      announce(plan, result);
      return true;
    } catch (failure) {
      revertOptimistic(plan, original, originalIndex);
      toasts.push({ message: describeError(failure), tone: "error" });
      return false;
    } finally {
      pending.delete(plan.issueId);
    }
  }

  /**
   * Puts back the fields a failed edit changed, unless a later edit has
   * changed them since: that edit's own outcome decides them.
   */
  const rollBackFields = (
    issueId: string,
    optimistic: Partial<TriageIssue>,
    fallback: TriageIssue | undefined
  ) => {
    const current = issueById(issueId);
    const base = confirmed.get(issueId) ?? fallback;
    if (!(current && base)) {
      return;
    }
    const restored: TriageIssue = { ...current };
    for (const field of Object.keys(optimistic) as (keyof TriageIssue)[]) {
      if (sameValue(current[field], optimistic[field])) {
        Object.assign(restored, { [field]: base[field] });
      }
    }
    replace(restored);
  };

  /**
   * Updates properties of a queued issue. `optimistic` is applied at once
   * and replaced by Linear's answer, or rolled back if Linear refuses.
   */
  async function edit(
    issueId: string,
    input: IssueUpdateInput,
    optimistic: Partial<TriageIssue>
  ): Promise<boolean> {
    const client = session.requireClient();
    const before = issueById(issueId);
    if (before) {
      replace({ ...before, ...optimistic });
    }
    pending.add(issueId);
    try {
      const data = await issueWriteQueue.run(issueId, () =>
        client.request(UpdateIssueDocument, { id: issueId, input })
      );
      const updated = data.issueUpdate.issue;
      if (!(data.issueUpdate.success && updated)) {
        throw new MutationNotConfirmedError();
      }
      confirmed.set(updated.id, updated);
      useDetailStore().merge(updated);
      const workspace = useWorkspaceStore();
      const stillInTriage =
        workspace
          .statesFor(updated.team.id)
          .find((state) => state.id === updated.state.id)?.type === "triage";
      if (stillInTriage) {
        replace(updated);
      } else {
        remove(issueId);
      }
      persist();
      return true;
    } catch (failure) {
      rollBackFields(issueId, optimistic, before);
      toasts.push({ message: describeError(failure), tone: "error" });
      return false;
    } finally {
      pending.delete(issueId);
    }
  }

  watch(
    () => session.status,
    (status) => {
      if (status === "disconnected") {
        issues.value = [];
        loadedAt.value = null;
        error.value = null;
        teamFilter.value = null;
        view.value = "active";
        hidden.clear();
        confirmed.clear();
      }
    }
  );

  return {
    counts,
    edit,
    error,
    issueById,
    issues,
    loadedAt,
    loading,
    now,
    pending,
    perform,
    ready,
    refresh,
    teamFilter,
    tick,
    view,
    visible,
  };
});
