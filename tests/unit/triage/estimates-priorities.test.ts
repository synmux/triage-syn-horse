import { describe, expect, it } from "vitest";
import {
  estimateLabel,
  estimateOptions,
  estimationEnabled,
} from "~/lib/triage/estimates";
import {
  priorities,
  priorityLabel,
  prioritySortRank,
} from "~/lib/triage/priorities";
import { makeTeam } from "../../support/factories";

const labelsOf = (options: { value: number; label: string }[]) =>
  options.map((option) => `${option.value}:${option.label}`);

describe("estimateOptions", () => {
  it("maps T-shirt sizes onto the Fibonacci values Linear stores", () => {
    expect(labelsOf(estimateOptions(makeTeam()))).toEqual([
      "1:XS",
      "2:S",
      "3:M",
      "5:L",
      "8:XL",
    ]);
  });

  it("adds XXL and XXXL on the extended T-shirt scale", () => {
    expect(
      labelsOf(estimateOptions(makeTeam({ issueEstimationExtended: true })))
    ).toEqual(["1:XS", "2:S", "3:M", "5:L", "8:XL", "13:XXL", "21:XXXL"]);
  });

  it("prepends zero when the team allows zero estimates", () => {
    expect(
      labelsOf(estimateOptions(makeTeam({ issueEstimationAllowZero: true })))
    ).toEqual(["0:0", "1:XS", "2:S", "3:M", "5:L", "8:XL"]);
  });

  it.each([
    ["exponential", false, [1, 2, 4, 8, 16]],
    ["exponential", true, [1, 2, 4, 8, 16, 32, 64]],
    ["fibonacci", false, [1, 2, 3, 5, 8]],
    ["fibonacci", true, [1, 2, 3, 5, 8, 13, 21]],
    ["linear", false, [1, 2, 3, 4, 5]],
    ["linear", true, [1, 2, 3, 4, 5, 6, 7]],
  ] as const)("uses the %s scale (extended: %s)", (type, extended, values) => {
    const options = estimateOptions(
      makeTeam({
        issueEstimationExtended: extended,
        issueEstimationType: type,
      })
    );
    expect(options.map((option) => option.value)).toEqual(values);
    expect(options.map((option) => option.label)).toEqual(values.map(String));
  });

  it("offers nothing when estimates are off or the scale is unknown", () => {
    expect(
      estimateOptions(makeTeam({ issueEstimationType: "notUsed" }))
    ).toEqual([]);
    expect(
      estimateOptions(makeTeam({ issueEstimationType: "moonPhases" }))
    ).toEqual([]);
    expect(
      estimationEnabled(makeTeam({ issueEstimationType: "notUsed" }))
    ).toBe(false);
    expect(estimationEnabled(makeTeam())).toBe(true);
  });
});

describe("estimateLabel", () => {
  it("labels known values and falls back to the number", () => {
    const team = makeTeam();
    expect(estimateLabel(team, 5)).toBe("L");
    expect(estimateLabel(team, 4)).toBe("4");
    expect(estimateLabel(team, null)).toBeNull();
    expect(
      estimateLabel(makeTeam({ issueEstimationType: "fibonacci" }), 8)
    ).toBe("8");
  });
});

describe("priorities", () => {
  it("lists Linear's priorities in its picker order", () => {
    expect(priorities.map((priority) => priority.label)).toEqual([
      "No priority",
      "Urgent",
      "High",
      "Medium",
      "Low",
    ]);
  });

  it("labels values and rejects unknown ones", () => {
    expect(priorityLabel(3)).toBe("Medium");
    expect(priorityLabel(0)).toBe("No priority");
    expect(() => priorityLabel(9)).toThrow("Unknown priority 9");
  });

  it("sorts urgent first and no priority last", () => {
    const sorted = [0, 4, 1, 3, 2].sort(
      (first, second) => prioritySortRank(first) - prioritySortRank(second)
    );
    expect(sorted).toEqual([1, 2, 3, 4, 0]);
  });
});
