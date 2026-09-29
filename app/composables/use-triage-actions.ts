/**
 * The triage actions as the UI invokes them. Plans each action against
 * the loaded workspace, reports a refusal to plan (for example a missing
 * required priority) as a toast, and hands the plan to the queue store.
 */
import { describeError } from "~/lib/linear/errors";
import type { TriageIssue } from "~/lib/linear/types";
import {
  type ActionPlan,
  planAccept,
  planDecline,
  planDuplicate,
  planSnooze,
  planUnsnooze,
} from "~/lib/triage/actions";
import { snoozePresets } from "~/lib/triage/snooze";
import { useQueueStore } from "~/stores/queue";
import { useSessionStore } from "~/stores/session";
import { useToastStore } from "~/stores/toasts";
import { useWorkspaceStore } from "~/stores/workspace";

export function useTriageActions() {
  const workspace = useWorkspaceStore();
  const session = useSessionStore();
  const queue = useQueueStore();
  const toasts = useToastStore();

  const teamContext = (issue: TriageIssue) => {
    const team = workspace.teamById(issue.team.id);
    if (!team) {
      throw new Error(
        `The team for ${issue.identifier} has not loaded yet. Try again in a moment.`
      );
    }
    return { team, teamStates: workspace.statesFor(team.id) };
  };

  const viewerId = () => {
    if (!session.viewerId) {
      throw new Error(
        "Your Linear account has not loaded yet. Try again in a moment."
      );
    }
    return session.viewerId;
  };

  /** Plans and performs an action; resolves to true once Linear accepted it. */
  function run(build: () => ActionPlan): Promise<boolean> {
    let plan: ActionPlan;
    try {
      plan = build();
    } catch (failure) {
      toasts.push({ message: describeError(failure), tone: "error" });
      return Promise.resolve(false);
    }
    return queue.perform(plan);
  }

  return {
    accept: (
      issue: TriageIssue,
      options: { stateId?: string; comment?: string } = {}
    ) =>
      run(() => {
        const { team, teamStates } = teamContext(issue);
        return planAccept(issue, team, teamStates, options);
      }),
    decline: (issue: TriageIssue, options: { comment?: string } = {}) =>
      run(() => {
        const { team, teamStates } = teamContext(issue);
        return planDecline(issue, team, teamStates, options);
      }),
    duplicate: (
      issue: TriageIssue,
      canonical: { id: string; identifier: string }
    ) => run(() => planDuplicate(issue, canonical)),
    snooze: (issue: TriageIssue, until: Date) =>
      run(() => planSnooze(issue, until, viewerId())),
    snoozeUntilTomorrow: (issue: TriageIssue) =>
      run(() => {
        const tomorrow = snoozePresets(new Date()).find(
          (preset) => preset.id === "tomorrow"
        );
        if (!tomorrow) {
          throw new Error("Could not work out tomorrow morning");
        }
        return planSnooze(issue, tomorrow.until, viewerId());
      }),
    unsnooze: (issue: TriageIssue) => run(() => planUnsnooze(issue)),
  };
}
