import { useId, useState } from 'react';
import { EMOTIONAL_ELECTRIC_ART } from './homeVision';
import { electricArtworkTint, VISIONARY_ELECTRIC_ART } from './electricArtworkTint';

type Props = { src: string; fallbackSrc?: string; color: string; className?: string; lazy?: boolean };

// Map each artwork's luminance to the mode's palette without flattening its
// highlights, depth or alpha. The source artwork and user photos stay untouched.
export function PremiumModeArtwork({ src, fallbackSrc, color, className, lazy }: Props) {
  const id = `mode-tint-${useId()}`;
  const [failedSrc, setFailedSrc] = useState<string>();
  const isFallback = failedSrc === src && !!fallbackSrc;
  // This SVG already has a red plasma palette. The monochrome treatment
  // would mute its ruby shadows and narrow red/white highlights.
  const shouldTint = !isFallback && src !== EMOTIONAL_ELECTRIC_ART;
  const tables = electricArtworkTint(src, color);
  return <>
    {shouldTint && <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs>
        <filter id={id} colorInterpolationFilters="sRGB">
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncR type="table" tableValues={tables[0]} />
            <feFuncG type="table" tableValues={tables[1]} />
            <feFuncB type="table" tableValues={tables[2]} />
          </feComponentTransfer>
        </filter>
      </defs>
    </svg>}
    <img src={isFallback ? fallbackSrc : src} alt="" draggable={false} decoding="async" loading={lazy ? 'lazy' : undefined}
      className={className} data-electric-tone={shouldTint && src === VISIONARY_ELECTRIC_ART ? 'indigo' : undefined}
      style={shouldTint ? { filter: `url("#${id}")` } : undefined}
      onError={() => { if (!isFallback) setFailedSrc(src); }} />
  </>;
}
