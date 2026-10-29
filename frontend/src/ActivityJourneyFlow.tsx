import { useEffect, useId, useRef, useState } from 'react';
import { clarityMessages, clarityTransition } from './clarityRubric';
import { activityFlowCopy, cardAudienceCopy } from './activityJourneyFlowMessages';
import { VisualEvidenceInput } from './VisualEvidenceInput';
import { cardPublicationFields, normalizeCardAudience, evidenceDraftProblem, evidenceInputFromDraft, isEvidenceAbort, type CardAudience, type EvidenceDraft, type EvidenceInput, type LoadVideo, type UploadVideo } from './visualEvidence';
import './activity-journey-flow.css';

export type ActivityDefinition = { activity: string; target_alignment: string };
/** Authoritative snapshot supplied by the host after authenticated server reads.
 * A count is presentation only, never a vote action or a progression decision. */
export type ActivityReviewSnapshot = { id: string; revision: string; approvalCount: 0 | 1 | 2 | 3 };
type DefinedActivity = { definition: ActivityDefinition; evidence?: EvidenceDraft };
export type ActivityJourneyState =
  | { status: 'empty'; definition?: never; evidence?: never }
  | (DefinedActivity & { status: 'defined' | 'evidenceDraft' })
  | (DefinedActivity & { status: 'changesRequested'; feedback: string; submission: ActivityReviewSnapshot })
  | (DefinedActivity & { status: 'pending'; evidence: EvidenceDraft; submission: ActivityReviewSnapshot })
  | (DefinedActivity & { status: 'approved'; evidence: EvidenceDraft; submission: ActivityReviewSnapshot & { approvalCount: 3 } })
  | (DefinedActivity & { status: 'legacyHistorical' });
export type { CardAudience } from './visualEvidence';
export type ActivitySubmissionDraft = ActivityDefinition & { evidence: EvidenceInput; audience: CardAudience; public_confirmed: boolean };
export type ActivityJourneyFlowProps = {
  sourceLevel: number;
  /** Stable mode/activity scope (not a reviewer identity). Change when switching activities. */
  activityKey?: string;
  language?: string;
  state: ActivityJourneyState;
  /** Save the definition and invalidate/supersede old reviews on the server. */
  onDefine?: (definition: ActivityDefinition, signal: AbortSignal) => Promise<void>;
  /** Bind exact saved activity/hash, mode, source, target and revision on the server. */
  onSubmit?: (draft: ActivitySubmissionDraft, signal: AbortSignal) => Promise<void>;
  onDraftChange?: (draft: EvidenceDraft) => void;
  onUploadVideo?: UploadVideo;
  onLoadVideo?: LoadVideo;
  audience?: CardAudience;
  /** Selection only, not publication. The host must not write from this callback. */
  onAudienceChange?: (audience: CardAudience) => void;
  /** Authoritative current audience, separate from a controlled draft selection. */
  publishedAudience?: CardAudience;
  sharedCardId?: string | null;
  onSetAudience?: (audience: CardAudience, publicConfirmed: boolean, signal: AbortSignal) => Promise<void>;
  onUnshare?: (signal: AbortSignal) => Promise<void>;
  disabled?: boolean;
  /** Prefer the immutable submission target while presenting an older review. */
  targetSnapshot?: { version: string; level: number; name: string; description: string };
};

/** Shared by submission and feed editors. Selection never performs a write. */
export function CardAudienceControl({ language = 'en', value, confirmed, onChange, onConfirm, disabled = false, draft = false }: {
  language?: string; value: CardAudience; confirmed: boolean; onChange: (audience: CardAudience) => void;
  onConfirm: (confirmed: boolean) => void; disabled?: boolean; draft?: boolean;
}) {
  const copy = cardAudienceCopy(language); const id = useId();
  return <fieldset className="card-audience-control activity-flow-audience" disabled={disabled} aria-describedby={`${id}-help`}>
    <legend>{copy.heading}</legend>
    <div className="card-audience-options">{(['network', 'public'] as const).map(audience => <label key={audience} data-selected={value === audience}>
      <input type="radio" name={`${id}-audience`} value={audience} checked={value === audience} onChange={() => onChange(audience)} />
      <span><strong>{copy[audience]}</strong><span>{audience === 'network' ? copy.networkDetail : copy.publicDetail}</span></span>
    </label>)}</div>
    <p id={`${id}-help`} className="card-audience-note">{copy.selectionOnly}</p>
    {draft && <p className="card-audience-note">{copy.draftOwnerOnly}</p>}
    {value === 'public' && <div className="card-audience-public-warning">
      <p id={`${id}-warning`}>{copy.publicWarning}</p>
      <label className="card-audience-confirm"><input type="checkbox" checked={confirmed} aria-describedby={`${id}-warning`} onChange={event => onConfirm(event.target.checked)} /><span>{copy.publicConfirm}</span></label>
    </div>}
  </fieldset>;
}

