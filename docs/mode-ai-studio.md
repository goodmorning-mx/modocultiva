# Mode AI studio

The Mode AI activity flow has a dedicated premium composition, scoped to `.journey-panel--mode-ai` and `ModeAiStudio`. The translucent layered-spark artwork is code-native SVG and follows the selected mode's color. It is distinct from the Global Mode globe and the Activity Bank's quote presentation.

Desktop layout: context and guidance on the left, proposed activity on the right. Mobile layout: one column, with the completed proposal brought into view. The mode, current selected activity level, stage and effort band remain visible. Existing localized headings, guidance, buttons and eleven supported languages are retained. Arabic uses RTL layout, while proposal content uses its own text direction. Decorative motion and loading shimmer respect reduced-motion preferences.

The complete static Agent status / Mode AI Ready strip and its styles have been removed, not hidden or replaced by a new readiness frame. Loading indicators appear only while a real request is pending. There is no fake generated activity or prefilled answer.

## Behavior contract

- Existing guest `/ai/mode/public` and authenticated `/ai/mode` endpoints and request fields are unchanged.
- Empty context gives localized feedback without calling the provider.
- Duplicate requests and editing the context during a request are prevented.
- Leaving the activity, switching modes or changing the language aborts the browser request. Late replies cannot fill a different activity.
- Only a nonempty string proposal enables Use this activity. Malformed/empty/error responses preserve the entered context and permit retry.
- Editing context invalidates the previous proposal; a new request is required before saving.
- A successful response is readable in full, with line breaks and keyboard-accessible scrolling for long output. Focus moves to the proposal after completion.
- Saving uses the existing activity persistence path and returns to the journey. Presets, all twelve mode levels, existing activities, reactions and final-vision images are not reset or migrated.

Verification uses mocked provider replies to exercise pending, successful, failed, empty, malformed, canceled and long-output states without incurring provider usage. It also exercises the authenticated save contract with mocked account routes. Production credentials, model configuration, billing, backend behavior and infrastructure are unchanged.
