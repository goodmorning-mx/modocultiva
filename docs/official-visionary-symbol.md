# Official Visionary telescope and playback controls

## Design and integration

The approved Visionary proposal is a telescope aimed up and right, observing the existing four-point star near its lens. Home uses the actual approved artwork, mechanically resized to a transparent 512×512 WebP (53,364 bytes), not a regenerated design. The preview was generated with the built-in image tool in the preceding design turn; this implementation only resized/encoded it with Sharp. Its brief specified a violet luminous glass/metal telescope, one nearby four-point star, electric highlights and a few particles on real alpha, with no text or background.

`modeSymbol('visionario')` now selects `visionario-telescopio-electrico.webp`. `customModeSymbol('visionario')` selects the static, self-contained `visionario-telescopio.svg`, simplifying the same telescope and star for small badges and activity-image exports. Existing shared consumers cover Home, Home Images, journey cards, profile, dashboard, presets, Trivia and specialist cards.

Home retains the destination palette `#A77BDB`, green floating background, active-card-only CSS particles and reduced-motion behavior. The telescope has a `.70` optical scale to balance its tall silhouette against the other modes. There are no new runtime dependencies, canvases, WebGL contexts or per-frame loops. Old source images remain available. No user images, presets, levels, preferences, account data or persistence rules were changed.

The Home pause character was replaced by two filled 5×16 bars inside a 24×24 SVG. Play also uses a geometric SVG. Both share a 22-pixel display size and inherit the existing button color, independent of device fonts. The existing localized accessible names and pause/resume behavior remain unchanged.

## Validation record

- Read-only inspection: `Get-Location`, `Get-Content`, `rg --files`, targeted `rg -n`, `git status --short --branch`, `git log -3 --oneline` and `git fetch origin` established the existing shared asset routes and DEV workflow. Reads of guessed `ModeElectricSymbol.tsx` and `activityImageExport.ts`, and a shell wildcard passed to `rg`, did not resolve; the actual JSX/shared export sources were inspected instead.
- `git switch -c codex/visionary-telescope-pause origin/dev`: isolated feature branch; pre-existing untracked `output/` preserved.
- Read-only Sharp metadata check: approved PNG is 1254×1254 with alpha. Sharp resize/encode: 512×512 true-alpha WebP, 53,364 bytes. No image editing/generation was needed this turn.
- `node node_modules/typescript/bin/tsc --noEmit`: passed.
- `node node_modules/vite/bin/vite.js build`: passed, with the existing >500 KB bundle advisory.
- All package `verify:*` scripts invoked with Node (npm is unavailable on this host): PWA/cache, navigation, localization (11 languages), configurations, activities, global, level, social, AI, clarity, map, badges, welcome, state sync, app state, tutorial, activity flow, community, audiences and onboarding self-test passed. `verify:language-session` could not start because Playwright is absent from this checkout. Full Playwright onboarding browser cases were not run locally.
- Updated onboarding regressions cover the new Home/card routes, 512-pixel asset size/alpha budget, `.70` scale and preservation of existing stock/upload choices. Updated Home contract checks require geometric pause bars and forbid the Roman-numeral glyph.
- `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4173 --strictPort`: local visual review server. At 390×844, all 12 modes opened with alternating pointer and Enter input, including the new compact Visionary mark; the telescope loaded at 512 pixels with `.70` scale, one active particle layer, and zero internal carousel scroll. Pause/resume both worked and the pause button displayed the two thick bars.
- `git diff --check`: passed. No credentials, tokens, secrets, authentication changes, production operations or migrations were introduced.

## Rollback

Revert this feature PR on `dev` and use the existing DEV deployment workflow. Do not reset or clear account/browser data.
