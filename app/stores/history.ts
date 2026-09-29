/**
 * Every triage action taken on this device, with its undo plan. Undo
 * stays available here after the toast has gone, and it refuses to run
 * if the issue has changed since the action.
 */
import { defineStore } from "pinia";
import { ref, watch } from "vue";
import { describeError } from "~/lib/linear/errors";
import { createStorage } from "~/lib/storage";
import type { ActionKind, ActionPlan } from "~/lib/triage/actions";
import {
  executeUndo,
  UndoConflictError,
  type UndoPlan,
  verifyUndoPreconditions,
} from "~/lib/triage/executor";
import { useDetailStore } from "./detail";
import { useQueueStore } from "./queue";
import { useSessionStore } from "./session";
import { useToastStore } from "./toasts";
import { issueWriteQueue } from "./write-queue";

export type HistoryStatus =
  | "done"
  | "undoing"
  | "undone"
  | "conflict"
  | "failed";

export interface HistoryEntry {
  /** ISO timestamp of the action. */
  at: string;
  id: string;
  identifier: string;
  issueId: string;
  kind: ActionKind;
  /** Why an undo did not happen, for conflict and failed entries. */
  message: string | null;
  status: HistoryStatus;
  summary: string;
  undo: UndoPlan;
  /**
   * Undo steps already completed by an earlier attempt that stopped
   * part-way. A retry resumes after them. Missing on older entries.
   */
  undoneSteps?: number;
}

const maxEntries = 50;

const isEntryList = (value: unknown): value is HistoryEntry[] =>
  Array.isArray(value);

const historyStorage = createStorage<HistoryEntry[]>("history", {
  validate: isEntryList,
  version: 1,
});

const newId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const useHistoryStore = defineStore("history", () => {
  const toasts = useToastStore();
  // An undo interrupted by closing the app is offered again as a retry,
  // resuming after whichever steps it had completed.
  const entries = ref<HistoryEntry[]>(
    (historyStorage.read() ?? []).map((entry) =>
      entry.status === "undoing"
        ? {
            ...entry,
            message: "The undo was interrupted. Try it again to finish it.",
            status: "failed",
          }
        : entry
    )
  );

  const session = useSessionStore();

  const persist = () => {
    // Disconnecting wipes storage; nothing may write it back afterwards.
    if (session.status === "disconnected") {
      return;
    }
    try {
      historyStorage.write(entries.value);
    } catch {
      toasts.warnOnce(
        "history-storage",
        "This browser isn't letting Triage save data, so Recent will be empty next time."
      );
    }
  };

  const update = (entryId: string, changes: Partial<HistoryEntry>) => {
    entries.value = entries.value.map((entry) =>
      entry.id === entryId ? { ...entry, ...changes } : entry
    );
    persist();
  };

  function record(plan: ActionPlan, undoPlan: UndoPlan): HistoryEntry {
    const entry: HistoryEntry = {
      at: new Date().toISOString(),
      id: newId(),
      identifier: plan.identifier,
      issueId: plan.issueId,
      kind: plan.kind,
      message: null,
      status: "done",
      summary: plan.summary,
      undo: undoPlan,
    };
    entries.value = [entry, ...entries.value].slice(0, maxEntries);
    persist();
    return entry;
  }

  /** Undoes (or retries undoing) an action. True only if it was fully undone. */
  async function undo(entryId: string): Promise<boolean> {
    const entry = entries.value.find((candidate) => candidate.id === entryId);
    // A failed undo (for example offline) may be retried; a conflict may not,
    // because the issue has changed since and undoing would clobber that.
    if (!(entry && (entry.status === "done" || entry.status === "failed"))) {
      return false;
    }
    const client = session.requireClient();
    const startedIn = session.epoch;
    const resumeFrom = entry.undoneSteps ?? 0;
    update(entryId, { message: null, status: "undoing" });
    try {
      await issueWriteQueue.run(entry.issueId, async () => {
        // A resumed undo has already changed the issue, so the original
        // precondition no longer holds; it was checked on the first attempt.
        if (resumeFrom === 0) {
          await verifyUndoPreconditions(client, entry.undo);
        }
        await executeUndo(client, entry.undo, {
          onStepDone: (completedSteps) =>
            update(entryId, { undoneSteps: completedSteps }),
          startAt: resumeFrom,
        });
      });
      if (!session.isCurrent(startedIn)) {
        return false;
      }
      useDetailStore().invalidate(entry.issueId);
      update(entryId, { status: "undone" });
      toasts.push({ message: `Undone: ${entry.summary}`, tone: "info" });
      useQueueStore()
        .refresh()
        .catch((failure: unknown) => {
          toasts.push({ message: describeError(failure), tone: "error" });
        });
      return true;
    } catch (failure) {
      const message = describeError(failure);
      const conflict = failure instanceof UndoConflictError;
      update(entryId, { message, status: conflict ? "conflict" : "failed" });
      toasts.push({ message, tone: conflict ? "warning" : "error" });
      return false;
    }
  }

  function clear() {
    entries.value = [];
    persist();
  }

  // Another account's actions must never be undoable under a new key.
  watch(
    () => session.status,
    (status) => {
      if (status === "disconnected") {
        entries.value = [];
      }
    }
  );

  return { clear, entries, record, undo };
});
