# Official Social and Financial marks

## Approved designs

- Social: two friends with their arms around one another's shoulders, inside a turquoise orb with an orbital ring and three nodes. Primary palette: `#3FBBC3`.
- Financial: eight gold coins arranged along a circular ring around one larger central coin. Primary palette: `#D9B65D`.

The earlier handshake and the discarded alternatives are not used.

## Assets and integration

`frontend/public/mode-symbols/` contains each compact SVG mark (`social-amistad.svg`, `financiero-monedas.svg`) and its transparent 512-pixel electric WebP (`social-amistad-electrico.webp`, `financiero-monedas-electrico.webp`). The SVG marks deliberately simplify the approved artwork for small card badges while retaining its silhouette and meaning.

`customModeSymbol()` is the shared source for existing card marks, journey overviews and activities, profile, life configurations, dashboard, Trivia, specialist previews and shared activity image exports. `modeSymbol()` selects the electric artwork for Home and Home Images previews. No preference, account, photo, preset or persistence schema is changed. Legacy art remains available, but the new routes no longer select it for Social or Financial.

The electric artwork uses the existing palette-tint treatment, green Home background, active-card-only CSS particles and reduced-motion behavior. No extra canvas, WebGL context or animation loop is introduced. Home scales are `.78` for Social and `.64` for Financial to compensate for different transparent margins and keep their visible footprints comparable.

The carousel uses `overflow: clip` instead of a hidden scroll container. This preserves its visual clipping while preventing control focus from scrolling the stage internally and cutting off the artwork. The electric-home cases assert that its scroll offset remains zero throughout navigation.

## Artwork provenance

Production alpha cutouts were prepared with the built-in image generation tool from the user's approved previews, then mechanically resized and encoded to WebP. The editable small marks were authored as native SVG.

Prompt specifications:

- Social: extract only the exact approved turquoise friendship orb, retain both equal-sized friends, orbital ring and three nodes, remove the dark background to real alpha, keep pale cyan highlights, a close electric halo and a few particles; no handshake, text or redesign.
- Financial: extract only the approved ring of eight small gold coins around one central gold coin, retain ridged metal edges and concentric rims, remove background and empty inner gaps to real alpha; no arrows, currency glyphs, text or redesign.

## Verification and rollback

The onboarding self-test covers routes, compact marks, WebP alpha/size budget, default selection, and preservation of existing uploaded and stock selections. The electric-home integration cases check all twelve cards, destination palettes, assigned scales, card icons, active-only particles and reduced motion.

Rollback: revert the feature commit/PR on `dev` and allow the existing DEV deployment workflow to rebuild. Do not clear browser storage or reset user state.

### Local validation record (2026-11-20)

- Read-only repository inspection: `Get-Location`, `rg --files`, targeted `rg -n`, `Get-Content`, `Get-ChildItem`/`Get-Item`, `Get-Command`, `Test-Path`, `git status --short`, `git branch --show-current`, `git remote -v`, `git log -5 --oneline` and `git fetch origin` established the existing implementation and DEV contract. Guessed `ModeGlyph.tsx`/`premium-mode-artwork.css` reads and Windows wildcard arguments did not resolve; the actual shared implementation is `homeVision.ts`/`PremiumModeArtwork.tsx`. No files were changed by inspection.
- `git switch -c codex/social-financial-official-icons origin/dev`: created the isolated feature branch. The pre-existing untracked `output/` directory was left untouched.
- Built-in artwork preparation and a Node/Sharp conversion: produced transparent 512×512 WebP files of 41,284 bytes and 92,746 bytes. No runtime dependency was added.
- `node node_modules/typescript/bin/tsc --noEmit`: passed.
- `node node_modules/vite/bin/vite.js build`: passed. Vite reports the existing large-bundle advisory; no build failure.
- All `verify:*` package commands were invoked through Node (the `npm` executable is unavailable on this host). PWA, navigation, localization, configurations, activities, global ideas, level, social, AI, clarity, map, badges, welcome, state sync, app state, tutorial, activity flow, community, audiences and onboarding self-test passed. `verify:language-session` could not run because its Playwright dependency is not installed in this checkout; no dependencies were installed to work around it.
- `node scripts/verify-life-map.mjs`, `node scripts/verify-onboarding-integration.mjs --self-test` and typecheck were repeated after the carousel clipping fix: passed.
- `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4173 --strictPort`: local-only visual review server. In-browser review at 390×844 and 1440×900 verified the two artworks, their compact journey marks and zero carousel scroll offset. All 12 modes opened with alternating pointer/Enter actions.
- `git diff --check`: passed. No secrets, credentials, infrastructure identifiers, authentication changes, migrations or state changes were introduced.
