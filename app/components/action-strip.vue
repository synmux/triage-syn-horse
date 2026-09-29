<script lang="ts" setup>
  import type { StripAction } from "~/lib/triage/actions";

  /**
   * The tear-off strip: the four triage outcomes along the bottom edge,
   * separated from the issue by a perforated line. The chosen segment
   * tears away when an action is taken.
   */

  const { disabled = false, torn = null } = defineProps<{
    disabled?: boolean;
    /** The action being taken right now, animated as torn off. */
    torn?: StripAction | null;
  }>();
  const emit = defineEmits<{
    act: [action: StripAction];
    acceptOptions: [];
  }>();
</script>

<template>
  <div aria-label="Triage actions" class="strip" role="toolbar">
    <div aria-hidden="true" class="perforation" />
    <div class="segments">
      <button
        aria-keyshortcuts="2"
        class="segment decline"
        type="button"
        :class="{ torn: torn === 'decline' }"
        :disabled="disabled"
        @click="emit('act', 'decline')"
      >
        <AppIcon name="close" :size="20" />
        <span>Decline</span>
      </button>
      <button
        aria-keyshortcuts="3"
        class="segment duplicate"
        type="button"
        :class="{ torn: torn === 'duplicate' }"
        :disabled="disabled"
        @click="emit('act', 'duplicate')"
      >
        <AppIcon name="duplicate" :size="20" />
        <span>Duplicate</span>
      </button>
      <button
        aria-keyshortcuts="H"
        class="segment snooze"
        type="button"
        :class="{ torn: torn === 'snooze' }"
        :disabled="disabled"
        @click="emit('act', 'snooze')"
      >
        <AppIcon name="clock" :size="20" />
        <span>Snooze</span>
      </button>
      <div class="segment accept" :class="{ torn: torn === 'accept' }">
        <button
          aria-keyshortcuts="1"
          class="accept-main"
          type="button"
          :disabled="disabled"
          @click="emit('act', 'accept')"
        >
          <AppIcon name="check" :size="22" />
          <span>Accept</span>
        </button>
        <button
          aria-label="Accept into another state or with a comment"
          class="accept-more"
          type="button"
          :disabled="disabled"
          @click="emit('acceptOptions')"
        >
          <AppIcon name="chevronUp" :size="18" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .strip {
    position: fixed;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 15;
    padding: 0.55rem var(--gutter-end)
      max(var(--space-2), env(safe-area-inset-bottom)) var(--gutter);
    background: var(--colour-surface);
    box-shadow: 0 -8px 24px rgb(0 0 0 / 0.08);
  }
  /* Tear-off perforation with a notch at each end, like a ticket stub. */
  .perforation {
    position: absolute;
    top: -0.3rem;
    right: 0;
    left: 0;
    height: 0.6rem;
    background:
      radial-gradient(
        circle at 0 50%,
        var(--colour-canvas) 0.3rem,
        transparent 0.32rem
      )
      left / 0.6rem 100% no-repeat,
      radial-gradient(
        circle at 100% 50%,
        var(--colour-canvas) 0.3rem,
        transparent 0.32rem
      )
      right / 0.6rem 100% no-repeat,
      radial-gradient(circle, var(--colour-canvas) 0.13rem, transparent 0.15rem)
      center / 0.7rem 100% repeat-x;
  }
  .segments {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1.55fr;
    gap: 0.4rem;
    max-width: 40rem;
    margin: 0 auto;
  }
  .segment {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    align-items: center;
    justify-content: center;
    min-height: 3.35rem;
    font-size: 0.78rem;
    font-weight: 650;
    border-radius: var(--radius-medium);
    transition:
      transform var(--duration-slow) var(--ease-in),
      opacity var(--duration-slow) var(--ease-in);
  }
  .segment:active:not(:has(:disabled)) {
    filter: brightness(0.94);
  }
  .decline {
    color: var(--colour-decline);
    background: color-mix(
      in srgb,
      var(--colour-decline-fill) var(--tint-strength),
      var(--colour-surface)
    );
  }
  .duplicate {
    color: var(--colour-duplicate);
    background: color-mix(
      in srgb,
      var(--colour-duplicate-fill) var(--tint-strength),
      var(--colour-surface)
    );
  }
  .snooze {
    color: var(--colour-snooze);
    background: color-mix(
      in srgb,
      var(--colour-snooze-fill) var(--tint-strength),
      var(--colour-surface)
    );
  }
  .accept {
    flex-direction: row;
    gap: 0;
    align-items: stretch;
    overflow: hidden;
    color: var(--colour-accept-on-fill);
    background: var(--colour-accept-fill);
  }
  .accept-main {
    display: flex;
    flex: 1;
    gap: 0.35rem;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    font-size: 1.05rem;
    font-weight: 750;
  }
  .accept-more {
    display: grid;
    place-items: center;
    width: 2.4rem;
    border-left: 1px solid rgb(0 0 0 / 0.14);
  }
  .accept-main:active,
  .accept-more:active {
    background: rgb(0 0 0 / 0.08);
  }
  .segment.torn {
    opacity: 0;
    transform: translateY(120%) rotate(-4deg);
  }
</style>
