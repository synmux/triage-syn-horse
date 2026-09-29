import { describe, expect, it } from "vitest";
import { sourceLabel, titleSegments } from "~/lib/format/text";

describe("titleSegments", () => {
  it("splits inline code out of a title", () => {
    expect(titleSegments("Move `/ssh/keys`, `/sudo`, etc")).toEqual([
      { code: false, text: "Move " },
      { code: true, text: "/ssh/keys" },
      { code: false, text: ", " },
      { code: true, text: "/sudo" },
      { code: false, text: ", etc" },
    ]);
  });

  it("leaves plain titles and unmatched backticks alone", () => {
    expect(titleSegments("Check out CoTech")).toEqual([
      { code: false, text: "Check out CoTech" },
    ]);
    expect(titleSegments("Odd ` tick")).toEqual([
      { code: false, text: "Odd ` tick" },
    ]);
  });

  it("drops empty code spans", () => {
    expect(titleSegments("Empty `` here")).toEqual([
      { code: false, text: "Empty `` here" },
    ]);
  });
});

describe("sourceLabel", () => {
  it("names well-known integrations properly", () => {
    expect(sourceLabel("github")).toBe("GitHub");
    expect(sourceLabel("slack")).toBe("Slack");
    expect(sourceLabel("asksWeb")).toBe("Asks");
    expect(sourceLabel("email")).toBe("Email");
  });

  it("falls back to a readable version of unknown names", () => {
    expect(sourceLabel("someNewThing")).toBe("Some new thing");
    expect(sourceLabel(null)).toBeNull();
  });
});
