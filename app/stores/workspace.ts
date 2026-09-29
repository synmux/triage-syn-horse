/**
 * Teams, workflow states, labels, projects and people: everything needed
 * to render issues and plan actions. Cached so the app boots instantly;
 * refreshed on every launch.
 */
import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";
import { describeError } from "~/lib/linear/errors";
import {
  IssueLabelsDocument,
  ProjectsDocument,
  TeamsDocument,
  UsersDocument,
  WorkflowStatesDocument,
} from "~/lib/linear/generated/graphql";
import { collectPages } from "~/lib/linear/pagination";
import type { WorkspaceSnapshot } from "~/lib/linear/types";
import { createStorage } from "~/lib/storage";
import { labelsForTeam } from "~/lib/triage/labels";
import { statesForTeam } from "~/lib/triage/states";
import { useSessionStore } from "./session";
import { useToastStore } from "./toasts";

const isSnapshot = (value: unknown): value is WorkspaceSnapshot =>
  typeof value === "object" &&
  value !== null &&
  ["teams", "states", "labels", "projects", "users"].every((key) =>
    Array.isArray((value as Record<string, unknown>)[key])
  );

const snapshotStorage = createStorage<WorkspaceSnapshot>("workspace", {
  validate: isSnapshot,
  version: 1,
});

const byName = <TItem extends { name: string }>(first: TItem, second: TItem) =>
  first.name.localeCompare(second.name, "en-GB", { sensitivity: "base" });

export const useWorkspaceStore = defineStore("workspace", () => {
  const session = useSessionStore();
  const snapshot = ref<WorkspaceSnapshot | null>(snapshotStorage.read());
  /** True while showing cached data that has not been refreshed this session. */
  const stale = ref(snapshot.value !== null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  let inFlight: Promise<void> | null = null;

  async function fetchSnapshot(): Promise<WorkspaceSnapshot> {
    const client = session.requireClient();
    const [teams, states, labels, projects, users] = await Promise.all([
      collectPages((after) =>
        client.request(TeamsDocument, { after }).then((data) => data.teams)
      ),
      collectPages((after) =>
        client
          .request(WorkflowStatesDocument, { after })
          .then((data) => data.workflowStates)
      ),
      collectPages((after) =>
        client
          .request(IssueLabelsDocument, { after })
          .then((data) => data.issueLabels)
      ),
      collectPages((after) =>
        client
          .request(ProjectsDocument, { after })
          .then((data) => data.projects)
      ),
      collectPages((after) =>
        client.request(UsersDocument, { after }).then((data) => data.users)
      ),
    ]);
    return { labels, projects, states, teams, users };
  }

  /** Refreshes from Linear. Keeps the previous snapshot if this fails. */
  function load(): Promise<void> {
    if (inFlight) {
      return inFlight;
    }
    loading.value = true;
    const startedIn = session.epoch;
    inFlight = fetchSnapshot()
      .then((fresh) => {
        // Dropped if the session changed while loading (for example a
        // disconnect), so nothing lands in memory or storage afterwards.
        if (!session.isCurrent(startedIn)) {
          return;
        }
        snapshot.value = fresh;
        stale.value = false;
        error.value = null;
        try {
          snapshotStorage.write(fresh);
        } catch {
          useToastStore().warnOnce(
            "workspace-storage",
            "This browser isn't letting Triage save data, so it will reload everything each time."
          );
        }
      })
      .catch((failure: unknown) => {
        if (session.isCurrent(startedIn)) {
          error.value = describeError(failure);
        }
        throw failure;
      })
      .finally(() => {
        loading.value = false;
        inFlight = null;
      });
    return inFlight;
  }

  watch(
    () => session.status,
    (status) => {
      if (status === "disconnected") {
        snapshot.value = null;
        stale.value = false;
        error.value = null;
      }
    }
  );

  const teams = computed(() =>
    [...(snapshot.value?.teams ?? [])].sort((first, second) =>
      first.key.localeCompare(second.key, "en-GB")
    )
  );
  const ready = computed(() => snapshot.value !== null);

  const teamById = (teamId: string) =>
    snapshot.value?.teams.find((team) => team.id === teamId);
  const statesFor = (teamId: string) =>
    statesForTeam(teamId, snapshot.value?.states ?? []);
  const labelsFor = (teamId: string) =>
    labelsForTeam(teamId, snapshot.value?.labels ?? []);
  const labelById = (labelId: string) =>
    snapshot.value?.labels.find((label) => label.id === labelId);
  const projectsFor = (teamId: string) =>
    (snapshot.value?.projects ?? [])
      .filter((project) =>
        project.teams.nodes.some((team) => team.id === teamId)
      )
      .sort(byName);
  const projectById = (projectId: string) =>
    snapshot.value?.projects.find((project) => project.id === projectId);
  const humans = computed(() =>
    (snapshot.value?.users ?? [])
      .filter((user) => user.active && !user.app)
      .sort((first, second) =>
        first.displayName.localeCompare(second.displayName, "en-GB")
      )
  );
  const userById = (userId: string) =>
    snapshot.value?.users.find((user) => user.id === userId);

  return {
    error,
    humans,
    labelById,
    labelsFor,
    load,
    loading,
    projectById,
    projectsFor,
    ready,
    snapshot,
    stale,
    statesFor,
    teamById,
    teams,
    userById,
  };
});
