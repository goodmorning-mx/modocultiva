import { cloneStateValue, isPlainStateObject, reconcileState, stateValuesEqual, type StateObject } from './stateReconcile';
import type { StateSnapshot } from './stateSyncQueue';

export type AccountStateScope = { organizationId: string; accountId: string };
export type RecoveryStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export type PendingAccountState = { version: 1; scope: AccountStateScope; base: StateSnapshot; desired: StateObject; pending: boolean };
export const LEGACY_ARCHIVE_KEY = 'modo-cultiva:legacy-device-archive:v1';

export function accountStateKey(scope: AccountStateScope): string {
  if (!scope.organizationId?.trim() || !scope.accountId?.trim()) throw new Error('A verified account scope is required.');
  return `${encodeURIComponent(scope.organizationId)}:${encodeURIComponent(scope.accountId)}`;
}
export function accountRecoveryKey(scope: AccountStateScope): string { return `modo-cultiva:pending-state:v1:${accountStateKey(scope)}`; }
export function legacyConsentKey(scope: AccountStateScope): string { return `modo-cultiva:legacy-consent:v1:${accountStateKey(scope)}`; }

export function readStoredJson(storage: RecoveryStorage | null, key: string): unknown {
  try { const raw = storage?.getItem(key); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
export function writeStoredJson(storage: RecoveryStorage | null, key: string, value: unknown): boolean {
  try { if (!storage) return false; storage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}
export function readPendingAccount(storage: RecoveryStorage | null, scope: AccountStateScope): PendingAccountState | null {
  const record = readStoredJson(storage, accountRecoveryKey(scope));
  if (!isPlainStateObject(record) || record.version !== 1 || !isPlainStateObject(record.scope)
    || record.scope.organizationId !== scope.organizationId || record.scope.accountId !== scope.accountId
    || !isPlainStateObject(record.base) || typeof record.base.revision !== 'string' || !record.base.revision
    || !isPlainStateObject(record.base.state) || !isPlainStateObject(record.desired) || record.pending !== true) return null;
  return cloneStateValue(record) as PendingAccountState;
}
export function pendingAccountRecord(scope: AccountStateScope, base: StateSnapshot, desired: StateObject): PendingAccountState {
  const canonicalDesired = reconcileState(base.state, desired, base.state);
  return { version: 1, scope: { ...scope }, base: cloneStateValue(base), desired: canonicalDesired,
    pending: !stateValuesEqual(base.state, canonicalDesired) };
}
export function recoverAccountState(record: PendingAccountState | null, remote: StateSnapshot): StateObject {
  return record?.pending ? reconcileState(record.base.state, record.desired, remote.state) : cloneStateValue(remote.state);
}

/** First capture is immutable. Original legacy keys are never removed/overwritten. */
export function captureLegacyArchive(storage: RecoveryStorage | null, original: StateObject): StateObject {
  const prior = readStoredJson(storage, LEGACY_ARCHIVE_KEY);
  if (isPlainStateObject(prior) && prior.version === 1 && isPlainStateObject(prior.state)) return cloneStateValue(prior.state);
  try {
    // Retain even an unparseable older backup rather than overwriting it.
    if (storage?.getItem(LEGACY_ARCHIVE_KEY) === null) writeStoredJson(storage, LEGACY_ARCHIVE_KEY, { version: 1, state: original });
  } catch { /* Original keys remain a non-destructive fallback. */ }
  return cloneStateValue(original);
}
export function legacyImportDocument(archive: StateObject): StateObject {
  const result = cloneStateValue(archive);
  // Local historical marks are an archive, never new completion credit.
  for (const key of ['activityCompletions', 'validationReceipts', 'legacyCompletionSlots', 'communityApprovals']) delete result[key];
  return result;
}
export function hasLegacyConsent(storage: RecoveryStorage | null, scope: AccountStateScope): boolean {
  const receipt = readStoredJson(storage, legacyConsentKey(scope));
  return isPlainStateObject(receipt) && receipt.version === 1
    && (receipt.choice === 'import' || receipt.choice === 'cloud-only');
}

/** Per-field compatibility cache. No authenticated write reaches unscoped keys. */
export function scopedPersonalStorage(storage: RecoveryStorage | null, scope: AccountStateScope | null): RecoveryStorage {
  const prefix = scope ? `modo-cultiva:account-cache:v1:${accountStateKey(scope)}:` : 'modo-cultiva:guest-cache:v1:';
  const removedPrefix = `${prefix}removed:`;
  return {
    getItem(key) {
      try {
        if (storage?.getItem(`${removedPrefix}${key}`) === '1') return null;
        return storage?.getItem(`${prefix}${key}`) ?? (scope ? null : storage?.getItem(key)) ?? null;
      } catch { return null; }
    },
    setItem(key, value) {
      if (!storage) throw new Error('Storage unavailable');
      storage.setItem(`${prefix}${key}`, value);
      storage.removeItem(`${removedPrefix}${key}`);
    },
    removeItem(key) {
      if (!storage) throw new Error('Storage unavailable');
      // A guest deletion must not reveal the immutable legacy fallback again.
      // Write first: if storage is full, retain the old value and report failure.
      storage.setItem(`${removedPrefix}${key}`, '1');
      storage.removeItem(`${prefix}${key}`);
    },
  };
}

/** Merge only changes since the last committed UI, never an obsolete full view. */
export function stageCommittedUi(base: StateObject, rendered: StateObject, canonical: StateObject): StateObject {
  return reconcileState(base, rendered, canonical);
}
