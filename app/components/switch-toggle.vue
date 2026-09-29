<script lang="ts" setup>
  const checked = defineModel<boolean>({ required: true });
  const { label, hint } = defineProps<{ label: string; hint?: string }>();
</script>

<template>
  <button
    class="row"
    role="switch"
    type="button"
    :aria-checked="checked"
    @click="checked = !checked"
  >
    <span class="text">
      <span class="label">{{ label }}</span>
      <span class="hint" v-if="hint">{{ hint }}</span>
    </span>
    <span aria-hidden="true" class="track" :class="{ on: checked }">
      <span class="thumb" />
    </span>
  </button>
</template>

<style scoped>
  .row {
    display: flex;
    gap: var(--space-4);
    align-items: center;
    width: 100%;
    min-height: 3.25rem;
    padding: var(--space-2) 0;
    text-align: left;
  }
  .text {
    display: flex;
    flex: 1;
    flex-direction: column;
  }
  .hint {
    font-size: 0.85rem;
    color: var(--colour-ink-muted);
  }
  .track {
    position: relative;
    flex: none;
    width: 3.1rem;
    height: 1.9rem;
    background: var(--colour-line);
    border-radius: var(--radius-pill);
    transition: background-color var(--duration-standard) var(--ease-out);
  }
  .track.on {
    background: var(--colour-accept-fill);
  }
  .thumb {
    position: absolute;
    top: 0.15rem;
    left: 0.15rem;
    width: 1.6rem;
    height: 1.6rem;
    background: #ffffff;
    border-radius: 50%;
    box-shadow: 0 2px 6px rgb(0 0 0 / 0.25);
    transition: transform var(--duration-standard) var(--ease-out);
  }
  .track.on .thumb {
    transform: translateX(1.2rem);
  }
</style>
