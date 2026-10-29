import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';

// Fixed positions keep artwork stable across renders, hydration and exports.
const sparks = [
  [-70, 18, 2.1, 0, 6.8], [-52, 53, 1.3, -3.4, 8.2], [-31, 73, 1.7, -1.8, 7.6],
  [5, 61, 1.1, -5.2, 9], [34, 68, 1.8, -4.6, 7.2], [61, 34, 1.3, -2.1, 8.6],
  [76, 8, 2, -5.8, 7.8], [57, -31, 1.1, -3.8, 9.2], [-62, -27, 1.5, -2.8, 8.4],
  [-14, 82, 1, -6.4, 9.6], [24, -58, 1.3, -1, 8], [-42, -49, 1, -4.2, 7.4],
];

export function BadgeMedal({ badgeKey, icon, small = false }: { badgeKey: string; icon: string; small?: boolean }) {
  const id = useId().replace(/:/g, '');
  const artwork = useRef<SVGSVGElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const element = artwork.current;
    if (!element || small || typeof IntersectionObserver === 'undefined') return;
    let inViewport = false;
    const update = () => setVisible(inViewport && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => { inViewport = entry.isIntersecting; update(); });
    observer.observe(element);
    document.addEventListener('visibilitychange', update);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', update); };
  }, [badgeKey, small]);
  if (badgeKey !== 'completionist' && badgeKey !== 'maxed') return <span className="achievement-medal achievement-medal--regular" aria-hidden="true">{icon}</span>;
  const maxed = badgeKey === 'maxed';
  return <svg ref={artwork} className={`achievement-medal achievement-medal--premium achievement-medal--${badgeKey}${small ? ' achievement-medal--small' : ''}`} data-motion={visible ? 'active' : 'paused'} viewBox="0 0 160 160" fill="none" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={`${id}-metal`} x1="30" y1="15" x2="122" y2="145" gradientUnits="userSpaceOnUse">
        <stop stopColor={maxed ? '#ffffff' : '#fff0b9'} /><stop offset=".28" stopColor={maxed ? '#aebfcd' : '#d9b765'} /><stop offset=".49" stopColor={maxed ? '#f5fcff' : '#fff1ba'} /><stop offset=".7" stopColor={maxed ? '#6489a9' : '#88662c'} /><stop offset="1" stopColor={maxed ? '#cceaff' : '#e2c879'} />
      </linearGradient>
      <radialGradient id={`${id}-face`}><stop stopColor={maxed ? '#3a586e' : '#384432'} /><stop offset="1" stopColor="#0c2029" /></radialGradient>
    </defs>
    {!small && <g className="achievement-sparks" fill={maxed ? '#e9f8ff' : '#ffe6a0'}>
      {sparks.map(([x, y, radius, delay, duration], i) => <g key={i} className="achievement-spark" style={{ '--spark-x': `${x}px`, '--spark-y': `${y}px`, '--spark-drift': `${x * .16}px`, '--spark-delay': `${delay}s`, '--spark-duration': `${duration}s` } as CSSProperties}><circle cx="80" cy="80" r={radius} /></g>)}
    </g>}
    {!small && <g className="achievement-energy" stroke={maxed ? '#aadfff' : '#f0cc76'} strokeWidth=".7" opacity=".45"><ellipse cx="80" cy="80" rx="78" ry="70" /><ellipse cx="80" cy="80" rx="73" ry="78" strokeDasharray="14 36 3 47" /></g>}
    {maxed ? <>
      <path d="M80 7 125 28 151 80 125 132 80 153 35 132 9 80 35 28Z" fill={`url(#${id}-metal)`} />
      <path d="M80 15 120 34 142 80 120 126 80 145 40 126 18 80 40 34Z" fill={`url(#${id}-face)`} stroke="#e9f7ff" strokeOpacity=".8" />
      <path d="m80 24 33 17 19 39-19 39-33 17-33-17-19-39 19-39Z" stroke={`url(#${id}-metal)`} strokeWidth=".7" />
      <path d="m61 48 5 10h28l5-10-12 6-7-14-7 14Z" fill={`url(#${id}-metal)`} />
      <path d="m80 117 4 8-4 8-4-8Z" fill={`url(#${id}-metal)`} />
    </> : <>
      <circle cx="80" cy="80" r="69" fill={`url(#${id}-metal)`} />
      <circle cx="80" cy="80" r="63" fill={`url(#${id}-face)`} stroke="#f4dda0" strokeOpacity=".7" />
      <circle cx="80" cy="80" r="51" stroke={`url(#${id}-metal)`} strokeWidth=".7" />
      {Array.from({ length: 12 }, (_, i) => <g key={i} transform={`rotate(${i * 30} 80 80)`}><path d="M80 0 84 9 80 17 76 9Z" fill={`url(#${id}-metal)`} /><circle cx="80" cy="24" r="1.6" fill="#f5df9a" /></g>)}
      <path d="M54 108c-13-11-15-32-5-43m57 43c13-11 15-32 5-43" stroke={`url(#${id}-metal)`} strokeWidth="2" />
      <path d="m45 75-9-7 2 13 9 5m-2 4-8-4 4 13 9 2m65-26 9-7-2 13-9 5m2 4 8-4-4 13-9 2" fill={`url(#${id}-metal)`} />
      <path d="m80 39 3 6-3 6-3-6Z" fill="#f5dfa7" />
    </>}
    <text x="80" y={maxed ? '99' : '98'} fill={`url(#${id}-metal)`} textAnchor="middle" fontFamily="Manrope, sans-serif" fontWeight="600" fontSize={maxed ? '46' : '35'} letterSpacing="-2">{maxed ? '99' : '120'}</text>
    <path d="M67 116h26" stroke={`url(#${id}-metal)`} strokeWidth="1" />
  </svg>;
}
