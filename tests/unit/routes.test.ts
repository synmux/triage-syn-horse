import { describe, expect, it } from "vitest";
import { acceptGuideRoute, issuePath } from "~/lib/routes";

describe("issuePath", () => {
  it("builds the route for an issue id", () => {
    expect(issuePath("de65fa37-5011-4473-8586-690b6a39efa9")).toBe(
      "/issue/de65fa37-5011-4473-8586-690b6a39efa9"
    );
  });

  it("escapes characters that would change the route", () => {
    expect(issuePath("a/b?c#d")).toBe("/issue/a%2Fb%3Fc%23d");
  });
});

describe("acceptGuideRoute", () => {
  it("opens the issue with the accept guide query", () => {
    expect(acceptGuideRoute("a/b")).toEqual({
      path: "/issue/a%2Fb",
      query: { accept: "guide" },
    });
  });
});
