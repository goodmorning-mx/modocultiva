import { cloneStateValue, isPlainStateObject, reconcileState, stateValuesEqual, type StateObject } from './stateReconcile';

export type StateSnapshot<T extends StateObject = StateObject> = {
  state: T;
  revision: string;
  validationReceipts?: unknown;
  legacyCompletionSlots?: readonly string[];
  [metadata: string]: unknown;
};

/** Convert an HTTP 409 to { conflict: latestCanonicalSnapshot } in the adapter. */
export type StateSaveResult<T extends StateObject = StateObject> = StateSnapshot<T> | { conflict: StateSnapshot<T> };
export type StateSaveTransport<T extends StateObject = StateObject> = (
  state: T, revision: string, signal: AbortSignal, keepalive?: boolean,
) => Promise<StateSaveResult<T>>;

export type StateFlushStatus = 'synced' | 'error' | 'conflict-limit' | 'disposed' | 'keepalive-too-large';
export type StateFlushResult<T extends StateObject = StateObject> = {
  status: StateFlushStatus;
  snapshot: StateSnapshot<T>;
  dirty: boolean;
  error?: unknown;
};

export type StateSyncQueueOptions<T extends StateObject = StateObject> = {
  initial: StateSnapshot<T>;
  transport: StateSaveTransport<T>;
  /** Use functional React setters: reconcileState(base, latestReactState, remote). */
  onReconcile?: (base: T, remote: T, snapshot: StateSnapshot<T>) => void;
  /** Must match the transport's exact request serialization (including envelope). */
  serializeBody?: (state: T, revision: string) => string;
};

export const STATE_KEEPALIVE_LIMIT_BYTES = 60_000;
export const STATE_CONFLICT_RETRIES = 3;
export function serializeStateSave(state: StateObject, revision: string): string {
  return JSON.stringify({ state, expected_revision: revision });
}

function snapshotCopy<T extends StateObject>(snapshot: StateSnapshot<T>): StateSnapshot<T> {
  if (!isPlainStateObject(snapshot.state) || typeof snapshot.revision !== 'string' || !snapshot.revision.trim()) {
    throw new TypeError('A canonical state object and non-empty opaque revision are required.');
  }
  return cloneStateValue(snapshot);
}

/**
 * Per hydrated account/session. stage() is synchronous; the caller owns debounce
 * and pagehide wiring. No ambient account/storage/network APIs or timers.
 * flush() drains edits, coalesces concurrent calls and always serializes saves.
 */
