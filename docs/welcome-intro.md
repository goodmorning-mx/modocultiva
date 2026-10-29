# Isolated first-visit welcome

`frontend/src/WelcomeIntro.tsx` exports `WelcomeIntro({ language, onComplete })` and the reusable decorative `WelcomeIntroMark`. It uses the existing `CultivaLeaf` silhouette and Manrope font, namespaced botanical-green/teal CSS and no bitmap generation, account calls, paid AI, or map changes. `welcomeMessages.ts` contains the seven exact Spanish phrases and equivalents/control labels for es/en/zh/hi/ar/it/pt/ru/de/fr/da. Regional language tags resolve to their base language; unknown tags fall back to Spanish. Arabic is RTL.

The component starts automatically. Entry → readable hold → exit repeats for every phrase; there is no manual next, skip, swipe, key advance or numbered counter. Pause/resume is its sole control. Reading duration combines words and Unicode character counts, including CJK text, bounded to 4.5–18 seconds per phrase. Reduced motion keeps timed short opacity-only transitions. Timers and ambient motion pause while hidden or manually paused; showing a tab does not undo a manual pause. Late timers cannot fast-forward unread phrases. Changing language keeps the current phrase index and grants the translated text its full reading time.

`onComplete` fires once per mounted sequence, after the final exit, including React StrictMode effect replay. The latest callback is used without restarting timing. Completion removes the portal, clears timers/listeners and restores prior inert flags, body overflow, focus (if still connected) and scroll. Early unmount cleans up without reporting completion. The app must unmount/remount (or key) the component when the visitor/account scope changes. Replay is a caller decision, never a data reset.

The welcome header uses the unmodified user-supplied neon logo (`assets/modo-cultiva-logo-official.png`, SHA256 `74b3793b31bd1de21cf688e5d5e4ff2a6bc1163e44a7e1457ccc8ae2b1ee54d0`). The large cultivation leaf next to the questions remains unchanged.

## Language preference

`languagePreference.ts` applies one policy to all11 languages, including regional browser tags: an explicit supported manual selection wins; otherwise the first supported browser language wins, with Spanish as the unsupported-language fallback. Old cloud/cache language values without explicit provenance, and values marked `auto`, never override the browser. For legacy cloud state only, the verified account's own cache may prove a matching explicit manual choice; another account/guest cache cannot supply that proof. Verified account state persists `languageSource: 'manual' | 'auto'` alongside the language. Account hydration, canonical refresh, logout/account switching and guest caches use the same policy. Canonical snapshots normalize the preference before entering the queue; the language/source pair merges atomically so a pending manual choice is not stripped by older responses. UI, synchronous document and queue stay consistent. Welcome, interface and the automatically following tutorial share the resolved language; no separate English default is introduced for either overlay.

## First-visit eligibility API

`welcomeIntroState.ts` has no ambient browser/storage/account access:

- `WelcomeIntroScope`: `{ kind: 'guest', visitorId }` or `{ kind: 'account', organizationId, accountId }`. Use stable opaque IDs, not display names/emails. Guest/account/organization scopes do not share flags.
- `WelcomeIntroAudience`: `{ status: 'pending' | 'unavailable' }` or `{ status: 'ready', scope }`.
- `readWelcomeIntroCompletion(storage, scope)` → `'complete' | 'incomplete' | 'unavailable'`.
- `decideWelcomeIntro(audience, completion)` → `'wait' | 'show' | 'skip'`. Pending/failed identity hydration waits. After hydration, only an actual completed welcome flag skips the introduction. Existing levels, presets, activities or images never imply that someone has already seen it. Returning users without a completion flag receive the seven messages once, followed automatically by the tutorial, without altering saved map data. A completed account flag from hydrated cloud state also prevents repeats on another browser; guest completion never marks an account complete.
- `markWelcomeIntroComplete(storage, scope)` writes only the versioned, scoped welcome flag and returns whether persistence succeeded. Call from `onComplete`, not on mount/pause/unmount. Keep a per-scope in-memory completed guard even if storage fails. Catch access to `window.localStorage` itself in the caller, passing `null` on failure. Helpers catch get/set failures and malformed flags; they never delete or clear storage.
- Pure `createWelcomeTimeline(messages, nowMs, options)`, `reduceWelcomeTimeline(state, event)` and `welcomeNextDelayMs(state)` own timing, with an injected monotonic time and no timers/global effects.

