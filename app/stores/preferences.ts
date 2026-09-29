/**
 * Per-device preferences, persisted in localStorage.
 */
import { defineStore } from "pinia";
import { reactive, watch } from "vue";
import { createStorage } from "~/lib/storage";
import type { QueueOrder } from "~/lib/triage/queue";
import { useToastStore } from "./toasts";

export type LeftSwipeAction = "decline" | "snooze";

export interface Preferences {
  /** After acting on an issue, open the next one instead of the queue. */
  autoAdvance: boolean;
  /** Swiping a row left declines it, or snoozes it until tomorrow. */
  leftSwipe: LeftSwipeAction;
  /** Newest or oldest issues first in the queue. */
  order: QueueOrder;
  swipeEnabled: boolean;
}

export const defaultPreferences: Preferences = {
  autoAdvance: true,
  leftSwipe: "decline",
  order: "newest",
  swipeEnabled: true,
};

const isPreferences = (value: unknown): value is Partial<Preferences> =>
  typeof value === "object" && value !== null;

const preferencesStorage = createStorage<Partial<Preferences>>("preferences", {
  validate: isPreferences,
  version: 1,
});

/** Keeps only stored values of the right type, so bad data falls back to defaults. */
function sanitise(stored: Partial<Preferences> | null): Preferences {
  const merged = { ...defaultPreferences };
  if (!stored) {
    return merged;
  }
  if (stored.order === "newest" || stored.order === "oldest") {
    merged.order = stored.order;
  }
  if (typeof stored.autoAdvance === "boolean") {
    merged.autoAdvance = stored.autoAdvance;
  }
  if (typeof stored.swipeEnabled === "boolean") {
    merged.swipeEnabled = stored.swipeEnabled;
  }
  if (stored.leftSwipe === "decline" || stored.leftSwipe === "snooze") {
    merged.leftSwipe = stored.leftSwipe;
  }
  return merged;
}

export const usePreferencesStore = defineStore("preferences", () => {
  const values = reactive<Preferences>(sanitise(preferencesStorage.read()));

  watch(
    values,
    (current) => {
      try {
        preferencesStorage.write({ ...current });
      } catch {
        useToastStore().warnOnce(
          "preferences-storage",
          "This browser isn't letting Triage save your preferences."
        );
      }
    },
    { deep: true, flush: "sync" }
  );

  return { values };
});
