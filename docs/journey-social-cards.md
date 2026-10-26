# Journey activity cards: reactions and sharing

## Scope

Levels 0–8 now use an editorial botanical activity card. The mode color, localized level, stage, effort band and complete activity remain available. Long activities scroll with keyboard access instead of being silently clamped to two lines. At narrow widths the arrows move below the card so the content has the full width. Level 9 retains the previously verified final-vision image upload and fit behavior. All twelve mode levels, presets and existing activity/image data are unchanged.

Five personal reactions: metallic green Cultiva leaf (like), soil (grounding), water (nurture), sun (inspiration), roots (connection). The leaf shares the score leaf's silhouette and metallic green palette, with unique SVG gradient IDs. One reaction per activity; selecting it again removes it. A changed activity has its own reaction key. There are no invented aggregate counts or claims of a public social feed: this release stores **the signed-in person's reaction**, or a device-local reaction when signed out.

Reactions are an additive `activityReactions` object in the existing account state JSON and a separate local cache. Older maps load without this property. Device-to-account merge unions reaction keys, preserving the account's value for conflicts, following the existing map merge contract. No schema migration, production operation or new external service is required. Storage failure retains the prior selection and gives feedback.

## Four sharing actions

LinkedIn, WhatsApp Status, Instagram Story, Facebook each opens a preview of the selected activity, not a generic homepage link. Canvas renders a PNG at 1080×1350 for the two feeds and 1080×1920 for Status/Story. The preview offers:

- Native file sharing if the device reports support (`canShare({files})`), invoked from a fresh user click after image preparation.
- A real image download on every supported browser, with platform-specific steps for uploading it.
- Copy of the complete activity caption. If an exceptionally long activity needs an image excerpt, the preview discloses that the full text can be copied.

No account/profile details, other activities, existing vision images, auth token, URL query strings, or reaction data are included in the export. The person reviews the exact image and finishes publishing in the chosen app. A resolved sharing promise is not treated as proof of publication. Cancellation is quiet; permission/unavailable-target errors keep the image download available. Object URLs are revoked on close. Native dialog focus is trapped and restored to the initiating share button; Escape dismisses the preview without closing the journey. All controls and instructions are localized in the eleven supported languages.

## Platform evidence and limits

- [MDN: Navigator.share](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share): supported files, user activation, device-dependent targets, cancellation, and why successful handoff is not publication. The web API does not choose a named destination or guarantee a particular app's Story/Status entry point. We do not simulate such a guarantee with invented deep links.
- [LinkedIn: share photos](https://www.linkedin.com/help/linkedin/answer/a527229): add a photo to a post; this implementation supplies the actual image, not a link-only preview of unrelated content.
- [WhatsApp: create and share a status](https://faq.whatsapp.com/643144237275579/): images can be chosen for a status. The fallback instructions explicitly use the mobile Updates/My status flow.
- [Facebook: share something](https://www.facebook.com/help/170116376402147): photo/video post option. Final audience selection and posting remain with the user.

The Meta developer Story pages were rate-limited during verification; no unsupported direct Story publishing integration was inferred from third-party snippets. Physical iOS/Android app handoffs are device/app dependent and were not claimed as end-to-end publications. Browser coverage exercises successful native handoff, user cancellation, denied permissions, unsupported file sharing, real downloads, privacy, persistence and legacy state preservation.
