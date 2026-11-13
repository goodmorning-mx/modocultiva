Warning: truncated output (original token count: 100016)
Total output lines: 2639

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { PwaControls } from './PwaControls';
import { ActivityBank } from './ActivityBank';
import { VisionImage } from './VisionImage';
import { JourneyActivityCard } from './JourneyActivityCard';
import { ModeAiStudio } from './ModeAiStudio';
import { ClarityGoal } from './ClarityGoal';
import clarityLevels from './clarity-levels.json';
import { createStateSyncQueue, type StateSnapshot, type StateSyncQueue } from './stateSyncQueue';
import { cloneStateValue, reconcileState, type StateObject } from './stateReconcile';
import { accountStateKey, accountRecoveryKey, captureLegacyArchive, hasLegacyConsent, legacyConsentKey, legacyImportDocument, pendingAccountRecord, readPendingAccount, recoverAccountState, scopedPersonalStorage, stageCommittedUi, writeStoredJson, type AccountStateScope, type PendingAccountState, type RecoveryStorage } from './stateRecovery';
import { StateAccountBoundary, type StateAccountPhase } from './StateAccountBoundary';
import { stateAccountCopy } from './stateAccountMessages';
import { activitySha256, createCommunityClient, isCommunityCardId, CommunityApiError, type CardAudience, type CommunitySubmission, type CommunityIdeaRequest } from './communityClient';
import { communityCopy } from './communityMessages';
import { activityFlowCopy } from './activityJourneyFlowMessages';
import { PublicActivityCard } from './PublicActivityCard';
import { adaptActivityFlow } from './activityFlowAdapter';
import type { ActivityJourneyFlowProps } from './ActivityJourneyFlow';
import type { EvidenceDraft } from './visualEvidence';
import { onboardingIntegrationCopy } from './onboardingIntegrationMessages';
import { WelcomeIntro } from './WelcomeIntro';
import { browserLanguage, readManualLanguage, resolveLanguagePreference, restoreLanguagePreference, normalizeLanguageState, type AppLanguage, type LanguageSource } from './languagePreference';
import { decideWelcomeIntro, markWelcomeIntroComplete, readWelcomeIntroCompletion, welcomeIntroStorageKey, type WelcomeIntroScope } from './welcomeIntroState';
import { GuidedTour } from './GuidedTour';
import { getGuidedTourCopy, guidedTourStepCopy, type TourStageId } from './guidedTourMessages';
import type { GuidedTourStep, TourMethod } from './guidedTourCore';
import { clarityTransition } from './clarityRubric';
import { CommunityPanel, type CommunityShareCandidate, type CommunityTab } from './CommunityPanel';
import './onboarding-integration.css';
import { modeAiMessage, readModeAiProposal } from './modeAiMessages';
import { CultivaLeaf, CULTIVA_LEAF_SHAPE } from './CultivaLeaf';
import { activityReactionKey, cleanReactions, type ActivityReactions, type Reaction } from './journeySocial';
import { calculateCultivaLevel, CULTIVA_MAX_LEVEL } from './cultivaLevel';
import { BadgesGallery } from './BadgesGallery';
import { BadgeMedal } from './BadgeMedal';
import { badgeCopy } from './badgeMessages';
import { badgeProgress, cleanCompletions, hasVisionImage, eligibleFeaturedBadges, type ActivityCompletions } from './badgeProgress';
import { getBankActivities } from './quoteActivityCatalog';
import { createNavigationHistory } from './navigationHistory';
import { renameLifeConfiguration, persistRenamedConfiguration } from './lifeConfigurations';
import logo from './assets/modo-cultiva-logo-neon.png';
import './skin-overrides.css';
import './life-map-polish.css';
import './profile-level.css';
import './home-mode-widgets.css';

type HealthResponse = {
  service: string;
  status: string;
  environment: string;
};

type AuthTokens = { access_token: string; refresh_token: string; expires_in: number; identity: { user_id: string; organization_id: string; name?: string | null; email?: string | null; roles: string[]; permissions: string[] } };

type ApiState =
  | { status: 'loading' }
  | { status: 'success'; data: HealthResponse }
  | { status: 'error'; message: string };

type Mode = {
  key: string;
  roman: string;
  name: string;
  shortName: string;
  description: string;
  icon: string;
  color: string;
  accent: string;
};

type View = 'login' | 'plans' | 'cult' | 'lab' | 'welcome' | 'dashboard';
type Preset = Record<string, number>;
type Skin = 'holista' | 'dj' | 'nocturna' | 'lucid' | 'zen' | 'mission' | 'rpg' | 'botanical' | 'arcade' | 'arcana' | 'urban' | 'ocean' | 'fashion' | 'minimal';
type PaletteFilter = 'none' | 'nocturna' | 'lucid';
type ActivityEntry = 'custom' | 'pool' | 'ai';
type PoolActivity = { title: string; description: string };
type TourTopic = TourStageId | 'controlStrongest' | 'controlLeast' | 'controlFocus' | 'controlTrivia';
const tourTopics: readonly TourTopic[] = ['modes', 'modeDescription', 'selfAssessment', 'activityDesign', 'nextClarity', 'custom', 'bank', 'ai', 'localContacts', 'methods', 'effort', 'activityCard', 'evidence', 'audience', 'reviews', 'vision', 'reactions', 'sharing', 'globalIdeas', 'specialists', 'community', 'profile', 'badges', 'configurations', 'controlCenter', 'controlStrongest', 'controlLeast', 'controlFocus', 'controlTrivia', 'replay'];
type AccessRequest = { feature: string; plan: 'Cuenta' | 'Entry' | 'Gold' | 'Ultimate Mode'; returnView: View };
type PendingActivity = { level: number; entry: ActivityEntry };
type PlanKey = 'basic' | 'gold' | 'ultimate';
type PlanDetails = { name: string; price: string; promise: string; features: string[] };
type CultTab = 'home' | 'insights' | 'network' | 'skins' | 'badges';
type CultBadge = { key: string; icon: string; title: string; description: string };

const cultBadgeCatalog: CultBadge[] = [
  { key: 'first-step', icon: '✦', title: 'Primer paso', description: 'Definiste tu primera actividad.' },
  { key: 'three-moves', icon: '↗', title: 'Tres movimientos', description: 'Guardaste actividades en tres journeys.' },
  { key: 'level-up', icon: '↑', title: 'Nivel arriba', description: 'Llevaste un modo al siguiente nivel.' },
  { key: 'full-spectrum', icon: '◌', title: 'Espectro completo', description: 'Cultivaste los 12 modos con una actividad.' },
  { key: 'global-eye', icon: '◎', title: 'Mirada global', description: 'Guardaste una práctica compartida por la comunidad.' },
  { key: 'visionary', icon: '△', title: 'Visión final', description: 'Subiste una imagen para representar tu nivel 9.' },
  { key: 'preset-maker', icon: '⌘', title: 'Cartógrafo', description: 'Creaste una configuración de vida para explorar otro mapa.' },
  { key: 'skin-shift', icon: '◇', title: 'Cambio de piel', description: 'Activaste una nueva identidad visual.' },
  { key: 'completionist', icon: '✺', title: 'Completionist', description: '' },
  { key: 'maxed', icon: '◇', title: 'Maxed', description: '' },
];

const skinCatalog: { key: Skin; name: string; icon: string; description: string; signature: string; access: 'base' | 'gold' | 'ultimate' }[] = [];
const allSkinKeys = new Set<Skin>(['holista', 'dj', 'nocturna', 'lucid', ...skinCatalog.map((item) => item.key)]);
const skinInfo = (key: Skin) => skinCatalog.find((item) => item.key === key);

const modes: Mode[] = [
  { key: 'fisico', roman: 'I', name: 'Modo Físico', shortName: 'Físico', description: 'Salud y bienestar corporal', icon: '✦', color: '#54d6bc', accent: '#153f42' },
  { key: 'intelectual', roman: 'II', name: 'Modo Intelectual', shortName: 'Intelectual', description: 'Desarrollo intelectual y cognitivo', icon: '◈', color: '#63c9ee', accent: '#173a55' },
  { key: 'emocional', roman: 'III', name: 'Modo Emocional', shortName: 'Emocional', description: 'Gestión y equilibrio de sentimientos', icon: '◒', color: '#f39a7a', accent: '#5c2d38' },
  { key: 'arquetipico', roman: 'IV', name: 'Modo Arquetípico', shortName: 'Arquetípico', description: 'Carácter, coherencia y esencia personal', icon: '✺', color: '#db9cf2', accent: '#412653' },
  { key: 'espiritual', roman: 'V', name: 'Modo Espiritual', shortName: 'Espiritual', description: 'Propósito, sentido y conexión', icon: '☼', color: '#f4c961', accent: '#53421d' },
  { key: 'romantico', roman: 'VI', name: 'Modo Romántico', shortName: 'Romántico', description: 'Relación de pareja y amor', icon: '♡', color: '#ef8da4', accent: '#572938' },
  { key: 'familiar', roman: 'VII', name: 'Modo Familiar', shortName: 'Familiar', description: 'Vínculos con la familia de origen y propia', icon: '⌂', color: '#b2d77a', accent: '#31452a' },
  { key: 'social', roman: 'VIII', name: 'Modo Social', shortName: 'Social', description: 'Amistades, red de apoyo y comunidad', icon: '◎', color: '#73d5d4', accent: '#19494b' },
  { key: 'financiero', roman: 'IX', name: 'Modo Financiero', shortName: 'Financiero', description: 'Gestión del dinero, ahorro e inversión', icon: '◉', color: '#e5be58', accent: '#51421d' },
  { key: 'profesional', roman: 'X', name: 'Modo Profesional', shortName: 'Profesional', description: 'Carrera, vocación y desempeño laboral', icon: '▣', color: '#8cb8f1', accent: '#263e60' },
  { key: 'ludico', roman: 'XI', name: 'Modo Lúdico', shortName: 'Lúdico', description: 'Disfrute, ocio, descanso y recarga', icon: '✹', color: '#f3b86e', accent: '#543b22' },
  { key: 'visionario', roman: 'XII', name: 'Modo Visionario', shortName: 'Visionario', description: 'Metas, planificación y legado', icon: '△', color: '#72e79b', accent: '#214b39' },
];
const labCards: Record<string, { question: string; answer: string }> = {
  fisico: { question: '¿Qué señales te da hoy tu cuerpo?', answer: 'El Modo Físico cultiva salud, descanso, alimentación, movimiento y la relación cotidiana con tu cuerpo.' },
  intelectual: { question: '¿Qué idea nueva quieres comprender?', answer: 'El Modo Intelectual desarrolla tu curiosidad, pensamiento crítico, aprendizaje y capacidad de ampliar tus perspectivas.' },
  emocional: { question: '¿Qué emoción necesita ser escuchada?', answer: 'El Modo Emocional observa tus sentimientos y crea espacio para regularlos, expresarlos y aprender de ellos.' },
  arquetipico: { question: '¿Qué parte de tu carácter estás cultivando?', answer: 'El Modo Arquetípico explora tu esencia, tus valores, tu coherencia y la persona que eliges ser en el mundo.' },
  espiritual: { question: '¿Qué le da sentido a tu camino?', answer: 'El Modo Espiritual conecta propósito, fe, contemplación y las prácticas que te ayudan a vivir con significado.' },
  romantico: { question: '¿Cómo estás cultivando el amor?', answer: 'El Modo Romántico atiende la relación de pareja, la intimidad, el cuidado mutuo y la forma en que compartes tu vida.' },
  familiar: { question: '¿Qué vínculo familiar quieres nutrir?', answer: 'El Modo Familiar mira tus raíces y tus vínculos cercanos para cultivar presencia, límites sanos y conexión.' },
  social: { question: '¿Quiénes forman parte de tu red de apoyo?', answer: 'El Modo Social cultiva amistades, comunidad, colaboración y relaciones que te permiten acompañar y ser acompañado.' },
  financiero: { question: '¿Qué historia estás construyendo con tus recursos?', answer: 'El Modo Financiero desarrolla conciencia sobre dinero, ahorro, inversión y las decisiones que sostienen tu libertad.' },
  profesional: { question: '¿Qué estás creando con tu trabajo?', answer: 'El Modo Profesional conecta vocación, carrera, desempeño y la contribución que quieres realizar a través de tu trabajo.' },
  ludico: { question: '¿Cuándo fue la última vez que jugaste?', answer: 'El Modo Lúdico protege el disfrute, el descanso, el ocio y la energía que recuperas cuando haces espacio para jugar.' },
  visionario: { question: '¿Qué futuro quieres comenzar a hacer visible?', answer: 'El Modo Visionario convierte deseos en dirección: metas, planificación, decisiones de largo plazo y legado.' },
};

