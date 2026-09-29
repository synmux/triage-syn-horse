<script lang="ts" setup>
  import { computed, onBeforeUnmount, ref, useTemplateRef } from "vue";
  import {
    type Intent,
    lockIntent,
    resolveSwipe,
    type SwipeDirection,
    startsInEdgeZone,
    swipeTuning,
  } from "~/lib/gestures";

  /**
   * A list row that can be swiped sideways to act on it. Vertical scrolling
   * is left to the browser; a swipe commits past 40% of the row's width.
   */
  const {
    disabled = false,
    leftAction,
    rightAction,
  } = defineProps<{
    disabled?: boolean;
    /** Revealed when swiping right. */
    rightAction: { label: string; tone: "accept" };
    /** Revealed when swiping left. */
    leftAction: { label: string; tone: "decline" | "snooze" };
  }>();
  const emit = defineEmits<{ commit: [direction: SwipeDirection] }>();

  const root = useTemplateRef<HTMLElement>("root");
  const offset = ref(0);
  const settling = ref(false);
  let tracking: { x: number; y: number; pointerId: number } | null = null;
  let intent: Intent | null = null;
  let suppressNextClick = false;
  const timers: ReturnType<typeof setTimeout>[] = [];

  const width = () => root.value?.offsetWidth ?? 0;
  const progress = computed(() => {
    const rowWidth = width();
    return rowWidth === 0
      ? 0
      : Math.min(
          1,
          Math.abs(offset.value) / (rowWidth * swipeTuning.commitFraction)
        );
  });
  const revealing = computed<"left" | "right" | null>(() => {
    if (offset.value > 0) {
      return "right";
    }
    return offset.value < 0 ? "left" : null;
  });

  function onPointerDown(event: PointerEvent) {
    // A drag that snapped back fires no click on iOS; never carry its
    // suppression over to the next, genuine tap.
    suppressNextClick = false;
    if (
      disabled ||
      !event.isPrimary ||
      (event.pointerType === "mouse" && event.button !== 0) ||
      startsInEdgeZone(event.clientX, window.innerWidth)
    ) {
      return;
    }
    tracking = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
    intent = null;
    settling.value = false;
  }

  function onPointerMove(event: PointerEvent) {
    if (!tracking || event.pointerId !== tracking.pointerId) {
      return;
    }
    const deltaX = event.clientX - tracking.x;
    const deltaY = event.clientY - tracking.y;
    if (intent === null) {
      intent = lockIntent(deltaX, deltaY);
      if (intent === "vertical") {
        tracking = null;
        return;
      }
      if (intent === "horizontal") {
        root.value?.setPointerCapture(event.pointerId);
      }
    }
    if (intent === "horizontal") {
      offset.value = deltaX;
      suppressNextClick = true;
    }
  }

  function settle(to: number) {
    settling.value = true;
    offset.value = to;
  }

  function onPointerUp() {
    if (!tracking) {
      return;
    }
    const direction =
      intent === "horizontal" ? resolveSwipe(offset.value, width()) : null;
    tracking = null;
    intent = null;
    if (!direction) {
      settle(0);
      return;
    }
    settle(direction === "right" ? width() : -width());
    timers.push(
      setTimeout(() => emit("commit", direction), 160),
      // Still here? The action was refused before it started: slide back.
      setTimeout(() => settle(0), 900)
    );
  }

  function onPointerCancel() {
    tracking = null;
    intent = null;
    settle(0);
  }

  function onClickCapture(event: MouseEvent) {
    if (suppressNextClick) {
      event.preventDefault();
      event.stopPropagation();
      suppressNextClick = false;
    }
  }

  onBeforeUnmount(() => {
    for (const timer of timers) {
      clearTimeout(timer);
    }
  });
</script>

<template>
  <!-- biome-ignore lint/a11y/noNoninteractiveElementInteractions: swipe is a touch shortcut; the row's link opens the issue, where every action is a button. -->
  <!-- biome-ignore lint/a11y/noStaticElementInteractions: as above, the gesture has an accessible equivalent. -->
  <!-- biome-ignore lint/a11y/useKeyWithClickEvents: the capture handler only swallows the click that ends a drag. -->
  <div
    class="swipe-row"
    ref="root"
    @click.capture="onClickCapture"
    @pointercancel="onPointerCancel"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
  >
    <div
      aria-hidden="true"
      class="reveal"
      v-if="revealing"
      :class="[
        revealing === 'right' ? rightAction.tone : leftAction.tone,
        revealing,
        { armed: progress >= 1 },
      ]"
    >
      <span class="reveal-label">{{
        revealing === "right" ? rightAction.label : leftAction.label
      }}</span>
    </div>
    <div
      class="surface"
      :class="{ settling }"
      :style="{ transform: `translateX(${offset}px)` }"
    >
      <slot />
    </div>
  </div>
</template>

<style scoped>
  .swipe-row {
    position: relative;
    overflow: hidden;
    touch-action: pan-y;
    -webkit-user-select: none;
    user-select: none;
  }
  .surface {
    position: relative;
    background: var(--colour-canvas);
  }
  .surface.settling {
    transition: transform var(--duration-standard) var(--ease-out);
  }
  .reveal {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    padding: 0 var(--space-6);
    font-family: var(--font-display);
    font-weight: 700;
    transition:
      background-color var(--duration-quick) var(--ease-out),
      color var(--duration-quick) var(--ease-out);
  }
  .reveal.left {
    justify-content: flex-end;
  }
  .reveal.accept {
    color: var(--colour-accept);
    background: color-mix(
      in srgb,
      var(--colour-accept-fill) var(--tint-strength),
      var(--colour-canvas)
    );
  }
  .reveal.decline {
    color: var(--colour-decline);
    background: color-mix(
      in srgb,
      var(--colour-decline-fill) var(--tint-strength),
      var(--colour-canvas)
    );
  }
  .reveal.snooze {
    color: var(--colour-snooze);
    background: color-mix(
      in srgb,
      var(--colour-snooze-fill) var(--tint-strength),
      var(--colour-canvas)
    );
  }
  .reveal.armed.accept {
    color: var(--colour-accept-on-fill);
    background: var(--colour-accept-fill);
  }
  .reveal.armed.decline {
    color: #ffffff;
    background: var(--colour-decline-solid);
  }
  .reveal.armed.snooze {
    color: #2b1a00;
    background: var(--colour-snooze-fill);
  }
</style>
