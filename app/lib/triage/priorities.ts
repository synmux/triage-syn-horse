/** Linear's issue priorities, in the order Linear's own picker lists them. */
export const priorities = [
  { label: "No priority", value: 0 },
  { label: "Urgent", value: 1 },
  { label: "High", value: 2 },
  { label: "Medium", value: 3 },
  { label: "Low", value: 4 },
] as const;

export type PriorityValue = (typeof priorities)[number]["value"];

export function priorityLabel(value: number): string {
  const priority = priorities.find((candidate) => candidate.value === value);
  if (!priority) {
    throw new Error(`Unknown priority ${value}`);
  }
  return priority.label;
}

/** Sort key putting Urgent first and No priority last. */
export function prioritySortRank(value: number): number {
  return value === 0 ? priorities.length : value;
}
