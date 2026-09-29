import { afterEach, describe, expect, it, vi } from "vitest";
import { type EffectScope, effectScope, nextTick, ref } from "vue";
import { useAcceptGuide } from "~/composables/use-accept-guide";
import type { AcceptBlocker } from "~/lib/triage/actions";

let scope: EffectScope | null = null;

afterEach(() => {
  scope?.stop();
  scope = null;
});

function setUp(initial: AcceptBlocker[]) {
  const missing = ref<AcceptBlocker[]>(initial);
  const open = vi.fn<(blocker: AcceptBlocker) => void>();
  scope = effectScope();
  const guide = scope.run(() => useAcceptGuide({ missing, open }));
  if (!guide) {
    throw new Error("The guide did not start");
  }
  return { guide, missing, open };
}

describe("useAcceptGuide", () => {
  it("does nothing when the issue is ready, so Accept can go ahead", () => {
    const { guide, open } = setUp([]);
    expect(guide.start()).toBe(false);
    expect(guide.guiding.value).toBe(false);
    expect(open).not.toHaveBeenCalled();
  });

  it("opens the first missing picker", () => {
    const { guide, open } = setUp(["priority", "estimate"]);
    expect(guide.start()).toBe(true);
    expect(guide.guiding.value).toBe(true);
    expect(open).toHaveBeenCalledExactlyOnceWith("priority");
  });

  it("opens the next picker as each property is filled in, then stops", async () => {
    const { guide, missing, open } = setUp(["priority", "estimate"]);
    guide.start();

    missing.value = ["estimate"];
    await nextTick();
    expect(open).toHaveBeenLastCalledWith("estimate");

    missing.value = [];
    await nextTick();
    expect(guide.guiding.value).toBe(false);
    expect(open).toHaveBeenCalledTimes(2);
  });

  it("doesn't reopen a picker when the list recomputes without changing", async () => {
    const { guide, missing, open } = setUp(["estimate"]);
    guide.start();
    missing.value = ["estimate"];
    await nextTick();
    expect(open).toHaveBeenCalledTimes(1);
  });

  it("goes back to a property whose save was rolled back", async () => {
    const { guide, missing, open } = setUp(["priority", "estimate"]);
    guide.start();
    missing.value = ["estimate"];
    await nextTick();
    missing.value = ["priority", "estimate"];
    await nextTick();
    expect(open).toHaveBeenLastCalledWith("priority");
  });

  it("leaves the pickers alone when not guiding or once stopped", async () => {
    const { guide, missing, open } = setUp(["priority", "estimate"]);
    missing.value = ["estimate"];
    await nextTick();
    expect(open).not.toHaveBeenCalled();

    guide.start();
    guide.stop();
    missing.value = ["priority"];
    await nextTick();
    expect(open).toHaveBeenCalledTimes(1);
  });
});
