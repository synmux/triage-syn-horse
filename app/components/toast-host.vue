<script lang="ts" setup>
  import { computed } from "vue";
  import { useRoute } from "vue-router";
  import { type Toast, useToastStore } from "~/stores/toasts";

  const toasts = useToastStore();
  const route = useRoute();

  /** On the issue screen, toasts sit above the action strip. */
  const aboveStrip = computed(() => route.path.startsWith("/issue/"));

  async function runAction(toast: Toast) {
    toasts.dismiss(toast.id);
    await toast.action?.run();
  }
</script>

<template>
  <div class="toasts" :class="{ 'above-strip': aboveStrip }">
    <TransitionGroup class="stack" name="toast" tag="ol">
      <li
        class="toast"
        v-for="toast in toasts.items"
        :key="toast.id"
        :class="toast.tone"
        :role="toast.tone === 'error' ? 'alert' : 'status'"
      >
        <button class="message" type="button" @click="toasts.dismiss(toast.id)">
          {{ toast.message }}
          <span class="visually-hidden">(tap to dismiss)</span>
        </button>
        <button
          class="action"
          type="button"
          v-if="toast.action"
          @click="runAction(toast)"
        >
          {{ toast.action.label }}
        </button>
      </li>
    </TransitionGroup>
  </div>
</template>

<style scoped>
  .toasts {
    position: fixed;
    right: 0;
    bottom: calc(
      max(var(--space-4), env(safe-area-inset-bottom)) +
      var(--space-2)
    );
    left: 0;
    z-index: 40;
    padding: 0 var(--gutter-end) 0 var(--gutter);
    pointer-events: none;
  }
  .toasts.above-strip {
    bottom: calc(
      var(--strip-height) +
      env(safe-area-inset-bottom) +
      var(--space-3)
    );
  }
  .stack {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    max-width: 34rem;
    padding: 0;
    margin: 0 auto;
    list-style: none;
  }
  .toast {
    display: flex;
    align-items: stretch;
    color: var(--colour-canvas);
    pointer-events: auto;
    background: var(--colour-ink);
    border-left: 0.3rem solid transparent;
    border-radius: var(--radius-medium);
    box-shadow: var(--shadow-toast);
  }
  .toast.success {
    border-left-color: var(--colour-accept-fill);
  }
  .toast.warning {
    border-left-color: var(--colour-snooze-fill);
  }
  .toast.error {
    border-left-color: var(--colour-decline-fill);
  }
  .message {
    flex: 1;
    padding: var(--space-3) var(--space-4);
    font-size: 0.94rem;
    line-height: 1.35;
    text-align: left;
  }
  .action {
    padding: 0 var(--space-4);
    font-weight: 700;
    color: var(--colour-canvas);
    border-left: 1px solid
      color-mix(in srgb, var(--colour-canvas) 20%, transparent);
  }
  .toast-enter-active,
  .toast-leave-active {
    transition:
      opacity var(--duration-standard) var(--ease-out),
      transform var(--duration-standard) var(--ease-out);
  }
  .toast-enter-from,
  .toast-leave-to {
    opacity: 0;
    transform: translateY(0.75rem);
  }
</style>
