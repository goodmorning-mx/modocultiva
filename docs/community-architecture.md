# Community validation: foundation and remaining integration

Status: schema and input-rule foundation, **not an enabled community/review workflow yet**. See `onboarding-community-plan.md` and `clarity-and-validation.md` for the complete user goal and confirmed criteria. `GET /community/capabilities` reports storage readiness separately from feature enablement; it never returns member data, connection details or credentials.

## Development-only authority and preservation

On2026-10-29 the user explicitly authorized an additive migration for development only. No production migration/release is authorized. Migration202610290001 refuses non-development APP_ENV values and refuses destructive downgrade. The observed development API reports APP_ENV `local`; this is recorded, not changed. The existing deployment contract says PostgreSQL16; CI verifies the actual DDL against an ephemeral PostgreSQL16 service.

The migration's DDL is frozen, not regenerated from future runtime models when upgrading an older database. It creates only thirteen new community/progress tables and indexes. It snapshots historical activity definitions/confirmations into a new progress-control row with an opaque revision. It does **not** alter existing user JSON, timestamps, twelve level assessments, presets, selected preset, images, language, reactions, profile or history. Historical self-reported confirmations must never be relabeled as independent member validations.

The CI migration check refuses a default, remote, non-test or non-empty target; it uses an explicitly named local synthetic database, upgrades the prior schema, seeds a full twelve-mode existing account, upgrades the new revision, compares all data/timestamps and repeats startup. It never drops/resets data or connects to the product database. Local Docker is unavailable; CI is the PostgreSQL execution check.

## Storage boundaries

| Tables | Responsibility |
| --- | --- |
| progress_controls | Opaque state revision and preserved unverified historical confirmations. |
| community_profiles | Explicit discoverability, public display name and short bio; no email/password exposure. |
| connections | One unordered pair per organization, invitation/acceptance/disconnect lifecycle. |
| evidence_submissions | Immutable activity/SHA256/source/target/rubric/evidence revision;0–8 only. |
| evidence_reviews | One authenticated reviewer per revision, no self-review, same organization, three deliberate criteria. |
| validation_receipts | Server-created record of quorum and whether this approval advanced the mode. |
| level_advances | One source-level advancement claim per author/mode; prevents replay after reassessment. |
| community_notifications | Recipient-scoped actual events, no copied private evidence. |
| shared_cards / shared_reactions | Explicit network sharing of activity text, separate from private evidence and review. |
| card_reuse_requests | Ask/accept/decline permission; acceptance must not overwrite the requester's draft automatically. |
| local_idea_requests / local_idea_offers | Next-level connected-member ideas using their saved activity for the requester's level. |

Composite foreign keys scope authors, reviewers, recipients and resources to the same organization. Database constraints add defense against duplicate votes, self-review, invented source/target relationships, incomplete approval criteria and replayed advancement claims. These constraints **do not replace** authenticated connection/eligibility/quorum/transaction checks in the service layer.

## Input rules already implemented

- Submission input accepts mode, source level0–8, supported language, expected activity SHA256, evidence and an explanation of its congruence with next-level clarity. It cannot provide author/reviewer identities, approval status, a quorum or a forged target description. The server-owned rubric supplies the target.
- A review must deliberately assess all three: evidence matches the activity; effort matches the requirement; the activity/result is congruent with the next clarity level. Approve requires all three true; changes requested needs actionable feedback. Strict booleans reject strings or numeric substitutes.
- Evidence includes a written account, optional explicit HTTPS link without credentials and optional normalized still PNG. Links are never fetched by the server. Images are size/dimension/chunk/CRC/pixel-length bounded, non-animated RGB/RGBA PNG. The future browser upload control must decode any browser-supported input onto a still canvas and scale to fit the encoded cap; do not accept SVG/HTML as evidence payloads. Keep links explicit and private evidence out of external exports/feed.
- SHA256 binds security-sensitive content; the existing16-hex code-point completion token is retained only for client ledger compatibility. Editing an activity/evidence revision must invalidate old approvals for the replacement, not erase the immutable history.

## Next implementation slice: state and transaction service (not present yet)

1. **Integrate protected persistence before exposing review mutations.** Current legacy `/state` still accepts whole client snapshots. The new server must ignore client-provided receipts/approvals/completion fabrication, preserve captured history and reconstruct valid confirmations from immutable receipts bound to exact drafts. Add opaque revision checking and a client three-way merge/serialized save path so a stale autosave cannot undo a new server advancement or erase concurrent edits. Preserve explicit self-assessment changes; do not force a permanent max-level floor.
2. Lock the author's state/progress control **before** locking the submission in all mutation paths, including generic saves, to avoid inverted-lock deadlocks. Bind submission to the exact saved activity/hash/rubric/source/target. Check a currently accepted connection, active identities and organization for every read/review. No self-review, duplicate reviewer, old revision or client count can contribute to quorum.
3. At **three** independent approvals, record completion once. Advance exactly one level only if the source is still current and the activity still matches, and atomically claim that source-level advance. Older-level approvals complete without jumping or regressing. Repeated requests/approvals/reassessment must not advance again. One changes-requested review requires a replacement revision; old votes do not transfer. Reject or supersede stale submissions after draft changes.
4. Disconnect/opt-out revokes future private access; it must not silently erase the fact that a past approval was valid. Count eligibility consistently at the moment of quorum. Real likes are separate from review approvals.
5. Directory membership is opt-in and shows an allowlisted public profile, not private saved maps/drafts or email. Static Global Ideas/Specialist profiles are demonstrations, not authenticated members: label them accordingly and never pretend to send a connection, notification or booking. Real directory/feed profiles may offer actual Connect actions.
6. Local ideas notify only real accepted connections currently at source+1 and offer their saved source-level activity. If none qualify, report zero rather than a fabricated sent request. Feed sharing is explicit activity-only; reuse needs permission and an explicit recipient import, without automatic draft overwrite or completion.
7. End-to-end tests must use synthetic authenticated members and real server transactions (including concurrent votes on PostgreSQL), not front-end counters. Cover cross-org/self/duplicate/stale/mismatched/changed evidence, rejection/resubmission, exactly-three completion, conditional one-time advance, private visibility, existing data and stale-save reconciliation.

## Subsequent welcome/tutorial integration

First-visit introduction uses the exact seven Spanish source phrases and equivalents in the other ten supported languages. It automatically starts/advances with no manual forward/skip; a pause control and reduced-motion behavior may aid accessibility without advancing. Pause timers while the page is hidden. Distinguish new visitors from established saved accounts; never reset anyone to0.

Afterward, spotlight guidance overlays the actual interface: dark outside the highlighted target, no rearrangement of the Holista circle. Use discreet accessible arrow controls/keyboard navigation and unlimited replay from MC. Preserve/restore navigation and drafts on replay/exit. Four method visits are required, **not** saves, AI spending, friend requests or real approvals. Provide an honest explanatory state for guests rather than fabricated contacts/reviews. Overall tutorial counts are owner-only, requiring authenticated successful account hydration; never infer the CEO from a typed profile name/email. The four-method checklist is allowed for everyone.

Guide arbitrary choice among12 modes, description/initial assessment, activity design with the exact next clarity target, four methods and effort, evidence/three-member review/automatic advancement, image-only9, reactions/internal/external sharing, real network/profiles, configurations, Global Ideas, specialists (honest demo/booking limits), badges (up to3, Completionist120/Maxed99), and control-center summaries/trivia. Remove the redundant Cada paso cuenta tracker, not the120 completion target.
