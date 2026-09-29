import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  buildHeadersFile,
  contentSecurityPolicy,
  inlineScriptHashes,
} from "../../../scripts/generate-headers";

const hashOf = (source: string) =>
  `'sha256-${createHash("sha256").update(source, "utf8").digest("base64")}'`;

const inlineScriptsAllowed = /script-src[^;]*unsafe-inline/;
const startsWithCatchAll = /^\/\*\n/;
const importMap = '{"imports":{"#entry":"/_nuxt/abc.js"}}';
const bootstrap = "window.__NUXT__={};window.__NUXT__.config={public:{}}";

const shell = `<!DOCTYPE html><html><head>
<script type="importmap">${importMap}</script>
<script type="module" src="/_nuxt/abc.js" crossorigin></script>
</head><body><div id="__nuxt"></div>
<script>${bootstrap}</script>
<script type="application/json" id="__NUXT_DATA__">[{"serverRendered":1},false]</script>
</body></html>`;

describe("inlineScriptHashes", () => {
  it("hashes executable inline scripts and import maps only", () => {
    expect(inlineScriptHashes(shell)).toEqual([
      hashOf(importMap),
      hashOf(bootstrap),
    ]);
  });

  it("ignores external scripts and JSON data blocks", () => {
    expect(
      inlineScriptHashes(
        '<script src="/a.js"></script><script type="application/json">{"a":1}</script><script type="application/ld+json">{}</script>'
      )
    ).toEqual([]);
  });
});

describe("contentSecurityPolicy", () => {
  const policy = contentSecurityPolicy([hashOf(bootstrap)]);

  it("allows scripts only from the site and the listed hashes", () => {
    expect(policy).toContain(`script-src 'self' ${hashOf(bootstrap)}`);
    expect(policy).not.toContain("unsafe-inline' 'sha");
    expect(policy).not.toMatch(inlineScriptsAllowed);
    expect(policy).not.toContain("unsafe-eval");
  });

  it("only lets the page talk to itself and Linear's API", () => {
    expect(policy).toContain("connect-src 'self' https://api.linear.app");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("base-uri 'none'");
    expect(policy).toContain("form-action 'none'");
  });

  it("does not upgrade requests, which hangs local http previews in WebKit", () => {
    expect(policy).not.toContain("upgrade-insecure-requests");
  });
});

describe("buildHeadersFile", () => {
  const file = buildHeadersFile([
    shell,
    shell.replace(bootstrap, "window.__NUXT__={}"),
  ]);

  it("applies the policy and privacy headers to every path", () => {
    expect(file).toMatch(startsWithCatchAll);
    expect(file).toContain("  Content-Security-Policy: ");
    expect(file).toContain("  Referrer-Policy: no-referrer");
    expect(file).toContain("  X-Content-Type-Options: nosniff");
    expect(file).toContain("  X-Robots-Tag: noindex, nofollow");
    expect(file).toContain("  Permissions-Policy: ");
  });

  it("collects the hashes of every document without duplicates", () => {
    const policyLine =
      file
        .split("\n")
        .find((line) => line.includes("Content-Security-Policy")) ?? "";
    expect(policyLine).toContain(hashOf(bootstrap));
    expect(policyLine).toContain(hashOf("window.__NUXT__={}"));
    expect(policyLine.split(hashOf(importMap)).length - 1).toBe(1);
  });

  it("caches fingerprinted assets forever and the service worker never", () => {
    expect(file).toContain(
      "/_nuxt/*\n  Cache-Control: public, max-age=31536000, immutable"
    );
    expect(file).toContain("/sw.js\n  Cache-Control: no-cache");
  });
});