Main integrates eligibility **after successful account hydration**, stores any completed session guard, and decides what follows the intro. No App, package scripts, CI, tutorial or account persistence is modified here. This welcome is not a validation tutorial and makes no claim of enabled member review. The following tutorial must explicitly teach next-clarity congruence, exactly three activity stages (define → mandatory photo/video → three distinct member approvals; that same third stage becomes Validated), and separate image-only level9 counting toward120. All twelve Holista cards remain on their existing single circle.

## Verification

From `frontend`: `node node_modules/typescript/bin/tsc --noEmit` and `node scripts/verify-welcome.mjs`. The pure suite checks all locales, exact source copy, phase timing, hidden/manual pauses, reduced motion, language switching, late/invalid clocks, terminal completion, scoped storage, failures and byte-for-byte preservation of historical twelve-mode state/presets/drafts/images/unknown fields.

Optional `node scripts/verify-welcome.mjs --serve` serves **only an isolated in-memory fixture** at `http://127.0.0.1:5199/__welcome-fixture?language=es` (change `language` for other locales). React StrictMode is enabled; the result output counts callbacks after the intro finishes. No App/auth/backend/service worker or account storage is imported. Stop the server after smoke testing. Package/CI wiring belongs to main.

## Integration appendix: revision-aware state saves

The separately requested `stateReconcile.ts`, `stateSyncQueue.ts` and `scripts/verify-state-sync.mjs` are also isolated new files. They do not wire App or any backend routes.

### Reconciliation

`reconcileState(base, local, remote)` returns a fresh deep three-way state. Local unchanged from base takes remote; remote unchanged takes local. Plain objects recurse, including new unknown keys and own-property deletions. Conflicting arrays are **atomic local choices**, not index merges/concatenation. Conflicting scalars and deletions are explicit local intent. The rules preserve a remote level3→4 when only a local profile changed, but preserve an explicit local reassessment to2. This is not a max-level floor. `activityCompletions` is always canonical remote data, including remote absence; `validationReceipts` and `legacyCompletionSlots` are likewise remote-owned if embedded in state. Inputs are JSON-shaped, acyclic snapshots, not class instances. `cloneStateValue` and `stateValuesEqual` are exported for adapters/tests.

### Queue API and transport contract

```ts
const sync = createStateSyncQueue({
  initial: { state, revision, validationReceipts, legacyCompletionSlots },
  transport: async (state, revision, signal, keepalive) => {
    // The integration adapter alone owns HTTP/auth and payload conversion.
    // GET/merge/PUT responses: {state, revision, validationReceipts, legacyCompletionSlots}.
    // PUT body: serializeStateSave(state, revision) -> {state, expected_revision}.
    // Return a canonical snapshot for success; convert HTTP409 to:
    // return { conflict: envelope }; // The same envelope plus detail on409.
    // Throw on network/server errors. Honor signal and keepalive in fetch.
    return canonicalSnapshot;
  },
  onReconcile: (base, remote, canonicalSnapshot) => {
    // Functional setter preserves newer React edits not yet staged:
    setAppState(latest => reconcileState(base, latest, remote));
    // Receipt/legacy metadata comes ONLY from canonicalSnapshot, never local.
  },
  // Optional: exact serialization used by the transport, if not the default below.
  serializeBody: serializeStateSave,
});
sync.stage(latestFullState); // Immediately, BEFORE caller-owned debounce.
// Or stage(current => ({ ...current, profile: updatedProfile })) to retain unknowns.
const result = await sync.flush();
// Submit activity/evidence only if result.status === 'synced' && !sync.isDirty().
sync.refresh(canonicalSnapshotAfterSubmissionOrReview);
sync.dispose(); // On logout/account/org change or integration unmount.
```

`stage` neither saves nor schedules a timer; it copies the desired full snapshot synchronously. Omitting a locally owned field from a full snapshot is an intentional deletion, so an App serializer must not reconstruct a partial allowlist that drops unknown server fields. Prefer its functional updater/spread form. Use a fresh queue per hydrated identity, never a queue across accounts. Snapshots require a non-empty opaque `revision` and plain `state`; optional and unknown canonical metadata is copied from the newest server snapshot and is never accepted through `stage`. Omitted metadata in a canonical snapshot is authoritative absence, not permission to retain obsolete receipts.

