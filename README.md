# Triage

An iPhone-first web app for triaging [Linear](https://linear.app) issues: accept, decline, mark as duplicate, snooze, and tidy up priority, estimate, labels, project and team, all from your phone.

It runs entirely in your browser. There is no server holding your data: the app talks directly to Linear's API with a personal API key that stays on your device.

## Using it

1. Open the site in Safari on your iPhone.
2. Tap **Share → Add to Home Screen**, then open **Triage** from your home screen.
3. In Linear, go to **Settings → Security & access → Personal API keys**, create a key with **Read** and **Write** access, and copy it.
4. Paste the key into the app. The home-screen app keeps its own storage, so paste it there rather than in Safari.

## Developing

Requires Node 24 LTS and pnpm 12.

```sh
pnpm install
pnpm dev
```

See [`AGENTS.md`](./AGENTS.md) for the full command list, layout and rules.
