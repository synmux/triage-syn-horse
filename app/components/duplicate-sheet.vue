<script lang="ts" setup>
  import { onBeforeUnmount, ref, watch } from "vue";
  import { describeError } from "~/lib/linear/errors";
  import { SearchIssuesDocument } from "~/lib/linear/generated/graphql";
  import type { SearchResult } from "~/lib/linear/types";
  import { useSessionStore } from "~/stores/session";

  /**
   * Finds the issue this one duplicates. Searches as you type (debounced:
   * Linear allows 30 searches a minute) and ignores out-of-order answers.
   */
  const open = defineModel<boolean>("open", { required: true });
  const { identifier, issueId } = defineProps<{
    issueId: string;
    identifier: string;
  }>();
  const emit = defineEmits<{
    confirm: [canonical: { id: string; identifier: string }];
  }>();

  const session = useSessionStore();
  const term = ref("");
  const results = ref<SearchResult[]>([]);
  const searching = ref(false);
  const errorMessage = ref<string | null>(null);
  const chosen = ref<SearchResult | null>(null);
  let debounce: ReturnType<typeof setTimeout> | null = null;
  let latestRequest = 0;

  async function search(query: string) {
    latestRequest += 1;
    const request = latestRequest;
    try {
      const data = await session
        .requireClient()
        .request(SearchIssuesDocument, { term: query });
      if (request === latestRequest) {
        results.value = data.searchIssues.nodes.filter(
          (result) => result.id !== issueId
        );
      }
    } catch (failure) {
      if (request === latestRequest) {
        errorMessage.value = describeError(failure);
      }
    } finally {
      if (request === latestRequest) {
        searching.value = false;
      }
    }
  }

  watch(term, (value) => {
    if (debounce) {
      clearTimeout(debounce);
    }
    chosen.value = null;
    errorMessage.value = null;
    const query = value.trim();
    if (query.length < 2) {
      results.value = [];
      searching.value = false;
      return;
    }
    searching.value = true;
    debounce = setTimeout(() => search(query), 350);
  });

  watch(open, (isOpen) => {
    if (isOpen) {
      term.value = "";
      results.value = [];
      chosen.value = null;
      errorMessage.value = null;
    }
  });

  onBeforeUnmount(() => {
    if (debounce) {
      clearTimeout(debounce);
    }
  });

  function confirm() {
    if (!chosen.value) {
      return;
    }
    emit("confirm", {
      id: chosen.value.id,
      identifier: chosen.value.identifier,
    });
    open.value = false;
  }
</script>

<template>
  <BottomSheet v-model:open="open" :title="`${identifier} duplicates…`">
    <label class="search">
      <AppIcon name="search" :size="18" />
      <span class="visually-hidden">Search issues</span>
      <input
        autocomplete="off"
        autofocus
        enterkeyhint="search"
        placeholder="Title or identifier"
        type="search"
        v-model="term"
      >
    </label>
    <p aria-live="polite" class="status">
      <template v-if="errorMessage">{{ errorMessage }}</template>
      <template v-else-if="searching">Searching…</template>
      <template v-else-if="term.trim().length < 2">
        Type at least two characters.
      </template>
      <template v-else-if="results.length === 0">
        No issues match “{{ term.trim() }}”.
      </template>
    </p>
    <!-- biome-ignore lint/a11y/noRedundantRoles: Safari drops list semantics when list-style is none. -->
    <ul class="results" role="list">
      <li v-for="result in results" :key="result.id">
        <button
          class="result"
          type="button"
          :aria-pressed="chosen?.id === result.id"
          :data-issue-id="result.id"
          @click="chosen = result"
        >
          <span class="result-top">
            <span class="identifier tabular">{{ result.identifier }}</span>
            <span class="state">
              <span
                aria-hidden="true"
                class="dot"
                :style="{ background: result.state.color }"
              />
              {{ result.state.name }}
            </span>
          </span>
          <IssueTitle class="result-title" :title="result.title" />
        </button>
      </li>
    </ul>
    <template #footer>
      <button
        class="confirm duplicate"
        type="button"
        :disabled="!chosen"
        @click="confirm"
      >
        {{
          chosen ? `Mark as duplicate of ${chosen.identifier}` : "Choose the original issue"
        }}
      </button>
    </template>
  </BottomSheet>
</template>

<style scoped>
  .search {
    display: flex;
    gap: var(--space-2);
    align-items: center;
    padding: 0 var(--space-3);
    color: var(--colour-ink-muted);
    background: var(--colour-surface-raised);
    border-radius: var(--radius-medium);
  }
  .search input {
    flex: 1;
    min-height: var(--touch);
    color: var(--colour-ink);
    outline: none;
    background: none;
    border: 0;
  }
  .status {
    min-height: 1.4em;
    margin: var(--space-2) 0;
    font-size: 0.9rem;
    color: var(--colour-ink-muted);
  }
  .results {
    padding: 0;
    margin: 0;
    list-style: none;
  }
  .result {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    width: 100%;
    padding: var(--space-3) var(--space-2);
    text-align: left;
    border-radius: var(--radius-small);
  }
  .result[aria-pressed="true"] {
    background: color-mix(
      in srgb,
      var(--colour-duplicate-fill) var(--tint-strength),
      var(--colour-surface)
    );
    box-shadow: inset 0 0 0 2px var(--colour-duplicate-fill);
  }
  .result-top {
    display: flex;
    justify-content: space-between;
    font-size: 0.85rem;
    color: var(--colour-ink-muted);
  }
  .identifier {
    font-family: var(--font-display);
    font-weight: 650;
  }
  .state {
    display: inline-flex;
    gap: 0.35rem;
    align-items: center;
  }
  .dot {
    width: 0.55rem;
    height: 0.55rem;
    border-radius: 50%;
  }
  .result-title {
    font-weight: 560;
  }
</style>
