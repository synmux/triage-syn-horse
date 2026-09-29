<script lang="ts" setup>
  import { type IconName, iconPaths } from "~/lib/icons";

  const {
    label,
    name,
    size = 22,
  } = defineProps<{
    name: IconName;
    size?: number;
    /** Accessible name; omit for decorative icons next to visible text. */
    label?: string;
  }>();
</script>

<template>
  <svg
    fill="none"
    focusable="false"
    stroke="currentColor"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="2"
    viewBox="0 0 24 24"
    :aria-hidden="label ? undefined : 'true'"
    :aria-label="label"
    :height="size"
    :role="label ? 'img' : undefined"
    :width="size"
  >
    <title v-if="label">{{ label }}</title>
    <path v-for="path in iconPaths[name]" :key="path" :d="path" />
  </svg>
</template>
