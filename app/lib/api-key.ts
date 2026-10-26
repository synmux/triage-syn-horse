const bearerPrefix = /^bearer\s+/iu;
const whitespace = /\s/u;

/**
 * Cleans up a pasted Linear API key: surrounding whitespace and a
 * `Bearer ` prefix are removed (Linear rejects keys sent as Bearer tokens).
 */
export function normaliseApiKey(raw: string): string {
  const key = raw.trim().replace(bearerPrefix, "").trim();
  if (!key) {
    throw new Error("Paste your Linear API key");
  }
  if (whitespace.test(key)) {
    throw new Error(
      "That doesn't look like a Linear API key: it contains spaces"
    );
  }
  return key;
}
