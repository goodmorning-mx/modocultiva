/** Geometry and contracts only. Distinct stem avoids case-insensitive TS/TSX resolution on Windows. */
export const TOUR_METHODS = ['custom', 'bank', 'ai', 'localContacts'] as const;
export type TourMethod = typeof TOUR_METHODS[number];
export type TourRect = { left: number; top: number; width: number; height: number };
export type TourTarget = string | {
  selector: string;
  /** A selector can highlight many live nodes. Use 12 for the Holista buttons. */
  minMatches?: number;
  /** An interaction is a visit candidate, not proof the destination was mounted. */
  method?: TourMethod;
};
export type TourUnavailableReason = 'missing' | 'invalid-selector' | 'unsafe-target' | 'navigation-error' | 'no-room';
export type TourEntryContext = { stepId: string; signal: AbortSignal };
type StepContent = {
  id: string;
  title: string;
  body: string;
  instructions?: string;
  /** Pass the exact next description from clarityTransition/server-owned rubric. Never invent it. */
  clarityTarget?: { level: number; description: string };
  onEnter?: (context: TourEntryContext) => void | Promise<void>;
  /** Showing this checklist also gates Next on all FOUR externally confirmed visits. */
  methodChecklist?: boolean;
  nextDisabled?: boolean;
  nextDisabledReason?: string;
};
export type GuidedTourStep = StepContent & (
  { target: TourTarget; targets?: never } | { targets: readonly TourTarget[]; target?: never }
);
export type TourInteraction = {
  stepId: string;
  selector: string;
  element: Element;
  method?: TourMethod;
  /** Original trusted click/change, never a synthetic completion or approval. */
  event: Event;
};

export function tourTargets(step: GuidedTourStep): readonly TourTarget[] {
  return step.targets ?? (step.target ? [step.target] : []);
}
export function targetSelector(target: TourTarget): string {
  return typeof target === 'string' ? target : target.selector;
}
export function allTourMethodsVisited(visited: readonly TourMethod[]): boolean {
  return TOUR_METHODS.every(method => visited.includes(method));
}
export function tourNextDisabled(step: GuidedTourStep, visited: readonly TourMethod[], ready: boolean): boolean {
  return !ready || Boolean(step.nextDisabled) || Boolean(step.methodChecklist && !allTourMethodsVisited(visited));
}
export function clipTourRect(rect: TourRect, bounds: TourRect): TourRect | null {
  const left = Math.max(rect.left, bounds.left);
  const top = Math.max(rect.top, bounds.top);
  const right = Math.min(rect.left + rect.width, bounds.left + bounds.width);
  const bottom = Math.min(rect.top + rect.height, bounds.top + bounds.height);
  return right > left && bottom > top ? { left, top, width: right - left, height: bottom - top } : null;
}

/** Sweep the UNION of holes; overlapping targets must never turn each other dark. */
export function tourBlackoutRects(width: number, height: number, targets: readonly TourRect[]): TourRect[] {
  const viewport = { left: 0, top: 0, width, height };
  const holes = targets.map(rect => clipTourRect(rect, viewport)).filter((rect): rect is TourRect => Boolean(rect));
  const edges = [...new Set([0, height, ...holes.flatMap(rect => [rect.top, rect.top + rect.height])])].sort((a, b) => a - b);
  const dark: TourRect[] = [];
  for (let i = 0; i < edges.length - 1; i++) {
    const top = edges[i]; const bottom = edges[i + 1]; let x = 0;
    const intervals = holes.filter(rect => rect.top < bottom && rect.top + rect.height > top)
      .map(rect => [rect.left, rect.left + rect.width]).sort((a, b) => a[0] - b[0]);
    for (const [left, right] of intervals) {
      if (left > x) dark.push({ left: x, top, width: left - x, height: bottom - top });
      x = Math.max(x, right);
    }
    if (x < width) dark.push({ left: x, top, width: width - x, height: bottom - top });
  }
  return dark;
}

/** Locate a readable panel in DARK space, never over a live click target. */
export function placeTourPanel(width: number, height: number, holes: readonly TourRect[], rtl = false): TourRect | null {
  const margin = 8; const gap = 8;
  const availableWidth = width - 2 * margin;
  if (availableWidth <= 0 || height < 72) return null;
  const minHeight = Math.min(148, height - 2 * margin);
  const widths = [...new Set([384, 336, 288, 240, 208].map(value => Math.min(value, availableWidth)))];
  let best: TourRect | null = null; let score = -Infinity;
  for (const w of widths) {
    const xs = [...new Set([margin, width - margin - w, ...holes.flatMap(rect => [rect.left - gap - w, rect.left + rect.width + gap])])];
    for (const left of xs) {
      if (left < margin || left + w > width - margin) continue;
      const blocked = holes.filter(rect => rect.left - gap < left + w && rect.left + rect.width + gap > left)
        .map(rect => [Math.max(margin, rect.top - gap), Math.min(height - margin, rect.top + rect.height + gap)])
        .sort((a, b) => a[0] - b[0]);
      let y = margin;
      for (const [start, end] of [...blocked, [height - margin, height - margin]]) {
        const h = Math.min(360, start - y);
        if (h >= minHeight) {
          const top = start - h;
          const candidateScore = w * Math.min(h, 310) + top * 4 + (rtl ? -left : left);
          if (candidateScore > score) { best = { left, top, width: w, height: h }; score = candidateScore; }
        }
        y = Math.max(y, end);
      }
    }
  }
  return best;
}

export type ResolvedTourTargets = {
  elements: Element[];
  matches: { element: Element; target: TourTarget }[];
  reason?: TourUnavailableReason;
};
/** Require every selector/minimum. Empty, invalid and page-root targets fail CLOSED. */
export function resolveTourTargets(targets: readonly TourTarget[], scope: Document): ResolvedTourTargets {
  const matches: ResolvedTourTargets['matches'] = [];
  if (!targets.length) return { elements: [], matches, reason: 'missing' };
  for (const target of targets) {
    const selector = targetSelector(target).trim();
    if (!selector) return { elements: [], matches: [], reason: 'invalid-selector' };
    let elements: Element[];
    try { elements = Array.from(scope.querySelectorAll(selector)); }
    catch { return { elements: [], matches: [], reason: 'invalid-selector' }; }
    const minimum = typeof target === 'string' ? 1 : target.minMatches ?? 1;
    if (!Number.isInteger(minimum) || minimum < 1) return { elements: [], matches: [], reason: 'invalid-selector' };
    if (elements.length < minimum) return { elements: [], matches: [], reason: 'missing' };
    for (const element of elements) {
      if (element === scope.body || element === scope.documentElement) return { elements: [], matches: [], reason: 'unsafe-target' };
      matches.push({ element, target });
    }
  }
  return { elements: [...new Set(matches.map(match => match.element))], matches };
}
