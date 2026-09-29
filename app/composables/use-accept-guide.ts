/**
 * Walks the user through what Accept still needs: opens the first missing
 * property's picker, then the next as each is filled in. The pickers say
 * why they opened. It never accepts by itself; the user taps Accept once
 * the issue is ready.
 */
import { type MaybeRefOrGetter, readonly, ref, toValue, watch } from "vue";
import type { AcceptBlocker } from "~/lib/triage/actions";

export interface AcceptGuideOptions {
  /** What the issue still needs before it can be accepted. */
  missing: MaybeRefOrGetter<AcceptBlocker[]>;
  /** Opens the picker for one missing property. */
  open: (blocker: AcceptBlocker) => void;
}

export function useAcceptGuide({ missing, open }: AcceptGuideOptions) {
  const guiding = ref(false);

  /**
   * Starts guiding if the issue isn't ready. Returns false when nothing is
   * missing, meaning Accept can go ahead.
   */
  function start(): boolean {
    const [first] = toValue(missing);
    if (!first) {
      return false;
    }
    guiding.value = true;
    open(first);
    return true;
  }

  function stop() {
    guiding.value = false;
  }

  watch(
    () => toValue(missing),
    (current, previous) => {
      if (!guiding.value) {
        return;
      }
      const [next] = current;
      if (!next) {
        guiding.value = false;
      } else if (next !== previous[0]) {
        open(next);
      }
    }
  );

  return { guiding: readonly(guiding), start, stop };
}