`flush({ keepalive?: boolean })` is awaitable, shares active work and never overlaps transports. It drains edits staged during saves. Success rebases only changes after the **sent** payload onto its response. A409 rebases last acknowledged base/local onto the conflict snapshot and makes at most **three retries after the initial attempt**. The fourth conflict still reconciles canonical state but returns `'conflict-limit'` with dirty intent retained. Network/adapter/callback errors return `'error'`; there is no unbounded automatic retry. Call `flush` again to retry. Other statuses are `'synced'`, `'disposed'`, and `'keepalive-too-large'`; each result contains canonical `snapshot` and current `dirty` at completion. `getSnapshot()`, `getDesired()` return defensive copies; `isDirty()` reads the current flag. `onReconcile` receives defensive copies and should not throw.

`onReconcile(base, remote, snapshot)` runs for accepted saves, conflicts and refreshes. Its base is the sent payload for success and the previous acknowledged state for conflict/refresh. Use that pair in **functional React setters**, not setters closed over an old render. Account for React batching before gating a submit; stage the latest desired state immediately, await flush and recheck dirty/identity before using the acknowledged revision. The queue cannot stage React edits the integration has not supplied.

`refresh(remote)` immediately rebases dirty local state and canonical metadata. It is an authority barrier: a response from a save started before that refresh cannot overwrite/notify with older state, and a replacement save waits for the active transport to settle. A known previously acknowledged old revision is ignored. Opaque revisions cannot order two previously unseen responses: the caller must provide a **fresh canonical** read/submission/review snapshot, not an obsolete independently fetched response. No hidden assumptions about numeric revision ordering are made.

Pagehide belongs to the caller: stage desired immediately during edits, then call `void sync.flush({ keepalive: true })` on pagehide. The exact UTF-8 serialized request body (including envelope) must be **strictly less than60,000 bytes**. `serializeStateSave` defaults to `JSON.stringify({ state, expected_revision: revision })`, matching backend PUT/state; `revision` remains the response-envelope field. Supply the exact serializer if the adapter adds/renames fields. Oversized bodies remain dirty for a later ordinary save; do not truncate maps/images or send a second parallel beacon. Pagehide cannot upgrade an already active request, but subsequent queued sends use keepalive and the same size check. Keepalive remains best-effort browser delivery, never an acknowledgement guarantee or a replacement for server revision checks.

`dispose()` aborts the transport and resolves pending flushes with `'disposed'`, even if an adapter ignores abort. Late results are discarded; staging/refreshing after disposal is a no-op and no further callbacks fire. No map data or storage is cleared.

Run `node scripts/verify-state-sync.mjs` plus typecheck. Coverage includes stale advancement vs profile, explicit reassessment2, all twelve levels/presets/unknowns, deletion/atomic arrays, canonical ledgers/metadata, edits during save and newer pending React edits, flush promise-cleanup races, serialized refresh barriers, bounded409 retries, network failure/retry, UTF-8 keepalive limits and cancellation/late responses. All accounts/revisions/receipts in these tests are synthetic in-memory fixtures.

## App persistence hardening (six-race follow-up)

App now synchronously rebases `persistedDocumentRef` in `onReconcile`, independently of React batching. A layout effect stages **only deltas since the last committed UI baseline**; render no longer overwrites canonical staging. Explicit immediate definition/welcome patches still update that ref before flushing. Functional React setters remain in place, and deliberate reassessment2 is not clamped to a prior maximum.

`flushPersonalState` rechecks the active session, queue identity and live `isDirty()` after every await, draining newer intent (bounded to eight rounds) or failing before submission. Old-session continuations never set a new session's sync status. `queue.refreshFrom(reader)` is the new preferred App refresh API: it serializes canonical GETs with PUT acknowledgements, coalesces superseded reads by generation, prevents PUT overtaking a read, and aborts on disposal. Direct `refresh(snapshot)` remains available for callers already holding a fresh canonical snapshot.

`stateRecovery.ts` stores `{version, scope, base, desired, pending}` under verified organization/user-scoped recovery keys. Changes are retained before debounced I/O, after acknowledgements/rebases and before auth cleanup. Logout first attempts a bounded flush; if offline, it leaves a durable scoped pending record. If both saving and durable backup fail, logout is blocked with retry/stay controls rather than losing intent. Recovery merges the saved base/desired delta onto a **fresh server snapshot after /auth/me verification**, so accountA never supplies accountB's state. No token is stored in these records.

