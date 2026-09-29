<script lang="ts" setup>
  import { onBeforeUnmount, onMounted, ref, useTemplateRef } from "vue";

  /**
   * An iOS-style navigation bar. With `large`, the title is shown big under
   * the bar and hands over to the compact title once it scrolls away.
   */
  const { large = false, title } = defineProps<{
    title: string;
    large?: boolean;
  }>();

  const largeTitle = useTemplateRef<HTMLElement>("largeTitle");
  const compact = ref(!large);
  let observer: IntersectionObserver | null = null;

  onMounted(() => {
    if (!(large && largeTitle.value)) {
      return;
    }
    observer = new IntersectionObserver(
      ([entry]) => {
        compact.value = !entry?.isIntersecting;
      },
      { rootMargin: "-56px 0px 0px 0px" }
    );
    observer.observe(largeTitle.value);
  });

  onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
  <header class="nav" :class="{ compact }">
    <div class="bar">
      <div class="leading">
        <slot name="leading" />
      </div>
      <p
        class="compact-title"
        :aria-hidden="large && !compact ? 'true' : undefined"
      >
        <slot name="compact-title">{{ title }}</slot>
      </p>
      <div class="trailing">
        <slot name="trailing" />
      </div>
    </div>
  </header>
  <div class="large" v-if="large" ref="largeTitle">
    <h1>{{ title }}</h1>
    <slot name="title-accessory" />
  </div>
  <h1 class="visually-hidden" v-else>{{ title }}</h1>
</template>

<style scoped>
  .nav {
    position: sticky;
    top: 0;
    z-index: 20;
    padding-top: env(safe-area-inset-top);
    background: color-mix(in srgb, var(--colour-canvas) 84%, transparent);
    border-bottom: 1px solid transparent;
    -webkit-backdrop-filter: saturate(180%) blur(18px);
    backdrop-filter: saturate(180%) blur(18px);
    transition: border-color var(--duration-standard) var(--ease-out);
  }
  .nav.compact {
    border-bottom-color: var(--colour-line);
  }
  .bar {
    display: grid;
    grid-template-columns: minmax(var(--touch), 1fr) auto minmax(
        var(--touch),
        1fr
      );
    align-items: center;
    min-height: 3rem;
    padding: 0 calc(var(--gutter-end) - var(--space-2)) 0
      calc(var(--gutter) - var(--space-2));
  }
  .leading,
  .trailing {
    display: flex;
    align-items: center;
  }
  .trailing {
    justify-content: flex-end;
  }
  .compact-title {
    overflow: hidden;
    text-overflow: ellipsis;
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 650;
    text-align: center;
    white-space: nowrap;
    opacity: 0;
    transition: opacity var(--duration-quick) var(--ease-out);
  }
  .nav.compact .compact-title {
    opacity: 1;
  }
  .large {
    display: flex;
    gap: var(--space-3);
    align-items: baseline;
    padding: var(--space-1) var(--gutter-end) var(--space-3) var(--gutter);
  }
  .large h1 {
    font-size: 2.1rem;
    font-weight: 750;
  }
</style>
