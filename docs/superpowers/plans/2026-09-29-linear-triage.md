# Linear Triage for iPhone — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an installable iPhone web app that lets syn triage Linear issues (accept, decline, duplicate, snooze, edit properties, comment) with undo, deployed as a static Cloudflare Worker.

**Architecture:** Nuxt 4 SPA (`ssr: false`) generated to static files and served by an assets-only Worker. The browser talks straight to `https://api.linear.app/graphql` with a personal API key held in `localStorage`. Pure triage logic (planners, executor, queue maths) lives in `app/lib/**` and is unit-tested; Pinia stores are thin glue; components are presentational.

**Tech Stack:** Nuxt 4.5, Vue 3.5, Pinia, TypeScript 6.0 (strict), graphql-codegen client-preset (string documents), markdown-it + DOMPurify, @vite-pwa/nuxt, vitest 5 + happy-dom, Playwright, Ultracite (Biome), wrangler 4, Node 24 LTS, pnpm 12.

**Spec:** `docs/superpowers/specs/2026-09-29-linear-triage-design.md`

## Global Constraints

- Node `^24.11.0`, pnpm `12.x` via `packageManager`; never `bun install`.
- TypeScript pinned `~6.0.3` (TypeScript 7.0 ships no JS API, which `vue-tsc` needs).
- UK English in all copy, comments and docs.
- Descriptive identifiers everywhere, including loop variables (no single-letter names).
- **No write operations against the live Linear workspace** during development: live tests are read-only and guarded; E2E intercepts every mutation.
- No mocks outside tests; errors surface explicitly (typed errors + toasts), never silently.
- Markdown rendering: `html: false` + DOMPurify; `v-html` only in `MarkdownView.vue`.
- CSP without `unsafe-inline`/`unsafe-eval`; `connect-src 'self' https://api.linear.app`.
- Commits: Conventional Commits with gitmoji titles, multi-line bodies, no `Co-Authored-By`.
- Gate before every commit: `pnpm lint && pnpm typecheck && pnpm test`.

## Review Focus

1. **Key pasted with surrounding whitespace, a trailing newline or a `Bearer ` prefix** → the app normalises it and connects. Pinned in Task 9 (`normaliseApiKey` tests).
2. **Undo after the issue was changed elsewhere** (for example accepted in Linear desktop, then undone on the phone) → undo refuses with an explicit message instead of clobbering. Pinned in Task 7 (`verifyUndoPreconditions`) and Task 10 (history store).
3. **App resumed after more than an hour in the background** → signed image URLs have expired, so the detail refetches instead of showing broken images. Pinned in Task 10 (detail staleness test).
4. **Issue in a team whose default state is missing or not backlog/unstarted** → accept falls back to the first backlog, then unstarted state; if neither exists it throws a clear error. Pinned in Task 5 (`acceptState` tests).
5. **Very wide markdown content** (tables, long code lines, long URLs, big images) → no horizontal page scroll; tables and code scroll inside their own box. Pinned in Task 8 (markdown wraps tables in `.md-scroll`) and Task 14 (E2E asserts `scrollWidth <= clientWidth`).

---

## File map

```plaintext
package.json, pnpm-workspace.yaml, nuxt.config.ts, tsconfig.json, biome.jsonc, vitest.config.ts,
vitest.live.config.ts, playwright.config.ts, codegen.ts, pwa-assets.config.ts, wrangler.jsonc,
AGENTS.md, CLAUDE.md -> AGENTS.md, README.md, .gitignore, .node-version
graphql/linear.schema.graphql                  vendored SDL (scripts/update-schema.ts refreshes it)
app/lib/linear/operations.ts                   all GraphQL documents (graphql() from generated/)
app/lib/linear/generated/*                     codegen output (committed)
app/lib/linear/errors.ts                       typed error classes
app/lib/linear/client.ts                       createLinearClient()
app/lib/linear/pagination.ts                   collectPages()
app/lib/linear/mutation-guard.ts               isMutationDocument() / assertReadOnly()
app/lib/linear/types.ts                        domain types derived from generated result types
app/lib/storage.ts                             createStorage() versioned JSON wrapper
app/lib/serial-queue.ts                        createSerialQueue() per-key promise chains
app/lib/triage/priorities.ts, estimates.ts, states.ts, snooze.ts, queue.ts,
               labels.ts, team-move.ts, actions.ts, executor.ts
app/lib/format/time.ts, markdown.ts
app/stores/session.ts, preferences.ts, toasts.ts, workspace.ts, queue.ts, detail.ts, history.ts
app/composables/useSwipe.ts, usePullToRefresh.ts, useKeyboardShortcuts.ts, useOnline.ts,
                useVisibilityRefresh.ts
app/components/*.vue                           presentational components (see Tasks 12–16)
app/pages/index.vue, connect.vue, issue/[id].vue, recent.vue, settings.vue
app/middleware/auth.global.ts                  route guard (no key → /connect)
app/assets/css/tokens.css, base.css
app/app.vue, app/error.vue, app/spa-loading-template.html
public/icon.svg (+ generated PNGs)
scripts/update-schema.ts, scripts/generate-headers.ts
tests/unit/**, tests/live/**, tests/e2e/**
```

