<script lang="ts" setup>
  import type { Team } from "~/lib/linear/types";

  /** Horizontally scrolling chips: all teams, each team, and the snoozed view. */
  const selectedTeam = defineModel<string | null>("team", { required: true });
  const showSnoozed = defineModel<boolean>("snoozed", { required: true });
  const { counts, snoozedCount, teams, total } = defineProps<{
    teams: Team[];
    counts: Record<string, number>;
    total: number;
    snoozedCount: number;
  }>();
</script>

<template>
  <nav aria-label="Filter the queue" class="filters">
    <button
      class="chip"
      type="button"
      :aria-pressed="selectedTeam === null"
      @click="selectedTeam = null"
    >
      All <span class="count tabular">{{ total }}</span>
    </button>
    <button
      class="chip"
      type="button"
      v-for="team in teams"
      :key="team.id"
      :aria-label="`${team.name} (${counts[team.id] ?? 0})`"
      :aria-pressed="selectedTeam === team.id"
      :style="{ '--team-colour': team.color ?? 'var(--colour-line)' }"
      @click="selectedTeam = selectedTeam === team.id ? null : team.id"
    >
      <span aria-hidden="true" class="dot" />
      {{ team.key }}
      <span class="count tabular">{{ counts[team.id] ?? 0 }}</span>
    </button>
    <button
      class="chip snoozed"
      type="button"
      v-if="snoozedCount > 0 || showSnoozed"
      :aria-pressed="showSnoozed"
      @click="showSnoozed = !showSnoozed"
    >
      <AppIcon name="clock" :size="15" />
      Snoozed <span class="count tabular">{{ snoozedCount }}</span>
    </button>
  </nav>
</template>

<style scoped>
  /* Positioned so absolutely positioned descendants cannot widen the page. */
  .filters {
    position: relative;
    display: flex;
    gap: var(--space-2);
    padding: var(--space-1) var(--gutter-end) var(--space-3) var(--gutter);
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scrollbar-width: none;
  }
  .filters::-webkit-scrollbar {
    display: none;
  }
  .chip {
    display: inline-flex;
    flex: none;
    gap: 0.35rem;
    align-items: center;
    min-height: 2.25rem;
    padding: 0 0.8rem;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--colour-ink-muted);
    background: var(--colour-surface);
    border: 1px solid var(--colour-line);
    border-radius: var(--radius-pill);
  }
  .chip[aria-pressed="true"] {
    color: var(--colour-canvas);
    background: var(--colour-ink);
    border-color: var(--colour-ink);
  }
  .dot {
    width: 0.55rem;
    height: 0.55rem;
    background: var(--team-colour);
    border-radius: 50%;
  }
  .count {
    font-weight: 500;
    opacity: 0.75;
  }
  .snoozed:not([aria-pressed="true"]) {
    color: var(--colour-snooze);
  }
</style>
