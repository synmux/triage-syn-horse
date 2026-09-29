/**
 * Renders Linear markdown (issue descriptions, comments) to safe HTML.
 *
 * Two layers of defence: markdown-it runs with raw HTML disabled and its
 * own link validation, then DOMPurify sanitises the result. Links open in
 * a new tab without a referrer; images load lazily without a referrer, so
 * signed file URLs never leak.
 */
import createDOMPurify from "dompurify";
import MarkdownIt from "markdown-it";

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: false,
});

markdown.renderer.rules.table_open = () => '<div class="md-scroll"><table>';
markdown.renderer.rules.table_close = () => "</table></div>";

const taskMarker = /^\[( |x|X)\] /;

// Linear writes task lists as "- [ ] item"; show them as ballot boxes.
markdown.core.ruler.after("inline", "task-markers", (state) => {
  for (const [index, token] of state.tokens.entries()) {
    if (
      token.type !== "inline" ||
      state.tokens[index - 2]?.type !== "list_item_open"
    ) {
      continue;
    }
    const firstChild = token.children?.[0];
    const match =
      firstChild?.type === "text" ? taskMarker.exec(firstChild.content) : null;
    if (firstChild && match) {
      const box = match[1] === " " ? "☐" : "☑";
      firstChild.content = `${box} ${firstChild.content.slice(match[0].length)}`;
    }
  }
});

let purifier: ReturnType<typeof createDOMPurify> | null = null;

/** One DOMPurify instance with the app's hooks, created on first use. */
function getPurifier(): ReturnType<typeof createDOMPurify> {
  if (purifier) {
    return purifier;
  }
  const instance = createDOMPurify(window);
  instance.addHook("afterSanitizeAttributes", (node) => {
    const tag = node.nodeName.toUpperCase();
    if (tag === "A") {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer");
    }
    if (tag === "IMG") {
      node.setAttribute("loading", "lazy");
      node.setAttribute("decoding", "async");
      node.setAttribute("referrerpolicy", "no-referrer");
    }
  });
  purifier = instance;
  return instance;
}

export function renderMarkdown(source: string | null | undefined): string {
  if (!source?.trim()) {
    return "";
  }
  return getPurifier().sanitize(markdown.render(source), {
    ADD_ATTR: ["target"],
    FORBID_TAGS: ["style", "form", "input", "button", "textarea", "select"],
    USE_PROFILES: { html: true },
  });
}
