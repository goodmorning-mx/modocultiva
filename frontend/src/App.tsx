import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { PwaControls } from './PwaControls';
import { createNavigationHistory } from './navigationHistory';
import { renameLifeConfiguration, persistRenamedConfiguration } from './lifeConfigurations';
import logo from './assets/modo-cultiva-logo-neon.png';
import './skin-overrides.css';

type HealthResponse = {
  service: string;
  status: string;
  environment: string;
};

type ModeAIResponse = {
  proposal: string;
  model: string;
  conversation_id?: string;
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
const levelNames = ['Ignorancia activa', 'Reacción pasiva', 'Conciencia confusa', 'Intención sin hábito', 'Bases establecidas', 'Mantenimiento básico', 'Rumbo definido', 'Crecimiento consistente', 'Optimización y disciplina', 'Maestría e influencia'];
const levelDescriptions = ['Ignorancia Activa - El área está totalmente descuidada o negada. Es cuando conscientemente decides dejar esta área en pausa por un tiempo para ahorrar energía.', 'Reacción Pasiva - Enfoque sólo en la crisis. Esfuerzo reactivo, no preventivo. Hasta que sucede algo negativo comienzas a actuar. Ya decidiste comenzar a hacer algo.', 'Conciencia Confusa - Se reconoce el problema, pero la parálisis impide crear un plan. Aún hay algo que te detiene, puede ser una situación personal, económica, creencia limitante o falta de ideas.', 'Intención sin Hábito - Se intenta actuar, pero las acciones son inconsistentes y esporádicas. Aún hay interrupciones en el actuar o existe procrastinación.', 'Bases Establecidas - Se ha implementado un sistema mínimo que se sigue de forma consciente. Eres constante en lo que hayas decidido para este modo. Incluso recibes comentarios positivos sobre tu progreso.', 'Mantenimiento Básico - Estabilidad. El área está controlada, pero no hay crecimiento activo. Zona de confort. No estás en crisis pero has decidido no invertir en energía o nuevas posibilidades.', 'Rumbo Definido - Se han establecido metas claras y se asignan recursos estratégicamente. Se ha pasado la barrera de la zona del confort y se aspira a algo más, ya se hizo algo de investigación sobre nuevas estrategias transformadoras.', 'Crecimiento Consistente - El sistema funciona. Se miden los resultados y se hacen ajustes constantes. Buscas superar tus propios límites. Ya estás en modo pro. Dominas el área y buscas la perfección.', 'Optimización y Disciplina - El sistema es automático. Se utiliza delegación o tecnología para multiplicar resultados. Reconoces que para este punto tal vez necesites la ayuda de alguien mucho más experto por lo que te abres a delegar esta área de tu vida a recibir consejería o coaching.', 'Maestría e Influencia - Enfoque Total. El sistema es un motor de resultados y se usa para enseñar y asesorar a otros. Te has convertido en tu mejor versión, ya tienes expertíz e incluso hasta podrías enseñar, aconsejar o mostrar nuevas formas de vida a tu círculo cercano o a tu comunidad.'];
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
type Language = 'es' | 'en' | 'zh' | 'hi' | 'ar' | 'it' | 'pt' | 'ru' | 'de' | 'fr' | 'da';
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
  currentScoreAria: { es: 'Nivel actual de Modo Cultiva: {average} de 9', en: 'Current Modo Cultiva level: {average} out of 9', zh: '当前 Modo Cultiva 等级：{average} / 9', hi: 'वर्तमान Modo Cultiva स्तर: 9 में से {average}', ar: 'مستوى Modo Cultiva الحالي: {average} من 9', it: 'Livello attuale di Modo Cultiva: {average} su 9', pt: 'Nível atual do Modo Cultiva: {average} de 9', ru: 'Текущий уровень Modo Cultiva: {average} из 9', de: 'Aktuelles Modo-Cultiva-Level: {average} von 9', fr: 'Niveau actuel de Modo Cultiva : {average} sur 9', da: 'Aktuelt Modo Cultiva-niveau: {average} ud af 9' },
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
  welcomeOverviewCopy: { es: 'Una vista completa para recordar las áreas que te hacen ser tú. Observa tu equilibrio, elige dónde poner presencia y entra a tu Centro de Control cuando quieras profundizar.', en: 'A complete view of the areas that make you who you are. Observe your balance, choose where to place presence, and visit your Control Center whenever you want to go deeper.', zh: '完整查看构成你的生活领域。观察你的平衡，选择投入关注的地方，并随时进入控制中心深入探索。', hi: 'उन क्षेत्रों का पूरा दृश्य जो आपको आप बनाते हैं। अपना संतुलन देखें, तय करें कि ध्यान कहाँ देना है और गहराई से जानने के लिए नियंत्रण केंद्र खोलें।', ar: 'رؤية كاملة للمجالات التي تجعلك ما أنت عليه. راقب توازنك واختر أين تضع حضورك وادخل إلى مركز التحكم عندما تريد التعمق.', it: 'Una visione completa delle aree che ti rendono te stesso. Osserva il tuo equilibrio, scegli dove portare presenza ed entra nel Centro di controllo quando vuoi approfondire.', pt: 'Uma visão completa das áreas que fazem você ser quem é. Observe seu equilíbrio, escolha onde colocar presença e acesse o Centro de Controle quando quiser se aprofundar.', ru: 'Полный обзор областей, которые делают вас собой. Наблюдайте за балансом, выбирайте, куда направить внимание, и открывайте центр управления, когда захотите углубиться.', de: 'Ein vollständiger Blick auf die Bereiche, die dich ausmachen. Beobachte dein Gleichgewicht, wähle deinen Fokus und öffne jederzeit das Kontrollzentrum, wenn du tiefer gehen möchtest.', fr: 'Une vue complète des domaines qui vous définissent. Observez votre équilibre, choisissez où placer votre présence et accédez au centre de contrôle pour approfondir.', da: 'Et komplet overblik over de områder, der gør dig til dig. Se din balance, vælg hvor du vil være nærværende, og åbn kontrolcenteret, når du vil gå i dybden.' },
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
  xpCultiva: { es: 'XP DE CULTIVA', en: 'CULTIVA XP', zh: 'CULTIVA 经验值', hi: 'CULTIVA XP', ar: 'نقاط CULTIVA', it: 'XP CULTIVA', pt: 'XP CULTIVA', ru: 'XP CULTIVA', de: 'CULTIVA-XP', fr: 'XP CULTIVA', da: 'CULTIVA XP' },
  xpProgressHint: { es: '25 XP por cada nivel y 100 XP por actividad', en: '25 XP per level and 100 XP per activity', zh: '每个等级 25 XP，每项活动 100 XP', hi: 'हर स्तर पर 25 XP और हर गतिविधि पर 100 XP', ar: '25 نقطة لكل مستوى و100 نقطة لكل نشاط', it: '25 XP per livello e 100 XP per attività', pt: '25 XP por nível e 100 XP por atividade', ru: '25 XP за уровень и 100 XP за активность', de: '25 XP pro Level und 100 XP pro Aktivität', fr: '25 XP par niveau et 100 XP par activité', da: '25 XP pr. niveau og 100 XP pr. aktivitet' },
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
  customizerDescription: { es: 'Edita tu nombre y foto de perfil. Tus cambios se guardan en este navegador.', en: 'Edit your name and profile photo. Your changes are saved in this browser.', zh: '编辑你的姓名和头像。更改会保存在此浏览器中。', hi: 'अपना नाम और प्रोफ़ाइल फ़ोटो बदलें। आपके बदलाव इसी ब्राउज़र में सहेजे जाएँगे।', ar: 'عدّل اسمك وصورة ملفك الشخصي. تُحفظ التغييرات في هذا المتصفح.', it: 'Modifica il nome e la foto del profilo. Le modifiche vengono salvate in questo browser.', pt: 'Edite seu nome e foto de perfil. As alterações ficam salvas neste navegador.', ru: 'Измените имя и фото профиля. Изменения сохраняются в этом браузере.', de: 'Bearbeite deinen Namen und dein Profilfoto. Änderungen werden in diesem Browser gespeichert.', fr: 'Modifiez votre nom et votre photo de profil. Vos changements sont enregistrés dans ce navigateur.', da: 'Redigér dit navn og profilbillede. Dine ændringer gemmes i denne browser.' },
  profileNameLabel: { es: 'Tu nombre', en: 'Your name', zh: '你的姓名', hi: 'आपका नाम', ar: 'اسمك', it: 'Il tuo nome', pt: 'Seu nome', ru: 'Ваше имя', de: 'Dein Name', fr: 'Votre nom', da: 'Dit navn' },
  profileNamePlaceholder: { es: 'Escribe tu nombre', en: 'Enter your name', zh: '输入你的姓名', hi: 'अपना नाम लिखें', ar: 'اكتب اسمك', it: 'Inserisci il tuo nome', pt: 'Digite seu nome', ru: 'Введите имя', de: 'Gib deinen Namen ein', fr: 'Saisissez votre nom', da: 'Skriv dit navn' },
  changeProfilePhoto: { es: 'Cambiar foto de perfil', en: 'Change profile photo', zh: '更换头像', hi: 'प्रोफ़ाइल फ़ोटो बदलें', ar: 'تغيير صورة الملف الشخصي', it: 'Cambia foto del profilo', pt: 'Alterar foto de perfil', ru: 'Изменить фото профиля', de: 'Profilfoto ändern', fr: 'Changer la photo de profil', da: 'Skift profilbillede' },
  addProfilePhoto: { es: 'Agregar foto de perfil', en: 'Add profile photo', zh: '添加头像', hi: 'प्रोफ़ाइल फ़ोटो जोड़ें', ar: 'إضافة صورة للملف الشخصي', it: 'Aggiungi foto del profilo', pt: 'Adicionar foto de perfil', ru: 'Добавить фото профиля', de: 'Profilfoto hinzufügen', fr: 'Ajouter une photo de profil', da: 'Tilføj profilbillede' },
  customizerDone: { es: 'Listo, este soy yo', en: 'Done, this is me', zh: '完成，这就是我', hi: 'हो गया, यह मैं हूँ', ar: 'تم، هذه هويتي', it: 'Fatto, questo sono io', pt: 'Pronto, este sou eu', ru: 'Готово, это я', de: 'Fertig, das bin ich', fr: 'Terminé, c’est moi', da: 'Færdig, det er mig' },
  journeyClose: { es: 'Cerrar recorrido', en: 'Close journey', zh: '关闭旅程', hi: 'यात्रा बंद करें', ar: 'إغلاق الرحلة', it: 'Chiudi percorso', pt: 'Fechar jornada', ru: 'Закрыть путь', de: 'Journey schließen', fr: 'Fermer le parcours', da: 'Luk rejse' },
  previousLevel: { es: 'Nivel anterior', en: 'Previous level', zh: '上一个等级', hi: 'पिछला स्तर', ar: 'المستوى السابق', it: 'Livello precedente', pt: 'Nível anterior', ru: 'Предыдущий уровень', de: 'Vorheriges Level', fr: 'Niveau précédent', da: 'Forrige niveau' },
  nextLevel: { es: 'Siguiente nivel', en: 'Next level', zh: '下一个等级', hi: 'अगला स्तर', ar: 'المستوى التالي', it: 'Livello successivo', pt: 'Próximo nível', ru: 'Следующий уровень', de: 'Nächstes Level', fr: 'Niveau suivant', da: 'Næste niveau' },
  selectLevel: { es: 'Seleccionar nivel', en: 'Select level', zh: '选择等级', hi: 'स्तर चुनें', ar: 'اختر المستوى', it: 'Seleziona il livello', pt: 'Selecionar nível', ru: 'Выбрать уровень', de: 'Level auswählen', fr: 'Choisir un niveau', da: 'Vælg niveau' },
  visibleLevelActions: { es: 'Acciones para el nivel visible', en: 'Actions for the visible level', zh: '当前等级的操作', hi: 'दिखाए गए स्तर के लिए कार्रवाइयाँ', ar: 'إجراءات المستوى المعروض', it: 'Azioni per il livello visualizzato', pt: 'Ações para o nível exibido', ru: 'Действия для текущего уровня', de: 'Aktionen für das angezeigte Level', fr: 'Actions pour le niveau affiché', da: 'Handlinger for det viste niveau' },
  closeNotice: { es: 'Cerrar aviso', en: 'Close notice', zh: '关闭提示', hi: 'सूचना बंद करें', ar: 'إغلاق التنبيه', it: 'Chiudi avviso', pt: 'Fechar aviso', ru: 'Закрыть уведомление', de: 'Hinweis schließen', fr: 'Fermer le message', da: 'Luk besked' },
  journeyAiQuestion: { es: 'Para pasar del nivel {level} al siguiente, ¿qué te gustaría cultivar en este modo y cuánto tiempo real tienes disponible?', en: 'To move from level {level} to the next, what would you like to cultivate in this mode, and how much time do you realistically have?', zh: '若要从等级 {level} 迈向下一级，你想在此模式中培养什么？实际可投入多少时间？', hi: 'स्तर {level} से अगले स्तर पर जाने के लिए, आप इस मोड में क्या विकसित करना चाहेंगे और वास्तव में कितना समय दे सकते हैं?', ar: 'للانتقال من المستوى {level} إلى التالي، ما الذي تود تنميته في هذا الوضع وكم من الوقت يتوفر لديك فعلياً؟', it: 'Per passare dal livello {level} al successivo, cosa vorresti coltivare in questa modalità e quanto tempo hai davvero a disposizione?', pt: 'Para avançar do nível {level} ao próximo, o que você gostaria de cultivar neste modo e quanto tempo realmente tem disponível?', ru: 'Чтобы перейти с уровня {level} на следующий, что вы хотите развивать в этом режиме и сколько времени реально можете уделить?', de: 'Was möchtest du in diesem Modus entwickeln, um von Level {level} zum nächsten zu gelangen, und wie viel Zeit hast du tatsächlich?', fr: 'Pour passer du niveau {level} au suivant, que souhaitez-vous cultiver dans ce mode et de combien de temps disposez-vous réellement ?', da: 'Hvad vil du dyrke i denne tilstand for at gå fra niveau {level} til det næste, og hvor meget tid har du reelt?' },
  journeyAiWaiting: { es: 'Comparte tu contexto y consulta al Modo IA para recibir una propuesta personalizada.', en: 'Share your context and ask Mode AI for a personalized suggestion.', zh: '分享你的情况并咨询模式 AI，获取个性化建议。', hi: 'अपना संदर्भ साझा करें और व्यक्तिगत सुझाव पाने के लिए मोड AI से पूछें।', ar: 'شارك سياقك واسأل وضع الذكاء الاصطناعي للحصول على اقتراح مخصص.', it: 'Condividi il tuo contesto e consulta il Modo IA per ricevere una proposta personalizzata.', pt: 'Compartilhe seu contexto e consulte o Modo IA para receber uma sugestão personalizada.', ru: 'Расскажите о своей ситуации и обратитесь к Mode AI за персональным предложением.', de: 'Teile deinen Kontext und frage Mode AI nach einem persönlichen Vorschlag.', fr: 'Partagez votre contexte et consultez le Mode IA pour obtenir une proposition personnalisée.', da: 'Del din kontekst, og spørg Mode AI om et personligt forslag.' },
  profileOwnDescription: { es: 'Así se ve tu mapa cuando lo revisas tú.', en: 'This is how your map looks when you review it yourself.', zh: '这是你查看自己地图时看到的样子。', hi: 'जब आप अपना मानचित्र देखते हैं तो यह ऐसा दिखता है।', ar: 'هكذا تبدو خريطتك عندما تراجعها بنفسك.', it: 'Così appare la tua mappa quando la rivedi tu.', pt: 'Assim seu mapa aparece quando você o consulta.', ru: 'Так выглядит ваша карта, когда вы просматриваете её сами.', de: 'So sieht deine Karte aus, wenn du sie selbst ansiehst.', fr: 'Voici à quoi ressemble votre carte quand vous la consultez.', da: 'Sådan ser dit kort ud, når du selv gennemgår det.' },
  profilePublicDescription: { es: 'Así vería tu perfil otra persona: tus logros destacados y tu Configuración de Vida actual.', en: 'This is how another person would see your profile: featured achievements and your current preset.', zh: '这是其他人看到的你的资料：精选成就和当前生活模式组合。', hi: 'दूसरे व्यक्ति को आपकी प्रोफ़ाइल ऐसे दिखेगी: विशेष उपलब्धियां और आपका वर्तमान जीवन-मोड संयोजन।', ar: 'هكذا سيرى شخص آخر ملفك: إنجازاتك المميزة وتوليفة أنماط حياتك الحالية.', it: 'Così un’altra persona vedrebbe il tuo profilo: traguardi in evidenza e la tua combinazione attuale dei modi di vita.', pt: 'Assim outra pessoa veria seu perfil: conquistas em destaque e sua combinação atual de modos de vida.', ru: 'Так другой человек увидит ваш профиль: избранные достижения и текущее сочетание жизненных сфер.', de: 'So würde eine andere Person dein Profil sehen: hervorgehobene Erfolge und deine aktuelle Kombination der Lebensbereiche.', fr: 'Voici comment une autre personne verrait votre profil : réussites à la une et votre combinaison actuelle des modes de vie.', da: 'Sådan ville en anden se din profil: fremhævede resultater og din aktuelle kombination af livsområder.' },
  currentPreset: { es: 'CONFIGURACIÓN DE VIDA ACTUAL', en: 'CURRENT PRESET', zh: '当前生活模式组合', hi: 'वर्तमान जीवन-मोड संयोजन', ar: 'توليفة أنماط الحياة الحالية', it: 'COMBINAZIONE ATTUALE DEI MODI DI VITA', pt: 'COMBINAÇÃO ATUAL DE MODOS DE VIDA', ru: 'ТЕКУЩЕЕ СОЧЕТАНИЕ ЖИЗНЕННЫХ СФЕР', de: 'AKTUELLE KOMBINATION DER LEBENSBEREICHE', fr: 'COMBINAISON ACTUELLE DES MODES DE VIE', da: 'AKTUEL AKTIVITETSKOMBINATION' },
  currentMap: { es: 'Mapa actual', en: 'Current map', zh: '当前地图', hi: 'वर्तमान मानचित्र', ar: 'الخريطة الحالية', it: 'Mappa attuale', pt: 'Mapa atual', ru: 'Текущая карта', de: 'Aktuelle Karte', fr: 'Carte actuelle', da: 'Aktuelt kort' },
  levelMap: { es: 'NIVELES DE LOS 12 MODOS', en: 'LEVELS ACROSS 12 MODES', zh: '12种模式的等级', hi: '12 मोड के स्तर', ar: 'مستويات الأوضاع الاثني عشر', it: 'LIVELLI DEI 12 MODI', pt: 'NÍVEIS DOS 12 MODOS', ru: 'УРОВНИ 12 РЕЖИМОВ', de: 'LEVEL DER 12 MODI', fr: 'NIVEAUX DES 12 MODES', da: 'NIVEAUER FOR 12 MODES' },
  closeProfile: { es: 'Cerrar perfil', en: 'Close profile', zh: '关闭资料', hi: 'प्रोफ़ाइल बंद करें', ar: 'إغلاق الملف', it: 'Chiudi profilo', pt: 'Fechar perfil', ru: 'Закрыть профиль', de: 'Profil schließen', fr: 'Fermer le profil', da: 'Luk profil' },
  badgeDescFirstStep: { es: 'Definiste tu primera actividad.', en: 'You defined your first activity.', zh: '你定义了第一项活动。', hi: 'आपने अपनी पहली गतिविधि तय की।', ar: 'حددت نشاطك الأول.', it: 'Hai definito la tua prima attività.', pt: 'Você definiu sua primeira atividade.', ru: 'Вы определили свою первую активность.', de: 'Du hast deine erste Aktivität definiert.', fr: 'Vous avez défini votre première activité.', da: 'Du definerede din første aktivitet.' },
  badgeDescThreeMoves: { es: 'Guardaste actividades en tres journeys.', en: 'You saved activities in three journeys.', zh: '你在三个旅程中保存了活动。', hi: 'आपने तीन यात्राओं में गतिविधियां सहेजीं।', ar: 'حفظت أنشطة في ثلاث رحلات.', it: 'Hai salvato attività in tre percorsi.', pt: 'Você salvou atividades em três jornadas.', ru: 'Вы сохранили активности в трёх путях.', de: 'Du hast Aktivitäten in drei Journeys gespeichert.', fr: 'Vous avez enregistré des activités dans trois parcours.', da: 'Du gemte aktiviteter på tre rejser.' },
  badgeDescLevelUp: { es: 'Llevaste un modo al siguiente nivel.', en: 'You moved a mode to the next level.', zh: '你让一种模式进入了下一个等级。', hi: 'आपने एक मोड को अगले स्तर तक पहुंचाया।', ar: 'رفعت أحد الأوضاع إلى المستوى التالي.', it: 'Hai portato una modalità al livello successivo.', pt: 'Você levou um modo ao próximo nível.', ru: 'Вы подняли один режим на следующий уровень.', de: 'Du hast einen Modus auf die nächste Stufe gebracht.', fr: 'Vous avez fait passer un mode au niveau suivant.', da: 'Du løftede en mode til næste niveau.' },
  badgeDescFullSpectrum: { es: 'Cultivaste los 12 modos con una actividad.', en: 'You cultivated all 12 modes with an activity.', zh: '你用一项活动培育了全部12种模式。', hi: 'आपने एक गतिविधि के साथ सभी 12 मोड विकसित किए।', ar: 'زرعت الأوضاع الاثني عشر بنشاط واحد.', it: 'Hai coltivato tutti i 12 modi con un’attività.', pt: 'Você cultivou os 12 modos com uma atividade.', ru: 'Вы развивали все 12 режимов с помощью активности.', de: 'Du hast alle 12 Modi mit einer Aktivität kultiviert.', fr: 'Vous avez cultivé les 12 modes avec une activité.', da: 'Du dyrkede alle 12 modes med én aktivitet.' },
  badgeDescGlobalEye: { es: 'Guardaste una práctica compartida por la comunidad.', en: 'You saved a practice shared by the community.', zh: '你保存了社区分享的实践。', hi: 'आपने समुदाय द्वारा साझा किया गया अभ्यास सहेजा।', ar: 'حفظت ممارسة شاركها المجتمع.', it: 'Hai salvato una pratica condivisa dalla comunità.', pt: 'Você salvou uma prática compartilhada pela comunidade.', ru: 'Вы сохранили практику, которой поделилось сообщество.', de: 'Du hast eine von der Community geteilte Praxis gespeichert.', fr: 'Vous avez enregistré une pratique partagée par la communauté.', da: 'Du gemte en praksis delt af fællesskabet.' },
  badgeDescVisionary: { es: 'Subiste una imagen para representar tu nivel 9.', en: 'You uploaded an image to represent your level 9.', zh: '你上传了代表等级9的图片。', hi: 'आपने स्तर 9 को दर्शाने वाली छवि अपलोड की।', ar: 'رفعت صورة لتمثيل مستواك التاسع.', it: 'Hai caricato un’immagine per rappresentare il livello 9.', pt: 'Você enviou uma imagem para representar seu nível 9.', ru: 'Вы загрузили изображение, представляющее ваш 9-й уровень.', de: 'Du hast ein Bild für deine Stufe 9 hochgeladen.', fr: 'Vous avez importé une image pour représenter votre niveau 9.', da: 'Du uploadede et billede for at repræsentere niveau 9.' },
  badgeDescPresetMaker: { es: 'Creaste un preset para explorar otro mapa.', en: 'You created a preset to explore another map.', zh: '你创建了预设来探索另一张地图。', hi: 'आपने दूसरे मानचित्र को देखने के लिए एक प्रीसेट बनाया।', ar: 'أنشأت إعداداً لاستكشاف خريطة أخرى.', it: 'Hai creato un preset per esplorare un’altra mappa.', pt: 'Você criou um preset para explorar outro mapa.', ru: 'Вы создали пресет для изучения другой карты.', de: 'Du hast ein Preset erstellt, um eine andere Karte zu erkunden.', fr: 'Vous avez créé un preset pour explorer une autre carte.', da: 'Du oprettede et preset for at udforske et andet kort.' },
  badgeDescSkinShift: { es: 'Activaste una nueva identidad visual.', en: 'You activated a new visual identity.', zh: '你启用了新的视觉身份。', hi: 'आपने एक नई दृश्य पहचान सक्रिय की।', ar: 'فعّلت هوية بصرية جديدة.', it: 'Hai attivato una nuova identità visiva.', pt: 'Você ativou uma nova identidade visual.', ru: 'Вы активировали новую визуальную идентичность.', de: 'Du hast eine neue visuelle Identität aktiviert.', fr: 'Vous avez activé une nouvelle identité visuelle.', da: 'Du aktiverede en ny visuel identitet.' },
  regenerateInsight: { es: 'Ver otra recomendación', en: 'Show another recommendation', zh: '查看另一条推荐', hi: 'दूसरी सिफारिश देखें', ar: 'اعرض توصية أخرى', it: 'Mostra un’altra raccomandazione', pt: 'Ver outra recomendação', ru: 'Показать другую рекомендацию', de: 'Andere Empfehlung anzeigen', fr: 'Voir une autre recommandation', da: 'Vis en anden anbefaling' },
  lifeModes: { es: '12 MODOS DE VIDA', en: '12 LIFE MODES', zh: '12种生活模式', hi: '12 जीवन मोड', ar: '12 نمطاً للحياة', it: '12 MODALITÀ DI VITA', pt: '12 MODOS DE VIDA', ru: '12 РЕЖИМОВ ЖИЗНИ', de: '12 LEBENSMODI', fr: '12 MODES DE VIE', da: '12 LIVSMODI' },
  djEyebrow: { es: 'Consola de presencia', en: 'Presence console', zh: '存在感控制台', hi: 'उपस्थिति कंसोल', ar: 'وحدة الحضور', it: 'Console della presenza', pt: 'Console de presença', ru: 'Консоль присутствия', de: 'Präsenzkonsole', fr: 'Console de présence', da: 'Tilstedeværelseskonsol' },
  djTitle: { es: 'Cultiva todos tus modos.', en: 'Cultivate every mode of your life.', zh: '培育你生命中的每一种模式。', hi: 'अपने जीवन के हर मोड को विकसित करें।', ar: 'ازرع كل نمط من أنماط حياتك.', it: 'Coltiva ogni modalità della tua vita.', pt: 'Cultive cada modo da sua vida.', ru: 'Развивайте каждый режим своей жизни.', de: 'Entwickle jeden Modus deines Lebens.', fr: 'Cultivez chaque mode de votre vie.', da: 'Dyrk alle dine livsmodi.' },
  djActivated: { es: 'MODO CULTIVA ACTIVADO · 12 CANALES DE VIDA ENERGIZADOS', en: 'MODO CULTIVA ACTIVE · 12 ENERGIZED LIFE CHANNELS', zh: 'MODO CULTIVA 已激活 · 12 个充满能量的生活频道', hi: 'MODO CULTIVA सक्रिय · 12 ऊर्जावान जीवन चैनल', ar: 'MODO CULTIVA نشط · 12 قناة حياة نابضة', it: 'MODO CULTIVA ATTIVO · 12 CANALI DI VITA ENERGIZZATI', pt: 'MODO CULTIVA ATIVO · 12 CANAIS DE VIDA ENERGIZADOS', ru: 'MODO CULTIVA АКТИВЕН · 12 ЗАРЯЖЕННЫХ КАНАЛОВ ЖИЗНИ', de: 'MODO CULTIVA AKTIV · 12 ENERGIEGELADENE LEBENSKANÄLE', fr: 'MODO CULTIVA ACTIF · 12 CANAUX DE VIE ÉNERGISÉS', da: 'MODO CULTIVA AKTIV · 12 ENERGIFYLDE LIVSKANALER' },
  djPersonalSession: { es: 'SESIÓN PERSONAL', en: 'PERSONAL SESSION', zh: '个人会话', hi: 'व्यक्तिगत सत्र', ar: 'جلسة شخصية', it: 'SESSIONE PERSONALE', pt: 'SESSÃO PESSOAL', ru: 'ЛИЧНАЯ СЕССИЯ', de: 'PERSÖNLICHE SITZUNG', fr: 'SESSION PERSONNELLE', da: 'PERSONLIG SESSION' },
  djSignalMaster: { es: 'SEÑAL / MASTER', en: 'SIGNAL / MASTER', zh: '信号 / 主控', hi: 'सिग्नल / मास्टर', ar: 'إشارة / رئيسي', it: 'SEGNALE / MASTER', pt: 'SINAL / MASTER', ru: 'СИГНАЛ / МАСТЕР', de: 'SIGNAL / MASTER', fr: 'SIGNAL / MASTER', da: 'SIGNAL / MASTER' },
  djSync: { es: 'SYNC', en: 'SYNC', zh: '同步', hi: 'सिंक', ar: 'مزامنة', it: 'SYNC', pt: 'SYNC', ru: 'СИНХР', de: 'SYNC', fr: 'SYNC', da: 'SYNC' },
  djFx: { es: 'FX', en: 'FX', zh: '效果', hi: 'FX', ar: 'مؤثرات', it: 'FX', pt: 'FX', ru: 'FX', de: 'FX', fr: 'FX', da: 'FX' },
  djMonitor: { es: 'MONITOR', en: 'MONITOR', zh: '监听', hi: 'मॉनिटर', ar: 'مراقبة', it: 'MONITOR', pt: 'MONITOR', ru: 'МОНИТОР', de: 'MONITOR', fr: 'MONITEUR', da: 'MONITOR' },
  djAir: { es: 'AIR', en: 'AIR', zh: '空气', hi: 'AIR', ar: 'هواء', it: 'AIR', pt: 'AIR', ru: 'AIR', de: 'AIR', fr: 'AIR', da: 'AIR' },
  djActiveChannel: { es: 'CANAL ACTIVO', en: 'ACTIVE CHANNEL', zh: '当前频道', hi: 'सक्रिय चैनल', ar: 'القناة النشطة', it: 'CANALE ATTIVO', pt: 'CANAL ATIVO', ru: 'АКТИВНЫЙ КАНАЛ', de: 'AKTIVER KANAL', fr: 'CANAL ACTIF', da: 'AKTIV KANAL' },
  djAccess: { es: 'ACCESO', en: 'ACCESS', zh: '访问', hi: 'पहुंच', ar: 'وصول', it: 'ACCESSO', pt: 'ACESSO', ru: 'ДОСТУП', de: 'ZUGANG', fr: 'ACCÈS', da: 'ADGANG' },
  nightOwlDescription: { es: 'Paleta nocturna de alto contraste para reducir el brillo y favorecer la lectura en ambientes oscuros.', en: 'A high-contrast night palette that reduces glare and supports reading in dark environments.', zh: '高对比度夜间配色，降低眩光，适合在昏暗环境中阅读。', hi: 'उच्च-कंट्रास्ट रात की पैलेट, जो चमक कम करके अंधेरे वातावरण में पढ़ने को आसान बनाती है।', ar: 'لوحة ليلية عالية التباين تقلل الوهج وتدعم القراءة في البيئات المظلمة.', it: 'Una palette notturna ad alto contrasto che riduce il bagliore e favorisce la lettura negli ambienti bui.', pt: 'Uma paleta noturna de alto contraste que reduz o brilho e facilita a leitura em ambientes escuros.', ru: 'Ночная палитра с высоким контрастом, уменьшающая блики и облегчающая чтение в темноте.', de: 'Eine kontrastreiche Nachtpalette, die Blendung reduziert und das Lesen in dunkler Umgebung erleichtert.', fr: 'Une palette nocturne à contraste élevé qui réduit l’éblouissement et facilite la lecture dans les environnements sombres.', da: 'En nattepalet med høj kontrast, der reducerer blænding og gør læsning i mørke omgivelser lettere.' },
  lucidDescription: { es: 'Paleta luminosa y etérea para una lectura más clara y una atmósfera visual más abierta.', en: 'A luminous, ethereal palette for clearer reading and a more open visual atmosphere.', zh: '明亮而空灵的配色，让阅读更清晰，视觉氛围更开阔。', hi: 'उजली और हल्की पैलेट, जो अधिक स्पष्ट पढ़ने और खुले दृश्य वातावरण के लिए है।', ar: 'لوحة مشرقة وخفيفة لقراءة أوضح وأجواء بصرية أكثر انفتاحاً.', it: 'Una palette luminosa ed eterea per una lettura più chiara e un’atmosfera visiva più aperta.', pt: 'Uma paleta luminosa e etérea para uma leitura mais clara e uma atmosfera visual mais aberta.', ru: 'Светлая и воздушная палитра для более ясного чтения и открытой визуальной атмосферы.', de: 'Eine leuchtende, ätherische Palette für klareres Lesen und eine offenere visuelle Atmosphäre.', fr: 'Une palette lumineuse et aérienne pour une lecture plus claire et une atmosphère visuelle plus ouverte.', da: 'En lys og luftig palet til tydeligere læsning og en mere åben visuel atmosfære.' },
  activateFilter: { es: 'Activar filtro ↗', en: 'Activate filter ↗', zh: '启用滤镜 ↗', hi: 'फ़िल्टर सक्रिय करें ↗', ar: 'تفعيل الفلتر ↗', it: 'Attiva filtro ↗', pt: 'Ativar filtro ↗', ru: 'Включить фильтр ↗', de: 'Filter aktivieren ↗', fr: 'Activer le filtre ↗', da: 'Aktivér filter ↗' },
  activeNow: { es: 'Activo ahora ✓', en: 'Active now ✓', zh: '当前启用 ✓', hi: 'अभी सक्रिय ✓', ar: 'نشط الآن ✓', it: 'Attivo ora ✓', pt: 'Ativo agora ✓', ru: 'Активен сейчас ✓', de: 'Jetzt aktiv ✓', fr: 'Actif maintenant ✓', da: 'Aktiv nu ✓' },
  triviaTitle: { es: 'Modo Trivia', en: 'Trivia Mode', zh: '问答模式', hi: 'ट्रिविया मोड', ar: 'وضع المعلومات', it: 'Modalità trivia', pt: 'Modo Trivia', ru: 'Режим викторины', de: 'Trivia-Modus', fr: 'Mode trivia', da: 'Trivia-tilstand' },
  triviaSubtitle: { es: 'Aprende jugando con los 12 modos de vida.', en: 'Learn through play with the 12 life modes.', zh: '通过游戏了解12种生活模式。', hi: '12 जीवन मोड के साथ खेलते हुए सीखें।', ar: 'تعلّم من خلال اللعب مع أنماط الحياة الاثني عشر.', it: 'Impara giocando con le 12 modalità di vita.', pt: 'Aprenda brincando com os 12 modos de vida.', ru: 'Изучайте 12 режимов жизни через игру.', de: 'Lerne spielerisch mit den 12 Lebensmodi.', fr: 'Apprenez en jouant avec les 12 modes de vie.', da: 'Lær gennem leg med de 12 livsmodi.' },
  triviaCta: { es: 'Explorar Modo Trivia', en: 'Explore Trivia Mode', zh: '探索问答模式', hi: 'ट्रिविया मोड देखें', ar: 'استكشف وضع المعلومات', it: 'Esplora la modalità trivia', pt: 'Explorar o Modo Trivia', ru: 'Открыть режим викторины', de: 'Trivia-Modus öffnen', fr: 'Explorer le mode trivia', da: 'Udforsk trivia-tilstand' },
  triviaHeroEyebrow: { es: 'Modo Trivia · Aprende jugando', en: 'Trivia Mode · Learn through play', zh: '问答模式 · 寓教于乐', hi: 'ट्रिविया मोड · खेलते हुए सीखें', ar: 'وضع المعلومات · تعلّم باللعب', it: 'Modalità trivia · Impara giocando', pt: 'Modo Trivia · Aprenda brincando', ru: 'Режим викторины · Учитесь играя', de: 'Trivia-Modus · Spielerisch lernen', fr: 'Mode trivia · Apprendre en jouant', da: 'Trivia-tilstand · Lær gennem leg' },
  triviaHeroTitle: { es: 'Una pregunta puede abrir un modo.', en: 'One question can open a mode.', zh: '一个问题可以打开一种模式。', hi: 'एक सवाल एक मोड खोल सकता है।', ar: 'قد يفتح سؤال واحد نمطاً جديداً.', it: 'Una domanda può aprire una modalità.', pt: 'Uma pergunta pode abrir um modo.', ru: 'Один вопрос может открыть новый режим.', de: 'Eine Frage kann einen Modus öffnen.', fr: 'Une question peut ouvrir un mode.', da: 'Ét spørgsmål kan åbne en tilstand.' },
  triviaHeroCopy: { es: 'Explora los 12 modos de vida con tarjetas interactivas. Piensa primero, voltea después y descubre qué cultiva cada dimensión de tu vida.', en: 'Explore the 12 life modes with interactive cards. Think first, flip next and discover what each dimension of your life cultivates.', zh: '用互动卡片探索12种生活模式。先思考，再翻转，发现每个生活维度培育的内容。', hi: 'इंटरैक्टिव कार्ड से 12 जीवन मोड खोजें। पहले सोचें, फिर पलटें और जानें कि जीवन का हर आयाम क्या विकसित करता है।', ar: 'استكشف أنماط الحياة الاثني عشر عبر بطاقات تفاعلية. فكّر أولاً ثم اقلب البطاقة واكتشف ما ينميه كل بُعد في حياتك.', it: 'Esplora le 12 modalità di vita con schede interattive. Rifletti, poi gira la scheda e scopri cosa coltiva ogni dimensione della tua vita.', pt: 'Explore os 12 modos de vida com cartões interativos. Pense primeiro, vire depois e descubra o que cada dimensão da sua vida cultiva.', ru: 'Исследуйте 12 режимов жизни с интерактивными карточками. Сначала подумайте, затем переверните карту и узнайте, что развивает каждое измерение жизни.', de: 'Erkunde die 12 Lebensmodi mit interaktiven Karten. Denke zuerst nach, drehe dann um und entdecke, was jede Dimension deines Lebens kultiviert.', fr: 'Explorez les 12 modes de vie avec des cartes interactives. Réfléchissez, retournez la carte et découvrez ce que cultive chaque dimension de votre vie.', da: 'Udforsk de 12 livstilstande med interaktive kort. Tænk først, vend derefter kortet, og opdag hvad hver livsdimension dyrker.' },
  triviaGuide: { es: 'Lee la pregunta, responde desde tu experiencia y voltea la tarjeta para conocer el modo.', en: 'Read the question, answer from your experience and flip the card to discover the mode.', zh: '阅读问题，从你的经验出发回答，然后翻转卡片了解该模式。', hi: 'सवाल पढ़ें, अपने अनुभव से जवाब दें और मोड जानने के लिए कार्ड पलटें।', ar: 'اقرأ السؤال وأجب من تجربتك ثم اقلب البطاقة لاكتشاف النمط.', it: 'Leggi la domanda, rispondi dalla tua esperienza e gira la scheda per scoprire la modalità.', pt: 'Leia a pergunta, responda a partir da sua experiência e vire o cartão para descobrir o modo.', ru: 'Прочитайте вопрос, ответьте исходя из своего опыта и переверните карту, чтобы узнать режим.', de: 'Lies die Frage, antworte aus deiner Erfahrung und drehe die Karte um, um den Modus zu entdecken.', fr: 'Lisez la question, répondez selon votre expérience et retournez la carte pour découvrir le mode.', da: 'Læs spørgsmålet, svar ud fra din erfaring, og vend kortet for at opdage tilstanden.' },
  triviaCardLabel: { es: 'FICHA', en: 'CARD', zh: '卡片', hi: 'कार्ड', ar: 'بطاقة', it: 'SCHEDA', pt: 'CARTÃO', ru: 'КАРТА', de: 'KARTE', fr: 'CARTE', da: 'KORT' },
  triviaQuestionLabel: { es: 'PREGUNTA', en: 'QUESTION', zh: '问题', hi: 'सवाल', ar: 'السؤال', it: 'DOMANDA', pt: 'PERGUNTA', ru: 'ВОПРОС', de: 'FRAGE', fr: 'QUESTION', da: 'SPØRGSMÅL' },
  triviaDiscovery: { es: 'DESCUBRIMIENTO', en: 'DISCOVERY', zh: '发现', hi: 'खोज', ar: 'اكتشاف', it: 'SCOPERTA', pt: 'DESCOBERTA', ru: 'ОТКРЫТИЕ', de: 'ENTDECKUNG', fr: 'DÉCOUVERTE', da: 'OPDAGELSE' },
  triviaInfo: { es: 'INFORMACIÓN DEL MODO', en: 'MODE INFORMATION', zh: '模式信息', hi: 'मोड की जानकारी', ar: 'معلومات النمط', it: 'INFORMAZIONI SULLA MODALITÀ', pt: 'INFORMAÇÕES DO MODO', ru: 'ИНФОРМАЦИЯ О РЕЖИМЕ', de: 'MODUSINFORMATIONEN', fr: 'INFORMATIONS SUR LE MODE', da: 'INFORMATION OM TILSTANDEN' },
  triviaFlip: { es: 'Voltear tarjeta', en: 'Flip card', zh: '翻转卡片', hi: 'कार्ड पलटें', ar: 'اقلب البطاقة', it: 'Gira la scheda', pt: 'Virar cartão', ru: 'Перевернуть карту', de: 'Karte umdrehen', fr: 'Retourner la carte', da: 'Vend kort' },
  triviaBack: { es: 'Volver a la pregunta', en: 'Back to the question', zh: '返回问题', hi: 'सवाल पर वापस जाएं', ar: 'العودة إلى السؤال', it: 'Torna alla domanda', pt: 'Voltar à pergunta', ru: 'Вернуться к вопросу', de: 'Zur Frage zurück', fr: 'Retour à la question', da: 'Tilbage til spørgsmålet' },
  triviaQuestionPrompt: { es: '¿Qué parte de tu vida pide atención?', en: 'What part of your life is asking for attention?', zh: '你生活中的哪一部分正在寻求关注？', hi: 'आपके जीवन का कौन सा हिस्सा ध्यान मांग रहा है?', ar: 'أي جزء من حياتك يطلب اهتمامك؟', it: 'Quale parte della tua vita chiede attenzione?', pt: 'Que parte da sua vida está pedindo atenção?', ru: 'Какая часть вашей жизни просит внимания?', de: 'Welcher Teil deines Lebens bittet um Aufmerksamkeit?', fr: 'Quelle partie de votre vie demande de l’attention ?', da: 'Hvilken del af dit liv beder om opmærksomhed?' },
  triviaAnswerPrefix: { es: 'Este modo cultiva', en: 'This mode cultivates', zh: '这一模式培育', hi: 'यह मोड विकसित करता है', ar: 'ينمّي هذا النمط', it: 'Questa modalità coltiva', pt: 'Este modo cultiva', ru: 'Этот режим развивает', de: 'Dieser Modus kultiviert', fr: 'Ce mode cultive', da: 'Denne tilstand dyrker' },
  globalName: { es: 'Modo Global', en: 'Global Mode', zh: '全球模式', hi: 'ग्लोबल मोड', ar: 'الوضع العالمي', it: 'Modalità globale', pt: 'Modo Global', ru: 'Глобальный режим', de: 'Globaler Modus', fr: 'Mode global', da: 'Global mode' },
  globalEyebrow: { es: 'MODO GLOBAL', en: 'GLOBAL MODE', zh: '全球模式', hi: 'ग्लोबल मोड', ar: 'الوضع العالمي', it: 'MODALITÀ GLOBALE', pt: 'MODO GLOBAL', ru: 'ГЛОБАЛЬНЫЙ РЕЖИМ', de: 'GLOBALER MODUS', fr: 'MODE GLOBAL', da: 'GLOBAL MODE' },
  globalTitle: { es: 'Tu cultivo, conectado al mundo.', en: 'Your cultivation, connected to the world.', zh: '让你的成长连接世界。', hi: 'आपका विकास दुनिया से जुड़ा है।', ar: 'تنميتك متصلة بالعالم.', it: 'La tua crescita, connessa al mondo.', pt: 'Seu cultivo conectado ao mundo.', ru: 'Ваше развитие связано с миром.', de: 'Deine Entwicklung, verbunden mit der Welt.', fr: 'Votre développement connecté au monde.', da: 'Din udvikling forbundet med verden.' },
  globalSubtitle: { es: 'Aquí las prácticas dejan de ser teoría: encuentra personas, experiencias y elige insignias para reconocer tu avance.', en: 'Here practices become more than theory: find people, experiences and badges that recognize your progress.', zh: '在这里实践不再只是理论：发现伙伴、经验，并选择徽章来记录你的成长。', hi: 'यहाँ अभ्यास केवल सिद्धांत नहीं: लोगों, अनुभवों और अपनी प्रगति को पहचानने वाले बैज खोजें।', ar: 'هنا تصبح الممارسات أكثر من نظرية: اعثر على أشخاص وتجارب واختر شارات تعترف بتقدمك.', it: 'Qui le pratiche diventano realtà: trova persone, esperienze e distintivi per riconoscere i tuoi progressi.', pt: 'Aqui as práticas deixam de ser teoria: encontre pessoas, experiências e emblemas para reconhecer seu avanço.', ru: 'Здесь практики становятся реальностью: находите людей, опыт и значки, отмечающие ваш прогресс.', de: 'Hier werden Praktiken mehr als Theorie: Finde Menschen, Erfahrungen und Abzeichen, die deinen Fortschritt sichtbar machen.', fr: 'Ici les pratiques deviennent concrètes : trouvez des personnes, des expériences et des badges pour reconnaître vos progrès.', da: 'Her bliver praksis til mere end teori: find mennesker, oplevelser og badges, der anerkender din fremgang.' },
  globalAccess: { es: 'ACCESO LIBRE · RED EN MOVIMIENTO', en: 'OPEN ACCESS · NETWORK IN MOTION', zh: '开放访问 · 网络正在连接', hi: 'खुली पहुंच · नेटवर्क सक्रिय है', ar: 'وصول مفت · شبكة متحركة', it: 'ACCESSO LIBERO · RETE IN MOVIMENTO', pt: 'ACESSO LIVRE · REDE EM MOVIMENTO', ru: 'СВОБОДНЫЙ ДОСТУП · СЕТЬ В ДВИЖЕНИИ', de: 'FREIER ZUGANG · NETZWERK IN BEWEGUNG', fr: 'ACCÈS LIBRE · RÉSEAU EN MOUVEMENT', da: 'ÅBEN ADGANG · NETVÆRK I BEVÆGELSE' },
  presetExample: { es: 'Ej. Mi equilibrio', en: 'e.g. My balance', zh: '例如：我的平衡', hi: 'जैसे: मेरा संतुलन', ar: 'مثال: توازني', it: 'Es. Il mio equilibrio', pt: 'Ex.: Meu equilíbrio', ru: 'Например: Моё равновесие', de: 'z. B. Mein Gleichgewicht', fr: 'Ex. : Mon équilibre', da: 'Fx. Min balance' },
  savedPresets: { es: 'Configuraciones de Vida Guardadas', en: 'Saved Life Presets', zh: '已保存的生活模式组合', hi: 'सहेजे गए जीवन-मोड संयोजन', ar: 'توليفات أنماط الحياة المحفوظة', it: 'Combinazioni salvate dei modi di vita', pt: 'Combinações salvas de modos de vida', ru: 'Сохранённые сочетания жизненных сфер', de: 'Gespeicherte Kombinationen der Lebensbereiche', fr: 'Combinaisons enregistrées des modes de vie', da: 'Gemte kombinationer af livsområder' },
  savedConfigurationsEyebrow: { es: 'DIFERENTES MODOS DE OPERAR', en: 'DIFFERENT WAYS TO OPERATE', zh: '已保存的生活模式组合', hi: 'सहेजे गए जीवन-मोड संयोजन', ar: 'توليفات أنماط الحياة المحفوظة', it: 'COMBINAZIONI DEI MODI DI VITA', pt: 'COMBINAÇÕES DE MODOS DE VIDA', ru: 'СОЧЕТАНИЯ ЖИЗНЕННЫХ СФЕР', de: 'KOMBINATIONEN DER LEBENSBEREICHE', fr: 'COMBINAISONS DES MODES DE VIE', da: 'KOMBINATIONER AF LIVSOMRÅDER' },
  presets: { es: 'Configuraciones de Vida', en: 'Life Presets', zh: '生活模式组合', hi: 'जीवन-मोड संयोजन', ar: 'توليفات أنماط الحياة', it: 'Combinazioni dei modi di vita', pt: 'Combinações de modos de vida', ru: 'Сочетания жизненных сфер', de: 'Kombinationen der Lebensbereiche', fr: 'Combinaisons des modes de vie', da: 'Kombinationer af livsområder' },
  selectPreset: { es: '— Selecciona una Configuración de Vida —', en: '— Select a Life Preset —', zh: '— 选择生活模式组合 —', hi: '— जीवन-मोड संयोजन चुनें —', ar: '— اختر توليفة أنماط الحياة —', it: '— Seleziona una combinazione dei modi di vita —', pt: '— Selecione uma combinação de modos de vida —', ru: '— Выберите сочетание жизненных сфер —', de: '— Wähle eine Kombination der Lebensbereiche —', fr: '— Choisissez une combinaison des modes de vie —', da: '— Vælg en kombination af livsområder —' },
  newPreset: { es: 'Nombra tu Configuración de Vida actual', en: 'Name your current Life Preset', zh: '为当前生活模式组合命名', hi: 'अपने वर्तमान जीवन-मोड संयोजन को नाम दें', ar: 'سمّ توليفة أنماط حياتك الحالية', it: 'Dai un nome alla tua combinazione attuale dei modi di vita', pt: 'Nomeie sua combinação atual de modos de vida', ru: 'Назовите текущее сочетание жизненных сфер', de: 'Benenne deine aktuelle Kombination der Lebensbereiche', fr: 'Nommez votre combinaison actuelle des modes de vie', da: 'Navngiv din aktuelle kombination af livsområder' },
  savedPresetDescription: { es: 'Guarda y recupera tus Configuraciones de Vida para explorar distintas combinaciones de los 12 modos.', en: 'Save and restore level combinations to explore different presence maps.', zh: '保存和恢复你的生活模式组合，探索12种模式的不同等级搭配。', hi: '12 मोड के अलग-अलग स्तर संयोजनों को देखने के लिए अपनी जीवन-मोड संयोजन सहेजें और वापस लाएं।', ar: 'احفظ توليفات أنماط حياتك واستعدها لاستكشاف مستويات مختلفة عبر الأوضاع الاثني عشر.', it: 'Salva e ripristina le tue combinazioni dei modi di vita per esplorare diversi livelli nei 12 modi.', pt: 'Salve e recupere suas combinações de modos de vida para explorar diferentes níveis nos 12 modos.', ru: 'Сохраняйте и восстанавливайте сочетания жизненных сфер, чтобы исследовать разные уровни во всех 12 режимах.', de: 'Speichere und lade deine Kombinationen der Lebensbereiche, um verschiedene Stufen in allen 12 Modi zu erkunden.', fr: 'Enregistrez et restaurez vos combinaisons des modes de vie pour explorer différents niveaux dans les 12 modes.', da: 'Gem og gendan dine kombinationer af livsområder for at udforske forskellige niveauer på tværs af de 12 områder.' },
  activityLevel: { es: 'ACTIVIDAD NIVEL', en: 'LEVEL ACTIVITY', zh: '等级活动', hi: 'स्तर गतिविधि', ar: 'نشاط المستوى', it: 'ATTIVITÀ LIVELLO', pt: 'ATIVIDADE NÍVEL', ru: 'АКТИВНОСТЬ УРОВНЯ', de: 'STUFENAKTIVITÄT', fr: 'ACTIVITÉ NIVEAU', da: 'NIVEAUAKTIVITET' },
  recommendation: { es: 'Recomendación', en: 'Recommendation', zh: '推荐', hi: 'सुझाव', ar: 'توصية', it: 'Raccomandazione', pt: 'Recomendação', ru: 'Рекомендация', de: 'Empfehlung', fr: 'Recommandation', da: 'Anbefaling' },
  globalSection: { es: 'Modo Global', en: 'Global Mode', zh: '全球模式', hi: 'ग्लोबल मोड', ar: 'الوضع العالمي', it: 'Modalità globale', pt: 'Modo Global', ru: 'Глобальный режим', de: 'Globaler Modus', fr: 'Mode global', da: 'Global mode' },
  commandCenter: { es: 'Centro de Mando', en: 'Command Center', zh: '指挥中心', hi: 'कमांड सेंटर', ar: 'مركز القيادة', it: 'Centro di comando', pt: 'Centro de comando', ru: 'Центр управления', de: 'Kommandozentrale', fr: 'Centre de commande', da: 'Kommandocenter' },
  globalInsights: { es: 'Ideas Globales', en: 'Global Ideas', zh: '全球创意', hi: 'वैश्विक विचार', ar: 'أفكار عالمية', it: 'Idee Globali', pt: 'Ideias Globais', ru: 'Глобальные Идеи', de: 'Globale Ideen', fr: 'Idées Globales', da: 'Globale Idéer' },
  specialistNetwork: { es: 'Red de Especialistas', en: 'Specialists Network', zh: '专家网络', hi: 'विशेषज्ञ नेटवर्क', ar: 'شبكة المتخصصين', it: 'Rete di specialisti', pt: 'Rede de especialistas', ru: 'Сеть специалистов', de: 'Expertennetzwerk', fr: 'Réseau de spécialistes', da: 'Specialistnetværk' },
  findYourNextGuide: { es: 'Encuentra a tu siguiente guía.', en: 'Find your next guide.', zh: '寻找下一位引路人。', hi: 'अपने अगले मार्गदर्शक को खोजें।', ar: 'اعثر على مرشدك التالي.', it: 'Trova la tua prossima guida.', pt: 'Encontre seu próximo guia.', ru: 'Найдите своего наставника.', de: 'Finde deine nächste Begleitung.', fr: 'Trouvez votre prochain guide.', da: 'Find din næste guide.' },
  verifiedProfiles: { es: 'PERFILES VERIFICADOS', en: 'VERIFIED PROFILES', zh: '已认证资料', hi: 'सत्यापित प्रोफ़ाइल', ar: 'ملفات موثقة', it: 'PROFILI VERIFICATI', pt: 'PERFIS VERIFICADOS', ru: 'ПОДТВЕРЖДЁННЫЕ ПРОФИЛИ', de: 'VERIFIZIERTE PROFILE', fr: 'PROFILS VÉRIFIÉS', da: 'VERIFICEREDE PROFILER' },
  filterByMode: { es: 'Filtrar por modo', en: 'Filter by mode', zh: '按模式筛选', hi: 'मोड के अनुसार फ़िल्टर करें', ar: 'تصفية حسب الوضع', it: 'Filtra per modalità', pt: 'Filtrar por modo', ru: 'Фильтр по режиму', de: 'Nach Modus filtern', fr: 'Filtrer par mode', da: 'Filtrér efter tilstand' },
  allModes: { es: 'Todos los modos', en: 'All modes', zh: '所有模式', hi: 'सभी मोड', ar: 'كل الأوضاع', it: 'Tutte le modalità', pt: 'Todos os modos', ru: 'Все режимы', de: 'Alle Modi', fr: 'Tous les modes', da: 'Alle tilstande' },
  filterByLanguage: { es: 'Filtrar por idioma', en: 'Filter by language', zh: '按语言筛选', hi: 'भाषा के अनुसार फ़िल्टर करें', ar: 'تصفية حسب اللغة', it: 'Filtra per lingua', pt: 'Filtrar por idioma', ru: 'Фильтр по языку', de: 'Nach Sprache filtern', fr: 'Filtrer par langue', da: 'Filtrér efter sprog' },
  anyLanguage: { es: 'Cualquier idioma', en: 'Any language', zh: '任何语言', hi: 'कोई भी भाषा', ar: 'أي لغة', it: 'Qualsiasi lingua', pt: 'Qualquer idioma', ru: 'Любой язык', de: 'Alle Sprachen', fr: 'Toutes les langues', da: 'Alle sprog' },
  filterByLocation: { es: 'Filtrar por ubicación', en: 'Filter by location', zh: '按地区筛选', hi: 'स्थान के अनुसार फ़िल्टर करें', ar: 'تصفية حسب الموقع', it: 'Filtra per area geografica', pt: 'Filtrar por localização', ru: 'Фильтр по местоположению', de: 'Nach Standort filtern', fr: 'Filtrer par lieu', da: 'Filtrér efter sted' },
  anyContinent: { es: 'Cualquier continente', en: 'Any continent', zh: '任何洲', hi: 'कोई भी महाद्वीप', ar: 'أي قارة', it: 'Qualsiasi continente', pt: 'Qualquer continente', ru: 'Любой континент', de: 'Alle Kontinente', fr: 'Tous les continents', da: 'Alle kontinenter' },
  availableForGuidance: { es: 'Disponible para orientación privada', en: 'Available for private guidance', zh: '可提供私人指导', hi: 'निजी मार्गदर्शन के लिए उपलब्ध', ar: 'متاح للإرشاد الخاص', it: 'Disponibile per un orientamento privato', pt: 'Disponível para orientação privada', ru: 'Доступен для индивидуальной консультации', de: 'Für persönliche Beratung verfügbar', fr: 'Disponible pour un accompagnement privé', da: 'Tilgængelig for personlig vejledning' },
  viewSpecialistProfile: { es: 'Ver perfil', en: 'View profile', zh: '查看资料', hi: 'प्रोफ़ाइल देखें', ar: 'عرض الملف الشخصي', it: 'Vedi profilo', pt: 'Ver perfil', ru: 'Посмотреть профиль', de: 'Profil ansehen', fr: 'Voir le profil', da: 'Se profil' },
  noSpecialistsMatch: { es: 'No hay especialistas con estos filtros. Prueba otra combinación.', en: 'No specialists match these filters. Try another combination.', zh: '没有符合这些筛选条件的专家，请尝试其他组合。', hi: 'इन फ़िल्टर से कोई विशेषज्ञ नहीं मिला। दूसरा संयोजन आज़माएँ।', ar: 'لا يوجد متخصصون بهذه الفلاتر. جرّب مجموعة أخرى.', it: 'Nessuno specialista corrisponde a questi filtri. Prova un’altra combinazione.', pt: 'Nenhum especialista corresponde a estes filtros. Tente outra combinação.', ru: 'По этим фильтрам специалистов нет. Попробуйте другую комбинацию.', de: 'Keine Fachleute passen zu diesen Filtern. Versuche eine andere Kombination.', fr: 'Aucun spécialiste ne correspond à ces filtres. Essayez une autre combinaison.', da: 'Ingen specialister matcher disse filtre. Prøv en anden kombination.' },
  verifiedProfile: { es: 'Perfil verificado', en: 'Verified profile', zh: '已认证资料', hi: 'सत्यापित प्रोफ़ाइल', ar: 'ملف موثق', it: 'Profilo verificato', pt: 'Perfil verificado', ru: 'Профиль подтверждён', de: 'Verifiziertes Profil', fr: 'Profil vérifié', da: 'Verificeret profil' },
  matchLabel: { es: 'coincidencia', en: 'match', zh: '匹配', hi: 'मेल', ar: 'توافق', it: 'corrispondenza', pt: 'compatibilidade', ru: 'совпадение', de: 'Übereinstimmung', fr: 'correspondance', da: 'match' },
  trajectory: { es: 'TRAYECTORIA', en: 'BACKGROUND', zh: '经历', hi: 'अनुभव', ar: 'المسيرة', it: 'PERCORSO', pt: 'TRAJETÓRIA', ru: 'ОПЫТ', de: 'WERDEGANG', fr: 'PARCOURS', da: 'BAGGRUND' },
  specialistPreset: { es: 'CONFIGURACIÓN DE VIDA DE MODO CULTIVA', en: 'MODO CULTIVA PRESET', zh: 'Modo Cultiva 生活模式组合', hi: 'Modo Cultiva जीवन-मोड संयोजन', ar: 'توليفة أنماط الحياة من Modo Cultiva', it: 'COMBINAZIONE MODO CULTIVA DEI MODI DI VITA', pt: 'COMBINAÇÃO MODO CULTIVA DE MODOS DE VIDA', ru: 'СОЧЕТАНИЕ ЖИЗНЕННЫХ СФЕР MODO CULTIVA', de: 'MODO CULTIVA-KOMBINATION DER LEBENSBEREICHE', fr: 'COMBINAISON MODO CULTIVA DES MODES DE VIE', da: 'MODO CULTIVA-KOMBINATION AF LIVSOMRÅDER' },
  twelveModesLevels: { es: '12 MODOS · NIVELES 0–9', en: '12 MODES · LEVELS 0–9', zh: '12种模式 · 等级0–9', hi: '12 मोड · स्तर 0–9', ar: '12 وضعاً · المستويات 0–9', it: '12 MODALITÀ · LIVELLI 0–9', pt: '12 MODOS · NÍVEIS 0–9', ru: '12 РЕЖИМОВ · УРОВНИ 0–9', de: '12 MODI · LEVEL 0–9', fr: '12 MODES · NIVEAUX 0–9', da: '12 TILSTANDE · NIVEAU 0–9' },
  remote: { es: 'Remoto', en: 'Remote', zh: '远程', hi: 'दूरस्थ', ar: 'عن بُعد', it: 'Da remoto', pt: 'Remoto', ru: 'Удалённо', de: 'Remote', fr: 'À distance', da: 'Fjern' },
  continentNorthAmerica: { es: 'América del Norte', en: 'North America', zh: '北美洲', hi: 'उत्तरी अमेरिका', ar: 'أمريكا الشمالية', it: 'America del Nord', pt: 'América do Norte', ru: 'Северная Америка', de: 'Nordamerika', fr: 'Amérique du Nord', da: 'Nordamerika' },
  continentCentralAmerica: { es: 'América Central', en: 'Central America', zh: '中美洲', hi: 'मध्य अमेरिका', ar: 'أمريكا الوسطى', it: 'America centrale', pt: 'América Central', ru: 'Центральная Америка', de: 'Mittelamerika', fr: 'Amérique centrale', da: 'Mellemamerika' },
  continentSouthAmerica: { es: 'América del Sur', en: 'South America', zh: '南美洲', hi: 'दक्षिण अमेरिका', ar: 'أمريكا الجنوبية', it: 'America del Sud', pt: 'América do Sul', ru: 'Южная Америка', de: 'Südamerika', fr: 'Amérique du Sud', da: 'Sydamerika' },
  continentEurope: { es: 'Europa', en: 'Europe', zh: '欧洲', hi: 'यूरोप', ar: 'أوروبا', it: 'Europa', pt: 'Europa', ru: 'Европа', de: 'Europa', fr: 'Europe', da: 'Europa' },
  continentAsia: { es: 'Asia', en: 'Asia', zh: '亚洲', hi: 'एशिया', ar: 'آسيا', it: 'Asia', pt: 'Ásia', ru: 'Азия', de: 'Asien', fr: 'Asie', da: 'Asien' },
  continentAfrica: { es: 'África', en: 'Africa', zh: '非洲', hi: 'अफ़्रीका', ar: 'أفريقيا', it: 'Africa', pt: 'África', ru: 'Африка', de: 'Afrika', fr: 'Afrique', da: 'Afrika' },
  continentOceania: { es: 'Oceanía', en: 'Oceania', zh: '大洋洲', hi: 'ओशिनिया', ar: 'أوقيانوسيا', it: 'Oceania', pt: 'Oceania', ru: 'Океания', de: 'Ozeanien', fr: 'Océanie', da: 'Oceanien' },
  skinsGallery: { es: 'Galería de Skins & Filtros', en: 'Skins & Filters Gallery', zh: '皮肤与滤镜库', hi: 'स्किन और फ़िल्टर गैलरी', ar: 'معرض الواجهات والفلاتر', it: 'Galleria di skin e filtri', pt: 'Galeria de skins e filtros', ru: 'Галерея скинов и фильтров', de: 'Skins- und Filtergalerie', fr: 'Galerie des skins et filtres', da: 'Galleri med skins og filtre' },
  globalEyebrowLine: { es: 'ENTRA A LA RED DONDE LAS PRÁCTICAS SE VUELVEN CONEXIONES', en: 'ENTER THE NETWORK WHERE PRACTICES BECOME CONNECTIONS', zh: '进入让实践成为连接的网络', hi: 'उस नेटवर्क में प्रवेश करें जहाँ अभ्यास संबंध बनते हैं', ar: 'ادخل الشبكة حيث تتحول الممارسات إلى روابط', it: 'ENTRA NELLA RETE DOVE LE PRATICHE DIVENTANO CONNESSIONI', pt: 'ENTRE NA REDE ONDE PRÁTICAS VIRAM CONEXÕES', ru: 'ВОЙДИТЕ В СЕТЬ, ГДЕ ПРАКТИКИ СТАНОВЯТСЯ СВЯЗЯМИ', de: 'BETRITT DAS NETZWERK, IN DEM PRAKTIKEN ZU VERBINDUNGEN WERDEN', fr: 'ENTREZ DANS LE RÉSEAU OÙ LES PRATIQUES DEVIENNENT DES LIENS', da: 'TRÆD IND I NETVÆRKET, HVOR PRAKSIS BLIVER TIL FORBINDELSER' },
  effortParameter: { es: 'PARÁMETRO DE ESFUERZO', en: 'EFFORT PARAMETER', zh: '投入参数', hi: 'प्रयास पैरामीटर', ar: 'معيار الجهد', it: 'PARAMETRO DI IMPEGNO', pt: 'PARÂMETRO DE ESFORÇO', ru: 'ПАРАМЕТР УСИЛИЙ', de: 'AUFWANDSPARAMETER', fr: 'PARAMÈTRE D’EFFORT', da: 'INDSATSPARAMETER' },
  effortBajo: { es: 'Esta etapa requiere principalmente tiempo: observar, comprender y crear espacio constante para el modo.', en: 'This stage primarily requires time: observing, understanding and creating consistent space for the mode.', zh: '这一阶段主要需要时间：观察、理解，并为该模式持续留出空间。', hi: 'इस चरण में मुख्य रूप से समय चाहिए: देखना, समझना और इस मोड के लिए निरंतर जगह बनाना।', ar: 'تتطلب هذه المرحلة الوقت أساساً: الملاحظة والفهم وتخصيص مساحة مستمرة للوضع.', it: 'Questa fase richiede soprattutto tempo: osservare, comprendere e creare uno spazio costante per la modalità.', pt: 'Esta etapa requer principalmente tempo: observar, compreender e criar espaço constante para o modo.', ru: 'На этом этапе в первую очередь требуется время: наблюдать, понимать и постоянно оставлять место для режима.', de: 'Diese Phase erfordert vor allem Zeit: beobachten, verstehen und dauerhaft Raum für den Modus schaffen.', fr: 'Cette étape demande surtout du temps : observer, comprendre et créer un espace régulier pour le mode.', da: 'Dette trin kræver primært tid: at observere, forstå og skabe vedvarende plads til tilstanden.' },
  effortMedio: { es: 'Esta etapa requiere tiempo y energía: sostener una práctica activa, tomar decisiones y mantener continuidad.', en: 'This stage requires time and energy: sustaining active practice, making decisions and maintaining continuity.', zh: '这一阶段需要时间和精力：保持主动实践、作出决定并维持连续性。', hi: 'इस चरण में समय और ऊर्जा चाहिए: सक्रिय अभ्यास बनाए रखना, निर्णय लेना और निरंतरता रखना।', ar: 'تتطلب هذه المرحلة الوقت والطاقة: الحفاظ على ممارسة نشطة واتخاذ القرارات والاستمرارية.', it: 'Questa fase richiede tempo ed energia: sostenere una pratica attiva, prendere decisioni e mantenere continuità.', pt: 'Esta etapa requer tempo e energia: manter uma prática ativa, tomar decisões e preservar a continuidade.', ru: 'На этом этапе нужны время и энергия: поддерживать активную практику, принимать решения и сохранять непрерывность.', de: 'Diese Phase erfordert Zeit und Energie: aktive Praxis aufrechterhalten, Entscheidungen treffen und Kontinuität sichern.', fr: 'Cette étape demande du temps et de l’énergie : maintenir une pratique active, décider et assurer la continuité.', da: 'Dette trin kræver tid og energi: at fastholde en aktiv praksis, træffe beslutninger og bevare kontinuiteten.' },
  effortAlto: { es: 'Esta etapa requiere tiempo, energía y dinero: asignar recursos, ampliar capacidades y sostener una operación más compleja.', en: 'This stage requires time, energy and money: allocating resources, expanding capabilities and sustaining greater complexity.', zh: '这一阶段需要时间、精力和金钱：分配资源、扩展能力并维持更复杂的运作。', hi: 'इस चरण में समय, ऊर्जा और धन चाहिए: संसाधन लगाना, क्षमताएं बढ़ाना और अधिक जटिल संचालन बनाए रखना।', ar: 'تتطلب هذه المرحلة الوقت والطاقة والمال: توزيع الموارد وتوسيع القدرات والحفاظ على تشغيل أكثر تعقيداً.', it: 'Questa fase richiede tempo, energia e denaro: assegnare risorse, ampliare le capacità e sostenere un funzionamento più complesso.', pt: 'Esta etapa requer tempo, energia e dinheiro: alocar recursos, ampliar capacidades e sustentar uma operação mais complexa.', ru: 'На этом этапе нужны время, энергия и деньги: распределять ресурсы, расширять возможности и поддерживать более сложную работу.', de: 'Diese Phase erfordert Zeit, Energie und Geld: Ressourcen einsetzen, Fähigkeiten erweitern und komplexere Abläufe tragen.', fr: 'Cette étape demande du temps, de l’énergie et de l’argent : allouer des ressources, élargir les capacités et soutenir une organisation plus complexe.', da: 'Dette trin kræver tid, energi og penge: at fordele ressourcer, udvide evner og opretholde en mere kompleks drift.' },
  effortVision: { es: 'Esta etapa integra los recursos desarrollados para consolidar una visión completa.', en: 'This stage integrates the resources developed to consolidate a complete vision.', zh: '这一阶段整合已发展的资源，形成完整的愿景。', hi: 'यह चरण विकसित संसाधनों को जोड़कर एक पूर्ण दृष्टि को मजबूत करता है।', ar: 'تدمج هذه المرحلة الموارد التي طُوّرت لترسيخ رؤية كاملة.', it: 'Questa fase integra le risorse sviluppate per consolidare una visione completa.', pt: 'Esta etapa integra os recursos desenvolvidos para consolidar uma visão completa.', ru: 'Этот этап объединяет развитые ресурсы для формирования целостного видения.', de: 'Diese Phase verbindet die entwickelten Ressourcen zu einer vollständigen Vision.', fr: 'Cette étape intègre les ressources développées pour consolider une vision complète.', da: 'Dette trin samler de udviklede ressourcer til en samlet vision.' },
  presenceLevel: { es: 'Aumenta o disminuye tu nivel de claridad basado en tu realidad actual', en: 'Increase or decrease your clarity level based on your current reality', zh: '根据你当前的实际情况提高或降低你的清晰度', hi: 'अपनी वर्तमान वास्तविकता के अनुसार स्पष्टता का स्तर बढ़ाएँ या घटाएँ', ar: 'ارفع أو اخفض مستوى وضوحك بناءً على واقعك الحالي', it: 'Aumenta o diminuisci il tuo livello di chiarezza in base alla tua realtà attuale', pt: 'Aumente ou diminua seu nível de clareza com base na sua realidade atual', ru: 'Повышайте или понижайте уровень ясности с учётом текущей ситуации', de: 'Erhöhe oder verringere deine Klarheit entsprechend deiner aktuellen Lebensrealität', fr: 'Augmentez ou diminuez votre niveau de clarté selon votre réalité actuelle', da: 'Hæv eller sænk dit klarhedsniveau ud fra din aktuelle virkelighed' },
  activityDesign: { es: 'Diseño de Actividad', en: 'Activity Design', zh: '活动设计', hi: 'गतिविधि डिजाइन', ar: 'تصميم النشاط', it: 'Progettazione dell’attività', pt: 'Design da atividade', ru: 'Дизайн активности', de: 'Aktivitätsdesign', fr: 'Conception de l’activité', da: 'Aktivitetsdesign' },
  cultivationPath: { es: 'Tu ruta de cultivo', en: 'Your cultivation path', zh: '你的培育路径', hi: 'आपका विकास मार्ग', ar: 'مسار تنميتك', it: 'Il tuo percorso di crescita', pt: 'Sua rota de cultivo', ru: 'Ваш путь развития', de: 'Dein Entwicklungsweg', fr: 'Votre parcours de développement', da: 'Din udviklingsrejse' },
  journeyBuilderIntro: { es: 'Define una práctica concreta para avanzar en', en: 'Define a concrete practice to advance in', zh: '为此模式制定一项具体的实践，帮助你不断进步', hi: 'इस मोड में आगे बढ़ने के लिए एक ठोस अभ्यास तय करें', ar: 'حدّد ممارسة ملموسة للتقدم في', it: 'Definisci una pratica concreta per avanzare in', pt: 'Defina uma prática concreta para avançar em', ru: 'Определите конкретную практику для продвижения в', de: 'Lege eine konkrete Praxis fest, um in diesem Bereich voranzukommen:', fr: 'Définissez une pratique concrète pour progresser dans', da: 'Fastlæg en konkret praksis for at gøre fremskridt inden for' },
  cultivationArea: { es: 'Área de cultivo personal', en: 'Personal cultivation area', zh: '个人培育领域', hi: 'व्यक्तिगत विकास क्षेत्र', ar: 'مجال التنمية الشخصية', it: 'Area di crescita personale', pt: 'Área de cultivo pessoal', ru: 'Область личного развития', de: 'Persönlicher Entwicklungsbereich', fr: 'Domaine de développement personnel', da: 'Personligt udviklingsområde' },
  activityUndefined: { es: 'Actividad por definir', en: 'Activity to define', zh: '待定义活动', hi: 'गतिविधि परिभाषित करें', ar: 'نشاط بحاجة إلى تعريف', it: 'Attività da definire', pt: 'Atividade a definir', ru: 'Активность нужно определить', de: 'Aktivität festlegen', fr: 'Activité à définir', da: 'Aktivitet skal defineres' },
  activitySaved: { es: 'Actividad guardada en este navegador.', en: 'Activity saved in this browser.', zh: '活动已保存在此浏览器中。', hi: 'गतिविधि इस ब्राउज़र में सहेजी गई है।', ar: 'تم حفظ النشاط في هذا المتصفح.', it: 'Attività salvata in questo browser.', pt: 'Atividade salva neste navegador.', ru: 'Активность сохранена в этом браузере.', de: 'Aktivität in diesem Browser gespeichert.', fr: 'Activité enregistrée dans ce navigateur.', da: 'Aktivitet gemt i denne browser.' },
  activitySavedToJourney: { es: 'Actividad guardada en el journey correspondiente.', en: 'Activity saved to the corresponding journey.', zh: '活动已保存到对应的模式旅程。', hi: 'गतिविधि संबंधित मोड यात्रा में सहेजी गई है।', ar: 'تم حفظ النشاط في رحلة الوضع المقابلة.', it: 'Attività salvata nel percorso corrispondente.', pt: 'Atividade salva na jornada correspondente.', ru: 'Активность сохранена в соответствующем пути режима.', de: 'Aktivität im entsprechenden Modus-Journey gespeichert.', fr: 'Activité enregistrée dans le parcours correspondant.', da: 'Aktiviteten blev gemt i den tilsvarende mode-rejse.' },
  modifyActivity: { es: 'Modificar Actividad', en: 'Modify activity', zh: '修改活动', hi: 'गतिविधि संशोधित करें', ar: 'تعديل النشاط', it: 'Modifica attività', pt: 'Modificar atividade', ru: 'Изменить активность', de: 'Aktivität ändern', fr: 'Modifier l’activité', da: 'Redigér aktivitet' },
  addActivity: { es: 'Agregar Actividad', en: 'Add activity', zh: '添加活动', hi: 'गतिविधि जोड़ें', ar: 'إضافة نشاط', it: 'Aggiungi attività', pt: 'Adicionar atividade', ru: 'Добавить активность', de: 'Aktivität hinzufügen', fr: 'Ajouter une activité', da: 'Tilføj aktivitet' },
  activityPool: { es: 'Banco de actividades', en: 'Activity bank', zh: '活动库', hi: 'गतिविधि बैंक', ar: 'بنك الأنشطة', it: 'Raccolta di attività', pt: 'Banco de atividades', ru: 'Банк занятий', de: 'Aktivitätensammlung', fr: 'Banque d’activités', da: 'Aktivitetsbank' },
  modeAI: { es: 'Modo IA', en: 'Mode AI', zh: '模式 AI', hi: 'मोड AI', ar: 'وضع الذكاء الاصطناعي', it: 'Modo IA', pt: 'Modo IA', ru: 'Mode AI', de: 'Mode AI', fr: 'Mode IA', da: 'Mode AI' },
  insightRequested: { es: 'Idea local solicitada', en: 'Local idea requested', zh: '已请求本地想法', hi: 'स्थानीय विचार का अनुरोध किया गया', ar: 'تم طلب فكرة محلية', it: 'Idea locale richiesta', pt: 'Ideia local solicitada', ru: 'Запрошена локальная идея', de: 'Lokale Idee angefragt', fr: 'Idée locale demandée', da: 'Lokal idé anmodet' },
  requestInsights: { es: 'Pedir Idea Local', en: 'Request a local idea', zh: '请求本地想法', hi: 'स्थानीय विचार माँगें', ar: 'اطلب فكرة محلية', it: 'Richiedi un’idea locale', pt: 'Pedir ideia local', ru: 'Запросить локальную идею', de: 'Lokale Idee anfragen', fr: 'Demander une idée locale', da: 'Bed om en lokal idé' },
  localIdeaCancelled: { es: 'Solicitud de idea local cancelada.', en: 'Local idea request cancelled.', zh: '已取消本地想法请求。', hi: 'स्थानीय विचार का अनुरोध रद्द किया गया।', ar: 'تم إلغاء طلب الفكرة المحلية.', it: 'Richiesta di idea locale annullata.', pt: 'Solicitação de ideia local cancelada.', ru: 'Запрос локальной идеи отменён.', de: 'Anfrage für lokale Idee zurückgezogen.', fr: 'Demande d’idée locale annulée.', da: 'Anmodningen om en lokal idé er annulleret.' },
  editMyProfile: { es: 'Editar mi perfil', en: 'Edit my profile', zh: '编辑我的个人资料', hi: 'मेरी प्रोफ़ाइल संपादित करें', ar: 'تعديل ملفي الشخصي', it: 'Modifica il mio profilo', pt: 'Editar meu perfil', ru: 'Изменить мой профиль', de: 'Mein Profil bearbeiten', fr: 'Modifier mon profil', da: 'Rediger min profil' },
  profileButton: { es: 'Perfil', en: 'Profile', zh: '个人资料', hi: 'प्रोफ़ाइल', ar: 'الملف الشخصي', it: 'Profilo', pt: 'Perfil', ru: 'Профиль', de: 'Profil', fr: 'Profil', da: 'Profil' },
  accessDashboard: { es: 'Acceder al Centro de Control', en: 'Access the Control Center', zh: '进入控制中心', hi: 'नियंत्रण केंद्र खोलें', ar: 'الدخول إلى مركز التحكم', it: 'Accedi al centro di controllo', pt: 'Acessar o Centro de Controle', ru: 'Перейти в центр управления', de: 'Kontrollzentrum öffnen', fr: 'Accéder au centre de contrôle', da: 'Åbn kontrolcenteret' },
  controlCenter: { es: 'Centro de Control', en: 'Control Center', zh: '控制中心', hi: 'नियंत्रण केंद्र', ar: 'مركز التحكم', it: 'Centro di controllo', pt: 'Centro de Controle', ru: 'Центр управления', de: 'Kontrollzentrum', fr: 'Centre de contrôle', da: 'Kontrolcenter' },
  renameConfiguration: { es: 'Renombrar', en: 'Rename', zh: '重命名', hi: 'नाम बदलें', ar: 'إعادة التسمية', it: 'Rinomina', pt: 'Renomear', ru: 'Переименовать', de: 'Umbenennen', fr: 'Renommer', da: 'Omdøb' },
  configurationNewName: { es: 'Nuevo nombre', en: 'New name', zh: '新名称', hi: 'नया नाम', ar: 'الاسم الجديد', it: 'Nuovo nome', pt: 'Novo nome', ru: 'Новое название', de: 'Neuer Name', fr: 'Nouveau nom', da: 'Nyt navn' },
  saveConfigurationName: { es: 'Guardar nombre', en: 'Save name', zh: '保存名称', hi: 'नाम सहेजें', ar: 'حفظ الاسم', it: 'Salva nome', pt: 'Salvar nome', ru: 'Сохранить название', de: 'Namen speichern', fr: 'Enregistrer le nom', da: 'Gem navn' },
  cancelRename: { es: 'Cancelar', en: 'Cancel', zh: '取消', hi: 'रद्द करें', ar: 'إلغاء', it: 'Annulla', pt: 'Cancelar', ru: 'Отмена', de: 'Abbrechen', fr: 'Annuler', da: 'Annuller' },
  presetSelectRename: { es: 'Selecciona una Configuración de Vida para renombrarla.', en: 'Select a preset to rename.', zh: '选择要重命名的生活模式组合。', hi: 'नाम बदलने के लिए जीवन-मोड संयोजन चुनें।', ar: 'اختر توليفة أنماط الحياة لإعادة تسميتها.', it: 'Seleziona una combinazione da rinominare.', pt: 'Selecione uma combinação para renomear.', ru: 'Выберите сочетание для переименования.', de: 'Wähle eine Kombination zum Umbenennen aus.', fr: 'Sélectionnez une combinaison à renommer.', da: 'Vælg en kombination, der skal omdøbes.' },
  presetNameExists: { es: 'Ya existe una Configuración de Vida con ese nombre. Elige otro.', en: 'A preset with that name already exists. Choose another name.', zh: '该名称已存在，请选择其他名称。', hi: 'इस नाम का संयोजन पहले से मौजूद है। दूसरा नाम चुनें।', ar: 'توجد توليفة بهذا الاسم. اختر اسماً آخر.', it: 'Questo nome esiste già. Scegline un altro.', pt: 'Já existe uma combinação com esse nome. Escolha outro.', ru: 'Такое название уже существует. Выберите другое.', de: 'Dieser Name ist bereits vergeben. Wähle einen anderen.', fr: 'Ce nom existe déjà. Choisissez-en un autre.', da: 'Navnet findes allerede. Vælg et andet.' },
  presetRenamed: { es: 'Configuración de Vida renombrada a “{name}”.', en: 'Preset renamed to “{name}”.', zh: '已重命名为“{name}”。', hi: 'नाम बदलकर “{name}” कर दिया गया।', ar: 'تمت إعادة التسمية إلى “{name}”.', it: 'Combinazione rinominata “{name}”.', pt: 'Combinação renomeada para “{name}”.', ru: 'Новое название: «{name}».', de: 'Umbenannt in „{name}“.', fr: 'Combinaison renommée « {name} ».', da: 'Omdøbt til “{name}”.' },
  presetRenameFailed: { es: 'No se pudo guardar el nuevo nombre. Inténtalo de nuevo.', en: 'Could not save the new name. Try again.', zh: '无法保存新名称，请重试。', hi: 'नया नाम सहेजा नहीं जा सका। फिर कोशिश करें।', ar: 'تعذر حفظ الاسم الجديد. حاول مجدداً.', it: 'Impossibile salvare il nuovo nome. Riprova.', pt: 'Não foi possível salvar o novo nome. Tente novamente.', ru: 'Не удалось сохранить новое название. Повторите попытку.', de: 'Der neue Name konnte nicht gespeichert werden. Versuche es erneut.', fr: 'Impossible d’enregistrer le nouveau nom. Réessayez.', da: 'Det nye navn kunne ikke gemmes. Prøv igen.' },
  journeyGrowthBenefit: { es: 'Desarrollarlo fortalece tu bienestar y te da herramientas concretas para avanzar con más equilibrio.', en: 'Developing this area supports your wellbeing and gives you practical tools to move forward with greater balance.', zh: '发展这一领域有助于提升幸福感，并提供更平衡前进的实用方法。', hi: 'इस क्षेत्र को विकसित करने से आपका कल्याण बेहतर होता है और संतुलित प्रगति के व्यावहारिक साधन मिलते हैं।', ar: 'يساعد تطوير هذا المجال على تعزيز رفاهك ويمنحك أدوات عملية للتقدم بتوازن أكبر.', it: 'Coltivare quest’area sostiene il tuo benessere e ti offre strumenti concreti per progredire con più equilibrio.', pt: 'Desenvolver esta área favorece seu bem-estar e oferece ferramentas práticas para avançar com mais equilíbrio.', ru: 'Развитие этой сферы поддерживает благополучие и даёт практические способы двигаться вперёд сбалансированно.', de: 'Die Entwicklung dieses Bereichs stärkt dein Wohlbefinden und gibt dir konkrete Mittel für ausgewogene Fortschritte.', fr: 'Développer ce domaine favorise votre bien-être et vous donne des moyens concrets d’avancer avec plus d’équilibre.', da: 'Udvikling af dette område styrker dit velbefindende og giver konkrete værktøjer til mere balance.' },
  current: { es: 'Actual', en: 'Current', zh: '当前', hi: 'वर्तमान', ar: 'الحالي', it: 'Attuale', pt: 'Atual', ru: 'Текущий', de: 'Aktuell', fr: 'Actuel', da: 'Aktuel' },
  presetNameRequired: { es: 'Escribe un nombre para guardar tu configuración.', en: 'Enter a name to save your configuration.', zh: '输入名称以保存配置。', hi: 'अपना कॉन्फ़िगरेशन सहेजने के लिए नाम दर्ज करें।', ar: 'أدخل اسماً لحفظ إعداداتك.', it: 'Inserisci un nome per salvare la configurazione.', pt: 'Digite um nome para salvar sua configuração.', ru: 'Введите название, чтобы сохранить конфигурацию.', de: 'Gib einen Namen ein, um deine Konfiguration zu speichern.', fr: 'Saisissez un nom pour enregistrer votre configuration.', da: 'Indtast et navn for at gemme din konfiguration.' },
  presetSelectLoad: { es: 'Selecciona un preset para cargarlo.', en: 'Select a preset to load it.', zh: '选择一个预设以加载。', hi: 'लोड करने के लिए एक प्रीसेट चुनें।', ar: 'اختر إعداداً مسبقاً لتحميله.', it: 'Seleziona un preset da caricare.', pt: 'Selecione um preset para carregá-lo.', ru: 'Выберите пресет для загрузки.', de: 'Wähle ein Preset zum Laden aus.', fr: 'Sélectionnez un preset à charger.', da: 'Vælg et preset, der skal indlæses.' },
  presetSelectDelete: { es: 'Selecciona un preset para eliminarlo.', en: 'Select a preset to delete it.', zh: '选择一个预设以删除。', hi: 'हटाने के लिए एक प्रीसेट चुनें।', ar: 'اختر إعداداً مسبقاً لحذفه.', it: 'Seleziona un preset da eliminare.', pt: 'Selecione um preset para excluí-lo.', ru: 'Выберите пресет для удаления.', de: 'Wähle ein Preset zum Löschen aus.', fr: 'Sélectionnez un preset à supprimer.', da: 'Vælg et preset, der skal slettes.' },
  presetSaved: { es: 'Preset “{name}” guardado.', en: 'Preset “{name}” saved.', zh: '预设“{name}”已保存。', hi: 'प्रीसेट “{name}” सहेजा गया।', ar: 'تم حفظ الإعداد المسبق “{name}”.', it: 'Preset “{name}” salvato.', pt: 'Preset “{name}” salvo.', ru: 'Пресет «{name}» сохранён.', de: 'Preset „{name}“ gespeichert.', fr: 'Preset « {name} » enregistré.', da: 'Preset “{name}” gemt.' },
  presetLoaded: { es: 'Preset “{name}” cargado en tu mapa.', en: 'Preset “{name}” loaded onto your map.', zh: '预设“{name}”已加载到你的地图。', hi: 'प्रीसेट “{name}” आपके मानचित्र पर लोड किया गया।', ar: 'تم تحميل الإعداد المسبق “{name}” على خريطتك.', it: 'Preset “{name}” caricato sulla tua mappa.', pt: 'Preset “{name}” carregado no seu mapa.', ru: 'Пресет «{name}» загружен на карту.', de: 'Preset „{name}“ auf deine Karte geladen.', fr: 'Preset « {name} » chargé sur votre carte.', da: 'Preset “{name}” indlæst på dit kort.' },
  presetDeleted: { es: 'Preset eliminado.', en: 'Preset deleted.', zh: '预设已删除。', hi: 'प्रीसेट हटा दिया गया।', ar: 'تم حذف الإعداد المسبق.', it: 'Preset eliminato.', pt: 'Preset excluído.', ru: 'Пресет удалён.', de: 'Preset gelöscht.', fr: 'Preset supprimé.', da: 'Preset slettet.' },
  finalVision: { es: 'Tu visión final', en: 'Your final vision', zh: '你的最终愿景', hi: 'आपकी अंतिम दृष्टि', ar: 'رؤيتك النهائية', it: 'La tua visione finale', pt: 'Sua visão final', ru: 'Ваше итоговое видение', de: 'Deine finale Vision', fr: 'Votre vision finale', da: 'Din endelige vision' },
  finalVisionCopy: { es: 'Representa en una imagen el resultado al que quieres llegar.', en: 'Represent the result you want to reach in an image.', zh: '用图片呈现你想达到的结果。', hi: 'जिस परिणाम तक पहुँचना है उसे चित्र में दिखाएं।', ar: 'مثّل النتيجة التي تريد الوصول إليها في صورة.', it: 'Rappresenta in un’immagine il risultato che vuoi raggiungere.', pt: 'Represente em uma imagem o resultado que deseja alcançar.', ru: 'Представьте на изображении результат, которого хотите достичь.', de: 'Zeige in einem Bild das Ergebnis, das du erreichen möchtest.', fr: 'Représentez en image le résultat à atteindre.', da: 'Vis det resultat, du vil nå, i et billede.' },
  changeImage: { es: 'Cambiar imagen', en: 'Change image', zh: '更换图片', hi: 'चित्र बदलें', ar: 'تغيير الصورة', it: 'Cambia immagine', pt: 'Alterar imagem', ru: 'Изменить изображение', de: 'Bild ändern', fr: 'Changer l’image', da: 'Skift billede' },
  uploadImage: { es: 'Cargar imagen', en: 'Upload image', zh: '上传图片', hi: 'चित्र अपलोड करें', ar: 'تحميل صورة', it: 'Carica immagine', pt: 'Carregar imagem', ru: 'Загрузить изображение', de: 'Bild hochladen', fr: 'Charger une image', da: 'Upload billede' },
  activityPlaceholder: { es: 'Ej. Caminaré 20 minutos después del trabajo, tres veces esta semana…', en: 'e.g. I will walk for 20 minutes after work, three times this week…', zh: '例如：本周下班后散步20分钟，进行三次……', hi: 'जैसे: इस सप्ताह काम के बाद 20 मिनट टहलूंगा…', ar: 'مثال: سأمشي 20 دقيقة بعد العمل ثلاث مرات هذا الأسبوع…', it: 'Es. Camminerò 20 minuti dopo il lavoro, tre volte questa settimana…', pt: 'Ex.: Caminharei 20 minutos depois do trabalho, três vezes esta semana…', ru: 'Например: буду гулять 20 минут после работы три раза на этой неделе…', de: 'z. B. Ich gehe diese Woche dreimal 20 Minuten nach der Arbeit spazieren…', fr: 'Ex. : Je marcherai 20 minutes après le travail, trois fois cette semaine…', da: 'Fx. Jeg går 20 minutter efter arbejde tre gange i denne uge…' },
  buildActivity: { es: 'Construyamos tu actividad', en: 'Let’s build your activity', zh: '一起设计你的活动', hi: 'अपनी गतिविधि बनाएं', ar: 'لنصمم نشاطك', it: 'Costruiamo la tua attività', pt: 'Vamos criar sua atividade', ru: 'Создадим вашу активность', de: 'Entwickeln wir deine Aktivität', fr: 'Construisons votre activité', da: 'Lad os bygge din aktivitet' },
  agentStatus: { es: 'Estado del agente', en: 'Agent status', zh: '智能体状态', hi: 'एजेंट स्थिति', ar: 'حالة الوكيل', it: 'Stato dell’agente', pt: 'Status do agente', ru: 'Статус агента', de: 'Agentenstatus', fr: 'État de l’agent', da: 'Agentstatus' },
  agentReady: { es: 'Modo IA listo', en: 'Mode AI ready', zh: '模式 AI 已就绪', hi: 'मोड AI तैयार', ar: 'وضع الذكاء الاصطناعي جاهز', it: 'Modo IA pronto', pt: 'Modo IA pronto', ru: 'Mode AI готов', de: 'Mode AI bereit', fr: 'Mode IA prêt', da: 'Mode AI klar' },
  proposalReady: { es: 'Propuesta preparada para revisar', en: 'Proposal ready to review', zh: '建议已准备好供你查看', hi: 'सुझाव समीक्षा के लिए तैयार है', ar: 'الاقتراح جاهز للمراجعة', it: 'Proposta pronta da rivedere', pt: 'Proposta pronta para revisar', ru: 'Предложение готово к просмотру', de: 'Vorschlag zur Prüfung bereit', fr: 'Proposition prête à être examinée', da: 'Forslag klar til gennemgang' },
  agentWaiting: { es: 'Agente contextual · espera tu contexto', en: 'Contextual agent · waiting for your context', zh: '上下文智能体 · 等待你的背景', hi: 'संदर्भ एजेंट · आपके संदर्भ की प्रतीक्षा में', ar: 'وكيل سياقي · بانتظار سياقك', it: 'Agente contestuale · in attesa del tuo contesto', pt: 'Agente contextual · aguardando seu contexto', ru: 'Контекстный агент · ждёт вашего контекста', de: 'Kontextagent · wartet auf deinen Kontext', fr: 'Agent contextuel · attend votre contexte', da: 'Kontekstagent · venter på din kontekst' },
  consulting: { es: 'Consultando…', en: 'Consulting…', zh: '咨询中……', hi: 'परामर्श हो रहा है…', ar: 'جارٍ الاستشارة…', it: 'Consultazione…', pt: 'Consultando…', ru: 'Консультация…', de: 'Abfrage läuft …', fr: 'Consultation…', da: 'Rådfører…' },
};
const localizedModeNames: Record<Language, Record<string, string>> = {
  es: { fisico: 'Modo Físico', intelectual: 'Modo Intelectual', emocional: 'Modo Emocional', arquetipico: 'Modo Arquetípico', espiritual: 'Modo Espiritual', romantico: 'Modo Romántico', familiar: 'Modo Familiar', social: 'Modo Social', financiero: 'Modo Financiero', profesional: 'Modo Profesional', ludico: 'Modo Lúdico', visionario: 'Modo Visionario' },
  en: { fisico: 'Physical Mode', intelectual: 'Intellectual Mode', emocional: 'Emotional Mode', arquetipico: 'Archetypal Mode', espiritual: 'Spiritual Mode', romantico: 'Romantic Mode', familiar: 'Family Mode', social: 'Social Mode', financiero: 'Financial Mode', profesional: 'Professional Mode', ludico: 'Ludic Mode', visionario: 'Visionary Mode' },
  zh: { fisico: '身体模式', intelectual: '智力模式', emocional: '情绪模式', arquetipico: '原型模式', espiritual: '精神模式', romantico: '浪漫模式', familiar: '家庭模式', social: '社交模式', financiero: '财务模式', profesional: '职业模式', ludico: 'Ludic 模式', visionario: '愿景模式' },
  hi: { fisico: 'शारीरिक मोड', intelectual: 'बौद्धिक मोड', emocional: 'भावनात्मक मोड', arquetipico: 'आर्केटाइपल मोड', espiritual: 'आध्यात्मिक मोड', romantico: 'रोमांटिक मोड', familiar: 'पारिवारिक मोड', social: 'सामाजिक मोड', financiero: 'वित्तीय मोड', profesional: 'पेशेवर मोड', ludico: 'लुडिक मोड', visionario: 'दूरदर्शी मोड' },
  ar: { fisico: 'الوضع الجسدي', intelectual: 'الوضع الفكري', emocional: 'الوضع العاطفي', arquetipico: 'الوضع النموذجي', espiritual: 'الوضع الروحي', romantico: 'الوضع الرومانسي', familiar: 'الوضع العائلي', social: 'الوضع الاجتماعي', financiero: 'الوضع المالي', profesional: 'الوضع المهني', ludico: 'الوضع اللودي', visionario: 'الوضع الاستشرافي' },
  it: { fisico: 'Modalità fisica', intelectual: 'Modalità intellettuale', emocional: 'Modalità emotiva', arquetipico: 'Modalità archetipica', espiritual: 'Modalità spirituale', romantico: 'Modalità romantica', familiar: 'Modalità familiare', social: 'Modalità sociale', financiero: 'Modalità finanziaria', profesional: 'Modalità professionale', ludico: 'Modalità ludica', visionario: 'Modalità visionaria' },
  pt: { fisico: 'Modo Físico', intelectual: 'Modo Intelectual', emocional: 'Modo Emocional', arquetipico: 'Modo Arquetípico', espiritual: 'Modo Espiritual', romantico: 'Modo Romântico', familiar: 'Modo Familiar', social: 'Modo Social', financiero: 'Modo Financeiro', profesional: 'Modo Profissional', ludico: 'Modo lúdico', visionario: 'Modo Visionário' },
  ru: { fisico: 'Физический режим', intelectual: 'Интеллектуальный режим', emocional: 'Эмоциональный режим', arquetipico: 'Архетипический режим', espiritual: 'Духовный режим', romantico: 'Романтический режим', familiar: 'Семейный режим', social: 'Социальный режим', financiero: 'Финансовый режим', profesional: 'Профессиональный режим', ludico: 'Лудический режим', visionario: 'Визионерский режим' },
  de: { fisico: 'Körper-Modus', intelectual: 'Intellektueller Modus', emocional: 'Emotionaler Modus', arquetipico: 'Archetypischer Modus', espiritual: 'Spiritueller Modus', romantico: 'Romantischer Modus', familiar: 'Familienmodus', social: 'Sozialer Modus', financiero: 'Finanzmodus', profesional: 'Berufsmodus', ludico: 'Ludischer Modus', visionario: 'Visionärer Modus' },
  fr: { fisico: 'Mode physique', intelectual: 'Mode intellectuel', emocional: 'Mode émotionnel', arquetipico: 'Mode archétypal', espiritual: 'Mode spirituel', romantico: 'Mode romantique', familiar: 'Mode familial', social: 'Mode social', financiero: 'Mode financier', profesional: 'Mode professionnel', ludico: 'Mode ludique', visionario: 'Mode visionnaire' },
  da: { fisico: 'Fysisk mode', intelectual: 'Intellektuel mode', emocional: 'Følelsesmæssig mode', arquetipico: 'Arketypisk mode', espiritual: 'Spirituel mode', romantico: 'Romantisk mode', familiar: 'Familiemode', social: 'Social mode', financiero: 'Finansiel mode', profesional: 'Professionel mode', ludico: 'Ludisk mode', visionario: 'Visionær mode' },
};
const localizedLevelNames: Record<Language, string[]> = {
  es: levelNames,
  en: ['Active ignorance', 'Passive reaction', 'Confused awareness', 'Intention without habit', 'Established foundations', 'Basic maintenance', 'Defined direction', 'Consistent growth', 'Optimization and discipline', 'Mastery and influence'],
  zh: ['主动无知', '被动反应', '模糊意识', '没有习惯的意图', '基础建立', '基本维护', '方向明确', '持续成长', '优化与自律', '精通与影响力'],
  hi: ['सक्रिय अज्ञान', 'निष्क्रिय प्रतिक्रिया', 'भ्रमित जागरूकता', 'आदत के बिना इरादा', 'स्थापित आधार', 'बुनियादी रखरखाव', 'निर्धारित दिशा', 'निरंतर विकास', 'अनुकूलन और अनुशासन', 'महारत और प्रभाव'],
  ar: ['جهل نشط', 'رد فعل سلبي', 'وعي مرتبك', 'نية بلا عادة', 'أسس راسخة', 'صيانة أساسية', 'اتجاه محدد', 'نمو مستمر', 'تحسين وانضباط', 'إتقان وتأثير'],
  it: ['Ignoranza attiva', 'Reazione passiva', 'Consapevolezza confusa', 'Intenzione senza abitudine', 'Basi consolidate', 'Mantenimento di base', 'Direzione definita', 'Crescita costante', 'Ottimizzazione e disciplina', 'Padronanza e influenza'],
  pt: ['Ignorância ativa', 'Reação passiva', 'Consciência confusa', 'Intenção sem hábito', 'Bases estabelecidas', 'Manutenção básica', 'Rumo definido', 'Crescimento consistente', 'Otimização e disciplina', 'Maestria e influência'],
  ru: ['Активное неведение', 'Пассивная реакция', 'Смутное осознание', 'Намерение без привычки', 'Заложенные основы', 'Базовое поддержание', 'Определённое направление', 'Стабильный рост', 'Оптимизация и дисциплина', 'Мастерство и влияние'],
  de: ['Aktive Unwissenheit', 'Passive Reaktion', 'Verwirrtes Bewusstsein', 'Absicht ohne Gewohnheit', 'Etablierte Grundlagen', 'Grundlegende Pflege', 'Klare Richtung', 'Beständiges Wachstum', 'Optimierung und Disziplin', 'Meisterschaft und Einfluss'],
  fr: ['Ignorance active', 'Réaction passive', 'Conscience confuse', 'Intention sans habitude', 'Bases établies', 'Maintenance de base', 'Direction définie', 'Croissance constante', 'Optimisation et discipline', 'Maîtrise et influence'],
  da: ['Aktiv uvidenhed', 'Passiv reaktion', 'Forvirret bevidsthed', 'Intention uden vane', 'Etablerede grundlag', 'Grundlæggende vedligeholdelse', 'Defineret retning', 'Konsekvent vækst', 'Optimering og disciplin', 'Mesterskab og indflydelse'],
};
const localizedModeDescriptions: Partial<Record<Language, Record<string, string>>> = {
  es: Object.fromEntries(modes.map((mode) => [mode.key, mode.description])),
  en: { fisico: 'Body health and wellbeing', intelectual: 'Intellectual and cognitive development', emocional: 'Emotional balance and regulation', arquetipico: 'Character, coherence and personal essence', espiritual: 'Purpose, meaning and connection', romantico: 'Partnership and love', familiar: 'Family roots and close bonds', social: 'Friendships, support network and community', financiero: 'Money management, saving and investing', profesional: 'Career, vocation and work performance', ludico: 'Enjoyment, rest and renewed energy', visionario: 'Goals, long-term planning and legacy' },
  it: { fisico: 'Salute e benessere del corpo', intelectual: 'Sviluppo intellettuale e cognitivo', emocional: 'Gestione ed equilibrio delle emozioni', arquetipico: 'Carattere, coerenza ed essenza personale', espiritual: 'Scopo, significato e connessione', romantico: 'Relazione di coppia e amore', familiar: 'Legami familiari e radici', social: 'Amicizie, rete di sostegno e comunità', financiero: 'Gestione del denaro, risparmio e investimenti', profesional: 'Carriera, vocazione e rendimento professionale', ludico: 'Piacere, tempo libero, riposo ed energia', visionario: 'Obiettivi, pianificazione e lascito' },
  da: { fisico: 'Sundhed og kropsligt velvære', intelectual: 'Intellektuel og kognitiv udvikling', emocional: 'Håndtering og balance af følelser', arquetipico: 'Karakter, sammenhæng og personlig essens', espiritual: 'Formål, mening og forbindelse', romantico: 'Parforhold og kærlighed', familiar: 'Familiebånd og rødder', social: 'Venskaber, netværk og fællesskab', financiero: 'Penge, opsparing og investering', profesional: 'Karriere, kald og arbejdspræstation', ludico: 'Glæde, fritid, hvile og ny energi', visionario: 'Mål, langsigtet planlægning og arv' },
};
const localizedJourneyModeDescriptions: Partial<Record<Language, Record<string, string>>> = {
  es: {
    fisico: 'Cuidar tu salud física sostiene tu energía, autonomía y bienestar diario. Trabajarlo ayuda a prevenir desgaste y te da más capacidad para disfrutar y avanzar en las demás áreas.',
    intelectual: 'Cultivar tu curiosidad y pensamiento amplía lo que puedes comprender y crear. Te ayuda a aprender mejor, tomar decisiones con criterio y adaptarte a los cambios.',
    emocional: 'Reconocer y regular tus emociones mejora cómo respondes a los retos y te relacionas. Practicarlo aporta calma, resiliencia y decisiones más alineadas contigo.',
    arquetipico: 'Explorar tus valores, carácter y patrones fortalece una identidad coherente. Así puedes actuar con autenticidad, elegir mejor y sostener cambios que sí representan quién eres.',
    espiritual: 'Conectar con propósito y sentido da dirección a tus decisiones, especialmente en momentos difíciles. Cultivarlo puede aportar perspectiva, serenidad y motivación duradera.',
    romantico: 'Cuidar la intimidad y la vida de pareja construye confianza y apoyo mutuo. Trabajarlo favorece una comunicación más honesta, cercanía y vínculos más sanos.',
    familiar: 'Atender los vínculos familiares ayuda a crear pertenencia, apoyo y límites saludables. Puede mejorar la convivencia y fortalecer una red cercana para las distintas etapas de vida.',
    social: 'Construir amistades y comunidad reduce el aislamiento y multiplica las oportunidades de apoyo. Invertir en esta área fortalece la colaboración, la confianza y el sentido de pertenencia.',
    financiero: 'Comprender y ordenar tus finanzas reduce incertidumbre y amplía tus opciones. Avanzar aquí ayuda a tomar decisiones sostenibles, prepararte para imprevistos y financiar tus prioridades.',
    profesional: 'Desarrollar tu trabajo con intención puede unir habilidades, propósito y contribución. Cultivarlo abre oportunidades, fortalece tu autonomía y hace más sostenible tu crecimiento.',
    ludico: 'El juego, el descanso y el disfrute restauran energía y alimentan la creatividad. Darles espacio ayuda a prevenir el agotamiento y hace que el progreso sea más equilibrado y sostenible.',
    visionario: 'Definir una visión convierte deseos dispersos en dirección y prioridades. Trabajarla ayuda a planear a largo plazo, elegir próximos pasos y construir un legado significativo.',
  },
  en: {
    fisico: 'Caring for your physical health supports energy, independence, and everyday wellbeing. It helps prevent depletion and gives you more capacity to enjoy life and grow in other areas.',
    intelectual: 'Nurturing curiosity and clear thinking expands what you can understand and create. It helps you learn, make sound decisions, and adapt to change.',
    emocional: 'Recognizing and regulating emotions improves how you respond to challenges and connect with others. It can build calm, resilience, and decisions that feel true to you.',
    arquetipico: 'Exploring your values, character, and patterns strengthens a coherent identity. This helps you act authentically, choose wisely, and sustain changes that reflect who you are.',
    espiritual: 'Connecting with purpose gives direction to choices, especially during difficult moments. Cultivating it can bring perspective, serenity, and lasting motivation.',
    romantico: 'Caring for intimacy and partnership builds trust and mutual support. It encourages honest communication, closeness, and healthier relationships.',
    familiar: 'Attending to family relationships can create belonging, support, and healthy boundaries. It may improve daily life and strengthen a close support network.',
    social: 'Building friendships and community reduces isolation and expands support. Investing here strengthens collaboration, trust, and belonging.',
    financiero: 'Understanding and organizing your finances reduces uncertainty and expands your choices. Progress helps you plan sustainably, prepare for surprises, and fund what matters.',
    profesional: 'Developing your work with intention can connect skills, purpose, and contribution. It creates opportunity, strengthens independence, and supports sustainable growth.',
    ludico: 'Play, rest, and enjoyment restore energy and nurture creativity. Making room for them helps prevent burnout and keeps progress balanced and sustainable.',
    visionario: 'Defining a vision turns scattered wishes into direction and priorities. Working on it helps you plan ahead, choose next steps, and build a meaningful legacy.',
  },
};
const localizedLevelDescriptions: Record<Language, string[]> = {
  es: levelDescriptions,
  en: ['Active ignorance — The area is neglected or consciously paused to save energy.', 'Passive reaction — You act only when a crisis appears; the first intention has begun.', 'Confused awareness — You recognize the issue, but a plan is still blocked by uncertainty.', 'Intention without habit — You try to act, but the practice remains inconsistent.', 'Established foundations — A minimum system is followed consciously and consistently.', 'Basic maintenance — The area is stable and controlled, but not actively growing.', 'Defined direction — Clear goals and strategic resources move you beyond comfort.', 'Consistent growth — The system works, measures results and keeps improving.', 'Optimization and discipline — Systems, delegation or technology multiply your results.', 'Mastery and influence — Your results become a source of teaching and guidance for others.'],
  zh: ['主动忽视——这个领域被忽略，或被暂时搁置以保存能量。', '被动反应——只在危机出现时行动，但已经开始尝试改变。', '混乱觉察——你看见问题，却仍被不确定性挡在计划之外。', '没有习惯的意图——你想行动，但实践还不稳定。', '基础建立——你有意识且持续地执行一个最低限度的系统。', '基础维护——领域稳定可控，但还没有主动成长。', '方向明确——目标清晰，资源被有策略地投入。', '持续成长——系统有效，你会测量结果并不断调整。', '优化与纪律——系统、授权或技术正在放大你的成果。', '精通与影响——你的成果已经可以帮助和指导他人。'],
  hi: ['सक्रिय उपेक्षा — यह क्षेत्र उपेक्षित है या ऊर्जा बचाने के लिए रोक दिया गया है।', 'निष्क्रिय प्रतिक्रिया — आप संकट आने पर ही कार्य करते हैं, पर शुरुआत हो चुकी है।', 'भ्रमित जागरूकता — समस्या दिखती है, लेकिन योजना अभी अनिश्चितता से रुकी है।', 'आदत के बिना इरादा — आप प्रयास करते हैं, पर अभ्यास स्थिर नहीं है।', 'स्थापित आधार — एक न्यूनतम प्रणाली को जागरूकता और निरंतरता से निभाया जाता है।', 'बुनियादी रखरखाव — क्षेत्र स्थिर है, लेकिन सक्रिय रूप से बढ़ नहीं रहा।', 'स्पष्ट दिशा — लक्ष्य और संसाधन आपको आराम क्षेत्र से आगे ले जाते हैं।', 'निरंतर विकास — प्रणाली काम करती है और परिणामों के अनुसार सुधरती है।', 'अनुकूलन और अनुशासन — प्रणाली, प्रतिनिधि या तकनीक परिणाम बढ़ाते हैं।', 'महारत और प्रभाव — आपके परिणाम दूसरों को सिखाने और सहारा देने लगते हैं।'],
  ar: ['تجاهل نشط — المجال مهمل أو متوقف مؤقتاً للحفاظ على الطاقة.', 'استجابة سلبية — تتحرك عند ظهور الأزمة، لكن نية التغيير بدأت.', 'وعي مرتبك — ترى المشكلة، لكن عدم اليقين يمنع الخطة.', 'نية بلا عادة — تحاول التصرف، لكن الممارسة غير مستقرة.', 'أسس ثابتة — تتبع نظاماً أساسياً بوعي واستمرارية.', 'صيانة أساسية — المجال مستقر ومسيطر عليه دون نمو نشط.', 'اتجاه محدد — أهداف واضحة وموارد موزعة باستراتيجية.', 'نمو مستمر — النظام يعمل وتُقاس النتائج ويجري التحسين.', 'تحسين وانضباط — الأنظمة أو التفويض أو التقنية تضاعف النتائج.', 'إتقان وتأثير — تصبح نتائجك مصدراً للتعليم والإرشاد للآخرين.'],
  it: ['Ignoranza attiva — l’area è trascurata o messa in pausa per risparmiare energia.', 'Reazione passiva — agisci solo nella crisi, ma l’intenzione è iniziata.', 'Consapevolezza confusa — riconosci il problema, ma il piano è ancora bloccato.', 'Intenzione senza abitudine — provi ad agire, ma la pratica è incostante.', 'Basi stabilite — segui con consapevolezza un sistema minimo e costante.', 'Mantenimento di base — l’area è stabile, ma non cresce attivamente.', 'Direzione definita — obiettivi chiari e risorse assegnate con strategia.', 'Crescita costante — il sistema funziona, misura e corregge i risultati.', 'Ottimizzazione e disciplina — sistemi, delega e tecnologia moltiplicano i risultati.', 'Maestria e influenza — i tuoi risultati diventano guida e insegnamento per altri.'],
  pt: ['Ignorância ativa — a área é negligenciada ou pausada para economizar energia.', 'Reação passiva — você age apenas na crise, mas a intenção já começou.', 'Consciência confusa — reconhece o problema, mas o plano ainda está bloqueado.', 'Intenção sem hábito — tenta agir, porém a prática é inconsistente.', 'Bases estabelecidas — um sistema mínimo é seguido com consciência e constância.', 'Manutenção básica — a área está estável, mas não cresce ativamente.', 'Rumo definido — metas claras e recursos estratégicos levam além da zona de conforto.', 'Crescimento consistente — o sistema funciona, mede e ajusta resultados.', 'Otimização e disciplina — sistemas, delegação e tecnologia ampliam resultados.', 'Maestria e influência — seus resultados passam a ensinar e orientar outras pessoas.'],
  ru: ['Активное игнорирование — область заброшена или поставлена на паузу ради энергии.', 'Пассивная реакция — вы действуете только во время кризиса, но намерение уже появилось.', 'Спутанное осознание — проблема видна, но неопределённость мешает плану.', 'Намерение без привычки — вы пытаетесь действовать, но практика нестабильна.', 'Созданные основы — минимальная система выполняется осознанно и регулярно.', 'Базовое поддержание — область стабильна, но активного роста нет.', 'Определённое направление — ясные цели и стратегические ресурсы выводят за пределы комфорта.', 'Постоянный рост — система работает, результаты измеряются и улучшаются.', 'Оптимизация и дисциплина — системы, делегирование и технологии умножают результаты.', 'Мастерство и влияние — ваши результаты становятся поддержкой и примером для других.'],
  de: ['Aktive Unwissenheit — der Bereich wird vernachlässigt oder zum Energiesparen pausiert.', 'Passive Reaktion — du handelst erst in der Krise, aber die Absicht ist geweckt.', 'Verwirrtes Bewusstsein — das Problem ist sichtbar, doch Unsicherheit blockiert den Plan.', 'Absicht ohne Gewohnheit — du versuchst zu handeln, aber die Praxis bleibt unbeständig.', 'Etablierte Grundlagen — ein Mindest-System wird bewusst und konstant befolgt.', 'Grundlegende Pflege — der Bereich ist stabil, wächst aber nicht aktiv.', 'Klare Richtung — Ziele und strategische Ressourcen führen über die Komfortzone hinaus.', 'Konstantes Wachstum — das System funktioniert, misst und verbessert Ergebnisse.', 'Optimierung und Disziplin — Systeme, Delegation und Technik vervielfachen Ergebnisse.', 'Meisterschaft und Einfluss — deine Ergebnisse werden zu Orientierung für andere.'],
  fr: ['Ignorance active — le domaine est négligé ou mis en pause pour préserver votre énergie.', 'Réaction passive — vous agissez dans la crise, mais l’intention est née.', 'Conscience confuse — le problème est reconnu, mais l’incertitude bloque le plan.', 'Intention sans habitude — vous essayez d’agir, mais la pratique reste irrégulière.', 'Bases établies — un système minimum est suivi avec conscience et constance.', 'Maintenance de base — le domaine est stable sans croissance active.', 'Direction définie — des objectifs clairs et des ressources stratégiques dépassent le confort.', 'Croissance constante — le système fonctionne, mesure et ajuste les résultats.', 'Optimisation et discipline — systèmes, délégation et technologie amplifient les résultats.', 'Maîtrise et influence — vos résultats deviennent une source de transmission pour les autres.'],
  da: ['Aktiv uvidenhed — området forsømmes eller sættes på pause for at spare energi.', 'Passiv reaktion — du handler først i krisen, men intentionen er begyndt.', 'Forvirret bevidsthed — problemet ses, men usikkerhed blokerer planen.', 'Intention uden vane — du prøver at handle, men praksis er ustabil.', 'Etablerede grundlag — et minimumssystem følges bevidst og konsekvent.', 'Grundlæggende vedligehold — området er stabilt uden aktiv vækst.', 'Defineret retning — klare mål og strategiske ressourcer fører videre.', 'Konstant vækst — systemet fungerer, måler og forbedrer resultater.', 'Optimering og disciplin — systemer, delegering og teknologi forstærker resultater.', 'Mesterskab og indflydelse — dine resultater kan vejlede og lære andre noget.'],
};
const activityStageDescriptions: Record<Language, string[]> = {
  es: ['Observa sin exigirte resultados; el primer paso es notar lo que ocurre.', 'Haz un registro breve y reconoce cuándo aparece el impulso de actuar.', 'Elige una señal concreta y conviértela en una decisión pequeña.', 'Repite una acción sencilla hasta que empiece a tener un ritmo.', 'Sostén una práctica verificable y revisa qué te ayuda a mantenerla.', 'Protege lo que ya funciona con un mantenimiento ligero y constante.', 'Define una meta medible y asigna energía específica para moverla.', 'Ajusta el sistema con datos, disciplina y una revisión periódica.', 'Optimiza, delega o busca guía experta para multiplicar el impacto.', 'Integra lo aprendido y conviértelo en una referencia para otras personas.'],
  en: ['Observe without demanding results; the first step is noticing what is happening.', 'Keep a brief record and notice when the impulse to act appears.', 'Choose one concrete signal and turn it into a small decision.', 'Repeat one simple action until it begins to find a rhythm.', 'Sustain a verifiable practice and review what helps you keep it.', 'Protect what already works with light, consistent maintenance.', 'Set a measurable goal and assign specific energy to move it forward.', 'Tune the system with data, discipline and a regular review.', 'Optimize, delegate or seek expert guidance to multiply the impact.', 'Integrate what you learned and turn it into a reference for others.'],
  zh: ['先观察，不要求立刻有结果；第一步是看见正在发生什么。', '做一份简短记录，留意行动冲动何时出现。', '选择一个具体信号，把它变成一个小决定。', '重复一个简单行动，直到它形成节奏。', '坚持可验证的练习，回顾什么帮助你持续。', '用轻量而稳定的维护保护已经有效的部分。', '设定可衡量的目标，为它投入明确的精力。', '用数据、纪律和定期复盘调校系统。', '优化、授权或寻求专家指导，放大影响。', '整合所学，把它变成可以帮助他人的参考。'],
  hi: ['परिणाम का दबाव न बनाएं; पहला कदम यह देखना है कि क्या हो रहा है।', 'छोटा रिकॉर्ड रखें और देखें कि कार्य करने की इच्छा कब आती है।', 'एक ठोस संकेत चुनें और उसे छोटे निर्णय में बदलें।', 'एक सरल कार्य दोहराएं, जब तक उसमें लय न आने लगे।', 'एक मापने योग्य अभ्यास बनाए रखें और देखें कि क्या मदद करता है।', 'हल्के और निरंतर रखरखाव से जो काम कर रहा है उसकी रक्षा करें।', 'मापने योग्य लक्ष्य तय करें और उसे आगे बढ़ाने के लिए ऊर्जा दें।', 'डेटा, अनुशासन और नियमित समीक्षा से प्रणाली सुधारें।', 'प्रभाव बढ़ाने के लिए अनुकूलित करें, सौंपें या विशेषज्ञ सहायता लें।', 'सीख को एकीकृत करें और उसे दूसरों के लिए संदर्भ बनाएं।'],
  ar: ['راقب دون مطالبة نفسك بالنتيجة؛ الخطوة الأولى هي ملاحظة ما يحدث.', 'سجّل ملاحظة قصيرة وانتبه إلى وقت ظهور الرغبة في الفعل.', 'اختر إشارة ملموسة وحوّلها إلى قرار صغير.', 'كرّر فعلاً بسيطاً حتى يبدأ في اكتساب إيقاع.', 'حافظ على ممارسة قابلة للملاحظة وراجع ما يساعدك على الاستمرار.', 'احمِ ما يعمل بالفعل بصيانة خفيفة ومنتظمة.', 'حدّد هدفاً قابلاً للقياس وخصص له طاقة واضحة.', 'اضبط النظام بالبيانات والانضباط والمراجعة الدورية.', 'حسّن أو فوّض أو اطلب إرشاداً متخصصاً لمضاعفة الأثر.', 'ادمج ما تعلمته وحوّله إلى مرجع للآخرين.'],
  it: ['Osserva senza pretendere risultati: il primo passo è notare ciò che accade.', 'Tieni una breve traccia e nota quando compare l’impulso ad agire.', 'Scegli un segnale concreto e trasformalo in una piccola decisione.', 'Ripeti un’azione semplice finché non trova il suo ritmo.', 'Mantieni una pratica verificabile e rivedi cosa ti aiuta a continuare.', 'Proteggi ciò che funziona con una manutenzione leggera e costante.', 'Definisci un obiettivo misurabile e dedicagli energia specifica.', 'Regola il sistema con dati, disciplina e revisioni periodiche.', 'Ottimizza, delega o cerca una guida esperta per moltiplicare l’impatto.', 'Integra ciò che hai imparato e trasformalo in un riferimento per altri.'],
  pt: ['Observe sem exigir resultados; o primeiro passo é notar o que está acontecendo.', 'Faça um registro breve e perceba quando surge o impulso de agir.', 'Escolha um sinal concreto e transforme-o em uma pequena decisão.', 'Repita uma ação simples até que ela encontre um ritmo.', 'Mantenha uma prática verificável e reveja o que ajuda a continuar.', 'Proteja o que já funciona com uma manutenção leve e constante.', 'Defina uma meta mensurável e dedique energia específica a ela.', 'Ajuste o sistema com dados, disciplina e revisão periódica.', 'Otimize, delegue ou busque orientação especializada para ampliar o impacto.', 'Integre o que aprendeu e transforme isso em referência para outras pessoas.'],
  ru: ['Наблюдайте без требования результата: первый шаг — заметить происходящее.', 'Ведите короткую запись и замечайте, когда появляется импульс действовать.', 'Выберите конкретный сигнал и превратите его в небольшое решение.', 'Повторяйте простое действие, пока оно не обретёт ритм.', 'Поддерживайте проверяемую практику и смотрите, что помогает продолжать.', 'Сохраняйте работающее с помощью лёгкого и постоянного ухода.', 'Определите измеримую цель и направьте на неё энергию.', 'Настраивайте систему данными, дисциплиной и регулярным обзором.', 'Оптимизируйте, делегируйте или обратитесь к эксперту, чтобы усилить эффект.', 'Объедините опыт и превратите его в ориентир для других.'],
  de: ['Beobachte ohne Ergebnisdruck; der erste Schritt ist, wahrzunehmen, was passiert.', 'Führe eine kurze Notiz und erkenne, wann der Impuls zum Handeln entsteht.', 'Wähle ein konkretes Signal und mache daraus eine kleine Entscheidung.', 'Wiederhole eine einfache Handlung, bis sie einen Rhythmus bekommt.', 'Halte eine überprüfbare Praxis aufrecht und prüfe, was dich dabei unterstützt.', 'Schütze, was bereits funktioniert, durch leichte und konstante Pflege.', 'Setze ein messbares Ziel und widme ihm gezielt Energie.', 'Justiere das System mit Daten, Disziplin und regelmäßiger Rückschau.', 'Optimiere, delegiere oder suche fachliche Begleitung, um die Wirkung zu vervielfachen.', 'Integriere das Gelernte und mache es zu einer Orientierung für andere.'],
  fr: ['Observez sans exiger de résultat ; le premier pas est de voir ce qui se passe.', 'Notez brièvement et repérez le moment où l’envie d’agir apparaît.', 'Choisissez un signal concret et transformez-le en petite décision.', 'Répétez une action simple jusqu’à ce qu’elle trouve son rythme.', 'Maintenez une pratique vérifiable et observez ce qui vous aide à continuer.', 'Protégez ce qui fonctionne déjà par un entretien léger et régulier.', 'Fixez un objectif mesurable et consacrez-lui une énergie précise.', 'Ajustez le système avec des données, de la discipline et une revue régulière.', 'Optimisez, déléguez ou cherchez un accompagnement expert pour amplifier l’impact.', 'Intégrez vos apprentissages et transformez-les en repère pour les autres.'],
  da: ['Observer uden krav om resultater; det første skridt er at lægge mærke til, hvad der sker.', 'Skriv en kort note og bemærk, hvornår trangen til at handle opstår.', 'Vælg et konkret signal og gør det til en lille beslutning.', 'Gentag en enkel handling, indtil den finder en rytme.', 'Hold fast i en synlig praksis og se, hvad der hjælper dig videre.', 'Beskyt det, der virker, med let og stabil vedligeholdelse.', 'Sæt et målbart mål og giv det målrettet energi.', 'Juster systemet med data, disciplin og regelmæssig gennemgang.', 'Optimer, deleger eller søg ekspertvejledning for at øge effekten.', 'Saml det lærte og gør det til en reference for andre.'],
};
const supportedLanguages = Object.keys(languageNames) as Language[];
const languageFromLocale = (locale: string | undefined): Language | null => {
  const prefix = locale?.trim().toLowerCase().split(/[-_]/)[0];
  return prefix && supportedLanguages.includes(prefix as Language) ? prefix as Language : null;
};
const detectBrowserLanguage = (): Language => {
  if (typeof navigator === 'undefined') return 'es';
  const browserLocales = [...(navigator.languages ?? []), navigator.language];
  return browserLocales.map(languageFromLocale).find((value): value is Language => value !== null) ?? 'es';
};
const detectLanguage = (): Language => {
  if (typeof window === 'undefined') return 'es';
  const saved = window.localStorage.getItem('modoCultiva_language') as Language | null;
  const savedSource = window.localStorage.getItem('modoCultiva_language_source');
  // Only an explicit choice in the selector should override the browser locale.
  // Older releases did not store the source, so their value is treated as stale.
  if (savedSource === 'manual' && saved && supportedLanguages.includes(saved)) return saved;
  return detectBrowserLanguage();
};
const authClient = {
  async login(email: string, password: string): Promise<AuthTokens> {
    const response = await fetch(`${apiUrl}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.detail ?? 'No fue posible iniciar sesión.');
    return payload as AuthTokens;
  },
  async logout(refresh_token: string): Promise<void> { await fetch(`${apiUrl}/auth/logout`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token }) }); },
};

const legacyDeviceStateKey = 'modoCultiva_deviceStateMigrated';
const readLegacyDeviceState = (): Record<string, unknown> => {
  const readJson = (key: string, fallback: unknown) => {
    try { return JSON.parse(window.localStorage.getItem(key) ?? JSON.stringify(fallback)); }
    catch { return fallback; }
  };
  const state: Record<string, unknown> = {
    levels: { ...defaultLevels, ...readJson('modoCultiva_lastState', {}) },
    presets: readJson('modoCultiva_presets', {}),
    activityDrafts: readJson('modoCultiva_activityDrafts', {}),
    insightRequests: readJson('modoCultiva_insightRequests', {}),
    visionImages: readJson('modoCultiva_visionImages', {}),
    featuredBadges: readJson('modoCultiva_featuredBadges', []),
    selectedPreset: window.localStorage.getItem('modoCultiva_selectedPreset') ?? '',
    profileName: window.localStorage.getItem('modoCultiva_profileName') ?? '',
    profileImage: window.localStorage.getItem('modoCultiva_profileImage'),
    skin: window.localStorage.getItem('modoCultiva_skin') ?? 'holista',
    paletteFilter: 'none',
  };
  const savedPlan = window.localStorage.getItem('modoCultiva_plan');
  if (savedPlan === 'basic' || savedPlan === 'gold' || savedPlan === 'ultimate') state.activePlan = savedPlan;
  if (window.localStorage.getItem('modoCultiva_language_source') === 'manual') {
    const savedLanguage = window.localStorage.getItem('modoCultiva_language');
    if (savedLanguage && supportedLanguages.includes(savedLanguage as Language)) state.language = savedLanguage;
  }
  return state;
};
const hasLegacyDeviceConfiguration = (state: Record<string, unknown>): boolean => {
  const levels = state.levels as Record<string, number>;
  const hasProgress = Object.values(levels).some((level) => Number(level) > 0);
  const hasEntries = (key: string) => {
    const value = state[key];
    return value !== null && typeof value === 'object' && Object.keys(value).length > 0;
  };
  return hasProgress || hasEntries('presets') || hasEntries('activityDrafts')
    || hasEntries('insightRequests') || hasEntries('visionImages')
    || (Array.isArray(state.featuredBadges) && state.featuredBadges.length > 0)
    || Boolean(state.profileName) || Boolean(state.profileImage);
};

function App() {
  const [language, setLanguage] = useState<Language>(detectLanguage);
  const handleLanguageChange = (nextLanguage: Language) => {
    window.localStorage.setItem('modoCultiva_language_source', 'manual');
    setLanguage(nextLanguage);
  };
  const tr = (key: string) => extraTranslations[key]?.[language] ?? translations[language][key] ?? translations.es[key] ?? key;
  const trf = (key: string, values: Record<string, string>) => Object.entries(values).reduce((copy, [token, value]) => copy.replace(`{${token}}`, value), tr(key));
  const insightRequestKey = (modeKey: string, level: number) => `${modeKey}-${level}`;
  const modeName = (mode: Mode) => localizedModeNames[language][mode.key] ?? mode.name;
  const modeShortName = (mode: Mode) => modeName(mode).replace(/^(Modo |Mode |模式|모드 )/i, '').replace(/\s+Mode$/i, '');
  const continentLabel = (continent: string) => {
    const keys: Record<string, string> = { 'América del Norte': 'continentNorthAmerica', 'América Central': 'continentCentralAmerica', 'América del Sur': 'continentSouthAmerica', Europa: 'continentEurope', Asia: 'continentAsia', África: 'continentAfrica', Oceanía: 'continentOceania' };
    return keys[continent] ? tr(keys[continent]) : continent;
  };
  const specialistLocation = (location: string) => location.replace(/\bRemote\b|\bRemoto\b/gi, tr('remote'));
  const modeDescription = (mode: Mode) => localizedModeDescriptions[language]?.[mode.key] ?? `${modeName(mode)} · ${tr('cultivationArea')}`;
  const modeJourneyDescription = (mode: Mode) => localizedJourneyModeDescriptions[language]?.[mode.key] ?? `${modeDescription(mode)}. ${tr('journeyGrowthBenefit')}`;
  const triviaQuestion = (mode: Mode) => language === 'es' ? labCards[mode.key].question : tr('triviaQuestionPrompt');
  const triviaAnswer = (mode: Mode) => language === 'es' ? labCards[mode.key].answer : `${tr('triviaAnswerPrefix')} ${modeDescription(mode).toLowerCase()}.`;
  const levelDescription = (level: number) => localizedLevelDescriptions[language][level] ?? levelDescriptions[level];
  const levelDefinitionText = (level: number) => levelDescription(level).replace(/^.*?(?:\s+—\s+|\s+–\s+|\s+-\s+|——)/u, '');
  const activityDescription = (level: number) => {
    const tier = level <= 2 ? 'low' : level <= 5 ? 'medium' : level <= 8 ? 'high' : 'vision';
    return localizedEffortDescriptions[language]?.[tier] ?? localizedEffortDescriptions.es[tier];
  };
  const activityTitleClass = (title: string, placeholder: boolean) => {
    const length = title.trim().length;
    const size = length > 105 ? 'long' : length > 62 ? 'medium' : 'short';
    return `journey-activity-title journey-activity-title--${size}${placeholder ? ' journey-activity-title--placeholder' : ''}`;
  };
  const localizeGlobalInsight = (insight: GlobalInsight): GlobalInsight => ({
    ...insight,
    activity: (() => { const localized = localizedPoolActivities(insight.modeKey, insight.level, language); return localized[(insight.variant ?? 0) % localized.length]?.title ?? insight.activity; })(),
    bio: localizedInsightBio(insight.author),
    presetName: `${insight.author} · ${tr('presenceRoute')}`,
  });
  const localizedInsightBio = (author: string) => {
    if (language === 'es') return insightAuthorBios[author] ?? '';
    const english: Record<string, string> = {
      'Sofía Méndez': 'I cultivate purposeful leadership so work can also become a space for presence and coherence.',
      'Marcus Lee': 'I design financial systems that turn clarity, freedom and vision into everyday decisions.',
      'Elena Costa': 'I support honest conversations so relationships can grow with care and healthy boundaries.',
      'Diego Ríos': 'I believe sustained small rituals can transform an intention into a way of life.',
      'Nadia Chen': 'I explore how learning, connection and creation can open new possibilities for a wider life.',
      'Camila Torres': 'I cultivate community and movement so each person can find their own path of expansion.',
    };
    const fallback: Record<Language, string> = {
      en: 'A community member sharing a practice that supported their progress.', zh: '分享支持其成长实践的社区成员。', hi: 'अपनी प्रगति में सहायक अभ्यास साझा करने वाला समुदाय सदस्य।', ar: 'عضو في المجتمع يشارك ممارسة ساعدته على التقدم.', it: 'Una persona della comunità condivide una pratica che ha sostenuto il suo percorso.', pt: 'Uma pessoa da comunidade compartilha uma prática que apoiou seu avanço.', ru: 'Участник сообщества делится практикой, которая помогла ему двигаться дальше.', de: 'Ein Community-Mitglied teilt eine Praxis, die den eigenen Fortschritt unterstützt hat.', fr: 'Un membre de la communauté partage une pratique qui a soutenu son parcours.', da: 'Et fællesskabsmedlem deler en praksis, der støttede deres fremgang.', es: '',
    };
    return language === 'en' ? (english[author] ?? fallback.en) : fallback[language];
  };
  const badgeTitle = (key: string) => tr(({ 'first-step': 'badgeTitleFirstStep', 'three-moves': 'badgeTitleThreeMoves', 'level-up': 'badgeTitleLevelUp', 'full-spectrum': 'badgeTitleFullSpectrum', 'global-eye': 'badgeTitleGlobalEye', visionary: 'badgeTitleVisionary', 'preset-maker': 'badgeTitlePresetMaker', 'skin-shift': 'badgeTitleSkinShift' } as Record<string, string>)[key] ?? key);
  const badgeDescription = (key: string) => tr(({ 'first-step': 'badgeDescFirstStep', 'three-moves': 'badgeDescThreeMoves', 'level-up': 'badgeDescLevelUp', 'full-spectrum': 'badgeDescFullSpectrum', 'global-eye': 'badgeDescGlobalEye', visionary: 'badgeDescVisionary', 'preset-maker': 'badgeDescPresetMaker', 'skin-shift': 'badgeDescSkinShift' } as Record<string, string>)[key] ?? key);
  const effortLabel = (level: number) => {
    if (language === 'es') return effortLabelByLevel[level];
    const tier = level <= 2 ? 'low' : level <= 5 ? 'medium' : level <= 8 ? 'high' : 'vision';
    const labels: Record<Language, Record<string, string>> = {
      es: { low: 'EXIGENCIA BAJA (Tiempo)', medium: 'EXIGENCIA MEDIA (Tiempo + Energía)', high: 'EXIGENCIA ALTA (Tiempo + Energía + Dinero)', vision: 'VISIÓN FINAL' },
      en: { low: 'LOW EFFORT (Time)', medium: 'MEDIUM EFFORT (Time + Energy)', high: 'HIGH EFFORT (Time + Energy + Money)', vision: 'FINAL VISION' },
      zh: { low: '低要求（时间）', medium: '中等要求（时间 + 精力）', high: '高要求（时间 + 精力 + 金钱）', vision: '最终愿景' },
      hi: { low: 'कम प्रयास (समय)', medium: 'मध्यम प्रयास (समय + ऊर्जा)', high: 'उच्च प्रयास (समय + ऊर्जा + धन)', vision: 'अंतिम दृष्टि' },
      ar: { low: 'جهد منخفض (وقت)', medium: 'جهد متوسط (وقت + طاقة)', high: 'جهد عالٍ (وقت + طاقة + مال)', vision: 'الرؤية النهائية' },
      it: { low: 'IMPEGNO BASSO (Tempo)', medium: 'IMPEGNO MEDIO (Tempo + Energia)', high: 'IMPEGNO ALTO (Tempo + Energia + Denaro)', vision: 'VISIONE FINALE' },
      pt: { low: 'EXIGÊNCIA BAIXA (Tempo)', medium: 'EXIGÊNCIA MÉDIA (Tempo + Energia)', high: 'EXIGÊNCIA ALTA (Tempo + Energia + Dinheiro)', vision: 'VISÃO FINAL' },
      ru: { low: 'НИЗКАЯ НАГРУЗКА (Время)', medium: 'СРЕДНЯЯ НАГРУЗКА (Время + Энергия)', high: 'ВЫСОКАЯ НАГРУЗКА (Время + Энергия + Деньги)', vision: 'ФИНАЛЬНОЕ ВИДЕНИЕ' },
      de: { low: 'GERINGER AUFWAND (Zeit)', medium: 'MITTLERER AUFWAND (Zeit + Energie)', high: 'HOHER AUFWAND (Zeit + Energie + Geld)', vision: 'ENDVISION' },
      fr: { low: 'FAIBLE EFFORT (Temps)', medium: 'EFFORT MOYEN (Temps + Énergie)', high: 'EFFORT ÉLEVÉ (Temps + Énergie + Argent)', vision: 'VISION FINALE' },
      da: { low: 'LAV INDSATS (Tid)', medium: 'MIDDEL INDSATS (Tid + Energi)', high: 'HØJ INDSATS (Tid + Energi + Penge)', vision: 'ENDELIG VISION' },
    };
    return labels[language][tier];
  };
  const poolActivities = (modeKey: string, level: number) => localizedPoolActivities(modeKey, level, language);
  const [profileName, setProfileName] = useState(() => {
    try {
      const saved = window.localStorage.getItem('modoCultiva_profileName');
      return saved === defaultUserProfile.name ? '' : (saved ?? '');
    } catch {
      return '';
    }
  });
  const [levels, setLevels] = useState<Record<string, number>>(() => {
    try {
      const saved = window.localStorage.getItem('modoCultiva_lastState');
      return saved ? { ...defaultLevels, ...JSON.parse(saved) } : defaultLevels;
    } catch {
      return defaultLevels;
    }
  });
  const [selectedMode, setSelectedMode] = useState<Mode | null>(null);
  const [journeySlide, setJourneySlide] = useState(0);
  const [journeyReturnView, setJourneyReturnView] = useState<'welcome' | 'dashboard'>('welcome');
  const [cultOpen, setCultOpen] = useState(false);
  const [activeActivity, setActiveActivity] = useState<number | null>(null);
  const [activityEntry, setActivityEntry] = useState<ActivityEntry>('custom');
  const [poolSelection, setPoolSelection] = useState(0);
  const [activityPrompt, setActivityPrompt] = useState('');
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  const [aiHasConsulted, setAiHasConsulted] = useState(false);
  const [aiProposal, setAiProposal] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [activityDrafts, setActivityDrafts] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(window.localStorage.getItem('modoCultiva_activityDrafts') ?? '{}');
    } catch {
      return {};
    }
  });
  const [insightRequests, setInsightRequests] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(window.localStorage.getItem('modoCultiva_insightRequests') ?? '{}');
    } catch {
      return {};
    }
  });
  const [insightNotice, setInsightNotice] = useState<string | null>(null);
  const [apiState, setApiState] = useState<ApiState>({ status: 'loading' });
  const [view, setView] = useState<View>('welcome');
  const [authTokens, setAuthTokens] = useState<AuthTokens | null>(() => {
    try {
      const saved = window.sessionStorage.getItem('gm-auth-tokens');
      return saved ? JSON.parse(saved) as AuthTokens : null;
    } catch {
      return null;
    }
  });
  const isAuthenticated = Boolean(authTokens?.access_token);
  const isOwnerAccount = authTokens?.identity.email?.trim().toLowerCase() === ownerEmail;
  const displayedProfileName = isOwnerAccount
    ? (profileName.trim() || defaultUserProfile.name)
    : (profileName.trim() === defaultUserProfile.name ? '' : profileName);
  const displayedProfileRole = isOwnerAccount ? defaultUserProfile.role : '';
  const [stateHydrated, setStateHydrated] = useState(false);
  const [stateSyncStatus, setStateSyncStatus] = useState<'syncing' | 'synced' | 'error'>('syncing');
  const [authError, setAuthError] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [activePlan, setActivePlan] = useState<PlanKey>(() => {
    try {
      const saved = window.localStorage.getItem('modoCultiva_plan') as PlanKey | null;
      return saved === 'basic' || saved === 'gold' || saved === 'ultimate' ? saved : 'ultimate';
    } catch {
      return 'ultimate';
    }
  });
  const [pendingAccess, setPendingAccess] = useState<AccessRequest | null>(null);
  const [pendingActivity, setPendingActivity] = useState<PendingActivity | null>(null);
  const [insightPreview, setInsightPreview] = useState<{ modeKey: string; level: number } | null>(null);
  const [cultInsightPreview, setCultInsightPreview] = useState<(typeof globalInsightActivities)[number] | null>(null);
  const [specialistPreview, setSpecialistPreview] = useState<Specialist | null>(null);
  const [profilePreviewMode, setProfilePreviewMode] = useState<boolean>(false);
  const [configurationsOpen, setConfigurationsOpen] = useState(false);
  const configurationsDialogRef = useRef<HTMLDialogElement | null>(null);
  const configurationsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanKey | null>(null);
  const [cultTab, setCultTab] = useState<CultTab>('insights');
  const [insightSlide, setInsightSlide] = useState(0);
  const [insightCycle, setInsightCycle] = useState(0);
  const [insightVariants, setInsightVariants] = useState<Record<string, number>>({});
  const [specialistModeFilter, setSpecialistModeFilter] = useState('all');
  const [specialistLanguageFilter, setSpecialistLanguageFilter] = useState('all');
  const [specialistContinentFilter, setSpecialistContinentFilter] = useState('all');
  const [labFlippedCard, setLabFlippedCard] = useState<string | null>(null);
  const [featuredBadges, setFeaturedBadges] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem('modoCultiva_featuredBadges') ?? '[]');
      return Array.isArray(saved) ? saved.slice(0, 3) : [];
    } catch {
      return [];
    }
  });
  const [skin, setSkin] = useState<Skin>(() => {
    try {
      const savedSkin = window.localStorage.getItem('modoCultiva_skin');
      if (savedSkin !== 'holista') window.localStorage.setItem('modoCultiva_skin', 'holista');
      return 'holista';
    } catch {
      return 'holista';
    }
  });
  const [paletteFilter, setPaletteFilter] = useState<PaletteFilter>(() => {
    try {
      window.localStorage.removeItem('modoCultiva_palette_filter');
      return 'none';
    } catch {
      return 'none';
    }
  });
  useEffect(() => {
    if (skin !== 'holista' || paletteFilter === 'none') return;
    setPaletteFilter('none');
    try {
      window.localStorage.removeItem('modoCultiva_palette_filter');
    } catch {
      // Holista remains on its original palette for the current session.
    }
  }, [paletteFilter, skin]);
  const loginSkinChoice = useRef<Skin | null>(null);
  const [djFocusedMode, setDjFocusedMode] = useState(modes[0].key);
  const [profileImage, setProfileImage] = useState<string | null>(() => {
    try {
      return window.localStorage.getItem('modoCultiva_profileImage');
    } catch {
      return null;
    }
  });
  const [customizingAvatar, setCustomizingAvatar] = useState(false);
  const [visionImages, setVisionImages] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(window.localStorage.getItem('modoCultiva_visionImages') ?? '{}');
    } catch {
      return {};
    }
  });
  const [presets, setPresets] = useState<Record<string, Preset>>(() => {
    try {
      return JSON.parse(window.localStorage.getItem('modoCultiva_presets') ?? '{}');
    } catch {
      return {};
    }
  });
  const [presetName, setPresetName] = useState('');
  const [selectedPreset, setSelectedPreset] = useState(() => window.localStorage.getItem('modoCultiva_selectedPreset') ?? '');
  const [presetNotice, setPresetNotice] = useState<string | null>(null);
  const [renamingPreset, setRenamingPreset] = useState(false);
  const [presetRenameName, setPresetRenameName] = useState('');
  const presetRenameInputRef = useRef<HTMLInputElement | null>(null);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginName, setLoginName] = useState('');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const journeyPanelRef = useRef<HTMLElement | null>(null);
  const journeyReturnScrollTop = useRef(0);
  const cultEmbeddedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    window.history.scrollRestoration = 'manual';
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [view]);

  useEffect(() => {
    window.localStorage.setItem('modoCultiva_language', language);
    if (window.localStorage.getItem('modoCultiva_language_source') !== 'manual') {
      window.localStorage.setItem('modoCultiva_language_source', 'auto');
    }
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  // The product content is intentionally kept in one component for this prototype.
  // Translate the remaining editorial labels after each language change so that
  // cards, dashboards, modals and the three Cult sections change together.
  useEffect(() => {
    const phraseBook: Record<string, Record<Language, string>> = {
      'Cultiva todos tus modos.': { es: 'Cultiva todos tus modos.', en: 'Cultivate every mode of your life.', zh: '培育你生命中的每一种模式。', hi: 'अपने जीवन के हर मोड को विकसित करें।', ar: 'ازرع كل أوضاع حياتك.', it: 'Coltiva ogni modalità della tua vita.', pt: 'Cultive todos os seus modos.', ru: 'Развивайте каждый режим своей жизни.', de: 'Kultiviere jeden Modus deines Lebens.', fr: 'Cultivez chaque mode de votre vie.', da: 'Dyrk alle dine livsmodi.' },
      'Tu centro de cultivo.': { es: 'Tu centro de cultivo.', en: 'Your cultivation center.', zh: '你的培育中心。', hi: 'आपका विकास केंद्र।', ar: 'مركز تنميتك.', it: 'Il tuo centro di crescita.', pt: 'Seu centro de cultivo.', ru: 'Ваш центр развития.', de: 'Dein Entwicklungszentrum.', fr: 'Votre centre de développement.', da: 'Dit udviklingscenter.' },
      'Tu progreso en una mirada': { es: 'Tu progreso en una mirada', en: 'Your progress at a glance', zh: '一眼看见你的进展', hi: 'एक नज़र में आपकी प्रगति', ar: 'تقدمك في لمحة', it: 'I tuoi progressi a colpo d’occhio', pt: 'Seu progresso em um olhar', ru: 'Ваш прогресс одним взглядом', de: 'Dein Fortschritt auf einen Blick', fr: 'Votre progression en un coup d’œil', da: 'Dit fremskridt på et øjeblik' },
      'Nivel Cultiva': { es: 'Nivel Cultiva', en: 'Cultiva Level', zh: 'Cultiva 等级', hi: 'Cultiva स्तर', ar: 'مستوى Cultiva', it: 'Livello Cultiva', pt: 'Nível Cultiva', ru: 'Уровень Cultiva', de: 'Cultiva-Stufe', fr: 'Niveau Cultiva', da: 'Cultiva-niveau' },
      'RESUMEN EJECUTIVO': { es: 'RESUMEN EJECUTIVO', en: 'EXECUTIVE SUMMARY', zh: '执行摘要', hi: 'कार्यकारी सारांश', ar: 'ملخص تنفيذي', it: 'SINTESI ESECUTIVA', pt: 'RESUMO EXECUTIVO', ru: 'КРАТКИЙ ОБЗОР', de: 'EXECUTIVE SUMMARY', fr: 'SYNTHÈSE', da: 'LEDelsesRESUMÉ' },
      'MODO MÁS FUERTE': { es: 'MODO MÁS FUERTE', en: 'STRONGEST MODE', zh: '最强模式', hi: 'सबसे मजबूत मोड', ar: 'أقوى وضع', it: 'MODALITÀ PIÙ FORTE', pt: 'MODO MAIS FORTE', ru: 'САМЫЙ СИЛЬНЫЙ РЕЖИМ', de: 'STÄRKSTER MODUS', fr: 'MODE LE PLUS FORT', da: 'STÆRKESTE MODE' },
      'MODO MENOS CULTIVADO': { es: 'MODO MENOS CULTIVADO', en: 'LEAST CULTIVATED MODE', zh: '最需要培养的模式', hi: 'सबसे कम विकसित मोड', ar: 'أقل وضع تنمية', it: 'MODALITÀ MENO COLTIVATA', pt: 'MODO MENOS CULTIVADO', ru: 'НАИМЕНЕЕ РАЗВИТЫЙ РЕЖИМ', de: 'AM WENIGSTEN ENTWICKELTER MODUS', fr: 'MODE LE MOINS CULTIVÉ', da: 'MINDST DYRKEDE MODE' },
      'ACTIVIDADES DEFINIDAS': { es: 'ACTIVIDADES DEFINIDAS', en: 'DEFINED ACTIVITIES', zh: '已定义活动', hi: 'निर्धारित गतिविधियां', ar: 'الأنشطة المحددة', it: 'ATTIVITÀ DEFINITE', pt: 'ATIVIDADES DEFINIDAS', ru: 'ЗАДАННЫЕ АКТИВНОСТИ', de: 'DEFINIERTE AKTIVITÄTEN', fr: 'ACTIVITÉS DÉFINIES', da: 'DEFINEREDE AKTIVITETER' },
      'PRESETS ACTIVOS': { es: 'CONFIGURACIONES DE VIDA ACTIVAS', en: 'ACTIVE LIFE PRESETS', zh: '启用的生活模式组合', hi: 'सक्रिय जीवन-मोड संयोजन', ar: 'توليفات أنماط الحياة النشطة', it: 'COMBINAZIONI DEI MODI DI VITA ATTIVE', pt: 'CONFIGURAÇÕES DE VIDA ATIVAS', ru: 'АКТИВНЫЕ СОЧЕТАНИЯ ЖИЗНЕННЫХ СФЕР', de: 'AKTIVE KOMBINATIONEN DER LEBENSBEREICHE', fr: 'COMBINAISONS ACTIVES DES MODES DE VIE', da: 'AKTIVE KOMBINATIONER AF LIVSOMRÅDER' },
      'DISTRIBUCIÓN DE PRESENCIA': { es: 'DISTRIBUCIÓN DE PRESENCIA', en: 'PRESENCE DISTRIBUTION', zh: '存在感分布', hi: 'उपस्थिति का वितरण', ar: 'توزيع الحضور', it: 'DISTRIBUZIONE DELLA PRESENZA', pt: 'DISTRIBUIÇÃO DE PRESENÇA', ru: 'РАСПРЕДЕЛЕНИЕ ПРИСУТСТВИЯ', de: 'VERTEILUNG DER PRÄSENZ', fr: 'RÉPARTITION DE LA PRÉSENCE', da: 'FORDELING AF TILSTEDEVÆRELSE' },
      'Áreas para cultivar': { es: 'Áreas para cultivar', en: 'Areas to cultivate', zh: '需要培育的领域', hi: 'विकसित करने के क्षेत्र', ar: 'مجالات للتنمية', it: 'Aree da coltivare', pt: 'Áreas para cultivar', ru: 'Области для развития', de: 'Bereiche zur Entwicklung', fr: 'Domaines à cultiver', da: 'Områder at dyrke' },
      'PRÓXIMOS FOCOS': { es: 'PRÓXIMOS FOCOS', en: 'NEXT FOCUSES', zh: '下一个重点', hi: 'अगले फोकस', ar: 'التركيزات القادمة', it: 'PROSSIMI FOCUS', pt: 'PRÓXIMOS FOCOS', ru: 'СЛЕДУЮЩИЕ ФОКУСЫ', de: 'NÄCHSTE FOKUS-BEREICHE', fr: 'PROCHAINS FOCUS', da: 'NÆSTE FOKUSOMRÅDER' },
      'Siguiente movimiento': { es: 'Siguiente movimiento', en: 'Next move', zh: '下一步行动', hi: 'अगला कदम', ar: 'الخطوة التالية', it: 'Prossima mossa', pt: 'Próximo movimento', ru: 'Следующий шаг', de: 'Nächster Schritt', fr: 'Prochaine étape', da: 'Næste skridt' },
      'Continúa tu cultivo': { es: 'Continúa tu cultivo', en: 'Continue your cultivation', zh: '继续你的培育之旅', hi: 'अपना विकास जारी रखें', ar: 'واصل تنميتك', it: 'Continua la tua crescita', pt: 'Continue seu cultivo', ru: 'Продолжайте развитие', de: 'Setze deine Entwicklung fort', fr: 'Poursuivez votre développement', da: 'Fortsæt din udvikling' },
      'Configuraciones guardadas': { es: 'Configuraciones guardadas', en: 'Saved configurations', zh: '已保存的配置', hi: 'सहेजे गए कॉन्फ़िगरेशन', ar: 'الإعدادات المحفوظة', it: 'Configurazioni salvate', pt: 'Configurações salvas', ru: 'Сохранённые настройки', de: 'Gespeicherte Konfigurationen', fr: 'Configurations enregistrées', da: 'Gemte konfigurationer' },
      'Tu ruta de cultivo': { es: 'Tu ruta de cultivo', en: 'Your cultivation path', zh: '你的培育路径', hi: 'आपका विकास मार्ग', ar: 'مسار تنميتك', it: 'Il tuo percorso di crescita', pt: 'Sua rota de cultivo', ru: 'Ваш путь развития', de: 'Dein Entwicklungsweg', fr: 'Votre parcours de développement', da: 'Din udviklingsrejse' },
      'Diseño de Actividad': { es: 'Diseño de Actividad', en: 'Activity Design', zh: '活动设计', hi: 'गतिविधि डिजाइन', ar: 'تصميم النشاط', it: 'Progettazione dell’attività', pt: 'Design da atividade', ru: 'Дизайн активности', de: 'Aktivitätsdesign', fr: 'Conception de l’activité', da: 'Aktivitetsdesign' },
      'Pool de Actividades': { es: 'Banco de actividades', en: 'Activity bank', zh: '活动库', hi: 'गतिविधि बैंक', ar: 'بنك الأنشطة', it: 'Raccolta di attività', pt: 'Banco de atividades', ru: 'Банк занятий', de: 'Aktivitätensammlung', fr: 'Banque d’activités', da: 'Aktivitetsbank' },
      'Construyamos tu actividad': { es: 'Construyamos tu actividad', en: 'Let’s build your activity', zh: '一起设计你的活动', hi: 'अपनी गतिविधि बनाएं', ar: 'لنصمم نشاطك', it: 'Costruiamo la tua attività', pt: 'Vamos criar sua atividade', ru: 'Создадим вашу активность', de: 'Entwickeln wir deine Aktivität', fr: 'Construisons votre activité', da: 'Lad os bygge din aktivitet' },
      'Pedir Insights': { es: 'Ideas locales', en: 'Local ideas', zh: '本地创意', hi: 'स्थानीय विचार', ar: 'أفكار محلية', it: 'Idee locali', pt: 'Ideias locais', ru: 'Локальные идеи', de: 'Lokale Ideen', fr: 'Idées locales', da: 'Lokale idéer' },
      'Insights Globales': { es: 'Ideas globales', en: 'Global ideas', zh: '全球创意', hi: 'वैश्विक विचार', ar: 'أفكار عالمية', it: 'Idee globali', pt: 'Ideias globais', ru: 'Глобальные идеи', de: 'Globale Ideen', fr: 'Idées globales', da: 'Globale idéer' },
      'Insights Globales.': { es: 'Ideas globales.', en: 'Global ideas.', zh: '全球创意。', hi: 'वैश्विक विचार।', ar: 'أفكار عالمية.', it: 'Idee globali.', pt: 'Ideias globais.', ru: 'Глобальные идеи.', de: 'Globale Ideen.', fr: 'Idées globales.', da: 'Globale idéer.' },
      'Red de Especialistas': { es: 'Red de Especialistas', en: 'Specialists Network', zh: '专家网络', hi: 'विशेषज्ञ नेटवर्क', ar: 'شبكة المتخصصين', it: 'Rete di specialisti', pt: 'Rede de especialistas', ru: 'Сеть специалистов', de: 'Expertennetzwerk', fr: 'Réseau de spécialistes', da: 'Specialistnetværk' },
      'Galería de Skins & Filtros': { es: 'Galería de Skins & Filtros', en: 'Skins & Filters Gallery', zh: '皮肤与滤镜库', hi: 'स्किन और फ़िल्टर गैलरी', ar: 'معرض الواجهات والفلاتر', it: 'Galleria di skin e filtri', pt: 'Galeria de skins e filtros', ru: 'Галерея скинов и фильтров', de: 'Skins- und Filtergalerie', fr: 'Galerie des skins et filtres', da: 'Galleri med skins og filtre' },
      'Presets guardados': { es: 'Configuraciones de Vida Guardadas', en: 'Saved Life Presets', zh: '已保存的生活模式组合', hi: 'सहेजे गए जीवन-मोड संयोजन', ar: 'توليفات أنماط الحياة المحفوظة', it: 'Combinazioni salvate dei modi di vita', pt: 'Configurações de Vida Guardadas', ru: 'Сохранённые сочетания жизненных сфер', de: 'Gespeicherte Kombinationen der Lebensbereiche', fr: 'Combinaisons enregistrées des modes de vie', da: 'Gemte kombinationer af livsområder' },
      'Nuevo preset': { es: 'Nueva Configuración de Vida', en: 'New Life Preset', zh: '新的生活模式组合', hi: 'नया जीवन-मोड संयोजन', ar: 'توليفة أنماط حياة جديدة', it: 'Nuova combinazione dei modi di vita', pt: 'Nova Configuração de Vida', ru: 'Новое сочетание жизненных сфер', de: 'Neue Kombination der Lebensbereiche', fr: 'Nouvelle combinaison des modes de vie', da: 'Ny kombination af livsområder' },
      '— Selecciona un preset —': { es: '— Selecciona una Configuración de Vida —', en: '— Select a Life Preset —', zh: '— 选择生活模式组合 —', hi: '— जीवन-मोड संयोजन चुनें —', ar: '— اختر توليفة أنماط الحياة —', it: '— Seleziona una combinazione dei modi di vita —', pt: '— Selecione uma Configuração de Vida —', ru: '— Выберите сочетание жизненных сфер —', de: '— Wähle eine Kombination der Lebensbereiche —', fr: '— Choisissez une combinaison des modes de vie —', da: '— Vælg en kombination af livsområder —' },
      'Guardar': { es: 'Guardar', en: 'Save', zh: '保存', hi: 'सहेजें', ar: 'حفظ', it: 'Salva', pt: 'Salvar', ru: 'Сохранить', de: 'Speichern', fr: 'Enregistrer', da: 'Gem' },
      'Cargar': { es: 'Cargar', en: 'Load', zh: '加载', hi: 'लोड करें', ar: 'تحميل', it: 'Carica', pt: 'Carregar', ru: 'Загрузить', de: 'Laden', fr: 'Charger', da: 'Indlæs' },
      'Eliminar': { es: 'Eliminar', en: 'Delete', zh: '删除', hi: 'हटाएं', ar: 'حذف', it: 'Elimina', pt: 'Excluir', ru: 'Удалить', de: 'Löschen', fr: 'Supprimer', da: 'Slet' },
      'Ajusta tu nivel de presencia': { es: 'Ajusta tu nivel de presencia', en: 'Adjust your presence level', zh: '调整你的存在感等级', hi: 'अपना उपस्थिति स्तर समायोजित करें', ar: 'اضبط مستوى حضورك', it: 'Regola il tuo livello di presenza', pt: 'Ajuste seu nível de presença', ru: 'Настройте уровень присутствия', de: 'Passe dein Präsenzlevel an', fr: 'Ajustez votre niveau de présence', da: 'Juster dit tilstedeværelsesniveau' },
      'Actividad por definir': { es: 'Actividad por definir', en: 'Activity to define', zh: '待定义活动', hi: 'गतिविधि परिभाषित करें', ar: 'نشاط بحاجة إلى تعريف', it: 'Attività da definire', pt: 'Atividade a definir', ru: 'Активность нужно определить', de: 'Aktivität festlegen', fr: 'Activité à définir', da: 'Aktivitet skal defineres' },
      'Actividad guardada en este navegador.': { es: 'Actividad guardada en este navegador.', en: 'Activity saved in this browser.', zh: '活动已保存在此浏览器中。', hi: 'गतिविधि इस ब्राउज़र में सहेजी गई है।', ar: 'تم حفظ النشاط في هذا المتصفح.', it: 'Attività salvata in questo browser.', pt: 'Atividade salva neste navegador.', ru: 'Активность сохранена в этом браузере.', de: 'Aktivität in diesem Browser gespeichert.', fr: 'Activité enregistrée dans ce navigateur.', da: 'Aktivitet gemt i denne browser.' },
      'Modificar Actividad': { es: 'Modificar Actividad', en: 'Modify activity', zh: '修改活动', hi: 'गतिविधि संशोधित करें', ar: 'تعديل النشاط', it: 'Modifica attività', pt: 'Modificar atividade', ru: 'Изменить активность', de: 'Aktivität ändern', fr: 'Modifier l’activité', da: 'Redigér aktivitet' },
      'Agregar Actividad': { es: 'Agregar Actividad', en: 'Add activity', zh: '添加活动', hi: 'गतिविधि जोड़ें', ar: 'إضافة نشاط', it: 'Aggiungi attività', pt: 'Adicionar atividade', ru: 'Добавить активность', de: 'Aktivität hinzufügen', fr: 'Ajouter une activité', da: 'Tilføj aktivitet' },
      'Navegar recomendaciones': { es: 'Navegar recomendaciones', en: 'Browse recommendations', zh: '浏览推荐', hi: 'सुझाव ब्राउज़ करें', ar: 'تصفح التوصيات', it: 'Sfoglia le raccomandazioni', pt: 'Navegar pelas recomendações', ru: 'Просмотреть рекомендации', de: 'Empfehlungen durchsuchen', fr: 'Parcourir les recommandations', da: 'Gennemse anbefalinger' },
      'Usar esta actividad': { es: 'Usar esta actividad', en: 'Use this activity', zh: '使用此活动', hi: 'इस गतिविधि का उपयोग करें', ar: 'استخدم هذا النشاط', it: 'Usa questa attività', pt: 'Usar esta atividade', ru: 'Использовать активность', de: 'Diese Aktivität nutzen', fr: 'Utiliser cette activité', da: 'Brug denne aktivitet' },
      'Todos los modos': { es: 'Todos los modos', en: 'All modes', zh: '所有模式', hi: 'सभी मोड', ar: 'كل الأوضاع', it: 'Tutte le modalità', pt: 'Todos os modos', ru: 'Все режимы', de: 'Alle Modi', fr: 'Tous les modes', da: 'Alle modes' },
      'Cualquier idioma': { es: 'Cualquier idioma', en: 'Any language', zh: '任何语言', hi: 'कोई भी भाषा', ar: 'أي لغة', it: 'Qualsiasi lingua', pt: 'Qualquer idioma', ru: 'Любой язык', de: 'Jede Sprache', fr: 'Toutes les langues', da: 'Ethvert sprog' },
      'Cualquier continente': { es: 'Cualquier continente', en: 'Any continent', zh: '任何洲', hi: 'कोई भी महाद्वीप', ar: 'أي قارة', it: 'Qualsiasi continente', pt: 'Qualquer continente', ru: 'Любой континент', de: 'Jeder Kontinent', fr: 'Tous les continents', da: 'Ethvert kontinent' },
      'No hay especialistas con estos filtros. Prueba otra combinación.': { es: 'No hay especialistas con estos filtros. Prueba otra combinación.', en: 'No specialists match these filters. Try another combination.', zh: '没有符合这些筛选条件的专家。请尝试其他组合。', hi: 'इन फ़िल्टर से कोई विशेषज्ञ नहीं मिला। दूसरा संयोजन आज़माएं।', ar: 'لا يوجد متخصصون بهذه الفلاتر. جرّب تركيبة أخرى.', it: 'Nessuno specialista corrisponde a questi filtri. Prova un’altra combinazione.', pt: 'Nenhum especialista corresponde a estes filtros. Tente outra combinação.', ru: 'По этим фильтрам специалистов нет. Попробуйте другую комбинацию.', de: 'Keine Spezialisten passen zu diesen Filtern. Versuche eine andere Kombination.', fr: 'Aucun spécialiste ne correspond à ces filtres. Essayez une autre combinaison.', da: 'Ingen specialister matcher disse filtre. Prøv en anden kombination.' },
      'Disponible para orientación privada': { es: 'Disponible para orientación privada', en: 'Available for private guidance', zh: '可提供私人指导', hi: 'निजी मार्गदर्शन के लिए उपलब्ध', ar: 'متاح للتوجيه الخاص', it: 'Disponibile per orientamento privato', pt: 'Disponível para orientação privada', ru: 'Доступен для частного сопровождения', de: 'Für private Begleitung verfügbar', fr: 'Disponible pour un accompagnement privé', da: 'Tilgængelig for privat vejledning' },
      'PERFILES VERIFICADOS': { es: 'PERFILES VERIFICADOS', en: 'VERIFIED PROFILES', zh: '已验证资料', hi: 'सत्यापित प्रोफ़ाइल', ar: 'ملفات موثقة', it: 'PROFILI VERIFICATI', pt: 'PERFIS VERIFICADOS', ru: 'ПРОВЕРЕННЫЕ ПРОФИЛИ', de: 'VERIFIZIERTE PROFILE', fr: 'PROFILS VÉRIFIÉS', da: 'VERIFICEREDE PROFILER' },
      'Volver a Journey del Modo': { es: 'Volver a Journey del Modo', en: 'Back to mode journey', zh: '返回模式旅程', hi: 'मोड यात्रा पर लौटें', ar: 'العودة إلى رحلة الوضع', it: 'Torna al percorso della modalità', pt: 'Voltar à jornada do modo', ru: 'Вернуться к пути режима', de: 'Zurück zur Modus-Journey', fr: 'Retour au parcours du mode', da: 'Tilbage til mode-rejsen' },
      'Una vista completa para recordar las áreas que te hacen ser tú. Observa tu equilibrio, elige dónde poner presencia y entra a tu dashboard cuando quieras profundizar.': { es: 'Una vista completa para recordar las áreas que te hacen ser tú. Observa tu equilibrio, elige dónde poner presencia y entra a tu dashboard cuando quieras profundizar.', en: 'A complete view of the areas that make you who you are. Observe your balance, choose where to place presence, and enter your dashboard whenever you want to go deeper.', zh: '完整查看构成你的生活领域。观察你的平衡，选择投入关注的地方，并随时进入仪表盘深入探索。', hi: 'उन क्षेत्रों का पूरा दृश्य जो आपको आप बनाते हैं। अपना संतुलन देखें, तय करें कि ध्यान कहाँ देना है और गहराई से जानने के लिए डैशबोर्ड खोलें।', ar: 'رؤية كاملة للمجالات التي تجعلك ما أنت عليه. راقب توازنك واختر أين تضع حضورك وادخل إلى لوحة التحكم عندما تريد التعمق.', it: 'Una visione completa delle aree che ti rendono te stesso. Osserva il tuo equilibrio, scegli dove portare presenza ed entra nella dashboard quando vuoi approfondire.', pt: 'Uma visão completa das áreas que fazem você ser quem é. Observe seu equilíbrio, escolha onde colocar presença e entre no painel quando quiser aprofundar.', ru: 'Полный обзор областей, которые делают вас собой. Наблюдайте за балансом, выбирайте, куда направить внимание, и открывайте панель для углубления.', de: 'Ein vollständiger Blick auf die Bereiche, die dich ausmachen. Beobachte dein Gleichgewicht, wähle deinen Fokus und öffne das Dashboard, wann immer du tiefer gehen möchtest.', fr: 'Une vue complète des domaines qui vous définissent. Observez votre équilibre, choisissez où placer votre présence et ouvrez votre tableau de bord pour aller plus loin.', da: 'Et komplet overblik over de områder, der gør dig til dig. Se din balance, vælg hvor du vil være nærværende, og åbn dashboardet, når du vil gå i dybden.' },
      'Claridad mental y definición de rumbo': { es: 'Claridad mental y definición de rumbo', en: 'Mental clarity and direction', zh: '思路清晰与方向感', hi: 'मानसिक स्पष्टता और दिशा', ar: 'وضوح ذهني وتحديد الاتجاه', it: 'Chiarezza mentale e direzione', pt: 'Clareza mental e definição de rumo', ru: 'Ясность ума и направление', de: 'Mentale Klarheit und Richtung', fr: 'Clarté mentale et direction', da: 'Mental klarhed og retning' },
      'Movimiento y práctica sin inversión': { es: 'Movimiento y práctica sin inversión', en: 'Movement and practice without investment', zh: '行动与无需投入的练习', hi: 'निवेश के बिना अभ्यास और行动', ar: 'الحركة والممارسة دون استثمار', it: 'Movimento e pratica senza investimento', pt: 'Movimento e prática sem investimento', ru: 'Движение и практика без вложений', de: 'Bewegung und Übung ohne Investition', fr: 'Mouvement et pratique sans investissement', da: 'Bevægelse og øvelse uden investering' },
      'Inversión y asignación estratégica de recursos': { es: 'Inversión y asignación estratégica de recursos', en: 'Investment and strategic resource allocation', zh: '投资与战略资源分配', hi: 'निवेश और रणनीतिक संसाधन आवंटन', ar: 'الاستثمار والتخصيص الاستراتيجي للموارد', it: 'Investimento e allocazione strategica delle risorse', pt: 'Investimento e alocação estratégica de recursos', ru: 'Инвестиции и стратегическое распределение ресурсов', de: 'Investition und strategische Ressourcenverteilung', fr: 'Investissement et allocation stratégique des ressources', da: 'Investering og strategisk ressourcefordeling' },
      'Define el resultado que quieres alcanzar': { es: 'Define el resultado que quieres alcanzar', en: 'Define the result you want to reach', zh: '定义你想实现的结果', hi: 'वह परिणाम तय करें जिसे आप पाना चाहते हैं', ar: 'حدد النتيجة التي تريد الوصول إليها', it: 'Definisci il risultato che vuoi raggiungere', pt: 'Defina o resultado que deseja alcançar', ru: 'Определите результат, которого хотите достичь', de: 'Definiere das Ergebnis, das du erreichen möchtest', fr: 'Définissez le résultat que vous souhaitez atteindre', da: 'Definér det resultat, du vil nå' },
      'Explora recomendaciones del nivel': { es: 'Explora recomendaciones del nivel', en: 'Explore recommendations for level', zh: '探索该等级的推荐', hi: 'इस स्तर की सिफारिशें देखें', ar: 'استكشف توصيات المستوى', it: 'Esplora le raccomandazioni del livello', pt: 'Explore recomendações do nível', ru: 'Изучите рекомендации уровня', de: 'Entdecke Empfehlungen für Stufe', fr: 'Explorez les recommandations du niveau', da: 'Udforsk anbefalinger for niveau' },
      'Cada sugerencia respeta el esfuerzo de esta etapa.': { es: 'Cada sugerencia respeta el esfuerzo de esta etapa.', en: 'Each suggestion respects the effort required at this stage.', zh: '每条建议都符合这一阶段的投入要求。', hi: 'हर सुझाव इस चरण के प्रयास का सम्मान करता है।', ar: 'كل اقتراح يراعي الجهد المطلوب في هذه المرحلة.', it: 'Ogni suggerimento rispetta l’impegno di questa fase.', pt: 'Cada sugestão respeita o esforço desta etapa.', ru: 'Каждая рекомендация соответствует усилиям этого этапа.', de: 'Jeder Vorschlag berücksichtigt den Aufwand dieser Phase.', fr: 'Chaque suggestion respecte l’effort de cette étape.', da: 'Hvert forslag respekterer indsatsen på dette trin.' },
      'Comparte tu contexto y consulta al Modo IA para recibir una propuesta personalizada.': { es: 'Comparte tu contexto y consulta al Modo IA para recibir una propuesta personalizada.', en: 'Share your context and ask Mode AI for a personalized suggestion.', zh: '分享你的背景并咨询模式 AI，获取个性化建议。', hi: 'अपना संदर्भ साझा करें और व्यक्तिगत सुझाव के लिए मोड AI से पूछें।', ar: 'شارك سياقك واستشر وضع الذكاء الاصطناعي للحصول على اقتراح مخصص.', it: 'Condividi il tuo contesto e consulta Modo IA per ricevere una proposta personalizzata.', pt: 'Compartilhe seu contexto e consulte o Modo IA para receber uma proposta personalizada.', ru: 'Расскажите о своём контексте и спросите Mode AI о персональном предложении.', de: 'Teile deinen Kontext und frage Mode AI nach einem persönlichen Vorschlag.', fr: 'Partagez votre contexte et consultez le Mode IA pour une proposition personnalisée.', da: 'Del din kontekst og spørg Mode AI efter et personligt forslag.' },
      'Tu contexto para la IA': { es: 'Tu contexto para la IA', en: 'Your context for AI', zh: '你的 AI 背景', hi: 'AI के लिए आपका संदर्भ', ar: 'سياقك للذكاء الاصطناعي', it: 'Il tuo contesto per l’IA', pt: 'Seu contexto para a IA', ru: 'Ваш контекст для ИИ', de: 'Dein Kontext für die KI', fr: 'Votre contexte pour l’IA', da: 'Din kontekst til AI' },
      'Consultar al Modo IA': { es: 'Consultar al Modo IA', en: 'Ask Mode AI', zh: '咨询模式 AI', hi: 'मोड AI से पूछें', ar: 'استشر وضع الذكاء الاصطناعي', it: 'Consulta Modo IA', pt: 'Consultar o Modo IA', ru: 'Спросить у Mode AI', de: 'Mode AI fragen', fr: 'Consulter le Mode IA', da: 'Spørg Mode AI' },
    };
    const replacements = new Map<string, string>();
    Object.entries(phraseBook).forEach(([source, values]) => replacements.set(source, values[language] ?? source));
    modes.forEach((mode) => {
      replacements.set(mode.name, localizedModeNames[language][mode.key] ?? mode.name);
      replacements.set(mode.shortName, (localizedModeNames[language][mode.key] ?? mode.name).replace(/^(Modo |Mode |模式|모드 )/i, '').replace(/\s+Mode$/i, ''));
      replacements.set(mode.description, localizedModeDescriptions[language]?.[mode.key] ?? mode.description);
    });
    levelNames.forEach((name, index) => replacements.set(name, localizedLevelNames[language][index] ?? name));
    replacements.set('NIVEL', language === 'es' ? 'NIVEL' : tr('level').toUpperCase());
    replacements.set('NIVELES', language === 'es' ? 'NIVELES' : tr('levels').toUpperCase());
    replacements.set('MODO IA', language === 'es' ? 'MODO IA' : 'MODE AI');
    replacements.set('Agregar actividad', tr('activity'));
    replacements.set('Pool de actividades', tr('activityPool'));
    replacements.set('Voltear tarjeta', language === 'es' ? 'Voltear tarjeta' : 'Flip card');
    replacements.set('Volver a la pregunta', language === 'es' ? 'Volver a la pregunta' : 'Back to the question');
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
    nodes.forEach((node) => {
      const parent = node.parentElement;
      if (!parent || ['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT'].includes(parent.tagName)) return;
      let next = node.nodeValue ?? '';
      replacements.forEach((value, source) => {
        if (source && next.includes(source)) next = next.split(source).join(value);
      });
      if (next !== node.nodeValue) node.nodeValue = next;
    });
  }, [language, tr]);

  const restoreJourneyPosition = () => {
    window.requestAnimationFrame(() => {
      journeyPanelRef.current?.scrollTo({ top: journeyReturnScrollTop.current, behavior: 'auto' });
    });
  };

  const completeLogin = (tokens: AuthTokens, destination: View, nextActivity: PendingActivity | null) => {
    window.sessionStorage.setItem('gm-auth-tokens', JSON.stringify(tokens));
    setAuthTokens(tokens);
    setAuthError(null);
    setPendingAccess(null);
    setPendingActivity(null);
    if (nextActivity) {
      setActivityEntry(nextActivity.entry);
      setActiveActivity(nextActivity.level);
      setPoolSelection(0);
      setActivityPrompt('');
    }
    setView(destination);
  };

  const logout = async () => {
    try {
      if (authTokens?.refresh_token) await authClient.logout(authTokens.refresh_token);
    } catch {
      // The local session is still cleared if the server is temporarily unavailable.
    }
    window.sessionStorage.removeItem('gm-auth-tokens');
    setAuthTokens(null);
    setStateHydrated(false);
    setSelectedMode(null);
    setCultOpen(false);
    setActiveActivity(null);
    setPendingAccess(null);
    loginSkinChoice.current = null;
    setView('welcome');
  };

  const submitAuthentication = async () => {
    setAuthError(null);
    try {
      const tokens = registering
        ? await (async () => {
            const response = await fetch(`${apiUrl}/auth/register`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: loginUsername.trim(), name: loginName.trim(), password: loginPassword }),
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.detail ?? 'No fue posible crear la cuenta.');
            return payload as AuthTokens;
          })()
        : await authClient.login(loginUsername.trim(), loginPassword);
      completeLogin(tokens, pendingAccess?.returnView ?? 'welcome', pendingActivity);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'No fue posible autenticar la cuenta.');
    }
  };

  useEffect(() => {
    try {
      window.localStorage.setItem('modoCultiva_lastState', JSON.stringify(levels));
    } catch {
      // Local persistence is optional for the prototype.
    }
  }, [levels]);

  useEffect(() => {
    if (!authTokens?.access_token) {
      setStateHydrated(false);
      return;
    }
    const accessToken = authTokens.access_token;
    const controller = new AbortController();
    async function hydrateUserState() {
      try {
        setStateSyncStatus('syncing');
        const response = await fetch(`${apiUrl}/state`, {
          signal: controller.signal,
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!response.ok) throw new Error('No fue posible cargar tu mapa personal.');
        const payload = await response.json() as { state?: Record<string, unknown> };
        let state = payload.state ?? {};
        if (window.localStorage.getItem(legacyDeviceStateKey) !== 'true') {
          const localState = readLegacyDeviceState();
          if (hasLegacyDeviceConfiguration(localState)) {
            const migrationResponse = await fetch(`${apiUrl}/state/merge`, {
              method: 'POST',
              signal: controller.signal,
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
              body: JSON.stringify({ state: localState }),
            });
            if (!migrationResponse.ok) throw new Error('No fue posible sincronizar la configuración de este dispositivo. Tus datos locales siguen guardados.');
            const syncedResponse = await fetch(`${apiUrl}/state`, {
              signal: controller.signal,
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (!syncedResponse.ok) throw new Error('No fue posible confirmar la sincronización de tu mapa. Tus datos locales siguen guardados.');
            state = ((await syncedResponse.json()) as { state?: Record<string, unknown> }).state ?? {};
          }
          window.localStorage.setItem(legacyDeviceStateKey, 'true');
        }
        setProfileName(typeof state.profileName === 'string' ? state.profileName : '');
        setProfileImage(typeof state.profileImage === 'string' ? state.profileImage : null);
        setLevels({ ...defaultLevels, ...(state.levels && typeof state.levels === 'object' ? state.levels as Record<string, number> : {}) });
        setActivityDrafts(state.activityDrafts && typeof state.activityDrafts === 'object' ? state.activityDrafts as Record<string, string> : {});
        setInsightRequests(state.insightRequests && typeof state.insightRequests === 'object' ? state.insightRequests as Record<string, boolean> : {});
        setPresets(state.presets && typeof state.presets === 'object' ? state.presets as Record<string, Preset> : {});
        setVisionImages(state.visionImages && typeof state.visionImages === 'object' ? state.visionImages as Record<string, string> : {});
        setFeaturedBadges(Array.isArray(state.featuredBadges) ? state.featuredBadges as string[] : []);
        const remotePreset = typeof state.selectedPreset === 'string' && state.presets && typeof state.presets === 'object' && state.selectedPreset in state.presets
          ? state.selectedPreset : '';
        setSelectedPreset(remotePreset);
        window.localStorage.setItem('modoCultiva_selectedPreset', remotePreset);
        setLanguage(typeof state.language === 'string' && supportedLanguages.includes(state.language as Language) ? state.language as Language : detectBrowserLanguage());
        const remoteSkin = typeof state.skin === 'string' && allSkinKeys.has(state.skin as Skin) ? state.skin as Skin : null;
        if (loginSkinChoice.current) {
          setSkin('holista');
          window.localStorage.setItem('modoCultiva_skin', 'holista');
        } else setSkin(remoteSkin ?? 'holista');
        setPaletteFilter('none');
        setActivePlan(state.activePlan === 'basic' || state.activePlan === 'gold' || state.activePlan === 'ultimate' ? state.activePlan : 'ultimate');
        setStateHydrated(true);
        setStateSyncStatus('synced');
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          setStateSyncStatus('error');
          setAuthError(error instanceof Error ? error.message : 'No fue posible cargar tu mapa.');
        }
      }
    }
    void hydrateUserState();
    return () => controller.abort();
  }, [authTokens?.access_token]);

  useEffect(() => {
    if (authTokens && !isOwnerAccount && profileName.trim() === defaultUserProfile.name) setProfileName('');
  }, [authTokens, isOwnerAccount, profileName]);

  useEffect(() => {
    if (!authTokens?.access_token || !stateHydrated) return;
    const persistState = () => {
      setStateSyncStatus('syncing');
      void fetch(`${apiUrl}/state`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authTokens.access_token}` },
        keepalive: true,
        body: JSON.stringify({ state: { profileName, profileImage, levels, activityDrafts, insightRequests, presets, visionImages, skin, paletteFilter, activePlan, featuredBadges, selectedPreset, language } }),
      }).then((response) => setStateSyncStatus(response.ok ? 'synced' : 'error')).catch(() => setStateSyncStatus('error'));
    };
    window.addEventListener('pagehide', persistState);
    window.addEventListener('online', persistState);
    const timer = window.setTimeout(() => {
      persistState();
    }, 350);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pagehide', persistState);
      window.removeEventListener('online', persistState);
    };
  }, [activePlan, activityDrafts, authTokens?.access_token, featuredBadges, insightRequests, language, levels, paletteFilter, presets, profileImage, profileName, selectedPreset, skin, stateHydrated, visionImages]);

  useEffect(() => {
    const controller = new AbortController();
    async function loadHealth() {
      try {
        const response = await fetch(`${apiUrl}/health`, { signal: controller.signal });
        if (!response.ok) throw new Error(`API returned ${response.status}`);
        setApiState({ status: 'success', data: (await response.json()) as HealthResponse });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setApiState({ status: 'error', message: error instanceof Error ? error.message : 'Unable to reach the API' });
      }
    }
    loadHealth();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!profileMenuOpen) return;
    const closeProfileMenuOnOutsidePress = (event: PointerEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) setProfileMenuOpen(false);
    };
    document.addEventListener('pointerdown', closeProfileMenuOnOutsidePress);
    return () => document.removeEventListener('pointerdown', closeProfileMenuOnOutsidePress);
  }, [profileMenuOpen]);

  useEffect(() => {
    if (!configurationsOpen) { setRenamingPreset(false); return; }
    const dialog = configurationsDialogRef.current;
    if (!dialog) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    dialog.focus({ preventScroll: true });
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      configurationsTriggerRef.current?.focus({ preventScroll: true });
    };
  }, [configurationsOpen, language]);

  const navigationSnapshot = { view, selectedMode, activeActivity, activityEntry, journeySlide, journeyReturnView, cultOpen, cultTab, profileMenuOpen, configurationsOpen, renamingPreset, customizingAvatar, profilePreviewMode, selectedPlan, insightPreview, cultInsightPreview, specialistPreview };
  const navigationSnapshotKey = JSON.stringify(navigationSnapshot);
  const navigationSnapshotRef = useRef(navigationSnapshot);
  navigationSnapshotRef.current = navigationSnapshot;
  const restoreNavigationRef = useRef((snapshot: typeof navigationSnapshot) => {});
  restoreNavigationRef.current = (snapshot) => {
    setView(snapshot.view); setSelectedMode(snapshot.selectedMode); setActiveActivity(snapshot.activeActivity);
    setActivityEntry(snapshot.activityEntry); setJourneySlide(snapshot.journeySlide); setJourneyReturnView(snapshot.journeyReturnView);
    setCultOpen(snapshot.cultOpen); setCultTab(snapshot.cultTab); setProfileMenuOpen(snapshot.profileMenuOpen);
    setConfigurationsOpen(snapshot.configurationsOpen); setRenamingPreset(snapshot.renamingPreset);
    setCustomizingAvatar(snapshot.customizingAvatar); setProfilePreviewMode(snapshot.profilePreviewMode);
    setSelectedPlan(snapshot.selectedPlan); setInsightPreview(snapshot.insightPreview);
    setCultInsightPreview(snapshot.cultInsightPreview); setSpecialistPreview(snapshot.specialistPreview);
    if (snapshot.selectedMode && snapshot.activeActivity === null) restoreJourneyPosition();
  };
  const navigationHistoryRef = useRef<ReturnType<typeof createNavigationHistory<typeof navigationSnapshot>> | null>(null);
  useEffect(() => {
    const navigation = createNavigationHistory(window.history, navigationSnapshotRef.current, (snapshot) => {
      const base = snapshot.view === 'welcome' ? 0 : snapshot.view === 'lab' ? 2 : 1;
      return base + Number(Boolean(snapshot.selectedMode)) + Number(snapshot.activeActivity !== null)
        + Number(snapshot.profileMenuOpen) + Number(snapshot.configurationsOpen) + Number(snapshot.configurationsOpen && snapshot.renamingPreset)
        + Number(snapshot.customizingAvatar) + Number(snapshot.profilePreviewMode) + Number(Boolean(snapshot.selectedPlan))
        + Number(Boolean(snapshot.insightPreview)) + Number(Boolean(snapshot.cultInsightPreview)) + Number(Boolean(snapshot.specialistPreview));
    }, (snapshot) => restoreNavigationRef.current(snapshot), (left, right) => {
      // Ignore details belonging to hidden layers when matching an old parent.
      const location = (snapshot: typeof navigationSnapshot) => [
        snapshot.view, snapshot.selectedMode?.key, snapshot.activeActivity,
        snapshot.selectedMode || snapshot.view === 'cult' ? [snapshot.cultOpen, snapshot.cultTab] : null,
        snapshot.profileMenuOpen, snapshot.configurationsOpen, snapshot.configurationsOpen && snapshot.renamingPreset,
        snapshot.customizingAvatar, snapshot.profilePreviewMode, snapshot.selectedPlan,
        snapshot.insightPreview, snapshot.cultInsightPreview, snapshot.specialistPreview,
      ];
      return JSON.stringify(location(left)) === JSON.stringify(location(right));
    });
    navigationHistoryRef.current = navigation;
    const handlePopState = (event: PopStateEvent) => navigation.onPopState(event.state);
    window.addEventListener('popstate', handlePopState);
    return () => { window.removeEventListener('popstate', handlePopState); navigationHistoryRef.current = null; };
  }, []);
  useEffect(() => { navigationHistoryRef.current?.sync(navigationSnapshotRef.current); }, [navigationSnapshotKey]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      navigationHistoryRef.current?.back();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const average = useMemo(() => {
    const values = Object.values(levels);
    return (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1);
  }, [levels]);
  const focusedDjMode = modes.find((mode) => mode.key === djFocusedMode) ?? modes[0];
  const isInterfaceSkin = Boolean(skinInfo(skin));

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
  const earnedBadges = useMemo(() => {
    const definedCount = Object.keys(activityDrafts).length;
    const activeModes = modes.filter((mode) => (levels[mode.key] ?? 0) > 0).length;
    const highestLevel = Math.max(...modes.map((mode) => levels[mode.key] ?? 0));
    return cultBadgeCatalog.filter((badge) => {
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
  }, [activityDrafts, insightRequests, levels, presets, skin, visionImages]);
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
    setFeaturedBadges((current) => {
      const next = current.includes(badgeKey)
        ? current.filter((key) => key !== badgeKey)
        : current.length < 3 ? [...current, badgeKey] : current;
      try {
        window.localStorage.setItem('modoCultiva_featuredBadges', JSON.stringify(next));
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
      window.localStorage.setItem('modoCultiva_skin', nextSkin);
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
        window.localStorage.setItem('modoCultiva_profileImage', image);
      } catch {
        // The profile image remains available for the current session.
      }
    };
    reader.readAsDataURL(file);
  };

  const handleProfileName = (name: string) => {
    setProfileName(name);
    try {
      window.localStorage.setItem('modoCultiva_profileName', name);
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
    journeyReturnScrollTop.current = journeyPanelRef.current?.scrollTop ?? 0;
    setActiveActivity(level);
    setActivityEntry(entry);
    setPoolSelection(0);
    setActivityPrompt('');
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
    saveActivity(selectedMode.key, activeActivity, activity.title);
  };

  const consultModeAi = async () => {
    if (!RELEASE_FREE_ACCESS && !isAuthenticated) {
      openPlan('gold', 'Modo IA');
      return;
    }
    if (!activityPrompt.trim()) {
      setAiNotice('Escribe primero tu contexto o pregunta para que el Modo IA prepare una propuesta.');
      setAiHasConsulted(false);
      return;
    }
    if (!selectedMode || activeActivity === null) return;
    setAiLoading(true);
    setAiNotice(null);
    try {
      const response = await fetch(`${apiUrl}${isAuthenticated ? '/ai/mode' : '/ai/mode/public'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(authTokens?.access_token ? { Authorization: `Bearer ${authTokens.access_token}` } : {}) },
        body: JSON.stringify({
          mode_name: modeName(selectedMode),
          level: activeActivity,
          level_name: localizedLevelNames[language][activeActivity],
          level_description: levelDescription(activeActivity),
          effort: effortLabel(activeActivity),
          context: activityPrompt.trim(),
          user_name: profileName,
        }),
      });
      const data = await response.json() as ModeAIResponse | { detail?: string };
      if (!response.ok || !('proposal' in data)) throw new Error('detail' in data && data.detail ? data.detail : 'Modo IA no pudo responder.');
      setAiProposal(data.proposal);
      setAiHasConsulted(true);
      setAiNotice('Modo IA ha preparado una propuesta personalizada para este nivel.');
    } catch (error) {
      setAiHasConsulted(false);
      setAiProposal('');
      setAiNotice(error instanceof Error ? error.message : 'No fue posible consultar al Modo IA.');
    } finally {
      setAiLoading(false);
    }
  };

  const saveModeAiActivity = () => {
    if (!selectedMode || activeActivity === null) return;
    if (!RELEASE_FREE_ACCESS && !isAuthenticated) {
      openPlan('gold', 'Modo IA');
      return;
    }
    if (!aiHasConsulted) {
      setAiNotice('Consulta primero al Modo IA para generar una propuesta antes de usarla.');
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
    const key = insightRequestKey(modeKey, level);
    if (insightRequests[key]) {
      const next = { ...insightRequests };
      delete next[key];
      setInsightRequests(next);
      setInsightNotice(tr('localIdeaCancelled'));
      try {
        window.localStorage.setItem('modoCultiva_insightRequests', JSON.stringify(next));
      } catch {
        // The cancellation remains available for the current session.
      }
      return;
    }
    if (!RELEASE_FREE_ACCESS && !isAuthenticated) {
      setInsightPreview({ modeKey, level });
      return;
    }
    const next = { ...insightRequests, [key]: true };
    setInsightRequests(next);
    setInsightNotice(`Solicitud enviada a usuarios de nivel ${level + 1}.`);
    try {
      window.localStorage.setItem('modoCultiva_insightRequests', JSON.stringify(next));
    } catch {
      // The request remains available for the current session.
    }
  };

  const saveActivity = (modeKey: string, level: number, activity: string) => {
    const key = `${modeKey}-${level}`;
    const next = { ...activityDrafts, [key]: activity };
    setActivityDrafts(next);
    try {
      window.localStorage.setItem('modoCultiva_activityDrafts', JSON.stringify(next));
    } catch {
      // The activity remains available for the current session.
    }
    setActiveActivity(null);
    restoreJourneyPosition();
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
    window.localStorage.setItem('modoCultiva_selectedPreset', name);
    setPresetName('');
    setPresetNotice(trf('presetSaved', { name }));
    try {
      window.localStorage.setItem('modoCultiva_presets', JSON.stringify(next));
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
      persistRenamedConfiguration(window.localStorage, result.configurations, result.selectedName);
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
    window.localStorage.removeItem('modoCultiva_selectedPreset');
    setPresetNotice(tr('presetDeleted'));
    try {
      window.localStorage.setItem('modoCultiva_presets', JSON.stringify(next));
    } catch {
      // The preset list remains available for the current session.
    }
  };

  const handleVisionImage = (modeKey: string, file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      const next = { ...visionImages, [modeKey]: reader.result };
      setVisionImages(next);
      try {
        window.localStorage.setItem('modoCultiva_visionImages', JSON.stringify(next));
      } catch {
        // The image remains available for the current session.
      }
    };
    reader.readAsDataURL(file);
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
    const journeyXp = Object.keys(activityDrafts).length * 100 + Object.values(levels).reduce((sum, level) => sum + level * 25, 0);
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
      {cultTab === 'insights' && <><div className="cult-section-heading"><div><p className="kicker">{tr('globalActivitiesEyebrow')}</p><h4>{tr('globalInsights')}</h4></div></div><p className="cult-section-copy">{tr('globalRecommendationsCopy')}</p>{insightNotice && <div className="insight-notice" role="status">✦ {insightNotice}<button type="button" onClick={() => setInsightNotice(null)} aria-label={tr('close')}>×</button></div>}{promotedInsight && <article className="cult-insight-spotlight" style={{ '--insight-color': promotedMode.color } as CSSProperties}><div className="cult-insight-spotlight-art">
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
      {cultTab === 'network' && <><div className="cult-section-heading"><div><p className="kicker">{tr('specialistNetwork')}</p><h4>{tr('findYourNextGuide')}</h4></div><span className="cult-live-pill cult-live-pill--gold"><i /> {tr('verifiedProfiles')}</span></div><div className="cult-filter-row"><select aria-label={tr('filterByMode')} value={specialistModeFilter} onChange={(event) => setSpecialistModeFilter(event.target.value)}><option value="all">{tr('allModes')}</option>{modes.map((mode) => <option key={mode.key} value={mode.key}>{modeName(mode)}</option>)}</select><select aria-label={tr('filterByLanguage')} value={specialistLanguageFilter} onChange={(event) => setSpecialistLanguageFilter(event.target.value)}><option value="all">{tr('anyLanguage')}</option>{specialistLanguages.map((language) => <option key={language} value={language}>{language}</option>)}</select><select aria-label={tr('filterByLocation')} value={specialistContinentFilter} onChange={(event) => setSpecialistContinentFilter(event.target.value)}><option value="all">{tr('anyContinent')}</option>{specialistContinents.map((continent) => <option key={continent} value={continent}>{continentLabel(continent)}</option>)}</select></div><div className="cult-specialist-list">{filteredSpecialists.length ? filteredSpecialists.map((specialist) => { const mode = modes.find((item) => item.key === specialist.modeKey)!; return <article key={specialist.name}><div className="cult-specialist-avatar">{specialist.name.slice(0, 1)}</div><div className="cult-specialist-copy"><strong>{specialist.name} <span>✓</span></strong><small>{modeName(mode)} · {specialist.specialty}</small><p>{tr('availableForGuidance')} · {specialistLocation(specialist.location)}</p></div><div className="cult-match"><span>{specialist.match} {tr('matchLabel')}</span><small>{specialist.language} · {continentLabel(specialist.continent)}</small></div><button type="button" onClick={() => setSpecialistPreview(specialist)}>{tr('viewSpecialistProfile')} ↗</button></article>; }) : <div className="cult-empty-state">{tr('noSpecialistsMatch')}</div>}</div></>}
            {cultTab === 'skins' && <><div className="cult-section-heading"><div><p className="kicker">Identidad en movimiento</p><h4>Cambia la paleta de tu cultivo.</h4></div><span className="cult-live-pill"><i /> EXPERIENCIAS</span></div><section className="cult-skin-category" aria-labelledby="cult-filters-title"><div className="cult-skin-category-heading"><div><p className="kicker">Paletas de atmósfera</p><h5 id="cult-filters-title">Filtros</h5></div><span>2 EXPERIENCIAS</span></div><div className="cult-skin-grid cult-skin-grid--filters"><article className={`cult-skin-card${paletteFilter === 'nocturna' ? ' cult-skin-card--active' : ''}`}><div className="cult-skin-visual cult-skin-visual--nocturna"><span className="skin-card-glyph skin-card-glyph--owl" aria-hidden="true">🦉</span></div><div><strong>Night Owl</strong><p>{tr('nightOwlDescription')}</p><button type="button" onClick={() => activatePaletteFilter('nocturna')}>{paletteFilter === 'nocturna' ? tr('activeNow') : tr('activateFilter')}</button></div></article><article className={`cult-skin-card cult-skin-card--lucid${paletteFilter === 'lucid' ? ' cult-skin-card--active' : ''}`}><div className="cult-skin-visual cult-skin-visual--lucid"><span className="skin-card-glyph skin-card-glyph--dream" aria-hidden="true">◌</span></div><div><strong>Lucid</strong><p>{tr('lucidDescription')}</p><button type="button" onClick={() => activatePaletteFilter('lucid')}>{paletteFilter === 'lucid' ? tr('activeNow') : tr('activateFilter')}</button></div></article></div></section><section className="cult-skin-category" aria-labelledby="cult-skins-title"><div className="cult-skin-category-heading"><div><p className="kicker">Interfaces completas</p><h5 id="cult-skins-title">Skins</h5></div><span>{skinCatalog.length + 2} EXPERIENCIAS</span></div><div className="cult-skin-grid cult-skin-grid--skins"><article className={`cult-skin-card${skin === 'holista' ? ' cult-skin-card--active' : ''}`}><div className="cult-skin-visual cult-skin-visual--holista"><span>◌</span></div><div><strong>Holista</strong><p>La raíz original de Modo Cultiva.</p><button type="button" onClick={() => activateCultSkin('holista')}>{skin === 'holista' ? 'Activa ahora ✓' : 'Activar skin ↗'}</button></div></article><article className={`cult-skin-card${skin === 'dj' ? ' cult-skin-card--active' : ''}`}><div className="cult-skin-visual cult-skin-visual--dj"><span className="skin-card-glyph skin-card-glyph--faders" aria-hidden="true"><i /><i /><i /></span></div><div><strong>Consola DJ</strong><p>La mezcla perfecta para ecualizar la canción de tu vida.</p><button type="button" onClick={() => activateCultSkin('dj')}>{skin === 'dj' ? 'Activa ahora ✓' : 'Activar skin ↗'}</button></div></article>{skinCatalog.map((item) => <article className={`cult-skin-card cult-skin-card--${item.key}${skin === item.key ? ' cult-skin-card--active' : ''}`} key={item.key}><div className={`cult-skin-visual cult-skin-visual--${item.key}`}><span>{item.icon}</span></div><div><strong>{item.name}</strong><p>{item.description}</p><button type="button" onClick={() => activateCultSkin(item.key)}>{skin === item.key ? 'Activa ahora ✓' : 'Activar skin ↗'}</button></div></article>)}</div></section></>}
      {cultTab === 'badges' && <><div className="cult-section-heading"><div><p className="kicker">{tr('badgesEyebrow')}</p><h4>{tr('badges')}</h4></div><span className="cult-live-pill"><i /> {featuredBadges.length}/3 {tr('featuredCountLabel')}</span></div><p className="cult-section-copy">{tr('badgesDescription')}</p><div className="badge-progress-grid"><article><span>{tr('xpCultiva')}</span><strong>{journeyXp.toLocaleString(language)}</strong><small>{tr('xpProgressHint')}</small></article><article><span>{tr('unlockedAchievements')}</span><strong>{earnedBadges.length}<small> / {cultBadgeCatalog.length}</small></strong><small>{tr('unlockedHint')}</small></article></div><div className="badge-featured-strip"><div><span className="cult-status-label">{tr('profileSection')}</span><strong>{featuredBadges.length ? tr('featuredAchievements') : tr('noFeaturedAchievements')}</strong></div><div className="badge-mini-row">{featuredBadges.length ? featuredBadges.map((key) => { const badge = cultBadgeCatalog.find((item) => item.key === key)!; return <span className="badge-mini" key={key} title={badgeTitle(key)}>{badge.icon}</span>; }) : <span className="badge-empty">{tr('noFeaturedAchievements')}</span>}</div></div><div className="badge-profile-actions"><button type="button" onClick={() => setProfilePreviewMode(true)}>{tr('viewMyProfile')} <span>↗</span></button></div><div className="cult-badge-grid">{cultBadgeCatalog.map((badge) => { const earned = earnedBadges.some((item) => item.key === badge.key); const featured = featuredBadges.includes(badge.key); return <article className={`cult-badge-card${earned ? ' cult-badge-card--earned' : ' cult-badge-card--locked'}${featured ? ' cult-badge-card--featured' : ''}`} key={badge.key}><div className="cult-badge-medal">{earned ? badge.icon : '·'}</div><div><strong>{badgeTitle(badge.key)}</strong><p>{badgeDescription(badge.key)}</p></div><button type="button" disabled={!earned} onClick={() => toggleFeaturedBadge(badge.key)}>{earned ? featured ? tr('featuredBadge') : featuredBadges.length >= 3 ? tr('chooseOtherBadge') : tr('highlightBadge') : tr('badgeLocked')}</button></article>; })}</div></>}
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
          <div className="profile-menu" ref={profileMenuRef}><button className="profile-button" type="button" aria-label={tr('openProfileMenu')} aria-expanded={profileMenuOpen} aria-haspopup="menu" aria-controls="profile-menu-dropdown" onClick={() => setProfileMenuOpen((open) => !open)}>MC</button>{profileMenuOpen && <div className="profile-menu-dropdown" id="profile-menu-dropdown" role="menu">{isAuthenticated ? <button type="button" role="menuitem" onClick={() => { setProfileMenuOpen(false); void logout(); }}>{tr('logout')}</button> : <button type="button" role="menuitem" onClick={() => { setProfileMenuOpen(false); setPendingAccess(null); setRegistering(false); setView('login'); }}>{tr('login')}</button>}{!RELEASE_FREE_ACCESS && <button type="button" role="menuitem" onClick={() => { setProfileMenuOpen(false); setPendingAccess(null); setSelectedPlan(null); setView('plans'); }}>{tr('premium')}</button>}</div>}</div>
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
          <div className="plans-grid" aria-label="Modos Premium de Modo Cultiva">{(Object.keys(planDetails) as PlanKey[]).map((plan) => <button className={plan === 'gold' ? 'plan-card plan-card--featured' : 'plan-card'} type="button" key={plan} onClick={() => { setActivePlan(plan); window.localStorage.setItem('modoCultiva_plan', plan); setSelectedPlan(plan); }}><span className="plan-card-name">{planDetails[plan].name}</span><strong>{planDetails[plan].price}</strong><p>{planDetails[plan].promise}</p><span className="plan-card-link">Ver beneficios completos ↗</span></button>)}</div>
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
            {cultTab === 'network' && <><div className="cult-section-heading"><div><p className="kicker">{tr('specialistNetwork')}</p><h2>{tr('findYourNextGuide')}</h2></div><span className="cult-live-pill cult-live-pill--gold"><i /> {tr('verifiedProfiles')}</span></div><div className="cult-filter-row"><select aria-label={tr('filterByMode')} value={specialistModeFilter} onChange={(event) => setSpecialistModeFilter(event.target.value)}><option value="all">{tr('allModes')}</option>{modes.map((mode) => <option key={mode.key} value={mode.key}>{modeName(mode)}</option>)}</select><select aria-label={tr('filterByLanguage')} value={specialistLanguageFilter} onChange={(event) => setSpecialistLanguageFilter(event.target.value)}><option value="all">{tr('anyLanguage')}</option>{specialistLanguages.map((language) => <option key={language} value={language}>{language}</option>)}</select><select aria-label={tr('filterByLocation')} value={specialistContinentFilter} onChange={(event) => setSpecialistContinentFilter(event.target.value)}><option value="all">{tr('anyContinent')}</option>{specialistContinents.map((continent) => <option key={continent} value={continent}>{continentLabel(continent)}</option>)}</select></div><div className="cult-specialist-list">{filteredSpecialists.length ? filteredSpecialists.map((specialist) => { const mode = modes.find((item) => item.key === specialist.modeKey)!; return <article key={specialist.name}><div className="cult-specialist-avatar">{specialist.name.slice(0, 1)}</div><div className="cult-specialist-copy"><strong>{specialist.name} <span>✓</span></strong><small>{modeName(mode)} · {specialist.specialty}</small><p>{tr('availableForGuidance')} · {specialistLocation(specialist.location)}</p></div><div className="cult-match"><span>{specialist.match} {tr('matchLabel')}</span><small>{specialist.language} · {continentLabel(specialist.continent)}</small></div><button type="button" onClick={() => setSpecialistPreview(specialist)}>{tr('viewSpecialistProfile')} ↗</button></article>; }) : <div className="cult-empty-state">{tr('noSpecialistsMatch')}</div>}</div></>}
            {cultTab === 'skins' && <><div className="cult-section-heading"><div><p className="kicker">Identidad en movimiento</p><h2>Cambia la paleta de tu cultivo.</h2></div><span className="cult-live-pill"><i /> {skinCatalog.length + 4} DISPONIBLES</span></div><section className="cult-skin-category" aria-labelledby="cult-filters-title"><div className="cult-skin-category-heading"><div><p className="kicker">Paletas de atmósfera</p><h3 id="cult-filters-title">Filtros</h3></div><span>2 EXPERIENCIAS</span></div><div className="cult-skin-grid cult-skin-grid--filters"><article className={`cult-skin-card${paletteFilter === 'nocturna' ? ' cult-skin-card--active' : ''}`}><div className="cult-skin-visual cult-skin-visual--nocturna"><span className="skin-card-glyph skin-card-glyph--owl" aria-hidden="true">🦉</span></div><div><strong>Night Owl</strong><p>{tr('nightOwlDescription')}</p><button type="button" onClick={() => activatePaletteFilter('nocturna')}>{paletteFilter === 'nocturna' ? tr('activeNow') : tr('activateFilter')}</button></div></article><article className={`cult-skin-card cult-skin-card--lucid${paletteFilter === 'lucid' ? ' cult-skin-card--active' : ''}`}><div className="cult-skin-visual cult-skin-visual--lucid"><span className="skin-card-glyph skin-card-glyph--dream" aria-hidden="true">◌</span></div><div><strong>Lucid</strong><p>{tr('lucidDescription')}</p><button type="button" onClick={() => activatePaletteFilter('lucid')}>{paletteFilter === 'lucid' ? tr('activeNow') : tr('activateFilter')}</button></div></article></div></section><section className="cult-skin-category" aria-labelledby="cult-skins-title"><div className="cult-skin-category-heading"><div><p className="kicker">Interfaces completas</p><h3 id="cult-skins-title">Skins</h3></div><span>{skinCatalog.length + 2} EXPERIENCIAS</span></div><div className="cult-skin-grid cult-skin-grid--skins"><article className={`cult-skin-card${skin === 'holista' ? ' cult-skin-card--active' : ''}`}><div className="cult-skin-visual cult-skin-visual--holista"><span>◌</span></div><div><strong>Holista</strong><p>La raíz original de Modo Cultiva.</p><button type="button" onClick={() => activateCultSkin('holista')}>{skin === 'holista' ? 'Activa ahora ✓' : 'Activar skin ↗'}</button></div></article><article className={`cult-skin-card${skin === 'dj' ? ' cult-skin-card--active' : ''}`}><div className="cult-skin-visual cult-skin-visual--dj"><span className="skin-card-glyph skin-card-glyph--faders" aria-hidden="true"><i /><i /><i /></span></div><div><strong>Consola DJ</strong><p>La mezcla perfecta para ecualizar la canción de tu vida.</p><button type="button" onClick={() => activateCultSkin('dj')}>{skin === 'dj' ? 'Activa ahora ✓' : 'Activar skin ↗'}</button></div></article>{skinCatalog.map((item) => <article className={`cult-skin-card cult-skin-card--${item.key}${skin === item.key ? ' cult-skin-card--active' : ''}`} key={item.key}><div className={`cult-skin-visual cult-skin-visual--${item.key}`}><span>{item.icon}</span></div><div><strong>{item.name}</strong><p>{item.description}</p><button type="button" onClick={() => activateCultSkin(item.key)}>{skin === item.key ? 'Activa ahora ✓' : 'Activar skin ↗'}</button></div></article>)}</div></section></>}
          </main><aside className="cult-rail"><div className="cult-status-card"><span className="cult-status-label">TU ESTATUS</span><div className="cult-badge">U</div><h3>ULTIMATE MODE</h3><p>{tr('globalTitle')}</p><div className="cult-status-rule" /><span className="cult-status-label">TU RED</span><strong>24 conexiones</strong><small>+6 esta semana</small></div><div className="cult-rail-card"><span className="cult-status-label">PRÓXIMO EN TU RUTA</span><strong>{modeName(modes[11])}</strong><p>3 recomendaciones esperan tu revisión.</p><button type="button" onClick={() => setCultTab('insights')}>{tr('recommendations')} →</button></div><div className="cult-quote">“No cultivas una sola versión de ti.<br /><strong>Cultivas todas.</strong>”</div></aside></div>
        </section>
      ) : view === 'welcome' ? (
        <section className={`welcome-view${skin === 'dj' ? ' welcome-view--dj' : ''}`} data-layer="home" aria-labelledby="welcome-title">
          {isInterfaceSkin && skin !== 'zen' && <section className={`skin-interface skin-interface--${skin}`} aria-label={`${skinInfo(skin)?.name} overview`}><div className="skin-interface-orbit"><span>{skinInfo(skin)?.icon}</span><small>12 MODOS<br />ENFOCADOS</small></div><div><p className="kicker">{skinInfo(skin)?.name} · MAPA DE VIDA</p><h1>{skinInfo(skin)?.signature}</h1><p>{skinInfo(skin)?.description}</p><div className="skin-interface-grid">{modes.slice(0, 4).map((mode) => <article key={mode.key} tabIndex={0} title={modeDescription(mode)}><span>{mode.icon}</span><strong>{modeShortName(mode)}</strong><small>NIVEL {levels[mode.key]}</small><span className="skin-interface-mode-description">{modeDescription(mode)}</span></article>)}</div><button className="skin-interface-entry" type="button" onClick={() => setView('dashboard')}>Entrar a mi mapa <span>↗</span></button></div></section>}
          {skin === 'zen' && <section className="zen-garden-overview" aria-labelledby="zen-garden-title"><div className="zen-garden-sun" aria-hidden="true" /><div className="zen-garden-water" aria-hidden="true" /><div className="zen-garden-bonsai zen-garden-bonsai--left" aria-hidden="true">🌳</div><div className="zen-garden-bonsai zen-garden-bonsai--right" aria-hidden="true">🌲</div><div className="zen-garden-header"><p className="kicker">Zen Garden · MAPA DE VIDA</p><h1 id="zen-garden-title">Respira. Observa. Cultiva.</h1><p>Un jardín para recorrer tus 12 modos con calma, atención y un paso a la vez.</p><button className="zen-garden-entry" type="button" onClick={() => setView('dashboard')}>Entrar a mi mapa <span>↗</span></button></div><div className="zen-garden-path" aria-label="Tus 12 modos de vida">{modes.map((mode, index) => <button className={`zen-stone zen-stone--${index + 1}`} key={mode.key} type="button" onClick={() => openMode(mode)} style={{ '--stone-color': mode.color } as CSSProperties} aria-label={`${modeName(mode)}, nivel ${levels[mode.key]}`}><span className="zen-stone-icon">{mode.icon}</span><strong>{modeShortName(mode)}</strong><small>NIVEL {levels[mode.key]}</small><span className="zen-stone-description">{modeDescription(mode)}</span></button>)}</div><div className="zen-garden-rake zen-garden-rake--one" aria-hidden="true" /><div className="zen-garden-rake zen-garden-rake--two" aria-hidden="true" /><span className="zen-garden-caption">12 MODOS · UN JARDÍN EN MOVIMIENTO</span></section>}
          {skin === 'dj' && <section className="dj-console" aria-labelledby="dj-console-title">
            <div className="dj-console-top"><div><p className="kicker">{tr('djEyebrow')}</p><h1 id="dj-console-title">{tr('djTitle')}</h1><p className="intro-copy">{tr('djActivated')}</p></div><div className="dj-profile-entry"><button className={profileImage ? 'dj-profile-button dj-profile-button--with-photo' : 'dj-profile-button'} style={profileImage ? { backgroundImage: `linear-gradient(180deg, rgba(4, 18, 29, .08), rgba(4, 18, 29, .82)), url(${profileImage})` } : undefined} type="button" onClick={() => setView('dashboard')} aria-label={`${tr('pressToEnter')}${displayedProfileName ? ` · ${displayedProfileName}` : ''}`}><span className="dj-profile-fallback">{profileImage ? '' : displayedProfileName.slice(0, 1).toUpperCase()}</span><span className="dj-profile-copy"><strong>{displayedProfileName}</strong>{displayedProfileRole && <span className="profile-badge">{displayedProfileRole}</span>}<small>{tr('pressToEnter')} <b>↗</b></small></span></button><label className="dj-profile-upload" title="Cambiar foto de perfil"><input type="file" accept="image/*" onChange={(event) => handleProfileImage(event.target.files?.[0])} /><span>＋</span></label></div></div>
            <div className="dj-console-screen"><span>{tr('djPersonalSession')}{displayedProfileName ? ` · ${displayedProfileName.toUpperCase()}` : ''}</span><strong>{tr('lifeModes')}</strong><i /></div>
            <div className="dj-control-strip"><span>{tr('djSignalMaster')}</span><i className="dj-decor-knob" /><i className="dj-decor-knob" /></div>
            <div className="dj-readout-panel"><span>{tr('djActiveChannel')} · {modeName(focusedDjMode).toUpperCase()}</span><strong>{tr('level')} {levels[focusedDjMode.key]} · {localizedLevelNames[language][levels[focusedDjMode.key]]}</strong><p>{levelDescription(levels[focusedDjMode.key])}</p></div>
            <div className="dj-channel-deck">{modes.map((mode) => { const level = levels[mode.key]; const litSegments = Math.max(1, Math.ceil(((level + 1) / 10) * 10)); return <article className="dj-channel" key={mode.key} style={{ '--mode-color': mode.color, '--mode-accent': mode.accent } as CSSProperties}><div className="dj-channel-head"><span>{mode.roman}</span><strong>{mode.icon} {modeShortName(mode)}</strong><button className="dj-level-display" type="button" onClick={() => openMode(mode)} aria-label={`${tr('djAccess')} ${modeName(mode)}`}><b>{String(level).padStart(2, '0')}</b><small>{tr('djAccess')}</small></button></div><p className="dj-channel-description">{modeDescription(mode)}</p><div className="dj-knob-bank" aria-hidden="true"><i className="dj-knob" /><i className="dj-knob" /><i className="dj-knob" /></div><div className="dj-led-meter" aria-hidden="true">{Array.from({ length: 10 }, (_, index) => <i className={index < litSegments ? 'dj-led dj-led--on' : 'dj-led'} key={index} />)}</div><div className="dj-fader-wrap"><span>9</span><input className="dj-fader" aria-label={`${tr('levels')} ${modeName(mode)}`} type="range" min="0" max="9" value={level} onFocus={() => setDjFocusedMode(mode.key)} onChange={(event) => { setDjFocusedMode(mode.key); updateLevel(mode.key, Number(event.target.value)); }} /><span>0</span></div><span className="dj-cable" aria-hidden="true" /></article>; })}</div>
          </section>}
          <div className={skin === 'dj' || isInterfaceSkin ? 'holista-overview-content holista-overview-content--hidden' : 'holista-overview-content'}>
          <div className="welcome-copy">
            <p className="kicker">{tr('welcome')}</p>
            <h1 id="welcome-title">Cultiva todos tus modos.</h1>
            <p className="intro-copy">{tr('welcomeOverviewCopy')}</p>
          </div>
          <div className="overview-stage" aria-label="Overview de tus 12 modos de vida">
            <div className="overview-orbit overview-orbit--outer" />
            <div className="overview-orbit overview-orbit--inner" />
              <span className="overview-light-sweep" aria-hidden="true" />
            {modes.map((mode, index) => (
              <button className="overview-mode" key={mode.key} type="button" onClick={() => openMode(mode)} style={{ '--mode-color': mode.color, '--mode-accent': mode.accent, '--mode-angle': `${index * 30}deg` } as CSSProperties} aria-label={`${modeName(mode)}, nivel ${levels[mode.key]}`}>
                <span className="overview-mode-icon">{mode.icon}</span><span className="overview-mode-name">{modeShortName(mode)}</span><strong>{levels[mode.key]}</strong><span className="overview-mode-description">{modeDescription(mode)}</span>
              </button>
            ))}
            <div className="overview-person">
              <div className="overview-identity-orb" style={profileImage ? { backgroundImage: `linear-gradient(180deg, rgba(4, 18, 29, .12), rgba(4, 18, 29, .6)), url(${profileImage})` } : undefined}>
              <button ref={configurationsTriggerRef} className="overview-core" type="button" onClick={() => setConfigurationsOpen(true)} aria-label={tr('presets')} aria-haspopup="dialog" aria-controls="life-configurations-card">
                <span className="overview-photo-content"><strong>{displayedProfileName}</strong>{displayedProfileRole && <span className="profile-badge">{displayedProfileRole}</span>}</span>
                <span className="overview-enter-prompt">{tr('presets')} <b>↗</b></span>
              </button>
                <button className="overview-profile-dock" type="button" onClick={() => setProfilePreviewMode(true)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="12" cy="8" r="3" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></svg>{tr('profileButton')}</button>
              </div>
            </div>
          </div>
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
                  <path id="score-leaf-shape" pathLength="100" d="M62 230C20 160 47 65 136 46C189 35 243 48 284 22C294 84 280 150 237 190C193 231 130 253 62 230Z" />
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
              <div className="score-orbit score-orbit--large" aria-label={trf('currentScoreAria', { average })}><strong>{average}</strong></div>
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
              <div className="configuration-select-wrap"><select id="preset-select" value={selectedPreset} onChange={(event) => { setRenamingPreset(false); setPresetNotice(null); setSelectedPreset(event.target.value); window.localStorage.setItem('modoCultiva_selectedPreset', event.target.value); }}><option value="">{tr('selectPreset')}</option>{Object.keys(presets).map((name) => <option key={name} value={name}>{name}</option>)}</select><span aria-hidden="true">⌄</span></div>
              <div className="configuration-library-actions"><button className="configuration-load-action" type="button" onClick={loadPreset}>{tr('load')} <span aria-hidden="true">↗</span></button><button className="configuration-rename-action" type="button" onClick={beginPresetRename} disabled={!selectedPreset || !presets[selectedPreset]}>{tr('renameConfiguration')}</button><button className="configuration-delete-action" type="button" onClick={deletePreset}>{tr('remove')}</button></div>
              {renamingPreset && <form className="configuration-rename-editor" onSubmit={(event) => { event.preventDefault(); commitPresetRename(); }}><label htmlFor="preset-rename-name">{tr('configurationNewName')}</label><div className="configuration-name-entry"><input ref={presetRenameInputRef} id="preset-rename-name" value={presetRenameName} onChange={(event) => setPresetRenameName(event.target.value)} /><button className="configuration-save-action" type="submit">{tr('saveConfigurationName')}</button></div><button className="configuration-cancel-rename" type="button" onClick={() => setRenamingPreset(false)}>{tr('cancelRename')}</button></form>}
            </div>
          </div>
        </div>
        {presetNotice && <p className="configuration-notice" role="status">{presetNotice}</p>}
      </dialog>}

      {selectedPlan && <div className="feature-preview-backdrop" role="presentation" onClick={() => setSelectedPlan(null)}><section className="plan-detail-modal" role="dialog" aria-modal="true" aria-labelledby="plan-detail-title" onClick={(event) => event.stopPropagation()}><button className="close-journey" type="button" onClick={() => setSelectedPlan(null)} aria-label="Cerrar detalles del plan">×</button><p className="kicker">Detalles del plan</p><h2 id="plan-detail-title">{planDetails[selectedPlan].name}</h2><strong className="plan-detail-price">{planDetails[selectedPlan].price}</strong><p className="plan-detail-promise">{planDetails[selectedPlan].promise}</p><ul className="plan-detail-list">{planDetails[selectedPlan].features.map((feature) => <li key={feature}>{feature}</li>)}</ul>{selectedPlan === 'ultimate' && <button className="feature-preview-cta cult-entry-cta" type="button" onClick={() => { setSelectedPlan(null); setPendingAccess(null); setCultTab('insights'); setSelectedMode(modes[0]); setCultOpen(true); setView('dashboard'); }}>{tr('globalName')} <span>✦</span></button>}<button className="feature-preview-dismiss" type="button" onClick={() => setSelectedPlan(null)}>Volver a Modos Premium</button></section></div>}

      {insightPreview && <div className="feature-preview-backdrop" role="presentation" onClick={() => setInsightPreview(null)}><section className="feature-preview" role="dialog" aria-modal="true" aria-labelledby="insight-preview-title" onClick={(event) => event.stopPropagation()}><button className="close-journey" type="button" onClick={() => setInsightPreview(null)} aria-label="Cerrar vista previa">×</button><p className="kicker">Vista previa · Layer de Insights</p><h2 id="insight-preview-title">Pedir Insights</h2><p className="journey-description">Comparte una duda con personas que ya recorrieron este nivel y recibe una estrategia desde la experiencia de la comunidad.</p><div className="insight-preview-card"><span>INSIGHT DE NIVEL {insightPreview.level}</span><strong>{modes.find((mode) => mode.key === insightPreview.modeKey)?.name}</strong><p>“¿Qué práctica te ayudó a avanzar de este nivel al siguiente?”</p><small>La solicitud se habilita al crear una cuenta Gold.</small></div><button className="feature-preview-cta" type="button" onClick={() => { setInsightPreview(null); openPlan('gold', 'Insights locales'); }}>Ver acceso Gold <span>→</span></button><button className="feature-preview-dismiss" type="button" onClick={() => setInsightPreview(null)}>Seguir explorando como invitado</button></section></div>}

      {cultInsightPreview && <div className="feature-preview-backdrop" role="presentation" onClick={() => setCultInsightPreview(null)}><section className="feature-preview cult-insight-modal" style={{ '--insight-color': modes.find((mode) => mode.key === cultInsightPreview.modeKey)?.color ?? '#70ed9c' } as CSSProperties} role="dialog" aria-modal="true" aria-labelledby="cult-insight-modal-title" onClick={(event) => event.stopPropagation()}><button className="close-journey" type="button" onClick={() => setCultInsightPreview(null)} aria-label={tr('close')}>×</button><h2 id="cult-insight-modal-title">{cultInsightPreview.activity.split(' · ')[0]}</h2><div className="insight-modal-meta"><span>{tr('level')} {cultInsightPreview.level} → {cultInsightPreview.level + 1}</span><span>{effortLabel(cultInsightPreview.level)}</span></div><div className="insight-preset-card"><span>{tr('presetOf')} {cultInsightPreview.author.toUpperCase()}</span><strong>{cultInsightPreview.presetName}</strong><p>{tr('insightPresetDescription')}</p><blockquote className="insight-author-bio">“{cultInsightPreview.bio}”</blockquote><div className="insight-profile-badges"><span>{tr('featuredBadges')}</span><div>{cultInsightPreview.badges.map((key) => { const badge = cultBadgeCatalog.find((item) => item.key === key); return badge ? <b key={key} title={badgeTitle(key)}>{badge.icon} {badgeTitle(key)}</b> : null; })}</div></div><div className="insight-preset-levels">{modes.map((mode) => <span key={mode.key}>{modeShortName(mode)} <b>{cultInsightPreview.preset[mode.key]}</b></span>)}</div></div><button className="feature-preview-cta" type="button" onClick={saveGlobalInsightActivity}>{tr('useInMap')} <span>＋</span></button><button className="feature-preview-dismiss" type="button" onClick={() => setCultInsightPreview(null)}>{tr('exploreInsights')}</button></section></div>}

      {specialistPreview && <div className="feature-preview-backdrop" role="presentation" onClick={() => setSpecialistPreview(null)}><section className="feature-preview specialist-profile-modal" role="dialog" aria-modal="true" aria-labelledby="specialist-profile-title" onClick={(event) => event.stopPropagation()}><button className="close-journey" type="button" onClick={() => setSpecialistPreview(null)} aria-label={tr('closeProfile')}>×</button><p className="kicker">{tr('verifiedProfile')} · {tr('specialistNetwork')}</p><div className="specialist-profile-heading"><div className="cult-specialist-avatar">{specialistPreview.name.slice(0, 1)}</div><div><h2 id="specialist-profile-title">{specialistPreview.name}</h2><p>{specialistPreview.specialty} · {specialistLocation(specialistPreview.location)}</p></div><span>{specialistPreview.match} {tr('matchLabel')}</span></div><div className="specialist-profile-meta"><span>{specialistPreview.language}</span><span>{continentLabel(specialistPreview.continent)}</span><span>{modeName(modes.find((mode) => mode.key === specialistPreview.modeKey)!)}</span></div><div className="specialist-profile-copy"><span className="crm-eyebrow">{tr('trajectory')}</span><p>{specialistPreview.trajectory}</p><blockquote>“{specialistPreview.message}”</blockquote></div><div className="specialist-preset"><div><span className="crm-eyebrow">{tr('specialistPreset')}</span><h3>{specialistPreview.presetName}</h3></div><span className="crm-card-caption">{tr('twelveModesLevels')}</span></div><div className="specialist-level-grid">{modes.map((mode) => <div key={mode.key} style={{ '--mode-color': mode.color } as CSSProperties}><span>{mode.icon}</span><strong>{modeShortName(mode)}</strong><b>{specialistPreview.modeLevels[mode.key]}</b></div>)}</div><button className="feature-preview-cta" type="button" onClick={() => setSpecialistPreview(null)}>{tr('closeProfile')} <span>×</span></button></section></div>}

      {profilePreviewMode && <div className="feature-preview-backdrop" role="presentation" onClick={() => setProfilePreviewMode(false)}><section className="feature-preview profile-preview-modal" role="dialog" aria-modal="true" aria-labelledby="profile-preview-title" onClick={(event) => event.stopPropagation()}>
        <button className="close-journey" type="button" onClick={() => setProfilePreviewMode(false)} aria-label={tr('closeProfile')}>×</button>
        <p className="kicker">{tr('profileModalEyebrow')}</p><h2 id="profile-preview-title">{displayedProfileName || tr('profileYou')}</h2>
        <p className="profile-preview-description">{tr('profileOwnDescription')}</p>
        <div className="profile-preview-identity">{profileImage ? <img src={profileImage} alt="" /> : <span>{(displayedProfileName || tr('profileYou')).slice(0, 1).toUpperCase()}</span>}<div><strong>{displayedProfileName || tr('profileYou')}</strong>{displayedProfileRole && <small>{displayedProfileRole}</small>}</div></div>
        <div className="profile-preview-badges"><span className="crm-eyebrow">{tr('featuredBadges')}</span><div>{featuredBadges.length ? featuredBadges.map((key) => { const badge = cultBadgeCatalog.find((item) => item.key === key)!; return <b key={key} title={badgeTitle(key)}>{badge.icon} {badgeTitle(key)}</b>; }) : <small>{tr('noFeaturedAchievements')}</small>}</div></div>
        <div className="profile-preview-preset"><div><span className="crm-eyebrow">{tr('currentPreset')}</span><strong>{selectedPreset || tr('currentMap')}</strong></div><span>{tr('levelMap')}</span></div>
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

      {selectedMode && <div className="journey-backdrop" role="presentation" onClick={() => setSelectedMode(null)}><section ref={journeyPanelRef} className="journey-panel" data-layer={activeActivity !== null ? '5' : '3'} role="dialog" aria-modal="true" aria-labelledby="journey-title" style={{ '--mode-color': selectedMode.color, '--mode-accent': selectedMode.accent } as CSSProperties} onClick={(event) => event.stopPropagation()}>
        <button className="close-journey" type="button" onClick={() => setSelectedMode(null)} aria-label={tr('journeyClose')}>×</button>
        {activeActivity === null && <button className="journey-back" type="button" onClick={backToDashboard}>← {tr('back')} {journeyReturnView === 'dashboard' ? tr('dashboard') : tr('overview')}</button>}
        {activeActivity !== null && <button className="journey-back activity-agent-back" type="button" onClick={() => { setActiveActivity(null); restoreJourneyPosition(); }}>← {tr('back')}</button>}
        {activeActivity !== null ? <section className={`activity-agent activity-agent--${activityEntry}`} data-layer="5" aria-labelledby="activity-agent-title">
          <p className="kicker">{tr('activityDesign')} · {modeName(selectedMode)} · {activityEntry === 'custom' ? tr('addActivity') : activityEntry === 'pool' ? tr('activityPool') : tr('modeAI')}</p>
          {activityEntry === 'custom' ? <>
            <h2 id="activity-agent-title">{tr('addActivity')}</h2>
            <p className="journey-description">{tr('journeyBuilderIntro')} {tr('level')} {activeActivity}.</p>
            <div className="effort-panel"><span className="effort-label">{tr('effortParameter')}</span><strong>{effortLabel(activeActivity)}</strong><p>{levelDescription(activeActivity)}</p></div>
            <label className="agent-input-label" htmlFor="activity-prompt">{tr('activity')}</label><textarea id="activity-prompt" value={activityPrompt} onChange={(event) => setActivityPrompt(event.target.value)} placeholder={tr('activityPlaceholder')} rows={6} />
            <div className="agent-actions agent-actions--single"><button className="agent-save" type="button" onClick={() => saveActivity(selectedMode.key, activeActivity, activityPrompt.trim() || tr('activityUndefined'))}>{tr('useActivity')} <span>→</span></button></div>
          </> : activityEntry === 'pool' ? <>
            <h2 id="activity-agent-title">{tr('activityPool')}</h2>
          <p className="journey-description">{tr('recommendations')} · {tr('level')} {activeActivity} · {modeName(selectedMode)}. {tr('recommendations')}.</p>
            <div className="effort-panel"><span className="effort-label">{tr('activityLevel')} {activeActivity}</span><strong>{effortLabel(activeActivity)}</strong><p>{levelDescription(activeActivity)}</p></div>
            <label className="pool-selector-label" htmlFor="pool-selection">{tr('recommendations')}<select id="pool-selection" value={poolSelection} onChange={(event) => setPoolSelection(Number(event.target.value))}>{poolActivities(selectedMode.key, activeActivity).map((activity, index) => <option value={index} key={activity.title}>{tr('recommendation')} {index + 1}/10 - {activity.title}</option>)}</select></label>
            <article className="pool-activity-card"><span className="pool-activity-index">{tr('activityLevel')} {activeActivity}</span><h3>{poolActivities(selectedMode.key, activeActivity)[poolSelection].title}</h3><p>{poolActivities(selectedMode.key, activeActivity)[poolSelection].description}</p><div className="pool-activity-meta"><span>{effortLabel(activeActivity)}</span><span>{tr('levels').toUpperCase()} {activeActivity}</span></div></article>
            <div className="agent-actions agent-actions--single"><button className="agent-save" type="button" onClick={usePoolActivity}>{tr('useActivity')} <span>→</span></button></div>
          </> : <>
            <h2 id="activity-agent-title">{tr('buildActivity')}</h2>
            <p className="journey-description">{tr('globalTitle')} · {modeName(selectedMode)}, {tr('levels')} {activeActivity}.</p>
            <div className="effort-panel"><span className="effort-label">{tr('effortParameter')}</span><strong>{effortLabel(activeActivity)}</strong><p>{tr(`effort${effortByLevel[activeActivity]}`)}</p></div>
            <div className="agent-runtime-strip" aria-label={tr('agentStatus')}><span className="agent-runtime-dot" /> <strong>{tr('agentReady')}</strong><small>{aiHasConsulted ? tr('proposalReady') : tr('agentWaiting')}</small></div>
            <div className="agent-chat" aria-live="polite"><div className="agent-message"><span>IA</span><p>{trf('journeyAiQuestion', { level: String(activeActivity) })}</p></div>{aiHasConsulted ? <div className="agent-message agent-message--proposal"><span>IA</span><p>{aiProposal}</p></div> : <div className="agent-message agent-message--waiting"><span>IA</span><p>{tr('journeyAiWaiting')}</p></div>}</div>
            <label className="agent-input-label" htmlFor="activity-prompt">{tr('context')}</label><textarea id="activity-prompt" value={activityPrompt} onChange={(event) => { setActivityPrompt(event.target.value); setAiHasConsulted(false); setAiNotice(null); }} placeholder={tr('activityPlaceholder')} rows={3} />
            {aiNotice && <div className="insight-notice" role="status">✦ {aiNotice}</div>}
            <div className="agent-actions"><button className="agent-ask" type="button" disabled={aiLoading} onClick={() => { void consultModeAi(); }}>{aiLoading ? tr('consulting') : tr('askAI')} <span>→</span></button><button className="agent-save" type="button" disabled={aiLoading} onClick={saveModeAiActivity}>{tr('useActivity')} <span>→</span></button></div>
          </>}
        </section> : <>
          <div className="journey-intro-compact"><span className="journey-icon">{selectedMode.icon}</span><div><h2 id="journey-title">{modeName(selectedMode)}</h2><p className="journey-description">{modeJourneyDescription(selectedMode)}</p></div></div>
          <div className="journey-level journey-level--compact"><div><span>{tr('currentLevelLabel')}</span><strong>{levels[selectedMode.key]}</strong></div><span className="journey-level-name">{localizedLevelNames[language][levels[selectedMode.key]]}</span></div><div className="level-definition level-definition--compact"><strong>{localizedLevelNames[language][levels[selectedMode.key]]}</strong><p>{levelDefinitionText(levels[selectedMode.key])}</p></div>
          <label htmlFor="journey-slider">{tr('presenceLevel')}</label><input id="journey-slider" className="journey-slider" type="range" min="0" max="9" value={levels[selectedMode.key]} onChange={(event) => updateLevel(selectedMode.key, Number(event.target.value))} />
          <section className="journey-builder" data-layer="3" aria-labelledby="journey-builder-title">
          <div className="journey-builder-heading"><div><p className="kicker">{tr('activityDesign')}</p><h3 id="journey-builder-title">{tr('cultivationPath')}</h3></div></div>
          <p className="journey-builder-intro">{tr('journeyBuilderIntro')} {modeName(selectedMode)}.</p>
          {insightNotice && <div className="insight-notice" role="status">✦ {insightNotice}<button type="button" onClick={() => setInsightNotice(null)} aria-label={tr('closeNotice')}>×</button></div>}
          <div className="journey-carousel" aria-label={`${tr('levels')} · ${modeName(selectedMode)}`}>
            <button className="journey-carousel-arrow" type="button" onClick={() => setJourneySlide((current) => Math.max(0, current - 1))} disabled={journeySlide === 0} aria-label={tr('previousLevel')}>←</button>
            <div className="journey-carousel-viewport">
              <div className="journey-level-grid journey-level-grid--carousel">
                {journeyLevels.filter((level) => level === journeySlide).map((level) => <article className={`journey-level-card journey-level-card--active${level === 0 ? ' journey-level-card--start' : ''}${level === levels[selectedMode.key] ? ' journey-level-card--current' : ''}${level === 9 ? ' journey-level-card--vision' : ''}`} style={level === 9 && visionImages[selectedMode.key] ? { backgroundImage: `linear-gradient(135deg, rgba(4, 18, 22, .74), rgba(4, 18, 22, .35)), url(${visionImages[selectedMode.key]})` } : undefined} key={level}><div className="journey-level-card-top"><div className="journey-level-card-index"><span>{tr('level')}</span><strong>{level}</strong></div><span className="journey-level-card-name">{localizedLevelNames[language][level]}</span>{level < 9 && <strong className="journey-level-card-effort effort-tag">{effortLabel(level)}</strong>}{level === 9 && <em>{tr('finalVision')}</em>}</div>{level < 9 ? <h4 className={activityTitleClass(activityDrafts[`${selectedMode.key}-${level}`] ?? tr('activityUndefined'), !activityDrafts[`${selectedMode.key}-${level}`])}>{activityDrafts[`${selectedMode.key}-${level}`] ?? tr('activityUndefined')}</h4> : <><h4 className="journey-activity-title journey-activity-title--short">{tr('finalVision')}</h4><label className="vision-upload"><span className="vision-upload-icon">＋</span><input type="file" accept="image/*" onChange={(event) => handleVisionImage(selectedMode.key, event.target.files?.[0])} />{visionImages[selectedMode.key] ? tr('changeImage') : tr('uploadImage')}</label></>}</article>)}
              </div>
            </div>
            <button className="journey-carousel-arrow" type="button" onClick={() => setJourneySlide((current) => Math.min(9, current + 1))} disabled={journeySlide === 9} aria-label={tr('nextLevel')}>→</button>
          </div>
          <div className="journey-carousel-footer"><div className="journey-carousel-dots" aria-label={tr('selectLevel')}>{journeyLevels.map((level) => <button className={level === journeySlide ? 'is-active' : ''} type="button" key={level} onClick={() => setJourneySlide(level)} aria-label={`${tr('levels')} ${level}`}>{level}</button>)}</div></div>
          {journeySlide < 9 ? <div className="journey-fixed-actions" aria-label={tr('visibleLevelActions')}><button type="button" onClick={() => openActivity(journeySlide, 'custom')}>{activityDrafts[`${selectedMode.key}-${journeySlide}`] ? `✦ ${tr('modifyActivity')}` : `＋ ${tr('addActivity')}`}</button><button className="activity-pool-button" type="button" onClick={() => openActivity(journeySlide, 'pool')}>▦ {tr('activityPool')}</button><button className="activity-ai-button" type="button" onClick={() => openActivity(journeySlide, 'ai')}>✦ {tr('modeAI')}</button><button className={insightRequests[insightRequestKey(selectedMode.key, journeySlide)] ? 'insight-button insight-button--requested' : 'insight-button'} type="button" aria-pressed={Boolean(insightRequests[insightRequestKey(selectedMode.key, journeySlide)])} onClick={() => requestInsight(selectedMode.key, journeySlide)}>{insightRequests[insightRequestKey(selectedMode.key, journeySlide)] ? `✓ ${tr('insightRequested')}` : tr('requestInsights')}</button></div> : <div className="journey-vision-note">{tr('finalVision')} · {tr('finalVisionCopy')}</div>}
          </section>
          {renderCultSection()}
        </>}
      </section></div>}
    </main>
  );
}

export default App;