---

### Task 1: Scaffold the project and toolchain

**Files:** Create `package.json`, `nuxt.config.ts`, `tsconfig.json`, `app/app.vue`, `biome.jsonc` (via Ultracite), `vitest.config.ts`, `.gitignore`, `.node-version`, `AGENTS.md`, `CLAUDE.md` (symlink), `README.md`, `tests/unit/smoke.test.ts`.

**Interfaces:** Produces scripts `dev`, `generate`, `preview`, `lint`, `format`, `typecheck`, `test`, `test:live`, `test:e2e`, `codegen`, `deploy`.

- [ ] **Step 1:** Scaffold with `pnpm dlx nuxi@latest init . --template minimal --packageManager pnpm --gitInit false --no-install --force`, then `pnpm install`.
- [ ] **Step 2:** Pin `typescript@~6.0.3`, add `vue-tsc`, `pinia`, `@pinia/nuxt`, `vitest`, `@nuxt/test-utils`, `@vue/test-utils`, `happy-dom`, `@types/node@^24`.
- [ ] **Step 3:** `nuxt.config.ts`: `ssr: false`, `compatibilityDate: '2026-09-29'`, `modules: ['@pinia/nuxt']`, `typescript: { strict: true, typeCheck: false }`, `app.head` with iOS meta (viewport-fit=cover, status bar, format-detection), `css: ['~/assets/css/tokens.css', '~/assets/css/base.css']`, prerender hook clearing routes (only `index.html`, `200.html`, `404.html`).
- [ ] **Step 4:** Run `pnpm dlx ultracite init` non-interactively for Biome + Vue, then set scripts `lint: "ultracite check"`, `format: "ultracite fix"`, `typecheck: "nuxt typecheck"`.
- [ ] **Step 5:** `vitest.config.ts` using `defineVitestConfig` from `@nuxt/test-utils/config` with `environment: 'happy-dom'` for `tests/unit/**`. Write `tests/unit/smoke.test.ts` asserting `1 + 1 === 2`, run `pnpm test`, confirm PASS.
- [ ] **Step 6:** Write `AGENTS.md` (stack, commands, conventions, no-live-writes rule), symlink `CLAUDE.md → AGENTS.md`, write `README.md` (what, setup, commands, deploy).
- [ ] **Step 7:** Gate: `pnpm lint && pnpm typecheck && pnpm test && pnpm generate`. Commit `🎉 chore: scaffold Nuxt 4 SPA with pnpm, Ultracite and vitest`.

### Task 2: Vendored schema, operations and codegen

**Files:** Create `graphql/linear.schema.graphql`, `scripts/update-schema.ts`, `codegen.ts`, `app/lib/linear/operations.ts`, `app/lib/linear/generated/*`, `tests/unit/linear/operations.test.ts`.

**Interfaces:** Produces typed documents `ViewerDocument`, `TeamsDocument`, `WorkflowStatesDocument`, `IssueLabelsDocument`, `ProjectsDocument`, `UsersDocument`, `TriageQueueDocument`, `IssueDetailDocument`, `IssueStateDocument`, `SearchIssuesDocument`, `UpdateIssueDocument`, `CreateCommentDocument`, `DeleteCommentDocument`, `CreateIssueRelationDocument`, `DeleteIssueRelationDocument`; fragment `TriageIssueFields`.

