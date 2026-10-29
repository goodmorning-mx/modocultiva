# Community validation: locally implemented architecture

Status as of 2026-10-29: the current checkout contains the integrated frontend, authenticated state/community services, photo/video review, audience selection and public-card reader. These are **local implementations, not a publicly released feature**. Backend hardening and integrated verification are still in progress; successful CI, review/merge to `dev`, authorized development migration and development-site checks remain release gates. Nothing in this document asserts that an existing deployment has these changes. See `onboarding-community-plan.md` for the product walkthrough and `clarity-and-validation.md` for the versioned rubric.

The latest user clarification is implemented locally: the author chooses **network or general public for every card, including its attached visual evidence**, not only its text. Draft evidence stays owner-only until publication. Existing cards default to network; selecting Public is not itself a write, and publication requires explicit confirmation. Public readers use separate allowlisted card/video paths; viewing never grants review rights. Changing audience or hiding a card revokes future authorized reads, not copies already obtained. No development task authorizes publishing a real person's content.

`GET /community/capabilities` exposes no member records or connection secrets. The integrated service reports `features_enabled` only when complete storage readiness succeeds, including the audience/proof-link columns introduced by migration003. This local code contract is not proof that a deployment or release check has passed; the deployed response must be checked separately.

## Development-only authority and preservation

On 2026-10-29 the user authorized additive migrations for **development only**. No production migration/release is authorized. The existing deployment contract is PostgreSQL16; CI is configured to verify frozen DDL and concurrent transactions on an ephemeral PostgreSQL16 service. This audit applied no migrations and makes no claim about a deployed database's revision.

The migration chain is additive and frozen, not regenerated from future runtime models:

- `202610290001`: thirteen community/progress tables and indexes; captures pre-cutover saved activity definitions/confirmations in a server-owned progress-control baseline with an opaque revision.
- `202610290002`: owner-scoped immutable video upload storage (MP4/WebM, maximum20MiB). The storage table being private does not override a later explicit card-publication decision.
- `202610290003`: card `audience` and linked `submission_id`, constraints and indexes. Existing cards become `network` with no newly linked proof; no automatic public backfill.

All three reject non-development environments and refuse routine destructive downgrade. They do **not** reset/rewrite existing user JSON, timestamps, twelve assessments, presets, selected preset, images, language, reactions, profile or history. Historical self-reports are never relabeled as independent peer validation.

The migration verifier refuses a default, remote, non-test or non-empty target. It uses an explicitly named synthetic database, upgrades older schemas, seeds a full twelve-mode account and a pre003 card, compares data/timestamps after upgrade and repeats startup. It also exercises concurrent quorum/stale-save/security transactions. It never resets an existing database or connects to product accounts. PostgreSQL execution in CI and the authorized development check remain required; local SQLite/synthetic-browser results are not substitutes.

## Storage boundaries

| Tables | Responsibility |
| --- | --- |
| progress_controls | Opaque state revision, server-captured historical baseline and separately archived unverified device claims. |
| community_profiles | Explicit discoverability, public display name and short bio; no email/password exposure. |
| connections | One unordered pair per organization, invitation/acceptance/disconnect lifecycle. |
| evidence_submissions | Immutable activity/SHA256/source/target/rubric/evidence revision;0–8 only. |
| evidence_reviews | One authenticated reviewer per revision, no self-review, same organization, three deliberate criteria. |
| validation_receipts | Server-created record of quorum and whether this approval advanced the mode. |
| level_advances | One source-level advancement claim per author/mode; prevents replay after reassessment. |
| community_notifications | Recipient-scoped actual events, no copied private evidence. |
| private_evidence_media | Immutable author/organization-scoped uploaded video; draft assets are owner-only, published proof is read through its authorized card. |
| shared_cards / shared_reactions | Explicit network/public card publication, optional exact evidence-revision link, real reactions separate from review. |
| card_reuse_requests | Ask/accept/decline permission; acceptance must not overwrite the requester's draft automatically. |
| local_idea_requests / local_idea_offers | Next-level connected-member ideas using their saved activity for the requester's level. |

