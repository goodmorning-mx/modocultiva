import './mode-electric-symbol.css';
import { PremiumModeArtwork } from './PremiumModeArtwork';

// Static artwork plus two small composited sprites: no canvas or per-frame JS.
export default function ModeElectricSymbol({ src, fallbackSrc, active, color }) {
  return <span className="mode-electric-symbol" aria-hidden="true">
    <PremiumModeArtwork src={src} fallbackSrc={fallbackSrc} color={color} className="mode-electric-symbol-fallback" />
    {active && <span className="global-sparks global-sparks--symbol" />}
  </span>;
}
