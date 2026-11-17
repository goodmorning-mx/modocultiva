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
export const modeSymbol = (mode: string) => `/mode-symbols/${mode}.png`;
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
  es: ['Imágenes de los modos', 'Elige qué imagen aparece en cada tarjeta de inicio. Las fotos se cargan únicamente en Visión Final (nivel 9).', 'Predeterminada', 'Visión Final', 'Sin foto en Visión Final', 'No se pudo guardar en este dispositivo.'],
  en: ['Mode images', 'Choose the image for each home card. Photos can only be uploaded in Final Vision (level 9).', 'Default', 'Final Vision', 'No Final Vision photo yet', 'Could not save on this device.'],
  zh: ['模式图片', '为每张首页卡片选择图片。照片只能在最终愿景（9 级）中上传。', '默认图片', '最终愿景', '尚无最终愿景照片', '无法在此设备上保存。'],
  hi: ['मोड की तस्वीरें', 'हर होम कार्ड की तस्वीर चुनें। तस्वीरें केवल अंतिम दृष्टि (स्तर 9) में अपलोड की जा सकती हैं।', 'डिफ़ॉल्ट', 'अंतिम दृष्टि', 'अभी कोई अंतिम दृष्टि की तस्वीर नहीं', 'इस डिवाइस पर सहेजा नहीं जा सका।'],
  ar: ['صور الأنماط', 'اختر صورة كل بطاقة في الصفحة الرئيسية. يمكن رفع الصور فقط في الرؤية النهائية (المستوى 9).', 'الافتراضية', 'الرؤية النهائية', 'لا توجد صورة للرؤية النهائية بعد', 'تعذّر الحفظ على هذا الجهاز.'],
  it: ['Immagini delle modalità', 'Scegli l’immagine di ogni scheda iniziale. Puoi caricare foto solo in Visione finale (livello 9).', 'Predefinita', 'Visione finale', 'Nessuna foto della visione finale', 'Impossibile salvare su questo dispositivo.'],
  pt: ['Imagens dos modos', 'Escolha a imagem de cada cartão inicial. Envie fotos apenas em Visão Final (nível 9).', 'Padrão', 'Visão Final', 'Sem foto da Visão Final', 'Não foi possível salvar neste dispositivo.'],
  ru: ['Изображения режимов', 'Выберите изображение для каждой карточки на главной. Загрузить фото можно только в разделе «Итоговое видение» (уровень 9).', 'По умолчанию', 'Итоговое видение', 'Фото итогового видения пока нет', 'Не удалось сохранить на этом устройстве.'],
  de: ['Bilder der Modi', 'Wähle das Bild für jede Startkarte. Fotos lassen sich nur in der Endvision (Stufe 9) hochladen.', 'Standard', 'Endvision', 'Noch kein Foto zur Endvision', 'Auf diesem Gerät konnte nicht gespeichert werden.'],
  fr: ['Images des modes', 'Choisis l’image de chaque carte d’accueil. Les photos se téléversent uniquement dans Vision finale (niveau 9).', 'Par défaut', 'Vision finale', 'Pas encore de photo de vision finale', 'Impossible d’enregistrer sur cet appareil.'],
  da: ['Tilstandsbilleder', 'Vælg et billede til hvert kort på forsiden. Fotos kan kun uploades under Endelig vision (niveau 9).', 'Standard', 'Endelig vision', 'Intet foto til endelig vision endnu', 'Kunne ikke gemme på denne enhed.'],
} as const;
export const homeVisionCopy = (language: keyof typeof copy) => copy[language];
