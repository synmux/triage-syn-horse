# Linear Triage for iPhone — Design Spec

- **Date:** 2026-09-29
- **Status:** Self-approved (owner away; instructed "operate independently, do not ask questions")
- **Owner:** syn

## 1. Understanding

### What syn asked for

- A mobile site for performing Linear triage on an iPhone.
- Free choice of framework; plan before implementing; no questions.
- Use the Linear API key in `$__LINEAR_API_KEY`; **perform no write operations** against Linear.

### What the environment and preferences tell us

- Preferred stack: Nuxt, Cloudflare Workers via `wrangler`, Node 24 LTS + pnpm (never `bun install` for Nuxt/Workers), vitest, Ultracite/Biome, UK English, Conventional Commits + gitmoji, `AGENTS.md` canonical.
- Linear workspace **synmux**: 7 teams (AFF, AMB, EXT, MYR, INF, SHS, GEN), all triage-enabled, all single-member (syn), identical workflows (`Triage → Backlog → Scheduled → In Progress → In Review → Done / Canceled / Duplicate`), default state **Backlog**, T-shirt estimates (1/2/3/5/8), cycles disabled, no team requires priority to leave triage.
- Labels are **team-scoped with identical names in every team** (`bug`, `enhancement`, `Deployment`, `Investigation`, `simple task`, group `Administrative` → `Enrich`/`Sunsama`; SHS adds `DevOps`, `Backend`, `Frontend`, `TODO`).
- 39 issues sit in Triage, all authored by syn, no priority, no labels, many synced to GitHub issues. Triage is being used as a **personal idea inbox**.

### Verified API facts (probed read-only on 2026-09-29)

| Fact | Evidence |
| --- | --- |
| `api.linear.app/graphql` allows CORS from any origin, including `authorization`, `content-type`, `public-file-urls-expire-in` headers | OPTIONS preflight → 204 with matching `access-control-*` headers |
| Personal key auth uses the raw key in `Authorization` (no `Bearer`) | `viewer` query succeeded |
| Rate limits: 2,500 requests/hour, 3,000,000 complexity points | `x-ratelimit-*` response headers |
| `uploads.linear.app` files need auth; header `public-file-urls-expire-in: <seconds>` makes the API return `?signature=` URLs fetchable without auth | plain URL → 401, signed URL → 200 |
| Marking as duplicate = `issueRelationCreate(type: duplicate)`; Linear then moves the issue into the reserved, system-managed **Duplicate** state | Linear docs "Issue relations", "Issue status"; `Team.markedAsDuplicateWorkflowState` deprecated "Duplicates are now system-managed" |
| Snooze = `issueUpdate(input: { snoozedUntilAt })`; snoozed issues stay in the triage state | Schema docstring: "The time until which the issue will be snoozed in Triage view" |
| Decline = move to a `canceled`-type state; accept = move to the team default state | Linear docs "Triage" |
| T-shirt sizes map to Fibonacci values XS=1, S=2, M=3, L=5, XL=8 (extended XXL=13, XXXL=21) | Linear docs "Estimates"; workspace values in use are exactly {1,2,3,5,8} |
| `searchIssues` is rate-limited to 30 requests/minute | Schema docstring |

### Assumptions (to be corrected by syn if wrong)

- **A1** Single user. Each device holds its own key; there is no shared backend.
- **A2** Hosted on `*.workers.dev`; a custom domain (for example `triage.syn.as`) is a later one-line change.
- **A3** Personal API key rather than OAuth, because registering an OAuth application requires the Linear UI.
- **A4** "Triage" means every issue whose workflow state type is `triage`, across all teams the key can see.
- **A5** A persistent, undoable action history is a sufficient safety net for one-tap and swipe actions.
- **A6** Deploying a static, secret-free site to syn's Cloudflare account is within the brief (the site cannot reach the phone otherwise). "No write operations" is read as applying to Linear.

### Success criteria

