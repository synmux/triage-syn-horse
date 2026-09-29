<script lang="ts" setup>
  import { computed } from "vue";
  import { priorityLabel } from "~/lib/triage/priorities";

  const { priority, size = 16 } = defineProps<{
    priority: number;
    size?: number;
  }>();

  const label = computed(() => priorityLabel(priority));
  /** Bars filled for High (3), Medium (2) and Low (1). */
  const filledBars = computed(() => ({ 2: 3, 3: 2, 4: 1 })[priority] ?? 0);
  const bars = [
    { height: 6, x: 1.5, y: 9.5 },
    { height: 9.5, x: 6.5, y: 6 },
    { height: 13, x: 11.5, y: 2.5 },
  ];
</script>

<template>
  <svg
    class="priority"
    role="img"
    viewBox="0 0 16 16"
    :aria-label="label"
    :class="{ urgent: priority === 1 }"
    :height="size"
    :width="size"
  >
    <title>{{ label }}</title>
    <template v-if="priority === 1">
      <rect class="urgent-box" height="14" rx="3.5" width="14" x="1" y="1" />
      <rect class="urgent-mark" height="5.2" rx="1" width="2" x="7" y="4" />
      <rect class="urgent-mark" height="2" rx="1" width="2" x="7" y="10.4" />
    </template>
    <template v-else-if="priority === 0">
      <rect
        class="bar"
        height="2"
        rx="1"
        width="3"
        y="7"
        v-for="dash in [1.5, 6.5, 11.5]"
        :key="dash"
        :x="dash"
      />
    </template>
    <template v-else>
      <rect
        class="bar"
        rx="1"
        width="3"
        v-for="(bar, index) in bars"
        :key="bar.x"
        :class="{ filled: index < filledBars }"
        :height="bar.height"
        :x="bar.x"
        :y="bar.y"
      />
    </template>
  </svg>
</template>

<style scoped>
  .priority {
    flex: none;
    color: var(--colour-ink-muted);
  }
  .bar {
    opacity: 0.35;
    fill: currentColor;
  }
  .bar.filled {
    opacity: 1;
  }
  .urgent-box {
    fill: var(--colour-decline-fill);
  }
  .urgent-mark {
    fill: #ffffff;
  }
</style>
