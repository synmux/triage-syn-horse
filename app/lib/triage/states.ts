/**
 * Resolves which workflow state each triage action moves an issue into.
 *
 * Accept moves to the team's default state (Linear docs, "Triage"),
 * decline to a canceled-type state. Duplicates are handled by Linear
 * itself when a duplicate relation is created.
 */
import type { Team, WorkflowState, WorkflowStateType } from "../linear/types";

type TeamStates = Pick<Team, "key" | "triageIssueState" | "defaultIssueState">;

const acceptableTypes: WorkflowStateType[] = [
  "backlog",
  "unstarted",
  "started",
];

const byPosition = (first: WorkflowState, second: WorkflowState) =>
  first.position - second.position;

/** The team's states in the order Linear shows them. */
export function statesForTeam(
  teamId: string,
  states: WorkflowState[]
): WorkflowState[] {
  return states.filter((state) => state.team.id === teamId).sort(byPosition);
}

const firstOfType = (states: WorkflowState[], type: WorkflowStateType) =>
  [...states].sort(byPosition).find((state) => state.type === type);

export function triageState(
  team: TeamStates,
  teamStates: WorkflowState[]
): WorkflowState {
  const configured = teamStates.find(
    (state) => state.id === team.triageIssueState?.id
  );
  const resolved = configured ?? firstOfType(teamStates, "triage");
  if (!resolved) {
    throw new Error(`Team ${team.key} has no triage state`);
  }
  return resolved;
}

export function acceptState(
  team: TeamStates,
  teamStates: WorkflowState[]
): WorkflowState {
  const configured = teamStates.find(
    (state) => state.id === team.defaultIssueState?.id
  );
  if (
    configured &&
    acceptableTypes.includes(configured.type as WorkflowStateType)
  ) {
    return configured;
  }
  const fallback =
    firstOfType(teamStates, "backlog") ?? firstOfType(teamStates, "unstarted");
  if (!fallback) {
    throw new Error(
      `Team ${team.key} has no backlog or unstarted state to accept into`
    );
  }
  return fallback;
}

export function declineState(
  team: TeamStates,
  teamStates: WorkflowState[]
): WorkflowState {
  const canceled = firstOfType(teamStates, "canceled");
  if (!canceled) {
    throw new Error(`Team ${team.key} has no canceled state to decline into`);
  }
  return canceled;
}

/** States an issue may be accepted into: backlog, then unstarted, then started. */
export function acceptTargets(
  _team: TeamStates,
  teamStates: WorkflowState[]
): WorkflowState[] {
  return acceptableTypes.flatMap((type) =>
    [...teamStates].sort(byPosition).filter((state) => state.type === type)
  );
}
