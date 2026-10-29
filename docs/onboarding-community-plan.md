# Welcome, guided discovery and member validation

Implementation goal, source: the user's `Redacciones.pdf` (three pages), with direct clarifications on 2026-10-29. This document records intended scope; unchecked items are not claims of live functionality.

## Delivery slices

- [x] Premium medals: silver/white/blue Maxed, gold Completionist, restrained moving particles/aura. Respect reduced motion, stop when hidden; small profile emblems remain still. Eligibility is unchanged. Implemented and locally checked; release verification is recorded separately.
- [ ] Seven-message first-visit introduction, automatic entry/exit and progression, no manual forward/skip; palette matches Modo Cultiva. Preserve existing accounts and saved maps.
- [ ] Spotlight tutorial: darken surroundings, illuminate only the relevant section/target. Elegant arrow rail, accessible names and keyboard support. Replay without limit from MC, without resetting user data.
- [ ] Guide all twelve-mode choices, description/self-assessment, four activity methods, effort, evidence/reviews, sharing, connections, Global Mode, specialists, badges, profile, configurations and control center. Require visiting all four methods, not saving data, sending requests or paying for AI. An overall tutorial step count is reserved for the authenticated owner account; the four-method checklist is visible to everyone.
- [ ] Authenticated community connections, private evidence submissions, distinct-member review, notifications and internal sharing/reuse. Do not pass off demonstration profiles as real people, or simulated actions as delivered notifications/bookings.
- [ ] Remove the redundant “Cada paso cuenta / Every step counts” badge tracker. Keep Completionist's 120-step target and its real progress.
- [ ] Verify existing twelve levels, presets, drafts, images, language and account state survive loading/saving, replay and publication.

## Validation contract confirmed by the user

1. A person defines an activity at the current level **aligned with the next level's clarity description**. Completing an arbitrary current-level task is not sufficient: doing this activity must plausibly help the person recognize themselves in the description of the next level.
2. Show that next-level description while defining the activity, in the tutorial and during review. Separate initial self-assessment from verified progression; do not reset existing people's levels or erase historical completions.
3. A submission must bind its evidence to the exact activity, mode, source level, target level/clarity description and effort tier. Changes invalidate approvals for the superseded revision.
4. Three distinct authenticated network members must approve. No self-review, repeat votes, fabricated client approvals, cross-organization access or approving obsolete revisions. Review covers activity/evidence match, effort and congruence with the next level's clarity, not just a reaction/like.
5. At quorum, complete that activity once and advance exactly one level **only when it is still the person's current level**. Older-level approvals must not jump, regress or repeatedly advance a mode.
6. Level 9 remains an image-only final vision. Uploading its image automatically completes that step; no extra activity or member quorum is required. Completionist remains 108 activities (0–8) + 12 images = 120.
7. Preserve the Holista circle at every viewport. The tutorial overlays and measures targets; it must not rearrange the home map.

## Seven introductory messages (Spanish source)

1. ¿En qué modo estás operando ahora?
2. ¿Tu vida se reduce al trabajo, la familia y los amigos?
3. Para tener una vida plena, recomendamos tener un plan de inicio a fin para las 12 áreas de tu vida.
4. Define tu estructura y conviértela en estrategias concretas.
5. Recuperando así la claridad y una presencia consciente.
6. Cultiva cada uno de tus modos de vida.
7. Entra en Modo Cultiva.

## Release safeguards

Work in reviewed slices toward `dev`, with relevant checks and public development-site verification. No production changes or schema migrations without explicit approval. A reliable real-member validation system may require additive community tables; obtain that approval before applying migrations. Never use a local counter as a substitute for independent authenticated reviews. Record pending integration honestly in the tutorial until the underlying flow works.

The user explicitly approved an additive **development-only** migration for connections, evidence and the three real validations on 2026-10-29. This does not authorize production migrations, destructive schema changes or resetting existing state.
