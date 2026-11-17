import { Component, Suspense, lazy, useEffect, useRef, useState } from 'react';
import './mode-electric-symbol.css';

// Keep the registry component exact; carousel lifecycle and fallback live here.
const ElectricLogo = lazy(() => import('./ElectricLogo'));
const masks = new Map();
// Existing PNG artwork includes a baked-in aura. Trace its bright ink, not the
// low-contrast aura/background; the original image stays untouched underneath.
function electricMask(src) {
  if (!masks.has(src)) masks.set(src, new Promise(resolve => {
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const fit = 560 / Math.max(image.naturalWidth, image.naturalHeight);
        canvas.width = Math.round(image.naturalWidth * fit);
        canvas.height = Math.round(image.naturalHeight * fit);
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < pixels.data.length; i += 4) {
          const brightness = (pixels.data[i] + pixels.data[i + 1] + pixels.data[i + 2]) / 3;
          pixels.data[i + 3] = brightness > 195 && pixels.data[i + 3] > 100 ? 255 : 0;
          pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = 255;
        }
        ctx.putImageData(pixels, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch { resolve(null); }
    };
    image.onerror = () => resolve(null);
    image.src = src;
  }));
  return masks.get(src);
}
class SymbolBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

export default function ModeElectricSymbol({ src, active }) {
  const root = useRef(null);
  const [allowed, setAllowed] = useState(false);
  const [ready, setReady] = useState(false);
  const [lost, setLost] = useState(false);
  const [mask, setMask] = useState(null);
  const [size, setSize] = useState(1);
  useEffect(() => {
    const element = root.current;
    const resize = () => setSize(Math.min(element.clientWidth, element.clientHeight) / 480);
    const observer = new ResizeObserver(resize);
    observer.observe(element); resize();
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let live = true;
    if (active && allowed) void electricMask(src).then(value => { if (live) setMask(value); });
    return () => { live = false; };
  }, [src, active, allowed]);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setAllowed(!media.matches && !document.hidden);
    update();
    media.addEventListener('change', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      media.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  useEffect(() => {
    setReady(false); setLost(false);
  }, [src, active, allowed]);
  useEffect(() => {
    const element = root.current;
    const fail = () => { setLost(true); setReady(false); };
    element.addEventListener('webglcontextlost', fail, true);
    return () => element.removeEventListener('webglcontextlost', fail, true);
  }, []);
  return <span ref={root} className={`mode-electric-symbol${ready && active && allowed && !lost ? ' is-rendered' : ''}`} aria-hidden="true">
    <img src={src} alt="" draggable={false} className="mode-electric-symbol-fallback" />
    {active && allowed && !lost && mask && <span className="mode-electric-stage" style={{ transform: `translate(-50%, -50%) scale(${size})` }}><SymbolBoundary key={src}><Suspense fallback={null}>
      <ElectricLogo src={mask} color="#ecc7ff" glowColor="#ad6dff" scale={0.7} strands={4} bend={0.6}
        crackle={1.5} arcs={1} speed={2.5} interactive onRender={() => setReady(true)} />
    </Suspense></SymbolBoundary></span>}
  </span>;
}
