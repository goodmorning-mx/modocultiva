import { usePwaUpdate } from '@goodmorning/gm-pwa';
import { useCallback, useEffect, useRef, useState } from 'react';

type PwaLanguage = 'es' | 'en' | 'zh' | 'hi' | 'ar' | 'it' | 'pt' | 'ru' | 'de' | 'fr' | 'da';

type PwaCopy = {
  install: string;
  howToInstall: string;
  update: string;
  updating: string;
  close: string;
  installTitle: string;
  iosStepOne: string;
  iosStepTwo: string;
  iosStepThree: string;
  browserStepOne: string;
  browserStepTwo: string;
};

const copy: Record<PwaLanguage, PwaCopy> = {
  es: { install: 'Instalar Modo Cultiva', howToInstall: 'Cómo instalar', update: 'Nueva versión · Actualizar', updating: 'Actualizando…', close: 'Cerrar', installTitle: 'Instalar Modo Cultiva', iosStepOne: 'Abre esta página en Safari.', iosStepTwo: 'Presiona Compartir.', iosStepThree: 'Selecciona “Añadir a pantalla de inicio”.', browserStepOne: 'Abre el menú de tu navegador.', browserStepTwo: 'Selecciona “Instalar aplicación” o “Agregar a pantalla de inicio”.' },
  en: { install: 'Install Modo Cultiva', howToInstall: 'How to install', update: 'New version · Update', updating: 'Updating…', close: 'Close', installTitle: 'Install Modo Cultiva', iosStepOne: 'Open this page in Safari.', iosStepTwo: 'Tap Share.', iosStepThree: 'Select “Add to Home Screen”.', browserStepOne: 'Open your browser menu.', browserStepTwo: 'Select “Install app” or “Add to home screen”.' },
  zh: { install: '安装 Modo Cultiva', howToInstall: '安装说明', update: '新版本 · 更新', updating: '正在更新…', close: '关闭', installTitle: '安装 Modo Cultiva', iosStepOne: '在 Safari 中打开此页面。', iosStepTwo: '点击分享。', iosStepThree: '选择“添加到主屏幕”。', browserStepOne: '打开浏览器菜单。', browserStepTwo: '选择“安装应用”或“添加到主屏幕”。' },
  hi: { install: 'Modo Cultiva इंस्टॉल करें', howToInstall: 'इंस्टॉल करने का तरीका', update: 'नया संस्करण · अपडेट करें', updating: 'अपडेट हो रहा है…', close: 'बंद करें', installTitle: 'Modo Cultiva इंस्टॉल करें', iosStepOne: 'यह पेज Safari में खोलें।', iosStepTwo: 'Share दबाएं।', iosStepThree: '“Add to Home Screen” चुनें।', browserStepOne: 'अपने ब्राउज़र का मेनू खोलें।', browserStepTwo: '“Install app” या “Add to home screen” चुनें।' },
  ar: { install: 'تثبيت Modo Cultiva', howToInstall: 'طريقة التثبيت', update: 'إصدار جديد · تحديث', updating: 'جارٍ التحديث…', close: 'إغلاق', installTitle: 'تثبيت Modo Cultiva', iosStepOne: 'افتح هذه الصفحة في Safari.', iosStepTwo: 'اضغط على المشاركة.', iosStepThree: 'اختر «إضافة إلى الشاشة الرئيسية».', browserStepOne: 'افتح قائمة المتصفح.', browserStepTwo: 'اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».' },
  it: { install: 'Installa Modo Cultiva', howToInstall: 'Come installare', update: 'Nuova versione · Aggiorna', updating: 'Aggiornamento…', close: 'Chiudi', installTitle: 'Installa Modo Cultiva', iosStepOne: 'Apri questa pagina in Safari.', iosStepTwo: 'Tocca Condividi.', iosStepThree: 'Seleziona “Aggiungi alla schermata Home”.', browserStepOne: 'Apri il menu del browser.', browserStepTwo: 'Seleziona “Installa app” o “Aggiungi alla schermata Home”.' },
  pt: { install: 'Instalar Modo Cultiva', howToInstall: 'Como instalar', update: 'Nova versão · Atualizar', updating: 'Atualizando…', close: 'Fechar', installTitle: 'Instalar Modo Cultiva', iosStepOne: 'Abra esta página no Safari.', iosStepTwo: 'Toque em Compartilhar.', iosStepThree: 'Selecione “Adicionar à Tela de Início”.', browserStepOne: 'Abra o menu do navegador.', browserStepTwo: 'Selecione “Instalar aplicativo” ou “Adicionar à tela inicial”.' },
  ru: { install: 'Установить Modo Cultiva', howToInstall: 'Как установить', update: 'Новая версия · Обновить', updating: 'Обновление…', close: 'Закрыть', installTitle: 'Установить Modo Cultiva', iosStepOne: 'Откройте эту страницу в Safari.', iosStepTwo: 'Нажмите «Поделиться».', iosStepThree: 'Выберите «На экран Домой».', browserStepOne: 'Откройте меню браузера.', browserStepTwo: 'Выберите «Установить приложение» или «Добавить на главный экран».' },
  de: { install: 'Modo Cultiva installieren', howToInstall: 'Installationsanleitung', update: 'Neue Version · Aktualisieren', updating: 'Wird aktualisiert…', close: 'Schließen', installTitle: 'Modo Cultiva installieren', iosStepOne: 'Öffne diese Seite in Safari.', iosStepTwo: 'Tippe auf Teilen.', iosStepThree: 'Wähle „Zum Home-Bildschirm“.', browserStepOne: 'Öffne das Browsermenü.', browserStepTwo: 'Wähle „App installieren“ oder „Zum Startbildschirm hinzufügen“.' },
  fr: { install: 'Installer Modo Cultiva', howToInstall: 'Comment installer', update: 'Nouvelle version · Mettre à jour', updating: 'Mise à jour…', close: 'Fermer', installTitle: 'Installer Modo Cultiva', iosStepOne: 'Ouvrez cette page dans Safari.', iosStepTwo: 'Touchez Partager.', iosStepThree: 'Sélectionnez « Sur l’écran d’accueil ».', browserStepOne: 'Ouvrez le menu du navigateur.', browserStepTwo: 'Sélectionnez « Installer l’application » ou « Ajouter à l’écran d’accueil ».' },
  da: { install: 'Installer Modo Cultiva', howToInstall: 'Sådan installerer du', update: 'Ny version · Opdater', updating: 'Opdaterer…', close: 'Luk', installTitle: 'Installer Modo Cultiva', iosStepOne: 'Åbn denne side i Safari.', iosStepTwo: 'Tryk på Del.', iosStepThree: 'Vælg “Føj til hjemmeskærm”.', browserStepOne: 'Åbn browserens menu.', browserStepTwo: 'Vælg “Installer app” eller “Føj til hjemmeskærm”.' },
};

