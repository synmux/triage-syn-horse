<script lang="ts" setup>
  import { computed } from "vue";
  import { renderMarkdown } from "~/lib/format/markdown";

  /**
   * Linear markdown, rendered through renderMarkdown() (markdown-it with
   * raw HTML off, then DOMPurify). This is the app's only v-html.
   */
  const { source } = defineProps<{ source: string | null | undefined }>();
  const html = computed(() => renderMarkdown(source));
</script>

<template>
  <div class="markdown" v-html="html" />
</template>

<style scoped>
  .markdown {
    line-height: 1.55;
    overflow-wrap: anywhere;
  }
  .markdown > :deep(* + *) {
    margin-top: 0.75em;
  }
  .markdown :deep(h1),
  .markdown :deep(h2),
  .markdown :deep(h3),
  .markdown :deep(h4) {
    margin-top: 1.2em;
    font-size: 1.05rem;
    font-weight: 700;
  }
  .markdown :deep(h1) {
    font-size: 1.2rem;
  }
  .markdown :deep(ul),
  .markdown :deep(ol) {
    padding-left: 1.3em;
  }
  .markdown :deep(li + li) {
    margin-top: 0.25em;
  }
  .markdown :deep(a) {
    color: var(--colour-focus);
    text-decoration-thickness: 1px;
    text-underline-offset: 2px;
  }
  .markdown :deep(code) {
    padding: 0.05em 0.3em;
    font-family: ui-monospace, "SF Mono", Menlo, monospace;
    font-size: 0.88em;
    background: var(--colour-surface-raised);
    border-radius: 0.3em;
  }
  .markdown :deep(pre) {
    max-width: 100%;
    padding: var(--space-3);
    overflow-x: auto;
    background: var(--colour-surface-raised);
    border-radius: var(--radius-small);
  }
  .markdown :deep(pre code) {
    padding: 0;
    background: none;
  }
  .markdown :deep(blockquote) {
    padding-left: var(--space-3);
    margin: 0;
    color: var(--colour-ink-muted);
    border-left: 3px solid var(--colour-line);
  }
  .markdown :deep(img) {
    display: block;
    height: auto;
    border-radius: var(--radius-small);
  }
  .markdown :deep(.md-scroll) {
    max-width: 100%;
    overflow-x: auto;
  }
  .markdown :deep(table) {
    font-size: 0.9rem;
    border-collapse: collapse;
  }
  .markdown :deep(th),
  .markdown :deep(td) {
    padding: 0.35em 0.6em;
    text-align: left;
    border: 1px solid var(--colour-line);
  }
  .markdown :deep(hr) {
    border: 0;
    border-top: 1px solid var(--colour-line);
  }
</style>
