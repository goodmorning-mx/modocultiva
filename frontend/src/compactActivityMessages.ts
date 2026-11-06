type CompactCopy = { stages: readonly [string, string, string]; help: string; details: string; visibility: string; attach: string; reference: string; send: string };
const messages: Record<string, CompactCopy> = {
  es: { stages: ['Actividad', 'Evidencia', 'Validación'], help: 'Cómo funciona', details: 'Ver detalles', visibility: 'Visibilidad', attach: 'Añadir foto o video', reference: 'Añadir referencia (opcional)', send: 'Enviar a validar' },
  en: { stages: ['Activity', 'Evidence', 'Approval'], help: 'How it works', details: 'View details', visibility: 'Visibility', attach: 'Add photo or video', reference: 'Add reference (optional)', send: 'Submit for approval' },
  zh: { stages: ['活动', '证据', '审核'], help: '使用说明', details: '查看详情', visibility: '可见范围', attach: '添加照片或视频', reference: '添加参考（可选）', send: '提交审核' },
  hi: { stages: ['गतिविधि', 'प्रमाण', 'स्वीकृति'], help: 'यह कैसे काम करता है', details: 'विवरण देखें', visibility: 'दृश्यता', attach: 'फ़ोटो या वीडियो जोड़ें', reference: 'संदर्भ जोड़ें (वैकल्पिक)', send: 'स्वीकृति के लिए भेजें' },
  ar: { stages: ['النشاط', 'الدليل', 'الموافقة'], help: 'كيف يعمل', details: 'عرض التفاصيل', visibility: 'الظهور', attach: 'إضافة صورة أو فيديو', reference: 'إضافة مرجع (اختياري)', send: 'إرسال للموافقة' },
  it: { stages: ['Attività', 'Prova', 'Conferma'], help: 'Come funziona', details: 'Vedi dettagli', visibility: 'Visibilità', attach: 'Aggiungi foto o video', reference: 'Aggiungi riferimento (facoltativo)', send: 'Invia per conferma' },
  pt: { stages: ['Atividade', 'Evidência', 'Validação'], help: 'Como funciona', details: 'Ver detalhes', visibility: 'Visibilidade', attach: 'Adicionar foto ou vídeo', reference: 'Adicionar referência (opcional)', send: 'Enviar para validação' },
  ru: { stages: ['Активность', 'Доказательство', 'Проверка'], help: 'Как это работает', details: 'Подробнее', visibility: 'Видимость', attach: 'Добавить фото или видео', reference: 'Добавить ссылку (необязательно)', send: 'Отправить на проверку' },
  de: { stages: ['Aktivität', 'Nachweis', 'Prüfung'], help: 'So funktioniert es', details: 'Details ansehen', visibility: 'Sichtbarkeit', attach: 'Foto oder Video hinzufügen', reference: 'Referenz hinzufügen (optional)', send: 'Zur Prüfung senden' },
  fr: { stages: ['Activité', 'Preuve', 'Validation'], help: 'Comment ça marche', details: 'Voir les détails', visibility: 'Visibilité', attach: 'Ajouter photo ou vidéo', reference: 'Ajouter une référence (facultatif)', send: 'Envoyer pour validation' },
  da: { stages: ['Aktivitet', 'Dokumentation', 'Godkendelse'], help: 'Sådan fungerer det', details: 'Se detaljer', visibility: 'Synlighed', attach: 'Tilføj foto eller video', reference: 'Tilføj reference (valgfrit)', send: 'Send til godkendelse' },
};
export const compactActivityCopy = (language: string) => messages[language] ?? messages.en;
