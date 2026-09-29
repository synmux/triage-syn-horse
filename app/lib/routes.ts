/**
 * Route builders, so no page assembles a path by hand.
 */

/** The in-app route for an issue. */
export function issuePath(issueId: string): string {
  return `/issue/${encodeURIComponent(issueId)}`;
}

/** The query that opens an issue with the accept guide running. */
export const acceptGuideQuery = { accept: "guide" } as const;

/**
 * Opens an issue and walks the user through what Accept still needs, for
 * an Accept that was asked for somewhere the pickers aren't (a queue swipe).
 */
export function acceptGuideRoute(issueId: string) {
  return { path: issuePath(issueId), query: { ...acceptGuideQuery } };
}
