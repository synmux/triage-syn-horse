<script lang="ts" setup>
  import { useRouter } from "vue-router";
  import { formatFullDateTime, relativeAge } from "~/lib/format/time";
  import { issuePath } from "~/lib/routes";
  import { type HistoryEntry, useHistoryStore } from "~/stores/history";
  import { useQueueStore } from "~/stores/queue";

  const history = useHistoryStore();
  const queue = useQueueStore();
  const router = useRouter();

  const undoLabel = (entry: HistoryEntry) =>
    entry.status === "failed" ? "Try undo again" : "Undo";
</script>

<template>
  <div class="page">
    <NavBar title="Recent">
      <template #leading>
        <NuxtLink class="back" to="/">
          <AppIcon name="back" />
          <span>Triage</span>
        </NuxtLink>
      </template>
    </NavBar>

    <main class="content">
      <p class="explain">
        Actions taken on this device. Undo first checks the issue has not
        changed since, so it never overwrites someone else's work.
      </p>

      <EmptyState
        message="Accept, decline, duplicate or snooze an issue and it appears here, ready to undo."
        title="Nothing yet"
        v-if="history.entries.length === 0"
      >
        <button class="confirm neutral" type="button" @click="router.push('/')">
          Go to the queue
        </button>
      </EmptyState>

      <!-- biome-ignore lint/a11y/noRedundantRoles: Safari drops list semantics when list-style is none. -->
      <ol class="entries" role="list" v-else>
        <li
          class="entry"
          v-for="entry in history.entries"
          :key="entry.id"
          :class="entry.status"
        >
          <div class="entry-main">
            <NuxtLink class="summary" :to="issuePath(entry.issueId)">{{
              entry.summary
            }}</NuxtLink>
            <time
              class="when"
              :datetime="entry.at"
              :title="formatFullDateTime(new Date(entry.at))"
            >
              {{
                relativeAge(new Date(entry.at), queue.now) === "now" ? "just now" : `${relativeAge(new Date(entry.at), queue.now)} ago`
              }}
            </time>
            <p class="message" v-if="entry.message">{{ entry.message }}</p>
          </div>
          <div class="entry-action">
            <button
              class="undo"
              type="button"
              v-if="entry.status === 'done' || entry.status === 'failed'"
              @click="history.undo(entry.id)"
            >
              <AppIcon name="undo" :size="18" />
              {{ undoLabel(entry) }}
            </button>
            <span class="status" v-else-if="entry.status === 'undoing'"
              >Undoing…</span
            >
            <span class="status" v-else-if="entry.status === 'undone'"
              >Undone</span
            >
            <span class="status" v-else>Not undone</span>
          </div>
        </li>
      </ol>
    </main>
  </div>
</template>

<style scoped>
  .back {
    display: inline-flex;
    align-items: center;
    min-height: var(--touch);
    padding-right: var(--space-2);
    font-size: 1rem;
    color: var(--colour-focus);
    text-decoration: none;
  }
  .content {
    max-width: 44rem;
    padding: var(--space-4) var(--gutter-end)
      calc(env(safe-area-inset-bottom) + var(--space-8)) var(--gutter);
    margin: 0 auto;
  }
  .entries {
    padding: 0;
    margin: 0;
    list-style: none;
    background: var(--colour-surface);
    border-radius: var(--radius-medium);
  }
  .entry {
    display: flex;
    gap: var(--space-3);
    align-items: center;
    padding: var(--space-3) var(--space-4);
  }
  .entry + .entry {
    border-top: 1px solid var(--colour-line);
  }
  .entry-main {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
  }
  .summary {
    font-weight: 600;
    color: inherit;
    text-decoration: none;
  }
  .entry.undone .summary {
    color: var(--colour-ink-muted);
    text-decoration: line-through;
  }
  .when {
    font-size: 0.82rem;
    color: var(--colour-ink-muted);
  }
  .message {
    margin-top: var(--space-1);
    font-size: 0.85rem;
    color: var(--colour-snooze);
  }
  .entry.failed .message {
    color: var(--colour-decline);
  }
  .entry-action {
    flex: none;
  }
  .undo {
    display: inline-flex;
    gap: 0.3rem;
    align-items: center;
    min-height: var(--touch);
    padding: 0 var(--space-3);
    font-weight: 650;
    color: var(--colour-focus);
    border-radius: var(--radius-small);
  }
  .undo:active {
    background: var(--colour-press);
  }
  .status {
    font-size: 0.85rem;
    color: var(--colour-ink-muted);
  }
</style>
