import { beforeEach, describe, expect, it } from "vitest";
import {
  clearAppStorage,
  createStorage,
  StorageUnavailableError,
  storagePrefix,
} from "~/lib/storage";

interface Settings {
  colour: string;
}

const isSettings = (value: unknown): value is Settings =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as Record<string, unknown>).colour === "string";

const settingsStorage = (backend: Storage | null = localStorage) =>
  createStorage<Settings>("settings", {
    backend: () => backend,
    validate: isSettings,
    version: 2,
  });

/** A Storage whose every method throws, like Safari with storage blocked. */
const throwingStorage = new Proxy({} as Storage, {
  get() {
    throw new DOMException("The operation is insecure.", "SecurityError");
  },
});

describe("createStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("round-trips a value under the app prefix", () => {
    const storage = settingsStorage();

    storage.write({ colour: "green" });

    expect(storage.read()).toEqual({ colour: "green" });
    expect(localStorage.getItem(`${storagePrefix}settings`)).toBe(
      JSON.stringify({ value: { colour: "green" }, version: 2 })
    );
  });

  it("returns null when nothing is stored", () => {
    expect(settingsStorage().read()).toBeNull();
  });

  it("discards values written by a different version", () => {
    localStorage.setItem(
      `${storagePrefix}settings`,
      JSON.stringify({ value: { colour: "red" }, version: 1 })
    );

    expect(settingsStorage().read()).toBeNull();
    expect(localStorage.getItem(`${storagePrefix}settings`)).toBeNull();
  });

  it("discards corrupt JSON", () => {
    localStorage.setItem(`${storagePrefix}settings`, "{not json");

    expect(settingsStorage().read()).toBeNull();
    expect(localStorage.getItem(`${storagePrefix}settings`)).toBeNull();
  });

  it("discards values that fail validation", () => {
    localStorage.setItem(
      `${storagePrefix}settings`,
      JSON.stringify({ value: { colour: 7 }, version: 2 })
    );

    expect(settingsStorage().read()).toBeNull();
  });

  it("clears its own key", () => {
    const storage = settingsStorage();
    storage.write({ colour: "blue" });

    storage.clear();

    expect(storage.read()).toBeNull();
  });

  it("reads as empty but refuses writes when storage is blocked", () => {
    const storage = settingsStorage(throwingStorage);

    expect(storage.read()).toBeNull();
    expect(() => storage.write({ colour: "green" })).toThrow(
      StorageUnavailableError
    );
    expect(() => storage.clear()).not.toThrow();
  });

  it("refuses writes when there is no storage at all", () => {
    expect(() => settingsStorage(null).write({ colour: "green" })).toThrow(
      "This browser is not letting the app save data"
    );
  });
});

describe("clearAppStorage", () => {
  it("removes only keys with the app prefix", () => {
    localStorage.clear();
    localStorage.setItem(`${storagePrefix}one`, "1");
    localStorage.setItem(`${storagePrefix}two`, "2");
    localStorage.setItem("someone-else", "3");

    clearAppStorage(localStorage);

    expect(localStorage.length).toBe(1);
    expect(localStorage.getItem("someone-else")).toBe("3");
  });
});
