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
  languageLabel: string;
  installTitle: string;
  installDescription: string;
  installAction: string;
  continueInBrowser: string;
  installUnavailable: string;
  openInstalledApp: string;
  installHelp: readonly [string, string, string];
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
    automatic: 'Toca el borde izquierdo para volver o el derecho para avanzar. También usa ← y →. El idioma se cambia arriba.',
    paused: 'Tómate tu tiempo. La introducción está en pausa.',
    pause: 'Pausar', resume: 'Reanudar',
    languageLabel: 'Idioma', installTitle: 'Instala Modo Cultiva', installDescription: 'Lleva tu mapa de vida contigo. Instala la app para una experiencia más cómoda y rápida.', installAction: 'Instalar Modo Cultiva', continueInBrowser: 'Continuar en el navegador', installUnavailable: 'La instalación no se abrió automáticamente. Puedes continuar en el navegador o seguir estos pasos para instalarla.', openInstalledApp: 'Cuando termine la instalación, abre Modo Cultiva desde la pantalla de inicio para comenzar.', installHelp: ['Abre el menú de tu navegador.', 'Selecciona “Instalar aplicación” o “Agregar a pantalla de inicio”.', 'En iPhone o iPad: abre en Safari, toca Compartir y elige “Añadir a pantalla de inicio”.'],
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
    automatic: 'Tap the left edge to go back or the right edge to move ahead. You can also use ← and →. Change language above.',
    paused: 'Take your time. The introduction is paused.',
    pause: 'Pause', resume: 'Resume',
    languageLabel: 'Language', installTitle: 'Install Modo Cultiva', installDescription: 'Take your life map with you. Install the app for a faster, more convenient experience.', installAction: 'Install Modo Cultiva', continueInBrowser: 'Continue in browser', installUnavailable: 'The installation prompt did not open automatically. You can continue in your browser or follow these steps to install.', openInstalledApp: 'When installation is complete, open Modo Cultiva from your home screen to begin.', installHelp: ['Open your browser menu.', 'Select “Install app” or “Add to Home Screen”.', 'On iPhone or iPad: open in Safari, tap Share, then choose “Add to Home Screen”.'],
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
    automatic: '点按左侧返回，点按右侧前进；也可使用 ← 和 →。可在上方更改语言。',
    paused: '慢慢来，介绍已暂停。',
    pause: '暂停', resume: '继续播放',
    languageLabel: '语言', installTitle: '安装 Modo Cultiva', installDescription: '随身携带你的人生地图。安装应用，享受更便捷、更快速的体验。', installAction: '安装 Modo Cultiva', continueInBrowser: '在浏览器中继续', installUnavailable: '安装提示未自动打开。你可以在浏览器中继续，或按照以下步骤安装。', openInstalledApp: '安装完成后，请从主屏幕打开 Modo Cultiva 开始。', installHelp: ['打开浏览器菜单。', '选择“安装应用”或“添加到主屏幕”。', '在 iPhone 或 iPad 上：用 Safari 打开，轻点分享，然后选择“添加到主屏幕”。'],
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
    automatic: 'पीछे जाने के लिए बाएँ किनारे पर और आगे जाने के लिए दाएँ किनारे पर टैप करें। ← और → भी दबा सकते हैं। भाषा ऊपर बदलें।',
    paused: 'अपना समय लें। परिचय रुका हुआ है।',
    pause: 'रोकें', resume: 'फिर शुरू करें',
    languageLabel: 'भाषा', installTitle: 'Modo Cultiva इंस्टॉल करें', installDescription: 'अपना जीवन मानचित्र अपने साथ रखें। तेज़ और सुविधाजनक अनुभव के लिए ऐप इंस्टॉल करें।', installAction: 'Modo Cultiva इंस्टॉल करें', continueInBrowser: 'ब्राउज़र में जारी रखें', installUnavailable: 'इंस्टॉल विंडो अपने-आप नहीं खुली। आप ब्राउज़र में जारी रख सकते हैं या इंस्टॉल करने के ये चरण अपनाएँ।', openInstalledApp: 'इंस्टॉल पूरा होने पर, शुरू करने के लिए होम स्क्रीन से Modo Cultiva खोलें।', installHelp: ['अपने ब्राउज़र का मेनू खोलें।', '“ऐप इंस्टॉल करें” या “होम स्क्रीन पर जोड़ें” चुनें।', 'iPhone या iPad पर: Safari में खोलें, शेयर करें पर टैप करें और “होम स्क्रीन पर जोड़ें” चुनें।'],
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
    automatic: 'اضغط على الحافة اليسرى للعودة أو اليمنى للتقدّم. يمكنك أيضًا استخدام ← و→. غيّر اللغة من الأعلى.',
    paused: 'خذ وقتك. التعريف متوقف مؤقتًا.',
    pause: 'إيقاف مؤقت', resume: 'استئناف',
    languageLabel: 'اللغة', installTitle: 'ثبّت Modo Cultiva', installDescription: 'احتفظ بخريطة حياتك معك. ثبّت التطبيق لتجربة أسرع وأسهل.', installAction: 'تثبيت Modo Cultiva', continueInBrowser: 'المتابعة في المتصفح', installUnavailable: 'لم تظهر نافذة التثبيت تلقائيًا. يمكنك المتابعة في المتصفح أو اتباع الخطوات التالية للتثبيت.', openInstalledApp: 'عند اكتمال التثبيت، افتح Modo Cultiva من الشاشة الرئيسية للبدء.', installHelp: ['افتح قائمة المتصفح.', 'اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».', 'على iPhone أو iPad: افتح Safari، واضغط مشاركة، ثم اختر «إضافة إلى الشاشة الرئيسية».'],
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
    automatic: 'Tocca il bordo sinistro per tornare indietro o quello destro per avanzare. Puoi usare anche ← e →. Cambia lingua in alto.',
    paused: 'Prenditi il tuo tempo. L’introduzione è in pausa.',
    pause: 'Pausa', resume: 'Riprendi',
    languageLabel: 'Lingua', installTitle: 'Installa Modo Cultiva', installDescription: 'Porta con te la tua mappa di vita. Installa l’app per un’esperienza più rapida e comoda.', installAction: 'Installa Modo Cultiva', continueInBrowser: 'Continua nel browser', installUnavailable: 'La richiesta di installazione non si è aperta automaticamente. Puoi continuare nel browser o seguire questi passaggi.', openInstalledApp: 'Una volta completata l’installazione, apri Modo Cultiva dalla schermata Home per iniziare.', installHelp: ['Apri il menu del browser.', 'Seleziona “Installa app” o “Aggiungi alla schermata Home”.', 'Su iPhone o iPad: apri in Safari, tocca Condividi e scegli “Aggiungi alla schermata Home”.'],
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
    automatic: 'Toque na borda esquerda para voltar ou na direita para avançar. Também use ← e →. Altere o idioma acima.',
    paused: 'Vá no seu ritmo. A introdução está pausada.',
    pause: 'Pausar', resume: 'Retomar',
    languageLabel: 'Idioma', installTitle: 'Instale o Modo Cultiva', installDescription: 'Leve seu mapa de vida com você. Instale o app para uma experiência mais rápida e prática.', installAction: 'Instalar Modo Cultiva', continueInBrowser: 'Continuar no navegador', installUnavailable: 'A instalação não abriu automaticamente. Você pode continuar no navegador ou seguir estas etapas.', openInstalledApp: 'Quando a instalação terminar, abra o Modo Cultiva pela tela inicial para começar.', installHelp: ['Abra o menu do navegador.', 'Selecione “Instalar aplicativo” ou “Adicionar à tela inicial”.', 'No iPhone ou iPad: abra no Safari, toque em Compartilhar e escolha “Adicionar à Tela de Início”.'],
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
    automatic: 'Нажмите слева, чтобы вернуться, или справа, чтобы продолжить. Также можно нажать ← и →. Язык меняется вверху.',
    paused: 'Не торопитесь. Вступление приостановлено.',
    pause: 'Пауза', resume: 'Продолжить',
    languageLabel: 'Язык', installTitle: 'Установите Modo Cultiva', installDescription: 'Сохраните карту своей жизни под рукой. Установите приложение для более удобной и быстрой работы.', installAction: 'Установить Modo Cultiva', continueInBrowser: 'Продолжить в браузере', installUnavailable: 'Окно установки не открылось автоматически. Можно продолжить в браузере или выполнить следующие шаги.', openInstalledApp: 'Когда установка завершится, откройте Modo Cultiva с главного экрана, чтобы начать.', installHelp: ['Откройте меню браузера.', 'Выберите «Установить приложение» или «Добавить на главный экран».', 'На iPhone или iPad: откройте страницу в Safari, нажмите «Поделиться» и выберите «На экран Домой».'],
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
    automatic: 'Tippe links, um zurückzugehen, oder rechts, um weiterzugehen. Du kannst auch ← und → nutzen. Sprache oben ändern.',
    paused: 'Nimm dir Zeit. Die Einführung ist pausiert.',
    pause: 'Pausieren', resume: 'Fortsetzen',
    languageLabel: 'Sprache', installTitle: 'Modo Cultiva installieren', installDescription: 'Behalte deine Lebenskarte immer dabei. Installiere die App für ein schnelleres und komfortableres Erlebnis.', installAction: 'Modo Cultiva installieren', continueInBrowser: 'Im Browser fortfahren', installUnavailable: 'Der Installationsdialog wurde nicht automatisch geöffnet. Du kannst im Browser fortfahren oder diese Schritte ausführen.', openInstalledApp: 'Wenn die Installation abgeschlossen ist, öffne Modo Cultiva auf deinem Startbildschirm.', installHelp: ['Öffne das Browsermenü.', 'Wähle „App installieren“ oder „Zum Startbildschirm hinzufügen“.', 'Auf iPhone oder iPad: in Safari öffnen, auf „Teilen“ tippen und „Zum Home-Bildschirm“ wählen.'],
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
    automatic: 'Touchez le bord gauche pour revenir en arrière ou le droit pour avancer. Utilisez aussi ← et →. Changez la langue en haut.',
    paused: 'Prenez votre temps. L’introduction est en pause.',
    pause: 'Pause', resume: 'Reprendre',
    languageLabel: 'Langue', installTitle: 'Installer Modo Cultiva', installDescription: 'Gardez votre carte de vie avec vous. Installez l’application pour une expérience plus rapide et pratique.', installAction: 'Installer Modo Cultiva', continueInBrowser: 'Continuer dans le navigateur', installUnavailable: 'La fenêtre d’installation ne s’est pas ouverte automatiquement. Vous pouvez continuer dans le navigateur ou suivre ces étapes.', openInstalledApp: 'Une fois l’installation terminée, ouvrez Modo Cultiva depuis votre écran d’accueil pour commencer.', installHelp: ['Ouvrez le menu du navigateur.', 'Choisissez « Installer l’application » ou « Ajouter à l’écran d’accueil ».', 'Sur iPhone ou iPad : ouvrez dans Safari, touchez Partager, puis « Sur l’écran d’accueil ».'],
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
    automatic: 'Tryk på venstre kant for at gå tilbage eller højre kant for at gå frem. Du kan også bruge ← og →. Skift sprog øverst.',
    paused: 'Tag dig god tid. Introduktionen er sat på pause.',
    pause: 'Pause', resume: 'Fortsæt',
    languageLabel: 'Sprog', installTitle: 'Installer Modo Cultiva', installDescription: 'Hav dit livskort med dig. Installer appen for en hurtigere og mere praktisk oplevelse.', installAction: 'Installer Modo Cultiva', continueInBrowser: 'Fortsæt i browseren', installUnavailable: 'Installationsvinduet åbnede ikke automatisk. Du kan fortsætte i browseren eller følge disse trin.', openInstalledApp: 'Når installationen er færdig, skal du åbne Modo Cultiva fra din hjemmeskærm for at begynde.', installHelp: ['Åbn browserens menu.', 'Vælg “Installer app” eller “Føj til hjemmeskærm”.', 'På iPhone eller iPad: åbn i Safari, tryk på Del, og vælg “Føj til hjemmeskærm”.'],
  },
};

export function resolveWelcomeLanguage(language: string): WelcomeLanguage {
  const base = language.trim().toLowerCase().split(/[-_]/u)[0];
  return WELCOME_LANGUAGES.find((supported) => supported === base) ?? 'es';
}

export function getWelcomeMessages(language: string): WelcomeCopy {
  return welcomeMessages[resolveWelcomeLanguage(language)];
}
