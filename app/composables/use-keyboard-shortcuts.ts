/**
 * Single-key shortcuts for hardware keyboards (iPad, desktop), matching
 * Linear's triage keys. Ignored while typing or while a sheet is open.
 */
import { onBeforeUnmount, onMounted } from "vue";

export function useKeyboardShortcuts(bindings: Record<string, () => void>) {
  const onKeydown = (event: KeyboardEvent) => {
    if (
      event.defaultPrevented ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey
    ) {
      return;
    }
    const target = event.target as HTMLElement | null;
    if (target?.closest("input, textarea, select, [contenteditable='true']")) {
      return;
    }
    if (document.documentElement.classList.contains("sheet-open")) {
      return;
    }
    const action = bindings[event.key] ?? bindings[event.key.toLowerCase()];
    if (action) {
      event.preventDefault();
      action();
    }
  };

  onMounted(() => document.addEventListener("keydown", onKeydown));
  onBeforeUnmount(() => document.removeEventListener("keydown", onKeydown));
}
