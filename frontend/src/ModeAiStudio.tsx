import { useEffect, useId, useRef, type ReactNode } from 'react';
import './mode-ai-studio.css';

function StudioMark({ quiet = false }: { quiet?: boolean }) {
  const id = useId().replace(/:/g, '');
  return <svg className={`mode-ai-mark${quiet ? ' mode-ai-mark--quiet' : ''}`} viewBox="0 0 180 160" fill="none" aria-hidden="true" focusable="false">
    <defs><linearGradient id={`${id}-glass`} x1="40" y1="20" x2="136" y2="140" gradientUnits="userSpaceOnUse"><stop stopColor="currentColor" stopOpacity=".26" /><stop offset="1" stopColor="currentColor" stopOpacity=".02" /></linearGradient><linearGradient id={`${id}-edge`} x1="38" y1="20" x2="140" y2="134" gradientUnits="userSpaceOnUse"><stop stopColor="#eefff3" stopOpacity=".9" /><stop offset=".5" stopColor="currentColor" /><stop offset="1" stopColor="currentColor" stopOpacity=".1" /></linearGradient></defs>
    <g className="mode-ai-mark-layers"><path d="m90 54 57 34-57 34-57-34Z" fill={`url(#${id}-glass)`} stroke="currentColor" strokeOpacity=".16" /><path d="m90 38 57 34-57 34-57-34Z" fill={`url(#${id}-glass)`} stroke="currentColor" strokeOpacity=".4" /><path d="m90 22 57 34-57 34-57-34Z" fill={`url(#${id}-glass)`} stroke={`url(#${id}-edge)`} /><path d="M90 44c3 9 7 13 17 16-10 3-14 7-17 16-3-9-7-13-17-16 10-3 14-7 17-16Z" fill="currentColor" /><path d="M90 90v32M33 56v32m114-32v32" stroke="currentColor" strokeOpacity=".18" /></g>
    <path d="M152 23v10m-5-5h10M26 115v8m-4-4h8" stroke="currentColor" strokeOpacity=".65" strokeLinecap="round" /><circle cx="132" cy="125" r="2" fill="currentColor" fillOpacity=".65" />
  </svg>;
}

type Props = {
  language: string; brand: string; title: string; description: string; modeIcon: string;
  clarityGoal?: ReactNode;
  level: number; levelLabel: string; stage: string; considerLabel: string; effort: string; effortDescription: string;
  question: string; contextLabel: string; placeholder: string; activityLabel: string; readyLabel: string; waiting: string;
  askLabel: string; useLabel: string; consultingLabel: string;
  context: string; proposal: string; hasProposal: boolean; loading: boolean; notice: string | null;
  onContext: (value: string) => void; onAsk: () => void; onUse: () => void;
};

export function ModeAiStudio(props: Props) {
  const titleId = useId(); const contextId = useId(); const questionId = useId(); const proposalId = useId();
  const ready = props.hasProposal && Boolean(props.proposal.trim());
  const proposalRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (!ready) return;
    proposalRef.current?.focus({ preventScroll: true });
    if (window.matchMedia('(max-width: 700px)').matches) {
      proposalRef.current?.scrollIntoView({ block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
  }, [ready]);
  return <div className="mode-ai-studio" dir={props.language === 'ar' ? 'rtl' : undefined}>
    <div className="mode-ai-hero"><div className="mode-ai-hero-copy"><span className="mode-ai-signature"><span aria-hidden="true">✧</span>{props.brand}</span><h2 id="activity-agent-title">{props.title}</h2><p className="journey-description">{props.description}</p></div><StudioMark /></div>
    {props.clarityGoal}
    <div className="mode-ai-workspace" aria-labelledby={titleId}>
      <div className="mode-ai-workspace-heading"><span className="mode-ai-stage" id={titleId}><span aria-hidden="true">{props.modeIcon}</span>{props.stage}</span><span className="mode-ai-level">{props.levelLabel}<b>{props.level.toLocaleString(props.language)}</b></span></div>
      <div className="mode-ai-columns">
        <section className="mode-ai-context" aria-labelledby={contextId}>
          <div className="mode-ai-section-heading"><span className="mode-ai-step" aria-hidden="true">01</span><label id={contextId} htmlFor="activity-prompt">{props.contextLabel}</label></div>
          <p className="mode-ai-question" id={questionId}>{props.question}</p>
          <textarea id="activity-prompt" value={props.context} onChange={event => props.onContext(event.target.value)} placeholder={props.placeholder} aria-describedby={questionId} disabled={props.loading} rows={5} />
          <button className="agent-ask mode-ai-ask" type="button" disabled={props.loading} onClick={props.onAsk}><span aria-hidden="true">✧</span>{props.loading ? props.consultingLabel : props.askLabel}<span aria-hidden="true">↗</span></button>
          {props.notice && <p className="mode-ai-notice" role="status">{props.notice}</p>}
          <aside className="mode-ai-consideration"><span>{props.considerLabel}</span><strong>{props.effort}</strong><p>{props.effortDescription}</p></aside>
        </section>
        <section className={`mode-ai-proposal${ready ? ' mode-ai-proposal--ready' : ''}`} aria-labelledby={proposalId}>
          <div className="mode-ai-section-heading"><span className="mode-ai-step" aria-hidden="true">02</span><h3 id={proposalId}>{ready ? props.readyLabel : props.activityLabel}</h3><span className="mode-ai-proposal-star" aria-hidden="true">✧</span></div>
          <div className="mode-ai-result" aria-busy={props.loading}>
            {props.loading ? <div className="mode-ai-generating"><StudioMark quiet /><p role="status">{props.consultingLabel}</p><div className="mode-ai-skeleton" aria-hidden="true"><i /><i /><i /></div></div> : ready ? <p ref={proposalRef} className="mode-ai-proposal-text" dir="auto" tabIndex={0}>{props.proposal}</p> : <div className="mode-ai-empty"><div className="mode-ai-empty-art" aria-hidden="true"><span /><span /><span>✧</span></div><p>{props.waiting}</p></div>}
          </div>
          <button className="agent-save mode-ai-use" type="button" disabled={props.loading || !ready} onClick={props.onUse}>{props.useLabel}<span aria-hidden="true">↗</span></button>
        </section>
      </div>
    </div>
  </div>;
}
