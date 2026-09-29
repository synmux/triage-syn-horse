/**
 * Small text helpers for issue metadata.
 */

export interface TitleSegment {
  code: boolean;
  text: string;
}

const inlineCode = /`([^`]+)`/g;
const whitespaceRun = /\s+/g;
const allowedLinkProtocols = new Set(["http:", "https:"]);

/** A title as Linear should store it: trimmed, whitespace collapsed. */
export function normaliseTitle(raw: string): string {
  const title = raw.replace(whitespaceRun, " ").trim();
  if (!title) {
    throw new Error("A title can't be empty");
  }
  return title;
}

/** The URL if it is a plain web link, otherwise null (never javascript: and friends). */
export function safeExternalUrl(url: string): string | null {
  try {
    const parsed = new URL(url.trim());
    return allowedLinkProtocols.has(parsed.protocol) ? parsed.href : null;
  } catch {
    return null;
  }
}

/**
 * Splits a title into plain and `inline code` segments, so the UI can
 * style code without rendering HTML.
 */
export function titleSegments(title: string): TitleSegment[] {
  const segments: TitleSegment[] = [];
  let cursor = 0;
  for (const match of title.matchAll(inlineCode)) {
    const [whole, code] = match;
    if (match.index > cursor) {
      segments.push({ code: false, text: title.slice(cursor, match.index) });
    }
    segments.push({ code: true, text: code ?? "" });
    cursor = match.index + whole.length;
  }
  if (cursor < title.length) {
    segments.push({ code: false, text: title.slice(cursor) });
  }
  return segments;
}

const knownSources: Record<string, string> = {
  asks: "Asks",
  asksWeb: "Asks",
  discord: "Discord",
  email: "Email",
  figma: "Figma",
  front: "Front",
  github: "GitHub",
  githubEnterpriseServer: "GitHub",
  gitlab: "GitLab",
  intercom: "Intercom",
  jira: "Jira",
  notion: "Notion",
  salesforce: "Salesforce",
  sentry: "Sentry",
  slack: "Slack",
  zendesk: "Zendesk",
};

const wordBoundary = /([a-z])([A-Z])/g;

/** A readable name for the integration that created an issue. */
export function sourceLabel(service: string | null): string | null {
  if (!service) {
    return null;
  }
  const known = knownSources[service];
  if (known) {
    return known;
  }
  const words = service.replace(wordBoundary, "$1 $2").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
