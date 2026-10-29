# Welcome, guided discovery and member validation

Source: the user's `Redacciones.pdf` (three pages), with direct clarifications on 2026-10-29. This document now records the **implemented local integration**, not a public-release announcement. Checked items mean present in this working checkout; release still requires passing CI, review/merge to `dev`, authorized development-only migrations and a successful development-site check. Backend hardening and integrated QA are still being finalized.

## Latest audience clarification — supersedes fixed-private evidence

The user explicitly clarified that each person chooses whether their activity card **and its visual evidence** are visible only to accepted network members or to the general public. Network is the safe default for existing data; public publication requires an explicit choice/confirmation before exposing name/activity/photo or video/reflection. Upload drafts stay owner-only until publication, not permanently private. A card's audience can subsequently change; removing public access cannot recall copies already made by viewers. The three independent approval reviewers remain authenticated accepted network members, regardless of the viewing audience. Public viewing does not authorize public voting. External image exports remain activity-only unless a further explicit choice includes proof.

The local activity/evidence editor and general card-sharing workflow now both use this choice. Selecting an audience alone never publishes; Public requires fresh explicit confirmation before submission/sharing or an audience update. Owners can change the audience or unshare. The public-safe card reader uses separate allowlisted card/video endpoints; `?community-card=<UUID>` opens the card directly, without intro/tour. Earlier private-only wording never constitutes consent to expose old proof. Migration003 defaults every old card to network with no linked evidence. This work does not authorize production migration or real-person publication.

## Delivery slices

- [x] Premium medals: silver/white/blue Maxed, gold Completionist, restrained moving particles/aura. Respect reduced motion, stop when hidden; small profile emblems remain still. Eligibility is unchanged. Implemented and locally checked; release verification is recorded separately.
- [x] Seven-message first-visit introduction in all11 languages, automatic timed entry/exit/progression, no manual forward/skip; botanical Modo Cultiva palette/leaf. Pause/resume, hidden-tab pauses and reduced-motion timing; single completion and cleanup. Scoped first-visit detection preserves established accounts/maps.
- [x] Integrated30-stop spotlight tutorial: dark surroundings, measured targets, arrow rail, accessible names/keyboard support, unlimited replay from MC and restoration of navigation/drafts without reset. The Holista map remains all12 cards on one circle at all sizes.
- [x] Twelve-mode choice, description/self-assessment, four methods, explicit next clarity, effort, evidence/audience/reviews, sharing/connections, Global Ideas, specialists, badges/profile/configurations and control-center summaries/trivia. Four method visits are required, not saves, requests or paid AI. Overall count is only for the authenticated, successfully hydrated owner verified by `/auth/me`; the method checklist is visible to everyone.
- [x] Authenticated opt-in profiles/connections, mandatory photo/video submissions, three-distinct-member review, real notifications/reactions, card sharing and permissioned reuse/local ideas. Static example people remain demonstrations; no simulated delivery/booking. Guests get honest explanations.
- [x] Exactly three activity-card stages: **define → attach mandatory photo/video → await three community approvals**. At3/3 the third stage becomes “Validated”, never a fourth step. Changes requested returns to evidence with feedback/new revision. Altered activity/evidence needs fresh review. Level9 stays separate image-only vision.
- [x] Explicit Network/Public audience and confirmation for **all shared cards and linked evidence**, owner-only drafts, safe public deep links, audience changes/unsharing, and network-only review eligibility even for publicly viewable cards.
- [x] Remove the redundant “Cada paso cuenta / Every step counts” tracker. Keep Completionist120 and genuine progress, Maxed99, premium medals and at most3 featured badges.
- [x] Revision-aware state queue integrated with synchronous committed-UI delta staging, functional canonical reconciliation, serialized GET/PUT, bounded409 retry, live-session flush checks and stale-session cancellation.
- [x] Scoped offline recovery/logout fallback, hydration blocking/retry and explicit unknown-owner legacy-import consent. Immutable originals/archives stay preserved; no cross-identity automatic import or newly minted completion credit. Local regression coverage includes all12 assessments, presets/drafts/images/language/unknown fields and offline A→B→A recovery.
- [ ] Release gate: all required CI/backend PostgreSQL checks pass on the final integrated revision; review/merge, authorized development-only migrations and real development-site checks complete. No public availability claim until then.

## Validation contract confirmed by the user

Next-clarity guidance is implemented in the journey, custom editor, bank and AI studio in all eleven languages. Bank practices point toward the next description; both AI routes use the server-owned versioned target. Existing descriptions/saved activities are unchanged. The integrated tutorial, evidence editor and authenticated reviewer criteria now explicitly use the same destination; local service transactions, not UI counters, enforce quorum/advancement. Release verification remains separate.

1. A person defines an activity at the current level **aligned with the next level's clarity description**. Completing an arbitrary current-level task is not sufficient: doing this activity must plausibly help the person recognize themselves in the description of the next level.
2. Show that next-level description while defining the activity, in the tutorial and during review. Separate initial self-assessment from verified progression; do not reset existing people's levels or erase historical completions.
3. A submission must bind its evidence to the exact activity, mode, source level, target level/clarity description and effort tier. Changes invalidate approvals for the superseded revision.
   The user additionally clarified that **visual proof is mandatory: a photo or a video** showing the activity being carried out. Written explanation and links may add context but cannot replace the visual attachment. This must be explicit in both the tutorial and the evidence/review interface.