const isIos = () => typeof navigator !== 'undefined' && (/iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
const isNativeApp = () => typeof navigator !== 'undefined' && /ModoCultivaAndroidApp/i.test(navigator.userAgent);

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let capturedInstallPrompt: BeforeInstallPromptEvent | null = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    capturedInstallPrompt = event as BeforeInstallPromptEvent;
    window.dispatchEvent(new Event('modo-cultiva-install-ready'));
  });
}

function useReliablePwaInstall() {
  const promptRef = useRef<BeforeInstallPromptEvent | null>(capturedInstallPrompt);
  const [installed, setInstalled] = useState(() => typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true));
  const [installReady, setInstallReady] = useState(() => Boolean(capturedInstallPrompt));
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    const onPromptReady = () => {
      promptRef.current = capturedInstallPrompt;
      setInstallReady(Boolean(promptRef.current));
    };
    const onInstalled = () => {
      capturedInstallPrompt = null;
      promptRef.current = null;
      setInstallReady(false);
      setInstalled(true);
      setGuideOpen(false);
    };
    window.addEventListener('modo-cultiva-install-ready', onPromptReady);
    window.addEventListener('appinstalled', onInstalled);
    onPromptReady();
    return () => {
      window.removeEventListener('modo-cultiva-install-ready', onPromptReady);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (isIos() || !promptRef.current) {
      setGuideOpen(true);
      return;
    }
    const prompt = promptRef.current;
    await prompt.prompt();
    await prompt.userChoice;
    capturedInstallPrompt = null;
    promptRef.current = null;
    setInstallReady(false);
  }, []);

  return { installed, installReady, guideOpen, install, closeGuide: () => setGuideOpen(false) };
}

export function PwaControls({ language }: { language: string }) {
  const selectedLanguage = (language in copy ? language : 'en') as PwaLanguage;
  const labels = copy[selectedLanguage];
  const install = useReliablePwaInstall();
  const isApp = isNativeApp();
  const update = usePwaUpdate({ serviceWorkerUrl: '/sw.js', version: '2026-10-18-pwa', updateIntervalMs: 15 * 60 * 1000 });

  return <>
    <div className="pwa-controls" aria-label="PWA controls">
      {!isApp && !install.installed && <button className="pwa-action" type="button" onClick={() => void install.install()}>{install.installReady ? labels.install : labels.howToInstall}</button>}
      {update.updateReady && <button className="pwa-action pwa-action--update" type="button" onClick={() => void update.update()} disabled={update.updating}>{update.updating ? labels.updating : labels.update}</button>}
    </div>
    {install.guideOpen && <div className="pwa-guide-backdrop" role="presentation" onClick={install.closeGuide}><section className="pwa-guide" role="dialog" aria-modal="true" aria-labelledby="pwa-guide-title" onClick={(event) => event.stopPropagation()}>
      <button className="pwa-guide-close" type="button" aria-label={labels.close} onClick={install.closeGuide}>×</button>
      <p className="kicker">PWA</p><h2 id="pwa-guide-title">{labels.installTitle}</h2>
      <ol>{isIos() ? <><li>{labels.iosStepOne}</li><li>{labels.iosStepTwo}</li><li>{labels.iosStepThree}</li></> : <><li>{labels.browserStepOne}</li><li>{labels.browserStepTwo}</li></>}</ol>
    </section></div>}
  </>;
}
