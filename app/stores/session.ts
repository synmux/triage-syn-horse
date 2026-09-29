/**
 * The connection to Linear: the API key, who it belongs to, and the
 * client every other store uses. Any authentication failure anywhere
 * marks the session invalid so the UI can ask for a new key.
 */
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { normaliseApiKey } from "~/lib/api-key";
import { createLinearClient, type LinearClient } from "~/lib/linear/client";
import { LinearAuthError } from "~/lib/linear/errors";
import { ViewerDocument } from "~/lib/linear/generated/graphql";
import type { Organisation, Viewer } from "~/lib/linear/types";
import { clearAppStorage, createStorage } from "~/lib/storage";

export type SessionStatus = "disconnected" | "connected" | "invalid";

export interface Account {
  organisation: Organisation;
  viewer: Viewer;
}

const isString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

const isAccount = (value: unknown): value is Account =>
  typeof value === "object" &&
  value !== null &&
  "viewer" in value &&
  "organisation" in value;

const keyStorage = createStorage<string>("api-key", {
  validate: isString,
  version: 1,
});
const accountStorage = createStorage<Account>("account", {
  validate: isAccount,
  version: 1,
});

export const useSessionStore = defineStore("session", () => {
  const apiKey = ref<string | null>(keyStorage.read());
  const account = ref<Account | null>(accountStorage.read());
  const status = ref<SessionStatus>(
    apiKey.value ? "connected" : "disconnected"
  );

  const watchForAuthFailure = (inner: LinearClient): LinearClient => ({
    request: async (document, variables, options) => {
      try {
        return await inner.request(document, variables, options);
      } catch (error) {
        if (error instanceof LinearAuthError) {
          status.value = "invalid";
        }
        throw error;
      }
    },
  });

  const client = computed(() =>
    apiKey.value
      ? watchForAuthFailure(createLinearClient({ apiKey: apiKey.value }))
      : null
  );

  function requireClient(): LinearClient {
    if (!client.value) {
      throw new Error("Connect your Linear account first");
    }
    return client.value;
  }

  /** Verifies the key with Linear, then saves it. Nothing is saved on failure. */
  async function connect(rawKey: string): Promise<void> {
    const key = normaliseApiKey(rawKey);
    const candidate = createLinearClient({ apiKey: key });
    const data = await candidate.request(ViewerDocument, {});
    const verified: Account = {
      organisation: data.organization,
      viewer: data.viewer,
    };
    keyStorage.write(key);
    accountStorage.write(verified);
    apiKey.value = key;
    account.value = verified;
    status.value = "connected";
  }

  /** Refreshes who the saved key belongs to (names and avatars change). */
  async function refreshAccount(): Promise<void> {
    const data = await requireClient().request(ViewerDocument, {});
    account.value = { organisation: data.organization, viewer: data.viewer };
    accountStorage.write(account.value);
  }

  /** Forgets the key and every cached byte the app has stored. */
  function disconnect(): void {
    clearAppStorage();
    apiKey.value = null;
    account.value = null;
    status.value = "disconnected";
  }

  const viewerId = computed(() => account.value?.viewer.id ?? null);

  return {
    account,
    connect,
    disconnect,
    refreshAccount,
    requireClient,
    status,
    viewerId,
  };
});
