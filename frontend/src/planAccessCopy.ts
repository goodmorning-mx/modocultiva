import type { AppLanguage } from './languagePreference';

type PlanAccessChrome = readonly [
  contextualEyebrow: string, contextualTitle: string, contextualDescription: (feature: string, plan: string) => string,
  continueGuest: string, plansEyebrow: string, plansTitle: string, plansDescription: string,
  seeFullBenefits: string, planDetails: string, backToPlans: string,
  monthTaxIncluded: string,
];

const planAccessChrome = {
  es: ['Acceso contextual', 'Desbloquea esta función.', (feature, plan) => `${feature} forma parte del plan ${plan}. Crea tu cuenta o inicia sesión para continuar.`, 'Continuar como invitado', 'Tu siguiente nivel comienza aquí', 'Haz de tu crecimiento una forma de vida.', 'Elige el ritmo, la profundidad y la comunidad que quieres llevar contigo en Modo Cultiva.', 'Ver todos los beneficios', 'Detalles del plan', 'Volver a Modos Premium', 'al mes · IVA incluido'],
  en: ['Feature access', 'Unlock this feature.', (feature, plan) => `${feature} is included in the ${plan} plan. Create an account or sign in to continue.`, 'Continue as a guest', 'Your next level starts here', 'Make growth part of your life.', 'Choose the pace, depth, and community you want for your Modo Cultiva experience.', 'See all benefits', 'Plan details', 'Back to Premium Modes', 'per month · VAT included'],
  zh: ['功能权限', '解锁此功能。', (feature, plan) => `${feature}包含在 ${plan} 方案中。请创建账户或登录后继续。`, '以访客身份继续', '下一等级从这里开始', '让成长成为生活的一部分。', '在 Modo Cultiva 选择适合你的节奏、探索深度和社群。', '查看全部权益', '方案详情', '返回高级模式', '每月 · 含增值税'],
  hi: ['सुविधा का ऐक्सेस', 'इस सुविधा को खोलें।', (feature, plan) => `${feature} की सुविधा ${plan} प्लान में शामिल है। आगे बढ़ने के लिए खाता बनाएँ या साइन इन करें।`, 'मेहमान के तौर पर जारी रखें', 'आपका अगला स्तर यहीं से शुरू होता है', 'आगे बढ़ने को अपने जीवन का हिस्सा बनाएँ।', 'Modo Cultiva में अपनी रफ़्तार, अभ्यास की गहराई और साथ देने वाला समुदाय चुनें।', 'सभी लाभ देखें', 'प्लान का विवरण', 'प्रीमियम मोड पर लौटें', 'प्रति माह · वैट शामिल'],
  ar: ['الوصول إلى الميزة', 'افتح هذه الميزة.', (feature, plan) => `ميزة «${feature}» ضمن خطة ${plan}. أنشئ حساباً أو سجّل الدخول للمتابعة.`, 'المتابعة كضيف', 'مستواك التالي يبدأ هنا', 'اجعل النمو جزءاً من حياتك.', 'اختر الوتيرة وعمق الممارسة والمجتمع الذي تريد أن يرافقك في Modo Cultiva.', 'عرض جميع المزايا', 'تفاصيل الخطة', 'العودة إلى الأوضاع المميزة', 'شهرياً · شامل ضريبة القيمة المضافة'],
  it: ['Accesso alla funzione', 'Sblocca questa funzione.', (feature, plan) => `${feature} fa parte del piano ${plan}. Crea un account o accedi per continuare.`, 'Continua come ospite', 'Il tuo prossimo livello inizia qui', 'Fai della crescita una parte della tua vita.', 'Scegli il ritmo, la profondità e la comunità che vuoi per il tuo percorso in Modo Cultiva.', 'Vedi tutti i vantaggi', 'Dettagli del piano', 'Torna alle modalità Premium', 'al mese · IVA inclusa'],
  pt: ['Acesso ao recurso', 'Desbloqueie este recurso.', (feature, plan) => `${feature} faz parte do plano ${plan}. Crie uma conta ou entre para continuar.`, 'Continuar como visitante', 'Seu próximo nível começa aqui', 'Faça do crescimento parte da sua vida.', 'Escolha o ritmo, a profundidade e a comunidade que quer no seu percurso no Modo Cultiva.', 'Ver todos os benefícios', 'Detalhes do plano', 'Voltar aos Modos Premium', 'por mês · IVA incluído'],
  ru: ['Доступ к функции', 'Откройте доступ к этой функции.', (feature, plan) => `Функция «${feature}» входит в тариф ${plan}. Создайте аккаунт или войдите, чтобы продолжить.`, 'Продолжить как гость', 'Ваш следующий уровень начинается здесь', 'Сделайте развитие частью своей жизни.', 'Выберите свой темп, глубину практики и сообщество в Modo Cultiva.', 'Посмотреть все преимущества', 'Подробнее о тарифе', 'Вернуться к премиум-режимам', 'в месяц · с НДС'],
  de: ['Zugang zur Funktion', 'Schalte diese Funktion frei.', (feature, plan) => `„${feature}“ ist im Tarif ${plan} enthalten. Erstelle ein Konto oder melde dich an, um fortzufahren.`, 'Als Gast fortfahren', 'Deine nächste Stufe beginnt hier', 'Mach persönliche Entwicklung zum Teil deines Lebens.', 'Wähle das Tempo, die Tiefe und die Gemeinschaft für deinen Weg in Modo Cultiva.', 'Alle Vorteile ansehen', 'Tarifdetails', 'Zurück zu den Premium-Modi', 'pro Monat · inkl. MwSt.'],
  fr: ['Accès à la fonctionnalité', 'Débloquez cette fonctionnalité.', (feature, plan) => `« ${feature} » est compris dans l’offre ${plan}. Créez un compte ou connectez-vous pour continuer.`, 'Continuer sans compte', 'Votre prochain niveau commence ici', 'Faites du développement une manière de vivre.', 'Choisissez le rythme, la profondeur et la communauté qui vous conviennent dans Modo Cultiva.', 'Voir tous les avantages', 'Détails de l’offre', 'Retour aux Modes Premium', 'par mois · TVA comprise'],
  da: ['Adgang til funktionen', 'Lås op for denne funktion.', (feature, plan) => `“${feature}” er med i abonnementet ${plan}. Opret en konto, eller log ind for at fortsætte.`, 'Fortsæt som gæst', 'Dit næste niveau starter her', 'Gør udvikling til en del af dit liv.', 'Vælg tempo, fordybelse og fællesskab på din vej i Modo Cultiva.', 'Se alle fordele', 'Abonnementsoplysninger', 'Tilbage til Premium-tilstande', 'pr. måned · inkl. moms'],
} satisfies Record<AppLanguage, PlanAccessChrome>;

export function planAccessCopy(language: AppLanguage) {
  const [contextualEyebrow, contextualTitle, contextualDescription, continueGuest, plansEyebrow, plansTitle,
    plansDescription, seeFullBenefits, planDetails, backToPlans, monthTaxIncluded] = planAccessChrome[language];
  return { contextualEyebrow, contextualTitle, contextualDescription, continueGuest, plansEyebrow, plansTitle,
    plansDescription, seeFullBenefits, planDetails, backToPlans, monthTaxIncluded };
}

const themeLabels = {
  es: 'Tema', en: 'Theme', zh: '主题', hi: 'थीम', ar: 'المظهر', it: 'Tema', pt: 'Tema',
  ru: 'Тема', de: 'Design', fr: 'Thème', da: 'Tema',
} satisfies Record<AppLanguage, string>;

export function planThemeLabel(language: AppLanguage, theme: string) {
  return `${themeLabels[language]}: ${theme}`;
}
