<script lang="ts" setup>
  import { computed } from "vue";
  import { navigateTo } from "#app";
  import { useOnline } from "~/composables/use-online";
  import { usePullToRefresh } from "~/composables/use-pull-to-refresh";
  import { useTriageActions } from "~/composables/use-triage-actions";
  import type { SwipeDirection } from "~/lib/gestures";
  import { describeError } from "~/lib/linear/errors";
  import type { Label, TriageIssue } from "~/lib/linear/types";
  import { issuePath } from "~/lib/routes";
  import { usePreferencesStore } from "~/stores/preferences";
  import { useQueueStore } from "~/stores/queue";
  import { useSessionStore } from "~/stores/session";
  import { useToastStore } from "~/stores/toasts";
  import { useWorkspaceStore } from "~/stores/workspace";

  const queue = useQueueStore();
  const session = useSessionStore();
  const workspace = useWorkspaceStore();
  const preferences = usePreferencesStore();
  const toasts = useToastStore();
  const actions = useTriageActions();
  const online = useOnline();

  const refresh = () =>
    queue.refresh().catch((failure: unknown) => {
      toasts.push({ message: describeError(failure), tone: "error" });
    });
  const pull = usePullToRefresh(refresh);

  const showSnoozed = computed({
    get: () => queue.view === "snoozed",
    set: (value: boolean) => {
      queue.view = value ? "snoozed" : "active";
    },
  });

  const bucket = computed(() =>
    showSnoozed.value ? queue.counts.snoozed : queue.counts.active
  );
  const teamsInQueue = computed(() =>
    workspace.teams.filter(
      (team) =>
        (queue.counts.active.byTeam[team.id] ?? 0) +
          (queue.counts.snoozed.byTeam[team.id] ?? 0) >
          0 || queue.teamFilter === team.id
    )
  );

  const labelsOf = (issue: TriageIssue): Label[] =>
    issue.labels.nodes
      .map(({ id }) => workspace.labelById(id))
      .filter((label): label is Label => label !== undefined);

  const leftAction = computed(() =>
    preferences.values.leftSwipe === "snooze"
      ? { label: "Snooze", tone: "snooze" as const }
      : { label: "Decline", tone: "decline" as const }
  );

  function onSwipe(issue: TriageIssue, direction: SwipeDirection) {
    if (direction === "right") {
      actions.accept(issue);
    } else if (preferences.values.leftSwipe === "snooze") {
      actions.snoozeUntilTomorrow(issue);
    } else {
      actions.decline(issue);
    }
  }

  const firstIssue = computed(() => queue.visible[0]);
  const loadingFirstTime = computed(() => !queue.ready && queue.loading);
</script>

