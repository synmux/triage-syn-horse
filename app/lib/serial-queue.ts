/**
 * Runs async tasks one at a time per key.
 *
 * Every write to a Linear issue goes through here keyed by issue id, so an
 * undo can never overtake the action it reverses and two quick property
 * edits cannot land out of order.
 */
export interface SerialQueue {
  /** True while any task for `key` is queued or running. */
  pending: (key: string) => boolean;
  run: <TResult>(key: string, task: () => Promise<TResult>) => Promise<TResult>;
}

export function createSerialQueue(): SerialQueue {
  const tails = new Map<string, Promise<void>>();
  const outstanding = new Map<string, number>();

  const settle = (key: string) => {
    const remaining = (outstanding.get(key) ?? 1) - 1;
    if (remaining > 0) {
      outstanding.set(key, remaining);
      return;
    }
    outstanding.delete(key);
    tails.delete(key);
  };

  return {
    pending: (key) => outstanding.has(key),

    run<TResult>(key: string, task: () => Promise<TResult>) {
      const previous = tails.get(key) ?? Promise.resolve();
      // The previous task's outcome belongs to its own caller; here it only
      // gates when this task may start.
      const result = previous.then(task, task);
      const tail = result.then(
        () => settle(key),
        () => settle(key)
      );
      tails.set(key, tail);
      outstanding.set(key, (outstanding.get(key) ?? 0) + 1);
      return result;
    },
  };
}