- [ ] **Step 1:** `scripts/update-schema.ts` downloads `https://raw.githubusercontent.com/linear/linear/master/packages/sdk/src/schema.graphql` to `graphql/linear.schema.graphql`; run it.
- [ ] **Step 2:** Write the failing contract test: parse the schema with `buildSchema`, iterate every exported `*Document` in `generated/graphql.ts`, `parse(document.toString())`, and assert `validate(schema, ast)` returns `[]`. Also assert the set of mutation operation names equals exactly `['UpdateIssue','CreateComment','DeleteComment','CreateIssueRelation','DeleteIssueRelation']`.
- [ ] **Step 3:** Write `operations.ts` with `graphql(...)` calls; `codegen.ts` uses `client-preset` with `documentMode: 'string'`, `enumsAsTypes: true`, `useTypeImports: true`, `fragmentMasking: false`, scalars `DateTime: string`, `TimelessDate: string`, `JSON: unknown`, `JSONObject: Record<string, unknown>`.
- [ ] **Step 4:** `pnpm codegen`, run the test, confirm PASS. Commit `✨ feat(linear): add typed GraphQL operations validated against Linear's schema`.

### Task 3: Linear client, errors, pagination, mutation guard

**Files:** Create `app/lib/linear/{errors,client,pagination,mutation-guard}.ts`; tests in `tests/unit/linear/`.

**Interfaces:**

```ts
export interface LinearClient {
  request<TResult, TVariables>(document: TypedDocumentString<TResult, TVariables>, variables: TVariables,
    options?: { signedFileUrls?: boolean; signal?: AbortSignal }): Promise<TResult>
  readonly rateLimit: Readonly<Ref<RateLimitSnapshot | null>> // plain object in lib; store mirrors it
}
export function createLinearClient(options: { apiKey: string; fetch?: typeof fetch; endpoint?: string;
  onRateLimit?: (snapshot: RateLimitSnapshot) => void }): LinearClient
export interface RateLimitSnapshot { requestsRemaining: number; requestsLimit: number; resetAt: Date }
export class LinearError extends Error {}  // base
export class LinearNetworkError, LinearAuthError, LinearRateLimitError (resetAt: Date | null),
  LinearGraphQLError (code: string | null, userMessage: string | null), LinearHttpError (status)
export async function collectPages<TNode>(fetchPage: (after: string | null) => Promise<Connection<TNode>>,
  options?: { maxPages?: number }): Promise<TNode[]>
export function isMutationDocument(source: string): boolean
export function createReadOnlyClient(client: LinearClient): LinearClient // throws on mutations
```

Tests (each a separate `it`):
- sends `Authorization: <key>` exactly (no `Bearer`), JSON body `{ query, variables }`, and `public-file-urls-expire-in: 3600` only when `signedFileUrls: true`;
- returns `data` on success; 401 → `LinearAuthError`; 429 → `LinearRateLimitError` with `resetAt` from `x-ratelimit-requests-reset`; GraphQL `errors[0].extensions.code === 'AUTHENTICATION_ERROR'` → `LinearAuthError`; `RATELIMITED` → `LinearRateLimitError`; other codes → `LinearGraphQLError` with `userPresentableMessage`; partial `data` + `errors` → throws; `fetch` rejection → `LinearNetworkError`; error messages never contain the key;
- `onRateLimit` receives parsed headers;
- `collectPages` concatenates three pages, passes cursors, throws `Error('Pagination exceeded 20 pages')` past `maxPages`;
- `isMutationDocument` true for `mutation X {…}` (with leading comments/whitespace and fragments first), false for queries; `createReadOnlyClient` rejects mutations without calling `fetch`.

Commit `✨ feat(linear): add typed API client with explicit error mapping`.

### Task 4: Storage wrapper and serial queue

**Files:** `app/lib/storage.ts`, `app/lib/serial-queue.ts`, tests.

```ts
export function createStorage<TValue>(key: string, options: { version: number; backend?: Storage;
  validate: (value: unknown) => value is TValue }): { read(): TValue | null; write(value: TValue): void; clear(): void }
export function clearAppStorage(backend?: Storage): void // removes every key with prefix 'linear-triage:'
export function createSerialQueue(): { run<T>(key: string, task: () => Promise<T>): Promise<T>; pending(key: string): boolean }
```

Tests: round-trip; wrong version → `null` and entry removed; invalid JSON → `null`; validator rejection → `null`; backend throwing (private mode) → `read` returns `null`, `write` throws `StorageUnavailableError`; `clearAppStorage` removes only prefixed keys. Serial queue: tasks for the same key run strictly in order even when the first rejects; different keys run concurrently; `pending` reflects in-flight work.

