# Triage

Triage is an iPhone-first web app for triaging [Linear](https://linear.app) issues from your phone. You can accept, decline, snooze, or mark an issue as a duplicate and set its status, priority, estimate, due date, labels, project, and team. You can undo every action.

It runs entirely in your browser. No server holds your data, because the app talks to Linear's API directly with a personal API key that stays on your device.

## Set it up

1. Open the site in Safari on your iPhone.
2. Tap **Share**, then **Add to Home Screen**, and open **Triage** from your Home Screen.
3. In Linear, go to **Settings** > **Security & access** > **Personal API keys**.
4. Create a key with **Read** and **Write** access, and copy it.
5. Paste the key into the Home Screen app, which keeps its own storage apart from Safari's.

## Triage your issues

### The queue

The queue lists every issue in a Triage state across all your teams. You can filter it by team or switch to snoozed issues, and pulling down refreshes the list.

Swipe a row right to accept the issue, or left to decline it. In Settings, you can make the left swipe snooze the issue until tomorrow instead. If an issue isn't ready to accept, a right swipe opens it with the pickers it still needs.

Tap **Start sorting** to open the first issue.

### An issue

Use the strip along the bottom to decline, duplicate, snooze, or accept the issue. The chevron beside Accept picks another status or adds a comment. After each action, the next issue opens.

Tap a property chip to set the priority, estimate, due date, labels, project, assignee, or team, and tap the title to rename the issue. The first chip, **Accept to**, sets the status that Accept moves the issue into. It offers the team's backlog, unstarted, and started statuses, never Triage, and shows the team default until you change it.

### Accepting

An issue needs a priority and an estimate before you can accept it. In a team that doesn't use estimates, it needs only a priority. Until the issue is ready, its missing chips are outlined and the Accept button says what it needs. Tapping Accept then opens each missing picker in turn, and you tap Accept again once the issue is ready. The app never accepts an issue for you.

### Undo

Every action shows an **Undo** toast, and **Recent** keeps the last 50 actions so you can undo them later. Undo refuses if the issue has changed since, so it never overwrites anyone else's work.

### Keyboard shortcuts

With a hardware keyboard, press `1` to accept, `2` to decline, `3` to mark as duplicate, `H` to snooze, `J` or `K` for the next or previous issue, and `Esc` to go back.

## Deploy

The app is a set of static files that an assets-only Cloudflare Worker serves, configured in `wrangler.jsonc`. From fish, deploy it with this command:

```fish
env CLOUDFLARE_API_TOKEN=$__CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID=$__CLOUDFLARE_ACCOUNT_ID pnpm run deploy
```

`pnpm run deploy` runs `pnpm verify`, builds the app, and writes `_headers` with the Content Security Policy and privacy headers.

## Develop

You need Node 24 LTS and pnpm 12.

```fish
pnpm install
pnpm dev
```

`pnpm verify` runs lint, typecheck, and the unit tests. `pnpm test:live` runs read-only contract tests against the real Linear API. The Playwright end-to-end suite is disabled; read "E2E safety" in [`AGENTS.md`](./AGENTS.md) before you touch it.

[`AGENTS.md`](./AGENTS.md) lists the commands and the rules for working on the code, and `docs/superpowers/` holds the design spec and the implementation plan.