<template>
  <div class="page">
    <NavBar large :title="showSnoozed ? 'Snoozed' : 'Triage'">
      <template #title-accessory>
        <span class="count tabular">{{ bucket.all }}</span>
      </template>
      <template #trailing>
        <IconButton
          icon="history"
          label="Recent actions"
          @click="navigateTo('/recent')"
        />
        <IconButton
          icon="settings"
          label="Settings"
          @click="navigateTo('/settings')"
        />
      </template>
    </NavBar>

    <TeamFilter
      v-model:snoozed="showSnoozed"
      v-model:team="queue.teamFilter"
      :counts="bucket.byTeam"
      :snoozed-count="queue.counts.snoozed.all"
      :teams="teamsInQueue"
      :total="bucket.all"
    />

    <div
      aria-hidden="true"
      class="pull"
      :class="{ ready: pull.progress.value >= 1, refreshing: pull.refreshing.value }"
      :style="{ height: `${pull.distance.value}px` }"
    >
      <AppIcon name="refresh" :size="20" />
    </div>

    <p class="banner offline" role="status" v-if="!online">
      <AppIcon name="offline" :size="18" />
      You're offline. Actions will fail until the connection returns.
    </p>
    <p class="banner" role="status" v-else-if="queue.error && queue.ready">
      Couldn't refresh: {{ queue.error }}
      <button class="banner-action" type="button" @click="refresh">
        Try again
      </button>
    </p>

    <main>
      <ul aria-busy="true" class="skeleton" v-if="loadingFirstTime">
        <li v-for="placeholder in 5" :key="placeholder" />
      </ul>

      <EmptyState
        title="Couldn't load the queue"
        v-else-if="!queue.ready && queue.error"
        :message="queue.error"
      >
        <button class="primary" type="button" @click="refresh">
          Try again
        </button>
      </EmptyState>

      <EmptyState
        v-else-if="queue.visible.length === 0"
        :message="
          showSnoozed
            ? 'Snoozed issues come back to the queue when their time is up.'
            : 'Issues land here when they reach Triage in Linear. Pull down to check again.'
        "
        :title="showSnoozed ? 'Nothing is snoozed' : 'Triage is clear'"
      />

      <TransitionGroup class="list" name="row" tag="ul" v-else>
        <li v-for="issue in queue.visible" :key="issue.id">
          <SwipeRow
            :disabled="!preferences.values.swipeEnabled || showSnoozed || queue.pending.has(issue.id)"
            :left-action="leftAction"
            :right-action="{ label: 'Accept', tone: 'accept' }"
            @commit="(direction) => onSwipe(issue, direction)"
          >
            <IssueRow
              :issue="issue"
              :labels="labelsOf(issue)"
              :now="queue.now"
              :team="workspace.teamById(issue.team.id)"
              :viewer-id="session.viewerId"
            />
          </SwipeRow>
        </li>
      </TransitionGroup>
    </main>

    <div class="start" v-if="firstIssue && !showSnoozed">
      <NuxtLink class="start-button" :to="issuePath(firstIssue.id)">
        Start sorting
        <span class="tabular start-count">{{ queue.visible.length }}</span>
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
  .page {
    min-height: 100dvh;
    padding-bottom: calc(env(safe-area-inset-bottom) + 6rem);
  }
  .count {
    font-family: var(--font-display);
    font-size: 1.35rem;
    font-weight: 650;
    color: var(--colour-ink-muted);
  }
  .pull {
    display: grid;
    place-items: center;
    overflow: hidden;
    color: var(--colour-ink-muted);
    transition: height var(--duration-quick) var(--ease-out);
  }
  .pull.ready {
    color: var(--colour-accept);
  }
  .pull.refreshing :deep(svg) {
    animation: spin 0.9s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .banner {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    align-items: center;
    padding: var(--space-3) var(--gutter-end) var(--space-3) var(--gutter);
    font-size: 0.9rem;
    color: var(--colour-snooze);
    background: color-mix(
      in srgb,
      var(--colour-snooze-fill) var(--tint-strength),
      var(--colour-canvas)
    );
  }
  .banner-action {
    font-weight: 700;
    text-decoration: underline;
  }
  .list {
    padding: 0;
    margin: 0;
    list-style: none;
    border-top: 1px solid var(--colour-line);
  }
  .row-leave-active {
    transition:
      opacity var(--duration-standard) var(--ease-out),
      transform var(--duration-standard) var(--ease-out);
  }
  .row-leave-to {
    opacity: 0;
  }
  .row-move {
    transition: transform var(--duration-standard) var(--ease-out);
  }
  .skeleton {
    padding: 0;
    margin: 0;
    list-style: none;
  }
  .skeleton li {
    height: 5.2rem;
    margin: 0 var(--gutter-end) 1px var(--gutter);
    background: linear-gradient(
      90deg,
      var(--colour-surface) 0%,
      var(--colour-surface-raised) 50%,
      var(--colour-surface) 100%
    );
    background-size: 200% 100%;
    border-radius: var(--radius-small);
    animation: shimmer 1.4s ease-in-out infinite;
  }
  .skeleton li + li {
    margin-top: var(--space-2);
  }
  @keyframes shimmer {
    to {
      background-position: -200% 0;
    }
  }
  .primary {
    min-height: var(--touch);
    padding: 0 var(--space-5);
    font-weight: 650;
    color: var(--colour-canvas);
    background: var(--colour-ink);
    border-radius: var(--radius-medium);
  }
  .start {
    position: fixed;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 10;
    display: flex;
    justify-content: center;
    padding: var(--space-3) var(--gutter-end)
      max(var(--space-4), env(safe-area-inset-bottom)) var(--gutter);
    pointer-events: none;
    background: linear-gradient(to top, var(--colour-canvas) 55%, transparent);
  }
  .start-button {
    display: inline-flex;
    gap: var(--space-3);
    align-items: center;
    justify-content: center;
    width: min(100%, 26rem);
    min-height: 3.25rem;
    font-family: var(--font-display);
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--colour-accept-on-fill);
    text-decoration: none;
    pointer-events: auto;
    background: var(--colour-accept-fill);
    border-radius: var(--radius-pill);
    box-shadow: 0 8px 24px rgb(0 0 0 / 0.18);
  }
  .start-count {
    padding: 0 0.5rem;
    font-size: 0.9rem;
    background: rgb(0 0 0 / 0.12);
    border-radius: var(--radius-pill);
  }
</style>
