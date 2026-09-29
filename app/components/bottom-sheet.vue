<script lang="ts" setup>
  import {
    computed,
    nextTick,
    onBeforeUnmount,
    ref,
    useId,
    useTemplateRef,
    watch,
  } from "vue";

  /**
   * A modal sheet that rises from the bottom edge. Traps focus, closes on
   * Escape, a tap on the backdrop, or a downward drag of the handle, and
   * returns focus to whatever opened it.
   */
  const open = defineModel<boolean>("open", { required: true });
  const { title } = defineProps<{ title: string }>();

  const titleId = useId();
  const panel = useTemplateRef<HTMLElement>("panel");
  const dragOffset = ref(0);
  let dragStartY: number | null = null;
  let previouslyFocused: HTMLElement | null = null;

  const focusableSelector =
    'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

  const close = () => {
    open.value = false;
  };

  watch(open, async (isOpen) => {
    if (isOpen) {
      previouslyFocused = document.activeElement as HTMLElement | null;
      document.documentElement.classList.add("sheet-open");
      document.addEventListener("keydown", onKeydown, true);
      await nextTick();
      const autofocus = panel.value?.querySelector<HTMLElement>("[autofocus]");
      (autofocus ?? panel.value)?.focus();
    } else {
      document.documentElement.classList.remove("sheet-open");
      document.removeEventListener("keydown", onKeydown, true);
      dragOffset.value = 0;
      previouslyFocused?.focus?.();
    }
  });

  function trapTab(event: KeyboardEvent) {
    const focusable = [
      ...(panel.value?.querySelectorAll<HTMLElement>(focusableSelector) ?? []),
    ];
    const first = focusable.at(0);
    const last = focusable.at(-1);
    if (!(first && last)) {
      event.preventDefault();
      return;
    }
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.stopPropagation();
      close();
    } else if (event.key === "Tab") {
      trapTab(event);
    }
  }

  function startDrag(event: PointerEvent) {
    dragStartY = event.clientY;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  function moveDrag(event: PointerEvent) {
    if (dragStartY !== null) {
      dragOffset.value = Math.max(0, event.clientY - dragStartY);
    }
  }

  function endDrag() {
    if (dragStartY === null) {
      return;
    }
    dragStartY = null;
    if (dragOffset.value > 110) {
      close();
    } else {
      dragOffset.value = 0;
    }
  }

  const panelStyle = computed(() =>
    dragOffset.value > 0
      ? { transform: `translateY(${dragOffset.value}px)`, transition: "none" }
      : undefined
  );

  onBeforeUnmount(() => {
    document.removeEventListener("keydown", onKeydown, true);
    document.documentElement.classList.remove("sheet-open");
  });
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div class="sheet-root" v-if="open">
        <div aria-hidden="true" class="scrim" @click="close" />
        <section
          aria-modal="true"
          class="panel"
          role="dialog"
          tabindex="-1"
          ref="panel"
          :aria-labelledby="titleId"
          :style="panelStyle"
        >
          <div
            class="handle-area"
            @pointercancel="endDrag"
            @pointerdown="startDrag"
            @pointermove="moveDrag"
            @pointerup="endDrag"
          >
            <span aria-hidden="true" class="handle" />
          </div>
          <header class="header">
            <h2 :id="titleId">{{ title }}</h2>
            <IconButton icon="close" label="Close" @click="close" />
          </header>
          <div class="content">
            <slot />
          </div>
          <footer class="footer" v-if="$slots.footer">
            <slot name="footer" />
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
  .sheet-root {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
  }
  .scrim {
    position: absolute;
    inset: 0;
    background: var(--colour-scrim);
  }
  .panel {
    position: relative;
    display: flex;
    flex-direction: column;
    max-height: min(88dvh, calc(100dvh - env(safe-area-inset-top) - 2rem));
    margin-bottom: var(--keyboard-inset, 0px);
    outline: none;
    background: var(--colour-surface);
    border-radius: var(--radius-large) var(--radius-large) 0 0;
    box-shadow: var(--shadow-sheet);
    transition: transform var(--duration-standard) var(--ease-out);
  }
  .handle-area {
    display: grid;
    place-items: center;
    height: 1.25rem;
    touch-action: none;
    cursor: grab;
  }
  .handle {
    width: 2.25rem;
    height: 0.3rem;
    background: var(--colour-line);
    border-radius: var(--radius-pill);
  }
  .header {
    display: flex;
    gap: var(--space-2);
    align-items: center;
    justify-content: space-between;
    padding: 0 calc(var(--gutter-end) - var(--space-2)) var(--space-2)
      var(--gutter);
  }
  .header h2 {
    font-size: 1.2rem;
    font-weight: 700;
  }
  .content {
    padding: 0 var(--gutter-end) var(--space-4) var(--gutter);
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  .footer {
    display: flex;
    gap: var(--space-3);
    padding: var(--space-3) var(--gutter-end)
      max(var(--space-4), env(safe-area-inset-bottom)) var(--gutter);
    border-top: 1px solid var(--colour-line);
  }
  .content:last-child {
    padding-bottom: max(var(--space-4), env(safe-area-inset-bottom));
  }

  .sheet-enter-active,
  .sheet-leave-active {
    transition: opacity var(--duration-standard) var(--ease-out);
  }
  .sheet-enter-active .panel,
  .sheet-leave-active .panel {
    transition: transform var(--duration-standard) var(--ease-out);
  }
  .sheet-enter-from,
  .sheet-leave-to {
    opacity: 0;
  }
  .sheet-enter-from .panel,
  .sheet-leave-to .panel {
    transform: translateY(100%);
  }
</style>

<style>
  html.sheet-open,
  html.sheet-open body {
    overflow: hidden;
  }
</style>
