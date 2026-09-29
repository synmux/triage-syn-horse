// https://nuxt.com/docs/api/configuration/nuxt-config
import { defineNuxtConfig } from "nuxt/config";

const canvasDark = "#16202e";
const canvasLight = "#eef1f4";

export default defineNuxtConfig({
  app: {
    head: {
      htmlAttrs: { lang: "en-GB" },
      link: [
        // Static, so iOS finds them when adding to the Home Screen.
        { href: "/manifest.webmanifest", rel: "manifest" },
        { href: "/apple-touch-icon-180x180.png", rel: "apple-touch-icon" },
        { href: "/favicon.ico", rel: "icon", sizes: "48x48" },
        { href: "/icon.svg", rel: "icon", type: "image/svg+xml" },
      ],
      meta: [
        {
          content:
            "width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content",
          name: "viewport",
        },
        {
          content: "Triage Linear issues from your phone.",
          name: "description",
        },
        { content: "yes", name: "mobile-web-app-capable" },
        { content: "yes", name: "apple-mobile-web-app-capable" },
        { content: "Triage", name: "apple-mobile-web-app-title" },
        {
          content: "black-translucent",
          name: "apple-mobile-web-app-status-bar-style",
        },
        { content: "telephone=no", name: "format-detection" },
        { content: "light dark", name: "color-scheme" },
        {
          content: canvasDark,
          media: "(prefers-color-scheme: dark)",
          name: "theme-color",
        },
        {
          content: canvasLight,
          media: "(prefers-color-scheme: light)",
          name: "theme-color",
        },
        { content: "no-referrer", name: "referrer" },
        { content: "noindex, nofollow", name: "robots" },
      ],
      title: "Triage",
    },
  },
  compatibilityDate: "2026-09-29",
  css: [
    "~/assets/css/tokens.css",
    "~/assets/css/base.css",
    "~/assets/css/forms.css",
  ],
  devtools: { enabled: false },
  hooks: {
    // A client-only app needs just the shell (index.html, 200.html, 404.html).
    "prerender:routes"({ routes }) {
      routes.clear();
    },
  },
  // Every module imports what it uses, so code under app/lib and app/stores
  // runs in vitest without booting Nuxt. Components are still auto-registered.
  imports: { autoImport: false },
  modules: ["@pinia/nuxt", "@vite-pwa/nuxt"],
  nitro: {
    // Pinned: in Workers Builds, Nitro detects the CI and picks
    // `cloudflare-module`, which writes .wrangler/deploy/config.json redirecting
    // `wrangler deploy` to a server entry a static build never produces.
    preset: "static",
  },
  pwa: {
    client: { installPrompt: false },
    manifest: {
      background_color: canvasDark,
      description: "Triage Linear issues from your phone.",
      display: "standalone",
      id: "/",
      lang: "en-GB",
      name: "Linear Triage",
      orientation: "portrait",
      scope: "/",
      short_name: "Triage",
      start_url: "/",
      theme_color: canvasDark,
    },
    pwaAssets: {
      config: true,
      // Head links and theme colours are set statically in app.head above.
      includeHtmlHeadLinks: false,
      injectThemeColor: false,
      overrideManifestIcons: true,
    },
    registerType: "autoUpdate",
    workbox: {
      cleanupOutdatedCaches: true,
      globPatterns: ["**/*.{js,css,html,svg,png,ico,webmanifest}"],
      navigateFallback: "/",
      // Linear API traffic is never cached: it carries the API key.
      runtimeCaching: [],
    },
  },
  spaLoadingTemplate: true,
  ssr: false,
  typescript: {
    strict: true,
    typeCheck: false,
  },
});