1. On the iPhone: open URL → Add to Home Screen → paste key once → triage queue across all teams appears; warm launches render the cached queue instantly and refresh in the background.
2. From an issue: Accept in **1 tap**; Decline, Snooze and Duplicate in **2 taps** (plus search for Duplicate). From the list: **1 swipe** to accept or decline.
3. Every triage action is undoable from a toast and later from a persistent **Recent** history.
4. Priority, estimate, labels, project, team, assignee and title editable; comments can be added.
5. Descriptions and comments render as sanitised markdown, including Linear-hosted images.
6. Every GraphQL document is validated against Linear's schema in tests; read queries are exercised against the live API; mutations are exercised end-to-end through the UI with network interception (never reaching Linear).
7. Behaves like a native iOS app in standalone mode: safe areas, dark mode, Dynamic Type, 44 pt targets, no zoom-on-focus.

## 2. Approaches considered

| | A. Static SPA, key on device (**chosen**) | B. Worker proxy holding key + passkey auth | C. Linear OAuth (PKCE) SPA |
| --- | --- | --- | --- |
| Server secrets | None | Linear key in Worker secret | None |
| Blast radius of a server bug | None (static files) | Anyone who defeats auth controls the workspace | None |
| Setup for syn | Paste key once in the installed app | Register passkey; bootstrap token | Register OAuth app in Linear UI first |
| Can be deployed safely while syn is away | Yes | Risky (auth must be perfect first time) | No (needs app registration) |
| Main risk | XSS → key theft | Auth bypass; key theft from Worker | — |

**Decision: A.** Linear allows CORS, so no proxy is needed; the deployed artefact contains nothing sensitive; the residual risk (XSS stealing the key from `localStorage`) is mitigated by a strict hash-based CSP, no raw HTML in rendered markdown, DOMPurify, and zero third-party scripts. OAuth (C) is recorded as a future upgrade.

## 3. Architecture

```plaintext
┌──────────── iPhone (standalone PWA) ────────────┐
│ Nuxt 4 SPA (Vue 3, Pinia)                        │
│  pages ─ stores ─ lib/triage (pure) ─ lib/linear │──── HTTPS POST /graphql ───▶ api.linear.app
│  localStorage: key, workspace cache, queue cache,│      Authorization: <personal key>
│                preferences, action history       │      public-file-urls-expire-in: 3600 (detail only)
│  Service worker: precached app shell             │
└──────────────────────────────────────────────────┘
          ▲ static assets (HTML/JS/CSS/icons, _headers)
┌─────────┴────────────────────────────┐
│ Cloudflare Worker (assets only)       │  not_found_handling = single-page-application
│ linear-triage.<subdomain>.workers.dev │  _headers: CSP (script hashes), no-referrer, noindex
└───────────────────────────────────────┘
```

### Stack

- Nuxt 4.5 (`ssr: false`, `nuxt generate`), Vue 3.5, Pinia, TypeScript (strict).
- `@vite-pwa/nuxt` for manifest + service worker; `@vite-pwa/assets-generator` for icons from one SVG.
- `@graphql-codegen/cli` + `client-preset` in `documentMode: 'string'` against Linear's published SDL (vendored) → typed `TypedDocumentString`s, no GraphQL runtime in the bundle.
- `markdown-it` (raw HTML disabled) + `dompurify`.
- Tooling: Node 24 LTS, pnpm, Ultracite (Biome), vitest (+ happy-dom), Playwright (iPhone emulation), `wrangler`.

### Source layout

```plaintext
app/
  app.vue, error.vue, spa-loading-template.html
  pages/            index.vue (queue), connect.vue, issue/[id].vue, recent.vue, settings.vue
  components/       IssueRow, SwipeRow, IssueHeader, PropertyBar, PriorityIcon, EstimateBadge,
                    LabelChip, TeamBadge, Avatar, MarkdownView, CommentList, ActionBar,
                    BottomSheet, OptionSheet, SnoozeSheet, CommentSheet, DuplicateSheet,
                    AcceptSheet, TitleSheet, ToastHost, EmptyState, PullToRefresh, NavBar
  composables/      useSwipe, usePullToRefresh, useKeyboardShortcuts, useOnline, useVisibilityRefresh
  stores/           session, workspace, queue, detail, history, preferences, toasts
  lib/linear/       client.ts, errors.ts, pagination.ts, operations.ts, generated/*
  lib/triage/       queue.ts, actions.ts, executor.ts, snooze.ts, estimates.ts, priorities.ts,
                    labels.ts, team-move.ts, states.ts
  lib/format/       time.ts, markdown.ts
  lib/storage.ts    typed, versioned localStorage wrapper
  assets/css/       tokens.css, base.css
graphql/            linear.schema.graphql (vendored SDL)
scripts/            generate-headers.ts, update-schema.ts, generate-icons (via assets-generator config)
tests/unit/**, tests/live/**, tests/e2e/**
wrangler.jsonc, codegen.ts, pwa-assets.config.ts, nuxt.config.ts, vitest.config.ts, playwright.config.ts
```

