import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { CommunityClient, CommunityProfile, CommunitySubmission, CommunityCard, CommunityCardDetail, CommunityNotice, CommunityIdeaRequest, CommunityReuseRequest } from './communityClient';
import { communityCopy, communityDestinationCopy, communityEffort, communityImportWarning, communityNoticeLabel, communityStatus } from './communityMessages';
import { activityFlowCopy, cardAudienceCopy } from './activityJourneyFlowMessages';
import { CardAudienceControl } from './ActivityJourneyFlow';
import { REACTIONS, socialCopy } from './journeySocial';
import { cardPublicationFields, normalizeCardAudience, checkEvidenceAbort, isEvidenceAbort, isNormalizedEvidenceImage, isVideoAssetId, validateEvidenceVideo, type CardAudience } from './visualEvidence';
import './community-panel.css';

export const COMMUNITY_TABS = ['network', 'reviews', 'feed', 'ideas', 'notifications', 'reuse'] as const;
export type CommunityTab = typeof COMMUNITY_TABS[number];
export type CommunityShareCandidate = { mode: string; level: number; activity: string; expected_activity_hash: string; submission_id?: string };
export type CommunityPanelProps = {
  client: CommunityClient | null; // Keep one stable immutable client per authenticated session.
  language: string;
  profileName: string;
  modeNames: Record<string, string>;
  onStateChanged: () => Promise<void>;
  onClose: () => void;
  onLogin?: () => void;
  initialTab?: CommunityTab;
  presentation?: 'dialog' | 'section';
  /** Host supplies exact saved activities, never evidence, and flushes before sharing. */
  shareCandidates?: readonly CommunityShareCandidate[];
  onBeforeShare?: (signal: AbortSignal) => Promise<void>;
  /** Delegate chosen-audience detail to the host; absent means authorized inline detail. */
  onViewCard?: (id: string) => void;
  /** Explicit destination/conflict confirmation belongs to the host. No default import. */
  onImportActivity?: (kind: 'reuse' | 'idea', id: string, mode: string, level: number, confirmedDestinationActivity?: string) => Promise<void>;
  /** Verbatim current saved/draft destination; rechecked before invoking import.
   * Host must compare confirmedDestinationActivity again AFTER flushing state. */
  destinationActivity?: (mode: string, level: number) => string;
  activityContext?: { mode: string; level: number };
};
type OwnProfile = NonNullable<Awaited<ReturnType<CommunityClient['getProfile']>>>;
type PanelData = { members?: CommunityProfile[]; inbox?: CommunitySubmission[]; own?: CommunitySubmission[]; cards?: CommunityCard[]; notifications?: CommunityNotice[]; ideas?: CommunityIdeaRequest[]; reuse?: CommunityReuseRequest[] };
type Criteria = readonly [boolean, boolean, boolean];
const sessions = new WeakMap<CommunityClient, number>(); let nextSession = 0;
const sessionKey = (client: CommunityClient | null) => {
  if (!client) return 'guest';
  if (!sessions.has(client)) sessions.set(client, ++nextSession);
  return sessions.get(client)!;
};
export function validCommunityProfile(name: string, bio: string) {
  const length = Array.from(name.trim()).length;
  return length > 0 && length <= 120 && Array.from(bio.trim()).length <= 500;
}
export function canReviewCommunitySubmission(submission: CommunitySubmission, currentUserId: string) {
  const proof = submission.evidence;
  const visual = Boolean(proof?.image) !== Boolean(proof?.video_asset_id)
    && (proof?.image ? isNormalizedEvidenceImage(proof.image) : Boolean(proof?.video_asset_id && isVideoAssetId(proof.video_asset_id)));
  return submission.can_review === true && submission.status === 'pending' && submission.author_id !== currentUserId
    && !submission.reviews.some(review => review.reviewer_id === currentUserId)
    && Number.isInteger(submission.source_level) && submission.source_level >= 0 && submission.source_level <= 8
    && Number.isInteger(submission.review_count) && submission.review_count >= 0 && submission.review_count < 3
    && submission.target_level === submission.source_level + 1 && submission.review_quorum === 3
    && submission.rubric_snapshot.source.level === submission.source_level && submission.rubric_snapshot.target.level === submission.target_level
    && Boolean(submission.rubric_snapshot.target.description.trim()) && visual;
}
export function communityReviewBody(submission: CommunitySubmission, currentUserId: string, decision: 'approve' | 'changes_requested', criteria: Criteria, feedback: string) {
  if (!canReviewCommunitySubmission(submission, currentUserId)) throw new Error('review_unavailable');
  if (!['approve', 'changes_requested'].includes(decision) || criteria.length !== 3 || !criteria.every(value => typeof value === 'boolean')) throw new Error('review_incomplete');
  const text = feedback.trim(); const length = Array.from(text).length;
  if (length > 2000 || (decision === 'approve' ? !criteria.every(value => value === true) : length < 20)) throw new Error('review_incomplete');
  return { expected_activity_hash: submission.activity_hash, decision, activity_match: criteria[0], effort_match: criteria[1], clarity_match: criteria[2], feedback: text };
}
export function publicCommunityActivity(card: CommunityCard) {
  // Feed presentation allowlist: never spread a server DTO into a share/proof UI.
  return { id: card.id, author_id: card.author_id, display_name: card.display_name, mode: card.mode, source_level: card.source_level, activity: card.activity, reactions: card.reactions, my_reaction: card.my_reaction, reuse: card.reuse, audience: normalizeCardAudience(card.audience), has_evidence: card.has_evidence === true };
}
/** Links come only from an authoritative Public DTO, never a draft selection. */
export function communityPublicCardLink(card: Pick<CommunityCard, 'id' | 'audience'>, origin: string): string | null {
  if (card.audience !== 'public' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(card.id)) return null;
  try { const url = new URL(origin); if (!['http:', 'https:'].includes(url.protocol)) return null; return `${url.origin}/?community-card=${card.id}`; } catch { return null; }
}
export function CommunityPanel(props: CommunityPanelProps) {
  // A different immutable authenticated client gets a fresh private UI scope.
  return <CommunityPanelContent key={sessionKey(props.client)} {...props} />;
}