const defaultLevels = Object.fromEntries(modes.map((mode) => [mode.key, 0]));
const levelNames = clarityLevels.languages.es.map(item => item.name);
const levelDescriptions = clarityLevels.languages.es.map(item => item.description);
const defaultUserProfile = { name: 'Jofer', role: 'CEO FUNDADOR' };
const ownerEmail = 'ferrussia.joe@gmail.com';
const planDetails: Record<PlanKey, PlanDetails> = {
  basic: { name: 'Entry', price: '$179 MXN /mes · IVA incluido', promise: 'Convierte a Modo Cultiva en parte de tu rutina.', features: ['Todo lo incluido en Acceso Libre.', 'Skin Holista.', 'Journeys ilimitados.', 'Pool completo con 10 recomendaciones por nivel.', 'Vision boards en nivel 9.', 'Configuraciones de Vida ilimitadas.', 'Modo IA limitado: hasta 20 consultas mensuales.', 'Personalización de nombre y foto de perfil.', 'Historial personal de evolución.', 'Estadísticas básicas por modo.', 'Exportación de progreso.', 'Insignia Entry.'] },
  gold: { name: 'Gold', price: '$349 MXN /mes · IVA incluido', promise: 'Cultiva acompañado por tu red de apoyo.', features: ['Todo lo incluido en Entry.', 'Una skin adicional de tu elección.', 'Insights locales dentro de tu red de apoyo.', 'Solicitudes y respuestas de Insights con mayor frecuencia.', 'Grupos privados o círculos de confianza.', 'Comparación de progreso con tu círculo.', 'Modo IA ampliado: hasta 100 consultas mensuales.', 'Configuraciones de Vida compartibles.', 'Recomendaciones comunitarias.', 'Insignia Gold.'] },
  ultimate: { name: 'ULTIMATE MODE', price: '$1,199 MXN /mes · IVA incluido', promise: 'Lleva tu cultivo a una red global de conocimiento.', features: ['Todo lo incluido en Gold.', 'Skins y Filtros ilimitados.', 'Insights ilimitados.', 'Insights globales.', 'Modo IA sin límite razonable o con política de uso justo.', 'Red de Especialistas.', 'Directorio de profesionales por modo.', 'Filtros por especialidad, nivel, idioma y ubicación.', 'Perfiles profesionales verificados.', 'Solicitud de orientación privada.', 'Seguimiento de recomendaciones profesionales.', 'Insignia ULTIMATE MODE.', 'Acceso anticipado a nuevas skins y features.'] },
};
// Release switch: keep plan data and UI implementation intact while access is temporarily free.
const RELEASE_FREE_ACCESS = true;
const journeyLevels = Array.from({ length: 10 }, (_, level) => level);
const effortByLevel = ['Bajo', 'Bajo', 'Bajo', 'Medio', 'Medio', 'Medio', 'Alto', 'Alto', 'Alto', 'Visión final'];
const effortLabelByLevel = ['EXIGENCIA BAJA (Tiempo)', 'EXIGENCIA BAJA (Tiempo)', 'EXIGENCIA BAJA (Tiempo)', 'EXIGENCIA MEDIA (Tiempo + Energía)', 'EXIGENCIA MEDIA (Tiempo + Energía)', 'EXIGENCIA MEDIA (Tiempo + Energía)', 'EXIGENCIA ALTA (Tiempo + Energía + Dinero)', 'EXIGENCIA ALTA (Tiempo + Energía + Dinero)', 'EXIGENCIA ALTA (Tiempo + Energía + Dinero)', 'VISIÓN FINAL'];
const effortDescription: Record<string, string> = { Bajo: 'Esta etapa requiere principalmente tiempo: observar, comprender y crear espacio constante para el modo.', Medio: 'Esta etapa requiere tiempo y energía: sostener una práctica activa, tomar decisiones y mantener continuidad.', Alto: 'Esta etapa requiere tiempo, energía y dinero: asignar recursos, ampliar capacidades y sostener una operación más compleja.', 'Visión final': 'Esta etapa integra los recursos desarrollados para consolidar una visión completa.' };
const localizedEffortDescriptions: Record<Language, Record<string, string>> = {
  es: { low: 'Esta etapa requiere principalmente tiempo: observar, comprender y crear espacio constante para el modo.', medium: 'Esta etapa requiere tiempo y energía: sostener una práctica activa, tomar decisiones y mantener continuidad.', high: 'Esta etapa requiere tiempo, energía y dinero: asignar recursos, ampliar capacidades y sostener una operación más compleja.', vision: 'Esta etapa integra los recursos desarrollados para consolidar una visión completa.' },
  en: { low: 'This stage primarily requires time: observing, understanding and creating consistent space for the mode.', medium: 'This stage requires time and energy: sustaining active practice, making decisions and maintaining continuity.', high: 'This stage requires time, energy and money: allocating resources, expanding capabilities and sustaining greater complexity.', vision: 'This stage integrates the resources developed to consolidate a complete vision.' },
  zh: { low: '这一阶段主要需要时间：观察、理解，并为该模式持续留出空间。', medium: '这一阶段需要时间和精力：保持主动实践、作出决定并维持连续性。', high: '这一阶段需要时间、精力和金钱：分配资源、扩展能力并维持更复杂的运作。', vision: '这一阶段整合已发展的资源，形成完整的愿景。' },
  hi: { low: 'इस चरण में मुख्य रूप से समय चाहिए: देखना, समझना और इस मोड के लिए निरंतर जगह बनाना।', medium: 'इस चरण में समय और ऊर्जा चाहिए: सक्रिय अभ्यास बनाए रखना, निर्णय लेना और निरंतरता रखना।', high: 'इस चरण में समय, ऊर्जा और धन चाहिए: संसाधन लगाना, क्षमताएं बढ़ाना और अधिक जटिल संचालन बनाए रखना।', vision: 'यह चरण विकसित संसाधनों को जोड़कर एक पूर्ण दृष्टि को मजबूत करता है।' },
  ar: { low: 'تتطلب هذه المرحلة الوقت أساساً: الملاحظة والفهم وتخصيص مساحة مستمرة للوضع.', medium: 'تتطلب هذه المرحلة الوقت والطاقة: الحفاظ على ممارسة نشطة واتخاذ القرارات والاستمرارية.', high: 'تتطلب هذه المرحلة الوقت والطاقة والمال: توزيع الموارد وتوسيع القدرات والحفاظ على تشغيل أكثر تعقيداً.', vision: 'تدمج هذه المرحلة الموارد التي طُوّرت لترسيخ رؤية كاملة.' },
  it: { low: 'Questa fase richiede soprattutto tempo: osservare, comprendere e creare uno spazio costante per la modalità.', medium: 'Questa fase richiede tempo ed energia: sostenere una pratica attiva, prendere decisioni e mantenere continuità.', high: 'Questa fase richiede tempo, energia e denaro: assegnare risorse, ampliare le capacità e sostenere un funzionamento più complesso.', vision: 'Questa fase integra le risorse sviluppate per consolidare una visione completa.' },
  pt: { low: 'Esta etapa requer principalmente tempo: observar, compreender e criar espaço constante para o modo.', medium: 'Esta etapa requer tempo e energia: manter uma prática ativa, tomar decisões e preservar a continuidade.', high: 'Esta etapa requer tempo, energia e dinheiro: alocar recursos, ampliar capacidades e sustentar uma operação mais complexa.', vision: 'Esta etapa integra os recursos desenvolvidos para consolidar uma visão completa.' },
  ru: { low: 'На этом этапе в первую очередь требуется время: наблюдать, понимать и постоянно оставлять место для режима.', medium: 'На этом этапе нужны время и энергия: поддерживать активную практику, принимать решения и сохранять непрерывность.', high: 'На этом этапе нужны время, энергия и деньги: распределять ресурсы, расширять возможности и поддерживать более сложную работу.', vision: 'Этот этап объединяет развитые ресурсы для формирования целостного видения.' },
  de: { low: 'Diese Phase erfordert vor allem Zeit: beobachten, verstehen und dauerhaft Raum für den Modus schaffen.', medium: 'Diese Phase erfordert Zeit und Energie: aktive Praxis aufrechterhalten, Entscheidungen treffen und Kontinuität sichern.', high: 'Diese Phase erfordert Zeit, Energie und Geld: Ressourcen einsetzen, Fähigkeiten erweitern und komplexere Abläufe tragen.', vision: 'Diese Phase verbindet die entwickelten Ressourcen zu einer vollständigen Vision.' },
  fr: { low: 'Cette étape demande surtout du temps : observer, comprendre et créer un espace régulier pour le mode.', medium: 'Cette étape demande du temps et de l’énergie : maintenir une pratique active, décider et assurer la continuité.', high: 'Cette étape demande du temps, de l’énergie et de l’argent : allouer des ressources, élargir les capacités et soutenir une organisation plus complexe.', vision: 'Cette étape intègre les ressources développées pour consolider une vision complète.' },
  da: { low: 'Dette trin kræver primært tid: at observere, forstå og skabe vedvarende plads til tilstanden.', medium: 'Dette trin kræver tid og energi: at fastholde en aktiv praksis, træffe beslutninger og bevare kontinuiteten.', high: 'Dette trin kræver tid, energi og penge: at fordele ressourcer, udvide evner og opretholde en mere kompleks drift.', vision: 'Dette trin samler de udviklede ressourcer til en samlet vision.' },
};
const activityEntryLabel: Record<ActivityEntry, string> = { custom: 'Agregar actividad', pool: 'Pool de actividades', ai: 'Modo IA' };
const poolActivityTitles: Record<string, string[]> = {
  fisico: ['Registrar durante tres días cómo se siente tu cuerpo al despertar.', 'Anotar qué alimentos te dan energía y cuáles te apagan.', 'Elegir una señal corporal que quieras escuchar con más atención.', 'Caminar 20 minutos tres veces esta semana y registrar tu respiración.', 'Preparar dos comidas sencillas que apoyen tu energía diaria.', 'Crear una rutina semanal de movimiento y descanso que puedas sostener.', 'Invertir en una evaluación, clase o herramienta que impulse tu salud.', 'Diseñar un sistema medible de entrenamiento, nutrición y recuperación.', 'Trabajar con un especialista para convertir tu bienestar en una práctica maestra.'],
  intelectual: ['Anotar qué temas despiertan tu curiosidad hoy.', 'Elegir un libro, podcast o curso breve para explorar esta semana.', 'Definir una pregunta intelectual que quieras responder en 30 días.', 'Leer 20 minutos y escribir tres ideas que puedas explicar con tus palabras.', 'Practicar dos sesiones semanales de lectura, escritura o resolución de problemas.', 'Participar en un club gratuito de ajedrez, lectura o conversación.', 'Inscribirte en un workshop o curso que eleve tu siguiente capacidad.', 'Construir un sistema de estudio con métricas, revisión y bloques protegidos.', 'Convertir tu conocimiento en una mentoría, publicación o programa para otros.'],
  emocional: ['Nombrar qué emociones aparecen con más frecuencia en tu día.', 'Registrar durante una semana qué situaciones cambian tu estado interno.', 'Elegir una emoción y definir qué necesitas aprender de ella.', 'Practicar una pausa de respiración antes de responder en una conversación difícil.', 'Crear un ritual semanal para procesar lo que sientes sin juzgarlo.', 'Conversar con alguien de confianza usando escucha y límites claros.', 'Invertir en terapia, un taller o una práctica guiada de regulación emocional.', 'Diseñar un sistema de seguimiento para reconocer detonantes y respuestas.', 'Acompañar a otros desde tu experiencia sin dejar de cuidar tus propios límites.'],
  arquetipico: ['Escribir tres rasgos que hoy sientes auténticamente tuyos.', 'Observar durante una semana cuándo actúas para agradar o esconderte.', 'Elegir un principio que quieras convertir en brújula personal.', 'Cumplir una pequeña promesa que te hayas hecho y registrar cómo cambia tu confianza.', 'Practicar una decisión coherente con tus valores cada semana.', 'Pedir retroalimentación honesta a alguien que conozca tu forma de actuar.', 'Invertir en un proceso de identidad, liderazgo o desarrollo personal.', 'Crear un ritual de revisión para alinear decisiones, valores y comportamiento.', 'Convertir tu coherencia en una influencia que ayude a otros a vivir con intención.'],
  espiritual: ['Observar qué momentos del día te conectan con sentido.', 'Registrar tres preguntas sobre propósito, fe o trascendencia.', 'Elegir una práctica breve de silencio, oración o contemplación.', 'Reservar 15 minutos diarios para una práctica espiritual sin pantalla.', 'Participar semanalmente en una comunidad o espacio de conexión.', 'Crear un ritual personal para agradecer, servir o volver a tu centro.', 'Invertir en un retiro, guía o formación que profundice tu camino.', 'Diseñar un sistema de práctica espiritual que acompañe tus decisiones.', 'Compartir una visión de sentido que inspire servicio y comunidad.'],
  romantico: ['Escribir qué significa para ti sentirte amado y presente.', 'Observar qué patrones repites al acercarte o alejarte de alguien.', 'Definir una cualidad que quieras cultivar en tus vínculos amorosos.', 'Proponer una cita sin pantallas y escuchar con curiosidad genuina.', 'Crear un ritual semanal de conexión, cuidado y conversación honesta.', 'Practicar una conversación sobre deseos, límites y acuerdos.', 'Invertir en terapia de pareja, un taller o una experiencia significativa.', 'Diseñar un sistema de cuidado que proteja tiempo, intimidad y reparación.', 'Convertir tu relación en una fuente consciente de crecimiento compartido.'],
  familiar: ['Reconocer qué vínculo familiar necesita hoy más presencia.', 'Registrar qué historias familiares influyen en tus decisiones actuales.', 'Elegir una forma concreta de acercarte o poner un límite sano.', 'Llamar a un familiar y tener una conversación sin multitarea.', 'Establecer un ritual semanal de convivencia o apoyo mutuo.', 'Organizar una actividad familiar que reúna a distintas generaciones.', 'Invertir en una experiencia, mediación o espacio que repare un vínculo.', 'Crear acuerdos familiares claros para cuidar tiempo, responsabilidades y límites.', 'Convertir tu historia familiar en una fuente de pertenencia y aprendizaje.'],
  social: ['Mapear quiénes forman hoy tu red de apoyo.', 'Anotar qué tipo de amistad o comunidad te gustaría cultivar.', 'Elegir una persona con quien quieras reconectar.', 'Enviar un mensaje sincero y proponer una caminata o café.', 'Participar cada semana en una actividad grupal que disfrutes.', 'Ofrecer una habilidad o ayuda concreta a alguien de tu comunidad.', 'Invertir en una membresía, evento o formación que amplíe tu red.', 'Diseñar un sistema de encuentros, colaboración y reciprocidad.', 'Crear una comunidad donde otros también puedan encontrar apoyo.'],
  financiero: ['Observar durante una semana en qué se va tu dinero.', 'Clasificar tus gastos y notar qué compras reflejan tus prioridades.', 'Definir una meta financiera pequeña y concreta para este mes.', 'Registrar todos tus gastos durante siete días sin cambiar nada todavía.', 'Crear un presupuesto semanal y revisarlo en una fecha fija.', 'Automatizar un ahorro pequeño y revisar tus decisiones con calma.', 'Invertir en educación financiera, asesoría o una herramienta de control.', 'Construir un sistema de ahorro, inversión y revisión de riesgos.', 'Usar tu prosperidad para crear opciones, apoyar a otros y dejar legado.'],
  profesional: ['Escribir qué parte de tu trabajo te da más energía.', 'Identificar qué habilidad profesional está pidiendo tu siguiente etapa.', 'Definir un resultado laboral que quieras alcanzar en 30 días.', 'Bloquear dos sesiones de trabajo profundo para una prioridad concreta.', 'Pedir retroalimentación y aplicar un ajuste visible a tu trabajo.', 'Crear un portafolio, proyecto o caso que muestre tu mejor capacidad.', 'Invertir en una certificación, mentoría o herramienta estratégica.', 'Diseñar un sistema de prioridades, métricas y delegación.', 'Convertir tu experiencia en liderazgo, innovación y oportunidades para otros.'],
  ludico: ['Anotar qué actividades te devuelven ligereza y energía.', 'Observar durante una semana cuándo descansas de verdad.', 'Elegir una experiencia sencilla que quieras recuperar.', 'Reservar una hora sin productividad para jugar, crear o pasear.', 'Crear un ritual semanal de ocio que proteja tu recarga.', 'Invitar a alguien a una actividad que despierte tu curiosidad.', 'Invertir en una experiencia, equipo o clase que amplíe tu disfrute.', 'Diseñar un sistema de descanso, juego y exploración sostenible.', 'Hacer de tu capacidad de disfrutar una fuente de creatividad compartida.'],
  visionario: ['Escribir una imagen de la vida que te gustaría estar viviendo.', 'Registrar qué futuro te emociona y qué futuro ya no quieres repetir.', 'Elegir una meta de 90 días que te acerque a esa visión.', 'Convertir tu meta en una acción semanal con fecha y evidencia.', 'Revisar cada semana tus avances y ajustar el rumbo.', 'Compartir tu visión con alguien que pueda ayudarte a sostenerla.', 'Invertir recursos en una herramienta, mentoría o experiencia de expansión.', 'Construir un tablero de metas, métricas y decisiones estratégicas.', 'Convertir tu visión en legado, dirección y posibilidades para otros.'],
};
const poolRecommendationTemplates = [
  (base: string) => base,
  (base: string) => `Observar un momento concreto relacionado con esto: ${base.toLowerCase()}`,
  (base: string) => `Convertir esta intención en una nota breve: ${base.toLowerCase()}`,
  (base: string) => `Elegir una señal de avance y practicarla a partir de esto: ${base.toLowerCase()}`,
  (base: string) => `Probar una versión de 10 minutos de esta práctica: ${base.toLowerCase()}`,
  (base: string) => `Compartir este propósito con alguien de confianza y comenzar así: ${base.toLowerCase()}`,
  (base: string) => `Repetir esta práctica en dos momentos distintos: ${base.toLowerCase()}`,
  (base: string) => `Registrar qué funcionó después de realizar esto: ${base.toLowerCase()}`,
  (base: string) => `Ajustar esta práctica a tu semana real: ${base.toLowerCase()}`,
  (base: string) => `Cerrar la semana con una reflexión sobre esto: ${base.toLowerCase()}`,
];
const getPoolActivities = (modeKey: string, level: number): PoolActivity[] => {
  const title = poolActivityTitles[modeKey]?.[level] ?? 'Definir una práctica concreta para este modo.';
  const effort = effortByLevel[level];
  return poolRecommendationTemplates.map((template, index) => ({
    title: template(title),
    description: index === 0 ? effortDescription[effort] : `Define evidencia de avance, un ajuste y el siguiente paso. ${effortDescription[effort]}.`,
  }));
};
const localizedActivityActions: Record<Language, string[]> = {
  es: ['Observar una señal cotidiana', 'Registrar lo que ocurre durante una semana', 'Elegir una intención concreta', 'Practicar durante 20 minutos', 'Crear un ritual semanal', 'Compartir la práctica con alguien', 'Invertir en una guía o herramienta', 'Diseñar un sistema de seguimiento', 'Convertir la práctica en una contribución', 'Revisar el aprendizaje y ajustar el rumbo'],
  en: ['Notice one daily signal', 'Track what happens for a week', 'Choose one concrete intention', 'Practice for 20 minutes', 'Create a weekly ritual', 'Share the practice with someone', 'Invest in guidance or a tool', 'Design a tracking system', 'Turn the practice into a contribution', 'Review the learning and adjust direction'],
  zh: ['观察一个日常信号', '记录一周发生的变化', '选择一个具体意图', '练习二十分钟', '建立每周仪式', '与他人分享这项实践', '投入于指导或工具', '设计一个追踪系统', '把实践转化为贡献', '回顾学习并调整方向'],
  hi: ['एक दैनिक संकेत देखें', 'एक सप्ताह की घटनाएं दर्ज करें', 'एक ठोस इरादा चुनें', '20 मिनट अभ्यास करें', 'साप्ताहिक रिवाज़ बनाएं', 'किसी के साथ अभ्यास साझा करें', 'मार्गदर्शन या उपकरण में निवेश करें', 'ट्रैकिंग प्रणाली बनाएं', 'अभ्यास को योगदान में बदलें', 'सीख की समीक्षा करके दिशा बदलें'],
  ar: ['لاحظ إشارة يومية', 'سجل ما يحدث خلال أسبوع', 'اختر نية واضحة', 'مارس لمدة عشرين دقيقة', 'أنشئ طقساً أسبوعياً', 'شارك الممارسة مع شخص', 'استثمر في إرشاد أو أداة', 'صمم نظام متابعة', 'حوّل الممارسة إلى مساهمة', 'راجع التعلم وعدّل الاتجاه'],
  it: ['Osserva un segnale quotidiano', 'Registra ciò che accade per una settimana', 'Scegli un’intenzione concreta', 'Pratica per venti minuti', 'Crea un rituale settimanale', 'Condividi la pratica con qualcuno', 'Investi in una guida o uno strumento', 'Progetta un sistema di monitoraggio', 'Trasforma la pratica in un contributo', 'Rivedi l’apprendimento e correggi la rotta'],
  pt: ['Observe um sinal cotidiano', 'Registre o que acontece por uma semana', 'Escolha uma intenção concreta', 'Pratique por vinte minutos', 'Crie um ritual semanal', 'Compartilhe a prática com alguém', 'Invista em orientação ou ferramenta', 'Crie um sistema de acompanhamento', 'Transforme a prática em contribuição', 'Revise o aprendizado e ajuste o rumo'],
  ru: ['Заметьте ежедневный сигнал', 'Записывайте происходящее неделю', 'Выберите конкретное намерение', 'Практикуйтесь двадцать минут', 'Создайте еженедельный ритуал', 'Поделитесь практикой с кем-то', 'Вложитесь в наставника или инструмент', 'Создайте систему отслеживания', 'Превратите практику в вклад', 'Пересмотрите опыт и скорректируйте путь'],
  de: ['Beobachte ein tägliches Signal', 'Halte eine Woche lang fest, was geschieht', 'Wähle eine konkrete Absicht', 'Übe zwanzig Minuten', 'Schaffe ein wöchentliches Ritual', 'Teile die Praxis mit jemandem', 'Investiere in Anleitung oder ein Werkzeug', 'Entwirf ein Nachverfolgungssystem', 'Mache die Praxis zu einem Beitrag', 'Prüfe das Lernen und passe den Kurs an'],
  fr: ['Observez un signal quotidien', 'Notez ce qui se passe pendant une semaine', 'Choisissez une intention concrète', 'Pratiquez vingt minutes', 'Créez un rituel hebdomadaire', 'Partagez la pratique avec quelqu’un', 'Investissez dans un guide ou un outil', 'Concevez un système de suivi', 'Transformez la pratique en contribution', 'Relisez l’apprentissage et ajustez la direction'],
  da: ['Læg mærke til et dagligt signal', 'Registrer hvad der sker i en uge', 'Vælg en konkret intention', 'Øv dig i tyve minutter', 'Skab et ugentligt ritual', 'Del praksissen med nogen', 'Invester i vejledning eller et værktøj', 'Design et system til opfølgning', 'Gør praksissen til et bidrag', 'Gennemgå læringen og juster retningen'],
};
const localizedPoolActivities = (modeKey: string, level: number, language: Language): PoolActivity[] => {
  if (language === 'es') return getPoolActivities(modeKey, level);
  const actions = localizedActivityActions[language];
  return actions.map((action, index) => ({
    title: action,
    description: `${localizedLevelNames[language][level]} · ${index === 0 ? 'Tiempo' : index < 6 ? 'Tiempo + Energía' : 'Tiempo + Energía + Inversión'}`,
  }));
};
const insightAuthors = [
  ['Sofía Méndez', 'Ciudad de Guatemala', 'América Central', 'Español'],
  ['Marcus Lee', 'Austin · Remote', 'América del Norte', 'English'],
  ['Elena Costa', 'Lisboa · Remote', 'Europa', 'Português'],
  ['Diego Ríos', 'San José · Remote', 'América Central', 'Español'],
  ['Nadia Chen', 'Vancouver · Remote', 'América del Norte', '中文 · Chino'],
  ['Camila Torres', 'Bogotá · Remote', 'América del Sur', 'Español'],
] as const;
const insightAuthorBios: Record<string, string> = {
  'Sofía Méndez': 'Cultivo liderazgo con propósito para que el trabajo también sea un espacio de presencia y coherencia.',
  'Marcus Lee': 'Diseño sistemas financieros que convierten claridad, libertad y visión en decisiones cotidianas.',
  'Elena Costa': 'Acompaño conversaciones honestas para que los vínculos puedan crecer con cuidado y límites sanos.',
  'Diego Ríos': 'Creo en los pequeños rituales sostenidos que transforman una intención en una forma de vida.',
  'Nadia Chen': 'Exploro cómo aprender, conectar y crear puede abrir nuevas posibilidades para una vida más amplia.',
  'Camila Torres': 'Cultivo comunidad y movimiento para que cada persona encuentre una ruta propia de expansión.',
};
const insightAuthorBadges: Record<string, string[]> = {
  'Sofía Méndez': ['level-up', 'three-moves'],
  'Marcus Lee': ['preset-maker', 'global-eye'],
  'Elena Costa': ['first-step', 'full-spectrum'],
  'Diego Ríos': ['three-moves', 'visionary'],
  'Nadia Chen': ['level-up', 'skin-shift'],
  'Camila Torres': ['first-step', 'global-eye'],
};
const makePreset = (seed: number) => Object.fromEntries(modes.map((mode, index) => [mode.key, Math.min(9, Math.max(1, ((index * 2 + seed) % 9) + 1))]));
const makeSpecialistPreset = (modeKey: string, seed: number) => ({
  ...makePreset(seed),
  [modeKey]: 9,
});
// An insight is a practice that helped someone reach the destination level.
// The author must therefore be at least one level ahead of the activity's start.
const makeInsightPreset = (modeKey: string, activityLevel: number, seed: number) => ({
  ...makePreset(seed),
  [modeKey]: Math.min(9, activityLevel + 1),
});
const globalInsightActivities = modes.flatMap((mode) => journeyLevels.filter((level) => level < 9).map((level) => {
  const authorIndex = (modes.indexOf(mode) * 9 + level) % insightAuthors.length;
  const author = insightAuthors[authorIndex];
  return { variant: 0, modeKey: mode.key, level, activity: getPoolActivities(mode.key, level)[0].title, author: author[0], location: author[1], continent: author[2], language: author[3], bio: insightAuthorBios[author[0]], badges: insightAuthorBadges[author[0]] ?? [], presetName: `${author[0]} · Ruta de presencia`, preset: makeInsightPreset(mode.key, level, authorIndex + level) };
}));
type GlobalInsight = (typeof globalInsightActivities)[number];
const globalInsightVariantsByKey: Record<string, GlobalInsight[]> = {};
modes.forEach((mode, modeIndex) => {
  journeyLevels.filter((level) => level < 9).forEach((level) => {
    const key = `${mode.key}-${level}`;
    globalInsightVariantsByKey[key] = Array.from({ length: 12 }, (_, variant) => {
      const authorIndex = (modeIndex * 9 + level + variant) % insightAuthors.length;
      const author = insightAuthors[authorIndex];
      const activities = getPoolActivities(mode.key, level);
      return { variant, modeKey: mode.key, level, activity: activities[variant % activities.length].title, author: author[0], location: author[1], continent: author[2], language: author[3], bio: insightAuthorBios[author[0]], badges: insightAuthorBadges[author[0]] ?? [], presetName: `${author[0]} · Ruta de presencia`, preset: makeInsightPreset(mode.key, level, authorIndex + level + variant) };
    });
  });
});
type Specialist = { name: string; modeKey: string; specialty: string; location: string; continent: string; language: string; match: string; trajectory: string; message: string; presetName: string; modeLevels: Record<string, number> };
const specialistLanguages = ['Español', 'English', '中文', 'हिन्दी', 'العربية', 'Italiano', 'Português', 'Русский', 'Deutsch', 'Français', 'Dansk'];
const specialistContinents = ['América del Norte', 'América Central', 'América del Sur', 'Europa', 'Asia', 'África', 'Oceanía'];
const specialists: Specialist[] = [
  { name: 'Sofía Méndez', modeKey: 'profesional', specialty: 'Estrategia y liderazgo', location: 'Ciudad de Guatemala', continent: 'América Central', language: 'Español', match: '98%', trajectory: '12 años acompañando equipos de alto crecimiento y procesos de liderazgo consciente.', message: 'Tu carrera también puede ser un lugar de coherencia, no solo de rendimiento.', presetName: 'Liderazgo con propósito', modeLevels: makeSpecialistPreset('profesional', 4) },
  { name: 'Marcus Lee', modeKey: 'financiero', specialty: 'Patrimonio y decisiones', location: 'Austin · Remote', continent: 'América del Norte', language: 'English', match: '96%', trajectory: 'Economista y asesor de patrimonio; ha diseñado sistemas financieros para fundadores y familias.', message: 'El dinero se vuelve estratégico cuando deja de ser una fuente de ruido y empieza a servir a tu visión.', presetName: 'Patrimonio en expansión', modeLevels: makeSpecialistPreset('financiero', 6) },
  { name: 'Elena Costa', modeKey: 'emocional', specialty: 'Vínculos y regulación', location: 'Lisboa · Remote', continent: 'Europa', language: 'Português', match: '99%', trajectory: 'Psicoterapeuta y facilitadora de vínculos; trabaja con regulación, límites y conversaciones difíciles.', message: 'La presencia emocional se cultiva en lo pequeño: una pausa, una pregunta y la voluntad de escuchar.', presetName: 'Vínculos conscientes', modeLevels: makeSpecialistPreset('emocional', 2) },
  { name: 'Wei Zhang', modeKey: 'intelectual', specialty: 'Aprendizaje y pensamiento', location: 'Shanghai', continent: 'Asia', language: '中文', match: '97%', trajectory: 'Investigador y diseñador de hábitos de aprendizaje para equipos creativos.', message: 'La curiosidad sostenida convierte cada pregunta en una puerta.', presetName: 'Mente en expansión', modeLevels: makeSpecialistPreset('intelectual', 3) },
  { name: 'Ananya Sharma', modeKey: 'espiritual', specialty: 'Propósito y contemplación', location: 'Mumbai', continent: 'Asia', language: 'हिन्दी', match: '95%', trajectory: 'Facilitadora de prácticas contemplativas y rituales de propósito.', message: 'Una práctica pequeña puede devolverle dirección a un día entero.', presetName: 'Presencia esencial', modeLevels: makeSpecialistPreset('espiritual', 5) },
  { name: 'Layla Haddad', modeKey: 'familiar', specialty: 'Familia y raíces', location: 'Amán', continent: 'Asia', language: 'العربية', match: '94%', trajectory: 'Mediadora familiar especializada en conversaciones entre generaciones.', message: 'Cuidar las raíces también puede abrir espacio para crecer.', presetName: 'Raíces vivas', modeLevels: makeSpecialistPreset('familiar', 7) },
  { name: 'Luca Bianchi', modeKey: 'romantico', specialty: 'Vínculos y conexión', location: 'Milán', continent: 'Europa', language: 'Italiano', match: '96%', trajectory: 'Terapeuta de pareja y educador en intimidad consciente.', message: 'La conexión se diseña con presencia, honestidad y tiempo compartido.', presetName: 'Vínculo presente', modeLevels: makeSpecialistPreset('romantico', 4) },
  { name: 'Natalia Petrova', modeKey: 'arquetipico', specialty: 'Identidad y narrativa', location: 'Moscú', continent: 'Europa', language: 'Русский', match: '93%', trajectory: 'Mentora de identidad y narrativa personal para etapas de transición.', message: 'Nombrar la historia que eliges vivir cambia la forma de caminarla.', presetName: 'Arquetipos en movimiento', modeLevels: makeSpecialistPreset('arquetipico', 6) },
  { name: 'Hannah Vogel', modeKey: 'social', specialty: 'Comunidad y colaboración', location: 'Berlín', continent: 'Europa', language: 'Deutsch', match: '95%', trajectory: 'Diseñadora de comunidades y redes de apoyo para proyectos con propósito.', message: 'Una red sana multiplica la claridad y también la capacidad de actuar.', presetName: 'Comunidad intencional', modeLevels: makeSpecialistPreset('social', 3) },
  { name: 'Camille Laurent', modeKey: 'fisico', specialty: 'Salud y energía', location: 'París', continent: 'Europa', language: 'Français', match: '97%', trajectory: 'Especialista en hábitos corporales, descanso y energía sostenible.', message: 'Tu cuerpo no es una tarea pendiente: es el lugar desde donde empiezas.', presetName: 'Energía sostenible', modeLevels: makeSpecialistPreset('fisico', 2) },
  { name: 'Mikkel Sørensen', modeKey: 'ludico', specialty: 'Juego y creatividad', location: 'Copenhague', continent: 'Europa', language: 'Dansk', match: '92%', trajectory: 'Diseñador de experiencias de juego para recuperar curiosidad y descanso.', message: 'El juego no es una pausa del desarrollo; también es una forma de desarrollarte.', presetName: 'Curiosidad activa', modeLevels: makeSpecialistPreset('ludico', 8) },
];
const specialistFirstNames = ['Amara', 'Bruno', 'Clara', 'Dario', 'Eva', 'Felix', 'Giulia', 'Hugo', 'Iris', 'Jonas', 'Kira', 'León'];
const specialistLastNames = ['Rivera', 'Morgan', 'Navarro', 'Silva', 'Khan', 'Bennett', 'Moreau', 'Tanaka', 'Okafor', 'Petrov', 'Nielsen', 'Santos'];
const specialistSpecialties: Record<string, string> = {
  fisico: 'Hábitos, descanso y energía', intelectual: 'Aprendizaje y pensamiento', emocional: 'Regulación y bienestar', arquetipico: 'Identidad y narrativa', espiritual: 'Propósito y contemplación', romantico: 'Vínculos y conexión', familiar: 'Familia y raíces', social: 'Comunidad y colaboración', financiero: 'Patrimonio y decisiones', profesional: 'Estrategia y liderazgo', ludico: 'Creatividad y disfrute', visionario: 'Visión y planificación',
};
const specialistLocations: Record<string, string[]> = {
  'América del Norte': ['Toronto · Remote', 'Austin · Remote'], 'América Central': ['Ciudad de Guatemala', 'San José · Remote'], 'América del Sur': ['Bogotá · Remote', 'Santiago · Remote'], Europa: ['Ámsterdam · Remote', 'Praga · Remote'], Asia: ['Seúl · Remote', 'Singapur · Remote'], África: ['Nairobi · Remote', 'Ciudad del Cabo · Remote'], Oceanía: ['Melbourne · Remote', 'Auckland · Remote'],
};
const generatedSpecialists: Specialist[] = modes.flatMap((mode, modeIndex) => specialistLanguages.flatMap((language, languageIndex) => specialistContinents.map((continent, continentIndex) => {
  const seed = modeIndex * specialistLanguages.length * specialistContinents.length + languageIndex * specialistContinents.length + continentIndex;
  const name = `${specialistFirstNames[seed % specialistFirstNames.length]} ${specialistLastNames[Math.floor(seed / specialistFirstNames.length) % specialistLastNames.length]} · ${mode.roman}`;
  const locationOptions = specialistLocations[continent];
  const location = locationOptions[seed % locationOptions.length];
  return { name, modeKey: mode.key, specialty: specialistSpecialties[mode.key], location, continent, language, match: `${91 + (seed % 9)}%`, trajectory: `Profesional verificado que acompaña procesos de ${mode.shortName.toLowerCase()} con prácticas medibles y acompañamiento cercano.`, message: `Cada avance en ${mode.shortName.toLowerCase()} empieza con una práctica que puedas sostener y revisar.`, presetName: `${mode.shortName} en equilibrio`, modeLevels: makeSpecialistPreset(mode.key, seed % 9) };
})));
const specialistDirectory = [...specialists, ...generatedSpecialists];
const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
type Language = AppLanguage;
const languageNames: Record<Language, string> = {
  es: 'Español', en: 'English', zh: '中文', hi: 'हिन्दी', ar: 'العربية',
  it: 'Italiano', pt: 'Português', ru: 'Русский', de: 'Deutsch', fr: 'Français', da: 'Dansk',
};
const translations: Record<Language, Record<string, string>> = {
  es: { enter: 'ENTRAR', login: 'Iniciar sesión', createAccount: 'Crear una cuenta', logout: 'Cerrar sesión', premium: 'Modos Premium', welcome: 'Bienvenido a tu mapa de vida', dashboard: 'Dashboard', customize: 'Personalizar', pressToEnter: 'Presiona para entrar', chooseLanguage: 'Idioma', journey: 'Journey del Modo', back: 'Volver', activity: 'Actividad', askAI: 'Consultar al Modo IA', useActivity: 'Usar esta actividad', context: 'Tu contexto para la IA', plans: 'Elige tu siguiente nivel', freeAccess: 'Continuar como invitado', password: 'Contraseña', email: 'Correo electrónico', name: 'Nombre', home: 'Inicio', levels: 'Niveles', modes: 'Modos', save: 'Guardar', load: 'Cargar', remove: 'Eliminar', close: 'Cerrar', viewProfile: 'Ver perfil', next: 'Siguiente', previous: 'Anterior', recommendations: 'Recomendaciones', filters: 'Filtros', skins: 'Skins', analyze: 'Analizar actividad', useInMap: 'Guardar en mi mapa' },
  en: { enter: 'ENTER', login: 'Sign in', createAccount: 'Create an account', logout: 'Log out', premium: 'Premium Modes', welcome: 'Welcome to your life map', dashboard: 'Dashboard', customize: 'Customize', pressToEnter: 'Press to enter', chooseLanguage: 'Language', journey: 'Mode Journey', back: 'Back', activity: 'Activity', askAI: 'Ask Mode AI', useActivity: 'Use this activity', context: 'Your context for AI', plans: 'Choose your next level', freeAccess: 'Continue as guest', password: 'Password', email: 'Email', name: 'Name', home: 'Home', levels: 'Levels', modes: 'Modes', save: 'Save', load: 'Load', remove: 'Delete', close: 'Close', viewProfile: 'View profile', next: 'Next', previous: 'Previous', recommendations: 'Recommendations', filters: 'Filters', skins: 'Skins', analyze: 'Analyze activity', useInMap: 'Save to my map' },
  zh: { enter: '进入', login: '登录', createAccount: '创建账户', logout: '退出登录', premium: '高级模式', welcome: '欢迎来到你的人生地图', dashboard: '仪表盘', customize: '自定义', pressToEnter: '按此进入', chooseLanguage: '语言', journey: '模式旅程', back: '返回', activity: '活动', askAI: '咨询模式 AI', useActivity: '使用此活动', context: '你的 AI 背景', plans: '选择你的下一阶段', freeAccess: '以访客身份继续', password: '密码', email: '电子邮箱', name: '姓名', home: '首页', levels: '等级', modes: '模式', save: '保存', load: '加载', remove: '删除', close: '关闭', viewProfile: '查看资料', next: '下一个', previous: '上一个', recommendations: '推荐', filters: '筛选', skins: '皮肤', analyze: '分析活动', useInMap: '保存到我的地图' },
  hi: { enter: 'प्रवेश', login: 'साइन इन', createAccount: 'खाता बनाएं', logout: 'साइन आउट', premium: 'प्रीमियम मोड', welcome: 'आपके जीवन मानचित्र में आपका स्वागत है', dashboard: 'डैशबोर्ड', customize: 'अनुकूलित करें', pressToEnter: 'प्रवेश के लिए दबाएं', chooseLanguage: 'भाषा', journey: 'मोड यात्रा', back: 'वापस', activity: 'गतिविधि', askAI: 'मोड AI से पूछें', useActivity: 'इस गतिविधि का उपयोग करें', context: 'AI के लिए आपका संदर्भ', plans: 'अपना अगला स्तर चुनें', freeAccess: 'अतिथि के रूप में जारी रखें', password: 'पासवर्ड', email: 'ईमेल', name: 'नाम', home: 'होम', levels: 'स्तर', modes: 'मोड', save: 'सहेजें', load: 'लोड करें', remove: 'हटाएं', close: 'बंद करें', viewProfile: 'प्रोफ़ाइल देखें', next: 'अगला', previous: 'पिछला', recommendations: 'सुझाव', filters: 'फ़िल्टर', skins: 'स्किन', analyze: 'गतिविधि का विश्लेषण करें', useInMap: 'मेरे मानचित्र में सहेजें' },
  ar: { enter: 'دخول', login: 'تسجيل الدخول', createAccount: 'إنشاء حساب', logout: 'تسجيل الخروج', premium: 'الأوضاع المميزة', welcome: 'مرحباً بك في خريطة حياتك', dashboard: 'لوحة التحكم', customize: 'تخصيص', pressToEnter: 'اضغط للدخول', chooseLanguage: 'اللغة', journey: 'رحلة الوضع', back: 'رجوع', activity: 'النشاط', askAI: 'استشر وضع الذكاء الاصطناعي', useActivity: 'استخدم هذا النشاط', context: 'سياقك للذكاء الاصطناعي', plans: 'اختر مستواك التالي', freeAccess: 'المتابعة كزائر', password: 'كلمة المرور', email: 'البريد الإلكتروني', name: 'الاسم', home: 'الرئيسية', levels: 'المستويات', modes: 'الأوضاع', save: 'حفظ', load: 'تحميل', remove: 'حذف', close: 'إغلاق', viewProfile: 'عرض الملف', next: 'التالي', previous: 'السابق', recommendations: 'التوصيات', filters: 'الفلاتر', skins: 'الواجهات', analyze: 'تحليل النشاط', useInMap: 'حفظ في خريطتي' },
  it: { enter: 'ENTRA', login: 'Accedi', createAccount: 'Crea un account', logout: 'Esci', premium: 'Modalità Premium', welcome: 'Benvenuto nella tua mappa della vita', dashboard: 'Dashboard', customize: 'Personalizza', pressToEnter: 'Premi per entrare', chooseLanguage: 'Lingua', journey: 'Percorso della modalità', back: 'Indietro', activity: 'Attività', askAI: 'Consulta Modo IA', useActivity: 'Usa questa attività', context: 'Il tuo contesto per l’IA', plans: 'Scegli il tuo prossimo livello', freeAccess: 'Continua come ospite', password: 'Password', email: 'E-mail', name: 'Nome', home: 'Home', levels: 'Livelli', modes: 'Modalità', save: 'Salva', load: 'Carica', remove: 'Elimina', close: 'Chiudi', viewProfile: 'Vedi profilo', next: 'Successivo', previous: 'Precedente', recommendations: 'Raccomandazioni', filters: 'Filtri', skins: 'Skin', analyze: 'Analizza attività', useInMap: 'Salva nella mia mappa' },
  pt: { enter: 'ENTRAR', login: 'Entrar', createAccount: 'Criar conta', logout: 'Sair', premium: 'Modos Premium', welcome: 'Bem-vindo ao seu mapa de vida', dashboard: 'Painel', customize: 'Personalizar', pressToEnter: 'Pressione para entrar', chooseLanguage: 'Idioma', journey: 'Jornada do Modo', back: 'Voltar', activity: 'Atividade', askAI: 'Consultar o Modo IA', useActivity: 'Usar esta atividade', context: 'Seu contexto para a IA', plans: 'Escolha seu próximo nível', freeAccess: 'Continuar como visitante', password: 'Senha', email: 'E-mail', name: 'Nome', home: 'Início', levels: 'Níveis', modes: 'Modos', save: 'Salvar', load: 'Carregar', remove: 'Excluir', close: 'Fechar', viewProfile: 'Ver perfil', next: 'Próximo', previous: 'Anterior', recommendations: 'Recomendações', filters: 'Filtros', skins: 'Skins', analyze: 'Analisar atividade', useInMap: 'Salvar no meu mapa' },
  ru: { enter: 'ВОЙТИ', login: 'Войти', createAccount: 'Создать аккаунт', logout: 'Выйти', premium: 'Премиум-режимы', welcome: 'Добро пожаловать на вашу карту жизни', dashboard: 'Панель', customize: 'Настроить', pressToEnter: 'Нажмите для входа', chooseLanguage: 'Язык', journey: 'Путь режима', back: 'Назад', activity: 'Активность', askAI: 'Спросить у Mode AI', useActivity: 'Использовать активность', context: 'Ваш контекст для ИИ', plans: 'Выберите следующий уровень', freeAccess: 'Продолжить как гость', password: 'Пароль', email: 'Электронная почта', name: 'Имя', home: 'Главная', levels: 'Уровни', modes: 'Режимы', save: 'Сохранить', load: 'Загрузить', remove: 'Удалить', close: 'Закрыть', viewProfile: 'Открыть профиль', next: 'Далее', previous: 'Назад', recommendations: 'Рекомендации', filters: 'Фильтры', skins: 'Скины', analyze: 'Анализировать активность', useInMap: 'Сохранить на карту' },
  de: { enter: 'EINTRETEN', login: 'Anmelden', createAccount: 'Konto erstellen', logout: 'Abmelden', premium: 'Premium-Modi', welcome: 'Willkommen auf deiner Lebenskarte', dashboard: 'Dashboard', customize: 'Anpassen', pressToEnter: 'Zum Eintreten drücken', chooseLanguage: 'Sprache', journey: 'Modus-Journey', back: 'Zurück', activity: 'Aktivität', askAI: 'Mode AI fragen', useActivity: 'Diese Aktivität nutzen', context: 'Dein Kontext für die KI', plans: 'Wähle deine nächste Stufe', freeAccess: 'Als Gast fortfahren', password: 'Passwort', email: 'E-Mail', name: 'Name', home: 'Startseite', levels: 'Stufen', modes: 'Modi', save: 'Speichern', load: 'Laden', remove: 'Löschen', close: 'Schließen', viewProfile: 'Profil ansehen', next: 'Weiter', previous: 'Zurück', recommendations: 'Empfehlungen', filters: 'Filter', skins: 'Skins', analyze: 'Aktivität analysieren', useInMap: 'Auf meiner Karte speichern' },
  fr: { enter: 'ENTRER', login: 'Se connecter', createAccount: 'Créer un compte', logout: 'Se déconnecter', premium: 'Modes Premium', welcome: 'Bienvenue sur votre carte de vie', dashboard: 'Tableau de bord', customize: 'Personnaliser', pressToEnter: 'Appuyez pour entrer', chooseLanguage: 'Langue', journey: 'Parcours du mode', back: 'Retour', activity: 'Activité', askAI: 'Consulter le Mode IA', useActivity: 'Utiliser cette activité', context: 'Votre contexte pour l’IA', plans: 'Choisissez votre prochain niveau', freeAccess: 'Continuer comme invité', password: 'Mot de passe', email: 'E-mail', name: 'Nom', home: 'Accueil', levels: 'Niveaux', modes: 'Modes', save: 'Enregistrer', load: 'Charger', remove: 'Supprimer', close: 'Fermer', viewProfile: 'Voir le profil', next: 'Suivant', previous: 'Précédent', recommendations: 'Recommandations', filters: 'Filtres', skins: 'Skins', analyze: 'Analyser l’activité', useInMap: 'Enregistrer sur ma carte' },
  da: { enter: 'GÅ IND', login: 'Log ind', createAccount: 'Opret konto', logout: 'Log ud', premium: 'Premium-tilstande', welcome: 'Velkommen til dit livskort', dashboard: 'Dashboard', customize: 'Tilpas', pressToEnter: 'Tryk for at gå ind', chooseLanguage: 'Sprog', journey: 'Mode-rejse', back: 'Tilbage', activity: 'Aktivitet', askAI: 'Spørg Mode AI', useActivity: 'Brug denne aktivitet', context: 'Din kontekst til AI', plans: 'Vælg dit næste niveau', freeAccess: 'Fortsæt som gæst', password: 'Adgangskode', email: 'E-mail', name: 'Navn', home: 'Hjem', levels: 'Niveauer', modes: 'Modes', save: 'Gem', load: 'Indlæs', remove: 'Slet', close: 'Luk', viewProfile: 'Se profil', next: 'Næste', previous: 'Forrige', recommendations: 'Anbefalinger', filters: 'Filtre', skins: 'Skins', analyze: 'Analysér aktivitet', useInMap: 'Gem på mit kort' },
 };
