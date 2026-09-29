/**
 * Gesture maths for swipeable rows and pull to refresh, kept pure so the
 * thresholds that decide whether a touch becomes an action are tested.
 */

export type SwipeDirection = "left" | "right";
export type Intent = "horizontal" | "vertical";

export const swipeTuning = {
  /** Fraction of the row width a swipe must travel to commit. */
  commitFraction: 0.4,
  /** Touches starting this close to a screen edge are left to iOS. */
  edgeGuard: 24,
  /** Movement (px) before deciding between swipe and scroll. */
  intentDistance: 10,
  /** Horizontal movement must beat vertical by this factor to be a swipe. */
  intentRatio: 1.5,
  /** Pull distance (px) that triggers a refresh. */
  pullThreshold: 72,
} as const;

export function startsInEdgeZone(
  startX: number,
  viewportWidth: number
): boolean {
  return (
    startX < swipeTuning.edgeGuard ||
    startX > viewportWidth - swipeTuning.edgeGuard
  );
}

/** Decides what a touch is for, or null while it is still ambiguous. */
export function lockIntent(deltaX: number, deltaY: number): Intent | null {
  const horizontal = Math.abs(deltaX);
  const vertical = Math.abs(deltaY);
  if (
    horizontal < swipeTuning.intentDistance &&
    vertical < swipeTuning.intentDistance
  ) {
    return null;
  }
  return horizontal > vertical * swipeTuning.intentRatio
    ? "horizontal"
    : "vertical";
}

/** The committed direction when a swipe is released, or null to snap back. */
export function resolveSwipe(
  deltaX: number,
  rowWidth: number
): SwipeDirection | null {
  if (
    rowWidth <= 0 ||
    Math.abs(deltaX) < rowWidth * swipeTuning.commitFraction
  ) {
    return null;
  }
  return deltaX > 0 ? "right" : "left";
}

/** Pull-to-refresh progress from 0 to 1. */
export function pullProgress(distance: number): number {
  return Math.min(1, Math.max(0, distance / swipeTuning.pullThreshold));
}
