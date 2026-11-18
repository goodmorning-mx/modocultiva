export type JourneyStep = 0 | 1 | 2 | 3;

// Until the Home feed is available, submitting evidence is network-only.
export const JOURNEY_SUBMISSION_AUDIENCE_ENABLED = false;

export const journeyStepLabels = {
  es: ['Vista del modo', 'Actividad', 'Evidencia', 'Validación', 'Pedir Idea Global'],
  en: ['Mode overview', 'Activity', 'Evidence', 'Validation', 'Ask for a Global Idea'],
  zh: ['模式概览', '活动', '证据', '审核', '请求全球灵感'],
  hi: ['मोड का परिचय', 'गतिविधि', 'प्रमाण', 'सत्यापन', 'वैश्विक सुझाव माँगें'],
  ar: ['نظرة عامة', 'النشاط', 'الدليل', 'التحقق', 'اطلب فكرة عالمية'],
  it: ['Panoramica', 'Attività', 'Prova', 'Convalida', 'Chiedi un’idea globale'],
  pt: ['Visão geral', 'Atividade', 'Evidência', 'Validação', 'Pedir ideia global'],
  ru: ['Обзор режима', 'Задание', 'Доказательство', 'Проверка', 'Запросить глобальную идею'],
  de: ['Modusübersicht', 'Aktivität', 'Nachweis', 'Bestätigung', 'Globale Idee anfragen'],
  fr: ['Aperçu du mode', 'Activité', 'Preuve', 'Validation', 'Demander une idée mondiale'],
  da: ['Modusoversigt', 'Aktivitet', 'Dokumentation', 'Godkendelse', 'Bed om en global idé'],
} as const;

// Keep the three tabs readable within a single row on the narrowest cards.
export function journeyCompactStepLabel(language: keyof typeof journeyStepLabels, step: number, fallback: string) {
  if (language === 'ru' && step === 2) return 'Фото/видео';
  if (language === 'da' && step === 2) return 'Bevis';
  if (language === 'da' && step === 3) return 'Vurdering';
  if (language === 'de' && step === 3) return 'Prüfung';
  return fallback;
}

export const journeyLevelLabels = {
  es: ['Subir al siguiente nivel', 'Se desbloquea al validar tu actividad', 'Ver nivel anterior'],
  en: ['Go up to the next level', 'Unlocks once your activity is validated', 'View previous level'],
  zh: ['升至下一等级', '活动通过审核后解锁', '查看上一个等级'],
  hi: ['अगले स्तर पर जाएँ', 'गतिविधि सत्यापित होने पर खुलेगा', 'पिछला स्तर देखें'],
  ar: ['اصعد إلى المستوى التالي', 'يُفتح بعد التحقق من نشاطك', 'عرض المستوى السابق'],
  it: ['Sali al livello successivo', 'Si sblocca dopo la convalida dell’attività', 'Vedi il livello precedente'],
  pt: ['Subir para o próximo nível', 'Desbloqueia após a validação da atividade', 'Ver nível anterior'],
  ru: ['Подняться на следующий уровень', 'Откроется после проверки задания', 'Посмотреть предыдущий уровень'],
  de: ['Zur nächsten Stufe aufsteigen', 'Wird nach Bestätigung deiner Aktivität freigeschaltet', 'Vorherige Stufe ansehen'],
  fr: ['Monter au niveau suivant', 'Se débloque après validation de ton activité', 'Voir le niveau précédent'],
  da: ['Gå op til næste niveau', 'Låses op, når din aktivitet er godkendt', 'Se forrige niveau'],
} satisfies Record<keyof typeof journeyStepLabels, [string, string, string]>;

export function canOpenJourneyLevel(level: number, current: number) {
  return Number.isInteger(level) && level >= 0 && level <= 9 && level <= current;
}

export const journeyOverviewLabels = {
  es: ['Estás en nivel:', 'Estás viendo el nivel:', 'Definición del nivel actual:', 'Definición del nivel consultado:'],
  en: ['You’re at level:', 'You’re viewing level:', 'Current level definition:', 'Selected level definition:'],
  zh: ['当前等级：', '正在查看等级：', '当前等级说明：', '所选等级说明：'],
  hi: ['आपका वर्तमान स्तर:', 'आप यह स्तर देख रहे हैं:', 'वर्तमान स्तर की परिभाषा:', 'चुने गए स्तर की परिभाषा:'],
  ar: ['مستواك الحالي:', 'أنت تعرض المستوى:', 'تعريف المستوى الحالي:', 'تعريف المستوى المعروض:'],
  it: ['Sei al livello:', 'Stai visualizzando il livello:', 'Definizione del livello attuale:', 'Definizione del livello selezionato:'],
  pt: ['Você está no nível:', 'Você está vendo o nível:', 'Definição do nível atual:', 'Definição do nível consultado:'],
  ru: ['Ваш текущий уровень:', 'Вы просматриваете уровень:', 'Описание текущего уровня:', 'Описание выбранного уровня:'],
  de: ['Du bist auf Stufe:', 'Du siehst Stufe:', 'Beschreibung der aktuellen Stufe:', 'Beschreibung der ausgewählten Stufe:'],
  fr: ['Ton niveau actuel :', 'Tu consultes le niveau :', 'Définition du niveau actuel :', 'Définition du niveau consulté :'],
  da: ['Du er på niveau:', 'Du ser niveau:', 'Definition af dit nuværende niveau:', 'Definition af det valgte niveau:'],
} satisfies Record<keyof typeof journeyStepLabels, [string, string, string, string]>;

export function journeyGesture(dx: number, dy: number, rtl = false) {
  if (Math.abs(dx) >= 52 && Math.abs(dx) > Math.abs(dy) * 1.4) return (dx < 0) !== rtl ? 'next' : 'previous';
  if (Math.abs(dy) >= 52 && Math.abs(dy) > Math.abs(dx) * 1.4) return dy < 0 ? 'up' : 'down';
  return null;
}