## 4. Data layer

### Client (`lib/linear/client.ts`)

`createLinearClient({ apiKey, fetch?, endpoint? })` → `request(document, variables, { signedFileUrls?, signal? })`.

- Sends `Authorization: <key>`, `Content-Type: application/json`, and `public-file-urls-expire-in: 3600` when `signedFileUrls` is set.
- Maps failures to typed errors (`lib/linear/errors.ts`): `LinearNetworkError`, `LinearAuthError` (HTTP 401 or `AUTHENTICATION_ERROR`), `LinearRateLimitError` (HTTP 429 / `RATELIMITED`, carries reset time), `LinearGraphQLError` (other GraphQL errors, carries `extensions.code` and `userPresentableMessage` when present), `LinearHttpError`.
- A GraphQL response with both `data` and `errors` is treated as an error (fail explicitly).
- Never includes the key in error messages.

### Pagination (`lib/linear/pagination.ts`)

`collectPages(fetchPage, { maxPages })` follows `pageInfo { hasNextPage endCursor }`; exceeding `maxPages` throws rather than truncating silently.

### Operations (`lib/linear/operations.ts`)

Queries: `Viewer`, `Teams`, `WorkflowStates`, `IssueLabels`, `Projects`, `Users`, `TriageQueue` (paged, `filter: { state: { type: { eq: "triage" } } }`), `IssueDetail` (signed file URLs), `SearchIssues`.

Mutations: `UpdateIssue`, `CreateComment`, `DeleteComment`, `CreateIssueRelation`, `DeleteIssueRelation`.

`TriageIssue` fragment (queue rows): id, identifier, title, priority, estimate, createdAt, updatedAt, snoozedUntilAt, url, team{id}, state{id}, assignee{id}, project{id}, labels{nodes{id}}, creator{id displayName avatarUrl}, botActor{name avatarUrl}, externalUserCreator{name}, integrationSourceType.

`IssueDetail` adds description, parent, attachments, comments (user/bot/external author), relations and inverse relations.

## 5. Domain logic (pure, unit-tested)

- **queue.ts** — `isSnoozed(issue, now)`, `visibleQueue(issues, { teamId, order, includeSnoozed, now })`, `countsByTeam`, `neighbours(queue, id)` for next/previous.
- **states.ts** — `triageState(team)`, `acceptState(team)` (team default, falling back to first backlog then unstarted), `declineState(team)` (lowest-position `canceled` state), `acceptTargets(team)` (backlog, unstarted, started states in position order).
- **snooze.ts** — `snoozePresets(now)`: *In 3 hours*, *Tomorrow 09:00*, *Next Monday 09:00*, *In a month 09:00*; plus `parseCustomSnooze(datetimeLocal)` rejecting past times. Local device time zone.
- **estimates.ts** — scales per `issueEstimationType` with `issueEstimationExtended` and `issueEstimationAllowZero`; T-shirt labels; `estimateLabel(team, value)`.
- **priorities.ts** — the five Linear priorities with labels (None, Urgent, High, Medium, Low) and sort weights.
- **labels.ts** — `assignableLabels(team, labels)` (workspace + team labels, groups as headers only), `toggleLabel(selected, label, labels)` enforcing one child per group, `labelDelta(before, after)` → `{ addedLabelIds, removedLabelIds }` (deltas avoid clobbering concurrent edits).
- **team-move.ts** — `planTeamMove(issue, targetTeam, workspace)` → `{ input, warnings }`: sets `teamId`, keeps the issue in triage (`stateId` = target triage state, falling back to its default state), maps team labels by name (and parent group name) to the target team, drops unmappable labels with a warning, clears project if it does not include the target team.
- **actions.ts** — planners returning *data*, never closures:
  - `planAccept(issue, team, { stateId?, comment? })` — refuses if `requirePriorityToLeaveTriage` and priority is 0.
  - `planDecline(issue, team, { comment? })`
  - `planDuplicate(issue, canonical)`
  - `planSnooze(issue, until, viewerId)` / `planUnsnooze(issue)`
  - Each plan is `{ kind, issueId, label, steps: Step[], optimistic: Partial<TriageIssue> | 'remove' }` where `Step` is `updateIssue | createComment | createRelation | deleteComment | deleteRelation`.
