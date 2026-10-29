# Guided tour engine and App integration

Implemented locally, release verification pending: an isolated React engine, scoped stylesheet,26 topics in all11 supported languages and30 actual App stops (the control center has separate metric stops). App maps these stops to live sections, preserves navigation and unsaved custom/AI editor context, and exposes unlimited replay through MC. The engine itself performs no account writes, uploads, saves, migrations, paid AI calls or fabricated progress. Community transactions belong to the authenticated service, never to tutorial completion.

## Controlled API

Import `GuidedTour` from `frontend/src/GuidedTour.tsx`, types/helpers from `guidedTourCore.ts`, and `guidedTourStepCopy` / `getGuidedTourCopy` from `guidedTourMessages.ts`. The helper stem differs to avoid case-insensitive TypeScript resolution on Windows. The component imports its own isolated stylesheet.

```tsx
// Illustrative NEW markers: main must map these to actual live components.
const step: GuidedTourStep = {
  id: 'methods',
  ...guidedTourStepCopy(language, 'methods'),
  targets: [
    { selector: '[data-tour="method-custom"]', method: 'custom' },
    { selector: '[data-tour="method-bank"]', method: 'bank' },
    { selector: '[data-tour="method-ai"]', method: 'ai' },
    { selector: '[data-tour="method-contacts"]', method: 'localContacts' },
  ],
  onEnter: ({ signal }) => navigateToMethodsWithoutWriting(signal),
  methodChecklist: true,
};

<GuidedTour
  step={tourOpen ? step : null}
  language={language}
  visitedMethods={confirmedMountedMethodViews}
  onTargetInteraction={({ stepId, method, element, event }) => {
    // Notification only. The original event still reaches the real live button.
    // Confirm the visit AFTER its actual view mounts, not merely on this click.
  }}
  onNext={nextControlledStep}
  onPrevious={previousControlledStep}
  onClose={closeAndRestoreAppNavigation}
  canGoBack={hasPreviousStep}
  isLastStep={isLastStep}
  showCounter={hydratedAuthenticatedOwner}
  counter={{ current: ownerStepNumber, total: ownerStepTotal }}
/>
```

`step` is `GuidedTourStep | null`. Its required fields are `id`, `title`, `body`, and **either** `target` **or** `targets`. Target entries are CSS selector strings or `{ selector, minMatches?, method? }`. Every selector must resolve; a selector highlights **all** matching live elements, not just the first. For the circle, use a narrowly scoped selector with `minMatches: 12`. No card, label, DOM node or layout is cloned, moved or rewritten.

Optional step fields:

- `instructions`: localized supplementary text.
- `onEnter({ stepId, signal })`: synchronous/async **navigation only**. Abort stale work using the signal. It runs once per step activation or Retry, not on every render or when the portal host changes. Keep it idempotent for React Strict Mode. Do not save, upload, generate AI, send invitations/reviews or apply a configuration here.
- `clarityTarget: { level, description }`: the **exact next description** from `clarityTransition` / the server-owned rubric. The engine displays it verbatim under a localized heading; it does not invent or infer the target. Map the next-clarity topic only once the true source/next context is available. Levels 0–8 only; level 9 is separate.
- `methodChecklist`: shows four non-actionable status items and gates Next on all four supplied visits. Apply this gate to the methods overview/return step, not each method's individual explanatory step. Main manages real method navigation and returns; the engine never automatically changes `step`, marks a visit, or decides an approval happened.
- `nextDisabled` / `nextDisabledReason`: additional host-controlled gate and localized explanation. Closing/back remain available during loading, gating and missing-target states.

Optional component props:

