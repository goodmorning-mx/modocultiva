import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { CultivaLeaf } from './CultivaLeaf';
import { createActivityImage } from './activityShareImage';
import { REACTIONS, SHARE_PLATFORMS, platformName, shareCaption, socialCopy, type ActivityShare, type Reaction, type SharePlatform } from './journeySocial';
import './journey-social.css';

function ReactionIcon({ reaction }: { reaction: Reaction }) {
  if (reaction === 'leaf') return <CultivaLeaf />;
  return <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false">
    {reaction === 'soil' && <><path d="m3 19 7-7 7 2 6-5 6 10-13 9Z" fill="#986a45" /><path d="m3 19 13 3 13-3-13 9Z" fill="#563a2a" /><path d="m10 12 2 5 5-3m6-5-2 9" stroke="#d9b083" strokeWidth="1.3" /><circle cx="10" cy="21" r="1" fill="#d9b083" /><circle cx="20" cy="23" r="1" fill="#bd8b58" /></>}
    {reaction === 'water' && <><path d="M16 3C13 9 6 15 6 21a10 10 0 0 0 20 0C26 15 19 9 16 3Z" fill="#60cdeb" /><path d="M16 3c4 10 9 22-3 27 14 2 17-12 9-20Z" fill="#2a8cae" opacity=".65" /><path d="M11 17c-2 3-2 6 0 8" stroke="#c2f7ff" strokeWidth="2" strokeLinecap="round" /></>}
    {reaction === 'sun' && <><g stroke="#edc56a" strokeWidth="2" strokeLinecap="round"><path d="M16 2v3m0 22v3M2 16h3m22 0h3M6 6l2 2m16 16 2 2M6 26l2-2M24 8l2-2" /></g><circle cx="16" cy="16" r="8" fill="#edc56a" /><path d="M12 11c2-2 5-2 7 0" stroke="#fff2ba" strokeWidth="2" strokeLinecap="round" /></>}
    {reaction === 'roots' && <><path d="M16 3v14m0-6-6-5m6 9 7-7M16 17l-5 6-6 3m6-3 1 6m4-12 5 7 6 3m-6-3-1 6m-4-13v12" stroke="#ceaa7b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><path d="M16 8C9 9 7 5 7 3c5 0 8 0 9 5Zm0-2c1-4 5-5 9-4-1 5-4 7-9 7Z" fill="#78bc7b" /></>}
  </svg>;
}

function PlatformIcon({ platform }: { platform: SharePlatform }) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    {platform === 'linkedin' && <><rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.4" /><path d="M7 10v7m0-10v.1M11 17v-7m0 3c0-4 6-4 6 0v4" stroke="currentColor" strokeWidth="2" /></>}
    {platform === 'whatsapp' && <><path d="M5 18 3 21l5-1a9 9 0 1 0-3-2Z" stroke="currentColor" strokeWidth="1.4" /><path d="m9 7-1 3c1 3 3 5 6 6l3-2-3-2-1 1-2-2 1-1Z" fill="currentColor" /></>}
    {platform === 'instagram' && <><rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.5" /><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" /></>}
    {platform === 'facebook' && <path d="M14 22v-9h3l.6-4H14V7c0-1 .5-2 2-2h2V1h-3c-4 0-6 2-6 6v2H6v4h3v9Z" fill="currentColor" />}
  </svg>;
}

function SharePreview({ card, platform, onClose }: { card: ActivityShare; platform: SharePlatform; onClose: () => void }) {
  const snapshot = useRef(card).current;
  const copy = socialCopy(card.language);
  const ref = useRef<HTMLDialogElement>(null);
  const headingId = useId(); const descriptionId = useId();
  const [prepared, setPrepared] = useState<{ file: File; url: string; excerpt: boolean } | null>(null);
  const [notice, setNotice] = useState(''); const [busy, setBusy] = useState(false);
  const [imageError, setImageError] = useState(false);
  useEffect(() => {
    const dialog = ref.current!; const trigger = document.activeElement as HTMLElement | null;
    dialog.showModal();
    return () => { dialog.close(); trigger?.focus({ preventScroll: true }); };
  }, []);
  useEffect(() => {
    let cancelled = false; let url = '';
    void createActivityImage(snapshot, platform).then(result => {
      if (cancelled) return;
      url = URL.createObjectURL(result.file); setPrepared({ ...result, url });
    }).catch(() => { if (!cancelled) setImageError(true); });
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [snapshot, platform]);
  let canShare = false;
  try { canShare = Boolean(prepared && typeof navigator.share === 'function' && navigator.canShare?.({ files: [prepared.file] })); } catch { /* Download remains available. */ }
  const nativeShare = async () => {
    if (!prepared || busy) return;
    setBusy(true); setNotice('');
    try {
      // Called directly from this second click, after file generation: preserves user activation.
      await navigator.share({ files: [prepared.file] });
      // A resolved share promise is NOT proof the person published; show no success claim.
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) setNotice(copy.error);
    } finally { setBusy(false); }
  };
  return <dialog className="activity-share-dialog" ref={ref} aria-labelledby={headingId} aria-describedby={descriptionId} dir={card.language === 'ar' ? 'rtl' : 'ltr'} onCancel={event => { event.preventDefault(); onClose(); }} onKeyDown={event => event.stopPropagation()} onClick={event => { if (event.target === event.currentTarget) { const box = event.currentTarget.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onClose(); } }}>
    <header><div><span>{copy.preview}</span><h2 id={headingId}>{platformName(platform, card.language)}</h2></div><button className="share-close" type="button" onClick={onClose} aria-label={copy.close}>×</button></header>
    <div className="activity-share-content">
      <div className="activity-share-image">{prepared ? <img src={prepared.url} alt={`${card.mode} · ${card.levelLabel} ${card.level}: ${card.activity}`} /> : <p role="status">{imageError ? copy.error : copy.preparing}</p>}</div>
      <div className="activity-share-instructions"><p id={descriptionId}>{copy.steps[platform]}</p><p className="activity-share-privacy">{copy.privacy}</p>{prepared?.excerpt && <p>{copy.excerpt}</p>}
        <div className="activity-share-actions">
          {canShare && <button type="button" className="share-primary" disabled={busy} onClick={() => void nativeShare()}>{copy.native} ↗</button>}
          {prepared && <a className={canShare ? '' : 'share-primary'} href={prepared.url} download={prepared.file.name}>{copy.download} ↓</a>}
          <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(shareCaption(card)); setNotice(copy.copied); } catch { setNotice(copy.error); } }}>{copy.copy}</button>
        </div>
        <p className="activity-share-notice" role="status">{notice}</p>
      </div>
    </div>
  </dialog>;
}

