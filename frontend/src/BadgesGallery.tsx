import { useState, type CSSProperties } from 'react';
import { badgeCopy } from './badgeMessages';
import { BadgeMedal } from './BadgeMedal';
import type { badgeProgress } from './badgeProgress';
import './badges-gallery.css';

type GalleryBadge = { key: string; icon: string; title: string; description: string; earned: boolean; featured: boolean };
type Props = {
  language: string; badges: GalleryBadge[]; featuredKeys: string[]; progress: ReturnType<typeof badgeProgress>;
  modes: { key: string; name: string; color: string; icon: string }[];
  tr: (key: string) => string; onFeature: (key: string) => void; onProfile: () => void; onLevel: (mode: string, level: number) => void;
};

export function BadgesGallery({ language, badges, featuredKeys, progress, modes, tr, onFeature, onProfile, onLevel }: Props) {
  const copy = badgeCopy(language);
  const [trackerOpen, setTrackerOpen] = useState(false);
  const number = (value: number) => value.toLocaleString(language);
  const featureButton = (badge: GalleryBadge) => <button type="button" className="achievement-feature" disabled={!badge.earned || (!badge.featured && featuredKeys.length >= 3)} aria-pressed={badge.featured} onClick={() => onFeature(badge.key)}>{badge.earned ? badge.featured ? tr('featuredBadge') : featuredKeys.length >= 3 ? tr('chooseOtherBadge') : tr('highlightBadge') : copy.locked}</button>;
  const nextMode = modes.find(mode => progress.perMode[mode.key].some(done => !done));
  return <section className="badges-gallery" dir={language === 'ar' ? 'rtl' : 'ltr'} aria-labelledby="badges-gallery-title">
    <header className="achievement-heading"><div><p className="achievement-eyebrow">{copy.collection}</p><h4 id="badges-gallery-title">{tr('badges')}</h4></div><span className="achievement-featured-count">{number(featuredKeys.length)} / {number(3)} <span>{tr('featuredCountLabel')}</span></span></header>
    <p className="achievement-intro">{copy.intro}</p>
    <div className="achievement-stats">
      <div><strong>{number(badges.filter(badge => badge.earned).length)}<small> / {number(badges.length)}</small></strong><span>{copy.unlocked}</span></div>
      <div><strong>{number(progress.completed)}<small> / {number(120)}</small></strong><span>{copy.completed}</span></div>
      <div><strong>{number(progress.maxedModes)}<small> / {number(12)}</small></strong><span>{copy.mastery}</span></div>
    </div>
    <div className="premium-achievements">
      {badges.filter(badge => badge.key === 'completionist' || badge.key === 'maxed').map(badge => {
        const maxed = badge.key === 'maxed'; const value = maxed ? progress.maxedModes : progress.completed; const target = maxed ? 12 : 120;
        return <article key={badge.key} data-badge={badge.key} data-earned={badge.earned} className={`premium-achievement premium-achievement--${badge.key}${badge.earned ? ' is-earned' : ''}`}>
          <div className="premium-achievement-top"><span>{copy.premium}</span><span className="achievement-state">{badge.earned ? `✓ ${copy.earned}` : <><svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="3.5" y="7" width="9" height="7" rx="2" stroke="currentColor" /><path d="M5.5 7V4a2.5 2.5 0 0 1 5 0v3" stroke="currentColor" /></svg>{copy.locked}</>}</span></div>
          <div className="premium-achievement-art"><BadgeMedal badgeKey={badge.key} icon={badge.icon} /></div>
          <h5>{badge.title}</h5><p>{badge.description}</p>
          <div className="achievement-progress-label"><span>{maxed ? copy.mastery : copy.completed}</span><strong>{number(value)} / {number(target)}</strong></div>
          <div className="achievement-progress" role="progressbar" aria-label={badge.title} aria-valuemin={0} aria-valuemax={target} aria-valuenow={value}><i style={{ width: `${value / target * 100}%` }} /></div>
          {featureButton(badge)}
        </article>;
      })}
    </div>
    <div className="achievement-featured"><div><span className="achievement-eyebrow">{tr('profileSection')}</span><p>{featuredKeys.length ? tr('featuredAchievements') : tr('noFeaturedAchievements')}</p><div className="achievement-featured-items">{featuredKeys.map(key => { const badge = badges.find(item => item.key === key)!; return <span key={key} title={badge.title}><BadgeMedal badgeKey={key} icon={badge.icon} small /><span>{badge.title}</span></span>; })}</div></div><button type="button" onClick={onProfile}>{tr('viewMyProfile')} <span aria-hidden="true">↗</span></button></div>
    <div className="achievement-collection-heading"><h5>{copy.regular}</h5><span>{number(badges.filter(badge => badge.earned && badge.key !== 'completionist' && badge.key !== 'maxed').length)} / {number(8)}</span></div>
    <div className="achievement-grid">{badges.filter(badge => badge.key !== 'completionist' && badge.key !== 'maxed').map(badge => <article key={badge.key} data-badge={badge.key} data-earned={badge.earned} className={`achievement-card${badge.earned ? ' is-earned' : ''}${badge.featured ? ' is-featured' : ''}`}><BadgeMedal badgeKey={badge.key} icon={badge.icon} /><div><h5>{badge.title}</h5><p>{badge.description}</p>{featureButton(badge)}</div></article>)}</div>
    <div className="achievement-tracker"><button type="button" className="achievement-tracker-toggle" aria-expanded={trackerOpen} aria-controls="achievement-tracker-content" onClick={() => setTrackerOpen(!trackerOpen)}><span>{copy.tracker}</span><span>{number(progress.completed)} / {number(120)} <b aria-hidden="true">{trackerOpen ? '−' : '+'}</b></span></button>
      {trackerOpen && <div id="achievement-tracker-content"><p>{copy.trackerHint}</p>{modes.map(mode => <div key={mode.key} className="achievement-tracker-row" style={{ '--tracker-color': mode.color } as CSSProperties}><span><i aria-hidden="true">{mode.icon}</i>{mode.name}</span><div>{progress.perMode[mode.key].map((done, level) => <button type="button" key={level} className={done ? 'is-complete' : ''} aria-label={`${mode.name} · ${copy.level} ${number(level)}${done ? ` · ${copy.done}` : ''}`} title={`${copy.level} ${number(level)}${done ? ` · ${copy.done}` : ''}`} onClick={() => onLevel(mode.key, level)}>{done ? '✓' : number(level)}</button>)}</div></div>)}</div>}
    </div>
    {nextMode && <button className="achievement-next" type="button" onClick={() => onLevel(nextMode.key, progress.perMode[nextMode.key].findIndex(done => !done))}>{copy.next} <span aria-hidden="true">↗</span></button>}
  </section>;
}

export function ActivityCompletion({ language, activity, completed, onToggle }: { language: string; activity: string; completed: boolean; onToggle: () => void }) {
  const copy = badgeCopy(language); const [error, setError] = useState('');
  return <div className={`activity-completion${completed ? ' is-complete' : ''}`}>
    <button type="button" disabled={!activity.trim()} aria-pressed={completed} aria-label={completed ? copy.undo : copy.mark} onClick={() => { try { onToggle(); setError(''); } catch { setError(copy.storageError); } }}><span aria-hidden="true">{completed ? '✓' : '○'}</span>{completed ? copy.done : copy.mark}</button>
    <p>{activity.trim() ? copy.confirmHint : copy.define}</p>{error && <p role="alert">{error}</p>}
  </div>;
}