Commit `✨ feat(core): add versioned storage and per-key serial queue`.

### Task 5: Priorities, estimates, states, snooze, queue maths

**Files:** `app/lib/triage/{priorities,estimates,states,snooze,queue}.ts`, `app/lib/linear/types.ts`, tests.

Key test cases:
- `estimateOptions({ issueEstimationType: 'tShirt', issueEstimationExtended: false, issueEstimationAllowZero: false })` → `[1 XS, 2 S, 3 M, 5 L, 8 XL]`; extended adds `13 XXL, 21 XXXL`; allowZero prepends `0`; exponential `1,2,4,8,16(+32,64)`; fibonacci `1,2,3,5,8(+13,21)`; linear `1..5(+6,7)`; `notUsed` → `[]`; `estimateLabel(team, 5)` → `'L'`; unknown value → its number as a string.
- `acceptState(team, states)` → team default when it is backlog/unstarted/started; else first backlog by position; else first unstarted; else throws `Error('Team AFF has no backlog or unstarted state to accept into')`.
- `declineState` → lowest-position `canceled`; throws if none. `triageState` → `team.triageIssueState` or throws. `acceptTargets` → backlog, unstarted, started states in type-then-position order.
- `snoozePresets(new Date('2026-09-29T04:18:00+01:00'))` → In 3 hours `07:18`, Tomorrow `2026-09-30T09:00`, Next Monday `2026-10-05T09:00`, In a month `2026-10-29T09:00`; on a Sunday "Next Monday" is the following day; `31 Jan` + 1 month clamps to `28/29 Feb`; `parseCustomSnooze` rejects past and invalid values.
- `visibleQueue` hides issues whose `snoozedUntilAt` is in the future unless `includeSnoozed`; expired snoozes are visible; team filter; newest/oldest ordering by `createdAt` with identifier as tiebreak; `neighbours(queue, id)` returns previous/next ids and `null` at the ends; `countsByTeam` excludes snoozed.

Commit `✨ feat(triage): add estimate scales, state resolution, snooze presets and queue ordering`.

### Task 6: Labels and team moves

**Files:** `app/lib/triage/{labels,team-move}.ts`, tests.

```ts
export function assignableLabels(teamId: string, labels: Label[]): LabelSection[] // { group: Label | null; labels: Label[] }
export function toggleLabel(selectedIds: string[], labelId: string, labels: Label[]): string[]
export function labelDelta(before: string[], after: string[]): { addedLabelIds: string[]; removedLabelIds: string[] }
export function planTeamMove(issue: TriageIssue, target: Team, workspace: WorkspaceSnapshot):
  { input: IssueUpdateInput; warnings: string[] }
```

Tests: groups become headers and are never assignable; selecting `Sunsama` while `Enrich` (same group) is selected replaces it; toggling off removes; delta ignores order; team move maps `bug@MYR → bug@SHS`, `Enrich@MYR (group Administrative) → Enrich@SHS`, drops `DevOps@SHS` when moving SHS → MYR with warning `Label "DevOps" does not exist in MYR and was removed`; keeps workspace labels; sets target triage state; clears project not shared with target (warning); uses `labelIds` (full set) because team moves replace team-scoped labels.

Commit `✨ feat(triage): add label group rules and team move planning`.

### Task 7: Action planners and executor with data-only undo

**Files:** `app/lib/triage/{actions,executor}.ts`, tests.

```ts
export type Step =
  | { kind: 'updateIssue'; issueId: string; input: IssueUpdateInput }
  | { kind: 'createComment'; issueId: string; body: string }
  | { kind: 'deleteComment'; commentId: string }
  | { kind: 'createRelation'; issueId: string; relatedIssueId: string; type: 'duplicate' }
  | { kind: 'deleteRelation'; relationId: string }
export interface Expectation { issueId: string; stateId?: string; snoozedUntilAt?: string | null }
export interface ActionPlan { kind: 'accept' | 'decline' | 'duplicate' | 'snooze' | 'unsnooze';
  issueId: string; identifier: string; summary: string; steps: Step[]; removesFromQueue: boolean }
export interface UndoPlan { steps: Step[]; expectation: Expectation }
export interface ExecutionResult { undo: UndoPlan; warnings: string[] }
export function planAccept(issue, team, states, options?: { stateId?: string; comment?: string }): ActionPlan
export function planDecline(issue, team, states, options?: { comment?: string }): ActionPlan
export function planDuplicate(issue, canonical: { id: string; identifier: string }): ActionPlan
export function planSnooze(issue, until: Date, viewerId: string): ActionPlan
export function planUnsnooze(issue): ActionPlan
export async function executePlan(client: LinearClient, plan: ActionPlan, before: TriageIssue): Promise<ExecutionResult>
export async function verifyUndoPreconditions(client: LinearClient, undo: UndoPlan): Promise<void> // throws UndoConflictError
export async function executeUndo(client: LinearClient, undo: UndoPlan): Promise<void>
```

