import {
  defineConfig,
  minimal2023Preset,
} from "@vite-pwa/assets-generator/config";

/**
 * Generates the favicon, PWA icons, maskable icon and Apple touch icon
 * from one SVG. The icon has a full-bleed background, so no padding.
 */
export default defineConfig({
  headLinkOptions: { preset: "2023" },
  images: ["public/icon.svg"],
  preset: {
    ...minimal2023Preset,
    apple: {
      ...minimal2023Preset.apple,
      padding: 0,
      resizeOptions: { background: "#16202e" },
    },
    maskable: {
      ...minimal2023Preset.maskable,
      padding: 0,
      resizeOptions: { background: "#16202e" },
    },
  },
});
