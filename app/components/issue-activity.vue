<script lang="ts" setup>
  import { computed } from "vue";
  import { relativeAge } from "~/lib/format/time";
  import type { IssueDetail } from "~/lib/linear/types";
  import { describeRelations, threadComments } from "~/lib/triage/activity";

  /** Attachments, relations and the comment thread under an issue. */
  const { detail, now } = defineProps<{ detail: IssueDetail; now: Date }>();
  const emit = defineEmits<{ comment: [] }>();

  const comments = computed(() => threadComments(detail.comments.nodes));
  const relations = computed(() => describeRelations(detail));

  const authorOf = (comment: IssueDetail["comments"]["nodes"][number]) => ({
    avatarUrl:
      comment.user?.avatarUrl ??
      comment.botActor?.avatarUrl ??
      comment.externalUser?.avatarUrl ??
      null,
    name:
      comment.user?.displayName ??
      comment.botActor?.name ??
      comment.externalUser?.name ??
      "Someone",
  });
</script>

<template>
  <section
    aria-labelledby="attachments-heading"
    class="block"
    v-if="detail.attachments.nodes.length > 0"
  >
    <h2 class="block-title" id="attachments-heading">Links</h2>
    <!-- biome-ignore lint/a11y/noRedundantRoles: Safari drops list semantics when list-style is none. -->
    <ul class="items" role="list">
      <li v-for="attachment in detail.attachments.nodes" :key="attachment.id">
        <a
          class="item"
          rel="noopener noreferrer"
          target="_blank"
          :href="attachment.url"
        >
          <AppIcon name="paperclip" :size="18" />
          <span class="item-text">
            <span class="item-title">{{ attachment.title }}</span>
            <span class="item-hint" v-if="attachment.subtitle">{{
              attachment.subtitle
            }}</span>
          </span>
          <AppIcon name="external" :size="16" />
        </a>
      </li>
    </ul>
  </section>

  <section
    aria-labelledby="relations-heading"
    class="block"
    v-if="relations.length > 0"
  >
    <h2 class="block-title" id="relations-heading">Related issues</h2>
    <!-- biome-ignore lint/a11y/noRedundantRoles: Safari drops list semantics when list-style is none. -->
    <ul class="items" role="list">
      <li v-for="relation in relations" :key="relation.id">
        <NuxtLink class="item" :to="`/issue/${relation.issue.id}`">
          <AppIcon name="link" :size="18" />
          <span class="item-text">
            <span class="item-hint"
              >{{ relation.label }} {{ relation.issue.identifier }},
              {{ relation.issue.state.name }}</span
            >
            <IssueTitle class="item-title" :title="relation.issue.title" />
          </span>
        </NuxtLink>
      </li>
    </ul>
  </section>

  <section aria-labelledby="comments-heading" class="block">
    <div class="block-header">
      <h2 class="block-title" id="comments-heading">
        Comments
        <span class="tabular muted" v-if="comments.length">{{
          comments.length
        }}</span>
      </h2>
      <button class="add-comment" type="button" @click="emit('comment')">
        <AppIcon name="comment" :size="18" />
        Add comment
      </button>
    </div>
    <!-- biome-ignore lint/a11y/noRedundantRoles: Safari drops list semantics when list-style is none. -->
    <ol class="comments" role="list" v-if="comments.length > 0">
      <li
        class="comment"
        v-for="{ comment, depth } in comments"
        :key="comment.id"
        :class="{ reply: depth > 0 }"
      >
        <div class="comment-head">
          <UserAvatar
            :name="authorOf(comment).name"
            :size="22"
            :url="authorOf(comment).avatarUrl"
          />
          <span class="comment-author">{{ authorOf(comment).name }}</span>
          <time class="muted tabular" :datetime="comment.createdAt">{{
            relativeAge(new Date(comment.createdAt), now)
          }}</time>
        </div>
        <MarkdownView class="comment-body" :source="comment.body" />
      </li>
    </ol>
    <p class="muted" v-else>No comments yet.</p>
  </section>
</template>

<style scoped>
  .block {
    margin-top: var(--space-6);
  }
  .block-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .block-title {
    margin-bottom: var(--space-2);
    font-size: 1.02rem;
    font-weight: 700;
  }
  .muted {
    font-weight: 500;
    color: var(--colour-ink-muted);
  }
  .items {
    padding: 0;
    margin: 0;
    list-style: none;
    background: var(--colour-surface);
    border-radius: var(--radius-medium);
  }
  .items li + li {
    border-top: 1px solid var(--colour-line);
  }
  .item {
    display: flex;
    gap: var(--space-3);
    align-items: center;
    min-height: 3rem;
    padding: var(--space-2) var(--space-3);
    color: inherit;
    text-decoration: none;
  }
  .item > :first-child,
  .item > :last-child {
    flex: none;
    color: var(--colour-ink-muted);
  }
  .item-text {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
  }
  .item-title {
    font-weight: 560;
  }
  .item-hint {
    font-size: 0.82rem;
    color: var(--colour-ink-muted);
  }
  .add-comment {
    display: inline-flex;
    gap: 0.35rem;
    align-items: center;
    min-height: var(--touch);
    font-weight: 600;
    color: var(--colour-focus);
  }
  .comments {
    padding: 0;
    margin: 0;
    list-style: none;
  }
  .comment {
    padding: var(--space-3) 0;
    border-top: 1px solid var(--colour-line);
  }
  .comment.reply {
    padding-left: var(--space-3);
    margin-left: 0.7rem;
    border-top: 0;
    border-left: 2px solid var(--colour-line);
  }
  .comment-head {
    display: flex;
    gap: var(--space-2);
    align-items: center;
    margin-bottom: var(--space-1);
    font-size: 0.88rem;
  }
  .comment-author {
    font-weight: 650;
  }
  .comment-body {
    font-size: 0.95rem;
  }
</style>
