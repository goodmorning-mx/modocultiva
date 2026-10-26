export const CULTIVA_MAX_LEVEL = 99;
const MODE_MAX_LEVEL = 9;

// Each life mode still has ten integer positions (0–9). Scale their raw sum,
// not the previously rounded average, so the overall level ends exactly at 99.
// Normalization is calculation-only; it never rewrites saved mode values.
export function calculateCultivaLevel(modeLevels: readonly unknown[]): number {
  if (!modeLevels.length) return 0;
  const total = modeLevels.reduce<number>((sum, value) => sum + (
    typeof value === 'number' && Number.isFinite(value)
      ? Math.max(0, Math.min(MODE_MAX_LEVEL, Math.trunc(value)))
      : 0
  ), 0);
  return Number(((total * CULTIVA_MAX_LEVEL) / (modeLevels.length * MODE_MAX_LEVEL)).toFixed(1));
}
