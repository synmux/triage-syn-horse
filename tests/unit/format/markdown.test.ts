// @vitest-environment jsdom
// DOMPurify misparses some elements under happy-dom; jsdom matches browsers.
import { describe, expect, it } from "vitest";
import { renderMarkdown } from "~/lib/format/markdown";

const toDom = (html: string) => {
  const container = document.createElement("div");
  container.innerHTML = html;
  return container;
};

/** Every attribute of every element, for hunting executable content. */
const attributesOf = (container: HTMLElement) =>
  [...container.querySelectorAll("*")].flatMap((element) =>
    [...element.attributes].map((attribute) => ({
      name: attribute.name.toLowerCase(),
      tag: element.tagName.toLowerCase(),
      value: attribute.value.trim().toLowerCase(),
    }))
  );

const assertInert = (html: string) => {
  const container = toDom(html);
  expect(
    container.querySelectorAll("script, iframe, object, embed, style, form")
  ).toHaveLength(0);
  for (const attribute of attributesOf(container)) {
    expect(attribute.name.startsWith("on")).toBe(false);
    if (attribute.name === "href" || attribute.name === "src") {
      expect(attribute.value.startsWith("javascript:")).toBe(false);
      expect(attribute.value.startsWith("vbscript:")).toBe(false);
      expect(attribute.value.startsWith("data:text")).toBe(false);
    }
  }
};

describe("renderMarkdown", () => {
  it("renders common markdown", () => {
    const container = toDom(
      renderMarkdown(
        "## Plan\n\nSome **bold** and `code`.\n\n- one\n- two\n\n```\nconst a = '<b>';\n```"
      )
    );
    expect(container.querySelector("h2")?.textContent).toBe("Plan");
    expect(container.querySelector("strong")?.textContent).toBe("bold");
    expect(container.querySelectorAll("li")).toHaveLength(2);
    expect(container.querySelector("pre code")?.textContent).toBe(
      "const a = '<b>';\n"
    );
  });

  it("opens links in a new tab without leaking the referrer", () => {
    const link = toDom(
      renderMarkdown("[docs](https://linear.app/docs)")
    ).querySelector("a");
    expect(link?.getAttribute("href")).toBe("https://linear.app/docs");
    expect(link?.getAttribute("target")).toBe("_blank");
    expect(link?.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("links bare URLs", () => {
    const link = toDom(
      renderMarkdown("See https://github.com/synmux/syn-horse/issues/97 now")
    ).querySelector("a");
    expect(link?.getAttribute("href")).toBe(
      "https://github.com/synmux/syn-horse/issues/97"
    );
  });

  it("loads images lazily without a referrer", () => {
    const image = toDom(
      renderMarkdown("![shot](https://uploads.linear.app/a/b/c?signature=abc)")
    ).querySelector("img");
    expect(image?.getAttribute("src")).toBe(
      "https://uploads.linear.app/a/b/c?signature=abc"
    );
    expect(image?.getAttribute("alt")).toBe("shot");
    expect(image?.getAttribute("loading")).toBe("lazy");
    expect(image?.getAttribute("referrerpolicy")).toBe("no-referrer");
  });

  it("wraps tables so they scroll inside their own box", () => {
    const container = toDom(renderMarkdown("| a | b |\n| - | - |\n| 1 | 2 |"));
    expect(container.querySelector(".md-scroll > table")).not.toBeNull();
  });

  it("shows task list markers as ballot boxes", () => {
    const container = toDom(renderMarkdown("- [ ] todo\n- [x] done"));
    expect(
      [...container.querySelectorAll("li")].map((item) => item.textContent)
    ).toEqual(["☐ todo", "☑ done"]);
  });

  it("returns an empty string for missing content", () => {
    expect(renderMarkdown(null)).toBe("");
    expect(renderMarkdown(undefined)).toBe("");
    expect(renderMarkdown("   ")).toBe("");
  });

  it.each([
    ["script tag", "<script>alert(1)</script>"],
    ["image onerror", '<img src="x" onerror="alert(1)">'],
    ["svg onload", "<svg onload=alert(1)></svg>"],
    ["iframe", '<iframe src="https://evil.example"></iframe>'],
    ["javascript link", "[click](javascript:alert(1))"],
    ["javascript image", "![x](javascript:alert(1))"],
    [
      "data URL link",
      "[x](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)",
    ],
    ["vbscript link", "[x](vbscript:msgbox(1))"],
    ["encoded javascript", "[x](jav&#x09;ascript:alert(1))"],
    ["autolink javascript", "<javascript:alert(1)>"],
  ])("neutralises %s", (_name, payload) => {
    assertInert(renderMarkdown(payload));
  });

  it("shows raw HTML as text rather than markup", () => {
    const container = toDom(renderMarkdown("<b>not bold</b>"));
    expect(container.querySelector("b")).toBeNull();
    expect(container.textContent).toContain("<b>not bold</b>");
  });
});
