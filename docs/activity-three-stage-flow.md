# Reusable activity flow: host integration contract

This slice is **UI only**. It does not enable the published community feature, import an API client, save an account, fabricate approvals, or change levels. App/backend integration belongs to main. Existing `JourneyActivityCard` callers work unchanged; opt in with its optional `flow` prop. Level9 never renders this flow and remains the separate image-only vision counting toward120. No home-map layout or stored account data is changed.

## Components and actions

`ActivityJourneyFlow` accepts `sourceLevel` (0–8), `language`, `state`, optional `activityKey`, `targetSnapshot`, `disabled`, and callbacks. `JourneyActivityCard.flow` accepts the same props except `sourceLevel` and `language`, which come from the card. Supply a stable `activityKey` for the mode/activity scope so switching activities cancels in-flight work and isolates local drafts. Persist drafts through `onDraftChange`; the component itself has no persistence. Do not remount merely on each poll/count update.

All action callbacks are injected. No callback has a default network implementation:

- `onDefine(definition, signal): Promise<void>` receives `{activity, target_alignment}`. Both are trimmed. New/editor activities require20–12000 Unicode code points and target alignment20–3000. Existing server activities use the server presentation bound1–12000, not the new editor minimum: short/long existing activities retain their authoritative review/approved state and are not rewritten. Save the activity through the host state queue and supersede old reviews. Editing does not silently carry approval status to the replacement. Resolving this callback alone does not change the displayed stage; update `state` from the confirmed host state.
- `onDraftChange(draft): void` receives `{reflection, link?, visual?}`. `visual` is `{kind:'photo', image}` or `{kind:'video', video_asset_id}`. Preserve drafts in host state when navigating; do not overwrite them with unrelated polls.
- `onUploadVideo(file, signal): Promise<{id,mime_type,byte_size,sha256}>` must resolve only after a successful private immutable upload. **Flush the host state-save queue before uploading or submitting**, ensuring the exact activity is saved. Parent owns raw binary `POST /community/media/video`, Bearer header, MP4/WebM Content-Type and authentication. No video asset is emitted before this promise resolves and its metadata matches the file.20MiB is inclusive. Unavailable/failed/cancelled/superseded uploads preserve the previous attachment; a late response cannot win a newer selection. A cancellation after a server accepted bytes may leave an unreferenced asset; host/server owns its retention policy.
- `onSubmit(draft, signal): Promise<void>` receives `{activity,target_alignment,evidence,audience,public_confirmed}`. This is **not** the exact POST DTO: compare the exact saved activity, flush the state queue, obtain/verify its SHA256, then construct `{mode,level,language,expected_activity_hash,evidence,target_alignment,audience,public_confirmed}`. Reject stale definitions and keep the draft on failure. Resolve only after confirmed submission; refetch/update authoritative `state`. The component never increments votes, invents reviewers, records completion or advances a mode.
- Optional `onLoadVideo(assetId, signal): Promise<Blob>` performs authenticated `GET /community/media/{id}` with Bearer header and returns the binary blob. Never put tokens in URLs, return a public upload/playback URL, or bypass authorized access. Playback is explicit, native, controls-enabled, no autoplay and `preload="none"`. Preview blob URLs are local-only and revoked on replacement/unmount.

Descriptions/reflections use Unicode code-point lengths, matching the server rather than UTF-16 textarea lengths. The evidence converter trims reflection (20–6000) and optional HTTPS reference (without embedded credentials). It explicitly allowlists exactly one `image` OR `video_asset_id`. Text/links alone cannot submit or enter the review presentation. Image inputs are browser-decoded onto one still canvas, aspect-preserving within1600px per side, progressively reduced until the PNG dataURL is at most400000 characters. Output IHDR is checked for8-bit RGB/RGBA/non-interlaced; server still owns full CRC/pixel validation. No raw SVG/HTML evidence is submitted.

## Authoritative state mapping

The discriminated `ActivityJourneyState` union and helpers are exported from `ActivityJourneyFlow.tsx`. `definition` means `{activity,target_alignment}`; `evidence` is the private draft shape above.

| Host state | Component state | Presentation |
| --- | --- | --- |
| No definition | `empty` | Stage1: define toward the exact NEXT clarity description |
| Saved definition | `defined` | Stage2: mandatory photo/video |
| Unsaved visual/context | `evidenceDraft` | Stage2: explicit new submission |
| DTO `pending` | `pending` with `definition,evidence,submission` | Stage3:0/3 through3/3;3/3 alone is not validation |
| DTO `changes_requested` | `changesRequested` with `definition,evidence?,submission,feedback` | Returns to stage2 with actionable feedback; old approvals do not transfer |
| DTO `approved` | `approved` with `definition,evidence,submission` | The SAME third stage becomes “Validated”; exactly3 approvals |
| DTO `stale/superseded/withdrawn` | Fresh `defined/evidenceDraft` for the current saved definition | Fresh explicit submission, never show obsolete approvals as current |
| Preserved historical confirmation | `legacyHistorical` with `definition,evidence?` | Explicitly self-reported, not peer-reviewed; does not erase saved progress |