- **executor.ts** — `executePlan(client, plan)` runs steps sequentially, records created IDs, and returns a serialisable **undo plan** (inverse steps in reverse order). If step *n* fails, it applies the inverse of steps *1…n-1* and rethrows with context. For duplicates it checks the returned issue state type and reports a warning if Linear did not move it to `duplicate`.

## 6. State (Pinia stores)

- **session** — key in storage; `connect(key)` verifies with `Viewer` before persisting; `disconnect()` wipes all app storage and in-memory state; exposes `client`.
- **workspace** — teams, states, labels, projects, users (active humans); cached snapshot for instant boot, refreshed per launch; selectors per team.
- **queue** — triage summaries, filter/sort, `refresh()` (throttled; also on becoming visible after 60 s), `perform(plan)` (optimistic remove/patch → execute → history entry + undo toast; rollback + error toast on failure), `edit(issueId, input)` for property changes (optimistic, serialised per issue, rollback on failure).
- **detail** — per-issue detail cache with fetch time; refetches when signed URLs are older than 50 minutes; prefetches the next issue.
- **history** — last 50 actions with their undo plans, persisted; `undo(entryId)` executes the undo plan and re-inserts the issue into the queue on success; entries are marked undone/failed, never silently dropped.
- **preferences** — sort order (newest/oldest), auto-advance, swipe actions on/off, left-swipe action (decline or snooze until tomorrow).
- **toasts** — transient messages with optional action.

Per-issue mutation serialisation lives in one shared utility (`lib/serial-queue.ts`) used by both `queue.edit` and `queue.perform`.

## 7. User interface

Visual language: native-feeling iOS utility. System font stack (SF Pro, SF Mono for identifiers), iOS Dynamic Type via `-apple-system-body`, dark-first palette with a light theme, team colours as accents, semantic action colours (accept green, decline red, snooze amber, duplicate slate). Motion is short and respects `prefers-reduced-motion`.

### Screens

1. **Connect** (`/connect`) — what the app does, where to create a key (Linear → Settings → Security & access → Personal API keys, *Read* + *Write*, no *Admin*), key field with a **Paste** button, verification showing who you are, a note that the installed home-screen app has its own storage so the key must be pasted inside it.
2. **Queue** (`/`) — large-title nav "Triage" with count; team filter chips with counts; rows (identifier, team colour, two-line title, source/creator, age, priority, estimate, labels); swipe right = accept, swipe left = decline (or snooze, per preference); pull to refresh; "Snoozed (n)" toggle; header buttons for Recent and Settings; empty state "Triage is clear".
3. **Issue** (`/issue/:id`) — nav bar with back, position "3 of 39", previous/next, overflow (Open in Linear, Copy link); team and identifier; title (tap to edit); horizontally scrolling property bar (Priority, Estimate, Labels, Project, Assignee, Team); created-by line; description; attachments; relations; comments with an "Add comment" button; sticky bottom action bar: **Decline · Duplicate · Snooze · Accept** (Accept primary; its chevron opens state choice + comment). After an action it auto-advances to the next issue (preference) or returns to the queue.
4. **Recent** (`/recent`) — action history with Undo per entry.
5. **Settings** (`/settings`) — account, preferences, rate-limit status, disconnect.

### Interaction safety