Composite foreign keys scope authors, reviewers, recipients and resources to the same organization. Database constraints add defense against duplicate votes, self-review, invented source/target relationships, incomplete approval criteria and replayed advancement claims. These constraints **do not replace** authenticated connection/eligibility/quorum/transaction checks in the service layer.

## Implemented evidence and transaction rules

- Submission input accepts mode, source level0–8, supported language, expected activity SHA256, evidence and an explanation of its congruence with next-level clarity. It cannot provide author/reviewer identities, approval status, a quorum or a forged target description. The server-owned rubric supplies the target.
- A review must deliberately assess all three: evidence matches the activity; effort matches the requirement; the activity/result is congruent with the next clarity level. Approve requires all three true; changes requested needs actionable feedback. Strict booleans reject strings or numeric substitutes.
- **A photo or uploaded video is mandatory**, not text-only or link-only evidence. Written reflection and an explicit HTTPS link only add context. Photos are decoded/scaled by the browser to a bounded still PNG, with server size/dimension/chunk/CRC/pixel-length validation; no SVG/HTML evidence. Videos use authenticated immutable upload with author/organization/asset, format and size checks, not a caller-invented ID/public URL. Links are never fetched by the server. The editor/tutorial/review UI explicitly describe visual proof and next-clarity congruence. Draft proof never enters profile projections, personal `/state`, ordinary feed summaries or external image exports; a published card's authorized detail reader can show its selected proof.
- SHA256 binds security-sensitive content; the existing16-hex code-point completion token is retained only for client ledger compatibility. Editing an activity/evidence revision must invalidate old approvals for the replacement, not erase the immutable history.

The service locks author state → progress control → submission in a consistent order. It binds exact saved activity/hash/rubric/source/target, checks active identities and accepted same-organization connections, and rejects self/duplicate/obsolete votes. At **three** qualifying independent approvals it writes a receipt/completion once and conditionally claims one source-level advance in the same transaction. It advances only if that source is still current and the activity still matches; older activities can complete without jumping/regressing. Explicit reassessment remains allowed and cannot replay a prior advance. Changes requested needs actionable feedback and a replacement revision; prior votes do not transfer. Draft changes supersede stale submissions. Disconnect/opt-out revokes future network access without erasing a historically valid receipt.

## Revision-aware state, recovery and consent

`GET /state`, `POST /state/merge` and successful `PUT /state` return `{state, revision, validationReceipts, legacyCompletionSlots}`. PUT sends `{state, expected_revision}`; a stale revision returns409 with the current envelope plus `detail`. Completion/receipt metadata is server-owned. New activity credit comes only from real immutable peer-review receipts. Historical compatibility credit is limited to the **server-captured pre-cutover baseline** with matching saved activity/token, never imported device claims. `/state/merge` archives device history separately; it cannot mint completion credit, even on first import.

`stateReconcile.ts` performs deep three-way base/local/remote reconciliation: unchanged local takes remote, unchanged remote takes local; plain objects recurse with deletions, conflicting arrays are explicit local choices, unknown fields survive. Remote completion data always wins. A stale profile save cannot undo a server3→4 advance, while an explicit assessment to2 is preserved.

`stateSyncQueue.ts` stages desired state synchronously; App owns debounce. One PUT is in flight at most. Acknowledgements rebase edits made after the sent payload;409 rebases against the last acknowledged base and retries at most three times after the initial attempt. Network failure leaves dirty intent. App's synchronous canonical ref, committed-UI delta baseline and functional `onReconcile` setters preserve newer React edits. An awaitable flush rechecks the live queue/session before evidence submission. `refreshFrom(reader)` serializes canonical GETs with PUT acknowledgements and prevents a new save from overtaking the read. Disposal aborts work and suppresses obsolete-session callbacks. Pagehide keepalive is best effort and allowed only for an exact serialized body strictly below60,000 UTF-8 bytes; oversized state is retained, never truncated.

Hydration verifies `/auth/me` and the cloud envelope before enabling authenticated persistence UI. A localized inert boundary offers status/error/retry and explicit legacy ownership consent. Owner-only tutorial counters use that verified identity, never a typed name/email. Account/session generations prevent old reads or saves from rebasing a different account.