Map `submission` to `{id: dto.id, revision: String(dto.revision_number), approvalCount: dto.review_count}` after validating that the server count is an integer0–3 and quorum is3. `approved` requires literal count3 and the authenticated server's approved status, not a fabricated frontend status. No separate receipt field is required by this UI. Build changes-requested feedback from the actual `reviews` entries. Map `dto.evidence.image` to photo, or `dto.evidence.video_asset_id` to video, keeping `reflection` and `link` alongside `visual`. Do not expose reviewer identity here merely to compute a local quorum; distinctness/eligibility belongs to the service.

Pass `targetSnapshot: {...dto.rubric_snapshot.target, version:dto.rubric_snapshot.version}` when presenting an existing submission. Before submitting a new revision use the current canonical target. Without a supplied snapshot, the versioned local clarity mirror provides guidance. The activity's saved `target_alignment` is displayed explicitly during evidence and review. A mismatched target level disables actions. The host must bind mode, source/target, exact activity SHA256, effort/rubric and evidence revision on the server; UI checks are not security enforcement.

The component relies on a confirmed new `state` prop after actions. It will not interpret a resolved callback, a reaction, a local count, or “I finished” as approval/advancement. Host should refresh authoritative progression and preserve historical account data rather than applying local level increments.

## Privacy and compatibility

`CardAudience = 'network' | 'public'` is exported from `visualEvidence.ts` and re-exported from `ActivityJourneyFlow.tsx`. Missing/unknown values default to Network. Draft uploads remain owner-only until explicitly published; a published card's name, activity, photo/video and reflection follow its selected audience. Public allows unauthenticated viewing and copying. Restricting or unsharing later cannot retrieve copies. Three approvals still require distinct authenticated accepted-network members; public views/reactions grant no review permission.

Flow audience props: `audience?` initializes/controls the draft choice; `onAudienceChange?(audience)` is **selection only**, never a write. Supply `publishedAudience?` from the authoritative DTO separately when controlling draft selection. `sharedCardId?: string|null` explicitly distinguishes a shared card from an unshared submission. `onSetAudience?(audience,publicConfirmed,signal):Promise<void>` and `onUnshare?(signal):Promise<void>` resolve only after actual server success. The current label changes only from authoritative props or a successful save callback, never a radio selection. Public requires a separate unchecked-by-default checkbox naming evidence and copying risk. Consent resets on audience/content changes. Editing audience never adds a fourth stage or removes earned validation. Tour target: `.activity-flow-audience`.

`CommunityPanel.shareCandidates` can include `submission_id` to attach the exact saved evidence revision. Its explicit share action sends audience/confirmation after `onBeforeShare(signal)`. Owned feed cards use the supplied `client.setAudience`, refetch after every action, and provide explicit unshare. `client.card` fetches chosen-audience detail only when opened; `client.loadCardVideo` fetches an authorized blob only on explicit playback, with abort/revoke cleanup. A public-copy-link button exists only for a server-confirmed Public card with a valid UUID and uses `${location.origin}/?community-card=${id}`. Network-only, legacy missing-audience, failed saves and mere Public selections never produce public links. The separate unauthenticated public-card component belongs to main.

Optional `CommunityPanel.onViewCard(id):void` delegates the localized "View card and evidence" action to the host for either audience, without an additional panel detail fetch. When absent, the authorized inline detail remains available. Notifications map the actual `reuse_requested`, `reuse_declined`, `local_idea_requested`, and `local_idea_offered` keys to localized human labels; unknown kinds use a generic localized label, never a raw enum.

The five reactions remain leaf/soil/water/sun/roots. The four external exports remain LinkedIn/WhatsApp/Instagram/Facebook and receive an explicit activity-only allowlist. Never pass evidence images, video asset IDs, reflection, feedback, access tokens or proof URLs into public activity text or export fields. The flow has exactly three stage labels in all eleven languages, RTL support, keyboard labels/focus, native file controls,44px action targets and reduced-motion rules. It adds no tutorial-wide counter.

## Verification

Run from `frontend`:

- `node scripts/verify-activity-flow.mjs`: unit/state/render tests, eleven languages, stage counts, old-card compatibility, mandatory evidence, payload allowlisting, upload acknowledgement/cancellation, proportional PNG rescaling and resource cleanup. Uses in-memory compilation and synthetic browser API doubles only.
- `node scripts/verify-activity-flow.mjs --serve`: same tests plus an isolated Vite fixture at `http://127.0.0.1:4178/activity-flow-fixture`. Does not import App, talk to an API, save account data or manufacture real approvals. Browser fixture automatically tests real canvas PNG output, upload failure/cancellation/selection races, explicit playback, missing-visual gating, three-stage success and feedback return. Its status/count controls are clearly labelled synthetic server fixtures, not product vote actions.
- `node node_modules/typescript/bin/tsc --noEmit`
- `node scripts/verify-journey-social.mjs`
- `node scripts/verify-clarity.mjs`

Browser verification covers320px,870px and desktop, including RTL. Real authenticated uploads, distinct-member transaction/quorum tests and conditional once-only advancement remain backend/integration checks, not claims made by this isolated fixture.
