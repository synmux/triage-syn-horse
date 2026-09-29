# AGENTS.md

Context for AI agents working on **linear-triage**, an iPhone-first web app for triaging Linear issues. `CLAUDE.md` is a symlink to this file; edit this one.

## What it is

- Nuxt 4 single-page app (`ssr: false`), generated to static files and served by an assets-only Cloudflare Worker.
- No backend. The browser calls `https://api.linear.app/graphql` directly with a Linear personal API key stored in `localStorage` (Linear allows CORS).
- Design spec: `docs/superpowers/specs/2026-09-29-linear-triage-design.md`. Implementation plan: `docs/superpowers/plans/2026-09-29-linear-triage.md`.

## Hard rules

- **Never perform write operations against the live Linear workspace** while developing. Live tests use `createReadOnlyClient`; E2E tests intercept every mutation.
- Node 24 LTS + pnpm 12. Never `bun install` (it breaks Nuxt/Workers builds).
- TypeScript is pinned to `~6.0.3`: TypeScript 7 ships no JS API, which `vue-tsc` needs.
- Nuxt function auto-imports are **off** (`imports.autoImport: false`). Import `ref`, `computed`, `useRoute`, `defineStore` and friends explicitly. Components are still auto-registered.
- Keep logic in `app/lib/**` pure and unit-tested; stores are glue; components are presentational.
- `v-html` is allowed only in `MarkdownView.vue`, and only with `renderMarkdown()` output.
- UK English everywhere. Descriptive names; no single-letter identifiers, including loop variables.
- File names are kebab-case (Ultracite rule). Nuxt registers `components/empty-state.vue` as `<EmptyState>`.
- Fail explicitly: typed errors from `app/lib/linear/errors.ts`, surfaced as toasts. No silent catches.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Nuxt dev server |
| `pnpm verify` | lint + typecheck + unit tests (run before every commit) |
| `pnpm lint` / `pnpm format` | Ultracite (Biome) check / fix |
| `pnpm typecheck` | `nuxt typecheck` (vue-tsc) |
| `pnpm test` | vitest unit tests (`tests/unit`) |
| `pnpm test:live` | read-only contract tests against the real Linear API (needs `LINEAR_API_KEY`) |
| `pnpm test:e2e` | Playwright iPhone E2E. **Currently disabled**: see E2E safety below |
| `pnpm codegen` | regenerate typed GraphQL documents from `graphql/linear.schema.graphql` |
| `pnpm schema:update` | refresh the vendored Linear SDL |
| `pnpm generate` | static build to `.output/public` (+ `_headers`) |
| `pnpm preview` | serve the build with `wrangler dev` on port 8788 |
| `pnpm deploy` | verify, generate and `wrangler deploy` |

## E2E safety

On 2026-09-29 the E2E suite wrote to the live Linear workspace. In the production build the service worker (`registerType: autoUpdate`, `clientsClaim`) took control of the page, and requests that pass through a service worker are invisible to Playwright's `context.route`, so mutations the fixture meant to intercept reached Linear. The changes were reverted by hand. The suite is now skipped unconditionally. Before re-enabling it, add **both**:

1. `serviceWorkers: "block"` in `playwright.config.ts` (the root cause), and
2. an E2E-only build in which the Linear client sends every mutation to an unresolvable host (for example `https://linear-mutations.invalid/graphql`, via a build-time constant and a `mutationEndpoint` client option), so a missed interception cannot write anything; the deploy must refuse a build containing that host.

Until then, verify mutations with the unit tests (fake client and stubbed fetch), never against the live API.

## Layout

```plaintext
app/lib/linear/     client, typed errors, pagination, operations (+ generated/)
app/lib/triage/     pure triage logic: states, estimates, snooze, queue, labels, team moves, actions, executor
app/lib/format/     time and markdown helpers
app/stores/         Pinia stores (session, workspace, queue, detail, history, preferences, toasts)
app/components/     presentational components
app/pages/          connect, queue (index), issue/[id], recent, settings
graphql/            vendored Linear SDL
scripts/            schema refresh, _headers generation
tests/unit|live|e2e vitest unit, live read-only, Playwright
```

## Commits

Conventional Commits with a gitmoji title (for example `✨ feat(triage): …`), multi-line body with full detail, no `Co-Authored-By` trailer. Commit after each feature, fix or refactor.
