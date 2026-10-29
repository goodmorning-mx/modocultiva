/** Only welcome flags belong here. Never read, migrate, or write a person's map. */
export type WelcomeIntroScope =
  | { kind: 'guest'; visitorId: string }
  | { kind: 'account'; organizationId: string; accountId: string };

export type WelcomeIntroAudience =
  | { status: 'pending' | 'unavailable' }
  | { status: 'ready'; scope: WelcomeIntroScope };

export type WelcomeIntroStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};
export type WelcomeCompletion = 'complete' | 'incomplete' | 'unavailable';
export type WelcomeIntroDecision = 'wait' | 'show' | 'skip';
export const WELCOME_INTRO_STORAGE_PREFIX = 'modo-cultiva:welcome-intro:v1:';
const COMPLETION_RECORD = JSON.stringify({ version: 1, completed: true });

/** Stable opaque IDs, never names/emails. Guest and account flags cannot collide. */
export function welcomeIntroStorageKey(scope: WelcomeIntroScope): string | null {
  const parts = scope.kind === 'guest' ? [scope.visitorId] : [scope.organizationId, scope.accountId];
  if (parts.some((part) => typeof part !== 'string' || !part.trim())) return null;
  try {
    return `${WELCOME_INTRO_STORAGE_PREFIX}${scope.kind}:${parts.map(encodeURIComponent).join(':')}`;
  } catch {
    return null; // Malformed Unicode IDs must not break account hydration.
  }
}

export function parseWelcomeIntroCompletion(raw: string | null): WelcomeCompletion {
  if (raw === null) return 'incomplete';
  try {
    const value: unknown = JSON.parse(raw);
    return value !== null && typeof value === 'object' && 'version' in value && value.version === 1
      && 'completed' in value && value.completed === true ? 'complete' : 'incomplete';
  } catch {
    return 'incomplete';
  }
}

export function readWelcomeIntroCompletion(
  storage: Pick<WelcomeIntroStorage, 'getItem'> | null | undefined,
  scope: WelcomeIntroScope,
): WelcomeCompletion {
  const key = welcomeIntroStorageKey(scope);
  if (!key || !storage) return 'unavailable';
  try {
    return parseWelcomeIntroCompletion(storage.getItem(key));
  } catch {
    return 'unavailable';
  }
}

/** A saved map is not proof of seeing the introduction. Wait for identity hydration,
 * then skip only an explicitly completed welcome in that visitor/account scope. */
export function decideWelcomeIntro(audience: WelcomeIntroAudience, completion: WelcomeCompletion): WelcomeIntroDecision {
  if (audience.status !== 'ready') return 'wait';
  if (!welcomeIntroStorageKey(audience.scope)) return 'wait';
  return completion === 'complete' ? 'skip' : 'show';
}

/** Call only on completion. A false result requires an in-memory session guard. */
export function markWelcomeIntroComplete(
  storage: Pick<WelcomeIntroStorage, 'setItem'> | null | undefined,
  scope: WelcomeIntroScope,
): boolean {
  const key = welcomeIntroStorageKey(scope);
  if (!key || !storage) return false;
  try {
    storage.setItem(key, COMPLETION_RECORD);
    return true;
  } catch {
    return false;
  }
}

export const WELCOME_ENTER_MS = 680;
export const WELCOME_EXIT_MS = 480;
export const WELCOME_REDUCED_TRANSITION_MS = 160;
export const WELCOME_MIN_READ_MS = 4_500;
export const WELCOME_MAX_READ_MS = 18_000;

/** Word + Unicode-character pacing also works for text without word spaces. */
export function welcomeReadDurationMs(text: string): number {
  const words = text.trim().split(/\s+/u).filter(Boolean).length;
  const characters = Array.from(text.replace(/\s/gu, '')).length;
  const cjk = (text.match(/[\u3040-\u30ff\u3400-\u9fff]/gu) ?? []).length;
  return Math.min(WELCOME_MAX_READ_MS, Math.max(WELCOME_MIN_READ_MS,
    Math.ceil(1_600 + Math.max(words * 360, characters * 60, cjk * 200))));
}

