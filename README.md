# Triage

An iPhone-first web app for triaging [Linear](https://linear.app) issues: accept, decline, mark as duplicate, snooze, and tidy up priority, estimate, labels, project and team, all from your phone. Every action can be undone.

It runs entirely in your browser. There is no server holding your data: the app talks directly to Linear's API with a personal API key that stays on your device.

## Using it

1. Open the site in Safari on your iPhone.
2. Tap **Share → Add to Home Screen**, then open **Triage** from your Home Screen.
3. In Linear, go to **Settings → Security & access → Personal API keys**, create a key with **Read** and **Write** access, and copy it.
4. Paste the key into the app. The Home Screen app keeps its own storage, so paste it there rather than in Safari.

### Triage on the phone

- **Queue**: every issue in a Triage state, across all your teams. Filter by team, switch to Snoozed, pull down to refresh.
- **Swipe** a row right to accept it, left to decline it (or snooze it until tomorrow, in Settings).
- **Start sorting** opens the first issue. The strip along the bottom holds the four outcomes: **Decline**, **Duplicate**, **Snooze** and **Accept** (the chevron picks another state or adds a comment). After each action the next issue opens.
- Tap the property chips to set priority, estimate, labels, project, assignee or team; tap the title to rename.
- Every action shows an **Undo** toast, and **Recent** keeps the last 50 so you can undo later. Undo refuses if the issue has changed since, so it never overwrites other work.
- With a keyboard: `1` accept, `2` decline, `3` duplicate, `H` snooze, `J`/`K` next/previous, `Esc` back.

## Deploying

The app is static files served by an assets-only Cloudflare Worker (`wrangler.jsonc`). From fish:

```fish
env CLOUDFLARE_API_TOKEN=$__CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID=$__CLOUDFLARE_ACCOUNT_ID pnpm run deploy
```

`pnpm run deploy` runs lint, typecheck and unit tests, builds, writes `_headers` (CSP and privacy headers), and deploys to `linear-triage.<your-subdomain>.workers.dev`. For a custom domain such as `triage.syn.as`, add a `routes` entry with `custom_domain: true` to `wrangler.jsonc`.

## Developing

Requires Node 24 LTS and pnpm 12.

```fish
pnpm install
pnpm dev
```

`pnpm verify` runs lint, typecheck and the unit tests. `pnpm test:live` runs read-only contract tests against the real Linear API. The Playwright E2E suite is disabled; see "E2E safety" in [`AGENTS.md`](./AGENTS.md) before touching it.

See [`AGENTS.md`](./AGENTS.md) for the full command list, layout and rules, and `docs/superpowers/` for the design spec and implementation plan.
