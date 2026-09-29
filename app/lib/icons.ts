/**
 * Stroke icons on a 24×24 grid, drawn for this app. Each icon is a list of
 * SVG path strings rendered by `Icon.vue` (no v-html, no icon font).
 */

/** A circle as a path, so every icon is paths only. */
const circle = (centreX: number, centreY: number, radius: number) =>
  `M${centreX - radius} ${centreY}a${radius} ${radius} 0 1 0 ${radius * 2} 0a${radius} ${radius} 0 1 0 ${-radius * 2} 0`;

export const iconPaths = {
  back: ["M15 18l-6-6 6-6"],
  calendar: [
    "M4 6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z",
    "M4 10h16",
    "M8 3v4",
    "M16 3v4",
  ],
  check: ["M5 12.5l4.5 4.5L19 7.5"],
  chevronDown: ["M6 9l6 6 6-6"],
  chevronRight: ["M9 18l6-6-6-6"],
  chevronUp: ["M18 15l-6-6-6 6"],
  clock: [circle(12, 12, 9), "M12 7v5l3 2"],
  close: ["M6 6l12 12", "M18 6L6 18"],
  comment: ["M4 5h16v11H10l-6 4z"],
  duplicate: [
    "M10 9h8a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z",
    "M5 15V6a1 1 0 0 1 1-1h9",
  ],
  edit: ["M4 20h4L19 9l-4-4L4 16z", "M13.5 6.5l4 4"],
  estimate: ["M4 18a8 8 0 1 1 16 0", "M12 18l4-6"],
  external: [
    "M14 4h6v6",
    "M20 4l-9 9",
    "M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5",
  ],
  history: ["M3 12a9 9 0 1 0 3-6.7L3 8", "M3 3v5h5", "M12 7v5l3 2"],
  key: [circle(8, 15, 4), "M11 12l9-9", "M17 6l3 3"],
  label: ["M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z", circle(7.5, 7.5, 1.5)],
  link: [
    "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1",
    "M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  ],
  offline: [
    "M3 3l18 18",
    "M8.5 16.5a5 5 0 0 1 7 0",
    "M5 12.5a10 10 0 0 1 4.5-2.3",
    "M19 12.5a10 10 0 0 0-2.3-1.6",
    "M12 20h.01",
  ],
  paperclip: [
    "M20 11.5l-8.2 8.2a5 5 0 0 1-7.1-7.1l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8",
  ],
  paste: [
    "M9 3h6v4H9z",
    "M9 5H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-3",
  ],
  plus: ["M12 5v14", "M5 12h14"],
  project: [
    "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  ],
  refresh: ["M20 11a8 8 0 1 0-2.3 5.7", "M20 4v7h-7"],
  search: [circle(11, 11, 7), "M20 20l-3.5-3.5"],
  settings: [
    "M4 7h9",
    "M17 7h3",
    circle(15, 7, 2),
    "M4 17h3",
    "M11 17h9",
    circle(9, 17, 2),
  ],
  signOut: [
    "M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4",
    "M10 16l-4-4 4-4",
    "M6 12h10",
  ],
  team: ["M4 4h7v7H4z", "M13 4h7v7h-7z", "M4 13h7v7H4z", "M13 13h7v7h-7z"],
  undo: ["M9 14L4 9l5-5", "M4 9h11a5 5 0 0 1 0 10h-3"],
  user: [circle(12, 8, 4), "M4 20a8 8 0 0 1 16 0"],
} as const satisfies Record<string, readonly string[]>;

export type IconName = keyof typeof iconPaths;