Rules and tests (fake client recording calls and returning canned payloads):
- Accept → one `updateIssue { stateId: accept }`; with comment → comment first, then update; undo = `updateIssue { stateId: triage }` then `deleteComment`; expectation `{ stateId: accept }`.
- Priority required + priority 0 → `planAccept` throws `Error('MYR requires a priority before leaving triage')`.
- Decline → `stateId: declineState`; comment optional.
- Duplicate → `createRelation(type: duplicate)`; executor warns when returned state type ≠ `duplicate`; undo = `deleteRelation` then `updateIssue { stateId: previous }`; refuses `issue.id === canonical.id`.
- Snooze → `updateIssue { snoozedUntilAt: iso, snoozedById: viewerId }`; undo restores previous `snoozedUntilAt`/`snoozedById`; `removesFromQueue: true`.
- Failure at step 2 → inverse of step 1 executed, error rethrown as `ActionFailedError` with `cause`; if the rollback also fails, error message says so.
- `verifyUndoPreconditions` queries `IssueState`; throws `UndoConflictError('SHS-174 changed since this action (now In Progress); not undone')` when state/snooze differ from the expectation.

Commit `✨ feat(triage): add action planners and executor with serialisable undo plans`.

### Task 8: Formatting (time, markdown)

**Files:** `app/lib/format/{time,markdown}.ts`, tests.

- `relativeTime(date, now)` → `'now'`, `'5m'`, `'3h'`, `'2d'`, `'3w'`, `'4mo'`, `'2y'`; `absoluteDateTime(date)` → `en-GB` (e.g. `29 Sept 2026, 04:18`).
- `renderMarkdown(source)`: headings, lists, task lists, code (escaped), links → `target="_blank" rel="noopener noreferrer"`, images → `loading="lazy" referrerpolicy="no-referrer"`, tables wrapped in `<div class="md-scroll">`, bare URLs linkified; XSS payloads (`<script>`, `<img onerror>`, `javascript:` links, `<iframe>`, `<svg onload>`, data: URL in href) produce no executable output; empty/null → `''`.

Commit `✨ feat(format): add relative time and sanitised markdown rendering`.

### Task 9: Session, preferences, toasts and workspace stores

**Files:** `app/stores/{session,preferences,toasts,workspace}.ts`, `app/lib/api-key.ts`, tests with `setActivePinia(createPinia())` and `vi.stubGlobal('fetch', …)`.

- `normaliseApiKey('  Bearer lin_api_abc\n')` → `'lin_api_abc'`; empty → throws `Error('Paste your Linear API key')`; contains spaces inside → throws.
- `session.connect(key)` verifies via `Viewer` before storing; failure stores nothing; `session.disconnect()` clears storage and resets all stores; `session.client` throws when disconnected; auth errors from any request set `session.status = 'invalid'`.
- `workspace.load()` pages through teams/states/labels/projects/users in parallel, caches a snapshot, exposes `teamById`, `statesForTeam`, `labelsForTeam`, `projectsForTeam`, `humans` (active, not apps); boot hydrates from cache and marks `stale`.
- `preferences` persists `{ order: 'newest' | 'oldest', autoAdvance: boolean, swipeEnabled: boolean, leftSwipe: 'decline' | 'snooze' }` with defaults `newest, true, true, 'decline'`.
- `toasts.push({ message, tone, action?, timeoutMs })` auto-dismisses; `dismiss(id)`.

Commit `✨ feat(stores): add session, workspace, preferences and toast stores`.

### Task 10: Queue, detail and history stores

**Files:** `app/stores/{queue,detail,history}.ts`, tests.

