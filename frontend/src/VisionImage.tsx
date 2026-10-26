import { useEffect, useRef, useState } from 'react';
import { prepareVisionImage, VisionImageError } from './imagePreparation';

type Language = 'es' | 'en' | 'zh' | 'hi' | 'ar' | 'it' | 'pt' | 'ru' | 'de' | 'fr' | 'da';
const notices: Record<Language, [string, string, string, string]> = {
  es: ['Ajustando imagen…', 'No se pudo abrir esta imagen. Prueba con JPG, PNG o WebP.', 'La imagen es demasiado grande. Elige un archivo de menos de 40 MB.', 'No hay espacio para guardar la imagen. La imagen anterior se conserva.'],
  en: ['Fitting image…', 'This image could not be opened. Try JPG, PNG or WebP.', 'This image is too large. Choose a file smaller than 40 MB.', 'There is not enough storage to save this image. Your previous image is preserved.'],
  zh: ['正在调整图片…', '无法打开此图片，请尝试 JPG、PNG 或 WebP。', '图片过大，请选择小于40 MB的文件。', '存储空间不足，原图片已保留。'],
  hi: ['चित्र समायोजित हो रहा है…', 'यह चित्र नहीं खुल सका। JPG, PNG या WebP आज़माएँ।', 'चित्र बहुत बड़ा है। 40 MB से छोटी फ़ाइल चुनें।', 'चित्र सहेजने के लिए जगह नहीं है। पिछला चित्र सुरक्षित है।'],
  ar: ['جارٍ ضبط الصورة…', 'تعذّر فتح الصورة. جرّب JPG أو PNG أو WebP.', 'الصورة كبيرة جداً. اختر ملفاً أصغر من 40 MB.', 'لا توجد مساحة كافية لحفظ الصورة. تم الاحتفاظ بالصورة السابقة.'],
  it: ['Adattamento immagine…', 'Impossibile aprire l’immagine. Prova JPG, PNG o WebP.', 'Immagine troppo grande. Scegli un file sotto i 40 MB.', 'Spazio insufficiente per salvare. L’immagine precedente è conservata.'],
  pt: ['Ajustando imagem…', 'Não foi possível abrir a imagem. Tente JPG, PNG ou WebP.', 'Imagem grande demais. Escolha um arquivo menor que 40 MB.', 'Não há espaço para salvar. A imagem anterior foi preservada.'],
  ru: ['Подгонка изображения…', 'Не удалось открыть изображение. Попробуйте JPG, PNG или WebP.', 'Изображение слишком большое. Выберите файл меньше 40 МБ.', 'Недостаточно места для сохранения. Предыдущее изображение сохранено.'],
  de: ['Bild wird angepasst…', 'Das Bild lässt sich nicht öffnen. Versuche JPG, PNG oder WebP.', 'Das Bild ist zu groß. Wähle eine Datei unter 40 MB.', 'Nicht genug Speicherplatz. Dein bisheriges Bild bleibt erhalten.'],
  fr: ['Ajustement de l’image…', 'Impossible d’ouvrir l’image. Essayez JPG, PNG ou WebP.', 'Image trop volumineuse. Choisissez un fichier de moins de 40 Mo.', 'Espace insuffisant pour enregistrer. L’image précédente est conservée.'],
  da: ['Tilpasser billede…', 'Billedet kunne ikke åbnes. Prøv JPG, PNG eller WebP.', 'Billedet er for stort. Vælg en fil under 40 MB.', 'Der er ikke plads til at gemme. Dit tidligere billede er bevaret.'],
};

export function VisionImage({ value, onChange, language, title, uploadLabel, changeLabel }: {
  value?: string; onChange: (image: string) => void; language: Language;
  title: string; uploadLabel: string; changeLabel: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<'decode' | 'size' | 'storage' | null>(null);
  const [failedValue, setFailedValue] = useState<string | undefined>();
  const request = useRef(0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => () => { request.current++; }, []);
  const upload = async (file: File | undefined) => {
    if (!file) return;
    const id = ++request.current;
    setBusy(true); setError(null);
    try {
      const prepared = await prepareVisionImage(file);
      if (id !== request.current) return;
      try { onChangeRef.current(prepared); }
      catch { setError('storage'); }
    } catch (cause) {
      if (id === request.current) setError(cause instanceof VisionImageError ? cause.reason : 'decode');
    } finally { if (id === request.current) setBusy(false); }
  };
  const hasImage = value && failedValue !== value;
  const [working, decodeError, sizeError, storageError] = notices[language];
  return <div className="vision-image" aria-busy={busy}>
    <div className={`vision-image-stage${hasImage ? ' vision-image-stage--loaded' : ''}`}>
      {hasImage ? <>
        <img className="vision-image-backdrop" src={value} alt="" aria-hidden="true" />
        <img className="vision-image-content" src={value} alt={title} onError={() => { setFailedValue(value); setError('decode'); }} />
      </> : <h4 className="vision-image-placeholder">{title}</h4>}
    </div>
    <div className="vision-image-controls"><label className="vision-upload" aria-disabled={busy}>
      <span className="vision-upload-icon" aria-hidden="true">＋</span>
      <input type="file" accept="image/*" disabled={busy} aria-label={value ? changeLabel : uploadLabel} onChange={event => {
        const file = event.currentTarget.files?.[0];
        event.currentTarget.value = '';
        void upload(file);
      }} />{busy ? working : value ? changeLabel : uploadLabel}
    </label></div>
    <div className="vision-image-notice" role="status" aria-live="polite">{error ? error === 'size' ? sizeError : error === 'storage' ? storageError : decodeError : busy ? working : ''}</div>
  </div>;
}
