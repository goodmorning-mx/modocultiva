import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { LIFE_ANSWER_LIMIT, LIFE_FIELDS, lifeAnswered, type LifeContext, type LifeField } from './lifeContext';
import { lifeContextCopy } from './lifeContextCopy';
import type { AppLanguage } from './languagePreference';
import './life-context.css';

export type LifeEdits = Record<string, Partial<Record<LifeField, string | null>>>;
type Props = {
  language: AppLanguage; modes: { key: string; name: string; color: string }[];
  context: LifeContext; initialMode?: string; fromAi: boolean;
  closeLabel: string; nextLabel: string; previousLabel: string;
  onSave: (changes: LifeEdits) => boolean; onClose: () => void; onSkip: () => void;
};

export function LifeContextDeck(props: Props) {
  const copy = lifeContextCopy(props.language);
  const [index, setIndex] = useState(() => Math.max(0, props.modes.findIndex(mode => mode.key === props.initialMode)));
  const [changes, setChanges] = useState<LifeEdits>({});
  const [direction, setDirection] = useState<'forward' | 'back' | undefined>();
  const [failed, setFailed] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const id = useId();
  const rtl = props.language === 'ar';
  const mode = props.modes[index];
  const answers = Object.fromEntries(LIFE_FIELDS.map(field => [
    field, changes[mode.key]?.[field] === null ? undefined : changes[mode.key]?.[field] ?? props.context[mode.key]?.[field],
  ]));
  const step = (next: number) => {
    if (next < 0 || next >= props.modes.length || next === index) return;
    setDirection(next > index ? 'forward' : 'back');
    setIndex(next);
  };
  const edit = (field: LifeField, value: string | null) => {
    setFailed(false);
    setChanges(current => ({ ...current, [mode.key]: { ...current[mode.key], [field]: value } }));
  };
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => element.close();
  }, []);

  return <dialog ref={dialog} className="life-context-dialog" dir={rtl ? 'rtl' : 'ltr'} aria-labelledby={`${id}-title`}
    onCancel={event => { event.preventDefault(); props.onClose(); }}>
    <header className="life-context-header">
      <div><h2 id={`${id}-title`}>{copy.title}</h2><p>{props.fromAi ? copy.gate : copy.intro}</p></div>
      <button type="button" aria-label={props.closeLabel} onClick={props.onClose}>×</button>
    </header>
    <nav className="life-context-nav" aria-label={copy.mode}>
      <button type="button" aria-label={props.previousLabel} onClick={() => step(index - 1)} disabled={index === 0}>{rtl ? '→' : '←'}</button>
      <select aria-label={copy.mode} value={index} onChange={event => step(Number(event.target.value))}>
        {props.modes.map((item, number) => <option key={item.key} value={number}>{(number + 1).toLocaleString(props.language)}/{props.modes.length.toLocaleString(props.language)} · {item.name}</option>)}
      </select>
      <button type="button" aria-label={props.nextLabel} onClick={() => step(index + 1)} disabled={index === props.modes.length - 1}>{rtl ? '←' : '→'}</button>
    </nav>
    <article className="life-context-card" key={mode.key} data-mode={mode.key} data-slide={direction} aria-labelledby={`${id}-mode`}
      style={{ '--life-accent': mode.color } as CSSProperties}
      onTouchStart={event => { touch.current = event.touches.length === 1 && !(event.target as Element).closest('textarea,button') ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null; }}
      onTouchCancel={() => { touch.current = null; }}
      onTouchEnd={event => {
        const start = touch.current; touch.current = null;
        if (!start || !event.changedTouches.length) return;
        const dx = event.changedTouches[0].clientX - start.x;
        const dy = event.changedTouches[0].clientY - start.y;
        if (Math.abs(dx) > Math.max(45, Math.abs(dy) * 1.4)) step(index + ((dx < 0) !== rtl ? 1 : -1));
      }}>
      <h3 id={`${id}-mode`} aria-live="polite">{mode.name}<small>{lifeAnswered(answers)}/{LIFE_FIELDS.length}</small></h3>
      <div className="life-context-fields">
        {LIFE_FIELDS.map((field, i) => {
          const name = `${id}-${field}`;
          const [label, question] = copy.fields[i];
          return <section key={field}>
            <label htmlFor={name}>{label}</label><p id={`${name}-question`}>{question}</p>
            <textarea id={name} data-field={field} rows={2} dir="auto" maxLength={LIFE_ANSWER_LIMIT}
              value={answers[field] ?? ''} aria-describedby={`${name}-question`}
              onChange={event => edit(field, event.target.value || null)} />
            <label className="life-context-unknown"><input type="checkbox" checked={answers[field] === ''}
              disabled={Boolean(answers[field]?.trim())} onChange={event => edit(field, event.target.checked ? '' : null)} />{copy.unknown}</label>
          </section>;
        })}
      </div>
    </article>
    <p className="life-context-holistic">{copy.holistic}</p>
    {failed && <p role="alert">{copy.failed}</p>}
    <footer className="life-context-footer">
      <button type="button" className="life-context-save" onClick={() => setFailed(!props.onSave(changes))}>{props.fromAi ? copy.proceed : copy.save}</button>
      {props.fromAi && <button type="button" className="life-context-skip" onClick={props.onSkip}>{copy.skip}</button>}
    </footer>
  </dialog>;
}