- `visitedMethods: readonly ('custom' | 'bank' | 'ai' | 'localContacts')[]`. Duplicates never satisfy the four-method requirement. Viewing each method is enough; no transactions or paid calls required.
- `onTargetInteraction({ stepId, selector, element, method?, event })`: trusted click/change on a real highlighted node/descendant. Keyboard button activation produces a real click. No `preventDefault` or propagation cancellation is applied to target interactions. This fires before the target's own handler, so it is **not** proof navigation succeeded.
- `onTargetUnavailable({ stepId, reason })`: once per attempt. Reasons: `missing`, `invalid-selector`, `unsafe-target`, `navigation-error`, `no-room`. Never treat this as completion. A delayed valid target can recover; Retry reruns entry navigation.
- `targetWaitMs`: default 3500, clamped to 250–10000 ms, including async navigation. Missing/unmounted/hidden targets fail closed with no holes, Retry, Back and Close. Invalid selectors, page roots, full-viewport holes and layouts with no safe panel space never silently illuminate the page. Target a useful bounded section/control instead of the whole page.
- `portalRoot`: optional connected DOM host. Automatic hosting uses the active native modal or body. An override outside the active modal is safely replaced by that modal, avoiding inert close controls. A manual native popover raises the overlay to the top layer **without** making the highlighted UI inert; unsupported browsers use a fixed-position fallback. Existing modal focus traps should honor a portal descendant or use `portalRoot` within their allowed content. Same-document host expected.
- `showCounter`: defaults off. **Main must verify hydrated, authenticated owner authority**; never infer it from an editable name/email. `counter` is only displayed when this boolean is true and the positive integer range is valid. The four-method checklist is permitted for everyone. Engine has no hidden global counter or tutorial persistence.
- `direction`: optional LTR/RTL override; Arabic automatically uses RTL. `returnFocusTo`: optional stable element for focus restoration on close/unmount. Otherwise the element focused when the tour opened is restored if still connected. Main owns navigation/route/draft restoration after closing/replay.

## Interaction and placement

The surroundings are opaque dark, with holes only for live target bounds. Overlapping holes use a geometric union. Overflow ancestors and viewport bounds clip highlights. A panel is placed in unhighlighted space and its copy scrolls independently; it never covers a highlighted click target. No safe placement means a dark fallback with an explanation, not an overlapping panel.

Measurements follow scroll, resize, mobile `visualViewport` offsets/size and every visible animation frame (including transforms, target replacement and unmount). Continuous measurement pauses while the document is hidden. All observers/listeners/frames are cleaned up. There is no data/persistence layer.

The non-modal accessible dialog allows focus in actual highlighted sections/buttons plus its own controls. Tab stays within those surfaces, not unrelated dark content. Left/right navigate from the tour rail (mirrored in RTL); native keyboard behavior is preserved within live targets, including text fields/sliders/tablists. Escape requests tour close and does not dismiss an underlying native dialog. Controls have localized accessible names, at least 44px touch targets, and reduced-motion support.

Main should target safe method-opening buttons, not AI generation/upload/booking/send controls. Do not expose a real transaction as a tour completion requirement. On leaving a highlighted view, main should update the controlled step/targets to the next mounted real surface (or provide a separate return-to-methods step); the engine intentionally darkens when stale targets unmount.

## Topic-to-real-target checklist for main

`TOUR_STAGE_IDS` in the message module defines the stable topics. The App's target map implements the following surfaces; the table describes their responsibilities, not a second layout. Narrow selectors are important: the sharing target uses the real preview's direct header descendant so it cannot accidentally match the tutorial's own heading after the portal enters that native dialog.

| Topic IDs | Suggested real surface |
| --- | --- |
| `modes` | All 12 real Holista mode buttons on their ONE existing circle; `minMatches: 12` |
| `modeDescription`, `selfAssessment` | Selected mode description and current 0–9 assessment controls; never reset established state |
| `activityDesign`, `nextClarity` | Current activity designer and exact next-rubric description |
| `methods` | Four method-opening buttons, with metadata and controlled four-visit checklist |
| `custom`, `bank`, `ai`, `localContacts` | Actual method view heading/exploration surface; bank has 10 choices; AI has no mandatory generation; contacts are real accepted source+1 contacts, or honest zero/unavailable |
| `effort` | Source-level effort requirement: 0–2 time, 3–5 time+energy, 6–8 time+energy+investment within means |
| `activityCard` | Real activity card with **exactly 3** stages: define → mandatory photo/video → wait for 3 distinct approvals |
| `evidence` | Visual-proof requirement/instructions, not file input activation; text/links only supplement |
| `audience` | Per-card network/public choice, explicit public confirmation, owner-only draft uploads and the limits of revoking copies; viewing never grants review authority |
| `reviews` | Actual capability-gated independent member review view; exact next description also shown during review |
| `vision` | Separate image-only level-9 final vision, counted automatically toward 120; no activity, video or quorum |
| `reactions`, `sharing` | Real reaction controls; sharing chooser for LinkedIn/WhatsApp/Instagram/Facebook; private internal network sharing/reuse permissions when actually enabled |
| `globalIdeas`, `specialists` | Actual browsing surfaces, with demo labels and honest booking/service limits |
| `community`, `profile` | Real capability-gated member directory/connect/profile; public allowlist only; no fabricated invites |
| `badges` | Actual gallery/profile slots: up to 3 badges, Completionist 108+12=120, Maxed Cultiva 99 while all 12 modes remain 9 |
| `configurations` | Configuration chooser heading or safe preview, not an apply/load/delete action |
| `controlCenter` | Strongest, least cultivated, focus and trivia surfaces (multiple selectors supported) |
| `replay` | Real MC replay control; unlimited replay preserving all existing state |

