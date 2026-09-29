<script lang="ts" setup>
  import { computed } from "vue";
  import { sourceLabel } from "~/lib/format/text";
  import {
    formatDueDate,
    formatShortDateTime,
    isOverdue,
    relativeAge,
  } from "~/lib/format/time";
  import type { Label, Team, TriageIssue } from "~/lib/linear/types";
  import { issuePath } from "~/lib/routes";
  import { estimateLabel } from "~/lib/triage/estimates";
  import { isSnoozed } from "~/lib/triage/queue";

  /** One triage issue in the queue: team stripe, identifier, title, facts. */
  const { issue, labels, now, team, viewerId } = defineProps<{
    issue: TriageIssue;
    team: Team | undefined;
    labels: Label[];
    now: Date;
    /** The signed-in user: their own issues show no author line. */
    viewerId: string | null;
  }>();

  /** Who or what raised the issue, omitted when it was the viewer. */
  const origin = computed(() => {
    const source = sourceLabel(issue.integrationSourceType);
    if (source) {
      return `via ${source}`;
    }
    if (issue.creator && issue.creator.id !== viewerId) {
      return issue.creator.displayName;
    }
    return issue.botActor?.name ?? issue.externalUserCreator?.name ?? null;
  });
  const age = computed(() => relativeAge(new Date(issue.createdAt), now));
  const estimate = computed(() =>
    team ? estimateLabel(team, issue.estimate) : null
  );
  const dueDate = computed(() =>
    issue.dueDate
      ? {
          label: formatDueDate(issue.dueDate, now),
          overdue: isOverdue(issue.dueDate, now),
        }
      : null
  );
  const snoozedUntil = computed(() =>
    issue.snoozedUntilAt && isSnoozed(issue, now)
      ? formatShortDateTime(new Date(issue.snoozedUntilAt))
      : null
  );
  const visibleLabels = computed(() => labels.slice(0, 3));
  const hiddenLabelCount = computed(
    () => labels.length - visibleLabels.value.length
  );
</script>

<template>
  <NuxtLink
    class="issue-row"
    :style="{ '--team-colour': team?.color ?? 'var(--colour-line)' }"
    :to="issuePath(issue.id)"
  >
    <span aria-hidden="true" class="stripe" />
    <span class="top">
      <span class="identifier tabular">{{ issue.identifier }}</span>
      <span class="facts">
        <PriorityIcon :priority="issue.priority" />
        <span class="age tabular"
          ><span class="visually-hidden">Created </span>{{ age
          }}<span class="visually-hidden"> ago</span></span
        >
      </span>
    </span>
    <IssueTitle class="title" :title="issue.title" />
    <span
      class="meta"
      v-if="origin || snoozedUntil || labels.length || estimate || dueDate"
    >
      <span class="snoozed" v-if="snoozedUntil">
        <AppIcon name="clock" :size="14" />
        Until {{ snoozedUntil }}
      </span>
      <span class="origin" v-else-if="origin">{{ origin }}</span>
      <span class="estimate tabular" v-if="estimate">{{ estimate }}</span>
      <span
        class="due tabular"
        v-if="dueDate"
        :class="{ overdue: dueDate.overdue }"
      >
        <AppIcon name="calendar" :size="14" />
        <span class="visually-hidden">{{
          dueDate.overdue ? "Overdue, was due" : "Due"
        }}</span>
        {{ dueDate.label }}
      </span>
      <span
        class="label"
        v-for="label in visibleLabels"
        :key="label.id"
        :style="{ '--label-colour': label.color }"
        >{{
          label.name
        }}</span
      >
      <span class="label more" v-if="hiddenLabelCount > 0"
        >+{{ hiddenLabelCount }}</span
      >
    </span>
  </NuxtLink>
</template>

<style scoped>
  .issue-row {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    padding: var(--space-3) var(--gutter-end) var(--space-3)
      calc(var(--gutter) + 0.35rem);
    color: inherit;
    text-decoration: none;
    border-bottom: 1px solid var(--colour-line);
  }
  .issue-row:active {
    background: var(--colour-press);
  }
  .stripe {
    position: absolute;
    top: var(--space-3);
    bottom: var(--space-3);
    left: calc(var(--gutter) - 0.35rem);
    width: 0.25rem;
    background: var(--team-colour);
    border-radius: var(--radius-pill);
  }
  .top {
    display: flex;
    gap: var(--space-3);
    align-items: center;
    justify-content: space-between;
  }
  .identifier {
    font-family: var(--font-display);
    font-size: 0.85rem;
    font-weight: 650;
    color: var(--colour-ink-muted);
  }
  .facts {
    display: inline-flex;
    gap: var(--space-2);
    align-items: center;
    font-size: 0.85rem;
    color: var(--colour-ink-muted);
  }
  .title {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    overflow: hidden;
    -webkit-line-clamp: 2;
    font-weight: 560;
    line-height: 1.3;
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1) var(--space-2);
    align-items: center;
    margin-top: 0.1rem;
    font-size: 0.82rem;
    color: var(--colour-ink-muted);
  }
  .snoozed {
    display: inline-flex;
    gap: 0.25rem;
    align-items: center;
    color: var(--colour-snooze);
  }
  .estimate {
    padding: 0 0.4rem;
    font-weight: 650;
    border: 1px solid var(--colour-line);
    border-radius: var(--radius-small);
  }
  .due {
    display: inline-flex;
    gap: 0.25rem;
    align-items: center;
  }
  .due.overdue {
    font-weight: 650;
    color: var(--colour-decline);
  }
  .label {
    display: inline-flex;
    gap: 0.3rem;
    align-items: center;
    padding: 0 0.45rem;
    border: 1px solid var(--colour-line);
    border-radius: var(--radius-pill);
  }
  .label::before {
    width: 0.45rem;
    height: 0.45rem;
    content: "";
    background: var(--label-colour, var(--colour-ink-faint));
    border-radius: 50%;
  }
  .label.more::before {
    display: none;
  }
</style>
