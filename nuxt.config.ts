// https://nuxt.com/docs/api/configuration/nuxt-config
import { defineNuxtConfig } from "nuxt/config";

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
        { content: "dark light", name: "color-scheme" },
        {
          content: "#0f1012",
          media: "(prefers-color-scheme: dark)",
          name: "theme-color",
        },
        {
          content: "#f6f5f2",
          media: "(prefers-color-scheme: light)",
          name: "theme-color",
        },
        { content: "no-referrer", name: "referrer" },
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
  modules: ["@pinia/nuxt"],
  ssr: false,
  typescript: {
    strict: true,
    typeCheck: false,
  },
});
