import { useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CultivaLeaf } from './CultivaLeaf';
import { stateAccountCopy } from './stateAccountMessages';
import './state-account.css';

export type StateAccountPhase = 'loading' | 'error' | 'consent' | 'signing-out' | 'logout-error';
export function StateAccountBoundary({ language, phase, accountLabel, onRetry, onSignOut, onStay, onChoice }: {
  language: string; phase: StateAccountPhase; accountLabel?: string;
  onRetry: () => void; onSignOut: () => void; onStay: () => void;
  onChoice: (choice: 'import' | 'cloud-only') => void;
}) {
  const copy = stateAccountCopy(language);
  const [owned, setOwned] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const titleId = useId(), hintId = useId();
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const focused = document.activeElement;
    const overflow = document.body.style.overflow;
    const siblings = Array.from(document.body.children).filter((item): item is HTMLElement => item instanceof HTMLElement && item !== root).map(item => [item, item.inert] as const);
    for (const [item] of siblings) item.inert = true;
    document.body.style.overflow = 'hidden'; root.focus({ preventScroll: true });
    const contain = (event: FocusEvent) => { if (event.target instanceof Node && !root.contains(event.target)) root.focus({ preventScroll: true }); };
    document.addEventListener('focusin', contain, true);
    return () => {
      document.removeEventListener('focusin', contain, true);
      for (const [item, inert] of siblings) item.inert = inert;
      document.body.style.overflow = overflow;
      if (focused instanceof HTMLElement && focused.isConnected) focused.focus({ preventScroll: true });
    };
  }, []);
  const busy = phase === 'loading' || phase === 'signing-out';
  const title = phase === 'consent' ? copy.legacyTitle : phase === 'signing-out' ? copy.signingOut : phase === 'logout-error' ? copy.logoutError : phase === 'error' ? copy.error : copy.loading;
  const hint = phase === 'consent' ? copy.legacyHint : phase === 'signing-out' ? copy.signingOutHint : phase === 'logout-error' ? copy.saveFailed : phase === 'error' ? copy.errorHint : copy.loadingHint;
  return createPortal(<div ref={rootRef} className="state-account-boundary" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={hintId} lang={language} dir={language === 'ar' ? 'rtl' : 'ltr'} tabIndex={-1}
    onClick={event => event.stopPropagation()} onKeyDown={event => {
      event.stopPropagation();
      if (event.key === 'Tab') {
        const targets = Array.from(rootRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)') ?? []);
        const index = targets.indexOf(document.activeElement as HTMLElement);
        const next = index < 0 ? (event.shiftKey ? targets.length - 1 : 0)
          : (index + (event.shiftKey ? -1 : 1) + targets.length) % targets.length;
        event.preventDefault(); (targets[next] ?? rootRef.current)?.focus();
      }
      if (event.key === 'Escape') event.preventDefault();
    }}>
    <section className="state-account-card" aria-busy={busy}>
      <div className="state-account-leaf" aria-hidden="true"><CultivaLeaf /></div>
      <h1 id={titleId}>{title}</h1><p id={hintId} role="status">{hint}</p>
      {accountLabel && <p className="state-account-identity" dir="auto">{accountLabel}</p>}
      {phase === 'consent' && <>
        <p className="state-account-note">{copy.archiveHint}</p><p className="state-account-note">{copy.creditHint}</p>
        <label className="state-account-ownership"><input type="checkbox" checked={owned} onChange={event => setOwned(event.target.checked)} />{copy.ownership}</label>
        <button type="button" disabled={!owned} onClick={() => onChoice('import')}>{copy.import}</button>
        <button type="button" className="state-account-secondary" onClick={() => onChoice('cloud-only')}>{copy.cloudOnly}</button>
      </>}
      {(phase === 'error' || phase === 'logout-error') && <button type="button" onClick={onRetry}>{copy.retry}</button>}
      {phase === 'logout-error' ? <button type="button" className="state-account-secondary" onClick={onStay}>{copy.stay}</button>
        : phase !== 'signing-out' && <button type="button" className="state-account-secondary" onClick={onSignOut}>{copy.signOut}</button>}
    </section>
  </div>, document.body);
}
