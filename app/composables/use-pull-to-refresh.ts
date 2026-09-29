/**
 * Pull to refresh for the document scroller: pulling down past the
 * threshold while at the top of the page runs `onRefresh`.
 */
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { pullProgress, swipeTuning } from "~/lib/gestures";

const resistance = 0.5;

export function usePullToRefresh(onRefresh: () => Promise<unknown>) {
  const distance = ref(0);
  const refreshing = ref(false);
  let startY: number | null = null;

  const onTouchStart = (event: TouchEvent) => {
    const [touch] = event.touches;
    startY =
      window.scrollY <= 0 &&
      !refreshing.value &&
      event.touches.length === 1 &&
      touch
        ? touch.clientY
        : null;
  };

  const onTouchMove = (event: TouchEvent) => {
    const [touch] = event.touches;
    if (startY === null || !touch) {
      return;
    }
    const delta = touch.clientY - startY;
    distance.value = delta > 0 && window.scrollY <= 0 ? delta * resistance : 0;
  };

  const onTouchEnd = async () => {
    if (startY === null) {
      return;
    }
    startY = null;
    if (pullProgress(distance.value) < 1) {
      distance.value = 0;
      return;
    }
    refreshing.value = true;
    distance.value = swipeTuning.pullThreshold * 0.7;
    try {
      await onRefresh();
    } finally {
      refreshing.value = false;
      distance.value = 0;
    }
  };

  onMounted(() => {
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("touchcancel", onTouchEnd);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("touchstart", onTouchStart);
    window.removeEventListener("touchmove", onTouchMove);
    window.removeEventListener("touchend", onTouchEnd);
    window.removeEventListener("touchcancel", onTouchEnd);
  });

  return {
    distance,
    progress: computed(() => pullProgress(distance.value)),
    refreshing,
  };
}
