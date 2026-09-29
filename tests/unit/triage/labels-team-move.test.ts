import { describe, expect, it } from "vitest";
import {
  assignableLabels,
  labelDelta,
  labelsForTeam,
  toggleLabel,
} from "~/lib/triage/labels";
import { planTeamMove } from "~/lib/triage/team-move";
import { makeIssue, makeTeam, makeWorkspace } from "../../support/factories";

const workspace = makeWorkspace();
const shs = workspace.teams.find((team) => team.key === "SHS") ?? makeTeam();
const myr = workspace.teams.find((team) => team.key === "MYR") ?? makeTeam();

describe("labelsForTeam", () => {
  it("includes the team's labels and workspace labels, not other teams'", () => {
    expect(
      labelsForTeam("team-myr", workspace.labels).map((label) => label.id)
    ).toEqual([
      "myr-bug",
      "myr-enhancement",
      "myr-administrative",
      "myr-enrich",
      "myr-sunsama",
      "workspace-urgent",
    ]);
  });
});

describe("assignableLabels", () => {
  it("lists ungrouped labels first, then each group's children under it", () => {
    const sections = assignableLabels("team-myr", workspace.labels);

    expect(
      sections.map((section) => ({
        group: section.group?.name ?? null,
        labels: section.labels.map((label) => label.name),
      }))
    ).toEqual([
      { group: null, labels: ["bug", "Customer", "enhancement"] },
      { group: "Administrative", labels: ["Enrich", "Sunsama"] },
    ]);
  });

  it("never offers a group itself as a label", () => {
    const offered = assignableLabels("team-myr", workspace.labels).flatMap(
      (section) => section.labels
    );
    expect(offered.some((label) => label.isGroup)).toBe(false);
  });
});

describe("toggleLabel", () => {
  it("adds and removes an ungrouped label", () => {
    const added = toggleLabel([], "myr-bug", workspace.labels);
    expect(added).toEqual(["myr-bug"]);
    expect(toggleLabel(added, "myr-bug", workspace.labels)).toEqual([]);
  });

  it("allows only one label from a group at a time", () => {
    expect(
      toggleLabel(["myr-bug", "myr-enrich"], "myr-sunsama", workspace.labels)
    ).toEqual(["myr-bug", "myr-sunsama"]);
  });
});

describe("labelDelta", () => {
  it("lists additions and removals regardless of order", () => {
    expect(labelDelta(["a", "b", "c"], ["c", "d", "a"])).toEqual({
      addedLabelIds: ["d"],
      removedLabelIds: ["b"],
    });
    expect(labelDelta(["a"], ["a"])).toEqual({
      addedLabelIds: [],
      removedLabelIds: [],
    });
  });
});

describe("planTeamMove", () => {
  it("moves into the target team's triage state and maps labels by name", () => {
    const issue = makeIssue({
      labels: {
        nodes: [
          { id: "myr-bug" },
          { id: "myr-enrich" },
          { id: "workspace-urgent" },
        ],
      },
    });

    expect(planTeamMove(issue, shs, workspace)).toEqual({
      input: {
        labelIds: ["shs-bug", "shs-enrich", "workspace-urgent"],
        stateId: "shs-triage",
        teamId: "team-shs",
      },
      warnings: [],
    });
  });

  it("drops labels the target team does not have, with a warning", () => {
    const issue = makeIssue({
      identifier: "SHS-9",
      labels: { nodes: [{ id: "shs-devops" }, { id: "shs-bug" }] },
      state: { id: "shs-triage" },
      team: { id: "team-shs" },
    });

    expect(planTeamMove(issue, myr, workspace)).toEqual({
      input: {
        labelIds: ["myr-bug"],
        stateId: "myr-triage",
        teamId: "team-myr",
      },
      warnings: ['Label "DevOps" does not exist in MYR and was removed'],
    });
  });

  it("clears a project the target team is not part of, and keeps a shared one", () => {
    const privateProject = planTeamMove(
      makeIssue({ project: { id: "project-myr" } }),
      shs,
      workspace
    );
    expect(privateProject.input.projectId).toBeNull();
    expect(privateProject.warnings).toEqual([
      'Project "Myriad thing" is not shared with SHS and was removed',
    ]);

    const sharedProject = planTeamMove(
      makeIssue({ project: { id: "project-shared" } }),
      shs,
      workspace
    );
    expect(sharedProject.input).not.toHaveProperty("projectId");
    expect(sharedProject.warnings).toEqual([]);
  });

  it("falls back to the default state when the target team has no triage", () => {
    const shsWithoutTriage = {
      ...shs,
      triageEnabled: false,
      triageIssueState: null,
    };
    const withoutTriage = {
      ...workspace,
      states: workspace.states.filter((state) => state.id !== "shs-triage"),
      teams: [myr, shsWithoutTriage],
    };

    const plan = planTeamMove(makeIssue(), shsWithoutTriage, withoutTriage);

    expect(plan.input.stateId).toBe("shs-backlog");
    expect(plan.warnings).toEqual([
      "SHS does not use triage, so the issue will go straight to Backlog",
    ]);
  });

  it("refuses to move an issue into the team it is already in", () => {
    expect(() => planTeamMove(makeIssue(), myr, workspace)).toThrow(
      "MYR-1 is already in MYR"
    );
  });
});
