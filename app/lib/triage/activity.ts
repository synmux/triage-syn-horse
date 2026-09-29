/**
 * Shapes an issue's comments and relations for reading on a phone.
 */
import type { IssueDetail } from "../linear/types";

type Comment = IssueDetail["comments"]["nodes"][number];

export interface ThreadedComment {
  comment: Comment;
  /** 0 for a top-level comment, 1 for a reply. */
  depth: number;
}

const byCreation = (first: Comment, second: Comment) =>
  new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime();

/** Top-level comments oldest first, each followed by its replies. */
export function threadComments(comments: Comment[]): ThreadedComment[] {
  const ids = new Set(comments.map((comment) => comment.id));
  const isTopLevel = (comment: Comment) =>
    !(comment.parent && ids.has(comment.parent.id));
  const threaded: ThreadedComment[] = [];
  for (const topLevel of comments.filter(isTopLevel).sort(byCreation)) {
    threaded.push({ comment: topLevel, depth: 0 });
    for (const reply of comments
      .filter((comment) => comment.parent?.id === topLevel.id)
      .sort(byCreation)) {
      threaded.push({ comment: reply, depth: 1 });
    }
  }
  return threaded;
}

type RelatedIssue = IssueDetail["relations"]["nodes"][number]["relatedIssue"];

export interface DescribedRelation {
  id: string;
  issue: RelatedIssue;
  label: string;
}

const outgoing: Record<string, string> = {
  blocks: "Blocks",
  duplicate: "Duplicate of",
  related: "Related to",
  similar: "Similar to",
};

const incoming: Record<string, string> = {
  blocks: "Blocked by",
  duplicate: "Duplicated by",
  related: "Related to",
  similar: "Similar to",
};

/** Relations worded from this issue's point of view, outgoing first. */
export function describeRelations(
  detail: Pick<IssueDetail, "relations" | "inverseRelations">
): DescribedRelation[] {
  return [
    ...detail.relations.nodes.map((relation) => ({
      id: relation.id,
      issue: relation.relatedIssue,
      label: outgoing[relation.type] ?? "Linked to",
    })),
    ...detail.inverseRelations.nodes.map((relation) => ({
      id: relation.id,
      issue: relation.issue,
      label: incoming[relation.type] ?? "Linked from",
    })),
  ];
}
