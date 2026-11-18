import { BADGE_MODES, hasVisionImage } from './badgeProgress';

export type HomeImageSource = 'default' | 'vision' | 'electric';
// true remains the stored representation of Vision Final for existing accounts.
export type HomeVisionCards = Partial<Record<string, true | 'electric'>>;
export function cleanHomeVisionCards(value: unknown): HomeVisionCards {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const options = value as Record<string, unknown>;
  return Object.fromEntries(BADGE_MODES.filter(mode => options[mode] === true || options[mode] === 'electric').map(mode => [mode, options[mode] as true | 'electric']));
}

export const defaultModePhoto = (mode: string) => `/mode-photos/${mode}.jpg`;
export function customModeSymbol(mode: string) {
  if (mode === 'emocional') return '/mode-symbols/emocional-orbitas.svg';
  if (mode === 'ludico') return '/mode-symbols/ludico-mando.svg';
}

export function modeSymbol(mode: string) {
  if (mode === 'ludico') return '/mode-symbols/ludico-electrico.svg?v=2';
  if (mode === 'emocional') return '/mode-symbols/emocional-electrico.svg';
  const artwork = mode === 'fisico' ? 'visionario' : mode === 'visionario' ? 'fisico' : mode;
  return customModeSymbol(mode) ?? `/mode-symbols/${artwork}.webp`;
}
export function homeImageSource(mode: string, image: string | undefined, preferences: HomeVisionCards): HomeImageSource {
  if (preferences[mode] === 'electric') return 'electric';
  return preferences[mode] === true && hasVisionImage(image) ? 'vision' : 'default';
}
export function homeModePhoto(mode: string, image: string | undefined, preferences: HomeVisionCards) {
  const source = homeImageSource(mode, image, preferences);
  return source === 'electric' ? modeSymbol(mode) : source === 'vision' ? image!.trim() : defaultModePhoto(mode);
}

const electricLabels = { es: 'Símbolo eléctrico', en: 'Electric symbol', zh: '电光符号', hi: 'विद्युत प्रतीक', ar: 'رمز كهربائي', it: 'Simbolo elettrico', pt: 'Símbolo elétrico', ru: 'Электрический символ', de: 'Elektrisches Symbol', fr: 'Symbole électrique', da: 'Elektrisk symbol' } as const;
export const electricSymbolLabel = (language: keyof typeof electricLabels) => electricLabels[language];

const copy = {
  es: ['Imágenes de Inicio', 'Elige qué imagen aparece en cada tarjeta de inicio. Puedes cargar o cambiar tu foto desde Visión Final, aquí mismo.', 'Predeterminada', 'Visión Final', 'Sin foto en Visión Final', 'No se pudo guardar en este dispositivo.'],
  en: ['Home Images', 'Choose an image for each home card. You can upload or change your photo under Final Vision right here.', 'Default', 'Final Vision', 'No Final Vision photo yet', 'Could not save on this device.'],
  zh: ['首页图片', '为每张首页卡片选择图片。可直接在此处通过最终愿景上传或更换照片。', '默认图片', '最终愿景', '尚无最终愿景照片', '无法在此设备上保存。'],
  hi: ['होम की तस्वीरें', 'हर होम कार्ड की तस्वीर चुनें। अंतिम दृष्टि में यहीं तस्वीर अपलोड या बदल सकते हैं।', 'डिफ़ॉल्ट', 'अंतिम दृष्टि', 'अभी कोई अंतिम दृष्टि की तस्वीर नहीं', 'इस डिवाइस पर सहेजा नहीं जा सका।'],
  ar: ['صور الصفحة الرئيسية', 'اختر صورة كل بطاقة في الصفحة الرئيسية. يمكنك رفع صورتك أو تغييرها هنا من خيار الرؤية النهائية.', 'الافتراضية', 'الرؤية النهائية', 'لا توجد صورة للرؤية النهائية بعد', 'تعذّر الحفظ على هذا الجهاز.'],
  it: ['Immagini della home', 'Scegli un’immagine per ogni scheda iniziale. Puoi caricare o cambiare la foto qui, in Visione finale.', 'Predefinita', 'Visione finale', 'Nessuna foto della visione finale', 'Impossibile salvare su questo dispositivo.'],
  pt: ['Imagens do início', 'Escolha a imagem de cada cartão inicial. Você pode enviar ou trocar a foto aqui mesmo em Visão Final.', 'Padrão', 'Visão Final', 'Sem foto da Visão Final', 'Não foi possível salvar neste dispositivo.'],
  ru: ['Изображения главной', 'Выберите изображение для каждой карточки. Загрузить или поменять фото можно здесь в разделе «Итоговое видение».', 'По умолчанию', 'Итоговое видение', 'Фото итогового видения пока нет', 'Не удалось сохранить на этом устройстве.'],
  de: ['Startseitenbilder', 'Wähle das Bild für jede Startkarte. Unter Endvision kannst du dein Foto direkt hier hochladen oder ändern.', 'Standard', 'Endvision', 'Noch kein Foto zur Endvision', 'Auf diesem Gerät konnte nicht gespeichert werden.'],
  fr: ['Images d’accueil', 'Choisis l’image de chaque carte d’accueil. Tu peux ajouter ou changer ta photo ici, dans Vision finale.', 'Par défaut', 'Vision finale', 'Pas encore de photo de vision finale', 'Impossible d’enregistrer sur cet appareil.'],
  da: ['Forsidebilleder', 'Vælg et billede til hvert kort på forsiden. Du kan uploade eller skifte dit foto her under Endelig vision.', 'Standard', 'Endelig vision', 'Intet foto til endelig vision endnu', 'Kunne ikke gemme på denne enhed.'],
} as const;
export const homeVisionCopy = (language: keyof typeof copy) => copy[language];
