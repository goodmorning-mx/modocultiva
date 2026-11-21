export const VISIONARY_ELECTRIC_ART = '/mode-symbols/visionario-telescopio-electrico.webp';

// Optical correction for the electric telescope only. Its silver/white source
// highlights otherwise wash the journey's indigo into icy blue on the Home green.
// Keep colored, luminous peaks instead of mapping the brightest pixels to white.
const visionaryIndigoStops = ['#000000', '#2B1E54', '#5F4AAE', '#9880EA', '#C0ACFF', '#E3D5FF'];

export function electricArtworkTint(src: string, color: string): string[] {
  if (src === VISIONARY_ELECTRIC_ART) {
    return [1, 3, 5].map(offset => visionaryIndigoStops
      .map(stop => Number.parseInt(stop.slice(offset, offset + 2), 16) / 255).join(' '));
  }
  return [1, 3, 5].map(offset => {
    const channel = Number.parseInt(color.slice(offset, offset + 2), 16) / 255;
    return `0 ${channel * .33} ${channel * .72} ${channel} 1`;
  });
}
