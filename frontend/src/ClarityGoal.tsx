import { useId } from 'react';
import { clarityTransition, clarityMessages, type ClarityLanguage } from './clarityRubric';
import './clarity-goal.css';

export function ClarityGoal({ level, language }: { level: number; language: string }) {
  const id = useId();
  const transition = clarityTransition(level, language);
  if (!transition) return null;
  const copy = clarityMessages[language as ClarityLanguage] ?? clarityMessages.es;
  const number = (value: number) => value.toLocaleString(language);
  return <aside className="clarity-goal" data-source-level={level} data-target-level={transition.target.level} data-clarity-version={transition.version} dir={language === 'ar' ? 'rtl' : undefined} aria-labelledby={id}>
    <header><span id={id}>{copy.heading}</span><span className="clarity-goal-transition" dir="ltr" aria-label={`${copy.level} ${number(level)} → ${copy.level} ${number(transition.target.level)}`}><b>{number(level)}</b><i aria-hidden="true">↗</i><b>{number(transition.target.level)}</b></span></header>
    <h4>{transition.target.name}</h4>
    <p className="clarity-goal-definition">{transition.target.description.replace(/^.*?(?:\s+—\s+|\s+–\s+|\s+-\s+|——)/u, '')}</p>
    <p className="clarity-goal-rule">{copy.rule}</p><small>{copy.review}</small>
  </aside>;
}
