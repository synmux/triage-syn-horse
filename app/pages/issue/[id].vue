<script lang="ts" setup>
  import { computed, ref, watch } from "vue";
  import { useRoute, useRouter } from "vue-router";
  import { useKeyboardShortcuts } from "~/composables/use-keyboard-shortcuts";
  import {
    type ActionHandle,
    useTriageActions,
  } from "~/composables/use-triage-actions";
  import { normaliseTitle, sourceLabel } from "~/lib/format/text";
  import {
    formatFullDateTime,
    formatShortDateTime,
    relativeAge,
  } from "~/lib/format/time";
  import { describeError } from "~/lib/linear/errors";
  import type { IssueUpdateInput, TriageIssue } from "~/lib/linear/types";
  import { issuePath } from "~/lib/routes";
  import type { StripAction } from "~/lib/triage/actions";
  import { isSnoozed, neighbours, nextAfterRemoval } from "~/lib/triage/queue";
  import { acceptState, acceptTargets } from "~/lib/triage/states";
  import { useDetailStore } from "~/stores/detail";
  import { usePreferencesStore } from "~/stores/preferences";
  import { useQueueStore } from "~/stores/queue";
  import { useSessionStore } from "~/stores/session";
  import { useToastStore } from "~/stores/toasts";
  import { useWorkspaceStore } from "~/stores/workspace";

  const route = useRoute();
  const router = useRouter();
  const queue = useQueueStore();
  const session = useSessionStore();
  const detail = useDetailStore();
  const workspace = useWorkspaceStore();
  const preferences = usePreferencesStore();
  const toasts = useToastStore();
  const actions = useTriageActions();

  const issueId = computed(() => String(route.params.id));
  const entry = computed(() => detail.entries.get(issueId.value));
  const detailIssue = computed(() => entry.value?.issue ?? null);
  /** The queue's copy is freshest (edits land there first); fall back to the detail. */
  const issue = computed<TriageIssue | null>(
    () => queue.issueById(issueId.value) ?? detailIssue.value
  );
  const team = computed(() =>
    issue.value ? workspace.teamById(issue.value.team.id) : undefined
  );
  const teamStates = computed(() =>
    team.value ? workspace.statesFor(team.value.id) : []
  );
  const state = computed(() =>
    teamStates.value.find((candidate) => candidate.id === issue.value?.state.id)
  );
  const inTriage = computed(() => state.value?.type === "triage");
  /**
   * Whether the issue shown is known to be current: it is in the queue, or
   * its detail is freshly loaded. Actions are never planned from stale data.
   */
  const settled = computed(() => {
    if (queue.issueById(issueId.value)) {
      return true;
    }
    const current = entry.value;
    return (
      current !== undefined &&
      current.issue !== null &&
      !current.loading &&
      !detail.isStale(issueId.value)
    );
  });
  const snoozedUntil = computed(() =>
    issue.value?.snoozedUntilAt && isSnoozed(issue.value, queue.now)
      ? new Date(issue.value.snoozedUntilAt)
      : null
  );
  const place = computed(() => neighbours(queue.visible, issueId.value));
  const origin = computed(() => {
    if (!issue.value) {
      return "";
    }
    const age = relativeAge(new Date(issue.value.createdAt), queue.now);
    const source = sourceLabel(issue.value.integrationSourceType);
    const byViewer =
      issue.value.creator !== null &&
      issue.value.creator.id === session.viewerId;
    const author = byViewer
      ? "you"
      : (issue.value.creator?.displayName ??
        issue.value.botActor?.name ??
        issue.value.externalUserCreator?.name);
    let by = "";
    if (source) {
      by = ` via ${source}`;
    } else if (author) {
      by = ` by ${author}`;
    }
    return age === "now" ? `Created just now${by}` : `Created ${age} ago${by}`;
  });

  const acceptOpen = ref(false);
  const declineOpen = ref(false);
  const duplicateOpen = ref(false);
  const snoozeOpen = ref(false);
  const commentOpen = ref(false);
  const titleOpen = ref(false);
  const tearing = ref<StripAction | null>(null);

  watch(
    issueId,
    (id) => {
      tearing.value = null;
      detail.load(id).catch(() => {
        // Shown from the entry's error below.
      });
    },
    { immediate: true }
  );
  watch(
    () => place.value.nextId,
    (nextId) => {
      if (nextId) {
        detail.prefetch(nextId);
      }
    },
    { immediate: true }
  );

  const reducedMotion = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pause = (milliseconds: number) =>
    new Promise((resolve) => {
      setTimeout(resolve, milliseconds);
    });

  /** Plays the tear-off, then moves on to the next issue (or the queue). */
  async function act(kind: StripAction, start: () => ActionHandle) {
    const next = nextAfterRemoval(queue.visible, issueId.value);
    const handle = start();
    if (!handle.planned) {
      return;
    }
    tearing.value = kind;
    await pause(reducedMotion() ? 0 : 320);
    if (preferences.values.autoAdvance && next) {
      await router.replace(issuePath(next));
    } else {
      await router.push("/");
    }
  }

  function onStrip(kind: StripAction) {
    const current = issue.value;
    if (!(current && settled.value)) {
      return;
    }
    if (kind === "accept") {
      act("accept", () => actions.accept(current));
    } else if (kind === "decline") {
      declineOpen.value = true;
    } else if (kind === "duplicate") {
      duplicateOpen.value = true;
    } else {
      snoozeOpen.value = true;
    }
  }

  function withIssue(run: (current: TriageIssue) => void) {
    if (issue.value) {
      run(issue.value);
    }
  }

  async function onUpdate(
    input: IssueUpdateInput,
    optimistic: Partial<TriageIssue>,
    warnings: string[]
  ) {
    const current = issue.value;
    if (!current) {
      return;
    }
    const inQueue = queue.issueById(current.id) !== undefined;
    const saved = await queue.edit(current.id, input, optimistic);
    if (saved) {
      for (const warning of warnings) {
        toasts.push({ message: warning, tone: "warning" });
      }
      if (!(inQueue && queue.issueById(current.id))) {
        detail.load(current.id, { force: true }).catch(() => {
          // Shown from the entry's error.
        });
      }
    }
  }

  async function saveTitle(title: string): Promise<boolean> {
    const current = issue.value;
    let trimmed: string;
    try {
      trimmed = normaliseTitle(title);
    } catch (failure) {
      toasts.push({ message: describeError(failure), tone: "error" });
      return false;
    }
    if (!current || trimmed === current.title) {
      return true;
    }
    const saved = await queue.edit(
      current.id,
      { title: trimmed },
      { title: trimmed }
    );
    if (saved && !queue.issueById(current.id)) {
      await detail.load(current.id, { force: true }).catch(() => undefined);
    }
    return saved;
  }

  async function postComment(body: string): Promise<boolean> {
    try {
      await detail.addComment(issueId.value, body);
      toasts.push({ message: "Comment posted", tone: "success" });
      return true;
    } catch (failure) {
      toasts.push({ message: describeError(failure), tone: "error" });
      return false;
    }
  }

  function go(targetId: string | null) {
    if (targetId) {
      router.replace(issuePath(targetId));
    }
  }

  useKeyboardShortcuts({
    "1": () => (inTriage.value ? onStrip("accept") : undefined),
    "2": () => (inTriage.value ? onStrip("decline") : undefined),
    "3": () => (inTriage.value ? onStrip("duplicate") : undefined),
    Escape: () => router.push("/"),
    h: () => (inTriage.value ? onStrip("snooze") : undefined),
    j: () => go(place.value.nextId),
    k: () => go(place.value.previousId),
  });
