export type JourneyStep = 0 | 1 | 2 | 3;

export const journeyStepLabels = {
  es: ['Vista del modo', 'Actividad', 'Evidencia', 'Validación', 'Pedir Idea Global', 'Nivel bloqueado'],
  en: ['Mode overview', 'Activity', 'Evidence', 'Validation', 'Ask for a Global Idea', 'Locked level'],
  zh: ['模式概览', '活动', '证据', '审核', '请求全球灵感', '等级未解锁'],
  hi: ['मोड का परिचय', 'गतिविधि', 'प्रमाण', 'सत्यापन', 'वैश्विक सुझाव माँगें', 'लॉक किया गया स्तर'],
  ar: ['نظرة عامة', 'النشاط', 'الدليل', 'التحقق', 'اطلب فكرة عالمية', 'مستوى مقفل'],
  it: ['Panoramica', 'Attività', 'Prova', 'Convalida', 'Chiedi un’idea globale', 'Livello bloccato'],
  pt: ['Visão geral', 'Atividade', 'Evidência', 'Validação', 'Pedir ideia global', 'Nível bloqueado'],
  ru: ['Обзор режима', 'Задание', 'Доказательство', 'Проверка', 'Запросить глобальную идею', 'Уровень закрыт'],
  de: ['Modusübersicht', 'Aktivität', 'Nachweis', 'Bestätigung', 'Globale Idee anfragen', 'Gesperrte Stufe'],
  fr: ['Aperçu du mode', 'Activité', 'Preuve', 'Validation', 'Demander une idée mondiale', 'Niveau verrouillé'],
  da: ['Modusoversigt', 'Aktivitet', 'Dokumentation', 'Godkendelse', 'Bed om en global idé', 'Låst niveau'],
} as const;

export function canOpenJourneyLevel(level: number, current: number) {
  return Number.isInteger(level) && level >= 0 && level <= 9 && level <= current;
}

export function journeyGesture(dx: number, dy: number, rtl = false) {
  if (Math.abs(dx) >= 52 && Math.abs(dx) > Math.abs(dy) * 1.4) return (dx < 0) !== rtl ? 'next' : 'previous';
  if (Math.abs(dy) >= 52 && Math.abs(dy) > Math.abs(dx) * 1.4) return dy < 0 ? 'up' : 'down';
  return null;
}