4. Three distinct authenticated network members must approve. No self-review, repeat votes, fabricated client approvals, cross-organization access or approving obsolete revisions. Review covers activity/evidence match, effort and congruence with the next level's clarity, not just a reaction/like.
5. At quorum, complete that activity once and advance exactly one level **only when it is still the person's current level**. Older-level approvals must not jump, regress or repeatedly advance a mode.
6. Level 9 remains an image-only final vision. Uploading its image automatically completes that step; no extra activity or member quorum is required. Completionist remains 108 activities (0–8) + 12 images = 120.
7. Preserve the Holista circle at every viewport. The tutorial overlays and measures targets; it must not rearrange the home map.

## Current workflows and preservation

An authenticated user first hydrates cloud state and verified `/auth/me` identity behind a localized blocking boundary. Failed hydration offers retry/sign-out, not an editable old account. A saved unknown-owner device map prompts an explicit ownership choice: Import requires confirmation; Cloud-only does not copy it. Both choices retain the original backup and an identity-scoped decision receipt. Drafts, presets, images and all12 assessments can be imported without transferring client completion claims.

The state envelope is `{state, revision, validationReceipts, legacyCompletionSlots}`; PUT sends `{state, expected_revision}` and409 returns the canonical envelope plus `detail`. Desired changes stage immediately, with caller-owned debounce and at most one in-flight PUT. Three-way rebase preserves remote advancement/unknown fields and explicit local deletions/reassessment; arrays are atomic local choices on conflict. Activity completion and receipt metadata are always server-owned. Flush drains live dirty intent before submit; canonical GET refresh shares the queue barrier so stale reads cannot overtake acknowledgements. Pagehide keepalive is best effort only below60,000 serialized UTF-8 bytes, never truncated state.

Logout first tries to flush. Offline changes are retained under verified organization/account-scoped recovery, then rebased onto that same account's fresh cloud snapshot on re-login. Different accounts never automatically inherit them. If both save and durable backup fail, logout offers retry/stay instead of discarding intent. Original legacy keys/archives are non-destructive; guest deletion markers prevent old fallback values from reappearing.

Only the **server-captured pre-cutover baseline** can retain compatible historical completion credit. Device-imported historical marks remain an unverified archive; neither consent, `/state/merge`, ordinary PUT nor a client counter can turn them into new peer approval/credit. New activity validation requires real immutable receipts from three distinct authenticated accepted network members. Historical compatibility is not a peer-reviewed label.

Members opt into discoverability, invite/accept real connections and receive actual notices. Define/save an activity plus its next-clarity explanation, attach photo/video, choose audience and submit; reviewers deliberately check activity match, effort and clarity congruence. Ordinary saved-activity sharing offers the same audience chooser, including text-only cards. Publication and audience updates are explicit; public viewing grants no voting or private account/media-record access. External image exports remain activity-only, not an implicit evidence disclosure.

Reuse requests require owner acceptance and a separate recipient import with destination checks; approval alone never overwrites a draft or completes an activity. Local ideas target accepted members at source+1 and report zero if no one qualifies. See `community-architecture.md` for storage, endpoints and concurrency boundaries.

## Seven introductory messages (Spanish source)

1. ¿En qué modo estás operando ahora?
2. ¿Tu vida se reduce al trabajo, la familia y los amigos?
3. Para tener una vida plena, recomendamos tener un plan de inicio a fin para las 12 áreas de tu vida.
4. Define tu estructura y conviértela en estrategias concretas.
5. Recuperando así la claridad y una presencia consciente.
6. Cultiva cada uno de tus modos de vida.
7. Entra en Modo Cultiva.

## Release safeguards

Work in reviewed slices toward `dev`, with relevant local checks, CI and development-site verification. Local completion is not deployment. Never use a local counter as a substitute for authenticated independent reviews or describe demo profiles as real delivery. Keep all12 Holista targets on one circle; no routine data resets, destructive rollback or production operation.

The additive **development-only** migration chain is present:001 community/progress baseline;002 immutable uploaded visual-video storage;003 Network/Public card audience and evidence link with existing cards defaulting to Network. Frozen DDL/environment guards refuse production and routine destructive downgrade. The synthetic PostgreSQL verifier checks preserved state/timestamps/pre003 cards and concurrent quorum/stale-save behavior; CI is configured to run it. Applying migrations or making a public release still needs the authorized coordinated development workflow; this audit applies none.

Local verification entry points include typecheck and welcome/state-sync/App-state/tutorial/activity-flow/community/audience/map/configuration/badge scripts. The isolated actual-App browser fixture uses synthetic fetch only. Remaining release acceptance includes final CI results, backend hardening review, real authenticated development photo/video3-member validation, public/network visibility/revocation, existing-account preservation and mobile/tablet/desktop circle checks. No production migration or real-account publication is authorized here.
