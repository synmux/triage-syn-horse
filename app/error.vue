<script lang="ts" setup>
  import { computed } from "vue";
  import { clearError, type NuxtError } from "#app";

  const { error: nuxtError } = defineProps<{ error: NuxtError }>();

  const missing = computed(() => nuxtError.statusCode === 404);
</script>

<template>
  <main class="error-page">
    <EmptyState
      :message="missing ? 'This link does not match anything in Triage.' : nuxtError.message || 'Something went wrong while showing this screen.'"
      :title="missing ? 'There is nothing here' : 'Triage hit a problem'"
    >
      <button class="home" type="button" @click="clearError({ redirect: '/' })">
        Back to Triage
      </button>
    </EmptyState>
  </main>
</template>

<style scoped>
  .error-page {
    display: grid;
    place-items: center;
    min-height: 100dvh;
  }
  .home {
    min-height: var(--touch);
    padding: 0 var(--space-5);
    font-weight: 650;
    color: var(--colour-canvas);
    background: var(--colour-ink);
    border-radius: var(--radius-medium);
  }
</style>
