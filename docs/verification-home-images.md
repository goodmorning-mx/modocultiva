# Home Images and Journey refresh — DEV verification

Measured the previous and new local builds with Chromium/Playwright at
870×667 and device scale 2, with all 12 electric preferences set. Observed
120 WebGL draw calls in two seconds, a 960×960 render surface, and two canvas
pixel readbacks on the previous build; the new build had no WebGL draw calls,
no render surface, and no readbacks. The 95th-percentile frame interval on this
machine stayed at 17 ms, so this is a reduction in work, not a measured FPS claim.

Generated 12 display copies with browser canvas WebP encoding (420 px on the
longest side, quality .88). Their total is 556,840 bytes versus 19,213,445 bytes
for the untouched originals, a 97.1% reduction. The Home carousel no longer
duplicates images across curved slices for symbol cards. Photos and Vision
images keep the existing carousel rendering. The active symbol and Journey
highlights use small CSS transforms and honor reduced motion.

- TypeScript and Vite build passed, with the existing main bundle size warning.
- `node scripts/verify-life-map.mjs`: passed, including all 12 JPEG, PNG, and optimized WebP assets.
- `node scripts/verify-badges.mjs`: passed; existing level-9 image and achievement rules are unchanged.
- `node scripts/verify-app-state.mjs`: passed; existing levels, presets, guest/account boundaries and sync checks preserved.
- `node scripts/verify-onboarding-integration.mjs`: exercised 320/870/1440px, Spanish/English/Arabic, old and new symbol/image preferences, reduced motion, invalid image rejection, upload from Home, guest and mock-account persistence, and Journey navigation. The initial obsolete assertion against the newly enabled Home upload was corrected.
- Playwright screenshot confirmed the green gradient and that dark rectangular image bounds blend into it.
- `git diff --check`: no whitespace errors (Windows line-ending notices only).

No migrations, new dependencies, real account writes, added credentials, or
production operations. Uploading a Vision image does not change the mode level.
