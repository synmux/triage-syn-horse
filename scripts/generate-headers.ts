/**
 * Writes `_headers` for Cloudflare Workers static assets after
 * `nuxt generate`: a strict Content Security Policy that allows only the
 * exact inline scripts Nuxt emitted (by SHA-256 hash), plus privacy and
 * caching headers.
 *
 * Usage: node scripts/generate-headers.ts [.output/public]
 */
import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
const typePattern = /\btype\s*=\s*["']?([^"'\s>]+)/i;
const srcPattern = /\bsrc\s*=/i;

/** Script types the browser executes (or, for import maps, obeys) inline. */
const executableTypes = new Set([
  "",
  "module",
  "importmap",
  "text/javascript",
  "application/javascript",
]);

const sha256 = (source: string) =>
  `'sha256-${createHash("sha256").update(source, "utf8").digest("base64")}'`;

/** CSP hashes for every executable inline script in an HTML document. */
export function inlineScriptHashes(html: string): string[] {
  const hashes: string[] = [];
  for (const [, attributes = "", body = ""] of html.matchAll(scriptPattern)) {
    const type = (typePattern.exec(attributes)?.[1] ?? "").toLowerCase();
    if (srcPattern.test(attributes) || !executableTypes.has(type)) {
      continue;
    }
    hashes.push(sha256(body));
  }
  return hashes;
}

export function contentSecurityPolicy(scriptHashes: string[]): string {
  return [
    "default-src 'self'",
    ["script-src 'self'", ...scriptHashes].join(" "),
    // Vue binds style attributes and the loading splash has a style block.
    "style-src 'self' 'unsafe-inline'",
    // Linear avatars and signed uploads come from several HTTPS hosts.
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://api.linear.app",
    "font-src 'self'",
    "manifest-src 'self'",
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
    // No upgrade-insecure-requests: workers.dev is HTTPS-only anyway, and on
    // a local http preview WebKit would upgrade every asset request and hang.
  ].join("; ");
}

export function buildHeadersFile(htmlDocuments: string[]): string {
  const hashes = [...new Set(htmlDocuments.flatMap(inlineScriptHashes))];
  return [
    "/*",
    `  Content-Security-Policy: ${contentSecurityPolicy(hashes)}`,
    "  Referrer-Policy: no-referrer",
    "  X-Content-Type-Options: nosniff",
    "  X-Frame-Options: DENY",
    "  Cross-Origin-Opener-Policy: same-origin",
    "  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "  X-Robots-Tag: noindex, nofollow",
    "",
    "/_nuxt/*",
    "  Cache-Control: public, max-age=31536000, immutable",
    "",
    "/sw.js",
    "  Cache-Control: no-cache",
    "",
  ].join("\n");
}

async function main(outputDirectory: string) {
  const htmlFiles = (await readdir(outputDirectory)).filter((file) =>
    file.endsWith(".html")
  );
  if (htmlFiles.length === 0) {
    throw new Error(
      `No HTML files in ${outputDirectory}; run nuxt generate first`
    );
  }
  const documents = await Promise.all(
    htmlFiles.map((file) => readFile(join(outputDirectory, file), "utf8"))
  );
  const headers = buildHeadersFile(documents);
  await writeFile(join(outputDirectory, "_headers"), headers);
  const hashCount = new Set(documents.flatMap(inlineScriptHashes)).size;
  process.stdout.write(
    `Wrote _headers for ${htmlFiles.length} HTML files with ${hashCount} script hashes\n`
  );
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  await main(process.argv[2] ?? ".output/public");
}
