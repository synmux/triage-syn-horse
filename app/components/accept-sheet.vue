<script lang="ts" setup>
  import { computed, ref, watch } from "vue";
  import type { WorkflowState } from "~/lib/linear/types";

  /** Accept with a choice of state and an optional comment. */
  const open = defineModel<boolean>("open", { required: true });
  const { defaultStateId, identifier, targets } = defineProps<{
    identifier: string;
    targets: WorkflowState[];
    defaultStateId: string;
  }>();
  const emit = defineEmits<{
    confirm: [choice: { stateId: string; comment: string }];
  }>();

  const stateId = ref(defaultStateId);
  const comment = ref("");
  watch(open, (isOpen) => {
    if (isOpen) {
      stateId.value = defaultStateId;
      comment.value = "";
    }
  });

  const chosen = computed(() =>
    targets.find((state) => state.id === stateId.value)
  );

  function confirm() {
    emit("confirm", { comment: comment.value, stateId: stateId.value });
    open.value = false;
  }
</script>

<template>
  <BottomSheet v-model:open="open" :title="`Accept ${identifier}`">
    <fieldset class="states">
      <legend class="field-label">Move to</legend>
      <label class="state" v-for="state in targets" :key="state.id">
        <input
          name="accept-state"
          type="radio"
          v-model="stateId"
          :value="state.id"
        >
        <span
          aria-hidden="true"
          class="dot"
          :style="{ background: state.color }"
        />
        <span class="state-name">{{ state.name }}</span>
        <span class="hint" v-if="state.id === defaultStateId">Default</span>
      </label>
    </fieldset>
    <label class="field-label" for="accept-comment">Comment (optional)</label>
    <textarea
      class="text-field"
      id="accept-comment"
      placeholder="Why it's worth doing, or what to do first"
      rows="3"
      v-model="comment"
    />
    <template #footer>
      <button class="confirm accept" type="button" @click="confirm">
        Accept into {{ chosen?.name ?? "state" }}
      </button>
    </template>
  </BottomSheet>
</template>

<style scoped>
  .states {
    padding: 0;
    margin: 0 0 var(--space-4);
    border: 0;
  }
  .state {
    display: flex;
    gap: var(--space-3);
    align-items: center;
    min-height: 2.9rem;
    border-bottom: 1px solid var(--colour-line);
  }
  .state input {
    width: 1.2rem;
    height: 1.2rem;
    accent-color: var(--colour-accept-fill);
  }
  .dot {
    width: 0.65rem;
    height: 0.65rem;
    border-radius: 50%;
  }
  .state-name {
    flex: 1;
  }
</style>
