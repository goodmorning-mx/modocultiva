# ElectricLogo

Exact JS-CSS source retrieved from https://reactbits.dev/r/ElectricLogo-JS-CSS.json on 2026-11-17.
Dependency: ogl@^1.0.11. License: /REACT-BITS-LICENSE.md (retained in public).
Installed directly from the official registry without introducing shadcn/Tailwind configuration into this plain-CSS application.

ModeElectricSymbol adds lazy loading, an error boundary, static PNG fallback, and strict reduced-motion/document-visibility handling without changing the registry shader. Only the focused carousel card mounts an effect, avoiding 12 WebGL contexts. The 12 mode-symbols PNGs are unchanged copies of the user's original assets. A cached in-memory bright-ink mask avoids treating their baked-in aura as solid ink. The effect is rendered on a 480px stage and scaled to the card to preserve thin strokes; the original PNG remains beneath it.

This is an animated electric outline rendered in WebGL, not a generated 3D mesh.
