/**
 * Plans moving a triage issue to another team.
 *
 * Team-scoped labels do not travel between teams, so labels are mapped to
 * the target team's label of the same name (and group). Anything that
 * cannot follow is removed and reported as a warning for the user.
 */
import type {
  IssueUpdateInput,
  Label,
  Team,
  TriageIssue,
  WorkspaceSnapshot,
} from "../linear/types";
import { acceptState, statesForTeam, triageState } from "./states";

export interface TeamMovePlan {
  input: IssueUpdateInput;
  warnings: string[];
}

const sameName = (first: string, second: string) =>
  first.localeCompare(second, "en-GB", { sensitivity: "base" }) === 0;

export function planTeamMove(
  issue: Pick<TriageIssue, "identifier" | "team" | "labels" | "project">,
  target: Team,
  workspace: WorkspaceSnapshot
): TeamMovePlan {
  if (issue.team.id === target.id) {
    throw new Error(`${issue.identifier} is already in ${target.key}`);
  }
  const warnings: string[] = [];
  const labelById = new Map(workspace.labels.map((label) => [label.id, label]));
  const targetStates = statesForTeam(target.id, workspace.states);

  let stateId: string;
  if (target.triageEnabled) {
    stateId = triageState(target, targetStates).id;
  } else {
    const fallback = acceptState(target, targetStates);
    stateId = fallback.id;
    warnings.push(
      `${target.key} does not use triage, so the issue will go straight to ${fallback.name}`
    );
  }

  const labelIds: string[] = [];
  for (const { id } of issue.labels.nodes) {
    const label = labelById.get(id);
    if (!label) {
      warnings.push("A label the app does not know about was removed");
      continue;
    }
    const mapped = mapLabel(label, target.id, workspace.labels, labelById);
    if (mapped) {
      labelIds.push(mapped.id);
    } else {
      warnings.push(
        `Label "${label.name}" does not exist in ${target.key} and was removed`
      );
    }
  }

  const input: IssueUpdateInput = { labelIds, stateId, teamId: target.id };

  if (issue.project) {
    const project = workspace.projects.find(
      (candidate) => candidate.id === issue.project?.id
    );
    const shared = project?.teams.nodes.some((team) => team.id === target.id);
    // An unknown (for example completed) project is left for Linear to judge.
    if (project && !shared) {
      input.projectId = null;
      warnings.push(
        `Project "${project.name}" is not shared with ${target.key} and was removed`
      );
    }
  }

  return { input, warnings };
}

function mapLabel(
  label: Label,
  targetTeamId: string,
  labels: Label[],
  labelById: Map<string, Label>
): Label | undefined {
  if (label.team === null) {
    return label;
  }
  const parentName = label.parent
    ? labelById.get(label.parent.id)?.name
    : undefined;
  return labels.find((candidate) => {
    if (candidate.team?.id !== targetTeamId || candidate.isGroup) {
      return false;
    }
    if (!sameName(candidate.name, label.name)) {
      return false;
    }
    const candidateParentName = candidate.parent
      ? labelById.get(candidate.parent.id)?.name
      : undefined;
    if (parentName === undefined || candidateParentName === undefined) {
      return parentName === candidateParentName;
    }
    return sameName(parentName, candidateParentName);
  });
}
