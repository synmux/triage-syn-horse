/**
 * Linear's estimate scales. Estimates are stored as numbers; T-shirt sizes
 * are labels over the Fibonacci values (https://linear.app/docs/estimates).
 */
import type { Team } from "../linear/types";

export interface EstimateOption {
  label: string;
  value: number;
}

type EstimationSettings = Pick<
  Team,
  "issueEstimationType" | "issueEstimationExtended" | "issueEstimationAllowZero"
>;

const scales: Record<string, { base: number[]; extended: number[] }> = {
  exponential: { base: [1, 2, 4, 8, 16], extended: [32, 64] },
  fibonacci: { base: [1, 2, 3, 5, 8], extended: [13, 21] },
  linear: { base: [1, 2, 3, 4, 5], extended: [6, 7] },
  tShirt: { base: [1, 2, 3, 5, 8], extended: [13, 21] },
};

const tShirtSizes = new Map<number, string>([
  [1, "XS"],
  [2, "S"],
  [3, "M"],
  [5, "L"],
  [8, "XL"],
  [13, "XXL"],
  [21, "XXXL"],
]);

export function estimationEnabled(team: EstimationSettings): boolean {
  return team.issueEstimationType in scales;
}

export function estimateOptions(team: EstimationSettings): EstimateOption[] {
  const scale = scales[team.issueEstimationType];
  if (!scale) {
    return [];
  }
  const values = [
    ...(team.issueEstimationAllowZero ? [0] : []),
    ...scale.base,
    ...(team.issueEstimationExtended ? scale.extended : []),
  ];
  return values.map((value) => ({ label: labelFor(team, value), value }));
}

/** The label Linear would show for `value`, or null when there is no estimate. */
export function estimateLabel(
  team: EstimationSettings,
  value: number | null
): string | null {
  return value === null ? null : labelFor(team, value);
}

function labelFor(team: EstimationSettings, value: number): string {
  if (team.issueEstimationType === "tShirt") {
    return tShirtSizes.get(value) ?? String(value);
  }
  return String(value);
}
