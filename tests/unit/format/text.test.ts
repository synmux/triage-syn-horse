import { describe, expect, it } from "vitest";
import {
  normaliseTitle,
  safeExternalUrl,
  sourceLabel,
  titleSegments,
} from "~/lib/format/text";

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

describe("normaliseTitle", () => {
  it("trims and collapses runs of whitespace, keeping every letter", () => {
    expect(normaliseTitle("  Fix sessions  list\n\tnow  ")).toBe(
      "Fix sessions list now"
    );
  });

  it("refuses a title that is empty after trimming", () => {
    expect(() => normaliseTitle(" \n ")).toThrow("A title can't be empty");
  });
});

describe("safeExternalUrl", () => {
  it("allows http and https links", () => {
    expect(safeExternalUrl("https://github.com/synmux/myriad/issues/1")).toBe(
      "https://github.com/synmux/myriad/issues/1"
    );
    expect(safeExternalUrl("http://example.com/a")).toBe(
      "http://example.com/a"
    );
  });

  it("rejects other schemes and garbage", () => {
    expect(safeExternalUrl("javascript:alert(1)")).toBeNull();
    expect(safeExternalUrl(" JavaScript:alert(1)")).toBeNull();
    expect(safeExternalUrl("data:text/html,hi")).toBeNull();
    expect(safeExternalUrl("not a url")).toBeNull();
  });
});
