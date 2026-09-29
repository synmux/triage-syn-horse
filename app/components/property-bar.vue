<script lang="ts" setup>
  import { computed, ref } from "vue";
  import { formatDueDate, isOverdue } from "~/lib/format/time";
  import { describeError } from "~/lib/linear/errors";
  import type {
    IssueUpdateInput,
    Label,
    Project,
    Team,
    TriageIssue,
    User,
    WorkflowState,
    WorkspaceSnapshot,
  } from "~/lib/linear/types";
  import type { PickerSection, PropertyPicker } from "~/lib/picker";
  import type { AcceptBlocker } from "~/lib/triage/actions";
  import {
    estimateLabel,
    estimateOptions,
    estimationEnabled,
  } from "~/lib/triage/estimates";
  import {
    assignableLabels,
    labelDelta,
    toggleLabel,
  } from "~/lib/triage/labels";
  import { priorities, priorityLabel } from "~/lib/triage/priorities";
  import { planTeamMove } from "~/lib/triage/team-move";
  import { useToastStore } from "~/stores/toasts";

  /**
   * The issue's editable properties as a row of chips, each opening a
   * picker. Emits the Linear input to send, the optimistic patch to show
   * at once, and any warnings the change produced.
   *
   * The Status chip is different: it only chooses the state Accept will
   * move the issue into (a v-model), so it never takes an issue out of
   * triage by itself.
   */
  const {
    acceptTargets,
    defaultAcceptStateId,
    issue,
    labels,
    missing,
    now,
    projects,
    team,
    teams,
    users,
    workspace,
  } = defineProps<{
    issue: TriageIssue;
    team: Team;
    teams: Team[];
    labels: Label[];
    projects: Project[];
    users: User[];
    workspace: WorkspaceSnapshot;
    /** States the issue can be accepted into; empty when not in triage. */
    acceptTargets: WorkflowState[];
    defaultAcceptStateId: string | null;
    /** Properties still needed before the issue can be accepted. */
    missing: AcceptBlocker[];
    now: Date;
  }>();
  /** The state Accept will use; null means the team's default. */
  const acceptStateId = defineModel<string | null>("acceptStateId", {
    required: true,
  });
  const emit = defineEmits<{
    update: [
      input: IssueUpdateInput,
      optimistic: Partial<TriageIssue>,
      warnings: string[],
    ];
  }>();

  type Picker = PropertyPicker;
  const openPicker = ref<Picker | null>(null);
  const pickerOpen = (picker: Picker) =>
    computed({
      get: () => openPicker.value === picker,
      set: (value: boolean) => {
        openPicker.value = value ? picker : null;
      },
    });
  const statusOpen = pickerOpen("status");
  const priorityOpen = pickerOpen("priority");
  const dueDateOpen = pickerOpen("dueDate");
  const estimateOpen = pickerOpen("estimate");
  const labelsOpen = pickerOpen("labels");
  const projectOpen = pickerOpen("project");
  const assigneeOpen = pickerOpen("assignee");
  const teamOpen = pickerOpen("team");

  const noneId = "none";
  const selectedLabelIds = computed(() =>
    issue.labels.nodes.map(({ id }) => id)
  );
  const selectedLabels = computed(() =>
    selectedLabelIds.value
      .map((labelId) => labels.find((label) => label.id === labelId))
      .filter((label): label is Label => label !== undefined)
  );
  const project = computed(() =>
    projects.find((candidate) => candidate.id === issue.project?.id)
  );
  const assignee = computed(() =>
    users.find((user) => user.id === issue.assignee?.id)
  );
  const estimate = computed(() => estimateLabel(team, issue.estimate));
  const acceptState = computed(() =>
    acceptTargets.find(
      (state) => state.id === (acceptStateId.value ?? defaultAcceptStateId)
    )
  );
  /** Explains, in the picker, why Accept is waiting on this property. */
  const neededNote = (blocker: AcceptBlocker) =>
    missing.includes(blocker)
      ? `Needed before ${issue.identifier} can be accepted`
      : undefined;
  const dueDateOverdue = computed(
    () => issue.dueDate !== null && isOverdue(issue.dueDate, now)
  );

  /** Opens a picker from outside, for example to fill in what Accept needs. */
  defineExpose({
    open: (picker: Picker) => {
      openPicker.value = picker;
    },
  });

  const statusChoices = computed<PickerSection[]>(() => [
    {
      options: acceptTargets.map((state) => ({
        colour: state.color,
        hint: state.id === defaultAcceptStateId ? "Team default" : undefined,
        id: state.id,
        label: state.name,
      })),
      title: null,
    },
  ]);

  const priorityChoices: PickerSection[] = [
    {
      options: priorities.map((priority) => ({
        id: String(priority.value),
        label: priority.label,
        priority: priority.value,
      })),
      title: null,
    },
  ];
  const estimateChoices = computed<PickerSection[]>(() => [
    {
      options: [
        { icon: "close" as const, id: noneId, label: "No estimate" },
        ...estimateOptions(team).map((option) => ({
          icon: "estimate" as const,
          id: String(option.value),
          label: option.label,
        })),
      ],
      title: null,
    },
  ]);
  const labelChoices = computed<PickerSection[]>(() =>
    assignableLabels(team.id, labels).map((section) => ({
      options: section.labels.map((label) => ({
        colour: label.color,
        id: label.id,
        label: label.name,
      })),
      title: section.group?.name ?? null,
    }))
  );
  const projectChoices = computed<PickerSection[]>(() => [
    {
      options: [
        { icon: "close" as const, id: noneId, label: "No project" },
        ...projects.map((candidate) => ({
          colour: candidate.color,
          id: candidate.id,
          label: candidate.name,
        })),
      ],
      title: null,
    },
  ]);
  const assigneeChoices = computed<PickerSection[]>(() => [
    {
      options: [
        { icon: "user" as const, id: noneId, label: "Unassigned" },
        ...users.map((user) => ({
          avatarUrl: user.avatarUrl,
          id: user.id,
          label: user.isMe ? `${user.displayName} (you)` : user.displayName,
        })),
      ],
      title: null,
    },
  ]);
  const teamChoices = computed<PickerSection[]>(() => [
    {
      options: teams.map((candidate) => ({
        colour: candidate.color,
        hint: candidate.id === team.id ? "Current team" : candidate.name,
        id: candidate.id,
        label: candidate.key,
      })),
      title: null,
    },
  ]);

  function chooseStatus(id: string) {
    acceptStateId.value = id === defaultAcceptStateId ? null : id;
  }

  function chooseDueDate(dueDate: string | null) {
    if (dueDate !== issue.dueDate) {
      emit("update", { dueDate }, { dueDate }, []);
    }
  }

  function choosePriority(id: string) {
    const priority = Number(id);
    if (priority !== issue.priority) {
      emit("update", { priority }, { priority }, []);
    }
  }

  function chooseEstimate(id: string) {
    const value = id === noneId ? null : Number(id);
    if (value !== issue.estimate) {
      emit("update", { estimate: value }, { estimate: value }, []);
    }
  }

  function toggleIssueLabel(labelId: string) {
    const next = toggleLabel(selectedLabelIds.value, labelId, labels);
    const delta = labelDelta(selectedLabelIds.value, next);
    emit(
      "update",
      delta,
      { labels: { nodes: next.map((id) => ({ id })) } },
      []
    );
  }

  function chooseProject(id: string) {
    const projectId = id === noneId ? null : id;
    if (projectId !== (issue.project?.id ?? null)) {
      emit(
        "update",
        { projectId },
        { project: projectId ? { id: projectId } : null },
        []
      );
    }
  }

  function chooseAssignee(id: string) {
    const assigneeId = id === noneId ? null : id;
    if (assigneeId !== (issue.assignee?.id ?? null)) {
      emit(
        "update",
        { assigneeId },
        { assignee: assigneeId ? { id: assigneeId } : null },
        []
      );
    }
  }

  function chooseTeam(id: string) {
    const target = teams.find((candidate) => candidate.id === id);
    if (!target || target.id === team.id) {
      return;
    }
    let plan: ReturnType<typeof planTeamMove>;
    try {
      plan = planTeamMove(issue, target, workspace);
    } catch (failure) {
      useToastStore().push({ message: describeError(failure), tone: "error" });
      return;
    }
    const optimistic: Partial<TriageIssue> = { team: { id: target.id } };
    if (plan.input.stateId) {
      optimistic.state = { id: plan.input.stateId };
    }
    if (plan.input.labelIds) {
      optimistic.labels = {
        nodes: plan.input.labelIds.map((labelId) => ({ id: labelId })),
      };
    }
    if (plan.input.projectId === null) {
      optimistic.project = null;
    }
    emit("update", plan.input, optimistic, plan.warnings);
  }
