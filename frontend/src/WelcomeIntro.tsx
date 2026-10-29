import { useEffect, useId, useLayoutEffect, useReducer, useRef, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { CultivaLeaf } from './CultivaLeaf';
import brandLogo from './assets/modo-cultiva-logo-official.png';
import { getWelcomeMessages, resolveWelcomeLanguage } from './welcomeMessages';
import {
  createWelcomeTimeline, reduceWelcomeTimeline, welcomeNextDelayMs,
  WELCOME_ENTER_MS, WELCOME_EXIT_MS, WELCOME_REDUCED_TRANSITION_MS,
} from './welcomeIntroState';
import './welcome-intro.css';

export type WelcomeIntroProps = {
  language: string;
  onComplete: () => void;
};

/** Decorative brand mark, not a second map or a numbered progress indicator. */
export function WelcomeIntroMark() {
  return <div className="mc-welcome__mark" aria-hidden="true">
    <span className="mc-welcome__halo" />
    <span className="mc-welcome__seed mc-welcome__seed--one" />
    <span className="mc-welcome__seed mc-welcome__seed--two" />
    <span className="mc-welcome__seed mc-welcome__seed--three" />
    <CultivaLeaf />
  </div>;
}

const now = () => performance.now();

/**
 * Mount only after the caller resolves first-visit eligibility. This component
 * never reads account data, persists flags, invokes AI or resets a saved map.
 * Unmount + remount for a genuinely different visitor/account scope.
 */
export function WelcomeIntro({ language, onComplete }: WelcomeIntroProps) {
  const resolvedLanguage = resolveWelcomeLanguage(language);
  const copy = getWelcomeMessages(resolvedLanguage);
  const [timeline, dispatch] = useReducer(reduceWelcomeTimeline, null, () => createWelcomeTimeline(
    copy.messages, typeof performance === 'undefined' ? 0 : now(),
    { hidden: typeof document !== 'undefined' && document.hidden },
  ));
  const rootRef = useRef<HTMLDivElement>(null);
  const pauseRef = useRef<HTMLButtonElement>(null);
  const onCompleteRef = useRef(onComplete);
  const completionSentRef = useRef(false);
  const languageRef = useRef(resolvedLanguage);
  const titleId = useId();
  const phraseId = useId();
  const hintId = useId();
  const finished = timeline.phase === 'complete';

  // Updating callbacks never restarts the clock or repeats completion.
  useLayoutEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  useLayoutEffect(() => {
    if (languageRef.current !== resolvedLanguage) {
      languageRef.current = resolvedLanguage;
      dispatch({ type: 'language', messages: copy.messages, nowMs: now() });
    }
  }, [resolvedLanguage, copy.messages]);

  useEffect(() => {
    if (finished) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onVisibility = () => dispatch({ type: 'visibility', hidden: document.hidden, nowMs: now() });
    const onMotion = () => dispatch({ type: 'motion', reducedMotion: motion.matches, nowMs: now() });
    onVisibility();
    onMotion();
    document.addEventListener('visibilitychange', onVisibility);
    motion.addEventListener('change', onMotion);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      motion.removeEventListener('change', onMotion);
    };
  }, [finished]);

  useEffect(() => {
    const delay = welcomeNextDelayMs(timeline);
    if (delay === null) return;
    const timeout = window.setTimeout(() => {
      // Defend against visibility events delivered after a throttled timeout.
      dispatch(document.hidden
        ? { type: 'visibility', hidden: true, nowMs: now() }
        : { type: 'tick', nowMs: now() });
    }, delay);
    return () => window.clearTimeout(timeout);
  }, [timeline]);

  // The portal stays separate from the actual twelve-card Holista circle.
  // Preserve pre-existing inert/scroll/focus state, including on early unmount.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (finished || !root) return;
    const previousFocus = document.activeElement;
    const scroll = { x: window.scrollX, y: window.scrollY };
    const body = document.body;
    const overflow = body.style.getPropertyValue('overflow');
    const overflowPriority = body.style.getPropertyPriority('overflow');
    const siblings = Array.from(body.children)
      .filter((element): element is HTMLElement => element instanceof HTMLElement && element !== root)
      .map((element) => ({ element, inert: element.inert }));
    for (const { element } of siblings) element.inert = true;
    body.style.setProperty('overflow', 'hidden');
    root.focus({ preventScroll: true });

    const containFocus = (event: FocusEvent) => {
      if (event.target instanceof Node && !root.contains(event.target)) pauseRef.current?.focus({ preventScroll: true });
    };
    document.addEventListener('focusin', containFocus, true);
    return () => {
      document.removeEventListener('focusin', containFocus, true);
      for (const { element, inert } of siblings) element.inert = inert;
      if (overflow) body.style.setProperty('overflow', overflow, overflowPriority);
      else body.style.removeProperty('overflow');
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
      if (window.scrollX !== scroll.x || window.scrollY !== scroll.y) {
        window.scrollTo({ left: scroll.x, top: scroll.y, behavior: 'instant' });
      }
    };
  }, [finished]);

  useEffect(() => {
    if (!finished || completionSentRef.current) return;
    completionSentRef.current = true;
    onCompleteRef.current();
  }, [finished]);

  if (finished || typeof document === 'undefined') return null;
  const phrase = copy.messages[timeline.index];
  const paused = timeline.paused || timeline.hidden;
  const transition = timeline.reducedMotion ? WELCOME_REDUCED_TRANSITION_MS : undefined;
  const style = {
    '--mc-welcome-enter': `${transition ?? WELCOME_ENTER_MS}ms`,
    '--mc-welcome-exit': `${transition ?? WELCOME_EXIT_MS}ms`,
  } as CSSProperties;

  return createPortal(<div
    ref={rootRef}
    className="mc-welcome"
    role="dialog"
    aria-modal="true"
    aria-labelledby={titleId}
    aria-describedby={`${phraseId} ${hintId}`}
    lang={resolvedLanguage}
    dir={resolvedLanguage === 'ar' ? 'rtl' : 'ltr'}
    tabIndex={-1}
    data-phase={timeline.phase}
    data-paused={paused}
    data-reduced-motion={timeline.reducedMotion}
    data-final={timeline.index === copy.messages.length - 1}
    style={style}
    onKeyDown={(event) => {
      event.stopPropagation();
      // Tab stays on the only control. Enter/Space may pause, never advance.
      if (event.key === 'Tab') {
        event.preventDefault();
        pauseRef.current?.focus({ preventScroll: true });
      }
    }}
    onKeyUp={(event) => event.stopPropagation()}
    onClick={(event) => event.stopPropagation()}
    onPointerDown={(event) => event.stopPropagation()}
    onTouchStart={(event) => event.stopPropagation()}
  >
    <h1 id={titleId} className="mc-welcome__sr-only">{copy.title}</h1>
    <div className="mc-welcome__atmosphere" aria-hidden="true" />
    <header className="mc-welcome__header">
      <div className="mc-welcome__brand" aria-hidden="true"><img src={brandLogo} alt="" width="40" height="40" /><span dir="ltr">Modo Cultiva</span></div>
      <button
        ref={pauseRef}
        type="button"
        className="mc-welcome__pause"
        onClick={() => dispatch({ type: 'pause', paused: !timeline.paused, nowMs: now() })}
        aria-controls={phraseId}
      >
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
          {timeline.paused ? <path d="m7 4 8 6-8 6V4Z" fill="currentColor" />
            : <path d="M6 5v10M14 5v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />}
        </svg>
        <span>{timeline.paused ? copy.resume : copy.pause}</span>
      </button>
    </header>
    <main className="mc-welcome__stage">
      <WelcomeIntroMark />
      <div className="mc-welcome__message" data-long={Array.from(phrase).length > 85}>
        <p id={phraseId} className="mc-welcome__phrase" role="status" aria-live="polite" aria-atomic="true">{phrase}</p>
      </div>
      <div className="mc-welcome__flourish" aria-hidden="true"><span /><i /><span /></div>
    </main>
    <footer className="mc-welcome__footer">
      <p id={hintId}>{timeline.paused ? copy.paused : copy.automatic}</p>
    </footer>
  </div>, document.body);
}

export default WelcomeIntro;
