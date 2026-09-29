<script lang="ts" setup>
  import { ref } from "vue";
  import { navigateTo } from "#app";
  import { describeError } from "~/lib/linear/errors";
  import type { QueueOrder } from "~/lib/triage/queue";
  import { useHistoryStore } from "~/stores/history";
  import {
    type LeftSwipeAction,
    usePreferencesStore,
  } from "~/stores/preferences";
  import { useQueueStore } from "~/stores/queue";
  import { useSessionStore } from "~/stores/session";
  import { useToastStore } from "~/stores/toasts";
  import { useWorkspaceStore } from "~/stores/workspace";

  const session = useSessionStore();
  const preferences = usePreferencesStore();
  const workspace = useWorkspaceStore();
  const queue = useQueueStore();
  const history = useHistoryStore();
  const toasts = useToastStore();

  const confirmingDisconnect = ref(false);
  const reloading = ref(false);

  const orderOptions: { value: QueueOrder; label: string }[] = [
    { label: "Newest first", value: "newest" },
    { label: "Oldest first", value: "oldest" },
  ];
  const leftSwipeOptions: { value: LeftSwipeAction; label: string }[] = [
    { label: "Decline", value: "decline" },
    { label: "Snooze until tomorrow", value: "snooze" },
  ];

  async function reload() {
    reloading.value = true;
    try {
      await Promise.all([
        workspace.load(),
        queue.refresh(),
        session.refreshAccount(),
      ]);
      toasts.push({ message: "Reloaded from Linear", tone: "success" });
    } catch (failure) {
      toasts.push({ message: describeError(failure), tone: "error" });
    } finally {
      reloading.value = false;
    }
  }

  function clearRecent() {
    history.clear();
    toasts.push({ message: "Cleared Recent", tone: "info" });
  }

  async function disconnect() {
    confirmingDisconnect.value = false;
    session.disconnect();
    await navigateTo("/connect");
  }
</script>

<template>
  <div class="page">
    <NavBar title="Settings">
      <template #leading>
        <NuxtLink class="back" to="/">
          <AppIcon name="back" />
          <span>Triage</span>
        </NuxtLink>
      </template>
    </NavBar>

    <main class="content">
      <section
        aria-label="Account"
        class="group account"
        v-if="session.account"
      >
        <UserAvatar
          :name="session.account.viewer.displayName"
          :size="44"
          :url="session.account.viewer.avatarUrl"
        />
        <div>
          <p class="name">{{ session.account.viewer.displayName }}</p>
          <p class="muted">{{ session.account.viewer.email }}</p>
          <p class="muted">Workspace {{ session.account.organisation.name }}</p>
        </div>
      </section>

      <section aria-labelledby="queue-heading" class="group">
        <h2 id="queue-heading">Queue</h2>
        <SegmentedControl
          label="Order"
          v-model="preferences.values.order"
          :options="orderOptions"
        />
        <SwitchToggle
          hint="Otherwise you go back to the queue."
          label="Open the next issue after acting"
          v-model="preferences.values.autoAdvance"
        />
      </section>

      <section aria-labelledby="gesture-heading" class="group">
        <h2 id="gesture-heading">Swipe actions</h2>
        <SwitchToggle
          hint="Swipe right to accept. Every swipe can be undone."
          label="Swipe rows in the queue"
          v-model="preferences.values.swipeEnabled"
        />
        <SegmentedControl
          label="Swipe left to"
          v-if="preferences.values.swipeEnabled"
          v-model="preferences.values.leftSwipe"
          :options="leftSwipeOptions"
        />
      </section>

      <section aria-labelledby="data-heading" class="group">
        <h2 id="data-heading">Data</h2>
        <button
          class="row-button"
          type="button"
          :disabled="reloading"
          @click="reload"
        >
          <AppIcon name="refresh" :size="20" />
          {{ reloading ? "Reloading…" : "Reload everything from Linear" }}
        </button>
        <button class="row-button" type="button" @click="clearRecent">
          <AppIcon name="history" :size="20" />
          Clear Recent
        </button>
        <button
          class="row-button danger"
          type="button"
          @click="confirmingDisconnect = true"
        >
          <AppIcon name="signOut" :size="20" />
          Disconnect from Linear
        </button>
      </section>
    </main>

    <BottomSheet
      title="Disconnect from Linear?"
      v-model:open="confirmingDisconnect"
    >
      <p class="muted">
        This removes the API key and everything Triage has saved on this device,
        including Recent. Your issues in Linear are not affected.
      </p>
      <template #footer>
        <button
          class="sheet-button"
          type="button"
          @click="confirmingDisconnect = false"
        >
          Cancel
        </button>
        <button
          autofocus
          class="sheet-button danger"
          type="button"
          @click="disconnect"
        >
          Disconnect
        </button>
      </template>
    </BottomSheet>
  </div>
</template>

<style scoped>
  .back {
    display: inline-flex;
    align-items: center;
    min-height: var(--touch);
    padding-right: var(--space-2);
    font-size: 1rem;
    color: var(--colour-focus);
    text-decoration: none;
  }
  .content {
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
    max-width: 40rem;
    padding: var(--space-4) var(--gutter-end)
      calc(env(safe-area-inset-bottom) + var(--space-8)) var(--gutter);
    margin: 0 auto;
  }
  .group {
    padding: var(--space-2) var(--space-4);
    background: var(--colour-surface);
    border-radius: var(--radius-medium);
  }
  .group h2 {
    padding: var(--space-3) 0 var(--space-1);
    font-size: 1.05rem;
    font-weight: 700;
  }
  .account {
    display: flex;
    gap: var(--space-4);
    align-items: center;
    padding: var(--space-4);
  }
  .name {
    font-weight: 650;
  }
  .muted {
    font-size: 0.94rem;
    color: var(--colour-ink-muted);
  }
  .row-button {
    display: flex;
    gap: var(--space-3);
    align-items: center;
    width: 100%;
    min-height: 3rem;
    text-align: left;
  }
  .row-button + .row-button {
    border-top: 1px solid var(--colour-line);
  }
  .danger {
    color: var(--colour-decline);
  }
  .sheet-button {
    flex: 1;
    min-height: var(--touch);
    font-weight: 650;
    background: var(--colour-surface-raised);
    border-radius: var(--radius-medium);
  }
  .sheet-button.danger {
    color: #ffffff;
    background: var(--colour-decline-solid);
  }
</style>
