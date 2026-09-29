/**
 * Versioned, validated JSON persistence on top of `localStorage`.
 *
 * Reads are forgiving: a missing, outdated, corrupt or invalid entry reads
 * as `null` (and is removed), because every stored value is a cache or a
 * preference the app can rebuild. Writes are strict: if the browser will
 * not persist data, `write` throws `StorageUnavailableError` so the caller
 * can tell the user.
 */

/** Every key the app writes starts with this, so disconnecting can wipe them all. */
export const storagePrefix = "linear-triage:";

export class StorageUnavailableError extends Error {
  override name = "StorageUnavailableError";
}

export interface StoredValue<TValue> {
  clear: () => void;
  read: () => TValue | null;
  write: (value: TValue) => void;
}

export interface StorageOptions<TValue> {
  /** Defaults to `localStorage`, when the browser allows access to it. */
  backend?: () => Storage | null;
  validate: (value: unknown) => value is TValue;
  /** Bump when the stored shape changes; older entries are discarded. */
  version: number;
}

interface Envelope {
  value: unknown;
  version: number;
}

const isEnvelope = (value: unknown): value is Envelope =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as Record<string, unknown>).version === "number" &&
  "value" in value;

/** `localStorage`, or `null` where touching it throws (blocked storage). */
export function defaultBackend(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    // Safari throws a SecurityError on access when site data is blocked.
    return null;
  }
}

export function createStorage<TValue>(
  key: string,
  options: StorageOptions<TValue>
): StoredValue<TValue> {
  const storageKey = `${storagePrefix}${key}`;
  const backend = options.backend ?? defaultBackend;

  const remove = () => {
    try {
      backend()?.removeItem(storageKey);
    } catch {
      // Nothing to remove if storage is inaccessible.
    }
  };

  return {
    clear: remove,

    read() {
      let raw: string | null;
      try {
        raw = backend()?.getItem(storageKey) ?? null;
      } catch {
        return null;
      }
      if (raw === null) {
        return null;
      }

      let envelope: unknown;
      try {
        envelope = JSON.parse(raw);
      } catch {
        remove();
        return null;
      }

      if (
        !isEnvelope(envelope) ||
        envelope.version !== options.version ||
        !options.validate(envelope.value)
      ) {
        remove();
        return null;
      }
      return envelope.value;
    },

    write(value) {
      const store = backend();
      if (!store) {
        throw new StorageUnavailableError(
          "This browser is not letting the app save data"
        );
      }
      const envelope: Envelope = { value, version: options.version };
      try {
        store.setItem(storageKey, JSON.stringify(envelope));
      } catch (error) {
        throw new StorageUnavailableError(
          "This browser is not letting the app save data",
          { cause: error }
        );
      }
    },
  };
}

/** Removes every key the app has written, leaving other sites' data alone. */
export function clearAppStorage(
  backend: Storage | null = defaultBackend()
): void {
  if (!backend) {
    return;
  }
  const appKeys: string[] = [];
  for (let index = 0; index < backend.length; index += 1) {
    const storedKey = backend.key(index);
    if (storedKey?.startsWith(storagePrefix)) {
      appKeys.push(storedKey);
    }
  }
  for (const appKey of appKeys) {
    backend.removeItem(appKey);
  }
}
