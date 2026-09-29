/**
 * Runs every query the app makes against the real Linear API and checks
 * the answers have the shape the app relies on. Strictly read-only.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { createLinearClient } from "~/lib/linear/client";
import {
  IssueDetailDocument,
  IssueLabelsDocument,
  IssueStateDocument,
  ProjectsDocument,
  SearchIssuesDocument,
  TeamsDocument,
  TriageQueueDocument,
  UpdateIssueDocument,
  UsersDocument,
  ViewerDocument,
  WorkflowStatesDocument,
} from "~/lib/linear/generated/graphql";
import { collectPages } from "~/lib/linear/pagination";
import type { TriageIssue, WorkspaceSnapshot } from "~/lib/linear/types";
import { estimateOptions } from "~/lib/triage/estimates";
import {
  acceptState,
  declineState,
  statesForTeam,
  triageState,
} from "~/lib/triage/states";
import {
  createReadOnlyClient,
  ReadOnlyViolationError,
} from "../support/read-only-client";

const apiKey = process.env.LINEAR_API_KEY ?? process.env.__LINEAR_API_KEY;
const uploadUrlPattern = /https:\/\/uploads\.linear\.app\/[^\s)"']+/g;

describe.skipIf(!apiKey)("live Linear API (read-only)", () => {
  const client = createReadOnlyClient(
    createLinearClient({ apiKey: apiKey ?? "" })
  );
  let workspace: WorkspaceSnapshot;
  let queue: TriageIssue[];

  beforeAll(async () => {
    const [teams, states, labels, projects, users] = await Promise.all([
      collectPages(
        async (after) => (await client.request(TeamsDocument, { after })).teams
      ),
      collectPages(
        async (after) =>
          (await client.request(WorkflowStatesDocument, { after }))
            .workflowStates
      ),
      collectPages(
        async (after) =>
          (await client.request(IssueLabelsDocument, { after })).issueLabels
      ),
      collectPages(
        async (after) =>
          (await client.request(ProjectsDocument, { after })).projects
      ),
      collectPages(
        async (after) => (await client.request(UsersDocument, { after })).users
      ),
    ]);
    workspace = { labels, projects, states, teams, users };
    queue = await collectPages(
      async (after) =>
        (await client.request(TriageQueueDocument, { after })).issues
    );
  });

  it("identifies the key's owner", async () => {
    const { organization, viewer } = await client.request(ViewerDocument, {});
    expect(viewer.id).toEqual(expect.any(String));
    expect(organization.urlKey).toEqual(expect.any(String));
  });

  it("returns a workspace the triage logic can plan against", () => {
    expect(workspace.teams.length).toBeGreaterThan(0);
    expect(workspace.users.some((user) => user.isMe)).toBe(true);
    for (const team of workspace.teams.filter(
      (candidate) => candidate.triageEnabled
    )) {
      const teamStates = statesForTeam(team.id, workspace.states);
      expect(triageState(team, teamStates).type).toBe("triage");
      expect(["backlog", "unstarted", "started"]).toContain(
        acceptState(team, teamStates).type
      );
      expect(declineState(team, teamStates).type).toBe("canceled");
      if (team.issueEstimationType !== "notUsed") {
        expect(estimateOptions(team).length).toBeGreaterThan(0);
      }
    }
  });

  it("lists only issues that are in a triage state", () => {
    const triageStateIds = new Set(
      workspace.states
        .filter((state) => state.type === "triage")
        .map((state) => state.id)
    );
    for (const issue of queue) {
      expect(triageStateIds.has(issue.state.id)).toBe(true);
    }
  });

  it("loads issue details with signed file URLs", async () => {
    const sample = queue.slice(0, 5);
    const details = await Promise.all(
      sample.map((issue) =>
        client.request(
          IssueDetailDocument,
          { id: issue.id },
          { signedFileUrls: true }
        )
      )
    );
    for (const { issue } of details) {
      expect(issue.comments.nodes).toEqual(expect.any(Array));
      for (const url of issue.description?.match(uploadUrlPattern) ?? []) {
        expect(url).toContain("signature=");
      }
    }
  });

  it("reads the state used to guard undo", async () => {
    const [issue] = queue;
    if (!issue) {
      return;
    }
    const { issue: state } = await client.request(IssueStateDocument, {
      id: issue.id,
    });
    expect(state.state.type).toBe("triage");
  });

  it("searches issues for the duplicate picker", async () => {
    const { searchIssues } = await client.request(SearchIssuesDocument, {
      term: "the",
    });
    expect(searchIssues.nodes).toEqual(expect.any(Array));
    for (const result of searchIssues.nodes) {
      expect(result.identifier).toEqual(expect.any(String));
    }
  });

  it("cannot send a mutation", async () => {
    await expect(
      client.request(UpdateIssueDocument, { id: "not-sent", input: {} })
    ).rejects.toBeInstanceOf(ReadOnlyViolationError);
  });
});
