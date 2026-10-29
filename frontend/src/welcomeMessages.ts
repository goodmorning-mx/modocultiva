export const WELCOME_LANGUAGES = ['es', 'en', 'zh', 'hi', 'ar', 'it', 'pt', 'ru', 'de', 'fr', 'da'] as const;
export type WelcomeLanguage = typeof WELCOME_LANGUAGES[number];
export type WelcomeSequence = readonly [string, string, string, string, string, string, string];

type WelcomeCopy = {
  messages: WelcomeSequence;
  title: string;
  automatic: string;
  paused: string;
  pause: string;
  resume: string;
};

/** Source copy is deliberately separate from presentation, account state and timing. */
export const welcomeMessages: Readonly<Record<WelcomeLanguage, WelcomeCopy>> = {
  es: {
    messages: [
      '¿En qué modo estás operando ahora?',
      '¿Tu vida se reduce al trabajo, la familia y los amigos?',
      'Para tener una vida plena, recomendamos tener un plan de inicio a fin para las 12 áreas de tu vida.',
      'Define tu estructura y conviértela en estrategias concretas.',
      'Recuperando así la claridad y una presencia consciente.',
      'Cultiva cada uno de tus modos de vida.',
      'Entra en Modo Cultiva.',
    ],
    title: 'Bienvenido a Modo Cultiva',
    automatic: 'La introducción avanza automáticamente. Puedes pausarla cuando lo necesites.',
    paused: 'Tómate tu tiempo. La introducción está en pausa.',
    pause: 'Pausar', resume: 'Reanudar',
  },
  en: {
    messages: [
      'What mode are you operating in right now?',
      'Does your life revolve only around work, family and friends?',
      'For a fulfilling life, we recommend a plan from start to finish for all 12 areas of your life.',
      'Define your structure and turn it into concrete strategies.',
      'In doing so, regain clarity and a mindful presence.',
      'Cultivate each of your ways of living.',
      'Enter Modo Cultiva.',
    ],
    title: 'Welcome to Modo Cultiva',
    automatic: 'The introduction advances automatically. You can pause whenever you need.',
    paused: 'Take your time. The introduction is paused.',
    pause: 'Pause', resume: 'Resume',
  },
  zh: {
    messages: [
      '此刻，你正以哪种模式生活？',
      '你的生活是否只有工作、家人和朋友？',
      '为了拥有充实的人生，我们建议为生活的全部12个领域制定从开始到结束的完整计划。',
      '明确你的生活架构，并将其转化为具体策略。',
      '从而重拾清晰的方向，以觉知活在当下。',
      '用心培育你的每一种生活模式。',
      '进入 Modo Cultiva。',
    ],
    title: '欢迎来到 Modo Cultiva',
    automatic: '介绍会自动播放，你可以随时暂停。',
    paused: '慢慢来，介绍已暂停。',
    pause: '暂停', resume: '继续播放',
  },
  hi: {
    messages: [
      'अभी आप किस मोड में जी रहे हैं?',
      'क्या आपका जीवन सिर्फ़ काम, परिवार और दोस्तों तक सीमित है?',
      'एक परिपूर्ण जीवन के लिए, हम आपके जीवन के सभी 12 क्षेत्रों के लिए शुरुआत से अंत तक की योजना बनाने की सलाह देते हैं।',
      'अपनी जीवन-संरचना तय करें और उसे ठोस रणनीतियों में बदलें।',
      'इस तरह स्पष्टता और सजग उपस्थिति फिर से पाएँ।',
      'अपने जीवन के हर मोड को विकसित करें।',
      'Modo Cultiva में प्रवेश करें।',
    ],
    title: 'Modo Cultiva में आपका स्वागत है',
    automatic: 'परिचय अपने आप आगे बढ़ता है। ज़रूरत पड़ने पर आप इसे रोक सकते हैं।',
    paused: 'अपना समय लें। परिचय रुका हुआ है।',
    pause: 'रोकें', resume: 'फिर शुरू करें',
  },
  ar: {
    messages: [
      'بأي نمط تعيش الآن؟',
      'هل تقتصر حياتك على العمل والعائلة والأصدقاء؟',
      'لحياة مُرضية ومتكاملة، نوصي بوضع خطة من البداية إلى النهاية لكل مجال من مجالات حياتك الاثني عشر.',
      'حدّد إطار حياتك وحوّله إلى استراتيجيات ملموسة.',
      'لتستعيد بذلك الوضوح والحضور الواعي.',
      'نمِّ كل نمط من أنماط حياتك.',
      'ادخل إلى Modo Cultiva.',
    ],
    title: 'مرحبًا بك في Modo Cultiva',
    automatic: 'يتقدم التعريف تلقائيًا. يمكنك إيقافه مؤقتًا متى احتجت.',
    paused: 'خذ وقتك. التعريف متوقف مؤقتًا.',
    pause: 'إيقاف مؤقت', resume: 'استئناف',
  },
  it: {
    messages: [
      'In quale modalità stai vivendo adesso?',
      'La tua vita si riduce al lavoro, alla famiglia e agli amici?',
      'Per una vita piena, consigliamo un piano dall’inizio alla fine per tutte le 12 aree della tua vita.',
      'Definisci la tua struttura e trasformala in strategie concrete.',
      'Ritrovando così chiarezza e una presenza consapevole.',
      'Coltiva ciascuno dei tuoi modi di vivere.',
      'Entra in Modo Cultiva.',
    ],
    title: 'Benvenuto in Modo Cultiva',
    automatic: 'L’introduzione avanza automaticamente. Puoi metterla in pausa quando vuoi.',
    paused: 'Prenditi il tuo tempo. L’introduzione è in pausa.',
    pause: 'Pausa', resume: 'Riprendi',
  },
  pt: {
    messages: [
      'Em que modo você está vivendo agora?',
      'Sua vida se resume ao trabalho, à família e aos amigos?',
      'Para ter uma vida plena, recomendamos um plano do início ao fim para as 12 áreas da sua vida.',
      'Defina sua estrutura e transforme-a em estratégias concretas.',
      'Recuperando assim a clareza e uma presença consciente.',
      'Cultive cada um dos seus modos de vida.',
      'Entre no Modo Cultiva.',
    ],
    title: 'Boas-vindas ao Modo Cultiva',
    automatic: 'A introdução avança automaticamente. Você pode pausar quando precisar.',
    paused: 'Vá no seu ritmo. A introdução está pausada.',
    pause: 'Pausar', resume: 'Retomar',
  },
  ru: {
    messages: [
      'В каком режиме вы живёте сейчас?',
      'Ваша жизнь сводится к работе, семье и друзьям?',
      'Для полноценной жизни мы рекомендуем составить план от начала до конца для всех 12 сфер вашей жизни.',
      'Определите свою структуру и превратите её в конкретные стратегии.',
      'Так вы вернёте ясность и осознанное присутствие.',
      'Развивайте каждый из своих жизненных режимов.',
      'Войдите в Modo Cultiva.',
    ],
    title: 'Добро пожаловать в Modo Cultiva',
    automatic: 'Вступление продолжается автоматически. При необходимости его можно приостановить.',
    paused: 'Не торопитесь. Вступление приостановлено.',
    pause: 'Пауза', resume: 'Продолжить',
  },
  de: {
    messages: [
      'In welchem Modus lebst du gerade?',
      'Besteht dein Leben nur aus Arbeit, Familie und Freunden?',
      'Für ein erfülltes Leben empfehlen wir einen Plan von Anfang bis Ende für alle 12 Bereiche deines Lebens.',
      'Definiere deine Struktur und entwickle daraus konkrete Strategien.',
      'So gewinnst du Klarheit und eine bewusste Präsenz zurück.',
      'Kultiviere jeden deiner Lebensmodi.',
      'Tritt ein in Modo Cultiva.',
    ],
    title: 'Willkommen bei Modo Cultiva',
    automatic: 'Die Einführung läuft automatisch weiter. Du kannst sie jederzeit pausieren.',
    paused: 'Nimm dir Zeit. Die Einführung ist pausiert.',
    pause: 'Pausieren', resume: 'Fortsetzen',
  },
  fr: {
    messages: [
      'Dans quel mode vivez-vous en ce moment ?',
      'Votre vie se résume-t-elle au travail, à la famille et aux amis ?',
      'Pour une vie épanouie, nous recommandons un plan du début à la fin pour les 12 domaines de votre vie.',
      'Définissez votre structure et transformez-la en stratégies concrètes.',
      'Pour retrouver ainsi la clarté et une présence consciente.',
      'Cultivez chacun de vos modes de vie.',
      'Entrez dans Modo Cultiva.',
    ],
    title: 'Bienvenue dans Modo Cultiva',
    automatic: 'L’introduction avance automatiquement. Vous pouvez la mettre en pause à tout moment.',
    paused: 'Prenez votre temps. L’introduction est en pause.',
    pause: 'Pause', resume: 'Reprendre',
  },
  da: {
    messages: [
      'Hvilken tilstand lever du i lige nu?',
      'Består dit liv kun af arbejde, familie og venner?',
      'For et meningsfuldt liv anbefaler vi en plan fra start til slut for alle 12 områder af dit liv.',
      'Definér din struktur, og omsæt den til konkrete strategier.',
      'Så du genfinder klarhed og et bevidst nærvær.',
      'Dyrk hver af dine livstilstande.',
      'Træd ind i Modo Cultiva.',
    ],
    title: 'Velkommen til Modo Cultiva',
    automatic: 'Introduktionen fortsætter automatisk. Du kan sætte den på pause, når du har brug for det.',
    paused: 'Tag dig god tid. Introduktionen er sat på pause.',
    pause: 'Pause', resume: 'Fortsæt',
  },
};

export function resolveWelcomeLanguage(language: string): WelcomeLanguage {
  const base = language.trim().toLowerCase().split(/[-_]/u)[0];
  return WELCOME_LANGUAGES.find((supported) => supported === base) ?? 'es';
}

export function getWelcomeMessages(language: string): WelcomeCopy {
  return welcomeMessages[resolveWelcomeLanguage(language)];
}
