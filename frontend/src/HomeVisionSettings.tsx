import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { hasVisionImage } from './badgeProgress';
import { VisionImage } from './VisionImage';
import { PremiumModeArtwork } from './PremiumModeArtwork';
import { defaultModePhoto, homeModePhoto, homeImageSource, homeVisionCopy, electricSymbolLabel, type HomeVisionCards, type HomeImageSource } from './homeVision';
import './home-vision-settings.css';

type Props = {
  language: Parameters<typeof homeVisionCopy>[0];
  modes: { key: string; name: string; color: string }[];
  images: Record<string, string | undefined>;
  preferences: HomeVisionCards;
  closeLabel: string;
  uploadLabel: string;
  changeLabel: string;
  onChange: (mode: string, source: HomeImageSource) => boolean;
  onUpload: (mode: string, image: string) => boolean;
  onClose: () => void;
};

export function HomeVisionSettings({ language, modes, images, preferences, closeLabel, uploadLabel, changeLabel, onChange, onUpload, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [failed, setFailed] = useState(false);
  const [uploadMode, setUploadMode] = useState<string | null>(null);
  const [title, summary, stockLabel, visionLabel, , saveError] = homeVisionCopy(language);
  const pickSource = (mode: string, source: HomeImageSource) => {
    if (source === 'vision' && !hasVisionImage(images[mode])) {
      setFailed(false);
      setUploadMode(mode);
      setFailed(!onChange(mode, source));
      return;
    }
    setUploadMode(source === 'vision' ? mode : null);
    setFailed(!onChange(mode, source));
  };
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
        const selected = homeImageSource(mode.key, images[mode.key], preferences);
        const fallback = defaultModePhoto(mode.key);
        return <fieldset key={mode.key} data-mode={mode.key} style={{ '--mode-color': mode.color } as CSSProperties}>
          <legend>{mode.name}</legend>
          {selected === 'electric' ? <PremiumModeArtwork src={homeModePhoto(mode.key, images[mode.key], preferences)} fallbackSrc={fallback} color={mode.color} className="home-vision-symbol-preview" lazy /> : <img src={homeModePhoto(mode.key, images[mode.key], preferences)} alt="" loading="lazy" onError={event => {
            if (event.currentTarget.getAttribute('src') !== fallback) event.currentTarget.src = fallback;
          }} />}
          <div className="home-vision-options">
            <label><input type="radio" name={`${id}-${mode.key}-source`} value="electric" checked={selected === 'electric'} onChange={() => pickSource(mode.key, 'electric')} />{electricSymbolLabel(language)}</label>
            <label><input type="radio" name={`${id}-${mode.key}-source`} value="vision" checked={selected === 'vision'} onChange={() => pickSource(mode.key, 'vision')} />{visionLabel}</label>
            <label><input type="radio" name={`${id}-${mode.key}-source`} value="stock" checked={selected === 'stock'} onChange={() => pickSource(mode.key, 'stock')} />{stockLabel}</label>
          </div>
          {(selected === 'vision' || uploadMode === mode.key) && <div className="home-vision-upload">
            <VisionImage value={images[mode.key]} compact language={language} title={visionLabel} uploadLabel={uploadLabel} changeLabel={changeLabel}
              onChange={image => setFailed(!onUpload(mode.key, image))} />
          </div>}
        </fieldset>;
      })}
    </div>
  </dialog>;
}