</script>

<template>
  <div class="properties">
    <div class="property-bar">
      <button
        class="chip"
        type="button"
        v-if="acceptState"
        @click="openPicker = 'status'"
      >
        <span
          aria-hidden="true"
          class="dot"
          :style="{ background: acceptState.color }"
        />
        <span class="chip-prefix">Accept to</span>
        {{ acceptState.name }}
      </button>
      <button
        class="chip"
        type="button"
        :aria-description="missing.includes('priority') ? 'Needed before accepting' : undefined"
        :class="{ needed: missing.includes('priority') }"
        @click="openPicker = 'priority'"
      >
        <PriorityIcon :priority="issue.priority" />
        {{ issue.priority === 0 ? "Priority" : priorityLabel(issue.priority) }}
      </button>
      <button
        class="chip"
        type="button"
        v-if="estimationEnabled(team)"
        :aria-description="missing.includes('estimate') ? 'Needed before accepting' : undefined"
        :class="{ needed: missing.includes('estimate') }"
        @click="openPicker = 'estimate'"
      >
        <AppIcon name="estimate" :size="16" />
        <span :class="{ tabular: estimate }">{{ estimate ?? "Estimate" }}</span>
      </button>
      <button
        class="chip"
        type="button"
        :class="{ overdue: dueDateOverdue }"
        @click="openPicker = 'dueDate'"
      >
        <AppIcon name="calendar" :size="16" />
        <template v-if="issue.dueDate">
          <span class="visually-hidden">{{
            dueDateOverdue ? "Overdue, was due" : "Due"
          }}</span>
          {{ formatDueDate(issue.dueDate, now) }}
        </template>
        <template v-else>Due date</template>
      </button>
      <button class="chip" type="button" @click="openPicker = 'labels'">
        <template v-if="selectedLabels.length === 0">
          <AppIcon name="label" :size="16" />
          Labels
        </template>
        <template v-else>
          <span
            aria-hidden="true"
            class="dot"
            v-for="label in selectedLabels.slice(0, 3)"
            :key="label.id"
            :style="{ background: label.color }"
          />
          {{
            selectedLabels.length === 1 ? selectedLabels[0]?.name : `${selectedLabels.length} labels`
          }}
        </template>
      </button>
      <button class="chip" type="button" @click="openPicker = 'project'">
        <AppIcon name="project" :size="16" />
        <IssueTitle v-if="project" :title="project.name" />
        <template v-else>Project</template>
      </button>
      <button class="chip" type="button" @click="openPicker = 'assignee'">
        <UserAvatar
          v-if="assignee"
          :name="assignee.displayName"
          :size="18"
          :url="assignee.avatarUrl"
        />
        <AppIcon name="user" v-else :size="16" />
        {{ assignee?.displayName ?? "Assignee" }}
      </button>
      <button class="chip" type="button" @click="openPicker = 'team'">
        <span
          aria-hidden="true"
          class="dot"
          :style="{ background: team.color ?? 'var(--colour-line)' }"
        />
        <span class="visually-hidden">Team </span>{{ team.key }}
      </button>
    </div>

    <OptionSheet
      title="Status once accepted"
      v-model:open="statusOpen"
      :sections="statusChoices"
      :selected="acceptState ? [acceptState.id] : []"
      @choose="chooseStatus"
    />
    <DueDateSheet
      v-model:open="dueDateOpen"
      :current="issue.dueDate"
      :identifier="issue.identifier"
      @choose="chooseDueDate"
    />
    <OptionSheet
      title="Priority"
      v-model:open="priorityOpen"
      :description="neededNote('priority')"
      :sections="priorityChoices"
      :selected="[String(issue.priority)]"
      @choose="choosePriority"
    />
    <OptionSheet
      title="Estimate"
      v-model:open="estimateOpen"
      :description="neededNote('estimate')"
      :sections="estimateChoices"
      :selected="[issue.estimate === null ? noneId : String(issue.estimate)]"
      @choose="chooseEstimate"
    />
    <OptionSheet
      multiple
      searchable
      title="Labels"
      v-model:open="labelsOpen"
      :sections="labelChoices"
      :selected="selectedLabelIds"
      @choose="toggleIssueLabel"
    />
    <OptionSheet
      searchable
      title="Project"
      v-model:open="projectOpen"
      :sections="projectChoices"
      :selected="[issue.project?.id ?? noneId]"
      @choose="chooseProject"
    />
    <OptionSheet
      title="Assignee"
      v-model:open="assigneeOpen"
      :sections="assigneeChoices"
      :selected="[issue.assignee?.id ?? noneId]"
      @choose="chooseAssignee"
    />
    <OptionSheet
      title="Move to team"
      v-model:open="teamOpen"
      :sections="teamChoices"
      :selected="[team.id]"
      @choose="chooseTeam"
    />
  </div>
