import { BADGE_MODES, hasVisionImage } from './badgeProgress';

export type HomeImageSource = 'stock' | 'vision' | 'electric';
// true remains the stored representation of Vision Final for existing accounts.
export type HomeVisionCards = Partial<Record<string, true | 'electric' | 'stock'>>;
export function cleanHomeVisionCards(value: unknown): HomeVisionCards {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const options = value as Record<string, unknown>;
  return Object.fromEntries(BADGE_MODES.filter(mode => options[mode] === true || options[mode] === 'electric' || options[mode] === 'stock').map(mode => [mode, options[mode] as true | 'electric' | 'stock']));
}

export const defaultModePhoto = (mode: string) => `/mode-photos/${mode}.jpg`;
export const EMOTIONAL_ELECTRIC_ART = '/mode-symbols/emocional-electrico.svg?v=3';
export function customModeSymbol(mode: string) {
  if (mode === 'fisico') return '/mode-symbols/fisico-caduceo.svg';
  if (mode === 'espiritual') return '/mode-symbols/espiritual-sol.svg';
  if (mode === 'familiar') return '/mode-symbols/familiar-casa.svg';
  if (mode === 'emocional') return '/mode-symbols/emocional-caritas.svg';
  if (mode === 'intelectual') return '/mode-symbols/intelectual-cerebro.svg';
  if (mode === 'profesional') return '/mode-symbols/profesional-portafolio.svg';
  if (mode === 'ludico') return '/mode-symbols/ludico-mando.svg';
  if (mode === 'social') return '/mode-symbols/social-amistad.svg';
  if (mode === 'financiero') return '/mode-symbols/financiero-monedas.svg';
  if (mode === 'visionario') return '/mode-symbols/visionario-telescopio.svg';
}

export function modeSymbol(mode: string) {
  if (mode === 'fisico') return '/mode-symbols/fisico-electrico.svg';
  if (mode === 'ludico') return '/mode-symbols/ludico-electrico.svg?v=2';
  if (mode === 'emocional') return EMOTIONAL_ELECTRIC_ART;
  if (mode === 'intelectual') return '/mode-symbols/intelectual-electrico.svg';
  if (mode === 'espiritual') return '/mode-symbols/espiritual-electrico.svg';
  if (mode === 'profesional') return '/mode-symbols/profesional-electrico.svg';
  if (mode === 'social') return '/mode-symbols/social-amistad-electrico.webp';
  if (mode === 'financiero') return '/mode-symbols/financiero-monedas-electrico.webp';
  if (mode === 'visionario') return '/mode-symbols/visionario-telescopio-electrico.webp';
  return `/mode-symbols/${mode}.webp`;
}
export function homeImageSource(mode: string, image: string | undefined, preferences: HomeVisionCards): HomeImageSource {
  if (preferences[mode] === 'stock') return 'stock';
  if (preferences[mode] === 'electric') return 'electric';
  if (preferences[mode] === true) return 'vision';
  return preferences[mode] === undefined ? 'electric' : 'stock';
}
export function homeModePhoto(mode: string, image: string | undefined, preferences: HomeVisionCards) {
  const source = homeImageSource(mode, image, preferences);
  if (source === 'electric') return modeSymbol(mode);
  if (source === 'vision') return hasVisionImage(image) ? image!.trim() : '';
  return defaultModePhoto(mode);
}

const electricLabels = { es: 'Símbolo eléctrico', en: 'Electric symbol', zh: '电光符号', hi: 'विद्युत प्रतीक', ar: 'رمز كهربائي', it: 'Simbolo elettrico', pt: 'Símbolo elétrico', ru: 'Электрический символ', de: 'Elektrisches Symbol', fr: 'Symbole électrique', da: 'Elektrisk symbol' } as const;
export const electricSymbolLabel = (language: keyof typeof electricLabels) => electricLabels[language];

const copy = {
  es: ['Imágenes de Inicio', 'Elige tu estilo preferido para el inicio; puedes elegir uno distinto para cada modo.', 'Galería de imágenes', 'Visión Final', 'Sin foto en Visión Final', 'No se pudo guardar en este dispositivo.'],
  en: ['Home Images', 'Choose your preferred home style; you can choose a different one for each mode.', 'Stock Images', 'Final Vision', 'No Final Vision photo yet', 'Could not save on this device.'],
  zh: ['首页图片', '选择你喜欢的首页风格；每种模式都可以单独选择。', '图库图片', '最终愿景', '尚无最终愿景照片', '无法在此设备上保存。'],
  hi: ['होम की तस्वीरें', 'होम के लिए अपनी पसंदीदा शैली चुनें; हर मोड के लिए अलग शैली चुन सकते हैं।', 'स्टॉक इमेज', 'अंतिम दृष्टि', 'अभी कोई अंतिम दृष्टि की तस्वीर नहीं', 'इस डिवाइस पर सहेजा नहीं जा सका।'],
  ar: ['صور الصفحة الرئيسية', 'اختر النمط الذي تفضله للصفحة الرئيسية، ويمكنك اختيار نمط مختلف لكل وضع.', 'صور المخزون', 'الرؤية النهائية', 'لا توجد صورة للرؤية النهائية بعد', 'تعذّر الحفظ على هذا الجهاز.'],
  it: ['Immagini della home', 'Scegli lo stile che preferisci per la home; puoi sceglierne uno diverso per ogni modalità.', 'Immagini stock', 'Visione finale', 'Nessuna foto della visione finale', 'Impossibile salvare su questo dispositivo.'],
  pt: ['Imagens do início', 'Escolha o estilo que prefere para o início; você pode escolher um diferente para cada modo.', 'Imagens de banco', 'Visão Final', 'Sem foto da Visão Final', 'Não foi possível salvar neste dispositivo.'],
  ru: ['Изображения главной', 'Выберите стиль главной страницы; для каждого режима можно выбрать свой вариант.', 'Стоковые изображения', 'Итоговое видение', 'Фото итогового видения пока нет', 'Не удалось сохранить на этом устройстве.'],
  de: ['Startseitenbilder', 'Wähle deinen bevorzugten Startseitenstil; für jeden Modus kannst du einen eigenen auswählen.', 'Stockbilder', 'Endvision', 'Noch kein Foto zur Endvision', 'Auf diesem Gerät konnte nicht gespeichert werden.'],
  fr: ['Images d’accueil', 'Choisis le style que tu préfères pour l’accueil ; tu peux en choisir un différent pour chaque mode.', 'Images de stock', 'Vision finale', 'Pas encore de photo de vision finale', 'Impossible d’enregistrer sur cet appareil.'],
  da: ['Forsidebilleder', 'Vælg din foretrukne stil til forsiden; du kan vælge en forskellig stil for hver tilstand.', 'Stockbilleder', 'Endelig vision', 'Intet foto til endelig vision endnu', 'Kunne ikke gemme på denne enhed.'],
} as const;
export const homeVisionCopy = (language: keyof typeof copy) => copy[language];