function CommunityPanelContent({ client, language, profileName, modeNames, onStateChanged, onClose, onLogin, initialTab = 'network', presentation = 'dialog', shareCandidates = [], onBeforeShare, onViewCard, onImportActivity, destinationActivity, activityContext }: CommunityPanelProps) {
  const copy = communityCopy(language); const flowCopy = activityFlowCopy(language); const social = socialCopy(language);
  const audienceCopy = cardAudienceCopy(language);
  const id = useId(); const dialog = useRef<HTMLDialogElement>(null);
  const operation = useRef<AbortController | null>(null); const writing = useRef(false); const hydrated = useRef(false);
  const [tab, setTab] = useState<CommunityTab>(COMMUNITY_TABS.includes(initialTab) ? initialTab : 'network');
  const [profile, setProfile] = useState<OwnProfile | null>();
  const [name, setName] = useState(profileName); const [bio, setBio] = useState(''); const [discoverable, setDiscoverable] = useState(false);
  const [loading, setLoading] = useState(Boolean(client)); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [data, setData] = useState<PanelData>({}); const [details, setDetails] = useState<CommunitySubmission | null>(null);
  const [cardDetails, setCardDetails] = useState<CommunityCardDetail | null>(null);
  const [shareAudience, setShareAudience] = useState<CardAudience>('network'); const [sharePublicConfirmed, setSharePublicConfirmed] = useState(false);
  const [reload, setReload] = useState(0); const [mode, setMode] = useState(activityContext?.mode ?? Object.keys(modeNames)[0] ?? ''); const [level, setLevel] = useState(activityContext && Number.isInteger(activityContext.level) && activityContext.level >= 0 && activityContext.level < 9 ? activityContext.level : 0); const [shareIndex, setShareIndex] = useState('');
  const [confirmImport, setConfirmImport] = useState<{ kind: 'reuse' | 'idea'; id: string; mode: string; level: number; destination: string } | null>(null);
  const [destinationChanged, setDestinationChanged] = useState(false);
  const allowed = Boolean(client && profile?.discoverable); const locked = busy || loading;
  const selectedShare = shareIndex === '' ? undefined : shareCandidates[Number(shareIndex)];
  useEffect(() => { setSharePublicConfirmed(false); }, [shareIndex, selectedShare?.activity, selectedShare?.expected_activity_hash, selectedShare?.submission_id]);

  useEffect(() => {
    if (presentation !== 'dialog') return;
    const element = dialog.current!; const trigger = document.activeElement as HTMLElement | null;
    element.showModal();
    return () => { element.close(); if (trigger?.isConnected) trigger.focus({ preventScroll: true }); };
  }, [presentation]);
  useEffect(() => () => { operation.current?.abort(); operation.current = null; }, []);
  useEffect(() => {
    if (activityContext && Object.prototype.hasOwnProperty.call(modeNames, activityContext.mode) && Number.isInteger(activityContext.level) && activityContext.level >= 0 && activityContext.level < 9) { setMode(activityContext.mode); setLevel(activityContext.level); }
  }, [activityContext?.mode, activityContext?.level]);

  async function refresh(signal: AbortSignal, syncForm = false, detailId?: string) {
    if (!client) return;
    // Always read explicit opt-in before directory/evidence/feed/notifications/ideas.
    const ownProfile = await client.getProfile(signal); checkEvidenceAbort(signal);
    setProfile(ownProfile);
    if (!hydrated.current || syncForm) {
      setName(ownProfile?.display_name ?? profileName); setBio(ownProfile?.bio ?? ''); setDiscoverable(ownProfile?.discoverable ?? false); hydrated.current = true;
    }
    if (!ownProfile?.discoverable) { setData({}); setDetails(null); setCardDetails(null); return; }
    let next: PanelData = {};
    if (tab === 'network') next = { members: (await client.directory(signal)).members };
    if (tab === 'reviews') {
      const [inbox, own] = await Promise.all([client.inbox(signal), client.submissions(signal)]);
      next = { inbox: inbox.submissions, own: own.submissions };
      if (detailId) {
        const updated = await client.submission(detailId, signal); checkEvidenceAbort(signal); setDetails(updated);
      }
    }
    if (tab === 'feed') next = { cards: (await client.feed(signal)).cards };
    if (tab === 'notifications') next = { notifications: (await client.notices(signal)).notifications };
    if (tab === 'ideas') next = { ideas: (await client.ideas(signal)).requests };
    if (tab === 'reuse') next = { reuse: (await client.reuseRequests(signal)).requests };
    checkEvidenceAbort(signal); setData(next);
  }
  useEffect(() => {
    if (!client) { setLoading(false); return; }
    operation.current?.abort(); const controller = new AbortController(); operation.current = controller;
    setLoading(true); setError(''); setData({}); setDetails(null); setCardDetails(null); setConfirmImport(null); setSharePublicConfirmed(false);
    void refresh(controller.signal).catch(failure => {
      if (!controller.signal.aborted && !isEvidenceAbort(failure)) setError(copy.unavailable);
    }).finally(() => { if (operation.current === controller) { operation.current = null; setLoading(false); } });
    return () => { controller.abort(); if (operation.current === controller) operation.current = null; };
  }, [client, tab, reload]); // Language changes do not discard drafts or trigger requests.

  const mutate = async (action: (signal: AbortSignal) => Promise<unknown>, syncForm = false) => {
    if (!client || writing.current || loading) return;
    writing.current = true; operation.current?.abort(); const controller = new AbortController(); operation.current = controller;
    setBusy(true); setError(''); setCardDetails(null); let saved = false;
    try {
      await action(controller.signal); checkEvidenceAbort(controller.signal); saved = true;
      let syncFailed = false;
      try { await onStateChanged(); } catch { syncFailed = true; }
      checkEvidenceAbort(controller.signal);
      await refresh(controller.signal, syncForm, details?.id);
      if (syncFailed) setError(copy.sync);
    } catch (failure) {
      if (!controller.signal.aborted && !isEvidenceAbort(failure)) { setData({}); setDetails(null); setError(saved ? copy.uncertain : copy.unavailable); }
    } finally {
      writing.current = false;
      if (operation.current === controller) { operation.current = null; setBusy(false); }
    }
    // No optimistic connection, count, approval, notification, offer or import.
  };
  const openReview = async (submissionId: string) => {
    if (!client || locked || writing.current) return;
    operation.current?.abort(); const controller = new AbortController(); operation.current = controller; setBusy(true); setError(''); setDetails(null);
    try { const submission = await client.submission(submissionId, controller.signal); checkEvidenceAbort(controller.signal); setDetails(submission); }
    catch (failure) { if (!controller.signal.aborted && !isEvidenceAbort(failure)) setError(copy.unavailable); }
    finally { if (operation.current === controller) { operation.current = null; setBusy(false); } }
  };
  const openCard = async (cardId: string) => {
    if (!client || !allowed || locked || writing.current) return;
    operation.current?.abort(); const controller = new AbortController(); operation.current = controller; setBusy(true); setError(''); setCardDetails(null);
    try { const card = await client.card(cardId, controller.signal); checkEvidenceAbort(controller.signal); setCardDetails(card); }
    catch (failure) { if (!controller.signal.aborted && !isEvidenceAbort(failure)) setError(copy.unavailable); }
    finally { if (operation.current === controller) { operation.current = null; setBusy(false); } }
  };
  const modeLabel = (key: string) => modeNames[key] ?? key;
  const canImport = Boolean(onImportActivity && destinationActivity);
  const askImport = (kind: 'reuse' | 'idea', importId: string, importMode: string, importLevel: number) => {
    if (!destinationActivity || !onImportActivity) return;
    setDestinationChanged(false);
    setConfirmImport({ kind, id: importId, mode: importMode, level: importLevel, destination: destinationActivity(importMode, importLevel) });
  };
  const finishImport = () => {
    if (!confirmImport || !onImportActivity || !destinationActivity) return;
    const current = destinationActivity(confirmImport.mode, confirmImport.level);
    if (current !== confirmImport.destination) { setConfirmImport({ ...confirmImport, destination: current }); setDestinationChanged(true); return; }
    void mutate(async signal => {
      await onImportActivity(confirmImport.kind, confirmImport.id, confirmImport.mode, confirmImport.level, confirmImport.destination);
      checkEvidenceAbort(signal); setConfirmImport(null); setDestinationChanged(false);
    });
  };
  const tabLabel = (key: CommunityTab) => key === 'ideas' ? copy.localIdeas : copy[key];
  const status = (value: string) => communityStatus(language, value);
  const count = (submission: CommunitySubmission) => Number.isInteger(submission.review_count) && submission.review_count >= 0 && submission.review_count <= 3 && submission.review_quorum === 3 ? copy.count.replace('{count}', String(submission.review_count)) : copy.unavailable;
  const empty = <p className="community-empty" role="status">{copy.empty}</p>;
  const members = data.members?.filter(member => member.user_id !== profile?.user_id);
  const actions = (children: ReactNode) => <div className="community-actions">{children}</div>;

  const content = <>
    <header className="community-header"><div><span className="community-eyebrow">Modo Cultiva</span><h2 id={`${id}-title`}>{copy.title}</h2></div><button type="button" className="community-close" onClick={onClose} aria-label={social.close}>×</button></header>
    {!client ? <section className="community-guest"><p>{copy.guest}</p>{onLogin && <button type="button" onClick={onLogin}>{copy.login}</button>}</section> : <>
      <details className="community-profile" open={!profile?.discoverable}>
        <summary>{copy.profile}</summary>
        <form onSubmit={event => { event.preventDefault(); if (validCommunityProfile(name, bio)) void mutate(signal => client.setProfile({ display_name: name.trim(), bio: bio.trim(), discoverable }, signal), true); }}>
          <p id={`${id}-opt-in`}>{copy.optIn}</p>
          <label htmlFor={`${id}-name`}>{copy.displayName}</label><input id={`${id}-name`} dir="auto" value={name} disabled={locked || profile === undefined} required onChange={event => setName(event.target.value)} />
          <label htmlFor={`${id}-bio`}>{copy.bio}</label><textarea id={`${id}-bio`} dir="auto" value={bio} disabled={locked || profile === undefined} onChange={event => setBio(event.target.value)} />
          <label className="community-checkbox"><input type="checkbox" checked={discoverable} disabled={locked || profile === undefined} aria-describedby={`${id}-opt-in`} onChange={event => setDiscoverable(event.target.checked)} /><span>{copy.discoverable}</span></label>
          <button type="submit" disabled={locked || profile === undefined || !validCommunityProfile(name, bio)}>{copy.save}</button>
        </form>
      </details>
      {allowed && <nav className="community-tabs" aria-label={copy.title}>{COMMUNITY_TABS.map(key => <button key={key} type="button" disabled={busy} aria-pressed={tab === key} aria-controls={`${id}-panel`} onClick={() => setTab(key)}>{tabLabel(key)}</button>)}</nav>}
      <div className="community-toolbar"><button type="button" disabled={locked} onClick={() => setReload(value => value + 1)}>{copy.refresh}</button>{locked && <span role="status">{flowCopy.working}</span>}</div>
      {error && <p className="community-error" role="alert">{error}</p>}
      {allowed && !loading && <section id={`${id}-panel`} className="community-tab-content" aria-label={tabLabel(tab)} aria-busy={busy}>
        <h3>{tabLabel(tab)}</h3>
        {confirmImport && <section className="community-import-confirm" role="group" aria-label={copy.import}>
          <p>{communityImportWarning(language)}</p><strong>{modeLabel(confirmImport.mode)} · {copy.level} {confirmImport.level}</strong>
          <p>{communityDestinationCopy(language).current}</p><blockquote className="community-destination-activity" dir="auto">{destinationActivity?.(confirmImport.mode, confirmImport.level) ?? confirmImport.destination}</blockquote>
          {destinationChanged && <p role="alert">{communityDestinationCopy(language).changed}</p>}
          <div className="community-actions"><button disabled={locked || !canImport} onClick={finishImport}>{copy.import}</button><button disabled={locked} onClick={() => setConfirmImport(null)}>{copy.cancel}</button></div>
        </section>}
        {tab === 'network' && <div data-tour="community-network">
          {members?.length ? members.map(member => <article className="community-member" key={member.user_id}>
            <div className="community-avatar" aria-hidden="true">{Array.from(member.display_name.trim())[0] ?? '·'}</div><div><h4 dir="auto">{member.display_name}</h4><p dir="auto">{member.bio}</p>
              {member.connection?.status === 'accepted' && <p className="community-state">{copy.connected}</p>}
              {member.connection?.status === 'pending' && <p className="community-state">{copy.pending}</p>}
              {actions(member.connection?.status === 'pending' ? member.connection.incoming ? <><button disabled={locked} onClick={() => void mutate(signal => client.respondConnection(member.connection!.id, 'accept', signal))}>{copy.accept}</button><button disabled={locked} onClick={() => void mutate(signal => client.respondConnection(member.connection!.id, 'decline', signal))}>{copy.decline}</button></> : null : member.connection?.status === 'accepted' ? <button disabled={locked} onClick={() => void mutate(signal => client.respondConnection(member.connection!.id, 'disconnect', signal))}>{copy.disconnect}</button> : <button disabled={locked} onClick={() => void mutate(signal => client.connect(member.user_id, signal))}>{copy.connect}</button>)}
            </div>
          </article>) : empty}
        </div>}
        {tab === 'reviews' && <div data-tour="community-reviews">
          {data.inbox?.length ? data.inbox.map(submission => <article className="community-card" key={submission.id}><span className="community-state">{modeLabel(submission.mode)} · {copy.level} {submission.source_level} · {status(submission.status)}</span><h4 dir="auto">{submission.activity}</h4><p>{count(submission)}</p><button disabled={locked} onClick={() => void openReview(submission.id)}>{copy.open}</button></article>) : empty}
          {details && <CommunityReviewDetail key={`${details.id}:${details.revision_number}:${details.status}:${details.reviews.length}`} submission={details} userId={profile!.user_id} client={client} language={language} modeName={modeLabel(details.mode)} busy={locked} onReview={(decision, criteria, feedback) => void mutate(signal => client.review(details.id, communityReviewBody(details, profile!.user_id, decision, criteria, feedback), signal))} />}
          <h4>{copy.own}</h4>{data.own?.length ? data.own.map(submission => <article className="community-card" key={submission.id}><span className="community-state">{modeLabel(submission.mode)} · {copy.level} {submission.source_level} · {status(submission.status)}</span><p dir="auto">{submission.activity}</p><p>{count(submission)}</p><button disabled={locked} onClick={() => void openReview(submission.id)}>{copy.open}</button></article>) : empty}
        </div>}
        {tab === 'feed' && <div data-tour="community-feed">
          <p className="community-note">{flowCopy.privacy}</p>
          {shareCandidates.length > 0 ? <form className="community-inline-form" onSubmit={event => {
            event.preventDefault(); const candidate = selectedShare;
            if (!candidate || !/^[a-f0-9]{64}$/.test(candidate.expected_activity_hash) || shareAudience === 'public' && !sharePublicConfirmed) return;
            const publication = cardPublicationFields(shareAudience, sharePublicConfirmed);
            void mutate(async signal => { if (onBeforeShare) await onBeforeShare(signal); checkEvidenceAbort(signal); const result = await client.share({ mode: candidate.mode, level: candidate.level, expected_activity_hash: candidate.expected_activity_hash, ...(candidate.submission_id ? { submission_id: candidate.submission_id } : {}), ...publication }, signal); if (!signal.aborted) setSharePublicConfirmed(false); return result; });
          }}>
            <label htmlFor={`${id}-share`}>{copy.share}</label><select id={`${id}-share`} disabled={locked} value={shareIndex} onChange={event => { setShareIndex(event.target.value); setSharePublicConfirmed(false); }}><option value="">—</option>{shareCandidates.map((candidate, index) => <option key={`${candidate.mode}:${candidate.level}:${candidate.expected_activity_hash}`} value={index}>{modeLabel(candidate.mode)} · {candidate.level} · {candidate.activity}</option>)}</select>
            {selectedShare && <blockquote dir="auto">{selectedShare.activity}</blockquote>}
            <CardAudienceControl language={language} value={shareAudience} confirmed={sharePublicConfirmed} disabled={locked} draft onChange={next => { setShareAudience(next); setSharePublicConfirmed(false); }} onConfirm={setSharePublicConfirmed} />
            <button disabled={locked || !selectedShare || shareAudience === 'public' && !sharePublicConfirmed} type="submit">{copy.share}</button>
          </form> : <p className="community-note">{copy.shareHelp}</p>}
          {data.cards?.length ? data.cards.map(value => { const card = publicCommunityActivity(value); return <article className="community-card community-feed-card" key={card.id}><span className="community-state">{card.display_name} · {modeLabel(card.mode)} · {copy.level} {card.source_level}</span><h4 dir="auto">{card.activity}</h4>
            <p className="community-state">{audienceCopy.current}: {audienceCopy[card.audience]}</p>
            {card.has_evidence && <p className="community-note">{audienceCopy.evidenceShared}</p>}
            <button type="button" disabled={locked} onClick={() => { if (onViewCard) onViewCard(card.id); else void openCard(card.id); }}>{audienceCopy.openCard}</button>
            <CommunityPublicLink card={value} language={language} />
            <div className="community-reactions" role="group" aria-label={social.reaction}>{REACTIONS.map((reaction, index) => <button key={reaction} disabled={locked} type="button" aria-pressed={card.my_reaction === reaction} aria-label={social.reactions[index]} onClick={() => void mutate(signal => client.react(card.id, card.my_reaction === reaction ? null : reaction, signal))}><span aria-hidden="true">{['🌿', '🌱', '💧', '☀️', '🪴'][index]}</span><span>{Number.isInteger(card.reactions[reaction]) && card.reactions[reaction] >= 0 ? card.reactions[reaction] : 0}</span></button>)}</div>
            {card.author_id === profile!.user_id && <CommunityCardAudience key={`${card.id}:${card.audience}:${card.activity}`} audience={card.audience} language={language} busy={locked} onSave={(audience, confirmed) => void mutate(signal => client.setAudience(card.id, audience, confirmed, signal))} />}
            {actions(card.author_id === profile!.user_id ? <button disabled={locked} onClick={() => void mutate(signal => client.unshare(card.id, signal))}>{audienceCopy.unshare}</button> : card.reuse && ['pending','accepted'].includes(card.reuse.status) ? <span>{status(card.reuse.status)}</span> : <button disabled={locked} onClick={() => void mutate(signal => client.requestReuse(card.id, signal))}>{copy.askReuse}</button>)}
          </article>; }) : empty}
          {cardDetails && <CommunityCardEvidence key={cardDetails.id} card={cardDetails} client={client} language={language} />}
        </div>}
        {tab === 'notifications' && <div>{data.notifications?.length ? data.notifications.map(notice => <article className="community-card" key={notice.id}><h4>{communityNoticeLabel(language, notice.kind)}</h4><time dateTime={notice.created_at}>{formatCommunityDate(notice.created_at, language)}</time>{notice.read ? <p>{copy.read}</p> : <button disabled={locked} onClick={() => void mutate(signal => client.markNotice(notice.id, signal))}>{copy.markRead}</button>}</article>) : empty}</div>}
        {tab === 'ideas' && <div data-tour="community-local-ideas"><p>{copy.eligibility}</p>
          <form className="community-inline-form" onSubmit={event => { event.preventDefault(); if (Object.prototype.hasOwnProperty.call(modeNames, mode) && Number.isInteger(level) && level >= 0 && level < 9) void mutate(signal => client.requestIdea({ mode, level }, signal)); }}>
            <label htmlFor={`${id}-mode`}>{copy.mode}</label><select id={`${id}-mode`} value={mode} disabled={locked} onChange={event => setMode(event.target.value)}>{Object.entries(modeNames).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
            <label htmlFor={`${id}-level`}>{copy.level}</label><select id={`${id}-level`} value={level} disabled={locked} onChange={event => setLevel(Number(event.target.value))}>{Array.from({ length: 9 }, (_, value) => <option key={value}>{value}</option>)}</select><button disabled={locked || !mode} type="submit">{copy.askIdeas}</button>
          </form>
          {data.ideas?.length ? data.ideas.map(request => <article className="community-card" key={request.id}><h4>{request.display_name} · {modeLabel(request.mode)} · {copy.level} {request.source_level}</h4><p>{status(request.status)}</p>
            {request.eligible_count !== undefined && <p>{request.eligible_count === 0 ? copy.zero : Number.isInteger(request.eligible_count) && request.eligible_count > 0 ? copy.eligible.replace('{count}', String(request.eligible_count)) : copy.unavailable}</p>}
            {request.offers?.map(offer => <blockquote key={offer.id}><strong dir="auto">{offer.display_name}</strong><p dir="auto">{offer.activity}</p>{request.author_id === profile!.user_id && <button disabled={locked || !canImport} onClick={() => askImport('idea', offer.id, request.mode, request.source_level)}>{copy.import}</button>}</blockquote>)}
            {actions(request.author_id === profile!.user_id && ['open','pending'].includes(request.status) ? <button disabled={locked} onClick={() => void mutate(signal => client.cancelIdea(request.id, signal))}>{copy.cancel}</button> : request.author_id !== profile!.user_id && request.can_offer === true && ['open','pending'].includes(request.status) ? <button disabled={locked} onClick={() => void mutate(signal => client.offerIdea(request.id, signal))}>{copy.offer}</button> : null)}
          </article>) : empty}<p className="community-note">{copy.importHelp}</p>
        </div>}
        {tab === 'reuse' && <div><p className="community-note">{copy.importHelp}</p>{data.reuse?.length ? data.reuse.map(request => <article className="community-card" key={request.id}><span className="community-state">{request.display_name} · {modeLabel(request.mode)} · {copy.level} {request.source_level} · {status(request.status)}</span><h4 dir="auto">{request.activity}</h4>
          {actions(request.author_id === profile!.user_id && request.status === 'pending' ? <><button disabled={locked} onClick={() => void mutate(signal => client.respondReuse(request.id, 'accept', signal))}>{copy.accept}</button><button disabled={locked} onClick={() => void mutate(signal => client.respondReuse(request.id, 'decline', signal))}>{copy.decline}</button></> : request.requester_id === profile!.user_id && request.status === 'accepted' ? <button disabled={locked || !canImport} onClick={() => askImport('reuse', request.id, request.mode, request.source_level)}>{copy.import}</button> : null)}
        </article>) : empty}</div>}
      </section>}
    </>}
  </>;
  const shared = { className: 'community-panel', dir: language === 'ar' ? 'rtl' : 'ltr', lang: language, 'aria-labelledby': `${id}-title` };
  return presentation === 'section' ? <section {...shared}>{content}</section> : <dialog {...shared} ref={dialog} onCancel={event => { event.preventDefault(); onClose(); }} onKeyDown={event => event.stopPropagation()}>{content}</dialog>;
}

export function formatCommunityDate(value: string, language: string) {
  const date = new Date(value); if (!Number.isFinite(date.getTime())) return '';
  try { return new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(date); } catch { return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(date); }
}

function CommunityCardAudience({ audience, language, busy, onSave }: { audience: CardAudience; language: string; busy: boolean; onSave: (audience: CardAudience, confirmed: boolean) => void }) {
  const copy = cardAudienceCopy(language); const [selected, setSelected] = useState(audience); const [confirmed, setConfirmed] = useState(false);
  return <div className="community-card-audience">
    <CardAudienceControl language={language} value={selected} confirmed={confirmed} disabled={busy} onChange={next => { setSelected(next); setConfirmed(false); }} onConfirm={setConfirmed} />
    <button type="button" disabled={busy || selected === audience || selected === 'public' && !confirmed} onClick={() => {
      const publication = cardPublicationFields(selected, confirmed); setConfirmed(false); onSave(publication.audience, publication.public_confirmed);
    }}>{copy.save}</button>
  </div>;
}

function CommunityPublicLink({ card, language }: { card: CommunityCard; language: string }) {
  const copy = cardAudienceCopy(language); const flow = activityFlowCopy(language);
  const [copied, setCopied] = useState(false); const [failed, setFailed] = useState(false);
  useEffect(() => { setCopied(false); setFailed(false); }, [card.id, card.audience]);
  const url = typeof window === 'undefined' ? null : communityPublicCardLink(card, window.location.origin);
  if (!url) return null;
  return <div className="community-public-link"><button type="button" onClick={() => {
    setFailed(false); setCopied(false);
    if (!navigator.clipboard?.writeText) { setFailed(true); return; }
    void navigator.clipboard.writeText(url).then(() => setCopied(true), () => setFailed(true));
  }}>{copy.copyLink}</button>{copied && <p role="status">{copy.copied}</p>}{failed && <p role="alert">{flow.actionFailed}</p>}</div>;
}

function CommunityCardEvidence({ card, client, language }: { card: CommunityCardDetail; client: CommunityClient; language: string }) {
  const copy = cardAudienceCopy(language); const flow = activityFlowCopy(language); const community = communityCopy(language);
  const target = card.rubric_snapshot?.target;
  let link: string | null = null;
  try { const reference = new URL(card.reference_link ?? ''); if (reference.protocol === 'https:' && !reference.username && !reference.password) link = reference.href; } catch { /* Do not render malformed or credential-bearing references. */ }
  return <article className="community-review-detail" aria-label={copy.openCard}>
    <p className="community-state">{card.display_name} · {copy[normalizeCardAudience(card.audience)]}</p><h4 dir="auto">{card.activity}</h4>
    {target && <aside className="community-rubric"><strong>{community.next} · {target.level} · {target.name}</strong><p dir="auto">{target.description}</p><strong>{flow.alignment}</strong><p dir="auto">{card.target_alignment}</p></aside>}
    {card.proof?.kind === 'photo' ? isNormalizedEvidenceImage(card.proof.image) ? <img className="community-private-image" src={card.proof.image} alt={flow.preview} /> : <p role="alert">{flow.visualRequired}</p>
      : card.proof?.kind === 'video' ? <CommunityPrivateVideo key={card.id} client={client} cardId={card.id} language={language} /> : null}
    {card.reflection && <p dir="auto">{card.reflection}</p>}
    {link && <a href={link} target="_blank" rel="noopener noreferrer" dir="ltr">{link}</a>}
    <p className="community-note">{flow.privacy}</p><p className="community-note">{copy.networkApprovals}</p>
    {/* Reactions are never approvals. Reviews remain in the eligible review inbox. */}
  </article>;
}

function CommunityReviewDetail({ submission, userId, client, language, modeName, busy, onReview }: { submission: CommunitySubmission; userId: string; client: CommunityClient; language: string; modeName: string; busy: boolean; onReview: (decision: 'approve' | 'changes_requested', criteria: Criteria, feedback: string) => void }) {
  const copy = communityCopy(language); const flow = activityFlowCopy(language); const id = useId();
  const [criteria, setCriteria] = useState<[boolean, boolean, boolean]>([false, false, false]); const [feedback, setFeedback] = useState('');
  const available = canReviewCommunitySubmission(submission, userId);
  const length = Array.from(feedback.trim()).length; const target = submission.rubric_snapshot.target;
  const proof = submission.evidence;
  return <article className="community-review-detail" aria-labelledby={`${id}-title`}>
    <h4 id={`${id}-title`}>{modeName} · {copy.level} {submission.source_level} → {submission.target_level}</h4><h5 dir="auto">{submission.activity}</h5>
    <p className="community-state">{communityStatus(language, submission.status)} · {Number.isInteger(submission.review_count) && submission.review_count >= 0 && submission.review_count <= 3 && submission.review_quorum === 3 ? copy.count.replace('{count}', String(submission.review_count)) : copy.unavailable}</p>
    <aside className="community-rubric"><strong>{copy.next} · {target.level} · {target.name}</strong><p dir="auto">{target.description}</p><strong>{flow.alignment}</strong><p dir="auto">{submission.target_alignment}</p><p>{copy.effort}: {communityEffort(language, submission.rubric_snapshot.effort)}</p></aside>
    <p>{flow.visual}</p>
    {proof.image && isNormalizedEvidenceImage(proof.image) && !proof.video_asset_id ? <img className="community-private-image" src={proof.image} alt={flow.preview} /> : proof.video_asset_id && !proof.image && isVideoAssetId(proof.video_asset_id) ? <CommunityPrivateVideo key={proof.video_asset_id} client={client} assetId={proof.video_asset_id} language={language} /> : <p role="alert">{flow.visualRequired}</p>}
    <p dir="auto">{proof.reflection}</p><p className="community-note">{flow.privacy}</p>
    {available ? <form onSubmit={event => { event.preventDefault(); if (criteria.every(Boolean) && length <= 2000) onReview('approve', criteria, feedback); }}>
      <fieldset><legend>{copy.reviews}</legend>{copy.criteria.map((label, index) => <label className="community-checkbox" key={index}><input type="checkbox" checked={criteria[index]} disabled={busy} onChange={event => setCriteria(previous => previous.map((value, key) => key === index ? event.target.checked : value) as [boolean, boolean, boolean])} /><span>{label}</span></label>)}</fieldset>
      <label htmlFor={`${id}-feedback`}>{copy.feedback}</label><textarea id={`${id}-feedback`} dir="auto" value={feedback} disabled={busy} aria-describedby={`${id}-help`} onChange={event => setFeedback(event.target.value)} /><p id={`${id}-help`} className="community-note">{copy.feedbackHelp}</p>
      <div className="community-actions"><button type="submit" disabled={busy || !criteria.every(Boolean) || length > 2000}>{copy.approve}</button><button type="button" disabled={busy || length < 20 || length > 2000} onClick={() => onReview('changes_requested', criteria, feedback)}>{copy.changes}</button></div>
    </form> : <p>{copy.notReviewable}</p>}
    {submission.reviews.filter(review => review.feedback.trim()).map((review, index) => <blockquote key={`${review.reviewer_id}:${index}`}><strong>{communityStatus(language, review.decision === 'approve' ? 'approved' : 'changes_requested')}</strong><p dir="auto">{review.feedback}</p></blockquote>)}
  </article>;
}

function CommunityPrivateVideo({ client, assetId, cardId, language }: { client: CommunityClient; assetId?: string; cardId?: string; language: string }) {
  const copy = activityFlowCopy(language); const controller = useRef<AbortController | null>(null);
  const [url, setUrl] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState(false);
  useEffect(() => () => { controller.current?.abort(); controller.current = null; }, []);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  const load = async () => {
    if (controller.current) return;
    const next = new AbortController(); controller.current = next; setBusy(true); setError(false);
    try { const blob = await (cardId ? client.loadCardVideo(cardId, next.signal) : client.loadVideo(assetId!, next.signal)); checkEvidenceAbort(next.signal); validateEvidenceVideo(blob); setUrl(URL.createObjectURL(blob)); }
    catch (failure) { if (!next.signal.aborted && !isEvidenceAbort(failure)) setError(true); }
    finally { if (controller.current === next) { controller.current = null; setBusy(false); } }
  };
  return <div className="community-private-video">{url ? <video src={url} controls playsInline preload="none" aria-label={copy.preview} onError={() => setError(true)} /> : <button type="button" disabled={busy} onClick={() => void load()}>{busy ? copy.working : copy.loadVideo}</button>}{error && <p role="alert">{copy.errors.playbackFailed}</p>}</div>;
}