- `queue.refresh()` pages `TriageQueue`, replaces items, caches them; throttles to one in-flight request; `visible` applies preferences/filter.
- `queue.perform(plan)`: removes the issue optimistically (or patches for unsnooze); runs `executePlan` through the serial queue; on success records history and pushes an undo toast (8 s); on failure restores the item at its original index and pushes an error toast; never loses the issue.
- `queue.edit(issueId, input, optimisticPatch)`: optimistic patch, `UpdateIssue`, reconciles with the returned issue; rollback + toast on failure; same-issue edits serialised.
- `detail.load(id)` fetches with signed URLs; `isStale` after 50 minutes; `prefetch(id)` ignores errors but records them for display on open.
- `history.record(entry)` keeps 50 newest, persisted; `history.undo(entryId)` → `verifyUndoPreconditions` → `executeUndo` → marks `undone` and triggers `queue.refresh()`; conflicts mark `conflict` with the message; failures mark `failed`.

Commit `✨ feat(stores): add queue, detail and history stores with optimistic updates`.

### Task 11: Live read-only contract tests

**Files:** `vitest.live.config.ts`, `tests/live/queries.live.test.ts`.

- Skips (with a visible reason) when `LINEAR_API_KEY` is unset; wraps the real client with `createReadOnlyClient`.
- Runs `Viewer`, all workspace queries, `TriageQueue`, `IssueDetail` (first triage issue, asserts any `uploads.linear.app` URL carries `signature=`), `IssueState`, `SearchIssues('triage')`.
- `pnpm test:live` = `LINEAR_API_KEY=${LINEAR_API_KEY:-$__LINEAR_API_KEY} vitest run -c vitest.live.config.ts`.

Commit `✅ test(live): add read-only contract tests against the Linear API`.

### Task 12: Design system, app shell and PWA

**Files:** `app/assets/css/{tokens,base}.css`, `app/app.vue`, `app/error.vue`, `app/spa-loading-template.html`, `app/components/{NavBar,BottomSheet,OptionSheet,ToastHost,Icon,Avatar,TeamBadge,PriorityIcon,EstimateBadge,LabelChip,EmptyState}.vue`, `app/middleware/auth.global.ts`, `public/icon.svg`, `pwa-assets.config.ts`, nuxt config PWA block.

- Tokens: light/dark via `prefers-color-scheme`, spacing scale, radii, semantic action colours, safe-area paddings, `font: -apple-system-body` root.
- `BottomSheet`: focus trap, Esc/backdrop close, drag-down-to-dismiss, `role="dialog"`, `aria-modal`.
- `OptionSheet`: searchable single/multi select used by every property picker.
- PWA: manifest (name "Linear Triage", short name "Triage"), `registerType: 'autoUpdate'`, `navigateFallback: '/'`, icons generated from `public/icon.svg`.
- Middleware: no key → `/connect`; with key on `/connect` → `/`.

Verification: `pnpm generate` produces `manifest.webmanifest`, `sw.js`, icons; visual check at 390×844 in both schemes. Commit `💄 feat(ui): add design tokens, app shell, sheets and PWA manifest`.

### Task 13: Connect and Settings screens

**Files:** `app/pages/connect.vue`, `app/pages/settings.vue`.

Connect: explainer, link to `https://linear.app/settings/account/security`, key input (`autocomplete="off"`, `autocapitalize="off"`, `spellcheck="false"`, 16 px), Paste button (`navigator.clipboard.readText`, hidden when unsupported), Connect button with loading state, error text from `LinearAuthError`, standalone-storage note. Settings: account card, preferences toggles, rate-limit snapshot, Disconnect (confirm). Commit `✨ feat(ui): add connect and settings screens`.

### Task 14: Queue screen

**Files:** `app/pages/index.vue`, `app/components/{IssueRow,SwipeRow,TeamFilter,PullToRefresh}.vue`, `app/composables/{useSwipe,usePullToRefresh,useVisibilityRefresh,useOnline}.ts`, tests for `useSwipe` maths (`resolveSwipe`).

- `resolveSwipe({ dx, dy, width, startX, viewportWidth })` → `'none' | 'left' | 'right'` with intent lock (|dx| > 1.5|dy|, > 10 px), commit at 40 % width, edge guard 24 px. Unit-tested.
- Rows link to `/issue/:id`; swipe commits call `queue.perform(planAccept|planDecline|planSnooze)`.
- Header: title + count, Recent and Settings buttons, team filter chips (All + teams with counts), snoozed toggle, offline banner, stale indicator; empty state.
- E2E later asserts no horizontal overflow.

Commit `✨ feat(ui): add triage queue with swipe actions and pull to refresh`.

