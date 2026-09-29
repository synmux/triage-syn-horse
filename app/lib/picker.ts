import type { IconName } from "./icons";

/** One choice in an OptionSheet picker. */
export interface PickerOption {
  avatarUrl?: string | null;
  /** A colour swatch (labels, teams, projects). */
  colour?: string | null;
  hint?: string;
  icon?: IconName;
  id: string;
  label: string;
  /** Draws a priority icon for this priority value. */
  priority?: number;
}

/** A titled group of picker options; `title: null` for an untitled group. */
export interface PickerSection {
  options: PickerOption[];
  title: string | null;
}

/** The property pickers on the issue screen, openable by name. */
export type PropertyPicker =
  | "status"
  | "priority"
  | "estimate"
  | "dueDate"
  | "labels"
  | "project"
  | "assignee"
  | "team";
