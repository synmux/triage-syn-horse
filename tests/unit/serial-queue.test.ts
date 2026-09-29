import { describe, expect, it } from "vitest";
import { createSerialQueue } from "~/lib/serial-queue";

/** A promise the test resolves or rejects by hand. */
const deferred = <TValue>() => {
  let resolve: (value: TValue) => void = () => undefined;
  let reject: (reason: unknown) => void = () => undefined;
  const promise = new Promise<TValue>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
};

const flushMicrotasks = () =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

describe("createSerialQueue", () => {
  it("runs tasks for the same key strictly one after another", async () => {
    const queue = createSerialQueue();
    const events: string[] = [];
    const first = deferred<void>();

    const firstRun = queue.run("issue-1", async () => {
      events.push("first started");
      await first.promise;
      events.push("first finished");
    });
    const secondRun = queue.run("issue-1", () => {
      events.push("second started");
      return Promise.resolve();
    });

    await flushMicrotasks();
    expect(events).toEqual(["first started"]);

    first.resolve();
    await Promise.all([firstRun, secondRun]);
    expect(events).toEqual([
      "first started",
      "first finished",
      "second started",
    ]);
  });

  it("keeps going after a failed task and still reports the failure to its caller", async () => {
    const queue = createSerialQueue();

    const failing = queue.run("issue-1", () =>
      Promise.reject(new Error("boom"))
    );
    const following = queue.run("issue-1", () => Promise.resolve("done"));

    await expect(failing).rejects.toThrow("boom");
    await expect(following).resolves.toBe("done");
  });

  it("runs tasks for different keys concurrently", async () => {
    const queue = createSerialQueue();
    const blocker = deferred<void>();
    const events: string[] = [];

    const blocked = queue.run("issue-1", async () => {
      await blocker.promise;
      events.push("issue-1");
    });
    await queue.run("issue-2", () => {
      events.push("issue-2");
      return Promise.resolve();
    });

    expect(events).toEqual(["issue-2"]);
    blocker.resolve();
    await blocked;
  });

  it("reports whether a key has work in flight", async () => {
    const queue = createSerialQueue();
    const gate = deferred<void>();

    const running = queue.run("issue-1", () => gate.promise);
    expect(queue.pending("issue-1")).toBe(true);
    expect(queue.pending("issue-2")).toBe(false);

    gate.resolve();
    await running;
    await flushMicrotasks();
    expect(queue.pending("issue-1")).toBe(false);
  });
});
