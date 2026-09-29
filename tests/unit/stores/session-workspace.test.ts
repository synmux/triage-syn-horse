import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { normaliseApiKey } from "~/lib/api-key";
import { ViewerDocument } from "~/lib/linear/generated/graphql";
import { storagePrefix } from "~/lib/storage";
import { usePreferencesStore } from "~/stores/preferences";
import { useSessionStore } from "~/stores/session";
import { useToastStore } from "~/stores/toasts";
import { useWorkspaceStore } from "~/stores/workspace";
import { makeWorkspace } from "../../support/factories";
import {
  authenticationFailure,
  connection,
  stubLinearFetch,
} from "../../support/fetch-stub";

const viewerData = {
  organization: { name: "synmux", urlKey: "synmux" },
  viewer: {
    avatarUrl: null,
    displayName: "syn",
    email: "syn@example.com",
    id: "user-syn",
    name: "syn",
  },
};

const noStubPattern = /No stub for/;
const workspace = makeWorkspace();
const workspaceHandlers = {
  IssueLabels: () => ({ issueLabels: connection(workspace.labels) }),
  Projects: () => ({ projects: connection(workspace.projects) }),
  Teams: () => ({ teams: connection(workspace.teams) }),
  Users: () => ({ users: connection(workspace.users) }),
  Viewer: () => viewerData,
  WorkflowStates: () => ({ workflowStates: connection(workspace.states) }),
};

beforeEach(() => {
  localStorage.clear();
  setActivePinia(createPinia());
});

describe("normaliseApiKey", () => {
  it("trims whitespace and a Bearer prefix", () => {
    expect(normaliseApiKey("  Bearer lin_api_abc123\n")).toBe("lin_api_abc123");
    expect(normaliseApiKey("lin_api_abc123")).toBe("lin_api_abc123");
  });

  it("rejects empty input and keys with spaces inside", () => {
    expect(() => normaliseApiKey("   ")).toThrow("Paste your Linear API key");
    expect(() => normaliseApiKey("lin_api abc")).toThrow(
      "That doesn't look like a Linear API key"
    );
  });
});

describe("session store", () => {
  it("verifies the key with Linear before saving it", async () => {
    const { requests } = stubLinearFetch(workspaceHandlers);
    const session = useSessionStore();

    await session.connect(" lin_api_good \n");

    expect(requests[0]?.operation).toBe("Viewer");
    expect(requests[0]?.headers.get("authorization")).toBe("lin_api_good");
    expect(session.status).toBe("connected");
    expect(session.account?.viewer.displayName).toBe("syn");
    expect(localStorage.getItem(`${storagePrefix}api-key`)).toContain(
      "lin_api_good"
    );
  });

  it("stores nothing when Linear rejects the key", async () => {
    stubLinearFetch({ Viewer: () => Promise.reject(authenticationFailure()) });
    const session = useSessionStore();

    await expect(session.connect("lin_api_bad")).rejects.toThrow(
      "Authentication required"
    );

    expect(session.status).toBe("disconnected");
    expect(localStorage.length).toBe(0);
  });

  it("restores a saved key on start", async () => {
    stubLinearFetch(workspaceHandlers);
    await useSessionStore().connect("lin_api_good");

    setActivePinia(createPinia());
    const restored = useSessionStore();

    expect(restored.status).toBe("connected");
    expect(restored.account?.organisation.name).toBe("synmux");
  });

  it("marks the session invalid when any request fails authentication", async () => {
    stubLinearFetch(workspaceHandlers);
    const session = useSessionStore();
    await session.connect("lin_api_good");
    stubLinearFetch({ Viewer: () => Promise.reject(authenticationFailure()) });

    await expect(
      session.requireClient().request(ViewerDocument, {})
    ).rejects.toThrow();

    expect(session.status).toBe("invalid");
  });

  it("wipes every app key on disconnect and refuses to hand out a client", async () => {
    stubLinearFetch(workspaceHandlers);
    const session = useSessionStore();
    await session.connect("lin_api_good");
    localStorage.setItem("unrelated", "keep me");

    session.disconnect();

    expect(session.status).toBe("disconnected");
    expect(session.account).toBeNull();
    expect(localStorage.length).toBe(1);
    expect(() => session.requireClient()).toThrow(
      "Connect your Linear account first"
    );
  });
});

describe("workspace store", () => {
  it("loads every collection and exposes per-team selectors", async () => {
    stubLinearFetch(workspaceHandlers);
    await useSessionStore().connect("lin_api_good");
    const store = useWorkspaceStore();

    await store.load();

    expect(store.teams.map((team) => team.key)).toEqual(["MYR", "SHS"]);
    expect(store.teamById("team-shs")?.name).toBe("syn-horse");
    expect(store.statesFor("team-myr").map((state) => state.name)).toEqual([
      "Triage",
      "Backlog",
      "Scheduled",
      "In Progress",
      "In Review",
      "Done",
      "Canceled",
      "Duplicate",
    ]);
    expect(store.projectsFor("team-shs").map((project) => project.id)).toEqual([
      "project-shared",
    ]);
    expect(store.humans.map((user) => user.displayName)).toEqual(["syn"]);
    expect(store.stale).toBe(false);
  });

  it("boots from the cached snapshot and marks it stale until refreshed", async () => {
    stubLinearFetch(workspaceHandlers);
    await useSessionStore().connect("lin_api_good");
    await useWorkspaceStore().load();

    setActivePinia(createPinia());
    const restored = useWorkspaceStore();

    expect(restored.ready).toBe(true);
    expect(restored.stale).toBe(true);
    expect(restored.teams).toHaveLength(2);
  });

  it("keeps the previous snapshot and records the error when a refresh fails", async () => {
    stubLinearFetch(workspaceHandlers);
    await useSessionStore().connect("lin_api_good");
    const store = useWorkspaceStore();
    await store.load();
    stubLinearFetch({});

    await expect(store.load()).rejects.toThrow();

    expect(store.teams).toHaveLength(2);
    expect(store.error).toMatch(noStubPattern);
  });
});

describe("preferences store", () => {
  it("starts with defaults and persists changes", async () => {
    const preferences = usePreferencesStore();
    expect(preferences.values).toEqual({
      autoAdvance: true,
      leftSwipe: "decline",
      order: "newest",
      swipeEnabled: true,
    });

    preferences.values.order = "oldest";
    await Promise.resolve();

    setActivePinia(createPinia());
    expect(usePreferencesStore().values.order).toBe("oldest");
  });
});

describe("toast store", () => {
  it("auto-dismisses toasts and keeps at most three", () => {
    vi.useFakeTimers();
    const toasts = useToastStore();

    for (const message of ["one", "two", "three", "four"]) {
      toasts.push({ message, tone: "info" });
    }
    expect(toasts.items.map((toast) => toast.message)).toEqual([
      "two",
      "three",
      "four",
    ]);

    vi.advanceTimersByTime(4001);
    expect(toasts.items).toEqual([]);
    vi.useRealTimers();
  });

  it("shows a warnOnce message a single time per key", () => {
    const toasts = useToastStore();
    toasts.warnOnce("storage", "Storage is blocked");
    toasts.warnOnce("storage", "Storage is blocked");
    expect(toasts.items).toHaveLength(1);
  });
});