export type WelcomePhase = 'enter' | 'read' | 'exit' | 'complete';
export type WelcomeTimeline = Readonly<{
  index: number;
  phase: WelcomePhase;
  remainingMs: number;
  sampledAtMs: number;
  readingMs: readonly number[];
  paused: boolean;
  hidden: boolean;
  reducedMotion: boolean;
}>;

export type WelcomeTimelineEvent =
  | { type: 'tick'; nowMs: number }
  | { type: 'pause'; paused: boolean; nowMs: number }
  | { type: 'visibility'; hidden: boolean; nowMs: number }
  | { type: 'motion'; reducedMotion: boolean; nowMs: number }
  | { type: 'language'; messages: readonly string[]; nowMs: number };

function transitionMs(phase: 'enter' | 'exit', reducedMotion: boolean): number {
  return reducedMotion ? WELCOME_REDUCED_TRANSITION_MS : phase === 'enter' ? WELCOME_ENTER_MS : WELCOME_EXIT_MS;
}

export function createWelcomeTimeline(
  messages: readonly string[],
  nowMs: number,
  options: { hidden?: boolean; reducedMotion?: boolean } = {},
): WelcomeTimeline {
  if (!messages.length) throw new RangeError('Welcome messages must not be empty.');
  const reducedMotion = options.reducedMotion ?? false;
  return {
    index: 0, phase: 'enter', remainingMs: transitionMs('enter', reducedMotion),
    sampledAtMs: Number.isFinite(nowMs) ? nowMs : 0,
    readingMs: messages.map(welcomeReadDurationMs),
    paused: false, hidden: options.hidden ?? false, reducedMotion,
  };
}

function sampleWelcomeTime(state: WelcomeTimeline, nowMs: number): WelcomeTimeline {
  const sampledAtMs = Number.isFinite(nowMs) ? Math.max(state.sampledAtMs, nowMs) : state.sampledAtMs;
  const elapsed = state.paused || state.hidden ? 0 : sampledAtMs - state.sampledAtMs;
  return { ...state, sampledAtMs, remainingMs: Math.max(0, state.remainingMs - elapsed) };
}

/**
 * One automatic phase at a time: a throttled callback must never fast-forward
 * unread phrases. Pause/visibility changes consume only time actually visible.
 * No advance/skip event is exposed to input handlers.
 */
export function reduceWelcomeTimeline(state: WelcomeTimeline, event: WelcomeTimelineEvent): WelcomeTimeline {
  if (state.phase === 'complete') return state;
  const next = sampleWelcomeTime(state, event.nowMs);
  if (event.type === 'pause') return { ...next, paused: event.paused };
  if (event.type === 'visibility') return { ...next, hidden: event.hidden };
  if (event.type === 'motion') {
    return { ...next, reducedMotion: event.reducedMotion,
      remainingMs: next.phase === 'read' ? next.remainingMs
        : Math.min(next.remainingMs, transitionMs(next.phase as 'enter' | 'exit', event.reducedMotion)) };
  }
  if (event.type === 'language') {
    if (event.messages.length !== state.readingMs.length) throw new RangeError('A language change must keep the same sequence.');
    // The current translated phrase gets its full reading time, not a replay.
    return { ...next, phase: 'enter', readingMs: event.messages.map(welcomeReadDurationMs),
      remainingMs: transitionMs('enter', next.reducedMotion) };
  }
  if (next.paused || next.hidden || next.remainingMs > 0) return next;
  if (next.phase === 'enter') return { ...next, phase: 'read', remainingMs: next.readingMs[next.index] };
  if (next.phase === 'read') return { ...next, phase: 'exit', remainingMs: transitionMs('exit', next.reducedMotion) };
  if (next.index + 1 < next.readingMs.length) {
    return { ...next, index: next.index + 1, phase: 'enter', remainingMs: transitionMs('enter', next.reducedMotion) };
  }
  return { ...next, phase: 'complete', remainingMs: 0 };
}

export function welcomeNextDelayMs(state: WelcomeTimeline): number | null {
  return state.phase === 'complete' || state.paused || state.hidden ? null : state.remainingMs;
}
