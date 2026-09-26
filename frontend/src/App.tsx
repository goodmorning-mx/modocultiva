import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import logo from './assets/modo-cultiva-logo.png';
import './skin-overrides.css';

type HealthResponse = {
  service: string;
  status: string;
  environment: string;
};

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
type ActivityEntry = 'custom' | 'pool' | 'ai';
type PoolActivity = { title: string; description: string };
type AccessRequest = { feature: string; plan: 'Cuenta' | 'Entry' | 'Gold' | 'Ultimate Mode'; returnView: View };
type PendingActivity = { level: number; entry: ActivityEntry };
type PlanKey = 'basic' | 'gold' | 'ultimate';
type PlanDetails = { name: string; price: string; promise: string; features: string[] };
type CultTab = 'home' | 'insights' | 'network' | 'skins';

const skinCatalog: { key: Skin; name: string; icon: string; description: string; signature: string; access: 'base' | 'gold' | 'ultimate' }[] = [
  { key: 'zen', name: 'Zen Garden', icon: '❋', description: 'Un jardín vivo para cultivar presencia, calma y equilibrio.', signature: 'Respira. Observa. Cultiva.', access: 'gold' },
  { key: 'mission', name: 'Mission Control', icon: '⌁', description: 'Un centro de control para convertir intención en trayectoria.', signature: 'Tu siguiente órbita comienza aquí.', access: 'gold' },
  { key: 'rpg', name: 'Character Quest', icon: '♜', description: 'Tu desarrollo como una aventura de personaje y habilidades.', signature: 'Cada nivel desbloquea una versión de ti.', access: 'gold' },
  { key: 'botanical', name: 'Botanical Lab', icon: '♧', description: 'Experimenta, mide y observa cómo evolucionan tus hábitos.', signature: 'La curiosidad también se cultiva.', access: 'ultimate' },
  { key: 'arcade', name: 'Retro Arcade', icon: '▦', description: 'Convierte tus retos diarios en una experiencia de juego.', signature: 'Insert coin. Begin your next level.', access: 'gold' },
  { key: 'arcana', name: 'Arcana', icon: '✧', description: 'Símbolos, arquetipos y cartas para mirar hacia dentro.', signature: 'Revela lo que ya estaba en movimiento.', access: 'ultimate' },
  { key: 'urban', name: 'Urban Flow', icon: '⌂', description: 'Un mapa urbano para conectar tus modos con tu mundo.', signature: 'Encuentra tu ruta. Ocupa tu ciudad.', access: 'gold' },
  { key: 'ocean', name: 'Ocean Depths', icon: '≈', description: 'Explora la profundidad de cada área de tu vida.', signature: 'Baja el ruido. Encuentra profundidad.', access: 'ultimate' },
  { key: 'fashion', name: 'Fashion Studio', icon: '◇', description: 'Diseña tu identidad con intención, textura y presencia.', signature: 'Tu vida también es una forma de expresión.', access: 'gold' },
  { key: 'minimal', name: 'Minimal Focus', icon: '·', description: 'Menos ruido, más claridad para lo que realmente importa.', signature: 'Una cosa. Un paso. Presencia total.', access: 'gold' },
];
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
const planDetails: Record<PlanKey, PlanDetails> = {
  basic: { name: 'Entry', price: '$119.99 MXN /mes', promise: 'Convierte a Modo Cultiva en parte de tu rutina.', features: ['Todo lo incluido en Acceso Libre.', 'Skin Holista.', 'Journeys ilimitados.', 'Pool completo con 10 recomendaciones por nivel.', 'Vision boards en nivel 9.', 'Presets ilimitados.', 'Modo IA limitado: hasta 20 consultas mensuales.', 'Personalización de nombre y foto de perfil.', 'Historial personal de evolución.', 'Estadísticas básicas por modo.', 'Exportación de progreso.', 'Insignia Entry.'] },
  gold: { name: 'Gold', price: '$249.99 MXN /mes', promise: 'Cultiva acompañado por tu red de apoyo.', features: ['Todo lo incluido en Entry.', 'Una skin adicional de tu elección.', 'Insights locales dentro de tu red de apoyo.', 'Solicitudes y respuestas de Insights con mayor frecuencia.', 'Grupos privados o círculos de confianza.', 'Comparación de progreso con tu círculo.', 'Modo IA ampliado: hasta 100 consultas mensuales.', 'Presets compartibles.', 'Recomendaciones comunitarias.', 'Insignia Gold.'] },
  ultimate: { name: 'ULTIMATE MODE', price: '$899.99 MXN /mes', promise: 'Lleva tu cultivo a una red global de conocimiento.', features: ['Todo lo incluido en Gold.', 'Skins y Filtros ilimitados.', 'Insights ilimitados.', 'Insights globales.', 'Modo IA sin límite razonable o con política de uso justo.', 'Red de Especialistas.', 'Directorio de profesionales por modo.', 'Filtros por especialidad, nivel, idioma y ubicación.', 'Perfiles profesionales verificados.', 'Solicitud de orientación privada.', 'Seguimiento de recomendaciones profesionales.', 'Insignia ULTIMATE MODE.', 'Acceso anticipado a nuevas skins y features.'] },
};
const journeyLevels = Array.from({ length: 10 }, (_, level) => level);
const effortByLevel = ['Bajo', 'Bajo', 'Bajo', 'Medio', 'Medio', 'Medio', 'Alto', 'Alto', 'Alto', 'Visión final'];
const effortLabelByLevel = ['EXIGENCIA BAJA (Tiempo)', 'EXIGENCIA BAJA (Tiempo)', 'EXIGENCIA BAJA (Tiempo)', 'EXIGENCIA MEDIA (Tiempo + Energía)', 'EXIGENCIA MEDIA (Tiempo + Energía)', 'EXIGENCIA MEDIA (Tiempo + Energía)', 'EXIGENCIA ALTA (Tiempo + Energía + Dinero)', 'EXIGENCIA ALTA (Tiempo + Energía + Dinero)', 'EXIGENCIA ALTA (Tiempo + Energía + Dinero)', 'VISIÓN FINAL'];
const effortDescription: Record<string, string> = { Bajo: 'Claridad mental y definición de rumbo', Medio: 'Movimiento y práctica sin inversión', Alto: 'Inversión y asignación estratégica de recursos', 'Visión final': 'Define el resultado que quieres alcanzar' };
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
const insightAuthors = [
  ['Sofía Méndez', 'Ciudad de Guatemala', 'América Central', 'Español'],
  ['Marcus Lee', 'Austin · Remote', 'América del Norte', 'English'],
  ['Elena Costa', 'Lisboa · Remote', 'Europa', 'Português'],
  ['Diego Ríos', 'San José · Remote', 'América Central', 'Español'],
  ['Nadia Chen', 'Vancouver · Remote', 'América del Norte', '中文 · Chino'],
  ['Camila Torres', 'Bogotá · Remote', 'América del Sur', 'Español'],
] as const;
const globalInsightActivities = modes.flatMap((mode) => journeyLevels.filter((level) => level < 9).map((level, index) => {
  const author = insightAuthors[(modes.indexOf(mode) * 9 + level) % insightAuthors.length];
  return { modeKey: mode.key, level, activity: getPoolActivities(mode.key, level)[0].title, author: author[0], location: author[1], continent: author[2], language: author[3] };
}));
type Specialist = { name: string; modeKey: string; specialty: string; location: string; continent: string; language: string; match: string };
const specialists: Specialist[] = [
  { name: 'Sofía Méndez', modeKey: 'profesional', specialty: 'Estrategia y liderazgo', location: 'Ciudad de Guatemala', continent: 'América Central', language: 'Español', match: '98%' },
  { name: 'Marcus Lee', modeKey: 'financiero', specialty: 'Patrimonio y decisiones', location: 'Austin · Remote', continent: 'América del Norte', language: 'English', match: '96%' },
  { name: 'Elena Costa', modeKey: 'emocional', specialty: 'Vínculos y regulación', location: 'Lisboa · Remote', continent: 'Europa', language: 'Português', match: '99%' },
];
const getAiProposal = (mode: Mode, level: number, prompt: string) => prompt
  ? `Propongo una práctica de ${effortByLevel[level].toLowerCase()}: reserva un momento esta semana para experimentar una acción observable en ${mode.shortName}. Al terminar, registra qué ocurrió y qué ajustarías para repetirla.`
  : 'Cuéntame tu intención, tu disponibilidad y cualquier límite importante. Con eso prepararé una actividad medible y realista.';
const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

