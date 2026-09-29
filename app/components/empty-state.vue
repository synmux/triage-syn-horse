<script lang="ts" setup>
  const { message, title } = defineProps<{ title: string; message: string }>();
</script>

<template>
  <section class="empty">
    <svg
      aria-hidden="true"
      class="mark"
      height="71"
      viewBox="136 104 240 304"
      width="56"
    >
      <rect class="tag" height="304" rx="30" width="240" x="136" y="104" />
      <circle class="hole" cx="256" cy="148" r="15" />
      <rect
        fill="var(--colour-decline-fill)"
        height="52"
        rx="9"
        width="36"
        x="156"
        y="334"
      />
      <rect
        fill="var(--colour-duplicate-fill)"
        height="52"
        rx="9"
        width="36"
        x="198"
        y="334"
      />
      <rect
        fill="var(--colour-snooze-fill)"
        height="52"
        rx="9"
        width="36"
        x="240"
        y="334"
      />
      <rect
        fill="var(--colour-accept-fill)"
        height="52"
        rx="9"
        width="74"
        x="282"
        y="334"
      />
    </svg>
    <h2>{{ title }}</h2>
    <p>{{ message }}</p>
    <div class="actions" v-if="$slots.default">
      <slot />
    </div>
  </section>
</template>

<style scoped>
  .empty {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    align-items: center;
    padding: var(--space-8) var(--gutter-end) var(--space-8) var(--gutter);
    text-align: center;
  }
  .tag {
    fill: var(--colour-surface-raised);
    stroke: var(--colour-line);
    stroke-width: 4;
  }
  .hole {
    fill: var(--colour-canvas);
  }
  h2 {
    font-size: 1.35rem;
    font-weight: 700;
  }
  p {
    max-width: 26rem;
    color: var(--colour-ink-muted);
  }
  .actions {
    display: flex;
    gap: var(--space-3);
    margin-top: var(--space-2);
  }
</style>
