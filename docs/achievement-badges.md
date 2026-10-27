# Achievement collection

The collection contains the original eight badges and two distinct premium achievement editions. Premium describes the medal tier, not a new paid entitlement.

## Completionist

Exactly **120 unique steps** across the twelve modes. Levels **0–8** contribute 108 activities, each defined and explicitly confirmed by the person. Level **9** contributes twelve final-vision images, one per mode: uploading the image completes that step automatically. The target remains 120.

Level 9 has no additional activity form or manual completion button. Previously uploaded vision images count automatically too. Image preparation/persistence errors cannot replace a saved image or falsely complete a previously empty level. Merely saving an activity at levels 0–8, choosing a recommendation, increasing a level or selecting a configuration does not confirm those activities.

`activityCompletions` is an additive JSON object keyed by canonical `mode-level`, with a content fingerprint as its value. Activity completion is self-reported, not externally verified. Empty/invalid activities and noncanonical slots are ignored; duplicates cannot increase the count. Editing a level-0–8 activity invalidates its old confirmation until the person confirms the new practice. Confirmations can be undone. Level-9 completion is derived from `visionImages`, not from an activity draft or manual ledger entry; any legacy level-9 drafts/confirmations remain stored but do not substitute for an image.

## Maxed

Active only while **all twelve canonical mode values equal the integer 9**, the exact condition for Cultiva level 99. Display rounding, extra keys, strings, out-of-range values and missing modes never grant this badge. Lowering any mode makes it inactive, including on the profile. Completionist and Maxed are independent achievements.

## Persistence and display

- Existing levels, configurations, drafts, images, reactions and featured choices are not rewritten. Previously uploaded images now count toward their twelve vision steps, without a migration or a redundant ledger write. Existing activities still require their original manual confirmations.
- Confirmation is acknowledged only after local storage succeeds. A quota failure leaves the UI unconfirmed and reports the problem.
- Account hydration, ordinary state save and the existing one-time device merge include the new ledger. Cloud values win a device-merge conflict, consistent with the other per-slot fields. No schema migration is required.
- Up to three eligible badges can be featured. Unknown, duplicate and inactive choices cannot appear as earned. Inactive saved selections remain stored until the person changes the selection, preventing a level adjustment alone from deleting user choices.
- The two premium medals use distinct SVG artwork in the gallery and profile. New copy is localized in all eleven supported languages. The home-map geometry is untouched.

Run `npm run verify:badges` for the 120-slot and exact-level eligibility regression suite, and `python -m pytest tests/test_user_state.py` for persistence regression coverage. Browser verification additionally exercises activity confirmation/undo/editing, automatic level-9 image completion, unchanged 120 target, single journey notices, profile selection, narrow/RTL layouts, upload/quota errors and mocked account synchronization.
