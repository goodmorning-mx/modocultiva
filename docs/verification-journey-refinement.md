# Journey refinement — DEV verification

- “Definición del nivel actual” is centered between equal lines, with the shared CSS particles. Reduced-motion mode keeps the particles static.
- “Anterior” is absent on the overview and remains available in steps 1–3. Returning to the overview restores keyboard focus to its tab. The step names stay on one line; narrow layouts move the arrows below the tabs.
- “Ver detalles” is removed from the submission audience selector. Until the Home feed is available, Journey hides the selector and sends new evidence with `audience: 'network'` and `public_confirmed: false`, independently of a previous public selection. The optional reference, reviews and existing card visibility management remain available. The guided tour skips the temporarily unavailable selector.
- `npm run build`: passed (TypeScript/Vite; existing main-bundle size warning).
- `node scripts/verify-activity-flow.mjs` and `node scripts/verify-card-audience.mjs`: passed.
- `node scripts/verify-onboarding-integration.mjs --cases=fresh-journey,account-journey-ascent,account-local-idea,tour --languages=es,en,ar --widths=320,870,1440 --replays=1 --workers=3 --timeout=24000`: synthetic browser checks for layout, navigation, visibility and the tour. No writes to real accounts.
- `git diff --check`: clean, aside from Windows line-ending notices.

No migrations, new dependencies, added credentials or production operations.