</script>

<template>
  <div class="page" :class="{ 'has-strip': inTriage }">
    <NavBar :title="issue?.identifier ?? 'Issue'">
      <template #leading>
        <NuxtLink class="back" to="/">
          <AppIcon name="back" />
          <span>Triage</span>
        </NuxtLink>
      </template>
      <template #compact-title>
        <span class="tabular" v-if="place.position !== null">
          {{ place.position }}
          of {{ queue.visible.length }}
        </span>
        <span v-else>{{ issue?.identifier ?? "" }}</span>
      </template>
      <template #trailing>
        <IconButton
          icon="chevronUp"
          label="Previous issue"
          :disabled="!place.previousId"
          @click="go(place.previousId)"
        />
        <IconButton
          icon="chevronDown"
          label="Next issue"
          :disabled="!place.nextId"
          @click="go(place.nextId)"
        />
        <a
          aria-label="Open in Linear"
          class="open-linear"
          rel="noopener noreferrer"
          target="_blank"
          title="Open in Linear"
          v-if="issue"
          :href="issue.url"
        >
          <AppIcon name="external" />
        </a>
      </template>
    </NavBar>

    <main class="content">
      <div
        aria-busy="true"
        class="loading"
        v-if="!issue && (!entry || entry.loading)"
      >
        <div class="bar short" />
        <div class="bar" />
        <div class="bar" />
      </div>

      <EmptyState
        title="Couldn't open this issue"
        v-else-if="!issue"
        :message="entry?.error ?? 'This issue could not be loaded.'"
      >
        <button
          class="confirm neutral"
          type="button"
          @click="detail.load(issueId, { force: true })"
        >
          Try again
        </button>
      </EmptyState>

      <article
        class="ticket"
        v-else
        :key="issueId"
        :class="{ tearing }"
        :style="{ '--team-colour': team?.color ?? 'var(--colour-line)' }"
      >
        <p class="banner" role="status" v-if="state && !inTriage">
          This issue is no longer in triage. It is in {{ state.name }}.
        </p>
        <p class="banner snoozed" role="status" v-else-if="snoozedUntil">
          <AppIcon name="clock" :size="18" />
          Snoozed until {{ formatShortDateTime(snoozedUntil) }}
          <button
            class="banner-action"
            type="button"
            @click="withIssue((current) => actions.unsnooze(current))"
          >
            Unsnooze
          </button>
        </p>

        <p class="kicker">
          <span aria-hidden="true" class="team-dot" />
          <span>{{ team?.name ?? "" }}</span>
          <span class="identifier tabular">{{ issue.identifier }}</span>
        </p>

        <button class="title-button" type="button" @click="titleOpen = true">
          <h1><IssueTitle :title="issue.title" /></h1>
          <AppIcon
            class="edit-icon"
            label="Edit title"
            name="edit"
            :size="18"
          />
        </button>

        <p class="origin">
          <time
            :datetime="issue.createdAt"
            :title="formatFullDateTime(new Date(issue.createdAt))"
            >{{
              origin
            }}</time
          >
        </p>

        <PropertyBar
          v-if="team && workspace.snapshot"
          :issue="issue"
          :labels="workspace.snapshot.labels"
          :projects="workspace.projectsFor(team.id)"
          :team="team"
          :teams="workspace.teams"
          :users="workspace.humans"
          :workspace="workspace.snapshot"
          @update="onUpdate"
        />

        <section aria-label="Description" class="description">
          <div
            aria-busy="true"
            class="loading"
            v-if="!detailIssue && entry?.loading"
          >
            <div class="bar" />
            <div class="bar short" />
          </div>
          <p
            class="muted"
            role="alert"
            v-else-if="!detailIssue && entry?.error"
          >
            {{ entry.error }}
          </p>
          <MarkdownView
            v-else-if="detailIssue?.description"
            :source="detailIssue.description"
          />
          <p class="muted" v-else-if="detailIssue">No description.</p>
        </section>

        <IssueActivity
          v-if="detailIssue"
          :detail="detailIssue"
          :now="queue.now"
          @comment="commentOpen = true"
        />
      </article>
    </main>

    <ActionStrip
      v-if="issue && inTriage"
      :disabled="!settled || queue.pending.has(issue.id)"
      :torn="tearing"
      @accept-options="acceptOpen = true"
      @act="onStrip"
    />

    <template v-if="issue && team">
      <AcceptSheet
        v-model:open="acceptOpen"
        :default-state-id="acceptState(team, teamStates).id"
        :identifier="issue.identifier"
        :targets="acceptTargets(team, teamStates)"
        @confirm="(choice) => withIssue((current) => act('accept', () => actions.accept(current, choice)))"
      />
      <DeclineSheet
        v-model:open="declineOpen"
        :identifier="issue.identifier"
        @confirm="(comment) => withIssue((current) => act('decline', () => actions.decline(current, { comment })))"
      />
      <DuplicateSheet
        v-model:open="duplicateOpen"
        :identifier="issue.identifier"
        :issue-id="issue.id"
        @confirm="(canonical) => withIssue((current) => act('duplicate', () => actions.duplicate(current, canonical)))"
      />
      <SnoozeSheet
        v-model:open="snoozeOpen"
        :identifier="issue.identifier"
        @confirm="(until) => withIssue((current) => act('snooze', () => actions.snooze(current, until)))"
      />
      <TextSheet
        label="Comment"
        placeholder="Markdown works here"
        save-label="Post comment"
        v-model:open="commentOpen"
        :save="postComment"
        :title="`Comment on ${issue.identifier}`"
      />
      <TextSheet
        label="Title"
        save-label="Save title"
        single-line
        v-model:open="titleOpen"
        :initial="issue.title"
        :rows="3"
        :save="saveTitle"
        :title="`Rename ${issue.identifier}`"
      />
    </template>
  </div>
