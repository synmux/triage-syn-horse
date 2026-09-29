<script lang="ts" setup>
  import { computed } from "vue";
  import { titleSegments } from "~/lib/format/text";

  /** An issue title with `inline code` styled, rendered without HTML. */
  const { title } = defineProps<{ title: string }>();
  const segments = computed(() => titleSegments(title));
</script>

<template>
  <span class="issue-title"
    ><template v-for="(segment, index) in segments" :key="index"
      ><code v-if="segment.code">{{ segment.text }}</code
      ><template v-else>{{ segment.text }}</template></template
    ></span
  >
</template>

<style scoped>
  code {
    padding: 0.05em 0.3em;
    font-family: ui-monospace, "SF Mono", Menlo, monospace;
    font-size: 0.88em;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 0.3em;
  }
</style>
