# Electric Home header — approved green option

The user selected option B (dark green) and explicitly requested a much larger logo. The actual approved electric artwork is used, not the AI-rendered screenshot mockup. Its most recent source has two green leaves, four cyan/gold nodes and a shallow horizontal lower wave; previous logo designs are not used for Home.

## Scope

- Approved 384×384 true-alpha WebP (66,042 bytes), originally shipped from `src/assets/modo-cultiva-logo-electric.webp` and now shared with the launch screen at `public/brand/cultiva-electric-mark-v1.webp`. No change to the artwork bytes.
- Circular green backing: radial `#20483f` to `#12312d`, fine `#32665a` rim, restrained glow. Static effects, no extra particle/canvas/animation loops.
- Much larger footprint: 88 px desktop/tablet, 72 px mobile (previous image was 38/32 px). Image uses `object-fit: contain` and a modest inset so the silhouette/halo are not cropped.
- The floating profile/menu controls are vertically centered against the enlarged brand. Title stays centered; controls remain floating. Brand link destination, accessible name and keyboard focus remain available.
- Non-Home screens, login/welcome intro, installation icons and legacy assets are intentionally unchanged by this Home-header request. No user images, presets, levels, activities or persistence changed. No dependencies, secrets, credentials, production identifiers, migrations or production deployment added.

## Verification

- Read-only `Get-Location`, `Get-Content`, `rg --files`, `rg -n`, `git status --short --branch`, `git log -3 --oneline`, `git fetch origin`: inspected the shared brand and existing DEV contract. A Windows `rg` wildcard did not resolve and was replaced with `rg -g`.
- `git switch -c codex/electric-home-brand-green origin/dev`: created feature branch. Existing untracked `output/` preserved.
- Node/Sharp metadata check and resize/encode: confirmed true alpha; produced 384×384 WebP, 66,042 bytes. The source comes from the approved built-in image-generation proposal of the preceding design turn.
- `node node_modules/typescript/bin/tsc --noEmit`: passed.
- `node node_modules/vite/bin/vite.js build`: passed; pre-existing >500 KB bundle advisory remains.
- Node runner invoked every `verify:*` package script (npm unavailable on this host). PWA/cache, navigation, localization, configurations, activities, Global, level, social, AI, clarity, map, badges, welcome, state sync, app state, tutorial, activity flow, community, audiences and onboarding self-test passed. `verify:language-session` could not start because Playwright is not installed locally. Full Playwright browser integration was not run locally.
- Added Home regressions for conditional routing, large desktop/mobile sizing, chosen green colors, whole-logo containment, true WebP alpha, exact 384 dimensions and <80 KB budget.
- `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4173 --strictPort`: local visual review. At 320×740 all 12 cards opened with alternating pointer/Enter. Header badge measured 72×72, image loaded at 384 pixels, title and profile/menu did not overlap. The 88-pixel desktop logo was reviewed visually before the vertical control-alignment refinement.
- `git diff --check`: passed. Static brand styling adds no motion and retains existing reduced-motion behavior; OS-level reduced-motion emulation was not performed.

## Rollback

Revert this feature PR on `dev` and allow the normal DEV deployment to rebuild. Never clear account storage or reset user data as part of rollback.
