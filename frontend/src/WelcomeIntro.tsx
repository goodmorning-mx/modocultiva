import { useEffect, useId, useLayoutEffect, useReducer, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { CultivaLeaf } from './CultivaLeaf';
import brandLogo from './assets/modo-cultiva-logo-electric.webp';
import { getWelcomeMessages, resolveWelcomeLanguage, WELCOME_LANGUAGES, type WelcomeLanguage } from './welcomeMessages';
import { isPwaRunningStandalone, requestPwaInstall } from './PwaControls';
import {
  createWelcomeTimeline, reduceWelcomeTimeline, welcomeNextDelayMs,
  WELCOME_ENTER_MS, WELCOME_EXIT_MS, WELCOME_REDUCED_TRANSITION_MS,
} from './welcomeIntroState';
import './welcome-intro.css';

export type WelcomeIntroProps = {
  language: string;
  onLanguageChange: (language: string) => void;
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
const languageNames: Record<WelcomeLanguage, string> = {
  es: 'Español', en: 'English', zh: '中文', hi: 'हिन्दी', ar: 'العربية',
  it: 'Italiano', pt: 'Português', ru: 'Русский', de: 'Deutsch', fr: 'Français', da: 'Dansk',
};

/**
 * Mount only after the caller resolves first-visit eligibility. This component
 * never reads account data, persists flags, invokes AI or resets a saved map.
 * Unmount + remount for a genuinely different visitor/account scope.
 */
export function WelcomeIntro({ language, onLanguageChange, onComplete }: WelcomeIntroProps) {
  const resolvedLanguage = resolveWelcomeLanguage(language);
  const copy = getWelcomeMessages(resolvedLanguage);
  const [timeline, dispatch] = useReducer(reduceWelcomeTimeline, null, () => createWelcomeTimeline(
    copy.messages, typeof performance === 'undefined' ? 0 : now(),
    { hidden: typeof document !== 'undefined' && document.hidden },
  ));
  const [started, setStarted] = useState(isPwaRunningStandalone);
  const [installState, setInstallState] = useState<'idle' | 'requesting' | 'help' | 'installed'>('idle');
  const rootRef = useRef<HTMLDivElement>(null);
  const pauseRef = useRef<HTMLButtonElement>(null);
  const onCompleteRef = useRef(onComplete);
  const completionSentRef = useRef(false);
  const languageRef = useRef(resolvedLanguage);
  const languageChangeRef = useRef(onLanguageChange);
  const titleId = useId();
  const phraseId = useId();
  const hintId = useId();
  const installTitleId = useId();
  const installHintId = useId();
  const finished = timeline.phase === 'complete';

  // Updating callbacks never restarts the clock or repeats completion.
  useLayoutEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  useLayoutEffect(() => { languageChangeRef.current = onLanguageChange; }, [onLanguageChange]);
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
    if (!started) return;
    const delay = welcomeNextDelayMs(timeline);
    if (delay === null) return;
    const timeout = window.setTimeout(() => {
      // Defend against visibility events delivered after a throttled timeout.
      dispatch(document.hidden
        ? { type: 'visibility', hidden: true, nowMs: now() }
        : { type: 'tick', nowMs: now() });
    }, delay);
    return () => window.clearTimeout(timeout);
  }, [timeline, started]);

  useEffect(() => {
    if (started) return;
    const onInstalled = () => setInstallState('installed');
    window.addEventListener('appinstalled', onInstalled);
    return () => window.removeEventListener('appinstalled', onInstalled);
  }, [started]);

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
    aria-labelledby={started ? titleId : installTitleId}
    aria-describedby={started ? `${phraseId} ${hintId}` : installHintId}
    lang={resolvedLanguage}
    dir={resolvedLanguage === 'ar' ? 'rtl' : 'ltr'}
    tabIndex={-1}
    data-phase={started ? timeline.phase : 'install'}
    data-paused={paused}
    data-reduced-motion={timeline.reducedMotion}
    data-final={timeline.index === copy.messages.length - 1}
    style={style}
    onKeyDown={(event) => {
      event.stopPropagation();
      if (event.key === 'Tab') {
        event.preventDefault();
        const controls = Array.from(rootRef.current?.querySelectorAll<HTMLElement>('.mc-welcome__install-action:not(:disabled), .mc-welcome__browser-action, .mc-welcome__language select, .mc-welcome__pause') ?? []);
        const currentIndex = controls.indexOf(document.activeElement as HTMLElement);
        const nextIndex = event.shiftKey
          ? (currentIndex <= 0 ? controls.length - 1 : currentIndex - 1)
          : (currentIndex < 0 || currentIndex === controls.length - 1 ? 0 : currentIndex + 1);
        controls[nextIndex]?.focus({ preventScroll: true });
      } else if (started && (event.key === 'ArrowRight' || event.key === 'ArrowLeft') && !event.repeat
        && !(event.target instanceof Element && event.target.closest('button, select, input, textarea'))) {
        event.preventDefault();
        dispatch({ type: event.key === 'ArrowRight' ? 'advance' : 'retreat', nowMs: now() });
      }
    }}
    onKeyUp={(event) => event.stopPropagation()}
    onClick={(event) => {
      event.stopPropagation();
      if (!started) return;
      if (event.target instanceof Element && event.target.closest('.mc-welcome__language, .mc-welcome__pause')) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      const position = (event.clientX - bounds.left) / bounds.width;
      if (position <= .2) dispatch({ type: 'retreat', nowMs: now() });
      else if (position >= .8) dispatch({ type: 'advance', nowMs: now() });
    }}
    onPointerDown={(event) => event.stopPropagation()}
    onTouchStart={(event) => event.stopPropagation()}
  >
    <h1 id={titleId} className="mc-welcome__sr-only">{copy.title}</h1>
    <div className="mc-welcome__atmosphere" aria-hidden="true" />
    {!started ? <main className="mc-welcome__install-gate">
      <img className="mc-welcome__gate-logo" src={brandLogo} alt="" width="64" height="64" />
      <h2 id={installTitleId}>{copy.installTitle}</h2>
      <p id={installHintId} aria-live="polite">{installState === 'installed' ? copy.openInstalledApp : copy.installDescription}</p>
      {installState === 'help' && <div className="mc-welcome__install-help" role="status"><p>{copy.installUnavailable}</p><ol>{copy.installHelp.map((step) => <li key={step}>{step}</li>)}</ol></div>}
      {installState !== 'installed' && <button type="button" className="mc-welcome__continue mc-welcome__install-action" disabled={installState === 'requesting'} onClick={async () => {
        setInstallState('requesting');
        try {
          const outcome = await requestPwaInstall();
          setInstallState(current => current === 'installed' || outcome === 'accepted' ? 'installed' : outcome === 'unavailable' ? 'help' : 'idle');
        } catch {
          setInstallState(current => current === 'installed' ? current : 'help');
        }
      }}>{copy.installAction}</button>}
      <button type="button" className="mc-welcome__browser-action" onClick={() => {
        dispatch({ type: 'start', nowMs: now() });
        setStarted(true);
      }}>{copy.continueInBrowser}</button>
    </main> : <>
    <header className="mc-welcome__header">
      <div className="mc-welcome__brand" aria-hidden="true"><img src={brandLogo} alt="" width="40" height="40" /><span dir="ltr">Modo Cultiva</span></div>
      <div className="mc-welcome__controls">
        <label className="mc-welcome__language">
          <span className="mc-welcome__sr-only">{copy.languageLabel}</span>
          <select value={resolvedLanguage} aria-label={copy.languageLabel}
            onChange={(event) => languageChangeRef.current(event.target.value)}>
            {WELCOME_LANGUAGES.map((code) => <option key={code} value={code} lang={code}>{languageNames[code]}</option>)}
          </select>
          <svg viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="m3 4.5 3 3 3-3" /></svg>
        </label>
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
      </div>
    </header>
    <span className="mc-welcome__edge-cue mc-welcome__edge-cue--previous" aria-hidden="true">‹</span>
    <span className="mc-welcome__edge-cue mc-welcome__edge-cue--next" aria-hidden="true">›</span>
    <main className="mc-welcome__stage">
      <WelcomeIntroMark />
      <div className="mc-welcome__message" data-long={Array.from(phrase).length > 85}>
        <p id={phraseId} className="mc-welcome__phrase" role="status" aria-live="polite" aria-atomic="true">{phrase}</p>
      </div>
      <div className="mc-welcome__flourish" aria-hidden="true"><span /><i /><span /></div>
    </main>
    </>}
    {started && <footer className="mc-welcome__footer">
      <p id={hintId}>{timeline.paused ? copy.paused : copy.automatic}</p>
    </footer>}
  </div>, document.body);
}

export default WelcomeIntro;
