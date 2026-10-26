type Message = 'context' | 'failed' | 'first';
const messages: Record<string, Record<Message, string>> = {
  es: { context: 'Escribe primero tu contexto o pregunta para que el Modo IA prepare una propuesta.', failed: 'No fue posible preparar tu actividad. Tu contexto sigue aquí; inténtalo de nuevo.', first: 'Consulta primero al Modo IA para generar una propuesta antes de usarla.' },
  en: { context: 'Share your context or question so Mode AI can prepare a suggestion.', failed: 'Your activity could not be prepared. Your context is still here; please try again.', first: 'Ask Mode AI for a suggestion before using it.' },
  zh: { context: '请先分享你的情况或问题，让模式 AI 提供建议。', failed: '无法生成活动。你的输入仍在，请重试。', first: '请先咨询模式 AI，再使用建议。' },
  hi: { context: 'सुझाव पाने के लिए पहले अपना संदर्भ या प्रश्न लिखें।', failed: 'गतिविधि तैयार नहीं हुई। आपका संदर्भ सुरक्षित है; फिर प्रयास करें।', first: 'सुझाव का उपयोग करने से पहले मोड AI से पूछें।' },
  ar: { context: 'شارك سياقك أو سؤالك أولاً ليقدم وضع الذكاء الاصطناعي اقتراحاً.', failed: 'تعذر إعداد نشاطك. ما زال سياقك هنا؛ حاول مجدداً.', first: 'اطلب اقتراحاً من وضع الذكاء الاصطناعي قبل استخدامه.' },
  it: { context: 'Condividi prima il tuo contesto o una domanda per ricevere una proposta.', failed: 'Impossibile preparare l’attività. Il tuo contesto è ancora qui; riprova.', first: 'Chiedi una proposta al Modo IA prima di utilizzarla.' },
  pt: { context: 'Compartilhe seu contexto ou pergunta para o Modo IA preparar uma sugestão.', failed: 'Não foi possível preparar sua atividade. Seu contexto continua aqui; tente novamente.', first: 'Peça uma sugestão ao Modo IA antes de usá-la.' },
  ru: { context: 'Опишите ситуацию или вопрос, чтобы Mode AI подготовил предложение.', failed: 'Не удалось подготовить занятие. Ваш текст сохранён здесь; попробуйте снова.', first: 'Сначала запросите предложение у Mode AI.' },
  de: { context: 'Beschreibe zuerst deinen Kontext oder deine Frage für einen Vorschlag.', failed: 'Deine Aktivität konnte nicht erstellt werden. Dein Text ist noch da; versuche es erneut.', first: 'Frage Mode AI zuerst nach einem Vorschlag.' },
  fr: { context: 'Partagez votre contexte ou votre question pour obtenir une proposition.', failed: 'Impossible de préparer votre activité. Votre contexte est toujours là ; réessayez.', first: 'Demandez une proposition au Mode IA avant de l’utiliser.' },
  da: { context: 'Del først din kontekst eller dit spørgsmål, så Mode AI kan foreslå en aktivitet.', failed: 'Din aktivitet kunne ikke forberedes. Din tekst er stadig her; prøv igen.', first: 'Bed først Mode AI om et forslag, før du bruger det.' },
};
export const modeAiMessage = (language: string, key: Message): string => (messages[language] ?? messages.en)[key];

export function readModeAiProposal(value: unknown): string | null {
  if (!value || typeof value !== 'object' || !('proposal' in value) || typeof value.proposal !== 'string') return null;
  return value.proposal.trim() || null;
}
