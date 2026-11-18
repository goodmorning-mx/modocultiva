import type { AppLanguage } from './languagePreference';

export const globalIdeaAuthors = [
  'Sofía Méndez', 'Marcus Lee', 'Elena Costa', 'Diego Ríos', 'Nadia Chen', 'Camila Torres',
] as const;

type Author = typeof globalIdeaAuthors[number];

// Each demo profile has its own story. Keep names stable for filters and attribution.
const biographies = {
  es: [
    'Cultivo el liderazgo con propósito para que el trabajo también sea un espacio de presencia y coherencia.',
    'Diseño sistemas financieros que convierten claridad, libertad y visión en decisiones cotidianas.',
    'Acompaño conversaciones honestas para que los vínculos puedan crecer con cuidado y límites sanos.',
    'Creo en los pequeños rituales sostenidos que transforman una intención en una forma de vida.',
    'Exploro cómo aprender, conectar y crear puede abrir nuevas posibilidades para una vida más amplia.',
    'Cultivo comunidad y movimiento para que cada persona encuentre una ruta propia de expansión.',
  ],
  en: [
    'I cultivate purposeful leadership so work can also be a place for presence and integrity.',
    'I design financial systems that turn clarity, freedom, and vision into everyday decisions.',
    'I support honest conversations so relationships can grow with care and healthy boundaries.',
    'I believe in small rituals that, over time, turn an intention into a way of life.',
    'I explore how learning, connecting, and creating open up new possibilities for a fuller life.',
    'I cultivate community and movement so each person can find their own path to growth.',
  ],
  zh: [
    '我培养有目标感的领导力，让工作也成为专注当下、践行价值观的空间。',
    '我设计财务体系，把清晰的判断、自由和愿景转化为日常决策。',
    '我协助人们开展坦诚对话，让关系在关怀与健康的界限中成长。',
    '我相信，坚持小小的日常仪式，能让一个愿望慢慢成为一种生活方式。',
    '我探索学习、建立联系与创造如何为更充实的生活打开新的可能。',
    '我培育社区与行动，让每个人都能找到自己的成长道路。',
  ],
  hi: [
    'मैं उद्देश्यपूर्ण नेतृत्व को बढ़ावा देती हूँ, ताकि काम में भी सजगता रहे और हमारे काम हमारे मूल्यों से मेल खाएँ।',
    'मैं ऐसी वित्तीय प्रणालियाँ बनाता हूँ जो स्पष्टता, स्वतंत्रता और दूरदृष्टि को रोज़मर्रा के फ़ैसलों में उतारें।',
    'मैं खुली और ईमानदार बातचीत में साथ देती हूँ, ताकि रिश्ते देखभाल और स्वस्थ सीमाओं के साथ बढ़ें।',
    'मेरा मानना है कि नियमित रूप से किए गए छोटे अभ्यास एक इरादे को जीने का तरीका बना सकते हैं।',
    'मैं तलाशती हूँ कि सीखना, लोगों से जुड़ना और कुछ नया बनाना कैसे ज़िंदगी में नई संभावनाएँ खोलते हैं।',
    'मैं लोगों को साथ लाती हूँ और उन्हें सक्रिय होने में मदद करती हूँ, ताकि हर व्यक्ति आगे बढ़ने की अपनी राह पा सके।',
  ],
  ar: [
    'أنمّي القيادة الهادفة ليكون العمل أيضاً مساحة للحضور والانسجام مع القيم.',
    'أصمّم أنظمة مالية تحوّل الوضوح والحرية والرؤية إلى قرارات يومية.',
    'أيسّر الحوارات الصادقة كي تنمو العلاقات بالرعاية وفي إطار حدود صحية.',
    'أؤمن بأن الطقوس الصغيرة التي نداوم عليها تحوّل النية إلى أسلوب حياة.',
    'أستكشف كيف يفتح التعلم والتواصل والإبداع إمكانات جديدة لحياة أكثر اتساعاً.',
    'أنمّي روح الجماعة وأشجّع الحركة ليجد كل شخص مساره الخاص للنمو.',
  ],
  it: [
    'Coltivo una leadership guidata da uno scopo, perché il lavoro sia anche uno spazio di presenza e coerenza.',
    'Progetto sistemi finanziari che trasformano chiarezza, libertà e visione in decisioni quotidiane.',
    'Accompagno conversazioni sincere affinché le relazioni possano crescere con cura e confini sani.',
    'Credo nei piccoli rituali che, coltivati nel tempo, trasformano un’intenzione in uno stile di vita.',
    'Esploro come imparare, entrare in relazione e creare possano aprire nuove possibilità per una vita più ricca.',
    'Coltivo la comunità e il movimento perché ciascuno trovi il proprio percorso di crescita.',
  ],
  pt: [
    'Cultivo uma liderança com propósito para que o trabalho também seja um espaço de presença e coerência.',
    'Crio sistemas financeiros que transformam clareza, liberdade e visão em decisões cotidianas.',
    'Facilito conversas honestas para que os vínculos possam crescer com cuidado e limites saudáveis.',
    'Acredito que pequenos rituais praticados com constância transformam uma intenção em um modo de vida.',
    'Exploro como aprender, criar vínculos e criar coisas novas pode abrir possibilidades para uma vida mais plena.',
    'Cultivo comunidade e movimento para que cada pessoa encontre seu próprio caminho de crescimento.',
  ],
  ru: [
    'Я развиваю осмысленное лидерство, чтобы работа тоже могла стать пространством осознанности и верности своим ценностям.',
    'Я создаю финансовые системы, которые превращают ясность, свободу и видение будущего в повседневные решения.',
    'Я помогаю вести честные разговоры, чтобы отношения развивались с заботой и уважением к личным границам.',
    'Я верю, что маленькие регулярные ритуалы способны превратить намерение в образ жизни.',
    'Я исследую, как обучение, общение и творчество открывают новые возможности для более полной жизни.',
    'Я укрепляю связи между людьми и поддерживаю движение, чтобы каждый мог найти свой путь развития.',
  ],
  de: [
    'Ich fördere werteorientierte Führung, damit auch die Arbeit ein Ort für Präsenz und Integrität sein kann.',
    'Ich entwerfe Finanzsysteme, die Klarheit, Freiheit und eine langfristige Vision in alltägliche Entscheidungen übersetzen.',
    'Ich begleite ehrliche Gespräche, damit Beziehungen durch Fürsorge und gesunde Grenzen wachsen können.',
    'Ich glaube an kleine, beständige Rituale, die aus einer Absicht eine Lebensweise machen.',
    'Ich erforsche, wie Lernen, Austausch und Kreativität neue Möglichkeiten für ein erfüllteres Leben eröffnen.',
    'Ich fördere Gemeinschaft und Bewegung, damit jeder Mensch seinen eigenen Entwicklungsweg finden kann.',
  ],
  fr: [
    'Je cultive un leadership guidé par une raison d’être, pour que le travail soit aussi un lieu de présence et de cohérence.',
    'Je conçois des systèmes financiers qui traduisent la clarté, la liberté et la vision en décisions quotidiennes.',
    'J’accompagne des conversations sincères pour que les liens grandissent avec attention et dans le respect de limites saines.',
    'Je crois aux petits rituels qui, pratiqués régulièrement, transforment une intention en manière de vivre.',
    'J’explore comment apprendre, créer des liens et inventer peuvent ouvrir de nouvelles possibilités pour une vie plus riche.',
    'Je favorise les liens et le mouvement pour que chaque personne trouve sa propre voie de développement.',
  ],
  da: [
    'Jeg dyrker ledelse med et formål, så arbejdet også bliver et sted for nærvær og sammenhæng mellem handlinger og værdier.',
    'Jeg skaber finansielle systemer, der omsætter klarhed, frihed og vision til hverdagens beslutninger.',
    'Jeg støtter ærlige samtaler, så relationer kan vokse med omsorg og sunde grænser.',
    'Jeg tror på, at små, vedvarende ritualer kan forvandle en intention til en måde at leve på.',
    'Jeg undersøger, hvordan læring, forbindelser og kreativitet åbner nye muligheder for et rigere liv.',
    'Jeg styrker fællesskab og bevægelse, så alle kan finde deres egen vej til udvikling.',
  ],
} satisfies Record<AppLanguage, readonly [string, string, string, string, string, string]>;

export function globalIdeaBio(language: AppLanguage, author: Author): string {
  return biographies[language][globalIdeaAuthors.indexOf(author)];
}