export function validActivityDefinition(definition: ActivityDefinition): boolean {
  return validSavedActivityDefinition(definition) && Array.from(definition.activity.trim()).length >= 20;
}
/** Existing server records are not reclassified using new-editor guidance. */
export function validSavedActivityDefinition(definition: ActivityDefinition): boolean {
  const activityLength = Array.from(definition.activity.trim()).length;
  const alignmentLength = Array.from(definition.target_alignment.trim()).length;
  return activityLength >= 1 && activityLength <= 12000 && alignmentLength >= 20 && alignmentLength <= 3000;
}
export function activityApprovalCount(state: ActivityJourneyState): number {
  if (state.status !== 'pending' && state.status !== 'approved') return 0;
  const count = state.submission.approvalCount;
  return Number.isInteger(count) && count >= 0 && count <= 3 ? count : 0;
}
export function activityIsValidated(state: ActivityJourneyState): boolean {
  return state.status === 'approved' && activityApprovalCount(state) === 3
    && Boolean(state.submission.id.trim() && state.submission.revision.trim())
    && validSavedActivityDefinition(state.definition) && evidenceDraftProblem(state.evidence) === null;
}
export function activityFlowStage(sourceLevel: number, state: ActivityJourneyState): 1 | 2 | 3 | null {
  if (!Number.isInteger(sourceLevel) || sourceLevel < 0 || sourceLevel > 8) return null;
  if (state.status === 'empty' || !validSavedActivityDefinition(state.definition)) return 1;
  // No visual means no review presentation, even with a malformed host snapshot.
  if ((state.status === 'pending' || state.status === 'approved') && evidenceDraftProblem(state.evidence) === null) return 3;
  return 2;
}

/** Exactly three stages; entirely opt-in and not connected to any API or storage. */
export function ActivityJourneyFlow(props: ActivityJourneyFlowProps) {
  if (activityFlowStage(props.sourceLevel, props.state) === null) return null; // Level9 is a separate image-only vision.
  return <ActivityJourneyFlowContent key={`${props.activityKey ?? ''}:${props.sourceLevel}`} {...props} />;
}

