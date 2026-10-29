import { useEffect, useId, useRef, useState } from 'react';
import { CultivaLeaf } from './CultivaLeaf';
import { fetchPublicCommunityCard, loadPublicCardVideo, type CommunityCardDetail, type CommunityClient } from './communityClient';
import { isNormalizedEvidenceImage, validateEvidenceVideo } from './visualEvidence';
import { publicCardCopy } from './publicCardMessages';
import './public-activity-card.css';

export function PublicActivityCard({ apiUrl, cardId, client, language, modeNames, onClose }: { apiUrl: string; cardId: string; client: CommunityClient | null; language: string; modeNames: Record<string, string>; onClose: () => void }) {
  const copy = publicCardCopy(language); const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const [card, setCard] = useState<CommunityCardDetail | null>(null);
  const [error, setError] = useState(false); const [reload, setReload] = useState(0);
  useEffect(() => {
    const node = dialog.current!; const trigger = document.activeElement as HTMLElement | null;
    node.showModal();
    return () => { node.close(); if (trigger?.isConnected) trigger.focus({ preventScroll: true }); };
  }, []);
  useEffect(() => {
    const controller = new AbortController(); setCard(null); setError(false);
    const read = client ? client.card(cardId, controller.signal) : fetchPublicCommunityCard(apiUrl, cardId, controller.signal);
    void read.then(value => { if (!controller.signal.aborted) setCard(value); }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [apiUrl, cardId, client, reload]);
  const count = card && card.review_quorum === 3 && Number.isInteger(card.review_count) && card.review_count >= 0 && card.review_count <= 3 ? card.review_count : 0;
  const validated = card?.validation_status === 'approved' && count === 3;
  let reference: string | null = null;
  try { const value = card?.reference_link ? new URL(card.reference_link) : null; if (value?.protocol === 'https:' && !value.username && !value.password) reference = value.href; } catch { /* Never activate malformed author URLs. */ }
  return <dialog className="public-activity-card" ref={dialog} dir={language === 'ar' ? 'rtl' : 'ltr'} lang={language} aria-labelledby={`${id}-title`} onCancel={event => { event.preventDefault(); onClose(); }} onKeyDown={event => event.stopPropagation()}>
    <header><span className="public-card-brand"><CultivaLeaf />Modo Cultiva</span><button type="button" onClick={onClose} aria-label={copy.close}>×</button></header>
    {card ? <article>
      <p className="public-card-audience">{card.audience === 'public' ? copy.public : copy.network}</p>
      <p className="public-card-mode">{modeNames[card.mode] ?? card.mode} · {copy.level} {card.source_level.toLocaleString(language)}</p>
      <h2 id={`${id}-title`} dir="auto">{card.activity}</h2><p className="public-card-author" dir="auto">{card.display_name}</p>
      {card.proof?.kind === 'photo' && isNormalizedEvidenceImage(card.proof.image) ? <img className="public-card-photo" src={card.proof.image} alt={copy.photo} />
        : card.proof?.kind === 'video' ? <CardVideo key={`${card.id}:${card.audience}:${reload}`} card={card} apiUrl={apiUrl} client={client} language={language} /> : <p className="public-card-note">{copy.noProof}</p>}
      {card.reflection && <p className="public-card-reflection" dir="auto">{card.reflection}</p>}
      {reference && <a href={reference} rel="noopener noreferrer nofollow" target="_blank">{copy.reference} ↗</a>}
      {card.rubric_snapshot && <aside className="public-card-goal"><span>{copy.target} · {copy.level} {card.rubric_snapshot.target.level}</span><strong dir="auto">{card.rubric_snapshot.target.name}</strong><p dir="auto">{card.rubric_snapshot.target.description}</p>{card.target_alignment && <p dir="auto">{card.target_alignment}</p>}</aside>}
      {card.has_evidence && <p className={`public-card-validation${validated ? ' is-validated' : ''}`} role="status">{validated ? copy.validated : copy.awaiting.replace('{count}', String(count))}</p>}
    </article> : <div className="public-card-empty"><h2 id={`${id}-title`}>{error ? copy.unavailable : copy.loading}</h2>{error && <button type="button" onClick={() => setReload(current => current + 1)}>{copy.retry}</button>}</div>}
    <button type="button" className="public-card-return" onClick={onClose}>{copy.close} ↗</button>
  </dialog>;
}

function CardVideo({ card, apiUrl, client, language }: { card: CommunityCardDetail; apiUrl: string; client: CommunityClient | null; language: string }) {
  const copy = publicCardCopy(language); const controller = useRef<AbortController | null>(null);
  const [url, setUrl] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState(false);
  useEffect(() => () => { controller.current?.abort(); controller.current = null; }, []);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  const play = async () => {
    if (controller.current) return;
    const current = new AbortController(); controller.current = current; setBusy(true); setError(false);
    try {
      const blob = client ? await client.loadCardVideo(card.id, current.signal) : await loadPublicCardVideo(apiUrl, card.id, current.signal);
      if (current.signal.aborted) return;
      validateEvidenceVideo(blob); setUrl(URL.createObjectURL(blob));
    } catch { if (!current.signal.aborted) setError(true); }
    finally { if (controller.current === current) { controller.current = null; setBusy(false); } }
  };
  return <div className="public-card-video">{url ? <video src={url} controls playsInline preload="none" aria-label={copy.photo} onError={() => setError(true)} /> : <button type="button" disabled={busy} onClick={() => void play()}>{busy ? copy.loading : copy.play}</button>}{error && <p role="alert">{copy.unavailable}</p>}</div>;
}
