<script lang="ts" setup>
  import { ref, useId, watch } from "vue";

  /**
   * A sheet with one text field and a save button, used for comments and
   * the title. It stays open with the text intact if saving fails.
   */
  const open = defineModel<boolean>("open", { required: true });
  const {
    initial = "",
    label,
    placeholder = "",
    rows = 4,
    save,
    saveLabel,
    singleLine = false,
    title,
  } = defineProps<{
    title: string;
    label: string;
    saveLabel: string;
    placeholder?: string;
    initial?: string;
    rows?: number;
    /** Return key saves instead of adding a line (titles). */
    singleLine?: boolean;
    /** Resolves to true once saved; the sheet then closes. */
    save: (text: string) => Promise<boolean>;
  }>();

  const fieldId = useId();
  const text = ref(initial);
  const saving = ref(false);

  watch(open, (isOpen) => {
    if (isOpen) {
      text.value = initial;
    }
  });

  async function submit() {
    if (!text.value.trim() || saving.value) {
      return;
    }
    saving.value = true;
    try {
      if (await save(text.value)) {
        open.value = false;
      }
    } finally {
      saving.value = false;
    }
  }

  function onKeydown(event: KeyboardEvent) {
    if (singleLine && event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }
</script>

<template>
  <BottomSheet v-model:open="open" :title="title">
    <label class="field-label" :for="fieldId">{{ label }}</label>
    <textarea
      autofocus
      class="text-field"
      v-model="text"
      :enterkeyhint="singleLine ? 'done' : 'enter'"
      :id="fieldId"
      :placeholder="placeholder"
      :rows="rows"
      @keydown="onKeydown"
    />
    <template #footer>
      <button
        class="confirm neutral"
        type="button"
        :disabled="saving || !text.trim()"
        @click="submit"
      >
        {{ saving ? "Saving…" : saveLabel }}
      </button>
    </template>
  </BottomSheet>
</template>
