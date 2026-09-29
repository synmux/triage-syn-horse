/**
 * Route builders, so no page assembles a path by hand.
 */

/** The in-app route for an issue. */
export function issuePath(issueId: string): string {
  return `/issue/${encodeURIComponent(issueId)}`;
}
