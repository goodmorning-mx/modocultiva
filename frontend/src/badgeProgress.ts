export const BADGE_MODES = ['fisico', 'intelectual', 'emocional', 'arquetipico', 'espiritual', 'romantico', 'familiar', 'social', 'financiero', 'profesional', 'ludico', 'visionario'] as const;
export const COMPLETION_TARGET = 120;
export type ActivityCompletions = Record<string, string>;
const validSlot = (key: string) => BADGE_MODES.some(mode => new RegExp(`^${mode}-[0-9]$`).test(key));

// A confirmation belongs to this particular activity, not merely to an occupied slot.
// No activity text is duplicated in the completion ledger.
export function completionToken(activity: string): string {
  let a = 2166136261; let b = 5381;
  for (const char of activity.trim()) {
    a = Math.imul(a ^ char.codePointAt(0)!, 16777619);
    b = Math.imul(b, 33) ^ char.codePointAt(0)!;
  }
  return `${(a >>> 0).toString(16).padStart(8, '0')}${(b >>> 0).toString(16).padStart(8, '0')}`;
}

export function cleanCompletions(value: unknown): ActivityCompletions {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([key, token]) => validSlot(key) && typeof token === 'string' && /^[a-f0-9]{16}$/.test(token)));
}

export function isActivityCompleted(slot: string, activity: unknown, ledger: ActivityCompletions): boolean {
  return validSlot(slot) && !slot.endsWith('-9') && typeof activity === 'string' && Boolean(activity.trim()) && ledger[slot] === completionToken(activity);
}

export function toggleActivityCompletion(slot: string, activity: string, ledger: ActivityCompletions): ActivityCompletions {
  const next = cleanCompletions(ledger);
  if (!validSlot(slot) || slot.endsWith('-9') || !activity.trim()) return next;
  if (isActivityCompleted(slot, activity, next)) delete next[slot];
  else next[slot] = completionToken(activity);
  return next;
}

// Existing uploaded visions count too; no completion ledger or extra activity is
// needed for level 9. New uploads are decoded and persisted before reaching here.
export function hasVisionImage(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const image = value.trim();
  return /^data:image\/[a-z0-9.+-]+(?:;[^,]*)?,[\s\S]+$/i.test(image) || /^https?:\/\/[^\s]+$/i.test(image);
}

export function badgeProgress(drafts: Record<string, unknown>, ledger: ActivityCompletions, levels: Record<string, unknown>, visionImages: Record<string, unknown> = {}) {
  const perMode = Object.fromEntries(BADGE_MODES.map(mode => [mode, Array.from({ length: 10 }, (_, level) => {
    const slot = `${mode}-${level}`;
    return level === 9 ? hasVisionImage(visionImages[mode]) : isActivityCompleted(slot, drafts[slot], ledger);
  })]));
  const completed = Object.values(perMode).flat().filter(Boolean).length;
  const maxedModes = BADGE_MODES.filter(mode => levels[mode] === 9).length;
  return { perMode, completed, completionist: completed === COMPLETION_TARGET, maxedModes, maxed: maxedModes === BADGE_MODES.length };
}

export function eligibleFeaturedBadges(saved: readonly unknown[], earnedKeys: readonly string[]): string[] {
  return [...new Set(saved.filter((key): key is string => typeof key === 'string' && earnedKeys.includes(key)))].slice(0, 3);
}