</template>

<style scoped>
  .properties {
    min-width: 0;
  }
  /* Positioned so visually hidden text inside chips cannot widen the page. */
  .property-bar {
    position: relative;
    display: flex;
    gap: var(--space-2);
    padding: var(--space-1) var(--gutter-end) var(--space-2) var(--gutter);
    margin: 0 calc(-1 * var(--gutter-end)) 0 calc(-1 * var(--gutter));
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scrollbar-width: none;
  }
  .property-bar::-webkit-scrollbar {
    display: none;
  }
  .chip {
    display: inline-flex;
    flex: none;
    gap: 0.4rem;
    align-items: center;
    max-width: 14rem;
    min-height: 2.35rem;
    padding: 0 0.8rem;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 0.9rem;
    font-weight: 560;
    white-space: nowrap;
    background: var(--colour-surface);
    border: 1px solid var(--colour-line);
    border-radius: var(--radius-pill);
  }
  .chip:active {
    background: var(--colour-press);
  }
  /* Required before Accept: a dashed outline in the accept colour. */
  .chip.needed {
    color: var(--colour-accept);
    border: 1px dashed var(--colour-accept);
  }
  .chip-prefix {
    color: var(--colour-ink-muted);
  }
  .chip.overdue {
    color: var(--colour-decline);
  }
  .dot {
    flex: none;
    width: 0.6rem;
    height: 0.6rem;
    border-radius: 50%;
  }
  .dot + .dot {
    margin-left: -0.55rem;
    box-shadow: 0 0 0 2px var(--colour-surface);
  }
</style>
