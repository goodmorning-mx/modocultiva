import { useId, useState } from 'react';

type Props = { src: string; fallbackSrc?: string; color: string; className?: string; lazy?: boolean };

// Map each artwork's luminance to the mode's palette without flattening its
// highlights, depth or alpha. The source artwork and user photos stay untouched.
export function PremiumModeArtwork({ src, fallbackSrc, color, className, lazy }: Props) {
  const id = `mode-tint-${useId()}`;
  const [failedSrc, setFailedSrc] = useState<string>();
  const isFallback = failedSrc === src && !!fallbackSrc;
  const rgb = [1, 3, 5].map(offset => Number.parseInt(color.slice(offset, offset + 2), 16) / 255);
  const tables = rgb.map(channel => `0 ${channel * .33} ${channel * .72} ${channel} 1`);
  return <>
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
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
    </svg>
    <img src={isFallback ? fallbackSrc : src} alt="" draggable={false} decoding="async" loading={lazy ? 'lazy' : undefined}
      className={className} style={isFallback ? undefined : { filter: `url("#${id}")` }}
      onError={() => { if (!isFallback) setFailedSrc(src); }} />
  </>;
}