Community copy is deliberately conditional while real network/review UI is pending. The third independent authenticated network approval validates the existing third card stage, not a fourth stage. Completion advances exactly one level only when the source is still current and not already advanced; older approvals do not jump/regress/replay. Feedback returns to evidence; altered revisions require fresh review. Reactions are not approvals. **Only the real backend may grant completion/advancement.** Historical confirmations are not retroactively labeled peer-reviewed.

## Verification

Dependency-free-with-respect-to-new-packages unit/contract run (uses existing TypeScript loader):

```powershell
node frontend/scripts/verify-guided-tour.mjs
node frontend/node_modules/typescript/bin/tsc --noEmit -p frontend/tsconfig.json
```

Optional real Chromium browser run, if Playwright and Chrome are available (no install or package changes):

```powershell
node frontend/scripts/verify-guided-tour.mjs --browser --playwright=C:/path/to/playwright/index.mjs
```

Browser tests use an in-memory React fixture on loopback with its own temporary dependency cache, not App, real accounts, network APIs or a database. They cover real target clicks/keys, background blocking, focus, four visits, owner opt-in, RTL, reduced motion, twelve circle targets at 320/768/1440, delayed/error/missing/unsafe targets and retry, native dialog top-layer behavior, scrolling/unmount, and preservation of synthetic saved levels/drafts/images/presets. Simulated `visualViewport` keyboard/pinch offsets verify coordinates; hardware mobile/assistive-technology and main's eventual real-target integration still need review.

### Local execution record

- Read `AGENTS.md` and the three requested planning/architecture docs; searched nested `AGENTS.md` files: only the root instruction file exists.
- Read-only discovery: `git status --short`, `rg --files` / targeted `rg -n`, `Get-Content` for frontend package/config/components/copy/verification helpers, `Get-ChildItem` and `Test-Path`: existing concurrent backend/doc work preserved. An attempted read of `frontend/src/i18n.ts` found no such file; actual languages were confirmed from App and existing message modules instead.
- Runtime discovery: `Get-Command node,npm` found Node 24.19.0; npm is not on PATH. Node was used directly. Bundled Playwright and installed Chrome were found read-only; optional missing runtime paths in discovery did not block verification.
- Full frontend TypeScript check: passed before and after adding the component.
- Initial browser verification: six unit/contract groups and first browser checks passed; responsive fixture timed out because the synthetic circle did not reflow on resize. Fixed **only the test fixture**, then reran successfully.
- Final verifier: six unit/contract groups and eight real Chrome browser groups passed, including simulated mobile viewport offsets and target-unmount grace. Full frontend typecheck passed. `git diff --check` passed (Git reported only CRLF-conversion warnings in concurrent agents' existing files). Read-only final `git status --short` confirmed this slice adds only the six files listed below; other concurrent changes were left intact. No secrets, credentials, tokens or production identifiers were added.

Changed files for this slice: `frontend/src/GuidedTour.tsx`, `frontend/src/guidedTourCore.ts`, `frontend/src/guidedTourMessages.ts`, `frontend/src/guided-tour.css`, `frontend/scripts/verify-guided-tour.mjs`, `docs/guided-tour.md`.

No branch change, staging, commit, push, merge, PR, migration or real account mutation was performed. Main owns review and integration.
