<script lang="ts" setup>
  import { ref, watch } from "vue";
  import { parseDueDateInput } from "~/lib/format/time";

  /** Sets or clears an issue's due date with the native date picker. */
  const open = defineModel<boolean>("open", { required: true });
  const { current, identifier } = defineProps<{
    identifier: string;
    /** The issue's due date ("YYYY-MM-DD"), or null. */
    current: string | null;
  }>();
  const emit = defineEmits<{ choose: [dueDate: string | null] }>();

  const value = ref(current ?? "");
  const errorMessage = ref<string | null>(null);
  watch(open, (isOpen) => {
    if (isOpen) {
      value.value = current ?? "";
      errorMessage.value = null;
    }
  });

  function save() {
    try {
      emit("choose", parseDueDateInput(value.value));
      open.value = false;
    } catch (failure) {
      errorMessage.value =
        failure instanceof Error ? failure.message : "Choose a date";
    }
  }

  function clear() {
    emit("choose", null);
    open.value = false;
  }
</script>

<template>
  <BottomSheet v-model:open="open" :title="`Due date for ${identifier}`">
    <label class="field-label" for="due-date">Due</label>
    <input
      aria-describedby="due-date-error"
      class="text-field"
      id="due-date"
      type="date"
      v-model="value"
      :aria-invalid="errorMessage ? 'true' : undefined"
    >
    <p aria-live="polite" class="field-error" id="due-date-error">
      {{ errorMessage }}
    </p>
    <template #footer>
      <button class="confirm clear" type="button" v-if="current" @click="clear">
        Remove due date
      </button>
      <button
        class="confirm neutral"
        type="button"
        :disabled="!value"
        @click="save"
      >
        Set due date
      </button>
    </template>
  </BottomSheet>
</template>

<style scoped>
  .confirm.clear {
    color: var(--colour-ink);
    background: var(--colour-surface-raised);
  }
</style>