const extraTranslations: Record<string, Record<Language, string>> = {
  dashboardTitle: { es: 'Tu centro de cultivo.', en: 'Your cultivation center.', zh: '你的培育中心。', hi: 'आपका विकास केंद्र।', ar: 'مركز تنميتك.', it: 'Il tuo centro di crescita.', pt: 'Seu centro de cultivo.', ru: 'Ваш центр развития.', de: 'Dein Entwicklungszentrum.', fr: 'Votre centre de développement.', da: 'Dit udviklingscenter.' },
  dashboardIntro: { es: 'Una lectura ejecutiva de tu progreso, tus focos de atención y los siguientes movimientos de tu mapa de vida.', en: 'An executive view of your progress, your areas of focus, and the next movements on your life map.', zh: '概览你的进展、关注重点以及人生地图上的下一步。', hi: 'आपकी प्रगति, ध्यान के क्षेत्रों और जीवन मानचित्र की अगली चालों का कार्यकारी अवलोकन।', ar: 'نظرة تنفيذية على تقدمك ومجالات تركيزك وخطواتك التالية على خريطة حياتك.', it: 'Una lettura esecutiva dei tuoi progressi, delle aree su cui concentrarti e dei prossimi passi sulla tua mappa della vita.', pt: 'Uma visão executiva do seu progresso, dos seus focos de atenção e dos próximos movimentos no seu mapa de vida.', ru: 'Обзор вашего прогресса, зон внимания и следующих шагов на карте жизни.', de: 'Ein Überblick über deinen Fortschritt, deine Fokusbereiche und die nächsten Schritte auf deiner Lebenskarte.', fr: 'Une lecture synthétique de vos progrès, de vos domaines d’attention et de vos prochaines étapes sur votre carte de vie.', da: 'Et overblik over din fremgang, dine fokusområder og de næste skridt på dit livskort.' },
  executiveSummary: { es: 'RESUMEN EJECUTIVO', en: 'EXECUTIVE SUMMARY', zh: '执行摘要', hi: 'कार्यकारी सारांश', ar: 'ملخص تنفيذي', it: 'RIEPILOGO ESECUTIVO', pt: 'RESUMO EXECUTIVO', ru: 'КРАТКИЙ ОБЗОР', de: 'EXECUTIVE SUMMARY', fr: 'RÉSUMÉ EXÉCUTIF', da: 'EXECUTIVE RESUMÉ' },
  progressAtGlance: { es: 'Tu progreso en una mirada', en: 'Your progress at a glance', zh: '一眼看见你的进展', hi: 'एक नज़र में आपकी प्रगति', ar: 'تقدمك في لمحة', it: 'I tuoi progressi a colpo d’occhio', pt: 'Seu progresso em um olhar', ru: 'Ваш прогресс одним взглядом', de: 'Dein Fortschritt auf einen Blick', fr: 'Votre progression en un coup d’œil', da: 'Dit fremskridt på et øjeblik' },
  currentScoreAria: { es: 'Nivel actual de Modo Cultiva: {level} de {max}', en: 'Current Modo Cultiva level: {level} out of {max}', zh: '当前 Modo Cultiva 等级：{level} / {max}', hi: 'वर्तमान Modo Cultiva स्तर: {max} में से {level}', ar: 'مستوى Modo Cultiva الحالي: {level} من {max}', it: 'Livello attuale di Modo Cultiva: {level} su {max}', pt: 'Nível atual do Modo Cultiva: {level} de {max}', ru: 'Текущий уровень Modo Cultiva: {level} из {max}', de: 'Aktuelles Modo-Cultiva-Level: {level} von {max}', fr: 'Niveau actuel de Modo Cultiva : {level} sur {max}', da: 'Aktuelt Modo Cultiva-niveau: {level} ud af {max}' },
  scoreMax: { es: 'Máx. {max}', en: 'Max {max}', zh: '最高 {max}', hi: 'अधिकतम {max}', ar: 'الحد الأقصى {max}', it: 'Max {max}', pt: 'Máx. {max}', ru: 'Макс. {max}', de: 'Max. {max}', fr: 'Max. {max}', da: 'Maks. {max}' },
  profileCultivaLevel: { es: 'Nivel Modo Cultiva', en: 'Modo Cultiva level', zh: 'Modo Cultiva 等级', hi: 'Modo Cultiva स्तर', ar: 'مستوى Modo Cultiva', it: 'Livello Modo Cultiva', pt: 'Nível Modo Cultiva', ru: 'Уровень Modo Cultiva', de: 'Modo-Cultiva-Level', fr: 'Niveau Modo Cultiva', da: 'Modo Cultiva-niveau' },
  strongestMode: { es: 'MODO MÁS FUERTE', en: 'STRONGEST MODE', zh: '最强模式', hi: 'सबसे मजबूत मोड', ar: 'أقوى وضع', it: 'MODALITÀ PIÙ FORTE', pt: 'MODO MAIS FORTE', ru: 'САМЫЙ СИЛЬНЫЙ РЕЖИМ', de: 'STÄRKSTER MODUS', fr: 'MODE LE PLUS FORT', da: 'STÆRKESTE MODE' },
  strongestModeDetail: { es: 'Nivel {level} · tu mayor impulso', en: 'Level {level} · your strongest impulse', zh: '等级 {level} · 你的最强动力', hi: 'स्तर {level} · आपकी सबसे मजबूत प्रेरणा', ar: 'المستوى {level} · أقوى دفعة لك', it: 'Livello {level} · il tuo impulso più forte', pt: 'Nível {level} · seu maior impulso', ru: 'Уровень {level} · ваш главный импульс', de: 'Level {level} · dein stärkster Impuls', fr: 'Niveau {level} · votre plus grand élan', da: 'Niveau {level} · din stærkeste drivkraft' },
  leastCultivatedMode: { es: 'MODO MENOS CULTIVADO', en: 'LEAST CULTIVATED MODE', zh: '最需要培育的模式', hi: 'सबसे कम विकसित मोड', ar: 'أقل وضع تنمية', it: 'MODALITÀ MENO COLTIVATA', pt: 'MODO MENOS CULTIVADO', ru: 'НАИМЕНЕЕ РАЗВИТЫЙ РЕЖИМ', de: 'AM WENIGSTEN ENTWICKELTER MODUS', fr: 'MODE LE MOINS CULTIVÉ', da: 'MINDST DYRKEDE MODE' },
  leastCultivatedModeDetail: { es: 'Nivel {level} · tu siguiente oportunidad', en: 'Level {level} · your next opportunity', zh: '等级 {level} · 你的下一个机会', hi: 'स्तर {level} · आपका अगला अवसर', ar: 'المستوى {level} · فرصتك التالية', it: 'Livello {level} · la tua prossima opportunità', pt: 'Nível {level} · sua próxima oportunidade', ru: 'Уровень {level} · ваша следующая возможность', de: 'Level {level} · deine nächste Chance', fr: 'Niveau {level} · votre prochaine opportunité', da: 'Niveau {level} · din næste mulighed' },
  definedActivities: { es: 'ACTIVIDADES DEFINIDAS', en: 'DEFINED ACTIVITIES', zh: '已定义活动', hi: 'निर्धारित गतिविधियां', ar: 'الأنشطة المحددة', it: 'ATTIVITÀ DEFINITE', pt: 'ATIVIDADES DEFINIDAS', ru: 'ЗАДАННЫЕ АКТИВНОСТИ', de: 'DEFINIERTE AKTIVITÄTEN', fr: 'ACTIVITÉS DÉFINIES', da: 'DEFINEREDE AKTIVITETER' },
  definedActivitiesDetail: { es: 'Rumbos guardados en tus journeys', en: 'Paths saved in your journeys', zh: '保存在旅程中的路径', hi: 'आपकी जर्नी में सहेजे गए रास्ते', ar: 'مسارات محفوظة في رحلاتك', it: 'Percorsi salvati nei tuoi journey', pt: 'Rumos salvos nas suas jornadas', ru: 'Сохранённые маршруты в ваших путешествиях', de: 'In deinen Journeys gespeicherte Wege', fr: 'Parcours enregistrés dans vos journeys', da: 'Ruter gemt i dine journeys' },
  activeLifePresets: { es: 'CONFIGURACIONES DE VIDA ACTIVAS', en: 'ACTIVE LIFE PRESETS', zh: '启用的生活模式组合', hi: 'सक्रिय जीवन-मोड संयोजन', ar: 'توليفات أنماط الحياة النشطة', it: 'COMBINAZIONI DEI MODI DI VITA ATTIVE', pt: 'CONFIGURAÇÕES DE VIDA ATIVAS', ru: 'АКТИВНЫЕ СОЧЕТАНИЯ ЖИЗНЕННЫХ СФЕР', de: 'AKTIVE KOMBINATIONEN DER LEBENSBEREICHE', fr: 'COMBINAISONS ACTIVES DES MODES DE VIE', da: 'AKTIVE KOMBINATIONER AF LIVSOMRÅDER' },
  activeLifePresetsDetail: { es: 'Configuraciones guardadas para volver a ti', en: 'Saved configurations to return to yourself', zh: '保存的配置，随时回到自己', hi: 'अपने पास लौटने के लिए सहेजी गई कॉन्फ़िगरेशन', ar: 'إعدادات محفوظة للعودة إلى ذاتك', it: 'Configurazioni salvate per tornare a te', pt: 'Configurações salvas para voltar a si', ru: 'Сохранённые настройки, чтобы вернуться к себе', de: 'Gespeicherte Konfigurationen für deine Rückkehr zu dir', fr: 'Configurations enregistrées pour revenir à vous-même', da: 'Gemte konfigurationer til at finde tilbage til dig selv' },
  presenceDistribution: { es: 'DISTRIBUCIÓN DE PRESENCIA', en: 'PRESENCE DISTRIBUTION', zh: '存在感分布', hi: 'उपस्थिति का वितरण', ar: 'توزيع الحضور', it: 'DISTRIBUZIONE DELLA PRESENZA', pt: 'DISTRIBUIÇÃO DE PRESENÇA', ru: 'РАСПРЕДЕЛЕНИЕ ПРИСУТСТВИЯ', de: 'VERTEILUNG DER PRÄSENZ', fr: 'RÉPARTITION DE LA PRÉSENCE', da: 'FORDELING AF TILSTEDEVÆRELSE' },
  energyQuestion: { es: '¿Dónde está tu energía?', en: 'Where is your energy?', zh: '你的能量在哪里？', hi: 'आपकी ऊर्जा कहाँ है?', ar: 'أين طاقتك؟', it: 'Dove si trova la tua energia?', pt: 'Onde está sua energia?', ru: 'Где ваша энергия?', de: 'Wo ist deine Energie?', fr: 'Où est votre énergie ?', da: 'Hvor er din energi?' },
  startingRange: { es: 'Inicio · 0–2', en: 'Starting · 0–2', zh: '起步 · 0–2', hi: 'शुरुआत · 0–2', ar: 'البداية · 0–2', it: 'Inizio · 0–2', pt: 'Início · 0–2', ru: 'Начало · 0–2', de: 'Start · 0–2', fr: 'Départ · 0–2', da: 'Begyndelse · 0–2' },
  practiceRange: { es: 'En práctica · 3–5', en: 'In practice · 3–5', zh: '实践中 · 3–5', hi: 'अभ्यास में · 3–5', ar: 'قيد الممارسة · 3–5', it: 'In pratica · 3–5', pt: 'Em prática · 3–5', ru: 'В практике · 3–5', de: 'In Übung · 3–5', fr: 'En pratique · 3–5', da: 'I praksis · 3–5' },
  expansionRange: { es: 'Expansión · 6–9', en: 'Expansion · 6–9', zh: '扩展 · 6–9', hi: 'विस्तार · 6–9', ar: 'التوسع · 6–9', it: 'Espansione · 6–9', pt: 'Expansão · 6–9', ru: 'Расширение · 6–9', de: 'Ausbau · 6–9', fr: 'Expansion · 6–9', da: 'Udvidelse · 6–9' },
  nextFocus: { es: 'PRÓXIMOS FOCOS', en: 'NEXT FOCUSES', zh: '下一个重点', hi: 'अगले फोकस', ar: 'التركيزات القادمة', it: 'PROSSIMI FOCUS', pt: 'PRÓXIMOS FOCOS', ru: 'СЛЕДУЮЩИЕ ФОКУСЫ', de: 'NÄCHSTE FOKUS-BEREICHE', fr: 'PROCHAINS FOCUS', da: 'NÆSTE FOKUSOMRÅDER' },
  areasToCultivate: { es: 'Áreas para cultivar', en: 'Areas to cultivate', zh: '需要培育的领域', hi: 'विकसित करने के क्षेत्र', ar: 'مجالات للتنمية', it: 'Aree da coltivare', pt: 'Áreas para cultivar', ru: 'Области для развития', de: 'Bereiche zur Entwicklung', fr: 'Domaines à cultiver', da: 'Områder at dyrke' },
  nextMovement: { es: 'SIGUIENTE MOVIMIENTO', en: 'NEXT MOVE', zh: '下一步', hi: 'अगला कदम', ar: 'الخطوة التالية', it: 'PROSSIMO PASSO', pt: 'PRÓXIMO MOVIMENTO', ru: 'СЛЕДУЮЩИЙ ШАГ', de: 'NÄCHSTER SCHRITT', fr: 'PROCHAINE ÉTAPE', da: 'NÆSTE SKRIDT' },
  continueCultivation: { es: 'Continúa tu cultivo', en: 'Continue your cultivation', zh: '继续你的培育之旅', hi: 'अपना विकास जारी रखें', ar: 'واصل تنميتك', it: 'Continua la tua crescita', pt: 'Continue seu cultivo', ru: 'Продолжайте развитие', de: 'Setze deine Entwicklung fort', fr: 'Poursuivez votre développement', da: 'Fortsæt din udvikling' },
  continueCultivationCopy: { es: 'Regresa al mapa de modos, elige un foco y define el próximo rumbo que quieres convertir en práctica.', en: 'Return to your mode map, choose a focus, and define the next path you want to turn into practice.', zh: '返回模式地图，选择一个重点，并确定你想付诸实践的下一条路径。', hi: 'अपने मोड मानचित्र पर लौटें, एक फोकस चुनें और अगले अभ्यास की दिशा तय करें।', ar: 'عد إلى خريطة أوضاعك، واختر تركيزاً، وحدد المسار التالي الذي تريد تحويله إلى ممارسة.', it: 'Torna alla mappa delle modalità, scegli un focus e definisci il prossimo percorso da trasformare in pratica.', pt: 'Volte ao mapa de modos, escolha um foco e defina o próximo rumo que deseja transformar em prática.', ru: 'Вернитесь к карте режимов, выберите фокус и определите следующий путь для практики.', de: 'Kehre zu deiner Moduskarte zurück, wähle einen Fokus und bestimme den nächsten Weg, den du in die Praxis bringen möchtest.', fr: 'Revenez à votre carte des modes, choisissez un focus et définissez le prochain chemin à mettre en pratique.', da: 'Gå tilbage til dit modekort, vælg et fokus, og fastlæg den næste vej, du vil omsætte til praksis.' },
  dashboard: { es: 'Centro de Control', en: 'Control Center', zh: '控制中心', hi: 'नियंत्रण केंद्र', ar: 'مركز التحكم', it: 'Centro di controllo', pt: 'Centro de Controle', ru: 'Центр управления', de: 'Kontrollzentrum', fr: 'Centre de contrôle', da: 'Kontrolcenter' },
  pressToEnter: { es: 'Acceder al Centro de Control', en: 'Access the Control Center', zh: '进入控制中心', hi: 'नियंत्रण केंद्र खोलें', ar: 'الدخول إلى مركز التحكم', it: 'Accedi al centro di controllo', pt: 'Acessar o Centro de Controle', ru: 'Перейти в центр управления', de: 'Kontrollzentrum öffnen', fr: 'Accéder au centre de contrôle', da: 'Åbn kontrolcenteret' },
  returnToOverview: { es: 'REGRESAR', en: 'GO BACK', zh: '返回', hi: 'वापस जाएँ', ar: 'رجوع', it: 'TORNA INDIETRO', pt: 'VOLTAR', ru: 'НАЗАД', de: 'ZURÜCK', fr: 'RETOUR', da: 'TILBAGE' },
  returnToControlCenter: { es: 'Volver al Centro de Control', en: 'Return to the Control Center', zh: '返回控制中心', hi: 'नियंत्रण केंद्र पर लौटें', ar: 'العودة إلى مركز التحكم', it: 'Torna al centro di controllo', pt: 'Voltar ao Centro de Controle', ru: 'Вернуться в центр управления', de: 'Zurück zum Kontrollzentrum', fr: 'Retour au centre de contrôle', da: 'Tilbage til kontrolcenteret' },
  returnMyLifeMap: { es: 'Volver a mi mapa de vida', en: 'Return to my life map', zh: '返回我的人生地图', hi: 'मेरे जीवन मानचित्र पर लौटें', ar: 'العودة إلى خريطة حياتي', it: 'Torna alla mia mappa della vita', pt: 'Voltar ao meu mapa de vida', ru: 'Вернуться к моей карте жизни', de: 'Zurück zu meiner Lebenskarte', fr: 'Revenir à ma carte de vie', da: 'Tilbage til mit livskort' },
  welcomeOverviewCopy: {
    es: 'Qué gusto tenerte aquí. Inspírate en otras personas, encuentra el equilibrio que va contigo y mira todo lo que has avanzado. Este es tu espacio para guardar lo que te funciona y dar pequeños pasos hacia lo que quieres, a tu ritmo.',
    en: 'It’s good to have you here. Find inspiration in others, discover the balance that feels right for you, and see how far you’ve come. This is your space to save what works and take small steps toward what matters to you, at your own pace.',
    zh: '很高兴你来到这里。从他人身上汲取灵感，找到适合自己的生活平衡，也看看自己已经走了多远。在这里，保存适合你的生活安排，按自己的节奏，一小步一小步地走向心之所向。',
    hi: 'आपका यहाँ होना अच्छा लगा। दूसरों से प्रेरणा लें, अपने लिए सही संतुलन खोजें और देखें कि आप कितना आगे आए हैं। यह आपकी अपनी जगह है—जो आपके लिए काम करे उसे सहेजें और अपनी गति से, छोटे-छोटे कदमों में, अपनी चाहतों की ओर बढ़ें।',
    ar: 'يسعدنا وجودك هنا. استلهم من الآخرين، واعثر على التوازن الذي يناسبك، وتأمل ما أحرزته من تقدم. هذه مساحتك لحفظ ما يلائمك واتخاذ خطوات صغيرة نحو ما يهمك، بالوتيرة التي تناسبك.',
    it: 'Che bello averti qui. Lasciati ispirare dagli altri, trova l’equilibrio che fa per te e guarda quanta strada hai fatto. Questo è il tuo spazio per salvare ciò che funziona per te e fare piccoli passi verso ciò che desideri, al tuo ritmo.',
    pt: 'Que bom ter você aqui. Inspire-se em outras pessoas, encontre o equilíbrio que combina com você e veja o quanto já avançou. Este é o seu espaço para salvar o que funciona e dar pequenos passos em direção ao que deseja, no seu ritmo.',
    ru: 'Рады, что вы здесь. Вдохновляйтесь другими, находите свой баланс и замечайте, как далеко вы уже продвинулись. Здесь можно сохранять то, что вам подходит, и маленькими шагами двигаться к тому, что для вас важно, в своём темпе.',
    de: 'Schön, dass du hier bist. Lass dich von anderen inspirieren, finde die Balance, die zu dir passt, und sieh, wie weit du schon gekommen bist. Hier kannst du speichern, was dir guttut, und kleine Schritte zu dem machen, was dir wichtig ist – in deinem Tempo.',
    fr: 'Quel plaisir de vous accueillir ici. Inspirez-vous des autres, trouvez l’équilibre qui vous ressemble et voyez tout le chemin parcouru. Cet espace est le vôtre : gardez ce qui vous convient et avancez à petits pas vers ce qui compte pour vous, à votre rythme.',
    da: 'Dejligt at have dig her. Find inspiration hos andre, opdag den balance, der passer til dig, og se, hvor langt du er kommet. Her er der plads til at gemme det, der fungerer for dig, og tage små skridt mod det, der betyder noget for dig, i dit eget tempo.',
  },
  openProfileMenu: { es: 'Abrir perfil', en: 'Open profile', zh: '打开个人资料', hi: 'प्रोफ़ाइल खोलें', ar: 'فتح الملف الشخصي', it: 'Apri profilo', pt: 'Abrir perfil', ru: 'Открыть профиль', de: 'Profil öffnen', fr: 'Ouvrir le profil', da: 'Åbn profil' },
  syncState: { es: 'Sincronizando configuración…', en: 'Syncing settings…', zh: '正在同步设置…', hi: 'सेटिंग सिंक हो रही हैं…', ar: 'جارٍ مزامنة الإعدادات…', it: 'Sincronizzazione impostazioni…', pt: 'Sincronizando configurações…', ru: 'Синхронизация настроек…', de: 'Einstellungen werden synchronisiert…', fr: 'Synchronisation des réglages…', da: 'Synkroniserer indstillinger…' },
  syncReady: { es: 'Configuración sincronizada', en: 'Settings synced', zh: '设置已同步', hi: 'सेटिंग सिंक हो गईं', ar: 'تمت مزامنة الإعدادات', it: 'Impostazioni sincronizzate', pt: 'Configurações sincronizadas', ru: 'Настройки синхронизированы', de: 'Einstellungen synchronisiert', fr: 'Réglages synchronisés', da: 'Indstillinger synkroniseret' },
  syncFailed: { es: 'No se sincronizó; tus datos siguen guardados aquí', en: 'Sync failed; your data is still saved on this device', zh: '同步失败；数据仍保存在此设备', hi: 'सिंक विफल; डेटा इस डिवाइस पर सुरक्षित है', ar: 'تعذرت المزامنة؛ بياناتك ما زالت محفوظة على هذا الجهاز', it: 'Sincronizzazione non riuscita; i dati sono ancora su questo dispositivo', pt: 'Falha na sincronização; seus dados ainda estão salvos neste dispositivo', ru: 'Синхронизация не удалась; данные сохранены на этом устройстве', de: 'Synchronisierung fehlgeschlagen; Daten sind weiterhin auf diesem Gerät gespeichert', fr: 'Échec de la synchronisation ; vos données restent sur cet appareil', da: 'Synkronisering mislykkedes; dine data er stadig gemt på denne enhed' },
  level: { es: 'NIVEL', en: 'LEVEL', zh: '等级', hi: 'स्तर', ar: 'المستوى', it: 'LIVELLO', pt: 'NÍVEL', ru: 'УРОВЕНЬ', de: 'STUFE', fr: 'NIVEAU', da: 'NIVEAU' },
  currentCultivaLevel: { es: 'Tu nivel actual de Modo Cultiva.', en: 'Your current Modo Cultiva level.', zh: '你当前的 Modo Cultiva 等级。', hi: 'आपका वर्तमान Modo Cultiva स्तर।', ar: 'مستواك الحالي في Modo Cultiva.', it: 'Il tuo livello attuale di Modo Cultiva.', pt: 'Seu nível atual de Modo Cultiva.', ru: 'Ваш текущий уровень Modo Cultiva.', de: 'Dein aktuelles Modo Cultiva-Level.', fr: 'Votre niveau actuel dans Modo Cultiva.', da: 'Dit aktuelle Modo Cultiva-niveau.' },
  currentLevelLabel: { es: '¿En qué nivel estás?', en: 'What level are you at?', zh: '你目前处于哪个等级？', hi: 'आप किस स्तर पर हैं?', ar: 'ما مستواك الحالي؟', it: 'A che livello sei?', pt: 'Em que nível você está?', ru: 'На каком ты сейчас уровне?', de: 'Auf welchem Level bist du?', fr: 'À quel niveau êtes-vous ?', da: 'Hvilket niveau er du på?' },
  overview: { es: 'Resumen', en: 'Overview', zh: '概览', hi: 'अवलोकन', ar: 'نظرة عامة', it: 'Panoramica', pt: 'Visão geral', ru: 'Обзор', de: 'Übersicht', fr: 'Vue d’ensemble', da: 'Oversigt' },
  globalActivitiesEyebrow: { es: 'ACTIVIDADES COMPARTIDAS POR LA COMUNIDAD', en: 'ACTIVITIES SHARED BY THE COMMUNITY', zh: '社区分享的活动', hi: 'समुदाय द्वारा साझा की गई गतिविधियाँ', ar: 'أنشطة شاركها المجتمع', it: 'ATTIVITÀ CONDIVISE DALLA COMUNITÀ', pt: 'ATIVIDADES COMPARTILHADAS PELA COMUNIDADE', ru: 'АКТИВНОСТИ, КОТОРЫМИ ДЕЛИТСЯ СООБЩЕСТВО', de: 'VON DER COMMUNITY GETEILTE AKTIVITÄTEN', fr: 'ACTIVITÉS PARTAGÉES PAR LA COMMUNAUTÉ', da: 'AKTIVITETER DELT AF FÆLLESSKABET' },
  globalRecommendationsCopy: { es: 'Descubre cómo otras personas cultivan sus vidas y encuentra ideas que puedan inspirar tu propio camino.', en: 'Explore how other people cultivate their lives and discover ideas that may inspire your own path.', zh: '了解其他人如何培育自己的生活，发现可能启发你个人道路的想法。', hi: 'जानें कि दूसरे लोग अपने जीवन को कैसे संवारते हैं और ऐसे विचार खोजें जो आपकी राह को प्रेरित कर सकते हैं।', ar: 'اكتشف كيف يزرع أشخاص آخرون حياتهم، واستلهم أفكاراً قد تلهم طريقك الخاص.', it: 'Scopri come altre persone coltivano la propria vita e trova idee che possano ispirare il tuo percorso.', pt: 'Descubra como outras pessoas cultivam suas vidas e encontre ideias que possam inspirar seu próprio caminho.', ru: 'Узнайте, как другие люди развивают свою жизнь, и найдите идеи, которые вдохновят ваш путь.', de: 'Entdecke, wie andere Menschen ihr Leben gestalten, und finde Anregungen für deinen eigenen Weg.', fr: 'Découvrez comment d’autres personnes cultivent leur vie et trouvez des idées pour inspirer votre propre chemin.', da: 'Se, hvordan andre mennesker udvikler deres liv, og find idéer, der kan inspirere din egen vej.' },
  globalSharedBy: { es: 'Compartida por', en: 'Shared by', zh: '分享者', hi: 'साझा किया', ar: 'شاركها', it: 'Condivisa da', pt: 'Compartilhada por', ru: 'Автор', de: 'Geteilt von', fr: 'Partagée par', da: 'Delt af' },
  globalAnalyzeSave: { es: 'Visualizar esta idea', en: 'View this idea', zh: '查看此想法', hi: 'यह विचार देखें', ar: 'اعرض هذه الفكرة', it: 'Visualizza questa idea', pt: 'Visualizar esta ideia', ru: 'Посмотреть эту идею', de: 'Diese Idee ansehen', fr: 'Voir cette idée', da: 'Se denne idé' },
  insightSharedActivity: { es: 'Idea global · Actividad compartida', en: 'Global idea · Shared activity', zh: '全球创意 · 社区分享的活动', hi: 'वैश्विक विचार · साझा गतिविधि', ar: 'فكرة عالمية · نشاط مشترك', it: 'Idea globale · Attività condivisa', pt: 'Ideia global · Atividade compartilhada', ru: 'Глобальная идея · Общая активность', de: 'Globale Idee · Geteilte Aktivität', fr: 'Idée globale · Activité partagée', da: 'Global idé · Delt aktivitet' },
  presetOf: { es: 'CONFIGURACIÓN DE VIDA DE', en: 'PRESET BY', zh: '生活模式组合 · 分享者', hi: 'जीवन-मोड संयोजन · साझा करने वाले', ar: 'توليفة أنماط الحياة · شاركها', it: 'COMBINAZIONE DEI MODI DI VITA DI', pt: 'COMBINAÇÃO DE MODOS DE VIDA DE', ru: 'СОЧЕТАНИЕ ЖИЗНЕННЫХ СФЕР · АВТОР', de: 'LEBENSMODUS-KOMBINATION VON', fr: 'COMBINAISON DES MODES DE VIE DE', da: 'KOMBINATION AF LIVSOMRÅDER FRA' },
  insightPresetDescription: { es: 'Configuración del mapa de la persona que compartió esta actividad.', en: 'The map configuration from the person who shared this activity.', zh: '分享此活动的成员的地图配置。', hi: 'इस गतिविधि को साझा करने वाले व्यक्ति के मानचित्र का विन्यास।', ar: 'إعداد خريطة الشخص الذي شارك هذا النشاط.', it: 'La configurazione della mappa della persona che ha condiviso questa attività.', pt: 'A configuração do mapa da pessoa que compartilhou esta atividade.', ru: 'Конфигурация карты человека, поделившегося этой активностью.', de: 'Die Kartenkonfiguration der Person, die diese Aktivität geteilt hat.', fr: 'La configuration de la carte de la personne qui a partagé cette activité.', da: 'Kortopsætningen fra personen, der delte denne aktivitet.' },
  featuredBadges: { es: 'INSIGNIAS DESTACADAS', en: 'FEATURED BADGES', zh: '精选徽章', hi: 'विशेष बैज', ar: 'الشارات المميزة', it: 'DISTINTIVI IN EVIDENZA', pt: 'EMBLEMAS EM DESTAQUE', ru: 'ИЗБРАННЫЕ ЗНАЧКИ', de: 'HERVORGEHOBENE ABZEICHEN', fr: 'BADGES À LA UNE', da: 'FREMHÆVEDE BADGES' },
  presenceRoute: { es: 'Ruta de presencia', en: 'Presence path', zh: '存在感路径', hi: 'उपस्थिति पथ', ar: 'مسار الحضور', it: 'Percorso di presenza', pt: 'Rota de presença', ru: 'Путь присутствия', de: 'Präsenzpfad', fr: 'Parcours de présence', da: 'Tilstedeværelsessti' },
  exploreInsights: { es: 'Seguir explorando Insights', en: 'Keep exploring Insights', zh: '继续探索洞察', hi: 'इनसाइट्स देखना जारी रखें', ar: 'تابع استكشاف الرؤى', it: 'Continua a esplorare gli insight', pt: 'Continuar explorando Insights', ru: 'Продолжить изучать инсайты', de: 'Insights weiter erkunden', fr: 'Continuer à explorer les insights', da: 'Fortsæt med at udforske insights' },
  badgeTitleFirstStep: { es: 'Primer paso', en: 'First step', zh: '第一步', hi: 'पहला कदम', ar: 'الخطوة الأولى', it: 'Primo passo', pt: 'Primeiro passo', ru: 'Первый шаг', de: 'Erster Schritt', fr: 'Premier pas', da: 'Første skridt' },
  badgeTitleThreeMoves: { es: 'Tres movimientos', en: 'Three moves', zh: '三次行动', hi: 'तीन कदम', ar: 'ثلاث حركات', it: 'Tre mosse', pt: 'Três movimentos', ru: 'Три шага', de: 'Drei Schritte', fr: 'Trois mouvements', da: 'Tre bevægelser' },
  badgeTitleLevelUp: { es: 'Nivel arriba', en: 'Level up', zh: '升级', hi: 'स्तर ऊपर', ar: 'ارتقاء بالمستوى', it: 'Livello superiore', pt: 'Subir de nível', ru: 'Новый уровень', de: 'Levelaufstieg', fr: 'Niveau supérieur', da: 'Niveau op' },
  badgeTitleFullSpectrum: { es: 'Espectro completo', en: 'Full spectrum', zh: '完整光谱', hi: 'पूर्ण स्पेक्ट्रम', ar: 'طيف كامل', it: 'Spettro completo', pt: 'Espectro completo', ru: 'Полный спектр', de: 'Volles Spektrum', fr: 'Spectre complet', da: 'Fuldt spektrum' },
  badgeTitleGlobalEye: { es: 'Mirada global', en: 'Global eye', zh: '全球视野', hi: 'वैश्विक दृष्टि', ar: 'نظرة عالمية', it: 'Sguardo globale', pt: 'Olhar global', ru: 'Глобальный взгляд', de: 'Globaler Blick', fr: 'Regard global', da: 'Globalt blik' },
  badgeTitleVisionary: { es: 'Visión final', en: 'Final vision', zh: '最终愿景', hi: 'अंतिम दृष्टि', ar: 'الرؤية النهائية', it: 'Visione finale', pt: 'Visão final', ru: 'Финальное видение', de: 'Abschlussvision', fr: 'Vision finale', da: 'Endelig vision' },
  badgeTitlePresetMaker: { es: 'Cartógrafo', en: 'Cartographer', zh: '制图师', hi: 'मानचित्रकार', ar: 'رسام الخرائط', it: 'Cartografo', pt: 'Cartógrafo', ru: 'Картограф', de: 'Kartograf', fr: 'Cartographe', da: 'Kartograf' },
  badgeTitleSkinShift: { es: 'Cambio de piel', en: 'Skin shift', zh: '界面转换', hi: 'स्किन बदलाव', ar: 'تغيير الواجهة', it: 'Cambio di skin', pt: 'Mudança de skin', ru: 'Смена скина', de: 'Skinwechsel', fr: 'Changement de skin', da: 'Skift af skin' },
  badges: { es: 'Insignias', en: 'Badges', zh: '徽章', hi: 'बैज', ar: 'الشارات', it: 'Distintivi', pt: 'Emblemas', ru: 'Значки', de: 'Abzeichen', fr: 'Badges', da: 'Badges' },
  badgesEyebrow: { es: 'PROGRESO QUE SE VUELVE IDENTIDAD', en: 'PROGRESS BECOMES IDENTITY', zh: '让进步成为身份', hi: 'प्रगति पहचान बनती है', ar: 'التقدم يصبح هوية', it: 'IL PROGRESSO DIVENTA IDENTITÀ', pt: 'O PROGRESSO VIRA IDENTIDADE', ru: 'ПРОГРЕСС СТАНОВИТСЯ ИДЕНТИЧНОСТЬЮ', de: 'FORTSCHRITT WIRD IDENTITÄT', fr: 'LE PROGRÈS DEVIENT IDENTITÉ', da: 'FREMSKRIDT BLIVER IDENTITET' },
  badgesDescription: { es: 'Reconoce los momentos importantes de tu Journey y elige hasta tres logros para mostrar en tu perfil y compartir con tu red.', en: 'Recognize important moments in your journey and choose up to three achievements to show on your profile and share with your network.', zh: '记录旅程中的重要时刻，选择最多三个成就展示在个人资料中并与社群分享。', hi: 'अपने जर्नी के महत्वपूर्ण क्षणों को पहचानें और प्रोफ़ाइल पर दिखाने व नेटवर्क के साथ साझा करने के लिए तीन उपलब्धियां चुनें।', ar: 'احتفِ باللحظات المهمة في رحلتك واختر ما يصل إلى ثلاثة إنجازات لعرضها في ملفك ومشاركتها مع شبكتك.', it: 'Riconosci i momenti importanti del tuo percorso e scegli fino a tre traguardi da mostrare nel profilo e condividere con la tua rete.', pt: 'Reconheça momentos importantes da sua jornada e escolha até três conquistas para mostrar no perfil e compartilhar com sua rede.', ru: 'Отмечайте важные моменты своего пути и выбирайте до трёх достижений для профиля и своей сети.', de: 'Erkenne wichtige Momente deiner Journey und wähle bis zu drei Erfolge für dein Profil und dein Netzwerk.', fr: 'Reconnaissez les moments importants de votre parcours et choisissez jusqu’à trois réussites à afficher sur votre profil et partager avec votre réseau.', da: 'Anerkend vigtige øjeblikke på din rejse, og vælg op til tre resultater til din profil og dit netværk.' },
  featuredCountLabel: { es: 'DESTACADAS', en: 'FEATURED', zh: '精选', hi: 'विशेष', ar: 'مميزة', it: 'IN EVIDENZA', pt: 'EM DESTAQUE', ru: 'В ИЗБРАННОМ', de: 'HERVORGEHOBEN', fr: 'À LA UNE', da: 'FREMHÆVEDE' },
  unlockedAchievements: { es: 'LOGROS DESBLOQUEADOS', en: 'UNLOCKED ACHIEVEMENTS', zh: '已解锁成就', hi: 'अनलॉक उपलब्धियां', ar: 'الإنجازات المفتوحة', it: 'TRAGUARDI SBLOCCATI', pt: 'CONQUISTAS DESBLOQUEADAS', ru: 'ОТКРЫТЫЕ ДОСТИЖЕНИЯ', de: 'FREIGESCHALTETE ERFOLGE', fr: 'RÉUSSITES DÉBLOQUÉES', da: 'LÅSTE RESULTATER OP' },
  unlockedHint: { es: 'Completa acciones en tus journeys para abrir nuevas insignias', en: 'Complete actions in your journeys to unlock new badges', zh: '完成旅程中的行动以解锁新徽章', hi: 'नई बैज अनलॉक करने के लिए अपनी यात्राओं में कार्य पूरे करें', ar: 'أكمل الإجراءات في رحلاتك لفتح شارات جديدة', it: 'Completa le azioni nei tuoi percorsi per sbloccare nuovi distintivi', pt: 'Conclua ações nas suas jornadas para desbloquear novos emblemas', ru: 'Выполняйте действия в своих путях, чтобы открывать новые значки', de: 'Schließe Aktionen in deinen Journeys ab, um neue Abzeichen freizuschalten', fr: 'Réalisez des actions dans vos parcours pour débloquer de nouveaux badges', da: 'Gennemfør handlinger på dine rejser for at låse nye badges op' },
  profileSection: { es: 'EN TU PERFIL', en: 'ON YOUR PROFILE', zh: '在你的资料中', hi: 'आपकी प्रोफ़ाइल में', ar: 'في ملفك', it: 'NEL TUO PROFILO', pt: 'NO SEU PERFIL', ru: 'В ВАШЕМ ПРОФИЛЕ', de: 'IN DEINEM PROFIL', fr: 'DANS VOTRE PROFIL', da: 'PÅ DIN PROFIL' },
  featuredAchievements: { es: 'Tus logros destacados', en: 'Your featured achievements', zh: '你的精选成就', hi: 'आपकी विशेष उपलब्धियां', ar: 'إنجازاتك المميزة', it: 'I tuoi traguardi in evidenza', pt: 'Suas conquistas em destaque', ru: 'Ваши избранные достижения', de: 'Deine hervorgehobenen Erfolge', fr: 'Vos réussites à la une', da: 'Dine fremhævede resultater' },
  noFeaturedAchievements: { es: 'Aún no has destacado insignias', en: 'You have not featured any badges yet', zh: '你还没有精选徽章', hi: 'आपने अभी तक कोई बैज विशेष नहीं बनाया है', ar: 'لم تبرز أي شارات بعد', it: 'Non hai ancora messo distintivi in evidenza', pt: 'Você ainda não destacou emblemas', ru: 'Вы ещё не выбрали значки для профиля', de: 'Du hast noch keine Abzeichen hervorgehoben', fr: 'Vous n’avez encore mis aucun badge à la une', da: 'Du har endnu ikke fremhævet badges' },
  highlightBadge: { es: 'Destacar en perfil', en: 'Feature on profile', zh: '展示在资料中', hi: 'प्रोफ़ाइल पर दिखाएं', ar: 'إبراز في الملف', it: 'Metti in evidenza nel profilo', pt: 'Destacar no perfil', ru: 'Показать в профиле', de: 'Im Profil hervorheben', fr: 'Mettre sur le profil', da: 'Fremhæv på profil' },
  featuredBadge: { es: 'Destacada ✓', en: 'Featured ✓', zh: '已精选 ✓', hi: 'विशेष ✓', ar: 'مميزة ✓', it: 'In evidenza ✓', pt: 'Em destaque ✓', ru: 'В профиле ✓', de: 'Hervorgehoben ✓', fr: 'À la une ✓', da: 'Fremhævet ✓' },
  chooseOtherBadge: { es: 'Quita una para elegir', en: 'Remove one to choose', zh: '移除一个后再选择', hi: 'चुनने के लिए एक हटाएं', ar: 'أزل واحدة للاختيار', it: 'Rimuovine una per scegliere', pt: 'Remova uma para escolher', ru: 'Снимите одну, чтобы выбрать', de: 'Entferne eines zum Auswählen', fr: 'Retirez-en un pour choisir', da: 'Fjern én for at vælge' },
  badgeLocked: { es: 'Aún no desbloqueada', en: 'Not unlocked yet', zh: '尚未解锁', hi: 'अभी अनलॉक नहीं', ar: 'لم تُفتح بعد', it: 'Non ancora sbloccato', pt: 'Ainda não desbloqueado', ru: 'Ещё не открыто', de: 'Noch nicht freigeschaltet', fr: 'Pas encore débloqué', da: 'Ikke låst op endnu' },
  viewMyProfile: { es: 'Ver mi perfil', en: 'View my profile', zh: '查看我的资料', hi: 'मेरी प्रोफ़ाइल देखें', ar: 'عرض ملفي', it: 'Vedi il mio profilo', pt: 'Ver meu perfil', ru: 'Открыть мой профиль', de: 'Mein Profil ansehen', fr: 'Voir mon profil', da: 'Se min profil' },
  profileYou: { es: 'Tú', en: 'You', zh: '你', hi: 'आप', ar: 'أنت', it: 'Tu', pt: 'Você', ru: 'Вы', de: 'Du', fr: 'Vous', da: 'Dig' },
  publicProfile: { es: 'Cómo lo ven otras personas', en: 'How others see your profile', zh: '其他人看到的资料', hi: 'दूसरे आपकी प्रोफ़ाइल कैसे देखते हैं', ar: 'كيف يرى الآخرون ملفك', it: 'Come vedono il tuo profilo gli altri', pt: 'Como outras pessoas veem seu perfil', ru: 'Как другие видят ваш профиль', de: 'So sehen andere dein Profil', fr: 'Comment les autres voient votre profil', da: 'Sådan ser andre din profil' },
  profileModalEyebrow: { es: 'TU IDENTIDAD EN MODO CULTIVA', en: 'YOUR IDENTITY IN MODO CULTIVA', zh: '你在 Modo Cultiva 的身份', hi: 'Modo Cultiva में आपकी पहचान', ar: 'هويتك في Modo Cultiva', it: 'LA TUA IDENTITÀ IN MODO CULTIVA', pt: 'SUA IDENTIDADE NO MODO CULTIVA', ru: 'ВАША ИДЕНТИЧНОСТЬ В MODO CULTIVA', de: 'DEINE IDENTITÄT IN MODO CULTIVA', fr: 'VOTRE IDENTITÉ DANS MODO CULTIVA', da: 'DIN IDENTITET I MODO CULTIVA' },
  customizerEyebrow: { es: 'TU IDENTIDAD EN EL MAPA', en: 'YOUR IDENTITY ON THE MAP', zh: '你在地图上的身份', hi: 'मानचित्र पर आपकी पहचान', ar: 'هويتك على الخريطة', it: 'LA TUA IDENTITÀ SULLA MAPPA', pt: 'SUA IDENTIDADE NO MAPA', ru: 'ВАША ИДЕНТИЧНОСТЬ НА КАРТЕ', de: 'DEINE IDENTITÄT AUF DER KARTE', fr: 'VOTRE IDENTITÉ SUR LA CARTE', da: 'DIN IDENTITET PÅ KORTET' },
  customizerTitle: { es: 'Personaliza tu perfil', en: 'Personalize your profile', zh: '自定义个人资料', hi: 'अपनी प्रोफ़ाइल को अनुकूलित करें', ar: 'خصّص ملفك الشخصي', it: 'Personalizza il tuo profilo', pt: 'Personalize seu perfil', ru: 'Настройте свой профиль', de: 'Personalisiere dein Profil', fr: 'Personnalisez votre profil', da: 'Tilpas din profil' },
  customizerDescription: { es: 'Edita tu nombre y foto de perfil. Tus cambios se guardan en este navegador.', en: 'Edit your name and profile photo. Your changes are saved in this browser.', zh: '编辑你的姓名和头像。更改会保存在此浏览器中。', hi: 'अपना नाम और प्रोफ़ाइल फ़ोटो बदलें। आपके बदलाव इसी ब्राउज़र में सहेजे जाएँगे।', ar: 'عدّل اسمك وصورة ملفك الشخصي. تُحفظ التغييرات في هذا المتصفح.', it: 'Modifica il nome e la foto del profilo. Le modifiche vengono salvate in questo browser.', pt: 'Edite seu nome e foto de perfil. As alterações ficam salvas neste navegador.', ru: 'Измените имя и фото профиля. Изменения сохраняются в этом браузере.', de: 'Bearbeite deinen Namen und dein Profilfoto. Änderungen werden in diesem Browser gespeichert.', fr: 'Modifiez votre nom et votre photo de profil. Vos changements sont enregistrés dans ce navigateur.', da: 'Redigér dit navn og profilbillede. Dine ændringer gemmes i denne browser.…50016 tokens truncated…= JSON.stringify(location(right));
    });
    navigationHistoryRef.current = navigation;
    const handlePopState = (event: PopStateEvent) => navigation.onPopState(event.state);
    window.addEventListener('popstate', handlePopState);
    return () => { window.removeEventListener('popstate', handlePopState); navigationHistoryRef.current = null; };
  }, []);
  useEffect(() => { if (tourIndex === null && !welcomeScope) navigationHistoryRef.current?.sync(navigationSnapshotRef.current); }, [navigationSnapshotKey, tourIndex, welcomeScope]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || tourIndex !== null || welcomeScope) return;
      event.preventDefault();
      navigationHistoryRef.current?.back();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [tourIndex, welcomeScope]);

  const cultivaLevel = useMemo(() => calculateCultivaLevel(modes.map(mode => levels[mode.key])), [levels]);
  const cultivaLevelLabel = new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(cultivaLevel);

  const personalizedInsights = useMemo(() => {
    if (selectedMode) {
      const currentLevel = Math.min(levels[selectedMode.key] ?? 0, 8);
      const pool = globalInsightVariantsByKey[`${selectedMode.key}-${currentLevel}`] ?? [];
      if (!pool.length) return [];
      const cycleCount = Math.max(1, Math.ceil(pool.length / 12));
      const start = (insightCycle % cycleCount) * 12;
      return Array.from({ length: Math.min(12, pool.length) }, (_, index) => localizeGlobalInsight(pool[(start + index) % pool.length]));
    }
    const candidates = modes.map((mode) => {
      const currentLevel = levels[mode.key] ?? 0;
      const recommendationLevel = Math.min(currentLevel + 1, 8);
      const key = `${mode.key}-${recommendationLevel}`;
      const options = globalInsightVariantsByKey[key] ?? [];
      return localizeGlobalInsight(options[insightVariants[key] ?? 0] ?? options[0] ?? globalInsightActivities.find((insight) => insight.modeKey === mode.key && insight.level === recommendationLevel)!);
    }).filter((insight): insight is (typeof globalInsightActivities)[number] => Boolean(insight));
    return candidates;
  }, [cultOpen, insightCycle, insightVariants, language, levels, selectedMode]);
  const achievementProgress = useMemo(() => badgeProgress(activityDrafts, activityCompletions, levels, visionImages), [activityDrafts, activityCompletions, levels, visionImages]);
  const earnedBadges = useMemo(() => {
    const definedCount = Object.keys(activityDrafts).length;
    const activeModes = modes.filter((mode) => (levels[mode.key] ?? 0) > 0).length;
    const highestLevel = Math.max(...modes.map((mode) => levels[mode.key] ?? 0));
    return cultBadgeCatalog.filter((badge) => {
      if (badge.key === 'completionist') return achievementProgress.completionist;
      if (badge.key === 'maxed') return achievementProgress.maxed;
      if (badge.key === 'first-step') return definedCount >= 1;
      if (badge.key === 'three-moves') return definedCount >= 3;
      if (badge.key === 'level-up') return highestLevel >= 1;
      if (badge.key === 'full-spectrum') return activeModes === modes.length;
      if (badge.key === 'global-eye') return definedCount >= 1 && Object.keys(insightRequests).length >= 1;
      if (badge.key === 'visionary') return Object.keys(visionImages).length >= 1;
      if (badge.key === 'preset-maker') return Object.keys(presets).length >= 1;
      if (badge.key === 'skin-shift') return skin !== 'holista';
      return false;
    });
  }, [activityDrafts, achievementProgress, insightRequests, levels, presets, skin, visionImages]);
  // Inactive/unknown badges must never be displayed as earned on a profile.
  // Keep the saved selection intact so existing user data is not discarded.
  const visibleFeaturedBadges = eligibleFeaturedBadges(featuredBadges, earnedBadges.map(badge => badge.key));
  const filteredSpecialists = useMemo(() => {
    const hasFilter = specialistModeFilter !== 'all' || specialistLanguageFilter !== 'all' || specialistContinentFilter !== 'all';
    const source = hasFilter ? specialistDirectory : specialists;
    return source.filter((specialist) => (
      (specialistModeFilter === 'all' || specialist.modeKey === specialistModeFilter)
      && (specialistLanguageFilter === 'all' || specialist.language === specialistLanguageFilter)
      && (specialistContinentFilter === 'all' || specialist.continent === specialistContinentFilter)
    )).slice(0, hasFilter ? 12 : specialists.length);
  }, [specialistContinentFilter, specialistLanguageFilter, specialistModeFilter]);

  useEffect(() => {
    if (cultTab !== 'insights' || !cultOpen) return;
    setInsightSlide(0);
  }, [cultTab, cultOpen, selectedMode?.key]);

  useEffect(() => {
    if (cultTab !== 'insights' || !cultOpen || personalizedInsights.length < 2) return;
    const timer = window.setInterval(() => setInsightSlide((current) => (current + 1) % personalizedInsights.length), 6500);
    return () => window.clearInterval(timer);
  }, [cultOpen, cultTab, personalizedInsights.length]);

  const updateLevel = (key: string, level: number) => {
    setLevels((current) => ({ ...current, [key]: level }));
    if (selectedMode?.key === key) setJourneySlide(level);
  };

  const toggleFeaturedBadge = (badgeKey: string) => {
    if (!earnedBadges.some(badge => badge.key === badgeKey)) return;
    setFeaturedBadges((current) => {
      const eligible = eligibleFeaturedBadges(current, earnedBadges.map(badge => badge.key));
      const next = eligible.includes(badgeKey)
        ? eligible.filter((key) => key !== badgeKey)
        : eligible.length < 3 ? [...eligible, badgeKey] : eligible;
      try {
        personalStorageRef.current.setItem('modoCultiva_featuredBadges', JSON.stringify(next));
      } catch {
        // The selection remains available for the current session.
      }
      return next;
    });
  };

  const requestAccess = (feature: string, plan: AccessRequest['plan'] = 'Cuenta') => {
    setPendingAccess({ feature, plan, returnView: view });
    setProfileMenuOpen(false);
    setView('plans');
  };

  const openPlan = (plan: PlanKey, feature: string) => {
    setPendingAccess({ feature, plan: plan === 'basic' ? 'Entry' : plan === 'gold' ? 'Gold' : 'Ultimate Mode', returnView: view });
    setSelectedPlan(plan);
    setProfileMenuOpen(false);
    setView('plans');
  };

  const changeSkin = (nextSkin: Skin) => {
    if (nextSkin !== 'holista') return;
    if (!RELEASE_FREE_ACCESS && nextSkin !== 'holista' && !isAuthenticated && view !== 'login') {
      requestAccess(`la skin ${skinInfo(nextSkin)?.name ?? nextSkin}`, nextSkin === 'dj' || skinInfo(nextSkin)?.access === 'gold' ? 'Gold' : 'Ultimate Mode');
      return;
    }
    if (!RELEASE_FREE_ACCESS && nextSkin !== 'holista' && isAuthenticated && activePlan === 'basic') { requestAccess(`la skin ${skinInfo(nextSkin)?.name ?? nextSkin}`, 'Gold'); return; }
    if (!RELEASE_FREE_ACCESS && nextSkin !== 'holista' && isAuthenticated && activePlan === 'gold' && nextSkin !== 'dj') { requestAccess(`la skin ${skinInfo(nextSkin)?.name ?? nextSkin}`, 'Ultimate Mode'); return; }
    if (view === 'login') loginSkinChoice.current = nextSkin;
    setSkin(nextSkin);
    try {
      personalStorageRef.current.setItem('modoCultiva_skin', nextSkin);
    } catch {
      // The selected skin remains available for the current session.
    }
  };

  const activateCultSkin = (nextSkin: Skin) => {
    if (nextSkin !== 'holista') return;
    changeSkin('holista');
  };

  const activatePaletteFilter = (nextFilter: Exclude<PaletteFilter, 'none'>) => {
    void nextFilter;
    setPaletteFilter('none');
  };

  const handleProfileImage = (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const image = typeof reader.result === 'string' ? reader.result : null;
      if (!image) return;
      setProfileImage(image);
      try {
        personalStorageRef.current.setItem('modoCultiva_profileImage', image);
      } catch {
        // The profile image remains available for the current session.
      }
    };
    reader.readAsDataURL(file);
  };

  const handleProfileName = (name: string) => {
    setProfileName(name);
    try {
      personalStorageRef.current.setItem('modoCultiva_profileName', name);
    } catch {
      // The profile name remains available for the current session.
    }
  };

  const openMode = (mode: Mode) => {
    setJourneyReturnView(view === 'dashboard' ? 'dashboard' : 'welcome');
    setSelectedMode(mode);
    setJourneySlide(levels[mode.key] ?? 0);
    setInsightCycle(0);
    setInsightSlide(0);
    setCultOpen(true);
    setActiveActivity(null);
  };

  const backToDashboard = () => {
    setSelectedMode(null);
    setCultOpen(false);
    setActiveActivity(null);
    setView(journeyReturnView);
  };

  const openActivity = (level: number, entry: ActivityEntry = 'custom') => {
    if (level === 9) return;
    aiRequestRef.current?.abort();
    aiRequestRef.current = null;
    journeyReturnScrollTop.current = journeyPanelRef.current?.scrollTop ?? 0;
    setActiveActivity(level);
    setActivityEntry(entry);
    setPoolSelection(0);
    setActivityPrompt(entry === 'custom' && selectedMode ? activityDrafts[`${selectedMode.key}-${level}`] ?? '' : '');
    setAiNotice(null);
    setAiHasConsulted(false);
    setAiProposal('');
    setAiLoading(false);
    window.requestAnimationFrame(() => {
      journeyPanelRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    });
  };

  const usePoolActivity = () => {
    if (!selectedMode || activeActivity === null) return;
    if (!RELEASE_FREE_ACCESS && !isAuthenticated) {
      openPlan('basic', 'Pool de Actividades');
      return;
    }
    const activity = poolActivities(selectedMode.key, activeActivity)[poolSelection];
    saveActivity(selectedMode.key, activeActivity, `${activity.title}. ${activity.description}`);
  };

  const consultModeAi = async () => {
    if (aiRequestRef.current || aiLoading) return;
    if (!RELEASE_FREE_ACCESS && !isAuthenticated) {
      openPlan('gold', 'Modo IA');
      return;
    }
    if (!activityPrompt.trim()) {
      setAiNotice(modeAiMessage(language, 'context'));
      setAiHasConsulted(false);
      return;
    }
    if (!selectedMode || activeActivity === null) return;
    const controller = new AbortController();
    aiRequestRef.current = controller;
    setAiLoading(true);
    setAiHasConsulted(false);
    setAiProposal('');
    setAiNotice(null);
    try {
      const response = await fetch(`${apiUrl}${isAuthenticated ? '/ai/mode' : '/ai/mode/public'}`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', ...(authTokens?.access_token ? { Authorization: `Bearer ${authTokens.access_token}` } : {}) },
        body: JSON.stringify({
          mode_name: modeName(selectedMode),
          language,
          level: activeActivity,
          level_name: localizedLevelNames[language][activeActivity],
          level_description: levelDescription(activeActivity),
          effort: effortLabel(activeActivity),
          context: activityPrompt.trim(),
          user_name: profileName,
        }),
      });
      const data: unknown = await response.json();
      const proposal = readModeAiProposal(data);
      if (!response.ok || !proposal) throw new Error('No valid activity proposal');
      if (controller.signal.aborted) return;
      setAiProposal(proposal);
      setAiHasConsulted(true);
      setAiNotice(null);
    } catch {
      if (controller.signal.aborted) return;
      setAiHasConsulted(false);
      setAiProposal('');
      setAiNotice(modeAiMessage(language, 'failed'));
    } finally {
      if (aiRequestRef.current === controller) {
        aiRequestRef.current = null;
        setAiLoading(false);
      }
    }
  };

  const saveModeAiActivity = () => {
    if (!selectedMode || activeActivity === null) return;
    if (!RELEASE_FREE_ACCESS && !isAuthenticated) {
      openPlan('gold', 'Modo IA');
      return;
    }
    if (aiLoading || !aiHasConsulted || !aiProposal.trim()) {
      setAiNotice(modeAiMessage(language, 'first'));
      return;
    }
    saveActivity(selectedMode.key, activeActivity, aiProposal);
  };

  const saveGlobalInsightActivity = () => {
    if (!cultInsightPreview) return;
    saveActivity(cultInsightPreview.modeKey, cultInsightPreview.level, cultInsightPreview.activity);
    setCultInsightPreview(null);
    setInsightNotice(tr('activitySavedToJourney'));
  };

  const regenerateGlobalInsight = (modeKey: string, level: number) => {
    if (selectedMode?.key === modeKey) {
      setInsightCycle((current) => current + 1);
      setInsightSlide(0);
      setInsightNotice(`${tr('regenerateInsight')}: 12.`);
      return;
    }
    const key = `${modeKey}-${level}`;
    const options = globalInsightVariantsByKey[key] ?? [];
    if (options.length < 2) return;
    const currentVariant = insightVariants[key] ?? 0;
    const nextVariant = (currentVariant + 1) % options.length;
    const nextInsight = options[nextVariant];
    setInsightVariants((current) => ({ ...current, [key]: nextVariant }));
    setInsightNotice(`${tr('regenerateInsight')}: ${nextInsight.author}.`);
  };

  const requestInsight = (modeKey: string, level: number) => {
    // The tutorial highlights this action but must never send a real alert.
    if (tourTopic || localIdeaOperation.current || level < 0 || level > 8 || level !== levels[modeKey]) return;
    const key = insightRequestKey(modeKey, level);
    const client = communityClient;
    if (!client) { setLocalIdeaNotice({ key, kind: 'login' }); return; }
    const controller = new AbortController(); localIdeaOperation.current = controller;
    localIdeaVersion.current++; setLocalIdeaBusy(true); setLocalIdeaNotice(null);
    void flushPersonalState().then(() => {
      if (controller.signal.aborted || localIdeaSession.current !== client) throw new DOMException('Session changed', 'AbortError');
      return client.requestIdea({ mode: modeKey, level }, controller.signal);
    }).then(result => {
      if (controller.signal.aborted || localIdeaSession.current !== client) return;
      localIdeaVersion.current++;
      setLocalIdeaRequests(current => ({ ...current, [key]: result }));
      const count = result.eligible_count ?? 0;
      setLocalIdeaNotice({ key, kind: 'result', count });
      if (count > 0) setInsightRequests(current => ({ ...current, [key]: true }));
    }).catch(error => {
      if (!controller.signal.aborted && localIdeaSession.current === client) setLocalIdeaNotice({ key, kind: error instanceof CommunityApiError && error.code === 'profile_private' ? 'profile' : 'failed' });
    }).finally(() => {
      if (localIdeaOperation.current === controller) { localIdeaOperation.current = null; setLocalIdeaBusy(false); }
    });
  };

  const saveActivity = (modeKey: string, level: number, activity: string) => {
    const key = `${modeKey}-${level}`;
    const next = { ...activityDrafts, [key]: activity };
    setActivityDrafts(next);
    if (activityDrafts[key]?.trim() !== activity.trim()) {
      setActivityAlignments(current => { const result = { ...current }; delete result[key]; return result; });
      setEvidenceDrafts(current => { const result = { ...current }; delete result[key]; return result; });
    }
    try {
      personalStorageRef.current.setItem('modoCultiva_activityDrafts', JSON.stringify(next));
    } catch {
      // The activity remains available for the current session.
    }
    setActiveActivity(null);
    restoreJourneyPosition();
  };

  const activityFlow = (modeKey: string, level: number): Omit<ActivityJourneyFlowProps, 'sourceLevel' | 'language'> => {
    const key = `${modeKey}-${level}`;
    const activity = activityDrafts[key] ?? '';
    const matching = communitySubmissions.filter(item => item.mode === modeKey && item.source_level === level && item.activity.trim() === activity.trim()).sort((a, b) => b.revision_number - a.revision_number)[0];
    return {
      activityKey: `${verifiedIdentity?.user_id ?? 'guest'}:${key}`,
      state: adaptActivityFlow({ activity, alignment: activityAlignments[key] ?? '', mode: modeKey, level, actor: verifiedIdentity?.user_id, submissions: communitySubmissions, evidenceDraft: evidenceDrafts[key], historical: legacyCompletionSlots.includes(key) || (!isAuthenticated && Boolean(activityCompletions[key])) }),
      targetSnapshot: matching && ['pending', 'changes_requested', 'approved'].includes(matching.status) ? { ...matching.rubric_snapshot.target, version: matching.rubric_version } : undefined,
      audience: cardAudienceDrafts[key] ?? matching?.audience ?? 'network',
      publishedAudience: matching?.audience ?? 'network',
      sharedCardId: matching?.shared_card_id ?? null,
      onAudienceChange: audience => setCardAudienceDrafts(current => ({ ...current, [key]: audience })),
      onSetAudience: communityClient && matching?.shared_card_id ? async (audience, publicConfirmed, signal) => {
        await flushPersonalState();
        if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
        await communityClient.setAudience(matching.shared_card_id!, audience, publicConfirmed, signal);
        if (!signal.aborted) await refreshCommunity(signal);
      } : undefined,
      onUnshare: communityClient && matching?.shared_card_id ? async signal => {
        await communityClient.unshare(matching.shared_card_id!, signal);
        if (!signal.aborted) await refreshCommunity(signal);
      } : undefined,
      onDefine: async (definition, signal) => {
        if (communityClient && matching && ['pending', 'changes_requested'].includes(matching.status)
          && (definition.activity.trim() !== matching.activity.trim() || definition.target_alignment.trim() !== matching.target_alignment.trim())) {
          // Definition changes retire the old immutable review, including an
          // alignment-only correction after community feedback. Votes never move.
          await communityClient.withdraw(matching.id, signal);
          if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
        }
        const drafts = { ...activityDrafts, [key]: definition.activity };
        const alignments = { ...activityAlignments, [key]: definition.target_alignment };
        setActivityDrafts(drafts); setActivityAlignments(alignments);
        persistedDocumentRef.current = { ...persistedDocumentRef.current, activityDrafts: drafts, activityAlignments: alignments };
        setEvidenceDrafts(current => { const next = { ...current }; delete next[key]; return next; });
        try { personalStorageRef.current.setItem('modoCultiva_activityDrafts', JSON.stringify(drafts)); personalStorageRef.current.setItem('modoCultiva_activityAlignments', JSON.stringify(alignments)); }
        catch { /* The session retains the definition; cloud save is independently confirmed. */ }
        if (communityClient) { await flushPersonalState(); if (!signal.aborted) await refreshCommunity(signal); }
      },
      onDraftChange: draft => setEvidenceDrafts(current => ({ ...current, [key]: { activity, draft } })),
      onSubmit: communityClient ? async (draft, signal) => {
        await flushPersonalState();
        if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
        const expected_activity_hash = await activitySha256(draft.activity);
        await communityClient.submit({ mode: modeKey, level, language, expected_activity_hash, evidence: draft.evidence, target_alignment: draft.target_alignment, audience: draft.audience, public_confirmed: draft.public_confirmed }, signal);
        if (!signal.aborted) await refreshCommunity(signal);
      } : undefined,
      onUploadVideo: communityClient ? async (file, signal) => {
        await flushPersonalState();
        if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
        return communityClient.uploadVideo(file, signal);
      } : undefined,
      onLoadVideo: communityClient?.loadVideo,
      disabled: isAuthenticated && !stateHydrated,
    };
  };

  useEffect(() => {
    let cancelled = false;
    // The MC entry opens Network first; the panel can then switch internally to
    // Activities. Preparing saved candidates is read-only, never publication.
    if (!communityOpen || !communityClient) { setCommunityShareCandidates([]); return; }
    void Promise.all(Object.entries(activityDrafts).flatMap(([key, activity]) => {
      const split = key.lastIndexOf('-'); const mode = key.slice(0, split); const level = Number(key.slice(split + 1));
      if (!modes.some(item => item.key === mode) || !Number.isInteger(level) || level < 0 || level > 8 || !activity.trim()) return [];
      const submission = communitySubmissions.filter(item => item.mode === mode && item.source_level === level && item.activity.trim() === activity.trim() && ['pending', 'changes_requested', 'approved'].includes(item.status)).sort((a, b) => b.revision_number - a.revision_number)[0];
      return [activitySha256(activity).then(expected_activity_hash => ({ mode, level, activity, expected_activity_hash, ...(submission ? { submission_id: submission.id } : {}) }))];
    })).then(candidates => { if (!cancelled) setCommunityShareCandidates(candidates); }).catch(() => { if (!cancelled) setCommunityShareCandidates([]); });
    return () => { cancelled = true; };
  }, [communityOpen, communityTab, communityClient, activityDrafts, communitySubmissions]);

  const closePublicCard = () => {
    setPublicCardId(null);
    const url = new URL(window.location.href);
    if (url.searchParams.has('community-card')) { url.searchParams.delete('community-card'); window.history.replaceState(window.history.state, '', url); }
  };

  const savePreset = () => {
    const name = presetName.trim();
    if (!name) {
      setPresetNotice(tr('presetNameRequired'));
      return;
    }
    const next = { ...presets, [name]: { ...levels } };
    setPresets(next);
    setSelectedPreset(name);
    personalStorageRef.current.setItem('modoCultiva_selectedPreset', name);
    setPresetName('');
    setPresetNotice(trf('presetSaved', { name }));
    try {
      personalStorageRef.current.setItem('modoCultiva_presets', JSON.stringify(next));
    } catch {
      // The preset remains available for the current session.
    }
  };

  const loadPreset = () => {
    if (!selectedPreset || !presets[selectedPreset]) {
      setPresetNotice(tr('presetSelectLoad'));
      return;
    }
    setLevels({ ...defaultLevels, ...presets[selectedPreset] });
    setPresetNotice(trf('presetLoaded', { name: selectedPreset }));
  };

  const beginPresetRename = () => {
    if (!selectedPreset || !presets[selectedPreset]) { setPresetNotice(tr('presetSelectRename')); return; }
    setPresetRenameName(selectedPreset);
    setPresetNotice(null);
    setRenamingPreset(true);
  };
  const commitPresetRename = () => {
    const result = renameLifeConfiguration(presets, selectedPreset, presetRenameName);
    if (!result.ok) {
      setPresetNotice(tr(result.reason === 'empty' ? 'presetNameRequired' : result.reason === 'duplicate' ? 'presetNameExists' : 'presetSelectRename'));
      return;
    }
    try {
      persistRenamedConfiguration(personalStorageRef.current, result.configurations, result.selectedName);
    } catch {
      setPresetNotice(tr('presetRenameFailed'));
      return;
    }
    setPresets(result.configurations);
    setSelectedPreset(result.selectedName);
    setRenamingPreset(false);
    setPresetNotice(trf('presetRenamed', { name: result.selectedName }));
  };
  useEffect(() => {
    if (renamingPreset) { presetRenameInputRef.current?.focus(); presetRenameInputRef.current?.select(); }
  }, [renamingPreset]);

  const deletePreset = () => {
    if (!selectedPreset || !presets[selectedPreset]) {
      setPresetNotice(tr('presetSelectDelete'));
      return;
    }
    const next = { ...presets };
    delete next[selectedPreset];
    setPresets(next);
    setSelectedPreset('');
    personalStorageRef.current.removeItem('modoCultiva_selectedPreset');
    setPresetNotice(tr('presetDeleted'));
    try {
      personalStorageRef.current.setItem('modoCultiva_presets', JSON.stringify(next));
    } catch {
      // The preset list remains available for the current session.
    }
  };

  const saveVisionImage = (modeKey: string, image: string) => {
    const next = { ...visionImages, [modeKey]: image };
    // Commit storage first: if full/unavailable, keep the previous image visible
    // and let the upload control explain that the replacement was not saved.
    personalStorageRef.current.setItem('modoCultiva_visionImages', JSON.stringify(next));
    setVisionImages(next);
  };

  const selectCultTab = (tab: CultTab) => {
    setCultTab(tab);
    if (tab === 'insights') setInsightNotice(null);
    window.requestAnimationFrame(() => {
      const panel = journeyPanelRef.current;
      const section = cultEmbeddedRef.current;
      if (!panel || !section) return;
      const panelRect = panel.getBoundingClientRect();
      const sectionRect = section.getBoundingClientRect();
      panel.scrollBy({ top: sectionRect.top - panelRect.top - 16, behavior: 'smooth' });
    });
  };

  const renderCultSection = () => {
    const promotedInsight = personalizedInsights[insightSlide] ?? personalizedInsights[0];
    const promotedMode = (promotedInsight ? modes.find((mode) => mode.key === promotedInsight.modeKey) : undefined) ?? modes[0]!;
    return <section ref={cultEmbeddedRef} className="cult-embedded" aria-labelledby="cult-embedded-title">
    <div className="cult-embedded-heading cult-global-hero" onPointerMove={(event) => {
      if (event.pointerType !== 'mouse') return;
      const bounds = event.currentTarget.getBoundingClientRect();
      event.currentTarget.style.setProperty('--global-pointer-x', `${((event.clientX - bounds.left) / bounds.width) * 100}%`);
      event.currentTarget.style.setProperty('--global-pointer-y', `${((event.clientY - bounds.top) / bounds.height) * 100}%`);
    }} onPointerLeave={(event) => {
      event.currentTarget.style.removeProperty('--global-pointer-x');
      event.currentTarget.style.removeProperty('--global-pointer-y');
    }}><div>
      <div className="cult-global-emblem" aria-hidden="true">
        <svg viewBox="0 0 160 110" fill="none" focusable="false">
          <circle className="cult-global-sphere" cx="80" cy="55" r="36" />
          <g className="cult-global-meridians">
            <ellipse cx="80" cy="55" rx="16" ry="36" />
            <ellipse cx="80" cy="55" rx="36" ry="13" />
            <path d="M49 37Q80 50 111 37M49 73Q80 60 111 73M80 19V91" />
          </g>
          <g className="cult-global-orbit">
            <ellipse cx="80" cy="55" rx="71" ry="26" transform="rotate(-22 80 55)" />
            <ellipse className="cult-global-signal" cx="80" cy="55" rx="71" ry="26" transform="rotate(-22 80 55)" />
          </g>
          <g className="cult-global-nodes">
            <circle cx="25" cy="74" r="3" /><circle cx="55" cy="29" r="2.5" />
            <circle cx="99" cy="47" r="3" /><circle cx="135" cy="36" r="3" />
            <circle cx="66" cy="84" r="2.5" /><circle cx="107" cy="79" r="2" />
          </g>
        </svg>
      </div>
      <h3 id="cult-embedded-title" className="cult-global-title">{tr('globalEyebrow')}</h3>
      <p className="cult-global-tagline">{tr('globalTitle')}</p>
      <p className="cult-embedded-subtitle">{tr('globalSubtitle')}</p>
    </div></div><div className="cult-embedded-divider" aria-hidden="true"><span /><i>{tr('globalEyebrowLine')}</i><span /></div>
     <nav className="cult-nav cult-nav--embedded" aria-label={tr('globalSection')}>{([['insights', tr('globalInsights')], ['network', tr('specialistNetwork')], ['badges', tr('badges')], ] as [CultTab, string][]).map(([tab, label]) => <button className={cultTab === tab ? 'cult-nav-button cult-nav-button--active' : 'cult-nav-button'} type="button" key={tab} onClick={() => selectCultTab(tab)}>{label}<span>↗</span></button>)}</nav>
    <div className="cult-embedded-content">
      {cultTab === 'insights' && <><div className="cult-section-heading"><div><p className="kicker">{tr('globalActivitiesEyebrow')}</p><h4>{tr('globalInsights')}</h4></div></div><p className="cult-section-copy">{tr('globalRecommendationsCopy')}</p><p className="demo-profile-notice">{onboardingIntegrationCopy(language).demoDetail}</p>{promotedInsight && <article className="cult-insight-spotlight" style={{ '--insight-color': promotedMode.color } as CSSProperties}><div className="cult-insight-spotlight-art">
        <span className="cult-insight-orbit" aria-hidden="true">
          <svg viewBox="0 0 120 120" fill="none" focusable="false">
            <circle className="cult-insight-orbit-ring" cx="60" cy="60" r="41" />
            <circle className="cult-insight-orbit-halo" cx="60" cy="60" r="52" />
            <g className="cult-insight-orbit-track">
              <ellipse cx="60" cy="60" rx="56" ry="23" transform="rotate(-28 60 60)" />
              <ellipse className="cult-insight-orbit-signal" cx="60" cy="60" rx="56" ry="23" transform="rotate(-28 60 60)" />
            </g>
            <circle className="cult-insight-orbit-node" cx="25" cy="41" r="2.5" />
            <circle className="cult-insight-orbit-node" cx="94" cy="79" r="2.5" />
          </svg>
          <span className="cult-insight-orbit-glyph">{promotedMode.icon}</span>
        </span>
        <small>{modeName(promotedMode)}</small>
      </div><div className="cult-insight-spotlight-copy"><div className="cult-insight-activity-top"><span>{modeName(promotedMode)} · {tr('level')} {promotedInsight.level} → {promotedInsight.level + 1}</span><small>{effortLabel(promotedInsight.level)}</small></div><h3>{promotedInsight.activity}</h3><p>{tr('globalSharedBy')} <strong>{promotedInsight.author}</strong> · {promotedInsight.location}</p><div className="cult-insight-actions"><button type="button" onClick={() => setCultInsightPreview(promotedInsight)}>{tr('globalAnalyzeSave')} <span>↗</span></button><button className="cult-insight-regenerate-button" type="button" onClick={() => regenerateGlobalInsight(promotedInsight.modeKey, promotedInsight.level)}><span aria-hidden="true">↻</span></button></div></div>{personalizedInsights.length > 1 && <div className="cult-insight-controls" aria-label={tr('globalInsights')}><button type="button" onClick={() => setInsightSlide((current) => (current - 1 + personalizedInsights.length) % personalizedInsights.length)} aria-label={tr('previous')}>←</button><div className="cult-insight-dots" aria-label={tr('globalInsights')}><span className="cult-insight-dot-list">{personalizedInsights.map((insight, index) => <button className={index === insightSlide ? 'is-active' : ''} key={`${insight.modeKey}-${insight.level}-${index}`} type="button" onClick={() => setInsightSlide(index)} aria-label={`${tr('globalInsights')} ${index + 1}`} />)}</span></div><button type="button" onClick={() => setInsightSlide((current) => (current + 1) % personalizedInsights.length)} aria-label={tr('next')}>→</button></div>}</article>}</>}
      {cultTab === 'network' && <><div className="cult-section-heading"><div><p className="kicker">{tr('specialistNetwork')}</p><h4>{tr('findYourNextGuide')}</h4></div><span className="cult-live-pill cult-live-pill--gold"><i /> {onboardingIntegrationCopy(language).demo}</span></div><div className="cult-filter-row"><select aria-label={tr('filterByMode')} value={specialistModeFilter} onChange={(event) => setSpecialistModeFilter(event.target.value)}><option value="all">{tr('allModes')}</option>{modes.map((mode) => <option key={mode.key} value={mode.key}>{modeName(mode)}</option>)}</select><select aria-label={tr('filterByLanguage')} value={specialistLanguageFilter} onChange={(event) => setSpecialistLanguageFilter(event.target.value)}><option value="all">{tr('anyLanguage')}</option>{specialistLanguages.map((language) => <option key={language} value={language}>{language}</option>)}</select><select aria-label={tr('filterByLocation')} value={specialistContinentFilter} onChange={(event) => setSpecialistContinentFilter(event.target.value)}><option value="all">{tr('anyContinent')}</option>{specialistContinents.map((continent) => <option key={continent} value={continent}>{continentLabel(continent)}</option>)}</select></div><div className="cult-specialist-list">{filteredSpecialists.length ? filteredSpecialists.map((specialist) => { const mode = modes.find((item) => item.key === specialist.modeKey)!; return <article key={specialist.name}><div className="cult-specialist-avatar">{specialist.name.slice(0, 1)}</div><div className="cult-specialist-copy"><strong>{specialist.name}</strong><small>{modeName(mode)} · {specialist.specialty}</small><p>{onboardingIntegrationCopy(language).demo} · {specialistLocation(specialist.location)}</p></div><div className="cult-match"><span>{specialist.match} {tr('matchLabel')}</span><small>{specialist.language} · {continentLabel(specialist.continent)}</small></div><button type="button" onClick={() => setSpecialistPreview(specialist)}>{tr('viewSpecialistProfile')} ↗</button></article>; }) : <div className="cult-empty-state">{tr('noSpecialistsMatch')}</div>}</div></>}
            {cultTab === 'skins' && <><div className="cult-section-heading"><div><p className="kicker">Identidad en movimiento</p><h4>Cambia la paleta de tu cultivo.</h4></div><span className="cult-live-pill"><i /> EXPERIENCIAS</span></div><section className="cult-skin-category" aria-labelledby="cult-filters-title"><div className="cult-skin-category-heading"><div><p className="kicker">Paletas de atmósfera</p><h5 id="cult-filters-title">Filtros</h5></div><span>2 EXPERIENCIAS</span></div><div className="cult-skin-grid cult-skin-grid--filters"><article className={`cult-skin-card${paletteFilter === 'nocturna' ? ' cult-skin-card--active' : ''}`}><div className="cult-skin-visual cult-skin-visual--nocturna"><span className="skin-card-glyph skin-card-glyph--owl" aria-hidden="true">🦉</span></div><div><strong>Night Owl</strong><p>{tr('nightOwlDescription')}</p><button type="button" onClick={() => activatePaletteFilter('nocturna')}>{paletteFilter === 'nocturna' ? tr('activeNow') : tr('activateFilter')}</button></div></article><article className={`cult-skin-card cult-skin-card--lucid${paletteFilter === 'lucid' ? ' cult-skin-card--active' : ''}`}><div className="cult-skin-visual cult-skin-visual--lucid"><span className="skin-card-glyph skin-card-glyph--dream" aria-hidden="true">◌</span></div><div><strong>Lucid</strong><p>{tr('lucidDescription')}</p><button type="button" onClick={() => activatePaletteFilter('lucid')}>{paletteFilter === 'lucid' ? tr('activeNow') : tr('activateFilter')}</button></div></article></div></section><section className="cult-skin-category" aria-labelledby="cult-skins-title"><div className="cult-skin-category-heading"><div><p className="kicker">Interfaces completas</p><h5 id="cult-skins-title">Skins</h5></div><span>{skinCatalog.length + 2} EXPERIENCIAS</span></div><div className="cult-skin-grid cult-skin-grid--skins"><article className={`cult-skin-card${skin === 'holista' ? ' cult-skin-card--active' : ''}`}><div className="cult-skin-visual cult-skin-visual--holista"><span>◌</span></div><div><strong>Holista</strong><p>La raíz original de Modo Cultiva.</p><button type="button" onClick={() => activateCultSkin('holista')}>{skin === 'holista' ? 'Activa ahora ✓' : 'Activar skin ↗'}</button></div></article><article className={`cult-skin-card${skin === 'dj' ? ' cult-skin-card--active' : ''}`}><div className="cult-skin-visual cult-skin-visual--dj"><span className="skin-card-glyph skin-card-glyph--faders" aria-hidden="true"><i /><i /><i /></span></div><div><strong>Consola DJ</strong><p>La mezcla perfecta para ecualizar la canción de tu vida.</p><button type="button" onClick={() => activateCultSkin('dj')}>{skin === 'dj' ? 'Activa ahora ✓' : 'Activar skin ↗'}</button></div></article>{skinCatalog.map((item) => <article className={`cult-skin-card cult-skin-card--${item.key}${skin === item.key ? ' cult-skin-card--active' : ''}`} key={item.key}><div className={`cult-skin-visual cult-skin-visual--${item.key}`}><span>{item.icon}</span></div><div><strong>{item.name}</strong><p>{item.description}</p><button type="button" onClick={() => activateCultSkin(item.key)}>{skin === item.key ? 'Activa ahora ✓' : 'Activar skin ↗'}</button></div></article>)}</div></section></>}
      {cultTab === 'badges' && <BadgesGallery language={language} tr={tr} progress={achievementProgress} featuredKeys={visibleFeaturedBadges}
        badges={cultBadgeCatalog.map(badge => ({ ...badge, title: badgeTitle(badge.key), description: badgeDescription(badge.key), earned: earnedBadges.some(item => item.key === badge.key), featured: visibleFeaturedBadges.includes(badge.key) }))}
        onFeature={toggleFeaturedBadge} onProfile={() => setProfilePreviewMode(true)} />}
    </div>
  </section>;
  };

  const dashboardSummary = useMemo(() => {
    const values = Object.values(levels);
    const strongest = modes.reduce((best, mode) => levels[mode.key] > levels[best.key] ? mode : best, modes[0]);
    const leastCultivated = [...modes].sort((left, right) => levels[left.key] - levels[right.key]).slice(0, 3);
    const low = values.filter((level) => level <= 2).length;
    const medium = values.filter((level) => level >= 3 && level <= 5).length;
    const high = values.filter((level) => level >= 6).length;
    const definedActivities = Object.keys(activityDrafts).length;
    const score = values.reduce((sum, value) => sum + value, 0) / values.length;
    return { strongest, leastCultivated, low, medium, high, definedActivities, score, presetCount: Object.keys(presets).length };
  }, [activityDrafts, levels, presets]);

  const accountBlocked = signingOut || (isAuthenticated && (!stateHydrated || !verifiedIdentity || activeSessionRef.current !== authTokens?.access_token));

  return (
    <main key={language} className={`app-shell app-shell--${skin}${skin === 'holista' || paletteFilter === 'none' ? '' : ` app-shell--${paletteFilter}`}`}>
      <header className="topbar">
        <a className="brand" href="/" aria-label="Modo Cultiva, inicio">
          <img src={logo} alt="Modo Cultiva" />
          <span>Modo Cultiva</span>
        </a>
        <div className="topbar-meta">{tr('lifeModes')}</div>
        <div className="topbar-actions">
          <label className="language-picker"><span className="sr-only">{tr('chooseLanguage')}</span><select value={language} onChange={(event) => handleLanguageChange(event.target.value as Language)} aria-label={tr('chooseLanguage')}>{supportedLanguages.map((code) => <option key={code} value={code}>{languageNames[code]}</option>)}</select><svg viewBox="0 0 12 12" width="10" height="10" fill="none" aria-hidden="true"><path d="m3 4.5 3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg></label>
          <PwaControls language={language} />
          <div className="profile-menu" ref={profileMenuRef}><button className="profile-button" type="button" aria-label={tr('openProfileMenu')} aria-expanded={profileMenuOpen} aria-haspopup="menu" aria-controls="profile-menu-dropdown" onClick={() => setProfileMenuOpen((open) => !open)}>MC</button>{profileMenuOpen && <div className="profile-menu-dropdown" id="profile-menu-dropdown" role="menu">
            <button type="button" role="menuitem" data-tour="replay" disabled={aiLoading} onClick={startTour}>{onboardingIntegrationCopy(language).replay} <span aria-hidden="true">↗</span></button>
            <button type="button" role="menuitem" onClick={() => { setProfileMenuOpen(false); setCommunityTab('network'); setCommunityOpen(true); }}>{onboardingIntegrationCopy(language).network} <span aria-hidden="true">↗</span></button>
            {isAuthenticated ? <button type="button" role="menuitem" onClick={() => { setProfileMenuOpen(false); void logout(); }}>{tr('logout')}</button> : <button type="button" role="menuitem" onClick={() => { setProfileMenuOpen(false); setPendingAccess(null); setRegistering(false); setView('login'); }}>{tr('login')}</button>}{!RELEASE_FREE_ACCESS && <button type="button" role="menuitem" onClick={() => { setProfileMenuOpen(false); setPendingAccess(null); setSelectedPlan(null); setView('plans'); }}>{tr('premium')}</button>}</div>}</div>
        </div>
        {isAuthenticated && <span className={`state-sync-state state-sync-state--${stateSyncStatus}`} role="status">{tr(stateSyncStatus === 'syncing' ? 'syncState' : stateSyncStatus === 'synced' ? 'syncReady' : 'syncFailed')}</span>}
      </header>

      {view === 'login' ? (
        <section className="login-view" data-layer="inicio" aria-labelledby="login-title">
          <div className="login-card">
            <div className="login-brand"><img src={logo} alt="Modo Cultiva" /><span>Modo Cultiva</span></div>
            <p className="kicker">{pendingAccess ? 'Acceso contextual' : 'Tu mapa de vida comienza aquí'}</p>
            <h1 id="login-title">{pendingAccess ? 'Desbloquea esta función.' : tr('welcome')}</h1>
            <p className="login-copy">{pendingAccess ? `${pendingAccess.feature} forma parte del plan ${pendingAccess.plan}. Crea tu cuenta o inicia sesión para continuar.` : 'Inicia sesión para guardar tu progreso y continuar cultivando tus 12 modos de vida.'}</p>
            <form className="login-form" onSubmit={(event) => { event.preventDefault(); void submitAuthentication(); }}>
              {registering && <label htmlFor="login-name">{tr('name')}<input id="login-name" autoComplete="name" value={loginName} onChange={(event) => setLoginName(event.target.value)} placeholder={tr('name')} required /></label>}
              <label htmlFor="login-username">{tr('email')}<input id="login-username" type="email" autoComplete="email" value={loginUsername} onChange={(event) => setLoginUsername(event.target.value)} placeholder="tu@correo.com" required /></label>
              <label htmlFor="login-password">{tr('password')}<input id="login-password" type="password" autoComplete="current-password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} placeholder={tr('password')} required minLength={8} /></label>
              {authError && <p className="form-error" role="alert">{authError}</p>}
              <button className="login-submit" type="submit">{registering ? tr('createAccount') : tr('login')} <span>↗</span></button>
            </form>
            <button className="login-back-link" type="button" onClick={() => { setRegistering((current) => !current); setAuthError(null); }}>{registering ? 'Ya tengo una cuenta · Iniciar sesión' : 'Crear una cuenta nueva'}</button>
            {pendingAccess && <button className="login-back-link" type="button" onClick={() => { setPendingAccess(null); setPendingActivity(null); setInsightPreview(null); setView('welcome'); }}><span>←</span> Continuar como invitado</button>}
          </div>
        </section>
      ) : view === 'plans' ? (
        <section className="plans-view" data-layer="plans" aria-labelledby="plans-title">
          <div className="plans-header"><p className="kicker">Tu siguiente nivel comienza aquí</p><h1 id="plans-title">Haz de tu crecimiento una forma de vida.</h1><p>Elige el ritmo, la profundidad y la comunidad que quieres llevar contigo en Modo Cultiva.</p></div>
          <div className="plans-grid" aria-label="Modos Premium de Modo Cultiva">{(Object.keys(planDetails) as PlanKey[]).map((plan) => <button className={plan === 'gold' ? 'plan-card plan-card--featured' : 'plan-card'} type="button" key={plan} onClick={() => { setActivePlan(plan); personalStorageRef.current.setItem('modoCultiva_plan', plan); setSelectedPlan(plan); }}><span className="plan-card-name">{planDetails[plan].name}</span><strong>{planDetails[plan].price}</strong><p>{planDetails[plan].promise}</p><span className="plan-card-link">Ver beneficios completos ↗</span></button>)}</div>
          <button className="plans-signup" type="button" onClick={() => { setPendingAccess(null); setSelectedPlan(null); setView('login'); }}>Crea tu cuenta <span>→</span></button>
        </section>
      ) : view === 'lab' ? (
        <section className="modo-lab-view" data-layer="modo-lab" aria-labelledby="modo-lab-title">
          <div className="modo-lab-topline"><button className="modo-lab-dashboard-back" type="button" onClick={() => setView('dashboard')}>← {tr('returnToControlCenter')}</button></div>
          <header className="modo-lab-hero"><div><p className="kicker">{tr('triviaHeroEyebrow')}</p><h1 id="modo-lab-title">{tr('triviaHeroTitle')}</h1><p>{tr('triviaHeroCopy')}</p></div></header>
          <div className="modo-lab-guide"><span>01</span><p>{tr('triviaGuide')}</p></div>
          <div className="modo-lab-grid">{modes.map((mode) => { const flipped = labFlippedCard === mode.key; return <article className={`modo-lab-card${flipped ? ' modo-lab-card--flipped' : ''}`} key={mode.key} style={{ '--lab-color': mode.color, '--lab-accent': mode.accent } as CSSProperties}><div className="modo-lab-card-inner"><div className="modo-lab-face modo-lab-front"><div className="modo-lab-card-top"><span>{mode.roman}</span><small>{tr('triviaCardLabel')} {mode.roman}</small></div><div className="modo-lab-icon">{mode.icon}</div><p className="modo-lab-label">{tr('triviaQuestionLabel')}</p><h2>{triviaQuestion(mode)}</h2><p className="modo-lab-mode">{modeName(mode)}</p><button type="button" onClick={() => setLabFlippedCard(flipped ? null : mode.key)}>{tr('triviaFlip')} <span>↗</span></button></div><div className="modo-lab-face modo-lab-back"><div className="modo-lab-card-top"><span>↺</span><small>{tr('triviaDiscovery')}</small></div><p className="modo-lab-label">{tr('triviaInfo')}</p><h2>{modeName(mode)}</h2><p className="modo-lab-answer">{triviaAnswer(mode)}</p><div className="modo-lab-description"><span>{mode.icon}</span>{modeDescription(mode)}</div><button type="button" onClick={() => setLabFlippedCard(null)}>{tr('triviaBack')} <span>↺</span></button></div></div></article>; })}</div>
        </section>
      ) : view === 'cult' ? (
        <section className="cult-view" data-layer="6" aria-labelledby="cult-title">
          <div className="cult-topline"><button className="cult-exit" type="button" onClick={() => setView('plans')}>← {tr('premium')}</button><span className="cult-access"><i /> {tr('globalName').toUpperCase()} · ULTIMATE MODE</span><span className="cult-layer-mark">{tr('globalName').toUpperCase()}</span></div>
          <header className="cult-hero"><div><p className="kicker">{tr('globalEyebrow')}</p><h1 id="cult-title">{tr('globalTitle')}</h1><p>{tr('globalSubtitle')}</p></div><div className="cult-orbit-mark"><span>∞</span><small>FULL<br />ACCESS</small></div></header>
          <nav className="cult-nav" aria-label={tr('globalSection')}>{([['insights', tr('globalInsights')], ['network', tr('specialistNetwork')], ['badges', tr('badges')], ] as [CultTab, string][]).map(([tab, label]) => <button className={cultTab === tab ? 'cult-nav-button cult-nav-button--active' : 'cult-nav-button'} type="button" key={tab} onClick={() => setCultTab(tab)}>{label}<span>↗</span></button>)}</nav>
          <div className="cult-layout"><main className="cult-main">
            {cultTab === 'home' && <><div className="cult-section-heading"><div><p className="kicker">Panel ULTIMATE MODE</p><h2>Todo tu potencial, en un solo nodo.</h2></div><span className="cult-live-pill"><i /> LIVE NETWORK</span></div><div className="cult-metric-grid"><article className="cult-metric cult-metric--wide"><span className="cult-metric-icon">✦</span><div><small>MODO IA · USO JUSTO</small><strong>Sin límites artificiales</strong><p>Contextualiza, consulta y establece actividades con una inteligencia que entiende tus 12 modos.</p></div><b>∞</b></article><article className="cult-metric"><small>INSIGHTS</small><strong>Global</strong><p>Conecta con estrategias de cultivo más allá de tu círculo.</p><span className="cult-metric-line" /></article><article className="cult-metric"><small>PROFESSIONAL</small><strong>Verified</strong><p>Encuentra orientación de especialistas por modo.</p><span className="cult-metric-line cult-metric-line--gold" /></article></div><div className="cult-feature-grid"><article><span>01 · TU RED</span><h3>Cultiva acompañado.</h3><p>Descubre recomendaciones comunitarias y comparte presets con tu red de apoyo.</p><button type="button" onClick={() => setCultTab('insights')}>Explorar Insights <span>→</span></button></article><article><span>02 · TU PRÓXIMO NIVEL</span><h3>Habla con experiencia.</h3><p>Solicita orientación privada y sigue el progreso de las recomendaciones profesionales.</p><button type="button" onClick={() => setCultTab('network')}>Encontrar especialistas <span>→</span></button></article></div></>}
             {cultTab === 'insights' && <><div className="cult-section-heading"><div><p className="kicker">Actividades compartidas por la comunidad</p><h2>Insights Globales.</h2></div><span className="cult-live-pill"><i /> {globalInsightActivities.length} ACTIVIDADES</span></div><p className="cult-section-copy">Descubre las prácticas que otras personas han realizado para avanzar de un nivel al siguiente en cada Modo. Abre una tarjeta para analizarla y guardarla en tu journey.</p>{insightNotice && <div className="insight-notice" role="status">✦ {insightNotice}<button type="button" onClick={() => setInsightNotice(null)} aria-label="Cerrar aviso">×</button></div>}<div className="cult-insight-grid">{globalInsightActivities.map((insight) => { const displayedInsight = localizeGlobalInsight(globalInsightVariantsByKey[`${insight.modeKey}-${insight.level}`]?.[insightVariants[`${insight.modeKey}-${insight.level}`] ?? 0] ?? insight); const mode = modes.find((item) => item.key === displayedInsight.modeKey)!; return <article className="cult-insight-activity" key={`${displayedInsight.modeKey}-${displayedInsight.level}`} style={{ '--insight-color': mode.color } as CSSProperties}><div className="cult-insight-activity-top"><span>{mode.icon} {mode.name}</span><small>NIVEL {displayedInsight.level} → {displayedInsight.level + 1}</small></div><h3>{displayedInsight.activity}</h3><div className="cult-insight-actions"><button type="button" onClick={() => setCultInsightPreview(displayedInsight)}>Analizar actividad <span>↗</span></button><button className="cult-insight-regenerate-button" type="button" onClick={() => regenerateGlobalInsight(displayedInsight.modeKey, displayedInsight.level)} aria-label={tr('regenerateInsight')} title={tr('regenerateInsight')}><span aria-hidden="true">↻</span></button></div></article>; })}</div></>}
            {cultTab === 'network' && <><div className="cult-section-heading"><div><p className="kicker">{tr('specialistNetwork')}</p><h2>{tr('findYourNextGuide')}</h2></div><span className="cult-live-pill cult-live-pill--gold"><i /> {onboardingIntegrationCopy(language).demo}</span></div><div className="cult-filter-row"><select aria-label={tr('filterByMode')} value={specialistModeFilter} onChange={(event) => setSpecialistModeFilter(event.target.value)}><option value="all">{tr('allModes')}</option>{modes.map((mode) => <option key={mode.key} value={mode.key}>{modeName(mode)}</option>)}</select><select aria-label={tr('filterByLanguage')} value={specialistLanguageFilter} onChange={(event) => setSpecialistLanguageFilter(event.target.value)}><option value="all">{tr('anyLanguage')}</option>{specialistLanguages.map((language) => <option key={language} value={language}>{language}</option>)}</select><select aria-label={tr('filterByLocation')} value={specialistContinentFilter} onChange={(event) => setSpecialistContinentFilter(event.target.value)}><option value="all">{tr('anyContinent')}</option>{specialistContinents.map((continent) => <option key={continent} value={continent}>{continentLabel(continent)}</option>)}</select></div><div className="cult-specialist-list">{filteredSpecialists.length ? filteredSpecialists.map((specialist) => { const mode = modes.find((item) => item.key === specialist.modeKey)!; return <article key={specialist.name}><div className="cult-specialist-avatar">{specialist.name.slice(0, 1)}</div><div className="cult-specialist-copy"><strong>{specialist.name}</strong><small>{modeName(mode)} · {specialist.specialty}</small><p>{onboardingIntegrationCopy(language).demo} · {specialistLocation(specialist.location)}</p></div><div className="cult-match"><span>{specialist.match} {tr('matchLabel')}</span><small>{specialist.language} · {continentLabel(specialist.continent)}</small></div><button type="button" onClick={() => setSpecialistPreview(specialist)}>{tr('viewSpecialistProfile')} ↗</button></article>; }) : <div className="cult-empty-state">{tr('noSpecialistsMatch')}</div>}</div></>}
            {cultTab === 'skins' && <><div className="cult-section-heading"><div><p className="kicker">Identidad en movimiento</p><h2>Cambia la paleta de tu cultivo.</h2></div><span className="cult-live-pill"><i /> {skinCatalog.length + 4} DISPONIBLES</span></div><section className="cult-skin-category" aria-labelledby="cult-filters-title"><div className="cult-skin-category-heading"><div><p className="kicker">Paletas de atmósfera</p><h3 id="cult-filters-title">Filtros</h3></div><span>2 EXPERIENCIAS</span></div><div className="cult-skin-grid cult-skin-grid--filters"><article className={`cult-skin-card${paletteFilter === 'nocturna' ? ' cult-skin-card--active' : ''}`}><div className="cult-skin-visual cult-skin-visual--nocturna"><span className="skin-card-glyph skin-card-glyph--owl" aria-hidden="true">🦉</span></div><div><strong>Night Owl</strong><p>{tr('nightOwlDescription')}</p><button type="button" onClick={() => activatePaletteFilter('nocturna')}>{paletteFilter === 'nocturna' ? tr('activeNow') : tr('activateFilter')}</button></div></article><article className={`cult-skin-card cult-skin-card--lucid${paletteFilter === 'lucid' ? ' cult-skin-card--active' : ''}`}><div className="cult-skin-visual cult-skin-visual--lucid"><span className="skin-card-glyph skin-card-glyph--dream" aria-hidden="true">◌</span></div><div><strong>Lucid</strong><p>{tr('lucidDescription')}</p><button type="button" onClick={() => activatePaletteFilter('lucid')}>{paletteFilter === 'lucid' ? tr('activeNow') : tr('activateFilter')}</button></div></article></div></section><section className="cult-skin-category" aria-labelledby="cult-skins-title"><div className="cult-skin-category-heading"><div><p className="kicker">Interfaces completas</p><h3 id="cult-skins-title">Skins</h3></div><span>{skinCatalog.length + 2} EXPERIENCIAS</span></div><div className="cult-skin-grid cult-skin-grid--skins"><article className={`cult-skin-card${skin === 'holista' ? ' cult-skin-card--active' : ''}`}><div className="cult-skin-visual cult-skin-visual--holista"><span>◌</span></div><div><strong>Holista</strong><p>La raíz original de Modo Cultiva.</p><button type="button" onClick={() => activateCultSkin('holista')}>{skin === 'holista' ? 'Activa ahora ✓' : 'Activar skin ↗'}</button></div></article><article className={`cult-skin-card${skin === 'dj' ? ' cult-skin-card--active' : ''}`}><div className="cult-skin-visual cult-skin-visual--dj"><span className="skin-card-glyph skin-card-glyph--faders" aria-hidden="true"><i /><i /><i /></span></div><div><strong>Consola DJ</strong><p>La mezcla perfecta para ecualizar la canción de tu vida.</p><button type="button" onClick={() => activateCultSkin('dj')}>{skin === 'dj' ? 'Activa ahora ✓' : 'Activar skin ↗'}</button></div></article>{skinCatalog.map((item) => <article className={`cult-skin-card cult-skin-card--${item.key}${skin === item.key ? ' cult-skin-card--active' : ''}`} key={item.key}><div className={`cult-skin-visual cult-skin-visual--${item.key}`}><span>{item.icon}</span></div><div><strong>{item.name}</strong><p>{item.description}</p><button type="button" onClick={() => activateCultSkin(item.key)}>{skin === item.key ? 'Activa ahora ✓' : 'Activar skin ↗'}</button></div></article>)}</div></section></>}
          </main><aside className="cult-rail"><div className="cult-status-card"><span className="cult-status-label">TU ESTATUS</span><div className="cult-badge">U</div><h3>ULTIMATE MODE</h3><p>{tr('globalTitle')}</p><div className="cult-status-rule" /><span className="cult-status-label">TU RED</span><strong>24 conexiones</strong><small>+6 esta semana</small></div><div className="cult-rail-card"><span className="cult-status-label">PRÓXIMO EN TU RUTA</span><strong>{modeName(modes[11])}</strong><p>3 recomendaciones esperan tu revisión.</p><button type="button" onClick={() => setCultTab('insights')}>{tr('recommendations')} →</button></div><div className="cult-quote">“No cultivas una sola versión de ti.<br /><strong>Cultivas todas.</strong>”</div></aside></div>
        </section>
      ) : view === 'welcome' ? (
        <section className={`welcome-view${skin === 'dj' ? ' welcome-view--dj' : ' welcome-view--polished'}`} data-layer="home" aria-labelledby="welcome-title">
          <div className="welcome-copy">
            <p className="kicker">{tr('welcome')}</p>
            <h1 id="welcome-title">Cultiva todos tus modos.</h1>
            <p className="intro-copy">{tr('welcomeOverviewCopy')}</p>
          </div>
          <div className="home-profile-bar">
            <button className="home-profile-card" type="button" onClick={() => setProfilePreviewMode(true)} aria-label={tr('profileButton')}>
              <span className="home-profile-avatar" style={profileImage ? { backgroundImage: `linear-gradient(180deg, rgba(4, 18, 29, .08), rgba(4, 18, 29, .32)), url(${profileImage})` } : undefined}>{!profileImage && <span>{displayedProfileName ? displayedProfileName.slice(0, 1).toUpperCase() : <CultivaLeaf />}</span>}</span>
              <span className="home-profile-copy"><strong>{displayedProfileName || tr('welcome')}</strong>{displayedProfileRole && <small>{displayedProfileRole}</small>}</span>
              <span className="home-profile-action">{tr('profileButton')} <b>↗</b></span>
            </button>
            <button ref={configurationsTriggerRef} className="home-presets-button" type="button" onClick={() => setConfigurationsOpen(true)} aria-haspopup="dialog" aria-controls="life-configurations-card"><span aria-hidden="true">✦</span>{tr('presets')}<b aria-hidden="true">↗</b></button>
          </div>
          <div className="home-mode-grid" aria-label={tr('lifeModes')}>
            {modes.map((mode) => {
              const level = levels[mode.key];
              return <button className="home-mode-card" data-tour-mode={mode.key} key={mode.key} type="button" onClick={() => openMode(mode)} style={{ '--mode-color': mode.color, '--mode-accent': mode.accent } as CSSProperties} aria-label={`${modeName(mode)}, ${tr('level')} ${level}`}>
                <span className="home-mode-card-top"><span className="home-mode-icon" aria-hidden="true">{mode.icon}</span><span className="home-mode-roman">{mode.roman}</span></span>
                <strong className="home-mode-name">{modeShortName(mode)}</strong>
                <span className="home-mode-summary"><b>{tr('level')} {level}</b><small>{localizedLevelNames[language][level]}</small></span>
                <span className="home-mode-meter" aria-hidden="true">{Array.from({ length: 9 }, (_, index) => <i key={index} className={index < level ? 'is-active' : undefined} />)}</span>
                <span className="home-mode-description">{modeDescription(mode)}</span>
                <span className="home-mode-arrow" aria-hidden="true">↗</span>
              </button>;
            })}
          </div>
          <div className="overview-dashboard-entry">
            <button className="overview-dashboard-cta" type="button" onClick={() => setView('dashboard')}>{tr('controlCenter')} <span aria-hidden="true">↗</span></button>
          </div>
        </section>
      ) : (
      <>
      <section className="intro" data-layer="2" aria-labelledby="dashboard-title">
        <button className="back-to-overview dashboard-back" type="button" onClick={() => setView('welcome')}>← {tr('returnToOverview')}</button>
        <div>
          <p className="kicker">{tr('dashboard')}</p>
          <h1 id="dashboard-title">{tr('dashboardTitle')}</h1>
          <p className="intro-copy">{tr('dashboardIntro')}</p>
        </div>
      </section>

      <section className="crm-dashboard" aria-label={tr('dashboardTitle')}>
        <article className="crm-card crm-card--score">
          <div className="crm-card-heading"><h2 className="crm-eyebrow">{tr('progressAtGlance')}</h2></div>
          <div className="crm-score-layout">
            <div className="crm-score-stage">
              <svg className="crm-score-leaf" viewBox="0 0 340 280" fill="none" aria-hidden="true" focusable="false">
                <defs>
                  <linearGradient id="score-leaf-metal" x1="60" y1="58" x2="265" y2="233" gradientUnits="userSpaceOnUse"><stop stopColor="#074b27" /><stop offset=".22" stopColor="#1db65a" /><stop offset=".36" stopColor="#8af7a2" /><stop offset=".43" stopColor="#37ba69" /><stop offset=".56" stopColor="#096238" /><stop offset=".78" stopColor="#073b27" /><stop offset="1" stopColor="#1c9b4a" /></linearGradient>
                  <linearGradient id="score-leaf-fold" x1="85" y1="216" x2="272" y2="45" gradientUnits="userSpaceOnUse"><stop stopColor="#0e5331" stopOpacity=".15" /><stop offset=".5" stopColor="#001e13" stopOpacity=".5" /><stop offset="1" stopColor="#b5ffc2" stopOpacity=".2" /></linearGradient>
                  <linearGradient id="score-leaf-edge" x1="65" y1="58" x2="273" y2="230" gradientUnits="userSpaceOnUse"><stop stopColor="#d8ffcc" /><stop offset=".28" stopColor="#72ff9a" /><stop offset=".6" stopColor="#23c466" stopOpacity=".4" /><stop offset="1" stopColor="#83ff9d" /></linearGradient>
                  <linearGradient id="score-leaf-sheen"><stop stopColor="#caffb8" stopOpacity="0" /><stop offset=".5" stopColor="#caffb8" stopOpacity=".24" /><stop offset="1" stopColor="#caffb8" stopOpacity="0" /></linearGradient>
                  <radialGradient id="score-leaf-shade" cx="170" cy="140" r="96" gradientUnits="userSpaceOnUse"><stop stopColor="#002712" stopOpacity=".52" /><stop offset=".55" stopColor="#002712" stopOpacity=".35" /><stop offset="1" stopColor="#002712" stopOpacity="0" /></radialGradient>
                  <radialGradient id="score-leaf-clear" cx="50%" cy="47%" r="42%"><stop offset=".35" stopColor="black" /><stop offset="1" stopColor="white" /></radialGradient>
                  <mask id="score-leaf-vein-mask"><rect width="340" height="280" fill="url(#score-leaf-clear)" /></mask>
                  <path id="score-leaf-shape" pathLength="100" d={CULTIVA_LEAF_SHAPE} />
                  <clipPath id="score-leaf-clip"><use href="#score-leaf-shape" /></clipPath>
                </defs>
                <g className="crm-score-leaf-body">
                  <path d="M37 258C51 244 58 234 70 220" stroke="url(#score-leaf-edge)" strokeWidth="3" strokeLinecap="round" />
                  <use href="#score-leaf-shape" fill="url(#score-leaf-metal)" stroke="url(#score-leaf-edge)" strokeWidth="1.5" />
                  <path d="M62 230C115 173 205 101 284 22C294 84 280 150 237 190C193 231 130 253 62 230Z" fill="url(#score-leaf-fold)" />
                  <use href="#score-leaf-shape" fill="url(#score-leaf-shade)" />
                  <g mask="url(#score-leaf-vein-mask)" stroke="#baffbc" strokeLinecap="round">
                    <path d="M63 230C115 174 202 104 284 22" strokeWidth="1.6" opacity=".7" />
                    <path d="M89 202Q65 161 75 111M121 172Q93 118 117 65M159 138Q137 86 167 43M198 101Q186 68 215 43M91 202Q151 220 187 216M122 171Q188 192 231 184M161 137Q222 153 263 136M201 98Q246 104 279 77" strokeWidth=".85" opacity=".5" />
                  </g>
                  <g clipPath="url(#score-leaf-clip)"><path className="crm-score-leaf-sheen" d="M-40 0H22L150 280H88Z" fill="url(#score-leaf-sheen)" /></g>
                  <use className="crm-score-leaf-light" href="#score-leaf-shape" stroke="#c4ffb8" strokeWidth="1.5" strokeDasharray="4 96" strokeLinecap="round" />
                </g>
              </svg>
              <div className="score-orbit score-orbit--large" aria-label={trf('currentScoreAria', { level: cultivaLevelLabel, max: String(CULTIVA_MAX_LEVEL) })}><strong>{cultivaLevelLabel}</strong><small>{trf('scoreMax', { max: String(CULTIVA_MAX_LEVEL) })}</small></div>
            </div>
            <div className="crm-score-context"><strong>{tr('currentCultivaLevel')}</strong></div>
          </div>
        </article>
        <div className="crm-metric-grid">
          <article className="crm-card crm-metric-card"><span className="crm-eyebrow">{tr('strongestMode')}</span><strong>{modeShortName(dashboardSummary.strongest)}</strong><span>{trf('strongestModeDetail', { level: String(levels[dashboardSummary.strongest.key]) })}</span></article>
          <article className="crm-card crm-metric-card"><span className="crm-eyebrow">{tr('leastCultivatedMode')}</span><strong>{modeShortName(dashboardSummary.leastCultivated[0])}</strong><span>{trf('leastCultivatedModeDetail', { level: String(levels[dashboardSummary.leastCultivated[0].key]) })}</span></article>
          <article className="crm-card crm-metric-card"><span className="crm-eyebrow">{tr('definedActivities')}</span><strong>{dashboardSummary.definedActivities}<small> / 108</small></strong><span>{tr('definedActivitiesDetail')}</span></article>
          <article className="crm-card crm-metric-card"><span className="crm-eyebrow">{tr('activeLifePresets')}</span><strong>{dashboardSummary.presetCount}</strong><span>{tr('activeLifePresetsDetail')}</span></article>
        </div>
        <article className="crm-card crm-distribution-card"><div className="crm-card-heading"><div><span className="crm-eyebrow">{tr('presenceDistribution')}</span><h2>{tr('energyQuestion')}</h2></div></div><div className="crm-distribution"><div><span className="crm-distribution-bar"><i style={{ width: `${(dashboardSummary.low / 12) * 100}%` }} /></span><strong>{dashboardSummary.low}</strong><small>{tr('startingRange')}</small></div><div><span className="crm-distribution-bar crm-distribution-bar--medium"><i style={{ width: `${(dashboardSummary.medium / 12) * 100}%` }} /></span><strong>{dashboardSummary.medium}</strong><small>{tr('practiceRange')}</small></div><div><span className="crm-distribution-bar crm-distribution-bar--high"><i style={{ width: `${(dashboardSummary.high / 12) * 100}%` }} /></span><strong>{dashboardSummary.high}</strong><small>{tr('expansionRange')}</small></div></div></article>
        <div className="crm-bottom-grid">
          <article className="crm-card crm-focus-card"><div className="crm-card-heading"><div><span className="crm-eyebrow">{tr('nextFocus')}</span><h2>{tr('areasToCultivate')}</h2></div></div><div className="crm-focus-list">{dashboardSummary.leastCultivated.map((mode) => <button type="button" key={mode.key} onClick={() => openMode(mode)} style={{ '--mode-color': mode.color } as CSSProperties}><span className="crm-focus-icon">{mode.icon}</span><span><strong>{modeShortName(mode)}</strong><small>{modeDescription(mode)}</small></span><b>{tr('level').toUpperCase()} {levels[mode.key]} ↗</b></button>)}</div></article>
          <article className="crm-card crm-trivia-card"><div><span className="crm-eyebrow">{tr('triviaTitle').toUpperCase()}</span><h2>{tr('triviaTitle')}</h2><p>{tr('triviaSubtitle')}</p></div><button type="button" onClick={() => setView('lab')}>{tr('triviaCta')} <span>↗</span></button></article>
        </div>
        <article className="crm-card crm-next-card crm-next-card--final"><div><span className="crm-eyebrow">{tr('nextMovement')}</span><h2>{tr('continueCultivation')}</h2><p>{tr('continueCultivationCopy')}</p></div><button className="crm-life-map-button configuration-orbit" type="button" onClick={() => setView('welcome')} aria-label={tr('returnMyLifeMap')}>
          <span className="configuration-orbit-trail" aria-hidden="true" />
          <span className="configuration-orbit-core" aria-hidden="true"><span>↗</span><strong>{tr('returnMyLifeMap')}</strong><small>{tr('lifeModes')}</small></span>
          {modes.map((mode, index) => <span className="configuration-orbit-node" key={mode.key} title={`${modeShortName(mode)} · ${tr('level')} ${levels[mode.key]}`} style={{ '--orbit-angle': `${index * 30}deg`, '--orbit-color': mode.color } as CSSProperties} aria-hidden="true"><i>{mode.icon}</i><b>{levels[mode.key]}</b></span>)}
        </button></article>
      </section>
      </>
      )}

      {configurationsOpen && <dialog ref={configurationsDialogRef} id="life-configurations-card" className="life-configurations-card" aria-labelledby="presets-title" aria-describedby="presets-description" tabIndex={-1} onCancel={(event) => { event.preventDefault(); if (renamingPreset) setRenamingPreset(false); else setConfigurationsOpen(false); }} onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) setConfigurationsOpen(false);
      }}>
        <button className="close-journey" type="button" onClick={() => setConfigurationsOpen(false)} aria-label={tr('close')}>×</button>
        <div className="configuration-heading"><p className="kicker">{tr('savedConfigurationsEyebrow')}</p><h2 id="presets-title">{tr('presets')}</h2><p id="presets-description">{tr('savedPresetDescription')}</p></div>
        <div className="configuration-composition">
          <div className="configuration-orbit" role="img" aria-label={`${tr('levelMap')}: ${modes.map((mode) => `${modeShortName(mode)} ${levels[mode.key]}`).join(', ')}`}>
            <span className="configuration-orbit-trail" aria-hidden="true" />
            <div className="configuration-orbit-core" aria-hidden="true"><span>✦</span><strong>{tr('currentMap')}</strong><small>{tr('lifeModes')}</small></div>
            {modes.map((mode, index) => <span className="configuration-orbit-node" key={mode.key} title={`${modeShortName(mode)} · ${tr('level')} ${levels[mode.key]}`} style={{ '--orbit-angle': `${index * 30}deg`, '--orbit-color': mode.color } as CSSProperties} aria-hidden="true"><i>{mode.icon}</i><b>{levels[mode.key]}</b></span>)}
          </div>
          <div className="configuration-controls">
            <div className="configuration-save-group">
              <label htmlFor="preset-name"><span className="configuration-step" aria-hidden="true">01</span>{tr('newPreset')}</label>
              <div className="configuration-name-entry"><input id="preset-name" value={presetName} onChange={(event) => setPresetName(event.target.value)} placeholder={tr('presetExample')} /><button className="configuration-save-action" type="button" onClick={savePreset}>{tr('save')} <span aria-hidden="true">＋</span></button></div>
            </div>
            <div className="configuration-library-group">
              <label htmlFor="preset-select"><span className="configuration-step" aria-hidden="true">02</span>{tr('savedPresets')}</label>
              <div className="configuration-select-wrap"><select id="preset-select" value={selectedPreset} onChange={(event) => { setRenamingPreset(false); setPresetNotice(null); setSelectedPreset(event.target.value); personalStorageRef.current.setItem('modoCultiva_selectedPreset', event.target.value); }}><option value="">{tr('selectPreset')}</option>{Object.keys(presets).map((name) => <option key={name} value={name}>{name}</option>)}</select><span aria-hidden="true">⌄</span></div>
              <div className="configuration-library-actions"><button className="configuration-load-action" type="button" onClick={loadPreset}>{tr('load')} <span aria-hidden="true">↗</span></button><button className="configuration-rename-action" type="button" onClick={beginPresetRename} disabled={!selectedPreset || !presets[selectedPreset]}>{tr('renameConfiguration')}</button><button className="configuration-delete-action" type="button" onClick={deletePreset}>{tr('remove')}</button></div>
              {renamingPreset && <form className="configuration-rename-editor" onSubmit={(event) => { event.preventDefault(); commitPresetRename(); }}><label htmlFor="preset-rename-name">{tr('configurationNewName')}</label><div className="configuration-name-entry"><input ref={presetRenameInputRef} id="preset-rename-name" value={presetRenameName} onChange={(event) => setPresetRenameName(event.target.value)} /><button className="configuration-save-action" type="submit">{tr('saveConfigurationName')}</button></div><button className="configuration-cancel-rename" type="button" onClick={() => setRenamingPreset(false)}>{tr('cancelRename')}</button></form>}
            </div>
          </div>
        </div>
        {presetNotice && <p className="configuration-notice" role="status">{presetNotice}</p>}
      </dialog>}

      {selectedPlan && <div className="feature-preview-backdrop" role="presentation" onClick={() => setSelectedPlan(null)}><section className="plan-detail-modal" role="dialog" aria-modal="true" aria-labelledby="plan-detail-title" onClick={(event) => event.stopPropagation()}><button className="close-journey" type="button" onClick={() => setSelectedPlan(null)} aria-label="Cerrar detalles del plan">×</button><p className="kicker">Detalles del plan</p><h2 id="plan-detail-title">{planDetails[selectedPlan].name}</h2><strong className="plan-detail-price">{planDetails[selectedPlan].price}</strong><p className="plan-detail-promise">{planDetails[selectedPlan].promise}</p><ul className="plan-detail-list">{planDetails[selectedPlan].features.map((feature) => <li key={feature}>{feature}</li>)}</ul>{selectedPlan === 'ultimate' && <button className="feature-preview-cta cult-entry-cta" type="button" onClick={() => { setSelectedPlan(null); setPendingAccess(null); setCultTab('insights'); setSelectedMode(modes[0]); setCultOpen(true); setView('dashboard'); }}>{tr('globalName')} <span>✦</span></button>}<button className="feature-preview-dismiss" type="button" onClick={() => setSelectedPlan(null)}>Volver a Modos Premium</button></section></div>}

      {insightPreview && <div className="feature-preview-backdrop" role="presentation" onClick={() => setInsightPreview(null)}><section className="feature-preview" role="dialog" aria-modal="true" aria-labelledby="insight-preview-title" onClick={(event) => event.stopPropagation()}><button className="close-journey" type="button" onClick={() => setInsightPreview(null)} aria-label="Cerrar vista previa">×</button><p className="kicker">Vista previa · Layer de Insights</p><h2 id="insight-preview-title">Pedir Insights</h2><p className="journey-description">Comparte una duda con personas que ya recorrieron este nivel y recibe una estrategia desde la experiencia de la comunidad.</p><div className="insight-preview-card"><span>INSIGHT DE NIVEL {insightPreview.level}</span><strong>{modes.find((mode) => mode.key === insightPreview.modeKey)?.name}</strong><p>“¿Qué práctica te ayudó a avanzar de este nivel al siguiente?”</p><small>La solicitud se habilita al crear una cuenta Gold.</small></div><button className="feature-preview-cta" type="button" onClick={() => { setInsightPreview(null); openPlan('gold', 'Insights locales'); }}>Ver acceso Gold <span>→</span></button><button className="feature-preview-dismiss" type="button" onClick={() => setInsightPreview(null)}>Seguir explorando como invitado</button></section></div>}

      {cultInsightPreview && <div className="feature-preview-backdrop" role="presentation" onClick={() => setCultInsightPreview(null)}><section className="feature-preview cult-insight-modal" style={{ '--insight-color': modes.find((mode) => mode.key === cultInsightPreview.modeKey)?.color ?? '#70ed9c' } as CSSProperties} role="dialog" aria-modal="true" aria-labelledby="cult-insight-modal-title" onClick={(event) => event.stopPropagation()}><button className="close-journey" type="button" onClick={() => setCultInsightPreview(null)} aria-label={tr('close')}>×</button><p className="demo-profile-notice">{onboardingIntegrationCopy(language).demoDetail}</p><h2 id="cult-insight-modal-title">{cultInsightPreview.activity.split(' · ')[0]}</h2><div className="insight-modal-meta"><span>{tr('level')} {cultInsightPreview.level} → {cultInsightPreview.level + 1}</span><span>{effortLabel(cultInsightPreview.level)}</span></div><div className="insight-preset-card"><span>{tr('presetOf')} {cultInsightPreview.author.toUpperCase()}</span><strong>{cultInsightPreview.presetName}</strong><p>{tr('insightPresetDescription')}</p><blockquote className="insight-author-bio">“{cultInsightPreview.bio}”</blockquote><div className="insight-profile-badges"><span>{tr('featuredBadges')}</span><div>{cultInsightPreview.badges.map((key) => { const badge = cultBadgeCatalog.find((item) => item.key === key); return badge ? <b key={key} title={badgeTitle(key)}>{badge.icon} {badgeTitle(key)}</b> : null; })}</div></div><div className="insight-preset-levels">{modes.map((mode) => <span key={mode.key}>{modeShortName(mode)} <b>{cultInsightPreview.preset[mode.key]}</b></span>)}</div></div><button className="feature-preview-cta" type="button" onClick={saveGlobalInsightActivity}>{tr('useInMap')} <span>＋</span></button><button className="feature-preview-dismiss" type="button" onClick={() => setCultInsightPreview(null)}>{tr('exploreInsights')}</button></section></div>}

      {specialistPreview && <div className="feature-preview-backdrop" role="presentation" onClick={() => setSpecialistPreview(null)}><section className="feature-preview specialist-profile-modal" role="dialog" aria-modal="true" aria-labelledby="specialist-profile-title" onClick={(event) => event.stopPropagation()}><button className="close-journey" type="button" onClick={() => setSpecialistPreview(null)} aria-label={tr('closeProfile')}>×</button><p className="kicker">{onboardingIntegrationCopy(language).demo} · {tr('specialistNetwork')}</p><div className="specialist-profile-heading"><div className="cult-specialist-avatar">{specialistPreview.name.slice(0, 1)}</div><div><h2 id="specialist-profile-title">{specialistPreview.name}</h2><p>{specialistPreview.specialty} · {specialistLocation(specialistPreview.location)}</p></div><span>{specialistPreview.match} {tr('matchLabel')}</span></div><p className="demo-profile-notice">{onboardingIntegrationCopy(language).demoDetail} {onboardingIntegrationCopy(language).serviceUnavailable}</p><div className="specialist-profile-meta"><span>{specialistPreview.language}</span><span>{continentLabel(specialistPreview.continent)}</span><span>{modeName(modes.find((mode) => mode.key === specialistPreview.modeKey)!)}</span></div><div className="specialist-profile-copy"><span className="crm-eyebrow">{tr('trajectory')}</span><p>{specialistPreview.trajectory}</p><blockquote>“{specialistPreview.message}”</blockquote></div><div className="specialist-preset"><div><span className="crm-eyebrow">{tr('specialistPreset')}</span><h3>{specialistPreview.presetName}</h3></div><span className="crm-card-caption">{tr('twelveModesLevels')}</span></div><div className="specialist-level-grid">{modes.map((mode) => <div key={mode.key} style={{ '--mode-color': mode.color } as CSSProperties}><span>{mode.icon}</span><strong>{modeShortName(mode)}</strong><b>{specialistPreview.modeLevels[mode.key]}</b></div>)}</div><button className="feature-preview-cta" type="button" onClick={() => setSpecialistPreview(null)}>{tr('closeProfile')} <span>×</span></button></section></div>}

      {profilePreviewMode && <div className="feature-preview-backdrop" role="presentation" onClick={() => setProfilePreviewMode(false)}><section className="feature-preview profile-preview-modal" role="dialog" aria-modal="true" aria-labelledby="profile-preview-title" onClick={(event) => event.stopPropagation()}>
        <button className="close-journey" type="button" onClick={() => setProfilePreviewMode(false)} aria-label={tr('closeProfile')}>×</button>
        <p className="kicker">{tr('profileModalEyebrow')}</p><h2 id="profile-preview-title">{displayedProfileName || tr('profileYou')}</h2>
        <p className="profile-preview-description">{tr('profileOwnDescription')}</p>
        <div className="profile-preview-identity">{profileImage ? <img src={profileImage} alt="" /> : <span>{(displayedProfileName || tr('profileYou')).slice(0, 1).toUpperCase()}</span>}<div className="profile-preview-person"><strong>{displayedProfileName || tr('profileYou')}</strong>{displayedProfileRole && <small>{displayedProfileRole}</small>}</div>
          <div className="profile-cultiva-level" role="group" aria-label={`${tr('profileCultivaLevel')}: ${cultivaLevelLabel}`}>
            <CultivaLeaf /><span className="profile-cultiva-level-label">{tr('profileCultivaLevel')}</span><div className="profile-cultiva-level-value"><strong>{cultivaLevelLabel}</strong></div>
          </div>
        </div>
        <div className="profile-preview-badges"><span className="crm-eyebrow">{tr('featuredBadges')}</span><div>{visibleFeaturedBadges.length ? visibleFeaturedBadges.map((key) => { const badge = cultBadgeCatalog.find((item) => item.key === key)!; return <b key={key} title={badgeTitle(key)}>{key === 'completionist' || key === 'maxed' ? <BadgeMedal badgeKey={key} icon={badge.icon} small /> : badge.icon} {badgeTitle(key)}</b>; }) : <small>{tr('noFeaturedAchievements')}</small>}</div></div>
        <div className="profile-preview-preset"><div><span className="crm-eyebrow">{tr('currentPreset')}</span><strong>{selectedPreset || tr('currentMap')}</strong></div></div>
        <div className="profile-preview-levels">{modes.map((mode) => <div key={mode.key} style={{ '--mode-color': mode.color } as CSSProperties}><span>{mode.icon}</span><strong>{modeShortName(mode)}</strong><b>{levels[mode.key] ?? 0}</b></div>)}</div>
        <button className="feature-preview-cta" type="button" onClick={() => { setProfilePreviewMode(false); setCustomizingAvatar(true); }}>{tr('editMyProfile')} <span>✎</span></button>
        <button className="feature-preview-dismiss" type="button" onClick={() => setProfilePreviewMode(false)}>{tr('closeProfile')} <span>×</span></button>
      </section></div>}

      {customizingAvatar && <div className="avatar-customizer-backdrop" role="presentation" onClick={() => setCustomizingAvatar(false)}><section className="avatar-customizer" role="dialog" aria-modal="true" aria-labelledby="avatar-customizer-title" onClick={(event) => event.stopPropagation()}>
        <button className="close-journey" type="button" onClick={() => setCustomizingAvatar(false)} aria-label={tr('close')}>×</button>
        <p className="kicker">{tr('customizerEyebrow')}</p><h2 id="avatar-customizer-title">{tr('customizerTitle')}</h2><p>{tr('customizerDescription')}</p>
        <label className="customizer-name-field" htmlFor="profile-name">{tr('profileNameLabel')}<input id="profile-name" value={profileName} onChange={(event) => handleProfileName(event.target.value)} placeholder={tr('profileNamePlaceholder')} /></label>
        <label className="customizer-profile-upload"><input type="file" accept="image/*" onChange={(event) => handleProfileImage(event.target.files?.[0])} /><span>＋</span>{profileImage ? tr('changeProfilePhoto') : tr('addProfilePhoto')}</label>
        <button className="customizer-done" type="button" onClick={() => setCustomizingAvatar(false)}>{tr('customizerDone')} <span>→</span></button>
      </section></div>}

      {selectedMode && <div className="journey-backdrop" role="presentation" onClick={() => setSelectedMode(null)}><section ref={journeyPanelRef} className={`journey-panel${activeActivity !== null && activityEntry === 'ai' ? ' journey-panel--mode-ai' : ''}`} data-layer={activeActivity !== null ? '5' : '3'} role="dialog" aria-modal="true" aria-labelledby={activeActivity === null ? 'journey-title' : 'activity-agent-title'} style={{ '--mode-color': selectedMode.color, '--mode-accent': selectedMode.accent } as CSSProperties} onClick={(event) => event.stopPropagation()}>
        <button className="close-journey" type="button" onClick={() => setSelectedMode(null)} aria-label={tr('journeyClose')}>×</button>
        {activeActivity === null && <button className="journey-back" type="button" onClick={backToDashboard}>← {tr('back')} {journeyReturnView === 'dashboard' ? tr('dashboard') : tr('overview')}</button>}
        {activeActivity !== null && <button className="journey-back activity-agent-back" type="button" onClick={() => { setActiveActivity(null); restoreJourneyPosition(); }}>← {tr('back')}</button>}
        {activeActivity !== null ? <section className={`activity-agent activity-agent--${activityEntry}`} data-layer="5" aria-labelledby="activity-agent-title">
          <p className="kicker">{modeName(selectedMode)}</p>
          {activityEntry === 'custom' ? <>
            <h2 id="activity-agent-title">{tr('addActivity')}</h2>
            <p className="journey-description">{tr('journeyBuilderIntro')} {tr('level')} {activeActivity}.</p>
            <ClarityGoal level={activeActivity} language={language} />
            <div className="effort-panel"><span className="effort-label">{tr('effortParameter')}</span><strong>{effortLabel(activeActivity)}</strong><p>{levelDescription(activeActivity)}</p></div>
            <label className="agent-input-label" htmlFor="activity-prompt">{tr('activity')}</label><textarea id="activity-prompt" value={activityPrompt} onChange={(event) => setActivityPrompt(event.target.value)} placeholder={tr('activityPlaceholder')} rows={6} />
            <div className="agent-actions agent-actions--single"><button className="agent-save" type="button" disabled={!activityPrompt.trim()} onClick={() => saveActivity(selectedMode.key, activeActivity, activityPrompt.trim())}>{tr('useActivity')} <span>→</span></button></div>
          </> : activityEntry === 'pool' ? <>
            <h2 id="activity-agent-title">{tr('activityPool')}</h2>
          <p className="journey-description">{tr('activityPoolDescription')}</p>
            <ClarityGoal level={activeActivity} language={language} />
            <ActivityBank modeKey={selectedMode.key} modeName={modeName(selectedMode)} modeIcon={selectedMode.icon} level={activeActivity} language={language} selection={poolSelection} onSelect={setPoolSelection} onUse={usePoolActivity} activityLabel={trf('activityLevel', { level: String(activeActivity) })} effortLabel={effortLabel(activeActivity)} useLabel={tr('useActivity')} previousLabel={tr('previous')} nextLabel={tr('next')} recommendationsLabel={tr('recommendations')} />
          </> : <ModeAiStudio language={language} brand={tr('modeAI')} title={tr('buildActivity')} description={trf('modeAiDescription', { mode: modeName(selectedMode), level: String(activeActivity) })} modeIcon={selectedMode.icon} clarityGoal={<ClarityGoal level={activeActivity} language={language} />}
            level={activeActivity} levelLabel={tr('level')} stage={localizedLevelNames[language][activeActivity]} considerLabel={tr('considerThis')} effort={effortLabel(activeActivity)} effortDescription={tr(`effort${effortByLevel[activeActivity]}`)}
            question={trf('journeyAiQuestion', { level: String(activeActivity) })} contextLabel={tr('context')} placeholder={tr('activityPlaceholder')} activityLabel={tr('activity')} readyLabel={tr('proposalReady')} waiting={tr('journeyAiWaiting')}
            askLabel={tr('askAI')} useLabel={tr('useActivity')} consultingLabel={tr('consulting')} context={activityPrompt} proposal={aiProposal} hasProposal={aiHasConsulted} loading={aiLoading} notice={aiNotice}
            onContext={value => { setActivityPrompt(value); setAiHasConsulted(false); setAiProposal(''); setAiNotice(null); }} onAsk={() => { void consultModeAi(); }} onUse={saveModeAiActivity} />}
        </section> : <>
          <div className="journey-intro-compact"><span className="journey-icon">{selectedMode.icon}</span><div><h2 id="journey-title">{modeName(selectedMode)}</h2><p className="journey-description">{modeJourneyDescription(selectedMode)}</p></div></div>
          <div className="journey-level journey-level--compact"><div><span>{tr('currentLevelLabel')}</span><strong>{levels[selectedMode.key]}</strong></div><span className="journey-level-name">{localizedLevelNames[language][levels[selectedMode.key]]}</span></div><div className="level-definition level-definition--compact"><strong>{localizedLevelNames[language][levels[selectedMode.key]]}</strong><p>{levelDefinitionText(levels[selectedMode.key])}</p></div>
          <label htmlFor="journey-slider">{tr('presenceLevel')}</label><input id="journey-slider" className="journey-slider" type="range" min="0" max="9" value={levels[selectedMode.key]} onChange={(event) => updateLevel(selectedMode.key, Number(event.target.value))} />
          <section className="journey-builder" data-layer="3" aria-labelledby="journey-builder-title">
          <div className="journey-builder-heading"><div><p className="kicker">{tr(journeySlide === 9 ? 'finalVision' : 'activityDesign')}</p><h3 id="journey-builder-title">{tr('cultivationPath')}</h3></div></div>
          <p className="journey-builder-intro">{journeySlide === 9 ? tr('finalVisionCopy') : `${tr('journeyBuilderIntro')} ${modeName(selectedMode)}.`}</p>
          {insightNotice && <div className="insight-notice" role="status">✦ {insightNotice}<button type="button" onClick={() => setInsightNotice(null)} aria-label={tr('closeNotice')}>×</button></div>}
          <div className="journey-carousel" aria-label={`${tr('levels')} · ${modeName(selectedMode)}`}>
            <button className="journey-carousel-arrow" type="button" onClick={() => setJourneySlide((current) => Math.max(0, current - 1))} disabled={journeySlide === 0} aria-label={tr('previousLevel')}>←</button>
            <div className="journey-carousel-viewport">
              <div className="journey-level-grid journey-level-grid--carousel">
                {journeyLevels.filter((level) => level === journeySlide).map((level) => level < 9 ? <JourneyActivityCard key={`${selectedMode.key}-${level}`} current={level === levels[selectedMode.key]} defined={Boolean(activityDrafts[`${selectedMode.key}-${level}`])}
                  card={{ mode: modeName(selectedMode), level, levelLabel: tr('level'), stage: localizedLevelNames[language][level], effort: effortLabel(level), activity: activityDrafts[`${selectedMode.key}-${level}`] ?? tr('activityUndefined'), color: selectedMode.color, icon: selectedMode.icon, language }}
                  reaction={activityReactions[activityReactionKey(selectedMode.key, level, activityDrafts[`${selectedMode.key}-${level}`] ?? '')]}
                  flow={activityFlow(selectedMode.key, level)}
                  sharePreviewScope={tourTopic ?? 'closed'}
                  onReact={reaction => reactToActivity(selectedMode.key, level, reaction)} /> : <article className={`journey-level-card journey-level-card--active journey-level-card--vision${level === levels[selectedMode.key] ? ' journey-level-card--current' : ''}`} key={level}>
                  <div className="journey-level-card-top"><div className="journey-level-card-index"><span>{tr('level')}</span><strong>{level}</strong></div><span className="journey-level-card-name">{localizedLevelNames[language][level]}</span><em>{tr('finalVision')}</em></div>
                  <VisionImage key={selectedMode.key} value={visionImages[selectedMode.key]} onChange={image => saveVisionImage(selectedMode.key, image)} language={language} title={tr('finalVision')} uploadLabel={tr('uploadImage')} changeLabel={tr('changeImage')} />
                </article>)}
              </div>
            </div>
            <button className="journey-carousel-arrow" type="button" onClick={() => setJourneySlide((current) => Math.min(9, current + 1))} disabled={journeySlide === 9} aria-label={tr('nextLevel')}>→</button>
          </div>
          <div className="journey-carousel-footer"><div className="journey-carousel-dots" aria-label={tr('selectLevel')}>{journeyLevels.map((level) => <button className={level === journeySlide ? 'is-active' : ''} type="button" key={level} onClick={() => setJourneySlide(level)} aria-label={`${tr('levels')} ${level}`}>{level}</button>)}</div></div>
          {journeySlide < 9 ? <>
            <div className="journey-fixed-actions" aria-label={tr('visibleLevelActions')}>
              <button type="button" onClick={() => openActivity(journeySlide, 'custom')}>{activityDrafts[`${selectedMode.key}-${journeySlide}`] ? `✦ ${tr('modifyActivity')}` : `＋ ${tr('addActivity')}`}</button>
              <button className="activity-pool-button" type="button" onClick={() => openActivity(journeySlide, 'pool')}>▦ {tr('activityPool')}</button>
              <button className="activity-ai-button" type="button" onClick={() => openActivity(journeySlide, 'ai')}>✦ {tr('modeAI')}</button>
              <button className="insight-button" type="button" disabled={!tourTopic && (localIdeaBusy || journeySlide !== levels[selectedMode.key] || (localIdeaRequests[insightRequestKey(selectedMode.key, journeySlide)]?.eligible_count ?? 0) > 0)}
                aria-pressed={(localIdeaRequests[insightRequestKey(selectedMode.key, journeySlide)]?.eligible_count ?? 0) > 0} aria-busy={localIdeaBusy}
                onClick={() => requestInsight(selectedMode.key, journeySlide)}>{localIdeaBusy ? activityFlowCopy(language).working : (localIdeaRequests[insightRequestKey(selectedMode.key, journeySlide)]?.eligible_count ?? 0) > 0 ? `✓ ${tr('insightRequested')}` : tr('requestInsights')}</button>
            </div>
            {localIdeaNotice?.key === insightRequestKey(selectedMode.key, journeySlide) && <p className="journey-local-idea-status" role="status">{localIdeaNotice.kind === 'login' ? communityCopy(language).login : localIdeaNotice.kind === 'profile' ? onboardingIntegrationCopy(language).profileRequired : localIdeaNotice.kind === 'failed' ? communityCopy(language).unavailable : localIdeaNotice.count ? `${tr('insightRequested')} · ${communityCopy(language).eligible.replace('{count}', String(localIdeaNotice.count))}` : communityCopy(language).zero}</p>}
          </> : <div className="journey-vision-note"><span className="journey-vision-completion" role="status"><strong>{hasVisionImage(visionImages[selectedMode.key]) ? `✓ ${badgeCopy(language).visionDone}` : badgeCopy(language).visionPending}</strong><span>{badgeCopy(language).visionHint}</span></span></div>}
          </section>
          {renderCultSection()}
        </>}
      </section></div>}
      {communityOpen && <CommunityPanel key={`${verifiedIdentity?.user_id ?? 'guest'}:${communityTab}`} client={communityClient} language={language} profileName={displayedProfileName} modeNames={Object.fromEntries(modes.map(mode => [mode.key, modeName(mode)]))}
        initialTab={communityTab} activityContext={selectedMode && journeySlide < 9 ? { mode: selectedMode.key, level: journeySlide } : undefined}
        shareCandidates={communityShareCandidates} onViewCard={setPublicCardId}
        onClose={() => setCommunityOpen(false)} onLogin={() => { closeTour(); setCommunityOpen(false); setSelectedMode(null); setView('login'); }}
        onStateChanged={refreshCommunity} onBeforeShare={async signal => { await flushPersonalState(); if (signal.aborted) throw new DOMException('Cancelled', 'AbortError'); }}
        destinationActivity={(mode, level) => activityDrafts[`${mode}-${level}`] ?? ''}
        onImportActivity={communityClient ? async (kind, id, mode, level, confirmedDestinationActivity) => {
          await flushPersonalState();
          const current = stateQueueRef.current?.getDesired().activityDrafts as Record<string, string> | undefined;
          const destination = current?.[`${mode}-${level}`] ?? '';
          if (confirmedDestinationActivity === undefined || destination !== confirmedDestinationActivity) throw new Error('La actividad de destino cambió. Confirma su nueva versión antes de importar.');
          const expectedHash = await activitySha256(destination);
          if (kind === 'reuse') await communityClient.importReuse(id, expectedHash); else await communityClient.importIdea(id, expectedHash);
          await refreshCommunity();
        } : undefined} />}
      {!accountBlocked && !publicCardId && <GuidedTour step={tourStep} language={language} visitedMethods={tourVisitedMethods} onPrevious={() => setTourIndex(current => current === null ? null : Math.max(0, current - 1))}
        onNext={() => { if (tourIndex === tourTopics.length - 1) closeTour(); else setTourIndex(current => current === null ? null : current + 1); }} onClose={closeTour}
        canGoBack={tourIndex !== null && tourIndex > 0} isLastStep={tourIndex === tourTopics.length - 1} showCounter={isAuthenticated && stateHydrated && isOwnerAccount} counter={tourIndex === null ? undefined : { current: tourIndex + 1, total: tourTopics.length }}
        onTargetInteraction={({ stepId, element, method }) => {
          if (stepId === 'methods' && method) { setTourIndex(tourTopics.indexOf(method === 'localContacts' ? 'localContacts' : method === 'bank' ? 'bank' : method)); return; }
          if (stepId !== 'modes') return;
          const key = (element.closest('[data-tour-mode]') as HTMLElement | null)?.dataset.tourMode;
          if (key && modes.some(mode => mode.key === key)) { setTourModeKey(key); setTourIndex(1); }
        }} />}
      {!accountBlocked && !publicCardId && welcomeScope && <WelcomeIntro key={welcomeIntroStorageKey(welcomeScope)} language={language} onComplete={() => {
        try { markWelcomeIntroComplete(window.localStorage, welcomeScope); } catch { /* The in-memory scope guard prevents a replay loop. */ }
        if (welcomeScope.kind === 'account') {
          setOnboardingWelcomeCompleted(true);
          persistedDocumentRef.current = { ...persistedDocumentRef.current, onboardingWelcomeCompleted: true };
          stateQueueRef.current?.stage(current => ({ ...current, onboardingWelcomeCompleted: true }));
        }
        setWelcomeScope(null); startTour();
      }} />}
      {publicCardId && <PublicActivityCard key={publicCardId} apiUrl={apiUrl} cardId={publicCardId} client={accountBlocked ? null : communityClient} language={language} modeNames={Object.fromEntries(modes.map(mode => [mode.key, modeName(mode)]))} onClose={closePublicCard} />}
      {accountBlocked && !publicCardId && <StateAccountBoundary key={`${hydrationAttempt}:${verifiedIdentity?.user_id ?? 'pending'}`} language={language}
        phase={signingOut ? accountPhase : accountPhase === 'signing-out' || accountPhase === 'logout-error' ? 'loading' : accountPhase}
        accountLabel={verifiedIdentity?.email || verifiedIdentity?.name || undefined}
        onRetry={() => { if (accountPhase === 'logout-error') void logout(); else { setAccountPhase('loading'); setHydrationAttempt(value => value + 1); } }}
        onSignOut={() => { void logout(); }}
        onStay={() => { setSigningOut(false); setAccountPhase(stateHydrated ? 'loading' : 'error'); }}
        onChoice={choice => { consentChoiceRef.current?.(choice); consentChoiceRef.current = null; }} />}
    </main>
  );
}

export default App;
