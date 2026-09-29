/**
 * Transient notifications: outcomes, errors and the undo affordance.
 */
import { defineStore } from "pinia";
import { ref } from "vue";

export type ToastTone = "info" | "success" | "warning" | "error";

export interface ToastAction {
  label: string;
  run: () => void | Promise<void>;
}

export interface Toast {
  action?: ToastAction;
  id: number;
  message: string;
  tone: ToastTone;
}

export interface ToastInput {
  action?: ToastAction;
  message: string;
  /** Milliseconds before dismissal; null keeps it until dismissed. */
  timeoutMs?: number | null;
  tone: ToastTone;
}

const maxVisible = 3;
const defaultTimeoutMs = 4000;
const longTimeoutMs = 8000;

export const useToastStore = defineStore("toasts", () => {
  const items = ref<Toast[]>([]);
  const timers = new Map<number, ReturnType<typeof setTimeout>>();
  const warned = new Set<string>();
  let nextId = 1;

  function dismiss(id: number) {
    const timer = timers.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.delete(id);
    }
    items.value = items.value.filter((toast) => toast.id !== id);
  }

  function push(input: ToastInput): number {
    const id = nextId;
    nextId += 1;
    const toast: Toast = { id, message: input.message, tone: input.tone };
    if (input.action) {
      toast.action = input.action;
    }
    items.value = [...items.value, toast];
    while (items.value.length > maxVisible) {
      const [oldest] = items.value;
      if (oldest) {
        dismiss(oldest.id);
      }
    }

    const lingers = Boolean(input.action) || input.tone === "error";
    const fallbackTimeoutMs = lingers ? longTimeoutMs : defaultTimeoutMs;
    const timeoutMs =
      input.timeoutMs === undefined ? fallbackTimeoutMs : input.timeoutMs;
    if (timeoutMs !== null) {
      timers.set(
        id,
        setTimeout(() => dismiss(id), timeoutMs)
      );
    }
    return id;
  }

  /** A warning shown at most once per session for a given key. */
  function warnOnce(key: string, message: string) {
    if (warned.has(key)) {
      return;
    }
    warned.add(key);
    push({ message, timeoutMs: longTimeoutMs, tone: "warning" });
  }

  return { dismiss, items, push, warnOnce };
});