</template>

<style scoped>
  .page {
    min-height: 100dvh;
    padding-bottom: calc(env(safe-area-inset-bottom) + var(--space-8));
  }
  .page.has-strip {
    padding-bottom: calc(
      var(--strip-height) +
      env(safe-area-inset-bottom) +
      var(--space-8)
    );
  }
  .back {
    display: inline-flex;
    align-items: center;
    min-height: var(--touch);
    padding-right: var(--space-2);
    font-size: 1rem;
    color: var(--colour-focus);
    text-decoration: none;
  }
  .open-linear {
    display: inline-grid;
    place-items: center;
    width: var(--touch);
    height: var(--touch);
    color: var(--colour-ink);
    border-radius: 50%;
  }
  .content {
    max-width: 44rem;
    padding: var(--space-3) var(--gutter-end) 0 var(--gutter);
    margin: 0 auto;
  }
  .ticket {
    transition:
      transform var(--duration-slow) var(--ease-in),
      opacity var(--duration-slow) var(--ease-in);
    animation: ticket-in var(--duration-standard) var(--ease-out);
  }
  .ticket.tearing {
    opacity: 0;
    transform: translateY(-0.75rem) rotate(-0.4deg);
  }
  @keyframes ticket-in {
    from {
      opacity: 0;
      transform: translateY(0.75rem);
    }
  }
  .banner {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    align-items: center;
    padding: var(--space-3) var(--space-4);
    margin-bottom: var(--space-4);
    font-size: 0.92rem;
    color: var(--colour-ink-muted);
    background: var(--colour-surface);
    border-radius: var(--radius-medium);
  }
  .banner.snoozed {
    color: var(--colour-snooze);
    background: color-mix(
      in srgb,
      var(--colour-snooze-fill) var(--tint-strength),
      var(--colour-surface)
    );
  }
  .banner-action {
    margin-left: auto;
    font-weight: 700;
    text-decoration: underline;
  }
  .kicker {
    display: flex;
    gap: var(--space-2);
    align-items: center;
    font-size: 0.9rem;
    color: var(--colour-ink-muted);
  }
  .team-dot {
    width: 0.6rem;
    height: 0.6rem;
    background: var(--team-colour);
    border-radius: 50%;
  }
  .identifier {
    margin-left: auto;
    font-family: var(--font-display);
    font-weight: 650;
  }
  .title-button {
    display: flex;
    gap: var(--space-2);
    align-items: flex-start;
    width: 100%;
    margin: var(--space-2) 0 var(--space-1);
    text-align: left;
  }
  .title-button h1 {
    flex: 1;
    font-size: 1.6rem;
    font-weight: 750;
    line-height: 1.2;
  }
  .edit-icon {
    flex: none;
    margin-top: 0.4rem;
    color: var(--colour-ink-faint);
  }
  .origin {
    margin-bottom: var(--space-3);
    font-size: 0.88rem;
    color: var(--colour-ink-muted);
  }
  .description {
    margin-top: var(--space-4);
  }
  .muted {
    color: var(--colour-ink-muted);
  }
  .loading {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-4) 0;
  }
  .bar {
    height: 1rem;
    background: var(--colour-surface-raised);
    border-radius: var(--radius-small);
  }
  .bar.short {
    width: 45%;
  }
</style>
