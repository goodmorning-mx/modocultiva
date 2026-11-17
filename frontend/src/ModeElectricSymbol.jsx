import './mode-electric-symbol.css';

// Static artwork plus two small composited sprites: no canvas or per-frame JS.
export default function ModeElectricSymbol({ src, fallbackSrc, active }) {
  return <span className="mode-electric-symbol" aria-hidden="true">
    <img src={src} alt="" draggable={false} decoding="async" className="mode-electric-symbol-fallback"
      onError={({ currentTarget }) => {
        if (fallbackSrc && currentTarget.getAttribute('src') !== fallbackSrc) currentTarget.src = fallbackSrc;
      }} />
    {active && <span className="global-sparks global-sparks--symbol" />}
  </span>;
}
