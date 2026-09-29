import { describe, expect, it } from "vitest";
import { describeRelations, threadComments } from "~/lib/triage/activity";

const comment = (
  id: string,
  createdAt: string,
  parentId: string | null = null
) => ({
  body: id,
  botActor: null,
  createdAt,
  externalUser: null,
  id,
  parent: parentId ? { id: parentId } : null,
  user: null,
});

describe("threadComments", () => {
  it("orders top-level comments oldest first with replies under their parent", () => {
    const threaded = threadComments([
      comment("reply-b", "2026-09-03T00:00:00Z", "b"),
      comment("b", "2026-09-02T00:00:00Z"),
      comment("a", "2026-09-01T00:00:00Z"),
      comment("reply-a2", "2026-09-05T00:00:00Z", "a"),
      comment("reply-a1", "2026-09-04T00:00:00Z", "a"),
    ]);
    expect(threaded.map((entry) => [entry.comment.id, entry.depth])).toEqual([
      ["a", 0],
      ["reply-a1", 1],
      ["reply-a2", 1],
      ["b", 0],
      ["reply-b", 1],
    ]);
  });

  it("keeps replies whose parent is missing, at the top level", () => {
    expect(
      threadComments([comment("orphan", "2026-09-01T00:00:00Z", "gone")]).map(
        (entry) => [entry.comment.id, entry.depth]
      )
    ).toEqual([["orphan", 0]]);
  });
});

describe("describeRelations", () => {
  const other = (identifier: string) => ({
    id: identifier,
    identifier,
    state: { color: "#999", id: "s", name: "Backlog", type: "backlog" },
    title: `${identifier} title`,
  });

  it("describes relations from this issue's point of view", () => {
    const described = describeRelations({
      inverseRelations: {
        nodes: [
          { id: "r3", issue: other("MYR-3"), type: "blocks" },
          { id: "r4", issue: other("MYR-4"), type: "duplicate" },
          { id: "r5", issue: other("MYR-5"), type: "related" },
        ],
      },
      relations: {
        nodes: [
          { id: "r1", relatedIssue: other("MYR-1"), type: "blocks" },
          { id: "r2", relatedIssue: other("MYR-2"), type: "duplicate" },
          { id: "r6", relatedIssue: other("MYR-6"), type: "similar" },
        ],
      },
    });
    expect(
      described.map(
        (relation) => `${relation.label} ${relation.issue.identifier}`
      )
    ).toEqual([
      "Blocks MYR-1",
      "Duplicate of MYR-2",
      "Similar to MYR-6",
      "Blocked by MYR-3",
      "Duplicated by MYR-4",
      "Related to MYR-5",
    ]);
  });
});