type Props = { card: ActivityShare; current: boolean; defined: boolean; reaction?: Reaction; onReact: (reaction: Reaction) => void };
export function JourneyActivityCard({ card, current, defined, reaction, onReact }: Props) {
  const copy = socialCopy(card.language);
  const [platform, setPlatform] = useState<SharePlatform | null>(null);
  const [notice, setNotice] = useState('');
  const headingId = useId();
  return <article className={`journey-level-card journey-level-card--active journey-social-card${current ? ' journey-level-card--current' : ''}${defined ? '' : ' journey-social-card--empty'}`} style={{ '--mode-color': card.color } as CSSProperties} aria-labelledby={headingId}>
    <div className="journey-social-art" aria-hidden="true"><span>{card.icon}</span><svg viewBox="0 0 440 220" fill="none"><path d="M440 12C310 28 346 132 182 220M440 45C323 49 352 145 222 220M440 80C356 83 365 163 267 220M440 116C391 113 392 170 312 220" stroke="currentColor" /></svg></div>
    <header className="journey-social-heading"><div className="journey-social-mode"><span aria-hidden="true">{card.icon}</span><span>{card.mode}</span></div><div className="journey-social-level"><span>{card.levelLabel}</span><strong>{card.level.toLocaleString(card.language)}</strong></div></header>
    <div className="journey-social-body"><span className="journey-social-stage">{card.stage}</span><h4 id={headingId} dir="auto" tabIndex={card.activity.length > 100 ? 0 : undefined} className={`journey-social-title${card.activity.length > 100 ? ' journey-social-title--long' : ''}`}>{card.activity}</h4><div className="journey-social-effort"><i aria-hidden="true" />{card.effort}</div></div>
    <div className="journey-social-track" aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <i key={i} className={i < card.level ? 'is-filled' : ''} />)}</div>
    <footer className="journey-social-footer">
      <div className="journey-reactions"><span className="journey-social-label">{copy.reaction}</span><div role="group" aria-label={copy.reaction}>{REACTIONS.map((key, i) => <button key={key} type="button" className={`journey-reaction journey-reaction--${key}`} aria-label={copy.reactions[i]} title={copy.reactions[i]} aria-pressed={reaction === key} onClick={() => { try { onReact(key); setNotice(''); } catch { setNotice(copy.storageError); } }}><ReactionIcon reaction={key} /></button>)}</div></div>
      <div className="journey-share"><span className="journey-social-label">{copy.share}</span><div role="group" aria-label={copy.share}>{SHARE_PLATFORMS.map(key => <button key={key} type="button" onClick={() => setPlatform(key)} aria-label={`${copy.share} · ${platformName(key, card.language)}`} title={platformName(key, card.language)}><PlatformIcon platform={key} /><span>{platformName(key, card.language)}</span></button>)}</div></div>
    </footer>
    {notice && <p className="journey-reaction-notice" role="status">{notice}</p>}
    {platform && <SharePreview card={card} platform={platform} onClose={() => setPlatform(null)} />}
  </article>;
}
