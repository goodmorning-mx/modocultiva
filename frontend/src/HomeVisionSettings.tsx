import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { hasVisionImage } from './badgeProgress';
import { defaultModePhoto, homeModePhoto, homeVisionCopy, type HomeVisionCards } from './homeVision';
import './home-vision-settings.css';

type Props = {
  language: Parameters<typeof homeVisionCopy>[0];
  modes: { key: string; name: string; color: string }[];
  images: Record<string, string | undefined>;
  preferences: HomeVisionCards;
  closeLabel: string;
  onChange: (mode: string, useVision: boolean) => boolean;
  onClose: () => void;
};

export function HomeVisionSettings({ language, modes, images, preferences, closeLabel, onChange, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [failed, setFailed] = useState(false);
  const [title, summary, defaultLabel, visionLabel, noPhoto, saveError] = homeVisionCopy(language);
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => element.close();
  }, []);

  return <dialog ref={dialog} className="home-vision-settings" dir={language === 'ar' ? 'rtl' : 'ltr'} aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => {
      if (event.target !== event.currentTarget) return;
      const box = event.currentTarget.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onClose();
    }}>
    <header><div><h2 id={`${id}-title`}>{title}</h2><p id={`${id}-description`}>{summary}</p></div>
      <button className="home-vision-close" type="button" onClick={onClose} aria-label={closeLabel} autoFocus>×</button>
    </header>
    {failed && <p role="alert">{saveError}</p>}
    <div className="home-vision-modes">
      {modes.map(mode => {
        const available = hasVisionImage(images[mode.key]);
        const selected = Boolean(available && preferences[mode.key]);
        const fallback = defaultModePhoto(mode.key);
        return <fieldset key={mode.key} data-mode={mode.key} style={{ '--mode-color': mode.color } as CSSProperties} aria-describedby={!available ? `${id}-${mode.key}` : undefined}>
          <legend>{mode.name}</legend>
          <img src={homeModePhoto(mode.key, images[mode.key], preferences)} alt="" loading="lazy" onError={event => {
            if (event.currentTarget.getAttribute('src') !== fallback) event.currentTarget.src = fallback;
          }} />
          <div className="home-vision-options">
            <label><input type="radio" name={`${id}-${mode.key}-source`} value="default" checked={!selected} onChange={() => setFailed(!onChange(mode.key, false))} />{defaultLabel}</label>
            <label><input type="radio" name={`${id}-${mode.key}-source`} value="vision" checked={selected} disabled={!available} onChange={() => setFailed(!onChange(mode.key, true))} />{visionLabel}</label>
            {!available && <small id={`${id}-${mode.key}`}>{noPhoto}</small>}
          </div>
        </fieldset>;
      })}
    </div>
  </dialog>;
}
