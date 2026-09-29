/**
 * App-wide lifecycle: loads data when connected, refreshes when the app
 * comes back to the foreground, keeps snooze visibility current, tracks
 * the on-screen keyboard, and sends an invalid session back to Connect.
 */

import { onBeforeUnmount, onMounted, watch } from "vue";
import { navigateTo } from "#app";
import { describeError, LinearAuthError } from "~/lib/linear/errors";
import { useQueueStore } from "~/stores/queue";
import { useSessionStore } from "~/stores/session";
import { useToastStore } from "~/stores/toasts";
import { useWorkspaceStore } from "~/stores/workspace";

const queueRefreshAfterMs = 60 * 1000;
const workspaceRefreshAfterMs = 10 * 60 * 1000;
const clockTickMs = 60 * 1000;

export function useAppLifecycle() {
  const session = useSessionStore();
  const workspace = useWorkspaceStore();
  const queue = useQueueStore();
  const toasts = useToastStore();
  let workspaceLoadedAt = 0;
  let ticker: ReturnType<typeof setInterval> | null = null;

  const report = (failure: unknown) => {
    // An auth failure is handled by the redirect below, not a toast.
    if (!(failure instanceof LinearAuthError)) {
      toasts.push({ message: describeError(failure), tone: "error" });
    }
  };

  const loadWorkspace = () => {
    workspaceLoadedAt = Date.now();
    workspace.load().catch(report);
  };

  const start = () => {
    loadWorkspace();
    queue.refresh().catch(report);
    session.refreshAccount().catch(report);
  };

  const onVisibilityChange = () => {
    if (
      document.visibilityState !== "visible" ||
      session.status !== "connected"
    ) {
      return;
    }
    queue.tick();
    const loadedAt = queue.loadedAt?.getTime() ?? 0;
    if (Date.now() - loadedAt > queueRefreshAfterMs) {
      queue.refresh().catch(report);
    }
    if (Date.now() - workspaceLoadedAt > workspaceRefreshAfterMs) {
      loadWorkspace();
    }
  };

  /** Exposes the on-screen keyboard's height so sheets can sit above it. */
  const onViewportChange = () => {
    const viewport = window.visualViewport;
    if (!viewport) {
      return;
    }
    const inset = Math.max(
      0,
      window.innerHeight - viewport.height - viewport.offsetTop
    );
    document.documentElement.style.setProperty(
      "--keyboard-inset",
      `${Math.round(inset)}px`
    );
  };

  watch(
    () => session.status,
    (status, previous) => {
      if (status === "invalid") {
        navigateTo("/connect");
      } else if (status === "connected" && previous !== "connected") {
        start();
      }
    }
  );

  onMounted(() => {
    if (session.status === "connected") {
      start();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.visualViewport?.addEventListener("resize", onViewportChange);
    ticker = setInterval(() => queue.tick(), clockTickMs);
  });

  onBeforeUnmount(() => {
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.visualViewport?.removeEventListener("resize", onViewportChange);
    if (ticker) {
      clearInterval(ticker);
    }
  });
}
