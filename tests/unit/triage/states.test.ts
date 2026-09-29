import { describe, expect, it } from "vitest";
import {
  acceptState,
  acceptTargets,
  declineState,
  statesForTeam,
  triageState,
} from "~/lib/triage/states";
import { makeState, makeTeam, workflowFor } from "../../support/factories";

const states = workflowFor("team-myr", "myr");
const team = makeTeam();

describe("statesForTeam", () => {
  it("returns only the team's states in position order", () => {
    const mixed = [...workflowFor("team-shs", "shs"), ...[...states].reverse()];
    expect(statesForTeam("team-myr", mixed).map((state) => state.id)).toEqual(
      states.map((state) => state.id)
    );
  });
});

describe("triageState", () => {
  it("uses the team's configured triage state", () => {
    expect(triageState(team, states).id).toBe("myr-triage");
  });

  it("falls back to the first triage-type state", () => {
    expect(triageState(makeTeam({ triageIssueState: null }), states).id).toBe(
      "myr-triage"
    );
  });

  it("throws when the team has no triage state", () => {
    expect(() =>
      triageState(
        makeTeam({ triageIssueState: null }),
        states.filter((state) => state.type !== "triage")
      )
    ).toThrow("Team MYR has no triage state");
  });
});

describe("acceptState", () => {
  it("uses the team default when it is a backlog, unstarted or started state", () => {
    expect(acceptState(team, states).id).toBe("myr-backlog");
    expect(
      acceptState(
        makeTeam({ defaultIssueState: { id: "myr-scheduled" } }),
        states
      ).id
    ).toBe("myr-scheduled");
  });

  it("ignores a default that is itself triage and falls back to the first backlog state", () => {
    expect(
      acceptState(makeTeam({ defaultIssueState: { id: "myr-triage" } }), states)
        .id
    ).toBe("myr-backlog");
  });

  it("falls back to the first unstarted state when there is no backlog", () => {
    const withoutBacklog = states.filter((state) => state.type !== "backlog");
    expect(
      acceptState(makeTeam({ defaultIssueState: null }), withoutBacklog).id
    ).toBe("myr-scheduled");
  });

  it("throws a clear error when nothing is suitable", () => {
    const onlyTriage = states.filter((state) => state.type === "triage");
    expect(() =>
      acceptState(makeTeam({ defaultIssueState: null }), onlyTriage)
    ).toThrow("Team MYR has no backlog or unstarted state to accept into");
  });
});

describe("declineState", () => {
  it("picks the lowest-position canceled state", () => {
    const withTwoCanceled = [
      ...states,
      makeState({
        id: "myr-wont-fix",
        name: "Won't fix",
        position: -1,
        type: "canceled",
      }),
    ];
    expect(declineState(team, withTwoCanceled).id).toBe("myr-wont-fix");
  });

  it("throws when the team has no canceled state", () => {
    expect(() =>
      declineState(
        team,
        states.filter((state) => state.type !== "canceled")
      )
    ).toThrow("Team MYR has no canceled state to decline into");
  });
});

describe("acceptTargets", () => {
  it("lists backlog, unstarted then started states in position order", () => {
    expect(acceptTargets(team, states).map((state) => state.name)).toEqual([
      "Backlog",
      "Scheduled",
      "In Progress",
      "In Review",
    ]);
  });
});
