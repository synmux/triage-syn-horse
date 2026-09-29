<script lang="ts" setup>
  import { computed, ref, watch } from "vue";
  import { formatShortDateTime } from "~/lib/format/time";
  import { parseCustomSnooze, snoozePresets } from "~/lib/triage/snooze";

  /** Snooze until a preset time or a chosen date and time. */
  const open = defineModel<boolean>("open", { required: true });
  const { identifier } = defineProps<{ identifier: string }>();
  const emit = defineEmits<{ confirm: [until: Date] }>();

  const now = ref(new Date());
  const custom = ref("");
  const customError = ref<string | null>(null);
  watch(open, (isOpen) => {
    if (isOpen) {
      now.value = new Date();
      custom.value = "";
      customError.value = null;
    }
  });

  const presets = computed(() => snoozePresets(now.value));

  function choose(until: Date) {
    emit("confirm", until);
    open.value = false;
  }

  function chooseCustom() {
    try {
      choose(parseCustomSnooze(custom.value, new Date()));
    } catch (failure) {
      customError.value =
        failure instanceof Error ? failure.message : "Choose a date and time";
    }
  }
</script>

<template>
  <BottomSheet v-model:open="open" :title="`Snooze ${identifier}`">
    <p class="explain">
      Snoozed issues leave the queue and come back at the time you choose.
    </p>
    <!-- biome-ignore lint/a11y/noRedundantRoles: Safari drops list semantics when list-style is none. -->
    <ul class="presets" role="list">
      <li v-for="preset in presets" :key="preset.id">
        <button class="preset" type="button" @click="choose(preset.until)">
          <span>{{ preset.label }}</span>
          <span class="hint tabular">{{
            formatShortDateTime(preset.until)
          }}</span>
        </button>
      </li>
    </ul>
    <label class="field-label" for="snooze-custom">Another time</label>
    <div class="custom">
      <input
        aria-describedby="snooze-error"
        class="text-field"
        id="snooze-custom"
        type="datetime-local"
        v-model="custom"
        :aria-invalid="customError ? 'true' : undefined"
      >
      <button
        class="confirm snooze"
        type="button"
        :disabled="!custom"
        @click="chooseCustom"
      >
        Snooze
      </button>
    </div>
    <p aria-live="polite" class="field-error" id="snooze-error">
      {{ customError }}
    </p>
  </BottomSheet>
</template>

<style scoped>
  .presets {
    padding: 0;
    margin: 0 0 var(--space-4);
    list-style: none;
  }
  .preset {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    min-height: 3rem;
    font-weight: 600;
    border-bottom: 1px solid var(--colour-line);
  }
  .preset:active {
    background: var(--colour-press);
  }
  .custom {
    display: flex;
    gap: var(--space-2);
  }
  .custom .text-field {
    flex: 1;
    min-width: 0;
  }
  .custom .confirm {
    flex: none;
    padding: 0 var(--space-4);
  }
</style>
