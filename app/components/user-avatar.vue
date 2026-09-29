<script lang="ts" setup>
  import { computed, ref } from "vue";

  const {
    name,
    size = 22,
    url = null,
  } = defineProps<{
    name: string;
    url?: string | null;
    size?: number;
  }>();

  const failed = ref(false);
  const initial = computed(() => name.trim().charAt(0).toUpperCase() || "?");
</script>

<template>
  <!-- biome-ignore lint/a11y/noNoninteractiveElementInteractions: the error event is a load failure, not a user interaction. -->
  <img
    alt=""
    class="avatar"
    loading="lazy"
    referrerpolicy="no-referrer"
    v-if="url && !failed"
    :height="size"
    :src="url"
    :width="size"
    @error="failed = true"
  >
  <span
    aria-hidden="true"
    class="avatar fallback"
    v-else
    :style="{ fontSize: `${size * 0.5}px`, height: `${size}px`, width: `${size}px` }"
    >{{
      initial
    }}</span
  >
</template>

<style scoped>
  .avatar {
    flex: none;
    object-fit: cover;
    background: var(--colour-surface-raised);
    border-radius: 50%;
  }
  .fallback {
    display: inline-grid;
    place-items: center;
    font-family: var(--font-display);
    font-weight: 600;
    color: var(--colour-ink-muted);
  }
</style>
