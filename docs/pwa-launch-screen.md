# PWA first paint

The first page rendered while the JavaScript bundle is loading uses a static, inline-styled shell in `frontend/index.html`: the approved electric mark has a transparent background and sits in the center of the solid brand green; the name sits above the bottom safe area. React removes the shell on its first commit without a timer or minimum display duration. The same mark is reused in Home, login and the introduction.

The manifest's `any` icons export the same artwork as transparent 192px and 512px PNGs. The 512px adaptive icon keeps its solid, maskable safe area and uses the exact launch background color (`#0b231f`) so it blends into the Android splash. The favicon and Apple Home Screen launcher icon are unchanged. The web shell controls its footer; the brief operating-system prefix is controlled by the device. Existing installations may receive updated OS imagery on the platform's refresh schedule.

The service worker precaches the launch artwork along with the shell and manifest icons. When replacing these assets in a future release, use new versioned paths and keep the HTML, service worker, manifest and React asset URL in sync. Preserve the manifest app identity and do not clear user data.

From `frontend`, run `node scripts/verify-pwa-contract.mjs` and `node scripts/verify-pwa-cache.mjs`. With a built preview on loopback, `node scripts/verify-pwa-launch-ui.mjs http://127.0.0.1:4173` checks that the splash renders before JavaScript, samples alpha and matching PNG edge colors, and verifies that React takes over. An optional second argument saves the portrait screenshot.