function App() {
  const [profileName, setProfileName] = useState(() => {
    try {
      return window.localStorage.getItem('modoCultiva_profileName') ?? defaultUserProfile.name;
    } catch {
      return defaultUserProfile.name;
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
  const [cultOpen, setCultOpen] = useState(false);
  const [activeActivity, setActiveActivity] = useState<number | null>(null);
  const [activityEntry, setActivityEntry] = useState<ActivityEntry>('custom');
  const [poolSelection, setPoolSelection] = useState(0);
  const [activityPrompt, setActivityPrompt] = useState('');
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  const [aiHasConsulted, setAiHasConsulted] = useState(false);
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
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      return window.localStorage.getItem('modoCultiva_auth') === 'true';
    } catch {
      return false;
    }
  });
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
  const [cultInsightPreview, setCultInsightPreview] = useState<{ modeKey: string; level: number; activity: string } | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanKey | null>(null);
  const [cultTab, setCultTab] = useState<CultTab>('insights');
  const [insightSlide, setInsightSlide] = useState(0);
  const [insightRotation, setInsightRotation] = useState(0);
  const [specialistModeFilter, setSpecialistModeFilter] = useState('all');
  const [specialistLanguageFilter, setSpecialistLanguageFilter] = useState('all');
  const [specialistContinentFilter, setSpecialistContinentFilter] = useState('all');
  const [labFlippedCard, setLabFlippedCard] = useState<string | null>(null);
  const [skin, setSkin] = useState<Skin>(() => {
    try {
      const savedSkin = window.localStorage.getItem('modoCultiva_skin');
      return savedSkin && allSkinKeys.has(savedSkin as Skin) ? savedSkin as Skin : 'holista';
    } catch {
      return 'holista';
    }
  });
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
  const [selectedPreset, setSelectedPreset] = useState('');
  const [presetNotice, setPresetNotice] = useState<string | null>(null);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const journeyPanelRef = useRef<HTMLElement | null>(null);
  const journeyReturnScrollTop = useRef(0);

  const restoreJourneyPosition = () => {
    window.requestAnimationFrame(() => {
      journeyPanelRef.current?.scrollTo({ top: journeyReturnScrollTop.current, behavior: 'auto' });
    });
  };

  useEffect(() => {
    try {
      window.localStorage.setItem('modoCultiva_lastState', JSON.stringify(levels));
    } catch {
      // Local persistence is optional for the prototype.
    }
  }, [levels]);

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
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (customizingAvatar) {
        setCustomizingAvatar(false);
      } else if (activeActivity !== null) {
        setActiveActivity(null);
        restoreJourneyPosition();
      } else if (selectedMode) {
        setSelectedMode(null);
        setView('dashboard');
      } else if (view === 'dashboard') {
        setView('welcome');
      } else if (view === 'plans') {
        setSelectedPlan(null);
        setPendingAccess(null);
        setView('login');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeActivity, customizingAvatar, selectedMode, view]);

  const average = useMemo(() => {
    const values = Object.values(levels);
    return (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1);
  }, [levels]);
  const focusedDjMode = modes.find((mode) => mode.key === djFocusedMode) ?? modes[0];
  const isInterfaceSkin = Boolean(skinInfo(skin));

  const definedActivityCount = useMemo(() => selectedMode ? journeyLevels.filter((level) => level < 9 && Boolean(activityDrafts[`${selectedMode.key}-${level}`])).length : 0, [activityDrafts, selectedMode]);
  const personalizedInsights = useMemo(() => {
    const candidates = modes.map((mode) => {
      const currentLevel = levels[mode.key] ?? 0;
      const recommendationLevel = Math.min(currentLevel + 1, 8);
      return globalInsightActivities.find((insight) => insight.modeKey === mode.key && insight.level === recommendationLevel);
    }).filter((insight): insight is (typeof globalInsightActivities)[number] => Boolean(insight));
    const offset = candidates.length ? insightRotation % candidates.length : 0;
    return [...candidates.slice(offset), ...candidates.slice(0, offset)].slice(0, 7);
  }, [levels, insightRotation]);
  const filteredSpecialists = useMemo(() => specialists.filter((specialist) => (
    (specialistModeFilter === 'all' || specialist.modeKey === specialistModeFilter)
    && (specialistLanguageFilter === 'all' || specialist.language === specialistLanguageFilter)
    && (specialistContinentFilter === 'all' || specialist.continent === specialistContinentFilter)
  )), [specialistContinentFilter, specialistLanguageFilter, specialistModeFilter]);

  useEffect(() => {
    if (cultTab !== 'insights' || !cultOpen) return;
    setInsightRotation(Math.floor(Math.random() * Math.max(1, modes.length)));
    setInsightSlide(0);
  }, [cultTab, cultOpen]);

  useEffect(() => {
    if (cultTab !== 'insights' || !cultOpen || personalizedInsights.length < 2) return;
    const timer = window.setInterval(() => setInsightSlide((current) => (current + 1) % personalizedInsights.length), 6500);
    return () => window.clearInterval(timer);
  }, [cultOpen, cultTab, personalizedInsights.length]);

  const updateLevel = (key: string, level: number) => setLevels((current) => ({ ...current, [key]: level }));

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
    if (nextSkin !== 'holista' && !isAuthenticated && view !== 'login') {
      requestAccess(`la skin ${skinInfo(nextSkin)?.name ?? nextSkin}`, nextSkin === 'dj' || skinInfo(nextSkin)?.access === 'gold' ? 'Gold' : 'Ultimate Mode');
      return;
    }
    if (nextSkin !== 'holista' && isAuthenticated && activePlan === 'basic') { requestAccess(`la skin ${skinInfo(nextSkin)?.name ?? nextSkin}`, 'Gold'); return; }
    if (nextSkin !== 'holista' && isAuthenticated && activePlan === 'gold' && nextSkin !== 'dj') { requestAccess(`la skin ${skinInfo(nextSkin)?.name ?? nextSkin}`, 'Ultimate Mode'); return; }
    setSkin(nextSkin);
    try {
      window.localStorage.setItem('modoCultiva_skin', nextSkin);
    } catch {
      // The selected skin remains available for the current session.
    }
  };

  const activateCultSkin = (nextSkin: Skin) => {
    if (!isAuthenticated) {
      requestAccess(`la skin ${skinInfo(nextSkin)?.name ?? (nextSkin === 'dj' ? 'Consola DJ' : nextSkin === 'nocturna' ? 'Night Owl' : nextSkin === 'lucid' ? 'Lucid' : 'Holista')}`, nextSkin === 'dj' || skinInfo(nextSkin)?.access === 'gold' ? 'Gold' : 'Ultimate Mode');
      return;
    }
    if (activePlan === 'basic' && nextSkin !== 'holista') { requestAccess(`la skin ${skinInfo(nextSkin)?.name ?? nextSkin}`, 'Gold'); return; }
    if (activePlan === 'gold' && nextSkin !== 'holista' && nextSkin !== 'dj') { requestAccess(`la skin ${skinInfo(nextSkin)?.name ?? nextSkin}`, 'Ultimate Mode'); return; }
    changeSkin(nextSkin);
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
    setSelectedMode(mode);
    setCultOpen(false);
    setActiveActivity(null);
  };

  const backToDashboard = () => {
    setSelectedMode(null);
    setCultOpen(false);
    setActiveActivity(null);
    setView('welcome');
  };

  const openActivity = (level: number, entry: ActivityEntry = 'custom') => {
    journeyReturnScrollTop.current = journeyPanelRef.current?.scrollTop ?? 0;
    setActiveActivity(level);
    setActivityEntry(entry);
    setPoolSelection(0);
    setActivityPrompt('');
    setAiNotice(null);
    setAiHasConsulted(false);
  };

  const usePoolActivity = () => {
    if (!selectedMode || activeActivity === null) return;
    if (!isAuthenticated) {
      openPlan('basic', 'Pool de Actividades');
      return;
    }
    const activity = getPoolActivities(selectedMode.key, activeActivity)[poolSelection];
    saveActivity(selectedMode.key, activeActivity, activity.title);
  };

  const consultModeAi = () => {
    if (!isAuthenticated) {
      openPlan('gold', 'Modo IA');
      return;
    }
    if (!activityPrompt.trim()) {
      setAiNotice('Escribe primero tu contexto o pregunta para que el Modo IA prepare una propuesta.');
      setAiHasConsulted(false);
      return;
    }
    setAiHasConsulted(true);
    setAiNotice('Modo IA ha preparado una propuesta personalizada para este nivel.');
  };

  const saveModeAiActivity = () => {
    if (!selectedMode || activeActivity === null) return;
    if (!isAuthenticated) {
      openPlan('gold', 'Modo IA');
      return;
    }
    if (!aiHasConsulted) {
      setAiNotice('Consulta primero al Modo IA para generar una propuesta antes de usarla.');
      return;
    }
    saveActivity(selectedMode.key, activeActivity, getAiProposal(selectedMode, activeActivity, activityPrompt));
  };

  const saveGlobalInsightActivity = () => {
    if (!cultInsightPreview) return;
    saveActivity(cultInsightPreview.modeKey, cultInsightPreview.level, cultInsightPreview.activity);
    setCultInsightPreview(null);
    setInsightNotice('Actividad guardada en el journey correspondiente.');
  };

  const requestInsight = (modeKey: string, level: number) => {
    if (!isAuthenticated) {
      setInsightPreview({ modeKey, level });
      return;
    }
    const key = `${modeKey}-${level}`;
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
      setPresetNotice('Escribe un nombre para guardar tu configuración.');
      return;
    }
    const next = { ...presets, [name]: { ...levels } };
    setPresets(next);
    setSelectedPreset(name);
    setPresetName('');
    setPresetNotice(`Preset “${name}” guardado.`);
    try {
      window.localStorage.setItem('modoCultiva_presets', JSON.stringify(next));
    } catch {
      // The preset remains available for the current session.
    }
  };

  const loadPreset = () => {
    if (!selectedPreset || !presets[selectedPreset]) {
      setPresetNotice('Selecciona un preset para cargarlo.');
      return;
    }
    setLevels({ ...defaultLevels, ...presets[selectedPreset] });
    setPresetNotice(`Preset “${selectedPreset}” cargado en tu mapa.`);
  };

  const deletePreset = () => {
    if (!selectedPreset || !presets[selectedPreset]) {
      setPresetNotice('Selecciona un preset para eliminarlo.');
      return;
    }
    const next = { ...presets };
    delete next[selectedPreset];
    setPresets(next);
    setSelectedPreset('');
    setPresetNotice('Preset eliminado.');
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

  const renderCultSection = () => {
    const promotedInsight = personalizedInsights[insightSlide] ?? personalizedInsights[0];
    const promotedMode = (promotedInsight ? modes.find((mode) => mode.key === promotedInsight.modeKey) : undefined) ?? modes[0]!;
    return <section className="cult-embedded" aria-labelledby="cult-embedded-title">
    <div className="cult-embedded-heading"><div><p className="kicker">The Cult · ULTIMATE MODE</p><h3 id="cult-embedded-title">Tu cultivo, conectado al mundo.</h3></div><span className="cult-live-pill"><i /> ULTIMATE ACCESS</span></div>
    <nav className="cult-nav cult-nav--embedded" aria-label="Secciones de The Cult">{([['insights', 'Insights Globales'], ['network', 'Red de Especialistas'], ['skins', 'Galería de Skins & Filtros']] as [CultTab, string][]).map(([tab, label]) => <button className={cultTab === tab ? 'cult-nav-button cult-nav-button--active' : 'cult-nav-button'} type="button" key={tab} onClick={() => setCultTab(tab)}>{label}<span>↗</span></button>)}</nav>
    <div className="cult-embedded-content">
      {cultTab === 'insights' && <><div className="cult-section-heading"><div><p className="kicker">Actividades compartidas por la comunidad</p><h4>Insights Globales</h4></div><span className="cult-live-pill"><i /> 7 RECOMENDACIONES</span></div><p className="cult-section-copy">Recomendaciones seleccionadas para ayudarte a avanzar desde los niveles actuales de tu mapa. Cada visita muestra una combinación diferente.</p>{insightNotice && <div className="insight-notice" role="status">✦ {insightNotice}<button type="button" onClick={() => setInsightNotice(null)} aria-label="Cerrar aviso">×</button></div>}{promotedInsight && <article className="cult-insight-spotlight" style={{ '--insight-color': promotedMode.color } as CSSProperties}><div className="cult-insight-spotlight-art"><span>{promotedMode.icon}</span><small>INSIGHT GLOBAL · {insightSlide + 1}/7</small></div><div className="cult-insight-spotlight-copy"><div className="cult-insight-activity-top"><span>{promotedMode.name} · NIVEL {promotedInsight.level} → {promotedInsight.level + 1}</span><small>{effortLabelByLevel[promotedInsight.level]}</small></div><h3>{promotedInsight.activity}</h3><p>Compartida por <strong>{promotedInsight.author}</strong> · {promotedInsight.location}</p><button type="button" onClick={() => setCultInsightPreview(promotedInsight)}>Analizar y guardar en mi mapa <span>↗</span></button></div><div className="cult-insight-dots" aria-label="Navegar insights">{personalizedInsights.map((insight, index) => <button className={index === insightSlide ? 'is-active' : ''} key={`${insight.modeKey}-${insight.level}`} type="button" onClick={() => setInsightSlide(index)} aria-label={`Ver recomendación ${index + 1}`} />)}</div></article>}</>}
      {cultTab === 'network' && <><div className="cult-section-heading"><div><p className="kicker">Red de Especialistas</p><h4>Encuentra a tu siguiente guía.</h4></div><span className="cult-live-pill cult-live-pill--gold"><i /> PERFILES VERIFICADOS</span></div><div className="cult-filter-row"><select aria-label="Filtrar por modo" value={specialistModeFilter} onChange={(event) => setSpecialistModeFilter(event.target.value)}><option value="all">Todos los modos</option>{modes.map((mode) => <option key={mode.key} value={mode.key}>{mode.name}</option>)}</select><select aria-label="Filtrar por idioma" value={specialistLanguageFilter} onChange={(event) => setSpecialistLanguageFilter(event.target.value)}><option value="all">Cualquier idioma</option>{Array.from(new Set(specialists.map((specialist) => specialist.language))).map((language) => <option key={language} value={language}>{language}</option>)}</select><select aria-label="Filtrar por ubicación" value={specialistContinentFilter} onChange={(event) => setSpecialistContinentFilter(event.target.value)}><option value="all">Cualquier continente</option>{Array.from(new Set(specialists.map((specialist) => specialist.continent))).map((continent) => <option key={continent} value={continent}>{continent}</option>)}</select></div><div className="cult-specialist-list">{filteredSpecialists.length ? filteredSpecialists.map((specialist) => { const mode = modes.find((item) => item.key === specialist.modeKey)!; return <article key={specialist.name}><div className="cult-specialist-avatar">{specialist.name.slice(0, 1)}</div><div className="cult-specialist-copy"><strong>{specialist.name} <span>✓</span></strong><small>{mode.name} · {specialist.specialty}</small><p>Disponible para orientación privada · {specialist.location}</p></div><div className="cult-match"><span>{specialist.match}</span><small>{specialist.language} · {specialist.continent}</small></div><button type="button">Ver perfil ↗</button></article>; }) : <div className="cult-empty-state">No hay especialistas con estos filtros. Prueba otra combinación.</div>}</div></>}
      {cultTab === 'skins' && <><div className="cult-section-heading"><div><p className="kicker">Identidad en movimiento</p><h4>Cambia la piel de tu cultivo.</h4></div><span className="cult-live-pill"><i /> EXPERIENCIAS</span></div><section className="cult-skin-category" aria-labelledby="cult-filters-title"><div className="cult-skin-category-heading"><div><p className="kicker">Paletas de atmósfera</p><h5 id="cult-filters-title">Filtros</h5></div><span>2 EXPERIENCIAS</span></div><div className="cult-skin-grid cult-skin-grid--filters"><article className={`cult-skin-card${skin === 'nocturna' ? ' cult-skin-card--active' : ''}`}><div className="cult-skin-visual cult-skin-visual--nocturna"><span className="skin-card-glyph skin-card-glyph--owl" aria-hidden="true">🦉</span></div><div><strong>Night Owl</strong><p>Un refugio de sombras para cultivar como un búho nocturno.</p><button type="button" onClick={() => activateCultSkin('nocturna')}>{skin === 'nocturna' ? 'Activa ahora ✓' : 'Activar filtro ↗'}</button></div></article><article className={`cult-skin-card cult-skin-card--lucid${skin === 'lucid' ? ' cult-skin-card--active' : ''}`}><div className="cult-skin-visual cult-skin-visual--lucid"><span className="skin-card-glyph skin-card-glyph--dream" aria-hidden="true">◌</span></div><div><strong>Lucid</strong><p>Un sueño lúcido de color, contraste y percepción expandida.</p><button type="button" onClick={() => activateCultSkin('lucid')}>{skin === 'lucid' ? 'Activa ahora ✓' : 'Activar filtro ↗'}</button></div></article></div></section><section className="cult-skin-category" aria-labelledby="cult-skins-title"><div className="cult-skin-category-heading"><div><p className="kicker">Interfaces completas</p><h5 id="cult-skins-title">Skins</h5></div><span>{skinCatalog.length + 2} EXPERIENCIAS</span></div><div className="cult-skin-grid cult-skin-grid--skins"><article className={`cult-skin-card${skin === 'holista' ? ' cult-skin-card--active' : ''}`}><div className="cult-skin-visual cult-skin-visual--holista"><span>◌</span></div><div><strong>Holista</strong><p>La raíz original de Modo Cultiva.</p><button type="button" onClick={() => activateCultSkin('holista')}>{skin === 'holista' ? 'Activa ahora ✓' : 'Activar skin ↗'}</button></div></article><article className={`cult-skin-card${skin === 'dj' ? ' cult-skin-card--active' : ''}`}><div className="cult-skin-visual cult-skin-visual--dj"><span className="skin-card-glyph skin-card-glyph--faders" aria-hidden="true"><i /><i /><i /></span></div><div><strong>Consola DJ</strong><p>La mezcla perfecta para ecualizar la canción de tu vida.</p><button type="button" onClick={() => activateCultSkin('dj')}>{skin === 'dj' ? 'Activa ahora ✓' : 'Activar skin ↗'}</button></div></article>{skinCatalog.map((item) => <article className={`cult-skin-card cult-skin-card--${item.key}${skin === item.key ? ' cult-skin-card--active' : ''}`} key={item.key}><div className={`cult-skin-visual cult-skin-visual--${item.key}`}><span>{item.icon}</span></div><div><strong>{item.name}</strong><p>{item.description}</p><button type="button" onClick={() => activateCultSkin(item.key)}>{skin === item.key ? 'Activa ahora ✓' : 'Activar skin ↗'}</button></div></article>)}</div></section></>}
    </div>
  </section>;
  };

  return (
    <main className={`app-shell app-shell--${skin}`}>
      <header className="topbar">
        <a className="brand" href="/" aria-label="Modo Cultiva, inicio">
          <img src={logo} alt="Modo Cultiva" />
          <span>Modo Cultiva</span>
        </a>
        <div className="topbar-meta"><span className="live-dot" /> MODO CULTIVA <span className="meta-divider" /> 12 MODOS DE VIDA</div>
        <div className="profile-menu"><button className="profile-button" type="button" aria-label="Abrir perfil" aria-expanded={profileMenuOpen} aria-haspopup="menu" onClick={() => setProfileMenuOpen((open) => !open)}>MC</button>{profileMenuOpen && <div className="profile-menu-dropdown" role="menu">{isAuthenticated ? <button type="button" role="menuitem" onClick={() => { setProfileMenuOpen(false); setIsAuthenticated(false); window.localStorage.removeItem('modoCultiva_auth'); setSelectedMode(null); setCultOpen(false); setActiveActivity(null); setPendingAccess(null); setView('welcome'); }}>Cerrar Sesión</button> : <button type="button" role="menuitem" onClick={() => { setProfileMenuOpen(false); setPendingAccess(null); setView('login'); }}>Iniciar Sesión</button>}<button type="button" role="menuitem" onClick={() => { setProfileMenuOpen(false); setPendingAccess(null); setSelectedPlan(null); setView('plans'); }}>Modos Premium</button></div>}</div>
      </header>

      {view === 'login' ? (
        <section className="login-view" data-layer="0" aria-labelledby="login-title">
          <div className="login-card">
            <div className="login-brand"><img src={logo} alt="Modo Cultiva" /><span>Modo Cultiva</span></div>
            <p className="kicker">{pendingAccess ? 'Acceso contextual' : 'Tu mapa de vida comienza aquí'}</p>
            <h1 id="login-title">{pendingAccess ? 'Desbloquea esta función.' : 'Entra a tu espacio.'}</h1>
            <p className="login-copy">{pendingAccess ? `${pendingAccess.feature} forma parte del plan ${pendingAccess.plan}. Crea tu cuenta o inicia sesión para continuar.` : 'Inicia sesión para guardar tu progreso y continuar cultivando tus 12 modos de vida.'}</p>
            <div className="login-skin-picker" aria-label="Elige tu skin de inicio"><span>ELIGE TU SKIN</span><button className={skin === 'holista' ? 'login-skin login-skin--active' : 'login-skin'} type="button" onClick={() => changeSkin('holista')}><i>◌</i> Modo Holista</button><label className={`login-skin-select${skin !== 'holista' ? ' login-skin-select--active' : ''}`}><small>Más skins según tu plan</small><select value={skin === 'holista' ? '' : skin} onChange={(event) => { if (event.target.value) changeSkin(event.target.value as Skin); }} aria-label="Seleccionar skin disponible"><option value="" disabled>Selecciona otra skin…</option><option value="dj">Consola DJ · Gold</option>{skinCatalog.map((item) => <option key={item.key} value={item.key} disabled={activePlan === 'basic' || (activePlan === 'gold' && item.access !== 'gold')}>{item.name} · {item.access === 'gold' ? 'Gold' : 'Ultimate'}</option>)}</select></label></div>
            <form className="login-form" onSubmit={(event) => { event.preventDefault(); const destination = pendingAccess?.returnView ?? 'welcome'; const nextActivity = pendingActivity; setIsAuthenticated(true); window.localStorage.setItem('modoCultiva_auth', 'true'); setPendingAccess(null); setPendingActivity(null); if (nextActivity) { setActivityEntry(nextActivity.entry); setActiveActivity(nextActivity.level); setPoolSelection(0); setActivityPrompt(''); } setView(destination); }}>
              <label htmlFor="login-username">Usuario<input id="login-username" autoComplete="username" value={loginUsername} onChange={(event) => setLoginUsername(event.target.value)} placeholder="Tu usuario" /></label>
              <label htmlFor="login-password">Contraseña<input id="login-password" type="password" autoComplete="current-password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} placeholder="Tu contraseña" /></label>
              <button className="login-submit" type="submit">Iniciar sesión <span>↗</span></button>
            </form>
            <small className="login-prototype-note">Acceso prototipo · tus datos se conectarán próximamente</small>
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
          <div className="modo-lab-topline"><button className="modo-lab-back" type="button" onClick={() => setView('welcome')}>← Volver al mapa</button><span className="modo-lab-free"><i /> ACCESO LIBRE</span><span className="modo-lab-mark">MODO TRIVIA · 12 FICHAS</span></div>
          <header className="modo-lab-hero"><div><p className="kicker">Modo Trivia · Aprende jugando</p><h1 id="modo-lab-title">Una pregunta puede abrir un modo.</h1><p>Explora los 12 modos de vida con tarjetas interactivas. Piensa primero, voltea después y descubre qué cultiva cada dimensión de tu vida.</p></div><div className="modo-lab-orbit"><span>✦</span><small>12<br />MODOS</small></div></header>
          <div className="modo-lab-guide"><span>01</span><p>Lee la pregunta, responde desde tu experiencia y voltea la tarjeta para conocer el modo.</p><span>ACCESO LIBRE · SIN CUENTA</span></div>
          <div className="modo-lab-grid">{modes.map((mode) => { const flipped = labFlippedCard === mode.key; const card = labCards[mode.key]; return <article className={`modo-lab-card${flipped ? ' modo-lab-card--flipped' : ''}`} key={mode.key} style={{ '--lab-color': mode.color, '--lab-accent': mode.accent } as CSSProperties}><div className="modo-lab-card-inner"><div className="modo-lab-face modo-lab-front"><div className="modo-lab-card-top"><span>{mode.roman}</span><small>FICHA {mode.roman}</small></div><div className="modo-lab-icon">{mode.icon}</div><p className="modo-lab-label">PREGUNTA</p><h2>{card.question}</h2><p className="modo-lab-mode">{mode.name}</p><button type="button" onClick={() => setLabFlippedCard(flipped ? null : mode.key)}>Voltear tarjeta <span>↗</span></button></div><div className="modo-lab-face modo-lab-back"><div className="modo-lab-card-top"><span>↺</span><small>DESCUBRIMIENTO</small></div><p className="modo-lab-label">INFORMACIÓN DEL MODO</p><h2>{mode.name}</h2><p className="modo-lab-answer">{card.answer}</p><div className="modo-lab-description"><span>{mode.icon}</span>{mode.description}</div><button type="button" onClick={() => setLabFlippedCard(null)}>Volver a la pregunta <span>↺</span></button></div></div></article>; })}</div>
        </section>
      ) : view === 'cult' ? (
        <section className="cult-view" data-layer="6" aria-labelledby="cult-title">
          <div className="cult-topline"><button className="cult-exit" type="button" onClick={() => setView('plans')}>← Modos Premium</button><span className="cult-access"><i /> ULTIMATE ACCESS · THE CULT</span><span className="cult-layer-mark">LAYER 6</span></div>
          <header className="cult-hero"><div><p className="kicker">The Cult · ULTIMATE MODE</p><h1 id="cult-title">Tu cultivo, conectado al mundo.</h1><p>El espacio premium donde tu mapa de vida se encuentra con inteligencia, comunidad y especialistas.</p></div><div className="cult-orbit-mark"><span>∞</span><small>FULL<br />ACCESS</small></div></header>
          <nav className="cult-nav" aria-label="Secciones de The Cult">{([['home', 'Centro de Mando'], ['insights', 'Insights Globales'], ['network', 'Red de Especialistas'], ['skins', 'Galería de Skins & Filtros']] as [CultTab, string][]).map(([tab, label]) => <button className={cultTab === tab ? 'cult-nav-button cult-nav-button--active' : 'cult-nav-button'} type="button" key={tab} onClick={() => setCultTab(tab)}>{label}<span>↗</span></button>)}</nav>
          <div className="cult-layout"><main className="cult-main">
            {cultTab === 'home' && <><div className="cult-section-heading"><div><p className="kicker">Panel ULTIMATE MODE</p><h2>Todo tu potencial, en un solo nodo.</h2></div><span className="cult-live-pill"><i /> LIVE NETWORK</span></div><div className="cult-metric-grid"><article className="cult-metric cult-metric--wide"><span className="cult-metric-icon">✦</span><div><small>MODO IA · USO JUSTO</small><strong>Sin límites artificiales</strong><p>Contextualiza, consulta y establece actividades con una inteligencia que entiende tus 12 modos.</p></div><b>∞</b></article><article className="cult-metric"><small>INSIGHTS</small><strong>Global</strong><p>Conecta con estrategias de cultivo más allá de tu círculo.</p><span className="cult-metric-line" /></article><article className="cult-metric"><small>PROFESSIONAL</small><strong>Verified</strong><p>Encuentra orientación de especialistas por modo.</p><span className="cult-metric-line cult-metric-line--gold" /></article></div><div className="cult-feature-grid"><article><span>01 · TU RED</span><h3>Cultiva acompañado.</h3><p>Descubre recomendaciones comunitarias y comparte presets con tu red de apoyo.</p><button type="button" onClick={() => setCultTab('insights')}>Explorar Insights <span>→</span></button></article><article><span>02 · TU PRÓXIMO NIVEL</span><h3>Habla con experiencia.</h3><p>Solicita orientación privada y sigue el progreso de las recomendaciones profesionales.</p><button type="button" onClick={() => setCultTab('network')}>Encontrar especialistas <span>→</span></button></article></div></>}
            {cultTab === 'insights' && <><div className="cult-section-heading"><div><p className="kicker">Actividades compartidas por la comunidad</p><h2>Insights Globales.</h2></div><span className="cult-live-pill"><i /> {globalInsightActivities.length} ACTIVIDADES</span></div><p className="cult-section-copy">Descubre las prácticas que otras personas han realizado para avanzar de un nivel al siguiente en cada Modo. Abre una tarjeta para analizarla y guardarla en tu journey.</p>{insightNotice && <div className="insight-notice" role="status">✦ {insightNotice}<button type="button" onClick={() => setInsightNotice(null)} aria-label="Cerrar aviso">×</button></div>}<div className="cult-insight-grid">{globalInsightActivities.map((insight) => { const mode = modes.find((item) => item.key === insight.modeKey)!; return <article className="cult-insight-activity" key={`${insight.modeKey}-${insight.level}`} style={{ '--insight-color': mode.color } as CSSProperties}><div className="cult-insight-activity-top"><span>{mode.icon} {mode.name}</span><small>NIVEL {insight.level} → {insight.level + 1}</small></div><h3>{insight.activity}</h3><button type="button" onClick={() => setCultInsightPreview(insight)}>Analizar actividad <span>↗</span></button></article>; })}</div></>}
            {cultTab === 'network' && <><div className="cult-section-heading"><div><p className="kicker">Professional Insights</p><h2>Encuentra a tu siguiente guía.</h2></div><span className="cult-live-pill cult-live-pill--gold"><i /> PERFILES VERIFICADOS</span></div><div className="cult-filter-row"><select aria-label="Filtrar por modo"><option>Todos los modos</option>{modes.map((mode) => <option key={mode.key}>{mode.name}</option>)}</select><select aria-label="Filtrar por idioma"><option>Cualquier idioma</option><option>Español</option><option>English</option><option>Português</option><option>Français</option><option>Italiano</option><option>Deutsch</option><option>Nederlands</option><option>中文 · Chino</option><option>日本語 · Japonés</option><option>한국어 · Coreano</option><option>العربية · Árabe</option><option>हिन्दी · Hindi</option><option>Русский · Ruso</option></select><select aria-label="Filtrar por ubicación"><option>Cualquier continente</option><option>América del Norte</option><option>América Central</option><option>América del Sur</option><option>Europa</option><option>Asia</option><option>África</option><option>Oceanía</option><option>Antártida</option></select></div><div className="cult-specialist-list">{[['Sofía Méndez', 'Modo Profesional', 'Estrategia y liderazgo', 'Ciudad de México', '98%'], ['Marcus Lee', 'Modo Financiero', 'Patrimonio y decisiones', 'Austin · Remote', '96%'], ['Elena Costa', 'Modo Emocional', 'Vínculos y regulación', 'Lisboa · Remote', '99%']].map(([name, mode, specialty, location, match]) => <article key={name}><div className="cult-specialist-avatar">{name.slice(0, 1)}</div><div className="cult-specialist-copy"><strong>{name} <span>✓</span></strong><small>{mode} · {specialty}</small><p>Disponible para orientación privada · {location}</p></div><div className="cult-match"><span>{match}</span><small>match</small></div><button type="button">Ver perfil ↗</button></article>)}</div></>}
            {cultTab === 'skins' && <><div className="cult-section-heading"><div><p className="kicker">Identidad en movimiento</p><h2>Cambia la piel de tu cultivo.</h2></div><span className="cult-live-pill"><i /> {skinCatalog.length + 4} DISPONIBLES</span></div><section className="cult-skin-category" aria-labelledby="cult-filters-title"><div className="cult-skin-category-heading"><div><p className="kicker">Paletas de atmósfera</p><h3 id="cult-filters-title">Filtros</h3></div><span>2 EXPERIENCIAS</span></div><div className="cult-skin-grid cult-skin-grid--filters"><article className={`cult-skin-card${skin === 'nocturna' ? ' cult-skin-card--active' : ''}`}><div className="cult-skin-visual cult-skin-visual--nocturna"><span className="skin-card-glyph skin-card-glyph--owl" aria-hidden="true">🦉</span></div><div><strong>Night Owl</strong><p>Un refugio de sombras para cultivar como un búho nocturno.</p><button type="button" onClick={() => activateCultSkin('nocturna')}>{skin === 'nocturna' ? 'Activa ahora ✓' : 'Activar filtro ↗'}</button></div></article><article className={`cult-skin-card cult-skin-card--lucid${skin === 'lucid' ? ' cult-skin-card--active' : ''}`}><div className="cult-skin-visual cult-skin-visual--lucid"><span className="skin-card-glyph skin-card-glyph--dream" aria-hidden="true">◌</span></div><div><strong>Lucid</strong><p>Un sueño lúcido de color, contraste y percepción expandida.</p><button type="button" onClick={() => activateCultSkin('lucid')}>{skin === 'lucid' ? 'Activa ahora ✓' : 'Activar filtro ↗'}</button></div></article></div></section><section className="cult-skin-category" aria-labelledby="cult-skins-title"><div className="cult-skin-category-heading"><div><p className="kicker">Interfaces completas</p><h3 id="cult-skins-title">Skins</h3></div><span>{skinCatalog.length + 2} EXPERIENCIAS</span></div><div className="cult-skin-grid cult-skin-grid--skins"><article className={`cult-skin-card${skin === 'holista' ? ' cult-skin-card--active' : ''}`}><div className="cult-skin-visual cult-skin-visual--holista"><span>◌</span></div><div><strong>Holista</strong><p>La raíz original de Modo Cultiva.</p><button type="button" onClick={() => activateCultSkin('holista')}>{skin === 'holista' ? 'Activa ahora ✓' : 'Activar skin ↗'}</button></div></article><article className={`cult-skin-card${skin === 'dj' ? ' cult-skin-card--active' : ''}`}><div className="cult-skin-visual cult-skin-visual--dj"><span className="skin-card-glyph skin-card-glyph--faders" aria-hidden="true"><i /><i /><i /></span></div><div><strong>Consola DJ</strong><p>La mezcla perfecta para ecualizar la canción de tu vida.</p><button type="button" onClick={() => activateCultSkin('dj')}>{skin === 'dj' ? 'Activa ahora ✓' : 'Activar skin ↗'}</button></div></article>{skinCatalog.map((item) => <article className={`cult-skin-card cult-skin-card--${item.key}${skin === item.key ? ' cult-skin-card--active' : ''}`} key={item.key}><div className={`cult-skin-visual cult-skin-visual--${item.key}`}><span>{item.icon}</span></div><div><strong>{item.name}</strong><p>{item.description}</p><button type="button" onClick={() => activateCultSkin(item.key)}>{skin === item.key ? 'Activa ahora ✓' : 'Activar skin ↗'}</button></div></article>)}</div></section></>}
          </main><aside className="cult-rail"><div className="cult-status-card"><span className="cult-status-label">TU ESTATUS</span><div className="cult-badge">U</div><h3>ULTIMATE MODE</h3><p>Acceso completo a The Cult</p><div className="cult-status-rule" /><span className="cult-status-label">TU RED</span><strong>24 conexiones</strong><small>+6 esta semana</small></div><div className="cult-rail-card"><span className="cult-status-label">PRÓXIMO EN TU RUTA</span><strong>Modo Visionario</strong><p>3 recomendaciones esperan tu revisión.</p><button type="button" onClick={() => setCultTab('insights')}>Ver recomendaciones →</button></div><div className="cult-quote">“No cultivas una sola versión de ti.<br /><strong>Cultivas todas.</strong>”</div></aside></div>
        </section>
      ) : view === 'welcome' ? (
        <section className={`welcome-view${skin === 'dj' ? ' welcome-view--dj' : ''}`} data-layer="1" aria-labelledby="welcome-title">
          {isInterfaceSkin && <section className={`skin-interface skin-interface--${skin}`} aria-label={`${skinInfo(skin)?.name} overview`}><div className="skin-interface-orbit"><span>{skinInfo(skin)?.icon}</span><small>12 MODOS<br />ENFOCADOS</small></div><div><p className="kicker">{skinInfo(skin)?.name} · MAPA DE VIDA</p><h1>{skinInfo(skin)?.signature}</h1><p>{skinInfo(skin)?.description}</p><div className="skin-interface-grid">{modes.slice(0, 4).map((mode) => <article key={mode.key}><span>{mode.icon}</span><strong>{mode.shortName}</strong><small>NIVEL {levels[mode.key]}</small></article>)}</div><button className="skin-interface-entry" type="button" onClick={() => setView('dashboard')}>Entrar a mi mapa <span>↗</span></button></div></section>}
          {skin === 'dj' && <section className="dj-console" aria-labelledby="dj-console-title">
            <div className="dj-console-top"><div><p className="kicker">Consola de presencia</p><h1 id="dj-console-title">Cultiva todos tus modos.</h1><p className="intro-copy">MODO CULTIVA ACTIVADO · 12 CANALES DE VIDA ENERGIZADOS</p></div><div className="dj-profile-entry"><button className={profileImage ? 'dj-profile-button dj-profile-button--with-photo' : 'dj-profile-button'} style={profileImage ? { backgroundImage: `linear-gradient(180deg, rgba(4, 18, 29, .08), rgba(4, 18, 29, .82)), url(${profileImage})` } : undefined} type="button" onClick={() => setView('dashboard')} aria-label={`Presiona para entrar al Dashboard de ${profileName}`}><span className="dj-profile-fallback">{profileImage ? '' : profileName.slice(0, 1).toUpperCase()}</span><span className="dj-profile-copy"><strong>{profileName}</strong><span className="profile-badge">{defaultUserProfile.role}</span><small>Presiona para Entrar <b>↗</b></small></span></button><label className="dj-profile-upload" title="Cambiar foto de perfil"><input type="file" accept="image/*" onChange={(event) => handleProfileImage(event.target.files?.[0])} /><span>＋</span></label></div></div>
            <div className="dj-console-screen"><span>SESIÓN PERSONAL · {profileName.toUpperCase()}</span><strong>12 MODOS DE VIDA</strong><i /></div>
            <div className="dj-control-strip"><span>SEÑAL / MASTER</span><i className="dj-decor-knob" /><i className="dj-decor-knob" /><button type="button">SYNC</button><button type="button">FX</button><button type="button">MONITOR</button><button type="button">AIR</button></div>
            <div className="dj-readout-panel"><span>CANAL ACTIVO · {focusedDjMode.name.toUpperCase()}</span><strong>NIVEL {levels[focusedDjMode.key]} · {levelNames[levels[focusedDjMode.key]]}</strong><p>{levelDescriptions[levels[focusedDjMode.key]]}</p></div>
            <div className="dj-channel-deck">{modes.map((mode) => { const level = levels[mode.key]; const litSegments = Math.max(1, Math.ceil(((level + 1) / 10) * 10)); return <article className="dj-channel" key={mode.key} style={{ '--mode-color': mode.color, '--mode-accent': mode.accent } as CSSProperties}><div className="dj-channel-head"><span>{mode.roman}</span><strong>{mode.icon} {mode.shortName}</strong><small>{level}/9</small></div><div className="dj-knob-bank" aria-hidden="true"><i className="dj-knob" /><i className="dj-knob" /><i className="dj-knob" /></div><div className="dj-led-meter" aria-hidden="true">{Array.from({ length: 10 }, (_, index) => <i className={index < litSegments ? 'dj-led dj-led--on' : 'dj-led'} key={index} />)}</div><div className="dj-fader-wrap"><span>9</span><input className="dj-fader" aria-label={`Nivel de ${mode.name}`} type="range" min="0" max="9" value={level} onFocus={() => setDjFocusedMode(mode.key)} onChange={(event) => { setDjFocusedMode(mode.key); updateLevel(mode.key, Number(event.target.value)); }} /><span>0</span></div><span className="dj-cable" aria-hidden="true" /><button className="dj-channel-open" type="button" onClick={() => openMode(mode)}>Abrir modo ↗</button></article>; })}</div>
            <div className="dj-console-footer"><span>FADERS DE PRESENCIA · AJUSTE EN TIEMPO REAL</span><span>FOTO DE PERFIL · ENTRADA AL DASHBOARD</span></div>
          </section>}
          <div className={skin === 'dj' || isInterfaceSkin ? 'holista-overview-content holista-overview-content--hidden' : 'holista-overview-content'}>
          <div className="welcome-copy">
            <p className="kicker">Bienvenido a tu mapa de vida</p>
            <h1 id="welcome-title">Cultiva todos tus modos.</h1>
            <p className="intro-copy">Una vista completa para recordar las áreas que te hacen ser tú. Observa tu equilibrio, elige dónde poner presencia y entra a tu dashboard cuando quieras profundizar.</p>
          </div>
          <div className="overview-stage" aria-label="Overview de tus 12 modos de vida">
            <div className="overview-orbit overview-orbit--outer" />
            <div className="overview-orbit overview-orbit--inner" />
            {modes.map((mode, index) => (
              <button className="overview-mode" key={mode.key} type="button" onClick={() => openMode(mode)} style={{ '--mode-color': mode.color, '--mode-accent': mode.accent, '--mode-angle': `${index * 30}deg` } as CSSProperties} aria-label={`${mode.name}, nivel ${levels[mode.key]}`}>
                <span className="overview-mode-icon">{mode.icon}</span><span className="overview-mode-name">{mode.shortName}</span><strong>{levels[mode.key]}</strong>
              </button>
            ))}
            <div className="overview-person">
              <button className={profileImage ? 'overview-core overview-core--with-photo' : 'overview-core'} style={profileImage ? { backgroundImage: `linear-gradient(180deg, rgba(4, 18, 29, .18), rgba(4, 18, 29, .74)), url(${profileImage})` } : undefined} type="button" onClick={() => setView('dashboard')} aria-label={`Presiona para entrar al Dashboard de ${profileName}`}>
                <span className="overview-photo-content"><strong>{profileName}</strong><span className="profile-badge">{defaultUserProfile.role}</span></span>
                <span className="overview-enter-prompt">Presiona para Entrar <b>↗</b></span>
              </button>
              <div className="overview-person-actions">
                <button className="avatar-customize" type="button" onClick={(event) => { event.stopPropagation(); setCustomizingAvatar(true); }}>✦ Personalizar</button>
              </div>
            </div>
          </div>
          </div>
          <section className="preset-panel preset-panel--overview" aria-labelledby="presets-title">
            <div className="preset-copy"><p className="kicker">Configuraciones guardadas</p><h2 id="presets-title">Presets</h2><p>Guarda y recupera combinaciones de niveles para explorar distintos mapas de presencia.</p></div>
            <div className="preset-controls">
              <label htmlFor="preset-name">Nuevo preset<input id="preset-name" value={presetName} onChange={(event) => setPresetName(event.target.value)} placeholder="Ej. Mi equilibrio" /></label>
              <button className="preset-action preset-action--primary" type="button" onClick={savePreset}>Guardar</button>
              <label htmlFor="preset-select">Presets guardados<select id="preset-select" value={selectedPreset} onChange={(event) => setSelectedPreset(event.target.value)}><option value="">— Selecciona un preset —</option>{Object.keys(presets).map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
              <button className="preset-action" type="button" onClick={loadPreset}>Cargar</button><button className="preset-action preset-action--danger" type="button" onClick={deletePreset}>Eliminar</button>
            </div>
            {presetNotice && <p className="preset-notice" role="status">{presetNotice}</p>}
          </section>
        </section>
      ) : (
      <>
      <section className="intro" data-layer="2" aria-labelledby="dashboard-title">
        <button className="back-to-overview dashboard-back" type="button" onClick={() => setView('welcome')}>← Volver al overview</button>
        <div>
          <p className="kicker">Tu consola de presencia</p>
          <h1 id="dashboard-title">¿En qué modo estás cultivando hoy?</h1>
          <p className="intro-copy">Visualiza el estado de tus 12 modos. Entra a cada journey para reconocer dónde estás y elegir qué quieres cultivar.</p>
        </div>
        <div className="score-orbit" aria-label={`Promedio general ${average} de 9`}>
          <span>promedio</span><strong>{average}</strong><small>/ 9</small>
        </div>
      </section>

      <section className="dashboard-tools" aria-label="Resumen de tu mapa">
        <div className="tool-title"><span className="pulse-icon">⌁</span><div><strong>MAPA DE MODOS</strong><span>Tu nivel actual por área de vida</span></div></div>
        <div className="tool-stat"><span className="stat-label">Activo ahora</span><strong>—</strong><span className="stat-hint">Elige un modo para comenzar</span></div>
        <div className="tool-stat"><span className="stat-label">Modo más fuerte</span><strong>{modes.reduce((best, mode) => levels[mode.key] > levels[best.key] ? mode : best, modes[0]).shortName}</strong><span className="stat-hint">Nivel {Math.max(...Object.values(levels))}</span></div>
        <div className="tool-stat"><span className="stat-label">Modo menos cultivado</span><strong>{modes.reduce((least, mode) => levels[mode.key] < levels[least.key] ? mode : least, modes[0]).shortName}</strong><span className="stat-hint">Nivel {Math.min(...Object.values(levels))}</span></div>
        <div className="api-badge" role="status"><span className={`status-dot status-dot--${apiState.status}`} />{apiState.status === 'success' ? 'Sincronización lista' : apiState.status === 'loading' ? 'Conectando…' : 'Modo offline'}</div>
      </section>

      <section className="mode-grid" aria-label="Tus 12 modos de vida">
        {modes.map((mode, index) => {
          const level = levels[mode.key];
          return (
            <article className="mode-card" key={mode.key} style={{ '--mode-color': mode.color, '--mode-accent': mode.accent } as CSSProperties}>
              <button className="card-entry" type="button" onClick={() => openMode(mode)} aria-label={`Entrar al journey de ${mode.name}`}>
                <span className="card-number">{mode.roman}</span><span className="card-arrow">↗</span>
                <span className="mode-icon" aria-hidden="true">{mode.icon}</span>
                <span className="mode-card-title">{mode.name}</span>
                <span className="mode-card-description">{mode.description}</span>
                <span className="level-row"><span>NIVEL ACTUAL</span><strong>{level}<small>/9</small></strong></span>
                <span className="level-track"><span style={{ width: `${(level / 9) * 100}%` }} /></span>
              </button>
              <label className="visually-hidden" htmlFor={`level-${mode.key}`}>Nivel de {mode.name}</label>
              <input id={`level-${mode.key}`} className="level-slider" type="range" min="0" max="9" value={level} onChange={(event) => updateLevel(mode.key, Number(event.target.value))} />
            </article>
          );
        })}
      </section>

      <footer className="dashboard-footer"><span className="footer-tip">Arrastra los niveles para actualizar tu mapa</span><span><i /> PROTOTIPO · DATOS GUARDADOS EN ESTE NAVEGADOR</span></footer>
      </>
      )}

      {selectedPlan && <div className="feature-preview-backdrop" role="presentation" onClick={() => setSelectedPlan(null)}><section className="plan-detail-modal" role="dialog" aria-modal="true" aria-labelledby="plan-detail-title" onClick={(event) => event.stopPropagation()}><button className="close-journey" type="button" onClick={() => setSelectedPlan(null)} aria-label="Cerrar detalles del plan">×</button><p className="kicker">Detalles del plan</p><h2 id="plan-detail-title">{planDetails[selectedPlan].name}</h2><strong className="plan-detail-price">{planDetails[selectedPlan].price}</strong><p className="plan-detail-promise">{planDetails[selectedPlan].promise}</p><ul className="plan-detail-list">{planDetails[selectedPlan].features.map((feature) => <li key={feature}>{feature}</li>)}</ul>{selectedPlan === 'ultimate' && <button className="feature-preview-cta cult-entry-cta" type="button" onClick={() => { setSelectedPlan(null); setPendingAccess(null); setCultTab('insights'); setSelectedMode(modes[0]); setCultOpen(true); setView('dashboard'); }}>Abrir The Cult <span>✦</span></button>}<button className="feature-preview-dismiss" type="button" onClick={() => setSelectedPlan(null)}>Volver a Modos Premium</button></section></div>}

      {insightPreview && <div className="feature-preview-backdrop" role="presentation" onClick={() => setInsightPreview(null)}><section className="feature-preview" role="dialog" aria-modal="true" aria-labelledby="insight-preview-title" onClick={(event) => event.stopPropagation()}><button className="close-journey" type="button" onClick={() => setInsightPreview(null)} aria-label="Cerrar vista previa">×</button><p className="kicker">Vista previa · Layer de Insights</p><h2 id="insight-preview-title">Pedir Insights</h2><p className="journey-description">Comparte una duda con personas que ya recorrieron este nivel y recibe una estrategia desde la experiencia de la comunidad.</p><div className="insight-preview-card"><span>INSIGHT DE NIVEL {insightPreview.level}</span><strong>{modes.find((mode) => mode.key === insightPreview.modeKey)?.name}</strong><p>“¿Qué práctica te ayudó a avanzar de este nivel al siguiente?”</p><small>La solicitud se habilita al crear una cuenta Gold.</small></div><button className="feature-preview-cta" type="button" onClick={() => { setInsightPreview(null); openPlan('gold', 'Insights locales'); }}>Ver acceso Gold <span>→</span></button><button className="feature-preview-dismiss" type="button" onClick={() => setInsightPreview(null)}>Seguir explorando como invitado</button></section></div>}

      {cultInsightPreview && <div className="feature-preview-backdrop" role="presentation" onClick={() => setCultInsightPreview(null)}><section className="feature-preview cult-insight-modal" role="dialog" aria-modal="true" aria-labelledby="cult-insight-modal-title" onClick={(event) => event.stopPropagation()}><button className="close-journey" type="button" onClick={() => setCultInsightPreview(null)} aria-label="Cerrar insight">×</button><p className="kicker">Insight Global · Actividad compartida</p><h2 id="cult-insight-modal-title">{cultInsightPreview.activity}</h2><div className="insight-modal-meta"><span>{modes.find((mode) => mode.key === cultInsightPreview.modeKey)?.name}</span><span>Nivel {cultInsightPreview.level} → {cultInsightPreview.level + 1}</span><span>{effortLabelByLevel[cultInsightPreview.level]}</span></div><p className="journey-description">Esta es una práctica que una persona utilizó para avanzar de nivel. Analízala, adáptala a tu realidad y úsala como punto de partida en tu propio journey.</p><div className="insight-preview-card"><span>RUTA DE CULTIVO</span><strong>{levelNames[cultInsightPreview.level]} → {levelNames[cultInsightPreview.level + 1]}</strong><p>{levelDescriptions[cultInsightPreview.level]}</p></div><button className="feature-preview-cta" type="button" onClick={saveGlobalInsightActivity}>Guardar en mi mapa <span>＋</span></button><button className="feature-preview-dismiss" type="button" onClick={() => setCultInsightPreview(null)}>Seguir explorando Insights</button></section></div>}

      {customizingAvatar && <div className="avatar-customizer-backdrop" role="presentation" onClick={() => setCustomizingAvatar(false)}><section className="avatar-customizer" role="dialog" aria-modal="true" aria-labelledby="avatar-customizer-title" onClick={(event) => event.stopPropagation()}>
        <button className="close-journey" type="button" onClick={() => setCustomizingAvatar(false)} aria-label="Cerrar personalizador">×</button>
        <p className="kicker">Tu identidad en el mapa</p><h2 id="avatar-customizer-title">Personaliza tu perfil</h2><p>Edita tu nombre y foto de perfil. Tus cambios se guardan en este navegador.</p>
        <label className="customizer-name-field" htmlFor="profile-name">Tu nombre<input id="profile-name" value={profileName} onChange={(event) => handleProfileName(event.target.value)} placeholder="Escribe tu nombre" /></label>
        <label className="customizer-profile-upload"><input type="file" accept="image/*" onChange={(event) => handleProfileImage(event.target.files?.[0])} /><span>＋</span>{profileImage ? 'Cambiar foto de perfil' : 'Agregar foto de perfil'}</label>
        <button className="customizer-done" type="button" onClick={() => setCustomizingAvatar(false)}>Listo, este soy yo <span>→</span></button>
      </section></div>}

      {selectedMode && <div className="journey-backdrop" role="presentation" onClick={() => setSelectedMode(null)}><section ref={journeyPanelRef} className="journey-panel" data-layer={activeActivity !== null ? '5' : '3'} role="dialog" aria-modal="true" aria-labelledby="journey-title" style={{ '--mode-color': selectedMode.color, '--mode-accent': selectedMode.accent } as CSSProperties} onClick={(event) => event.stopPropagation()}>
        <button className="close-journey" type="button" onClick={() => setSelectedMode(null)} aria-label="Cerrar journey">×</button>
        {activeActivity === null && <button className="journey-back" type="button" onClick={backToDashboard}>← Volver al Overview</button>}
        {activeActivity !== null && <button className="journey-back activity-agent-back" type="button" onClick={() => { setActiveActivity(null); restoreJourneyPosition(); }}>← Volver a Journey del Modo</button>}
        {activeActivity !== null ? <section className={`activity-agent activity-agent--${activityEntry}`} data-layer="5" aria-labelledby="activity-agent-title">
          <p className="kicker">Layer 5 · {selectedMode.name} · {activityEntryLabel[activityEntry]}</p>
          {activityEntry === 'custom' ? <>
            <h2 id="activity-agent-title">Escribe tu actividad</h2>
            <p className="journey-description">Pon en tus propias palabras la práctica que quieres establecer para pasar del nivel {activeActivity} al siguiente.</p>
            <div className="effort-panel"><span className="effort-label">PARÁMETRO DE ESFUERZO</span><strong>{effortLabelByLevel[activeActivity]}</strong><p>{effortDescription[effortByLevel[activeActivity]]}</p></div>
            <label className="agent-input-label" htmlFor="activity-prompt">Tu actividad</label><textarea id="activity-prompt" value={activityPrompt} onChange={(event) => setActivityPrompt(event.target.value)} placeholder="Ej. Caminaré 20 minutos después del trabajo, tres veces esta semana…" rows={6} />
            <div className="agent-actions agent-actions--single"><button className="agent-save" type="button" onClick={() => saveActivity(selectedMode.key, activeActivity, activityPrompt.trim() || 'Actividad por definir')}>Usar esta actividad <span>→</span></button></div>
          </> : activityEntry === 'pool' ? <>
            <h2 id="activity-agent-title">Pool de Actividades</h2>
            <p className="journey-description">Explora recomendaciones del nivel {activeActivity} para tu {selectedMode.name}. Cada sugerencia respeta el esfuerzo de esta etapa.</p>
            <div className="effort-panel"><span className="effort-label">CATÁLOGO NIVEL {activeActivity}</span><strong>{effortLabelByLevel[activeActivity]}</strong><p>{effortDescription[effortByLevel[activeActivity]]}</p></div>
            <label className="pool-selector-label" htmlFor="pool-selection">Navegar recomendaciones<select id="pool-selection" value={poolSelection} onChange={(event) => setPoolSelection(Number(event.target.value))}>{getPoolActivities(selectedMode.key, activeActivity).map((activity, index) => <option value={index} key={activity.title}>Recomendación {index + 1}/10 - {activity.title}</option>)}</select></label>
            <article className="pool-activity-card"><span className="pool-activity-index">ACTIVIDAD NIVEL {activeActivity}</span><h3>{getPoolActivities(selectedMode.key, activeActivity)[poolSelection].title}</h3><p>{getPoolActivities(selectedMode.key, activeActivity)[poolSelection].description}</p><div className="pool-activity-meta"><span>{effortLabelByLevel[activeActivity]}</span><span>NIVEL {activeActivity}</span></div></article>
            <div className="agent-actions agent-actions--single"><button className="agent-save" type="button" onClick={usePoolActivity}>Usar esta actividad{!isAuthenticated && ' · Entry'} <span>→</span></button></div>
          </> : <>
            <h2 id="activity-agent-title">Construyamos tu actividad</h2>
            <p className="journey-description">Conversaremos para encontrar una práctica concreta para tu {selectedMode.name}, nivel {activeActivity}.</p>
            <div className="effort-panel"><span className="effort-label">PARÁMETRO DE ESFUERZO</span><strong>{effortLabelByLevel[activeActivity]}</strong><p>{effortDescription[effortByLevel[activeActivity]]}</p></div>
            <div className="agent-chat" aria-live="polite"><div className="agent-message"><span>IA</span><p>Para pasar del nivel {activeActivity} al siguiente, ¿qué te gustaría cultivar en este modo y qué tiempo real tienes disponible?</p></div>{activityPrompt && <div className="user-message"><span>TÚ</span><p>{activityPrompt}</p></div>}{aiHasConsulted ? <div className="agent-message agent-message--proposal"><span>IA</span><p>{getAiProposal(selectedMode, activeActivity, activityPrompt)}</p></div> : <div className="agent-message agent-message--waiting"><span>IA</span><p>Comparte tu contexto y consulta al Modo IA para recibir una propuesta personalizada.</p></div>}</div>
            <label className="agent-input-label" htmlFor="activity-prompt">Tu contexto para la IA</label><textarea id="activity-prompt" value={activityPrompt} onChange={(event) => { setActivityPrompt(event.target.value); setAiHasConsulted(false); setAiNotice(null); }} placeholder="Ej. Tengo 20 minutos al día y quiero empezar con algo sencillo…" rows={3} />
            {aiNotice && <div className="insight-notice" role="status">✦ {aiNotice}</div>}
            <div className="agent-actions"><button className="agent-ask" type="button" onClick={consultModeAi}>Consultar al Modo IA {!isAuthenticated && <small>Plan Gold</small>} <span>→</span></button><button className="agent-save" type="button" onClick={saveModeAiActivity}>Usar esta actividad {!isAuthenticated && <small>Plan Gold</small>} <span>→</span></button></div>
          </>}
        </section> : <>
          <div className="journey-intro-compact"><span className="journey-icon">{selectedMode.icon}</span><div><p className="kicker">Introducción del modo · Journey integrado</p><h2 id="journey-title">{selectedMode.name}</h2><p className="journey-description">{selectedMode.description}. Reconoce tu presencia y diseña aquí tu ruta de cultivo.</p></div></div>
          <div className="journey-level journey-level--compact"><div><span>NIVEL ACTUAL</span><strong>{levels[selectedMode.key]} <small>/ 9</small></strong></div><span className="journey-level-name">{levelNames[levels[selectedMode.key]]}</span></div><div className="level-definition level-definition--compact"><strong>{levelNames[levels[selectedMode.key]]}</strong><p>{levelDescriptions[levels[selectedMode.key]]}</p></div>
          <label htmlFor="journey-slider">Ajusta tu nivel de presencia</label><input id="journey-slider" className="journey-slider" type="range" min="0" max="9" value={levels[selectedMode.key]} onChange={(event) => updateLevel(selectedMode.key, Number(event.target.value))} />
          <section className="journey-builder" data-layer="3" aria-labelledby="journey-builder-title">
          <div className="journey-builder-heading"><div><p className="kicker">Diseño de Actividad · {selectedMode.name}</p><h3 id="journey-builder-title">Tu ruta de cultivo</h3></div><span>{definedActivityCount} / 9 rumbos definidos</span></div>
          <p className="journey-builder-intro">Diseña una práctica para cada etapa de tu {selectedMode.name}. Por ahora estas tarjetas son la estructura base de tu journey.</p>
          {insightNotice && <div className="insight-notice" role="status">✦ {insightNotice}<button type="button" onClick={() => setInsightNotice(null)} aria-label="Cerrar aviso">×</button></div>}
          <div className="journey-level-grid">{journeyLevels.map((level) => <article className={`journey-level-card${level === 0 ? ' journey-level-card--start' : ''}${level === levels[selectedMode.key] ? ' journey-level-card--current' : ''}${level === 9 ? ' journey-level-card--vision' : ''}`} style={level === 9 && visionImages[selectedMode.key] ? { backgroundImage: `linear-gradient(135deg, rgba(4, 18, 22, .74), rgba(4, 18, 22, .35)), url(${visionImages[selectedMode.key]})` } : undefined} key={level}><div className="journey-level-card-top"><span>NIVEL</span><strong>{level}</strong><span className="journey-level-card-name">{levelNames[level]}</span>{level === levels[selectedMode.key] && <em>Actual</em>}{level === 9 && <em>Meta final</em>}</div>{level < 9 ? <><h4>{activityDrafts[`${selectedMode.key}-${level}`] ? activityDrafts[`${selectedMode.key}-${level}`] : 'Actividad por definir'}</h4><p><strong className="effort-tag">{effortLabelByLevel[level]}</strong>{activityDrafts[`${selectedMode.key}-${level}`] ? ' · Actividad guardada en este navegador.' : ' · ' + effortDescription[effortByLevel[level]]}</p><div className="journey-card-actions"><button type="button" onClick={() => openActivity(level, 'custom')}>{activityDrafts[`${selectedMode.key}-${level}`] ? '✦ Modificar Actividad' : '＋ Agregar Actividad'}</button><button className="activity-pool-button" type="button" onClick={() => openActivity(level, 'pool')}>▦ Pool de Actividades</button><button className="activity-ai-button" type="button" onClick={() => openActivity(level, 'ai')}>✦ Modo IA</button><button className={insightRequests[`${selectedMode.key}-${level}`] ? 'insight-button insight-button--requested' : 'insight-button'} type="button" onClick={() => requestInsight(selectedMode.key, level)}>{insightRequests[`${selectedMode.key}-${level}`] ? '✓ Insight pedido' : 'Pedir Insights'}</button></div></> : <><h4>Tu visión final</h4><p>Representa en una imagen el resultado al que quieres llegar.</p><label className="vision-upload"><span className="vision-upload-icon">＋</span><input type="file" accept="image/*" onChange={(event) => handleVisionImage(selectedMode.key, event.target.files?.[0])} />{visionImages[selectedMode.key] ? 'Cambiar imagen' : 'Cargar imagen'}</label></>}</article>)}</div>
          </section>
          <button className="cult-section-toggle" type="button" onClick={() => { if (!isAuthenticated) { requestAccess('The Cult', 'Ultimate Mode'); return; } setCultOpen((open) => !open); }}>{cultOpen ? 'Ocultar The Cult' : 'Explorar The Cult'} <span>{cultOpen ? '↑' : '↓'}</span></button>
          {cultOpen && renderCultSection()}
        </>}
      </section></div>}
    </main>
  );
}

export default App;
