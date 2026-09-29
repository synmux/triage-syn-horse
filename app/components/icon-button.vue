<script lang="ts" setup>
  import type { IconName } from "~/lib/icons";

  const { icon, label } = defineProps<{
    icon: IconName;
    /** Accessible name, also shown as a tooltip on pointer devices. */
    label: string;
  }>();
</script>

<template>
  <button class="icon-button" type="button" :aria-label="label" :title="label">
    <AppIcon :name="icon" />
  </button>
</template>

<style scoped>
  .icon-button {
    display: inline-grid;
    place-items: center;
    width: var(--touch);
    height: var(--touch);
    color: var(--colour-ink);
    border-radius: 50%;
    transition: background-color var(--duration-quick) var(--ease-out);
  }
  .icon-button:active:not(:disabled) {
    background: var(--colour-press);
  }
</style>
