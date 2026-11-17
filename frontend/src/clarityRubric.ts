import rubric from './clarity-levels.json';

export type ClarityLanguage = keyof typeof rubric.languages;
export const CLARITY_VERSION = rubric.version;
export function clarityTransition(level: number, language: string) {
  if (!Number.isInteger(level) || level < 0 || level > 8) return null;
  const entries = rubric.languages[language as ClarityLanguage] ?? rubric.languages.es;
  return { version: CLARITY_VERSION, source: entries[level], target: entries[level + 1], effort: level <= 2 ? 'time' : level <= 5 ? 'time_energy' : 'time_energy_investment' };
}

export const clarityReminderTitles: Record<ClarityLanguage, string> = {
  es: 'Recordatorios para pasar al siguiente nivel',
  en: 'Reminders for reaching the next level',
  zh: '迈向下一等级的提醒',
  hi: 'अगले स्तर तक पहुँचने के लिए याद रखें',
  ar: 'تذكيرات للانتقال إلى المستوى التالي',
  it: 'Promemoria per passare al livello successivo',
  pt: 'Lembretes para passar ao próximo nível',
  ru: 'Напоминания для перехода на следующий уровень',
  de: 'Hinweise für den Aufstieg zur nächsten Stufe',
  fr: 'Rappels pour passer au niveau suivant',
  da: 'Husk dette for at komme til næste niveau',
};

export const clarityMessages = {
  es: {
    heading: 'Tu siguiente nivel de claridad', level: 'Nivel',
    rule: 'Tu actividad debe estar alineada con el siguiente nivel de claridad: al realizarla, deberías poder reconocerte en lo que describe.',
    review: 'La validación revisará esa congruencia, además de la evidencia y la exigencia de la actividad.',
  },
  en: {
    heading: 'Your next level of clarity', level: 'Level',
    rule: 'Your activity must align with the next level of clarity: doing it should help you recognize yourself in that description.',
    review: 'Validation will review that alignment, as well as the evidence and effort required.',
  },
  zh: {
    heading: '你的下一个清晰度等级', level: '等级',
    rule: '活动必须与下一等级的清晰度描述一致：完成它应帮助你感受到并认可描述中的自己。',
    review: '验证将审查这种一致性，以及证据和活动所需的投入。',
  },
  hi: {
    heading: 'स्पष्टता का आपका अगला स्तर', level: 'स्तर',
    rule: 'आपकी गतिविधि स्पष्टता के अगले स्तर के अनुरूप होनी चाहिए: उसे करने पर आप उस विवरण में खुद को पहचान सकें।',
    review: 'सत्यापन में इस अनुरूपता के साथ प्रमाण और आवश्यक प्रयास की भी समीक्षा होगी।',
  },
  ar: {
    heading: 'مستواك التالي من الوضوح', level: 'المستوى',
    rule: 'يجب أن يتوافق نشاطك مع وصف المستوى التالي من الوضوح: يفترض أن يساعدك إنجازه على أن تجد نفسك في ذلك الوصف.',
    review: 'سيراجع التحقق هذا التوافق، إلى جانب الأدلة والجهد المطلوب للنشاط.',
  },
  it: {
    heading: 'Il tuo prossimo livello di chiarezza', level: 'Livello',
    rule: 'La tua attività deve essere coerente con il prossimo livello di chiarezza: svolgerla dovrebbe aiutarti a riconoscerti in quella descrizione.',
    review: 'La validazione esaminerà questa coerenza, insieme alle prove e all’impegno richiesto.',
  },
  pt: {
    heading: 'Seu próximo nível de clareza', level: 'Nível',
    rule: 'Sua atividade precisa estar alinhada ao próximo nível de clareza: realizá-la deve ajudar você a se reconhecer nessa descrição.',
    review: 'A validação analisará esse alinhamento, além das evidências e da exigência da atividade.',
  },
  ru: {
    heading: 'Ваш следующий уровень ясности', level: 'Уровень',
    rule: 'Активность должна соответствовать следующему уровню ясности: её выполнение должно помочь вам узнать себя в этом описании.',
    review: 'При проверке будут оценены это соответствие, доказательства и требуемые усилия.',
  },
  de: {
    heading: 'Deine nächste Klarheitsstufe', level: 'Stufe',
    rule: 'Deine Aktivität muss zur nächsten Klarheitsstufe passen: Wenn du sie ausführst, solltest du dich in deren Beschreibung wiedererkennen können.',
    review: 'Die Validierung prüft diese Übereinstimmung sowie die Nachweise und den erforderlichen Einsatz.',
  },
  fr: {
    heading: 'Votre prochain niveau de clarté', level: 'Niveau',
    rule: 'Votre activité doit correspondre au prochain niveau de clarté : la réaliser devrait vous aider à vous reconnaître dans sa description.',
    review: 'La validation examinera cette cohérence, ainsi que les preuves et l’effort demandé.',
  },
  da: {
    heading: 'Dit næste niveau af klarhed', level: 'Niveau',
    rule: 'Din aktivitet skal passe til det næste niveau af klarhed: Når du udfører den, skal den hjælpe dig med at genkende dig selv i beskrivelsen.',
    review: 'Valideringen vil vurdere denne sammenhæng sammen med dokumentationen og den nødvendige indsats.',
  },
};
