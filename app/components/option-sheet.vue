<script lang="ts" setup>
  import { computed, ref, watch } from "vue";
  import type { PickerSection } from "~/lib/picker";

  /**
   * A searchable picker in a bottom sheet, used for every issue property.
   * Single choice closes on tap; multiple choice toggles until Done.
   */
  const open = defineModel<boolean>("open", { required: true });
  const {
    multiple = false,
    searchable = false,
    sections,
    selected,
    title,
  } = defineProps<{
    title: string;
    sections: PickerSection[];
    selected: string[];
    multiple?: boolean;
    searchable?: boolean;
  }>();
  const emit = defineEmits<{ choose: [id: string] }>();

  const query = ref("");
  watch(open, (isOpen) => {
    if (isOpen) {
      query.value = "";
    }
  });

  const normalise = (text: string) =>
    text
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLocaleLowerCase("en-GB");

  const visibleSections = computed(() => {
    const needle = normalise(query.value.trim());
    if (!needle) {
      return sections;
    }
    return sections
      .map((section) => ({
        ...section,
        options: section.options.filter((option) =>
          normalise(`${option.label} ${section.title ?? ""}`).includes(needle)
        ),
      }))
      .filter((section) => section.options.length > 0);
  });

  function choose(id: string) {
    emit("choose", id);
    if (!multiple) {
      open.value = false;
    }
  }
</script>

<template>
  <BottomSheet v-model:open="open" :title="title">
    <label class="search" v-if="searchable">
      <AppIcon name="search" :size="18" />
      <span class="visually-hidden">Filter {{ title.toLowerCase() }}</span>
      <input
        autocomplete="off"
        enterkeyhint="done"
        placeholder="Filter"
        type="search"
        v-model="query"
      >
    </label>
    <div
      class="section"
      v-for="section in visibleSections"
      :key="section.title ?? 'default'"
    >
      <h3 class="section-title" v-if="section.title">{{ section.title }}</h3>
      <!-- biome-ignore lint/a11y/noRedundantRoles: Safari drops list semantics when list-style is none; VoiceOver needs the role. -->
      <ul class="options" role="list">
        <li v-for="option in section.options" :key="option.id">
          <button
            class="option"
            type="button"
            :aria-pressed="selected.includes(option.id)"
            @click="choose(option.id)"
          >
            <span aria-hidden="true" class="leading">
              <PriorityIcon
                v-if="option.priority !== undefined"
                :priority="option.priority"
              />
              <UserAvatar
                v-else-if="option.avatarUrl !== undefined"
                :name="option.label"
                :url="option.avatarUrl"
              />
              <span
                class="swatch"
                v-else-if="option.colour"
                :style="{ background: option.colour }"
              />
              <AppIcon v-else-if="option.icon" :name="option.icon" :size="18" />
            </span>
            <span class="text">
              <span class="label">{{ option.label }}</span>
              <span class="hint" v-if="option.hint">{{ option.hint }}</span>
            </span>
            <AppIcon
              class="tick"
              name="check"
              v-if="selected.includes(option.id)"
              :size="20"
            />
          </button>
        </li>
      </ul>
    </div>
    <p class="nothing" v-if="visibleSections.length === 0">
      Nothing matches “{{ query }}”.
    </p>
    <template v-if="multiple" #footer>
      <button class="done" type="button" @click="open = false">Done</button>
    </template>
  </BottomSheet>
</template>

<style scoped>
  .search {
    display: flex;
    gap: var(--space-2);
    align-items: center;
    padding: 0 var(--space-3);
    margin-bottom: var(--space-3);
    color: var(--colour-ink-muted);
    background: var(--colour-surface-raised);
    border-radius: var(--radius-medium);
  }
  .search input {
    flex: 1;
    min-height: var(--touch);
    color: var(--colour-ink);
    outline: none;
    background: none;
    border: 0;
  }
  .section + .section {
    margin-top: var(--space-3);
  }
  .section-title {
    padding: var(--space-2) 0;
    font-family: var(--font-body);
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--colour-ink-muted);
  }
  .options {
    padding: 0;
    list-style: none;
  }
  .option {
    display: flex;
    gap: var(--space-3);
    align-items: center;
    width: 100%;
    min-height: 3rem;
    padding: var(--space-2) var(--space-2);
    text-align: left;
    border-radius: var(--radius-small);
  }
  .option:active {
    background: var(--colour-press);
  }
  .leading {
    display: inline-grid;
    place-items: center;
    width: 1.5rem;
    color: var(--colour-ink-muted);
  }
  .swatch {
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 50%;
  }
  .text {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
  }
  .hint {
    font-size: 0.82rem;
    color: var(--colour-ink-muted);
  }
  .tick {
    color: var(--colour-accept);
  }
  .nothing {
    padding: var(--space-4) 0;
    color: var(--colour-ink-muted);
  }
  .done {
    flex: 1;
    min-height: var(--touch);
    font-weight: 650;
    color: var(--colour-canvas);
    background: var(--colour-ink);
    border-radius: var(--radius-medium);
  }
</style>
