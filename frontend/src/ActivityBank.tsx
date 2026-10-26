import { useRef } from 'react';
import { bankSources, getBankActivities, type BankLanguage } from './quoteActivityCatalog';

// Quotes retain the verified English wording outside Spanish. The original is
// explicitly identified rather than presenting an unverified translation.
const captions: Record<BankLanguage, [string, string, string, string, string, string]> = {
  es: ['Una idea para llevar a tu vida', 'Tu siguiente práctica', 'Propuesta de Modo Cultiva', 'Traducción editorial · fragmento', 'Fuente y texto original', 'Ver recomendación'],
  en: ['An idea to live by', 'Your next practice', 'A Modo Cultiva suggestion', 'Original excerpt · English', 'Source and original text', 'View recommendation'],
  zh: ['让想法走进生活', '下一项实践', 'Modo Cultiva 的建议', '英语原文节选', '来源与原文', '查看推荐'],
  hi: ['जीवन में उतारने योग्य विचार', 'आपका अगला अभ्यास', 'Modo Cultiva का सुझाव', 'मूल अंग्रेज़ी अंश', 'स्रोत और मूल पाठ', 'सुझाव देखें'],
  ar: ['فكرة تعيشها', 'ممارستك التالية', 'اقتراح من Modo Cultiva', 'مقتطف أصلي بالإنجليزية', 'المصدر والنص الأصلي', 'عرض التوصية'],
  it: ['Un’idea da vivere', 'La tua prossima pratica', 'Una proposta di Modo Cultiva', 'Estratto originale in inglese', 'Fonte e testo originale', 'Vedi raccomandazione'],
  pt: ['Uma ideia para viver', 'Sua próxima prática', 'Uma proposta do Modo Cultiva', 'Trecho original em inglês', 'Fonte e texto original', 'Ver recomendação'],
  ru: ['Идея для жизни', 'Ваша следующая практика', 'Предложение Modo Cultiva', 'Оригинальный отрывок на английском', 'Источник и оригинал', 'Открыть рекомендацию'],
  de: ['Eine Idee fürs Leben', 'Deine nächste Praxis', 'Ein Vorschlag von Modo Cultiva', 'Originalauszug auf Englisch', 'Quelle und Originaltext', 'Empfehlung ansehen'],
  fr: ['Une idée à vivre', 'Votre prochaine pratique', 'Une suggestion de Modo Cultiva', 'Extrait original en anglais', 'Source et texte original', 'Voir la recommandation'],
  da: ['En idé at leve efter', 'Din næste praksis', 'Et forslag fra Modo Cultiva', 'Originalt uddrag på engelsk', 'Kilde og originaltekst', 'Se anbefaling'],
};
type Props = {
  modeKey: string; modeName: string; modeIcon: string; level: number;
  language: BankLanguage; selection: number; onSelect: (index: number) => void;
  onUse: () => void; activityLabel: string; effortLabel: string; useLabel: string;
  previousLabel: string; nextLabel: string; recommendationsLabel: string;
};

export function ActivityBank(props: Props) {
  const { modeKey, language, level, selection, onSelect } = props;
  const slides = getBankActivities(modeKey, level, language);
  const activity = slides[selection] ?? slides[0];
  const touchStart = useRef<number | null>(null);
  if (!activity) return null;
  const source = bankSources[activity.quote.source];
  const [idea, practice, suggestion, translation, sourceLabel, view] = captions[language];
  const move = (delta: number) => onSelect((selection + delta + slides.length) % slides.length);
  return <div className="bank-presentation" role="region" aria-label={props.recommendationsLabel} aria-roledescription="carousel"
    onKeyDown={event => {
      if (event.key === 'ArrowRight') { event.preventDefault(); move(language === 'ar' ? -1 : 1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); move(language === 'ar' ? 1 : -1); }
    }}>
    <div className="bank-presentation-heading"><span>{idea}</span><span className="bank-slide-count" aria-live="polite" aria-atomic="true">{String(selection + 1).padStart(2, '0')} <i>/ {slides.length}</i></span></div>
    <article className="bank-slide" key={`${modeKey}-${level}-${selection}`} aria-label={`${props.recommendationsLabel} ${selection + 1} / ${slides.length}`}
      onTouchStart={event => { touchStart.current = event.touches[0].clientX; }}
      onTouchEnd={event => {
        if (touchStart.current === null) return;
        const distance = touchStart.current - event.changedTouches[0].clientX;
        touchStart.current = null;
        if (Math.abs(distance) > 55) move((distance > 0 ? 1 : -1) * (language === 'ar' ? -1 : 1));
      }}>
      <div className="bank-quote-page">
        <span className="bank-quote-mark" aria-hidden="true">“</span>
        <div className="bank-page-category"><span aria-hidden="true">{props.modeIcon}</span>{props.modeName}</div>
        <blockquote lang={language === 'es' ? 'es' : 'en'} dir={language === 'es' || language === 'en' ? undefined : 'ltr'}>{language === 'es' ? activity.quote.es : activity.quote.en}</blockquote>
        <div className="bank-attribution"><span className="bank-author-line" aria-hidden="true" /><cite>{source.author}</cite><small>{translation}</small></div>
        <details className="bank-source"><summary>{sourceLabel} <span aria-hidden="true">↗</span></summary><p lang="en" dir="ltr">“{activity.quote.en}”</p><a href={source.url} target="_blank" rel="noopener noreferrer" lang="en" dir="ltr">{source.title} · {activity.quote.locator} ↗</a></details>
      </div>
      <div className="bank-practice-page">
        <div className="bank-practice-top"><span>{practice}</span><span aria-hidden="true">↘</span></div>
        <span className="bank-level">{props.activityLabel}</span>
        <h3>{activity.title}</h3>
        <p>{activity.description}</p>
        <span className="bank-effort">{props.effortLabel}</span>
        <small className="bank-editorial-credit">{suggestion}</small>
        <button className="bank-use" type="button" onClick={props.onUse}>{props.useLabel}<span aria-hidden="true">↗</span></button>
      </div>
    </article>
    <nav className="bank-navigation" aria-label={props.recommendationsLabel}>
      <button type="button" className="bank-arrow" onClick={() => move(-1)} aria-label={props.previousLabel}>←</button>
      <div className="bank-pagination">{slides.map((slide, index) => <button type="button" key={slide.quote.id} aria-current={selection === index ? 'true' : undefined} aria-label={`${view} ${index + 1}: ${slide.quote.en}`} onClick={() => onSelect(index)}><span>{String(index + 1).padStart(2, '0')}</span></button>)}</div>
      <button type="button" className="bank-arrow" onClick={() => move(1)} aria-label={props.nextLabel}>→</button>
    </nav>
  </div>;
}