function ActivityJourneyFlowContent({ sourceLevel, language = 'en', state, onDefine, onSubmit, onDraftChange, onUploadVideo, onLoadVideo, audience = 'network', onAudienceChange, publishedAudience, sharedCardId, onSetAudience, onUnshare, disabled = false, targetSnapshot }: ActivityJourneyFlowProps) {
  const copy = activityFlowCopy(language);
  const audienceCopy = cardAudienceCopy(language);
  const clarity = clarityMessages[language as keyof typeof clarityMessages] ?? clarityMessages.en;
  const transition = clarityTransition(sourceLevel, language)!;
  const target = targetSnapshot ?? { ...transition.target, version: transition.version };
  const targetMatches = target.level === sourceLevel + 1 && Boolean(target.description.trim());
  const id = useId();
  const [editing, setEditing] = useState(false);
  const [definition, setDefinition] = useState<ActivityDefinition>(state.definition ?? { activity: '', target_alignment: '' });
  const [draft, setDraft] = useState<EvidenceDraft>(state.evidence ?? { reflection: '' });
  const [busy, setBusy] = useState(false);
  const [visualBusy, setVisualBusy] = useState(false);
  const [error, setError] = useState('');
  const [selectedAudience, setSelectedAudience] = useState(() => normalizeCardAudience(audience));
  const [publicConfirmed, setPublicConfirmed] = useState(false);
  const [savedAudience, setSavedAudience] = useState(() => normalizeCardAudience(publishedAudience ?? audience));
  const [unshared, setUnshared] = useState(sharedCardId === null);
  const notifiedSelection = useRef<CardAudience | null>(null);
  const operation = useRef<AbortController | null>(null);
  const stage = editing ? 1 : activityFlowStage(sourceLevel, state)!;
  const validated = !editing && targetMatches && activityIsValidated(state);
  const definitionChanged = definition.activity.trim() !== state.definition?.activity.trim() || definition.target_alignment.trim() !== state.definition?.target_alignment.trim();
  const locked = disabled || busy;
  const publishReady = selectedAudience !== 'public' || publicConfirmed;

  useEffect(() => {
    const next = normalizeCardAudience(audience);
    setSelectedAudience(next); setPublicConfirmed(false);
    if (publishedAudience !== undefined) setSavedAudience(normalizeCardAudience(publishedAudience));
    else if (notifiedSelection.current !== next) setSavedAudience(next);
    notifiedSelection.current = null;
  }, [audience, publishedAudience]);
  useEffect(() => { setUnshared(sharedCardId === null); }, [sharedCardId]);
  useEffect(() => { setPublicConfirmed(false); }, [definition.activity, definition.target_alignment, draft.reflection, draft.link, draft.visual]);

  useEffect(() => () => { operation.current?.abort(); operation.current = null; }, []);
  useEffect(() => {
    if (disabled) { operation.current?.abort(); operation.current = null; setBusy(false); }
  }, [disabled]);
  useEffect(() => {
    operation.current?.abort(); operation.current = null; setBusy(false);
    setDefinition(state.definition ?? { activity: '', target_alignment: '' });
    setEditing(false); setError('');
  }, [sourceLevel, state.definition?.activity, state.definition?.target_alignment]);
  useEffect(() => {
    setDraft(state.evidence ?? { reflection: '' });
  }, [sourceLevel, state.evidence?.reflection, state.evidence?.link, state.evidence?.visual?.kind,
    state.evidence?.visual?.kind === 'photo' ? state.evidence.visual.image : state.evidence?.visual?.video_asset_id]);
  useEffect(() => {
    // Superseding/review updates cannot be overwritten by a late action response.
    operation.current?.abort(); operation.current = null; setBusy(false); setError('');
    if (state.status === 'changesRequested') setEditing(false);
  }, [state.status, 'submission' in state ? state.submission.revision : undefined]);

  const changeDraft = (next: EvidenceDraft) => { setDraft(next); setError(''); onDraftChange?.(next); };
  const perform = async (callback: (signal: AbortSignal) => Promise<void>) => {
    if (operation.current || disabled) return;
    const controller = new AbortController(); operation.current = controller; setBusy(true); setError('');
    try { await callback(controller.signal); }
    catch (failure) { if (operation.current === controller && !controller.signal.aborted && !isEvidenceAbort(failure)) setError(copy.actionFailed); }
    finally { if (operation.current === controller) { operation.current = null; setBusy(false); } }
    // No optimistic pending/approved state, count mutation, or level advancement.
  };
  const submit = () => {
    const problem = evidenceDraftProblem(draft);
    if (problem) { setError(copy[problem]); return; }
    if (!onSubmit || !state.definition || !targetMatches || visualBusy) return;
    const saved = state.definition;
    if (!publishReady) return;
    const publication = cardPublicationFields(selectedAudience, publicConfirmed);
    void perform(signal => onSubmit({ activity: saved.activity.trim(), target_alignment: saved.target_alignment.trim(), evidence: evidenceInputFromDraft(draft), ...publication }, signal));
  };

  return <section className="activity-journey-flow" dir={language === 'ar' ? 'rtl' : 'ltr'} lang={language} aria-labelledby={`${id}-heading`}>
    <h5 id={`${id}-heading`}>{copy.heading}</h5>
    <ol className="activity-flow-stages" aria-label={copy.heading}>
      {copy.stages.map((label, index) => <li key={index} aria-current={stage === index + 1 ? 'step' : undefined} data-complete={stage > index + 1 || (index === 2 && validated)}>
        <span className="activity-flow-stage-number" aria-hidden="true">{index + 1}</span>
        <span>{index === 2 && validated ? copy.validated : label}</span>
      </li>)}
    </ol>
    <CardAudienceControl language={language} value={selectedAudience} confirmed={publicConfirmed} disabled={locked || unshared && stage === 3}
      draft={stage !== 3} onChange={next => { setSelectedAudience(next); setPublicConfirmed(false); notifiedSelection.current = next; onAudienceChange?.(next); }} onConfirm={setPublicConfirmed} />
    <aside className="activity-flow-target" aria-labelledby={`${id}-target`}>
      <h6 id={`${id}-target`}>{clarity.heading} · {clarity.level} {target.level}</h6>
      <strong>{target.name}</strong><p dir="auto">{target.description}</p>
      <p>{clarity.rule}</p><p>{clarity.review}</p>
    </aside>
    {state.status === 'legacyHistorical' && <p className="activity-flow-legacy">{copy.legacy}</p>}
    {stage === 1 ? <form className="activity-flow-form" onSubmit={event => {
      event.preventDefault();
      if (!validActivityDefinition(definition)) { setError(copy.minimum); return; }
      if (onDefine && targetMatches) void perform(signal => onDefine({ activity: definition.activity.trim(), target_alignment: definition.target_alignment.trim() }, signal));
    }}>
      <p id={`${id}-minimum`} className="activity-flow-note">{copy.minimum}</p>
      <label htmlFor={`${id}-activity`}>{copy.activity}</label>
      <textarea id={`${id}-activity`} dir="auto" value={definition.activity} disabled={locked} required aria-describedby={`${id}-minimum`} onChange={event => setDefinition(previous => ({ ...previous, activity: event.target.value }))} />
      <label htmlFor={`${id}-alignment`}>{copy.alignment}</label>
      <textarea id={`${id}-alignment`} dir="auto" value={definition.target_alignment} disabled={locked} required aria-describedby={`${id}-minimum ${id}-target`} onChange={event => setDefinition(previous => ({ ...previous, target_alignment: event.target.value }))} />
      <p className="activity-flow-note">{copy.revision}</p>
      <div className="activity-flow-actions">
        <button type="submit" disabled={locked || !onDefine || !targetMatches || !validActivityDefinition(definition) || !definitionChanged}>{copy.save}</button>
        {editing && <button type="button" disabled={busy} onClick={() => { setDefinition(state.definition!); setEditing(false); setError(''); }}>{copy.cancel}</button>}
      </div>
      {!onDefine && <p className="activity-flow-note">{copy.unavailable}</p>}
    </form> : <>
      <div className="activity-flow-alignment"><strong>{copy.alignment}</strong><p dir="auto">{state.definition?.target_alignment}</p>
        <button type="button" disabled={locked || !onDefine} onClick={() => { setEditing(true); setError(''); }}>{copy.edit}</button>
      </div>
      {stage === 2 ? <form className="activity-flow-form" onSubmit={event => { event.preventDefault(); submit(); }}>
        {state.status === 'changesRequested' && <aside className="activity-flow-feedback" role="status"><strong>{copy.feedback}</strong><p dir="auto">{state.feedback}</p></aside>}
        <VisualEvidenceInput language={language} value={draft.visual} disabled={locked} onBusyChange={setVisualBusy} onChange={visual => changeDraft({ ...draft, visual })} onUploadVideo={onUploadVideo} onLoadVideo={onLoadVideo} />
        <label htmlFor={`${id}-reflection`}>{copy.reflection}</label>
        <textarea id={`${id}-reflection`} dir="auto" value={draft.reflection} disabled={locked} required onChange={event => changeDraft({ ...draft, reflection: event.target.value })} />
        <p className="activity-flow-note">{copy.reflectionShort}</p>
        <label htmlFor={`${id}-link`}>{copy.link}</label>
        <input id={`${id}-link`} dir="ltr" type="url" inputMode="url" value={draft.link ?? ''} disabled={locked} onChange={event => changeDraft({ ...draft, link: event.target.value })} />
        <p className="activity-flow-note">{copy.review}</p><p className="activity-flow-note">{copy.revision}</p>
        <button type="submit" disabled={locked || visualBusy || !onSubmit || !targetMatches || !publishReady || evidenceDraftProblem(draft) !== null}>{copy.submit}</button>
        {!onSubmit && <p className="activity-flow-note">{copy.unavailable}</p>}
      </form> : <div className="activity-flow-review" role="status" aria-live="polite" aria-atomic="true">
        <h6>{validated ? copy.validated : copy.stages[2]}</h6>
        <p className="activity-flow-approval-count">{copy.approvals.replace('{count}', String(activityApprovalCount(state)))}</p>
        <progress max={3} value={activityApprovalCount(state)} aria-label={copy.approvals.replace('{count}', String(activityApprovalCount(state)))} />
        <p>{copy.review}</p><p className="activity-flow-note">{copy.serverOnly}</p>
      </div>}
      {stage === 3 && <section className="activity-flow-published-audience" aria-label={audienceCopy.current}>
        <p>{unshared ? audienceCopy.notShared : <>{audienceCopy.current}: <strong>{audienceCopy[savedAudience]}</strong></>}</p>
        <div className="activity-flow-actions">
          {onSetAudience && !unshared && <button type="button" disabled={locked || !publishReady} onClick={() => {
            const publication = cardPublicationFields(selectedAudience, publicConfirmed);
            void perform(async signal => { await onSetAudience(publication.audience, publication.public_confirmed, signal); if (!signal.aborted) { setSavedAudience(publication.audience); setPublicConfirmed(false); } });
          }}>{audienceCopy.save}</button>}
          {onUnshare && !unshared && <button type="button" disabled={locked} onClick={() => void perform(async signal => { await onUnshare(signal); if (!signal.aborted) { setUnshared(true); setPublicConfirmed(false); } })}>{audienceCopy.unshare}</button>}
        </div>
      </section>}
    </>}
    {busy && <p role="status">{copy.working}</p>}
    {error && <p className="activity-flow-error" role="alert">{error}</p>}
    {!targetMatches && <p className="activity-flow-error" role="alert">{copy.actionFailed}</p>}
  </section>;
}