- Swipe: horizontal-intent lock (|dx| > |dy| × 1.5 and > 10 px before committing to a swipe), commit at 40 % of row width, ignored within 24 px of screen edges, visual commit state, disabled while a mutation for that row is pending, preference to disable.
- Every destructive action has undo (toast for 8 s, then Recent).
- All actions are also reachable by buttons (swipe is never the only path).
- Keyboard shortcuts for hardware keyboards mirror Linear: `1` accept, `2` decline, `3` duplicate, `H` snooze, `J`/`K` next/previous, `Esc` back.

## 8. PWA and iOS specifics

- Manifest: name "Linear Triage", short_name "Triage", `display: standalone`, theme/background colours, 192/512/maskable icons; `apple-touch-icon` 180 px.
- Meta: `viewport-fit=cover`, `apple-mobile-web-app-capable`/`mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style: black-translucent`, `format-detection: telephone=no`; inputs ≥ 16 px to avoid focus zoom.
- Service worker (`generateSW`, `autoUpdate`), precaches the shell; no runtime caching of Linear API traffic.
- Home-screen web apps are exempt from WebKit's seven-day script-writable storage cap, so the key persists.

## 9. Security

- Threat: XSS exfiltrating the key. Controls: markdown-it with `html: false`; DOMPurify on all rendered HTML; the only `v-html` is inside `MarkdownView`; CSP generated at build time with SHA-256 hashes for any inline script (`script-src 'self' 'sha256-…'`, no `unsafe-inline`/`unsafe-eval`), `connect-src 'self' https://api.linear.app`, `img-src 'self' data: blob: https:`, `frame-ancestors 'none'`, `base-uri 'none'`, `object-src 'none'`, `form-action 'none'`; no third-party scripts, fonts or analytics.
- Headers: `Referrer-Policy: no-referrer` (signed URLs and issue URLs never leak), `X-Content-Type-Options: nosniff`, `Permissions-Policy` denying unused features, `X-Robots-Tag: noindex`.
- Key never logged or included in errors; disconnect wipes storage.

## 10. Error handling

- Optimistic UI always paired with rollback and an error toast carrying Linear's message.
- Auth failures mark the session invalid and route to Connect with an explanation.
- Rate limiting shows reset time; refresh backs off.
- Offline banner; action buttons disabled while offline.
- Duplicate action verifies the resulting state and warns if Linear did not move the issue.

## 11. Testing

- **Unit (vitest):** every module in `lib/`, stores with a stubbed `fetch`, the serial queue, storage wrapper, markdown sanitiser (XSS payloads), CSP header generator.
- **Schema contract:** every generated document validates against the vendored SDL with `graphql-js`.
- **Live read-only (`pnpm test:live`, needs `LINEAR_API_KEY`):** all queries against the real API. A guard in the live test client refuses any document containing a mutation (the guard itself is unit-tested).
- **E2E (Playwright, iPhone profile):** built app served locally; reads hit the real API; **every mutation is intercepted** and answered locally, and tests assert the exact mutation payloads for accept, decline, duplicate, snooze, undo, and property edits.
- Manual visual QA via screenshots in light and dark.

## 12. Deployment

- `wrangler.jsonc`: name `linear-triage`, assets-only Worker, `assets.directory = .output/public`, `not_found_handling = single-page-application`, `workers_dev = true`, `preview_urls = false`.
- `pnpm run deploy` = codegen check → generate → headers → `wrangler deploy`.
- Credentials via `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` from syn's environment.

## 13. Out of scope

OAuth, multiple users, push notifications, offline mutation queue, editing descriptions, creating issues, Triage Intelligence suggestions (internal API), cycles (disabled in every team), due dates, sub-issue management.

## 14. Known risks

- Mutations cannot be run against the live workspace before handover. Mitigations: schema validation, intercepted E2E assertions, undo, persistent history. **First real use should be watched.**
- Whether Linear restores the triage state when a duplicate relation is deleted is unknown; undo explicitly sets the previous state.
- `snoozedById` is set to the viewer explicitly; if Linear rejects it, the error surfaces and the field is dropped in a follow-up.