export function createStateSyncQueue<T extends StateObject>(options: StateSyncQueueOptions<T>) {
  let acknowledged = snapshotCopy(options.initial);
  let desired = cloneStateValue(acknowledged.state);
  let disposed = false;
  let epoch = 0;
  let draining: Promise<StateFlushResult<T>> | null = null;
  let activeController: AbortController | null = null;
  let activeReadController: AbortController | null = null;
  let canonicalRead: Promise<boolean> | null = null;
  let readGeneration = 0;
  let keepaliveRequested = false;
  const knownRevisions = new Set([acknowledged.revision]);
  const serialize = options.serializeBody ?? serializeStateSave;
  const dirty = () => !stateValuesEqual(desired, acknowledged.state);
  const outcome = (status: StateFlushStatus, error?: unknown): StateFlushResult<T> => ({
    status, snapshot: snapshotCopy(acknowledged), dirty: dirty(), ...(error === undefined ? {} : { error }),
  });

  function notify(base: T, remote: StateSnapshot<T>) {
    if (!disposed) options.onReconcile?.(cloneStateValue(base), cloneStateValue(remote.state), snapshotCopy(remote));
  }

  function accept(remote: StateSnapshot<T>, base: T) {
    desired = reconcileState(base, desired, remote.state);
    acknowledged = snapshotCopy(remote);
    knownRevisions.add(remote.revision);
    epoch += 1;
    notify(base, remote);
  }

  async function drain(): Promise<StateFlushResult<T>> {
    let conflicts = 0;
    while (!disposed && dirty()) {
      const sent = cloneStateValue(desired);
      const base = cloneStateValue(acknowledged.state);
      const revision = acknowledged.revision;
      const sentEpoch = epoch;
      const keepalive = keepaliveRequested;
      let response: StateSaveResult<T>;
      const controller = new AbortController();
      let abortListener: (() => void) | undefined;
      try {
        if (keepalive && new TextEncoder().encode(serialize(sent, revision)).byteLength >= STATE_KEEPALIVE_LIMIT_BYTES) {
          return outcome('keepalive-too-large');
        }
        if (disposed) return outcome('disposed');
        activeController = controller;
        const aborted = new Promise<never>((_, reject) => {
          abortListener = () => reject(new Error('State queue disposed.'));
          controller.signal.addEventListener('abort', abortListener, { once: true });
        });
        response = await Promise.race([
          options.transport(cloneStateValue(sent), revision, controller.signal, keepalive),
          aborted,
        ]);
      } catch (error) {
        if (disposed) return outcome('disposed');
        // A canonical refresh superseded this request, even if its transport failed.
        if (sentEpoch !== epoch) continue;
        return outcome('error', error); // Dirty intent remains available to retry.
      } finally {
        if (abortListener) controller.signal.removeEventListener('abort', abortListener);
        if (activeController === controller) activeController = null;
      }
      if (disposed) return outcome('disposed');
      // Opaque revisions cannot be ordered. refresh() is an explicit authority
      // barrier: never let a response launched before it regress that snapshot.
      if (sentEpoch !== epoch) continue;
      try {
        if ('conflict' in response && !('state' in response)) {
          const remote = snapshotCopy(response.conflict);
          accept(remote, base); // Last acknowledged base, not the rejected payload.
          if (disposed) return outcome('disposed');
          if (!dirty()) return outcome('synced');
          if (conflicts >= STATE_CONFLICT_RETRIES) return outcome('conflict-limit');
          conflicts += 1;
        } else {
          const remote = snapshotCopy(response as StateSnapshot<T>);
          // Only edits after this payload was sent should be applied over its ack.
          accept(remote, sent);
          conflicts = 0;
        }
      } catch (error) {
        return outcome(disposed ? 'disposed' : 'error', error);
      }
    }
    return outcome(disposed ? 'disposed' : 'synced');
  }

  function flushWrites(flushOptions: { keepalive?: boolean } = {}): Promise<StateFlushResult<T>> {
    if (disposed) return Promise.resolve(outcome('disposed'));
    if (flushOptions.keepalive) keepaliveRequested = true;
    if (draining) return draining.then((result) => {
      if (disposed) return outcome('disposed');
      return result.status === 'synced' && dirty() ? flushWrites(flushOptions) : result;
    });
    const pending = Promise.resolve().then(drain).finally(() => {
      if (draining === pending) { draining = null; keepaliveRequested = false; }
    });
    draining = pending;
    return pending;
  }

  return {
    /** Stage a full desired snapshot or use an updater to preserve unknown keys. */
    stage(next: T | ((current: T) => T)): void {
      if (disposed) return;
      const candidate = typeof next === 'function' ? next(cloneStateValue(desired)) : next;
      if (!isPlainStateObject(candidate)) throw new TypeError('Stage requires a full state object.');
      desired = reconcileState(acknowledged.state, candidate, acknowledged.state);
    },
    /** A successful flush is required before submitting activity/evidence. */
    flush: function flush(flushOptions: { keepalive?: boolean } = {}): Promise<StateFlushResult<T>> {
      if (disposed) return Promise.resolve(outcome('disposed'));
      const read = canonicalRead;
      return read ? read.catch(() => false).then(() => flush(flushOptions)) : flushWrites(flushOptions);
    },
    /** Serialized authoritative GET: no PUT can overtake this read. Latest read wins. */
    refreshFrom(reader: (signal: AbortSignal) => Promise<StateSnapshot<T>>): Promise<boolean> {
      if (disposed) return Promise.resolve(false);
      const generation = ++readGeneration;
      const previous = canonicalRead;
      const pending = (previous ?? Promise.resolve(false)).catch(() => false).then(async () => {
        if (disposed || generation !== readGeneration) return false;
        // Public flushes wait on this read barrier. Drain older writes internally.
        const saved = await flushWrites();
        if (disposed || generation !== readGeneration) return false;
        if (saved.status !== 'synced') throw saved.error ?? new Error(saved.status);
        const controller = new AbortController();
        activeReadController = controller;
        let abort: (() => void) | undefined;
        try {
          const aborted = new Promise<never>((_, reject) => {
            abort = () => reject(new Error('State read disposed.'));
            controller.signal.addEventListener('abort', abort, { once: true });
          });
          const remote = await Promise.race([reader(controller.signal), aborted]);
          if (disposed || generation !== readGeneration) return false;
          accept(snapshotCopy(remote), acknowledged.state);
          return true;
        } catch (error) {
          if (disposed) return false;
          throw error;
        } finally {
          if (abort) controller.signal.removeEventListener('abort', abort);
          if (activeReadController === controller) activeReadController = null;
        }
      }).finally(() => { if (canonicalRead === pending) canonicalRead = null; });
      canonicalRead = pending;
      return pending;
    },
    /** Supply a fresh canonical snapshot after review/submission/read hydration. */
    refresh(remoteSnapshot: StateSnapshot<T>): void {
      if (disposed) return;
      const remote = snapshotCopy(remoteSnapshot);
      if (remote.revision !== acknowledged.revision && knownRevisions.has(remote.revision)) return;
      if (stateValuesEqual(remote, acknowledged)) return;
      accept(remote, acknowledged.state);
    },
    getSnapshot: (): StateSnapshot<T> => snapshotCopy(acknowledged),
    getDesired: (): T => cloneStateValue(desired),
    isDirty: dirty,
    dispose(): void {
      if (disposed) return;
      disposed = true;
      activeController?.abort();
      activeReadController?.abort();
      readGeneration += 1;
    },
  };
}

export type StateSyncQueue<T extends StateObject = StateObject> = ReturnType<typeof createStateSyncQueue<T>>;