Pending `{scope, base, desired, pending}` recovery is organization/account-scoped and retained before I/O and after reconciliations. Logout awaits a bounded flush; offline logout retains durable dirty intent. If neither cloud save nor durable storage succeeds, retry/stay controls block lossy logout. Re-login rebases that identity's pending delta onto a fresh cloud snapshot; accountA is never automatically copied toB. Original unscoped legacy keys and the immutable backup remain untouched. Unknown-owner legacy import needs an ownership checkbox and explicit Import or Cloud-only choice with an identity-scoped receipt. Imported drafts/presets/twelve assessments/images are preserved; local old completion marks remain an unverified archive, not new credit. Scoped guest-deletion markers prevent deleted guest values from resurfacing through the retained legacy fallback.

## Actual community and publication workflows

- Opt into a network profile, discover real members, invite and accept connections. Allowlisted display name/bio/levels are separate from private account state/email/drafts. Static Global Ideas/Specialist examples remain labeled demonstrations, not real delivered connections/bookings.
- Define an activity and its explicit next-clarity alignment; save/flush it before evidence upload/submission. Attach photo/video, choose Network or Public, and confirm any public disclosure. Three authenticated accepted network members assess activity match, effort and next-clarity congruence. Public viewers cannot review or contribute to quorum.
- Share any saved activity card with the same audience chooser, including text-only cards; linked published evidence uses the card's audience. Owners can change audience or hide a card. Public `?community-card=<UUID>` deep links open directly without the welcome/tour covering them. Network cards still require authorized access. Public projections expose only chosen content, not the private submission record, raw media asset identity, email or private map.
- Read actual notifications/review inbox/feed and send real reactions. Reuse is request → owner acceptance → explicit recipient import; acceptance alone never overwrites the requester's draft or confers completion. Import checks the destination and reconciles canonical state.
- Local ideas target accepted connections currently at source+1, offer their saved source-level activity, and require explicit import. Zero eligible recipients is reported honestly, not simulated delivery.

## Welcome/tutorial integration (local)

The activity-card UI has exactly **three stages**: define → attach mandatory photo/video → await community approval. It shows0/3 through3/3; the **third** stage becomes “Validated”, not a fourth step. Feedback/resubmission returns to evidence with a new revision. Level9 remains separate image-only final vision and counts toward120.

`WelcomeIntro` uses the exact seven Spanish source phrases and ten other languages. It starts/progresses automatically, varies readable duration with text, offers pause/resume only, pauses while hidden, and keeps timed low-motion transitions under reduced motion. Completion fires once; focus/scroll and timers are cleaned up. Scoped eligibility distinguishes new visitors/accounts from established saved people without resetting state.

The integrated30-stop spotlight tour overlays actual targets with dark surroundings, arrow/keyboard navigation and unlimited replay from MC. It preserves/restores navigation/drafts; all12 Holista cards stay on **one circle at every viewport**, never a grid/list. Four method visits are required, **not** saves, paid AI, real invitations or approvals. Guests see honest explanatory states. Only the successfully hydrated authenticated owner sees an overall numbered tutorial count; everyone may see the four-method checklist.

Stops cover arbitrary mode choice, initial assessment, exact next clarity, four methods/effort, three-stage activity/evidence/audience/review, image-only9, reactions/sharing, network, Global Ideas/specialists, profile/badges/configurations and control-center summaries/trivia/replay. The redundant Cada paso cuenta tracker is removed; Completionist120, Maxed99 and up to3 featured badges remain.

## Verification and release boundary

Local frontend checks include typecheck and `verify-welcome`, `verify-state-sync`, `verify-app-state`, `verify-guided-tour`, `verify-activity-flow`, `verify-community-panel`, `verify-card-audience`, plus existing map/configuration/badge checks. The isolated actual-App fixture uses synthetic fetch only; it tests hydration/consent, offline logout and A→B→A recovery with preserved twelve-mode data. Backend suites cover real service/HTTP contracts on synthetic databases; the migration verifier adds PostgreSQL concurrency/preservation. Passing a local fixture is not evidence of a publicly deployed workflow.

Release remains **pending CI + reviewed merge + authorized development migration/check**. Verify the real development site's readiness, authenticated three-reviewer photo/video and audience/revocation workflows, existing-account preservation and responsive circle before announcing availability. No production operations are authorized here.
