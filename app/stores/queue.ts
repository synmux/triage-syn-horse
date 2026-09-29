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
  /** Issues with a write in flight: rows lock and refreshes keep them hidden. */
  const pending = reactive(new Set<string>());
  /** Issues optimistically removed whose removal Linear has not confirmed yet. */
  const hidden = new Set<string>();
  let inFlight: Promise<void> | null = null;

  const persist = () => {
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

  function refresh(): Promise<void> {
    if (inFlight) {
      return inFlight;
    }
    const client = session.requireClient();
    loading.value = true;
    const fetchPage = async (after: string | null) =>
      (await client.request(TriageQueueDocument, { after })).issues;
    inFlight = collectPages(fetchPage)
      .then((fetched) => {
        issues.value = fetched.filter((issue) => !hidden.has(issue.id));
        loadedAt.value = new Date();
        error.value = null;
        tick();
        persist();
      })
      .catch((failure: unknown) => {
        error.value = describeError(failure);
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

  /**
   * Runs a triage action optimistically. Resolves to true when Linear
   * accepted it; on failure the issue is put back and the error shown.
   */
  /** Shows the action's outcome in the queue before Linear confirms it. */
  const applyOptimistically = (plan: ActionPlan, original?: TriageIssue) => {
    if (plan.removesFromQueue) {
      hidden.add(plan.issueId);
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
    const original = issueById(plan.issueId);
    const originalIndex = original ? issues.value.indexOf(original) : -1;

    pending.add(plan.issueId);
    applyOptimistically(plan, original);
    try {
      const result = await issueWriteQueue.run(plan.issueId, () =>
        executePlan(client, plan)
      );
      if (result.issue && !plan.removesFromQueue) {
        replace(result.issue);
      }
      persist();
      announce(plan, result);
      return true;
    } catch (failure) {
      revertOptimistic(plan, original, originalIndex);
      toasts.push({ message: describeError(failure), tone: "error" });
      return false;
    } finally {
      pending.delete(plan.issueId);
      hidden.delete(plan.issueId);
    }
  }

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
      const current = issueById(issueId);
      if (before && current) {
        replace(before);
      }
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