All per-field compatibility cache writes are now account-scoped (or explicitly guest-scoped); original unscoped legacy keys are not overwritten or removed. An immutable legacy archive is captured separately. Legacy import is **never automatic**: the localized account boundary identifies the verified account and requires an ownership checkbox plus an explicit Import action. Cloud-only is equally available. The decision receipt is identity-scoped; the original archive remains unchanged after either choice. Import payloads omit `activityCompletions`, receipts, legacy slots and approvals; old marks remain local unverified history, not new completion credit. The backend independently owns review/completion enforcement.

`StateAccountBoundary` makes the underlying App inert during account hydration, consent, errors/retries and logout, with contained focus and restored scroll/focus on exit. It does not rearrange or remove any of the twelve Holista cards. The boundary and recovery messages cover all eleven languages. Verified-identity owner checks, tour/editor behavior and public/network audience integration remain separate.

Checks: `node scripts/verify-app-state.mjs`, existing queue/welcome/badge checks and typecheck. Optional `node scripts/verify-app-state.mjs --serve` exposes an isolated **actual App** fixture on port5204 with synthetic fetch only. Query options include `delay`, `putDelay`, `error=yes`, `offline=yes` (PUT failures), `recovery=yes`, `legacy=yes`, `account=fixture-name`, and `language`. It seeds only its isolated fixture origin and refuses unrecognized requests; it never connects to a product API/account. Stop the server after QA. Main retains App/package/CI ownership and the public-card/audience additions.

### Independent persistence audit

The fixture's visible “Isolated persistence fixture” disclosure provides disconnect/reconnect/canonical-advance controls plus a DOM trace of synthetic server state, request order, scoped pending records and consent/archive. It mocks login for `a@example.invalid` and `b@example.invalid` (any synthetic password), creating separate `fixture-A`/`fixture-B` identities and server documents. Disconnect causes actual synthetic network failures, including logout. Reconnect emits the normal online event. No real credentials, accounts or backend are used. Draft/merge behavior here is a test double, not proof of backend authorization; real HTTP/transaction tests remain a separate release gate.

Verified in the actual App: editA offline → sign out → canonical server advance3→4 → reconnect → sign inB/cloud-only → sign out → sign inA. A's edit stayed pending only underA, B never received it, A recovered it alongside the newer server level/receipt with all12 levels/presets/unknowns, and the acknowledged recovery record became clean. Explicit legacy import required the ownership checkbox, sent no credit fields, kept the original old marks in the archive, preserved imported drafts/presets and gained no canonical completion/receipt. Shift-Tab from the boundary root selects the last enabled control, and exit restores scroll/background interaction.

Pure regressions additionally execute actual App functional reconciliation/flush/logout helpers, test failure of both storage and network, mismatched scope, deletion/reassessment and non-replay after acknowledgement. Queue tests cover failed PUT before GET, failed GET releasing a waiting dirty flush, newer edits during the read, queued-read disposal and late obsolete responses, alongside serialized acknowledgements/conflicts.

Two audit fixes remain helper-only: scoped cache deletions write a non-destructive marker so guest reads cannot resurrect the immutable legacy fallback; the account boundary handles initial reverse-Tab and empty control lists correctly. No App or backend change was made for these fixes. Original legacy storage is retained; normal guest/account writes clear only their own deletion marker.

Audit commands (from `frontend`, all passed):

```text
node scripts/verify-app-state.mjs
node scripts/verify-state-sync.mjs
node scripts/verify-welcome.mjs
node scripts/verify-guided-tour.mjs
node scripts/verify-activity-flow.mjs
node scripts/verify-community-panel.mjs
node scripts/verify-card-audience.mjs
node scripts/verify-badges.mjs
node scripts/verify-life-map.mjs
node scripts/verify-life-configurations.mjs
node node_modules/typescript/bin/tsc --noEmit
```

`node scripts/verify-app-state.mjs --serve` was also run for the synthetic browser checks above; its temporary tab and server were closed afterward. No backend tests, product accounts, Git operations or migrations were run by this independent audit. PostgreSQL/real API fixture QA remains with main/backend agents and CI, not inferred from the synthetic frontend fixture.
