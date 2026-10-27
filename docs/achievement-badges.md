# Achievement collection

The collection contains the original eight badges and two distinct premium achievement editions. Premium describes the medal tier, not a new paid entitlement.

## Completionist

Exactly 120 unique activity slots: one at each level **0–9** of each of the twelve modes. Each activity must be defined and explicitly confirmed as completed by the person. Merely saving an activity, choosing a recommendation, uploading an image, increasing a level or selecting a saved configuration does not confirm completion.

The level-9 final-vision image remains unchanged. A separate level-9 practice can now be defined and confirmed below it, making all ten activity slots accessible. A vision image alone does not count as a completed activity.

`activityCompletions` is an additive JSON object keyed by canonical `mode-level`, with a content fingerprint as its value. Completion is self-reported, not externally verified. Empty/invalid activities and noncanonical slots are ignored; duplicates cannot increase the count. Editing the activity invalidates the old confirmation until the person confirms the new practice. Confirmations can be undone.

## Maxed

Active only while **all twelve canonical mode values equal the integer 9**, the exact condition for Cultiva level 99. Display rounding, extra keys, strings, out-of-range values and missing modes never grant this badge. Lowering any mode makes it inactive, including on the profile. Completionist and Maxed are independent achievements.

## Persistence and display

- Existing levels, configurations, drafts, images, reactions and featured choices are not rewritten or retroactively marked completed.
- Confirmation is acknowledged only after local storage succeeds. A quota failure leaves the UI unconfirmed and reports the problem.
- Account hydration, ordinary state save and the existing one-time device merge include the new ledger. Cloud values win a device-merge conflict, consistent with the other per-slot fields. No schema migration is required.
- Up to three eligible badges can be featured. Unknown, duplicate and inactive choices cannot appear as earned. Inactive saved selections remain stored until the person changes the selection, preventing a level adjustment alone from deleting user choices.
- The two premium medals use distinct SVG artwork in the gallery and profile. New copy is localized in all eleven supported languages. The home-map geometry is untouched.

Run `npm run verify:badges` for the 120-slot and exact-level eligibility regression suite, and `python -m pytest tests/test_user_state.py` for persistence regression coverage. Browser verification additionally exercises confirmation, undo, editing, level-9 practices, profile selection, narrow/RTL layouts, quota errors and mocked account synchronization.
