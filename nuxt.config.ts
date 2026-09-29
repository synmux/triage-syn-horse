// https://nuxt.com/docs/api/configuration/nuxt-config
import { defineNuxtConfig } from "nuxt/config";

const canvasDark = "#16202e";
const canvasLight = "#eef1f4";

export default defineNuxtConfig({
  app: {
    head: {
      htmlAttrs: { lang: "en-GB" },
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
  css: ["~/assets/css/tokens.css", "~/assets/css/base.css"],
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
      // Theme colours are set per colour scheme in app.head above.
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
