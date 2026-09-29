<script lang="ts" setup>
  import { ref, watch } from "vue";

  /** Decline with an optional reason, posted as a comment. */
  const open = defineModel<boolean>("open", { required: true });
  const { identifier } = defineProps<{ identifier: string }>();
  const emit = defineEmits<{ confirm: [comment: string] }>();

  const comment = ref("");
  watch(open, (isOpen) => {
    if (isOpen) {
      comment.value = "";
    }
  });

  function confirm() {
    emit("confirm", comment.value);
    open.value = false;
  }
</script>

<template>
  <BottomSheet v-model:open="open" :title="`Decline ${identifier}`">
    <p class="explain">
      Declined issues move to Canceled. You can undo from the toast or Recent.
    </p>
    <label class="field-label" for="decline-reason">Reason (optional)</label>
    <textarea
      autofocus
      class="text-field"
      id="decline-reason"
      placeholder="Posted as a comment on the issue"
      rows="3"
      v-model="comment"
    />
    <template #footer>
      <button class="confirm decline" type="button" @click="confirm">
        Decline {{ identifier }}
      </button>
    </template>
  </BottomSheet>
</template>
