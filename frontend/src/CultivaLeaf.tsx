import { useId } from 'react';

// The same silhouette and metallic greens as the Cultiva level leaf.
export const CULTIVA_LEAF_SHAPE = 'M62 230C20 160 47 65 136 46C189 35 243 48 284 22C294 84 280 150 237 190C193 231 130 253 62 230Z';

export function CultivaLeaf() {
  const id = useId().replace(/:/g, '');
  return <svg viewBox="0 0 340 280" fill="none" aria-hidden="true" focusable="false" className="reaction-leaf">
    <defs>
      <linearGradient id={`${id}-metal`} x1="60" y1="58" x2="265" y2="233" gradientUnits="userSpaceOnUse"><stop stopColor="#074b27" /><stop offset=".22" stopColor="#1db65a" /><stop offset=".36" stopColor="#8af7a2" /><stop offset=".43" stopColor="#37ba69" /><stop offset=".56" stopColor="#096238" /><stop offset=".78" stopColor="#073b27" /><stop offset="1" stopColor="#1c9b4a" /></linearGradient>
      <linearGradient id={`${id}-edge`}><stop stopColor="#d8ffcc" /><stop offset=".5" stopColor="#72ff9a" /><stop offset="1" stopColor="#23c466" /></linearGradient>
      <linearGradient id={`${id}-fold`}><stop stopColor="#0e5331" stopOpacity=".15" /><stop offset=".5" stopColor="#001e13" stopOpacity=".5" /><stop offset="1" stopColor="#b5ffc2" stopOpacity=".2" /></linearGradient>
    </defs>
    <path d="M37 258C51 244 58 234 70 220" stroke={`url(#${id}-edge)`} strokeWidth="9" strokeLinecap="round" />
    <path d={CULTIVA_LEAF_SHAPE} fill={`url(#${id}-metal)`} stroke={`url(#${id}-edge)`} strokeWidth="4" />
    <path d="M62 230C115 173 205 101 284 22C294 84 280 150 237 190C193 231 130 253 62 230Z" fill={`url(#${id}-fold)`} />
    <path d="M63 230C115 174 202 104 284 22M91 202Q151 220 187 216M122 171Q188 192 231 184M161 137Q222 153 263 136M121 172Q93 118 117 65M159 138Q137 86 167 43" stroke="#baffbc" strokeWidth="3" opacity=".45" />
  </svg>;
}
