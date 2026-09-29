/**
 * Label rules. Labels are team-scoped or workspace-wide; a label group is
 * a heading, never assignable itself, and an issue may carry at most one
 * label from each group.
 */
import type { Label } from "../linear/types";

export interface LabelSection {
  /** The group heading, or null for labels that are not in a group. */
  group: Label | null;
  labels: Label[];
}

const byName = (first: Label, second: Label) =>
  first.name.localeCompare(second.name, "en-GB", { sensitivity: "base" });

/** Labels usable in a team: its own plus workspace-wide ones. */
export function labelsForTeam(teamId: string, labels: Label[]): Label[] {
  return labels.filter(
    (label) => label.team === null || label.team.id === teamId
  );
}

export function assignableLabels(
  teamId: string,
  labels: Label[]
): LabelSection[] {
  const available = labelsForTeam(teamId, labels);
  const ungrouped = available
    .filter((label) => !(label.isGroup || label.parent))
    .sort(byName);
  const groups = available.filter((label) => label.isGroup).sort(byName);

  const sections: LabelSection[] = [];
  if (ungrouped.length > 0) {
    sections.push({ group: null, labels: ungrouped });
  }
  for (const group of groups) {
    const children = available
      .filter((label) => label.parent?.id === group.id)
      .sort(byName);
    if (children.length > 0) {
      sections.push({ group, labels: children });
    }
  }
  return sections;
}

/** Toggles a label, replacing any sibling from the same group. */
export function toggleLabel(
  selectedIds: string[],
  labelId: string,
  labels: Label[]
): string[] {
  if (selectedIds.includes(labelId)) {
    return selectedIds.filter((selectedId) => selectedId !== labelId);
  }
  const parentId = labels.find((label) => label.id === labelId)?.parent?.id;
  const siblingIds = new Set(
    parentId === undefined
      ? []
      : labels
          .filter((label) => label.parent?.id === parentId)
          .map((label) => label.id)
  );
  return [
    ...selectedIds.filter((selectedId) => !siblingIds.has(selectedId)),
    labelId,
  ];
}

/**
 * The change between two label selections, expressed as additions and
 * removals so concurrent edits made elsewhere are not overwritten.
 */
export function labelDelta(
  before: string[],
  after: string[]
): { addedLabelIds: string[]; removedLabelIds: string[] } {
  return {
    addedLabelIds: after.filter((labelId) => !before.includes(labelId)),
    removedLabelIds: before.filter((labelId) => !after.includes(labelId)),
  };
}