### Task 15: Issue screen

**Files:** `app/pages/issue/[id].vue`, `app/components/{IssueHeader,PropertyBar,MarkdownView,CommentList,AttachmentList,RelationList,ActionBar,AcceptSheet,DeclineSheet,SnoozeSheet,DuplicateSheet,CommentSheet,TitleSheet}.vue`, `app/composables/useKeyboardShortcuts.ts`.

- Renders summary instantly from the queue store, detail from `detail.load` (skeleton while loading).
- Property pickers → `queue.edit` (priority, estimate, labels via `labelDelta`, project, assignee, team via `planTeamMove` with warnings toast), title via `TitleSheet`.
- Action bar: Accept (1 tap, default state) + chevron → `AcceptSheet` (state choice + optional comment); Decline → `DeclineSheet` (optional reason, confirm); Snooze → `SnoozeSheet` (presets + custom `datetime-local`); Duplicate → `DuplicateSheet` (debounced 300 ms `SearchIssues`, min 2 chars, excludes self, confirm).
- After an action: auto-advance to next visible issue (preference) else back to queue; prefetch next issue detail.
- Keyboard: `1`, `2`, `3`, `h`, `j`, `k`, `Escape` (ignored while typing in inputs).

Commit `✨ feat(ui): add issue triage screen with actions, pickers and comments`.

### Task 16: Recent screen

**Files:** `app/pages/recent.vue`. List entries (summary, relative time, status), Undo button (disabled when `undone`/`conflict`), link to issue. Commit `✨ feat(ui): add recent actions screen with undo`.

### Task 17: Security headers, Worker config, deploy script

**Files:** `scripts/generate-headers.ts`, `tests/unit/scripts/generate-headers.test.ts`, `wrangler.jsonc`, `public/.assetsignore` (if needed), package scripts.

- `buildHeadersFile(htmlDocuments: string[])` extracts inline `<script>` bodies, hashes them (SHA-256, base64), and emits `_headers` with CSP (spec §9), `Referrer-Policy`, `X-Content-Type-Options`, `Permissions-Policy`, `X-Robots-Tag`, and `Cache-Control: public, max-age=31536000, immutable` for `/_nuxt/*`. Test: two inline scripts → two hashes; no `unsafe-inline`; external scripts ignored.
- `postgenerate` runs the script over `.output/public/*.html`.
- `wrangler.jsonc`: `name: linear-triage`, `compatibility_date: 2026-09-29`, `assets: { directory: ./.output/public, not_found_handling: single-page-application }`, `workers_dev: true`, `preview_urls: false`.

Commit `🔒️ feat(deploy): add CSP headers generation and Workers static assets config`.

### Task 18: E2E with mutation interception

**Files:** `playwright.config.ts`, `tests/e2e/{fixtures.ts,triage.e2e.ts}`.

- Serves `.output/public` with `wrangler dev` (`pnpm preview:worker`), iPhone 15 device profile, Chromium (WebKit when installed).
- Fixture seeds `localStorage` with the key and installs a route handler on `https://api.linear.app/graphql`: queries pass through to the real API; mutations are fulfilled locally with schema-shaped success payloads and recorded; any unexpected mutation fails the test.
- Scenarios: queue renders real issues without horizontal overflow; open issue shows description; Accept sends `UpdateIssue` with the Backlog state id and removes the issue; Undo sends `UpdateIssue` back to the triage state after an `IssueState` precondition query (intercepted with the expected state); Decline with reason sends `CreateComment` then `UpdateIssue` with the Canceled state; Snooze "Tomorrow" sends `snoozedUntilAt` at 09:00 local; Duplicate search + select sends `CreateIssueRelation` type `duplicate`; priority picker sends `priority: 2`; labels picker sends `addedLabelIds`.

Commit `✅ test(e2e): cover triage flows with intercepted mutations`.

### Task 19: Visual QA, docs, deploy, memory

- Screenshots (light/dark, queue/issue/sheets) at 390×844; fix issues found.
- Update `README.md` and `AGENTS.md` with final commands, architecture, and the "first real use" checklist.
- `pnpm run deploy` with Cloudflare credentials from the environment; verify the live URL serves the app, the `_headers`, and SPA fallback (`/issue/abc` → 200 HTML).
- Record decisions and API facts in Basic Memory.

Commit(s) per change: `📝 docs: …`, `🚀 ci(deploy): …` as appropriate.
