<script generic="TValue extends string" lang="ts" setup>
  import { useId } from "vue";

  /** A segmented choice built on native radio inputs. */
  const selected = defineModel<TValue>({ required: true });
  const { label, options } = defineProps<{
    label: string;
    options: { value: TValue; label: string }[];
  }>();

  const name = useId();
</script>

<template>
  <fieldset class="field">
    <legend class="label">{{ label }}</legend>
    <div class="segments">
      <label class="segment" v-for="option in options" :key="option.value">
        <input
          class="visually-hidden"
          type="radio"
          v-model="selected"
          :name="name"
          :value="option.value"
        >
        <span>{{ option.label }}</span>
      </label>
    </div>
  </fieldset>
</template>

<style scoped>
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    min-width: 0;
    padding: var(--space-2) 0;
    margin: 0;
    border: 0;
  }
  .label {
    padding: 0;
    margin-bottom: var(--space-2);
  }
  .segments {
    display: flex;
    padding: 0.2rem;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: var(--radius-medium);
  }
  .segment {
    display: grid;
    flex: 1;
    place-items: center;
    min-height: 2.4rem;
    padding: 0 var(--space-2);
    font-size: 0.94rem;
    color: var(--colour-ink-muted);
    text-align: center;
    cursor: pointer;
    border-radius: calc(var(--radius-medium) - 0.2rem);
  }
  .segment:has(input:checked) {
    font-weight: 650;
    color: var(--colour-ink);
    background: var(--colour-surface);
    box-shadow: 0 1px 4px rgb(0 0 0 / 0.14);
  }
  .segment:has(input:focus-visible) {
    outline: 2px solid var(--colour-focus);
    outline-offset: 1px;
  }
</style>
