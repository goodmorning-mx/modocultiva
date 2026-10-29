/** JSON-shaped state; unknown future fields are not allowlisted away. */
export type StateObject = Record<string, unknown>;

export function isPlainStateObject(value: unknown): value is StateObject {
  if (value === null || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function cloneStateValue<T>(value: T): T {
  if (Array.isArray(value)) return value.map(cloneStateValue) as T;
  if (isPlainStateObject(value)) {
    // fromEntries defines own properties: even an unknown __proto__ key is data.
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, cloneStateValue(entry)])) as T;
  }
  return value;
}

export function stateValuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((entry, index) => stateValuesEqual(entry, right[index]));
  }
  if (!isPlainStateObject(left) || !isPlainStateObject(right)) return false;
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length
    && keys.every((key) => Object.prototype.hasOwnProperty.call(right, key) && stateValuesEqual(left[key], right[key]));
}

const MISSING = Symbol('absent-state-property');
const own = (object: StateObject, key: string): unknown => Object.prototype.hasOwnProperty.call(object, key) ? object[key] : MISSING;

function mergeValue(base: unknown, local: unknown, remote: unknown): unknown {
  if (stateValuesEqual(local, base)) return cloneStateValue(remote);
  if (stateValuesEqual(remote, base)) return cloneStateValue(local);
  if (isPlainStateObject(local) && isPlainStateObject(remote) && (isPlainStateObject(base) || base === MISSING)) {
    const original = base === MISSING ? {} : base as StateObject;
    const keys = new Set([...Object.keys(original), ...Object.keys(remote), ...Object.keys(local)]);
    const entries: [string, unknown][] = [];
    for (const key of keys) {
      const merged = mergeValue(own(original, key), own(local, key), own(remote, key));
      if (merged !== MISSING) entries.push([key, merged]);
    }
    return Object.fromEntries(entries);
  }
  // Conflicting arrays/scalars/deletions are an explicit local choice, not a
  // max-level floor, array concatenation, inferred approval or loss of intent.
  return cloneStateValue(local);
}

/**
 * Pure three-way merge: unchanged local takes remote, unchanged remote takes
 * local; recurse only through plain objects. Arrays are atomic local choices
 * when both sides changed. Missing own properties represent real deletions.
 * Completion/receipt fields are always remote-owned, even on equality shortcuts.
 */
export function reconcileState<T extends StateObject>(base: T, local: T, remote: T): T {
  const merged = mergeValue(base, local, remote) as T;
  for (const field of ['activityCompletions', 'validationReceipts', 'legacyCompletionSlots']) {
    if (Object.prototype.hasOwnProperty.call(remote, field)) {
      Object.defineProperty(merged, field, { value: cloneStateValue(remote[field]), writable: true, enumerable: true, configurable: true });
    } else {
      delete merged[field];
    }
  }
  return merged;
}
